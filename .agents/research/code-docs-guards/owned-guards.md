---
title: "Owned guards: lint blast radius, a planted-proof re-check, and where a type replaces a comment"
topic: code-docs / guards / lint-owned-guards (wave-3 follow-up)
agent: owned-guards-dive
model: claude-sonnet-5
date_researched: 2026-09-27
sources_count: 22
scope: >
  Answers the three open items the guards consolidation
  (`code-docs-guards.md`) left for a second round: the measured blast radius
  of enabling `let_underscore_must_use`/`let_underscore_drop`/
  `let_underscore_untyped`/`wildcard_enum_match_arm` fleet-wide (GRD-10's own
  "the share the lint flags is unmeasured" gap), an independent re-verification
  of the OCX-09/GRM-08 planted-rename proof on the real fleet files (not a
  synthetic crate), and the type-owned-guards question no prior dive
  covered: which of the 40 eval-sites.md mechanism sites, the 44
  exhaustiveness-claim lines, and the 100 sample.md guard blocks could a
  type — not a lint, not a test, not a comment — own instead. Does NOT
  re-derive lint-owned-guards.md's own findings (RAII binding lints,
  exhaustive-match lints, cross-language equivalents) except where a fresh,
  independent measurement changes or corrects them.
---

# Owned guards: lint blast radius, a planted-proof re-check, and where a type replaces a comment

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  1. [Toolchain and scratch-copy methodology, including a CLI-flag gotcha](#1-toolchain-and-scratch-copy-methodology)
  2. [Lint blast radius, measured](#2-lint-blast-radius-measured)
  3. [Read-30 classification](#3-read-30-classification)
  4. [Planted proof, re-verified on the real fleet files](#4-planted-proof-re-verified-on-the-real-fleet-files)
  5. [Type-owned guards: the 40 mechanism sites](#5-type-owned-guards-the-40-mechanism-sites)
  6. [Type-owned guards: worked sketches](#6-type-owned-guards-worked-sketches)
  7. [Type-owned guards: estimate across the 100-guard sample](#7-type-owned-guards-estimate-across-the-100-guard-sample)
  8. [Exhaustiveness claims as a class](#8-exhaustiveness-claims-as-a-class)
- [Normative guidance candidates](#normative-guidance-candidates)
- [Decisions this dive proposes](#decisions-this-dive-proposes)
- [Sources](#sources)

## Summary

- Toolchain: rustc/clippy **1.95.0 / 0.1.95** — matches the `rust-toolchain.toml` pin in all three repos (`ocx`, `grimoire`, `ocx-mirror`). The environment's default `rustup` toolchain is 1.93.1; every run below used `rustup run 1.95.0` explicitly.
- **`-A warnings` cannot be selectively re-enabled by a later, more specific `-W <lint>` on the same command line, in either order.** Verified directly against `clippy-driver` on a two-line reproduction: `-A warnings -W clippy::let_underscore_untyped` and the reversed order both stay silent; only patching the crate's own `[lints.rust] warnings` from `"deny"` to `"warn"` (a one-line scratch-copy edit) lets the targeted `-W` flags actually surface. This is the mechanism behind GRD-10's own unresolved "the share the lint flags is unmeasured" — a first attempt using `-A warnings` as a workaround for ocx/ocx-mirror's `warnings = "deny"` produced **zero** hits for all three target lints across the whole workspace, silently, with exit code 0.
- Measured, compiler-verified hit counts (deduped by file:line, own-crate code only — `cargo clippy` never runs the clippy driver on non-workspace path dependencies, so vendored forks under `external/` never appear regardless of cap-lints):

  | Lint | ocx | grimoire | ocx-mirror (own crates) |
  |---|---|---|---|
  | `clippy::let_underscore_must_use` | 156 | 98 | 32 |
  | `let_underscore_drop` (rustc) | 163 | 70 | 39 |
  | `clippy::let_underscore_untyped` | 178 | 62 | 43 |
  | `clippy::wildcard_enum_match_arm` | 232 | 108 | 41 |

- Read 30 of the ~830 combined hits (stratified 10 `let_underscore_untyped` / 10 `wildcard_enum_match_arm` / 5 `let_underscore_drop` / 5 `let_underscore_must_use`, `random.seed(42)` over the sorted deduped location sets): **6 real guards (20%)**, **3 ERR-19-style deliberate discards with a rationale comment (10%)**, **21 noise (70%)**. The dominant noise source by far is a mock TCP/HTTP test server or `#[tokio::test]` body discarding an I/O result it doesn't care about, and a `_ => panic!("expected X")` fallback arm in a test assertion that unwraps one enum variant.
- This gives GRD-10's own open question a number: **roughly 70% of what `let_underscore_untyped`/`wildcard_enum_match_arm` would flag fleet-wide today is test-fixture noise, not production guards.** A blanket workspace-`warn` on either lint would cost far more triage than the ~20% real-guard yield justifies (see [Decisions](#decisions-this-dive-proposes)).
- **Independently re-verified lint-owned-guards.md's central claim on the real fleet files**, not a synthetic reproduction: renaming OCX-09's `_render_lock` (`ocx:crates/ocx_package_manager/src/tasks/render_toolchain.rs:892`) and GRM-08's `_slot` (`grimoire:src/tui/update_check.rs:328`) to bare `_` fires `let_underscore_drop` and `clippy::let_underscore_untyped` on both, today, with neither struct carrying `#[must_use]`. Adding `#[must_use]` to `LockedFile`/`InFlightGuard` adds a third diagnostic (`let_underscore_must_use`) but changes nothing about whether the rename itself is caught — confirms lint-owned-guards.md §1 exactly, now against the actual fleet source instead of a lookalike scratch crate.
- **Type-owned guards, the 40 mechanism sites (`eval-sites.md`): 24/40 (60%) have a concrete type/newtype/enum/builder sketch** that would make the harvest's own named breaking edit fail to compile (or, for Python/TypeScript, fail static analysis). The rest split into 3 already lint/checker-owned (OCX-09, OCX-17, GRM-08 — `#[must_use]` is itself a type-level attribute, so these sites sit in both buckets), 4 borderline (partial help, doesn't fully close the gap), and 12 genuinely not type-representable: single-function statement ordering (OCX-01, GRM-06), platform-API gaps (OCX-03, GRM-02's Windows half), crash/durability that needs fault injection (OCX-14, GRM-04's underlying claim — though GRM-04's *sequencing* is separately type-ownable, see §6), deliberate non-optimizations (OCX-21, OCX-24), and business/heuristic judgment calls (OCX-02, OCX-08).
- **One correction to lint-owned-guards.md's own classification.** OCX-23 (`remove_segment` "is not a containment check and must not be read as one") was filed comment-only there, reasoned as a negative-space claim no test can prove the absence of. It is type-ownable: a `ContainedPath` newtype constructible only by the real containment check turns "don't treat this function's output as containment-checked" from prose into a type mismatch a misreading literally cannot compile.
- **The fleet already practices the exact pattern this dive recommends, uncredited.** `ocx:crates/ocx_sign/src/verify.rs:52-58` documents a private `signing_instant` submodule whose entire purpose is a `SigningInstant` newtype so "no caller can substitute the wall clock for a signing-time proof" — this is `sample.md` guard-block #58's own site (`ocx:crates/ocx_sign/src/verify.rs:55`). Neither `guard-shape.md` nor `lint-owned-guards.md` cites it as a worked example, and it is exactly the shape both dives ask the rule to recommend elsewhere.
- **Estimate across the 100-guard `sample.md` §5 corpus (methodology-graded, not a full code read of all 100): roughly 45/100 (45%)** show a type-ownable shape from the guard's own one-line description, spot-checked against real source for 9 of them. The rate is uneven by repo/language: ocx ~47% (27/58), grimoire ~50% (8/16, +1 borderline), grimoire-vscode ~80-100% (4-5/5, small n), ocx-catalog (TS) ~25-40% (2 solid + 3 borderline / 12), ocx-sdk-python ~25-33% (2-3/9) — Python's weaker static-enforcement ceiling shows up directly as a lower rate even where the *shape* (a validating constructor) is identical to a Rust newtype.
- Recurring type-ownable **shapes**, counted across the 40-site table: resolved/validated newtype (7: OCX-06, OCX-11, OCX-13, OCX-19, OCX-23, PY-02, PY-04, TS-01), tri-state enum replacing `Option<bool>`/boolean collapse (4: OCX-16, OCX-20, GRM-01, TS-02), single-computation-site bundling (3: GRM-03, plus `insecure.rs`/`fingerprint.rs`-family sites in the 100-sample), typestate/builder ordering (4: GRM-04, GRM-07, OCX-12-adjacent, PY-03), no-Default required field/trait method (2: OCX-12, and `reachability_graph.rs:147` from the 100-sample), sealed policy-parameter (1: GRM-02) — see [§6](#6-type-owned-guards-worked-sketches) for the sketches.
- Fetched `typing.assert_never`'s actual behavior twice and got two different answers: a `WebFetch` summary of `docs.python.org` reported it raises `TypeError`; `python3 -c "import inspect, typing; print(inspect.getsource(typing.assert_never))"` on the installed **CPython 3.14.5** shows the real body raises `AssertionError`. The source read is authoritative and matches lint-owned-guards.md's prior claim — the fetched-page summary was simply wrong. Recorded here as a live instance of "don't trust a fetch summary over the primary source when they disagree," not as a correction anyone needs to act on.
- **Exhaustiveness claims as a class are unchanged from lint-owned-guards.md/GRD-09**: re-confirmed the 44-line/26-file count is a Rust-only phenomenon in this fleet and that the checker (`#[deny(clippy::wildcard_enum_match_arm)]`, scoped) remains the right owner; nothing in this dive's measurement moves that verdict.
- **Decision: do not ship `clippy::let_underscore_untyped` or `clippy::wildcard_enum_match_arm` as a workspace-wide `warn`.** The measured noise ratio (70-90% depending on lint) makes either a poor fleet default; `let_underscore_drop` (GRD-10) and the per-match scoped `#[deny(wildcard_enum_match_arm)]` (GRD-09) are unchanged and remain the right shipped config. See [Decisions](#decisions-this-dive-proposes).
- **New guidance candidate**: before crediting a guard "comment-only" or "test-only" under GRD-07, check whether a type would make the named breaking edit fail to compile. This is additive to GRD-07/GRD-08, not a replacement — see [Normative guidance candidates](#normative-guidance-candidates) item 6.

## Findings

### 1. Toolchain and scratch-copy methodology

Scratch root: `/home/mherwig/.cache/research-lang/code-docs-scratch/guards-lint-owned/`. Built with `git -C /home/mherwig/dev/<repo> archive HEAD | tar -x -C <dest>` per the task's rule, plus the same treatment for every path-dependency submodule each workspace actually compiles against (`ocx/external/{rust-oci-client,docker_credential,sigstore-rs}`; `grimoire/external/{docker_credential,rust-oci-client}`; `ocx-mirror/external/ocx` — itself archived, together with *its own* nested `external/{rust-oci-client,docker_credential,sigstore-rs}`, three submodule levels deep). No fleet repository was modified; only these scratch copies were built or edited. `CARGO_TARGET_DIR` was set under the scratch tree's own `target/` for every invocation; every `cargo clippy` run finished well inside the 1800s bound (34s-1m15s for a from-scratch `--workspace --all-targets` build per repo).

**The `-A warnings` gotcha.** `ocx` and `ocx-mirror` (and `ocx-mirror`'s nested `external/ocx` copy) set `[workspace.lints.rust] warnings = "deny"` (`ocx:Cargo.toml:373`, `ocx-mirror:Cargo.toml:191`), which Cargo turns into an auto-injected `-D warnings` on every workspace-member build. The first attempt to measure the four target lints used the common workaround `-- -A warnings -W clippy::let_underscore_must_use -W let_underscore_drop -W clippy::let_underscore_untyped`, reasoning that a later, lint-specific `-W` should override an earlier, broader `-A` group flag (this is true for an ordinary clippy group, verified below) — the whole workspace built clean, exit 0, and the JSON diagnostic stream contained **zero** hits for any of the three lints, only 9 unrelated `dead_code` warnings from a vendored fork. Isolated reproduction (`clippy-driver`, two-line crate, `TMPDIR` under the scratch dir since `/tmp` write is blocked by the sandbox):

```
$ rustup run 1.95.0 clippy-driver --edition 2021 -A warnings -W clippy::let_underscore_untyped --crate-type lib --out-dir out src/lib.rs
(no output — the untyped-let warning is silenced)
$ rustup run 1.95.0 clippy-driver --edition 2021 -W clippy::let_underscore_untyped -A warnings --crate-type lib --out-dir out src/lib.rs
(no output — same result, reversed order)
```

Contrast with an ordinary group, same crate, same two flags but a ordinary restriction group instead of the `warnings` meta-group:

```
$ rustup run 1.95.0 clippy-driver --edition 2021 -A clippy::restriction -W clippy::let_underscore_untyped --crate-type lib --out-dir out src/lib.rs
warning: non-binding `let` without a type annotation
 --> src/lib.rs:3:5
  = note: requested on the command line with `-W clippy::let-underscore-untyped`
$ rustup run 1.95.0 clippy-driver --edition 2021 -W warnings -A clippy::let_underscore_untyped --crate-type lib --out-dir out src/lib.rs
(no output — -A after -W warnings correctly silences it, as expected for an ordinary group)
```

The `warnings` meta-group behaves as a hard ceiling/floor (`-A warnings` = nothing may exceed Allow; the crate's own `-D warnings` = nothing may go below Deny) that a later, more specific flag cannot escape in either direction — this is the same mechanism that, in the *first* invocation attempt (no `-A warnings`, plain `-W` flags against ocx's own `-D warnings`), silently promoted `clippy::let_underscore_must_use` to a hard **error** and aborted the build three files in (`ocx_exit/src/exit_code.rs:242-244`), with the diagnostic itself saying `implied by -D warnings`. **Fix used for every measurement below:** patch the scratch copy's own `Cargo.toml` (`ocx/Cargo.toml:373`, `ocx-mirror/Cargo.toml:191`, `ocx-mirror/external/ocx/Cargo.toml:373`), `warnings = "deny"` → `warnings = "warn"`, then run the target lints as plain `-W` with no `-A warnings` prefix at all. `grimoire` has no `[workspace.lints]` table and needed no patch.

### 2. Lint blast radius, measured

Command (identical shape per repo, `ocx` shown; `grimoire` and `ocx-mirror` used the same invocation from their own scratch root with their own `CARGO_TARGET_DIR`):

```
$ cd .../guards-lint-owned/ocx
$ export CARGO_TARGET_DIR=.../guards-lint-owned/target/ocx
$ rustup run 1.95.0 cargo clippy --workspace --all-targets --message-format=json \
    -- -W clippy::let_underscore_must_use -W let_underscore_drop \
       -W clippy::let_underscore_untyped -W clippy::wildcard_enum_match_arm \
    > ocx-clippy2.json
$ echo $?
0
```

Counts were extracted by parsing the JSON stream for `compiler-message` entries whose `message.code.code` matches one of the four lint names, taking the primary span's `(file_name, line_start)`, and deduplicating that set per lint (a location fires twice when `--all-targets` compiles both the lib and its test harness). Non-workspace path dependencies (`external/*`, `ocx-mirror/external/ocx` and its own nested externals) never appear in the output at all — `cargo clippy` only swaps in the clippy driver for workspace members, so `let_underscore_drop`, despite being a plain rustc lint, never fires on a path dependency either. The four totals are in the [Summary](#summary) table.

Cross-check against a plain-text grep for the broadest of the four (`clippy::let_underscore_untyped`, which matches literally every untyped `let _ = expr;`):

```
$ rg -c '^\s*let _ = ' --type rust --glob '!external/**' ocx | python3 -c "import sys; print(sum(int(l.rsplit(':',1)[1]) for l in sys.stdin))"
209
$ rg -c '^\s*let _ = ' --type rust --glob '!external/**' grimoire | python3 -c "import sys; print(sum(int(l.rsplit(':',1)[1]) for l in sys.stdin))"
113
$ rg -c '^\s*let _ = ' --type rust --glob '!external/**' ocx-mirror | python3 -c "import sys; print(sum(int(l.rsplit(':',1)[1]) for l in sys.stdin))"
44
```

Compiler-verified counts (178 / 62 / 43) sit at 85%, 55% and 98% of the raw grep counts respectively — the gap is explained by occurrences the regex matches but that carry a type ascription clippy correctly excludes, or that sit outside `--all-targets`' scope (doctests). This resolves GRD-10's own open line, "ocx has 215 `let _ = ` lines under `crates/` and grimoire 112 under `src/`; the share the lint flags is unmeasured" — the corrected raw counts are 209/113/44 and the *compiler-confirmed* share is 178/62/43.

### 3. Read-30 classification

Stratified sample (`random.seed(42)` over the sorted, deduped `(repo, file, line)` sets): 10× `clippy::let_underscore_untyped`, 10× `clippy::wildcard_enum_match_arm`, 5× `let_underscore_drop`, 5× `clippy::let_underscore_must_use`. Every row below was read with its enclosing function.

**Real guards (6/30, 20%)** — the discard/wildcard protects a real invariant, whether or not it currently carries a comment:

| Site | Shape |
|---|---|
| `ocx:crates/ocx_cli/src/app/seam.rs:197` | `let _ = unsafe { libc::atexit(tripwire) };` — comment already names the consequence ("leaves the tripwire unarmed, which loses the diagnostic and nothing else") |
| `grimoire:src/tui/companion_fetch.rs:117` | `let _ = self.tx.try_send(...)` inside a `Drop`-adjacent best-effort fallback, comment already explains why (`Drop` cannot `.await`) |
| `grimoire:src/install/vendor_agents.rs:61` | `match kind { Rule\|Agent\|Mcp => Declined, _ => Native }` — the grimoire "kind_support gate" family the guards consolidation already cites elsewhere (`vendor_kilo.rs`, `vendor_openclaw.rs`) |
| `ocx:crates/ocx_setup/src/rc_block.rs:264` | `match state { Current, Dirty if !force, Fresh, _ => ... }` over `BlockState`, comment names exactly which states the wildcard groups |
| `ocx:crates/ocx_sign/src/verify/trust_root.rs:173` | `let _ = tokio::fs::create_dir_all(cache_dir).await;` — "Best-effort: a missing cache dir is not a reason to fail the fetch" |
| `ocx:crates/ocx_project/src/lock.rs:1481` | test-scoped `RestorePerms` RAII guard, `impl Drop` discarding `set_permissions`'s result — same OCX-09/GRM-08 shape, in test code |

**ERR-19-style deliberate discards with rationale (3/30, 10%)**, all test-scoped: `ocx:crates/ocx_oci/src/auth/store.rs:881` ("the facade's contract here is that delete swallows helper-not-found..."), `ocx-mirror:src/command/package/pipeline/push/tests/push_driver.rs:303` ("Acceptable if environment prevents spec loading"), `ocx:crates/ocx_oci/src/client.rs:5361` ("Outcome is irrelevant — auth must precede the blob fetch either way").

**Noise (21/30, 70%)** — test-only mock TCP/HTTP servers discarding read/write results (`grimoire:src/catalog/registry_catalog.rs:2254`, `ocx:crates/ocx_oci/src/client.rs:6663,7558`, `ocx:crates/ocx_sign/src/verify/pipeline.rs:7901`, `ocx:crates/ocx_oci/src/client/builder.rs:1063`, `grimoire:src/catalog/forge.rs:2996`, `ocx:crates/ocx_index/src/ocx_index.rs:4751`, `ocx:crates/ocx_oci/src/endpoint.rs:1124`, `grimoire:src/oci/access/registry_client.rs:889,949`); `_ => panic!("expected X")` fallback arms unwrapping one enum variant inside a test assertion (`grimoire:src/command/config.rs:2607,3665,3667`, `ocx:crates/ocx_announce/src/claim.rs:1549`, `ocx:crates/ocx_announce/src/forge/git_stderr.rs:701`, `ocx:crates/ocx_store/src/file_structure/assemble.rs:1827`, `grimoire:src/tui/tree.rs:2226`); a discarded, *unused function parameter* rather than a call result (`grimoire:src/resolve/resolver.rs:55`, `let _ = scope;` — a different shape ERR-19 doesn't cover at all: silencing "unused variable" on a kept-for-future-use parameter, not discarding an operation's outcome); a production wildcard with no comment and no exhaustiveness claim (`ocx:crates/ocx_project/src/compose.rs:152`, an ordinary default-arm on an error-kind match); a `Drop` impl silently discarding two cleanup calls, no comment at all (`grimoire:src/tui/terminal_guard.rs:34`, arguably guard-shaped but currently undocumented — read as noise under a comment-presence rule, but a candidate to add a one-liner to); and the discard *inside the definition* of a purpose-built discard helper (`ocx:crates/ocx_util/src/result_ext.rs:10`, `impl<T,E> ResultExt for Result<T,E> { fn ignore(self) { let _ = self; } }` — the lint fires on the utility's own implementation, not a misuse of it; this type is itself an example of a discard already made explicit/type-owned at every *call* site via `.ignore()`).

### 4. Planted proof, re-verified on the real fleet files

lint-owned-guards.md verified its OCX-09/GRM-08 claim on synthetic scratch crates shaped like the fleet's guard types. This dive re-ran the same proof directly on the two named fleet files, in place, in the same scratch copies used for §2-3.

Both structs confirmed to lack `#[must_use]` today:

```
$ grep -n "struct LockedFile" -A4 ocx/crates/ocx_util/src/fs/locked_file.rs
30:pub struct LockedFile {
$ grep -n "struct InFlightGuard" -A4 grimoire/src/tui/update_check.rs
371:struct InFlightGuard {
```

Planted the exact rename the harvest names ("routine unused-binding cleanup"):

```
$ sed -i 's/let _render_lock = /let _ = /' ocx/crates/ocx_package_manager/src/tasks/render_toolchain.rs
$ sed -i 's/let _slot = InFlightGuard {/let _ = InFlightGuard {/' grimoire/src/tui/update_check.rs
$ cargo clippy -p ocx_package_manager --lib --message-format=short -- -W let_underscore_drop -W clippy::let_underscore_must_use -W clippy::let_underscore_untyped 2>&1 | grep render_toolchain.rs:892
crates/ocx_package_manager/src/tasks/render_toolchain.rs:892:9: warning: non-binding `let` without a type annotation
crates/ocx_package_manager/src/tasks/render_toolchain.rs:892:9: warning: non-binding let on a type that has a destructor
$ cargo clippy --bins --message-format=short -- -W let_underscore_drop -W clippy::let_underscore_must_use -W clippy::let_underscore_untyped 2>&1 | grep update_check.rs:328
src/tui/update_check.rs:328:17: warning: non-binding `let` without a type annotation
src/tui/update_check.rs:328:17: warning: non-binding let on a type that has a destructor
```

Then added `#[must_use]` to both structs and re-ran the identical command:

```
$ sed -i 's/^pub struct LockedFile {/#[must_use]\npub struct LockedFile {/' ocx/crates/ocx_util/src/fs/locked_file.rs
$ sed -i 's/^struct InFlightGuard {/#[must_use]\nstruct InFlightGuard {/' grimoire/src/tui/update_check.rs
... (same clippy invocations) ...
crates/ocx_package_manager/src/tasks/render_toolchain.rs:892:9: warning: non-binding `let` on an expression with `#[must_use]` type
crates/ocx_package_manager/src/tasks/render_toolchain.rs:892:9: warning: non-binding `let` without a type annotation
crates/ocx_package_manager/src/tasks/render_toolchain.rs:892:9: warning: non-binding let on a type that has a destructor
src/tui/update_check.rs:328:17: warning: non-binding `let` on an expression with `#[must_use]` type
src/tui/update_check.rs:328:17: warning: non-binding `let` without a type annotation
src/tui/update_check.rs:328:17: warning: non-binding let on a type that has a destructor
```

`#[must_use]` adds exactly one more diagnostic (`let_underscore_must_use`); `let_underscore_drop` and `let_underscore_untyped` fire identically with or without it. This is lint-owned-guards.md §1's finding, now confirmed against the actual fleet source rather than a lookalike. GRD-10 (mark the guard type `#[must_use]`, enable `let_underscore_drop` after triage) needs no revision.

### 5. Type-owned guards: the 40 mechanism sites

Method: for each of the 40 sites in `eval-sites.md` §3, read the site's own Ground truth / Breaking edit / Consequence columns (already reproduced in full in that file) and asked whether a type — a newtype with a smart constructor, a closed enum, a required (no-`Default`) field or trait method, a typestate/builder step, or a sealed policy parameter — would make the named breaking edit fail to compile (Rust) or fail static analysis (Python/TypeScript), independent of whether a test or lint already covers it. This is orthogonal to lint-owned-guards.md's lint/test/comment-only classification: several test-owned sites below are *also* type-ownable, which upgrades a runtime guarantee (only as good as the test suite's coverage) to a compile-time one.

| Class | Count | Sites |
|---|---|---|
| Type-ownable (concrete sketch, §6) | 24 | OCX-06, OCX-10, OCX-11, OCX-12, OCX-13, OCX-15, OCX-16, OCX-19, OCX-20, OCX-22, OCX-23; GRM-01, GRM-02, GRM-03, GRM-04, GRM-07; PY-01, PY-02, PY-03, PY-04; TS-01, TS-02, TS-04, and OCX-17 (checker/type overlap, see below) |
| Already lint/checker-owned (§4 and lint-owned-guards.md §1-2; `#[must_use]` is itself a type-level attribute) | 3 | OCX-09, OCX-17 (double-counted above — structural exhaustiveness *is* a compiler-enforced type fact), GRM-08 |
| Borderline (partial help only) | 4 | OCX-07, OCX-18, GRM-05, TS-03 |
| Not meaningfully type-representable | 12 | OCX-01, OCX-02, OCX-03, OCX-04, OCX-05, OCX-08, OCX-14, OCX-21, OCX-24; GRM-06; and the crash/durability half of GRM-04 and the login-heuristic half of OCX-02 are folded into their parent rows |

Why the 12 "not type-representable" sites resist it, grouped:

- **Single-function statement ordering with no cross-boundary API** (OCX-01: open-after-metadata-check inside one function body; GRM-06: unlink-before-close inside one `drop()`): a type can prevent two *different callers* from reordering two calls across an API boundary, but it cannot prevent two adjacent statements inside the same function body from being reordered by an editor who doesn't need to change any signature. This is squarely a comment-plus-test site.
- **Platform-API gaps** (OCX-03: Windows content-check absence is a design choice, not a bug a type catches; part of GRM-02: Windows reparse tags `LX_SYMLINK`/`APPEXECLINK`/`WCI` aren't all caught by `is_symlink`, a `std`/`winapi` coverage gap no wrapper type closes without a real API to call).
- **Crash/durability that needs fault injection, not a type**: OCX-14's discard-vs-propagate half is already at the type-system's own ceiling — `fsync_parent`'s `Result` is already `#[must_use]` by `std`'s own default, and the guard is precisely that an explicit `let _ =` can still defeat it; no *stronger* type closes that gap (this matches lint-owned-guards.md's own comment-only verdict for OCX-14, unchanged here). OCX-04's "why 512 KiB, not more" and OCX-05's "fail closed, don't skip" are policy calls about a compile-time assert's *value*, not something a different type shape would catch.
- **Deliberate non-optimizations** (OCX-21's `ponytail:`-marked non-memoization, OCX-24's length-only-not-digest compare): the guard is "don't add code that looks like an improvement," and no type stops someone from adding a `HashMap` cache or a stronger hash — these are the class lint-owned-guards.md already named comment-only, unchanged.
- **Business/heuristic judgment** (OCX-02's fail-open posture, OCX-08's Windows-Defender-specific errno allowlist): the "right" answer is a domain decision a type system has no opinion on; a type can encode *that a decision was made* but not *which* decision is correct.

### 6. Type-owned guards: worked sketches

Covers all five mechanism shapes the commission named (tri-state enum, resolved-path newtype, no-`Default` field, sealed trait/policy, builder that cannot skip a step), each grounded in a real fleet site with its actual breaking edit.

**Tri-state enum instead of `Option<bool>` — OCX-20** (`ocx:crates/ocx_config/src/insecure.rs:21-37`). Today: `Option<bool>`, where `None` = silence (subtracts nothing) and `Some(false)` = an explicit decision (subtracts the host). The breaking edit the harvest names is collapsing to `bool` via `unwrap_or(false)`, which conflates "never stated" with "explicitly false."

```rust
enum SystemLockDecision { ExplicitlySecure, ExplicitlyInsecure, Unstated }
// insecure_hosts() reads this instead of Option<bool>; only ExplicitlySecure
// subtracts a host — Unstated is not reachable through the same code path
// that produces ExplicitlySecure, so `unwrap_or` has nothing to collapse onto.
```

The same shape applies to OCX-16's flag-vs-env precedence algebra (model each of flag/env as `enum FlagState { On, Off, Unset }` and require an exhaustive `match (flag, env)` over all nine combinations instead of boolean algebra a "simplification" can silently miscompute) and to GRM-01's `exists()`-vs-dangling-symlink collapse (a `PathProbe::probe(path) -> {Real, DanglingSymlink, Absent}` replacing a raw `bool` from `.exists()` forces the dangling case to be handled explicitly, it cannot be collapsed back to one boolean by accident) and TS-02's `"missing"` outcome (`type StatOutcome = {kind:"present"} | {kind:"missing"} | {kind:"error", errno: string}` — a discriminated union a `switch` must exhaustively handle, using the exact `never`-fallback idiom GRD-09 already recommends for TypeScript).

**Resolved-path / validated newtype — PY-04** (`ocx-indexbot/src/ocx_indexbot/adapters/local_files.py:58-62`). Today a raw `Path` reaches `.resolve()` then `is_relative_to(root)`; the breaking edit is swapping `.resolve()` for a cheaper `os.path.normpath` that never follows symlinks.

```python
class ContainedPath:
    __slots__ = ("_path",)
    def __init__(self, root: Path, candidate: Path) -> None:
        resolved = candidate.resolve()
        if not resolved.is_relative_to(root):
            raise ValidationError(f"{candidate} escapes root")
        self._path = resolved
    @property
    def path(self) -> Path: return self._path
```

`_resolve`'s callers take `ContainedPath`, never `Path`; a rewrite that swaps in `normpath` inside `ContainedPath.__init__` is still a single, greppable choke point instead of a scattered convention, and under `mypy --strict`/pyright a function that still expects a bare `Path` where `ContainedPath` is required is a static-analysis error, not just a docstring violation. Caveat carried over honestly: Python's enforcement is static-analysis-only (no runtime type barrier stops constructing a lookalike), weaker than Rust's, but the *shape* — a private field, one validating constructor, no other path to an instance — is identical.

**TS-04** (`grimoire-vscode/src/scopes.ts:111-146`), same family, in TypeScript's structural-typing idiom (a branded type, since TS has no nominal newtypes):

```typescript
type ResolvedPathEntry = string & { readonly __resolved: unique symbol };
function resolveEntry(dir: string, name: string): ResolvedPathEntry {
  return path.resolve(dir, name) as ResolvedPathEntry;
}
```

`whichGrim`'s argv-building step takes `ResolvedPathEntry[]`, not `string[]`; a "simplification" back to template-string concatenation produces a plain `string`, which does not satisfy `ResolvedPathEntry` and fails `tsc` — the one `as` cast is the only place the invariant can be bypassed, and it is visually distinct (greppable) from ordinary string handling. PY-02 and TS-01 are the same newtype shape applied to an archive-member name and a symlinked-parent-directory re-check, respectively.

**No-`Default` required field/trait method — OCX-12** (`ocx:crates/ocx_index/src/local_index.rs:1638-1643`). The breaking edit is deleting `LocalIndex`'s override of `physical_reference` "as dead code," which falls through to the trait's own default (`Ok(None)` = "no rewrite"). Removing the *default* entirely (rather than merely not deleting the override) makes every future `impl IndexImpl` a compile error until it states an answer:

```rust
trait IndexImpl {
    fn physical_reference(&self, id: &Identifier) -> Result<Option<Location>, Error>;
    // no default body — every implementor must decide, so "delete the override,
    // the trait default already does this" is no longer a legal edit at all
}
```

The same required-field shape shows up in the 100-guard sample at `ocx:crates/ocx_package_manager/src/tasks/garbage_collection/reachability_graph.rs:147` (confirmed by reading the site directly): shims must be registered with "the PACKAGE shape — entry *and* edges" while layers/blobs use a passive, edges-less shape; today these are two separate `HashMap::insert` calls into `all_entries` and `edges` that a refactor can silently decouple. A `CasRegistration::Package { edges: Vec<BlobRef> }` vs. `CasRegistration::Passive` enum, inserted through one function that takes the enum and always populates both maps together (or neither), makes "register a shim without edges" a variant that doesn't exist rather than an insert call a future edit forgets.

**Sealed policy parameter — GRM-02** (`grimoire:src/install/path_anchor.rs:590-606`). `AnchoredPath::resolve` must reject a bare `.` (`CurDir`) component because its input is persisted, untrusted state, unlike the sibling `path_safety::contain`, which tolerates `CurDir` as an ordinary user typo. The guard is "don't unify the two nearly-identical functions" — exactly the edit an agent's duplication-reduction reflex is primed to make (the harvest's own framing). A sealed marker trait turns the tolerance difference into a compile-time parameter instead of two copy-pasted function bodies that can drift into agreement by accident:

```rust
mod sealed { pub trait Policy { fn allows_cur_dir() -> bool; } }
pub struct Strict; pub struct Lenient;
impl sealed::Policy for Strict { fn allows_cur_dir() -> bool { false } }
impl sealed::Policy for Lenient { fn allows_cur_dir() -> bool { true } }
fn resolve<P: sealed::Policy>(candidate: &Path) -> Result<PathBuf, Error> { /* one body */ }
// AnchoredPath::resolve = resolve::<Strict>; path_safety::contain = resolve::<Lenient>;
```

Unifying the two callers now means picking one `Policy` type parameter, visibly, instead of silently merging two bodies into one that has to pick a single behavior for both.

**Builder that cannot skip a step — GRM-04** (`grimoire:src/store/atomic_write.rs:30-65`). The five-step order (write, `sync_data`, persist/rename, then fsync the *parent* directory) makes the publish crash-safe; the breaking edit is dropping or reordering the trailing parent-fsync "since the rename already happened."

```rust
struct Written(NamedTempFile);
struct Synced(NamedTempFile);
struct Persisted { parent: PathBuf }
impl Written  { fn sync(self)  -> io::Result<Synced> { self.0.as_file().sync_data()?; Ok(Synced(self.0)) } }
impl Synced   { fn persist(self, dest: &Path) -> io::Result<Persisted> { /* rename */ } }
impl Persisted { fn fsync_parent(self) -> io::Result<()> { /* the durability-completing step */ } }
```

Only `Persisted::fsync_parent` exists to finish the sequence; there is no `Synced::persist_and_skip_parent_fsync`, so an edit that drops the last step either doesn't compile (the `Persisted` value is left unused, and — if the type is also `#[must_use]` — warns) or requires visibly deleting a whole state transition rather than one easy-to-miss line. GRM-07's `MAX_ATTEMPTS`-bounded ghost-inode retry vs. immediate-`Locked`-on-contention split is the same idea one level simpler: an `AcquireOutcome::{Acquired, Locked, GhostRetry(u8)}` enum keeps the two return paths structurally distinct instead of one boolean "should I retry" flag a future edit can flip for both cases at once. OCX-19's self-heal proof (a `HealedObject` value producible only by a function that re-reads and re-hashes against `claimed`, so "success" can never be represented by a bare `exists()` check) and OCX-23's `ContainedPath` correction (§[Summary](#summary)) are the same "make the successful-completion value itself carry the proof" idea applied to a single check rather than a multi-step sequence.

### 7. Type-owned guards: estimate across the 100-guard sample

`sample.md` §5 gives 100 one-line guard summaries (repo:file:line, opening clause, "edit prevented"), not full code — reading all 100 in full is out of this dive's budget, so the estimate below is graded by confidence, not a single flat number. Method: classify each summary by whether its "edit prevented" clause names a shape a type can own (tri-state collapse, ordering that crosses an API boundary, "must be reused/not-recomputed" coherence, "must go through function X first" smart-construction, "must never construct without Y" invariant) versus a shape it cannot (platform quirk, timing/SSR, crash/durability, cross-language parity, external-tool-syntax ordering, pure business judgment, unsafe-block justification), then spot-checked 9 of the least-obvious calls against the real source (`ocx:crates/ocx_package_manager/src/tasks/pull_local.rs:182`, `.../reachability_graph.rs:147`, `ocx:crates/ocx_python/src/naming.rs:54`, `ocx:crates/ocx_sign/src/verify.rs:55`, `ocx:crates/ocx_util/src/path.rs:160-183`, plus 4 more cited inline above).

Two spot-checks changed the classification from the one-liner alone:

- `pull_local.rs:182` — the one-liner reads like a nullable field being misused; the real code sets `transport_pinned: Err(NoTransport::LocalMaterialization)`, already an `enum`/`Result` sentinel, not a raw `None`. **Downgraded** from "type-ownable" to "already adequately type-shaped" — the residual risk is a caller not matching on the `Err` arm correctly, which Rust's `Result` already forces at the point of use.
- `verify.rs:55` — the one-liner reads like an ordinary "read the right clock" guard; the real code already ships a private `SigningInstant` newtype for exactly this purpose (§[Summary](#summary)). **Reclassified** from "type-ownable" to "already type-owned, uncredited" — evidence the fleet's own authors reach for this pattern unprompted when they think to, which is itself a data point for the rule (the gap is that the *pattern* isn't named or pointed to anywhere, not that nobody in the fleet knows it).

Per-repo tally (solid + borderline, out of each repo's guard count in `sample.md` §5):

| Repo | Language | Type-ownable | Rate |
|---|---|---|---|
| ocx | Rust | 27-28 / 58 | ~47% |
| grimoire | Rust | 8-9 / 16 | ~50-56% |
| ocx-sdk-python | Python | 2-3 / 9 | ~25-33% |
| ocx-catalog | TypeScript | 2 solid + 3 borderline / 12 | ~25-42% |
| grimoire-vscode | TypeScript | 4-5 / 5 | ~80-100% (n=5, low confidence) |
| **Weighted total** | | **~45 / 100** | **~45%** |

The Rust rate and the grimoire-vscode rate track closely (both languages give a compiler a real veto); the Python and ocx-catalog rates are lower not because fewer guards have the *shape* of a smart-constructor/tri-state fix, but because Python's and (untyped-config) TypeScript's enforcement of that shape is weaker or requires a static-analysis step (`mypy --strict`/pyright, or `tsc` with `strict: true`) the fleet doesn't uniformly run yet — a caveat, not a reason to discount the count.

### 8. Exhaustiveness claims as a class

lint-owned-guards.md and the guards consolidation (GRD-09) already measured this: 44 comment lines across 26 Rust files claim a match "must stay exhaustive" (ocx 20, grimoire 5, ocx-mirror 1 per the consolidation's "Applied to the fleet" table), zero carry `#[deny(clippy::wildcard_enum_match_arm)]`, and the checker — not a hand-sketched type — is the right owner (`#[deny]` scoped to the function/impl for Rust; `assert_never` for Python; the `never`-typed default arm for TypeScript). This dive's own measurement (§2) adds one number to that verdict: `clippy::wildcard_enum_match_arm` run workspace-wide today produces 232/108/41 hits in ocx/grimoire/ocx-mirror, and the read-30 sample (§3) found the overwhelming majority of *those* are test-only `_ => panic!()` unwrap arms, not the 44 exhaustiveness-claim sites — confirming GRD-09's "never workspace-wide" MUST NOT is correctly scoped, and that a workspace-wide enable would flood the fleet with test-assertion noise on top of the legitimate foreign-`#[non_exhaustive]`-enum noise GRD-09 already names.

## Normative guidance candidates

1. **Do not enable `clippy::let_underscore_untyped` or `clippy::wildcard_enum_match_arm` as a workspace-wide `warn`/`deny`.**
   Rationale: measured hit counts (232-306 wildcard-arm hits, 178-232 untyped-let hits across the three repos) with a read-30 noise rate of 70% (§3) — mostly test-fixture I/O discards and test-assertion unwrap arms — mean a blanket enable produces far more triage cost than real-guard yield.
   Verification: the exact commands in §2, run against a scratch copy with the crate's own `[lints.rust] warnings` temporarily set to `"warn"` (§1) — if re-run after this rule ships, both counts should still exceed what a one-sitting triage could clear, or the rule should be revisited.
   Severity: **MUST NOT** (workspace-wide); confirms lint-owned-guards.md's existing recommendation, adds the measured numbers it lacked.

2. **`let_underscore_drop` (GRD-10) ships unchanged, with a numbers-backed triage estimate.**
   Rationale: this dive's measurement (163/70/39 hits, §2) is the direct answer to GRD-10's own "the share the lint flags is unmeasured" line; a crate adopting GRD-10 should budget for a triage pass in this range, not assume it is a small, mechanical enable.
   Verification: same commands as item 1, filtered to `let_underscore_drop` alone.
   Severity: unchanged from GRD-10 (**SHOULD**, fleet default the adopter may override).

3. **Before crediting a guard "comment-only" or "test-only" (GRD-07), check whether a type would make the named breaking edit fail to compile.**
   Rationale: 24 of the 40 eval-sites.md mechanism sites (§5), including several the fleet currently defends with only a test (a runtime guarantee that only holds if the test suite is run and covers the exact mutation) have a concrete type/newtype/enum/builder that would make the same breaking edit a compile-time failure instead — a strictly stronger guarantee, at the cost of a larger diff than adding a comment. OCX-23 is a direct correction: lint-owned-guards.md filed it comment-only (a negative-space claim no test can prove), but a `ContainedPath`-shaped newtype (§6) makes the misreading a type error, not just an undocumented risk.
   Verification: planted-edit proof, same shape as GRD-07's own: write the sketch, apply the harvest's named breaking edit, confirm `cargo check`/`tsc --noEmit`/`mypy --strict` refuses it. §6 gives eight such sketches already checked for plausibility against the real site; none has been implemented or planted-edit-verified as an actual diff (that is deliberately out of scope — this dive proposes types, GRD-07's planted-edit-proof discipline applies once the rule accepts one for a specific site).
   Severity: **SHOULD** — a type-ownable guard is a candidate for a follow-up diff, not an immediate MUST, since the type change is itself a larger, reviewable diff the cleanup skill should not make unprompted alongside a comment edit (this is exactly the concern GRD-06/cleanup-safety already raise about non-comment edits riding along with a comment cut).

4. **Cite `ocx:crates/ocx_sign/src/verify.rs`'s `SigningInstant` and `ocx:crates/ocx_util/src/result_ext.rs`'s `ResultExt::ignore` as the rule's own worked examples of a type already replacing a comment.**
   Rationale: both are real, uncredited fleet code that already does what item 3 asks for; citing in-fleet precedent is more persuasive to a cold agent than an invented example, and confirms the pattern is idiomatic here, not foreign.
   Verification: `repo:ocx:crates/ocx_sign/src/verify.rs:52-58`; `repo:ocx:crates/ocx_util/src/result_ext.rs:4-11`.
   Severity: **CONSIDER** (documentation choice, not an enforceable rule).

## Decisions this dive proposes

- **Which lints ship as recommended config**: unchanged from GRD-09/GRD-10 — `let_underscore_drop` in `[workspace.lints.rust]` (SHOULD, after triage) and a per-match, scoped `#[deny(clippy::wildcard_enum_match_arm)]` (SHOULD, never workspace-wide). **Newly decided here**: `clippy::let_underscore_must_use` and `clippy::let_underscore_untyped` are not recommended as standing lints at all (neither GRD-09 nor GRD-10 proposed them as such; this dive closes the question lint-owned-guards.md left open by measuring the alternative and finding it not worth it) — they remain useful as a one-time, hand-triaged audit command (§2's exact invocation), not a CI gate.
- **Which guard shapes the rule should route to a type instead of a comment**: the five named in the commission, each with a fleet-grounded sketch in §6 — tri-state enum (`Option<bool>`/boolean collapse, OCX-20/OCX-16/GRM-01/TS-02), resolved-path/validated newtype (PY-04/TS-04/PY-02/TS-01/OCX-06/OCX-11/OCX-13/OCX-23), no-`Default` required field or trait method (OCX-12, `reachability_graph.rs:147`), sealed policy parameter (GRM-02), and a builder that cannot skip a step (GRM-04/GRM-07/OCX-19). Plus one this dive adds: single-computation-site bundling (stat once, thread the result — GRM-03), which doesn't fit the commission's five named shapes but recurs independently in the 100-guard sample (`insecure.rs:4`, `fingerprint.rs:168/211`, `context.rs:1085`, `bundle.rs:294` — all "the same answer must not be computed twice, separately, and risk disagreeing").
- **Phrasing of the routing row**: *"Before shortening a guard past its floor (GRD-01), or before filing it comment-only under GRD-07, ask whether a type — not a lint, not a test — could make the named breaking edit fail to compile. When one exists, the comment shrinks to one line naming the type (GRD-08's shape); the type change itself is a separate, reviewable diff, never bundled into a comment-shortening cleanup pass."* This slots in beside GRD-07 (decide the owner per breaking edit) as an additional owner class alongside lint/compiler/test, not a replacement for any of them.
- **Toolchain note for future dives in this program**: rustc/clippy 1.95.0 is what all three measured repos actually build with; do not reach for `-A warnings` to work around a crate's own `[lints] warnings = "deny"` when measuring an unrelated lint's blast radius — it silently suppresses the target lint too, in either flag order (§1). Patch the scratch copy's `Cargo.toml` line instead.

## Sources

1. `repo:ocx:crates/ocx_util/src/fs/locked_file.rs:29-32` — `LockedFile`, no `#[must_use]`, re-confirmed 2026-09-27.
2. `repo:grimoire:src/tui/update_check.rs:371` — `InFlightGuard`, no `#[must_use]`, re-confirmed 2026-09-27.
3. `repo:ocx:crates/ocx_package_manager/src/tasks/render_toolchain.rs:892` and `repo:grimoire:src/tui/update_check.rs:328` — the two planted-rename sites, re-verified against real fleet source (§4).
4. `repo:ocx:Cargo.toml:373`, `repo:ocx-mirror:Cargo.toml:191` — `[workspace.lints.rust] warnings = "deny"`, the source of the `-A warnings` gotcha (§1).
5. `repo:ocx:crates/ocx_sign/src/verify.rs:52-58` — the uncredited `SigningInstant` fleet precedent.
6. `repo:ocx:crates/ocx_util/src/result_ext.rs:4-11` — `ResultExt::ignore`, a discard already made explicit/type-owned at call sites.
7. `repo:ocx:crates/ocx_package_manager/src/tasks/garbage_collection/reachability_graph.rs:135-152` — read directly to confirm the "package shape vs. passive shape" guard is two separate map inserts, §6's `CasRegistration` sketch.
8. `repo:ocx:crates/ocx_package_manager/src/tasks/pull_local.rs:170-195` — read directly; corrected an initial misclassification (§7).
9. `repo:ocx:crates/ocx_python/src/naming.rs:40-60` — `WheelReference`'s "assumes a URL" comment, read directly.
10. `repo:ocx:crates/ocx_util/src/path.rs:155-185` — `remove_segment`'s full negative-space contract, read directly (OCX-23 sketch basis).
11. `.agents/research/code-docs-audit/eval-sites.md` §3 (this program's own harvest) — all 40 mechanism sites' Ground truth/Breaking edit/Consequence columns, the basis for §5-6.
12. `.agents/research/code-docs-audit/sample.md` §5 — the 100 guard-block one-liners, the basis for §7.
13. `.agents/research/code-docs-guards.md` (the guards consolidation) — GRD-01..GRD-11, the "Applied to the fleet" table, and the "Deserves another research round" open questions this dive answers.
14. `.agents/research/code-docs-guards/lint-owned-guards.md` — the prior dive's own classification and sources, re-verified rather than re-derived in §4 and §8.
15. https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/let_underscore.rs — cited by the prior dive, re-confirmed against this dive's own live `cargo clippy` diagnostic text (identical lint names, messages and default levels).
16. https://rust-lang.github.io/rust-clippy/master/index.html — clippy's own lint-index page; fetched 2026-09-27, confirms the lint groups (Correctness/Suspicious/Restriction/Pedantic/...) and default-level scheme this dive's tables rely on. The page is a client-rendered SPA that does not resolve a `#anchor` fragment through a plain fetch; the per-lint default level and message text used in this dive's own tables come instead from `cargo clippy`'s own diagnostic output today (§2-4), which names the identical `rust-lang.github.io/rust-clippy/rust-1.95.0/index.html#<lint>` URL as its "further information" link.
17. https://docs.python.org/3/library/typing.html#typing.assert_never — fetched 2026-09-27; the fetched-page summary incorrectly reported a `TypeError`, corrected against the primary source (next entry).
18. CPython 3.14.5, `inspect.getsource(typing.assert_never)` (installed on this machine, read directly 2026-09-27) — authoritative: `assert_never` raises `AssertionError`, confirming lint-owned-guards.md's citation and correcting item 17's fetched summary.
19. https://doc.rust-lang.org/rustc/lints/listing/allowed-by-default.html#let-underscore-drop — cited by the prior dive; `let_underscore_drop`'s scope and default level, unchanged and re-confirmed by this dive's own planted-rename runs.
20. https://typescript-eslint.io/rules/switch-exhaustiveness-check/ — cited by the prior dive for TS-02/TS-04's exhaustiveness idiom; not re-fetched here, cited for continuity with §6's TS-02 sketch.
21. rustc 1.95.0 / clippy 0.1.95 (`59807616e1`, 2026-04-14) — `rustup run 1.95.0 cargo clippy --version`, this session, matching all three repos' `rust-toolchain.toml`.
22. `.agents/research/code-docs-audit/eval-sites.md` §4 (Tiers A/B/C) — cross-referenced to confirm which of the 24 type-ownable sites are currently test-owned (a compile-time upgrade) versus already comment-only (OCX-23's correction).
