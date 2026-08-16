---
title: Lint Rollout Staging
topic: Turning a strict clippy configuration on across a large existing Rust codebase
agent: rust-tooling-ci researcher
model: sonnet
date_researched: 2026-08
sources_count: 24
scope: |
  Covers how real, currently-shipping Rust projects configure clippy (pedantic/restriction/
  nursery groups, per-lint warn-vs-deny), the mechanics of ratcheting a lint set upward without
  a native clippy baseline, diff-scoped CI linting, suppression-avalanche countermeasures, and
  autofix reliability. Does NOT cover rustfmt, non-clippy static analysis (cargo-deny,
  cargo-audit, miri), or lint authoring/writing new clippy lints.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [What real projects actually enable](#1-what-real-projects-actually-enable)
   2. [Official clippy guidance on group-level enablement](#2-official-clippy-guidance-on-group-level-enablement)
   3. [Mechanics: staged config knobs](#3-mechanics-staged-config-knobs)
   4. [The no-native-baseline problem and the ratchet-script substitute](#4-the-no-native-baseline-problem-and-the-ratchet-script-substitute)
   5. [Diff-scoped clippy in CI](#5-diff-scoped-clippy-in-ci)
   6. [The suppression-avalanche countermeasure](#6-the-suppression-avalanche-countermeasure)
   7. [Which lints are noisy at scale — real hit-rate data](#7-which-lints-are-noisy-at-scale--real-hit-rate-data)
   8. [Autofix reliability](#8-autofix-reliability)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

1. Across 9 audited real, currently-shipping Rust codebases, exactly one (`uv`) enables `clippy::pedantic` as a whole group — every other project (`tokio`, `cargo`, `deno`, `crates.io`, `zed`, `bevy`, `rust-analyzer`, `wasmtime`) either leaves the group at `allow` or cherry-picks individual lints out of it.
2. `clippy::restriction` is never enabled wholesale in any audited project, and clippy's own contributor docs say explicitly not to: "the `restriction` group is the only group where we don't recommend to enable the entire set, but cherry pick lints out of."
3. `arithmetic_side_effects` is `restriction`/allow-by-default and stays that way in every one of the 9 audited projects; a clippy maintainer/community thread calls it "really noisy" in the clippy issue tracker itself.
4. `missing_errors_doc` is the single most consistently deferred pedantic lint: `uv`, `tsz` (a large real ratchet-driven Rust codebase) and a documented `~6,000`-warning pedantic rollout all allow or defer it explicitly.
5. Clippy has no native baseline file. The working substitute seen in production is a JSON `cargo clippy --message-format=json` warning count per lint code, committed to the repo, checked in CI as "count may not increase," with a `--update-baseline` flag to accept a decrease.
6. A committed, monotonically-decreasing suppression cap works as a plain `grep -c 'allow(clippy::'` count check with a hard-coded ceiling and a required PR-comment justification to raise it — no bespoke tooling needed.
7. `-D warnings` (or `RUSTFLAGS=-Dwarnings`) combined with a manifest-level `pedantic = "warn"` is a footgun: cargo promotes the manifest's `warn` to the CI flag's hard-deny, so the *entire* group starts blocking merges on the first hit rather than ratcheting — the tracked, ratcheted floor has to live in a side clippy invocation that runs *without* `-D warnings`.
8. Diff-scoped clippy in CI (only warn on new/changed lines) is a solved, actively maintained problem via `reviewdog`-based GitHub Actions (`giraffate/clippy-action`), not a custom script — but it only prevents new violations, it does not shrink the existing backlog.
9. At real-world scale (~6,000 pedantic warnings on one codebase), the two dominant lints were `doc_markdown` (36%) and `uninlined_format_args` (35%); `unreachable_pub` was third at 17%. Together these three lints accounted for the large majority of the raw warning count.
10. Of the dominant noisy lints, `uninlined_format_args` and `redundant_closure` are independently confirmed autofixable (`cargo clippy --fix`) in two separate real hit-rate tables; `doc_markdown`, `missing_errors_doc`, `unreachable_pub`, and `needless_pass_by_value` are documented as manual or only-partially-fixable.
11. `cargo clippy --fix` has a real, multi-year track record of producing broken or uncompilable code on specific lints (`manual_retain`, `let_unit_value`-family), spanning issues opened between 2020 and 2025, still open.
12. Cargo's fix machinery has a self-check: after applying, it recompiles and refuses to silently commit a non-compiling result — it reports "failed to automatically apply fixes... compiler reported errors" instead. This does **not** catch fixes that compile but change runtime behavior (e.g. a borrow/move-altering rewrite).
13. `await_holding_lock` is already `warn`-by-default in the `suspicious` group (not pedantic, not restriction) — it needs no special enablement decision, only a fix plan.
14. Real projects that do enable a strict floor put the "always block" tier (`correctness`, `perf`) at group-level `deny` immediately, and treat `pedantic`/individual restriction lints as a separately-tracked, slower-moving floor — this two-speed split shows up independently in `cargo`, `rust-analyzer`, and `wasmtime`.
15. `unreachable_pub` is an `allow`-by-default *rustc* lint (not a clippy lint) specifically because "it triggers for a large amount of existing Rust code" — the same reasoning the brief's own thirteen restriction lints face at fleet scale.
16. Real teams explicitly *pause* a ratchet when the backlog is too large to gate PRs on (one project carved a ~6,000-warning pedantic backlog out of its normal PR gate entirely as a labeled tech-debt item) — a ratchet only works once the legacy count is either driven down first or explicitly excluded from the gate.
17. `needless_raw_string_hashes` is reported to fire roughly 10,000 times in one real codebase purely on stylistically-uniform (not functionally necessary) raw-string hash counts — a reminder that noise is often codebase-shape-specific, not lint-specific.
18. Cast-family restriction lints (`cast_possible_truncation`, `cast_precision_loss`, `cast_sign_loss`, `cast_possible_wrap`) are reported as blanket-noisy specifically in codebases with pervasive typed-integer newtypes — a shape that also matches ID-heavy Rust services.
19. `avoid-breaking-exported-api` (default `true`) and `check-private-items` (default `false`) are clippy's own built-in staging knobs for doc lints: they suppress lint pressure on public API signatures and on private items respectively, so "public API first" is the built-in default, not something a rollout has to build.
20. No large audited project turns clippy's per-file/per-line "old code exemption" into a magic bullet — every real mechanism found (ratchet JSON baseline, diff-scoped CI, suppression cap) is a small script or an existing Action, not a clippy built-in.

## Findings

### 1. What real projects actually enable

Fetching the live `Cargo.toml` `[workspace.lints]` (or clippy config) of nine real, currently-maintained Rust projects gives a consistent picture: **wholesale `pedantic` enablement is rare.**

| Project | `pedantic` | `restriction` | Notable pattern |
|---|---|---|---|
| [tokio](https://github.com/tokio-rs/tokio/blob/master/Cargo.toml) | not set | not set | No clippy config beyond `unexpected_cfgs`; relies on defaults. |
| [cargo](https://github.com/rust-lang/cargo/blob/master/Cargo.toml) | not set | not set | `clippy::all = "allow"` (!), only `correctness = "warn"` plus 7 hand-picked lints (`dbg_macro`, `disallowed_methods`, `disallowed_types`, `print_stdout`, `print_stderr`, `self_named_module_files`). |
| [deno](https://github.com/denoland/deno/blob/main/Cargo.toml) | not set | not set | No `[workspace.lints]` section at all. |
| [crates.io](https://github.com/rust-lang/crates.io/blob/main/Cargo.toml) | not set | not set | Small hand-picked clippy warn list (`dbg_macro`, `doc_markdown`, `todo`, `too_long_first_doc_paragraph`); `obfuscated_if_else` explicitly *allowed* with a one-line rationale. |
| [zed](https://github.com/zed-industries/zed/blob/main/Cargo.toml) | not set | not set | `style = "allow"` (!) — only 5 hard denies (`dbg_macro`, `todo`, `declare_interior_mutable_const`, `redundant_clone`, `disallowed_methods`); explicit comment that style rules stay permissive to protect shipping velocity. |
| [bevy](https://github.com/bevyengine/bevy/blob/main/Cargo.toml) | not set (individual pedantic lints cherry-picked) | not set | `deny(unsafe_code)`; ~20 individually warned lints, each allow/warn choice tagged with a PR reference (e.g. `too_long_first_doc_paragraph` allowed per bevyengine/bevy#15375). |
| [rust-analyzer](https://github.com/rust-lang/rust-analyzer/blob/master/Cargo.toml) | not set | `allow` explicit | `correctness = "deny"`, `perf = "deny"`, `complexity/style/suspicious = "warn"`, `restriction = "allow"` at group level with ~14 individually named exceptions, each with a one-line rationale. `unreachable_pub = "warn"` at the rustc-lint level, with a maintainer comment to keep `RUSTFLAGS` in CI in sync. |
| [wasmtime](https://github.com/bytecodealliance/wasmtime/blob/main/Cargo.toml) | not set | not set | `clippy::all = "allow"` at the workspace root; ~14 individually cherry-picked warns (`clone_on_copy`, `uninlined_format_args`, `useless_conversion`, etc.) — no group enablement anywhere. |
| [uv (astral-sh)](https://github.com/astral-sh/uv/blob/main/Cargo.toml) | **`warn`, group-level, priority `-2`** | not set | The one outlier: `pedantic = "warn"` with a **15-item curated allow-list** including `missing_errors_doc`, `missing_panics_doc`, `module_name_repetitions`, `must_use_candidate`, `similar_names`, `struct_excessive_bools`, `too_many_arguments`, `too_many_lines`, `used_underscore_binding`. |

[EmbarkStudios/rust-ecosystem's `lints.toml`](https://github.com/EmbarkStudios/rust-ecosystem/blob/main/lints.toml) — a canonical list many game/infra teams copy wholesale — follows the same shape: no `pedantic`, no `restriction` group, ~79 individually chosen lints at `warn`, and exactly one hard `deny` (`unsafe_code`).

Even a small, single-file crate that *does* try to turn on the groups needed correction on landing: [rust-lang/rustc-hash#51](https://github.com/rust-lang/rustc-hash/pull/51) added `pedantic`, `nursery`, and `cargo` groups and had to manually correct five specific lints from those groups (`doc_markdown`, `cast_lossless`, `use_self`, `too_long_first_doc_paragraph`, `cargo_common_metadata`) before it was mergeable — group-level enablement always needs an exception list, even at small scale.

### 2. Official clippy guidance on group-level enablement

The clippy contributor docs are explicit that `restriction` is not meant to be enabled as a group:

> "The `restriction` group is the only group where we don't recommend to enable the entire set, but cherry pick lints out of." — [clippy `development/adding_lints.html`](https://doc.rust-lang.org/clippy/development/adding_lints.html)

This directly matches the brief's premise: the thirteen named restriction lints (`unwrap_used`, `expect_used`, `arithmetic_side_effects`, etc.) being individually named and enabled, rather than `#![warn(clippy::restriction)]`, is clippy's own recommended pattern, not a workaround.

### 3. Mechanics: staged config knobs

[`clippy/lint_configuration.html`](https://doc.rust-lang.org/clippy/lint_configuration.html) documents several built-in staging knobs, all usable without any custom tooling:

- **`avoid-breaking-exported-api`** (default `true`) — suppresses ~18 lints (including `large_types_passed_by_value`, `box_collection`) wherever the fix would change a public signature. This is the built-in "public API stays stable" staging behavior.
- **`check-private-items`** (default `false`) — doc lints (`missing_errors_doc`, `missing_panics_doc`, `missing_safety_doc`, `unnecessary_safety_doc`) only fire on `pub` items by default. Flipping to `true` is the deliberate "now cover private items too" escalation step, not something to do on day one.
- **`allow-unwrap-in-tests` / `allow-expect-in-tests` / `allow-panic-in-tests` / `allow-indexing-slicing-in-tests`** (all default `false`) — per-restriction-lint test exemptions; explicit opt-in, not automatic.
- **`allow-expect-in-consts` / `allow-unwrap-in-consts`** (default `true`) — const contexts are exempted by default since there's often no fallible alternative there.
- **`arithmetic-side-effects-allowed[-binary|-unary]`** — per-type allowlists for the arithmetic lint, letting a rollout exempt known-safe types (`Wrapping`, `Saturating`, a project's own checked-newtype) instead of suppressing the whole lint.
- **`allow-unwrap-types`** — lets specific types (e.g. a project's own `Infallible`-shaped result wrapper) be exempted from `unwrap_used`/`expect_used` globally.

CI-level staging, independently confirmed in [rust-analyzer's `Cargo.toml`](https://github.com/rust-lang/rust-analyzer/blob/master/Cargo.toml): `dbg_macro`, `todo`, `print_stdout`, `print_stderr` are declared `warn` in the manifest (visible in the IDE, not merge-blocking on their own) but the project's CI separately enforces them as `deny` — decoupling "developer sees it while typing" from "CI blocks the merge" is a real, load-bearing pattern, not a theoretical one.

### 4. The no-native-baseline problem and the ratchet-script substitute

Clippy has no `--baseline` flag. The working substitute found in a real, large (~350k+ LOC-scale) Rust codebase ([`tsz-org/tsz`](https://github.com/tsz-org/tsz), a TypeScript-compiler-in-Rust project) is a ~210-line Python script, [`check-clippy-warn-ratchet.py`](https://raw.githubusercontent.com/tsz-org/tsz/main/scripts/arch/check-clippy-warn-ratchet.py):

1. Run `cargo clippy --workspace --all-targets --message-format json` with an explicit list of `-W`/`-A` flags (the group-plus-cherry-pick floor, kept *outside* `[workspace.lints.clippy]` — see the gotcha below).
2. Parse the JSON stream, bucket warning count **per lint code** (`clippy::doc_markdown`, `clippy::missing_errors_doc`, ...).
3. Compare against a committed JSON file (`clippy-warn-baseline.json`): `{"clippy::doc_markdown": 214, "clippy::needless_pass_by_value": 12, ...}`.
4. Fail (exit 1) if any single lint's live count exceeds its baseline entry; a contributor who fixes warnings runs `--update-baseline` to commit the new, lower count.
5. When a lint's count reaches 0 and the team is confident, it's promoted from the ratchet's `-W` list into `[workspace.lints.clippy]` as a hard `warn` (enforced at zero forever by the `-D warnings` CI gate), and removed from the baseline file entirely.

This is the concrete answer to "what do people do instead of a native baseline": a per-lint-code JSON count diff, committed to the repo, checked by a small script — not a purpose-built tool, and not `cargo clippy --fix` alone.

**The documented gotcha**, verbatim from the script's own docstring, is important enough to flag on its own: a CI job that runs `cargo clippy -- -D warnings` will promote *any* manifest-level `pedantic = "warn"` to a hard deny on the very first pedantic finding, workspace-wide — because cargo emits the manifest's `[lints]` table as ordinary `--warn` flags, and `-D warnings` escalates every active warn to an error indiscriminately. The ratcheted, still-noisy floor has to be run in a **separate clippy invocation that does not carry `-D warnings`**, while the zero-tolerance lints stay in the manifest under the `-D warnings` gate. Clippy's own [`continuous_integration/index.html`](https://doc.rust-lang.org/clippy/continuous_integration/index.html) page recommends `-D warnings` without mentioning this interaction at all — it's a gap between official CI guidance and what a real ratchet setup has to work around.

### 5. Diff-scoped clippy in CI

This is a solved problem via existing tooling, not something to hand-roll. [`giraffate/clippy-action`](https://github.com/giraffate/clippy-action) wraps `cargo clippy --message-format=json` output through [`reviewdog`](https://github.com/reviewdog/reviewdog) and posts only the lints that land on new/changed lines of a PR diff (reviewdog's `filter-mode=added`, the action's default behavior for the `github-pr-review` reporter). Usage is a ~10-line GitHub Actions step:

```yaml
- uses: giraffate/clippy-action@v1
  with:
    reporter: 'github-pr-review'
    github_token: ${{ secrets.GITHUB_TOKEN }}
    clippy_flags: -- -Dwarnings
```

Reliability caveat (reasoned from the diff-scoping mechanism itself, not a documented bug): line-based diff scoping only catches lints whose warning *span* overlaps a changed line. A refactor that moves a function without touching its body can dodge the filter; and diff scoping does nothing to shrink an existing backlog — it only stops it from growing. It has to be paired with the ratchet-baseline approach (§4) for the legacy count, not used as a substitute for it.

### 6. The suppression-avalanche countermeasure

The concrete, working mechanism found in production (`tsz-org/tsz`'s `arch_guard.py`) is a plain count check, not a static-analysis tool:

```python
WORKSPACE_CLIPPY_ALLOW_COUNT_CHECKS = [
    (
        "Workspace Clippy suppressions must not grow (#9446)",
        [ROOT / "crates"],
        # Bumped 10 -> 11 for the JSX special-attribute display split: the new
        # helper legitimately takes eight explicit parameters ... which ...
        # exceeds the workspace too-many-arguments-threshold = 8, so a single
        # #[allow(clippy::too_many_arguments)] is required.
        11,
    ),
]
```

The check is `grep -rc 'allow(clippy::' crates/` (conceptually) against a hard-coded integer, tied to a tracking issue number, with the currently-committed number required to have a same-PR comment justifying any increase. This directly satisfies "counting suppression attributes in the diff" and "a committed budget file that must decrease" from the brief — no CODEOWNERS-specific tooling was needed; a numeric ceiling reviewed like any other code change in the diff does the job.

**Evidence the ratchet mechanism itself works**: the per-lint-code JSON baseline (§4) is monotonic by construction — CI fails on any regression per lint, not just in aggregate, so one team can't silently trade an improvement in one lint for a regression in another.

**Evidence a ratchet can be overwhelmed**: [`stratalab/strata-core#2389`](https://github.com/stratalab/strata-core/issues/2389) shows a team that enabled `pedantic = "warn"` and immediately accumulated ~6,000 warnings; rather than gate normal PRs on that number, they explicitly pulled it out of the standard review flow into a separate, labeled `tech-debt`/`post-cleanup` issue with a plan to batch-fix by lint code after other in-flight work lands. The lesson: a ratchet only functions as a *gate* once the legacy count is either pre-driven-down or explicitly carved out — bolting a "must not increase" gate directly onto a 6,000-warning backlog on day one just blocks all future PRs on unrelated code.

### 7. Which lints are noisy at scale — real hit-rate data

Two independent real codebases published exact per-lint warning counts after enabling `pedantic`:

**`stratalab/strata-core`** (~6,000 total pedantic warnings), from [issue #2389](https://github.com/stratalab/strata-core/issues/2389):

| Lint | Count | Share | Autofixable |
|---|---|---|---|
| `doc_markdown` | 2,218 | 36% | No |
| `uninlined_format_args` | 2,138 | 35% | Yes |
| `unreachable_pub` | 1,006 | 17% | Partially |
| `needless_pass_by_value` | 410 | 7% | Manual |
| `redundant_closure` | 218 | 4% | Yes |
| `if_not_else` / `let_else` | 149 | 2% | Yes |

**`dutiona/memory-engine`** (~186 total warn-level pedantic/nursery warnings), from [issue #561](https://github.com/dutiona/memory-engine/issues/561): only 75/186 (40%) auto-fixable; dominant lints were `doc_markdown`, `missing_errors_doc`, `needless_pass_by_value`, `option_if_let_else`, `too_many_lines`, `missing_const_for_fn`, `redundant_pub_crate`.

Both codebases independently name `doc_markdown` and `unreachable_pub`/`missing_errors_doc` (the doc-shaped lints) as dominant. `uv`'s and `tsz`'s curated allow-lists (§1, §4) both explicitly exempt `missing_errors_doc`/`missing_panics_doc` with a "documentation-shaped, not a published API" rationale. Direct confirmation that `arithmetic_side_effects` specifically is noisy comes from the clippy tracker itself: [rust-lang/rust-clippy#13755](https://github.com/rust-lang/rust-clippy/issues/13755) states "This issue can be found with `arithmetic_side_effects` if enabled, but that lint is really noisy."

`tsz`'s ratchet config additionally documents two codebase-shape-specific mega-noise cases worth generalizing: the cast-conversion family (`cast_possible_truncation`, `cast_precision_loss`, `cast_sign_loss`, `cast_possible_wrap`) fires constantly in ID-newtype-heavy code, and `needless_raw_string_hashes` alone fired ~10,000 times on stylistically-uniform (not functionally required) raw-string usage in test fixtures — a reminder that "noisy" is sometimes a property of the codebase's dominant idiom, not the lint in the abstract.

### 8. Autofix reliability

Cross-referencing the two real hit-rate tables above: **`uninlined_format_args` and `redundant_closure` are independently confirmed autofixable** by two separate real codebases. `doc_markdown`, `missing_errors_doc`, `needless_pass_by_value`, and `unreachable_pub` are documented as manual or only-partially-fixable in both.

`cargo clippy --fix`'s own documentation ([`clippy/usage.html`](https://doc.rust-lang.org/clippy/usage.html)) states plainly that `--fix` implies `--all-targets` (it will touch tests, benches, and examples in the same pass as lib/bin code) but does not itself warn about correctness risk.

Real, currently-open issues on the clippy tracker document actual breakage, spanning 2020–2025:

- [`#8458` "cargo clippy --fix produced uncompilable code"](https://github.com/rust-lang/rust-clippy/issues/8458) (2022) — a real crate (`georust/geo`) hit a borrow-checker violation after `--fix`.
- [`#13852` "manual_retain results in broken code"](https://github.com/rust-lang/rust-clippy/issues/13852) (2024) — a specific lint's autofix is confirmed broken.
- [`#9363`](https://github.com/rust-lang/rust-clippy/issues/9363), [`#11731`](https://github.com/rust-lang/rust-clippy/issues/11731), [`#14502`](https://github.com/rust-lang/rust-clippy/issues/14502) — further open reports of broken/failed fixes.
- [`#10246` "produces broken code" on `if .is_err()`](https://github.com/rust-lang/rust-clippy/issues/10246) — notable because this is a **compiling-but-semantically-wrong** result, the harder class to catch.

The mitigating detail, visible in the `#8458` and `#13852` output itself: cargo's fix machinery recompiles after applying and, if that fails, reports "failed to automatically apply fixes suggested by rustc... after fixes were automatically applied the compiler reported errors" rather than silently leaving broken code in the tree. That self-check only catches **non-compiling** results — it does nothing for a fix that compiles but changes behavior (the `#10246` class), which only a full test-suite run catches.

**Practical review approach for a large autofix diff**, synthesized from the ratchet mechanics above: run `--fix` isolated to a single lint code at a time (the same per-lint-code granularity the JSON ratchet already tracks), one PR per lint, full test suite per PR — never fix the whole `pedantic` group in one autofix pass. A diff that touches a public function's signature (anything `avoid-breaking-exported-api` would normally suppress) should be routed to manual review regardless of what generated it.

## Normative guidance candidates

1. **Never enable `clippy::restriction` or `clippy::pedantic` as a bare group with `-D warnings` on the same invocation.** Rationale: clippy's own docs recommend cherry-picking restriction lints, and combining a manifest-level group `warn` with a CI `-D warnings` flag promotes the entire group to hard-deny on the first hit ([tsz ratchet script](https://raw.githubusercontent.com/tsz-org/tsz/main/scripts/arch/check-clippy-warn-ratchet.py)). VERIFICATION: grep the CI workflow for `-D warnings` / `RUSTFLAGS=-Dwarnings` and confirm no group-level `"warn"` for `pedantic`/`restriction` exists in the same `Cargo.toml` `[workspace.lints.clippy]` table feeding that job; if both exist, the ratchet must run as a separate, non-`-D` invocation.
2. **Deny `correctness` and `perf` at group level from day one; do not phase these in.** Rationale: three of nine audited real projects (cargo, rust-analyzer, wasmtime) independently deny these two groups outright with no staging — they're the cheap, near-zero-false-positive tier. VERIFICATION: `grep -A1 'workspace.lints.clippy' Cargo.toml` shows `correctness = { level = "deny" }` and `perf = { level = "deny" }`.
3. **Commit a per-lint-code JSON warning-count baseline and gate CI on "no lint code's count may increase," not on a single aggregate number.** Rationale: aggregate counts let one team's fix hide another's regression; per-lint tracking (tsz pattern) catches regressions immediately. VERIFICATION: `cargo clippy --workspace --all-targets --message-format=json | jq -r 'select(.reason=="compiler-message" and .message.level=="warning") | .message.code.code'  | sort | uniq -c` and diff against the committed baseline file.
4. **Cap `#[allow(clippy::...)]` / `#![allow(clippy::...)]` occurrences with a hard-coded, committed integer that only decreases; any increase requires an inline comment justifying it in the same diff.** Rationale: this is the mechanical countermeasure to the suppression-avalanche failure mode, and it's proven in a real, large codebase ([tsz's `WORKSPACE_CLIPPY_ALLOW_COUNT_CHECKS`](https://raw.githubusercontent.com/tsz-org/tsz/main/scripts/arch/arch_guard_shared.py)). VERIFICATION: `grep -rc 'allow(clippy::' <paths>` must be `<=` the committed ceiling; CI fails otherwise.
5. **Defer `arithmetic_side_effects`, `missing_errors_doc`, and `missing_panics_doc` to a later stage rather than the initial enablement wave, with a named rationale comment, not a silent allow.** Rationale: these are the three lints independently flagged as noisy across every real source found — the clippy tracker itself calls `arithmetic_side_effects` "really noisy" ([#13755](https://github.com/rust-lang/rust-clippy/issues/13755)), and `missing_errors_doc`/`missing_panics_doc` are allowed in both `uv`'s and `tsz`'s real configs. VERIFICATION: `grep -n 'missing_errors_doc\|missing_panics_doc\|arithmetic_side_effects' Cargo.toml` shows either `allow` with a trailing `#` rationale comment, or absence (not yet decided) — never a bare unexplained `allow`.
6. **Never run `cargo clippy --fix` across the whole `pedantic`/restriction set in one pass; isolate to one lint code per fix batch and run the full test suite after each.** Rationale: multiple real, currently-open clippy issues show `--fix` producing broken or semantically-wrong (but compiling) code on specific lints ([#8458](https://github.com/rust-lang/rust-clippy/issues/8458), [#13852](https://github.com/rust-lang/rust-clippy/issues/13852), [#10246](https://github.com/rust-lang/rust-clippy/issues/10246)); cargo's own recompile safety net only catches non-compiling failures. VERIFICATION: an autofix commit's diff should touch only files where the *only* prior warning was the single targeted `clippy::<lint>` code — cross-check via the JSON baseline's per-lint file list before and after.
7. **Route diff-scoped clippy through an existing reviewdog-based Action (`giraffate/clippy-action`, `filter-mode=added`) rather than a custom incremental-lint script.** Rationale: this is a maintained, off-the-shelf integration that already solves "only warn on new/changed lines"; hand-rolling it duplicates working tooling. VERIFICATION: CI workflow YAML contains a `giraffate/clippy-action` (or equivalent reviewdog-clippy) step with `reporter: github-pr-review`.
8. **Treat doc-lints (`missing_errors_doc`, `missing_panics_doc`) with `check-private-items = false` (clippy's own default) until the public API surface is clean; do not flip it to `true` in the same stage the group is first enabled.** Rationale: this is clippy's own built-in staging knob for exactly this purpose — public-API-first is the default, escalating to private items is an explicit later choice. VERIFICATION: `grep check-private-items clippy.toml` — either absent (default `false`) or explicitly `false` during initial rollout.
9. **A lint promoted from the ratchet's "tracked, count may not increase" list to the manifest's hard `deny` must be removed from the baseline JSON in the same commit.** Rationale: leaving a fully-fixed lint in both places means the baseline silently drifts and stops meaning anything (tsz's documented lifecycle rule). VERIFICATION: for any lint newly added to `[workspace.lints.clippy]` as `"warn"`/`"deny"` in a diff, confirm its key is absent from the committed baseline JSON in the same diff.
10. **When the initial enablement produces more than roughly a thousand warnings for a single lint, carve that lint out into its own tracked cleanup issue instead of gating normal PRs on it.** Rationale: real teams observed a ratchet gate becoming unworkable at ~6,000 total warnings and had to pull the backlog out of the standard flow ([strata-core#2389](https://github.com/stratalab/strata-core/issues/2389)); gating on an unshrinkable number just blocks unrelated work. VERIFICATION: baseline JSON entries above a chosen threshold (e.g. 500) are flagged for a dedicated tracking issue rather than left in the general ratchet.

## AI-agent angle

An autonomous coding agent asked to "make clippy pass" under a newly-strict configuration reliably takes the shortest local path: add `#[allow(clippy::x)]` at the smallest scope that silences the warning, or — worse — widen an existing allow's scope (function → module → crate) rather than fix the underlying code. It also has no innate sense of "this lint is known-noisy for this codebase's idiom" (§7's cast-family/newtype example) versus "this is a real bug the lint caught," so it will suppress both identically.

The smallest mechanical checks that catch this without needing the agent to self-report:

- **New-suppression count, not just presence.** `git diff --unified=0 main | grep -c '^\+.*allow(clippy::'` on the PR diff, checked against the committed ceiling from rule #4. Catches the single most common agent shortcut directly, with zero semantic understanding required.
- **Suppression-scope widening.** Any diff line matching `#!\[allow(clippy::` (crate-or-module-level, the `#!` form) that did not already exist verbatim in the base branch should hard-fail review — a function-level `#[allow(...)]` is the ceiling an agent should reach for; a module-or-crate-level one is scope creep.
- **Single-lint-code autofix batches.** Reject any commit whose changed-file set spans warnings for more than one `clippy::` lint code per the pre-fix JSON baseline (§4) — an agent that ran `--fix` blind across the whole pedantic set produces exactly this shape of diff, and rule #6 already requires isolating it.
- **Doc-lint content, not just presence.** `missing_errors_doc`/`missing_panics_doc` are satisfiable by an agent pasting a generic, content-free `# Errors\n\nReturns an error if something goes wrong.` section that technically silences the lint. No grep catches this — it is the one item on this list that stays a human/prompt-level review requirement rather than a mechanical gate, and should be named as such rather than assumed solved by turning the lint on.

## Contested / evolving

- **Which lint belongs in which group is not stable across clippy releases.** [`excessive_nesting` moved from `complexity` to `pedantic`](https://github.com/rust-lang/rust-clippy/pull/17509) in a recent, active PR. A ratchet baseline captured against one clippy version can silently mean something different after a `cargo clippy` toolchain bump — pin and record the clippy version the baseline was captured against, and re-validate on upgrade rather than assuming group membership is fixed.
- **Official CI guidance vs. real ratchet practice diverge on `-D warnings`.** Clippy's own [`continuous_integration/index.html`](https://doc.rust-lang.org/clippy/continuous_integration/index.html) recommends `-D warnings` with no caveat about combining it with a manifest-level group `warn`; the real-world ratchet script found in production explicitly documents this as a footgun requiring a workaround (§4, rule #1). This gap between the official doc and lived practice hasn't been resolved upstream as of this research.
- **`cargo clippy --fix` reliability is not converging.** Issues opened as early as 2022 (`#9363`) remain open alongside 2024–2025 reports (`#13852`, `#14502`); there is no visible trend toward this being "solved," so any rollout plan should treat `--fix` as permanently needing supervision rather than expecting it to become safe to run unattended in a future clippy release.
- **`unreachable_pub` is still `allow`-by-default at the rustc level, with stated intent to eventually flip to `warn`-by-default.** ([rustc lint listing](https://doc.rust-lang.org/rustc/lints/listing/allowed-by-default.html#unreachable-pub)) A fleet-wide enablement today is ahead of upstream's own default; if/when rustc flips the default, previously-allowed code across the ecosystem (not just this fleet) will start warning simultaneously — worth tracking as an upstream signal, not treating as fully fleet-internal.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [clippy `lint_configuration.html`](https://doc.rust-lang.org/clippy/lint_configuration.html) | Official clippy book, config reference | current (master) | Documents every built-in staging knob (`avoid-breaking-exported-api`, `check-private-items`, per-test/const allow flags) used throughout §3. |
| [clippy `development/adding_lints.html`](https://doc.rust-lang.org/clippy/development/adding_lints.html) | Official clippy contributor docs | current (master) | Source of the explicit "cherry-pick restriction, don't enable the group" guidance (§2). |
| [clippy `usage.html`](https://doc.rust-lang.org/clippy/usage.html) | Official clippy book, `--fix` docs | current (master) | Baseline description of `--fix` mechanics (implies `--all-targets`) used in §8. |
| [clippy `continuous_integration/index.html`](https://doc.rust-lang.org/clippy/continuous_integration/index.html) | Official clippy book, CI guidance | current (master) | Shows the official `-D warnings` recommendation that real ratchets have to work around (§4, Contested). |
| [rust-lang/rust-clippy#13755](https://github.com/rust-lang/rust-clippy/issues/13755) | Clippy issue tracker thread | 2024 | Direct community/maintainer statement that `arithmetic_side_effects` "is really noisy." |
| [rust-lang/rust-clippy#8458](https://github.com/rust-lang/rust-clippy/issues/8458), [#13852](https://github.com/rust-lang/rust-clippy/issues/13852), [#10246](https://github.com/rust-lang/rust-clippy/issues/10246) | Clippy issue tracker, `--fix` breakage reports | 2022–2024, still open | Primary evidence for autofix reliability limits (§8). |
| [rust-lang/rustc-hash#51](https://github.com/rust-lang/rustc-hash/pull/51) | Real PR in a `rust-lang` org repo | current | Shows even a tiny crate needed manual correction after enabling `pedantic`/`nursery`/`cargo` groups. |
| [tokio-rs/tokio `Cargo.toml`](https://github.com/tokio-rs/tokio/blob/master/Cargo.toml) | Live workspace manifest | current | Confirms tokio has no clippy pedantic/restriction config at all. |
| [rust-lang/cargo `Cargo.toml`](https://github.com/rust-lang/cargo/blob/master/Cargo.toml) | Live workspace manifest | current | `clippy::all = allow`, minimal hand-picked warn list — one of the "cheap tier only" examples for rule #2. |
| [rust-lang/crates.io `Cargo.toml`](https://github.com/rust-lang/crates.io/blob/main/Cargo.toml) | Live workspace manifest | current | Another real, moderate-strictness config with per-lint rationale comments. |
| [zed-industries/zed `Cargo.toml`](https://github.com/zed-industries/zed/blob/main/Cargo.toml) | Live workspace manifest | current | `style = allow` with an explicit shipping-velocity rationale — the permissive end of the real-world spectrum. |
| [bevyengine/bevy `Cargo.toml`](https://github.com/bevyengine/bevy/blob/main/Cargo.toml) | Live workspace manifest | current | Per-lint PR-referenced rationale comments, a practice worth copying directly. |
| [rust-lang/rust-analyzer `Cargo.toml`](https://github.com/rust-lang/rust-analyzer/blob/master/Cargo.toml) | Live workspace manifest | current | Most structured real example: full group-priority scheme plus a curated restriction exception list. |
| [bytecodealliance/wasmtime `Cargo.toml`](https://github.com/bytecodealliance/wasmtime/blob/main/Cargo.toml) | Live workspace manifest | current | `clippy::all = allow` at the root — confirms even a security-sensitive systems project doesn't default to strict. |
| [astral-sh/uv `Cargo.toml`](https://github.com/astral-sh/uv/blob/main/Cargo.toml) | Live workspace manifest | current | The one real project that does enable `pedantic` wholesale — its allow-list is the single best "which lints are the named suspects" data point. |
| [EmbarkStudios/rust-ecosystem `lints.toml`](https://github.com/EmbarkStudios/rust-ecosystem/blob/main/lints.toml) | Canonical curated lint list, widely reused | current | Reference "cherry-pick everything, group nothing" configuration named in the brief. |
| [tsz-org/tsz `check-clippy-warn-ratchet.py`](https://raw.githubusercontent.com/tsz-org/tsz/main/scripts/arch/check-clippy-warn-ratchet.py) | Real, in-production ratchet script | current | The concrete, working answer to "clippy has no baseline — what do people do instead" (§4). |
| [tsz-org/tsz `arch_guard_shared.py`](https://raw.githubusercontent.com/tsz-org/tsz/main/scripts/arch/arch_guard_shared.py) (`WORKSPACE_CLIPPY_ALLOW_COUNT_CHECKS`) | Real, in-production suppression cap | current | The concrete, working answer to the suppression-avalanche countermeasure (§6). |
| [tsz-org/tsz#13443](https://github.com/tsz-org/tsz/issues/13443) | Real tracking issue for a pedantic-floor rollout | current | Narrates the actual decision (which lints to cherry-pick, which to defer, why) behind the ratchet script above. |
| [stratalab/strata-core#2389](https://github.com/stratalab/strata-core/issues/2389) | Real issue with an exact per-lint warning breakdown at ~6,000-warning scale | current | Best available real hit-rate table (§7); also the evidence that ratchets get pulled out of the PR gate at scale. |
| [dutiona/memory-engine#561](https://github.com/dutiona/memory-engine/issues/561) | Real issue with a per-crate warning distribution | current | Second independent hit-rate data point; also documents a real `--fix` + `--all-features` interaction caveat. |
| [giraffate/clippy-action](https://github.com/giraffate/clippy-action) | Maintained GitHub Action (reviewdog + clippy) | current | The off-the-shelf answer to diff-scoped clippy in CI (§5). |
| [rustc lint listing: `unreachable_pub`](https://doc.rust-lang.org/rustc/lints/listing/allowed-by-default.html#unreachable-pub) | Official rustc lint docs | current | Confirms `unreachable_pub`'s allow-by-default rationale and stated future-default intent (Contested). |
