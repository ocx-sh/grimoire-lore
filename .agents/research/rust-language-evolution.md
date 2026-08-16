---
title: Rust Language Evolution — Edition 2024 and Stale-API Recall
topic: rust-language-evolution
model: opus
consolidates:
  - rust-language-evolution/edition-2024-and-stale-api-recall.md
grounded_by:
  - ocx-codebase-audit/errors-async-security.md
  - ocx-codebase-audit/crate-architecture.md
  - ocx-codebase-audit/rules-inventory.md
  - ocx-codebase-audit/skills-agents-inventory.md
date: 2026-08
---

# Rust Language Evolution

## Verdict

1. This group's whole value is one thing: **an agent's Rust recall is dated, and it is confidently dated.** Every rule below is either "check the ground truth before writing" or "do not silence the compiler when the ground truth bites you."
2. The edition-2024 hazards (`static mut` refs, `unsafe_op_in_unsafe_fn`, `unsafe extern`, RPIT capture-all) are already *satisfied* in ocx/grimoire — all four crates plus grimoire are edition 2024 (`ocx/crates/*/Cargo.toml:3-4`, `grimoire/Cargo.toml:4`), grimoire `forbid`s unsafe entirely (`ocx-codebase-audit/errors-async-security.md:73`), zero `static mut` exists, and the one FFI surface already uses `unsafe extern "system"` (`ocx/crates/ocx_shim/src/main.rs:804`). So these rules are **regression guards**, not migration work — and that is exactly how they should be written into agent config.
3. The live, unsatisfied item is suppression hygiene: **181 `#[allow(` against 4 `#[expect(`** across ocx + grimoire source. `#[expect]` (1.81) self-expires; `#[allow]` rots. That gap is the single mechanical thing worth fixing in this group.
4. The second live item is **unsafe-comment coverage at 65-77%** (`errors-async-security.md:73,108`). A hard "every unsafe block has `// SAFETY:`" gate fails ~25-35% of existing sites, so it ships as a *new-code* MUST with a backfill list, not a day-one CI gate.
5. TLS is the highest-consequence area and is currently *correct by deliberate construction*: both projects pin `reqwest = { version = "0.13", default-features = false, features = ["rustls"] }` (`ocx/Cargo.toml:100`, `grimoire/Cargo.toml:49`) with a manifest comment saying the fork's TLS feature was matched precisely so unification yields **one** rustls provider. Protect that with a rule; do not let an agent "simplify" the feature pin.
6. Resolve the ring-vs-aws-lc-rs debate for this project: **accept aws-lc-rs.** The prebuilt-binary matrix is cargo-dist with a native runner or container per target (`dist-workspace.toml:13-14` in both), not a single-host cross-build, so aws-lc-rs's always-required C compiler costs nothing here. Ring would be the answer only under one-host cross-compilation; keep the constraint written down so a future move to `cross`/zig-cc re-opens the decision instead of silently breaking a release.
7. Reject the sub-artifact's blanket framing that public RPIT must always carry `use<...>`. Neither `ocx_lib` nor `grimoire` is published as a library (`topic-map.md` deferred-semver entry), so the capture set has no external blast radius — SHOULD, not MUST, and MUST only if a crate is ever published.
8. Crate-API drift is unfixable by prompting and must be mechanical: the agent reads the version from `Cargo.lock`, then reads the pinned docs. Note the corpus is already a version behind the sub-artifact's own tables — both locks carry `rand 0.10.2`, not 0.9.
9. Declare `rust-version`. Both projects pin an exact toolchain (`rust-toolchain.toml` channel `1.95.0`, `errors-async-security.md:89`) and ocx sets `resolver = "3"` (`ocx/Cargo.toml:2`), but no manifest declares `rust-version` — so the MSRV-aware resolver has nothing to act on. One-line fix, prevents a dependency bump from silently requiring a newer compiler than the pin.
10. Dead-crate bans (`async-std`, `structopt`, `error-chain`, `failure`) are free: none present, `deny.toml` already exists in all three repos (`errors-async-security.md:89`). Add the `[[bans.deny]]` block and it can never regress.

