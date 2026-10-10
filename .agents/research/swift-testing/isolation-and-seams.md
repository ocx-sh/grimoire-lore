---
title: "Swift testing: process-global state, SDK seams and recorded fixtures, coverage exclusion, NNBD on test targets"
topic: "swift / testing / isolation-and-seams (SW-TEST revision: new rules from SW-TEST-18; rows M-E-15, M-E-16, plus the unrowed test-environment question)"
agent: "testing/isolation-and-seams (wave 3)"
model: sonnet
date_researched: 2026-10-10
sources_count: 25
fixtures: "/home/mherwig/.cache/research-lang/swift-tools/fixtures/isolation-and-seams/"
scope: >
  Covers what a parallel Swift Testing run does to tests that mutate the process environment, working directory or umask,
  fixed temp paths, fixed ports and hash order; how an SDK wrapping a CLI gets a spawn seam and replays recorded stdout/stderr/exit
  fixtures; whether Swift on Linux can exclude a line or region from coverage; what NonisolatedNonsendingByDefault changes on a test target;
  mocking strategy and test layout (M-E-15, M-E-16). Linux only (swift:6.4 and swift:6.3 images): every Apple, Windows, Wasm and Android
  claim is "unverified: read only". Does not re-cover SW-TEST-01..17 beyond amendments, the SDK's public API (api/sdk-shape owns it), or the spawn module internals (SW-IO-24..27).
---

# Swift testing: isolation and seams (revision of swift-testing.md)

Dated 2026-10-10, Swift 6.4.0 era (prior line 6.3.3). Every run below was repeated on `swift:6.4` and `swift:6.3` (the images differ in glibc: 2.43 vs 2.39, which matters in section 1.2).

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   - 1 Process-global state under parallel Swift Testing
   - 2 What Swift Testing documents, and what `.serialized(for:)` is on 6.4
   - 3 Temp paths, ports and hash order
   - 4 The SDK spawn seam (M-E-15) and recorded fixtures
   - 5 Locating fixtures on Linux (`Bundle.module`, `.copy`, `#filePath`)
   - 6 Coverage exclusion (closes Q-T1)
   - 7 NonisolatedNonsendingByDefault on test targets
   - 8 Mocking strategy and test layout (M-E-15, M-E-16)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- `setenv`, `unsetenv`, `putenv`, `chdir` and `umask` in a `@Test` are process-global writes in a process that runs tests in parallel; the compiler accepts them with no diagnostic. Planted pairs went red 48/50 (env), 32/50 (cwd) and 30/30 (umask) on 6.4, and green 0/50, 0/50 and 0/30 when the value was injected (section 1).
- A setenv-versus-getenv race can crash the test process, not only flake: 6.3 (glibc 2.39) died with SIGSEGV in 54/60 and 40/40 runs of the planted pair; 6.4 (glibc 2.43) survived 100/100. That is a libc difference (glibc commit `7a61e7f557a9`, 2024-11-21), not a Swift guarantee; POSIX says `setenv` "need not be thread-safe".
- `@Suite(.serialized)` does not protect against another suite: two serialized suites still raced (50/50 red on 6.4, 49/50 on 6.3). The Swift Testing team's own pitch (2026-04-17) says so and proposes data-dependent serialization; it is unmerged.
- `.serialized(for:)` is `@_spi(Experimental)` in the 6.4.0 release tag and unreachable from a shipped toolchain: even `@_spi(Experimental) import Testing` fails to compile on 6.3 and 6.4 (`cannot call value of non-function type 'ParallelizationTrait'`). SW-TEST-08 stands, now with a compile proof.
- The three isolation tools that do work on 6.4 are: pass the value (`environment:`, `workingDirectory:` parameters), a hand-written `TestScoping` trait binding a `@TaskLocal` (50/50 green; the built-in `.taskLocal(_:withValue:)` is Swift 6.5-only), and an exit test, whose body runs in a child process (50/50 green).
- Fixed temp paths and fixed ports shared by two tests failed 50/50 and 30/30; `port 0` plus a per-test `UUID` directory failed 0/50. Dictionary-order assertions failed 28/30 on 6.4 and 30/30 on 6.3; `SWIFT_DETERMINISTIC_HASHING=1` makes the red deterministic (10/10) and is a triage tool, never the fix.
- The SDK's spawn seam is one closure-typed struct (or protocol) defined in the core module and implemented by exactly one spawn module; the default test run never spawns. With it, 25/25 core lines and 19/19 core regions are covered by seven recorded cases, no process started.
- Recorded fixtures are located with `resources: [.copy("Fixtures")]` and `Bundle.module`, never `#filePath` or a relative path: after the source tree moved, `Bundle.module` stayed green while `#filePath` and the relative path failed. `.process("Fixtures")` fails the build when two case directories hold a same-named file (`multiple resources named 'stdout'`).
- Each case is a directory of three byte-exact files (`stdout`, `stderr`, `exit`); an inventory test asserts the directory set equals the test table. Orphan fixture, row without recording, and recording without row all exit 1.
- A 100% line gate is blind to a deleted one-line `case` arm: removing the `usage-64` case left lines at 25/25 (exit 0) while regions fell to 18/19 (exit 123). The SDK gate checks lines and regions.
- There is no line- or region-level coverage exclusion for Swift on Linux. Four comment markers, `#sourceLocation`, `@_transparent` and `@_semantics` all left their functions counted; llvm-cov's own request ([llvm-project#33625](https://github.com/llvm/llvm-project/issues/33625)) is open and an inline-marker PR closed unmerged on 2026-06-13. The only exclusions are by file (jq prefix, `--ignore-filename-regex`) or by function name (jq allowlist of mangled names).
- Exclude code by structure: the Foundation `Process` adapter lives in its own file/target and is excluded by path; its error arms are not reachable (25/27 lines, 14/17 regions even with real-process tests).
- Test targets that call `nonisolated async` helpers from `@MainActor` tests need `NonisolatedNonsendingByDefault`: off, the helper trapped (`Actor.preconditionIsolated`, exit 1) and passing main-actor state failed to compile (`[#SendingRisksDataRace]`); on, both are green on 6.3 and 6.4. Plain nonisolated `@Test` functions have no caller actor to inherit; only `@MainActor` tests differ. Spell the feature name; do not copy the template's `ApproachableConcurrency`.
- SDK contract tests use a plain `import`, not `@testable import`: the same code with `@testable` compiled and passed (exit 0) while the public type had no public `init`; with plain `import` it failed to compile (exit 1).
- Mocking is hand-written fakes behind the seam: 174 files in 9 of 40 corpus repos declare `Mock*` types, only tuist uses a mock macro (231 `@Mockable` files).
- Never mirror `ocx-sdk-python`'s `monkeypatch.setenv` (22 uses): pytest runs tests serially and restores for you; Swift Testing runs them in parallel and restores nothing.

## Findings

### 1 Process-global state under parallel Swift Testing

