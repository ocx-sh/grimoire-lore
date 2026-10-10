---
title: "Swift manifest and dependencies (SW-PKG): floors, language modes, upcoming features, shared settings, requirements, Package.resolved, swift-syntax, traits"
topic: "Manifest and dependencies (SW-PKG) -> swift-package index; rows M-K-04, M-L-01..M-L-16, M-L-21 (M-L-17..20 not researched)"
model: sonnet
id_family: SW-PKG
consolidates:
  - swift-package/manifest-policy.md
  - swift-package/dependencies-and-resolution.md
date: 2026-10-10
---

# Swift manifest and dependencies (SW-PKG), consolidated

Toolchains: Swift 6.4.0 and 6.3.3 (Linux x86_64, Docker `swift:6.4` / `SWIFT_VERSION=6.3`); no `swift:6.2` image, no macOS, no Xcode, no Windows, so every Apple, Xcode and Windows behaviour is `unverified: read only`. Citation keys: **[MP]** = [manifest-policy](swift-package/manifest-policy.md) (section, or `MP Vnn` for its Verification-runs row), **[DR]** = [dependencies-and-resolution](swift-package/dependencies-and-resolution.md) (section, or `DR Vn`), **[CN Rn]** = a re-run or new check made by this consolidation (table "Consolidation re-runs" at the end of the ruleset), **[map]** = [swift-topic-map](swift-topic-map.md), **[pkg]**, **[shape]**, **[conc]**, **[gates]**, **[cfg]** = the audits under `swift-audit/`. Exemplars are cited `<repo>@<sha12>:<path>:<line>`.

## Verdict

1. **Read the floor before editing any manifest, with one verbatim command, under `pipefail`** (SW-PKG-06). The tools-version comment may sit on line 2 or 3, the `dump-package` key is `swiftLanguageVersions` (not `swiftLanguageModes`), and a `Package@swift-X.swift` file can shadow `Package.swift`. Binds every manifest edit by an agent.
2. **Floors.** Nothing new is below tools 6.2 (SW-PKG-11, MUST). A library and the SDK declare exactly `6.2`; a leaf CLI or server declares the current release `6.4` (SW-PKG-12, SHOULD). Binds library, SDK, CLI, server; Apple app packages are `unverified: read only`.
3. **Swift 6 mode is stated** (`swiftLanguageModes: [.v6]`), package-level `.v5` is a defect (SW-PKG-14, MUST), and a `.v5` target carries a dated reason on its line or the line above (SW-PKG-15). Binds all manifests; the 6.4 `swift package init` template states no mode.
4. **Upcoming features are spelled out, never bundled.** `ExistentialAny`, `MemberImportVisibility`, `InternalImportsByDefault` are MUST on every regular, executable and test target of a new package (SW-PKG-07); `NonisolatedNonsendingByDefault` and `InferIsolatedConformances` are SHOULD for new packages (SW-PKG-08). No `ApproachableConcurrency` bundle, no Swift-6-group name in a mode-6 target, and the root manifest carries `.treatWarning("StrictLanguageFeatures", as: .error)` (SW-PKG-16, 03, 02).
5. **Shared settings use one post-definition `for target in package.targets` loop.** `defaultSwiftSettings:` is a manifest compile error on 6.4 (SW-PKG-01, MUST); a bare `swiftSettings: someVariable` makes `swift package migrate` rewrite sources and then fail (SW-PKG-18).
6. **`unsafeFlags` only at tools 6.2 or later, or behind a toggle that is off for consumers** (SW-PKG-04, MUST): a tools-6.1 dependency resolved from a tag failed its consumer on both toolchains.
7. **No versioned manifests by default.** Use `#if compiler(...)` in one file; a `Package@swift-MAJOR.MINOR.swift` is allowed only for manifest-API differences, with a strictly lower tools version and identical products, platforms and dependencies (SW-PKG-21).
8. **Library and SDK requirements are `from:` or a half-open range** (SW-PKG-09, MUST); `exact:` anywhere needs a dated reason with its removal condition (SW-PKG-22); no underscored products (SW-PKG-24, MUST); swift-crypto is `"1.0.0" ..< "6.0.0"` (SW-PKG-25); swift-syntax in a macro or plugin library is a multi-major half-open range that includes the current major, never a prerelease (SW-PKG-10, MUST) with a `canImport` ladder and a lowest-bound CI leg (SW-PKG-34).
9. **`Package.resolved` by kind.** A repo that ships (CLI, daemon, server, container image) tracks it (SW-PKG-26, MUST), builds a fresh checkout with `--force-resolved-versions` (SW-PKG-28, MUST) and fails on `git diff --exit-code -- Package.resolved` after a plain build (SW-PKG-29, MUST); a library-only repo gitignores it (SW-PKG-27). The flag alone is not a gate.
10. **Traits** are for optional heavy dependencies, source-unstable preview API and compile-out knobs; dependents write `[.defaults, "X"]` (SW-PKG-23, 35). Macro authoring stays out of fleet scope (SW-PKG-38).

### Where the sources disagreed, and how it was settled

| # | Conflict | Decision and reason |
|---|---|---|
| C1 | [map] M-L-01 checks `jq '.toolsVersion, .swiftLanguageModes'`; [MP §1] says that prints `null` even when modes are declared. | **The dive wins, measured.** Keys are `.toolsVersion._version` and `.swiftLanguageVersions`; the wrong form printed `["6.2.0",null]` for a `[.v5]` package (MP V09, red) and the right one `["6.2.0",["5"]]`. SW-PKG-06 carries the corrected command. |
| C2 | [map] conflict 8 lists service-lifecycle 2.12 among dependencies that require tools >= 6.2. | **Tools 6.1.** The release-tag manifests of 2.12.0 and 2.12.1 declare 6.1 (`swift-service-lifecycle@c55297914e26:Package.swift:1`; [MP §3, §15]). The library floor stays 6.2 because swift-subprocess (every 1.x), swift-crypto 5.0.0 and swift-log 1.15+ are 6.2, not because of service-lifecycle. |
| C3 | [map] conflict 7 says an `originHash` mismatch "triggers silent re-resolution"; [pkg] says only tuist enforces the lock. | **Narrowed and corrected** [DR §3-4]. A mismatch triggers a re-check; the file is rewritten (silently, exit 0) only when a pin no longer satisfies a requirement; the hash alone is never a freshness signal (a comment-only edit left the file byte-identical). Two repos enforce the lock, not one: tuist (`--force-resolved-versions`) and containerization (`--disable-automatic-resolution`, `containerization@3e7bc39e66b3:Makefile:28`). |
| C4 | [map] and [pkg] treat `--force-resolved-versions` as the lock gate; [DR V3] shows it exits 0 on a warm scratch dir with the file deleted. | **Three parts, three rules** (SW-PKG-26, 28, 29). Replay [CN R1] on both toolchains: tracked check red after `git rm --cached`; the flag red on a fresh scratch with the file missing or the requirement raised, and a false green (exit 0) on the warm scratch; the plain build exit 0 with `git diff --exit-code` exit 1. |
| C5 | [MP] calls all five upcoming features "required for new packages"; [map] conflict 4 says `NonisolatedNonsendingByDefault` is "recommended for new libraries and executables" and opt-in only with a build on 6.3 and 6.4 (it broke 2 of 6 packages when flipped). | **Split by evidence.** The three features with no runtime semantic change are MUST (SW-PKG-07); the two semantic ones are SHOULD (SW-PKG-08), and existing packages adopt them through `swift package migrate` plus a two-toolchain build (SW-PKG-32). |
| C6 | The 6.4 template writes `ApproachableConcurrency` into library and test targets; [map] conflict 4 treats the bundle or the individual flags as acceptable. | **Spell the two members; do not use the bundle** (SW-PKG-16). In a Swift 6 target the bundle adds only `NonisolatedNonsendingByDefault` and `InferIsolatedConformances` (three of five members are already on) [MP §5]; the semantics belong to SW-CONC, this file only fixes what the manifest lists. |
| C7 | Library floor: lowest version that carries the features used (swift-log, swift-crypto, swift-subprocess at 6.2) versus the current release (Alamofire, swift-collections, TCA, swift-dependencies, vapor at 6.4). | **6.2, measured.** All four 6.4 libraries carry versioned fallback manifests (8 files) and those drifted (Alamofire macOS 12 versus 10.13); raising a floor silently freezes `from:` consumers on the old release (6.4 resolved 1.1.0, 6.3.3 resolved 1.0.0, exit 0; `exact:` exit 1; MP V30). The corpus mode is 6.2 (16 of 38 root manifests) [MP §3]. |
| C8 | CLI floor: owner Q1 default is the current release; [MP] finds no manifest API that forces it (tools 6.3 and 6.4 add almost none; interop mode `complete` at 6.4 is the only behaviour). | **Keep the default as SHOULD** (SW-PKG-12). It is a convenience, not a requirement; a repo that also exports a reusable library product splits the library out at 6.2. |
| C9 | [MP] MP-04's per-target `.v5` check is a same-line grep `swiftLanguageMode\(\.v5\)[^/]*$`; the corpus puts the reason on the line above (`swift-collections@935f696a549a:Package.swift:324-325`) and swift-build uses a `languageMode: .v5` helper (`swift-build@2187330e13e7:Package.swift:30-54`). | **Same line or the line above, both spellings** (SW-PKG-15): an awk with `p` = previous line. The same-line grep flagged the collections site (false positive) and missed the helper. `://` in a URL also defeated naive `//` detection (every pin looked commented); `(^\|[^:])\/\/` fixes it [CN R5]. |
| C10 | [MP] MP-04's package-level grep `swiftLanguageModes: *\[\.v5` also matches `[.v5, .v6]` (swift-build `Package.swift:475`). | **Measured: `[.v5, .v6]` builds in mode 6** on both images (`-swift-version 6`) [CN R3], as `[.v6, .v5]` does [MP §1]. The check is `\[ *\.v5 *\]` (a list that is only `.v5`) plus the `dump-package` filter "list present and without `\"6\"`". Five root manifests are pure `[.v5]` [CN R10]. |
| C11 | [map] conflict 9 sets the warnings policy (a CI flag on release toolchains, nightlies exempt); [MP] asks for `.treatWarning("StrictLanguageFeatures", as: .error)` in the manifest. | **Different mechanisms, no clash.** The guard is a diagnostic group for unrecognised feature names, root-only (a consumer of the same package built green, `-suppress-warnings` on dependencies: MP V21); global warnings-as-errors stays a CI flag owned by SW-GATE. SHOULD, not MUST: the 6.2 compiler was not run (Open questions). |
| C12 | [DR] bans underscored products and calls containerization's `_NIOFileSystem` the counter-example; the root-manifest census finds 8 of 38 repos using one (vapor, hummingbird, swiftly, containerization: `_NIOFileSystem`; sourcekit-lsp, swift-format, SwiftPM, swift-foundation: `_SKLoggingForPlugin`, `_SwiftSyntaxDynamic`, `_RopeModule`, `_FoundationICU`) [CN R10]. | **The ban stays MUST for fleet code** (SW-PKG-24): the planted minor bump removed one product and changed a signature (DR V13) and the swift-crypto README puts underscored products outside SemVer. The four swiftlang/apple tool repos consume co-released products by branch; the four server repos use a product swift-nio is graduating. Exception path: an `exact:` pin with a dated reason (SW-PKG-22). |
| C13 | [DR] Exemplar D01 lists vapor's `exact: "1.6.0"` with a dated comment (`vapor@bf77fc69b142:Package.swift:86-88`) as tolerated in a published framework; D01 says a library never uses `exact:`. | **`branch:`, `revision:` and closed ranges are MUST-never; `exact:` is allowed with a reason** (SW-PKG-09 versus 22). `branch:` makes the consumer's resolve fail (DR V14, exit 1); a closed range admits the next major (DR V15, resolved 2.0.0); `exact:` only fails when a second exact pin disagrees, so a dated reason is the proportionate control. |
| C14 | swift-syntax range width: [DR] D06 "at least the last three majors, pattern `600.0.0`..<`606.0.0`" versus Point-Free's `"509.0.0"..<"605.0.0"` (TCA, dependencies, snapshot-testing) versus JavaScriptKit `"600.0.0"..<"604.0.0"`. | **Parameterised audit** (SW-PKG-10): lowest bound at or below `current-2`, upper bound at or above `current+1` (as of 2026-10-10: 602 and 605, so Point-Free's form passes and JavaScriptKit fails: it excludes 604.0.0, the swift-syntax of Swift 6.4). `+2` (`..<"606.0.0"`) is allowed only with a CI leg on the newest prerelease (SW-PKG-34), because an untested admitted major is a claim, not a fact (DR V7). |
| C15 | [DR] swift-subprocess dependency in the SDK skeleton is `from: "1.0.0"`; [map] M-G-06 (SW-IO) says `from: "1.0.1"`. | **`from: "1.0.1"`.** 1.0.1 is the latest tag and every 1.x is tools 6.2 [MP §3], so the resolved version is the same as the one the skeleton built against (the skeleton was not rebuilt with the edited lower bound: that edit changes no resolution). |
| C16 | [DR] D17 and [MP] MP-17 both claim the `.package(name:` grep. | **One rule** (SW-PKG-20), with the commented-line guard `^[^/]*`: the dive's unguarded grep matched a commented example in aws-lambda-runtime. |
| C17 | [MP §10] says all ten `unsafeFlags` manifests are at tools >= 6.1 "or behind a toggle"; root census: swift-format is tools 6.0 (a linker `unsafeFlags` behind the `installAction` env toggle, `swift-format@b15dd59fad21:Package.swift:216`) and SwiftPM is 6.1 with ungated `swiftSettings` flags (`swift-package-manager@5546f44a3b52:Package.swift:230-232,776-777`). | **Both are benign by consumption style**, not compliant: swift-format is toggled off for consumers; SwiftPM and sourcekit-lsp are consumed by branch or path, where unsafeFlags are allowed (MP V01: branch exit 0, path exit 0). The rule (SW-PKG-04) still binds anything a version tag consumes. |

