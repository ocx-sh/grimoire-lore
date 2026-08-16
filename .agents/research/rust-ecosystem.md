---
title: The Rust Ecosystem — Crates of Record, Distribution, and Dependency Policy
topic: rust-ecosystem
phase: 5 (consolidation)
model: opus
date_consolidated: 2026-08-14
last_revised: 2026-08-14 (wave 5 — starlark, rmcp, provenance)
consolidates: 15 sub-artifacts under rust-ecosystem/, plus ecosystem-map.md
grounded_by: ocx @ HEAD, grimoire @ HEAD, ocx-mirror @ HEAD (all read 2026-08-14)
rule_prefix: ECO
---

# The Rust Ecosystem

Every version number below carries a date or an "as of" qualifier. An
unqualified version claim rots within a quarter, and this document is written
to be re-checked, not re-derived.

## Table of contents

1. [Verdict](#verdict)
2. [Crates of record](#crates-of-record)
3. [The ruleset](#the-ruleset)
4. [Applied to the codebase](#applied-to-the-codebase)
5. [Agent failure modes](#agent-failure-modes)
6. [Open questions](#open-questions)
7. [Sub-artifacts](#sub-artifacts)
8. [Key sources](#key-sources)
9. [Revision log](#revision-log)
10. [Promotion list for published rules](#promotion-list-for-published-rules)

## Verdict

The ecosystem axis produced fifteen dives and one scout. They agreed on more
than they disagreed on, but the disagreements are where the value is: in every
case the sub-researcher who read the actual tree beat the one who read the
registry prose, and in three cases a landscape scout's confident
recommendation was flatly wrong for this codebase. The positions below are
decisions, not options.

**Dependency liveness is verified by API, never by download count.** The
`crates.io` human URL is a client-rendered SPA that returns an empty shell to
any fetch tool; `crates.io/api/v1/crates/<name>` returns real JSON with
`updated_at`, `newest_version` and `description`. Download count measures the
installed base, not the pulse — `cargo-husky` has 3.23M lifetime downloads and
a last release of 2020-01-21. A recent release date is also not proof of life:
`bincode` 3.0.0 (2025-12-16) is a docs-only poison-pill release announcing
permanent cessation, confirmed independently by RUSTSEC-2025-0141.

**No `CryptoProvider::install_default()` call goes into production code.** The
crate-defaults scout said every rustls-using binary must call it or panic at
first handshake. The TLS dive read `reqwest` 0.13.4's own source and ran
`cargo tree -e features -i rustls` against both trees: reqwest never calls the
ambiguity-panicking function at all, and the `ring` in `Cargo.lock` is an
unreached optional dependency (`cargo tree -i ring --target all` prints
"nothing to print"). The invariant that actually needs enforcing is that
`rustls` never resolves with both provider features active — which EVO-10
already owns. Adding an `install_default()` call is not neutral: it succeeds at
most once per process, so it becomes a live footgun for any future test
harness that also wants to install one. **The TLS dive wins; it checked, the
scout inferred.**

**`cross` is rejected for structure, not staleness.** Two artifacts called it
stale (no crates.io release since 2023-02-04). The TLS dive checked further:
the GitHub repo pushed 2026-07-31 and its README now tells users to install
from git — it is alive. It is still the wrong tool, because its `docker/`
directory has no `apple-darwin` image at all (Apple SDK redistribution terms
forbid one) and only `-gnu` Windows images. Two of eight shipped triples and
the MSVC ABI are permanently out of reach. `cargo-zigbuild` + `cargo-xwin`
already cover everything. **Reject on the structural argument, which nobody can
refute by shipping a release; the staleness argument is refutable and
therefore weak.**

**The two tools' installers must not converge.** The scout called
`installers = []` on ocx versus `["shell", "powershell"]` on grimoire an
undocumented divergence. It is documented — in `adr_self_setup.md`, a file
`dist` has no reason to read. ocx is itself a package manager with a
content-addressable store; any installer that drops a loose binary on `PATH`
creates an install `ocx self update` cannot see or heal. grimoire has no CAS,
so dist's generated installer is a complete answer for it. The general rule
this yields is the CAS-ownership test, not a channel list: **a distribution
channel is admissible only if the tool it installs is not self-managed by that
tool's own store.** The same test rejects Homebrew for ocx and admits it for
grimoire.

**Self-update stays inside each tool's own OCI semantics.** `self_update`,
`axoupdater`, and dist's `install-updater = true` are all a
GitHub-release-checksum trust root distinct from — and weaker than — the
content-addressable digest chain both tools already run for every package they
manage. ocx's architect already ratified-rejected this on the exact ground that
two objects at one logical identity would carry different provenance proofs.
grimoire has no self-update command yet, so the guidance is prospective: when
it grows one, it is `grim self update` pulling through grimoire's own OCI
client.

**Vendor the fork, and pay for it with a ledger.** `[patch.crates-io]` is the
only correct mechanism (`[source] replace-with` requires content-identical
replacements and Cargo's own docs say so). But the cost is invisible in the
places people look: `Cargo.lock` records no `source` and no `checksum` for a
path-patched crate, so the gitlink SHA in the superproject is the only pin;
`cargo-cyclonedx` emits a `file://` qualifier that no downstream scanner keys
on, so the SBOM is indistinguishable from real upstream; and RustSec
structurally cannot cover a private fork's own 1,475 changed lines. **Keep the
forks — the changes are security hardening a package manager needs — and treat
every diff under `external/*/src/` as a security review, with a committed
upstreaming ledger.**

**One decoder per compression format.** ocx ships two XZ decoders in
production — pure-Rust `lzma_rust2::XzReader` on the local path and C
`liblzma` (via `async-compression`) on the registry pull path. The repo's
CVE-2025-31115 rationale for keeping `liblzma` is accurate but incomplete: it
scopes to the multithreaded decoder, and `GHSA-x872-m794-cxhv` is an
index-parsing overflow that runs on every stream regardless of thread count.
Consolidate on `lzma-rust2` by moving `SyncIoBridge` one layer earlier, then
make it a `deny.toml` fact. **zstd is the deliberate asymmetry**: no
equal-maturity pure-Rust decoder is in the graph, so its C dependency stays
until one is evaluated.

**`console` keeps rendering; the env chain gets one implementation.** The
terminal dive recommended keeping `console` and leaving `anstream` clap-
internal; the published CLI-07 says colour comes from `anstream`/`colorchoice`
and the env check is never hand-rolled. Both are partly right and both tools
currently violate CLI-07: ocx and grimoire independently hand-wrote the same
~80-line `NO_COLOR`/`CLICOLOR_FORCE`/`CLICOLOR`/`TERM=dumb` precedence chain in
two files with near-identical test sets. **Resolution: one shared resolver for
the family that delegates detection to `anstyle-query`/`colorchoice`, and
`console` stays for rendering and TTY primitives** — `Term::move_cursor_up`,
`strip_ansi_codes` and `truncate_str` have no one-for-one `anstream`
replacement, and SEC-34/SEC-36 already name two of them.

**Format-preserving writes need a verify gate, not just the right crate.**
DATA-FMT-10 already picks `toml_edit` for hand-authored files. What it does not
require is what makes ocx's `ocx.toml` editor actually trustworthy: reparse the
rendered output, assert it equals the intended mutation, and fail closed when
the editor cannot express the change. `grimoire.toml`'s writer has neither the
crate nor the gate — it is a hand-rolled `writeln!` re-emitter whose own doc
comment calls it "the lossy re-serialize".

**Credentials tier down, never up, and the keyring crate you remember no longer
exists.** The `keyring` crate split during 2026: `keyring-core` 1.0.0 shipped
2026-04-21 and `keyring` 4.1.6 (2026-08-01) is a legacy-compat wrapper, with
each OS backend now its own crate. The crate-defaults scout's "store
credentials via `keyring`" recommendation names the wrong crate and would also
be wrong about the default path — the Docker credential-helper tier already
inherits whatever the user configured, without storing anything new.

**`insta` stays unadopted, including for schema fixtures.** The config dive
proposed `cargo insta test` for pinning schemars output. The testing rules pin
`insta` as a deliberate non-adoption in two separate files. A committed
`.schema.json` plus `assert_eq!` covers it with no new dependency.

**The starlark siblings stay pinned; the reason on record was wrong.** ocx's
manifest says `starlark_syntax`/`starlark_map`/`starlark_derive` must be direct
dependencies to force resolver version-consistency behind a "sealed" supertrait.
Emptying all three from both manifests and running `cargo check -p ocx_lib`
compiles clean, and `cargo tree` still resolves all three at an identical
`0.13.0` transitively through `starlark`'s own manifest — Cargo's ordinary
unification already does that job. `allocative` is the opposite case and is
genuinely required: `StarlarkValue`'s real supertrait bound is
`allocative::Allocative`, and Rust cannot name a trait from a crate that is not
a direct dependency of the crate writing the `impl`. What survives is a weaker,
real argument: `facebook/starlark-rust` publishes all four crates from one
workspace in one pass and states in its own README that it does not aim for API
stability between releases, so the exact pins are deliberate audit-visibility
discipline, not a compile requirement. **ECO-42's mechanism claim is corrected
in place and ECO-44 writes the carve-out; the published ECO-07 in
`crates-of-record.md` still says "delete it" and needs the same clause.**

**An in-process interpreter is a parser, not a sandbox — the crate says so
itself.** starlark 0.13.0's `Evaluator` exposes exactly one resource limit
(`set_max_callstack_size`); `set_max_heap_size`, `set_max_tick_count` and
`set_check_cancelled` did not exist until 0.14.0 (2026-05-22), roughly
seventeen months after ocx's pin, and ocx's `script.rs` already documents the
resulting unbounded-pure-compute hang as an "ACCEPTED v1 LIMITATION". The
crate's own current docs for those new methods say verbatim that starlark-rust
"should in general not be considered secure against truly malicious code… Use
OS-level APIs in a subprocess if you want that" — and ocx evaluates in-process.
The corollary is where a reviewer should start: Starlark the language and every
enabled `LibraryExtension` are I/O-free by construction, so **every capability a
`.star` script has comes from ocx's own `ocx_module.rs`, whose `ocx.run` spawns
an OS-unconfined subprocess.** The interpreter's changelog is the wrong file to
audit; the host-function module is the right one.

**rmcp is the right crate and the wrong boundary.** Five GHSA advisories exist
against it; all five are Streamable-HTTP-transport or OAuth-scoped, and grimoire
compiles neither feature — the stdio-only pin is the control, not luck. The
protocol-revision gap resolves clean too: rmcp's `ProtocolVersion::LATEST` is
one revision behind the spec's current `2026-07-28`, but `ServerHandler`'s
*default* `discover()` makes any inheriting server Dual-era, and the spec's own
compatibility matrix has no failing row for a Dual-era server against any client
era. What does not resolve: `to_json` is a bare `serde_json::to_string` over
registry text its own docs call "full and untruncated", while the MCP
`2026-07-28` `server/tools` page states servers **MUST** "Sanitize tool
outputs." grimoire already ships the sanitizer — `sanitize_member_label`, the
SEC-34/36/37 implementation — and simply never calls it on the MCP path.
**A spec-level MUST violated by a missing call site, not a missing capability.**

**Signature verification stays deferred — and the deferral becomes a written
decision instead of a gap.** `sigstore-rs` is adoptable for bare cosign-style
signature verification with two known fixes (`default-features = false, features
= ["cosign", "rustls-tls"]`, because its default is `native-tls`; and folding its
`oci-client = "0.17"` requirement into the ECO-13 fork-compatibility check). It
is **not** adoptable for what matters most: its own README says it "does not
handle verification of attestations yet" — the in-toto/DSSE envelope SLSA, PEP
740 and npm provenance all use — and that it will not be stable before 1.0,
having shipped a breaking change in its latest release. Two structural facts pin
the sequencing when it is picked up: ghcr.io returns `404 MANIFEST_UNKNOWN` for
the OCI 1.1 referrers endpoint against a confirmed-existing manifest digest
(probed live 2026-08-14), so the design target is GitHub's Attestations API; and
**a CI-only check is theatre for a consumer** — it proves what the project
shipped, not what a user's `install` received. ocx's `shim.rs` calls
`gh attestation verify` "the real provenance control" while CI only *generates*
the attestation and the verify is a human PR-checklist item: a live SEC-32
violation sitting inside the very feature that would fix it.

**blake3, camino and jiff stay out.** All three were scout recommendations that
collide with already-pinned decisions (`performance.md`: "No mmap, no BLAKE3";
`platform-and-paths.md`: "Pinned: camino is not adopted"; PLAT-30: exactly one
datetime crate).

## Crates of record

One row per job the OCX family actually has. Version lines are as of 2026-08
unless a specific date is given. "Displaces" names what an agent is likely to
reach for instead, and why it is wrong here.

| Job | Crate | Version line as of 2026-08 | Why this one | What it displaces |
|---|---|---|---|---|
| CLI parsing | `clap` (derive) + `clap_complete` | 4.6.6 (Aug 2026); `clap_builder` 4.6.2 | Unchallenged; already links `anstream`/`anstyle` for its own help rendering | `structopt` — folded into clap 3, own docs say "maintenance mode", last release 2022-01-18 |
| Error types | `thiserror` (libs) + `anyhow` (binary boundary) | thiserror 2.0.18 in tree | The lib/binary split the error rules already enforce; thiserror 2 requires a direct dependency per deriving crate | `error-chain`, `failure` (long dead), `miette`/`eyre`/`snafu` (a third presentation layer over rules that already own presentation) |
| Async runtime | `tokio`, `features = ["full"]` | 1.53.1 (Jul 2026); 1.52 pinned in tree | Load-bearing for hyper/reqwest; nothing else is a real option here | `async-std` — its own crates.io `description` reads "Deprecated in favor of `smol`"; `smol` would be a second runtime |
| HTTP client | `reqwest`, `default-features = false, features = ["rustls"]` | 0.13.x (0.13.4 vendored) | The feature pin is load-bearing, not boilerplate: it is what keeps exactly one crypto provider in the graph | `ureq` (still sync-only by design after the 3.0 rewrite), raw `hyper` 1.x (no high-level `Client` since 1.0) |
| TLS | `rustls` + `rustls-platform-verifier` + `webpki-root-certs` merged as **extra** roots | rustls 0.23.43 (2026-07-29); 0.24 not shipped | Provider is `aws-lc-rs`, selected by reqwest's `rustls` feature — never installed explicitly. Merged roots keep `SSL_CERT_FILE` and corporate MITM proxies working | `native-tls`/`openssl` (OpenSSL into a prebuilt cross-compiled matrix); `ring` as an explicit provider; `tls_certs_only` (silently disables the platform verifier) |
| JSON | `serde` + `serde_json`; `serde_json_canonicalizer` where bytes must be stable | current | Canonicalization is already the determinism mechanism for JSON output | `simd-json` — different API, mutates the input buffer, no measured bottleneck |
| TOML (read) | `toml` | 1.x line | Typed deserialization; `Map` is `BTreeMap`-backed by default, so ordering is alphabetical-deterministic but not the order a lockfile wants | — |
| TOML (write, hand-authored) | `toml_edit::DocumentMut` | 0.25.13 (2026-07-14) | Preserves comments, spacing, relative item order. Documented gap: dotted-key order. Undocumented but real: CRLF normalizes to LF, a BOM is dropped | `toml::to_string_pretty` on a domain struct; hand-rolled `writeln!` templating; `figment`/`config` (read/merge only, no write-back) |
| YAML | `serde_yaml_ng` | 0.10 | Maintained API-compatible fork; ocx already chose it, so family consistency picks it over `serde_norway` | `serde_yaml` — archived, `newest_version` is literally `0.9.34+deprecated`, last release 2024-03-25 |
| JSON Schema | `schemars` + a **committed golden fixture** | 1.2.2 (Jul 2026) | Schemars disclaims shape stability across minor versions in writing; the fixture is the only signal a bump changed a published schema | `insta` — pinned non-adoption in `testing.md` and `tui.md`; `assert_eq!` against a committed file covers this case |
| OCI / registry | `oci-client`, consumed as the `external/rust-oci-client` fork via `[patch.crates-io]` | upstream 0.17.0 (May 2026); fork is 33 commits ahead | The fork carries the empty-trust-store fix, the SSRF `dns_resolver` seam, and five wire-protocol credential-leak fixes | `oras-rs`, `dkregistry-rs`, `oci-spec` (the fork's types already cover the surface) |
| Archive — tar | `tar` | 0.4.46 in tree; floor 0.4.45 (SEC-07) | Pure Rust; 0.4.45 fixes CVE-2026-33056 / RUSTSEC-2026-0067 (symlink-then-directory chmod confusion) | — |
| Archive — gzip | `flate2` with the default pure-Rust `miniz_oxide` backend, pinned explicitly | 1.1.9 in tree | Default backend is pure Rust; PERF-18 requires the pin so a `cargo update` cannot silently pick up a C backend | `zlib`/`zlib-ng` feature variants — a C decoder on untrusted input for a format that does not need one |
| Archive — zstd | `zstd` (C `zstd-sys`) | 0.13 in tree | The deliberate asymmetry: no equal-maturity pure-Rust decoder is in the graph. `ruzstd` exists and is unevaluated | — (revisit if `ruzstd` is shown production-ready) |
| Archive — xz | **No winner yet.** Criterion: one decoder per format, and the pure-Rust one wins when both can serve every path | `lzma-rust2` 0.16.3 (released 2026-08-05) is the target; `liblzma` 0.4.8 (2026-08-09) is the incumbent on the async path | Both are actively maintained — this is not a "drop the dead one" call. The argument is one fewer C parser on untrusted input and one fewer cross-compilation liability across 8 triples | The choice is blocked on moving `SyncIoBridge` one layer earlier; until then, `deny.toml` cannot express it |
| Archive — zip | `zip`, `default-features = false, features = ["deflate"]` | 8.6 in tree; floor 2.3.0 (SEC-07) | Pure-Rust deflate as configured. Never the crate's own `extract()` methods — those are the CVE-2025-29787 surface | `deflate-flate2-zlib`/`-zlib-ng` features |
| Hashing | `sha2` | current | Contractually mandatory: OCI digests are `sha256` (occasionally `sha512`) per spec | `blake3` — rejected by the pinned performance decision ("No mmap, no BLAKE3"); `crc32fast` (nothing needs it) |
| Terminal styling and detection | `console` for rendering and TTY primitives; `anstyle-query` + `colorchoice` for env detection; `anstream`/`anstyle` stay clap-internal | console 0.16.x; anstream 1.0.0 (Feb 2026) | `console::Term`'s cursor/line primitives have no `anstream` equivalent, and `strip_ansi_codes`/`truncate_str` are already named by SEC-34/SEC-36. `console` does **not** read `NO_COLOR` itself — that glue is ours to write once | `ansi_term` (unmaintained since 2019), `owo-colors`, `colored`, `termcolor` — any of them is a third colour decision in one process |
| TUI | `ratatui` + `crossterm` | ratatui 0.30.2 (Jun 2026), crossterm 0.29 | Maintained continuation of tui-rs; 0.30 split the crate into a workspace and bumped MSRV to 1.86 / edition 2024 | `tui-rs` (crate `tui`) — last release 2022-08-14, README asks for a maintainer |
| Progress | `indicatif` with `MultiProgress::suspend()` | 0.18.x | Auto-hides on a non-TTY or `TERM=dumb` with no manual gate, and `suspend()` is the primitive that stops a log line tearing a bar | Hand-rolled `\r…\x1b[K` writes; `tracing-indicatif`'s `IndicatifLayer` (see ocx's `adr_progress_architecture` concurrency objection before adopting) |
| Tracing | `tracing` + `tracing-subscriber` (+ `tracing-log` to bridge) | tracing 0.1.44 (Dec 2025) | Structured spans over a multi-stage async pipeline | `log` + `env_logger` for new code; `metrics`, `opentelemetry` (OBS-12 bans OTel in a short-lived CLI) |
| MCP server SDK | `rmcp`, `features = ["schemars", "transport-io"]` — **stdio only** | 3.1.2 (2026-08-07); grimoire locks 3.1.0 | Official SDK from the spec-owning org; `adr_multi_registry_mcp.md` rejected hand-rolled JSON-RPC. The feature pin is the security control: all five GHSA advisories are HTTP-transport or OAuth-scoped and grimoire compiles neither. `ServerHandler`'s default `discover()` makes the server Dual-era for free | Hand-rolled JSON-RPC; `transport-streamable-http-*`, `server-side-http`, `auth`, `auth-client-credentials-jwt`, `reqwest` — each pulls a second `hyper`/`reqwest`/`oauth2`/`jsonwebtoken` stack past ECO-04 |
| Embedded scripting (ocx only) | `starlark` pinned `=0.13.0`, plus `allocative` (supertrait-required) and the three co-released siblings | 0.14.2 (2026-06-05); ocx pins 0.13.0 (2024-12-13) | Language and stdlib are I/O-free by construction — every capability comes from ocx's own host module. Upstream states it does not aim for API stability between releases and publishes all four crates from one workspace in one pass, so exact pins are deliberate. Zero advisories across all five crates (OSV + RustSec, 2026-08-14) | `rhai` (better built-in limits, wrong syntax, whole-corpus rewrite), `rune` (161K downloads, same churn risk), `mlua` (C library vs `unsafe_code = "forbid"`), plain TOML (cannot express the assertions) |
| Signature / attestation verification | **None, deliberately** — SEC-32 requires the docs to say so. `sigstore` (sigstore-rs) is the crate if the deferred ADR lands | sigstore 0.14.0 (2026-05-22); self-declared unstable until 1.0 | Its README says it "does not handle verification of attestations yet" — the in-toto/DSSE envelope SLSA, PEP 740 and npm provenance all use — so it cannot verify the thing that matters most. If adopted: `default-features = false, features = ["cosign", "rustls-tls"]` (its default is `native-tls`, which SEC-14 bans) and its `oci-client = "0.17"` joins the ECO-13 check. Its own crypto already runs on `aws-lc-rs`, so no second provider | Adding it on defaults; shelling out to the `cosign` binary (chicken-and-egg pinning under SEC-21/22); `notation`; anything designed against ghcr.io's referrers endpoint (ECO-54) |
| Config paths | `dirs` | 6.0.0 (Jan 2025) | One crate across the family. `directories::ProjectDirs` computes a *different* macOS path (reverse-DNS bundle ID) than `dirs`' base lookups, so switching relocates existing users' data | `directories` — better API, wrong migration cost |
| Temp files and atomic writes | `tempfile`, landing with `NamedTempFile::persist` | current | The create-in-temp-then-rename pattern needs no dedicated crate; SEC-11 already forbids predictable `.tmp` names | `atomicwrites` (low adoption), `format!("{}.tmp", …)` in a shared directory |
| File locking | `fs4` | 1.1.0 (Apr 2026) | Actively-developed superset of fs2: `rustix` over `libc`, async-runtime support | `fs2` — last release 2018-01-06 |
| Glob matching | `globset` | current | One matcher across the family; ocx's `glob` is the loser. Two glob crates in sibling tools means divergent pattern semantics for the same user-visible feature | `glob`, `walkdir`, `ignore` (no ignore-file semantics are in play) |
| Retry / backoff | `backon` | 1.6.0 (Oct 2025) | The crate the ecosystem converged on for sync+async. PKG-16 owns the *policy* (retryable set, full jitter, `Retry-After` override); this is only the mechanism | `backoff` (frozen), `tokio-retry` (stalled), `tokio-retry2` (community fork) |
| Rate limiting | **No winner.** Criterion: adopt only when ghcr.io throttling is actually observed | `governor` 0.10.4 (Dec 2025) is the crate if the trigger fires | A pre-emptive client-side limiter is a guess at someone else's quota, and a wrong guess is slower than the server's own 429 plus PKG-16's backoff | — |
| Date / time | `chrono`, `default-features = false, features = ["clock"]` | 0.4.45 (Jun 2026) | PLAT-30 pins exactly one datetime crate in the graph; chrono is the incumbent with the serde surface | `jiff` — better DST semantics, but a second datetime crate emits a second serde representation of the same lockfile field |
| UTF-8 paths | **None.** `std::path` + `dunce` | — | `camino` is a pinned non-adoption in `platform-and-paths.md` | `camino` |
| Testing — CLI harness | `assert_cmd` + `predicates` | current | Exit code and stream assertions separately (TEST-10) | `trycmd`, `snapbox` — pinned non-adoptions |
| Testing — property | `proptest` (+ `proptest-state-machine`) | current | TEST-14 pins it explicitly | `quickcheck` |
| Testing — mock HTTP | `wiremock` | 0.6.5 (Aug 2025) | Async-only, Tokio-native, matches a fully-async suite | `mockito`, `httpmock` — pinned non-adoptions |
| Testing — trait doubles | Hand-written fake behind a narrow trait | — | TEST-39: `mockall` only when the trait already exists for a production reason | `mockall` as a default, `faux` |
| Testing — parameterized | `rstest` | current | TEST-04 | a `for` loop over an array inside one `#[test]` |
| Testing — snapshot | **None, deliberately** | — | Pinned non-adoption in both `testing.md` and `tui.md`; hand-written assertions survive a layout tweak and can assert colour | `insta` / `cargo-insta` |
| Benchmarking | `hyperfine` primary; `criterion` only once a hyperfine number justifies it | hyperfine 1.20.0 (Nov 2025) | Measures whole subcommands, which is what a user of `ocx add` feels. PERF-03/PERF-25 own the invocation flags | `criterion` as the default harness, `divan` |
| Fuzzing | `cargo-fuzz` + `arbitrary` | current | TEST-18: structure-aware targets on hand-rolled parsers (tar headers, OCI manifests, reference strings) | `bolero`, `afl` |
| Secrets in memory | `secrecy::SecretString` + `Zeroizing` for intermediates | current | Stops `Debug`/`Display` leaks and zeroizes on drop; explicitly does **not** cover clones, `String` conversions, or a heap dump | Nothing; the gap is covered by hand at each named boundary |
| Credential storage | `docker_credential` (vendored fork) as tier 1; `keyring-core` + a platform backend crate as the unlanded tier 2 | keyring-core 1.0.0 (2026-04-21); keyring 4.1.6 (2026-08-01) is a legacy wrapper | Tier 1 inherits whatever the user already configured via `docker login` and stores nothing new | Monolithic `keyring` v2/v3 — that API shape no longer exists |
| Unused dependencies | `cargo-shear` | 1.13.4 (2026-08-11); MSRV floor rustc 1.95 | Biweekly cadence, `--fix`, `--format=github`. Already pinned by TOOL-05 | `cargo-machete` (0.9.2, 2026-04-15 — 4x the downloads, four months staler), `cargo-udeps` (nightly to run) |
| Cross-compilation | `cargo-zigbuild` (Linux/musl) + `cargo-xwin`/`xwin` (Windows MSVC) + native runners (Darwin) | zigbuild 0.23.0 (2026-06-18); cargo-xwin 0.23.1 (2026-08-13); xwin 0.10.0 (2026-08-12) | Covers all eight shipped triples with no Docker daemon | `cross` — alive but structurally cannot build `apple-darwin` (no image exists) or `-msvc` |
| Release pipeline | `dist` — crates.io package name is still **`cargo-dist`** | 0.32.0 (2026-05-21); both repos pin 0.31.0 | Generates the release workflow, per-target archives, checksums, installers, and interlocks with `cargo-auditable`/`cargo-cyclonedx` | `release-plz`, `cargo-release`, `cargo-workspaces` — dist + cocogitto + git-cliff already own version, tag, changelog, release. Also: `cargo install dist` installs a squatted 0.0.0 crate |
| Spell check | `typos-cli` | 1.49.0 (2026-08-03) | Cheap, fast, and its default dictionary does not misfire on `ocx`/`grim`/`ghcr`/`oci` (verified empirically) | — |

## The ruleset

Severity maps onto the house tiers: MUST = Block, SHOULD = Warn,
CONSIDER = Suggest. Every verification is a command or an observable check.

### Choosing and keeping a dependency

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| ECO-01 | Establish a crate's liveness from `https://crates.io/api/v1/crates/<name>` — read `updated_at`, `newest_version`, `description` — never from the human `crates.io/crates/<name>` URL and never from a download count. | The human URL is a client-rendered SPA that returns an under-200-byte shell with only a `<title>`; download count measures the installed base, not the pulse. | `curl -s https://crates.io/crates/<name> \| wc -c` is under 1KB and contains no version string, while `/api/v1/crates/<name>` returns JSON with a non-null `crate.newest_version`. Any PR justifying a dependency by a download number must also cite `updated_at`. | MUST |
| ECO-02 | Treat a `newest_version` ending in `+deprecated`, or a `description` containing "deprecated" or "unmaintained", as a hard stop regardless of adoption. | This is the maintainer's own explicit signal, not an inference from staleness — `serde_yaml`'s `newest_version` is literally `"0.9.34+deprecated"` and `async-std`'s description reads "Deprecated in favor of `smol`". | `curl -s https://crates.io/api/v1/crates/<name> \| grep -Eio '"newest_version":"[^"]*deprecated\|"description":"[^"]*(deprecat\|unmaintain)'` is non-empty. | MUST |
| ECO-03 | A recent release date is not evidence of health — read what the release contains, and check RustSec, before trusting a fresh `updated_at`. | `bincode` 3.0.0 (2025-12-16) looks alive on crates.io and is a docs-only release shipping a deliberate compile error, announcing permanent cessation after a harassment incident; confirmed by RUSTSEC-2025-0141 (issued 2026-01-07) and a GitHub archive banner. | For any crate whose sole liveness evidence is `updated_at`, also check `rustsec.org/advisories/` by crate name and the GitHub repo for an "Archived" banner. An archival banner is a prompt to resolve where the crate publishes from *now* (ECO-48), never a verdict on its own — `allocative`'s `repository` field points at a repo archived 2026-06-14 while the crate keeps publishing from inside `starlark-rust`'s workspace. | MUST |
| ECO-04 | Apply staleness thresholds by category: 12–18 months without a release **plus** maintainer-distress language disqualifies a fast-moving tool (watcher, task runner, formatter, cross-compiler, async runtime); the same gap alone does not disqualify a small API-stable library. | `dhat` (last release 2024-02-04, no distress signal, finished scope) and `cargo-watch` (archived 2025-01-18, README says "on life support") have comparable gaps and opposite meanings. | A staleness rejection cites an explicit maintenance statement from lib.rs or the repo, never an age alone. | SHOULD |
| ECO-05 | Deny these in `deny.toml`'s `[bans].deny` with `use-instead`: `serde_yaml`→`serde_yaml_ng`, `bincode`→`postcard`, `ansi_term`→`anstyle`, `dotenv`→`dotenvy`, `tui`→`ratatui`, `fs2`→`fs4`, `cargo-husky` (no replacement). | Each is confirmed dead or deprecated against a primary source with a named maintained successor, and a transitive upgrade could reintroduce any of them silently. EVO-12 already denies `async-std`/`structopt`/`error-chain`/`failure` by the same mechanism; this extends the list. | `cargo deny check bans` fails if any appears as a direct or transitive dependency. | MUST |
| ECO-06 | Do not add a dev tool that duplicates one already in the family's toolchain — `cargo-deny`, `cargo-about`, `git-cliff`, `cocogitto`, Taskfile, `hawkeye`, `cargo-nextest`, `hyperfine` — even when the new tool is itself alive. | `cargo-license` (last release 2025-07-29) and `cargo-make` (2025-01-18) are both maintained; the reason to refuse them here is redundancy, not death, and conflating the two arguments makes the refusal refutable. | Before adding a dev-dependency or CI step, `rg -n '<capability keyword>' Taskfile.yml taskfiles/ deny.toml .github/workflows/` for a tool already doing that job. | SHOULD |
| ECO-44 | A direct dependency with zero `use` sites is deleted **unless both** hold: (a) removing it leaves the resolved version byte-identical — proved by emptying the manifest line, running `cargo check -p <crate>` and re-running `cargo tree -i <dep>`, not by reading a comment; **and** (b) its family publishes from one shared workspace on one release cadence, evidenced by matching version-and-date history across siblings on crates.io. When both hold the entry is a deliberate pin, and the manifest comment must state *that* mechanism. A supertrait bound is a third, separate case: the crate is genuinely required and will have `use` sites. | ocx's manifest claims the `starlark_syntax`/`starlark_map`/`starlark_derive` trio must be direct to force resolver version-consistency behind a "sealed" supertrait. Both halves are wrong: emptying all three compiles clean with all three still resolving at an identical `0.13.0`, and `StarlarkValue` is not sealed — ocx implements it for its own types. `allocative` *is* compile-required, for the supertrait reason, and has four real `use` sites. The defensible justification is upstream's documented single-repository release process plus its stated no-API-stability policy — a policy choice that must be recorded as one. | `curl -s https://crates.io/api/v1/crates/<sibling>/versions` for every crate in the family: condition (b) holds only if the shared version's `created_at` dates match across all siblings for the last four-plus releases. Condition (a) is the emptying test, run and its output pasted in the PR. | MUST |
| ECO-45 | Express an unused-dependency exemption as `[workspace.metadata.cargo-shear] ignored = [...]` (or the crate-level equivalent), never as a prose comment in `Cargo.toml`. | A comment is not machine-checked and does not survive `cargo shear --fix` run blind by an agent. ocx today carries a `// ignored by cargo-machete below` comment describing a table that does not exist, and no `ignored` table exists anywhere in the tree for any of the three starlark siblings — the only thing between an agent and `cargo remove starlark_syntax starlark_map starlark_derive` is prose that ECO-44 shows is not even accurate. | `cargo shear` in a fresh clone reports zero findings, and `cargo shear --fix` removes nothing. Wire the gate only *after* the table lands (ECO-42's nine findings would red the pipeline on day one). | MUST |
| ECO-48 | A `repository` URL that 404s, redirects, or shows a GitHub archival banner is a stale pointer to be resolved, not a death certificate — find where the crate publishes from now before killing or clearing the dependency. | `allocative`'s crates.io `repository` field points at `facebookexperimental/allocative`, archived 2026-06-14 with a banner redirecting to `facebook/buck2`. The crate is not abandoned: it is now a first-class member of `facebook/starlark-rust`'s own workspace and publishes in step with `starlark`'s cadence. ECO-01 mandates the JSON API over the rendered page; this is the sibling gap — the JSON API's own `repository` field can be the dead pointer. | Reconcile three signals before concluding death: a fresh `updated_at` on the JSON API, the archived repo's own redirect notice, and the successor repo's `Cargo.toml` listing the crate as a workspace member. Two out of three agreeing on "alive" beats one archival banner. | SHOULD |

### TLS and the cross-target matrix

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| ECO-07 | Never call bare `rustls::ClientConfig::builder()`; construct rustls configs with `builder_with_provider(provider)`, or go through `reqwest`, which already does this correctly. | The zero-arg form is the one function that reaches `get_default_or_install_from_crate_features()` — the only path that can panic on provider ambiguity. The explicit form cannot, because the caller supplies the provider. | `rg -n 'ClientConfig::builder\(\)' --glob '*.rs' --glob '!external/**'` returns nothing. | MUST |
| ECO-08 | Do not add an explicit `rustls::crypto::*::default_provider().install_default()` call to production code. | It is unnecessary — reqwest 0.13 falls back to a local `aws-lc-rs` provider per `ClientConfig` when none is installed — and `install_default()` succeeds at most once per process, so the call becomes a live footgun for any future test harness or embedding that also installs one. | `rg -n 'install_default' --glob '*.rs' --glob '!external/**' --glob '!**/tests/**'` is empty. (The two existing hits are `jsonwebtoken`'s identically-named type in the vendored fork's test helpers — see ECO-08's failure mode.) | MUST |
| ECO-09 | Do not add `cross` (cross-rs) to the toolchain. | Its `docker/` directory has no `apple-darwin` image at all — Apple SDK redistribution terms forbid a public one — and only `-gnu` Windows images, so two of eight shipped triples and the MSVC ABI are permanently out of reach. This is structural, not a cadence complaint. | `rg -ln 'cross-rs\|cargo cross\b\|Cross\.toml' .github/ taskfiles/` is empty. | MUST |
| ECO-10 | Pin a cross-toolchain container image by `@sha256:` digest when upstream ships no stable version tag, and pin a cross CLI tool by exact version — never `:latest`, never an unversioned installer action. | An unpinned Windows cross-toolchain image is a supply-chain and reproducibility hole on every release build. ocx pins `messense/cargo-xwin` by digest with a comment saying why, then installs `cargo-zigbuild` unpinned in one workflow while pinning `0.22.3` in another. | `rg -n 'image:\|install-action' .github/workflows/*.yml` — every cross-toolchain reference carries `@sha256:` or an exact version, and all `cargo-zigbuild` pins in one repo agree. | MUST |
| ECO-11 | After bumping `cargo-zigbuild`, run a real `cargo zigbuild --target aarch64-unknown-linux-musl --release` before merging — a version-pin diff is not evidence. | `aws-lc-rs` has C and assembly build steps sensitive to the exact flags `zig cc` passes; aws-lc-rs#993 (`-Wp,-U` breaking zig cc) is the precedent, and the failure appears on a leg no host check exercises. | The bump PR's CI includes the musl cross leg green, not just a host `cargo check`. | SHOULD |

### Vendored forks and `[patch]`

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| ECO-12 | Read a patched crate's pinned revision from `git submodule status`, never from `Cargo.lock` or `cargo tree`. | A path-patched crate has no `source` and no `checksum` line in `Cargo.lock` — Cargo cannot pin a path dependency to a revision — so the gitlink SHA committed in the superproject tree is the only pin that exists. | Fork review reads `git diff --stat <base>..<head> -- external/`, not `git diff Cargo.lock`; `cargo metadata --format-version1 \| jq -r '.packages[]\|select(.name=="oci-client")\|.source'` prints `null`. | MUST |
| ECO-13 | Never bump a patched crate's version requirement without rebasing the fork and bumping the fork's own declared version in the same PR. | `[patch]` silently stops applying — a `warning: Patch … was not used in the crate graph`, never an error — the moment the requested range outruns what the fork declares, and the build reverts to unpatched upstream carrying none of the hardening. Renovate's cargo manager can propose exactly this bump. | A CI step gated on any diff touching those `Cargo.toml` lines runs `cargo build 2>&1 \| rg 'was not used in the crate graph'` (must be empty) **and** asserts `cargo metadata … \| jq '…\|.source'` prints `null` for both patched crates. | MUST |
| ECO-14 | Never run `git submodule update --remote` in CI, scripts, or a task recipe. | It moves the "locked" build onto whatever the tracked branch points at today, defeating the SHA pin exactly the way a `branch =` git dependency would. `.gitmodules`' `branch =` field feeds only `--remote`; a plain `--init` always checks out the committed SHA. | `rg -n 'submodule update.*--remote' .github/ taskfiles/ scripts/` is empty. | MUST |
| ECO-15 | Treat any diff under `external/*/src/` as a security review, never as a dependency audit. | RustSec's advisory database only tracks published crates.io packages; nobody files an advisory against a private fork, so the fork's own ~1,475 changed lines are permanently outside `cargo deny`, `cargo audit` and every SBOM scanner. A green advisory check attests to upstream's CVE status and says nothing about the fork. | A PR touching `external/*/src/*.rs` carries a security-tier review recorded separately from the routine `cargo deny` gate. | MUST |
| ECO-16 | Keep a committed ledger of every un-upstreamed fork commit with its upstream PR status and exit criterion; a prose promise in a rules file is not a tracking artifact. | `subsystem-deps.md` already references a `feedback_submodule_upstream_pr.md` that does not exist anywhere in the repo, and `gh pr list` against both upstreams shows zero `ocx-sh`-authored PRs for 34 divergent commits. | The ledger's row count equals `git log --oneline <upstream-tag>..HEAD` inside each submodule. | SHOULD |
| ECO-17 | Treat a fork's SBOM entry matching upstream's PURL as expected, not reassuring, and record that fact in the ECO-16 ledger. | `cargo-cyclonedx` emits a `file://` qualifier for a path dependency, but the base identity stays `pkg:cargo/oci-client@0.17.0`, and Grype/Trivy/OSV/Dependency-Track key on that identity, not the qualifier. `cargo-auditable` records `source: Local` but redacts every path and URL. A shipped `bom.xml` is indistinguishable from real upstream to any automated consumer. | After each rebase: `cargo cyclonedx -p <crate>` then `rg -A3 'name="oci-client"' bom.xml` — confirm the qualifier is present *and* that the ledger states it is advisory-only. | MUST |

### Release pipeline and install channels

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| ECO-18 | `dist-workspace.toml`'s `installers` key is an architecture decision, not a config value to sync between sibling repos. | `installers = []` on ocx is required by `adr_self_setup.md`: any installer dropping a loose binary on `PATH` creates an install `ocx self setup`/`ocx self update` cannot see or heal. grimoire has no CAS, so dist's shell/powershell installer is a complete answer for it. Neither direction of "make them consistent" is correct. | Before changing `installers`, `rg -ln 'adr_self_setup\|self setup\|self update' <repo>/.claude/` — a hit makes the field load-bearing and the change ADR-tier. | MUST |
| ECO-19 | A distribution channel is admissible only if the tool it installs is not self-managed by that tool's own store. | `brew upgrade` and `ocx self update` racing over the same `PATH` entry with neither aware of the other is a strictly worse version of the problem `installers = []` already avoids. This is the general test; Homebrew-for-grimoire and no-Homebrew-for-ocx are its two current answers. | For each proposed channel, name which process owns the installed path after `<tool> self update` runs. Two owners is a rejection. | MUST |
| ECO-20 | Never set `install-updater = true`, and never add `self_update` or `axoupdater` as a dependency. | Both are a GitHub-release-checksum trust root distinct from — and weaker than — the OCI content-addressable digest chain each tool already runs for every package it manages. ocx's architect ratified-rejected exactly this: two objects at one logical identity would carry different provenance proofs, contradicting the store's single-invariant design. | `rg -n 'install-updater' dist-workspace.toml */Cargo.toml` and `rg -n 'self_update\|axoupdater' Cargo.lock` are both empty; any future self-update lands as `<tool> self update` through the tool's own OCI client. | MUST |
| ECO-21 | Declare `[package.metadata.binstall]` with the repo's real `<name>-<target><archive-suffix>` asset naming and an explicit `pkg-fmt`, before publishing to crates.io. | Without it, `cargo binstall <tool>` skips the `crate-meta-data` strategy and resolves through `cargo-quickinstall`'s independently-built third-party mirror, or falls back to a from-source `cargo install` — never the project's own release process. | `cargo binstall --dry-run <name>` reports the `crate-meta-data` strategy, not `quick-install` or `compile`. | SHOULD |
| ECO-22 | Never hand-patch a dist-generated installer script or workflow; a hardening gap in dist's template is an upstream issue, not a local edit. | `grimoire-installer.sh` downloads its release archive with a bare `curl -sSfL` — no `--proto '=https'`, no `--tlsv1.2` — even though the README one-liner is hardened. It is dist's own template output, and a local fix is silently discarded on the next `dist generate-ci` with no drift check protecting it. | `git log --oneline -- '*installer.sh' '*installer.ps1'` shows no hand-authored commits; `dist generate --check` passes clean. | MUST |

### Archive and compression stack

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| ECO-23 | Exactly one decoder implementation per compression format in the graph, enforced by `deny.toml`'s `[bans].deny` with `use-instead`. | ocx runs two independent XZ decoders in production — pure-Rust `lzma_rust2::XzReader` on the local path, C `liblzma` via `async-compression` on the registry pull path — doubling the untrusted-input parser surface and the advisory surface for one format. Both crates are actively maintained, so this is an architecture argument, not a liveness one. | `cargo tree -e normal \| rg -i 'liblzma\|lzma-rust2\|xz2'` shows one family per format; `cargo deny check bans` fails if the loser reappears as a transitive edge. | MUST |
| ECO-24 | Never call `zip::read::ZipArchive::extract` or `zip::unstable::stream::ZipStreamReader::extract`; hand-roll the entry loop with `enclosed_name()` plus an explicit symlink-target containment check. | CVE-2025-29787 / RUSTSEC-2025-0168 (CVSS 7.3) broke exactly those two convenience methods *with* `enclosed_name()` sanitization in place — the crate's documented one-liner is the vulnerable surface and looks like the obviously right answer. The version floor alone is not the defense. | `rg -n 'ZipArchive::extract\|ZipStreamReader::extract' src/ crates/` returns nothing outside a test asserting their absence. | MUST |
| ECO-25 | Any CLI surface accepting a filesystem path to an archive is an ingestion path for PKG-04..PKG-07 purposes — a local file the invoking user pointed at is not thereby trusted. | The registry path was treated as the only untrusted one, so `compression::read_file` returns a bare `Box<dyn Read>` with no cap and `archive/zip.rs::extract`'s per-entry `io::copy` is uncapped both per-entry and in aggregate. A cap costs a `.take()` wrapper; an uncapped local bomb costs the machine. | The module list PKG-02 scopes its lints to includes `compression.rs` and `archive/`; a bomb fixture test exists for `Archive::extract` on `.tar.xz`, `.tar.gz`, `.tar.zst` and `.zip`. | MUST |
| ECO-26 | Document a non-standard OCI media type as non-standard at its declaration site, naming the spec's actual set. | `application/vnd.oci.image.layer.v1.tar+xz` follows the naming pattern of the three types the image-spec defines (`tar`, `tar+gzip`, `tar+zstd`) and is a private extension — interop stops at the ocx-to-ocx boundary, and nothing in `media_type.rs` says so. | The constant's doc comment names the three spec-defined types and states the extension status. | SHOULD |

### Config self-editing and generated schemas

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| ECO-27 | Every format-preserving write reparses its own rendered output and asserts semantic equality with the intended mutation before returning it, and fails closed when the editor cannot express the mutation — never falling back to a lossy whole-file rewrite. | This is what makes ocx's `ocx.toml` editor trustworthy rather than merely well-intentioned: `ProjectErrorKind::ManifestEditDiverged` catches a future editor bug the moment it would silently drop the user's content, instead of shipping a corrupted config. | Per writer, a test asserting a mutation the editor cannot express returns an error rather than succeeding — the shape of ocx's `a_candidate_the_sync_cannot_express_fails_closed`. | MUST |
| ECO-28 | Every `toml_edit`-backed writer ships the byte-identical round-trip pair: an untouched key retains its exact spacing and trailing comment, and a mutation plus its exact inverse `assert_eq!`s to the original bytes. | DATA-FMT-10 picks the crate; only this test shape catches a refactor that silently reintroduces whole-file reserialization, and only byte `assert_eq!` — not `contains` — sees a lost blank line. | One such pair per writer; the inverse half uses `assert_eq!(after_remove, original)`, never `contains`. | MUST |
| ECO-29 | Commit a golden fixture per published JSON Schema and gate it in CI, separately from (not instead of) the docs-build regeneration. | schemars states verbatim that generated schema structure "may change between versions of schemars — this is not considered a breaking change", and neither repo pins the shape, so a minor bump silently republishes a changed public schema at `grimoire.rs/schemas/*.json` with no diff, no red CI and no changelog line. Use a committed `.schema.json` plus `assert_eq!`; `insta` stays unadopted. | A `schemars` version bump that changes any fixture fails `cargo test` until the fixture is reviewed and updated. | MUST |
| ECO-30 | Do not add `figment` or `config` (config-rs) to either workspace. | Both are read/merge-only with no format-preserving write-back, `config`'s TOML support is backed by plain `toml` — the exact mechanism the write-path rules steer away from — and both repos' hand-rolled precedence layering already works and would survive either crate unchanged. | A PR adding either must demonstrably delete more precedence-merging code than it adds. | SHOULD |

### Terminal, colour, TUI and progress

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| ECO-31 | One implementation of the `--color`/`NO_COLOR`/`CLICOLOR_FORCE`/`CLICOLOR`/`TERM=dumb` precedence chain per family, shared by every binary, delegating detection to `anstyle-query`/`colorchoice` rather than re-deriving the rules. | ocx and grimoire independently hand-wrote the same ~80-line chain in two files with near-identical test sets and two different storage strategies — CLI-07 already forbids hand-rolling the env check, and one shared resolver satisfies it without the full `anstream::AutoStream` migration that `console`'s cursor primitives have no replacement for. | `rg -n 'NO_COLOR\|CLICOLOR'` hits exactly one module across the family; `--color=never <bin> --help` and `--color=never <bin> <subcommand>` each emit zero `\x1b[`. | MUST |
| ECO-32 | `console` is the rendering and TTY-primitive crate; `anstream`/`anstyle` stay clap-internal. Never add a third styling crate to any binary in the family. | `console::strip_ansi_codes` and `truncate_str` are already named by SEC-34/SEC-36, and `console::Term`'s cursor and line-clearing primitives have no one-for-one `anstream` replacement. A third stack means three colour decisions in one process. | `cargo tree -e normal -i anstream` names only `clap_builder` and the ECO-31 resolver; `rg -n 'owo_colors\|termcolor\|ansi_term\|^colored ' */Cargo.toml` is empty. | MUST |
| ECO-33 | A `ratatui::Frame` carrying a generic backend parameter is a rejected diff, not a style note. | `Frame` has been `Frame<'a>` — single lifetime, no `B: Backend` — since at least 0.25.0 and is still `Frame<'a>` at the pinned 0.30.2. `Frame<'_, B>` is `tui-rs`-era shape from the abandoned predecessor crate, so it is a build break, not a stale-but-valid version. | `rg -n "Frame<.*Backend\|Frame<'_, B\|Frame<'a, B" src/` is empty; `cargo build` is the real gate. | MUST |
| ECO-34 | New ratatui code uses the post-0.26 idiom set: `Layout::vertical([..])`/`horizontal([..])` over `Layout::new(Direction::…)`, `render_widget(&w, area)` over by-value, `List::direction` over `start_corner`, `HorizontalAlignment` over `Alignment`, `Block::title(…)` without a `Title` wrapper. | The pre-0.26 forms still compile at 0.30, so the compiler will not catch a stale-model diff, and a codebase carrying both eras is harder to read than one carrying either. | `rg -n 'Layout::new\(Direction::\|start_corner\|gauge_style\|Title::from' src/` is empty outside vendored code. | SHOULD |
| ECO-35 | Any new progress indicator in the family uses `indicatif` with a `MultiProgress::suspend()`-wrapped tracing writer — never a second hand-rolled ANSI bar. Do not adopt `tracing-indicatif`'s `IndicatifLayer` without first re-deriving ocx's documented concurrency objection. | grimoire's `StderrBar` writes raw `\r…\x1b[K` with no coordination, and its own `ponytail:` comment documents the frame-smearing defect as accepted-but-unfixed; `indicatif` also supplies the non-TTY and `TERM=dumb` auto-hide a hand-rolled bar must reimplement. OBS-24 owns *who* holds the terminal; this owns *which crate*. | `rg -n 'indicatif' <repo>/Cargo.toml` before writing any progress code — its absence is the signal to read ocx's `ProgressManager`, not to write from scratch. A reproduction test interleaving `tracing::warn!` with bar advances asserts no bar fragment is spliced. | SHOULD |

### Credential storage and registry auth

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| ECO-36 | Credential resolution is a four-tier fall-through in this order: (1) an existing `docker-credential-*` helper via `docker_credential`, (2) the OS keychain via `keyring-core` plus the platform backend crate, (3) environment variables, (4) refuse — or the explicit `--allow-insecure-store` plaintext opt-in. Every tier's absence falls through; none errors. | This covers the whole environment matrix — laptop with Docker Desktop, laptop with a desktop keychain and no Docker, headless CI, container with no D-Bus — without ever defaulting to plaintext. A broken or missing keychain must not block an otherwise-anonymous-eligible pull, the same way a broken credential helper already does not. | A table-driven test stubbing each tier's absence in turn (no helper on `PATH`, no `DBUS_SESSION_BUS_ADDRESS`, no env var) asserts fall-through, never an error and never a panic. | MUST |
| ECO-37 | Depend on `keyring-core` plus an explicit per-platform backend crate, never the monolithic `keyring` v2/v3 API shape — and add the dependency only when the tier actually lands as code. | The crate split during 2026: `keyring-core` 1.0.0 shipped 2026-04-21 and `keyring` 4.1.6 (2026-08-01) is a legacy-compat wrapper. `keyring`'s default Linux backend is D-Bus Secret Service, which is precisely what fails on a headless runner, and `linux-keyutils-keyring-store` is in-memory-only with a days-scale default expiry — a same-session cache, never a durable home. | `cargo tree -p keyring-core -e features` shows 1.x plus an explicit `*-keyring-store` crate, not a monolithic `keyring` with baked-in features; `rg -n 'keyring' Cargo.toml` stays empty until an ADR adds the tier. | MUST |
| ECO-38 | Redact a credential helper's raw stdout and stderr before either can reach the top-level `{err:#}` chain. | `docker_credential::CredentialRetrievalError::HelperFailure { stdout, stderr }`'s `Display` prints them verbatim, and a misbehaving helper emits credential JSON — CWE-532. grimoire intercepts this in `map_helper_err`; ocx's `AuthError::Helper` passes it through untouched into a `log::error!("{err:#}")` that walks the full source chain. | `rg -n 'HelperFailure' --type rust` across the whole workspace, not just the file in the bug report — every `#[source]`/`#[from]` site has a redaction wrapper before the error is constructed. | MUST |
| ECO-39 | Never hold a credential in a long-lived map once it has crossed into a third-party type that does not use `secrecy`. | `oci_client::secrets::RegistryAuth` is plain `String` with a hand-redacted `Debug` and no `Drop`, so ocx's `Arc<RwLock<HashMap<String, RegistryAuth>>>` keeps un-zeroized secrets alive for the process's entire life once any registry has been authenticated to once. | `rg -n 'RegistryAuth' --type rust` — every `HashMap`, `Arc<RwLock<_>>` or `static` holding one has a TTL, an eviction path, or a comment stating why indefinite caching is acceptable. | SHOULD |

### Update automation and repo hygiene

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| ECO-40 | Every repo in the family carries a `renovate.json` extending `config:recommended` with `git-submodules` enabled, and the submodule rule is never grouped with the cargo rule and never automerged. | Renovate's cargo manager assigns `skipReason: 'path-dependency'` to every `path =` entry at extraction time, so a `[patch.crates-io]` fork is invisible to it by construction — the `git-submodules` manager is the only channel that sees it at all. The fork carries a TLS trust-store fix and wire-protocol credential-leak fixes that must never land silently inside a batched routine-crate PR. | `rg -n 'git-submodules' renovate.json` present and enabled; the submodule `packageRule` shares no `groupName` with the cargo rule; `rg -n 'automerge' renovate.json` is empty. | MUST |
| ECO-41 | Exclude the dist-generated `release.yml` from Renovate's `github-actions` manager. | It carries the `# autogenerated by dist` header and is regenerated wholesale, so bumping its pinned action SHAs is churn that the next `dist generate-ci` re-clobbers. | A `packageRules` entry with `matchFileNames: [".github/workflows/release.yml"]` and `enabled: false`, plus `rg -q 'autogenerated by dist' .github/workflows/release.yml`. | SHOULD |
| ECO-42 | A `cargo shear` finding is a hypothesis, not a fact — before deleting a flagged dependency, grep the whole tree *including* `Cargo.toml` feature lists and `build.rs`, read the manifest comment block for a link-time or deliberate-pin rationale, then settle it with ECO-44's two-condition test. **A finding is not automatically a false positive either.** | ocx's `liblzma` is linked as a static C library via a Cargo feature and never `use`d — a genuine link-time false positive. The `starlark_syntax`/`starlark_map`/`starlark_derive` trio is a *different* shape: removing all three and running `cargo check -p ocx_lib` compiles clean and `cargo tree` still resolves all three at an identical `0.13.0` transitively, so the manifest's "must be direct to force resolver version-consistency" rationale is empirically false — what justifies keeping them is upstream's one-workspace release process (ECO-44), a policy choice, not a compile requirement. `glob` is a third shape again: `globset` is the crate of record, so that finding is a real deletion. | Run the check against ocx's five current unique findings (9 total): `liblzma` and the starlark trio resolve to "allowlist via `[workspace.metadata.cargo-shear] ignored`" (ECO-45), `glob` resolves to "delete". Any run that returns the same verdict for all five has skipped the test. | MUST |
| ECO-43 | Add `typos-cli` as a gate with a `_typos.toml` derived from an actual run, not from an assumed jargon list. | An empirical run on grimoire produced 199 findings of which 53 came from one vendored minified JS file and 58 from one deliberate consistent spelling (`unparseable`) — and none of `ocx`, `grim`, `ghcr` or `oci` triggered at all, so a domain-jargon allowlist written up front is pure wasted config. | `typos` exits 0 after the config lands; every `extend-words` entry names the file that motivated it in a comment. | SHOULD |

### Embedded interpreters and protocol SDKs

Two crates in the family accept input from outside the process and hand it to
a large third-party state machine: `starlark` in ocx and `rmcp` in grimoire.
Neither had been reviewed by any scout or dive across five phases.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| ECO-46 | An embedded script interpreter is a parser, not a sandbox. The security boundary is the host-function module the embedding registers, and every in-process resource limit the interpreter offers is best-effort by its own maintainers' word — a real runtime or memory bound is an OS-level boundary (subprocess plus kill), nothing the evaluator exposes. | starlark's own current docs for `set_max_tick_count`/`set_max_heap_size` say verbatim that starlark-rust "should in general not be considered secure against truly malicious code… Use OS-level APIs in a subprocess if you want that." Starlark the language and all 14 enabled `LibraryExtension` variants are I/O-free by construction, so the entire capability surface is ocx's `ocx_module.rs` — where `ocx.run` spawns an arbitrary program with the invoking user's full privilege, no namespace, no seccomp, no cgroup. The `guard.rs` path sandbox covers four host functions and has no effect on what a spawned child does. | A security review of the scripting feature opens the host-function module first, not the interpreter's changelog: `rg -n 'Command::new' <script-module>/` — every spawn site is named in the review. Every doc claiming a bound names the OS mechanism enforcing it (SEC-32). | MUST |
| ECO-47 | An interpreter upgrade that closes a documented resource-limit gap is a security change, and the PR adds the call sites in the same diff — a version bump alone leaves the gap exactly where it was. | starlark 0.14.0 (2026-05-22) added `set_max_tick_count`, `set_max_heap_size` and `set_check_cancelled` — precisely the "ACCEPTED v1 LIMITATION" `ocx/crates/ocx_lib/src/script.rs:37-62` documents as unmitigated. Bumping the pin to 0.14.x without touching `engine.rs::evaluate()` ships nine breaking API changes and closes nothing. | The upgrade PR's diff touches `engine.rs`'s `evaluate()`, not only the manifest pin; the accepted-limitation doc comment is deleted in the same commit or restated with what still is not covered. | SHOULD |
| ECO-49 | Every MCP tool-result payload passes through the family's render-boundary sanitizer before serialization, exactly as the TUI and stderr paths do. Registry-sourced text reaching a model's context is a render boundary. | The MCP `2026-07-28` spec's `server/tools` "Security Considerations" states servers **MUST** "Sanitize tool outputs." grimoire's `to_json` (`src/mcp/server.rs:166-168`) is a bare `serde_json::to_string(report)`, and `SearchEntry.description` is documented "full and untruncated". The sanitizer already exists — `sanitize_member_label` (`src/tui/render.rs:98`), the SEC-34/36/37 implementation, wired into every TUI path — so the fix is a call site, not a capability. SEC-31 enumerates three boundaries and this is a fourth. | `rg -n 'sanitiz' src/mcp/` is non-empty; a table-driven test mirroring `src/tui/render.rs:2779+`'s corpus asserts the payload is stripped from the JSON-RPC tool-result string `to_json()` actually returns, not from the TUI path. | MUST |
| ECO-50 | When a dependency gates a duplicate of an already-governed stack behind opt-in features, the *absence* of those features is a CI assertion, not a manifest comment. | `rmcp`'s `transport-streamable-http-*`, `server-side-http`, `auth`, `auth-client-credentials-jwt` and `reqwest` features pull `hyper`, a second `reqwest`+`rustls`, `oauth2` and `jsonwebtoken` — the exact HTTP/TLS/auth stack ECO-04 and SEC-14 already govern. `cargo deny check bans` cannot catch it: it bans crates by name, and these are correctly absent today rather than incorrectly present. One `features = [...]` edit to "add HTTP transport support" reverses that silently. | A CI step asserts `cargo tree -e normal -p rmcp \| rg -i 'hyper\|reqwest\|oauth2\|jsonwebtoken'` is empty. Pin the dependency `default-features = false` with an explicit list so a future upstream addition to `default` shows as a diff. | MUST |
| ECO-51 | A dated deferral with a named trigger is a tracked obligation. The PR that fires the trigger either closes the gap or lands a dated re-justification in the same ADR — shipping the trigger and leaving the deferral is how an accepted risk becomes an unowned one. | `adr_multi_registry_mcp.md` (2026-07-03) accepted returning full `anyhow` chains — filesystem paths included, CWE-209 — to the MCP client, with the explicit revisit trigger "before write tools land." `grim_render` landed and uses the same unconditional `tool_error()` (`src/mcp/server.rs:172-174`). The trigger fired; the revisit did not. ECO-16 makes the same argument for the fork ledger: a prose promise is not a tracking artifact. | Every accepted limitation whose trigger is a code event names the grep that detects it (`rg -n 'grim_render' src/mcp/`), and CI or review runs it. A green grep with no dated follow-up section in the ADR is the finding. | MUST |
| ECO-52 | Bumping a protocol SDK's major version is a wire-surface review, not a dependency bump: the PR links the changelog section and names every `[**breaking**]` entry. | `rmcp` shipped two breaking majors in five months (2.0.0 on 2026-06-27, 3.0.0 on 2026-07-28), each landing the same day as the MCP spec revision it implements — its major cadence is coupled to an external clock, not to an API-design clock. SEP-numbered behaviour changes compile clean and alter wire semantics; a `Cargo.lock` diff shows none of it. | The bump PR body cites `.../blob/rmcp-v<version>/crates/rmcp/CHANGELOG.md` and enumerates the breaking entries. A bump whose body says only "routine dependency update" is rejected. | SHOULD |

### Provenance and signature verification

Both tools verify digests (SEC-19) and neither verifies a signature — SEC-32
already requires the docs to say so, and this stays a deliberate deferral. The
rules below govern the shape the deferred ADR must take, not a build order.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| ECO-53 | Signature or attestation verification, when it lands, is identity-scoped, fail-closed, and in the runtime pull path. No code path accepts an unscoped-but-otherwise-valid certificate; a Rekor/Fulcio network error, timeout or malformed bundle is a hard error, never a silent skip; and the only bypass is a single named flag in the existing `--allow-insecure-store`/`insecure = true` style, never a generic environment variable. | These are the three ways a verifier returns `Ok` and means nothing. `cosign verify` and `gh attestation verify` independently made identity mandatory at the argument-parsing layer (`MarkFlagsOneRequired("owner", "repo")`; "Either `--certificate-identity` or `--certificate-identity-regexp` must be set"), because the permissive default is silently permissive. apt fails closed and demands an interactive override; npm's `audit signatures` is a separate opt-in command nobody runs. And a check that runs only in release CI proves what the project *shipped*, not what a user's `install` received — the runtime pull path is the only place it has value. | A unit test rejects a syntactically valid bundle signed by an *unexpected* identity, not merely an unsigned artifact; a fault-injection test severing Rekor/Fulcio asserts `Err`, not skip; the verify function is reachable from the same call site as `verify_raw_bytes_digest`/`pull_blob`, not only from a workflow step. | MUST (when built) |
| ECO-54 | Do not design any ghcr.io feature against the OCI 1.1 referrers endpoint. Use GitHub's Attestations API or the legacy `<algorithm>-<hex>` tag-fallback convention. | Probed live 2026-08-14: `HEAD /v2/ocx-sh/ocx/cli/manifests/latest` returns 200 with a `docker-content-digest`, and `GET /v2/ocx-sh/ocx/cli/referrers/<that same digest>` returns `404 MANIFEST_UNKNOWN`. Per spec a registry supporting the API must return an empty index, never 404. `attest-build-provenance` does push `subject`-bearing manifests to ghcr.io — they exist — but the *query* endpoint is unimplemented (github/community#163029). ocx's own `research_ghcr_constraints.md` reached the same conclusion independently and its chained-index scheme is already a registry-agnostic workaround. | Re-run the two-curl probe before relying on referrers availability; a change to `200` is the trigger to revisit, not a standing assumption. | MUST |

### Collisions with existing rules

Twenty-nine candidates from the sub-artifacts already exist as published
rules. Each is dropped from the ECO set; the existing ID is authoritative.

| Proposed by | Already covered by | Note |
|---|---|---|
| Gate unused dependencies on `cargo-shear`, not machete or udeps | **TOOL-05** | The dependency-update dive re-derived it independently with 2026-08 release dates; the conclusion matches, so only the dates are new. |
| Exactly one rustls crypto provider reachable | **EVO-10** | The TLS dive's contribution is that this — not an `install_default()` call — is the invariant. Kept as ECO-07/ECO-08's premise, not restated. |
| A TLS/crypto backend change is validated by the real target matrix | **EVO-11** | — |
| Pin git dependencies by `rev`; review a `[patch]` diff like a new dependency | **SEC-27** | ECO-12..ECO-14 cover the submodule-specific mechanics SEC-27 does not reach. |
| `toml_edit` for hand-authored files, plain serde for machine-generated | **DATA-FMT-10** | ECO-27/ECO-28 add the verify gate and the byte-identical test, which DATA-FMT-10 does not require. |
| One component owns the terminal; the fmt writer follows it | **OBS-24** | ECO-35 is the crate choice only. |
| `--color`/`NO_COLOR` via `anstream`/`colorchoice`, never hand-rolled | **CLI-07** | ECO-31 adds the one-implementation-per-family constraint; the hand-rolling ban is CLI-07's. |
| `tar >= 0.4.45`, `zip >= 2.3.0` version floors | **SEC-07** | — |
| Use rustls; ban `openssl`/`openssl-sys`/`native-tls` in `deny.toml` | **SEC-14** | — |
| Merge embedded roots as extra roots, never `tls_certs_only` | **SEC-14** | Confirmed still true in both trees against reqwest 0.13.4 source. |
| Ban `async-std`, `structopt`, `error-chain`, `failure` in `[[bans.deny]]` | **EVO-12** | ECO-05 extends the same list with seven more crates. |
| `cargo auditable` + SBOM + signed build-provenance attestation | **REL-04**, **SEC-29** | Already enabled in both `dist-workspace.toml`s. |
| Trusted Publishing (OIDC), no long-lived `CARGO_REGISTRY_TOKEN` | **REL-06** | Dormant until a first crates.io publish. |
| Exactly one datetime crate (chrono vs jiff) | **PLAT-30** | — |
| `blake3` for an internal content-addressed cache | `performance.md` pinned decision | "No mmap, no BLAKE3." Dropped. |
| Adopt `camino` for UTF-8 paths | `platform-and-paths.md` pinned decision | "Pinned: camino is not adopted." Dropped. |
| `cargo insta test` for schema fixtures | `testing.md` / `tui.md` pinned non-adoption | Replaced in ECO-29 by a committed `.schema.json` + `assert_eq!`. |
| `mockall` at the registry trait boundary | **TEST-39** | Hand-written fake first; mockall only when the trait exists for a production reason. |
| `hyperfine` for CLI wall-clock benchmarking | **PERF-01/02/03/25** | Already the pinned primary harness. |
| Pin compression backend features; no `zlib`/`zlib-ng` | **PERF-18** | — |
| `cap-std` for attacker-derived paths | **SEC-10**, **TEST-28**, **PLAT-40** | — |
| Every `[advisories].ignore` carries a machine-checkable removal condition | **CI-08**, **SEC-25** | Already the in-tree convention across all three repos. |
| `--locked` on every cargo invocation in CI, scripts and docs | **CI-04**, **SEC-26** | — |
| Never document a resource limit the shipped code does not enforce (starlark's wall-clock claim) | **SEC-32** | Exactly SEC-32 applied to `ScriptLimits::wall_clock`, which bounds each `ocx.run` child and not the evaluator. Recorded as a live violation below, not as a new rule. |
| Sanitize registry text at the render boundary | **SEC-31** | Partial collision. SEC-31 owns the mechanism and enumerates three boundaries — stderr error chain, log lines, TUI. The MCP tool-result payload is a fourth it does not name, so ECO-49 is kept and the promotion is an in-place amendment to SEC-31's enumeration, not a new SEC ID. |
| Ban `native-tls`/`openssl` if `sigstore-rs` is adopted | **SEC-14** | The feature pin (`default-features = false, features = ["cosign", "rustls-tls"]`) lives in the crates-of-record row, not in a rule that fires for one hypothetical crate. |
| Spawning the `cosign` binary must use an absolute path with `--` before untrusted argv | **SEC-21**, **SEC-22** | Already governs the shell-out alternative; it is one more reason the in-process route is preferred if this is ever built. |
| Recompute and compare the digest of every pulled manifest and blob | **SEC-19** | Confirmed implemented in both trees; the provenance dive's contribution is that this is the floor, not the ceiling. |
| Verify a keyless signature's identity, not just its validity | **SEC-32** premise, no existing rule | Kept as ECO-53 — SEC-32 forbids claiming the control; nothing yet governs how it must behave when built. |

## Applied to the codebase

Evidence read directly from `ocx @ HEAD`, `grimoire @ HEAD` and
`ocx-mirror @ HEAD` on 2026-08-14, or drawn from a sub-artifact that cites a
`file:line`.

### Already satisfied

| What | Evidence |
|---|---|
| Exactly one rustls crypto provider is *enabled*, not merely present | `cargo tree -e features -i rustls` in `ocx/` resolves `aws-lc-rs` only, via `reqwest`'s `__rustls-aws-lc-rs` ← `rustls` feature; `cargo tree -i ring --target all` prints "nothing to print". EVO-10 holds by construction of the `default-features = false, features = ["rustls"]` pin. |
| Embedded roots merged, never substituted | `grimoire/src/tls.rs:67-97` carries two regression tests (embedded set non-empty; DER→`reqwest::Certificate` projection total); `tls_certs_only` is never set in either tree, verified against reqwest 0.13.4's own default. SEC-14 holds. |
| `[patch.crates-io]` is the right mechanism and the pin is real | Both repos patch to `external/` submodules, not `[source] replace-with`; `git submodule status` shows `a4d92857… external/rust-oci-client (v0.17.0-49-ga4d9285)`; no workflow uses `--remote`. ECO-12 and ECO-14 hold. |
| `ocx.toml` has a format-preserving writer with a fail-closed gate | `ocx/crates/ocx_lib/src/project/document.rs` — `toml_edit::DocumentMut`, reparse-and-compare, `ProjectErrorKind::ManifestEditDiverged`, plus `add_leaves_untouched_binding_byte_identical` and `add_then_remove_round_trips_byte_identical`. ECO-27 and ECO-28 hold there. |
| zip extraction avoids the CVE surface on two independent grounds | `ocx/Cargo.toml:122` pins `zip = "8.6"` (past the 2.3.0 fix) and `archive/zip.rs::extract` hand-rolls the loop with `enclosed_name()` + `crate::symlink::validate_target`, exercised by `test_extract_rejects_escaping_symlink_zip`. ECO-24 holds. |
| Lockfile determinism | Both `ocx/crates/ocx_lib/src/project/lock.rs::to_toml_string` and `grimoire/src/lock/grimoire_lock.rs` serialize a borrowed `SerializableView` over data pre-sorted by `(group, name)`, not the live domain struct. No `HashMap` reaches either serializer. |
| Release artifacts already carry dependency data and an SBOM | `ocx/dist-workspace.toml:36,38` — `cargo-auditable = true`, `cargo-cyclonedx = true`; same in grimoire's. REL-04's first two clauses hold. |
| grimoire's TUI code is already on the current ratatui API | `grimoire/Cargo.toml` pins `ratatui = "0.30"` / `crossterm = "0.29"` (lock: 0.30.2); `src/tui/init_dialog.rs` uses non-generic `Frame` and `Terminal::new(CrosstermBackend::new(…))`. ECO-33 holds — the risk is prospective. |
| Terminal/log interleaving is solved on both sides, separately | grimoire's `src/log_switch.rs` (`SwitchableWriter` + `LogSinkGuard`, declared before `TerminalGuard` so reverse-drop order restores stderr after the alt-screen exits); ocx's `ProgressManager` routes the fmt writer through `MultiProgress::suspend`. OBS-24 holds in both. |
| Plaintext credential storage is gated and mode-correct | `grimoire/src/auth/store.rs` — `StoreOptions::allow_plaintext_put` defaults `false` behind `--allow-insecure-store`; `ensure_config_file` creates at `0o600` before the first secret byte and `restrict_permissions` re-applies it after every write, pinned by `plaintext_put_creates_file_mode_0600`. SEC-12 holds. |
| grimoire redacts the credential-helper leak | `grimoire/src/oci/access/registry_client.rs:264-278` — `map_helper_err` intercepts `HelperFailure` before it can reach `{err:#}`. ECO-38 holds in grimoire. |
| Digest verification is real and sound on both pull paths | `ocx/crates/ocx_lib/src/oci/client.rs:2051` `verify_raw_bytes_digest` recomputes and hard-errors `ClientError::DigestMismatch`, called at `:1943`, regression tests at `:2174`/`:2181`; `grimoire/src/oci/access/registry_client.rs:429-439` recomputes after the `CappedSink` read. SEC-19 holds. The TOFU window is specifically first resolution (`add`/`update`), not every pull. |
| grimoire's MCP server enables exactly one transport, and that is the control | `Cargo.toml:69` — `features = ["schemars", "transport-io"]`; `src/mcp/server.rs:192` calls `rmcp::transport::stdio()`. `cargo tree -e normal -p rmcp` shows no `hyper`, `reqwest`, `oauth2` or `jsonwebtoken`. All five GHSA advisories against `rmcp` are HTTP-transport or OAuth-scoped, and RUSTSEC-2026-0189 states outright that stdio is unaffected. ECO-04 and ECO-50's premise hold today. |
| The MCP protocol-revision gap does not bite | `src/mcp/server.rs:144-162` overrides only `get_info()`, inheriting `ServerHandler`'s default `discover()`/`supported_protocol_versions()` — Dual-era per the spec's own compatibility matrix, which has no failing row for a Dual-era server against any client era. rmcp's `ProtocolVersion::LATEST` being one revision behind is an SDK-default conservatism, not a grimoire defect. |
| The starlark cluster is advisory-clean and structurally firewalled | OSV.dev and a `rustsec/advisory-db` path search both return zero for all five crates (2026-08-14). `ocx/crates/ocx_lib/src/script.rs:242-319` — `no_starlark_import_outside_firewall` is a *running* test walking every `.rs` file and asserting no `starlark*` token appears outside `src/script/`. `engine.rs:54-59` sets `enable_load: false`; `SCRIPT_EXTENSIONS` excludes `Breakpoint` and `Internal`. |
| `.star` input is never auto-executed from fetched content | Both call sites (`package_test.rs:90-98`, `patch_test.rs` via `script_runner.rs:34-64`) require an explicit `--script <PATH>` or stdin. No code path reads a `.star` file out of a pulled bundle and runs it. The threat model is "the operator trusts the file they pointed at", not "install runs untrusted Starlark". |

### Violated

| ID | What | Evidence |
|---|---|---|
| ECO-02, ECO-05 | grimoire ships a deprecated crate | `grimoire/Cargo.toml:32` — `serde_yaml = "0.9"`, resolving to `serde_yaml 0.9.34+deprecated`. ocx already migrated (`serde_yaml_ng = "0.10.0"`). grimoire's usage is plain frontmatter struct/`Value` parsing with no 0.9-specific escape hatches, so the fix is a one-line rename with zero source edits: `serde_yaml = { package = "serde_yaml_ng", version = "0.10" }`. |
| SEC-14, EVO-12, ECO-05, ECO-23 | `[bans].deny` is empty in both repos | `ocx/deny.toml:39-40` and `grimoire/deny.toml:32-33` contain only `multiple-versions = "warn"`. Nothing bans `openssl`, `native-tls`, `async-std`, `structopt`, `serde_yaml`, `bincode`, `fs2`, or a duplicate xz decoder. Every ban rule in the corpus is currently unenforced. |
| SEC-25 | `unknown-git = "allow"` in both repos | `ocx/deny.toml:44`, `grimoire/deny.toml:37`. SEC-25 requires `"deny"`. The vendored-forks dive asserts the `allow` is load-bearing because path deps under submodules trip the unknown-source ban; I read the files and confirmed the setting, and I did **not** confirm the claim — a path dependency has no `source` in `cargo metadata`, so cargo-deny's `[sources]` check plausibly never applies to it. One command settles it (see Open questions). |
| TOOL-05 | No unused-dependency gate exists anywhere | `rg -l 'cargo shear\|cargo-shear\|machete' ocx/taskfiles ocx/.github grimoire/taskfile.yml grimoire/taskfiles grimoire/.github` returns nothing. Meanwhile `cargo shear` on ocx today reports 9 findings across 4 unique crates, all false positives (ECO-42), and 0 on grimoire. |
| ECO-23 | Two XZ decoders ship in ocx | `crates/ocx_lib/src/compression.rs:310` builds `lzma_rust2::XzReader` for the local path; `crates/ocx_lib/src/oci/client.rs:917-941` builds `async_compression::tokio::bufread::XzDecoder` (C `liblzma`) for the registry pull path. Both are reachable from production. `ocx/Cargo.toml:116` and the `liblzma` block at `:122-139` are the two declarations. |
| ECO-25, PKG-05 | Local decompression is uncapped | `crates/ocx_lib/src/compression.rs:294-341` returns a bare `Box<dyn Read + Send>` with no `.take()`; `crates/ocx_lib/src/archive/zip.rs:257-260`'s per-entry `std::io::copy` is uncapped both per-entry and in aggregate. The OCI pull path is capped (`client.rs:873,924,946,964`); the local path is not. |
| DATA-FMT-10, ECO-27, ECO-28 | `grimoire.toml`'s writer is a lossy hand-rolled re-emitter | `grimoire/src/command/add.rs:901` `write_config` rebuilds the whole file with `writeln!`, preserving only a leading `#:schema` directive; its own doc comment calls it "the lossy re-serialize". `toml_edit = "0.25"` is already a dependency (`Cargo.toml:42`) and grimoire already uses it correctly — on **Codex's** `config.toml` (`src/install/toml_splice.rs`), not on its own primary config. |
| ECO-29 | No schema shape is pinned in either repo | Both regenerate `*.schema.json` into gitignored paths on every docs build; `rg 'insta\|assert_snapshot'` against schema output returns nothing in either tree. A `schemars` minor bump cannot fail CI and can silently republish `grimoire.rs/schemas/*.json`. |
| CLI-07, ECO-31 | The colour precedence chain is hand-rolled twice | `ocx/crates/ocx_lib/src/cli/options/color_mode.rs` and `grimoire/src/cli/color.rs` implement the identical four-variable precedence with near-verbatim test sets (`auto_no_color_beats_clicolor_force`, `auto_term_dumb_disables`) and two different storage strategies. Neither reuses the other; neither reuses a crate. |
| ECO-35 | grimoire's progress bar is raw ANSI with a known defect | `grimoire/src/cli/progress.rs::StderrBar` writes `\r{line}\x1b[K` to a locked stderr with no `indicatif`, no `suspend`, no tracing coordination — and a `ponytail:` comment documenting the frame-smearing as accepted and unfixed. grimoire has no `indicatif` dependency at all, so there is no in-crate example to imitate. |
| ECO-38 | ocx leaks credential-helper output into the error chain | `crates/ocx_lib/src/auth/error.rs` wraps `docker_credential::CredentialRetrievalError` as `#[source]` untouched, and `crates/ocx_cli/src/main.rs:24` logs `{err:#}`, walking the full chain. grimoire fixed the identical surface; ocx did not. CWE-532. |
| ECO-39 | ocx caches un-zeroized credentials for the process life | `crates/ocx_lib/src/auth.rs::Auth::cache` is `Arc<RwLock<HashMap<String, RegistryAuth>>>`; `RegistryAuth` is plain `String` with no `Drop`. |
| ECO-40 | Renovate coverage is inconsistent and blind to the forks | grimoire has no `renovate.json` at all. `ocx/renovate.json` exists but does not enable `git-submodules`, despite carrying the same two forks that `ocx-mirror/renovate.json` already tracks — and nothing in ocx's config explains the omission. |
| ECO-21 | No `[package.metadata.binstall]` in either repo | Confirmed by grep against both root manifests and every workspace member. |
| ECO-16 | The upstreaming obligation has no accounting artifact | `subsystem-deps.md` names a `feedback_submodule_upstream_pr.md` that does not exist anywhere in the repo; `gh pr list` shows zero `ocx-sh`-authored PRs against `oras-project/rust-oci-client` or `keirlawson/docker_credential` for 34 divergent commits. |
| SEC-31 | grimoire's top-level error write is unsanitized | `grimoire/src/main.rs:191` writes `{err:#}` straight to stderr with no terminal sanitizer, while `ocx_cli/src/main.rs:20-27` routes the same chain through `api::data::sanitize_for_terminal` with a structural regression test pinning the call. Same threat model, missing mitigation. |
| ECO-43 | No `_typos.toml`, no `.editorconfig` in either repo | Confirmed by `ls`. |
| ECO-49, SEC-31 | grimoire's MCP tool results are unsanitized — a spec **MUST** | `grimoire/src/mcp/server.rs:166-168` — `to_json` is `serde_json::to_string(report)` with no sanitizer; `grep -rn "sanitiz\|strip_ansi" src/mcp/` returns zero hits. `src/api/search_report.rs:14-22` documents `SearchEntry.description` as staying "full and untruncated". `sanitize_member_label` (`src/tui/render.rs:98`) exists and is wired into `src/tui/detail.rs:228,237,257`, `src/tui/tree.rs:918`, `src/tui/render.rs:561,698,707,843` — every path except this one. Highest-severity finding of the rmcp dive. |
| ECO-51 | An ADR deferral's trigger fired and nothing happened | `adr_multi_registry_mcp.md:239-244` accepted full `anyhow` chains to the MCP client (CWE-209) with the trigger "before write tools land." `grim_render` landed (`src/mcp/server.rs:133-141`) and routes through the same unconditional `tool_error()` at `:172-174`. No dated follow-up exists. |
| ECO-45, ECO-42 | ocx has no `cargo-shear` allowlist, only prose | `cargo shear` in ocx today: 9 findings across 5 unique crates — `liblzma` ×2, `starlark_derive` ×2, `starlark_map` ×2, `starlark_syntax` ×2, `glob` ×1. No `[workspace.metadata.cargo-shear] ignored` table exists anywhere; the trio is protected only by a `Cargo.toml` comment that ECO-44 shows is factually wrong about the mechanism. |
| ECO-46, SEC-32 | ocx's scripting docs claim a bound the code does not enforce | `ocx/crates/ocx_lib/src/script/engine.rs:90-93` calls `set_max_callstack_size` and nothing else — the only limit starlark 0.13.0 offers. `ScriptLimits::wall_clock` (`script.rs:58-61`) bounds each `ocx.run` child, not `eval_module`; the `Evaluator` is `!Send` so it cannot be raced against a `tokio::time::timeout`. Any doc or checklist saying ocx's Starlark runs under a time limit is a SEC-32 violation. `ocx_module.rs:392-479`'s `ocx.run` spawns an OS-unconfined subprocess; `guard.rs` protects four host functions and nothing the child does. |
| SEC-32 | ocx's shim doc overstates what CI enforces | `ocx/crates/ocx_lib/src/shim.rs:28-29` calls `gh attestation verify` "the real provenance control", but `build-windows-shims.yml:233-237` runs only `attest-build-provenance` (generation); line 235's own comment says "Refresh-PR checklist adds `gh attestation verify`" — a human step. The control named in the source comment is not the control CI runs. |
| ECO-16-shaped | The deferred supply-chain ADR does not exist | `ocx/.claude/artifacts/adr_public_index_registry_indirection.md:371-373` — "the D3 trade-off consciously accepts TOFU-until-lockfile; supply-chain hardening is a separate ADR", echoed in `design_spec_registry_indirection.md:23-25` and `adr_sbom_strategy.md:201`. No `adr_*signing*`/`adr_*provenance*` file exists in either repo. Same shape as the missing fork ledger: a referenced artifact that was never written. |
| REL-04 | grimoire generates no build provenance at all | `grimoire/.github/workflows/publish-catalog.yml` and `publish-ocx.yml` contain zero `attest` references, while ocx runs `attest-build-provenance@a2bbfa2…` on both `docker-publish.yml:206` and `build-windows-shims.yml:237`. The signing side is inconsistent within the family; the verifying side is uniformly absent. |
| — | Both `dist-workspace.toml`s are one minor behind | Both pin `cargo-dist-version = "0.31.0"`; 0.32.0 shipped 2026-05-21 with no breaking config changes (npm installer dropped `axios`/`rimraf`; `cargo-auditable` and `cargo-zigbuild` are no longer mutually exclusive; attestation moved `attest-build-provenance@v3` → `attest@v4`). |

### New commitments

Nothing in the published corpus currently requires these; they are the
decisions this consolidation adds.

1. **Move `SyncIoBridge` one layer earlier on ocx's pull path.** Wrap
   `ProgressReader<HashingAsyncReader<_>>` instead of the decoder — both
   already operate on compressed bytes, so nothing about the digest or the
   progress semantics changes — then decode with the pure-Rust `lzma_rust2`,
   `flate2` and `zstd` readers already used on the local path. Then deny
   `liblzma`/`liblzma-sys`/`xz2` with `use-instead = "lzma-rust2"` (ECO-23).
2. **Move `grimoire.toml`'s writer to `toml_edit::DocumentMut`** with ocx's
   fail-closed verify gate, replacing `command/add.rs::write_config`
   (ECO-27, ECO-28). The crate, the pattern and the written-down rationale are
   all already in the repo, applied to a different file.
3. **One shared colour-precedence module** for the family (ECO-31), collapsing
   the two ~80-line implementations and the union of their test sets.
4. **Land the `cargo-shear` allowlist before wiring the gate, and delete
   `glob` rather than allowlisting it.** ocx's tree carries a
   `// ignored by cargo-machete below` comment describing a table that does not
   exist; adopting the gate today reds the pipeline on nine findings on day one.
   The correct dispositions differ per finding (ECO-42): `[workspace.metadata
   .cargo-shear] ignored = ["liblzma", "starlark_syntax", "starlark_map",
   "starlark_derive"]`, and `globset` is the crate of record so the `glob`
   finding is a real removal.
5. **Open the fork ledger** (ECO-16) and, on the next rebase, drop the fork's
   `fix(client): Allow null in /tags/list responses` commit — it landed
   upstream independently as `oras-project/rust-oci-client#277`, a free
   reduction in maintained diff surface sitting unclaimed.
6. **Commit golden `.schema.json` fixtures** for `Config`, `ProjectConfig`,
   `ProjectLock`, `PatchDescriptor` (ocx) and `RawConfig`, `PublishManifest`,
   `RawLock`, `McpDescriptor` (grimoire), gated by `assert_eq!` (ECO-29).
7. **Add `[package.metadata.binstall]`** to both root manifests using the real
   `<name>-<target>` asset naming, with `pkg-fmt = "tgz"` and per-target `zip`
   overrides for the two Windows triples (ECO-21).
8. **Bump both `cargo-dist-version` to `"0.32.0"`** and reconcile ocx's two
   `cargo-zigbuild` pins (unpinned in `deploy-dev.yml`, `0.22.3` in
   `build-windows-shims.yml`) against current upstream 0.23.0 (ECO-10).
9. **Call `sanitize_member_label` (or an MCP-scoped equivalent covering the
   same class) on every string field before `to_json`** in
   `grimoire/src/mcp/server.rs` (ECO-49). This is the single highest-severity
   item on this list: a spec **MUST**, violated by a missing call site, with the
   implementation already in the tree.
10. **Close or re-date the CWE-209 MCP error-chain deferral** now that
    `grim_render` has fired its trigger (ECO-51) — either trim `tool_error()` to
    the top-level message for write-tool errors, or add a dated ADR section that
    re-justifies keeping full `anyhow` chains post-`grim_render`.
11. **Assert the absence of `rmcp`'s HTTP and auth features in CI** and pin the
    dependency `default-features = false` with an explicit list (ECO-50).
12. **Write the deferred supply-chain ADR** both trees already reference and
    neither contains. Its content is a decision, not a build: verification stays
    deferred, ECO-53 and ECO-54 are its shape when picked up, and the first
    target is ocx's own already-signed ghcr.io image and Windows shim — not
    third-party images or crates.io.

## Agent failure modes

Ranked by how often it bites, not by severity.

1. **Reaching for the crate the training corpus knows best.** `serde_yaml`,
   `ansi_term`, `dotenv`, `structopt`, `tui-rs`, `async-std`, `bincode`,
   `fs2`, `rng.gen()` — every one of these was the canonical answer for years
   before its replacement was, and a model's training-frequency prior lags the
   ecosystem by roughly the cutoff minus the deprecation date. This fires on
   every "add a dependency" task, which makes it the highest-frequency failure
   in the whole topic by a wide margin.
2. **Fetching `crates.io/crates/<name>` and calling it a liveness check.** The
   page is an Ember SPA that returns an empty shell to any non-JS fetch. Two
   bad outcomes follow: the model fabricates plausible version and date
   numbers to fill the gap, or it concludes "no data to the contrary, looks
   fine". Neither is a check. Force the `/api/v1/crates/` form.
3. **Citing a download count as maintenance evidence.** `cargo-husky` (3.23M
   lifetime, dead since 2020-01-21) and `cross` (6.17M, no crates.io release
   since 2023-02-04) both look like the obvious standard choice by that
   number alone, and both numbers keep climbing from lockfile re-resolution.
4. **Writing `Frame<'_, B>` and by-value `render_widget`.** The pattern is
   `tui-rs`-era, which still dominates older blog posts and Stack Overflow, so
   a model reproduces it reflexively. It does not compile against the pinned
   0.30 — the cheap catch is a grep before the build cycle, not after.
5. **"Fixing the TLS panic" by adding `install_default()`.** Compounded by a
   genuine trap: `jsonwebtoken::crypto::CryptoProvider` and
   `rustls::crypto::CryptoProvider` have the same type name, the same
   `install_default()` signature, the same one-shot-per-process contract, and
   both appear in the same vendored file. A model grepping "CryptoProvider"
   finds the jsonwebtoken calls and either concludes the TLS provider is
   already installed or adds a second, real one that does nothing today and
   panics the first time a test harness also installs one.
6. **Bumping `oci-client = "0.17"` and running `cargo update`.** It appears to
   succeed. The build compiles. `[patch]` silently detaches, the empty-trust-
   store fix and the SSRF resolver are gone, and the only trace is a stderr
   warning nobody reads in a CI log. This is the single most dangerous
   ordinary-looking task in the repo.
7. **Deleting a `cargo shear`-flagged dependency — or reflexively allowlisting
   it.** The deliberate-pin shape is the nastier one, and it got worse on
   inspection: `starlark_map` and friends have genuinely zero source
   references, so a correct grep returns nothing — *and* deleting them
   compiles clean, so the obvious confirmation step also says "safe to remove."
   Only the two-condition test (ECO-44) separates them from `glob` in the same
   output, which really should go. The reverse error is now equally live: a
   model that learns "shear findings here are false positives" allowlists all
   five.
8. **"Making the two repos consistent" on `installers`.** Both directions are
   wrong — setting ocx to grimoire's value creates a CAS-invisible install path,
   blanking grimoire's deletes its only install channel — and the reason lives
   only in an ADR that dist's own tooling has no reason to read.
9. **Calling `zip::ZipArchive::extract()`.** It is the crate's documented
   one-liner and the CVE-2025-29787 surface. The convenience method is the
   wrong answer here and looks like the obviously right one.
10. **Extending `write_config`'s template, or adding `#[derive(Serialize)]` +
    `toml::to_string` for a user-authored file.** Both look like local
    in-pattern changes. The file writes, parses back fine, and every test
    passes — the regression only appears in the user's own `git diff` of their
    own config, which an autonomous agent never sees.
11. **Reaching for `cross` when asked to add a target or fix a cross-build.** It
    is the best-known name in the category, and it cannot build the target in
    question for half this matrix.
12. **Adding `keyring = "2"` / `"3"` with the pre-split monolithic API**, and
    treating a keychain miss as fatal (`?` straight through) rather than as the
    benign fall-through both repos already apply to a missing Docker helper.
13. **Hunting for a size-limit constructor argument on a decoder.** None of
    `flate2`, `zstd`, `async-compression` or `lzma-rust2` has one; the cap is
    always an external wrapping `.take()`, and the mental model from
    higher-level HTTP and JSON libraries points the wrong way.
14. **Inventing a `rust-analyzer ssr` CLI subcommand.** SSR and every other
    assist are exposed through LSP only — there is no standalone subcommand to
    shell out to, and the documentation is explicit about it.
15. **Treating `application/vnd.oci.image.layer.v1.tar+xz` as spec-standard**
    because it sits next to two real OCI types in the same file and follows
    their naming pattern exactly.
16. **Concluding `anstream`/`anstyle` are "not in use" because they are absent
    from `Cargo.toml`**, then either adding them redundantly or ignoring that
    clap's own help output already routes through them.
17. **Serializing a report straight into an MCP tool result.**
    `serde_json::to_string(report)` is the obviously correct line, the tests
    pass, the JSON is valid — and it ships registry-controlled text into a
    model's context with the sanitizer sitting unused three modules away. The
    defect is a missing call, which no behavioural assertion catches (SEC-31's
    own argument, one boundary further out).
18. **Turning on an SDK feature to "add HTTP transport support".** One
    `features = [...]` edit to `rmcp` pulls `hyper`, a second `reqwest`, and an
    `oauth2`/`jsonwebtoken` stack past every gate the repo has, because
    `cargo deny check bans` bans names and those names are correctly absent
    today rather than incorrectly present.
19. **Reading an archival banner as a death certificate.** `allocative`'s
    `repository` field points at a repo archived 2026-06-14; the crate is alive
    and publishing from `starlark-rust`'s workspace. ECO-03 says to check for
    the banner and a model stops there instead of following the redirect.
20. **Treating an in-process interpreter's limit knobs as a sandbox.** The
    model reaches for `set_max_heap_size`, finds it does not exist at the
    pinned version, and either invents it, bumps the crate blind, or writes
    a doc comment claiming a bound. The crate's own docs say to use a
    subprocess; nothing in the API surface hints at that.
21. **Building signature verification against the referrers endpoint**, because
    it is what the OCI 1.1 spec documents and every tutorial assumes. ghcr.io —
    the registry both tools actually use — returns 404 for it.
22. **Adding `sigstore = "0.14"` with default features**, which pulls
    `native-tls`/`openssl-sys` into a graph two `deny.toml`s are supposed to ban
    and neither currently enforces.

**Stale incantations specifically.** `cargo install dist` installs an
unrelated squatted `0.0.0` crate — the real package is still `cargo-dist` even
though the tool rebrands itself "dist" in its own README. `cargo binstall
<tool>` is assumed to resolve to the project's own release without
`[package.metadata.binstall]`; it resolves to a third-party mirror or a source
build. `attest-build-provenance@v3` is what dist 0.31 generated; 0.32 moved to
`attest@v4`. `cargo yank` is treated as deletion — it blocks new resolution
only, and anything already in a `Cargo.lock` keeps building.

## Open questions

1. **Does `unknown-git = "deny"` actually break the fork setup?** One command
   settles it: flip the value in `ocx/deny.toml` and run `cargo deny check
   sources`. A path dependency has no `source` in `cargo metadata`, so the
   `[sources]` check plausibly never applies to it and the `allow` may be
   unnecessary — in which case both repos should return to SEC-25 compliance.
   If it does fail, the failure names the crate, and the correct fix is an
   `allow-git` allowlist entry naming the two repos, not a blanket allow.
   Nobody has run this.
2. **A design pass on the `SyncIoBridge` reorder.** ECO-23 states the rule, but
   the refactor touches the digest and progress seams and deserves its own
   review before someone attempts it from the rule text alone. *(The other half
   of this question — the `starlark` and `rmcp` clusters — closed on
   2026-08-14; see the revision log.)*
3. **One canonical credential precedence across both tools.** ocx checks env
   vars *before* the Docker credential store (`auth.rs::get_impl`); grimoire's
   read path does not consult env vars at all. The credential dive surfaced
   this and explicitly declined to resolve it. A durable rule needs one order,
   and the choice has real consequences for CI (env-first) versus a developer
   laptop (helper-first).
4. **`serde_yaml_ng` versus `serde_norway`.** Both are live, both claim
   API compatibility, and lib.rs lists them as alternatives to each other
   rather than anointing one. Family consistency picks `_ng` today because ocx
   already did; re-check on the next sweep, particularly if `serde_yaml_ng`'s
   informal-maintenance stance becomes a problem.
5. **Does grimoire decompress OCI layers at all?** It declares only
   `tar = "0.4"` among archive crates yet has a `CappedSink` on its blob path.
   Either its layers are uncompressed, or decompression happens inside the
   vendored `oci-client` fork, outside grimoire's declared dependency surface —
   which would mean ECO-23 and ECO-25 apply to code nobody is currently
   auditing as grimoire's.
6. **`ruzstd` maturity.** The "zstd's C dependency is harder to remove"
   asymmetry rests entirely on `ruzstd` being unevaluated. If it turns out
   production-ready, ECO-23 should apply to zstd too.
7. **crates.io publishing and name-squatting on `ocx` / `grim`.** Still
   deferred as strategic rather than agent-facing, but the name check is cheap
   and should be run as an ops task, not researched.
8. **Does ocx's `adr_progress_architecture` concurrency objection to
   `tracing-indicatif` still hold?** It is a real, specific, in-tree
   counter-data-point against the ecosystem's more widely recommended pattern,
   and it has not been re-verified against the current `tracing_subscriber`
   span registry.
9. **Should the OS-keychain tier detect its environment** (TTY plus
   `DBUS_SESSION_BUS_ADDRESS`) rather than hard-coding one Linux backend? The
   ecosystem has not settled this: `keyring`'s default feature picks the
   desktop-oriented D-Bus backend while its own `linux-keyutils` sibling's
   README argues headless should prefer keyutils.
10. **Upgrade `starlark` to 0.14.x, or move the evaluator into a subprocess?**
    These are two different answers to one gap, and the crate's own docs favour
    the second: 0.14's `set_max_tick_count`/`set_max_heap_size` are documented
    as "best-effort" and explicitly not a guarantee, with "use OS-level APIs in
    a subprocess" as the real answer. The upgrade costs nine breaking API
    changes and closes the gap partially; the subprocess costs a redesign
    around a `!Send` evaluator and closes it properly. Nobody has priced the
    second.
11. **Does `grim_render` contain its writes?** `RenderToolArgs.dest_dir` is an
    arbitrary agent-supplied `PathBuf` with no allowlist
    (`src/mcp/tool_args.rs:149-152`). Whether `ArtifactMaterializer`/
    `ClientTarget::materialize` can be induced to write outside it via a
    crafted artifact or file name is SEC-08/SEC-10 territory that the rmcp dive
    did not trace end to end. A `../`-bearing fixture rendered through
    `grim_render` settles it.
12. **Should `ocx.run`'s subprocess gain OS-level confinement** (namespaces,
    seccomp, or a `cap-std` directory handle for the child)? Real cost,
    platform-specific, no existing dependency covers it. It is the natural
    follow-up to ECO-46 and deserves its own design pass rather than a rule
    minted from one dive.
13. **Is the `glob` `cargo shear` finding a real deletion?** Everything points
    that way — `globset` is the crate of record and `glob` is named as the
    loser — but it surfaced incidentally in the starlark dive and nobody has
    checked ocx's call sites. One grep settles it, and it is the test case that
    keeps ECO-42 from degenerating into "allowlist everything."
14. **Is a terminal sanitizer the right sanitizer for LLM-read output?**
    `sanitize_member_label` was designed for SEC-34's threat model — a terminal
    interpreting escapes. Whether bidi-override stripping matters to a model
    reading tool output the way it matters to a terminal is untested, and the
    MCP spec obligates sanitization (`server/tools`: MUST) without giving
    implementers a threat model for it, unlike its full treatment of the
    OAuth-adjacent risks. ECO-49 is right to reuse the existing sanitizer; the
    open part is whether that class is sufficient, not whether it is necessary.
15. **Does grimoire need `attest-build-provenance`?** ocx signs its image and
    Windows shim; grimoire signs nothing. REL-04 reads as if both do. Either
    grimoire adopts it or REL-04 gets a scope clause — the current state is an
    unexplained asymmetry inside one family.
16. **Will rmcp bump `ProtocolVersion::LATEST` to `2026-07-28`?** Today it sits
    at the last Legacy revision while the SDK implements the Modern model end
    to end — deliberate conservatism about what an unconfigured session
    negotiates into. Bumping it is itself a breaking behaviour change and worth
    re-checking before the next `rmcp` major (ECO-52).

## Sub-artifacts

Relative links, with what each contributes that no other file does.

- [rust-ecosystem/tooling-inventory.md](rust-ecosystem/tooling-inventory.md) —
  the non-compiler tool field with crates.io publish dates for 60+ tools;
  source of the download-count-is-a-trap finding and the rust-analyzer
  SSR-is-LSP-only fact.
- [rust-ecosystem/crate-defaults.md](rust-ecosystem/crate-defaults.md) — the
  broad default-crate survey; the widest coverage and the least grounding, so
  three of its recommendations are overturned above by dives that read the
  tree.
- [rust-ecosystem/publishing-and-distribution.md](rust-ecosystem/publishing-and-distribution.md)
  — crates.io mechanics (10MB cap, yank semantics, team ownership, Trusted
  Publishing's GitHub-only scope) and Rust's wider-than-expected semver
  breaking surface; mostly dormant surface until a first publish.
- [rust-ecosystem/binary-release-pipeline-and-install-channels.md](rust-ecosystem/binary-release-pipeline-and-install-channels.md)
  — resolves the installer divergence against ocx's ADR, prices Homebrew,
  Scoop and WinGet, and kills `self_update`/`install-updater`.
- [rust-ecosystem/dependency-update-automation-and-unused-deps.md](rust-ecosystem/dependency-update-automation-and-unused-deps.md)
  — Renovate's cargo manager read from its TypeScript source, the empirical
  `cargo shear` and `typos` runs, and a ready-to-commit `renovate.json`.
- [rust-ecosystem/dependency-liveness-and-deprecated-crates.md](rust-ecosystem/dependency-liveness-and-deprecated-crates.md)
  — the liveness verification method, the category-dependent staleness
  threshold, and the denylist confirmed crate-by-crate against primary
  sources.
- [rust-ecosystem/credential-storage-and-registry-auth.md](rust-ecosystem/credential-storage-and-registry-auth.md)
  — the end-to-end credential lifecycle traced through both trees, the 2026
  `keyring`/`keyring-core` split, and the CWE-532 leak ocx still carries.
- [rust-ecosystem/tls-stack-and-cross-target-matrix.md](rust-ecosystem/tls-stack-and-cross-target-matrix.md)
  — the single most load-bearing dive: it disproved the task's own premise by
  reading reqwest's source and running `cargo tree`, and it is why `cross` is
  rejected structurally rather than for staleness.
- [rust-ecosystem/archive-and-compression-crate-stack.md](rust-ecosystem/archive-and-compression-crate-stack.md)
  — the two-XZ-decoder finding, the per-decoder C-versus-pure-Rust audit, the
  uncapped local path, and the CVE posture of both extractors.
- [rust-ecosystem/terminal-ui-and-output-stack.md](rust-ecosystem/terminal-ui-and-output-stack.md)
  — the ratatui version-to-idiom table, proof that `anstream` is already linked
  via clap, and the duplicated colour-precedence modules.
- [rust-ecosystem/config-and-manifest-self-editing.md](rust-ecosystem/config-and-manifest-self-editing.md)
  — the `ocx.toml`-versus-`grimoire.toml` asymmetry, the fail-closed verify
  gate as a reusable pattern, and schemars' written disclaimer of schema-shape
  stability.
- [rust-ecosystem/vendored-forks-and-patch-policy.md](rust-ecosystem/vendored-forks-and-patch-policy.md)
  — what `Cargo.lock`, RustSec, `cargo-auditable` and `cargo-cyclonedx` each
  actually record for a path-patched crate, read from those tools' own source
  rather than their docs.
- [rust-ecosystem/starlark-cluster.md](rust-ecosystem/starlark-cluster.md) —
  the empirical disproof of ocx's own pin rationale (all three siblings emptied,
  `cargo check` clean, versions unchanged) and the verbatim upstream statement
  that starlark-rust is not to be considered secure against malicious code in
  any in-process configuration.
- [rust-ecosystem/rmcp-cluster.md](rust-ecosystem/rmcp-cluster.md) — the MCP
  spec-revision compatibility matrix read against grimoire's actual handler, the
  five-advisory feature-scoping analysis, and the unsanitized `to_json` path
  that violates a spec **MUST** with the fix already in the tree.
- [rust-ecosystem/provenance-verification.md](rust-ecosystem/provenance-verification.md)
  — the live ghcr.io referrers probe (404 against a confirmed-existing digest),
  `sigstore-rs`'s own written limits, and the four-ecosystem comparison
  (apt/npm/PyPI/Homebrew) that fixes fail-closed as the target shape.
- [ecosystem-map.md](ecosystem-map.md) — the scout that commissioned the nine
  wave-4 dives; its 200-row verdict table is still the fastest way to answer
  "is crate X in or out", with the corrections above applied.

## Key sources

Deduplicated across all sixteen inputs, best-of only.

**Registry and liveness**
- [crates.io JSON API](https://crates.io/api/v1/crates/serde_yaml) — the only
  fetchable form; `updated_at`, `newest_version`, `description`, per-version `yanked`
- [lib.rs](https://lib.rs/crates/serde_yaml) — maintenance banners, curated
  "See also" successor lists, download trends; HTML-only, no API
- [RUSTSEC-2025-0141](https://rustsec.org/advisories/RUSTSEC-2025-0141.html) —
  bincode's cessation, the second independent source behind ECO-03

**TLS and cross-compilation**
- [reqwest `async_impl/client.rs` @ v0.13.4](https://github.com/seanmonstar/reqwest/blob/v0.13.4/src/async_impl/client.rs) —
  proves reqwest never reaches the ambiguity panic; the load-bearing source for ECO-08
- [rustls `CryptoProvider`](https://docs.rs/rustls/latest/rustls/crypto/struct.CryptoProvider.html) —
  process-default model, `install_default`/`get_default` contract
- [aws-lc-rs platform support](https://aws.github.io/aws-lc-rs/platform_support.html) —
  per-target build requirements; no CMake or Go outside FIPS
- [cross-rs/cross `docker/`](https://github.com/cross-rs/cross/tree/main/docker) —
  the file listing that proves no darwin image and `-gnu`-only Windows
- [webpki-root-certs](https://docs.rs/webpki-root-certs/latest/webpki_root_certs/) —
  the crate's own recommendation to pair with `rustls-platform-verifier`

**Cargo mechanics**
- [Cargo Book — Overriding Dependencies](https://doc.rust-lang.org/cargo/reference/overriding-dependencies.html)
  and [Source Replacement](https://doc.rust-lang.org/cargo/reference/source-replacement.html) —
  `[patch]` versus `replace-with`, and the content-identity requirement
- [Cargo Book — SemVer Compatibility](https://doc.rust-lang.org/cargo/reference/semver.html) —
  the breaking / possibly-breaking / non-breaking reference
- [Cargo Book — Publishing on crates.io](https://doc.rust-lang.org/cargo/reference/publishing.html) —
  10MB cap, yank semantics, team ownership

**Supply-chain tooling internals** (read from source, not docs)
- [rustsec `query.rs`](https://github.com/rustsec/rustsec/blob/main/rustsec/src/database/query.rs) —
  the source filter degrades to name+version for a sourceless package
- [cargo-cyclonedx `purl.rs`](https://github.com/CycloneDX/cyclonedx-rust-cargo/blob/main/cargo-cyclonedx/src/purl.rs) —
  how a path dependency's PURL qualifier is built
- [cargo-auditable schema](https://github.com/rust-secure-code/cargo-auditable/blob/main/cargo-auditable.schema.json) —
  the `source: CratesIo|Git|Local|Registry` field and the path redaction
- [PackageURL spec](https://github.com/package-url/purl-spec/blob/master/docs/specification/standard/specification.md) —
  qualifiers rank below the type/namespace/name/version identity
- [renovate `cargo/schema.ts`](https://github.com/renovatebot/renovate/blob/main/lib/modules/manager/cargo/schema.ts) —
  `skipReason: 'path-dependency'`, the reason the cargo manager cannot see a fork
- [Renovate — git-submodules manager](https://docs.renovatebot.com/modules/manager/git-submodules/) —
  beta, opt-in, disabled by default
- [cargo-deny bans/cfg.md](https://raw.githubusercontent.com/EmbarkStudios/cargo-deny/main/docs/src/checks/bans/cfg.md) —
  the `deny = [{ crate, use-instead }]` idiom ECO-05 and ECO-23 depend on

**Archives and CVEs**
- [OCI image-spec media-types.md](https://raw.githubusercontent.com/opencontainers/image-spec/main/media-types.md) —
  the three defined layer types; proves `tar+xz` is an extension
- [GHSA-94vh-gphv-8pm8 / CVE-2025-29787](https://github.com/zip-rs/zip2/security/advisories/GHSA-94vh-gphv-8pm8) —
  the zip-slip past `enclosed_name()`; the source for ECO-24
- [RUSTSEC-2026-0067](https://rustsec.org/advisories/RUSTSEC-2026-0067.html) —
  the tar symlink/chmod confusion behind SEC-07's 0.4.45 floor
- [NVD CVE-2025-31115](https://nvd.nist.gov/vuln/detail/CVE-2025-31115) and
  [tukaani-project/xz advisories](https://github.com/tukaani-project/xz/security/advisories) —
  the multithreaded-only CVE ocx cites, and the index-parsing one it does not

**Release and distribution**
- [axodotdev/cargo-dist](https://github.com/axodotdev/cargo-dist) and its
  [installer catalog](https://axodotdev.github.io/cargo-dist/book/installers/index.html) —
  maintenance state, the rename, and the exact five generated installer kinds
- [cargo-binstall SUPPORT.md](https://raw.githubusercontent.com/cargo-bins/cargo-binstall/main/SUPPORT.md) —
  every `[package.metadata.binstall]` key and template variable
- [rustup installation docs](https://rust-lang.github.io/rustup/installation/index.html) —
  the `--proto '=https' --tlsv1.2` convention ECO-22 measures dist's template against

**Terminal, config and credentials**
- [ratatui v0.26](https://ratatui.rs/highlights/v026/) and
  [v0.30](https://ratatui.rs/highlights/v030/) highlights — the two densest
  breaking releases behind ECO-34
- [docs.rs ratatui `Frame` @ 0.25.0](https://docs.rs/ratatui/0.25.0/ratatui/struct.Frame.html) —
  proves the non-generic shape predates the 0.26 wave
- [docs.rs console](https://docs.rs/console/latest/console/) — confirms the
  colour flags are explicit and the crate does not read `NO_COLOR` itself
- [no-color.org](https://no-color.org/) — presence of a non-empty value disables
- [docs.rs toml_edit](https://docs.rs/toml_edit/latest/toml_edit/) — the
  comments/spaces/relative-order guarantee and the dotted-key exception
- [docs.rs schemars](https://docs.rs/schemars/latest/schemars/) — the verbatim
  "not considered a breaking change" schema-shape disclaimer behind ECO-29
- [keyring-rs](https://github.com/open-source-cooperative/keyring-rs) and
  [keyring-core](https://github.com/open-source-cooperative/keyring-core) — the
  2026 split and the per-platform backend crate list
- [CWE-532](https://cwe.mitre.org/data/definitions/532.html) — the class ECO-38
  addresses

**Embedded interpreter and MCP**
- [docs.rs starlark 0.14.2 `Evaluator`](https://docs.rs/starlark/0.14.2/starlark/eval/struct.Evaluator.html) —
  the verbatim "not… secure against truly malicious code… Use OS-level APIs in
  a subprocess" text on `set_max_tick_count`/`set_max_heap_size`, and the method
  list that proves what 0.13.0 does not have
- [facebook/starlark-rust README](https://raw.githubusercontent.com/facebook/starlark-rust/main/README.md) —
  the coordinated single-repository release process and the stated
  no-API-stability policy behind ECO-44
- [starlark `values/traits.rs`](https://raw.githubusercontent.com/facebook/starlark-rust/main/starlark/src/values/traits.rs) —
  `StarlarkValue`'s real supertrait bound, the one hard compile requirement in
  the cluster
- [MCP spec — server/tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools) —
  the "Servers **MUST**… Sanitize tool outputs" line ECO-49 rests on, and the
  protocol-error-vs-execution-error split
- [MCP spec — versioning and compatibility](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning) —
  the Modern/Legacy/Dual-era matrix that clears grimoire's server
- [RUSTSEC-2026-0189](https://rustsec.org/advisories/RUSTSEC-2026-0189.html) —
  "Non-HTTP transports such as stdio and child-process transports are not
  affected"; the pattern all five rmcp advisories share

**Provenance**
- [OCI distribution-spec, referrers](https://raw.githubusercontent.com/opencontainers/distribution-spec/main/spec.md) —
  the endpoint that must return an empty index rather than 404, and the
  `<algorithm>-<hex>` tag fallback
- [sigstore-rs README](https://raw.githubusercontent.com/sigstore/sigstore-rs/main/README.md)
  and [its `Cargo.toml`](https://raw.githubusercontent.com/sigstore/sigstore-rs/main/Cargo.toml) —
  "will not be considered stable until 1.0", "does not handle verification of
  attestations yet", and `default = ["full", "native-tls"]`
- [cli/cli `attestation/verify/verify.go`](https://raw.githubusercontent.com/cli/cli/trunk/pkg/cmd/attestation/verify/verify.go)
  and [cosign `cosign_verify.md`](https://raw.githubusercontent.com/sigstore/cosign/main/doc/cosign_verify.md) —
  two independent tools making identity mandatory at argument-parse time,
  the evidence behind ECO-53
- [Debian wiki — SecureApt](https://wiki.debian.org/SecureApt) — the fail-closed
  reference model, against which npm's opt-in `audit signatures` is the
  counterexample
- [Cargo Book — registry index](https://doc.rust-lang.org/cargo/reference/registry-index.html) —
  `cksum` is a SHA-256 of the `.crate` file; the index carries no signature

## Revision log

### 2026-08-14 — wave 5: starlark, rmcp, provenance

**Sub-artifacts folded:** `rust-ecosystem/starlark-cluster.md`,
`rust-ecosystem/rmcp-cluster.md`, `rust-ecosystem/provenance-verification.md`.
The first two close the cluster half of open question #2, which commissioned
them by name. The third was commissioned outside this file's open-questions
list; it answers a question nobody had written down, and its own frontmatter
says the axis is "owned by neither" ecosystem nor security.

**IDs added — ECO-44…ECO-54 (eleven).** Numbering continues from ECO-43, the
actual high-water mark in this file.

| ID | What | From |
|---|---|---|
| ECO-44 | The zero-`use`-site carve-out: two conditions, both empirically checkable | starlark |
| ECO-45 | Machine-readable `cargo-shear` allowlist, never a prose comment | starlark |
| ECO-46 | An embedded interpreter is a parser, not a sandbox | starlark |
| ECO-47 | An interpreter upgrade that closes a limit gap ships the call sites | starlark |
| ECO-48 | An archived `repository` URL is a stale pointer, not a death certificate | starlark |
| ECO-49 | MCP tool results go through the render-boundary sanitizer | rmcp |
| ECO-50 | Feature-gated duplicate stacks are a CI assertion, not a comment | rmcp |
| ECO-51 | A dated deferral is void the moment its named trigger fires | rmcp |
| ECO-52 | A protocol-SDK major bump is a wire-surface review | rmcp |
| ECO-53 | Verification is identity-scoped, fail-closed, in the pull path | provenance |
| ECO-54 | Do not design against ghcr.io's referrers endpoint | provenance |

**IDs changed in place — two.**

- **ECO-42** — rationale and verification both rewritten. The old text asserted
  that the `starlark_syntax`/`starlark_map`/`starlark_derive` trio "exists only
  to force resolver version-consistency behind a sealed supertrait" and that all
  four of ocx's unique shear findings resolve to "allowlist, never delete." The
  starlark dive disproved both empirically: emptying all three manifests
  compiles clean with all three still resolving at an identical `0.13.0`, and
  the supertrait mechanism belongs to `allocative` (which shear does not flag)
  and not to the trio. The finding set is also now five unique crates, and
  `glob` among them is a real deletion. The rule's *conclusion* for the trio is
  unchanged; its stated mechanism and its verification were wrong and are now
  right, with the test itself delegated to ECO-44.
- **ECO-03** — verification clause extended. It told a reader to check the
  GitHub repo for an "Archived" banner, full stop. Applied to `allocative` that
  produces a false hard stop: the banner is real, the crate is alive and
  publishing from `starlark-rust`'s workspace. The clause now routes an archival
  banner to ECO-48 rather than treating it as a verdict.

**IDs dropped — none.** Every ECO-01…43 keeps its number and its meaning.

**Collisions recorded — six new, plus one structural.**

Six candidate rules from the three dives already exist as published rules and
are listed in the collisions table: resource-limit over-claiming (SEC-32),
render-boundary sanitization (SEC-31, partial — the MCP payload is a boundary it
does not enumerate, so ECO-49 survives), banning `native-tls` if sigstore-rs
lands (SEC-14), absolute-path subprocess spawn for a `cosign` shell-out
(SEC-21/22), digest recompute-and-compare (SEC-19), and `cargo shear` as the
unused-dependency gate (TOOL-05, already recorded in an earlier wave).

**The structural one is not new and is not this wave's to fix, but it is now
load-bearing:** `rules/rust-cargo/crates-of-record.md` carries its own
ECO-01…08 whose meanings do **not** match this file's ECO-01…08. Published
ECO-07 is the phantom-dependency rule; this file's ECO-07 is the rustls
`builder_with_provider` rule. The two namespaces diverged at distillation time
and both are cited in prose. Consequence for this wave: the "ECO-07 needs a
carve-out" instruction resolves against the *published* ECO-07, not this file's,
and the fix is an amendment to `crates-of-record.md` — item 1 on the promotion
list. Consequence going forward: any cross-file ECO reference must name the file
it means. `crates-of-record.md` also advertises "the 54-rule ECO set", which was
an over-count of a 43-rule file until this wave; it is now accurate.

## Promotion list for published rules

Ranked by what an agent does wrong today without the line. Cut from the bottom:
`crates-of-record.md` is at 107 of its 170-line ceiling and has room for all of
this; `security.md` (171) and `rust-cargo.md` (187 incl. frontmatter) are at or
past theirs, so **every nomination targeting those two is an in-place edit that
adds no lines.**

1. **ECO-07 → `rules/rust-cargo/crates-of-record.md` (amend in place, keeps its
   ID).** Highest, and the only one that is actively dangerous unfixed: the
   published rule says delete, and the correct action for three of ocx's five
   shear findings is keep.
   > A crate whose only role is to pin a version for another crate is deleted
   > — *unless* removing it leaves the resolved version unchanged **and** its
   > family publishes from one workspace on one release cadence, in which case
   > it is a deliberate pin and the manifest comment says so. A supertrait bound
   > is not this case: that crate is genuinely required and will have `use`
   > sites. | `cargo shear`, then per survivor empty the manifest line, `cargo
   > check`, and re-run `cargo tree -i <dep>` — an unchanged version plus
   > matching sibling release dates on crates.io is the exemption; anything else
   > is a finding | SHOULD

2. **SEC-31 → `rules/rust-quality/security.md` (amend in place, keeps its ID).**
   Add one boundary to the enumeration. Zero net lines, closes a live spec
   **MUST** violation with the implementation already in the tree.
   > …at the render boundary — the rendered error chain at the top-level stderr
   > exit, every log line, every string entering the TUI, **and every MCP
   > tool-result payload before serialization** — through the single sanitizer
   > SEC-34 defines… | …a second `#[test]` asserts zero `println!`/`eprintln!`/
   > `write!(…stdout`/`Span::raw`/`Line::from`/**`serde_json::to_string` on a
   > report type** sites fed a raw registry field

3. **New table row → `crates-of-record.md` §The Table.** The crate is unnamed in
   any published file today, and its feature pin is a security control.
   > | MCP server SDK | `rmcp` with `transport-io` only | enabling
   > `transport-streamable-http-*`, `server-side-http` or `auth` | Every
   > advisory filed against it is HTTP-transport or OAuth-scoped; stdio is
   > named unaffected. Those features also pull a second `hyper`/`reqwest`/
   > `oauth2` stack past ECO-04 |

4. **New table row → `crates-of-record.md` §The Table.** Same argument: the
   crate is unnamed, and the wrong mental model here is a security one.
   > | Embedded scripting | `starlark`, exact-pinned, with the evaluator treated
   > as a parser | the evaluator's own limit knobs as a sandbox | Upstream's own
   > docs call them best-effort and say to use an OS subprocess for a real
   > bound. The capability surface is the host functions you register, not the
   > language |

5. **ECO-09 → `crates-of-record.md` §Selection Rules (new ID in that file's
   namespace).** The mechanism half of item 1 — without it the carve-out has
   nothing durable to write itself into.
   > An unused-dependency exemption is a `[workspace.metadata.cargo-shear]
   > ignored` entry, never a comment in `Cargo.toml`. A comment is not
   > machine-checked and does not survive an agent running `cargo shear --fix`.
   > | `cargo shear` on a fresh clone reports nothing, and `cargo shear --fix`
   > removes nothing | MUST

6. **New table row → `crates-of-record.md` §The Table.** SEC-32 already says the
   docs must admit the absence; this stops the crate being added on defaults.
   > | Signature verification | none — say so, per SEC-32 | `sigstore =
   > "0.14"` on default features | Its own README says it cannot verify
   > attestations and is unstable before 1.0, and its defaults pull
   > `native-tls`. ghcr.io returns 404 for the referrers endpoint a verifier
   > would discover through |

7. **ECO-10 → `crates-of-record.md` §Selection Rules (new ID in that file's
   namespace).** Cheap, and it is the one way ECO-03's own verification misfires.
   > A `repository` URL that 404s, redirects, or shows an archival banner is a
   > stale pointer, not a death certificate — find where the crate publishes
   > from now before dropping it. | A fresh `updated_at` on the JSON API plus
   > the successor repo listing the crate as a workspace member outranks one
   > archival banner | SHOULD

8. **ECO-11 → `crates-of-record.md` §Selection Rules (new ID in that file's
   namespace).** *First cut.* Generalises item 3, but item 3 already carries the
   concrete case and `cargo deny check bans` genuinely cannot express this.
   > When a dependency gates a duplicate of an already-governed stack behind
   > opt-in features, assert their absence in CI — `bans.deny` catches a crate
   > that is wrongly present, never a feature flag that would make it so. |
   > `cargo tree -e normal -p <dep>` piped through a grep for the governed
   > crates, run as a CI step | SHOULD
