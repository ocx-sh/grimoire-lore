---
title: ocx tested-documentation-examples mechanism — file:line audit
agent: docs-audit-worker
model: sonnet
scope: ocx (primary), fleet-wide grep for axis 6 (ocx-mirror, ocx-mcp, ocx-catalog, creeptd-ng, grimoire, ocx-mcp, grimoire-indexer, ocx-mirror-sdk, ocx-sdk-python, ocx-indexbot, kate-middlechild, ocx-save, grimoire-lore)
method: >
  Read in full: .claude/artifacts/{adr_tested_doc_command_mechanism,
  design_spec_doc_command_scripts,research_shell_hook_cast_recording,
  research_vitepress_transclusion_cast_cost}.md; test/src/doc_scripts.py,
  test/src/state_providers.py, test/src/doc_binding.py, test/recordings/{conftest,
  cast_recorder,cast_layer,setups}.py; test/src/scenarios/{__init__,basic,
  diamond_deps}.py; website/.vitepress/theme/components/{Terminal,Frame}.vue;
  root taskfile.yml, test/taskfile.yml, website/{taskfile,recordings.taskfile,
  scripts.taskfile}.yml. Counts taken with `find`/`grep -c`/`grep -l` against
  `test/doc_scripts/*.sh` (66 files), `website/src/public/casts/*.cast` (35
  generated), `website/src/_scripts/**` (66 published), and
  `grep -roh '<Terminal src=' / '<<< @/_scripts'` over `website/src/docs`.
  Every command is inlined next to its result below. Fleet axis 6:
  `grep -rlIE 'doctest|mdbook.?test|rust-skeptic|pytest-codeblocks|codeblocks|tesh|runme|mdsh|byexample|asciinema|\.cast\b'`
  across the 12 non-ocx repos named in docs-frame.md, node_modules/.git/target/
  dist/.vitepress-cache/.serena excluded.
date: 2026-09-05
---

# The mechanism as implemented (not as the ADR proposes)

**Authority note, up front:** the two `.claude/artifacts/*.md` files are marked
"design record — no implementation in this ADR" / "no implementation here" —
they are pre-code contracts for a `/swarm-execute` builder. The implementation
matches them closely (confirmed line-by-line below, including a 2026-05-18
late-discovered addendum, EX10/DE6, that isn't in the ADR's original decision
list at all). **Where this audit cites a decision, the code is what actually
runs; the ADR/spec is cited only as the design rationale, and I flag the one
place a later addendum supersedes the original spec text.**

## 1. Header schema, as parsed

`test/src/doc_scripts.py:87` — recognised keys:
`{state, doc, cast, title, description, expect, shell}` (`_RECOGNISED_KEYS`,
line 87). An unrecognised key is a hard parse error (EX5,
`design_spec_doc_command_scripts.md:132`, implemented at
`test/src/doc_scripts.py` — `DocScriptParseError`, lines 100–117).

Concrete example, `test/doc_scripts/getting-started__install.sh:1-11`:
```sh
#!/usr/bin/env bash
# state: setup:basic
# cast: true
# doc: getting-started/install
# title: Install a package
# description: Download a package into the content-addressed object store and create a candidate symlink.
set -euo pipefail

# region cast
ocx package install "$PKG_ASTRAL_SH_UV"
# endregion cast
```
`# doc:` slug grammar is `SLUG_RE` at `test/src/doc_scripts.py:78`
(`^[a-z0-9]+(?:[-/][a-z0-9]+)*$`). `# cast: true` requires **exactly one**
`# region cast` / `# endregion cast` block — zero or >1 is EX9, a hard parse
error (`test/src/doc_scripts.py:104`, enforced in `cast_layer.py:230`).

## 2. State-provider registry (ADR Decision B, resolved to Option B1′)

The ADR's own Option B1 ("merge `SETUPS` and `SCENARIOS` into one registry")
was **rejected** in favour of B1′ — an adapter, not a merge
(`adr_tested_doc_command_mechanism.md`, "Decision B (chosen): Option B1′").
The code matches B1′ exactly: `test/src/state_providers.py:29` defines a
`StateProvider` Protocol; line 367 wraps a legacy `test/recordings/setups.py`
`SETUPS` function (`SetupAdapter`); line 501 wraps a legacy
`test/src/scenarios/__init__.py:36` `Scenario` subclass (`ScenarioAdapter`).
`resolve_state()` at line 632 dispatches on an explicit family prefix —
`setup:<name>` or `scenario:<Name>` — so `# state: setup:basic` in a doc
script resolves to the recordings family, never the Scenario family; no
implicit union, no naming collision (this is the exact risk the ADR's
rejected Option B1 carried and B1′ was chosen to avoid).

