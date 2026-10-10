---
title: "Untrusted input in Swift 6.4: parser limits, conversions, C seams, secrets, terminal-safe text, randomness and advisories"
topic: "security/untrusted-input (SW-SEC): map rows M-I-01, M-I-02, M-I-03, M-I-07, M-I-08, M-I-09, M-I-10, M-I-12, SW-ERR's carried S1-S6, control-character sanitising"
model: sonnet
id_family: SW-SEC
consolidates:
  - swift-security/untrusted-input.md
audits_read:
  - swift-audit/exemplar-language-shape.md (unsafe and pointer counts)
  - swift-audit/exemplar-quality-gates.md (sanitizers, Dependabot, CodeQL in CI)
  - swift-audit/exemplar-packaging-and-release.md (lockfiles, supply chain)
  - swift-audit/config-inventory.md (CLI-03 and CLI-11 rows, ocx-sdk-python)
  - swift-audit/exemplar-concurrency.md (nonisolated(unsafe) counts)
date: 2026-10-10
---

# Untrusted input (SW-SEC)

Source keys. **[UI]** is `swift-security/untrusted-input.md` (section numbers and run IDs V1-V28 are its own). **[gates]** is `swift-audit/exemplar-quality-gates.md`. **[CR n]** is a consolidator re-run recorded in "Consolidator re-runs" below (2026-10-10, Swift 6.4.0 unless stated). Exemplar citations are `<repo>@<sha12>:<path>:<line>`. No macOS and no Xcode: Apple-only behaviour is `unverified: read only`.

## Verdict

1. **Scope.** SW-SEC owns what a process does with bytes it did not write: parser depth and size, integer conversion, memory-safety seams, secrets, terminal-safe text, randomness and dependency advisories. Traversal (SW-IO-20), digests (SW-IO-13), secret file modes (SW-IO-21), command injection (SW-IO-08), subprocess output limits (SW-IO-03) and throw-not-trap (SW-ERR-14) stay with their owners; this file cross-references them and does not restate them.
2. **A crash is the failure, not an error.** Stack overflow, `Int(UInt64)`, `Range(5...2)` and an oversized allocation kill the process with a signal or trap, so every limit is checked before the dangerous operation and proven with a hostile-input run of the built binary (exit 65, never 132/134/139). Binds CLI, server and any library that parses; the library form of the test lets the crash fail the test run.
3. **Depth: 64 by default.** Raising it needs a passing test on a 128 KiB thread stack, not a claim about 8 MiB. This replaces the dive's "never above 512" ceiling (CR6: depth 512 crashes a 128 KiB debug thread; 64 does not).
4. **`StrictMemorySafety` is a use-site audit, SHOULD on C-wrapping and pointer-parsing targets, CONSIDER elsewhere, never a repo-wide gate.** The map's conflict 10 stands; the dive's MUST is overruled (it contradicts the map it claims to confirm, no exemplar enables it as an error, and it is silent on a returned pointer, CR1). The MUST-grade protections are `Span`/no escaping pointers, one owner per C handle and an ASan run.
5. **Secrets by construction, proven by a canary.** A `Secret` type, URLs redacted where they enter text, no secret in `argv`, and a canary test over every failing path. Binds CLI, SDK and server; Apple apps follow the type rule, Keychain and `os.Logger` privacy stay read-only.
6. **Terminal text is escaped, not stripped.** One `sanitizeForTerminal` at three boundaries (root error writer, log handler, human stdout). 0 of 40 exemplars do this; ArgumentParser and swift-log pass bytes raw. A library or SDK escapes wire- or child-derived text when it builds `message` (the function is idempotent, so the CLI's second pass is free); machine JSON stays faithful.
7. **Randomness and crypto have one answer.** `SystemRandomNumberGenerator` and `import Crypto`; `Insecure.*` only with a reason; no hand-rolled primitives.
8. **A scanner is one input.** There is no `swift package audit`. Roots that ship keep their resolved pins at or above hand-set advisory floors (checked by a runnable `jq` script); `osv-scanner` on `Package.resolved` is SHOULD.
9. **Set size.** The dive's 31 candidates become 24 rules (18 MUST, 6 SHOULD). Dropped or folded (dive IDs): -17 (the Sendable-handle policy is SW-CONC-09's; the use-flagging fact lives in SW-SEC-11), -28 (owned by SW-PKG-24), -31 (owned by SW-REL); -02, -16, -20 and -25 folded into neighbours.

## The ruleset

### SW-SEC

Markers introduced here (`bounded:`, `truncate-ok:`, `wrap-ok:`, `redacted:`, `secret-ok:`, `insecure-ok:`) have 0 corpus adoption and no tool reads them except the greps; they follow the same owner default as SW-ERR's `swallow-ok:` (adopt, document in the index). Every grep below takes a directory operand (`Sources`) and prints violations: empty output passes, but only after the SW-CORE zero-file canary shows the glob matched Swift files (SW-GATE-10).

#### A. Caught by running the built binary (or a test) against a hostile input

**SW-SEC-01 (MUST, any Swift).** Every recursive parser, decoder or tree walk over untrusted input takes a `depth` parameter, checks `depth < maxDepth` before recursing and throws a typed error; `maxDepth` is a named constant, default 64. A larger value needs the SW-SEC-01 test to pass on a thread with the smallest stack the code runs on (128 KiB under musl, `Thread.stackSize = 131072`). Prefer `JSONDecoder`, `JSONSerialization` and `PropertyListDecoder` (their scanners stop at depth 512) to a hand-written parser; a hand-rolled, YAML, XML or form decoder, or a `Codable` over a custom `Decoder`, carries the limit itself, and a library decoder is trusted only for the limit it documents (swift-protobuf `messageDepthLimit` 100, Hummingbird `maxKeyDepth` 64).
- Why: stack exhaustion is a signal, not a catchable error. 100,000 nested arrays exit 139 in debug and release; the depth-limited twin exits 65 [UI §1, V1]. Hummingbird CVE-2026-97696 (`<= 2.25.1`, fixed 2.26.0) is this defect [UI §1].
- Check: run the built binary on a 100,000-deep input file and assert the exit code, `"$BIN" <parse-command> deep.json; test $? -eq 65` (the SW-ERR-17 exit-code test). Library form: `#expect(throws: ParseError.tooDeep) { try parse(nested(100_000)) }` (not run; a stack overflow kills the test process, which fails the run). Reading heuristic: every function that calls itself in a parser has a `depth` parameter and a guard before the call. List candidates with `grep -rn --include='*.swift' -e 'func parseValue' -e 'func parseArray' -e 'func parseObject' -e 'indirect enum' Sources` (heuristic).
- Red: **yes**, [UI V1, V2] and [CR2]: `deepred 100000` exit 139, `deepgreen 100000` exit 65, 63 deep exit 0, 65 deep exit 65; `deepcodable` 511 exit 0, 513 and 100,000 exit 65 (Foundation cap 512, swift-foundation@aadd9259be07:Sources/FoundationEssentials/JSON/JSONScanner.swift:290). Small stacks: [CR6] a depth-512 parse on a 128 KiB thread exits 139 in debug and 0 in release; depth 64 passes both; 6.4.0 only, musl itself not run.
- Binds: CLI, server, SDK, library (any code that parses wire or file input). Apple apps for decoded server data.

```swift
// incorrect: the stack is the only limit
mutating func value() throws -> JSON { /* ... */ items.append(try value()) /* ... */ }
// correct: depth is a parameter, checked before the recursive call
let maxDepth = 64
mutating func value(depth: Int = 0) throws -> JSON {
    guard depth < maxDepth else { throw ParseError.tooDeep(limit: maxDepth) }
    /* ... */ items.append(try value(depth: depth + 1)) /* ... */
}
```

**SW-SEC-02 (MUST, any Swift).** A tree or graph built from untrusted input whose nodes own a collection of children is bounded by SW-SEC-01 at build time, or tears down iteratively (a work-list `deinit` using `isKnownUniquelyReferenced`), or is stored flat (`[Entry]` plus `Int` indices). Do not add the work list to a singly linked chain.
- Why: `final class Node { var kids: [Node] }` built in a loop (no parser recursion) crashes in `deinit` at 100,000 deep, exit 139 in debug and at 1,000,000 in release; a linked `final class Link { var next: Link? }` survives 10,000,000 [UI §1, V3]. Hummingbird's fixed source says a deep key "builds a node tree so deep that constructing *or* deallocating it overflows the stack" (hummingbird@1bd3b407fb47:Sources/Hummingbird/Codable/URLEncodedForm/URLEncodedFormNode.swift:257-262).
- Check: the SW-SEC-01 hostile-nesting test must also drop the parsed value (assign it and let it go out of scope; `_ = try parse(...)` inside an exit test is not enough). Reading heuristic: a node type with a stored `[Self]` or `[Node]` child property and no depth cap at its builder.
- Red: **yes**, [UI V3] and [CR2]: `listred 100000 kids` exit 139 (and `1000000` release, exit 139), `listgreen 3000000` exit 0, `listred 10000000 next` exit 0 (not a violation).
- Binds: parsers, decoders, dependency or layer graphs built from wire data.

```swift
final class Node {
    var kids: [Node]
    init(_ k: [Node]) { kids = k }
    deinit {
        var work = kids; kids = []
        while var n = work.popLast() {
            guard isKnownUniquelyReferenced(&n) else { continue }
            work.append(contentsOf: n.kids); n.kids = []
        }
    }
}
```

