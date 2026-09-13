# JVM quality artifact program (AUTHORED, ON BRANCH `cmake`)

Started 2026-09-05 22:57 CEST in the `cmake` worktree
(`.agents/worktrees/cmake`, branch `cmake`) — not on `main`, not in the `java`
worktree. Brief: Java/Kotlin, modern Gradle incl. plugin development, Maven,
Ant as legacy, Bazel-for-Java as a complement to the concurrent Bazel program
on `main`, SDK development and dependency management, fat/shadow jars, lint,
test suite and coverage; self-directed topic discovery.

## State at last write

| Phase | Status | Where |
|---|---|---|
| 0 Frame | done, corrections appended after wave 1 | `.agents/research/jvm-frame.md` |
| 1 Ground | done — 4 audits over a 32-repo exemplar corpus (fleet has zero JVM code) | `jvm-audit/*.md`; fetch and table scripts in `jvm-audit/scratch/` |
| 2 Scout | done — 9 scouts, 423 raw candidates | `jvm-topic-map/*.md` |
| 3 Map | launched 23:36, opus | `jvm-topic-map.md` when it lands |
| 4–5 Wave 2 | done 2026-09-12 — 14 dives, 6 consolidations (gradle-core, gradle-plugin-dev, dependencies, distribution, quality-gates, language-api), 105 MUST, 81 surprises, 19 follow-ups | `jvm-<group>.md` + `jvm-<group>/`; receipts in `jvm-topic-map/scratch/wave2-receipt.json` |
| 6 Harvest | done 2026-09-12 — "Wave 2 landed" appended to `jvm-topic-map.md`; 16 frame corrections appended to the frame; convergence verdict: not converged | briefs in `jvm-topic-map/scratch/wave3-briefs.json` |
| 4–5 Wave 3 | done 2026-09-12 — 14 dives, 7 consolidations (concurrency, gradle-settings, publishing, bazel-java, maven-and-ant, platform-and-toolchains, java-runtime-safety), 151 IDs, 110 MUST, 82 surprises, 27 follow-ups | receipts in `jvm-topic-map/scratch/wave3-receipt.json` |
| 6 Converge | done 2026-09-12 — verdict **needs-another-round**: 296 IDs / 215 MUST / 21 families across 13 consolidations, 22 cross-consolidation contradictions resolved, 26 binding authoring notes, 16 owner decisions with defaults | `jvm-topic-map.md` › "Wave 3 landed" and "Authoring notes (binding on the drafters)"; receipt `jvm-topic-map/scratch/converge-receipt.json` |
| 4–5 Wave 4 | done 2026-09-12 — 6 dives, 5 revisions; KT-ERR ships as the 28th depth file; JAVA-SEC no longer depends on find-sec-bugs; residue is dated re-checks and corpus-unmeasurable items | `jvm-topic-map.md` › "Wave 4 landed"; receipt `jvm-topic-map/scratch/wave4-receipt.json` |
| 7 Author | done 2026-09-13 — 35 opus drafters in two batches (a: java-quality 9+1, maven-build 4+1, two skills, Bazel-Java handoff; b: kotlin-quality 7+1, gradle-build 8+1); 24 IDs dropped at authoring with reasons in the receipts | `jvm-topic-map/scratch/author-{a,b}-receipt.json` |
| 8 Validate | done 2026-09-13 — 5 opus reviewers ran verifications against planted fixtures (10 blockers, 24 fixes, nits skipped), 25 fixers applied them; checker clean on every set; two new checker lints (unquoted `--include=*` glob, split table row) with self-tests; `grim publish --dry-run` lists all seven JVM packages; `task artifacts` passes | `jvm-topic-map.md` › "Authoring landed"; `review-{a,b}-receipt.json` |
| Marks | done — `assets/glyphs/{java,kotlin,gradle,maven}.svg` and `assets/lore-{java,kotlin,gradle,maven}.svg` via `scripts/make-mark.py` with white ink | |
| Wiring | done — `publish.toml` (4 rules, 2 skills, 1 bundle at 0.1.0), `bundles/jvm-essentials.toml` (untagged members), `taskfile.yml` JVM checker step (no root: the fleet has no JVM), seven `docs/` companions with counts verified by command | |
| Commit | done 2026-09-13 — two commits on `cmake` (checker lints, JVM set), rebased onto `main`; not pushed, no PR | |

Exemplar clones live at `/home/mherwig/dev/.tmp-jvm-exemplars/<owner>__<repo>`
(moved off the full tmpfs 2026-09-06; disposable); the frame table records
every SHA, and `jvm-audit/scratch/fetch-exemplars.sh <dir>` recreates them
(blob-less depth-1 clones, sparse checkout of build files).

Owner halted before wave 2 on 2026-09-06, then said "continue" on
2026-09-12 with no answers to Q1–Q8, so the map's defaults apply (Java-first
SDK, JDK floor 17, Gradle floor 8.11, Kotlin DSL examples, own Maven rule,
offer `java.md` to bazel-quality, 90 percent coverage floor, one docs-quality
row). Wave 2 launched 2026-09-12 from
`jvm-topic-map/scratch/jvm-wave2.mjs` (14 dives, 6 consolidations; the
selection is baked into the script because `args` has a size cap). Wave 3 is
staged in `jvm-topic-map.md` › "Staged for wave 3"; regenerate its script the
same way from `scratch/map-receipt.json` (`wave3_staged`) with
`existing_groups` set to the consolidations on disk so the reviser contract
fires where a group already has a `jvm-<group>.md`.

Since the halt, `bazel-quality` (rule, two skills, bundle) merged to `main`
(4325c18). The Bazel-Java depth file is now an offer against a published set,
not an in-flight one.

## To resume cold

1. Read `jvm-frame.md` end to end, corrections last.
2. If `jvm-topic-map.md` exists: its "Selected for wave 2" briefs are the
   commissions. Re-create the dive workflow from the research-lang skill's
   `references/prompt-contracts.md` (dive + consolidator + reviser contracts)
   — sonnet dives, opus consolidations, ≤ 14 dives per wave, pipeline per group.
3. If it does not: re-run phase 3 from `references/wave-plan.md` over the 13
   wave-1 artifacts.
