---
title: Swift exemplar corpus - packaging, resolution, plugins, release, platforms, CLI runtime, Bazel, SwiftPM tooling
agent: exemplar-packaging-and-release (research-lang swift, audit wave)
model: Sonnet 5.5 (claude-sonnet-5-5)
scope: 40 depth-1 blob-less clones under ~/.cache/research-lang/exemplars/swift/<owner>__<repo>; seven axes (resolution, plugins and macros, release engineering, platforms, CLI and I/O runtime, Bazel for Swift, running SwiftPM tooling). Toolchain: official swift:6.4 and swift:6.3 images via swift-tools/run.sh. No macOS, no Xcode.
date_researched: 2026-10-10
method: |
  Counting set: git ls-files per clone, then mklists.py splits each repo into prod / test / generated / excluded
  (totals: 18,886 files, 4,438 test, 427 generated, 4,468 dir-excluded, 9,537 prod, 16 missing).
  Source greps (axes 4, 5) run over the prod list only; manifest greps (axes 1, 2) over every Package.swift and
  Package@swift-X.swift outside Fixtures/Benchmarks/Examples/Tests; release and CI greps (axes 3, 6) over
  .github, Makefile, scripts/, Tools/, Dockerfile, *.bzl, BUILD*, MODULE.bazel, .bazelrc, .bazelci.
  Scripts (python3 -I, re-runnable, scratchpad, not committed): mklists.py, t1.py, ax2b.py (balanced-paren .package parser), ax2c.py,
  ax3b.py, ax4.py, ax4ci.py, ax5.py, frag.py, build_tables.py, spot.py REGEX N SEED.
  Experiments (every run `timeout 900`, scratch under swift-tools/build, fixtures under swift-tools/fixtures/exemplar-packaging-and-release):
    run.sh swift package describe --type json            (swift-log, swift-system, swift-argument-parser, swiftly)
    run.sh swift package show-dependencies --format json (swiftly)
    run.sh swift package diagnose-api-breaking-changes 1.15.0 (planted-break copy of swift-log, unfiltered clone)
    run.sh swift package resolve / swift build           (consumer-log, consumer-unsafe61, consumer-vtag)
    run.sh swift build -c release [--static-swift-stdlib] [--build-system native] [--swift-sdk x86_64-swift-linux-musl]  (hello-cli on 6.4 and 6.3)
    swift sdk install <static-linux-0.1.0 artifactbundle URL> --checksum <sha256>
  Citation form: <repo>@<sha12>:<path>:<line> (repo without owner prefix; sha12 from the table in the next field).
  Never run: swift package update, in-place swift format, swiftformat without --lint, swiftlint --fix.
exemplar_shas: |
  swift-log@4038b6a4f74a  swift-system@486d48c80fce  swift-argument-parser@efd239f0055b  swift-async-algorithms@cbde9aed744b
  swift-collections@935f696a549a  swift-crypto@1c80d3aff53f  swift-distributed-tracing@a5270bd1280a  swift-protobuf@6c84c3dedac0
  swift-openapi-generator@c4f943e14015  swift-foundation@aadd9259be07  swift-format@b15dd59fad21  swift-syntax@be549876fe91
  swift-testing@c7d68ca20cd7  swift-package-manager@5546f44a3b52  sourcekit-lsp@c6ce93d5f8aa  swiftly@c8cf2e35bfca
  swift-build@2187330e13e7  swift-nio@e12881f2a691  vapor@bf77fc69b142  hummingbird@1bd3b407fb47
  grpc-swift-2@ac33066eb6ed  swift-aws-lambda-runtime@8abd464310c7  async-http-client@017115279d09  swift-service-lifecycle@c55297914e26
  swift-composable-architecture@bc2db5ba8ad3  swift-dependencies@b476cc576105  swift-snapshot-testing@28e5de025e3f  Alamofire@bda9ed57d729
  Nuke@d5548dd61395  SwiftLint@ec4691d9e813  SwiftFormat@fbc07aca5373  tuist@2f6ac74754bf
  IceCubesApp@2ad6e6891258  element-x-ios@14e33866ced2  rules_swift@50450ed24dde  JavaScriptKit@c68ee9bdebfa
  swift-embedded-examples@119b29f83550  containerization@3e7bc39e66b3  container@f70ecbb926d9  swift-container-plugin@a9646b8d4dca
---

# Swift exemplar corpus: packaging, release, platforms, CLI runtime (2026-10-10)

## Table of contents

1. Headline numbers
2. Resolution (axis 1)
3. Plugins and macros (axis 2)
4. Release engineering (axis 3)
5. Platforms (axis 4)
6. CLI and I/O runtime (axis 5)
7. Bazel for Swift (axis 6)
8. Running SwiftPM tooling (axis 7)
9. Hypotheses tested (H1, H5, H6, H8; H2, H3, H4, H7 flagged)
10. Smells (ranked)
11. Patterns worth encoding
12. Contradictions of the frame
13. Gaps

Version flags: `[6.4]` = measured on swift:6.4 (6.4.0); `[>=6.2]` = depends on tools-version or toolchain 6.2+; unflagged claims are version-independent. "Prod" means the filtered counting set above, which still leaks some test-helper modules (see spot reads).

## Headline numbers

| # | number | where |
|---|---|---|
| 1 | 35 of 38 manifest repos declare tools-version 6.x (6.0: 6, 6.1: 6, 6.2: 16, 6.3: 2, 6.4: 5); 3 are 5.x (SwiftFormat 5.7, SwiftLint 5.9, swift-syntax 5.9); 2 repos have no manifest (IceCubesApp is Xcode-only, rules_swift is Bazel) | Resolution T1 |
| 2 | Root Package.resolved: 10 tracked, 23 gitignored, 7 absent. 3 of the 10 trackers are libraries (TCA, swift-dependencies, swift-snapshot-testing); 6 swiftlang/apple executable-or-tool repos ignore it | Resolution T1 |
| 3 | 436 `.package(` declarations: 192 `from:` (44% of all, 70% of 275 URL deps), 99 `path:`, 62 registry `id:` (tuist only), 33 `branch:` (all in swiftlang repos plus 2 app deps), 20 `exact:`, 16 ranges, 8 `upToNextMinor`, 6 `revision:` (SwiftPM only) | Resolution |
| 4 | 24 plugin declarations in 11 repos: 18 command, 6 build-tool; 13 permission clauses in 10 repos; 13 macro targets in 9 repos; 1 `binaryTarget` in the whole corpus (SwiftLint) | Plugins T2 |
| 5 | 13 repos depend on swift-syntax with 5 requirement strategies: range (TCA, swift-dependencies, snapshot-testing `509.0.0..<605.0.0`; JavaScriptKit `600..<604`), `from` (element-x-ios, vapor, SwiftPM template), `exact` prerelease (SwiftLint), `branch` (swift-foundation, swift-format, sourcekit-lsp, SwiftPM), `from: 605.0.0-latest` (swift-testing); `canImport(SwiftSyntaxNNN)` guards in 4 repos (18 lines) | Plugins |
| 6 | 20 of 40 repos have a CI/release file mentioning static Linux SDK / musl / static stdlib, but only 4 CLI release pipelines ship it (SwiftLint, SwiftFormat, swiftly, tuist); the other 16 repos use it as a compile or build leg | Release T3 |
| 7 | 22 repos call `swiftlang/github-workflows` (57 tag-pinned refs, 8 at `@main`); 12 call `apple/swift-nio` reusable workflows (116 refs, 100% `@main`) | Release |
| 8 | Platform references in 9,537 prod files: `os(Windows)` 914 (26 repos), `canImport(Darwin)` 577 (25), `os(macOS)` 560 (23), `compiler(>=` 501 (24), `hasFeature(` 430 (7), `canImport(FoundationEssentials)` 415 (13), `os(Linux)` 319 (19), `os(Android)` 169 (13) | Platforms T4 |
| 9 | `import Foundation` 3,824 files (34 repos) vs `import FoundationEssentials` 388 files (12 repos, 9.2% of the two) | Platforms |
| 10 | 18 CLI-shaped repos, 5,149 prod files: `ExitCode` 113, `exit(` 50, stderr writes 48, `print(` 741, `fatalError(` 596, `try!` 450, `import Logging` 170 | CLI T5A |
| 11 | Subprocess strategy: `Process()` 50 in 16 repos, `import Subprocess` 14 files in 3 repos (swiftly 10), `posix_spawn` 85 in 6 repos (SwiftPM 49) | CLI T5B |
| 12 | Bazel files in 5 repos (rules_swift, SwiftLint, tuist/swifterpm, swift-syntax, swift-protobuf); only rules_swift declares a hermetic `swift.toolchain` (`swift_version = "6.4.0"`) | Bazel |
| 13 | `[6.4]` `--static-swift-stdlib` with the default swiftbuild system fails to link a Foundation CLI (undefined `_MutexHandle`); `--build-system native` or the static Linux SDK links. 5 repos pin `--build-system native` | Experiments |
| 14 | `[>=6.2]` unsafeFlags rule: a 1-line tools-version diff (6.1 vs 6.2) flips a consumer build from error to success | Experiments |

## Resolution (axis 1)

Command (T1): `git ls-files | grep Package.resolved` per clone; `.gitignore` line search `^/?Package\.resolved\s*$`; JSON read of `version`, `pins`, `originHash`; requirement kinds from ax2b.py (balanced-paren parse of every `.package(url|path|id:`, comments stripped with `(?<!:)//`). Manifests counted: 38 repos; production manifests exclude Fixtures/Examples/Benchmarks.