`test/src/scenarios/basic.py` (14 lines) and `diamond_deps.py` (19 lines) are
the harness the Scenario family wraps: a `Scenario` subclass with a `setup()`
method that calls `self.publish(...)` / `self.publish_with_deps(...)` — plain
Python, no bash. Doc scripts never invoke these directly; they invoke
`state_providers.resolve_state()`, which may resolve to one of these classes
under the hood.

## 3. Discovery + drift gate (verify-path execution)

`test/src/doc_scripts.py` collects one pytest case per `.sh` file under
`test/doc_scripts/` (66 files, confirmed by `ls test/doc_scripts/*.sh | wc -l`
→ 66). Wired into `test:parallel`:

- `test/taskfile.yml:96-99` — the `parallel` task's `sources:` block names
  `doc_scripts/**/*.sh` explicitly with a comment: *"Doc scripts are executed
  by the drift-gate collection inside this parallel run (test_doc_scripts.py),
  so editing a .sh fixture must invalidate the cache."*
- Root `taskfile.yml:127` (`.verify:build-test`) → `test:parallel` (line 118)
  → `test/taskfile.yml` `parallel` task → `uv run pytest -n auto tests/`,
  which collects `test/tests/test_doc_scripts.py` (151 lines) along with six
  sibling modules: `test_doc_binding.py` (660), `test_doc_scripts_parser.py`
  (1527), `test_doc_scripts_publish.py` (1897), `test_doc_scripts_executor.py`
  (540), `test_doc_scripts_cast.py` (797), `test_doc_scripts_one_tree.py`
  (273) — **7,925 lines total** of test/support Python behind this mechanism.
- `test/taskfile.yml:454-473` — `doc-scripts:drift` is a convenience
  subset-runner ("a convenience subset-runner, not a separate CI-only gate")
  that runs exactly those 7 modules; the comment states they are "already
  collected unconditionally by `test:parallel`."

**A stale documented command fails `task verify`, independent of whether the
website is ever built** — this is ADR Decision A, and it is what the taskfile
sources actually implement (root `taskfile.yml:117-127`).

`command-line.md` (the CLI reference page) is explicitly **out of scope** for
this drift gate (ADR "Locked Tenets" §5) and instead carries its own
structural test, `test/tests/test_doc_command_reference.py` (479 lines) —
checks anchors + `**Usage**`/`**Options**` blocks per command, not execution.
This is a second, narrower, complementary drift gate, not part of the
doc-script mechanism.

Failure ergonomics (DG1-DG3, `design_spec_doc_command_scripts.md:249-263`,
implemented): a failing case's message names the script path, the `# title`,
and — when `# doc:` is present — the slug, so CI output maps script → failing
website page without opening the script.

**EX10 (2026-05-18 addendum, post-dates the base spec, confirms active
maintenance):** the drift gate runs the **raw** script body under
`provider.script_env()`, which carries SP7 parallel-isolation-prefixed
`$PKG_*` values (`t_<8hex>_<repo>`), not the clean display values shown on the
page. It does **not** run the rendered/displayed command. The guarantee is
"DE6-canonical equivalence" (`declared == canonical(provisioned)`, SP7 prefix
stripped), not byte-identity — implemented at `test/src/doc_scripts.py:469-476,
550-616` and cross-checked at `test/src/state_providers.py:100,232`. **This
means "the page shows exactly what was tested" is true only after a documented
prefix-canonicalization step, not literally** — a real subtlety worth carrying
into the portable pattern description.

## 4. Publish task — test/ → website/ bridge (ADR Decision D, Option D1)

`website/scripts.taskfile.yml:11` (`publish` task) runs
`website/scripts/publish_doc_scripts.py` (948 lines), writing to
`website/src/_scripts/<slug>.sh` where `<slug>` comes only from `# doc:`
(Option D1, chosen over D2 "mirror the test path" — D2 scored 2.15/5 weighted
vs D1's 4.45/5, ADR §6, because D2 "violates tenet #2" — website paths would
encode the test tree). Confirmed: 66 files under `website/src/_scripts/**`
(one per doc script with a `# doc:` slug — all 66 have one), a manifest
`.published.json`, and a lock `.published.lock`. This task runs inside
`website/taskfile.yml:41` (`build`) as `scripts:publish`, **before**
`recordings:parallel` — i.e. every `website:build` re-publishes scripts, then
generates casts from the freshly-published set.

