---
title: Force operations, preconditions and trapping conversions in Swift 6.x (SW-ERR and SW-SEC)
topic: errors/traps-and-unwraps
agent: wave2-errors-traps-and-unwraps
model: sonnet
date_researched: 2026-10-10
sources_count: 24
fixtures: /home/mherwig/.cache/research-lang/swift-tools/fixtures/traps-and-unwraps/
scope: >
  Covers rows M-C-05, M-C-06 (force unwrap, try!, as!, IUO; fatalError/precondition vs throw) and
  M-I-01, M-I-02 (trapping integer conversions, truncatingIfNeeded) for Swift 6.3.3 and 6.4.0 on
  x86_64 Linux, with the three 2026 advisories (swift-nio CVE-2026-43678 and CVE-2026-43671,
  Hummingbird CVE-2026-97697) as ground truth. Every runtime claim was run on both toolchains.
  Not covered: aarch64 (the image is x86_64 only), macOS/Xcode and Windows behaviour (marked
  "unverified: read only"), typed-throws error-type design, and exit-code tables beyond the
  trap/usage/data rows.
---

# Force operations, preconditions and trapping conversions

Environment for every run: Ubuntu 26.04.1 container, x86_64, `swift:6.4` (swift-6.4-RELEASE) and
`SWIFT_VERSION=6.3` (6.3.3), SwiftLint 0.65.1 (static binary), the toolchain's bundled `swift format`
(reports `main` on 6.4 and `6.3.3` on 6.3). Scratch: `$SWIFT_SCRATCH/traps-and-unwraps` (6.4) and
`$SWIFT_SCRATCH/traps-and-unwraps-6.3` (6.3, a separate path because module caches are not shared
across toolchains), plus `-debug`, `-rel`, `-asan`, `-unchecked`, `-test`, `-extra` suffixes.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [What traps, and what a trap looks like (exit codes)](#1-what-traps-and-what-a-trap-looks-like)
   2. [Build modes change what a check means](#2-build-modes-change-what-a-check-means)
   3. [The three 2026 advisories](#3-the-three-2026-advisories)
   4. [Integer conversions: the initializer family](#4-integer-conversions-the-initializer-family)
   5. [truncatingIfNeeded: wrong index and silent out-of-bounds write](#5-truncatingifneeded-wrong-index-and-silent-out-of-bounds-write)
   6. [Force operations: what each tool really does](#6-force-operations-what-each-tool-really-does)
   7. [Tests and force operations](#7-tests-and-force-operations)
   8. [precondition vs throw vs fatalError vs assert](#8-precondition-vs-throw-vs-fatalerror-vs-assert)
   9. [CLI exit codes for bad input](#9-cli-exit-codes-for-bad-input)
   10. [Row ownership: errors.md or security.md](#10-row-ownership-errorsmd-or-securitymd)
   11. [Checks that did not discriminate](#11-checks-that-did-not-discriminate)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- Unlabelled integer conversion `Int(x)` / `UInt32(x)` traps (exit 132, SIGILL) when the value does not fit; `Int(exactly:)` returns `nil`. The CVE-2026-43678 frame `81 7F 80 00 00 00 00 00 00 00 00` is exactly `Int(UInt64 >= 2^63)`; reproduced: `ared 8000000000000000` exits 132, the `Int(exactly:)` twin exits 65 with a message and still accepts `0x10` (exit 0).
- Any integer that came from outside the process is converted with `T(exactly:)` and a thrown typed error, or compared to a limit first. `T(_:)` on a wire, file, argv, JSON or FFI integer is a remote denial of service on a server and an exit-132 crash with no message on a CLI.
- `UInt32(truncatingIfNeeded:)` on an untrusted length is worse than a trap: it wraps (`2^32 + 16` becomes `16`), passes the bounds check on the wrapped value, and hands the caller a 16-byte buffer promised as 4 GiB. Reproduced: release build exits 0 having written 64 bytes into a 16-byte allocation; ASan exits 1 with `heap-buffer-overflow ... WRITE of size 64`; the debug build dies of glibc heap corruption (exit 134 on 6.4, 139 on 6.3), so the symptom is not even stable.
- Every `truncatingIfNeeded` needs a same-line proof (`// truncate-ok: <why it fits>`). Upstream's own fix kept exactly one, after bounds checks that mathematically guarantee the fit (swift-nio `87f935b70c5e`).
- `precondition` is kept in `-O` and removed by `-Ounchecked`; `assert` is removed in every optimised build; `fatalError` is kept in all three. Measured with port 70000: `assert` in `-O` exits 0 and prints `listening on 70000`; `precondition` under `-Ounchecked` does the same; `fatalError` still exits 132. Never build with `-Ounchecked`.
- Stdlib arithmetic traps on overflow in `-O` as well (`Int.max - 2 + 70000` exits 132); it wraps only with `&+`-family operators or under `-Ounchecked` (prints `-9223372036854705811`). The Rust habit "release wraps silently" is wrong for Swift.
- Input from outside the process is validated by throwing (typed `throws(E)`, SE-0413); `precondition`/`assert`/`fatalError` are for invariants the same module established. The language book says it directly: assertions and preconditions are not for recoverable or expected errors, and a failed one cannot be caught.
- A CLI maps bad invocation to exit 64 and bad data to exit 65; a trap (132 SIGILL, 134 SIGABRT, 139 SIGSEGV on x86_64 Linux) is never a documented status. Reproduced: `precondition` on a bad `--port` exits 132 with an empty stderr in `-O`; the throwing twin exits 64 with `error: port out of range: 70000 (expected 1...65535)`.
- By default on Linux a trap on a non-tty prints a 47-line backtrace on stderr (`SWIFT_BACKTRACE` unset); with `SWIFT_BACKTRACE=enable=no` the same `-O` trap prints nothing at all and still exits 132. Buffered stdout written before the trap is lost when stdout is not a tty.
- Force operations: enable swift-format `NeverForceUnwrap`, `NeverUseForceTry` and `NeverUseImplicitlyUnwrappedOptionals` in the config that `swift format lint --strict` reads. All three are off by default and are lint-only rules, so they do nothing under `swift format format`. Reproduced: red tree exits 1 under `--strict`, 0 without it; green twin exits 0 both ways.
- Enabling the rules in `.swift-format` is not enough: `apple/containerization` sets them `true` in `.swift-format` but its lint gate reads `.swift-format-nolint`, where all three are `false` (`Makefile:505`). With the bundled swift-format its Sources have 57 `NeverForceUnwrap`, 5 `NeverUseForceTry` and 1 `NeverUseImplicitlyUnwrappedOptionals` findings.
- SwiftLint, if used, already ships `force_cast` and `force_try` on at severity error (exit 2); `force_unwrapping` is opt-in at severity warning and ignores `URL(string: "literal")!` and four sibling literal initialisers by default.
- Tests: swift-format exempts any file that imports `XCTest` or `Testing` (and any `@Test` function) automatically; SwiftLint exempts nothing without a nested `.swiftlint.yml`. Exempt does not mean recommended: a `!` on nil inside a Swift Testing test killed the test process ("Program crashed: Illegal instruction") and the final run summary never printed, while `try #require(x)` recorded one issue and the run finished.
- A documented trap is testable: `await #expect(processExitsWith: .failure) { ... }` (ST-0008, Swift 6.2) passed against the trapping function and went red when pointed at the throwing one.
- Row ownership: M-C-05 and M-C-06 go to `errors.md` (SW-ERR), M-I-01 and M-I-02 go to `security.md` (SW-SEC), mirroring rust-quality (panic policy in `errors.md`, checked arithmetic on attacker lengths in `security.md`), with a one-line cross reference in each.
- Two checks went in without discriminating and must not be proposed as gates: `-strict-memory-safety` (14 warnings on the red and 14 on the twin, both use unsafe pointers) and SwiftLint `custom_rules` (the static 0.65.1 binary skips them: "requires SourceKit and SourceKit access is prohibited").

## Findings

### 1. What traps, and what a trap looks like

Every runtime-failure primitive below was run as an `-O` executable on 6.4.0 and 6.3.3 with identical exit codes (fixture `extra/traps.swift`, driver `extra.sh`, logs `extra-6.4.log`, `extra-6.3.log`). Values come from `argv` so the optimiser cannot fold them. `SWIFT_BACKTRACE=enable=no`.

| Operation (untrusted value `n`) | Exit | Non-trapping twin | Twin exit/output |
|---|---|---|---|
| `Int(d)` with `d` = `nan` or `1e20` | 132 | `Int(exactly: d)` | 0, `nil` (also `nil` for `2.5`; `Int(2.5)` silently gives `2`) |
| `UInt(n)` with `n = -1` | 132 | `UInt(exactly: n)` | 0, `nil` |
| `n...(n - 3)` (`ClosedRange`, lower > upper; CVE-2026-97697) | 132 | check `lower <= upper` first | 0, `[]` |
| `n..<(n - 3)` (`Range`, lower > upper) | 132 | check first | |
| `100 / zero`, `Int.min / -1` | 132 | guard divisor | 0, `nil` |
| `n + Int.max`, `n * Int.max` | 132 | `addingReportingOverflow` | 0, `overflow` |
| `n &+ Int.max` | 0 | (wraps silently: `-9223372036854775808`) | |
| `abs(Int.min)` | 132 | | |
| `[UInt8](repeating: 0, count: -1)` | 132 | | |
| `[1, 2, 3][n]` (`n` = 5 or -1) | 132 | `indices.contains(n)` | 0, `out` |
| `s[s.index(s.startIndex, offsetBy: 5)]` | 132 | | |
| `x!` on `nil` | 132 | `guard let` | |
| `[Int]().removeFirst()` | 132 | | |
| `1 << 64` | 0 (smart shift, result 0) | | |

Exit 132 is `128 + 4`; `kill -l 4` printed `ILL` (`signal view` section of `run-6.4.log`). Other codes seen: 134 (SIGABRT: glibc `malloc(): unaligned tcache chunk detected`, exclusivity) and 139 (SIGSEGV; also `-Ounchecked` out-of-range index). The earlier failure audit measured the same classes ([fail] §2.7: `swift-topic-map/failure.md`). On arm64 the equivalent trap is reported as SIGTRAP (133) in forum and DTS threads cited by [fail]; unverified: the image is x86_64 only (arm64 would need a qemu-emulated 5 GB image), and macOS/Windows exit conventions are unverified: read only.

Trap anatomy with default settings, `ared 8000000000000000`, release build, stdout and stderr redirected to files (script `bt.sh`):

```
default env: exit=132 stderr_lines=47   (48 on 6.3.3)
*** Signal 4: Backtracing from 0x5f7f33250623... done ***
*** Swift runtime failure: Not enough bits to represent the passed value ***
enable=no:   exit=132 stderr_lines=0
```

The backtracer is on by default on Linux (`enable | yes*`, [Backtracing.rst](https://raw.githubusercontent.com/swiftlang/swift/main/docs/Backtracing.rst), "Crash catching is enabled by default"); it is not active by default on macOS (same document, "The backtracer is not active by default on macOS"). With a tty on both stdin and stdout the doc's `interactive` default is `tty` and `timeout` is 30 s, so an interactive crash prompt can wait; unverified: needs a tty, not run. For a CLI contract this means: do not parse stderr after a trap, and do not let a trap stand in for a status.

In debug builds the message is present (`Swift/Integers.swift:3641: Fatal error: Not enough bits to represent the passed value` on 6.4, `:3539` on 6.3); in `-O` stdlib traps print nothing without the backtracer.

### 2. Build modes change what a check means

The stdlib source states the semantics ([Assert.swift](https://raw.githubusercontent.com/swiftlang/swift/main/stdlib/public/core/Assert.swift)): `precondition` is checked in `-Onone` and `-O` and "In `-Ounchecked` builds, `condition` is not evaluated, but the optimizer may assume that it always evaluates to true"; `assert` "In `-O` builds ... `condition` is not evaluated, and there are no effects". Measured with the same executable (`dred <primitive> 70000`, exit codes identical on 6.3.3 and 6.4.0):

| Primitive, bad input 70000 | `-Onone` (debug) | `-O` (release) | `-Ounchecked` |
|---|---|---|---|
| `precondition` | 132, message printed | 132, **stderr empty** | **0**, `listening on 70000` |
| `assert` | 132, message printed | **0**, `listening on 70000` | **0**, `listening on 70000` |
| `fatalError` | 132, message printed | 132, message printed | 132, message printed |
| `Int.max - 2 + port` | 132 | 132 | **0**, prints `-9223372036854705811` |
| `[1,2,3][port]` | 132 | 132 | **139** (SIGSEGV) |
| `Int(UInt64 = 2^63)` | 132 | 132 | **0**, prints `-9223372036854775808` |

Consequences: (1) `assert` never validates input; (2) `-Ounchecked` converts every trap in this document into silent wrap-around or memory unsafety, so the conversion rule is only as strong as the absence of that flag; (3) `fatalError` is the only primitive that survives all three modes, which is why SwiftPM reviewers asked an author to replace `preconditionFailure` with `fatalError` or a throw on an unreachable branch ([swift-package-manager#10497 review comment](https://github.com/swiftlang/swift-package-manager/pull/10497#discussion_r3935124586), 2026-09-04, merged 2026-10-05 with `fatalError`). Corpus: 0 of 40 exemplars pass `-Ounchecked` in a manifest, workflow, script or Bazel file (`grep -rn -e 'Ounchecked' ...` over `--include='Package*.swift' --include='*.yml' --include='*.bzl' --include='BUILD.bazel'` returned nothing; widened to `*.yaml`, `*.sh`, `*.bazelrc`, `Makefile`, `*.bazel`: still 0).

### 3. The three 2026 advisories

All three fetched with `gh api repos/<owner>/<repo>/security-advisories/<GHSA>`; fix commits resolved from the git history.

| Advisory | Shape | Fix | Note |
|---|---|---|---|
| [GHSA-qcc5-f287-vgmq](https://github.com/apple/swift-nio/security/advisories/GHSA-qcc5-f287-vgmq) / CVE-2026-43678, high, published 2026-07-09 | `WebSocketFrameDecoder` used trapping `Int(_:)` on the 8-byte extended payload length; "The trap fired before `maxFrameSize` validation, so no configuration could mitigate it, and `ByteToMessageDecoder` cannot catch a runtime trap." PoC `81 7F 80 00 00 00 00 00 00 00 00`. | PR [apple/swift-nio#3603](https://github.com/apple/swift-nio/pull/3603), merge commit `4e370dc4d750` (parent `d20fa05a645c`), merged 2026-05-26. Advisory text says "now uses `Int(exactly:)`"; the merged diff is `guard lengthQWord <= UInt64(Int.max) else { throw NIOWebSocketError.invalidFrameLength }` followed by `Int(lengthQWord)`, plus a regression test with length `0x8000000000000001`. | Both are valid spellings; `Int(exactly:)` needs no separate guard. Patched in 2.101.0 per the advisory (`<= 2.100.0` vulnerable). |
| [GHSA-r3rc-9hpw-54v9](https://github.com/apple/swift-nio/security/advisories/GHSA-r3rc-9hpw-54v9) / CVE-2026-43671, high, published 2026-05-21 | `ByteBuffer._toIndex` and `_toCapacity` used `UInt32(truncatingIfNeeded:)`. "a value of `UInt32.max + 1` (0x100000000) would be truncated to `0`"; affected `copyBytes(at:to:length:)` and `writeWithUnsafeMutableBytes(minimumWritableBytes:)` (out-of-bounds write), and `moveReaderIndex`/`moveWriterIndex`/`ByteBuffer(takingOwnershipOf:)` (logic errors). "In debug builds ... `truncatingIfNeeded` occurs before the assertion checks the (already-truncated) value, so even assertions may not reliably catch the issue." | Commit [`87f935b70c5e`](https://github.com/apple/swift-nio/commit/87f935b70c5ed41e45d7e3be3cd39f122d872da3) (parent `dd16365724d5`): both helpers become `UInt32(value)` ("traps on overflow in both debug and release builds, converting a potential silent memory corruption into a deterministic crash"); the single call site in `getSlice(at:length:)` keeps `truncatingIfNeeded` with a comment citing the preceding bounds checks. Patched in 2.100.0. | Upstream chose a trap, not a throw, inside a low-level primitive whose callers are documented as responsible for validation (finding 8). Advisory states exploitation is a "high bar" because lengths are mostly derived from protocol parsing. |
| [GHSA-62cf-93wq-244m](https://github.com/hummingbird-project/hummingbird/security/advisories/GHSA-62cf-93wq-244m) / CVE-2026-97697, high, published 2026-08-17 | `FileMiddleware` built `ClosedRange<Int>` from `Range: bytes=5-2` with no `lower <= upper` check; "will cause a precondition in the `ClosedRange` initialiser and abort the application process"; "Remotely-triggerable denial of service via reachable assertion / uncaught runtime trap"; no workaround. | Patched in 2.26.0 ("verifying the Range header bounds are valid before using them"). Corpus at `1bd3b407fb47` shows the guard: `Sources/Hummingbird/Middleware/FileMiddleware.swift:394-396` `guard let lowerBound = Int(lower), let upperBound = Int(upper), lowerBound <= upperBound`. | Reproduced locally with `range-trap`: exit 132; the `lower <= upper` guard twin exits 0. |

A related non-vulnerability sharpens the contract: swift-nio commit [`53ac1ccab23f`](https://github.com/apple/swift-nio/commit/53ac1ccab23f24e18054a94c3b4ea772fc2d856c) (#3659) documents that `setBytes(_:at:)`, `setInteger(_:at:)` and `setString(_:at:)` "trap on an invalid index by design, unlike the `get*` family, which validates via `rangeWithinReadableBytes` and returns `nil` instead", after a report (GHSA-ffw9-jrfx-pfvc) was closed as working-as-intended. The fix was a `- Precondition:` doc note telling callers to validate externally derived indices.

Dates differ between the global advisory feed and the repository advisories for CVE-2026-43671 (`published_at` 2026-06-12 vs 2026-05-21); this document uses the repository dates.

### 4. Integer conversions: the initializer family

From the stdlib ([Integers.swift](https://raw.githubusercontent.com/swiftlang/swift/main/stdlib/public/core/Integers.swift)) and SE-0104 ([improved integers](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0104-improved-integers.md)):

| Spelling | Behaviour | Use for untrusted input |
|---|---|---|
| `T(_ source:)` | "Passing a value that can't be represented in this type results in a runtime error" (`Integers.swift`, doc of `init<T: BinaryInteger>(_:)`) | No |
| `T(exactly:)` | `nil` if not representable | Yes, then `throw` |
| `T(clamping:)` | saturates to `T.min`/`T.max` | Only when saturation is the specified semantics (for example a size hint capped at a limit) |
| `T(truncatingIfNeeded:)` | keeps low bits; SE-0104: its two use cases are "intentional truncation and optimizing out range checks that are known by the programmer to be un-needed" | Never on a value that has not been range-proven |
| `T(bitPattern:)` | reinterpret same-width | Hashing and C interop only |
| `Int(d)` for `Double` | traps on NaN, infinity and out of range; silently truncates fractions | No: use `Int(exactly:)` or range-check |

Swift Forums explain the design: the unlabelled form is the "explicit cast", and "Swift uses the word 'safe' to mean 'memory safe'. Crashing at runtime does not make something un-memory-safe" ([forum 50594](https://forums.swift.org/t/why-does-swift-allow-you-to-initialise-an-int-with-a-uint64/50594), 2021-07-21, Karl and xwu); SE-0458 states the same policy ("Dynamic checks are sometimes necessary and are still acceptable, so long as the failure can't escalate into a memory safety problem", [SE-0458](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0458-strict-memory-safety.md), Swift 6.2). Trapping is therefore the language's memory-safety mechanism and it is correct inside a library for invariants; it is a denial-of-service when the trapped value came from a peer. `truncatingIfNeeded` is the case where the dynamic check is bypassed, so memory safety is lost (finding 5).

Reproduction (a), `pkg/Sources/ared` vs `agreen`, driver `inside.sh`:

```
ared 8000000000000000  debug: exit 132  "Swift/Integers.swift:3641: Fatal error: Not enough bits to represent the passed value"
ared 8000000000000000  -O:    exit 132  (stderr empty)
ared 7fffffffffffffff  both:  exit 0    "frame length 9223372036854775807"   (boundary is exactly 2^63)
ared 8000000000000000  -Ounchecked: exit 0 "frame length -9223372036854775808"
agreen 8000000000000000 both: exit 65   "error: invalidFrameLength(9223372036854775808)"
agreen 10               both: exit 0    "frame length 16"
```

### 5. truncatingIfNeeded: wrong index and silent out-of-bounds write

Fixture `bred` mirrors `ByteBuffer.writeWithUnsafeMutableBytes(minimumWritableBytes:)`: `let need = UInt32(truncatingIfNeeded: minimumWritableBytes)`, a `precondition(need <= 1 << 20)` that passes on the wrapped value, a 16-byte allocation, and a callback that `memcpy`s 64 bytes into the promised region. Input `4294967312` (`2^32 + 16`):

| Build | `bred write 4294967312` | `bgreen write 4294967312` | `bnio` (`UInt32(_:)`, the upstream fix) |
|---|---|---|---|
| debug 6.4.0 | exit 134, `malloc(): unaligned tcache chunk detected` | exit 65, `error: lengthOutOfRange(4294967312)` | exit 132, `Not enough bits to represent the passed value` |
| debug 6.3.3 | exit 139 (SIGSEGV), no message | exit 65 | exit 132 |
| release `-O` (both) | **exit 0**, `wrote 64 bytes into a 16-byte allocation` | exit 65 | exit 132 |
| release + `--sanitize=address` (both) | **exit 1**, AddressSanitizer report below | exit 65 | exit 132 |

```
==7==ERROR: AddressSanitizer: heap-buffer-overflow on address 0x7b208ebe0050 ...
WRITE of size 64 at 0x7b208ebe0050 thread T0
    #1 ... bred/main.swift:39:9
0x7b208ebe0050 is located 0 bytes after 16-byte region [0x7b208ebe0040,0x7b208ebe0050)
```

The wrong-index variant (`Int(UInt32(truncatingIfNeeded: 4294967299))`) prints `slot 3` with exit 0 in debug, release and ASan: a silently wrong value that no sanitizer sees. `bgreen index 4294967299` exits 65; `bgreen index 3` still exits 0 with `slot 3`.

Take-aways: (1) the corruption is not reliably visible without ASan: release exits 0, and the two debug toolchains crash differently; (2) the ordering bug is the real cause: truncate, then check; the check must run on the untruncated `Int`; (3) the advisory's own "workaround" is the rule: validate against `UInt32.max` before calling.

### 6. Force operations: what each tool really does

Fixture trees `lint/red` (`Decode.swift` with `try!`, `as!`, `cfg.name!`, `var token: String!`, plus `Helpers/Helper.swift` that imports `Testing` and does `v!`), `lint/green` (guard-let twin), `lint/tests` (Swift Testing and XCTest files with `!` and `try!`), `lint/carve` (literal carve-outs). Script `lint.sh`; logs `lint-6.4.log`, `lint-6.3.log` (identical exit codes).

| Behaviour | SwiftLint 0.65.1 | swift-format (6.4 bundled; 6.3.3 bundled) |
|---|---|---|
| Rule ids | `force_cast` (default on, severity error), `force_try` (default on, error), `force_unwrapping` (opt-in, warning) | `NeverForceUnwrap` (covers `!` and `as!`), `NeverUseForceTry`, `NeverUseImplicitlyUnwrappedOptionals`; all opt-in, "linter-only" |
| Red tree | exit 2: `force_cast` and `force_try` errors, `force_unwrapping` warning (4 findings incl. the `Testing`-importing helper) | `--strict` exit 1: `[NeverUseImplicitlyUnwrappedOptionals] use 'String' or 'String?' instead of 'String!'`, `[NeverUseForceTry] do not use force try`, `[NeverForceUnwrap] do not force cast to 'Int'`, `[NeverForceUnwrap] do not force unwrap 'cfg.name'` (4 findings, the `Testing`-importing helper is silent); without `--strict`: exit 0 |
| Green twin | exit 0 (also `--strict`) | exit 0 (also non-strict) |
| Test files (`import Testing` or `import XCTest`) | fire (`force_try` error, `force_unwrapping` warning) unless a nested `tests/.swiftlint.yml` sets `disabled_rules: [force_try, force_unwrapping]`: then exit 0 (observed: with an explicit `--config` the nested file was not applied and the test files fired) | silent: "This rule does not apply to test code, defined as code which: Imports a supported test library; The function is marked with `@Test` attribute" (`swift-format@b15dd59fad21:Sources/SwiftFormat/Rules/NeverForceUnwrap.swift:17`, library list `XCTest`, `Testing` at `Core/ImportsAnyTestingLibrary.swift:17-18`) |
| Literal carve-out | `force_unwrapping` ignores `URL(string:)`, `NSURL(string:)`, `UIImage(named:)`, `NSImage(named:)`, `Data(hexString:)` when every argument is a static string literal (`ignored_literal_argument_functions`, `Source/SwiftLintBuiltInRules/Rules/RuleConfigurations/ForceUnwrappingConfiguration.swift:8-14`); fixture: unannotated `URL(string: "https://example.com/v2/")!` is silent; `try! NSRegularExpression(pattern: "^[a-z]+$")` fires | none; `URL(string: "literal")!` fires |
| Inline suppression | `// swiftlint:disable:this force_unwrapping`, `// swiftlint:disable:next force_try`: both silent | `// swift-format-ignore: NeverForceUnwrap` and `// swift-format-ignore: NeverUseForceTry` on the preceding line: silent. The rule text says force unwraps "must be documented" ([RuleDocumentation.md](https://raw.githubusercontent.com/swiftlang/swift-format/main/Documentation/RuleDocumentation.md)) but the tool does not check for a reason |
| IUO | not covered by these three rules | `NeverUseImplicitlyUnwrappedOptionals` skips `@IBOutlet` (`Rules/NeverUseImplicitlyUnwrappedOptionals.swift:45-47`) |

Neither tool understands intent: swift-format's own comment says the rules are opt-in because "there are valid contexts for force unwrap where it won't crash. This rule can't evaluate the context around the force unwrap to make that determination." That is why the carve-out must be an explicit, justified annotation (rule E4).

`try!` is legitimate for resources the program ships: TSPL's own example is `try! loadImage(atPath: "./Resources/John Appleseed.jpg")` because "no error will be thrown at runtime" ([ErrorHandling.md](https://raw.githubusercontent.com/swiftlang/swift-book/main/TSPL.docc/LanguageGuide/ErrorHandling.md), "Disabling Error Propagation"). The compile-checked alternative for regular expressions is a regex literal (`let ok = /^[a-z]+$/`, compiles in the carve fixture, no `try`).

Corpus adoption (read-only measurement over the 24 `.swift-format` files in the 40 exemplars): `NeverForceUnwrap` is `true` in 4 (containerization, container, swift-argument-parser, swift-embedded-examples), `false` in 18, unset in 2 (swift-build, JavaScriptKit); the same split holds for the other two rules. SwiftLint: only element-x-ios (`.swiftlint.yml:9`) and SwiftLint itself (`.swiftlint.yml:31`) opt into `force_unwrapping`.

Enabled is not enforced. `apple/containerization@3e7bc39e66b3` has `"NeverForceUnwrap" : true` at `.swift-format:35-37`, but `Makefile:505` gates with `swift format lint --recursive --strict --configuration .swift-format-nolint`, and `.swift-format-nolint:35-37` sets all three `false`. Running the bundled 6.4 swift-format over `Sources` with the repo's own `.swift-format` (read-only `swift format lint -r Sources -p`) gave 57 `NeverForceUnwrap`, 5 `NeverUseForceTry`, 1 `NeverUseImplicitlyUnwrappedOptionals` findings for containerization and 38 / 8 / 0 for `apple/container@f70ecbb926d9`, whose lint gate has the same shape (`Makefile:402` formats with `.swift-format`, `Makefile:406` lints with `.swift-format-nolint`). `apple/swift-argument-parser@efd239f0055b` is the contrast: rules on, `swift format lint --strict -r Sources` exits 0, and its 25 `// swift-format-ignore: NeverForceUnwrap|NeverUseForceTry` annotations carry the exceptions (for example `Sources/ArgumentParser/Parsing/SplitArguments.swift:331`, followed by the comment `// I don't know why this is safe`: the annotation exists, the reason is a confession).

### 7. Tests and force operations

Measured in `exittest/` (Swift Testing, `swift test`, 6.4.0 and 6.3.3):

```
nil + try #require(x):  exit 1, "✘ Test requireRecordsAnIssueInsteadOfCrashing() recorded an issue ... Expectation failed",
                        the other test still reports "✔ ... passed", final "✘ Test run with 3 tests in 1 suite failed" printed
nil + x!:               "Fatal error: Unexpectedly found nil while unwrapping an Optional value",
                        "*** Program crashed: Illegal instruction", swift test exit 1, the "Test run with ..." summary line never printed
non-nil:                "✔ Test run with 3 tests in 1 suite passed", exit 0
```

So tests are exempt from the lint (swift-format by import, SwiftLint by nested config) and the exemption is deliberately generous, but `!` in a test turns one failed expectation into a crashed run that hides every later result. Preferred spellings: `try #require(optional)` (Swift Testing) and `try XCTUnwrap(optional)` (XCTest). `try!` in tests is acceptable for literal fixtures.

Trap contracts are testable. ST-0008 exit tests (Implemented in Swift 6.2): `await #expect(processExitsWith: .failure) { _ = lengthTrapping(1 << 63) }` passed (4 tests, exit 0); pointing the same expectation at the throwing function (`RED_CONTROL=true`) failed with `Expectation failed: expected exit status ".failure", but ".exitCode(EXIT_SUCCESS)" was reported instead` and exit 1. The throw path is `#expect(throws: FrameError.invalidFrameLength(1 << 63)) { try lengthChecked(1 << 63) }`.

### 8. precondition vs throw vs fatalError vs assert

Primary statements:
- TSPL, [The Basics, Assertions and Preconditions](https://raw.githubusercontent.com/swiftlang/swift-book/main/TSPL.docc/LanguageGuide/TheBasics.md): "assertions and preconditions aren't used for recoverable or expected errors. Because a failed assertion or precondition indicates an invalid program state, there's no way to catch a failed assertion"; "Assertions are checked only in debug builds, but preconditions are checked in both debug and production builds."
- [ErrorHandlingRationale.md](https://raw.githubusercontent.com/swiftlang/swift/main/docs/ErrorHandlingRationale.md), "Logic failures": out-of-bounds access and forced unwrap of `nil` are programmer mistakes, "the failure should be handled by fixing the code, not by attempting to recover dynamically"; and: "Tearing down the process can be viewed as a vector for a denial-of-service attack. However, an assertion failure might indicate that the process has been corrupted and is under attack, and limping on anyway may open the system up for other, more serious forms of security breach." It calls recoverable logic failures "an open question".
- Practice, from the SwiftNIO maintainer: "we should only use precondition/fatalError when it would leave the program in a bad state ... Most of the times throwing an error and gracefully handling it is the right approach. Especially in server applications where any precondition/fatalError that is triggered by user input can lead to denial of service attacks" ([forum 74386](https://forums.swift.org/t/fatalerror-without-a-way-to-intercept-it-is-harmful-on-the-server/74386), 2024-09-05, FranzBusch; same thread: Fluent's `fatalError` on an unloaded relationship should "throw instead of trapping", and Fluent 5 is planned to have "far fewer places that will crash").

Decision table (what the rules below encode):

| Condition | Mechanism | Why |
|---|---|---|
| value came from outside the process (argv, env, file, network, JSON, manifest, FFI return) | `throw` a typed error (`throws(E)`, SE-0413, Swift 6.0) at the boundary | a trap kills every connection or loses a half-written state; reachable-assertion is the CVE class |
| internal invariant this module established (state-machine impossible state, table built from literals) | `fatalError("...")`, or `precondition` with `// invariant: <why>` | survives every build mode only with `fatalError` |
| documented caller contract of a public API | `precondition` + `- Precondition:` doc line + a non-trapping sibling where inputs may be external | the NIO `set*(at:)` / `get*` split |
| debug-only developer sanity check | `assert` | compiled out of `-O` and `-Ounchecked` |
| nil that "cannot happen" | `guard let ... else { throw }` or, if truly an invariant, `fatalError` with the reason | `!` leaves no reason in the crash output (`-O` prints nothing) |

### 9. CLI exit codes for bad input

The fleet CLI contract ([rules/rust-quality/cli-contract.md](../../../rules/rust-quality/cli-contract.md), table "Exit-Code Table (pinned)") assigns 64 `UsageError` and 65 `DataError` and reserves 128+N for a forwarded child signal only. The Swift analogue measured here:

| Case | Exit | stderr | stdout |
|---|---|---|---|
| `dgreen x 70000` (typed `UsageError`, `exit(64)`) debug and `-O` | 64 | `error: port out of range: 70000 (expected 1...65535)` | empty |
| `dred precondition 70000` debug | 132 | `dred/main.swift:8: Precondition failed: port out of range: 70000` + stack trace | `starting` lost (stdout is not a tty) |
| `dred precondition 70000` `-O` | 132 | empty (with `SWIFT_BACKTRACE=enable=no`) | `starting` lost |
| `dred fatalError 70000` `-O` | 132 | `Fatal error: port out of range: 70000` | `starting` lost |
| `dred assert 70000` `-O` | 0 | none: the program continues and prints `listening on 70000` | |
| `dgreen x 2`, `dred precondition 2` | 0 | | `listening on 2` |

`apple/swift-argument-parser` maps validation failure to `EX_USAGE` (64) on Unix, `ERROR_BAD_ARGUMENTS` on Windows, and `EXIT_FAILURE` on WASI (`swift-argument-parser@efd239f0055b:Sources/ArgumentParser/Utilities/Platform.swift:155-162`; Windows and WASI branches are unverified: read only). A hand-rolled Swift CLI must reproduce 64/65 itself; whether `main` should call `exit()` or return an `ExitCode` belongs to the cli-contract dive, not this one.

### 10. Row ownership: errors.md or security.md

Decision: split by subject, with one cross-reference each.

- M-C-05 (force operations) and M-C-06 (`fatalError`/`precondition` vs `throw`, exit codes) go to `errors.md` (SW-ERR). Precedent: rust-quality keeps panic policy and `unwrap_used`/`expect_used` (ERR-09, ERR-10) and "never assign 101 or 128+ to a modeled error path" (ERR-15) in `errors.md`.
- M-I-01 (trapping conversions on untrusted integers) and M-I-02 (`truncatingIfNeeded`) go to `security.md` (SW-SEC). Precedent: rust-quality `security.md` SEC-30 (checked arithmetic where an attacker-declared length or offset is combined with another value, and the warning against "fixing" overflow with a truncating `as` cast). The Swift twist is the inversion: in Rust `as` truncates silently and overflow wraps in release; in Swift `T(_:)` and `+` trap in every optimised build and the silent wrap is the `truncatingIfNeeded` / `&+` / `-Ounchecked` family.
- `errors.md` gets one line "external integers: see SW-SEC conversion rules" under the throw-vs-trap rule; `security.md` gets one line "a thrown error, not a trap, at the parser boundary: see SW-ERR throw rule". A reviewer editing a parser loads `security.md` by subject ("parsing untrusted integers"); a reviewer editing an error path loads `errors.md`.

### 11. Checks that did not discriminate

- **`-strict-memory-safety` (SE-0458, Swift 6.2)** does not separate the red (b) fixture from its twin: `swiftc -swift-version 6 -strict-memory-safety -typecheck` reports 14 warnings for `bred` and 14 for `bgreen`, because both use `UnsafeMutablePointer`. It marks the unsafe boundary; it does not know the length is wrong. Script `sms.sh`.
- **SwiftLint `custom_rules`** (the vehicle the topic map assigns for banned-pattern greps) cannot be proven here: the static 0.65.1 binary prints `warning: Skipping enabled rule 'custom_rules' because it requires SourceKit and SourceKit access is prohibited.` on every run, with and without `LINUX_SOURCEKIT_LIB_PATH=/usr/lib`. Fixture `custom/.swiftlint.yml` and `custom.sh`: red = exit 0 on the violation. The greps below are proven; a `custom_rules` mirror of them is `unverified: not runnable here`.
- **The brief's exemplar `element-x-ios@14e33866ced2:ElementX/Sources/Screens/JoinRoomScreen/JoinRoomScreenViewModel.swift:413`** is a fire-and-forget `Task { await self.declineInvite() }` (cited by the concurrency audit), not a force operation. The element-x force-operation evidence is its `.swiftlint.yml:9` opt-in and the 9 `try!` plus 7 `swiftlint:disable ... force_unwrapping` in `ElementX/Sources`.

## Normative guidance candidates

Provisional IDs carry the family prefix named by the topic map (SW-ERR in `errors.md`, SW-SEC in `security.md`). "Run" says whether the verification was watched red on a planted violation and green on a twin; fixture paths are relative to `/home/mherwig/.cache/research-lang/swift-tools/fixtures/traps-and-unwraps/`. In every grep, output is the violation; empty output is a pass. `Sources` stands for the directory under review.

### errors.md (SW-ERR)

**E1. No `!`, `try!`, `as!` or `T!` declarations in non-test code.** Rationale: each is a trap on a value the compiler could not prove (3,364 `!`, 620 `try!`, 378 `as!`, 209 IUO in 40 exemplars' production code); a trap on peer-derived data is a remote crash. Verify: `swift format lint --strict --configuration .swift-format -r Sources` with `NeverForceUnwrap`, `NeverUseForceTry`, `NeverUseImplicitlyUnwrappedOptionals` set to `true` in that file (exit 1 on a finding; without `--strict` it exits 0). Cheap fallback with a directory operand: `grep -rn --include='*.swift' -e 'try!' -e ' as! ' Sources`. Run: **yes** (`lint/red` exit 1, `lint/green` exit 0, 6.3.3 and 6.4.0; grep: `pkg/Sources/cred` 3 lines, `cgreen` 0).

**E2. The lint config that enables the three swift-format rules is the config the gate reads.** Rationale: the rules are lint-only and off by default; `containerization` enables them in `.swift-format` and gates with `.swift-format-nolint` where they are `false`. Verify, three commands, output lists every config that does not enable the rule: `grep -rL --include='.swift-format*' -e '"NeverForceUnwrap" *: *true' .`, `grep -rL --include='.swift-format*' -e '"NeverUseForceTry" *: *true' .`, `grep -rL --include='.swift-format*' -e '"NeverUseImplicitlyUnwrappedOptionals" *: *true' .`; then confirm by reading the gate command that it passes the listed-clean file. Run: **yes** (`cfg/red` listed 3 times, `cfg/green` empty; real `containerization` lists `.swift-format-nolint` 3 times; real `swift-argument-parser` empty).

**E3. If SwiftLint is the linter, `force_cast` and `force_try` stay at their default error severity and `force_unwrapping` is opted in at severity error, and the run uses `--strict`.** Rationale: `force_unwrapping` is opt-in and only a warning, so a tree whose only violation is `value!` exits 0 without `--strict`; `--strict` promotes it to error and exits 2 (observed on `lint/warnonly`). `force_cast` and `force_try` exit 2 either way. Verify: `swiftlint lint --strict --quiet Sources` (exit 2 on any finding). Config: `opt_in_rules: [force_unwrapping]` and `force_unwrapping: {severity: error}`. Run: **yes** (`lint/red` exit 2 and `lint/green` exit 0 with `--strict`; `lint/warnonly` `value!` alone: exit 0 without, exit 2 with `--strict`; the `severity: error` config override itself was not run: unverified).

**E4. A force operation that survives review is a static-literal initialiser with its reason on the line above it.** Form: `// swift-format-ignore: NeverForceUnwrap` then a comment stating the invariant, or `// swiftlint:disable:next force_unwrapping` plus the reason. Prefer a compile-checked form: a regex literal (`/^[a-z]+$/`) instead of `try! NSRegularExpression(pattern: "...")`. Never on a decoded, parsed, looked-up or user-supplied value. Rationale: the tools cannot see intent and swift-format's own text says force unwraps "must be documented". Verify: `grep -rn -A1 --include='*.swift' -e 'swift-format-ignore: Never' -e 'swiftlint:disable:next force_' Sources` then read that each hit is followed by a comment line stating the invariant (named reading heuristic: "the next line explains why it cannot fail"). Run: **partly**: suppression itself yes (`lint/carve`: annotated lines silent in both tools, unannotated `try!` and `URL(...)!` fire in swift-format); the reason-present check is a reading heuristic, no.

**E5. Test code is exempt from E1 and E3 but uses `try #require(x)` / `try XCTUnwrap(x)` instead of `!`.** Rationale: swift-format exempts files importing `XCTest` or `Testing` automatically, SwiftLint needs a nested `Tests/.swiftlint.yml` disabling `force_try` and `force_unwrapping`; a `!` on nil crashes the run and drops the summary. Verify: `grep -rn --include='*.swift' -e 'try!' -e ' as! ' Tests` as a SHOULD-level list (not a gate; not run on a Tests tree); the exemption itself: `swiftlint lint --strict --quiet Tests` exits 0 with the nested config. Run: **yes** (`lint/tests` exit 0 for both tools; `exittest/` `unwraptest.sh`: `#require` finishes the run, `!` crashes it).

**E6. Input from outside the process is validated by throwing a typed error; `precondition`, `preconditionFailure`, `assert` and `fatalError` never guard it.** Rationale: a trap cannot be caught, kills all concurrent work and is the shape of CVE-2026-97697 and CVE-2026-43678. Verify: `grep -rn --include='*.swift' -e 'precondition' -e 'fatalError(' -e 'assert(' Sources | grep -v -e 'invariant:'` run over the CLI, parser, decoder, router and middleware target directories; every remaining line is a finding. Run: **yes** (`pkg/Sources/dred` 4 lines, `dgreen` 0 with its `// invariant:` annotated precondition).

**E7. `assert` is never validation.** Rationale: it is a no-op in `-O` and `-Ounchecked`; measured `dred assert 70000` exits 0 and prints `listening on 70000` in release. Verify: same grep as E6 (it includes `assert(`); also the build-mode table in finding 2. Run: **yes** (release exit 0 on the violation; `dgreen` exit 64).

**E8. `fatalError` marks unreachable states; `precondition` is reserved for a documented caller contract and carries `// invariant: <why>` or a `- Precondition:` doc line.** Rationale: `precondition` vanishes under `-Ounchecked`, `fatalError` does not; trap-by-design public APIs must say so (NIO `set*(at:)`). Verify: the E6 grep (unannotated hits) plus review reading "each public `precondition` has a `- Precondition:` doc line". Run: **yes** for the grep and the `-Ounchecked` behaviour; the doc-line half is a reading heuristic, no.

**E9. Never compile with `-Ounchecked`.** Rationale: it removes `precondition`, makes `Int.max - 2 + 70000` print `-9223372036854705811`, makes `Int(2^63)` print `-9223372036854775808`, and out-of-range indexing a segfault (139). Verify: `grep -rn --include='Package*.swift' --include='*.yml' --include='*.yaml' --include='*.sh' --include='*.bzl' --include='BUILD.bazel' --include='*.bazelrc' -e 'Ounchecked' .` Run: **yes** (`flags/red` 2 lines: `Package.swift` `unsafeFlags(["-Ounchecked"])` and `ci.yml`; `flags/green` 0; the 40-repo corpus 0).

**E10. A CLI maps bad invocation to exit 64 and bad data to exit 65 through a typed error; a trap is never a status (132, 134, 139 are not in any documented table).** Rationale: crash codes are signal numbers that differ per CPU and build, stderr after a trap is a 47-line backtrace by default, and buffered stdout is lost. Verify: an integration test that runs the built binary with `--port 70000` and asserts exit 64, empty stdout, stderr containing `error:` and not `Fatal error`; one-shot form `.build/debug/dgreen x 70000; echo "exit=$?"` expects `exit=64`. Run: **yes** (`dgreen` 64 vs `dred` 132, both toolchains).

**E11. A documented trap and a documented throw are each covered by a test.** Throw: `#expect(throws: E.case) { try f(bad) }`. Trap: `await #expect(processExitsWith: .failure) { _ = f(bad) }` (Swift Testing, Swift 6.2+; XCTest has no equivalent). Verify: `grep -rn --include='*.swift' -e 'processExitsWith' Tests` is non-empty for every module that documents a `- Precondition:` (named reading heuristic: documented traps count equals exit tests). Run: **yes** (`exittest/` green exit 0, red control exit 1, 6.3.3 and 6.4.0).

**E12. A public API that traps on a bad argument says so (`- Precondition:`) and any API reachable with external values has a non-trapping sibling (`get*` returning `nil`, a `throws` overload).** Rationale: swift-nio `get*`/`set*` asymmetry produced a spurious advisory until documented. Verify: named reading heuristic: every `public` function containing `precondition(` has a `- Precondition:` line in its doc comment. Run: no, reading heuristic only.

### security.md (SW-SEC)

**S1. An integer that arrives from outside the process is held in the type it arrived as and converted with `T(exactly:)`, throwing on `nil`; or compared with a limit before any `T(_:)`; `T(clamping:)` only where saturation is the specified behaviour.** Rationale: `Int(UInt64 >= 2^63)` is CVE-2026-43678; the fix fires before the size limit, so the conversion is the first validation. Verify: `find Sources -name '*.swift' -print0 | xargs -0 -r grep -H -n -e '\bU\?Int[0-9]*([a-zA-Z_.]*[lL]en' -e '\bU\?Int[0-9]*([a-zA-Z_.]*[sS]ize' -e '\bU\?Int[0-9]*([a-zA-Z_.]*[oO]ffset' -e '\bU\?Int[0-9]*([a-zA-Z_.]*QWord' -e '\bU\?Int[0-9]*([a-zA-Z_.]*[hH]eader' | grep -v -e 'exactly:' -e 'clamping:' -e 'truncatingIfNeeded:' -e 'bitPattern:' -e 'bounded:' -e 'radix:' -e '\.count)'`; resolve each hit by switching to `exactly:` or by adding `// bounded: <why it fits>` on the same line. Run the grep on changed files in a PR, not as a whole-tree gate: it is name-based and flags widening conversions. Run: **yes** (`pkg/Sources/ared` 1 line, `agreen` 0; real pre-fix swift-nio `WebSocketFrameDecoder.swift` 10 lines including `Int(lengthQWord)`; noise on whole corpus trees: swift-nio 79, containerization 124, container 32, protobuf 29, vapor 7, async-http-client 4, hummingbird 0, swift-argument-parser 0).

**S2. `Int(_ double:)` and a `ClosedRange`/`Range` built from untrusted bounds are guarded: `Int(exactly:)` for floats, `lower <= upper` (and bounds against the container size) before `lower...upper`.** Rationale: NaN, infinity and out-of-range exit 132; `5...2` is CVE-2026-97697. Verify: named reading heuristic: "every `a...b` and `a..<b` whose bounds are parsed from input is preceded by a comparison of `a` and `b` in the same function"; runtime proof by the exit-test in E11. Run: **runtime yes** (`range-trap` 132, `range-safe` 0, `double-trap` 132, `double-safe` 0); the heuristic itself no.

**S3. `T(truncatingIfNeeded:)` appears only where the value is already proven to fit or is intentionally masked, with `// truncate-ok: <why>` on the same line.** Rationale: SE-0104 names those as its only two uses; on an unproven value it wraps, passes the bounds check, and corrupts memory in release. Verify: `grep -rn --include='*.swift' -e 'truncatingIfNeeded' Sources | grep -v -e 'truncate-ok:'`. Run: **yes** (`pkg/Sources/bred` 3 lines, `bgreen` 0 with a marked mask carve-out; real pre-fix swift-nio core 2 lines; ASan red: `bred write` exit 1 `heap-buffer-overflow`, `bgreen write` exit 65; release without ASan exit 0).

**S4. Arithmetic on an untrusted value uses `addingReportingOverflow`, `multipliedReportingOverflow` or a pre-check against the limit; `&+`, `&-`, `&*` carry `// wrap-ok: <why>`.** Rationale: `+` traps in `-O` (exit 132) and wraps silently with `&+` (prints `-9223372036854775808`); neither is acceptable for an attacker-controlled sum, but only the trap is a defined failure. Verify: `grep -rn --include='*.swift' -e ' &+ ' -e ' &- ' -e ' &\* ' Sources | grep -v -e 'wrap-ok:'`. Run: **yes** (`extra/traps.swift:25` 1 line; clean twins 0; `add-trap` 132, `add-safe` prints `overflow`, `wrap-add` exit 0).

**S5. Convert and bound before using a size: the conversion rule runs before the configured limit check, not after, and an allocation or copy uses only the converted, bounded value.** Rationale: the CVE-2026-43678 trap fired "before `maxFrameSize` validation, so no configuration could mitigate it"; CVE-2026-43671 passed its precondition on the truncated value. Verify: named reading heuristic: in every decoder, the first statement after reading a length field is a throwing conversion, the second is the `maxSize` comparison. Run: no, reading heuristic only (the order bug is shown in `bred`: precondition on the wrapped value passes).

**S6. Code that combines unsafe pointers with an externally derived size has a test run under AddressSanitizer.** Rationale: the release build of the red fixture exits 0 after a heap overflow and the two debug toolchains crash differently; only ASan makes it deterministic. Verify: `swift test --sanitize=address` (or `swift build -c release --sanitize=address` and run the binary with the hostile input) exits non-zero on the violation. Run: **yes** (`asan.sh`: `bred` exit 1 with the report above, `bgreen` exit 65, both toolchains).

**Routing note (not a rule):** E1-E12 belong in `errors.md`, S1-S6 in `security.md`; E6 and S1 cross-reference each other. Hit counts above come from the planted fixtures; grep results on real trees are inventories, so apply S1-S3 to the files a change touches.

## Verification runs

All commands run from `/home/mherwig/.cache/research-lang/swift-tools/fixtures/traps-and-unwraps/` unless a path is given. `run.sh` is `/home/mherwig/.cache/research-lang/swift-tools/run.sh`; prefix `SWIFT_VERSION=6.3` for 6.3.3. Logs are stored beside the scripts. 6.3.3 reproduced every exit code below except where a row says otherwise.

### Runtime fixtures (script `inside.sh`, logs `run-6.4.log`, `run-6.3.log`)

Command: `../../run.sh bash inside.sh 6.4` (and `SWIFT_VERSION=6.3 ../../run.sh bash inside.sh 6.3`). It builds `pkg` four ways (`swift build --scratch-path "$SWIFT_SCRATCH/traps-and-unwraps-debug"`, `swift build -c release --scratch-path "$SWIFT_SCRATCH/traps-and-unwraps-rel"`, `swift build -c release --scratch-path "$SWIFT_SCRATCH/traps-and-unwraps-asan" --sanitize=address`, `swift build -c release --scratch-path "$SWIFT_SCRATCH/traps-and-unwraps-unchecked" -Xswiftc -Ounchecked`) and runs each binary with `SWIFT_BACKTRACE=enable=no`.

| Check | Violation (red) | Compliant twin (green) | Relevant output |
|---|---|---|---|
| (a) `Int(UInt64 2^63)` vs `Int(exactly:)` | `ared 8000000000000000`: **132** debug and `-O`; **0** with wrong value under `-Ounchecked` | `agreen 8000000000000000`: **65**; `agreen 10`: **0** | red `Swift/Integers.swift:3641: Fatal error: Not enough bits to represent the passed value`; green `error: invalidFrameLength(9223372036854775808)`; boundary `ared 7fffffffffffffff` exit 0 |
| (b) wrong index | `bred index 4294967299`: **0**, `slot 3` (silently wrong) | `bgreen index 4294967299`: **65** | green `error: lengthOutOfRange(4294967299)`; `bgreen index 3`: 0 |
| (b) out-of-bounds write | `bred write 4294967312`: release **0** `wrote 64 bytes into a 16-byte allocation`; debug 6.4 **134**, 6.3 **139**; ASan **1** | `bgreen write 4294967312`: **65** all builds; `bnio` (`UInt32(_:)`): **132** | ASan: `ERROR: AddressSanitizer: heap-buffer-overflow ... WRITE of size 64 ... located 0 bytes after 16-byte region` |
| (c) force unwrap at runtime | `cred` (no `name`): **132** `Unexpectedly found nil while unwrapping an Optional value` | `cgreen`: **65** `error: config has no name`; with `{"name":"x","port":8080}`: **0** | |
| (d) precondition vs throw | `dred precondition 70000`: **132** (`-O`: empty stderr); `dred assert 70000`: debug **132**, `-O`/`-Ounchecked` **0**; `dred fatalError 70000`: **132** all three; `dred precondition 70000` under `-Ounchecked`: **0** | `dgreen x 70000`: **64** `error: port out of range: 70000 (expected 1...65535)`; `dgreen x 2`: **0** | stdout `starting` lost on every trap |
| (d) overflow and OOB | `dred overflow 70000` **132**; `dred index 70000` debug/`-O` **132**, `-Ounchecked` **139**; `-Ounchecked` overflow prints `-9223372036854705811` exit 0 | (valid `dred overflow 2` and `dred index 2` exit 0) | |

### Lint fixtures (script `lint.sh`, logs `lint-6.4.log`, `lint-6.3.log`)

Command: `../../run.sh bash lint.sh`. Configs: `lint/.swiftlint.yml` (`only_rules: [force_cast, force_try, force_unwrapping]`), `lint/swift-format.json` (4-space indent, line length 120, the three rules `true`).

| Tree | `swiftlint lint --quiet` / `--strict` | `swift format lint --strict` / non-strict |
|---|---|---|
| `lint/red` | **2** / **2** | **1** / **0** |
| `lint/green` | **0** / **0** | **0** / **0** |
| `lint/tests` (nested `.swiftlint.yml` disabling the two rules) | **0** / **0** | **0** / **0** |
| `lint/carve` | **2** (`force_try` on the unannotated and on the swift-format-ignored line) | **1** (`NeverForceUnwrap` on the unannotated `URL(...)!` and on the `swiftlint:disable:this` line; `NeverUseForceTry` on the unannotated and on the `swiftlint:disable:next` line) |

Extra case (`warn.sh`, `lint/warnonly/W.swift`, only `value!`): `swiftlint lint --quiet` exit **0** (warning), `swiftlint lint --strict --quiet` exit **2**.

Output lines: `red/Sources/Decode.swift:15:20: error: Force Cast Violation: Force casts should be avoided (force_cast)`, `:13:15: error: Force Try Violation ...`, `:16:20: warning: Force Unwrapping Violation ...`; swift-format `red/Sources/Decode.swift:9:16: error: [NeverUseImplicitlyUnwrappedOptionals] use 'String' or 'String?' instead of 'String!'`, `:13:15: error: [NeverUseForceTry] do not use force try`, `:15:16: error: [NeverForceUnwrap] do not force cast to 'Int'`, `:16:12: error: [NeverForceUnwrap] do not force unwrap 'cfg.name'`. `Helpers/Helper.swift` (imports `Testing`) fires SwiftLint `force_unwrapping` and is silent in swift-format.

### Grep checks (script `checks.sh`, log `checks.log`; host-side, no container)

Command: `./checks.sh`. Output line counts (0 = pass):

| Check | Red | Twin |
|---|---|---|
| G1 `grep -rn --include='*.swift' -e 'try!' -e ' as! ' DIR` (E1) | `pkg/Sources/cred` **3** (one is the fixture's own header comment) | `cgreen` **0** |
| G2 `grep -rn --include='*.swift' -e 'truncatingIfNeeded' DIR \| grep -v -e 'truncate-ok:'` (S3) | `pkg/Sources/bred` **3**; `real/nio-pre-fix` **2** | `pkg/Sources/bgreen` **0** (has a `// truncate-ok:` mask) |
| G3 the S1 pipeline (xargs form) | `pkg/Sources/ared` **1** (`main.swift:8:let length = Int(header)`); `real/nio-pre-fix` **10** | `pkg/Sources/agreen` **0**; `real/nio-post-fix` **9** (the guarded `Int(lengthQWord)` at `:166` and widening `Int(len)` still flag: annotate `// bounded:` or use `exactly:`) |
| G4 `grep -rn --include='*.swift' -e 'precondition' -e 'fatalError(' -e 'assert(' DIR \| grep -v -e 'invariant:'` (E6/E7/E8) | `pkg/Sources/dred` **4** | `pkg/Sources/dgreen` **0** |
| G5 `... -e ' &+ ' -e ' &- ' -e ' &\* ' DIR \| grep -v -e 'wrap-ok:'` (S4) | `extra` **1** (`traps.swift:25`) | every `pkg/Sources/*green` **0** |
| G6 `-Ounchecked` grep (E9) | `flags/red` **2** | `flags/green` **0** |
| G7 `grep -rL --include='.swift-format*' -e '"NeverForceUnwrap" *: *true' DIR` x3 (E2) | `cfg/red` **3** (one per rule); `apple__containerization` **3** (`.swift-format-nolint`) | `cfg/green` **0**; `apple__swift-argument-parser` **0** |

### Swift Testing fixtures (scripts `exittest.sh`, `unwraptest.sh`, logs `exittest-*.log`, `unwraptest-*.log`)

- `../../run.sh bash exittest.sh 6.4`: GREEN `swift test` **0** (`Test run with 4 tests in 1 suite passed`), RED control (`RED_CONTROL=true`) **1** (`expected exit status ".failure", but ".exitCode(EXIT_SUCCESS)" was reported instead`). 6.3.3 identical.
- `../../run.sh bash unwraptest.sh 6.4`: `#require` on nil **1** (one recorded issue, run summary printed); `!` on nil **1** with `*** Program crashed: Illegal instruction` and no `Test run with ...` summary; non-nil **0**. 6.3.3 identical.

### Runs that did not go red, and why

- `extra.sh` is a measurement table (exit code per primitive), not a pass/fail check; it has no twin gate of its own.
- `sms.sh`: `-strict-memory-safety` gave 14 warnings on both `bred` and `bgreen`: not red-vs-green, therefore not proposed.
- `custom.sh`: SwiftLint `custom_rules` skipped on the static binary; the planted `ared` returned exit 0.
- `bt.sh` interactive-prompt behaviour (tty, 30 s default timeout): not run, needs a tty.
- aarch64 (SIGTRAP 133 reports): not run.
- `swift-format` reported its version as `main` on 6.4.0; the gate in a repo should pin the toolchain, not the tool.

## Exemplar evidence

Counts from the language-shape audit's Axis 4 table (production code, 40 repos, regex heuristic, test code excluded: [swift-audit/exemplar-language-shape.md](../swift-audit/exemplar-language-shape.md)): 3,364 force `!`, 620 `try!`, 378 `as!`, 209 IUO declarations, 1,441 `fatalError`, 2,037 `precondition`, 2,213 `assert`; force `!` is highest in vapor (111/10k lines), JavaScriptKit (85) and swift-crypto (78), lowest in element-x-ios (1.7) and SwiftLint (5.2). Own measurements below use the S1/S3/E1/E6 greps over `<repo>/Sources`.

| Rule | Satisfies | Violates / contradicts |
|---|---|---|
| E1 force operations | `swift-argument-parser@efd239f0055b` lints clean under `--strict` with all three rules on, 25 annotated ignores (`Sources/ArgumentParser/Parsing/SplitArguments.swift:331`); `element-x-ios@14e33866ced2` 17 `!` in 98,287 production lines, `.swiftlint.yml:9` opts into `force_unwrapping` | `swift-crypto` 101 `try!` and 130 `!` in 16,634 lines; `swift-nio` G1 = 199 hits (`try!`/`as!`) with `.swift-format:33-35` all `false` |
| E2 gate reads the enabling config | `swift-argument-parser` (G7 empty) | `containerization@3e7bc39e66b3` `.swift-format:35-37` true, `.swift-format-nolint:35-37` false, `Makefile:505` uses the latter; 57/5/1 findings when linted with its own `.swift-format`; `container@f70ecbb926d9` same pattern (38/8/0 findings; `Makefile:402` formats with `.swift-format`, `Makefile:406` lints with `.swift-format-nolint`) |
| E4 annotated carve-out | argument-parser's `// swift-format-ignore: NeverForceUnwrap` | the same file's `:331-333` "I don't know why this is safe" (annotation without a reason) |
| E6/E8 throw vs trap | `swift-argument-parser` (`Platform.swift:155-162`, validation failure to `EX_USAGE`); hummingbird post-fix range guard (`FileMiddleware.swift:394-396`) | G4 inventory: swift-nio 1,136 lines, async-http-client 304, containerization 683 (mostly internal invariants: `precondition`/`fatalError`/`assert`, none carrying the `// invariant:` marker; the marker is a new convention, 0 adoption) |
| E9 no `-Ounchecked` | 40 of 40 | none |
| S1 `exactly:` on wire integers | `swift-nio@e12881f2a691:Sources/NIOWebSocket/WebSocketFrameDecoder.swift:163-166` (`guard lengthQWord <= UInt64(Int.max) else { throw NIOWebSocketError.invalidFrameLength }` then `Int(lengthQWord)`); corpus has 42 `Int(exactly:`, 5 `UInt32(exactly:`, 47 `clamping:` in non-test sources | the pre-fix file (`real/nio-pre-fix/WebSocket/WebSocketFrameDecoder.swift:164,166`) is the CVE; G3 whole-tree noise 4-124 for the six repos with hits |
| S3 `truncatingIfNeeded` justified | `swift-nio@e12881f2a691:Sources/NIOCore/ByteBuffer-core.swift:1117-1121` (comment cites the two preceding bounds checks; no `truncate-ok:` marker, so G2 flags it: 3 lines) | corpus 392 uses (swift-protobuf 88, swift-nio 44); pre-fix `ByteBuffer-core.swift:178,182` is the CVE; G2 whole-tree: swift-protobuf 88, swift-nio 44, vapor 14, containerization 4, hummingbird 0 |
| S4 overflow-aware arithmetic | corpus: 40 `addingReportingOverflow`, 59 `multipliedReportingOverflow` | |
| E12 documented trap | swift-nio `53ac1ccab23f` `- Precondition:` notes on `set*(at:)` | |

## AI-agent angle

What an LLM characteristically gets wrong here, and the smallest mechanical check:

| Mistake | Why it happens | Smallest check |
|---|---|---|
| Writes `Int(header)` / `UInt32(len)` on a value read from a socket, file or JSON | The unlabelled initializer is the idiom in every tutorial; Rust-trained habit of `as` casts silently ported | G3 pipeline on changed files (S1); fixture `ared` exit 132 |
| "Fixes" the crash by switching to `UInt32(truncatingIfNeeded:)` | The mirror of the Rust `as u64` "fix": removes the trap and the safety with it (reproduced: exit 0 heap overflow) | G2 (`truncate-ok:` marker); ASan test (S6) |
| Believes release builds wrap on overflow like C/Rust | Mental model carried from other languages | Table in finding 2: `-O` traps (132); only `&+` or `-Ounchecked` wraps; G5 and G6 |
| Believes `assert` validates input (or that `precondition` is stripped like `assert`) | Name confusion across languages | Table in finding 2; G4 |
| Uses `guard let x = y else { fatalError("...") }` or `precondition(port > 0)` as CLI or parser error handling | Short, compiles, looks "safe" | G4 over CLI and parser targets; exit-64 integration test (E10) |
| Adds `!`, `try!`, `as!` or an IUO "temporarily" to silence the compiler, then keeps it | Fastest way to a green build | swift-format `--strict` lint (E1); `grep -rn --include='*.swift' -e 'try!' -e ' as! ' Sources` |
| Disables the lint rule instead of fixing the site (`"NeverForceUnwrap": false`, or a `.swift-format-nolint`) | The 17/24 corpus majority does it | G7 (E2) |
| Adds `// swift-format-ignore: NeverForceUnwrap` or `swiftlint:disable` with no reason | The annotation is the cheapest silencer; the tool does not check reasons | `grep -rn -A1 ... 'swift-format-ignore: Never'` and read the next line (E4) |
| Writes `!` in tests and `try!` freely, or invents `XCTUnwrap` inside a Swift Testing test | XCTest-first habit | E5; Swift Testing spelling is `try #require(x)` |
| Says "you cannot test a trap" and skips the test, or reaches for `XCTAssertThrowsError` around a trapping call | Pre-6.2 knowledge | E11: `#expect(processExitsWith: .failure)` (Swift 6.2+); proven here |
| Invents non-existent conversion APIs (`Int(safely:)`, `Int.checked(_:)`, `UInt32(clamped:)`, `Int(throwing:)`) | Hallucinated from other languages | `swift build` (compile error); only `exactly:`, `clamping:`, `truncatingIfNeeded:`, `bitPattern:` exist (Integers.swift) |
| Writes `do { _ = Int(big) } catch { ... }` or `try?` around a trapping conversion | Believes the trap is an exception | TSPL: "there's no way to catch a failed assertion"; keep the throwing path explicit (`throws(E)` with `exactly:`) |
| Builds `lower...upper` from parsed `Range:` bounds without a comparison | Seems total | S2 heuristic; exit-test (E11) |
| Reports a trap as `exit 1` or `exit(2)` in docs/tests | Does not know 132/134/139 | E10 table; assert 64/65 only |

## Contested / evolving

- **Trap vs throw in libraries.** Language design says traps are the memory-safety mechanism (forum 50594, SE-0458) and `ErrorHandlingRationale.md` leaves recoverable logic failures "an open question"; server maintainers now say user-reachable traps are denial-of-service defects (forum 74386, FranzBusch, Fluent 5 plans fewer). Direction as of 2026-10-10: boundary code throws, internal invariants trap, and primitives like `ByteBuffer.set*(at:)` stay trapping but documented. Upstream's 2026 fix for 43671 chose a trap inside a primitive, not a throw.
- **Guard-then-convert vs `Int(exactly:)`.** NIO #3603 used a guard and `Int(...)`; the advisory text says `Int(exactly:)`. Both are acceptable; the checked rule (S1) prefers `exactly:` because no separate guard can be forgotten. A guard needs the `// bounded:` marker to pass G3.
- **Force unwrap in production.** swift-format says "strongly discouraged and must be documented" and ships the rules off; 18 of 24 corpus configs keep them off (and one that turns them on does not gate on them). SwiftLint turns `force_cast` and `force_try` on by default and `force_unwrapping` off. Trend: Apple's newer CLI repos (containerization, container, argument-parser) enable the rules; only argument-parser has the discipline to pass.
- **Tests.** swift-format auto-exempts (a file that merely imports `Testing`, even production code, is exempt: `Helpers/Helper.swift` fixture); SwiftLint does not. `#require` is the trend (Swift Testing is the default init template in 6.4 per the topic map).
- **`fatalError` vs `preconditionFailure` for unreachable code.** SwiftPM review (2026-09-04) asked for `fatalError` or a throw instead of `preconditionFailure`; the author used `fatalError`. Rationale (not stated in the review, verified here): `preconditionFailure` is removed under `-Ounchecked`, `fatalError` is not.
- **Exit codes of traps.** 132 on x86_64 Linux for all of: unwrap, overflow, conversion, `precondition`, `fatalError`; 134 for glibc abort and exclusivity; 139 for segfaults. arm64 reports SIGTRAP (133) in the cited forum and DTS threads. unverified: arm64 and macOS were not run (Q7: read only).
- **Backtracer defaults.** On by default on Linux, off on macOS (Backtracing.rst). Effects on CLI stderr after a trap (47 lines on this image) will matter if a Swift CLI is run under a supervisor that captures stderr; tty interaction (30 s timeout) not run.
- **Tooling gaps likely to change.** SwiftLint's static Linux binary skips `custom_rules` (SourceKit disabled); if upstream ships a SourceKit-capable Linux build, a `custom_rules` mirror of G2-G5 becomes provable. Strict memory safety (`-strict-memory-safety`, SE-0458) may gain a diagnostic for lossy conversions feeding unsafe pointers; none today.

## Sources

Primary sources are marked P. All were fetched and read this session (curl, `gh api`, or the exemplar clone at the sha cited); none is from a search snippet.

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| P https://github.com/apple/swift-nio/security/advisories/GHSA-qcc5-f287-vgmq | Advisory CVE-2026-43678 | 2026-07 | Int(_:) trap DoS, PoC bytes, fix description |
| P https://github.com/apple/swift-nio/security/advisories/GHSA-r3rc-9hpw-54v9 | Advisory CVE-2026-43671 | 2026-05 | truncatingIfNeeded OOB write, affected methods, patch rationale |
| P https://github.com/hummingbird-project/hummingbird/security/advisories/GHSA-62cf-93wq-244m | Advisory CVE-2026-97697 | 2026-08 | ClosedRange precondition DoS, "reachable assertion" |
| P https://github.com/apple/swift-nio/pull/3603 | Fix PR for 43678 (diff and test) | 2026-05 | Shows the guard + Int() spelling and the regression test |
| P https://github.com/apple/swift-nio/commit/87f935b70c5ed41e45d7e3be3cd39f122d872da3 | Fix commit for 43671 | 2026-05 | `UInt32(_:)` swap and the retained justified `truncatingIfNeeded` |
| P https://github.com/apple/swift-nio/commit/53ac1ccab23f24e18054a94c3b4ea772fc2d856c | Doc commit: trapping `set*(at:)` | 2026-07 | `- Precondition:` convention and get/set asymmetry |
| P https://raw.githubusercontent.com/swiftlang/swift/main/docs/Backtracing.rst | Swift backtracer documentation | main, 2026 | Defaults per platform, `SWIFT_BACKTRACE` keys, macOS off by default |
| P https://raw.githubusercontent.com/swiftlang/swift/main/docs/ErrorHandlingRationale.md | Error-handling design rationale | main | "Logic failures" section, DoS tension, open question |
| P https://raw.githubusercontent.com/swiftlang/swift/main/stdlib/public/core/Assert.swift | stdlib `precondition`/`assert`/`fatalError` source | main | Exact build-mode semantics, `-Ounchecked` assumption |
| P https://raw.githubusercontent.com/swiftlang/swift/main/stdlib/public/core/Integers.swift | stdlib integer initializers | main | `init(_:)` runtime error, `init?(exactly:)`, `clamping`, `truncatingIfNeeded` |
| P https://raw.githubusercontent.com/swiftlang/swift-book/main/TSPL.docc/LanguageGuide/TheBasics.md | TSPL: The Basics | main | Assertions and Preconditions section; force-unwrap runtime error |
| P https://raw.githubusercontent.com/swiftlang/swift-book/main/TSPL.docc/LanguageGuide/ErrorHandling.md | TSPL: Error Handling | main | `try!` and "Disabling Error Propagation" |
| P https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0104-improved-integers.md | SE-0104 improved integers | Swift 4 | Rationale for `truncatingIfNeeded` and `exactly:` |
| P https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0413-typed-throws.md | SE-0413 typed throws | Swift 6.0 | `throws(E)` used for the closed error sets in the fixtures |
| P https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0458-strict-memory-safety.md | SE-0458 strict memory safety | Swift 6.2 | Dynamic checks acceptable "so long as the failure can't escalate into a memory safety problem" |
| P https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/testing/0008-exit-tests.md | ST-0008 exit tests | Swift 6.2 | `#expect(processExitsWith:)` for trap contracts |
| P https://raw.githubusercontent.com/swiftlang/swift-format/main/Documentation/RuleDocumentation.md | swift-format rule docs | main | `NeverForceUnwrap`, `NeverUseForceTry`, IUO rule text, "linter-only" |
| P https://github.com/swiftlang/swift-format/blob/b15dd59fad21/Sources/SwiftFormat/Rules/NeverForceUnwrap.swift | swift-format rule source (also `NeverUseForceTry.swift`, `NeverUseImplicitlyUnwrappedOptionals.swift`, `Core/ImportsAnyTestingLibrary.swift`) | 2026-10 | Test-file exemption mechanism, opt-in comment |
| P https://realm.github.io/SwiftLint/force_unwrapping.html | SwiftLint rule page (also `force_try.html`, `force_cast.html`) | rules docs for 0.65-era | Enabled-by-default flags, severities, `ignored_literal_argument_functions` |
| P https://github.com/realm/SwiftLint/blob/ec4691d9e813/Source/SwiftLintBuiltInRules/Rules/Idiomatic/ForceUnwrappingRule.swift | SwiftLint `force_unwrapping` source and configuration | 2026-10 | The literal carve-out list and visitor |
| https://forums.swift.org/t/fatalerror-without-a-way-to-intercept-it-is-harmful-on-the-server/74386 | Swift Forums thread, 14 posts | 2024-09 | Server maintainers' stance: throw, do not trap, on user input |
| https://forums.swift.org/t/why-does-swift-allow-you-to-initialise-an-int-with-a-uint64/50594 | Swift Forums thread, 21 posts | 2021-07 | Design rationale for trapping `Int(_:)`; "safe means memory safe" |
| https://github.com/swiftlang/swift-package-manager/pull/10497#discussion_r3935124586 | SwiftPM review comment | 2026-09 | Reviewer asks for `fatalError` or `throw` instead of `preconditionFailure` |
| https://github.com/apple/containerization/blob/3e7bc39e66b3/Makefile | containerization Makefile and `.swift-format`, `.swift-format-nolint` (exemplar clone) | 2026-10 | Enabled rules not wired into the lint gate |
