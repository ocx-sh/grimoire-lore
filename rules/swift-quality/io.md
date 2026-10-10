---
# Read on demand through the index. This glob matches no file, so a client never auto-loads the file.
paths:
  - "**/.swift-quality-depth-on-demand"
title: Files, Processes and Formats
summary: The SW-IO family, owning spawning with swift-subprocess and the SDK's one spawn module, durable writes and content-addressed stores, paths and archive extraction, and deterministic on-disk and wire formats
---

# Files, Processes and Formats

Binds to Swift 6.4.0 and 6.3.3 on Linux x86_64, swift-subprocess 1.0.1 and swift-system 1.5.0 or newer (measured
2026-10-10). Every Darwin or Windows statement is `unverified: read only`.

This file owns how a Swift program starts a child, replaces and publishes files, composes paths, unpacks untrusted
archives, and which bytes a format writes: JSON key order and dates, digests, directory order, clocks and the Foundation
import choice. Neighbours cite by ID. `SW-CONC-24` owns the timeout race, `SW-CLI` the exit-status table and the SIGPIPE
disposition (`SW-CLI-13`), `SW-API` the SDK's public error, exit mapping, capture default and tolerant decode
(`SW-API-16`, `SW-API-17`, `SW-API-20`, `SW-API-21`), `SW-LANG-02` the libc import chain, `SW-NET` HTTP clients and
streaming a network body (`SW-NET-07`), `SW-SEC` capped reads of untrusted input (`SW-SEC-03`), `SW-REL-08` binary size,
`SW-PKG` the general pin policy and `SW-GATE-10` the wiring of the greps below. Streaming a large file to disk is
`SW-IO-19` (hash while writing) and `SW-IO-30` (hash the bytes written). **SDK** means the pinned default shape: a
library that wraps a command-line tool through one spawn module. Without one, read "library".

