---
paths:
  - "**/Package.swift"
  - "**/Package@swift-*.swift"
  - "**/Package.resolved"
  - "**/.swift-format"
  - "**/.swiftformat"
  - "**/.swiftlint.yml"
  - "**/.swift-version"
  - "**/.spi.yml"
summary: The Swift package and build-config index, with the gate, the non-negotiables, the SW-PKG rules, and where the manifest, lint-gate and release depth lives
keywords: swift,swiftpm,package,manifest,swift-format,swiftlint,toolchain,release,ci
license: Apache-2.0
repository: https://github.com/ocx-sh/grimoire-lore
---

# Swift Package

Traps, not tutorials. Every line names a mistake an agent makes by default in a manifest, a lock file, a format or lint
config or a release build. SwiftPM semantics and the manifest API are already in the model.

Contents: [The Gate](#the-gate) · [Non-Negotiables](#non-negotiables) ·
[Rules This File Owns](#rules-this-file-owns) · [The Manifest Skeleton](#the-manifest-skeleton) ·
[Where the Depth Is](#where-the-depth-is) · [Severity](#severity) · [Siblings](#siblings)

Installed with the 8 globs in the frontmatter: manifests (the versioned `Package@swift-*.swift` too), `Package.resolved`,
the swift-format, SwiftFormat and SwiftLint configs, `.swift-version` and `.spi.yml`. A `*.swift` source file,
`.swiftlint.yaml`, a workflow, a `Dockerfile`, an `.xcconfig` or a `*.pbxproj` never loads it, and the `swift-quality`
index routes those by task. The two rules ship together in the `swift-essentials` bundle. Binds to Swift 6.4.0 (current),
6.3.3 (previous) and a `swift:6.2.0` floor leg for libraries and the SDK (pinned default, verify the patch per tree, SW-GATE-25), swift-subprocess
1.0.1, SwiftLint 0.65.1 and Static Linux SDK 0.1.0 (measured 2026-10-10 on Linux x86_64). macOS, Xcode, Windows and Wasm
rows are `unverified: read only`. "The SDK" is a library that wraps the project's CLI binary, a pinned default the adopter
renames or drops.

**Read the manifest in effect before any edit (SW-PKG-06): a `Package@swift-*.swift` file can shadow `Package.swift`, and
`swift package migrate` then edits the dead one and exits 0.** The `dump-package` audits below need `jq`, which the
`swift` images do not ship.

## The Gate

Run the floor-read line (after `set -o pipefail`) before the first manifest edit and again after it. The rest run in order from the package root, each
judged on its exit status. The full ordered done-gate (format triple, K-07 scan, build, test, API-breakage, DocC) is
SW-GATE-01, quoted in `swift-quality` and defined in `gates.md`, and it runs after every change.

```sh
set -o pipefail    # without it a toolchain older than the manifest makes jq print nothing and the audit reads green
# floor-read (SW-PKG-06, SW-CORE-04): the tools version, the language mode and the features in effect
swift --version && ls Package*.swift && swift package tools-version && swift package dump-package | jq -c '{tools: .toolsVersion._version, packageModes: .swiftLanguageVersions, targets: [.targets[] | select(.type == "regular" or .type == "executable" or .type == "test") | {name, features: [.settings[].kind | to_entries[] | "\(.key)=\(.value._0 // "")"]}]}'
swift build -Xswiftc -warnings-as-errors     # SW-GATE-13. Add --force-resolved-versions exactly when Package.resolved is tracked (SW-GATE-03). Exit 0 does not cover a .v5 target on 6.4 (gates.md mode5-warnings)
git diff --exit-code -- Package.resolved     # SW-PKG-29, after any plain build. Exit 1 is the finding
```

A task is done when a command, its exit code and the tree it ran against are all named. Narration is not evidence.

## Non-Negotiables

Every line below blocks a merge within the scope it names. IDs resolve through
[Where the Depth Is](#where-the-depth-is), where each rule carries its rationale and verification.

| # | Rule | ID |
|---|---|---|
| 1 | Never reach green by weakening the check (a dropped `--strict`, `--force-resolved-versions`, `-warnings-as-errors`, API-breakage or sanitizer step, a `.v5` opt-out, a linter suppression, an edited `.swift-format`), and never trust a verification nobody watched go red. | SW-CORE-01, SW-CORE-02 |
| 2 | A change is done only when every applicable step of the done-gate exits 0 on the tree you changed. The format step is the triple over the git-aware file list with `--strict`, never `swift format lint Sources`. CI builds and tests with `-Xswiftc -warnings-as-errors` on every release-toolchain leg. | SW-GATE-01, SW-GATE-02, SW-GATE-13 |
| 3 | Read the manifest in effect before editing it and prove the edit landed with the `dump-package` count. Never `head -1 Package.swift` and never the key `.swiftLanguageModes`. | SW-PKG-06, SW-CORE-04 |
| 4 | A new manifest declares tools 6.2 or later. No package-level `.v5` list, and no `defaultSwiftSettings:` (a compile error on 6.4). | SW-PKG-11, SW-PKG-14, SW-PKG-01 |
| 5 | Every regular, executable and test target of a new package enables `ExistentialAny`, `MemberImportVisibility` and `InternalImportsByDefault` (SW-PKG-07). The shared loop for them is SW-PKG-18, a SHOULD. | SW-PKG-07, SW-PKG-18 |
| 6 | `unsafeFlags` only at tools 6.2 or later, or behind a toggle that is off for consumers. `defaultIsolation(MainActor.self)` never appears in a library, SDK, CLI or server manifest. | SW-PKG-04, SW-PKG-19 |
| 7 | A published library declares every dependency with `from:` or a half-open range, never `branch:`, `revision:` or a closed range, and the root manifest of a tagged library has no `.package(path:)`. swift-syntax is a multi-major range, and no `.product(name: "_...")` appears. | SW-PKG-09, SW-PKG-10, SW-PKG-24, SW-REL-17 |
| 8 | A repo that ships tracks `Package.resolved` (a package with no dependencies writes none), builds a fresh checkout with `--force-resolved-versions` and fails on `git diff --exit-code -- Package.resolved` after a plain build. | SW-PKG-26, SW-PKG-28, SW-PKG-29 |
| 9 | Edit a formatter or lint config only in a change about the gate. Keep an adopted repository's indentation, keep the full `rules` block, and never run a second formatter. | SW-GATE-05, SW-GATE-06, SW-GATE-09 |
| 10 | `.swift-version` holds one exact patch (`6.4.0`), never `6.4` or `latest`. | SW-REL-01 |
| 11 | Never present `--static-swift-stdlib` as the static recipe: build with `--swift-sdk <arch>-swift-linux-musl`. Locate products with `--show-bin-path` plus the build's own flags, never `.build/release` or `.build/<triple>/...`. | SW-REL-03, SW-REL-04 |
| 12 | Never move, re-create or delete a pushed release tag. The next patch fixes a bad release. | SW-REL-19 |

## Rules This File Owns

The SW-PKG family is defined here and in [swift-package/manifest.md](swift-package/manifest.md), nowhere else. This file
keeps every MUST row and the three SHOULD rows the skeleton below pins or instantiates (SW-PKG-02, SW-PKG-12, SW-PKG-18).
`manifest.md` holds the other 22 rows whole, IDs unchanged. A grep, awk or find check prints its violation, so empty output
is the pass (ignore grep's exit status: 1 on no match, 123 behind `xargs`), and a presence check (`grep -L`) lists the
violators. Run each from the package root. The PKG-02, PKG-11, PKG-12 and PKG-13 cells read `./Package.swift` only, because a
nested `Benchmarks` or fixture manifest is no product root (a monorepo runs them per package directory). A
`Package@swift-*.swift` that shadows it is checked per file (manifest.md, Dates and Defaults). Before trusting an empty
result confirm the operand holds manifests: `find . -name 'Package*.swift' -not -path '*/.build/*'` prints a path. Every grep
over `.` carries `--exclude-dir='.build'`, because a built tree leaks `.build/checkouts/**/Package.swift`.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-PKG-01 | Never write `defaultSwiftSettings:` or `.defaults` inside `swiftSettings`. Apply shared settings with SW-PKG-18's loop. | SE-0540 is accepted with modifications (2026-09-06) and unshipped, so on Swift 6.4 the manifest fails `extra argument 'defaultSwiftSettings' in call` (exit 1). The implementation, [swift-package-manager#10033](https://github.com/swiftlang/swift-package-manager/pull/10033), was open and blocked on 2026-10-10. A helper variable with that name is legal. | `swift build` exits 1, and block `default-settings` prints the line (empty output = pass). Watched red and green (measured 2026-10-10, 6.4.0). Re-run when #10033 ships, then the loop body moves into the argument unchanged. | MUST |
| SW-PKG-02 | The root manifest of a library, SDK, CLI or server carries `.treatWarning("StrictLanguageFeatures", as: .error)` in the shared settings, and CI builds on a toolchain that knows every listed feature name. Never pair it with a name newer than the floor compiler (`ImmutableWeakCaptures` and the `ExplicitSendable` group are 6.3). | An unknown upcoming or experimental name is ignored silently (`NonIsolatedNonsendingByDefault` built green). The guard turns a typo into an error and is root-only, so it never fails a dependent (SW-GATE-14, SW-GATE-29). 0 of 38 corpus roots use it and two ship dead names (`LifetimeDependence`). | `grep -L -e 'treatWarning("StrictLanguageFeatures", as: .error)' ./Package.swift` lists the root manifest without it (empty output = pass). A typo plus the guard makes `swift build` exit 1 with `is not a recognized upcoming feature`, the typo alone exits 0. Watched (measured 2026-10-10, 6.4.0 and 6.3.3). The 6.2 compiler was not run (`unverified: not run`). | SHOULD |
| SW-PKG-04 | A manifest that contains `unsafeFlags` declares tools 6.2 or later, or gates the flag behind a toggle that is off for consumers (`#if SYSTEM_CI`, an environment variable). The flags are diagnostic-only, and anything a typed `SwiftSetting` covers (`treatWarning`, `strictMemorySafety`, `defaultIsolation`) uses the typed setting. | Below tools 6.2 a consumer that resolves the package from a version tag fails `contains unsafe build flags` (exit 1), at 6.2 the same file builds, and branch and path dependencies are exempt. After 6.2 SwiftPM stops protecting consumers from a bad flag, so the author must. | Block `unsafe-prefilter` lists manifests with `unsafeFlags` and no tools 6.2 (empty output = pass, `xargs` exits 123 when `grep -L` lists a file). Each hit is a defect unless a toggle gates it, a reading heuristic because a grep cannot see a compile condition. The real check is a consumer `swift build` of the dependency by tag. Watched red and green (measured 2026-10-10, 6.4.0 and 6.3.3). | MUST |
| SW-PKG-06 | Before editing a manifest run `floor-read` from the gate block. Never `head -1 Package.swift`, never the key `.swiftLanguageModes`. If `ls` lists a `Package@swift-*` file, read SW-PKG-21 before editing. | The tools-version comment may sit on a later line (since Swift 6.0), the package-level key is `swiftLanguageVersions` and a `null` list means mode 6 on tools 6.x, per-target modes win in both directions, and a versioned file can shadow the edit. `swift package tools-version` also works on a toolchain too old to load the manifest. | `floor-read`: read the tools version (the floor you may not silently move), `packageModes` with any `swiftLanguageMode=5` entry, and the feature list. Without `jq`: `swift package tools-version` and `grep -n -e 'swiftLanguageMode' -e 'enableUpcomingFeature' Package.swift` (blind to loops). Watched red for the wrong forms (`head -1` printed a copyright line, `.swiftLanguageModes` printed `null`) and green on a shadowed fixture (measured 2026-10-10, 6.4.0). | MUST |
| SW-PKG-07 | Every `.regular`, `.executable` and `.test` target of a new package enables `ExistentialAny`, `MemberImportVisibility` and `InternalImportsByDefault` through `.enableUpcomingFeature("...")` in SW-PKG-18's loop. A dependency that appears in public API is then imported `public import`. | All three exist at the 6.2 floor, change no runtime behaviour and catch the commonest pre-6 idioms (bare protocol types, leaked imports, lookup through transitive imports). Corpus adoption is 15, 19 and 11 of 38. Existing packages adopt the migratable ones through SW-PKG-32 (`InternalImportsByDefault` is not migratable). | Block `features-missing` with the three names (output = Swift targets missing one, empty output = pass). Watched red on the 6.4 `swift package init` template and green on the skeleton (measured 2026-10-10, 6.4.0 and 6.3.3). A C or Clang-module target is skipped through `describe` (`module_type`), because `dump-package` cannot tell it from a Swift one: swift-markdown's `CAtomic` printed a finding that cannot be fixed, and a twin with a C target and the loop prints nothing (measured 2026-10-10, 6.4.0). On a leaf CLI `InternalImportsByDefault` protects no public API and may be dropped from `NEED`. | MUST |
| SW-PKG-09 | A published library or the SDK declares each dependency with `from:` or a half-open range `"a"..<"b"`. Never `branch:`, `revision:` or a closed range `"a"..."b"`, and `exact:` only with SW-PKG-22's reason. Roots that ship follow SW-PKG-22. | A `branch:` dependency fails the consumer's resolve (`required using a stable-version but ... depends on an unstable-version package`, exit 1), a closed range admits the next major (`"1.0.0"..."2.0.0"` resolved 2.0.0), and `from: "1.0"` fails with an opaque `invalid manifest`. | Block `requirements` (the first command prints a violation). It sees only `sourceControl` dependencies, so the second command of the block covers registry and path ones: it lists every `exact:`, `branch:` and `revision:` line, so pair it with SW-PKG-22's reason check (an `exact:` with a reason is allowed). Watched red and green (measured 2026-10-10, 6.4.0 and 6.3.3). | MUST |
| SW-PKG-10 | A library, macro or plugin package that depends on swift-syntax and is consumed by others declares a half-open range with a lower bound at most `current-2` and an upper bound at least `current+1` (2026-10-10 with Swift 6.4 = 604: lower 602 or less, upper 605 or more) and no prerelease bound. `from:`, `exact:`, `branch:`, `revision:` and `-latest` bounds appear only in a leaf executable nobody depends on. | A swift-syntax major is a Swift release, so `from: "604.0.0"` is one major and conflicts with every sibling on another (4 of 4 combinations exit 1), and a prerelease `exact:` conflicts with every range-pinned sibling. Point-Free's `"509.0.0"..<"605.0.0"` passes, `"600.0.0"..<"604.0.0"` excludes 6.4's own major. | Block `swift-syntax-range` with `lo` 602 and `hi` 605, bumped at each Swift release (empty output = pass). Watched red on branch, exact, `from:` and a stale upper bound and green on a 600 to 606 range (measured 2026-10-10, 6.4.0). | MUST |
| SW-PKG-11 | A new `Package.swift` declares `// swift-tools-version: 6.2` or later. | Below 6.2 the manifest loses `treatWarning`, `strictMemorySafety`, `defaultIsolation` and the relaxed `unsafeFlags` rule (`treatWarning` at 6.1 exits 1, `unavailable`). 15 of 38 corpus roots are below 6.2 and stay, new ones do not. | `grep -L -e 'swift-tools-version: *6\.[2-9]' -e 'swift-tools-version: *6\.[1-9][0-9]' -e 'swift-tools-version: *[7-9]\.' ./Package.swift` lists the root manifest when below 6.2 (empty output = pass). Never run it over `Package@swift-*.swift`, a versioned file is lower by design. Watched red and green (measured 2026-10-10). | MUST |
| SW-PKG-12 | **Pinned (owner Q1), manifest-gated.** A library and the SDK declare exactly tools `6.2`, raised only for a feature or dependency that needs it, with the reason in the commit message. A leaf CLI or server declares the current release (`6.4`). A repo that also exports a reusable library product splits that library out at 6.2. | 6.3 and 6.4 add almost no manifest API, every 6.4-tools library in the corpus needs fallback manifests, and a raised floor freezes `from:` consumers on the old release without a warning (6.4 resolved 1.1.0, 6.3.3 resolved 1.0.0, exit 0). The SDK cannot sit below swift-subprocess (6.2). | Library or SDK root: `grep -L -e 'swift-tools-version: *6\.2' ./Package.swift` lists the violator. CLI or server root: `grep -L -e 'swift-tools-version: *6\.[4-9]' -e 'swift-tools-version: *6\.[1-9][0-9]' -e 'swift-tools-version: *[7-9]\.' ./Package.swift`. Empty output = pass. Watched red and green (measured 2026-10-10). The `swift:6.2.0` CI leg is `unverified: not run`. | SHOULD |
| SW-PKG-14 | No package-level `swiftLanguageModes: [.v5]` or `swiftLanguageVersions: [.v5]`. A package that must stay in mode 5 during a migration holds it per target with `.swiftLanguageMode(.v5)` (SW-PKG-15), never at package level, and removes each when its target migrates. Below tools 6.0 only the package-level `swiftLanguageVersions:` exists, so raise tools first (SW-PKG-33) and date the list with a `//` reason until then. At tools 6.0 or later rename the key, never add `swiftLanguageModes:` beside it. | A package-level 5 hides every target from the other checks (Alamofire: tools 6.4 with `[.v5]`). Effective mode, measured: `[.v5]` gives 5, `[.v6, .v5]` and `[.v5, .v6]` give 6, and a per-target mode beats the list in both directions. At tools 5.9 `.swiftLanguageMode` and `swiftLanguageModes:` are `unavailable` (exit 1), and both keys together are `extra argument 'swiftLanguageModes' in call` (exit 1). | `grep -rnE --exclude-dir='.build' -e 'swiftLanguageModes: *\[ *\.v5 *\]' -e 'swiftLanguageVersions: *\[ *\.v5 *\]' --include='Package*.swift' .` and block `modes-effective` print a line per violation (empty output = pass, a hit below tools 6.0 passes with its dated reason). Watched red on `[.v5]` and green on `[.v5, .v6]` (measured 2026-10-10, 6.4.0 and 6.3.3), the tools 5.9 and both-keys errors on 6.4.0. | MUST |
| SW-PKG-18 | Settings common to all targets are applied by one `for target in package.targets where [.regular, .executable, .test].contains(target.type)` loop after `Package(...)`. Per-target extras go inline, and `swiftSettings: someVariable` (a bare identifier) never appears. | The loop cannot be forgotten on a new target, skips `.macro` and `.plugin` targets and shows in `dump-package`. A bare variable makes `swift package migrate` rewrite the sources and then fail (`unable to find array literal for 'swiftSettings' argument`, exit 1). 11 of 38 corpus roots loop. | SW-CORE-13's `fold-check.sh` from the package root: each printed `file:line` is a feature literal outside the loop (empty output with exit 0 = pass, exit 66 = no manifest below the directory). A bare variable whose array holds no feature literal passes it, so read the diff for one. Watched red (12 literals) and green (0) under SW-CORE-13 (measured 2026-10-10, 6.4.0 and 6.3.3). | SHOULD |
| SW-PKG-19 | `defaultIsolation(MainActor.self)` appears only in app targets, never in a library, SDK, CLI or server manifest. SW-CONC-11 owns the prohibition and this is its manifest-side grep, at the same severity. | Consumers compile library code under their own default isolation, and a CLI's entry point is already `@MainActor`. 0 of 38 corpus roots set it (owner Q3). | `grep -rn --exclude-dir='.build' --include='Package*.swift' -e 'defaultIsolation(MainActor' .` prints each hit, which must sit in an app target (empty output = pass). Watched red and green (measured 2026-10-10). | MUST |
| SW-PKG-24 | No `.product(name: "_...")` and no dependency on an underscored target. If one is unavoidable the dependency uses `exact:` with a dated reason (SW-PKG-22). | "Any product beginning with an underscore is not subject to semantic versioning" (swift-crypto README, read 2026-10-10). A planted minor bump renamed one product (resolve error, exit 1) and changed a signature in another (compile error, exit 1) while the public product kept building. 8 of 38 corpus roots use one, `_NIOFileSystem` among them. | `grep -rn --exclude-dir='.build' --include='Package.swift' -e 'product(name: "_' -e 'name: "_[A-Za-z0-9]*", *package:' .` (empty output = pass). Watched red and green (measured 2026-10-10, 6.4.0 and 6.3.3). | MUST |
| SW-PKG-26 | A repo that ships a binary, app, container image or service tracks `Package.resolved`. A package with no dependencies writes none and is exempt. | The file is a cache, not a lock, unless SW-PKG-28's flag is used, and consumers ignore a dependency's own file. Corpus: 10 repos track it, 23 ignore it, 7 have none, and only tuist and containerization enforce it. | `git ls-files --error-unmatch Package.resolved` exits 0 when tracked and 1 when not. Watched red and green (measured 2026-10-10, 6.4.0 and 6.3.3); a build of a package with no dependencies wrote no file (measured 2026-10-10, 6.4.0). | MUST |
| SW-PKG-28 | CI builds a repo that tracks the lock on a fresh checkout or an empty scratch directory with `swift build --force-resolved-versions` (aliases `--disable-automatic-resolution`, `--only-use-versions-from-resolved-file`, also accepted by `swift test` and `swift run`). There is no `--locked`, `--frozen` or `--offline`. | The flag makes SwiftPM a lockfile consumer: exit 1 when a requirement is raised past a pin or a dependency is added (`out-of-date resolved file`) and when the file is missing on a cold scratch directory. On a warm scratch directory with the file deleted it exits 0, a false green, which is why the fresh directory is part of the rule. | Block `lock-gate` exits 0 in a fresh clone. The CI wiring is SW-GATE-03's `resolved-pairing`. Watched red and green on both toolchains, including the warm-scratch false green (measured 2026-10-10). | MUST |
| SW-PKG-29 | After any plain `swift build`, `swift test` or `swift package resolve` step, CI fails on `git diff --exit-code -- Package.resolved`. Review `pins`, never `originHash`. | A plain build re-resolves and rewrites the file with exit 0 after a manifest edit (a raised requirement moved a pin from 1.0.0 to 1.1.0 and nothing failed). `originHash` hashes the root manifest bytes and the dependency locations, is consulted only best-effort, and a stale value is normal. None of the 10 corpus lock trackers runs this check. | `git diff --exit-code -- Package.resolved`: exit 1 is the finding. Watched red and green (measured 2026-10-10, 6.4.0 and 6.3.3). | MUST |

```sh
# default-settings (SW-PKG-01): output is a violation. The pipe keeps a same-named helper variable legal
grep -rn --exclude-dir='.build' --include='Package*.swift' -e 'defaultSwiftSettings *:' -e 'swiftSettings: *\[ *\.defaults' . | grep -v -E '(let|var) +defaultSwiftSettings'
# unsafe-prefilter (SW-PKG-04): output is a manifest with unsafeFlags and no tools 6.2
grep -rlZ --exclude-dir='.build' -e 'unsafeFlags' --include='Package.swift' . | xargs -r -0 grep -L -e 'swift-tools-version: *6\.[2-9]' -e 'swift-tools-version: *6\.[1-9][0-9]' -e 'swift-tools-version: *[7-9]\.'
# features-missing (SW-PKG-07, SW-PKG-08): NEED lists the names to demand, output is a Swift target missing one (skip = the C and Clang-module targets, which take no Swift feature)
NEED='["ExistentialAny","MemberImportVisibility","InternalImportsByDefault"]'    # SW-PKG-08 demands ["NonisolatedNonsendingByDefault","InferIsolatedConformances"]
swift package dump-package | jq -r --argjson need "$NEED" --argjson skip "$(swift package describe --type json | jq -c '[.targets[] | select(.module_type != "SwiftTarget") | .name]')" '.targets[] | select((.type == "regular" or .type == "executable" or .type == "test") and (.name | IN($skip[]) | not)) | .name as $n | ([.settings[].kind.enableUpcomingFeature._0 // empty]) as $have | ($need - $have) | select(length > 0) | "\($n): missing \(join(","))"'
# requirements (SW-PKG-09): output is a violation, a closed range shows as an upper bound with a non-zero patch
swift package dump-package | jq -r '.dependencies[] | (.sourceControl // [])[] | select(.requirement | has("exact") or has("branch") or has("revision") or (has("range") and (.range[0].upperBound | test("\\.[0-9]+\\.[1-9][0-9]*$")))) | "\(.identity): \(.requirement | tojson)"'
grep -rn --exclude-dir='.build' --include='Package.swift' -e 'exact:' -e 'branch:' -e 'revision:' -e '"[0-9.]*" *\.\.\. *"' .
# swift-syntax-range (SW-PKG-10): lo and hi are current-2 and current+1, bump them at each Swift release
swift package dump-package | jq -r --argjson lo 602 --argjson hi 605 '.dependencies[] | (.sourceControl // [])[] | select(.identity == "swift-syntax") | .requirement | if has("range") then (.range[0]) as $r | select(($r.lowerBound | split(".")[0] | tonumber) > $lo or ($r.upperBound | split(".")[0] | tonumber) < $hi or ($r.lowerBound | contains("-")) or ($r.upperBound | contains("-"))) else . end | "swift-syntax: " + tojson'
# modes-effective (SW-PKG-14): the first prints a package-level list without mode 6, the second inventories the targets pinned to mode 5
swift package dump-package | jq -r 'select(.swiftLanguageVersions != null and ((.swiftLanguageVersions | index("6")) == null)) | "package-level modes: \(.swiftLanguageVersions | tojson)"'
swift package dump-package | jq -r '.targets[] | select([.settings[].kind.swiftLanguageMode._0] | index("5")) | .name'
# lock-gate (SW-PKG-28): run in a fresh clone, exit 0 is the pass
S=$(mktemp -d) && swift build --force-resolved-versions --scratch-path "$S"
```

## The Manifest Skeleton

The shape every published library and SDK follows, tools 6.2 (SW-PKG-12). It is the SDK head: exactly one public library
target and one non-product spawn target, and only the spawn target lists the `Subprocess` product (SW-API-09). A plain
library drops the dependency and the spawn target. The `ExplicitSendable` line is guarded because a strict `swift:6.2.0` floor leg fails on the unknown group (SW-GATE-17). The reference names
(`ocx-sdk-swift`, `OcxSDK`, `OcxSpawn`) are examples the adopter renames.

```swift
// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "ocx-sdk-swift",
    products: [
        .library(name: "OcxSDK", targets: ["OcxSDK"])
    ],
    dependencies: [
        .package(url: "https://github.com/swiftlang/swift-subprocess", from: "1.0.1")
    ],
    targets: [
        .target(name: "OcxSpawn", dependencies: [.product(name: "Subprocess", package: "swift-subprocess")]),
        .target(name: "OcxSDK", dependencies: ["OcxSpawn"]),
        .testTarget(name: "OcxSDKTests", dependencies: ["OcxSDK"]),
    ],
    swiftLanguageModes: [.v6]
)

// Swift 6.4 has no per-package default settings (SE-0540 is accepted, not shipped): one loop sets them for every target.
for target in package.targets where [.regular, .executable, .test].contains(target.type) {
    target.swiftSettings =
        (target.swiftSettings ?? []) + [
            .enableUpcomingFeature("ExistentialAny"),
            .enableUpcomingFeature("MemberImportVisibility"),
            .enableUpcomingFeature("InternalImportsByDefault"),
            .enableUpcomingFeature("NonisolatedNonsendingByDefault"),
            .enableUpcomingFeature("InferIsolatedConformances"),
            .treatWarning("StrictLanguageFeatures", as: .error),
        ]
    #if compiler(>=6.3)
    target.swiftSettings?.append(.treatWarning("ExplicitSendable", as: .error))    // the group is unknown to a 6.2 compiler
    #endif
}
```

A CLI or server declares tools 6.4 and the same loop without the `ExplicitSendable` line (SW-GATE-17 binds libraries and
the SDK): a thin `example` executable over an `ExampleCore` library so the logic is testable, `swift-argument-parser`
`from: "1.8.0"`, and no `defaultIsolation` (SW-PKG-19). A CLI that ships also tracks `Package.resolved` and runs
SW-PKG-28 and SW-PKG-29 in CI, while the SDK library gitignores it (SW-PKG-27).

## Where the Depth Is

Read the file for the work you are about to do, not for the topic it is filed under. One level deep: these files do not
point at each other.

| Doing… | Read |
|---|---|
| Choosing a dependency requirement or a pin, adding a trait, naming a product, adding a `Package@swift-*.swift`, raising a tools version, enabling a feature on an existing package, reading `swiftLanguageMode` or `platforms:`, or depending on a macro package | [swift-package/manifest.md](swift-package/manifest.md) |
| Setting up or changing format, lint, warnings-as-errors, warning groups, TSan, API-breakage, DocC or CI matrix gates, or editing `.swift-format`, `.swiftlint.yml` or `.spi.yml` | [swift-package/gates.md](swift-package/gates.md) |
| Building release binaries or images, choosing the static Linux SDK over `--static-swift-stdlib`, checking the glibc floor, stamping a version, tagging or checksumming a release, producing an SBOM or provenance, or running the API-breakage gate before a release | [swift-package/release.md](swift-package/release.md) |
| Editing any `*.swift` file: language, concurrency, errors, API design, tests, a CLI, process or file I/O, networking or security | `swift-quality` (sibling rule: SW-LANG, SW-CONC, SW-ERR, SW-API, SW-TEST, SW-CLI, SW-IO, SW-NET and SW-SEC in its depth files, SW-CORE in its index) |
| Editing Xcode build settings, an `.xcconfig` or a `project.pbxproj`, or writing SwiftUI, Observation or Combine code | `swift-quality` (SW-APPLE in its apple depth file) |
| Writing a `swift_*` Bazel target, configuring `rules_swift` or bridging SwiftPM with `rules_swift_package_manager` | `bazel-quality` (sibling set: its `swift.md`, BZL-SWIFT) |
| Moving a package to Swift 6 mode or a new toolchain, diagnosing exit 132, 134 or 139, a hang or a race, or cutting a release | the `swift-upgrade`, `swift-diagnose` and `swift-release` skills |
| Writing a doc comment, a DocC article, a README or a CHANGELOG | `code-docs` and `docs-quality` (sibling sets) |

## Severity

MUST = Block: fix before it lands. SHOULD = Warn: fix, or state why not in the commit body. CONSIDER = Suggest: never
blocks, never re-raised after a decline.

Rules marked **pinned**, and these defaults, encode an agreed decision rather than a derivable fact. **Q1** libraries
and the SDK use tools 6.2 and an explicit Swift 6 mode, CLIs and servers the current release (SW-PKG-12). **Q2**
swift-format with the shipped `.swift-format`, 4 spaces and 120 columns (SW-GATE-04). **Q3** no
`defaultIsolation(MainActor.self)` outside apps (SW-PKG-19). **Q4** the SDK depends only on the standard library plus
swift-subprocess `from: "1.0.1"`, plus swift-docc-plugin only behind the `DOCC` environment switch of SW-GATE-21. Tags are `vX.Y.Z` and release assets are raw static binaries (SW-REL-13, SW-REL-18).
Each is a default an adopter may override once, in the manifest or the shared config, never per call site. Overriding
one is a recorded decision, and re-arguing one in a pull request is not a review comment. Names from the reference
fleet (`ocx`, `OcxSDK`, `OcxSpawn`) are examples the adopter renames.

## Siblings

- **`swift-quality`** loads on `**/*.swift` and ships beside this rule. It owns SW-CORE (weakened checks, red before
  green, empty output, the floor read, generated code, the upgrade and diagnosis rules), the done-gate block and
  every source-level family this file only cites. A manifest edit never pays for it and a source edit never pays for
  this file, except `Package.swift` itself, which both load.
- **`bazel-quality`** carries BZL-SWIFT in its `swift.md` for a repository that adopts Bazel for Swift. It loads on
  Bazel files, never on `Package.swift`.
- **`swift-upgrade`, `swift-diagnose` and `swift-release`** are the procedures behind this set. They cite SW-PKG,
  SW-GATE and SW-REL IDs and never restate them.
