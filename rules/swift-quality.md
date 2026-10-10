---
paths:
  - "**/*.swift"
summary: The Swift quality index, holding the gate, the non-negotiables, the SW-CORE rules, and where the depth lives
keywords: swift,swiftpm,quality,concurrency,sendable,errors,testing,cli,subprocess,networking,security,swiftui
license: Apache-2.0
repository: https://github.com/ocx-sh/grimoire-lore
---

# Swift Quality

Traps, not tutorials. Every line names a mistake generated Swift makes by default.
The language, the standard library and SwiftUI are already in the model, and a
codebase's architecture is discoverable by reading it, so neither is in this file.

Contents: [The Gate](#the-gate) · [Non-Negotiables](#non-negotiables) ·
[Rules This File Owns](#rules-this-file-owns) ·
[Where the Depth Is](#where-the-depth-is) · [Severity](#severity) ·
[Siblings](#siblings)

**Before trusting any rule below, read the manifest in effect (SW-PKG-06) and
compile any API a source only names (SW-LANG-05).** This rule installs with
`paths: ["**/*.swift"]` and loads on every Swift source edit and on nothing else.
It ships beside `swift-package` in the `swift-essentials` bundle, and that rule
owns the manifest, the lint and format configs and the release builds. Binds to
Swift 6.4.0 (current), Swift 6.3.3 (previous) and the `swift:6.2.0` floor leg
for libraries and the SDK (pinned default, verify the patch per tree, SW-GATE-25), measured 2026-10-10 on Linux x86_64. macOS, Xcode,
Windows and Wasm rows are `unverified: read only`. "The SDK" is a library that
wraps the project's CLI binary, a pinned default the adopter renames or drops.

## The Gate

Run it after every change, from the repository root, cheapest step first, and
stop at the first non-zero exit. SW-GATE-01 owns the block and its depth, and
steps 4 and 5 bind libraries and the SDK only. Step 1 rewrites and stages files (and the checks mark new files with `git add -N`), so a local run on a tree with uncommitted work happens in a `git worktree` copy, and a clean CI checkout omits the `git add`. `BASE` needs
the merge target in history: use `fetch-depth: 0` in CI and rename `origin/main`. A step already red at `BASE` on an adopted repository (postgres-nio's `-warnings-as-errors` build fails on first-party code at its main commit) is not a regression: run steps 2 and 3 once on `BASE` first, record the red ones in the receipt (SW-CORE-04), and count a step as a regression only when its diagnostics differ from the base's.

```sh
CHECKS=.claude/rules/swift-quality/checks    # pinned default: where this rule's checks/ directory is installed
git add -A -- '*.swift' \
  && git ls-files -z --cached --others --exclude-standard -- '*.swift' | xargs -r -0 swift format format --parallel --in-place \
  && git ls-files -z --cached --others --exclude-standard -- '*.swift' | xargs -r -0 swift format lint --strict --parallel \
  && git diff --exit-code -- '*.swift'    # 1 SW-GATE-02. 123 = a finding behind xargs
BASE=origin/main bash "$CHECKS/never-gate.sh"    # 1b SW-GATE-28. Adopted repositories whose config keeps Never* off. Skip it in a new repository
BASE=origin/main bash "$CHECKS/k07.sh"           # 1c SW-GATE-10. Any output line is a violation. A new repository drops BASE= (whole tree)
swift build -Xswiftc -warnings-as-errors         # 2 SW-GATE-13. Add --force-resolved-versions to 2 and 3 when Package.resolved is tracked. Exit 0 does not cover a .v5 target on 6.4: run mode5-warnings (gates.md SW-GATE-13)
env SWIFT_TESTING_XCTEST_INTEROP_MODE=complete swift test -Xswiftc -warnings-as-errors    # 3 SW-TEST-10
swift package diagnose-api-breaking-changes "$BASELINE"    # 4 SW-GATE-20
if DOCC=1 swift package plugin --list | grep -q generate-documentation; then DOCC=1 swift package plugin generate-documentation --target "$DOCC_TARGET" --warnings-as-errors --analyze; else echo 'SKIP 5: no docc plugin declared'; fi    # 5 SW-GATE-21. A SKIP is not a pass, it is a missing dependency
```

Gate on each step's exit status and never on its stdout. A task is done when a
command, its exit code and the tree it ran against are all named. Narration is
not evidence.

## Non-Negotiables

Every line below blocks a merge within the scope it names. IDs resolve through
[Where the Depth Is](#where-the-depth-is), where each rule carries its rationale
and verification. SW-PKG, SW-GATE and SW-REL live in the `swift-package` rule.

| # | Rule | ID |
|---|---|---|
| 1 | Never reach green by weakening the check without a one-line written reason per weakened item in the pull request (a `.v5` opt-out, `@preconcurrency`, a lint suppression, a dropped `-warnings-as-errors`, `--strict` or sanitizer step). Never trust a check nobody watched go red, or an empty result before a canary proves the operand non-empty. | SW-CORE-01, SW-CORE-02, SW-CORE-03 |
| 2 | A change is done only when every applicable step of the gate block exits 0 on the tree you changed. Name the command, the exit code and the tree. | SW-GATE-01 |
| 3 | CI builds and tests with `-Xswiftc -warnings-as-errors` on every release-toolchain leg. | SW-GATE-13 |
| 4 | Read the manifest in effect before editing one, because a `Package@swift-*.swift` file shadows `Package.swift`, and prove the edit landed with the `dump-package` count. Never `head -1 Package.swift`. | SW-PKG-06, SW-CORE-04 |
| 5 | Build every library, SDK, CLI and server target on Linux at the floor and the current toolchain. Guard a capability with `#if canImport(X)` and import libc only through the `canImport` chain. | SW-LANG-01, SW-LANG-02 |
| 6 | Compile any API, attribute or flag that a release note, blog or earlier table names before writing it into code, a rule or a skill. | SW-LANG-05 |
| 7 | `@unchecked Sendable` only when deleting it breaks the build, a guard is visible in the type body and a comment names the guard. | SW-CONC-01 |
| 8 | Every unstructured `Task {}` is stored and cancelled on its owner's shutdown path, returned or awaited, or is a commented fire-and-forget bridge, in a library, SDK, CLI or server. | SW-CONC-13 |
| 9 | Use checked continuations, resume each exactly once on every path and outside any lock, and wrap external waits in `withTaskCancellationHandler`. | SW-CONC-22 |
| 10 | Cleanup that awaits and must survive cancellation runs inside `withTaskCancellationShield` on 6.4, with the pinned fallback below it. | SW-CONC-32 |
| 11 | Validate input from outside the process by throwing. `precondition`, `assert` and `fatalError` never guard it. | SW-ERR-14 |
| 12 | In a library or SDK, import with the access level the declaration needs, and write `public import M` only where a type of M is in a public signature. | SW-API-01 |
| 13 | A diff adds no test file that imports XCTest. New tests are Swift Testing. | SW-TEST-01 |
| 14 | A sleep is never how a test waits on a line a diff adds. Wait for the event and time out with `.timeLimit`. | SW-TEST-03 |
| 15 | No test mutates process-global state (`setenv`, `chdir`, `umask`). Pass the value in. | SW-TEST-18 |
| 16 | The root is an `@main` `AsyncParsableCommand` and nothing throws out of an entry point uncaught. | SW-CLI-02 |
| 17 | End a successful run with a checked `stdout` flush that returns `Status.io` (74) on failure, and count EPIPE as success. | SW-CLI-09 |
| 18 | Spawn processes with swift-subprocess. `Foundation.Process` appears only in commented legacy code. | SW-IO-05 |
| 19 | Write durable state through the one atomic-write helper, never `.atomic` or `replaceItemAt` directly. | SW-IO-09 |
| 20 | A redirect target never receives a credential. Send authenticated requests through AsyncHTTPClient with `redirectConfiguration` set. | SW-NET-03 |
| 21 | Every recursive parser over untrusted input carries a `depth` parameter (default 64) and throws a typed error past it. | SW-SEC-01 |
| 22 | Hold a credential in a `Secret` type with a fixed `description`, no `Codable` and `reveal()` as the one egress. | SW-SEC-13 |
| 23 | An upgrade adds no hatch, judged by the added-lines delta against the baseline commit. | SW-CORE-10 |
| 24 | Classify a runtime failure by exit code plus the first message line, and never make a symptom stop by changing the measurement. | SW-CORE-16, SW-CORE-17 |

## Rules This File Owns

The SW-CORE family is defined here and nowhere else. Every other family is
defined in a depth file and only cited here. The scripts sit in
`.claude/rules/swift-quality/checks/` (`weaken-check.sh`, `canary.sh`,
`generated-touch.sh`, `silence-check.sh`, `fold-check.sh`, `k07.sh`,
`never-gate.sh`, `swiftlint-gate.sh`, `tsan-check.sh`, plus the Apple oracle
files that `apple.md` names). Run each from the repository root.

SW-CORE-07 and SW-CORE-08 are retired, not reused.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-CORE-01 | A change that turns a red check green by weakening it carries a one-line written reason per weakened item in the pull request. Weakening is a `.v5` opt-out (any added `.v5` token, a helper spelling included), `@preconcurrency`, `@diagnose` set to ignored or warning, `-Wwarning`, `-suppress-warnings`, a linter or formatter suppression, a removed `-warnings-as-errors`, `-warn-long-expression-type-checking`, `-Werror`, sanitizer, `--strict`, `--force-resolved-versions` or API-breakage step (in a workflow, Make, Just, Rake, shell, TOML or container file, or a `.treatWarning`, `.treatAllWarnings` or `.strictMemorySafety()` in a manifest; an extensionless script is read by eye), a raised `timeout-minutes`, `SWIFT_BACKTRACE=enable=no`, `try? await`, or a `.disabled()` or `XCTSkip` test. An edit to `.swift-format`, `.swiftlint.yml`, `.swiftformat`, `.swift-format-ignore` or `.swift-version` is named for review. | It is the cheapest way to go green and no compiler flag sees it. SW-GATE-12 lists only the gate-specific extras. | `BASE=origin/main bash .claude/rules/swift-quality/checks/weaken-check.sh`: every printed line needs its reason, empty output is the pass, exit 64 is BASE unset and 66 is BASE unresolved. Watched red (8 lines) and green (0) on a planted change, and red on a raised `timeout-minutes`, on `[.v6, .v5]`, on `swiftLanguageVersions: [.v5]`, on a helper `swiftSettings(.v5)`, on a removed gate step in `rakelib/*.rake`, `GNUmakefile`, `justfile` or `Rakefile.gate`, on a removed manifest `.treatAllWarnings` and on `enable=no` in a new `Dockerfile.ci`, `Containerfile`, `.env` or `.service` (measured 2026-10-10). | MUST |
| SW-CORE-02 | Run every new check (grep, awk, script, lint rule, CI step, compiler flag) once on a planted violation and once on its compliant twin before relying on it, in a fixture directory outside the repository under test. The pull request quotes both results as exit code and printed-line count. A check never seen red is a hypothesis. | A first regex form dropped a line, an `import ` canary failed a valid tree, and an unanchored marker matched template text. Each surfaced only because a plant was run. | Reading heuristic: the pull request holds one plant result and one twin result per added check, and the fixture path is outside the repository. Not machine-checkable. | MUST |
| SW-CORE-03 | Trust no empty result until the operand is proven non-empty. Run the canary before every grep, find and awk gate: it exits 1 when no Swift file sits below the scanned root. Run it as its own step, so a failed canary stops the gate. Search for manifests the same way, because a `Package*.swift` search that prints no path is a wrong root. A symlinked `Sources` is part of the operand: every cell with a `Sources` operand reads it with `grep -R` or `find -L`, and the canary counts files the same way. | A grep over the wrong directory exits 1 with no output, the same as a clean tree. The canary proves non-empty and not the right root, so run it from `git rev-parse --show-toplevel`. The `find` form is deliberate, since an `import ` grep exits 1 on a valid tree whose files import nothing. | `bash .claude/rules/swift-quality/checks/canary.sh`: exit 0 with no output is the pass, exit 1 with `CANARY: no Swift file scanned` on stderr is the finding. Watched red on an empty tree, a wrong root and a `Sources` of dangling symlinks, green on a stdlib-only tree and on a `Sources` of live file symlinks, where `grep -r` saw 1 of RxSwift's 412 files and `grep -R` saw all of them (measured 2026-10-10). | MUST |
| SW-CORE-04 | Before the first edit run the SW-PKG-06 floor command and record in the receipt `swift --version`, `.swift-version`, the tools version, the language mode and feature names, a clean tree, a green build, the warning count and the SW-GATE-10 hatch count. After every tool that edits a manifest (`swift package migrate`, `add-setting`) run `dump-package-count` with the feature just enabled and require at least 1. | A `Package@swift-X.swift` file shadows `Package.swift` (SW-PKG-21), so `migrate` edited the dead file, exited 0, rewrote sources, built green and enabled nothing. | `dump-package-count` below: 0 is the finding. Watched on Swift 6.4.0 and 6.3.3 (measured 2026-10-10): 0 on the shadowed fixture, 1 on the control. | MUST |
| SW-CORE-05 | Regenerate generated Swift from its spec and commit it with the spec, never edit it by hand. A file is generated when its path matches `*.pb.swift`, `*.grpc.swift`, `*.generated.swift`, `*+Generated.swift` or a `Generated/` or `generated/` directory, or when a line in its first 40 starts at column 0 with `//` and says DO NOT EDIT, automatically generated, AUTO-GENERATED or Generated file, by or using. A repository with codegen should regenerate in CI and fail on `git diff --exit-code` (SHOULD). | A hand edit is overwritten by the next run. Path alone misses 120 of 450 marker files in a 19-repository corpus (measured 2026-10-10), and an indented marker is template text. | `BASE=origin/main bash .claude/rules/swift-quality/checks/generated-touch.sh`: each printed line needs "regenerated by COMMAND" in the pull request, empty output is the pass, exit 64 is BASE unset and 66 is BASE unresolved. Watched red (4 files) and green (0) on a planted change (measured 2026-10-10). | MUST |
| SW-CORE-06 | The K-07 tell scan skips generated files and uses the `find` canary of SW-CORE-03. The shipped `k07.sh` carries both edits (a `GEN` exclusion on the pattern set, the suppression grep and the hatch pathspecs). | `swift-format-ignore` sits in the banner of every generated protobuf file, so a regeneration commit is red for a reason no author can remove. swift-protobuf printed 507 raw hits and 7 after exclusion (measured 2026-10-10). | `bash .claude/rules/swift-quality/checks/k07.sh` on a generated-only change: exit 0 with no output is the pass (a scan fails by exit status, so a git warning about a symlinked `.gitignore` stays visible and does not fail the run). Watched with the original script at 4 lines and the amended script at 1 on a hand-written hatch beside generated ones (measured 2026-10-10). | SHOULD |
| SW-CORE-09 | Derive one toolchain pin in the CI test matrix. `.swift-version` holds the exact patch and the primary leg's image tag is read from it. A literal `swift:` tag appears only on a leg that exists to test that version (the floor, a nightly). Release jobs and shipped `Dockerfile*` keep the literal that SW-REL-01 requires, and the format step follows SW-GATE-08. | A bump is one edit, and a floating `swift:6.3` cannot split legs. | `pin-grep` below in a repository with `.swift-version`: review each hit, where a deliberate leg or an SW-REL-01 literal passes and anything else is the finding. A reusable-workflow input list (`linux_swift_versions: '["6.2", "6.3", "6.4"]'`, which SW-GATE-24 requires) is a leg too: the grep prints it, and read each version in it by hand. Watched red (1 line beside `FROM swift:6.1-jammy`) and green (0) (measured 2026-10-10); a planted `pr.yml` with `linux_swift_versions` prints 1 line where the old grep printed 0 (measured 2026-10-10). | SHOULD |
| SW-CORE-10 | An upgrade adds no hatch. Resolve each Sendable or isolation diagnostic at the highest applicable rung of SW-CONC-28 and judge the result by the added-lines delta against the baseline commit. On an adopted tree the SW-GATE-10 whole-tree pass is the wrong receipt, because it prints the legacy hatches before and after. | The lazy twin built green in Swift 6 mode with 13 added hatch lines, indistinguishable to the compiler. The ladder tree added 0. | `hatch-delta` below: output is the violation and each surviving line needs the SW-GATE-10 justification or a lower rung. Watched red (13 lines) and green (0) (measured 2026-10-10). | MUST |
| SW-CORE-11 | Upgrade in this order and run the probes before editing. Baseline (SW-CORE-04), then the manifest floor, shared loop and `StrictLanguageFeatures` guard (SW-PKG-11, SW-PKG-18, SW-PKG-02), then probes with flags only and none committed, then only the feature names with a non-zero delta, then the ladder (SW-CORE-10), then the flip in the commit that removes the 5-mode lines (SW-PKG-03, SW-PKG-14), then the flip's other warnings. Done when `-Xswiftc -warnings-as-errors` exits 0 on the current and the floor toolchain (SW-GATE-13). | The flip surfaced 5 warnings that complete checking never showed. Warning counts were 1 at baseline, 13 under complete checking, 6 after the flip and 0 at the end. | The per-step counts in the receipt, `flag-grep` below (empty output is the pass), and the typo guard that fails a misspelt feature name (exit 1 with the guard, 0 without). Watched on Swift 6.4.0 and 6.3.3 (measured 2026-10-10). | SHOULD |
| SW-CORE-12 | Adopt post-6 features one at a time with `swift package migrate --target T --to-feature NAME`, only for the five migratable names (`ExistentialAny`, `InferIsolatedConformances`, `MemberImportVisibility`, `NonisolatedNonsendingByDefault`, `StrictMemorySafety`), from a clean tree and a green build, once per feature. Read `git diff`, then re-gate with `-Xswiftc -warnings-as-errors` on the current and the floor toolchain. | The flag is `--target` and `--targets` exits 64. Other names exit 64 as not migratable, a dirty tree exits 0 with mixed edits, and a second run appends a second literal. On 6.4 a `@concurrent` fix-it adds deprecation warnings that turn the gate red while 6.3 stays green. | `targets-grep` below (empty output is the pass), `git status --porcelain` empty before each run, and the re-gate exits 0 on both toolchains. Watched on Swift 6.4.0 and 6.3.3 (measured 2026-10-10). | SHOULD |
| SW-CORE-13 | After `migrate`, fold the per-target `enableUpcomingFeature` literals into the shared `for target in package.targets` loop (SW-PKG-18). No `enableUpcomingFeature` call stays outside it. | `migrate` never edits the loop, so the two drift. A grep for `swiftSettings: [` over-matches legitimate settings, so the check reads the loop boundary. | `cd PACKAGE_ROOT && bash .claude/rules/swift-quality/checks/fold-check.sh`: each printed `file:line: text` is a literal outside the loop, empty output with exit 0 is the pass, exit 66 is no `Package.swift` or `Package@swift-*.swift` below the directory. A manifest with one shared top-level `swiftSettings` array also prints: justify it in the pull request. Watched red (12 literals) and green (0) (measured 2026-10-10). | SHOULD |
| SW-CORE-14 | At every toolchain or SwiftPM bump run the four dated probes. Each must still fail with its pinned message, and a probe that compiles is FLIPPED and means the cited rules are stale. They are `withDeadline` (SE-0526, SW-CONC-24), `defaultSwiftSettings:` (SE-0540, SW-PKG-01, SW-PKG-18), stdlib `FilePath` (SE-0529, SW-IO-01) and a typed-throws `Task` closure in Swift 6 mode (a frontend crash, SW-CONC-03). Also re-read the swift-syntax tag list (SW-PKG-10). | The three proposals are accepted with modifications and not shipped, and the fourth crashes the compiler. Code written from proposal text does not build. | The four three-line probe packages are the script in the `swift-upgrade` skill's dated-rechecks reference (U10.1 to U10.3), and a copy that prints FLIPPED is the finding. Per probe package `swift build` exits 1 with `cannot find 'withDeadline' in scope`, `extra argument 'defaultSwiftSettings' in call`, `cannot find type 'FilePath' in scope` or `Please submit a bug report`, and the twin `Task { throw E() }` compiles. Watched STILL on Swift 6.4.0 and 6.3.3 (measured 2026-10-10). | SHOULD |
| SW-CORE-15 | Stop and report instead of adding a hatch when a stop condition fires. S1 the errors sit in a dependency you do not own. S2 the applicable rung needs an API above the platform or tools floor (`Mutex` below the OS that ships `Synchronization`, `weak let` below 6.3, `sending` below 6.0). A rung that has a named older-floor shape is no stop: a lock below that OS is the one `Locked` wrapper of SW-APPLE-04, and where no such shape is named S2 applies. S3 a diagnostic reproduces as a frontend crash. S4 a fix-it changes public async signatures. S5 two consecutive classes leave the count unchanged or higher. S6 the re-gate differs between the current and the floor toolchain, so report both and add no `#if compiler` split to make one leg green (the `SW-LANG-04` guard of a newer syntax form stays). | Each is the point where the lazy twin's shortcut becomes the only way to green. | Reading heuristic: the receipt names the condition and the diagnostics left. No run. | SHOULD |
| SW-CORE-16 | Classify a failure by exit code and the first message line together, never by the code alone. 132 covers six causes (`Precondition failed`, or `precondition failure` in release, `Unexpectedly found nil`, `Error raised at top level`, `tried to resume its continuation more than once`, `Swift runtime failure` for overflow, other `Fatal error`). 134 covers two (`double free`, `corrupted`, `invalid pointer` or `malloc(): ` against a plain abort), 139 two (one frame repeated 20 or more times against `Bad pointer dereference at 0x0000000000000000`) and 124 four (SW-CORE-19). Exit 0 with `Program crashed:` on stderr is a trap on a non-main thread after main had already exited normally: rerun the same input with `SWIFT_BACKTRACE=enable=no` and expect 132. 137, 141 and 143 mean no backtrace exists and the cause is outside the program (SIGKILL, a closed reader per SW-CLI-08, an unhandled SIGTERM). 124 is `timeout`'s own code for any signal it sent. In a release build match `Swift runtime failure` and read frame 0's `file:line`. | The code alone sends six causes down one branch. The first line separates them, and a release build drops the precondition text. | The `swift-diagnose` skill's crash-signature table replays the symptom matrix. Watched: 17 of 17 debug and 7 of 7 release failures routed right on Swift 6.4.0 and 6.3.3, against 11 of 17 and 5 of 7 wrong for exit code alone (measured 2026-10-10). The 132 rows are measured on Linux x86_64, arm64 `133` and macOS are `unverified: read only`. | MUST |
| SW-CORE-17 | A diagnosis fix never makes the symptom stop by changing the measurement. No added `Task.sleep`, `Thread.sleep`, clock `.sleep(for:)`, libc `sleep`, `usleep`, `nanosleep` or `asyncAfter`, empty `catch`, raised `timeout`, `try?` around the failing call, `nonisolated(unsafe)`, `@unchecked Sendable` or a force cast to quiet TSan or the type checker, a raised solver threshold, and none of the gate items of SW-CORE-01 and SW-GATE-12. Accept the fix only when the same measurement that showed the fault now clears and nothing else changed. | Each of those makes the next run green. SW-CORE-01 covers gate and config weakening (it owns the single list), and this covers code and timing edits in the fix diff (SW-TEST-03, SW-CONC-09, SW-CONC-17). | `BASE=COMMIT_BEFORE_THE_FIX bash .claude/rules/swift-quality/checks/silence-check.sh`, then `weaken-check.sh` on the same fix: output is the violation, empty output is the pass, exit 64 is BASE unset and 66 is BASE unresolved. Watched red (3 lines, and 6 from `weaken-check.sh`) and green (0 and 0 on the cancellation fix), and red on an added `@unchecked Sendable`, `as!`, solver threshold, TSan suppression, `ContinuousClock().sleep(for:)`, `sleep(1)`, `nanosleep`, `asyncAfter` and an empty `catch` (measured 2026-10-10). | MUST |
| SW-CORE-18 | Capture a hang before killing it. Keep the backtracer on (unset `SWIFT_BACKTRACE`, or `enable=yes,interactive=no,color=no`) and never write `enable=no` (or `false`, `off`, `0`, at any place in the comma list) in a Dockerfile, unit, CI, justfile, mise.toml, `.env` or devcontainer.json file of a process you will diagnose, except as a per-command prefix in a test that asserts a trap's exit code (SW-CONC-34, SW-CONC-26). Start the target under job control (`set -m`) and confirm the `SigIgn` mask has bits 0x6 clear before relying on a signal. `kill -QUIT` prints every thread and the process survives. Read every thread, then `kill -KILL` last. Under `swift test` signal the test runner binary, never `swift-test`. | A bare `&` in a non-interactive shell leaves SIGINT and SIGQUIT ignored (`SigIgn` 0x6, 0 under `set -m`), and the runtime installs no handler for an ignored signal. `enable=no` turns SIGQUIT back into a kill (exit 131) and shrinks a segfault's 52-line report to 0 lines. | `backtrace-grep` below (empty output is the pass). At the process the `SigIgn` line of its `/proc` status shows 0x6 clear, stderr holds `Signal 3: Backtracing` and `kill -0` still succeeds. Watched on Swift 6.4.0 and 6.3.3 Linux (measured 2026-10-10), macOS is `unverified: read only`. | SHOULD |
| SW-CORE-19 | Exit 0 with output that differs between two runs is a race suspect: build with `--sanitize=thread` (Docker needs `--security-opt seccomp=unconfined`). A TSan binary run directly exits 66 by default, and `swift test` wraps it and exits 1. Read the report kind first. A `ThreadSanitizer: data race` line is a race, and a `Swift access race` line alone on `Mutex`-guarded code is the known false positive, confirmed by an exact result over five plain runs. For exit 124 branch on the `leaked its continuation` line (SW-CONC-22), then CPU at or above 50 percent (spin), then a `_dispatch_sema4_wait`, `pthread_cond_wait` or `futex_wait` frame with a frame of your module below it in the SIGQUIT dump (SW-CONC-15), else idle with no user frame (a lost wakeup, SW-CONC-22). The CI job is SW-GATE-27. | A race plant printed `data race` 2 and `Swift access race` 4 with five different counts. A correct `Mutex` printed `data race` 0, `Swift access race` 2 and `count=200000` every run, with exit 66 on both toolchains. | Reading heuristic over the report text, with the counts as the worked example (Swift 6.4.0 and 6.3.3 Linux, measured 2026-10-10). | SHOULD |
| SW-CORE-20 | On `unable to type-check this expression in reasonable time`, split the expression and read the first real error before changing anything else, and never raise a solver limit. Fix by annotating a type or using a struct. The gate and its limit (200) are SW-LANG-07. | The message hid a `Double` plus `Float` error that took 4.9 s and 3.5 s to fail with it and 0.8 s and 0.7 s once split. The gate is wall-clock, so a loaded runner can flap an expression near the limit. | Reading heuristic: the split build reproduces the real error, and the SW-LANG-07 build command exits 0 afterwards. In a manifest the flags are `unsafeFlags` (SW-PKG-04, root package only). Watched on Swift 6.4.0 and 6.3.3 (measured 2026-10-10). | SHOULD |
| SW-CORE-21 | Every diagnose or upgrade run starts with consent and ends with a receipt, and a release run ends with one. The receipt holds the symptom in the reporter's words, the build identity (`swift --version`, the configuration, `echo "$SWIFT_BACKTRACE"`), the root cause with the toolchain version, verbatim evidence (two readings when a fix was applied), the fix with its rule ID or a named gap, and every rule ID relied on. A release receipt swaps the symptom, root cause and fix for the request, the findings, the unverified items and where the run stopped (the `swift-release` skill lists its fields). On a process the operator named, `kill -QUIT` is non-destructive, `kill -KILL` destroys it, a `SWIFT_BACKTRACE` change needs a restart and a TSan or release rebuild is a different binary. On production print the command and its cost and stop without consent. | A fix without both readings is a claim, and a diagnosis that kills the process destroys the evidence. | Reading heuristic: the closing message holds all six receipt fields, and a destructive step was preceded by a consent. No run. | SHOULD |

The named checks the rule cells cite, run from the repository root (a package
root where it says so). Each one's output is the violation unless it says
otherwise.

```sh
BASE=origin/main   # the branch this change merges into, rename it
# dump-package-count (SW-CORE-04): rename the feature just enabled. 0 is the finding.
swift package dump-package | grep -c '"ExistentialAny"'
# Every grep below skips --exclude-dir=.claude and .agents, the installed rule set itself.
# pin-grep (SW-CORE-09): a bump-time inventory, only in a repository with .swift-version.
[ -f .swift-version ] && grep -Rn -e 'swift:[0-9]' -e 'swift_versions:' -e 'swift_version:' --include='*.yml' --include='*.yaml' --include='Dockerfile*' --exclude-dir=.build --exclude-dir=.git --exclude-dir=.claude --exclude-dir=.agents .
# hatch-delta (SW-CORE-10): hatches on added lines only, the libc @preconcurrency import chain of SW-CONC-10 skipped. git add -N stages intent-to-add, no content.
git rev-parse --verify --quiet "${BASE}^{commit}" > /dev/null || echo "hatch-delta: BASE does not resolve: $BASE, the empty output below is not a pass" >&2
git add -N . && git diff -U0 --merge-base "$BASE" -- '*.swift' | awk '/^\+[^+]/ && /@unchecked[[:space:]]+Sendable|nonisolated\(unsafe\)|Task\.detached|@preconcurrency|MainActor\.assumeIsolated|MainActor\.run/ && !/^\+[[:space:]]*(@[A-Za-z_]+[[:space:]]+)*@preconcurrency[[:space:]]+((public|package|internal|private|fileprivate)[[:space:]]+)?import[[:space:]]+((struct|class|enum|func|var|let|typealias|protocol)[[:space:]]+)?(Glibc|Musl|WASILibc|Android|Bionic|Darwin|CRT|WinSDK|Dispatch|EmscriptenLibc)([.[:space:]]|$)/'
# flag-grep (SW-CORE-11): probe flags are never committed. Empty output is the pass. Modes 5 and 6 only: a legacy `-swift-version 3|4|4.2` leg on an old container is not a probe.
grep -REn -e '-swift-version[^0-9]*[56]([^0-9.]|$)' --include='*.yml' --include='*.sh' --include='Makefile' --include='Package*.swift' --include='*.xcconfig' --exclude-dir=.build --exclude-dir=.git --exclude-dir=.claude --exclude-dir=.agents .
# targets-grep (SW-CORE-12): the flag is --target. Empty output is the pass.
grep -Rn -e 'migrate --targets' --include='*.sh' --include='*.md' --include='*.yml' --exclude-dir=.build --exclude-dir=.git --exclude-dir=.claude --exclude-dir=.agents .
# backtrace-grep (SW-CORE-18): empty output is the pass.
grep -REn -e 'SWIFT_BACKTRACE.*enable[=: "]*(no|false|off|0)([^[:alnum:]_]|$)' --include='*Dockerfile*' --include='*Containerfile*' --include='*.service' --include='*.yml' --include='*.yaml' --include='*.sh' --include='*akefile*' --include='*[Jj]ustfile' --include='*.toml' --include='*.json' --include='*.env' --include='.env*' --exclude-dir=.build --exclude-dir=.git --exclude-dir=.claude --exclude-dir=.agents . | grep -v -E '^[^:]+:[0-9]+:[[:space:]]*(#|//)'
```

## Where the Depth Is

Read the file for the work you are about to do, not for the topic it is filed
under. One level deep: these files do not point at each other.

| Doing… | Read |
|---|---|
| Building for Linux and the floor toolchain, guarding an Apple-only import or a libc import, using an API a blog or release note named, choosing an existential, capturing `self`, hitting the type-check limit, or using `~Copyable` or a newer syntax form | [swift-quality/language.md](swift-quality/language.md) |
| Adding `@unchecked Sendable`, `nonisolated(unsafe)` or `@preconcurrency`, choosing a `Mutex`, actor or `@MainActor`, starting or cancelling a `Task`, writing a continuation, blocking in async code, bounding a stream or accept loop, or cleaning up under cancellation | [swift-quality/concurrency.md](swift-quality/concurrency.md) |
| Declaring, throwing, wrapping, matching or printing an error, adopting typed throws, swallowing with `try?`, using `!`, `precondition`, `fatalError` or `assert`, or choosing which layer logs | [swift-quality/errors.md](swift-quality/errors.md) |
| Adding or changing a `public` or `package` declaration, an import access level, a public enum, a deprecation, a library logger or a protocol with one conformer, or building an SDK that wraps a CLI binary | [swift-quality/api-design.md](swift-quality/api-design.md) |
| Writing or reviewing a test, choosing Swift Testing or XCTest, waiting in a test, touching the environment or working directory, writing an exit test or a CLI harness, a fixture, a coverage gate or a sanitizer leg | [swift-quality/testing.md](swift-quality/testing.md) |
| Writing an `@main` command, choosing an exit code, wiring swift-argument-parser, writing to stdout or stderr, handling SIGPIPE or a signal, loading configuration, or prompting | [swift-quality/cli-contract.md](swift-quality/cli-contract.md) |
| Spawning a process, writing or replacing a file, building a content-addressed store, opening a path built from external input, extracting an archive, or encoding bytes that are hashed or compared | [swift-quality/io.md](swift-quality/io.md) |
| Making an HTTP request, choosing AsyncHTTPClient or `URLSession`, setting a timeout, proxy or CA trust, exchanging a bearer token, streaming or digest-checking a blob, retrying, or printing a network error | [swift-quality/network.md](swift-quality/network.md) |
| Parsing untrusted bytes or nested input, converting integers, using an unsafe pointer, holding or logging a credential, printing server text to a terminal, generating a token, or choosing a dependency's advisory floor | [swift-quality/security.md](swift-quality/security.md) |
| Editing Xcode build settings, an `.xcconfig` or a `project.pbxproj`, setting default isolation for an app target, a deployment floor or `#available`, or writing SwiftUI, Observation or Combine code | [swift-quality/apple.md](swift-quality/apple.md) |
| Editing `Package.swift` or a `Package@swift-*.swift` file, choosing a tools version or language mode, adding a dependency, or touching `Package.resolved` or `.swift-version` | `swift-package` (sibling rule: SW-PKG) |
| Changing `.swift-format`, `.swiftlint.yml` or a CI gate step, enabling warnings as errors, or wiring API-breakage, DocC, TSan or the K-07 scan | `swift-package` (sibling rule: SW-GATE in its gates depth) |
| Building, stamping, signing or tagging a release binary, or writing the static Linux SDK build, a release `Dockerfile` or an SBOM step | `swift-package` (sibling rule: SW-REL in its release depth) |
| Writing a `swift_*` Bazel target, configuring `rules_swift`, or bridging SwiftPM with `rules_swift_package_manager` | `bazel-quality` (sibling set: its `swift.md`, BZL-SWIFT) |
| Moving a package to Swift 6 mode or a new toolchain, diagnosing exit 132, 134 or 139, a hang, a race or a slow type-check, or cutting a release | the `swift-upgrade`, `swift-diagnose` and `swift-release` skills |
| Writing a doc comment, a DocC article, a README or a CHANGELOG | `code-docs` and `docs-quality` (sibling sets) |

## Severity

MUST = Block: fix before it lands. SHOULD = Warn: fix, or state why not in the
commit body. CONSIDER = Suggest: never blocks, never re-raised after a decline.

The owner defaults below encode an agreed decision rather than a derivable fact.
Each is a default an adopter may override once, in the manifest or the shared
config, never per file or call site. Overriding one is a recorded decision, and
re-arguing one in a pull request is not a review comment. Names that belong to
the reference fleet (`ocx`, `OCX_SDK_EXE`, `OcxSDK`) are examples an adopter renames.

- **Q1** Libraries and the SDK use tools 6.2 and an explicit Swift 6 mode, and CLIs and servers use the current release (6.4).
- **Q2** swift-format with the shipped `.swift-format` (4 spaces, 120 columns), and SwiftLint only as a `custom_rules` vehicle.
- **Q3** No `defaultIsolation(MainActor.self)` outside apps.
- **Q4** The SDK depends only on the standard library and swift-subprocess, with 100 percent line coverage on Linux.
- **Q5** The Apple depth file is read-only: greps and heuristics with no compile check, until a macOS runner exists.
- **Q6** The SDK maps a signal-killed child to 128+n.
- **Q7** Windows rows are `unverified: read only`.
- **Q8** The `BZL-SWIFT` depth file ships inside `bazel-quality` 0.4.0, framed as secondary.

## Siblings

- **`swift-package`**: what a package declares and what fails its build. It owns
  SW-PKG (tools version, language mode, dependencies, `Package.resolved`),
  SW-GATE (the gate block's depth, the `.swift-format` and `.swiftlint.yml`
  bodies, warning control, TSan, API-breakage, DocC) and SW-REL (release builds).
  It loads on the manifest and tool-config files, globs this rule does not cover,
  so a source edit never pays for them and a config edit always does.
- **`code-docs`**: comments and doc comments in every language. It already loads
  on `*.swift`, and its known gap is that it has no `_public` detector and no
  DocC tag handling (M-M-17).
- **`docs-quality`**: READMEs, guides and API reference pages. Its known gap is
  that its declaration example breaks `docc convert --warnings-as-errors` (M-M-18).
- **`bazel-quality`**: its `swift.md` depth file (BZL-SWIFT) covers `rules_swift`
  and the `rules_swift_package_manager` bridge, if you adopt Bazel for Swift. It
  carries only a never-matching glob and never loads on `*.swift`.
- **`swift-upgrade`, `swift-diagnose` and `swift-release`**: procedures that cite
  these IDs by number and never restate them. The `swift-essentials` bundle ships
  all of them together with `swift-package` and `code-docs`.
