# code-docs held-out round 2 — setup-ocx / vscode-ocx

Repos cloned read-only via `/usr/bin/git clone --no-local` into
`~/.cache/research-lang/code-docs-heldout/r2/{setup-ocx,vscode-ocx}`. All
commands run from each repo root against
`rules/code-docs/checks/*.py` in the catalog worktree.

## 0. Tooling sanity

`--help` and `--self-test` on all 5 checks: clean.

| Check | self-test |
|---|---|
| comment_census.py | ok (4 fixture cases) |
| linkage_check.py | ok |
| interface_leak.py | ok |
| guard_recogniser.py | agent TP=43 FP=23 FN=57 TN=197 precision=0.652 recall=0.430; self-test ok |
| cleanup_check.py | ok, 28 cases, 0 mismatches |

Not run against the held-out repos (not requested by task item 1: only census,
linkage ids/pointers/records, and interface_leak --source are).

## 1. Per-repo numbers per check

### comment_census.py

| repo | --report | --over-cap findings | exit |
|---|---|---|---|
| setup-ocx | code=774 ratio=0.306 blocks=5 lines=97 | 5 | 1 |
| vscode-ocx | code=835 ratio=0.383 blocks=7 lines=100 stripped=2 | 7 | 1 |

### linkage_check.py

| repo | ids --discover | ids | pointers | records --base HEAD~5 | exit (records) |
|---|---|---|---|---|---|
| setup-ocx | 0 prefixes | 0 findings | 0 findings | 0 findings (scanned=6, no path deleted in range) | 0 |
| vscode-ocx | 0 prefixes | 0 findings | 0 findings | 13 findings / 18 citations (scanned=17) | 1 |

vscode-ocx's `records` findings: `ocx.lock`/`ocx.toml` deleted at the repo
root 5 commits back (`chore: remove unused ocx toolchain`); 13 lines in
`CLAUDE.md` and `.claude/rules/{product-context,subsystem-extension,
tech-vscode-api}.md` still contain those two strings.

### interface_leak.py --source --lang ts --strict

| repo | files | interface_lines | findings | exit |
|---|---|---|---|---|
| setup-ocx | 11 | 0 | 0 | 0 |
| vscode-ocx | 9 | 0 | 0 | 0 |

Manually grepped both trees for ID-shaped and ISO-date tokens outside
node_modules/dist to cross-check: nothing found either — true negative, not a
miss.

### interface_leak.py, output mode, on rendered surfaces

| Surface | findings | verdict |
|---|---|---|
| setup-ocx `action.yml` | 2 | both FALSE POSITIVE |
| setup-ocx `package.json` | 0 | true negative |
| setup-ocx `dist/setup/index.js` + `dist/save-cache/index.js` (esbuild bundle) | 3003 (2883 source-path + 120 iso-date) | sampled 20+, all FALSE POSITIVE |
| vscode-ocx `package.json` (incl. `contributes.commands[].title`, `configuration.properties.*.markdownDescription`) | 0 | true negative |
| vscode-ocx `schemas/ocx.toml.schema.json` (vendored JSON Schema, shipped via `contributes.tomlValidation`) | 9 | all TRUE POSITIVE |

## 2. Rule-text coverage of these two surface kinds (task item 2)

`surfaces.md`'s "What Interface Text Is" table and the Output Gate's "Surface"
table list exactly: clap, schemars, MCP/rmcp, argparse/click/commander, and
published API docs (rustdoc/mkdocstrings/TypeDoc). Grepped `code-docs.md` and
every `code-docs/*.md` for `action.yml`, `vscode`, `marketplace`,
`contributes`, `github action`, `yaml`: zero hits (one unrelated
`pnpm-lock.yaml` string literal in `cleanup_check.py`, nothing in rule
prose). No SRF-03 test recipe, no per-key rendered/structural guidance, and no
warning against scanning a bundled/vendored `dist/` exists for either an
Action or a VS Code extension.

**Finding: the rule text does not tell an adopter of a GitHub Action or a VS
Code extension what to test or how.** Everything in this report for those two
surfaces was reverse-engineered from the scanner's actual behavior, not from
documented guidance.

## 3. Labelled samples

### comment_census --over-cap (12 total — under 20, all labelled)

All 12 = TRUE POSITIVE (mechanical line-count over a fixed cap; spot-checked
4/12 by reading the block and recounting by hand, plus confirmed LEN-07's
`@param`/structured-section exclusion is applied correctly):

