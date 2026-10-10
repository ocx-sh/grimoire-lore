---
title: "Swift formatter of record, SwiftLint's role and the agent-tell grep set (SW-GATE)"
topic: "Swift quality gates: the swift-format config of record and its gate triple, SwiftLint as an optional custom_rules vehicle, SwiftFormat as a tolerated incumbent, tool pinning, config drift, and the K-07 agent-tell grep set"
agent: "W2-3 gates/format-and-lint"
model: sonnet
date_researched: 2026-10-10
sources_count: 24
fixtures: /home/mherwig/.cache/research-lang/swift-tools/fixtures/format-and-lint/
scope: |
  Covers rows M-M-01..M-M-05, M-M-14, M-M-15 and M-K-07: the shipped `.swift-format`, the verbatim gate triple, which
  `Never*` rules are on, SwiftLint's optional role and its shipped `custom_rules` file, never chaining formatters, tool
  pinning in CI, config drift between packages, and the verbatim K-07 grep set with false-positive counts on five
  exemplars. Every runnable claim was run on Swift 6.4.0 (`swift:6.4`) and, where noted, 6.3.3 (`swift:6.3`), on Linux in
  Docker. macOS, Xcode build phases and Windows are "unverified: read only" (owner Q7). Not covered: compiler
  warning-as-error groups, DocC and the CI matrix (gates/warnings-as-errors dive `swift-gates/warnings-and-ci.md`), the
  Swift Testing vs XCTest rules, and the SwiftUI tells beyond the `ObservableObject` entry.
---

# Swift formatter of record, SwiftLint's role and the agent-tell grep set