**1.1 The hazard class.** Swift Testing runs tests concurrently in one process by default ([Parallelization.md:14-20](https://github.com/swiftlang/swift-testing/blob/main/Sources/Testing/Testing.docc/Parallelization.md); `swift-testing@c7d68ca20cd7:Sources/Testing/Testing.docc/Parallelization.md:13-20`). The environment block, the working directory and the umask belong to the process, so a write by one test is visible to every other running test. No compiler flag flags them: the planted fixtures built clean under `-swift-version 6` on 6.3 and 6.4 (no `unsafe` marker as Rust's `env::set_var` now has; the Rust rule `TEST-05` has a compiler-visible reason, the Swift one does not).

**1.2 Measured: flake and crash.** Fixtures under `fixtures/isolation-and-seams/`. Each cell is "runs that exited non-zero / runs", one build then `swift test --skip-build` in a loop inside one container (`loop.sh`).

| Plant (red) | 6.4 | 6.3 | Compliant twin | 6.4 | 6.3 |
|---|---|---|---|---|---|
| `env-red`: two tests `setenv("FX_ENDPOINT")` different values, a third expects the default | 48/50 | 50/50 | `env-green`: `endpoint(environment:)` takes a dictionary | 0/50 | 0/50 |
| `cwd-red`: two tests `chdir` to different dirs, read relative `data.txt` | 32/50 | 31/50 | `cwd-green`: `readData(in: URL)` | 0/50 | 0/50 |
| `umask-red`: 50+50 cases `umask(0o077)` vs `umask(0)`, assert file mode | 30/30 | 30/30 | `umask-green`: explicit mode plus `fchmod` | 0/30 | 0/30 |
| `env-serialized-red`: two `@Suite(.serialized)` suites, one `setenv`, one reads | 50/50 | 49/50 | (see section 1.3) | | |
| `env-crash`: 4 writers `setenv`/`unsetenv` unique keys x 200k, 4 readers `ProcessInfo...environment` + `getenv` | 0/60 | 54/60 (SIGSEGV) | | | |
| `env-crash-raw`: same writers, readers only `getenv("PATH")` x 3M | 0/40 | 40/40 (SIGSEGV) | | | |

The crash is a hard process death: `*** Program crashed: Bad pointer dereference ***`, a backtrace in the `writer(_:)` frame at `setenv`, and `swift test` exiting 1 (not 139), so a CI log needs `grep` for `Program crashed` to tell a crash from an assertion failure. 6.4 never crashed. The difference tracks the libc: the 6.3 image ships glibc 2.39, the 6.4 image glibc 2.43, and glibc commit [`7a61e7f557a9`](https://github.com/bminor/glibc/commit/7a61e7f557a9) "stdlib: Make getenv thread-safe in more cases" (Florian Weimer, 2024-11-21, contained in glibc-2.41 by `git compare`) stopped freeing the old environ array. A plain C reproducer (`c-env/race.c`, 4 writers, 4 readers) did not crash on either image in 30 runs each, so the attribution is "consistent with", not isolated. Conclusion for rules: a green run on a new libc proves nothing; musl, macOS and Windows environments are unverified: read only. POSIX: "The `setenv()` function need not be thread-safe" ([setenv](https://pubs.opengroup.org/onlinepubs/9799919799/functions/setenv.html)).

**1.3 `.serialized` is not the fix.** `env-serialized-red` puts both writers in `@Suite(.serialized) struct Writers` and the reader in `@Suite(.serialized) struct Readers`: 50/50 red on 6.4, 49/50 on 6.3. Documentation says why: ".serialized ... doesn't affect the execution of a test relative to its peers or to unrelated tests" (`swift-testing@c7d68ca20cd7:Sources/Testing/Testing.docc/Parallelization.md:58-59`), and the Swift Testing author's pitch states that serialized suites "can still run in parallel with other unrelated tests, including tests in other suites that are also marked .serialized" ([pitch, 2026-04-17](https://forums.swift.org/t/pitch-data-dependent-test-serialization/86096)). A single suite that owns every reader and writer works, but only while no other suite reads the same state, including through library code: `apple/container` does exactly this for `KUBECONFIG` (`container@f70ecbb926d9:Tests/K8sPluginTests/KubeconfigMergeTests.swift:417-419`, "wrap them in a common .serialized parent so they cannot race against each other").

**1.4 What works (all measured).**

1. **Pass the value.** `endpoint(environment: [String: String])`, `readData(in: URL)`, a `Configuration` struct. 0/50 red (`env-green`, `cwd-green`). Production passes `ProcessInfo.processInfo.environment` once, at its composition root; a default argument of the same expression is fine because tests always pass their own. This mirrors Rust `TEST-05` ("code under test takes configuration as a parameter") and `ocx-sdk-python`, whose `run_command(argv, env: Mapping[str, str], ..., cwd: StrPath | None)` takes both as values (`ocx-sdk-python@80136dde4162:src/ocx_sdk/_process.py:198-215`).
2. **A scoped `@TaskLocal`** when threading a value is impractical. `env-taskLocal`: `Env.$current.withValue(...)` inside a `TestScoping` trait (ST-0007, Swift 6.1: [ST-0007](https://github.com/swiftlang/swift-evolution/blob/main/proposals/testing/0007-test-scoping-traits.md), which names global mutable state as the motivation). 0/50 red on both toolchains, tests interleave through `await Task.yield()`. The built-in `Trait.taskLocal(_:withValue:)` is marked "introduced: 6.5" in main (`swift-testing@c7d68ca20cd7:Sources/Testing/Traits/TaskLocalTrait.swift:15-23`) and 404s at `swift-6.4.0-RELEASE`, so on 6.4 write the ten-line trait. Pitfall found while building it: a trailing `//` comment on the `@TaskLocal static var` line breaks the macro expansion (`macro expansion @TaskLocal:1:111: error: expected ')' in expression list`, 6.4); put comments on their own line.
3. **An exit test** for code that really reads the process environment. The body runs in a child process ("the testing library starts a new process with the same executable", `swift-testing@c7d68ca20cd7:Sources/Testing/Testing.docc/exit-testing.md:59-63`), so `setenv` inside it never reaches the parent: `env-exit` 0/50 red, and the parent-side test that expects the default stayed green. `swift-nio` does this for `SWIFTNIO_STRICT` (`swift-nio@e12881f2a691:Tests/NIOPosixTests/StrictCrashTests.swift:30-41`).
4. **Serialize cwd users on a global actor** when the code under test is `FileManager`'s own cwd handling. `swift-foundation` defines `@globalActor actor CurrentWorkingDirectoryActor` with a synchronous `withCurrentWorkingDirectory` body (`swift-foundation@aadd9259be07:Tests/FoundationEssentialsTests/FileManager/FilePlayground.swift:83-100`). `cwd-actor` (same shape, two tests, 2,000 chdir-and-read rounds each): 0/30 red on 6.4 and 0/30 on 6.3. It protects only callers that go through the actor; any other test doing a relative read still races, so this is for tests of the cwd itself, not for convenience.
5. **A child process with its own environment** for CLI end-to-end tests: swift-subprocess `environment:` (SW-IO-24).

**1.5 `--no-parallel` and repetition (triage, SW-TEST-14).** `cwd-red` with `swift test --no-parallel`: 0/30 red on both toolchains, so a green `--no-parallel` plus a red default is the interference signature. `swift test --maximum-repetitions 50 --repeat-until fail` exits 1 on 6.4 (480 issues in 2.6 s); on 6.3 the option does not exist (`Usage: swift test <options>`, exit 64), matching SW-TEST-14's floor.

**1.6 Why Swift cannot copy Rust's wording.** Rust bans `env::set_var` because the call is `unsafe` in edition 2024; Swift has no marker, no lint and (below) no suppression-free path, so the ban is a grep or a SwiftLint `custom_rules` regex. SwiftLint's bundled static binary silently skips `custom_rules`: with an identical `.swiftlint.yml` the static `swiftlint` exits 0 on the red fixture, the SourceKit image exits 2 (verification V9).

### 2 What Swift Testing documents, and what `.serialized(for:)` is on 6.4

- Documented: parallel by default; `.serialized` applies inside its own suite or parameterized test and is "recursively applied" to sub-suites; on a plain `@Test` it has no effect; it has no effect under `--no-parallel` (`Parallelization.md:24-60`). The page carries `<!-- TODO: discuss .serialized(for:) -->` at line 22. The XCTest migration page says "If your tests use shared state such as global variables, you may see unexpected behavior ... Annotate your test suite with Trait/serialized" (`MigratingFromXCTest.md:868-873`).
- `.serialized(for:)` has three overloads, all `@_spi(Experimental)` in `swift-6.4.0-RELEASE` (`ParallelizationTrait.swift` lines 254, 300, 344; the 6.3.3 file has none) and still SPI on main (`swift-testing@c7d68ca20cd7:Sources/Testing/Traits/ParallelizationTrait.swift:268,319,364`). `SWT_EXPERIMENTAL_SERIALIZED_TRAIT_APPLIES_GLOBALLY` flips the no-argument `.serialized` to the global form (`ParallelizationTrait.swift:211,224`).
- Planted: `spi-public` (`@Suite(.serialized(for: \Env.self))`) and `spi-experimental` (same with `@_spi(Experimental) import Testing`) both exit 1 on 6.4 and on 6.3 with `cannot call value of non-function type 'ParallelizationTrait'`. The shipped `Testing.swiftmodule` is a textual `.swiftinterface` that lists only the public `serialized` property (`/usr/lib/swift/linux/Testing.swiftmodule/x86_64-unknown-linux-gnu.swiftinterface:898-899`), so SPI is not importable from the toolchain at all. The library's own tests use it because they build the library itself (`swift-testing@c7d68ca20cd7:Tests/TestingTests/Support/EnvironmentTests.swift:14`).
- Direction: the author's pitch (2026-04-17, still taking feedback on 2026-06-30) would make `.serialized(for: \ProcessInfo.environment)` or `.serialized(for: *)` serialize across suites and would change plain `.serialized` to serialize globally. Not landed, not in 6.4. Re-check at 6.5.

### 3 Temp paths, ports and hash order

- **Shared temp path and fixed port** (`res-red`): two tests write `/tmp/fx-shared-state.txt` and verify it after 50 ms; two tests bind loopback port 47123. 30/30 red on both toolchains (first variant with an absolute fixture path: 50/50). Twin `res-green`: a per-test directory `FileManager.default.temporaryDirectory.appendingPathComponent("fx-\(UUID().uuidString)")` removed in `defer`, and `bind` to port 0 then `getsockname`: 0/50 red. Mirrors Rust `TEST-06` and `TEST-07`.
- A hard-coded but distinct port per test is an unstable middle: `swift-aws-lambda-runtime` uses 8080-8082 and 8090-8093 (`swift-aws-lambda-runtime@8abd464310c7:Tests/AWSLambdaRuntimeTests/LambdaLocalServerTests.swift:41,97,187`; `LambdaLocalServer+StreamingTests.swift:40,105,177,248`), which collides with any other process on those ports and with a second CI job on the same host.
- **Hash order** (`order-red`): `render(["a":1,...]) == ["a=1","b=2",...]` over `d.map`. Red 28/30 on 6.4 and 30/30 on 6.3 (each loop iteration is a new process, hence a new hash seed); twin `.sorted()`: 0/30. `SWIFT_DETERMINISTIC_HASHING=1` made the same binary red 10/10, i.e. reproducible; use it to reproduce, then sort or assert on a `Set`/dictionary equality. Mirrors Rust `TEST-09`; the clock half is SW-TEST-12.
- `chdir` for a legitimate reason exists: `swift-nio` falls back to `changeCurrentDirectoryPath` when a Unix-domain-socket path exceeds the `sockaddr_un` limit (`swift-nio@e12881f2a691:Tests/NIOHTTP1Tests/TestUtils.swift:150-172`, `Tests/NIOPosixTests/TestUtils.swift:163-177`). The alternative is a shorter temp root (`TMPDIR`), not a `chdir`.

### 4 The SDK spawn seam (M-E-15) and recorded fixtures

**4.1 The Python original.** `ocx-sdk-python` exposes the seam as two type aliases: `type PopenFactory = Callable[..., subprocess.Popen[Any]]` ("`subprocess.Popen` seam, so the kill ladder is unit-testable without a child") and `ExecFactory` for asyncio, plus `Clock` (`ocx-sdk-python@80136dde4162:src/ocx_sdk/_process.py:96-106`), injected as `popen_factory=` / `exec_factory=` / `clock=` keyword parameters (`:198-215`). Its tests hand the function a queue of fake processes (`tests/unit/test_process.py:187-197`, `_factory(proc)`) and assert the exit code and both streams (`:349`). 70 files under `tests/fixtures/cli/` (27 `.json`, 42 `.help.txt`, one `author_flow.sh`) and 48 under `tests/fixtures/results/` are captured CLI output; `test_results.py:1-40` documents provenance per fixture ("Those fixtures are the specification"), `tests/fixtures/contract/README.md` documents regeneration, and `pyproject.toml:90-103` sets `branch = true`, `fail_under = 100` and an `exclude_also` list (10 `# pragma: no cover` lines exist in `src/`).

**4.2 The Swift shape (`sdk-seam`, builds and passes on 6.3 and 6.4).** Core module `OcxSdk` has no process API; one other module, `OcxSdkProcess`, is the only file importing Foundation's `Process`.

```swift
// Sources/OcxSdk/Runner.swift  (agrees with SW-IO-26's closed vocabulary; api/sdk-shape owns the final type)
public struct Completed: Sendable, Equatable { public var exitCode: Int32; public var stdout: String; public var stderr: String; /* public init */ }
public enum ProcessFailure: Error, Sendable, Equatable { case executableNotFound(String), launchFailed(String) }
public struct ProcessRunner: Sendable {
    public var run: @Sendable (_ argv: [String], _ environment: [String: String?]) async throws(ProcessFailure) -> Completed
    public init(run: @escaping @Sendable (_ argv: [String], _ environment: [String: String?]) async throws(ProcessFailure) -> Completed) { self.run = run }
}
// Sources/OcxSdkProcess/Live.swift:  extension ProcessRunner { public static let live = ProcessRunner { ... Process ... } }
// Tests:  let ocx = Ocx(runner: ProcessRunner { _, _ in recorded })        // one closure literal replays a case
```

A closure-holding struct beats a protocol here because the replay is a one-line literal and typed `throws(ProcessFailure)` works on a stored closure on 6.2 to 6.4. If `api/sdk-shape` picks a protocol, the replay type conforms instead; nothing below changes.

**4.3 Recorded cases.** Layout `Tests/OcxSdkTests/Fixtures/cli/<case>/{stdout,stderr,exit}`: three byte-exact files per case, so the three facts of SW-TEST-15 stay separate and no escaping lives in a JSON string. Seven cases (`version-ok`, `version-no-channel`, `usage-64`, `notfound-79`, `failed-1`, `killed-143`, `malformed`) drive one parameterized `@Test(arguments: cases)`; a loader `Recording.load(_:)` reads them through `Bundle.module` and throws, never skips, if the resource bundle is missing. An inventory test asserts `Set(contentsOfDirectory) == Set(cases.map(\.recording))`. The live adapter has its own suite tagged `.tags(.spawns)` with four real-child tests (three facts through a shell, `kill -KILL $$` maps to 137, an env override reaches the child, a missing executable throws); the default and gate runs pass `--skip LiveSpawn`.

**4.4 Measured: the gate passes without spawning and fails when a case disappears** (`seam-runs.sh`, exit codes in the Verification runs):

| Scenario | Lines (core) | Regions (core) | Outcome |
|---|---|---|---|
| Seven cases, `--skip LiveSpawn` | 25/25 | 19/19 | gate exit 0 |
| Whole `Sources/`, no spawn tests | 25/52 | n/a | gate exit 123 |
| Whole `Sources/`, with the four live tests | 50/52 | 14/17 in `Live.swift` | gate exit 123 |
| Orphan fixture directory | n/a | n/a | tests exit 1 (inventory) |
| Table row deleted, recording kept | n/a | n/a | tests exit 1 (inventory) |
| Recording deleted, row kept | n/a | n/a | tests exit 1 (loader throws) |
| Row and recording both deleted | 25/25 (exit 0) | 18/19 (exit 123) | tests exit 0; only the regions gate notices |

So a deleted case cannot slip through silently, but only because three layers cooperate: the loader, the inventory test, and a regions gate. The lines gate alone passed the last row: `case 64: throw .usage(done.stderr)` is one line, executed by every exit code that reaches the `switch`, and `swift format` keeps it on one line. This amends SW-TEST-16 (section 6).

### 5 Locating fixtures on Linux

SwiftPM: "Always use `Bundle.module` to access resources. A package shouldn't make assumptions about the exact location of a resource" ([BundlingResources](https://github.com/swiftlang/swift-package-manager/blob/main/Sources/PackageManagerDocs/Documentation.docc/BundlingResources.md); `swift-package-manager@5546f44a3b52:Sources/PackageManagerDocs/Documentation.docc/BundlingResources.md:74-75`; `.copy` vs `.process` at `:38-45`). `.copy` keeps a directory tree; `.process` copies "to the resource bundle's top-level directory". Measured in `loc-fixtures` (`resources: [.copy("Fixtures")]`, files `Fixtures/a/stdout`, `Fixtures/b/stdout`):

| Locator | `swift test` | `swift test --package-path` from another cwd | source `Fixtures/` moved away, `swift test --skip-build` | `-Xswiftc -file-prefix-map` |
|---|---|---|---|---|
| `Bundle.module.url(forResource: "Fixtures", withExtension: nil)` | pass | pass | pass (reads the copy in the build output) | pass |
| `URL(fileURLWithPath: #filePath)....` | pass | pass | fail (`NSCocoaErrorDomain Code=260`) | pass (not remapped) |
| relative `"Tests/LocTests/Fixtures/a/stdout"` | pass | pass (SwiftPM runs tests from the package root) | fail | pass |

`#filePath` is the compile-time absolute path of the source file (SE-0274 keeps it as the full path while `#file` became `Module/File.swift`, [SE-0274](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0274-magic-file.md)), so it is right only where the compiled test and its source tree sit at the same path; it breaks for a prebuilt test bundle run on another machine, a remote-cache build, and a Bazel sandbox (unverified: read only). `.process("Fixtures")` over two case directories each holding `stdout` fails at manifest evaluation: `error: 'loc-process': multiple resources named 'stdout' in target 'LocTests'` (exit 1); `.copy` builds. Windows and Apple resource lookup (`Bundle.module` accessor, XCFramework test bundles) are unverified: read only. Rust's counterpart is `TEST-41`.

### 6 Coverage exclusion (closes Q-T1)

**6.1 Nothing line- or region-level exists.** `cov-excl` plants one uncovered function per candidate and reads the result with `swift test --enable-code-coverage` plus `llvm-cov show` and the exported JSON, on 6.4 and 6.3 (lines 1/12 both):

| Candidate | Effect |
|---|---|
| `// coverage:ignore`, `// LCOV_EXCL_LINE`, `// LCOV_EXCL_START`/`STOP`, `/// swift-cov-ignore: true` | none: all four functions show count 0 and stay in the totals |
| `@_transparent`, `@inline(never) @_semantics(...)` | none |
| `#sourceLocation(file: "excluded-by-line-directive.swift", line: 1)` | none: SE-0274 makes it change `#filePath`, but the coverage mapping keeps the real file and line (`Lib.swift:26`, count 0) |
| `#if !FX_COVERAGE` with `-Xswiftc -DFX_COVERAGE` | the function disappears from the map (lines 1/11), because it is not compiled into the test build at all; unacceptable, it hides code from the thing under test |
| `swift test --help` | only `--enable-code-coverage` and `--show-codecov-path` |
| `llvm-cov` 21.0.0 (the image's) | file filters `-ignore-filename-regex`, `-include-filename-regex`; function filters `-name`, `-name-regex`, `-name-allowlist` ([llvm-cov guide](https://llvm.org/docs/CommandGuide/llvm-cov.html)); no marker comments |

Upstream: [llvm-project#33625](https://github.com/llvm/llvm-project/issues/33625) "No way to exclude coverage in a line or part of code" is open (opened 2017-08-22, 17 comments); PR [#203723](https://github.com/llvm/llvm-project/pull/203723) (inline `LCOV_EXCL_*` markers, 2026-06-13) was closed unmerged the same day. Re-check at each LLVM bump; swift's `-profile-coverage-mapping` has no exclusion attribute in the frontend's option list (`swift-frontend -help-hidden`). A Clang-side `no_profile_instrument_function` attribute exists for C targets only (unverified for Swift targets; no Swift spelling found).

**6.2 What does work.**

- By file or directory: a `startswith($root + "/Sources/<Module>/")` prefix in the SW-TEST-16 jq filter, or `--ignore-filename-regex` when calling `llvm-cov` directly. Exemplars do it by path: `apple/containerization` ignores `.build/`, `.pb.swift`, `.proto`, `.grpc.swift` (`containerization@3e7bc39e66b3:Makefile:66-69`); `element-x-ios` lists ignored directories and `**/Mock*.swift` globs in `codecov.yml:11-23`.
- By function: the export JSON has `.data[0].functions[]` with `name` (mangled), `count` and `filenames`; `cov-func-gate.sh` prints never-called functions outside an allowlist file (8 names with an empty list, 0 with the 8 entries). It works, but the list is mangled symbols that rot on every rename, so it is a last resort behind "move it to its own file".
- By structure (the answer for the SDK): the adapter that really calls `Process` is its own file, ideally its own target, excluded by path, and covered by the tagged live suite as a contract test, not toward the 100%. Even with four real-child tests `Live.swift` is 25/27 lines and 14/17 regions, because the `createDirectory` and `FileHandle` failure arms cannot be forced; whole-file exclusion avoids chasing them.
- Code reachable only through a trapping child records nothing (SW-TEST-16's C6): the SDK throws typed errors instead of trapping, so there are no trap-only lines.

### 7 NonisolatedNonsendingByDefault on test targets

SE-0461 (Swift 6.2) makes a `nonisolated async` function run on its caller's actor instead of hopping to the global executor; the upcoming feature is `NonisolatedNonsendingByDefault` ([SE-0461](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0461-async-function-isolation.md); the manifest spelling is `.enableUpcomingFeature("NonisolatedNonsendingByDefault")`). The 6.4 `swift package init --type library` writes `.enableUpcomingFeature("ApproachableConcurrency")` on both the library and the test target (`template-probe-1/Package.swift`, tools 6.4), which SW-CONC-12 tells us to replace by the member names.

Planted (`nnbd-hop-*`, `nnbd-cross-*`, tools 6.2, Swift 6 mode, only the test target's `swiftSettings` differ):

| Test | NNBD off | NNBD on |
|---|---|---|
| `@Test @MainActor func` awaits a test-target `nonisolated async` helper that calls `MainActor.preconditionIsolated()` | exit 1: `Program crashed: Illegal instruction`, frame `Actor.preconditionIsolated`, thread `DispatchWorker` (6.4 and 6.3) | exit 0 (6.4 and 6.3) |
| `@Test @MainActor func` passes a main-actor-isolated non-`Sendable` property to a test-target `nonisolated async` helper | build error `sending 'm.box' risks causing data races [#SendingRisksDataRace]` ("sending main actor-isolated 'm.box' to nonisolated global function 'touch' risks causing data races between nonisolated and main actor-isolated uses"), exit 1 on both | builds, passes |
| plain nonisolated `@Test` | not measured separately: it has no actor to inherit, so only the `@MainActor` tests above differ | |

So the statement is: on a test target, NNBD changes what test-target helpers do when called from `@MainActor` tests and removes the sending diagnostic for them (a plain nonisolated `@Test` was not separately measured). Because agents trained on pre-6.2 behaviour write test helpers as plain `nonisolated async` functions, enable it by name on every test target whose module enables it (SW-CONC-12), and do not paste a helper from a pre-NNBD target into an NNBD one (SW-CONC-07 direction applies to existing code). An `Thread.isMainThread` or `pthread_equal` probe is not a valid detector on Linux: both stayed "same thread" in both modes because the main-actor executor runs on a pool thread under `swift test`; use `MainActor.preconditionIsolated()` or the compile diagnostic.

### 8 Mocking strategy and test layout (M-E-15, M-E-16)

- **Mocking.** Hand-written fakes dominate: 174 files in 9 of 40 repos declare `struct|class|actor Mock*` (tuist 52, swift-package-manager 28, swift-build 23, Nuke 19), 15 files declare `Fake*`, 10 `Stub*`, none `Spy*`. Only tuist uses a mock macro, `Mockable` (231 `@Mockable` files; `tuist@2f6ac74754bf:Package.swift:19`). Cuckoo, Mockolo, SwiftyMocky and Mockingbird appear nowhere. The Rust set's `TEST-39` ("hand-written fake behind a narrow trait; `mockall` only when the trait already exists") transfers directly: a Swift SDK's fake is the closure seam of section 4; a macro mock adds a swift-syntax-style build dependency for a type that is one closure.
- **Layout.** `Tests/<Target>Tests` per target; 2,111 of 3,891 test files (54%) use `@testable import` (corpus count, 2026-10-10). `@testable` hides access-control bugs: `testable-mask` (public struct with an internal memberwise `init`, test uses `Report(version:)`) built and passed with `@testable import Lib` (exit 0) and failed to compile with `import Lib` (exit 1). `swift test -c release` with `@testable import` still builds and passes on 6.4 (exit 0; SwiftPM enables testability for test builds). My own first build of the SDK fixture hit the same trap and was caught only because the replay test used a plain import.
- **Support code.** Once a second test target needs the same recordings or fakes, extract a `<Package>TestSupport` library target consumed only by `.testTarget` dependencies; `swift-build` ships `SWBTestSupport` this way and `swift-dependencies` ships `DependenciesTestSupport` (`swift-dependencies@b476cc576105:Sources/DependenciesTestSupport/TestTrait.swift:8`). A single target keeps its helpers in the test target (Rust `TEST-40` analogue).

## Normative guidance candidates

New rules append to swift-testing.md from SW-TEST-18. "Run" says whether the verification was run against a planted violation (fixture under `fixtures/isolation-and-seams/`) and the twin; commands are verbatim from the Verification runs section. All greps print the violation, so empty output is a pass; judge by output, since `xargs -r` pipelines exit 0 or 123 regardless.

**SW-TEST-18 (MUST). No test mutates process-global state. `setenv`, `unsetenv`, `putenv`, `chdir`, `FileManager.changeCurrentDirectoryPath`, `umask` do not appear in `Tests/`, except inside the body of a `#expect(processExitsWith:)`. Production code reads `ProcessInfo.processInfo.environment` and the cwd once, at its composition root, and everything below takes them as parameters.** Ladder for a test that needs a different environment: (1) pass the value; (2) a `TestScoping` trait binding a `@TaskLocal` (hand-written on 6.1 to 6.4; the built-in `.taskLocal(_:withValue:)` is 6.5); (3) an exit test; (4) a child process with `environment:`. `.serialized` is not protection (SW-TEST-05); `.serialized(for:)` is unavailable (SW-TEST-08).
- Rationale: tests run concurrently in one process; red 48/50, 32/50, 30/30 and a SIGSEGV on glibc 2.39; the compiler is silent.
- Verify: `grep -rn --include='*.swift' -e 'setenv(' -e 'putenv(' -e 'chdir(' -e 'changeCurrentDirectoryPath(' -e 'umask(' Tests` (output = violations; `setenv(` also matches `unsetenv(`; hits inside an exit-test body are accepted, review by eye). File-level exemption form: `grep -rL --include='*.swift' -e 'processExitsWith' Tests | xargs -r grep -nH -e 'setenv(' -e 'putenv(' -e 'chdir(' -e 'changeCurrentDirectoryPath(' -e 'umask('`. Compiler-side vehicle: SwiftLint `custom_rules` with `only_rules: [custom_rules]` (needs the SourceKit image, `swiftlint-sk.sh`; the static binary skips it). Reading aid for production code: `grep -rn --include='*.swift' -e 'ProcessInfo.processInfo.environment' -e 'getenv(' -e 'currentDirectoryPath' Sources` should list the composition root only. Behavioural: `swift test --maximum-repetitions 50 --repeat-until fail` (6.4+).
- Run: yes. V1 (loops), V6 (grep: `env-red` 4 lines, `cwd-red` 2, `env-green`/`cwd-green`/`env-taskLocal` 0), V9 (SwiftLint SourceKit exit 2 on `env-red`/`cwd-red`, 0 on twins, static binary exit 0 on the red). The exit-test-file exemption: `env-exit` 0 lines.
- Severity MUST. Floor Swift 6.0 (6.1 for `TestScoping`). Binds every code kind.

**SW-TEST-19 (MUST). A test never names a temp path, a port or an iteration order that another test or process can also name.** Temp: `FileManager.default.temporaryDirectory.appendingPathComponent("<tag>-\(UUID().uuidString)")` created per test and removed in `defer`; no `"/tmp/..."` or `"/var/tmp/..."` literal. Port: bind to port 0 and read the bound port back (`getsockname`, or the server's reported address); no literal bind port. Order: sort, or compare as `Set`/dictionary; never assert on `Dictionary`/`Set` iteration. To reproduce an order failure set `SWIFT_DETERMINISTIC_HASHING=1`; never commit it.
- Rationale: 30/30 red on a shared file and a shared port; 28/30 red on hash order.
- Verify: `grep -rnE --include='*.swift' -e '"/tmp/' -e '"/var/tmp/' -e 'port: *[1-9][0-9]{3,4}' Tests` (output = violations; a parsing test that merely mentions `port: 5000` in an OCI reference is a false positive to review). Order: reading heuristic, `d.map`/`Array(d.keys)`/`Array(set)` flowing into an `==` assertion.
- Run: yes for the grep (V6: `res-red` 3 lines, `res-green` 0) and for the behaviour (V1). Order: behaviour run yes, no grep.
- Severity MUST. Floor Swift 6.0.

**SW-TEST-20 (MUST for the SDK, SHOULD for CLIs). The spawn is a seam owned by exactly one module; the default test run starts no process.** The core module defines `ProcessRunner` (a struct holding `@Sendable (argv, [String: String?]) async throws(ProcessFailure) -> Completed`, or an equivalent protocol, per api/sdk-shape); one module (`OcxSdkProcess`) provides `.live`; the core never imports Foundation's `Process` or `Subprocess`. Tests inject a literal. The live adapter has its own suite tagged `.tags(.spawns)` and the coverage gate runs with `--skip` for it.
- Rationale: replaying seven recorded cases covered 25/25 core lines and 19/19 core regions with no child; a core that calls `Process()` inline cannot be tested without the CLI installed.
- Verify: `grep -rln --include='*.swift' -e 'Process()' -e 'import Subprocess' Sources` lists exactly the spawn module's files (any other path is a violation).
- Run: yes. V7: `sdk-seam` lists `Sources/OcxSdkProcess/Live.swift` only; `sdk-noseam` lists `Live.swift` and `Sources/OcxSdk/Ocx.swift`. Gate: V3 rows S1/S2.
- Severity MUST (SDK). Floor Swift 6.0 (typed throws on a stored closure; the fixture uses tools 6.2); owner Q4 dependency budget unchanged.

**SW-TEST-21 (MUST for the SDK). Recorded CLI output is a fixture directory per case, located through the resource bundle, with a provenance file and an inventory test.** Layout `Tests/<T>/Fixtures/cli/<case>/{stdout,stderr,exit}`; manifest `resources: [.copy("Fixtures")]` (never `.process`, which flattens); loader uses `Bundle.module` and `throw`s when the bundle is missing (never `try #require`-skip, never `return`); no `#filePath`, `#file`, cwd-relative or `contentsOfFile: "literal"` path; a `PROVENANCE.md` beside the cases names the CLI version and capture command; one parameterized test table, plus a test that asserts the directory set equals the table's names.
- Rationale: `Bundle.module` survived a moved source tree, `#filePath` and the relative path did not; `.process` fails on same-named files; unreferenced or missing cases are caught only by the inventory test.
- Verify: `grep -rn --include='*.swift' -e '#filePath' -e 'contentsOfFile: "' -e 'FileManager.default.currentDirectoryPath' Tests`; `grep -n -e '\.process(' Package.swift` (review: `.process` on a fixtures directory is a violation); behavioural: delete a recording, add an orphan directory, delete a table row; each makes `swift test` exit 1.
- Run: yes. V8 (greps: `loc-fixtures` 2 lines, `loc-process` 1 line, `sdk-seam` 0), V3 rows S5, S6, S8, and the `loc-*` runs in V4.
- Severity MUST (SDK), SHOULD otherwise. Floor Swift 5.3 tools (resources); Swift 6.0 here.

**SW-TEST-22 (MUST for the SDK). Coverage is gated on lines and regions of the core `Sources/` prefix; there is no inline exclusion, so code that cannot be covered lives in its own excluded file.** Run the SW-TEST-16 jq twice, once with `--arg m lines` and once with `--arg m regions`, both `--argjson min 100`, over `startswith($root + "/Sources/<Core>/")`. Comment markers (`LCOV_EXCL_*`, `coverage:ignore`), `#sourceLocation`, `@_transparent` and `#if` build switches are not exclusions and are not used to fake one. The spawn adapter's file is excluded by path; a function-name allowlist is allowed only with a comment per entry. Closes Q-T1: 100% on `Sources/<Core>` is reachable because the SDK throws instead of trapping and the adapter is excluded by path.
- Rationale: the lines gate stayed green (25/25) when a recorded case was deleted; the regions gate went red (18/19). No marker changed any count (lines 1/12 unchanged on 6.3 and 6.4).
- Verify: `swift test --enable-code-coverage --skip LiveSpawn` then, for each of `lines` and `regions`: `swift test --show-codecov-path | xargs -r jq -e --arg root "$PWD/Sources/OcxSdk/" --arg m regions --argjson min 100 '[.data[0].files[] | select(.filename | startswith($root))] | ((map(.summary[$m].covered) | add) / (map(.summary[$m].count) | add) * 100) as $pct | ($pct >= $min)'` (exit 0 pass, 123 fail). Marker grep: `grep -rniE --include='*.swift' -e 'LCOV_EXCL' -e 'coverage:ignore' -e 'cov-ignore' -e 'excluded from coverage' Sources Tests` (output = violations).
- Run: yes. V3 rows S1, S2, S3, S7b, S7c; V8 grep (`cov-excl` 5 lines, `sdk-seam` 0); V5 for the marker table.
- Severity MUST (SDK). Floor any Swift; LLVM issue re-check at 6.5.

**SW-TEST-23 (SHOULD). Every test target of a module that enables `NonisolatedNonsendingByDefault` enables it too, by name.** The 6.4 template's `ApproachableConcurrency` on a test target is replaced by the member names (SW-CONC-12). Test-target `nonisolated async` helpers are written for NNBD semantics and are not pasted into a target without it.
- Rationale: off, a `@MainActor` test awaiting a `nonisolated async` helper trapped on a hop and a main-actor value could not be passed (`[#SendingRisksDataRace]`); on, both fine; plain nonisolated `@Test`: no caller actor to inherit.
- Verify: `swift package dump-package | jq -r '.targets[] | select(.type=="test") | select(([.settings[]?.kind.enableUpcomingFeature?._0?] | index("NonisolatedNonsendingByDefault")) == null) | .name'` (output = test targets missing the feature; empty = pass; meaningful only when the library targets enable it).
- Run: yes. V10: `nnbd-hop-off` prints `LibTests`, `nnbd-hop-on` prints nothing; behaviours V4 (exit 1 vs 0, 6.3 and 6.4).
- Severity SHOULD. Floor Swift 6.2.

**SW-TEST-24 (SHOULD). SDK contract tests `import` the public module plainly; `@testable import` is for white-box suites only. A fake is a hand-written value behind the seam; no mock macro unless the protocol already exists for production reasons.** Shared recordings or fakes used by a second test target move to a `<Package>TestSupport` target depended on only by test targets.
- Rationale: `@testable` compiled a public type with no public `init` (exit 0); plain `import` failed (exit 1). Corpus: 174 hand-written `Mock*` files vs one repo with a mock macro.
- Verify: `grep -rn --include='*.swift' -e '@testable import' Tests` (review each hit in a contract suite); `grep -rn --include='Package.swift' -e 'Mockable' -e 'Cuckoo' -e 'Mockolo' -e 'SwiftyMocky' .` (output = mock-framework dependencies).
- Run: yes. V8 (`testable-mask` 1 line, `testable-plain` 0) and V4 builds; the Package.swift grep ran read-only on the corpus: `tuist` hits, `swift-nio` none (exit 0 vs 1).
- Severity SHOULD. Floor Swift 6.0.

**Amendments to existing rules** (no renumbering):
- **SW-TEST-04.** Replace "`setenv`, `chdir` and fixed temp paths ... were not planted" by a pointer to SW-TEST-18 and -19; both are now planted and red.
- **SW-TEST-05.** Add: two `@Suite(.serialized)` suites racing each other measured 50/50 red on 6.4 and 49/50 on 6.3 (`env-serialized-red`); the single-suite-owner shape is the only safe one, and only while no other suite or library code reads the same state.
- **SW-TEST-08.** Add the compile proof: `@Suite(.serialized(for: \Env.self))` exits 1 on 6.3 and 6.4 even with `@_spi(Experimental) import Testing`.
- **SW-TEST-14.** Add: `--maximum-repetitions N --repeat-until fail` exits 1 on 6.4 for a flaky cwd suite; `--no-parallel` turned the same suite green 30/30 (interference signature).
- **SW-TEST-16.** Add the `regions` second run (SW-TEST-22) for the SDK; close Q-T1: no exclusion mechanism exists; whole-file or structural exclusion only.
- **SW-IO-24 / SW-IO-26.** Cross-reference SW-TEST-20: the seam type is SW-IO-26's `ProcessRunner`; SW-TEST-20 owns the replay mechanics.

## Verification runs

Fixture root `/home/mherwig/.cache/research-lang/swift-tools/fixtures/isolation-and-seams/` (called `$FX`); scripts there: `run-in.sh <fixture> <swift args>` (appends `--scratch-path "$SWIFT_SCRATCH/isolation-and-seams/<fixture>-<ver>"` inside the container), `loop.sh <fixture> <N> [swift test args]` (one `swift build --build-tests`, then N times `swift test --skip-build`, tally of exit codes), `cov-gate.sh`, `seam-runs.sh`, `greps.sh`. Logs in `$FX/logs/`. `SWIFT_VERSION=6.3` selects the prior line. A nonzero exit that is a crash is identified by `Program crashed` in the log.

**V1 Parallel-state loops** (`./loop.sh <fixture> 50`; red = exit 1; counts are exit-1 runs / runs).

| Fixture | 6.4 | 6.3 | Reading |
|---|---|---|---|
| `env-red` | 48/50 | 50/50 | red (flake); 2 passes on 6.4 |
| `env-green` | 0/50 | 0/50 | green twin |
| `cwd-red` | 32/50 | 31/50 | red (flake) |
| `cwd-green` | 0/50 | 0/50 | green twin |
| `cwd-red` with `--no-parallel` (30) | 0/30 | 0/30 | interference signature |
| `cwd-actor` (30; global-actor serialised cwd users) | 0/30 | 0/30 | green when every user goes through the actor |
| `umask-red` (30) | 30/30 | 30/30 | red |
| `umask-green` (30) | 0/30 | 0/30 | green twin |
| `res-red` (shared `/tmp` file and port 47123; 30) | 30/30 | 30/30 | red |
| `res-green` (UUID dir, port 0) | 0/50 | 0/50 | green twin |
| `order-red` (30) | 28/30 | 30/30 | red |
| `order-green` (30) | 0/30 | 0/30 | green twin |
| `order-red` with `SWIFT_DETERMINISTIC_HASHING=1` (10) | 10/10 | not run | deterministic red |
| `env-serialized-red` | 50/50 | 49/50 | `.serialized` per suite does not help |
| `env-exit` | 0/50 | 0/50 | exit-test twin |
| `env-taskLocal` | 0/50 | 0/50 | TaskLocal-trait twin |
| `env-crash` (writers 200k, ProcessInfo+getenv readers; 60) | 0/60 crashes | 54/60, `Program crashed: Bad pointer dereference` | crash on glibc 2.39 only |
| `env-crash-raw` (getenv-only readers; 40) | 0/40 | 40/40 crashes | crash on glibc 2.39 only |
| `c-env/race.c` (clang, 30 runs per image) | 0/30 | 0/30 | no C-level crash; attribution unproven |

`./run-in.sh cwd-red swift test --skip-build --maximum-repetitions 50 --repeat-until fail`: 6.4 exit 1 (`Test run with 2 tests ... failed after 2.572 seconds with 480 issues`); 6.3 exit 64 (`Usage: swift test <options>`), no such option.

**V2 `.serialized(for:)` reachability** (`./run-in.sh <fixture> swift build --build-tests`, both versions): `spi-public` (`import Testing`) exit 1, `spi-experimental` (`@_spi(Experimental) import Testing`) exit 1; both print `error: cannot call value of non-function type 'ParallelizationTrait'` on 6.4 and 6.3. No green twin is possible; the twin is `env-green`.

**V3 SDK seam and gates** (`./seam-runs.sh`; `cov-gate.sh sdk-seam <prefix> 100 --skip LiveSpawn` with `METRIC=lines|regions`; gate exit 0 = pass, 123 = jq false):

| Row | Command (abridged) | Result | Exit |
|---|---|---|---|
| S1 | `METRIC=lines cov-gate.sh sdk-seam Sources/OcxSdk 100 --skip LiveSpawn` | `lines covered/count: 25/25` | 0 |
| S2 | `METRIC=regions ... Sources/OcxSdk ...` | `regions covered/count: 19/19` | 0 |
| S3 | `METRIC=lines cov-gate.sh sdk-seam Sources 100 --skip LiveSpawn` | `25/52` | 123 |
| S4 | `METRIC=lines cov-gate.sh sdk-seam Sources 100` (live tests run) | `50/52` | 123 |
| S5 | add `Fixtures/cli/orphan/`, `swift test --skip LiveSpawn` | inventory test fails | 1 |
| S6 | delete the `usage-64` table row, keep the recording | inventory test fails | 1 |
| S7a | delete row and recording | tests pass | 0 |
| S7b | S7a, `METRIC=lines` core gate | `25/25` | 0 (gate blind) |
| S7c | S7a, `METRIC=regions` core gate | `18/19` | 123 |
| S8 | delete the recording, keep the row | `Recording.load` throws | 1 |
| S9 | all restored | green | 0 |

**V4 Behaviour pairs.** `nnbd-hop-off` `./run-in.sh nnbd-hop-off swift test`: exit 1 on 6.4 and 6.3 (`Program crashed: Illegal instruction`, `Actor.preconditionIsolated`); `nnbd-hop-on`: exit 0 on both. `nnbd-cross-off`: build exit 1 on both (`error: sending 'm.box' risks causing data races [#SendingRisksDataRace]`); `nnbd-cross-on`: exit 0 on both. `testable-mask` (`@testable import`) `swift test` exit 0, also with `-c release` exit 0 and with `-c release -Xswiftc -enable-testing` exit 0; `testable-plain` (`import`) exit 1 (internal memberwise init). `loc-fixtures`: `swift test` exit 0 (3 tests); with the source `Fixtures/` renamed and `swift test --skip-build`, exit 1 (`viaFilePath`, `viaRelativePath` fail, `viaBundleModule` passes); with `-Xswiftc -file-prefix-map -Xswiftc $PWD=/remapped` exit 0 (3 pass); `loc-process` (`.process("Fixtures")`) exit 1 `multiple resources named 'stdout' in target 'LocTests'`; on 6.3 the normal run exits 0 (3 pass). `testable` rows and `loc` rows ran on 6.4 unless stated.

**V5 Coverage exclusion** (`./run-in.sh cov-excl swift test --enable-code-coverage`, then `swift test --show-codecov-path` and `jq`; `llvm-cov show -instr-profile=... LibTests.so Lib.swift`): all nine functions count 0 except `covered()`; `Lib.swift lines=1/12` on 6.4 and 6.3; `-Xswiftc -DFX_COVERAGE` gives `lines=1/11` (the `#if !FX_COVERAGE` function is gone from the map). `cov-func-gate.sh <Fx.json> <root>/Sources/ coverage-exclude.txt`: 8 printed names with the empty allowlist, 0 with the 8 mangled names.

**V6 Process-global and resource greps** (`./greps.sh`; `exit` is grep's, 0 = hits printed):

| Check | Fixture | exit | lines | 
|---|---|---|---|
| G1 `grep -rn --include='*.swift' -e 'setenv(' -e 'putenv(' -e 'chdir(' -e 'changeCurrentDirectoryPath(' -e 'umask(' Tests` | `env-red` | 0 | 4 |
| | `env-green` | 1 | 0 |
| | `cwd-red` | 0 | 2 |
| | `cwd-green` | 1 | 0 |
| | `env-exit` | 0 | 2 (inside `processExitsWith`, accepted) |
| | `env-taskLocal` | 1 | 0 |
| | `env-serialized-red` | 0 | 2 |
| G1b `grep -rL --include='*.swift' -e 'processExitsWith' Tests \| xargs -r grep -nH -e 'setenv(' ...` | `env-red` / `cwd-red` / `env-green` / `env-exit` | n/a | 4 / 2 / 0 / 0 |
| G2 `grep -rnE --include='*.swift' -e '"/tmp/' -e '"/var/tmp/' -e 'port: *[1-9][0-9]{3,4}' Tests` | `res-red` | 0 | 3 |
| | `res-green` | 1 | 0 |
| G9 `grep -rn --include='*.swift' -e 'ProcessInfo.processInfo.environment' -e 'getenv(' -e 'currentDirectoryPath' Sources` | `env-red` / `env-green` / `env-taskLocal` | 0 / 1 / 1 | 2 / 0 / 0 |

**V7 Seam grep.** `grep -rln --include='*.swift' -e 'Process()' -e 'import Subprocess' Sources`: `sdk-seam` exit 0, one line `Sources/OcxSdkProcess/Live.swift`; `sdk-noseam` exit 0, two lines (`Live.swift` and `Sources/OcxSdk/Ocx.swift`, the violation).

**V8 Fixture, marker and import greps.**

| Check | Fixture | exit | lines |
|---|---|---|---|
| G4 `grep -rn --include='*.swift' -e '#filePath' -e 'contentsOfFile: "' -e 'FileManager.default.currentDirectoryPath' Tests` | `loc-fixtures` | 0 | 2 |
| | `sdk-seam` | 1 | 0 |
| G5 `grep -n -e '\.process(' Package.swift` | `loc-process` | 0 | 1 |
| | `loc-fixtures`, `sdk-seam` | 1 | 0 |
| G6 `grep -rniE --include='*.swift' -e 'LCOV_EXCL' -e 'coverage:ignore' -e 'cov-ignore' -e 'excluded from coverage' Sources Tests` | `cov-excl` | 0 | 5 (lines 3, 7, 10, 12, 14; line 14 is `swift-cov-ignore`, which matches `cov-ignore`) |
| | `sdk-seam` | 1 | 0 |
| G8 `grep -rn --include='*.swift' -e '_spi(Experimental)' -e 'serialized(for' Tests` | `spi-public` / `spi-experimental` / `env-serialized-red` | 0 / 0 / 1 | 1 / 2 / 0 |
| G10 `grep -rn --include='*.swift' -e '@testable import' Tests` | `testable-mask` / `testable-plain` | 0 / 1 | 1 / 0 |
| Mock frameworks `grep -rn --include='Package.swift' -e 'Mockable' ...` (read-only, corpus) | `tuist__tuist` / `apple__swift-nio` | 0 / 1 | 5 / 0 |

**V9 SwiftLint custom rule.** `.swiftlint.yml` in each fixture: `only_rules: [custom_rules]`, `included: [Tests]`, rule `test_process_global_mutation` with `regex: '\b(?:un)?setenv\(|\bputenv\(|\bchdir\(|\bchangeCurrentDirectoryPath\(|\bumask\('`, `severity: error`. `swiftlint-sk.sh lint --no-cache --strict` (SourceKit image, 0.65.1): `env-red` exit 2 (`T.swift:6:5: error: Process-global mutation in tests Violation ... (test_process_global_mutation)`), `cwd-red` exit 2, `env-exit` exit 2 (accepted, needs an inline disable with a reason), `env-green`, `cwd-green`, `env-taskLocal` exit 0. The static `swiftlint lint --no-cache --strict` on `env-red`: exit 0, `Found 0 violations` (custom_rules silently skipped). Violation counts printed by the wrapper are doubled and not relied on.

**V10 NNBD manifest check.** `swift package dump-package | jq -r '.targets[] | select(.type=="test") | select(([.settings[]?.kind.enableUpcomingFeature?._0?] | index("NonisolatedNonsendingByDefault")) == null) | .name'` inside `nnbd-hop-off`: prints `LibTests` (jq exit 0, one line); inside `nnbd-hop-on`: prints nothing.

## Exemplar evidence

| Rule | Satisfies | Violates / contradicts |
|---|---|---|
| 18 | `swift-nio@e12881f2a691:Tests/NIOPosixTests/StrictCrashTests.swift:30-41` (`setenv` only inside `processExitsWith`); `swiftly@c8cf2e35bfca:Tests/SwiftlyTests/RunTests.swift:18-19` only `unsetenv` of two Apple variables (still process-global); `hummingbird@1bd3b407fb47:Tests/HummingbirdTests/EnvironmentTests.swift:15,18,74,171` uses `@Suite(.serialized)` | `swift-aws-lambda-runtime@8abd464310c7:Tests/AWSLambdaRuntimeTests/LambdaLocalServerTests.swift:44-45,100-101,189-190`, `LambdaLocalServer+StreamingTests.swift:43-44,107-108,179-180,250-251`, `LoggingConfigurationTests.swift:44-54`, `LambdaManagedRuntimeTests.swift:123-135`: four files, each `@Suite(.serialized)` per file, so the files race each other; `container@f70ecbb926d9:Tests/IntegrationTests/Build/TestCLIBuilder.swift:181-187`, `TestCLIBuilderLifecycleSerial.swift:48-55`, `Tests/K8sPluginTests/KubeconfigMergeTests.swift:431-440,488-490,546-548` (one `.serialized` parent: correct within the suite); `swift-foundation@aadd9259be07:Tests/FoundationEssentialsTests/FileManager/FileManagerTests.swift:1143-1144,705-737`, `FilePlayground.swift:96-99`; `swift-build@2187330e13e7:Tests/SWBBuildSystemTests/BuildTaskBehaviorTests.swift:383-384`, `ClangExplicitModulesTests.swift:418-419`; `swift-nio@e12881f2a691:Tests/NIOHTTP1Tests/TestUtils.swift:158-172` (cwd fallback for a long socket path). Corpus: 7 repos with real `setenv`/`putenv` calls in tests, 4 with `chdir`/`changeCurrentDirectoryPath` (`swift-nio`, `swift-foundation`, `swift-testing` at `ExitTestTests.swift:768`, `async-http-client` at `HTTPClientTestUtils.swift:295,309`) (`apple/containerization`'s hit, `LinuxProcessStdioTests.swift:249`, is a method named `setenv`) |
| 18 alternatives | `swift-foundation@aadd9259be07:Tests/FoundationEssentialsTests/FileManager/FilePlayground.swift:83-100` (global actor for cwd); `swift-dependencies@b476cc576105:Sources/DependenciesTestSupport/TestTrait.swift:8-14` (a `TestScoping` trait over `@TaskLocal`) | |
| 19 | corpus: 568 `port: 0` uses in tests | `swift-aws-lambda-runtime` fixed ports 8080-8082, 8090-8093 (above); 177 test files hold a `"/tmp/` literal (many are `UUID`-suffixed or never opened, e.g. `containerization@3e7bc39e66b3:Tests/ContainerizationTests/UnixSocketRelayTests.swift:75`) |
| 20, 21 | `ocx-sdk-python@80136dde4162:src/ocx_sdk/_process.py:96-106,198-215`, `tests/unit/test_process.py:187-197,349`, `tests/fixtures/cli/` (70 files), `tests/fixtures/results/` (48), `tests/unit/test_results.py:1-40` (provenance) | Python `tests/unit/test_types.py:188-232` and 21 more `monkeypatch.setenv`/`delenv`/`chdir` lines (22 in `tests/`): safe under pytest's serial default, not portable to Swift Testing. No Swift exemplar in the corpus has a replay-fixture layout |
| 22 | `containerization@3e7bc39e66b3:Makefile:66-69` and `element-x-ios@14e33866ced2:codecov.yml:11-23` exclude by path; `ocx-sdk-python@80136dde4162:pyproject.toml:90-103` gates branch coverage at 100 with `exclude_also` | no Swift exemplar uses a line exclusion (none exists); no corpus repo enforces a minimum (gates audit) |
| 23 | the 6.4 template (`template-probe-1`) sets a feature on the test target | the template names the bundle, not the member (SW-CONC-12) |
| 24 | hand-written mocks: `tuist` 52 files, `swift-package-manager` 28, `swift-build` 23, `Nuke` 19, `async-http-client` 10, `swift-aws-lambda-runtime` 8, `swift-nio` 6, `SwiftLint` 5 | `tuist@2f6ac74754bf:Package.swift:19` and 231 `@Mockable` files; `@testable import` in 2,111 of 3,891 test files |

## AI-agent angle

| Characteristic mistake | Smallest mechanical check |
|---|---|
| Writes `setenv("X", "y", 1); defer { unsetenv("X") }` in a `@Test`, copying XCTest `setUp`/`tearDown` or pytest `monkeypatch` habits; compiles silently | the G1 grep or the SwiftLint custom rule (V6, V9) |
| "Fixes" the flake by adding `@Suite(.serialized)` or `--no-parallel` to CI | `grep -rn --include='*.swift' -e '.serialized' Tests` reviewed against SW-TEST-05; `grep -rn -e 'no-parallel' --include='*.yml' .github` |
| Hallucinates `@Test(.serialized(for: \Environment.self))` or `.serialized(for: *)` from the forum pitch | compile error `cannot call value of non-function type 'ParallelizationTrait'` (V2); G8 grep |
| Uses `.taskLocal(_:withValue:)`, `Trait.environment(...)`, or `Test.withEnvironment` as if they existed on 6.4 | compile error on 6.4; the doc says 6.5 |
| Binds `127.0.0.1:8080` / `:3000` for a test server, or writes `/tmp/test.json` | G2 grep |
| Puts a trailing `// comment` on a `@TaskLocal static var` line | build error `macro expansion @TaskLocal: expected ')'` |
| Locates fixtures with `#filePath`, `#file`, `FileManager.default.currentDirectoryPath + "/Tests/..."` or `"Tests/Fixtures/x.json"` | G4 grep; moved-tree run (V4) |
| Declares `resources: [.process("Fixtures")]` for a directory of captures | G5 grep; manifest build error on same-named files |
| Reads fixtures by listing the directory to feed `arguments:` (a deleted fixture silently drops a test case) | inventory test (SW-TEST-21) and the regions gate |
| Spawns the real CLI (`Process()` with `/usr/bin/env ocx`) inside the SDK core and tests it only on machines that have the CLI | G3/V7 grep; default test run under an empty `PATH` |
| Builds the gate on `lines` only, or adds `// LCOV_EXCL_LINE` expecting it to work | G6 grep; regions gate (V3 S7) |
| Copies a pre-NNBD `nonisolated async` test helper into an NNBD target, or leaves `ApproachableConcurrency` on the test target | V10 jq check; SW-CONC-12 grep |
| Marks the whole target `@testable import` and never notices a missing `public init` | G10 grep; compile with plain `import` in contract tests |
| Reaches for Mockable/Cuckoo to fake a CLI runner | the `Package.swift` grep (SW-TEST-24) |
| Asserts `Array(dict.keys) == [...]` | order check; `SWIFT_DETERMINISTIC_HASHING=1` reproduces |
| Treats a green run on glibc 2.43 as proof the `setenv` race is harmless | cross-run on a glibc 2.39 image (the `swift:6.3` image) |

## Contested / evolving

- **Cross-suite serialization.** Swift Testing's own team calls the current `.serialized` surprising and has a live pitch ([2026-04-17](https://forums.swift.org/t/pitch-data-dependent-test-serialization/86096), last substantive reply 2026-06-30) to add `.serialized(for:)` (keypath or `*`) and change plain `.serialized` to global. Community objections are to the `*` spelling, not the feature. Trend: lands in 6.5 or later; until then SW-TEST-08 stands. Re-check at each toolchain bump.
- **`TaskLocalTrait`.** Present on main as "introduced: 6.5"; when it ships, rule 18's step 2 shrinks to one line. As of 2026-10-10 absent from `swift-6.4.0-RELEASE`.
- **Inline coverage exclusion.** [llvm-project#33625](https://github.com/llvm/llvm-project/issues/33625) has been open since 2017; the 2026-06-13 PR was closed unmerged. If LLVM adds `--exclude-line-regex`/`--exclude-region-*` options, SwiftPM still exports its fixed JSON, so a Swift user would need `swift test` to forward flags first. Not expected before 6.6.
- **Mock macros.** `Mockable` is a single-repo habit (tuist); the trend in swiftlang repos is protocol or closure fakes. Disagreement is cultural, not technical, hence SHOULD.
- **libc and the env race.** glibc made `getenv` safe against concurrent `setenv` in 2.41 (commit 2024-11-21); musl, macOS and Windows semantics are unmeasured here. Treat the crash as a Linux-old-glibc finding and the value race as universal.
- **`@testable` for SDKs.** Corpus practice is majority `@testable` (54% of test files); the rule narrows it to contract suites. Disagreement: swift-format-style white-box suites legitimately need it.
- **Line vs region coverage for the 100% bar.** The Python original gates branch coverage (`branch = true`); Swift's line-only gate (SW-TEST-16) was a weaker port. Whether region coverage stays at 100% on real SDK code (generic specializations, `defer`, `catch` arms) is unmeasured beyond the fixture's 19/19.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://github.com/swiftlang/swift-testing/blob/swift-6.4.0-RELEASE/Sources/Testing/Traits/ParallelizationTrait.swift | The `ParallelizationTrait` source at the 6.4.0 tag (primary) | 2026-09 (6.4.0) | Shows all three `serialized(for:)` overloads are `@_spi(Experimental)` |
| https://github.com/swiftlang/swift-testing/blob/main/Sources/Testing/Testing.docc/Parallelization.md | Official "Running tests serially or in parallel" page (primary) | main, 2026-10 | What `.serialized` does and does not do; TODO for `serialized(for:)` |
| https://github.com/swiftlang/swift-testing/blob/main/Sources/Testing/Testing.docc/MigratingFromXCTest.md | XCTest migration guide (primary) | main, 2026-10 | The only official sentence on shared global state in tests |
| https://github.com/swiftlang/swift-testing/blob/main/Sources/Testing/Testing.docc/exit-testing.md | Exit-test documentation (primary) | main, 2026-10 | Child-process semantics that make `setenv` safe inside the body |
| https://github.com/swiftlang/swift-testing/blob/main/Sources/Testing/Traits/TaskLocalTrait.swift | `TaskLocalTrait`, `@Available(Swift, introduced: 6.5)` (primary) | main, 2026-10 | The built-in successor to the hand-written scoping trait |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/testing/0007-test-scoping-traits.md | ST-0007 Test scoping traits (primary) | Swift 6.1 | The sanctioned alternative to global mutable state |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/testing/0003-make-serialized-trait-api.md | ST-0003 `.serialized` public API (primary) | Swift 6.0 | Origin and stated scope of `.serialized` |
| https://forums.swift.org/t/pitch-data-dependent-test-serialization/86096 | Pitch by the Swift Testing maintainer: data-dependent serialization (primary, forum) | 2026-04-17 to 2026-06-30 | States the cross-suite limitation and the unmerged fix |
| https://github.com/swiftlang/swift-evolution/blob/main/visions/swift-testing.md | Swift Testing vision document (primary) | 2024 | Parallelism is meant to expose hidden dependencies |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0461-async-function-isolation.md | SE-0461 `nonisolated(nonsending)`, `@concurrent` (primary) | Swift 6.2 | Semantics behind the NNBD measurements |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0274-magic-file.md | SE-0274 `#file` / `#filePath` (primary) | Swift 5.3 | Why `#filePath` is an absolute compile-time path and `#sourceLocation` changes it |
| https://github.com/swiftlang/swift-package-manager/blob/main/Sources/PackageManagerDocs/Documentation.docc/BundlingResources.md | SwiftPM "Bundling resources" (primary) | main, 2026-10 | `.copy` vs `.process`, `Bundle.module`, "always use Bundle.module" |
| https://github.com/llvm/llvm-project/issues/33625 | LLVM issue: no way to exclude coverage for a line or region (primary tool repo) | open since 2017-08-22 | The upstream status for Q-T1 |
| https://github.com/llvm/llvm-project/pull/203723 | LLVM PR adding `LCOV_EXCL_*` markers to llvm-cov (primary tool repo) | opened and closed unmerged 2026-06-13 | Shows the capability is proposed, not shipped |
| https://llvm.org/docs/CommandGuide/llvm-cov.html | llvm-cov command guide (primary tool docs) | LLVM 21-22 era | File and function filters are the only exclusions |
| https://pubs.opengroup.org/onlinepubs/9799919799/functions/setenv.html | POSIX.1-2024 `setenv` (standard) | 2024 | "need not be thread-safe" |
| https://github.com/bminor/glibc/commit/7a61e7f557a9 | glibc commit "stdlib: Make getenv thread-safe in more cases" (primary libc) | 2024-11-21 (in glibc 2.41) | Explains why only the 2.39 image crashed |
| https://github.com/apple/containerization/blob/main/Makefile | containerization Makefile coverage ignore regexes (exemplar) | 2026 | Path-based coverage exclusion in a Swift repo |
| https://github.com/element-hq/element-x-ios/blob/develop/codecov.yml | element-x-ios codecov ignore list (exemplar) | 2026 | Directory and glob exclusion in a large app |
| https://github.com/swift-server/swift-aws-lambda-runtime/tree/main/Tests/AWSLambdaRuntimeTests | Lambda runtime tests with `setenv` and fixed ports (exemplar) | 2026 | The cross-suite and fixed-port hazards in shipped code |
| https://github.com/apple/container/blob/main/Tests/K8sPluginTests/KubeconfigMergeTests.swift | container's single serialized env suite (exemplar) | 2026 | The correct single-owner shape and its limit |
| https://github.com/swiftlang/swift-foundation/blob/main/Tests/FoundationEssentialsTests/FileManager/FilePlayground.swift | `CurrentWorkingDirectoryActor` (exemplar) | 2026 | A global-actor serializer for cwd changes |
| https://github.com/swiftlang/swift-nio/blob/main/Tests/NIOPosixTests/StrictCrashTests.swift | `setenv` inside an exit test (exemplar) | 2026 | The exit-test isolation pattern in a real repo |
| https://github.com/pointfreeco/swift-dependencies/blob/main/Sources/DependenciesTestSupport/TestTrait.swift | `TestScoping` trait over a task-local (exemplar) | 2026 | The pre-6.5 pattern by a widely used library |
| https://github.com/ocx-sh/ocx-sdk-python (local `/home/mherwig/dev/ocx-sdk-python@80136dde4162`) | The Python SDK being mirrored: `_process.py`, `tests/fixtures/`, `pyproject.toml` (project) | 2026-09 | The seam, 118 captured fixtures, 100% gate and its `monkeypatch` caveat |
