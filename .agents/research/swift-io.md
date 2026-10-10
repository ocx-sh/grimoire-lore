---
title: "Files, processes and formats (SW-IO): swift-subprocess, durable writes, content-addressed stores, paths and deterministic formats"
topic: "SW-IO: Files, processes and formats (family SW-IO, depth file swift-quality/io.md)"
model: sonnet
id_family: SW-IO
consolidates:
  - swift-io/subprocess-contract.md
  - swift-io/files-and-paths.md
  - swift-io/formats-and-determinism.md
date: 2026-10-10
---

# Files, processes and formats (SW-IO)

Date 2026-10-10. Toolchains: Swift 6.4.0 and 6.3.3 on Linux x86_64 (Docker, `run.sh`). No macOS, Xcode or Windows host: every Darwin or Windows statement is `unverified: read only`.
Citation keys: `[sp]` = [subprocess-contract](swift-io/subprocess-contract.md), `[fp]` = [files-and-paths](swift-io/files-and-paths.md), `[fd]` = [formats-and-determinism](swift-io/formats-and-determinism.md), `[io]` = the re-runs recorded at the end of "The ruleset" (R1-R6). `repo@sha12:path:line` cites the exemplar corpus.
The three dives numbered their rules separately (`SW-IO-P01..16`, `SW-IO-01..18`, `SW-IO-FD-01..17`); this file renumbers them into one sequence `SW-IO-01..32`, and every entry names its `from:` provisional IDs.

## Verdict