| repo | shape | sha12 | tools | root Package.resolved | ignore line | nested/Xcode-managed tracked | requirements (count by kind) |
|---|---|---|---|---|---|---|---|
| IceCubesApp | app | 2ad6e6891258 | none | absent | - | 0/1 | from7 exact3 branch1 path48 |
| element-x-ios | app | 14e33866ced2 | 6.2 | tracked v3, 7 pins | - | 2/2 | from1 upToNextMinor5 exact4 branch1 path1 |
| Alamofire | community | bda9ed57d729 | 6.4 | absent | - | 0/0 | - |
| Nuke | community | d5548dd61395 | 6.0 | absent | - | 0/0 | - |
| swift-composable-architecture | community | bc2db5ba8ad3 | 6.4 | tracked v3, 17 pins | - | 1/3 | from24 range6 |
| swift-dependencies | community | b476cc576105 | 6.4 | tracked v3, 11 pins | - | 0/2 | from18 range3 |
| swift-snapshot-testing | community | 28e5de025e3f | 6.0 | tracked v3, 3 pins | - | 0/0 | from2 range2 |
| swift-argument-parser | core | efd239f0055b | 6.0 | ignored | .gitignore:10 | 0/0 | - |
| swift-async-algorithms | core | cbde9aed744b | 6.2 | ignored | .gitignore:11 | 0/0 | from4 path2 |
| swift-collections | core | 935f696a549a | 6.4 | absent | - | 1/1 | - |
| swift-crypto | core | 1c80d3aff53f | 6.2 | ignored | .gitignore:10 | 0/0 | from1 path1 |
| swift-distributed-tracing | core | a5270bd1280a | 6.2 | ignored | .gitignore:8 | 1/0 | from1 |
| swift-log | core | 4038b6a4f74a | 6.2 | ignored | .gitignore:2 | 0/0 | - |
| swift-openapi-generator | core | c4f943e14015 | 6.2 | ignored | .gitignore:9 | 0/0 | from5 range1 |
| swift-protobuf | core | 6c84c3dedac0 | 6.2 | ignored | .gitignore:15 | 0/0 | path1 |
| swift-system | core | 486d48c80fce | 6.1 | absent | - | 0/0 | - |
| swift-foundation | core | aadd9259be07 | 6.2 | ignored | .gitignore:13 | 0/0 | exact1 branch2 path3 |
| container | oci | f70ecbb926d9 | 6.2 | tracked v3, 35 pins | - | 0/0 | from15 exact1 |
| containerization | oci | 3e7bc39e66b3 | 6.2 | tracked v3, 30 pins | - | 3/0 | from16 range1 exact1 path1 |
| swift-container-plugin | oci | a9646b8d4dca | 6.0 | ignored | .gitignore:9 | 0/0 | from3 range1 |
| rules_swift | platform | 50450ed24dde | none | absent | - | 0/0 | - |
| swift-embedded-examples | platform | 119b29f83550 | 6.0 | tracked v3, 2 pins | - | 10/0 | from2 branch10 |
| JavaScriptKit | platform | c68ee9bdebfa | 6.2 | ignored | .gitignore:12 | 1/0 | from2 range1 |
| swift-nio | server | e12881f2a691 | 6.1 | ignored | .gitignore:10 | 0/0 | from4 path3 |
| grpc-swift-2 | server | ac33066eb6ed | 6.1 | ignored | .gitignore:23 | 0/0 | from3 path1 |
| hummingbird | server | 1bd3b407fb47 | 6.2 | ignored | .gitignore:10 | 0/0 | from16 |
| async-http-client | server | 017115279d09 | 6.2 | ignored | .gitignore:2 | 0/0 | from11 |
| swift-aws-lambda-runtime | server | 8abd464310c7 | 6.2 | ignored | .gitignore:10 | 0/0 | from5 |
| swift-service-lifecycle | server | c55297914e26 | 6.1 | ignored | .gitignore:7 | 0/0 | from2 |
| vapor | server | bf77fc69b142 | 6.4 | ignored | .gitignore:7 | 0/0 | from20 upToNextMinor1 range1 exact1 path1 |
| SwiftFormat | tool-community | fbc07aca5373 | 5.7 | absent | - | 0/0 | - |
| SwiftLint | tool-community | ec4691d9e813 | 5.9 | tracked v2, 9 pins, no originHash | - | 0/0 | from6 upToNextMinor1 exact1 |
| tuist | tool-community | 2f6ac74754bf | 6.1 | tracked v3, 84 pins | - | 47/1 | from1 upToNextMinor1 exact6 id62 path2 |
| sourcekit-lsp | tool-swiftlang | c6ce93d5f8aa | 6.3 | ignored | .gitignore:3 | 0/0 | from2 branch9 path10 |
| swift-build | tool-swiftlang | 2187330e13e7 | 6.2 | ignored | .gitignore:37 | 0/0 | from2 branch3 path5 |
| swift-format | tool-swiftlang | b15dd59fad21 | 6.0 | ignored | .gitignore:5 | 0/0 | from2 branch1 path3 |
| swift-package-manager | tool-swiftlang | 5546f44a3b52 | 6.1 | ignored | .gitignore:18 | 0/0 | from2 branch6 revision6 path12 |
| swift-syntax | tool-swiftlang | be549876fe91 | 5.9 | ignored | .gitignore:24 | 0/0 | from4 path3 |
| swift-testing | tool-swiftlang | c7d68ca20cd7 | 6.3 | ignored | .gitignore:15 | 0/0 | from2 path2 |
| swiftly | tool-swiftlang | c8cf2e35bfca | 6.2 | tracked v3, 32 pins | - | 0/0 | from9 exact2 |
| **corpus** | 40 | | 6.x 35, 5.x 3, none 2 | tracked 10, ignored 23, absent 7 | | | from 192 upToNextMinor 8 range 16 exact 20 branch 33 revision 6 id 62 path 99 |

Reading, extremes, and conflicts:

- Largest lockfile tuist@2f6ac74754bf:Package.resolved (v3, 84 pins) plus 47 nested tracked lockfiles; smallest swift-embedded-examples@119b29f83550:Package.resolved (2 pins) plus 10 nested. SwiftLint is the only v2 file and has no `originHash` (SwiftLint@ec4691d9e813:Package.resolved); the other 9 are v3 with `originHash`.
- Docs versus config: swift-argument-parser, swift-log, swift-nio and 20 other repos ignore the lockfile (`swift-log@4038b6a4f74a:.gitignore:2`); the authoritative practice is the `.gitignore` line, which I measured; I did not search READMEs for a stated policy.
- Disagreement inside one repo: element-x-ios tracks 5 lockfiles (root, Components/BuildExtensions, compound-ios, plus two Xcode-managed `xcshareddata/swiftpm/Package.resolved`) so one app has 5 resolution roots. IceCubesApp tracks only the Xcode-managed one.
- Reproducibility flag: tuist CI runs `tuist install --force-resolved-versions` and `swift build ... --force-resolved-versions` (`tuist@2f6ac74754bf:.github/workflows/cli.yml:121,158,162`), so a tracked lockfile is enforced there; no other exemplar uses `--force-resolved-versions`.
- Registry: tuist is the only registry consumer (62 parsed `.package(id:` entries, 69 raw lines, 44 in the root manifest, e.g. `tuist@2f6ac74754bf:Package.swift:1971`), and CI uses `swift package resolve --replace-scm-with-registry` (`cli.yml:160`). No other exemplar declares a registry dependency.
- `branch:` is a swiftlang-internal idiom: sourcekit-lsp 9, embedded-examples 10, SwiftPM 6 (+6 `revision:`), swift-build 3, swift-foundation 2, swift-format 1. The shape is a `relatedDependenciesBranch` constant plus an env switch `SWIFTCI_USE_LOCAL_DEPS` that swaps URLs for `path:` (`swift-package-manager@5546f44a3b52:Package.swift:1133,1152`). SwiftPM refuses `branch:` dependencies from a package that is itself consumed by version (SwiftPM rule, not re-measured here), so this idiom marks tool repos, never libraries.
- `exact:` clusters in tuist 13, element-x-ios 4, IceCubesApp 3, swiftly 2, plus SwiftLint's swift-syntax prerelease (`SwiftLint@ec4691d9e813:Package.swift:39`); the T1 total row splits URL (20) from registry (7) exacts.
- Tag handling `[6.4]` (measured): a `v1.16.3` tag on a fixture git repo resolved as version 1.16.3 with the Package.resolved pin `"version" : "1.16.3"` (consumer-vtag). Source agrees: `swift-package-manager@5546f44a3b52:Sources/Basics/Version+Extensions.swift:19-25` strips a leading `v`; when both `v1.0.0` and `1.0.0` exist the unprefixed tag wins (`Sources/Workspace/PackageContainer/SourceControlPackageContainer.swift:138-147`). Fixture tags on swift-log (1.15.0, 1.16.1, 1.16.2) are plain semver; exemplar clones are depth-1 with no tag list, so tag style across the 40 is unmeasured (Gaps).

Corpus totals: lockfile tracked 10 / ignored 23 / absent 7 (see last row). Spot-read false-positive rate for the "tracked lockfile" classification: 0 of 3 (swiftly, container, TCA files opened and parsed). For the `.gitignore` match: 0 of 3 (swift-log:2, swift-nio:10, vapor:7 are exact `Package.resolved` lines).

## Plugins and macros (axis 2)

Command (T2): ax2c.py. Plugin declaration = `.plugin(` whose next 500 chars contain `capability:`; `build` = `.buildTool`/`.prebuildTool`, `cmd` = `.command`. Macro = `.macro(name:`. Permission = `.writeToPackageDirectory(` or `.allowNetworkConnections(`. First pass counted every `.plugin(` token (usage sites included) and overstated declarations roughly 2x (spot: 3 of 3 `plugins: [.plugin(name:package:)]` usages were not declarations); T2 uses the capability filter.