4. Budget: research phases 1–6 cost ~12.0M subagent tokens (wave 1 2.3M, map 0.5M, wave 2 3.2M, harvest 0.3M, wave 3 3.6M, converge 0.5M, wave 4 1.6M). Authoring and validation cost ~9.3M (draft a 3.1M, draft b 2.8M, review 1.45M, fix 1.35M, docs and lints ~0.5M). Total ~21M; no session limit hit.
5. What is left is the owner's: commit on `cmake`, rebase onto `main` (this file conflicts: `main` gained the Bazel section), open the PR; merging publishes 0.1.0 of all seven. Q6 (`java.md` into `bazel-quality`) is still open; the file is `.agents/research/handoff/bazel-quality-java.md` plus one routing row in `bazel-quality-index-row.md`.
6. Rule trigger evals in a fresh client session were not run: no consumer tree with Java or Kotlin exists in the fleet. First adopter should open a `.java`, a `.kt`, a `build.gradle.kts` and a `pom.xml` and confirm the right index is in context.

# Handoff — language quality artifact programs

# Bazel expertise artifact program

Written 2026-09-06, for a cold resume. Ran with `research-lang` against a
build system plus its per-language rulesets: nine scouts, five research
waves, a measurement wave that ran the contested claims on real 8.7.0, 8.8.0,
9.0.0, 9.1.0 and 9.2.0 binaries, and a convergence round. Committed and
pushed to `main` on 2026-09-06 in one commit (merging to `main` publishes
the four packages at `0.1.0`).

## What shipped

| Artifact | Path | Notes |
|---|---|---|
| `bazel-quality` (rule) | `rules/bazel-quality.md` + `rules/bazel-quality/` | 165-line index: the four-line gate, 19 non-negotiables, three `BZL-CORE` rules, a routing table by task. Twelve depth files (`starlark`, `bzlmod`, `hermeticity`, `caching`, `testing`, `ci`, `architecture`, `flags`, `rust`, `python`, `typescript`, `cpp`), 186 to 247 lines each, 328 rules (246 MUST; BZL-LARK-13 retired in review as a duplicate of BZL-ARCH-08) under the corpus IDs `BZL-LARK/MOD/HERM/CACHE/TEST/CI/ARCH/FLAG/RUST/PY/JS/CC` |
| `bazel-adopt` (skill) | `skills/bazel-adopt/` | Go/no-go from measured signals (no published threshold exists), then the migration order; five references: `go-no-go`, `workspace-setup`, `cache-and-ci`, `branch-rust`, `branches-python-ts-cpp`. 415 lines |
| `bazel-diagnose` (skill) | `skills/bazel-diagnose/` | Symptom-routed; six references: `slow-build`, `cache-miss`, `outage-and-eviction`, `nondeterminism`, `flaky-test`, `fetch-and-selection`. 479 lines |
| `bazel-essentials` (bundle) | `bundles/bazel-essentials.toml` | Three members, **no tag** |
| Companions and mark | `docs/bazel-{quality,adopt,diagnose,essentials}.md`, `assets/lore-bazel.svg` (+ `assets/glyphs/bazel.svg`, lucide "boxes", not the trademarked logo) | |

Wired in `publish.toml` (four entries at `0.1.0`) and `taskfile.yml`
(`artifacts` step against `BAZEL_CONSUMER`, default `../rules_ocx`, with
`--allow-absent` for the six correct-but-absent globs and `--forbid` for a
workstation path, the cache host and a corpus link). Glob set: the fifteen
build-system-guaranteed names plus `**/.bazelrc.*` (the fleet's
`.bazelrc.user` matches nothing narrower). `.agents/research/README.md` gained
a Bazel section.

## Validation

`check-artifacts.py --self-test` ok; the Bazel `artifacts` step clean after a
15-file sonnet fixer wave (47 structural findings: bare shell globs, `\|`
alternation in `-E` patterns, `<placeholder>` search patterns, `$(…)`
operands, unquoted `**`, a skill table re-defining IDs, three dropped HERM IDs
still cited); `task selftest artifacts` clean end to end; `grim publish
--dry-run` shows the four Bazel packages at `0.1.0` and no warnings.
Content review: the contradiction and era sweep found 3 blockers (a
SHOULD/MUST duplicate pair, an index preamble over-stating four SHOULD
rows, a cquery verification with stderr suppressed), 11 warns and 4 notes;
the verification-honesty run exercised 12 MUST verifications on real 8.7.0
and 9.2.0 binaries and found two `attr(stamp, -1, …)` queries that are
parse errors reading as pass, a flag-existence grep blind to every boolean
(`--[no]` rendering) and missing the UNDOCUMENTED probe, and one
evidence-losing `grep -c`; the trigger eval routed 12 of 12 utterances
correctly with no description findings; a second sweep over the eleven
skill references found 6 blockers, 12 warns, 3 notes (a seven-cache table
differing from BZL-CACHE-15, an execlog parser built in the wrong
repository, suppressed-stderr checks, unversioned claims). Every finding was
applied by a sonnet fixer with the reviewer's verbatim fix; the validator
was clean after each wave. Not exercised: remote-cache, darwin and Windows
verifications (13 listed by the honesty run as needing hardware this host
lacks).

## Corpus

`.agents/research/bazel-frame.md` (nine Corrections blocks; later wins),
`bazel-topic-map.md`, twelve `bazel-<topic>.md` consolidations (each
`revised: 2026-09-06`, six also `revised_wave5:`), `bazel-audit/` (4),
`bazel-topic-map/` (9 scouts), 25 dive dirs, `bazel-followups/` (15),
`bazel-measurements/` (9). Every consolidation ends with open questions
that ship as documented gaps in its depth file.

## Running Bazel for measurements

bazelisk is provisioned through rules_ocx's OCX toolchain and runs from ANY
directory:

```sh
USE_BAZEL_VERSION=9.2.0 ocx --project /home/mherwig/dev/rules_ocx/ocx.toml exec -- \
  bazelisk --output_user_root=<scratch>/out <command>
```

