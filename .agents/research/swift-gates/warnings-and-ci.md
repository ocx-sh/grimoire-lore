---
title: "Swift gate block, warnings-as-errors, API breakage, DocC and the CI matrix (SW-GATE)"
topic: "Swift quality gates: the K-01 gate block, warning control (SE-0443 / SE-0480 / SE-0522), API-breakage and DocC gates, CI matrix and workflow pinning"
agent: "W2-4 gates/warnings-and-ci"
model: sonnet
date_researched: 2026-10-10
sources_count: 22
fixtures: /home/mherwig/.cache/research-lang/swift-tools/fixtures/warnings-and-ci/
scope: |
  Covers rows M-K-01, M-M-06..M-M-13 and M-L-05: the verbatim gate block, the warnings policy and promoted groups,
  `@diagnose`, dependency-warning suppression, `diagnose-api-breaking-changes`, the DocC gate and `.spi.yml`,
  `swiftlang/github-workflows` 0.0.15, the minimum CI matrix and the pinning rule, `StrictLanguageFeatures`.
  Every runnable claim was run on Swift 6.4.0 and, where noted, 6.3.3 (Linux, Docker). macOS, Windows and nightly
  claims are "unverified: read only". Not covered: formatter/linter choice and config (gates/format-and-lint owns the
  step-1 content), Swift Testing style, release/static-SDK recipes, Bazel.
---

# Swift gate block, warnings-as-errors, API breakage, DocC and CI matrix