| repo | shape | plugin decls (build/cmd) | permission clauses | macro targets | swift-syntax requirement | unsafeFlags | .trait decls | binaryTarget |
|---|---|---|---|---|---|---|---|---|
| element-x-ios | app | 0 (0b/0c) | 0 | 1 | from: "604.0.0" | 0 | 0 | 0 |
| swift-composable-architecture | community | 0 (0b/0c) | 0 | 2 | "509.0.0"..<"605.0.0" | 0 | 4 | 0 |
| swift-dependencies | community | 0 (0b/0c) | 0 | 3 | "509.0.0"..<"605.0.0"; "600.0.0"..<"605.0.0" | 0 | 0 | 0 |
| swift-snapshot-testing | community | 0 (0b/0c) | 0 | 0 | "509.0.0"..<"605.0.0" | 0 | 0 | 0 |
| swift-argument-parser | core | 2 (0b/2c) | 1 | 0 | - | 0 | 0 | 0 |
| swift-async-algorithms | core | 0 (0b/0c) | 0 | 0 | - | 0 | 2 | 0 |
| swift-collections | core | 0 (0b/0c) | 0 | 0 | - | 0 | 6 | 0 |
| swift-log | core | 0 (0b/0c) | 0 | 0 | - | 1 | 7 | 0 |
| swift-openapi-generator | core | 2 (1b/1c) | 1 | 0 | - | 0 | 0 | 0 |
| swift-protobuf | core | 2 (2b/0c) | 0 | 0 | - | 0 | 4 | 0 |
| swift-system | core | 0 (0b/0c) | 0 | 0 | - | 1 | 0 | 0 |
| swift-foundation | core | 0 (0b/0c) | 0 | 1 | branch: "main" | 1 | 0 | 0 |
| containerization | oci | 0 (0b/0c) | 0 | 0 | - | 1 | 0 | 0 |
| swift-container-plugin | oci | 1 (0b/1c) | 1 | 0 | - | 0 | 0 | 0 |
| swift-embedded-examples | platform | 0 (0b/0c) | 0 | 0 | - | 1 | 0 | 0 |
| JavaScriptKit | platform | 3 (1b/2c) | 1 | 2 | "600.0.0"..<"604.0.0"; from: Version(swiftSyntaxVersion | 5 | 0 | 0 |
| hummingbird | server | 0 (0b/0c) | 0 | 0 | - | 0 | 2 | 0 |
| async-http-client | server | 0 (0b/0c) | 0 | 0 | - | 1 | 1 | 0 |
| swift-aws-lambda-runtime | server | 3 (0b/3c) | 3 | 0 | - | 0 | 0 | 0 |
| vapor | server | 0 (0b/0c) | 0 | 1 | from: "602.0.0" | 0 | 4 | 0 |
| SwiftFormat | tool-community | 1 (0b/1c) | 1 | 0 | - | 0 | 0 | 0 |
| SwiftLint | tool-community | 2 (1b/1c) | 1 | 1 | exact: "605.0.0-prerelease-2026-09-15" | 0 | 0 | 1 |
| sourcekit-lsp | tool-swiftlang | 0 (0b/0c) | 0 | 0 | branch: relatedDependenciesBranch | 8 | 0 | 0 |
| swift-build | tool-swiftlang | 4 (0b/4c) | 0 | 0 | - | 0 | 0 | 0 |
| swift-format | tool-swiftlang | 2 (0b/2c) | 1 | 0 | branch: "main" | 1 | 0 | 0 |
| swift-package-manager | tool-swiftlang | 0 (0b/0c) | 2 | 1 | branch: relatedDependenciesBranch; from: "\#(self.installedSwiftPMConf | 11 | 0 | 0 |
| swift-syntax | tool-swiftlang | 0 (0b/0c) | 0 | 0 | from: "510.0.0" | 0 | 0 | 0 |
| swift-testing | tool-swiftlang | 0 (0b/0c) | 0 | 1 | from: "605.0.0-latest" | 5 | 0 | 0 |
| swiftly | tool-swiftlang | 2 (1b/1c) | 1 | 0 | - | 0 | 0 | 0 |
| **corpus (repos with hit)** | | 24 (6b/18c) in 11 | 13 in 10 | 13 in 9 | | 36 in 11 | 30 in 8 | 1 in 1 |

- Command plugins dominate 3:1 (18 vs 6). The 6 build-tool plugins: swift-openapi-generator, swift-protobuf x2, JavaScriptKit, SwiftLint, swiftly. Every command plugin that writes asks `.writeToPackageDirectory(reason:)` (e.g. `swift-format@b15dd59fad21:Package.swift:69-70`, `SwiftLint@ec4691d9e813:Package.swift:87`); the 4 network-permission plugins are swift-aws-lambda-runtime x2 (`Package.swift:116,135`) and swift-container-plugin (`Package.swift:71`), each needing network.
- Macro versioning, three policies in the corpus:
  1. Wide range plus `canImport` ladder: TCA, swift-dependencies, snapshot-testing declare `"509.0.0"..<"605.0.0"` (`swift-composable-architecture@bc2db5ba8ad3:Package.swift:52`) and branch on marker modules, e.g. `#if canImport(SwiftSyntax600)` at `Sources/ComposableArchitectureMacros/Extensions.swift:290` and `#if canImport(SwiftSyntax602)` at `swift-dependencies@b476cc576105:Sources/DependenciesMacrosPlugin/DependencyClientMacro.swift:76`. The mechanism is documented in `swift-syntax@be549876fe91:Sources/SwiftSyntax/Documentation.docc/Macro Versioning.md:24` and implemented as empty `SwiftSyntax509`...`SwiftSyntax605` targets (`Package.swift:234-235`). swift-dependencies also ships a per-toolchain manifest `Package@swift-6.0.swift` with a narrower `600.0.0..<605.0.0` (`Package@swift-6.0.swift:33`).
  2. Narrow floor: `from:` (element-x-ios `from: "604.0.0"`, vapor `from: "602.0.0"` at `vapor@bf77fc69b142:Package.swift:100`). Any consumer that also pins a different major gets an unsatisfiable graph.
  3. Exact prerelease pin: SwiftLint `exact: "605.0.0-prerelease-2026-09-15"` (`SwiftLint@ec4691d9e813:Package.swift:39`); swift-testing `from: "605.0.0-latest"` (`swift-testing@c7d68ca20cd7:Package.swift:140`); swift-format and swift-foundation `branch: "main"` (`swift-format@b15dd59fad21:Package.swift:207`). Prerelease and branch resolutions carry no release version, and SwiftPM's prebuilt swift-syntax is looked up by the resolved package version (`swift-package-manager@5546f44a3b52:Sources/Workspace/Workspace+Prebuilts.swift:554`; prebuilts default on, `Sources/CoreCommands/Options.swift:220-223`), so I infer, without having run it, that a prerelease pin cannot use the prebuilt and pays a full swift-syntax compile. [6.4, inference]
- unsafeFlags `[>=6.2]`: 36 occurrences in 11 repos. Real uses are narrow (`-require-explicit-sendable` in `swift-log@4038b6a4f74a:Package.swift:71`; `-require-explicit-availability=error` in `swift-system@486d48c80fce:Package.swift:71`; `-fno-modules` in `containerization@3e7bc39e66b3:Package.swift:179`). The dependency check is skipped for tools-version >= 6.2 (`swift-package-manager@5546f44a3b52:Sources/PackageLoading/PackageBuilder.swift:1073-1074`); I confirmed it by experiment in Experiments below.
- Traits: 30 `.trait(` declarations in 8 repos (swift-log 7, swift-collections 6, TCA 4, vapor 4, swift-protobuf 4, hummingbird 2, async-algorithms 2, ahc 1). swift-log uses traits to compile out log levels (`swift-log@4038b6a4f74a:Package.swift:11-22`).
- Spot-read false-positive rate: plugin-declaration filter 0 of 3 (swiftly, SwiftLint, swift-format opened); unsafeFlags 0 of 3 (swift-log:71, swift-system:71, containerization:179 are real settings); macro `.macro(` 0 of 3 (swift-dependencies@b476cc576105:Package.swift:95, swift-testing@c7d68ca20cd7:Package.swift:202, vapor@bf77fc69b142:Package.swift:143).

## Release engineering (axis 3)

Command (T3): ax3b.py over CI and release files (regex per column in the table header comment below); `#` comment lines stripped; counts are files with at least one match. Patterns: static = `swift-sdk-static|static-linux|static_sdk|static-sdk|-musl\b|with_musl|musl-clang|--static-swift-stdlib|-static-executable|static-stdlib`; universal = `--arch arm64 --arch x86_64|lipo|universal_[a-z]+|Universal macOS`; provenance = `attest-build-provenance|slsa|cosign|sigstore|sbom|cyclonedx`; brew-bump = `bump-formula|bump-packages|brew bump|homebrew-core`. Earlier broader patterns were measured and rejected: bare `universal` (6 of 10 repo hits false: CMake tarball name, SVD text), `brew (install|tap)` (3 of 5 sampled hits are build-dependency installs), `sbom|spdx` (7 of 10 hits were SPDX license headers), `\.rb` (Ruby files).

| repo | shape | static | universal | artifactbundle | xcframework | notarize | codesign | provenance | brew-bump | gh-release | BCR | image-push |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| IceCubesApp | app | . | . | . | . | . | . | . | . | . | . | . |
| element-x-ios | app | . | . | . | 1 | . | . | . | 1 | . | . | . |
| Alamofire | community | . | . | . | . | . | . | . | . | . | . | . |
| Nuke | community | . | . | . | 1 | . | . | . | . | . | . | . |
| swift-composable-architecture | community | . | . | . | . | . | . | . | . | . | . | . |
| swift-dependencies | community | 1 | . | . | . | . | . | . | . | . | . | . |
| swift-snapshot-testing | community | . | . | . | . | . | . | . | . | . | . | . |
| swift-argument-parser | core | . | . | . | . | . | . | . | . | . | . | . |
| swift-async-algorithms | core | . | . | . | . | . | . | . | . | . | . | . |
| swift-collections | core | . | . | . | . | . | . | . | . | . | . | . |
| swift-crypto | core | 2 | . | 1 | . | . | . | . | . | . | . | . |
| swift-distributed-tracing | core | . | . | . | . | . | . | . | . | . | . | . |
| swift-log | core | 2 | . | . | . | . | . | . | . | . | . | . |
| swift-openapi-generator | core | . | . | . | . | . | . | . | . | . | . | . |
| swift-protobuf | core | . | . | . | . | . | . | . | . | . | . | . |
| swift-system | core | 1 | . | . | . | . | . | . | . | . | . | . |
| swift-foundation | core | . | . | . | . | . | . | . | . | . | . | . |
| container | oci | . | . | . | . | . | 1 | . | . | 1 | . | . |
| containerization | oci | 5 | . | 2 | . | . | 1 | . | . | 1 | . | 1 |
| swift-container-plugin | oci | 4 | . | 2 | . | . | . | . | . | . | . | . |
| rules_swift | platform | 1 | 8 | 3 | . | . | . | . | . | 1 | 1 | . |
| swift-embedded-examples | platform | . | . | . | . | . | . | . | . | . | . | . |
| JavaScriptKit | platform | . | . | . | . | . | . | . | . | . | . | . |
| swift-nio | server | 4 | . | 2 | . | . | . | . | . | . | . | . |
| grpc-swift-2 | server | 2 | . | . | . | . | . | . | . | . | . | . |
| hummingbird | server | . | . | . | . | . | . | 1 | . | . | . | . |
| async-http-client | server | 2 | . | . | . | . | . | . | . | . | . | . |
| swift-aws-lambda-runtime | server | 1 | . | . | . | . | . | . | . | . | . | . |
| swift-service-lifecycle | server | 2 | . | . | . | . | . | . | . | . | . | . |
| vapor | server | 1 | . | . | . | . | . | . | . | . | . | . |
| SwiftFormat | tool-community | 3 | 1 | 3 | . | 1 | 1 | . | . | 1 | . | 2 |
| SwiftLint | tool-community | 2 | 3 | 4 | . | . | . | . | 2 | 2 | 1 | 1 |
| tuist | tool-community | 11 | 1 | 1 | 5 | 3 | 5 | 4 | . | 16 | . | 28 |
| sourcekit-lsp | tool-swiftlang | . | . | . | . | . | . | . | . | . | . | . |
| swift-build | tool-swiftlang | 1 | . | . | . | . | . | . | . | . | . | . |
| swift-format | tool-swiftlang | . | . | . | . | . | . | . | . | 1 | . | . |
| swift-package-manager | tool-swiftlang | 1 | . | . | . | . | . | . | . | . | . | . |
| swift-syntax | tool-swiftlang | . | . | . | . | . | . | . | . | 1 | . | . |
| swift-testing | tool-swiftlang | 3 | . | . | . | . | . | . | . | . | . | . |
| swiftly | tool-swiftlang | 2 | . | 1 | . | . | . | . | . | . | . | . |
| **repos with >=1 file hit** | 40 | 20 | 4 | 9 | 3 | 2 | 4 | 2 | 2 | 8 | 2 | 4 |

Release pipelines by hand (verified by reading; table counts are keyword census only):

| repo | linux artifact | macOS artifact | version source | publish |
|---|---|---|---|---|
| SwiftLint | static musl, x86_64 and arm64 matrix (`SwiftLint@ec4691d9e813:.github/workflows/release.yml:122-186`) | Bazel `universal_swiftlint` (`release.yml:188-207`, `Makefile:79`) | `sed` of `tools/Version.swift.template` into `Version.swift`, plus `MODULE.bazel` line 3 and the podspec (`release.yml:51-55`) | GitHub release, `SwiftLintBinary.artifactbundle.zip` consumed by a `binaryTarget` with URL + checksum (`Package.swift:259-267`), Homebrew formula bump (`Makefile:161-162`), Windows installer job (`release.yml:209-288`) |
| SwiftFormat | musl via `--swift-sdk "${ARCH}-swift-linux-musl"` (`SwiftFormat@fbc07aca5373:Scripts/build-linux-release.sh:26`) | two `--arch` builds + `lipo -create` (`.github/workflows/release.yml:14-21`) | `sed -i` of `let swiftFormatVersion = "..."` from the tag (`release.yml:12-13`; constant at `Sources/SwiftFormat.swift:35`) | GitHub release, artifactbundle, notarytool |
| swiftly | static SDK downloaded with sha256 check and built with a repo-local `musl-clang` (`swiftly@c8cf2e35bfca:Tools/build-swiftly-release/BuildSwiftlyRelease.swift:212-283`) | universal build in the same tool (~:326) | constant `SwiftlyVersion(... suffix: "dev")` in source (`Sources/SwiftlyCore/SwiftlyCore.swift:5`), so source builds are always `-dev` | GitHub release |
| tuist | static SDK pinned by URL + `--checksum` (`tuist@2f6ac74754bf:mise/tasks/cli/bundle-linux.sh:25-64`) | `mise/tasks/cli/bundle.sh`, codesign + notarize (5 + 3 files) | not traced | GitHub release (16 files), attest-build-provenance on one workflow |
| container | none (macOS only) | `codesign` per binary, then `pkgbuild` installer (`container@f70ecbb926d9:Makefile:175-189`) | `git describe --tags --always` -> env `RELEASE_VERSION` -> manifest `.define("RELEASE_VERSION", ...)` (`Makefile:26`, `Package.swift:23-24,616-617`) | GitHub release |
| rules_swift | none | none | tag input | `gh release create` + BCR `publish-to-bcr` (`rules_swift@50450ed24dde:.github/workflows/create-release.yml`) |

- Three stamping patterns in the traced pipelines: sed into source (SwiftLint, SwiftFormat), env -> manifest -> C define (container, fed by `git describe`), hand-edited constant with `dev` suffix (swiftly). swift-log, swift-system and swift-argument-parser have no release workflow in the clone (T3 gh-release column), so for libraries the version is the git tag only.
- Supply chain is thin: attest/cosign/sbom keywords match 2 repos (tuist's `actions/attest-build-provenance` is in the Grafana datasource workflow, `grafana-datasource-release.yml:120`, not the CLI; hummingbird has `sbom-generator.yml`). `codesign`/`notarytool` (macOS only) match 4 and 2 repos; no step matched for signing a Linux artifact. `checksum` appears in `swift sdk install` lines (tuist, swiftly) and in the `binaryTarget` (SwiftLint).
- Reusable CI is the dominant release-adjacent convention: 22 repos reference `swiftlang/github-workflows` (57 tag-pinned `0.0.13`-`0.0.15`, 8 at `@main`), 12 reference `apple/swift-nio/.github/workflows/*` (116 refs, all `@main`; files `static_sdk.yml`, `wasm_swift_sdk.yml`, `android_swift_sdk.yml`, `release_builds.yml`, `cxx_interop.yml`, `unit_tests.yml` in `swift-nio@e12881f2a691:.github/workflows/`). So 12 repos run another repo's mutable branch in CI.
- Version drift: tuist's script pins Swift 6.2.3 and SDK bundle `static-linux-0.0.1` (`bundle-linux.sh:25-26`), while the 6.4.0 bundle I installed is `swift-6.4.0-RELEASE_static-linux-0.1.0` (fixture `sdkroot/`); the script's `--checksum` pins behaviour, not any doc.
- Spot-read false-positive rate: static column 0 of 5 false (vapor `.github/workflows/test.yml:47` `with_musl: true`, ahc `pull_request.yml:32`, swift-testing `main_using_release.yml:22`, containerization `Makefile:179`, nio `main.yml:70` all real CI use); brew-bump 3 of 5 sampled hits false before tightening (SwiftLint `Makefile:162` real; lambda README, element-x `brew install sourcery`, hummingbird template CLI not release), not re-sampled after; version-stamp pattern (`sed -i ...version`) 3 of 5 false (tuist: helm chart, `BUILD.bazel`, `mix.exs` for non-Swift components), so that column was dropped from T3.

## Platforms (axis 4)

Commands: ax4.py regexes over the prod list, e.g. `os\(Windows\)`, `canImport\(Glibc\)`, `canImport\(FoundationEssentials\)`, `hasFeature\(`, `compiler\(>=`; `import Foundation|FoundationEssentials|FoundationNetworking`; per-repo columns T4, per-shape totals T4s, CI census T6 (ax4ci.py, keywords over workflow text with `: false` lines and `#` comments removed). Counts are references, not support: `#if !os(Windows)` counts as an `os(Windows)` reference (and `#if !os(` appears 537 times in 21 repos).

| repo | shape | prod .swift | Lnx | Win | mac | And | WASI | Darw | Glibc | Musl | cI:FE | cI:FN | hasF | cmp>= |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| IceCubesApp | app | 407 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| element-x-ios | app | 1214 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Alamofire | community | 53 | 4 | 4 | 1 | 5 | 1 | 10 | 2 | 0 | 2 | 11 | 0 | 1 |
| Nuke | community | 126 | 0 | 0 | 70 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| swift-composable-architecture | community | 69 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| swift-dependencies | community | 41 | 0 | 5 | 4 | 0 | 11 | 0 | 1 | 1 | 0 | 1 | 0 | 9 |
| swift-snapshot-testing | community | 39 | 6 | 6 | 24 | 7 | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 5 |
| swift-argument-parser | core | 98 | 0 | 14 | 5 | 0 | 9 | 5 | 9 | 9 | 3 | 0 | 0 | 2 |
| swift-async-algorithms | core | 87 | 0 | 0 | 0 | 2 | 0 | 16 | 17 | 17 | 0 | 0 | 0 | 21 |
| swift-collections | core | 579 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 165 |
| swift-crypto | core | 177 | 2 | 8 | 0 | 2 | 0 | 13 | 6 | 6 | 135 | 0 | 130 | 10 |
| swift-distributed-tracing | core | 19 | 0 | 9 | 0 | 0 | 2 | 2 | 2 | 2 | 0 | 0 | 0 | 0 |
| swift-log | core | 13 | 0 | 17 | 0 | 0 | 0 | 5 | 5 | 5 | 0 | 0 | 0 | 2 |
| swift-openapi-generator | core | 121 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 |
| swift-protobuf | core | 156 | 0 | 1 | 0 | 0 | 7 | 4 | 1 | 1 | 42 | 0 | 0 | 2 |
| swift-system | core | 43 | 17 | 80 | 0 | 6 | 50 | 0 | 10 | 11 | 0 | 0 | 0 | 11 |
| swift-foundation | core | 353 | 15 | 144 | 92 | 7 | 80 | 110 | 37 | 34 | 59 | 0 | 57 | 3 |
| container | oci | 337 | 0 | 0 | 13 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| containerization | oci | 245 | 73 | 1 | 35 | 0 | 0 | 18 | 44 | 42 | 14 | 0 | 0 | 0 |
| swift-container-plugin | oci | 31 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 |
| rules_swift | platform | 28 | 3 | 1 | 0 | 0 | 0 | 2 | 2 | 0 | 0 | 3 | 0 | 2 |
| swift-embedded-examples | platform | 118 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| JavaScriptKit | platform | 74 | 0 | 9 | 0 | 0 | 9 | 3 | 3 | 2 | 1 | 0 | 35 | 29 |
| swift-nio | server | 322 | 93 | 251 | 6 | 89 | 177 | 175 | 134 | 140 | 6 | 0 | 0 | 42 |
| grpc-swift-2 | server | 90 | 0 | 0 | 0 | 0 | 0 | 3 | 3 | 3 | 0 | 0 | 0 | 0 |
| hummingbird | server | 139 | 0 | 0 | 1 | 0 | 0 | 1 | 1 | 1 | 23 | 0 | 0 | 2 |
| async-http-client | server | 72 | 1 | 0 | 0 | 0 | 0 | 5 | 1 | 3 | 14 | 0 | 0 | 0 |
| swift-aws-lambda-runtime | server | 77 | 2 | 3 | 5 | 0 | 0 | 2 | 5 | 5 | 40 | 0 | 0 | 1 |
| swift-service-lifecycle | server | 15 | 0 | 10 | 0 | 0 | 11 | 4 | 3 | 3 | 0 | 0 | 0 | 4 |
| vapor | server | 200 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 75 | 0 | 0 | 1 |
| SwiftFormat | tool-community | 198 | 1 | 2 | 5 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | 0 | 0 |
| SwiftLint | tool-community | 166 | 10 | 14 | 5 | 0 | 0 | 0 | 1 | 2 | 0 | 2 | 0 | 2 |
| tuist | tool-community | 1446 | 12 | 7 | 163 | 0 | 0 | 27 | 19 | 13 | 0 | 20 | 5 | 0 |
| sourcekit-lsp | tool-swiftlang | 343 | 0 | 42 | 15 | 1 | 0 | 21 | 10 | 10 | 0 | 0 | 0 | 2 |
| swift-build | tool-swiftlang | 679 | 7 | 93 | 23 | 4 | 5 | 106 | 3 | 3 | 0 | 0 | 15 | 0 |
| swift-format | tool-swiftlang | 132 | 0 | 10 | 2 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 5 |
| swift-package-manager | tool-swiftlang | 594 | 10 | 103 | 52 | 12 | 4 | 35 | 6 | 6 | 0 | 1 | 0 | 6 |
| swift-syntax | tool-swiftlang | 375 | 7 | 9 | 4 | 1 | 7 | 7 | 8 | 6 | 0 | 0 | 8 | 173 |
| swift-testing | tool-swiftlang | 212 | 36 | 69 | 10 | 32 | 19 | 0 | 2 | 0 | 0 | 0 | 180 | 1 |
| swiftly | tool-swiftlang | 49 | 18 | 2 | 22 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

Per-shape totals and corpus row (all = 9,537 prod files):

| shape | prod .swift | Lnx | Win | mac | And | WASI | Darw | Glibc | Musl | cI:FE | cI:FN | hasF | cmp>= |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| app | 1621 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| community | 328 | 10 | 15 | 101 | 12 | 13 | 10 | 3 | 1 | 2 | 13 | 0 | 15 |
| core | 1646 | 36 | 273 | 97 | 17 | 148 | 155 | 87 | 85 | 240 | 0 | 187 | 216 |
| oci | 613 | 73 | 1 | 48 | 0 | 0 | 19 | 44 | 42 | 14 | 2 | 0 | 0 |
| platform | 220 | 3 | 10 | 0 | 0 | 9 | 5 | 5 | 2 | 1 | 3 | 35 | 31 |
| server | 915 | 96 | 264 | 12 | 89 | 188 | 191 | 147 | 155 | 158 | 0 | 0 | 50 |
| tool-community | 1810 | 23 | 23 | 173 | 0 | 0 | 27 | 21 | 16 | 0 | 22 | 5 | 2 |
| tool-swiftlang | 2384 | 78 | 328 | 128 | 51 | 35 | 170 | 29 | 25 | 0 | 1 | 203 | 187 |
| **all** | 9537 | 319 | 914 | 560 | 169 | 393 | 577 | 336 | 326 | 415 | 41 | 430 | 501 |
| **repos with >=1 hit** |  | 19 | 26 | 23 | 13 | 15 | 25 | 27 | 24 | 13 | 8 | 7 | 24 |

CI platform keyword census (39 of 40 repos have CI files; sourcekit-lsp has none in `.github` and uses ci.swift.org):

| repo | shape | workflows | windows | android | wasm | embedded | static_sdk | nightly | cxx_interop | sanitizer | bazel |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Alamofire | community | 1 | x | x | . | . | . | x | . | . | . |
| IceCubesApp | app | 1 | . | . | . | . | . | . | . | . | . |
| container | oci | 8 | . | . | . | . | . | . | . | . | . |
| containerization | oci | 6 | . | . | . | . | x | . | . | . | . |
| swift-argument-parser | core | 2 | x | . | x | . | . | x | . | . | . |
| swift-async-algorithms | core | 1 | x | . | x | . | . | x | . | . | . |
| swift-collections | core | 1 | x | x | x | x | . | x | . | . | . |
| swift-container-plugin | oci | 5 | . | . | . | . | x | x | . | . | . |
| swift-crypto | core | 3 | x | . | . | . | x | x | x | . | . |
| swift-distributed-tracing | core | 4 | x | . | x | . | . | x | x | . | . |
| swift-log | core | 4 | x | x | x | . | x | x | x | . | . |
| swift-nio | server | 17 | x | x | x | . | x | x | x | . | . |
| swift-openapi-generator | core | 4 | x | . | . | . | . | x | . | . | . |
| swift-protobuf | core | 5 | . | . | . | . | . | . | . | x | . |
| swift-system | core | 1 | x | x | x | . | x | x | . | . | . |
| rules_swift | platform | 3 | x | . | . | . | . | . | . | . | x |
| element-x-ios | app | 17 | . | . | . | . | . | . | . | . | . |
| grpc-swift-2 | server | 4 | . | . | . | . | x | x | x | . | . |
| hummingbird | server | 11 | . | . | . | . | . | x | . | . | . |
| Nuke | community | 1 | . | . | . | . | . | . | . | . | . |
| SwiftFormat | tool-community | 8 | x | . | . | . | . | . | . | . | . |
| swift-composable-architecture | community | 3 | . | . | . | . | . | . | . | . | . |
| swift-dependencies | community | 3 | . | x | x | . | . | . | . | . | . |
| swift-snapshot-testing | community | 3 | . | x | . | . | . | . | . | . | . |
| SwiftLint | tool-community | 12 | x | . | . | . | x | . | . | x | x |
| async-http-client | server | 3 | . | . | . | . | x | x | x | . | . |
| swift-aws-lambda-runtime | server | 6 | x | . | . | . | x | x | . | . | . |
| swift-service-lifecycle | server | 4 | x | . | x | . | x | x | x | . | . |
| sourcekit-lsp | tool-swiftlang | 0 | . | . | . | . | . | . | . | . | . |
| swift-build | tool-swiftlang | 3 | x | x | x | . | x | x | . | . | . |
| swift-embedded-examples | platform | 10 | . | . | . | x | . | . | . | . | . |
| swift-format | tool-swiftlang | 4 | x | . | . | . | . | x | . | . | . |
| swift-foundation | core | 4 | x | x | x | . | . | x | . | . | . |
| swift-package-manager | tool-swiftlang | 4 | x | x | x | . | x | x | . | . | . |
| swift-syntax | tool-swiftlang | 3 | x | . | x | . | . | . | . | . | x |
| swift-testing | tool-swiftlang | 6 | x | x | x | . | x | x | . | . | . |
| swiftly | tool-swiftlang | 4 | . | . | . | . | . | x | . | . | . |
| JavaScriptKit | platform | 1 | . | . | x | x | . | . | . | . | . |
| tuist | tool-community | 106 | . | x | . | . | . | . | . | . | x |
| vapor | server | 5 | . | . | . | . | x | . | . | . | . |
| **repos with keyword (of 40; 39 have CI files)** | | | 21 | 12 | 15 | 3 | 15 | 22 | 7 | 2 | 4 |

- Extremes: swift-nio is the platform maximum (`os(Windows)` 251, `canImport(Darwin)` 175, `os(WASI)` 177, `os(Android)` 89, `canImport(Musl)` 140). swift-foundation holds 144 `os(Windows)`. Apple/app-only repos have near zero: IceCubesApp, element-x-ios, TCA 0 for Linux/Windows.
- Verified CI legs (read, not keyword): swift-system has Windows (`swift-system@486d48c80fce:.github/workflows/pull_request.yml:33`), Android (`:62`), Wasm (`:51`), static SDK (`:40`), FreeBSD (`:64`); swift-collections lists its legs at `.github/workflows/pull_request.yml:18-22,54`; swift-dependencies runs Wasm and Android at `.github/workflows/ci.yml:52-70`; Alamofire runs `windows-latest` at `.github/workflows/ci.yml:513-515`.
- Foundation split: `import FoundationEssentials` is 388 files in 12 repos (swift-crypto 134, vapor 68, swift-foundation 56) against `import Foundation` 3,824 in 34. The guard is `#if canImport(FoundationEssentials)` (415 uses in 13 repos, `swift-crypto@1c80d3aff53f:Sources/Crypto/KEM/KEM.swift:19`). `FoundationNetworking` is 31 imports and 41 guards in 8 repos, driven by tuist 20 and Alamofire 11 guards (`Alamofire@bda9ed57d729:Source/Alamofire.swift:27`).
- libc ladder: `canImport(Glibc)` 336, `Musl` 326, `Darwin` 577, `Bionic` 110, `WASILibc` 61, `WinSDK|ucrt` 64 (ladder example `swift-nio@e12881f2a691:Sources/NIOConcurrencyHelpers/NIOLock.swift:22`).
- Embedded: `hasFeature(` 430 hits, 7 repos, but 70% from two (swift-testing 180, swift-crypto 130). swift-embedded-examples itself has 118 prod files and uses `hasFeature` 0 times: the examples are Embedded by manifest settings and Makefile, not by source guards (`swift-embedded-examples@119b29f83550:rpi-4b-blink/Makefile:18` sets the build system).
- Version guards: `compiler(>=` 501 in 24 repos (swift-syntax 173, collections 165, nio 42). swift-collections keeps `Package@swift-6.2.swift` beside `Package.swift` and line 111 is `.strictMemorySafety()` in Package.swift and commented out in Package@swift-6.2.swift (`swift-collections@935f696a549a:Package.swift:111`).
- Build-system pinning `[6.4]`: `--build-system native` is pinned in 5 repos; nio and lambda carry a comment naming the swiftbuild gap: swift-nio Android (`swift-nio@e12881f2a691:scripts/swift-build-with-android-sdk.sh:40-43`: swiftbuild expects a local NDK); swift-aws-lambda-runtime static SDK (`@8abd464310c7:.github/workflows/pull_request.yml:36-42`: duplicate libc++abi symbols, upstream swiftlang/swift#90196); JavaScriptKit (7 files); embedded-examples (12 files, `rpi-4b-blink/Makefile:18`); SwiftPM itself 1. containerization instead adapts to swiftbuild test bundles (`containerization@3e7bc39e66b3:Makefile:64`).
- Spot-read false-positive rate: `os(Windows)` 1 of 3 sampled lines is a negated guard in a test-helper module that leaked into prod (`swift-argument-parser@efd239f0055b:Sources/ArgumentParserTestHelpers/TestHelpers+SwiftTesting.swift:240`); `os(Android)` 0 of 3 wrongly typed but 1 of 3 negated (`swift-testing ... Issue+Recording.swift:294`); `canImport(FoundationEssentials)` 0 of 3; T6 Windows keyword 1 of 4 false before the `: false` filter (`swift-aws-lambda-runtime@8abd464310c7:.github/workflows/pull_request.yml:28` `enable_windows_checks: false`), android 1 of 3 (`vapor@bf77fc69b142:.github/workflows/test.yml:48` `with_android: false`), embedded keyword 1 of 3 (docs target name).

## CLI and I/O runtime (axis 5)

Commands: ax5.py over prod lists, regexes inline in its table (`\bExitCode\b`, `(?<![A-Za-z_.])exit\(`, `makeSignalSource`, `\bServiceGroup\b`, `\bProcess\(\)`, `posix_spawn`, `atomically:\s*true|options:\s*\[?\.atomic`, `\bFilePath\b`, `\bAbsolutePath\b`, `^\s*import Logging`). T5A is a hand list of 18 CLI-shaped repos (ArgumentParser users or executable-first); T5B is all 40. T5A regexes differ from the anchored ones quoted in the totals line: `ExitCode` is unanchored (113 vs 90 anchored in 12 repos), `exit(` is line-start only (50 vs 75), `ValidationError\(` is call-only (110 vs 196).

| repo | prod .swift | ExitCode | exit() | stderr writes | print( | ValidationError | validate() | fatalError | try! | import Logging | OSLog |
|---|---|---|---|---|---|---|---|---|---|---|---|
| container | 337 | 8 | 6 | 4 | 62 | 28 | 14 | 13 | 8 | 80 | 2 |
| containerization | 245 | 4 | 0 | 1 | 20 | 7 | 3 | 17 | 8 | 48 | 0 |
| swiftly | 49 | 3 | 6 | 2 | 27 | 0 | 4 | 14 | 9 | 0 | 0 |
| SwiftLint | 166 | 0 | 2 | 3 | 26 | 8 | 3 | 3 | 6 | 0 | 0 |
| SwiftFormat | 198 | 7 | 1 | 4 | 95 | 0 | 0 | 35 | 9 | 0 | 0 |
| tuist | 1446 | 4 | 3 | 5 | 28 | 17 | 6 | 30 | 77 | 32 | 0 |
| swift-format | 132 | 5 | 0 | 0 | 28 | 8 | 4 | 11 | 3 | 0 | 0 |
| swift-package-manager | 594 | 34 | 7 | 3 | 159 | 15 | 2 | 76 | 85 | 0 | 0 |
| swift-build | 679 | 9 | 2 | 1 | 22 | 0 | 1 | 189 | 81 | 0 | 3 |
| sourcekit-lsp | 343 | 7 | 0 | 0 | 25 | 0 | 0 | 17 | 27 | 0 | 5 |
| swift-syntax | 375 | 0 | 2 | 2 | 15 | 0 | 0 | 99 | 99 | 0 | 1 |
| swift-openapi-generator | 121 | 1 | 0 | 5 | 6 | 6 | 0 | 2 | 5 | 0 | 0 |
| swift-protobuf | 156 | 0 | 0 | 6 | 25 | 0 | 0 | 12 | 20 | 0 | 0 |
| swift-container-plugin | 31 | 3 | 0 | 1 | 3 | 3 | 1 | 0 | 4 | 0 | 0 |
| JavaScriptKit | 74 | 0 | 11 | 4 | 25 | 0 | 0 | 32 | 2 | 0 | 0 |
| swift-argument-parser | 98 | 24 | 5 | 0 | 18 | 14 | 7 | 26 | 0 | 0 | 0 |
| swift-aws-lambda-runtime | 77 | 0 | 0 | 0 | 138 | 0 | 0 | 20 | 6 | 10 | 0 |
| rules_swift | 28 | 4 | 5 | 7 | 19 | 4 | 1 | 0 | 1 | 0 | 0 |
| **18 CLI repos** | 5149 | 113 | 50 | 48 | 741 | 110 | 46 | 596 | 450 | 170 | 11 |

| repo | shape | sigSrc | signal() | SvcGrp | gracefulSD | Process() | Subprocess | posix_spawn | atomic | FilePath | URL path APIs | AbsPath | import Logging |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| IceCubesApp | app | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 7 | 0 | 0 |
| element-x-ios | app | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 10 | 0 | 39 | 0 | 1 |
| Alamofire | community | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5 | 0 | 0 |
| Nuke | community | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 7 | 0 | 0 |
| swift-composable-architecture | community | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 17 | 0 | 0 |
| swift-dependencies | community | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 |
| swift-snapshot-testing | community | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 9 | 0 | 0 |
| swift-argument-parser | core | 0 | 0 | 0 | 0 | 5 | 0 | 0 | 2 | 6 | 20 | 0 | 0 |
| swift-distributed-tracing | core | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| swift-log | core | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| swift-openapi-generator | core | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 1 | 0 | 2 | 0 | 0 |
| swift-protobuf | core | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | 0 | 0 |
| swift-system | core | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 185 | 0 | 0 | 0 |
| swift-foundation | core | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 16 | 0 | 75 | 0 | 0 |
| container | oci | 0 | 5 | 0 | 0 | 8 | 0 | 0 | 16 | 246 | 153 | 0 | 80 |
| containerization | oci | 5 | 1 | 0 | 0 | 1 | 0 | 1 | 5 | 127 | 146 | 0 | 48 |
| swift-container-plugin | oci | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 14 | 0 | 0 |
| rules_swift | platform | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 1 | 0 | 17 | 0 | 0 |
| JavaScriptKit | platform | 3 | 0 | 0 | 0 | 5 | 0 | 0 | 1 | 0 | 84 | 0 | 0 |
| swift-nio | server | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 478 | 10 | 0 | 0 |
| grpc-swift-2 | server | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| hummingbird | server | 0 | 0 | 11 | 9 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 29 |
| async-http-client | server | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 19 |
| swift-aws-lambda-runtime | server | 0 | 0 | 0 | 2 | 4 | 0 | 0 | 2 | 0 | 41 | 0 | 21 |
| swift-service-lifecycle | server | 1 | 0 | 10 | 168 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| vapor | server | 0 | 0 | 7 | 11 | 0 | 0 | 0 | 0 | 2 | 2 | 0 | 25 |
| SwiftFormat | tool-community | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 6 | 0 | 25 | 0 | 0 |
| SwiftLint | tool-community | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 14 | 5 | 45 | 0 | 0 |
| tuist | tool-community | 2 | 2 | 0 | 3 | 8 | 3 | 19 | 11 | 15 | 252 | 3029 | 32 |
| sourcekit-lsp | tool-swiftlang | 0 | 4 | 0 | 0 | 0 | 0 | 1 | 15 | 0 | 67 | 70 | 0 |
| swift-build | tool-swiftlang | 0 | 0 | 0 | 0 | 5 | 0 | 14 | 6 | 25 | 63 | 131 | 0 |
| swift-format | tool-swiftlang | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 29 | 0 | 0 |
| swift-package-manager | tool-swiftlang | 1 | 5 | 0 | 0 | 2 | 0 | 49 | 3 | 43 | 59 | 2323 | 0 |
| swift-syntax | tool-swiftlang | 0 | 1 | 0 | 0 | 2 | 0 | 0 | 1 | 0 | 33 | 0 | 0 |
| swift-testing | tool-swiftlang | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 2 | 0 | 0 |
| swiftly | tool-swiftlang | 0 | 0 | 0 | 0 | 2 | 10 | 0 | 13 | 158 | 21 | 0 | 0 |

Corpus totals (all 40, prod): `import ArgumentParser` 494 in 18 repos, `AsyncParsableCommand` 250 (16), `ExitCode` 90 uses (12), `validate()` 53 (15), `@main` 136 (30), `Task {` 947 (24), `Task.detached` 40 (13), `MainActor.run` 26 (5), `DispatchQueue.` 271 (18), `import Combine` 458 files (9), completion-handler signatures 142 (9), `withTaskCancellationHandler` 74 (17), `Synchronization` import 229 (17).

- Exit codes: `ExitCode` is the contract surface in the two Apple CLIs and SwiftPM (`swift-package-manager` 34, `swift-argument-parser` 24, `container` 8); `ValidationError` pairs with `validate()` (110 vs 46 in T5A). Most CLIs still call `exit(` (50) and `fatalError` (596) in the same files: swift-build 189 and swift-syntax 99 `fatalError` are tool internals, but `JavaScriptKit` has 11 `exit(`. Mixed state: `container` throws `ArgumentParser.ExitCode(exitCode)` (`container@f70ecbb926d9:Sources/ContainerCommands/Container/ContainerExec.swift:117`) and also calls `exit(signal + 128)` from a terminal restore hook (`Sources/TerminalProgress/ProgressBar+RestoreCursor.swift:29`), i.e. the 128+signal convention.
- Streams: stdout `print(` 741 against 48 explicit stderr writes in the 18 CLI repos (15:1); 4 of 18 repos have no stderr write at all (swift-format, sourcekit-lsp, swift-argument-parser, aws-lambda-runtime). ArgumentParser's own error output carries diagnostics, so stderr discipline is mostly delegated. Spot read of the broad `.standardError` pattern: 3 of 3 hits are stream wiring, not writes (`container@f70ecbb926d9:Sources/ContainerCommands/System/SystemLogs.swift:84` assigns the handle to a `Process`); the T5A column uses the tight write-only regex.
- Signals: swift-service-lifecycle ships an `AsyncSequence` of signals (`UnixSignals` module, `UnixSignalsSequence.swift`); CLI exemplars instead use these mechanisms: `DispatchSource.makeSignalSource` (12 hits, 5 repos, e.g. `containerization@3e7bc39e66b3:Sources/ContainerizationOS/AsyncSignalHandler.swift:100`), `signal(SIG...)` (21, 7 repos), `sigaction` (4 hits, 2 repos; one is a comment, `swift-service-lifecycle@c55297914e26:Sources/UnixSignals/UnixSignalsSequence.swift:118`). `container` wraps it as `AsyncSignalHandler.create(notify: [SIGTERM, SIGINT, SIGUSR1, SIGUSR2])` (`BuildOptions+LinuxBuild.swift:267`).
- Server lifecycle: `ServiceGroup` 29 uses in 4 repos (hummingbird 11, swift-service-lifecycle 10, vapor 7, grpc-swift-2 1) and `gracefulShutdown` 193 (168 in lifecycle itself). `hummingbird@1bd3b407fb47:Sources/Hummingbird/Application.swift:153` builds the group. Among CLI repos only aws-lambda-runtime touches graceful-shutdown APIs (2 hits).
- Subprocess: Foundation `Process()` 50 uses in 16 repos; `posix_spawn` direct 85 in 6 repos (SwiftPM 49, tuist 19, swift-build 14), `waitpid` 8, `fork()` 3. The new `swift-subprocess` package: 14 imports in 3 repos (swiftly 10, tuist 3, element-x-ios 1); swiftly pins it `exact: "1.0.0"` (`swiftly@c8cf2e35bfca:Package.swift:34,71`). Spot read: `posix_spawn` 3 of 3 real (swift-build cmake smoke-test plugin, tuist xcresult parser), but 7 of 82 hit lines are comments.
- Atomic writes: `atomically: true`/`.atomic` 129 hits in 21 repos (swift-foundation 16, container 16, sourcekit-lsp 15); `replaceItem` 9, `moveItem` 25, `rename(` 129 (101 in nio's file layer), `fsync` 40 (34 nio), `mkstemp/temporaryDirectory` 251 in 19 repos. `fsync` appears in 6 repos (nio 34, swiftly 2, tuist 1, others 3). Typical CLI write is `write(to:, atomically: true)` (`swiftly@c8cf2e35bfca:Sources/Swiftly/Use.swift:140`). Spot read: 3 of 3 real; 1 of 3 inside a test-support target leaked into prod (`container@f70ecbb926d9:Sources/ContainerTestSupport/BuildFixture.swift:145`).
- Paths: three coexisting models. swift-system `FilePath` 1,290 uses in 11 repos (nio 478, container 246, containerization 127, swift-system 185); URL path APIs (`URL(fileURLWithPath:`, `appendingPathComponent`) 1,255 in 30 repos; TSC `AbsolutePath` 5,553 in only 4 repos (tuist 3,029, SwiftPM 2,323, swift-build 131, sourcekit-lsp 70). String paths (`.fileExists(atPath:`, `contentsOfFile:`, `.path`) 4,122 in 31 repos. Only `container` and `containerization` combine `FilePath` and `URL` heavily (246 + 153; 127 + 146).
- Logging: `import Logging` 258 files in 10 repos, with `Logger(label:` 58, `LoggingSystem.bootstrap` 19 in 4 repos (container 7, tuist 5, swift-log 4). `os.Logger`/OSLog 125 in 12 repos. `import Metrics` 2, `import Tracing` 19 (3 repos): observability stack adoption is server-only. Among CLI repos only container, containerization, tuist and aws-lambda-runtime import Logging.
- Agent-failure incidentals (H7, measured in prod): Combine 458 files (410 in element-x-ios), `DispatchQueue.` 271 (182 element-x), `MainActor.run` 26, `Task.detached` 40, completion handlers 142 (Alamofire 62, SwiftPM 45), and `try!` 756 (30 repos) / `fatalError` 1,586 (37) / force-unwrap candidates 5,929 (40, regex over-counts operators). Tests and generated code are excluded from every count.
- Spot-read false-positive rate: `ExitCode` 0 of 3 (sourcekit-lsp `Diagnose/IndexCommand.swift:111`, rules_swift `tools/swift-releases/ReleasedToolchain.swift:65`); `exit(` 0 of 3 (JavaScriptKit `PackageToJSPlugin.swift:258,399`, container `ProgressBar+RestoreCursor.swift:29`) but 9 of 66 hit lines in the spot regex are comments (14%); `.standardError` 3 of 3 not writes (see above); `atomically` 0 of 3.

## Bazel for Swift (axis 6)

Command: `git ls-files | grep -E '(^|/)(BUILD(\.bazel)?|MODULE\.bazel|WORKSPACE(\.bazel)?|\.bazelrc|\.bazelversion)$'` per clone, then reading MODULE.bazel, .bazelrc, .bazelci/presubmit.yml.

| repo | bazel files | MODULE.bazel | rules_swift use | notes |
|---|---|---|---|---|
| rules_swift | 114 | 2 | is the ruleset | `bazel_compatibility >=8.0.0`, `compatibility_level 3` (`rules_swift@50450ed24dde:MODULE.bazel:3-8`); hermetic `swift.toolchain(swift_version = "6.4.0")` (`MODULE.bazel:257-260`) creating `swift_toolchain_ubuntu22.04`, `-aarch64` and `_xcode` repos; Linux toolchains registered by name per distro (`MODULE.bazel:263-290`) with an in-file comment that the list must be edited when CI changes |
| SwiftLint | 10 | 1 | `rules_swift 3.6.1`, `rules_apple 4.5.3`, `max_compatibility_level = 3` (`SwiftLint@ec4691d9e813:MODULE.bazel:15`) | Bazel `9.x` (`.bazelversion`), used for the macOS universal release binary; SwiftPM stays the dev build |
| tuist | 17 | 2 | `rules_swift_package_manager 1.18.1` with `swift_deps.from_package` (`tuist@2f6ac74754bf:swifterpm/MODULE.bazel:9-33`) | SwiftPM manifest feeds Bazel; Bazel is a sub-project (`swifterpm`, `kura`), not the repo build |
| swift-syntax | 6 | 1 | local `swift_syntax_library.bzl` in `utils/bazel/` | Bazel files are an alternative consumer path; `swift-syntax@be549876fe91:.github/workflows/pull_request.yml:31-44` carries a Bazel job |
| swift-protobuf | 63 | 0 | BUILD files only | no MODULE.bazel at this SHA (file census only, contents not read) |
| other 35 | 0 | 0 | | |

- Linux needs explicit host shaping: `common:linux --repo_env=CC=clang` (`rules_swift@50450ed24dde:.bazelrc:47`) and the README states the clang driver requirement (`README.md:69-72`); on Linux hosts Bazel otherwise uses whichever `swift` is on PATH (`README.md:104`). Hermetic alternative: `doc/standalone_toolchain.md`.
- rules_swift sets `--features treat_warnings_as_errors` and worker sandboxing (`.bazelrc:27,31`), pins `--macos_minimum_os=14.0` (`:14-15`), and CI runs macOS (Xcode 26.2), Ubuntu 22.04, Windows (`.bazelci/presubmit.yml`: windows tasks only build `//tools/...` plus cross-platform examples). It is the only exemplar with Windows Bazel Swift CI.
- Release: manual `workflow_dispatch` with a tag input, tarball + stardoc docs tarball, `gh release create`, then `bazel-contrib/publish-to-bcr` (`rules_swift@50450ed24dde:.github/workflows/create-release.yml:3-9,35-37`).
- Bazel is secondary everywhere it appears (4 of 5 repos build with SwiftPM first). The H-implication for a `bazel-quality/swift.md` depth file: its audience is rules_swift consumers (SwiftLint-like release builds, SwiftPM-to-Bazel bridges), not teams that build Swift primarily with Bazel; no exemplar is the latter except rules_swift's own tests. Spot-read false-positive rate: 0 of 3 for the file-name census.

## Running SwiftPM tooling (axis 7)

All runs inside swift:6.4 (and 6.3 where stated) through `run.sh`, `timeout 900`, scratch paths outside the exemplars. Exemplar trees were copied, never built in place.

| # | command | subject | result |
|---|---|---|---|
| E1 | `swift package describe --type json` | swift-log, swift-system, swift-argument-parser (no remote deps), swiftly (11 deps) | JSON with 5 / 4 / 19 / 15 targets; swiftly's remote deps are resolved first |
| E2 | `swift package show-dependencies --format json` | swiftly | fetched 11 direct dependencies (18 KB of `Fetching` stderr), JSON on stdout; progress goes to stderr, so `2>/dev/null` before piping |
| E3 | `swift package diagnose-api-breaking-changes 1.15.0` | swift-log copy with `Sendable` removed from `LogEvent` | `2 breaking changes detected in Logging: struct LogEvent has removed conformance to Sendable ... to SendableMetatype`; nonzero exit. Works only on an unfiltered clone with the baseline tag present: the blob-less exemplar clone failed with a promisor error; a first plant that did not compile produced no report |
| E4 | `swift build` of a consumer depending on swift-log with `unsafeFlags` | tools-version 6.2 vs the same file with line 1 changed to 6.1 (only diff) | `[>=6.2]` 6.2: `Build complete! (2.61s)`; 6.1: `error: 'consumer-unsafe61': the target 'Logging' in product 'Logging' contains unsafe build flags` |
| E5 | `swift package resolve` | consumer with tag `v1.16.3` | resolved at 1.16.3 (pin `"version" : "1.16.3"`) |
| E6 | `swift build -c release` hello-cli (ArgumentParser, Foundation) | default, 6.4 | `Build complete! (10.23 secs)`, dynamic |
| E7 | `--swift-sdk x86_64-swift-linux-musl` after `swift sdk install ... --checksum` | same | `Build complete! (15.46 secs)`; `file`: ELF x86-64 statically linked; `ldd`: not a dynamic executable; runs and prints `0.0.1` for `--version`; 59.3 MB unstripped |
| E8 | `--static-swift-stdlib` | same, swiftbuild (default) 6.4 and 6.3 | `[6.4][6.3]` both fail at link (6.4 text; 6.3 shows the same class of `libFoundationEssentials.a` error): `libFoundationEssentials.a(SwiftFileManager.swift.o) ... undefined reference to '$s15Synchronization12_MutexHandleV8unlockeds6UInt32VvgZ'` |
| E9 | `--build-system native --static-swift-stdlib` | same | 6.4: `Build complete! (11.01s)` with `'--build-system native' has been deprecated` warning; 6.3: `Build complete! (12.84s)` |

- Decision table from E6-E9 (hello-cli, a Foundation CLI): static binary that works on 6.4 = static Linux SDK (musl); `--static-swift-stdlib` only with `--build-system native`, which is deprecated and will be removed. That is the same trade-off the exemplars made: SwiftFormat and SwiftLint choose musl, aws-lambda-runtime pins native until `swiftlang/swift#90196` is fixed (`swift-aws-lambda-runtime@8abd464310c7:.github/workflows/pull_request.yml:36-42`).
- E3 caveat: a planted break that does not compile yields no report (my first plant did not compile). I did not capture the exit code separately (output was tee'd), so treat the `N breaking changes detected` text as the signal and verify the exit code before gating CI on it. The baseline checkout emits unrelated `Invalid Exclude` and unhandled-resource warnings for the baseline's `Tests/` and `Docs.docc`, so stderr warnings are not failures.
- Spot-read false-positive rate: not applicable (experiments are measurements); repeat count 1 per cell, no timing variance measured.

## Hypotheses tested

| H | verdict | evidence |
|---|---|---|
| H1 tools >= 6.0 yet some stay 5.x | supported for tools-version (35/38 at 6.x), contradicted as a language-mode proxy | 11 of 35 6.x repos still set `.v5` at package or target level (Alamofire, collections, container-plugin, TCA, snapshot-testing, swift-build, embedded-examples, swift-format, foundation, SwiftPM, service-lifecycle; swift-syntax at tools 5.9 lists `.v5, .version("6")`); e.g. `Alamofire@bda9ed57d729:Package.swift:52` |
| H5 lockfile: apps/executables commit, libraries do not | half | 10 track (swiftly, container, containerization, SwiftLint, tuist + element-x, embedded-examples + 3 pointfree libraries); 6 swiftlang tool repos (swift-format, SwiftPM, sourcekit-lsp, swift-build, swift-syntax, swift-testing) and swift-openapi-generator, swift-container-plugin ignore it |
| H6 Linux common, Windows rare, static SDK only in CLIs | Windows contradicted; static half right | Windows keyword in 21 of 39 CI repos and `os(Windows)` in 26 repos; static-SDK leg in 16 non-release repos (compile or build check) but shipped static binaries in 4 CLIs only |
| H8 default MainActor isolation only in apps | supported | `.defaultIsolation(MainActor.self)` only in IceCubesApp (`IceCubesApp@2ad6e6891258:Packages/Account/Package.swift:42`) and element-x-ios (`element-x-ios@14e33866ced2:compound-ios/Package.swift:27,40`); 0 in the 38 other repos. Only 2 repos is thin evidence |
| H2, H3, H4, H7 | not tested here (other agents own them); H7 incidentals recorded in CLI section | |

## Smells (ranked)

1. Reusable workflows from another repo at `@main`: 116 refs in 12 repos run mutable code in CI (`apple/swift-nio/.github/workflows/*`), versus 57 tag-pinned refs for swiftlang/github-workflows.
2. `--static-swift-stdlib` recipe fails on the 6.x default build system; the working recipe is the static Linux SDK. Any rule telling agents "static = `--static-swift-stdlib`" produces a red build on 6.3/6.4 (E8).
3. swift-syntax pin policy is a lottery: five strategies across 13 repos; `exact` prerelease (SwiftLint) and `branch: main` defeat prebuilts and break consumers that need release resolution.
4. Native build system pinned in 5 repos with a deprecation warning (`--build-system native` "will be removed"): migration debt that is not tracked in any exemplar README.
5. Lockfile policy is unwritten and inconsistent (3 libraries track, 6 tools ignore); element-x-ios has 5 resolution roots.
6. Version stamping by `sed` on source in release workflows (SwiftLint, SwiftFormat) mutates a tracked file during release; `swiftly`'s `dev` suffix means a source build misreports.
7. No signing or provenance step matched for any shipped Linux binary; the SDK, the `binaryTarget` and macOS bundles are the only checksummed or notarized artifacts.
8. `print(` to stdout 15:1 over stderr writes in CLIs; diagnostics rely on ArgumentParser.
9. `fsync` absent in 34 of 40 repos while `atomically: true` is common: durability is atomic-replace only.
10. Mixed `exit(` and `throw ExitCode` in the same CLIs (container, swiftly, argument-parser).

## Patterns worth encoding

1. Tools-version drives behaviour: for libraries pick the lowest tools-version that carries the features used; `[>=6.2]` skips the unsafeFlags consumer check, so a library at 6.1 with `unsafeFlags` is unconsumable (E4).
2. Gitignore `Package.resolved` for libraries; track it for executables and apps and CI-enforce it with `--force-resolved-versions` (tuist is the only example of enforcement).
3. Macro packages: declare a swift-syntax range, not `exact`, and branch with `canImport(SwiftSyntax6xx)` marker modules (TCA, swift-dependencies, snapshot-testing, JavaScriptKit); list the supported major range in the README.
4. Command plugins declare minimal `permissions` with a `reason:` string; build-tool plugins are rarer (6 vs 18).
5. Static Linux CLI: `swift sdk install <URL> --checksum <sha256>` then `swift build -c release --swift-sdk <arch>-swift-linux-musl` (tuist, swiftly, SwiftFormat, SwiftLint); verified by E7 on 6.4.
6. macOS universal: two `--arch` builds plus `lipo -create` (SwiftFormat), or Bazel `universal_*` (SwiftLint).
7. Release stamping: pick one of sed-template (SwiftLint, template file not tracked output), env -> manifest `.define` (container), or tag-only; avoid editing tracked sources in the release job.
8. Platform ladders: `canImport(Glibc)/Musl/Android/Bionic` with `os(Windows)` as a separate arm (nio `NIOLock.swift`); Essentials-only libraries guard `canImport(FoundationEssentials)`; use `FoundationNetworking` guard for URLSession.
9. Reusable CI pinned to a tag (`swiftlang/github-workflows@0.0.15`), not `@main`.
10. Pin `--build-system native` only with a comment linking the upstream issue and a removal condition (lambda-runtime, nio).
11. Signals via one wrapper (`AsyncSignalHandler`) and service shutdown via `ServiceGroup` for servers; CLI exit via `throw ExitCode`.
12. API-break gate: `swift package diagnose-api-breaking-changes <tag>` on an unfiltered clone (blob-less clones fail); match the `breaking change` text and confirm the exit code (E3).

## Contradictions of the frame

- Frame H6 expected Windows CI to be rare; it is in about half the exemplars.
- Frame H5 expected libraries to ignore lockfiles and executables to commit; 3 well-known libraries commit them and 8 executable-style tools do not.
- Frame artifact table assumes a `swift-package` rule can say "tools 6.0 floor, Swift 6 mode"; 11 of 35 6.x repos still carry `.v5` modes, so tools-version is not language mode.
- Frame assumes `--static-swift-stdlib` is the "-static-stdlib" release recipe; on 6.3 and 6.4 with the default swiftbuild system it fails to link Foundation CLIs (E8). The static Linux SDK is the recipe that works.
- Frame treats Bazel as a build-system migration target (`bazel-quality/swift.md` beside `go.md`); in this corpus Bazel appears only as a release/bridge path (SwiftLint) or as rules_swift's own repo; 35 of 40 repos have none.
- Frame says swift-syntax "dependency cost" is the macro problem; SwiftPM now defaults to prebuilts (`swift-package-manager@5546f44a3b52:Sources/CoreCommands/Options.swift:220-223`), so by source reading (not timed) the cost is the pin policy (range vs exact vs prerelease) more than compile time for release-version pins.
- Frame's Android SDK 6.4 question is not addressed here (other agent).

## Gaps

- No macOS, no Xcode: XCFramework, notarization, codesign, Xcode-managed Package.resolved, and Apple-platform CI were read, not run (T3 columns xcframework, notarize, codesign are keyword census only).
- Windows and Android builds not run; the Windows host is available (`grim-wintest`) but this audit was Linux-only.
- No timing variance (n = 1 per experiment cell); the 59.3 MB musl size is unstripped, strip and UPX not measured.
- Prod/test classification leaks test-helper modules (ArgumentParserTestHelpers, ContainerTestSupport); T4/T5 counts are upper bounds.
- Keyword CI census (T6) conflates enabled with referenced; spot-read FP before the `: false` filter was 1 in 3-4 per pattern, after the filter not re-sampled.
- Tag style across the 40 exemplars (depth-1 clones carry no tag list); README lockfile policy statements not searched.
- The Embedded Swift and Wasm release paths (JavaScriptKit `PackageToJS`, embedded-examples) were counted, not built.
- rules_swift hermetic toolchain not exercised (no Bazel in the toolchain image).
- Prebuilt swift-syntax behaviour for prerelease pins is inference from source, not run; `swift build --enable-experimental-prebuilts` timing not measured.
- Release supply-chain claims are limited to the files in the depth-1 clone; secrets-backed steps (signing identity, notarytool credentials) are invisible.