Dated 2026-10-10. Toolchain facts: Swift 6.4.0 (`swift-6.4-RELEASE`) and 6.3.3, bundled `swift format`, SwiftLint 0.65.1,
SwiftFormat 0.63.1. Fixture root (referred to as `FX/` below): `/home/mherwig/.cache/research-lang/swift-tools/fixtures/format-and-lint/`.
Evidence labels: `[gates]` = `swift-audit/exemplar-quality-gates.md`, `[cod]` = `swift-topic-map/codified.md`,
`[eco]` = `swift-topic-map/ecosystem-tooling.md`, `[cfg]` = `swift-audit/config-inventory.md`.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   - 2.1 [What the tools are and which version is which](#21-what-the-tools-are-and-which-version-is-which)
   - 2.2 [swift-format semantics that silently weaken a gate](#22-swift-format-semantics-that-silently-weaken-a-gate)
   - 2.3 [The gate triple, measured](#23-the-gate-triple-measured)
   - 2.4 [The shipped `.swift-format`](#24-the-shipped-swift-format)
   - 2.5 [Which rules are on: noise measured on ten repositories](#25-which-rules-are-on-noise-measured-on-ten-repositories)
   - 2.6 [Never chain formatters; SwiftFormat as a tolerated incumbent](#26-never-chain-formatters-swiftformat-as-a-tolerated-incumbent)
   - 2.7 [SwiftLint's role: custom_rules only](#27-swiftlints-role-custom_rules-only)
   - 2.8 [The K-07 agent-tell grep set](#28-the-k-07-agent-tell-grep-set)
   - 2.9 [Pinning tool versions in CI (M-M-14)](#29-pinning-tool-versions-in-ci-m-m-14)
   - 2.10 [Config drift between packages (M-M-15)](#210-config-drift-between-packages-m-m-15)
   - 2.11 [Exemplar patterns worth copying and avoiding](#211-exemplar-patterns-worth-copying-and-avoiding)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- **Gate = the git-aware triple, and only the triple.** `swift format lint` without `--strict` exited 0 with 7 findings on the plant (Swift 6.4.0 and 6.3.3, `FX/measure/verify-all-6.4.txt` V1); `format --in-place && git diff` alone exited 0 on a lint-only plant (V3a). The triple was red on all three plants and green on the twin (V3b).
- **`git diff --exit-code` compares the work tree with the index.** An agent's own unstaged edits turn the triple red; run `git add -A -- '*.swift'` first (S1 exit 1, S2 exit 0).
- **A tracked-files-only file list is vacuous for new files.** The upstream `check-swift-format.sh` shape (`git ls-files -z '*.swift'`) exited 0 on an untracked misformatted file; adding `--cached --others --exclude-standard` made it red (V4a exit 0, V4b exit 123).
- **A mistyped path operand passes silently.** `swift format lint --strict -r Source` (directory does not exist) exits 0 even on the red plant (V13); never gate on `-r Sources`.
- **A `rules` block in `.swift-format` replaces the defaults, it does not overlay them.** `{"rules":{"NeverForceUnwrap":true}}` switched `AlwaysUseLowerCamelCase` and 27 other default-on rules off (V6a: 0 findings vs 1 with no `rules` key). Ship the full 43-rule block.
- **An unknown rule name is a warning, an error only under `--strict`.** A typo (`NeverForceUnwrapp`) exits 0 on `lint` and 1 on `lint --strict` (V6c/V6d); a typo in a top-level key (`lineLenght`) is silent on both and is caught only by diffing `dump-configuration --effective`.
- **Shipped `.swift-format`: 4 spaces, 120 columns, the corpus-modal layout, tool-default rules plus `NeverForceUnwrap`, `NeverUseForceTry`, `NeverUseImplicitlyUnwrappedOptionals` on**; the file is the 6.4.0 `dump-configuration` output with 9 changed values (section 2.4). Everything else stays at default because `AllPublicDeclarationsHaveDocumentation` (6,379 hits), `ValidateDocumentationComments` (1,344) and `UseEarlyExits` (1,417) are noise on ten repos.
- **`Never*` rules are lint-only, so they exist only if `lint --strict` runs with them.** containerization turns them on in `.swift-format` but its CI runs `make fmt` (format only) and its local lint target reads a copy with every rule off (`containerization@3e7bc39e66b3:Makefile:501,505`).
- **`NeverForceUnwrap`/`NeverUseForceTry` skip any file that imports `Testing` or `XCTest`**, not only `@Test` functions: a production helper in a file importing `Testing` was not flagged (`FX/neverprobe`).
- **Never chain swift-format with SwiftFormat.** SwiftFormat 0.63.1 defaults after swift-format on a copy of swift-log left 608 `lint --strict` findings and a red triple; swift-format alone was a fixed point (R1 exit 1, G1/G2 exit 0).
- **SwiftLint is optional and carries `custom_rules` only.** The shipped file (`FX/ship/.swiftlint.yml`, 13 rules plus a suppression detector) found 24 violations on the plant (exit 2) and 0 on the twin (exit 0) using the official `ghcr.io/realm/swiftlint:0.65.1` image.
- **The static SwiftLint binary silently skips `custom_rules`.** `swiftlint-static` 0.65.1 prints "Skipping enabled rule 'custom_rules'" and exits 0 in default mode, and aborts (exit 134) in `swiftsyntax` mode; only the dynamic binary / official image enforces them (V10b, V10c).
- **K-07 is 15 verbatim `grep -rn` entries; each hit its planted tell on the plant (15/15) and returned zero on the twin (0/15)**, with a canary that fails when no Swift file was scanned. Judge by output, never exit status (`xargs` turns grep's 1 into 123).
- **Force-unwrap by grep is rejected**: the best regex produced 1,288 hits on five exemplars (141 in comments or strings, the rest dominated by `baseAddress!`); use `NeverForceUnwrap` instead.
- **Pin the toolchain patch, the SwiftLint image tag and (where present) SwiftFormat `exact:`.** `swift format --version` prints `main` on 6.4.0 and `6.3.3` on 6.3.3, and the `swift:6.3` image tag floated to 6.3.3, so record `swift --version`, not the formatter's own string.
- **`.swift-format-ignore` exists in 6.4.0 and is ignored by 6.3.3**, and is documented nowhere in the 6.4.0 README or `IgnoringSource.md`; do not rely on it across a mixed toolchain matrix.
- **One `.swift-format` per repository.** swift-format resolves the nearest ancestor per file, so a nested config silently changes the style of its package; `cmp` against the root copy finds it (V8).

## Findings

### 2.1 What the tools are and which version is which

| Tool | Version measured | How obtained | Identity caveat |
|---|---|---|---|
| swift-format | bundled with `swift:6.4` (binary built 2026-09-14, `/usr/bin/swift-format`) and `swift:6.3` | `swift format ...` | `swift format --version` prints `main` on 6.4.0 and `6.3.3` on 6.3.3 |
| SwiftLint | 0.65.1 | `ghcr.io/realm/swiftlint:0.65.1` (digest `sha256:f47e083201e4...`), dynamic `swiftlint` from `swiftlint_linux_amd64.zip`, and `swiftlint-static` from the same zip | static and dynamic builds behave differently (2.7) |
| SwiftFormat | 0.63.1 | `swiftformat` on the research image PATH | prints a warning when no `--swiftversion` or `.swift-version` is given |

- **Recovering the real swift-format tag.** The 6.4.0 release tag `swift-6.4.0-RELEASE` (`swiftlang/swift-format@4d6d4a86c5b6`) has `print("main")` in `Sources/swift-format/PrintVersion.swift`, so `main` is the correct string for a 6.4.0 build, not a development build ([6.4.0 tag](https://github.com/swiftlang/swift-format/blob/swift-6.4.0-RELEASE/Sources/swift-format/PrintVersion.swift)); the 6.3.3 tag `swift-6.3.3-RELEASE` (`@9f3ddd22382a`) prints `6.3.3` ([6.3.3 tag](https://github.com/swiftlang/swift-format/blob/swift-6.3.3-RELEASE/Sources/swift-format/PrintVersion.swift)). The toolchain tags differ from the swift-syntax-style dependency tags (`604.0.0` is `@15d7877c6b32`, `603.0.0` is `@d54c5be7afba`), so identify the formatter by `swift --version` (`swift-6.4-RELEASE`, `Swift version 6.3.3`), not by `604`. The `strings` of the 6.4 binary contain `swift-6.4-RELEASE` (once) and the 6.3 binary `swift-6.3.3-RELEASE`.
- **The Docker minor tag floats.** `SWIFT_VERSION=6.3` resolved to `Swift version 6.3.3 (swift-6.3.3-RELEASE)` (`swift --version` in the research run), so `swift:6.3` in CI is not a pin.
- **swift-format ships in the toolchain since Swift 6**, run as `swift format` (with a space) ([README, "Included in the Swift Toolchain"](https://github.com/swiftlang/swift-format/blob/main/README.md), lines 66-68).
- **Default configuration.** `swift format dump-configuration` prints 43 rules, 31 on, 2-space indent, `lineLength` 100, `tabWidth` 8 (`FX/dumps/default-6.4.json`). 6.3.3 and 6.4.0 differ in exactly two keys: 6.4.0 adds `multilineTrailingCommaBehavior: "keptAsWritten"` and `orderedImports.shouldGroupImports: true` (`/usr/bin/diff FX/dumps/default-6.3.json FX/dumps/default-6.4.json`; [Configuration.md](https://github.com/swiftlang/swift-format/blob/main/Documentation/Configuration.md) documents both). Formatting output was identical on four already-formatted trees (swift-log, async-http-client, containerization: 0 files change under both; swift-nio: the same 7 test files, identical 100-line diff) so 6.3.3 vs 6.4.0 is not a style fork (`FX/measure/version-drift.txt`).
- **44 rules on `main`, 43 in 6.4.0.** `RuleDocumentation.md` on `main` lists `SwiftTestingNamingConventions`, which is absent from the 6.4.0 dump ([RuleDocumentation.md](https://github.com/swiftlang/swift-format/blob/main/Documentation/RuleDocumentation.md)). 19 of the 44 are "linter-only" (not fixed by `format`): `AllPublicDeclarationsHaveDocumentation`, `AlwaysUseLowerCamelCase`, `AmbiguousTrailingClosureOverload`, `AvoidRetroactiveConformances`, `BeginDocumentationCommentWithOneLineSummary`, `DontRepeatTypeInStaticProperties`, `IdentifiersMustBeASCII`, `NeverForceUnwrap`, `NeverUseForceTry`, `NeverUseImplicitlyUnwrappedOptionals`, `NoBlockComments`, `NoLeadingUnderscores`, `NoPlaygroundLiterals`, `OnlyOneTrailingClosureArgument`, `ReplaceForEachWithForLoop`, `SwiftTestingNamingConventions`, `TypeNamesShouldBeCapitalized`, `UseSynthesizedInitializer`, `ValidateDocumentationComments` (counted from the "is a linter-only rule" lines of `RuleDocumentation.md`). This is why `format` + `git diff` alone is not a gate (V3a exit 0 on the lint-only plant).
- **SwiftLint ids** (0.65.1, `swiftlint rules` and the [rule directory](https://realm.github.io/SwiftLint/rule-directory.html)): `force_cast` (on by default, kind idiomatic, severity error, [page](https://realm.github.io/SwiftLint/force_cast.html)), `force_try` (on by default, error, [page](https://realm.github.io/SwiftLint/force_try.html)), `force_unwrapping` (opt-in, warning, `ignored_literal_argument_functions` default `["Data(hexString:)", "NSImage(named:)", "NSURL(string:)", "UIImage(named:)", "URL(string:)"]`, [page](https://realm.github.io/SwiftLint/force_unwrapping.html)), `unhandled_throwing_task` (opt-in, kind lint, severity error, [page](https://realm.github.io/SwiftLint/unhandled_throwing_task.html)). None "uses sourcekit" in the `swiftlint rules` table; `custom_rules` shows `no` there because its SourceKit need depends on the mode (2.7).

### 2.2 swift-format semantics that silently weaken a gate

All runs: `FX/measure/verify-all-6.4.txt` and `-6.3.txt` (identical except where stated).

1. **Exit codes.** `lint` exits 0 with findings unless `--strict`; the README says so: "By default, lint warnings do not prevent a successful exit; only fatal errors ... cause the tool to exit unsuccessfully" ([README](https://github.com/swiftlang/swift-format/blob/main/README.md), lines 151-154). Measured: plant `lint -r .` exit 0 with 7 lines of `warning:`; `lint --strict -r .` exit 1 and the same findings print as `error:` (V1/V2).
2. **A mistyped path passes.** `swift format lint --strict -r Source` where `Source` does not exist exits 0, also on a nonexistent file operand (V13a/V13c). The red plant passed with the wrong directory name.
3. **`rules` replaces the defaults.** The decoder reads `decodeIfPresent([String: Bool].self, forKey: .rules) ?? defaults.rules` with the comment "To get an empty rules dictionary, one can explicitly set the `rules` key to `{}`" ([Configuration.swift, 6.4.0 tag](https://github.com/swiftlang/swift-format/blob/swift-6.4.0-RELEASE/Sources/SwiftFormat/API/Configuration.swift), lines 461-464). Measured with `scratch-probe/n.swift` (`func Bad_name() {}`): no `rules` key gives 1 `AlwaysUseLowerCamelCase` finding; `{"rules":{"NeverForceUnwrap":true}}` gives 0; `{"rules":{}}` gives no findings at all (V6a/V6b). Whitespace findings (`Indentation`, `LineLength`, `TrailingWhitespace`, ...) come from the pretty-printer, not from rules, and keep firing, which hides the loss.
4. **Unknown rule names warn.** `Frontend.swift:76` emits `Configuration contains an unrecognized rule: <name>` as a warning ([Frontend.swift, 6.4.0 tag](https://github.com/swiftlang/swift-format/blob/swift-6.4.0-RELEASE/Sources/swift-format/Frontend/Frontend.swift)). With a config file, `lint -r .` exits 0 and `lint --strict -r .` exits 1 (`twin-typo`, V6c/V6d). With an inline `--configuration '<json>'` string no warning printed in the probe. A typo'd top-level key such as `lineLenght` is dropped silently and the default `lineLength: 100` applies; `swift format dump-configuration --effective | diff -u .swift-format -` shows `-"lineLenght" : 120` / `+"lineLength" : 100` (`FX/twin-keytypo`). The same diff does NOT reveal a missing or typo'd rule, because the effective dump echoes the rules dictionary as written (`FX/twin-missing`: diff empty).
5. **Nearest-ancestor config per file.** README: "looks for a JSON-formatted file named `.swift-format` in the same directory ... then it looks in the parent directory" ([README](https://github.com/swiftlang/swift-format/blob/main/README.md), lines 200-206). Measured in `FX/mono`: `pkgB/.swift-format` (2 spaces, `NeverForceUnwrap` off) made `pkgB` files fail `Indentation` under a repo-wide `lint --strict -r .` while `pkgA` followed the root config.
6. **Inline escapes.** `// swift-format-ignore-file` skips a file; `// swift-format-ignore: Rule1, Rule2` skips named rules on the next node; a bare `// swift-format-ignore` disables all rules on the next node ([IgnoringSource.md](https://github.com/swiftlang/swift-format/blob/main/Documentation/IgnoringSource.md), lines 12, 51-60, 80-84). Measured with `NeverForceUnwrap`: `a.swift` (ignore-file) exit 0, `b.swift` (ignore-rule) exit 0, `c.swift` (none) exit 1 (V11b). These comments are the escape hatches agents reach for; K-07 entry E15 finds them.
7. **`.swift-format-ignore` file.** 6.4.0 ships `IgnoreManager` ("Manages `.swift-format-ignore` files", gitignore syntax, [IgnoreManager.swift:15](https://github.com/swiftlang/swift-format/blob/swift-6.4.0-RELEASE/Sources/SwiftFormat/Utilities/IgnoreManager.swift)); a `vendor/` entry made `lint --strict -r .` exit 0 on 6.4.0 and exit 1 on 6.3.3 (V11a). No README or `IgnoringSource.md` text mentions it (`curl` of both at the 6.4.0 tag, zero matches).
8. **Recursion.** `-r .` skips hidden directories (`.build`, `.hidden` were not linted) but does lint non-hidden vendored trees such as `node_modules/` and includes `Package.swift` and `Tests` (`FX/dotprobe`).
9. **`Never*` test-code exemption is file-level.** Docs: "does not apply to test code, defined as code which: Imports a supported test library; The function is marked with `@Test` attribute" ([RuleDocumentation.md](https://github.com/swiftlang/swift-format/blob/main/Documentation/RuleDocumentation.md)). Measured: `import Testing` + `@Test` (clean), `import XCTest` + `testX` (clean), and `import Testing` with a plain `func helper() -> Int { Int("1")! }` (also clean); `@IBOutlet var label: String!` is skipped, `var plain: String!` is flagged (`FX/neverprobe`, run with the shipped config and `--strict`).
10. **Idempotence.** `format --in-place` run twice on swift-log (own config) changed nothing (G1 exit 0). swift-nio at HEAD is not a fixed point under released 6.3.3 or 6.4.0: 7 test files change, e.g. an `@_spi(...) @testable import` line moves below `import XCTest` under `shouldGroupImports` (`FX/measure/nio-fmt-6.4.diff`), which is a pin argument (2.9).

### 2.3 The gate triple, measured

**Verbatim gate** (repository root, inside the pinned toolchain; non-zero exit = fail; `xargs` reports a failing child as 123):

```sh
git add -A -- '*.swift' \
  && git ls-files -z --cached --others --exclude-standard -- '*.swift' | xargs -r -0 swift format format --parallel --in-place \
  && git ls-files -z --cached --others --exclude-standard -- '*.swift' | xargs -r -0 swift format lint --strict --parallel \
  && git diff --exit-code -- '*.swift'
```

The fixture script `FX/triple-ls.sh` is the last three lines (the `git add` is the agent-side prefix; CI on a clean checkout does not need it). Shape taken from the upstream `check-swift-format.sh`, which runs `git ls-files -z '*.swift' | xargs -0 "$SWIFT_FORMAT_BIN" format --parallel --in-place`, then `lint --strict --parallel`, then `GIT_PAGER='' git diff --exit-code '*.swift'` ([swiftlang/github-workflows@a0e26726cfe9](https://github.com/swiftlang/github-workflows/blob/main/.github/workflows/scripts/check-swift-format.sh), lines 22-43). Three deliberate departures, each measured:

| Departure | Why | Evidence |
|---|---|---|
| `--cached --others --exclude-standard` | upstream's tracked-only list never sees a file the agent just created | V4a exit 0 vs V4b exit 123 on an untracked misformatted file |
| `xargs -r` | with zero files `xargs` would run `swift format` with no operands, which reads stdin | read from `swift format lint --help` ("When no files are specified, it expects the source from standard input") |
| leading `git add -A -- '*.swift'` | `git diff` compares work tree to index; an agent's honest unstaged edit is otherwise a permanent red | S1 exit 1, S2 exit 0, S3 exit 1 (staged clean plus an unstaged sloppy edit stays red, correctly) |

Plant results (`FX/measure/triple-6.4.txt`, identical on 6.3.3; `-r .` forms A-C, `triple-ls.sh` form D):

| Fixture | A `lint -r .` | B `lint --strict -r .` | C `format --in-place && git diff` | D the triple |
|---|---|---|---|---|
| `plant` (misformatted + lint-only) | 0 (red: misses) | 1 | 1 | **123** |
| `plant-lintonly` | 0 (red) | 1 | **0 (red: misses)** | **123** |
| `plant-formatonly` | 0 (red) | 1 | 1 | **1** |
| `twin` (compliant) | 0 | 0 | 0 | **0** |

`lint --strict` alone also fails on formatting (B), so the triple's extra value is the middle step's repair: after `format --in-place` only findings that formatting cannot fix remain for `lint --strict`, and `git diff` shows the exact patch to commit. The plant's lint-only findings, from `swift format lint --strict -r .` after format: `Port.swift:2:16: error: [NeverForceUnwrap] do not force unwrap 'Int(text)'` and `Port.swift:6:13: error: [AlwaysUseLowerCamelCase] rename the function 'Parse_host' using lowerCamelCase`.

### 2.4 The shipped `.swift-format`

Owner Q2 default applied (4 spaces, 120 columns). The file is `swift format dump-configuration` from 6.4.0 with nine values changed, committed in dump form (sorted keys, ` : ` spacing) so a regenerate-and-diff is byte-stable. Full file: `FX/ship/.swift-format` (81 lines). Delta against the 6.4.0 defaults (`/usr/bin/diff FX/dumps/default-6.4.json FX/ship/.swift-format`):

```diff
 "indentConditionalCompilationBlocks" : true   ->  false
 "indentation.spaces"                 : 2      ->  4
 "lineBreakBeforeEachArgument"        : false  ->  true
 "lineBreakBeforeEachGenericRequirement" : false -> true
 "lineLength"                         : 100    ->  120
 "prioritizeKeepingFunctionOutputTogether" : false -> true
 "rules.NeverForceUnwrap"             : false  ->  true
 "rules.NeverUseForceTry"             : false  ->  true
 "rules.NeverUseImplicitlyUnwrappedOptionals" : false -> true
 "tabWidth"                           : 8      ->  4
```

- **Layout is the corpus mode, not invented.** `indentConditionalCompilationBlocks: false` is set in 23 of 24 swift-format configs, `lineBreakBeforeEachArgument: true` in 18, `tabWidth` in 17, `prioritizeKeepingFunctionOutputTogether: true` in 16, `lineBreakBeforeEachGenericRequirement: true` in 13, `lineLength` in 23 ([gates] §1b). swift-log's own file has exactly this layout: `swift-log@4038b6a4f74a:.swift-format:4` (4 spaces), `:17` (120).
- **Why not the tool defaults.** On swift-log with the tool defaults `swift format lint` printed 7,321 findings over `Sources` and `Tests` (7,115 `Indentation`, 201 `LineLength`; `[cod]` §13 counts 3,381 `Indentation` over `Sources` alone), with swift-log's own `.swift-format` it printed 0, and with the shipped file 20 (17 `NeverForceUnwrap`, 2 `UseLetInEveryBoundCaseVariable`, 1 `AlwaysUseLowerCamelCase`) (`FX/measure/lint-count.sh`). The 2-space/100-column alternative is the owner's switch: delete the `indentation`, `lineLength`, `tabWidth` overrides.
- **Existing config wins.** Adopted repositories keep their own `.swift-format`; the shipped file is for new repositories. 19 of 24 swift-format repos in the corpus set a different `lineLength` or indentation than the defaults ([gates] §1b), and a swap rewrites thousands of lines.
- **Keys valid on both lines.** The file carries `multilineTrailingCommaBehavior` and `orderedImports.shouldGroupImports`, which 6.3.3 silently ignores; formatting output was identical (V3 rows match on both). Because 6.3.3's default dump lacks those keys, the completeness check (V7) prints `"shouldGroupImports"` on 6.3.3; run it on the pinned toolchain only.

### 2.5 Which rules are on: noise measured on ten repositories

Config for the measurement: modal layout, tool-default rules (`FX/cfg/layout-modal.json`), `swift format lint` read-only over `Sources`, `Tests`, `Plugins` of eleven 4-space/120-column repos (`FX/measure/modal-4-120.txt`). Candidate rules switched on one at a time via `FX/cfg/candidates-on.json` over swift-log, swift-nio, async-http-client, service-lifecycle, distributed-tracing, lambda-runtime, containerization, container, vapor and swiftly (`FX/measure/candidates-on.txt`):

| Rule | Default | Hits (10 repos) | Decision | Reason |
|---|---|---|---|---|
| `NeverForceUnwrap` | off | 1,004 | **on** | no other tool sees `!`; exempt in test files; the K-07 grep cannot do it (E10 rejected) |
| `NeverUseForceTry` | off | 132 | **on** | same; `try!` also in K-07 E09 as a backstop |
| `NeverUseImplicitlyUnwrappedOptionals` | off | 49 | **on** | `@IBOutlet` exempt |
| `AllPublicDeclarationsHaveDocumentation` | off | 6,379 | off | library profile only; DocC rules belong to the docs set |
| `BeginDocumentationCommentWithOneLineSummary` | off | 2,286 | off | style |
| `ValidateDocumentationComments` | off | 1,344 | off | forces `- Parameter` completeness; agents already over-document |
| `UseEarlyExits` | off | 1,417 | off | rewrites control flow |
| `NoLeadingUnderscores` | off | 911 | off | conflicts with `_`-prefixed backing storage idiom |
| `NoEmptyLinesOpeningClosingBraces` | off | 1,062 | off | cosmetic |
| `OmitExplicitReturns` | off | 282 | off | 14/24 repos on, but it is a format rule: leave style to the owner |
| `AlwaysUseLiteralForEmptyCollectionInit` | off | 121 | off | cosmetic |
| `UseWhereClausesInForLoops` | off | 55 | off | |
| `AlwaysUseLowerCamelCase` | **on** | 1,087 | stay **on** | hits are C-interop and test-name code (nio `address_len`, `testOnly_connect`); greenfield Swift has none; inline ignore for the rare shim |
| `UseLetInEveryBoundCaseVariable` | **on** | 252 | stay on | the style agents already write (`case .a(let x, let y)`) |
| `UseSynthesizedInitializer` | **on** | 17 | stay on | not a false positive: a `public init` identical to the memberwise init is NOT flagged because memberwise is internal (`FX/rulefp/fp.swift`) |
| `UseSingleLinePropertyGetter` | **on** | 10 | stay on | |

The corpus turns `AlwaysUseLowerCamelCase` off in 18 of 24 configs and `UseLetInEveryBoundCaseVariable` in 17 ([gates] §1b) because those repos wrap C APIs and carry old code; for new agent-written code the rules are signal, and each rare exception is one `// swift-format-ignore: AlwaysUseLowerCamelCase` that K-07 E15 will list for review.

### 2.6 Never chain formatters; SwiftFormat as a tolerated incumbent

- **Measured chain.** Copy of swift-log@4038b6a4f74a (`Sources`, `Tests`, `.swift-format`, 31 files): swift-format alone is a fixed point (G1: `format --in-place && git diff` exit 0; G2: `lint --strict` exit 0). `swiftformat .` (0.63.1, defaults, no `.swiftformat`) then rewrote 30 of 31 files (1,227 insertions, 1,205 deletions); then `lint --strict` printed 608 errors (539 `Indentation`, 41 `Spacing`, 12 `OrderedImports`, 12 `NoAccessLevelOnExtensionDeclaration`, 4 `TrailingComma`) and the triple exited 1 (R1, R2; `FX/measure/chain-6.4.txt`, identical on 6.3.3). The earlier wave measured 2,795 on a different tree ([eco] §10); the direction is the same.
- **SwiftFormat is a gate on its own terms.** `swiftformat --lint` exits 1 and prints "Source input did not pass lint check. 30/31 files require formatting" on the swift-format tree; `--lint --lenient` exits 0 ([README, Linting and Error codes](https://github.com/nicklockwood/SwiftFormat#linting), lines 864-898). It warns "No Swift version was specified, so some formatting features were disabled" without `--swiftversion` or `.swift-version`.
- **Who uses it.** 7 of 40 repos have `.swiftformat` (Alamofire, IceCubesApp, element-x-ios, SwiftFormat, swiftly, swift-package-manager, tuist) against 24 with `.swift-format` ([gates] §1a). swiftly pins it `exact: "0.49.18"` in `Package.swift` (`swiftly@c8cf2e35bfca:Package.swift:35-36`) and gates with `swift run swiftformat --lint --dryrun .` (`.github/workflows/pull_request.yml:189`). SwiftFormat has about 156 rules including opt-in `preferSwiftTesting` and `redundantSendable` ([eco] §10; [Rules.md](https://github.com/nicklockwood/SwiftFormat/blob/main/Rules.md)).
- **Policy.** An existing `.swiftformat` repository keeps it and its own `--lint` gate; no repository carries both tools, and an agent never introduces SwiftFormat into a swift-format repository or the reverse.

### 2.7 SwiftLint's role: custom_rules only

- **Why not a general linter.** SwiftLint defaults produced about 2,300 findings on six repositories and 0 of 42 sampled hits were defects, 158 of 161 `comment_spacing` hits being license banners ([gates] Smell 8); only 4 of 40 repositories carry a root config and one gates it with `--strict` ([gates] §1d/1e); Nuke's `ci.sh` says "Not --strict yet: SwiftLint has never gated CI" (`Nuke@d5548dd61395:.scripts/ci.sh:452`). None of its rules covers the escape hatches ([cod] §12; [fail] §2.14).
- **What it is good for.** Regex `custom_rules` with syntax-kind filtering, which the plain grep set cannot do (comments and strings excluded). element-x-ios bans `print` this way (`element-x-ios@14e33866ced2:.swiftlint.yml:75-79`: `regex: "\\b(print)\\b"`, `match_kinds: identifier`, `severity: error`), SwiftLint's own config has four custom rules ([gates] §1d), Airbnb ships two ([airbnb/swift swiftlint.yml](https://raw.githubusercontent.com/airbnb/swift/master/Sources/AirbnbSwiftFormatTool/swiftlint.yml), lines 21-29: `@objcMembers`, direct stdout logging).
- **Semantics, measured on the official image** (`FX/swiftlint-probe/sem.yml`; the README says the same: [README, Defining Custom Rules](https://github.com/realm/SwiftLint/blob/main/README.md), lines 799-910):
  - `match_kinds` rejects any match that touches a kind not in the list: `@unchecked\s+Sendable` with `match_kinds: [attribute.builtin]` did not match (the span also covers a `typeidentifier`); with `[attribute.builtin, typeidentifier]` it matched line 2 and ignored the same text in a comment.
  - `excluded_match_kinds` (in source, not in the README: `RegexConfiguration.swift`, `excludedMatchKinds(from:)` at `SwiftLint@ec4691d9e813:Source/SwiftLintCore/RuleConfigurations/RegexConfiguration.swift`) is the inverse and was used for the shipped file; supplying both keys is a configuration error.
  - Flags `s` and `m` are on: `^import Foundation$` matched per line and `Task \{.*\n.*detached` matched across a newline; `capture_group: 1` moved the reported column to the group (`4:16` for `(try)!`).
  - `included`/`excluded` are regexes over the absolute path; `'/Tests/'` excluded test files.
  - `severity` defaults to warning; the shipped file uses `error`, so plain `swiftlint lint` exits 2.
  - A `// swiftlint:disable <rule>` comment suppresses the following lines, and a rule can suppress itself: `// swiftlint:disable lint_suppression` followed by `// swift-format-ignore` reported only line 1 (`FX/swiftlint-probe/self`). The grep entry E15 sees both lines, so the grep is the backstop.
- **Execution modes and the static binary.** `custom_rules` runs in `swiftsyntax` or `sourcekit` mode; the description says "Rules default to SwiftSyntax mode", but `isEffectivelySourceKitFree` falls back to `.sourcekit` when `default_execution_mode` is unset (`SwiftLint@ec4691d9e813:Source/SwiftLintFramework/Rules/CustomRules.swift:73-74` vs `:83-85`, post-0.65.1 main). Since 0.61.0 the Linux zip carries two binaries: `swiftlint` (dynamic, needs `libsourcekitdInProc.so` and `libxml2.so.2`) and `swiftlint-static`, where "Rules requiring SourceKit will be disabled and reported to the console" (`SwiftLint@ec4691d9e813:CHANGELOG.md:733-771`). Measured on 0.65.1:
  - official image `ghcr.io/realm/swiftlint:0.65.1` (built on the dynamic binary, `Dockerfile` copies `libsourcekitdInProc.so`): shipped file, `swiftsyntax` and `sourcekit` modes both worked and agreed on every probe (V10a);
  - `swiftlint-static`, default mode: `warning: Skipping enabled rule 'custom_rules' because it requires SourceKit and SourceKit access is prohibited.` and **exit 0** (V10c) - a silent no-op gate;
  - `swiftlint-static`, `default_execution_mode: swiftsyntax`: `SourceKit is disabled by configuration.: file Request+SwiftLint.swift, line 50` and **exit 134** (SIGABRT), even on a one-line file and with `--disable-sourcekit` (V10b);
  - the dynamic `swiftlint` from the zip does not load in the `swift:6.4` image (`libxml2.so.2` missing; that image ships `libxml2-16`) and does in `swift:6.3` after `apt-get install libxml2`.
- **`unhandled_throwing_task` is dropped from the shipped file.** On Swift 6.4 the compiler already warns `[#NoUseUnstructuredThrowingTask]` for `Task { try await work() }`; 6.3.3 does not. The SwiftLint rule has a false positive the compiler lacks: `func a() -> (Int, Task<Void, any Error>) { (1, Task { try await work() }) }` is flagged by SwiftLint (`utt.yml`) and not by `swiftc -typecheck -swift-version 6` on 6.4.0 (`FX/swiftlint-probe/tt2.swift`), and on Nuke 3 of the 4 hits sit in tests and store the `Task` in a tuple (`Nuke@d5548dd61395:Tests/NukeTests/ImagePipelineTests/ImagePipelineCoalescingTests.swift:91,362`); `swift-gates/warnings-and-ci.md` owns the compiler group.
- **Shipped file.** `FX/ship/.swiftlint.yml` (92 lines): `only_rules: [custom_rules]`, `default_execution_mode: swiftsyntax`, 13 code rules (YAML anchors `&code_only` for `excluded_match_kinds` and `&prod_paths` for `excluded: ['/Tests/', '/\.build/']`) plus `lint_suppression` (`match_kinds: [comment, doccomment]`). Rule ids and regexes: `unchecked_sendable` `@unchecked\s+Sendable`; `nonisolated_unsafe` `nonisolated\(unsafe\)`; `task_detached` `Task\.detached`; `gcd_dispatch` `DispatchQueue\.|DispatchQueue\(|DispatchSemaphore|DispatchGroup`; `main_actor_run` `MainActor\.run`; `hatch_review` `@preconcurrency|MainActor\.assumeIsolated`; `blocking_sleep` `Thread\.sleep|\busleep\(|Task\.sleep\(nanoseconds`; `force_try_cast` `\btry!|\bas!`; `process_spawn` `\bProcess\(\)|\bNSTask\b|\.launchPath`; `observable_object` `ObservableObject|@Published|@StateObject|@ObservedObject|@EnvironmentObject`; `completion_handler` `completion[A-Za-z]*:\s*@escaping|@escaping\s*\(Result<`; `legacy_lock` `NSLock|NSRecursiveLock|os_unfair_lock|pthread_mutex`; `exit_call` `(?<![.A-Za-z_])exit\(`; `lint_suppression` `swift-format-ignore|swiftlint:disable|swiftformat:disable`. Header of the file:

```yaml
# Optional. Carries the K-07 grep set as SwiftLint regex custom_rules. SwiftLint is never the format gate.
only_rules:
  - custom_rules
custom_rules:
  default_execution_mode: swiftsyntax
  unchecked_sendable:
    regex: '@unchecked\s+Sendable'
    excluded_match_kinds: &code_only [comment, comment.mark, comment.url, doccomment, doccomment.field, string]
    excluded: &prod_paths ['/Tests/', '/\.build/']
    message: "`@unchecked Sendable` silences the checker; isolate, Mutex or `sending` instead (K-07 e01)"
    severity: error
  # ... one block per rule above, same four keys, `excluded_match_kinds: *code_only`, `excluded: *prod_paths`
```

  Run it with `docker run --rm -v "$PWD:$PWD" -w "$PWD" ghcr.io/realm/swiftlint:0.65.1 lint --config .swiftlint.yml --no-cache --quiet` (`FX/swiftlint-image.sh`). Result on the planted tells: 24 violations, exit 2; on the compliant twin 0 violations, exit 0 (V10a). Over the five exemplars it found, e.g., 61 `unchecked_sendable` in swift-nio (grep: 63 raw, 2 comments), 21 of 25 `nonisolated_unsafe` raw grep hits in containerization after comments and strings were excluded was 19 (two further lines differ because kinds, not text, decide), and 62 `observable_object` in Nuke (grep 70 raw, 7 comments) (`FX/measure/swiftlint-*.txt`).

### 2.8 The K-07 agent-tell grep set

**Shape.** Every entry is `grep -rn --include='*.swift' --exclude-dir='.build' [--exclude-dir='Tests'] -F -e ... .` run from the repository root; the output is the violation list, empty output is a pass, and the exit status is not usable (`grep` returns 1 on no match, and behind `xargs` it becomes 123). A hit is removed or justified in the pull request description; for the hatches (E01, E02, E03, E06) the justification is a comment on the same or preceding line.

**Verbatim entries** (`FX/k07.sh`; E10 is deliberately absent, see below):

```sh
# E01 @unchecked Sendable
grep -rn --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -F -e '@unchecked Sendable' .
# E02 nonisolated(unsafe)
grep -rn --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -F -e 'nonisolated(unsafe)' .
# E03 Task.detached
grep -rn --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -F -e 'Task.detached' .
# E04 GCD
grep -rn --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -F -e 'DispatchQueue.' -e 'DispatchQueue(' -e 'DispatchSemaphore' -e 'DispatchGroup' .
# E05 MainActor.run
grep -rn --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -F -e 'MainActor.run' .
# E06 isolation hatches that need a justification
grep -rn --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -F -e '@preconcurrency' -e 'MainActor.assumeIsolated' .
# E07 blocking or legacy sleeps in production code
grep -rn --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -e 'Thread\.sleep' -e '[^.A-Za-z_]usleep(' -e 'Task\.sleep(nanoseconds' .
# E08 sleeps in tests (reads only Tests; a repository without a Tests directory prints a grep error)
grep -rn --include='*.swift' -e 'Task\.sleep' -e 'Thread\.sleep' Tests
# E09 force try and force cast
grep -rn --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -F -e 'try!' -e ' as! ' .
# E11 Foundation.Process
grep -rn --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -e '[^A-Za-z_]Process()' -e 'NSTask' -e '\.launchPath' .
# E12 pre-Observation SwiftUI state
grep -rn --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -F -e 'ObservableObject' -e '@Published' -e '@StateObject' -e '@ObservedObject' -e '@EnvironmentObject' .
# E13 completion-handler APIs
grep -rn --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -e 'completion[A-Za-z]*: *@escaping' -e '@escaping *(Result<' .
# E14 pre-Mutex locks
grep -rn --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -F -e 'NSLock' -e 'NSRecursiveLock' -e 'os_unfair_lock' -e 'pthread_mutex' .
# E15 linter suppressions (searches Tests too)
grep -rn --include='*.swift' --exclude-dir='.build' -F -e 'swift-format-ignore' -e 'swiftlint:disable' -e 'swiftformat:disable' .
# E16 exit() outside the entry point
grep -rn --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -e '[^.A-Za-z_]exit(' .
```

**Canary and exit wrapper** (`FX/k07-gate.sh`): the first line fails when no Swift file was scanned (wrong directory, wrong glob) so an empty result cannot be a vacuous pass; the last line prints hits and exits 1 on any:

```sh
grep -rl --include='*.swift' --exclude-dir='.build' -e 'import ' . | awk 'END { if (NR == 0) { print "K07 CANARY: no Swift file scanned" > "/dev/stderr"; exit 1 } }'
```

**Planted tells.** `FX/tells/plant` (compiles on 6.4.0 and 6.3.3 with 0 warnings, `swift build --build-tests`) holds one tell per entry; `FX/tells/twin` holds the modern equivalent (`Mutex`, actor, `@Observable`, `Task.sleep(for:)`, `guard let`, a `CommandRunner` protocol), also compiling clean on both. Hits per entry on the plant: E01 1, E02 1, E03 1, E04 4, E05 1, E06 2, E07 3, E08 1, E09 2, E11 1, E12 2, E13 2, E14 1, E15 2, E16 1; on the twin 0 for all. The compiler itself rejects one tell in async context: `Thread.sleep(forTimeInterval:)` inside an `async` function is `error: class method 'sleep' is unavailable from asynchronous contexts` (Swift 6 mode), so the planted sleep lives in a synchronous function.

**False positives on the five exemplars** (raw hits in non-test directories; FP = hit inside a comment or a string literal, counted by `FX/measure/k07-fp.py`; "context" uses such as benchmark targets are not counted as FP):

| Entry | containerization@3e7bc39e66b3 | swiftly@c8cf2e35bfca | vapor@bf77fc69b142 | swift-nio@e12881f2a691 | Nuke@d5548dd61395 | total raw / FP |
|---|---|---|---|---|---|---|
| E01 `@unchecked Sendable` | 5/0 | 0 | 1/0 | 63/2 | 5/1 | 74 / 3 |
| E02 `nonisolated(unsafe)` | 25/4 | 0 | 4/0 | 2/0 | 16/3 | 47 / 7 |
| E03 `Task.detached` | 1/0 | 0 | 0 | 0 | 5/0 | 6 / 0 |
| E04 GCD | 9/0 | 0 | 0 | 30/2 | 5/0 | 44 / 2 |
| E05 `MainActor.run` | 0 | 0 | 0 | 0 | 0 | 0 / 0 |
| E06 `@preconcurrency`, `MainActor.assumeIsolated` | 1/0 | 4/0 | 0 | 306/2 | 7/0 | 318 / 2 |
| E07 blocking/legacy sleep | 4/0 | 0 | 1/0 | 2/0 | 1/0 | 8 / 0 |
| E08 sleep in `Tests` | 11/0 | 3/0 | 17/0 | 35/0 | 14/0 | 80 / 0 |
| E09 `try!`, ` as! ` | 10/0 | 9/0 | 17/0 | 318/16 | 2/0 | 356 / 16 |
| E11 `Process()` | 1/0 | 3/0 | 0 | 0 | 0 | 4 / 0 |
| E12 `ObservableObject` family | 0 | 0 | 0 | 0 | 70/7 | 70 / 7 |
| E13 completion handler | 0 | 0 | 0 | 10/0 | 22/0 | 32 / 0 |
| E14 locks | 0 | 0 | 0 | 38/14 | 1/0 | 39 / 14 |
| E15 suppressions (every hit is a comment and a true positive) | 9 | 0 | 6 | 10 | 0 | 25 / 0 |
| E16 `exit(` | 0 | 4/0 | 0 | 0 | 0 | 4 / 0 |

Reading the table: the FP counts are low because the patterns are syntactic. The residue is not a defect count: Nuke's 22 E13 hits are `@escaping @Sendable (Swift.Error?) -> Void` completion parameters and `URLSessionDelegate` signatures that Apple's protocol requires (`Nuke@d5548dd61395:Sources/Nuke/Loading/DataLoader.swift:111,211`); containerization's E07 hits are retry back-off with `Task.sleep(nanoseconds:)` (`Sources/ContainerizationOCI/Client/RegistryClient.swift:266,288`); E11 in swiftly is the CLI's own spawn code (`Tools/generate-docs-reference/Extensions/Process+SimpleAPI.swift:30,34`). That is why the set is a review prompt on new code, not a ban on a legacy tree: apply it to the diff (touched-files form, `FX/k07-touched.sh`, red on a changed file with planted tells, green on a clean change):

```sh
git diff --name-only -z --diff-filter=AM HEAD -- '*.swift' | xargs -r -0 grep -n -F -e '@unchecked Sendable' -e 'nonisolated(unsafe)' -e 'Task.detached' -e 'DispatchQueue.' -e 'MainActor.run' -e 'try!' -e ' as! '
```

**Entries rejected.**
- *E10, force unwrap by grep.* The best regex (an identifier, `)` or `]` followed by `!` and then end of line, space, `.`, `,` or `)`) found 1,288 hits on the five exemplars, 141 of them in comments or strings ("Hello from the guest!"), about one in three also matched by E09 (`try!`, `as!`), and many more are idiomatic `baseAddress!`. `NeverForceUnwrap` is the tool for this and it was watched red (V3, plant).
- *`print(`.* Legitimate in CLIs; SwiftLint's `custom_rules` with `match_kinds: identifier` can carry a repository-specific ban (element-x-ios `.swiftlint.yml:75`), but there is no universal entry.
- *`fatalError(`.* 17 hits in containerization, 321 raw in swift-nio, mostly `preconditionFailure`-style unreachable code; kept out. `exit(` stays (E16) because a library calling `exit` bypasses the exit-code contract.
- *`import XCTest` and `import Combine`.* Owned by the testing and platform dives.

**Known blind spots.** Tells in generated code and `Tests/` are excluded by design (E08 and E15 read tests); a tell split across lines (`Task\n.detached`) is invisible to grep and visible to SwiftLint (the `s` flag); an alias (`typealias Q = DispatchQueue`) hides E04; `@unchecked` written as `@unchecked  Sendable` (two spaces) escapes the fixed-string E01 and is caught by the SwiftLint `\s+`.

### 2.9 Pinning tool versions in CI (M-M-14)

- **swift-format is the toolchain, so pin the toolchain patch.** Record `swift --version` (not `swift format --version`, 2.1), and use an exact image tag or a `.swift-version` file (5 of 40 repos have one, e.g. containerization `6.3.0`, swiftly `6.4.0`, [gates] §1a). `swift:6.3` floated to 6.3.3 in this very run. Reasons it matters: the default dump differs between 6.3.3 and 6.4.0 in two keys; `.swift-format-ignore` is honoured only from 6.4.0; the completeness check differs between lines (V7 on 6.3.3 reports `shouldGroupImports`); even upstream swift-nio at HEAD is not a fixed point of the released formatters (7 files, `FX/measure/nio-fmt-6.4.diff`); and formatter bugs on new syntax are fixed on `main` first (swift-format#1081, `nonisolated(nonsending)` mis-formatted, closed 2025-10-28; fixed in both 6.3.3 and 6.4.0 here, `FX/scratch-probe/ns.swift`).
- **SwiftLint: an exact image tag, never `latest`.** `ghcr.io/realm/swiftlint:0.65.1` (Nuke pins `0.65.0`, `ci.yml:69-77` per [gates] §1e). The check `FX/check-pins.sh` greps `swiftlint:latest`, `swift:latest`, `brew install swiftlint` and `brew install swiftformat` in workflows, Dockerfiles and Makefiles (red on `pinprobe-bad`: 2 hits; green on `pinprobe-good`: 0). element-x-ios installs both with an unpinned `brew install xcodegen swiftlint swiftformat` (`element-x-ios@14e33866ced2:ci_scripts/ci_common.sh:18`) - the anti-pattern.
- **SwiftFormat, where it already exists: SwiftPM `exact:`** as swiftly does (`Package.swift:36`), or the release binary by version; never Homebrew-latest.
- **Upgrade as one change.** Bump the toolchain, regenerate `.swift-format` with the new `dump-configuration`, rerun the gate and the completeness check in the same pull request; a toolchain bump that changes formatting must arrive with the reformatted files.

### 2.10 Config drift between packages (M-M-15)

- **Mechanism.** The nearest ancestor `.swift-format` wins per file (2.2 item 5), so a package-level config forks the style without any CI failure; and a sibling file such as containerization's `.swift-format-nolint` can fork the *enforcement* (2.11).
- **Policy and check.** One `.swift-format` at the repository root; nested copies must be byte-identical or absent. `FX/check-config-drift.sh` (run at the root; the output is the violation): `find . -name '.swift-format' -not -path './.build/*' -not -path './.swift-format' -print | xargs -r -n1 cmp .swift-format` printed `.swift-format ./pkgB/.swift-format differ: byte 35, line 2` on `FX/mono` and nothing on the twin (V8).
- **Corpus precedent.** swift-argument-parser and swift-embedded-examples keep a byte-for-byte copy of apple/swift-mmio's config and CI downloads upstream and `diff`s it (`swift-argument-parser@efd239f0055b:.github/workflows/pull_request.yml:21-24`, `swift-embedded-examples@119b29f83550:.github/workflows/lint.yml:24-27`, [gates] §1b).
- **Cross-repository drift** (a copy of the shipped file in many repositories) is solved by the lore set, not by the file: the rule text names the file's source and the regenerate command (`swift format dump-configuration`), and the adoption check is the completeness diff (V7).

### 2.11 Exemplar patterns worth copying and avoiding

- **Avoid: a config of record the gate never reads.** containerization's `.swift-format` turns `NeverForceUnwrap`, `NeverUseForceTry`, `NeverUseImplicitlyUnwrappedOptionals` and `ValidateDocumentationComments` on (`containerization@3e7bc39e66b3:.swift-format:35-37,63`), but `make fmt` runs `$(SWIFT) format ... --configuration .swift-format -i` (`Makefile:501`; format only, so lint-only rules never run), the local `swift-fmt-check` target lints with `.swift-format-nolint` (`Makefile:505`; 46 changed lines against `.swift-format`, 23 rules flipped off by `/usr/bin/diff`), and CI runs `make fmt` then `git diff --quiet` (`.github/workflows/containerization-build-template.yml:100-104`). apple/container repeats it (`container@f70ecbb926d9:Makefile:402,406`).
- **Copy: swift-log's committed layout** (`swift-log@4038b6a4f74a:.swift-format`, 0 findings) and the soundness job's three-step shape ([gates] §1e: swift-format gate in 21 repos).
- **Avoid: a gate that skips lint-only rules.** hummingbird runs `format --in-place` plus `git diff` in `scripts/validate.sh:39-40` with no `lint --strict` ([gates] §1e) - the V3a miss.
- **Avoid: config present, gate off.** swift-collections (`format_check_enabled: false`, `:77`), swift-system, swift-testing, swift-build ([gates] §1e): ten repositories carry a formatter config with no failing gate.
- **Avoid: format-and-commit bots as the only control.** pointfreeco's `format.yml` auto-commits fixes and never fails (`swift-composable-architecture@bc2db5ba8ad3:.github/workflows/format.yml:23-24`), so lint-only rules are not gated.
- **Xcode build phases (unverified: read only).** element-x-ios runs `swiftlint` and `swiftformat --lint --lenient` as build phases (`ElementX/SupportingFiles/target.yml:215,226`) and a git hook; `--lenient` returns 0 on findings, so it informs and does not gate.

## Normative guidance candidates

Family SW-GATE (format-and-lint share). "Ran" = watched red on a planted violation and green on the compliant twin; fixture paths are under `FX/` = `/home/mherwig/.cache/research-lang/swift-tools/fixtures/format-and-lint/`.

1. **SW-GATE-FL-01 - The formatter of record is the toolchain's `swift format`; commit one `.swift-format` at the repository root.**
   Why: swift-format is in 24 of 40 repos against 7 for SwiftFormat ([gates] §1a), ships with the compiler, and needs no second install.
   Verify: `find . -maxdepth 1 -type f -name '.swift-format' | awk 'END { if (NR == 0) print "MISSING .swift-format" }'` (output is the violation).
   Ran: yes - `FX/twin` empty, `FX/tells/empty` printed `MISSING .swift-format`.

2. **SW-GATE-FL-02 - The gate is the git-aware triple, run after `git add -A -- '*.swift'`: `format --in-place`, then `lint --strict`, then `git diff --exit-code -- '*.swift'`, over `git ls-files -z --cached --others --exclude-standard -- '*.swift' | xargs -r -0`.**
   Why: each single step passes a plant the triple fails (2.3); the index prefix stops an agent's own edits from reading as formatter drift.
   Verify: the verbatim block in 2.3; exit non-zero = fail.
   Ran: yes - `FX/run-triple.sh`: `plant` 123, `plant-lintonly` 123, `plant-formatonly` 1, `twin` 0 (Swift 6.4.0 and 6.3.3); `FX/run-staging.sh`: S1 1, S2 0, S3 1.

3. **SW-GATE-FL-03 - `swift format lint` without `--strict` is never reported as a pass.**
   Why: it exits 0 with findings (7 on the plant).
   Verify: `grep -rn --include='*.sh' --include='*.yml' --include='Makefile' -e 'swift format lint' -e 'swift-format lint' .` and read each hit for `--strict`; a hit without `--strict` is the violation.
   Ran: partly - the exit codes were run (V1 exit 0, V2 exit 1); the grep is a reading heuristic, not run.

4. **SW-GATE-FL-04 - Never pass hand-typed directories to the gate (`-r Sources`); use `git ls-files` or `-r .`.**
   Why: a mistyped or missing directory exits 0 silently, also on the red plant.
   Verify: `swift format lint --strict -r Source` on a repository with violations must NOT be the gate; the gate block in 2.3 contains no directory operand.
   Ran: yes - V13a/V13c: `-r Source` exit 0 on twin and on the red plant; `-r .` exit 1 on the plant.

5. **SW-GATE-FL-05 - `.swift-format` carries the full rules block (43 rules on 6.4.0), generated by the pinned toolchain, never hand-trimmed.**
   Why: a `rules` object replaces the defaults; a partial block switches every unlisted rule off (28 off in the probe).
   Verify: `swift format dump-configuration | cat - .swift-format | awk '/^    "[A-Za-z]*"/ { n[$1]++ } END { for (k in n) if (n[k] != 2) print n[k], k }' | sort` (`FX/check-rules-complete.sh`; run on the pinned toolchain; output is the violation).
   Ran: yes - `twin` empty; `twin-missing` printed `1 "UseEarlyExits"`; `twin-typo` printed the missing and the misspelled name; on 6.3.3 a 6.4.0-generated file prints `shouldGroupImports` (expected skew).

6. **SW-GATE-FL-06 - Any edit to rule names or keys is verified by `lint --strict` (unknown rule) and by an effective-config diff (unknown key).**
   Why: an unknown rule is a warning (error only under `--strict`); an unknown top-level key is dropped silently.
   Verify: `swift format lint --strict -r .` (exit 1 on a typo'd rule) and `swift format dump-configuration --effective | diff -u .swift-format -` (non-empty on a typo'd key such as `lineLenght`).
   Ran: yes - `twin-typo`: `lint` 0, `lint --strict` 1 (V6c/V6d); `twin-keytypo`: diff showed `-"lineLenght" : 120` / `+"lineLength" : 100`; canonical `twin`: diff empty exit 0.

7. **SW-GATE-FL-07 - Shipped content: 4 spaces, 120 columns, `indentConditionalCompilationBlocks: false`, `lineBreakBeforeEachArgument` and `lineBreakBeforeEachGenericRequirement` true, `prioritizeKeepingFunctionOutputTogether` true, `tabWidth` 4, defaults elsewhere (owner Q2).**
   Why: the corpus-modal layout; swift-log's identical layout yields 0 findings on its own tree.
   Verify: `diff -u` of the file against `FX/ship/.swift-format` for new repositories; adopted repositories are exempt (rule 8).
   Ran: yes - the shipped file is the gate config for every fixture run above.

8. **SW-GATE-FL-08 - In an adopted repository the existing `.swift-format` (or `.swiftformat`) wins; an agent never rewrites indentation or width.**
   Why: tool defaults give 7,115 `Indentation` findings on swift-log against 0 with its own file.
   Verify: `git diff origin/main -- .swift-format .swiftformat .swiftlint.yml` must be empty in a pull request that is not about the gate (output is the violation).
   Ran: no, reading heuristic; the underlying counts were measured (`FX/measure/lint-count.sh`).

9. **SW-GATE-FL-09 - Turn on `NeverForceUnwrap`, `NeverUseForceTry`, `NeverUseImplicitlyUnwrappedOptionals` in new repositories; leave `AllPublicDeclarationsHaveDocumentation`, `ValidateDocumentationComments`, `BeginDocumentationCommentWithOneLineSummary`, `UseEarlyExits` off.**
   Why: the three are the only checker for `!`, `try!`, `T!`; the four others produced 6,379, 1,344, 2,286 and 1,417 hits on ten repositories.
   Verify: `swift format lint --strict -r .` on code containing `Int(text)!`, `try!` and `var x: String!`.
   Ran: yes - plant: `Port.swift:2:16: error: [NeverForceUnwrap] do not force unwrap 'Int(text)'`; `Force.swift` (tells/plant): `NeverUseForceTry`, `NeverForceUnwrap` (cast and unwrap); IUO via `FX/neverprobe/T4.swift`; twin clean.

10. **SW-GATE-FL-10 - Do not count the `Never*` rules as enforced unless the gate lints with the file that enables them; do not keep a second config with the lint rules off.**
    Why: containerization enables them in `.swift-format` and enforces none (2.11).
    Verify: `find . -maxdepth 2 -name '.swift-format*' -not -path './.build/*'` lists exactly one file; the gate's `lint --strict` uses no `--configuration` override.
    Ran: no for the find (reading heuristic); the underlying mechanism was read in `containerization@3e7bc39e66b3:Makefile:501,505`.

11. **SW-GATE-FL-11 - Never run SwiftFormat, `swiftlint --fix`, or a second formatter over a swift-format tree.**
    Why: 608 `lint --strict` findings and a red triple after one `swiftformat .`.
    Verify: the gate in rule 2 stays green after any other tool; `grep -rn --include='*.yml' --include='Makefile' --include='*.sh' -e 'swiftformat' -e 'swiftlint --fix' -e 'swiftlint autocorrect' .` returns no hit in a swift-format repository.
    Ran: yes for the churn - `FX/run-chain.sh` R1 exit 1, R2 608, G1/G2 exit 0 (6.4.0 and 6.3.3); the grep is a reading heuristic.

12. **SW-GATE-FL-12 - A repository that already has `.swiftformat` keeps it with its own `swiftformat --lint` gate (never `--lenient`); it does not also gain `.swift-format`.**
    Why: `--lenient` returns 0 on findings; two tools fight.
    Verify: `find . -maxdepth 1 -type f -name '.swiftformat' -o -maxdepth 1 -type f -name '.swift-format'` lists one file, and `grep -rn --include='*.yml' --include='Makefile' --include='*.sh' -e 'swiftformat --lint' -e 'lenient' .` shows `--lint` without `--lenient`.
    Ran: yes for exit codes - `swiftformat --lint` 1, `--lint --lenient` 0 on the swift-log copy; the find/grep is a reading heuristic.

13. **SW-GATE-FL-13 - SwiftLint is optional and carries only `custom_rules` (`only_rules: [custom_rules]`); it is never the formatter and never the reason a pull request is green.**
    Why: 0 of 42 sampled default-rule hits were defects ([gates] Smell 8); no built-in rule sees the escape hatches.
    Verify: `grep -n -e 'only_rules' -e 'custom_rules' .swiftlint.yml` shows both keys; run `swiftlint lint --config .swiftlint.yml --no-cache --quiet` from the official image.
    Ran: yes - `FX/ship/.swiftlint.yml` on `tells/plant` exit 2 with 24 violations, on `tells/twin` exit 0 with 0.

14. **SW-GATE-FL-14 - Run SwiftLint custom rules only from `ghcr.io/realm/swiftlint:<exact>` or the dynamic `swiftlint` binary; treat any `Skipping enabled rule` line as a failed gate.**
    Why: `swiftlint-static` skips `custom_rules` with exit 0, or aborts with 134 in `swiftsyntax` mode.
    Verify: `swiftlint lint --config .swiftlint.yml --no-cache 2>&1 | grep -c 'Skipping enabled rule'` must print 0 (stdin form of grep; output must be `0`).
    Ran: yes - static, default mode: 1 `Skipping enabled rule` warning, exit 0 (V10c); static, `swiftsyntax` mode: exit 134 (V10b); image: exit 2 on the plant.

15. **SW-GATE-FL-15 - Write each custom rule with `excluded_match_kinds` for comment/doc/string kinds, or `match_kinds` listing every kind the match touches; use `severity: error`.**
    Why: `match_kinds: [attribute.builtin]` alone silently never matched `@unchecked Sendable`.
    Verify: a planted tell in code, in a comment and in a string: the rule reports only the code line.
    Ran: yes - `FX/swiftlint-probe/sem.yml`: `k_attr_only` no match, `k_both` and `k_excl_comment` matched line 2 only, comment line 3 unreported.

16. **SW-GATE-FL-16 - Do not add `unhandled_throwing_task` on Swift 6.4+; promote `NoUseUnstructuredThrowingTask` through the compiler.**
    Why: the compiler warns without SwiftLint's tuple-stored-`Task` false positive.
    Verify: `swiftc -typecheck -swift-version 6 -Werror NoUseUnstructuredThrowingTask file.swift` (6.4.0 only; unknown group warning on 6.3.3) on `Task { try await work() }`.
    Ran: partly - the warning and the absence of a false positive were run (`FX/swiftlint-probe/tt.swift`, `tt2.swift`); the `-Werror` spelling is owned by `swift-gates/warnings-and-ci.md`.

17. **SW-GATE-FL-17 - The K-07 entries E01-E09 and E11-E16 run on every new-code change and each hit is removed or justified in writing; run them over the changed files in adopted repositories.**
    Why: no linter or compiler flag catches `@unchecked Sendable`, `nonisolated(unsafe)`, `Task.detached`, GCD or `MainActor.run` ([cod] §12); an agent reaches for each.
    Verify: the verbatim block in 2.8; `bash k07-gate.sh` exits 1 on any hit or on a zero-file scan; touched-files form for adopted repos.
    Ran: yes - plant 15/15 entries hit, twin 0/15 (V9); `k07-gate.sh` plant 1, twin 0, empty directory 1 (canary); touched-files form red on planted change, green on clean change.

18. **SW-GATE-FL-18 - Judge every grep-based check by its output, not its exit status, and always keep the zero-file canary in front.**
    Why: `grep` exits 1 on no match, 123 behind `xargs`; a scan of the wrong directory is silent.
    Verify: the canary line in 2.8 prints `K07 CANARY: no Swift file scanned` on `FX/tells/empty`.
    Ran: yes - exit 1 with the canary message on the empty directory.

19. **SW-GATE-FL-19 - Do not detect force unwraps by grep; rely on `NeverForceUnwrap` (rule 9).**
    Why: 1,288 hits on five exemplars, 141 in comments/strings, idiomatic `baseAddress!` dominates.
    Verify: reading heuristic - the rule ships no grep; the comparison is in 2.8.
    Ran: the regex was run on the exemplars (`FX/measure/k07-fp.py`); no planted gate, by design.

20. **SW-GATE-FL-20 - Linter suppressions (`swift-format-ignore`, `swiftlint:disable`, `swiftformat:disable`) and gate-file edits (`.swift-format`, `.swiftlint.yml`, `.swiftformat`, `.swift-format-ignore`) require a one-line written justification and are listed in the pull request description.**
    Why: they are the cheapest way for an agent to turn a red gate green.
    Verify: K-07 E15 plus `git diff origin/main -- .swift-format .swiftlint.yml .swiftformat .swift-format-ignore` (non-empty output = needs sign-off).
    Ran: yes for E15 (plant 2 hits, twin 0; self-suppression test: SwiftLint reported line 1 only while the grep reported both lines); the diff is a reading heuristic.

21. **SW-GATE-FL-21 - Keep exactly one `.swift-format` per repository; nested copies must be byte-identical to the root copy or absent.**
    Why: the nearest ancestor wins per file and a nested file silently changes the style of its package.
    Verify: `find . -name '.swift-format' -not -path './.build/*' -not -path './.swift-format' -print | xargs -r -n1 cmp .swift-format` (output is the violation).
    Ran: yes - `FX/mono` printed `.swift-format ./pkgB/.swift-format differ: byte 35, line 2`; `FX/twin` empty.

22. **SW-GATE-FL-22 - Exclude generated and vendored Swift through `.gitignore` plus the `git ls-files` file list, not through `-r .`; use `.swift-format-ignore` only when every toolchain in the matrix is 6.4.0 or newer.**
    Why: `-r .` lints non-hidden vendored trees; `.swift-format-ignore` is honoured by 6.4.0 and ignored by 6.3.3 and is undocumented.
    Verify: `swift format lint --strict -r .` on a tree with an ignored `vendor/` directory: exit 0 only with the ignore file on 6.4.0.
    Ran: yes - `FX/ignfile`: 6.4.0 exit 0, 6.3.3 exit 1 (V11a); `triple-ls.sh` with `vendored/` in `.gitignore`: exit 0 (clean files only).

23. **SW-GATE-FL-23 - Pin the toolchain patch, the SwiftLint image tag and any SwiftFormat dependency; record `swift --version` in CI logs.**
    Why: `swift format --version` prints `main`; `swift:6.3` floats; defaults and ignore semantics differ between 6.3.3 and 6.4.0.
    Verify: `grep -rn --include='*.yml' --include='*.yaml' --include='Dockerfile' --include='Makefile' -e 'swiftlint:latest' -e 'swiftlint@latest' -e 'swift:latest' -e 'brew install swiftlint' -e 'brew install swiftformat' .` (output is the violation) and `find . -maxdepth 1 -type f -name '.swift-version' | awk 'END { if (NR == 0) print "MISSING .swift-version" }'`.
    Ran: yes for the grep - `FX/pinprobe-bad` 2 hits, `pinprobe-good` 0; the `.swift-version` check is a reading heuristic.

24. **SW-GATE-FL-24 - Gate configuration changes ship with the reformatted files in the same change; regenerate `.swift-format` with `swift format dump-configuration` of the pinned toolchain.**
    Why: swift-nio's tree is not a fixed point of the released formatter (7 files) - drift becomes a standing red.
    Verify: rule 2 passes on the pull request commit.
    Ran: yes for the mechanism (`version-drift.txt`); no for the process.

## Verification runs

All on Linux in Docker, 2026-10-10. Exit codes copied from `FX/measure/verify-all-6.4.txt` (Swift 6.4.0) and `verify-all-6.3.txt` (6.3.3); rows marked "same" were identical on both lines. Re-run: `bash FX/verify-all.sh` (prefix `SWIFT_VERSION=6.3` for the prior line). A "red" is a check that failed or exited 0 where the violation exists (the check missed); a "green" is the intended behaviour.

| # | Fixture | Command | Violation | Compliant twin | Key output |
|---|---|---|---|---|---|
| V1 | `plant`, `twin` | `swift format lint -r .` | **0 (red: misses)** | 0 | 7 `warning:` lines on the plant: `Counter.swift:2:1 [Indentation] indent by 2 spaces` ... `Port.swift:2:16 [NeverForceUnwrap]` |
| V2 | same | `swift format lint --strict -r .` | **1 (green)** | 0 | same lines as `error:` |
| V3a | `plant`, `plant-lintonly`, `plant-formatonly`, `twin` | `swift format format --in-place -r . && git diff --exit-code -- '*.swift'` | 1, **0 (red: lint-only)**, 1 | 0 | the lint-only plant passes: `format` leaves it unchanged |
| V3b | same | the verbatim triple (`FX/triple-ls.sh`) | 123, 123, 1 | 0 | `error: [NeverForceUnwrap] ...`, `error: [AlwaysUseLowerCamelCase] rename the function 'Parse_host' using lowerCamelCase` |
| V4a | `twin` + untracked `NewBad.swift` | tracked-only triple (upstream shape, `FX/triple-ls-tracked.sh`) | **0 (red: misses new file)** | - | no output |
| V4b | same | `--cached --others --exclude-standard` triple | 123 (green) | - | |
| S1-S3 | `twin` | triple as-is / after `git add -A -- '*.swift'` / staged-clean + unstaged sloppy edit | S1 1 (false red), S2 0, S3 1 | - | `FX/run-staging.sh` |
| G1/G2 | copy of swift-log@4038b6a4f74a | swift-format alone: `format --in-place && git diff`; `lint --strict` | 0, 0 (stable) | - | `FX/run-chain.sh` |
| R1/R2 | same | `swiftformat .` after swift-format, then the triple / `lint --strict` | **1 (red churn)**; 608 findings | - | 539 `Indentation`, 41 `Spacing`, 12 `OrderedImports`, 12 `NoAccessLevelOnExtensionDeclaration`, 4 `TrailingComma`; `30/31 files formatted` |
| V6a/V6b | `scratch-probe/n.swift` | `swift format lint --configuration '{"version":1,"rules":{"NeverForceUnwrap":true}}'` / no `rules` key | 0 findings (rule silently off) | 1 finding | |
| V6c/V6d | `twin-typo` | `lint -r .` / `lint --strict -r .` | 0 / **1** | - | `warning: Configuration contains an unrecognized rule: NeverForceUnwrapp` (becomes `error:` under `--strict`) |
| V7 | `twin`, `twin-missing`, `twin-typo` | `FX/check-rules-complete.sh` | prints `1 "UseEarlyExits"`; prints `1 "NeverForceUnwrap"` and `1 "NeverForceUnwrapp"` | empty | on 6.3.3 a 6.4.0-generated file additionally prints `1 "shouldGroupImports"` (skew) |
| V8 | `mono`, `twin` | `FX/check-config-drift.sh` | prints `.swift-format ./pkgB/.swift-format differ: byte 35, line 2` | empty | |
| V9 | `tells/plant`, `tells/twin`, `tells/empty` | `FX/k07-gate.sh` | 1 (15 entries hit) | 0 (0 hits); empty dir 1 | `K07 CANARY: no Swift file scanned` on the empty directory |
| V9b | same | per-entry counts | e01=1 e02=1 e03=1 e04=4 e05=1 e06=2 e07=3 e08=1 e09=2 e10=4 e11=1 e12=2 e13=2 e14=1 e15=2 e16=1 | all 0 | e10 is the rejected regex |
| V10a | `tells/plant`, `tells/twin` | `docker run ghcr.io/realm/swiftlint:0.65.1 lint --config .swiftlint.yml --no-cache --quiet` | **2** (24 violations) | 0 | `error: gcd_dispatch Violation: GCD in new code ...` etc. |
| V10b | `tells/plant` | `swiftlint-static lint --config .swiftlint.yml` (swiftsyntax mode) | **134 (abort)** | - | `SourceKit is disabled by configuration.: file Request+SwiftLint.swift, line 50` |
| V10c | `tells/plant` | `swiftlint-static`, no `default_execution_mode` | exit 0, 1 warning | - | `Skipping enabled rule 'custom_rules' because it requires SourceKit and SourceKit access is prohibited.` |
| V11a | `ignfile` | `lint --strict -r .` with `.swift-format-ignore` containing `vendor/` | 6.4.0: 0; 6.3.3: **1** | without the file: 1 | |
| V11b | `ignores` | `lint --strict a.swift b.swift c.swift` | a 0, b 0, c 1 | - | ignore-file, ignore-rule, none |
| V13 | `twin`, `plant` | `lint --strict -r Source` (nonexistent) | **0 (red)** on plant | 0 | no output at all |
| - | `neverprobe` | `lint --strict T1.swift T2.swift T3.swift T4.swift` | only `T4.swift:5:16 [NeverUseImplicitlyUnwrappedOptionals]` | - | file-level test exemption |
| - | `tells/diff` | `FX/k07-touched.sh` | 5 hits on changed planted files | empty on clean change | |
| - | `swiftlint-probe/self` | shipped config over `// swiftlint:disable lint_suppression` + `// swift-format-ignore` | SwiftLint reports line 1 only; grep reports both | - | self-suppression |
| - | `pinprobe-bad`, `pinprobe-good` | `FX/check-pins.sh` | 2 hits | 0 | `swiftlint:latest`, `brew install swiftformat` |
| - | `scratch-probe` | `swiftc -typecheck -swift-version 6` on `Task { try await work() }` | 6.4.0: `warning: unstructured throwing task ... [#NoUseUnstructuredThrowingTask]`; 6.3.3: none | tuple-stored `Task`: no warning | |

Red tallies: V1, V3a (lint-only), V4a, V13, V10c (and the V10b abort) are checks that missed or aborted on a planted violation and are reported as such; V2, V3b, V4b, R1, V6d, V7, V8, V9, V10a are the watched-red-then-green verifications that the rules above rely on. Counted as "watched red on a planted fixture": triple (3 plants), `--strict`, untracked-file, chain, config typo, rules-complete (2 plants), drift, K-07 gate (15 entries on one plant plus the canary), SwiftLint custom rules, pin check, effective-config key typo, ignore-file, staging = 31 distinct verifications.

## Exemplar evidence

| Candidate | Satisfies | Violates / contradicts |
|---|---|---|
| FL-01/07 shipped layout, one root config | swift-log 120/4 (`swift-log@4038b6a4f74a:.swift-format:4,17`; 0 findings); swift-nio, crypto, async-http-client, service-lifecycle 120/4 ([gates] §1e) | vapor 140, hummingbird 150, containerization/container 180/2 (`containerization@3e7bc39e66b3:.swift-format:14`), swift-build 10000 with no rules (`swift-build@2187330e13e7:.swift-format:3-9`): the corpus has no single width |
| FL-02 triple | `swiftlang/github-workflows` `check-swift-format.sh` (21 repos via soundness, [gates] §1e); swift-protobuf `build.yml:141-146`; aws-lambda-runtime `scripts/check-format.sh:50`; JavaScriptKit `test.yml:129-142` | hummingbird `scripts/validate.sh:39-40` (no `lint --strict`); containerization CI (`make fmt` + `git diff`, no lint); TCA/dependencies/snapshot-testing auto-commit bot; swift-collections, swift-system, swift-testing gate off; Alamofire, IceCubesApp: none |
| FL-04 no hand-typed dirs | upstream script uses `git ls-files` | containerization `SWIFT_SRC = $(shell find . -type f -name '*.swift' -not -path "*/.*" ...)` (`Makefile:497`) works but is a find, not a list |
| FL-05 full rules block | every one of the 24 swift-format configs lists a full or near-full block (swift-log lists 40) | none measured; the failure mode is hypothetical in the corpus |
| FL-09 `Never*` on | containerization/container (`.swift-format:35-37`), 4 of 24 repos turn each on ([gates] §1b) | the same two never run them in CI (2.11); 17 of 24 do not enable them |
| FL-10 config the gate reads | swift-log (one file) | containerization `.swift-format-nolint` (46 changed lines) |
| FL-11 no chaining | swift-log, swift-nio (swift-format only) | element-x-ios runs SwiftLint plus SwiftFormat as build phases with `--lenient` (`target.yml:215,226`); tuist runs swiftformat `--lint` plus SwiftLint non-strict (`cli.yml:124-126`): two tools, each on its own domain, not chained over one tree |
| FL-12 SwiftFormat gate | swiftly `pull_request.yml:189` (`--lint --dryrun`, pin `0.49.18`), SwiftFormat `validate_pr.yml:32` | Alamofire and IceCubesApp have the config and no gate |
| FL-13/14 SwiftLint role | SwiftLint `.swiftlint.yml:111-137` (4 custom rules), element-x-ios `.swiftlint.yml:75-79`, tuist `no_fatal_error_in_tests`, Airbnb custom rules | Nuke `ci.sh:452` non-strict "has never gated CI"; only SwiftLint itself gates strictly (`test.yml:96`) |
| FL-17 K-07 | per-entry counts in 2.8; swift-nio is the heaviest user of every hatch (63 `@unchecked Sendable`, 306 `@preconcurrency`) | all five exemplars would fail a whole-tree run; hence the touched-files form |
| FL-21 one config | swift-argument-parser and swift-embedded-examples diff against upstream swift-mmio in CI | tuist carries a nested `examples/` `.swiftlint.yml` ([gates] §1a); SwiftLint's own tree has 12 test-fixture configs |
| FL-23 pins | swiftly `exact: "0.49.18"`; Nuke `swiftlint:0.65.0` image; containerization `.swift-version` `6.3.0` | element-x-ios `brew install ... swiftlint swiftformat` unpinned (`ci_scripts/ci_common.sh:18`); swift-argument-parser and swift-async-algorithms use a nightly format image to dodge a formatter bug ([gates] §1e, swift-format#1081) |

## AI-agent angle

| What an LLM gets wrong | Mechanical check that catches it | Ran |
|---|---|---|
| Runs `swift format lint -r Sources` (no `--strict`, hand-typed directory) and reports "lint clean" | the gate block in 2.3 contains neither; V1/V13 show both pass on the red plant | yes |
| Writes a `.swift-format` containing only the rules it wants changed (`"rules": {"NeverForceUnwrap": true}`), silently disabling 28 rules | `check-rules-complete.sh` (empty = pass) | yes |
| Hallucinates rule or key names (`NoForceUnwrap`, `lineLenght`, `"indent": 4`) | `lint --strict` (rule names), effective-config diff (keys) | yes |
| Uses the macOS spelling or flags: `swift-format -i`, `swift format --in-place file.swift` without `format`, `--recursive` on the wrong subcommand | the gate runs verbatim; a wrong flag exits non-zero with usage text | no (reading heuristic) |
| Runs `swift format format --in-place` then also `swiftformat .` "to be thorough", or `swiftlint --fix` | triple red afterwards (608 findings); FL-11 grep | yes |
| Runs the triple without staging, sees it red on its own honest edit, then "fixes" by reverting its change or by disabling `git diff` | S1 vs S2; the rule text says stage first | yes |
| Creates a new file and the gate passes because only tracked files are listed | `--cached --others --exclude-standard` (V4) | yes |
| Turns a red gate green by adding `// swift-format-ignore`, `// swiftlint:disable`, a `.swift-format-ignore` entry, or editing `.swift-format` | K-07 E15, config diff against `origin/main` | yes (E15) |
| Writes `Task.detached`, `DispatchQueue.main.async`, `@unchecked Sendable`, `nonisolated(unsafe)`, `MainActor.run`, completion-handler APIs, `ObservableObject`, `NSLock`, `Process()`, `Thread.sleep`, `try!` | K-07 E01-E16 (15 entries) | yes |
| Puts `Thread.sleep` in an `async` function | the compiler: `error: class method 'sleep' is unavailable from asynchronous contexts` (Swift 6 mode) | yes |
| Trusts `swiftlint` exit 0 when `custom_rules` were skipped (static binary) | `grep -c 'Skipping enabled rule'` must print 0 (FL-14) | yes |
| Installs `swiftlint` or `swiftformat` from Homebrew-latest in CI, or `ghcr.io/realm/swiftlint:latest` | `FX/check-pins.sh` | yes |
| Assumes `swift format --version` identifies the formatter (`main`) and pins nothing | FL-23 `.swift-version` check and `swift --version` log line | partly |
| Believes `NeverForceUnwrap` covers tests and non-test helpers in test files | `FX/neverprobe` shows file-level exemption | yes |
| Generates `@preconcurrency import` or `import Combine` on Linux | E06 grep; `import Combine` is a hard build error on Linux (owned by the platform dive) | E06 yes |
| Rewrites a repository's indentation to match the shipped file | FL-08 diff of config files; thousands of changed lines | no |

## Contested / evolving

- **Tool defaults (2/100) vs 4/120.** The corpus is split: swift-log, nio, crypto, async-http-client at 4/120, swift-argument-parser, collections, async-algorithms at 2/80-120, pointfreeco at 2/100 defaults. Owner Q2 chose 4/120; neither is wrong for a new repository (decided by Q2, 2026-10-10). Trend: no movement; each family keeps its inherited layout.
- **How many rules to switch off.** 18 of 24 repos turn `AlwaysUseLowerCamelCase` off; this research keeps it on for new code and relies on inline ignores, which is stricter than the corpus. If adopters complain about C-interop code, the cheap change is one `swift-format-ignore` per shim, not a rule switch.
- **`Never*` rules and tests.** The docs describe a two-part exemption that behaves as a file-level one (2.2 item 9). Whether `import Testing` in a production file should disable them is a swift-format design question (`TODO: Create exceptions for other UI elements` is in the rule docs); unresolved as of `main` b15dd59fad21.
- **SwiftLint execution mode.** The rule description says SwiftSyntax mode is the default; the code treats an unset `default_execution_mode` as SourceKit for the purposes of `isEffectivelySourceKitFree` (`CustomRules.swift:73-74` vs `:83-85`). The static binary's abort (exit 134) in SwiftSyntax mode is observed on 0.65.1 and is probably a bug; both are likely to change, so keep the explicit `default_execution_mode: swiftsyntax` and the image pin, and re-run V10 after each SwiftLint bump.
- **`.swift-format-ignore`.** Implemented in 6.4.0 (`IgnoreManager`), absent from 6.3.3 and from the docs; likely to be documented later. Trend: toward a first-class ignore file like `.swiftformatignore` (which only `swiftlang/github-workflows` honours, for 6 repos per [gates] §1a).
- **Rule roster drift.** `main` documents 44 rules (`SwiftTestingNamingConventions` is new); 6.4.0 has 43. A config generated on `main` carries a rule 6.4.0 reports as unrecognized (a warning, an error under `--strict`) - the exact skew FL-23 prevents.
- **swift-format vs SwiftFormat.** swift-format 24 vs SwiftFormat 7 ([gates] §1a); SwiftPM itself still uses SwiftFormat; Airbnb's current guide formats with SwiftFormat at `--swift-version 6.4 --language-mode 5` ([cod] §4). Trend since Swift 6: toolchain-shipped swift-format is the default for new Apple and server repos; SwiftFormat survives in apps and in SwiftPM. As of 2026-10-10.
- **SwiftLint's future for concurrency checks.** `incompatible_concurrency_annotation` and `unhandled_throwing_task` exist; none covers the escape hatches, and the compiler is absorbing `unhandled_throwing_task` (SE-0520 warning in 6.4). Re-check the roster on each SwiftLint release.
- **Apple and Windows.** Everything here ran on Linux. Xcode build-phase gating, `xcrun --find swift-format`, and Windows path behaviour of `git ls-files`/`xargs` are unverified: read only (owner Q7).

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://github.com/swiftlang/swift-format/blob/main/Documentation/Configuration.md | swift-format configuration reference (primary) | `main` b15dd59fad21, 2026-10-10 | every key and default; `multilineTrailingCommaBehavior`, `orderedImports.shouldGroupImports` |
| https://github.com/swiftlang/swift-format/blob/main/Documentation/RuleDocumentation.md | swift-format rule catalogue, generated (primary) | `main`, 44 rules | lint-only vs format rules; `Never*` test exemption text |
| https://github.com/swiftlang/swift-format/blob/main/README.md | swift-format README (primary) | `main` | `--strict` semantics (lines 151-154), config discovery (200-206), toolchain inclusion (66-68) |
| https://github.com/swiftlang/swift-format/blob/main/Documentation/IgnoringSource.md | ignore-comment syntax (primary) | `main` | `swift-format-ignore`, `-file`, rule-name forms |
| https://github.com/swiftlang/swift-format/blob/swift-6.4.0-RELEASE/Sources/SwiftFormat/API/Configuration.swift | config decoder (primary source) | tag `swift-6.4.0-RELEASE` (@4d6d4a86c5b6) | proves a `rules` block replaces defaults (lines 461-464) |
| https://github.com/swiftlang/swift-format/blob/swift-6.4.0-RELEASE/Sources/swift-format/Frontend/Frontend.swift | CLI frontend (primary source) | same tag | unrecognized-rule warning (line 76) |
| https://github.com/swiftlang/swift-format/blob/swift-6.4.0-RELEASE/Sources/SwiftFormat/Utilities/IgnoreManager.swift | `.swift-format-ignore` loader (primary source) | same tag | undocumented ignore file, 6.4.0 only |
| https://github.com/swiftlang/swift-format/blob/swift-6.4.0-RELEASE/Sources/swift-format/PrintVersion.swift | `--version` string (primary source) | 6.4.0 prints `main`; 6.3.3 tag prints `6.3.3` | recovering the real version |
| https://github.com/swiftlang/swift-format/issues/1081 | formatter bug on `nonisolated(nonsending)` (primary) | opened 2025-10-28, closed | why formatter version matters for new syntax |
| https://github.com/swiftlang/github-workflows/blob/main/.github/workflows/scripts/check-swift-format.sh | the upstream format-check script (primary) | `main` a0e26726cfe9 | the triple used by 21 corpus repos |
| https://www.swift.org/blog/swift-6-released/ and https://github.com/swiftlang/swift-org-website/blob/main/_posts/2026-09-15-swift-6.4-released.md | Swift 6 and 6.4 release posts (primary) | 2024-09 / 2026-09-15 | era anchor: 6.4 release, SwiftPM on Swift Build; no formatter change announced |
| https://github.com/realm/SwiftLint/blob/main/README.md | SwiftLint README, "Defining Custom Rules" (primary) | `main`, lines 799-910 | `custom_rules` keys, `match_kinds` list, `s`/`m` regex flags |
| https://realm.github.io/SwiftLint/rule-directory.html with `force_cast.html`, `force_try.html`, `force_unwrapping.html`, `unhandled_throwing_task.html` | SwiftLint rule directory (primary) | 0.65.1 docs | ids, defaults, severities, opt-in status |
| https://github.com/realm/SwiftLint/blob/main/CHANGELOG.md (read as `realm__SwiftLint@ec4691d9e813:CHANGELOG.md:733-771`) | SwiftLint changelog 0.61.0 (primary) | 0.61.0 entry | dynamic vs static Linux binary |
| `realm__SwiftLint@ec4691d9e813:Source/SwiftLintFramework/Rules/CustomRules.swift` and `Source/SwiftLintCore/RuleConfigurations/RegexConfiguration.swift` | SwiftLint source (primary) | post-0.65.1 main | execution modes, `excluded_match_kinds`, `capture_group` |
| https://github.com/realm/SwiftLint/blob/main/Dockerfile | official image recipe (primary) | `main` | dynamic build plus `libsourcekitdInProc.so` |
| https://github.com/nicklockwood/SwiftFormat#linting and https://github.com/nicklockwood/SwiftFormat/blob/main/Rules.md | SwiftFormat README and rule list (primary) | 0.63.1, 2026-09-30 | `--lint`, `--lenient`, exit codes (lines 864-898), rule inventory |
| https://raw.githubusercontent.com/airbnb/swift/master/Sources/AirbnbSwiftFormatTool/swiftlint.yml | Airbnb's enforced SwiftLint config | pushed 2026-10-06 | real-world `custom_rules` bans |
| `swift-audit/exemplar-quality-gates.md` | wave-1 corpus audit of 40 repos | 2026-10-10 | config presence, CI gate census, noise numbers |
| `swift-topic-map/codified.md` §12-13 | wave-1 planted-defect and noise measurements | 2026-10-10 | what SwiftLint/swift-format/SwiftFormat catch on agent-style code |
| `swift-topic-map/ecosystem-tooling.md` §10 | wave-1 tooling scout | 2026-10-10 | formatter chaining measurement |
| `swift-gates/warnings-and-ci.md` | sibling wave-2 dive | 2026-10-10 | compiler-group promotion; independent confirmation of the nonexistent-path pass |
| https://hub.docker.com/_/swift (`swift:6.4`, `swift:6.3` as pulled) and `ghcr.io/realm/swiftlint:0.65.1` | toolchain and linter images | pulled 2026-10-10 | the measured binaries; `swift:6.3` resolved to 6.3.3 |
