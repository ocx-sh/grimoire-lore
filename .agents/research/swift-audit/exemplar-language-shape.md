---
title: Swift exemplar corpus - language shape audit (40 repos, numbers first)
agent: research-lang worker, axis "exemplar-language-shape"
model: claude-sonnet-5-5 (analysis harness: python3 -I regex + brace-stack scanners over comment/string-stripped source; builds in swift:6.4 and swift:6.3 docker images)
scope: 40 exemplar Swift repos under ~/.cache/research-lang/exemplars/swift/<owner>__<repo> (depth-1 blob-less clones, binary assets sparse-excluded), read-only; 18,886 .swift files; counts are on production code unless a column says otherwise
date_researched: 2026-10-10
method:
  - "git -C <repo> ls-files '*.swift' | wc -l, summed over 40 repos -> 18886 (equals the os.walk count the harness classified)"
  - "classification: python3 -I index.py (rules in Appendix A) -> prod 9399, test 5018, example 1805, fixture 1383, docs 576, generated 484, bench 121, manifest 85, vendored 15 files"
  - "feature counts: python3 -I feat.py (about 100 regexes, Appendix B) over strip()'d prod code; per-10k = hits / prod LOC * 10000, LOC = non-blank lines of stripped code"
  - "force unwrap: python3 -I fu.py (postfix ! heuristic, Appendix B); static/global state: python3 -I state2.py (brace-stack header tracking); errors/catch: err.py, catch.py; protocols: struct1-3.py; params/typed throws: params.py; tests: tests.py; CI: ci3.py; manifests: man.py (balanced-paren parser) then hand-read of every root Package.swift for language mode"
  - "builds: SWIFT_VERSION={6.4,6.3} ~/.cache/research-lang/swift-tools/run.sh swift build --scratch-path ~/.cache/research-lang/swift-tools/build/<repo>-<ver> (cwd = exemplar; debug; one run each)"
  - "consumer fixture: ~/.cache/research-lang/swift-tools/fixtures/exemplar-language-shape/consumer (swift 6.4, swift-log from: 1.0.0)"
  - "analysis scripts live in the session scratchpad and are ephemeral; Appendix A/B reproduce their logic"
exemplar_shas: >-
  Alamofire: bda9ed57d729, IceCubesApp: 2ad6e6891258, JavaScriptKit: c68ee9bdebfa, Nuke: d5548dd61395,
  SwiftFormat: fbc07aca5373, SwiftLint: ec4691d9e813, async-http-client: 017115279d09, container: f70ecbb926d9,
  containerization: 3e7bc39e66b3, element-x-ios: 14e33866ced2, grpc-swift-2: ac33066eb6ed,
  hummingbird: 1bd3b407fb47, rules_swift: 50450ed24dde, sourcekit-lsp: c6ce93d5f8aa,
  swift-argument-parser: efd239f0055b, swift-async-algorithms: cbde9aed744b,
  swift-aws-lambda-runtime: 8abd464310c7, swift-build: 2187330e13e7, swift-collections: 935f696a549a,
  swift-composable-architecture: bc2db5ba8ad3, swift-container-plugin: a9646b8d4dca,
  swift-crypto: 1c80d3aff53f, swift-dependencies: b476cc576105, swift-distributed-tracing: a5270bd1280a,
  swift-embedded-examples: 119b29f83550, swift-format: b15dd59fad21, swift-foundation: aadd9259be07,
  swift-log: 4038b6a4f74a, swift-nio: e12881f2a691, swift-openapi-generator: c4f943e14015,
  swift-package-manager: 5546f44a3b52, swift-protobuf: 6c84c3dedac0, swift-service-lifecycle: c55297914e26,
  swift-snapshot-testing: 28e5de025e3f, swift-syntax: be549876fe91, swift-system: 486d48c80fce,
  swift-testing: c7d68ca20cd7, swiftly: c8cf2e35bfca, tuist: 2f6ac74754bf, vapor: bf77fc69b142
---

# Swift exemplar corpus - language shape audit

Scope note. Counted: `prod` files only (excludes `.build`, Benchmarks, generated
sources, vendored code, test fixtures, examples, `.docc`; test code is counted
separately where a column says "test"). Every `<repo>@<sha12>:<path>:<line>`
cites the pinned clone. Hypotheses H1-H8 come from `swift-frame.md`; they are
tested, not assumed. Swift-version attribution of features is background
knowledge (SE numbers), not measured, unless a tools-version or compiler output
is cited.

## Table of contents

