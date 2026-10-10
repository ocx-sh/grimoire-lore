---
title: Swift exemplar corpus quality-gate audit (format, lint, tests, CI, coverage, warnings)
agent: exemplar-quality-gates (research-lang swift, wave 1 audit worker)
model: claude-sonnet-5-5
scope: >-
  40 upstream Swift repositories (blob-less depth-1 clones under
  ~/.cache/research-lang/exemplars/swift). Axes: formatter and linter config and
  enforcement, test-framework census, CI workflows, coverage, warnings policy, and
  live runs of swift-format / SwiftLint / SwiftFormat on 6 repos. Linux only
  (swift:6.4 image, swiftlint 0.65.1, swiftformat 0.63.1); no macOS, no Xcode, so
  every macOS/Xcode/iOS claim rests on reading workflow text.
method: |
  Every script lives in ~/.cache/research-lang/swift-tools/fixtures/exemplar-quality-gates/
  (call it $F) and runs as `python3 -I $F/<script>` with no arguments. Raw run output is in $F/runs/.
    1. sf.py        config presence + swift-format deltas vs `run.sh swift format dump-configuration > $F/default-swift-format.json`
                    (JSON parsed after stripping trailing commas: 3 repos ship trailing-comma JSON that swift-format accepts and Python rejects)
    2. tests.py     walks *.swift per repo (skips .git, .build; skips dirs Benchmarks|Fixtures|Resources|Snapshots|Inputs|TestData|Examples|
                    Vendor*|ThirdParty|Pods|Carthage|checkouts|Generated|Derived; skips *.pb.swift, *.grpc.swift and files whose first 600 bytes say
                    generated / DO NOT EDIT). A "test file" is a file with `import XCTest` or `import Testing`. Comments, string literals and
                    multi-line strings are stripped before matching; @Test/@Suite attribute text is paren-balanced for trait/arguments detection.
    3. fp.py        false-positive rate of the same patterns without stripping (raw grep vs stripped)
    4. ci.py ci2.py legs.py pins.py runners.py vers.py ev.py   workflow text analysis (comment lines removed); legs.py resolves reusable-workflow
                    defaults (apple/swift-nio unit_tests.yml, swiftlang/github-workflows@0.0.15 soundness.yml and swift_package_test.yml, fetched with
                    `gh api repos/swiftlang/github-workflows/contents/.github/workflows/<f>?ref=0.0.15`, tag SHA 9a10bfdc569159a3463f1273fbd7ed5f97fbe598)
    5. Package.swift scans: inline `python3 -I` blocks quoted in the sections below
    6. runall.sh    axis-6 runs, `timeout 900 $RUN swift format lint --recursive <src>` (own config auto-discovered, then
                    `--configuration $F/default-swift-format.json`), `swiftlint lint --quiet --reporter json <src>` (own / `--config $F/empty-swiftlint.yml` /
                    `--config $F/optin-all.yml`), `swiftformat --lint <src>` (own / `--config $F/empty.swiftformat`); parse_runs.py and agg.py count by rule
    7. `swiftlint rules` -> $F/rules.txt, `swiftformat --rules` -> $F/sfrules.txt
date_researched: 2026-10-10
---

# Swift exemplar quality gates: what 40 repositories actually enforce

Researched 2026-10-10. Citation form: `repo@sha12:path:line`, repo = directory name after `owner__`. All 40 exemplar HEADs were
re-verified against `swift-audit/scratch/exemplar-shas.md` with `git -C <clone> rev-parse HEAD` (0 mismatches). Swift-version-specific
statements carry the version. "swift-format" means the formatter bundled in the toolchain (`swift format`); the swift:6.4 image reports its version as `main`.