1. **Spawning.** New code launches children with swift-subprocess `from: "1.0.1"` under `// swift-tools-version: 6.2` (`traits: []` by default). `Foundation.Process` survives only in legacy code and test helpers, and then drains pipes concurrently. 1.0.0 leaks one fd per early-break `.sequence` (50 runs: +50 fds), so `exact: "1.0.0"` (swiftly) is wrong. Binds CLI, SDK, server; Apple apps on iOS cannot spawn.
2. **The SDK has one spawn module.** Only it imports `Subprocess`; a closed failure enum; mandatory sized `limit:`; `.signaled(n)` maps to `128+n` (owner Q6); `createSession = true` plus a `toProcessGroup: true` teardown with a 5 s grace; timeout as a task-group race; a cancelled `run()` returns normally, so the wrapper throws `CancellationError` itself.
3. **Durable state goes through one helper.** `Data.write(.atomic)`, `String.write(atomically:)`, `FileManager.replaceItemAt` and NIOFS `replaceItem` are banned for state of record: none fsyncs the directory, `.atomic` loses the file mode on Linux 6.3.3 and 6.4.0, `replaceItemAt` destroys the new content on Linux 6.3.x, NIOFS `replaceItem` is `unlink` then `rename`. The helper is temp-in-same-directory, `fchmod`, `fsync`, `rename`, `fsync(dir)`, and it is `FilePath`-typed and Foundation-free ([R2](#consolidation-re-runs): strace red on `.atomic`, green on the helper). Binds CLI, SDK, server; a rebuildable cache may keep `.atomic` with a `// non-durable: rebuildable` comment.
4. **CAS publish** stages inside the store, hashes while writing, verifies before publish, publishes with `link()` and treats `EEXIST` as success. A digest-named path is never written by `Data.write(to:)`.
5. **Paths.** `FilePath` comes from `import SystemPackage`; stdlib `FilePath` is not in 6.4 (SE-0529 accepted 2026-06-05, unshipped) and `import System` fails on Linux. Archive extraction needs both layers: lexical rejection plus an `openat(O_NOFOLLOW|O_DIRECTORY)` walk. A lexical-only guard writes outside the root through a planted symlink.
6. **Formats.** Hashed or diffed JSON is `[.sortedKeys, .withoutEscapingSlashes]` or hand-sorted, and the digest covers the bytes written or received, never a re-encode. `.sortedKeys` is UTF-8 byte order, not RFC 8785. Digests parse over `utf8` bytes into a value type, lowercase hex only.
7. **Foundation.** Libraries import `FoundationEssentials` behind `canImport` with a `Foundation` fallback; CLIs and servers may import `Foundation`; every `URLSession` file carries the `FoundationNetworking` guard; never depend on the swift-foundation package.
8. **Determinism defaults.** Explicit `Date` strategies, no `.formatted()` or formatters in machine output, sorted directory listings, `ContinuousClock` for elapsed time.
9. **Enforcement is grep plus behavioural fixtures, not SwiftLint.** `custom_rules` is silently skipped by the static Linux SwiftLint 0.65.1 and exits 0 on a planted violation ([R1](#consolidation-re-runs)); the grep set is the gate and SwiftLint is advisory at most (narrows map conflict 1).
10. **Unverified legs.** Windows durability, Darwin `F_FULLFSYNC`, macOS pipe size and the musl static SDK are read-only until a host exists.

## The ruleset

Conventions. Every grep is run from the repository root with an explicit directory operand, one `-e` per alternative (BRE, no `\|`; tested with ugrep 7.8.4, `[fp]`/`[sp]`), and **its output is the violation: empty output (grep exit 1) is a pass**. "Watched red" cites the dive's verification run where the check printed a violation on a planted fixture and nothing on the compliant twin; `[io] R4`-`R5` are runs repeated or newly planted by this consolidation. Product-scope greps use `Sources` (pass every product source directory that exists); tests are exempt unless a rule says otherwise. "Floor" is the Swift version the rule assumes.

### Conflicts resolved between sub-artifacts

| # | Conflict | Resolution and reason |
|---|---|---|
| C1 | Three numbering schemes (`P`, `01`, `FD-`) with overlapping subject matter (`.string` vs `.bytes`, digest as path component, `Process` env). | Renumbered into `SW-IO-01..32`; overlapping rules merged where one check catches both (e.g. `.atomic`, `replaceItemAt`, NIOFS `replaceItem` are one grep, rule 09). Each entry keeps `from:` for traceability. |
| C2 | `[fp]` SW-IO-08 says "never `import System`; use `SystemPackage`"; `[sp]` shows swift-subprocess itself writes `#if canImport(System) public import System #else public import SystemPackage` (`swift-subprocess@55d30558b8b1:Sources/Subprocess/API.swift:12-15`; its manifest pulls swift-system `from: "1.5.0"` on non-Apple platforms only, `Package.swift:5-18`). | Both are right for different spellings. Unconditional `import System` is a Linux compile error (red `[fp]` d3), so it is banned; the **dual** import is the established idiom where a public signature crosses into an API typed with the SDK's `System.FilePath` (corpus `canImport(System)`: swift-build 26 files, SwiftPM 12, tuist 3, swift-nio 3 `[io] R6`). Everywhere else `import SystemPackage` unconditionally (container 77 files, nio 48, containerization 38, swiftly 34). The two `FilePath` types are distinct on Apple (swift-nio bridges them, `swift-nio@e12881f2a691:Sources/_NIOFileSystem/NIOFilePath.swift:44-101`): unverified: read only. Rule 01. |
| C3 | `[fp]` SW-IO-08 (`FilePath` for every composed path, no `String`) vs the verbatim helper in `[fp]` §3 and the CAS recipe, which take `String`, build `dir + "/.tmp-" + uuid` and `import Foundation`, vs `[fd]` FD-07 (library files must not `import Foundation`). | The helper contradicted both neighbours. Resolved by running it: a `FilePath`-typed, Foundation-free helper builds with `-Xswiftc -warnings-as-errors` in Swift 6 mode on 6.4 and 6.3, goes strace-green and the `.atomic` call stays red (`[io] R2`). The recipe in "Reference recipes" replaces the `[fp]` §3 text; a `PosixFailure(op:code:)` error carries the failing operation, and `UUID` is replaced by `UInt64.random` (no Foundation). |
| C4 | Map conflict 1 keeps SwiftLint as the optional `custom_rules` vehicle for bans; `[sp]` V15 and `[fp]` "Not red" both found `custom_rules` skipped. | Re-run independently: `swiftlint 0.65.1` prints `Skipping enabled rule 'custom_rules' because it requires SourceKit and SourceKit access is prohibited.` and exits 0 on a planted `Process()` (`[io] R1`); the grep exits 0/1 as intended. So no SW-IO ban is delivered through SwiftLint here; `custom_rules` is advisory on a SourceKit-enabled build only (unverified: no such build available). |
| C5 | `[sp]` P02 makes `traits: []` the default and sells it as removing the Foundation link; `[fd]` FD-07 puts the SDK and libraries on `FoundationEssentials`. | `traits: []` removes only Subprocess's own `libFoundationEssentials.so` link (`ldd` count 1 to 0, 3,514,368 to 3,448,928 bytes, `[sp]` V11). A product that decodes JSON with `JSONDecoder` links Essentials anyway, so the saving is zero there and `traits: []` remains a SHOULD-clause of rule 06 (it keeps `Data` off the SDK surface), not a size guarantee. Inference from the two measurements; not run as a combined build. |
| C6 | `[sp]` wrapper decision 3 ("always `.string(limit:)`") vs `[sp]` P15 ("never `.string` for bytes that round-trip"). | Split by data kind. Text the SDK parses as UTF-8 (`ocx --format json`) uses `.string(limit:)`; anything hashed, a tar, a signature or a digest stream uses `.bytes(limit:)` (`61 ff 62` becomes `61 fffd 62` under `.string`, RAN). Rule 03. |
| C7 | The map (M-G-15) and the brief's plant (e) assume `LANG=de_DE.UTF-8` changes machine output. | Refuted on Linux: `Locale.current` is hard-wired `en_001` (`swift-foundation@aadd9259be07:Sources/FoundationEssentials/Locale/Locale_Cache.swift:302-315`) and all five `LANG`/`LC_ALL` settings gave byte-identical output (`[fd]` E2, `cmp` exit 0). The rule survives on the true premise: `.formatted()` is locale-formatted and `en_001` is not a machine format (`1,234.5`, `14/11/2023`). Rule 15. |
| C8 | Domain scout: "`.atomic` restores the file mode". | Measured otherwise on 6.3.3 and 6.4.0 (0600 became 0644 under umask 022, `[fp]` e2); only swift-foundation `main@aadd9259be07` (`Data+Writing.swift:612-658`) restores it. Measured wins; rule 09/18 set the mode explicitly. |
| C9 | `Process()` counts: audit 50 uses in 16 repos vs `[sp]` grep 96 hits in 19 repos. | Different questions. The audit counts Foundation `Process`; the grep also matches repo-local `Process` types (SwiftPM's TSC). Cite 50/16 for Foundation use, 96/19 as the grep's upper bound; rule 05 requires reading each hit. |
| C10 | fsync prevalence: audit "fsync in 6 repos" vs `[fp]` "`fsync(` in 3 repos, `0/40` fsync a directory". | Regex scope (the audit's family includes `fdatasync`, `F_FULLFSYNC`, `.synchronize()`); both agree no exemplar syncs a directory after a rename. Cite "0/40". |
| C11 | `[fp]` SW-IO-04 says `replaceItemAt` is unusable "on Linux with tools older than 6.4". | The defect is in the toolchain's corelibs, not the manifest's tools version (`[fp]` r1: 6.3.3 destroys the new content, 6.4.0 merely non-durable). The library floor is tools 6.2, so consumers may build with 6.2/6.3: ban it outright (rule 09). |
| C12 | Directory fsync: `[fp]` notes ext4 `auto_da_alloc`/XFS order a replace-via-rename in practice. | Portable position wins (fsync(2) and LWN require the directory sync); rule 09/18 are MUST for state of record, and the explicit `// non-durable: rebuildable` annotation covers caches. |
| C13 | Foundation import counts: audit (production code only) vs `[fd]` (includes tests): `import Foundation` 3,824 files / 34 repos vs 6,617 / 38; `canImport(FoundationEssentials)` 415 uses / 13 repos vs 606 files / 15; `FoundationNetworking` guards 41 / 8 repos vs 54 files / 10. | Scope, not disagreement (map conflict 21 counting discipline). Cite both with their scope; production-code figures when arguing about shipped code. |

### A. Caught by the compiler or the SwiftPM resolver (Linux build in CI)

**SW-IO-01 — Take `FilePath` from `SystemPackage`; never use stdlib `FilePath`, unconditional `import System`, or `CommandLine.executablePath`. (MUST)**
Do not write `#if compiler(>=6.4)` around a stdlib `FilePath`: 6.4.0 does not ship it. Where a public signature crosses into an API typed with the SDK's `System.FilePath`, use `#if canImport(System) import System #else import SystemPackage #endif` (conflict C2); everywhere else `import SystemPackage`.
Why: SE-0529 is accepted but unshipped; `import System` does not exist on Linux, so macOS-written code fails the Linux leg.
Check: `swift build` on Linux (6.4 and 6.3): `error: cannot find 'FilePath' in scope`; `error: no such module 'System'`; `error: type 'CommandLine' has no member 'executablePath'`. The `swift-system` dependency resolves with `from: "1.5.0"` (the floor swift-subprocess declares; `[io] R2`).
Watched red: yes, `[fp]` d1/d2/d3 (exit 1 vs `import SystemPackage` exit 0); `[io] R2` builds with 1.5.0.
Floor: Swift 6.0 to 6.4 (revisit when a toolchain ships SE-0529). Binds all code kinds that build on Linux. From: SW-IO-08 (`[fp]`).

**SW-IO-02 — Every file that names `URLSession` carries `#if canImport(FoundationNetworking) import FoundationNetworking #endif`. (MUST)**
Why: unguarded, Linux fails with `error: type 'URLSession' (aka 'AnyObject') has no member 'shared'`, a missing-member message, not a missing-module one. (Client choice, `URLSession` vs AsyncHTTPClient, is SW-NET.)
Check: Linux `swift build`; `grep -rl --include='*.swift' -e 'URLSession' Sources | xargs -r grep -L -e 'canImport(FoundationNetworking)'`.
Watched red: yes, `[fd]` D1 (build exit 1 vs 0) and GREP-net (prints `red/net.swift` vs empty), 6.4 and 6.3.
Floor: Swift 6.0 on Linux. Binds all. From: FD-09.

**SW-IO-03 — Every collected `output:` and `error:` has a `limit:` sized to the largest legitimate output, never `Int.max`; use `.bytes(limit:)` for bytes that must round-trip. (MUST)**
Why: the limit is the call's memory ceiling; overflow throws `SubprocessError` with `.outputLimitExceeded` and tears the child down; `.string(limit:)` turns invalid UTF-8 into U+FFFD (`61 ff 62` to `61 fffd 62`), corrupting digests and archives (conflict C6).
Check: compiler (a missing limit is `error: type '@Sendable (Int) -> StringOutput<Unicode.UTF8>' cannot conform to 'OutputProtocol'`) plus `grep -rn --include='*.swift' -e 'limit: Int.max' -e 'limit: .max' Sources`; reading heuristic: `grep -rn --include='*.swift' -e '\.string(limit:' Sources` and read whether the function hashes or parses bytes.
Watched red: yes for compile and grep, `[sp]` V9 (`nolimit` exit 1 vs `withlimit` 0) and V7d (C6 exit 0 vs 1); the `.string` heuristic is reading only (behaviour RAN, V8 `badutf8`).
Floor: swift-subprocess 1.0.x, Swift 6.2. Binds CLI, SDK, server. From: P03, P15, P04 (match `error.code == .outputLimitExceeded`, never message text).

**SW-IO-04 — Libraries import `FoundationEssentials` under `canImport` with a `Foundation` fallback; executables may `import Foundation`; hex-encode with a table lookup; never depend on the swift-foundation package. (SHOULD)**
Why: Essentials-only code links `libFoundationEssentials.so` (10.7 MB) and avoids 40.5 MB of ICU; `String(format:)`, `trimmingCharacters`, `replacingOccurrences`, `range(of:)`, `NumberFormatter`, `DateFormatter`, `Process`, `FileHandle`, `NSLock` and `exit()` are absent from Essentials, so `String(format: "%02x")` silently pins a library to full Foundation. The swift-foundation package is "not suitable for use in a package or app that you intend to ship" (Distributions.md).
Check: `grep -rl --include='*.swift' -e '^import Foundation$' Sources | xargs -r grep -L -e 'canImport(FoundationEssentials)'` (library `Sources/` only; the grep cannot tell a library from an executable, so run it on library directories); `grep -rn --include='Package.swift' -e 'swiftlang/swift-foundation' -e 'apple/swift-foundation' -e 'swift-corelibs-foundation' .`; `grep -rn --include='*.swift' -e 'String(format:' -e '.hexString' Sources`; build proof is the Essentials-only compile.
Watched red: yes, `[fd]` GREP-import, GREP-pkg, K1 symbol matrix (6.4 = 6.3); `[io] R3` re-observed `cannot find 'exit' in scope` under an Essentials-only import (add `Glibc`/`Musl`/`Darwin`); the `String(format:` grep pair is `[io] R4`.
Floor: Swift 6.0 (Linux `Foundation` is swift-foundation since 6.0). Binds libraries; map conflict 12 confirmed. From: FD-07, FD-08, FD-16.

### B. Caught by a grep

**SW-IO-05 — New code spawns processes with swift-subprocess; `Foundation.Process` appears only in legacy code carrying `// legacy: <why>` and in test helpers that redirect output to files. (MUST)**
Why: `Process` has no cancellation, no output limit, a pipe-deadlock trap and a replace-not-merge environment; SF-0007 names Subprocess "will eventually replace `Process`".
Check: `grep -rn --include='*.swift' -e '[^A-Za-z0-9_]Process()' Sources Plugins` (omit `Plugins` if absent); every hit needs `// legacy:` and must satisfy rule 25. Repo-local `Process` types also match; read each hit (conflict C9).
Watched red: yes, `[sp]` V7 (exit 0 with 2 hits vs exit 1) and `[io] R1` (exit 0 with 1 hit vs exit 1).
Floor: Swift 6.2 for the replacement. Binds CLI, SDK, server; Apple apps cannot spawn on iOS. From: P01.

**SW-IO-06 — Depend on `.package(url: "https://github.com/swiftlang/swift-subprocess", from: "1.0.1", traits: [])` under `// swift-tools-version: 6.2`; never `exact:`, never a 0.x range. (MUST)**
Keep `traits: []` unless a call site needs `.data(limit:)` or `Data` input; then drop it and say why in a comment (conflict C5).
Why: 1.0.0 leaks one fd per early-break `.sequence` (+50 fds in 50 runs); 0.x has a different API and implicit 128 KB caps; 1.0.x needs a 6.2 toolchain. `exact:` in a library blocks every consumer's resolution. The README's Getting Started block still says `.upToNextMinor(from: "0.4.0")`: do not copy it.
Check: `grep -rn --include='Package.swift' --include='Package@swift-*.swift' -e 'swift-subprocess.*exact' -e 'swift-subprocess.*upToNextMinor' -e 'swift-subprocess.*from: "0\.' -e 'swift-subprocess.*from: "1\.0\.0"' .` (line-based: a `.package(` wrapped over several lines escapes it); resolver proof: Swift 6.1 `swift package resolve` exits 1 with `contains incompatible tools version (6.2.0)`.
Watched red: yes, `[sp]` V7b (1 hit exit 0 vs exit 1), V10 (resolver exit 1 vs 0 on the 0.4 line), V1 (leak exit 1 on 1.0.0, 0 on 1.0.1) and re-run `[io] R5` (1.0.0 `break`: `delta=50` exit 1; 1.0.1: `delta=0` exit 0). All six pins in the corpus violate it.
Floor: Swift 6.2 toolchain. Binds CLI, SDK, server. From: P02.

**SW-IO-07 — Check `terminationStatus` at every `run` call site: a non-zero exit is a result, not a throw. (MUST)**
Why: `run` returns `.exited(7)` normally; an ignored status turns a failed tool into silent success (the Python `check=True` habit does not carry over).
Check: `grep -rl --include='*.swift' -e 'import Subprocess' Sources | xargs -r grep -L -e 'terminationStatus' -e 'isSuccess'` lists files that never look at a status; per-call coverage is a reading heuristic (a file checking one call and ignoring another passes).
Watched red: yes at file level, `[sp]` V7d (prints `lint/bad/Bad.swift`, exit 123 vs empty, exit 0); behaviour `[sp]` V8 `stderr-default` (`exited(7) isSuccess: false`, no throw).
Floor: swift-subprocess 1.0.x. Binds CLI, SDK, server. From: P05.

**SW-IO-08 — Command lines are argument arrays: no `sh -c`/`bash -c`/`cmd /c` with an interpolated or non-literal script; when a shell is unavoidable the script is a literal and values travel as positional parameters (`["-c", "cmd \"$1\"", "sh", value]`). (MUST)**
Why: CWE-78; the planted `echo \(userInput)` executed `touch` (canary created); the positional form did not.
Check: narrow `grep -rn --include='*.swift' -e 'sh"[^]]*"-c", *"[^"]*\\(' -e 'sh"[^]]*"-c", *[a-zA-Z_]' Sources`; wide triage `grep -rn --include='*.swift' -e '"-c", *"[^"]*\\(' -e '"-c", *[a-zA-Z_]' Sources` (false positives: `git -c`, `swift build -c`, `clang -c`). The narrow grep misses a shell name on a previous line (apple/container `K8sHelper+Bootstrap.swift:43,63`); only the wide one finds it.
Watched red: yes, `[sp]` V7c (narrow 2 hits, wide 3 hits, exit 0 vs 1) and V6 canary (`injectbad` exit 1 vs `injectgood` exit 0, positional variant included).
Floor: any. Binds CLI, SDK, server, test code (lower severity in tests). From: P11.

**SW-IO-09 — Route every write of durable state through one helper (rule 18); `Data.write(to:options:.atomic)`, `String.write(toFile:atomically:)`, `FileManager.replaceItemAt`, NIOFS `replaceItem(at:withItemAt:)` and plain `Data.write(to:)` into a digest-named or lock path are findings. (MUST)**
A rebuildable cache or scratch file may keep `.atomic` with a `// non-durable: rebuildable` comment (default Q-IO-1).
Why: `.atomic` is atomic for readers only: strace shows `fsync(file)` and `rename`, no directory fsync, and it does not preserve a 0600 mode on 6.3.3 or 6.4.0 (0644 after replace); `replaceItemAt` is `renameat2(RENAME_EXCHANGE)` + `unlink` + `chmod` with no directory sync on 6.4.0 and **destroys the new content on 6.3.3** (reversed `renameat` arguments, `release/6.3 FileManager+POSIX.swift:527,534`); NIOFS `replaceItem` documents `rename(2)` but is `unlink(target)` then `rename`, so a crash between them loses the target.
Check: `grep -rnF --include='*.swift' -e '.atomic' -e 'atomically:' -e 'replaceItemAt(' -e 'replaceItem(at' Sources` (on a diff: `git diff -U0 -G'\.atomic' -- '*.swift'`).
Watched red: yes, `[fp]` s1 (5 hits exit 0 vs empty exit 1); behaviour `[fp]` a1-a3, e2, f1, r1 (6.3.3 `target.staged: old`, target gone, exit 1).
Floor: Swift 6.2 library floor (so 6.2/6.3 consumers hit the destructive `replaceItemAt`). Binds CLI, SDK, server, library that persists. From: SW-IO-01, 03, 04, 05 (`[fp]`).

**SW-IO-10 — Stage in the destination's own directory (or a staging directory in the same store root); never `NSTemporaryDirectory()` or `FileManager.default.temporaryDirectory` for anything later renamed or linked into place. (MUST)**
Why: `/tmp` is a different filesystem in containers and CI; `rename` returns `EXDEV` (errno 18) and `FileManager.moveItem` silently falls back to copy+delete, which is neither atomic nor durable.
Check: `grep -rnE --include='*.swift' -e 'NSTemporaryDirectory\(\)' -e '\.temporaryDirectory\b' Sources` (a hit that only feeds a throwaway test fixture is not a finding).
Watched red: yes, `[fp]` s2 (2 hits exit 0 vs exit 1) and x1 (`rename(...) rc=-1 errno=18`, fallback succeeded; same-directory `rc=0`).
Floor: any. Binds CLI, SDK, server. From: SW-IO-12.

**SW-IO-11 — Compose paths with `FilePath.appending(_: Component)`; never `+ "/" +`, `push`/`pushing` or `appendingPathComponent` with unvalidated input; test containment with `FilePath.starts(with:)`, never `String.hasPrefix`; read names that may be non-UTF-8 as `FilePath`. `URL` only at the edge of a Foundation or NIO API; `String` never for a composed path. (SHOULD)**
Why: `URL.appendingPathComponent("../evil")` gives `/srv/store/../evil`; `FilePath.pushing("/etc/passwd")` replaces the base; `"/srv/store-evil/x".hasPrefix("/srv/store")` is `true` while `FilePath.starts(with:)` is `false`; a file name with byte `0xFF` comes back from `contentsOfDirectory` as a U+FFFD name that `fileExists` rejects.
Check: `grep -rnF --include='*.swift' -e '+ "/" +' Sources`; `grep -rn --include='*.swift' -e 'pushing(' -e '\.push(' -e 'appendingPathComponent(' Sources` (read each argument's origin: a literal, an enum case or a validated component passes); `hasPrefix` on a path is a reading heuristic. Compile trap: `p.components.filter { }` returns `ComponentView`, wrap in `Array(...)`.
Watched red: yes for the `+ "/" +` grep (`[fp]` s3) and the `appendingPathComponent(` hit (s4); `push`/`pushing` pair planted in `[io] R4` (exit 0 vs 1); the `hasPrefix` and non-UTF-8 forms are reading heuristics backed by the measurement (`[fp]` g1).
Floor: swift-system 1.5+ on Swift 6.2. Binds all; the corpus is stricter than itself (32/40 repos use `URL(fileURLWithPath:`). From: SW-IO-09, 18.

**SW-IO-12 — Bytes that are hashed, signed, diffed, committed or compared across runs come from `JSONEncoder` with `outputFormatting = [.sortedKeys, .withoutEscapingSlashes]` (and explicit date strategies) or from an explicit sort; never from iterating a `Dictionary` or `Set` into output. (MUST)**
`.sortedKeys` is UTF-8 byte order and not RFC 8785: non-BMP keys sort differently, `-0.0` prints `-0`, `123456789012345680000.0` prints `1.2345678901234568e+20`. Where a peer requires JCS bytes write the serializer; otherwise call it "stable on one implementation" and hash stored bytes (rule 30). `SWIFT_DETERMINISTIC_HASHING=1` is a test-harness aid only: it repeats the order, does not sort, and is not stable across stdlib releases.
Why: hash seeds are per process, so two runs emit different bytes and different digests (`cmp` exit 1 on 6.4 and 6.3); on Apple frameworks `.sortedKeys` order has changed between releases (unverified: read only).
Check: `grep -rl --include='*.swift' -e 'JSONEncoder()' Sources | xargs -r grep -L -e 'sortedKeys'` (files that build an encoder without it); runtime twin: run the tool twice in separate processes and `cmp -s out1 out2` (exit 0 = pass). Output meant only for humans is exempt.
Watched red: yes, `[fd]` A1 (exit 1 vs 0), GREP-json; re-run `[io] R5` (`JsonRed` cmp exit 1, `JsonGreen` cmp exit 0).
Floor: Swift 6.0 (Linux). Binds CLI, SDK, server, library. From: FD-01, FD-03, FD-15.

**SW-IO-13 — Parse a digest with a byte-level function into a value type (algorithm allow-list, `utf8.starts(with:)`, exact length, lowercase ASCII hex only); compare parsed values, never raw strings and never `.lowercased() ==`; the parsed `hex` is the only string that may become a path component. (MUST)**
A digest `Regex` is lowercase-only and anchored (`/sha256:[a-f0-9]{64}/` with `wholeMatch`); `[a-fA-F0-9]` is wrong (OCI: "`[A-F]` MUST NOT be used"). Use the `ContentDigest` recipe below.
Why: `Character` ranges accept `b`+U+0308 and `d`+ZWJ as hex digits; `Character.isHexDigit` accepts fullwidth `ａ` and uppercase; `String ==` is canonical equivalence, so two spellings of one digest become two blob names or one wrongly.
Check: `grep -rn --include='*.swift' -e 'hasPrefix("sha' -e 'split(separator: ":")' -e '"a"..."f"' -e 'isHexDigit' -e 'lowercased() ==' -e 'A-F' Sources` (any hit inside digest or reference parsing is a violation) plus a unit test feeding the 17 vectors of `fx/Sources/DigestCheck` (combining mark, ZWJ, fullwidth, uppercase, 63/65 length, trailing `\n`/NUL, traversal, `sha384`, empty, no colon): all must be rejected.
Watched red: yes, `[fd]` B1a/B1b/B1c (`naive-*` exit 1, `strict` exit 0), GREP-digest; re-run `[io] R5` (`wrong=3`, `wrong=2`, `wrong=1`, `strict` `wrong=0`); the `A-F` grep pair is `[io] R4`.
Floor: Swift 6.0 (typed throws). Binds OCI-style CLIs, SDK, server. From: FD-04, FD-05; SW-IO-07 (`[fp]`).

**SW-IO-14 — Every `JSONEncoder` and `JSONDecoder` that touches a `Date` sets `dateEncodingStrategy`/`dateDecodingStrategy` explicitly: `.iso8601` for second precision, `.millisecondsSince1970` or a custom fractional ISO style below that; never the default. (MUST)**
Why: the default writes `timeIntervalSinceReferenceDate`: Unix epoch 0 becomes `-978307200`, unreadable by Python or Go peers; `.iso8601` drops the fraction (0.123456 s lost), so choose per field.
Check: `grep -rl --include='*.swift' -e 'JSONEncoder()' Sources | xargs -r grep -l -e 'Date' | xargs -r grep -L -e 'dateEncodingStrategy'`; runtime: encode `Date(timeIntervalSince1970: 0)` and require `1970-01-01...` or `0`.
Watched red: yes, `[fd]` C1 (`default` exit 1, `iso8601` exit 0) and GREP-date; re-run `[io] R5`.
Floor: Swift 6.0. Binds all. From: FD-10.

**SW-IO-15 — Machine-facing numbers and dates never pass through `.formatted()`, `NumberFormatter`, `DateFormatter`, `Locale.current` or `lowercased(with:)`: use interpolation or `String(describing:)` for numbers and `Date.ISO8601FormatStyle()` for dates. (MUST)**
Why: on Linux `.formatted()` yields `1,234.5` and `14/11/2023` (locale `en_001`); on Darwin it follows user preferences (unverified: read only). Setting `LANG` does nothing on Linux, so it is not a test lever (conflict C7).
Check: `grep -rn --include='*.swift' -e '\.formatted()' -e 'formatted(date:' -e 'NumberFormatter()' -e 'DateFormatter()' Sources`, plus a test comparing machine strings to literals.
Watched red: yes, `[fd]` E1 (`red` exit 1 `got=1,234.5 want=1234.5`, `green` exit 0) and GREP-locale; E2 is a measured non-effect; re-run `[io] R5`.
Floor: Swift 6.0. Binds CLI, SDK, server. From: FD-12.

**SW-IO-16 — Elapsed time, timeouts, backoff and benchmarks use `ContinuousClock`; `SuspendingClock` only for awake time; `Date` only for wall-clock timestamps; no `Date()` subtraction, `timeIntervalSince(`, `timeIntervalSinceNow` or `DispatchTime.now` for durations; an `Instant` is never serialized or compared across processes. (SHOULD)**
Why: wall time steps (NTP, VM resume); `ContinuousClock` is `CLOCK_BOOTTIME` on Linux and is `Task.sleep(for:)`'s default (`Clock.cpp:48-120`, `TaskSleepDuration.swift:215-224`). A wall-clock subtraction on external data is legitimate with a comment.
Check: `grep -rn --include='*.swift' -e 'timeIntervalSince(' -e 'timeIntervalSinceNow' -e 'DispatchTime.now' Sources`; also `grep -rn --include='*.swift' -e 'Task.sleep(nanoseconds' Sources` (deprecated numeric form, pair planted in `[io] R4`).
Watched red: yes for the grep (`[fd]` GREP-clock, `[io] R4`); the continuous-vs-suspending difference is unverified: the kernel never suspended (`CLOCK_BOOTTIME - CLOCK_MONOTONIC = 0`).
Floor: Swift 5.7 (SE-0329). Binds all. From: FD-14.

**SW-IO-17 — Sort `contentsOfDirectory`, `enumerator` and `subpathsOfDirectory` results by UTF-8 bytes (`sorted { $0.utf8.lexicographicallyPrecedes($1.utf8) }`) before they reach output, a digest, a manifest or an assertion. (SHOULD)**
Why: `readdir` order is filesystem-specific (12 names listed `e,w,m,f,a,y,b,z,d,k,c,x` on ext4); plain `sorted()` is canonical-equivalence order, not bytes.
Check: `grep -rl --include='*.swift' -e 'contentsOfDirectory' Sources | xargs -r grep -L -e 'sorted'` (file-level).
Watched red: yes, `[fd]` G1 (exit 1 unsorted vs 0 sorted) and GREP-dir. Other filesystems order differently: unverified: read only.
Floor: any. Binds CLI, SDK, server, tests asserting listings. From: FD-13.

### C. Caught by a behavioural run (strace, fixture, test)

**SW-IO-18 — The durable-write helper is temp-in-the-target's-directory (`O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC`), a write loop that handles short writes and `EINTR`, `fchmod` to the explicit mode, `fsync(fd)` (failure fatal, never retried), checked `close`, `rename`, then `open(dir, O_RDONLY|O_DIRECTORY)` and `fsync(dirfd)`; the temp is unlinked on every failure. (MUST)**
Use the recipe below (`FilePath`-typed, Foundation-free). Run the orphan sweep of `rules/rust-quality/durable-state.md` STATE-7/8 at start-up: `defer` does not run after `SIGKILL` (reading heuristic).
Why: the directory fsync is what makes the rename survive power loss; `fchmod` before `fsync` sets the mode independent of umask.
Check: `strace -f -y -e trace=fsync,fdatasync,rename,renameat,renameat2 -o "$W/trace.txt" <binary>`, then `grep -L -F -e "$W>) = 0" "$W/trace.txt"`: a printed file name means no directory fsync; or `[fp]` `check-a.sh <bin> <cmd> <workdir>` (exit 1 prints the violation). The `swift:6.4` image has no `strace`; `[fp]` §11 unpacks a Fedora RPM.
Watched red: yes, `[fp]` a1/a2/a4 (`.atomic` exit 1, helper exit 0, 6.4.0 and 6.3.3) and `[io] R2` (the `FilePath` helper: `naive` exit 1 `VIOLATION: no fsync of directory`, `durable` exit 0 `PASS: directory fsync present`). Not run: crash injection (strace proves syscall order, not on-disk state).
Floor: Swift 6.2 (Linux). Binds CLI, SDK, server. From: SW-IO-02, 03, 13.

**SW-IO-19 — Publish a content-addressed blob in six steps: (1) stage on the same filesystem as `blobs/`; (2) hash while writing; (3) compare to the expected digest before any publish step; (4) on mismatch or error unlink the temp; (5) publish with `link(tmp, final)` and treat `EEXIST` as success; (6) `fchmod 0o444`, `fsync(fd)`, `fsync` the blobs directory. (MUST)**
Why: a digest-named path must not exist until its content is complete and verified; `Data.write(to: final)` truncates in place (`O_TRUNC`) and leaves torn blobs; `rename` over an existing blob replaces an inode other installs hold. Cross-language: STATE-28..31. `link()` returns `EXDEV` across mounts: keep `ingest/` and `blobs/` under one store root.
Check: bad-digest fixture: `find "$STORE" -type f` after a failed put prints nothing; a good put leaves a `0444` blob.
Watched red: yes, `[fp]` b1/b2 (naive leaves `blobs/sha256:000...001`, exit 1; verified leaves zero, exit 0; 6.4 and 6.3); re-run `[io] R5` (exit 1 vs 0).
Floor: Swift 6.2 (Linux). Binds CLI, SDK, server. From: SW-IO-06.

**SW-IO-20 — Archive extraction uses both layers of the traversal guard: (1) lexical: reject empty, absolute (or strip the root: one documented policy) and any `..` component; (2) filesystem: open the root once, then per component `openat(cur, c, O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC)`, leaf `O_WRONLY|O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC` after `unlinkat`; symlink entries are created with `symlinkat` and never traversed; refused entries are reported (non-zero exit), not skipped. No path-based `FileManager` call on names from outside the process. (MUST)**
Why: lexical-only (including `FilePath.lexicallyResolving`, which documents that "escaping symlinks nested inside of `self` can still be targeted") passes a `link -> ..` entry followed by `link/pwned` and writes outside the root; `O_NOFOLLOW` alone guards only the last component (open(2)).
Check: behavioural `[fp]` `check-c.sh <untar> naive|lexical|guarded dotdot|symlink|good` (no regular file outside the root); tripwire: `grep -rlE --include='*.swift' -e 'extract' -e 'untar' Sources | xargs -r grep -L -e 'O_NOFOLLOW' -e 'noFollow'` (printed file = violation).
Watched red: yes, `[fp]` c1-c4 (naive `dotdot` 1, naive `symlink` 1, lexical `symlink` 1, guarded all 0, 6.4 and 6.3) and s5 (xargs exit 123 vs 0); re-run `[io] R5` (same six exits). Reject-vs-strip for absolute names is policy: the fixture rejects, containerization strips (Q-IO-5).
Floor: Swift 6.2 (Linux); `openat2(RESOLVE_BENEATH)` (Linux 5.6+) is the kernel-side alternative, not run. Binds CLI, SDK, server handling untrusted archives. From: SW-IO-10, 11.

**SW-IO-21 — Permissions are set with `fchmod` or an explicit `open` mode, never inherited from the umask: secrets and tokens `0o600` through `open(..., O_EXCL, 0o600)` plus `fchmod`; blobs `0o444`; private directories `mkdirat(..., 0o700)`; never `FileManager.createFile(atPath:contents:)` without `attributes:` for sensitive data. (MUST)**
Why: creation modes are `0666 & ~umask` and `0777 & ~umask` (600/700 under umask 077, 644/755 under 022), identical for `open`, `Data.write`, `.atomic` and `createFile`; only an explicit mode or `fchmod` is umask-independent.
Check: behavioural: the helper's `mode` parameter under umask 077 and 022 must give the same mode (`[fp]` `check-e.sh`); reading heuristic: `grep -rn --include='*.swift' -e 'createFile(atPath' -e 'createDirectory(at' -e 'createDirectory(atPath' Sources` and read for sensitive data.
Watched red: yes for the mode table and `atomic-over-0600` (`[fp]` e1/e2: `mode=644` exit 1 vs `durable-over-0600` `mode=600` exit 0, 6.4 and 6.3); the grep is a reading heuristic.
Floor: any; Darwin/Windows modes unverified: read only. Binds CLI, SDK, server (MUST for secrets). From: SW-IO-14, 03.

**SW-IO-22 — Cross-process locks are `flock(fd, LOCK_EX | LOCK_NB)` on a lock file held for the whole critical section, not a create-exclusive PID file. (SHOULD)**
Document "local filesystem only" (flock is unreliable on some network filesystems). CAS blob writes need no lock (STATE-9); the lock is for read-modify-write of shared state files. swift-system has no `flock` wrapper: use the libc module.
Why: after `SIGKILL` of the holder a PID file refuses the next invocation (rc 75) until a human deletes it; `flock` is released by the kernel at process death.
Check: `grep -rnF --include='*.swift' -e '.withoutOverwriting' Sources` (lock-path hits are findings); behavioural `[fp]` `check-l.sh <fx> l-pidfile|l-flock`.
Watched red: yes, `[fp]` l1 (`l-pidfile` exit 75, `l-flock` exit 0, 6.4 and 6.3).
Floor: any (POSIX); Windows lock semantics unverified: read only. Binds CLI. From: SW-IO-15.

**SW-IO-23 — A child that may spawn descendants (shells, build tools, package managers, servers) gets `createSession = true` and a `teardownSequence` whose steps use `toProcessGroup: true`; `toProcessGroup: true` is never used without `createSession` or a non-inherited `processGroupID`. (MUST)**
SDK form: `createSession = true; teardownSequence = [.send(signal: .terminate, toProcessGroup: true, allowedDurationToNextStep: .seconds(5))]` (5 s matches `KILL_GRACE = 5.0`, `ocx-sdk-python@80136dde4162:src/ocx_sdk/_process.py:68`).
Why: the default is an immediate SIGKILL of the direct child only; a grandchild survives (`sh -c 'sleep 3004 & wait'`: `pgrep` exit 0); an inherited group "includes the calling process. This is almost never what you want" (`Teardown.swift:53-60`, deliberately not run).
Check: behavioural: cancel the task, then `pgrep -f '<unique marker>'` must exit 1; static: for each `run(`/`Configuration(` that starts a shell, build tool or server, `grep -rn --include='*.swift' -e 'teardownSequence' -e 'createSession' Sources` must show both in the same function.
Watched red: yes, `[sp]` V3 (`sub-group-bad` and `proc` pgrep exit 0; `sub-group-good`, `sub-default`, `sub-graceful` exit 1; 6.4 and 6.3) and re-run `[io] R5` (same five exits).
Floor: swift-subprocess 1.0.x; Windows has no `createSession` and ignores `toProcessGroup` (unverified: read only). Binds CLI, SDK, server. From: P06.

**SW-IO-24 — Environment overrides reach the child: run the `Configuration` you mutated, and prove it with a sentinel variable test. (MUST)**
Why: `var c = self.config(); c.environment = e; run(self.config(), ...)` compiles, warns about nothing and drops the override (swiftly `ModeledCommandLine.swift:64-71`, latent). `Environment.inherit.updating(["K": nil])` deletes a key; `.custom` replaces everything.
Check: behavioural test: `printenv SENTINEL` through the wrapper with `environment: ["SENTINEL": "x"]` must print `x`; reading heuristic: the variable passed to `run` is the one assigned `.environment`. The single-line grep `run(self.config()` is not admissible (the swiftly shape is multi-line, never planted).
Watched red: yes, `[sp]` V5 (`envovr` exit 1, child saw empty; fixed copy `reached-child`) and V14 (`env-override`, `env-remove-HOME`).
Floor: swift-subprocess 1.0.x. Binds CLI, SDK. From: P09.

**SW-IO-25 — Legacy `Foundation.Process`: read every `Pipe` concurrently while the child runs (a task or thread per pipe, or `readabilityHandler`), or redirect to `FileHandle.nullDevice`/a temp file; never `waitUntilExit()` before the pipes are drained; never drain two pipes one after the other; build `environment` by merging `ProcessInfo.processInfo.environment` (a partial dictionary replaces it). (MUST)**
Why: a full pipe (65,536 bytes) blocks the child's `write`, and `waitUntilExit()` only spins the run loop; 256 MiB hung (`timeout 60` exit 124), 65,537 bytes hung, 65,536 completed; two pipes drained in sequence hang at 1 MiB on stderr; `["ONLY": "1"]` gave a child with only `ONLY=1`. uutils `head`/`yes`/`cat` enlarge the pipe to 1 MiB, so measure with a writer that does not.
Check: `grep -rn --include='*.swift' -e 'waitUntilExit()' -e 'readDataToEndOfFile()' Sources` and read the order per file; `grep -rn --include='*.swift' -e '\.environment = \[' Sources` (a literal dictionary assigned to `Process.environment` unless merged); behavioural: wrapper against `emit 268435456` under `timeout 60` must exit 0, not 124.
Watched red: yes, `[sp]` V2/V2b/V2c (`bad` exit 124 vs `good` exit 0; `bad2` 124 vs `good2` 0) and V13; the `.environment = [` grep pair is `[io] R4` (exit 0 vs 1). Order reading is a heuristic.
Floor: any Swift on Linux; macOS pipe size unmeasured. Binds legacy CLI/server code. From: P12, P13.

**SW-IO-26 — The SDK has one spawn module. Only it imports `Subprocess`; its public API takes primitives (argv, `[String: String?]` overrides) and returns a closed vocabulary (`Completed`, `ProcessFailure`); no Subprocess type leaks. It dispatches `contains("/") ? .path : .name`, casts `error as? SubprocessError` and switches on `.code`, maps `.exited(c)` to `c` and `.signaled(s)` to `128 + s`, applies rules 03 and 23, implements a timeout as a task-group race, and throws `CancellationError` when the task was cancelled. (MUST, for the SDK)**
```swift
public struct Completed: Sendable, Equatable { exitCode: Int32; stdout: String; stderr: String }
public enum ProcessFailure: Error, Sendable, Equatable {
    case executableNotFound(String), launchFailed(String)
    case outputTooLarge(limit: Int), timedOut(after: Duration), ioFailed(String)
}
public struct ProcessRunner: Sendable {            // one spawn point, limits and grace configured once
    public func run(_ exe: String, _ args: [String],
                    environment: [String: String?] = [:], workingDirectory: String? = nil,
                    timeout: Duration? = nil) async throws(ProcessFailure) -> Completed
}
```
Why: `Execution`/`ExecutionResult` are `~Copyable` or closure-scoped; one place owns limits, grace, environment and exit mapping (mirrors `_process.py`, "every ocx spawn in this SDK goes through this module"); `run` is plain `throws`, so the "only `SubprocessError` escapes" guarantee is documentary and an unknown code falls into `.ioFailed`; `.name("./tool")` and `.name("/bin/sh")` fail with `.spawnFailed`.
Check: `grep -rln --include='*.swift' -e 'import Subprocess' Sources` lists exactly the spawn module's file(s); `grep -rn --include='*.swift' -e '\.name("[^"]*/' Sources` (a path inside `.name` is a violation); behavioural: the nine-case suite (`ok`, `exit3`, `self-sigterm`=143, `self-sigkill`=137, `env-override`, `env-remove-HOME`, `missing`=`executableNotFound`, `overflow`=`outputTooLarge`, `timeout-with-grandchild`=`timedOut` in 1.0009 s, then `pgrep` empty). The `Task.isCancelled` throw after `run` is a decision the prototype does not yet implement and nothing ran (open item for wave 3 `api/sdk-shape`); defaults 4 MiB stdout and 256 KiB stderr are prototype numbers without a source (Q-IO-2).
Watched red: yes for the suite and the import count (`[sp]` V14 exit 0 on both toolchains, one importing file); the `.name("...` grep pair is `[io] R4` (exit 0 vs 1).
Floor: swift-subprocess 1.0.1, Swift 6.2; `#if !os(Windows)` around `.signaled` (rule 31). Binds the Swift ocx SDK; CLIs should copy the shape. From: P14, P10, P04.

**SW-IO-27 — Callers treat a cancelled `run()` as an outcome, and a `.sequence` body that returns early either stops the child (`execution.teardown(using:)` or `send(signal:)`) or accepts that `run()` blocks until the child exits. (SHOULD)**
Why: cancelling the awaiting task makes `run()` return normally with `.signaled(9)` (0.7 ms), not throw; a body that returns while the child sleeps 2 s makes `run()` wait 2.0030 s; a child that keeps writing is `.signaled(13)` (SIGPIPE), a normal result; a throwing body runs the teardown.
Check: behavioural `[sp]` `plant.sh 1.0.1 c` and `h`; reading heuristic: a `Task.isCancelled` or `try Task.checkCancellation()` follows each `run` in cancellable code, and a `break`/`return` inside `for try await ... in execution.standardOutput` is paired with a teardown.
Watched red: yes for the behaviour (`[sp]` V3, V12); the automated check of the follow-up is a reading heuristic.
Floor: swift-subprocess 1.0.x; `withTaskCancellationShield` (SE-0504, 6.4) may change cleanup inside bodies, not how `run()` reports. Binds CLI, SDK. From: P07, P08.

**SW-IO-28 — A persisted or wire `Decodable` that gains a field gets a custom `init(from:)` using `decodeIfPresent(...) ?? default` (a Swift default value does not make a synthesized decoder optional); unknown keys are ignored by default, so a strict contract compares `container.allKeys` to the known set and fails with `DecodingError.dataCorrupted`; 64-bit identifiers above 2^53 are `Int64`/`UInt64` or strings, never `Double`. (SHOULD)**
Why: `struct V2 { var name: String; var mode: String = "fast" }` fails on `{"name":"a"}` with `DecodingError.keyNotFound: Key 'mode' not found`; a 64-bit integer through `Double` becomes `9007199254740992.0`.
Check: a test decoding the previous version's fixture document into the current type (must succeed) and one with an extra key (succeed or fail as the contract states).
Watched red: yes, `[fd]` H1 (`red` exit 1 `keyNotFound`, `green` exit 0); re-run `[io] R5`.
Floor: Swift 6.0; readable `DecodingError` text since 6.3 (SE-0489). Binds all. From: FD-11.

**SW-IO-29 — Protocol text (digests, HTTP lines and header names, tokens, media types, path components, version strings, JSON member names that decide identity) is parsed on `utf8` bytes after an ASCII check; `String`/`Character` operations (`split(separator:)`, `contains`, `firstIndex(of:)`, `hasPrefix`, `count`) are for human text only. (SHOULD)**
Why: `"a:\u{301}b".split(separator: ":")` has one element; `"a\r\nb".split(separator: "\n")` has one (CRLF is one `Character`); `import Foundation` flips `"a\r\nb".contains("\n")` from `false` to `true`; `Int("\u{663}")` is `nil` while `Character.isNumber` is `true`; `{"\u00e9":1,"e\u0301":2}` decoded into `[String: Int]` has `count == 1` (and a dictionary literal with both traps): validate member names as ASCII (or NFC) or decode into pairs when names must stay distinct.
Check: a planted test on `"a:\u{301}b"` expecting two fields and `"a\r\nb"` expecting two lines; triage grep in the parser directory: `grep -rn --include='*.swift' -e 'split(separator: ":")' -e 'split(separator: "\n")' -e 'components(separatedBy: "\r\n")' Sources/Parsing` (replace the operand).
Watched red: yes for the behaviour, `[fd]` F1 (`red` exit 1 `colon-fields=1 crlf-lines=1`, `green` exit 0; re-run `[io] R5`); the grep half is a reading heuristic; the dictionary-key mitigation has no red/green pair.
Floor: Swift 6.0. Binds all parsers. From: FD-06, FD-17.

### D. Reading heuristics (no mechanical check exists)

**SW-IO-30 — Hash the exact bytes received or written; never re-encode a decoded JSON document to compute or check its digest, and never store a digest of bytes you did not write. (MUST)**
Why a reading heuristic: the defect is a data-flow fact (the argument of `SHA256.hash(data:)` must come from `Data` read off the wire or file, not from `JSONEncoder().encode(...)`) that no grep or compiler diagnostic sees. A MUST because the OCI digest covers bytes and a re-encode changes key order, whitespace and number text; measured exemplar violation `containerization@3e7bc39e66b3:Sources/Containerization/Image/ImageStore/ImageStore+Export.swift:130` (`try JSONEncoder().encode(idx)` rewrites an OCI index).
Check: in any function that hashes or compares a descriptor digest, trace the `data` argument back to its source; pair with the rule 12 grep on the same files; the proposal test: pass a document through the code with no change and require `hash(out) == hash(in)`.
Watched red: no (reading heuristic). The sort-order half is rule 12's measured red.
Floor: Swift 6.0. Binds OCI tooling, SDK. From: FD-02.

**SW-IO-31 — Gate Unix-only and Darwin-only API and make no durability claim on Windows. (SHOULD)**
`.signaled`, `.send(signal:)`, `createSession`, `processGroupID` sit inside `#if !os(Windows)`; `preSpawnProcessConfigurator` inside `#if canImport(Darwin)` (it also exists on Windows); Windows branches never say "durable" or "crash-safe" (atomic for readers only: `FILE_RENAME_FLAG_POSIX_SEMANTICS`/`MoveFileExW`, no parent-directory fsync analogue, `MAX_PATH` 260 without `longPathAware`, reserved names `CON`/`PRN`/`NUL`..., `\foo` and `C:foo` are relative, `FilePath("C:\\a")` on Linux is one relative component); NIOFS `fsync` is a `fatalError` stub on Windows.
Why: `TerminationStatus` has only `.exited(DWORD)` on Windows; a Linux build cannot exercise any of this.
Check: `grep -rn --include='*.swift' -e '\.signaled' -e 'createSession' -e 'processGroupID' Sources` lists spots to check for a surrounding `#if`; the complete check is a Windows `swift build` plus a local run (cross-compile with xwin, run via `cmd.exe` from a `C:` cwd).
Watched red: no. `unverified: read only` (owner Q7 default); the Linux compile of the `.signaled` arm is green (`[sp]` `neg/newstatus` exit 0).
Floor: Swift 6.2. Binds cross-platform CLI, SDK. From: P16, SW-IO-16 (`[fp]`).

**SW-IO-32 — On Apple targets where durability matters, call `fcntl(fd, F_FULLFSYNC)` and fall back to `fsync` on `ENOTSUP`, and label the leg unverified. (CONSIDER)**
Why: Darwin `fsync(2)` does not flush the drive cache ("Only Mac OS-X supports F_FULLFSYNC", SQLite); 0 of 40 exemplars call it. Whether a CLI's cache needs it is a threat-model decision (Q-IO-7).
Check: `grep -rn --include='*.swift' -e 'F_FULLFSYNC' Sources` on a helper compiled for Darwin.
Watched red: no (no macOS). Floor: Swift 6.2. Binds Apple-platform CLIs and apps that persist state. From: SW-IO-17 (`[fp]`).

### Reference recipes

**Durable write** (`[io] R2`, fixture `io-consolidation/helper`; Swift 6 mode, tools 6.2, `-warnings-as-errors`, 6.4 and 6.3; the `canImport(Musl)` branch is untested):

```swift
import SystemPackage
#if canImport(Glibc)
import Glibc
#elseif canImport(Musl)
import Musl
#elseif canImport(Darwin)
import Darwin
#endif

struct PosixFailure: Error, Equatable { let op: String; let code: Int32 }

/// Durable atomic replace (POSIX): temp in the target's own directory, fsync the
/// file, rename, fsync the directory. Any failure unlinks the temp and throws.
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
            if n < 0 { if errno == EINTR { continue }; throw fail("write") }
            off += n
        }
        if fchmod(fd, mode) != 0 { throw fail("fchmod") }  // before fsync; independent of umask
        if fsync(fd) != 0 { throw fail("fsync") }          // failure is fatal, never retried
    } catch { close(fd); throw error }
    if close(fd) != 0 { throw fail("close") }
    if tmp.withPlatformString({ t in target.withPlatformString { rename(t, $0) } }) != 0 { throw fail("rename") }
    published = true
    let dfd = dir.withPlatformString { open($0, O_RDONLY | O_DIRECTORY | O_CLOEXEC) }
    if dfd < 0 { throw fail("open dir") }
    defer { close(dfd) }
    if fsync(dfd) != 0 { throw fail("fsync dir") }         // makes the rename survive power loss
}
```

`rename` replaces a symlink at `target` rather than following it; a failed `fsync(dirfd)` after the rename still throws (data visible, not durable: the caller must know). swift-system has no public `openat`, `mkdirat`, `renameat`, `fsync` or `flock`, so the libc module sits next to `SystemPackage`.

**CAS publish** (`[fp]` §4, fixture `b-cas`; `chk` throws on non-zero, `copyHashing(from:toFD:)` streams 1 MiB chunks into one `SHA256`, swift-crypto):

```swift
func putVerified(store: String, expected: String, src: String) throws {
    let tmp = "\(store)/ingest/.tmp-\(UUID().uuidString)"      // ingest/ and blobs/ share a filesystem
    let final = "\(store)/blobs/\(expected)"
    let fd = open(tmp, O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW | O_CLOEXEC, 0o600)
    try chk(fd < 0 ? -1 : 0, "open tmp")
    defer { unlink(tmp) }                      // temp never outlives the call, success or failure
    do {
        let actual = try copyHashing(from: src, toFD: fd)       // hash while writing
        guard actual == expected else { throw DigestMismatch(expected: expected, actual: actual) }
        try chk(fchmod(fd, 0o444), "fchmod")   // read-only blob
        try chk(fsync(fd), "fsync")
    } catch { close(fd); throw error }
    try chk(close(fd), "close")
    if link(tmp, final) != 0 && errno != EEXIST { throw Posix(op: "link", code: errno) }  // EEXIST = already published = success
    let dfd = open("\(store)/blobs", O_RDONLY | O_DIRECTORY | O_CLOEXEC)
    try chk(dfd < 0 ? -1 : 0, "open blobs dir"); defer { close(dfd) }
    try chk(fsync(dfd), "fsync blobs dir")
}
```

The `UUID` and `String` paths here are the fixture's; per conflict C3 a library applies the rule 11 path types and `UInt64.random` naming (not re-run in this form). `expected` must already be a parsed `ContentDigest` (rule 13) so that `hex` is a valid single component.

**Digest parse-and-compare** (`[fd]` §4, 17/17 vectors on 6.4 and 6.3, Swift 6 mode, typed throws, no Foundation):

```swift
public struct ContentDigest: Hashable, Sendable, CustomStringConvertible {
    public enum Algorithm: String, Sendable, CaseIterable {
        case sha256, sha512
        var hexLength: Int { self == .sha256 ? 64 : 128 }
    }
    public enum ParseError: Error, Equatable {
        case unknownAlgorithm
        case wrongLength(expected: Int, actual: Int)
        case notLowercaseHex
    }
    public let algorithm: Algorithm
    /// Lowercase ASCII hex, validated; safe as a single path component.
    public let hex: String
    public var description: String { "\(algorithm.rawValue):\(hex)" }

    public init(parsing text: String) throws(ParseError) {
        let bytes = text.utf8
        guard let algorithm = Algorithm.allCases.first(where: { bytes.starts(with: ($0.rawValue + ":").utf8) }) else {
            throw .unknownAlgorithm
        }
        let encoded = bytes.dropFirst(algorithm.rawValue.utf8.count + 1)
        guard encoded.count == algorithm.hexLength else {
            throw .wrongLength(expected: algorithm.hexLength, actual: encoded.count)
        }
        guard encoded.allSatisfy({ ($0 >= 0x30 && $0 <= 0x39) || ($0 >= 0x61 && $0 <= 0x66) }) else {
            throw .notLowercaseHex
        }
        self.algorithm = algorithm
        self.hex = String(decoding: encoded, as: UTF8.self)
    }
}

public func hexLower<S: Sequence>(_ bytes: S) -> String where S.Element == UInt8 {
    let digits = Array("0123456789abcdef".utf8)
    var out = [UInt8](); out.reserveCapacity(bytes.underestimatedCount * 2)
    for b in bytes { out.append(digits[Int(b >> 4)]); out.append(digits[Int(b & 0x0F)]) }
    return String(decoding: out, as: UTF8.self)
}
```

An unregistered algorithm that the OCI spec says SHOULD pass through needs a separate byte-wise grammar check (`isWellFormedOCI(_:)` in `[fd]` fixture `DigestCheck`). The OCI grammar is `algorithm ":" encoded` with `[a-z0-9]+` components and `encoded ::= [a-zA-Z0-9=_-]+`; registered `sha256`/`sha512`/`blake3` use `[a-f0-9]`.

**Pin and canonical encoder:**

```swift
// swift-tools-version: 6.2
dependencies: [.package(url: "https://github.com/swiftlang/swift-subprocess", from: "1.0.1", traits: [])],
// target: .product(name: "Subprocess", package: "swift-subprocess")

let enc = JSONEncoder()
enc.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
enc.dateEncodingStrategy = .iso8601   // or .millisecondsSince1970; never the default
```

**Clock-choice table** (`[fd]` §10; Linux `Clock.cpp:48-120`):

| Need | Use | Do not use |
|---|---|---|
| Elapsed time, timeout, backoff, rate limit, benchmark | `ContinuousClock` (`clock.measure {}`, `start.duration(to: .now)`) | `Date()` subtraction, `timeIntervalSinceNow` |
| Awake time (work excluding system sleep) | `SuspendingClock` | it for deadlines that must still fire after wake |
| Persisted, logged, sent or externally compared timestamp | `Date` with `.iso8601` or an epoch strategy | an `Instant` (process or boot-session local) |
| Cross-process or cross-reboot ordering | wall `Date` or a sequence number | serializing an `Instant` |
| Machine output of a duration | `Duration.components`, or `Double` seconds you format yourself | `Duration.formatted()` (localized), `Duration` description (not a contract) |
| Absolute deadline API (`withDeadline`) | not in 6.4 (SE-0526) | assuming it exists |

### Consolidation re-runs

All 2026-10-10, through `~/.cache/research-lang/swift-tools/run.sh`, fixtures under `~/.cache/research-lang/swift-tools/fixtures/io-consolidation/` (see its `README.md`) and the dives' own fixtures (read only; no writes there).

| ID | Command (verbatim) | Violation | Twin | Key output |
|---|---|---|---|---|
| R1 | `run.sh swiftlint lint --strict --no-cache --config .swiftlint.yml bad` (custom_rules regex `[^A-Za-z0-9_]Process\(\)`); `grep -rn --include='*.swift' -e '[^A-Za-z0-9_]Process()' bad` / `good` | swiftlint **exit 0** (did not go red); grep **exit 0**, 1 hit | swiftlint good exit 0; grep good **exit 1** | `warning: Skipping enabled rule 'custom_rules' because it requires SourceKit and SourceKit access is prohibited.`, `Found 0 violations`; `bad/Bad.swift:2` |
| R2 | `run.sh swift build --scratch-path "$SWIFT_SCRATCH/io-consolidation-helper" -Xswiftc -warnings-as-errors` (tools 6.2, `.swiftLanguageMode(.v6)`, swift-system `from: "1.5.0"`); same with `SWIFT_VERSION=6.3`; `bash files-and-paths/check-a.sh $DW naive\|durable $W` | build exit 0 (6.4, 6.3); `naive` **exit 1** | `durable` **exit 0** | `VIOLATION: no fsync of directory .../work/a-naive` with `fsync(3<...a-naive/.dat.nosync9.cj6nNo>) = 0` then `rename(...)`; `PASS: directory fsync present`; replaced file mode `600` |
| R3 | first R2 build with `main.swift` importing only `FoundationEssentials` + `SystemPackage` | build exit 1 | build exit 0 after adding `Glibc`/`Musl`/`Darwin` | `error: cannot find 'exit' in scope` (re-observes `[fd]` K1 row `exit(0)`) |
| R4 | `grep -rn --include='*.swift' <pattern> bad` / `good` for the patterns below (bad/good twins in `io-consolidation/gr`) | each **exit 0** | each **exit 1** | `.name("[^"]*/` (2 hits), `\.environment = \[` (`Bad.swift:5`), `pushing(` and `\.push(`, `Task.sleep(nanoseconds`, `try? FileManager.default.removeItem`, `A-F`, `String(format:` and `\.hexString` |
| R5 | spot re-runs of the dives' fixtures (script run under bash): `[fd]` `DigestCheck naive-character\|naive-ishexdigit\|naive-regex\|strict`, `DateCheck default\|iso8601`, `Strings red\|green`, `LocaleCheck red\|green`, `CodableEvolve red\|green`, `JsonRed`/`JsonGreen` twice + `cmp -s`; `[sp]` `plant.sh 1.0.0 a`, `1.0.1 a`, `1.0.1 c`; `[fp]` `check-c.sh $U naive\|lexical\|guarded <tar>`, `check-b.sh $CAS naive\|verified` | seven **exit 1** (three naive digests, `DateCheck default`, `Strings red`, `LocaleCheck red`, `CodableEvolve red`); leak 1.0.0 **exit 1**; pgrep 0,0; traversal 1,1,1; CAS 1; JsonRed cmp 1 | five exit 0 (`strict`, `iso8601`, `Strings green`, `LocaleCheck green`, `CodableEvolve green`); leak 1.0.1 exit 0; pgrep 1,1,1; guarded 0,0,0; CAS 0; JsonGreen cmp 0 | `wrong=3`, `wrong=2`, `wrong=1`, `wrong=0`; `{"d":-978307200}` vs `{"d":"1970-01-01T00:00:00Z"}`; `colon-fields=1 crlf-lines=1` vs `2 2`; `got=1,234.5 want=1234.5`; `keyNotFound: Key 'mode'`; `delta=50` vs `delta=0`; `proc` and `sub-group-bad` pgrep 0, `sub-default`, `sub-graceful`, `sub-group-good` pgrep 1 |
| R6 | from the exemplar root: `grep -rIlF --include='*.swift' -e 'canImport(System)' . \| awk -F/ '{print $2}' \| sort \| uniq -c`; `grep -rIl --include='*.swift' -E -e '^import SystemPackage' . \| ...` | n/a (count) | n/a | `canImport(System)`: swift-build 26, SwiftPM 12, tuist 3, swift-nio 3; `^import SystemPackage`: container 77, nio 48, containerization 38, swiftly 34, swift-build 14, swift-system 7, vapor 1, SwiftPM 1 |

R5 note: the first attempt looped with `set -- $var` under zsh, which does not word-split, and returned bogus exit 0/127; the recorded numbers are from a bash script.

## Applied to the exemplars and the future consumers

### Which exemplars satisfy which rules

| Rule | Satisfied by | Note |
|---|---|---|
| 03, 07 (limits, status) | `swiftly@c8cf2e35bfca:Sources/MacOSPlatform/MacOS.swift:65` (`1024 * 10`), `Sources/LinuxPlatform/Linux.swift:372` (`100 * 1024`), status via `RunProgramError` at `ModeledCommandLine.swift:26,44,49,76`; `tuist@2f6ac74754bf:swifterpm/Sources/swifterpm/Support.swift:125-126` (`outputLimit` on both streams) with `isSuccess` guards at `:110,129`; `element-x-ios@14e33866ced2:Tools/Sources/Commands/CI/CI.swift:155` (`limit: 4096`) | |
| 25 (legacy Process) | `container@f70ecbb926d9:Sources/ContainerPlugin/ServiceManager.swift:26-35` and `Services/ContainerAPIService/Client/PacketFilter.swift:181-189` (`nullDevice`); `ContainerTestSupport/ContainerFixture.swift:195-255` (temp files read after exit, environment merged at `:200-204`); `Services/ContainerAPIService/Client/ProcessIO.swift:101-137` (`readabilityHandler`) | |
| 24 (env) | `swiftly ModeledCommandLine.swift:20-25,37-48`, `Proxy.swift:77` (`env.updating([...])`); `tuist CommandRunner.swift:237-239,254` (`.custom`) | the defect is only in the `output(...)` overloads |
| 19 (CAS) | `containerization@3e7bc39e66b3:Sources/Containerization/Image/ImageStore/ImageStore+Import.swift:168-184` (UUID temp in `ingest/`, digest compare, then move, exists is success) and `Sources/ContainerizationOCI/Content/ContentWriter.swift:58-70,109-136` (same-directory temp, hash while copying) | none uses `link()` or fsyncs; the strictest exemplar still falls short |
| 13 (digest) | `containerization@3e7bc39e66b3:Sources/ContainerizationOCI/Content/Digest.swift:53-92` (byte validation with the `b`+U+0308 comment), `:119-131` (containment check) | narrower than the grammar by design (sha256, lowercase) |
| 20 (traversal) | `containerization@3e7bc39e66b3:Sources/ContainerizationOS/FileDescriptorOps.swift:44-124` (fd-relative primitives, typed errors), `Sources/ContainerizationArchive/ArchiveReader.swift:269-396` (root opened once, `O_WRONLY\|O_CREAT\|O_EXCL\|O_NOFOLLOW\|O_CLOEXEC` at `:369`, `symlinkat` never followed `:382-396`); `container@f70ecbb926d9:Sources/ContainerBuild/BuildPipelineHandler.swift:46` | only 4 of 40 repos use `O_NOFOLLOW` |
| 12, 14 (JSON, dates) | `swift-container-plugin@a9646b8d4dca:Sources/ContainerRegistry/ImageSource.swift:19-24` (`[.sortedKeys, .prettyPrinted, .withoutEscapingSlashes]` + `.iso8601`, `:22`); `containerization ContentWriter.swift:32`, `LocalContentStore.swift:51`, `Sources/Containerization/BridgeStateFile.swift:68` | 105 files / 24 repos mention `.sortedKeys` of 307 files / 31 repos that use `JSONEncoder()` |
| 02, 16, 17 | `FoundationNetworking` guard in 10 repos / 54 files including tests (`[fd]`; 41 guards in 8 repos in production code, audit) (tuist, Alamofire, SwiftPM, swift-container-plugin, swift-snapshot-testing); `ContinuousClock` in 91 files / 19 repos (`containerization CHProcess.swift:165`); 27 of 70 non-test directory-listing files also sort | |
| 01 (SystemPackage) | `swiftly FileLock.swift:19-28`, `containerization ArchiveReader.swift:269-300`, `swift-nio NIOFilePath.swift:31-42` (wraps `SystemPackage.FilePath`); 9 repos import it | 32 repos still compose paths with `URL(fileURLWithPath:` |
| 04 (Essentials) | swift-foundation itself; `canImport(FoundationEssentials)` in 15 repos / 606 files including tests (`[fd]`), 415 uses in 13 repos in production code (audit) | 38 of 40 repos `import Foundation`: 6,617 files including tests (`[fd]`), 3,824 files in 34 repos in production code (audit) |

### Which prominent exemplars violate which rules

| Rule | Violated at | What |
|---|---|---|
| 06 | `swiftly@c8cf2e35bfca:Package.swift:34` (`exact: "1.0.0"`); `element-x-ios@14e33866ced2:Package.swift:11` (`.upToNextMinor(from: "0.3.0")`); `tuist@2f6ac74754bf` `Package.swift:1991`, `swifterpm/Package.swift:17`, `swifterpm/third_party/nio/Package.swift:8`, `cli/Sources/XcodeGraph/Package.swift:60` (all `exact: "0.4.0"`) | all six corpus pins fail; only swiftly uses `traits: []` |
| 24 | `swiftly@c8cf2e35bfca:Sources/SwiftlyCore/ModeledCommandLine.swift:64-71,82-83,102-109,121-122` | copy mutated, original run; latent (callers never pass `environment:` to `output(...)`), and `:98` takes `limit _: Int` and ignores it |
| 25 | `container@f70ecbb926d9:Sources/ContainerPlugin/ServiceManager.swift:68-80` (stdout to EOF, then stderr, then `waitUntilExit`; same shape at `:106-116`, `:138-149` for one pipe each, which is safe) | latent deadlock if stderr exceeds one pipe buffer |
| 08 | `container@f70ecbb926d9:Sources/ContainerK8s/Support/K8sHelper+Bootstrap.swift:43` (heredoc `\(configYAML)`), `:63` (`cp \(kubeconfigPath)`); `tuist ForeignBuildSideEffectGraphMapper.swift:32-33` (`export SRCROOT=\(projectPath.pathString)`); test-only: `swiftly Tests/SwiftlyTests/SwiftlyTests.swift:814,906` | C3a finds 45 hits in 6 repos, 40 of them under tests; the shell-by-design ones (`swift-build ShellScriptTaskProducer.swift:189`, `tuist ForeignBuildHasher.swift:59`) are not defects |
| 23 | `tuist@2f6ac74754bf:cli/Sources/TuistProcess/CommandRunner.swift:241-249` (sets a `teardownSequence` and `processGroupID = 0`, but no `toProcessGroup: true`); swiftly, element-x-ios and the 0.x users rely on the default | only one exemplar sets any sequence |
| 09 | `swiftly@c8cf2e35bfca:Sources/Swiftly/Config.swift:48`, `Init.swift:175,185,332`, `Update.swift:145`, `Install.swift:142`, `SelfUninstall.swift:94`; `containerization@3e7bc39e66b3` `ImageStore+ReferenceManager.swift:73`, `ArchiveReader.swift:252`; `swift-nio@e12881f2a691:Sources/NIOFS/FileSystem.swift:577-590` and `Sources/_NIOFileSystem/FileSystem.swift:569-582` (`replaceItem` unlink then rename, docstring says `rename(2)`) | `.atomic` in 21 repos / 129 hits (audit); 0 of 40 fsync a directory; even `swift-foundation@aadd9259be07:Sources/FoundationEssentials/Data/Data+Writing.swift:403,669` stops at file fsync + rename |
| 19 | `containerization@3e7bc39e66b3:Sources/ContainerizationOCI/Content/ContentWriter.swift:50` (`data.write(to: destination)` on the digest-named path), `LocalContentStore.swift:194-198` (trusts the temp name as its digest, `fileExists` then `moveItem`), `ImageStore+Import.swift:173-176` (throws on mismatch without removing the temp) | exact negation of the recipe inside the best CAS exemplar |
| 22 | `swiftly@c8cf2e35bfca:Sources/SwiftlyCore/FileLock.swift:34-100` (create-exclusive PID file, polls 1 s up to 300 s) | stuck after `SIGKILL` |
| 30 | `containerization@3e7bc39e66b3:Sources/Containerization/Image/ImageStore/ImageStore+Export.swift:129-130` (filtered-platform branch re-encodes an OCI index with a bare `JSONEncoder()`; `:126-128` correctly returns the received bytes) | also violates rule 12 |
| 13 | `swift-container-plugin@a9646b8d4dca:Sources/ContainerRegistry/ImageReference.swift:281-298` (`[a-fA-F0-9]{64}`: accepts uppercase, contradicts OCI "MUST NOT"); raw `==` on digests in `ImageStore+Import.swift:174,198`, `RegistryClient+Push.swift:83,157` (safe only because validated upstream, which the code does not state) | |
| 04 | `swift-container-plugin@a9646b8d4dca:Sources/ContainerRegistry/ImageReference+Digest.swift:39-46` (`String(format: "%02x")` plus `try!` re-parse) | pins a library to full Foundation |
| 02 | `swift-argument-parser@efd239f0055b:Tools/changelog-authors/ChangelogAuthors.swift:103` (macOS tool script) | Darwin-only tool, low severity |
| 16 | `timeIntervalSince(` in 79 files / 16 repos (tuist 17 non-test files, swift-foundation 8, sourcekit-lsp 6); `DispatchTime.now` 37 / 12; `SuspendingClock` in 11 files / 6 repos | |
| 17 | `container@f70ecbb926d9:Sources/ContainerPersistence/EntityStore.swift:109`, `Services/ContainerAPIService/Server/Containers/ContainersService.swift:93` (listing rebuilds state, unsorted in-file) | 43 of 70 non-test files that list a directory never sort |
| 10 | `NSTemporaryDirectory`/`temporaryDirectory` in non-test code: tuist 14, element-x-ios 12, swift-foundation 9, container 8, swift-build 7 | counts are presence, not misuse; judge each hit |
| 05 | `container` (`ServiceManager.swift:26,68,106,138`, `HostDNSResolver.swift:127`, `PacketFilter.swift:181`, `SystemLogs.swift:61`), `containerization IntegrationSuite+CctlCLI.swift:41`, `swift-container-plugin Plugins/ContainerImageBuilder/runner.swift:37`, `swift-argument-parser` (5 files), `swift-openapi-generator` (4), `JavaScriptKit` (9) | 50 uses in 16 repos (audit); several are test or build-plugin code |

### New commitments for a Swift SDK and Swift CLIs

For the **Swift ocx SDK** (mirroring `ocx-sdk-python@80136dde4162`; dependency budget stdlib + swift-subprocess, owner Q4; `ocx-sdk-python` is the contract reference at `src/ocx_sdk/_process.py` and `_errors.py`):
- One spawn module (rule 26) with the `ProcessRunner` shape, `from: "1.0.1"` and `traits: []` (rules 06, 26); mandatory `limit:` defaults 4 MiB stdout and 256 KiB stderr and an `.outputTooLarge(limit:)` failure (the Python SDK has no capture ceiling by design, which Swift cannot copy; rule 03).
- `createSession = true` with a group-wide `.terminate` step and a 5 s grace before the implicit kill (rule 23), `128 + n` for `.signaled(n)` (map conflict 20, Q6; Python keeps the raw code), a timeout race that leaves no grandchild (`[sp]` V14), and a `CancellationError` after `run()` (rule 26, to implement and test in wave 3 `api/sdk-shape`).
- `Executable` dispatch on `contains("/")`; environment as `[String: String?]` mapped onto `.inherit.updating(...)`; a sentinel test (rule 24) and the nine-case suite as the 100% line-coverage subject on Linux.
- Version gate: `terminationStatus` for every call (rule 07); `ocx --format json` decoded with explicit date strategies and `decodeIfPresent` evolution (rules 14, 28); no localized formatting (rule 15). Needs `FoundationEssentials` for `JSONDecoder` (rule 04 via `canImport`), so `traits: []` saves nothing there (conflict C5).
- Path handling is pass-through (argv strings), so `SystemPackage` is needed only inside the spawn module if `workingDirectory` is a `FilePath` (rule 01, conflict C2).

For **Swift CLIs in the ocx/grimoire mould** (state under a store root, installs, caches):
- The durable helper (rule 18) for every state, lock and install-tree write, the CAS recipe (rule 19) for blobs, `flock` (rule 22), explicit modes (rule 21) and a start-up orphan sweep (STATE-7/8). No exemplar satisfies all of these (0 of 40 fsync a directory); this is a new commitment, not a codification of practice.
- Traversal-guarded extraction (rule 20), `ContentDigest` (rule 13), canonical JSON written once and hashed as stored bytes (rules 12, 30), sorted listings (rule 17), stage-in-destination (rule 10).
- Windows and Apple legs are labelled unverified (rules 31, 32); the `ocx`/`grim` Rust CLIs already own the cross-language durability ladder in `rules/rust-quality/durable-state.md`.

For **general adopters**: Apple apps are bound by rules 01-02, 11-17, 28-29 only (they do not spawn, and their store is Core Data or SwiftData, out of scope); servers take the whole set; libraries take 01, 02, 04, 11-17, 28-29 and rules 18-21 if they persist. Test code is exempt from 05, 09, 10 when it writes scratch files, but not from 08.

## AI-agent failure modes

Ranked by how often it bites, using the corpus counts as a proxy for how often the idiom appears in training data (an estimate; the sub-artifacts do not measure agent output directly).

| # | Failure | Evidence of frequency | Mechanical check |
|---|---|---|---|
| 1 | `try data.write(to: url, options: .atomic)` for a store, cache or lock, commented "atomic, crash-safe" | `.atomic`/`atomically:` 129 hits in 21 repos; 0/40 fsync a directory | rule 09 grep; rule 18 strace |
| 2 | Bare `JSONEncoder().encode(x)` then hash, diff or write the bytes; JSON built by iterating a `Dictionary` | `JSONEncoder()` in 307 files / 31 repos, `.sortedKeys` in 105 / 24 | rule 12 grep; two-run `cmp` |
| 3 | `Process()` + `Pipe()` + `waitUntilExit()` + `readDataToEndOfFile()` in that order; `Task.detached { Process()... }` | `Process()` 50 uses in 16 repos | rule 05 grep; rule 25 `timeout 60`; `proc` pgrep (rule 23) |
| 4 | `["/bin/sh", "-c", "tool \(arg)"]` for convenience | 45 narrow hits in 6 repos (40 in tests) | rule 08 greps; canary |
| 5 | `Date()` minus `Date()`, `DispatchTime.now()`, `Task.sleep(nanoseconds:)` | `timeIntervalSince(` in 79 files / 16 repos | rule 16 greps |
| 6 | `contentsOfDirectory` into a manifest or assertion unsorted | 43 of 70 non-test listing files never sort | rule 17 grep |
| 7 | `import Foundation` in every library file; bare `URLSession.shared` with a completion handler | 38 of 40 repos; 54 guarded files in 10 repos | rules 02, 04 greps; Linux build |
| 8 | Digest check by `hasPrefix("sha256:")` + `split(separator: ":")` + `("a"..."f").contains` or `isHexDigit` or `[a-fA-F0-9]`; `lowercased() ==` | `isHexDigit` in 10 files / 6 repos | rule 13 grep + 17-vector test |
| 9 | Stale swift-subprocess spellings: `output: .string` with no limit, `.unhandledException`, `guard let out = result.standardOutput`, `.sendSignal`, `runDetached`; copying the README's `.upToNextMinor(from: "0.4.0")` or `exact: "1.0.0"` | model saw 0.x and 1.0.0 most | compile against 1.0.1 (`[sp]` V9, exit 1 each); rule 06 grep |
| 10 | Non-zero exit assumed to throw; `terminationStatus` skipped | other-language habit | rule 07 grep |
| 11 | `Date` default strategy read by a Python/Go peer; new field with a Swift default on a `Codable` struct | default is the unmarked case | rules 14, 28 |
| 12 | `.formatted()` for a size or timestamp in a log line parsed by tools | `NumberFormatter` 30 files / 10 repos, `DateFormatter` 91 / 17 | rule 15 grep |
| 13 | `import System` + `FilePath`, `#if compiler(>=6.4)` around it, `CommandLine.executablePath` (WWDC26 wording) | compile error on Linux | `swift build` (rule 01) |
| 14 | Lexical-only "sanitise" of tar entries (drop `..` and leading `/`); `root.appendingPathComponent(entry.name)` then `Data.write` | `lexicallyResolving` or `hasPrefix` after `.standardized` | rule 20 fixtures; rule 11 `hasPrefix` hit |
| 15 | `FileManager.replaceItemAt` or NIOFS `replaceItem` trusted as "the safe replace" | docstring says `rename(2)` | rule 09 grep; `check-repl.sh`, `check-r.sh` |
| 16 | Writes the CAS blob first, compares the digest after, leaves the file; `moveItem` over an existing digest path | `ContentWriter.swift:50` | rule 19 `find` after a bad put |
| 17 | `toProcessGroup: true` without `createSession`, or no teardown group, so cancel leaves grandchildren (or kills the caller) | only tuist sets a sequence | rule 23 pgrep |
| 18 | `c.environment = e; run(self.config())`; `Process.environment = ["FOO": "1"]` losing `PATH` | swiftly latent bug; replace-not-merge | rule 24 sentinel; rule 25 grep |
| 19 | PID-file lock "to prevent concurrent runs"; `createFile(atPath:contents:)` for a token assuming 0600 | one exemplar (swiftly) | rule 22 grep + `check-l.sh`; rule 21 mode table |
| 20 | `.name("./tool")`/`.name("/usr/bin/git")`; `limit: Int.max` to "fix" the compile error; `.string(limit:)` for tar/digest bytes; `error.code` without the `SubprocessError` cast | `Process` took a URL so models mix styles | rule 26 grep; rule 03 greps and compile |
| 21 | Hallucinated helpers: `JSONEncoder.OutputFormatting.canonical`, `encoder.sortKeys`, `.iso8601withFractionalSeconds`, `SHA256.hash(...).hexString`, `Locale.posix`, `FileDescriptor.openat`, `FileDescriptor.synchronize()`, `FilePath.isLexicallyContained(in:)` | not API; "fixed" by switching to `String(format:)` | Linux `swift build` (`has no member`); rule 04 grep |
| 22 | "Fixes" a flaky dictionary-order test with `SWIFT_DETERMINISTIC_HASHING=1` | hides the bug | `grep -rn -e 'SWIFT_DETERMINISTIC_HASHING' .github scripts Package.swift` (hits only in test configuration; not planted) |
| 23 | Wraps raw descriptors in a class marked `@unchecked Sendable` to silence Swift 6 errors | hides close-once bugs | owned by SW-CONC; grep `@unchecked Sendable` near `open(` |

## Open questions

Owner decisions (default the program applies if unanswered):

| ID | Question | Default |
|---|---|---|
| Q-IO-1 | May a rebuildable cache keep `Data.write(.atomic)`? (rule 09 is MUST for state of record) | Yes, with `// non-durable: rebuildable`; the grep hit then carries the comment |
| Q-IO-2 | SDK capture limits (4 MiB stdout, 256 KiB stderr) are prototype numbers with no source | Adopt, configurable on `ProcessRunner`, with `.outputTooLarge(limit:)` surfaced |
| Q-IO-3 | SDK cancellation: throw `CancellationError` after `run()` returns? | Yes (`timedOut` wins over `CancellationError` when the timer fired) |
| Q-IO-4 | Kill grace before the implicit SIGKILL | 5 s, matching `KILL_GRACE = 5.0` in `ocx-sdk-python` |
| Q-IO-5 | Archive absolute names: reject or strip the root | Reject (the fixture's policy; bsdtar and containerization strip); document the choice either way |
| Q-IO-6 | `swift-system` lower bound for packages that also depend on swift-subprocess | `from: "1.5.0"` (Subprocess's own floor; resolves 1.8.1); raise it only for an API used. The dive's fixtures used `1.6.4` with no recorded reason |
| Q-IO-7 | `F_FULLFSYNC` on Apple targets (rule 32) | CONSIDER; label unverified |
| Q-IO-8 | Amend map conflict 1 to say SwiftLint `custom_rules` cannot carry bans on the static Linux build | Yes: grep gate; `custom_rules` advisory only where SourceKit exists |
| Q-IO-9 | Does the program need an RFC 8785 serializer? | No: hash stored bytes; document `.sortedKeys` as not JCS |
| Q-IO-10 | Q7 (Windows host) for the io rows | Stay `unverified: read only`; the local WSL Windows run is available if granted |

Subareas deserving another research round:

1. **Windows leg of io** (needs a Q7 grant or CI evidence): does Foundation's `FILE_RENAME_FLAG_POSIX_SEMANTICS` rename plus `_commit` survive a crash, does `gracefulShutDown` reach grandchildren (`WM_CLOSE`, `CTRL_C_EVENT`, `CTRL_BREAK_EVENT`), and what do `FilePath` anchors do with `\foo` and `C:foo` in the traversal guard? Covers M-G-03 and M-G-19, only read here.
2. **macOS runner**: `F_FULLFSYNC` behaviour, `.atomic` mode preservation on Darwin, `System.FilePath` versus `SystemPackage.FilePath` type mismatch at the Subprocess boundary (conflict C2), Darwin `pipe2`, macOS pipe capacity, `Locale.current` and `.sortedKeys` order on Darwin.
3. **Static Linux SDK (musl)**: swift-subprocess is "Build only" there; does `run()` work under `--swift-sdk x86_64-swift-linux-musl`, does the `canImport(Musl)` branch of the durable helper compile and pass the strace check, and what are the real FoundationEssentials sizes (10.3 MB vs 55.6 MB are from the eco scout, not measured here)? Belongs with the release dive.
4. **SDK wrapper completion (wave 3 `api/sdk-shape`)**: implement and test the `CancellationError` path and the timeout-versus-cancel precedence; the prototype lacks it.
5. **SwiftLint with SourceKit**: does `custom_rules` go red on a SourceKit-enabled build (macOS, or a dynamic Linux build)? Decides whether the gates dive may offer it as an advisory carrier for the SW-IO grep set.
6. **Crash injection** for the durable helper (fault-injecting block device): strace proves syscall order, not that the directory fsync changes on-disk outcomes on ext4/overlayfs.
7. **Uncovered rows**: M-G-20 (streaming large files without `Data`, P3) was not researched by any dive; M-G-11's binary-size claim is unverified here.

## Sub-artifacts

- [swift-io/subprocess-contract.md](swift-io/subprocess-contract.md): swift-subprocess 1.0.1 API and pin, output limits, teardown and cancellation, environment, injection, legacy `Process` rules, the SDK `ProcessRunner` shape (rules 03, 05-08, 23-27, 31; V1-V15).
- [swift-io/files-and-paths.md](swift-io/files-and-paths.md): what `Data.write(.atomic)`, `replaceItemAt` and NIOFS `replaceItem` do on Linux, the durable helper, CAS recipe, `FilePath` availability, two-layer traversal guard, temp files, modes, locks, Windows and Apple notes (rules 01, 09-11, 18-22, 31-32; runs a1-x1, s1-s5).
- [swift-io/formats-and-determinism.md](swift-io/formats-and-determinism.md): canonical JSON, digest grammar and the `ContentDigest` parser, String views, the Foundation import rule, Date/Codable/locale policy, directory order, clocks, hex encoding (rules 02, 04, 12-17, 28-30; runs A1-S1, GREP-*).

## Key sources

1. https://github.com/swiftlang/swift-subprocess/releases/tag/1.0.1 (the fd-leak, CLOEXEC, posix_spawn and supplementaryGroups fixes, 2026-10-09)
2. https://github.com/swiftlang/swift-subprocess/releases/tag/1.0.0 (limits, `TerminationStatus`, teardown group parameter, `Executable.name`, tools 6.2, 2026-08-04)
3. https://github.com/swiftlang/swift-foundation/blob/main/Proposals/0037-subprocess-1.0.md (SF-0037, the normative 1.0 API)
4. https://github.com/swiftlang/swift-foundation/blob/main/Proposals/0007-swift-subprocess.md (SF-0007, motivation against `Process`, task cancellation contract)
5. https://github.com/swiftlang/swift-subprocess/blob/1.0.1/Sources/Subprocess/Teardown.swift (implicit kill, process-group warning)
6. https://github.com/swiftlang/swift-evolution/blob/main/proposals/0529-filepath-in-stdlib.md (SE-0529, accepted 2026-06-05, not in 6.4; Windows path styles)
7. https://github.com/swiftlang/swift-foundation/blob/main/Sources/FoundationEssentials/Data/Data%2BWriting.swift (the `.atomic` implementation: file fsync, `renameat`, no directory fsync)
8. https://man.archlinux.org/man/fsync.2.en and https://lwn.net/Articles/457667/ (the temp, fsync, rename, fsync-directory recipe)
9. https://man.archlinux.org/man/open.2.en (`O_NOFOLLOW` guards only the last component)
10. https://github.com/apple/containerization/blob/main/Sources/ContainerizationArchive/ArchiveReader.swift (fd-anchored extraction, the reference traversal guard)
11. https://github.com/opencontainers/image-spec/blob/main/descriptor.md (digest grammar; `[A-F]` MUST NOT) and https://github.com/opencontainers/image-spec/blob/main/considerations.md (I-JSON, RFC 8785 optional)
12. https://www.rfc-editor.org/rfc/rfc8785.txt (JCS: UTF-16 key order, number text)
13. https://github.com/swiftlang/swift-foundation/blob/main/Distributions.md (prefer the built-in Foundation; no package dependency)
14. https://github.com/swiftlang/swift/blob/main/stdlib/public/Concurrency/Clock.cpp (clock-id mapping per platform)
15. https://github.com/swiftlang/swift-corelibs-foundation/blob/release/6.3/Sources/Foundation/FileManager%2BPOSIX.swift (reversed `renameat` arguments at lines 527, 534: the 6.3.x `replaceItemAt` defect)