Never run Bazel inside `rules_ocx` itself; copy it with `git archive HEAD |
tar -x` (drops the untracked `.bazelrc.user`, which holds a cache credential
that no artifact may quote). Never create a WORKSPACE file. Host is WSL2 with
`linux-sandbox`; `/tmp` is a shared 16 GB tmpfs, so output roots go under
`~/.cache/bazel-measure-scratch/<slug>/` on real disk.

## Owner decisions the corpus could not make

Pilot repository (default none; `bob` named); moving the `rules_ocx` pin off
8.7.0 (8.7.0 to 8.8.0 already crosses lockFileVersion 24 to 28); migrating
the cache credential to `--credential_helper` (MUST for new setups, SHOULD
for existing); whether a silent local build on a cache outage is acceptable
(measured: no flag changes it); `--remote_timeout=60`; a `bazel_compatibility`
floor for rules_ocx; the `ocx/BUILD.bazel` and `ocx/private/BUILD.bazel`
`default_visibility = public` (BZL-MOD-34 finding); the stale
`.claude/rules/release.md:10-12`; the examples job's missing cache step;
C++ toolchain and sanitizer defaults for a set with no fleet consumer.

## Scratch left on disk

`~/.cache/bazel-measure-scratch/` (measurement output roots, the review's
`review-honesty/` planted-violation workspaces, a blobless bazel clone,
several GB), `/tmp/bazel-{8.8.0,9.0.0,9.1.0,9.2.0}*` source
trees and `/tmp/bq-out-{870,920}` (a worker's), `.agents/tmp-946b/` (a
worker's source scratch, untracked; `rm -r` denied to this session), the
session scratchpad. Nothing holds a Bazel server.

---


# Documentation-design artifact program

Written 2026-09-05, for a cold resume. Ran with `research-lang` adapted to a
non-language domain: the corpora were style guides, design systems, exemplar
sites, lint catalogs, the docs-UX and observability literature, and the
2024 to 2026 tooling shift, not a language's canon.

## What shipped

| Artifact | Path | Notes |
|---|---|---|
| `docs-quality` (rule) | `rules/docs-quality.md` + `rules/docs-quality/` | 198-line index, 18 non-negotiables, six depth files (`page-types`, `plain-english`, `examples`, `navigation`, `observability`, `machine-readers`), `checks.md`, and `checks/` with 8 stdlib scripts, 3 configs and planted fixtures. Globs: `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `docs/**`, `doc/**`, `website/**`, `site/**`, `mkdocs.yml`, `book.toml`, `.vitepress/config.*`, `docusaurus.config.*` |
| `docs-plan` (skill) | `skills/docs-plan/` | The discovery procedure: tiered use cases from the project's own evidence, user needs, typed page inventory, delete list, IA plan, seeded declarations. Owns `DOC-DISC-01` to `12` and `23` |
| `docs-instrument` (skill) | `skills/docs-instrument/` | Stands up the gate: declaration retrofit, lint tiers, link checking, tested-example harness per language, reader signals per generator, ratchets |
| `docs-essentials` (bundle) | `bundles/docs-essentials.toml` | Three members, **no tag** |
| Companions and mark | `docs/docs-{quality,plan,instrument,essentials}.md`, `assets/lore-docs.svg` (+ `assets/glyphs/docs.svg`) | |

Wired in `publish.toml` and `taskfile.yml` (validator over all three, every
`checks/*.py --self-test`, and a dogfood run of `checks/prose.py` over the
shipped prose). `grim publish --dry-run` shows exactly the four new packages.
**Merging to `main` publishes.** Nothing is committed yet.

Research corpus: `.agents/research/docs-*`, 4 audits, 6 scouts, 28 dives, 7
consolidations with families `DOC-TYPE`, `DOC-DISC`, `DOC-PLAIN`, `DOC-EX`,
`DOC-NAV`, `DOC-OBS`, `DOC-AGENT`, 179 IDs (7 retired in place). Index:
`docs-topic-map.md` (51 deferred rows). The frame with its corrections and the
orchestrator's decisions is `docs-frame.md`. The two critiques are
`docs-topic-map/wave1-critique.md` (`needs-another-round`) and
`wave2-critique.md` (`ready-to-draft`, and its Authoring notes were binding on
the drafters). Rescued measurement scripts sit under `docs-topic-map/scratch/`.

## Decisions that are load-bearing

1. **The declaration is a comment line, never YAML front matter.** Measured on
   built fixtures: mdBook 0.5.3 renders a front matter block as a fake `<h2>`
   and indexes it, an HTML comment above existing front matter breaks that
   front matter on all three fleet generators, and an HTML comment is a hard
   build error under MDX 3.1.1. So: `<!-- doc_type: V -->` within the first 12
   lines and after any front matter, with `{/* */}` for MDX, `..` for rST, `%`
   for MyST. Nine `doc_type` values, three `doc_tier` values, tier required only
   on `tutorial`, `how-to`, `landing`. `checks/doc_declaration.py --seed`
   proposes types from nav labels at 94 percent accuracy.
2. **Rule IDs are `DOC-<FAMILY>-nn`.** Retired: `DOC-TYPE-16`, `DOC-TYPE-21`,
   `DOC-PLAIN-06`, `DOC-EX-19`, `DOC-NAV-08`, `DOC-AGENT-02`, `DOC-AGENT-09`.
   `DOC-EX-33` and `DOC-EX-34` were misfiled as `DOC-TYPE-28/29` in the corpus
   and renumbered. Not shipped: `DOC-PLAIN-17/18/19/21`, `DOC-OBS-15`,
   `DOC-AGENT-10` to `20` (they govern the rule set itself), `DOC-EX-22/28/31`
   (vendor status that ages).
3. **Plain English is a house rule, not an AI detector.** The em-dash and
   semicolon ban ships as `DOC-PLAIN-01`, SHOULD, pinned, on GitLab's
   translation and terminal-rendering rationale. `DOC-PLAIN-09` forbids
   wording any finding as a claim about who or what wrote a page. The
   checkable numbers are GOV.UK's: 25 words per sentence, 5 sentences per
   paragraph, Flesch reading ease 50 on stripped prose with per-type
   carve-outs. The shipped set passes its own `prose.py`.
4. **Tested examples are the gate, the cast is an opt-in view.** The fleet's
   own numbers overturned the frame: 31 of ocx's 66 gated doc scripts ship no
   recording, and ocx-sdk-python tests every example with Sybil and records
   nothing. Commit policy for casts is a branching rule, not a default.
5. **Tiers and types are two axes.** The frame's three-kind split was
   overturned by every canonical source. Landing is a navigation layer, not a
   peer type. uv and Astro run both axes at once.
6. **Rollout for every rule: error on changed files from the first commit,
   warn on the whole tree until the backfill lands.** 181 of 181 corpus pages
   fail the declaration rows today. Structural and drift checks go red,
   readability and tell counts warn with a ratchet.
7. **The glob is config-anchored, not `**/*.md`.** Measured: a naive
   markdown walk loaded 420 Lighthouse reports and 257 stale-worktree files.
   `astro.config.*` and `docs/conf.py` are absent from the glob because no
   fixture verified those carriers.

## What the program found, and what it overturned

- The frame's fleet table was wrong in method: it counted whole-repo markdown.
  Real surface: 9 docs sites (7 MkDocs Material, 1 VitePress, 1 mdBook), 23
  surfaces, 248 pages. ocx-catalog and grimoire-indexer are MkDocs, not
  VitePress and Astro. `ocx-save` is a stale clone of ocx.
- Docs observability is absent, not weak: 0 of 9 sites log zero-result
  searches, run analytics or carry a feedback widget. 0 of 248 pages are
  tutorials. ~92 existing prose rules carry 2 runnable checks.
- llms.txt: 97 percent of published files receive zero requests. The
  Markdown twin is what agents fetch. An "if you are an agent" label changed
  nothing in a controlled test; an unambiguous instruction did.
- Every wave-1 grep was measured against the corpus before shipping.
  `DOC-PLAIN-07`'s identifier pattern fired on 184 of 186 pages and was
  replaced; `DOC-TYPE-05`'s comparison arm was 6 for 6 false positives.

## Validator changes

`check-artifacts.py` gained three fixes this program forced: `fixtures/`
under a support directory is exempt from routing and link checks (planted
violations are the point), a markdown link inside a fenced block is an
example and not checked, and `\|` inside a `grep -E` pattern is flagged
exactly like the `rg` case. The last one caught a pre-existing defect in
`css-theming/rules.md` (`CSS-TOK-01`'s census command), fixed in place. That
fix ships only when `css-theming`'s version is bumped, since an unbumped entry
is skipped by `grim publish`. `ruff.toml` now excludes `.agents/research/`:
the corpus quotes measurement scripts inline and ruff would reformat the
evidence. The `build` step of `task verify` needs `grim` on PATH, which the
task runner did not have in the authoring session, so the dry-run was run
directly and shows exactly the four new packages.

## Owner decisions still open

Recorded in `docs-frame.md` and in each consolidation's Open questions:
whether the published rule supersedes the two hand-forked `docs-style.md`
files in ocx and grimoire; whether default-class documentation drift blocks
a merge fleet-wide (`DOC-OBS-04` ships non-blocking with a tracked issue);
whether Vale becomes a fleet dependency (the gate works without it); where
the zero-result beacon's sink lives (8 of 9 sites are on GitHub Pages, which
exposes no logs); whether to retrofit declarations across 248 pages now
(325 to 358 added lines, 95 mechanical); and whether `grimoire-lore` adds a
`LICENSE` file, the one README gap the program found in its own repository.

## Known-open, deliberately

`wave2-critique.md` lists four load-bearing open questions. The one
research-shaped question is whether MkDocs Material, VitePress and mdBook can
emit a per-page Markdown twin without a custom plugin, which would move
`DOC-AGENT-01` from SHOULD to MUST. Page-level accessibility (alt text,
contrast, keyboard order) is declared out of scope in every depth file rather
than covered badly. No real tutorial or runbook page has ever been run
through its contract.

---

# TypeScript quality artifact program

Written 2026-08-29, for a cold resume.

## What shipped

| Artifact | Path | Notes |
|---|---|---|
| `typescript-quality` (rule) | `rules/typescript-quality.md` + `rules/typescript-quality/` | 142-line index, globs `**/*.{ts,tsx,mts,cts}`. 12 depth files, 166 rules total (116 MUST / 48 SHOULD / 2 CONSIDER) plus 3 index-owned `TS-CORE` rules |
| `typescript-packaging` (rule) | `rules/typescript-packaging.md` | 158 lines. Globs `**/package.json`, `**/tsconfig*.json`, `**/eslint.config.*`, `**/biome.json{,c}` |
| `typescript-essentials` (bundle) | `bundles/typescript-essentials.toml` | Members carry **no tag** |
| Description companions | `docs/typescript-{quality,packaging,essentials}.md` | `assets/lore-typescript.svg` already existed |

Wired in `publish.toml`. `grim publish --dry-run` shows exactly the three new
packages and skips every other. **Merging to `main` publishes.**

Research corpus: `.agents/research/typescript-*` and `ts-*`, ~50 files.
`typescript-topic-map.md` is the index — 212 deduplicated candidates, the
resolved conflicts, and the deferred backlog.

## Decisions that are load-bearing

1. **Rule IDs are `TS-<FAMILY>-nn`**, following the Python `PY-` decision — a
   bare prefix belongs to exactly one rule set forever. Families: `CORE`,
   `CFG`, `GATE`, `MOD`, `PKG`, `TYP`, `ASYNC`, `RES`, `ERR`, `CLI`, `HOST`,
   `WEB`, `SEC`, `TEST`, `OBS`, `TOOL`.
2. **`typescript-packaging` globs `**/tsconfig*.json`, never `**/tsconfig.json`.**
   Measured: 15 tsconfigs in the fleet, 9 named `tsconfig.json` and 6 not. The
   narrow form misses 40%, including the mixed-resolution exemplar and the one
   place the Biome repo states a strictness posture. It also globs the lint
   configs, because the fleet's largest finding *is* a lint-config defect and a
   rule scoped to `**/*.ts` never loads while that file is open.
3. **`TS-ERR-15` is retired and must not be reused.** The validator was taught
   to recognise a retirement notice rather than report it as a dead citation.
4. **The gate validates per language.** `taskfile.yml`'s `artifacts` task now
   runs twice: Rust and Python against `../ocx`, TypeScript against the fleet
   root `..`. One consumer cannot serve a polyglot catalog — `.tsx` lives only
   in the React app, `.mts` only in a VitePress site, `biome.jsonc` only in the
   one Biome repo.

## The era, and the trap in it

TypeScript **7.0.2** is current (`npm view typescript dist-tags`, 2026-08-29);
6.0 shipped 2026-03-23 and 7.0 on 2026-07-08, the Go rewrite.

**Do not bump any repo running typescript-eslint past `typescript@^6.0.x`.**
`@typescript-eslint/eslint-plugin@8.68.0` declares
`peerDependencies.typescript: >=4.8.4 <6.1.0` — a hard install failure on 7.0
*and* on 6.1. TS 7.0 shipped without a stable programmatic API; 7.1 is expected
to carry a new one, with no announced date. `tsgolint` (oxc) sidesteps this by
driving `typescript-go` directly and is stable at 59-of-61 rule parity, but it
*requires* TS 7 — so it is the destination, adopted per repo and gated on that
repo's own TS 7 migration, never fleet-wide on a date.

oxlint stays watch-only. Its 12–18× speed claims are measured on
vscode-scale repositories; the one report covering small codebases records
**regressions of −11% to −49%**, and every repo in this fleet is 10–193 files.

## What the program found, and what it overturned

Grounding contradicted the frame in five places, and later waves overturned
the grounding twice — the corrections are appended to `typescript-frame.md`
and recorded in each consolidation's Verdict.

- **`any` is not the escape hatch.** 4 occurrences fleet-wide, 0 in seven of
  eight repos, and `@ts-ignore`/`@ts-nocheck` are zero across ~130k LOC. The
  real one is `as unknown as T` — 164, with 84 in the two Mocha/Electron
  extensions and 79 in a single 6,899-line file faking `vscode.*` objects.
- **Type-aware linting runs in 1 repo of 9.** Everything else runs
  `tseslint.configs.recommended`, which structurally cannot see a floating
  promise. Two repos' own rule files *claim* type-aware rules their configs do
  not wire — documents are intent, never practice.
- **The published packages are the laxest configs**, not the strictest, and
  neither is a library: both entry points are `export {}` stubs.
- **The extension host does not crash on an unhandled rejection.** An audit
  asserted it did; VS Code's `extensionHostProcess.ts` installs its own
  handlers before extension code runs. Overturned on a source read.
- **`vscode-ocx`'s `Node16` setting is inert, not violated.** The `.js`-extension
  rule is triggered by module *format*, and that package declares no
  `"type": "module"` — so 11 extensionless imports type-check clean today and
  all 11 turn red on one unrelated `"type"` edit.
- Three dead gates, all the same silent-pass class: a `lint` script pointing at
  a config that does not exist; a lint config whose rules all run at `warn`
  with no `--max-warnings 0`; and a `bunfig.toml` using singular coverage
  threshold keys against Bun's documented plurals.

## Two live bugs found in passing

Neither is fixed — both are the owner's call:

- `ocx-catalog/src/theme/utils/version.ts:167,188,196` — `compareVersions()`
  documents itself as mirroring Rust's `Ord` but uses `localeCompare()`, so the
  published catalog can pick the wrong "latest".
- `setup-ocx/src/setup.ts:19` — the overridable `github-token` input never
  reaches `core.setSecret()` before it is used as a Bearer credential. Safe only
  because the *default* token is auto-masked; a custom PAT would not be.

## Validator changes

`check-artifacts.py` gained two fixes, both false positives this program hit:
`rg --files` takes no pattern, so its first bare argument is a path and was
being discarded as one; and a line that explicitly retires a rule ID is a
definition-of-absence, not a dead citation.

## Known-open, deliberately

`typescript-topic-map.md`'s Deferred section is the wave-4 backlog. The
tsconfig strictness floor and the era question sit there marked *ready to
author* — wave 1 researched both to authoring depth and no dive was needed.
Each consolidation's `## Open questions` separates what needs more research
from what needs a decision only the owner can make.

---
# Python quality artifact program

Written 2026-08-23, for a cold resume.

## What shipped

| Artifact | Path | Notes |
|---|---|---|
| `python-quality` (rule) | `rules/python-quality.md` + `rules/python-quality/` | 123-line index, globs `**/*.py`. 12 depth files, 100 depth rules + 8 index-owned `PY-CORE` rules |
| `python-packaging` (rule) | `rules/python-packaging.md` | 78 lines, 10 rules. Globs `**/pyproject.toml` and `**/uv.lock` |
| `python-essentials` (bundle) | `bundles/python-essentials.toml` | Members carry **no tag** |
| Description companions | `docs/python-{quality,packaging,essentials}.md` | `assets/lore-python.svg` already existed |

Wired in `publish.toml`. `ocx run task -- task verify` is green including
`grim publish --dry-run`. **Merging to `main` publishes.**

Research corpus: `.agents/research/python-*`, ~35 files.
`python-topic-map.md` is the index — 193 rows, the deferred backlog, and the
"explicitly not a defect" list.

## Decisions that are load-bearing

1. **Python rule IDs are `PY-<FAMILY>-nn`.** Rust took 31 bare prefixes
   (`ERR`, `TEST`, `ASYNC`, `SEC`…) and a prefix belongs to exactly one rule
   set. `PY-` keeps review output unambiguous forever. Families: `CORE`,
   `TEST`, `TYP`, `PROC`, `CLI`, `ASYNC`, `HTTP`, `SEC`, `OBS`, `SURF`,
   `MODEL`, `SOLO`, `GATE`, `PKG`.
2. **One package, twelve depth files.** `testing` and `security` both glob
   `**/*.py`, so splitting them into sibling rules rebuilds the monolith
   with extra steps. Same reasoning as the Rust `cli-contract` decision.
3. **`python-packaging` globs only `**/pyproject.toml` and `**/uv.lock`** —
   the two names a build system guarantees. `ruff.toml` and
   `pyrightconfig.json` were rejected as globs: both are dead against ocx.
4. **The index's Non-Negotiables contain only MUST-severity rules.** Three
   SHOULD rules were removed from that table rather than promoted — the
   depth file is the definition site and its severity wins.

## Python is four shapes, not one

Measured, and it is the fact the whole rule set turns on: a subprocess-driven
pytest acceptance harness (~130k LOC, `ocx/test` + `grimoire/test`, replicated
byte-identically in three more repos); `ocx-sdk-python` (typed library,
zero runtime dependencies, pyright strict, 100% real coverage);
`index/bot` (automation, pyright full strict, pure httpx, **zero** asyncio and
**zero** `logging` imports); and stdlib-only single-file tools. A rule that
serves one serves none of the others unless it says which it binds.

## What the program found in this repository, and fixed

- **`check-artifacts.py --self-test` was defeated by `python -O`**, which
  strips every bare `assert`. A planted regression printed `self-test: ok`,
  exit 0. Now uses `expect()` raising `SystemExit`, matching `make-mark.py`.
  This was the publishing gate, and it could not go red.
- **`BrokenPipeError`**: 82KB through `head -1` produced a traceback and exit
  120. Python installs `SIG_IGN` for SIGPIPE so the failure surfaces at the
  interpreter's shutdown flush, past any handler; the fix is restoring
  `SIG_DFL`, with the `BrokenPipeError` guard kept for Windows.
- **Two new validator detectors**, from mechanisms the corpus sweep found by
  running commands rather than reading them: `rg -L` (which is `--follow`,
  not `--files-without-match`, so the check prints the compliant files) and
  unquoted `**` (bash without `globstar` reads it as one level).
- **A pre-existing scope bug**: `check_runnable_spans` only ran on lines
  starting with `|`, so any verification written in prose was unchecked for
  every mechanism. Now checked, with the escaped-pipe check kept table-only
  because a pipe in prose is a real pipe.
- **The escaped-pipe check was too broad**: GNU grep's BRE treats `\|` as real
  alternation, so only `rg` is bitten. Narrowed; corpus findings 86 → 51.
- `python.yml` pinned `actions/setup-python` to an unreviewed README commit
  labelled `# v6.0.0`; the real v6.0.0 SHA is `e797f83bcb11…`.
