---
title: "Errors, Async, Concurrency, I/O, Security, Observability — OCX Codebase Audit"
agent: inv-runtime
model: sonnet
scope: >
  /home/mherwig/dev/ocx/crates/{ocx_cli,ocx_lib,ocx_schema,ocx_shim}/src,
  /home/mherwig/dev/grimoire/src, /home/mherwig/dev/ocx-mirror/src,
  /home/mherwig/dev/ocx-mirror/crates/ocx_python/src.
  external/ vendored code (rust-oci-client, docker_credential, ocx-mirror's
  external/ocx submodule) noted only, not audited line-by-line.
method: >
  Read/Grep/Bash only, no modifications. Raw counts via grep; unwrap/expect/
  panic!/todo!/unimplemented!/unreachable! counts split into production vs.
  test code with a Rust-aware (string/char/raw-string/comment aware) brace
  scanner that strips `#[cfg(test)] mod { ... }` blocks and `tests.rs` /
  `tests/` files before counting, since a naive grep is >95% test noise in
  every one of these crates. Qualitative sections built from targeted greps
  and direct file reads of the highest-signal hits.
---

# Errors, Async, Concurrency, I/O, Security, Observability

## Headline counts (production code only; test counts in parentheses)

| Crate | files | unwrap() | expect( | panic!( | unimpl!( | unreach!( | unsafe{} | SAFETY: comments |
|---|---|---|---|---|---|---|---|---|
| ocx_cli | 131 | 1 (146) | 18 (301) | 0 (34) | 0 | 5 (0) | 0 | — |
| ocx_lib | 283 | 11 (4913) | 78 (1884) | 11 (384) | 2 (22) | 4 (1) | ~60 | ~45 |
| ocx_schema | 2 | 0 | 2 (30) | 0 (3) | 0 | 0 | 0 | — |
| ocx_shim | 3 | 0 | 0 (14) | 0 (3) | 1 | 0 | ~15 | ~5 |
| grimoire | 199 | 9 (3391) | 22 (934) | 0 (110) | 2 (1) | 18 (26) | **0** | n/a |
| ocx-mirror/src | 205 | 13 (976) | 19 (633) | 0 (147) | 0 (4) | 0 | 46 | 31 |
| ocx_python | 9 | 0 | 4 (73) | 0 (13) | 0 | 0 | 1 | — |

`grimoire` sets `unsafe_code = "forbid"` at the lint level (`grimoire/Cargo.toml:79`) and `unwrap_used`/`expect_used = "warn"` scoped to non-test code — matches the near-zero production count. `ocx` crates have no equivalent lint gate but the ratio (production unwrap/expect is 1-3% of the raw grep total) shows the same discipline is followed by convention, not enforced by clippy.

## ERRORS

**1. Error type strategy.** All four `ocx` crates + `grimoire` + `ocx_python` use `thiserror` (2.0.18) for domain errors; `anyhow` is reserved for the CLI-boundary/`main.rs` catch-all (`ocx_cli/src/main.rs:18`, `grimoire` `app::run` return type). `ocx-mirror/src` is the outlier: **zero thiserror derives**, `anyhow::Error`/`anyhow!()` used throughout (15 hits, 10 files) even in library-shaped modules (`pipeline/`, `command/`) — no typed domain error enum anywhere in `ocx-mirror/src`. No snafu/miette/eyre anywhere.

`ocx_lib` has 15 files literally named `error.rs` (one per subsystem: `oci`, `package`, `publisher`, `project`, etc.) — a consistent per-module error-enum convention. `#[non_exhaustive]` is used heavily (82 hits in ocx_lib, 66 in grimoire, only 4 in ocx-mirror/src, 0 in ocx_schema/ocx_shim) — the fleet-forward-compat posture called out in `ocx/Cargo.toml`'s `serde_ignored` comment extends to error enums. Source chaining via `#[source]`/`#[from]` is well-used in `ocx_lib` (114/43) and `grimoire` (45/23), essentially absent in `ocx-mirror/src` (0/0) and `ocx_schema`/`ocx_shim` (0/0) — consistent with those having no typed errors to chain.

`ocx_lib/src/oci/ssrf.rs:38-68` is a good example of the house style: `#[non_exhaustive] enum SsrfError` with `#[source]` on the I/O variant, plus a separate `ClassifyExitCode` trait impl mapping each variant to a specific process exit code (`ConfigError` vs `Unavailable`) with a one-line rationale comment per arm.

**2. How errors reach the user.** Both `ocx_cli` (`main.rs:18-33`) and `grimoire` (`main.rs:136-197`) converge all failures to one boundary: format with the alternate/chain flag (`{err:#}`), classify to an exit code, write once to stderr. **Divergence found**: `ocx_cli/src/main.rs:20-27` explicitly neutralizes the rendered chain through `api::data::sanitize_for_terminal` (`ocx_cli/src/api/data.rs:164`) before printing, with an explicit CWE-150 comment ("a cause chain quotes names read off wire documents and filesystem walks... tracing-subscriber passes `\n`, `\r`, NUL and the whole `Cf` bidi set straight to the terminal") and a structural regression test pinning that the sanitizer call survives refactors (`main.rs:39-60`). `grimoire/src/main.rs:191` writes `{err:#}` straight to `io::stderr()` with **no equivalent sanitization at this boundary** — `sanitize_for_terminal`-style helpers exist in grimoire only inside TUI code (`tui/bundle_members.rs`, `tui/tree.rs`), not at the top-level error exit. Given grimoire's error chains also include untrusted names (skill/package identifiers pulled from a registry), this is the same CWE-150 surface ocx_cli explicitly defends against.

## ASYNC / CONCURRENCY

**3. Runtime.** tokio 1.52 `features = ["full"]` pinned identically across `ocx` workspace, `grimoire`, and `ocx-mirror`. `ocx_cli/src/main.rs:17` and `ocx-mirror/src/main.rs:29` use `#[tokio::main]` (default multi-thread flavour, confirmed by comment at `ocx_lib/src/script.rs:190`). `grimoire/src/main.rs` deliberately does **not** use the attribute macro — it builds `tokio::runtime::Runtime::new()` manually at `main.rs:165` so a runtime-construction failure can be reported through the same `emit_error_document`/exit-code path as any other error (`main.rs:166-175`), rather than panicking before `main` body execution. This is a real, motivated pattern difference, not an oversight.

`JoinSet` is the standard fan-out primitive (95 hits ocx_lib, 27 grimoire, 5 ocx-mirror) — bare `tokio::spawn` is comparatively rare (26/4/7) and mostly single fire-and-forget tasks. `tokio::select!` appears only in `ocx_lib` (4 hits, all in `forge/poll.rs`-style bounded polling). `spawn_blocking` (81 ocx_lib / 16 grimoire / 9 ocx-mirror) is the disciplined escape hatch for sync primitives — see `ocx_lib/src/utility/fs.rs:22-26` doc comment naming exactly which sync APIs (`FileLock::lock_exclusive_blocking_with_timeout`) are meant to run inside `spawn_blocking`. `block_in_place` appears only in `ocx_lib`/`ocx_cli` (20/7), never in grimoire or ocx-mirror.

**Blocking-in-async smell**: the async-fn ∩ `std::fs::*` file overlap is large (76 files ocx_lib, 25 grimoire, 39 ocx-mirror) — this is a heuristic upper bound (a file can have both an async fn and an unrelated sync helper), not a confirmed defect count, but it's large enough that a targeted follow-up pass (grep for `std::fs::` calls that are lexically inside an `async fn` body, not just co-located in the file) would be worth doing before writing a lint rule.

`tokio::time::timeout` is used sparingly and asymmetrically: 22 hits in ocx_lib, 2 in grimoire, 5 in ocx-mirror — grimoire's near-absence of explicit timeouts on its (fewer) network-touching paths is worth a closer look.

**4. Concurrency primitives.** `Arc<...>` is heavy everywhere (116/150/8). `std::sync::Mutex` (not tokio) is the dominant lock type — 17 in ocx_lib, 21 in grimoire, 8 in ocx-mirror, vs. **zero** `tokio::sync::Mutex` anywhere in any of the three codebases. This is a deliberate, consistent choice (std Mutex + short critical sections, not held across `.await`) rather than an accidental blocking-lock smell — no `MutexGuard` was observed held across an `.await` point in the sampled files, but a full await-span-vs-guard-lifetime check was not exhaustively run across all 700+ files and would need a proper AST pass (clippy's `await_holding_lock` lint, if not already enabled, would catch this mechanically — worth checking clippy.toml/lint config in a follow-up). `RwLock` is ocx_lib-only (25 hits); grimoire and ocx-mirror don't use it. `async_trait` is still in use (80 ocx_lib, 28 grimoire, 0 ocx-mirror) despite `tokio`/edition-2024 async-fn-in-trait being viable — likely for object-safety (`dyn Trait`) reasons; worth confirming before flagging as legacy-removable.

**5. Structured concurrency / shutdown.** `.abort()`/`CancellationToken` usage is thin (13 hits total across all three). `grimoire/src/tui/update_check.rs:132-232` is the best-documented shutdown-discipline example: a `JoinSet<()>` drained non-blockingly each tick with an explicit comment on why it must not accumulate completed handles. No SIGINT/SIGTERM signal handling was found in grimoire or ocx-mirror; `ocx_lib` has 2 hits (both `ctrl_c`-adjacent, in `oci/host_capabilities.rs`-area — not deeply investigated). No process-wide graceful-shutdown coordinator (no `CancellationToken` fanned out from a single root) was found in any of the three codebases — shutdown is per-subsystem, ad hoc.

## I/O & FS

**6. Filesystem discipline.** `tempfile`/`NamedTempFile` usage is universal and heavy (90/70/52 files). Atomic-write-via-persist/rename is well-represented in `ocx_lib` (31 hits) and `grimoire` (19), but **zero** `.persist(`/`fs::rename` hits in `ocx-mirror/src` — it does not appear to do its own atomic-write-then-rename I/O (plausible: it's an orchestrator over `ocx_lib`'s file primitives via the `external/ocx` path dep, so the primitive lives one hop away — not necessarily a gap, but unverified from `ocx-mirror/src` alone). Explicit permission bits (`0o600`/`0o700`/`set_permissions`) appear 70×/35×/35× — credential and lock files are the typical targets (confirmed by co-location with `docker_credential`/`secrecy` hits).

`grimoire/src/path_safety.rs:1-52` is the standout artifact for this section: a two-layer containment guard (Layer 1: reject `ParentDir`/`RootDir`/`Prefix` components pre-filesystem; Layer 2: canonicalize both sides and `starts_with`-check when the candidate exists) with an explicit, named **residual-risk doc comment** — it states the TOCTOU window (CWE-367) that remains when the candidate doesn't yet exist, why it's accepted (publish trusts the local operator's tree), and what would close it if the threat model changes. This is exactly the shape a "document your accepted risk" rule should require. `install/path_anchor.rs`'s `AnchoredPath::resolve` is the install-side sibling with a *stricter* contract (rejects `CurDir` too) — the doc comment on `path_safety.rs` explicitly calls out the divergence and why it must not be silently unified.

`ocx_lib/src/archive/error.rs:26-29` names path-traversal-via-tar-entry and symlink-escape as distinct, dedicated error variants — the archive-extraction module has typed zip-slip defenses rather than an ad hoc check (see §7).

## SECURITY

**7. `unsafe`, FFI, process spawning, SSRF, TLS, digests, archives.**

- **`unsafe` justification**: ocx workspace 75 `unsafe` sites / ~50 `// SAFETY:` comments; ocx-mirror/src 46 sites / 31 comments (`crates/ocx_python` has 1 unsafe site, unchecked). Ratio is consistently in the 65-77% commented range — not 100%, but far from undocumented. Concentrations: `ocx_shim/src/main.rs` (Windows job-object/process-creation FFI, ~25 sites — inherent to being a WinAPI process-launcher shim, not a smell); `ocx_lib/src/oci/host_capabilities.rs:888-921` (test-only `std::env::set_var`/`remove_var` under Rust 2024's now-unsafe env mutation, guarded by a documented single-owning-test convention, precedented elsewhere at `update_check.rs`); `ocx_lib/src/oci/index/file_transport.rs:1037-1049` (`libc::mkfifo`, one clean `// SAFETY:` comment, test-only). **grimoire has zero `unsafe` blocks** (`unsafe_code = "forbid"` — confirmed by direct grep for `unsafe {`/`unsafe fn`/`unsafe impl`, all zero; the earlier raw "unsafe " grep hit was doc-comment prose, not code).

- **SSRF**: `ocx_lib/src/oci/ssrf.rs` is a dedicated, well-designed guard against index-controlled registry hosts resolving to loopback/private/link-local/metadata addresses. Notably resolves-and-pins at **connect time**, not just hostname string matching — explicitly designed against DNS rebinding via a `reqwest::dns::Resolve` hook (`GuardedResolver`) that re-validates every address the resolver returns, closing the resolve→connect TOCTOU window. `trusted_hosts` is a named, scoped escape hatch (per-registry, not global). No equivalent module was found in `grimoire` or `ocx-mirror` — worth checking whether either fetches registry/index URLs from remote-controlled config the way ocx does (if so, this is a genuine gap, not just an absence).

- **TLS**: `grimoire/src/tls.rs` (and the identical pattern documented in `ocx`'s workspace deps comment for `webpki-root-certs`) merges compiled-in Mozilla roots as *extra* roots (`tls_certs_merge`, not `tls_certs_only`) specifically so `SSL_CERT_FILE`/`SSL_CERT_DIR` overrides keep working — avoids the common footgun of embedded-roots-only TLS that breaks corporate MITM proxies. Backed by two regression tests (non-empty embedded set; DER→`reqwest::Certificate` projection is total, not lossy).

- **Digests/checksums**: `sha2`/`Sha256` used broadly (65 files ocx_lib, 47 grimoire, 19 ocx-mirror); dedicated digest-mismatch error variants exist in 25/8/4 files respectively — this is systematic, not ad hoc.

- **Tarball extraction / zip-slip**: dedicated typed errors for both path-traversal-via-entry and symlink-escape in `ocx_lib/src/archive/error.rs`; grimoire's `install/materializer.rs` has an equivalent `MaterializeFailed` classification for "corrupt or unsafe archive."

- **Process spawning**: `Command::new`/`tokio::process::Command` used in all four crates (counts in the 3-23 range per crate); did not find evidence of shell-string interpolation (`sh -c "{user_input}"`) in the sampled hits — the `.shell(` grep hits were mostly variant/parity test fixtures and shell-detection logic (`ocx_lib/src/shell.rs`), not command construction via string concatenation. Not exhaustively verified per call site.

- **Secrets**: `secrecy::Secret`/`SecretString` used in ocx_lib (2 files) and grimoire (6 files); `docker_credential` write path (`store_credential`/`erase_credential`) used for `grim login`/`ocx login`. No token/password/secret values found flowing into `log::info!`/`debug!`/`warn!` calls in a targeted grep across ocx_lib and grimoire (0 hits) — clean.

- **Signature verification (cosign/sigstore)**: no hits anywhere in any of the three codebases. If package/image signing verification exists, it isn't implemented in these crates (or the audit's grep terms missed a differently-named implementation) — worth a follow-up question rather than assuming it's absent.

- **Supply chain**: `deny.toml` present in ocx, grimoire, ocx-mirror with a shared `[advisories]` ignore-list convention (every ignored RUSTSEC ID has an inline "REMOVE when `cargo tree -i X` is empty" comment naming the exact removal condition). `rust-toolchain.toml` pins `1.95.0` identically across all three (MSRV = pinned exact channel, not a floor). cargo-audit/cargo-deny wired into CI for all three (`verify-licenses.yml`, `verify-basic.yml`, `release.yml`).

## OBSERVABILITY

**8. Logging/tracing.** `tracing`/`tracing-subscriber` (env-filter, fmt, json, registry features) is the shared stack. **Zero `#[instrument]` usage anywhere** across all three codebases — spans, if used, are constructed manually rather than via the attribute macro (not confirmed either way; `#[instrument]` absence doesn't mean spans are absent, just that this specific ergonomic form isn't used). Call-site density is uneven: 173 tracing calls in grimoire/src vs. 33 in ocx_lib/src vs. only 20 in ocx-mirror/src despite ocx-mirror being tokio-based with real subprocess/network orchestration — and **ocx-mirror/src has no `tracing_subscriber` init site at all** (grep came back empty), meaning either its `tracing` dependency is unused/vestigial in `src/` (init lives in `ocx_python` or the vendored `external/ocx` instead) or output goes through a different, uninstrumented channel — worth a direct follow-up (`grep -rn tracing_subscriber /home/mherwig/dev/ocx-mirror` beyond `src/`). `ocx_cli` routes user-facing output through `ocx_lib::log` (a wrapper, `log::error!` etc., not raw `tracing::error!`) — this is the crate that carries the CWE-150 terminal-sanitization discipline (§2), consistent with "user-facing output goes through the logger" being a deliberate, single-seam design in `ocx`.

---

## Smells and risks (ranked)

1. **[HIGH] Untrusted error-chain text reaches grimoire's terminal unsanitized.** `grimoire/src/main.rs:191` (`writeln!(io::stderr(), "{err:#}")`) has no equivalent to `ocx_cli/src/api/data.rs:164`'s `sanitize_for_terminal`, despite `ocx_cli`'s own comment explicitly naming this as a CWE-150 terminal-injection surface (error chains quote names read from wire documents / filesystem walks; `tracing-subscriber` passes control chars and bidi overrides straight through). grimoire pulls package/skill names from a registry the same way `ocx` pulls index data — same threat model, missing mitigation at the same boundary.
2. **[MED] `ocx-mirror/src` has no typed domain errors.** Zero `thiserror` derives; `anyhow::Error`/`anyhow!()` used even in library-shaped `pipeline/`/`command/` modules. Loses the `#[non_exhaustive]`/`ClassifyExitCode`-style exit-code mapping the sibling crates use, and callers can't match on error kind.
3. **[MED] `ocx-mirror/src` has no `tracing_subscriber` init site despite depending on `tracing`.** Either dead weight or output is routed through an unaudited path — needs a direct follow-up, not assumed benign.
4. **[MED] No signature verification (cosign/sigstore) found anywhere.** Either genuinely absent (supply-chain gap for a package manager whose whole job is distributing OCI artifacts) or implemented under different naming this audit's greps missed — needs a direct confirm/deny before any rule assumes coverage.
5. **[LOW-MED] `tokio::time::timeout` is nearly absent from grimoire (2 hits) relative to its network surface** (registry fetches, OCI pulls) vs. ocx_lib's 22 — unbounded-wait risk on a slow/hostile registry, unconfirmed without tracing actual call sites.
6. **[LOW-MED] Blocking-in-async heuristic hit count is large** (76/25/39 files with async fn + `std::fs::*` co-located) — not confirmed defects, but large enough to warrant a precise (AST- or clippy-`unused_must_use`/`await_holding_*`-driven) follow-up before writing a "no sync fs in async fn" rule off this number alone.
7. **[LOW] `MutexGuard`-across-`.await` was not exhaustively verified** despite std (not tokio) `Mutex` being the dominant lock type in all three codebases (46 combined hits) — worth turning on/confirming clippy's `await_holding_lock` lint rather than relying on this sample.
8. **[LOW] `async_trait` still used at scale (80/28 hits)** in ocx_lib/grimoire despite edition-2024 async-fn-in-trait being available — likely intentional for `dyn Trait` object safety, but worth a one-line confirmation before a rule either blesses or bans it.
9. **[LOW] No process-wide graceful-shutdown coordinator** (`CancellationToken` fanned from one root) in any of the three codebases; shutdown is per-subsystem/ad hoc, with `.abort()`/`CancellationToken` at only 13 combined hits.
10. **[INFO] Unsafe-comment coverage is 65-77%, not 100%**, across the two crates that use `unsafe` at all (ocx workspace, ocx-mirror) — not a defect (grimoire is 100% via `forbid`), but a rule requiring `// SAFETY:` on every unsafe block would currently fail on ~25-35% of existing sites and needs a grandfather/backfill plan, not a hard gate from day one.

## Patterns worth encoding as rules

1. **Terminal-sanitize the error chain at the single top-level exit boundary** — `ocx_cli/src/main.rs:20-33` + `api/data.rs:164` (`sanitize_for_terminal`) is the reference implementation, including the *structural* regression test (`main.rs:39-60`) that greps `main.rs`'s own source for the sanitizer call so a refactor can't silently drop it. Should be a required pattern, and grimoire's boundary should be brought up to parity (see Smell #1).
2. **One error enum per subsystem, named `error.rs`, `#[non_exhaustive]`, `#[source]`-chained, paired with a `ClassifyExitCode`-style exit-code mapping** — the `ocx_lib` convention (15 `error.rs` files) plus `ssrf.rs:38-68`'s `SsrfError`/`ClassifyExitCode` pairing is the clean reference shape. `#[non_exhaustive]` used specifically so a payload written for a newer binary version degrades gracefully on an older one (documented rationale in `ocx/Cargo.toml`'s `serde_ignored` comment — same forward-compat philosophy applied to errors).
3. **Document accepted residual risk inline, by name, with the CWE number and the condition that would require closing it** — `grimoire/src/path_safety.rs:1-29`'s two-layer containment guard + explicit TOCTOU (CWE-367) doc comment is the reference. A rule could require: any "check-then-use" path pattern gets a doc comment naming the window and the accept/reject rationale.
4. **SSRF: resolve-validate-pin at *connect* time via a custom `reqwest::dns::Resolve`, not a hostname string check** — `ocx_lib/src/oci/ssrf.rs` is directly reusable as the reference design for any crate that dereferences remote-controlled URLs (index/registry pointers, webhook targets, etc.). Should be mandatory wherever a config value or wire document supplies a host to connect to.
5. **TLS: merge embedded roots, never replace** (`tls_certs_merge`, not `tls_certs_only`) so a corporate `SSL_CERT_FILE`/`SSL_CERT_DIR` override keeps working — `grimoire/src/tls.rs` reference, with regression tests asserting the embedded set is non-empty and the DER→certificate projection is total.
6. **Typed archive-extraction errors that name path-traversal and symlink-escape as distinct variants**, not a generic "extraction failed" — `ocx_lib/src/archive/error.rs:26-29` / `grimoire/install/materializer.rs`'s `MaterializeFailed`.
7. **`spawn_blocking` reserved for named, documented sync primitives** (e.g., `FileLock::lock_exclusive_blocking_with_timeout`), with the doc comment on the async wrapper explicitly stating which sync API it exists to bridge — `ocx_lib/src/utility/fs.rs:22-33` reference.
8. **`std::sync::Mutex` (not `tokio::sync::Mutex`) for short, non-await-spanning critical sections** is the house convention (zero `tokio::sync::Mutex` in 700+ files across three codebases) — worth encoding explicitly as "prefer std Mutex; if you reach for tokio's, that's a signal the critical section is too big" rather than leaving it implicit.
9. **Every ignored supply-chain advisory carries an inline machine-checkable removal condition** (`# REMOVE when 'cargo tree -i X' is empty after Y`) — `deny.toml`'s `[advisories].ignore` convention, identical across ocx and ocx-mirror. Should be a required comment shape, not just a convention.
10. **Structural (source-text) regression tests for security-critical call sites that a normal behavioral test can't pin** — `ocx_cli/src/main.rs:39-60`'s test reads its own `main.rs` source and asserts the sanitizer call and `{err:#}` token both appear, specifically because the original defect was a *missing* call (silent failure mode) that a positive behavioral assertion wouldn't have caught. Worth generalizing as a rule for "boundary that must not silently lose a security-relevant call during refactor."