## 5. Cast recording pipeline (opt-in, `website:build` only, never in verify)

`website/recordings.taskfile.yml:34-49` (`build`/`parallel` tasks) →
`uv run pytest recordings/` inside `test/`, env `OCX_DOC_CASTS_DIR` =
`website/src/public/casts` (`website/recordings.taskfile.yml:10`). Consumes
the **same** `test/doc_scripts/*.sh` tree via `conftest.py:121`
(`# EQ3 — one-tree convergence`: *"there is exactly **one** script tree and no
legacy `recordings/scripts/` glob and no second discovery path"* — confirmed:
no `test/recordings/scripts/` directory exists).

Recorder mechanics (`test/recordings/cast_recorder.py`, 519 lines):
`pexpect.spawn("/bin/bash", ["--norc","--noprofile"])` — a real PTY, real
interactive bash (confirmed by `research_shell_hook_cast_recording.md`, which
verifies `PROMPT_COMMAND` fires because `--norc`/`--noprofile` suppress
startup-file *sourcing*, not interactivity). Output chain per
`cast_layer.py:196-203`: `.strip_progress().sanitize(sanitize_map)
.truncate_digests().realign_tables().auto_height().write(path)`. Repo/display
names come from `provider.display_map()` (`cast_layer.py:169`, "CA4: derive
sanitize_map and repo_map from provider only (never SETUPS)").

Registry container: `registry:2` (`test/docker-compose.yml:62,69`); the
signing/attestation scripts additionally stand up `dexidp/dex:v2.45.1`,
`sigstore/fulcio:v1.8.8`, `sigstore/rekor-server:v1.4.2`, and two Trillian
processes (`log_server`/`log_signer` v1.7.2) plus a `tesseract/posix` CT log —
a 6-container Sigstore stack, not just the registry, for the 3-4 signing/SBOM
cast scripts.

**Known flakiness, named in the code:**
- `cast_recorder.py:380` — the PS1 sentinel is sent as two adjacent quoted
  string literals specifically so a slow shell that hasn't yet run
  `stty -echo` doesn't echo the sentinel back as if it were a prompt; the
  comment states plainly: *"Load-dependent, so it surfaces as a flaky
  recording"* if this weren't handled.
- `test/tests/test_doc_scripts.py:90-94` — a hand-maintained map of scripts
  publishing to a *fixed* (non-parallel-isolated) repo identifier must be
  `xdist`-grouped; the comment notes six `mytool`-publishing scripts sat
  outside that map "long enough to read as flake rather than as a missing
  entry" before this check made a missing entry fail outright instead of
  intermittently colliding under `-n auto`.

**Cost** (`research_vitepress_transclusion_cast_cost.md`, dated for a 22-script
baseline — now 35 cast-true scripts): cast write itself ≈1ms; the real cost is
setup (real OCI pushes) + PTY exec, incurred whether or not a cast is
produced. Serial recordings ≈4-15 min for 22 scripts; `pytest -n auto`
≈1-3 min; registry throughput caps useful parallelism at ~4-8 workers. GIF
conversion (`agg`/gifski via `ProcessPoolExecutor`) ≈20-60s wall
(`website/recordings.taskfile.yml:70-76`, `gifs` task). **At 35 scripts
(59% more than the 22 the estimate covers), assume the low end of these
ranges no longer holds without re-measurement** — I did not re-run the
pipeline to get a current number; this is a documented gap in this audit.

## 6. Page binding — two distinct modes, not one

`website/.vitepress/theme/components/Terminal.vue` (305 lines) supports a
`src` prop (fetches a `.cast` file, plays via the `asciinema-player` npm
package, themed via CSS vars mapped to VitePress tokens, lines 259-305) **and**
an inline-`<Frame>`-children mode (`Frame.vue`, 10 lines, a non-rendering
VNode marker consumed via `useSlots()`, `Terminal.vue:59-77`) that fabricates
an asciicast v2 string client-side from static `at`/text pairs with **no
execution at all**. **Measured: 0 of 36 live `<Terminal>` embeds use the
`<Frame>` mode** (`grep -c '<Frame '` over `website/src/docs` → 0) — every
embed uses `src=`. The inline mode is shipped, documented in props, and
unused; it is a live capability for authoring an untested "terminal" mockup
that the current corpus does not exercise.

Two binding mechanisms actually in use on pages, matched to the `# cast:`
value:
- **`cast: true` → `<Terminal src="/casts/<slug>.cast" ...>`.** 36 embeds
  across 15 pages bind to 35 distinct `.cast` files (one file,
  `authoring/package-push.cast`, is embedded on two pages:
  `authoring/building-pushing.md:17` and `authoring/index.md:57`).
- **`cast: false`/absent → `<<< @/_scripts/<slug>.sh{sh}`** (VitePress
  build-time transclusion, confirmed unused for anything else in
  `website/src/docs`: 40 total `<<<` transclusions, of which 31 map 1:1 to
  the 31 non-cast scripts and **9 are cast:true scripts also transcluded
  alongside their own `<Terminal>` player** — all 9 in
  `getting-started.md` and `in-depth/lazy-loading.md`, i.e. those two pages
  show both the raw tested source and the recorded replay; every other
  cast:true page shows only the replay).

Net: **all 66 doc scripts with a `# doc:` slug are bound to exactly one
website page**, via one of these two mechanisms — confirmed no orphans by the
matching counts above (66 published = 35 cast:true + 31 cast:false, and both
subsets fully account for the embeds found).

# Counts

| Metric | Count | Source |
|---|---|---|
| Doc scripts (`test/doc_scripts/*.sh`) | 66 | `ls test/doc_scripts/*.sh \| wc -l` |
| — with `# cast: true` | 35 | `grep -l '^# cast: true' test/doc_scripts/*.sh \| wc -l` |
| — without (cast:false/absent) | 31 | `grep -L '^# cast: true' test/doc_scripts/*.sh \| wc -l` |
| `.cast` files generated (last build) | 35 | `find website/src/public/casts -name '*.cast' \| wc -l` — 1:1 with cast:true count |
| `.cast` files committed to git | 0 | `git ls-files website/src/public/casts/ \| wc -l`; gitignored at `website/.gitignore:12` |
| Published scripts (`website/src/_scripts/**/*.sh`) | 66 | `find website/src/_scripts -name '*.sh' \| wc -l` — 1:1 with total doc-script count |
| Pages embedding `<Terminal>` | 15 files, 36 embeds | `grep -rl`/`grep -roh '<Terminal src='` over `website/src/docs` |
| Pages using `<<<` script transclusion | 4 files (getting-started.md, user-guide.md, in-depth/entry-points.md, in-depth/lazy-loading.md), 40 tags | `grep -rl/-roh '<<< @/_scripts'` |
| Test/support code for this mechanism | 7,925 lines | `wc -l` on the 7 `test_doc_scripts*`/`test_doc_binding.py` modules |
| Design/ADR docs for this mechanism | 1,576 lines | `wc -l` on the 3 required `.claude/artifacts/*.md` |
| Un-executed inline `ocx ...` mentions, sampled | getting-started.md 3/21, faq.md 0/8, user-guide.md 20/62 (see caveat) | rough 3-word-signature grep vs `test/doc_scripts/*.sh` bodies, see below |

**Caveat on the last row:** this is an approximate re-derivation, not a ground
truth — it flags an inline `` `ocx ...` `` mention as "unbacked" if its first
three whitespace-separated tokens don't appear verbatim in any doc-script
body. Spot-checking the 20 user-guide.md flags shows most are **not** drift —
11 of the 20 (`ocx shell hook/init/env`, `ocx install/select/deselect/
uninstall/exec`, `ocx ci export`, `ocx update`) sit inside a
`## Migration` section under an explicit
`<!-- moved-command-ok: this section documents the removal; the bare forms
are the subject, not an instruction -->` marker (`user-guide.md:1178-1184`) —
a deliberate, annotated exception for historical/removed-command prose, not
an oversight. The remaining ~9 (`ocx self update`, `ocx lock --check`,
`ocx version -v`, `ocx patch why`, `ocx about`, `ocx clean`, `ocx direnv
export`, `ocx launcher exec`) are genuinely not exercised by any doc script —
plausible candidates for real gaps (e.g. `ocx self update` is inherently hard
to test without mutating the test binary), but I did not verify each by
running the CLI, so treat this as a **lead list**, not a finding.

# Alternatives the ADR rejected

- **Decision A** had no rejected options — verify-gate placement was locked
  by the cost research (recordings pipeline stays out of the per-commit
  loop; acceptance path is the gate).
- **Decision B, Option B1** (merge `SETUPS`+`SCENARIOS` into one registry) —
  scored 4.15/5 but rejected: a behaviour change to shared test infra
  mid-hardening with an "uncharacterized `basic` union," called a
  "Two-Hats violation" per the repo's own `workflow-refactor.md` convention.
- **Decision B, Option B2** (promote the PTY recordings runner itself onto
  the verify path, retire the Scenario harness) — scored 2.75/5: exit-code-only
  assertions (no rich `$VAR`/bash-idiom checks), and re-imports the
  Docker+PTY cost the research explicitly said must stay off the per-commit
  path.
- **Decision D, Option D2** (mirror the test directory layout under
  `_scripts/`) — scored 2.15/5: "violates tenet #2" (website paths would
  encode the test tree) and makes every test-tree refactor break every
  citing doc page (reversibility scored 1/5).
- A **VHS-based recording path** (from `research_shell_hook_cast_recording.md`)
  was rejected outright, not scored: it would be a second script format
  (`.tape`), a second discovery mechanism, and — because `.tape` has no
  cast-region/state-provider concept — either duplicated sanitization or an
  unsanitized second cast class, exactly what the "one-tree" (EQ3) invariant
  exists to prevent. Also adds a Go binary + Docker dependency to a repo with
  no other Go entry point.
- **Hand-recording and committing `.cast` files** — rejected in the same
  research doc as violating "never edit generated files" and reopening the
  same drift class the one-tree invariant closes.

# Portability: pattern vs. instance

| Element | Pattern (portable) | Instance (ocx-specific) |
|---|---|---|
| Doc examples are acceptance tests | Every documented command is a script that fails CI when the command it demonstrates breaks | `test/doc_scripts/*.sh` + `test_doc_scripts.py`, Rust/`ocx` binary, `registry:2` |
| Cast is opt-in, additive, off the hot path | Recording a replay is a separate, non-gating build step layered on a subset of already-tested scripts | `website:build` → `recordings.taskfile.yml`, `pexpect`+bash-specific `CastRecorder` |
| Page binds to script by declared metadata, not directory layout | A slug/tag in the script header is the only contract between test tree and doc tree; either can be reorganised independently | `# doc: <slug>` header key, `website/src/_scripts/<slug>.sh`, VitePress `<<<`/`@` srcDir alias |
| Drift fails the gate, gate names the failing page | A stale example's failure message names the doc page, not just the test file, so a human doesn't have to reverse-map | DG1/DG2 message format in `test/src/doc_scripts.py` |
| Deliberate historical/removed-command mentions are annotated, not silently exempted | A machine-checkable marker lets prose describe a *former* command without tripping the drift lint | `<!-- moved-command-ok: ... -->` convention in `user-guide.md` |
| Tested-value vs. displayed-value equivalence is a proven, not assumed, relationship | When the test harness must vary inputs for isolation (parallel test IDs, tmp paths, etc.), a canonicalization gate proves the displayed artifact and the executed one are equivalent modulo that variation | EX10/DE6, SP7-prefix stripping, Rust/pytest-xdist parallel isolation specifics |
| One executor, one registry-of-fixtures abstraction, adapted rather than duplicated | Old test infra (whatever pre-existed) is wrapped behind a small interface instead of rewritten, so migration doesn't touch its own callers | `StateProvider` Protocol wrapping legacy `SETUPS`/`Scenario` — B1′, not B1 |
| A structural (non-executing) drift check can complement the executing one for reference-style pages | Command-reference/index pages that enumerate every flag don't need per-command execution, just anchor/shape checks | `test_doc_command_reference.py` vs. `command-line.md` |

**Not portable as designed, worth flagging if the artifact leans on it:** the
Sigstore/Trillian 6-container stack for signing-flow casts, the Rust-specific
`OCX_COMMAND`/binary-build coupling, and the ~7,900 lines of Python behind 66
scripts — this is a genuinely heavy bespoke system. A team adopting the
*pattern* without ocx's scale (66 commands, a CLI with real network/registry
side effects to demonstrate) should expect to build something far smaller;
citing the line count is itself useful context for the shipped guidance so it
doesn't read as "build this much infrastructure" by default.

