---
# Read on demand through the index. This glob matches no file, so a client never auto-loads the file.
paths:
  - "**/.swift-quality-depth-on-demand"
title: CLI Contract
summary: The SW-CLI family, owning a Swift executable's process contract, the exit-status table and its one enum, the root hook, stdout and stderr discipline, SIGPIPE and closed streams, signals and shutdown, log bootstrap, configuration precedence, prompts and progress
---

# CLI Contract

Binds to Swift 6.4.0 and 6.3.3 on Linux x86_64 with glibc 2.43 on the 6.4.0 image and 2.39 on the 6.3.3 image, swift-argument-parser 1.8.x, swift-service-lifecycle 2.12.1,
swift-log 1.16.1, swift-configuration 1.2.2 and swift-subprocess 1.0.1 (measured 2026-10-10).

Owns the process contract of a Swift executable: the status table and its one enum, the root `main()` hook that parses, runs,
renders, classifies, flushes and terminates, stream discipline, SIGPIPE, signals and graceful shutdown, log bootstrap,
configuration precedence and file locations, batches, prompts, progress and completions. Not owned here: spawning children and
mapping `.signaled(n)` to 128+n are `SW-IO` and `SW-API` (`SW-API-16` for the SDK). Trap policy (`fatalError`, `precondition`) is
`SW-ERR`. Cleanup under cancellation (async `defer`, the shield and its deadline) is `SW-CONC-33` and `SW-CONC-34`. Escaping
terminal text is `SW-SEC-17`. The libc import chain is `SW-LANG-02`. Mapping network errors onto the table is `SW-NET-18`.
Delivering these greps as SwiftLint `custom_rules` is `SW-GATE`. The rules bind every `@main` executable. A server's executable
target takes `SW-CLI-01` to `-03`, `-08`, `-15`, `-16` and `-20` to `-22`. A library or SDK never calls `exit`, `signal`,
`fatalError` or `LoggingSystem.bootstrap`. Every table value, flag name, file name and the example binary `mytool` below is a
**pinned default, the adopter may override it** once, in `Status.swift`, `GlobalOptions.swift` or the XDG helper.