## Table of contents
- [Headline numbers](#headline-numbers)
- [Axis 1: formatter and linter config and enforcement](#axis-1-formatter-and-linter-config-and-enforcement)
- [Axis 2: test framework census](#axis-2-test-framework-census)
- [Axis 3: CI workflows](#axis-3-ci-workflows)
- [Axis 4: coverage](#axis-4-coverage)
- [Axis 5: warnings policy](#axis-5-warnings-policy)
- [Axis 6: running the formatters and linters](#axis-6-running-the-formatters-and-linters)
- [Smells (ranked)](#smells-ranked)
- [Patterns worth encoding](#patterns-worth-encoding)
- [Contradictions of the frame](#contradictions-of-the-frame)
- [Gaps](#gaps)
- [Appendix: SHAs measured](#appendix-shas-measured)

## Headline numbers

Corpus: 40 repos, 18,886 `.swift` files outside `.git`/`.build` (`find`, summed). The test census analyses 3,914 test files after dropping 4,344 files
(3,750 in excluded dirs, 254 `*.pb.swift`/`*.grpc.swift`, 340 with a generated header).

| # | Number | Command (script) |
|---|---|---|
| 1 | swift-format config in **24/40** repos, SwiftFormat **7/40**, SwiftLint **4/40** (+1 nested fixture in tuist); formatter config of any kind in 31/40 | `sf.py`, `ls -a` loop |
| 2 | The 24 `.swift-format` files normalise to **16 distinct** configs; 5 are one "nio house" config, 3 are one "swift-syntax house" config | `sf.py` (sha1 of normalised JSON) |
| 3 | lineLength: 120 in 15, 80 in 3, 180 in 2, 100/140/150/10000 in 1 each; indentation 4 spaces in 16, 2 spaces in 8 (default is 100 / 2) | `sf.py` |
| 4 | A swift-format CI gate exists in **21/40** repos (15 via `soundness.yml`, 5 own, 1 via `vapor/ci`); 10 repos carry formatter config but no PR-failing gate; 4 have no formatter at all | table in Axis 1 |
| 5 | Test functions: **22,585** XCTest `func test*` vs **21,325** `@Test` (Testing share **48.6%**); 16 repos are >=80% Testing, 16 are >=80% XCTest, 8 mixed | `tests.py` |
| 6 | Assertions: **55,888** `#expect` + **6,993** `#require` vs **39,193** `XCTAssert*`; **1,478** `@Test(arguments:)` (6.9% of `@Test`, in 28 repos) | `tests.py` |
| 7 | Swift Testing features in use: exit tests 238 (9 repos), `confirmation` 205 (8), `withKnownIssue` 234 (11), `.timeLimit` 99 (8), `.tags` 437 (3 repos), attachments 25 (2) | `tests.py` |
| 8 | `soundness.yml` is called by **22** repos (refs: 0.0.15 x12, main x4, 0.0.14 x2, 0.0.13 x2, 0.0.10, 0.0.7); `swift_package_test.yml` by 12; apple/swift-nio workflows by 10 | `grep -o 'uses:...workflows'` |
| 9 | Linux CI in 38/40, macOS 30, Windows **19**, Wasm SDK 15, Static Linux SDK 13 (+1 release-only), Android SDK **11**, FreeBSD 5, Embedded 2, nightly toolchains 22 | `legs.py` |
| 10 | GitHub Action pins: 881 tag, **177 SHA**, 27 branch (1,085 external action uses); only 6/38 repos are >=80% SHA-pinned; reusable workflows: 119 `@main`, 56 tag, 6 SHA | `pins.py` |
| 11 | `-warnings-as-errors` gates PRs in **12/40** repos; SE-0443 `.treatAllWarnings(as: .error)` in **1** (swift-aws-lambda-runtime); `.treatWarning` in 2 | grep listing in Axis 5 |
| 12 | Coverage collected in CI in 6 repos; **0** enforce a minimum; 1 sets a regression tolerance (element-x-ios `threshold: 1%`) | Axis 4 |
| 13 | Sanitizers in CI: TSan/ASan in 3 repos (swift-protobuf address+thread, SwiftLint buildkite TSan, hummingbird Dockerfile TSan) | grep in Axis 3 |
| 14 | API-breakage gate (`diagnose-api-breaking-changes`) effective in 15/40; DocC gate effective in 18/40 (one is vacuous, see Smells) | Axis 3 |
| 15 | SwiftLint 0.65.1 roster: **255** rules, 154 opt-in, 100 on by default, 5 analyzer, 94 correctable; swift-format: 43 rules, 31 on; SwiftFormat 0.63.1: 156 rules, 113 on, 37 off, 6 deprecated | Axis 6 |
| 16 | `swift format lint` without `--strict` exits 0 even with 3,445 findings (swift-log, default config) | `runs/apple__swift-log.swiftformat.default.txt` (`exit=0`) |
| 17 | Default SwiftLint on 6 repos: 2,300 findings, 37 rules; line_length 46.4%, identifier_name 18.8%; of 161 comment_spacing hits 158 are license banner lines | `agg.py` |

Extremes: most test files tuist (637), fewest swift-embedded-examples (1); most test units SwiftFormat (6,053), fewest swift-embedded-examples (7);
most workflow files tuist (106, mostly Elixir/infra), fewest 0 (sourcekit-lsp: CI lives on ci.swift.org, not in-repo); strictest lint gate SwiftLint
(`swift run swiftlint lint --strict`, test.yml:96), loosest Nuke (lint job "has never gated CI", ci.sh:452).

### Counting discipline and tool caveats
- Excluded everywhere: `.build/`, `Benchmarks/` fixtures, generated sources, vendored code, test fixture inputs (dir list in `method`). Axis 1 and 5 count config files at repo roots plus nested manifests outside `Tests|Examples|Fixtures|Benchmarks`.
- False-positive rate of the test patterns (raw vs comment/string-stripped, `fp.py`): `@Test` 2.88% (632 of 21,957 raw hits; 3 sampled hits were string literals inside swift-testing's own macro tests, e.g. `swift-testing@c7d68ca20cd7:Tests/TestingMacrosTests/TestDeclarationMacroTests.swift:45`), `#expect` 0.83%, `XCTAssert` 0.98%, `func test` 4.42% (commented-out tests, e.g. `Alamofire@bda9ed57d729:Tests/ServerTrustEvaluatorTests.swift:351`), `@Suite` 6.29%. The reported numbers are the stripped ones.
- Raw grep over-counts further when run over `Sources/`: `assertSnapshot(` has 217 raw hits but only the pointfree library itself uses the real function; swift-argument-parser (`Sources/ArgumentParserTestHelpers/TestHelpers.swift:562`) and JavaScriptKit define their own `assertSnapshot` helpers. A regex for "Quick/Nimble" matched `import QuickLook` (8 element-x files): real Quick/Nimble use is 0.
- SwiftLint here is the static Linux binary: it cannot load SourceKit (`warning: Skipping enabled rule 'statement_position' because it requires SourceKit and SourceKit access is prohibited`). 12 rules are skipped (11 opt-in plus default-on `statement_position`); analyzer rules (`unused_import`, `unused_declaration`) could not run at all (they need a compiler log).
- Harness pitfall found: the `rtk` shell wrapper reported "[ok] Files are identical" for two `.swift-format` files that differ (`cmp`/`/usr/bin/diff` show 26 differing lines, see Axis 1). Use `cmp`, `/usr/bin/diff`, and python for any comparison; `rtk grep -m1` over multiple files and `rtk find -not` also misbehave.

## Axis 1: formatter and linter config and enforcement

### 1a. Presence (hypothesis H4)
Command: `for d in */; do for f in .swift-format .swiftformat .swiftlint.yml .editorconfig .swift-version .spi.yml; do [ -e $d/$f ] && echo; done; done`

| Config | Repos | Notes |
|---|---:|---|
| `.swift-format` | 24 | all apple/ and swift-server/ repos except swift-system; plus vapor, hummingbird, grpc-swift-2, JavaScriptKit, swift-embedded-examples, swiftlang tools (format, syntax, sourcekit-lsp, build) |
| `.swiftformat` | 7 | Alamofire, IceCubesApp, element-x-ios, SwiftFormat, swiftly, swift-package-manager, tuist |
| `.swiftlint.yml` | 4 | element-x-ios, Nuke, SwiftLint, tuist (plus tuist `examples/` nested fixture, and 12 SwiftLint test fixtures under `Tests/`) |
| neither formatter | 9 | swift-system, swift-foundation, swift-testing, rules_swift, Nuke, SwiftLint, pointfreeco x3 |
| `.editorconfig` | 26 | agrees with the formatter's indentation in 24/24 repos where both are readable (`python3 -I` block, 2-space repos: argument-parser, async-algorithms, collections, grpc, sourcekit-lsp, swift-syntax, embedded-examples, pointfreeco x3 (2 spaces, 100 cols = swift-format defaults); 4-space: the rest) |
| `.swiftformatignore` | 6 | container-plugin, crypto, openapi-generator, grpc-swift-2, embedded-examples, lambda-runtime (read by `swiftlang/github-workflows` `check-swift-format.sh`) |
| `.swift-version` | 5 | containerization 6.3.0, swift-build 6.2.0, swiftly 6.4.0, SPM, embedded-examples (tool pinning, not language mode) |

H4 verdict is in "Contradictions of the frame": swift-format is **3.4x** more common than SwiftFormat and SwiftLint is the rarest of the three.

### 1b. swift-format: deviations from the shipped defaults (24 files)
Baseline = `swift format dump-configuration` (43 rules, 31 on). Command: `python3 -I $F/sf.py`.

| Default-on rule turned off | Repos | | Default-off rule turned on | Repos |
|---|---:|---|---|---:|
| AlwaysUseLowerCamelCase | 18 | | OmitExplicitReturns | 14 |
| UseLetInEveryBoundCaseVariable | 17 | | ValidateDocumentationComments | 7 |
| UseSynthesizedInitializer | 15 | | NeverForceUnwrap / NeverUseForceTry / NeverUseImplicitlyUnwrappedOptionals | 4 each |
| UseSingleLinePropertyGetter | 14 | | UseEarlyExits | 4 |
| UseExplicitNilCheckInConditions | 9 | | AlwaysUseLiteralForEmptyCollectionInit | 4 |
| AmbiguousTrailingClosureOverload | 8 | | AllPublicDeclarationsHaveDocumentation | 3 |
| NoBlockComments | 7 | | BeginDocumentationCommentWithOneLineSummary | 2 |
| DontRepeatTypeInStaticProperties | 6 | | | |

Settings changed vs default: `indentConditionalCompilationBlocks:false` 23/24, `lineLength` 23, `lineBreakBeforeEachArgument:true` 18, `tabWidth` 17, `indentation` 16, `prioritizeKeepingFunctionOutputTogether:true` 16, `lineBreakBeforeEachGenericRequirement:true` 13.
Extremes: swift-build has `"lineLength": 10000` and an empty `rules` block (`swift-build@2187330e13e7:.swift-format:3-9`: effectively a whitespace-only formatter); apple/container and containerization turn on the three `Never*` safety rules plus `ValidateDocumentationComments` (`container@f70ecbb926d9:.swift-format`).
`.swift-format` is JSON; 3 files (sourcekit-lsp, swift-format, swift-syntax) contain trailing commas that swift-format tolerates but strict JSON parsers reject.

Config reuse as a signal: argument-parser and embedded-examples keep a **byte-for-byte copy of apple/swift-mmio's config** and CI downloads upstream main and `diff`s it (`swift-argument-parser@efd239f0055b:.github/workflows/pull_request.yml:21-24`, `swift-embedded-examples@119b29f83550:.github/workflows/lint.yml:24-27`).

### 1c. SwiftFormat configs (7)
| Repo | Key options | Notes |
|---|---|---|
| Alamofire | `--swiftversion 6.0 --language-mode 5`, 10 `--disable` rules, `--enable isEmpty` | `Alamofire@bda9ed57d729:.swiftformat:4-5,29-41`; whole tree passes its own config (0/44 files) |
| IceCubesApp | `--indent 2` only | one line |
| element-x-ios | `--swiftversion 5.6`, 6 `--disable`, `--wraparguments after-first`, `--indent 4` | disables `docComments` ("converts regular comments into doc comments") `.swiftformat:8-10` |
| SwiftFormat | `--maxwidth none`, `--enable isEmpty,preferFinalClasses` | self-hosted, `.swiftformat:24,40-42` |
| swiftly | 10 options, `--disable andOperator,redundantExtensionACL,yodaConditions` | pinned **exact 0.49.18** (`swiftly@c8cf2e35bfca:Package.swift:36`) |
| swift-package-manager | `--swiftversion 5.9 --maxwidth 120 --self insert` | `.swiftformat:3,15,21` |
| tuist | `--maxwidth 130 --swiftversion 5.10`, 4 `--disable` (redundantReturn, hoistTry, hoistAwait, conditionalAssignment), `--enable blockComments,docComments` | `tuist@2f6ac74754bf:.swiftformat:7-11,44,49-50` |

### 1d. SwiftLint configs (4)
| Repo | disabled / opt-in / only | Thresholds and custom rules |
|---|---|---|
| element-x-ios | disabled 5 (trailing_whitespace, identifier_name, ...); opt-in 5 (force_unwrapping, explicit_init, ...) | line_length 250/1000, file_length 2000, function_body_length 100, type_body_length 1000; **7 custom_rules** (print/println/os_log bans -> MXLog, VStack/HStack explicit spacing, NavigationStack wrapper) `.swiftlint.yml:56-99` |
| Nuke | opt-in 17; disabled line_length, identifier_name, type_name | nesting 2, file_length 1000/1500, type_body_length 600/1000; reporter xcode |
| SwiftLint | `opt_in_rules: [all]` then 36 disabled; analyzer unused_declaration, unused_import | line_length default, function_body_length 60, closure_body_length 50/100, **4 custom_rules** (rule_id, fatal_error, rule_test_function, testable_import) `.swiftlint.yml:111-137` |
| tuist | opt-in no_grouping_extension; 9 disabled (line_length, file_length, nesting, cyclomatic_complexity, ...) | identifier_name max 60/80, function_body_length 50/200; custom rule no_fatal_error_in_tests (error) |

### 1e. CI enforcement per repo (hypothesis H4 second half)
"Gate" = a step that can fail a PR. `soundness` = `swiftlang/github-workflows/.github/workflows/soundness.yml`, whose `format-check` job (default **on**, `soundness-0.0.15.yml:90`) runs `swift-format format --in-place` then `swift-format lint --strict --parallel` then `git diff --exit-code '*.swift'` (`check-swift-format.sh`, upstream@9a10bfdc569159a3463f1273fbd7ed5f97fbe598).

| Repo | Formatter config | Lint config | CI gate (cite) |
|---|---|---|---|
| swift-log | swift-format 120/4sp | - | soundness `swift-log@4038b6a4f74a:.github/workflows/pull_request.yml:13` |
| swift-argument-parser | swift-format 80/2sp (= swift-mmio) | - | soundness :67 with nightly-6.4.x format image :71; `Scripts/format.sh:19-20` runs `format` then `lint --strict` |
| swift-async-algorithms | swift-format 120/2sp | - | soundness `@main` :23, format image nightly-main :26 (swift-format#1081 workaround) |
| swift-collections | swift-format 80/2sp | - | **soundness with `format_check_enabled: false`** `:77`: config present, gate off |
| swift-nio | swift-format 120/4sp | - | soundness @0.0.10 `:13` |
| swift-system | none | - | `format_check_enabled: false` `:122` |
| swift-crypto | swift-format 120/4sp | - | soundness @0.0.13 `:13` |
| swift-distributed-tracing | swift-format 120/4sp | - | soundness @0.0.15 `:13` |
| swift-protobuf | swift-format 120/4sp | - | own job `build.yml:141-146` (`format --in-place`, `lint --strict`) |
| swift-openapi-generator | swift-format 120/4sp | - | soundness `:13` |
| swift-foundation | none | - | soundness with format/docs/api/license off `pull_request.yml:76-82` |
| swift-format | swift-format 120/2sp | - | soundness @0.0.14 `:42` |
| swift-syntax | swift-format 120/2sp | - | soundness `:27` (defaults) |
| swift-testing | none | - | `format_check_enabled: false` `:47` |
| swift-package-manager | SwiftFormat 120 | - | soundness format off `:72`; only a local `Utilities/soundness.sh:46` that checks `git diff --name-only` files |
| sourcekit-lsp | swift-format 120/2sp | - | **no `.github/workflows`**; CI is external (ci.swift.org); unverifiable here |
| swiftly | SwiftFormat 0.49.18 pin | - | `pull_request.yml:189` `swift run swiftformat --lint --dryrun .` |
| swift-build | swift-format 10000/4sp, no rules | - | soundness format off `:124`; custom `space-format-check` (whitespace) `:126` |
| async-http-client | swift-format 120/4sp | - | soundness @0.0.13 `:13` |
| vapor | swift-format 140/4sp | - | `vapor/ci` `with_linting: true` `vapor@bf77fc69b142:.github/workflows/test.yml:52` (swift-format lint, falls back to vapor/contributing config) |
| hummingbird | swift-format 150/4sp | - | `scripts/validate.sh:39-40` runs `format --in-place` + `git diff`; **no `lint --strict`**, so lint-only rules are not gated |
| grpc-swift-2 | swift-format 100/2sp | - | soundness @0.0.7 `:14`; `dev/format.sh:58` |
| swift-aws-lambda-runtime | swift-format 120/4sp | - | soundness `:13`; `scripts/check-format.sh:50` `lint --strict` |
| swift-service-lifecycle | swift-format 120/4sp | - | soundness `:13` |
| swift-dependencies, swift-snapshot-testing, TCA | none (swift-format defaults via `make format`) | - | `format.yml` auto-commit bot (`composable-architecture@bc2db5ba8ad3:.github/workflows/format.yml:23-24`): fixes, never fails |
| Alamofire | SwiftFormat | - | **none** |
| Nuke | - | SwiftLint | `ci.yml:69-77` job `lint` (container `ghcr.io/realm/swiftlint:0.65.0`) -> `ci.sh:455` plain `swiftlint lint`, "Not --strict yet: SwiftLint has never gated CI" `.scripts/ci.sh:452` |
| SwiftLint | - | SwiftLint (self) | `test.yml:96` `swift run swiftlint lint --strict` |
| SwiftFormat | SwiftFormat | - | `validate_pr.yml:32` `swiftformat . --cache ignore --lint` |
| tuist | SwiftFormat | SwiftLint | `cli.yml:124-126` swiftformat `--lint`, swiftlint non-strict, plus `--only-rule no_fatal_error_in_tests` on tests |
| IceCubesApp | SwiftFormat (1 line) | - | **none** |
| element-x-ios | SwiftFormat | SwiftLint | Xcode build phases only: `ElementX/SupportingFiles/target.yml:215` `swiftlint`, `:226` `swiftformat --lint --lenient`; git hook `.githooks/pre-commit:5`; **no workflow step** |
| rules_swift | - | - | none for Swift; pre-commit runs buildifier + ruff |
| JavaScriptKit | swift-format 120/4sp | - | `test.yml:129-142` runs `./Utilities/format.swift` then `git diff --exit-code` |
| swift-embedded-examples | swift-format 80/2sp | - | soundness `lint.yml:31` + config diff vs swift-mmio |
| container, containerization | swift-format 180/4sp | - | CI: `make fmt` + `git diff --quiet` (`container@f70ecbb926d9:.github/workflows/common.yml:44-50`); local `make check` uses `.swift-format-nolint`, **a copy with every lint rule `false`** (`/usr/bin/diff` shows 26 differing lines) |
| swift-container-plugin | swift-format 120/4sp | - | soundness `:13` |

Summary (command: manual read of the table; counts re-derivable from `ev.py`/greps above): swift-format gate in 21 repos; SwiftFormat gate in 3 (swiftly, SwiftFormat, tuist); SwiftLint gate in 3 (SwiftLint strict, Nuke and tuist non-strict).
Config present, no PR-failing gate: swift-collections, sourcekit-lsp (external), swift-build, SPM, Alamofire, IceCubes, element-x-ios, TCA, swift-dependencies, swift-snapshot-testing = 10.

### 1f. Where docs and config disagree (config wins)
- `element-x-ios@14e33866ced2:CONTRIBUTING.md:153` says style is enforced "by running checks on the CI for every PR through PR Checks, SwiftLint, SwiftFormat and SonarCloud". `.github/workflows/pr-checks.yml` only runs a `github-script` PR-metadata check; lint is a build phase with `--lenient`. Authoritative: `target.yml:215-228`. `CONTRIBUTING.md:155` says coverage minimums will "eventually" be enforced; `codecov.yml:8` is a drop tolerance, not a minimum.
- `AGENTS.md:14` (element-x) says SwiftLint/SwiftFormat "enforce style on build"; true only in Xcode, not in `swift run tools ci unit-tests`.
- Nuke's CI job is named "SwiftLint" but the script comment states it has never gated (`ci.sh:452-453`).

## Axis 2: test framework census

Command: `python3 -I $F/tests.py` (counting rules in `method`). Hypothesis H3: "Swift Testing has overtaken XCTest for new tests in Apple/swiftlang repos but not in community libraries".

### 2a. By shape
| Group | Repos | XCTest files | Testing files | XCTest `func test*` | `@Test` | Testing share |
|---|---:|---:|---:|---:|---:|---:|
| apple/swiftlang core libraries | 11 | 431 | 235 | 5,509 | 3,359 | 37.9% |
| swiftlang tools | 7 | 515 | 686 | 6,565 | 5,899 | 47.3% |
| server | 6 | 89 | 148 | 872 | 1,584 | 64.5% |
| community libraries | 5 | 118 | 313 | 1,396 | 2,808 | 66.8% |
| tools (SwiftLint, SwiftFormat, tuist) | 3 | 443 | 507 | 7,853 | 3,923 | 33.3% |
| apps | 2 | 38 | 166 | 108 | 1,307 | 92.4% |
| platforms | 3 | 43 | 31 | 282 | 313 | 52.6% |
| Apple OCI tooling | 3 | 0 | 219 | 0 | 2,132 | 100% |
| **corpus** | 40 | 1,677 | 2,305 | 22,585 | 21,325 | **48.6%** |

Per-repo classification (Testing share of test units): **>=80% Testing (16)**: container, containerization, argument-parser, container-plugin, distributed-tracing, swift-log, element-x-ios 95%, hummingbird, Nuke, SwiftLint, lambda-runtime, swift-build, swift-foundation, swift-testing 87%, swiftly, vapor. **20-80% mixed (8)**: IceCubes 36%, async-algorithms 20%, grpc-swift-2 42%, TCA 31%, swift-format 40%, SPM 55%, JavaScriptKit 56%, tuist 63%. **>=80% XCTest (16)**: Alamofire 9%, collections 1%, crypto, nio 11%, openapi-generator, protobuf, swift-system 7%, rules_swift, SwiftFormat, swift-dependencies 16%, swift-snapshot-testing 19%, async-http-client 7%, service-lifecycle 3%, sourcekit-lsp 2%, embedded-examples, swift-syntax.
The split follows repository age, not organisation: the new Apple repos (container*, log, tracing, argument-parser, foundation) are Testing-first, the old ones (crypto, protobuf, nio, collections, syntax, sourcekit-lsp) are XCTest-first; the community server stacks (vapor, hummingbird) are 100% Testing.
Mid-migration (both frameworks in the same file): **68 files in 12 repos** (SPM 33, tuist 18, swift-testing 6 ...); SPM is the migration exemplar (1,732 `@Test` next to 1,392 `func test*`, 33 files import both).

### 2b. Feature census
| Feature | Count | Repos | Largest users |
|---|---:|---:|---|
| `@Suite` | 1,684 | - | swift-build 409, SPM 157, foundation 150, swift-testing 147 |
| `@Test(arguments:)` | 1,478 | 28 | SPM 608, swift-testing 153, tuist 143, containerization 118 |
| tests with any trait | 800 | 19 | SPM 463, swift-testing 55, tuist 42 |
| `.tags` | 437 | 3 | SPM 409 (central `Tag` extension), swift-testing 17, swiftly 11 |
| `.serialized` (on `@Test`) / on `@Suite` | 22 / 87 | 4 / - | |
| `.timeLimit` | 99 | 8 | vapor 71 |
| `.enabled(if:)` / `.disabled` / `.bug` | 65 / 107 / 99 | 14 / 10 / 5 | swift-build `.bug` 20 |
| `confirmation(` | 205 | 8 | swift-testing 90, element-x 65 |
| `withKnownIssue` | 234 | 11 | swift-testing 112, foundation 58 |
| exit tests `processExitsWith` | 238 | 9 | nio 41 (`apple__swift-nio` EventLoopTest), vapor |
| `Attachment.record` | 25 | 2 | swift-testing, swift-snapshot-testing |
| XCTest `expectation`/`wait(for:)`/`fulfillment(of:)` | 1,089 / 724 / 227 | 14 | Alamofire 689, async-algorithms 74 |
| XCTest `measure {}` | 32 | 7 | SwiftFormat 10 |
| XCUITest `XCUIApplication` | 30 | 2 | element-x-ios 29 |
| `assertSnapshot` (real library) / inline | 216 / 12 | 3 / 1 | swift-snapshot-testing itself; element-x-ios and tuist import `SnapshotTesting` (24 files, 4 repos) |
| `assertMacroExpansion` | 306 | 5 | swift-syntax 160 |
| TCA `TestStore` | 311 | 2 | TCA |
| `import Benchmark` (package-benchmark) | 50 files | 10 repos | foundation 18, vapor 16; `ordo-one/package-benchmark` is a manifest dependency of 7 repos (crypto, tracing, nio, grpc, TCA, foundation, SPM) |

Spot reads, 3 per pattern (all confirmed real): `@Test(arguments:)` `swift-log@4038b6a4f74a:Tests/InMemoryLoggingTests/MultiplexProviderRegressionTests.swift:20`, `sourcekit-lsp@c6ce93d5f8aa:Tests/BuildServerIntegrationTests/SwiftPMBuildServerTests.swift:240`, `swift-aws-lambda-runtime@8abd464310c7:Tests/AWSLambdaPluginHelperTests/ArchiveBackendTests.swift:36`; exit tests `vapor@bf77fc69b142:Tests/VaporTests/ApplicationTests.swift:18`, `hummingbird@1bd3b407fb47:Tests/HummingbirdTests/URLEncodedForm/URLDecoderTests.swift:344`, `swift-package-manager@5546f44a3b52:Tests/IntegrationTests/SwiftPMTests.swift:289`; `.timeLimit` `containerization@3e7bc39e66b3:Tests/ContainerizationTests/UnixSocketRelayTests.swift:73`.
Notes: XCTestCase subclassing a local base class is not counted in "XCTestCase classes" (1,060 is a lower bound); async XCTest methods are 4,587 of 22,585 (20%), so XCTest is not the "legacy sync" bucket.
Quick/Nimble: 0 in the corpus. ViewInspector: 0. swift-testing as a package dependency: 0 (the `Testing` module ships in the toolchain since Swift 6.0).

### 2c. Per-repo table
Columns: test files (XCTest-importing / Testing-importing / both).

| repo | group | test files (XC/T/both) | XCTest `func test*` | `@Test` | `@Suite` | Testing share | `#expect` | `XCTAssert*` | param `@Test(arguments:)` | other |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| swift-log | apple/swiftlang | 18 (0/18/0) | 0 | 174 | 5 | 100% | 291 | 0 | 4 |  |
| swift-argument-parser | apple/swiftlang | 62 (1/61/0) | 0 | 562 | 55 | 100% | 1501 | 6 | 11 | confirm=3 snap=1 |
| swift-async-algorithms | apple/swiftlang | 46 (33/13/0) | 361 | 91 | 15 | 20% | 159 | 529 | 0 | exit=3 measure=6 |
| swift-collections | apple/swiftlang | 54 (52/2/0) | 927 | 13 | 2 | 1% | 34 | 5 | 4 | exit=11 |
| swift-nio | apple/swiftlang | 171 (147/24/0) | 2440 | 315 | 14 | 11% | 938 | 9514 | 7 | exit=41 confirm=9 |
| swift-system | apple/swiftlang | 19 (17/2/0) | 101 | 8 | 2 | 7% | 115 | 417 | 0 |  |
| swift-crypto | apple/swiftlang | 71 (71/0/0) | 427 | 0 | 0 | 0% | 0 | 1556 | 0 |  |
| swift-distributed-tracing | apple/swiftlang | 10 (0/10/0) | 0 | 77 | 13 | 100% | 252 | 0 | 1 |  |
| swift-protobuf | apple/swiftlang | 77 (77/0/0) | 911 | 0 | 0 | 0% | 0 | 3899 | 0 |  |
| swift-openapi-generator | apple/swiftlang | 32 (32/0/0) | 337 | 0 | 0 | 0% | 0 | 560 | 0 |  |
| swift-foundation | apple/swiftlang | 106 (1/105/0) | 5 | 2119 | 150 | 100% | 9082 | 4 | 82 | exit=58 confirm=23 timeLimit=5 measure=5 |
| swift-format | swiftlang | 23 (16/7/0) | 101 | 66 | 10 | 40% | 197 | 187 | 2 | knownIssue=1 measure=1 |
| swift-syntax | swiftlang | 258 (257/1/0) | 3458 | 2 | 1 | 0% | 1 | 636 | 0 | knownIssue=1 macroexp=160 |
| swift-testing | swiftlang | 83 (6/83/6) | 135 | 928 | 147 | 87% | 1656 | 168 | 153 | exit=112 confirm=90 knownIssue=44 tags=17 timeLimit=1 |
| swift-package-manager | swiftlang | 273 (118/188/33) | 1392 | 1732 | 157 | 55% | 5062 | 6465 | 608 | knownIssue=160 tags=409 measure=3 |
| sourcekit-lsp | swiftlang | 119 (118/1/0) | 1479 | 32 | 1 | 2% | 33 | 1725 | 12 | measure=5 |
| swiftly | swiftlang | 23 (0/23/0) | 0 | 184 | 22 | 100% | 385 | 0 | 13 | tags=11 |
| swift-build | swiftlang | 383 (0/383/0) | 0 | 2955 | 409 | 100% | 9423 | 0 | 55 | exit=1 confirm=10 knownIssue=13 timeLimit=1 |
| async-http-client | server | 56 (51/5/0) | 595 | 42 | 2 | 7% | 95 | 4221 | 1 |  |
| vapor | server | 45 (0/45/0) | 0 | 628 | 50 | 100% | 1700 | 0 | 9 | exit=9 knownIssue=3 timeLimit=71 macroexp=38 |
| hummingbird | server | 37 (0/37/0) | 0 | 455 | 3 | 100% | 948 | 0 | 4 | exit=1 confirm=4 knownIssue=1 timeLimit=1 |
| grpc-swift-2 | server | 56 (32/26/2) | 204 | 146 | 34 | 42% | 287 | 433 | 62 |  |
| swift-aws-lambda-runtime | server | 34 (0/34/0) | 0 | 311 | 42 | 100% | 625 | 0 | 20 |  |
| swift-service-lifecycle | server | 7 (6/1/0) | 73 | 2 | 0 | 3% | 1 | 35 | 0 |  |
| swift-dependencies | community | 29 (23/8/2) | 167 | 33 | 10 | 16% | 34 | 227 | 6 | exit=2 knownIssue=5 XCUI=1 |
| swift-snapshot-testing | community | 27 (19/10/2) | 60 | 14 | 7 | 19% | 6 | 20 | 0 | knownIssue=4 snap=207 |
| swift-composable-architecture | community | 181 (45/137/1) | 408 | 182 | 3 | 31% | 4 | 389 | 0 | knownIssue=1 TestStore=308 |
| Alamofire | community | 35 (31/6/2) | 761 | 73 | 13 | 9% | 169 | 2366 | 1 |  |
| Nuke | community | 152 (0/152/0) | 0 | 2506 | 197 | 100% | 6131 | 0 | 100 | confirm=1 |
| SwiftLint | tools | 125 (0/125/0) | 0 | 858 | 123 | 100% | 1344 | 0 | 16 | macroexp=26 |
| SwiftFormat | tools | 170 (170/0/0) | 6053 | 0 | 0 | 0% | 0 | 1920 | 0 | measure=10 |
| tuist | tools | 637 (273/382/18) | 1800 | 3065 | 29 | 63% | 6437 | 3080 | 143 | timeLimit=8 measure=2 TestStore=3 |
| IceCubesApp | apps | 18 (13/7/2) | 44 | 25 | 3 | 36% | 112 | 92 | 1 |  |
| element-x-ios | apps | 184 (25/159/0) | 64 | 1282 | 0 | 95% | 3852 | 93 | 2 | confirm=65 timeLimit=6 macroexp=5 XCUI=29 |
| rules_swift | platforms | 5 (5/0/0) | 27 | 0 | 0 | 0% | 0 | 89 | 0 |  |
| JavaScriptKit | platforms | 68 (37/31/0) | 248 | 313 | 28 | 56% | 409 | 526 | 22 | snap=8 macroexp=77 |
| swift-embedded-examples | platforms | 1 (1/0/0) | 7 | 0 | 0 | 0% | 0 | 31 | 0 |  |
| containerization | Apple | 89 (0/89/0) | 0 | 846 | 58 | 100% | 2012 | 0 | 118 | timeLimit=6 |
| container | Apple | 122 (0/122/0) | 0 | 1222 | 75 | 100% | 2461 | 0 | 14 | knownIssue=1 |
| swift-container-plugin | Apple | 8 (0/8/0) | 0 | 64 | 4 | 100% | 132 | 0 | 7 |  |

## Axis 3: CI workflows

### 3a. Where the logic lives
26/40 repos delegate to an external reusable-workflow family (command: `grep -rhoE 'uses:\s*[^ ]+/\.github/workflows/[^ ]+'`, `pins.py`):
| Family | Repos | Defaults that matter (verified from source) |
|---|---:|---|
| `swiftlang/github-workflows` `soundness.yml` | 22 | **everything on by default**: api-breakage, docs, unacceptable-language, license-header, broken-symlink, format, shell, yamllint, python-lint (`soundness-0.0.15.yml:6,22,70,78,86,90,98,106,110`); default container `swift:6.3-noble` |
| `swiftlang/github-workflows` `swift_package_test.yml` | 12 | `linux_swift_versions` = 5.9, 5.10, 6.0, 6.1, 6.2, 6.3, nightly-main, nightly-6.4.x (`swift_package_test-0.0.15.yml:48`); `enable_windows_checks` default **true**; macOS/wasm/android/static-sdk/freebsd default off |
| `apple/swift-nio` `unit_tests.yml` + siblings | 10 | Linux 6.1, 6.2, 6.3, 6.4 + nightly 6.0, 6.1, next, main on; 5.9, 5.10, 6.0 off; **Windows all off** (`unit_tests.yml:9-169`) |
| `vapor/ci` `run-unit-tests.yml` | 1 | `with_tsan` default true, `with_coverage` false, `warnings_as_errors` false, `with_linting` false, API-breakage true (`vapor-ci-run-unit-tests.yml:20-44`) |

Version skew: the 22 `soundness.yml` callers pin 0.0.15 (12), `@main` (4), 0.0.14 (2), 0.0.13 (2), 0.0.10 (swift-nio `pull_request.yml:13`), 0.0.7 (grpc-swift-2 `:14`). The format-check toolchain image therefore varies per repo; argument-parser and async-algorithms override it to a nightly image to get an unreleased swift-format fix (`swift-argument-parser@efd239f0055b:.github/workflows/pull_request.yml:71`, `swift-async-algorithms@cbde9aed744b:.github/workflows/pull_request.yml:26`).

### 3b. Platform and toolchain legs per repo (effective, with family defaults resolved)
Command: `python3 -I $F/legs.py` plus the corrections noted below the table. Version strings seen (`vers.py`): Swift 5.x only in swift-nio (5.9, 5.10 images), SwiftLint (5.9, 5.10), SwiftFormat (5.7); 6.0 floor elsewhere is rare (Alamofire Xcode 16.0, container-plugin images 6.0-noble, argument-parser 6.0-jammy); Swift **6.4** appears as an image/leg in 11 repos (nio family via `linux_6_4_*`, hummingbird `swift:6.4`, vapor `swift:6.4-noble`, lambda-runtime `swift:6.4-noble`, Alamofire Xcode 27.0 / Swift 6.4.0 `ci.yml:34-36`).

| repo | Linux | macOS | Win | Wasm | Android | Static | FreeBSD | Embd | Nightly | C++ int | Bench |
|---|---|---|---|---|---|---|---|---|---|---|---|
| swift-log | Y | Y | Y | Y | Y | Y | . | . | Y | Y | Y |
| swift-argument-parser | Y | Y | Y | Y | . | . | . | . | Y | . | . |
| swift-async-algorithms | Y | . | Y | Y | . | . | . | . | Y | . | . |
| swift-collections | Y | Y | Y | Y | Y | . | Y | Y | Y | . | . |
| swift-nio | Y | Y | Y | Y | Y | Y | . | . | Y | Y | Y |
| swift-system | Y | Y | Y | Y | Y | Y | Y | . | Y | . | . |
| swift-crypto | Y | Y | Y | . | . | Y | . | . | Y | Y | . |
| swift-distributed-tracing | Y | Y | Y | Y | . | . | . | . | Y | Y | Y |
| swift-protobuf | Y | . | . | . | . | . | . | . | . | . | . |
| swift-openapi-generator | Y | Y | Y | . | . | . | . | . | Y | . | . |
| swift-foundation | Y | Y | Y | Y | Y | . | . | . | Y | . | . |
| swift-format | Y | Y | Y | . | . | . | . | . | Y | . | . |
| swift-syntax | Y | . | Y | Y | . | . | . | . | Y | . | . |
| swift-testing | Y | Y | Y | Y | Y | . | Y | . | Y | . | . |
| swift-package-manager | Y | Y | Y | Y | Y | Y | Y | . | Y | . | . |
| sourcekit-lsp | . | . | . | . | . | . | . | . | . | . | . |
| swiftly | Y | Y | . | . | . | . | . | . | Y | . | . |
| swift-build | Y | Y | Y | Y | Y | Y | Y | . | Y | . | . |
| async-http-client | Y | . | . | . | . | Y | . | . | Y | Y | . |
| vapor | Y | Y | . | . | . | Y | . | . | . | . | Y |
| hummingbird | Y | Y | . | . | . | . | . | . | . | . | Y |
| grpc-swift-2 | Y | . | . | . | . | Y | . | . | Y | Y | Y |
| swift-aws-lambda-runtime | Y | . | . | . | . | Y | . | . | Y | . | . |
| swift-service-lifecycle | Y | . | Y | Y | . | Y | . | . | Y | Y | . |
| swift-dependencies | Y | Y | . | Y | Y | . | . | . | . | . | . |
| swift-snapshot-testing | Y | Y | . | . | Y | . | . | . | . | . | . |
| swift-composable-architecture | Y | Y | . | . | . | . | . | . | . | . | . |
| Alamofire | Y | Y | Y | . | Y | . | . | . | Y | . | . |
| Nuke | Y | Y | . | . | . | . | . | . | . | . | . |
| SwiftLint | Y | Y | Y | . | . | . | . | . | . | . | . |
| SwiftFormat | Y | Y | Y | . | . | . | . | . | . | . | . |
| tuist | Y | Y | . | . | . | . | . | . | . | . | . |
| IceCubesApp | . | Y | . | . | . | . | . | . | . | . | . |
| element-x-ios | Y | Y | . | . | . | . | . | . | . | . | . |
| rules_swift | Y | Y | . | . | . | . | . | . | . | . | . |
| JavaScriptKit | Y | . | . | Y | . | . | . | . | . | . | . |
| swift-embedded-examples | Y | Y | . | . | . | . | . | Y | . | . | . |
| containerization | Y | Y | . | . | . | Y | . | . | . | . | . |
| container | Y | Y | . | . | . | . | . | . | . | . | . |
| swift-container-plugin | Y | . | . | . | . | Y | . | . | Y | . | . |
| **repos with leg** | **38** | **30** | **19** | **15** | **11** | **13** | **5** | **2** | **22** | **7** | **6** |

Corrections and notes: swift-foundation's macOS leg is a swiftly toolchain (`enable_macos_swiftly_checks: true`, `swift-foundation@aadd9259be07:.github/workflows/pull_request.yml:22`) and is counted; SwiftLint also builds static-SDK binaries but only in `release.yml:133-147` (not counted); Windows in nio is only on for the libraries that enable `windows_*_enabled` (log, tracing, crypto, openapi, lifecycle, nio 6.3+), grpc/ahc/container-plugin have none; Windows reaches the PR gate through `swift_package_test.yml` default-on in 10 more repos (arg-parser, async-algorithms, collections, system, swift-build, swift-format, foundation, SPM, syntax, testing) and through own jobs in Alamofire (`ci.yml:515-530`, Swift 6.3/6.2/6.1), SwiftFormat, SwiftLint (`test.yml:64`).
Android: no leg builds with a 6.4 **release** toolchain: swiftlang repos use `["nightly-main","nightly-6.4.x"]` (`swift-testing@c7d68ca20cd7:.github/workflows/pull_request.yml:38`), the family default is `nightly-main, nightly-6.4.x, 6.3` (`swift_package_test-0.0.15.yml:80`), nio's job uses `main` only (`android_swift_sdk.yml:44-46`); Wasm in nio does have `release_6_4_enabled: true` by default. Consistent with the frame's "6.4.0 dropped Android" question but does not prove it (CI just may lag).
Distros beyond Ubuntu: swift-build and SPM `amazonlinux2023, bookworm, noble, jammy, rhel-ubi9` (`swift-build@2187330e13e7:.github/workflows/pull_request.yml:21`), swift-system `noble, jammy, focal` (`:17`), Alamofire `6.0-focal/jammy/rhel-ubi9`, swiftly fedora41. ARM64 Linux: swift-build/SPM (`linux_host_archs`), vapor (`ubuntu-24.04-arm`).

### 3c. Flags, gates, and hygiene
| Item | Result | Evidence |
|---|---|---|
| `-Xswiftc -warnings-as-errors` | see Axis 5 | |
| `--explicit-target-dependency-import-check error` | 10 repos (crypto, tracing, log, nio, openapi, grpc, ahc, lifecycle, lambda, swift-syntax) | `swift-log@4038b6a4f74a:.github/workflows/pull_request.yml:22`; `swift-syntax@be549876fe91:.github/workflows/pull_request.yml:19-27` |
| `-Xswiftc -require-explicit-sendable` | 5 (tracing, log, openapi, lifecycle; ahc via manifest `Package.swift:26`); `-require-explicit-availability` grpc-swift-2 | |
| `--enable-all-traits` / `--traits` | async-algorithms, collections (4 trait legs `pull_request.yml:26-56`) | SwiftPM traits (6.1+) CI-tested |
| Release-mode test leg | swift-format and swift-syntax `publish_release.yml:45` (`${{ matrix.release && '-c release' }}`), swift-syntax wasm `-c release`, vapor `with_release_mode_testing: true` (`test.yml:45`), nio `release_builds.yml` x16 refs | |
| Sanitizers | swift-protobuf `build.yml:148-176` (address, thread; `--sanitize=${{matrix.sanitizer}}`), SwiftLint `.buildkite/pipeline.yml:22` TSan + Bazel `--features=tsan` (`Makefile:142`), hummingbird `Dockerfile:18` `swift test --sanitize=thread`, vapor explicitly **off** (`test.yml:46`); Xcode schemes enable TSan in Nuke/Alamofire (`.xcscheme`) | `ev`/grep listing |
| API breakage | 15 repos effective: 12 `soundness` callers (default on; off in arg-parser, collections, openapi, swift-build, embedded, foundation, SPM, syntax, testing, swiftly), plus protobuf (`build.yml:121`), hummingbird (`api-breakage.yml:28`), vapor (`vapor/ci` default) | `swift package diagnose-api-breaking-changes "$BASELINE_REF"` `soundness-0.0.15.yml:169`; swift-argument-parser disables it pending a fix (`pull_request.yml:70`) |
| DocC | 18 repos effective (16 soundness callers with docs on, plus hummingbird `verify-documentation.yml`, swiftly `pull_request.yml:206`); check = `swift package plugin generate-documentation --target T --warnings-as-errors --analyze`, targets read from `.spi.yml` `documentation_targets`, plugin appended on the fly (`check-docs.sh`) | **vacuous when no `.spi.yml`**: swift-build calls soundness with docs on (`pull_request.yml:120-124`) and has no `.spi.yml` -> script logs "no documentation targets" and exits 0 |
| Benchmarks in CI | 6 (tracing, log, nio, grpc `benchmarks.yml`; hummingbird `benchmark.yml`; vapor `test.yml:90`) | package-benchmark |
| Static Linux SDK | 13 PR-level (`--swift-sdk x86_64-swift-linux-musl`, `static_sdk.yml:16`); containerization builds vminitd static musl for aarch64 from x86_64 (`containerization-build-template.yml:62-68`); SwiftLint release only | |
| Cache steps | `actions/cache` in 5 repos (element-x, TCA, SwiftLint, lambda-runtime, tuist); Bazel cache 2 | `pins.py` neighbour grep; absent in all nio/swiftlang-family repos |
| Action pinning | tag 881, SHA 177, branch 27; SHA-majority repos: container, containerization, nio, element-x-ios, hummingbird, SPM; reusable workflows `@main` 119 | `pins.py`; nio pins its own actions by SHA (`swift-nio@e12881f2a691:.github/workflows/unit_tests.yml:193`) yet is itself called `@main` by 9 repos |
| `permissions:` block | present in 33/38 workflow-bearing repos; `concurrency:` in 20 | `ci2.py` |
| CodeQL / zizmor / dependabot | CodeQL 6, zizmor 1 (tuist is not; element-x `zizmor.yml`), dependabot 23, renovate 2 | `ci2.py` |
| Cross-PR testing | `enable_cross_pr_testing: true` in swift-build, swift-format, foundation, SPM (toolchain-repo coupling) | `swift_package_test.yml` input |

## Axis 4: coverage

Command: `python3 -I` block over `enable-code-coverage|llvm-cov|codecov|enableCodeCoverage|lcov` in workflows, scripts, Makefiles, `codecov.yml`.

| Repo | Collected | Where | Threshold |
|---|---|---|---|
| hummingbird | yes | `swift test --enable-code-coverage` + `vapor/swift-codecov-action` `hummingbird@1bd3b407fb47:.github/workflows/ci.yml:56-60` | none (no codecov.yml) |
| element-x-ios | yes | Codecov upload `.github/workflows/unit-tests.yml:68`, `compound-ios.yml:68`; `codecov.yml` | project `target: auto`, `threshold: 1%`, `patch: false` (`codecov.yml:5-9`): regression tolerance only |
| SwiftFormat | yes | `xcodebuild ... -enableCodeCoverage YES`, `llvm-cov export -format=lcov`, codecov-action `build.yml:39-47` | none |
| tuist | yes | `-enableCodeCoverage YES` in `cli.yml:248`, `app.yml:199`, dedicated `coverage.yml:160` | none found |
| container, containerization | yes | `make coverage` -> `llvm-cov export` (`container@f70ecbb926d9:Makefile:250`), PR comment workflow `pr-coverage-comment.yml`; unit/integration/combined line % extracted `common.yml:116-124` | none, informational |
| swift-aws-lambda-runtime | local only | `scripts/test-coverage.sh:24,32` hard-codes `/opt/homebrew/opt/llvm/bin/llvm-cov` | none |
| Alamofire, swift-testing | **off** | `Tests/Test Plans/*.xctestplan` `"codeCoverage" : false`; `.swiftpm/Testing.xctestplan:12` | n/a |
| vapor | opt-in input, not used | `vapor/ci` `with_coverage` default false | n/a |

Result: **6 repos collect coverage in CI; 0 of 40 enforce a minimum percentage**; the only gate-shaped setting is the 1% drop tolerance. No repo uses SonarCloud in workflows (element-x mentions it in CONTRIBUTING only).

## Axis 5: warnings policy

Command: python3 scan of workflows, scripts, Makefiles, `Package.swift` (outside Tests/Examples/Fixtures/Benchmarks) for `-warnings-as-errors|-Werror|treatAllWarnings|treatWarning|TREAT_WARNINGS_AS_ERRORS`. Hits per repo are listed here; spot reads of 3 per pattern all confirmed.

| Repo | Mechanism | Scope | Cite |
|---|---|---|---|
| nio, log, crypto, ahc, lifecycle, grpc | CI `-Xswiftc -warnings-as-errors` via `*_arguments_override` | release toolchains only; **nightlies exempt** | `swift-log@4038b6a4f74a:.github/workflows/pull_request.yml:22-26`; nio `main.yml:21-22` also sets it on nightly-next |
| containerization | CI + Makefile | all `swift test`/vminitd builds | `containerization@3e7bc39e66b3:.github/workflows/linux-build.yml:51,60`; `Makefile:28` |
| container | Makefile default `WARNINGS_AS_ERRORS ?= true` | all builds | `container@f70ecbb926d9:Makefile:17,21` |
| swift-protobuf | `SWIFT_BUILD_TEST_HOOK="-Xswiftc -warnings-as-errors"` | build + runtime tests; also CompileTests manifest `unsafeFlags(["-warnings-as-errors"])` | `build.yml:52,54`; `CompileTests/InternalImportsByDefault/Package.swift:33` |
| swift-container-plugin | CI end-to-end | `endtoend_tests.yml:53` | |
| async-http-client | manifest `unsafeFlags(["-Xfrontend","-require-explicit-sendable","-warnings-as-errors"])` gated by env `strictConcurrencyDevelopment` + CI arg | | `async-http-client@017115279d09:Package.swift:26` ("workaround so that IDE-based development can get tripped up") |
| **swift-aws-lambda-runtime** | **SE-0443** `.treatAllWarnings(as: .error)` in the shared settings array, one target relaxes `ExistentialAny` to warning | every build of this package (tools 6.2) | `swift-aws-lambda-runtime@8abd464310c7:Package.swift:7,154` |
| swift-testing | `.treatWarning("ExplicitSendable", as: .warning)` only when `buildingForDevelopment`; comment: cannot be used in packages consumed as dependencies because "the package manager suppresses all warnings for dependencies" | development only | `swift-testing@c7d68ca20cd7:Package.swift:436-440` |
| sourcekit-lsp | `unsafeFlags(["-Werror","ExistentialAny"])` (warning-group promotion) | | `sourcekit-lsp@c6ce93d5f8aa:Package.swift:716` |
| SwiftLint | Bazel `copts` `-warnings-as-errors`; BCR patch strips it for consumers | own builds | `bazel/copts.bzl:5`, `.github/actions/bazel-linux/action.yml:24` |
| swift-format, swift-syntax | release-publish matrix only | not on PRs | `publish_release.yml:45,130` |
| swift-collections, swiftly | local scripts (`Utils/run-full-tests.sh:126-127`, `scripts/run-tests.sh:5`), **not referenced by any workflow** | none | |
| vapor | `// .treatAllWarnings(as: .error)` commented out | none | `vapor@bf77fc69b142:Package.swift:247` (it does enable `.strictMemorySafety()` :246) |
| tuist | `mix compile --warnings-as-errors` (Elixir only) | Swift: none | |

Counts: PR-gated `-warnings-as-errors` in **12** repos (nio, log, crypto, grpc, ahc, lifecycle, container-plugin, containerization, container, protobuf, lambda-runtime via manifest, SwiftLint via Bazel); manifest-level SE-0443 settings in 2 (lambda-runtime gating, swift-testing dev-only); `unsafeFlags` warning promotion in 3 (ahc, sourcekit-lsp, protobuf CompileTests). 28 repos have no warning-promotion anywhere. Related hygiene flags in manifests (`Package.swift`, tools 6.x, outside tests): `MemberImportVisibility` 19 repos, `ExistentialAny` 15, `InternalImportsByDefault` 11, `NonisolatedNonsendingByDefault` 7, `InferIsolatedConformances` 7, `.strictMemorySafety()` 3 (collections, testing, vapor); `.defaultIsolation(MainActor.self)` appears only in app-owned local packages (IceCubesApp `Packages/*/Package.swift:32-42`, element-x `compound-ios/Package.swift:27`) and in one swift-protobuf compile test (`CompileTests/NonisolatedDeclarations/Package.swift:25`).

## Axis 6: running the formatters and linters

Runs on 6 repos at the SHAs in the appendix; `Sources` (`Source` for Alamofire). Toolchain: swift 6.4 image, swift-format `main`, SwiftLint 0.65.1, SwiftFormat 0.63.1. "own" = the repo's config auto-discovered (equals "default" when the repo has none for that tool). No exemplar file was modified.

### 6a. Rosters
| Tool | Command | Result |
|---|---|---|
| SwiftLint | `swiftlint rules` (parsed from the table in `$F/rules.txt`) | **255** rules: 154 opt-in, 100 enabled by default (+1 default-on rule, `custom_rules`), 5 analyzer (capture_variable, explicit_self, typesafe_array_init, unused_declaration, unused_import), 94 correctable, 12 need SourceKit; kinds: idiomatic 79, style 78, lint 74, performance 14, metrics 10. Concurrency-aware rules: only `async_without_await`, `incompatible_concurrency_annotation`, `redundant_sendable`. **No rule targets Swift Testing**: the 8 test rules are XCTest/Quick (`balanced_xctest_lifecycle`, `empty_xctest_method`, `final_test_case`, `private_unit_test`, `single_test_class`, `test_case_accessibility`, 2 Quick) |
| swift-format | `swift format dump-configuration` | 43 rules, 31 on. Off by default: AllPublicDeclarationsHaveDocumentation, AlwaysUseLiteralForEmptyCollectionInit, BeginDocumentationCommentWithOneLineSummary, NeverForceUnwrap, NeverUseForceTry, NeverUseImplicitlyUnwrappedOptionals, NoEmptyLinesOpeningClosingBraces, NoLeadingUnderscores, OmitExplicitReturns, UseEarlyExits, UseWhereClausesInForLoops, ValidateDocumentationComments. Defaults: lineLength 100, indentation 2, tabWidth 8, `orderedImports.shouldGroupImports: true` |
| SwiftFormat | `swiftformat --rules` | 156 entries: 113 enabled, 37 disabled by default (incl. `preferSwiftTesting`, `redundantSendable`, `validateTestCases`, `noGuardInTests`, `testSuiteAccessControl`), 6 deprecated; it does have Swift Testing rules (`redundantSwiftTestingSuite`, `swiftTestingTestCaseNames` on) |

### 6b. Findings (total / files with findings)
| Repo (files) | swift-format own | swift-format default | SwiftLint own | SwiftLint default | SwiftFormat own | SwiftFormat default |
|---|---|---|---|---|---|---|
| swift-log (12) | **0 / 0** | 3,445 / 12 | 112 / 12 (no cfg) | 112 / 12 | 821 / 11 (no cfg) | 821 / 11 |
| swift-argument-parser (56) | **0 / 0** | 337 / 18 | 525 / 56 (no cfg) | 525 / 56 | 12,922 / 56 (no cfg) | 12,922 / 56 |
| Alamofire (44) | 13,763 / 44 (no cfg) | 13,763 / 44 | 526 / 36 (no cfg) | 526 / 36 | **0 / 0** | 4,583 / 40 |
| hummingbird (139) | **1 / 1** | 13,516 / 135 | 558 / 95 (no cfg) | 558 / 95 | 3,524 / 121 (no cfg) | 3,524 / 121 |
| Nuke (82) | 14,106 / 81 (no cfg) | 14,106 / 81 | **33 / 7** | 265 / 51 | 3,698 / 74 (no cfg) | 3,698 / 74 |
| swiftly (39) | 6,332 / 39 (no cfg) | 6,332 / 39 | 314 / 29 (no cfg) | 314 / 29 | **1,044 / 31** (own `.swiftformat`, run at 0.63.1 vs the repo pin 0.49.18) | 1,651 / 38 |

Exit codes (`runs/*.txt`, last line): `swift format lint` exits **0 in all 12 runs, including 14,106 findings** (needs `--strict`); `swiftformat --lint` exits 1 whenever any file needs formatting (findings are reported as `error`); `swiftlint` exits 2 when any `Error`-severity violation exists and 0 for warnings only (Nuke own: 33 warnings, exit 0).

### 6c. Which rules dominate (noise) and which catch something
swift-format default, 6 repos, 51,499 findings: **Indentation 47,208 (91.7%)** and LineLength 2,933 (5.7%) are pure config mismatch (the repos use 4 spaces / 120 cols, defaults are 2 / 100); with the repo's own config the same trees show 0, 0 and 1 findings, i.e. the configs are accurate. Remaining ranks: AddLines 666, UseLetInEveryBoundCaseVariable 278, Spacing 127, DoNotUseSemicolons 109. The single own-config finding is `hummingbird@1bd3b407fb47:Sources/HummingbirdCore/Response/Response.swift:27` NoBlockComments (a lint-only rule that hummingbird's `format`-only gate cannot see).

SwiftFormat default, 27,199 findings, 59 rules: `indent` 19,437 (71.5%), redundantSelf 1,830, extensionAccessControl 1,262, wrapPropertyBodies 788. Same config-mismatch character; SwiftFormat reports all as `error`.

SwiftLint default config, 6 repos, **2,300 findings across 37 rules** (`agg.py`):
| Rule | Count | Share | Severity | Sample (3) and verdict |
|---|---:|---:|---|---|
| line_length (120) | 1,067 | 46.4% | 1,021 warn / 46 err | 275 are comments; 703 are within 20 chars of the limit; `hummingbird@1bd3b407fb47:Sources/HummingbirdRouter/RouteBuilder.swift:80`, `swiftly@c8cf2e35bfca:Sources/SwiftlyCore/FileLock.swift:14` (166-char message), `swift-argument-parser@efd239f0055b:Sources/ArgumentParser/Completions/ZshCompletionsGenerator.swift:210`: noise 3/3 |
| identifier_name | 432 | 18.8% | 344 err | 219 are single-char names, 83 leading underscore; `hummingbird@1bd3b407fb47:Sources/HummingbirdCore/Request/URI.swift:106` (`h`), `swift-argument-parser@efd239f0055b:Sources/ArgumentParser/Utilities/Platform.swift:206` (`p` in an ioctl shim), `Nuke@d5548dd61395:Sources/Nuke/ImageRequest.swift:505` (`_containerInstanceSize`): noise 3/3 |
| comment_spacing | 161 | 7.0% | warn | **158/161 are the `//===----===//` license banner** (`swift-log@4038b6a4f74a:Sources/Logging/Locks.swift:27`): pure false positive |
| opening_brace | 113 | 4.9% | warn | brace on its own line after a multi-line signature (`ExpressibleByArgument.swift:75`): style conflict with swift-format output |
| nesting | 102 | 4.4% | warn | intentionally nested enums (`hummingbird ... RouterPath.swift:18`): noise |
| file_length / cyclomatic_complexity / function_body_length / type_body_length | 59 / 45 / 39 / 22 | 2.6 / 2.0 / 1.7 / 1.0% | | complexity 11-12 vs limit 10 (`Alamofire ... URLEncodedFormEncoder.swift:581`): borderline |
| type_name | 40 | 1.7% | 36 err | `ID`, `fs` typealias, `_HB_SendableMetatype`: noise 3/3 |
| force_cast + force_try | 15 + 12 | 1.2% | err | all 27 sites read: 8 are `throw error as! Failure` typed-throws re-throw shims in swift-log (`Logger+With.swift:60,107,...`), 8 are `try! Regex("literal")` in swiftly, 4 are `try! parser.read(..., throwOnOverflow: false)` that cannot throw (`URI.swift:106-129`), 7 invariant-backed casts: **0/27 defects**, 27/27 intentional |
| unused_setter_value | 10 | 0.4% | warn | `set {}` protocol shims (`Alamofire ... AlamofireExtended.swift:53`, `swift-log ... SwiftLogNoOpLogHandler.swift:78`): noise |
| for_where | 10 | 0.4% | warn | `if !other._contains(entry) { return false }` (`swift-log ... Logger+Attributes.swift:178`): `where` would change semantics: false positive |
| empty_enum_arguments | 10 | 0.4% | warn | `case .custom(_):` (`DumpHelpGenerator.swift:203,207`): valid nit, harmless |

With `opt_in_rules: [all]` (`$F/optin-all.yml`): **29,762 findings, 122 rules** (85 more than default); `contrasted_opening_brace` alone is 40.1% (it contradicts K&R), `explicit_type_interface` 8.5%, `explicit_acl` 7.9%, `type_contents_order` 5.9%. Opt-in rules with a plausible defect signal: `discarded_notification_center_observer` (4 hits, all in `Nuke@d5548dd61395:Sources/NukeUI/AnimatedImages/AnimatedImageFramePool.swift:161-174`: observer tokens thrown away, a real leak hazard if the pool is not process-lifetime), `async_without_await` (35; sampled `swiftly ... FileManager+FilePath.swift:43,82` are API-shaped async wrappers: weak), `unused_parameter` (404; sampled `container: Container.Type` placeholders in argument-parser: API shape, noise), `weak_delegate` (7; sampled 3 are false positives: a lock wrapper, a strong data-source field, a `Bool` named isDefaultDelegate), `force_unwrapping` (132; sampled `HTTPField.Name("Reporting-Endpoints")!` constants are safe). Net on idiomatic code: of 14 default rules sampled 3 each, **0/42 sampled hits were defects**; of 8 opt-in rules sampled, 1 family (notification observers) was a plausible defect.
The configs that exist in the corpus reflect this: Nuke disables line_length, identifier_name, type_name (265 -> 33 findings with its config); tuist disables 9 default rules; element-x raises line_length to 250.

## Smells (ranked)

1. **`swift format lint` without `--strict` can never fail CI.** 12/12 runs exit 0, including swift-log default config with 3,445 findings (`runs/apple__swift-log.swiftformat.default.txt`, `exit=0`). Safe gates use the `format --in-place` + `lint --strict` + `git diff --exit-code` triple (`check-swift-format.sh`, `swift-protobuf@6c84c3dedac0:.github/workflows/build.yml:141-146`). Containers and hummingbird run `format` + `git diff` only, which silently skips lint-only rules (hummingbird NoBlockComments, `Response.swift:27`).
2. **Docs gate passes vacuously without `.spi.yml`.** `soundness.yml` docs check logs "no documentation targets" and exits 0 (`check-docs.sh`); swift-build has the check on (`pull_request.yml:120-124`) and no `.spi.yml`. Same for any repo that sets `docs_check_enabled` default and forgets `.spi.yml`.
3. **Lint/format config present but unenforced in 10 repos** (list in 1e); the worst documentation drift is element-x CONTRIBUTING.md:153 claiming CI enforcement that lives only in Xcode build phases with `--lenient`; Nuke's SwiftLint job "has never gated CI".
4. **Reusable workflows called `@main`**: 119 of 181 reusable-workflow references float; nio pins its actions by SHA but is itself consumed `@main` by 9 repos; and 881 of 1,085 action uses are tag-pinned, only 6/38 repos mostly SHA-pinned. Supply-chain exposure is the corpus norm, even for Apple repos.
5. **Version skew inside the "same" gate**: soundness pinned 0.0.7 to `main` across repos; format image `swift:6.3-noble` (0.0.15 default) vs nightlies; two repos pin nightly images to dodge swift-format bugs (`swift-format#1081`, `#1243`), so a stable-toolchain formatter run can disagree with CI.
6. **Config drift gates against a mutable remote**: argument-parser and embedded-examples `curl` apple/swift-mmio `main/.swift-format` and `diff` it (`pull_request.yml:23-24`); an upstream rule change fails unrelated PRs.
7. **Formatter version drift**: swiftly pins SwiftFormat `exact: "0.49.18"` (`Package.swift:36`); at 0.63.1 its own tree yields 1,044 findings in 31/39 files with its own `.swiftformat`. Pinned-old tools mask rule growth.
8. **SwiftLint defaults are mostly noise on idiomatic code** (Axis 6c: 46.4% line_length, 98% of comment_spacing is license banners, 0/42 sampled hits defects) and the static binary skips 12 SourceKit rules; adopters end up disabling 5-9 rules (Nuke, tuist, element-x).
9. **Warnings-as-errors is the exception (12/40)**, SE-0443 manifest settings are near-absent (1 gating), and the CI form drops it on nightlies by design; swift-testing documents that `.treatWarning` is useless in dependency packages because SwiftPM suppresses dependency warnings.
10. **Coverage is collected (6/40) but never a gate (0/40)**; Alamofire and swift-testing explicitly turn it off in test plans.
11. **Sanitizers nearly absent from CI (3/40)**; vapor sets `with_tsan: false`; concurrency-heavy libraries (nio, hummingbird main CI, ahc) rely on strict concurrency checking rather than TSan.
12. **Duplicate/dead config files**: `.swift-format-nolint` in container and containerization is a copy with every lint rule `false`, used only by local `make check`; CI uses neither `lint` nor the nolint copy.
13. sourcekit-lsp, the most important Swift tooling repo in the corpus, has zero in-repo CI; its gates cannot be audited from the repository.

## Patterns worth encoding

1. **Format gate triple**: `swift format format --parallel --in-place` -> `swift format lint --strict --parallel` -> `git diff --exit-code '*.swift'`, over `git ls-files -z '*.swift'`, with `.swiftformatignore` support (`check-swift-format.sh`, 6 repos ship an ignore file).
2. **One `.swift-format` per repo, JSON with an explicit `version: 1`, agreeing with `.editorconfig`** (24/24 agreement). The dominant override set to ship: indentation 4 (or 2), lineLength 120, `lineBreakBeforeEachArgument` true, `prioritizeKeepingFunctionOutputTogether` true, `indentConditionalCompilationBlocks` false; rules off: AlwaysUseLowerCamelCase, UseLetInEveryBoundCaseVariable, UseSynthesizedInitializer, UseSingleLinePropertyGetter; rule on: OmitExplicitReturns. The nio-house file is the most reused (5 byte-identical normalised copies).
3. **Warnings as errors only on release toolchains**, nightlies exempt: `-Xswiftc -warnings-as-errors --explicit-target-dependency-import-check error -Xswiftc -require-explicit-sendable` for 6.1-6.4, and the same without `-warnings-as-errors` for `nightly-next`/`nightly-main` (`swift-log@4038b6a4f74a:.github/workflows/pull_request.yml:22-26`).
4. **SE-0443 in the shared settings array**: `.treatAllWarnings(as: .error)` plus targeted `.treatWarning("X", as: .warning)` (lambda-runtime), noting SwiftPM hides warnings for dependents; development-only variant guarded by an env switch (swift-testing).
5. **Platform build-only legs** off one reusable workflow: static Linux SDK (`--swift-sdk x86_64-swift-linux-musl`), Wasm SDK, Android SDK (+NDK versions), Windows `windows-2022`, Embedded wasm; matrix of last three releases plus `nightly-6.x` plus `nightly-main`; Linux distro spread for toolchain repos (amazonlinux2023, bookworm, noble, jammy, rhel-ubi9).
6. **API-breakage + DocC as soundness checks**: `swift package diagnose-api-breaking-changes <PR base>` with `--breakage-allowlist-path` (swift-format `api-breakages.txt`), DocC with `--warnings-as-errors --analyze` over `.spi.yml` `documentation_targets` (so `.spi.yml` is part of the gate).
7. **Swift Testing idioms already normal in 16 repos**: `@Suite(.serialized)`, central `Tag` extension (`SPM`), `.timeLimit(.minutes(n))`, `@Test(arguments:)`, `confirmation(expectedCount:)` in place of XCTestExpectation, `#expect(processExitsWith:)` for crash tests, `withKnownIssue`, `Attachment.record`; mixed repos keep XCTest only for `measure {}`, XCUITest and suites that need `setUp`.
8. **House custom lint rules over rule sprawl** (element-x 7, SwiftLint 4, tuist 1): regex + `match_kinds: identifier` bans (print -> logger, wrapper view types), scoped with `included:`/`excluded:`.
9. **Pin actions by SHA with a version comment** (`uses: x@<40 hex>  # v7.0.1`, nio/hummingbird/element-x/containerization/container/SPM), reusable workflows by tag not `@main`.
10. **Generated-artifact diff gates**: swiftly regenerates the CLI reference and `git diff --exit-code` (`pull_request.yml:200-203`); argument-parser builds `generate-manual`/`generate-docc-reference` before tests.

## Contradictions of the frame

- **H4 (partly contradicted).** "swiftlang/apple repos use the bundled swift-format; community repos use SwiftLint and/or SwiftFormat". Measured: swift-format config in 24/40 incl. **all 6 server repos** (vapor, hummingbird, grpc, ahc, lambda, lifecycle) and 3 pointfreeco repos run swift-format with defaults via `make format`; SwiftFormat 7/40 includes two **swiftlang** repos (SPM, swiftly); three swiftlang/apple repos (swift-foundation, swift-system, swift-testing) have no formatter; SwiftLint is rare (4/40) and strictly gated in exactly 1. "No single formatter dominates" is false: swift-format is 3.4x SwiftFormat.
- **H3 (contradicted in its second half).** Swift Testing share is 37.9% in apple/swiftlang core libraries but **66.8% in community libraries, 64.5% in servers, 92.4% in apps**. Adoption tracks repo age: Apple's newest repos are 100% Testing, the community's oldest (Alamofire 9%, SwiftFormat 0%) are XCTest.
- **Q6 / "Linux via Docker is the measurable gate"**: only partially. 30/40 repos run macOS legs and 19 run Windows; the gates that matter most for AI-written changes (format, docs, API breakage) are Linux-reproducible, but `xcodebuild`-only repos (IceCubes, element-x, Nuke, Alamofire, SwiftFormat Xcode targets) are not, and sourcekit-lsp's CI is outside the repo.
- **H8 (refined).** `defaultIsolation(MainActor.self)` appears in **packages**, not only app targets, but only app-owned local packages (IceCubes `Packages/*`, element-x `compound-ios`) and one protobuf compile test; no published-library manifest sets it. Library rule "do not enable" holds.
- **H1 hint (side data).** Alamofire pairs a 6.x tools version with `swiftLanguageModes: [.v5]` (`Alamofire@bda9ed57d729:Package.swift`), as do swift-format, SPM, swift-snapshot-testing and embedded-examples: tools version >= 6.0 does not imply language mode 6 (5 repos). swift-syntax lists `[.v5, .version("6")]`; 5.x tools versions remain in swift-syntax 5.9, SwiftLint 5.9, SwiftFormat 5.7.
- **Era note (6.4 Android).** No CI leg in the corpus builds Android with a 6.4 release toolchain (Axis 3b); this is consistent with, not proof of, the frame's suspicion.
- **Frame says "swift-format bundled in the toolchain".** True, but the bundled binary lags: two repos run nightly images solely for swift-format fixes.

## Gaps

- No macOS/Xcode: `xcodebuild`, test plans, Xcode schemes (TSan flags), build phases and iOS legs were read, never run.
- SwiftLint static binary: no SourceKit (12 rules skipped), no analyzer rules; `swiftlint analyze` needs a compiler log we did not produce. Opt-in "all" run therefore omits `unused_import` / `unused_declaration`.
- Reusable workflows outside the corpus were read from upstream at the pinned tag (`swiftlang/github-workflows@0.0.15`, `vapor/ci@86063c56`), not at each caller's own ref; callers on 0.0.7-0.0.14 may behave differently.
- Test counts are static (grep-grade with comment/string stripping); no test was executed, so counts include `#if`-disabled and platform-conditional tests. Tests in `Examples/`, `Fixtures/`, `Snapshots/` dirs were excluded by design (tuist and SwiftFormat have large fixture trees).
- XCTest classes inheriting a local base class are not counted as `XCTestCase` subclasses; `func test*` counts are unaffected.
- tuist's 106 workflows are mostly non-Swift (Elixir, k8s); only `cli.yml`, `app.yml`, `coverage.yml` were read for Swift gates.
- Depth-1 clones: no history, so "new tests use Swift Testing" (H3 as worded) could not be measured, only the current ratio.
- Not run: swift-format with all rules on (would quantify Never* rules), `swift build -warnings-as-errors` on exemplars, `diagnose-api-breaking-changes` (needs two refs).
- Comparisons of SwiftFormat default runs lack `--swiftversion` (tool warns that some features are disabled); results for `own` configs with a `--swiftversion` (Alamofire, swiftly) are unaffected.

## Appendix: SHAs measured

swift-log@4038b6a4f74a swift-argument-parser@efd239f0055b swift-async-algorithms@cbde9aed744b
swift-collections@935f696a549a swift-nio@e12881f2a691 swift-system@486d48c80fce
swift-openapi-generator@c4f943e14015 swift-distributed-tracing@a5270bd1280a swift-container-plugin@a9646b8d4dca
swift-crypto@1c80d3aff53f swift-format@b15dd59fad21 container@f70ecbb926d9
containerization@3e7bc39e66b3 swift-protobuf@6c84c3dedac0 swift-testing@c7d68ca20cd7
swift-syntax@be549876fe91 swiftly@c8cf2e35bfca swift-foundation@aadd9259be07
swift-embedded-examples@119b29f83550 sourcekit-lsp@c6ce93d5f8aa async-http-client@017115279d09
swift-package-manager@5546f44a3b52 swift-service-lifecycle@c55297914e26 swift-build@2187330e13e7
grpc-swift-2@ac33066eb6ed vapor@bf77fc69b142 hummingbird@1bd3b407fb47
swift-aws-lambda-runtime@8abd464310c7 swift-dependencies@b476cc576105 swift-snapshot-testing@28e5de025e3f
swift-composable-architecture@bc2db5ba8ad3 Alamofire@bda9ed57d729 Nuke@d5548dd61395
SwiftLint@ec4691d9e813 SwiftFormat@fbc07aca5373 IceCubesApp@2ad6e6891258
rules_swift@50450ed24dde JavaScriptKit@c68ee9bdebfa element-x-ios@14e33866ced2
tuist@2f6ac74754bf
