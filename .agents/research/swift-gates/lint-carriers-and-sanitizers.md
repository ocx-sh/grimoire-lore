---
title: "Lint carriers and sanitizers (SW-GATE revision): ExplicitSendable through SwiftPM, the SwiftLint image as carrier, TSan and Mutex, Never* on changed files, the amended gate block"
topic: "Gates and CI (SW-GATE) -> revision of swift-gates.md; SW-GATE-01..25 keep their numbers, new rules SW-GATE-26..29; settles map contradictions 1, 3, 7, 8, 11, 15 and 18"
agent: gates/lint-carriers-and-sanitizers
model: sonnet
date_researched: 2026-10-10
sources_count: 24
fixtures: /home/mherwig/.cache/research-lang/swift-tools/fixtures/lint-carriers-and-sanitizers/
scope: |
  Covered: which SwiftPM and compiler form of ExplicitSendable exits non-zero and why four earlier measurements saw exit 0; root-only manifest warning control for git, path and local consumers; the K-07 tells ported to SwiftLint custom_rules (parity, false positives on three exemplars, the static-binary trap and its failing check); TSan with Mutex on Swift 6.4 and 6.3 and every suppression route; Never* on changed files; the amended SW-GATE-01 block run end to end.
  Not covered: macOS, Xcode, Windows and Android (unverified: read only, owner Q7); DocC on 6.3 (the harness fails twin and violation alike, SW-GATE-21); SwiftLint rules other than custom_rules; ASan; the testing-side coverage and isolation work (testing/isolation-and-seams).
---

# Lint carriers and sanitizers: the SW-GATE revision

All runs 2026-10-10, Linux x86_64, Docker `swift:6.4` (6.4.0) and `SWIFT_VERSION=6.3` (6.3.3) through `~/.cache/research-lang/swift-tools/run.sh`, SwiftLint 0.65.1 (static binary on that PATH, SourceKit image `ghcr.io/realm/swiftlint:0.65.1`), bundled `swift format`. Fixture root `FX=/home/mherwig/.cache/research-lang/swift-tools/fixtures/lint-carriers-and-sanitizers`. Every build, test and run used `--scratch-path "$SWIFT_SCRATCH/lint-carriers-and-sanitizers/<slug>"`; nothing was built inside an exemplar, and the exemplars were only linted or grepped (read-only). The host was shared with other agents (load average 20 to 36), so wall-clock figures are not benchmarks.

