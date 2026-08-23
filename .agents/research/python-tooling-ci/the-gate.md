---
title: "The gate: getting the fleet from configured to enforced, and keeping it there"
topic: python-tooling-ci
agent: ground-tooling
model: claude-sonnet-5
date_researched: 2026-08-23
sources_count: 14
scope: >
  Operational: how each Python subject in this fleet moves from its current
  state to CI-enforced lint/type/test/coverage without ever landing red, what
  stops it sliding back once green (specifically under AI-agent-primary
  authorship with no human on most diffs), contributor/CI parity, the
  uncalled `.claude/tests` suite (run, verdict), a fleet-wide `zizmor` pass,
  measured gate wall-clock, and a generalized "is the gate real" check.
  Builds directly on `python-audit/lint-yield.md`, `python-audit/pyright-triage.md`,
  and `python-topic-map/codified-reconciled.md` (proven ruff configs, ruff/pyright
  violation counts) and `python-audit/tooling-posture.md` (the 60%-ungated
  figure) — those numbers are cited, not re-run, except where a fresh
  measurement was needed to answer a question those files didn't ask.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The baseline-file question, answered against this fleet's own numbers](#1-the-baseline-file-question-answered-against-this-fleets-own-numbers)
   2. [The ratchet, under an unattended agent author](#2-the-ratchet-under-an-unattended-agent-author)
   3. [Contributor/CI parity](#3-contributorci-parity)
   4. [The uncalled suite](#4-the-uncalled-suite)
   5. [zizmor across the fleet](#5-zizmor-across-the-fleet)
   6. [What the gate costs](#6-what-the-gate-costs)
   7. [The meta-gate: does the gate exist at all](#7-the-meta-gate-does-the-gate-exist-at-all)
3. [The adoption sequence](#the-adoption-sequence)
4. [Normative guidance candidates](#normative-guidance-candidates)
5. [Applied to the fleet](#applied-to-the-fleet)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- 60% of the fleet's Python by line count is gated by nothing but "pytest passed" ([tooling-posture.md][tooling-posture]) — this file is about the sequence that fixes that without ever landing red, not a restatement of the problem.
- Every shape has a proven, run-not-guessed config already ([codified-reconciled.md][codified]): shape1 (`ocx/test`) 15,143→1,051→805 after safe autofix; shape2 (`ocx-sdk-python`) 336→155; shape3 (`index/bot`) 45→37; shape2 and shape3 are landable as a blocking gate *today*, shape1 is not — 805 remaining violations is a cleanup project, not a day-one gate.
- A generated ruff baseline file is the wrong instrument for shape1's 805 remainder — its own well-known failure mode (never shrinks) is avoidable here because the remainder decomposes into ~5 *named, bounded* buckets (§ Findings 1), each independently landable; a baseline would hide that structure instead of exposing it.
- Under an AI agent as primary author with no human on most diffs, only one enforcement mechanism actually binds: a **blocking CI status check on the merge path**. A pre-commit hook requires local installation and is bypassed by `git commit --no-verify` or the `SKIP` env var ([pre-commit.com][pre-commit]) — an agent that doesn't know the hook exists never runs it, and one that does can skip it exactly as easily as complying. A periodically-reviewed count needs an attentive human, which is the thing this fleet has removed from the loop. Required status checks cannot be bypassed by a normal contributor, only by an explicit bypass grant ([docs.github.com][gh-rulesets]) — that is the one mechanism whose bypass is a deliberate, visible, logged human act rather than a keystroke the author controls.
- Contributor/CI parity already breaks in this exact environment, measured directly: `which ruff` resolves to **0.16.1** (an `ocx`-toolchain install on `PATH`); the project-pinned version via `uv run --extra dev ruff --version` is **0.16.3**. Two different linters, same machine, same moment.
- Ruff's own cache is not a parity risk — verified empirically, not assumed: `.ruff_cache/<version>/<hash>` nests the cache **by ruff version at the directory level**, so a version bump cannot silently reuse a stale-version cache entry (`.ruff_cache/0.16.3/...` populated by running `ruff@0.16.3`, confirmed via `find`).
- The single contributor/CI command already exists for 4 of 7 subjects (`task verify`/`task ci`/`task bot:lint`+`task bot:test`) — it does not exist for `ocx/test`, `grimoire/test`, `ocx-save/test` at all, because there is nothing to run yet (no lint/type task configured). Adding that task is itself the first landable step, before any rule selection.
- `.claude/tests` (both `ocx` and `grimoire`) is not rotten — it's fast and green: `165 passed, 3 skipped in 1.21s` (ocx), `153 passed in 0.50s` (grimoire), run directly, today. Verdict: **wire it in**, not delete it — deleting a passing, cheap, real suite because nobody remembered to call it would be throwing away the one part of this problem that's already solved.
- `zizmor` (1.29.0) found real, fixable findings, not noise: `ocx-save/release.yml` and `test-install-scripts.yml` interpolate `${{ inputs.release_tag }}`/`${{ github.ref_name }}` directly into `run:` shell blocks — the exact script-injection shape GitHub's own hardening guide names and auto-fixes by routing through `env:` ([docs.github.com][gh-hardening]) — while `ocx`'s and `ocx-save`'s own `.github/workflows/dco`-adjacent workflows already document the opposite rule ("SHAs via env, not inline interpolation") elsewhere in the same repos.
- `ocx`/`grimoire`/`ocx-save`'s `release.yml` uses floating `actions/checkout@v6`/`@v7` tags while their own `verify-basic.yml`/`verify-deep.yml` correctly pin the same actions by commit SHA — an inconsistency *within* each repo, not a fleet-wide gap; `index/bot` has **zero** zizmor findings, `ocx-sdk-python`/`ocx-mirror-sdk` near-zero.
- `grimoire-lore/validate.yml`'s `pull_request_target` trigger is flagged by zizmor at medium confidence (a structurally-risky trigger class) — verified by reading the actual job: PR head is checked out as data-only into a separate `pr-tree/` path with `persist-credentials: false`, nothing in it is executed/imported, changed-file paths flow through a file (not argv, closing an argument-injection path the file's own comments name explicitly), `permissions: {}` at the top. **The flag is correct to raise; the implementation is correct to survive it.**
- Wall-clock, measured: `ruff check` ≈0.06-0.16s, `pyright` ≈1.3-2.7s, per subject — both effectively free next to anything else in CI. Full pytest: `ocx-sdk-python` cheap unit tier ≈1-2s; `.claude/tests` ≈0.5-1.2s; `index/bot` full suite with 100% coverage gate 13.13s; `grimoire/test`'s full parallel acceptance suite (prebuilt `grim` binary, `-n auto`) 47.92s; `ocx/test`'s full parallel acceptance suite (prebuilt `ocx` binary) 171.72s (2:53 wall). The new gates (lint+type) add single-digit seconds on top of suites that already take 1-3 minutes — there is no timing argument against adding them on every push.
- The meta-gate check (§ Findings 7) took three real bug-fixes to get right — a `set -e`/`pipefail` interaction that silently turned a real match into a false negative, and two rounds of a token-matching heuristic colliding with unrelated content (a bot-integration workflow's own `claude:` job key, then a doc comment mentioning a different `.claude/` path) — documented in full because it is the same defect class this entire program hunts, caught this time by watching the check against a known-good subject before trusting a known-guilty result.

## Findings

### 1. The baseline-file question, answered against this fleet's own numbers

A generated baseline (`ruff check --add-noqa` or a captured `--output-format=json` snapshot fed back as `per-file-ignores`) is how large codebases commonly adopt a linter without a stop-the-world cleanup — and it has a well-documented failure mode: once a baseline exists, nothing forces it to shrink, because every violation inside it is silently exempt forever, and "clean up the baseline" competes with every other backlog item for someone's attention indefinitely.

Whether that trade is worth it here is a per-subject question, not a blanket one:

- **Shape 2 (`ocx-sdk-python`) and shape 3 (`index/bot`)**: no baseline needed. 155 and 37 remaining violations respectively are small enough to fix by hand in the same PR that turns the gate on ([codified-reconciled.md §2][codified]).
- **Shape 1 (`ocx/test`, `grimoire/test`)**: 805 remaining after safe autofix is too many to fix inline, but the lint-yield audit already decomposed it into named, bounded buckets, not an undifferentiated pile: `PLW1510` 262 (half real, half a documented ruff blind spot against `runner.py`'s manual check — needs targeted `noqa` at specific call sites, not a blanket ignore, because a blanket ignore would also hide the one genuinely bare `subprocess.run` in `sigstore/generate-trusted-root.py:38`), `PT018` 72 (real — composite asserts hiding which half failed), `RUF002/003/001` 114 (mostly em-dash/`×` in docstrings — cosmetic), `PLR0913/0917` 69 (real complexity), `S310/S607` 50 (real, worth a security look), `S101` outside `tests/**`/`conftest.py` 15 (real — `-O` strips these) ([codified-reconciled.md, Shape 1 run][codified]). **A baseline file would flatten this structure into one exemption list and remove the only thing that makes it tractable** — the honest adoption path is landing the fix in these named slices, not suppressing all 805 at once and hoping someone returns to it. See the exact sequence in [§ The adoption sequence](#the-adoption-sequence).
- **A non-blocking ratchet as an intermediate step** (`ruff check --statistics` in CI, exit-0 always, human-reviewed trend) is worth exactly one thing here: making the 805→0 trend visible while the named-bucket PRs land, *if* landing all buckets will take more than one or two PRs. Given the buckets are already enumerated and small (largest is 262, decomposable further into "2 targeted noqas" + "the rest triaged"), this fleet doesn't need the ratchet-as-a-stage — it needs the sequence in §3 below, done in order, each step already green.

### 2. The ratchet, under an unattended agent author

Four candidate ratchets, evaluated against the actual constraint this fleet has: an AI agent is the primary author on most diffs, with no human reviewing most of them.

| Mechanism | Binds on a human contributor | Binds on an unattended agent | Why |
|---|---|---|---|
| Blocking CI status check | Yes | **Yes** | Required status checks cannot be bypassed by a normal contributor — only by an account with an explicit bypass grant, itself a logged, deliberate act, not a flag an author adds to their own command ([docs.github.com/rulesets][gh-rulesets]). An agent that produces a red PR simply cannot merge it; there is no local step to skip. |
| Pre-commit hook | Weakly (habit, peer pressure) | **No** | Requires `pre-commit install` to have been run in that specific clone first — "every time you clone a project... running `pre-commit install` should always be the first thing you do" is a *documented manual step*, not automatic ([pre-commit.com][pre-commit]). `git commit --no-verify` or `SKIP=<hook-id> git commit` bypasses it with zero friction. An agent generating commits in a fresh worktree has no reason to know the hook exists, let alone install it, unless something else (a CI check) forces the question. |
| "No new violations" diff-scoped check | Only if it's *also* a blocking CI check | Same as blocking CI check, if implemented as one | This is not a fourth mechanism — it's the blocking-CI-check mechanism with a different comparison baseline (diff against `main` instead of zero). Binds exactly as hard as "blocking CI check" does; doesn't bind at all if implemented as a local pre-commit hook or an advisory PR comment. |
| Periodically-reviewed count | No | **No** | Requires an attentive human to notice the count moved, on a cadence, and act — which is precisely the resource this fleet's shape (agent-authored, low human-review) has removed from the loop. A count nobody looks at is a number, not a gate. |

**The constraint changes the answer from the general-audience one.** For a human-reviewed codebase, a pre-commit hook plus a lighter CI check is a reasonable combination (the hook catches most things before push, CI is the backstop). For this fleet, the pre-commit hook contributes approximately nothing — it is an opt-in step in a workflow where the primary author has no standing habit of opting in, and no reviewer downstream to notice it was skipped. **The only mechanism worth building here is the blocking CI check.** This is not a new pattern for this fleet — `verify-basic.yml`'s existing jobs already work this way (a failing job blocks merge via required-status-check branch protection); the new lint/type gates being proposed should be added as additional required jobs in the same workflows, not as a parallel pre-commit-based system nobody would use as the primary line of defense.

### 3. Contributor/CI parity

**The single command, per subject** — already exists for four, doesn't exist for three:

| Subject | Contributor/CI command | Exists today? |
|---|---|---|
| `ocx-sdk-python`, `ocx-mirror-sdk` | `task verify` (format:check → lint → types → test → cov:report) | Yes |
| `index/bot` | `task bot:lint` + `task bot:test` + `task bot:audit` | Yes |
| `grimoire-lore` | `task ci` (lint → format:check → test → selftest → artifacts) | Yes |
| `ocx/test`, `grimoire/test`, `ocx-save/test` | — | **No** — `task test` runs pytest only; there is no `task lint`/`task types` because nothing is configured yet |

Where it doesn't exist, it should be exactly the shape the other four already use — a `task lint` / `task types` / `task verify` triple added to each `test/taskfile.yml`, matching `ocx-sdk-python/taskfile.yml`'s own structure (already the fleet's convention, not a new one). This is itself the *first* landable step in the adoption sequence (§3), before any rule is turned on, so that the command a contributor runs and the command CI runs are identical from day one — never diverging even during rollout.

**What breaks parity in practice, checked directly rather than assumed:**

- **A globally-installed tool shadowing the pinned one.** Measured on this exact machine, this exact moment:
  ```
  $ which ruff && ruff --version
  /home/mherwig/.ocx/packages/ocx.sh/sha256/6a/.../content/ruff
  ruff 0.16.1
  $ cd ocx-sdk-python && uv run --extra dev ruff --version
  ruff 0.16.3
  ```
  A contributor who types `ruff check .` instead of `task lint` / `uv run ruff check .` gets a silently different linter than CI runs — different version, potentially different rule defaults, different bug fixes. This is not hypothetical; it is the actual state of `$PATH` on this development machine right now.
- **An editor extension bundling its own ruff/pyright.** Not directly measured here (no editor session to inspect), but the mechanism is the same class as the `$PATH` shadow above — a language-server extension frequently ships or auto-updates its own binary, independent of the project's `uv.lock`. The mitigation is the same either way: the *task* command, not the bare tool name, is what's documented as "the" command to run, and CI runs nothing else.
- **A cross-version `.ruff_cache`.** Checked, not assumed real: ruff nests its cache directory by version —
  ```
  $ find .ruff_cache -maxdepth 2
  .ruff_cache/CACHEDIR.TAG
  .ruff_cache/0.16.3/5848310071111828718
  ```
  A version bump writes to (and reads from) a *different* subdirectory; there is no code path where `ruff@0.16.1`'s cached result could be served to `ruff@0.16.3`. **Not a real parity risk** — worth stating explicitly since it's the kind of thing that sounds plausible and isn't.

### 4. The uncalled suite

`ocx/.claude/tests/` (`test_ai_config.py`, `test_hooks.py`) and its `grimoire/.claude/tests/` twin validate the AI-config structural contract — the hooks and skills this repo ships. `task claude:tests` (wired into the root taskfile at `ocx/taskfile.yml:18-19`/`grimoire/taskfile.yml:17-18`) runs them; grepping every workflow in `ocx/.github`, `grimoire/.github`, `ocx-save/.github` for `claude:tests`, `claude:check`, `test_ai_config`, `test_hooks` returns zero hits ([tooling-posture.md][tooling-posture]).

**Run today, not assumed:**
```
$ cd ocx/.claude/tests && uv run --python 3.12 -m pytest -q
165 passed, 3 skipped in 1.21s

$ cd grimoire/.claude/tests && uv run --python 3.12 -m pytest -q
153 passed in 0.50s
```
Both green, both fast, both current. **Verdict: wire it in.** The premise in the commission — "a test suite nobody runs is worse than no suite, it accumulates rot and provides false assurance" — is the right worry in general, but the evidence here doesn't support "this one has rotted": it passes cleanly today, meaning either it's been kept current by habit despite not being enforced, or the hooks it tests simply haven't drifted yet. Either way, deleting a suite that is *currently* fast, real, and green because nobody remembered to wire it in would be strictly worse than the fix, which is one line in `verify-basic.yml`'s existing acceptance-tests job:
```yaml
- name: Validate AI config
  run: task claude:tests
```
`ocx-save/.claude/hooks/` ships the same class of hook scripts with **no test suite at all** — not "unwired," genuinely absent. That's a distinct, separate finding: not "wire in an uncalled suite" but "there is no suite to wire in yet."

### 5. zizmor across the fleet

`zizmor` 1.29.0 (`uvx zizmor --version`), run against every `.github/workflows/` directory in scope:

```
$ uvx zizmor --format plain <repo>/.github/workflows
```

| Repo | Findings (error/warning/help, by rule) |
|---|---|
| `ocx` | 20 help[artipacked], 16 error[unpinned-uses], 5 warning[secrets-inherit], 4 warning[template-injection]+1 error, 4 error[excessive-permissions]+3 warning, 2 warning[ref-version-mismatch], 2 error[unpinned-images], 1 error[dangerous-triggers] |
| `grimoire` | 16 error[unpinned-uses], 10 help[artipacked], 5 error[excessive-permissions]+2 warning, 4 warning[template-injection]+1 error, 2 warning[secrets-inherit], 2 error[unpinned-images], 1 error[github-app] |
| `ocx-save` | 16 error[unpinned-uses], 15 help[artipacked], 9 error[template-injection]+4 warning, 3 warning[secrets-inherit], 3 error[excessive-permissions]+2 warning, 1 warning[ref-version-mismatch], 1 warning[known-vulnerable-actions], 1 error[unpinned-images], 1 error[dangerous-triggers] |
| `ocx-sdk-python` | 8 help[artipacked] |
| `ocx-mirror-sdk` | 3 help[artipacked], 3 error[unpinned-uses] |
| `index/bot` | **0 findings** |
| `grimoire-lore` | 1 warning[ref-version-mismatch], 1 help[artipacked], 1 error[dangerous-triggers] |

**Real findings, verified by reading the flagged file, not just the tool's summary:**

1. **Script injection via direct `${{ }}` interpolation into `run:` blocks** — the highest-value class of finding here. `ocx-save/.github/workflows/test-install-scripts.yml:23-24,42-43,65-66,85` interpolates `${{ inputs.release_tag }}` directly into a bash `if [ -n "..." ]` test and a `$(echo '...' | sed ...)` substitution; `ocx-save/.github/workflows/release.yml:79`, and the identical line in `ocx`'s and `grimoire`'s own `release.yml:79`, interpolate `${{ ... github.ref_name }}` directly into a `run:` block. GitHub's own hardening guide names this exact shape and its exact fix: *"the preferred approach to handling untrusted input is to set the value of the expression to an intermediate environment variable"* ([docs.github.com][gh-hardening]), which is also what zizmor's auto-fix (`= note: this finding has an auto-fix`) does automatically for the `test-install-scripts.yml` hits. `test-install-scripts.yml` only triggers via `workflow_dispatch` (maintainer-only, not attacker-reachable by an arbitrary PR), which lowers urgency but doesn't remove the point — the fleet's own `grimoire`/`ocx-save` `.github/workflows/*.yml` DCO-check step already states the rule these two files violate ("SHAs via env, not inline interpolation — the repo-wide rule against expanding `${{ }}` straight into a shell command," per `tooling-posture.md`'s earlier reading of the `dco` job).
2. **`release.yml` uses floating tags where the same repo's other workflows pin by SHA.** `ocx/.github/workflows/release.yml:58,123,184,253,318` uses `actions/checkout@v6`, `actions/download-artifact@v7`, `actions/upload-artifact@v6` — floating major-version tags — while `verify-basic.yml`/`verify-deep.yml` in the *same repository* correctly pin the identical actions by commit SHA with a `# vX.Y.Z` comment. Same shape in `grimoire` and `ocx-save`. **This is an inconsistency within each repo, not a fleet-wide gap** — the SHA-pinning convention exists and is followed everywhere except the one workflow that ships the actual release artifact, which is the highest-stakes place for it to lapse.
3. **`pull_request_target` in `grimoire-lore/.github/workflows/validate.yml:59`** — zizmor flags this at medium confidence as a structurally risky trigger. Read in full: the workflow checks out the trusted base branch normally, checks out the untrusted PR head into a *separate* `pr-tree/` directory with `persist-credentials: false`, never executes/imports/installs anything from it, derives changed-file paths from the GitHub API (not by diffing the untrusted tree), passes them through a file rather than argv (the file's own comment explains why: a file literally named `-h` in a malicious PR would otherwise short-circuit an argv-based parser), and runs at `permissions: {}` with only `contents: read`/`pull-requests: read` granted at the job level. **Zizmor is right to flag the trigger class; the specific implementation survives the flag** — this is the fleet's own prior-documented, reasoned exception, not an oversight.
4. **`unpinned-images`**: `messense/cargo-xwin` (Docker Hub, no digest) in `ocx`'s and `grimoire`'s `verify-deep.yml` cross-compile job — a real supply-chain gap (Rust cross-compile tooling, not Python-relevant, noted for completeness per "every workflow in the fleet").
5. **`artipacked`** (missing `persist-credentials: false`) is the single highest-volume finding (45 combined across `ocx`/`grimoire`/`ocx-save`) but lowest severity — `help`, not `error`, auto-fixable, and it's the one thing `grimoire-lore`'s own workflows (`publish.yml`, `validate.yml`) already get right everywhere. Worth a bulk auto-fix pass, not urgent triage.

`ocx-sdk-python`/`ocx-mirror-sdk` (near-zero) and `index/bot` (zero) are the cleanest — consistent with the packaging audit's finding that these three already follow GitHub's own recommended patterns (Trusted Publishing, least-privilege permissions) more consistently than the Rust-primary repos' auxiliary workflows do.

### 6. What the gate costs

Measured, not estimated, wherever a run was possible without needing network/Docker infrastructure this sandbox doesn't have:

| Subject | Step | Command | Wall clock |
|---|---|---|---|
| `ocx-sdk-python` | lint | `uv run --extra dev ruff check src tests` | 0.06s |
| `ocx-sdk-python` | type-check | `uv run --extra dev pyright` | 2.38s |
| `ocx-sdk-python` | test (cheap tier) | `uv run --extra dev pytest tests/unit tests/test_version.py` | ~1.2s (954 tests, from the version-floor audit) |
| `index/bot` | lint | `uv run ruff check .` | 0.06s |
| `index/bot` | type-check | `uv run pyright` | 2.69s |
| `index/bot` | test (full, 100% coverage gate) | `uv run pytest -q` | 13.13s (849 passed) |
| `ocx/test` | lint (proven shape1 config) | `ruff check --config shape1-harness.toml .` | 0.16s |
| `ocx/test` | type-check (recommended scope, `src/` only) | `uvx pyright --pythonpath .venv/bin/python src` | 1.33s (8 errors — see [pyright-triage.md][pyright]) |
| `ocx/test` | test (full acceptance suite, prebuilt binary, `-n auto`) | `SKIP_BUILD=true uv run pytest -n auto --dist loadgroup -q` | **171.72s (2:53 wall)** — 2174 passed, 5 pre-existing failures unrelated to this audit (sigstore trust-chain tests needing infrastructure this sandbox lacks), 4 errors matching the already-reported 3.10-floor issue |
| `grimoire/test` | test (full acceptance suite, prebuilt binary, `-n auto`) | same | **47.92s** — 1060 passed, 0 failures |
| `ocx/.claude/tests`, `grimoire/.claude/tests` | test | `uv run pytest -q` | 1.21s / 0.50s |

**Lint and type-check are, without qualification, free** — under 3 seconds each, against pytest suites that already take 13 seconds to nearly 3 minutes. There is no timing argument for deferring them to a merge queue or nightly run; they belong on every push, in the same job that already runs the tests, because they cost less than the margin of variance in the test run itself. The acceptance suites (`ocx/test` 2:53, `grimoire/test` 48s) already run on every push today (`verify-basic.yml`'s `acceptance-tests` job) — nothing here changes that tier; the new lint/type steps ride along in the same job the Rust build already dominates. Nothing measured here needs to move to nightly; the fleet's existing nightly/on-demand tier (`verify-deep.yml`, `mutmut.yml`) is already reserved for genuinely expensive things (cross-platform matrices, mutation testing) this audit didn't touch.

### 7. The meta-gate: does the gate exist at all

Generalizing the floor-check pattern from the prior audit: a command that, pointed at a project directory and its repo root, reports which of {lint, type-check, test, coverage} are **configured** (a marker exists in `pyproject.toml` or a sibling config file) but **not enforced** (no workflow under `.github/workflows` even mentions that project next to a gate-shaped command).

```bash
#!/usr/bin/env bash
# gate-exists.sh <project-dir> <repo-root>
# Polarity: prints one VIOLATION per configured-but-unenforced dimension.
# Empty output = pass. "Never configured" is not reported — a different
# finding from "configured, silently unguarded".
set -euo pipefail
proj="$1" root="$2"
py="$proj/pyproject.toml"

configured() { [ -f "$py" ] && grep -qE "$1" "$py" 2>/dev/null; }
have_file() { local f; for f in "$@"; do [ -f "$proj/$f" ] && return 0; done; return 1; }

# claude.yml excluded: fleet-wide convention for the Claude-Code bot-mention
# integration, whose job key is itself literally named `claude:` in YAML —
# a guaranteed collision against a token search for ".claude", which this
# fleet's AI-config subsystem happens to be named.
ci_text=$(find "$root/.github/workflows" \( -name '*.yml' -o -name '*.yaml' \) -not -name 'claude.yml' 2>/dev/null | xargs cat 2>/dev/null)

if [ "$proj" = "$root" ]; then
  mentioned=1
else
  parent_base=$(basename "$(dirname "$proj")")
  mentioned=0
  if [ "$parent_base" = "$(basename "$root")" ]; then
    grep -qiE "$(basename "$proj")" <<< "$ci_text" && mentioned=1
  else
    parent_token="${parent_base#.}"
    grep -qE "${parent_token}:|\.?${parent_token}/$(basename "$proj")" <<< "$ci_text" && mentioned=1
  fi
fi

covered=0
if [ "$mentioned" -eq 1 ] && grep -qE 'ruff (check|format)|pyright|mypy|pytest|coverage (run|report)|--cov|task [a-z:]+' <<< "$ci_text"; then
  covered=1
fi

report() { echo "VIOLATION: $proj: $1 is configured but no workflow under $root/.github/workflows mentions this project next to a lint/type/test/coverage command"; }

if configured '\[tool\.ruff\]' || have_file ruff.toml .ruff.toml; then [ "$covered" -eq 1 ] || report "lint/format (ruff)"; fi
if configured '\[tool\.pyright\]' || have_file pyrightconfig.json mypy.ini || configured '\[tool\.mypy\]'; then [ "$covered" -eq 1 ] || report "type-check (pyright/mypy)"; fi
if configured '\[tool\.pytest\.ini_options\]' || have_file pytest.ini tox.ini; then [ "$covered" -eq 1 ] || report "tests (pytest)"; fi
if configured 'fail_under'; then [ "$covered" -eq 1 ] || report "coverage gate"; fi
```

**Watched red, on the exact known-guilty subject:**
```
$ ./gate-exists.sh ocx/.claude/tests ocx
VIOLATION: ocx/.claude/tests: tests (pytest) is configured but no workflow under ocx/.github/workflows mentions this project next to a lint/type/test/coverage command
$ ./gate-exists.sh grimoire/.claude/tests grimoire
VIOLATION: grimoire/.claude/tests: tests (pytest) is configured but no workflow under grimoire/.github/workflows mentions this project next to a lint/type/test/coverage command
```
Silent (pass) on every subject already known enforced: `ocx/test`, `grimoire/test`, `ocx-save/test`, `index/bot`, `ocx-sdk-python`, `ocx-mirror-sdk`.

**Three real bugs, fixed in order, worth documenting because each is the exact defect class this whole program hunts:**

1. `echo "$ci_text" | grep -qiE "$token"` under `set -o pipefail`: `grep -q` closes its input early on the first match, the upstream `echo` receives `SIGPIPE` and exits 141, and `pipefail` reports the *pipeline* as failed even though `grep` matched — a real violation was silently swallowed into "no match." Fixed by switching to a here-string (`grep -qiE "$token" <<< "$ci_text"`), which has no live pipe to receive a signal.
2. First token design used the bare parent-directory name (`claude`) for the nested case. That matched — but for the wrong reason: `ocx/.github/workflows/claude.yml` (the unrelated Claude-Code bot-mention integration, present in `ocx`/`grimoire`/`ocx-save`) has a job literally named `claude:` in its own YAML, so the token matched the wrong file. Excluded `claude.yml` from the scanned corpus.
3. Even after that exclusion, `ocx/.github/workflows/verify-release-ci.yml:6` carries a doc comment — `# .claude/rules/workflow-release.md "Generated Workflows: ..."` — that also contains the bare word `claude`, again for an unrelated reason (a different subdirectory, `.claude/rules/`, not `.claude/tests/`). Fixed by requiring the *compound* form a real task invocation would use (`claude:` — Task's namespace separator — or the literal nested path `claude/tests`), which neither collision contains.

Each fix was verified against **both** a known-guilty and a known-clean subject before being trusted — the second bug's fix (excluding `claude.yml`) initially looked like a full fix because it made `grimoire/.claude/tests` go red correctly, but `ocx/.claude/tests` still silently passed for the third, different reason above. A check that passes its first red test is not proven; it's proven once it's also been checked against everything it's supposed to leave green.

## The adoption sequence

Every step below leaves the repo green — nothing in this sequence lands red, and each step is a PR someone (or an agent) could merge on its own.

### `ocx/test` (shape 1)

1. **Add the task, run nothing yet.** `task lint`/`task types`/`task verify` added to `test/taskfile.yml`, wired to `ruff check`/`pyright` but not yet called from any workflow. Zero violations possible — nothing runs. Establishes the single contributor/CI command (§ Findings 3) before any rule fires.
2. **Land the shape1 config, safe-fix only.** `[tool.ruff]` (per the packaging decision — this repo already has a `pyproject.toml`) with the proven `select`/`ignore`/`per-file-ignores` from [codified-reconciled.md §2][codified], then `ruff check --config ... --fix` (never `--unsafe-fixes` — see [AI-agent angle](#ai-agent-angle)). **1,051 → 805** violations. Still not wired into CI as blocking.
3. **`noqa` the runner.py `PLW1510` call sites** (2 targeted comments, not a config ignore — a blanket ignore would also hide the genuinely bare `subprocess.run` in `sigstore/generate-trusted-root.py:38`). Largest single remaining bucket addressed at its root, per [lint-yield.md #9][lintyield].
4. **Triage the named remainder in any order, each its own PR**: `PT018`=72 (real — fix the composite asserts), `RUF002/003/001`=114 (cosmetic — mostly safe to fix or `noqa` in bulk), `PLR0913/0917`=69 (real complexity — refactor or accept with a reason), `S310/S607`=50 (real — worth a security read before fixing), `S101` outside `tests/**`/`conftest.py`=15 (real — these survive `-O` stripping, worth confirming each is intentional).
5. **Turn `task lint`/`task types` blocking in `verify-basic.yml`'s acceptance-tests job**, once step 4's buckets are cleared. This is the step that actually gates — everything before it is preparation that never risked a red CI run.
6. **Add `pyright --pythonpath .venv/bin/python src`** (the `src/`-only scope [pyright-triage.md][pyright] proved adoptable day-one — 8 errors, not 186) as a second blocking check; expanding to `tests/` is the pyright audit's own follow-up (76 fixes across ~12 root causes), not part of this sequence.

### `grimoire/test` (shape 1, same shape, smaller remainder)

Same six steps; the yield numbers differ (8,101→ proportionally fewer after fix, per [lint-yield.md][lintyield]'s per-subject table) and pyright is already clean on `src/` (0 errors, [pyright-triage.md][pyright]) — so step 6 there is "add the check," not "add the check, then fix one bug first."

### `ocx-sdk-python` (shape 2)

1. **Land the shape2 config directly** — 336→155 after safe fix, no code-level blocker found ([codified-reconciled.md][codified]). No staging needed; this is small enough to fix in the PR that turns the gate on.
2. **Turn it blocking in `ci.yml`'s `verify` job** in the same PR. This repo already has the single command (`task lint`/`task types`) — the config is the only missing piece.

### `index/bot` (shape 3)

1. **Land the shape3 config directly** — 45→37, the cleanest subject in the fleet. Same one-PR treatment as shape2.
2. Already wired into `ci.yml`'s `bot-lint` job — this is a config swap, not new plumbing.

### `ocx/.claude/tests`, `grimoire/.claude/tests` (the uncalled suite)

1. **Add one line** (`run: task claude:tests`) to each repo's `verify-basic.yml` acceptance-tests job. Already passes today (§ Findings 4) — this step cannot land red.

## Normative guidance candidates

1. **Rule**: A subject gets exactly one contributor/CI command (`task verify`/`task ci`/equivalent), documented and identical in both places, before any lint/type rule is turned on for it. **Rationale**: turning on a rule before the command exists guarantees drift the moment someone runs the tool directly instead. **Verification**: the command in a subject's README/CONTRIBUTING matches the one in its CI workflow, byte for byte. Severity: blocking (prerequisite to everything else in this file).
2. **Rule**: Every gate this fleet adds is a required, blocking CI status check — never a pre-commit hook as the primary mechanism. **Rationale**: measured in § Findings 2 — a pre-commit hook doesn't bind on an unattended agent author; a blocking status check does. **Verification**: branch protection/ruleset lists the job as required; `git commit --no-verify` succeeding locally is expected and irrelevant. Severity: blocking.
3. **Rule**: A large-remainder lint adoption (>200 violations after safe autofix) is landed as named, bounded buckets per rule code, never as a single generated baseline/suppression file. **Rationale**: § Findings 1 — a baseline flattens exactly the structure that makes a large remainder tractable, and has a well-known failure mode of never shrinking. **Verification**: the per-file-ignores/noqa list added in any one PR names a specific rule code and a one-line reason, not a wildcard suppression covering an entire directory for "ALL". Severity: high.
4. **Rule**: `--unsafe-fixes` never appears in an agent's own `--fix` invocation, in CI, or in any config's `unsafe-fixes`/`extend-unsafe-fixes` key. **Rationale**: established by the sibling worker ([codified-reconciled.md §5][codified]) — unsafe fixes can change program behavior (`B011`) or exception type (`RUF015`), exactly the class of change an unattended pass must not apply as a side effect. **Verification**: `grep -rn 'unsafe-fixes\|extend-unsafe-fixes' **/*.toml` and `grep -rn -- '--unsafe-fixes' **/taskfile.yml **/.github/workflows/*.yml` both empty. Severity: blocking.
5. **Rule**: `${{ }}` never appears directly inside a `run:` shell block — every value flows through an `env:`-declared intermediate variable first. **Rationale**: GitHub's own hardening guidance, and the exact real finding in `ocx-save`'s `test-install-scripts.yml`/`release.yml` and `ocx`'s/`grimoire`'s `release.yml:79` (§ Findings 5). **Verification**: `zizmor --format plain .github/workflows` reports zero `template-injection` findings (auto-fixable for most cases: `zizmor --fix safe .github/workflows`, if the fix's own diff is reviewed before landing). Severity: high (the release pipeline instances; medium for `workflow_dispatch`-only ones).
6. **Rule**: every third-party action reference is pinned by commit SHA with a version comment, in every workflow — release workflows included, not just verification ones. **Rationale**: § Findings 5 finding 2 — this fleet's own convention is followed everywhere except the highest-stakes file (the one that ships release artifacts). **Verification**: `zizmor --format plain .github/workflows | grep -c 'unpinned-uses'` is 0. Empty output from that grep (not the whole zizmor run) is the pass. Severity: high.
7. **Rule**: `.claude/tests`-equivalent suites — any test config that exists and passes but nothing in CI runs — get wired in within the same audit cycle that discovers them, not deferred to a future cleanup. **Rationale**: § Findings 4 — the cost of wiring in a suite that's already green is one line; the cost of leaving it unwired compounds (drift with nobody noticing until the day it's finally run and everything has broken at once). **Verification**: `gate-exists.sh` (§ Findings 7) reports empty for the `tests` dimension on every project directory with a `pyproject.toml` in the repo. Severity: medium (nothing is actively broken today, but the risk compounds silently).
8. **Rule**: lint and type-check run in the same CI job as the tests they gate, on every push — never deferred to nightly or a merge queue for timing reasons. **Rationale**: § Findings 6, measured — both cost under 3 seconds against pytest suites that already take 13s-3min; there is no timing argument for deferral. **Verification**: the wall-clock delta between a run with and without the lint/type steps is under 5% of the total job time. Severity: low (a correctness/completeness question, not a risk one — but "we'll add it later for timing reasons" is not a real objection here and should be named as such if raised).

## Applied to the fleet

| Subject | Satisfied | Violated | New commitment (this sequence, not yet true) |
|---|---|---|---|
| `ocx-sdk-python` | Trusted Publishing (packaging audit); near-zero zizmor findings; ruff/pyright/pytest all wired in `ci.yml`'s `verify` job already | — | Land shape2 config (336→155), one PR |
| `ocx-mirror-sdk` | Same posture as `ocx-sdk-python` | — | Same shape, not directly re-measured here (out of this file's named subjects, carried by inference from the packaging audit) |
| `index/bot` | Zero zizmor findings — cleanest in the fleet; single command exists; 100% coverage gate measured real (13.13s, `849 passed`) | — | Land shape3 config (45→37), one PR |
| `ocx/test` | prebuilt binary → full acceptance suite genuinely green modulo pre-existing sigstore-infra failures (measured: 2174 passed, 47 skipped, 5 pre-existing fails, 4 known 3.10-floor errors, 171.72s) | No lint/type/coverage gate exists at all (`tooling-posture.md`); `release.yml` uses floating action tags where `verify-basic.yml` pins by SHA | Six-step sequence above — task plumbing, shape1 config + safe fix (1051→805), targeted `PLW1510` noqa, named-bucket triage, then blocking |
| `grimoire/test` | Full acceptance suite genuinely green (measured: **1060 passed, 0 failures**, 47.92s); pyright clean on `src/` already (0 errors) | Same lint/type/coverage gap as `ocx/test`; `release.yml` same floating-tag issue | Same six-step sequence, smaller remainder |
| `ocx/.claude/tests`, `grimoire/.claude/tests` | Suite is fast, real, and currently green (measured: 165+3/165 and 153/153) | **Never invoked by any CI workflow** (`tooling-posture.md`, confirmed again here by `gate-exists.sh` going red) | One-line wire-in, § adoption sequence |
| `ocx-save` | — | Highest zizmor finding density in the fleet: 9 real `template-injection` hits in `test-install-scripts.yml`, floating action tags in `release.yml`, no `.claude/tests` equivalent suite at all (not unwired — absent) | Not in this file's named-subject scope for the ruff/pyright rollout (no sibling audit measured it), but the zizmor findings apply directly and are actionable today |
| `grimoire-lore` | `pull_request_target` usage verified sound on read (§ Findings 5); own `python.yml` comment already corrected (observed mid-session) to accurately say no `requires-python` floor is declared, matching the prior packaging audit's finding | — | — |

## AI-agent angle

- **Bypassing a hook it doesn't know exists, or skips on purpose.** § Findings 2's whole argument: an agent author has no standing habit of running `pre-commit install`, and `--no-verify`/`SKIP` cost it nothing to reach for if it does know. Check: is the *only* enforcement mechanism a pre-commit hook? If yes, it isn't enforcement.
- **Adding a blanket `# noqa` or `# type: ignore` to reach green.** The sibling lint-yield audit already measured this fleet has zero blanket-suppression instances today (`PGH` family, 0 hits fleet-wide, [codified-reconciled.md][codified]) — worth protecting, not just noting: PGH catches exactly a bare `# noqa`/`# type: ignore` with no code attached. Check: `ruff check --select PGH .` stays at 0; any new hit is an agent taking the fast path to green instead of fixing or scoping the specific rule.
- **Widening an ignore list instead of fixing the cause.** The difference between rule 3 above (named, bounded buckets) and a growing `ignore = [...]` list in `ruff.toml` that accretes one more code every time a PR would otherwise go red. Check: does a PR's diff to `ruff.toml`'s `ignore`/`per-file-ignores` carry a one-line reason comment, matching this fleet's own existing convention (`grimoire-lore/ruff.toml:32-39`'s reasoned `ignore` list, `ocx/.claude/scripts/review_surface.py:533`'s `# noqa: BLE001 — opening is a convenience, never fatal`)? An ignore added with no reason is the tell.
- **`--unsafe-fixes` to clear a backlog fast.** Already established and cited, not restated: [codified-reconciled.md §5][codified]'s policy — never in an agent's own `--fix` invocation. Check: rule 4 above.
- **Turning the gate blocking before the remainder is actually clear**, discovering only after merge that the "clean" claim was measured with `--isolated` (ignoring the repo's real config) rather than the actual `--config` the CI job will run. This is the exact trap [lint-yield.md][lintyield]'s own method note calls out (`E501`'s ~100% noise at ruff's default 88-col vanishes once measured at each subject's real line-length) and [codified-reconciled.md][codified] deliberately avoided by never using `--isolated` for the four proven configs. Check: the violation count cited in a PR description was produced by the exact `--config <file>` (or repo-resident `pyproject.toml`) the CI job will actually invoke — not a `--select ALL --isolated` sweep.

## Contested / evolving

- **Whether `ocx-save` should get the same shape1/shape2 treatment measured for `ocx`/`grimoire`/`ocx-sdk-python`/`index/bot`.** Not covered by the cited sibling audits (none of the six measured subjects is `ocx-save`), and not independently re-measured here given the scope of this commission. `ocx-save/test` is almost certainly shape 1 (same taskfile/pyproject shape as `ocx/test`/`grimoire/test`, per the packaging audit's layout survey) and its `release.yml`/`test-install-scripts.yml` zizmor findings are real and actionable regardless — but its ruff/pyright violation counts are unmeasured, as of this research.
- **Whether `zizmor --fix safe` should run unattended in CI as a bot-authored PR**, versus requiring a human to apply and review the auto-fixes named above. Given § Findings 2/AI-agent-angle's own argument (an unattended agent should not apply an unsafe or behavior-changing fix without review), the same caution plausibly extends to zizmor's auto-fixes for `template-injection` — they're mechanically safe (wrap in `env:`), but "safe by zizmor's own classification" hasn't been independently re-verified here the way ruff's unsafe-fix list was. Flagged open, not resolved.
- **Whether the `--pythonpath .venv/bin/python` pyright invocation survives a future pyright release that adds native `.venv` auto-discovery.** [pyright-triage.md][pyright] documents this as pyright's *current* (1.1.411) behavior; if a future version changes it, the `[tool.pyright] pythonPath = ...` config entry recommended there becomes redundant, not wrong — worth a periodic re-check, not urgent.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [docs.github.com/.../available-rules-for-rulesets][gh-rulesets] | GitHub official docs | current | Required status checks cannot be bypassed by a normal contributor — the load-bearing fact behind § Findings 2 |
| [pre-commit.com][pre-commit] | pre-commit official docs | current | Confirms local-install requirement and bypassability — the load-bearing fact behind why the ratchet answer differs here |
| [docs.github.com/.../security-hardening-for-github-actions][gh-hardening] | GitHub official docs | current | Exact script-injection mitigation pattern (intermediate `env:` variable), matching zizmor's own auto-fix and the real findings in §5 |
| local: `uvx zizmor --version` / live runs against 7 repos' workflows | first-party measurement | 2026-08-23 | Every finding in § Findings 5 |
| local: `uvx ruff --version` / `which ruff` / `.ruff_cache` inspection | first-party measurement | 2026-08-23 | The parity break (§ Findings 3) and the cache-invalidation-is-not-a-risk finding, both measured rather than assumed |
| local: `uv run pytest` timed runs against `ocx/test`, `grimoire/test`, `index/bot`, `ocx-sdk-python`, `.claude/tests` | first-party measurement | 2026-08-23 | Every number in § Findings 6 |
| [python-audit/lint-yield.md][lintyield] | sibling audit, this program | 2026-08-23 | Proven ruff/pyright violation counts and the `PLW1510`/`PT018`/etc. per-code breakdown this file's adoption sequence is built on |
| [python-audit/pyright-triage.md][pyright] | sibling audit, this program | 2026-08-23 | The `src/`-only pyright scope decision and its exact adoptable-today numbers |
| [python-topic-map/codified-reconciled.md][codified] | sibling audit, this program | 2026-08-23 | The four proven, run-not-guessed ruff configs and their fix-yield numbers this file's sequence is staged against |
| [python-audit/tooling-posture.md][tooling-posture] | prior audit, this program | 2026-08-22 | The 60%-ungated headline figure and the original `.claude:tests`-never-called finding, both carried forward here |
| [python-packaging.md][packaging] | prior audit, this program | 2026-08-23 | Trusted Publishing verdict on `ocx-sdk-python`/`ocx-mirror-sdk`, and the `grimoire-lore/publish.toml` credential-posture verdict this file's `zizmor` pass extends |
| [python-audit/version-floor.md][floor] | prior audit, this program | 2026-08-22 | The `check-floor-tested.sh` pattern `gate-exists.sh` (§ Findings 7) generalizes |
| `zizmor` rule docs, referenced inline per finding (`docs.zizmor.sh/audits/#template-injection`, `#dangerous-triggers`, `#unpinned-uses`, `#artipacked`) | zizmor official docs | current, zizmor 1.29.0 era | The exact rule definitions behind every zizmor finding cited in §5 |
| ruff docs (`docs.astral.sh/ruff/configuration/#caching`) | Ruff official docs | current | Default cache directory name (`.ruff_cache`); version-scoping itself confirmed empirically, not from this page alone (see local measurement above) |
| GitHub Actions script-injection reference (linked from the hardening guide above) | GitHub official docs | current | The `env:`-intermediate-variable pattern, cross-checked against zizmor's own fix |

[tooling-posture]: ../python-audit/tooling-posture.md
[lintyield]: ../python-audit/lint-yield.md
[pyright]: ../python-audit/pyright-triage.md
[codified]: ../python-topic-map/codified-reconciled.md
[packaging]: ../python-packaging.md
[floor]: ../python-audit/version-floor.md
[gh-rulesets]: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets
[pre-commit]: https://pre-commit.com/
[gh-hardening]: https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions
