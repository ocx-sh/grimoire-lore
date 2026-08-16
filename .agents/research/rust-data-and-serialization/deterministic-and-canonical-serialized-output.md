---
title: Deterministic and Canonical Serialized Output
agent: rust-data-and-serialization / deterministic-and-canonical-serialized-output
model: sonnet
date_researched: 2026-08
sources_count: 14
scope: >
  Byte-for-byte reproducibility of everything grim/ocx write to disk or emit
  as `--json` (lockfiles, cache indexes, JSON output, SBOMs, OCI layers), and
  the encoding correctness underneath digest comparison: collection
  iteration order, canonical-JSON policy, digest string encoding, fixed-size
  digest types, and tar/layer reproducibility for OCI artifacts this project
  builds.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [HashMap/HashSet iteration order is per-process random](#1-hashmaphashset-iteration-order-is-per-process-random)
   2. [serde_json's own default is already sorted — the trap is `preserve_order`](#2-serde_jsons-own-default-is-already-sorted--the-trap-is-preserve_order)
   3. [IndexMap: insertion order as semantic order, not a sort substitute](#3-indexmap-insertion-order-as-semantic-order-not-a-sort-substitute)
   4. [Canonical JSON: JCS (RFC 8785) vs OCI's raw-bytes model](#4-canonical-json-jcs-rfc-8785-vs-ocis-raw-bytes-model)
   5. [Number formatting, `-0.0`, NaN/Infinity](#5-number-formatting--00-naninfinity)
   6. [Option::None and empty collections: omit vs null vs `[]`/`{}`](#6-optionnone-and-empty-collections-omit-vs-null-vs-)
   7. [String escaping, Unicode normalization, trailing newline, line endings](#7-string-escaping-unicode-normalization-trailing-newline-line-endings)
   8. [Digest string encoding: one module, hex vs base64, case, prefix](#8-digest-string-encoding-one-module-hex-vs-base64-case-prefix)
   9. [Fixed-size digest type instead of `Vec<u8>`](#9-fixed-size-digest-type-instead-of-vecu8)
   10. [Constant-time comparison — and where it does not matter](#10-constant-time-comparison--and-where-it-does-not-matter)
   11. [Reproducible tar/OCI-layer construction](#11-reproducible-taroci-layer-construction)
   12. [CI gate: build-twice-and-diff / golden fixture](#12-ci-gate-build-twice-and-diff--golden-fixture)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

1. `HashMap`/`HashSet` use `RandomState`, reseeded every process — identical logical content serializes to different byte sequences on every run unless the map/set is sorted or ordered before it reaches a serializer.
2. `serde_json::Map` is `BTreeMap`-backed **by default** — key order is already sorted unless the crate's `preserve_order` feature is enabled anywhere in the dependency tree (features are additive across a workspace, so one transitive dependency turning it on flips your ordering too).
3. `preserve_order` does not mean "sorted" — it means "insertion order" (`IndexMap`-backed). Getting sorted output back requires `serde_json::Map::sort_keys()` or building your own `BTreeMap`.
4. `IndexMap`/`IndexSet` are for the one case where insertion order *is* the semantic order (e.g., a lockfile section that must mirror manifest declaration order); they are not a shortcut around sorting when order is not semantically meaningful — that case wants `BTreeMap`/`BTreeSet`.
5. RFC 8785 (JCS) is the reference canonicalization scheme: recursive lexicographic (UTF-16 code-unit) key sort, no insignificant whitespace, ECMAScript `Number::toString`-compatible number rendering, and a hard error on NaN/Infinity.
6. The OCI image-spec/distribution-spec do **not** mandate JCS or any re-canonicalization on read: the digest is computed over whatever exact bytes were pushed, and pulled bytes are re-hashed and compared byte-for-byte. This means the project's obligation is not "make manifests JCS-canonical" but "serialize deterministically once, then treat those exact bytes as opaque and never re-serialize before hashing."
7. Digest strings in the OCI spec are `algorithm:hex`, lowercase-only (`[a-f0-9]`) — uppercase hex is explicitly forbidden by the grammar, not just a style choice.
8. Ad hoc `format!("{:x}", digest)` or `hex::encode`/`encode_upper` scattered at call sites is the failure mode: a case mismatch (or padding mismatch for base64) makes two logically-equal digests compare unequal, and it fails silently as a cache miss or a bogus "content changed," not as a crash.
9. Centralize digest formatting/parsing in one module: a `Digest`/`Sha256Digest` newtype wrapping `[u8; 32]`, with a single `Display`/`FromStr` pair that is the only place `format!`/`hex::encode` for a digest is allowed to appear.
10. Prefer `[u8; 32]` (or a small enum over algorithm-tagged fixed arrays) to `Vec<u8>` for digest storage — the length invariant becomes a compile-time fact instead of a runtime check repeated at every call site.
11. Multi-algorithm support (sha256 now, sha512 optionally per spec) is best modeled as an enum of fixed-size variants (`Sha256([u8;32])`, `Sha512([u8;64])`) rather than a `Vec<u8>` with a separate algorithm tag that can drift out of sync with the byte length.
12. Constant-time comparison (the `subtle` crate's `ConstantTimeEq`) matters for secrets (tokens, credentials) — it does *not* matter for content digests, which are public values compared for integrity, not secrecy; using `subtle` there is cargo-cult and adds real cost for zero benefit.
13. `#[serde(skip_serializing_if = "Option::is_none")]` is opt-in per field — Serde's default is to emit `null` for `None` and `[]`/`{}` for empty collections. The canonicalization policy (omit vs. emit) must be a declared, project-wide decision, not whatever each struct's author happened to type.
14. serde_json numbers round-trip through `f64`/ryu-style formatting for floats; `-0.0` serializes as `-0.0` in serde_json (unlike JCS's zero-normalization) — if the project ever computes a digest over JSON containing floats, JCS and serde_json's own `to_string` are **not** guaranteed to agree, so digest inputs should avoid floats or the exact serializer must be pinned and tested, not assumed JCS-equivalent.
15. Reproducible tar layers (when this tool builds an OCI layer) need explicit normalization: `--sort=name` entry order, fixed `mtime` (ideally from `SOURCE_DATE_EPOCH`), `uid=gid=0`, `--numeric-owner`, and a fixed file mode policy — none of these are the default behavior of an ad hoc walk-and-append.
16. `SOURCE_DATE_EPOCH` is the standard mechanism for a single build-wide timestamp; anywhere this project embeds "now" into a reproducible artifact (layer mtimes, generated-at fields hashed into an SBOM) should read that variable or a project-equivalent instead of `SystemTime::now()`.
17. A CI gate that only asserts "the code compiles and tests pass" will not catch order regressions — the only reliable check is a build-twice-and-diff (or a fixed-input golden-fixture hash) run in CI, because HashMap-sourced nondeterminism is invisible in a single run and invisible in a diff against a stale fixture that was itself generated nondeterministically.
18. The mechanical grep that finds the risk class: any `HashMap`/`HashSet` type that flows into a `#[derive(Serialize)]` struct field, a `serde_json::to_*` call, a `for (k, v) in some_hashmap` loop that writes to a file/writer, or a `.iter()`/`.keys()` call feeding a hasher — not just literal `HashMap::new()` at the write site, since the map is usually built elsewhere and only *consumed* at the serialization boundary.

## Findings

### 1. HashMap/HashSet iteration order is per-process random

Rust's std docs are explicit and go beyond "unspecified" — they name the mechanism and its purpose:

> "An iterator visiting all keys in arbitrary order." … "By default, `HashMap` uses a hashing algorithm selected to provide resistance against HashDoS attacks. The algorithm is randomly seeded... each `HashMap` instance uses a different seed, which means that `HashMap::new` normally cannot be used in a `const` or `static` initializer." [rust-lang.org — HashMap docs](https://doc.rust-lang.org/std/collections/struct.HashMap.html)

This is a *security feature* (HashDoS resistance via SipHash + random seed), not a bug — which means "just switch the hasher to something deterministic" is the wrong fix for a security-sensitive tool; the correct fix is to never let iteration order of a `HashMap`/`HashSet` reach output. `HashSet` inherits the same guarantee (it's a `HashMap<T, ()>` wrapper) and has the identical problem.

```rust
// WRONG — cache index entries in whatever order the hasher put them
#[derive(Serialize)]
struct CacheIndex {
    entries: HashMap<String, CacheEntry>, // order varies per process
}

// RIGHT — order is either the semantic order (IndexMap, §3) or sorted (BTreeMap)
#[derive(Serialize)]
struct CacheIndex {
    entries: BTreeMap<String, CacheEntry>, // sorted by key, always
}
```

### 2. serde_json's own default is already sorted — the trap is `preserve_order`

This is the most counter-intuitive and highest-leverage fact in the whole subarea. `serde_json::Map`'s internal storage is feature-gated:

> Without `preserve_order`: "the implementation uses `BTreeMap` internally. This provides sorted key order." … With `preserve_order` enabled: "the implementation switches to `IndexMap`, which maintains insertion order rather than sorted order... if you need sorted output with `preserve_order` enabled, you must call [`sort_keys()`](https://docs.rs/serde_json/latest/serde_json/map/struct.Map.html), [which] destroys the original source order or insertion order of this map in favor of an alphanumerical order." [docs.rs — serde_json::map::Map](https://docs.rs/serde_json/latest/serde_json/map/struct.Map.html)

So the danger is not "serde_json is unordered by default" — it is that **Cargo features are additive across the whole dependency graph**: if any dependency (a pretty-printer, a schema tool, a debugging aid) enables `preserve_order` for its own reasons, every `serde_json::Value` in the binary — including ones this project builds and hashes — silently switches from sorted-by-default to insertion-order. A digest computed by hashing `serde_json::to_vec(&value)` output can change behavior across a dependency bump with zero code change in this repo.

**Implication for the project**: do not rely on serde_json's default sortedness as your canonicalization guarantee. It's an implementation detail that a transitive `Cargo.toml` feature flag can invert. Either (a) audit and pin against `preserve_order` ever being enabled (`cargo tree -e features | grep preserve_order` in CI), or (b) call `.sort_keys()` explicitly before any hash/write, so the guarantee is in your code, not in a feature flag someone else's crate controls.

### 3. IndexMap: insertion order as semantic order, not a sort substitute

> "IndexMap is a hash table where the iteration order of the key-value pairs is independent of the hash values of the keys" [and] maintains insertion order... "The standard serde feature serializes IndexMap and IndexSet while preserving their insertion order." [docs.rs — indexmap](https://docs.rs/indexmap/latest/indexmap/)

Use `IndexMap`/`IndexSet` only when insertion order *is* the data — e.g., a lockfile's `[[package]]` array should mirror the order dependencies were resolved/declared, not be alphabetized, because reordering it on every run would itself be a spurious diff. For everything else — a cache index keyed by content hash, a set of feature flags, any map whose keys have no inherent sequence — `BTreeMap`/`BTreeSet` is correct because it's self-sorting regardless of insertion order, which is one less invariant ("did we insert in the right order?") for a coding agent to get wrong.

### 4. Canonical JSON: JCS (RFC 8785) vs OCI's raw-bytes model

RFC 8785 defines canonicalization as recursive, deterministic re-serialization:

> "Property name strings to be sorted are formatted as arrays of UTF-16 code units. The sorting is based on pure value comparisons... Properties must be sorted recursively... array element order is preserved." … "Whitespace between JSON tokens MUST NOT be emitted." [RFC 8785 — JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785)

Critically, OCI's own spec does **not** ask implementations to canonicalize per JCS. The distribution-spec's verification model is: hash whatever bytes arrived, compare to the expected digest string —

> "Clients SHOULD verify that the response body matches the requested digest." … for manifests, "clients SHOULD verify the returned manifest matches this digest... clients MUST verify the value matches the returned manifest" if using the response header. [OCI distribution-spec — spec.md](https://github.com/opencontainers/distribution-spec/blob/main/spec.md)

and the image-spec treats the descriptor/digest system as opaque content addressing over exact bytes, not over a canonical re-encoding:

> Content-addressable images are achieved "by supporting an image model where the image's configuration can be hashed to generate a unique ID." [OCI image-spec — manifest.md](https://github.com/opencontainers/image-spec/blob/main/manifest.md)

**Decision for this project**: adopt JCS as the *policy for how this project's own serializer must behave* (sorted keys, no NaN/Infinity, minimal whitespace) so that this project's own outputs are reproducible — but never re-canonicalize bytes that arrived from a registry before hashing them. The rule is "serialize once, deterministically, then treat the bytes as final" — not "canonicalize on every read," which would silently produce a different digest than the one the OCI ecosystem actually signed/pushed.

### 5. Number formatting, `-0.0`, NaN/Infinity

JCS is explicit and strict:

> "values that are to be interpreted as true integers SHOULD be in the range −9007199254740991 to 9007199254740991." … "occurrences of NaN or Infinity MUST cause a compliant JCS implementation to terminate with an appropriate error." … `-0` "is serialized identically to 0." [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785)

`serde_json` does not match this by default: it will happily serialize `-0.0_f64` as the literal `-0.0` (Rust's `f64` `Display`/ryu formatting preserves the sign bit), and floats round-trip through IEEE-754 double formatting rather than JCS's ECMAScript-`Number::toString` algorithm. **Decision**: any document this project *hashes* should avoid floating-point fields entirely (use integers — cents, milliseconds, byte counts — or fixed-precision decimal strings). If a float genuinely must appear, normalize `-0.0 → 0.0` explicitly before serialization and document that the byte output is *not* claimed to be JCS-canonical, only "this project's own serializer, pinned by a golden-fixture test" (§12).

### 6. Option::None and empty collections: omit vs null vs `[]`/`{}`

Serde's default, absent any attribute, is to emit the value:

> `skip_serializing_if` "Call[s] a function to determine whether to skip serializing this field"... a practical example is `skip_serializing_if = "Option::is_none"`. ... Omitting None/empty fields is **not automatic** — "Without explicitly adding `#[serde(skip_serializing_if)]`, Serde will serialize `Option<T>` and empty collections normally." [serde.rs — field attributes](https://serde.rs/field-attrs.html)

```rust
// Two structs, same logical data, different bytes — pick ONE policy project-wide
#[derive(Serialize)]
struct A { description: Option<String> }          // -> {"description":null}

#[derive(Serialize)]
struct B {
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<String>,                    // -> {} (field absent)
}
```

**Decision for this project**: `null` for absent optional fields in `--json` output meant for machine parsing (schema stability — a consumer's `if "description" in obj` shouldn't flip behavior based on whether the value happened to be present); *omit* the field in lockfiles/cache indexes where the goal is a minimal, diff-friendly, digest-stable document and the schema is internal. State this per-format in one place (a `serde` helper module or a workspace-wide clippy/CI check), not per-struct-author judgment call. Empty `Vec`/`HashMap`/`BTreeMap` follow the same rule: emit `[]`/`{}` for public JSON API stability, omit for internal lockfiles.

### 7. String escaping, Unicode normalization, trailing newline, line endings

JCS's string rule: ASCII control chars (`U+0000`–`U+001F`) escape as `\uhhhh` in lowercase hex except the five short forms (`\b \t \n \f \r`); everything non-ASCII is emitted as-is (UTF-8), not escaped. [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785) `serde_json` matches this by default (it does not `\uXXXX`-escape non-ASCII). Neither JCS nor `serde_json` performs Unicode *normalization* (NFC/NFD) — two byte-distinct-but-canonically-equal Unicode strings (e.g., a precomposed é vs. `e` + combining acute) will serialize to different bytes and hash differently. If this project ever accepts free-text input that becomes a hashed field (a package name, a description), normalize to NFC at the input boundary — the serializer will not do it.

**Trailing newline / line endings**: `serde_json::to_writer`/`to_string` emit no trailing newline; adding one (or not) is a project choice that must be made once and enforced — a lockfile written with `writeln!` on one platform and `write!` on another is a spurious diff. On Windows, any use of `std::fs::write` combined with text-mode line-ending translation, or a hand-rolled `"\n".to_string()` vs. relying on a crate that emits `\r\n`, is a reproducibility bug: **force `\n` explicitly** (write bytes, not through a line-ending-translating text layer) so the same lockfile byte-for-byte matches across Linux/macOS/Windows CI runners — this is the multi-platform case called out in the task brief and it has no spec citation because it's a Rust/OS-boundary issue, not a serialization-format issue: `File::write_all` on raw bytes sidesteps it; anything that goes through `println!`/`writeln!` to a file opened in a mode that does CRLF translation does not.

### 8. Digest string encoding: one module, hex vs base64, case, prefix

OCI's descriptor grammar is exact and machine-checkable:

> digest = `algorithm ":" encoded`... SHA-256: "compliant implementations MUST implement SHA-256 digest verification" ... hex pattern `/[a-f0-9]{64}/` ... "Note that `[A-F]` MUST NOT be used here" for each algorithm. SHA-512 is optional; hex pattern `/[a-f0-9]{128}/`. [OCI image-spec — descriptor.md](https://github.com/opencontainers/image-spec/blob/main/descriptor.md)

So `sha256:` + lowercase hex is not a style preference — uppercase output is spec-non-compliant, full stop, and a naive `format!("{:X}", ...)` (Rust's uppercase hex formatter) or `hex::encode_upper` used for a digest string is a spec violation that will make this tool's manifests unreadable/rejected by other OCI-compliant tooling, and will make its own cache-key comparisons fail against anything produced by a spec-compliant peer. `hex::encode` (lowercase) is correct; `hex::decode` is case-insensitive on input per general hex convention, but **do not rely on decode's leniency to paper over an encode-side bug** — the encode side must be pinned to lowercase because it's the wire format, not just an internal representation. [docs.rs — hex](https://docs.rs/hex/latest/hex/)

For anything base64-encoded (unrelated to OCI digests, but relevant if this project emits, say, a base64 SBOM attachment or a credential), the crate makes the alphabet an explicit, non-defaultable choice per call site:

> "The standard alphabet [is] the default"... "URL-Safe Alphabet: Substitutes `-` and `_` for `+` and `/`"... "'Canonical encoding' ensures that base64 encodings will be exactly the same, byte-for-byte, regardless of input length" [with padding]; `NO_PAD` variants "strictly reject padding on decode." [docs.rs — base64](https://docs.rs/base64/latest/base64/)

**Decision**: one `digest` module owning both the `Digest` newtype (§9) and its `Display`/`FromStr`. `Display` emits `sha256:` + lowercase hex, always. `FromStr` accepts the OCI grammar and rejects (does not silently lowercase) uppercase hex on input, matching the spec's own MUST-NOT — an input digest string in the wrong case is a signal something upstream is non-compliant, not something to quietly correct. Round-trip property test: `Digest::from_str(&d.to_string()).unwrap() == d` for arbitrary byte arrays.

### 9. Fixed-size digest type instead of `Vec<u8>`

```rust
// WRONG — length is a runtime fact, checked (or not) at every call site
struct Manifest { config_digest: Vec<u8> }

// RIGHT — length is a type-level fact; a 31-byte digest cannot compile-in
#[derive(Clone, Copy, PartialEq, Eq, Hash)]
enum Digest {
    Sha256([u8; 32]),
    Sha512([u8; 64]),
}
```

`sha2::Sha256::finalize()` returns a `GenericArray<u8, U32>` (a fixed-size, const-generic-backed array type), not a `Vec` — the crate itself hands back a fixed-length type; converting it to `Vec<u8>` anywhere in this project's code is *throwing away* an invariant the dependency already gave you for free. [docs.rs — sha2](https://docs.rs/sha2/latest/sha2/) The conversion `GenericArray<u8,U32> -> [u8;32]` is a direct `.into()`/`TryFrom` — cheap, infallible for a known output size, and should happen exactly once, at the boundary where `sha2` output enters this project's own `Digest` type.

Multi-algorithm support (sha256 default per spec, sha512 optional) is naturally an enum of fixed-size variants rather than a `(Vec<u8>, Algorithm)` pair — the enum makes "64-byte buffer tagged as sha256" unrepresentable, where the pair representation lets algorithm and length silently drift apart (e.g., after a copy-paste bug).

### 10. Constant-time comparison — and where it does not matter

> "`subtle`... Pure-Rust traits and utilities for constant-time cryptographic implementations." `ConstantTimeEq` "allows comparisons of sensitive data — such as cryptographic digests or secrets — without revealing information through timing variations." Caveat: bitwise constant-time tricks work "provided that... the bitwise operations are not recognized as a conditional assignment and optimized back into a branch," and the crate's own docs call this "best-effort," warning it is "USE AT YOUR OWN RISK" for "specific use-cases implementing cryptographic protocols." [docs.rs — subtle](https://docs.rs/subtle/latest/subtle/)

The task brief asks for "constant-time comparison where it matters" — the honest answer for this project is: **content digests are not secrets**. A `sha256:` digest of a public package's manifest is published, transmitted in the clear, and its whole purpose is to be compared against other public digests; there is no timing side-channel to defend because there is nothing secret being compared. Reaching for `subtle::ConstantTimeEq` on digest comparison is cargo-cult security theater that costs real performance (subtle's approach forgoes short-circuiting) for zero benefit. Where it *does* matter in this codebase: comparing a user-supplied credential/token against a stored value (auth to a registry), or any secret-vs-secret comparison — those call sites, and only those, should route through `subtle`.

### 11. Reproducible tar/OCI-layer construction

reproducible-builds.org's archive guidance gives concrete, directly-applicable flags for anywhere this project builds a tar-based OCI layer:

> Entry ordering: `tar --sort=name -cf product.tar build` (locale-independent; for older tar, pipe through `find ... | LC_ALL=C sort -z | tar --no-recursion --null -T -`). Timestamps: `tar --mtime='2015-10-21 00:00Z' -cf product.tar build`, with `--clamp-mtime` (GNU tar 1.29+) to only rewrite *newer* timestamps. Ownership: `tar --owner=0 --group=0 --numeric-owner`. Permissions: `--mode=a=rX,u+w`. PAX headers: `--pax-option=exthdr.name=%d/PaxHeaders/%f,delete=atime,delete=ctime` (or force `--format=gnu`/`--format=ustar`). [reproducible-builds.org — Archives](https://reproducible-builds.org/docs/archives/)

If this project constructs tar layers programmatically (via the `tar` crate) rather than shelling out to GNU tar, every one of these must be reproduced explicitly in code: sort directory-walk entries by name (`\0`-free, `LC_ALL=C`-equivalent byte ordering, not OS readdir order, which is unspecified and platform-dependent — the same nondeterminism class as §1, just at the filesystem layer instead of the hashmap layer); set every `Header`'s mtime to a single fixed value (ideally `SOURCE_DATE_EPOCH`, see below) rather than the source file's real mtime or `SystemTime::now()`; set `uid`/`gid` to `0`; set mode to a fixed policy (e.g., `0o644` files / `0o755` dirs+executables) rather than propagating the building machine's umask-derived permissions.

`SOURCE_DATE_EPOCH` is the standardized single-timestamp mechanism:

> "a UNIX timestamp... build processes must replace current-time calls with this variable... 'timestamp clamping' — rewriting any timestamps newer than SOURCE_DATE_EPOCH back to that value." [reproducible-builds.org — SOURCE_DATE_EPOCH spec](https://reproducible-builds.org/specs/source-date-epoch/)

Any place this project embeds "now" into an artifact that later gets hashed (a layer's file mtimes, an SBOM's `created` field, a lockfile's `generated_at`) either excludes that field from the digest computation entirely, or derives it from `SOURCE_DATE_EPOCH`/an equivalent pinned value rather than `SystemTime::now()` — otherwise "digest of the same logical inputs" is unattainable by construction, independent of getting every other rule in this document right.

### 12. CI gate: build-twice-and-diff / golden fixture

Two complementary mechanisms, not a choice between them:

- **Golden fixture** (fast, always-on, catches most regressions): serialize a fixed, representative input (a lockfile with an intentionally HashMap-sourced field, a manifest with nested objects, an SBOM) and commit the expected bytes (or their digest) as a fixture; a unit/integration test asserts the current serializer reproduces those exact bytes. This catches format drift (a dependency bump flipping `preserve_order`, §2) on every PR, cheaply.
- **Build-twice-and-diff** (catches what a single-run fixture cannot): run the actual command twice in CI — ideally with `HashMap`'s random seed *not* pinned, so real per-process randomization is exercised — and diff the two output artifacts byte-for-byte. This is the only check that reliably catches a `HashMap` newly introduced between the fixture's last update and now: a golden fixture only fails once someone remembers to regenerate it against a specific bug; two-runs-diffed fails automatically, every time, with no human in the loop, which matters because Rust's process-level reseeding (§1) means a single CI run genuinely cannot distinguish "deterministic" from "got lucky this run."

## Normative guidance candidates

1. **Never let a `HashMap`/`HashSet` value reach a `#[derive(Serialize)]` field, a `serde_json::to_*` call, or a file writer.** Rationale: iteration order is per-process random by design (HashDoS resistance), so any such path produces a different byte sequence every run. VERIFICATION: `grep -rn "HashMap\|HashSet" --include=*.rs src/ | grep -v "^.*://"` cross-referenced against `grep -rln "derive(Serialize)\|serde_json::to_" src/` for shared files; stronger — a clippy-config or CI script asserting no `HashMap`/`HashSet` type appears in the type signature of any struct field also carrying `#[derive(Serialize)]`.
2. **Use `BTreeMap`/`BTreeSet` for any map/set whose order is not itself meaningful; use `IndexMap`/`IndexSet` only when insertion order *is* the declared semantic order (document why in a comment at the field).** Rationale: `BTreeMap` is self-sorting regardless of insertion order, removing "did we insert correctly" as a bug class (§3). VERIFICATION: reading heuristic — every `IndexMap`/`IndexSet` field must have an adjacent `// order: <reason>` comment; grep for `IndexMap` / `IndexSet` without a nearby `// order:` comment.
3. **Never enable, or transitively depend on, `serde_json`'s `preserve_order` feature unless every JSON value that flows to a hash/digest also gets an explicit `.sort_keys()` (or equivalent) immediately before serialization.** Rationale: `preserve_order` flips serde_json's own default sortedness to insertion-order project-wide, invisibly, from a dependency bump (§2). VERIFICATION: `cargo tree -e features -i serde_json | grep -i preserve_order` in CI (fails the build if found without an accompanying sort-keys call); `grep -rn "sort_keys()" src/` to confirm coverage where it is needed.
4. **Pick one canonicalization policy per output format (lockfile, cache index, `--json`, SBOM) and write it down in one module/doc, not per-author judgment**: key order (sorted vs. insertion), `None` (omit vs. `null`), empty collections (omit vs. `[]`/`{}`), float policy (forbidden vs. normalized `-0.0`→`0.0`), trailing newline (yes/no), line endings (`\n` always). Rationale: two structurally-identical documents differing only in one author's `skip_serializing_if` habit is a silent, undiagnosable digest mismatch. VERIFICATION: a single `canonical.rs`/`serialization.md` doc exists and every serializer entrypoint (`to_json_string`, `write_lockfile`, etc.) references it; code review checklist item.
5. **All digest formatting/parsing goes through one `Digest`/`digest` module — `format!("{:x}", ...)`, `hex::encode`, `hex::encode_upper`, or a hand-rolled loop over bytes for a digest, anywhere else in the codebase, is a defect.** Rationale: ad hoc encoding is exactly how a case mismatch silently breaks equality instead of erroring (§8). VERIFICATION: `grep -rn 'format!("{:[xX]}"' src/ | grep -v src/digest.rs` and `grep -rn "hex::encode" src/ | grep -v src/digest.rs` — any hit outside the digest module fails review.
6. **Digest `Display` always emits lowercase hex with the `algorithm:` prefix (`sha256:...`); `FromStr` rejects uppercase hex rather than silently lowercasing it.** Rationale: OCI's descriptor grammar states `[A-F]` MUST NOT be used — uppercase output is spec non-compliant, and silently accepting-and-fixing uppercase input masks a non-compliant upstream producer (§8). VERIFICATION: round-trip proptest `Digest::from_str(&d.to_string()) == Ok(d)`; a unit test asserting `Digest::from_str("sha256:ABCD...")` returns `Err`.
7. **Digest storage is a fixed-size type (`[u8; 32]` / `[u8; 64]`, wrapped in an algorithm-tagged enum for multi-algorithm support) — never `Vec<u8>`.** Rationale: `sha2`'s own `finalize()` already returns a fixed-size `GenericArray`; converting to `Vec<u8>` throws away a compile-time length invariant the dependency handed you for free (§9). VERIFICATION: `grep -rn "digest.*Vec<u8>\|Vec<u8>.*digest" src/` (case-insensitive) — any hit is a candidate for conversion to the fixed-size type; `clippy` cannot catch this one, it's a reading-heuristic/review item.
8. **Reserve `subtle::ConstantTimeEq` for secret-vs-secret comparisons (tokens, credentials); compare content digests with plain `==`.** Rationale: content digests are public values — there is no timing side-channel to defend, and constant-time comparison forgoes short-circuiting for no security benefit there (§10). VERIFICATION: `grep -rn "ConstantTimeEq\|ct_eq" src/` — every hit must be adjacent to a secret/credential type, not a `Digest` type; flag any `ct_eq` call whose argument type is `Digest`.
9. **When this tool constructs a tar/OCI layer itself, entry order is `LC_ALL=C`-equivalent byte-sorted by path, mtime is a single fixed value (from `SOURCE_DATE_EPOCH` or a project-defined constant, never `SystemTime::now()`), uid/gid are `0`, and file mode follows one fixed policy.** Rationale: none of these are the default behavior of an ad hoc filesystem walk + tar-append, and OS `readdir` order is itself unspecified (§11). VERIFICATION: build the same layer twice in CI and diff the resulting tar bytes (or their digest) — any difference fails the build; grep for `SystemTime::now()` in any file that also touches a `tar::Builder`/`Header`.
10. **A CI job builds every reproducibility-sensitive artifact (lockfile, cache index, a representative OCI layer) twice in one run and diffs the two outputs byte-for-byte; a second job pins a golden fixture's digest.** Rationale: `HashMap` randomization is per-process, so a single CI run cannot distinguish "actually deterministic" from "got lucky this run" — only two runs, diffed, catch it reliably (§12). VERIFICATION: the CI workflow file itself — grep for a step that runs the build/serialize command twice and pipes both outputs to `diff`/`cmp`, or hashes both and asserts equality.
11. **Never re-serialize (re-canonicalize) bytes received from an OCI registry before hashing them for verification — hash exactly the bytes on the wire.** Rationale: OCI's distribution-spec verification model is "hash the exact bytes received," not "canonicalize then hash" — re-serializing before hashing can silently produce a digest that matches this tool's own idea of canonical form but not the digest the registry (and every other OCI-compliant client) actually computed (§4). VERIFICATION: reading heuristic at every `verify_digest`/pull code path — trace that the byte slice passed to the hasher is the original `Bytes`/`&[u8]` response body, never the output of a `serde_json::to_*` call on a re-parsed `Value`.

## AI-agent angle

- **An LLM defaults to `HashMap` for "a map of X to Y" without checking whether the result feeds a serializer.** It has no signal at write time that a struct three call sites downstream derives `Serialize` — the type choice and the reproducibility requirement are separated in the code, not co-located. Smallest mechanical check: a CI grep/clippy rule (candidate 1 above) that flags any `HashMap`/`HashSet` type reachable from a `#[derive(Serialize)]` struct — cheap, and catches the exact failure mode before it ships.
- **An LLM told "make output deterministic" reaches for `preserve_order` + manual sorting, assuming serde_json is unordered by default — inverting the actual default (§2).** It will confidently add `preserve_order` to "fix" ordering and make things worse (insertion-order instead of the sorted-by-default it already had). Smallest check: `cargo tree -e features -i serde_json | grep preserve_order` in CI, paired with a comment/rule in the project's serialization doc stating the actual default explicitly, since this is exactly the kind of fact an LLM will get backwards from prior training on generic "HashMap is unordered, use IndexMap for order" advice that doesn't distinguish serde_json's `Map` from `std::collections::HashMap`.
- **An LLM asked to "hash this JSON for a digest" will typically call `serde_json::to_string(&value)` on a `Value` re-parsed from network bytes, rather than hashing the original response bytes — silently switching from "hash what arrived" to "hash our own re-serialization" (§4, §11).** This is invisible in tests that only exercise round-trips of locally-constructed values, because those never exhibit the byte-for-byte-vs-recanonicalized distinction. Smallest check: a test that intentionally pulls a manifest with non-canonical whitespace/key-order (a hand-crafted fixture, not one this project generated) and asserts the computed digest still matches the expected `sha256:` value — this fails immediately if verification code re-serializes anywhere in the path.
- **An LLM reaches for `subtle`/constant-time comparison on any "security-sensitive-sounding" byte comparison, including content digests, because the crate name and its docs read as unconditionally "more secure."** It does not reason about the public-vs-secret distinction that actually determines whether constant-time matters (§10). Smallest check: grep every `ConstantTimeEq`/`ct_eq` call site and require a one-line justification comment naming what secret is being protected — a `Digest`-typed argument fails review immediately.
- **An LLM building a tar layer writes a straightforward `WalkDir` + `tar::Builder::append_file` loop, which inherits OS `readdir` order and the source files' real mtimes/uid/gid — every one of reproducible-builds.org's four normalization axes (order, mtime, ownership, mode) is silently wrong by default (§11).** None of these show up as a compile error or even a single-run test failure; they only show up as a diff between two builds. Smallest check: candidate 10's build-twice-diff CI job — it is format-agnostic and catches this class of bug even when the reviewer doesn't know to look for `--sort=name`-equivalent logic specifically.

## Contested / evolving

- **JCS adoption is uneven in the OCI ecosystem.** RFC 8785 is a general-purpose JSON canonicalization standard (used in areas like JWS/JOSE-adjacent signing schemes and some SBOM/attestation formats), but the OCI image-spec and distribution-spec never require it — they require exact-byte digest stability, achieved by "don't re-serialize," not by mandating a canonical form. Direction of travel: in-toto/SLSA-style attestations and some SBOM tooling (CycloneDX, SPDX-JSON) are increasingly JCS-aware for their own signing needs, so a project emitting signed SBOMs may need JCS compliance there even though OCI manifests proper don't require it — worth re-checking if this project starts signing anything.
- **`BLAKE3` support in OCI digests.** The image-spec descriptor grammar already accommodates a `blake3` algorithm alongside sha256/sha512 (per the fetched descriptor.md), reflecting the broader ecosystem's move toward faster hash functions for large-artifact workflows; this project currently only needs sha256 (mandatory) but the `Digest` enum design (§9) should leave room for a `Blake3([u8; 32])` variant without a breaking change, since adoption pressure in this direction is real, not speculative.
- **serde_json's `preserve_order` default is a moving target across the ecosystem, not this project.** The finding in §2 (default = sorted via `BTreeMap`) is current as of the fetched docs.rs page for the latest `serde_json`, but plenty of existing blog posts and Stack Overflow answers from serde_json's early years pre-date this behavior or describe it inaccurately (some conflate "unordered" with "HashMap-like," which was never quite accurate even in older versions) — treat any pre-2024 source describing serde_json ordering as unverified without re-checking current docs.
- **Whether reproducible-builds-style tar normalization belongs in this project's own code vs. shelling out to `tar --sort=name ...`.** The reproducible-builds.org guidance is written tool-first (GNU tar flags); a Rust project using the `tar` crate to build layers programmatically has to reimplement each guarantee by hand (there is no single "reproducible mode" flag on the `tar` crate as of this research), which is real ongoing maintenance surface — flagged here as a design decision this subarea's normative rules assume but do not resolve for you.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [RFC 8785 — JSON Canonicalization Scheme (JCS)](https://www.rfc-editor.org/rfc/rfc8785) | IETF RFC, primary spec | 2020, current | Defines the reference canonical-JSON algorithm (key sort, number rendering, NaN/Infinity rejection) this project's own canonicalization policy should be measured against. |
| [OCI image-spec — descriptor.md](https://github.com/opencontainers/image-spec/blob/main/descriptor.md) | Primary spec, GitHub source | Living doc, 2026-current `main` | Exact digest grammar (`algorithm:hex`), registered algorithms (sha256 mandatory, sha512/blake3 optional), and the explicit `[A-F]` MUST NOT rule. |
| [OCI image-spec — manifest.md](https://github.com/opencontainers/image-spec/blob/main/manifest.md) | Primary spec, GitHub source | Living doc, 2026-current `main` | Confirms content-addressing is over exact serialized bytes, not a re-canonicalized form. |
| [OCI distribution-spec — spec.md](https://github.com/opencontainers/distribution-spec/blob/main/spec.md) | Primary spec, GitHub source | Living doc, 2026-current `main` | Client verification model: hash the bytes received and compare, the basis for "never re-serialize before hashing" (§4, §11). |
| [reproducible-builds.org — Archives](https://reproducible-builds.org/docs/archives/) | Prior-art guidance site, primary for this subdomain | Living doc | Concrete tar normalization flags (`--sort=name`, `--mtime`, `--owner/--group`, `--numeric-owner`, PAX header suppression) directly applicable to OCI layer construction (§11). |
| [reproducible-builds.org — SOURCE_DATE_EPOCH spec](https://reproducible-builds.org/specs/source-date-epoch/) | Formal specification | Living doc | Standard mechanism for eliminating embedded "now" timestamps from reproducible artifacts. |
| [docs.rs — serde_json::map::Map](https://docs.rs/serde_json/latest/serde_json/map/struct.Map.html) | Crate API docs, primary | Current (`latest`) | The counter-intuitive default: `BTreeMap`-backed (sorted) unless `preserve_order` is enabled, which then gives insertion order, not sorted order (§2). |
| [doc.rust-lang.org — std::collections::HashMap](https://doc.rust-lang.org/std/collections/struct.HashMap.html) | Std library docs, primary | Current (stable channel) | Authoritative statement that iteration order is "arbitrary," per-instance-random-seeded (SipHash + `RandomState`), explicitly for HashDoS resistance (§1). |
| [docs.rs — indexmap](https://docs.rs/indexmap/latest/indexmap/) | Crate API docs, primary | Current (`latest`) | Confirms `IndexMap`/`IndexSet` guarantee insertion order (not sorted), and that serde serialization preserves that order (§3). |
| [docs.rs — hex](https://docs.rs/hex/latest/hex/) | Crate API docs, primary | Current (`latest`) | `encode` (lowercase) vs `encode_upper`, the two functions that make case a call-site choice rather than a spec-enforced constant (§8). |
| [docs.rs — base64](https://docs.rs/base64/latest/base64/) | Crate API docs, primary | Current (`latest`) | Alphabet/padding are explicit `Engine` choices, not one universal default — relevant if this project ever base64-encodes anything digest-adjacent. |
| [docs.rs — sha2](https://docs.rs/sha2/latest/sha2/) | Crate API docs, primary | Current (`latest`) | `Digest` trait pattern (`new`/`update`/`finalize`) and fixed-size `GenericArray` output, the basis for the `[u8; 32]` newtype recommendation (§9). |
| [docs.rs — subtle](https://docs.rs/subtle/latest/subtle/) | Crate API docs, primary | Current (`latest`) | `ConstantTimeEq`'s actual scope and its own "best-effort" caveat about compiler optimizations — grounds the secret-vs-public-digest distinction in §10. |
| [serde.rs — field attributes](https://serde.rs/field-attrs.html) | Official serde guide, primary | Current | `skip_serializing_if`/`default` are opt-in per field — the mechanism behind the omit-vs-null canonicalization decision in §6. |