Source keys: **[gates]** `swift-gates.md`; **[conc]** `swift-concurrency.md`; **[testing]** `swift-testing.md`; **[cli]** `swift-cli.md`; **[map]** `swift-topic-map.md` (Wave 2 landed); **[FX]** the fixture root above. Exemplar cites are `repo@sha12:path:line`.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [ExplicitSendable through SwiftPM: the form that exits non-zero](#f1)
   2. [Manifest warning control: root-only for remote consumers, not for path consumers](#f2)
   3. [SwiftLint as carrier of the K-07 tells](#f3)
   4. [The static-binary trap and the check that fails on it](#f4)
   5. [TSan, Mutex and every suppression route](#f5)
   6. [Never* on changed files](#f6)
   7. [The amended gate block, end to end](#f7)
   8. [Decisions and hand-offs to the other consolidations](#f8)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- **ExplicitSendable gates.** `swift build -Xswiftc -Werror -Xswiftc ExplicitSendable` and the manifest setting `.treatWarning("ExplicitSendable", as: .error)` (tools 6.2) both exit 1 on a public type with no Sendable statement and 0 on the annotated twin, on Swift 6.4.0 and 6.3.3. [conc] SW-CONC-04's "never a gate" is wrong and SW-GATE-17's `.treatWarning` form is verified.
- **Why four measurements saw exit 0.** They all had `-Xfrontend -require-explicit-sendable` in play (`unsafeFlags` or `-Xfrontend`). That frontend flag emits the diagnostic as a plain warning that neither `-Werror ExplicitSendable`, `.treatWarning` nor `-warnings-as-errors` can promote (exit 0, 10 warning lines). Never add it.
- **`-Xswiftc -require-explicit-sendable` is a silent no-op** (driver flag: exit 0, zero diagnostics, 6.4 and 6.3). Four corpus repositories pass it in CI believing it checks anything (swift-log, swift-distributed-tracing, swift-openapi-generator, swift-service-lifecycle).
- **Flag order matters.** `-Wwarning ExplicitSendable -warnings-as-errors` exits 1; the reverse order exits 0 (SE-0443 "last one wins"). Prefer the order-free forms above.
- **Manifest warning control is root-only for remote dependencies only.** A git-URL consumer of a library whose manifest carries `.treatWarning("StrictLanguageFeatures", as: .error)` with a typo'd feature builds green (exit 0); a `path:` consumer fails (exit 1). The brief's "path exit 0" is false; contradiction 15 stands with this refinement.
- **K-07 ports to SwiftLint exactly.** 15 custom_rules (E01-E07, E08 as SW-TEST-03, E09, E11-E16 with E16 as SW-CLI-03, plus E15) matched the amended grep set line for line on the plant (47 of 47) and flagged nothing on the twin; on swift-nio, containerization and swiftly SwiftLint produced 0 hits the grep lacks and dropped 44 grep-only hits (comments, doc comments, strings, two generated files).
- **SW-GATE-11 stays advisory.** One line `// swiftlint:disable:this e01_unchecked_sendable e15_lint_suppression` silences both the rule and its own suppression rule (rc 0); only the E15 grep sees it. The grep set remains the gate; the SourceKit image is the second reader.
- **Static-binary trap.** The static `swiftlint` on `run.sh`'s PATH exits 0 and prints `Skipping enabled rule 'custom_rules'` (default mode, even under `--quiet`) or aborts 134 (`default_execution_mode: swiftsyntax`). A 6-line wrapper that exits 70 on that line was red on both static rows and green on the image (new SW-GATE-26).
- **SwiftLint's custom-rule default is SourceKit** (`defaultExecutionMode ?? .sourcekit`, `CustomRules.swift:84`) although the rule description says SwiftSyntax; set `default_execution_mode: swiftsyntax` explicitly. Nested `.swiftlint.yml` files are ignored under `--config`.
- **The wrapper `swiftlint-sk.sh` passes a stray `swiftlint` token** to an image whose entrypoint is already `swiftlint`; `lint` survives (default subcommand, the tokens become ignored paths), `version` does not. Adopters use `docker run ... ghcr.io/realm/swiftlint:0.65.1 lint ...` directly.
- **TSan on Mutex: the false positive has a signature.** Correct `Mutex` classes produced only `ThreadSanitizer: Swift access race` reports (10 of 10 runs on 6.4, 0 `data race`); the three planted races (unguarded counter, wrong-lock, guarded counter plus an unguarded field) produced `ThreadSanitizer: data race` in 10 of 10 runs. A 10-line check that counts only `data race` reports was green on every twin and red on every plant (new SW-GATE-27).
- **No suppression is scoped to Mutex.** `race:Synchronization`, `race:withLock`, `called_from_lib:` and `ignore_noninstrumented_modules=1` all left the false positive in place (inlined `withLock` leaves no Synchronization frame); name-based suppressions work but also hide real races in the named type or file (`race:MixedGuard` turned a red plant green). Do not use suppressions.
- **TSan becomes a gating CI job on the `data race` filter**, still outside the local done-gate block (seccomp, minutes per run, only races the tests exercise). SW-CONC-27 and SW-TEST-17 lose "advisory only"; Q-T2 is answered.
- **Never\* on changed files is a 6-line recipe**: sed the repository's own `.swift-format` into a throwaway overlay with the three rules on, then `git diff --name-only -z --diff-filter=ACMR --merge-base "$BASE" -- '*.swift' | xargs -r -0 swift format lint --strict --configuration "$overlay"`. Red on a `!` in a changed, committed, uncommitted or untracked file; green with a legacy `!` file untouched (new SW-GATE-28). File granularity costs: 131 of 309 swift-nio source files carry a Never* finding.
- **The amended gate block** (format triple, Never* on changed files, K-07 tells, build, test with the SW-TEST-10 prefix, API breakage, DocC) ran on one fixture package: the compliant branch exited 0 at every step and each of seven planted branches failed at its own step (fmt 1, never 1b, tell 1c, warn 2, interop 3, api 4, docc 5).
- **SW-GATE-10's final grep set** is the old set with E08 replaced by the SW-TEST-03 grep (now also excluding `func usleep(` and `func nanosleep(` declarations: 58 to 52 hits on swift-nio) and E16 by the SW-CLI-03 grep (one `-e` per alternative), plus a canary that fails closed.

## Findings

<a id="f1"></a>
### 1. ExplicitSendable through SwiftPM: the form that exits non-zero

The group is documented as opt-in: the compiler "will emit a warning if a public type has none of" a `Sendable` conformance, an unavailable conformance, or `~Sendable` ([explicit-sendable-annotations.md](https://raw.githubusercontent.com/swiftlang/swift/main/userdocs/diagnostics/explicit-sendable-annotations.md)). Two earlier measurements disagreed: [conc] SW-CONC-04 (I-V18) saw exit 0 four times and called it "never a gate"; [gates] SW-GATE-17 (WC R20) saw `swiftc -typecheck -Werror ExplicitSendable` exit 1 and wrote it as a gate for the CLI and manifest forms.

Plant and twin ([FX]`/es/plant`, `/es/twin`, tools 6.2, product `Lib`):

```swift
// plant: red
public struct Config { public var name: String; public init(name: String) { self.name = name } }
public final class Cache { public var hits = 0; public init() {} }

// twin: green (Sendable, or an unavailable conformance as the userdoc allows)
public struct Config: Sendable { public var name: String; public init(name: String) { self.name = name } }
@available(*, unavailable) extension Cache: Sendable {}
public final class Cache { public var hits = 0; public init() {} }
```

`swift build --scratch-path "$SWIFT_SCRATCH/lint-carriers-and-sanitizers/es/<n>"` per row, exit codes identical on 6.4.0 and 6.3.3 (`es.sh`, `es2.sh`, `es3.sh`):

| # | Form | Plant | Twin |
|---|---|---|---|
| A | `-Xswiftc -Werror -Xswiftc ExplicitSendable` | **1** | 0 |
| B | `-Xswiftc -warnings-as-errors` | 0 (no diagnostic) | 0 |
| C | `-Xswiftc -require-explicit-sendable` | 0 (no diagnostic) | 0 |
| D | C plus A | **1** | 0 |
| E | C plus B | 0 | 0 |
| F | `-Xswiftc -Xfrontend -Xswiftc -require-explicit-sendable -Xswiftc -Werror -Xswiftc ExplicitSendable` | 0 (10 warning lines) | 0 |
| G | manifest `.treatWarning("ExplicitSendable", as: .error)` | **1** | 0 |
| H | G plus C | **1** | 0 |
| I | G plus `-Xswiftc -Xfrontend -Xswiftc -require-explicit-sendable` | 0 (10 warning lines) | 0 |
| J | G plus `.unsafeFlags(["-Xfrontend","-require-explicit-sendable"])` | 0 (10 warning lines) | 0 |
| K | `.unsafeFlags(["-Xfrontend","-require-explicit-sendable","-warnings-as-errors"])` (async-http-client form) | 0 | 0 |
| L | K plus CLI `-Xswiftc -warnings-as-errors` (swift-log form) | 0 | 0 |
| M | `-Xswiftc -Wwarning -Xswiftc ExplicitSendable -Xswiftc -warnings-as-errors` | **1** | 0 |
| N | `-Xswiftc -warnings-as-errors -Xswiftc -Wwarning -Xswiftc ExplicitSendable` | 0 | 0 |
| O | `-Xswiftc -Wwarning -Xswiftc ExplicitSendable` (audit) | 0 (10 warning lines) | 0 |

Direct `swiftc -typecheck -parse-as-library` rows (`sc.sh`, `sc2.sh`, 6.4 and 6.3 identical): `-Werror ExplicitSendable` rc 1 (4 errors); `-require-explicit-sendable` rc 0 and silent; `-Xfrontend -require-explicit-sendable` rc 0 (4 warnings); `-Xfrontend -require-explicit-sendable -Werror ExplicitSendable` rc 0 (4 warnings, either order); `-warnings-as-errors -Xfrontend -require-explicit-sendable` rc 0; `-Xfrontend -Werror -Xfrontend ExplicitSendable` rc 1.

What this shows, in order of certainty:

1. **Naming the group in `-Werror` (or `.treatWarning(..., as: .error)`) both enables the opt-in diagnostics and promotes them.** No other flag is needed (rows A, G). The error text is `error: public struct 'Config' does not specify whether it is 'Sendable' or not [#ExplicitSendable]`.
2. **`-Xfrontend -require-explicit-sendable` demotes the group to a plain warning that wins over every promotion** (F, I, J, K, L; also `-warnings-as-errors`). I-V18's four exit-0 results all ran with that flag, which swift-log ships as `.unsafeFlags(["-Xfrontend", "-require-explicit-sendable"])` (swift-log@4038b6a4f74a:Package.swift:71) and async-http-client as `.unsafeFlags(["-Xfrontend", "-require-explicit-sendable", "-warnings-as-errors"])` (swift-async-http-client: swift-server__async-http-client@017115279d09:Package.swift:26). The mechanism (the frontend flag sets an explicit warning level, and SE-0443 specifies "the last one wins") is inferred from the rows, not read in the compiler source.
3. **`-Xswiftc -require-explicit-sendable` does nothing** (C, E): the driver accepts it and the frontend never receives it. This is the flag in four corpus CI files (see Exemplar evidence).
4. **Order matters when the blanket flag is involved** (M versus N): `-warnings-as-errors` promotes everything enabled before it and nothing enabled after it, per [SE-0443](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0443-warning-control-flags.md) ("the last one wins", including the legacy flags).
5. **Coverage of the diagnostic** (`es/kinds.swift`, `kinds.sh`, `-swift-version 6 -Werror ExplicitSendable`): flagged are `public struct`, `public` generic struct, `public final class`, `open class`, `public enum` (with and without payload) and a public struct nested in a public struct; not flagged are `public actor`, `public protocol`, a `public typealias`, an `internal` type, a function, and a type annotated by `Sendable`, `@unchecked Sendable`, an unavailable `Sendable` extension or a conditional conformance. `~Sendable` is accepted on 6.4 and is `error: '~Sendable' requires -enable-experimental-feature TildeSendable` on 6.3.

Consequence for the rules: SW-GATE-17 is verified in two forms (CLI group flag and manifest `.treatWarning`), the manifest form is preferred because it travels with the checkout and needs no CI edit, and `-require-explicit-sendable` is forbidden in any spelling (a grep with a red/green pair, SW-GATE-17 clause 3).

<a id="f2"></a>
### 2. Manifest warning control: root-only for remote consumers, not for path consumers

Question (contradiction 15): does `.treatWarning("StrictLanguageFeatures", as: .error)` in a library manifest reach a consumer? SE-0480 says warning control settings "do not apply" to remote targets and SwiftPM substitutes `-suppress-warnings` ([SE-0480](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0480-swiftpm-warning-control.md), "Remote targets behavior"; Implemented in Swift 6.2). The brief predicted exit 0 for a path consumer as well. Measured ([FX]`/dep`, tools 6.2; `libs/<name>` are the libraries, `app-path-<name>` depends on `.package(path: "../libs/<name>")`, `app-git-<name>` on a `file://` git repo tagged 1.0.0 with `from: "1.0.0"`; `dep.sh`):

| Library manifest | Root build of the library | Consumer by git URL | Consumer by `path:` |
|---|---|---|---|
| `slf-typo`: `.enableUpcomingFeature("ExistentalAny")` plus `.treatWarning("StrictLanguageFeatures", as: .error)` | **1** (`'ExistentalAny' is not a recognized upcoming feature [#StrictLanguageFeatures::UnrecognizedStrictLanguageFeatures]`) | **0** | **1** (same diagnostic) |
| `slf-ok`: correct `ExistentialAny` plus the same setting | 0 | 0 | 0 |
| `slf-noguard`: typo, no `.treatWarning` | 0 (typo silently ignored) | 0 | 0 |
| `es-plant`: `.treatWarning("ExplicitSendable", as: .error)`, unannotated public type | **1** | **0** | **1** |

Identical on 6.4.0 and 6.3.3 (the error line is `emit-module command failed` on 6.3). So: **git and registry consumers never see a library's manifest warning control; `path:` consumers (a monorepo, an `ocx-sdk`-style sibling checkout) do.** That is the right behaviour for both settings: the group fires only on the library's own mistakes (a typo'd feature name, a public type without a statement), so a path consumer failing is the repair prompt, and no published consumer is ever blocked. This closes the argument behind [gates] SW-GATE-14's "environment switch for libraries": the switch protects against warning groups that grow with the toolchain (`-warnings-as-errors`, `NoUsage`), not against these two groups, whose firing set does not change with a compiler upgrade.

<a id="f3"></a>
### 3. SwiftLint as carrier of the K-07 tells

**Port.** [FX]`/sl/.swiftlint.yml` (anchored form quoted in full; 47 of 47 plant hits and 82 of 82 containerization hits identical to the unanchored file `/sl/.swiftlint-anchored.yml` derives from). `only_rules: [custom_rules]` is required in that list literally ([README 0.65.1, Custom Rules](https://raw.githubusercontent.com/realm/SwiftLint/0.65.1/README.md)); `excluded_match_kinds` exists since 0.40.2 ([CHANGELOG](https://raw.githubusercontent.com/realm/SwiftLint/0.65.1/CHANGELOG.md)) and is not in the README.

```yaml
only_rules:
  - custom_rules

# Carrier of the K-07 tells. Image: ghcr.io/realm/swiftlint:0.65.1 (entrypoint swiftlint). Run: swiftlint lint --config .swiftlint.yml --no-cache --quiet
custom_rules:
  default_execution_mode: swiftsyntax
  e01_unchecked_sendable:
    regex: '@unchecked\s+Sendable'
    excluded_match_kinds: &code_only [comment, comment.mark, comment.url, doccomment, doccomment.field, string]
    excluded: &prod_paths ['/Tests/', '/\.build/']
    message: "@unchecked Sendable (K-07 E01, SW-CONC)"
    severity: error
  e02_nonisolated_unsafe:
    regex: 'nonisolated\(unsafe\)'
    excluded_match_kinds: *code_only
    excluded: *prod_paths
    message: "nonisolated(unsafe) (K-07 E02, SW-CONC)"
    severity: error
  e03_task_detached:
    regex: 'Task\.detached'
    excluded_match_kinds: *code_only
    excluded: *prod_paths
    message: "Task.detached (K-07 E03, SW-CONC)"
    severity: error
  e04_gcd:
    regex: 'DispatchQueue\.|DispatchQueue\(|DispatchSemaphore|DispatchGroup'
    excluded_match_kinds: *code_only
    excluded: *prod_paths
    message: "GCD in new code (K-07 E04, SW-CONC-21)"
    severity: error
  e05_mainactor_run:
    regex: 'MainActor\.run'
    excluded_match_kinds: *code_only
    excluded: *prod_paths
    message: "MainActor.run hop (K-07 E05)"
    severity: error
  e06_isolation_hatch:
    regex: '@preconcurrency|MainActor\.assumeIsolated'
    excluded_match_kinds: *code_only
    excluded: *prod_paths
    message: "isolation hatch needs a reason (K-07 E06)"
    severity: error
  e07_blocking_sleep:
    regex: 'Thread\.sleep|(?<![.A-Za-z_])usleep\(|Task\.sleep\(nanoseconds'
    excluded_match_kinds: *code_only
    excluded: *prod_paths
    message: "blocking or legacy sleep (K-07 E07, SW-IO-16)"
    severity: error
  e08_test_sleep:
    regex: '(?<!func\s{1,4})(?<![A-Za-z0-9_])(usleep|nanosleep|sleep)\('
    excluded_match_kinds: *code_only
    included: ['/Tests/']
    excluded: ['/\.build/']
    message: "sleep in a test (SW-TEST-03 replaces K-07 E08)"
    severity: error
  e09_force_try_cast:
    regex: '\btry!|\bas!'
    excluded_match_kinds: *code_only
    excluded: *prod_paths
    message: "try! or as! (K-07 E09, SW-ERR-05)"
    severity: error
  e11_process:
    regex: '(?<![A-Za-z_])Process\(\)|NSTask|\.launchPath'
    excluded_match_kinds: *code_only
    excluded: *prod_paths
    message: "Foundation.Process (K-07 E11, SW-IO-05)"
    severity: error
  e12_pre_observation:
    regex: 'ObservableObject|@Published|@StateObject|@ObservedObject|@EnvironmentObject'
    excluded_match_kinds: *code_only
    excluded: *prod_paths
    message: "pre-Observation state (K-07 E12)"
    severity: error
  e13_completion_handler:
    regex: 'completion[A-Za-z]*: *@escaping|@escaping *\(Result<'
    excluded_match_kinds: *code_only
    excluded: *prod_paths
    message: "completion-handler API (K-07 E13)"
    severity: error
  e14_legacy_lock:
    regex: 'NSLock|NSRecursiveLock|os_unfair_lock|pthread_mutex'
    excluded_match_kinds: *code_only
    excluded: *prod_paths
    message: "pre-Mutex lock (K-07 E14)"
    severity: error
  e16_exit_call:
    regex: '(?<![.A-Za-z0-9_])exit\(|\b(Glibc|Darwin|Musl|Foundation|ucrt)\.exit\(|\b_exit\('
    excluded_match_kinds: *code_only
    excluded: *prod_paths
    message: "exit outside the entry point (SW-CLI-03 replaces K-07 E16)"
    severity: error
  e15_lint_suppression:
    regex: 'swift-format-ignore|swiftlint:disable|swiftformat:disable'
    match_kinds: [comment, doccomment]
    excluded: ['/\.build/']
    message: "linter suppression needs a written justification (K-07 E15, SW-GATE-12)"
    severity: error
```

The amended grep set it is measured against (verbatim `[FX]/sl/k07-amended.sh`; E08 is the SW-TEST-03 grep with its declaration exclusion widened, E16 is the SW-CLI-03 first grep with one `-e` per alternative, every other line is [gates] SW-GATE-10 unchanged; E10 stays absent):

```sh
P=(--include='*.swift' --exclude-dir='.build' --exclude-dir='Tests')
e01() { grep -rn "${P[@]}" -F -e '@unchecked Sendable' .; }
e02() { grep -rn "${P[@]}" -F -e 'nonisolated(unsafe)' .; }
e03() { grep -rn "${P[@]}" -F -e 'Task.detached' .; }
e04() { grep -rn "${P[@]}" -F -e 'DispatchQueue.' -e 'DispatchQueue(' -e 'DispatchSemaphore' -e 'DispatchGroup' .; }
e05() { grep -rn "${P[@]}" -F -e 'MainActor.run' .; }
e06() { grep -rn "${P[@]}" -F -e '@preconcurrency' -e 'MainActor.assumeIsolated' .; }
e07() { grep -rn "${P[@]}" -e 'Thread\.sleep' -e '[^.A-Za-z_]usleep(' -e 'Task\.sleep(nanoseconds' .; }
e08() { grep -rn --include='*.swift' -e '^usleep(' -e '^nanosleep(' -e '^sleep(' -e '[^[:alnum:]_]usleep(' -e '[^[:alnum:]_]nanosleep(' -e '[^[:alnum:]_]sleep(' Tests | grep -v -E -e 'func +sleep\(' -e 'func +usleep\(' -e 'func +nanosleep\('; }
e09() { grep -rn "${P[@]}" -F -e 'try!' -e ' as! ' .; }
e11() { grep -rn "${P[@]}" -e '[^A-Za-z_]Process()' -e NSTask -e '\.launchPath' .; }
e12() { grep -rn "${P[@]}" -F -e 'ObservableObject' -e '@Published' -e '@StateObject' -e '@ObservedObject' -e '@EnvironmentObject' .; }
e13() { grep -rn "${P[@]}" -e 'completion[A-Za-z]*: *@escaping' -e '@escaping *(Result<' .; }
e14() { grep -rn "${P[@]}" -F -e 'NSLock' -e 'NSRecursiveLock' -e 'os_unfair_lock' -e 'pthread_mutex' .; }
e15() { grep -rn --include='*.swift' --exclude-dir='.build' -F -e 'swift-format-ignore' -e 'swiftlint:disable' -e 'swiftformat:disable' .; }
e16() { grep -rn "${P[@]}" -e '^exit(' -e '[^.[:alnum:]_]exit(' -e '\bGlibc\.exit(' -e '\bDarwin\.exit(' -e '\bMusl\.exit(' -e '\bFoundation\.exit(' -e '\bucrt\.exit(' -e '\b_exit(' .; }
```

**Parity** (`parity.sh`, per entry, set of `file:line`; plant `/sl/plant` has one construct per entry plus Tests content, twin `/sl/twin` is compliant, decoy `/sl/decoy` has every tell only inside comments, doc comments and strings):

| Entry | Plant grep / SwiftLint | Twin grep / SwiftLint | Decoy grep / SwiftLint |
|---|---|---|---|
| E01 | 1 / 1 | 0 / 0 | 1 / 0 |
| E02 | 1 / 1 | 0 / 0 | 1 / 0 |
| E03 | 1 / 1 | 0 / 0 | 1 / 0 |
| E04 | 4 / 4 | 0 / 0 | 2 / 0 |
| E05 | 1 / 1 | 0 / 0 | 1 / 0 |
| E06 | 2 / 2 | 0 / 0 | 0 / 0 |
| E07 | 3 / 3 | 0 / 0 | 1 / 0 |
| E08 (SW-TEST-03) | 7 / 7 | 0 / 0 | 2 / 0 |
| E09 | 2 / 2 | 0 / 0 | 1 / 0 |
| E11 | 3 / 3 | 0 / 0 | 1 / 0 |
| E12 | 5 / 5 | 0 / 0 | 1 / 0 |
| E13 | 3 / 3 | 0 / 0 | 0 / 0 |
| E14 | 4 / 4 | 0 / 0 | 1 / 0 |
| E15 | 4 / 4 | 0 / 0 | 0 / 0 |
| E16 (SW-CLI-03) | 6 / 6 | 0 / 0 | 2 / 0 |

Every `only-grep` and `only-swiftlint` set on plant and twin is empty (15 of 15 entries identical, 47 lines). The plant's E08 holds the seven forms SW-TEST-03 lists (`Task.sleep(for:)`, `Task.sleep(nanoseconds:)`, `Thread.sleep`, `usleep`, `nanosleep`, a bare `sleep(1)`, `clock.sleep`) and not the `func sleep`/`func usleep`/`func nanosleep` declarations; the plant's E16 holds a bare `exit(1)`, `Glibc.exit(2)`, `Foundation.exit(4)`, `_exit(3)`, `exit(code)` inside an `if` and an `exit(5)` at column 1.

**Where SwiftLint is more accurate than the grep** (`edge/`, `exemplar.sh`):

- Two spaces, `@unchecked  Sendable` and a line break between the words: SwiftLint reports both (lines 1 and 2), the grep reports neither.
- `usleep(5)` at column 1: SwiftLint reports it, E07's `[^.A-Za-z_]usleep(` cannot.
- Comments, doc comments and strings: the decoy file is 15 grep hits and 0 SwiftLint hits.

**Where the grep is more accurate**: `// swiftlint:disable:next e01_unchecked_sendable` removes the SwiftLint hit on the next line (E15 reports the comment); `// swiftlint:disable e01_unchecked_sendable e15_lint_suppression` on line 1 and `final class C: @unchecked Sendable {} // swiftlint:disable:this e01_unchecked_sendable e15_lint_suppression` leave SwiftLint at rc 0 and silent while the grep E01 and E15 still print the line (`selfsup/`). A file-level `// swiftlint:disable all` (as in generated protobuf code) hides all rules but is itself reported by E15 on line 1.

**False positives on three exemplars**, run from `[FX]/sl` with `--config .swiftlint.yml` and the exemplar directory as the read-only operand (`exemplar.sh`; wall time 2.6 to 6.2 s each; hits as `file:line` sets):

| Exemplar | Grep total | SwiftLint total | SwiftLint-only | Grep-only | Why grep-only |
|---|---|---|---|---|---|
| swift-nio@e12881f2a691 (555 Swift files) | 831 | 795 | **0** | 36 | 2 E01 (comments in `AsyncTestingEventLoop.swift:66`, `ThreadWindows.swift:26`), 2 E04 (doc comments), 2 E06 (a TODO comment, a deprecation message), 16 E09 (doc-comment examples and `// try! is fine here` notes), 14 E14 (`pthread_mutex` inside `precondition` message strings and doc comments of `lock.swift`/`NIOLock.swift`) |
| containerization@3e7bc39e66b3 (375) | 90 | 82 | **0** | 8 | 2 E01 and 2 E02 in `SandboxContext.pb.swift` (line 19 is `// swiftlint:disable all`), 4 comments (`BidirectionalRelay.swift:50,111`, `SandboxContext.pb.swift:3323,4289`) |
| swiftly@c8cf2e35bfca (72) | 25 | 25 | **0** | 0 | none |

The grep set therefore overstates swift-nio's `@unchecked Sendable` count: 61 real uses, not 63 ([gates] SW-GATE-10 Why), and E06 304, not 306. Residual false positives of the SwiftLint hits themselves are of two kinds, both shared with the grep: (a) **scope** — hits in directories that are test or tooling code but are not named `Tests` (swift-nio: 216 of 733 prod-rule hits sit under a path containing `Test`, `Benchmark`, `Integration`, `Example` or `Fixture`, for instance `Benchmarks/` and `IntegrationTests/`; containerization 5 of 55; swiftly 2 of 22; `grep --exclude-dir='Tests'` and `excluded: ['/Tests/']` both miss them); (b) **construct** — E13 matches `tearDown: @escaping (Result<Void, Error>) async throws -> Void` (`Cancellation.swift:36`) and `onProduceMore: @Sendable @escaping (Result<Void, Error>) -> Void` (`BufferedStream.swift:1339`), 2 distinct lines of swift-nio's 10 E13 hits, which are callbacks and not completion-handler APIs; E08 still lists nothing wrong after the declaration exclusion (58 hits became 52 on swift-nio, the 6 removed were `func usleep(` helpers in test utilities). These are review prompts, not defects; widening `excluded` to `/(Tests|IntegrationTests|Benchmarks)/` is a per-repository tuning that was not measured.

**SwiftLint behaviours measured on the way** (each is a trap for an adopter):

- Nested `.swiftlint.yml` files are ignored when `--config` is given: a nested config with `disabled_rules: [custom_rules]` in `edge/Sources/Nested/` changed nothing (`N.swift:1:16` still reported).
- Relative operands work (`... lint --config .swiftlint.yml --no-cache plant` gave 47 hits, same as the absolute path), and `find DIR -name '*.swift' -print0 | xargs -r -0 swiftlint-image.sh lint ...` gives rc 123 on the plant, 0 on the twin and 0 on an empty list (`-r`), so a changed-files run needs the canary of [gates] SW-GATE-10.
- No lintable files is a failure, not a pass: `Error: No lintable files found at paths: ...`, rc 1.
- `default_execution_mode` is real but undocumented in the README and CHANGELOG; the rule's own description claims "Rules default to SwiftSyntax mode" while `isEffectivelySourceKitFree` computes `configuration.defaultExecutionMode ?? .sourcekit` ([CustomRules.swift 0.65.1 lines 73-74 and 83-85](https://raw.githubusercontent.com/realm/SwiftLint/0.65.1/Source/SwiftLintFramework/Rules/CustomRules.swift); same at realm/SwiftLint@ec4691d9e813). Measured: with no mode line the static binary prints the `Skipping` line (so the default is SourceKit); on the image, `swiftsyntax`, `sourcekit` and no line give the same 47 plant hits and 803 JSON entries on swift-nio, in 2.3 to 2.7 s.
- The shipped wrapper `swift-tools/swiftlint-sk.sh` runs `docker run ... ghcr.io/realm/swiftlint:0.65.1 swiftlint "$@"`, and the image's entrypoint is already `/usr/bin/swiftlint` (`docker inspect`: `Entrypoint ["/usr/bin/swiftlint"]`), so SwiftLint receives `swiftlint lint ...`: `swiftlint` and `lint` are two non-existent path operands that `lint` (the default subcommand) tolerates when a real path follows. `swiftlint-sk.sh version` prints `Error: No lintable files found at paths: 'swiftlint, version'` (rc 1). Reported, not edited (not this dive's file); [FX]`/sl/swiftlint-image.sh` is the corrected wrapper used for every image run here. The README's own Docker example is `docker run -it -v `pwd`:`pwd` -w `pwd` ghcr.io/realm/swiftlint:latest` (no extra word; `latest` conflicts with [gates] SW-GATE-08).

**Decision (SW-GATE-11): advisory.** Reasons, in the order they matter: (1) the same-line `disable:this` hole defeats the carrier and its own suppression rule while the grep catches it, so the grep set must run regardless; (2) the carrier needs a pinned image or dynamic binary whose failure mode is a silent pass (finding 4); (3) the accuracy gain (44 fewer review lines across three exemplars, multi-line and two-space forms) is real but a reading aid, not a defect finder (0 of 42 sampled default-rule hits were defects, [gates] SW-GATE-11). It stays an optional second reader that an editor or pre-commit hook can run; it never replaces SW-GATE-10 and is promoted to a gate only together with SW-GATE-26 and the E15 grep.

<a id="f4"></a>
### 4. The static-binary trap and the check that fails on it

The static `swiftlint` on `run.sh`'s PATH (0.65.1) cannot reach SourceKit (`SWIFTLINT_DISABLE_SOURCEKIT` is compiled in: [Request+SwiftLint.swift](https://raw.githubusercontent.com/realm/SwiftLint/0.65.1/Source/SwiftLintCore/Extensions/Request+SwiftLint.swift) lines 8-13; message at realm/SwiftLint@ec4691d9e813:Source/SwiftLintCoreMacros/DisabledWithoutSourceKit.swift:21). Release 0.65.1 (2026-08-21) ships `swiftlint_linux_amd64.zip` and `swiftlint_linux_arm64.zip` plus the Docker image (`gh api repos/realm/SwiftLint/releases/tags/0.65.1`). Rows of `static-trap.sh` ([FX]`/sl`; "no mode line" is `.swiftlint-default.yml`, "swiftsyntax" is `.swiftlint.yml`):

| Invocation (`lint --strict --config ... --no-cache --quiet`) | Plant | Twin | `Skipping enabled rule` lines |
|---|---|---|---|
| static, no mode line | **0** | 0 | 1 each |
| static, `default_execution_mode: swiftsyntax` | 134 (abort) | 134 | 0 (stderr says `SourceKit is disabled by configuration.`) |
| image, no mode line | 2 | 0 | 0 |
| image, `swiftsyntax` | 2 | 0 | 0 |

The first row is the trap: a violating tree passes. The check ([FX]`/sl/swiftlint-gate.sh`, quoted verbatim; set `SWIFTLINT` to the command prefix and `SWIFTLINT_CONFIG` to the config):

```sh
read -r -a cmd <<<"${SWIFTLINT:-swiftlint}"
"${cmd[@]}" lint --config "${SWIFTLINT_CONFIG:-.swiftlint.yml}" --no-cache --quiet "$@" > swiftlint.log 2>&1
rc=$?
cat swiftlint.log
if grep -q -F -e 'Skipping enabled rule' swiftlint.log; then
  echo 'FAIL: SwiftLint skipped an enabled rule; use the SourceKit image (static binary skips custom_rules)' >&2
  exit 70
fi
exit "$rc"
```

Gate exit codes (`bash swiftlint-gate.sh PATH`): static + no mode line, plant **70**, twin **70** (was 0 and 0 bare); static + swiftsyntax, plant 134, twin 134 (SwiftLint's own abort, fail-closed); image, plant 2, twin 0 for both configs. Exit 70 is the new red; 2 is SwiftLint's "violations", 0 clean. Setting `default_execution_mode: swiftsyntax` is the belt (the static binary aborts instead of passing), the `Skipping` grep is the braces (a future SwiftLint whose default or static build differs still cannot pass silently).

<a id="f5"></a>
### 5. TSan, Mutex and every suppression route

Fixture [FX]`/tsan` (tools 6.2, Swift Testing, Linux). `MutexCounter`, `Gauge` (type name without the word Mutex) and `Registry` (`Mutex<[String: Int]>`, returning closure) are correct `Mutex` classes; `RacyCounter` (plain `var`, `@unchecked Sendable`), `WrongLock` (two different Mutexes "guarding" one `var`) and `MixedGuard` (a Mutex-guarded count plus an unguarded `extra`) are the planted races; `LockedCounter` (NSLock) and `ActorCounter` are controls. Eight tasks times 20,000 increments (`hammer`), one test process per test (`swift test --sanitize=thread --filter CounterTests.<name>`).

**Baseline** (6.4.0, 10 runs per test, `tsan-reps.sh`; shared Docker host):

| Test | Exit non-zero | Runs with `ThreadSanitizer: data race` | Runs with `ThreadSanitizer: Swift access race` |
|---|---|---|---|
| mutexCounter | 10 | **0** | 10 |
| gauge | 10 | **0** | 10 |
| registry | 10 | **0** | 10 |
| lockedCounter | 0 | 0 | 0 |
| actorCounter | 0 | 0 | 0 |
| racyCounter | 10 | **10** | 10 |
| wrongLock | 10 | **10** | 10 |
| mixedGuard | 10 | **10** | 10 |

6.3.3, one run per test (the same fixture; 8 tests took 10 minutes on the loaded host, a correct `Mutex` test 110 to 130 s, so 10 repeats were not affordable): mutexCounter, gauge, registry 0 `data race` and 1, 1, 3 `Swift access race` reports; lockedCounter and actorCounter 0 and 0; racyCounter, wrongLock, mixedGuard 1 `data race` each (and 2, 5, 2 `Swift access race`). The Docker precondition holds as in [testing] SW-TEST-17: `run.sh` passes `--security-opt seccomp=unconfined`; no `FATAL: ThreadSanitizer` appeared in any log.

Every `Swift access race` report on a correct class has the same shape: the top frame is the `withLock` closure (`$s7Counter5GaugeC4bumpyyFySizYuYTXEfU_`, mangled `inout sending Int` closure signature `YuYTX`), no frame names `Synchronization`, `Mutex` or `withLock` (SE-0433's `Mutex` is `futex` on Linux, [SE-0433](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0433-mutex.md); the lock is inlined into the user module). The mechanism that makes TSan's Swift-access (exclusivity) detector blind to the lock while its memory-race detector sees it is not established here; the observable is the split of report kinds. The Swift Forums thread of February 2026 reports Linux false positives with `Mutex` without a reproducer, offers no workaround and says to file compiler issues ([forum](https://forums.swift.org/t/threadsanitizer-in-a-swift-concurrency-world/84801)); the 2019 swift.org post says tests "need to actually exercise multithreaded code" and that Linux output is mangled ([blog](https://swift.org/blog/tsan-support-on-linux/)).

**Suppressions and flags tried** (6.4.0, tests `gauge registry mixedGuard racyCounter` or all eight; clean-scratch re-run `supp-run.sh`; `TSAN_OPTIONS=suppressions=$FX/tsan/supp/<file>`; suppression strings are matched against function and file names of the report stack, [ThreadSanitizerSuppressions](https://github.com/google/sanitizers/wiki/ThreadSanitizerSuppressions)):

| Try | Gauge twin | Plant still reported? |
|---|---|---|
| `race:Synchronization` | still reported | yes |
| `race:withLock` | still reported | yes |
| `called_from_lib:libswiftSynchronization.so` | still reported | yes |
| `ignore_noninstrumented_modules=1` (default false on Linux, [tsan_flags.inc](https://raw.githubusercontent.com/llvm/llvm-project/main/compiler-rt/lib/tsan/rtl/tsan_flags.inc)) | still reported | yes |
| `report_atomic_races=0`, `force_seq_cst_atomics=1` | still reported | yes |
| `race:YuYTXEfU_` (the closure signature) | silenced | yes, but would also silence any closure with that signature, including a wrong-lock `withLock` |
| `race:Gauge` (user type) | **silenced** | `mixedGuard` and `racyCounter` still reported |
| `race:MixedGuard` (user type) | `gauge` still reported | **`mixedGuard` silenced: its real race is hidden** |
| `race:Sources/Counter/Counter.swift` (file) | silenced | **no: every plant silenced** |
| `race:^$s7Counter5GaugeC4bumpyyFySizYuYTXEfU_$` (anchored mangled) | still reported | yes (did not match) |

(The first run of `race:Mutex` appeared to work only because the twin type was named `MutexCounter`; renaming the twin to `Gauge` exposed that.) **Conclusion: there is no suppression scoped to Mutex or Synchronization symbols** because the stack has none; the only working forms name the user's type, file or closure signature and blind the leg to real races there.

**The signature check** ([FX]`/tsan/tsan-check.sh`, quoted verbatim): count only plain data races, never `Swift access race`.

```sh
S="${SCRATCH:-.build}"
swift test --sanitize=thread --scratch-path "$S" "$@" > tsan.log 2>&1
rc=$?
grep -q -F -e 'FATAL: ThreadSanitizer' tsan.log && { echo 'FAIL: ThreadSanitizer could not start (docker seccomp/ASLR)' >&2; exit 70; }
if grep -n -F -e 'WARNING: ThreadSanitizer: data race' tsan.log; then exit 1; fi
grep -q -E -e 'Test run with [0-9]+ tests? .*passed' tsan.log || { echo 'FAIL: no passing Swift Testing run line' >&2; exit 1; }
exit 0
```

Per-test exit codes (`tsan-check-run.sh`, 6.4.0, clean scratch): mutexCounter 0, gauge 0, registry 0, lockedCounter 0, actorCounter 0, racyCounter **1** (`WARNING: ThreadSanitizer: data race`), wrongLock **1**, mixedGuard **1**. 6.3.3 (`tsan-check-run-short.sh`): mutexCounter 0, racyCounter **1**. The XCTest-only package has no `Test run with` line and needs the equivalent `Executed N tests, with 0 failures` check; not run.

**Decision (TSan): a gating CI job on the `data race` filter**, outside the local gate block. The evidence: 10 of 10 on 6.4 in both directions, the plant set includes the two failure modes `Mutex` cannot fix for you (wrong lock, state outside the lock), and swift-protobuf already gates a TSan matrix job (swift-protobuf@6c84c3dedac0:.github/workflows/build.yml:148-173, `swift test -c debug|release --sanitize=thread` on `swift:6.3` with the comment "Looks like 6.4 is failing for some reason"). The limits that keep it out of the done-gate: it finds only races the tests execute (the 2019 post says so; 30 of 30 plant runs on 6.4 is a statement about these plants), it needs `seccomp=unconfined` in Docker, a TSan build is a separate configuration, and the 6.3 timings were minutes per Mutex test on the shared host.

<a id="f6"></a>
### 6. Never* on changed files

SW-ERR-05 enables `NeverForceUnwrap`, `NeverUseForceTry`, `NeverUseImplicitlyUnwrappedOptionals` ([RuleDocumentation](https://raw.githubusercontent.com/swiftlang/swift-format/main/Documentation/RuleDocumentation.md): linter-only, not applied to test code that imports a test library or marks `@Test`), and 18 of 24 corpus configs keep them off ([conc]/errors consolidation). An adopted repository cannot turn them on for the whole tree. The recipe ([FX]`/never/never-gate.sh`, quoted verbatim; run from the repository root, `BASE` is the merge target, `origin/main` in CI):

```sh
BASE=${BASE:-main}
test -f .swift-format || { echo 'MISSING .swift-format'; exit 66; }
overlay=.git/never-overlay.json
sed -e 's/"NeverForceUnwrap" *: *false/"NeverForceUnwrap" : true/' \
    -e 's/"NeverUseForceTry" *: *false/"NeverUseForceTry" : true/' \
    -e 's/"NeverUseImplicitlyUnwrappedOptionals" *: *false/"NeverUseImplicitlyUnwrappedOptionals" : true/' .swift-format > "$overlay"
grep -c -E -e '"NeverForceUnwrap" : true' -e '"NeverUseForceTry" : true' -e '"NeverUseImplicitlyUnwrappedOptionals" : true' "$overlay" | grep -q -x 3 || { echo 'overlay does not enable the three Never rules'; exit 65; }
git add -A -- '*.swift'
git diff --name-only -z --diff-filter=ACMR --merge-base "$BASE" -- '*.swift' | xargs -r -0 swift format lint --strict --configuration "$overlay"
```

`--configuration` takes "a JSON file ... or a JSON string" (`swift format lint --help`); `--strict` makes findings fatal ([README](https://raw.githubusercontent.com/swiftlang/swift-format/main/README.md)); `git diff --merge-base <commit>` compares the working tree with the merge base of `<commit>` and `HEAD`, so one command covers committed and uncommitted changes ([git-diff](https://git-scm.com/docs/git-diff)), and `--diff-filter=ACMR` keeps added, copied, modified and renamed files while dropping deleted ones. The sed works because the repository's `.swift-format` carries the full rule block (SW-GATE-06); the guard turns a config without the block into exit 65, and a missing config into exit 66.

Fixture: a git repository ([FX]`/never/repo`, built by `mk-repo.sh`) whose `main` has `Legacy.swift` with `Int(text)!`, a clean `Clean.swift` and the default `.swift-format` (Never* false). Exit codes on 6.4.0 and 6.3.3 identical (`never-run.sh`, `never-controls.sh`):

| Case | Exit | Output |
|---|---|---|
| `main`, nothing changed | 0 | empty |
| `green`: a new clean file, `Legacy.swift` untouched | **0** | empty |
| `behind`: `green` while `main` moved on and touched `Legacy.swift` | **0** | empty (`--merge-base`) |
| `red`: `return d["k"]!` added to `Clean.swift` | **123** | `Sources/App/Clean.swift:7:10: error: [NeverForceUnwrap] do not force unwrap` |
| `legacy-touched`: a comment appended to `Legacy.swift` | 123 | 1 `[NeverForceUnwrap]` (file granularity) |
| `new-try`: `Int!`, `try!`, `as!` in a new file | 123 | 3 findings, one per rule |
| `green` plus an uncommitted unstaged edit with `!` | 123 | `Good.swift:7:10 ... [NeverForceUnwrap]` |
| `green` plus an untracked new file with `!` | 123 | `Fresh.swift:2:10 ... [NeverForceUnwrap]` (the `git add -A` line is what makes it visible) |
| control: the repository's own SW-GATE-02 lint (rules off) on `red` | 0 | empty (why the overlay exists) |
| control: the overlay over the WHOLE tree on `green` | 123 | the legacy `!` (why the file list exists) |
| control: two-dot `git diff main` on `behind` | 123 | `Legacy.swift:4:11 ... [NeverForceUnwrap]` (why `--merge-base`) |
| control: no `.swift-format` | 66 | `MISSING .swift-format` |
| control: config without a `rules` block | 65 | `overlay does not enable the three Never rules` |

**Cost of file granularity** (`exemplar-never.sh`: overlay with the three rules on over `Sources/` of each exemplar, read-only): swift-nio@e12881f2a691 131 of 309 files carry a finding (742 findings; per affected file median 3, p90 10, max 133); containerization@3e7bc39e66b3 21 of 218 (63; median 2, p90 5, max 14); swiftly@c8cf2e35bfca 6 of 39 (23; median 3, p90 5, max 7). So touching a file means repairing about three unwraps on the median and up to ten on one file in ten; for a repository where 42% of the files are dirty (swift-nio) the recipe is a ratchet that pays down debt on every edit, which is the intent, and a line-level variant (filtering findings to added lines) was not built.

<a id="f7"></a>
### 7. The amended gate block, end to end

Fixture [FX]`/gate/repo` (built by `mk-gate-repo.sh`): a tools-6.2 library `Lib` with `swift-docc-plugin`, `.spi.yml`, the default `.swift-format`, one Swift Testing test, tagged `1.0.0` on `main`; one branch per variant. Runner `gate.sh BRANCH` prints each step's exit code and stops at the first red step. Steps, in the amended form (steps 1, 2, 4, 5 verbatim from [gates] SW-GATE-01; 1b and 1c new; step 3 with the SW-TEST-10 prefix, [testing] SW-TEST-10):

```sh
# 1  SW-GATE-02 format triple; 123 = a finding behind xargs
git add -A -- '*.swift' \
  && git ls-files -z --cached --others --exclude-standard -- '*.swift' | xargs -r -0 swift format format --parallel --in-place \
  && git ls-files -z --cached --others --exclude-standard -- '*.swift' | xargs -r -0 swift format lint --strict --parallel \
  && git diff --exit-code -- '*.swift'
# 1b SW-GATE-28 Never* on changed files (the script of finding 6; skip when .swift-format already enables the three rules and step 1 reads it)
BASE=origin/main bash never-gate.sh
# 1c SW-GATE-10 K-07 tells: canary, then the amended set; any output line is a violation
grep -rl --include='*.swift' --exclude-dir='.build' -e 'import ' . | awk 'END { if (NR == 0) { print "K07 CANARY: no Swift file scanned" > "/dev/stderr"; exit 1 } }' || exit 1
bash k07-amended.sh > k07.out 2>&1
if [ -s k07.out ]; then cat k07.out; exit 1; fi
# 2  build: warnings are errors (SW-GATE-13)
swift build -Xswiftc -warnings-as-errors
# 3  test: SW-TEST-10 prefix on 6.4+ legs of tools-below-6.4 packages
env SWIFT_TESTING_XCTEST_INTEROP_MODE=complete swift test -Xswiftc -warnings-as-errors
# 4  libraries and SDK: no breaking public API versus the tagged baseline (SW-GATE-20)
swift package diagnose-api-breaking-changes "$BASELINE"
# 5  libraries and SDK: DocC builds clean (SW-GATE-21)
swift package plugin generate-documentation --target "$DOCC_TARGET" --warnings-as-errors --analyze
```

Exit codes per step (6.4.0; `BASELINE=1.0.0`, `DOCC_TARGET=Lib`):

| Branch (planted defect) | 1 | 1b | 1c | 2 | 3 | 4 | 5 | Stops at |
|---|---|---|---|---|---|---|---|---|
| `ok` (additive documented API + test) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | green |
| `fmt` (4-space indent) | **1** | | | | | | | 1 |
| `never` (`name.first!` in a format-clean file) | 0 | **123** | | | | | | 1b (`[NeverForceUnwrap]`) |
| `tell` (`Task.detached {}` in a new file) | 0 | 0 | **1** | | | | | 1c (`./Sources/Lib/Spawn.swift:2:  await Task.detached {}.value`) |
| `warn` (`var x` written, never read) | 0 | 0 | 0 | **1** | | | | 2 (`variable 'x' was written to, but never read`) |
| `interop` (`@Test` calling `XCTAssertEqual(1, 2)`) | 0 | 0 | 0 | 0 | **1** | | | 3 |
| `api` (public `leave(_:)` removed) | 0 | 0 | 0 | 0 | 0 | **1** | | 4 (`API breakage: func Greeter.leave(_:) has been removed [#api-digester-breaking-change]`) |
| `docc` (unresolved ``` ``Nope`` ``` link) | 0 | 0 | 0 | 0 | 0 | 0 | **1** | 5 (`error: 'Nope' doesn't exist at '/Lib/Greeter/hi(_:)'`) |

Controls: step 3 **without** the prefix on `interop` exits **0** with no warning line (6.4.0, tools 6.2: `limited` mode, [testing] SW-TEST-10 C1) and **1** with it; on 6.3.3 both exit 0 (the variable is ignored below 6.4). The 6.3.3 run of the same branches: `ok` 0 through step 4 and **1** at step 5 (the DocC harness limitation of [gates] SW-GATE-21: it fails twin and violation alike, so 6.3 DocC stays unverified), `fmt` 1, `never` 1b 123, `tell` 1c 1, `warn` 2 1, `interop` 3 exit 0 (correct: nothing to detect on 6.3) then 5 exit 1, `api` 4 exit 1.

A wiring bug found while building this: the first version of step 1c chained the canary with `&&` and ran the tells after a `;`, so an empty Swift tree skipped the tells and still passed. The corrected form above exits at the canary (`|| exit 1`); `k07-step.sh` carries it, and the empty-directory case prints `K07 CANARY: no Swift file scanned` ([gates] SW-GATE-10 [FL V9b]).

<a id="f8"></a>
### 8. Decisions and hand-offs to the other consolidations

| Decision asked | Answer | Where it lands |
|---|---|---|
| SW-GATE-10's final grep set | The quoted `k07-amended.sh` plus the canary of finding 7 plus the touched-files and justification passes unchanged from [gates]; E08 and E16 replaced as above | SW-GATE-10 text; contradictions 7 and 8 closed |
| SW-GATE-11 advisory or gate | **Advisory** (finding 3); promotion needs SW-GATE-26 plus E15 | SW-GATE-11 text; contradiction 3 closed |
| Static-binary failing check | New **SW-GATE-26** (finding 4) | new rule |
| SW-GATE-17's verified form | `-Xswiftc -Werror -Xswiftc ExplicitSendable` and `.treatWarning("ExplicitSendable", as: .error)`; `-require-explicit-sendable` forbidden | SW-GATE-17 text; contradiction 1 closed |
| TSan gate or advisory | **Gate in CI on `data race` only** (new **SW-GATE-27**); never suppress | SW-CONC-27, SW-TEST-17 (contradiction 18), Q-T2 |
| Changed-files Never* recipe | New **SW-GATE-28** | new rule; SW-ERR-05/06 cite it |
| Root-only manifest warning control | New **SW-GATE-29**: remote consumers never see it, path consumers do | SW-GATE-14, SW-GATE-16, SW-PKG-02 (contradiction 15) |
| Gate block | Steps 1b and 1c added, step 3 with the prefix | SW-GATE-01 text; contradiction 11 closed |

Texts in other consolidations that these results make wrong (reported, not edited): SW-CONC-04 "Verify" ("the build exit stays 0 even with `.treatWarning(...)` ... a log-reading audit, never a gate") and its `.unsafeFlags(["-Xfrontend","-require-explicit-sendable"])` advice; SW-CONC-27 "advisory CI leg only ... expect a false positive on correct `Mutex` code"; SW-TEST-17 "TSan is advisory ... `Mutex` is reported as a race"; SW-CONC-21 "do not rely on SwiftLint `custom_rules`" (true only of the static binary); SW-GATE-11's "Check" line (`2>&1 | grep -c 'Skipping enabled rule'` prints a count; replace with SW-GATE-26); SW-GATE-14's "library only behind an environment switch" for the two non-growing groups.

## Normative guidance candidates

Severity words are the consolidation's (MUST, SHOULD, CONSIDER). "Run" says whether the verification was watched red on a planted violation and green on a compliant twin; the fixture path is under `FX`. Greps print the violation: empty output is a pass, and judge by printed lines, not exit status (`grep` exits 1 on no match and 123 behind `xargs`).

1. **SW-GATE-17 (revised, SHOULD, Swift 6.1; manifest form tools 6.2).** A library and the SDK promote ExplicitSendable with `.treatWarning("ExplicitSendable", as: .error)` in `swiftSettings` of every library target (unconditionally; see rule 3) or with `swift build -Xswiftc -Werror -Xswiftc ExplicitSendable`; CLIs, servers and apps do not. Annotate each flagged public struct, class, enum or nested type with `Sendable`, an unavailable `Sendable` extension, `@unchecked Sendable` with a reason, or on 6.4 `~Sendable`.
   - Rationale: both forms enable the opt-in group and promote it; a public type without a statement is someone else's data race (exit 1 on plant, 0 on twin, 6.4.0 and 6.3.3).
   - Verify: `swift build -Xswiftc -Werror -Xswiftc ExplicitSendable` exits non-zero on the plant; presence in the manifest or CI: `grep -rl -F -e 'treatWarning("ExplicitSendable", as: .error)' -e 'Werror -Xswiftc ExplicitSendable' --include='Package*.swift' --include='*.yml' --include='*.yaml' --include='Makefile' --include='*.sh' --exclude-dir='.build' . | awk 'END { if (NR == 0) print "MISSING: ExplicitSendable promotion" }'` (output = violation for a library).
   - Run: **yes** [FX]`/es` (`es.sh` rows A and G exit 1 / twin 0 on both toolchains; presence grep printed `MISSING: ExplicitSendable promotion` on `plant`, nothing on `m-plant` and `m-twin`).

2. **SW-GATE-17 clause (MUST).** Never write `-require-explicit-sendable` in any spelling (`-Xswiftc -require-explicit-sendable`, `-Xfrontend -require-explicit-sendable`, `.unsafeFlags([... "-require-explicit-sendable" ...])`), and never rely on `-warnings-as-errors` for ExplicitSendable; to audit without failing, use `-Xswiftc -Wwarning -Xswiftc ExplicitSendable`.
   - Rationale: the driver spelling is a silent no-op (exit 0, zero diagnostics) and the frontend spelling demotes the group to a warning nothing can promote (exit 0, 10 warning lines), so a gate built on either is decoration; four corpus repositories have one.
   - Verify: `grep -rn -F -e 'require-explicit-sendable' --include='Package*.swift' --include='*.yml' --include='*.yaml' --include='Makefile' --include='*.sh' --exclude-dir='.build' .` (output = violation).
   - Run: **yes** — printed `mu-plant/Package.swift:6`, `mr-plant/Package.swift:6` and the `wf/.github/workflows/main.yml:4` swift-log CI shape; empty on `m-plant` ([FX]`/es`; builds: rows C, E, F, I, J, K, L).

3. **SW-GATE-29 (new, SHOULD; settles contradiction 15).** Treat manifest warning control as the package's own check: a library may set `.treatWarning("StrictLanguageFeatures", as: .error)` and `.treatWarning("ExplicitSendable", as: .error)` unconditionally (tools 6.2); never reason that a published consumer is protected or burdened by it. Warning groups that grow with the toolchain (`.treatAllWarnings`, `NoUsage`) stay behind the SW-GATE-14 switch.
   - Rationale: git and registry consumers get exit 0 (flags stripped, SE-0480), `path:` consumers get the library's error (exit 1); the two groups fire only on the library's own typo or missing statement.
   - Verify: build a consumer with `.package(url:)` and one with `.package(path:)`; static: `grep -rn -F -e 'treatWarning' --include='Package*.swift' .` then read the group names against this list.
   - Run: **yes** [FX]`/dep` (`dep.sh`: `slf-typo` root 1, git 0, path 1; `es-plant` root 1, git 0, path 1; `slf-ok` and `slf-noguard` 0 everywhere; 6.4.0 and 6.3.3).

4. **SW-GATE-10 final set (MUST, new and touched code).** Run the canary, then the amended K-07 set of finding 3 (E01-E07, E08 as the SW-TEST-03 grep with its three `func` exclusions, E09, E11-E15, E16 as the SW-CLI-03 grep) and treat every printed line as a violation unless the hatch rule of SW-GATE-10 (reason comment on the line or the line above) holds.
   - Rationale: E08 and E16 in the old set diverged from the testing and CLI rules (E16 missed `Glibc.exit(`, `_exit(` and column 1); the set stays a gate because the grep sees `swiftlint:disable:this` suppression that the SwiftLint carrier cannot.
   - Verify: `bash k07-step.sh k07-amended.sh` from the repository root (canary first; any output is a violation); touched-files form unchanged from [gates].
   - Run: **yes** [FX]`/sl` (`k07-amended.sh` plant 47 lines over 15 entries, twin 0, decoy 15; E08 52 and E16 correct on swift-nio, containerization, swiftly; `gate.sh tell` step 1c exit 1 on `./Sources/Lib/Spawn.swift:2`, `ok` 0; empty directory prints the canary).

5. **SW-GATE-11 (revised, SHOULD; advisory).** Where a repository wants the K-07 tells in an editor or pre-commit hook, ship the custom_rules config of finding 3 with `default_execution_mode: swiftsyntax`, run it from `ghcr.io/realm/swiftlint:<exact tag>` invoked as `docker run ... ghcr.io/realm/swiftlint:0.65.1 lint ...` (no extra `swiftlint` word), through the SW-GATE-26 wrapper; it never replaces rule 4 and never runs without the E15 grep.
   - Rationale: 15 of 15 entries identical to the grep on the plant, 0 SwiftLint-only hits and 44 fewer grep-only review lines on three exemplars, catches two-space and line-split forms; but one `// swiftlint:disable:this e01_unchecked_sendable e15_lint_suppression` silences the rule and its own suppression rule (rc 0, nothing printed).
   - Verify: `swiftlint lint --config .swiftlint.yml --no-cache --quiet` exits 2 on a violation and 0 on the twin; the suppression backstop is `grep -rn --include='*.swift' --exclude-dir='.build' -F -e 'swift-format-ignore' -e 'swiftlint:disable' -e 'swiftformat:disable' .` (output = needs sign-off).
   - Run: **yes** [FX]`/sl` (`parity.sh`, `exemplar.sh`, `selfsup/`; plant rc 2, twin rc 0, decoy rc 0; `selfsup` rc 0 silent for the `:this` form while the E15 grep printed all three files).

6. **SW-GATE-26 (new, MUST wherever a SwiftLint custom_rules gate or hook is configured).** Run SwiftLint through a wrapper that exits non-zero when its output contains `Skipping enabled rule`, and never use the static `swiftlint` (`swiftlint-static`, the binary on a bare Linux PATH) for `custom_rules`.
   - Rationale: static + default mode exits 0 on a violating tree and prints one `Skipping enabled rule 'custom_rules'` line, even under `--quiet`; static + `swiftsyntax` aborts 134; the image exits 2 on the violation.
   - Verify: the wrapper of finding 4: exit 70 means the carrier did not run; the grep half alone: `SWIFTLINT_CONFIG=.swiftlint.yml SWIFTLINT=swiftlint bash swiftlint-gate.sh Sources` (exit 70 = skipped rule, 2 = violations, 0 = clean, 134 = abort).
   - Run: **yes** [FX]`/sl/static-trap.sh`: static + no mode line gate 70 on plant and twin (bare 0 and 0 with one `Skipping` line each), static + swiftsyntax 134, image 2 on plant and 0 on twin for both configs.

7. **SW-GATE-27 (new, SHOULD; supersedes the advisory-only clauses of SW-CONC-27 and SW-TEST-17).** Add a CI job `swift test --sanitize=thread` that fails only on `WARNING: ThreadSanitizer: data race`, on `FATAL: ThreadSanitizer`, or on a missing passing test-run line, and never on `Swift access race`; run it in Docker with `--security-opt seccomp=unconfined`; do not write TSan suppressions; keep a deterministic count assertion for every hatch-guarded type (SW-CONC-27).
   - Rationale: correct `Mutex` classes produce only `Swift access race` reports (10 of 10 runs, 0 `data race`), real races produce `data race` (30 of 30 runs on 6.4, 3 of 3 on 6.3); no suppression is scoped to Mutex, and name-based ones hide real races (`race:MixedGuard` turned a red plant green).
   - Verify: `bash tsan-check.sh --filter CounterTests.gauge` (exit 0) versus `--filter CounterTests.wrongLock` (exit 1), or the quoted script over the whole suite; reading: a green run proves only that the exercised paths are race-free.
   - Run: **yes** [FX]`/tsan` (`tsan-check-run.sh` 6.4: twins 0, plants 1; `tsan-check-run-short.sh` 6.3: mutexCounter 0, racyCounter 1; `tsan-reps.sh` 10 runs on 6.4). XCTest-only form and 6.3 repeats: no.

8. **SW-GATE-28 (new, SHOULD for adopted repositories whose `.swift-format` keeps the Never* rules off; the whole-tree gate of SW-ERR-05 for new ones).** Gate changed Swift files with the repository's own config plus the three Never* rules on, through a throwaway overlay, using the script of finding 6; the base is the merge target (`--merge-base`), never a two-dot diff.
   - Rationale: red on a `!`, `try!`, `as!` or IUO in a changed, uncommitted or untracked file; green with a legacy `!` file untouched; the file-level cost is a median of 3 findings per touched dirty file.
   - Verify: `BASE=origin/main bash never-gate.sh` (exit 123 = a finding in a changed file, 65/66 = the overlay or config is missing); static: `grep -c -E -e '"NeverForceUnwrap" : true' -e '"NeverUseForceTry" : true' -e '"NeverUseImplicitlyUnwrappedOptionals" : true' .swift-format` prints 3 where the whole tree is already gated.
   - Run: **yes** [FX]`/never` (`never-run.sh` 6.4.0 and 6.3.3: main 0, green 0, behind 0, red 123, legacy-touched 123, new-try 123; `never-controls.sh`: uncommitted 123, untracked 123, no config 66, no rules block 65, whole-tree control 123, two-dot control 123, repository gate with rules off 0).

9. **SW-GATE-01 (amended block, MUST).** The block is steps 1, 1b (adopted repositories), 1c, 2, 3 with the SW-TEST-10 prefix, 4 and 5 of finding 7; a change is done when every applicable step exits 0 on the tree named, with the command and exit code quoted.
   - Rationale: each planted defect failed at its own step and nowhere earlier (fmt 1, never 1b, tell 1c, warn 2, interop 3, api 4, docc 5); without the prefix the `interop` branch passed step 3.
   - Verify: `bash gate.sh BRANCH` or the block itself; steps 4 and 5 bind libraries and the SDK.
   - Run: **yes** [FX]`/gate` (6.4.0: all seven branches; 6.3.3: all but DocC, which is the known harness limitation).

10. **SW-GATE-10 canary clause (MUST).** The canary exits the whole step (`|| exit 1`); never chain it with `&&` before a `;`.
    - Rationale: the first `&&`-chained draft passed an empty Swift tree.
    - Verify: `bash k07-step.sh k07-amended.sh` in a directory with no Swift file prints `K07 CANARY: no Swift file scanned` and exits 1.
    - Run: **yes** (finding 7 wiring bug; the corrected step 1c exit 0 on `ok`, 1 on `tell`). The empty-directory case was run in [gates] [FL V9b] for the earlier form; the corrected step was not re-run on an empty directory: **no**.

11. **Hand-off (not a new ID): update SW-CONC-04, SW-CONC-27, SW-TEST-17, Q-T2.** SW-CONC-04's Verify becomes rule 1; SW-CONC-27 and SW-TEST-17 become rule 7 (TSan gating on `data race`, never suppressed); Q-T2 ("is TSan advisory") is answered by rule 7.
    - Verify: `grep -rn -F -e 'never a gate' -e 'advisory CI leg only' -e 'TSan is advisory' .` over the two consolidations after the edit (output = stale text).
    - Run: no (reading heuristic).

## Verification runs

All on Linux in Docker, 2026-10-10. `R=~/.cache/research-lang/swift-tools/run.sh`; `FX` as in the header; "6.3" means `SWIFT_VERSION=6.3 $R ...`. A grep check's output is the violation; a green row prints nothing.

| # | Fixture and command (verbatim) | Violation | Twin | Relevant lines |
|---|---|---|---|---|
| V1 | `$R bash $FX/es/es.sh` (6.4 and 6.3): `swift build --scratch-path "$SWIFT_SCRATCH/lint-carriers-and-sanitizers/es/$n" <row flags>` in `es/plant`, `es/twin`, `es/m-plant`, `es/m-twin`, `es/mr-*` | A `-Xswiftc -Werror -Xswiftc ExplicitSendable` **1**; B `-Xswiftc -warnings-as-errors` 0; C `-Xswiftc -require-explicit-sendable` 0; D **1**; E 0; F 0; G manifest **1**; H **1**; I 0; J 0 | all 0 | `error: public struct 'Config' does not specify whether it is 'Sendable' or not [#ExplicitSendable]`; rows F, I, J print the same text as `warning:` (10 lines); same codes on 6.3 |
| V2 | `$R bash $FX/es/es2.sh`, `es3.sh` (6.4 and 6.3) | `mu-plant` (unsafeFlags with `-warnings-as-errors`) 0, same plus CLI `-Xswiftc -warnings-as-errors` 0; `-Wwarning ExplicitSendable` then `-warnings-as-errors` **1**; reverse order 0; `-Wwarning` alone 0 with 10 lines | all 0 | |
| V3 | `$R bash $FX/es/sc.sh`, `sc2.sh`, `kinds.sh` (6.4 and 6.3): `swiftc -typecheck -parse-as-library [-swift-version 6] <flags> file` | `-Werror ExplicitSendable` rc 1 with 4 errors; `-Xfrontend -require-explicit-sendable` rc 0 with 4 warnings; `-require-explicit-sendable` rc 0, silent | | kinds: 8 error lines on struct, generic struct, class, open class, 2 enums, Inner, Outer; actor, protocol, typealias, internal, `Sendable`/`@unchecked`/unavailable/conditional not flagged; 6.3: `~Sendable` requires `-enable-experimental-feature TildeSendable` |
| V4 | `$R bash $FX/dep/dep.sh` (6.4 and 6.3) | `libs/slf-typo` 1, `app-path-slf-typo` 1, `app-git-slf-typo` **0**; `libs/es-plant` 1, `app-path-es-plant` 1, `app-git-es-plant` **0** | `slf-ok`, `slf-noguard` all 0 | `<unknown>:0: error: 'ExistentalAny' is not a recognized upcoming feature [#StrictLanguageFeatures::UnrecognizedStrictLanguageFeatures]` |
| V5 | `cd $FX/sl; bash parity.sh plant` (host; image via `swiftlint-sk.sh`) | rc 2, 15 of 15 entries identical to the grep, 47 hits | `twin`: rc 0, 0 / 0; `decoy`: rc 0, SwiftLint 0, grep 15 | |
| V6 | `cd $FX/sl; bash exemplar.sh apple__swift-nio` (also `apple__containerization`, `swiftlang__swiftly`) | SwiftLint rc 2 | | totals grep/SwiftLint 831/795, 90/82, 25/25; SwiftLint-only 0 in all |
| V7 | `cd $FX/sl; bash static-trap.sh` | bare: static no-mode 0 (1 `Skipping` line), static swiftsyntax 134, image 2; gate: static no-mode **70**, static swiftsyntax 134, image 2 | bare image 0; gate image 0; static no-mode twin bare 0, gate **70** | `FAIL: SwiftLint skipped an enabled rule; use the SourceKit image (static binary skips custom_rules)` |
| V8 | `cd $FX/sl; $PWD/swiftlint-image.sh lint --config .swiftlint.yml --no-cache --quiet selfsup` | rc 0 and silent for `A.swift` (`disable all` is reported by E15 only), `B.swift` reported only for E15, `C.swift` (`disable:this`) nothing | | `(cd selfsup; bash ../k07-amended.sh e01 e15)` prints `./C.swift:1`, `./B.swift:2`, `./A.swift:2`, `./C.swift:1`, `./B.swift:1`, `./A.swift:1` |
| V9 | `$R bash $FX/tsan/slug-wrap.sh 64 $FX/tsan/tsan-check-run.sh` (6.4) and `SWIFT_VERSION=6.3 $R bash $FX/tsan/slug-wrap.sh 63 $FX/tsan/tsan-check-run-short.sh` | racyCounter **1**, wrongLock **1**, mixedGuard **1** (6.4); racyCounter **1** (6.3) | mutexCounter, gauge, registry, lockedCounter, actorCounter 0 (6.4); mutexCounter 0 (6.3) | `44:WARNING: ThreadSanitizer: data race (pid=785)` |
| V10 | `$R bash $FX/tsan/tsan-reps.sh 10` (6.4; scratch `tsan`) | exit non-zero 10/10 and `data race` in 10/10 runs for racyCounter, wrongLock, mixedGuard | `data race` 0/10 for mutexCounter, gauge, registry (exit non-zero 10/10 on `Swift access race`); lockedCounter, actorCounter 0/10 | table in finding 5 |
| V11 | `$R bash $FX/tsan/tsan.sh base63 ""` via `slug-wrap.sh 63` (6.3, one run each) | racyCounter, wrongLock, mixedGuard: 1 `data race` each | mutexCounter, gauge, registry 0 `data race`; locked, actor 0 warnings | |
| V12 | `$R bash $FX/tsan/supp-run.sh` (6.4) and the first matrix (`TSAN_OPTIONS=suppressions=$FX/tsan/supp/<file>`) | `race:MixedGuard` makes `mixedGuard` rc 0; `race:Sources/Counter/Counter.swift` makes every plant rc 0 | `race:Gauge` makes `gauge` rc 0 | the table in finding 5 |
| V13 | `$R bash $FX/never/never-run.sh` and `never-controls.sh` (6.4 and 6.3) | see the table in finding 6 | | `Sources/App/Clean.swift:7:10: error: [NeverForceUnwrap] do not force unwrap` |
| V14 | `$R bash $FX/never/exemplar-never.sh` (read-only, overlay with three rules on) | swift-nio 131/309 files (742), containerization 21/218 (63), swiftly 6/39 (23) | | |
| V15 | `$R bash $FX/gate/gate.sh <branch>` for `ok fmt never tell warn interop api docc` (6.4); same on 6.3 | see the table in finding 7 | `ok` green | |
| V16 | `$R bash $FX/gate/step3-noprefix.sh` (6.4 and 6.3) | 6.4: no prefix **0**, prefix **1**; 6.3: both 0 | | |
| V17 | `grep -rn -F -e 'require-explicit-sendable' --include='Package*.swift' --include='*.yml' --include='*.yaml' --include='Makefile' --include='*.sh' --exclude-dir='.build' .` from `$FX/es` over `mu-plant`, `mr-plant`, `wf` | prints `mu-plant/Package.swift:6`, `mr-plant/Package.swift:6`, `wf/.github/workflows/main.yml:4` (rc 0) | `m-plant`: empty (rc 1) | |
| V18 | `grep -rl -F -e 'treatWarning("ExplicitSendable", as: .error)' -e 'Werror -Xswiftc ExplicitSendable' --include='Package*.swift' --include='*.yml' --include='*.yaml' --include='Makefile' --include='*.sh' --exclude-dir='.build' DIR \| awk 'END { if (NR == 0) print "MISSING: ExplicitSendable promotion" }'` over `plant` | `MISSING: ExplicitSendable promotion` | `m-plant`, `m-twin`: empty | |
| V19 | `find plant -name '*.swift' -print0 \| xargs -r -0 $FX/sl/swiftlint-image.sh lint --config .swiftlint.yml --no-cache --quiet` | 123 | twin 0; empty list 0 | |

Failures and non-reds, reported: (a) **I-V18's forms did not go red, by construction** (rows F, I, J, K, L of V1/V2: the frontend flag); that is the finding, not a failure of the new checks. (b) The first TSan 6.3 repeat jobs were lost (a `docker kill` of my own earlier job, then an exit 137 on the loaded host); the 6.3 numbers above are the later single run per test plus the two-test check, stated as such. (c) The first draft of the SW-GATE-27 suppression table credited `race:Mutex`; it worked only through the type name `MutexCounter` and was corrected by renaming the twin. (d) DocC on 6.3 is unverified (V15). (e) `race:^$s7Counter5GaugeC4bumpyyFySizYuYTXEfU_$` did not match; why is not established.

## Exemplar evidence

- **Rule 1/2 (ExplicitSendable).** No exemplar satisfies rule 1 (promotion of the group to an error). Violators of rule 2 (a form that cannot fail): swift-log@4038b6a4f74a:.github/workflows/main.yml:18-21 (`-Xswiftc -warnings-as-errors --explicit-target-dependency-import-check error -Xswiftc -require-explicit-sendable`, driver no-op, row C/E) and swift-log@4038b6a4f74a:Package.swift:71 (`.unsafeFlags(["-Xfrontend", "-require-explicit-sendable"])`, warning only, row L); swift-distributed-tracing@a5270bd1280a:.github/workflows/main.yml:17-20; swift-openapi-generator@c4f943e14015:.github/workflows/main.yml:18-21; swift-service-lifecycle@c55297914e26:.github/workflows/main.yml:18-21; async-http-client@017115279d09:Package.swift:25-26 (`.unsafeFlags(["-Xfrontend", "-require-explicit-sendable", "-warnings-as-errors"])`, exit 0 on the plant, row K). Contradiction in itself: swift-testing@c7d68ca20cd7:Package.swift:440 appends `.treatWarning("ExplicitSendable", as: .warning)` (the group enabled as a warning, an audit log, not a gate).
- **Rule 3 (root-only).** swift-testing@c7d68ca20cd7:Package.swift:436-441 documents that dependency warnings are suppressed ([gates] SW-GATE-14); swift-aws-lambda-runtime@8abd464310c7:Package.swift:7 sets warning control unconditionally in a published runtime (a violation of the old SW-GATE-14, allowed by rule 3 only for the two non-growing groups).
- **Rule 4/5 (K-07 set and carrier).** nio: 61 real `@unchecked Sendable`, 304 `@preconcurrency`, 302 `try!`/`as!`, 52 sleeps in `Tests`, 0 `exit(` (V6). containerization: 7 `_exit(`/`exit` calls in command code (`RunAgentCommand.swift:200 _exit(130)`, `AgentCommand.swift:69,180`, `InitCommand.swift:109`, `PauseCommand.swift:53,60,78`), which the rule treats as findings outside the entry point except the SW-CLI-10 re-raise; `.pb.swift` files carry `// swiftlint:disable all` at line 19 (4 hatch lines hidden from SwiftLint). swiftly: `Proxy.swift:93,95,99,102` `exit(...)` and `TestSwiftly.swift:88,93` `Foundation.exit(2)`. Three of 40 exemplars configure `custom_rules`: element-x-ios@14e33866ced2:.swiftlint.yml:56, SwiftLint itself realm/SwiftLint@ec4691d9e813:.swiftlint.yml:111, tuist@2f6ac74754bf:.swiftlint.yml:3; none of them is the K-07 set.
- **Rule 6 (static trap).** Source of the skip message: realm/SwiftLint@ec4691d9e813:Source/SwiftLintCoreMacros/DisabledWithoutSourceKit.swift:21; default mode `?? .sourcekit` at realm/SwiftLint@ec4691d9e813:Source/SwiftLintFramework/Rules/CustomRules.swift:84.
- **Rule 7 (TSan).** swift-protobuf@6c84c3dedac0:.github/workflows/build.yml:148-173 gates `address` and `thread` on debug and release (`fail-fast: false`, `swift:6.3`, "Looks like 6.4 is failing for some reason"); realm/SwiftLint@ec4691d9e813:Makefile:15 `TSAN_SWIFT_BUILD_FLAGS=-Xswiftc -sanitize=thread` is a macOS-only target (`xcrun`, `libclang_rt.tsan_osx_dynamic.dylib`, unverified: read only). No other corpus workflow runs `--sanitize=thread`.
- **Rule 8 (Never\*).** containerization lints with `.swift-format-nolint` where the three rules are `false` (apple/containerization@3e7bc39e66b3:Makefile:505, `.swift-format-nolint:35-37`; [errors] SW-ERR-06); overlay measurements: swift-nio 131/309 files, containerization 21/218, swiftly 6/39 (V14).
- **Rule 9 (gate block).** swift-log@4038b6a4f74a:.github/workflows/pull_request.yml:22-26 runs the blanket flag with nightlies exempt ([gates] SW-GATE-13); swift-protobuf@6c84c3dedac0:.github/workflows/build.yml:146 runs `git ls-files -z '*.swift' | xargs -0 swift format lint --strict --parallel`. No exemplar runs a Never* changed-files step or the interop prefix.

## AI-agent angle

What a model characteristically gets wrong here, and the smallest mechanical check:

| Mistake | Why it compiles or passes | Check |
|---|---|---|
| Adds `-Xswiftc -require-explicit-sendable` (or the `-Xfrontend` unsafeFlags) "to enforce Sendable on the public API" and reports the gate done | exit 0 on a plant; it copies swift-log's CI | rule 2 grep; `swift build -Xswiftc -Werror -Xswiftc ExplicitSendable` on a planted unannotated public type |
| Adds `ExplicitSendable` to `-warnings-as-errors` expecting it to fire | the opt-in group is silent under the blanket flag | the same build; `-Wwarning ExplicitSendable` placed before `-warnings-as-errors` is the only blanket-flag form that works |
| Silences a flagged public type with `@unchecked Sendable` | satisfies the diagnostic | SW-GATE-10 E01 plus the justification pass |
| Runs `swiftlint` from Homebrew or the Linux release zip on a `custom_rules` config and calls the tree clean | exit 0 with one `Skipping enabled rule` warning | SW-GATE-26 wrapper (exit 70) |
| Runs `swiftlint-sk.sh version` or passes `swiftlint` twice to the image | the entrypoint is already `swiftlint` | `docker run ... ghcr.io/realm/swiftlint:0.65.1 lint ...` |
| Adds `// swiftlint:disable:this ...` or `disable all` to make the carrier green | the carrier honours it (rc 0, silent) | E15 grep (`swiftlint:disable`) |
| Reads TSan's `Swift access race` on a `Mutex` class as a real race and rewrites the class to an actor, or reads it as a false positive and adds `race:` suppressions | the report kind is the only discriminator | SW-GATE-27: fail on `data race` only; `grep -rn -F -e 'ThreadSanitizer' --include='*.txt' --include='*.supp' .` for stray suppression files (reading heuristic) |
| Treats a green TSan run as proof | it only sees exercised paths | deterministic count assertion (SW-CONC-27) |
| Runs `swift format lint` over the whole tree with the overlay and "fixes" 742 legacy findings in an unrelated change | no scoping | SW-GATE-28 reads `git diff --merge-base`; review the diff stat |
| Uses `git diff --name-only main` for the changed-file list on a branch that is behind main | two-dot diff includes main's own changes (rc 123 on the `behind` fixture) | `--merge-base` |
| Chains the canary with `&&` before the tells | an empty tree passes | `bash k07-step.sh` in an empty directory prints the canary |
| Edits `.swift-format` to turn Never* on repository-wide in an adopted repo | rewrites the gate | SW-GATE-05 `git diff origin/main --stat -- .swift-format` |

Pre-Swift-6 habits that reach this area unchanged from the other consolidations (GCD, `ObservableObject`, `@unchecked Sendable`, `Task.detached`, `try!`, `as!`, `exit()`, XCTest-only tests, old manifest APIs) are exactly the K-07 entries E01-E16; the SwiftLint carrier is a second way to see them, the grep set is the gate.

## Contested / evolving

- **ExplicitSendable demotion by the frontend flag** is an observed behaviour, not a documented one; the userdoc describes the group and says nothing about `-require-explicit-sendable`. A future compiler may let the group win; re-run V1 rows F, I, J at each toolchain bump (as of 6.4.0 and 6.3.3). Trend: the manifest `.treatWarning` form (SE-0480, Swift 6.2) is the supported spelling and the corpus is still on the flag spellings.
- **SwiftLint's custom-rule execution mode.** The rule description says SwiftSyntax is the default; the code computes SourceKit when no mode is set (0.65.1). The default may flip; the shipped config sets the mode explicitly and SW-GATE-26 makes either behaviour safe. A SwiftSyntax-only rule set would let the static binary run custom_rules; today it aborts 134 on `excluded_match_kinds`, which needs SourceKit-derived kinds.
- **TSan with Synchronization.** One forum thread (February 2026) reports Linux false positives without a reproducer; the report-kind split measured here is a workaround for the current compiler, not a fix. Whether a later Swift annotates the `Mutex` lock for TSan's Swift-access detector is open; re-run `tsan-reps.sh` per toolchain. swift-protobuf pins its sanitizer job to 6.3 because 6.4 "is failing for some reason" (its comment), unexplained.
- **Gate vs advisory for SwiftLint.** The measured parity argues for promotion; the same-line `disable:this` hole and the image dependency argue against. Revisit if SwiftLint adds a way to forbid suppression comments per rule.
- **File vs line granularity for Never\*.** File granularity is simple and ratchets; a repository like swift-nio (42% of source files dirty) may prefer a baseline file. Not researched.
- **`swift format` configuration-by-JSON-string** (the `--configuration` string form) could replace the temp file with process substitution; not measured.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://raw.githubusercontent.com/swiftlang/swift/main/userdocs/diagnostics/explicit-sendable-annotations.md | Compiler userdoc for the ExplicitSendable group | Swift 6.1+ (read 2026-10-10) | Defines what the group flags and the three accepted annotations |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0443-warning-control-flags.md | SE-0443, precise control over compiler warnings | Implemented Swift 6.1 | "The last one wins" ordering rule; `-Wwarning`/`-Werror <group>` |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0480-swiftpm-warning-control.md | SE-0480, warning control settings for SwiftPM | Implemented Swift 6.2 | `.treatWarning`/`.treatAllWarnings`; remote targets get `-suppress-warnings` |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0433-mutex.md | SE-0433, `Mutex` in Synchronization | Implemented Swift 6.0 | Linux `Mutex` is `futex`; context for TSan's blind spot |
| https://github.com/swiftlang/swift-package-manager/blob/5546f44a3b52/Sources/Runtimes/PackageDescription/BuildSettings.swift | `SwiftSetting.treatWarning` API source ("Since: PackageDescription 6.2") | 2026-10 (exemplar sha 5546f44a3b52) | Tools-version floor of the manifest form |
| https://raw.githubusercontent.com/swiftlang/swift-format/main/Documentation/RuleDocumentation.md | swift-format rule documentation | main, 2026-10 | Never* rules are linter-only; test-code exemption |
| https://raw.githubusercontent.com/swiftlang/swift-format/main/README.md | swift-format README | main, 2026-10 | `-s/--strict` semantics; lint options |
| https://raw.githubusercontent.com/swiftlang/swift-format/main/Documentation/Configuration.md | swift-format configuration reference | main, 2026-10 | The `rules` key and defaults the overlay depends on |
| https://raw.githubusercontent.com/realm/SwiftLint/0.65.1/README.md | SwiftLint README at 0.65.1 | 2026-08 | Regex custom rules, `only_rules` with `custom_rules`, Docker usage |
| https://raw.githubusercontent.com/realm/SwiftLint/0.65.1/Source/SwiftLintFramework/Rules/CustomRules.swift | Custom rules implementation | 0.65.1 | `default_execution_mode`, `?? .sourcekit` default, description mismatch |
| https://raw.githubusercontent.com/realm/SwiftLint/0.65.1/Source/SwiftLintCore/Extensions/Request+SwiftLint.swift | SourceKit disable switch | 0.65.1 | `SWIFTLINT_DISABLE_SOURCEKIT`, compile-time and runtime |
| https://raw.githubusercontent.com/realm/SwiftLint/0.65.1/CHANGELOG.md | SwiftLint changelog | through 0.65.1 | `excluded_match_kinds` (0.40.2), `--disable-sourcekit` (0.63.1) |
| https://github.com/realm/SwiftLint/releases/tag/0.65.1 | 0.65.1 release and its assets | 2026-08-21 | Which artifacts exist (`swiftlint_linux_*.zip`, image) |
| https://github.com/google/sanitizers/wiki/ThreadSanitizerSuppressions | TSan suppression file format and types | maintained wiki (edited 2026-08) | `race`, `race_top`, `called_from_lib`; what strings are matched |
| https://github.com/google/sanitizers/wiki/ThreadSanitizerFlags | TSan runtime flags | maintained wiki | `halt_on_error` and the flag catalogue |
| https://raw.githubusercontent.com/llvm/llvm-project/main/compiler-rt/lib/tsan/rtl/tsan_flags.inc | TSan flag definitions | main, 2026-10 | `ignore_noninstrumented_modules` default false on Linux, `report_atomic_races`, `force_seq_cst_atomics` |
| https://swift.org/blog/tsan-support-on-linux/ | swift.org post: Thread Sanitizer for Swift on Linux | 2019-08-13 (Swift 5.1) | Flags, "tests need to exercise multithreaded code", mangled symbols |
| https://forums.swift.org/t/threadsanitizer-in-a-swift-concurrency-world/84801 | Swift Forums thread on TSan, Concurrency and Mutex | 2026-02-18 to 21 | Current anecdotal state; no workaround offered; compiler issue #86265 |
| https://git-scm.com/docs/git-diff | git-diff manual | git 2.53 era | `--merge-base`, `--diff-filter`, `-z` |
| https://github.com/apple/swift-protobuf/blob/6c84c3dedac0/.github/workflows/build.yml | swift-protobuf CI (TSan/ASan matrix, swift format lint) | 2026-10 (sha 6c84c3dedac0) | A gating TSan job in a corpus repository |
| https://github.com/apple/swift-log/blob/4038b6a4f74a/Package.swift | swift-log manifest (`-Xfrontend -require-explicit-sendable`) | 2026-10 (sha 4038b6a4f74a) | The flag form that cannot fail |
| https://github.com/apple/swift-log/blob/4038b6a4f74a/.github/workflows/main.yml | swift-log CI arguments | 2026-10 | The no-op `-Xswiftc -require-explicit-sendable` in CI |
| https://github.com/swift-server/async-http-client/blob/017115279d09/Package.swift | async-http-client manifest | 2026-10 (sha 017115279d09) | `unsafeFlags` with `-warnings-as-errors` that still exits 0 |
| https://github.com/swiftlang/swift-testing/blob/c7d68ca20cd7/Package.swift | swift-testing manifest | 2026-10 (sha c7d68ca20cd7) | `.treatWarning("ExplicitSendable", as: .warning)` and the dependency-warning note |
