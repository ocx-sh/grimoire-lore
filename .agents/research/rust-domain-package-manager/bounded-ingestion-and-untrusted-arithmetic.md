---
title: Bounded Ingestion and Arithmetic on Untrusted Numbers
agent: inv-arithmetic
model: sonnet
date_researched: 2026-08
sources_count: 14
scope: >
  Resource and numeric discipline on the path where remote bytes become local
  state in an OCI-registry package manager: manifest -> blob download ->
  decompress -> extract -> verify. Covers overflow/cast discipline for
  untrusted numbers, allocation caps, decompression-bomb limits, streaming +
  digest-verification ordering, and bounded concurrency.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Debug/release overflow divergence and `arithmetic_side_effects`](#1-debugrelease-overflow-divergence-and-arithmetic_side_effects)
   2. [`as` casts and the truncation/sign-loss lint family](#2-as-casts-and-the-truncationsign-loss-lint-family)
   3. [Allocation from attacker-controlled length](#3-allocation-from-attacker-controlled-length)
   4. [Decompression bombs: two independent caps, applied twice](#4-decompression-bombs-two-independent-caps-applied-twice)
   5. [Entry-count bombs and tar-specific untrusted-size pitfalls](#5-entry-count-bombs-and-tar-specific-untrusted-size-pitfalls)
   6. [Streaming vs buffering, and verify-then-publish ordering](#6-streaming-vs-buffering-and-verify-then-publish-ordering)
   7. [The `Content-Length` lies case](#7-the-content-length-lies-case)
   8. [Bounded concurrency and bounded channels](#8-bounded-concurrency-and-bounded-channels)
   9. [Where limits live: constants, config, typed errors](#9-where-limits-live-constants-config-typed-errors)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

1. Release-mode integer overflow wraps silently; debug-mode panics. The same arithmetic expression has two behaviours depending on the build profile a *user* chose, not the author — this is the single most important fact to internalize before writing any ingestion code.
2. `clippy::arithmetic_side_effects` is the lint that flags unchecked `+ - * <<` and div/rem-by-zero, but it is **allow-by-default**, lives in the `restriction` group, and is deliberately noisy (it fires on any arithmetic that *could* overflow, not just untrusted-input arithmetic).
3. [clippy#12503](https://github.com/rust-lang/rust-clippy/issues/12503) is an **open** feature request (not a bug report against an existing lint) asking for a lint that specifically targets release-mode overflow from user input; it has sat open with only 4 comments, confirming this gap is unclosed tooling, not solved-and-you-missed-it.
4. Given (2) and (3), repo-wide `#![deny(clippy::arithmetic_side_effects)]` is not viable (it would flag loop counters, indices, and math the team doesn't consider risky) — scope it to ingestion modules only, via a `#![warn(...)]`/`#![deny(...)]` inner attribute on those modules or a per-crate `clippy.toml` allow-list plus targeted `#[allow]` elsewhere.
5. Mandate `checked_*`, `saturating_*`, or `try_from` for every arithmetic operation whose operand originates in a manifest field, HTTP header, or archive header (tar/zip/PAX). Plain `+`/`-`/`*`/`<<` on such values is a defect, independent of whether the lint is enabled.
6. `as` casts are how LLMs (and humans in a hurry) route around the verbosity of `u32::try_from(len)?` — `clippy::as_conversions` (restriction, allow-by-default) bans `as` outright; `clippy::cast_possible_truncation` and `clippy::cast_sign_loss` (both pedantic, allow-by-default) catch the two specific untrusted-number failure modes: narrowing (`u64 as usize` on a 32-bit target, `len as u32`) and signed/unsigned round-trip.
7. Never call `Vec::with_capacity(n)` / `String::with_capacity(n)` / `HashMap::with_capacity(n)` with an `n` read directly from a manifest, header, or archive entry — cap it against a hard ceiling first, or use `Vec::try_reserve`/`try_reserve_exact` so a hostile declared length produces a catchable error instead of an instant multi-GB allocation or an OOM abort.
8. Decompression bombs need **two independent limits per layer of decompression**: an absolute output-byte cap and a compression-ratio cap (output/input). Either alone is bypassable — ratio-only lets a small compressed input still hit gigabytes if the ratio ceiling is loose; cap-only lets a bomb that decompresses to just under the cap but still costs CPU/IO repeatedly (per-entry) exhaust resources through entry count.
9. Apply both caps **per entry and per archive**: a tar containing one 5 GB-decompressed member and a tar containing a million 5 KB-decompressed members are different attacks: the entry cap catches the first, an entry-*count* cap catches the second.
10. `Read::take(n)` (sync) and `tokio::io::AsyncReadExt::take(n)` (async) are the concrete, zero-dependency mechanism for an absolute output cap: wrap the decompressor's output reader, not the compressed input reader — capping the compressed input caps download size, not decompressed size.
11. `flate2` and `zstd` do not implement bomb protection for you. `flate2`'s `GzDecoder`/`MultiGzDecoder` docs describe framing behaviour only, no size guard. `zstd::stream::read::Decoder` exposes `window_log_max(&mut self, log_distance: u32)` to cap the *compression* window (bounds worst-case memory the decoder itself uses for back-references), which is a different, complementary control from an output-byte cap on the consumer side — you need both.
12. `tar::Archive::entries()` streams entries one at a time without materializing the whole archive, and the crate's own docs state extraction is designed so "the entire contents are never required to be entirely resident in memory all at once" — but `unpack()`'s path-traversal protection is explicitly documented as insufficient for untrusted archives (use `unpack_in`, and even that had a symlink-following chmod CVE — [RUSTSEC-2026-0067](https://rustsec.org/advisories/) / astral-tokio-tar sibling [RUSTSEC-2026-0113](https://rustsec.org/advisories/)).
13. [RUSTSEC-2026-0068](https://rustsec.org/advisories/RUSTSEC-2026-0068.html) (`tar` crate, CVE-2026-33055) is a live, dated example of exactly this subarea's failure mode: tar-rs versions ≤0.4.44 ignore the PAX-extension size header when the base header's size field is non-zero, so the crate and reference parsers (e.g. Go's `archive/tar`) disagree on an entry's *size* for the same bytes — a parser-differential bug rooted in "which untrusted size field do we trust."
14. Never trust HTTP `Content-Length` as a size bound: it can be absent, wrong, or (per `reqwest`'s own docs) reflect the pre-decompression size while the body you read is auto-decoded — treat it only as a *hint* for `with_capacity` sizing (via a capped/`try_reserve` path) and always enforce the real limit by counting bytes actually read, via `take()`.
15. Digest verification must be computed by hashing the byte stream as it is written (`Sha256::update` per chunk inside the same loop that calls `AsyncWrite::write_all`), never by re-reading a materialized buffer afterward — [oci-client's `pull_blob`](https://raw.githubusercontent.com/oras-project/rust-oci-client/main/src/client.rs) does exactly this: stream chunks into the writer while feeding the same chunks into a digester, then compare the finalized digest to the expected one.
16. Verify-then-publish ordering is mandatory: write blob/extracted-file bytes to a temporary path first; only after the digest check passes, atomically rename/move it into the location the rest of the system reads from (the cache, the install dir). On digest mismatch, delete the temp file — never leave unverified bytes reachable under their final name, and never leave them lying around as an unbounded-growth disk leak either.
17. Partial/range downloads break digest verification structurally, not just by convention: oci-client's own `pull_blob_stream_partial` doc states "the layer digest is not verified as all bytes are unavailable" for a partial fetch — any resumable-download design in this codebase must re-verify against the full digest only once the complete blob is assembled, never trust a partial fetch's bytes as pre-verified.
18. N parallel blob downloads is a memory multiplier before it is a throughput win: bound it explicitly with `Arc<tokio::sync::Semaphore>` (acquire a permit per download task) rather than `futures::stream::iter(...).for_each_concurrent(usize::MAX, ...)` or an unbounded spawn loop.
19. Use `tokio::sync::mpsc::channel(N)` (bounded) for any producer/consumer pipeline moving downloaded or decompressed chunks between tasks; `unbounded_channel` removes backpressure entirely, so a fast producer (network) against a slow consumer (disk, or a rate-limited downstream) grows the queue without bound — the queue itself becomes the uncapped allocation this whole subarea is about.
20. Every limit needs a named constant with a one-line rationale in a comment, and a dedicated typed error variant (`LayerTooLarge { limit, actual }`, `DecompressionRatioExceeded { .. }`, `TooManyArchiveEntries { .. }`) — a generic `io::Error` or `anyhow!("...")` at a limit trip line loses the caller's ability to distinguish "hostile/corrupt input, stop" from "transient I/O failure, retry."

## Findings

### 1. Debug/release overflow divergence and `arithmetic_side_effects`

Rust's default `+`/`-`/`*` panic on overflow in debug builds and wrap silently in release builds (`overflow-checks = false` is the release default). This is a *language*-level divergence, not a lint gap by itself — the lint gap is that nothing in a default `cargo clippy` run flags the code that will behave differently depending on `--release`.

corrode.dev's *Pitfalls of Safe Rust* states this plainly and prescribes the fix:

> "Rust will panic in debug mode, but in release mode, it will silently wrap around." — recommending `checked_add`/`checked_sub`/`checked_mul`/`checked_div` for any arithmetic where the result matters. ([corrode.dev/blog/pitfalls-of-safe-rust](https://corrode.dev/blog/pitfalls-of-safe-rust/))

`clippy::arithmetic_side_effects` is the closest built-in lint:

> Category: **restriction**, Default level: **allow**. Flags arithmetic operations (`+ - * <<` etc.) "that can overflow ... or cause panics through division/modulo by zero." Excludes `Wrapping`, `Saturating`, and floats; ignores const contexts and provably non-overflowing cases; "third-party types can still overflow." Configurable via `arithmetic-side-effects-allowed[-binary|-unary]`. ([rust-lang.github.io/rust-clippy — arithmetic_side_effects](https://rust-lang.github.io/rust-clippy/master/index.html#arithmetic_side_effects))

It is allow-by-default *because* it is a restriction lint: restriction lints codify a style choice that is correct for some codebases and actively wrong for others (a codebase full of trusted, bounded loop counters would drown in false positives). That's exactly why scoping matters — see [Normative guidance](#normative-guidance-candidates) #1–#3.

The open issue confirms this isn't solved elsewhere in the toolchain:

> Title: **"lint for integer overflow, especially in release mode."** Body, verbatim example: a `u8` parsed from stdin multiplied by 3, "may wrap around when multiply by 3." State: **open**, 4 comments, no linked PR, no labels/assignee as of this research. ([github.com/rust-lang/rust-clippy/issues/12503](https://github.com/rust-lang/rust-clippy/issues/12503))

So: `arithmetic_side_effects` exists and technically covers this case, but its allow-by-default status plus its restriction-group noise profile mean most teams never turn it on, and the specific "please make this less noisy / more targeted at untrusted input" ask remains an open, unactioned issue. Practical conclusion: don't wait for tooling to close this gap — mandate the style directly in ingestion code and enforce with a *scoped* lint, not a repo-wide one.

```rust
// WRONG — untrusted length from a manifest field, silent wrap in release
fn total_size(entries: &[ManifestEntry]) -> u64 {
    let mut total = 0u64;
    for e in entries {
        total += e.size; // release: wraps; debug: panics
    }
    total
}

// RIGHT — checked, with a typed error on the failure path
fn total_size(entries: &[ManifestEntry]) -> Result<u64, IngestError> {
    let mut total: u64 = 0;
    for e in entries {
        total = total
            .checked_add(e.size)
            .ok_or(IngestError::ManifestSizeOverflow)?;
    }
    Ok(total)
}
```

### 2. `as` casts and the truncation/sign-loss lint family

Three clippy lints, all pedantic-or-restriction, all allow-by-default:

> **`as_conversions`** (restriction, allow, added 1.41.0): "`as` conversions will perform many kinds of conversions, including silently lossy conversions and dangerous coercions." Recommends `.try_into()?` or `.try_into().expect(...)` over `as`. ([as_conversions](https://rust-lang.github.io/rust-clippy/master/index.html#as_conversions))

> **`cast_possible_truncation`** (pedantic, allow): "identifies casts between numeric types that may truncate large values... In some problem domains, it is good practice to avoid truncation." Example: `fn as_u8(x: u64) -> u8 { x as u8 }`. ([cast_possible_truncation](https://rust-lang.github.io/rust-clippy/master/index.html#cast_possible_truncation))

> **`cast_sign_loss`** (pedantic, allow): flags signed→unsigned casts where a negative value wraps to a large positive value — "possibly surprising results." (same page as above)

These are exactly the shapes that show up on the ingestion path:

- `len as u32` — a `u64` blob size or archive-entry size truncated to fit a 32-bit field; on a value crafted to be `2^32 + small`, this silently becomes `small`.
- `u64 as usize` — correct on 64-bit targets, **wrong** on 32-bit targets (this codebase ships Windows/macOS/Linux binaries; a 32-bit Windows build is not hypothetical for a "prebuilt binaries" distribution model).
- Signed/unsigned round-trips: an `i64` HTTP `Content-Length` (some HTTP stacks expose it signed) cast to `u64` — a malformed/negative header becomes a huge positive number instead of failing.

```rust
// WRONG — three separate untrusted-number bugs an LLM will happily write
fn plan_capacity(header_len: i64, entry_count: u64) -> usize {
    let cap = header_len as usize;       // sign loss if header_len < 0
    let n = entry_count as u32;          // truncation if entry_count > u32::MAX
    cap + n as usize                     // unchecked add on top
}

// RIGHT
fn plan_capacity(header_len: i64, entry_count: u64) -> Result<usize, IngestError> {
    let cap = usize::try_from(header_len).map_err(|_| IngestError::InvalidLength)?;
    let n = usize::try_from(entry_count).map_err(|_| IngestError::TooManyEntries)?;
    cap.checked_add(n).ok_or(IngestError::ManifestSizeOverflow)
}
```

### 3. Allocation from attacker-controlled length

`Vec::with_capacity`, `String::with_capacity`, `HashMap::with_capacity`, and `BufWriter::with_capacity` all **panic or abort the process** on an allocation they can't satisfy (`with_capacity` panics if the computed byte size overflows `isize::MAX`; on genuine OOM the global allocator aborts — there is no `Result` to catch). Passing an attacker-controlled length straight into any of these is a one-line DoS.

The standard library's own answer is `try_reserve`:

> `Vec::try_reserve(&mut self, additional: usize) -> Result<(), TryReserveError>` — "Unlike the panicking `reserve` method, this returns a `Result` instead of panicking on failure... ideal for handling attacker-controlled or untrusted capacity values... lets you validate large capacity requests before committing resources." Failure modes: capacity overflow (> `isize::MAX` bytes) or allocator failure. ([doc.rust-lang.org/std — Vec::try_reserve](https://doc.rust-lang.org/std/vec/struct.Vec.html#method.try_reserve))

The rule for this codebase is a **cap plus incremental growth**, not a single `try_reserve` call with the raw declared length either — `try_reserve` still tries to honor whatever number you hand it, so a declared length of `u64::MAX / 2` that happens to be under `isize::MAX` bytes can still legitimately succeed and hand you a multi-exabyte-backed `Vec` request that the allocator *does* satisfy on some systems' overcommit before your process gets OOM-killed doing something else with it. Clamp the declared length against a documented ceiling first (§9), *then* grow incrementally as bytes actually arrive (read in fixed-size chunks, `extend_from_slice`, stop at the cap) rather than trusting the header's number to preallocate in one shot.

```rust
// WRONG — header.declared_len is attacker-controlled
let mut buf = Vec::with_capacity(header.declared_len as usize);

// RIGHT — cap first, then grow incrementally as bytes actually arrive
const MAX_MANIFEST_BYTES: usize = 4 * 1024 * 1024; // OCI spec: registries SHOULD support >= 4 MiB manifests
if header.declared_len > MAX_MANIFEST_BYTES as u64 {
    return Err(IngestError::ManifestTooLarge { limit: MAX_MANIFEST_BYTES, declared: header.declared_len });
}
let mut buf = Vec::new();
buf.try_reserve(header.declared_len as usize).map_err(|_| IngestError::AllocationFailed)?;
// then read in bounded chunks via `reader.take(MAX_MANIFEST_BYTES as u64)`, verifying actual
// bytes read never exceeds the cap even if declared_len understated the truth
```

### 4. Decompression bombs: two independent caps, applied twice

A zip/gzip/zstd/xz bomb is a small compressed input engineered for an extreme expansion ratio. Concrete numbers, for calibrating what "extreme" means:

> **42.zip**: "42 kilobytes of compressed data, containing five layers of nested zip files in sets of 16" expands to 4.5 petabytes — over 100 million to 1. The **overlap technique** achieves a 42 KB archive expanding to 5.4 GB (ratio ~129,000), and Zip64-based variants reach ratios of 28–98 million. ([en.wikipedia.org/wiki/Zip_bomb](https://en.wikipedia.org/wiki/Zip_bomb))

The same article's structural point is the one that matters for a design doc: *"Decompression tools require both absolute output size limits and compression-ratio monitoring because attackers exploit different techniques."* A ratio-only guard is defeated by a bomb whose absolute output happens to sit under whatever ratio-derived ceiling you compute if input size is also attacker-controlled and large; an absolute-only guard is defeated by a bomb that stays just under the cap but is one of *many* such entries (§5).

Neither `flate2` nor `zstd` gives you this for free:

> `flate2::read::GzDecoder` / `MultiGzDecoder` docs describe framing/multi-member behaviour only — no output-size guard, no ratio guard. Recommended pattern (not crate-provided): wrap in `.take(limit)`. ([docs.rs/flate2 — GzDecoder](https://docs.rs/flate2/latest/flate2/read/struct.GzDecoder.html))

> `zstd::stream::read::Decoder::window_log_max(&mut self, log_distance: u32) -> Result<()>` — "Sets the maximum back-reference distance... must at least match the value set when compressing." This bounds the *decoder's own working-memory* (the sliding window used for back-references), which is a **different** control from an output-byte cap: it stops a decoder from being tricked into allocating a huge window, it does not stop a legitimately-small-window stream from still producing gigabytes of output. ([docs.rs/zstd — Decoder](https://docs.rs/zstd/latest/zstd/stream/read/struct.Decoder.html))

So the concrete recipe for this codebase, per decompression layer (gzip layer, then tar layer, are two separate places this applies):

```rust
use tokio::io::AsyncReadExt;

const MAX_LAYER_DECOMPRESSED_BYTES: u64 = 2 * 1024 * 1024 * 1024; // 2 GiB: largest sane single-layer blob
const MAX_EXPANSION_RATIO: u64 = 200; // compressed * 200 as a second, tighter ceiling for small inputs

async fn decompress_bounded(
    compressed_len: u64,
    reader: impl tokio::io::AsyncRead + Unpin,
) -> Result<Vec<u8>, IngestError> {
    let ratio_cap = compressed_len.saturating_mul(MAX_EXPANSION_RATIO);
    let cap = ratio_cap.min(MAX_LAYER_DECOMPRESSED_BYTES);
    let mut limited = reader.take(cap);
    let mut out = Vec::new();
    let n = tokio::io::copy(&mut limited, &mut out).await?;
    if n == cap {
        // ambiguous: could be exactly cap bytes, or bomb that hit the wall —
        // read one more byte to disambiguate; if it succeeds, it's a bomb
        return Err(IngestError::DecompressionRatioExceeded { limit: cap });
    }
    Ok(out)
}
```

`Read::take` (sync) / `tokio::io::AsyncReadExt::take` (async) is the load-bearing primitive here:

> `fn take(self, limit: u64) -> Take<Self>` — "Creates an adaptor which reads at most `limit` bytes... After the specified byte limit is reached, ... will consistently return EOF." ([docs.rs/tokio — AsyncReadExt::take](https://docs.rs/tokio/latest/tokio/io/trait.AsyncReadExt.html)) — critically, this must wrap the **decompressor's output** reader, not the compressed input reader; capping the compressed side only caps download size, which was never the risk.

### 5. Entry-count bombs and tar-specific untrusted-size pitfalls

The "millions of tiny entries" bomb shape is real and distinct from single-entry expansion: even if every entry individually decompresses under the per-entry cap, an archive can carry enough entries that per-entry filesystem operations (open/write/close, or just heap churn from a `Vec<ExtractedEntry>` you're building) become the DoS vector.

`tar::Archive` is explicitly designed to stream, not buffer:

> `entries()` — "care must be taken to consider each entry within an archive in sequence. If entries are processed out of sequence..., then the contents read for each entry may be corrupted." The crate's memory-usage guarantee: "great lengths are taken to ensure that the entire contents are never required to be entirely resident in memory all at once." ([docs.rs/tar — Archive](https://docs.rs/tar/latest/tar/struct.Archive.html))

That streaming design is necessary but not sufficient — it bounds *memory* per entry, not the *count* of entries or cumulative extraction cost. Enforce an explicit counter alongside the per-entry byte cap:

```rust
const MAX_ARCHIVE_ENTRIES: usize = 100_000;

let mut count = 0usize;
for entry in archive.entries()? {
    count = count.checked_add(1).ok_or(IngestError::TooManyEntries)?;
    if count > MAX_ARCHIVE_ENTRIES {
        return Err(IngestError::TooManyEntries { limit: MAX_ARCHIVE_ENTRIES });
    }
    // per-entry decompressed-size cap from §4 applies here too
}
```

Two `tar`-crate-specific pitfalls compound the "trust which number" problem:

- **`Entry::size()` sourcing**: "In the event the size is stored in a pax extension, that size value will be referenced. Otherwise, the entry size will be stored in the header." ([docs.rs/tar — Entry](https://docs.rs/tar/latest/tar/struct.Entry.html)) Two competing size fields for the same entry is exactly the shape that produced a real CVE:
- **RUSTSEC-2026-0068 / CVE-2026-33055** (`tar` ≤0.4.44, fixed in 0.4.45): "tar-rs incorrectly ignores PAX size headers if header size is nonzero" — the crate picked the *wrong* of the two untrusted size fields under a specific condition, causing parser-differential behaviour versus Go's `archive/tar`, letting attackers craft archives that extract different content depending on which parser reads them. CVSS 5.1. ([rustsec.org/advisories/RUSTSEC-2026-0068](https://rustsec.org/advisories/RUSTSEC-2026-0068.html)) — pin `tar >= 0.4.45` and treat "which size field wins" as a reviewed decision, not an assumption.
- **Path traversal is a separate, already-documented gap**: `Entry::path()` / `Archive::unpack()` docs state plainly that `unpack()` "does not prevent writes outside `dst`" and direct untrusted-archive users to `unpack_in()` and the crate's security docs — and even `unpack_in` had its own CVE, [RUSTSEC-2026-0067](https://rustsec.org/advisories/) (`tar`) and its sibling [RUSTSEC-2026-0113](https://rustsec.org/advisories/) (`astral-tokio-tar`): "`unpack_in` can chmod arbitrary directories by following symlinks." Path safety is out of this subarea's scope but is adjacent enough that ingestion-path review should not assume "we used `unpack_in`" fully closes it.

### 6. Streaming vs buffering, and verify-then-publish ordering

The rule: **a layer blob and an extracted file must never be fully materialized in memory if it can be avoided; they may be fully materialized on disk, but only under a temporary name, and only made visible under their final name after verification passes.**

oci-client — already a dependency, and this codebase's most direct prior art — demonstrates the streaming + inline-hash pattern:

> `pull_blob<T: AsyncWrite>(&self, image: &Reference, layer: impl AsLayerDescriptor, out: T) -> Result<()>` streams into a caller-supplied async writer. Internally: a `Digester` is initialized from the *expected* layer digest, then for each chunk pulled from the network stream, `layer_digester.update(&bytes)` and `out.write_all(&bytes).await?` happen in the same loop iteration — the hash is computed from exactly the bytes written, never from a re-read of the output. After the stream ends, `layer_digester.finalize()` is compared against the expected digest. ([raw.githubusercontent.com/oras-project/rust-oci-client — client.rs](https://raw.githubusercontent.com/oras-project/rust-oci-client/main/src/client.rs))

This settles "how digest verification composes with streaming": hash-as-you-write, not hash-after-buffer. It does **not** by itself settle verify-then-publish, because `out` in that signature could already be the final destination file. This codebase's ingestion path must add the temp-file indirection on top:

```rust
// RIGHT — stream + hash-as-you-write + verify-before-publish
async fn pull_and_verify(client: &Client, image: &Reference, layer: LayerDescriptor, final_path: &Path) -> Result<(), IngestError> {
    let tmp_path = final_path.with_extension("part");
    let mut tmp = tokio::fs::File::create(&tmp_path).await?;
    let result = client.pull_blob(image, &layer, &mut tmp).await; // hashes while writing (oci-client's own behavior)
    match result {
        Ok(()) => {
            tokio::fs::rename(&tmp_path, final_path).await?; // atomic on same filesystem
            Ok(())
        }
        Err(e) => {
            let _ = tokio::fs::remove_file(&tmp_path).await; // never leave unverified bytes reachable, and don't leak disk
            Err(IngestError::from(e))
        }
    }
}
```

Partial downloads structurally cannot be pre-verified — this is oci-client's own documented behaviour, not a design choice this codebase gets to relax:

> `pull_blob_stream_partial(&self, image, layer, offset: u64, length: Option<u64>) -> Result<BlobResponse>` — "When doing a partial download, the layer digest is not verified as all bytes are unavailable." ([same source as above](https://raw.githubusercontent.com/oras-project/rust-oci-client/main/src/client.rs))

Any resume/range-request feature built on top of this must treat every partial chunk as **unverified** and defer the digest check to the point where the full blob is reassembled — never mark a resumed download "done" on a partial fetch's own success.

### 7. The `Content-Length` lies case

`Content-Length` is a claim, not a fact — it comes from the server (or a MITM, on an unauthenticated mirror) and nothing forces it to match the bytes actually sent. `reqwest`'s own docs make the trust boundary explicit:

> `Response::content_length()` "does not directly represent the value of the `Content-Length` header, but rather the size of the response's body" — it returns `None` for HEAD-like bodies, and **automatic decompression changes the decoded length from what the header specifies**, so relying on it for the *transmitted* size is wrong; callers who need the raw header value must read `Response::headers()` directly. ([docs.rs/reqwest — Response::content_length](https://docs.rs/reqwest/latest/reqwest/struct.Response.html#method.content_length))

Two failure modes follow directly:

1. **Header understates reality** — use it to `try_reserve` a hint-sized buffer, but enforce the *actual* cap by counting bytes read via `.take(cap)`, not by trusting the header said "small."
2. **Header overstates reality** (server hangs after fewer bytes, or truncated connection) — a `with_capacity(header_value)` allocation up front wastes memory for nothing if the body never arrives; growing incrementally avoids paying for a promise that wasn't kept.

The correct pattern treats `Content-Length` purely as a sizing *hint*, never as a *limit* and never as a *guarantee*:

```rust
// WRONG — header value used as both allocation size and trust boundary
let len = response.content_length().unwrap_or(0) as usize;
let mut buf = Vec::with_capacity(len);
response.copy_to(&mut buf)?; // no cap on actual bytes read

// RIGHT — header is a hint only; the real limit is enforced by .take() on the byte stream
let hinted = response.content_length().unwrap_or(0).min(MAX_BLOB_BYTES);
let mut buf = Vec::new();
buf.try_reserve(hinted as usize).ok(); // best-effort hint, failure is fine, not fatal
let mut limited = response.bytes_stream().map(...).into_async_read().take(MAX_BLOB_BYTES);
tokio::io::copy(&mut limited, &mut buf).await?;
```

### 8. Bounded concurrency and bounded channels

N parallel blob downloads is a peak-memory multiplier: `per-blob-buffer-size × N` in flight simultaneously, independent of how careful any single download's streaming discipline is. Two primitives, both already in the tokio dependency this codebase presumably has:

> `tokio::sync::Semaphore` — "maintains a set of permits... If no remaining permits are available, `acquire` (asynchronously) waits until an outstanding permit is dropped." `acquire_owned()` on an `Arc<Semaphore>` returns a permit that can move into a spawned task — the standard pattern for bounding concurrent async work like parallel downloads. ([docs.rs/tokio — Semaphore](https://docs.rs/tokio/latest/tokio/sync/struct.Semaphore.html))

> `tokio::sync::mpsc::channel<T>(buffer: usize) -> (Sender<T>, Receiver<T>)` — "buffer[s] up to the provided number of messages. Once the buffer is full, attempts to send new messages will wait until a message is received" — this is backpressure, and it's what makes the channel's memory bounded. ([docs.rs/tokio — mpsc::channel](https://docs.rs/tokio/latest/tokio/sync/mpsc/fn.channel.html))

`unbounded_channel` exists in the same module and removes exactly this guarantee — a fast producer (network reads) against a slow consumer (disk writes, or a downstream rate limit) grows the queue without bound, which is the same failure shape as an uncapped `Vec::with_capacity` — just relocated from "one bad header" to "one slow consumer."

```rust
// WRONG — no concurrency limit, no channel limit
let handles: Vec<_> = layers.iter().map(|l| tokio::spawn(pull_and_verify(l.clone()))).collect();

// RIGHT — bounded concurrency via semaphore, bounded pipeline via mpsc
let sem = Arc::new(tokio::sync::Semaphore::new(MAX_PARALLEL_DOWNLOADS));
let (tx, mut rx) = tokio::sync::mpsc::channel(CHANNEL_CAPACITY);
for layer in layers {
    let permit = sem.clone().acquire_owned().await?;
    let tx = tx.clone();
    tokio::spawn(async move {
        let _permit = permit; // held until task ends, then released
        let result = pull_and_verify(layer).await;
        let _ = tx.send(result).await;
    });
}
```

### 9. Where limits live: constants, config, typed errors

Every limit in this doc needs three things: a named constant with a rationale comment, a decision on configurability, and a dedicated typed error variant. The OCI distribution spec gives one concrete anchor value:

> "A registry SHOULD enforce some limit on the maximum manifest size that it can accept," responding `413 Payload Too Large` when exceeded. "Client and registry implementations SHOULD expect to be able to support manifest pushes of at least 4 megabytes." ([github.com/opencontainers/distribution-spec — spec.md](https://github.com/opencontainers/distribution-spec/blob/main/spec.md))

That's the floor for a manifest-size constant (`MAX_MANIFEST_BYTES`, at minimum 4 MiB, no reason to go lower than the spec's own stated expectation). Everything else in this doc (blob size, expansion ratio, entry count, channel capacity, parallelism) has no equivalent spec-mandated number and must be a deliberately chosen, documented constant — see [Normative guidance](#normative-guidance-candidates) #12–#13 for the concrete table.

The error-typing requirement is non-negotiable because a limit trip is a *decision point* for the caller (retry vs. abort vs. report-and-quarantine-the-source), and a generic `io::Error`/`anyhow::Error` erases that decision:

```rust
#[derive(Debug, thiserror::Error)]
pub enum IngestError {
    #[error("manifest exceeds {limit} bytes (declared {declared})")]
    ManifestTooLarge { limit: usize, declared: u64 },
    #[error("layer blob exceeds {limit} bytes")]
    LayerTooLarge { limit: u64 },
    #[error("decompression ratio exceeded (cap {limit} bytes)")]
    DecompressionRatioExceeded { limit: u64 },
    #[error("archive contains more than {limit} entries")]
    TooManyEntries { limit: usize },
    #[error("arithmetic overflow computing manifest total size")]
    ManifestSizeOverflow,
    #[error("digest mismatch: expected {expected}, got {actual}")]
    DigestMismatch { expected: String, actual: String },
    #[error(transparent)]
    Io(#[from] std::io::Error),
}
```

## Normative guidance candidates

1. **Ban unchecked `+ - * <<` on any value derived from a manifest field, HTTP header, or archive header, anywhere on the ingestion path (registry → blob → decompress → extract → verify).** Rationale: release-mode wraps silently; this is the one bug class where "it worked in my debug build" is actively misleading. VERIFICATION: `#![warn(clippy::arithmetic_side_effects)]` or `#![deny(...)]` as an inner attribute on the ingestion module(s) only (`src/ingest/*.rs`, `src/pull/*.rs`, or wherever ingestion lives), not a workspace-level `deny` in `Cargo.toml`/`clippy.toml`; grep for module-level scoping via `grep -rn "arithmetic_side_effects" src/`.
2. **Do not enable `clippy::arithmetic_side_effects` repo-wide.** Rationale: it's a restriction lint that flags all arithmetic, including loop counters and trusted math; repo-wide `deny` produces false-positive fatigue that gets the lint disabled entirely instead of fixed. VERIFICATION: `grep -n "arithmetic_side_effects" clippy.toml Cargo.toml **/lib.rs **/main.rs` — the lint name should appear only inside `#![...]` inner attributes scoped to specific ingestion module files, never at crate root.
3. **Track [clippy#12503](https://github.com/rust-lang/rust-clippy/issues/12503) as an open dependency; don't build tooling assuming it lands.** Rationale: it's the exact ask (targeted overflow lint for untrusted-input arithmetic) and it's unresolved — the manual-scoping approach in #1/#2 is the interim, not a placeholder for something upstream will fix soon. VERIFICATION: reading heuristic — re-check issue state during periodic dependency/tooling audits; no automatable check.
4. **Ban `as` for any numeric narrowing or signed/unsigned conversion on the ingestion path; require `u32::try_from(x)?` / `usize::try_from(x)?` / `i64::try_from(x)?` etc.** Rationale: `as` truncates and drops sign silently; `try_from` returns a `Result` the caller must handle. VERIFICATION: `#![deny(clippy::as_conversions)]` scoped to ingestion modules (see #1's scoping mechanism), or at minimum `#![warn(clippy::cast_possible_truncation, clippy::cast_sign_loss)]`; `grep -n " as u\| as i\| as usize" src/ingest/` as a manual backstop since the lints are allow-by-default and easy to leave off a given file.
5. **Never call `Vec::with_capacity` / `String::with_capacity` / `HashMap::with_capacity` / `BufWriter::with_capacity` with a length read directly from a manifest field, HTTP header, or archive header.** Rationale: these panic/abort on an allocation they can't satisfy; an attacker-chosen length is a one-line DoS. VERIFICATION: `grep -rn "with_capacity(" src/ingest/ src/pull/` and manually confirm every hit's argument passed through a cap-then-clamp or `try_reserve` step first, not a raw declared value.
6. **Clamp every declared length against a documented ceiling before use, then grow incrementally as bytes actually arrive — a declared length is a hint, never a trusted allocation size.** Rationale: `try_reserve` alone still honors an attacker's number if it happens to be under `isize::MAX`; the ceiling is the actual defense. VERIFICATION: reading heuristic — every `try_reserve`/`with_capacity` call site in ingestion code should be preceded within the same function by a comparison against a named `MAX_*` constant.
7. **Every decompression step (gzip, zstd, or any future codec) must enforce two independent caps: an absolute output-byte cap via `Read::take`/`AsyncReadExt::take`, and an expansion-ratio cap (`compressed_len * MAX_RATIO`), taking the tighter of the two.** Rationale: ratio-only and cap-only are each independently bypassable (Wikipedia's zip-bomb writeup documents both attack shapes; 100M:1+ ratios are achievable). VERIFICATION: `grep -rn "\.take(" src/ingest/` should show a `.take(cap)` call wrapping every decompressor's *output* reader (`GzDecoder`, `zstd::Decoder`, etc.), not just the network response reader; `grep -rn "MAX_EXPANSION_RATIO\|MAX_.*_BYTES" src/ingest/` should show both a ratio and an absolute constant defined together.
8. **Wrap the decompressor's output, not its compressed input, with the byte cap.** Rationale: capping compressed input bytes only limits download size, which was never the risk — decompressed output is. VERIFICATION: reading heuristic — trace each `.take(...)` call to confirm it's applied to the `Read`/`AsyncRead` implementor that yields *decompressed* bytes (i.e., wraps `GzDecoder`/`Decoder`, or is applied after `tokio::io::copy` reads from one), not the raw HTTP body stream feeding into the decompressor.
9. **Apply the per-entry decompressed-size cap to every archive entry individually, and separately enforce a hard cap on total entry count per archive.** Rationale: single-huge-entry and many-tiny-entries are different bomb shapes; one limit doesn't catch both. VERIFICATION: `grep -rn "MAX_ARCHIVE_ENTRIES\|entry_count" src/ingest/` — a counter incremented once per `tar::Archive::entries()` iteration, checked against a named constant, with a `checked_add` (not raw `+= 1`, per rule #1).
10. **Pin `tar >= 0.4.45`; treat "which size field wins" (base header vs. PAX extension) as a reviewed decision recorded in code, not an unstated crate-version assumption.** Rationale: [RUSTSEC-2026-0068 / CVE-2026-33055](https://rustsec.org/advisories/RUSTSEC-2026-0068.html) is a real, dated bug in exactly this "trust which untrusted size field" decision, in a crate this project plausibly depends on directly. VERIFICATION: `cargo tree -i tar` (or `cargo tree -p tar`) shows `>= 0.4.45`; `cargo audit` / `cargo deny check advisories` includes `tar` in its scanned set and reports clean.
11. **Hash bytes as they are written (per-chunk `Digester::update` alongside `AsyncWrite::write_all`), never by re-reading a materialized buffer or file after the fact.** Rationale: this is oci-client's own proven pattern (`pull_blob` in [client.rs](https://raw.githubusercontent.com/oras-project/rust-oci-client/main/src/client.rs)) — reusing it means not re-deriving digest-composition correctness from scratch. VERIFICATION: reading heuristic — every function that writes a blob or extracted file to disk should call a digest/hasher `.update()` in the same loop body as the write, not in a separate pass afterward.
12. **Write to a `.part`/temp path; verify; only then atomically rename to the final path. On any verification failure, delete the temp file — never leave unverified bytes reachable under their final name.** Rationale: verify-before-publish is the only ordering that prevents a partially-written or digest-mismatched blob from being read by the rest of the system as if it were trusted. VERIFICATION: `grep -rn "rename\|persist" src/ingest/ src/pull/` should show every `rename`/`persist` call postdated (in source order, within the same function) by a digest-comparison check that returns early on mismatch.
13. **Never treat a partial/range-fetched blob as digest-verified.** Rationale: oci-client's own docs state the digest isn't checked when only some bytes are fetched — this is a structural fact about partial downloads, not a gap this codebase can paper over. VERIFICATION: reading heuristic — any resume/range-download code path must defer the digest check to full-blob reassembly; grep for calls to a `*_partial`/range-request API and confirm no early "success" return before the full-blob digest check runs.
14. **Treat `Content-Length` (and any archive/manifest-declared size field) as a sizing hint only — never as the sole basis for an allocation, and never as a substitute for counting actual bytes read.** Rationale: `reqwest`'s own docs note the header can diverge from actual decoded body size; a hostile or misconfigured server can lie in either direction. VERIFICATION: `grep -rn "content_length()" src/` — every use should feed into a `.min(MAX_*)` clamp or a `try_reserve` (not `with_capacity`) call, never a bare cap on the byte-reading loop itself.
15. **Bound concurrent blob downloads with `Arc<tokio::sync::Semaphore>`; bound any inter-task byte/chunk pipeline with `tokio::sync::mpsc::channel(N)`, never `unbounded_channel`.** Rationale: N-way parallelism is a memory multiplier regardless of per-download streaming discipline; an unbounded channel just relocates the uncapped-allocation risk from "one bad header" to "one slow consumer." VERIFICATION: `grep -rn "unbounded_channel" src/` should return zero hits in ingestion code; `grep -rn "Semaphore::new(" src/ingest/ src/pull/` shows a named constant, not a literal, as the argument.
16. **Every limit is a named constant with a one-line rationale comment, a stated configurability decision (env var / config file / hardcoded — pick one, don't leave it implicit), and a dedicated `IngestError` variant carrying the limit and the offending value.** Rationale: a limit trip is a decision point for the caller (retry vs. abort vs. quarantine); a generic `io::Error` or `anyhow!` erases that decision and makes the failure indistinguishable from a transient network blip. VERIFICATION: `grep -rn "^const MAX_" src/ingest/` cross-referenced against `grep -rn "enum IngestError" -A 30 src/ingest/error.rs` — every `MAX_*` constant should have a matching error variant that names it in the `#[error(...)]` message.

## AI-agent angle

- **LLMs default to `as` over `try_from`/`try_into` because it's shorter and never produces a compile error** — an autonomous agent asked to "parse this header into a `u32`" will write `header_value as u32` nine times out of ten unless a lint or an explicit style rule blocks it. Smallest mechanical check: `#![deny(clippy::as_conversions)]` scoped to the ingestion module — a denied lint fails the build, which an agent's own `cargo build`/`cargo clippy` self-check step will catch before it hands back a "done" claim; a warn-only lint gets silently ignored by an agent that doesn't grep clippy warnings.
- **LLMs write `+`/`-`/`*` on `u64`/`usize` values without noticing the operands trace back to network/file input**, because nothing in the surrounding code *looks* untrusted — there's no type-level "tainted" marker in plain Rust. Smallest mechanical check: `#![warn(clippy::arithmetic_side_effects)]` scoped to ingestion files, reviewed as part of the PR diff (the lint's false-positive rate on a *small, scoped* module is low enough to actually read every hit, unlike repo-wide).
- **LLMs reach for `Vec::with_capacity(declared_len)` as the "efficient" way to preallocate, because that's the textbook pattern for "avoid reallocation" and the agent has no adversarial framing on the declared length's source.** Smallest mechanical check: `grep -n "with_capacity(" <diff>` in a pre-merge review step, flag any hit whose argument isn't a compile-time constant or a value that's already passed through a `.min(MAX_*)` clamp earlier in the same function.
- **LLMs implement decompression by chaining `GzDecoder::new(reader)` straight into `read_to_end` or `io::copy`, because that's the shape every tutorial and every crate doc example shows — none of the crate docs themselves demonstrate a `.take()` wrapper.** This is a documentation-shaped gap, not a model-competence gap: the model is pattern-matching on real upstream examples that omit the bound. Smallest mechanical check: a repo-specific clippy-equivalent is overkill; instead, a grep-based CI check for `GzDecoder::new(\|Decoder::new(` in ingestion files without a `.take(` within N lines downstream, or a code-review skill rule that explicitly names this pattern.
- **LLMs write digest verification as a two-pass operation** — "download the whole thing, then hash it" — because that's conceptually simpler to reason about than streaming, and the agent isn't tracking that pass 1 already fully materializes the blob in memory/disk before pass 2 even starts. Smallest mechanical check: reading heuristic in review — search the diff for any function that both writes a full blob to a `Vec`/file *and* calls a hash `finalize()`/`update()` in a *separate* loop or after a `read_to_end`; that shape is the tell, regardless of variable names.
- **LLMs asked for "parallel downloads" reach for `join_all`/`futures::future::join_all` or an unbounded `for_each_concurrent(usize::MAX, ...)` because those are the highest-relevance tutorial patterns for "run N async things at once," with no default bound.** Smallest mechanical check: `grep -n "for_each_concurrent(usize::MAX\|join_all(" <diff>` in review, flag for a semaphore/explicit-limit substitution.

## Contested / evolving

- **Whether `arithmetic_side_effects` should ever be repo-wide is a live style disagreement, not a settled question.** Some teams (crypto/systems-level, `RUSTSEC`-conscious codebases) do run it workspace-wide and accept the noise as the cost of catching every overflow site; the position this doc takes (scope to ingestion modules) is a pragmatic middle ground, not the only defensible one — reasonable teams land elsewhere depending on how much of the codebase actually touches untrusted numbers. Direction of travel: clippy#12503 sitting open since its filing suggests upstream hasn't converged on a narrower, less-noisy variant either, so the manual-scoping workaround is likely to remain the practical answer for a while yet.
- **`overflow-checks = true` in release profile (via `Cargo.toml` `[profile.release] overflow-checks = true`) is a blunter, whole-program alternative to per-call-site checked arithmetic** — it makes release builds panic on overflow like debug builds, at a real (if usually small) runtime cost. This doc does not recommend it as a substitute for `checked_*`/`try_from` on ingestion code specifically (panicking on untrusted input is itself a DoS vector — an attacker can crash the process by choosing manifest sizes that overflow, rather than the process silently misbehaving), but some teams use it as a defense-in-depth net for the rest of the codebase. Whether to also flip this flag is an orthogonal decision this doc doesn't resolve.
- **The tar-crate PAX-size-header bug ([RUSTSEC-2026-0068](https://rustsec.org/advisories/RUSTSEC-2026-0068.html)) is recent** (2026) relative to this research date — it's evidence the "which untrusted field do we trust" problem is still actively producing new CVEs in exactly this crate ecosystem, not a solved-and-historical concern. Expect more advisories of this shape (parser-differential size-field handling) as archive-format edge cases keep getting fuzzed; this subarea's guidance (pin versions, run `cargo audit`/`cargo deny` in CI) is a moving target that needs periodic re-verification, not a one-time fix.
- **zstd's `window_log_max` is a decoder-memory control, not an output-size control, and it's easy to conflate the two** — the crate docs don't draw this distinction explicitly (this doc's framing of it as "complementary, not a substitute" is this research's synthesis, not a quote from the zstd docs themselves). If zstd crate maintainers add an explicit output-byte-limit API in a future version, that would directly obsolete part of the manual `.take()`-based recipe in §4 for the zstd path specifically (gzip would still need it, since `flate2` shows no sign of adding one).

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [corrode.dev/blog/pitfalls-of-safe-rust](https://corrode.dev/blog/pitfalls-of-safe-rust/) | Blog post on common safe-Rust footguns | current (fetched 2026-08) | Direct primary source on debug/release overflow divergence and `as`-cast truncation, named explicitly in the task brief |
| [rust-lang.github.io/rust-clippy — arithmetic_side_effects](https://rust-lang.github.io/rust-clippy/master/index.html#arithmetic_side_effects) | Official clippy lint reference page | current (master docs) | Primary source for the lint's exact scope, default level (allow), group (restriction), and config knobs |
| [github.com/rust-lang/rust-clippy/issues/12503](https://github.com/rust-lang/rust-clippy/issues/12503) | Open clippy feature-request issue | filed, still open as of fetch | Primary evidence the "targeted release-overflow lint" gap is unclosed tooling, not solved |
| [rust-lang.github.io/rust-clippy — as_conversions](https://rust-lang.github.io/rust-clippy/master/index.html#as_conversions) | Official clippy lint reference page | current (master docs) | Primary source for the `as`-cast ban lint, its allow-by-default status, and recommended `try_into` alternative |
| [rust-lang.github.io/rust-clippy — cast_possible_truncation](https://rust-lang.github.io/rust-clippy/master/index.html#cast_possible_truncation) | Official clippy lint reference page (also covers cast_sign_loss) | current (master docs) | Primary source for the two specific untrusted-number cast lints named in the task brief |
| [docs.rs/tokio — AsyncReadExt::take](https://docs.rs/tokio/latest/tokio/io/trait.AsyncReadExt.html) | Official tokio API docs | current | Primary source for the exact `.take()` signature used as the absolute-cap mechanism throughout this doc |
| [docs.rs/flate2 — GzDecoder](https://docs.rs/flate2/latest/flate2/read/struct.GzDecoder.html) | Official flate2 API docs | current | Confirms (by absence) that flate2 provides no bomb protection — the doc's silence is itself the finding |
| [docs.rs/zstd — Decoder](https://docs.rs/zstd/latest/zstd/stream/read/struct.Decoder.html) | Official zstd-rs API docs | current (0.13.3) | Primary source for `window_log_max`, the one bomb-adjacent control zstd does expose, and its distinct scope (decoder memory, not output size) |
| [docs.rs/tar — Archive](https://docs.rs/tar/latest/tar/struct.Archive.html) | Official tar crate API docs | current | Primary source for streaming-entry-by-entry design and the explicit "unpack() doesn't prevent traversal" warning |
| [docs.rs/tar — Entry](https://docs.rs/tar/latest/tar/struct.Entry.html) | Official tar crate API docs | current | Primary source for the PAX-vs-header size() sourcing rule that RUSTSEC-2026-0068 got wrong |
| [rustsec.org/advisories/RUSTSEC-2026-0068](https://rustsec.org/advisories/RUSTSEC-2026-0068.html) | RustSec advisory (CVE-2026-33055) | 2026, recent | Concrete, dated CVE for exactly this subarea's central failure mode in a directly relevant crate |
| [raw.githubusercontent.com/oras-project/rust-oci-client — client.rs](https://raw.githubusercontent.com/oras-project/rust-oci-client/main/src/client.rs) | Source code of oci-client, the codebase's own OCI-registry dependency | current `main` branch | Direct prior art: exact streaming + hash-as-you-write pattern this doc's guidance is built on |
| [docs.rs/reqwest — Response::content_length](https://docs.rs/reqwest/latest/reqwest/struct.Response.html#method.content_length) | Official reqwest API docs | current | Primary source for the "Content-Length lies" case, specifically the auto-decompression divergence |
| [en.wikipedia.org/wiki/Zip_bomb](https://en.wikipedia.org/wiki/Zip_bomb) | Encyclopedia article on zip-bomb construction and defenses | general reference, cites documented real-world examples (42.zip etc.) | Concrete expansion-ratio numbers (100M:1+) that calibrate why dual-limit (absolute + ratio) defense is necessary, and the general dual-limit argument |
| [github.com/opencontainers/distribution-spec — spec.md](https://github.com/opencontainers/distribution-spec/blob/main/spec.md) | OCI Distribution Specification, official spec doc | current `main` | Only spec-mandated size number available (4 MiB manifest floor) — anchors one of the doc's concrete constants |
| [doc.rust-lang.org/std — Vec::try_reserve](https://doc.rust-lang.org/std/vec/struct.Vec.html#method.try_reserve) | Official Rust standard library docs | current | Primary source for the fallible-allocation API that's the alternative to panic-on-OOM `with_capacity` |
| [docs.rs/tokio — Semaphore](https://docs.rs/tokio/latest/tokio/sync/struct.Semaphore.html) | Official tokio API docs | current | Primary source for the bounded-concurrency primitive recommended for parallel downloads |
| [docs.rs/tokio — mpsc::channel](https://docs.rs/tokio/latest/tokio/sync/mpsc/fn.channel.html) | Official tokio API docs | current | Primary source for bounded-channel backpressure semantics, contrasted with unbounded_channel |