1. [Headline numbers](#headline-numbers)
2. [Method and counting discipline](#method-and-counting-discipline)
3. [Axis 1 - manifest census](#axis-1---manifest-census)
4. [Axis 2 - source shape](#axis-2---source-shape)
5. [Axis 3 - language-feature adoption](#axis-3---language-feature-adoption)
6. [Axis 4 - safety and failure posture](#axis-4---safety-and-failure-posture)
7. [Axis 5 - errors](#axis-5---errors)
8. [Axis 6 - global and static mutable state](#axis-6---global-and-static-mutable-state)
9. [Axis 7 - run the compiler](#axis-7---run-the-compiler)
10. [Cross-cutting - testing, gates, CI, H1-H8 verdicts](#cross-cutting---testing-gates-ci-h1-h8-verdicts)
11. [Smells (ranked)](#smells-ranked)
12. [Patterns worth encoding](#patterns-worth-encoding)
13. [Contradictions of the frame](#contradictions-of-the-frame)
14. [Gaps](#gaps)
15. [Appendix A - classification and stripper](#appendix-a---classification-and-stripper)
16. [Appendix B - pattern table and validation](#appendix-b---pattern-table-and-validation)

## Headline numbers

Corpus: 40 repos, 18,886 `.swift` files. Prod 9,399 files / 1,220,887 LOC;
test 5,018 files / 1,167,160 LOC; generated 484 files / 678,749 LOC (excluded);
fixtures + examples + bench + vendored 3,324 files / ~136k LOC (excluded).
Test:prod LOC is 0.96 overall (median file 63 LOC, mean 130, p90 295; 131 prod
files over 1,000 LOC, 23 over 2,000).

- Language mode (hand-read of 38 root manifests): Swift 6 mode everywhere in 25, mostly 6 with targets pinned to 5 in 4, mostly 5 in 1 (tuist), all 5 in 8. Tools versions: 5.7 x1, 5.9 x2, 6.0 x6, 6.1 x6, 6.2 x16, 6.3 x2, 6.4 x5.
- Escape hatches (prod): `@unchecked Sendable` 552 in 33 repos (4.5/10k; swift-build 237 = 43%), `nonisolated(unsafe)` 191 in 19 repos, `@preconcurrency` 832 (410 are imports), `Mutex<` declarations 176 in 14 repos, `import Synchronization` 271.
- Of the 552 `@unchecked Sendable`: 194 all-`let` bodies, 139 mutable state with no lock/atomic/queue seen, 91 retroactive/extension conformances, 82 with visible lock/atomic/queue/event-loop confinement, 46 wrapping pointers or C handles.
- Legacy concurrency still present (prod): Dispatch* 719 hits in 25 repos, `import Combine` 441 in 9, unstructured `Task {` 920 in 21, `Task.detached` 31, completion-handler-shaped params 397 in 30; modern: `async` 9,952, `await` 15,773, actors 152 (container 28, containerization 12), `@Observable` 62 vs `ObservableObject` 26.
- Force unwrap `!` 3,364 prod hits (27.6/10k; vapor 111, JavaScriptKit 85, swift-crypto 78 at the top; element-x 1.7 and SwiftLint 5.2 at the bottom), `try!` 620 (swift-crypto 61/10k), `as!` 378, IUO declarations 209, `fatalError` 1,441, `precondition` 2,037, `assert` 2,213, `try?` 2,231.
- Typed throws 1,323 prod hits in 20 repos (10.8/10k): 879 generic/forwarded `throws(E)`, 433 concrete domain types (crypto 147, foundation 67, SwiftLint 56), 5 `Never`, 6 `any Error`.
- Types: struct 10,770, class 2,860 (72% `final`; `open` 52), enum 5,592, actor 152, protocol 1,752, extension 14,280. struct:class 3.8:1; swiftly 67:1 and argument-parser 40:1 vs swift-format 0.7:1, Alamofire 1.3:1.
- Protocols: 690 of 1,752 (39%) have exactly one conformer; 85 have none; 427 are pure single-prod-conformer with no test/mock conformer (tuist 111, element-x 112). 240 of the single-conformer ones are mock-generated (Sourcery comment or `@Mockable`; tuist 236).
- Errors: 973 error types, 726 enum / 247 struct / 0 class; `LocalizedError` 340 (tuist 250). 3,204 catch blocks: 122 empty, 155 log-only, 191 drop/return-only, 2,667 bare `catch {`.
- Static state: 174 stored `static var` (93 without any guard), 4,313 computed; 27 stored global vars (13 unguarded); 7 script-level in `main.swift`.
- Tests: `@Test` 21,744 vs `func test*` 26,971 (Testing 45% of cases); 34 repos import Testing, 29 import XCTest, 23 both.
- Formatters: `.swift-format` in 24 repos, `.swiftformat` in 7, `.swiftlint.yml` in 4, none in 7. `Package.resolved` tracked at root in 10 repos; the other 30 have none at root or ignore it.
- CI (39 repos with CI): Linux 37, macOS 27, Windows 13, static Linux SDK 14, Wasm 15, Android 11, swiftlang reusable workflow 24, nightly toolchain 24.
- Compiler: 6 packages x 2 toolchains, all 12 debug builds rc=0; 0 warnings for log/system/service-lifecycle/container-plugin; 4 for argument-parser (both); 4 on 6.3 vs 5 on 6.4 for async-algorithms.

## Method and counting discipline

Commands and results (full rules in the appendices):

```
$ for d in */; do git -C $d ls-files '*.swift'; done | wc -l          -> 18886
$ find . -name Package.swift -not -path '*/.git/*' | wc -l            -> 677   (688 parsed incl. versioned Package@swift-*.swift; non-manifest Package.swift files in tuist sources are skipped when PackageDescription is absent)
$ find . -name Package.resolved -not -path '*/.git/*' | wc -l         -> 97
$ grep -rhoE '@unchecked Sendable' --include='*.swift' . | wc -l      -> 1129 raw, all classes, comments included
$ grep -rhoE 'nonisolated\(unsafe\)' --include='*.swift' . | wc -l    -> 2794 raw (swift-protobuf 80 files, mostly Reference/generated)
```

Raw grep vs the harness: `@unchecked Sendable` 1,129 raw vs 552 prod (+182 test);
`nonisolated(unsafe)` 2,794 raw vs 191 prod (+125 test). Unclassified greps
overstate production use 2x to 14x. This is why every count below is prod-only.

Classification precedence (first match wins): `.build` > vendored > `.docc` >
generated (suffix, directory, or header in the first 40 lines) > bench >
fixture > test > example > manifest > prod. The `Integration` directory and
`*Test(s).swift` names count as test.

Header-based generated detection (146 of the 484 generated files) was
spot-read on 10 random files: 8 are clearly generated (svd2swift registers
in embedded-examples, openapi Petstore reference, swift-crypto ECDH
"Generated file, do NOT edit", SwiftLint GeneratedTests), 2 borderline
(tuist `PlistsTemplate.swift` "Generated using tuist", element-x
`LocationMarkerView.swift` "Generated from the SVG"). The first reclassification
caught `swift-nio` `ByteBuffer-multi-int.swift` (a `///` AUTO-GENERATED line)
and swift-package `sourcekitd_uids.swift` (508 phantom force unwraps).

Docs-vs-config rule: where README/docs and manifests/CI disagree, the manifest
tools-version and the CI image matrix are authoritative (they are what
compiles). Cases: vapor README badge says "Swift 6.0+"
(`vapor@bf77fc69b142:README.md:24`) while the manifest is `vapor@bf77fc69b142:Package.swift:2`
`swift-tools-version:6.4`; hummingbird README badge 6.1+ vs tools 6.2 and a CI
matrix of swift:6.2/6.3/6.4 (`hummingbird@1bd3b407fb47:.github/workflows/ci.yml:39`);
element-x `.swiftformat` pins `--swiftversion 5.6`
(`element-x-ios@14e33866ced2:.swiftformat:1`) while the project is Swift 6
(`AGENTS.md:285`); swift-collections' README version table stops at 1.7.x
while the root manifest is tools 6.4 with a `Package@swift-6.2.swift` sibling.

## Axis 1 - manifest census

Commands: `python3 -I man.py` (balanced-paren parse of every Package.swift,
12 versioned `Package@swift-*.swift` included) then `man_tab.py` (per-repo
table below). Language mode was read by hand from every root manifest because
the regex census mis-attributed two repos (it said swift-collections "5
explicit" - actually only `RopeModule` is pinned to 5,
`swift-collections@935f696a549a:Package.swift:325`; and service-lifecycle ".v5" - actually
gated behind `#if compiler(<6.2)`, `swift-service-lifecycle@c55297914e26:Package.swift:78`).
The hand-read table is authoritative.

Census: 677 `Package.swift` + 12 versioned `Package@swift-*.swift` = 689 files -> 688 parsed manifests (one tuist source file named Package.swift has no PackageDescription and is skipped): 50 root
(38 repos, 12 of them versioned variants), 38 member packages, 189 example
packages, 411 fixture packages. IceCubesApp (plain Xcode project + 13 local
packages) and rules_swift (Bazel) have no root `Package.swift`.

| repo | tools | extra manifests | language mode (root manifest) | platform floors | deps | targets reg/exe/test/macro/plugin | products lib/exe/plugin | upcoming / experimental / unsafeFlags |
|---|---|---|---|---|--:|---|---|---|
| swift-log | 6.2 | - | 6 (tools>=6 default) | - | 0 | 2/0/2/0/0 | 2/0/0 | 4 / 0 / 1 |
| swift-system | 6.1 | - | 6 (:148) | - | 0 | 2/0/2/0/0 | 1/0/0 | 1 / 2 / 1 |
| swift-argument-parser | 6.0 | - | 6 (tools>=6 default) | - | 0 | 3/9/7/0/2 | 1/0/2 | 0 / 0 / 0 |
| swift-async-algorithms | 6.2 | 5.7,5.8 | 6 (tools>=6 default) | - | 2 | 7/0/2/0/0 | 2/0/0 | 6 / 4 / 0 |
| swift-collections | 6.4 | 6.2 | 6, RopeModule pinned 5 (:325) | - | 0 | 28/0/1/0/0 | 1/0/0 | 1 / 8 / 0 |
| swift-nio | 6.1 | - | 6 (tools>=6 default) | - | 4 | 34/15/16/0/0 | 14/0/0 | 1 / 1 / 0 |
| swift-crypto | 6.2 | - | 6 (tools>=6 default) | - | 2 | 11/1/4/0/0 | 3/0/0 | 1 / 3 / 0 |
| swift-distributed-tracing | 6.2 | - | 6 (tools>=6 default) | - | 1 | 10/0/3/0/0 | 3/0/0 | 0 / 1 / 0 |
| swift-protobuf | 6.2 | 6.1 | 6 (:456) | - | 0 | 3/3/3/0/1 | 2/2/1 | 1 / 0 / 0 |
| swift-openapi-generator | 6.2 | - | 6 (tools>=6 default) | mac10.15 iOS13 tv13 watch6 vis1 | 6 | 3/1/4/0/2 | 1/1/2 | 3 / 0 / 0 |
| swift-foundation | 6.2 | - | 5 (:45) | mac26 iOS26 tv26 watch26 vis26 | 4 | 8/0/3/1/0 | 2/0/0 | 2 / 9 / 1 |
| swift-format | 6.0 | - | 5 (:150) | mac13.0 iOS16.0 | 4 | 6/2/2/0/2 | 1/1/2 | 0 / 0 / 1 |
| swift-syntax | 5.9 | - | 5 ([.v5,.version("6")] :447) | mac10.15 iOS13 tv13 watch6 cat13 | 0 | 33/0/17/0/0 | 20/0/0 | 0 / 0 / 0 |
| swift-testing | 6.3 | - | 6 (tools>=6 default) | - | 3 | 18/3/2/1/0 | 5/3/0 | 4 / 12 / 4 |
| swift-package-manager | 6.1 | - | 5 (:1041) | mac15 iOS18 cat18 | 13 | 42/14/35/0/0 | 8/0/0 | 0 / 5 / 11 |
| sourcekit-lsp | 6.3 | - | 6 (:754) | mac15 | 12 | 30/1/13/0/0 | 4/1/0 | 6 / 0 / 8 |
| swiftly | 6.2 | - | 6 (tools>=6 default) | mac13 | 11 | 15/5/1/0/2 | 0/2/2 | 1 / 0 / 0 |
| swift-build | 6.2 | - | 6, 4 targets 5 (helper :32-65) | mac15 iOS18 cat18 | 6 | 28/2/29/0/4 | 6/2/0 | 16 / 0 / 0 |
| async-http-client | 6.2 | - | 6 (tools>=6 default) | - | 11 | 4/0/1/0/0 | 1/0/0 | 1 / 0 / 1 |
| swift-service-lifecycle | 6.1 | - | 6; 5 only if compiler<6.2 (:78-83) | - | 2 | 11/0/2/0/0 | 3/0/0 | 0 / 0 / 0 |
| swift-aws-lambda-runtime | 6.2 | - | 6 (tools>=6 default) | mac12 | 5 | 4/2/2/0/3 | 1/0/3 | 4 / 1 / 0 |
| grpc-swift-2 | 6.1 | - | 6 (:65) | - | 2 | 8/0/3/0/0 | 3/0/0 | 3 / 0 / 0 |
| vapor | 6.4 | - | 6 (tools>=6 default) | mac26.2 iOS26.2 tv26.2 watch26.2 | 23 | 12/1/3/1/0 | 3/0/0 | 7 / 3 / 0 |
| hummingbird | 6.2 | - | 6 (tools>=6 default) | mac11 iOS15 cat15 tv15 vis1 | 16 | 6/2/4/0/0 | 6/1/1 | 3 / 2 / 0 |
| swift-composable-architecture | 6.4 | 6.1 | 6 (:100), one target 5 (:112) | iOS16 mac13 tv16 watch9 | 15 | 1/0/2/1/0 | 1/0/0 | 2 / 1 / 0 |
| swift-dependencies | 6.4 | 6.3,6.0 | 6 (:103) | iOS15 mac12 tv15 watch9 | 7 | 4/0/2/1/0 | 4/0/0 | 6 / 0 / 0 |
| swift-snapshot-testing | 6.0 | 5.9 | 5 (:69) | iOS13 mac10.15 tv13 watch6 | 2 | 3/0/2/0/0 | 3/0/0 | 0 / 0 / 0 |
| Alamofire | 6.4 | 6.3,6.2,6.0,6.1 | 5 (all; swiftLanguageModes [.v5] :52) | mac12 iOS15 tv15 watch9 | 0 | 1/0/1/0/0 | 2/0/0 | 1 / 0 / 0 |
| Nuke | 6.0 | - | 6 (tools>=6 default) | iOS16 tv16 mac13 watch9 vis1 | 0 | 4/0/0/0/0 | 4/0/0 | 0 / 0 / 0 |
| SwiftLint | 5.9 | - | 5 (tools 5.9 default) | mac13 | 8 | 10/2/9/1/2 | 1/1/2 | 9 / 2 / 0 |
| SwiftFormat | 5.7 | - | 5 (tools 5.7 default) | - | 0 | 2/1/1/0/1 | 1/1/1 | 0 / 0 / 0 |
| tuist | 6.1 | - | 5 (:2031), 2 targets 6 (:501,:515) | mac15 | 3 | 85/4/21/0/0 | 20/4/0 | 0 / 1 / 0 |
| IceCubesApp | (no root Package.swift) | | | | | | | |
| element-x-ios | 6.2 | - | 6 (tools>=6 default) | mac15 | 7 | 0/1/0/0/0 | 0/1/0 | 2 / 0 / 0 |
| rules_swift | (no root Package.swift) | | | | | | | |
| JavaScriptKit | 6.2 | - | 6 (tools>=6 default) | mac13 iOS13 tv13 watch6 cat13 | 1 | 9/1/8/1/3 | 5/0/3 | 0 / 2 / 5 |
| swift-embedded-examples | 6.0 | - | 6 (tools>=6 default) | - | 1 | 1/0/0/0/0 | 1/0/0 | 0 / 0 / 0 |
| containerization | 6.2 | - | 6 (tools>=6 default) | mac15.0 | 15 | 15/2/10/0/0 | 10/1/0 | 0 / 0 / 1 |
| container | 6.2 | - | 6 (tools>=6 default) | mac15 | 16 | 28/9/15/0/0 | 24/0/0 | 0 / 0 / 0 |
| swift-container-plugin | 6.0 | - | 6 (:94), one target 5 (:49) | mac13 | 4 | 13/1/3/0/1 | 0/1/1 | 0 / 0 / 0 |

Per-root summary (38 roots):

| facet | result |
|---|---|
| tools version | 5.7 x1 (SwiftFormat), 5.9 x2 (SwiftLint, swift-syntax), 6.0 x6, 6.1 x6, 6.2 x16, 6.3 x2 (swift-testing, sourcekit-lsp), 6.4 x5 (collections, vapor, TCA, dependencies, Alamofire) |
| versioned sidecar manifests | 12: Alamofire 4 (6.3/6.2/6.1/6.0), async-algorithms 2 (5.7, 5.8), dependencies 2 (6.0, 6.3), collections, protobuf, TCA, snapshot-testing 1 each |
| language mode | Swift 6 everywhere 25; mostly 6 with some targets on 5: swift-collections (`swift-collections@935f696a549a:Package.swift:325`), swift-container-plugin (v5 `swift-container-plugin@a9646b8d4dca:Package.swift:49` vs v6 :94), TCA (v6 `swift-composable-architecture@bc2db5ba8ad3:Package.swift:100`, one v5 :112), swift-build (helper `swift-build@2187330e13e7:Package.swift:32`); mostly 5: tuist (`tuist@2f6ac74754bf:Package.swift:2031`, v6 only at :501 and :515); all 5: Alamofire (`Alamofire@bda9ed57d729:Package.swift:52`), swift-format (:150), swift-foundation (:45), SwiftPM (`swift-package-manager@5546f44a3b52:Package.swift:1041`), swift-syntax (`swift-syntax@be549876fe91:Package.swift:447`), snapshot-testing (:69), SwiftLint and SwiftFormat (tools < 6 default) |
| dependencies per root | median 3.5, mean 5.4; zero in 9 (argument-parser, collections, log, protobuf, system, Alamofire, Nuke, SwiftFormat, swift-syntax); max vapor 23, container 16, hummingbird 16, containerization 15, TCA 15; 99 distinct packages |
| most depended-on | swift-argument-parser 17 repos, swift-syntax 13, swift-collections 11, swift-log 8, swift-system 7, swift-nio 7, swift-crypto 6, async-http-client 5, swift-docc-plugin 5 |
| requirement styles (237 remote decls) | `from:` 153, `branch:` 28, `exact:` 23 (30 with registry ids), range 10, `upToNextMajor` 9, `upToNextMinor` 8, `revision:` 6; plus 161 `path:` deps (91 root, 70 member) |
| target kinds | target 504, executableTarget 82, testTarget 235, macro 7, binaryTarget 1, systemLibrary 3, plugin 23; products: library 169, executable 22, plugin 20 |
| upcoming features (repos / definitions) | MemberImportVisibility 19/30, ExistentialAny 15/26, InternalImportsByDefault 11/16, NonisolatedNonsendingByDefault 7/14, InferIsolatedConformances 7/14, InferSendableFromCaptures 4/5, ImmutableWeakCaptures 3/8, LifetimeDependence 2/4 |
| experimental features | Lifetimes 8/13, StrictConcurrency 4/12 (all `=complete`), Extern 3/8, AccessLevelOnImport 3/8, Embedded 2/4 |
| `strictMemorySafety()` | swift-collections, swift-testing, vapor (+ vapor Performance) |
| `defaultIsolation` | 9 IceCubes member packages, element-x compound-ios x2, one swift-protobuf fixture, one tuist example - zero library roots |
| `package` access in manifests | 0; in prod source 4,566 hits in 26 repos (sourcekit-lsp 463/10k, collections 143, hummingbird 63) |
| traits | declared (`.trait(`): vapor 4, log 7, collections 3, async-algorithms 2, protobuf 2, hummingbird 2, TCA 2, async-http-client 1; consumed via `traits:` by openapi-generator, grpc, dependencies, lambda, swiftly, JavaScriptKit |

Manifest idioms worth noting (swiftlang tree):
- Dual-mode dependency graph via env `SWIFTCI_USE_LOCAL_DEPS`: local `path:` deps vs `branch:` deps. 9 roots: async-algorithms, crypto, nio, sourcekit-lsp, swift-build, swift-format, foundation, SwiftPM, swift-testing. Branch/path usage in the requirement tally is therefore concentrated in swiftlang repos; `exact:` is concentrated in tuist, IceCubes and element-x.
- 13 roots read other environment variables in the manifest.
- Shared settings are applied by looping `for target in package.targets` (swift-log `swift-log@4038b6a4f74a:Package.swift:55`-:73, service-lifecycle).
- vapor puts `import CompilerPluginSupport` on line 1 and the tools-version comment on line 2 (`vapor@bf77fc69b142:Package.swift:2`), with platforms `.macOS("26.2")` etc.; the tools-version regex had to search the first 300 chars.
- `unsafeFlags`: swift-log `-require-explicit-sendable` is applied unconditionally to every non-plugin target (`swift-log@4038b6a4f74a:Package.swift:71`); swift-system's `-require-explicit-availability=error` is CI-only under `#if SYSTEM_CI`; async-http-client gates its flag behind `strictConcurrencyDevelopment`; SwiftPM uses `-package-description-version 999.0` and `-enable-library-evolution`; sourcekit-lsp uses `-module-alias` and `-Werror ExistentialAny`; sourcekit-lsp, swift-format and SwiftPM pass `-no-toolchain-stdlib-rpath` on linux/android; JavaScriptKit passes linker flags.
- Platform floors: vapor and swift-foundation use "26"-series floors; swiftlang tools pin macOS 15 (SwiftPM, sourcekit-lsp, swift-build, containerization); Nuke iOS 16 / macOS 13; Alamofire's tools-6.4 manifest has macOS 12 / iOS 15 while its 6.0-6.3 sidecars keep macOS 10.13 / iOS 12 and differ otherwise only in copyright year.

Consumer check on the swift-log unconditional `unsafeFlags` (a possible
smell): a fresh package depending on swift-log by `from: "1.0.0"` resolved
1.16.1 (HEAD of the clone is that tag, `4038b6a4f74a`) and built clean on
swift 6.4 in 2.57 s (`swift build --scratch-path .../build/els-consumer`).
The unsafe flag in a versioned dependency did not block the consumer. The
smell is refuted for this toolchain; unverified for others.

### Xcode, Tuist, XcodeGen

| repo | project system | evidence |
|---|---|---|
| IceCubesApp | plain `.xcodeproj` + 13 local SwiftPM packages + 1 `.xcconfig` | pbxproj: `SWIFT_VERSION = 6.0` x10, `SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor` x10, `SWIFT_APPROACHABLE_CONCURRENCY = YES` x10, `STRICT_CONCURRENCY = complete` x4; packages set `defaultIsolation` in 9 manifests |
| element-x-ios | XcodeGen (`project.yml` + per-target `target.yml`), generated `.xcodeproj` also tracked | `UnitTests` target.yml:50-52: `SWIFT_VERSION: 6`, approachable concurrency, MainActor default isolation; `docs/FORKING.md:14` says to run `xcodegen`, so project.yml/target.yml are authoritative over the checked-in pbxproj |
| tuist | dogfoods Tuist (root `Project.swift`, `Workspace.swift`, `Tuist.swift`, `app/Project.swift`) | its example pbxprojs are fixtures with `SWIFT_VERSION = 5.0`; excluded |
| Alamofire, Nuke, SwiftFormat, TCA | carry `.xcodeproj` for demos/tests | SwiftPM remains the build of record |

## Axis 2 - source shape

Commands: `python3 -I index.py` (walk + strip + classify), `python3 -I rep1.py`
(LOC table), `python3 -I struct2.py` (declaration counts). LOC = non-blank
lines of stripped (comment- and string-free) code.

| group | repo | prod files | prod LOC | test LOC | test:prod | excl. files | struct | class (final%) | enum | actor | protocol | ext | struct:class |
|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| core | swift-log | 13 | 2475 | 3794 | 1.53 | 9 | 16 | 6 (100%) | 4 | 0 | 4 | 31 | 2.7 |
| core | swift-system | 42 | 8380 | 4332 | 0.52 | 1 | 50 | 5 (60%) | 14 | 0 | 4 | 136 | 10.0 |
| core | swift-argument-parser | 93 | 10004 | 11650 | 1.16 | 8 | 161 | 4 (75%) | 45 | 0 | 21 | 219 | 40.2 |
| core | swift-async-algorithms | 84 | 12772 | 9373 | 0.73 | 0 | 148 | 27 (100%) | 112 | 0 | 9 | 164 | 5.5 |
| core | swift-collections | 574 | 52400 | 29899 | 0.57 | 40 | 184 | 6 (83%) | 6 | 0 | 21 | 1600 | 30.7 |
| core | swift-nio | 315 | 71267 | 70882 | 0.99 | 14 | 411 | 175 (93%) | 324 | 0 | 77 | 938 | 2.3 |
| core | swift-crypto | 170 | 16634 | 10150 | 0.61 | 8 | 184 | 21 (90%) | 89 | 0 | 54 | 381 | 8.8 |
| core | swift-distributed-tracing | 18 | 2240 | 2082 | 0.93 | 7 | 23 | 3 (100%) | 5 | 0 | 10 | 53 | 7.7 |
| core | swift-protobuf | 135 | 19880 | 25307 | 1.27 | 281 | 90 | 37 (49%) | 49 | 0 | 32 | 143 | 2.4 |
| core | swift-openapi-generator | 119 | 10560 | 6822 | 0.65 | 82 | 110 | 4 (75%) | 99 | 1 | 9 | 173 | 27.5 |
| core | swift-foundation | 347 | 103039 | 52147 | 0.51 | 27 | 553 | 110 (64%) | 292 | 0 | 76 | 1547 | 5.0 |
| tools | swift-format | 123 | 12593 | 13360 | 1.06 | 3 | 49 | 70 (83%) | 39 | 0 | 7 | 120 | 0.7 |
| tools | swift-syntax | 359 | 63144 | 58618 | 0.93 | 94 | 336 | 70 (23%) | 201 | 0 | 71 | 877 | 4.8 |
| tools | swift-testing | 211 | 20605 | 17422 | 0.85 | 0 | 171 | 8 (100%) | 76 | 1 | 26 | 557 | 21.4 |
| tools | swift-package-manager | 555 | 104319 | 153239 | 1.47 | 950 | 1134 | 173 (77%) | 724 | 22 | 104 | 1243 | 6.6 |
| tools | sourcekit-lsp | 302 | 40658 | 43070 | 1.06 | 1 | 286 | 65 (60%) | 124 | 38 | 30 | 485 | 4.4 |
| tools | swiftly | 48 | 6698 | 3936 | 0.59 | 0 | 67 | 1 (100%) | 36 | 0 | 12 | 78 | 67.0 |
| tools | swift-build | 632 | 114685 | 178253 | 1.55 | 3 | 1006 | 732 (76%) | 536 | 11 | 207 | 991 | 1.4 |
| server | async-http-client | 71 | 14083 | 23786 | 1.69 | 4 | 113 | 21 (100%) | 105 | 1 | 11 | 157 | 5.4 |
| server | swift-service-lifecycle | 13 | 1852 | 2065 | 1.12 | 0 | 23 | 4 (100%) | 15 | 2 | 1 | 17 | 5.8 |
| server | swift-aws-lambda-runtime | 66 | 6763 | 6982 | 1.03 | 71 | 59 | 6 (100%) | 36 | 1 | 13 | 43 | 9.8 |
| server | grpc-swift-2 | 88 | 12366 | 9028 | 0.73 | 43 | 185 | 11 (100%) | 83 | 0 | 13 | 194 | 16.8 |
| server | vapor | 198 | 13513 | 12980 | 0.96 | 17 | 208 | 37 (97%) | 56 | 5 | 38 | 300 | 5.6 |
| server | hummingbird | 138 | 11589 | 9318 | 0.80 | 5 | 180 | 25 (76%) | 69 | 2 | 31 | 142 | 7.2 |
| community | swift-composable-architecture | 67 | 13766 | 18013 | 1.31 | 138 | 92 | 27 (89%) | 27 | 0 | 16 | 264 | 3.4 |
| community | swift-dependencies | 35 | 3286 | 3501 | 1.07 | 0 | 29 | 6 (100%) | 29 | 0 | 5 | 64 | 4.8 |
| community | swift-snapshot-testing | 37 | 6331 | 2186 | 0.35 | 0 | 27 | 13 (54%) | 10 | 0 | 1 | 67 | 2.1 |
| community | Alamofire | 48 | 9410 | 16922 | 1.80 | 3 | 67 | 52 (65%) | 47 | 0 | 27 | 157 | 1.3 |
| community | Nuke | 82 | 10471 | 35863 | 3.42 | 47 | 100 | 52 (96%) | 46 | 3 | 17 | 139 | 1.9 |
| devtools | SwiftLint | 568 | 46198 | 13809 | 0.30 | 25 | 554 | 345 (93%) | 115 | 3 | 28 | 715 | 1.6 |
| devtools | SwiftFormat | 197 | 32059 | 47163 | 1.47 | 228 | 60 | 28 (96%) | 79 | 0 | 8 | 303 | 2.1 |
| devtools | tuist | 1431 | 136430 | 159909 | 1.17 | 1268 | 1441 | 128 (77%) | 837 | 13 | 441 | 534 | 11.3 |
| apps | IceCubesApp | 394 | 37098 | 1948 | 0.05 | 0 | 441 | 79 (25%) | 150 | 5 | 15 | 188 | 5.6 |
| apps | element-x-ios | 1147 | 98287 | 29550 | 0.30 | 12 | 1362 | 362 (43%) | 760 | 4 | 218 | 489 | 3.8 |
| platforms | rules_swift | 19 | 1726 | 531 | 0.31 | 150 | 27 | 6 (100%) | 8 | 0 | 4 | 21 | 4.5 |
| platforms | JavaScriptKit | 68 | 26139 | 34444 | 1.32 | 45 | 147 | 60 (55%) | 83 | 0 | 33 | 275 | 2.5 |
| platforms | swift-embedded-examples | 0 | 0 | 120 | 0.00 | 179 | 0 | 0 (0%) | 0 | 0 | 0 | 0 | inf |
| oci | containerization | 240 | 35468 | 25013 | 0.71 | 31 | 344 | 58 (78%) | 140 | 12 | 30 | 213 | 5.9 |
| oci | container | 322 | 29179 | 18393 | 0.63 | 2 | 295 | 22 (82%) | 94 | 28 | 24 | 218 | 13.4 |
| oci | swift-container-plugin | 30 | 2520 | 1300 | 0.52 | 12 | 37 | 1 (100%) | 28 | 0 | 4 | 44 | 37.0 |

Extremes. LOC: tuist 136k prod, swift-build 115k, SwiftPM 104k, swift-foundation 103k, element-x 98k vs swift-log 2.5k, swift-container-plugin 2.5k, swift-distributed-tracing 2.2k; rules_swift 1.7k. Test:prod LOC: Nuke 3.42, Alamofire 1.80, async-http-client 1.69 vs IceCubes 0.05, SwiftLint 0.30 (its rules carry in-source `#examples`: 539 hits), element-x 0.30. By group (prod/test kLOC): core 310/226, tools 363/468, server 60/64, community 43/76, devtools 215/221, apps 135/31, platforms 28/35, oci 67/45.

Files:
- Median prod file 63 LOC; 131 of 9,399 exceed 1,000 LOC, 23 exceed 2,000. ~2.0 nominal types per file.
- `Type+Feature.swift` extension files are ~14% of prod files: swift-collections 69%, swift-container-plugin 43%, swift-foundation 36%.
- Largest prod files, with cohesion judgement:

| LOC | file | judgement |
|---|---|---|
| 4,228 | `swift-build@2187330e13e7:Sources/SWBCore/Settings/Settings.swift:1221` | low cohesion: `private class SettingsBuilder` runs from :1221 to the end of a 6,252-line file (~5k lines in one class) |
| 3,819 | JavaScriptKit `Plugins/BridgeJS/Sources/BridgeJSLink/BridgeJSLink.swift` | codegen string assembly, one concern but huge |
| 3,595 | TCA `Sources/ComposableArchitecture/Internal/Deprecations.swift` | cohesive by purpose (deprecation shim bag) |
| 3,440 | SwiftFormat `Sources/ParsingHelpers.swift` | one giant `extension Formatter`; low cohesion |
| 3,391 | JavaScriptKit `BridgeJSCore/SwiftToSkeleton.swift` | single visitor-style translator |
| 3,251 | `swift-format@b15dd59fad21:Sources/SwiftFormat/PrettyPrint/TokenStreamCreator.swift:30` | one `SyntaxVisitor` class of ~4.4k lines in a 3.2k-LOC file; cohesive but monolithic |
| 2,891 | swift-build `SwiftCompiler.swift` | many payload structs; separable |
| 2,869 | swift-build `BuiltinMacros.swift` | table of macro declarations plus enums; data-like |
| 2,847 | SwiftFormat `FormattingHelpers.swift` | `extension Formatter` again |
| 2,696 | JavaScriptKit `JSGlueGen.swift` | codegen |

Type ratios (prod, all 40): struct 10,770, class 2,860, enum 5,592, actor 152,
protocol 1,752, extension 14,280; `final` is 72.4% of classes (2,071/2,860),
`open class` 52. Struct-heavy extremes: swiftly 67:1, argument-parser 40:1,
container-plugin 37:1, collections 31:1, openapi-generator 27.5:1. Class-heavy:
swift-format 0.7:1 (58 of 70 final), Alamofire 1.3:1, swift-build 1.4:1 (732
classes), SwiftLint 1.6:1, Nuke 1.9:1. Lowest `final` share: swift-syntax
23% (16/70; node classes are `final` by macro), IceCubes 25%, element-x 43%.
Actors are rare: container 28, SwiftPM 22, tuist 13, containerization 12,
sourcekit-lsp 38 (the single largest); zero in 23 repos.

Protocol conformers (prod protocols, conformers counted over prod+test+generated):

| facet | count |
|---|--:|
| protocols | 1,752 |
| 0 conformers | 85 |
| exactly 1 conformer | 690 |
| 2 or more | 977 |
| seam: 1 prod conformer + test/mock conformer | 214 |
| of the 690, mock-generated (Sourcery AutoMockable comment / `@Mockable`) | 240 (tuist 236) |
| pure single-prod-conformer, no test/mock/generated conformer | 427 (internal 238, public 158, private 18, package 13) |

Pure-single-conformer leaders: element-x 112 (e.g. `element-x-ios@14e33866ced2:ElementX/Sources/Screens/CallScreen/CallScreenViewModelProtocol.swift:11`), tuist 111 (e.g. `tuist@2f6ac74754bf:cli/Sources/TuistOrganizationCommand/Services/OrganizationRemoveInviteService.swift:8`), swift-build 50, SwiftPM 22. Spot-read of the 20 samples: they are overwhelmingly `*Protocol` / `*Servicing` / `*Mapping` view-model and service interfaces, i.e. a one-protocol-per-class dependency-injection convention, not library extension points. swift-nio's `NIOHTTPClientProtocolUpgrader` (`swift-nio@e12881f2a691:Sources/NIOHTTP1/NIOHTTPClientUpgradeHandler.swift:62`) is the counter-case: public protocols with one in-tree conformer exist as extension points.

## Axis 3 - language-feature adoption

Commands: `python3 -I feat.py` -> `feat_prod.pkl`; `python3 -I rep2.py` for the
tables. Cells are per-10k-LOC densities; TOTAL is hits / 1,220,887 LOC x 10k.
`some`/`any` are parameter-position hits (`func`/`init`/`subscript` signatures
parsed with a paren matcher); typed throws and ownership features are
declaration-site hits.

| group | repo | prod LOC | typed throws | some | any | ~Copyable | @inlinable | internal import | public import | package access | @available | macro decl |
|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| core | swift-log | 2475 | 64.6 | 20.2 | 161.6 | 0.0 | 359.6 | 0.0 | 4.0 | 28.3 | 68.7 | 0.0 |
| core | swift-system | 8380 | 53.7 | 2.4 | 2.4 | 7.2 | 181.4 | 0.0 | 0.0 | 3.6 | 378.3 | 0.0 |
| core | swift-argument-parser | 10004 | 11.0 | 0.0 | 8.0 | 0.0 | 0.0 | 9.0 | 0.0 | 0.0 | 32.0 | 0.0 |
| core | swift-async-algorithms | 12772 | 61.1 | 16.4 | 32.9 | 75.2 | 180.9 | 0.0 | 11.7 | 0.0 | 231.8 | 0.0 |
| core | swift-collections | 52400 | 69.5 | 55.5 | 0.0 | 162.6 | 466.2 | 0.0 | 0.0 | 143.1 | 157.4 | 0.0 |
| core | swift-nio | 71267 | 7.7 | 13.0 | 15.2 | 1.7 | 175.8 | 0.0 | 0.0 | 2.7 | 91.1 | 0.0 |
| core | swift-crypto | 16634 | 128.7 | 29.5 | 1.2 | 3.0 | 50.5 | 0.0 | 24.0 | 61.3 | 234.5 | 0.0 |
| core | swift-distributed-tracing | 2240 | 17.9 | 58.0 | 245.5 | 0.0 | 22.3 | 0.0 | 0.0 | 8.9 | 178.6 | 0.0 |
| core | swift-protobuf | 19880 | 0.0 | 0.5 | 89.0 | 0.0 | 8.0 | 0.0 | 0.0 | 43.3 | 28.7 | 0.0 |
| core | swift-openapi-generator | 10560 | 0.0 | 0.0 | 28.4 | 0.0 | 0.0 | 0.0 | 11.4 | 25.6 | 0.0 | 0.0 |
| core | swift-foundation | 103039 | 28.4 | 26.1 | 12.9 | 20.7 | 12.8 | 30.2 | 0.0 | 39.0 | 204.9 | 0.2 |
| tools | swift-format | 12593 | 0.0 | 1.6 | 4.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 2.4 | 0.0 |
| tools | swift-syntax | 63144 | 0.0 | 40.5 | 11.6 | 0.0 | 0.2 | 6.8 | 10.8 | 0.2 | 30.9 | 0.0 |
| tools | swift-testing | 20605 | 34.0 | 130.6 | 125.2 | 28.6 | 14.1 | 9.7 | 28.1 | 29.6 | 36.9 | 10.7 |
| tools | swift-package-manager | 104319 | 0.1 | 6.8 | 16.2 | 0.3 | 0.3 | 1.4 | 0.1 | 48.0 | 45.3 | 0.0 |
| tools | sourcekit-lsp | 40658 | 2.2 | 12.5 | 59.3 | 0.0 | 2.7 | 2.2 | 2.2 | 347.3 | 5.2 | 0.0 |
| tools | swiftly | 6698 | 0.0 | 0.0 | 14.9 | 0.0 | 0.0 | 0.0 | 0.0 | 3.0 | 0.0 | 0.0 |
| tools | swift-build | 114685 | 1.8 | 2.0 | 292.2 | 1.0 | 0.6 | 0.2 | 53.9 | 62.3 | 4.4 | 0.2 |
| server | async-http-client | 14083 | 0.0 | 0.0 | 17.0 | 0.0 | 39.1 | 0.0 | 0.0 | 10.7 | 62.5 | 0.0 |
| server | swift-service-lifecycle | 1852 | 0.0 | 0.0 | 48.6 | 0.0 | 172.8 | 0.0 | 0.0 | 0.0 | 172.8 | 0.0 |
| server | swift-aws-lambda-runtime | 6763 | 1.5 | 5.9 | 97.6 | 1.5 | 23.7 | 3.0 | 47.3 | 35.5 | 116.8 | 0.0 |
| server | grpc-swift-2 | 12366 | 9.7 | 39.6 | 134.2 | 0.0 | 170.6 | 0.0 | 10.5 | 59.0 | 211.9 | 0.0 |
| server | vapor | 13513 | 0.7 | 74.0 | 276.8 | 3.7 | 42.9 | 0.0 | 112.5 | 33.3 | 1.5 | 10.4 |
| server | hummingbird | 11589 | 0.0 | 72.5 | 142.4 | 2.6 | 139.8 | 6.0 | 125.1 | 63.0 | 130.3 | 0.0 |
| community | swift-composable-architecture | 13766 | 0.0 | 94.4 | 53.8 | 0.0 | 91.5 | 0.0 | 0.0 | 0.0 | 212.1 | 6.5 |
| community | swift-dependencies | 3286 | 0.0 | 85.2 | 94.3 | 0.0 | 0.0 | 0.0 | 76.1 | 30.4 | 57.8 | 42.6 |
| community | swift-snapshot-testing | 6331 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 67.9 | 0.0 |
| community | Alamofire | 9410 | 0.0 | 2.1 | 383.6 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 87.1 | 0.0 |
| community | Nuke | 10471 | 6.7 | 8.6 | 101.2 | 1.0 | 0.0 | 0.0 | 0.0 | 2.9 | 22.9 | 0.0 |
| devtools | SwiftLint | 46198 | 12.1 | 17.1 | 37.9 | 0.0 | 2.2 | 0.0 | 0.0 | 13.6 | 0.4 | 1.9 |
| devtools | SwiftFormat | 32059 | 0.0 | 0.9 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.9 | 0.0 |
| devtools | tuist | 136430 | 0.0 | 6.4 | 5.1 | 0.0 | 0.0 | 0.1 | 0.0 | 0.0 | 3.3 | 0.0 |
| apps | IceCubesApp | 37098 | 0.0 | 134.0 | 12.7 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 2.4 | 0.0 |
| apps | element-x-ios | 98287 | 1.5 | 151.9 | 5.2 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 4.2 | 0.3 |
| platforms | rules_swift | 1726 | 0.0 | 5.8 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| platforms | JavaScriptKit | 26139 | 19.1 | 47.8 | 11.9 | 0.0 | 1.1 | 0.0 | 0.0 | 0.8 | 23.0 | 1.9 |
| platforms | swift-embedded-examples | 0 | - | - | - | - | - | - | - | - | - | - |
| oci | containerization | 35468 | 0.0 | 1.1 | 30.4 | 0.0 | 15.5 | 0.0 | 0.0 | 44.5 | 3.4 | 0.0 |
| oci | container | 29179 | 0.0 | 0.0 | 21.2 | 0.0 | 0.0 | 0.0 | 0.0 | 3.4 | 0.7 | 0.0 |
| oci | swift-container-plugin | 2520 | 0.0 | 0.0 | 47.6 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| | **TOTAL** | 1220887 | **10.8** | **33.7** | **54.4** | **10.4** | **42.5** | **3.4** | **9.7** | **37.4** | **55.7** | **0.7** |
| | repos with >=1 | | 20 | 31 | 35 | 13 | 24 | 10 | 14 | 26 | 35 | 9 |

- typed throws: max swift-crypto 128.7/10k, then swift-collections 69.5; zero in 20 repos; lowest among repos >=5k LOC: Alamofire 0.0, IceCubesApp 0.0
- some: max element-x-ios 151.9/10k, then IceCubesApp 134.0; zero in 9 repos; lowest among repos >=5k LOC: container 0.0, swift-argument-parser 0.0
- any: max Alamofire 383.6/10k, then swift-build 292.2; zero in 5 repos; lowest among repos >=5k LOC: swift-collections 0.0, SwiftFormat 0.0
- ~Copyable: max swift-collections 162.6/10k, then swift-async-algorithms 75.2; zero in 27 repos; lowest among repos >=5k LOC: Alamofire 0.0, IceCubesApp 0.0
- @inlinable: max swift-collections 466.2/10k, then swift-log 359.6; zero in 16 repos; lowest among repos >=5k LOC: Alamofire 0.0, IceCubesApp 0.0
- internal import: max swift-foundation 30.2/10k, then swift-testing 9.7; zero in 30 repos; lowest among repos >=5k LOC: Alamofire 0.0, IceCubesApp 0.0
- public import: max hummingbird 125.1/10k, then vapor 112.5; zero in 26 repos; lowest among repos >=5k LOC: Alamofire 0.0, IceCubesApp 0.0
- package access: max sourcekit-lsp 347.3/10k, then swift-collections 143.1; zero in 14 repos; lowest among repos >=5k LOC: Alamofire 0.0, IceCubesApp 0.0
- @available: max swift-system 378.3/10k, then swift-crypto 234.5; zero in 5 repos; lowest among repos >=5k LOC: swift-openapi-generator 0.0, swiftly 0.0
- macro decl: max swift-dependencies 42.6/10k, then swift-testing 10.7; zero in 31 repos; lowest among repos >=5k LOC: Alamofire 0.0, IceCubesApp 0.0

Corpus totals (prod; repos with at least one in parentheses):

| feature | hits | per 10k | repos |
|---|--:|--:|--:|
| typed throws `throws(E)` | 1,323 | 10.8 | 20 |
| `rethrows` | 776 | 6.4 | 34 |
| primary associated types | 70 | 0.57 | 16 |
| parameter packs (`each` / `repeat`) | 121 / 120 | 0.99 / 0.98 | 3 (foundation 103/100, swift-testing 14/15) |
| `some` anywhere / in param position | 4,111 / 1,942 | 33.7 | 31 |
| `any` anywhere / in param position | 6,636 / 3,781 | 54.4 | 35 |
| `~Copyable` | 1,267 | 10.4 | 13 (collections 161/10k) |
| `~Escapable` / `@_lifetime` | 323 / 433 | 2.7 / 3.6 | 5 / 7 |
| `consuming`/`borrowing` / `consume` operator | 1,022 / 94 | 8.4 / 0.77 | 14 / 9 (async-algorithms 48/10k for `consume`) |
| `Span` family types / `InlineArray` | 833 / 32 | 6.8 / 0.26 | 7 / 5 |
| freestanding / attached macro decls / `#externalMacro` | 47 / 67 / 96 | 0.38 / 0.55 / 0.79 | 5 / 7 / 8 |
| `@resultBuilder` | 7 | 0.06 | 6 |
| `@frozen` / `@inlinable` / `@usableFromInline` | 215 / 5,184 / 2,428 | 1.8 / 42.5 / 19.9 | 12 / 24 / 24 |
| `@_spi` / `@_implementationOnly` / `@_exported` | 2,450 / 165 / 213 | 20.1 / 1.4 / 1.7 | 21 / 4 / 17 |
| `internal import` / `public import` / `package import` / `private` | 420 / 1,189 / 292 / 125 | 3.4 / 9.7 / 2.4 / 1.0 | 10 / 14 / 9 / 8 |
| `@preconcurrency import` | 410 | 3.4 | 21 |
| `package` access modifier | 4,566 | 37.4 | 26 |
| `@available` total / deprecated / unavailable / renamed | 6,801 / 1,383 / 666 / 736 | 55.7 / 11.3 / 5.5 / 6.0 | 35 / 31 / 21 / 27 |
| availability macros (`@available(SwiftStdlib 5.x, *)`-style) | 908 | 7.4 | 6 |
| `if`/`switch` expressions (lower bound) | 533 | 4.4 | 19 |
| `@MainActor` | 614 | 5.0 | 11 |
| `sending` | 246 | 2.0 | 16 |
| `@concurrent` / `nonisolated(nonsending)` | 12 / 51 | 0.10 / 0.42 | 3 / 6 |

Swift-version-specific notes (attribution from background knowledge unless
marked): typed throws, `Mutex`, `sending`, `package import` and `Swift Testing`
are Swift 6.0-era; `@concurrent`, `nonisolated(nonsending)`, `InlineArray`,
`Span`, `strictMemorySafety`/`unsafe` expressions and isolated conformances are
6.2-era; traits are 6.1-era. Measured evidence of 6.3/6.4-era syntax: swift-foundation
uses `@export(implementation|interface)` 621 times and `@abi` 32 times, swift-crypto
uses `@diagnose(...)` 41 times, swift-testing uses `@c`
and `@implementation` (`swift-testing@c7d68ca20cd7:Sources/EmbeddedPlatform/EmbeddedPlatformPOSIX+WASI.swift:54`).
These only compile on current toolchains; a 6.0 floor would reject them.

Observations:
- Typed throws is concentrated: crypto 128.7/10k (`CryptoKitMetaError` 233 uses), collections 69.5, log 64.6 (generic forwarding), foundation, SwiftLint (`Issue`), JavaScriptKit (`JSException` 42), swift-system (`Errno` 35). 66% of hits are generic forwarding (`throws(E)` through closure parameters), not domain error types. Zero hits in 20 repos (hummingbird, protobuf, openapi-generator, swift-format, swift-syntax, swiftly, async-http-client, service-lifecycle, TCA, ...).
- `any` is far more common than `some` (6,636 vs 4,111); Alamofire 384/10k and swift-build 292/10k are the `any` extremes; element-x 152/10k and IceCubes 134/10k are the `some` extremes (SwiftUI `some View`). 15 repos enable ExistentialAny.
- Macro *authors* are rare (attached-macro declarations in 7 repos); `#Preview` is 17 prod hits in 3 repos, `@Observable` 62 (4 repos), `@Model` 5, `@Mockable` 256 (tuist only).
- Ownership features cluster in swift-collections (852 `~Copyable`), swift-foundation (213), swift-async-algorithms (96), swift-testing (59); 22 of 40 repos have none, including both apps, tuist, SwiftLint, SwiftFormat, Alamofire, TCA, dependencies, grpc-swift-2 and async-http-client.

## Axis 4 - safety and failure posture

Commands: `python3 -I fu.py` (force-unwrap heuristic: postfix `!` preceded by
`[\w)\]}?>`]`, not followed by `=`, excluding `try!`, `as!`, `is!`, and IUO
declarations), `python3 -I rep3.py` (safety1/safety2). Validation in Appendix B.
Prod only; the 981 `try!` and 5,199 force unwraps in test code are excluded.

| group | repo | prod LOC | force `!` | try! | as! | IUO decl | fatalError | precondition | assert | Unsafe*Pointer | `unsafe` expr |
|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| core | swift-log | 2475 | 9 | 0 | 8 | 0 | 0 | 12 | 4 | 14 | 0 |
| core | swift-system | 8380 | 62 | 0 | 1 | 4 | 29 | 37 | 33 | 202 | 2 |
| core | swift-argument-parser | 10004 | 23 | 0 | 1 | 0 | 26 | 4 | 3 | 2 | 0 |
| core | swift-async-algorithms | 12772 | 49 | 1 | 5 | 0 | 30 | 50 | 2 | 18 | 0 |
| core | swift-collections | 52400 | 143 | 1 | 5 | 2 | 21 | 636 | 963 | 477 | 4911 |
| core | swift-nio | 71267 | 351 | 95 | 89 | 41 | 300 | 252 | 297 | 905 | 0 |
| core | swift-crypto | 16634 | 130 | 101 | 4 | 1 | 22 | 106 | 31 | 225 | 0 |
| core | swift-distributed-tracing | 2240 | 4 | 7 | 4 | 0 | 4 | 6 | 1 | 6 | 0 |
| core | swift-protobuf | 19880 | 108 | 16 | 22 | 19 | 11 | 35 | 208 | 122 | 0 |
| core | swift-openapi-generator | 10560 | 9 | 4 | 0 | 0 | 2 | 8 | 0 | 0 | 0 |
| core | swift-foundation | 103039 | 574 | 11 | 48 | 11 | 158 | 319 | 147 | 821 | 45 |
| tools | swift-format | 12593 | 41 | 1 | 4 | 3 | 11 | 2 | 8 | 0 | 0 |
| tools | swift-syntax | 63144 | 209 | 93 | 5 | 0 | 94 | 149 | 24 | 205 | 0 |
| tools | swift-testing | 20605 | 89 | 0 | 4 | 2 | 6 | 28 | 6 | 270 | 0 |
| tools | swift-package-manager | 104319 | 111 | 47 | 12 | 10 | 57 | 80 | 59 | 17 | 0 |
| tools | sourcekit-lsp | 40658 | 84 | 11 | 1 | 15 | 13 | 44 | 30 | 133 | 0 |
| tools | swiftly | 6698 | 15 | 9 | 0 | 0 | 14 | 0 | 0 | 1 | 0 |
| tools | swift-build | 114685 | 352 | 79 | 101 | 13 | 165 | 138 | 237 | 173 | 0 |
| server | async-http-client | 14083 | 43 | 1 | 2 | 0 | 29 | 42 | 29 | 5 | 0 |
| server | swift-service-lifecycle | 1852 | 1 | 0 | 2 | 1 | 16 | 9 | 1 | 7 | 0 |
| server | swift-aws-lambda-runtime | 6763 | 17 | 0 | 0 | 4 | 20 | 7 | 1 | 6 | 0 |
| server | grpc-swift-2 | 12366 | 13 | 17 | 0 | 0 | 29 | 7 | 8 | 11 | 0 |
| server | vapor | 13513 | 150 | 0 | 15 | 1 | 5 | 6 | 17 | 0 | 9 |
| server | hummingbird | 11589 | 59 | 4 | 6 | 0 | 8 | 3 | 7 | 7 | 0 |
| community | swift-composable-architecture | 13766 | 15 | 0 | 3 | 1 | 8 | 4 | 1 | 1 | 0 |
| community | swift-dependencies | 3286 | 1 | 0 | 0 | 2 | 0 | 0 | 0 | 1 | 0 |
| community | swift-snapshot-testing | 6331 | 45 | 4 | 8 | 0 | 14 | 4 | 0 | 2 | 0 |
| community | Alamofire | 9410 | 10 | 0 | 0 | 0 | 14 | 10 | 3 | 1 | 0 |
| community | Nuke | 10471 | 7 | 0 | 0 | 2 | 15 | 0 | 3 | 1 | 0 |
| devtools | SwiftLint | 46198 | 24 | 5 | 2 | 4 | 2 | 5 | 6 | 5 | 0 |
| devtools | SwiftFormat | 32059 | 80 | 3 | 2 | 11 | 34 | 4 | 61 | 0 | 0 |
| devtools | tuist | 136430 | 167 | 77 | 2 | 15 | 17 | 7 | 1 | 40 | 0 |
| apps | IceCubesApp | 37098 | 49 | 4 | 5 | 0 | 4 | 0 | 0 | 0 | 0 |
| apps | element-x-ios | 98287 | 17 | 9 | 1 | 33 | 208 | 0 | 1 | 2 | 0 |
| platforms | rules_swift | 1726 | 11 | 1 | 0 | 0 | 0 | 0 | 0 | 16 | 0 |
| platforms | JavaScriptKit | 26139 | 222 | 1 | 2 | 13 | 25 | 6 | 16 | 109 | 0 |
| platforms | swift-embedded-examples | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| oci | containerization | 35468 | 43 | 6 | 0 | 1 | 17 | 4 | 0 | 76 | 0 |
| oci | container | 29179 | 23 | 8 | 14 | 0 | 13 | 4 | 0 | 12 | 0 |
| oci | swift-container-plugin | 2520 | 4 | 4 | 0 | 0 | 0 | 9 | 5 | 0 | 0 |
| | **TOTAL** | 1220887 | **3364** | **620** | **378** | **209** | **1441** | **2037** | **2213** | **3893** | **4967** |
| | repos with >=1 | | 39 | 28 | 29 | 23 | 35 | 33 | 31 | 33 | 4 |

- force `!`: max vapor 111.0/10k, then JavaScriptKit 84.9; zero in 1 repos; lowest among repos >=5k LOC: element-x-ios 1.7, SwiftLint 5.2
- try!: max swift-crypto 60.7/10k, then swift-distributed-tracing 31.2; zero in 12 repos; lowest among repos >=5k LOC: Alamofire 0.0, swift-argument-parser 0.0
- as!: max swift-log 32.3/10k, then swift-distributed-tracing 17.9; zero in 11 repos; lowest among repos >=5k LOC: Alamofire 0.0, containerization 0.0
- IUO decl: max swift-protobuf 9.6/10k, then swift-dependencies 6.1; zero in 17 repos; lowest among repos >=5k LOC: Alamofire 0.0, IceCubesApp 0.0
- fatalError: max swift-service-lifecycle 86.4/10k, then swift-nio 42.1; zero in 5 repos; lowest among repos >=5k LOC: SwiftLint 0.4, IceCubesApp 1.1
- precondition: max swift-collections 121.4/10k, then swift-crypto 63.7; zero in 7 repos; lowest among repos >=5k LOC: IceCubesApp 0.0, element-x-ios 0.0
- assert: max swift-collections 183.8/10k, then swift-protobuf 104.6; zero in 9 repos; lowest among repos >=5k LOC: IceCubesApp 0.0, container 0.0
- Unsafe*Pointer: max swift-system 241.1/10k, then swift-crypto 135.3; zero in 7 repos; lowest among repos >=5k LOC: IceCubesApp 0.0, swift-openapi-generator 0.0
- `unsafe` expr: max swift-collections 937.2/10k, then vapor 6.7; zero in 36 repos; lowest among repos >=5k LOC: Alamofire 0.0, IceCubesApp 0.0

Note: `Unsafe*Pointer` counts type mentions, not allocations. `swift-embedded-examples`
has no prod files (all `example`) and is the single "zero force unwrap" repo.

Totals (prod): `unowned` stored 45 / `[unowned]` 24, `weak` stored 108 / `[weak]` 861
(element-x 72/10k), `withUnsafe*` 1,944, `unsafeBitCast`/`unsafeDowncast` 98
(the `unsafeAddress` accessor accounts for the other 40 in the 138 bundle),
`Unmanaged` 217, `@unsafe` 301 and `@safe` 183 (both nearly all swift-collections),
`unsafe` expressions 4,967 (swift-collections 937/10k, vapor 6.7/10k, 36 repos zero),
`@_cdecl`-style exports 114, `assertionFailure` 119, `preconditionFailure` 727.

By group (per 10k LOC, prod):

| group (repos) | force `!` | try! | fatalError | @unchecked Sendable | Dispatch* | Combine imports | `Task {` | actor decls | callback params |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| core (11) | 47.2 | 7.6 | 19.5 | 5.9 | 1.5 | 0.0 | 0.5 | 0.0 | 3.0 |
| tools (7) | 24.8 | 6.6 | 9.9 | 7.1 | 5.4 | 0.0 | 2.2 | 2.0 | 3.0 |
| server (6) | 47.0 | 3.7 | 17.8 | 3.8 | 2.5 | 0.0 | 3.8 | 1.8 | 5.0 |
| community (5) | 18.0 | 0.9 | 11.8 | 8.1 | 34.9 | 4.9 | 12.3 | 0.7 | 26.3 |
| devtools (3) | 12.6 | 4.0 | 2.5 | 1.1 | 1.8 | 0.2 | 2.4 | 0.7 | 0.4 |
| apps (2) | 4.9 | 1.0 | 15.7 | 1.0 | 16.2 | 30.5 | 49.0 | 0.7 | 1.8 |
| platforms (3) | 83.6 | 0.7 | 9.0 | 4.7 | 1.8 | 0.0 | 2.2 | 0.0 | 1.1 |
| oci (3) | 10.4 | 2.7 | 4.5 | 0.1 | 7.0 | 0.0 | 4.3 | 6.0 | 2.1 |

Reading: force unwraps are highest in platform and core/server code (index
tables, HTTP header constants: vapor `HTTPHeaders+Name.swift` 130 sites,
JavaScriptKit `JSDate.swift` 64, foundation file operations 42) and lowest in
apps and devtools. The oci group (apple/container, containerization,
container-plugin) is the cleanest on every concurrency escape hatch: one
`@unchecked Sendable` in 67k LOC, 40 actors, no Combine, and Dispatch at 7/10k.

Failure primitives: `precondition` 2,037 and `assert` 2,213 are concentrated in
swift-collections (121/10k and 184/10k) and swift-protobuf; `preconditionFailure`
in async-http-client (140/10k) and async-algorithms (92/10k); `fatalError` in
service-lifecycle (86/10k), nio (42), swift-system (35). Apps and CLI tools
lean on `try?` instead: swiftly 70/10k, containerization 58, container 51
(snapshot-testing's `as?` at 82/10k is the cast extreme).

## Axis 5 - errors

Commands: `python3 -I err.py` (conformers to `Error`, `LocalizedError`,
`CustomStringConvertible`, `Sendable`; "wraps underlying" = stored property of
type `Error`/`any Error`/`underlying` in the type body - heuristic, not
spot-read), `python3 -I catch.py` (catch-block body classification).

| group | repo | error types (enum/struct) | LocalizedError | wraps underlying | catch blocks | empty | log-only | drop/return | bare `catch {` |
|---|---|--:|--:|--:|--:|--:|--:|--:|--:|
| core | swift-log | 0 (0/0) | 0 | 0 | 8 | 0 | 0 | 0 | 8 |
| core | swift-system | 2 (1/1) | 0 | 0 | 7 | 0 | 0 | 3 | 2 |
| core | swift-argument-parser | 16 (10/6) | 3 | 6 | 40 | 0 | 0 | 0 | 32 |
| core | swift-async-algorithms | 7 (2/5) | 0 | 0 | 59 | 0 | 0 | 0 | 59 |
| core | swift-collections | 0 (0/0) | 0 | 0 | 2 | 0 | 0 | 0 | 2 |
| core | swift-nio | 56 (17/39) | 0 | 5 | 162 | 5 | 4 | 5 | 113 |
| core | swift-crypto | 17 (15/2) | 0 | 1 | 10 | 0 | 0 | 0 | 4 |
| core | swift-distributed-tracing | 0 (0/0) | 0 | 0 | 13 | 0 | 0 | 0 | 13 |
| core | swift-protobuf | 15 (14/1) | 0 | 1 | 23 | 2 | 0 | 3 | 11 |
| core | swift-openapi-generator | 11 (7/4) | 10 | 1 | 11 | 0 | 0 | 0 | 7 |
| core | swift-foundation | 24 (17/7) | 1 | 0 | 128 | 1 | 0 | 17 | 101 |
| tools | swift-format | 4 (3/1) | 1 | 0 | 11 | 0 | 0 | 2 | 9 |
| tools | swift-syntax | 40 (27/13) | 0 | 0 | 26 | 0 | 0 | 3 | 21 |
| tools | swift-testing | 12 (4/8) | 0 | 1 | 28 | 7 | 0 | 1 | 21 |
| tools | swift-package-manager | 129 (99/30) | 33 | 13 | 406 | 5 | 5 | 37 | 321 |
| tools | sourcekit-lsp | 41 (20/21) | 8 | 4 | 72 | 5 | 11 | 14 | 62 |
| tools | swiftly | 16 (6/10) | 9 | 3 | 43 | 1 | 0 | 3 | 32 |
| tools | swift-build | 76 (52/24) | 29 | 2 | 544 | 17 | 2 | 22 | 473 |
| server | async-http-client | 11 (0/11) | 0 | 0 | 30 | 0 | 0 | 1 | 30 |
| server | swift-service-lifecycle | 1 (0/1) | 0 | 0 | 7 | 1 | 0 | 0 | 7 |
| server | swift-aws-lambda-runtime | 8 (5/3) | 0 | 1 | 48 | 1 | 4 | 0 | 29 |
| server | grpc-swift-2 | 5 (2/3) | 0 | 0 | 23 | 0 | 0 | 2 | 14 |
| server | vapor | 21 (9/12) | 0 | 2 | 35 | 1 | 1 | 1 | 29 |
| server | hummingbird | 17 (5/12) | 0 | 0 | 52 | 2 | 6 | 4 | 33 |
| community | swift-composable-architecture | 0 (0/0) | 0 | 0 | 13 | 0 | 0 | 1 | 12 |
| community | swift-dependencies | 2 (0/2) | 0 | 0 | 3 | 0 | 0 | 0 | 3 |
| community | swift-snapshot-testing | 1 (0/1) | 1 | 0 | 9 | 0 | 0 | 1 | 8 |
| community | Alamofire | 7 (5/2) | 1 | 2 | 24 | 1 | 0 | 0 | 24 |
| community | Nuke | 5 (5/0) | 0 | 1 | 10 | 1 | 0 | 0 | 9 |
| devtools | SwiftLint | 6 (6/0) | 3 | 0 | 23 | 0 | 0 | 2 | 20 |
| devtools | SwiftFormat | 2 (2/0) | 2 | 0 | 28 | 0 | 0 | 1 | 27 |
| devtools | tuist | 270 (261/9) | 250 | 7 | 288 | 7 | 21 | 28 | 231 |
| apps | IceCubesApp | 11 (10/1) | 1 | 2 | 177 | 59 | 4 | 17 | 166 |
| apps | element-x-ios | 61 (61/0) | 8 | 19 | 377 | 0 | 68 | 1 | 350 |
| platforms | rules_swift | 2 (1/1) | 0 | 0 | 4 | 0 | 0 | 1 | 3 |
| platforms | JavaScriptKit | 14 (2/12) | 0 | 0 | 14 | 0 | 1 | 0 | 13 |
| platforms | swift-embedded-examples | 0 (0/0) | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| oci | containerization | 37 (34/3) | 1 | 2 | 207 | 3 | 10 | 6 | 167 |
| oci | container | 15 (13/2) | 1 | 1 | 231 | 3 | 18 | 14 | 197 |
| oci | swift-container-plugin | 11 (11/0) | 0 | 1 | 8 | 0 | 0 | 1 | 4 |

Totals: 973 error types - enum 726 (75%), struct 247, class 0. Conformances:
`LocalizedError` 340 (tuist 250, SwiftPM 33, swift-build 29), `CustomStringConvertible`
~340, `Sendable` 95 (containerization 26, SwiftPM 23, swift-build 18). Types
wrapping an underlying error: ~75 (7.7%) - most errors lose their cause. Extremes:
tuist 270 error types (261 enum) and SwiftPM 129 vs 0 in swift-log, collections,
distributed-tracing and TCA. Reading: libraries expose few error types
(swift-system 2, argument-parser 16) and CLIs/app tools many.

Catch blocks: 3,204 total - bare `catch {` (binds implicit `error`) 2,667, empty
122, log-only 155, drop/return-only 191. `try?` adds 2,231 silent-discard sites
and `Result<` 1,244 uses. Extremes: IceCubes has 59 empty of 177 catch blocks
(e.g. `IceCubesApp@2ad6e6891258:Packages/Timeline/Sources/Timeline/actors/TimelineCache.swift:59`
and :69, both `} catch {}` around cache writes), swift-build 17 empty of 544,
swift-testing 7 empty of 28 (typed `catch is ExpectationFailedError` with the
reason in comments, `swift-testing@c7d68ca20cd7:Sources/Testing/Issues/Issue+Recording.swift:274`).
element-x never leaves a catch empty but 68 of 377 only log
(`element-x-ios@14e33866ced2:ElementX/Sources/Services/Keychain/KeychainController.swift:133`
logs and continues). The categories overlap in form: "bare" counts the `catch {` pattern form, the other three count body shape.

Typed-throws error domain: where typed throws exists it is almost always
`Failure`/`E` forwarding (Appendix: `params.py` classification:
generic/forwarded 879, concrete 433, `Never` 5, `any Error` 6).

## Axis 6 - global and static mutable state

Commands: `python3 -I state2.py` (line-based; brace-stack tracks enclosing type
headers and isolation attributes), `python3 -I state3.py` (per-repo table).
"Guarded" means `nonisolated(unsafe)`, `@MainActor`, `@TaskLocal`, or an
atomic/lock-typed value on the declaration. Computed `static var` (4,313) and
`static let` are excluded from "stored".

| repo | static var stored | unguarded | @TaskLocal | @MainActor | global var stored | global unguarded | nonisolated(unsafe) total | static let shared | other singleton names |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| swift-async-algorithms | 0 | 0 | 0 | 0 | 0 | 0 | 20 | 0 | 0 |
| swift-collections | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 0 |
| swift-nio | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 4 | 2 |
| swift-crypto | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 |
| swift-distributed-tracing | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| swift-protobuf | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 |
| swift-foundation | 0 | 0 | 0 | 0 | 0 | 0 | 6 | 1 | 8 |
| swift-format | 5 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| swift-syntax | 9 | 9 | 0 | 0 | 3 | 1 | 5 | 2 | 0 |
| swift-testing | 2 | 2 | 0 | 0 | 3 | 0 | 36 | 0 | 6 |
| swift-package-manager | 24 | 24 | 0 | 0 | 3 | 3 | 0 | 2 | 4 |
| sourcekit-lsp | 2 | 0 | 0 | 0 | 2 | 0 | 40 | 2 | 2 |
| swift-build | 6 | 3 | 3 | 0 | 2 | 0 | 3 | 2 | 2 |
| async-http-client | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 2 | 0 |
| swift-service-lifecycle | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| grpc-swift-2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| vapor | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 1 |
| hummingbird | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| swift-composable-architecture | 3 | 0 | 3 | 0 | 0 | 0 | 0 | 1 | 0 |
| swift-dependencies | 6 | 1 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| swift-snapshot-testing | 3 | 1 | 2 | 0 | 3 | 3 | 0 | 0 | 1 |
| Alamofire | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 |
| Nuke | 1 | 0 | 0 | 1 | 0 | 0 | 13 | 8 | 0 |
| SwiftLint | 11 | 3 | 6 | 0 | 2 | 0 | 3 | 2 | 2 |
| SwiftFormat | 7 | 7 | 0 | 0 | 5 | 5 | 0 | 0 | 0 |
| tuist | 58 | 18 | 39 | 1 | 0 | 0 | 0 | 3 | 24 |
| IceCubesApp | 8 | 0 | 0 | 8 | 0 | 0 | 0 | 17 | 0 |
| element-x-ios | 23 | 17 | 0 | 1 | 0 | 0 | 16 | 1 | 3 |
| rules_swift | 0 | 0 | 0 | 0 | 1 | 1 | 5 | 1 | 0 |
| JavaScriptKit | 2 | 0 | 0 | 0 | 0 | 0 | 6 | 1 | 2 |
| containerization | 0 | 0 | 0 | 0 | 0 | 0 | 17 | 0 | 4 |
| container | 0 | 0 | 0 | 0 | 1 | 0 | 12 | 0 | 1 |

Totals: 174 stored `static var` (93 without any guard), 27 stored global
`var` (13 unguarded), 7 script-level stored in `main.swift`, 424 computed
global vars. Guards among stored statics: `nonisolated(unsafe)` 11, `@MainActor`
11, `@TaskLocal` 59 (tuist 39), lock/atomic type 0. `static let shared` 50 and
67 other singleton-named statics (`default`, `current`, `standard`). Extremes:
tuist 58 stored statics (39 `@TaskLocal`), SwiftPM 24 unguarded, element-x 23
(17 unguarded) vs zero in swift-log, argument-parser, async-algorithms,
collections, nio, crypto, protobuf, openapi-generator, foundation, swiftly,
Alamofire, container, containerization, container-plugin and others (20 of 40).

Sample of the unguarded set (spot-read of 20): most are not hazards.
`static var configuration = CommandConfiguration(...)` is an ArgumentParser
protocol requirement (`swift-format@b15dd59fad21:Sources/swift-format/Subcommands/Lint.swift:18`,
SwiftPM `SwiftRunCommand` :98, swift-syntax `PrintDiags.swift:19`); `static var`
on SwiftUI `PreviewProvider` types is a preview fixture
(`element-x-ios@14e33866ced2:ElementX/Sources/Screens/FilePreviewScreen/View/TimelineMediaPreviewDetailsView.swift:179`);
and SwiftFormat/SwiftPM statics live in Swift 5-mode targets. Real
mutable-global hazards: `swift-build@2187330e13e7:Sources/SWBMacro/MacroExpression.swift:88`
(`public static var staticStorageTable = Dictionary<...>()` in Swift 5-mode
SWBMacro), `SwiftLint@ec4691d9e813:Source/SwiftLintFramework/Configuration/Configuration+RulesWrapper.swift:6`
(`private static var isOptInRuleCache`), `swift-package-manager@5546f44a3b52:Sources/Workspace/Workspace+Configuration.swift:221`
(`public static var resolvedFileName`). The guarded idioms in Swift 6 repos:
`nonisolated(unsafe) var` with a comment (`container@f70ecbb926d9:Sources/ContainerCommands/Application.swift:30`,
`swift-syntax@be549876fe91:Sources/SwiftCompilerPluginMessageHandling/CompilerPluginMessageHandler.swift:312`),
`@TaskLocal` (`swift-testing@c7d68ca20cd7:Sources/Testing/Test+Cancellation.swift:93`,
`swift-build@2187330e13e7:Sources/SWBUtil/EnvironmentHelpers.swift:15`), and
`Mutex`-wrapped values.

`nonisolated(unsafe)` overall: 191 prod hits in 19 repos; concentrated in
sourcekit-lsp 40, swift-testing 36, async-algorithms 20, containerization 17,
element-x 16, Nuke 13, container 12. Compare raw greps in Method: 2,794
unfiltered. The 125 test-code hits (JavaScriptKit 43, async-algorithms 19)
are excluded.

## Axis 7 - run the compiler

Commands, six packages, two toolchains, debug builds, one run each:

```
$ cd <exemplar> && SWIFT_VERSION=6.4 ~/.cache/research-lang/swift-tools/run.sh swift build \
      --scratch-path ~/.cache/research-lang/swift-tools/build/<repo>-6.4
$ (same with SWIFT_VERSION=6.3 -> 6.3.3 image)
```

| package | rc 6.4 / 6.3 | `Build complete!` 6.4 / 6.3 | wall incl. docker+resolve 6.4 / 6.3 | unique warnings 6.4 / 6.3 |
|---|---|---|---|--:|
| swift-log | 0 / 0 | 2.84 s / 2.72 s | 4 s / 4 s | 0 / 0 |
| swift-system | 0 / 0 | 4.38 s / 3.50 s | 6 s / 5 s | 0 / 0 |
| swift-argument-parser | 0 / 0 | 3.37 s / 6.00 s | 6 s / 7 s | 4 / 4 |
| swift-async-algorithms | 0 / 0 | 6.85 s / 8.46 s | 12 s / 9 s | 5 / 4 |
| swift-service-lifecycle | 0 / 0 | 6.43 s / 7.48 s | 11 s / 9 s | 0 / 0 |
| swift-container-plugin | 0 / 0 | 10.03 s / 25.63 s | 21 s / 27 s | 0 / 0 |

Timings are single runs and are confounded by the engine change, not a
benchmark: swift 6.4 `swift build` defaults to the Swift Build engine (scratch
dir `.buildSystem_debug` contains `swiftbuild`, `manifest.pif`,
`out/Products/Debug-linux-x86_64`; progress lines look like
`[Pre-planning 1 / 298]`); 6.3 uses the native llbuild engine (`debug.yaml`,
`build.db`, `[2/48] Write sources`). 6.4 logs captured from a non-TTY still
contain ANSI colours and OSC-8 hyperlinks on warning lines; 6.3 logs do not,
and 6.3 prints each diagnostic more than once in the raw log (de-duplicated
above).

Warnings, de-duplicated by file:line:
- argument-parser, both toolchains, 4 `DeprecatedDeclaration`: `_errorLabel` (`swift-argument-parser@efd239f0055b:Sources/ArgumentParser/Parsable Types/ParsableArguments.swift:76`), `customDeprecated` (`swift-argument-parser@efd239f0055b:Sources/ArgumentParser/Usage/DumpHelpGenerator.swift:208`), and the deprecated test helpers `TestableParsableArguments`/`TestableParsableCommand` (`swift-argument-parser@efd239f0055b:Sources/ArgumentParserTestHelpers/TestHelpers.swift:56`, :75), the repo deprecating its own XCTest helpers in favour of Swift Testing.
- async-algorithms, 6.3: 3 `SendableMetatypes` (`swift-async-algorithms@cbde9aed744b:Sources/AsyncAlgorithms/AsyncChunksOfCountOrSignalSequence.swift:169`, :170, `AsyncRemoveDuplicatesSequence.swift:18`) plus one ungrouped "cannot use default expression for inference of 'Failure.Type' ... will be an error in a future Swift language mode" (`swift-async-algorithms@cbde9aed744b:Sources/AsyncAlgorithms/MultiProducerSingleConsumerChannel/MultiProducerSingleConsumerAsyncChannel.swift:173`). 6.4 adds one `IsolatedConformances`: "conformance of 'Base' to protocol 'AsyncSequence' may be isolated and cannot be passed to @concurrent context" (`swift-async-algorithms@cbde9aed744b:Sources/AsyncAlgorithms/AsyncShareSequence.swift:660`).
- log, system, service-lifecycle, container-plugin: zero warnings on both toolchains.

Warning classes seen: `DeprecatedDeclaration`, `SendableMetatypes`,
`IsolatedConformances`, one future-language-mode warning. Reading: 4 of 6 packages build warning-free on both toolchains, and the one new 6.4 diagnostic (`IsolatedConformances`) arrives as a warning, not an error, in a package in Swift 6 mode.

## Cross-cutting - testing, gates, CI, H1-H8 verdicts

Commands: `python3 -I tests.py` (imports and macro counts in test code),
`python3 -I ci3.py` (strict regex over `.github/workflows/*.yml`: a leg counts
only if it names an OS/SDK or sets a reusable-workflow flag to `true`; the
regex does not follow a reusable workflow into another repo, so Linux is
under-counted for repos that delegate - async-algorithms shows Linux "-" while
using the shared workflow), config presence by `git ls-files`.

| group | repo | test files | Testing / XCTest imports | @Test | XCTest funcs | Testing share | fmt | lint | Package.resolved | CI: lin mac win static wasm andr |
|---|---|--:|---|--:|--:|--:|---|---|---|---|
| core | swift-log | 19 | 18 / 0 | 174 | 24 | 88% | swift-format | - | - | Y - Y Y Y Y |
| core | swift-system | 22 | 2 / 17 | 8 | 99 | 7% | - | - | - | Y Y Y Y Y Y |
| core | swift-argument-parser | 68 | 62 / 1 | 572 | 0 | 100% | swift-format | - | - | Y Y - - Y - |
| core | swift-async-algorithms | 62 | 13 / 33 | 91 | 352 | 21% | swift-format | - | - | - - - - Y - |
| core | swift-collections | 118 | 2 / 52 | 13 | 1108 | 1% | swift-format | - | - | Y Y - - Y Y |
| core | swift-nio | 224 | 24 / 147 | 315 | 2576 | 11% | swift-format | - | - | Y Y Y Y Y Y |
| core | swift-crypto | 79 | 0 / 71 | 0 | 404 | 0% | swift-format | - | - | Y - Y Y - - |
| core | swift-distributed-tracing | 12 | 10 / 0 | 77 | 0 | 100% | swift-format | - | - | Y - Y - Y - |
| core | swift-protobuf | 84 | 0 / 79 | 0 | 978 | 0% | swift-format | - | - | Y - - - - - |
| core | swift-openapi-generator | 44 | 0 / 40 | 0 | 324 | 0% | swift-format | - | - | Y - Y - - - |
| core | swift-foundation | 109 | 105 / 1 | 2119 | 70 | 97% | - | - | - | Y Y - - Y Y |
| tools | swift-format | 136 | 7 / 17 | 66 | 948 | 7% | swift-format | - | - | Y Y - - - - |
| tools | swift-syntax | 294 | 1 / 278 | 2 | 3573 | 0% | swift-format | - | - | Y - Y - Y - |
| tools | swift-testing | 92 | 23 / 6 | 936 | 148 | 86% | - | - | - | Y Y - - Y Y |
| tools | swift-package-manager | 368 | 214 / 117 | 1938 | 1570 | 55% | SwiftFormat | - | - | Y Y Y Y Y Y |
| tools | sourcekit-lsp | 151 | 1 / 118 | 32 | 1470 | 2% | swift-format | - | - | no CI |
| tools | swiftly | 23 | 23 / 0 | 184 | 55 | 77% | SwiftFormat | - | root | Y Y - - - - |
| tools | swift-build | 433 | 383 / 0 | 2955 | 43 | 99% | swift-format | - | - | Y Y Y Y Y Y |
| server | async-http-client | 64 | 5 / 51 | 42 | 594 | 7% | swift-format | - | - | Y - - Y - - |
| server | swift-service-lifecycle | 9 | 1 / 6 | 2 | 73 | 3% | swift-format | - | - | Y - Y Y Y - |
| server | swift-aws-lambda-runtime | 42 | 37 / 0 | 322 | 97 | 77% | swift-format | - | - | Y - - Y - - |
| server | grpc-swift-2 | 70 | 26 / 32 | 146 | 211 | 41% | swift-format | - | - | Y - - Y - - |
| server | vapor | 51 | 45 / 0 | 628 | 547 | 53% | swift-format | - | - | Y Y - Y - - |
| server | hummingbird | 45 | 37 / 0 | 455 | 410 | 53% | swift-format | - | - | Y Y - - - - |
| community | swift-composable-architecture | 116 | 33 / 78 | 109 | 554 | 16% | - | - | root | Y Y - - - - |
| community | swift-dependencies | 32 | 8 / 21 | 33 | 165 | 17% | - | - | root | Y Y - - Y Y |
| community | swift-snapshot-testing | 16 | 7 / 9 | 25 | 74 | 25% | - | - | root | Y Y - - - Y |
| community | Alamofire | 45 | 6 / 31 | 73 | 761 | 9% | SwiftFormat | - | - | Y Y Y - - Y |
| community | Nuke | 190 | 153 / 0 | 2506 | 1 | 100% | - | SwiftLint | - | Y Y - - - - |
| devtools | SwiftLint | 185 | 125 / 2 | 858 | 3 | 100% | - | SwiftLint | root | Y Y Y Y - - |
| devtools | SwiftFormat | 177 | 0 / 169 | 0 | 6050 | 0% | SwiftFormat | - | - | Y Y Y - - - |
| devtools | tuist | 850 | 414 / 427 | 3308 | 1997 | 62% | SwiftFormat | SwiftLint | root | Y Y - - - - |
| apps | IceCubesApp | 21 | 7 / 13 | 25 | 56 | 31% | SwiftFormat | - | root | - Y - - - - |
| apps | element-x-ios | 265 | 159 / 24 | 1282 | 64 | 95% | SwiftFormat | SwiftLint | root | Y Y - - - - |
| platforms | rules_swift | 12 | 0 / 2 | 0 | 19 | 0% | - | - | - | Y Y - - - - |
| platforms | JavaScriptKit | 237 | 33 / 39 | 316 | 246 | 56% | swift-format | - | - | Y Y - - Y - |
| platforms | swift-embedded-examples | 1 | 0 / 1 | 0 | 7 | 0% | swift-format | - | root | Y Y - - - - |
| oci | containerization | 102 | 89 / 0 | 846 | 433 | 66% | swift-format | - | root | Y Y - Y - - |
| oci | container | 142 | 122 / 0 | 1222 | 815 | 60% | swift-format | - | root | Y Y - - - - |
| oci | swift-container-plugin | 8 | 8 / 0 | 64 | 52 | 55% | swift-format | - | - | Y - - Y - - |

Testing share by group (test code; `@Test` vs `func test*()` cases):

| group | repos | @Test | XCTest funcs | Testing share | repos >= 50% Testing |
|---|--:|--:|--:|--:|--:|
| core | 11 | 3,369 | 5,935 | 36% | 4 |
| tools | 7 | 6,113 | 7,807 | 44% | 4 |
| server | 6 | 1,595 | 1,932 | 45% | 3 |
| community | 5 | 2,746 | 1,555 | 64% | 1 |
| devtools | 3 | 4,166 | 8,050 | 34% | 2 |
| apps | 2 | 1,307 | 120 | 92% | 1 |
| platforms | 3 | 316 | 272 | 54% | 1 |
| oci | 3 | 2,132 | 1,300 | 62% | 3 |
| **all** | 40 | 21,744 | 26,971 | 45% | 19 |

Totals: 5,018 test files / 1.17M LOC; Testing imports in 2,203 files (636k
LOC), XCTest in 1,882 (485k LOC), both in 65 files; `#expect`/`#require` 64,012
vs `XCTAssert*` 44,764; 1,723 `@Suite`; snapshot assertions 338. Extremes:
Testing >= 95%: argument-parser, Nuke, SwiftLint, distributed-tracing 100%, swift-build 99%,
foundation 97%, element-x 95%. Testing <= 2%: crypto, protobuf, openapi-generator, swift-syntax,
SwiftFormat, rules_swift (0%), collections 1%, sourcekit-lsp 2%.

Formatter details: `.swift-format` line length 120 in 15 repos, 80 in 3, 180 in 2,
and 100/140/150/10000 once each; indent 4 spaces in 16, 2 spaces in 8. Of the 24
configs most disable `NeverForceUnwrap` (18), `NeverUseForceTry` (18),
`NeverUseImplicitlyUnwrappedOptionals` (17), `AlwaysUseLowerCamelCase` (18) and
`AllPublicDeclarationsHaveDocumentation` (18) - the bundled defaults are looser
than what ships.

CI facts: Windows legs are real jobs, not placeholders, in swift-log
(`windows_6_2_enabled: true`, `swift-log@4038b6a4f74a:.github/workflows/main.yml:24`), service-lifecycle
and nio; static-Linux-SDK legs exist in libraries (swift-log, nio, crypto,
dependencies) as compatibility checks, while SwiftLint's release workflow
(`SwiftLint@ec4691d9e813:.github/workflows/release.yml:133`) and containerization
(`vminitd` static musl) *ship* static binaries. sourcekit-lsp has no workflows
in the clone (its CI runs in the swift.org Jenkins/`swiftlang/github-workflows`
world, outside the repo). Wasm legs appear in 15 repos, Android in 11.

### H1-H8 verdicts

| H | verdict | numbers |
|---|---|---|
| H1 Swift 6 common; community ships 5.x tools | mostly confirmed, second half refuted | 35 of 38 roots are tools >= 6.0 (3 below: SwiftFormat 5.7, SwiftLint, swift-syntax 5.9); 25 pure Swift 6 mode; the Swift-5-mode holdouts are swiftlang tools (foundation, SwiftPM, swift-syntax, swift-format) plus Alamofire, SwiftLint, SwiftFormat, snapshot-testing; Nuke (6.0), TCA and dependencies (6.4, mode 6) are community libs *in* Swift 6 |
| H2 `@unchecked Sendable`/`nonisolated(unsafe)` dominate and are avoidable | confirmed as dominant; avoidability unproven | 552 + 191 vs 176 `Mutex<` decls; 194 all-`let` (plausibly plain `Sendable` if member types allow), 139 mutable-no-guard (81 in swift-build, Swift 5-mode-era design), 91 retroactive, 82 guarded, 46 pointer wrappers; no compiler run proved any specific removal |
| H3 Testing overtook XCTest in Apple, not community | partially refuted | Testing 45% overall; apple/swiftlang repos split both ways (swift-build 99%, foundation 97% vs crypto, protobuf, swift-syntax, collections, sourcekit-lsp 0-2%); community pointfree 16-25% and Alamofire 9% XCTest-heavy but Nuke 100% and SwiftLint 100% Testing |
| H4 swiftlang uses bundled swift-format; community SwiftLint/SwiftFormat | mostly confirmed with exceptions | `.swift-format` 24 repos incl. vapor, hummingbird, grpc-swift-2; SwiftPM itself uses nicklockwood `.swiftformat`; swift-system, foundation, swift-testing, rules_swift and all 3 pointfree repos have none; SwiftLint in only 4 repos |
| H5 Package.resolved committed by apps/executables, not libs | mostly confirmed, one counter-group | root-tracked in container, containerization, element-x, SwiftLint, swiftly, tuist, embedded-examples (all executables/apps/demos); also TCA, dependencies, snapshot-testing (libraries); IceCubes only inside the workspace; 24 repos `.gitignore` it |
| H6 Linux common, Windows rare, static SDK only in CLIs | partly refuted | Linux 37/39; Windows 13/39 (6 of 11 core libs, 3 of 7 tools) is not rare; static-SDK 14/39 incl. libraries as compat legs; shipped static binaries are CLIs only |
| H7 agents fail on legacy idioms | corpus supports presence, not agent failure | Dispatch 719 / Combine 441 / `Task {` 920 / `Task.detached` 31 / `MainActor.run`+`assumeIsolated` 117 / `@unchecked Sendable` 552 / force `!` 3,364 / 5 tools<6.0 manifests exist in *exemplars*; but they are concentrated in a few repos (Alamofire 138 Dispatch/10k, element-x 40 Combine/10k, IceCubes 50 `Task {`/10k) and near-absent in oci group; failure of agents is not measured here |
| H8 default MainActor isolation only in apps | confirmed | `defaultIsolation` in 9 IceCubes packages, element-x compound-ios, plus a protobuf fixture and a tuist example; 0 of 38 library/tool roots; libraries instead use `NonisolatedNonsendingByDefault` (7 roots) and explicit `nonisolated(nonsending)` (51 uses) |

## Smells (ranked)

Ranking = prevalence x blast radius for code an agent would write by copying
the corpus; each carries counts and citations.

1. **Escape-hatch Sendable without a guard.** 139 `@unchecked Sendable` types have mutable state and no lock/atomic/queue visible (swift-build 81, foundation 19), e.g. `swift-build@2187330e13e7:Sources/SWBCore/ProjectModel/BuildPhase.swift:20`, `swift-foundation@aadd9259be07:Sources/FoundationEssentials/TimeZone/TimeZone_GMT.swift:13`; another 194 have only `let` state and could be plain `Sendable` if their members allowed. Copying "add @unchecked Sendable until it compiles" from swift-build propagates data races.
2. **Monolith types and files.** 131 prod files > 1,000 LOC; one 5k-line class (`swift-build@2187330e13e7:Sources/SWBCore/Settings/Settings.swift:1221`); `extension Formatter` mega-files in SwiftFormat; a 4.4k-line visitor (`swift-format@b15dd59fad21:Sources/SwiftFormat/PrettyPrint/TokenStreamCreator.swift:30`).
3. **Silent failure.** `try?` 2,231; 122 empty catches (IceCubes 59 of 177, e.g. `IceCubesApp@2ad6e6891258:Packages/Timeline/Sources/Timeline/actors/TimelineCache.swift:59`); 191 drop/return-only catches; 2,667 bare `catch {` that ignore the error value; only ~75 of 973 error types keep an underlying cause.
4. **Protocol-per-class with one conformer.** 427 pure single-prod-conformer protocols (39% of all protocols are single-conformer); tuist 111, element-x 112; paired with 240 mock-generated protocols. Cost: indirection and a macro/Sourcery dependency for no extension point.
5. **Force unwrap and IUO density in public-facing code.** 3,364 `!` (vapor 111/10k, JavaScriptKit 85, swift-crypto 78), 209 IUO decls, 378 `as!`, 620 `try!` (swift-crypto 61/10k). Most are table-lookups and constants; a formatter config disabling `NeverForceUnwrap` in 18 of 24 repos normalises them.
6. **Tools-version / language-mode drift.** Flagships sit on Swift 5 mode under tools 6.x (`swift-foundation@aadd9259be07:Package.swift:45`, `swift-package-manager@5546f44a3b52:Package.swift:1041`, `swift-syntax@be549876fe91:Package.swift:447`); 9 of 38 roots. Unguarded mutable statics are mostly in these repos (SwiftPM 24, SwiftFormat 7, swift-format 5) because Swift 5 mode lets them compile.
7. **Config/doc drift.** vapor README says 6.0+, manifest is 6.4 (`vapor@bf77fc69b142:README.md:24` vs `vapor@bf77fc69b142:Package.swift:2`); element-x `.swiftformat` pins 5.6 (`element-x-ios@14e33866ced2:.swiftformat:1`); hummingbird badge 6.1+ vs 6.2 manifest; swift-collections README table stops at 1.7.x. Formatter `swiftversion` and README badges lag the manifest.
8. **Legacy concurrency survives next to modern.** Dispatch 719, Combine 441 (element-x 40/10k), completion-handler params 397 (upper bound: 1 of 4 sampled was a synchronous callback), `@preconcurrency` 832, `Task {` 920 with only 284 cancellation checks overall, `Task.detached` 31.
9. **Duplicated manifest variants.** Alamofire carries five manifests differing only in copyright year and platform floors; async-algorithms two older sidecars; SwiftFormat/SwiftLint still at tools 5.7/5.9.
10. **`unsafeFlags` in published manifests.** swift-log applies `-require-explicit-sendable` unconditionally (`swift-log@4038b6a4f74a:Package.swift:71`); not a build blocker for consumers on swift 6.4 (fixture built clean), but it breaks the "no unsafeFlags in dependencies" convention on other tools versions (unverified).

## Patterns worth encoding

Each pattern is something the majority of the corpus does and agents get
wrong by default. Numbers are the evidence.

1. **Tools version >= 6.0 with Swift 6 language mode by default**; opt a named target down with `swiftLanguageModes` and a comment, never the whole package (25 of 38 roots pure; collections, container-plugin, TCA, swift-build opt down per-target).
2. **Shared per-target settings in a loop** appended to `swiftSettings` (swift-log `swift-log@4038b6a4f74a:Package.swift:55`-:73, service-lifecycle): ExistentialAny 15 repos, MemberImportVisibility 19, InternalImportsByDefault 11, NonisolatedNonsendingByDefault 7.
3. **Requirement style**: `from:` for libraries' deps (153 of 237 remote decls); `exact:` only in apps/tools that pin (tuist, IceCubes, element-x); `branch:` only in swiftlang's dual-mode `SWIFTCI_USE_LOCAL_DEPS` graph.
4. **Locks are `Mutex`/`Atomic` or a locked-box type, and `@unchecked Sendable` carries a reason**: `Mutex<` 176 decls in 14 repos, `NIOLockedValueBox` 59, `Atomic<` 45; 82 `@unchecked Sendable` types visibly guard their state (Alamofire `Alamofire@bda9ed57d729:Source/Core/Session.swift:30`, hummingbird HTTP2 manager).
5. **Typed throws: forward, don't invent.** Prefer `throws(E)` pass-through on closure-taking APIs (879 forwarded vs 433 concrete); concrete domain error enums where an API is closed (crypto, `Errno`, SwiftLint `Issue`).
6. **Errors are enums; wrap the cause.** 75% enum, 0% class; add `underlying:` where the error crosses a layer (7.7% do, so the pattern needs encoding, not copying).
7. **Swift Testing for new tests where the repo has it; keep XCTest where the harness needs it.** Newer swiftlang/Apple repos (swift-build 99%, foundation 97%, argument-parser 100%) and Nuke/SwiftLint/element-x moved wholesale; old suites stay XCTest. Argument-parser deprecates its own XCTest helpers in favour of Swift Testing (warning at `swift-argument-parser@efd239f0055b:Sources/ArgumentParserTestHelpers/TestHelpers.swift:56`).
8. **Actors for service state in daemons/CLIs; `@MainActor` for UI; default isolation only in app targets.** oci group: 40 actors, 1 `@unchecked Sendable`; app packages set `defaultIsolation` (9 IceCubes packages); libraries use `nonisolated(nonsending)` (51).
9. **Format and lint with the toolchain's `swift-format` in Swift-org repos**, line length 120 (15 of 24), indent 4 (16 of 24); SwiftLint only when the project wants custom rules (4 repos).
10. **Package.resolved: track for executables and apps, ignore for libraries** (10 root-tracked, 24 gitignored); the three pointfree libraries are the counter-example and the pinned versions there serve their Xcode workspaces.
11. **CI = one shared reusable workflow + nightly toolchain + platform legs**: 24 repos reuse swiftlang/github-workflows, 24 test nightly; Windows for core libs (6 of 11), Wasm 15, Android 11, static SDK 14 as compat checks.
12. **`package` access for cross-module-but-not-public API** (4,566 uses in 26 repos), `internal import` by default (420) with `public import` only where the type leaks (1,189).
13. **Traits and platform gating at manifest level**, not `#if` forests: log (7 traits), collections (3), vapor (4).

## Contradictions of the frame

1. **H1, second half**: "community libs ship 5.x tools" is false for the sampled community: Nuke tools 6.0, TCA/dependencies 6.4 in Swift 6 mode; the Swift 5 mode lives in swiftlang flagships (foundation, SwiftPM, swift-syntax, swift-format) - 9 of 38 roots are Swift 5 mode: foundation, SwiftPM, swift-syntax, swift-format, Alamofire, snapshot-testing, SwiftLint, SwiftFormat (all-5) plus tuist (mostly 5).
2. **H3**: the Apple-vs-community split does not exist; the axis is repo age. Six apple/swiftlang repos are >= 98% XCTest (crypto, protobuf, openapi-generator, collections, swift-syntax, sourcekit-lsp). Testing share overall is 45%, near parity, community 64% vs core 36% (opposite of H3).
3. **H5**: three libraries (TCA, dependencies, snapshot-testing) commit `Package.resolved` at the root.
4. **H6**: Windows CI in 13 of 39 CI repos (33%) and in 6 of 11 core libraries is not rare; static-SDK legs are in libraries as well as CLIs. Wasm (15) and Android (11) legs, unlisted in the frame, are as common as Windows.
5. **H4**: SwiftPM itself uses nicklockwood SwiftFormat (`.swiftformat`), not the bundled swift-format; swift-format is also the choice of server communities (vapor, hummingbird, grpc).
6. **H2**: `@unchecked Sendable` dominates *escape-hatch use*, but the largest cluster (194) has no mutable state and 91 are retroactive conformances of third-party types; "avoidable with Mutex/sending" is true for at most the 139 mutable-no-guard set, and nothing here proves even that.
7. **H7 mechanism**: the exemplars *contain* the supposedly-agent-failure idioms (Dispatch in 25 repos, Combine in 9, Task detached in 9). Presence in the corpus is not a failure signal; the density gap between groups (oci vs community) is.
8. **Frame's "approachable concurrency" as a package setting**: the manifest axis shows 0 `defaultIsolation` in library roots; approachability reaches the corpus via Xcode build settings (IceCubes pbxproj x10, element-x target.yml) and the upcoming-feature flags, not `Package.swift`.
9. **Fleet-has-no-Swift premise holds**, but the cleanest OCI-shaped Swift prior art (container, containerization, container-plugin) is also the cleanest on concurrency escape hatches - 1 `@unchecked Sendable` in 67k LOC.
10. **Smell candidate refuted by measurement**: swift-log's unconditional `unsafeFlags` did not block a versioned consumer on 6.4.

## Gaps

- No macOS or Xcode: SwiftUI, Xcode build settings, XCFrameworks and iOS runtime behaviour are read from pbxproj/yml text only. App findings (IceCubes, element-x) are textual.
- Regex + brace-stack scanners, no AST (SwiftSyntax not run): multi-line constructs, generics on separate lines, macro-expanded code and `#if`-split declarations are approximated. Force-unwrap estimated FN < 0.4%, other patterns' FN rates unmeasured.
- "Wraps underlying error", "guard seen in body" and the `@unchecked Sendable` category assignment are heuristics; the first and the category boundaries were not spot-read; avoidability of any hit was not tested by changing code.
- CI parse is regex over workflow YAML; it does not follow reusable-workflow calls into swiftlang/github-workflows, so Linux and sanitizer legs are under-counted; Windows/Android/Wasm "Y" means a named leg or enabled flag, not a green run.
- Builds cover 6 packages, debug only, one run per toolchain, no `-warnings-as-errors`, no release build, no tests run, no static-SDK/Wasm cross-build; timings are confounded by the engine change.
- Not measured: SwiftLint / swift-format findings against the exemplars (see `exemplar-quality-gates.md` for gate runs), binary size, compile-time, API-stability checks, DocC coverage, `Package.resolved` freshness.
- Generated detection by header is heuristic (8/10 clear in a sample); three repos (swift-protobuf, swift-syntax, tuist) remove 100-370k generated LOC; a misclassified hand file would shift per-10k by < 1% overall.
- `swift-embedded-examples` has 0 prod LOC (all `example`) and `rules_swift` 1.7k, so per-10k extremes sometimes name tiny repos; extreme lists also give the lowest among repos >= 5k LOC.
- Version attribution of features to Swift releases (6.0/6.1/6.2) is from memory of SE proposals, not measured; only tools-version values, CI images and compiler output are measured.

## Appendix A - classification and stripper

Stripper (`strip(src)`): blanks `//` and nested `/* */` comments, single-line,
raw (`#"..."#`) and multiline (`"""`) string contents, keeping newlines and
columns so line numbers stay exact. Interpolation contents are blanked too
(false negative for calls inside interpolations). LOC = non-blank lines of
stripped code. Hit line numbers are the 1-based line in the original file.

Classification (first match wins):
1. any directory `.build` -> excluded.
2. directory in {ThirdParty, third_party, Vendor, vendor, Vendored, Checkouts, Pods, Carthage, _Volatile, Submodules} -> vendored.
3. directory `*.docc` -> docs.
4. filename ends `.pb.swift`, `.grpc.swift`, `.generated.swift`, `.grpc.pb.swift`, `+Generated.swift`, or directory `generated`/`Generated`/`gyb_generated` -> generated.
5. first 40 lines match (case-insensitive) `do not edit|@generated|generated (by|from|using|with)|auto-?generated|automatically generated|this file is generated|code generated|machine generated`; on `///` lines only the strong phrases (`do not edit`, `auto-generated`, `automatically generated`, `this file is generated`, `@generated`) count -> generated.
6. directory in {Benchmarks, Benchmark, benchmarks} -> bench.
7. directory in {Fixtures, fixtures, TestData, Snapshots, CompileTests, FuzzTesting, FormatterFixtures, e2e, template, TestResources, TestFixtures} -> fixture.
8. directory matches `Tests?|tests?|*Tests|*TestCases|UITests|XCTests|*TestSupport|*TestUtilities|*TestUtils|*TestHelpers|*TestKit|Mocks` -> test.
9. directory in {Examples, Example, examples, example, Samples, PluginExamples, Demo, Demos, demo}, or any file in swift-embedded-examples -> example.
10. `Package.swift` / `Package@swift-*.swift` -> manifest.
11. directory `Integration` or filename `*Test(s).swift` -> test.
12. else prod.

Classification fixes made while measuring: `.docc` added as docs (TCA tutorial
snippets); `IntegrationTests` moved from fixture to test; `Resources` dropped
from fixtures; lowercase `test`/`tests` added; header window widened from 10
to 40 lines and made case-insensitive with `///` strong-phrase handling (this
fixed `ByteBuffer-multi-int.swift` and `sourcekitd_uids.swift`).

## Appendix B - pattern table and validation

Key regexes (run on stripped prod code; `(?m)` implied):

| key | regex |
|---|---|
| `unchecked_sendable` | `@unchecked[ \t]+Sendable` |
| `nonisolated_unsafe` | `nonisolated\(unsafe\)` |
| `mutex` | `\bMutex[ \t]*<\|\bSynchronization\b` |
| `locked_box` | `\b(?:NIOLockedValueBox\|LockedValueBox\|OSAllocatedUnfairLock\|NIOLock\|NSLock\|NSRecursiveLock\|pthread_mutex_t\|os_unfair_lock\|ReadWriteLock\|Lock)\b(?=[ \t]*[<(.\n]\|\s*$)` |
| `atomic` | `\bAtomic[ \t]*<\|\bManagedAtomic\b\|\bUnsafeAtomic\b` |
| `task_unstructured` | `(?<![\w.])Task(?:<[^>{]*>)?[ \t]*(?:\([^)\n{]*\)[ \t]*)?\{` |
| `task_detached` | `\bTask\.detached\b` |
| `dispatch` | `\bDispatch(?:Queue\|Group\|Semaphore\|WorkItem\|Source\|Time)\b` |
| `import_combine` | `(?m)^[ \t]*(?:@\w+[ \t]+)*import[ \t]+Combine\b` |
| `completion_handler` | `\b(?:completion\|completionHandler\|handler\|callback\|reply)[ \t]*:[ \t]*(?:@escaping[ \t]+\|@Sendable[ \t]+)*\(` |
| `observableobject` | `\bObservableObject\b` |
| `d_actor` | `(?m)^[ \t]*'+MOD+r'actor[ \t]+[A-Za-z_`]` |
| `typed_throws` | `(?<!re)\bthrows[ \t]*\([ \t]*(?:any\s+\|[A-Za-z_])[^)]*\)` |
| `some_total` | `(?<![.\w])some[ \t]+[A-Z~(\[]` |
| `any_total` | `(?<![.\w])any[ \t]+[A-Z~(\[]` |
| `noncopyable` | `~[ \t]*Copyable` |
| `nonescapable` | `~[ \t]*Escapable` |
| `internal_import` | `(?m)^[ \t]*(?:@\w+[ \t]+)*internal[ \t]+import\b` |
| `public_import` | `(?m)^[ \t]*(?:@\w+[ \t]+)*public[ \t]+import\b` |
| `package_access` | `(?m)^[ \t]*(?:@[\w.]+(?:\([^)\n]*\))?[ \t]+)*package[ \t]+(?:final[ \t]+\|static[ \t]+\|struct\b\|class\b\|enum\b\|func\b\|var\b\|let\b\|init\b\|protocol\b\|actor\b\|typealias\b\|extension\b\|subscript\b\|macro\b\|nonisolated\b\|mutating\b\|indirect\b\|override\b\|convenience\b\|required\b\|lazy\b\|associatedtype\b)` |
| `available_deprecated` | `@available\s*\([^)]*\bdeprecated\b` |
| `if_expr` | `(?m)(?:[=:][ \t]*\|\breturn[ \t]+\|\(\|,[ \t]*)(?:if\|switch)[ \t]+(?!let\b.*\bin\b)\S` |
| `try_bang` | `\btry!` |
| `as_bang` | `\bas!` |
| `implicit_unwrapped` | `(?:\b(?:var\|let)[ \t]+[\w`]+[ \t]*:[ \t]*[\w.<>\[\]?:, &()]*\|->[ \t]*[\w.<>\[\]?:, &()]*)(?<![!=])!(?![=!])` |
| `fatalError` | `\bfatalError\s*\(` |
| `precondition` | `(?<![\w.])precondition\s*\(` |
| `unowned_prop` | `\bunowned(?:\((?:unsafe\|safe)\))?[ \t]+(?:var\|let\|private\|fileprivate\|internal\|public)\b` |
| `weak_prop` | `\bweak[ \t]+(?:var\|let\|private\|fileprivate\|internal\|public\|open)\b` |
| `unsafe_ptr` | `\bUnsafe(?:Mutable)?(?:Raw)?(?:Buffer)?Pointer\b` |
| `with_unsafe` | `\bwithUnsafe\w*\b` |
| `unsafeBitCast` | `\bunsafeBitCast\b\|\bunsafeDowncast\b\|\bunsafeAddress\b` |
| `unsafe_expr` | `(?<![\w@.])unsafe[ \t]+(?:try\b\|await\b\|[a-zA-Z_(\[.])(?!\s*(?:func\|class\|struct\|enum\|var\|let)\b)` |
| `unsafe_attr` | `@unsafe\b` |
| `result_type` | `\bResult<` |
| `try_q` | `\btry\?` |

Force-unwrap heuristic (`fu.py`): postfix `!` after `[\w)\]}?>`]` and not followed
by `=`, excluding `try!`, `as!`, `is!`; IUO declarations (`: Type!`) counted
separately in `implicit_unwrapped`. Typed-throws classification parses
`throws(X)`: generic/forwarded if `X` is `*Failure`, `E`, `Err`, `ErrorType`, or a
single letter; `Never` and `any Error` separate; else concrete.

Validation (random hits, seeded, line read back from the original file; `val.py`):

| pattern | samples | false positives | note |
|---|--:|--:|---|
| force unwrap (`fu.py`) | 40 | 0 | earlier run; FN estimated < 0.4% |
| try!, as!, IUO decl, fatalError, precondition, assert | 4 each | 0 | |
| unowned/weak stored, `@unsafe`, `unsafe` expr, `Unsafe*Pointer` | 4 each | 0 | pointer count is type mentions |
| `withUnsafe*` | 4 | 0 | mixes declarations and call sites |
| `unsafeBitCast`/`unsafeDowncast`/`unsafeAddress` bundle | 4 | 2 | `unsafeAddress` accessor hits (40) are a different feature; report only the 98 cast hits |
| `Task {`, `nonisolated(unsafe)`, Dispatch*, actor decl, `Result<` | 4 each | 0 | |
| `Mutex<` / `Synchronization` bundle | 4 | 2 | the 2 were `import Synchronization`; by design; `Mutex<` alone is 176 |
| completion-handler params | 4 | 1 | swift-crypto `callback:` was synchronous; treat 397 as an upper bound |
| `internal import`, `public import`, `package` access, `@available(deprecated)` | 4 each | 0 | |
| `if`/`switch` expression | 12 | 1 | swift-syntax `advance(if range:` matched; ~8% FP |
| `@unchecked Sendable`, typed throws | 4 each | 0 | |
| header-based generated | 10 | 0 clear FP, 2 borderline | tuist `PlistsTemplate.swift`, element-x `LocationMarkerView.swift` |
| error "wraps underlying" | 0 | n/a | not validated |

Each sample is shown with `<repo>:<path>:<line>: <line text>` by `val.py`; the
spot-read confirmed the line text matched the pattern's intended construct.