Contents: [Dates and Defaults](#dates-and-defaults) · [Build Gate](#build-gate) · [Spawn Greps](#spawn-greps) ·
[File and Path Greps](#file-and-path-greps) · [Format Greps](#format-greps) ·
[Strace and Fixture Runs](#strace-and-fixture-runs) · [Process Runs](#process-runs) · [Decode Tests](#decode-tests) ·
[Reading Heuristics](#reading-heuristics) · [What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Defaults

Measured 2026-10-10 on Swift 6.4.0 and 6.3.3 (Linux x86_64, Docker images) with swift-subprocess 1.0.1 and SwiftLint
0.65.1. A container run of the toolchain on a bind-mounted tree always passes `--scratch-path .build-linux` to `swift build`, `swift test`
and `swift package`: the default writes Linux build products and `workspace-state.json` into the host `.build`, and a host build then
finds a foreign tree (measured 2026-10-10: the default left `.build` holding `workspace-state.json` and `debug -> out/Products/Debug-linux-x86_64`; `docker run -v "$PWD:$PWD" -w "$PWD" swift:6.4 swift build --scratch-path .build-linux` left `.build` absent). Ignore `.build-linux` in version control. Every grep runs from the repository root with an explicit directory operand. Source trees may be symlinks (RxSwift's `Sources/` is a symlink farm of 412 files): every scan here uses `grep -R` and `find -L`, because `grep -r` skips symlinked files and `find` without `-L` skips a symlinked directory, so the scan and the `SW-CORE-03` canary must count the same files (measured 2026-10-10: `find` 412 files, `grep -r` 1, `grep -R` 412). `Sources` stands for each
product source directory, and tests are exempt unless a row says otherwise. A grep's output is the violation, so
empty output (exit 1) is the pass, except in a presence check where the cell says empty output fails.

Enforcement is grep plus behavioural runs, never SwiftLint `custom_rules`: the static Linux SwiftLint 0.65.1 prints
`Skipping enabled rule 'custom_rules'` and exits 0 on a planted violation (measured 2026-10-10).

| Floor | Binds | Gated by |
|---|---|---|
| Swift 6.0 | stdlib `FilePath` absent through 6.4, Foundation on Linux, typed throws, date strategies, string views | compiler and corelibs |
| tools 6.2 | swift-subprocess 1.0.x and every spawn row | manifest tools version |
| Swift 5.7, 6.3 | `ContinuousClock` (SE-0329), readable `DecodingError` text (SE-0489) | compiler, corelibs |

Defaults an adopter may override once, with the reason recorded: the rebuildable-cache exemption (`SW-IO-09`), the
5 s teardown grace (`SW-IO-23`), reject-not-strip for absolute
archive names (`SW-IO-20`), the swift-system floor `from: "1.5.0"` (`SW-IO-01`), signals mapped to `128 + n`, and
Windows and Apple legs left unverified. `ProcessRunner`, `Completed` and `OcxSpawn` are example names to rename.

Scope by code kind. Apple apps take `SW-IO-01`, `SW-IO-02`, `SW-IO-11` to `SW-IO-17`, `SW-IO-28` and `SW-IO-29` only
(they do not spawn and their store is Core Data or SwiftData). Servers take everything. Libraries take `SW-IO-04` and
every row that matches what the code does: spawn rows (`SW-IO-03`, `SW-IO-05` to `SW-IO-08`, `SW-IO-23` to `SW-IO-27`) when it starts a child, durable-write rows (`SW-IO-09`, `SW-IO-10`, `SW-IO-18` to `SW-IO-22`, `SW-IO-30`) when it persists.
Test code is exempt from `SW-IO-05`, `SW-IO-09` and `SW-IO-10` when it writes scratch files, never from `SW-IO-08`.

## Build Gate

```sh
swift build -Xswiftc -warnings-as-errors   # exit 1 is a finding. Run it on the 6.4 leg and on the floor leg
# P1 (SW-IO-02): a file that names URLSession and lacks the guard prints. Empty output is the pass.
grep -RlZ --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'URLSession' Sources | xargs -0 -r grep -L -e 'canImport(FoundationNetworking)'
```

File lists cross `xargs` NUL-separated (`grep -lZ`, `xargs -0`), so a path such as `My App/Main.swift` is one operand (the old `xargs -r` form split it and printed `grep: My: No such file or directory` with exit 123, measured 2026-10-10). `xargs` exits 123 when a batch lists files and none matched, and 0 for a mixed batch, so read the output, not the status.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-IO-01 | Take `FilePath` from `import SystemPackage` with swift-system `from: "1.5.0"`. Never write an unconditional `import System`, never wrap a stdlib `FilePath` in `#if compiler(>=6.4)`, and never use `CommandLine.executablePath`. Where a public signature crosses into an API typed with the SDK's `System.FilePath`, write `#if canImport(System)`, `import System`, `#else`, `import SystemPackage`, `#endif`. | SE-0529 (stdlib `FilePath`) is accepted (2026-06-05) but absent from Swift 6.4.0 (read 2026-10-10), and `System` does not exist on Linux, so code written on macOS fails the Linux leg. | The build gate: exit 1 with `cannot find 'FilePath' in scope`, `no such module 'System'` or `has no member 'executablePath'` is the finding, exit 0 is the pass. Watched red on 6.4.0 and 6.3.3 (measured 2026-10-10). The two `FilePath` types are distinct on Apple: unverified: read only. The swift-upgrade skill re-checks SE-0529 at each toolchain bump. | MUST |
| SW-IO-02 | Every file that names `URLSession` carries `#if canImport(FoundationNetworking)`, `import FoundationNetworking`, `#endif`. | Unguarded, Linux fails with `type 'URLSession' (aka 'AnyObject') has no member 'shared'`, a missing-member message that does not point at the missing module. | The build gate (exit 1 on the Linux leg) and block P1 (a printed file is a finding, empty output is the pass, Apple-only code prints too, so run it on Linux-building targets). Watched red on 6.4.0 and 6.3.3 (measured 2026-10-10). | MUST |
| SW-IO-03 | Give every collected `output:` and `error:` a `limit:` sized to the largest legitimate output, never `Int.max`. Use `.bytes(limit:)` for bytes that must round-trip (hashed, tar, signature, digest stream) and `.string(limit:)` only for text parsed as UTF-8. Detect overflow with `error.code == .outputLimitExceeded`, never by message text. | The limit is the call's memory ceiling, and overflow throws `SubprocessError` and tears the child down. `.string(limit:)` turns invalid UTF-8 into U+FFFD (`61 ff 62` becomes `61 fffd 62`), which corrupts a digest or an archive. | The build gate (a missing `limit:` is `cannot conform to 'OutputProtocol'`) plus `grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'limit: Int.max' -e 'limit: .max' Sources` (output = violation). Both watched red with swift-subprocess 1.0.1 (measured 2026-10-10). Reading heuristic: `grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e '\.string(limit:' Sources` lists calls to read for hashed or parsed bytes. | MUST |

## Spawn Greps

```sh
# P2 (SW-IO-07): a file that imports Subprocess and never reads a status prints. Empty output is the pass.
grep -RlZ --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'import Subprocess' Sources | xargs -0 -r grep -L -e 'terminationStatus' -e 'isSuccess'
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-IO-05 | Spawn new processes with swift-subprocess. `Foundation.Process` appears only in legacy code that carries a `// legacy:` comment naming the reason (a manifest below tools 6.2 cannot take swift-subprocess, `SW-IO-06`, and the reason is then `// legacy: tools floor`), and in test helpers that redirect output to files. Every hit also satisfies `SW-IO-25`. | `Process` has no cancellation, no output limit, a pipe-deadlock trap and an environment that replaces instead of merging, and SF-0007 says Subprocess will eventually replace it. The SIGPIPE disposition reason is `SW-CLI-13`. | `grep -Rn --include='*.swift' -e '[^A-Za-z_]Process()' -e 'NSTask' -e '\.launchPath' Sources Plugins` (drop `Plugins` when absent). It uses the same alternatives as the `SW-GATE-10` E11 grep (a `Process()` at column 0 escapes this one), which stays the gate. Output = violation unless the hit carries `// legacy:`. A repo-local type named `Process` also matches, so read each hit. Watched red (measured 2026-10-10). | MUST |
| SW-IO-06 | Depend on `.package(url: "https://github.com/swiftlang/swift-subprocess", from: "1.0.1", traits: [])` under `// swift-tools-version: 6.2`. Never `exact:` and never a 0.x range. A CLI or server keeps `traits: []` with the `SW-PKG-23` comment unless a call site needs `.data(limit:)` or `Data` input, then drops it and says why in a comment. An SDK (`SW-API-12`) keeps the default trait and writes the `.package` without `traits:`, because its link footprint is `libFoundationEssentials` either way (3,818,816 against 3,749,280 bytes). | 1.0.0 leaks one descriptor per early-break `.sequence` (50 runs: +50), 0.x has another API with implicit 128 KB caps, and `exact:` in a library blocks every consumer's resolution. The README's Getting Started block still shows `.upToNextMinor(from: "0.4.0")` (read 2026-10-10), so do not copy it. `traits: []` removes only Subprocess's own Foundation link, not the one a `JSONDecoder` product has. | `grep -Rn --include='Package.swift' --include='Package@swift-*.swift' --exclude-dir='.build*' -e 'swift-subprocess.*exact' -e 'swift-subprocess.*upToNextMinor' -e 'swift-subprocess.*from: "0\.' -e 'swift-subprocess.*from: "1\.0\.0"' .` (output = violation, line-based so a wrapped `.package(` escapes it). Resolver proof: Swift 6.1 `swift package resolve` exits 1 with `contains incompatible tools version (6.2.0)`. Leak: 1.0.0 `delta=50` exit 1, 1.0.1 `delta=0` exit 0. All watched (measured 2026-10-10). The swift-upgrade skill re-checks the pin at each swift-subprocess release. | MUST |
| SW-IO-07 | Check `terminationStatus` at every `run` call site. A non-zero exit is a result, not a throw. | `run` returns `.exited(7)` normally, so an ignored status turns a failed tool into silent success, and the Python `check=True` habit does not carry over. | Block P2 (file level: a printed file never looks at a status, empty output is the pass). A file that checks one call and ignores another passes, and a file that imports Subprocess only for types prints too (swiftly `Platform+Process.swift`), so per-call coverage is a reading heuristic. Watched red (measured 2026-10-10). | MUST |
| SW-IO-08 | Build command lines as argument arrays. Never `sh -c`, `bash -c` or `cmd /c` with an interpolated or non-literal script. When a shell is unavoidable the script is a literal and values travel as positional parameters: `["-c", "cmd \"$1\"", "sh", value]`. | CWE-78. A planted `echo \(userInput)` ran `touch` (canary file created) and the positional form did not. | Narrow: `grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'sh"[^]]*"-c", *"[^"]*\\(' -e 'sh"[^]]*"-c", *[a-zA-Z_]' Sources`. Wide triage: `grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e '"-c", *"[^"]*\\(' -e '"-c", *[a-zA-Z_]' Sources` (false positives: `git -c`, `swift build -c`, `clang -c`). The narrow grep misses a shell name on an earlier line, only the wide one finds it. Output = violation. Watched red (measured 2026-10-10). | MUST |

## File and Path Greps

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-IO-09 | Route every write of durable state through the one helper of `SW-IO-18`. `Data.write(to:options:.atomic)`, `String.write(toFile:atomically:)`, `FileManager.replaceItemAt`, NIOFS `replaceItem(at:withItemAt:)` and a plain `Data.write(to:)` into a digest-named or lock path are findings. A rebuildable cache or scratch file may keep `.atomic` with a `// non-durable: rebuildable` comment (default). | `.atomic` is atomic for readers only: strace shows `fsync(file)` and `rename` and no directory fsync, and it does not keep a 0600 mode on 6.3.3 or 6.4.0 (0644 after the replace). `replaceItemAt` has no directory sync on 6.4.0 and destroys the new content on 6.3.3 (reversed `renameat` arguments in corelibs `release/6.3`, read 2026-10-10). NIOFS `replaceItem` documents `rename(2)` but is `unlink` then `rename`, so a crash between them loses the target. | `grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e '\.atomic\b' -e 'atomically:' -e 'replaceItemAt(' -e 'replaceItem(at' Sources` (output = violation unless the hit carries the cache comment, and a protocol declaration or doc comment hit is read, not counted). The plain-write half is `SW-IO-19`'s run. Watched red, with behaviour on 6.3.3 and 6.4.0 (measured 2026-10-10). | MUST |
| SW-IO-10 | Stage in the destination's own directory, or in a staging directory under the same store root. Never `NSTemporaryDirectory()` or `FileManager.default.temporaryDirectory` for anything later renamed or linked into place. | `/tmp` is another filesystem in containers and CI, so `rename` returns `EXDEV` (errno 18) and `FileManager.moveItem` silently falls back to copy and delete, which is neither atomic nor durable. | `grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'NSTemporaryDirectory()' -e '\.temporaryDirectory' Sources` (output = violation, except a hit that only feeds a throwaway test fixture). Watched red, including `rename` rc -1 errno 18 across mounts (measured 2026-10-10). | MUST |
| SW-IO-11 | Compose paths with `FilePath.appending(_: Component)`. Never `+ "/" +`, `push`, `pushing` or `appendingPathComponent` with unvalidated input. Test containment with `FilePath.starts(with:)`, never `String.hasPrefix`, and read names that may be non-UTF-8 as `FilePath`. Use `URL` only at the edge of a Foundation or NIO API and `String` never for a composed path. | `URL.appendingPathComponent("../evil")` gives `/srv/store/../evil`, `FilePath.pushing("/etc/passwd")` replaces the base, `"/srv/store-evil/x".hasPrefix("/srv/store")` is `true`, and a file name with byte `0xFF` comes back from `contentsOfDirectory` as a U+FFFD name that `fileExists` rejects. | `grep -RnF --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e '+ "/" +' Sources` and `grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'pushing(' -e '\.push(' -e 'appendingPathComponent(' Sources`, output = violation unless the argument is a literal, an enum case or a validated component. The `hasPrefix` and non-UTF-8 forms are reading heuristics. Compile trap: `p.components.filter { }` returns `ComponentView`, wrap it in `Array(...)`. Greps watched red (measured 2026-10-10). | SHOULD |
| SW-IO-17 | Sort `contentsOfDirectory`, `enumerator` and `subpathsOfDirectory` results by UTF-8 bytes (`sorted { $0.utf8.lexicographicallyPrecedes($1.utf8) }`) before they reach output, a digest, a manifest or an assertion. | `readdir` order is filesystem-specific (12 names listed `e,w,m,f,a,y,b,z,d,k,c,x` on ext4) and plain `sorted()` is canonical-equivalence order, not bytes. | Block P3 (file level: a printed file lists a directory and never sorts, empty output is the pass). Other filesystems order differently: unverified: read only. Watched red (measured 2026-10-10). | SHOULD |

```sh
# P3 (SW-IO-17): a file that lists a directory and never sorts prints. Empty output is the pass.
grep -RlZ --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'contentsOfDirectory' -e 'subpathsOfDirectory' -e 'enumerator(' Sources | xargs -0 -r grep -L -e 'sort'
```

## Format Greps

```sh
# P4 (SW-IO-04): a library file with a bare Foundation import prints, whatever its access level, outside golden-output, test-support and playground directories (SwiftGen: 209 of 279 hits sat in `Sources/TestUtils/Fixtures`, measured 2026-10-10; add this tree's own such directories). Empty output is the pass. A `#if canImport(Darwin)` / `#else` split that imports Foundation on Apple and FoundationEssentials elsewhere is the same shape and passes.
grep -RlEZ --include='*.swift' --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' -e '^((public|package|internal|@preconcurrency) )*import Foundation$' Sources | xargs -0 -r grep -L -e 'canImport(FoundationEssentials)' -e 'canImport(Darwin)'
# P5 (SW-IO-12): a file that builds an encoder without sortedKeys prints. Empty output is the pass.
grep -RlZ --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'JSONEncoder()' Sources | xargs -0 -r grep -L -e 'sortedKeys'
# P6 (SW-IO-14): a file that encodes or decodes JSON, mentions Date and sets no strategy prints. Empty output is the pass.
grep -RlZ --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'JSONEncoder()' -e 'JSONDecoder()' Sources | xargs -0 -r grep -lZ -e 'Date' | xargs -0 -r grep -L -e 'dateEncodingStrategy' -e 'dateDecodingStrategy'
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-IO-04 | Libraries import `FoundationEssentials` under `canImport(FoundationEssentials)` with a `Foundation` fallback. Executables may `import Foundation`. Hex-encode with a table lookup, never `String(format:)`. Never depend on the swift-foundation package. | Essentials lacks ICU-dependent and platform API (`String(format:)`, `trimmingCharacters`, `replacingOccurrences`, `range(of:)`, `NumberFormatter`, `DateFormatter`, `Process`, `FileHandle`, `NSLock`), so one such call silently pins a library to full Foundation. `exit()` needs the libc import chain (`SW-LANG-02`). The swift-foundation package's own distribution guide says it is not for shipping. Binary size is `SW-REL-08`'s. | Block P4 (library `Sources/` only, the grep cannot tell a library from an executable). `grep -Rn --include='Package.swift' --exclude-dir='.build*' -e 'swiftlang/swift-foundation' -e 'apple/swift-foundation' -e 'swift-corelibs-foundation' .` and `grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'String(format:' -e '\.hexString' Sources`, output = violation. Expected noise on an executable-first or Apple-only tree (P4 printed 36 of 36 executable files in swiftly): run both on library `Sources` only. Build proof: the file compiles with only `FoundationEssentials` imported (6.4.0 and 6.3.3). Watched red (measured 2026-10-10). The `canImport(Darwin)` spelling of the guard passes: jwt-kit printed 14 files with the first form of the cell and 0 with this one (2026-10-10). | SHOULD |
| SW-IO-12 | Bytes that are hashed, signed, diffed, committed or compared across runs come from `JSONEncoder` with `outputFormatting = [.sortedKeys, .withoutEscapingSlashes]` and explicit date strategies, or from an explicit sort. Never from iterating a `Dictionary` or `Set` into output. Where a peer requires RFC 8785 bytes write the serializer, otherwise call the output stable on one implementation and hash the stored bytes (`SW-IO-30`). | Hash seeds are per process, so two runs emit different bytes and digests (`cmp` exit 1 on 6.4.0 and 6.3.3). `.sortedKeys` is UTF-8 byte order and not RFC 8785: non-BMP keys sort differently, `-0.0` prints `-0` and `123456789012345680000.0` prints `1.2345678901234568e+20`. `SWIFT_DETERMINISTIC_HASHING=1` repeats an order without sorting and is not stable across stdlib releases. | Block P5 (a printed file builds an encoder without `sortedKeys`, empty output is the pass, output meant only for humans is exempt). Runtime twin: run the tool twice in separate processes, then `cmp -s out1 out2` (exit 0 = pass). Watched red (measured 2026-10-10). On Apple frameworks the order has changed between releases: unverified: read only. | MUST |
| SW-IO-13 | Parse a digest with a byte-level function into a value type: algorithm allow-list, `utf8.starts(with:)`, exact length, lowercase ASCII hex only. Compare parsed values, never raw strings and never `.lowercased() ==`. The parsed `hex` is the only string that becomes a path component. A digest `Regex` is lowercase-only and anchored (`wholeMatch`), never `[a-fA-F0-9]`. | `Character` ranges accept `b` plus U+0308 and `d` plus ZWJ as hex digits, `Character.isHexDigit` accepts fullwidth `ａ`, and `String ==` is canonical equivalence, so two spellings of one digest become two blob names or one wrong one. The OCI image spec says `[A-F]` MUST NOT be used. | `grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'hasPrefix("sha' -e 'split(separator: ":")' -e '"a"..."f"' -e 'isHexDigit' -e 'lowercased() ==' -e 'A-F' Sources` (a hit inside digest or reference parsing is a violation) plus a unit test that rejects all of: combining mark, ZWJ, fullwidth hex, fullwidth colon, uppercase, 63 and 65 characters, trailing newline, trailing NUL, traversal, `sha384`, empty hex, no colon. Naive impls red, `ContentDigest` below 16 of 16 vectors green on 6.4.0 and 6.3.3, and a planted uppercase mutation red (measured 2026-10-10). | MUST |
| SW-IO-14 | Every `JSONEncoder` and `JSONDecoder` that touches a `Date` sets `dateEncodingStrategy` or `dateDecodingStrategy` explicitly: `.iso8601` for second precision, `.millisecondsSince1970` or a custom fractional ISO style below that. Never the default. | The default writes `timeIntervalSinceReferenceDate`, so Unix epoch 0 becomes `-978307200`, which a Python or Go peer misreads. `.iso8601` drops the fraction (0.123456 s is lost), so choose per field. | Block P6 (a printed file touches `Date` with no strategy set, empty output is the pass). Runtime: encode `Date(timeIntervalSince1970: 0)` and require `1970-01-01...` or `0`. Watched red (measured 2026-10-10). | MUST |
| SW-IO-15 | Machine-facing numbers and dates never pass through `.formatted()`, `NumberFormatter`, `DateFormatter`, `Locale.current` or `lowercased(with:)`. Use interpolation or `String(describing:)` for numbers and `Date.ISO8601FormatStyle()` for dates. | On Linux `.formatted()` yields `1,234.5` and `14/11/2023` (locale `en_001`), and on Darwin it follows user preferences (unverified: read only). Setting `LANG` or `LC_ALL` changes nothing on Linux, so it is no test lever. | `grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e '\.formatted()' -e 'formatted(date:' -e 'NumberFormatter()' -e 'DateFormatter()' Sources` (output = violation) plus a test that compares machine strings to literals. Watched red: `got=1,234.5 want=1234.5` (measured 2026-10-10). | MUST |
| SW-IO-16 | Elapsed time, timeouts, backoff and benchmarks use `ContinuousClock`. `SuspendingClock` is for awake time only and `Date` for wall-clock timestamps only. No `Date()` subtraction, `timeIntervalSince(`, `timeIntervalSinceNow` or `DispatchTime.now` for a duration. Never serialize an `Instant` or compare one across processes. Machine output of a duration is `Duration.components` or seconds you format, never `Duration.formatted()`. | Wall time steps (NTP, VM resume). `ContinuousClock` is the `Task.sleep(for:)` default and `CLOCK_BOOTTIME` on Linux (stdlib `Clock.cpp`, read 2026-10-10). A wall-clock subtraction on external data is legitimate with a comment. | `grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'timeIntervalSince(' -e 'timeIntervalSinceNow' -e 'DispatchTime.now' Sources` and `grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'Task.sleep(nanoseconds' Sources`, output = violation. `SW-GATE-10` E07 is the gate invocation of the second and cites this row. Greps watched red. The continuous-versus-suspending difference is unmeasured: the kernel never suspended (`CLOCK_BOOTTIME - CLOCK_MONOTONIC = 0`). | SHOULD |

Recipe for `SW-IO-13`, Swift 6 mode, typed throws, no Foundation (built with `-warnings-as-errors` on 6.4.0 and 6.3.3):

```swift
public struct ContentDigest: Hashable, Sendable, CustomStringConvertible {
    public enum Algorithm: String, Sendable, CaseIterable {
        case sha256, sha512
        var hexLength: Int { self == .sha256 ? 64 : 128 }
    }
    public enum ParseError: Error, Equatable { case unknownAlgorithm, wrongLength, notLowercaseHex }

    public let algorithm: Algorithm
    /// Lowercase ASCII hex, validated: safe as a single path component.
    public let hex: String
    public var description: String { "\(algorithm.rawValue):\(hex)" }

    public init(parsing text: String) throws(ParseError) {
        let bytes = text.utf8
        guard let algorithm = Algorithm.allCases.first(where: { bytes.starts(with: ($0.rawValue + ":").utf8) }) else {
            throw .unknownAlgorithm
        }
        let encoded = bytes.dropFirst(algorithm.rawValue.utf8.count + 1)
        guard encoded.count == algorithm.hexLength else { throw .wrongLength }
        guard encoded.allSatisfy({ ($0 >= 0x30 && $0 <= 0x39) || ($0 >= 0x61 && $0 <= 0x66) }) else {
            throw .notLowercaseHex
        }
        self.algorithm = algorithm
        self.hex = String(decoding: encoded, as: UTF8.self)
    }
}
```

## Strace and Fixture Runs

```sh
# C1 (SW-IO-18): W is the target's directory. Exit 1 means no directory fsync followed the rename.
: "${W:?set W to a fresh directory}" "${STORE:?set STORE to the store root}"; command -v strace >/dev/null || { echo 'C1: needs strace (Linux only)' >&2; exit 69; }
strace -f -y -e trace=fsync,fdatasync,rename,renameat,renameat2 -o "$W/trace.txt" ./mytool write "$W/target"
grep -q -e "fsync([0-9]*<$W>)" "$W/trace.txt"
# C2 (SW-IO-19): after a put whose bytes do not match the digest, any output is a finding.
find "$STORE" -type f
# C3 (SW-IO-20): extract each hostile tar into "$W/root". Any output is a file outside the root.
find "$W" -maxdepth 1 -type f
# C4 (SW-IO-20): an extractor that never opens with O_NOFOLLOW prints. Empty output is the pass.
grep -RlZ --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'extract' -e 'untar' Sources | xargs -0 -r grep -L -e 'O_NOFOLLOW' -e 'noFollow'
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-IO-18 | The durable-write helper creates the temp in the target's own directory (`O_CREAT`, `O_EXCL`, `O_NOFOLLOW` and `O_CLOEXEC`), loops on short writes and `EINTR`, `fchmod`s to the explicit mode, `fsync(fd)` (failure is fatal and never retried), checks `close`, `rename`s, then opens the directory and `fsync(dirfd)`. The temp is unlinked on every failure. Use the recipe below. At start-up sweep stale `.tmp-` files, since `defer` does not run after `SIGKILL`. | The directory fsync is what makes the rename survive power loss, and `fchmod` before `fsync` sets the mode independent of the umask. | Block C1 (exit 1 = no directory fsync, a printed trace line shows the order). `.atomic` exit 1 and mode 644, the helper exit 0 and mode 600, on 6.4.0 and 6.3.3 (measured 2026-10-10). Crash injection was not run: strace proves syscall order, not on-disk state. The sweep is a reading heuristic. The `strace` binary is absent from the `swift` image, so install it. | MUST |
| SW-IO-19 | Publish a content-addressed blob in six steps. (1) Stage on the same filesystem as `blobs/`. (2) Hash while writing. (3) Compare to the expected digest before any publish step. (4) On mismatch or error unlink the temp. (5) Publish with `link(tmp, final)` and treat `EEXIST` as success. (6) `fchmod 0o444`, `fsync(fd)`, then `fsync` the blobs directory. Keep `ingest/` and `blobs/` under one store root. | A digest-named path must not exist until its content is complete and verified. `Data.write(to: final)` truncates in place and leaves torn blobs, and `rename` over an existing blob replaces an inode other installs hold. `link()` returns `EXDEV` across mounts. | Block C2 (empty output after a bad-digest put is the pass), and a good put leaves a 0444 blob. Naive leaves `blobs/sha256:000...001` exit 1, verified leaves nothing exit 0, on 6.4.0 and 6.3.3 (measured 2026-10-10). | MUST |
| SW-IO-20 | Archive extraction uses both layers of the traversal guard. (1) Lexical: reject empty names, absolute names and any `..` component. (2) Filesystem: open the root once, then per component `openat` with `O_RDONLY`, `O_DIRECTORY`, `O_NOFOLLOW` and `O_CLOEXEC`, and the leaf with `O_WRONLY`, `O_CREAT`, `O_EXCL`, `O_NOFOLLOW` and `O_CLOEXEC` after `unlinkat`. Create symlink entries with `symlinkat` and never traverse them. Report refused entries with a non-zero exit instead of skipping them. No path-based `FileManager` call on names from outside the process. Absolute names are rejected (default, the adopter may strip the root instead if it documents the choice). | A lexical-only guard, including `FilePath.lexicallyResolving`, which documents that escaping symlinks nested inside `self` can still be targeted, passes a `link -> ..` entry followed by `link/pwned` and writes outside the root. `O_NOFOLLOW` alone guards only the last component. | Blocks C3 and C4. Hostile tars: `../evil`, and `link -> ..` followed by `link/pwned`. Naive `dotdot` 1, naive `symlink` 1, lexical `symlink` 1, guarded all 0 (measured 2026-10-10, 6.4.0 and 6.3.3). `openat2(RESOLVE_BENEATH)` (Linux 5.6 and later) is the kernel-side alternative, not run. | MUST |
| SW-IO-21 | Set permissions with `fchmod` or an explicit `open` mode, never from the umask. Secrets and tokens are `0o600` through `open(..., O_EXCL, 0o600)` plus `fchmod`, blobs `0o444`, private directories `mkdirat(..., 0o700)`. Never `FileManager.createFile(atPath:contents:)` without `attributes:` for sensitive data. | Creation modes are `0666 & ~umask` and `0777 & ~umask` (600 and 700 under umask 077, 644 and 755 under 022), the same for `open`, `Data.write`, `.atomic` and `createFile`. Only an explicit mode or `fchmod` is umask-independent. | Behavioural: the helper's `mode` argument under `umask 077` and `umask 022` must give the same mode, and `.atomic` over an existing 0600 file gives 644 (exit 1) where the helper gives 600 (exit 0), on 6.4.0 and 6.3.3 (measured 2026-10-10). Reading heuristic: `grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'createFile(atPath' -e 'createDirectory(at' -e 'createDirectory(atPath' Sources`, read for sensitive data. Darwin and Windows modes: unverified: read only. | MUST |
| SW-IO-22 | Cross-process locks are `flock` with `LOCK_EX` and `LOCK_NB` on a lock file held for the whole critical section, never a create-exclusive PID file. State "local filesystem only". The libc module supplies `flock`, since swift-system has no wrapper. CAS blob writes need no lock. | After `SIGKILL` of the holder a PID file refuses the next run (rc 75) until a human deletes it, and the kernel releases a `flock` at process death. | `grep -RnF --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e '.withoutOverwriting' Sources` (a hit on a lock path is a finding). Behavioural: `SIGKILL` the holder, then the next invocation must acquire it (PID file rc 75, `flock` rc 0, measured 2026-10-10 on 6.4.0 and 6.3.3). Windows lock semantics: unverified: read only. | SHOULD |

Durable replace recipe (`SW-IO-18`): `FilePath`-typed, no Foundation, built with `-warnings-as-errors` in Swift 6 mode on 6.4.0 and 6.3.3 (the `canImport(Musl)` arm is untested, the libc chain is `SW-LANG-02`'s). swift-system has no public `openat`, `mkdirat`, `renameat`, `fsync` or `flock`, so the libc module sits beside `SystemPackage`. A failed `fsync(dirfd)` after the rename still throws: the data is visible but not durable.

```swift
import SystemPackage

#if canImport(Glibc)
    import Glibc
#elseif canImport(Musl)
    import Musl
#elseif canImport(Darwin)
    import Darwin
#endif

struct PosixFailure: Error, Equatable {
    let op: String
    let code: Int32
}

func durableWrite(_ bytes: [UInt8], to target: FilePath, mode: mode_t = 0o644) throws {
    func fail(_ op: String) -> PosixFailure { PosixFailure(op: op, code: errno) }
    var dir = target.removingLastComponent()
    if dir.isEmpty { dir = "." }
    let tmp = dir.appending(".tmp-\(String(UInt64.random(in: .min ... .max), radix: 16))")
    let fd = tmp.withPlatformString { open($0, O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW | O_CLOEXEC, mode) }
    if fd < 0 { throw fail("open") }
    var published = false
    defer { if !published { _ = tmp.withPlatformString { unlink($0) } } }
    do {
        var off = 0
        while off < bytes.count {
            let n = bytes[off...].withUnsafeBytes { write(fd, $0.baseAddress, $0.count) }
            if n < 0 {
                if errno == EINTR { continue }
                throw fail("write")
            }
            off += n
        }
        if fchmod(fd, mode) != 0 { throw fail("fchmod") }  // before fsync, independent of the umask
        if fsync(fd) != 0 { throw fail("fsync") }  // failure is fatal, never retried
    } catch {
        close(fd)
        throw error
    }
    if close(fd) != 0 { throw fail("close") }
    if tmp.withPlatformString({ t in target.withPlatformString { rename(t, $0) } }) != 0 { throw fail("rename") }
    published = true
    let dfd = dir.withPlatformString { open($0, O_RDONLY | O_DIRECTORY | O_CLOEXEC) }
    if dfd < 0 { throw fail("open dir") }
    defer { close(dfd) }
    if fsync(dfd) != 0 { throw fail("fsync dir") }  // makes the rename survive power loss
}
```

## Process Runs

```sh
# C5 (SW-IO-23): cancel the run, then look for the marker child. Exit 1 = pass, exit 0 = a grandchild survived.
pgrep -f 'sleep 3004'
# C6 (SW-IO-25): the wrapper against a child that writes 256 MiB. Exit 124 = the hang.
timeout 60 ./drain-test
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-IO-23 | A child that may spawn descendants (shells, build tools, package managers, servers) gets `createSession = true` and a `teardownSequence` whose steps use `toProcessGroup: true`. `toProcessGroup: true` is never used without `createSession` or a non-inherited `processGroupID`. Grace before the implicit kill is 5 s (default). | The default is an immediate SIGKILL of the direct child only, so a grandchild survives (`sh -c 'sleep 3004 & wait'`: `pgrep` exit 0). An inherited group "includes the calling process", which Teardown.swift calls almost never wanted. | Block C5 after cancelling `sh -c 'sleep 3004 & wait'` once with default options (exit 0 = the grandchild survived) and once with `createSession` plus a `toProcessGroup` teardown (exit 1). A direct child with no descendants also exits 1 under default options, so use the shell form (measured 2026-10-10 on 6.4.0). Static: `grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'teardownSequence' -e 'createSession' Sources` must show both in the function that starts a shell, build tool or server (reading heuristic). Windows has no `createSession` and ignores `toProcessGroup`: unverified: read only. | MUST |
| SW-IO-24 | Environment overrides reach the child: run the `Configuration` you mutated, and prove it with a sentinel-variable test. `Environment.inherit.updating(["K": nil])` deletes a key and `.custom` replaces everything. | `var c = self.config(); c.environment = e; run(self.config(), ...)` compiles, warns about nothing and drops the override. | Behavioural: `printenv SENTINEL` through the wrapper with `environment: ["SENTINEL": "x"]` must print `x`, and `HOME` removed must be absent in the child. Reading heuristic: the variable passed to `run` is the one assigned `.environment` (a single-line grep is not admissible, the bug is multi-line). Watched red: child saw empty, the fixed copy `reached-child` (measured 2026-10-10). | MUST |
| SW-IO-25 | Legacy `Foundation.Process`: read every `Pipe` concurrently while the child runs (a task or thread per pipe, or `readabilityHandler`), or redirect to `FileHandle.nullDevice` or a temp file. Never `waitUntilExit()` before the pipes are drained, never drain two pipes one after the other, and build `environment` by merging `ProcessInfo.processInfo.environment`. | A full pipe (65,536 bytes) blocks the child's `write` and `waitUntilExit()` only spins the run loop: 256 MiB hung (exit 124), 65,537 bytes hung, 65,536 completed, and two pipes drained in sequence hang at 1 MiB on stderr. `["ONLY": "1"]` gave a child with only `ONLY=1`. uutils `head`, `yes` and `cat` enlarge the pipe to 1 MiB, so measure with a writer that does not. | `grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'waitUntilExit()' -e 'readDataToEndOfFile()' Sources` (read the order per file) and `grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e '\.environment = \[' Sources` (a literal dictionary not merged is a finding). Block C6 must exit 0. The end-to-end contract and harness are `SW-TEST-15`. Watched red (measured 2026-10-10). The macOS pipe size is unmeasured. | MUST |
| SW-IO-26 | The SDK has one spawn module, and only it imports `Subprocess`. Its API takes primitives (argv, `[String: String?]` overrides) and returns values (`Completed`), and its failures are the `package` enum `ProcessFailure`, which the SDK's public error struct wraps (`SW-API-17`). No Subprocess type leaks. It dispatches `contains("/") ? .path : .name`, casts `error as? SubprocessError` and switches on `.code`, applies `SW-API-16`'s exit mapping, `SW-IO-03` and `SW-IO-23`, races the timeout in a task group, and surfaces a cancelled caller as `CancellationError`. A timer that fired before the child finished wins as `.timedOut` (the specialisation of `SW-CONC-24`). Capture limits are `SW-API-20`'s and `SW-IO-03`'s. | `Execution` and `ExecutionResult` are `~Copyable` or closure-scoped, and one place must own limits, grace, environment and exit mapping. `run` is plain `throws`, so "only `SubprocessError` escapes" is documentary and an unknown code falls into `.ioFailed`. `.name("./tool")` and `.name("/bin/sh")` fail with `.spawnFailed`. A cancelled `run()` returns normally with `.signaled(9)`, so the wrapper must throw. | `grep -Rln --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'import Subprocess' Sources` lists exactly the spawn module's files (empty output = no spawn module, an extra file = violation, `SW-API-09` owns the target layout and the exact `--exclude-dir` form). `grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e '\.name("[^"]*/' Sources` (output = violation). Nine-case suite: `ok`, `exit3`, `self-sigterm` (143), `self-sigkill` (137), `env-override`, `env-remove-HOME`, `missing` (executableNotFound), `overflow` (outputTooLarge), `timeout-with-grandchild` (timedOut, then `pgrep` empty), plus a cancel-before-timer case. Watched red (measured 2026-10-10 on 6.4.0 and 6.3.3). | MUST (SDK) |
| SW-IO-27 | Callers treat a cancelled `run()` as an outcome. A `.sequence` body that returns early either stops the child (`execution.teardown(using:)` or `send(signal:)`) or accepts that `run()` blocks until the child exits. | Cancelling the awaiting task makes `run()` return normally with `.signaled(9)` (0.7 ms) instead of throwing. A body that returns while the child sleeps 2 s makes `run()` wait 2.0030 s, and a child that keeps writing ends `.signaled(13)` (SIGPIPE), a normal result. A throwing body runs the teardown. | Behavioural, watched red (measured 2026-10-10, swift-subprocess 1.0.1). Reading heuristic: a `Task.isCancelled` or `try Task.checkCancellation()` follows each `run` in cancellable code, and a `break` or `return` inside `for try await ... in execution.standardOutput` is paired with a teardown. `withTaskCancellationShield` (SE-0504, Swift 6.4, read 2026-10-10) may change cleanup inside bodies, not how `run()` reports. | SHOULD |

```swift
// the spawn module: the child leads its own session and group, and cancel terminates the group, then kills it
var platform = PlatformOptions()
platform.createSession = true
platform.teardownSequence = [.send(signal: .terminate, toProcessGroup: true, allowedDurationToNextStep: killGrace)]
```

## Decode Tests

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-IO-28 | A persisted or wire `Decodable` that gains a field gets a custom `init(from:)` with `decodeIfPresent(...) ?? default`, because a Swift default value does not make a synthesized decoder optional. Unknown keys are ignored by default. A strict contract opens a raw-key container, `decoder.container(keyedBy: AnyKey.self)`, and fails with `DecodingError.dataCorrupted` on a key outside the known set, never on `container.allKeys` of the `CodingKeys` container. 64-bit identifiers above 2^53 are `Int64`, `UInt64` or strings, never `Double`. | `struct V2 { var name: String; var mode: String = "fast" }` fails on `{"name":"a"}` with `keyNotFound: Key 'mode' not found`. The typed container never lists a key `CodingKeys` does not name, so the `allKeys` check enforces nothing and stays green. A 64-bit integer through `Double` becomes `9007199254740992.0`. | A test that decodes the previous version's fixture document into the current type (must succeed) and one with an extra key (fails when the contract is strict, succeeds otherwise). The strict recipe below: extra key rejected, exact document accepted, typed `allKeys` wrongly accepts the extra key, missing defaulted key fails the synthesized decoder, on 6.4.0 and 6.3.3 (measured 2026-10-10). Readable `DecodingError` text needs 6.3 (SE-0489). | SHOULD |
| SW-IO-29 | Protocol text (digests, HTTP lines and header names, tokens, media types, path components, version strings, JSON member names that decide identity) is parsed on `utf8` bytes after an ASCII check. `split(separator:)`, `contains`, `firstIndex(of:)`, `hasPrefix` and `count` on `String` are for human text only. | `"a:\u{301}b".split(separator: ":")` has one element, `"a\r\nb".split(separator: "\n")` has one (CRLF is one `Character`), and `import Foundation` flips `"a\r\nb".contains("\n")` from `false` to `true`. `Int("\u{663}")` is `nil` while `Character.isNumber` is `true`. `{"\u00e9":1,"e\u0301":2}` decoded into `[String: Int]` has `count == 1`, so validate member names as ASCII or NFC, or decode into pairs. | A test on `"a:\u{301}b"` expecting two fields and `"a\r\nb"` expecting two lines (`colon-fields=1 crlf-lines=1` red, `2 2` green, measured 2026-10-10 on 6.4.0 and 6.3.3). Triage: `grep -Rn --include='*.swift' -e 'split(separator: ":")' -e 'split(separator: "\n")' -e 'components(separatedBy: "\r\n")' Sources/Parsing` (rename the operand to the parser directory), a reading heuristic. The dictionary-key mitigation has no red and green pair. | SHOULD |

```swift
// wrong: the typed container never lists a key CodingKeys does not name
let seen = try decoder.container(keyedBy: CodingKeys.self).allKeys

// right: a raw-key container lists every key in the document
struct AnyKey: CodingKey {
    let stringValue: String
    var intValue: Int? { nil }
    init(stringValue: String) { self.stringValue = stringValue }
    init?(intValue: Int) { nil }
}
let seen = try decoder.container(keyedBy: AnyKey.self).allKeys
```

## Reading Heuristics

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-IO-30 | Hash the exact bytes received or written. Never re-encode a decoded JSON document to compute or check its digest, and never store a digest of bytes you did not write. | An OCI digest covers bytes, and a re-encode changes key order, whitespace and number text. containerization re-encodes an OCI index with a bare `JSONEncoder()` in its filtered-platform export branch (`containerization@3e7bc39e66b3:Sources/Containerization/Image/ImageStore/ImageStore+Export.swift:130`) while the neighbouring branch correctly returns the received bytes. | Reading heuristic, not watched red: in any function that hashes or compares a descriptor digest, trace the `data` argument back to `Data` read off the wire or file, never to `JSONEncoder().encode(...)`. Pair it with block P5 on the same files. Proposal test: pass a document through unchanged and require `hash(out) == hash(in)`. | MUST |
| SW-IO-31 | Gate Unix-only and Darwin-only API and make no durability claim on Windows. `.signaled`, `.send(signal:)`, `createSession` and `processGroupID` sit inside `#if !os(Windows)`, and `preSpawnProcessConfigurator` inside `#if canImport(Darwin)`. Windows branches never say "durable" or "crash-safe": a rename is atomic for readers only, `MAX_PATH` is 260 without `longPathAware`, reserved names (`CON`, `PRN`, `NUL`) exist, and `\foo` and `C:foo` are relative. | `TerminationStatus` has only `.exited(DWORD)` on Windows, and a Linux build cannot exercise any of this. | `grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e '\.signaled' -e 'createSession' -e 'processGroupID' Sources` lists spots to check for a surrounding `#if` (a reading heuristic). The complete check is a Windows build plus a local run: unverified: read only. The Linux compile of the `.signaled` arm is green (measured 2026-10-10). | SHOULD |
| SW-IO-32 | On Apple targets where durability matters, call `fcntl(fd, F_FULLFSYNC)` and fall back to `fsync` on `ENOTSUP`, and label the leg unverified. Whether a CLI's cache needs it is a threat-model decision. | Darwin `fsync(2)` does not flush the drive cache, and none of 40 surveyed exemplars calls `F_FULLFSYNC`. | `grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'F_FULLFSYNC' Sources` on a helper compiled for Darwin (a presence check, empty output means the call is missing). Not watched red: no macOS host, unverified: read only. | CONSIDER |

## What Agents Get Wrong Here

Ranked by how often the idiom appears in training data (corpus counts as a proxy, not a measurement of agent output).

1. **`try data.write(to: url, options: .atomic)` for a store, cache or lock, commented "atomic, crash-safe".** 129 hits in 21 of 40 exemplar repos, none fsyncs a directory. `FileManager.replaceItemAt` and NIOFS `replaceItem` are trusted the same way. `SW-IO-09`, `SW-IO-18`.
2. **A bare `JSONEncoder().encode(x)` whose bytes are hashed, diffed or written**, or JSON built by iterating a `Dictionary`. `SW-IO-12`, `SW-IO-30`.
3. **`Process()` with `Pipe()`, `waitUntilExit()` and `readDataToEndOfFile()` in that order**, `Process.environment = ["FOO": "1"]` losing `PATH`, and `c.environment = e; run(self.config())`. `SW-IO-05`, `SW-IO-24`, `SW-IO-25`.
4. **`["/bin/sh", "-c", "tool \(arg)"]` for convenience.** `SW-IO-08`.
5. **Stale swift-subprocess spellings**: `output: .string` with no limit, `.unhandledException`, `.sendSignal`, `runDetached`, the README's `.upToNextMinor(from: "0.4.0")` or `exact: "1.0.0"`, `limit: Int.max` to "fix" a compile error, `.name("./tool")`, `error.code` without the `SubprocessError` cast. Compile against 1.0.1. `SW-IO-03`, `SW-IO-06`, `SW-IO-26`.
6. **`Date()` minus `Date()`, `DispatchTime.now()` and `Task.sleep(nanoseconds:)` for durations.** `SW-IO-16`.
7. **`contentsOfDirectory` straight into a manifest or an assertion** (43 of 70 non-test listing files never sort), and **`.formatted()` in a line that tools parse.** `SW-IO-17`, `SW-IO-15`.
8. **`import Foundation` in every library file and bare `URLSession.shared`.** `SW-IO-02`, `SW-IO-04`.
9. **A digest checked with `hasPrefix("sha256:")`, `split(separator: ":")`, `isHexDigit`, `[a-fA-F0-9]` or `lowercased() ==`.** `SW-IO-13`.
10. **A non-zero exit assumed to throw.** `SW-IO-07`.
11. **Lexical-only tar sanitising** (drop `..` and a leading `/`), or `root.appendingPathComponent(entry.name)` then `Data.write`. `SW-IO-20`, `SW-IO-11`.
12. **The CAS blob written first and the digest compared after**, or `moveItem` over an existing digest path. `SW-IO-19`.
13. **`toProcessGroup: true` without `createSession`**, or no teardown group, so cancel leaves grandchildren or signals the caller. `SW-IO-23`.
14. **The default date strategy read by a Python or Go peer, and a new field with a Swift default on a `Codable` struct.** `SW-IO-14`, `SW-IO-28`.
15. **`import System`, `#if compiler(>=6.4)` around `FilePath`, `CommandLine.executablePath`.** Compile errors on Linux. `SW-IO-01`.
16. **A PID-file lock, and `createFile(atPath:contents:)` for a token assuming 0600.** `SW-IO-21`, `SW-IO-22`.
17. **Hallucinated helpers**: `JSONEncoder.OutputFormatting.canonical`, `encoder.sortKeys`, `.iso8601withFractionalSeconds`, `SHA256.hash(...).hexString`, `Locale.posix`, `FileDescriptor.openat`, `FileDescriptor.synchronize()`, `FilePath.isLexicallyContained(in:)`. The usual "fix" is `String(format:)`, which pins the library to full Foundation. `SW-IO-04`.
18. **"Fixing" a flaky dictionary-order test with `SWIFT_DETERMINISTIC_HASHING=1`**, which hides the bug and belongs in test configuration only, and **wrapping a raw descriptor in an `@unchecked Sendable` class**, which belongs to `SW-CONC`. `SW-IO-12`.
