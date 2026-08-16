---
title: "Security: unsafe, supply chain, and application hardening"
topic: security
model: opus
consolidates:
  - .agents/research/rust-security/unsafe-and-memory-safety.md
  - .agents/research/rust-security/supply-chain-security.md
  - .agents/research/rust-security/application-hardening.md
  - .agents/research/rust-security/terminal-injection-and-untrusted-text.md
  - .agents/research/ocx-codebase-audit/errors-async-security.md
  - .agents/research/ocx-codebase-audit/rules-inventory.md
date: 2026-08
revised: 2026-08
---

# Security: unsafe, supply chain, and application hardening

## Verdict

OCX and grim download, verify, extract and execute third-party artifacts from a registry
we do not control. The threat model is therefore **malicious registry content**, not
"someone might typo a config key". Every rule below is ordered by that.

1. **Memory safety is a solved problem here and we keep it solved by policy, not by care.**
   `unsafe_code = "forbid"` at the crate level everywhere; the only exemptions are crates
   with a named, documented FFI reason (today: `ocx_shim`'s WinAPI job objects). grimoire
   already proves this is achievable at 199 files and zero `unsafe` blocks
   (`grimoire/Cargo.toml:79`).
2. **The unsafe sub-researcher's full toolchain menu is over-scoped for this project.** Kani,
   sanitizers, cargo-geiger, Tree-Borrows tuning: all real, none earn their CI minutes on a
   codebase whose unsafe surface is ~75 WinAPI/`libc` call sites. Miri is kept, narrowly, only
   for crates that actually contain `unsafe` — and even then only their pure-logic tests, since
   Miri cannot execute the syscalls that constitute most of our test surface.
3. **Containment is enforced by the OS resolver, not by a string comparison.** The
   application-hardening researcher and the codebase audit collide here and the collision is
   resolved by *provenance of the path*: registry-supplied archive entries get a
   directory-handle-relative resolver (`cap-std`/`openat2`); locally-authored trees may keep
   canonicalize-and-compare **only** with an inline residual-risk comment naming CWE-367, the
   shape `grimoire/src/path_safety.rs:1-52` already ships.
4. **Authenticity and containment are orthogonal and both are mandatory.** A correctly signed
   archive can still carry `../../.ssh/authorized_keys`. Digest verification does not license
   a relaxed extractor, and a hardened extractor does not license skipping the digest.
5. **`overflow-checks = true` in release, despite the debate.** The contested argument against
   it (a panic becomes a DoS) applies to daemons; we ship a CLI where a crash is a rejected
   input, not an outage. The flag is a safety net *behind* explicit `checked_*` arithmetic at
   every point an attacker-declared size or offset is combined — not a substitute for it.
6. **One advisory gate, not two.** `cargo deny check` is authoritative; `cargo audit` survives
   only in its non-overlapping role — `cargo audit bin` against a shipped release artifact.
   Running both against the same RustSec database produces two differently-worded alerts for
   one fact and trains everyone to ignore both.
7. **We do not verify signatures, and we say so.** `sigstore-rs` is self-declared
   experimental; no cosign path exists in any of the three codebases. The commitment is the
   inverse one: never document a control we do not ship. grimoire's `quality-security.md`
   already models this ("No signature verification exists… Do not audit for it and never claim
   it"); ocx's copy still claims "manifest signature validation" it does not have. Provenance
   for artifacts *we publish* is a separate, cheap, mandatory thing: GitHub attestations.
8. **Terminal output is an attack surface, and the boundary is *render*, not ingest.** Every
   string we print quotes names read off wire documents. The follow-up round settled the
   question the first pass left open: sanitize at the render boundary — the single function
   permitted to touch stdout/stderr/the ratatui buffer — and enforce it with a type the raw
   registry struct cannot bypass. Ingest-time rejection is optional defence in depth, never
   the load-bearing control, because a second data path (a cache read, a TUI widget reading a
   different field) routes around it; this is exactly how the Oh My Posh fix was shipped
   ([GHSA-fwjx-9p69-h25h](https://github.com/advisories/GHSA-fwjx-9p69-h25h) — "applying the
   filtering already used for console titles"). Logs count too
   ([RUSTSEC-2025-0055](https://rustsec.org/advisories/RUSTSEC-2025-0055.html),
   [CVE-2025-55193](https://github.com/advisories/GHSA-76r7-hhxj-r776)).
9. **ratatui is not a sanitization boundary, and grim's 7,563-LOC TUI is the largest exposed
   surface in the family.** `Buffer::set_stringn` filters graphemes containing
   `char::is_control`, which does neutralize a bare ESC on that one path — but
   `Cell::set_symbol()` is unfiltered and the crossterm backend writes
   `Print(cell.symbol())` verbatim ([ratatui-core/src/buffer/buffer.rs](https://github.com/ratatui/ratatui/blob/main/ratatui-core/src/buffer/buffer.rs),
   [ratatui-crossterm/src/lib.rs](https://github.com/ratatui/ratatui/blob/main/ratatui-crossterm/src/lib.rs)).
   "We use ratatui, so escapes can't reach the terminal" is empirically false and must not
   stand in review.

## The ruleset

Verification commands assume repo root. `MUST` = blocks merge. `SHOULD` = blocks merge absent
a written exception. `CONSIDER` = raise in review.

### Unsafe and memory safety

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SEC-01 | Set `unsafe_code = "forbid"` in `[lints.rust]` of every crate; exempt a crate only with a comment in its `Cargo.toml` naming the specific FFI/platform API that requires it. | `forbid` (unlike `deny`) cannot be re-enabled by a downstream `#[allow]`; our business logic — OCI HTTP, tar, JSON — is fully served by safe crates ([lint levels](https://doc.rust-lang.org/rustc/lints/levels.html)). | `grep -L 'unsafe_code' $(git ls-files '*/Cargo.toml' Cargo.toml)` | MUST |
| SEC-02 | Precede every `unsafe {}` block with a `// SAFETY:` comment naming the invariant that makes it sound, and give every `unsafe fn` a `# Safety` doc section. A comment that restates the operation ("SAFETY: dereferences the pointer") is a failed review, not a pass. | Unsafe is only as sound as its stated reasoning; Clippy checks presence, a human checks content. | `cargo clippy -- -D clippy::undocumented_unsafe_blocks -D clippy::missing_safety_doc` | MUST (new code) / backfill existing |
| SEC-03 | Never call `mem::uninitialized`, `mem::zeroed`, or `mem::transmute` to reinterpret bytes. Use `from_ne_bytes`/`from_le_bytes`, an explicit constructor, or `TryFrom` for discriminants. | `mem::uninitialized` on a generic `T` is the literal [RUSTSEC-2018-0018](https://rustsec.org/advisories/RUSTSEC-2018-0018.html) smallvec bug; an out-of-range enum discriminant is instant UB, not a wrong value ([type layout](https://doc.rust-lang.org/reference/type-layout.html#the-c-repr)). | `grep -rn 'mem::uninitialized\|mem::zeroed\|transmute' --include=*.rs` returns nothing | MUST |
| SEC-04 | Any `extern "C"` function we export (not functions we call) wraps its body in `std::panic::catch_unwind` and returns an error code. | Unwinding a Rust panic across the default `"C"` ABI is UB ([catch_unwind docs](https://doc.rust-lang.org/std/panic/fn.catch_unwind.html)). Applies to `ocx_shim`, not to `Command::new` (separate process, no shared stack). | `grep -rn 'extern "C" fn' --include=*.rs`, each hit has a `catch_unwind` | MUST |
| SEC-05 | Call `env::set_var`/`remove_var` only in test code, under a documented single-owning-test convention. Never in a production path. | Mutating the process env races every thread reading it — the root cause of CVE-2020-26235, now codified by edition 2024 making both `unsafe fn` ([edition guide](https://doc.rust-lang.org/edition-guide/rust-2024/newly-unsafe-functions.html)). | `grep -rn 'env::set_var\|env::remove_var' --include=*.rs`, every hit under `#[cfg(test)]` | MUST |
| SEC-06 | Run `cargo +nightly miri test` in CI for the pure-logic modules of any crate that contains `unsafe`. Do not run it repo-wide. | Miri catches exactly the UB classes behind real RustSec advisories, but cannot execute syscalls or FFI — most of our tests are unrunnable under it ([Miri](https://github.com/rust-lang/miri)). | CI job exists and exits 0 for the named crates | SHOULD |

### Archive extraction and filesystem

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SEC-07 | Pin explicit version floors `tar >= 0.4.45` and `zip >= 2.3.0` in `Cargo.toml`, not "latest compatible". | Both crates shipped symlink-driven escapes in their *documented-safe* entry points: [RUSTSEC-2021-0080](https://rustsec.org/advisories/RUSTSEC-2021-0080.html), [RUSTSEC-2026-0067](https://rustsec.org/advisories/RUSTSEC-2026-0067.html), [CVE-2025-29787](https://github.com/advisories/GHSA-94vh-gphv-8pm8). | `cargo tree -i tar -i zip` | MUST |
| SEC-08 | The extraction loop matches on entry type and rejects — not skips — symlinks, hardlinks, device nodes, and any entry with `mode & 0o6000` set, unless a documented requirement says otherwise. | Every extraction CVE cited above abused a non-regular entry type; rejection is visible in logs, skipping is silent. | Extraction loop has an explicit `EntryType` match arm with an error branch | MUST |
| SEC-09 | Enforce max entry count, max per-entry decompressed bytes, and max cumulative decompressed bytes **while streaming**, counting bytes actually written — never the header's declared size. | Neither `tar` nor `zip` bounds decompression; declared sizes are attacker-controlled ([zip bomb](https://en.wikipedia.org/wiki/Zip_bomb), ~1032:1 single-layer DEFLATE). | Counting-reader wrapper present, not bare `read_to_end`/`unpack`; a bomb fixture test fails fast | MUST |
| SEC-10 | Registry-supplied archive entries are written through a directory-handle-relative resolver (`cap-std::fs::Dir` / `openat2` with `RESOLVE_BENEATH`). `canonicalize()` + `starts_with` is acceptable only for locally-authored trees and only with an inline comment naming the residual TOCTOU window (CWE-367) and the condition that would require closing it. | Canonicalize-then-open is a race the OS resolver eliminates per-syscall ([cap-std](https://github.com/bytecodealliance/cap-std/blob/main/README.md)). The exemption is real: `grimoire/src/path_safety.rs:1-52` documents exactly this trade for a publish path that trusts the local operator. | `grep -rn 'canonicalize' --include=*.rs`; each hit used as a containment check has the residual-risk comment or a `Dir` handle | MUST |
| SEC-11 | Create every download/extraction temp file via `tempfile::NamedTempFile`/`Builder` and land it with `.persist()`; never `format!("{}.tmp", …)` in a shared directory. | Predictable temp names in a shared directory are a symlink-race target; `tempfile` gives atomic creation, entropy, and private-by-default permissions ([tempfile docs](https://docs.rs/tempfile/latest/tempfile/)). | `grep -rn '\.tmp"' --include=*.rs` | MUST |
| SEC-12 | Set `0600` on credential/lock files and `0700` on their directories explicitly at creation (`OpenOptionsExt::mode`), never via ambient umask. | umask is uncontrolled host state and is legitimately `0022` on many machines. | `grep -rn '0o600\|0o700' --include=*.rs` co-located with credential writes | MUST |
| SEC-13 | Track already-extracted entry names case-insensitively and NFC-normalized; reject collisions rather than overwriting. | Windows NTFS and default macOS APFS collapse `FOO/bar` and `foo/bar`, letting a later entry write through an earlier entry's symlink ([USENIX FAST'23](https://www.usenix.org/system/files/fast23-basu.pdf)). | Extraction state carries a normalized seen-set | CONSIDER |

### Network, TLS, and content trust

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SEC-14 | Use `rustls`; ban `openssl`, `openssl-sys` and `native-tls` in `deny.toml`. Merge compiled-in roots as *extra* roots, never as a replacement, so `SSL_CERT_FILE`/`SSL_CERT_DIR` keep working. | rustup itself deprecated `native-tls` in 1.28.2 ([announcement](https://blog.rust-lang.org/2025/05/05/Rustup-1.28.2/)); embedded-roots-only breaks every corporate MITM proxy — `grimoire/src/tls.rs`'s `tls_certs_merge` is the reference. | `cargo tree -i openssl-sys -i native-tls` empty; `deny.toml` `[bans]` lists them | MUST |
| SEC-15 | Never construct an HTTP client with certificate verification disabled, including behind a test-only feature flag. | `danger_accept_invalid_certs` and always-accept `ServerCertVerifier` impls survive into production behind flags nobody audits. | `grep -rn 'danger_accept_invalid\|accept_invalid_hostnames\|impl.*ServerCertVerifier' src/` | MUST |
| SEC-16 | Every `reqwest::ClientBuilder` sets both `.timeout()` and `.connect_timeout()`; every subprocess or registry wait is wrapped in `tokio::time::timeout`. | reqwest sets **no** request timeout by default; a stalled upstream hangs the tool forever. | Every `ClientBuilder::new()` call site has `.timeout(` within its chain | MUST |
| SEC-17 | Bound response bodies while streaming (`bytes_stream()` + running counter). Never `.bytes()`/`.text()` on registry-sourced content. | `.bytes()` buffers the whole body before any size check can run — OOM before rejection. | `grep -rn '\.bytes()\.await\|\.text()\.await' --include=*.rs` on registry paths | MUST |
| SEC-18 | Any host taken from a wire document or remote-controlled config is validated at **connect** time via a custom `reqwest::dns::Resolve` that re-checks every resolved address against loopback/private/link-local/metadata ranges, and re-validated on every redirect hop. | Hostname string matching loses to DNS rebinding; `ocx_lib/src/oci/ssrf.rs`'s `GuardedResolver` is the reference implementation and closes the resolve→connect window. | Client is built with a `.dns_resolver()` hook, not a pre-flight URL check | MUST |
| SEC-19 | Verify `Content-Length` against the descriptor's declared size *before* hashing, hash incrementally while streaming, and never re-open the verified artifact by path outside a tool-exclusive `0700` directory — carry the handle, or the quarantine dir, forward to extraction/exec. | OCI's [descriptor spec](https://github.com/opencontainers/image-spec/blob/main/descriptor.md) is explicit about size-before-hash; verify-then-reopen-by-path reintroduces the TOCTOU the digest was supposed to eliminate. | Hashing adapter wraps the same stream written to the cache target; no `File::open(path)` between verify and use | MUST |
| SEC-20 | Check the scope actually granted by an OCI bearer token; do not infer authorization from a 200 response. | The [token spec](https://distribution.github.io/distribution/spec/auth/token/) permits the server to silently intersect requested scope with actual permissions without erroring. | Token-acquisition code inspects returned scope or fails closed on the specific operation | SHOULD |

### Subprocess execution

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SEC-21 | Spawn any downloaded or verified binary by absolute, canonicalized path — never a bare name resolved through `PATH`. | A writable directory early in `PATH` silently substitutes the executed binary; `PATH` must not be in the trust chain for an artifact we just verified. | `grep -rn 'Command::new(' --include=*.rs`, flag bare-string targets on download paths | MUST |
| SEC-22 | Insert a literal `--` before the first untrusted positional argument, or validate the value does not begin with `-`. | `Command` never invokes a shell, so shell injection does not apply — but the *invoked program's* argv parser will happily read `-u./payload` as a flag (bundler CVE-2021-43809 class). | `grep -rn 'Command::new' --include=*.rs`, untrusted `.arg()` preceded by `.arg("--")` | MUST |
| SEC-23 | Every `tokio::process::Command` spawn of an extracted/untrusted binary sets `.kill_on_drop(true)` and wraps its wait in `tokio::time::timeout`, with an explicit `child.kill()` on elapse. | Dropping a Tokio `Child` leaves the process running; timeout elapsing does not terminate anything by itself ([tokio test](https://github.com/tokio-rs/tokio/blob/master/tokio/tests/process_kill_on_drop.rs)). | Each `tokio::process::Command::new` has a paired `.kill_on_drop(true)` | MUST |
| SEC-24 | After `env_clear()`, always set `PATH` explicitly. Never pass a secret via `.arg()` or an inherited env var — use stdin, an fd, or a `0600` file. | `execvp` falls back to a compiled-in `/bin:/usr/bin` rather than failing closed; `arg()` values are world-readable in `/proc/<pid>/cmdline` and `ps`. | `grep -rn 'env_clear()' --include=*.rs`, each with an adjacent `.env("PATH"` | MUST |

### Supply chain and build

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SEC-25 | `cargo deny check` is the single authoritative advisory gate, with `[sources] unknown-registry = "deny"` and `unknown-git = "deny"`, `unsound = "all"`, and `unmaintained = "workspace"`. Every `[advisories].ignore` entry carries an inline machine-checkable removal condition. | `[sources]` is the one line that stops a silent registry/git swap and is the section LLM-generated configs most often omit ([EmbarkStudios deny.toml](https://github.com/EmbarkStudios/cargo-deny/blob/main/deny.toml)). Gating on `unmaintained` at the same severity as `unsound` produces exactly the noise that gets the gate disabled. | `cargo deny check`; `grep -A3 '\[sources\]' deny.toml` | MUST |
| SEC-26 | Pass `--locked` to every `cargo build`, `cargo test` and `cargo install` in CI, release workflows, scripts and docs. | `cargo install` **ignores** the published `Cargo.lock` by default — the opposite of what everyone assumes ([cargo install docs](https://doc.rust-lang.org/cargo/commands/cargo-install.html)). | `grep -rn 'cargo \(build\|test\|install\)' .github/ scripts/ \| grep -v -- --locked` | MUST |
| SEC-27 | Pin every git dependency to `rev = "<full 40-char SHA>"`, never a branch or bare tag. Review any `[patch]` diff with the weight of a new dependency. | Git deps carry no checksum in `Cargo.lock`; a branch moves with zero `Cargo.toml` diff, and `[patch]` reroutes a trusted crate name graph-wide. | `grep -rn 'git = ' Cargo.toml */Cargo.toml \| grep -v 'rev = '` | MUST |
| SEC-28 | Read the source of `build.rs` and proc-macro crates before merging a dependency that ships one. A green `cargo deny` is not a substitute. | Both execute arbitrary code on the dev/CI machine at build time with full fs/network/env access — including CI secrets — before any runtime posture exists. `oncecell` ([RUSTSEC-2023-0101](https://rustsec.org/advisories/RUSTSEC-2023-0101)) did exactly this. Nothing in mainline cargo sandboxes it as of 2026. | PR adding a dep with `build.rs` or `proc-macro = true` shows evidence the file was opened | MUST |
| SEC-29 | Build releases with `cargo auditable build --release` and emit GitHub Artifact Attestations; document `gh attestation verify` in the release notes. | `cargo-auditable` embeds the resolved dependency tree in the binary so a shipped artifact is scannable without source; attestations give SLSA Build L2 free on hosted runners ([cargo-auditable](https://github.com/rust-secure-code/cargo-auditable), [GitHub docs](https://docs.github.com/en/actions/concepts/security/artifact-attestations)). | `cargo audit bin <artifact>` returns dependency data; `gh attestation verify` passes | SHOULD |
| SEC-30 | Set `[profile.release] overflow-checks = true` in the workspace root, and use `checked_*`/`saturating_*` explicitly wherever an attacker-declared length or offset is combined with another value. | Release default is `false` ([cargo profiles](https://doc.rust-lang.org/cargo/reference/profiles.html#overflow-checks)) — a size check that should reject a wrapped value silently accepts it in the exact binary users run. The flag is the net; explicit checked arithmetic is the control. | `grep -A3 '\[profile.release\]' Cargo.toml`; `cargo clippy -- -W clippy::arithmetic_side_effects` on size-handling modules | MUST |

### Output and claims

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SEC-31 | Sanitize **all** registry-sourced text at the render boundary — the rendered error chain at the top-level stderr exit, every log line, and every string entering the TUI — through one sanitizer function, and make the raw deserialized type unable to reach a write call without passing through it (a `SafeDisplay`-style newtype). Pin it with a structural regression test that reads the boundary file's own source. | *Broadened 2026-08 (was: error chain at the stderr boundary only).* The render boundary is the only point every path is structurally forced through; ingest-time sanitization is bypassed by the next data path added ([CWE-150](https://cwe.mitre.org/data/definitions/150.html), and how the Oh My Posh and Rails fixes were actually shipped). Logs are the same boundary: [RUSTSEC-2025-0055](https://rustsec.org/advisories/RUSTSEC-2025-0055.html) is `tracing-subscriber` passing `\n`, `\r`, NUL and the whole `Cf` bidi set to the terminal. The defect mode is a *missing* call, which no behavioural assertion catches — hence the structural test. | Boundary file calls the sanitizer; the self-reading test exists; a `#[test]` greps for `println!`/`eprintln!`/`write!(…stdout`/`Span::raw`/`Line::from` fed a raw registry-response field and asserts zero matches | MUST |
| SEC-32 | Never document, claim, or write an audit checklist entry for a security control that does not exist in shipped code. When a control is removed or was never built, say so explicitly in the doc. | "A stale checklist entry is worse than a missing one: it gets repeated into a public document as a control that does not exist" — grimoire's own `quality-security.md`. Signature verification is the live example. | Review: every control named in security docs resolves to a module/function | MUST |
| SEC-33 | Wrap credentials in `secrecy::SecretString` and never claim more than it provides: it stops `Debug`/`Display` leaks, use-after-drop, and accidental copy-out. It does **not** provide `mlock`, swap protection, or defence against a memory dump or attached debugger. | Over-claiming the property is how the argv/env/log leak vectors it does not cover get skipped ([secrecy docs](https://docs.rs/secrecy/latest/secrecy/)). | `grep -rn 'expose_secret()' --include=*.rs`; verify no exposed value flows into `Command::arg`, `format!`, or a log macro | SHOULD |

### Terminal rendering of untrusted text

Added 2026-08 from the terminal-injection follow-up round. These implement SEC-31's boundary;
they are not alternatives to it.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SEC-34 | The sanitizer strips with a real VT state machine — `strip-ansi-escapes` (`vte`-backed, the parser Alacritty uses) or `console::strip_ansi_codes` — never a hand-rolled `ESC\[[0-9;]*m` regex. Where the boundary can afford it, follow the strip with a printable-plus-`\n`/`\t` allowlist. | An SGR-only regex misses OSC and DCS entirely; `console`'s parser explicitly handles the tmux DCS-passthrough wrapper `\x1bPtmux;…`, a documented smuggling bypass against naive strippers ([console/src/ansi.rs](https://github.com/console-rs/console/blob/master/src/ansi.rs)). CWE-150's own mitigation text prefers an allowlist over a denylist for exactly this reason. | `cargo tree -e normal \| grep -E 'strip-ansi-escapes\|^console '`; `grep -rn '\\\\x1b\\[' --include=*.rs` outside test fixtures returns nothing | MUST |
| SEC-35 | Strip before truncating. Never truncate a raw string and strip afterwards. | Truncating raw text bisects a live CSI/OSC/DCS sequence, leaving a dangling unterminated escape whose resync behaviour varies by terminal — the following unrelated field becomes its continuation parameters. Stripping afterwards leaves the now-malformed fragment's printable tail behind. | The strip call appears textually before any `.graphemes(`/width truncation on the same value; a unit test on a string whose `\x1b[38;5;196m` straddles the cut asserts no `\x1b` and no `[`+digits fragment survives | MUST |
| SEC-36 | Truncate on grapheme cluster boundaries by measured display width (`unicode-segmentation::graphemes(true)` + `unicode-width`, or `console::truncate_str`) — never `.len()`, `.chars().take(n)`, or byte slicing. | `.len()`/`chars().count()` are not terminal column width; byte slicing panics on a non-char boundary and char slicing orphans combining marks and ZWJ sequences, corrupting both the string and the column math the TUI's layout depends on ([UAX #11](https://docs.rs/unicode-width/latest/unicode_width/), [UAX #29](https://docs.rs/unicode-segmentation/latest/unicode_segmentation/)). | `rg '\.chars\(\)\.take\(\|&\w+\[\.\.' --include=*.rs` — no hit takes a registry-sourced value | MUST |
| SEC-37 | The sanitizer rejects or strips bidi override codepoints (U+202A–U+202E, U+2066–U+2069) in runtime strings. Do not cite rustc's `text_direction_codepoint_in_{comment,literal}` as coverage. | Both rustc lints are deny-by-default but run at lex time over *source literals*; a bidi override deserialized from a registry JSON response never passes the lexer ([rustc deny-by-default lints](https://doc.rust-lang.org/rustc/lints/listing/deny-by-default.html), [Trojan Source / CVE-2021-42574](https://trojansource.codes/)). No clippy lint fills the runtime gap. | Sanitizer unit test asserts `\u{202E}` is removed or the input rejected | MUST |
| SEC-38 | Sanitize before any string reaches a ratatui `Cell`, `Span`, `Line`, list item, table cell, or widget title/border — and before any `eprintln!`/raw write issued from inside the TUI event loop. "It goes through ratatui" is not an argument. | `Buffer::set_stringn` drops grapheme clusters containing `char::is_control`, which is real but scoped to that one call path; `Cell::set_symbol()` is unfiltered and the crossterm backend writes `Print(cell.symbol())` verbatim ([buffer.rs](https://github.com/ratatui/ratatui/blob/main/ratatui-core/src/buffer/buffer.rs), [ratatui-crossterm/src/lib.rs](https://github.com/ratatui/ratatui/blob/main/ratatui-crossterm/src/lib.rs)). Its own `control_sequence_rendered_full` test shows `\x1b[0;36m` surviving as the literal text `[0;36m` — the ESC byte alone was dropped. | `rg 'set_symbol\(' --include=*.rs` outside the ratatui dependency — every hit sits downstream of our sanitizer; a regression test renders each custom widget from a `\x1b[31m`-bearing string and asserts no cell symbol contains `\x1b` | MUST |
| SEC-39 | Never interpolate registry-sourced text into an OSC 8 hyperlink URI or an OSC 52 clipboard payload. | OSC 8's canonical spec declines to give application-side guidance and defers all mitigation to terminal emulators ([egmontkob gist](https://gist.github.com/egmontkob/eb114294efbcd5adb1944c9f3cb5feda)); OSC 52 lets any process writing to the terminal set the system clipboard, which is why tmux restricts it by default ([tmux Clipboard wiki](https://github.com/tmux/tmux/wiki/Clipboard)). | `grep -rn '\\x1b]8;\|\\x1b]52;' --include=*.rs`; each construction site interpolates only tool-generated values | MUST |
| SEC-40 | When forwarding a child process's output, decide colour preservation by TTY detection (`anstream`) and decide sanitization by that child's own trust model. The presence of ANSI bytes is not evidence the stream is safe. | The child is frequently relaying a further-upstream untrusted source (a remote build log, a manifest field) and carries the same CWE-150 payloads. `anstream::StripStream` strips only when the destination is *not* colour-capable — backwards for a security boundary, since the colour-capable terminal is the vulnerable one ([anstream docs](https://docs.rs/anstream/latest/anstream/)). | Every pass-through site has a comment naming the upstream source feeding that child and why it is or is not trusted; untrusted ones route through the SEC-31 sanitizer | SHOULD |
| SEC-41 | Use `unicode-security` (UTS #39 `skeleton()`, `MixedScript`) only at identity decisions — name-collision warnings, "did you mean" — never as the terminal sanitizer. | Confusables are two byte strings that look identical; escape injection is one byte string that is not what it displays as. Conflating them leaves one class unaddressed ([UTS #39](https://www.unicode.org/reports/tr39/)). | `grep -rn 'unicode_security' --include=*.rs`; each hit sits near a name-comparison function, not near a write | CONSIDER |
| SEC-42 | Pin `unicode-width` and `unicode-segmentation` to releases built against the same Unicode version, and re-diff their `UNICODE_VERSION` after any bump. | Width and grapheme-boundary decisions must agree; a version skew puts a boundary the caller trusted as safe to split in a different place than the width crate assumed when counting columns. | `cargo tree -i unicode-width -i unicode-segmentation` after a dependency bump; the reported Unicode versions match | CONSIDER |

## Applied to OCX

### Already satisfied

- **SEC-01/SEC-02 (partially), grimoire fully.** `grimoire` sets `unsafe_code = "forbid"`
  (`grimoire/Cargo.toml:79`) and has confirmed **zero** `unsafe` blocks across 199 files
  (audit §7). It also scopes `unwrap_used`/`expect_used = "warn"` to non-test code, and the
  production counts match (9 unwrap / 22 expect across 199 files).
- **SEC-11, SEC-12.** `tempfile`/`NamedTempFile` usage is universal and heavy (90 files
  ocx_lib / 70 grimoire / 52 ocx-mirror); atomic write-via-`persist`/`rename` is present in
  ocx_lib (31) and grimoire (19); explicit `0o600`/`0o700`/`set_permissions` appear 70×/35×/35×,
  co-located with credential and lock files (audit §6).
- **SEC-14.** `grimoire/src/tls.rs` uses `tls_certs_merge` (not `tls_certs_only`) precisely so
  `SSL_CERT_FILE`/`SSL_CERT_DIR` overrides keep working, with two regression tests pinning that
  the embedded set is non-empty and the DER→`reqwest::Certificate` projection is total
  (audit §7).
- **SEC-18.** `ocx_lib/src/oci/ssrf.rs` is the reference implementation this rule is written
  from: a `reqwest::dns::Resolve` hook (`GuardedResolver`) that re-validates every address the
  resolver returns at connect time, with `trusted_hosts` as a named per-registry escape hatch
  (audit §7). `ocx_lib/src/oci/ssrf.rs:38-68` also pairs `#[non_exhaustive] enum SsrfError`
  with a `ClassifyExitCode` impl.
- **SEC-19 (digest half).** `sha2`/`Sha256` is used across 65 ocx_lib / 47 grimoire / 19
  ocx-mirror files with dedicated digest-mismatch error variants in 25/8/4 files respectively —
  systematic, not ad hoc (audit §7).
- **SEC-08 (typed half).** `ocx_lib/src/archive/error.rs:26-29` names path-traversal-via-entry
  and symlink-escape as *distinct* error variants; grimoire's `install/materializer.rs` has an
  equivalent `MaterializeFailed` classification and a `safe_relative_path` zip-slip guard
  (audit §6, rules-inventory §2.5).
- **SEC-25.** `deny.toml` exists in all three repos with a shared `[advisories].ignore`
  convention where every ignored RUSTSEC ID carries an inline `REMOVE when 'cargo tree -i X' is
  empty` comment naming the exact removal condition (audit §7) — this rule was *derived* from
  the existing convention, not imposed on it.
- **BatBadBut (CVE-2024-24576 / CVE-2024-43402).** `rust-toolchain.toml` pins `1.95.0`
  identically across all three repos (audit §7), far past the 1.81.0 floor. No rule needed.
- **SEC-31 in ocx, error-chain half only.** `ocx_cli/src/main.rs:20-27` routes the rendered
  chain through `api::data::sanitize_for_terminal` (`ocx_cli/src/api/data.rs:164`) with an
  explicit CWE-150 comment, pinned by a structural regression test at
  `ocx_cli/src/main.rs:39-60` that greps `main.rs`'s own source for the sanitizer call. This
  satisfies the rule's original narrow scope and is the pattern the broadened SEC-31 extends;
  the type-level choke point and the log/TUI paths are not covered by it.

### Violated

- **SEC-31 in grimoire — HIGH.** `grimoire/src/main.rs:191` writes `{err:#}` straight to
  `io::stderr()` with no sanitization. `sanitize_for_terminal`-style helpers exist in grimoire
  but only inside TUI code (`tui/bundle_members.rs`, `tui/tree.rs`), not at the process exit
  boundary. grimoire pulls skill/package names from a registry exactly as ocx pulls index data —
  identical threat model, missing mitigation (audit smell #1). Under the broadened rule these
  two helpers are the wrong shape as well as the wrong place: per-widget coverage is precisely
  the divergence the render-boundary choke point exists to eliminate.
- **SEC-38 in grimoire — HIGH, and the largest single surface in the family.** `tui/render.rs`
  (3,729 LOC) and `tui/tree.rs` (3,397 LOC) render registry-sourced skill, bundle and package
  names. Whether any of that goes through `Cell::set_symbol` rather than `set_string` is
  unaudited; the two existing helpers prove sanitization is applied per-call-site, which is
  what SEC-38 forbids relying on.
- **SEC-02 — partial, needs backfill.** The ocx workspace has ~75 `unsafe` sites against ~50
  `// SAFETY:` comments; ocx-mirror/src has 46 against 31 (audit §7). That is 65–77% coverage —
  a hard gate today fails on 25–35% of existing sites. Backfill plan, not a day-one gate
  (audit smell #10). Concentrations are legitimate: `ocx_shim/src/main.rs` (~25 sites, WinAPI
  job-object process launching — the documented SEC-01 exemption),
  `ocx_lib/src/oci/host_capabilities.rs:888-921` (test-only env mutation),
  `ocx_lib/src/oci/index/file_transport.rs:1037-1049` (`libc::mkfifo`, test-only, cleanly
  commented).
- **SEC-16 in grimoire — MED.** `tokio::time::timeout` appears 22× in ocx_lib but only **2×** in
  grimoire, despite grimoire's network surface (registry fetches, OCI pulls) — unbounded-wait
  exposure to a slow or hostile registry (audit smell #5).
- **SEC-18 in grimoire and ocx-mirror — unconfirmed gap.** No SSRF module exists in either
  (audit §7). Whether that is a genuine gap depends on whether either dereferences a host taken
  from remote-controlled config the way ocx does; that is an open question below, not a
  confirmed violation.
- **SEC-32 in ocx — MED.** ocx's `quality-security.md` lists "manifest signature validation" as
  an active attack-surface checklist item; no cosign/sigstore implementation exists anywhere in
  any of the three codebases (audit smell #4, rules-inventory §2.5). grimoire's copy was
  corrected on 2026-07-26 to state the control does not exist; ocx's was not.
- **SEC-01 in ocx crates.** `ocx_cli` (0 unsafe), `ocx_schema` (0 unsafe) and `ocx_python` (1
  site) have no lint gate at all — the discipline is convention, not enforcement (audit §
  headline counts). Adding `forbid` to `ocx_cli` and `ocx_schema` is free today.

### New commitments

These have no existing implementation and are net-new work:

- **SEC-09** (streamed entry-count / per-entry / cumulative decompression caps). grimoire has a
  `CappedSink` for CWE-770 (rules-inventory §2.5) but there is no evidence of an entry-count or
  cumulative cap in either codebase.
- **SEC-10** (`cap-std`-scoped extraction for registry-supplied archives). Today both use the
  canonicalize-and-compare pattern. `grimoire/src/path_safety.rs:1-52` already carries the
  residual-risk doc comment the exemption requires; the *install* side
  (`install/path_anchor.rs::AnchoredPath::resolve`) is stricter still. The commitment is
  migration for registry-sourced extraction only, not a repo-wide rewrite.
- **SEC-13** (case/normalization collision rejection). No evidence of a normalized seen-set; and
  grimoire's Windows junction-point behaviour is flagged **unverified** — every escape test is
  `#[cfg(unix)]` (rules-inventory §2.5).
- **SEC-19 (handle-carry half).** Digest verification exists; carrying the verified handle
  rather than re-opening by path is unverified in both.
- **SEC-30** (`overflow-checks = true`). No evidence of the setting in any workspace root.
- **SEC-06** (Miri on unsafe-bearing crates). No Miri job exists.
- **SEC-29** (`cargo auditable` + attestations). Not present; the release workflows run
  cargo-audit/cargo-deny only.
- **SEC-34 through SEC-42** (terminal rendering). Net-new as *rules*; the audit did not cover
  this surface, so there is no evidence either way for `strip-ansi-escapes`, `console`,
  `unicode-security`, the Unicode-table crates, or a `SafeDisplay`-style newtype in any of the
  three codebases. Treat all nine as unaudited, not as satisfied. SEC-38 is the one to land
  first: it is the only rule covering grim's 7,563-LOC `tui/app.rs` and the four pure modules
  around it, and the only registry-fed TUI in the family.
- **SEC-21/22/23/24.** `Command::new` appears in all four crates (3–23 hits each) with no
  evidence of shell-string interpolation, but the audit explicitly did **not** verify per call
  site whether targets are absolute, whether `--` separators precede untrusted positionals, or
  whether `kill_on_drop` is set (audit §7). Treat as unaudited, not as satisfied.

## AI-agent failure modes

Ranked by how often an autonomous agent hits them on this codebase.

1. **Writes `archive.unpack(dest)?` / `archive.extract(dest)?` and considers extraction
   handled.** This is genuinely what every tutorial shows, and it was insufficient *in-version*
   across four separate CVEs. The agent will not add entry-type filtering, size caps, or a
   scoped directory unless told. Catches SEC-07/08/09/10.
2. **Produces `canonicalize()` then `starts_with()` as the containment check.** It is the top
   answer to "prevent path traversal in Rust" in general training material and reads as
   obviously correct. The agent will not surface the TOCTOU caveat. Catches SEC-10.
3. **Prints a registry field directly** — `println!("{}", pkg.name)`, `Line::from(pkg.description.clone())`
   — because in the training distribution almost every example `String` is safe. Any `String`
   reads as inherently displayable. Catches SEC-31.
4. **Truncates with `.chars().take(n)` or a byte slice to fit a column.** The single most
   reproduced "fit this to width" idiom, and it splits both grapheme clusters and escape
   sequences. Catches SEC-35/36.
5. **Argues "ratatui doesn't write raw bytes, it's a buffer, so the TUI is safe."** Confidently
   stated, plausible, and true only for the `set_string` path — not for `Cell::set_symbol` and
   not for the backend write. Catches SEC-38.
6. **Reasons "I used `Command::arg()`, not a shell string, therefore injection-safe" and
   stops.** True for shell injection, false for argument injection and false for `PATH`
   resolution of a binary we just downloaded. Catches SEC-21/22.
7. **Writes `cargo install foo` without `--locked`.** Counter-intuitive enough that the model
   reproduces the unpinned form by default — it assumes `cargo install` respects the published
   lockfile the way `cargo build` does. Catches SEC-26.
8. **Generates a `deny.toml` with `[sources]` absent.** It is the least obviously
   security-shaped of the four checks and most blog-post examples omit it, so the modal
   generated config silently drops the one line that blocks a registry swap. Catches SEC-25.
9. **Writes a plausible-looking `// SAFETY:` comment that restates the operation** ("SAFETY:
   this dereferences the pointer") rather than naming the invariant. Passes
   `clippy::undocumented_unsafe_blocks`, which only checks presence, while providing zero review
   value. Heuristic: any SAFETY comment under ~8 words, or that says "this is safe", fails.
   Catches SEC-02.
10. **Cites rustc's bidi lints as Trojan Source coverage.** `text_direction_codepoint_in_comment`
    and `_in_literal` are deny-by-default, which reads as "handled" — but they only ever see
    source literals, never a deserialized registry string. Catches SEC-37.
11. **Adds `Secret<String>` and marks secret-handling done.** Then either over-claims the
    property in a doc comment or leaves the argv/env/log leak vectors — the ones `secrecy` does
    not cover — untouched. Catches SEC-33.
12. **Adds `#[serde(deny_unknown_fields)]` when asked to "harden the parser against untrusted
    input".** It bounds nothing: not recursion depth, not collection size, not payload bytes, and
    it runs *after* recursive descent has already had its chance at the stack. Catches SEC-17.
13. **"Fixes" overflow with `as u64` / `as usize` truncating casts.** Looks like a fix, preserves
    the vulnerability exactly — it converts a debug-build panic into a release-build silent wrong
    value, which is precisely the state `overflow-checks = false` already had us in. Catches
    SEC-30.
14. **Writes an `ESC\[[0-9;]*m` regex when asked to strip ANSI.** It handles the colour codes
    the agent is picturing and silently passes OSC, DCS and the tmux passthrough wrapper.
    Catches SEC-34.
15. **Reaches for `native-tls`/`openssl` for a new HTTP client.** Training data predates the
    2025 rustls consolidation. Catches SEC-14.
16. **Reproduces `mem::uninitialized()`, `static mut` for globals, or an `unsafe fn` body with
    no inner `unsafe {}` block.** All three are the historically-modal pattern and all three are
    now deprecated, deny-by-default, or warn-by-default under edition 2024. Catches SEC-03.
17. **Claims a CI job passed because it generated the workflow YAML.** Miri, cargo-deny and
    attestation steps get written and never verified to actually execute and exit 0. Catches
    SEC-06/25/29.
18. **Presents nightly-gated flags (`-Ztrim-paths`, RFC 3127 scope syntax) as stable**, because
    the RFC discussion and the stabilization announcement have no clear temporal boundary in the
    model's memory.

One question flushes out failure modes 3, 5 and 14 at once: **ask the agent to name the single
function through which untrusted text reaches a terminal in the code it just touched.** More
than one name, or no name, means the SEC-31 choke point is not in place.

## Open questions

1. **Does grimoire or ocx-mirror dereference a host from remote-controlled config?** If yes,
   the absent SSRF module is a genuine HIGH gap; if no, it is correctly absent. Needs a direct
   trace of both codebases' URL construction, not a grep.
2. **Do we adopt sigstore verification, or commit to digest-only and document it?** The
   `sigstore-rs` crate is self-declared experimental and API-unstable; the ecosystem is not
   settled on whether an OCI-consuming CLI should require it. Digest verification is the
   non-negotiable baseline either way. This decision changes what SEC-32 requires ocx's docs to
   say.
3. **What are the actual numeric caps for SEC-09?** Max entry count, max per-entry bytes, max
   cumulative bytes, and whether a compression-ratio ceiling is worth the false-positive risk.
   These are product decisions about legitimate artifact sizes, not security research.
4. **Is `ocx_shim` the only permanent SEC-01 exemption?** `ocx-mirror/src` has 46 unsafe sites
   and `ocx_python` has 1 — both need a named justification or a removal plan before the lint
   goes in.
5. **SEC-02 backfill scope and deadline.** ~25 uncommented unsafe sites across the ocx workspace
   and ~15 in ocx-mirror. Grandfather with `#[allow]` and a tracking issue, or block until
   backfilled?
6. **Does `cap-std` adoption (SEC-10) justify the architectural change for existing extraction
   call sites, or only new ones?** It is not a drop-in for a codebase whose filesystem code is
   ambient-authority `std::fs` throughout.
7. **Windows junction points.** grimoire's own security doc flags `dunce::canonicalize`'s
   junction-point behaviour as unverified with every escape test `#[cfg(unix)]`. Someone needs
   to write the Windows test or accept the gap in writing.
8. **Trusted Publishing.** Do we publish anything to crates.io that should move off a stored
   `CARGO_REGISTRY_TOKEN`? Not answerable from the audit.
9. **Does ocx's existing `sanitize_for_terminal` satisfy SEC-34?** `ocx_cli/src/api/data.rs:164`
   is the family's only shipped sanitizer and the model for the broadened SEC-31, but whether
   it strips with a VT state machine or a hand-rolled regex — and whether it covers bidi
   (SEC-37) — was never read. If it is a regex, the reference implementation is itself the
   bypass. One file to open; do this before extending it to grimoire.

## Sub-artifacts

- [rust-security/unsafe-and-memory-safety.md](rust-security/unsafe-and-memory-safety.md) —
  unsafe hygiene and SAFETY conventions, edition-2024 lint changes (`unsafe_op_in_unsafe_fn`,
  `static_mut_refs`, newly-unsafe `env::set_var`), the Stacked/Tree Borrows aliasing models,
  UB patterns in safe-looking code, and the verification-tool ladder (Miri, cargo-careful,
  sanitizers, Kani) with FFI/ABI soundness.
- [rust-security/supply-chain-security.md](rust-security/supply-chain-security.md) —
  cargo-audit/deny/vet/crev compared, an annotated production `deny.toml`, lockfile and
  `--locked` policy, MSRV-aware resolution, dated crates.io malware incidents, build.rs and
  proc-macro build-time execution risk, reproducible builds, SBOM tooling, and SLSA/sigstore
  provenance for shipped binaries.
- [rust-security/application-hardening.md](rust-security/application-hardening.md) —
  the runtime threat model: archive-extraction escapes and decompression bombs, TOCTOU and
  capability-scoped filesystem access, subprocess argument injection and PATH poisoning,
  secret-handling boundaries, TLS/SSRF posture, OCI digest verification, and untrusted-input
  parsing limits.
- [rust-security/terminal-injection-and-untrusted-text.md](rust-security/terminal-injection-and-untrusted-text.md) —
  the 2026-08 follow-up round: CWE-150 and its 2025–2026 CVE stream in structurally identical
  tools (Soft Serve, Oh My Posh, Rails, `tracing-subscriber`), the query/response and OSC 52
  primitives, Trojan Source bidi at runtime vs. rustc's compile-time lints, the sanitizer crate
  landscape, strip-before-truncate and grapheme/width truncation, and a direct read of
  ratatui's `set_stringn` filter and crossterm backend write.
- [ocx-codebase-audit/errors-async-security.md](ocx-codebase-audit/errors-async-security.md) —
  the local evidence base: per-crate unsafe/unwrap counts, the SSRF and TLS reference
  implementations, filesystem and credential-permission discipline, and the ranked smell list
  this document's "Violated" section is built from.

## Key sources

| URL | What it settles |
|---|---|
| [OCI image-spec: descriptor.md](https://github.com/opencontainers/image-spec/blob/main/descriptor.md) | Normative size-before-hash and stream-don't-buffer digest verification language (SEC-19) |
| [RUSTSEC-2026-0067 — tar](https://rustsec.org/advisories/RUSTSEC-2026-0067.html) | The most recent `tar` symlink escape (`fs::metadata` follows symlinks); sets the 0.4.45 floor |
| [GHSA-94vh-gphv-8pm8 — zip CVE-2025-29787](https://github.com/advisories/GHSA-94vh-gphv-8pm8) | The `zip` escape past `enclosed_name()` sanitization; sets the 2.3.0 floor |
| [cap-std README](https://github.com/bytecodealliance/cap-std/blob/main/README.md) | `openat2`/`RESOLVE_BENEATH` capability semantics and platform fallbacks (SEC-10) |
| [std::process::Command docs](https://doc.rust-lang.org/std/process/struct.Command.html) | No-shell semantics, the Windows batch-file warning, and `env_clear`'s `PATH` fallback |
| [Rust advisory: CVE-2024-43402](https://blog.rust-lang.org/2024/09/04/cve-2024-43402/) | BatBadBut's incomplete first fix and the 1.81.0 toolchain floor |
| [Cargo Book: profiles reference](https://doc.rust-lang.org/cargo/reference/profiles.html#overflow-checks) | `overflow-checks` is `true` in dev/test and `false` in release (SEC-30) |
| [Cargo Book: cargo-install](https://doc.rust-lang.org/cargo/commands/cargo-install.html) | `cargo install` ignores the published lockfile without `--locked` (SEC-26) |
| [EmbarkStudios deny.toml](https://github.com/EmbarkStudios/cargo-deny/blob/main/deny.toml) | The production `deny.toml` shape to imitate, including `[sources]` (SEC-25) |
| [internals.rust-lang.org: sandbox build.rs and proc macros](https://internals.rust-lang.org/t/sandbox-build-rs-and-proc-macros/16345) | Confirms build-time code execution is an unresolved ecosystem gap, not a solved one (SEC-28) |
| [Rust Edition Guide: static-mut-references](https://doc.rust-lang.org/edition-guide/rust-2024/static-mut-references.html) | `static_mut_refs` deny-by-default and the replacement patterns |
| [rustc lint levels reference](https://doc.rust-lang.org/rustc/lints/levels.html) | Why `forbid` and not `deny` for `unsafe_code` (SEC-01) |
| [secrecy crate docs](https://docs.rs/secrecy/latest/secrecy/) | The crate's own statement of its no-`mlock`/no-swap boundary (SEC-33) |
| [Distribution token spec](https://distribution.github.io/distribution/spec/auth/token/) | Scope intersection without error — a 200 does not mean full scope granted (SEC-20) |
| [rustup 1.28.2 announcement](https://blog.rust-lang.org/2025/05/05/Rustup-1.28.2/) | Primary evidence for the 2025 ecosystem shift off `native-tls` (SEC-14) |
| [cargo-auditable](https://github.com/rust-secure-code/cargo-auditable) | Binary-embedded dependency tree, the right SBOM tool for shipped binaries (SEC-29) |
| [USENIX FAST'23: Unsafe at Any Copy](https://www.usenix.org/system/files/fast23-basu.pdf) | Cross-filesystem case/normalization collision research behind SEC-13 |
| [CWE-150](https://cwe.mitre.org/data/definitions/150.html) | The authoritative framing for terminal escape injection; its demonstrative example is an agent printing untrusted output to a terminal (SEC-31/34) |
| [RUSTSEC-2025-0055 — tracing-subscriber](https://rustsec.org/advisories/RUSTSEC-2025-0055.html) | The Rust-ecosystem precedent: logged user input poisoning terminals; proves logs are the same boundary as stderr (SEC-31) |
| [GHSA-fwjx-9p69-h25h — Oh My Posh](https://github.com/advisories/GHSA-fwjx-9p69-h25h) | The one-path-sanitizes/one-doesn't divergence and its fix — extend the existing choke point, don't add ingest validation (SEC-31) |
| [ratatui-core buffer.rs](https://github.com/ratatui/ratatui/blob/main/ratatui-core/src/buffer/buffer.rs) · [ratatui-crossterm lib.rs](https://github.com/ratatui/ratatui/blob/main/ratatui-crossterm/src/lib.rs) | Read directly: `set_stringn`'s `char::is_control` filter, and `Print(cell.symbol())` writing verbatim (SEC-38) |
| [console/src/ansi.rs](https://github.com/console-rs/console/blob/master/src/ansi.rs) | Verified grammar coverage — CSI/OSC/DCS plus the tmux passthrough wrapper a regex misses (SEC-34) |
| [trojansource.codes](https://trojansource.codes/) | CVE-2021-42574/-42694 mechanics; the source of the bidi codepoint set in SEC-37 |

## Revision log

### 2026-08 — terminal-injection follow-up round folded in

| Change | IDs | Why |
|---|---|---|
| **Broadened in place.** SEC-31 was "sanitize the rendered error chain at the stderr boundary". It is now "sanitize all registry-sourced text at the render boundary — error chain, logs, and every string entering the TUI — through one sanitizer, behind a type the raw deserialized struct cannot bypass". Verification gained the bypass-grep test. | SEC-31 | The follow-up round contradicted the original scope on two counts: logs are the same boundary ([RUSTSEC-2025-0055](https://rustsec.org/advisories/RUSTSEC-2025-0055.html), [CVE-2025-55193](https://github.com/advisories/GHSA-76r7-hhxj-r776)), and a boundary enforced by review rather than by type is bypassed by the next data path added — the Oh My Posh advisory is that exact failure and that exact fix. Meaning unchanged (sanitize where bytes leave the process); scope corrected. |
| **New rules.** Terminal rendering of untrusted text, a new subsection after "Output and claims". | SEC-34 (VT-parser stripper, not regex), SEC-35 (strip before truncate), SEC-36 (grapheme + width truncation), SEC-37 (runtime bidi overrides), SEC-38 (ratatui is not a boundary), SEC-39 (OSC 8 / OSC 52), SEC-40 (child pass-through trust model), SEC-41 (`unicode-security` scoping, CONSIDER), SEC-42 (Unicode-table version pinning, CONSIDER) | Nine distinct, separately-verifiable controls the first pass did not cover. SEC-38 is the load-bearing one for this family: grim ships a 7,563-LOC `tui/app.rs` fed by registry metadata, and ratatui's `set_stringn` filter — real but scoped to one call path — is the exact thing an agent will cite as proof it needn't sanitize. |
| **Verdict.** Old item 8 replaced by a new item 8 (render boundary, not ingest; logs in scope) and a new item 9 (ratatui is not a sanitization boundary). Items 1–7 unchanged. | — | The follow-up settled the ingest-vs-render question that the original item 8 left implicit, and the settled position is what the broadened SEC-31 rests on. |
| **Applied to OCX.** "Already satisfied" SEC-31 entry narrowed to "error-chain half only". "Violated" SEC-31/grimoire entry extended — the two TUI helpers are the wrong *shape*, not just the wrong place — and a new SEC-38/grimoire HIGH entry added. "New commitments" gained SEC-34–SEC-42 as unaudited. | SEC-31, SEC-38 | ocx's shipped sanitizer no longer fully satisfies the broadened rule; recording it as satisfied would have been the SEC-32 failure mode. |
| **Failure modes.** Three inserted into the ranking (print-a-registry-field, `.chars().take(n)` truncation, "ratatui is a buffer so it's safe") plus two lower down (bidi lints as coverage, SGR-only regex). List numbering shifted; rule IDs did not. | — | Ranked by frequency, and the first three are near-certain on any TUI or CLI-output task. |
| **Open questions.** Nothing removed — none of the eight was in the follow-up's scope. Added #9: does `ocx_cli/src/api/data.rs:164` satisfy SEC-34, or is the family's reference sanitizer a regex? | — | It is the implementation every other codebase is about to copy. One file to open. |
