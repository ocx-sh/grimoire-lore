---
title: Lints, Toolchain Policy, CI and Release Engineering
topic: rust-tooling-ci
model: opus
consolidates:
  - rust-tooling-ci/lints-and-toolchain-policy.md
  - rust-tooling-ci/ci-release-and-distribution.md
  - rust-tooling-ci/lint-rollout-staging.md
date: 2026-08
revised: 2026-08
---

# Lints, Toolchain Policy, CI and Release Engineering

## Verdict

1. **Lint policy lives in `[workspace.lints]`, never in `RUSTFLAGS`.** ocx already reached this
   conclusion independently and wrote the reasoning into `ocx/Cargo.toml:212-221`: `RUSTFLAGS` is
   global and denies *path* dependencies too, which would turn the vendored `oci-client` fork's
   upstream warnings into hard build errors. That argument is correct and generalises.
2. **One denial switch, many `warn` lints.** `[workspace.lints.rust] warnings = "deny"` is the
   single place teeth are added; every individual clippy lint is declared at `warn`. The
   lints sub-artifact proposed per-lint `deny`; that conflicts with grimoire's `warn`-level
   `unwrap_used` (`grimoire/Cargo.toml:128`). Both are already fail-closed — the conflict was
   level-vs-mechanism, not policy. Declaring per-lint `deny` on top of group-level `warn` just
   creates `priority` puzzles for no gain.
3. **`clippy::pedantic` is enabled as a whole group at `warn`, behind a curated allow-list and a
   ratchet; `nursery` and `restriction` never are.** Wholesale pedantic is defensible here
   *because the toolchain channel is pinned exactly* (`rust-toolchain.toml:2` = `1.95.0` in both
   repos), so group membership cannot drift under CI. But the follow-up round settled the shape:
   of nine audited shipping Rust projects only `uv` enables the group wholesale, and it carries a
   **15-item allow-list**; even a single-file `rust-lang` crate needed five exceptions to land the
   group (lint-rollout-staging §1). So: group-level `warn`, mandatory annotated allow-list, and
   the group enters through the LINT-16 ratchet rather than straight into the `-D warnings` gate.
   `nursery` stays off because it is upstream-declared false-positive-prone, `restriction` because
   its lints contradict each other by design and clippy's own contributor docs say to cherry-pick.
4. **MSRV is not a contract this project has.** Both original sub-artifacts prescribe a dedicated
   `cargo msrv verify` job. Rejected: grim and ocx ship prebuilt binaries and publish to GHCR,
   not crates.io — nobody compiles this source on an older toolchain. Declare
   `rust-version` equal to the pinned channel so `cargo` emits a clean error instead of a parse
   failure, and spend the CI minute on the Windows unit-test leg instead.
5. **Advisories are a scheduled gate, not a PR gate.** grimoire's own `deny.toml:24-30` already
   argues that failing every PR over an unfixable transitive advisory "teaches people to bypass
   the gate" — then `verify-basic.yml:82-92` does exactly that by aggregating the
   `continue-on-error` advisories step into a hard failure. Apply grimoire's own reasoning:
   `bans`/`licenses`/`sources` block on PR, `advisories` warn on PR and block on a schedule.
6. **`panic = "abort"` is banned wherever unwinding is load-bearing.** ocx measured it
   (`ocx/Cargo.toml:27-29`: −3.1 MB, but 13 `resume_unwind(join_err.into_panic())` sites die
   *silently* because it still compiles). That is the reference form for this whole ruleset:
   a rejected optimisation, recorded with its measured cost and its silent failure mode.
7. **The gate is one command that runs identically on a laptop and in CI.** Both repos already
   route CI through `task rust:*` targets. Keep it: a CI-only cargo invocation is how local and
   CI drift.
8. **Suppressions are `#[expect(..., reason = "...")]`.** This is the largest single gap in the
   fleet today — 147 `#[allow]` and 0 `#[expect]` in grimoire — and it is precisely the mechanism
   that makes an autonomous agent's lint suppressions reviewable and self-expiring.
9. **Turning this ruleset on is a four-wave ratchet, not a flag day.** The follow-up round settled
   the question the first round left open. Clippy has no `--baseline` flag; the working substitute
   in production is a committed per-lint-code JSON warning count that CI forbids from increasing
   (lint-rollout-staging §4). Two mechanical facts drive the wave order: at ~6,000 pedantic
   warnings on a real codebase, three lints were 88% of the count (`doc_markdown` 36%,
   `uninlined_format_args` 35%, `unreachable_pub` 17%), and only one of the three is autofixable;
   and a team that bolted a must-not-increase gate directly onto that backlog had to pull the
   whole thing back out of the PR flow (§6, §7). The ratchet gates growth; waves shrink the
   backlog; a per-lint carve-out threshold keeps an unshrinkable number from blocking unrelated
   work.

## The ruleset