## The ruleset

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| **EVO-1** | Before emitting any edition-gated or version-gated syntax (if-let chains, `gen` blocks, `unsafe extern`, async closures), read `edition` and `rust-version` from the target crate's `Cargo.toml`. | If-let chains are 2024-only and fail with a plain parse error carrying no edition hint, which an agent "fixes" by mangling the logic. | `grep -E '^(edition\|rust-version)\s*=' <crate>/Cargo.toml` before generating; if `edition < 2024`, no let-chains. | MUST |
| **EVO-2** | Never add `#[allow(static_mut_refs)]`, `#[allow(unsafe_op_in_unsafe_fn)]`, or `#[allow(missing_unsafe_on_extern)]` to make an edition-2024 error go away. | Those lints exist to surface instant-UB or ambiguous unsafe scope; allowing them preserves the exact defect the edition change was designed to expose. | `git diff \| grep -E '#!?\[allow\((static_mut_refs\|unsafe_op_in_unsafe_fn\|missing_unsafe_on_extern)\)\]'` — any match blocks the merge. | MUST |
| **EVO-3** | No `static mut`. Process-global mutable state is `Atomic*`, `Mutex`/`RwLock`, `LazyLock` (no-arg init), or `OnceLock` (runtime-arg init); `&raw mut`/`&raw const` only for FFI needing a genuine raw pointer. | Soundness of `static mut` requires proving non-aliasing across the whole reentrancy and threading surface — unreviewable. There is no `cargo fix` for this one. | `grep -rn 'static mut ' --include=*.rs` must return nothing. | MUST |
| **EVO-4** | Every new `unsafe {}` block carries a `// SAFETY:` comment naming the invariant it upholds — per block, not per function. | 2024 forces isolating which operation is unsafe; that isolation is wasted without justification at the same granularity. | Enable `clippy::undocumented_unsafe_blocks` in `[lints.clippy]`; existing sites at 65-77% coverage go on a backfill list rather than failing CI on day one. | MUST (new code) / SHOULD (backfill) |
| **EVO-5** | New FFI declares `unsafe extern "C" { … }` with per-item `safe`/`unsafe` markers, and `#[unsafe(no_mangle)]` / `#[unsafe(export_name)]` / `#[unsafe(link_section)]`. | Pre-2024 bare forms do not compile under edition 2024; recalled older examples produce a build break. `cargo fix` fixes syntax but cannot check signature correctness. | `grep -rn '^extern "\(C\|system\)"' --include=*.rs` returns nothing on a 2024 crate; a green build after a mechanical fix still needs a signature read-through. | MUST |
| **EVO-6** | After changing the signature of any function returning `impl Trait`, re-derive what it now captures; add `+ use<…>` where the capture set must be pinned. | 2024 captures every in-scope generic and lifetime implicitly, so a change can tie the return to an input borrow and break callers at *their* call site, not the definition. MUST only for a crate published as a library — internal crates have no external blast radius. | `cargo build` on all dependents after the change; `grep -rn 'impl .*Trait' ` on pub fns to spot unpinned captures. Note RPITIT `use<…>` needs Rust ≥ 1.87. | SHOULD (MUST if the crate is published) |
| **EVO-7** | Suppress a lint with `#[expect(lint, reason = "…")]`, never bare `#[allow]`. Convert an `#[allow]` to `#[expect]` whenever you touch its line. | `#[expect]` warns when the lint stops firing, so suppression cannot silently outlive its cause; `#[allow]` becomes permanent unexamined debt. Live gap: 181 `#[allow(` vs 4 `#[expect(` across ocx + grimoire. | `grep -rc '#\[allow(' --include=*.rs <src>` must trend down; new `#[allow]` in a diff needs an explicit justification in review. | SHOULD |
| **EVO-8** | Use `std::sync::LazyLock`/`OnceLock` for lazily-initialized globals; add `once_cell`/`lazy_static` only for API std lacks (non-`Sync` `OnceCell`, reentrant patterns), with a comment saying which. Never treat `LazyLock` poisoning as recoverable — a panicking init closure poisons every future access forever, unlike `Mutex` (`PoisonError::into_inner`). | Removes an avoidable dependency for the common case, but they are not drop-in equivalents on panic behavior. | `cargo tree -e normal \| grep -E 'once_cell\|lazy_static'` — every direct hit justified or removed; `LazyLock::new` sites with a fallible init need a comment or test covering permanent poisoning. | SHOULD |
| **EVO-9** | Before writing a call into a high-churn crate (`rand`, `thiserror`, `reqwest`, `rustls`, `clap`), read the pinned version from `Cargo.lock` and check the API against that version's docs. Never generate symbol names from memory. | Two rename waves hit `rand` in 13 months (0.9 Jan 2025, 0.10 Feb 2026: `thread_rng`→`rng`, `gen_range`→`random_range`, `distributions`→`distr`, `OsRng`→`SysRng`, `Rng`→`RngExt`). Stale recall arrives phrased as fact, not as a guess. | `grep -A1 '^name = "rand"' Cargo.lock` for the pinned version, then `docs.rs/<crate>/<version>`; stale-name grep: `grep -rnE 'thread_rng\(\)\|\.gen\(\)\|\.gen_range\(\|rand::distributions\|rand::rngs::OsRng' --include=*.rs`. | MUST |
| **EVO-10** | Exactly one rustls crypto provider may be reachable in the dependency graph, and the TLS feature pin is load-bearing — do not "simplify" `default-features = false, features = ["rustls"]` or add a second TLS-using dependency without re-checking. | `CryptoProvider::install_default()` succeeds at most once per process; two providers is a **runtime** failure on the first TLS handshake, invisible to `cargo check`. | `cargo tree -e features -i rustls`, `-i ring`, `-i aws-lc-rs` — confirm one backend is actually *enabled* (lockfile edges include optional deps and prove nothing); plus one test that performs a real TLS handshake, not just a compile. | MUST |
| **EVO-11** | A dependency change that touches the TLS or crypto backend must be validated by the real release target matrix, not a host `cargo check`. | aws-lc-rs always requires a C/C++ compiler; a bump that builds fine on a dev box breaks only in the target job that lacks `cc`. Today's matrix is per-target native runners/containers, so this holds — a future move to single-host cross-compilation (`cross`, zig-cc) re-opens the ring-vs-aws-lc-rs decision. | Run the full `dist-workspace.toml` target list in CI on the PR that bumps the dependency; a host-only green check is not evidence. | MUST |
| **EVO-12** | Ban `async-std`, `structopt`, `error-chain`, and `failure` in `deny.toml`'s `[[bans.deny]]`. | All four are discontinued or superseded upstream; a transitive upgrade could reintroduce one silently. Zero cost — none are present today and `deny.toml` already exists in all three repos. | `cargo deny check bans` in CI; `cargo tree -i <crate>` to locate the path if it fails. | SHOULD |
| **EVO-13** | Wrap every `std::env::set_var`/`remove_var` in `unsafe` *and* serialize it — one owning test, a mutex-guarded helper, or `#[serial]`. Never in a parallel test body without a guard. | These became `unsafe fn` in 1.85 for all editions because concurrent env mutation is a genuine data race; adding the `unsafe` keyword alone silences the compiler without removing the race. | `grep -rn 'env::\(set_var\|remove_var\)' --include=*.rs` — every hit sits inside a documented single-owner or serialization convention. | MUST |
| **EVO-14** | Any crate invoking `#[derive(thiserror::Error)]` lists `thiserror` as its own direct dependency; use unraw field names (`{type}`, not `{r#type}`) in `#[error("…")]`. | thiserror 2.0 dropped transitive-derive support and raw-identifier interpolation; a re-exported derive no longer compiles. | For each crate: `grep -rl 'thiserror::Error\|derive(Error' src/` implies `grep -q '^thiserror' Cargo.toml`. | MUST |
| **EVO-15** | Declare `rust-version` in the manifest, matching the pinned `rust-toolchain.toml` channel. | With `resolver = "3"` (default on edition 2024) the MSRV-aware resolver only avoids too-new dependency versions if an MSRV is declared; absent it, a routine `cargo update` can pull in a crate needing a newer compiler than the pin. | `grep -n '^rust-version' Cargo.toml` returns a value equal to the `rust-toolchain.toml` channel. | SHOULD |

## Applied to OCX

**Satisfied (keep as regression guards, no work):**

- EVO-1/EVO-5: everything is edition 2024 — `ocx/crates/ocx_lib|ocx_cli|ocx_shim/Cargo.toml:4`, `ocx/crates/ocx_schema/Cargo.toml:3`, `grimoire/Cargo.toml:4`. The single FFI surface already uses the 2024 form: `ocx/crates/ocx_shim/src/main.rs:804` (`unsafe extern "system" fn handler`), with a `// SAFETY:` comment at :811.
- EVO-2/EVO-3: zero `static mut`, zero `#[allow(static_mut_refs)]`, zero `#[allow(unsafe_op_in_unsafe_fn)]` across ocx + grimoire source.
- EVO-4 (partly): grimoire is 100% clean via `unsafe_code = "forbid"` at `grimoire/Cargo.toml:79` (`ocx-codebase-audit/errors-async-security.md:35,73`).
- EVO-8: no direct `once_cell`/`lazy_static` dependency in either manifest; 18 source files already use `LazyLock`/`OnceLock`.
- EVO-10 (currently): both pin `reqwest = { version = "0.13", default-features = false, features = ["rustls"] }` — `ocx/Cargo.toml:100`, `grimoire/Cargo.toml:49` — and the ocx manifest comment at `ocx/Cargo.toml:98-99` states the fork's TLS feature was matched deliberately so unification yields one provider. grimoire matches its oci-client fork's `rustls-tls` at `grimoire/Cargo.toml:46`.
- EVO-12: none of the four dead crates appear; `deny.toml` with a documented ignore-list convention already exists in ocx, grimoire, and ocx-mirror (`errors-async-security.md:89`).
- EVO-14: both deriving crates list thiserror directly — `ocx/Cargo.toml:86` (`thiserror = "2.0.18"`), `grimoire/Cargo.toml:34` (`thiserror = "2"`); the two crates containing `derive(Error)` (`ocx_cli`, `ocx_lib`) both declare it.
- EVO-9 (incidentally): both locks already carry `rand 0.10.2`; grimoire additionally pulls a transitive `rand 0.8.7`. Neither declares `rand` directly, so the rename tables matter for review, not for current call sites.

**Violated (real gaps):**

- **EVO-7 — 181 `#[allow(` vs 4 `#[expect(`** across `ocx/crates` + `grimoire/src`. Nothing forces any of those 181 to justify its continued existence. Convert opportunistically, not in one sweep.
- **EVO-4 — unsafe-comment coverage is 65-77%**: 75 unsafe sites / ~50 `// SAFETY:` in the ocx workspace, 46/31 in ocx-mirror (`errors-async-security.md:73`); the audit explicitly warns a hard gate would fail 25-35% of sites today (`errors-async-security.md:108`). Ship EVO-4 as new-code MUST plus a backfill list.
- **EVO-15 — no `rust-version` anywhere**, despite `resolver = "3"` at `ocx/Cargo.toml:2` and an exact `1.95.0` toolchain pin in all three repos (`errors-async-security.md:89`). One line per manifest.
- **EVO-13 — 24 `set_var`/`remove_var` sites**. The audit found the concentrations documented and single-owner-guarded (`ocx_lib/src/oci/host_capabilities.rs:888-921`, precedented at `update_check.rs`) — the gap is that the convention is a convention, not a checked rule.

**New commitments:**

1. Record "aws-lc-rs, because the release matrix is per-target native runners/containers" as an explicit, revisitable decision next to the reqwest pins, so a future switch to single-host cross-compilation reopens it deliberately (`grimoire/dist-workspace.toml:14`, `ocx/dist-workspace.toml:13`, both including musl and Windows msvc targets).
2. Add one runtime TLS smoke test per binary (EVO-10) — the crypto-provider conflict is the only failure mode in this group that a green build cannot rule out, and both tools' primary job is authenticated HTTPS to ghcr.io.
3. Verify the ring edge is genuinely unbuilt: both locks list `ring` as a dependency of `quinn-proto` and `rustls-webpki`, which lockfile edges include whether or not the feature is enabled. Confirm once with `cargo tree -e features -i ring`; if it *is* enabled, EVO-10 is violated today.
4. Enable `clippy::undocumented_unsafe_blocks` in `ocx`'s `[workspace.lints.clippy]` — currently a documented placeholder with no entries (`ocx/Cargo.toml:223-228`) — at `warn`, escalating to `deny` once the backfill list is empty.

## AI-agent failure modes

Ranked by how often it bites:

1. **Stale crate-API recall, delivered as fact.** The agent writes `rand::thread_rng()`, `gen_range`, `rand::distributions::Standard`, or a reqwest 0.11-era builder chain with no hedging. Highest frequency by a wide margin, and prompting does not fix it — only "read `Cargo.lock`, then read that version's docs" (EVO-9) does.
2. **Silencing the compiler to close the diff.** The error is real (`static_mut_refs`, `unsafe_op_in_unsafe_fn`, a clippy correctness lint); the shortest path to green is `#[allow]`, so that is what gets written. This is why EVO-2 is a grep on the diff and not a judgment call, and why EVO-7 exists at all — 181 existing `#[allow]`s are a standing invitation to add the 182nd.
3. **Edition-gated syntax with no edition check.** Writing an if-let chain into a 2021 crate yields a parse error with no edition hint, and the agent "fixes" it by restructuring correct logic. Low risk in *this* project (everything is 2024) but high in any port or vendored fork — and the forks under `[patch.crates-io]` are exactly that surface.
4. **Treating `cargo check` as proof.** Crypto-provider conflicts (runtime), cross-target C-toolchain gaps (other machine), and env-var races (other thread) are all invisible to it. An agent with no human in the loop will report success from a host build.
5. **Feature-pin "simplification".** `default-features = false, features = ["rustls"]` looks redundant to an agent that does not know feature unification exists; deleting it merges two providers into one binary and fails at the first handshake. The manifest comments at `ocx/Cargo.toml:98-99` are the mitigation — an agent must read the comment above a dependency before editing the line.
6. **Assuming unstable means available.** `gen { … }` blocks are still unstable despite the reserved keyword; an agent that saw the reservation in a changelog may assume stabilization followed.
7. **Blanket modernization.** "Replace `once_cell` with `LazyLock`" applied without checking whether the panic-poisoning semantics matter, or whether the non-`Sync` `OnceCell` API was the reason for the dependency.

## Open questions

- **Deserves another research round — Cargo workspace and manifest hygiene**, the topic-map's own highest-ranked deferred item, scoped to the half no other wave owns: *feature unification across workspace members* (enabling a feature for one binary silently changes a sibling's build — directly load-bearing for the TLS pins in EVO-10), *resolver-3 MSRV-aware selection* once EVO-15 lands, and *additive-feature design* for the `[patch.crates-io]` forks. This group only touched feature unification through the single TLS instance; the general rule is unwritten.
- **Deserves another research round — an offline API-currency protocol.** EVO-9 says "read the pinned version's docs", but an autonomous agent frequently has no network. What is the substitute — a vendored `cargo doc --offline` output, a `~/.cargo/registry` source read, a checked-in API digest per high-churn crate? Without an answer, EVO-9 degrades into "try to remember harder", which is the failure mode it exists to prevent.
- **Unsafe-code depth is a named audit gap** (`rules-inventory.md:1050-1053`: no guidance on minimizing unsafe surface, Miri, `#[repr(C)]`/ABI stability, sound-wrapper design). This group covers only the edition-2024 *syntax* of unsafe. The ~25-site WinAPI shim in `ocx_shim` is a real unsafe surface that no rule currently reviews beyond "has a SAFETY comment". Worth a round only if the shim grows or a second FFI surface appears.
- Is `async_trait` (80 ocx_lib + 28 grimoire hits, `errors-async-security.md:57,106`) still needed for `dyn`-safety, or is it removable now that async-fn-in-trait is stable? Cheap to answer by reading one trait's use sites; not worth a research round.
- Should EVO-6 become a MUST? Only if any crate is ever published to crates.io. Trigger, not a question.
- The sub-artifact's `rand` and `reqwest` tables will be stale within a year — rand renamed twice in 13 months. The tables' durable value is the *habit* (EVO-9), not the entries; date-stamp them and do not treat them as a lookup of record after mid-2027.