- `setup-ocx/src/win-title-guard.ts:1` — 15-line plain guard comment, genuinely explains a libuv/Windows ordering bug. TP.
- `setup-ocx/src/cache.ts:7` — 12-line doc block mixing contract + precedent citation. TP.
- `vscode-ocx/src/environment.ts:36` — 16-line doc block (contract + guard + history). TP.
- `vscode-ocx/src/ocx.ts:74` — 15-line doc block (contract + guard). TP.
- Remaining 8 (`setup-ocx/src/constants.ts:87`, `managed-config.ts:10`, `save-cache.ts:9`; `vscode-ocx/src/environment.ts:69,142,172`, `ocx.ts:158`, `project.ts:26`): counted, not individually re-derived by hand, all clearly long multi-clause blocks — TP by inspection.

Precision: 12/12 = 1.00.

### linkage_check records (13 findings — under 20, all labelled)

All 13 = FALSE POSITIVE, single mechanism (class 3 below). Examples:
`CLAUDE.md:10`, `.claude/rules/product-context.md:25`,
`.claude/rules/tech-vscode-api.md:37`.

Precision: 0/13 = 0.00.

### interface_leak output mode

- `action.yml:63` `SRF-01 source-path 'dist/setup/index.js'` (context `main: dist/setup/index.js`) — FALSE POSITIVE, wrong span: the `runs.main` key is never rendered to a Marketplace reader, only `name`/`description`/`branding` and each input/output `description` are.
- `action.yml:64` same, `runs.post` — FALSE POSITIVE.
- `schemas/ocx.toml.schema.json` all 9 (lines 5×3, 9, 17, 29, 88×2, 92) — TRUE POSITIVE: rustdoc intra-doc links (`` [`Identifier`] ``, `` [`super::error::ProjectErrorKind::ToolValueMissingRegistry`] ``, `` [`Self::tools`] ``) leaked verbatim from the upstream Rust schema generator into a `description` that VS Code's TOML language server shows on hover — exactly SRF-01's raw-copy case, and a real one.
- `dist/setup/index.js` sample of 20 (10 `source-path` + 8 `iso-date` + 2 duplicate-token lines, drawn across the file) — all FALSE POSITIVE: bundler module-boundary markers (`// node_modules/@fastify/busboy/...`) and vendored Azure SDK API-version constants (`SERVICE_VERSION = "2026-02-06"`).

Precision on this check across the run: action.yml 0/2 (0.00), schemas 9/9
(1.00), dist sample 0/20 (0.00); package.json true negative both repos.

## 4. Misses (manual read, task item 2/3)