### Lint declaration and level policy

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| **LINT-01** | Declare all lint policy in the workspace root `[workspace.lints.rust]` / `[workspace.lints.clippy]`; every member crate carries exactly `[lints] workspace = true` and defines no lints of its own. The one exception is the ratcheted tier: a lint with a nonzero backlog lives in the LINT-15 ratchet invocation's `-W` list, **not** in the manifest, until it reaches zero and is promoted into the table. | Versioned with the code, applies to plain `cargo build`, no CI-only flag; prevents per-crate drift. The carve-out exists because a manifest-level entry is unconditionally subject to `-D warnings` (LINT-15) and therefore cannot ratchet. ([Cargo Book, `[lints]`](https://doc.rust-lang.org/cargo/reference/manifest.html#the-lints-section); lints-and-toolchain-policy §5; lint-rollout-staging §4) | `rg -l '^\[lints\]' --glob 'Cargo.toml'` — every hit must contain `workspace = true` and nothing else; every key in `[workspace.lints.clippy]` has a live count of 0 (LINT-16). | MUST |
| **LINT-02** | Never set `RUSTFLAGS=-D warnings` in CI or a `.cargo/config.toml`. Denial comes from `[workspace.lints.rust] warnings = "deny"` plus `cargo clippy -- -D warnings`. | `RUSTFLAGS` denies path-dependency warnings (Cargo only auto-caps registry/git deps), busts the incremental cache, and creates local-vs-CI drift. (`ocx/Cargo.toml:212-221`) | `rg -n 'RUSTFLAGS' .github/ .cargo/ taskfiles/` returns nothing. | MUST |
| **LINT-03** | Declare individual clippy lints at `warn`, never `deny`. Teeth come from LINT-02's single switch. | Mixing per-lint `deny` with group-level `warn` forces `priority` bookkeeping and makes `clippy --fix` behaviour inconsistent; the outcome is identical. (resolves lints-and-toolchain-policy §2 vs `grimoire/Cargo.toml:128`) | `rg -n '= "deny"' Cargo.toml` matches only `warnings = "deny"` under `[workspace.lints.rust]`. | SHOULD |
| **LINT-04** | Enable `clippy::pedantic = { level = "warn", priority = -1 }` as a group, **with an explicit allow-list where every allowed lint carries a trailing rationale comment**, and introduce it through the LINT-16 ratchet (LINT-15), not straight into the `-D warnings` gate. Do **not** enable `nursery`, `restriction`, or `cargo` as groups. | Pedantic membership is frozen by the pinned channel (TOOL-01), so the group is stable. But group enablement always needs an exception list in practice: `uv` — the only one of nine audited shipping projects that enables the group — carries 15 allows (`missing_errors_doc`, `missing_panics_doc`, `module_name_repetitions`, `must_use_candidate`, `similar_names`, `too_many_lines`, …), and [rust-lang/rustc-hash#51](https://github.com/rust-lang/rustc-hash/pull/51) needed five corrections to land it on a single-file crate. `nursery` is upstream-declared unstable; `restriction` is the one group clippy's own contributor docs say to cherry-pick rather than enable. ([Clippy lint configuration](https://doc.rust-lang.org/clippy/lint_configuration.html); [clippy `adding_lints.html`](https://doc.rust-lang.org/clippy/development/adding_lints.html); lint-rollout-staging §1–2) | `rg -n 'nursery\|restriction' Cargo.toml` returns nothing at group level; every `"allow"` entry under `[workspace.lints.clippy]` has a `#` comment on the same line. | MUST |
| **LINT-05** | Name these restriction lints individually at `warn`: `unwrap_used`, `expect_used`, `indexing_slicing`, `panic_in_result_fn`, `unwrap_in_result`, `get_unwrap`, `dbg_macro`, `todo`, `unimplemented`, `mem_forget`, `string_slice`, `integer_division`. **`arithmetic_side_effects` is deferred to LINT-19 wave 4** and, when enabled, is scoped with `arithmetic-side-effects-allowed` per-type allowlists rather than blanket-suppressed. | Each targets a documented LLM-authored failure mode; `indexing_slicing`/`string_slice` matter specifically because this code parses untrusted OCI manifests and registry-supplied names. `arithmetic_side_effects` was moved out of the day-one set by the follow-up round: it is allow-by-default in every one of the nine audited projects, and clippy's own tracker calls it "really noisy" ([rust-lang/rust-clippy#13755](https://github.com/rust-lang/rust-clippy/issues/13755)) — its untrusted-arithmetic value is real but it must be measured and scoped before it gates a PR. (lints-and-toolchain-policy §3; lint-rollout-staging §3, §7) | `cargo clippy --workspace --all-targets --locked -- -D warnings` exits 0; if `arithmetic_side_effects` is enabled, `clippy.toml` carries a non-empty `arithmetic-side-effects-allowed` list. | MUST |
| **LINT-06** | Promote `await_holding_lock` and `await_holding_refcell_ref` from their default `warn` to an explicitly declared entry, and never suppress either. | `std::sync::Mutex` is the deliberate house lock type in all three codebases with **zero** `tokio::sync::Mutex` uses (errors-async-security.md §4) — the guard-across-await check is the only mechanical thing standing between that convention and a deadlock. Both are already `warn`-by-default in `suspicious`, so this is a wave-1 lint with no enablement cost, only a fix plan (lint-rollout-staging §Summary 13). | `cargo clippy --workspace -- -D clippy::await_holding_lock -D clippy::await_holding_refcell_ref`. | MUST |
| **LINT-07** | Set `unsafe_code = "forbid"` at workspace level; downgrade to `"deny"` in exactly the crates that need FFI, each with a comment naming why. | grimoire already proves the zero-unsafe baseline is achievable for the package-manager surface (`grimoire/Cargo.toml:123`, 0 `unsafe` blocks). Only the Windows launcher shim genuinely needs it. | `rg -n 'unsafe_code' Cargo.toml crates/*/Cargo.toml`; every crate with `"deny"` (not `"forbid"`) has an adjacent rationale comment. | MUST |
| **LINT-08** | Every lint suppression is `#[expect(<lint>, reason = "...")]`. Bare `#[allow]` is permitted only where `expect` cannot work (a lint that legitimately does not fire under some `cfg`), and then still carries `reason`. | `#[allow]` rots silently; `#[expect]` warns via `unfulfilled_lint_expectations` when the underlying code is fixed, which is the only self-expiring suppression an unattended agent can be trusted with. ([rustc lint levels](https://doc.rust-lang.org/rustc/lints/levels.html)) | `rg -n '#\[allow\(' --glob '*.rs'` — every hit must carry `reason =` and a `// expect-impossible:` note; `rg -n '#\[expect\(' --glob '*.rs' \| rg -v 'reason ='` is empty. | MUST |
| **LINT-09** | Keep a `clippy.toml` at the workspace root carrying `msrv`, `allow-unwrap-in-tests`, `allow-expect-in-tests`, `allow-dbg-in-tests`, `allow-panic-in-tests`, `allow-indexing-slicing-in-tests`, `check-private-items = false`, and a `disallowed-methods` list containing at minimum `std::env::set_var`, `std::env::remove_var`, `std::process::exit`, `std::thread::sleep`. | Test-scoped allowances are the reason LINT-05 can stay strict without an `#[expect]` per test; the disallow list catches the three std calls that are correct-looking and wrong in an async, cross-platform, testable CLI. `check-private-items` is clippy's own built-in staging knob for doc lints — its default `false` means public-API-first is free, and flipping it is a deliberate later escalation (LINT-12). (lints-and-toolchain-policy §6; lint-rollout-staging §3) | `clippy.toml` exists; `cargo clippy --workspace -- -D clippy::disallowed_methods` exits 0; `rg -n 'check-private-items' clippy.toml` is absent or `false`. | MUST |
| **LINT-10** | Do **not** put `std::sync::Mutex` in `disallowed-types`. | Explicit conflict with lints-and-toolchain-policy §6, which proposes banning it. Rejected: std `Mutex` with short non-await-spanning critical sections is the audited house convention across 700+ files (errors-async-security.md §4, §8) — reaching for `tokio::sync::Mutex` is the signal that a critical section grew too big, and LINT-06 already catches the actual bug mechanically. | `rg -n 'disallowed-types' clippy.toml` — if present, must not list `std::sync::Mutex`. | MUST |
| **LINT-11** | Enable `unreachable_pub = "warn"` **through the LINT-16 ratchet, not the manifest**, until its count reaches zero. When it fires, the first fix is module nesting (`mod` vs `pub mod`), the second is `pub(crate)`. | Directly targets the workspace's visibility sprawl (1,118 col-0 `pub` items in `ocx_lib` alone, crate-architecture.md §6). It is also the third-largest lint in the only published large-scale rollout data — 1,006 hits, 17% of a ~6,000-warning pedantic enablement, and only *partially* autofixable ([strata-core#2389](https://github.com/stratalab/strata-core/issues/2389)) — so it cannot land as a manifest entry under `-D warnings`. The two-step fix order resolves the conflict with `quality-rust.md`'s Warn-tier "`pub(crate)` is a design smell": the lint is right that the item shouldn't be `pub`; the existing rule is right about which fix to reach for first. | `unreachable_pub` appears in the LINT-16 baseline with a monotonically decreasing count, and moves into `[workspace.lints.rust]` only in the commit its count hits 0. | SHOULD |
| **LINT-12** | Enable `missing_errors_doc` and `missing_panics_doc` at `warn` on library-shaped crates — **last, in LINT-19 wave 4**, with `check-private-items = false` (LINT-09) so only the public surface is covered. Do not flip `check-private-items` to `true` in the same wave. | An autonomous agent is a consumer of these APIs; an undocumented failure mode is invisible to it in a way it is not to a human reading the body. They go last because they are the single most consistently deferred pedantic lints in real configs — `uv` and `tsz` both allow them explicitly, and a documented ~6,000-warning rollout deferred them too — and because neither is autofixable. Known limitation: a generic "`# Errors` — returns an error if something goes wrong" satisfies the lint without adding information; **no grep catches that**, so it stays a review requirement rather than a mechanical gate. (lints-and-toolchain-policy §3; lint-rollout-staging §1, §7, AI-agent angle) | `cargo clippy -p <lib crate> -- -D clippy::missing_errors_doc -D clippy::missing_panics_doc` exits 0 only after wave 4; before that, both appear in the LINT-16 baseline. | SHOULD |
| **LINT-13** | Never enable `clippy::redundant_clone` as a standing gate. | It lives in `nursery` for cause; run it as a scoped, time-boxed pass during an explicit clone-reduction change instead. ([clippy source](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/redundant_clone.rs)) | `rg -n 'redundant_clone' Cargo.toml` is absent or `"allow"`. | SHOULD |
| **LINT-14** | `rustfmt.toml` contains stable options only; never `unstable_features = true`, `imports_granularity`, `group_imports`, `wrap_comments`, or `format_code_in_doc_comments`. CI runs `cargo fmt --all -- --check`, never bare `cargo fmt`. | Those options require nightly rustfmt, whose behaviour changes release-to-release — unacceptable in the format-check path of a project that ships stable-toolchain binaries. ([rustfmt Configurations.md](https://raw.githubusercontent.com/rust-lang/rustfmt/master/Configurations.md)) | `rg -n 'unstable_features\|imports_granularity\|group_imports\|wrap_comments' rustfmt.toml` is empty. | MUST |
| **LINT-15** | The `-D warnings` gate and the ratchet are **two separate clippy invocations**. `[workspace.lints]` carries only lints already at zero, and CI runs those under `cargo clippy --workspace --all-targets --locked -- -D warnings`. Every lint with a nonzero backlog is passed as `-W clippy::<lint>` on a second invocation that carries **no** `-D warnings` and is gated by the LINT-16 baseline instead. | Cargo emits `[lints]` entries as ordinary `--warn` flags, so `-D warnings` promotes a manifest-level `pedantic = "warn"` to a workspace-wide hard deny on the very first hit — the group blocks merges instead of ratcheting. Clippy's own [CI guidance page](https://doc.rust-lang.org/clippy/continuous_integration/index.html) recommends `-D warnings` without mentioning this interaction at all; the gap is documented verbatim in a production ratchet script's docstring. ([tsz `check-clippy-warn-ratchet.py`](https://raw.githubusercontent.com/tsz-org/tsz/main/scripts/arch/check-clippy-warn-ratchet.py); lint-rollout-staging §4) | The ratchet step's command line contains no `-D warnings`; every key in `[workspace.lints.clippy]` produces zero warnings under `--message-format=json`. | MUST |
| **LINT-16** | Commit a per-lint-code baseline (`clippy-warn-baseline.json`: one integer per lint code). CI fails if **any single** lint code's live count exceeds its baseline entry; a decrease is committed via the ratchet's `--update-baseline`. When a code reaches 0 it moves into `[workspace.lints.clippy]` and is deleted from the baseline **in the same commit**. | Clippy has no `--baseline` flag; a ~210-line script over `--message-format=json` is the working substitute found in production at 350k-LOC scale. Per-lint tracking rather than an aggregate is what stops one lint's improvement from masking another's regression. The promote-and-delete step is what stops the baseline drifting into meaninglessness once a lint is fully fixed. ([tsz `check-clippy-warn-ratchet.py`](https://raw.githubusercontent.com/tsz-org/tsz/main/scripts/arch/check-clippy-warn-ratchet.py); lint-rollout-staging §4) | `cargo clippy --workspace --all-targets --message-format=json \| jq -r 'select(.reason=="compiler-message" and .message.level=="warning") \| .message.code.code' \| sort \| uniq -c` diffed against the committed file; no key appears in both the baseline and `[workspace.lints.clippy]`. | MUST |
| **LINT-17** | A committed integer caps total suppressions — `#[allow(clippy::` **and** `#[expect(clippy::` counted together — and may only decrease. Raising it requires an inline comment in the same diff naming the lint and why the code cannot be fixed. A newly introduced crate- or module-level `#![allow(...)]` / `#![expect(...)]` is rejected outright: function scope is the ceiling. | This is the mechanical countermeasure to the suppression avalanche, proven in a real large codebase as a plain count check against a hard-coded integer tied to a tracking issue. Both attribute forms are counted because LINT-08 makes `#[expect]` the sanctioned form — an `#[expect]` avalanche is the same failure wearing the approved costume. Scope-widening (function → module → crate) is the specific escalation an agent reaches for when the narrow suppression is not enough. ([tsz `WORKSPACE_CLIPPY_ALLOW_COUNT_CHECKS`](https://raw.githubusercontent.com/tsz-org/tsz/main/scripts/arch/arch_guard_shared.py); lint-rollout-staging §6, AI-agent angle) | `rg -c '#\[(allow\|expect)\(clippy::' src/ crates/` ≤ the committed ceiling; `git diff --unified=0 origin/main \| rg '^\+.*#!\[(allow\|expect)\('` is empty. | MUST |
| **LINT-18** | `cargo clippy --fix` runs for exactly **one lint code per commit** (`--fix -- -A clippy::all -W clippy::<one-lint>`), with the full test suite run after each. Never autofix a whole group in one pass. Any autofix diff touching a public signature goes to manual review regardless of what generated it. | `--fix` has an open, multi-year record of emitting broken code — [#8458](https://github.com/rust-lang/rust-clippy/issues/8458) (2022, borrow-checker violation in a real crate), [#13852](https://github.com/rust-lang/rust-clippy/issues/13852) (2024, `manual_retain`), and critically [#10246](https://github.com/rust-lang/rust-clippy/issues/10246), a **compiling-but-semantically-wrong** result. Cargo's post-fix recompile catches only the non-compiling class. `--fix` also implies `--all-targets` ([clippy usage.html](https://doc.rust-lang.org/clippy/usage.html)), so a blind pass rewrites tests and benches in the same commit. (lint-rollout-staging §8) | An autofix commit's message names exactly one `clippy::<code>`, and every file it touches had that code in the pre-fix LINT-16 baseline. | MUST |
| **LINT-19** | Enable in four waves, never a flag day. **(1)** Everything already at zero plus the cheap tier: LINT-02's `warnings = "deny"`, LINT-06, LINT-07, LINT-14, and `dbg_macro`/`todo`/`unimplemented`. **(2)** The confirmed-autofixable lints, one commit each under LINT-18: `uninlined_format_args`, `redundant_closure`. **(3)** The pedantic group and the remaining LINT-05 restriction lints, into the LINT-16 ratchet — not the manifest. **(4)** Doc lints (LINT-12) and `arithmetic_side_effects` last. Any lint whose initial count exceeds **500** is carved out into its own tracked cleanup issue and excluded from the gate entirely until driven down. | The order is hit-rate-driven, not taste. In the only published large-scale breakdown, three lints were 88% of a ~6,000-warning pedantic enablement — `doc_markdown` 36%, `uninlined_format_args` 35%, `unreachable_pub` 17% — and only `uninlined_format_args` is confirmed autofixable, so it belongs in a wave the machine can do and the other two in a ratchet humans grind down. The 500 threshold exists because that same team had to pull its ratchet gate back out of the PR flow entirely: a must-not-increase gate bolted onto an unshrinkable backlog just blocks unrelated work. ([strata-core#2389](https://github.com/stratalab/strata-core/issues/2389); [dutiona/memory-engine#561](https://github.com/dutiona/memory-engine/issues/561) as the independent second data point; lint-rollout-staging §6, §7) | Each wave lands as its own PR whose diff touches `Cargo.toml`/the ratchet list plus lint fixes and no feature code; no baseline entry above 500 exists without a linked tracking issue. | MUST |

### Toolchain and auxiliary tooling

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| **TOOL-01** | `rust-toolchain.toml` pins an exact `channel = "X.Y.Z"` — never `stable`, `beta`, or `nightly` — with `components = ["rustfmt", "clippy"]`. | Reproducible builds for shipped binaries, and it is the premise LINT-04 depends on: a floating channel would make the pedantic group drift under CI. ([rustup overrides](https://rust-lang.github.io/rustup/overrides.html)) | `rg -n 'channel' rust-toolchain.toml` matches `^\d+\.\d+\.\d+$`. | MUST |
| **TOOL-02** | Declare `rust-version` in `[workspace.package]` equal to the pinned channel. Do **not** add an MSRV matrix job. | Rejects both original sub-artifacts' MSRV-job rule: this project distributes binaries, not source, so an MSRV floor below the pinned channel is a fiction nobody consumes. The declaration still buys a clean `cargo` diagnostic on an old toolchain. | `rg -n 'rust-version' Cargo.toml` matches `rust-toolchain.toml`'s channel. | SHOULD |
| **TOOL-03** | A toolchain bump is its own commit touching only `rust-toolchain.toml` (plus whatever new lints it forces) **and re-capturing the LINT-16 baseline**, and it re-greens the full gate before anything else lands on it. | Under LINT-04 a bump is the one moment new pedantic lints appear; entangling it with feature work makes an agent "fix" them by suppression. The baseline re-capture is required because group membership is *not* stable across clippy releases — [`excessive_nesting` moved from `complexity` to `pedantic`](https://github.com/rust-lang/rust-clippy/pull/17509) — so a baseline captured against one clippy version can silently mean something different after a bump. (lint-rollout-staging, Contested) | Commit touching `rust-toolchain.toml` changes no `src/**/*.rs` beyond lint fixes, and its diff includes `clippy-warn-baseline.json`. | SHOULD |
| **TOOL-04** | No nightly toolchain, `-Z` flag, or `#![feature(...)]` on any path that produces a shipped artifact. Nightly is confined to non-blocking scheduled canaries. | Nightly is not a reproducible release target for prebuilt cross-platform binaries. (ci-release-and-distribution §3) | `rg -n '\+nightly\|-Z \|#!\[feature\(' .github/ taskfiles/ src/ crates/` — hits only in `continue-on-error` jobs. | MUST |
| **TOOL-05** | Run `cargo shear` in the PR gate for unused/misplaced dependencies. Do not use `cargo-machete` (regex-based, false positives), `cargo-udeps` (nightly), or the rustc `unused_crate_dependencies` lint. | `cargo-shear` parses rather than greps and additionally finds misplaced deps and orphaned source files — directly useful against the one-big-crate shape. The rustc lint is rejected because it fires falsely on deps used by only one target of a crate. ([cargo-shear](https://github.com/Boshen/cargo-shear); lints-and-toolchain-policy §9) | A CI step runs `cargo shear`; `rg -n 'unused_crate_dependencies' Cargo.toml` is empty. | SHOULD |
| **TOOL-06** | Run `typos` and `taplo fmt --check` in the PR gate. | Near-zero false positives, seconds of runtime, and this fleet carries six-plus hand-edited TOML files (`Cargo.toml`, `deny.toml`, `clippy.toml`, `rust-toolchain.toml`, `dist-workspace.toml`, `cliff.toml`, `cog.toml`). | CI steps exist for both. | CONSIDER |

### CI workflow design and supply-chain gates

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| **CI-01** | Every workflow file declares `permissions: {}` at the top level and grants scopes per job. | A workflow-level grant hands every job the maximum any one job needs. ([GitHub security hardening](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)) | `rg -L '^permissions: \{\}' .github/workflows/*.yml` is empty. | MUST |
| **CI-02** | Pin every `uses:` to a full 40-character commit SHA with a trailing `# vX.Y.Z` comment. | Tags are mutable; SHA pinning is GitHub's stated only immutable reference. | `rg -n 'uses: .*@(?!\[0-9a-f\]{40})' .github/workflows/` is empty. | MUST |
| **CI-03** | Every `actions/checkout` step sets `persist-credentials: false`. | Otherwise `GITHUB_TOKEN` stays in the local git credential helper for every subsequent step, including third-party actions and build scripts. | Count of `persist-credentials: false` equals count of `actions/checkout` steps. | MUST |
| **CI-04** | Every `cargo` invocation in CI carries `--locked`. | Without it CI silently resolves a dependency set the lockfile does not describe — masking the exact drift CI exists to catch. | `rg -n 'cargo (build\|test\|check\|clippy\|nextest)' .github/ taskfiles/ \| rg -v -- '--locked'` is empty. | MUST |
| **CI-05** | CI invokes the same named task target a developer runs locally; it never inlines a bare cargo command that has no local equivalent. | The only durable defence against "green locally, red in CI". Both repos already do this via `task rust:*`. | Every `run:` in a Rust job is `task <target>`, or the target exists in `taskfiles/`. | SHOULD |
| **CI-06** | A `continue-on-error: true` step is either paired with a later step that fails the job on its recorded `outcome`, or lives in a job explicitly labelled non-blocking. | An unpaired `continue-on-error` is a check that can never be red — the "Unchecked Green" failure mode the fleet's own `quality-core.md` names. | Every `continue-on-error: true` has a matching `steps.<id>.outcome` reference or a `# non-blocking:` marker. | MUST |
| **CI-07** | Split `cargo deny`: `check bans licenses sources` blocks the PR; `check advisories` is non-blocking on PRs and blocking in a scheduled job. | The advisory DB changes without your code, so a PR-blocking advisories gate punishes an unrelated commit and trains people to bypass it — grimoire's own `deny.toml:24-30` makes this argument, then `verify-basic.yml:86-92` violates it. ([cargo-deny-action](https://github.com/EmbarkStudios/cargo-deny-action)) | Two distinct jobs/legs with differing `continue-on-error`; a `schedule:` workflow runs `cargo deny check advisories` blocking. | MUST |
| **CI-08** | Every entry in `deny.toml`'s `[advisories].ignore` and every non-default `[licenses].allow` entry carries an inline comment stating the machine-checkable condition for its removal. | Already the house convention (`ocx/deny.toml:6-11,28-35`) and the reason those exceptions have not silently become permanent. | Every line in `ignore = [...]` is preceded by a comment containing `REMOVE when`. | MUST |
| **CI-09** | Restrict `Swatinem/rust-cache` saves to trunk (`save-if: github.ref == 'refs/heads/main'`). | PR branches otherwise evict the shared cache under the per-repo size cap. ([rust-cache README](https://github.com/Swatinem/rust-cache/blob/master/README.md)) | Every `Swatinem/rust-cache` step has a `save-if`. | SHOULD |
| **CI-10** | Unit tests run natively on **every** OS that is a release target, or the workflow carries a comment naming the target as build-only and why. | Cross-compiling an artifact you never execute tests on is an untested release. Windows-specific behaviour (path canonicalization, `\\?\` prefixes, file-lock retry) is exactly what this codebase's own rules warn about (rules-inventory.md §2.1 "Cross-Platform Path Handling"). | Each `dist-workspace.toml` target OS appears in a matrix that runs `cargo nextest run`, or is annotated. | SHOULD |
| **CI-11** | If the repo uses a merge queue, add `merge_group: { types: [checks_requested] }` to every workflow producing a required check. | Omitting it makes the required check never report, wedging the queue silently. ([GitHub events docs](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows)) | Branch protection's required-check list ⊆ workflows containing `merge_group`. | CONSIDER |
| **CI-12** | Report the ratcheted tier (LINT-15's second invocation) on PRs through `giraffate/clippy-action` with `reporter: github-pr-review` (reviewdog `filter-mode=added`), never a hand-rolled incremental-lint script. Treat it as advisory alongside LINT-16, never as a replacement for it. | Diff-scoped clippy is a solved, maintained, ~10-line-of-YAML problem; hand-rolling duplicates working tooling. It is advisory-only for two reasons: line-based scoping misses a lint whose span does not overlap a changed line (a function moved without its body being touched escapes it), and it does nothing to shrink an existing backlog — it only stops growth. ([giraffate/clippy-action](https://github.com/giraffate/clippy-action); lint-rollout-staging §5) | The workflow contains a SHA-pinned (CI-02) `giraffate/clippy-action` step with `reporter: github-pr-review`, and the LINT-16 ratchet step still exists alongside it. | CONSIDER |

### Release engineering and distribution

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| **REL-01** | Ship from an explicit named profile (`[profile.dist]`), never Cargo's `release` defaults, and comment each setting with its measured effect. | `lto=false, codegen-units=16, strip="none"` is tuned for iteration, not distribution; shipping it is an unexamined choice. ([Cargo profiles](https://doc.rust-lang.org/cargo/reference/profiles.html)) | `Cargo.toml` has `[profile.dist]` with at least `lto`, `codegen-units`, `opt-level`, `strip` set. | MUST |
| **REL-02** | Never set `panic = "abort"` in a profile covering crates that call `catch_unwind` or `resume_unwind`. Record the rejection, with its measured size cost, as a comment in the profile. | It compiles clean and removes the panic-propagation mechanism *silently* — the worst possible failure shape for an agent-authored size optimisation. (`ocx/Cargo.toml:27-29`) | If `panic = "abort"` appears, `rg -n 'resume_unwind\|catch_unwind' src/ crates/` must be empty for the covered crates. | MUST |
| **REL-03** | Every Linux release artifact is either static-musl or has a documented glibc floor; never an unpinned `-gnu` build assumed portable. | A `-gnu` binary built on a current runner links a glibc newer than many users have, and CI cannot catch it because CI ran on that same newer glibc. ([cargo-zigbuild](https://github.com/rust-cross/cargo-zigbuild)) | Every `-linux-gnu` target in `dist-workspace.toml` has a `.<glibc>` suffix, a pinned older builder image, or a documented floor. | MUST |
| **REL-04** | Release artifacts carry embedded dependency data (`cargo-auditable`), an SBOM, and a signed build-provenance attestation. | The first two answer "what is in this binary", the third answers "did this binary come from this repo". A package manager distributing other people's software has no standing to skip any of them. ([attest-build-provenance](https://github.com/actions/attest-build-provenance)) | `dist-workspace.toml` sets `cargo-auditable = true` and `cargo-cyclonedx = true`; the release workflow runs an attestation step with `attestations: write`. | MUST |
| **REL-05** | Validate the release configuration on pull requests — either `dist plan` via `pr-run-mode = "plan"` or an equivalent dedicated readiness workflow. | A release config error otherwise surfaces only after the tag is pushed, when rolling back is expensive. ([dist book](https://axodotdev.github.io/cargo-dist/book/)) | `pr-run-mode = "plan"`, or a PR-triggered workflow that exercises the release config end to end. | SHOULD |
| **REL-06** | No long-lived publishing credential in repository secrets. Use the job-scoped `GITHUB_TOKEN` for GHCR and OIDC trusted publishing for any crates.io publish. | A standing token in secrets can publish malicious versions indefinitely if a dependency in the publish job is compromised. ([crates-io-auth-action](https://github.com/rust-lang/crates-io-auth-action)) | `rg -n 'CARGO_REGISTRY_TOKEN\|_TOKEN: \$\{\{ secrets' .github/workflows/` returns only ephemeral tokens. | SHOULD |
| **REL-07** | If release automation parses commit messages, enforce the commit convention as a blocking PR check. | Version derivation from `feat:`/`fix:`/`!` is silently wrong for any commit that skipped the convention — a gate is what makes the changelog trustworthy. ([git-cliff docs](https://git-cliff.org/docs/)) | `cliff.toml`/`cog.toml` present ⇒ a conventional-commit check job exists and is required. | MUST |

## Applied to OCX

**Already satisfied — do not regress these.**

- Exact-pinned toolchain in all three repos: `channel = "1.95.0"`, `profile = "default"`,
  `components = ["rustfmt", "clippy"]` (`ocx/rust-toolchain.toml:2-4`,
  `grimoire/rust-toolchain.toml:2-4`). **TOOL-01** ✔
- `[lints]` table over `RUSTFLAGS`, with the path-dependency reasoning written down:
  `ocx/Cargo.toml:211-221` sets `warnings = "deny"` and explains that CI's
  `setup-rust-toolchain` sets `rustflags: ""` specifically to defer denial here. Every member
  crate carries a bare `[lints] workspace = true`
  (`ocx/crates/ocx_cli/Cargo.toml:64`, `ocx_lib:131`, `ocx_schema:13`, `ocx_shim:23`).
  **LINT-01, LINT-02** ✔
- `unsafe_code = "forbid"` in grimoire (`grimoire/Cargo.toml:123`) with a confirmed zero
  `unsafe` blocks in 199 files (errors-async-security.md headline table). **LINT-07** ✔ for
  grimoire; ocx carries ~75 sites at 65-77% `// SAFETY:` coverage, concentrated in the Windows
  shim's WinAPI FFI — that is the legitimate `"deny"` carve-out, but the coverage gap is real.
- Actions SHA-pinned with version comments everywhere audited
  (`grimoire/.github/workflows/verify-basic.yml:27,32,48,105,109,113,115,133,141`). **CI-02** ✔
- `--locked` on every cargo invocation in the task targets
  (`grimoire/taskfiles/rust.taskfile.yml:43,55,68`; `ocx/taskfiles/rust.taskfile.yml:81-82,96,124,137`).
  **CI-04** ✔
- CI runs task targets, not inline cargo (`verify-basic.yml:120,124,127,131`). **CI-05** ✔
- `rust-cache` with trunk-only saves (`grimoire/verify-basic.yml:109-111`,
  `ocx/verify-basic.yml:67-69`). **CI-09** ✔
- Advisory-ignore entries carry machine-checkable removal conditions
  (`ocx/deny.toml:6-11` — each is `REMOVE when 'cargo tree -i X' is empty`; the license
  allow-list follows the same shape at `:28-35`). **CI-08** ✔
- Explicit, measured `[profile.dist]` (`ocx/Cargo.toml:21-37`) — and the model instance of
  **REL-02**: `panic = "abort"` rejected in writing at `:27-29` with both the size win and the
  silent-failure reason. ✔
- musl **and** gnu for both architectures on Linux in both repos
  (`ocx/dist-workspace.toml:13`, `grimoire/dist-workspace.toml:14`) — partial **REL-03**.
- `cargo-auditable = true` and `cargo-cyclonedx = true` in both dist configs
  (`ocx/dist-workspace.toml:36-38`, `grimoire/dist-workspace.toml:34-36`). **REL-04** two-thirds ✔
- Conventional-commit enforcement as a blocking PR job via cocogitto
  (`grimoire/verify-basic.yml:31-35`), with `cliff.toml` + `cog.toml` present. **REL-07** ✔ —
  this also settles the sub-artifact's open "is `committed`/`cog` worth it here" question: it
  is already in place and load-bearing.

**Violations, ordered by what they actually cost.**

1. **147 `#[allow]`, 0 `#[expect]` in grimoire; 34 `#[allow]`, 4 `#[expect]` in ocx.** Only
   48 (grimoire) and 10 (ocx) `reason =` strings exist across both trees, so the majority are
   unreasoned as well. Sample: `grimoire/src/api.rs:31,33,35,37,43` — five consecutive bare
   `#[allow(unused_imports)]`; `ocx/crates/ocx_lib/src/package_manager/tasks/install.rs:239`
   and `ocx/crates/ocx_cli/src/command/launcher/shim.rs:307` —
   `#[allow(clippy::result_large_err)]` with no reason and no expiry. **LINT-08** is the single
   highest-value change in this document, and it is mechanical. The combined count (185) is also
   the opening ceiling for **LINT-17** — it may only go down from there.
2. **No `clippy.toml` in either repo.** So `allow-unwrap-in-tests` is unavailable, which is why
   grimoire had to settle for `unwrap_used = "warn"` scoped by clippy's built-in test detection
   (`grimoire/Cargo.toml:126-129`) and ocx has no unwrap gate at all — errors-async-security.md
   line 35 records that ocx's near-zero production `unwrap` count is "followed by convention,
   not enforced by clippy". **LINT-09** unblocks **LINT-05** for ocx.
3. **No pedantic group, no named restriction lints beyond grimoire's two.** grimoire's
   `[lints.clippy]` is four lines (`Cargo.toml:125-129`); ocx's `[workspace.lints.clippy]` is an
   empty placeholder (`Cargo.toml:223-227`). Every lint in **LINT-04/05/06/11/12** is currently
   off across the fleet — including `await_holding_lock`, which errors-async-security.md flags
   twice (§4 and risk #7) as the unverified assumption underneath the std-`Mutex` convention.
4. **Workflow-level `permissions:` granting write scopes to every job.**
   `grimoire/.github/workflows/verify-basic.yml:9-12` and `ocx/.github/workflows/verify-basic.yml:9-12`
   both grant `checks: write` + `pull-requests: write` to all five jobs, including
   `supply-chain` and `smoke`, which need neither. **CI-01** violated in both.
5. **No `persist-credentials: false` on any checkout**, including
   `grimoire/verify-basic.yml:27-30` which combines `fetch-depth: 0` with third-party
   actions in the same job. **CI-03** violated fleet-wide.
6. **Advisories are a hard PR gate.** `grimoire/verify-basic.yml:78-92` runs licences and
   advisories with `continue-on-error`, then fails the job on either outcome — contradicting
   the repo's own written reasoning at `deny.toml:24-30`. No scheduled advisories job exists in
   either repo. **CI-07** violated.
7. **grimoire never runs Rust unit tests on Windows** — `verify-deep.yml:19-20` matrixes Linux
   and macOS only; Windows is cross-compiled with `cargo xwin` (`:66`) and only exercised by the
   Python acceptance suite (`:86`). ocx does run them natively
   (`ocx/verify-deep.yml:67`, `:87`). grimoire ships `aarch64-pc-windows-msvc` and
   `x86_64-pc-windows-msvc` binaries (`dist-workspace.toml:14`). **CI-10** violated in grimoire.
8. **No build-provenance attestation in grimoire.** `attest` appears in
   `ocx/.github/workflows/{release,docker-publish,build-windows-shims}.yml` and in no grimoire
   workflow. **REL-04** partially violated in grimoire.
9. **`pr-run-mode = "skip"` in both dist configs** (`ocx:22`, `grimoire:22`). ocx compensates
   with `verify-release-ci.yml` and `release-readiness.yml`; grimoire has no equivalent.
   **REL-05** violated in grimoire.
10. **No `rust-version` declared anywhere** in either repo. **TOOL-02** unmet — cheap to fix,
    low cost either way.
11. **No `cargo shear`, `typos`, or `taplo` in any gate.** **TOOL-05/06** unmet. Given
    ~45 direct dependencies in ocx and ~40 in grimoire, and a documented history of dependency
    creep across agent sessions, `cargo shear` is the one worth adding.
12. **Clippy runs without `--all-features`** (`ocx/taskfiles/rust.taskfile.yml:96`,
    `grimoire:43`) while ocx has a real `__testing` feature gating live code. Lints inside that
    feature are never checked.
13. **No ratchet infrastructure of any kind.** Neither repo has a committed warning baseline, a
    suppression ceiling, or a second non-`-D warnings` clippy invocation — so **LINT-15/16/17**
    are net-new machinery, and **LINT-19** wave 1 cannot start until they exist. The first
    concrete step is capturing the baseline: run the wave-3 lint set in report-only mode over
    both workspaces and commit the resulting per-lint-code counts before enabling anything.

**Newly committed to (not previously anywhere in the fleet's rules):** the rules-inventory
gap list names this whole area as the eleventh and final gap — *"Build tooling / CI integration
for Rust specifically… `cargo clippy --workspace` is named once as a checklist gate, but there
is no guidance on `cargo fmt` enforcement, MSRV CI matrix, cross-compilation targets, or
release/publish tooling"* (rules-inventory.md:1084-1090). Everything above is net-new normative
content for the fleet's rule set.

## AI-agent failure modes

Ranked by observed frequency, most common first.

1. **Suppressing the lint instead of fixing the code.** The agent treats a denied lint as the
   obstacle. The tell is a bare `#[allow(clippy::…)]` appearing in the same diff that introduced
   the code it silences. 147 of these already exist in grimoire alone. Mechanical catch:
   **LINT-08** — reject any diff adding an `#[allow]` or a reasonless `#[expect]` — plus
   **LINT-17**'s count ceiling, which catches the sanctioned-form variant (a pile of well-formed
   `#[expect(..., reason = "…")]` is the same failure with better manners).
2. **Widening an existing suppression's scope rather than adding a new one.** Function → module →
   crate, so the diff shows no new attribute at all and slips a count check that only looks for
   additions. Catch: **LINT-17**'s hard reject of any newly introduced `#![…]` crate/module-level
   form.
3. **`.unwrap()`/`.expect()` as the default error strategy.** Training data is saturated with
   tutorial code. Catch: **LINT-05** plus **LINT-09**'s test allowances so the lint is not
   drowned in test noise.
4. **Bare `as` casts between integer widths.** `usize as u32` on a file offset silently
   truncates, and `usize` differs across the three shipped platforms. Catch: pedantic's
   `cast_possible_truncation` / `cast_sign_loss` / `cast_precision_loss` via **LINT-04**. Note
   the cast family is documented as blanket-noisy in newtype-heavy codebases, so it enters
   through the **LINT-16** ratchet, not the manifest.
5. **Running `cargo clippy --fix` across the whole enabled set in one pass.** The resulting diff
   spans dozens of unrelated lint codes and can contain a compiling-but-wrong rewrite. Catch:
   **LINT-18**'s one-code-per-commit rule; the diff shape itself is the tell.
6. **Stale or hallucinated GitHub Action versions and inputs.** `actions/checkout@v3`, invented
   `with:` keys for `Swatinem/rust-cache`. Catch: **CI-02**'s SHA requirement makes the agent
   look up a real commit; cross-check every `with:` key against the action's `action.yml`.
7. **Dropping `--locked` when writing or editing a CI cargo command.** Catch: **CI-04**'s grep.
8. **Holding a `std::sync::MutexGuard` across `.await`.** Compiles, looks right, deadlocks only
   under concurrency — invisible to a single-threaded unit test and to the agent that wrote it.
   Catch: **LINT-06**. This is the one failure mode on this list an agent cannot pattern-match
   its way out of.
9. **`panic = "abort"` added as a "free" size win.** Asked to shrink a binary, the agent adds it
   without checking for `catch_unwind`/`resume_unwind`. Catch: **REL-02**; ocx's comment at
   `Cargo.toml:27-29` is the counter-argument in-tree already.
10. **Writing `channel = "stable"` when asked to set up a toolchain.** The loosest thing that
    works locally; drift is unobservable within one session. Catch: **TOOL-01**'s regex.
11. **Calling `std::env::set_var` as ordinary safe code.** Edition 2024 made it `unsafe`; models
    trained on earlier idioms either write it plainly or wrap it in a copied, wrong `unsafe`
    block. Catch: **LINT-09**'s `disallowed-methods` entry, which fires either way.
12. **Making `cargo deny check advisories` a hard PR gate.** The "strict is safer" instinct
    produces a workflow that fails every PR the day an unfixable transitive advisory lands.
    Catch: **CI-07**.
13. **Satisfying a doc lint with content-free prose.** `# Errors — Returns an error if something
    goes wrong.` silences `missing_errors_doc` and tells the next reader nothing. **No grep
    catches this**; it is the one item on this list with no mechanical gate, which is why
    **LINT-12** names it explicitly as a review requirement rather than pretending the lint
    covers it.
14. **Confusing `cross` and `cargo-zigbuild` syntax** — the `.2.17` glibc suffix is
    zigbuild-only. Catch: grep the tool name immediately preceding any `.2.NN`-suffixed target.
15. **Adding a dependency that duplicates one already in the tree**, then leaving the loser in
    `Cargo.toml`. `cargo shear` (**TOOL-05**) catches the leftover half only; the duplicate-purpose
    half still needs a reading check against the existing `[dependencies]` list.

## Open questions

**Needs a human decision.**

- **Merge queue: yes or no?** **CI-11** is written conditionally because neither repo's branch
  protection was inspected. If a queue is enabled, every required-check workflow needs
  `merge_group` today.
- **grimoire's Windows test gap (CI-10):** add a `windows-latest` unit-test leg to
  `verify-deep.yml` (CI minutes), or formally declare Windows build-only and document the risk?
  ocx already pays for the leg; grimoire ships the same two Windows targets and does not.
- **ocx's `unsafe` backfill:** ~25-35% of ocx's ~75 `unsafe` sites lack a `// SAFETY:` comment
  (errors-async-security.md risk #10). Grandfather the existing sites with a tracked backfill,
  or gate new ones only? A hard gate from day one fails the build.
- **The LINT-19 carve-out threshold is set at 500 on one data point.** It comes from a single
  published rollout where the gate became unworkable at ~6,000 total warnings. Once the baseline
  is captured on this fleet (violation #13), confirm 500 is the right line here or move it —
  a threshold that carves out five of six lints has gated nothing.

**Deserves another research round.**

- **CI wall-clock and cache economics at this workspace's actual size.** matklad's ~10-minute
  budget for 200k LOC is cited (ci-release-and-distribution §1); ocx is 221k LOC across
  304 monomorphized crates with a 187-second release link time
  (`ocx/Cargo.toml:30`). Measure the current PR-gate wall clock, then answer: does `sccache`
  earn its keep on top of `rust-cache` here, and is the `lto = "fat"` + `codegen-units = 1`
  combination worth its link time on anything but the release job? Note this now has a second
  input: LINT-15 adds a *second* full clippy invocation to every PR.
- **Provenance verification, not just generation.** **REL-04** requires attestations. Nobody has
  asked what verifies them — errors-async-security.md risk #4 finds **no signature verification
  anywhere** in a fleet whose entire job is distributing OCI artifacts. The question is whether
  grim/ocx should verify attestations or cosign signatures on the artifacts *they install*,
  which is a product-security question this CI-scoped research deliberately did not enter.
- **Feature-combination coverage.** `cargo hack --each-feature` is unevaluated against ocx's
  real feature graph (notably `__testing`, which gates live code). Worth one pass to learn
  whether any feature combination currently fails to compile.

## Sub-artifacts

- [rust-tooling-ci/lints-and-toolchain-policy.md](rust-tooling-ci/lints-and-toolchain-policy.md)
  — Clippy lint groups verified against `declare_clippy_lint!` source, an annotated
  `[lints.clippy]` table, rustc allow-by-default lint policy, `#[expect]` discipline,
  `clippy.toml`, rustfmt stable-vs-unstable options, toolchain pinning, and the auxiliary tool
  landscape (shear/machete/hack/typos/taplo/committed).
- [rust-tooling-ci/ci-release-and-distribution.md](rust-tooling-ci/ci-release-and-distribution.md)
  — GitHub Actions job design and ordering, `rust-cache`/`sccache` caching, OS/arch/MSRV
  matrices, `cross` vs `cargo-zigbuild` vs musl, `cargo-dist`/`release-plz`/`git-cliff`,
  crates.io trusted publishing, `profile.release` tuning, docs.rs metadata, and supply-chain
  gates (`cargo-deny`, SHA pinning, `zizmor`, attestations), with a complete annotated workflow
  set.
- [rust-tooling-ci/lint-rollout-staging.md](rust-tooling-ci/lint-rollout-staging.md)
  *(follow-up round, commissioned by the first revision of this file)* — nine audited production
  `[workspace.lints]` configs, clippy's own group-enablement guidance, the JSON ratchet-baseline
  substitute for clippy's missing `--baseline`, the suppression-count ceiling, diff-scoped CI
  linting via reviewdog, published per-lint hit-rate tables at ~6,000-warning scale, and
  `cargo clippy --fix` reliability evidence.

## Key sources

| URL | Why it matters here |
|---|---|
| [Cargo Book — the `[lints]` section](https://doc.rust-lang.org/cargo/reference/manifest.html#the-lints-section) | Normative source for LINT-01/03: syntax, `priority`, workspace inheritance, stable since 1.74 |
| [rustc book — lint levels](https://doc.rust-lang.org/rustc/lints/levels.html) | The six levels, `#[expect]` semantics and `reason =` — the basis of LINT-08 |
| [Clippy lint configuration guide](https://doc.rust-lang.org/clippy/lint_configuration.html) | Group definitions and the full `clippy.toml` knob list behind LINT-04/09 |
| [Clippy `development/adding_lints.html`](https://doc.rust-lang.org/clippy/development/adding_lints.html) | Upstream's explicit "cherry-pick `restriction`, never enable the group" statement (LINT-04) |
| [Clippy `continuous_integration/index.html`](https://doc.rust-lang.org/clippy/continuous_integration/index.html) | The official `-D warnings` recommendation LINT-15 has to work around |
| [tsz `check-clippy-warn-ratchet.py`](https://raw.githubusercontent.com/tsz-org/tsz/main/scripts/arch/check-clippy-warn-ratchet.py) | The production per-lint JSON baseline, and the docstring documenting the `-D warnings` footgun (LINT-15/16) |
| [tsz `arch_guard_shared.py`](https://raw.githubusercontent.com/tsz-org/tsz/main/scripts/arch/arch_guard_shared.py) | The working suppression-count ceiling, tied to a tracking issue (LINT-17) |
| [stratalab/strata-core#2389](https://github.com/stratalab/strata-core/issues/2389) | The only published per-lint hit-rate table at ~6,000-warning scale; also the evidence a ratchet gets pulled out of the PR flow when the backlog is unshrinkable (LINT-11/19) |
| [rust-clippy `--fix` breakage: #8458](https://github.com/rust-lang/rust-clippy/issues/8458), [#13852](https://github.com/rust-lang/rust-clippy/issues/13852), [#10246](https://github.com/rust-lang/rust-clippy/issues/10246) | Multi-year open record of broken and compiling-but-wrong autofixes (LINT-18) |
| [rust-clippy #13755](https://github.com/rust-lang/rust-clippy/issues/13755) | Clippy's own tracker calling `arithmetic_side_effects` "really noisy" (LINT-05 deferral) |
| [astral-sh/uv `Cargo.toml`](https://github.com/astral-sh/uv/blob/main/Cargo.toml) | The one audited production project enabling `pedantic` wholesale — its 15-item allow-list is the model for LINT-04 |
| [rust-analyzer `Cargo.toml`](https://github.com/rust-lang/rust-analyzer/blob/master/Cargo.toml) | Most structured real config: group-priority scheme plus a curated restriction exception list |
| [giraffate/clippy-action](https://github.com/giraffate/clippy-action) | Off-the-shelf reviewdog-backed diff-scoped clippy (CI-12) |
| [rust-clippy `redundant_clone.rs` source](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/redundant_clone.rs) | Ground truth that it is `nursery`, not `perf` — corrects a widespread secondary-source error (LINT-13) |
| [rustc book — allowed-by-default lints](https://doc.rust-lang.org/rustc/lints/listing/allowed-by-default.html) | `unsafe_code`, `unreachable_pub`, `missing_docs` semantics for LINT-07/11 |
| [rustfmt `Configurations.md`](https://raw.githubusercontent.com/rust-lang/rustfmt/master/Configurations.md) | Authoritative stable/unstable split behind LINT-14 |
| [rustup — overrides](https://rust-lang.github.io/rustup/overrides.html) | `rust-toolchain.toml` fields and override precedence (TOOL-01) |
| [GitHub — security hardening for Actions](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions) | SHA pinning, minimal `GITHUB_TOKEN` scope, credential persistence (CI-01/02/03) |
| [EmbarkStudios/cargo-deny-action](https://github.com/EmbarkStudios/cargo-deny-action) | The advisories-split pattern, verbatim from upstream (CI-07) |
| [cargo-deny book](https://embarkstudios.github.io/cargo-deny/) | The four check categories and `deny.toml` model |
| [Swatinem/rust-cache](https://github.com/Swatinem/rust-cache/blob/master/README.md) | Cache-key composition and `save-if` semantics (CI-09) |
| [Cargo Book — profiles reference](https://doc.rust-lang.org/cargo/reference/profiles.html) | Exact defaults every REL-01 override is measured against |
| [axodotdev dist book](https://axodotdev.github.io/cargo-dist/book/) | The plan→build→host→publish pipeline both repos already run at v0.31.0 (REL-05) |
| [actions/attest-build-provenance](https://github.com/actions/attest-build-provenance) | SLSA provenance mechanics and `gh attestation verify` (REL-04) |
| [cargo-shear](https://github.com/Boshen/cargo-shear) | Parser-based unused/misplaced dependency detection (TOOL-05) |
| [astral-sh/uv `.github/workflows`](https://github.com/astral-sh/uv/tree/main/.github/workflows) | The best available ground-truth CI config for a large production Rust CLI |
| [matklad — Fast Rust Builds](https://matklad.github.io/2021/09/04/fast-rust-builds.html) | The CI wall-clock budget the open-questions section proposes measuring against |

## Revision log

**2026-08 — folded in `rust-tooling-ci/lint-rollout-staging.md`** (the follow-up round this file's
previous revision commissioned under "Turning this ruleset on without a suppression avalanche").

*New rules.* All IDs continue the existing sequence; nothing was renumbered.

- **LINT-15** — the `-D warnings` gate and the ratchet must be two separate clippy invocations.
  Added because a manifest-level group `warn` is promoted to a workspace-wide hard deny by
  `-D warnings`, which makes LINT-04 as previously written unimplementable as a ratchet.
- **LINT-16** — committed per-lint-code JSON warning baseline, must-not-increase per code,
  promote-and-delete on reaching zero. Added because clippy has no `--baseline` flag and this is
  the working production substitute.
- **LINT-17** — committed suppression ceiling over `#[allow(clippy::` **and** `#[expect(clippy::`
  together, plus a hard reject on newly introduced crate/module-level `#![…]` forms. Added as the
  mechanical countermeasure to the suppression avalanche; the `#[expect]` half is this fleet's
  adaptation, since LINT-08 makes `#[expect]` the sanctioned form and therefore the likely
  avalanche vector.
- **LINT-18** — one lint code per `cargo clippy --fix` commit, full test suite after each. Added
  on the strength of open clippy issues showing broken and compiling-but-semantically-wrong
  autofixes.
- **LINT-19** — the four-wave rollout order plus a 500-hit per-lint carve-out threshold. This is
  the direct answer to the open question the follow-up round was commissioned for.
- **CI-12** — diff-scoped clippy via `giraffate/clippy-action`, advisory only, never a substitute
  for LINT-16.

*Existing rules changed in place (ID and meaning preserved).*

- **LINT-01** — added the ratchet carve-out: a lint with a nonzero backlog lives in LINT-15's
  `-W` list, not the manifest. Without this, LINT-01's "all lint policy in `[workspace.lints]`"
  directly contradicts LINT-15/16.
- **LINT-04** — pedantic-as-a-group survives, but now requires an annotated allow-list and must
  enter through the ratchet. Changed because the follow-up found only 1 of 9 audited shipping
  projects enables the group, and even that one (`uv`) carries 15 allows; group enablement
  without an exception list is not a pattern anyone actually ships.
- **LINT-05** — `arithmetic_side_effects` removed from the day-one named set and deferred to
  LINT-19 wave 4, scoped by `arithmetic-side-effects-allowed` when it does land. Changed because
  clippy's own tracker calls it "really noisy" and no audited project enables it.
- **LINT-06** — unchanged in substance; rationale now records that both lints are already
  `warn`-by-default in `suspicious`, so they are zero-cost wave-1 entries.
- **LINT-09** — added `allow-panic-in-tests`, `allow-indexing-slicing-in-tests`, and an explicit
  `check-private-items = false` to the required `clippy.toml` keys.
- **LINT-11** — `unreachable_pub` now routes through the LINT-16 ratchet rather than the
  manifest, and the verification changed from a base-branch diff count to a baseline entry.
  Changed on hit-rate evidence: 1,006 hits / 17% of a real 6,000-warning rollout, only partially
  autofixable.
- **LINT-12** — doc lints moved explicitly to wave 4, pinned to `check-private-items = false`,
  and annotated with the content-free-prose limitation that no grep catches.
- **TOOL-03** — a toolchain bump must now also re-capture the LINT-16 baseline, because clippy
  group membership moves between releases (`excessive_nesting` complexity → pedantic).

*Verdict.* Item 3 rewritten to carry the allow-list and ratchet requirement. Item 9 added for the
staged-ratchet position. Items 1, 2, 4–8 unchanged.

*Open questions.* Removed **"Turning this ruleset on without a suppression avalanche"** — answered
by LINT-15/16/17/18/19. Removed **"Is `clippy::arithmetic_side_effects` tolerable at this
codebase's size?"** — answered: not on day one; deferred to wave 4 with per-type scoping. Added a
narrower successor question about whether the 500-hit carve-out threshold is right for this fleet,
since it currently rests on a single external data point.

*Other.* Applied-to-OCX violation #13 added (no ratchet infrastructure exists; baseline capture is
the first concrete step). AI-agent failure modes #2 (suppression-scope widening), #5 (blind
whole-group autofix) and #13 (content-free doc prose) added; the list is re-ranked accordingly and
is now 15 items. Frontmatter `consolidates` gained the follow-up artifact; `revised: 2026-08` added.