## Sub-artifacts

- [rust-language-evolution/edition-2024-and-stale-api-recall.md](rust-language-evolution/edition-2024-and-stale-api-recall.md) — the sole source artifact: every edition-2024 breaking change with migration recipes, the post-cutoff stabilization table (1.80 `LazyLock` → 1.88 let-chains), full rename tables for rand 0.9/0.10, thiserror 2, reqwest 0.12/0.13, and the rustls crypto-provider/cross-compilation analysis.

## Key sources

1. [Rust 1.85.0 release announcement](https://blog.rust-lang.org/2025/02/20/Rust-1.85.0/) — edition 2024 ships; `static_mut_refs`, `unsafe_op_in_unsafe_fn`, `unsafe extern`, `env::set_var` unsafe, async closures, all in one primary source.
2. [Rust 2024 Edition Guide index](https://doc.rust-lang.org/edition-guide/rust-2024/index.html) — canonical enumeration of every breaking change.
3. [Edition guide: static mut references](https://doc.rust-lang.org/edition-guide/rust-2024/static-mut-references.html) — the migration ladder for EVO-3; no automated fix exists.
4. [Edition guide: unsafe_op_in_unsafe_fn](https://doc.rust-lang.org/edition-guide/rust-2024/unsafe-op-in-unsafe-fn.html) — before/after and `cargo fix --edition` behavior.
5. [Edition guide: unsafe extern](https://doc.rust-lang.org/edition-guide/rust-2024/unsafe-extern.html) — exact `unsafe extern` / `#[unsafe(no_mangle)]` syntax for EVO-5.
6. [Edition guide: RPIT lifetime capture](https://doc.rust-lang.org/edition-guide/rust-2024/rpit-lifetime-capture.html) — capture-all semantics and `use<…>` for EVO-6.
7. [rust-lang/rust RELEASES.md](https://raw.githubusercontent.com/rust-lang/rust/master/RELEASES.md) — per-version stabilization ground truth (1.87 RPITIT precise capturing, 1.88 let-chains).
8. [Rust 1.88.0 release announcement](https://blog.rust-lang.org/2025/06/26/Rust-1.88.0/) — let-chains and why they are 2024-only; the trap behind EVO-1.
9. [Rust 1.81.0 release announcement](https://blog.rust-lang.org/2024/09/05/Rust-1.81.0/) — `#[expect]` stabilization and rationale, the basis of EVO-7.
10. [std::sync::LazyLock docs](https://doc.rust-lang.org/std/sync/struct.LazyLock.html) — stabilization version and the unrecoverable-poisoning contrast with `Mutex` (EVO-8).
11. [rust-random/rand CHANGELOG](https://github.com/rust-random/rand/blob/master/CHANGELOG.md) — the 0.9 and 0.10 rename tables behind EVO-9.
12. [thiserror 2.0.0 release notes](https://github.com/dtolnay/thiserror/releases/tag/2.0.0) — direct-dependency requirement and dropped `{r#type}` interpolation (EVO-14).
13. [rustls CryptoProvider docs](https://docs.rs/rustls/latest/rustls/crypto/struct.CryptoProvider.html) — `install_default()` once-per-process contract; the runtime-failure mechanism behind EVO-10.
14. [reqwest CHANGELOG](https://raw.githubusercontent.com/seanmonstar/reqwest/master/CHANGELOG.md) — verbatim 0.13.0 breaking changes, including rustls-by-default and aws-lc-rs.
15. [aws-lc-rs build requirements](https://aws.github.io/aws-lc-rs/requirements/) — the always-required C compiler underlying EVO-11.
16. [cargo-deny bans configuration](https://embarkstudios.github.io/cargo-deny/checks/bans/cfg.html) — exact `[[bans.deny]]` syntax for EVO-12.