**SW-SEC-03 (MUST, any Swift).** Never read an untrusted stream to its end into memory without a cap. On wire, stdin or socket input replace `readDataToEndOfFile()`, `Data(contentsOf:)`, `String(contentsOfFile:)`, `readToEnd()` and `URLSession.data(from:)` / `data(for:)` (they buffer the whole body) with a chunked read (`URLSession.bytes(for:)` with a running total) that checks the running total before appending, or NIO `collect(upTo:)`. Defaults: 4 MiB for registry JSON bodies, 1 MiB for error bodies (both measured in containerization), 1 MiB for stdin documents (argued). A hit on local trusted input carries `// bounded: <limit or why>`. Captured subprocess output is SW-IO-03's `limit:`.
- Why: a 300 MB stdin through `readDataToEndOfFile()` peaks at 311 MB RSS and exits 0; the capped chunked read stops at 1 MiB, exits 65 at 19 MB RSS [UI §1, V4]. containerization defaults `bufferSize` to `Int(4.mib())` (containerization@3e7bc39e66b3:Sources/ContainerizationOCI/Client/RegistryClient.swift:106) and bounds the error body at 1 MiB (`RegistryClient+Error.swift:53`).
- Check: `grep -rn --include='*.swift' -e 'readDataToEndOfFile' -e 'Data(contentsOf' -e 'contentsOfFile' -e 'readToEnd(' -e '\.data(from:' -e '\.data(for:' Sources | grep -v -e 'bounded:'` (the dive's grep lacked the last two, so the shortest network API passed it: [CR9]). Runtime: `head -c 300000000 /dev/zero | "$BIN" <stdin-reading-command>; echo $?` must print 65, not 0.
- Red: **yes**, [UI V4, V23 K1] and [CR9]: K1 red 1 line, twin 0; the widened grep prints 2 lines on `greps/bad` (both `URLSession` calls) and 0 on `greps/good` (`bytes(from:)` with a cap), the dive's grep 0 on both; `sizered` exit 0 `VmHWM 311632 KiB`, `sizegreen` exit 65 `VmHWM 19008 KiB`.
- Binds: CLI, server, SDK. The grep is noisy on trusted local input (see "Applied"); run it on changed files.

**SW-SEC-04 (MUST, any Swift).** Never allocate from a wire-declared length. Compare the unconverted wire integer with a configured cap (SW-SEC-05), then allocate. `[T](repeating:count:)`, `reserveCapacity`, `.allocate(capacity:)` and `unsafeUninitializedCapacity` on a non-literal count carry `// bounded: <where checked>`.
- Why: an allocation failure is `Fatal error: failed to allocate N bytes` with exit 134 (abort), a remote kill; it is neither the conversion trap (132) nor a throw [UI §1, V5].
- Check: `grep -rn --include='*.swift' -e 'repeating:.*count:' -e 'reserveCapacity(' -e 'allocate(capacity:' -e 'unsafeUninitializedCapacity' Sources | grep -v -e 'bounded:'` (noisy; changed files). Runtime: declared length 2^40 and 2^63-1 must exit 65.
- Red: **yes**, [UI V5] and [CR2]: `allocred` (2^40, 2^63-1) exit 134, `allocgreen` exit 65 (`declared length exceeds 16777216`), 1,000 exit 0; K2 red 1 line, twin 0.
- Binds: CLI, server, SDK, any length-prefixed protocol reader.

**SW-SEC-05 (MUST, any Swift; carries S1, S5).** An integer from outside the process stays in its wire type and is converted with `T(exactly:)` (throw on `nil`) or compared with the limit first; the conversion and the size-limit check happen before the value is used for an index, an allocation or a copy. `T(clamping:)` only where saturation is the specified behaviour. The thrown error, not a trap, is SW-ERR-14.
- Why: `Int(UInt64 >= 2^63)` traps before any configured `maxFrameSize` (swift-nio CVE-2026-43678, `<= 2.100.0`, fixed 2.101.0, [GHSA-qcc5-f287-vgmq](https://github.com/apple/swift-nio/security/advisories/GHSA-qcc5-f287-vgmq)) [UI §2].
- Check (name-based, changed files): `find Sources -name '*.swift' -print0 | xargs -0 -r grep -H -n -e '\bU\?Int[0-9]*([a-zA-Z_.]*[lL]en' -e '\bU\?Int[0-9]*([a-zA-Z_.]*[sS]ize' -e '\bU\?Int[0-9]*([a-zA-Z_.]*[oO]ffset' -e '\bU\?Int[0-9]*([a-zA-Z_.]*QWord' -e '\bU\?Int[0-9]*([a-zA-Z_.]*[hH]eader' | grep -v -e 'exactly:' -e 'clamping:' -e 'truncatingIfNeeded:' -e 'bitPattern:' -e 'bounded:' -e 'radix:' -e '\.count)'`. Order half (convert-then-bound) is a reading heuristic: the cap compares the wire-typed value.
- Red: **yes**, [UI §2, V6, V23 S1]: `ared 8000000000000000` exit 132 in debug and release (`Swift/Integers.swift:3641: Fatal error: Not enough bits to represent the passed value`), `agreen` exit 65 (`invalidFrameLength(9223372036854775808)`), `agreen 10` exit 0; S1 grep red 1 line, twin 0.
- Binds: CLI, server, SDK, any binary-format reader.

**SW-SEC-06 (MUST for targets that combine unsafe pointers with an externally derived size, any Swift).** Such a target has a test run under `swift test --sanitize=address` (or `swift build -c release --sanitize=address` plus the hostile input), run in CI.
- Why: the release build of an out-of-bounds write exits 0 (`wrote 64 bytes into a 16-byte allocation`); ASan is the deterministic catch, and it also catches the use-after-free that `StrictMemorySafety` stays silent on (`EscapeExe`) [UI §2, §3, V6, V9]. Only swift-protobuf runs ASan in CI (swift-protobuf `build.yml:148-176`, [gates Axis 3]). The sibling TSan job and its Docker shape (`--security-opt seccomp=unconfined`) are SW-GATE-27's; this rule adds the ASan leg and does not restate it.
- Check: `swift build -c release --sanitize=address` then the hostile input must exit non-zero on the violation; the CI job exists (reading).
- Red: **yes**, [UI V6, V9]: `bred write 4294967312` release exit 0, ASan exit 1 (`heap-buffer-overflow`), `bgreen` ASan exit 65; `EscapeExe` ASan exit 1 (`heap-use-after-free`), `EscapeTwin` exit 0.
- Binds: C-wrapping and pointer-parsing targets only; ordinary code is out of scope.

#### B. Caught by a marker-comment grep (an unmarked hit is the violation)

**SW-SEC-07 (MUST, any Swift; carries S3).** `T(truncatingIfNeeded:)` appears only with `// truncate-ok: <why>` on the same line. To "fix" a conversion error with it is the defect.
- Why: it wraps past the bounds check and corrupts memory in release (swift-nio CVE-2026-43671, `<2.100.0`, fixed 2.100.0, [GHSA-r3rc-9hpw-54v9](https://github.com/advisories/GHSA-r3rc-9hpw-54v9)) [UI §2].
- Check: `grep -rn --include='*.swift' -e 'truncatingIfNeeded' Sources | grep -v -e 'truncate-ok:'`.
- Red: **yes**, [UI V6, V23 S3]: `bred` 3 lines, `bgreen` 0; release `bred write` exit 0 vs ASan exit 1.
- Binds: all non-test code; hashing and PRNG code that truncates on purpose carries the marker.

**SW-SEC-08 (MUST in boundary targets, any Swift; carries S4).** Arithmetic on an untrusted value uses `addingReportingOverflow` / `multipliedReportingOverflow` or a pre-check; `&+`, `&-` and `&*` carry `// wrap-ok: <why>`.
- Why: `+` traps (exit 132); `&+` wraps silently (`-9223372036854775808`) [UI §2].
- Check: `grep -rnE --include='*.swift' '[^&]&[-+*]=? ' Sources | grep -v -e 'wrap-ok:'` (catches `&+=`, `&-=` and `&*=` too; the dive's ` &+ ` form missed all three compound assignments, [CR9]; the grep cannot tell untrusted from trusted operands, so run it on parser, decoder, framing and size-computation targets and on changed files).
- Red: **yes**, [UI V6, V23 S4] and [CR9]: the widened grep prints 4 lines on `greps/bad` (`&+=`, `&*=`, `&-`, `&-=`; the dive's grep 1) and 0 on `greps/good` (`&+=` with `// wrap-ok:`); `add-trap 1` exit 132, `wrap-add 1` exit 0 and prints `-9223372036854775808`, `add-safe 1` exit 0 and prints `overflow`; grep red 1, twins 0.
- Binds: CLI, server, SDK parsers. `-Ounchecked` is banned by SW-ERR-16.

#### C. Caught by the compiler, SwiftPM or a sanitizer

**SW-SEC-09 (MUST, any Swift; `Span` from 6.2).** A pointer obtained from `withUnsafeBufferPointer`, `withUnsafeBytes`, `withUnsafe(Mutable)Pointer` or an `&x`-to-pointer conversion never leaves its closure or call: return a value computed inside, not the pointer. Prefer `Span` / `RawSpan` where the callee accepts one. Public API never returns a pointer into Swift-owned storage.
- Why: `StrictMemorySafety` does not flag the escape, only a later dereference; a fully `unsafe`-acknowledged escape builds clean and is a use-after-free under ASan [UI §3, §4]. The `TemporaryPointers` warning (`initialization of 'UnsafePointer<Int>' results in a dangling pointer`) cannot be promoted to an error on 6.4.
- Check, four layers: (a) compile: returning `a.span` from local storage fails with `a function cannot return a ~Escapable result` (no flag); (b) `grep -rn --include='*.swift' -e 'public .*Unsafe' -e 'open .*Unsafe' -e 'public .*OpaquePointer' -e 'open .*OpaquePointer' Sources`; (c) the ASan run of SW-SEC-06; (d) `swift build 2>&1 | grep -e 'TemporaryPointers'` must print nothing (`-warnings-as-errors`, `-Werror TemporaryPointers` and `-Xswiftc -Werror -Xswiftc TemporaryPointers` all exit 0 on 6.4; they exit 1 on 6.3.3).
- Red: **yes**, [UI V8, V9, V10, V23 K5] and [CR1]: `SpanRed` exit 1 (`SpanRed.swift:2:23: error: a function cannot return a ~Escapable result`); K5 red 1 (`public func firstBytePointer(_ a: [UInt8]) -> UnsafePointer<UInt8>?`), `GreenLib` 0; `EscapeExe` ASan exit 1, `EscapeTwin` 0; `TmpPtr` prints `[#TemporaryPointers]` and exits 0 under `-Werror TemporaryPointers` on 6.4. `EscapeOnly` is **not** red under strict-memory-safety on 6.4 (CR1 rc 0; rc 1 on 6.3.3), so no check here relies on that flag.
- Binds: library, SDK, CLI, server (any code with `Unsafe*Pointer`).

**SW-SEC-10 (MUST, any Swift).** A C handle or pointer lives in one Swift type: stored `private`, never in a `public` or `open` signature; acquired in `init` only after the input is validated; released in exactly one place, that type's `deinit` (or a `~Copyable` type's `deinit`); an `init` error path frees nothing the object will free. Hand out Swift values, not the handle. A handle shared across tasks is `Sendable` through an actor, a `Mutex`, or `nonisolated(unsafe) let` on an immutable handle with the owning `deinit` (SW-CONC-09 owns that clause).
- Why: swift-crypto CVE-2026-43823 (critical, `>= 3.2.0, <= 4.5.0`, fixed 4.5.1): initialising an RSA public key from DER/PEM that BoringSSL cannot decode freed the `EVP_PKEY*` in the catch block and again in `deinit` ([GHSA-8q93-f6xh-4f6f](https://github.com/apple/swift-crypto/security/advisories/GHSA-8q93-f6xh-4f6f)); it reproduces in 10 lines of plain Swift (`dfred` exit 134 `free(): double free detected in tcache 2`) [UI §5, V13].
- Check: `grep -rc --include='*.swift' -e 'free(' Sources | grep -v -e ':0$' -e ':1$'` lists files with two or more `free(` (name your library's release function too, for example `EVP_PKEY_free`); the public-pointer grep of SW-SEC-09(b); a test that constructs the type with malformed input (an `init` that throws) under ASan.
- Red: **yes**, [UI V7, V13, V23 K6] and [CR1, CR2]: `dfred` exit 134, `dfgreen` 0; K6 red 1 (`dfred/main.swift:2`), twin 0; `CRed` (public `OpaquePointer?`) exit 1, `CGreen` 0 under strict-as-error.
- Binds: any target that wraps C (libarchive, BoringSSL, sqlite). Corpus pattern: sourcekit-lsp@c6ce93d5f8aa:Sources/SourceKitD/SKDRequestDictionary.swift:57,65-67.

**SW-SEC-11 (SHOULD for C-wrapping and pointer-parsing targets, CONSIDER elsewhere; tools 6.2).** Targets that import a C module, hold `Unsafe*Pointer` / `OpaquePointer` / `Unmanaged` outside tests, or parse untrusted bytes through unsafe pointers set `.strictMemorySafety()` and, in CI, `.treatWarning("StrictMemorySafety", as: .error)`. Ordinary targets do not; it is never a repo-wide gate. Acknowledge a C call with `unsafe` on the call expression (`unsafe cbuf_sum(a, a.count)`), not around a closure that also uses `$0`: the closure form errors on 6.3.3 and is clean on 6.4. Strict mode lists every *use* of a `nonisolated(unsafe)` variable (the declaration is silent); the seam file lists them (policy: SW-CONC-09).
- Why: SE-0458 is opt-in by design with "no path toward becoming the default"; it is the only compiler check that audits every unsafe use. It is an audit trail, not a lifetime checker (SW-SEC-09), which is why it is SHOULD and not MUST [UI §3].
- Check: `swift build --target <seam-target>` exits non-zero on an unacknowledged use; `grep -rn --include='Package*.swift' -e 'strictMemorySafety' .` lists enabled targets (every C-wrapping target must be listed). Diagnostics on 6.4: `expression uses unsafe constructs but is not marked with 'unsafe' [#StrictMemorySafety]`, `class 'Buffer' has storage involving unsafe types`, `'@preconcurrency' import is not memory-safe ...`.
- Red: **yes**, [UI V7, V11] and [CR1]: `RedLib` exit 1 (`RedLib.swift:8:32`), `GreenLib` 0, `PlainRed` (flag off, same code) 0; `CRed` 1 (`CRed.swift:3:20`), `CGreen` 0; spelling A (closure, inner `unsafe` only) rc 1 on 6.3.3, rc 0 on 6.4.
- Binds: library and SDK with a C seam; CLI and server with a C dependency of their own; not Apple app code.

**SW-SEC-12 (SHOULD, tools 6.2).** `unsafe` is an acknowledgement, not a fix. Never add it, or run `swift package migrate --to-feature StrictMemorySafety`, to silence a warning without reading the site; keep `unsafe` expressions inside designated seam files; every `@safe` declaration carries a `// SAFETY: <invariant>` comment naming what makes it safe.
- Why: the migration marks every flagged site mechanically (`for i in 0..<b.count { t += Int(b[i]) }` becomes `unsafe t += Int(b[i])`) and leaves `firstBytePointer` alone [UI §3, V12]. swift-collections has 5,310 lines containing `unsafe ` in 324 files and 0 `// SAFETY` comments, so its safety claims are currently unreviewable (the audit counts 4,967 `unsafe` expression sites corpus-wide; the numbers differ by definition, the 0 does not).
- Check (reading heuristic, no mechanical test can tell whether a site was read): review every added acknowledgement as new code, `git diff -U0 -- '*.swift' | grep -E '^\+.*\bunsafe\b'`; `grep -rn --include='*.swift' -e '@safe' Sources` and read the preceding line for `SAFETY:`; `grep -rln --include='*.swift' -e '\bunsafe ' Sources` must list only declared seam files.
- Red: the mechanical-insertion behaviour is measured ([UI V12]); the convention itself has no run (`SAFETY:` has 0 corpus adoption: 1 hit in swift-foundation, 0 in swift-collections, vapor and swift-testing).
- Binds: C seams and pointer parsers; a new convention for the program (the Rust `// SAFETY:` rule has no Swift precedent in the corpus).

#### D. Caught by a canary or an output-byte count

**SW-SEC-13 (MUST, any Swift).** A credential (token, password, `Authorization` value, cookie, API key, presigned signature) is held in a `Secret` type whose `description` and `debugDescription` are fixed, whose `customMirror` is empty, that is not `Codable`, and whose `reveal()` is the single egress; a plain `String` credential field exists only inside the function that builds the header. Log metadata whose key names a credential (`authorization`, `cookie`, `password`, `token`, `secret`, `api-key`) takes `.stringConvertible(Secret(...))` only; header logging is off by default and an allow-list of header names beats a deny-list. Never log, interpolate or `dump` an HTTP client's request, header map or authorization object. `Secret` stops `description`, `dump` and `Mirror` leaks only; it does not zero memory or protect against a debugger, and no document may claim more (Rust SEC-32/33).
- Why: swift-log has no privacy model (`Logger.MetadataValue` is `.string`, `.stringConvertible`, `.dictionary`, `.array`; swift-log@4038b6a4f74a:Sources/Logging/Logger.swift:1155-1163). async-http-client 1.36.2 `HTTPClient.Authorization` prints its bearer token through interpolation, `String(describing:)` and `dump`, and `HTTPClientRequest.headers` prints `Authorization: Bearer ...` (async-http-client@017115279d09:Sources/AsyncHTTPClient/HTTPHandler.swift:466-479) [UI §6, V14, V15].
- Check: the canary of SW-SEC-16; K7a `grep -rn --include='*.swift' -i -e 'metadata:.*authorization' -e 'metadata:.*password' -e 'metadata:.*token' -e 'metadata:.*secret' -e 'metadata:.*cookie' -e 'metadata:.*api-key' Sources | grep -v -e '\.stringConvertible(' -e 'secret-ok:'`; reading heuristic `grep -rn --include='*.swift' -i -e 'var [a-z]*password: String' -e 'var [a-z]*token: String' -e 'let [a-z]*token: String' -e 'let [a-z]*secret: String' Sources`.
- Red: **yes**, [UI V14, V15, V23 K7a] and [CR2]: `logred` canary count 3, `loggreen` 0; `ahcleak` 3 outputs contain the canary; K7a red 1 (`logred/main.swift:12`), twin 0. The stored-field grep is a reading heuristic.
- Binds: CLI, SDK, server. Apple apps use the type; `os.Logger` `OSLogPrivacy` behaviour is `unverified: read only`.

```swift
public struct Secret: Sendable, CustomStringConvertible, CustomDebugStringConvertible, CustomReflectable {
    private let value: String
    public init(_ value: String) { self.value = value }
    public func reveal() -> String { value }                       // the single egress, a review point
    public var description: String { "<redacted>" }
    public var debugDescription: String { "<redacted>" }
    public var customMirror: Mirror { Mirror(self, children: [:]) } // dump() and Mirror print nothing
}                                                                   // deliberately not Codable
logger.info("request", metadata: ["Authorization": .stringConvertible(Secret(authHeader))])
```

**SW-SEC-14 (MUST, any Swift).** Every `URL` that enters error text, a log line, metadata or a terminal passes through `redacted(_:)` (drops userinfo and fragment, replaces every query value); errors store the redacted string at construction. Render a foreign `URLError` / `NSError` with `localizedDescription` and `redacted(failingURL)`, never `"\(error)"` (SW-ERR-18).
- Why: `"\(urlError)"` prints `NSErrorFailingURLKey=http://user:CANARY@...?X-Amz-Signature=CANARY`; `localizedDescription` does not; OCI blob redirects are presigned URLs [UI §6, V16].
- Check: K7b `grep -rn --include='*.swift' -e '\\(url' -e '\\(.*[uU][rR][lL])' -e '\\(request.url' Sources | grep -v -e 'redacted'` (a safe-by-construction line carries a trailing `// redacted: <why>`); the canary test.
- Red: **yes**, [UI V14, V16, V23 K7b]: K7b red 4 lines, twin 0; `logred` 3 canary lines, `loggreen` 0; `urlerr` 2 canary lines via interpolation and `failingURL`, 0 via `localizedDescription` (6.4 and 6.3.3).
- Binds: CLI, SDK, server.

```swift
public func redacted(_ url: URL) -> String {                        // userinfo, fragment and query values gone
    guard var c = URLComponents(url: url, resolvingAgainstBaseURL: false) else { return "<unparseable url>" }
    c.user = nil; c.password = nil; c.fragment = nil
    c.queryItems = c.queryItems?.map { URLQueryItem(name: $0.name, value: "REDACTED") }
    return c.string ?? "<unparseable url>"
}
```

**SW-SEC-15 (MUST, any Swift).** A secret reaches the process through stdin, a `0600` file (SW-IO-21) or the platform credential store, never as an `@Option` or `@Argument` value. An environment variable is allowed only as the documented non-interactive (CI) channel: it is wrapped in `Secret` on read, redacted from logs and error text, and not forwarded to a child that does not need it.
- Why: `argv` is world-readable (`/proc/<pid>/cmdline` is mode 444); `/proc/<pid>/environ` is owner-only 400 but children inherit it and CI dumps it [CR3]. The fleet's own SDK sends a login token on stdin (`--password-stdin`, ocx-sdk-python@80136dde4162:src/ocx_sdk/_client.py:448,474) and the CLI's documented env channel is `OCX_AUTH_<SLUG>_*`, redacted from logs and errors and inherited by spawned children (ocx-sdk-python@80136dde4162:site/src/content/docs/reference/environment/auth.md). This relaxes the Rust cli-contract CLI-11 text ("or a plain env var") to match that practice; see "Conflicts resolved".
- Check: K12 `grep -rnE --include='*.swift' '@(Option|Argument).* var [a-zA-Z]*([pP]assword|[tT]oken|[sS]ecret)' Sources | grep -v -e 'File' -e 'Stdin' -e 'Env'` (the dive's pattern named `@Option` only, narrower than this rule's `@Argument` clause: [CR9]).
- Red: **yes**, [UI V23 K12] and [CR9]: red 2 lines (`rules/bad/Cli.swift:3,4`), twin 0 (`passwordStdin` flag, `tokenFile`); the widened grep also catches `@Argument var secret` (2 lines on `greps/bad`, 0 on `greps/good`; the dive's pattern 1); the 444/400 modes are [CR3].
- Binds: CLI. SDK: pass the token to the CLI child on stdin or in the documented env triple, never in the child's argv.

**SW-SEC-16 (MUST, any Swift).** A canary test runs every failing and verbose path of the CLI or SDK with a unique secret value in the credential inputs and asserts the value never appears in stdout, stderr or the log sink. SHOULD, an SDK clause that was not fixture-run and does not carry the MUST: an SDK that captures a child process's output also hands the canary to a fake child that echoes it on stderr, and asserts the surfaced error text is clean (the SDK scrubs the exact credential values it handed the child before the text enters an error; consolidator addition from ocx-sdk-python).
- Why: only a runtime check sees leaks through library types, `dump`, `Mirror` and Foundation errors [UI §6]. ocx-sdk-python redacts credentials "from logs and error text", including host-exported ones (ocx-sdk-python@80136dde4162:site/src/content/docs/reference/environment/auth.md).
- Check: `printf '%s' CANARY123 | "$BIN" <failing-case> --password-stdin 2>&1 | grep -c CANARY123` must print `0` (judge by the printed count; `grep -c` exits 1 on zero matches). Adapt to the channel of SW-SEC-15.
- Red: **yes** for the harness shape, [UI V14] and [CR2]: `logred SECRETCANARY123 2>&1 | grep -c SECRETCANARY123` prints 3, `loggreen` prints 0. The fake-child clause and the stdin variant are not run.
- Binds: CLI, SDK, server. This is test code: it lives in the test target and is the verification of SW-SEC-13, -14 and -15.

**SW-SEC-17 (MUST for CLIs; library and SDK per the clause, any Swift).** All wire-supplied text reaches a terminal through `sanitizeForTerminal`, called at exactly three boundaries: the root `main()` error writer (the single stderr boundary of SW-CLI-02/03, composed after SW-ERR's `render(_:)`), the log handler (message, error text and every metadata value) and every human-format stdout render of registry text. It escapes (not strips) C0, DEL, C1, `Cf`, U+2028 and U+2029 as `\u{HEX}`, keeps `\n` and `\t`, is idempotent and is pinned by the 19-row corpus. Machine JSON stdout stays faithful (`JSONEncoder` escapes ESC and CR but writes U+202E and U+2028 raw); sanitise on a TTY or in the human format. A library or SDK applies it when it builds an error `message` from wire- or child-derived text and says in the docs that `message` is for people, `code` for programs. Do not substitute `debugDescription`, `String(reflecting:)`, `escaped(asASCII:)` or an `ESC[...m` regex.
- Why: ESC sequences "change console colors, move the cursor, clear the screen, or fake prompts" ([CWE-150](https://cwe.mitre.org/data/definitions/150.html)); OSC 52 writes the clipboard; bidi controls reorder what a human reads (CVE-2021-42574). ArgumentParser 1.8.2, swift-log 1.16.1 `StreamLogHandler` and `FileHandle.standardError.write` print the bytes raw; `debugDescription` and `String(reflecting:)` leave U+202E, U+0085, U+2028, U+200B, U+FEFF and U+009B raw; an SGR-only regex fails 16 of the 19 corpus rows [UI §7, V17-V22]. 0 of 40 exemplars sanitise wire text.
- Check: (a) structural, `grep -rl --include='*.swift' -e 'standardError' -e 'stderr' -e 'fputs' Sources | xargs -r grep -L -e 'sanitizeForTerminal'` lists stderr-writing files with no sanitiser (judge by output; `xargs` exits 123 when `grep -L` lists a file); (b) behavioural, in bash: `"$BIN" <hostile-registry-case> 2>&1 >/dev/null | LC_ALL=C grep -a -c -e '[[:cntrl:]]' -e $'\xc2[\x80-\x9f]' -e $'\xe2\x80[\x8b-\x8f\xa8-\xae]' -e $'\xe2\x81[\xa6-\xa9]' -e $'\xef\xbb\xbf'` must print `0` (`[[:cntrl:]]` also matches a tab: keep tabs out of the hostile case); (c) the corpus executable exits 0.
- Red: **yes**, [UI V17-V22] and [CR2]: `termred` count 1, `termgreen` 0; `termlog red` 1, `green` 0; `termargs validation` (ArgumentParser raw) 1; `termboundary validation|plain|exit3` 0 with exits 64 / 1 / 3; `sancorpus` exit 0, `sancorpusred` exit 1 (16 FAIL); 6.4 and 6.3.3. The SDK clause (sanitise on `message` construction) is a decision, not a run.
- Binds: CLI (root writer, log handler, stdout); server (log handler only); library and SDK (the `message` clause); Apple apps have no terminal and are out of scope.

```swift
public func sanitizeForTerminal(_ s: String) -> String {
    var out = String.UnicodeScalarView()
    for u in s.unicodeScalars {
        switch u.properties.generalCategory {
        case .control where u == "\n" || u == "\t": out.append(u)
        case .control, .format, .lineSeparator, .paragraphSeparator:
            out.append(contentsOf: "\\u{\(String(u.value, radix: 16, uppercase: true))}".unicodeScalars)
        default: out.append(u)
        }
    }
    return String(out)
}
```

The 19-row corpus (each row asserts the forbidden scalars are absent, the escaped form is present and the function is idempotent): CSI, OSC 8, OSC 52, tmux DCS, 8-bit CSI (U+009B), CR, NUL, DEL, BS, U+202E, U+2066 and U+2069, ZWSP, BOM, NEL, U+2028, plus CJK, emoji and `\n\t` that must survive. Cost: ZWJ emoji sequences render as `👨\u{200D}👩`; accepted.

#### E. Caught by a banned-API grep

**SW-SEC-18 (MUST, any Swift).** Random values that must be unguessable (tokens, nonces, salts, keys, session ids) come from `SystemRandomNumberGenerator` (explicit `using: &g`, or the default `random(in:)`) or `SymmetricKey(size:)`. No seeded or custom `RandomNumberGenerator`, no `rand()`, `random()`, `srand`, `drand48`, `arc4random*`. `UUID().uuidString` is an identifier, not an authentication token.
- Why: `SystemRandomNumberGenerator` is the CSPRNG on every platform (`getrandom(2)` on Linux, `arc4random_buf` on Apple, `BCryptGenRandom` on Windows; the last two `unverified: read only`) ([Random.swift](https://github.com/swiftlang/swift/blob/main/stdlib/public/core/Random.swift)); a custom generator is predictable [UI §8].
- Check: `grep -rn --include='*.swift' -e ': RandomNumberGenerator' -e 'arc4random' -e 'drand48' -e 'srand(' -e '\brand()' -e '\brandom()' Sources`; SwiftLint 0.65.1 `legacy_random` (default on) as a second net; it does not see a custom generator, the grep does.
- Red: **yes**, [UI V24]: `rules/bad/Rng.swift` 2 grep lines, good 0; `swiftlint lint` on bad: 2 `legacy_random` warnings (13:33, 13:70), good 0. Violated in the corpus: swift-system@486d48c80fce:Sources/System/MachPort.swift:68 (`mach_port_context_t(arc4random())`, Apple-only).
- Binds: all code.

**SW-SEC-19 (MUST, any Swift).** Cross-platform code imports `Crypto` (swift-crypto), never bare `import CryptoKit` (guard with `#if canImport(CryptoKit)` in Apple-only files). MAC tags compare with `isValidAuthenticationCode` or `SymmetricKey ==`, never `==` on bytes. `Insecure.MD5` and `Insecure.SHA1` appear only with `// insecure-ok: <why not authentication>`. No hand-rolled primitives. The dependency range is SW-PKG-25's; advisory floors are SW-SEC-20.
- Why: `no such module 'CryptoKit'` on Linux; `HMAC.isValidAuthenticationCode` compares with `safeCompare` (swift-crypto@1c80d3aff53f:Sources/Crypto/Message Authentication Codes/HMAC/HMAC.swift:205,214; `SymmetricKeys.swift:198`); MD5 and SHA-1 are collision-broken. Content-addressed digests (OCI) are SHA-256 or SHA-512 (SW-IO-13) [UI §8].
- Check: `grep -rn --include='*.swift' -e 'Insecure\.' Sources | grep -v -e 'insecure-ok:'`; `grep -rn --include='*.swift' -e 'import CryptoKit' Sources` (each hit under `#if canImport(CryptoKit)` or an Apple-only target); `swift build` on Linux. The MAC-compare half is a reading heuristic: the compare is not observable in a fixture.
- Red: **yes**, [UI V24, V25]: `import CryptoKit` exit 1 on Linux 6.4, `import Crypto` builds (`rngchk` exit 0); Insecure grep bad 1 line (`Rng.swift:14`), good 0.
- Binds: all code; Apple-only app targets may import CryptoKit.

#### F. Caught by the lockfile

**SW-SEC-20 (MUST for roots that ship, SHOULD for libraries, any Swift).** The committed `Package.resolved` of a root that ships (SW-PKG-26 kinds) pins every dependency at or above its advisory floor; the check below exits 0 in CI and floors are re-derived from the dependencies' repository advisories whenever a dependency is bumped. A library or SDK keeps its wide range (SW-PKG-25) and raises the *lower bound* (`"4.5.1" ..< "6.0.0"`) only when it calls the affected API.
- Why: a green scanner is not a safe tree. CVE-2026-43678, -97696, -97697, -102835, -43820 and -43823 return 0 from GitHub's global advisory API and OSV; swift-nio 2.100.0 is scanner-green and inside CVE-2026-43678's `<= 2.100.0` [UI §9, V27, CR5].
- Floors, dated 2026-10-10 (repository advisories, [CR5]): swift-nio `2.101.0` (CVE-2026-43678, -43671, -28980, -28970); swift-nio-ssl `2.37.2` (CVE-2026-43820, critical, out-of-bounds read from a non-string SAN, `>= 2.18.0, <= 2.37.1`); swift-nio-extras `1.34.1` (CVE-2026-28975, decompression ratio bypass); swift-crypto `4.5.1` (CVE-2026-43823, critical); hummingbird `2.26.0` (CVE-2026-97696, -97697, -102835).
- Check, floors (output = pins below a floor, exit 1 if any; an absent dependency passes; branch and revision pins have no version and are SW-PKG-09's):

```sh
f=Package.resolved; bad=0
floor() { jq -e --arg i "$1" --argjson m "$2" '[.pins[] | select(.identity==$i) | .state.version | select(. != null) | sub("[-+].*$";"") | split(".") | map(tonumber)] | all(. >= $m)' "$f" >/dev/null || { echo "BELOW FLOOR: $1 (need >= $3)"; bad=1; }; }
floor swift-nio '[2,101,0]' 2.101.0; floor swift-nio-ssl '[2,37,2]' 2.37.2; floor swift-nio-extras '[1,34,1]' 1.34.1
floor swift-crypto '[4,5,1]' 4.5.1; floor hummingbird '[2,26,0]' 2.26.0; exit $bad
```

  Discovery (review list; the feed is repository-level, so it works for CVEs you have not heard of): `jq -r '.pins[] | select(.location | test("github.com")) | .location' Package.resolved | sed -E 's#.*github.com/([^/]+/[^/.]+)(\.git)?$#\1#' | while read -r r; do echo "== $r"; gh api "repos/$r/security-advisories" --jq '.[] | select(.state=="published") | "\(.cve_id // .ghsa_id) \(.severity) vulnerable=\(.vulnerabilities[0].vulnerable_version_range) fixed=\(.vulnerabilities[0].patched_versions)"'; done`
- Red: **yes**, [CR4, CR5]: planted `floor/red` (swift-nio 2.100.0, swift-nio-ssl 2.37.1, swift-crypto 4.5.0, hummingbird 2.25.1, swift-nio-extras 1.34.0) prints 5 `BELOW FLOOR` lines, exit 1; `floor/green` (each at its floor) exit 0; the OSV-clean `scan/green` (swift-nio 2.100.0) prints `BELOW FLOOR: swift-nio` and exits 1; discovery on `scan/green` lists CVE-2026-43678 `vulnerable=<= 2.100.0 fixed=2.101.0`. The floor table is a dated snapshot, not a rule that ages well: re-run discovery before trusting it.
- Binds: CLI, server, daemon, app, container image; the SDK and libraries per the lower-bound clause.

**SW-SEC-21 (SHOULD, any Swift).** CI scans the lockfile with `osv-scanner scan source -L Package.resolved` (exit 1 on findings) and the repository enables Dependabot `package-ecosystem: swift` for alerts and update PRs; a release SBOM from SW-REL scans as `*.cdx.json`. A library that does not commit its lock (SW-PKG-27) scans the lock a fresh `swift package resolve` produces (reading, not run). Do not look for `swift package audit`: it does not exist.
- Why: three scanners read `Package.resolved` (OSV-Scanner via OSV-Scalibr `swift/packageresolved`, Trivy, Syft/Grype); GitHub's Swift feed holds 64 reviewed advisories and misses six well-known 2026 CVEs, so the scan is one input [UI §9]. Adoption is thin: 4 of 40 repos enable the Dependabot `swift` ecosystem and 0 scan `Package.resolved` in a workflow [CR8].
- Check: `osv-scanner scan source -L Package.resolved; echo $?`; `swift package audit; echo $?` prints `Unknown subcommand or plugin name 'audit'` and exits 64 on 6.3.3 and 6.4.
- Red: **yes** for OSV-Scanner 2.6.0, [UI V26, V28]: `scan/red` (swift-nio 2.62.0) exit 1, 3 vulnerabilities (GHSA-cq87-8r7h-962v, GHSA-r3rc-9hpw-54v9, GHSA-rj37-6j9x-74q6); `scan/green` (2.100.0) exit 0 `No issues found`. Dependabot, Trivy and Syft/Grype: `unverified: docs only`; Dependabot does not support Swift registries.
- Binds: roots that ship (SHOULD be in CI), libraries (lock produced in CI).

#### G. Reading heuristics only (no fixture was built; each says why)

**SW-SEC-22 (SHOULD, any Swift; carries S2).** `Int(_ double:)` on parsed floats uses `Int(exactly:)`; `lower...upper` and `lower..<upper` built from parsed bounds are preceded by `lower <= upper` in the same function.
- Why: NaN, infinity and out-of-range values trap, and `5...2` aborts the process (Hummingbird CVE-2026-97697, `Range: bytes=5-2`) [UI §2].
- Check: reading heuristic "every `a...b` or `a..<b` with parsed bounds has a dominating comparison" (a range built from a variable is not greppable); plus the runtime exit-code test.
- Red: runtime **yes**, [UI V6]: `range-trap 5` exit 132, `range-safe 5` exit 0 `[]`, `double-trap nan` exit 132, `double-safe nan` exit 0 `nil`; the heuristic is not run because dominance is not grep-expressible.
- Binds: CLI, server (HTTP `Range:` parsing, version ranges).

**SW-SEC-23 (SHOULD, any Swift).** Any decompressing reader sets an explicit finite limit (NIO `DecompressionLimit` via `decompression: .enabled(limit: ...)`), never `.none` or unlimited, and bounds the inflated size, not the compressed size.
- Why: ratio bombs; the related advisories are swift-nio-extras CVE-2026-28975 and swift-nio CVE-2026-28980 [UI §1, CR5]. Exposed types: async-http-client@017115279d09:Sources/AsyncHTTPClient/HTTPClient.swift:1227, vapor@bf77fc69b142:Sources/Vapor/Server/ServerConfiguration+RequestDecompressionConfiguration.swift:20.
- Check: `grep -rn --include='*.swift' -e 'decompression' -e 'DecompressionLimit' Sources` and read each hit for a finite limit.
- Red: **no**, reading heuristic: decompression-ratio behaviour was not run. Archive-layer bombs (libarchive) are not covered at all ("Open questions").
- Binds: server, HTTP clients, layer extraction.

**SW-SEC-24 (SHOULD, any Swift).** Wire names and tags are validated against their grammar at parse time and rejected on mismatch (OCI repository `[a-z0-9]+((\.|_|__|-+)[a-z0-9]+)*(\/...)*`, tag `[a-zA-Z0-9_][a-zA-Z0-9._-]{0,127}`); digests follow SW-IO-13. The parsed value type is the only thing that may become a path component or be printed unsanitised; the sanitiser of SW-SEC-17 is for free text only (registry `message`, `detail`). A `Regex` check uses `wholeMatch`, never `contains` or `firstMatch`.
- Why: validation removes the hostile bytes before they are in a string at all; the sanitiser is the catch-all, not the first line. The OCI spec leaves `message` free-form ("SHOULD be a human readable string or MAY be empty") [UI §7].
- Check: a table test, names with `\u{1B}`, `\r`, U+202E, uppercase and `..` all throw at parse (reading heuristic for coverage).
- Red: **no**: the grammar is the spec's and no fixture was built. This is the one MUST-candidate of the dive demoted for want of a run; a table-test fixture is the next round.
- Binds: CLI, SDK, OCI tooling.

### Conflicts resolved

1. **The map's commission (b) vs the dive's measurement.** The topic map's W3-5 brief expected `StrictMemorySafety` to flag a pointer escaping `withUnsafeBytes` (red) and stay silent on the scoped twin. The dive measured the opposite: the bare escape builds with exit 0 on 6.4 (exit 1 on 6.3.3) and an `unsafe`-acknowledged use-after-free builds clean. Re-run [CR1]: `EscapeOnly` rc 0, `RedLib` rc 1, `GreenLib` rc 0, `PlainRed` rc 0. **Resolved for the measurement**; the escape rule (SW-SEC-09) takes its red from `Span` and ASan, and no check depends on strict mode flagging a return.
2. **SW-SEC-12 MUST (dive) vs map conflict 10 SHOULD.** The dive says it "confirms conflict 10" and then writes MUST. **Resolved for the map: SHOULD for C-wrapping and pointer-parsing targets** (SW-SEC-11). Reasons: 3 of 40 repos enable it, all as warnings, none as an error; it is silent on escapes; the closure spelling fails on the 6.3 floor; the cost is 5,310 `unsafe` lines with no `SAFETY:` comment. The MUST weight moves to the checks that do catch memory errors (SW-SEC-06, -09, -10).
3. **Credentials in the environment: dive vs Rust CLI-11 vs fleet practice.** The dive allows "the environment"; `rules/rust-quality/cli-contract.md` CLI-11 says "never accept a secret through a flag value or a plain env var"; the fleet's own CLI documents `OCX_AUTH_<SLUG>_*` and its SDK writes it. **Resolved for fleet practice with a guard** (SW-SEC-15): a flag value is banned (`cmdline` is mode 444, [CR3]); an env var is the documented CI channel only, wrapped, redacted and not forwarded. `/proc/<pid>/environ` is mode 400 here, so CLI-11's `/proc` reason is weaker than stated; the CI-dump and child-inheritance reasons stand. The owner may tighten (below).
4. **Advisory floors vs SW-PKG-25.** The dive's SW-SEC-27 and -30 put a swift-crypto floor of 4.5.1 in `from:` while SW-PKG-25 (SHOULD) says libraries use `"1.0.0" ..< "6.0.0"` and calls a single-major `from:` a defect. **Resolved by where the version is chosen** (SW-SEC-20): floors apply to the resolved pins of roots that ship; a library raises the lower bound of its half-open range only when it calls the affected API (`"4.5.1" ..< "6.0.0"` passes SW-PKG-25's grep).
5. **Escape (dive) vs strip (Rust SEC-34).** Rust strips with a VT state machine or keeps a printable-plus-`\n`/`\t` allowlist. **Resolved: escape** (SW-SEC-17): the dive's function is the allowlist variant, needs no state machine (no Swift VT library exists in 40 exemplars), turns ESC into inert text so OSC, DCS and tmux passthrough payloads cannot act, keeps the evidence visible, and is idempotent (measured, `sancorpus`). Rust SEC-35 (strip before truncate) does not carry: a truncation cannot leave a live escape because none survives. Cost: readability of legitimate `\r` progress text and ZWJ emoji.
6. **Depth ceiling 512 (dive) vs small stacks.** The dive caps at 512 because Foundation does. On a 128 KiB thread (musl's default, [musl wiki](https://wiki.musl-libc.org/functional-differences-from-glibc.html)) a depth-512 recursive parser exits 139 in debug [CR6]. **Resolved: default 64, anything larger needs the test on the smallest stack** (SW-SEC-01).
7. **Commit `Package.resolved` (dive SW-SEC-29) vs SW-PKG-27.** The dive says libraries "SHOULD" commit and scan the lock; SW-PKG-27 says a library ignores it. **Resolved for SW-PKG**: libraries do not commit the lock; they scan a lock produced in CI (SW-SEC-21).
8. **Duplicate rules.** Dropped: dive SW-SEC-17 (Sendable handle policy is SW-CONC-09; kept as a clause in SW-SEC-10), -28 (underscored swift-crypto symbols are SW-PKG-24), -31 (`generate-sbom` is SW-REL's, M-N-06; the 6.4-only fact stays in SW-SEC-21 as a pointer). Folded: -02 into -01, -16 into -11, -20 into -13, -25 into -17. SW-ERR's open questions 3 (chain sanitisation) and 6 (credentials in error text) are answered here by SW-SEC-17 and SW-SEC-13/-14.
9. **`unsafe` counts.** The dive counts 5,310 lines containing `unsafe ` in swift-collections; the language-shape audit counts 4,967 `unsafe` expression sites in the whole corpus (swift-collections 937 per 10k LOC, vapor 6.7, 36 repos zero). **Resolved: different definitions** (substring lines vs expression regex); both agree on "0 `SAFETY:` comments" and on who uses it.
10. **The dive left "swift-nio-ssl past CVE-2026-43820" without a number.** **Resolved with a re-run** [CR5]: fixed in 2.37.2.
11. **Dive rule text vs the dive's own greps.** Three rules are wider than the grep that verifies them: SW-SEC-03 names the shortest network read (`URLSession.data(from:)`) in the dive's failure table but its grep cannot see it; SW-SEC-08 bans `&+`, `&-`, `&*` but the grep matches only the spaced forms and misses `&+=`, `&-=`, `&*=`; SW-SEC-15 bans `@Argument` secrets but the grep names `@Option` only. **Resolved: widen the grep to the rule, not the rule to the grep** [CR9]; each widened form was watched red on a planted violation and green on a compliant twin.

### Consolidator re-runs

All 2026-10-10. `R=/home/mherwig/.cache/research-lang/swift-tools/run.sh`, `F=/home/mherwig/.cache/research-lang/swift-tools/fixtures/untrusted-input`, my fixtures under `fixtures/security-consolidation/`. Swift 6.4.0 only; the dive's 6.3.3 results stand unre-run.

- **CR1, strict memory safety.** `cd $F/sms; $R swift build --scratch-path /home/mherwig/.cache/research-lang/swift-tools/build/security-consol-1 --target T` for T in `RedLib` (rc 1, `RedLib.swift:8:32: error: expression uses unsafe constructs but is not marked with 'unsafe'`), `GreenLib` (rc 0), `PlainRed` (rc 0), `EscapeOnly` (rc 0), `SpanRed` (rc 1, `SpanRed.swift:2:23: error: a function cannot return a ~Escapable result`), `CRed` (rc 1, `CRed.swift:3:20: error: class 'Buffer' has storage involving unsafe types`), `CGreen` (rc 0).
- **CR2, hostile-input binaries** (built from the dive's `pkg`, run inside `$R bash` with `SWIFT_BACKTRACE=enable=no`): `deepred 100000` 139; `deepgreen 100000` 65, `63` 0, `65` 65; `listred 100000 kids` 139; `listgreen 3000000` 0; `dfred` 134; `dfgreen` 0; `allocred` 134; `allocgreen` 65; `sancorpus` 0; `sancorpusred` 1; canary count `logred` 3, `loggreen` 0; control/bidi line count `termred` 1, `termgreen` 0; `termboundary validation|plain|exit3` exits 64 / 1 / 3 with 0 control lines.
- **CR3, /proc modes.** `stat -c '%a %n' /proc/$$/cmdline /proc/$$/environ` prints `444 .../cmdline` and `400 .../environ`.
- **CR4, floor check.** The script in SW-SEC-20 against `fixtures/security-consolidation/floor/red/Package.resolved` (exit 1, 5 lines), `floor/green/Package.resolved` (exit 0), `$F/scan/green/Package.resolved` (exit 1, `BELOW FLOOR: swift-nio`). A prerelease pin (`2.101.0-beta.1`) and an absent dependency pass; a branch pin (no version) passes too, which is SW-PKG-09's to forbid.
- **CR5, repository advisories.** `gh api repos/<owner>/<repo>/security-advisories` for apple/swift-nio-ssl, apple/swift-nio, apple/swift-crypto, hummingbird-project/hummingbird, apple/swift-nio-extras, vapor/vapor, swift-server/async-http-client gave the floors in SW-SEC-20 (vapor and async-http-client have no 2026 repository advisory). `gh api -X GET advisories -f cve_id=<CVE> -f type=reviewed --jq 'length'` prints 0 for CVE-2026-43678 and CVE-2026-97696, 1 for CVE-2026-43671 (the global-feed gap reproduced).
- **CR6, recursion on small stacks.** `fixtures/security-consolidation/stack.swift`: the dive's `deepred` parser on a Foundation `Thread` with `stackSize` set, compiled `-Onone` and `-O`, one process per depth. 128 KiB: debug passes 64, 128, 256 and exits 139 at 512 and above; release passes through 512 and exits 139 at 1024. 512 KiB: debug passes through 1024 and exits 139 at 2048; release passes through 2048 and exits 139 at 4096. This simulates musl's 128 KiB default on a glibc host; the static Linux SDK itself was not run.
- **CR8, scanner adoption.** In `/home/mherwig/.cache/research-lang/exemplars/swift`: `grep -rIl -i -e 'osv-scanner' -e 'trivy' -e 'grype' -e 'anchore' -e 'dependency-review' -e 'snyk' --include='*.yml' --include='*.yaml' .` hits only tuist (`server.yml` Trivy for the Elixir server, plus Helm values); `find . -maxdepth 4 -path '*/.github/dependabot.y*ml'` finds 23 files, of which 4 carry `package-ecosystem: swift`. Read-only.
- **CR9, grep gaps.** `fixtures/security-consolidation/greps/{bad,good}/Gaps.swift` (grep-only, not compiled). `bad` holds `@Argument var secret`, `@Option var apiToken`, `x &+= b`, `x &*= 2`, `a &- b`, `y &-= 1`, `URLSession.shared.data(from:)` and `data(for:)`; `good` holds `@Flag var secretStdin`, `@Option var tokenFile`, `x &+= b // wrap-ok:` and a capped `URLSession.bytes(from:)` loop. Line counts bad/good: dive S4 grep 1/0, widened S4 4/0; dive K12 1/0, widened K12 2/0; dive K1 0/0, widened K1 2/0. Host-side `grep`, no toolchain. A false positive of the widened S4 pattern: `&*` in `f(&*p)`; none occurs in the fixtures.
- **CR7, fleet SDK reading.** ocx-sdk-python@80136dde4162: `src/ocx_sdk/_client.py:448,474` (`--password-stdin`, "never in argv") and `site/src/content/docs/reference/environment/auth.md` (`OCX_AUTH_<SLUG>_*`, redaction of host-exported credentials, child inheritance). Read-only.

### Traceability from the dive's IDs

[UI] 01, 02 -> 01; 03 -> 02; 04 -> 03; 05 -> 04; 06 -> 23; 07 -> 05; 08 -> 07; 09 -> 08; 10 -> 22; 11 -> 06; 12, 16, 17 -> 11 (17 also a clause of 10); 13 -> 12; 14 -> 09; 15 -> 10; 18, 20 -> 13; 19 -> 14; 21 -> 15; 22 -> 16; 23, 25 -> 17; 24 -> 24; 26 -> 18; 27 -> 19; 28 -> dropped (SW-PKG-24); 29 -> 21; 30 -> 20; 31 -> dropped (SW-REL).

## Applied to the exemplars and the future consumers

**Rules the strict exemplars already satisfy.**

| Rule | Exemplar | Evidence |
|---|---|---|
| SW-SEC-01 | hummingbird (post-fix), swift-protobuf, swift-foundation | `maxKeyDepth = 64` with guard (hummingbird@1bd3b407fb47:Sources/Hummingbird/Codable/URLEncodedForm/URLEncodedFormNode.swift:262,276); `messageDepthLimit = 100` (swift-protobuf@6c84c3dedac0:Sources/SwiftProtobuf/JSONDecodingOptions.swift:22); `guard self.depth < 512` (swift-foundation@aadd9259be07:Sources/FoundationEssentials/JSON/JSONScanner.swift:290) |
| SW-SEC-03 | containerization, hummingbird, vapor, async-http-client | 4 MiB `bufferSize` and 1 MiB error body (containerization@3e7bc39e66b3:Sources/ContainerizationOCI/Client/RegistryClient.swift:106, `RegistryClient+Error.swift:53`); `collect(upTo:)` in hummingbird 11 files, vapor 9, containerization 6, async-http-client 4 |
| SW-SEC-10 | sourcekit-lsp (the owner class) | one owner, release in `deinit` (sourcekit-lsp@c6ce93d5f8aa:Sources/SourceKitD/SKDRequestDictionary.swift:57,65-67) |
| SW-SEC-11 | swift-collections, vapor, swift-testing | `.strictMemorySafety()` at swift-collections@935f696a549a:Package.swift:111, vapor@bf77fc69b142:Package.swift:246, swift-testing@c7d68ca20cd7:Package.swift:199 (as warnings) |
| SW-SEC-13 (allow-list half) | hummingbird | `includeHeaders: .none`, `redactHeaders` on included headers only (hummingbird@1bd3b407fb47:Sources/Hummingbird/Middleware/LogRequestMiddleware.swift:51-62,108,122); `redactingQueryParameters` (`TracingMiddleware.swift:56-62`) |
| SW-SEC-18, -19 | swift-crypto, containerization | CSPRNG at swift-crypto@1c80d3aff53f:Sources/CryptoExtras/AES/AES_CTR.swift:65; `safeCompare` at `HMAC.swift:205,214` and `SymmetricKeys.swift:198`; `import Crypto` in 23 containerization files |

**Rules prominent exemplars violate (or sit outside).**

| Rule | Exemplar | Evidence |
|---|---|---|
| SW-SEC-01 | hummingbird before 2.26.0 | CVE-2026-97696: unbounded recursion in `URLEncodedFormDecoder`; `recursionLimit` / `maxNesting` appear in 0 repos |
| SW-SEC-03 | swift-package-manager, tuist, swift-argument-parser, container | `readDataToEndOfFile` in 5, 4, 4 and 3 files; mostly local trusted input, so these are candidates not defects, but none carries a `bounded:` marker (0 adoption) |
| SW-SEC-05, -07 | swift-nio before 2.101.0 / 2.100.0 | CVE-2026-43678 (`Int(lengthQWord)` before `maxFrameSize`), CVE-2026-43671 (`truncatingIfNeeded`) |
| SW-SEC-06 | all pointer-parsing exemplars except swift-protobuf | only swift-protobuf runs ASan in CI (`build.yml:148-176`); TSan in SwiftLint and hummingbird; vapor sets TSan off ([gates Axis 3]) |
| SW-SEC-10 | swift-crypto before 4.5.1; sourcekit-lsp | CVE-2026-43823 (catch frees, `deinit` frees); sourcekit-lsp@c6ce93d5f8aa:Sources/SourceKitD/SourceKitDCore.swift:78-83 closes the library handle from a detached task in `deinit`, where teardown order against process exit is not guaranteed |
| SW-SEC-11 | sourcekit-lsp, containerization, swift-crypto | 37 of 40 repos do not enable strict mode, including every C-wrapping repo except swift-collections; none uses `.treatWarning("StrictMemorySafety", as: .error)` |
| SW-SEC-12 | swift-collections | 5,310 `unsafe` lines, 479 `@safe` / `@unsafe` lines, 0 `// SAFETY` comments |
| SW-SEC-13 | async-http-client | `Authorization` prints its bearer token three ways (async-http-client@017115279d09:Sources/AsyncHTTPClient/HTTPHandler.swift:466-479); `CustomReflectable` redaction in 0 of 40 repos |
| SW-SEC-17 | every CLI and logger in the corpus | 0 of 40 sanitise wire text; swift-argument-parser and swift-log print raw (measured); tuist filters `controlCharacters` from a path only (tuist@2f6ac74754bf:swifterpm/Sources/swifterpm/Restore.swift:1374) |
| SW-SEC-18 | swift-system | `mach_port_context_t(arc4random())` (swift-system@486d48c80fce:Sources/System/MachPort.swift:68, Apple-only) |
| SW-SEC-19 | tuist, container | `Insecure.MD5` / `SHA1` as cache and avatar keys (tuist@2f6ac74754bf:cli/Sources/TuistCore/ContentHashing/ContentHasher.swift:23; container@f70ecbb926d9:Tests/ContainerAPIServiceTests/KernelServiceTests.swift:153), none marked `insecure-ok:`; not authentication, so a missing marker rather than a defect |
| SW-SEC-21 | all 40 | [CR8]: 0 of 40 workflows run `osv-scanner`, Grype, Snyk or dependency-review over Swift dependencies (tuist runs Trivy for its Elixir server only, tuist@2f6ac74754bf:.github/workflows/server.yml:570); 23 repos have a Dependabot config and 4 enable the `swift` ecosystem (vapor, IceCubesApp, SwiftLint, hummingbird), the other 19 update GitHub Actions only |

**New commitments for the Swift SDK wrapping ocx** (mirrors ocx-sdk-python@80136dde4162): the login token goes to the CLI on stdin, the auth triple in the child environment only, both held as `Secret` and scrubbed from captured child output before it enters an error (SW-SEC-13, -15, -16); error `message` text built from child or registry output goes through `sanitizeForTerminal` (SW-SEC-17); decoding the CLI's JSON uses `JSONDecoder` under a size cap and subprocess output uses SW-IO-03's `limit:` (SW-SEC-01, -03); a library does not commit `Package.resolved` and raises a lower bound only when it calls an affected API (SW-SEC-20, -21). With only stdlib and swift-subprocess (owner default Q4) there is no C seam, so SW-SEC-06 and -09 to -12 do not apply until one appears.

**New commitments for Swift CLIs in the ocx/grimoire mould:** the root `main()` error writer calls `sanitizeForTerminal` after `render(_:)` and exits with the SW-CLI `Status` (SW-SEC-17; SW-CLI-05 gains no rule); credentials never enter `argv` (SW-SEC-15); a canary test per failing path (SW-SEC-16); length-prefixed and digest-bearing wire fields are converted with `exactly:` and capped before allocation (SW-SEC-04, -05); names and tags validated at parse (SW-SEC-24); `Package.resolved` committed (SW-PKG-26) and held at the SW-SEC-20 floors.

**New commitments for OCI tooling in the containerization mould:** registry bodies capped at 4 MiB and error bodies at 1 MiB (SW-SEC-03); a libarchive-style C seam gets SW-SEC-06, -09, -10 and -11, plus SW-IO-20 for traversal; layer decompression has no researched rule yet (SW-SEC-23 covers HTTP content-encoding only).

## AI-agent failure modes

Ranked by expected frequency times blast radius. Agent failure itself is unmeasured (the swift-errors consolidation says the same); the counts are the human-written proxy, the order is judgement.

| # | Mistake | Why it compiles or looks right | Mechanical check |
|---|---|---|---|
| 1 | `Data(contentsOf:)`, `readDataToEndOfFile()` or `URLSession.data(from:)` on a registry response or stdin | shortest API; 311 MB RSS, exit 0 | K1 grep; stdin exit-65 test (SW-SEC-03) |
| 2 | Interpolates `"\(error)"`, `"\(url)"` or `print(error)` into error text, logs or metadata; logs `Authorization` | debugging habit; Foundation errors and HTTP client types print the URL userinfo, presigned query and bearer token | K7a, K7b greps; canary test (SW-SEC-13, -14, -16; SW-ERR-18) |
| 3 | `Int(x)` on a `UInt64` / `UInt32` wire field, `UInt32(truncatingIfNeeded:)` to "fix" a conversion error, `&+` to silence a trap | silences the compiler or the crash; exit 132 or silent corruption | S1, S3, S4 greps; ASan run (SW-SEC-05, -06, -07, -08) |
| 4 | Hand-rolled recursive-descent parser (JSON, YAML, query string, config) or a `Codable` over a custom `Decoder` with no depth parameter | trained on parsers for trusted input; exit 139, not catchable | 100,000-deep exit-code test (SW-SEC-01); `deinit` drop test (SW-SEC-02) |
| 5 | Prints registry text raw and assumes ArgumentParser or `debugDescription` sanitises, or writes the sanitiser as an `ESC\[[0-9;]*m` regex | trusts the framework; copies the colour-strip idiom (16 of 19 corpus rows fail) | structural grep and byte-count (SW-SEC-17); the corpus executable |
| 6 | `@Option var password: String` or `--token` | natural CLI shape; `cmdline` is world-readable | K12 grep (SW-SEC-15) |
| 7 | Runs `swift package migrate --to-feature StrictMemorySafety` or sprinkles `unsafe`; believes strict mode proves safety; returns `buffer.baseAddress` from `withUnsafeBufferPointer`; `let p = UnsafePointer(&x)` | the diagnostic is a warning with an obvious fix-it; the flag is silent on a returned pointer | `Span` compile error, ASan, `TemporaryPointers` build-log grep, diff review (SW-SEC-09, -11, -12) |
| 8 | Public Swift wrapper around a C handle with `public var raw: OpaquePointer?`, `free` in both the `init` error path and `deinit` | C-style cleanup | K5 / K6 greps; malformed-input `init` under ASan (SW-SEC-10) |
| 9 | "Dependabot / OSV is green, so we are patched"; searches for or invents `swift package audit` | assumes scanners are complete; the command exists in npm and cargo | floor script and discovery (SW-SEC-20); `swift package audit` exits 64 |
| 10 | `import CryptoKit` in cross-platform code; `SHA256.hash(...).hexString` / `digest.count` (no such members); `UUID().uuidString` or a seeded generator as a token; `arc4random()` / `drand48()` | CryptoKit examples and Stack Overflow idioms dominate | `swift build` on Linux; SW-SEC-18 / -19 greps and `legacy_random` |
| 11 | Raises `maxDepth` to 512 or 1000 "because Foundation does" | assumes the 8 MiB main-thread stack | the SW-SEC-01 test on a 128 KiB thread |
| 12 | Validates names with `contains` / `firstMatch` instead of `wholeMatch`, or skips validation and relies on the sanitiser | the regex matches a prefix; display safety is mistaken for path safety | table test (SW-SEC-24) |

## Open questions

Owner decisions (the program applies the default until told otherwise):

1. **Env var credentials.** Rust CLI-11 says no plain env var; the fleet's own CLI and SDK use `OCX_AUTH_*`. Default: SW-SEC-15 as written (flag banned, env only as the documented CI channel, wrapped and redacted). Say if you want CLI-11 parity (no env at all).
2. **SDK sanitising on `message` construction.** The dive places the sanitiser only at the CLI root. Default: an SDK or library also escapes wire- and child-derived text when it builds `message` (idempotent, so no cost to the CLI's second pass). Say if you want libraries to stay raw.
3. **`StrictMemorySafety` severity for fleet C seams.** Default: SHOULD (map conflict 10). Say if fleet targets that wrap a C library should be MUST with `.treatWarning(..., as: .error)` in CI.
4. **Marker comments** (`bounded:`, `truncate-ok:`, `wrap-ok:`, `redacted:`, `secret-ok:`, `insecure-ok:`, `SAFETY:`). 0 adoption, no tool reads them. Default: adopt, document in the index (same default as SW-ERR's `swallow-ok:`).
5. **Escape vs strip.** Default: escape (SW-SEC-17) although the Rust fleet rule strips. Say if cross-language parity matters more than the Swift-side simplicity.
6. **Advisory floor upkeep.** The SW-SEC-20 table is a 2026-10-10 snapshot. Default: floors are re-derived with the discovery command on every dependency bump, by whoever bumps; no scheduled job.
7. **JSON stdout and bidi.** Machine JSON containing U+202E is faithful but terminal-unsafe on `cat`. Default: leave it faithful and sanitise on a TTY or in the human format; unresolved in the dive.

Another research round (subarea and question):

1. **security/archive-and-layer-bombs.** What ratio and total-size limits does a libarchive-style layer extractor (containerization `ArchiveReader`) need, and how are they enforced and tested in Swift? SW-SEC-23 covers HTTP content-encoding by reading only; nothing covers tar+gzip/zstd layers, the OCI-specific risk.
2. **security/name-grammar-fixture.** A planted table-test fixture for SW-SEC-24: OCI repository and tag grammar as Swift `Regex` with `wholeMatch`, hostile names (ESC, CR, U+202E, `..`, uppercase, combining marks), watched red against a `contains` implementation. Today the rule is a reading heuristic.
3. **security/small-stack-recursion.** Re-measure recursion headroom on the real musl static Linux SDK and on Swift concurrency cooperative-pool and NIO event-loop threads, then confirm or move the 64 default and the 128 KiB test (CR6 simulates musl on glibc).
4. **security/sdk-child-output-scrubbing.** A fixture for the SDK clause of SW-SEC-16: a fake child echoing the credential in plain, base64 (Basic auth), percent-encoded and URL-userinfo forms; which forms does an exact-value scrubber miss, and does the Python SDK's redaction cover them?
5. **security/http-header-validation.** Map row M-I-11 (P3, never researched): what must a Swift server or client validate in header names and values (CR/LF injection, size caps, duplicate `Content-Length`), and which of swift-nio's `HTTPHeaders` and Hummingbird's `HTTPField` checks already do it? Nothing in this file covers it.
6. **security/apple-privacy.** `os.Logger` privacy for dynamic strings, Keychain and Secure Enclave are `unverified: read only`; needs a macOS runner. Also: the `TemporaryPointers` non-escalation on 6.4 (exit 0 where 6.3.3 exits 1) looks like a regression and has no upstream issue checked.

## Sub-artifacts

- [swift-security/untrusted-input.md](swift-security/untrusted-input.md): the only sub-artifact (31 candidate rules SW-SEC-01 to -31, 28 verification runs V1-V28, 31 sources). Parser depth and size, S1-S6 conversions re-run on 6.4 and 6.3.3, `StrictMemorySafety` diagnostics pinned on 6.4, C seams and the swift-crypto double free, secret redaction, the terminal sanitiser and its 19-row corpus, crypto and randomness, `Package.resolved` scanners and the advisory-feed gap.

## Key sources

1. https://github.com/swiftlang/swift-evolution/blob/main/proposals/0458-strict-memory-safety.md (SE-0458, `unsafe` / `@unsafe` / `@safe`, the `StrictMemorySafety` group; Implemented 6.2)
2. https://github.com/swiftlang/swift-evolution/blob/main/visions/memory-safety.md (why it stays opt-in)
3. https://github.com/swiftlang/swift-evolution/blob/main/proposals/0480-swiftpm-warning-control.md (SE-0480 `.treatWarning`, Implemented 6.2)
4. https://github.com/swiftlang/swift-evolution/blob/main/proposals/0447-span-access-shared-contiguous-storage.md (SE-0447 `Span`, the safe replacement for escaping pointers)
5. https://www.swift.org/blog/swift-6.2-released/ ("best left for projects with the strongest security requirements")
6. https://github.com/swiftlang/swift/blob/main/stdlib/public/core/Random.swift (`SystemRandomNumberGenerator` per-platform CSPRNG)
7. https://github.com/apple/swift-crypto (`Crypto` vs `CryptoKit`, SemVer scope of underscored symbols)
8. https://github.com/apple/swift-crypto/security/advisories/GHSA-8q93-f6xh-4f6f (CVE-2026-43823, double free in a throwing `init`)
9. https://github.com/hummingbird-project/hummingbird/security/advisories/GHSA-97r6-mq85-c3rv (CVE-2026-97696, unbounded recursion)
10. https://github.com/apple/swift-nio/security/advisories/GHSA-qcc5-f287-vgmq (CVE-2026-43678, `Int(_:)` trap on a wire length)
11. https://github.com/opencontainers/distribution-spec/blob/main/spec.md (name and tag grammar, free-text `message`)
12. https://cwe.mitre.org/data/definitions/150.html (CWE-150, terminal escape and control sequences)
13. https://github.com/google/osv-scalibr/blob/main/extractor/filesystem/language/swift/packageresolved/packageresolved.go (what OSV-Scanner reads from `Package.resolved`)
14. https://docs.github.com/en/code-security/dependabot/ecosystems-supported-by-dependabot/supported-ecosystems-and-repositories (Dependabot `swift`, registry limits)
15. https://wiki.musl-libc.org/functional-differences-from-glibc.html (musl default thread stack 128k, fetched 2026-10-10)
