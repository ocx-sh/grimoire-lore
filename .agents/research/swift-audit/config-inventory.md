---
title: Swift program audit — lore house conventions, the checker contract, and fleet prior art
agent: config-inventory (research-lang, swift wave 1)
model: sonnet
scope: >-
  Numbers-first inventory of what a Swift set must fit: the five reference rule sets (go-quality, go-modules,
  rust-quality, nix-quality, kotlin-quality), two skills, one bundle and the publish.toml plumbing; the
  artifact checker and authoring budgets; the bazel-quality Swift gap; the ocx-sdk-python template; the Rust
  CLI and durable-state contracts translated to Swift (with Linux measurements); Swift-adjacent material
  already in the catalog (code-docs, docs-quality vs DocC); and the domain concerns with no config at all.
method: >-
  Lore worktree lore@f61674639e1e (branch swift), SDK ocx-sdk-python@80136dde4162, exemplar corpus of 40 repos at
  the SHAs in "Method and SHAs" below. Python measurements are `python3 -I` one-offs inlined next to each result;
  corpus censuses are the scripts in /home/mherwig/.cache/research-lang/swift-tools/fixtures/config-inventory/scripts/
  (census.py shared helpers, cli2.py, docblocks.py, globs.py, samples.py; run from that directory). Toolchain
  measurements run through /home/mherwig/.cache/research-lang/swift-tools/run.sh (swift 6.4, Linux x86_64, glibc).
  Checker facts are read from .claude/skills/research-lang/scripts/check-artifacts.py with line numbers.
date_researched: 2026-10-10
---

# Swift program audit — house conventions and fleet prior art

Researched 2026-10-10. Swift-version-specific claims name the version (everything toolchain-measured here is Swift 6.4,
Linux x86_64, glibc; Apple-only behaviour is read-only and marked `unverified: read only`).