- `python.yml` claimed the scripts declare a floor in PEP 723 headers. Zero
  exist; CI pins 3.11 because `ruff.toml` targets `py311`.

## Verification discipline — six mechanisms, not four

The Rust program documented four ways a check silently passes forever. The
Python program found three more and retired one:

| Mechanism | Status |
|---|---|
| Dead glob; `\|` table escaping; `-e A -e B` union; `rg` with no path operand | Rust's four, all still real |
| `rg -L` mistaken for `--files-without-match` | New — inverts the check |
| Unquoted `**` truncated by bash without `globstar` | New — measured 95% blindness in one case |
| `--pcre2` `\s*` backtracking defeating its own negative lookahead | New — not automated, needs regex analysis |
| A bare-`assert` self-test under `python -O` | New — applies to any tool carrying its own proof |
| `grep '\|'` | **Retired as a false positive** — GNU BRE alternation works |

A **placeholder in a path operand** (`<file>`, `<dir>`) is acceptable: it
fails loudly with exit 2. A placeholder inside a *search pattern* is the
silent trap, and the validator catches that one.

## Live defects in the audited codebases — not fixed here

This repo ships config, not code. All measured, all cited in
`.agents/research/python-audit/fleet-fix-list.md` (19 rows).

- `ocx/test` and `grimoire/test` declare `requires-python = ">=3.10"` and
  **fail collection on it** — 4 and 6 errors. Real floors 3.12 and 3.11.
  Byte-identical trees in ocx-sion, ocx-soraka, ocx-evelynn multiply it.
