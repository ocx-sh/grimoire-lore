---
title: Swift topic map — fleet-shaped domain (CLIs, OCI/content-addressed stores, SDK-wraps-CLI, long-running services)
corpus: FLEET-SHAPED DOMAIN — the Swift the fleet would write
agent: landscape scout (research-lang swift, domain corpus)
model: claude-sonnet-5-5
date_researched: 2026-10-10
sources_count: 34
scope: |
  Covered: CLI construction and exit contract (swift-argument-parser, clig.dev), process spawning (swift-subprocess 1.0.x, Foundation.Process), file system/paths/atomic writes (swift-system, swift-foundation, NIOFileSystem, SE-0529), HTTP clients for registries (AsyncHTTPClient vs URLSession on Linux), OCI prior art in Swift (containerization, swift-container-plugin, container, swiftly), hashing, JSON/Codable on-disk formats, config (swift-configuration), logging (swift-log), signals/graceful shutdown (swift-service-lifecycle), testing CLIs.
  Not covered (other scouts own them): general concurrency model/Sendable theory, SwiftPM manifest depth, lint/format tool comparison, DocC, Bazel rules_swift, SwiftUI/Apple apps, macros, Embedded/Wasm/Android. Apple-only code (XPC, Virtualization, vmnet, Keychain) is read-only: no macOS/Xcode here.
  Evidence tiers used below: [read] = source reading in the exemplar corpus; [ran] = executed in the swift:6.4 Docker image (Linux x86_64 only, fixtures under swift-tools/fixtures/domain/); [web] = fetched primary page. Everything Swift-version-specific carries its version.
---

# Swift domain scout: CLIs, OCI stores, CLI-wrapping SDKs, services (researched 2026-10-10)

## Table of contents