Contents: [Dates and Floors](#dates-and-floors) · [Exit Status and Streams](#exit-status-and-streams) ·
[Services, Logging and Configuration](#services-logging-and-configuration) · [The Compiler](#the-compiler) ·
[Running the Binary](#running-the-binary) · [Tests](#tests) · [Documented Gaps](#documented-gaps) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Floors

- Manifest-gated: ArgumentParser 1.8.0 needs tools 6.0 and Swift 6 mode. swift-log 1.16 and swift-subprocess 1.0.1 and
  swift-configuration 1.2.2 need tools 6.2. swift-service-lifecycle 2.x needs tools 6.1.
- Compiler-gated: `processExitsWith` (ST-0008) is Swift 6.2. `Mutex` needs `import Synchronization` (Swift 6.0, macOS 15 floor,
  read 2026-10-10).
- Every exit 132 below was measured on the main thread with the default backtracer. A trap on another thread can exit 0 under it
  (`SW-CORE-16`), and `SWIFT_BACKTRACE=enable=no` shortens stderr without changing the status.
- Windows, WASI, arm64 and macOS rows are `unverified: read only`. Contract tests that assert 64 or flush-on-exit stay off those
  platforms until a leg there has run them (`SW-CLI-12`).
- **SW-CLI-27 and SW-CLI-32 are retired, not reused.** SW-CLI-27 was never issued. SW-CLI-32 (generate completions, never hand-write
  them) restated the framework default and had no gate that could go green on a built tree.

## Exit Status and Streams

Gate, from the package root. Source trees may be symlinks (RxSwift's `Sources/` is a symlink farm of 412 files): every scan here uses `grep -R` and `find -L`, because `grep -r` skips symlinked files and `find` without `-L` skips a symlinked directory, so the scan and the `SW-CORE-03` canary must count the same files (measured 2026-10-10: `find` 412 files, `grep -r` 1, `grep -R` 412). Empty output is the pass for every line (grep exits 1), and `R-` lines are in the contract script
under [Running the Binary](#running-the-binary). The `G` lines bind executable targets only: `G0` prints a notice when the manifest declares none, and then the `G1` lines do not run (the `if` wraps them) (a library has no CLI contract, its `fatalError` and `print` hits are `SW-ERR` and `SW-IO` matters). A macro plugin (`@main struct P: CompilerPlugin`) is not a CLI: `dump-package` types it `macro`, so `G0` skips it. The `G4` lines in [Running the Binary](#running-the-binary) repeat the `G0` scope (watched 2026-10-10: a plant with `raise(SIGINT)`, `exit(128+2)` and an `@main` lacking `SIGPIPE`, `fullMessage(for` and `sanitizeForTerminal` prints 5 lines, a twin carrying them plus an `*Example` executable and a library-only twin print none or the notice; swift-case-paths, console-kit and swift-numerics, which printed a macro plugin, an example executable and nothing before, print the notice, nothing and the notice). `G0` watched (measured 2026-10-10, Swift 6.4.0): it prints the notice and nothing else on Yams, jwt-kit, swift-prometheus (9 and 14 stray `fatalError` and `print(` lines before the wrap) and on a library-only plant, and runs the `G1` lines on Mint, swift-docc and a twin with an `.executableTarget`; a manifest that does not evaluate prints the dump-package notice on stderr instead of a false 'no executable'. The `G1` lines scan only the executable targets' directories, listed from `dump-package` with `jq` (a custom `path:` is honoured, a missing `jq` prints a notice and runs nothing), so a mixed package's library `exit` and `print(` hits stay `SW-ERR` and `SW-IO` matters: on swift-nio-ssh the old `Sources` scan printed 66 lines with 12 library `fatalError` lines, the scoped one prints none from `NIOSSH` (54 lines, all in the three executables), and a plant with a library `fatalError`, an `ExampleDemo` executable and a custom-path executable printed only the two real `exit` lines (measured 2026-10-10, Swift 6.4.0). The `X` array skips golden-output, test-support, sample and benchmark directories (`Demo*`, `Example*`, `Sample*`, `Benchmark*`, `Fixtures`, `TestUtils`, `*.playground`): SwiftGen's `fatalError` census read 459 hits, 455 of them generated fixtures. A sample or benchmark executable named otherwise (swift-nio-ssh's `NIOSSHClient`, `NIOSSHServer`, `NIOSSHPerformanceTester`) still prints: add its pattern to `X` for that tree or read and dismiss the hits. `G1-03a` also prints the single terminal `exit(status)` of a hand-written entry-point file, which is compliant: read the hit.

```bash
if ! PKG=$(swift package dump-package); then
  echo 'G0: dump-package failed, the scope is unknown; fix the manifest first' >&2   # G0 scope: a manifest error is not 'no executable'
elif ! printf '%s\n' "$PKG" | grep -q -e '"type" : "executable"'; then
  echo 'G0: no executable target, SW-CLI does not apply'   # G0 scope: the G lines below do not run
elif ! command -v jq >/dev/null; then
  echo 'G0: needs jq to list the executable targets' >&2   # G0 scope: without the list the scan would read every library target
else
  # G1 scans only the executable targets' directories (dump-package gives path null for the default Sources/<name>), minus the directories that ship no tool code
  mapfile -t DIRS < <(printf '%s\n' "$PKG" | jq -r '.targets[] | select(.type == "executable") | (.path // ("Sources/" + .name))')
  X=(--exclude-dir='Demo*' --exclude-dir='Example*' --exclude-dir='*Example' --exclude-dir='Sample*' --exclude-dir='Benchmark*' --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground')
  ls -d -- "${DIRS[@]}" >/dev/null || echo 'G0: an executable target directory is missing, the scope is unknown' >&2
  grep -Rn -e 'ExitCode(' --include='*.swift' "${X[@]}" --exclude='Status.swift' "${DIRS[@]}"                              # G1-01a
  grep -RnE -e '[a-zA-Z] *= *([2-9]|[1-5][0-9]|6[0-3]|[1-9][0-9]{2,})([^0-9.]|$)' --include='Status.swift' "${X[@]}" "${DIRS[@]}"  # G1-01b
  grep -RnE -e 'await ' -e '(^|[^.[:alnum:]_])try[ ?!]' --include='main.swift' "${X[@]}" "${DIRS[@]}"                      # G1-02a
  grep -Rn -e 'func main() async throws' --include='*.swift' "${X[@]}" "${DIRS[@]}"                                        # G1-02b
  grep -RnE -e '(^|[^.[:alnum:]_])exit\(' -e '\b(Glibc|Darwin|Musl|Foundation|ucrt)\.exit\(' -e '\b_exit\(' --include='*.swift' "${X[@]}" --exclude='Stdio.swift' "${DIRS[@]}"  # G1-03a
  grep -RnE -e '\bfatalError\(' --include='*.swift' "${X[@]}" "${DIRS[@]}"                                                 # G1-03b a tell
  grep -RnE -e 'standard(Output|Error)\.write\([^c]' --include='*.swift' "${X[@]}" "${DIRS[@]}"                            # G1-04
  grep -RnE -e 'print\("(Error|error|Warning|warning)' --include='*.swift' "${X[@]}" "${DIRS[@]}"                          # G1-05
  grep -RnE -e 'NO_COLOR"\] (==|!=) nil' --include='*.swift' "${X[@]}" "${DIRS[@]}"                                        # G1-06
  grep -RnE -e '(^|[^.[:alnum:]_])print\(' --include='*.swift' "${X[@]}" --exclude='Stdio.swift' "${DIRS[@]}"              # G1-24
fi
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-CLI-01 | Own every process status in one `enum Status: UInt8, Sendable` holding the table below. Construct `ExitCode(` only in `Status.swift` and convert every computed integer with `Status.checked(_:)`, which sends anything outside the table to `.failure`. Raw values are 0, 1 and 64 to 99 only. This table is the pinned default that `SW-NET-18` and `SW-API-16` cite. Floor: ArgumentParser 1.8.0. | `ExitCode` is `Int32` but the OS keeps 8 bits, so `throw ExitCode(256)` exits 0 (success on failure) and `ExitCode(300)` exits 44. Values 2 to 63 and 100 to 255 collide with shell and crash conventions. | `G1-01a` and `G1-01b`, empty output = pass. G1-01b does not flag the unused sysexits values 66 to 68, 70 to 73 and 76, and hex literals (`= 0x3`) are a reading item, so review the table for those. Watched red (measured 2026-10-10): both hit a planted tree and are empty on the twin, `ExitCode(300)` exited 44 and `ExitCode(256)` exited 0. | MUST |
| SW-CLI-02 | Make the root an `@main` `AsyncParsableCommand` and let nothing throw out of an entry point uncaught. No `main.swift` with top-level `try` or `await`. A hand-written `static func main() async throws` wraps its body in `do/catch` that ends in `exit(withError:)`, a `Status` or the SW-CLI-23 terminator. | A throw out of top-level code or a bare `main() async throws` is `Fatal error: Error raised at top level`: exit 132 plus an 88-line backtrace (SE-0281), where the same error thrown from `AsyncParsableCommand.run()` exits 1. | `G1-02a` (each hit is a finding unless its line sits inside a `do/catch` that ends in a `Status`) and `G1-02b` as a reading heuristic (each hit must contain `catch`), empty output = pass. Run the binary with a forced throw and `echo $?` must print 1. Watched red (measured 2026-10-10): G1-02a hit a planted `main.swift`, the throw exited 132 against 1. | MUST |
| SW-CLI-03 | End a run by throwing a classified error. `exit`, `Glibc.exit`, `Foundation.exit` and `_exit` appear only in the one terminator `Stdio.terminate` in `Stdio.swift` (SW-CLI-23), plus the entry-point file of a hand-written entry point that does not use SW-CLI-23. The signal re-raise of SW-CLI-10 is `kill`, not `exit`. Never report an operational failure with `fatalError`. | `exit()` skips `defer` and `deinit`, `_exit` and `fatalError` lose block-buffered stdout, and `fatalError` exits 132. Inside a `ParsableCommand` type a bare `exit(3)` resolves to ArgumentParser's static `exit` and does not compile, and the agent's next move `Darwin.exit` does not build on Linux. | `G1-03a`, every hit outside the entry-point file of a hand-written entry point is a finding (a bare `exit(withError:)` ending its `catch` matches too, and so does the one terminal `exit(status)` of that entry-point file, read it). `G1-03b` is a tell only. `G0` first: on a package with no executable target the block does not apply. Empty output = pass. Watched red (measured 2026-10-10): G1-03a hit a bare `exit(1)` and a `Foundation.exit(2)`, empty on a twin whose only `exit(` is in `Stdio.swift`. | MUST (`fatalError` clause: tell) |
| SW-CLI-04 | Write to a standard stream through stdio (SW-CLI-24, SW-CLI-09) or the throwing `write(contentsOf:)` inside `do/catch`, never the legacy `FileHandle.write(_:)`. With the throwing form match EPIPE explicitly (`NSCocoaErrorDomain` 512 wrapping `NSPOSIXErrorDomain` 32) and map any other error to `.io`. Never `try!` it. | The legacy form is `try!` inside Foundation: exit 132 on EPIPE once SIGPIPE is ignored (SW-CLI-08) and 141 when it is not. A blanket `catch` that returns success hides a full disk (exit 0 on `/dev/full`). | `G1-04`, empty output = pass, plus a reading heuristic for `try!` on `write(contentsOf:)`. Watched red (measured 2026-10-10, Swift 6.4.0 and 6.3.3): G1-04 hit a planted legacy write, a blanket catch exited 0 on `/dev/full` and the discriminating catch exited 74. | MUST |
| SW-CLI-05 | Send results to stdout and everything else to stderr: logs, progress, warnings, prompts and errors. Help, version and completion text are results (the hook does this). Report each error once per channel: throw it and let ArgumentParser print it, or print it and throw a bare `Status.exitCode`, never both. Under `--format json` stdout carries only the payload and a failure adds one envelope there (SW-CLI-29). | Mixed streams corrupt piped results (clig.dev, read 2026-10-10). | `G1-05` is a narrow tell. The check is `R-05`: in text mode a failing command with `2>/dev/null` prints nothing, and with `--format json` stdout parses as one JSON document. Watched: the contract runs were green on a compliant fixture, the red is the absent-envelope baseline. | MUST |
| SW-CLI-06 | Decide colour per stream in one `useColor(fd:env:)`. An explicit `--color` flag outranks everything, then a non-empty `CLICOLOR_FORCE` that is not `0` forces on, a non-empty `NO_COLOR` forces off, `TERM=dumb` is off, otherwise `isatty(fd) == 1`. | no-color.org (read 2026-10-10) says present and non-empty, so `NO_COLOR=` must not disable colour. 6 of 7 corpus read sites test presence only or truthy only. | `G1-06`, empty output = pass, misses truthy-only forms such as `if let v = env["NO_COLOR"]`. So also run the matrix on a pty (for example `script -qec 'mytool ...' /dev/null`) and without one, a reading heuristic: `NO_COLOR=1` off, `NO_COLOR=` (empty) unchanged, `TERM=dumb` off, `CLICOLOR_FORCE=1` on. Watched red (measured 2026-10-10): six matrix rows and a planted hit. | SHOULD |
| SW-CLI-24 | Write every stdout byte through one funnel `Stdio.out(_:) -> Bool` that wraps `fputs` and `ferror`, records the first failing errno under a `Mutex` and returns `false`, and `break` unbounded loops on `false`. No bare `print` in output paths. | The flush check needs the original errno to tell EPIPE from ENOSPC, because after the buffer drains inside `print` a later `fflush` returns 0 with a stale errno. A bare `print` loop to a closed pipe runs to the end. The MUST for any command whose output can exceed one stdio buffer is SW-CLI-08 and SW-CLI-23. | `G1-24` (output = a `print` outside the funnel file, every hit in command code is a finding and a test helper is not, an injected `ctx.print` is not matched), then `R-08`. Watched red (measured 2026-10-10): G1-24 hit a planted `print("result")`, empty on the twin that writes through `fputs` in `Stdio.swift`. | SHOULD |

Status table, the pinned default. `.success` and the EPIPE exemption are SW-CLI-08, a refused prompt is SW-CLI-31.

| Code | Case | Meaning |
|---|---|---|
| 0 | `.success` | Success, and a closed downstream pipe (EPIPE) |
| 1 | `.failure` | Unclassified failure, the `checked(_:)` fall-through, a mixed-status batch (SW-CLI-26), any `ServiceGroupError` |
| 64 | `.usage` | Bad invocation, every ArgumentParser parse or validation failure, a prompt refused for lack of a terminal |
| 65 | `.data` | Malformed input data, manifest or lockfile |
| 69 | `.unavailable` | Resource refused or unavailable, a rerun will not help (a refused certificate, a non-retryable 5xx; a connect failure is 75, `SW-NET-18`) |
| 74 | `.io` | Filesystem or stdout fault, including a failed flush and a closed stdout |
| 75 | `.tempFail` | Retryable transient failure |
| 77 | `.permissionDenied` | Insufficient permission |
| 78 | `.config` | Bad configuration, including an unparsable value in a configuration layer (SW-CLI-17) |
| 79 to 81 | `.notFound`, `.auth`, `.policyBlocked` | The shared core of the public `ocx` and `grim` CLIs |
| 82 to 99 | per binary | Allocate from the first free slot, `ocx` uses 82 to 87 for its own conditions |
| 128 to 255 | never a case | A signal killed or crashed the process (measured 130, 132, 137, 141, 143). Only a forwarded child status (`SW-IO`) lands here |

```swift
throw ExitCode(256)  // wrong: wraps to exit 0, success on failure
throw Status.data.exitCode  // right: 65, the only place numbers live is Status.swift
```

## Services, Logging and Configuration

Gate, from the package root. `G2-15a` and `G2-15d` take the entry target from `dump-package` (the executable targets, as in `G0`), not from a fixed `Sources/App`: with none, `G2-15d` is skipped and `G2-15a` lists every bootstrap call, which is right for a library. Empty output = pass for every
line. The `-L` lines list a file that lacks the string (`xargs` exits 123 when a batch lists files and none matched, 0 for a mixed batch, so judge by output; the file lists are NUL-separated so a path with a space survives).

```bash
DIRS=(); EX=()   # G2-15 scope: the entry targets, listed the way G0 lists them; the exclusion names them, so any layout is scanned
if PKG=$(swift package dump-package) && command -v jq >/dev/null; then
  mapfile -t DIRS < <(printf '%s\n' "$PKG" | jq -r '.targets[] | select(.type == "executable") | (.path // ("Sources/" + .name))')
  for d in "${DIRS[@]}"; do EX+=(--exclude-dir="${d##*/}"); done
else echo 'G2-15: needs swift and jq to find the entry target, the two lines below are not meaningful' >&2; fi
grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' -e 'LoggingSystem\.bootstrap' --include='*.swift' "${EX[@]}" Sources                       # G2-15a
[ "${#DIRS[@]}" -gt 0 ] && grep -Rn -e 'LoggingSystem\.bootstrap' --include='*.swift' "${DIRS[@]}" | awk 'END{if (NR > 1) print NR " bootstrap calls in the entry target"}'  # G2-15d
grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' -e 'StreamLogHandler\.standardOutput' --include='*.swift' Sources                                  # G2-15b
grep -RnE --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' -e '^let +[a-zA-Z_]+ *(: *Logger)? *= *Logger\(label' -e '^var +[a-zA-Z_]+ *(: *Logger)? *= *Logger\(label' --include='*.swift' Sources  # G2-15c a tell
grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' -e 'logLevel = ' --include='*.swift' Sources                                                       # G2-16 a reading heuristic
grep -RnE --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' -e '@Option([ (].*)? var [a-zA-Z_]+ *(:[^=;{]*)?= *[^ =]' --include='*.swift' --exclude='GlobalOptions.swift' Sources  # G2-17
grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' -e '"[^"]*\.config[/"]' -e 'XDG_' --include='*.swift' --exclude='XDG.swift' Sources                # G2-18
grep -RlZ --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' -e 'ServiceGroup(' --include='*.swift' Sources | xargs -0 -r grep -L -e 'gracefulShutdownSignals'    # G2-20a
grep -RnE --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' -e 'gracefulShutdownSignals: *\[ *\]' --include='*.swift' Sources                                 # G2-20b
grep -RlZ --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' -e 'ServiceGroup' --include='*.swift' Sources | xargs -0 -r grep -L -e 'maximumGracefulShutdownDuration'  # G2-21
grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' -e 'withThrowingTaskGroup' -e 'withThrowingDiscardingTaskGroup' --include='*.swift' Sources       # G2-26
grep -RnE --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' -e '@[OF][a-z]*.* var format\b' -e '@[OF][a-z]*.* var color\b' -e '@[OF][a-z]*.* var quiet\b' -e '@[OF][a-z]*.* var logLevel\b' --include='*.swift' --exclude='GlobalOptions.swift' Sources  # G2-28a
grep -RlEZ --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' -e ': *(Async)?ParsableCommand' --include='*.swift' Sources | xargs -0 -r grep -L -e '@OptionGroup'  # G2-28b
grep -RnE --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' -e 'print\("\\r' -e 'print\("\\u\{1B\}' --include='*.swift' Sources                              # G2-30
grep -RlZ --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' -e 'readLine(' --include='*.swift' Sources | xargs -0 -r grep -L -e 'isatty(0' -e 'isatty(STDIN_FILENO' -e 'isTTY(0' -e 'fileno(stdin'  # G2-31
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-CLI-15 | Call `LoggingSystem.bootstrap` exactly once, in the executable target's entry path, after flags and environment are resolved and before any `Logger(label:)`, `Logger.current` or `ServiceGroup(...)` is evaluated, with `StreamLogHandler.standardError` or a handler that writes stderr. Libraries and test helpers never bootstrap, they take a `Logger` parameter or read `Logger.current`. Floor: swift-log 1.16. | A second call traps (exit 132, `precondition` in `LoggingSystem.swift`). Loggers capture the handler at creation. The default handler's doc comment in 1.16.1 says STDOUT while the code writes stderr, and stdout is the result stream (SW-CLI-05). | `G2-15a` (output = a bootstrap outside the entry target, it also matches doc comments), `G2-15d` (output = more than one call inside the entry target), `G2-15b`, and `G2-15c` as a tell, empty output = pass. G2-15c misses `private static let log = Logger(label:)` inside types and a bootstrap hidden in a lazy file-scope closure. Watched red (measured 2026-10-10): all three hit a planted tree, and a second bootstrap exits 132 against 0 for one. | MUST |
| SW-CLI-16 | Resolve the log level before the bootstrap (flag, then `TOOL_LOG_LEVEL`, then `.info`) and apply it inside the bootstrap factory with `handler.logLevel = level`. Take `--log-level` from `GlobalOptions` (SW-CLI-28). Never set `logLevel` on one `Logger` instance to emulate verbosity. | Measured: with `--log-level debug` a logger created before the bootstrap printed no debug line, and a mutation on one instance covers that instance only. | `G2-16` is a permanent reading heuristic, because `Logger.logLevel` and `LogHandler.logLevel` share a spelling: each hit must sit inside the bootstrap factory. Behaviour: run with `--log-level debug` and every component's logger must show a debug line. Watched: behaviour yes (flag beats env, bootstrap skipped ignores the flag). | SHOULD |
| SW-CLI-17 | Resolve configuration in one function with the precedence flag, environment, project file, user file, system file(s), default. The participating `@Option` is optional with no default (`@Option var timeout: Int?`), and the resolver applies the default once and returns the winning layer for `--debug` output. An empty environment value is unset. An unparsable value in a layer throws a classified `Status.config` (78) error naming the variable or file and never falls through to a lower layer. One table test enumerates all subsets of the layers (2^5 = 32 cases). | A defaulted `@Option` makes the flag always present, so the environment never wins, and ArgumentParser reads no environment. Measured: a `flag ?? env ?? file` resolver failed 31 of 32 subsets. | `G2-17` (output = a defaulted option, including `Int?`, array and `Logger.Level` types, review whether it feeds the resolver, it also flags options that never do) and `swift test` must contain the subset test, which is the real gate. Watched red (measured 2026-10-10): the naive resolver exited 1 with 31 issues, the hand-written one 0, and the old grep missed `@Option var timeout = 30`. | MUST |
| SW-CLI-18 | Locate files through one XDG helper that follows the spec: `XDG_CONFIG_HOME` (absolute, else `$HOME/.config`), `XDG_CONFIG_DIRS` (absolute entries, default `/etc/xdg`), `XDG_STATE_HOME` for logs and history (`$HOME/.local/state`), `XDG_CACHE_HOME`, `XDG_DATA_HOME`. Ignore empty and relative values. The config file is `dir/tool/config.json` (default). Use `FileManager.urls(for:in:)` only for cache and data. Add Windows and macOS locations behind the same helper (`unverified: read only`). | Foundation on Linux maps cache and data only and keeps relative `XDG_CONFIG_DIRS` entries (swift-foundation, read 2026-10-10), and SwiftPM and sourcekit-lsp each deviate from XDG Base Directory Specification 0.8. | `G2-18` (rename `XDG.swift` to the helper's file, output = a path literal or `XDG_` read outside it), plus unit tests for empty, relative and ordered cases. Watched: G2-18 red on `NSHomeDirectory() + "/.config/tool/config.json"` (measured 2026-10-10), the helper's tests are green-only. | SHOULD |
| SW-CLI-20 | Pass `gracefulShutdownSignals: [.sigterm, .sigint]` to every `ServiceGroup` in a process that can be stopped, never the default. `cancellationSignals` is a separate, harder stage and must be disjoint (an overlap traps at `init`, exit 132). A service whose `run()` returns early makes `group.run()` throw `ServiceGroupError.serviceFinishedUnexpectedly` (status 1, classify as `.failure`). On Windows and WASI the signals are a silent no-op, call `triggerGracefulShutdown()` from the platform hook (`unverified: read only`). The member is `.gracefullyShutdownGroup`, and the DocC article's spelling does not compile. Floor: swift-service-lifecycle 2.x. | The 2.x defaults are `[]`, so SIGTERM ends the process at 143 and SIGINT at 130 with no cleanup (measured). The 2020 swift.org post says the opposite and describes the 1.x API. | `G2-20a` (output = a file that builds a group and never mentions the signals) and `G2-20b` (an explicit empty list that G2-20a accepts), empty output = pass. Then `R-20`: SIGTERM and SIGINT each print the cleanup line and exit 0. Watched red (measured 2026-10-10): `[.sigterm]` alone leaves SIGINT at 130 without cleanup, the exact `[.sigterm, .sigint]` exits 0 for both. The checks are file-level. `R-20` is red on `[.sigterm]` alone (SIGINT exits 130, no cleanup line). | MUST |
| SW-CLI-21 | Set `maximumGracefulShutdownDuration` below the orchestrator's kill delay (Kubernetes 30 s and Docker 10 s, documented and not re-measured) and make services honour graceful shutdown with `cancelWhenGracefulShutdown` or `withGracefulShutdownHandler`. The second stage has its own bound, `maximumCancellationDuration` (`SW-CONC-33`). Floor: swift-service-lifecycle 2.x. | Measured: a service that ignores graceful shutdown stays alive until SIGKILL (137), and with the limit it is cancelled and the group exits 0. | `G2-21` (output = a file with a group and no bound), and a stubborn-service fixture must exit within the bound. Watched red (measured 2026-10-10): 137 without the limit, 0 with it. | SHOULD |
| SW-CLI-26 | Have a batch collect results and print `K of N failed`, never let the first throw decide. Children return `Result` or `(any Error)?` and never throw. The parent sorts by input index, prints one stderr line per failure, then `K of N failed`, and exits with the shared `Status` if all failures agree, else `.failure`. Under `--format json` the per-item errors go into the envelope. | `waitForAll()`, `for try await` and `withThrowingDiscardingTaskGroup` are all first-error-wins (measured: one error, exit 1, the others lost or cancelled). A retry wrapper keyed on 75 must not re-run a batch that also contains a 65, so a mixed batch is `.failure` (argued, no source). | `G2-26`: each hit must catch inside every child or be fail-fast by design with a comment. The batch run must end with a `K of N failed` line and a non-zero status. Watched red (measured 2026-10-10): G2-26 hit a planted group, the first-error modes exited 1 with one error. | SHOULD |
| SW-CLI-28 | Declare `--format` (`text` or `json`), `--color` (`auto`, `always` or `never`), `-q/--quiet` and `--log-level` once in `GlobalOptions: ParsableArguments` and take it in every leaf command through `@OptionGroup`. No leaf declares its own `format`, `color`, `quiet` or `logLevel`. MUST for a CLI that a script or an SDK drives, SHOULD otherwise. | Identical flags across the family, and an SDK wrapper passes `--format json --color never`. | `G2-28a` (a second definition site) and `G2-28b` (a command file without the group, group commands are legitimate hits, read the list), empty output = pass. Every leaf's `--help` lists the flags. Watched red (measured 2026-10-10). | MUST (driven CLI) · SHOULD |
| SW-CLI-30 | Draw progress on stderr only when `isatty(2) == 1`, `CI` is unset, empty, `0` or `false`, the format is text and `--quiet` is off, decided by one `Progress.enabled(_:env:)`. | Measured matrix. SwiftPM and `container` gate on the stream only and ignore `CI`. | `G2-30` (progress or ANSI on stdout), empty output = pass. Matrix (a reading heuristic, it needs a pty such as `script -qec`), count of progress lines on stderr: 0 on a non-TTY, 1 on a pty, 0 on a pty with `CI=1`, with `--format json` and with `--quiet`. Watched red (measured 2026-10-10): a naive build drew 1 line on a non-TTY. | SHOULD |
| SW-CLI-31 | Prompt only when stdin is a TTY and `CI` is not truthy. Test `isatty(0) == 1` before every `readLine`, send the prompt text to stderr, ship `--yes` (and `--no-input` where a command also takes input), and when non-interactive without the flag throw `Status.usage` with a message naming `--yes`. | Measured: a naive prompt consumed piped data and acted on it. A gate on the output stream, as SwiftPM does, still reads the pipe. | `G2-31` (output = a prompting file with no stdin-specific test, an `isatty(1)` gate is listed on purpose, a custom helper spelling needs a manual look), then `R-31` must print 64. Watched red (measured 2026-10-10): `isatty(1)` gate and no gate both listed, the `isatty(0)` twin and a `Stdio.isTTY(0)` helper empty. | MUST |

## The Compiler

Gate: `swift build` in Swift 6 language mode, then the two greps below. Diagnostic on a violation: `error: reference to var
'stdout' is not concurrency-safe because it involves shared mutable state`. Judge `G3-07b` by output, not exit status.

```bash
grep -RlE --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' -e '\bstd(out|err)\b' --include='*.swift' --exclude='Stdio.swift' Sources                       # G3-07a
grep -RlEZ --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' -e '\b(fflush|ferror|fputs)\(' --include='*.swift' Sources | xargs -0 -r grep -L -e '@preconcurrency import'  # G3-07b
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-CLI-07 | Name the C globals `stdout` and `stderr` in exactly one file, `Stdio.swift`, whose libc imports are the SW-LANG-02 `canImport` chain with `@preconcurrency` on each arm, placed before `import Foundation`. That file also holds the output funnel (SW-CLI-24) and the terminator (SW-CLI-03). Do not alias the globals with `nonisolated(unsafe)` and do not lower the target to Swift 5 mode to make the error go away. `import FoundationEssentials` makes the order irrelevant but does not supply the globals. | Swift 6 mode rejects the C globals, and the first fixes an agent tries fail or weaken the target. | `swift build` (see the diagnostic above), `G3-07a` (output = a file other than `Stdio.swift` that names the globals) and `G3-07b` (output = a file that calls the stdio functions without a preconcurrency import). Watched red (measured 2026-10-10, Swift 6.4.0): `-swift-version 6 -typecheck` exits 1 for the alias and for a plain import, 0 for preconcurrency Glibc before Foundation, 1 for Foundation before it. G3-07a hit a planted file and is empty on the twin. | MUST |

## Running the Binary

Contract script, run against the built binary. `mytool` is your executable, `list` any command that prints, `big` one that
prints more than one stdio buffer, `boom` one that throws a classified domain error, `long` one that handles signals and `serve` one that runs a `ServiceGroup`. Signal
rows run in bash with `set -m`, otherwise a background job ignores SIGINT and the check lies. The greps are the aids. Run the script as `timeout -k 5 300 bash contract.sh`: a handler that ignores a signal makes `wait $pid` block forever, and expiry exits 124 (documented here, itself a finding of `SW-CLI-11` or `SW-CLI-22`) with no child left behind (watched 2026-10-10 with a child that ignores SIGTERM and SIGINT: exit 124, no process remained).

```bash
trap 'kill -KILL $(jobs -p) 2>/dev/null' EXIT; trap 'exit 124' TERM   # expiry of the timeout wrapper: exit 124, kill the background jobs
mytool big | head -1 >/dev/null; echo "${PIPESTATUS[0]}"                    # R-08 prints 0, never 141 or 74
mytool list >/dev/full; echo $?                                              # R-09 none of these prints 0
mytool --help >/dev/full; echo $?
mytool --version >/dev/full; echo $?
mytool --generate-completion-script bash >/dev/full; echo $?                 # 74
mytool list >&-; echo $?                                                     # 74
mytool list > out.txt; echo $?; cat out.txt                                  # 0 and the line is present
mytool --bogus; echo $?                                                      # R-12 prints 64
mytool boom; echo $?                                                         # R-23 the domain error's status, not 1
mytool $'--\e]0;x\a' 2>&1 >/dev/null | tr -cd '\033' | wc -c                 # R-25 prints 0
set -m; mytool long 2>err & pid=$!; sleep 1.2; kill -INT $pid; sleep 1.0; kill -0 $pid && echo alive
kill -INT $pid; sleep 0.8; kill -0 $pid || echo dead; wait $pid; echo $?     # R-11 alive, dead, 130
set -m; mytool long 2>err & pid=$!; sleep 1.5; kill -TERM $pid; wait $pid; echo $?; cat err  # R-22 143 after the cleanup line
mytool fail 2>/dev/null | wc -c                                              # R-05 text mode prints 0
command -v jq >/dev/null || echo 'R-29: needs jq'; mytool fail --format json 2>/dev/null | jq -e . >/dev/null; echo $?  # R-29 prints 0, one JSON document
echo y | mytool rm thing; echo $?                                            # R-31 prints 64
set -m; mytool serve 2>err & pid=$!; sleep 1; kill -TERM $pid; wait $pid; echo $?; cat err  # R-20 prints 0, then the cleanup line
set -m; mytool serve 2>err & pid=$!; sleep 1; kill -INT $pid; wait $pid; echo $?; cat err   # R-20 again with SIGINT, 0 and the cleanup line
# G4 scope: the executable targets of G0 (a macro plugin or a library is not a CLI), minus the example and fixture directories
if ! PKG=$(swift package dump-package) || ! command -v jq >/dev/null; then echo 'G4: needs swift and jq to list the executable targets' >&2
else
  mapfile -t DIRS < <(printf '%s\n' "$PKG" | jq -r '.targets[] | select(.type == "executable") | (.path // ("Sources/" + .name))')
  X=(--exclude-dir='Demo*' --exclude-dir='Example*' --exclude-dir='*Example' --exclude-dir='Sample*' --exclude-dir='Benchmark*' --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground')
  if [ "${#DIRS[@]}" -eq 0 ]; then echo 'G4: no executable target, SW-CLI does not apply'; else
    grep -RlZ -e '@main' --include='*.swift' "${X[@]}" "${DIRS[@]}" | xargs -0 -r grep -L -e 'SIGPIPE'          # G4-08 a heuristic, the call may sit in a sibling file
    grep -RnE -e '\braise\(SIG' --include='*.swift' "${X[@]}" "${DIRS[@]}"                      # G4-10
    grep -Rn -e 'exitCode(for:' --include='*.swift' "${X[@]}" "${DIRS[@]}"                      # G4-12 a heuristic, hits belong in the entry-point file only
    grep -RlZ -e 'SIGPIPE' --include='*.swift' "${X[@]}" "${DIRS[@]}" | xargs -0 -r grep -ln -e 'Process()'     # G4-13 a heuristic, file-level
    grep -RnE -e '\braise\(SIG' -e 'exit\(128' --include='*.swift' "${X[@]}" "${DIRS[@]}"      # G4-22
    grep -RlZ -e '@main' --include='*.swift' "${X[@]}" "${DIRS[@]}" | xargs -0 -r grep -L -e 'fullMessage(for'  # G4-23
    grep -RlZ -e '@main' --include='*.swift' "${X[@]}" "${DIRS[@]}" | xargs -0 -r grep -L -e 'sanitizeForTerminal'  # G4-25
  fi
fi
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-CLI-08 | Make `signal(SIGPIPE, SIG_IGN)` the first statement of an executable that can be piped, and treat EPIPE as exit 0. Poll `ferror(stdout)` in unbounded output loops and on failure return `Status.success` when `errno == EPIPE`, else `.io`. Record `errno` at the failing write through the SW-CLI-24 funnel before any suspension point. The flush check of SW-CLI-09 applies the same exemption. A library never calls `signal`, it is process-wide. | The runtime leaves SIGPIPE at the kernel default (`SigIgn 0`, measured), so `mytool big` piped to `head -1` dies with 141 and no message, a crash-range code the table never holds. With SIGPIPE ignored `print` and `fputs` only set the error flag, so without the poll the loop burns CPU to the end. Exit 0 is the fleet default (the platform norm is 141), the adopter may override. | `R-08` must print 0, `G4-08` is a heuristic. Watched red (measured 2026-10-10): no hook 141, any hook 0, a build that does not exempt EPIPE exits 74. A SIGPIPE-only override of `main()` is correct for SIGPIPE alone but is not a complete hook, SW-CLI-23 is. | MUST |
| SW-CLI-09 | End a successful run with a checked flush: `fflush(stdout) == 0 && ferror(stdout) == 0`, else write one stderr line and return `Status.io` (74), except that a failure whose first errno was EPIPE is a closed downstream pipe and counts as success (SW-CLI-08). Place the check once, in the SW-CLI-23 hook, which reaches `--help`, `--version` and `--generate-completion-script` too. Progress that must appear live goes to stderr or is followed by `fflush`. | `print` to `/dev/full` exits 0 with nothing on stderr. Off a TTY stdout is block-buffered (0 bytes after 1.5 s into a file or pipe, 7 bytes on a pty), and `print` then `fatalError` loses the line. `fflush` fails once and then returns 0 while `ferror` stays 1, so read both. A closed stdout is a fault: writes fail with EINVAL in an async root (the runtime's epoll descriptor takes fd 1) and EBADF in a plain synchronous root, and both exit 74 here (Rust's std treats EBADF as success, so this is a choice). | The `R-09` lines: none prints 0, `>&-` prints 74, to a file it exits 0 with the line present. Watched red (measured 2026-10-10, Swift 6.4.0 and 6.3.3): no hook exits 0 on `/dev/full` and `>&-`, a hook that checks after `await Self.main(nil)` exits 0 for `--help`, the full hook 74 for all. On Windows ArgumentParser exits through `ucrt._exit`, which does not flush (read 2026-10-10, `unverified`). | MUST |
| SW-CLI-10 | A handler that ends the process on a signal restores `SIG_DFL` and re-raises with `kill(getpid(), sig)`, never `raise(sig)` and never `exit(128 + sig)`, so the shell sees 128+n (130 for SIGINT). This governs handlers that end the process themselves, a service whose `ServiceGroup.run()` returns after a graceful stop exits 0 (SW-CLI-22). | `raise` is thread-directed and libdispatch blocks SIGINT on its worker threads, so the `raise` variant stayed alive after the second Ctrl-C and needed SIGKILL (137). `exit` is not async-signal-safe in a C handler (read 2026-10-10, unverified). | `G4-10`, empty output = pass, and `R-11`. Watched red (measured 2026-10-10): the re-raise handler exits 130, the `raise` variant 137. | MUST |
| SW-CLI-11 | Let a long-running command handle Ctrl-C in two stages and register SIGTERM beside SIGINT: `signal(SIGINT, SIG_IGN)` plus a `DispatchSource.makeSignalSource` per signal feeding an `AsyncStream`, installed from a nonisolated function outside `main.swift` (a handler closure in top-level code is inferred `@MainActor` and traps, `SW-CONC-34`). The first signal cancels the work and prints what a second press does, then the command cleans up, flushes and re-raises (SW-CLI-22). The second press restores `SIG_DFL` and calls `kill(getpid(), sig)` at once (SW-CLI-10). Servers use `ServiceGroup` instead (SW-CLI-20 to SW-CLI-22). Floor: Swift 6.0. | clig.dev (read 2026-10-10) says exit as soon as possible and tell the user what a second press does. An unhandled SIGTERM ends the process at 143 with no cleanup. `UnixSignalsSequence` is compiled out on Windows and WASI. | `R-11` expects `alive`, then `dead`, then 130. Watched red (measured 2026-10-10): a handler that exits on the first press is dead at once, the two-stage one is alive after the first INT and 130 after the second, and a handled SIGTERM prints the cleanup and exits 143. | SHOULD |
| SW-CLI-12 | Exit 64 for a usage or validation failure through the one SW-CLI-23 hook: map `code == .validationFailure` to `Status.usage` before `Status.checked` (without the remap `checked(160)` is `.failure` on Windows), under `#if !os(WASI)`. Assert 64 and flush-on-exit only in Linux and macOS contract tests until a Windows or WASI leg has run them. | ArgumentParser 1.8.2 exits 64 on Unix, `ERROR_BAD_ARGUMENTS` (160) on Windows and 1 on WASI, where `.failure` and `.validationFailure` are both `ExitCode(1)` and the public API cannot tell a usage failure from a plain one (read 2026-10-10). | `R-12` prints 64 on Linux, `G4-12` is a reading heuristic. Watched on Linux (measured 2026-10-10, Swift 6.4.0 and 6.3.3). The remap compiles in an async and a plain root but is a no-op on Linux, so its Windows branch has never executed. | SHOULD |
| SW-CLI-13 | After ignoring SIGPIPE, spawn children with swift-subprocess, not `Foundation.Process`, or reset a `Process` child's dispositions. Child-status mapping is `SW-IO`. Floor: swift-subprocess 1.0.1. | `exec` keeps ignored dispositions, so a `Process` child shows `SigIgn 0000000180001000` (bit 12 is SIGPIPE) after the parent ignored it, and swift-subprocess resets every signal in the child (read in 1.0.1 source 2026-10-10, measured on 1.0.0). | `G4-13`, file-level, a hit needs a look. Measurement: `grep SigIgn /proc/self/status` run in the child. Watched: the measurement yes, the grep hit a planted file and is empty on the twin (measured 2026-10-10). | SHOULD |
| SW-CLI-22 | A service that shut down gracefully exits 0 (`try await group.run()` returning is success). A finite command ended by a signal runs its cleanup, calls `fflush` (result ignored, a signal ending is already non-success), restores `SIG_DFL` and re-raises. Never `return` after cleanup and never `exit(128 + sig)`. A second signal during cleanup forces the default action at once. | Measured: `return` after cleanup exits 0 (an interrupted run reports success), unhandled exits 143 with no cleanup, re-raise exits 143 with cleanup. Whether a bounded job hosted in a `ServiceGroup` should exit 143 too is open, the default is 0 for a service and re-raise for a command. | `R-22` must show the cleanup line and 143, `G4-22` stays empty. Watched red (measured 2026-10-10): `return` exits 0 with cleanup, unhandled 143 without it, re-raise 143 with it and 130 for SIGINT. | MUST |
| SW-CLI-23 | Replace `await Self.main(nil)` with a root hook that owns parse, run, render, classify, flush and one terminator. Declare a non-throwing `static func main() async` whose first statement is `signal(SIGPIPE, SIG_IGN)`. Run `asyncParseAsRoot(nil)` and `run()` in `do/catch`. A domain error that is neither an `ExitCode` nor an ArgumentParser error is classified first by the SW-CLI-14 `switch`. Otherwise take `Self.fullMessage(for:)` and `Self.exitCode(for:)`, write the message to stdout when the code is `.success`, else sanitized (SW-CLI-25) to stderr, then apply the SW-CLI-12 remap and `Status.checked`. Then run the flush check (SW-CLI-09) and on failure print `mytool: error: write to stdout failed: reason` and use `.io`, which replaces an earlier non-success status. Finish with `Stdio.terminate`, the only `exit` call. Never test `error is CleanExit`. A plain `ParsableCommand` root uses the same body with `parseAsRoot(nil)`. Floor: ArgumentParser 1.8. | `exit(withError:)` terminates inside `main(_:)` for help, version, completions and every error, so code after `await Self.main(nil)` runs on the success path only: `--help >/dev/full` exits 0 under that hook and 74 under this one. A flush check without the EPIPE exemption turns a `big` piped to `head -1` into 74. `exitCode(for:)` alone gives 1 for a domain error. The `CleanExit` type is internal and false for `--help`, `exitCode(for:) == .success` is the public test. | `G4-23` (output = a root that does not own rendering, whether it delegates with `Self.main(nil)` or declares no `main()` at all, a `@main` file outside the CLI root is a legitimate hit), then `R-08`, `R-09`, `R-12` and `R-23`. A grep cannot see a hook that forgets the flush check, the behaviour lines are the gate. Watched red (measured 2026-10-10, async and plain roots, Swift 6.4.0 and 6.3.3): the bare root is listed, a build without classification exits 1 for `boom` against 65. | MUST |
| SW-CLI-25 | Apply `SW-SEC-17`'s `sanitizeForTerminal` at the root hook to `fullMessage(for:)` and to every classified error string before writing stderr. It escapes controls and bidi characters as `\u{HEX}`, it does not strip them. | ArgumentParser echoes raw ESC and BEL from argv into the terminal (measured: `mytool $'--\e]0;pwned\a'`). The stdlib has no equivalent and the root hook is the one place that reaches ArgumentParser's own messages. | `G4-25` (output = a root that never mentions the sanitiser), then `R-25` must print 0 ESC bytes. Watched red (measured 2026-10-10): the simple hook leaves 1 ESC byte on stderr, the hook leaves 0, both exit 64. | MUST (SW-SEC-17's tier) |
| SW-CLI-29 | Under `--format json`, print one envelope on stdout and one human line on stderr for a failure: `{"schema_version":1,"command":"fail","exit_code":65,"error":{"kind":"data_error","message":"..."}}` with sorted keys and stable `kind` slugs (a rename bumps `schema_version`), and one snapshot test per `Status` case. Follow the public `ocx` envelope, which also carries `detail` and `context` (default, the adopter may override). | Machine consumers parse stdout alone and the stderr line is the human channel (each channel reported once, SW-CLI-05). | `R-29` must print 0, and `R-05` must print 0 in text mode. Watched: the run yes (measured 2026-10-10), the red is the absent-envelope baseline and the snapshot tests were not written. | SHOULD |

```swift
static func main() async {
    signal(SIGPIPE, SIG_IGN)
    await Self.main(nil)  // --help, --version, completions and every error exit inside this call
    if Stdio.flushFailure() != nil { Stdio.terminate(.io) }  // wrong: never reached for them
}
```

```swift
static func main() async {  // right: the SW-CLI-23 hook
    signal(SIGPIPE, SIG_IGN)
    var status = Status.success
    do {
        var command = try await Self.asyncParseAsRoot(nil)
        if var asyncCommand = command as? AsyncParsableCommand {
            try await asyncCommand.run()
        } else {
            try command.run()
        }
    } catch {
        if let failure = error as? ToolError {  // the SW-CLI-14 classifier first
            Stdio.err(Stdio.sanitizeForTerminal("error: \(failure)"))
            status = failure.status
        } else {
            let message = Self.fullMessage(for: error)
            var code = Self.exitCode(for: error)
            #if !os(WASI)
                if code == .validationFailure { code = Status.usage.exitCode }  // Windows reports 160
            #endif
            if code == .success {  // help, version, completions are results
                if !message.isEmpty { Stdio.out(message) }
            } else if !message.isEmpty {
                Stdio.err(Stdio.sanitizeForTerminal(message))
            }
            status = Status.checked(code.rawValue)
        }
    }
    if let reason = Stdio.flushFailure() {  // nil for EPIPE
        Stdio.err("mytool: error: write to stdout failed: \(reason)")
        status = .io
    }
    Stdio.terminate(status)
}
```

## Tests

Gate: `swift test`, then `swift build` after adding a case with no mapping, and the grep below (output = a wildcard in the
classifier).

```bash
grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' -e 'default:' --include='Classify*.swift' Sources                                                # G5-14
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-CLI-14 | Write one contract test per `Status` case (a real invocation, or `await #expect(processExitsWith: .exitCode(n)) { ... }`), lock `Status.checked(256) == .failure`, and classify errors into `Status` with an exhaustive `switch` and no `default:`, so a new error case fails compilation until it is mapped. The SW-CLI-23 hook calls that classifier for a thrown domain error before it consults `exitCode(for:)`. Floor: Swift 6.2 for `processExitsWith` (compiler-gated), a shell-invocation test below that. | Otherwise 256-style wraps and platform divergences ship unseen. | `swift test` exits non-zero on a planted wrong code. An unmapped case must fail `swift build` with `switch must be exhaustive`. `G5-14` empty = pass. Watched red (measured 2026-10-10, Swift 6.4.0 and 6.3.3): the bare-integer test fails (`.exitCode(EXIT_FAILURE)` expected, `EXIT_SUCCESS` reported), an unmapped case failed two switches, G5-14 hit a planted wildcard. A suite over every case was not written. | MUST |
| SW-CLI-19 | If swift-configuration is used, drop empty environment values before the provider: `EnvironmentVariablesProvider(environmentVariables: env.filter { !$0.value.isEmpty })`, with `ConfigReader(providers:)` in precedence order and the flag entering as an `InMemoryProvider`. Prefer the hand-rolled resolver of SW-CLI-17 for three layers and a handful of keys. Floor: swift-configuration 1.2.2. | Measured: with `CFGCLI_TIMEOUT=` set and a project file present the reader returned the default 30, not the file's 4, because it treats an empty variable as set. | The SW-CLI-17 subset test run against the swift-configuration resolver. Watched red (measured 2026-10-10): 1 issue (`an empty env var counts as unset`) unfiltered, 0 filtered. | CONSIDER |

## Documented Gaps

Owner decisions, each a default the adopter may override.

- **Windows and WASI** are `unverified: read only`: `UnixSignals` compiles to an empty stream so `gracefulShutdownSignals` is a
  silent no-op, a bridge to `triggerGracefulShutdown()` is unresearched, and the hook's 160-to-64 remap has never executed.
- **Flush failure against an earlier failure status:** 74 wins. With `--format json` a failed flush after exit 65 exits
  74, a variant that only upgrades a success keeps 65, and text mode keeps 65 because nothing reaches stdout. A retry wrapper
  keyed on 75 must not retry into a full disk.
- **Closed stdout:** 74 for both errnos. Exempting EBADF (Rust parity) is reachable only in a synchronous root.
- **Tiers:** SW-CLI-29 and SW-CLI-30 are SHOULD, lift them to MUST once a CLI that a script drives exists.
- No corpus exemplar implements a five-layer precedence, an error envelope, a `K of N failed` line, a root flush check or a
  TTY-and-`CI` gate, so SW-CLI-17, -23, -26, -29, -30 and -31 rest on fixtures, not prior art.

## What Agents Get Wrong Here

Ranked by judgment from the failure tables and corpus counts. No agent-output experiment was run.

1. **`await Self.main(nil)` as the whole hook**, a flush check after it, `if error is CleanExit` for help, or a bare `@main`
   with no `main()`. `--help` and every error skip the check, and a thrown domain error exits 1. `SW-CLI-23`, `SW-CLI-14`.
2. **`print` as the only output path**, or `FileHandle.standardError.write(Data(...))`. `/dev/full` and a closed pipe exit 0,
   the legacy write traps 132 on EPIPE. `SW-CLI-09`, `SW-CLI-24`, `SW-CLI-04`.
3. **`exit(1)`, `Foundation.exit` or `Darwin.exit` after printing an error.** It skips `defer`, loses buffered stdout, and
   `Darwin.exit` does not build on Linux. `SW-CLI-03`.
4. **`throw ExitCode(n)` with a computed or small custom code (2, 3, 200).** It wraps modulo 256 and collides with crash codes.
   `SW-CLI-01`.
5. **`print("Error: ...")` for diagnostics**, so the line lands in the pipe. `SW-CLI-05`.
6. **Top-level `try await` in `main.swift`**, or `main() async throws` with no catch: exit 132 and a backtrace, not 1.
   `SW-CLI-02`.
7. **Silencing the Swift 6 `stdout` error** with `nonisolated(unsafe)` or by dropping to Swift 5 mode. `SW-CLI-07`.
8. **No SIGPIPE ignore**, `signal(SIGPIPE, SIG_IGN)` in a library, or `Process()` children after the ignore. `SW-CLI-08`,
   `SW-CLI-13`.
9. **`ServiceGroup` with no signals** (trusting the 2020 blog), `[.sigterm]` alone, `[]` written out, or the DocC
   article's member name (a compile error). `SW-CLI-20`.
10. **`raise(SIGINT)`, `exit(128 + sig)` or `signal(SIGTERM) { _ in exit(0) }` in a handler.** A `@convention(c)` handler cannot
    capture and is not async-signal-safe. `SW-CLI-10`, `SW-CLI-11`, `SW-CLI-22`.
11. **`@Option var timeout: Int = 30` then `flag ?? env ?? file`**, scattered `ProcessInfo` reads and `~/.config` literals.
    The default makes the flag non-nil so the environment never wins. `SW-CLI-17`, `SW-CLI-18`.
12. **`LoggingSystem.bootstrap` in a library or every subcommand**, `StreamLogHandler.standardOutput`, or `logLevel` set on one
    logger. `SW-CLI-15`, `SW-CLI-16`.
13. **A `readLine()` prompt gated on the output stream or on nothing**, `print("\r...")` progress on stdout, hand-written
    completions (the generator is the ArgumentParser default). `SW-CLI-31`, `SW-CLI-30`.
14. **`environment["NO_COLOR"] != nil`**, and **`withThrowingTaskGroup` believed to report every failure.** `SW-CLI-06`,
    `SW-CLI-26`.
15. **Asserting 64 in a cross-platform CI test.** Windows gives 160 and WASI 1. `SW-CLI-12`.