Contents: [Headline numbers](#headline-numbers) · [Method and SHAs](#method-and-shas) ·
[1. House conventions](#1-house-conventions) · [2. The artifact checker contract](#2-the-artifact-checker-contract) ·
[3. The Bazel set's Swift gap](#3-the-bazel-sets-swift-gap) · [4. The SDK template](#4-the-sdk-template) ·
[5. CLI and durable-state contracts](#5-cli-and-durable-state-contracts) ·
[6. Swift-adjacent material in the catalog](#6-swift-adjacent-material-in-the-catalog) ·
[Smells (ranked)](#smells-ranked) · [Patterns worth encoding](#patterns-worth-encoding) ·
[Contradictions of the frame](#contradictions-of-the-frame) · [Gaps](#gaps)

## Headline numbers

| # | Number | Source |
|---|---|---|
| 1 | Catalog: 19 rules, 16 skills, 10 bundles = 45 publish entries; 2,346 rule-ID rows in 155 families | `publish.toml` via `tomllib`; ID census in §1.3 |
| 2 | A rule **index body** is capped at 200 lines; observed 69–198, median 156 (reference five: 110–188) | `check-artifacts.py:30`; §1.1 |
| 3 | **No word budget exists** anywhere (checker, SKILL.md, references). Words are uncapped: index bodies hold 967–3,586 words, so the line cap is the only brake and long table rows get around it (up to 19.6 words/line) | grep of `.claude/skills/research-lang`, §2.2 |
| 4 | 141 depth files: median 182 lines, max 292, 49 (35%) over 200 lines; **no checker budget applies to a depth file** | §1.2 |
| 5 | A skill body is capped at 500 lines; observed 68–499, median 420; three of 16 are at 473–499 | `check-artifacts.py:29`; §1.4 |
| 6 | Depth-file frontmatter: 105 of 141 carry `title`+`summary`; 5 (all code-docs) carry a never-matching `paths`; 31 carry none (rust-quality 18, python-quality 12, rust-cargo 1) | §1.2 |
| 7 | Checker: 831 lines, 15 distinct check classes, `--self-test` passes; a whole-tree run `rules skills` reports 13 findings, all cross-set `DEP-nn` citations | §2.1 |
| 8 | 10 of 19 rules open their ID table with a `*-CORE-01..03` trio (weaken-check, watched-red, empty-output semantics) | §1.3 |
| 9 | Swift is already half-wired: `code-docs` globs `**/*.swift`; its census lexes Swift but has **no public-item detector and no Swift signature sections** | `rules/code-docs.md:21`, `comment_census.py:1052`; §6 |
| 10 | 56,929 `///` blocks in the 40 exemplars: 3,486 (6.1%) over the 10-line doc cap; 9,266 (16.3%) carry a `- Parameter/Returns/Throws` section; 1,168 of the 3,486 (33.5%) drop under the cap if those sections were skipped as LEN-07 skips `@param` elsewhere | §6.2 |
| 11 | docs-quality's canonical declaration placement (comments above the `#` title) makes `docc convert --warnings-as-errors` exit 1 (3 of 3 articles warn); the same comments after the title exit 0 and pass `doc_declaration.py` | §6.3 |
| 12 | SDK template: 133 `__all__` names, 70 public command methods on 5 classes, 26 `*Error` classes, 15 mapped exit codes, 720 test functions in 23 files, `fail_under = 100`, zero runtime dependencies, 9 CI unit legs (3 OS x 3 Python) | §4 |
| 13 | Swift 6.4/Linux: ArgumentParser parse failure exits **64**; a closed stdout pipe kills the producer with **141** in all 6 write paths; `print`/`fputs` to `/dev/full` exit **0** silently; legacy `FileHandle.write(_:)` crashes (**132**); `exit()` skips `defer` and `deinit` | §5.2 |
| 14 | Of 40 exemplars, 39 have `Package.swift`, 8 also have versioned `Package@swift-*.swift` (15 files, missed by `**/Package.swift`), 31 have `.spi.yml`, 24 `.swift-format`, 17 a committed `Package.resolved`, 7 `.swiftformat`, 4 `.swiftlint.yml`, 29 contain `.docc` catalogs (70), 39 have `.github/workflows` | §2.4 |
| 15 | Catalog Swift/Xcode/SPM/CocoaPods mentions: 9 hits in 6 files, 0 in any rule or skill prose; SwiftUI/UIKit/Observation: 0; DocC: 0; swift-format/SwiftLint: 1 (a directive regex) | §6.1, §7 |

## Method and SHAs

Exemplar SHAs measured (from `swift-audit/scratch/exemplar-shas.md`, all depth-1 blob-less clones, 2026-10-10):
swift-log@4038b6a4f74a swift-argument-parser@efd239f0055b swift-async-algorithms@cbde9aed744b swift-collections@935f696a549a
swift-nio@e12881f2a691 swift-system@486d48c80fce swift-openapi-generator@c4f943e14015 swift-distributed-tracing@a5270bd1280a
swift-container-plugin@a9646b8d4dca swift-crypto@1c80d3aff53f swift-format@b15dd59fad21 container@f70ecbb926d9
containerization@3e7bc39e66b3 swift-protobuf@6c84c3dedac0 swift-testing@c7d68ca20cd7 swift-syntax@be549876fe91
swiftly@c8cf2e35bfca swift-foundation@aadd9259be07 swift-embedded-examples@119b29f83550 sourcekit-lsp@c6ce93d5f8aa
async-http-client@017115279d09 swift-package-manager@5546f44a3b52 swift-service-lifecycle@c55297914e26
swift-build@2187330e13e7 grpc-swift-2@ac33066eb6ed vapor@bf77fc69b142 hummingbird@1bd3b407fb47
swift-aws-lambda-runtime@8abd464310c7 swift-dependencies@b476cc576105 swift-snapshot-testing@28e5de025e3f
swift-composable-architecture@bc2db5ba8ad3 Alamofire@bda9ed57d729 Nuke@d5548dd61395 SwiftLint@ec4691d9e813
SwiftFormat@fbc07aca5373 IceCubesApp@2ad6e6891258 rules_swift@50450ed24dde JavaScriptKit@c68ee9bdebfa
element-x-ios@14e33866ced2 tuist@2f6ac74754bf.

Counting discipline for the corpus censuses (`census.py`): skipped dirs `.build Benchmarks Pods Carthage node_modules .git
ThirdParty third_party Vendor vendor Checkouts`; skipped any path under a `Tests`/`*Tests`/`Fixtures`/`Examples`/`Samples`
directory and `*Tests.swift`; skipped `*.pb.swift *.grpc.swift` and any file whose first 12 lines match
`DO NOT EDIT|@generated|Code generated|Generated by|auto-generated`; comments blanked before matching (line numbers kept).
Result: 11,921 files, 1,954,101 lines of product Swift. The filter is a regex, not a parser: `Documentation.docc/**/Resources`
tutorial snippets and `examples/` under a lowercase name leak through (seen once each in spot-reads). Where the axis is about
fixtures (DocC catalogs, config-file names, `Package.resolved`) the filter is not applied and the text says so.

## 1. House conventions

### 1.1 The five reference rule indexes

Command: `python3 -I` over `rules/<n>.md` (frontmatter split, `## ` sections, `| <ID> |` rows); gate fence = first fenced block
under `## The Gate`; body lines are `splitlines()` after the frontmatter, the unit the checker caps.

| | go-quality | go-modules | rust-quality | nix-quality | kotlin-quality |
|---|---|---|---|---|---|
| Frontmatter keys (all five) | `paths summary keywords license repository` | same | same | same | same |
| Frontmatter lines / `paths` globs | 8 / 1 (`**/*.go`) | 20 / 13 | 8 / 1 (`**/*.rs`) | 10 / 3 | 11 / 4 |
| Total / body lines | 182 / 174 | 178 / 158 | 118 / 110 | 198 / 188 | 161 / 150 |
| Body words (words/line) | 3,278 (18.8) | 3,060 (19.4) | 1,336 (12.1) | 3,586 (19.1) | 2,254 (15.0) |
| Non-negotiable rows (avg words) | 18 (43) | 17 (28) | 20 (28) | 15 (34) | 17 (37) |
| ID rows: index / total | 5 / 203 | 18 / 54 | 0 / 446 | 6 / 142 | 3 / 66 |
| Families | 11 `GO-*` | 3 `GO-MOD/GATE/REL` | 20 unprefixed | 10 `NIX-*` | 8 `KT-*` |
| Depth files (lines) | 10 (188–203) | 2 md (174, 192) + 3 yml (144, 158, 158) | 18 (106–259) | 9 (196–292) | 7 (124–187) |
| Depth total lines | 1,981 | 826 | 2,818 | 2,184 | 1,113 |
| Routing-table rows | 16 | 7 | 18 | 17 | 10 |
| Gate fence (lines / command lines) | 12 / 10 | 6 / 6 | 5 / 5 | 16 / 15 | 4 / 4 |
| `**pinned**` marks in index | 4 | 2 | 0 | 9 | 1 |
| Severity split (MUST/SHOULD/CONSIDER) | 126/75/2 | 44/8/2 | 321/107/18 | n/a (extra `Floor / impl` column) | 44/19/3 |

Cites: frontmatter `rules/go-quality.md:1-8`, `rules/go-modules.md:1-20`, `rules/rust-quality.md:1-8`, `rules/nix-quality.md:1-10`,
`rules/kotlin-quality.md:1-11`. Reference: `rules/bazel-quality.md` is 169 lines / 146 body, 16 globs, 19 NN rows, 14 depth files.
Whole catalog, 19 index bodies: min 69 (python-packaging), median 156, max 198 (css-theming). 18 of 19 are under 190.

Frontmatter shape, verbatim from `rules/go-quality.md:1-8`:

```yaml
---
paths:
  - "**/*.go"
summary: The Go quality index, holding the gate, the non-negotiables, and where the depth lives
keywords: go,golang,quality,errors,concurrency,testing,cli,iterators,generics,slog,net/http
license: Apache-2.0
repository: https://github.com/ocx-sh/grimoire-lore
---
```

`summary`/`keywords`/`repository` sit at the **top level** of a rule; the checker rejects them under `metadata:` (`check-artifacts.py:590-599`).
Skills invert this: `name`, `description`, `license`, then `metadata:` with nested `summary` and `keywords`
(`skills/go-diagnose/SKILL.md:1-8`).

### 1.2 Section skeleton, in order, and what each holds

Section order is identical in every index (`rules/go-quality.md:10,31,69,96,121,145,165`; `nix-quality.md:12,38,82,106,139,164,190`;
`kotlin-quality.md:13,39,66,94,105,123,143`; `rust-quality.md:10,25,44,72,98,107`):

| # | Heading | Holds | Lines (go / nix / kotlin / rust) |
|---|---|---|---|
| 0 | `# <Name>` + 2-line purpose ("Traps, not tutorials. Every line names a mistake generated X makes by default.") + `Contents:` line | anchors for every `##` | 20 / 11 / 12 / 9 |
| 0b | A bold **"Before trusting any rule below, read <the version-gating fact>"** paragraph | the one input that changes every row: Go `go` line (GO-CORE-04), Nix era + flake shape (NIX-CORE-04/05), Kotlin lint-gate activation, Bazel `.bazelversion` | in the above |
| 1 | `## The Gate` | one fenced block, cheapest step first, `# <n> <ID>: <exit/empty semantics>` per line, then **Pinned** tool versions with a measurement date, then "Chain into one named target `check`" | 38 / 44 / 27 / 19 |
| 2 | `## Non-Negotiables` | table `\| # \| Rule \| ID \|`, every row blocks a merge, IDs resolve into depth files | 27 / 24 / 28 / 28 |
| 3 | `## Rules This File Owns` (go, nix, kotlin, bazel only) | the CORE rows as a 5-column table + a fenced `weaken-check` / `gate-files-touched` / `generated-touch` command block | 25 / 33 / 11 / n/a |
| 4 | `## Where the Depth Is` | routing table `\| Doing… \| Read \|` by **task**, one level deep | 24 / 25 / 18 / 26 |
| 5 | `## Severity` | MUST=Block, SHOULD=Warn, CONSIDER=Suggest; what **pinned** means; "keep the Block list short" | 20 / 26 / 20 / 9 |
| 6 | `## Siblings` | one bullet per sibling set, with the glob boundary between them | 19 / 10 / 20 / 13 |

Verbatim house rules a Swift index must keep:

- Purpose line, `rules/go-quality.md:12-14`: "Traps, not tutorials. Every line names a mistake generated Go makes by default. The spec and the standard library are already in the model, and a codebase's architecture is discoverable by reading it, so neither is in this file."
- Gate closing, `rules/go-quality.md:66-67`: "A task is done when a command, its exit code and the tree it ran against are all named. Narration is not evidence." (present in all five).
- Routing intro, `rules/go-quality.md:123-124`: "Read the file for the work you are about to do, not for the topic it is filed under. One level deep: these files do not point at each other."
- Pinned, `rules/go-quality.md:150-152`: "Rules marked **pinned** encode an agreed decision rather than a derivable fact … Each is a default an adopter may override, once … Overriding one is a decision recorded with its reason, ignoring one is a violation, and re-arguing one in a pull request is not a review comment."
- Severity close, `rules/go-quality.md:162-163`: "Keep the Block list short enough that a blocked change is unusual. A rule set where everything blocks teaches the reader to negotiate with all of it."
- Glob statement: the index says which glob it installs with (`rules/go-quality.md:27-29`: "This rule installs with `paths: ["**/*.go"]` and loads on every Go source edit and on nothing else") and which files it does not glob and routes by task instead (`rules/nix-quality.md:20-22`, `rules/rust-quality.md:109-114`).

**Non-negotiable layout.** `| # | Rule | ID |`, one imperative paragraph per row (avg 28–43 words), the **ID cell lists 1–5 rule IDs** (go row 1: `GO-CORE-04, GO-LANG-02, GO-LANG-04`). rust-quality is the older variant: 20 rows cite family stems instead of IDs
(`SEC family`, `EVO`, `DATA-DET`; `rules/rust-quality.md:59,67,70`) and its depth tables are 4 columns with the rationale folded into the Rule cell.

**ID rows (depth and CORE).** Go/Nix/Kotlin/Bazel use 5 columns `| ID | Rule | Rationale | Verification | Severity |`
(`rules/go-quality.md:102`); nix adds `Floor / impl` (two header orders in the same set); rust-quality depth uses
`| ID | Rule | Verification | Severity |`. Verification is mandatory (checker `:515`), and house style states "empty output is the pass"
or "the finding" in every cell (GO-CORE-03). Typical verification cell ends with a "Watched <date> (git 2.54, GNU grep 3.12): planted … printed …, fixed twin printed nothing" receipt
(`rules/go-quality.md:104`).

**The routing table is by subject, not file name** (go: 16 rows, e.g. `Starting a goroutine, fanning out work, passing, storing or cancelling a context … → concurrency.md`;
`rules/go-quality.md:128-143`). Rows that leave the set name a sibling: `go-modules`, `bazel-quality`, the three skills,
`docs-instrument`/`docs-quality` (`rules/go-quality.md:138-143`). The last rows route to skills for procedures.

**Depth-file shape** (141 files across 17 directories; median 182 lines, 49 over 200, max 292): optional frontmatter `title` + `summary`
(`rules/go-quality/errors.md:1-4`, `rules/bazel-quality/go.md:1-4`), `# Title`, an "Owns `FAMILY` … Does not own …" paragraph naming siblings
(`rules/go-quality/api-design.md:8-18`), `Contents:` line (133 of 133 files over 100 lines have it in the first 40 lines), `##` topic sections with
ID tables, `## What Agents Get Wrong Here` (numbered list citing IDs). Command: `python3 -I` walk over `rules/*/**/*.md` excluding `fixtures`
and `checks`. `go-modules/golangci/*.yml` (3 files, 144–158 lines) are config payloads the rule says to copy whole (GO-GATE-22).

### 1.3 ID families and the CORE trio

Command: `python3 -I` with the checker's own `ID_RE`/`_ID` pattern (`check-artifacts.py:49-50`) over all `rules/**/*.md` minus `fixtures`.

| Family style | Sets | Consequence for Swift |
|---|---|---|
| `<LANG>-<TOPIC>-nn` | GO, NIX, KT, TS, PY, JAVA, CMK, GRADLE, MVN, BZL, DOC(-X), CSS | use `SWIFT-<TOPIC>-nn`; `SW`/`SWIFT` prefixes are unused (0 hits) |
| unprefixed `ERR/API/SEC/TEST/CLI/PLAT/STATE/PERF/OBS/CI/DEP/REL/DOC/EXIT…` | rust-quality (20 families, 446 rows), rust-cargo (5) | collide with any generic stem; the whole-tree checker run already reports 13 false `DEP-nn` citations because cmake-build cites `DEP-11…31` while rust-cargo owns a `DEP` family (`check-artifacts.py:645-655`) |
| `CORE` trio | BZL, CMK, GO, GRADLE, JAVA, KT, MVN, NIX, PY, TS (10 of 19 rules) | open every Swift family list with `SWIFT-CORE-01` weaken-check, `-02` watched-red, `-03` empty-output semantics |

Totals: 155 families, 2,346 ID rows. Largest families: PLAT 41, TEST 41 (rust), DOC-TYPE 41, SEC 39 (rust). Per set: go-quality 203, bazel-quality 389 (15 families), rust-quality 446.
Swift evolution IDs (`SE-0413`) and bug IDs match the checker's cite regex but are inert unless a family named `SE` is defined (`check-artifacts.py:645-655` only checks families with a definition in the run).

### 1.4 Skills: go-diagnose and nix-flake-adopt

| | go-diagnose | nix-flake-adopt |
|---|---|---|
| Lines total / body / words | 481 / 473 / 4,074 | 428 / 420 / 3,973 |
| Description chars (cap 1,024) | 893 | 823 |
| `references/` | none | 2 files, 299 + 221 lines |
| Frontmatter | `name description license metadata{summary,keywords}` (`skills/go-diagnose/SKILL.md:1-8`) | same (`skills/nix-flake-adopt/SKILL.md:1-8`) |
| Step layout | Consent table → Stop condition → Never edit the check → Step 0 build identity → Route by symptom → A–I symptom sections → Last resort → The receipt (`:36,54,67,87,121,137-387,403,417`) | Two facts → Contents → Scope table → Pinned defaults table → The procedure steps 1–10 (`:12,32,49,74-321`) |
| Duplicated MUST table | `## MUST rows this procedure surfaces`, `| # | Finding | Rule |`, 15 rows (`:432-454`) | `## The MUST rows this procedure enforces`, same shape, 21 rows (`:365`) |
| Closing | `## What agents get wrong`, 13 numbered items (`:456`) | `## What agents get wrong here`, 12 items (`:395`) |
| Distinct rule IDs cited | 38 | 66 |

Catalog skills: 16; body lines 68–499, median 420; nix-flake-release is **499/500**, bazel-diagnose 475, code-docs-cleanup 466, go-diagnose 473, cmake-dependency-triage 462.
`references/` present in 11 of 16, absent in docs-review, go-diagnose, jvm-dependency-triage, jvm-release, nix-flake-release. Description chars 506–1,017.
Rules the skills restate: "Merge-blocking rows, restated as findings so a review that runs this procedure without the rule files loaded still reports them with the right ID" (`skills/nix-flake-adopt/SKILL.md:367-369`);
the skill cites rule IDs and never restates the rule (`rules/go-quality.md:177-179`). `rule-distillation.md:223-226` licenses "Duplicate the MUST list; never duplicate the depth."

### 1.5 Bundle and publish.toml plumbing

`bundles/go-essentials.toml` (command: `tomllib` over all 10 bundles): top-level keys `summary keywords description license repository`; `[rules]` and `[skills]` tables of
`name = "./name"` members; **0 of 10 bundles tag any member** (`bundles/go-essentials.toml` comment, lines 11-18: "MEMBERS CARRY NO TAG. Not a digest, not an exact version, not a floating major, not `latest` — `latest` is a tag like any other and naming it is still a pin.
… Do not pass --pin when releasing this bundle."). 6 of 10 bundles include `code-docs` + `code-docs-cleanup` (go, jvm, python, rust, typescript, code-docs-essentials itself); bazel, cmake, docs, nix do not.
go-essentials = 3 rules + 4 skills; description 851 chars; keywords 40.

`publish.toml` (402 lines, `tomllib`: keys `registry repository_prefix metadata support announce description rules bundles skills`): `repository_prefix = "ocx-sh/lore"` (flat, `publish.toml:18`),
**no catalog-wide `version`** (lines 20-33: a new entry that forgets `version` fails rather than inheriting), one block per artifact. The Go set (`publish.toml:344-375`):
`[rules.go-quality] 0.2.0`, `[rules.go-modules] 0.1.0`, three `[skills.go-*] 0.1.0`, `[bundles.go-essentials] 0.1.1`, each with `description = { readme = "docs/<name>.md", logo = "assets/lore-go.svg" }`,
preceded by a comment block justifying the rule split ("two rules split by what the file under edit is"). A bundle version bumps "when its member SET changes, not when a member's own version does" (lines 31-33).
bazel-quality is `0.3.0` (`publish.toml:259-261`); history: `4325c18` 0.1.0 → `e041992` 0.2.0 (Java/Kotlin depth) → `423ecee` 0.3.0 (Go depth): one minor bump per language depth file, so Swift is `0.4.0`.

**What a new set must add outside rules/ and skills/** (each verified by `ls`/`grep`):

| Item | Evidence | Swift status |
|---|---|---|
| `docs/<artifact>.md` readme per artifact (56–116 lines for Go) | `wc -l docs/go-*.md` = 56/80/103/106/116/82 | to write |
| `assets/lore-<set>.svg` composed from `assets/glyphs/<set>.svg` via `scripts/make-mark.py` | 16 glyphs, `lore-go.svg` etc. | **no `swift` glyph, no `lore-swift.svg`** |
| `[rules.*]/[skills.*]/[bundles.*]` entries with per-entry version and a justification comment | `publish.toml` | to write |
| A `taskfile.yml` `artifacts` block with `<LANG>_CONSUMER` default empty, `--forbid '/home/mherwig' --forbid '.agents/research'`, else-branch without `--root` | `taskfile.yml:133-145` (Go), `:151-158` (Nix) | to write |
| `docs/bazel-quality.md` count text ("fourteen depth files") and a routing row + Siblings text in `rules/bazel-quality.md:135,157-165` | go.md precedent | to edit |
| `index/github.com/ocx-sh/<name>/metadata.json` | produced by announce PRs (`announce/ocx-sh-*` merge commits) | automatic |

### 1.6 Conventions a Swift set must follow (digest)

1. One **index + support directory** per glob family; a second rule file only for a genuinely different glob (`rule-distillation.md:127-128`). Go splits `go-quality` (`**/*.go`) from `go-modules` (13 manifest/config globs); Swift mirrors as `swift-quality` + `swift-package`.
2. Widen to the language extension; never a narrow guess at filenames. `rule-distillation.md:83-87`: "a glob narrower than the language's own file extension has to be underwritten by something structural, not by convention." `**/Cargo.toml` is safe because the build system requires the name; for Swift, `Package.swift` qualifies, `Package@swift-5.9.swift` needs its own glob (§2.4).
3. **CI workflows are never globbed**; the index routes to them by task. `rules/rust-quality.md:109-114`: "it does not glob `.github/workflows/`, because a workflow filename says nothing about its language and the directory holds every other job the repository has." Go-modules globs only workflows named for the tool (`**/*golangci*.yml`).
4. Every rule row: ID, one imperative, rationale, **exact verification**, severity; "No verification, no rule" (`rule-distillation.md:144`). Group rows by the check that catches them.
5. Pin an agreed decision with `**pinned**` and say it is a default an adopter overrides once.
6. Date and version-stamp every measured claim ("Measured 2026-09-26 on Go 1.27.1"); `go.md:34-40` discloses which rows were not run.
7. Depth files never point at each other; skills cite IDs and restate only the MUST list.
8. Strip project paths (`--forbid '/home/mherwig' --forbid '.agents/research'`).

## 2. The artifact checker contract

### 2.1 Every check in `check-artifacts.py` (831 lines; `python3 … --self-test` prints `self-test: ok`)

| # | Check | Where | Detail |
|---|---|---|---|
| 1 | Name parity and charset | `:547-552` (skill), `:583` (rule stem) | `name == directory name`; `^[a-z0-9]+([.-][a-z0-9]+)*$` (`:33`) |
| 2 | Description hygiene | `:240-259` | present, <= 1,024 chars (`:32`), one line, first word not in WORKFLOW_VERBS (`:36-47`: dispatches runs iterates orchestrates performs executes handles generates creates builds), third person, contains "use when" |
| 3 | Skill body cap | `:555-558` | `> 500` body lines fails (`:29`) |
| 4 | Rule body cap | `:584-590` | `> 200` body lines fails (`:30`), message "move depth into the support directory" |
| 5 | Misplaced catalog keys | `:591-599` | `summary`/`keywords`/`repository` inside a rule's `metadata:` fails |
| 6 | Table of contents | `:262-280`, `TOC_REQUIRED_OVER = 100` (`:31`) | file over 100 lines needs `contents:` / `## contents` / "table of contents" in the first 40 lines, or (index files only) a routing table: `^\| \[?read` or >= 2 `](references/` or `](<stem>/` links |
| 7 | Relative links | `:283-288` | targets resolve; fenced blocks stripped first (`FENCE_RE :101`) |
| 8 | Dead glob | `:518-528` | each `paths` entry, minus `**/`, must `rglob` under `--root`; `--allow-absent GLOB` exempts. Index only: depth-file `paths` are not checked |
| 9 | Forbidden strings | `:531-534` | `--forbid S` (repeatable) over index, depth, SKILL.md and bundled files; fixtures get this check only (`:608-613`) |
| 10 | Bundled file referenced | `:565-572` (skill), `:621` (rule) | skill: every `.md` is named in another file; rule: every support `.md` name appears in the index text |
| 11 | Table-row pipes | `:496-504`, `UNESCAPED_PIPE_RE :83` | a row's unescaped `\|` count must equal the header's |
| 12 | Duplicate ID | `:505-510` | `ID_RE = ^\|\s*(ID)\s*\|` at line start; same ID in a different file fails (`:49-50`) |
| 13 | Empty verification cell | `:511-515` | a column whose header contains `verif` must be non-empty on every row |
| 14 | Runnable-span lints | `:328-456` | on backtick spans in table cells and prose: escaped `\|` inside `rg`/`grep -E` quotes (`:353`); `-tn` (`:363`); `rg -L` (`:371`); unquoted `**` in `rg/grep/git grep/find` (`:383`); `rg` with no path operand (`:393`); unsubstituted `<template>` in a search pattern (`:403-421`, `NOT_A_TEMPLATE :64`); `$(` command substitution (`:423`); bare path glob (`:433`); unquoted `--include=`/`--exclude=` glob (`:443`) |
| 15 | Dangling citation | `:645-655` | an ID cited in prose with no definition anywhere, only for families defined in this run; a line containing "is retired"/"retired … not reused" is exempt (`RETIRED_RE :53`) |

Ordering/walk: `walk` (`:624-642`) treats `rules/<n>/` as covered by `<n>.md` and skips dot dirs; invocation `check-artifacts.py PATH… [--root DIR] [--forbid S]… [--allow-absent GLOB]… [--self-test]` (`:769-831`), exit 0/1/2.
Measured today: `python3 .claude/skills/research-lang/scripts/check-artifacts.py rules skills --forbid '/home/mherwig'` → 13 findings, all `rules/cmake-build/dependencies.md: cites DEP-11…DEP-31, which no rule table defines`
(a family-collision artifact of running all sets in one process; the taskfile runs per set).

### 2.2 Budgets, and the always-on versus scoped split

| Budget | Value | Enforced by | Evidence |
|---|---|---|---|
| Rule index body | < 200 lines | checker `:30,584` | `validation.md:30`, `rule-distillation.md:20,123` ("Under 200 lines") |
| Skill body | < 500 lines | checker `:29,555` | `validation.md:30` |
| Description | <= 1,024 chars, one line | checker `:32,244` | `validation.md:29` |
| TOC | any file > 100 lines | checker `:31,265` | `validation.md:31` |
| Depth file | **no cap**; "one topic per file, a table of contents in any file over 100 lines, and no chains" | prose only (`rule-distillation.md:124-126`) | observed max 292 |
| **Words** | **none** | nothing | grep of `SKILL.md`, `references/*.md`, checker for `word` budgets returns no budget; actual body words 967–3,586 per index, 416–5,142 per skill |
| Shipped rules funnel | ~60–100 shipped rules; 120–200 merged; 200–400 candidates | prose (`rule-distillation.md:14-21`) | observed: go-quality 203 ID rows, rust-quality 446, bazel-quality 389 |

Always-on versus scoped: nothing in the catalog is unconditionally always-on. **"Always-on" means the index**: it loads whenever a file matching `paths` is read, must be < 200 lines, and carries
the gate, non-negotiables and routing table; **depth** loads only when followed (`rule-distillation.md:101-133`). Pinned project decisions go in the index "so it is never missed"
(`rule-distillation.md:59`). Scoped rules "fire on *read*, not on *create*" (`validation.md:82-83`), so a new-file convention needs another carrier. Review skills may duplicate the MUST list, never the depth (`rule-distillation.md:223-226`).
`rule-distillation.md:20` writes the budget as "always-loaded lines < 200 per file"; the checker counts body lines after the frontmatter, so a 200-line body plus 8–20 lines of frontmatter is accepted.
Selection test (`rule-distillation.md:29-39`): keep a rule only when an agent gets it wrong by default, it is checkable, it changes a diff, and it contradicts no sibling.

### 2.3 Where the checker is blind (relevant to a Swift set)

| Blind spot | Evidence | Mitigation |
|---|---|---|
| Depth files have no line, word, or `paths` check | `check_rule :603-621` only runs toc/links/tables/forbid on them | keep depth <= ~200 lines by habit; add the never-matching `paths` (§Smells #1) |
| Words per line: long table rows sidestep the 200-line cap | cmake-build has a 285-word line, nix 240, go-quality 239; go-quality averages 18.8 words/line vs rust-quality 12.1 | cap rows by hand; split a CORE row's verification into the fenced block as go-quality does |
| Dead-glob liveness needs a tree that has the files | fleet has 0 Swift files, so `**/*.swift` is dead against `.` | `SWIFT_CONSUMER` task var, default empty, else-branch without `--root` (`taskfile.yml:140-145`); use an exemplar root (`swift-package-manager` has 338 `Package.swift`) |
| Cite regex matches any `[A-Z][A-Z0-9]*(-[A-Z]…)*-\d+` | `UTF-8`, `SE-0413`, `SR-1234` match | harmless unless a family of that stem is defined; never define `SE`/`SR` |
| Verification honesty (watched red) is not machine-checkable | `validation.md:97-99` | a planted-fixture run per row, as go.md did ("every row except BZL-GO-12 and BZL-GO-13 was watched fail on a planted violation") |

### 2.4 Glob candidates measured against the exemplar corpus

Command: `python3 globs.py` (os.walk, skips `.git`/`.build`; no test filter, because the axis is file presence). Repos of 40 containing a match:

| Candidate name or glob | Repos | Files | Verdict for the glob |
|---|---|---|---|
| `**/*.swift` | 40 | 18,886 | safe (extension) |
| `**/Package.swift` | 39 | 677 (swift-package-manager 338, tuist 149) | safe (SwiftPM requires the name) |
| `**/Package@swift-*.swift` | 8 | 15 (Alamofire 4, swift-protobuf 3, swift-async-algorithms 2) | **missed by `**/Package.swift`**; needs its own entry |
| `**/Package.resolved` | 17 | 97 (tuist 57) | live; includes nested fixture resolutions |
| `**/.swift-format` | 24 | 24 | live (60%) |
| `**/.swiftlint.yml` | 4 | 26 (SwiftLint 22) | live; `.swiftlint.yaml` 0 repos |
| `**/.swiftformat` | 7 | 19 | live |
| `**/.swift-version` | 6 | 10 | live; rules_swift reads it via `swift_version_file` (`doc/standalone_toolchain.md:56,100`) |
| `**/.spi.yml` | 31 | 31 | live (78%), Swift Package Index/DocC hosting config; not in the frame's list |
| `*.xcodeproj/project.pbxproj` | 13 | 30 | Apple-only, read-only depth |
| `**/*.xcconfig` | 3 | 22 | rare |
| `*.docc` catalogs | 29 | 70 | live |
| `Project.swift` / `Tuist.swift` | 2 / 1 | 268 / 172 (tuist) | one repo; `--allow-absent` candidate |
| `Podfile`, `Cartfile`, `Mintfile` | 0 | 0 | do not glob |
| `*.podspec` | 3 | 3 | rare |
| `.github/workflows/*.yml` | 39 | 287 | **never glob** (house convention §1.6 #3) |
| `Dockerfile*` | 11 | 40 | route by task |
| `MODULE.bazel` / `BUILD.bazel` | 4 / 4 | 6 / 54 | owned by `bazel-quality` |

## 3. The Bazel set's Swift gap

`rules/bazel-quality.md` (169 lines, 16 globs, `bazel-quality 0.3.0`) has **zero** Swift content: `grep -ri swift rules/bazel-quality*` returns nothing; its keywords list names `rules_go go_deps nogo` but no `rules_swift`
(`rules/bazel-quality.md:19`). Its Siblings section enumerates `rust-quality, python-quality, typescript-quality, java-quality, kotlin-quality, go-quality` (`:162-165`) and the six packaging sets (`:157-161`); the routing table has one row per language depth file (`:130-135`)
and a row sending `go.mod` etc. to the packaging sets (`:136`). The non-negotiables carry language rows for Rust, Python, TypeScript and C++ (rows 15–18, `:98-101`); **Java and Go have none**.

Language depth files (command: `python3 -I` over `rules/bazel-quality/*.md`):

| File | Lines | ID family (rows) | `##` sections | Gaps section | Measured stamp |
|---|---|---|---|---|---|
| rust.md | 247 | BZL-RUST (28) | 9 | yes | "Measured 2026-09-06 against Bazel 8" |
| python.md | 210 | BZL-PY (28) | 10 | yes | "Measured: a bare `py_library` exits 0 on 8" |
| typescript.md | 204 | BZL-JS (28) | 9 | yes | 2026-09-06, Bazel 8 |
| cpp.md | 202 | BZL-CC (25) | 10 | yes | one Linux host, 50 genrules |
| java.md | 281 | BZL-JAVA (25) | 9 | yes | 2026-09-12, Bazel 8; no `bazel` run |
| go.md | 197 | BZL-GO (15) | 6 | yes | 2026-09-26, Bazel 9.2.0, rules_go 0.63.0; "a `bazel` binary was run" |

`go.md` structure to mirror (`rules/bazel-quality/go.md`): frontmatter `title`+`summary` only (lines 1-4, **no `paths`**: "It has no glob of its own" `rules/go-quality.md:175`); `# Go under Bazel`;
an **Owns** paragraph that names every sibling family it cites and never restates (`:8-27`); `Contents:` (`:29`); a measurement disclosure (`:36-49`: versions, which rows were run, "Only 2 of 35 public Go exemplars measured build Go with Bazel");
topic sections each introduced by one sentence saying how its rows are caught; 5-column ID tables; `## Gaps` (`:137`); `## What Agents Get Wrong Here` with 17 items (`:157`).
It opens with the scope guard "binds only if you adopt Bazel for Go" (`:8`).

What `go.md` defers to the bazel-core depth files (`rules/bazel-quality/go.md:16-27`):

| Concern | Owner family / file | Swift analogue |
|---|---|---|
| `MODULE.bazel.lock`, `bazel mod tidy` diff gate | BZL-MOD, bzlmod.md | `bazel_dep(name="rules_swift")`, lock freshness |
| stable vs volatile status, what `--stamp` guarantees | BZL-HERM, hermeticity.md | version stamping into a Swift binary |
| what may sit behind a `STABLE_` key | BZL-CACHE, caching.md | same |
| test sizing, timeouts, coverage reading | BZL-TEST, testing.md | `swift_test` sizing |
| rc-file discipline, WORKSPACE removal, ruleset version sourcing | BZL-FLAG, flags.md | rules_swift `bazel_compatibility >=8.0.0` (`rules_swift@50450ed24dde:MODULE.bazel:6`) |
| generator drift gate, `config_setting` on `constraint_values` | BZL-ARCH, architecture.md | no Gazelle for Swift in rules_swift (separate project, see below) |
| BUILD/.bzl authoring, buildifier gate | BZL-LARK, starlark.md | `load("@rules_swift//swift:swift_library.bzl", …)` |
| matrix legs, target selection | BZL-CI, ci.md | macOS + Ubuntu legs |

What a `swift.md` (`BZL-SWIFT`) must cover that has no existing owner, from `rules_swift@50450ed24dde`:

| Topic | Evidence | Version-specific note |
|---|---|---|
| Hermetic toolchain via module extension `swift.toolchain(name, swift_version)` and `swift_version_file` | `MODULE.bazel:256-259` (`swift_version = "6.4.0"`), `doc/standalone_toolchain.md:24,56,100` | docs example says `6.2.4` (`doc/standalone_toolchain.md:24`) while the module pins `6.4.0`: **MODULE.bazel is authoritative**, the doc is stale (same pattern as go.md's stale `bzlmod.md` example) |
| Per-platform toolchain targets (Ubuntu 22.04 amd64/arm64, xcode, Android aarch64, embedded) | `MODULE.bazel:263-285,431` | Linux sysroot via `apt` extension (`MODULE.bazel:24-46`) |
| Rules surface: `swift_library`, `swift_binary`, `swift_test`, `swift_compiler_plugin` (macros), `swift_import`, `swift_interop_hint`, `swift_overlay`, `swift_proto_library`, `swift_module_mapping`, `mixed_language_library` | `doc/rules.md:40-1087` (anchors listed) | 20 documented rules/macros |
| Module naming / explicit modules | `doc/explicit_modules.md` | unverified: read only |
| Apple platforms need `rules_apple`; Swift packages need `rules_swift_package_manager` (cgrindel, **not in the corpus**) | `README.md:24-26,119` | no Gazelle/`swift_deps` in `MODULE.bazel` (grep returns nothing) |
| CI matrix | `.bazelci/presubmit.yml:6,13,20` (macos_arm64, ubuntu2204, **windows**) | `README.md:6` says "macOS and Linux" while `README.md:17` and presubmit run Windows: **config (presubmit + MODULE.bazel) beats README** |
| Dependency on Swift packages inside the ruleset | `MODULE.bazel:110,142,150`: swift-nio 2.51.0, swift-log 1.6.3, swift-nio-ssl 2.26.0 "pinned to … version needed to fix linux build" | stale vs corpus swift-nio |
| `swift_argument_parser` as a BCR dep | `MODULE.bazel:17` (`1.7.0`) | |

Missing from the measurement toolchain: `bazel` itself is not in the Docker image; a `swift.md` row run on a Swift toolchain only (no Bazel) would be a reading heuristic, not a command.
Plan: `swift.md` + routing row + Siblings bullet + keywords + `docs/bazel-quality.md` counts + `publish.toml` bump to `0.4.0`; `swift-essentials` must NOT list it ("The Bazel-Go depth file is not a member", `bundles/go-essentials.toml:20-21`).

## 4. The SDK template

Repo `/home/mherwig/dev/ocx-sdk-python@80136dde4162` (command: `ls`, `wc -l`, `ast` walk of `src/ocx_sdk/*.py`).

| Aspect | Fact | Cite |
|---|---|---|
| Package / version | `ocx-sdk` 0.2.0, Apache-2.0, `requires-python >=3.12`, build backend hatchling | `pyproject.toml:2-8` |
| Dependencies | **zero** runtime dependencies | `pyproject.toml:22` (`dependencies = []`), README "Zero runtime dependencies" |
| Layout | `src/ocx_sdk/`: `__init__.py` 315 lines, `_client.py` 3,741, `_results.py` 3,039, `_dist.py` 935, `_bootstrap.py` 874, `_process.py` 844, `_env.py` 490, `_errors.py` 391, `_types.py` 299, `_envmodel.py` 264, `_config.py` 262, `_retry.py` 174, `bootstrap.py` 29, `py.typed` | `wc -l` (total 11,843 incl. tests) |
| Public API | `__all__` has **133** names (`__init__.py:181`): 67 from `_results` (frozen dataclasses), 27 errors/exit codes, 13 types, 6 client classes, config/env/dist/bootstrap. "This module is the API"; every other module is underscored (`__init__.py:17-22`) | AST count |
| Command methods | 70 public methods: `PackageCommands` 34 (`_client.py:1471`), `Project` 17 (`:861`), `Ocx` 16 (`:216`), `ConfigCommands` 2 (`:3371`), `PatchCommands` 1 (`:3461`); 4 of them async | AST count |
| Result types | 64 `@dataclass(frozen=True, slots=True)` in `_results.py` (one per command) | `_results.py:329,465,…` |
| Wrapping the CLI | one spawn module: `run_command` (`_process.py:199`), `run_command_async` (`:296`), `spawn` (`:384`), `spawn_async` (`:426`), `compose_argv` (`:157`); `subprocess.Popen` / `asyncio.create_subprocess_exec` seams injectable for tests (`:102-106`); JSON mode argv `("--format","json","--color","never")` (`_client.py:119`); configuration travels as `OCX_*` env vars via `build_spawn_env` (`_client.py:30-31`); `OCX_SDK_EXE` then `PATH` then ocx's install symlink resolves the binary (`_client.py:220`) |
| Process hygiene | `start_new_session=True` on every spawn (`_process.py:481`); kill ladder SIGTERM→SIGKILL to the process group with a pid-recycling guard (`:763-817`, `os.killpg` `:817`); SIGINT forwarded and previous handler restored (`:725-749`) | |
| Version gate | `MIN_SUPPORTED = "0.6.2"`, `TESTED_OCX_VERSION = "0.6.2"` (`_types.py:30,33`); CI pins `setup-ocx` to the same string and a test guards drift (`.github/workflows/ci.yml:64`) | |
| Errors | `OcxError` root; `OcxExecutionError` → `OcxProcessError(exit_code:int, argv, stderr, stdout, attempts)` and `OcxTimeoutError`; `BootstrapError` family (4); `OcxNotFoundError`; `VersionCompatError` (`_errors.py:66-354`). 26 `*Error` names exported | |
| Exit-code map | `ExitCode(IntEnum)` 0,1,64,65,69,74,75,77,78,79,80,81,82,83,84,85,86 (`_errors.py:28-51`); `_EXIT_CODE_ERRORS` maps 15 codes to subclasses (`_errors.py:373-387`); anything else (incl. 1) → plain `OcxProcessError` (`_process.py:825-831`); `retryable` is exactly `exit_code == 75` (`_errors.py:~150`) | |
| Signal-killed child | **not mapped**: `exit_code: int` "because a process killed by a signal exits with a code ocx never assigns" (`_errors.py:123`), so POSIX Python surfaces a negative returncode; contrast the Go rule GO-API-19 (`128 + signal`, `rules/go-quality/api-design.md:140`) | |
| Retry | pure delay generator, exponential with full jitter, sync and async twins deliberately duplicated; keyed on `RetryPolicy.retry_on` exit codes (`_retry.py:1-40`) | |
| Tests | 720 `def test_` in 23 `test_*.py` files; tiers `tests/unit` (13 files), `tests/contract` (7, gated by `OCX_SDK_CONTRACT=1`), `tests/acceptance` (5, `OCX_SDK_ACCEPTANCE=1`); `tests/fixtures/cli` 70 captured `--help`/output files; docs and docstring examples run as tests through Sybil (`conftest.py:1-90`, `pyproject.toml:84`) | |
| Coverage gate | `branch = true`, `fail_under = 100` (`pyproject.toml:90,97`); enforced **only on Linux legs** because POSIX process-group and Windows kill paths cannot all be covered on one OS (`.github/workflows/ci.yml:67-72`) | |
| Static gates | ruff `select = E W F I B UP ANN RUF D`, google docstring convention (`pyproject.toml:54,69`); pyright `strict = ["src"]` (`:76`); `task verify` = format:check + lint + types + test + cov:report (`taskfile.yml:10-17`) | |
| CI | unit matrix ubuntu/macos/windows x 3.12/3.13/3.14 = **9 legs** (`ci.yml:56-57`); contract job on Linux against pinned ocx 0.6.2; actionlint, lychee, gitleaks, `repo-checks` | |
| Docs | Starlight site under `site/`, Lighthouse 100x4 budgets, git-cliff changelog; README states stability: "Pre-1.0. Breaking changes ship without migration shims" (README "Stability") | |

Docs versus config: `CLAUDE.md` still says "full v0.1 walking skeleton" while `pyproject.toml:3` is 0.2.0 and `TESTED_OCX_VERSION` is 0.6.2; `__all__` and `pyproject.toml` are authoritative.

What a Swift SDK mirrors: one `Ocx` handle + `Project` + command namespaces returning frozen result structs; a single spawn point (`Foundation.Process`/swift-subprocess, with `terminationReason == .uncaughtSignal` giving the 128+n mapping that Python lacks);
`ExitCode`-keyed typed errors; `OCX_*` env composition; version gate with a tested pin; zero third-party dependencies (Foundation only); `public`/`package` access replacing underscored modules;
100% coverage gate on Linux only (llvm-cov), Windows/macOS legs functional; contract tier behind an env var. Swift cannot run docstring examples as tests the way Sybil does; DocC code listings are compile-checked only if a snippet target is added (unverified: not exercised here).

## 5. CLI and durable-state contracts

### 5.1 Swift prior art in the corpus (what the rules would translate against)

Command: `python3 cli2.py` (per-file regex over comment-blanked product code; counts are hits, not call sites). 40 repos, 11,921 files. Selected columns:

| Pattern | container | containerization | arg-parser | container-plugin | swiftly | SwiftPM | nio | system | corpus hits / repos |
|---|---|---|---|---|---|---|---|---|---|
| `exit(` call | 1 | 0 | 5 | 0 | 4 | 8 | 0 | 0 | 64 / 14 |
| `ExitCode` type | 8 | 8 | 17 | 2 | 0 | 32 | 0 | 0 | 94 / 13 |
| `AsyncParsableCommand` | 24 | 35 | 15 | 1 | 4 | 9 | 0 | 0 | 259 / 16 |
| `Data.write(.atomic)` / `atomically:` | 16 | 8 | 2 | 0 | 13 | 3 | 0 | 0 | 121 / 19 |
| `rename`/`renameat` calls | 1 | 0 | 0 | 0 | 0 | 0 | 19 | 0 | 49 / 7 |
| `moveItem(at:` | 3 | 3 | 0 | 0 | 3 | 0 | 6 | 0 | 35 / 8 |
| `fsync`/`fdatasync`/`F_FULLFSYNC`/`.synchronize()` | 1 | 2 | 0 | 0 | 2 | 0 | 12 | 0 | 19 / 6 |
| `O_EXCL` / `.exclusiveCreate` | 0 | 3 | 0 | 0 | 0 | 0 | 6 | 10 | 29 / 6 |
| `makeSignalSource` | 0 | 5 | 0 | 0 | 0 | 1 | 0 | 0 | 12 / 5 |
| `signal(SIG…)` / `sigaction` | 5 | 2 | 0 | 0 | 0 | 4 | 0 | 0 | 20 / 7 |
| `SIGPIPE` | 1 | 2 | 0 | 0 | 0 | 1 | 4 | 0 | 12 / 6 |
| `FilePath` (swift-system) | 228 | 120 | 1 | 0 | 157 | 37 | 455 | 153 | 1,196 / 11 |
| `Process()` | 8 | 1 | 5 | 1 | 2 | 2 | 0 | 0 | 50 / 16 |
| `terminationStatus` | 9 | 1 | 8 | 1 | 62 | 3 | 0 | 0 | 147 / 17 |
| `terminationReason`/`.uncaughtSignal` | 0 | 0 | 1 | 2 | 1 | 3 | 0 | 0 | 62 / 10 |

Spot-read of 3 hits per pattern (diversified: highest-count repo, median repo, lowest-count repo), false-positive rate observed:
`exit(`: 1 of 3 false (a method named `exit`, `sourcekit-lsp@c6ce93d5f8aa:Sources/SourceKitLSP/SourceKitLSPServer.swift:1181`); `ExitCode`: 0 of 3 (one hit sits in a DocC tutorial snippet,
`grpc-swift-2@ac33066eb6ed:Sources/GRPCCore/Documentation.docc/Tutorials/Route-Guide/Resources/route-guide-sec05-step04-load-features.swift:17`, which the filter did not drop);
atomic write: 0 of 3 (`container@f70ecbb926d9:Sources/Services/ContainerAPIService/Client/PacketFilter.swift:107` `write(toFile:atomically:true)`);
`rename`: 1 of 3 (a syscall-wrapper declaration, `swift-nio@e12881f2a691:Sources/_NIOFileSystem/Internal/System Calls/Syscall.swift:98`); `moveItem`: 1 of 3 (declaration,
`swift-foundation@aadd9259be07:Sources/FoundationEssentials/FileManager/FileManager+Bridge.swift:90`); `fsync` family: **3 of 3 are not a durable-write call site** (`.synchronize()` on a terminal
`container@f70ecbb926d9:Sources/TerminalProgress/ProgressBar+Terminal.swift:88`, on a log handle `tuist@2f6ac74754bf:cli/Sources/TuistLogging/Logger.swift:149`, and a nio syscall wrapper declaration
`swift-nio@e12881f2a691:Sources/NIOFS/FileSystemError+Syscall.swift:308`); `makeSignalSource`, `SIGPIPE`, `terminationReason`: 0 of 3. Treat the `fsync` row as an upper bound.

Findings worth carrying into the rules:

- **Exit codes**: the OCX-family pattern (64/65/69/74/75/77/78) has no equivalent table in any Swift CLI measured; the mechanism does exist: ArgumentParser's `ExitCode(Int32)` plus `exit(withError:)` (`swift-argument-parser@efd239f0055b:Sources/ArgumentParser/Parsable Properties/Errors.swift:40-60`, `Parsable Types/ParsableCommand.swift:163`).
- **Signal status**: `container@f70ecbb926d9:Sources/TerminalProgress/ProgressBar+RestoreCursor.swift:28-34` installs `signal(SIGINT, handler)` where the handler calls `exit(signal + 128)`; EXIT-11 asks for restore-`SIG_DFL`-and-re-raise instead, and `exit()` inside a C signal handler is not async-signal-safe (unverified: read only).
- **Broken pipe**: five exemplars ignore SIGPIPE (`signal(SIGPIPE, SIG_IGN)`: `container@…:Sources/Plugins/RuntimeLinux/RuntimeLinuxHelper+Start.swift:65`, `containerization@3e7bc39e66b3:vminitd/Sources/VminitdCore/AgentCommand.swift:79`,
  `swift-package-manager@5546f44a3b52:Sources/SwiftPMBuildServer/DisableSigpipe.swift:25`, `sourcekit-lsp@c6ce93d5f8aa:Sources/SwiftExtensions/DisableSigpipe.swift:25`, `swift-nio@e12881f2a691:Sources/NIOPosix/SocketProtocols.swift:92`); none turns EPIPE into the "clean exit 0" of CLI-05.
- **CAS / ingest** (STATE-5, -28 to -33): `containerization@3e7bc39e66b3:Sources/ContainerizationOCI/Content/ContentWriter.swift:98` creates with `O_WRONLY|O_CREAT|O_EXCL`; `LocalContentStore.swift:196-197` ingests with `fileExists` then `moveItem` (check-then-act, PLAT-08).
- **Download durability**: `swiftly@c8cf2e35bfca:Sources/SwiftlyCore/HTTPClient.swift:716` calls `fileHandle.synchronize()` after streaming a download; no directory sync anywhere in the four CLI repos.
- **Typed error with cause**: `ContainerizationError(.internalError, message:, cause:)` (`containerization@3e7bc39e66b3:…/ContentWriter.swift:101-104`) is the nearest Swift analogue of the chained-error rendering CLI-03.

### 5.2 Swift 6.4 / Linux measurements (fixtures under `fixtures/config-inventory/`)

All commands run through `run.sh`; fixtures `streams/main.swift` (6 write modes), `misc/main.swift`, plus the `math` example of `swift-argument-parser@efd239f0055b`
built with `swift build --product math --scratch-path …/build/config-inventory-argparser`.

| Experiment | Command (abbrev.) | Result |
|---|---|---|
| ArgumentParser parse failure | `math bogus x`, `math add 1 x` | exit **64**; `math add 1 2` exit 0 |
| Exit code source | `Platform.exitCodeValidationFailure` | `EX_USAGE` on Unix, `ERROR_BAD_ARGUMENTS` on Windows, `EXIT_FAILURE` on WASI (`Sources/ArgumentParser/Utilities/Platform.swift:155-163`); `exit` is `Glibc/Darwin/Musl.exit`, `ucrt._exit` on Windows (`:170-180`); Windows and WASI are read-only |
| Closed downstream pipe (`./streams <mode> \| head -c0`) | modes `print fputs fh-legacy fh-throwing print-flush-check` | producer killed by SIGPIPE, **exit 141**, in all 5; with `signal(SIGPIPE, SIG_IGN)`, `FileHandle.write(contentsOf:)` throws `NSCocoaErrorDomain 512` wrapping `NSPOSIXErrorDomain 32` (EPIPE) and a handler can exit 0 |
| Full disk (`> /dev/full`) | `print`, `fputs` | exit **0**, no diagnostic: silent loss; `fflush(stdout)` after `print` also returned 0 here |
| | `FileHandle.standardOutput.write(_:)` (legacy) | fatal error `Foundation/FileHandle.swift:709` `'try!' expression unexpectedly raised`, **exit 132** (SIGILL) |
| | `try FileHandle.standardOutput.write(contentsOf:)` | throws `NSCocoaErrorDomain 640`; handler exited 74 |
| `exit(3)` with a live `deinit` object and `defer` | `misc exit` | exit 3, **neither `defer` nor `deinit` ran**; normal return runs both |
| `fatalError` | `misc fatal` | SIGILL, exit 132, no `deinit`, no unwinding |
| XDG directories via `FileManager.urls(for:)` | `misc dirs` with `HOME`/`XDG_*` set | `cachesDirectory` → `$XDG_CACHE_HOME` or `~/.cache`; `applicationSupportDirectory` → `$XDG_DATA_HOME` or `~/.local/share` (a **data** dir, not config); `libraryDirectory` → empty; `documentDirectory` ignores `HOME` (passwd entry) |
| Unicode path-key equality | `"\u{e9}" == "e\u{301}"` | `==` true, `hashValue` equal, `utf8` arrays differ (String is canonical-equivalence aware; the filesystem is not) |
| `interface_leak.py --help-walk` on an ArgumentParser binary | `python3 rules/code-docs/checks/interface_leak.py --help-walk "<math>"` | "0 findings"; the walk's `COMMANDS_RE` accepts `SUBCOMMANDS:` (`interface_leak.py:308`), ArgumentParser's heading |
| `Data.write(to:options:.atomic)` mechanism | read `swift-foundation@aadd9259be07:Sources/FoundationEssentials/Data/Data+Writing.swift` | temp file opened `O_CREAT|O_EXCL|O_RDWR` (`:214,278`), `fsync(fd)` (`:403`, the file's only `fsync(` call), `renameat` (`:669`); **no directory fsync**; Windows branch uses `_commit` (`:392-395`) |

Not measured (no strace, no macOS, no Windows): whether the `.atomic` temp lives in the target's directory on every platform (the code pins a temp dir fd, `:587`), `clonefile`/reflink behaviour, Windows publish-rename, `com.apple.quarantine`.

### 5.3 Rule-by-rule translation: `cli-contract.md`, `durable-state.md`, `platform-and-paths.md`

Legend: **D** translates directly (the contract is language-neutral); **M** needs a Swift mechanism (named); **R** Rust-only, no Swift counterpart. IDs are the rules' own; imperatives shortened. Source: `rules/rust-quality/{cli-contract,durable-state,platform-and-paths}.md` (27 + 25 + 41 = 93 ID rows; some `STATE-18…27`/`PLAT` numbers are unassigned gaps in the originals, not missing rows).

**cli-contract.md (EXIT 11, CLI 16)**

| ID | Imperative | Swift | Mechanism / note |
|---|---|---|---|
| EXIT-01 | every exit value from one shared `ExitCode` enum | M | own `enum ExitStatus: Int32` wrapped in ArgumentParser's `ExitCode(rawValue:)` (`Errors.swift:40`) |
| EXIT-02 | `main` returns the exit code | M | `@main` + `run()` throws `ExitCode`; framework calls `exit(withError:)` → `Platform.exit` (`ParsableCommand.swift:163`) |
| EXIT-03 | parse with the non-exiting parse API | M | `parseAsRoot`/`parse` throw; default `main()` exits itself; parse failure = 64 on Unix (measured), differs on Windows/WASI |
| EXIT-04 | no meaning for 1, 2 or >= 100 | D | `ExitCode.failure` = `EXIT_FAILURE` = 1 is the fall-through |
| EXIT-05 | never `.unwrap()` `ExitStatus::code()` | M | `Process.terminationStatus` + `terminationReason` (`.exit` vs `.uncaughtSignal`); 62 hits in 10 repos |
| EXIT-06 | codes are append-only | D | |
| EXIT-07 | fall-through locked by a test; exhaustive classification | M | exhaustive `switch` without `default` (compiler-enforced; `@unknown default` for non-frozen enums) |
| EXIT-08 | one taxonomy per workspace | D | |
| EXIT-09 | classifier is a function or a trait | D | free function or protocol extension |
| EXIT-10 | each code documented and tested by a real invocation | D | |
| EXIT-11 | signal-derived status: restore `SIG_DFL`, re-raise | M | `DispatchSource.makeSignalSource` (12 hits/5 repos) or `swift-service-lifecycle` `UnixSignal`/`ServiceGroup` (`Sources/UnixSignals/UnixSignalsSequence.swift:123`); prior art uses `exit(sig+128)` instead |
| CLI-01 | result on stdout, rest on stderr | D | inject the writer; `print` is process-global |
| CLI-02 | under `--format json` stdout is only the payload | D | |
| CLI-03 | render the error chain once at the boundary, sanitized | M | Swift errors carry no `source()` chain; need an explicit `cause` field (ContainerizationError pattern) |
| CLI-04 | structured errors use the pinned stdout envelope | D | `Codable` |
| CLI-05 | closed stdout pipe is a clean exit 0 | M | **measured**: default dies 141; `signal(SIGPIPE, SIG_IGN)` then catch EPIPE from `write(contentsOf:)` |
| CLI-06 | locked buffered writer, explicit flush | M | `print`/`fputs` swallow write errors (exit 0 on `/dev/full`); legacy `FileHandle.write(_:)` crashes; use `write(contentsOf:)` and check |
| CLI-07 | colour from one library plus `--color auto/always/never` per stream | M | no `anstream` equivalent in the stdlib; `isatty` in 17 hits/7 repos; hand-rolled |
| CLI-08 | progress to stderr, suppressed off-TTY / `CI` / machine flag | M | `container`'s `TerminalProgress` module is the prior art |
| CLI-09 | never prompt without a TTY; ship `--yes` | M | `isatty(STDIN_FILENO)`; ArgumentParser has no prompt |
| CLI-10 | global flags in one struct flattened into every subcommand | M | `@OptionGroup` (`Parsable Properties/OptionGroup.swift`) |
| CLI-11 | never take a secret through a flag or plain env | D | |
| CLI-12 | `///` on a clap-facing surface states only the user contract | M | help text comes from `help:`/`abstract:`/`discussion:` strings, not doc comments (container: 228 `help:` strings against 362 `@Option/@Flag/@Argument` declarations); code-docs SRF applies to those strings |
| CLI-13 | config/cache/data paths from `ProjectDirs` | M | `FileManager.urls(for:)` gives XDG cache and **data** only (measured); no config-dir API, handle `XDG_CONFIG_HOME` yourself |
| CLI-14 | completions and man pages from the parser model | D | ArgumentParser has completion generation; `Package.swift:22,25` declares `GenerateDoccReference` and `GenerateManual` plugins |
| CLI-15 | layer config before the parser | D | |
| CLI-16 | output within ~100 ms for network commands | D | |

**durable-state.md (rows present: 25)**

| ID | Imperative | Swift | Mechanism / note |
|---|---|---|---|
| STATE-1 | one durable-write helper for cache/lock/install-tree writes | M | wrap `Data.write(options:.atomic)` or own `open/write/fsync/rename`; Foundation's version fsyncs the file, not the directory |
| STATE-2 | temp file in the target's own directory | M | `.atomic` pins a temp dir fd (`Data+Writing.swift:587`); `FileManager.replaceItemAt` for existing targets; unverified per platform |
| STATE-3 | fsync temp, rename, fsync parent directory | M | `fsync(fd)` available via Glibc; directory `open(O_DIRECTORY)`+`fsync` is manual; Foundation does only the first half (measured by reading) |
| STATE-4 | failed fsync is fatal for that data | D | throw, never retry |
| STATE-5 | multi-file install = CAS + one visible rename | D | containerization is CAS prior art (`LocalContentStore.swift:196`) |
| STATE-6 | verify digest of the assembled blob after a resumed download | D | |
| STATE-28 | persist-if-absent for CAS blobs | M | `O_EXCL` (29 hits/6 repos; swift-system `.exclusiveCreate`, `FileDescriptor.swift:606`) |
| STATE-29 | `EEXIST` from a CAS persist is success | D | catch `Errno.fileExists` |
| STATE-30 | digest path absent until content verified | D | |
| STATE-31 | store blobs read-only after persist | M | `FileManager.setAttributes([.posixPermissions])` / `fchmod`; Windows semantics unverified |
| STATE-32 | GC liveness from references, not `st_nlink` | D | |
| STATE-33 | verify digest on write, opt-in on read | D | |
| STATE-34 | reflink, then hardlink, then copy, by catching failure | M | `copyfile`/`clonefile` Apple-only; Linux `FICLONE` ioctl; unverified: read only |
| STATE-35 | no reliance on undocumented Windows link behaviour | D | Windows unverified here |
| STATE-7 | staging under one fixed location; no reliance on handlers/Drop to remove it | D | measured: `exit()` runs neither `defer` nor `deinit` |
| STATE-8 | orphan sweep at the start of every run | D | |
| STATE-9 | no lock for CAS blob writes | D | |
| STATE-10 | network-filesystem cache dir: detect or document | D | |
| STATE-11 | no panic in `Drop` | R | Swift `deinit` cannot throw and `fatalError` does not unwind (measured) |
| STATE-12 | explicit `close()`/`commit()` returning `Result` | M | `deinit` cannot be `async` or `throws`; same shape needed |
| STATE-13 | `debug_assert` bomb in `Drop` guarded by `!panicking()` | R | no unwinding to guard against |
| STATE-14 | `panic = "abort"` only on profiles without Drop cleanup | R | Swift always traps; no unwind profile |
| STATE-15 | never `exit` after a Drop-bearing guard exists | D | **measured**: `exit(3)` skips `defer` and `deinit` |
| STATE-16 | `.lock().unwrap()` carries a poison policy | R | `Synchronization.Mutex` has no poisoning (read only) |
| STATE-17 | do not migrate `once_cell` Lazy to `LazyLock` unaudited | R | globals are lazy by language rule |

**platform-and-paths.md (rows present: 41)**

| ID | Imperative | Swift | Mechanism / note |
|---|---|---|---|
| PLAT-01 | never join an external-origin component onto a trusted root | M | `FilePath.lexicallyResolving(_:)` (`FilePathSyntax.swift:420`) returns nil on escape; `URL.appendingPathComponent("../x")` does not |
| PLAT-02 | reject `ParentDir`/`RootDir`/`Prefix` before any filesystem call | M | `FilePath.Component`, `lexicallyNormalized()` (`:388`) |
| PLAT-03 | `debug_assert!` never the sole guard | R | Swift `assert`/`precondition` split; same intent as D |
| PLAT-04 | deny `clippy::join_absolute_paths` | R | no lint; SwiftLint has no equivalent (unverified) |
| PLAT-07 | build paths with `join`/`push` only | M | `FilePath.appending`, never string `+` |
| PLAT-08 | every check-then-act on a path is a bug | D | `containerization` `fileExists` then `moveItem` is the live example |
| PLAT-09 | final permissions in the creation call | M | `FileDescriptor.open(…, permissions:)`, `open(path, flags, mode)` |
| PLAT-10 | every fs error carries the path | M | `CocoaError` carries `filePath`; swift-system `Errno` does not |
| PLAT-20 | never build a `\\?\` path by string manipulation | D | Windows unverified |
| PLAT-17 | reject Windows reserved device names (with extensions) | D | |
| PLAT-41 | reject case-insensitive name collisions in an extraction | D | |
| PLAT-11 | lossy vs strict by call-site class | M | `String(decoding:as:)` repairs; `String(validatingUTF8:)`/`FilePath` platform strings are strict |
| PLAT-12 | every lossy conversion carries `LOSSY-OK:` | D | |
| PLAT-05 | never decide containment with `==` or string prefix | M | `FilePath.starts(with:)` is component-wise (`FilePathSyntax.swift:68`) |
| PLAT-06 | canonicalize displayed/handed-off paths (`dunce`) | M | `URL.resolvingSymlinksInPath()` / `realpath`; Windows verbatim-prefix behaviour unverified |
| PLAT-23 | case-fold and NFC-normalize package-name keys | M | `String` `==`/hash are canonical-equivalence aware (measured) but bytes differ; normalize the stored key |
| PLAT-14 | retry rename/delete on sharing violation | D | Windows only, unverified |
| PLAT-15 | replacement writes: temp, flush, rename | D | |
| PLAT-34 | Windows durable-publish sequence | D | unverified |
| PLAT-35 | Windows publish-rename = `std::fs::rename` or its fallback | R | Rust std detail; Swift equivalent is Foundation's `MoveFileExW` branch, unverified |
| PLAT-36 | no `FlushFileBuffers` on a directory handle | D | unverified |
| PLAT-16 | self-update never overwrites the running `.exe` | D | swiftly self-update is prior art (unread) |
| PLAT-19 | "atomic" claims name the API guarantee | D | |
| PLAT-37 | open with `FILE_SHARE_DELETE` where later renamed | D | unverified |
| PLAT-43 | Windows hardlink limits are ordinary outcomes with a copy fallback | D | unverified |
| PLAT-18 | hardlink or junction first | D | unverified |
| PLAT-38 | classify reparse points by the name-surrogate bit | D | unverified |
| PLAT-39 | no unconditional `read_link()` after `is_symlink()` on Windows | M | `FileManager.destinationOfSymbolicLink`; unverified |
| PLAT-40 | Windows containment walks component-by-component | D | unverified |
| PLAT-42 | archive link entries get the full containment check on the source | D | |
| PLAT-27 | monotonic `Instant` for elapsed/TTL/timeouts | M | `ContinuousClock`/`SuspendingClock`, never `Date()` |
| PLAT-28 | never unwrap `SystemTime::duration_since` | R | `Date` arithmetic does not fail |
| PLAT-29 | mtime never the only staleness gate | D | |
| PLAT-30 | one datetime crate in the graph | M | one of Foundation `Date` or a package |
| PLAT-31 | persisted timestamps RFC 3339 with `Z` | M | `Date.ISO8601FormatStyle` |
| PLAT-32 | registry time values are untrusted | D | |
| PLAT-21 | job-object shim launcher on Windows | D | Windows unverified |
| PLAT-22 | one explicit `com.apple.quarantine` posture | M | macOS only; read-only |
| PLAT-24 | cache/config dirs from one platform module | M | see CLI-13: Foundation XDG gaps |
| PLAT-25 | divergence behind a named platform module | M | `#if os(…)` / `canImport(Glibc)` (the ArgumentParser `Platform` enum is the pattern) |
| PLAT-26 | CI runs the replace/extract/link/self-update paths on Windows and macOS | D | Linux is the only locally measurable leg |

Counts: of 93 rows, **D 44, M 41, R 8** (R = STATE-11, 13, 14, 16, 17, PLAT-03, 04, 28; PLAT-35 counted R as well, so R = 9 and D = 43). Row-level tally in the tables above; the counts were summed by hand, not by script.

## 6. Swift-adjacent material in the catalog

### 6.1 Hits

Command: `python3 -I` walk of `rules skills docs` with `re.I` pattern `swift|xcode|spm|cocoapods` (the task's `grep -rn -i` wrapper is rewritten by the shell hook, so the equivalent was scripted):
**9 hits in 6 files**, none in a rule or skill body.

| File:line | Hit |
|---|---|
| `rules/code-docs.md:21` | `- "**/*.swift"` in the 56-glob list |
| `docs/code-docs.md:14` | "Python, TypeScript and JavaScript, Go, Java, Kotlin, Swift, C# …" |
| `docs/code-docs-essentials.md:21` | "source no language set's rules load on yet: Swift, C#, Scala" |
| `rules/code-docs/checks/comment_census.py:118,204,237,250` | `.swift` → `swift`; `swiftlint:` in `DIRECTIVE_RE`; `"swift": re.compile(r'//|/\*|"""|"|\{|\}')`; `/`-prefixed doc lines |
| `rules/code-docs/checks/interface_leak.py:165` | `swift` among source extensions for path tokens |
| `rules/cmake-build/install-and-export.md:79` | "needs `Ninja Multi-Config` (or Visual Studio or Xcode)" |

Per-file counts: comment_census.py 4; one each in the other five. Zero hits for: SwiftUI, UIKit, Observation, DocC, SwiftPM, Package.resolved, XCTest, Swift Testing, TSan-for-Swift, swift-format (the `swiftlint:` directive is the only tool name). `swiftlint:` in the census means the code-docs ratchet already treats a SwiftLint directive as a non-prose comment.

### 6.2 What code-docs would do to a Swift doc comment, measured

`code-docs` loads on every `.swift` edit (`rules/code-docs.md:21`). Its caps (`rules/code-docs.md:160-166`): plain block 5 lines; doc block 10; public item in a library-kind package 15; `Caps` counts `///` as doc (`comment_census.py:250`).
Swift gaps found in the checks:

1. **No visibility detector**: `_public()` returns `None` for any language outside `rust ts js go java kotlin` (`comment_census.py:1052-1053`), so the 15-line library tier (LEN-02) never applies to a Swift `public`/`open`/`package` item; every Swift doc block is held to 10.
2. **No Swift signature sections**: `strip_count` reads `_HEADS.get(lang)` (`comment_census.py:893`); LEN-07 lists Rust `# Errors`, Python `Args:`, JSDoc `@param`, Javadoc `@param`, and no DocC `- Parameter(s):`, `- Returns:`, `- Throws:` (`rules/code-docs/length.md:123`). Fenced code is skipped (`stripped` column > 0 for swift-argument-parser: 293 lines).
3. **Interface text is `help:` strings**, not doc comments (§5.3 CLI-12); the census's interface kind recognizes clap, schemars and click only (`comment_census.py` `RUST_IFACE_RE`, `PY_IFACE_DECOR_RE`), so an ArgumentParser tree has no interface blocks.
4. SRF-01 forbids intra-doc links on raw-copy surfaces but exempts "published API docs" whose "renderer's cross-references" stay (`rules/code-docs/surfaces.md:102`); DocC's double-backtick ``Symbol`` links are therefore allowed in doc comments (7.8% of blocks use them).

`python3 docblocks.py` (consecutive-`///` blocks, blank `///` lines included, product code only; `/** */` blocks not counted; an approximation of the census, not the census):

| Measure | Corpus total | Highest repos |
|---|---|---|
| `///` blocks | 56,929 | swift-build 6,083; swift-package-manager 4,927; element-x-ios 4,114 |
| over 10 lines (LEN-02 doc cap) | 3,486 (6.1%) | swift-collections 721; swift-testing 388; swift-nio 381 |
| over 15 lines | 1,664 (2.9%) | swift-collections 402 |
| with a `- Parameter(s)/Returns/Throws` line | 9,266 (16.3%) | swift-nio 1,279; swift-collections 1,200 |
| over 10 lines but <= 10 once those sections are dropped | 1,168 (33.5% of the 3,486) | swift-testing 167; swift-collections 201 |
| with a ``` ``Symbol`` ``` DocC link | 4,419 (7.8%) | swift-nio 663; swift-testing 556 |

Official census run (`comment_census.py --root <exemplar> --scope prod --report`): swift-argument-parser 60 doc/line blocks over cap, 1,045 lines, 293 stripped; swift-log 47 / 810 / 206; swift-service-lifecycle 4 / 81 / 0; swift-system 116 / 1,402 / 39 —
all four classified `app` (no `.code-docs.json` declares them `library`), so even a library is held to 10.

### 6.3 docs-quality versus DocC

`rules/docs-quality.md` globs `**/*.md` (`:2-3`), so every DocC catalog article loads it. Its page declaration is two HTML comments "inside the file's first 12 lines" (`:46-61`), and its example places them **above** the `#` title (`:47-54`).
Measured (Swift 6.4 `docc convert`, fixtures `Fix.docc`, `Fix2.docc`):

| Layout | `docc convert … --warnings-as-errors` | `doc_declaration.py` |
|---|---|---|
| comments above `# ``Fix```, as in docs-quality's example | exit **1**, `warning: An article is expected to start with a top-level heading title` on all 3 articles | clean for those two (the third, `Guide2.md`, lacks a tier: DOC-DISC-13) |
| comments directly after the `# Title` line | exit **0**, output rendered | clean |
| YAML front matter (docs-quality forbids it: DOC-TYPE-28) | warns too | n/a |

Corpus (`os.walk` for `*.docc/**/*.md`, no test filter): **70 catalogs, 1,057 articles**; 619 (58.6%) contain `## Topics`, 138 (13.1%) `@Metadata`, 227 (21.5%) `<doc:` links, **0** have YAML front matter.
`doc_declaration.py --root …/swift-argument-parser/Sources/ArgumentParser/Documentation.docc` reports **20 of 20** pages with `DOC-TYPE-01: no doc_type declaration`: today docs-quality either flags every DocC page or, per its own text, skips undeclared pages and "the gate reports green while nothing is checked" (`rules/docs-quality.md:41-42`).
A Swift set therefore needs one sentence in `swift-quality` or `docs-quality`: declare DocC pages after the title, or exempt `*.docc/**`. Authoritative in practice: the `docc` binary (it warns); the docs-quality example is the one to amend.

## Smells (ranked)

1. **Depth files carry no never-matching `paths` (136 of 141).** User memory `rules-dir-autoloads-recursively.md` (probe-measured 2026-09-27, not re-run here) says Claude Code loads every `.md` under `.claude/rules/` and that a rule's support directory installs verbatim there, so a depth file without `paths` loads in every adopter session. Only `code-docs` applies the fix (`rules/code-docs/guards.md:2-4`: `paths: ["**/.code-docs-depth-on-demand"]`, "This glob matches no file, so a client never auto-loads the file"). A Swift set that copies `go-quality`'s depth frontmatter would ship ~10 files x ~190 lines of always-loaded text.
2. **The checker caps neither depth files nor words** (§2.2–2.3): 49 of 141 depth files exceed 200 lines (max 292) and nix/cmake/go carry single table rows of 239–285 words. The 200-line index cap is satisfied by density: go-quality is 174 lines but 3,278 words (18.8 words/line) against rust-quality's 12.1.
3. **Docs disagree with config in four places**, in each case the config is authoritative: Rust `cli-contract.md:46` says exit codes "83–99 (unassigned)" while the SDK's `ExitCode` assigns 83–86 (`ocx-sdk-python@80136dde4162:src/ocx_sdk/_errors.py:48-51`); the SDK `CLAUDE.md` says v0.1 while `pyproject.toml:3` is 0.2.0; rules_swift README says "macOS and Linux" (`README.md:6`) while presubmit runs Windows (`.bazelci/presubmit.yml:20`); rules_swift's standalone-toolchain doc example says Swift 6.2.4 while `MODULE.bazel:259` pins 6.4.0.
4. **code-docs is half-wired for Swift** (`_public` and LEN-07 headings missing, §6.2): 1,168 of 3,486 over-cap Swift doc blocks would pass under the rules every other language gets.
5. **docs-quality's declaration example breaks `docc --warnings-as-errors`** (§6.3).
6. **Cross-set checker runs produce false citations** from unprefixed families (13 `DEP-nn`); only per-set runs are clean (§2.1).
7. **Skills sit at the cap**: nix-flake-release 499/500, go-diagnose 473/500 with no `references/`; a Swift diagnose skill needs `references/` from the start (nix-flake-adopt: 420 body + 520 reference lines).
8. **Python SDK and Go rule disagree on signal-killed children**: Python keeps a raw (negative) `exit_code`; GO-API-19 maps to `128+n`. The Swift SDK has to choose; `Process.terminationReason` makes the Go mapping straightforward.
9. rust-quality's older shape (NN rows cite `SEC family`/`EVO`, 4-column tables, no depth frontmatter on 18 files, unprefixed IDs) is the template **not** to copy; go-quality/nix-quality/kotlin-quality are the current shape.

## Patterns worth encoding

1. **Two-rule split by glob** (`swift-quality` on `**/*.swift`, `swift-package` on manifest and tool-config names), no CI-workflow glob; every other file is routed by task from the index.
2. **`SWIFT-<TOPIC>-nn` families**, 5-column tables, `SWIFT-CORE-01..03` opening the family list, a fenced `weaken-check`/`gate-files-touched`/`generated-touch` block (`rules/go-quality.md:110-119`).
3. **"Before trusting any rule below, read …"** keyed to the Swift analogue of the `go` line: `swift-tools-version`, `swiftLanguageModes` and the toolchain actually installed. Gate by exit status, never stdout (`rules/go-quality.md:55-56`).
4. **Gate block <= 10 lines with the exit/empty semantics per line, one named `check` target, pinned tool versions with a measurement date** (`rules/go-quality.md:37-64`).
5. **Routing by subject**, one row per depth file plus rows that leave the set (siblings, skills, `bazel-quality`, `docs-quality`).
6. **Skill = procedure + duplicated MUST table + "what agents get wrong"**, 380–480 body lines, `references/` for templates; every command watched red and green and stamped with versions.
7. **Bundle = untagged `./name` members, plus `code-docs` and `code-docs-cleanup`** (5 of 6 language bundles carry them); the bazel depth file is not a member.
8. **Never-matching `paths` on every depth file** (`rules/code-docs/guards.md:2-4`) and `title`+`summary` frontmatter.
9. **Mirror `go.md` for `bazel-quality/swift.md`**: scope guard, Owns paragraph, measurement disclosure naming which rows were run, `## Gaps`, `## What Agents Get Wrong Here`, minor version bump.
10. **Measured-mechanism rows for the CLI contract**: the Swift-specific facts in §5.2 (64 on Unix, SIGPIPE 141, silent `print` loss, `exit` skips `deinit`/`defer`, XDG data-not-config) are the rows an agent gets wrong by default and each has a runnable fixture.

## Contradictions of the frame

| # | Frame statement | Measured | Evidence |
|---|---|---|---|
| C1 | "Existing AI config that already touches this domain: None for Swift in the catalog." | `code-docs` already loads on every `**/*.swift` edit and its census lexes Swift, but with no public-item detector and no DocC signature sections; 6 files mention Swift | `rules/code-docs.md:21`; `comment_census.py:118,1052`; §6 |
| C2 | `swift-package` globs "CI workflows" | House convention: workflows are never globbed because the name says nothing about the language (`rules/rust-quality.md:109-114`); go-modules globs only tool-named workflow files; 39 of 40 exemplars have `.github/workflows` (287 files) so such a glob would load on every unrelated job | §1.6 #3, §2.4 |
| C3 | Globs on "`Package.swift`, `Package.resolved`, `.swift-format`, `.swiftlint.yml`, `.swiftformat`" | Also live in the corpus and absent from the frame: `Package@swift-*.swift` (8 repos, 15 files; **a `**/Package.swift` glob misses them**), `.spi.yml` (31 repos), `.swift-version` (6), `*.docc` catalogs (29 repos); `.swiftlint.yaml` has 0 | §2.4 |
| C4 | "the Rust `cli-contract` and `durable-state` depth files … a Swift CLI should mirror" | 93 rows: ~43 translate directly, ~41 need a Swift mechanism, ~9 are Rust-only (Drop/panic/poison/clippy/`std::fs::rename`). The parse-failure code is 64 only on Unix (`Platform.swift:155-163`: Windows `ERROR_BAD_ARGUMENTS`, WASI 1). And Rust cli-contract's "83–99 unassigned" is stale against the SDK (83–86 assigned) | §5.3 |
| C5 | "an OCX SDK for Swift mirroring `ocx-sdk-python`" | The Python SDK does not map signal-killed children (the Go rule does, `128+n`), enforces 100% coverage on Linux legs only, and its docstring-as-test mechanism (Sybil) has no Swift counterpart | §4 |
| C6 | Q5: `bazel-quality/swift.md` "same shape as `go.md`", "version bump" | Confirmed shape and a `0.3.0 → 0.4.0` minor bump per precedent; but Bazel is not in the toolchain image, so rows cannot be watched red the way go.md's were (go.md ran `bazel` 9.2.0). The rules_swift README contradicts its own CI | §3 |
| C7 | "docs-quality and code-docs (… DocC specifics are Swift's)" | DocC is **not** Swift's alone to specify: docs-quality's own declaration example fails DocC under `--warnings-as-errors`, and 20/20 DocC pages of the largest ArgumentParser catalog fail DOC-TYPE-01 | §6.3 |
| C8 | H1–H8 | **Not tested here.** No H-claim is within this audit's axes; no measurement in this file confirms or contradicts one. The nearest data: `.swift-format` is present in 24 of 40 exemplars and `.swiftlint.yml` in 4 (presence of a config file, not use of the tool) | §2.4 |

## Gaps

Axis 7: concerns from the frame's domain list with **no existing config anywhere in the catalog** (counts are case-insensitive regex hits across `rules/` + `skills/` minus fixtures, `python3 -I`; regexes are coarse, so a "0" is firm and a small number is a related-language mention).

| Concern | Existing config | Verdict |
|---|---|---|
| Swift language idioms (value/reference, generics, `some`/`any`, typed throws, noncopyable, `Span`, macros) | none | gap; `macros` regex hits (69) are Kotlin KSP/kapt, Rust proc-macro |
| Strict concurrency, `Sendable`, actors, `Mutex` | none for Swift; Go (29 hits in go-quality), Rust async, Kotlin coroutines are templates only | gap |
| Approachable-concurrency settings (6.2), `@MainActor` default isolation | none | gap |
| SwiftPM manifest, tools version, `swiftLanguageModes`, traits, plugins, `Package.resolved` | none (`traits/features` regex: 4 hits, Python/Rust extras) | gap |
| swift-format / SwiftLint / SwiftFormat gate | 1 hit (`swiftlint:` directive regex in code-docs census) | gap |
| Swift Testing vs XCTest, snapshot testing | none (`snapshot` regex: 81 hits, other languages) | gap |
| Coverage, sanitizers (TSan/ASan) | coverage generic in 20 sets; sanitizers in `bazel-quality/cpp.md` (32) and `cmake-build`, none Swift | gap |
| DocC | 0 hits | gap; **plus** docs-quality/code-docs conflicts (§6) |
| API-breakage checks (`swift package diagnose-api-breaking-changes`) | other languages: 61 hits (japicmp, semver-checks) | gap |
| Linux glibc, static Linux SDK (musl), Windows, Wasm SDK, Android SDK, Embedded Swift | musl 9, wasm 2 (`bazel-quality`), android 9 (cmake/kotlin), embedded 16 (no_std etc.) | gap; Windows/macOS CI guidance exists generically in rust-quality PLAT (81 hits) |
| Foundation on Linux, swift-system `FilePath`, XDG directories | none | gap (§5.2 measured) |
| Apple platforms: Xcode, SwiftUI, Observation, UIKit, XCFrameworks, availability | SwiftUI/UIKit/Observation 0; `xcodebuild/codesign/notarization` 3 (gradle-build) | gap, read-only depth by Q1 |
| Xcode project generation (Tuist, XcodeGen), `.xcodeproj`/`.pbxproj` | none | gap; tuist is 1 of 40 exemplars |
| Release and distribution: reproducible binaries, Docker images, signing, Homebrew | `go-release`, `go-modules` release depth (cosign, goreleaser) are templates; nothing Swift | gap |
| Bazel `rules_swift` | none in `bazel-quality` | gap (§3) |
| C interop seams (module maps, SwiftPM C targets) | `cpp-packaging`, `cmake-build` own C/C++ packaging only | gap; mark `covered-elsewhere` for the C side |
| OCX SDK for Swift | Python SDK exists; Go rule has GO-API-18..20 (version gate, signal exits, timeout cause) | template exists, no Swift artifact |
| Generic docs, CI, Bazel-core topics | `docs-quality`, `code-docs`, `bazel-quality` core, `rust-cargo` CI pattern | `covered-elsewhere`: do not duplicate |
| Plumbing: `assets/glyphs/swift.svg`, `assets/lore-swift.svg`, `docs/swift-*.md`, `SWIFT_CONSUMER` taskfile var, `publish.toml` entries | none | to build with the set (§1.5) |
| Measurement host for Apple-only claims | none (Linux only) | every Apple-only row is `unverified: read only` |

Open questions this audit could not close: whether the never-matching `paths` memory still holds on the current Claude Code (not re-probed); `rules_swift_package_manager` (cgrindel) is outside the 40-repo corpus; no Windows or macOS leg ran, so every PLAT-14..43 Swift row is unverified; the lore `bazel` binary is not in the Swift Docker image.