# Fleet check — does anything else in the fleet test its docs?

`grep -rlIE 'doctest|mdbook.?test|rust-skeptic|pytest-codeblocks|codeblocks|
tesh|runme|mdsh|byexample|asciinema|\.cast\b'` across the 12 non-ocx repos
named in docs-frame.md (md/toml/yml/py/rs/json, excluding node_modules/.git/
target/dist/.vitepress-cache):

- **`ocx-mirror`, `ocx-mcp`**: hits are a **vendored copy of ocx itself**
  under `external/ocx/` — same ADR/design-spec files, not an independent
  second implementation. Not counted.
- **`ocx-save`**: has its own `taskfiles/recordings.taskfile.yml` and
  committed-looking cast output under `.vitepress/dist/casts/*.cast` — same
  task shape (`ensure-binary`, `CASTS_DIR`, `GIFS_DIR`) as ocx's
  `recordings.taskfile.yml`, but **no `doc_scripts/` directory exists** in
  that repo — it appears to run the pre-unification, cast-only recordings
  pipeline without the acceptance/drift-gate layer this audit describes for
  ocx. A genuine but partial/earlier-generation adoption of the *cast*
  half of the pattern, not the *drift-gate* half.
- **`grimoire`**: one hand-authored `docs/src/demo.cast` for the landing
  page hero, replayed by a "vendored asciinema player"
  (`grimoire/CHANGELOG.md:196`); the repo's own comment says *"demo.cast is
  committed: review the diff"* — this is a manually re-recorded marketing
  asset, explicitly **not** tied to any acceptance test. Contrast case, not
  a match.