- 11 undefined-name forward references, caught by `ruff check --select F821`
  with zero configuration. Neither harness runs ruff at all.
- A missing `assert` keyword at `ocx/test/.../test_update.py:389` — a bare
  tuple expression silently discarding its message.
- `grimoire/test/tests/test_fix_locking.py:102` — live pipe deadlock, N
  concurrent `Popen(PIPE)` reaped by a bare `wait()`, 64KiB threshold measured.
- `index/bot`'s `github_api.py::_paginate` follows `Link: rel=next` on the
  authenticated client with **no host check** (CVE-2018-20060 shape); the
  sibling `registry_v2.py` has the guard and tests it.
- `${{ }}` interpolated into `run:` in four workflows across ocx-save, ocx and
  grimoire — script-injection shape, zizmor auto-fixes it.
- `ocx-mirror-sdk`: reachable `idna` vulnerability via httpx.
- `ocx-mirror-sdk/.claude/rules/{quality-errors,quality-enums}.md` ship with
  no `paths:` frontmatter, so 192 lines load always-on there.

## The adopted rule this set supersedes

`quality-python.md` (114 lines) exists as **four byte-identical copies** in
ocx, grimoire, ocx-mirror-sdk and ocx-sdk-python; `quality-tests.md` (303
lines) in two. `.agents/research/python-audit/existing-rules-ledger.md`
grades all 94 of their normative claims. Its Block tier leads with a **false**
rule — that `except Exception` swallows `KeyboardInterrupt` and `SystemExit`
(both inherit `BaseException`) — cited to `E722`, which does not check the
claim the prose makes. Nobody owns the four copies; removing them is four PRs.