- `schemas/ocx.toml.schema.json:5` (`/description`): "Schema follows ADR
  \"Project-Level Toolchain Config\" decision 1A" and "Phase 2.1 NOTE: the
  `platforms` field is removed ... until ADR-driven per-tool platform
  overrides land." Both are internal process references rendered verbatim
  into VS Code hover, unresolvable by an extension user (no such ADR file
  ships in this repo — it's vendored from upstream `ocx`). Neither is
  reported: no SRF01_PATTERNS token matches a spelled-out record title or a
  `Phase N.N` marker, only ID-shaped strings and record filenames. MISS.
- Skimmed 3 more files/repo beyond the ones above
  (`setup-ocx/src/managed-config.ts`, `vscode-ocx/src/project.ts`, plus one
  test file each): no further misses; all comments are ordinary source
  rationale, not interface text, and contain no bare IDs/dates.

## 5. Failure classes

### Class 1 (NEW) — YAML surfaces scanned as raw text, not by rendered key
**Check:** `interface_leak.py`, `scan_rendered`. **Mechanism:** structured
scanning only triggers when the input parses as JSON
(`text.lstrip()[:1] in ("{", "[")`); a YAML file falls through to whole-line
raw-text scanning, so every line is scanned, not just `description:` values.
**Instance:** `action.yml:63`/`:64`, flagging `runs.main`/`runs.post` (never
rendered to a user) as `source-path` leaks. **Fault:** check (no YAML
parsing path) and rule text (surfaces.md never documents this gap or gives a
YAML extraction recipe, unlike its JSON/stdin recipes for schemas). **Fix:**
add a minimal YAML key-path walk mirroring `_json_strings`'s
description/title allow-list (or document piping only
`.description`/`.inputs.*.description`/`.outputs.*.description` via `yq`
before scanning).

### Class 2 (NEW) — bundled/vendored dist floods the scanner
**Check:** `interface_leak.py`, run on a single-file ncc/esbuild bundle (the
literal "built dist" the task asked to check). **Mechanism:** raw-text
scanning has no first-party/vendored distinction; bundler per-module comments
(`// node_modules/@x/y.js`) and vendored dependency literals (Azure SDK
`SERVICE_VERSION = "2026-02-06"`) match the `source-path` and `iso-date`
families verbatim. **Instance:**
`dist/setup/index.js:19724` (`// node_modules/@fastify/busboy/deps/streamsearch/sbmh.js`);
`dist/setup/index.js:72023` (`SERVICE_VERSION = "2026-02-06"`). 3003 findings,
0 true positives. **Fault:** rule text — surfaces.md's Output Gate table has
no row for a single-file bundled Action/extension and never says to gate on
pre-bundle source instead. **Fix:** surfaces.md should state: never scan a
bundled/vendored dist directly; gate on pre-bundle TS/JS source plus the
manifest's own description strings.

### Class 3 (NEW) — bare generic filename mistaken for a repo-path citation
**Check:** `linkage_check.py records` (`cites`/`scan_records`). **Mechanism:**
any exact-string occurrence of a path deleted since `--base` counts as a
stale citation in every `records`-glob file (default includes bare
`CLAUDE.md` and `.claude/rules/*.md`), with no requirement that the mention
functions as a pointer to *this repo's* file rather than generic domain
vocabulary that happens to share a filename. **Instance:** `CLAUDE.md:10` and
12 more lines cite `ocx.toml`/`ocx.lock` as the config-file format the
*extension's target workspace* has — not this repo's own former
dev-toolchain `ocx.toml`/`ocx.lock`, deleted at the root 5 commits back for
an unrelated reason. 13/13 lines flagged here are false positives. **Fault:**
check — no way to scope "citation" to a directory-qualified path or
link/pointer syntax; a bare top-level filename used as domain vocabulary is
indistinguishable from a repo-path reference. **Fix:** only flag a bare
filename when it is directory-qualified (contains `/`) or sits inside
markdown pointer syntax (LNK-02's `` `path.md#anchor` `` shape); treat a
directory-less filename as a citation only when a preceding word signals a
pointer ("see", "in", "under").

### Class 4 (miss, not yet a documented gap) — prose-form record/phase references evade SRF-01's token set
**Check:** `interface_leak.py` (`SRF01_PATTERNS`). **Mechanism:** the token
set matches only ID-shaped strings and record filenames, never a spelled-out
citation like `ADR "Title" decision 1A` or a `Phase 2.1 NOTE:` marker.
**Instance:** `schemas/ocx.toml.schema.json:5`, see §4. **Fault:** rule text
— `code-docs.md`'s "What no check sees" section lists guard-recogniser
misses, within-cap deleted guards, and undiscovered repo-minted IDs, but not
this class, so an adopter would wrongly read SRF-01 as exhaustive over any
process reference. **Fix:** add one line to "What no check sees": a
free-text citation to a record's title or a phase/milestone name, carrying
no ID-shaped token, is invisible to SRF-01.

## 6. Round-1 classes re-checked

- Short-label noise (LNK-13, advisory by design): not triggered by either
  repo (no short-label hits) — nothing to report, unaffected.
- `.vue/.svelte/.astro` scanning: not exercised, neither repo has such files.
- `records` silent when no record file matched: setup-ocx's clean run (no
  path deleted in range) still printed `records: {...}` with `scanned=6` —
  fix holds, not silent.

## 7. Precision per check (this run)

| Check | TP | FP | Precision |
|---|---|---|---|
| comment_census --over-cap | 12 | 0 | 1.00 |
| linkage_check ids | — | — | n/a (0 findings both repos, true negative) |
| linkage_check pointers | — | — | n/a (0 findings both repos, true negative) |
| linkage_check records | 0 | 13 | 0.00 (class 3) |
| interface_leak --source | — | — | n/a (0 findings both repos, true negative) |
| interface_leak output: action.yml | 0 | 2 | 0.00 (class 1) |
| interface_leak output: package.json | — | — | n/a (0 findings both repos, true negative) |
| interface_leak output: schemas/*.json | 9 | 0 | 1.00 |
| interface_leak output: bundled dist (sampled 20/3003) | 0 | 20 | 0.00 (class 2) |