- **`ocx-sdk-python`: a real, independent, different tested-docs
  mechanism.** `conftest.py:1-30` wires up **Sybil** (`sybil>=9`,
  `pyproject.toml:39`) to run every code fence in `docs/**/*.md` and
  `README.md`, plus every `>>>` doctest-style example in a docstring's
  `Example:` section (via Sybil's own `DocTestParser`, explicitly *not*
  stdlib `doctest --doctest-modules`, "which would double-collect"). Four
  fence-language tiers gate scope: ` ```python ` (always runs),
  ` ```python-contract ` (needs a live pinned `ocx` binary,
  `OCX_SDK_CONTRACT=1`), ` ```python-acceptance ` (needs the compose stack,
  `OCX_SDK_ACCEPTANCE=1`), ` ```python-no-run ` (compile-check only via
  `ast.parse`, for snippets that reference unreachable infra). This is a
  mainstream-tool ("Sybil"), no-asciicast, no-bespoke-registry version of
  "tested doc examples" — see contradiction below.
- **`ocx-indexbot`, `kate-middlechild`, `ocx-catalog`, `creeptd-ng`,
  `grimoire-indexer`, `ocx-mirror-sdk`, `grimoire-lore`**: no hits (or hits
  are unrelated, e.g. `ocx-mirror-sdk`'s `_rest.py`/`_router.py` matching
  "runme"-adjacent substrings in unrelated code — checked, false positive).

**Count: 1 other repo (`ocx-sdk-python`) runs a genuine, independent tested-docs
mechanism; 1 (`ocx-save`) runs a partial (cast-only, no drift gate) variant of
ocx's own pipeline; 1 (`grimoire`) uses asciinema for an untested marketing
asset; the remaining 9 named repos show nothing.**

# Contradiction to the frame

docs-frame.md's hypothesis #6 states "tested examples embedded as real
asciicasts are best practice" as if this were settled and singular. The fleet
itself contradicts the "asciicast" half being necessary: **`ocx-sdk-python`
achieves tested documentation examples with zero asciicasts**, using a
mainstream library (Sybil) that most fleets can adopt without building a PTY
recorder, a sanitization pipeline, or a Sigstore test stack. ocx's own
research doc independently reaches the same conclusion about the *display*
half — `research_vitepress_transclusion_cast_cost.md` explicitly separates
"tested" from "visually demoed," and 31 of ocx's own 66 doc scripts (47%) ship
with **no cast at all**, bound to their page via plain code-block
transclusion, not video replay. The artifact should present "acceptance-test
every documented command" as the load-bearing pattern and "optionally record
a replay for some of them" as a separate, non-default layer — not bundle the
two as one "asciicast" recommendation.