## Open, deliberately

- Five of the map's twelve owner questions are unanswered; they are listed at
  the end of `python-topic-map.md`.
- The four AST checker scripts `exemplar-patterns.md` depends on lived in a
  worker scratchpad and are gone. Either rebuild them or drop those rules.
- `scout-agent-legibility.md` is graded C (40% unsound verification cells).
  Nothing sourced only to it exceeds CONSIDER. Re-check before promoting.

---

# Handoff — Rust quality artifact program

Written 2026-08-14, last revised 2026-08-16, for a cold resume.

## What shipped

Two publishable rules plus a bundle. `grim publish --dry-run` passes.
**No skills** — see "Rules only, no skills" below.

| Artifact | Path | Notes |
|---|---|---|
| `rust-quality` (rule) | `rules/rust-quality.md` + `rules/rust-quality/` | Index, globs `**/*.rs`. 18 depth files |
| `rust-cargo` (rule) | `rules/rust-cargo.md` + `rules/rust-cargo/` | Globs manifests and tool configs. One depth file, `crates-of-record.md` |
| `rust-essentials` (bundle) | `bundles/rust-essentials.toml` | Members carry **no tag** — `latest` counts as a pin |

Wired in `publish.toml`. Merging to `main` runs `grim publish --announce`, so
**merging is publishing**.