1. [Summary](#summary)
2. [Survey](#survey)
   1. Release context: Swift 6.4 (swift.org)
   2. swift-argument-parser: ParsableCommand, AsyncParsableCommand, ExitCode, validation, completions, manual
   3. clig.dev and exit-code conventions
   4. swift-subprocess 1.0.x (SF-0007, SF-0037) and Foundation.Process
   5. SDK-wraps-CLI prior art: swiftly ModeledCommandLine
   6. Paths and file system: swift-system, SE-0529, SE-0513, NIOFileSystem, swift-foundation
   7. Atomic writes, locks, durability
   8. HTTP for registries: AsyncHTTPClient vs URLSession on Linux
   9. OCI prior art: containerization, swift-container-plugin, container
   10. Hashing, digests, content-addressing
   11. JSON, Codable, dates, determinism (ran)
   12. String and Unicode (ran)
   13. Configuration: swift-configuration
   14. Logging: swift-log
   15. Signals, cancellation, graceful shutdown: swift-service-lifecycle, SE-0493, SE-0504, SE-0526
   16. Terminal and TTY
   17. Testing CLIs: Swift Testing exit tests, XCTest holdovers
   18. Static Linux SDK and Windows divergence
   19. Concurrency escape hatches in the exemplars (H2 data)
3. [Candidate topics](#candidate-topics)
4. [Recent shifts seen in this corpus](#recent-shifts-seen-in-this-corpus)
5. [Contested](#contested)
6. [Hypothesis verdicts (H1-H8, this corpus only)](#hypothesis-verdicts-h1-h8-this-corpus-only)
7. [Sources](#sources)

## Summary

- The fleet has no Swift, so the closest grounding is Apple's own OCI/CLI code: `apple/containerization` (OCI client + content store, tools 6.2), `apple/container` (CLI), `apple/swift-container-plugin` (registry client + layer builder, tools 6.0), and `swiftlang/swiftly` (CLI that wraps `tar`/`git`/`gpg` through swift-subprocess). All four are Swift 6.x packages; all four contain concrete, citable defects and good patterns the rules can encode.
- `swift-subprocess` reached 1.0.0 on 2026-08-04 and 1.0.1 on 2026-10-09 (bug-fix, no API change); Swift 6.4 (blog dated 2026-09-15) names it a headline feature. It needs Swift 6.2+, throws only `SubprocessError` (typed codes such as `.executableNotFound`, `.outputLimitExceeded`), and makes the output limit explicit: `.string(limit:)`. Versions through 1.0.0 leak one file descriptor per `run()` when a `.sequence` loop breaks early and set close-on-exec non-atomically; 1.0.1 fixes both, so rules should pin `from: "1.0.1"`, not `exact: "1.0.0"` (swiftly does the latter).
- `Foundation.Process` is not retired, and the argument-parser's own test helper still calls `waitUntilExit()` before `readDataToEndOfFile()` (`TestHelpers.swift:423-428`). [ran] Process with `wait-first` ordering finished at 1 MiB but hung at 256 MiB on Linux (timeout, exit 124); read-first never hung. The deadlock threshold is unmeasured; treat read-before-wait as mandatory.
- Exit codes are a silent-failure surface. [ran] `throw ExitCode(256)` exits 0 and `ExitCode(300)` exits 44 (the shell sees the value mod 256). argument-parser maps validation/usage failure to `EX_USAGE` (64) on Unix, `ERROR_BAD_ARGUMENTS` on Windows, and `EXIT_FAILURE` on WASI (`Platform.swift:152-164`). A thrown ordinary error exits 1 with `Error: <description>` on stderr. `--help` writes stdout and exits 0.
- [ran] A top-level `await Probe.main()` on an `AsyncParsableCommand` resolves to the synchronous `main()` overload, compiles with an `unnecessary-effect-marker` warning, and at runtime exits 1 with "Asynchronous root command needs availability annotation" even on Linux. `@main` on the command is the working shape. argument-parser 1.8.0 (2026-05-25) raised the floor to Swift 6; 1.8.1 renamed the new async entry points to `asyncParse()`/`asyncParseAsRoot()` after a source break.
- Registry redirects are a credential-leak hazard. [ran] On Swift 6.4 Linux, `URLSession` forwarded a hand-set `Authorization: Bearer` header from `http://localhost:8089/redir` to `http://127.0.0.1:8089/echo` (different host). `swift-container-plugin` works around it with a `URLSessionTaskDelegate` (`RegistryClient.swift:108-151`: Docker Hub redirects to S3 and a forwarded header gets HTTP 400). `AsyncHTTPClient` strips `Authorization`, `Cookie`, `Origin`, `Proxy-Authorization` on cross-origin redirects (`RedirectState.swift:139-143`), and containerization disables redirects entirely for token exchange (`RegistryClient.swift:60,142`).
- Digest handling has a Unicode trap that Apple already hit. containerization's `ParsedDigest` validates over `utf8` and explains why in a comment (`Digest.swift:80-91`): `Character` comparison treats `"b" + U+0308` as inside `"a"..."f"`. [ran] confirmed: `("a"..."f").contains(Character("b\u{308}"))` is `true` while the UTF-8 test is `false`. The same file refuses digests that are not `sha256:<64 lowercase hex>`, which is narrower than the OCI grammar (sha512, blake3 are registered).
- Atomic file replacement is uneven. [read] swift-foundation `Data.write(options: .atomic)` writes a temp file beside the target, `fsync`s the file (not the directory), restores mode, then `renameat`s (`Data+Writing.swift:403, 669`). containerization's `ContentWriter.write(_:)` uses plain `data.write(to:)` with no `.atomic` into a content-addressed dir (`ContentWriter.swift:50`); NIOFileSystem's `replaceItem` is remove-then-move despite a doc comment citing `rename(2)` (`FileSystem.swift:574`); swiftly's lock is an exclusive-create PID file that survives a crash.
- JSON output order is not deterministic by default. [ran] the same `Encodable` struct encoded in separate processes printed keys in different orders (`{"u":..,"a":..}` vs `{"b":..,"m":..}`), and `Dictionary`/`Set` order changed per process. `.sortedKeys` sorts by UTF-8 bytes in swift-foundation (`JSONWriter.swift:300`), but Apple-framework builds keep a legacy `NSString` numeric/case-insensitive sort behind `compatibility1`. For content-addressed JSON, never re-encode to compute a digest: hash the received bytes.
- Date encoding has two traps. [ran] default `.deferredToDate` emits a `Double` since 2001-01-01 (`721692800.123456`); `.iso8601` drops fractional seconds (`2023-11-14T22:13:20Z` for `1700000000.123456`). Plain `Error.localizedDescription` is useless on Linux (`The operation could not be completed. (err.E error 0.)`); SE-0489 (6.3) made `DecodingError` print usefully (`DecodingError.keyNotFound: Key 'name' not found...`). Unknown JSON keys are ignored silently.
- Cancellation and cleanup got first-class support in 6.4: SE-0493 `await` in `defer` and SE-0504 `withTaskCancellationShield` (both Implemented 6.4); SE-0526 `withDeadline` is still "Accepted with modifications" after three review rounds. containerization still ships a hand-rolled `Timeout.run` (task group + `Task.sleep` throwing `CancellationError`), which cannot interrupt an operation that ignores cancellation.
- swift-service-lifecycle 2.12.1 (2026-10-05) is the signal/shutdown answer for long-running processes (`ServiceGroup`, `gracefulShutdownSignals`, `cancellationSignals`, `maximumGracefulShutdownDuration`); `UnixSignals` compiles to nothing on Windows and WASI. The fleet's CLIs that are not services should not pull it in; apple/container hand-rolls `signal()`+`exit(signal+128)` and calls `exit` inside a signal handler (`ProgressBar+RestoreCursor.swift:29`), which is not async-signal-safe.
- swift-log moved on: 1.16.0/1.16.1 (2026-10-07) require tools 6.2, and the docs now say libraries should read the task-local `Logger.current` or accept a `Logger`, never build their own (`003-AcceptingLoggers.md`). `LoggingSystem.bootstrap` is once-per-process (precondition); the default handler writes to stderr.
- swift-configuration exists and is 1.2.2 (2026-10-05): `ConfigReader`, providers ordered by priority (`EnvironmentVariablesProvider`, `CommandLineArgumentsProvider` via trait, `FileProvider<JSONSnapshot>`, `ReloadingFileProvider` via trait), secrets redaction through `AccessLogger`. AsyncHTTPClient already ships `HTTPClientConfiguration+SwiftConfiguration.swift`.
- swift-crypto 5.0.0 (2026-09-16) requires Swift 6.2 and marks public enums `@nonexhaustive` (SE-0487, Implemented 6.2.3); its README says depend on `"1.0.0" ..< "6.0.0"`. containerization pins `"3.0.0"..<"5.0.0"` and swift-container-plugin `"1.0.0"..<"5.0.0"`, both of which now conflict with a 5.x consumer in the same graph.
- Swift Testing is the default in the Apple CLI/OCI family (swift-argument-parser 60 files vs 0 XCTest, containerization 89 vs 0, container 122 vs 0, swiftly 23 vs 0) but not in the server/crypto libraries (async-http-client 5 vs 51, swift-crypto 0 vs 71, swift-system 2 vs 18). Exit tests (`#expect(processExitsWith:)`, Swift 6.2) run on macOS, Linux, FreeBSD, OpenBSD, Windows, so they can test `precondition` and CLI termination paths.
- Static Linux SDK (musl) is the CLI-distribution path: `swift build --swift-sdk x86_64-swift-linux-musl`; no `dlopen`, Foundation and SwiftNIO work, FoundationNetworking drags in libcurl/libz, and C-library packages need `canImport(Musl)` branches. swift-subprocess lists the static SDK as "Build only", not tested.
- SE-0529 (stdlib `FilePath`) is Accepted with modifications (2026-05/06) and deliberately not `Codable`; swift-system marks Windows "Unstable". Until it ships, `FilePath` from `SystemPackage` is the path type; `URL` normalisation is lossy ([ran] `URL(fileURLWithPath: "/a/b/../c//d/").standardized.path` is `/a/c//d`, double slash kept).

## Survey

### 1. Release context: Swift 6.4

Read [Swift 6.4 Released](https://www.swift.org/blog/swift-6.4-released/) (Joe Heck, Holly Borla). Dated **September 15, 2026** on the page; the frame's `releases.json` measurement says 2026-09-14 (a UTC/Pacific date split, not a contradiction worth resolving). Items relevant to this corpus:

- **Subprocess 1.0** is a headline: "a stable, cross-platform way to run and interact with other programs"; example `Subprocess.run(.name("ls"), arguments: ["-la"], output: .string(limit: 4096))`.
- **SE-0493** `await` in `defer`, **SE-0504** `withTaskCancellationShield`; the blog's own example wraps `await flushMetrics(for:)` in a shield inside `defer`.
- **Swift Build is now the default in SwiftPM** on Linux, macOS, Windows; **SE-0509** SBOM generation (SPDX or CycloneDX).
- **SE-0522** `@diagnose` source-level warning control; **SE-0521** `some Rocket?`; **SE-0491** module selectors (`Module::Name`).
- **SF-0023** `ProgressManager` async/await support; **ST-0021** `XCTAssert` inside Swift Testing and `#expect` inside XCTest; **ST-0024** `swift test` repeats test cases.
- Foundation: "FileManager support on WASI" improved; no Linux-specific FileManager or URLSession item is listed.
- Platform: Android SDK on LTS NDK 30; Embedded `EmbeddedRestrictions` warning (`.treatWarning("EmbeddedRestrictions", as: .warning)`).

### 2. swift-argument-parser

Read the repo [CHANGELOG](https://github.com/apple/swift-argument-parser/blob/main/CHANGELOG.md), `Sources/ArgumentParser/Utilities/Platform.swift`, `Parsable Types/AsyncParsableCommand.swift`, and tags (1.8.2 on 2026-06-04, 1.7.2 on 2026-07-08, both maintained lines).

- 1.8.0 (2026-05-25): minimum Swift raised to 6 (1.7.1 is the last older-toolchain release); `NameSpecification` is `ExpressibleByStringLiteral` (`"--hex-output -x"`); `@Option(defaultAsFlag:)` (works both as `--format` and `--format json`); completion closures for `AsyncParsableCommand` are `async` instead of `DispatchSemaphore`.
- 1.8.1: reverts a source break; async entry points are `asyncParse()`/`asyncParseAsRoot()`.
- 1.8.2: fixes `fish` completion scripts; Windows implicit-`Int32` warning. Unreleased: `CommandConfiguration.helpBanner`.
- 1.7.0 (2025-12-17): `@ParentCommand`; 1.6.0 (2025-06-30): `CompletionKind.custom` closure takes shell words, offset, prefix and may be `async`; the single-argument form is deprecated. 1.5.0: subcommand aliases (`CommandConfiguration.aliases`), grouped subcommand sections, `usageString`, `AsyncParsableCommand.main(_ arguments: [String]?) async`. 1.3.0: `ParsableCommand` types may be `Sendable`; `generate-manual` plugin renamed (`swift package generate-manual`), single-page default.
- Exit codes (`Platform.swift:136-166`): `exitCodeSuccess = EXIT_SUCCESS`, `exitCodeFailure = EXIT_FAILURE`, `exitCodeValidationFailure = EX_USAGE` (Unix), `Int32(ERROR_BAD_ARGUMENTS)` (Windows), `EXIT_FAILURE` (WASI). `ExitCode` is a `RawRepresentable` `Error` over `Int32` (`Parsable Properties/Errors.swift:35`). `CleanExit.message` exits 0 with text on stdout. Help width comes from `COLUMNS`/`LINES` overrides, then `TIOCGWINSZ` (`Platform.swift:217-291`); the parser does not look at `NO_COLOR` (it emits no color).
- Executed, [ran] (fixture `cli/`, ArgumentParser from the exemplar clone, Swift 6.4): `exit 0`→0, `exit 3`→3, `exit 256`→**0**, `exit 300`→**44**; thrown `Boom` →1 with `Error: boom happened` on stderr; `validate --n=-1` (validation) →64 with message + usage on stderr; unknown option →64; `clean` →0 stdout `bye`; `--help` →0 stdout. Note `--n -1` is parsed as a missing value, not as a negative number.
- Plugins in `Plugins/`: `GenerateManual` (man pages, multi-page or single-page) and `GenerateDoccReference`.

### 3. clig.dev and exit-code conventions

Read [clig.dev](https://clig.dev/) (full page). Rules that map to checkable Swift code:

- "Return zero exit code on success, non-zero on failure ... Map the non-zero exit codes to the most important failure modes." "Send messaging to stderr." Log messages and errors go to stderr; primary output to stdout.
- TTY: "The most simple and straightforward heuristic for whether a particular output stream (stdout or stderr) is being read by a human is whether or not it's a TTY"; check stdout and stderr individually. Disable color when `NO_COLOR` is set and non-empty, when `TERM=dumb`, when the stream is not a TTY; offer `--no-color`; `--json` for machine output; `-q`; `--no-input`; prompts only when stdin is a TTY.
- Signals: on Ctrl-C "exit as soon as possible"; skip long cleanup; tell the user what a second Ctrl-C does ("Docker Compose" example); "Make it crash-only."
- Config precedence (highest to lowest): flags, process env, project-level config, user-level config, system-wide; follow XDG.
- apple/container's `SignalThreshold(threshold: 3, signals: [SIGINT, SIGTERM])` (`ContainerRun.swift:164-168`) is the "press again to force" pattern; it exits via `Darwin.exit(1)`, which does not compile on Linux.

### 4. swift-subprocess 1.0.x and Foundation.Process

Read the [README](https://github.com/swiftlang/swift-subprocess/blob/main/README.md), [SF-0037 Subprocess 1.0 Update](https://github.com/swiftlang/swift-foundation/blob/main/Proposals/0037-subprocess-1.0.md), [SF-0007](https://github.com/swiftlang/swift-foundation/blob/main/Proposals/0007-swift-subprocess.md), and release notes for [1.0.0](https://github.com/swiftlang/swift-subprocess/releases/tag/1.0.0) and [1.0.1](https://github.com/swiftlang/swift-subprocess/releases/tag/1.0.1).

- Versions: `1.0.0-beta.1` 2026-07-02; `1.0.0` 2026-08-04; `1.0.1` 2026-10-09. Toolchain floor table: 0.1-0.4 need 6.1; 0.5.x and 1.0.x need Swift 6.2 / Xcode 26. SF-0037 "Drop Swift 6.1 Support": tools version 6.2, `RawSpan` is the single currency type, `OutputProtocol`/`InputProtocol` are `~Copyable`.
- One trait: `SubprocessFoundation` (default on; adds `Data` conveniences). swiftly disables it: `.package(url: ".../swift-subprocess", exact: "1.0.0", traits: [])` (`Package.swift:34`).
- API: `run(_ executable: Executable, arguments:, environment:, workingDirectory:, platformOptions:, input:, output:, error:)`; `Executable` is `.name("ls")` (PATH lookup) or `.path(...)`; `Environment` is `.inherit.updating([...])`; closure form gives `Execution` with `standardOutput`/`standardError` `SubprocessOutputSequence` and `standardInputWriter`; `.strings()` yields lines (`bufferingPolicy: .maxLineLength(1024)`, `as: UTF16.self`); results are `ExecutionResult` with `terminationStatus`, `standardOutput`, `standardError`, `closureResult`.
- Output factories require an explicit limit (`.string(limit:)`, `.bytes(limit:)`, `.data(limit:)`); the 128 KB implicit cap from SF-0007 is gone. `StringOutput.OutputType` is non-optional `String`, decoded with `String(decoding:as:)`, so invalid bytes become U+FFFD. [ran] `printf 'a\377b'` yields scalars `[97, 65533, 98]`. `error:` defaults to `.discarded`; `.combinedWithOutput` = `2>&1`.
- `TerminationStatus` is `.exited(code)` or (Unix only) `.signaled(code)`, `isSuccess`. [ran] `kill -TERM $$` → `signaled(15)`; `exit 3` → `exited(3)`. Windows has only `.exited` (SF-0037 "Redesign TerminationStatus on Windows").
- Errors: only `SubprocessError` escapes `run` (typed throws internally) plus whatever the body closure throws. Codes include `.spawnFailed`, `.executableNotFound`, `.failedToChangeWorkingDirectory`, `.failedToMonitorProcess`, `.failedToReadFromSubprocess`, `.failedToWriteToSubprocess`, `.outputLimitExceeded`, `.asyncIOFailed`, `.processControlFailed`. [ran] missing binary → `executableNotFound` with underlying `No such file or directory`; `yes | head -c 5000` with limit 100 → `outputLimitExceeded`.
- Teardown: `PlatformOptions.teardownSequence = [.send(signal:toProcessGroup:allowedDurationToNextStep:), .gracefulShutDown(toProcessGroup:allowedDurationToNextStep:)]`; the last step is always kill; on Windows `gracefulShutDown` is `WM_CLOSE`, then `CTRL_C_EVENT`, then `CTRL_BREAK_EVENT`. [ran] cancelling the task around `run` with a 2 s graceful step: `run` **returned** normally (no throw) in 0.50 s with `exited(7)` from a `trap 'exit 7' TERM` child. When the child's trap also wrote to stdout, the status was `signaled(13)` (SIGPIPE): the output pipe was already closed after cancellation.
- 1.0.1 fixes (all in the release note): `.sequence` pipes leaked one descriptor per `run()` when the body broke out early (#369); pipes created and duplicated with close-on-exec atomically (#373); `supplementaryGroups: []` now drops groups (#384); Linux/FreeBSD now prefer `posix_spawn` over `fork`/`exec` (#365).
- Platform table in the README: macOS, Ubuntu 22.04/24.04, UBI 9, Debian 12, Amazon Linux 2023, Windows 11, Android, FreeBSD automated; Static Linux SDK build only; OpenBSD manual.
- `Foundation.Process` pitfalls, argument-parser's helper shows two at once (`ArgumentParserTestHelpers/TestHelpers.swift:423-428`): `waitUntilExit()` before reading, and stdout read to EOF before stderr is touched. [ran] `Process` + `head -c N /dev/zero`: N=1 MiB finished both orders; N=256 MiB hung in wait-first order (timeout 40 s, exit 124).

### 5. SDK-wraps-CLI prior art: swiftly

Read `swiftlang/swiftly` `Sources/SwiftlyCore/ModeledCommandLine.swift`, `Platform+Process.swift`, `Sources/Swiftly/Proxy.swift`, `Package.swift`.

- Shape: a `Runnable` protocol returning `Configuration`, generated command models (`git.json`, `tar.json`, `swift.json` 1.8 MB) via a `GenerateCommandModels` build plugin. Failure = `RunProgramError(terminationStatus:config:)` thrown when `!isSuccess`.
- **Defect, [read] confirmed by line**: in `Output.output(...)` the local `c` is built with `c.environment = environment` (`ModeledCommandLine.swift:64,67`) but `Subprocess.run` is then called with `self.config()` (`:71`, `:83`, `:109`, `:122`), discarding the override. Any SDK that sets env on a copy and runs the original has this bug; verifiable by a test that sets a sentinel env var.
- `Output.output(limit _: Int ...)` ignores `limit` in the streaming overload (`:98`).
- `Proxy.swift:90-102`: maps `.exited(code)` to `exit(code)` but `.signaled` to `exit(1)`, losing `128+signal`.
- `Platform+Process.swift`: builds `PATH` by splitting on `":"` (not Windows-safe) and removes its own bin dir from `PATH` plus a `SWIFTLY_PROXY_IN_PROGRESS` env sentinel to avoid proxy recursion.

### 6. Paths and file system

Read [swift-system README](https://github.com/apple/swift-system) (1.8.1, 2026-08-14), [SE-0529](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0529-filepath-in-stdlib.md), [SE-0513](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0513-commandline-executablepath.md), the [SE-0529 review thread](https://forums.swift.org/t/se-0529-add-filepath-to-the-standard-library/86194) (John McCall, 2026-04-23), `_NIOFileSystem` in swift-nio.

- swift-system: "not a cross-platform library"; source stability Darwin and POSIX stable, **Windows Unstable**; 1.7.0-1.8.x need Swift 6.1. Usage: `FileDescriptor.open(path, .writeOnly, options: [.append, .create], permissions: .ownerReadWrite)` and `fd.closeAfter { ... }`.
- SE-0529 (Accepted with modifications): `FilePath` in the stdlib, stores the native encoding (components "not necessarily valid Unicode"), `FilePath.Anchor` for drive letters, UNC shares, `\\?\`; `resolve()` is synchronous and `@available(*, noasync)`; lexical `..` collapsing and "does a subpath escape a base" are listed as future work. Not `Codable` by design (reviewers agree; "don't attempt to use Foundation.URL for this purpose"). SE-0513 (Accepted): a stdlib way to get the running executable path.
- [ran] FileManager on Linux: `contentsOfDirectory` returned `["10","9","a","b","B","c"]` (filesystem order, unspecified); `URL(fileURLWithPath: "/a/b/../c//d/").standardized.path` kept the `//`; `fileExists` through a symlink loop returned true.
- NIOFileSystem (`_NIOFileSystem`, underscored: not SemVer, per swift-crypto's stated convention): `FileHandle.synchronize()`, `withTemporaryDirectory`, `moveItem`, `replaceItem`. `replaceItem` is `removeItem(destination)` then `moveItem` then `removeItem(existing)` (`FileSystem.swift:574-576`), while its doc comment says "Uses the `rename(2)` system call" (`:530,564`): a crash between steps leaves no file.
- containerization avoids FilePath/URL pitfalls for destinations with `ParsedDigest.path(in:)` (`Digest.swift:119-131`), whose comment explains `resolvingSymlinksInPath()` treats existing vs non-existing paths differently (`/private` prefix on Darwin), so root and child must be resolved once.

### 7. Atomic writes, locks, durability

Read swift-foundation `Data+Writing.swift`, container `ConfigurationLoader.swift`, containerization `ContentWriter.swift`, swiftly `FileLock.swift`.

- `Data.write(to:options:.atomic)` (swift-foundation@aadd9259be07, `Sources/FoundationEssentials/Data/Data+Writing.swift`): pins the destination directory with `open(parent, O_DIRECTORY...)`, `fstatat` for the existing mode (TOCTOU comment at `:587`), creates a temp via `createProtectedTemporaryFile` (`:318`), writes, `fsync(fd)` (`:403`; Windows `_commit`; on Linux `EINVAL` from special files ignored), `fchmod`, `renameat` (`:669`). On `EINVAL` (DOS filesystems) it falls back to a non-atomic swap (`:671-690`); on `EBUSY` it retries non-atomically (`:694`). The parent directory is never fsynced. [ran] `.atomic` into a missing directory throws `NSCocoaErrorDomain 4` ("The operation could not be completed. The file doesn't exist.", no path). `.withoutOverwriting` on an existing file throws `NSCocoaErrorDomain 516`, and `error as? CocoaError == .fileWriteFileExists` is true on Linux.
- container `ConfigurationLoader.swift:186-217`: copy to `.<name>.<globallyUniqueString>` beside the target, `chmod` read-only, `rename(2)` with a comment that it replaces without following symlinks; no fsync.
- containerization `ContentWriter`: `write(_ data:)` is a plain `data.write(to: destination)` (`:50`); `create(from:)` streams a 1 MiB-chunk copy into `UUID().uuidString` temp, then `moveItem` to the digest name and swallows `NSFileWriteFileExistsError` (`:66`); `copy(from:destination:)` opens source with `O_NOFOLLOW`, requires `S_IFREG`, creates destination `O_EXCL` (`:80-98`), loops partial writes, hashes while copying. No fsync anywhere in the store.
- swiftly `FileLock`: lock = `contents.write(to: url, options: .withoutOverwriting)` of the PID; catches `CocoaError.fileWriteFileExists` (`:34-35`), polls every 1 s up to 300 s with random jitter, stale after crash ("manually remove the lock file").

### 8. HTTP for registries

Read [async-http-client README](https://github.com/swift-server/async-http-client) (1.36.2, 2026-09-25), `RedirectState.swift`, container-plugin `HTTPClient.swift`/`RegistryClient.swift`, containerization `RegistryClient*.swift`, the [static SDK article](https://www.swift.org/documentation/articles/static-linux-getting-started.html).

- AsyncHTTPClient: `HTTPClient.shared.execute(request, timeout: .seconds(30))`; `response.body.collect(upTo: 1024 * 1024)` or `for try await buffer in response.body` (backpressure propagates); "If you create your own `HTTPClient` instances, you should shut them down using `httpClient.shutdown()` ... Failing to do so will leak resources"; redirects: `HTTPClient.shared` follows by default, custom clients opt in; cross-origin redirect strips `Origin`, `Cookie`, `Authorization`, `Proxy-Authorization` (`RedirectState.swift:139-143`); 1.36.0 added proxy headers; ships Swift Configuration integration.
- swift-container-plugin chose `URLSession` (`HTTPClient.swift:16-17` imports `FoundationNetworking`; `extension URLSession: HTTPClient` `:57`), ephemeral configuration (`RegistryClient.swift:107-111`), and a delegate to strip `Authorization` on redirect on Linux (`:110, 139-151`, citing whatwg fetch redirect rules and the Docker Hub to S3 400). It sets `Authorization` by hand (`HTTPClient.swift:158-161`, citing Apple's URLSessionConfiguration warning).
- [ran] URLSession (FoundationNetworking, libcurl-backed per the static-SDK article's "Foundation Networking uses libcurl and libcurl uses libz") forwarded `Authorization: Bearer SECRET` across hosts: response body `path=/echo host=127.0.0.1:8089 auth=Bearer SECRET`. Test fixture: `fixtures/domain/srv.pl` + `redir.swift`.
- containerization: `AsyncHTTPClient` for data, a second `tokenClient` with `redirectConfiguration = .disallow` (`RegistryClient.swift:60,141-143`), refuses credentials over non-https (`:208-209` `insecureCredentialExchange`), 3 retries at `1_000_000_000` ns only for `status.code >= 500` (`:48-54`), no backoff growth, and `client.execute(request, deadline: .distantFuture)` (`:202`): no wall-clock deadline.
- Response header digests are validated before use (`Fetch.swift:61-69`), `Content-Length` is checked against the descriptor size (`:177-190`), received bytes are re-checked chunk by chunk (`validateReceivedSize`).
- macOS/Linux split: `fetchBlob(...into:)` has an `#if os(macOS)` branch using `_NIOFileSystem` buffered writer and an `#else` branch using `FileHandle` + `createFile` (`+Fetch.swift:197-262`); the two differ in `replaceExisting` semantics (the `.newFile(replaceExisting: true)` vs `createFile` truncation) and error handling.

### 9. OCI prior art in Swift

Read containerization (0.33.3 tag 2026-06-01, tools 6.2), swift-container-plugin (1.4.0, 2026-09-25, tools 6.0, containertool built with `.swiftLanguageMode(.v5)`), container. Key structures:

- `ContainerizationOCI`: `Descriptor`, `Index`, `Manifest`, `MediaType`, `Platform`, `Reference`, `Spec` (31.7 KB), `LocalContentStore`, `ContentWriter`, `ParsedDigest`, `RegistryClient` (+Fetch, +Push, +Token, +Referrers, +Catalog), `LocalOCILayoutClient`.
- `ContentWriter` encoder is `JSONEncoder` with `.sortedKeys` (`ContentWriter.swift:32`), digest = SHA256 of the encoded bytes; this is only sound if the bytes written are the bytes that were hashed (they are: `create(from:)` encodes once, `write` hashes `data`).
- `ContainerizationArchive.ArchiveReader.extractContents(to:)` (`ArchiveReader.swift:260-300`): fd-relative extraction, `openat(... O_WRONLY|O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC)` (`:369`), rejects `..` members and symlink traversal; `FileDescriptorOps.swift:86-94` documents `O_RESOLVE_BENEATH` (Darwin) and notes `openat2` + `RESOLVE_BENEATH` (Linux 5.6+) is not used. This is the best untrusted-archive example in the corpus.
- swift-container-plugin: tar writer defaults `uid=0`, `mtime=0` (`Tar/tar.swift:204-213, 264-267`); `gzip.swift:38-61` forces the zlib header OS byte to 255 ("Force identical gzip headers to be created on Linux and macOS"), so layer digests match across platforms (compressed bytes may still differ by zlib version, per its own comment); digest of a blob via `SHA256.hash(data:)` over the whole `Data` plus `String(format: "%02x")` hex (`ImageReference+Digest.swift:36-45`, `try!` on init).
- container: `Application.swift:101-141` custom `main()` calling `parseAsRoot` then `run()`, `Application.exit(withError:)`, and an error rewrite keyed on `String(describing: error).contains("XPC connection error")` (`:136`); `ContainerRun.swift:180` `throw ArgumentParser.ExitCode(exitCode)` propagates the container's exit status; `ProgressBar+RestoreCursor.swift:20-39` installs `signal(SIGINT/SIGTERM)` handlers that call `exit(signal + 128)` and an `atexit` hook that constructs a `ProgressBar`.

### 10. Hashing and content addressing

Read [swift-crypto README](https://github.com/apple/swift-crypto) (5.0.0, 2026-09-16), [OCI descriptor spec](https://github.com/opencontainers/image-spec/blob/main/descriptor.md), [OCI distribution spec](https://github.com/opencontainers/distribution-spec/blob/main/spec.md), containerization `Digest.swift`, `SHA256+Extensions.swift`.

- swift-crypto 5.0.0: minimum Swift 6.2; "mechanically marked all non-frozen public enums in CryptoKit as `@nonexhaustive`"; depend on `"1.0.0" ..< "6.0.0"`; on Apple platforms it re-exports CryptoKit; elsewhere vendors BoringSSL; `CryptoExtras` bundles BoringSSL on every platform; symbols beginning with `_` are outside SemVer.
- Streaming: `var hasher = SHA256(); hasher.update(data: UnsafeRawBufferPointer...); hasher.finalize()` in `ContentWriter.copy` (`:114-137`) and `fetchBlob` (`+Fetch.swift`), versus whole-blob `SHA256.hash(data:)` in container-plugin.
- `SHA256.Digest.description` is `"SHA256 digest: <hex>"`; containerization derives `encoded` by `description.split(separator: ": ")` (`SHA256+Extensions.swift:23,29`) while its newer `ParsedDigest` has its own validated type. Relying on `description` formatting is fragile.
- OCI grammar: `digest ::= algorithm ":" encoded`, `algorithm-component ::= [a-z0-9]+`, `encoded ::= [a-zA-Z0-9=_-]+`; for `sha256`, "the encoded portion MUST match `/[a-f0-9]{64}/` ... `[A-F]` MUST NOT be used"; `sha512` 128 hex; `blake3` 64 hex. Distribution spec: clients MUST verify `Docker-Content-Digest` if they use it, SHOULD verify a manifest fetched by digest. `ParsedDigest.algorithm = "sha256"` only (`Digest.swift:38`), a deliberate subset.

### 11. JSON, Codable, dates, determinism

Read swift-foundation `JSONEncoder.swift:61-101`, `JSONWriter.swift:270-312`, [SE-0489](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0489-codable-error-printing.md). Ran fixtures `dict.swift`, `err.swift` (Swift 6.4, Linux).

- `OutputFormatting`: `.prettyPrinted`, `.sortedKeys` ("sorts keys in lexicographic order"), `.withoutEscapingSlashes` (default escapes `/` as `\/`, [ran] `"https:\/\/x.io\/a\/b"` vs `"https://x.io/a/b"`).
- Implementation: non-Apple-framework path sorts with `a.key.utf8.lexicographicallyPrecedes(b.key.utf8)` (`JSONWriter.swift:300`); `FOUNDATION_FRAMEWORK` builds under `JSONEncoder.compatibility1` use `NSString.compare` with `[.numeric, .caseInsensitive, .forcedOrdering]` (`:274-290`), so key order can differ between Darwin and Linux for the same type.
- [ran] without `.sortedKeys`, two process runs printed different key orders for the same struct and dictionaries. With `SWIFT_DETERMINISTIC_HASHING=1`, `Dictionary` and `Set` iteration became stable across two runs (still a hash order, not sorted); unset, each run differed.
- Dates: `dateEncodingStrategy` default `.deferredToDate` (`JSONEncoder.swift:254, 381`). [ran] value `Date(timeIntervalSince1970: 1_700_000_000.123456)` → `721692800.123456`; `.iso8601` → `"2023-11-14T22:13:20Z"` (fraction lost).
- Decoding [ran]: unknown keys ignored (`futureField` dropped silently); `Int8` from `300` → `nil` via `try?`; `9007199254740993` decoded as `Double` → `9007199254740992.0` (Int64 above 2^53 through Double loses bits).
- Errors [ran] `err.swift`: `String(describing: DecodingError)` prints `DecodingError.keyNotFound: Key 'name' not found in keyed decoding container. Debug description: ...` (SE-0489, 6.3); `localizedDescription` for a `DecodingError` is `The operation could not be completed. The data is missing.`; for a plain `enum E: Error` it is `The operation could not be completed. (err.E error 0.)`; a `LocalizedError.errorDescription` is honored.

### 12. String and Unicode

[ran] `dict.swift`: `"e\u{301}"` has `count 1`, `utf8.count 3`, `unicodeScalars.count 2`; `"e\u{301}" == "\u{e9}"` is `true` (canonical equivalence); `"caf\u{e9}".hasPrefix("cafe\u{301}")` is `true`; `"🇩🇪".count == 1`; `"👨‍👩‍👧".count == 1` with `utf16.count == 8`; `("a"..."f").contains(Character("b\u{308}"))` is `true` but a UTF-8 byte test of the same string is `false`. Consequences: use `utf8` for protocol grammars (digests, media types, header names, tar/OCI names); use `FilePath` components for file names (byte-wise on Linux) rather than `String ==`, because two canonically equal strings can name two different files. `String(decoding: bytes, as: UTF8.self)` never fails and substitutes U+FFFD; `String(data:encoding:)` can return `nil`.

### 13. Configuration

Read [swift-configuration README](https://github.com/apple/swift-configuration) (1.2.2, 2026-10-05) and `Guides/Configuring-applications.md`.

- `ConfigReader(providers: [EnvironmentVariablesProvider(), try await FileProvider<JSONSnapshot>(filePath: "/etc/myapp/config.json", allowMissing: true), InMemoryProvider(values: [...])], accessReporter: AccessLogger(logger: logger))`; `config.int(forKey: "http.timeout", default: 60)`; `config.scoped(to: "http.client")`. Providers resolve in listed order (first wins).
- Traits: `JSON` (default), `Logging`, `Reloading`, `CommandLineArguments`, `YAML`, `PropertyList`. Platforms: macOS 15+, iOS 18+, Android API 28+, Linux. Guides: `Handling-secrets-correctly`, `Choosing-access-patterns`, `Using-reloading-providers`.
- AsyncHTTPClient depends on it (`HTTPClientConfiguration+SwiftConfiguration.swift:15`). Environment key mapping (`http.timeout` -> `HTTP_TIMEOUT`) is the README's own example. No fleet CLI contract (flags > env > project > user) is encoded by the library; it must be composed.

### 14. Logging

Read [swift-log](https://github.com/apple/swift-log) 1.16.1 (2026-10-07), `LoggingSystem.swift`, `Docs.docc/BestPractices/003-AcceptingLoggers.md`, release notes 1.15.0-1.16.0.

- `LoggingSystem.bootstrap` is once per process: "calling it more than once will lead to a crash" (precondition, `LoggingSystem.swift:31-45`); default handler is `StreamLogHandler.standardError` (`:30`); `StreamLogHandler.standardOutput/standardError(label:)` initializers public since 1.15.0.
- Best-practice 003: "Propagate caller context by accepting a `Logger` parameter or reading the task-local `Logger.current` ... never by constructing your own logger"; `withLogger(_:)` and `withLogger(mergingMetadata:)`; `Logger.taskLocalLogger` (`Logger.swift:1472-1535`). 1.16.0 requires tools 6.2 and fixes task-local handler/level replacement. swift-service-lifecycle 2.12.0 defaults its logger to `Logger.current`.
- container's `private nonisolated(unsafe) var bootstrapLogger` (`Application.swift:30`) is mutated in `validate()` (`:150`).
- container-plugin logs via its own `fputs(string, stderr)` helper (`Logging.swift`), no swift-log.

### 15. Signals, cancellation, graceful shutdown

Read [swift-service-lifecycle](https://github.com/swift-server/swift-service-lifecycle) 2.12.1 (README, `ServiceGroupConfiguration.swift`, `UnixSignalsSequence.swift`, DocC "Adopting ServiceLifecycle in libraries"), [SE-0493](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0493-defer-async.md), [SE-0504](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0504-task-cancellation-shields.md), [SE-0526](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0526-deadline.md), [SE-0329](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0329-clock-instant-duration.md).

- `Service.run() async throws`; `ServiceGroup(services:, gracefulShutdownSignals: [.sigterm], logger:)`. Config: `gracefulShutdownSignals`, `cancellationSignals`, `maximumGracefulShutdownDuration`, `maximumCancellationDuration`. "Returning from your `run()` method" is a failure by default (`successTerminationBehavior` overrides). Library guidance: use structured concurrency, never `init { Task { ... } }` (the doc's TCPEchoClient counter-example). 2.12.0: drops Swift 6.0; "Remember graceful shutdown requested before run".
- `UnixSignalsSequence` bodies are `#if !os(Windows) && !os(WASI)`; Windows has no signal-based shutdown through this library.
- SE-0493 (Implemented 6.4): `await` in `defer`; prior workaround `defer { Task { await cleanup() } }` ("We'll clean this up... eventually"). SE-0504 (Implemented 6.4): `withTaskCancellationShield`, with a `nonisolated(nonsending)` overload; the proposal's pre-shield workaround is `await Task { resource.cleanup() }.value`, which breaks the task tree. Shield plus async defer = cleanup that completes after cancellation.
- SE-0526 `withDeadline` takes a `ContinuousClock` instant, cancels the operation at the deadline; review history: review, returned, second review, returned, third review; now "Accepted with modifications", PR swiftlang/swift#91190 (no version on the page). SE-0329: `ContinuousClock` keeps counting while the machine sleeps; `SuspendingClock` does not.
- containerization `Timeout.run` (task group, `Task.sleep` then `throw CancellationError()`, `ContainerizationExtras/Timeout.swift`) cannot stop an operation that does not check cancellation (the group waits for all children before returning), and reports a timeout as `CancellationError`. `AsyncLock` (`AsyncLock.swift`) is an actor with a continuation queue designed against reentrancy, but waiters use `withCheckedContinuation`, which is not cancellable.
- Signal handler styles in the corpus: DispatchSource-based `AsyncSignalHandler` (`ContainerizationOS/AsyncSignalHandler.swift`: `signal(sig, SIG_IGN)`, `DispatchSource.makeSignalSource`, `AsyncStream<Int32>`, state in `Mutex<State>` with `nonisolated(unsafe) var sources`), container's `signal()` + `exit(signal+128)`, ServiceLifecycle's `UnixSignalsSequence`.

### 16. Terminal and TTY

container `Application.swift:104-111` checks `isatty(FileHandle.standardError.fileDescriptor) == 1` before emitting `\u{001B}[33m`, only in `DEBUG`; swiftly `Terminal.swift` reads width with `ioctl(STDOUT_FILENO, UInt(TIOCGWINSZ), &size)`, default 80, with an OpenBSD special case; argument-parser reads `COLUMNS`/`LINES`. [ran] under the Docker wrapper without `-t`, `isatty(1)` and `isatty(2)` were 0 and `NO_COLOR` was unset. No exemplar reads `NO_COLOR`; none implements `--no-color`.

### 17. Testing CLIs

Read [swift-testing exit-testing.md](https://github.com/swiftlang/swift-testing/blob/main/Sources/Testing/Testing.docc/exit-testing.md), argument-parser test helpers, import counts.

- Exit tests: `@Metadata { @Available(Swift, introduced: 6.2) }`; "available on macOS, Linux, FreeBSD, OpenBSD, and Windows"; `await #expect(processExitsWith: .failure) { ... }` re-launches the same executable; cannot nest. Conditions include `.success`, `.failure`, `.exitCode(n)`, `.signal(s)`.
- argument-parser `AssertExecuteCommand` runs a real binary through `Process` for end-to-end (`TestHelpers.swift:401-428`), plus in-process `parseAsRoot` helpers for parse/validation tests.
- Swift Testing vs XCTest import counts per Tests tree (files containing `import Testing` / `import XCTest`): argument-parser 60/0, containerization 89/0, container 122/0, swiftly 23/0, swift-log 18/0, container-plugin 8/0, SwiftPM 173/110, async-http-client 5/51, swift-system 2/18, service-lifecycle 1/6, swift-crypto 0/71.
- 6.4: ST-0021 lets `XCTAssert` run in Swift Testing tests and `#expect` in XCTest (migration aid); ST-0024 `swift test` repeats.

### 18. Static Linux SDK and Windows divergence

Read the [static SDK article](https://www.swift.org/documentation/articles/static-linux-getting-started.html), swift-foundation Windows branches, swift-subprocess platform notes.

- Static SDK: "There is no support for dynamic linking whatsoever — even the `dlopen()` function will not work"; `swift build --swift-sdk x86_64-swift-linux-musl` (and `aarch64-swift-linux-musl`); built on Musl (`musl@1.2.5`); "Swift packages that make use of Foundation or SwiftNIO should just work"; packages importing C libraries need `#if canImport(Musl) import Musl`; Foundation Networking uses libcurl, libcurl uses libz ("pay for what you use"). containerization's `AsyncSignalHandler.swift` already branches on `canImport(Musl)`.
- Windows: argument-parser exit code for usage errors is 160; `UnixSignals` empty; `TerminationStatus` lacks `.signaled`; `Data.write(.atomic)` uses `FILE_RENAME_FLAG_POSIX_SEMANTICS` with `MoveFileExW(MOVEFILE_COPY_ALLOWED|MOVEFILE_REPLACE_EXISTING)` fallback (`Data+Writing.swift:560-585`); swift-system Windows "Unstable"; `WindowsError` is an enum over NTSTATUS/Win32/HRESULT/errno in swift-subprocess.

### 19. Concurrency escape hatches in the exemplars (H2 data for this domain)

Counted with `grep` over each `Sources/`: `@unchecked Sendable` / `nonisolated(unsafe)` / `Task {}` or `Task.detached` / lock types.

| Repo | `@unchecked Sendable` | `nonisolated(unsafe)` | Task{}/detached | Mutex/Locked types |
|---|---|---|---|---|
| containerization | 4 | 17 | 14 | 33 |
| container | 2 | 16 | 18 | 6 |
| swiftly | 0 | 0 | 0 | 0 |
| swift-container-plugin | 0 | 0 | 0 | 0 |
| async-http-client | 7 | 1 | 5 | 15 |

Where `nonisolated(unsafe)` appears, it is mostly generated protobuf statics (`static nonisolated(unsafe) let defaultInstance`, with a comment that it is safe) and non-Sendable C/XPC handles (`xpc_connection_t`, `vmnet_network_ref`, `VZVirtualMachine`) in `container`/`containerization`; the one mutable-global case is `Application.swift:30` `bootstrapLogger`. swiftly and container-plugin avoid the topic: swiftly uses no unchecked escape (its `FileLock`/`Terminal`/`Platform` types are plain structs).

## Candidate topics

Priority is for THIS project shape (fleet CLIs, SDKs wrapping a CLI, OCI/content-addressed stores, long-running services). "Covered" is against the sibling lore sets named in the task; the Rust/Go/Python sets carry CLI-contract and durable-state depth files that state the language-neutral contract, so contract-level topics are `partial` and Swift API binding is `no`.

| # | Topic (question) | Why it matters | Source | Covered? | Surface | Priority |
|---|---|---|---|---|---|---|
| 1 | What entry-point shape must a Swift CLI use for `AsyncParsableCommand` (`@main` on the root command vs `await Cmd.main()`), and how does a reviewer spot the wrong one? | Wrong shape compiles with a warning and exits 1 on every invocation, [ran] | https://github.com/apple/swift-argument-parser (AsyncParsableCommand.swift) | no | cli | P0: every CLI starts here |
| 2 | How must exit codes be derived (`ExitCode(Int32)`, `EX_USAGE` 64 vs Windows 160, 128+signal, values above 255) and what test pins them? | `ExitCode(256)` exits 0 [ran]; swiftly maps `.signaled` to 1 | https://github.com/apple/swift-argument-parser/blob/main/CHANGELOG.md | partial (rust/go/python cli-contract) | cli | P0: silent-success class |
| 3 | When may a Swift program call `exit()`/`Darwin.exit`/`fatalError` instead of throwing, and why is `exit` inside a signal handler wrong? | container uses `Darwin.exit` (macOS-only) and `exit` in a `signal()` handler | https://github.com/apple/container (ProgressBar+RestoreCursor.swift:29) | no | cli | P1: portability + signal safety |
| 4 | Which process API for new code: swift-subprocess ≥ 1.0.1 or `Foundation.Process`, and what is the manifest declaration (`from: "1.0.1"`, `traits: []`)? | 1.0.0 leaks an fd per early-break `.sequence` loop; needs Swift 6.2 | https://github.com/swiftlang/swift-subprocess/releases/tag/1.0.1 | no | any | P0: the SDK-wraps-CLI foundation |
| 5 | How is subprocess output bounded and decoded (`limit:` required, U+FFFD substitution, `.combinedWithOutput`, stderr discarded by default)? | Unbounded capture = memory DoS; invalid UTF-8 silently altered [ran] | https://github.com/swiftlang/swift-foundation/blob/main/Proposals/0037-subprocess-1.0.md | no | errors | P1: correctness of every wrapped call |
| 6 | What happens to a child when the awaiting task is cancelled (`teardownSequence`, `toProcessGroup`, SIGPIPE on closed pipe), and does `run` throw? | `run` returns normally on cancel [ran]; child status can be `signaled(13)` | https://github.com/swiftlang/swift-subprocess (README Graceful Teardown) | no | concurrency | P1: services and SDKs |
| 7 | What are the `Foundation.Process` rules on Linux (read both pipes before `waitUntilExit`, concurrently, `terminationHandler` not synchronised)? | Hang at large output [ran]; argument-parser's own helper does it wrong | https://github.com/apple/swift-argument-parser (TestHelpers.swift:423-428) | no | any | P1: legacy code still around |
| 8 | How does an SDK wrap a CLI without losing the environment, exit status, stderr, and cancellation (typed command model, `RunProgramError`, env override tests)? | swiftly drops env overrides (`ModeledCommandLine.swift:64-71`) | https://github.com/swiftlang/swiftly (ModeledCommandLine.swift) | no | api-design | P0: mirrors ocx-sdk-python |
| 9 | What must an atomic file replace do on Linux and Windows (temp in the same directory, fsync file, rename, fsync directory, mode, cleanup)? Which of `Data.write(.atomic)`, `rename(2)`, `replaceItem` satisfies it? | Foundation fsyncs file not dir; NIOFS `replaceItem` is not atomic (`FileSystem.swift:574`) | https://github.com/swiftlang/swift-foundation (Data+Writing.swift:403,669) | partial (rust durable-state) | any | P0: stores and lockfiles |
| 10 | When is `Data.write(to:)` without `.atomic` into a content-addressed directory acceptable, and what does a torn digest-named file cost? | containerization `ContentWriter.write` (`:50`) | https://github.com/apple/containerization (ContentWriter.swift) | no | any | P1: store integrity |
| 11 | Exclusive-create lock files vs `flock`/`fcntl` locks: what survives a crash and how are stale locks detected? | swiftly PID-file lock never self-heals (`FileLock.swift:34`) | https://github.com/swiftlang/swiftly (FileLock.swift) | partial (rust durable-state) | any | P2: single-host tools |
| 12 | Which path type at each boundary (`FilePath` from SystemPackage, stdlib `FilePath` once SE-0529 ships, `URL`, `String`), and how are paths serialised (not `Codable`)? | URL.standardized keeps `//` [ran]; swift-system Windows Unstable; SE-0529 not Codable | https://github.com/swiftlang/swift-evolution/blob/main/proposals/0529-filepath-in-stdlib.md | partial (rust platform-and-paths) | platform-windows | P0: wide blast radius |
| 13 | How does a store join an untrusted name onto a root without escape (validated component, fd-relative `openat` + `O_NOFOLLOW`, resolve root once)? | Archive and digest path traversal; `resolvingSymlinksInPath` asymmetry | https://github.com/apple/containerization (Digest.swift:119-131, ArchiveReader.swift:260-400) | partial (rust security) | security | P0: untrusted registry data |
| 14 | How are digests parsed and compared (UTF-8 not `Character`, lowercase hex only, algorithm allowlist vs OCI grammar sha256/sha512/blake3)? | `Character` range accepts `b`+U+0308 [ran]; spec allows more algorithms | https://github.com/apple/containerization (Digest.swift:80-91) | no | security | P0: content addressing |
| 15 | How is a blob hashed and size-checked while streaming to disk before it is committed (incremental `SHA256`, temp file, verify, rename, `O_EXCL`)? | container-plugin hashes whole `Data`; containerization verifies per chunk | https://github.com/apple/swift-container-plugin (ImageReference+Digest.swift:36-45) | partial (rust data-and-formats) | perf | P0: store core loop |
| 16 | Which swift-crypto range does a library declare (`"1.0.0" ..< "6.0.0"`) and what breaks if a dependency pins `< 5.0.0`? | 5.0.0 released 2026-09-16 needs Swift 6.2; two exemplars pin below 5 | https://github.com/apple/swift-crypto | no | swiftpm | P1: dependency graph conflicts |
| 17 | Which HTTP client on Linux for a registry client (AsyncHTTPClient vs URLSession/FoundationNetworking), and how is `Authorization` handled on cross-origin redirect? | URLSession forwards the bearer across hosts [ran]; AHC strips (`RedirectState.swift:142`); Docker Hub to S3 returns 400 | https://github.com/swift-server/async-http-client | partial (go/python http) | server | P0: credential leak |
| 18 | What timeouts, deadlines, retries (status classes, backoff, jitter, `Retry-After`), and cancellation do registry calls get? | `deadline: .distantFuture`, fixed 1 s retry on 5xx only (`RegistryClient.swift:48-54,202`) | https://github.com/apple/containerization (RegistryClient.swift) | partial | errors | P1: robustness |
| 19 | How is registry token auth implemented safely (WWW-Authenticate parsing, no redirects on the token client, refuse challenges over http, Basic only over TLS)? | containerization has all three guards; container-plugin has fewer | https://github.com/apple/containerization (RegistryClient.swift:60,141-143,208) | no | security | P1: secrets |
| 20 | Who owns an `HTTPClient`'s lifetime (`.shared` vs own instance + `shutdown()`), and what is the Swift deinit rule for resources that need async cleanup? | AHC README: failing to shut down leaks; deinit cannot be async | https://github.com/swift-server/async-http-client | no | memory-ownership | P1: leaks |
| 21 | How does a long-running service handle SIGTERM/SIGINT (ServiceGroup `gracefulShutdownSignals`, `cancellationSignals`, durations) and what does it do on Windows? | UnixSignals compiles out on Windows/WASI | https://github.com/swift-server/swift-service-lifecycle | no | server | P1: services |
| 22 | What is the interactive-CLI Ctrl-C contract (first INT cancels, second forces, cursor restored, exit 130) and how is it implemented without unsafe handlers? | clig.dev; container's `SignalThreshold` and `exit(signal+128)` | https://clig.dev/ | partial (rust cli-contract) | cli | P2: only interactive tools |
| 23 | When is cleanup done with async `defer` plus `withTaskCancellationShield` (6.4) instead of `defer { Task {} }`? | Cleanup after cancellation is the common correctness hole | https://github.com/swiftlang/swift-evolution/blob/main/proposals/0504-task-cancellation-shields.md | no | concurrency | P1: version-gated (6.4) |
| 24 | When is an unstructured `Task {}`/`Task.detached` allowed, what must hold its handle and cancel it, and should services use the `Service` protocol instead? | ServiceLifecycle "Use Structured Concurrency"; exemplar counts 14/18 | https://swiftpackageindex.com/swift-server/swift-service-lifecycle/main/documentation/servicelifecycle | no | concurrency | P1: H7 |
| 25 | How is actor reentrancy across `await` handled for stores (state re-check after suspension, `AsyncLock`-style queue, cancellation of waiters)? | `AsyncLock` waiters are non-cancellable | https://github.com/apple/containerization (AsyncLock.swift) | no | concurrency | P1: store races |
| 26 | When may a type be `@unchecked Sendable` or a stored property `nonisolated(unsafe)`, what must guard it (`Mutex`, actor), and how does a reviewer spot an unguarded one? | exemplars: 17 + 16 `nonisolated(unsafe)`; mutable global `bootstrapLogger` | https://github.com/apple/container (Application.swift:30) | no | concurrency | P1: H2 |
| 27 | How is a timeout expressed today (`withTaskGroup` race, SE-0526 `withDeadline` once shipped) without conflating timeout and cancellation? | `Timeout.run` throws `CancellationError`; can't stop non-cooperative work | https://github.com/swiftlang/swift-evolution/blob/main/proposals/0526-deadline.md | no | concurrency | P1: tied to a 6.4+ proposal |
| 28 | Which clock for which measurement (`ContinuousClock` vs `SuspendingClock` vs `Date`), and how is `Duration` formatted/stored on disk? | Wall-time `Date` for durations breaks on clock changes; `Duration` has attoseconds | https://github.com/swiftlang/swift-evolution/blob/main/proposals/0329-clock-instant-duration.md | no | lang | P2: boring but bites |
| 29 | How is logging bootstrapped (once, in `main`, to stderr for CLIs) and how do libraries obtain a logger (parameter or `Logger.current`)? | `bootstrap` twice crashes; 1.15+/1.16 docs changed advice | https://github.com/apple/swift-log (003-AcceptingLoggers.md) | no | api-design | P1: every binary |
| 30 | How is configuration layered (flags > env > file > defaults) with swift-configuration, and how are secrets redacted from access logs? | 1.2.2 exists; AHC integrates; CLIG precedence list | https://github.com/apple/swift-configuration | no | cli | P1: fleet precedence rule |
| 31 | What makes JSON output deterministic (`.sortedKeys`, `.withoutEscapingSlashes`, no `Dictionary` order, Darwin compat sort), and why must a digest be taken from received bytes, never re-encoded? | Key order differs per process [ran]; Darwin compat sorting | https://github.com/swiftlang/swift-foundation (JSONWriter.swift:274-306) | partial (rust data-and-formats) | api-design | P0: content addressing |
| 32 | How are dates represented in wire/on-disk formats (`.iso8601` drops fractions, default is Double since 2001, RFC 3339 with fractional seconds, `Date` vs `Duration`)? | [ran] fraction lost; default non-portable | https://github.com/swiftlang/swift-foundation (JSONEncoder.swift:254) | no | api-design | P1: format bugs |
| 33 | How are on-disk Codable formats versioned (explicit `version`, `decodeIfPresent`, unknown-key policy, golden fixtures) and how are decode errors surfaced? | Unknown keys ignored silently [ran]; SE-0489 printing 6.3 | https://github.com/swiftlang/swift-evolution/blob/main/proposals/0489-codable-error-printing.md | partial | errors | P1: migration safety |
| 34 | How do errors reach the user (`LocalizedError`/`CustomStringConvertible`, never bare `localizedDescription`, typed throws at library edges, no string-matching of errors)? | [ran] plain Error text useless; container matches `"XPC connection error"` | https://github.com/apple/container (Application.swift:136) | partial (rust errors) | errors | P1: UX and testability |
| 35 | Where does `Dictionary`/`Set`/`contentsOfDirectory` iteration order leak into output, archives, or digests, and what sort key fixes it? | Order differs per process / per fs [ran]; `SWIFT_DETERMINISTIC_HASHING` is test-only | https://github.com/swiftlang/swift (stdlib behaviour, ran) | no | lang | P0: reproducibility |
| 36 | How are reproducible layers built (tar `mtime`/`uid`/`gid` fixed, sorted entries, gzip header OS byte 255, zlib version caveat)? | container-plugin forces OS byte; compressed bytes still vary by zlib | https://github.com/apple/swift-container-plugin (gzip.swift:38-61) | no | perf | P1: stable digests |
| 37 | Which string view for which job (grapheme `Character`, `unicodeScalars`, `utf8`, `String.Index`), and when is `String ==` wrong for file names? | Canonical equivalence [ran]; ParsedDigest comment | https://github.com/apple/containerization (Digest.swift:80-91) | no | lang | P0: bites parsers |
| 38 | How does a CLI decide color, width, and prompts (`isatty` per stream, `NO_COLOR`, `TERM=dumb`, `COLUMNS`/`TIOCGWINSZ`, `--no-input`)? | No exemplar reads `NO_COLOR`; clig.dev rules | https://clig.dev/ | partial (rust tui/cli-contract) | cli | P2: interactive polish |
| 39 | What is the stdout/stderr contract (data on stdout, logs/errors/progress on stderr, `--json`, help to stdout exit 0)? | argument-parser behaviour [ran]; container-plugin `log()` uses stderr | https://clig.dev/ | partial | cli | P1: scriptability |
| 40 | How are CLIs tested end to end (exit tests `#expect(processExitsWith:)`, `swift-subprocess` against the built binary, golden help/JSON files, in-process `parseAsRoot`)? | Exit tests Swift 6.2, five platforms; argument-parser helper uses Process | https://github.com/swiftlang/swift-testing (exit-testing.md) | partial (rust testing) | testing | P1: gate quality |
| 41 | When Swift Testing vs XCTest per test kind in this domain (Apple CLI family 100% Testing; AHC/crypto XCTest), and how are mixed trees handled (ST-0021, 6.4)? | Import counts above | https://www.swift.org/blog/swift-6.4-released/ | no | testing | P1: H3 |
| 42 | Which shell-completion and man-page tooling ships with a CLI (`generate-manual` plugin, `--generate-completion-script`, fish fix 1.8.2, `@Option(defaultAsFlag:)`)? | Release hygiene for CLIs | https://github.com/apple/swift-argument-parser/blob/main/CHANGELOG.md | no | release | P2: polish |
| 43 | How is a CLI shipped as a static Linux binary (`--swift-sdk x86_64-swift-linux-musl`, no `dlopen`, `canImport(Musl)`, libcurl for FoundationNetworking)? | The fleet's Linux release path; subprocess lists it build-only | https://www.swift.org/documentation/articles/static-linux-getting-started.html | no | release | P1: distribution |
| 44 | What diverges on Windows for CLIs (exit code 160, no UnixSignals, no `.signaled`, FilePath Unstable, PATH separator `;`, atomic rename flags), and what is the local verification route? | Windows rarely tested in Swift OSS; frame says run locally | https://github.com/swiftlang/swift-foundation (Data+Writing.swift:560-585) | partial (rust platform-and-paths) | platform-windows | P1: cross-platform claim |
| 45 | Which Foundation-on-Linux behaviours differ from Darwin (`Locale.current` ignored `LANG` in the image, `String(format:)`, `formatted()` locale, FoundationNetworking import, `CocoaError` mapping, FileManager ordering)? | [ran] `Locale.current` was `en_001` under `LANG=de_DE.UTF-8` (image has only C locales; cause unverified) | https://github.com/swiftlang/swift-foundation | no | platform-linux | P1: silent divergence |
| 46 | How are tools versions, language modes, and per-target downgrades chosen for CLI packages (`swift-tools-version: 6.2`, `.swiftLanguageMode(.v5)` on an executable, `MemberImportVisibility`)? | container-plugin ships containertool in Swift 5 mode; swiftly enables the upcoming feature | https://github.com/swiftlang/swiftly (Package.swift:1-12) | no | swiftpm | P1: H1 |
| 47 | Which dependency products are safe to depend on (`_NIOFileSystem` underscored, `CryptoExtras` bundling BoringSSL, exact pins vs ranges, committing `Package.resolved` for executables)? | Underscored = no SemVer; containerization depends on `_NIOFileSystem` | https://github.com/apple/swift-crypto (Compatibility) | partial | swiftpm | P2: supply chain |
| 48 | How are availability annotations and `#if os()` splits kept honest in cross-platform CLI code (`@available(macOS 10.15, ...)` boilerplate, macOS-only branches in shared code like `fetchBlob`)? | Divergent `#if os(macOS)` branches behave differently | https://github.com/apple/containerization (RegistryClient+Fetch.swift:197-262) | no | platform-apple | P2: tested only on Linux here |
| 49 | How is a proxy honoured (`HTTP_PROXY`/`NO_PROXY`/`HTTPS_PROXY`, per-scheme, proxy auth headers) in a registry client? | containerization `ProxyUtils`; AHC 1.36 proxy headers | https://github.com/swift-server/async-http-client | no | server | P2: enterprise networks |
| 50 | What does 6.4's Swift Build default and SBOM generation (SE-0509) change for CLI release pipelines? | New default build system; SBOM output for provenance | https://www.swift.org/blog/swift-6.4-released/ | no | build-settings | P2: release polish |

## Recent shifts seen in this corpus

Version and date given where the source states one; older advice it invalidates in the right column.

| Shift | Version / date | Invalidates |
|---|---|---|
| swift-subprocess 1.0 (SF-0037): single generic `run()` closure form, mandatory `limit:`, non-optional `StringOutput`, typed `SubprocessError.Code`, `.signaled` rename, Swift 6.2 floor | 1.0.0 2026-08-04; 1.0.1 2026-10-09; Swift 6.4 blog 2026-09-15 | Advice to use `Foundation.Process` for new code; 0.x snippets (`.string` with implicit 128 KB cap, `unhandledException`) |
| `defer` can `await` (SE-0493) and `withTaskCancellationShield` (SE-0504) | Implemented Swift 6.4 | `defer { Task { await cleanup() } }` and `await Task { cleanup() }.value` workarounds |
| `@diagnose` source-level warning control (SE-0522) and `Module::Name` selectors (SE-0491) | Swift 6.4 | Global `-Wwarning`/`-warnings-as-errors` as the only knob |
| Swift Build is SwiftPM's default engine on Linux/macOS/Windows; SBOM generation (SE-0509) | Swift 6.4, 2026-09-15 | Build-system behaviour assumed from the legacy native build |
| Non-exhaustive public enums (SE-0487) adopted by swift-crypto 5.0.0, which therefore needs Swift 6.2 | SE-0487 Implemented 6.2.3; swift-crypto 5.0.0 2026-09-16 | "Adding an enum case is a source break" as a reason for major bumps; pins `< 5.0.0` |
| swift-argument-parser needs Swift 6; `asyncParse()` entry points; `defaultAsFlag:`; string-literal names; async completions | 1.8.0 2026-05-25, 1.8.1 2026-05-27 | Examples calling sync `parse()` from async code; `DispatchSemaphore` completion shims |
| swift-log task-local `Logger.current`/`withLogger`; tools 6.2 | 1.15.0-1.16.1 (2026-09 to 2026-10-07) | "Library creates its own `Logger(label:)`" |
| swift-configuration 1.x exists with providers, traits, secrets redaction | 1.2.0 2026-03-05, 1.2.2 2026-10-05 | Hand-rolled env/JSON config layering for new tools |
| `FilePath` accepted for the stdlib (SE-0529) and `CommandLine.executablePath` accepted (SE-0513) | Accepted with modifications / Accepted (spring 2026) | `URL`/`String` as path currency; `CommandLine.arguments[0]` as exe path |
| Swift Testing exit tests (`processExitsWith:`) | Swift 6.2 / Xcode 26 | Spawning the binary just to test `precondition`/`fatalError` |
| `DecodingError`/`EncodingError` readable descriptions (SE-0489) | Swift 6.3 | Hand-written `describe(error)` helpers for Codable failures |
| Task initializers `@discardableResult` change (SE-0520) and `async` Result support (SE-0530) | Swift 6.4 | `_ = Task {...}` habits; manual `Result` bridging |
| service-lifecycle 2.12 drops Swift 6.0, defaults logger to `Logger.current`, remembers pre-run graceful shutdown | 2.12.0 2026-08-18 | Notes that shutdown requested before `run` is lost |

## Contested

- **URLSession vs AsyncHTTPClient on Linux.** container-plugin uses `URLSession` and patches the redirect leak; containerization and swiftly use AsyncHTTPClient (which strips `Authorization` on cross-origin redirects). Trend: AHC for anything that carries credentials or large streamed bodies; `URLSession` only with a redirect delegate. Static-SDK users also get libcurl through FoundationNetworking, which AHC avoids.
- **swift-subprocess vs Foundation.Process.** swiftly (swift-subprocess, pinned `exact: "1.0.0"`) vs argument-parser's own test helper (`Process`). Trend: swift-subprocess is the default for new code; `Process` survives in tests of older packages. Exact-pin vs range is disputed: 1.0.1 fixed an fd leak, which argues for `from: "1.0.1"`.
- **Sorted keys as canonical form.** `.sortedKeys` is documented as lexicographic; swift-foundation sorts by UTF-8 bytes while Apple-framework compatibility mode sorts with `NSString` numeric/case-insensitive rules. Whether `.sortedKeys` is a safe canonical form across Darwin and Linux is unsettled; the safe route is hash received bytes.
- **Exit code for usage errors.** argument-parser uses `EX_USAGE` (64) on Unix, 160 on Windows, 1 on WASI; clig.dev says only "map to the most important failure modes"; many tools use 2. Trend: keep the library default, document it.
- **Library logging.** Older swift-log guidance: accept a `Logger` parameter. Current docs (1.15+): either that or read task-local `Logger.current`; both coexist. Trend: task-local for APIs that otherwise have no logging concern.
- **Timeouts.** Task-group race (containerization `Timeout.run`) vs the not-yet-landed SE-0526 `withDeadline` (three review rounds, "Accepted with modifications"). Trend toward `withDeadline`, but no shipped version number appears on the proposal page, so rules cannot target it yet.
- **Durability of "atomic".** Foundation fsyncs the file but not the directory; container and containerization do not fsync at all; NIOFileSystem documents `rename(2)` yet removes first. Where durability is required (stores, lockfiles) there is no single endorsed API.
- **Digest algorithms.** containerization accepts `sha256` only; OCI grammar and registered algorithms include `sha512` and `blake3`. Trend: sha256-only is the interoperable floor, but a rule must say what happens to others (reject loudly, do not coerce).
- **Release date for 6.4.** swift.org post: September 15, 2026; frame: 2026-09-14 from the install API. Treated as the same release; cite the blog date.

## Hypothesis verdicts (H1-H8, this corpus only)

- **H1** (Swift 6 mode mostly, 5.x tools in community libs): supported for Apple repos: tools 6.2 (containerization, container, swiftly, AHC, swift-crypto, swift-log), 6.1 (swift-system, service-lifecycle, SwiftPM), 6.0 (argument-parser, container-plugin); the only explicit Swift 5 mode seen is `containertool` under `.swiftLanguageMode(.v5)` (`swift-container-plugin Package.swift`). None lower the tools version below 6.0. Evidence for community libraries is not in this corpus.
- **H2** (`@unchecked Sendable` / `nonisolated(unsafe)` dominate, mostly avoidable): partially supported. In container/containerization, `nonisolated(unsafe)` (33) outnumbers `@unchecked Sendable` (6), mostly guarding non-Sendable C/XPC/Virtualization handles and generated protobuf statics, which are not avoidable with `Mutex`. Avoidable case seen: mutable global `bootstrapLogger` (`Application.swift:30`).
- **H3** (Swift Testing overtakes XCTest in Apple repos, not community): supported with a split inside Apple: Apple CLI/OCI repos are 100% Swift Testing; swift-crypto (0/71), swift-system (2/18), async-http-client (5/51) are still XCTest-heavy.
- **H5** (Package.resolved committed by executables, not libraries): partially seen: `Package.resolved` is present in container, containerization, container-plugin, swiftly (all executables or executable-bearing); library-only repos not checked here.
- **H7** (agent failure modes): this corpus adds domain-specific ones: `exit` in async/CLI code, `Foundation.Process` read order, `URLSession` redirect headers, `Character`-based validation, re-encoding JSON for digests, `localizedDescription` for errors, `ExitCode` above 255.
- **H4, H6, H8**: not testable from this corpus (formatter choice, Windows CI, default MainActor isolation); swiftly pins SwiftFormat `exact: "0.49.18"` in its manifest while 0.63.1 is current, a data point for the lint scout.

## Sources

34 distinct URLs; 22 primary (swift.org, swift-evolution, swift-foundation proposals, forum review thread, tool repos and their docs).

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://www.swift.org/blog/swift-6.4-released/ | Swift 6.4 release post | 2026-09-15 | Subprocess 1.0, SE-0493/0504/0522/0509, Swift Build default, platform notes |
| https://www.swift.org/documentation/articles/static-linux-getting-started.html | Static Linux SDK guide | current | musl, no `dlopen`, `--swift-sdk`, libcurl via FoundationNetworking |
| https://github.com/swiftlang/swift-subprocess | README + releases 1.0.0/1.0.1/1.0.0-beta.1 | 2026-07 to 2026-10-09 | API, teardown, platform table, fd-leak fix |
| https://github.com/swiftlang/swift-foundation/blob/main/Proposals/0037-subprocess-1.0.md | SF-0037 Subprocess 1.0 Update | 2026-07 | Every 1.0 API change and error codes |
| https://github.com/swiftlang/swift-foundation/blob/main/Proposals/0007-swift-subprocess.md | SF-0007 Subprocess | 2024-25 | Motivation: Process hazards; original API |
| https://github.com/swiftlang/swift-foundation | swift-foundation source (Data+Writing, JSONWriter, JSONEncoder) | @aadd9259be07 | Atomic write, fsync, JSON ordering, Windows branches |
| https://github.com/apple/swift-argument-parser | Source, CHANGELOG, test helpers, plugins | 1.8.2 2026-06-04 | Exit codes, async entry, completions, manual |
| https://clig.dev/ | Command Line Interface Guidelines | current | stdout/stderr, TTY, NO_COLOR, signals, config precedence |
| https://github.com/swift-server/swift-service-lifecycle | README, DocC, source | 2.12.1 2026-10-05 | ServiceGroup, signals, library adoption rules |
| https://github.com/apple/swift-configuration | README + Guides | 1.2.2 2026-10-05 | Providers, traits, secrets |
| https://github.com/apple/swift-system | README | 1.8.1 2026-08-14 | FilePath, FileDescriptor, Windows unstable |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0529-filepath-in-stdlib.md | SE-0529 FilePath in stdlib | Accepted with modifications 2026 | Path semantics, noasync resolve, not Codable |
| https://forums.swift.org/t/se-0529-add-filepath-to-the-standard-library/86194 | Review thread (John McCall) | 2026-04-23 | Reviewer reasoning on URL vs FilePath |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0513-commandline-executablepath.md | SE-0513 | Accepted 2026 | Executable path API |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0504-task-cancellation-shields.md | SE-0504 | Implemented 6.4 | Cleanup after cancellation |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0493-defer-async.md | SE-0493 | Implemented 6.4 | `await` in `defer` |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0526-deadline.md | SE-0526 withDeadline | Accepted with modifications | Timeout design, review history |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0487-extensible-enums.md | SE-0487 nonexhaustive enums | Implemented 6.2.3 | Why swift-crypto 5 exists |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0489-codable-error-printing.md | SE-0489 | Implemented 6.3 | Decode error text |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0329-clock-instant-duration.md | SE-0329 | Swift 5.7 | Continuous vs Suspending clock |
| https://github.com/swiftlang/swift-testing/blob/main/Sources/Testing/Testing.docc/exit-testing.md | Exit testing doc | Swift 6.2 | Platforms and API for CLI termination tests |
| https://github.com/swift-server/async-http-client | README + source (RedirectState) | 1.36.2 2026-09-25 | Redirect header stripping, shutdown rule |
| https://github.com/apple/swift-log | README, DocC best practices, releases | 1.16.1 2026-10-07 | Bootstrap-once, Logger.current |
| https://github.com/apple/swift-crypto | README | 5.0.0 2026-09-16 | Version ranges, nonexhaustive enums, BoringSSL |
| https://github.com/apple/containerization | OCI client, content store, archive reader | 0.33.3, @3e7bc39e66b3 | Best Swift OCI prior art; digest and path hardening |
| https://github.com/apple/swift-container-plugin | Registry client and tar/gzip | 1.4.0, @a9646b8d4dca | URLSession redirect workaround; reproducible gzip |
| https://github.com/apple/container | CLI over containerization | @f70ecbb926d9 | Exit-code flow, signal handling, error rewriting |
| https://github.com/swiftlang/swiftly | Toolchain manager CLI | @c8cf2e35bfca | SDK-wraps-CLI model, FileLock, proxy exit mapping |
| https://github.com/apple/swift-nio | `_NIOFileSystem` | @e12881f2a691 | `replaceItem`, `synchronize`, temp directories |
| https://github.com/swiftlang/swift-package-manager | SwiftPM source and CHANGELOG | @5546f44a3b52 | Tools-version settings by release |
| https://github.com/opencontainers/image-spec/blob/main/descriptor.md | OCI descriptor/digest grammar | current | Digest grammar and registered algorithms |
| https://github.com/opencontainers/distribution-spec/blob/main/spec.md | OCI distribution spec | current | Digest-header verification duties |
| https://github.com/swiftlang/swift-foundation/blob/main/Proposals/0018-urlsession-new-loader.md | SF-0018 new URLSession loader | accepted | Darwin-only loader change: confirms no Linux URLSession item |
| https://github.com/swiftlang/swift-foundation/blob/main/Proposals/0027-UTCClock.md | SF-0027 UTCClock | review 2025 | Wall-clock `Clock` for on-disk timestamps |
| https://github.com/swift-server/swift-service-lifecycle/releases/tag/2.12.0 | Release notes | 2026-08-18 | Logger.current default, drop 6.0 |