Date of all measurements: 2026-10-10. Toolchains: `swift:6.4` (Swift 6.4.0) and `swift:6.3` (6.3.3) Docker images via
`~/.cache/research-lang/swift-tools/run.sh`. All fixtures live under
`/home/mherwig/.cache/research-lang/swift-tools/fixtures/warnings-and-ci/` (helper scripts `t.sh`, `tc.sh`, `pk.sh`,
`fmt.sh`, `chk.sh`, `mk-*.sh` regenerate and rerun everything; every build used
`--scratch-path "$SWIFT_SCRATCH/warnings-and-ci/<slug>"`).

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   - 2.1 The three warning-control layers and their spellings
   - 2.2 Dependency warnings: path versus remote
   - 2.3 Groups: what the blanket flag misses, what older toolchains do not know
   - 2.4 `@diagnose`: syntax, `reason:`, scope, guards
   - 2.5 `StrictLanguageFeatures` and unknown names
   - 2.6 The gate block (K-01): ordered, with exit semantics
   - 2.7 API-breakage gate
   - 2.8 DocC gate, `.spi.yml`, vacuity
   - 2.9 `swiftlang/github-workflows` 0.0.15: what it runs and what it hides
   - 2.10 CI matrix
   - 2.11 Workflow and action pinning
   - 2.12 `--explicit-target-dependency-import-check` is not a gate
   - 2.13 Where each gate lives
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- The gate block is five commands in this order: `git ls-files ... | xargs ... swift format lint --strict`, `swift build -Xswiftc -warnings-as-errors`, `swift test -Xswiftc -warnings-as-errors`, then for libraries `swift package diagnose-api-breaking-changes "$BASELINE"` and `swift package plugin generate-documentation --target "$DOCC_TARGET" --warnings-as-errors --analyze` (Swift 6.3 and 6.4; steps 1-3 run end to end on a planted package, 4 and 5 on their own fixtures).
- The CI warnings gate is the blanket flag `-Xswiftc -warnings-as-errors` on release-toolchain legs only. Nightly legs omit it. The blanket form is the only one that also catches ungrouped warnings (a no-op forced cast has no group) and groups an older toolchain does not know.
- `-Xswiftc -warnings-as-errors` fails on warnings inside a local path dependency (red, exit 1, Swift 6.3 and 6.4), but a remote (git URL) dependency never fails it because SwiftPM substitutes `-suppress-warnings` for remote targets (green, exit 0, both toolchains).
- The manifest form `.treatAllWarnings(as: .error)` applies to the root package's own targets only, needs `// swift-tools-version:6.2` or newer (older tools versions fail with "was introduced in PackageDescription 6.2"), and does not leak to dependents; but it fails the package's own build on any toolchain that adds a warning, so it is for pinned-toolchain CLIs/apps or behind an environment switch, not the library default.
- Never write `unsafeFlags(["-warnings-as-errors"])`: at tools version 6.1 or older a remote dependent fails with "contains unsafe build flags" (red); `.treatAllWarnings` exists since 6.2 and has no such cost.
- A misspelt group is silent: `-Xswiftc -Werror -Xswiftc NoUsag` builds green (exit 0) with only `unknown warning group` warnings. Promote `UnknownWarningGroup` (a default-on warning, observed on 6.3 and 6.4) or rely on the blanket flag to make a typo fatal.
- Per-group promotion is toolchain-dependent: `NoUsage`, `VariableNeverMutated`, `NoUseUnstructuredThrowingTask`, `UntypedThrows` are unknown groups on Swift 6.3.3 (only a warning there). Put per-group `-Werror` only on groups present on the oldest matrix leg; `DeprecatedDeclaration`, `ExplicitSendable`, `StrictLanguageFeatures`, `UnknownWarningGroup` exist on both 6.3 and 6.4.
- Opt-in groups the blanket flag does not enable: `ExplicitSendable` (public types without `Sendable`/`~Sendable`) is silent under `-warnings-as-errors` and errors under `-Werror ExplicitSendable` (6.3 and 6.4); `StrictLanguageFeatures` catches misspelt `-enable-upcoming-feature` names (silent without it).
- `@diagnose(Group, as: error|warning|ignored, reason: "...")` is accepted on 6.4 with no flag (SE-0522); `reason:` is optional and its absence produces no diagnostic, so "reason required" is a grep-checked house rule; `reason:` must be a plain string literal (interpolation and variables are compile errors). On 6.3 it is `error: unknown attribute 'diagnose'`; guard with `#if hasFeature(SourceWarningControl)`, which is true on 6.4 and false on 6.3.
- A misspelt group inside `@diagnose` is only a warning (`the diagnostic group identifier ... is unknown`), which the blanket flag then escalates.
- `swift package diagnose-api-breaking-changes v1` works under the default Swift Build engine on Linux for 6.4 and 6.3: removed public func is red (exit 1), additive twin is green (exit 0), a missing baseline ref is red, and `--breakage-allowlist-path` turns the red green by listing the exact message, so the allowlist file is a weakening surface.
- DocC `--warnings-as-errors` turns an unresolved ``` ``Symbol`` ``` link red (exit 1 on 6.4), the fixed twin green; without the flag the same broken link exits 0. The shared `check-docs.sh` exits 0 with "no documentation targets to check" when `.spi.yml` is absent, so the docs gate is vacuous without `.spi.yml` carrying a non-empty `documentation_targets`.
- `swift format lint` without `--strict` exits 0 on findings, and a nonexistent path operand (`Source` for `Sources`) also exits 0 silently; feed it `git ls-files` instead (findings exit 123 through `xargs`).
- `swiftlang/github-workflows@0.0.15` `swift_package_test.yml` defaults `linux_swift_versions` to 5.9, 5.10, 6.0-6.3, `nightly-main`, `nightly-6.4.x`: Swift 6.4 is absent, so callers must pass the list.
- Pin every `uses:` to a 40-hex SHA with a version comment; reusable workflows too. A tag or SHA pin of `soundness.yml` does not freeze its scripts: the jobs check out `swiftlang/github-workflows` with no `ref:`, so `check-docs.sh` and `check-swift-format.sh` come from the default branch at run time.
- `--explicit-target-dependency-import-check error` did not go red on a planted undeclared transitive import under either engine (6.3 and 6.4): do not cite it as enforcement ([#9620](https://github.com/swiftlang/swift-package-manager/issues/9620)).
- The minimum matrix is Linux release legs for the tools-version floor and the current release (gating, with the warnings flag), a Linux nightly leg (no warnings flag), plus one build leg per platform the package claims (Windows with `Invoke-Program`, static Linux SDK, Wasm); macOS legs are unverified: read only.

## Findings

### 2.1 The three warning-control layers and their spellings

Version-tagged, each verified by a run unless marked.

| Layer | Spelling | Since | Evidence |
|---|---|---|---|
| Compiler CLI | `-Werror <Group>`, `-Wwarning <Group>`, `-warnings-as-errors`, `-no-warnings-as-errors`; last flag wins | 6.1 (SE-0443) | [SE-0443](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0443-warning-control-flags.md): "Status: Implemented (Swift 6.1)", "the last one wins"; ran: `-warnings-as-errors -Wwarning DeprecatedDeclaration` leaves the deprecation a warning and promotes the rest |
| SwiftPM CLI passthrough | `swift build -Xswiftc -Werror -Xswiftc <Group>` (every token is its own `-Xswiftc`) | 6.1 | ran (fixture `g`); one string `"-Werror DeprecatedDeclaration"` is `error: unknown argument` (loud) |
| Manifest | `.treatAllWarnings(as: .error)`, `.treatWarning("Group", as: .error)`, `.treatWarning("Group", as: .warning)` on `SwiftSetting`, order preserved, `-Xswiftc` appended after | 6.2 (SE-0480), `// swift-tools-version:6.2` | [SE-0480](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0480-swiftpm-warning-control.md) mapping table: `treatAllWarnings(as: .error)` = `-warnings-as-errors`, `treatWarning("XXXX", as: .error)` = `-Werror XXXX`; ran: tools 6.1 manifest gives `'treatAllWarnings(as:_:)' was introduced in PackageDescription 6.2` (fixture `l/t61`) |
| Source | `@diagnose(Group, as: error \| warning \| ignored, reason: "...")` on declarations and imports | 6.4 (SE-0522); experimental flag `SourceWarningControl` | [SE-0522](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0522-source-warning-control.md) "Implemented (Swift 6.4)"; [CHANGELOG 6.4](https://raw.githubusercontent.com/swiftlang/swift/main/CHANGELOG.md) lines 81-88; ran (fixture `b`) |

Correct and incorrect spellings, all executed:

```swift
// Package.swift, tools 6.2+, RIGHT
swiftSettings: [.treatAllWarnings(as: .error),
                .treatWarning("DeprecatedDeclaration", as: .warning)]   // order matters: last wins

// WRONG (agents write these)
swiftSettings: [.treatAllWarningsAsErrors()]            // error: type 'SwiftSetting' has no member 'treatAllWarningsAsErrors' (fixture l/hall)
swiftSettings: [.unsafeFlags(["-warnings-as-errors"])]   // blocks remote dependents at tools < 6.2 (fixture k61)
```

```sh
swift build -Xswiftc -Werror -Xswiftc DeprecatedDeclaration   # RIGHT: each token separate
swiftc -Werror=DeprecatedDeclaration x.swift                  # WRONG (Clang spelling): error: unknown argument
swiftc -Werror x.swift                                        # WRONG: error: missing argument value for '-Werror'
swiftc -Wno-error / -Wall x.swift                             # WRONG: error: unknown argument
```

SwiftPM order: manifest flags first, then `-Xswiftc` ([SE-0480](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0480-swiftpm-warning-control.md) "Interaction with command-line flags"). Ran: a root with `.treatAllWarnings(as: .error)` and `swift build -Xswiftc -no-warnings-as-errors` builds green with the dependency warning shown as a warning (fixture `a/RootManifest`, exit 0).

`-suppress-warnings` cannot be combined with `-Werror`: `error: conflicting options '-Werror' and '-suppress-warnings'` (ran, 6.4; matches SE-0443 "forbidden to combine").

### 2.2 Dependency warnings: path versus remote

The same `Dep` (one `@available(*, deprecated)` function called from inside `Dep`) consumed three ways. Fixtures `a/`, `a2/`, `a3/`.

| Consumer | Command | 6.4 | 6.3 |
|---|---|---|---|
| root + `.package(path: "../Dep")`, no settings | `swift build -Xswiftc -warnings-as-errors` | exit 1, `Dep.swift:5:31: error: 'oldThing()' is deprecated ... [#DeprecatedDeclaration]` | exit 1, same |
| same root with `.treatAllWarnings(as: .error)` in the root target only | `swift build` | exit 0, dependency warning stays a warning | exit 0 |
| same root, own code has a deprecation use | `swift build` | exit 1 (the manifest setting does bite its own target) | exit 1 |
| root + `.package(url: "file:///.../DepGit", from: "1.0.0")` (git remote) with `.treatAllWarnings(as: .error)` | `swift build -Xswiftc -warnings-as-errors` | exit 0, no dependency warning printed | exit 0 |
| library whose own manifest says `.treatAllWarnings(as: .error)`, built as root | `swift build` | exit 1 | not run |
| the same library consumed by git URL from another root | `swift build` | exit 0 | not run |

So: SwiftPM strips warning-control flags for remote targets and substitutes `-suppress-warnings` ([SE-0480](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0480-swiftpm-warning-control.md) "Remote targets behavior"; swift-testing documents the consequence at `swift-testing@c7d68ca20cd7:Package.swift:436-438`). Local path dependencies are not remote and are not suppressed. Consequences:

- A gate on a monorepo that uses `path:` dependencies sees the dependency's warnings; a gate on a repo with only registry/git dependencies does not.
- `.treatAllWarnings(as: .error)` is harmless to consumers (they never see it) and local-only in effect.
- `@diagnose` has no effect under `-suppress-warnings` ([SE-0522](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0522-source-warning-control.md) "Interaction with `-suppress-warnings`"), same mechanism.
- `unsafeFlags`: a dependency manifest at tools 6.1 with `unsafeFlags(["-warnings-as-errors"])` consumed by git URL: `error: ... the target 'UnsafeDep' in product 'UnsafeDep' contains unsafe build flags` (exit 1, 6.4); by path: exit 0. The same manifest at tools 6.2: exit 0 remote (6.3 and 6.4), so the restriction is relaxed from 6.2 on ([eco](../swift-topic-map/ecosystem-tooling.md) section 4 cites `PackageBuilder.swift:1073`). Fixtures `k/`, `k61/`.

### 2.3 Groups: what the blanket flag misses, what older toolchains do not know

Probe package (fixture `g`, Swift 6.4) produced these warnings. Group tags are printed by SwiftPM in 6.4 as `[#Group]`:

| Source line | Warning | Group |
|---|---|---|
| `result()` result unused | `result of call to 'result()' is unused` | `NoUsage` |
| `let unusedLet = 1` | `initialization of immutable value ... never used` | `NoUsage` |
| `var neverMutated` | `variable ... was never mutated` | `VariableNeverMutated` |
| `old()` deprecated | `'old()' is deprecated` | `DeprecatedDeclaration` |
| `Task { try await thrower() }` | `unstructured throwing task ... is not used, which may accidentally ignore errors` | `NoUseUnstructuredThrowingTask` |
| `n as! Int` where `n: Int` | `forced cast of 'Int' to same type has no effect` | none |

Ran: `-Xswiftc -Werror -Xswiftc NoUsage` promotes only the three `NoUsage` lines (exit 1, twin `gclean` exit 0). `-Xswiftc -warnings-as-errors` promotes all seven, including the ungrouped one. Therefore the blanket flag is the gate; group promotion is refinement.

Toolchain skew (Swift 6.3.3, `swiftc -typecheck -Werror <Group>`): `NoUsage`, `VariableNeverMutated`, `NoUseUnstructuredThrowingTask`, `UntypedThrows` each print `warning: unknown warning group: '<Group>' [#UnknownWarningGroup]`; `DeprecatedDeclaration`, `ExplicitSendable`, `StrictLanguageFeatures`, `UnknownWarningGroup` are silent (known). So a per-group list that works on 6.4 degrades silently on 6.3.

The misspelling trap (ran, fixtures `g` and `h/`):

| Command / manifest | Result |
|---|---|
| `swift build -Xswiftc -Werror -Xswiftc NoUsag` | exit 0, `<unknown>:0: warning: unknown warning group: 'NoUsag' [#UnknownWarningGroup]`, all other warnings still warnings |
| `... -Xswiftc -Werror -Xswiftc UnknownWarningGroup -Xswiftc -Werror -Xswiftc NoUsag` | exit 1, `error: unknown warning group: 'NoUsag'` |
| manifest `.treatWarning("NoUsag", as: .error)` | exit 0 (silent) |
| manifest `.treatWarning("UnknownWarningGroup", as: .error), .treatWarning("NoUsag", as: .error)` | exit 1, in either order (unknown-group diagnostics are emitted after all options are processed) |

[unknown-warning-group.md](https://raw.githubusercontent.com/swiftlang/swift/main/userdocs/diagnostics/unknown-warning-group.md) documents the second row.

Opt-in groups that the blanket flag does not turn on (ran on 6.3 and 6.4 with `-parse-as-library`, three public types without `Sendable` conformance):

| Flags | Result |
|---|---|
| none, or `-warnings-as-errors` | exit 0, silent |
| `-Wwarning ExplicitSendable` | exit 0, 3 warnings `public struct 'Thing' does not specify whether it is 'Sendable' or not [#ExplicitSendable]` |
| `-Werror ExplicitSendable` | exit 1, same 3 as errors |

`-Werror`/`-Wwarning` on a default-suppressed group enables it; this is how swift-testing turns it on for development (`swift-testing@c7d68ca20cd7:Package.swift:439-441`, `.treatWarning("ExplicitSendable", as: .warning)`) and how `-Xswiftc -require-explicit-sendable` in `swift-log@4038b6a4f74a:.github/workflows/pull_request.yml:22-26` reaches the same check.

Promoted-group list (the decision):

1. Blanket `-warnings-as-errors` on release-toolchain legs (all warnings, grouped or not).
2. In addition, for any manifest that calls `.enableUpcomingFeature` or `.enableExperimentalFeature`: `StrictLanguageFeatures` (default-suppressed, section 2.5).
3. In addition, for libraries with public API: `ExplicitSendable` (default-suppressed).
4. `UnknownWarningGroup` whenever any per-group flag or `.treatWarning` is used without the blanket flag in force (nightly legs, local dev).
5. `DeprecatedDeclaration` is the one group deliberately demoted (`-Wwarning DeprecatedDeclaration` or `.treatWarning("DeprecatedDeclaration", as: .warning)`) on a toolchain-upgrade branch, the motivating case of SE-0443.
6. Never promote the performance-hint groups globally (`PerformanceHints` and its subgroups `ExistentialType`, `HeapAllocation`, `ReturnTypeImplicitCopy`, `UntypedThrows`; off by default per [`performance-hints.md`](https://github.com/swiftlang/swift/tree/main/userdocs/diagnostics)); they are for named hot modules only.

### 2.4 `@diagnose`: syntax, `reason:`, scope, guards

Grammar from [SE-0522](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0522-source-warning-control.md) "Detailed design": `@diagnose(group, as: error|warning|ignored)` with an optional third argument `reason: "<static string literal>"`, "must not have any string interpolation". Applies to type, extension, function, init, accessor, enum case, typealias, macro declarations and `import`; lexically-last attribute on one declaration wins; compilation errors cannot be controlled; ignored under `-suppress-warnings`.

Ran on 6.4 with `swiftc -typecheck` (fixture `b/`, no experimental flag needed):

| File | Result |
|---|---|
| `@diagnose(DeprecatedDeclaration, as: ignored)` (no `reason:`) | exit 0, no diagnostic of any kind |
| same with `reason: "kept until the 2.0 migration, tracked in the changelog"` | exit 0 |
| `reason: "because \(why)"` | exit 1, `error: 'diagnose' cannot be an interpolated string literal` |
| `reason: r` (a `let`) | exit 1, `error: expected string literal in 'diagnose' attribute` |
| `as: silenced` | exit 1, `error: expected diagnostic behavior argument 'silenced' to be either 'error', 'warning' or 'ignored'` |
| `@diagnose(DeprecatedDeclarations, as: ignored, ...)` (typo) | exit 0 with `warning: the diagnostic group identifier 'DeprecatedDeclarations' is unknown`, and the deprecation warning still fires; with `-warnings-as-errors` exit 1 |
| `@diagnose(DeprecatedDeclaration, as: error)` on one func | only that func errors; the sibling stays a warning (exit 1) |
| `@diagnose(..., as: warning)` on one func under `-warnings-as-errors` | that func warns, the sibling errors (exit 1) |
| Swift 6.3.3, any `@diagnose` | `error: unknown attribute 'diagnose'` (exit 1) |

So `reason:` is optional in the language on 6.4; there is no compiler diagnostic that requires it. "Only with `reason:`" (map conflict 9) is therefore a house rule checked by grep (rule SW-GATE-08), not by the compiler. Real-world use contradicts it: all 43 non-comment `@diagnose` lines in swift-crypto lack `reason:` (section 5).

Guard for packages that still build on 6.3 (copied from `swift-crypto@1c80d3aff53f:Sources/CryptoExtras/AES/CMAC.swift:17-21`, run in fixture `b/guard.swift`):

```swift
#if hasFeature(SourceWarningControl)
@diagnose(ImplementationOnlyDeprecated, as: ignored, reason: "...")   // 6.4+
#endif
import CCryptoBoringSSL
```

On 6.4, `hasFeature(SourceWarningControl)` and `compiler(>=6.4)` are both true; on 6.3 both false and the plain deprecation warning appears.

The attribute name changed during design: the March 2026 digest and the pitch said `@warn`; it shipped as `@diagnose` ([shifts](../swift-topic-map/shifts.md) line 269). Models trained on pitch-era text emit `@warn`.

### 2.5 `StrictLanguageFeatures` and unknown names

By default a misspelt `-enable-upcoming-feature` / `-enable-experimental-feature` name is ignored silently "since some projects must be simultaneously compatible with multiple versions" ([strict-language-features.md](https://raw.githubusercontent.com/swiftlang/swift/main/userdocs/diagnostics/strict-language-features.md)). Ran (fixture `e/`):

| Command | Swift | Result |
|---|---|---|
| `swiftc -typecheck -enable-upcoming-feature ExistentalAny` (typo) | 6.4 | exit 0, silent |
| `... -Wwarning StrictLanguageFeatures` | 6.4 | exit 0, `warning: 'ExistentalAny' is not a recognized upcoming feature [#StrictLanguageFeatures::UnrecognizedStrictLanguageFeatures]` |
| `... -Werror StrictLanguageFeatures` | 6.4 | exit 1, same as `error:` |
| `... -enable-upcoming-feature ExistentialAny -Werror StrictLanguageFeatures` (correct) | 6.4 | exit 0 |
| `-enable-experimental-feature NoSuchThing -Werror StrictLanguageFeatures` | 6.4 | exit 1, `is not a recognized experimental feature` |
| typo + `-Werror StrictLanguageFeatures` | 6.3 | exit 1, tag printed as `[#UnrecognizedStrictLanguageFeatures]` (subgroup naming differs from 6.4) |
| manifest `.enableUpcomingFeature("ExistentalAny")` only (`e/typo-plain`) | 6.4 | `swift build` exit 0, silent |
| manifest typo + `.treatWarning("StrictLanguageFeatures", as: .error)` (`e/typo-strict`) | 6.4 and 6.3 | exit 1 |
| manifest correct name + the same setting (`e/ok-strict`) | 6.4 | exit 0 |

Neither SwiftPM nor the blanket flag validates feature names. Zero of the 40 exemplars use `StrictLanguageFeatures` (grep, section 5), yet 20/40 manifests enable `MemberImportVisibility` and 15/40 `ExistentialAny` ([eco](../swift-topic-map/ecosystem-tooling.md) section 16): each is one typo from silently not applying.

### 2.6 The gate block (K-01): ordered, with exit semantics

Verbatim block (the CORE index carries this; steps 4 and 5 are conditional lines):

```sh
# 1. format: no findings (xargs reports any failing invocation as exit 123; an empty file list passes)
git ls-files -z -- '*.swift' | xargs -r -0 swift format lint --strict --parallel
# 2. build: warnings are errors
swift build -Xswiftc -warnings-as-errors
# 3. test: same, applied to test targets
swift test -Xswiftc -warnings-as-errors
# 4. libraries with a tagged release: no breaking public API versus the baseline
swift package diagnose-api-breaking-changes "$BASELINE"
# 5. libraries with doc comments: DocC builds clean (needs .spi.yml documentation_targets)
swift package plugin generate-documentation --target "$DOCC_TARGET" --warnings-as-errors --analyze
```

The linter slot (SwiftLint) sits between 1 and 2 if the sibling dive `gates/format-and-lint` adopts it; its content is not decided here. Add `--disable-automatic-resolution` to steps 2 and 3 only when `Package.resolved` is committed (containerization does: `containerization@3e7bc39e66b3:.github/workflows/linux-build.yml:51,60`); without the file it is red: `error: a resolved file is required when automatic dependency resolution is disabled` (exit 1, fixture `a2/RootRemote`). Steps are strictly serial: the first non-zero exit stops the block.

Exit semantics, measured (fixture `j/`, script `gate-in.sh`, 6.4):

| Variant | Step 1 | Step 2 | Step 3 | Block |
|---|---|---|---|---|
| `ok` (compliant twin) | 0 | 0 | 0 | green |
| `badformat` | 123 (via xargs; direct `swift format lint --strict` exits 1) | not reached | | red |
| `warnsrc` (unused `let` in Lib) | 0 | 1 `[#NoUsage]` | not reached | red |
| `warntest` (never-mutated `var` in the test target) | 0 | 0 | 1 `[#VariableNeverMutated]` | red |
| `failtest` (`#expect(... == 6)` wrong) | 0 | 0 | 1 (compiles, test fails) | red |

Two exit-semantics traps found while building the block:

- `swift format lint` without `--strict` exits 0 while printing `warning: [Indentation]` findings (6.4). The flag is mandatory.
- `swift format lint --strict --recursive --parallel Source` (nonexistent directory), and `... Nope.swift` (nonexistent file), both exit 0 with no output on 6.3 and 6.4: a wrong path argument is a silent pass. `git ls-files -z -- '*.swift' | xargs -r -0 ...` cannot name a missing file; it is also what `swift-protobuf@6c84c3dedac0:.github/workflows/build.yml:141-146` and `check-swift-format.sh` do. (Containerization's `swift-fmt-check` uses a `find` list: `containerization@3e7bc39e66b3:Makefile:504-505`.)

The test step runs both XCTest and Swift Testing ([eco](../swift-topic-map/ecosystem-tooling.md) section 9 P1). `-Xswiftc -warnings-as-errors` compiled the test target with Swift Testing's macro expansion without extra warnings on 6.3 and 6.4 (`j/ok` exit 0 on both).

### 2.7 API-breakage gate

`swift package diagnose-api-breaking-changes <treeish>`; options `--breakage-allowlist-path`, `--products`, `--targets`, `--baseline-dir`, `--regenerate-baseline` (tool `--help`, 6.4). Ran on Linux with the default Swift Build engine (fixture `c/`: tag `v1` has `Greeter.greet` and `Greeter.shout`):

| Variant (change after `v1`) | 6.4 | 6.3 |
|---|---|---|
| `breaking`: remove `public func shout` | exit 1: `error: API breakage: func Greeter.shout(_:) has been removed [#api-digester-breaking-change]` / `1 breaking change detected in Lib` | exit 1, same |
| `additive`: add `public func whisper` | exit 0: `No breaking changes detected in Lib` | exit 0 |
| baseline `v9` (missing) | exit 1: `Couldn't get revision 'v9^{commit}': fatal: Needed a single revision` | not run |
| `breaking` + `--breakage-allowlist-path` file containing `API breakage: func Greeter.shout(_:) has been removed` | exit 0, `No breaking changes detected` | not run |

The baseline must be reachable: shallow clone without tags is a red, not a vacuous green. The shared workflow fetches with `fetch-tags: true` and `fetch-depth: 0` ([soundness.yml](https://raw.githubusercontent.com/swiftlang/github-workflows/0.0.15/.github/workflows/soundness.yml) `api-breakage-check`), uses the PR base ref as the default baseline (`git fetch ... ${GITHUB_BASE_REF}:pull-base-ref`, meaningful only on `pull_request` events), and runs in `swift:6.3-noble` by default. swift-protobuf does it inline: `swift package diagnose-api-breaking-changes origin/main` (`swift-protobuf@6c84c3dedac0:.github/workflows/build.yml:121`). The allowlist makes a red green, so a diff to that file is a policy change and is the agent's "weakening" edit (CORE-01).

### 2.8 DocC gate, `.spi.yml`, vacuity

Fixtures `d/` (plugin `swift-docc-plugin` 1.5.0 resolved from `from: "1.4.0"`; `.spi.yml` of the Swift Package Index shape):

| Variant | Command | 6.4 |
|---|---|---|
| `bad`: ``/// See ``Missing`` ...`` | `swift package plugin generate-documentation --target Lib --warnings-as-errors --analyze` | exit 1: `error: 'Missing' doesn't exist at '/Lib/Greeter'`, location `Sources/Lib/Lib.swift:1:26-1:33` |
| `bad`, flag dropped | `... --target Lib --analyze` | exit 0 (the broken link is a warning) |
| `good`: ``` ``Greeter`` ``` | with `--warnings-as-errors --analyze` | exit 0, `Generated documentation archive` |
| `analyze`: parameter `loudly` undocumented while `name` documented | with and without `--analyze` | exit 1 both: the missing-parameter diagnostics are warnings on 6.4 here; I could not isolate a case that only `--analyze` catches |

`--analyze` "Include[s] 'note'/'information' level diagnostics in addition to warnings and errors" (plugin `--help`, 1.5.0). The plugin README ([swift-docc-plugin](https://raw.githubusercontent.com/swiftlang/swift-docc-plugin/main/README.md)) does not list `--warnings-as-errors`; the plugin `--help` does.

What the shared "soundness" docs check runs (read in [`check-docs.sh`](https://raw.githubusercontent.com/swiftlang/github-workflows/0.0.15/.github/workflows/scripts/check-docs.sh) at 0.0.15, and executed in fixture copies with a small `yq` shim because the image has no `yq` and no root):

1. If `--doc-targets` is empty and `./.spi.yml` does not exist: log "No '.spi.yml' found ..., no documentation targets to check." and `exit 0`.
2. Otherwise read targets with `yq -r ".builder.configs[].documentation_targets[] | select(. != \"\")" .spi.yml`.
3. If `swift package dump-package` does not list `swift-docc-plugin`, append `package.dependencies.append(.package(url: ".../swift-docc-plugin", from: "1.0.0"))` to every `Package*.swift` (it edits the working tree).
4. For each target: `swift package plugin generate-documentation --target "$target" --warnings-as-errors $analyze_flag $additional_docc_arguments` (analyze default on).

Ran: `d/nospi` (same broken link, no `.spi.yml`): `check-docs.sh` exit 0 (vacuous). `d/bad` with `.spi.yml`: exit 1. `d/good` with `.spi.yml`: exit 0 ("Found no documentation issues"). An `.spi.yml` without any `documentation_targets` would also loop zero times; I could not confirm real `yq` behaviour on that shape (unverified: shim only). [SPIManifest](https://swiftpackageindex.com/SwiftPackageIndex/SPIManifest/1.13.1/documentation/spimanifest/commonusecases) defines the key: `builder.configs[].documentation_targets: [Target1, Target2]`, first target is the landing page, the manifest need not include the DocC plugin because the index injects it; other keys seen: `platform`, `swift_version`, `custom_documentation_parameters`, `external_links.documentation`. Example from the corpus: `swift-log@4038b6a4f74a:.spi.yml:1-4`, `containerization@3e7bc39e66b3:.spi.yml:1-5`.

Harness limitation (unresolved): on the `swift:6.3` image the DocC step failed on both the bad and the compliant twin (`error: The operation could not be completed. The file doesn't exist.`, also when running `docc convert` directly), so the 6.3 docs run is not a discriminating verification here; the 6.4 pair is. The shared workflow's default docs image is `swift:6.3-noble`, where it runs in upstream CI.

macOS docs job exists in the shared workflow but is off by default (`docs_check_macos_enabled: false`, 0.0.15): unverified: read only.

### 2.9 `swiftlang/github-workflows` 0.0.15: what it runs and what it hides

Tag `0.0.15` resolves to `9a10bfdc569159a3463f1273fbd7ed5f97fbe598` (`git ls-remote --tags`, 2026-10-10). Read files: `soundness.yml`, `swift_package_test.yml`, `pull_request.yml`, `README.md`, `check-docs.sh`, `check-swift-format.sh` at that tag.

`soundness.yml` jobs, all default on unless noted: API breakage (`swift:6.3-noble`), docs check, docs check macOS (off), unacceptable language, license headers, broken symlinks, format check (`swift:6.3-noble`), shell check (`ubuntu:noble`), YAML lint, Python lint. Its inputs expose `api_breakage_check_enabled`, `api_breakage_check_baseline`, `api_breakage_check_allowlist_path`, `docs_check_targets`, `docs_check_analyze`, `format_check_enabled`.

`check-swift-format.sh` runs `format --parallel --in-place` first, then `lint --strict --parallel`, then `git diff --exit-code '*.swift'`: a format check that rewrites files before linting; it honours `.swiftformatignore`.

Findings about the shared workflows that change how to adopt them:

1. **Swift 6.4 is not in the default Linux matrix.** `linux_swift_versions` default: `5.9, 5.10, 6.0, 6.1, 6.2, 6.3, nightly-main, nightly-6.4.x`; `windows_swift_versions` default has no 6.4 either (5.9, 6.0-6.3, nightlies; "5.10 omitted because the container image is broken"); `linux_os_versions` defaults to `jammy`; `enable_windows_checks` default true; macOS, Wasm, Android, static SDK, FreeBSD default off. The README still lists "5.9, 5.10, 6.0, 6.1, 6.2, nightly, and nightly-6.3" ([eco](../swift-topic-map/ecosystem-tooling.md) already flagged README drift). A package at tools 6.2 that calls the workflow with no inputs runs 5.9 and 5.10 legs that cannot build it and never builds with the current release.
2. **Release-only warnings flag is a trap with this workflow.** The build command is `${{ inputs.linux_build_command }} ${{ (contains(matrix.swift_version, 'nightly') && inputs.swift_nightly_flags) || inputs.swift_flags }}`. With `swift_flags: "-Xswiftc -warnings-as-errors"` and `swift_nightly_flags` left at its default `""`, the expression falls through to `swift_flags` for nightlies too (empty string is falsy; `a && b || c` yields `c`). Unverified: read only (no Actions runner here; the GitHub expression docs list `''` as falsy but do not state the operand-returning semantics). Consistent with this, every corpus caller that sets `swift_flags` also sets `swift_nightly_flags` (`swift-aws-lambda-runtime@8abd464310c7:.github/workflows/pull_request.yml:33-34`, `swift-async-algorithms` lines 18-19, `swift-service-lifecycle` lines 49-50). Safe pattern: set `swift_nightly_flags` to a non-empty value without the strict flag, e.g. `-Xswiftc -no-warnings-as-errors`.
3. **Scripts float.** Every job in `soundness.yml` that runs a script does `uses: actions/checkout@v7` with `repository: swiftlang/github-workflows` and `path: github-workflows` and no `ref:` (0 occurrences of `ref:` in the file); `swift_package_test.yml` uses `ref: main` for the amazonlinux2 cross-checkout (lines 466 and 550). Pinning the reusable workflow to `0.0.15` or its SHA fixes the YAML, not the check scripts; they come from the default branch at run time.
4. **Windows.** The default `windows_build_command` is `Invoke-Program swift test`; the description says PowerShell does not stop on a failing subcommand and "it is strongly encouraged to run all command using `Invoke-Program`" (a function at lines 921-935 that exits with the child's exit code). A gated Windows step is `Invoke-Program swift build -Xswiftc -warnings-as-errors`. Unverified: read only (no Windows run).
5. Action versions inside the workflows are tag-pinned (`actions/checkout@v7`), and `actions/checkout@v1` for amazonlinux2: the supply-chain pin is the caller's job.

### 2.10 CI matrix

Measured corpus shape ([gates](../swift-audit/exemplar-quality-gates.md) lines 68-69, 349-350): Linux CI 38/40, macOS 30, Windows 19, Wasm SDK 15, static Linux SDK 13, Android 11, nightly toolchains 22; no Android leg uses a 6.4 release toolchain. swift-log (a representative core library) runs Linux 6.2, 6.3, 6.4 (6.1 off) with the strict flag, nightly-next and nightly-main without it, and Windows 6.2-6.4 plus nightlies (`swift-log@4038b6a4f74a:.github/workflows/pull_request.yml:19-37`). swift-nio runs 6.1-6.4 strict, `nightly-main` non-strict, and Windows 6.3, 6.4 and nightlies (`swift-nio@e12881f2a691:.github/workflows/main.yml:15-27`).

Decision (minimum, by package kind):

| Leg | Library with external consumers | CLI / server / SDK-wrapper | Flag |
|---|---|---|---|
| Linux, tools-version floor release (e.g. 6.2) | required | required (use the one pinned in `.swift-version`) | `-Xswiftc -warnings-as-errors` |
| Linux, current release (6.4) | required | required | same |
| Linux, `nightly-main` (or the rolling `nightly-6.x.x`) | required, builds and tests | optional | none (nightlies exempt) |
| Windows, current release | only if the package claims Windows | same | same strict flag, each command wrapped in `Invoke-Program` |
| Static Linux SDK build (`--swift-sdk ...-musl`) | only if it ships static binaries | required for CLIs that ship static | same |
| Wasm / Android SDK build | only if claimed | only if claimed | same |
| macOS (`xcrun swift test` / Xcode) | required if it imports Apple frameworks or claims Apple platforms | same | unverified: read only |

The previous release between floor and current is optional when floor and current are adjacent; add it when floor and current are two or more releases apart (swift-log runs all three). Release-mode (`-c release`) build: optional leg; swift-nio ships 16 references to `release_builds.yml` ([gates](../swift-audit/exemplar-quality-gates.md) line 360).

### 2.11 Workflow and action pinning

Corpus (pins.py in [gates](../swift-audit/exemplar-quality-gates.md) line 69 and 367): 1,085 external action uses: 881 tag, 177 SHA, 27 branch; only 6/38 repos are at least 80% SHA-pinned; reusable workflows: 119 `@main`, 56 tag, 6 SHA. swift-nio pins its own actions by SHA (`swift-nio@e12881f2a691:.github/workflows/unit_tests.yml:193`: `actions/checkout@9c091bb2...  # v7.0.0`) yet is called `@main` by `swift-log` (`pull_request.yml:19`) and others; containerization pins by SHA with a version comment (`containerization@3e7bc39e66b3:.github/workflows/linux-build.yml:37`: `actions/checkout@8e8c483d...  # v6`). GitHub's guidance: a full-length SHA "is currently the only way to use an action as an immutable release", a tag "can be moved or deleted"; reusable workflows follow "the same principles" ([secure-use](https://docs.github.com/en/actions/reference/security/secure-use)).

Rule: every `uses:` (actions and reusable workflows) is `@<40 hex>` followed by `# <tag>`; `@main` and `@master` never. Tag-only is a reviewed exception (`swiftlang/github-workflows@0.0.15`). Because of section 2.9 item 3, SHA-pinning `soundness.yml` still leaves its scripts floating: for the gates that matter (format, docs, API breakage) call the commands inline, as swift-protobuf does (`build.yml:117-146`), and use the shared workflow only for the optional extras (license header, unacceptable language, symlinks, shell, YAML).

### 2.12 `--explicit-target-dependency-import-check` is not a gate

Exemplars pass `--explicit-target-dependency-import-check error` in 13 repos (swift-log, swift-nio, swift-crypto, swift-lifecycle, async-http-client ...). Fixture `i/`: target `App` imports `Leaf` through `Mid` without declaring it; twin `AppOk` declares it.

| Command | Result |
|---|---|
| `swift build --target App --explicit-target-dependency-import-check error` | 6.4 exit 0, silent (Swift Build) |
| `swift build --build-system native --target App ...` | 6.4 exit 0 (`--build-system native` is deprecated and warns) |
| full `swift build ... error`, and `... warn` | 6.4 and 6.3 exit 0 |

It did not go red on any engine or toolchain I ran. Known issue [#9620](https://github.com/swiftlang/swift-package-manager/issues/9620) ("SwiftBuild does not support the `--explicit-target-dependency-import-check` command line flag", open, updated 2026-01-20) covers Swift Build; my native-engine and 6.3 runs were also silent, so I record the check as unverified. Do not write a rule that depends on it; the declared-dependency check belongs to review (and to the packaging dive).

### 2.13 Where each gate lives

- Gate block (K-01): `swift-quality` index (SW-CORE), verbatim, with steps 4 and 5 marked "libraries only".
- Warnings policy, promoted groups, `@diagnose`, `StrictLanguageFeatures`, API breakage, DocC gate, matrix, pinning: `swift-package/gates.md` (SW-GATE). The `.spi.yml` glob already routes to `swift-package`, which is where the DocC gate's configuration is read.
- DocC content rules stay in `code-docs` / `docs-quality`; only the `generate-documentation --warnings-as-errors --analyze` command and the `.spi.yml` precondition are SW-GATE.
- Workflows are never globbed (map conflict 14); gates.md is reached by task.

## Normative guidance candidates

Each: rule, rationale, verification, and whether it was RUN against a planted violation. Fixture paths are under `/home/mherwig/.cache/research-lang/swift-tools/fixtures/warnings-and-ci/`. For grep checks the OUTPUT is the violation; empty output is a pass. The grep set is in `chk.sh` and was run on `v/<name>-bad` (red) and `v/<name>-good` (green).

**SW-GATE-01. The gate block is the five commands of section 2.6, in that order, and a change is not done until the applicable ones exit 0.**
Rationale: format is cheapest, build catches warnings before tests, API and docs checks only matter for libraries.
Verify: run the block from the package root; non-zero exit anywhere = fail. Planted: `j/ok` green; `j/badformat`, `j/warnsrc`, `j/warntest`, `j/failtest` red at steps 1, 2, 3, 3 (`gate-in.sh`). RUN: yes.

**SW-GATE-02. CI builds and tests with `-Xswiftc -warnings-as-errors` on every release-toolchain leg; nightly legs omit it; do not rely on the manifest form for CI.**
Rationale: the blanket flag also fails on ungrouped warnings and on groups an older toolchain lacks; nightlies add warnings you cannot yet fix.
Verify: `grep -rn -e 'swift build' -e 'swift test' --include='*.yml' .github/workflows | grep -v -e 'warnings-as-errors' -e 'treatAllWarnings'` (output = steps missing the flag; callers of a reusable workflow are checked by SW-GATE-16/G8 instead). RUN: yes, `v/wf-bad` prints `ci.yml:11` and `:12`, `v/wf-good` empty (G1). Build-level: `swift build -Xswiftc -warnings-as-errors` exit 1 on a package with any warning (`g`, `j/warnsrc`).

**SW-GATE-03. Never put warning flags in `unsafeFlags`.**
Rationale: at tools version 6.1 or older, `unsafeFlags` makes the package unusable as a remote dependency; `.treatAllWarnings` replaces it.
Verify: `grep -rn -F -e 'unsafeFlags' --include='Package*.swift' .` (any hit: check it is not a warning flag and that the tools version is 6.2+). RUN: yes, `v/unsafe-bad` hit, `v/unsafe-good` empty (G3); consumer build exit 1 with `k61/RootRemote`, exit 0 at tools 6.2 (`k/RootRemote`).

**SW-GATE-04. Use `.treatAllWarnings(as: .error)` in a manifest only with `// swift-tools-version:6.2` or newer and only when the toolchain is pinned (`.swift-version`) or the setting sits behind an environment switch; otherwise keep warnings-as-errors in CI.**
Rationale: it is local-only (remote consumers never see it) but fails the package's own build on a toolchain that adds a warning.
Verify: `swift build` on the manifest: a tools-6.1 manifest with the setting exits 1 (`was introduced in PackageDescription 6.2`); review for pinned toolchain or env switch (named reading heuristic: `grep -rn -F -e 'treatAllWarnings' --include='Package*.swift' .` then read the surrounding `if`). RUN: yes for the version gate (`l/t61`, exit 1 on 6.3 and 6.4) and for root-only effect (`a/RootManifest` exit 0 / `a/RootDirty` exit 1); the pinned-or-switched part is a reading heuristic.

**SW-GATE-05. Per-group flags (`-Werror <Group>`, `.treatWarning("<Group>", ...)`) name only groups that exist on the oldest toolchain leg, and any use of them is accompanied by `UnknownWarningGroup` promoted.**
Rationale: unknown groups are a warning (exit 0) so a typo or a 6.4-only group silently disables the promotion.
Verify: build on the oldest leg with the group list plus `-Xswiftc -Werror -Xswiftc UnknownWarningGroup` (exit non-zero names the bad group). RUN: yes, `g` typo: exit 0 without, exit 1 with; `NoUsage` unknown on 6.3.3 (`tc.sh 6.3 e/ok.swift -Werror NoUsage` prints the warning); manifest twin `h/typostrict` exit 1.

**SW-GATE-06. A manifest that calls `.enableUpcomingFeature` or `.enableExperimentalFeature` also sets `.treatWarning("StrictLanguageFeatures", as: .error)` (tools 6.2+), or CI passes `-Xswiftc -Werror -Xswiftc StrictLanguageFeatures`.**
Rationale: SwiftPM and the compiler ignore unrecognised feature names silently.
Verify: `grep -rl -e 'enableUpcomingFeature' --include='Package*.swift' . | xargs -r grep -L -e 'StrictLanguageFeatures'` (output = manifests that enable features but never promote the check). RUN: yes, `v/feat-bad` lists the file, `v/feat-good` empty (G6); build-level: typo + setting exit 1, correct name exit 0 (`e/typo-strict`, `e/ok-strict`, 6.3 and 6.4).

**SW-GATE-07. Libraries with public types promote `ExplicitSendable` (`-Xswiftc -Werror -Xswiftc ExplicitSendable` or `.treatWarning("ExplicitSendable", as: .error)`); applications and CLIs do not need it.**
Rationale: `-warnings-as-errors` leaves this opt-in group off, and an undeclared public type is a Sendable-API question for consumers.
Verify: `swiftc -typecheck -parse-as-library -Werror ExplicitSendable <file>` (exit 1 on a public type with no `Sendable`/`~Sendable` declaration). RUN: yes, `e/pub.swift` exit 1 (6.3 and 6.4), exit 0 without the flag.

**SW-GATE-08. Every `@diagnose` carries `reason: "..."` (a plain string literal), is placed on the smallest declaration, and uses `as: ignored` only for a documented unavoidable case; on a package that still builds with Swift 6.3 it is wrapped in `#if hasFeature(SourceWarningControl)`.**
Rationale: the compiler accepts it without a reason and says nothing; a bare suppression is indistinguishable from an agent silencing a gate.
Verify: `grep -rn -F -e '@diagnose(' --include='*.swift' . | grep -v -F -e 'reason:'` (output = unexplained uses; multi-line attributes are not caught, then read). RUN: yes, `v/diag-bad` prints the line, `v/diag-good` empty (G4); compiler side: no-reason file exit 0 silent, interpolated reason exit 1, 6.3 exit 1 `unknown attribute 'diagnose'`.

**SW-GATE-09. Do not treat a green warnings gate as proof about dependencies: remote (git/registry) dependency warnings are suppressed, local `path:` dependency warnings are not.**
Rationale: the same dependency code turns the flag red as a path dependency and green as a remote one.
Verify: `swift build -Xswiftc -warnings-as-errors` against both shapes; reading heuristic: `grep -rn -F -e '.package(path:' --include='Package*.swift' .` lists the dependencies whose warnings your gate owns. RUN: yes, `a/RootClean` exit 1 vs `a2/RootRemote` exit 0, on 6.3 and 6.4.

**SW-GATE-10. Libraries with a tagged public API run `swift package diagnose-api-breaking-changes "$BASELINE"` in CI with full history and tags fetched, and any `--breakage-allowlist-path` file change is a reviewed policy change.**
Rationale: it exits 1 on a removed public symbol; the allowlist makes it exit 0 for the same break.
Verify: run it; for CI presence `grep -rq -e 'diagnose-api-breaking-changes' -e 'api_breakage_check_enabled' --include='*.yml' .github/workflows || echo 'MISSING: API-breakage gate'`. RUN: yes, `c/breaking` exit 1, `c/additive` exit 0 (6.4 and 6.3), missing baseline exit 1, allowlist exit 0; grep G7 red on `v/wf-bad`, silent on `v/wf-good`.

**SW-GATE-11. The DocC gate is `swift package plugin generate-documentation --target "$DOCC_TARGET" --warnings-as-errors --analyze`, and it only counts when `.spi.yml` exists with a non-empty `documentation_targets`.**
Rationale: without `--warnings-as-errors` a broken link exits 0; the shared check exits 0 with no targets.
Verify: the command (exit 1 on an unresolved symbol link); and `test -f .spi.yml || echo 'MISSING: .spi.yml'` plus `grep -L -e 'documentation_targets: *\[[A-Za-z]' .spi.yml` (output = file lacks a target list). RUN: yes, `d/bad` exit 1, `d/good` exit 0 (6.4), `d/bad` without the flag exit 0; `check-docs.sh` on `d/nospi` exit 0 (vacuous); G5 red on `v/spi-bad`, silent on `v/spi-good`. 6.3 DocC runs failed on the twin too (harness limitation, section 2.8).

**SW-GATE-12. The format step lists files with `git ls-files -z -- '*.swift'` and uses `swift format lint --strict`; never pass a hand-typed directory.**
Rationale: without `--strict` findings exit 0; a nonexistent directory or file operand exits 0 silently.
Verify: `grep -rn -e 'swift format lint' -e 'swift-format lint' --include='*.yml' --include='Makefile' . | grep -v -e '--strict'` (output = lint calls without the flag). RUN: partly: exit codes run (non-strict 0, nonexistent path 0, `git ls-files` form 123 on `j/badformat` and 0 on `j/ok`, 6.3 and 6.4); the grep itself was not run against a planted workflow (reading heuristic).

**SW-GATE-13. Callers of `swiftlang/github-workflows` `swift_package_test.yml` pass `linux_swift_versions` explicitly (the 0.0.15 default omits 6.4 and includes 5.9/5.10), and any caller that sets `swift_flags` with a strict flag also sets `swift_nightly_flags` to a non-strict, non-empty value.**
Rationale: defaults skip the current release; an empty nightly flag falls back to `swift_flags` (unverified: read only).
Verify: `grep -rl -e 'swift_package_test.yml' --include='*.yml' .github/workflows | xargs -r grep -L -e 'linux_swift_versions'` and `grep -rl -e 'swift_flags:.*warnings-as-errors' --include='*.yml' .github/workflows | xargs -r grep -L -e 'swift_nightly_flags'`. RUN: yes, G10 and G8 red on `v/wf-bad`, silent on `v/wf-good`; the expression semantics behind G8 are read only.

**SW-GATE-14. Every `uses:` is pinned to a 40-hex SHA with a trailing version comment; no `@main` or `@master`.**
Rationale: tags move; 119/181 corpus reusable-workflow references float.
Verify: `grep -rn -e 'uses: ' --include='*.yml' .github/workflows | grep -v -e 'uses: \./' | grep -v -E -e '@[0-9a-f]{40}'` and `grep -rn -e 'uses: .*@main' -e 'uses: .*@master' --include='*.yml' .github/workflows`. RUN: yes, G2 prints 3 lines on `v/wf-bad`, empty on `v/wf-good`; G9 prints the `@main` line.

**SW-GATE-15. Do not rely on a SHA pin of `soundness.yml` to freeze its scripts; gates that decide merges (format, docs, API breakage) run as inline commands from the block, and the shared workflow is used for extras only.**
Rationale: the soundness jobs check out `swiftlang/github-workflows` with no `ref:`.
Verify: reading heuristic: `grep -rn -A3 -e 'repository: swiftlang/github-workflows' .github/workflows` and look for `ref:`. RUN: no (reading heuristic only; observed 0 `ref:` in the 0.0.15 file).

**SW-GATE-16. The minimum CI matrix is the table in section 2.10: floor + current release (strict flag), one nightly (no strict flag), plus one build leg per claimed platform; Windows commands go through `Invoke-Program`.**
Rationale: corpus practice (19/40 Windows, 13/40 static SDK) and the shared workflow's own documentation.
Verify: reading heuristic against the workflow's matrix inputs. RUN: no for matrix legs; Linux legs exercised locally on 6.3 and 6.4; Windows and macOS: unverified: read only.

**SW-GATE-17. `--explicit-target-dependency-import-check error` is not evidence of correct target dependencies; do not add it to claim a rule is enforced.**
Rationale: it did not fail on a planted undeclared import on 6.3 or 6.4 (Swift Build and native engine).
Verify: `swift build --explicit-target-dependency-import-check error` on `i/` (exit 0, not red). RUN: yes, and it stayed green: the verification is inadmissible for enforcement.

**SW-GATE-18. `--disable-automatic-resolution` goes on build/test steps only when `Package.resolved` is committed.**
Rationale: absent file is `error: a resolved file is required` (exit 1); libraries conventionally do not commit one.
Verify: `swift build --disable-automatic-resolution`. RUN: yes, `a2/RootRemote` without `Package.resolved` exit 1, after `swift package resolve` exit 0.

**SW-GATE-19. Warning-control spellings are exactly: `-Xswiftc -warnings-as-errors`, `-Xswiftc -Werror -Xswiftc <Group>`, `.treatAllWarnings(as:)`, `.treatWarning("<Group>", as:)`, `@diagnose(<Group>, as:, reason:)`; reject `-Werror=<Group>`, bare `-Werror`, `-Wall`, `-Wno-error`, `.treatAllWarningsAsErrors()`, `@warn`.**
Rationale: the Clang and pitch-era spellings are what models emit; most fail loudly, but `-Werror <Group>` as one `-Xswiftc` string also fails.
Verify: `grep -rn -e '-Werror=' -e 'treatAllWarningsAsErrors' -e '@warn(' -e 'Wno-error' --include='*.swift' --include='*.yml' --include='Makefile' .`. RUN: partly: each wrong spelling fails the compiler or manifest (exit 1, section 2.1); the grep was not planted-run (reading heuristic).

## Verification runs

All on `swift:6.4` (6.4.0) unless the row says 6.3 (6.3.3). `t.sh`, `tc.sh`, `pk.sh`, `fmt.sh` print `exit=`; outputs trimmed to the relevant diagnostic. `S` = `--scratch-path "$SWIFT_SCRATCH/warnings-and-ci/<slug>"`.

| # | Fixture / command | Violation (red) | Twin (green) | Key output line |
|---|---|---|---|---|
| R1 | `a/RootClean`: `swift build -Xswiftc -warnings-as-errors` (path dep with deprecation) | exit 1 (6.4, 6.3) | `a/RootManifest`: `swift build` exit 0; `a2/RootRemote` (git dep) same flag exit 0 (6.4, 6.3) | `a/Dep/Sources/Dep/Dep.swift:5:31: error: 'oldThing()' is deprecated: use newThing() [#DeprecatedDeclaration]` |
| R2 | `a/RootDirty`: `swift build` with root `.treatAllWarnings(as: .error)` and own deprecation | exit 1 (6.4, 6.3) | `a/RootManifest` exit 0 | `RootDirty/Sources/App/main.swift:2:19: error: 'oldLocal()' is deprecated` |
| R3 | `a/RootManifest`: `swift build -Xswiftc -warnings-as-errors` | exit 1 | `-Xswiftc -no-warnings-as-errors` exit 0 | flag order: SwiftPM appends `-Xswiftc` after manifest flags |
| R4 | `a3/StrictLib` as root | exit 1 | `a3/Consumer` (git dep) exit 0 | consumer never sees manifest `treatAllWarnings` |
| R5 | `g`: `swift build -Xswiftc -Werror -Xswiftc NoUsage` | exit 1 (3 errors) | `gclean` exit 0 | `error: result of call to 'result()' is unused [#NoUsage]` |
| R6 | `g`: `-Xswiftc -Werror -Xswiftc NoUsag` (typo) | exit 0 (should be red: silent pass) | with `-Xswiftc -Werror -Xswiftc UnknownWarningGroup` first: exit 1 | `warning: unknown warning group: 'NoUsag' [#UnknownWarningGroup]` then `error: unknown warning group: 'NoUsag'` |
| R7 | `g`: `swift build -Xswiftc -warnings-as-errors` | exit 1, 7 errors incl. ungrouped `forced cast of 'Int' to same type has no effect` | `-Xswiftc -Werror -Xswiftc NoUsage` leaves it a warning | group-only flag misses the ungrouped warning |
| R8 | `h/typo`, `h/typostrict`, `h/typostrict-wrongorder`, `h/grp`, `h/all-minus`, `h/minus-all` | `typo`: exit 0; `typostrict` and `wrongorder`: exit 1; `grp`: exit 1 (3 `NoUsage`) | `all-minus`: `deprecated` stays warning; `minus-all`: `deprecated` is error (last wins) | manifest order is flag order |
| R9 | `tc.sh 6.3 e/ok.swift -Werror <G>` for `NoUsage`, `VariableNeverMutated`, `NoUseUnstructuredThrowingTask`, `UntypedThrows` | exit 0 with `unknown warning group` | `DeprecatedDeclaration`, `ExplicitSendable`, `StrictLanguageFeatures`, `UnknownWarningGroup`: silent | group availability differs 6.3 vs 6.4 |
| R10 | `b/noreason.swift`, `b/reason.swift`, `b/none.swift` (`swiftc -typecheck`) | none/noreason: no `@diagnose` effect needed; `none.swift` warns | `noreason` and `reason` exit 0, no diagnostic | `reason:` optional |
| R11 | `b/interp.swift`, `b/nonliteral.swift`, `b/wrongkw.swift`, `b/typo.swift` | exit 1, 1, 1, 0 (typo: warning; with `-warnings-as-errors` exit 1) | | `error: 'diagnose' cannot be an interpolated string literal`; `error: expected string literal in 'diagnose' attribute` |
| R12 | `b/escalate.swift`, `b/relax.swift` (+ `-warnings-as-errors`) | escalate exit 1 (only caller errors); relax with flag exit 1 (only sibling errors) | | scope is the annotated declaration |
| R13 | `tc.sh 6.3 b/reason.swift` | exit 1 | `b/guard.swift` on 6.3 exit 0 (guarded) | `error: unknown attribute 'diagnose'` |
| R14 | `pk.sh c/breaking c-breaking diagnose-api-breaking-changes v1` | exit 1 (6.4, 6.3) | `c/additive` exit 0 (6.4, 6.3) | `API breakage: func Greeter.shout(_:) has been removed` / `No breaking changes detected in Lib` |
| R15 | `... v9`; `... v1 --breakage-allowlist-path ../allow.txt` | `v9`: exit 1 | allowlist: exit 0 (red hidden) | `fatal: Needed a single revision` |
| R16 | `pk.sh d/bad d-bad plugin generate-documentation --target Lib --warnings-as-errors --analyze` | exit 1 | `d/good` exit 0; `d/bad` without `--warnings-as-errors` exit 0 | `error: 'Missing' doesn't exist at '/Lib/Greeter'` |
| R17 | `cd-in.sh` = shared `check-docs.sh` (yq shim) on `d/nospi`, `d/bad`, `d/good` | `d/bad` exit 1 | `d/good` exit 0; `d/nospi` exit 0 although the link is broken (vacuous) | `** No '.spi.yml' found ... no documentation targets to check.` |
| R18 | `tc.sh e/ok.swift -enable-upcoming-feature ExistentalAny -Werror StrictLanguageFeatures` | exit 1 (6.4, 6.3) | correct spelling exit 0; typo without the group exit 0 (silent) | `'ExistentalAny' is not a recognized upcoming feature [#StrictLanguageFeatures::UnrecognizedStrictLanguageFeatures]` |
| R19 | `e/typo-strict` vs `e/ok-strict`, `e/typo-plain` (`swift build`) | typo-strict exit 1 (6.4, 6.3) | ok-strict exit 0; typo-plain exit 0 | same |
| R20 | `tc.sh e/pub.swift -parse-as-library -Werror ExplicitSendable` | exit 1 (6.4, 6.3) | no flag or `-warnings-as-errors`: exit 0 | `public struct 'Thing' does not specify whether it is 'Sendable' or not [#ExplicitSendable]` |
| R21 | `gate-in.sh` over `j/{ok,badformat,warnsrc,warntest,failtest}` | exits 1, 1, 1, 1 at steps 1, 2, 3, 3 | `ok` exit 0 | e.g. `step 2 exit=1`, `variable 'sum' was never mutated [#VariableNeverMutated]` |
| R22 | `fmt.sh j/badformat lint --strict --recursive --parallel Sources Tests Package.swift` | exit 1 (6.4, 6.3) | `j/ok` exit 0 | `[Indentation] indent by 2 spaces` |
| R23 | `fmt.sh j/badformat lint --recursive Sources` (no `--strict`) | exit 0 although findings printed | | `warning: [Indentation]` |
| R24 | `fmt.sh j/badformat lint --strict --recursive Source` / `fmt.sh j/ok lint --strict Nope.swift` | exit 0 silent (vacuous) | `git ls-files` form: `j/badformat` exit 123, `j/ok` exit 0 | wrong path is a pass |
| R25 | `k61/RootRemote`: `swift build` (dep manifest tools 6.1 with `unsafeFlags`) | exit 1 | `k61/RootPath` exit 0; `k/RootRemote` (dep at tools 6.2) exit 0 (6.4, 6.3) | `the target 'UnsafeDep' in product 'UnsafeDep' contains unsafe build flags` |
| R26 | `l/t61` (`.treatAllWarnings` in a 6.1 manifest), `l/hall` (`.treatAllWarningsAsErrors()`) | both exit 1 (6.3, 6.4) | | `'treatAllWarnings(as:_:)' was introduced in PackageDescription 6.2`; `type 'SwiftSetting' has no member 'treatAllWarningsAsErrors'` |
| R27 | `a2/RootRemote`: `swift build --disable-automatic-resolution` without `Package.resolved` | exit 1 | after `swift package resolve`, exit 0 | `a resolved file is required when automatic dependency resolution is disabled` |
| R28 | `chk.sh` G1-G10 on `v/*-bad` vs `v/*-good` | all 10 print the planted line(s) | all 10 empty | see section 2 and rules above |
| R29 | `i/`: `swift build --explicit-target-dependency-import-check error` (App with undeclared import) | **did not go red**: exit 0 on 6.4 (Swift Build and native) and 6.3 | `AppOk` exit 0 | no diagnostic at all; inadmissible as a gate |
| R30 | `pk.sh 6.3 d/bad ...` and `d/good ...` | exit 1 | exit 1 (**did not go green**) | `error: The operation could not be completed. The file doesn't exist.`; harness limitation, 6.3 DocC unverified |

R6 is reported as a verification that did NOT go red on its own: the unpromoted per-group typo exits 0, which is the finding. Exemplar measurement script `exm.sh` (read-only over the corpus) produced the counts in section 5.

## Exemplar evidence

All pins from `swift-audit/scratch/exemplar-shas.md`; measurements are mine (`exm.sh`, `grep -rl --exclude-dir=.git`), 2026-10-10.

| Rule | Satisfied by | Violated or contradicted by |
|---|---|---|
| SW-GATE-02 strict flag on release legs, nightlies exempt | `swift-log@4038b6a4f74a:.github/workflows/pull_request.yml:22-26` (6.2-6.4 strict; `nightly_next`/`nightly_main` lack `-Xswiftc -warnings-as-errors`, lines 25-26); `swift-nio@e12881f2a691:.github/workflows/main.yml:18-22` (and also strict on `nightly_next`, line 22); `containerization@3e7bc39e66b3:.github/workflows/linux-build.yml:51,60` | 23/40 repos have a `swift build`/`swift test` line in a workflow without the flag (many are non-gating legs); 12/40 gate on the flag ([gates](../swift-audit/exemplar-quality-gates.md) line 70) |
| SW-GATE-03 no warning `unsafeFlags` | most; `swift-aws-lambda-runtime@8abd464310c7:Package.swift:7` uses `.treatAllWarnings(as: .error)` instead | `unsafeFlags` in 15/40 manifests (`swift-package-manager` 29 hits, `tuist` 30, `sourcekit-lsp` 8, `swift-testing` 6, `JavaScriptKit` 6); a warning-promoting one: `async-http-client@017115279d09:Package.swift:26` (`unsafeFlags(["-Xfrontend","-require-explicit-sendable","-warnings-as-errors"])`, behind `strictConcurrencyDevelopment`, tools 6.x) and `swift-protobuf` `CompileTests/InternalImportsByDefault/Package.swift:33` |
| SW-GATE-04 manifest form | `swift-aws-lambda-runtime@8abd464310c7:Package.swift:7` (unconditional, tools 6.2) | contradicts the "behind a switch" hedge: unconditional in 1/40; `swift-testing@c7d68ca20cd7:Package.swift:436-441` applies `.treatWarning` only `if buildingForDevelopment` (`git?.currentTag == nil`, line 24) and documents that dependency packages see no warnings |
| SW-GATE-08 `@diagnose` with `reason:` | `swiftlang/swift-testing@c7d68ca20cd7:Sources/Testing/Events/Event.swift:547` and `swift-foundation@aadd9259be07:Sources/FoundationEssentials/Data/Data+Writing.swift:260` use `@diagnose(DeprecatedDeclaration, as: ignored)` | contradicts: 0 of 45 `@diagnose(` lines in `swift-crypto@1c80d3aff53f` carry `reason:` (e.g. `Sources/CryptoExtras/AES/CMAC.swift:17-19`, `@diagnose(ImplementationOnlyDeprecated, as: ignored) @_implementationOnly import CCryptoBoringSSL`); swift-syntax's 79 hits are doc comments/implementation of the feature. They guard with `#if hasFeature(SourceWarningControl)` (supports the guard rule) |
| SW-GATE-06 StrictLanguageFeatures | none | 0/40 mention `StrictLanguageFeatures` or `UnknownWarningGroup` (grep over all files); 20/40 manifests enable `MemberImportVisibility`, 15/40 `ExistentialAny` ([eco](../swift-topic-map/ecosystem-tooling.md) section 16) |
| SW-GATE-07 ExplicitSendable | `swift-log` (`-Xswiftc -require-explicit-sendable`, 4 workflow lines), `swift-service-lifecycle`, `swift-openapi-generator`, `swift-distributed-tracing`, `async-http-client`, `swift-testing` (`.treatWarning("ExplicitSendable", as: .warning)`, dev only) | most libraries (the spelling `-require-explicit-sendable` in 6/40 repos) |
| SW-GATE-10 API breakage | `swift-protobuf@6c84c3dedac0:.github/workflows/build.yml:121` (`swift package diagnose-api-breaking-changes origin/main`, `fetch-depth: 0` line 114); `hummingbird` (`api-breakage.yml:28`); `swiftly`; 12 `soundness` callers (default on) | `diagnose-api-breaking-changes` appears in only 5 repos' own files (swift-package-manager 2, swiftly 1, hummingbird 1, swift-protobuf 1 plus the shared workflow callers); off in argument-parser, collections, openapi, swift-build, embedded, foundation, SPM, syntax, testing, swiftly ([gates](../swift-audit/exemplar-quality-gates.md) line 362) |
| SW-GATE-11 DocC + `.spi.yml` | `swift-log@4038b6a4f74a:.spi.yml:1-4`, `containerization@3e7bc39e66b3:.spi.yml:1-5` (also pins `swift_version: '6.2'`) | `.spi.yml` absent while the soundness docs check is on: `swift-build@2187330e13e7` (no `.spi.yml`; check on at `pull_request.yml:120-124`, [gates](../swift-audit/exemplar-quality-gates.md) smell 2); 31/40 have `.spi.yml` |
| SW-GATE-12 format via `git ls-files` + `--strict` | `swift-protobuf@6c84c3dedac0:.github/workflows/build.yml:141-146`; shared `check-swift-format.sh` lines 34-38 | `containerization@3e7bc39e66b3:Makefile:504-505` uses a `find` list plus `--strict` (satisfies `--strict`, not the file-list guarantee) |
| SW-GATE-13 explicit `linux_swift_versions` | `swift-testing` sets `linux_swift_versions: '["nightly-main", "nightly-6.4.x"]'` style inputs (`pull_request.yml:38`, Android) | callers that use the family default (12 `swift_package_test.yml` callers per [gates](../swift-audit/exemplar-quality-gates.md) line 296) inherit 5.9/5.10 and no 6.4 |
| SW-GATE-14 SHA pins | `containerization@3e7bc39e66b3:.github/workflows/linux-build.yml:37` (SHA + `# v6`); `swift-nio@e12881f2a691:.github/workflows/unit_tests.yml:193` (SHA + `# v7.0.0`); also container, hummingbird, element-x-ios, SPM | 37/40 repos have at least one non-SHA `uses:`; 19/40 reference a reusable workflow `@main` (`swift-log` 19 lines, `swift-nio` 26, `swift-crypto` 12, `swift-distributed-tracing` 15) |
| SW-GATE-17 explicit-target-dependency-import-check | the 13 repos that pass it believe it enforces | measured silent (R29) |

## AI-agent angle

What an LLM characteristically gets wrong in this subarea, and the smallest mechanical check that catches it.

| Mistake | Why it compiles or passes | Mechanical check |
|---|---|---|
| Writes `.treatAllWarnings(as: .error)` into a `// swift-tools-version:5.9`/`6.0`/`6.1` manifest | models learned the 6.2 API without the version gate | `swift build`: manifest error `was introduced in PackageDescription 6.2` (R26, red) |
| Writes `unsafeFlags(["-warnings-as-errors"])` (the pre-6.2 idiom, still common in training data) | builds fine locally | grep G3; consumer build fails at tools <= 6.1 (R25) |
| Writes `-Xswiftc -Werror`, `-Werror=Group`, `-Wno-error`, `.treatAllWarningsAsErrors()`, `@warn(...)` | Clang/pitch-era spelling | compiler/manifest rejects loudly (R26, section 2.1); grep in SW-GATE-19 |
| Passes `-Xswiftc "-Werror DeprecatedDeclaration"` as one string | looks right | `error: unknown argument` (loud) |
| Types a group name from memory (`NoUsag`, `DeprecatedDeclarations`, `UnusedResult`) | unknown groups are warnings; exit 0 | promote `UnknownWarningGroup` (R6); `@diagnose` typo only warns (R11) |
| Uses a 6.4-only group (`NoUsage`, `NoUseUnstructuredThrowingTask`) in a repo whose CI also builds 6.3 | silently inactive on 6.3 | build the oldest leg with `UnknownWarningGroup` promoted (R9) |
| Adds `@diagnose(..., as: ignored)` (or `-Wwarning X`, or an allowlist line) to make a red gate green | gate goes green; no reason required | G4 grep; diff review of `--breakage-allowlist-path`; CORE weaken-check |
| Uses `@diagnose` on 6.3-compatible code without the `hasFeature` guard | works on the agent's 6.4 | build on the 6.3 leg: `error: unknown attribute 'diagnose'` (R13) |
| Reports "warnings-as-errors passes" after `swift build` on a package whose dependency is remote | remote dependency warnings are suppressed; also path-dep warnings only fail the blanket flag | SW-GATE-09 pair of builds (R1) |
| Enables `.enableUpcomingFeature("ExistentalAny")` with a typo | silent | G6 grep + `StrictLanguageFeatures` build (R18/R19) |
| Runs `swift format lint Sources` and calls it clean | non-strict exits 0; wrong directory exits 0 | use the block's `git ls-files ... --strict` form (R22-R24) |
| Documents with ``` ``Symbol`` ``` links to renamed or nonexistent symbols, or marks the DocC gate "done" with no `.spi.yml` | non-strict DocC exits 0; shared check exits 0 without targets | R16/R17; G5 |
| Calls `swiftlang/github-workflows/...swift_package_test.yml@0.0.15` with no inputs and assumes it tests 6.4 | default matrix omits 6.4 | G10 grep |
| Pins `actions/checkout@v4` (an old major from memory) or `@main` | tags resolve | G2/G9 |
| Copies `swift package diagnose-api-breaking-changes main` with a shallow clone | baseline unreachable in CI | `fetch-depth: 0` + tags; red on missing ref (R15) |
| Believes `--explicit-target-dependency-import-check error` enforces declared dependencies | copied from swift-log/nio workflows | R29 (stays green on a planted violation) |
| Windows leg written as a bare multi-line PowerShell script | PowerShell does not stop on a failing command | `Invoke-Program` per command (read only) |
| Suggests `--disable-automatic-resolution` for a library with no `Package.resolved` | works on the author's tree | R27 |

## Contested / evolving

- **Manifest warnings-as-errors versus CI flag** (as of 2026-10-10). Only `swift-aws-lambda-runtime` sets `.treatAllWarnings(as: .error)` unconditionally; `swift-testing` gates the group form behind a development condition and documents the dependency-suppression caveat; the CI-flag form dominates (12/40). Trend: SE-0480 manifest settings are new (6.2) and little adopted; the recommended default here remains the CI flag, with the manifest form for pinned-toolchain consumers. Open question for the owner is whether to relax to "manifest form allowed whenever the toolchain is pinned in `.swift-version` by `swiftly`" (SW-GATE-04 currently permits it).
- **Is `reason:` mandatory?** The language says optional (SE-0522 grammar); production code (swift-crypto, 45 uses) writes none; the map's "only with `reason:`" is stricter than both. SW-GATE-08 keeps it as a house rule because the check is a one-line grep. The review thread may add `-Wwarning`/`using @diagnose` file-scope forms later (SE-0522 "Future directions": `using @diagnose(...)`, local scope, closures), which would change the grep.
- **Group names are version-specific and the set is still growing.** SE-0443 says groups "can never become narrower" but new ones appear every release (6.4 added at least `NoUsage`, `VariableNeverMutated`, `NoUseUnstructuredThrowingTask` with group tags that did not exist on 6.3). Trend: prefer the blanket flag plus a small stable list (`DeprecatedDeclaration`, `ExplicitSendable`, `StrictLanguageFeatures`, `UnknownWarningGroup`).
- **Tag printing differs across toolchains.** 6.4 prints `StrictLanguageFeatures::UnrecognizedStrictLanguageFeatures`, 6.3 prints `UnrecognizedStrictLanguageFeatures`: a CI log grep keyed on the tag is toolchain-specific.
- **Reusable-workflow adoption versus inline commands.** 22/40 repos use `swiftlang/github-workflows`; its defaults drift from its README and from the current release, and its scripts are not pinned by its own tag. Trend: the family keeps adding inputs (macOS docs, cmake build, Android NDK defaults `r27d`, `r28c` versus the r30 LTS in [eco](../swift-topic-map/ecosystem-tooling.md) section 7); the inline-command stance is a judgment, not corpus consensus.
- **Nightly exemption.** swift-log and swift-nio differ: swift-log exempts both nightlies, swift-nio exempts only `nightly-main` and applies the flag to `nightly_next`. I recommend exempting nightlies; a middle position (strict on the next-release nightly, exempt on main) is defensible and used in the wild.
- **`--explicit-target-dependency-import-check`** is cargo-culted into CI by 13 repos; Swift Build handling is tracked open at #9620 (2026-01-20). If it is fixed, SW-GATE-17 should be re-run and may become a real gate.
- **swift-format versus the bundled toolchain.** Two corpus repos run nightly images to get swift-format fixes ([gates](../swift-audit/exemplar-quality-gates.md) smell 5); the soundness default format image is `swift:6.3-noble`, one release behind 6.4. The format-and-lint dive owns this.
- **Unverified on this host:** macOS, Windows, nightly toolchain legs, the GitHub expression fallthrough, real `yq` behaviour on an empty `documentation_targets`, and 6.3 DocC (R30).

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0443-warning-control-flags.md | SE-0443, `-Werror <group>` / `-Wwarning <group>`, last-wins, groups never narrow | Swift 6.1 | Defines the CLI layer and the evaluation order |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0480-swiftpm-warning-control.md | SE-0480, `.treatWarning` / `.treatAllWarnings`, remote-target stripping, `-Xswiftc` ordering | Swift 6.2 | The manifest layer and the dependency-suppression rule |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0522-source-warning-control.md | SE-0522, `@diagnose` grammar, scope, `reason:`, `-suppress-warnings` interaction | Swift 6.4 | Source layer; `reason:` is optional |
| https://raw.githubusercontent.com/swiftlang/swift/main/CHANGELOG.md | Compiler changelog, Swift 6.4 `@diagnose` entry (lines 79-88) | 2026-09 | Confirms release and syntax |
| https://raw.githubusercontent.com/swiftlang/swift/main/userdocs/diagnostics/diagnostic-groups.md | Index of diagnostic groups and the `-Werror` usage | 2026 main | Group names and usage examples |
| https://docs.swift.org/compiler/documentation/diagnostics/ | Rendered compiler diagnostics catalog (index fetched as `data/documentation/diagnostics.json`) | 2026 | The canonical group reference |
| https://raw.githubusercontent.com/swiftlang/swift/main/userdocs/diagnostics/strict-language-features.md | `StrictLanguageFeatures` | 2026 main | Why misspelt feature names are silent |
| https://raw.githubusercontent.com/swiftlang/swift/main/userdocs/diagnostics/unknown-warning-group.md | `UnknownWarningGroup` | 2026 main | Typo behaviour and how to make it fatal |
| https://raw.githubusercontent.com/swiftlang/github-workflows/0.0.15/.github/workflows/soundness.yml | Shared soundness workflow at tag 0.0.15 (SHA 9a10bfdc...) | 2026-08-24 | What is checked, defaults, floating script checkout |
| https://raw.githubusercontent.com/swiftlang/github-workflows/0.0.15/.github/workflows/swift_package_test.yml | Shared test-matrix workflow at 0.0.15 | 2026-08-24 | Default version lists, flag expression, `Invoke-Program` |
| https://raw.githubusercontent.com/swiftlang/github-workflows/0.0.15/.github/workflows/scripts/check-docs.sh | Docs check script | 2026-08-24 | The `.spi.yml` vacuity, plugin injection |
| https://raw.githubusercontent.com/swiftlang/github-workflows/0.0.15/.github/workflows/scripts/check-swift-format.sh | Format check script | 2026-08-24 | `format --in-place` then `lint --strict` then `git diff` |
| https://raw.githubusercontent.com/swiftlang/github-workflows/0.0.15/README.md | Repository README at 0.0.15 | 2026 | Shows README drift (lists 5.9-6.2) |
| https://raw.githubusercontent.com/swiftlang/swift-docc-plugin/main/README.md | swift-docc-plugin README (tag 1.5.0 current) | 2026-04 | Plugin invocation; flags verified from its `--help` |
| https://swiftpackageindex.com/SwiftPackageIndex/SPIManifest/1.13.1/documentation/spimanifest/commonusecases | SPIManifest `.spi.yml` common use cases | 1.13.1 | `documentation_targets` shape and plugin injection |
| https://github.com/swiftlang/swift-package-manager/issues/9620 | SwiftPM issue: Swift Build and `--explicit-target-dependency-import-check` | open, 2026-01 | Why the check is not trustworthy |
| https://docs.github.com/en/actions/reference/security/secure-use | GitHub Actions secure-use guide | 2026 | SHA pin as the only immutable reference |
| https://docs.github.com/en/actions/reference/workflows-and-actions/expressions | GitHub Actions expression syntax | 2026 | Falsy values (basis of the nightly-flag fallthrough) |
| /home/mherwig/dev/grimoire-lore/.agents/worktrees/swift/.agents/research/swift-audit/exemplar-quality-gates.md | Wave-1 audit of CI, gates and warnings in 40 exemplars | 2026-10-10 | Corpus counts for CI legs, pins, API and docs gates |
| /home/mherwig/dev/grimoire-lore/.agents/worktrees/swift/.agents/research/swift-topic-map/ecosystem-tooling.md | Wave-1 ecosystem scout (SwiftPM, workflows, fixtures P1-P5) | 2026-10-10 | Earlier measurements this work re-ran |
| /home/mherwig/dev/grimoire-lore/.agents/worktrees/swift/.agents/research/swift-topic-map/shifts.md | Wave-1 recent-shifts scout (the `@warn` / `@diagnose` rename) | 2026-10-10 | Pitch-era naming that models still emit |
| `swift package diagnose-api-breaking-changes --help`, `swift package plugin generate-documentation --help` (Swift 6.4, swift-docc-plugin 1.5.0) | The tools' own usage text | 2026-10-10 | Authoritative flag list (`--analyze`, `--warnings-as-errors`, `--breakage-allowlist-path`) |