Local reusable skill: `.claude/skills/research-lang/` — the whole method,
language-agnostic, plus `scripts/check-artifacts.py`.

Research corpus: `.agents/research/`, 111 files. `README.md` there is the index.

## Three decisions the owner made, which are load-bearing

1. **A narrow glob is a guess about filenames.** `rust-cli-contract` was a
   separate artifact globbing `**/main.rs`, `**/exit_code.rs`, `**/cli/**/*.rs`.
   Measured: grimoire has 20+ files referencing `ExitCode`; the glob matched 3.
   It is now `rules/rust-quality/cli-contract.md`, routed to from the index by
   subject. Generalised in `references/rule-distillation.md`. Do not re-split it.
2. **Bundles never pin.** Members are bare `"./name"`. Not a digest, not a
   version, not `latest`. Never release with `--pin`.
3. **A glob matches a language, never a filename convention.** `rust-cargo`
   used to glob `.github/workflows/*.yml`. A workflow filename says nothing
   about its language: ocx has 18 workflows and 5 are not Rust at all, and
   this catalog's only workflow is `python.yml`. It paid the whole 190-line
   file to deliver its 17-line CI section, often onto a website deploy. The
   glob is gone; CI is routed to by subject from `rust-quality.md`.
   Same lesson as (1) seen from the other side — that glob was too narrow
   and silently missed files, this one was too wide and silently loaded
   noise. Glob only what the build system *guarantees* (`**/Cargo.toml`);
   route everything else by subject.

## Rules only, no skills

`rust-review` and `rust-restructure` were built as skills and **deleted on
purpose** on 2026-08-16. Both wrapped a generic orchestration harness —
scope, refute, severity, report, loop bounds for one; work-package sizing,
worktree hygiene, topological merge for the other — around a small Rust
core. That harness is `hex`'s (`ghcr.io/michael-herwig/arcana/hex`), which
owns it better and actually executes it. Two playbooks for one phase is a
drift generator.

The Rust core survived as depth files, which is the better kind for a
second reason: **hex workers read rules, not skills.** hex's universal
worker protocol rule 1 is "read the project's relevant rules first",
located via `hex.md › Pointers`; there is exactly one pluggable-skill slot
(`adversary`, cross-model) and no discovery of installed skills at all. A
skill would have been unreachable from the swarm that needs it.

| Was | Now |
|---|---|
| `rust-review/references/dimensions.md` + scope table + evidence bar | `rules/rust-quality/reviewing-a-diff.md` |
| `rust-review/references/diff-integrity.md` | `rules/rust-quality/diff-integrity.md` |
| `rust-restructure/references/transforms.md` + diagnostics + move rules | `rules/rust-quality/restructuring.md` |
| `rust-restructure/references/parity-harness.md` | Handed to arcana — `arcana/.agents/research/parity-oracle-gate.md` |

The parity oracle is the one thing hex genuinely lacks and it is
language-agnostic, so it went to arcana as a discussion note rather than
into a Rust catalog. Nothing in this repo depends on that landing.

## ID namespaces

Published rules and the research corpus **deliberately share prefixes** —
research `ARCH-20` is published `ARCH-20`, and that traceability from source
to shipped rule is the point. Do not "fix" it.

`ECO` was the one exception and is now resolved. Published
`crates-of-record.md` had invented its own `ECO-01…08` under a prefix
`rust-ecosystem.md` already used for 81 different rules — two rule sets, one
prefix, 7 of 8 numbers meaning different things. The published eight are now
**`DEP-01…08`** (dependency selection and hygiene, which is what they
actually govern). `ECO-nn` now always means the research file; `DEP-nn`
always means the published rule.

Measured before acting, so a future session need not re-audit: every other
family agrees or the apparent conflict is an artifact of table shape.
`SEC-25/31/32`, `REL-04`, `TOOL-05` are rows in `rust-ecosystem.md`'s **audit
table**, where column 2 is the codebase's current state, not a competing rule
definition. `ARCH-20`, `ERR-04`, `PLAT-23`, `SEC-37` are the same rule worded
differently on each side. Sixteen candidates, one real collision.

The rule going forward: a prefix belongs to exactly one rule set. When a
published file needs rules that are not a distillation of the research file's
same-prefix set, it takes a new prefix rather than restarting the numbering.

## The defect class this program kept finding

A verification command that **cannot go red** is worse than no verification:
it launders an unchecked change as a checked one. Four instances, each
arrived at differently:

- A rule scoped by a glob that matches nothing — silent non-load.
- `rg 'a\|b'` in a Markdown table cell. The `\|` is table escaping; rendered
  it is alternation, but an agent reads the **raw file** and pastes a
  literal. 205 spans across 18 files.
- `rg -e A -e B` is a **union**, so a cell whose prose says "both constants"
  reads as a pass when one occurs zero times. PKG-05 was certifying a missing
  decompression limit as present.
- **`rg` with no path operand searches stdin, not the tree.** Whenever stdin
  is not a TTY it reads the pipe, finds nothing, exits 1, prints nothing — a
  clean read. A human testing in a terminal gets a recursive search and
  concludes the command works; an agent, whose shell always has stdin on a
  pipe, gets silence. An earlier blanket instruction to "drop the path
  argument" created this in 297 spans. All 320 `rg` spans now carry an
  explicit `.`, and the validator rejects a path-less one.

`check-artifacts.py` detects all four, plus `-tn`, unsubstituted
`<template>` inside a search pattern, `$(...)`, shell globs in bare path
operands, dangling rule-ID citations, duplicate IDs, empty verification
cells, budgets, and description hygiene. It caught the escaped-pipe bug in
`diff-integrity.md` during the 2026-08-16 fold — the gate works.