## The ruleset

Conventions. A grep, awk, find or jq check's **output is the violation; empty output with exit 0 is a pass**. Before trusting an empty result, confirm the operand holds manifests: `find . -name 'Package*.swift' -not -path '*/.build/*' | head -1` prints a path (empty-output semantics, SW-CORE-03). Every grep carries `--exclude-dir='.build'` (a built tree leaks `.build/checkouts/**/Package.swift` into the result; watched with a planted tree). Every `dump-package` pipeline runs under `set -o pipefail` with stderr visible: on a toolchain older than the manifest `dump-package` fails, the pipeline prints nothing, and without `pipefail` that is a false green [CN R2]. A manifest glob is `Package*.swift`, not `Package.swift`: 8 of 40 exemplars carry 15 `Package@swift-*.swift` files that a narrower glob misses [cfg §2]. "Red" says whether the check was watched going red on a planted violation and staying green on a compliant twin: **yes** names where (`MP Vnn`, `DR Vn`, `CN Rn`); rows marked "reading heuristic" state why no mechanical check exists. Fixture roots: `F-MP` = `/home/mherwig/.cache/research-lang/swift-tools/fixtures/manifest-policy`, `F-DR` = `.../fixtures/dependencies-and-resolution`, `F-CN` = `.../build/swift-package-consolidate`. Dates and numbers are as of 2026-10-10 on Swift 6.4.0 and 6.3.3.

### A. The toolchain catches it (manifest evaluation, build or resolve exit status)

**SW-PKG-01 (MUST, any tools version; 6.4 era).** Never write `defaultSwiftSettings:` or `.defaults` inside `swiftSettings`; apply shared settings with the loop of SW-PKG-18.
- Why: SE-0540 is accepted with modifications (2026-09-06) but unshipped; implementation PR [#10033](https://github.com/swiftlang/swift-package-manager/pull/10033) was open and blocked on 2026-10-10 and the symbol is absent from `PackageDescription.swift` at `5546f44a3b52`. On 6.4 it is `error: extra argument 'defaultSwiftSettings' in call` (exit 1) [MP §8]. A helper variable that merely shares the name is legal.
- Check: `grep -rnE --exclude-dir='.build' 'defaultSwiftSettings *:|swiftSettings: *\[ *\.defaults' --include='Package.swift' . | grep -vE '(let|var) +defaultSwiftSettings'`; the build form is `swift build` exit 1.
- Red: **yes**, [MP V25] (build exit 1 on 6.4, grep red); the dive's first form `^[^/]*\.defaults\b` also matched `traits: [.defaults, "Foo"]` and a same-named variable, so it is replaced; [CN R4] the refined form prints 2 lines on `plants/defset-red` and on `default/uses-default`, 0 on a `let defaultSwiftSettings` twin, a wrapped `traits: [.defaults, "Foo"]` and the skeletons. Re-run when #10033 ships; then the loop body moves into the argument unchanged.
- Binds: every manifest.

**SW-PKG-02 (SHOULD, tools 6.2).** The root manifest of a library, SDK, CLI or server carries `.treatWarning("StrictLanguageFeatures", as: .error)` in the shared settings, and CI builds on a toolchain that knows every listed feature name.
- Why: unknown upcoming and experimental names are silently ignored by default (`NonIsolatedNonsendingByDefault` built green); the guard turns a typo into an error and is root-only, so it cannot fail a dependent (consumer exit 0, dependency built as root exit 1; `-suppress-warnings` on dependencies) [MP §6]. Two exemplars ship dead names the compiler never mentioned: `LifetimeDependence` (`vapor@bf77fc69b142:Package.swift:257`, `swift-async-algorithms@cbde9aed744b:Package.swift:78,154`) and `SuppressedAssociatedTypesWithDefaults` (`swift-collections@935f696a549a:Package.swift:118`). 0 of 38 root manifests use the guard.
- Check: presence, output = manifests without it: `grep -rL --exclude-dir='.build' -e 'treatWarning("StrictLanguageFeatures", as: .error)' --include='Package.swift' .`; effect: `swift build` fails with `is not a recognized upcoming feature [#StrictLanguageFeatures::UnrecognizedStrictLanguageFeatures]` (6.4) or `[#UnrecognizedStrictLanguageFeatures]` (6.3).
- Red: **yes**, [MP V19, V20, V21]: typo plus guard exit 1 / 1, typo without guard exit 0 / 0, corrected name exit 0; [CN R4] presence grep 2 lines on `h-init/t64` and `floor/lib-62`, 0 on the skeletons. The 6.2 compiler was not run (`unverified: not run`): see Open questions. Never pair the guard with a name introduced after the floor compiler (`ImmutableWeakCaptures` is 6.3).
- Binds: library, SDK, CLI, server.

**SW-PKG-03 (SHOULD, Swift 6.0).** No `enableUpcomingFeature` of the 15 Swift-6-group names (`ConciseMagicFile`, `ForwardTrailingClosures`, `StrictConcurrency`, `BareSlashRegexLiterals`, `DeprecateApplicationMain`, `ImportObjcForwardDeclarations`, `DisableOutwardActorInference`, `IsolatedDefaultValues`, `GlobalConcurrency`, `InferSendableFromCaptures`, `ImplicitOpenExistentials`, `RegionBasedIsolation`, `DynamicActorIsolation`, `NonfrozenEnumExhaustivity`, `GlobalActorIsolatedTypesUsability`) in a mode-6 target; a `.swiftLanguageMode(.v5)` target may list them (the migration path, `swift-build@2187330e13e7:Package.swift:30-54`).
- Why: on 6.3 and 6.4 each warns `upcoming feature 'X' already enabled as of the Swift 6 language mode`, and with `.treatAllWarnings(as: .error)` (which `swift-aws-lambda-runtime@8abd464310c7:Package.swift:7` uses) it is a build break (exit 1; the `.v5` twin exit 0) [MP §5]. SHOULD, not MUST, because the break needs warnings-as-errors, which SW-GATE owns (C11).
- Check: `grep -rnE --exclude-dir='.build' 'enableUpcomingFeature\("(ConciseMagicFile|ForwardTrailingClosures|StrictConcurrency|BareSlashRegexLiterals|DeprecateApplicationMain|ImportObjcForwardDeclarations|DisableOutwardActorInference|IsolatedDefaultValues|GlobalConcurrency|InferSendableFromCaptures|ImplicitOpenExistentials|RegionBasedIsolation|DynamicActorIsolation|NonfrozenEnumExhaustivity|GlobalActorIsolatedTypesUsability)"\)' --include='Package*.swift' .`; each hit must sit in a target the SW-PKG-15 inventory lists as `.v5`.
- Red: **yes**, [MP V17, V18]; the alternation form prints 2 lines on `feat/v6group` and 0 on the skeletons [CN R4]. The registry (15 `v6`, 6 `future`) is identical on 6.3.3 and 6.4.0 (21 names compiled under `-Werror StrictLanguageFeatures`, MP V19).
- Binds: every mode-6 target.

**SW-PKG-04 (MUST, tools 6.2).** A manifest that contains `unsafeFlags` declares tools 6.2 or later, or gates the flag behind a toggle that is off for consumers (`#if SYSTEM_CI`, an environment variable); the flags themselves are diagnostic-only (`-require-explicit-sendable`, `-require-explicit-availability=error`); anything a typed `SwiftSetting` covers (`treatWarning`, `strictMemorySafety`, `defaultIsolation`) uses the typed setting.
- Why: below 6.2 a consumer that resolves the dependency from a version tag fails with `the target 'Dep' in product 'Dep' contains unsafe build flags` (exit 1); at 6.2 the same file builds, and branch and path dependencies are exempt (exit 0) [MP §10]. After 6.2 SwiftPM no longer protects consumers from a bad flag, so the author must.
- Check: pre-filter, output = manifests with `unsafeFlags` and no tools >= 6.2: `grep -rl --exclude-dir='.build' -e 'unsafeFlags' --include='Package.swift' . | xargs -r grep -L -e 'swift-tools-version: *6\.[2-9]' -e 'swift-tools-version: *6\.[1-9][0-9]' -e 'swift-tools-version: *[7-9]\.'`; each hit is a defect unless a toggle gates it (reading heuristic: a grep cannot see a compile condition), and the real check is a consumer `swift build` of the dependency by tag.
- Red: **yes**, [MP V01, V02] (consumer of the 6.1 dependency exit 1, of the 6.2 twin exit 0, by branch exit 0, by path exit 0; both images); [CN R4] pre-filter 1 line on `a-unsafeflags/dep61`, 0 on `dep62`.
- Binds: library, SDK (consumed by tag); a leaf CLI consumed by nobody is not harmed but keeps the rule for uniformity.

**SW-PKG-05 (SHOULD, any tools version).** `platforms:` lists only Apple floors the code needs, with `.vNN` constants no newer than the manifest's tools version; never `.linux` or another non-Apple constant; a Linux-only package omits the argument; all manifests of one release (including versioned ones) carry the same list.
- Why: `.linux` is `type 'SupportedPlatform' has no member 'linux'` (exit 1); `.macOS(.v27)` needs tools 6.4 (`'v27' was introduced in PackageDescription 6.4`); Linux ignores the list (`.macOS("26.2")` builds on Linux) [MP §12]. Alamofire's four fallback manifests declare macOS 10.13 where `Package.swift` says 12 (MP V34).
- Check: `swift build` (manifest error as listed); review: `set -o pipefail; swift package dump-package | jq -c '[.platforms[] | "\(.platformName)\(.version)"]'`.
- Red: **yes** for the compile failures, [MP V28] (`plat-linux-hallucinated` exit 1 / 1, `plat-v27-tools63` exit 1 on 6.4, `plat-string-tools62` and `plat-v27-tools64` exit 0) and for the cross-manifest drift, [MP V34]. What an Apple consumer sees (deployment floor, `Mutex` availability) is `unverified: read only`.
- Binds: every manifest.

### B. `swift package dump-package | jq` audits (effective settings, formatter-independent)

**SW-PKG-06 (MUST, any tools version).** Before editing a manifest, run the read-the-floor command; never `head -1 Package.swift`, never the key `.swiftLanguageModes`; if `ls` lists a `Package@swift-*` file, read SW-PKG-21 before editing.
- Why: the tools-version comment may be on a later line since 6.0 (`vapor@bf77fc69b142:Package.swift:1-2`: line 1 is `import CompilerPluginSupport`); a `null` package-level mode list means "mode 6" on tools 6.x; per-target modes win in both directions; a versioned file can shadow the edit [MP §1, §11]. `swift package tools-version` also works on a toolchain too old to load the manifest (6.3.3 prints `6.4.0`, `dump-package` exits 1).
- Check (verbatim, from the package root): `swift --version && ls Package*.swift && swift package tools-version && swift package dump-package | jq -c '{tools: .toolsVersion._version, packageModes: .swiftLanguageVersions, targets: [.targets[] | select(.type == "regular" or .type == "executable" or .type == "test") | {name, features: [.settings[].kind | to_entries[] | "\(.key)=\(.value._0 // "")"]}]}'`. Read three things: the tools version (the floor you may not silently move), `packageModes` and any `swiftLanguageMode=5` entry (the mode), the feature list (what is on). If `jq` is missing: `swift package tools-version` plus `grep -n -e 'swiftLanguageMode' -e 'enableUpcomingFeature' Package.swift` (blind to loops).
- Red: **yes** for the wrong forms, [MP V08] (`head -1` printed `// Copyright header` on a tools-6.2-on-line-3 manifest) and [MP V09] (`.swiftLanguageModes` printed `null`); the command itself is a read, not a gate (MP V10). [CN R7] on the library skeleton (`6.2.0`, `["6"]`, five features plus the guard), on the shadowed `c2-main62-v63` (`ls` lists both files, `tools-version` prints `6.3.0` against a 6.2 comment) and on the 6.4 template (`6.4.0`, `null`, the bundle only).
- Binds: every manifest edit.

**SW-PKG-07 (MUST, tools 6.2).** In a new package every `.regular`, `.executable` and `.test` target enables `ExistentialAny`, `MemberImportVisibility` and `InternalImportsByDefault` through `.enableUpcomingFeature("...")` (via the loop of SW-PKG-18); a dependency that appears in public API is then imported `public import`.
- Why: all three exist at the 6.2 floor (SE-0335 flag 5.8, SE-0409 6.0, SE-0444 6.1), change no runtime behaviour, and catch the commonest pre-6 idioms (bare protocol types, leaked imports, member lookup through transitive imports); corpus adoption 15, 19 and 11 of 38 respectively [MP §5]. The SDK skeleton needs `public import Subprocess` because `OCX` exposes `Subprocess.Executable`, and `MemberImportVisibility` rejected a `.trimmingCharacters` without `import Foundation` [MP §14].
- Check, output = targets missing a name: `set -o pipefail; swift package dump-package | jq -r --argjson need '["ExistentialAny","MemberImportVisibility","InternalImportsByDefault"]' '.targets[] | select(.type == "regular" or .type == "executable" or .type == "test") | .name as $n | ([.settings[].kind.enableUpcomingFeature._0 // empty]) as $have | ($need - $have) | select(length > 0) | "\($n): missing \(join(","))"'`.
- Red: **yes**, [MP V23] and [CN R2]: the 6.4 template prints `Tmpl: missing ExistentialAny,MemberImportVisibility,InternalImportsByDefault` and the same for `TmplTests`; the library and SDK skeletons print nothing. Existing packages adopt a feature through SW-PKG-32, not by editing the list.
- Binds: library, SDK, CLI, server (new packages); `InternalImportsByDefault` on a leaf CLI protects no public API and may be dropped from that kind's `$need` list.

**SW-PKG-08 (SHOULD, tools 6.2).** A new package also enables `NonisolatedNonsendingByDefault` and `InferIsolatedConformances` on the same targets; an existing package flips them only through SW-PKG-32 with a build on 6.3 and 6.4. `ImmutableWeakCaptures` is not listed in a package whose floor is below 6.3.
- Why: both exist at 6.2 (SE-0461, SE-0470); the first removes the "nonisolated async hops off-actor" trap but is a semantic change (it broke 2 of 6 packages when flipped, `swift-service-lifecycle@c55297914e26:Sources/UnixSignals/UnixSignalsSequence.swift:80`); SE-0481 is Implemented 6.3, so on a 6.2 floor it is ignored silently or fatal under the guard [MP §5; map conflict 4]. SHOULD because [map] says "recommended" (C5).
- Check: the SW-PKG-07 command with `--argjson need '["NonisolatedNonsendingByDefault","InferIsolatedConformances"]'`.
- Red: **yes**, [CN R2]: `Tmpl: missing NonisolatedNonsendingByDefault,InferIsolatedConformances` on the 6.4 template, empty on the skeletons (6.4 image).
- Binds: library, SDK, CLI, server (new packages).

**SW-PKG-09 (MUST, any tools version).** A published library or the SDK declares each dependency with `from:` or a half-open range `"a"..<"b"`; never `branch:`, `revision:` or a closed range `"a"..."b"`; `exact:` only with SW-PKG-22's reason.
- Why: a library with a `branch:` dependency fails its consumer's resolve (`package 'pubbranch' is required using a stable-version but 'pubbranch' depends on an unstable-version package 'base'`, exit 1); a closed range admits the next major (`"1.0.0"..."2.0.0"` resolved 2.0.0); `from: "1.0"` fails with an opaque `invalid manifest (evaluation failed)` [DR §5]. The swiftlang `branch:` idiom is legal only in roots and co-released repos.
- Check, output = violations (formatter-independent, a closed range shows as an upper bound with a non-zero patch): `set -o pipefail; swift package dump-package | jq -r '.dependencies[] | (.sourceControl // [])[] | select(.requirement | has("exact") or has("branch") or has("revision") or (has("range") and (.range[0].upperBound | test("\\.[0-9]+\\.[1-9][0-9]*$")))) | "\(.identity): \(.requirement | tojson)"'`. Blind spot: only `sourceControl` dependencies; registry and path dependencies need the grep `grep -rn --exclude-dir='.build' -e 'exact:' -e 'branch:' -e 'revision:' -e '"[0-9.]*" *\.\.\. *"' --include='Package.swift' .`.
- Red: **yes**, [DR V14, V15, V17, V18]; [CN R2] the jq prints 3 lines on a root with `exact`, `branch` and `revision` (6.4), `dep: {"range":[{"lowerBound":"1.0.0","upperBound":"2.0.1"}]}` for the closed range, `dep: {"branch":["main"]}` for the branch, and nothing for `from:` and `"1.0.0"..<"2.0.0"`.
- Binds: library, SDK; roots that ship are governed by SW-PKG-22.

**SW-PKG-10 (MUST, any tools version).** A library or macro or plugin package that depends on swift-syntax and is consumed by others declares a half-open range whose lower bound is at most `current-2` and whose upper bound is at least `current+1` (as of 2026-10-10 with Swift 6.4 = 604: lower <= 602, upper >= 605), with no prerelease bound; `from:`, `exact:`, `branch:`, `revision:` and `-latest`/`-prerelease` bounds appear only in a leaf executable nobody depends on (SwiftLint, swift-testing).
- Why: a swift-syntax major is a Swift release, so `from: "604.0.0"` is exactly one major and conflicts with every sibling on another (4 of 4 combinations exit 1); a prerelease `exact:` conflicts with every range-pinned sibling; `from: "605.0.0-latest"` drags the graph onto the newest prerelease; a `branch:` pin in a root overrides sibling ranges and gives no release [DR §6]. Point-Free and mbrandonw: "as permissive as possible" ([post 116](https://www.pointfree.co/blog/posts/116-being-a-good-citizen-in-the-land-of-swiftsyntax), [forum 82587](https://forums.swift.org/t/macros-in-foundational-libraries/82587)).
- Check, output = violations: `set -o pipefail; swift package dump-package | jq -r --argjson lo 602 --argjson hi 605 '.dependencies[] | (.sourceControl // [])[] | select(.identity == "swift-syntax") | .requirement | if has("range") then (.range[0]) as $r | select(($r.lowerBound | split(".")[0] | tonumber) > $lo or ($r.upperBound | split(".")[0] | tonumber) < $hi or ($r.lowerBound | contains("-")) or ($r.upperBound | contains("-"))) else . end | "swift-syntax: " + tojson'`; bump `lo` and `hi` when a new Swift ships. Grep fallback: `grep -rn --exclude-dir='.build' -e 'swift-syntax[^)]*from:' -e 'swift-syntax[^)]*exact:' -e 'swift-syntax[^)]*branch:' -e 'swift-syntax[^)]*-latest' -e 'swift-syntax[^)]*-prerelease' --include='Package.swift' .`.
- Red: **yes**, [DR V6, V19, V20] (resolution: `MExact`+`MRange`, `MExact`+`MFrom`, `MFrom603`+`MFrom` all exit 1; the range-only twin 604.0.0); [CN R9] the parameterised jq prints a line for `MBranch`, `MExact`, `MFrom`, `MFrom603`, `MLatest` and the stale-upper plant `600.0.0..<604.0.0`, nothing for `MRange` (600..<606) and `MPfree` (509..<605).
- Binds: library, SDK, macro or plugin package; leaf tools are exempt by their own review line.

### C. grep, awk and find on manifest text

**SW-PKG-11 (MUST, any tools version).** A new `Package.swift` declares `// swift-tools-version: 6.2` or later.
- Why: tools below 6.2 lose `treatWarning`, `strictMemorySafety`, `defaultIsolation` and the relaxed unsafeFlags rule (`treatWarning` at 6.1 is `'treatWarning(_:as:_:)' is unavailable`, exit 1) [MP §3]. 15 of 38 corpus root manifests are below 6.2; they stay (SW-PKG-33 governs raising), new ones do not.
- Check, output = manifests below 6.2: `grep -rL --exclude-dir='.build' -e 'swift-tools-version: *6\.[2-9]' -e 'swift-tools-version: *6\.[1-9][0-9]' -e 'swift-tools-version: *[7-9]\.' --include='Package.swift' .` (ignore the exit status of `grep -L`; run the same with `--include='Package@swift-*.swift'` only to read, not to gate: a versioned file is lower by design).
- Red: **yes**, [MP V12, V28]; [CN R4] 1 line on `floor/` (the tools-6.1 library), 0 on 6.2, `6.2.1` and 6.4 manifests and the skeletons.
- Binds: new manifests of library, SDK, CLI, server; Apple app packages `unverified: read only`.

**SW-PKG-12 (SHOULD, tools 6.2 / 6.4).** A library and the SDK declare exactly `6.2` and are not raised without a feature or dependency that needs it (recorded in the commit message); a leaf CLI or server declares the current release (`6.4`); a repo that also exports a reusable library product splits that library out at 6.2.
- Why: C7 and C8. 6.3 and 6.4 add almost no manifest API (`.v27` constants, interop default `complete`); every 6.4-tools library in the corpus needs fallback manifests; the SDK cannot be lower than swift-subprocess (6.2) [MP §3].
- Check: library and SDK paths, output = manifests not at 6.2: `grep -rL --exclude-dir='.build' -e 'swift-tools-version: *6\.2' --include='Package.swift' LIBRARY_DIR...`; CLI and server paths, output = manifests below 6.4: `grep -rL --exclude-dir='.build' -e 'swift-tools-version: *6\.[4-9]' -e 'swift-tools-version: *6\.[1-9][0-9]' -e 'swift-tools-version: *[7-9]\.' --include='Package.swift' CLI_DIR...`; plus a CI leg on the floor image `swift:6.2` (not run here).
- Red: **yes** for the greps, [MP V13] and [CN R4] (library form: lists the 6.4 library and the 6.4 template, silent on `lib-62`, library and SDK skeletons; CLI form: 1 line on a 6.2 library, 0 on the CLI skeleton); the `swift:6.2` leg is `unverified: not run` (no image), 6.3.3 stood in (library and SDK skeletons green; the 6.4 CLI red by design, MP V29).
- Binds: library, SDK (6.2); CLI, server (6.4).

**SW-PKG-13 (SHOULD, tools 6.0).** Every manifest states Swift 6 mode: `swiftLanguageModes: [.v6]` at package level, or `.swiftLanguageMode(.v6)` in its shared settings.
- Why: tools 6.x defaults to mode 6 (`null` list), but the 6.4 `init` template states nothing, and the K-04 read and a reviewer grep need a statement; `swift-subprocess@55d30558b8b1:Package.swift:27` states it in the shared array [MP §4]. Argued, not normative.
- Check, output = manifests that never state it: `grep -rL --exclude-dir='.build' -e 'swiftLanguageModes: *\[\.v6' -e 'swiftLanguageMode(\.v6)' --include='Package.swift' .`.
- Red: **yes**, [MP V14] and [CN R4]: 2 lines (6.4 template, a `[.v5]` manifest), 0 on the 6.3 template and the skeletons.
- Binds: library, SDK, CLI, server, app packages.

**SW-PKG-14 (MUST, tools 6.0).** No package-level `swiftLanguageModes: [.v5]` or `swiftLanguageVersions: [.v5]`; a package that must stay in mode 5 during a migration uses per-target `.swiftLanguageMode(.v5)` (SW-PKG-15).
- Why: a package-level 5 hides every target from the other checks (Alamofire: tools 6.4 with `[.v5]`, `Alamofire@bda9ed57d729:Package.swift:1,52`); measured effective mode: `[.v5]` gives 5, `[.v6, .v5]` and `[.v5, .v6]` give 6, and a per-target mode beats the package list in both directions [MP §1, CN R3]; the migration guide's sanctioned shape is per target.
- Check: `grep -rnE --exclude-dir='.build' -e 'swiftLanguageModes: *\[ *\.v5 *\]' -e 'swiftLanguageVersions: *\[ *\.v5 *\]' --include='Package*.swift' .`; effective form: `set -o pipefail; swift package dump-package | jq -r 'select(.swiftLanguageVersions != null and ((.swiftLanguageVersions | index("6")) == null)) | "package-level modes: \(.swiftLanguageVersions | tojson)"'`.
- Red: **yes**, [MP V15] and [CN R3]: both print one line on `v5/pkg-level`, nothing on `[.v5, .v6]`, the library skeleton and the commented-target twin (6.4). The dive's regex `\[\.v5` over-matched `[.v5, .v6]` (C10).
- Binds: every manifest.

**SW-PKG-15 (SHOULD, tools 6.0).** `.swiftLanguageMode(.v5)` (or a helper spelled `languageMode: .v5`) appears only on a line, or directly under a line, that carries a `//` comment with a date or public tracker and a removal condition.
- Why: a per-target exemption is a visible, dated debt (`swift-build@2187330e13e7:Package.swift:345` with its rdar; a public issue URL is the better tracker), `swift-collections@935f696a549a:Package.swift:324-325` puts the reason on the line above, and `swift-service-lifecycle@c55297914e26:Package.swift:76-84` uses `#if compiler(<6.2)` for old compilers only [MP §4]. `swift package add-setting --swift languageMode=5` adds such a target without a word (MP §13), so the rule covers command-made edits.
- Check, output = undocumented sites: `find . -name 'Package*.swift' -not -path '*/.build/*' -exec awk 'FNR==1{p=""} /swiftLanguageMode\(\.v5\)|languageMode: *\.v5/ && $0 !~ /(^|[^:])\/\// && p !~ /(^|[^:])\/\// {print FILENAME":"FNR": "$0} {p=$0}' {} +`; inventory of 5-mode targets: `set -o pipefail; swift package dump-package | jq -r '.targets[] | select([.settings[].kind.swiftLanguageMode._0] | index("5")) | .name'`.
- Red: **yes**, [MP V16, V24] and [CN R5]: awk 1 line on `v5/target-nocomment`, 0 on `target-commented` (comment on the same line) and on the skeletons; the `//` test needs `(^|[^:])` so a URL's `://` does not count as a comment. A reason on the line above a wrapped `.target(` call is a false positive, accepted.
- Binds: every manifest.

**SW-PKG-16 (SHOULD, tools 6.2).** Manifests of libraries, the SDK, CLIs and servers do not list `ApproachableConcurrency`; the two members that matter are SW-PKG-08.
- Why: in a Swift 6 target the pseudo-feature adds only two features (three of its five members are in the Swift 6 group), hides them behind a name that no longer tells a reader what is on, and the 6.4 template writes it into library and test targets [MP §5]. The default-isolation semantics belong to SW-CONC ([map] M-L-03 is owned there); this is the manifest-side grep.
- Check, output = hits: `grep -rn --exclude-dir='.build' -e 'ApproachableConcurrency' --include='Package*.swift' .`.
- Red: **yes**, [CN R4]: 2 lines on `h-init/t64`, 0 on the 6.3 template and the skeletons. 0 of 38 corpus root manifests use the bundle [MP, Contested].
- Binds: library, SDK, CLI, server.

**SW-PKG-17 (SHOULD, tools 6.0).** No `enableExperimentalFeature(...)` except `AvailabilityMacro=...`; any other use carries a same-line reason naming the SE or issue.
- Why: experimental names are removed or promoted without notice (`SuppressedAssociatedTypesWithDefaults` is already unrecognised on 6.3 and 6.4); `AvailabilityMacro=` is a compiler special case (`swift-collections@935f696a549a:Package.swift:105-107`); the `StrictConcurrency` experimental form is the 5.9 idiom [MP §7]. The corpus has 73 non-AvailabilityMacro lines in root manifests [CN R10].
- Check: `grep -rnP --exclude-dir='.build' 'enableExperimentalFeature\((?!"AvailabilityMacro=)' --include='Package*.swift' .`.
- Red: **yes**, [MP V22]; [CN R4] the equivalent two-step `grep -rn -e 'enableExperimentalFeature(' ... | grep -v 'AvailabilityMacro='` prints 2 lines on `exp/stale`, 0 on the AvailabilityMacro twin and the skeletons.
- Binds: library, SDK, CLI, server.

**SW-PKG-18 (SHOULD, tools 6.0).** Settings common to all targets are applied by one `for target in package.targets where [.regular, .executable, .test].contains(target.type)` loop after `Package(...)`; per-target extras go inline; `swiftSettings: someVariable` (a bare identifier) does not appear.
- Why: it cannot be forgotten on a new target, skips `.macro` and `.plugin` targets, shows in `dump-package`, and `swift package migrate --to-feature` handles it; a bare variable makes `migrate` rewrite the sources and then fail (`unable to find array literal for 'swiftSettings' argument`, exit 1; the inline literal, `shared + [...]`, no-argument and loop shapes exit 0) [MP §8-9]. Corpus: 11 of 38 root manifests loop (`swift-log@4038b6a4f74a:Package.swift:51-73`).
- Check, output = bare-variable uses: `grep -rnE --exclude-dir='.build' 'swiftSettings: *[A-Za-z_][A-Za-z0-9_]*,? *\)?,? *$' --include='Package.swift' .` (does not match `swiftSettings(languageMode:)` calls or `common + [...]`).
- Red: **yes**, [MP V03, V04]; [CN R4] 1 line on `b-migrate/shared-var`, 0 on the loop, inline, `plus-expr` and skeleton shapes.
- Binds: every manifest. Verbatim skeleton heads are in "Applied to the exemplars and the future consumers".

**SW-PKG-19 (SHOULD, tools 6.2).** `defaultIsolation(MainActor.self)` appears only in app targets, never in a library, SDK, CLI or server manifest.
- Why: consumers compile library code under their own default isolation; 0 of 38 root manifests set it (IceCubesApp sets it in 9 of 13 app-internal packages, outside the root scan) [map conflict 4, MP §16]. CLIs default to no MainActor (owner Q3); SW-CONC pins the text.
- Check, output = hits to review (each must be an app target): `grep -rn --exclude-dir='.build' -e 'defaultIsolation(MainActor' --include='Package*.swift' .`.
- Red: **yes**, [MP V26] and [CN R4]: 1 line on `iso/mainactor-lib`, 0 on the skeletons.
- Binds: library, SDK, CLI, server.

**SW-PKG-20 (SHOULD, tools 6.0).** No pre-6 manifest idioms: `swiftLanguageVersions:`, `.enableExperimentalFeature("StrictConcurrency")`, a `-strict-concurrency` flag, `.package(name:url:...)`, a two-component version (`from: "1.0"`), a `// swift-tools-version:5.x` header in a new package.
- Why: deprecated or superseded since 6.0; they compile and mislead (`swiftLanguageVersions` warns `replaced by 'init(...swiftLanguageModes:...)'`, `.package(name:url:from:)` warns `deprecated: use package(url:from:)` and exits 0, the experimental form builds and does nothing the mode does not, `from: "1.0"` fails opaquely) [MP §6, DR §5].
- Check: `grep -rnE --exclude-dir='.build' '^[^/]*(swiftLanguageVersions:|enableExperimentalFeature\("StrictConcurrency|strict-concurrency|\.package\(name:)' --include='Package*.swift' .`; two-component versions: `grep -rnE --exclude-dir='.build' 'from: *"[0-9]+\.[0-9]+"' --include='Package*.swift' .`.
- Red: **yes**, [MP V27], [DR V24, V15] and [CN R4]: the `^[^/]*` guard prints 1 line on each of `old/bad` and `old/bad2`, 0 on `old/good`, the skeletons and a plant whose only `.package(name:` sits in a `//` comment (the unguarded form matched aws-lambda-runtime's commented example); the two-component grep prints 1 line on `f-agent/cShort` and 0 on `cFrom`, `cHalf` and `cClosed` (0 hits in the 38 corpus manifests).
- Binds: every manifest.

**SW-PKG-21 (SHOULD, tools 6.0).** Do not create `Package@swift-X.swift`. Settings that differ by compiler use `#if compiler(>=6.4)` inside the loop of SW-PKG-18. A versioned file is allowed only when the manifest API differs (a symbol gated by `@available(_PackageDescription, introduced:)`, e.g. `.macOS(.v27)`), is named `Package@swift-MAJOR.MINOR.swift`, has a strictly lower tools version than `Package.swift`, keeps identical products, targets, dependencies and platforms, and has its own CI leg.
- Why: an exact marker for the running toolchain wins unconditionally, even over a newer `Package.swift` (`@swift-6` at tools 6.0 beat a 6.4 `Package.swift` on both images; a patch marker `@swift-6.3.3` is chosen only on 6.3.3); a versioned file with a higher tools version shadows `Package.swift` (6.4 loaded `@swift-6.3` over a 6.2 `Package.swift`), so edits to `Package.swift` silently do nothing [MP §11]. Drift is measured: Alamofire's four fallbacks (macOS 12 versus 10.13), swift-dependencies (platforms, a different dependency, no traits), swift-collections `@swift-6.2` (strict memory safety commented out, so 6.3 users build without it while 6.4 users get it). One manifest with `#if compiler(>=6.4)` gave different settings on 6.3.3 and 6.4 (MP V33).
- Check: names, output = major-only and patch markers: `find . -not -path '*/.build/*' \( -name 'Package@swift-[0-9].swift' -o -name 'Package@swift-[0-9]*.[0-9]*.[0-9]*.swift' \)`; shadow check: `ls Package*.swift && swift package tools-version` (the printed version must equal the `Package.swift` comment). Comparing the tools versions of two files and the equality of their dependency lists is a reading heuristic: no formatter-independent diff exists short of dumping both manifests (as `j-drift` did), which needs each copied into its own directory.
- Red: **yes** for the find and the shadow, [MP V05, V06, V34] and [CN R4] (2 lines on `c4-main64-major6` and `c7-main62-v63patch`, 0 on `c1` and `c3`); the comparison is a reading heuristic for the stated reason.
- Binds: library, SDK (the only kinds that serve older toolchains).

**SW-PKG-22 (SHOULD, any tools version).** An `exact:` (or, in a root that ships, `branch:`/`revision:`) requirement carries a `//` comment on its line or the line above that names the reason and the removal condition; undated pins do not merge.
- Why: undated pins become permanent. The shape to copy is `vapor@bf77fc69b142:Package.swift:86-88` ("Pin until Async Algorithms releases a fix for the Collections 1.7.0 preview APIs"); `swiftly@c8cf2e35bfca:Package.swift:34` pins swift-subprocess `exact: "1.0.0", traits: []`; tuist has 13 `exact:` and element-x-ios 4 [DR §5]. `branch:` and `revision:` stay out of anything consumed by version (SW-PKG-09).
- Check, output = pins without a reason: `find . -name 'Package*.swift' -not -path '*/.build/*' -exec awk 'FNR==1{p=""} /(exact|branch|revision):/ && $0 !~ /(^|[^:])\/\// && p !~ /(^|[^:])\/\// {print FILENAME":"FNR": "$0} {p=$0}' {} +`. Whether the comment names a removal condition is a reading heuristic (a regex cannot judge prose).
- Red: **yes**, [CN R5]: 3 lines on a root with `exact`, `branch` and `revision` and no comment; 0 on a root whose `exact:` has a comment above it, an `exact:` with a trailing comment and a `from:`. A comment above a wrapped `.package(` call whose `exact:` sits two lines lower is a false positive, accepted.
- Binds: library, SDK, CLI, server.

**SW-PKG-23 (SHOULD, tools 6.1).** A dependency declaration that wants the package's default traits writes `traits: [.defaults, "X"]`; `traits: []` is allowed only to shed optional dependencies and carries a comment.
- Why: `traits: ["X"]` replaces the defaults (measured: `Verbose` lost; `[.defaults, "Zed"]` kept it), and the docs say so in a tip [DR §8].
- Check, output = files with a bare string list (multi-line safe; NUL-separated): `grep -rPzl --exclude-dir='.build' 'traits:\s*\[\s*"' --include='Package.swift' . | tr '\0' '\n'`. The single-line form `grep -rn -e 'traits: \["' ...` is blind to a wrapped list.
- Red: **yes**, [DR V23] (single line) and [CN R6]: the `-Pzl` form lists a wrapped `traits: [\n "Foo"\n ]` plant and the single-line violation, and nothing for a wrapped `[.defaults, "Foo"]`, the `ok` fixture or the pin plant; the single-line grep printed 0 on the wrapped plant (miss, by construction).
- Binds: every manifest that depends on a package with traits.

**SW-PKG-24 (MUST, any tools version).** No `.product(name: "_...")` and no dependency on an underscored target; if one is unavoidable the dependency uses `exact:` with a dated reason (SW-PKG-22).
- Why: "Any symbol beginning with an underscore, and any product beginning with an underscore, is not subject to semantic versioning" (`swift-crypto@1c80d3aff53f:README.md`, Compatibility); a planted SemVer-minor bump renamed one product (resolve error, exit 1) and changed a signature in another (compile error, exit 1) while the public product kept building [DR §9]. swift-crypto renamed `_CryptoExtras` to `CryptoExtras` in 4.0; swift-nio publishes `_NIOFileSystem` beside `NIOFileSystem` (a graduation in progress, inference).
- Check: `grep -rn --exclude-dir='.build' -e 'product(name: "_' -e 'name: "_[A-Za-z0-9]*", *package:' --include='Package.swift' .`.
- Red: **yes**, [DR V13, V21] and [CN R6]: 2 lines on `viol`, 0 on `ok`; breakage in `d-underscore` (`cRename` exit 1, `cSig` exit 1, `cPublic` exit 0, both images). Violated by 8 of 38 root manifests (C12).
- Binds: library, SDK, CLI, server; co-released swiftlang tool repos are the one observed exemption (argued, not adopted).

**SW-PKG-25 (SHOULD, any tools version).** Libraries and the SDK declare swift-crypto as `.package(url: "https://github.com/apple/swift-crypto.git", "1.0.0" ..< "6.0.0")`; a root may use `from:` of the newest major only when no dependency declares an older range; a single-major `from:` or the stale `..<"5.0.0"` is a defect. Extend the upper bound only after reading the README's compatibility section for the next major.
- Why: the README says "swift-crypto 1.x, 2.x, 3.x, 4.x, and 5.x are almost API compatible, so most clients should allow any of them"; a single-major form conflicts with any sibling on another major (`L3`+`L4` exit 1; the stale `"1.0.0"..<"5.0.0"` plus a 5.x consumer exit 1; the wide range alone resolved 5.0.0, with a 4.x sibling 4.5.2) [DR §10]. Whether the range needs `@unknown default` for the 5.0 non-frozen enums is `unverified: read only`.
- Check: `grep -rn --exclude-dir='.build' -e 'swift-crypto[^)]*from:' -e 'swift-crypto[^)]*\.\.< *"[2-5]\.0\.0"' --include='Package.swift' .`.
- Red: **yes**, [DR V16, V22] and [CN R6]: 1 line on `viol` (`from: "3.0.0"`), 0 on `ok`; resolution in `g-crypto/run-g.sh`. Violated by containerization (`"3.0.0"..<"5.0.0"`, `containerization@3e7bc39e66b3:Package.swift:44`), swift-container-plugin (`"1.0.0"..<"5.0.0"`, `swift-container-plugin@a9646b8d4dca:Package.swift:27`), sourcekit-lsp (`from: "3.0.0"`, `sourcekit-lsp@c6ce93d5f8aa:Package.swift:844`) and tuist (registry id, `from: "3.0.0"`, `tuist@2f6ac74754bf:Package.swift:1990`).
- Binds: library, SDK.

### D. git and CI gates (lockfile policy)

**SW-PKG-26 (MUST, any tools version).** A repo that ships a binary, app, container image or service tracks `Package.resolved`.
- Why: it is a cache, not a lock, unless the flag of SW-PKG-28 is used; the file is only meaningful when committed for a root that ships; consumers ignore a dependency's own file ([ResolvingPackageVersions](https://raw.githubusercontent.com/swiftlang/swift-package-manager/main/Sources/PackageManagerDocs/Documentation.docc/ResolvingPackageVersions.md)). Corpus: 10 repos track it, 23 gitignore it, 7 have none; tracked and enforced: tuist and containerization (30 pins) [DR §4]. C3 corrects the audit.
- Check, exit 0 required: `git ls-files --error-unmatch Package.resolved`.
- Red: **yes**, [DR V4] and [CN R1]: exit 0 tracked, exit 1 after `git rm --cached` (`error: pathspec 'Package.resolved' did not match any file(s) known to git`), both toolchains.
- Binds: CLI, daemon, server, container image, app, plugin tool that ships.

**SW-PKG-27 (SHOULD, any tools version).** A library-only repo or the SDK library lists `Package.resolved` in `.gitignore`; a library that commits it for an Xcode workspace (TCA, swift-dependencies, snapshot-testing) is tolerated, not a defect.
- Why: consumers ignore it; CI floats on purpose to catch upstream breakage [DR §4]. The 3 library trackers are Point-Free's.
- Check, exit 0 required: `git check-ignore -q Package.resolved` (works before the file exists).
- Red: **yes**, [CN R8]: exit 1 on a repo whose `.gitignore` lacks the entry, exit 0 once `Package.resolved` is appended.
- Binds: library, SDK.

**SW-PKG-28 (MUST, any tools version).** CI builds a repo that tracks the lockfile on a fresh checkout or an empty scratch directory with `swift build --force-resolved-versions` (aliases `--disable-automatic-resolution`, `--only-use-versions-from-resolved-file`; `swift test` and `swift run` accept it); there is no `--locked`, `--frozen` or `--offline`.
- Why: the flag makes SwiftPM a lockfile consumer: it exits 1 when a requirement is raised past a pin or a dependency is added (`out-of-date resolved file`) and when the file is missing on a cold scratch dir; on a **warm** scratch dir with the file deleted it exits 0 (false green), which is why the fresh directory is part of the rule [DR §2]. Only tuist (`tuist@2f6ac74754bf:.github/workflows/cli.yml:121,158,162,478`) and containerization (`containerization@3e7bc39e66b3:Makefile:28`, `.github/workflows/linux-build.yml:51,60`) pass it.
- Check, exit 0 required: `swift build --force-resolved-versions --scratch-path "$(mktemp -d)"` in a fresh clone; CI wiring, output = CI files that never pass a lock flag in a repo that tracks the file: `grep -rLE 'force-resolved-versions|disable-automatic-resolution|only-use-versions-from-resolved-file' .github/workflows` (reading heuristic for which workflows build; the listing is a candidate set).
- Red: **yes**, [DR V1, V2, V3] and [CN R1]: fresh scratch, requirement raised: exit 1 with `out-of-date resolved file`; fresh scratch, file missing: exit 1; manifest unchanged: exit 0; warm scratch, file missing: exit 0 (false green); identical on 6.4 and 6.3.3.
- Binds: CLI, daemon, server, container image, app (the kinds of SW-PKG-26).

**SW-PKG-29 (MUST, any tools version).** After any plain `swift build`, `swift test` or `swift package resolve` step, CI fails on `git diff --exit-code -- Package.resolved`. Review `pins`, never `originHash`.
- Why: a plain build re-resolves and rewrites the file with exit 0 after a manifest edit (a requirement raised past its pin moved `libdep` 1.0.0 to 1.1.0 and nothing failed); `originHash` is SHA-256 of the root manifest bytes plus the dependency locations, consulted only in best-effort mode, and the file is rewritten only when a pin changes, so a stale hash is normal and harmless [DR §3]. None of the 10 tracked-lockfile repos in the corpus runs this drift check [DR exemplar table].
- Check, exit 0 required: `git diff --exit-code -- Package.resolved`.
- Red: **yes**, [DR V4] and [CN R1]: after a raised requirement the plain build exits 0 and the diff exits 1 (`-"version" : "1.0.0"`, `+"version" : "1.1.0"`); on an unchanged manifest the diff exits 0; both toolchains.
- Binds: the kinds of SW-PKG-26.

**SW-PKG-30 (SHOULD, any tools version).** CI build and test jobs never run `swift package update` or a plain `swift package resolve` without the lock flag; refreshes happen in a dedicated job that opens a PR carrying the `Package.resolved` diff (`element-x-ios@14e33866ced2:.github/workflows/renovate-xcodegen.yml:58-60`).
- Why: `update` moves every pin to the newest eligible version and silences the lock.
- Check, output = hits: `grep -rn -e 'swift package update' -e 'swift package resolve$' --include='*.yml' --include='*.yaml' .github`.
- Red: **yes**, [DR V25] and [CN R6]: 1 line on `viol/.github/workflows/ci.yml:4`, 0 on `ok`.
- Binds: every repo with CI.

**SW-PKG-31 (SHOULD, any tools version).** Scripts, CI files and docs never contain `swift build|test|run|package ... --locked|--frozen|--offline`.
- Why: agents reach for cargo flags; SwiftPM answers `error: Unknown option '--locked'`, exit 64 (DR V15); the Swift spelling is SW-PKG-28's.
- Check, output = hits: `grep -rnE --exclude-dir='.build' -e 'swift (build|test|run|package) [^#]*--(locked|frozen|offline)' --include='*.yml' --include='*.yaml' --include='*.sh' --include='Makefile' --include='*.md' .`.
- Red: **yes**, [DR V15] (exit 64) and [CN R8]: 2 lines on a CI file with `--locked` and `--frozen`, 0 on the `--force-resolved-versions` twin.
- Binds: every repo.

### E. Process rules and reading heuristics (no formatter-independent mechanical check; reason stated)

**SW-PKG-32 (SHOULD, tools 6.0).** Enable a new upcoming feature on an existing package with `swift package migrate --to-feature NAME [--targets T]` from a clean tree, never by editing the list first; if it exits 1, `git checkout -- Sources`, move the settings into the loop of SW-PKG-18 and retry. Use `swift package add-dependency|add-target|add-target-dependency|add-product|add-setting` for the edits they cover, then format and re-run SW-PKG-06.
- Why: `migrate` applies behaviour-preserving fix-its but, on a bare `swiftSettings: sharedVar`, rewrote the sources (2 fix-its) and then failed (exit 1); all six `add-*` commands exit 0 on both images but emit unformatted code (`dependencies: [` jammed onto the target line) and `add-setting --swift languageMode=5` accepts `5` silently [MP §9, §13].
- Check: exit status and `git status --short` after the command (manifest and sources both modified = success; sources only = it failed). Reading heuristic, because "should have used the command" has no planted violation: the commands cannot be told from a careful hand edit by diff.
- Red: **yes** for `migrate`, [MP V03] (bare variable exit 1 with sources modified, five other shapes exit 0, both images); **no** for `add-*` (MP V31 observational).
- Binds: every manifest edit by an agent.

**SW-PKG-33 (SHOULD, any tools version).** Raising `swift-tools-version` of a published library is a release-note event: before the commit, run `swift package resolve && swift build` on the previous toolchain image and confirm consumers there resolve what you intend; do not commit a `Package.resolved` made on a newer toolchain than the CI floor.
- Why: `from:` consumers on older toolchains silently stay on the old release (6.3.3 resolved 1.0.0 where 6.4 resolved 1.1.0, exit 0, no warning); `exact:` consumers fail (`contains incompatible tools version (6.4.0)`, exit 1) [MP §2, V30].
- Check: `swift package resolve && swift build` as a CI job on the floor image (`swift:6.2`), plus a release-note line in the commit that raises the floor. The release note is a reading heuristic: a script cannot tell a deliberate raise from an accidental one.
- Red: **yes** for the behaviour, [MP V30] (`from: "1.0.0"`: 6.4 resolves 1.1.0, 6.3.3 resolves 1.0.0 with exit 0; `exact: "1.1.0"` exit 1 on 6.3.3); **no** for the CI job itself: the `swift:6.2` leg is `unverified: not run` (no image on this host).
- Binds: library, SDK.

**SW-PKG-34 (SHOULD, any tools version).** Version-specific swift-syntax code is guarded `#if canImport(SwiftSyntax604) ... #elseif canImport(SwiftSyntax603) ... #else`, newest first, never `#if swift(>=)`; CI builds the package once per declared swift-syntax major with a consumer root that pins the lowest (and the highest) with `exact:`.
- Why: a range is only as wide as the lowest version CI builds: unguarded `InlineArrayTypeSyntax` compiled at 604.0.0 and failed at `exact: "600.0.1"` (`cannot find 'InlineArrayTypeSyntax' in scope`, exit 1); the `canImport(SwiftSyntax602)` twin passed both ends [DR §6]. The marker modules ship with every swift-syntax >= 509 ([Macro Versioning](https://raw.githubusercontent.com/swiftlang/swift-syntax/main/Sources/SwiftSyntax/Documentation.docc/Macro%20Versioning.md)). Real sites: `swift-composable-architecture@bc2db5ba8ad3:Sources/ComposableArchitectureMacros/ObservableStateMacro.swift:18,272`.
- Check: a consumer manifest with `.package(url: "https://github.com/swiftlang/swift-syntax.git", exact: "<lowest>")` plus `swift build`; the ladder order and the absence of `#if swift(>=` in macro targets are a reading heuristic (`grep -rn -e 'if swift(' --include='*.swift' Sources`), because the correct guard depends on which API each major added.
- Red: **yes** for the build, [DR V7] (`cBadlow` exit 1, `cGoodlow` exit 0, defaults exit 0) and `b2-ladder/run-b2.sh` (604 / 600 / 603 printed under three pins); heuristic part not run red.
- Binds: macro and plugin packages that depend on swift-syntax.

**SW-PKG-35 (SHOULD, tools 6.1).** Define a trait only for an optional heavy or macro dependency, source-unstable preview API, or a documented compile-out knob; every trait is additive (a compile-out knob is the one documented exception: swift-log's seven `MaxLogLevel*` traits, `swift-log@4038b6a4f74a:Package.swift:11-24`); defaults are empty unless most adopters want the capability (removing a default later is SemVer-major); each trait has a `description:`; CI runs `swift build --enable-all-traits`, `swift build --disable-default-traits` and `swift build --disable-default-traits --traits <T>` for each trait.
- Why: traits unify across the graph, so any combination must compile; a build that passes by default can hide breakage behind a trait (a planted error in `#if Zed`: default exit 0, `--enable-all-traits` exit 1); **a mistyped flag (`#if Zedd`) is silently false even with `--enable-all-traits`** (exit 0), so no compiler gate exists for trait-name typos [DR §8]. The manifest API needs tools 6.1 (`'when(traits:)' is unavailable` at 6.0, exit 1); `swift package show-traits` needs 6.3.
- Check: the three commands above; typo candidates: `grep -rn -e '^ *#if [A-Z][A-Za-z0-9]*$' --include='*.swift' Sources` against `swift package show-traits` (reading heuristic; output is non-empty by design).
- Red: **yes** for the matrix, [DR V9, V10]; **no** for the typo hole: [DR V12] did not go red, which is the finding. Each trait needs a test or CI leg that compiles it on.
- Binds: libraries that define traits.

**SW-PKG-36 (CONSIDER, tools 6.1).** A foundational library that offers macros does so behind a separate product or a trait, and every reference to the swift-syntax (or macro-package) dependency in the manifest carries `condition: .when(traits: [...])`.
- Why: Apple's position (Honza Dvorsky, [forum 82587](https://forums.swift.org/t/macros-in-foundational-libraries/82587)) accepts macros only with an opt-out, and one ungated reference makes SwiftPM fetch the dependency anyway: an unreachable URL resolved with exit 0 with the trait off and every reference gated, exit 1 with one ungated reference [DR §7]. The fleet authors no macros (SW-PKG-38), so CONSIDER.
- Check: `swift package resolve` in a consumer with `traits: []` and the dependency URL unreachable (exit 0 expected). "Every reference conditioned" is a reading heuristic: a grep cannot tell a reference from a declaration.
- Red: **yes**, [DR V11] (`cBogusOff` exit 0, `cBogusOn` exit 1, `cLeakOff` exit 1).
- Binds: foundational libraries only.

**SW-PKG-37 (CONSIDER, any tools version).** Code generated from a spec is produced by a build-tool plugin whose generator is a pinned package dependency; generated code that is checked in carries a `DO NOT EDIT` header and CI regenerates it and runs `git diff --exit-code`; a command plugin that writes declares `.writeToPackageDirectory(reason:)`.
- Why: matches swift-openapi-generator's FAQ (`swift-openapi-generator@c4f943e14015:Sources/swift-openapi-generator/Documentation.docc/Articles/Frequently-asked-questions.md:41-47`) and swift-protobuf's bootstrap files (24 `DO NOT EDIT` sources, `swift-protobuf@6c84c3dedac0:Package.swift:435-439`); no corpus repo runs a regeneration drift check [DR §11].
- Check: `grep -rL -e 'DO NOT EDIT' --include='*.pb.swift' .` for headers; `git diff --exit-code` after regeneration. Reading heuristic: the evidence is thin (P2) and plugin sandboxing is macOS behaviour (`unverified: read only`).
- Red: **no** [DR §11]: neither check was planted against a violation; the only drift check run is the one on `Package.resolved` (SW-PKG-29). No corpus repo runs a regeneration drift check to copy.
- Binds: repos with generated sources.

**SW-PKG-38 (CONSIDER, any tools version).** Fleet code consumes macro packages (SW-PKG-10 applies to the declaration) and does not define `.macro(` targets unless the owner adds a row; if one does, it also ships a macro-free product and obeys SW-PKG-34 and 36.
- Why: macro authoring needs the swift-syntax treadmill (a new major per Swift release, one version graph-wide) and Johannes Weiss sees no reasonable adoption path in foundational libraries [DR §7].
- Check, output = hits: `grep -rn --exclude-dir='.build' -e '\.macro(' --include='Package.swift' .`.
- Red: **yes**, [CN R11]: 1 line on `b-macros/pkgs/MRange`, 0 on the library skeleton. Whether a hit is allowed is the owner's call (Open questions).
- Binds: library, SDK, CLI, server.

### Traceability

| Source rule | Final ID | Source rule | Final ID |
|---|---|---|---|
| MP-01 | 06 | D01 | 09 |
| MP-02 | 11, 12 | D02 | 22 |
| MP-03 | 13 | D03 | 26, 27 |
| MP-04 | 14, 15 | D04 | 26, 28, 29 |
| MP-05 | 07, 08, 16 | D05 | 30 |
| MP-06 | 03 | D06, D08 | 10 |
| MP-07 | 02 | D07 | 34 |
| MP-08 | 17 | D09 | 36 |
| MP-09 | 01, 18 | D10, D12 | 35 |
| MP-10, MP-15 | 32 | D11 | 23 |
| MP-11 | 04 | D13 | 24 |
| MP-12, MP-13 | 21 | D14 | 25 |
| MP-14 | 05 | D15 | 37 |
| MP-16 | 19 | D16 | 38 |
| MP-17 | 20 | D17 | 20, 31 |
| MP-18 | 33 | D18 | 29 (Why) |

### Consolidation re-runs

Scripts live under `F-CN` (`lockgate.sh`, `cr-image.sh`, `pkgv5.sh`, `ssx2.sh`, `k04.sh`, `cr-pipefail.sh`, `modes.sh`, `plants/`); the host greps are the session scratch `final.sh`, `crt.sh`, `dep-greps.sh`. Every run used a unique scratch path (no `rm -rf`); no exemplar clone was written.

| # | What | Result |
|---|---|---|
| R1 | Three-part lock gate replay (`lockgate.sh`), `swift:6.4` and `swift:6.3.3`: app with `exact: "1.0.0"` pinned to 1.0.0 while 1.1.0 exists, committed, then the requirement raised to `from: "1.1.0"`. | Identical on both. Tracked: `git ls-files --error-unmatch` exit 0, exit 1 after `git rm --cached`. Flag on a fresh scratch: unchanged manifest exit 0; requirement raised exit 1 (`out-of-date resolved file`); file missing exit 1; **warm scratch with the file missing exit 0 (false green)**. Drift: unchanged manifest build and diff exit 0; requirement raised plain build exit 0 and `git diff --exit-code -- Package.resolved` exit 1. A first draft had a broken `sed` that left the manifest invalid (every case read exit 1/0 for the wrong reason); fixed and re-run. |
| R2 | jq audits (SW-PKG-07, 08, 09) on 6.4 and 6.3.3. | 6.4: red 2 lines on the 6.4 template (base three and the semantic two), 3 on a root with `exact`/`branch`/`revision`, closed range `2.0.1` upper bound, branch; green 0 on library and SDK skeletons, `from:` and half-open fixtures. **6.3.3: the same audits printed nothing for the tools-6.4 manifests (template, pin plant): `dump-package` failed with stderr hidden, a false green.** With `set -o pipefail` and stderr visible the pipeline exits 1 (`package 't64' is using Swift tools version 6.4.0 but the installed version is 6.3.3`) and exits 0 on the library skeleton. The convention above is the fix. |
| R3 | Effective mode of package-level lists (`modes.sh`, `pkgv5.sh`). | `swiftLanguageModes: [.v5, .v6]` built with `-swift-version 6` on 6.4 and 6.3.3. jq filter "list present and without `\"6\"`" and the `\[ *\.v5 *\]` grep: 1 line on `v5/pkg-level`; 0 on `[.v5, .v6]`, the library skeleton and the commented-target twin. |
| R4 | Host greps against planted violation and twin (`final.sh`, `crt.sh`). | RED/GREEN lines: tools floor 1/0; library at 6.2 2/0; CLI at 6.4 1/0; explicit v6 2/0; package-level v5 1/0; bundle 2/0; guard 2/0; experimental 2/0; pre-6 idioms 2/0, refined form 1+1/0 incl. a commented twin; `defaultSwiftSettings` 2/0 with three twins; bare variable 1/0; unsafeFlags pre-filter 1/0; MainActor 1/0; versioned markers 2/0; v6-group alternation 2/0; two-component `from:` 1/0; `ApproachableConcurrency`, `MainActor`, guard and floor greps ran with `--exclude-dir='.build'` (a planted built tree leaked `.build/checkouts/**/Package.swift` without it). |
| R5 | awk reason checks (SW-PKG-15, 22). | `.v5` reason: 1 on `target-nocomment`, 0 on `target-commented` and the skeletons. Pin reason: 3 on the bare root, 0 on the root with a comment above one pin and a trailing comment on another. Fixed `://`-in-URL false positives with `(^\|[^:])\/\/`. |
| R6 | Dependency greps on `viol` and `ok` (`dep-greps.sh`), plus the multi-line traits grep. | Underscore 2/0; swift-crypto 1/0; CI `swift package update` 1/0; swift-syntax forms 2/0; single-line traits 1/0; `-Pzl` traits lists the wrapped violating plant and nothing for `[.defaults, "Foo"]` forms. |
| R7 | Read-the-floor command (SW-PKG-06) on three fixtures (`k04.sh`, 6.4). | Library skeleton `6.2.0` / `["6"]` / five features plus guard; shadowed `c2-main62-v63`: `ls` lists both files, `tools-version` prints `6.3.0`, features `[]`; 6.4 template `6.4.0` / `null` / `ApproachableConcurrency` only. |
| R8 | `git check-ignore` (SW-PKG-27) and cargo-flag grep (SW-PKG-31). | `check-ignore` exit 1 without the entry, 0 with it. Cargo grep: 2 lines on a CI file using `--locked` and `--frozen`, 0 on `--force-resolved-versions`. |
| R9 | Parameterised swift-syntax audit (SW-PKG-10, `ssx2.sh`, 6.4, `lo` 602, `hi` 605). | A line for `MBranch`, `MExact`, `MFrom`, `MFrom603`, `MLatest` and `600.0.0..<604.0.0`; none for `MRange` and `MPfree`. |
| R10 | Read-only census over the 38 root manifests of the exemplar corpus (grep only). | Tools below 6.2: 15. Package-level pure `[.v5]`: Alamofire, swift-snapshot-testing, swift-format, SwiftPM, tuist (5). `StrictLanguageFeatures`: 0. `defaultSwiftSettings:` argument: 0. `ApproachableConcurrency`: 0. `defaultIsolation`: 0. Non-AvailabilityMacro `enableExperimentalFeature`: 73 lines. Underscored products: 8 repos. Root `Package.resolved` tracked per `git ls-files`: 10 (container, containerization, element-x-ios, TCA, swift-dependencies, snapshot-testing, SwiftLint, embedded-examples, swiftly, tuist), matching [pkg]; three more root files exist in the clones (async-algorithms, container-plugin, service-lifecycle) but are untracked and gitignored, build leftovers that a bare `ls` would miscount as 13. |
| R11 | `.macro(` grep (SW-PKG-38). | 1 on `MRange`, 0 on the library skeleton. |

## Applied to the exemplars and the future consumers

### Exemplars that already satisfy

| Rule | Exemplar | Evidence |
|---|---|---|
| 11, 12 | swift-log, swift-crypto, swift-async-algorithms, swift-subprocess | tools 6.2 on line 1 (`swift-log@4038b6a4f74a:Package.swift:1`, `swift-crypto@1c80d3aff53f:Package.swift:1`, `swift-async-algorithms@cbde9aed744b:Package.swift:1`); 16 of 38 root manifests are at 6.2 [MP §3] |
| 13, 07 | swift-subprocess | `.swiftLanguageMode(.v6)` and `ExistentialAny`, `MemberImportVisibility`, `InternalImportsByDefault`, `NonisolatedNonsendingByDefault` in the shared array (`swift-subprocess@55d30558b8b1:Package.swift:20-27,49-53`; outside the corpus, read from tags 1.0.0 and 1.0.1) |
| 07, 08 | swift-async-algorithms, vapor | all five names listed (`swift-async-algorithms@cbde9aed744b:Package.swift:79-83,155-159`; `vapor@bf77fc69b142:Package.swift:246-260`) |
| 15 | swift-build, swift-collections, swift-service-lifecycle | dated `.v5` with a reason (`swift-build@2187330e13e7:Package.swift:345`; `swift-collections@935f696a549a:Package.swift:324-325`; `#if compiler(<6.2)` at `swift-service-lifecycle@c55297914e26:Package.swift:76-84`) |
| 17 | swift-collections | the one legitimate use, `AvailabilityMacro=` (`swift-collections@935f696a549a:Package.swift:105-107`) |
| 18 | swift-log, swift-dependencies, swift-subprocess | loop at `swift-log@4038b6a4f74a:Package.swift:51-73` and `swift-dependencies@b476cc576105:Package.swift:140-143`; `shared + [...]` at `swift-subprocess@55d30558b8b1:Package.swift:49-53` |
| 04 | swift-log, JavaScriptKit, swift-system, async-http-client | diagnostic-only flag at tools 6.2 (`swift-log@4038b6a4f74a:Package.swift:71`); gated at lower tools by `#if SYSTEM_CI` (`swift-system@486d48c80fce:Package.swift:69-72`) and a development toggle (`async-http-client@017115279d09:Package.swift:18-26`); swift-format's link flag sits behind `installAction` (`swift-format@b15dd59fad21:Package.swift:216`) |
| 21 | swift-protobuf, swift-async-algorithms | only older, `MAJOR.MINOR` fallbacks (`Package@swift-6.1.swift`; `@swift-5.7`, `@swift-5.8`) |
| 10, 34 | swift-composable-architecture, swift-dependencies | `"509.0.0"..<"605.0.0"` plus the `canImport` ladder (`swift-composable-architecture@bc2db5ba8ad3:Package.swift:52`, `...:Sources/ComposableArchitectureMacros/ObservableStateMacro.swift:18,272`; `swift-dependencies@b476cc576105:Package.swift:42`, `...:Sources/DependenciesMacrosPlugin/DependencyClientMacro.swift:76`) |
| 22 | vapor, container | dated pin (`vapor@bf77fc69b142:Package.swift:86-88`); lock-step pin of its sibling (`container@f70ecbb926d9:Package.swift:58`) |
| 26, 28 | tuist, containerization | tracked lockfile plus the flag in CI (`tuist@2f6ac74754bf:.github/workflows/cli.yml:121,158,162,478`; `containerization@3e7bc39e66b3:Makefile:28`) |
| 27 | swift-log, swift-nio, swift-crypto, vapor | `Package.resolved` ignored (`swift-log@4038b6a4f74a:.gitignore:2`, `swift-nio@e12881f2a691:.gitignore:10`, `swift-crypto@1c80d3aff53f:.gitignore:10`, `vapor@bf77fc69b142:.gitignore:7`) |
| 35 | swift-collections, swift-protobuf, swiftly | empty-default preview traits (`swift-collections@935f696a549a:Package.swift:17-48`); default-on traits (`swift-protobuf@6c84c3dedac0:Package.swift:46-53`); `traits: []` to shed optional dependencies (`swiftly@c8cf2e35bfca:Package.swift:34`) |
| 37 | swift-openapi-generator | build-tool plugin, command plugin only when checking in (FAQ `:41-47`) |

### Exemplars that violate (prominent)

| Rule | Exemplar | Evidence | Status |
|---|---|---|---|
| 14 | Alamofire, swift-snapshot-testing, swift-format, SwiftPM, tuist | package-level `[.v5]`: `Alamofire@bda9ed57d729:Package.swift:1,52` (tools 6.4), `swift-format@b15dd59fad21:Package.swift:150`, `swift-package-manager@5546f44a3b52:Package.swift:1041`, `tuist@2f6ac74754bf:Package.swift:2031` | violated (5 of 38) |
| 11 | swift-argument-parser, swift-nio, swift-system, grpc-swift-2, SwiftLint, tuist, 9 more | 15 of 38 root manifests below 6.2 (`swift-nio@e12881f2a691:Package.swift:1` is 6.1, `swift-argument-parser@efd239f0055b:Package.swift:1` is 6.0); they cannot use `treatWarning`, so swift-system and async-http-client gate their unsafeFlags | violated, tolerated as existing packages |
| 02 | all 38 | 0 of 38 contain `StrictLanguageFeatures`; dead names `LifetimeDependence` at `vapor@bf77fc69b142:Package.swift:257` and `swift-async-algorithms@cbde9aed744b:Package.swift:78,154` compiled green | violated (38 of 38) |
| 04 | SwiftPM, swift-format | tools 6.1 with ungated `swiftSettings` flags (`swift-package-manager@5546f44a3b52:Package.swift:230-232,776-777`); tools 6.0 link flag behind a toggle | violated, benign by consumption style (C17) |
| 24 | vapor, hummingbird, swiftly, containerization, sourcekit-lsp, swift-format, SwiftPM, swift-foundation | `_NIOFileSystem` (`vapor@bf77fc69b142:Package.swift:131-132`, `containerization@3e7bc39e66b3:Package.swift:69,196`, `hummingbird@1bd3b407fb47:Package.swift:75`, `swiftly@c8cf2e35bfca:Package.swift:142`), `_SwiftSyntaxDynamic`, `_SKLoggingForPlugin`, `_RopeModule`, `_FoundationICU` | violated (8 of 38) |
| 25 | containerization, swift-container-plugin, sourcekit-lsp, tuist | `"3.0.0"..<"5.0.0"` (`containerization@3e7bc39e66b3:Package.swift:44`), `"1.0.0"..<"5.0.0"` (`swift-container-plugin@a9646b8d4dca:Package.swift:27`), `from: "3.0.0"` | violated |
| 10 | vapor, element-x-ios, JavaScriptKit | `from: "602.0.0"` (`vapor@bf77fc69b142:Package.swift:100`), `from: "604.0.0"` (`element-x-ios@14e33866ced2:Components/BuildExtensions/Package.swift:16`), `"600.0.0"..<"604.0.0"` excluding 604 (`JavaScriptKit@c68ee9bdebfa:Package.swift:51`); SwiftLint and swift-testing use a prerelease pin as leaf tools (`SwiftLint@ec4691d9e813:Package.swift:39`, `swift-testing@c7d68ca20cd7:Package.swift:140`), correct only there | violated (libraries); leaf tools exempt |
| 18 | vapor, aws-lambda-runtime | bare variable `swiftSettings: swiftSettings` (`vapor@bf77fc69b142:Package.swift:140,153,163`) and `swiftSettings: defaultSwiftSettings` (`swift-aws-lambda-runtime@8abd464310c7:Package.swift:5,90`); `migrate` would fail on both. The latter is also why rule 01's grep must exempt a same-named variable | violated |
| 21 | Alamofire, swift-dependencies, swift-collections | four fallbacks with macOS 10.13 against 12 (`Alamofire@bda9ed57d729`); `@swift-6.3` and `@swift-6.0` with other dependencies and no traits (`swift-dependencies@b476cc576105`); strict memory safety commented out (`swift-collections@935f696a549a:Package@swift-6.2.swift:111`) | violated (drift) |
| 28, 29 | element-x-ios, swift-embedded-examples, SwiftLint, container, swiftly | tracked lockfile (a shipping kind) with no lock flag in CI (SwiftLint's is a v2 file with no `originHash`, `SwiftLint@ec4691d9e813:Package.resolved`); none of the 10 trackers runs `git diff --exit-code` on it | violated (5 of 7 shipping trackers; tuist and containerization pass the flag) |
| 22 | tuist, element-x-ios | 13 and 4 `exact:` in the root manifest without a per-line reason (not individually read: `unverified`) | unverified |

### Corpus calibration ([CN R10])

Of 38 root manifests: tools 6.2 in 16, 6.0 in 6, 6.1 in 6, 6.4 in 5, 6.3 in 2, 5.9 in 2, 5.7 in 1 [shape Axis 1]; Swift 6 mode everywhere in 25, mostly 6 with targets pinned to 5 in 4, mostly 5 in 1 (tuist), all 5 in 8 [shape Axis 1; conc Axis 6: "Tools version does NOT predict language mode"]; `unsafeFlags` in 10; versioned fallbacks in 8 repos (15 files, all `MAJOR.MINOR`). The five upcoming features appear in 19 (`MemberImportVisibility`), 15 (`ExistentialAny`), 11 (`InternalImportsByDefault`), 7 (`NonisolatedNonsendingByDefault`), 7 (`InferIsolatedConformances`) manifests [MP §5]. `-warnings-as-errors` gates PRs in 12 of 40 repos and SE-0443 manifest settings are in 2 (`swift-aws-lambda-runtime@8abd464310c7:Package.swift:7,154`; vapor's is commented out, `vapor@bf77fc69b142:Package.swift:247`) [gates Axis 5]; that policy is SW-GATE's.

### Future consumers

The three skeletons below build and test green on `swift:6.4` and `swift:6.3.3`, except the CLI on 6.3.3, which is red by design (tools 6.4: `package 'cli' is using Swift tools version 6.4.0 but the installed version is 6.3.3`, MP V29); `swift format lint --strict -r` exits 0 with `{"version":1,"indentation":{"spaces":4},"lineLength":120}` (owner Q2 default; SW-GATE owns the final config). Fixtures: `F-MP/d-skeletons/{library,cli,sdk}`.

**Library (the shape every published library follows), tools 6.2** (rules 01, 05, 07, 08, 11, 12, 13, 14, 16, 18):

```swift
// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "ExampleKit",
    products: [
        .library(name: "ExampleKit", targets: ["ExampleKit"])
    ],
    targets: [
        .target(name: "ExampleKit"),
        .testTarget(name: "ExampleKitTests", dependencies: ["ExampleKit"]),
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
}
```

**SDK wrapping the ocx CLI (`ocx-sdk-swift`), tools 6.2**: the same loop and `swiftLanguageModes: [.v6]`, with this head. The dependency lower bound is `1.0.1` (C15); the source needs `public import Subprocess` because `OCX` exposes `Subprocess.Executable`, and `import Foundation` wherever `MemberImportVisibility` demands it.

```swift
// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "ocx-sdk-swift",
    products: [
        .library(name: "OCXKit", targets: ["OCXKit"])
    ],
    dependencies: [
        .package(url: "https://github.com/swiftlang/swift-subprocess", from: "1.0.1")
    ],
    targets: [
        .target(
            name: "OCXKit",
            dependencies: [.product(name: "Subprocess", package: "swift-subprocess")]
        ),
        .testTarget(name: "OCXKitTests", dependencies: ["OCXKit"]),
    ],
    swiftLanguageModes: [.v6]
)
```

**CLI or server (leaf), tools 6.4**: the same loop and `swiftLanguageModes: [.v6]`; a thin `example` executable over an `ExampleCore` library so the logic is testable; no `defaultIsolation` (owner Q3); the head is `swift-tools-version: 6.4` with `.package(url: "https://github.com/apple/swift-argument-parser", from: "1.8.0")` ([MP §14] has it verbatim). A CLI that ships also tracks `Package.resolved` and runs SW-PKG-28 and 29 in CI; the SDK library gitignores it (SW-PKG-27).

Consumer map: the **SDK** (a library) is bound by 01-09, 11-25 (rule 10 and 34 only if it adds a swift-syntax dependency), 27, 30, 31, 33; a **leaf CLI or server** by 01-08, 11-24, 26, 28-31 (rule 09 and 25 only if it is also published as a library); a **macro or plugin dependency** (consumed, never authored) by 10, 34, 36; an **Apple app package** by 06, 13-15, 18 and the unverified items. Rules 06, 14, 15, 18, 20, 21 read `Package*.swift`, so the index glob for this family must be `**/Package*.swift` (the narrow `**/Package.swift` misses 15 versioned files [cfg §2]).

## AI-agent failure modes

Ranked by corpus frequency times blast radius. Agent failure itself is not measured; the order is judgement and the counts are the human-written proxy. Each row names the mechanical check.

| # | Mistake | Why it compiles or looks right | Mechanical check |
|---|---|---|---|
| 1 | Writes `defaultSwiftSettings:` / `.defaults` after reading WWDC26 or SE-0540 text | the proposal is accepted and documented; the manifest fails to compile on 6.4 | SW-PKG-01 grep; `swift build` exit 1 |
| 2 | Reads the floor with `head -1 Package.swift` or `jq .swiftLanguageModes` and concludes "no mode declared"; edits `Package.swift` while a `Package@swift-X.swift` shadows it | tools-version may be on line 2; the key is `swiftLanguageVersions`; the edit has no effect | SW-PKG-06 command under `pipefail` (red runs MP V08, V09, CN R7) |
| 3 | Keeps `swift package init`'s template: tools 6.4 on a library, the `ApproachableConcurrency` bundle, no mode | the template is what the tool printed | SW-PKG-12, 13, 16, 07 (MP V13, V14, V23) |
| 4 | `from: "604.0.0"` for swift-syntax; closed range `"1.0.0"..."2.0.0"`; `from: "1.0"`; `exact:`, `branch: "main"` or `revision:` to silence a resolver conflict | the Xcode macro template writes the first; the others make the error go away | SW-PKG-10 and 09 jq (DR V6, V14, V15; CN R2, R9) |
| 5 | Treats `Package.resolved` as a lock without the flag; gitignores it for a CLI; runs `swift package update` in the build job; passes `--locked`/`--frozen` | cargo habit; the plain build exits 0 and rewrites the file | SW-PKG-26, 28, 29, 30, 31 (CN R1) |
| 6 | Sets package-level `swiftLanguageModes: [.v5]` "to get it compiling" | one line silences every target and every later check | SW-PKG-14 grep and jq (MP V15; CN R3) |
| 7 | Invents or misspells a feature (`NonIsolatedNonsendingByDefault`, `LifetimeDependence` as upcoming, `FullTypedThrows`), or lists all 15 Swift-6-group names "to be safe" | unknown names are ignored silently; redundancy is only a warning until warnings-as-errors | SW-PKG-02 guard build, SW-PKG-03 grep (MP V17-V20) |
| 8 | Puts settings in a `let swiftSettings` variable per target, then runs `swift package migrate` or hand-edits dependencies | fastest way to share settings; `migrate` rewrites sources then fails | SW-PKG-18 grep, SW-PKG-32 exit status (MP V03, V04) |
| 9 | Adds `unsafeFlags(["-warnings-as-errors"])` or `-Xfrontend` flags to a published library at tools 6.1 | the build is green locally | SW-PKG-04 pre-filter and consumer build (MP V01, V02) |
| 10 | Creates `Package@swift-6.swift` or a versioned file newer than `Package.swift` "for compatibility" | looks like the documented mechanism | SW-PKG-21 find and `tools-version` (MP V05, V06) |
| 11 | `platforms: [.linux]`, or raises `.macOS(.v14)` to fix a Linux build; `.v27` at tools 6.3 | Linux ignores the list; `.linux` and `.v27` are compile errors | SW-PKG-05 build (MP V28) |
| 12 | Depends on an `_`-prefixed product because it autocompletes (`_NIOFileSystem`, `_CryptoExtras`) | the other server frameworks do | SW-PKG-24 grep (DR V13, V21) |
| 13 | `traits: ["X"]` expecting the defaults to stay; invents `.package(url:..., traits: .defaults + ["X"])`; `#if Zedd` for a declared `Zed` | `["X"]` compiles; a typo is silently false | SW-PKG-23 `-Pzl` grep, SW-PKG-35 matrix; the typo hole stays open (DR V12) |
| 14 | Copies `"3.0.0"..<"5.0.0"` (or `from:`) for swift-crypto from older docs | worked until 5.0.0 shipped in 2026-09 | SW-PKG-25 grep (DR V16, V22) |
| 15 | Widens a swift-syntax range without a ladder or a lowest-bound build; gates swift-syntax API with `#if swift(>=6.2)` | compiles on the resolved latest; the compiler version is not the library version | SW-PKG-34 consumer build at `exact: <lowest>` (DR V7) |

## Open questions

### Owner decisions (the program applies the default until told otherwise)

1. **Floors (Q1).** Default: library and SDK 6.2, leaf CLI and server the current release. Alternative for contributor reach: a CLI at 6.2 (C8).
2. **Formatter config for the skeletons (Q2).** Default: 4 spaces, 120 columns; SW-GATE owns the file, this artifact only reformats the skeletons to it.
3. **Default isolation (Q3).** Default: no `defaultIsolation(MainActor.self)` in CLIs, libraries, the SDK or servers (SW-PKG-19).
4. **Brownfield.** SW-PKG-07, 11 and 02 fail an existing tree below 6.2 or without the features. Default: new packages enforce them whole-tree; existing repos lint changed manifests only and adopt one feature at a time through SW-PKG-32, never lowering a rule to fit.
5. **Underscored products (C12).** Default: ban with an `exact:` plus dated-reason exception. If the fleet adopts `_NIOFileSystem` for file work, the owner decides whether swift-nio's graduation makes it an allowed exception.
6. **swift-syntax upper bound.** Default: `current+1` is the audited minimum; `current+2` only with a CI leg on the newest prerelease (C14). The treadmill cost is a release per Swift release either way.
7. **Macro authoring (SW-PKG-38).** Default: not in fleet scope; consuming third-party macro packages is allowed.
8. **Windows manifests (Q7).** Default: unverified; no Windows behaviour is claimed anywhere in this family.

### Another research round

1. **A `swift:6.2` compiler (manifest).** Do the three skeletons and the five-feature guard (SW-PKG-02, 07, 08) compile on 6.2.x? Only the 6.3 loader enforced the 6.2 API gating; no 6.2 compiler ran. A 6.2 compiler rejecting any listed name under the guard would turn SW-PKG-02 red at the floor leg.
2. **swift-syntax prebuilts (dependencies).** On a distro SwiftPM lists (ubuntu noble, fedora 41, rhel 9, debian 12), does an exact-prerelease pin defeat prebuilts where a range does not? The research image (Ubuntu `resolute`) is unlisted, so "defeats prebuilts" stays an inference from the version-keyed lookup [DR §6].
3. **Unresearched P3 rows M-L-17..20 (dependencies).** Binary targets, registries, test-target-only settings and local `path:` dependencies; in particular whether a `path:` dependency blocks a version-tag consumer (it does not for `unsafeFlags`, MP V01) and what SW-PKG-09 should say about registry `id:` dependencies, which the jq filter does not read (tuist has 62).
4. **Xcode and macOS (manifest, dependencies).** How the same manifests behave in Xcode 26.x (the xcodebuild lock flag `-onlyUsePackageVersionsFromResolvedFile`, `Package.resolved` under `xcshareddata`, traits support from 26.4, deployment floors from `platforms:`). All `unverified: read only`; needs a macOS runner.
5. **Re-check when the ecosystem moves (manifest, dependencies).** Re-run SW-PKG-01, 18 and the loop when SE-0540 / PR #10033 ships; re-run SW-PKG-10 and 34 when SwiftPM supports multiple majors ([forum 86317](https://forums.swift.org/t/multiple-major-versions-of-a-package-in-swiftpm-opening-the-discussion/86317)); bump the `lo`/`hi` constants of SW-PKG-10 at each Swift release.

## Sub-artifacts

- [swift-package/manifest-policy.md](swift-package/manifest-policy.md): floors per package kind, declared versus effective language mode (8 manifests, 2 images), the 21-name upcoming-feature registry compiled under `StrictLanguageFeatures`, `unsafeFlags` consumer matrix, `swift package migrate` shapes, versioned-manifest selection matrix (8 cases), `platforms:`, `add-*` commands, verbatim library / CLI / SDK skeletons. 18 candidate rules (MP-01..18), 34 verification rows.
- [swift-package/dependencies-and-resolution.md](swift-package/dependencies-and-resolution.md): `Package.resolved` and `--force-resolved-versions` semantics, `originHash`, requirement forms, swift-syntax ranges, prereleases, ladder and prebuilts, traits (SE-0450), underscored products, the swift-crypto range, plugins and generated code. 18 candidate rules (D01..D18), 25 verification rows.
- Audits used: [exemplar-packaging-and-release.md](swift-audit/exemplar-packaging-and-release.md) (tools-version histogram, requirement census, lockfile and macro tables), [config-inventory.md](swift-audit/config-inventory.md) (the `Package@swift-*.swift` glob measurement, the checker contract), [exemplar-concurrency.md](swift-audit/exemplar-concurrency.md) (Axis 6 language-mode posture), [exemplar-language-shape.md](swift-audit/exemplar-language-shape.md) (Axis 1 manifest census), [exemplar-quality-gates.md](swift-audit/exemplar-quality-gates.md) (Axis 5 warnings policy); [swift-frame.md](swift-frame.md) and [swift-topic-map.md](swift-topic-map.md) (rows K and L, conflicts 4, 7, 8, 9).

## Key sources

1. https://docs.swift.org/swiftpm/documentation/packagemanagerdocs/settingswifttoolsversion : tools version, the later-line rule since 6.0, and "if the tools version of a dependency is greater than the version in use, that version is ineligible".
2. https://docs.swift.org/swiftpm/documentation/packagemanagerdocs/swiftversionspecificpackaging : `Package@swift-X.swift` selection and the "newest tools version in `Package.swift`" best practice.
3. https://docs.swift.org/swiftpm/data/documentation/packagedescription/swiftsetting/unsafeflags(_:_:).json : "ineligible for use by other packages".
4. https://docs.swift.org/swiftpm/data/documentation/packagedescription/swiftsetting/enableupcomingfeature(_:_:).json : "Targets will ignore any unknown upcoming features".
5. https://www.swift.org/migration/data/documentation/swift-6-concurrency-migration-guide/featuremigration.json : `swift package migrate` and its failure with settings in a variable.
6. https://www.swift.org/migration/data/documentation/swift-6-concurrency-migration-guide/enabledataracesafety.json : tools 6.0 enables mode 6; the per-target pattern.
7. https://github.com/swiftlang/swift-evolution/blob/main/proposals/0540-default-target-settings.md : SE-0540, accepted with modifications 2026-09-06.
8. https://github.com/swiftlang/swift-package-manager/pull/10033 : the SE-0540 implementation PR (open, blocked, 2026-10-08).
9. https://raw.githubusercontent.com/swiftlang/swift/release/6.4.0/include/swift/Basic/Features.def : the 15 + 6 upcoming features and their groups (identical to `release/6.3`).
10. https://raw.githubusercontent.com/swiftlang/swift/release/6.4.0/userdocs/diagnostics/strict-language-features.md : the silent-by-default rationale of `StrictLanguageFeatures`.
11. https://raw.githubusercontent.com/swiftlang/swift-package-manager/main/Sources/PackageManagerDocs/Documentation.docc/ResolvingPackageVersions.md : `Package.resolved` does not pin libraries; `--force-resolved-versions`.
12. https://github.com/swiftlang/swift-evolution/blob/main/proposals/0450-swiftpm-package-traits.md : SE-0450, unification, defaults, `--traits` flags, future directions on resolution.
13. https://raw.githubusercontent.com/swiftlang/swift-syntax/main/Sources/SwiftSyntax/Documentation.docc/Macro%20Versioning.md : the range plus `canImport(SwiftSyntaxNNN)` guidance.
14. https://forums.swift.org/t/macros-in-foundational-libraries/82587 : Apple's opt-out position and the trait-pruning criteria (2025-10-08).
15. https://raw.githubusercontent.com/apple/swift-crypto/main/README.md : "1.x, 2.x, 3.x, 4.x, and 5.x are almost API compatible" and the underscore-is-outside-SemVer policy.