Also fixed: three cells line-anchored against call chains rustfmt breaks
across lines (SEC-17, PLAT-28, EXIT-05 → `-nU` with `\s*`), and API-01,
which verified compliance instead of naming the violation
(`--files-without-match`; the crate roots it lists **are** the finding).
That is the general lesson: **write the check so its output is the
violation, not the compliance.**

### Verification cells: known-imperfect, and that is the 0.1.0

Swept twice, much better than they were, not all verified. An adversarial
pass found roughly 45 noise cells whose instruction requires reading
100–1000 hits, 8 that exit non-zero on one of the two repos, and ~51 that
never state whether empty output is a pass or the finding. The prose and the
rationale are the strong part of this corpus; the greps are the weak part.
Treat a cell as a starting point for a reading agent, never as a gate.

Scope discipline when editing one:

- **Module-scoped** — keep the wide command, add a plain-words clause telling
  the reader to discard hits outside the module under change. No placeholders.
- **Diff-scoped** — steady-state counts that are never zero. Copy IDIOM-04's
  clause verbatim: *restrict to added lines on a diff*.
- **Absence assertions** — zero is expected, union semantics are correct,
  leave alone.

Corpus-wide: `--glob '!external/**'` on `--type rust` commands, an explicit
path operand always, `--glob '**/Cargo.toml'` rather than `crates/*/Cargo.toml`
(the shell expands the latter and aborts on a single-crate repo), no `$(...)`,
and conjunctions split into separate commands because `-e A -e B` is a union.

## Decided against: a Python linter for Rust

A `rules/rust-quality/check.py` was built, worked, and was **deleted on
purpose**. It carried 36 regex checks with inline self-test samples, emitted
JSON findings, and caught a real unbounded registry read in grimoire that the
table-cell greps missed. It is still the wrong artifact, for the owner's
reason: it is a new linting tool. The Rust ecosystem already has clippy,
cargo-deny, cargo-audit and cargo-shear, and this catalog's own IDIOM-12 says
do not own non-domain code.

Deleted with it: `run-cells.py` and the `fixtures/rust-violations/` tree.
**What replaced it: nothing, deliberately.** An agent reads the rules and the
code. If a future session is tempted again, the argument that settled it is
that the linter's real value was auditing *our rules*, not reviewing Rust —
and that job is done.

`check-artifacts.py` survives because it validates the artifacts this
repository publishes, not the language they describe. `grim build` covers
only the frontmatter schema. It never ships to consumers — it lives under
`.claude/`.

## The local dev loop

Tools are pinned in `ocx.toml` and resolved through `ocx run`, so CI and a
contributor run identical versions:

```sh
ocx run task -- task            # list tasks
ocx run task -- task verify     # lint, format, test, self-test, artifacts, build
```

The artifact gate needs `--root` pointing at a **consuming** repo — this
catalog has no Rust source, so glob liveness is meaningless against `.`:

```sh
python3 .claude/skills/research-lang/scripts/check-artifacts.py \
  --root /home/mherwig/dev/ocx rules .claude/skills/research-lang
```

`.github/workflows/python.yml` runs the same `verify`. It is hand-written and
that is safe: `verify-ci` diffs only the four files `grim-indexer` generates
from `index.config.json`, confirmed with a probe file.

## Open tasks

- **#10** Done 2026-08-16, see "ID namespaces". The follow-up that remains:
  apply the ranked promotion list at the end of `rust-ecosystem.md`.
- **Deferred, not rejected**: DOC-21 (doctest init helper) —
  `docs-and-tracing.md` sits at 168 lines and nothing there was worth
  displacing for a CONSIDER. It keeps its ID; promote it next revision.
- **ocx migration** has not started: no `grimoire.toml`, no hex skills there
  yet. 147 references to `quality-rust*.md` under `.claude/` will need
  renaming — `rules.md` (26), `worker-reviewer` (10), `worker-builder` (8),
  `worker-tester` (6), rest in artifacts/ADRs (historical, leave). ocx's link
  linter will go red, which is the right gate.

## Gotchas that will waste an hour otherwise

- **`rg` is shadowed** by a Claude Code shell-snapshot function, and the RTK
  hook rewrites `grep`/`rg` invocations. Test real behaviour through
  `ocx run ripgrep -- rg …` rather than a bare `rg`.
- **Shell tool output is post-processed.** `ls`/`grep` results reaching the
  agent are reformatted, so verify a file's existence with `test -f` or
  `stat`, never by eyeballing an `ls`.
- **Repo shapes differ.** ocx is a workspace (`crates/*/`); grimoire is a
  single crate (`src/`). A command assuming `crates/` aborts on grimoire
  before it runs. Every cell must work on both.
- **Web research runs on Sonnet**, consolidation and anything that becomes an
  enforced rule on Opus. Every spawn sets `model` explicitly and carries a
  `Model rationale:` line.

## Live defects found in the audited codebases

Not fixed here — this repo ships config, not code. Worth filing.

- `grimoire/src/catalog/index_source.rs:173-176` — unbounded `.bytes().await`
  on a **remote catalog index**, no size cap before deserialization (SEC-17).
- Neither repo declares `[profile.release]` — grimoire has only
  `[profile.dist]`, ocx's root manifest has no profile section at all. So
  `overflow-checks` is unset in the binary users actually run (SEC-30).
- `missing_debug_implementations` is declared in neither root manifest (API-01).
- `grimoire/src/tui/app.rs:1026-1039` — `map_key` matches `key.code` and
  discards `key.modifiers`, so **Ctrl-C does not quit the TUI**; it clears marks.
- `ocx/crates/ocx_cli/Cargo.toml:21-24,38-39` — `__testing` forwards across a
  `[dependencies]` edge, so `--all-features` ships the test escape hatch.
- `ocx_schema/src/main.rs:15` — raw `process::exit(1)` for a usage error;
  the pinned contract says 64.
- `grimoire/src/main.rs:191` — writes `{err:#}` unsanitized (CWE-150) where
  ocx neutralizes the same terminal-injection surface.
- ocx leaks credential-helper stdout/stderr through `{err:#}` (CWE-532); grim
  already fixed that path.
- Exit code 82 `DirtyRcBlock` is shipped and tested but documented nowhere.
- ocx has no `StdoutPipeClosed` handling, so `ocx … | head` can panic.
