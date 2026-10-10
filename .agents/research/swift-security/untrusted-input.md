---
title: "Untrusted input in Swift 6.4: parser limits, memory safety, C seams, secrets, terminal-safe error text, crypto and scanning"
topic: "security/untrusted-input (SW-SEC): rows M-I-03, M-I-07, M-I-08, M-I-09, M-I-10, M-I-12, SW-ERR carried S1-S6, control-character sanitising (revised W3-5)"
agent: "W3-5 untrusted-input dive"
model: sonnet
date_researched: 2026-10-10
sources_count: 31
fixtures: /home/mherwig/.cache/research-lang/swift-tools/fixtures/untrusted-input/
scope: |
  Covers what a Swift CLI, SDK, server or OCI tool does with bytes it did not write: recursion and size limits,
  trapping conversions (absorbs SW-ERR's carried S1-S6), StrictMemorySafety and `unsafe`, C-seam ownership,
  secret redaction in logs and error text, terminal-control sanitising of error chains, crypto/random, and dependency scanning.
  Not covered: traversal guard (SW-IO-20), digest parsing (SW-IO-13), secret file modes (SW-IO-21), HTTP header validation (M-I-11),
  command injection (M-I-06), and everything Apple-only (Keychain, os.Logger privacy, Secure Enclave): those are marked "unverified: read only".
  Linux only, Swift 6.4.0 and 6.3.3 (every runnable check was run on both).
---

# Untrusted input in Swift 6.4

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   - 1 Recursion and size limits (M-I-03)
   - 2 Trapping conversions: SW-ERR's S1-S6 re-run
   - 3 StrictMemorySafety: what 6.4 flags, and what it does not
   - 4 `withUnsafe*` escapes and `Span`
   - 5 C seams and ownership
   - 6 Secrets in logs and error text (M-I-09)
   - 7 Terminal control characters in error chains
   - 8 Crypto and randomness (M-I-10)
   - 9 Dependency scanning (M-I-12)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- A hand-written recursive parser fed 100,000 nested arrays dies with SIGSEGV (exit 139) in debug and release; the same parser with a depth counter exits 65 with a typed error. Put a named `maxDepth` (default 64, never above 512) in every recursive parser; Foundation's `JSONDecoder` and `JSONSerialization` already stop at 512 (SW-SEC-01, -02).
- Bounding the parser is not enough: a tree whose nodes own `[Node]` children overflows the stack on `deinit` at 100,000 deep even when it was built iteratively (exit 139, debug and release). A singly linked class chain survives 10,000,000 nodes. Cap depth at parse time or tear the tree down with a work list (SW-SEC-03).
- Reading a 300 MB stdin with `readDataToEndOfFile()` peaks at 311 MB RSS; a capped chunked read stops at 1 MiB with exit 65 and 19 MB RSS. Allocating from a wire-declared length of 2^40 aborts with exit 134, not a throw (SW-SEC-04, -05).
- The six carried conversion rules (S1-S6) re-ran red/green on 6.4 and 6.3.3: `Int(UInt64 >= 2^63)` exits 132, the `exactly:` twin exits 65; the `truncatingIfNeeded` write overflow exits 0 in release and 1 under ASan (SW-SEC-07 to -11).
- StrictMemorySafety on 6.4 is a use-site audit, not a lifetime checker: it flags dereferences and unsafe calls, is silent on a pointer escaping `withUnsafeBufferPointer` (`EscapeOnly` exit 0 on 6.4, exit 1 on 6.3.3), and is silent on a fully `unsafe`-acknowledged use-after-free that ASan then catches (exit 1). Turn it on (as error) only for C-wrapping and pointer-parsing targets, which confirms the map's conflict 10 (SW-SEC-12 to -14).
- `swift package migrate --to-feature StrictMemorySafety` mechanically inserts `unsafe` at every flagged site; it silences the diagnostic and reviews nothing. Never run it as a fix (SW-SEC-13).
- `Span` (SE-0447, Swift 6.2) turns the escape into a compile error (`a function cannot return a ~Escapable result`); prefer it to `withUnsafeBufferPointer` wherever the callee takes a `Span` (SW-SEC-14).
- The swift-crypto double free (GHSA-8q93-f6xh-4f6f) reproduces in 10 lines of plain Swift: a throwing `init` that frees on its error path, plus a `deinit` that frees again, aborts with `free(): double free detected` (exit 134). One owner, one release site, validate before acquire (SW-SEC-15).
- `HTTPClient.Authorization` from async-http-client 1.36.2 prints its bearer token through string interpolation, `String(describing:)` and `dump`; a Foundation `URLError` interpolated with `"\(error)"` prints the failing URL with userinfo and presigned query, while `localizedDescription` does not. Wrap secrets in a `Secret` type and pass every URL through `redacted(_:)` before it enters text (SW-SEC-18, -19).
- swift-log has no privacy levels (`Logger.MetadataValue` is `.string`, `.stringConvertible`, `.dictionary`, `.array`); redaction is a type and a handler you write. A canary test (`grep -c CANARY` over stdout and stderr) goes 3 on the violation and 0 on the twin (SW-SEC-20, -22).
- ArgumentParser 1.8.2 prints `Error: ` lines raw: ESC, CR and U+202E reach the terminal (`od -c` shows `033`, `\r`, `342 200 256`). The sanitiser belongs in the root `main()` hook that SW-CLI-02/03 already require; the policy and corpus live here (SW-SEC-23).
- `String.debugDescription`, `String(reflecting:)` and `Unicode.Scalar.escaped(asASCII:)` escape ESC, CR and DEL but leave U+202E, U+0085, U+2028, U+200B, U+FEFF and U+009B raw. They are not a terminal sanitiser; an SGR-only regex strips 3 of 19 corpus rows and fails 16 (SW-SEC-23).
- `SystemRandomNumberGenerator` is the CSPRNG on every platform (getrandom(2), `arc4random_buf`, `BCryptGenRandom`); `import CryptoKit` does not build on Linux, `import Crypto` does; MAC tags compare with `isValidAuthenticationCode`, never `==` (SW-SEC-26, -27).
- There is no `swift package audit` (exit 64 on 6.3.3 and 6.4). Scan `Package.resolved`: `osv-scanner scan source -L Package.resolved` exits 1 on swift-nio 2.62.0 (3 advisories) and 0 on 2.100.0; Dependabot (`package-ecosystem: swift`), Trivy and Syft/Grype read the same file (SW-SEC-29).
- A green scanner is not a safe tree: of the 2026 advisories the map cites, CVE-2026-43678, -97696, -97697, -102835, -43820 and -43823 return 0 from GitHub's global advisory API, and swift-nio 2.100.0 is scanner-green yet inside CVE-2026-43678's `<= 2.100.0` range. Pin floors by hand and read repository advisories (SW-SEC-30).
- 6.4 added `swift package generate-sbom` (CycloneDX 1.7 and SPDX 3.0.1); 6.3.3 has no such subcommand (exit 64). The SBOM carries `pkg:swift/github.com/...@version` purls (SW-SEC-31).

## Findings

### 1. Recursion and size limits (M-I-03)

**The advisory shape.** Hummingbird's `URLEncodedFormDecoder` built a node tree with an unbounded recursive function; a crafted form POST exhausts the stack (CVE-2026-97696, GHSA-97r6-mq85-c3rv, high, CWE-674, `<= 2.25.1`, fixed in 2.26.0, "removed the recursion from the affected function and added a limit on the nesting depth", [GHSA-97r6-mq85-c3rv](https://github.com/hummingbird-project/hummingbird/security/advisories/GHSA-97r6-mq85-c3rv)). The fixed source states the value and the second failure mode: `static let maxKeyDepth = 64`, with the comment that a deep key "builds a node tree so deep that constructing *or* deallocating it overflows the stack" (hummingbird@1bd3b407fb47:Sources/Hummingbird/Codable/URLEncodedForm/URLEncodedFormNode.swift:257-262, guard at `:276`).

**Planted (a), measured** (`pkg/Sources/deepred`, `deepgreen`; Swift 6.4.0 and 6.3.3 identical):

| input nesting | `deepred` debug | `deepred` release | `deepgreen` (limit 64) |
|---|---|---|---|
| 1,000 and 20,000 | exit 0 | n/a | n/a |
| 50,000 | exit 139 (SIGSEGV) | n/a | n/a |
| 100,000 | exit 139 | exit 139 | exit 65, `error: nesting deeper than 64` |
| 1,000,000 | n/a | exit 139 | n/a |
| 63 / 65 | n/a | n/a | exit 0 / exit 65 |

The crash is a signal, not a Swift trap: no `Fatal error`, no catchable error, and a server process dies. The fix is one parameter:

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

**Foundation already caps at 512.** `JSONDecoder` and `JSONSerialization` on Linux throw at depth 512 (swift-foundation@aadd9259be07:Sources/FoundationEssentials/JSON/JSONScanner.swift:290, `guard self.depth < 512`; the same constant in `JSON5Scanner.swift:156` and `JSONScannerEventSource.swift:186`; plist scanners say "Too many nested arrays or dictionaries", `XMLPlistScannerEventSource.swift:157`). Measured: depth 511 decodes, 513 throws `DecodingError.dataCorrupted`; `JSONSerialization` at 100,000 throws `NSCocoaErrorDomain Code=3840 ... Too many nested arrays or dictionaries around character 513` (exit 65 in the fixture, no crash). A recursive `Decodable` is therefore safe under `JSONDecoder` because the scanner runs first; a hand-rolled parser, a YAML/XML/form decoder or a `Codable` conformance over a different `Decoder` is not. Other bounded decoders in the corpus: swift-protobuf `messageDepthLimit = 100` (swift-protobuf@6c84c3dedac0:Sources/SwiftProtobuf/JSONDecodingOptions.swift:22, consumed at `BinaryDecoder.swift:69`).

**Number choice.** 64 for wire formats the program defines or consumes with known shape (OCI manifests, indexes and configs nest under 10 levels; Hummingbird picked 64); 100 where a library fixes it (protobuf); 512 as the ceiling because that is what the platform decoder already accepts. A limit above 512 is a claim that the stack can hold it; the 100,000 fixture shows the stack cannot.

**Teardown recursion (not in the advisory title, in its comment).** Planted `pkg/Sources/listred`: a tree built in a loop (no parser recursion) as `final class Node { var kids: [Node] }` crashes on release at 100,000 deep (exit 139 debug, exit 139 release at 1,000,000). The twin `listgreen` moves children onto a work list in `deinit` and releases 3,000,000 nodes with exit 0:

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

Counter-intuitive, measured: a singly linked chain (`final class Link { var next: Link? }`) built 10,000,000 deep releases without crashing on 6.4 and 6.3.3 (exit 0). The runtime's release of the last field is a tail call there; array storage is not. Do not apply the work-list pattern to linked chains; apply it to any node that owns a collection of children. A flat representation (an `[Entry]` table with `Int` indices) avoids both problems and is what a fresh parser should prefer.

**Size.** Unbounded reads are the other half. `pkg/Sources/sizered` (`FileHandle.standardInput.readDataToEndOfFile()`) on a 300,000,000-byte stdin: exit 0, `VmHWM 311632 KiB`. `sizegreen` (chunked `read(upToCount:)`, running total checked before the append, 1 MiB cap): exit 65, `VmHWM 19008 KiB`; on 1,000 bytes it exits 0. Allocating from a declared length: `allocred` with `2^40` and with `2^63-1` both abort (exit 134, `Fatal error: failed to allocate 1099511627808 bytes of memory`), which is neither the integer-conversion trap (132) nor a throw. Bounded-read idioms in the corpus: `collect(upTo:)` in hummingbird (11 files), vapor (9), containerization (6), async-http-client (4); containerization's registry client defaults `bufferSize` to `Int(4.mib())` (containerization@3e7bc39e66b3:Sources/ContainerizationOCI/Client/RegistryClient.swift:106) and bounds the error body at 1 MiB (`RegistryClient+Error.swift:53`). Decompression has its own limit type, `NIOHTTPDecompression.DecompressionLimit` (async-http-client@017115279d09:Sources/AsyncHTTPClient/HTTPClient.swift:1227, vapor@bf77fc69b142:Sources/Vapor/Server/ServerConfiguration+RequestDecompressionConfiguration.swift:20); the CVEs it relates to are swift-nio-extras CVE-2026-28975 and swift-nio CVE-2026-28980 in GitHub's feed. Decompression ratio behaviour was not run here: reading only.

### 2. Trapping conversions: SW-ERR's S1-S6 re-run

SW-ERR carries these six rules without numbering them (swift-errors.md "Carried to SW-SEC"; evidence in `swift-errors/traps-and-unwraps.md` "security.md (SW-SEC)"). The fixtures were copied to `conv/` and re-run; every discrimination reproduced on 6.4.0 and 6.3.3:

| Carried | New ID | Red | Green |
|---|---|---|---|
| S1 convert untrusted ints with `T(exactly:)` | SW-SEC-07 | `ared 8000000000000000` exit 132 debug and release (`Swift/Integers.swift:3641: Fatal error: Not enough bits to represent the passed value`) | `agreen` exit 65 `invalidFrameLength(9223372036854775808)`; `agreen 10` exit 0 |
| S5 convert and bound before use | SW-SEC-07 (clause) | `bred` precondition passes on the truncated value | `bgreen` exit 65 `lengthOutOfRange` |
| S3 `truncatingIfNeeded` marker | SW-SEC-08 | release `bred write 4294967312` exit 0 `wrote 64 bytes into a 16-byte allocation`; ASan exit 1 `heap-buffer-overflow` | `bgreen` ASan exit 65 |
| S4 overflow arithmetic | SW-SEC-09 | `traps add-trap 1` exit 132; `wrap-add 1` exit 0 prints `-9223372036854775808` | `add-safe 1` exit 0 prints `overflow` |
| S2 float and range bounds | SW-SEC-10 | `double-trap nan` 132; `range-trap 5` 132 (`ClosedRange` with lower > upper, the CVE-2026-97697 shape) | `double-safe nan` 0 `nil`; `range-safe 5` 0 `[]` |
| S6 ASan for pointers with external size | SW-SEC-11 | as S3 | as S3 |

Advisory anchors: swift-nio CVE-2026-43678 (WebSocket 8-byte length through `Int(_:)`, `<= 2.100.0`, fixed 2.101.0, [GHSA-qcc5-f287-vgmq](https://github.com/apple/swift-nio/security/advisories/GHSA-qcc5-f287-vgmq)); CVE-2026-43671 (`UInt32(truncatingIfNeeded:)`, `<= 2.99.0`, fixed 2.100.0, [GHSA-r3rc-9hpw-54v9](https://github.com/advisories/GHSA-r3rc-9hpw-54v9)). The reciprocal pointer: SW-ERR-14 says "external integers: see SW-SEC-07"; SW-SEC-07 says "a thrown error, not a trap, at the parser boundary: SW-ERR-14".

### 3. StrictMemorySafety: what 6.4 flags, and what it does not

**The feature.** SE-0458, implemented in Swift 6.2: `-strict-memory-safety` flags every use of an unsafe construct; diagnostics are warnings in group `StrictMemorySafety`; acknowledge a use with the `unsafe` expression (like `try`/`await`, it does not propagate), declare with `@unsafe`, encapsulate with `@safe`; SwiftPM spelling `.strictMemorySafety()` ([SE-0458](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0458-strict-memory-safety.md)). Escalation is SE-0443 `-Werror StrictMemorySafety` or, in a manifest, SE-0480 `.treatWarning("StrictMemorySafety", as: .error)` ([SE-0480](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0480-swiftpm-warning-control.md), Implemented 6.2). The vision keeps it opt-in with no path to default because "most C(++) APIs are unlikely to ever adopt the safety-related attributes" ([memory-safety vision](https://github.com/swiftlang/swift-evolution/blob/main/visions/memory-safety.md)); the Swift 6.2 post says it is "best left for projects with the strongest security requirements" ([swift.org](https://www.swift.org/blog/swift-6.2-released/)). Map conflict 10 ("CONSIDER by default; SHOULD for C-wrapping or unsafe-pointer parsing; never a gate for ordinary code") is confirmed by this and by the corpus (3 of 40 repos enable it: swift-collections@935f696a549a:Package.swift:111, vapor@bf77fc69b142:Package.swift:246, swift-testing@c7d68ca20cd7:Package.swift:199).

**Diagnostics pinned on 6.4.0** (`zoo.sh`, `zoo2.sh`; `swiftc -typecheck -swift-version 6 -strict-memory-safety`), all `warning:` with `[#StrictMemorySafety]` unless noted:

| Construct | Message |
|---|---|
| dereference or call involving an unsafe type: `p.pointee`, `b[i]` on `UnsafeBufferPointer`, `s.load(as:)`, `unsafeBitCast`, `UnsafeMutablePointer.allocate`, `Unmanaged.passUnretained`, `d.withUnsafeBytes { $0[0] }`, a use of a `nonisolated(unsafe)` var | `expression uses unsafe constructs but is not marked with 'unsafe'` |
| `for x in unsafeBuffer` | `for-in loop uses unsafe constructs but is not marked with 'unsafe'` (plus the expression warning) |
| `@preconcurrency import Foundation` | `'@preconcurrency' import is not memory-safe because it can silently introduce data races; add '@unsafe' to indicate that this is unsafe` |
| `struct Z { var p: UnsafeMutablePointer<Int>? }` | `struct 'Z17' has storage involving unsafe types` (class: `class 'Buffer' has storage involving unsafe types`) |
| `-Ounchecked` with the flag | `'-Ounchecked' is not memory-safe and should not be combined with strict memory safety checking` |

Silent on 6.4 (all verified by `Zoo.swift` and `Zoo2.swift`): a function with an unsafe type in its signature, `a.withUnsafeBufferPointer { $0.count }` (safe members of an unsafe-typed parameter), declaring `nonisolated(unsafe)` or `unowned(unsafe)` (only uses of the variable warn), `@unsafe struct`, `@safe struct` with `@unsafe` storage. On 6.3.3 the closure-parameter forms `$0.count` were flagged (two more warnings in `Zoo.swift`); 6.4 relaxed that. The unsafe-expression syntax is a prefix on the expression, `for unsafe x in unsafe buf` for loops ([SE-0458](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0458-strict-memory-safety.md)). Related, not in the group: `initialization of 'UnsafePointer<Int>' results in a dangling pointer [#TemporaryPointers]` is a default warning that **cannot be escalated on 6.4**: `-warnings-as-errors`, `-Werror TemporaryPointers` and `-Xswiftc -Werror -Xswiftc TemporaryPointers` all exit 0 with the warning; on 6.3.3 the same flags exit 1. A gate on it must grep the build log.

**What the group does not do.** It is an audit trail, not a lifetime checker.
- `EscapeOnly` (`public func firstBytePointer(_ a: [UInt8]) -> UnsafePointer<UInt8>? { a.withUnsafeBufferPointer { $0.baseAddress } }`) builds with exit 0 under `.strictMemorySafety()` plus `.treatWarning(..., as: .error)` on 6.4; on 6.3.3 it exits 1. The escape is flagged only where something dereferences the result (`RedCaller` exit 1; `RedLib`'s own `b[i]` exit 1).
- `EscapeExe` acknowledges every unsafe use with `unsafe`, builds with exit 0 under the same strict-as-error settings, and under `swift build --sanitize=address` exits 1 with `AddressSanitizer: heap-use-after-free ... READ of size 1`; the scoped twin `EscapeTwin` exits 0.
- `swift package migrate --to-feature StrictMemorySafety` (6.4; `migrate` takes `--to-feature` for any feature, SwiftPM carries a fixture for this one at swift-package-manager@5546f44a3b52:Fixtures/SwiftMigrate/StrictMemorySafetyMigration/Package.swift) rewrote `for i in 0..<b.count { t += Int(b[i]) }` to `unsafe t += Int(b[i])` and `unsafeBitCast(x, to: Int.self)` to `unsafe unsafeBitCast(...)`, and left `firstBytePointer` alone. It turns warnings into acknowledgements without a review.

**Cost.** swift-collections has 5,310 lines containing `unsafe ` in 324 files and 0 `// SAFETY` comments (swift-collections@935f696a549a:Sources); vapor 16 lines, swift-testing 6, swift-foundation 48. The Rust `// SAFETY:` convention (`rust-quality/security.md` SEC-02) has no Swift counterpart in the corpus, so a SW-SEC comment convention would be new (SW-SEC-13).

### 4. `withUnsafe*` escapes and `Span`

Three compile-time or runtime catches, all measured on 6.4 and 6.3.3:

| Escape | Catch | Result |
|---|---|---|
| `func view() -> Span<UInt8> { let a: [UInt8] = [1,2,3]; return a.span }` (`SpanRed`) | compiler, no flag | exit 1 `error: a function cannot return a ~Escapable result` |
| `let p = UnsafePointer(&x); return p.pointee` (`TmpPtr`) | default warning group `TemporaryPointers` | exit 0; warning only on 6.4 (see section 3) |
| `a.withUnsafeBufferPointer { $0.baseAddress! }` returned from the function, acknowledged with `unsafe` (`EscapeExe`) | ASan | exit 1 `heap-use-after-free` |

`Span`/`RawSpan` (SE-0447, Implemented 6.2, [SE-0447](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0447-span-access-shared-contiguous-storage.md); `~Escapable` is SE-0446, [SE-0446](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0446-non-escapable.md)) is the replacement the 6.2 post advertises for pointer use-after-free ("Span maintains memory safety by ensuring the memory remains valid while you're using it", [swift.org](https://www.swift.org/blog/swift-6.2-released/)). `GreenLib` uses `a.span` and indexes it with no `unsafe` marker: strict-safety silent, exit 0. The C-library floor still needs pointers (section 5).

### 5. C seams and ownership

**Corpus.** sourcekit-lsp keeps the C handle in a `Sendable` class: `nonisolated(unsafe) let dict: sourcekitd_api_object_t` with `deinit { sourcekitd.api.request_release(dict) }` (sourcekit-lsp@c6ce93d5f8aa:Sources/SourceKitD/SKDRequestDictionary.swift:57, `:65-67`): one owner, one release site, the pattern SW-CONC already allows with its guard-and-reason clause. The same repo closes the library handle from a detached task in `deinit` (`SourceKitDCore.swift:78-83`), where teardown order is not guaranteed relative to the process; it does not enable StrictMemorySafety (its manifest has no `strictMemorySafety`). swift-collections and vapor do.

**Planted C seam** (`sms/Sources/CBuf` is a real C target: `cbuf_open`, `cbuf_close`, `cbuf_sum(const uint8_t*, size_t)`, `cbuf_dup`, `cbuf_free`). Under `.strictMemorySafety()` as error on 6.4:
- `CRed` (public class with `public var raw: OpaquePointer?`; `cbuf_sum(a, a.count)` with no `unsafe`; `String(cString: p!)`): exit 1, first error `class 'Buffer' has storage involving unsafe types`; with the class removed the C calls alone give one `expression uses unsafe constructs` warning per call (7 in the file, 6 for the calls).
- `CGreen` (`@safe public final class Buffer` with a `private let handle: OpaquePointer`, `deinit { unsafe cbuf_close(handle) }`, calls spelled `unsafe cbuf_sum(a, a.count)`): exit 0 on 6.4 and 6.3.3. The closure spelling `a.withUnsafeBufferPointer { b in unsafe cbuf_sum(b.baseAddress, b.count) }` is clean on 6.4 but errors on 6.3.3 (`2:40: error: expression uses unsafe constructs`); `unsafe a.withUnsafeBufferPointer { ... }` or the direct `unsafe cbuf_sum(a, a.count)` is clean on both. Use the direct form when the floor includes 6.3.

**Double free in a throwing `init` (swift-crypto GHSA-8q93-f6xh-4f6f).** CVE-2026-43823, critical, `>= 3.2.0, <= 4.5.0`, fixed 4.5.1: initialising `_RSA.*.PublicKey` from DER/PEM that BoringSSL cannot decode freed the `EVP_PKEY*` in the catch block and again in `deinit` ([advisory](https://github.com/apple/swift-crypto/security/advisories/GHSA-8q93-f6xh-4f6f)). Planted without any C library (`pkg/Sources/dfred`):

```swift
// incorrect: init frees on its error path; the half-built object's deinit frees again
final class PublicKey {
    private let handle: UnsafeMutableRawPointer
    init(der: [UInt8]) throws {
        handle = malloc(64)!
        guard der.count > 4 else { free(handle); throw ParseFailure.malformed }
    }
    deinit { free(handle) }
}
// correct: validate before acquiring; deinit is the only release site
init(der: [UInt8]) throws {
    guard der.count > 4 else { throw ParseFailure.malformed }
    handle = malloc(64)!
}
```

`dfred`: exit 134, `free(): double free detected in tcache 2`; `dfgreen`: exit 0. Both toolchains. Note `swift-crypto` is memory-safe Swift around BoringSSL: the one critical advisory in 4.x sits at the C seam, and 6 more seam advisories in the map (swift-nio-ssl CVE-2026-43820) do too.

### 6. Secrets in logs and error text (M-I-09)

**swift-log has no privacy model.** `Logger.MetadataValue` is `.string`, `.stringConvertible`, `.dictionary`, `.array` (swift-log@4038b6a4f74a, tag 1.16.1:Sources/Logging/Logger.swift:1155-1163); the docs carry no redaction guidance (no hit for "sensitive", "secret" or "privacy" under `Sources/Logging/Docs.docc`). Apple's `os.Logger` has `OSLogPrivacy` (`.auto`, `.private`, `.public`, `.sensitive`, with `mask:` hashes, [Apple](https://developer.apple.com/documentation/os/oslogprivacy.md)); its runtime behaviour for dynamic strings is Apple-only: `unverified: read only`. sourcekit-lsp uses `privacy: .public` 24 times, which shows the default is not public.

**Planted (c)** (`pkg/Sources/logred`, `loggreen`): swift-log 1.16.1 `StreamLogHandler.standardError` with `metadata: ["Authorization": "Bearer \(canary)", "url": "\(url)"]`, an error type that interpolates a `URL` with userinfo and a presigned query (`https://user:CANARY@registry.example/v2/app/blobs/sha256:abc?X-Amz-Signature=CANARY`), and an enum case carrying the `URL`. Output on the violation (all three lines contain the canary): `info app: Authorization=Bearer SECRETCANARY123 url=https://user:SECRETCANARY123@...`, `error: fetch failed: https://user:SECRETCANARY123@...`, `error: blobGone(https://user:SECRETCANARY123@...)`. Twin output: `Authorization=<redacted> url=https://registry.example/v2/app/blobs/sha256:abc?X-Amz-Signature=REDACTED`.

```swift
// incorrect
logger.info("request", metadata: ["Authorization": "Bearer \(token)", "url": "\(url)"])
struct FetchError: Error, CustomStringConvertible { let url: URL; var description: String { "fetch failed: \(url)" } }

// correct: a Secret type, and URLs redacted where they enter text
public struct Secret: Sendable, CustomStringConvertible, CustomDebugStringConvertible, CustomReflectable {
    private let value: String
    public init(_ value: String) { self.value = value }
    public func reveal() -> String { value }                       // the single egress, a review point
    public var description: String { "<redacted>" }
    public var debugDescription: String { "<redacted>" }
    public var customMirror: Mirror { Mirror(self, children: [:]) } // dump() and Mirror print nothing
}                                                                   // deliberately not Codable
public func redacted(_ url: URL) -> String {                        // userinfo, fragment and query values gone
    guard var c = URLComponents(url: url, resolvingAgainstBaseURL: false) else { return "<unparseable url>" }
    c.user = nil; c.password = nil; c.fragment = nil
    c.queryItems = c.queryItems?.map { URLQueryItem(name: $0.name, value: "REDACTED") }
    return c.string ?? "<unparseable url>"
}
logger.info("request", metadata: ["Authorization": .stringConvertible(Secret(authHeader)), "url": "\(redacted(url))"])
```

**Library types leak.** async-http-client 1.36.2 `HTTPClient.Authorization` stores the scheme privately and conforms to nothing printable, so `"\(auth)"`, `String(describing:)` and `dump(auth)` all print `Authorization(scheme: ...Scheme.Bearer("SECRETCANARY123"))` (`ahc/Sources/ahcleak`; async-http-client@017115279d09:Sources/AsyncHTTPClient/HTTPHandler.swift:466-479). `HTTPClientRequest.headers` interpolates `Authorization: Bearer SECRETCANARY123` and `req.url` prints the userinfo. Never log or interpolate an HTTP client's request, header or authorization value; wrap the token in `Secret` at your own boundary and only `reveal()` it into the header.

**Foundation errors leak the URL, not the description.** `URLSession.data(from:)` against `http://user:CANARY@127.0.0.1:1/blob?X-Amz-Signature=CANARY` fails with `URLError.cannotConnectToHost`; `localizedDescription` is `Failed to connect to 127.0.0.1 port 1 after 21 ms: Could not connect to server` (no canary), while `"\(error)"` prints `Error Domain=NSURLErrorDomain Code=-1004 ... NSErrorFailingURLKey=http://user:SECRETCANARY123@...` and `failingURL` returns the full URL (6.4 and 6.3.3; `urlerr`). This is the same finding as SW-ERR-18 from the security side: `localizedDescription` for a foreign Foundation cause, never interpolation, and `failingURL` goes through `redacted(_:)` before it is shown.

**The only allow-list-by-default example in the corpus** is Hummingbird's `LogRequestMiddleware`: `includeHeaders: HeaderFilter = .none` (nothing logged unless asked) and `redactHeaders: [HTTPField.Name] = []` applied only to headers that are included (hummingbird@1bd3b407fb47:Sources/Hummingbird/Middleware/LogRequestMiddleware.swift:51-62, applied `:108` and `:122`). Query redaction in tracing is explicit too (`redactingQueryParameters`, `TracingMiddleware.swift:56-62`). Neither wraps a secret type, and `CustomReflectable` is used for redaction in 0 of 40 repos.

**Where secrets enter.** `@Option var password: String` puts the secret in `argv`, and `/proc/<pid>/cmdline` is mode 444 (measured: `stat -c %a` prints `444`), readable by every local user. Take secrets from stdin, a `0600` file (SW-IO-21) or an environment variable, never a flag value.

### 7. Terminal control characters in error chains

**Threat.** Error chains quote names read off the wire: repository names, tags, registry `errors[].message`. The OCI distribution spec constrains names and tags with regexes (`[a-z0-9]+((\.|_|__|-+)[a-z0-9]+)*(\/...)*` and `[a-zA-Z0-9_][a-zA-Z0-9._-]{0,127}`, [spec](https://github.com/opencontainers/distribution-spec/blob/main/spec.md)) but a client that prints the string it received before validating, and every `message`, which the spec only says "SHOULD be a human readable string or MAY be empty", carry whatever the server sent. ESC sequences can "change console colors, move the cursor, clear the screen, or fake prompts, and in some terminals even run code" ([CWE-150](https://cwe.mitre.org/data/definitions/150.html)); OSC 52 writes the clipboard ([xterm ctlseqs](https://invisible-island.net/xterm/ctlseqs/ctlseqs.html)); bidi controls reorder what a human reads ([Trojan Source, CVE-2021-42574](https://trojansource.codes/)). The Rust fleet rule is ERR-16 / CLI-03 / SEC-31 to -38 (sanitize the rendered chain once, at the single stderr boundary, before printing).

**Planted (d)** (`termred`, `termgreen`): the error quotes `"app\u{1B}[2J\u{1B}]8;;http://evil/\u{07}x\r\u{202E}gnp.exe"` (clear screen, OSC 8, BEL, CR, bidi override). `termred 2>&1 >/dev/null | od -c`:

```
0000040   2   J 033   ]   8   ;   ;   h   t   t   p   :   /   /   e   v
0000060   i   l   /  \a   x  \r 342 200 256   g   n   p   .   e   x   e
```

`termgreen` (the sanitiser at the one stderr writer):

```
0000040   {   1   B   }   [   2   J   \   u   {   1   B   }   ]   8   ;
0000060   ;   h   t   t   p   :   /   /   e   v   i   l   /   \   u   {
0000100   7   }   x   \   u   {   D   }   \   u   {   2   0   2   E   }
```

**The sanitiser** (`Shared.sanitizeForTerminal`, 6.4 and 6.3.3): escape rather than strip, so the evidence stays visible and the dangerous byte is gone; keep `\n` and `\t` because the chain's own template uses them.

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

`.control` covers C0, DEL and C1 (U+0080-009F, including the 8-bit CSI U+009B); `.format` (Cf) covers the bidi overrides and isolates (U+202A-202E, U+2066-2069), zero-width characters (U+200B-200D), BOM and tag characters; `.lineSeparator` and `.paragraphSeparator` cover U+2028/2029. The table-driven `sancorpus` has 19 rows (CSI, OSC 8, OSC 52, tmux DCS, 8-bit CSI, CR, NUL, DEL, BS, U+202E, U+2066/2069, ZWSP, BOM, NEL, U+2028, plus CJK, emoji and `\n\t` that must survive) and asserts for each row that the forbidden scalars are absent, the escaped form is present and the function is idempotent: exit 0. The folk SGR-only regex (`ESC\[[0-9;]*m`, the shape Rust SEC-34 warns about) run through the same corpus (`sancorpusred`) fails 16 of 19 rows, exit 1. Cost: ZWJ emoji sequences render as `👨\u{200D}👩`; accepted.

**Three shortcuts that fail** (measured, `dbgdesc`): `s.debugDescription`, `String(reflecting: s)` and `Unicode.Scalar.escaped(asASCII: false)` escape ESC (`\u{1B}`), CR and DEL, and leave U+202E, U+0085, U+2028, U+200B, U+FEFF and U+009B as raw UTF-8 bytes (`od -c` shows `342 200 256`, `302 205`, `342 200 250`, `342 200 213`, `357 273 277`, `302 233`). ArgumentParser 1.8.2 does not sanitise either: `ValidationError("... \(hostile)")` and a plain `CustomStringConvertible` error both print `Error: ` followed by the raw bytes (`termargs`, 1 control/bidi line).

**Where it lives.** The function, its policy and its corpus are SW-SEC-23 (a security rule: what must never reach a terminal). The *place* it is called is the single stderr writer that SW-CLI-02/03 already require, the root `static func main() async` hook: catch, render with SW-ERR-18/21 `render(_:)`, pass the result through `sanitizeForTerminal`, write once, exit with the `Status` (SW-CLI-05 keeps "each error reported once"; it gains no new rule, only a cross-reference). `termboundary` implements it with `parseAsRoot`, `exitCode(for:)` and `fullMessage(for:)` and keeps ArgumentParser's contract: `ValidationError` exit 64, a plain error exit 1, `ExitCode(3)` exit 3, `--help` exit 0, zero control/bidi lines on stderr. A second boundary is the log handler: swift-log 1.16.1 `StreamLogHandler` writes message and metadata verbatim (`termlog red`: 1 control line, including the `error.message=` metadata the handler derives from `logger.warning(..., error:)`); a wrapper implementing `log(event: LogEvent)` that sanitises the message, the error text and every metadata value gives 0 (`termlog green`). Human-readable stdout renders of registry text (a `list` command) are a third boundary. JSON stdout stays faithful: `JSONEncoder` escapes ESC and CR (`\u001b`, `\r`) but writes U+202E and U+2028 raw (`jsonenc`: `342 200 256`, `342 200 250`), so machine output is not terminal-safe for bidi; sanitise on a TTY or in the human format (SW-SEC-25).

**Parse first.** The sanitiser is the catch-all for free text. Names, tags and digests are validated against the OCI grammar at parse time and rejected (SW-IO-13 for digests); only free text (registry `message`, `detail`, server banners) needs the sanitiser to carry the guarantee. Corpus: 0 of 40 repos sanitise wire text for terminals (one `controlCharacters` filter on a path in tuist@2f6ac74754bf:swifterpm/Sources/swifterpm/Restore.swift:1374, not a terminal boundary).

### 8. Crypto and randomness (M-I-10)

- **CSPRNG.** `SystemRandomNumberGenerator` "uses a cryptographically secure algorithm whenever possible": Apple `arc4random_buf(3)`, Linux `getrandom(2)` with `/dev/urandom` fallback, Windows `BCryptGenRandom` ([Random.swift](https://github.com/swiftlang/swift/blob/main/stdlib/public/core/Random.swift)); `Int.random(in:)` without `using:` uses it. swift-crypto draws IVs, blinding bytes and keys from it (swift-crypto@1c80d3aff53f:Sources/CryptoExtras/AES/AES_CTR.swift:65); `SymmetricKey(size: .bits256)` is the key generator (`rngchk` exit 0, `key bits 256`). swift-foundation's `UUID()` is RFC 9562 v4 over `SystemRandomNumberGenerator` (swift-foundation@aadd9259be07:Sources/FoundationEssentials/UUID.swift:66, `:377`): fine as an unguessable identifier, still not an auth token by policy.
- **No seeded or legacy generators for secrets.** A `RandomNumberGenerator` conformance with an LCG, `arc4random()`, `arc4random_uniform`, `drand48`, `srand`/`rand`/`random()` are insecure or non-portable. SwiftLint 0.65.1's default-on `legacy_random` rule (not opt-in) flags the `arc4random*`/`drand48` family (`rules/bad/Rng.swift:13:33` and `:70`, 0 on the twin); it does not see a custom generator, which the grep in SW-SEC-26 does.
- **swift-crypto vs CryptoKit.** swift-crypto "implements a substantial portion of the API of Apple CryptoKit" and on Apple platforms "compiles to essentially nothing and re-exports CryptoKit"; cross-platform code writes `import Crypto`; `CryptoExtras` bundles BoringSSL; underscore-prefixed names are outside SemVer; recommended range `"1.0.0" ..< "6.0.0"` ([README](https://github.com/apple/swift-crypto)). Measured on Linux: `import CryptoKit` fails with `error: no such module 'CryptoKit'` (exit 1, 6.4); `import Crypto` builds. The corpus splits by platform: apple/container imports `CryptoKit` in 5 files (a macOS-only product), containerization imports `Crypto` in 23.
- **Constant time.** `HMAC.isValidAuthenticationCode` compares with `safeCompare` (swift-crypto@1c80d3aff53f:Sources/Crypto/Message Authentication Codes/HMAC/HMAC.swift:205, `:214`); `SymmetricKey ==` does too (`Keys/Symmetric/SymmetricKeys.swift:198`). Compare MAC tags with those, never `Data ==` (reading heuristic; the compare is not observable in a fixture).
- **Insecure hashes.** The namespace is `public enum Insecure` (swift-crypto@1c80d3aff53f:Sources/Crypto/Insecure/Insecure.swift:24) for exactly `MD5` and `SHA1`; the corpus uses it for cache keys and Gravatar hashes (tuist@2f6ac74754bf:cli/Sources/TuistCore/ContentHashing/ContentHasher.swift:23, `app/Sources/TuistNoora/NooraAvatar.swift:94`; container@f70ecbb926d9:Tests/ContainerAPIServiceTests/KernelServiceTests.swift:153), never to authenticate. Content-addressed digests (OCI) are SHA-256/512 (SW-IO-13).
- **Do not hand-roll.** Not run: constant-time custom code and padding oracles are not fixturable cheaply; the rule is "use `Crypto`/`CryptoExtras`".

### 9. Dependency scanning (M-I-12)

**There is no `swift package audit`** (exit 64 `Unknown subcommand or plugin name 'audit'` on 6.3.3 and 6.4; the only audit-shaped subcommand is `experimental-audit-binary-artifact`). 6.4 adds `swift package generate-sbom`, which writes `cyclonedx1-1.7-*.json` and `spdx3-3.0.1-*.json` with purls such as `pkg:swift/github.com/apple/swift-log@1.16.1`; 6.3.3 exits 64. The SBOM scans with `osv-scanner scan source -L bom.cdx.json` (the scanner insists on a `.cdx.json` suffix; it parsed 24 packages, warned that the root `pkg:swift/pkg` has no version).

**Who reads `Package.resolved`** (checked 2026-10-10):

| Tool | Reads | Evidence | Run here |
|---|---|---|---|
| OSV-Scanner 2.6.0 (OSV-Scalibr extractor `swift/packageresolved`) | `Package.resolved` by basename; ecosystem `SwiftURL`, name `github.com/apple/swift-nio` | [extractor source](https://github.com/google/osv-scalibr/blob/main/extractor/filesystem/language/swift/packageresolved/packageresolved.go), release asset sha256 matched | yes: red exit 1, green exit 0 |
| Dependabot (`package-ecosystem: swift`, Swift v5, v6) | `Package.swift`; Xcode `Package.resolved` inside `.xcodeproj`/`.xcworkspace` since 2026-03-31; "Swift registries are not supported", private registries git only | [docs](https://docs.github.com/en/code-security/dependabot/ecosystems-supported-by-dependabot/supported-ecosystems-and-repositories), [changelog 2026-03-31](https://github.blog/changelog/2026-03-31-dependabot-now-supports-xcode-projects-using-swiftpm-with-xcodeproj-manifests), [changelog 2023-08-01](https://github.blog/changelog/2023-08-01-swift-support-for-dependabot-updates/) | no: `unverified: docs only` |
| Trivy | `Package.resolved` (and `Podfile.lock`); "update this file before scanning"; reports per Git URL so sub-products over-report | [docs](https://trivy.dev/latest/docs/coverage/language/swift/) | no |
| Syft/Grype | `swift-package-manager-cataloger`, globs `**/Package.resolved`, `**/.package.resolved` | [cataloger.go](https://github.com/anchore/syft/blob/main/syft/pkg/cataloger/swift/cataloger.go) | no |

Planted (`scan/red`, `scan/green`, a `Package.resolved` version 3 pinning swift-nio): 2.62.0 gives `Total 1 package affected by 3 known vulnerabilities (0 Critical, 2 High, 1 Medium...)`, GHSA-cq87-8r7h-962v (6.3), GHSA-r3rc-9hpw-54v9 (8.3), GHSA-rj37-6j9x-74q6 (8.7), exit 1; 2.100.0 gives `No issues found`, exit 0.

**Coverage gap.** GitHub's global advisory feed for `ecosystem=swift` holds 64 reviewed advisories (`gh api -X GET advisories -f ecosystem=swift -f per_page=100 --paginate`). Querying by CVE: CVE-2026-43671 and CVE-2026-28815 return 1 each; CVE-2026-43678, -97696, -97697, -102835, -43820 and -43823 return 0 reviewed and 0 unreviewed. Those six exist only as repository advisories (the pages above fetch fine). OSV agrees: swift-nio 2.100.0 → `[]`, hummingbird 2.25.1 → `[]`, swift-crypto 4.5.0 → `[]`. So the scanner-green `green/Package.resolved` (swift-nio 2.100.0) is inside CVE-2026-43678's `<= 2.100.0` range. Floors the map's advisories imply: swift-nio `>= 2.101.0`, hummingbird `>= 2.26.0`, swift-crypto `>= 4.5.1`, swift-nio-ssl past CVE-2026-43820.

## Normative guidance candidates

Fields: **Rule**; *why*; **Verify**; **Run** (yes with fixture, or no). Commands use `Sources` as the adopter's source dir; the fixture dir below is `~/.cache/research-lang/swift-tools/fixtures/untrusted-input/` (`$F`). "Empty output = pass" for every grep: the output is the violation.

**SW-SEC-01 (MUST).** Every recursive parser, decoder or tree walk over untrusted input takes a `depth` parameter, checks `depth < maxDepth` before recursing and throws a typed error; `maxDepth` is a named constant (default 64, never above 512). The test feeds 100,000 nested levels to the built binary and asserts exit 65, not a signal.
- *Why:* a signal is not catchable; the 100,000 fixture exits 139 in debug and release; Hummingbird CVE-2026-97696.
- **Verify:** `$F/pkg` binaries: `deepred 100000` then `deepgreen 100000`; in an adopter, an exit-code test per SW-ERR-17 (`cli parse <100k-deep file>; test $? -eq 65`). Reading heuristic for the code: every function that calls itself in a parser has a `depth` parameter.
- **Run: yes**, `$F/pkg/Sources/deepred`: exit 139; `deepgreen`: exit 65; 63 deep exit 0, 65 deep exit 65; 6.4 and 6.3.3.

**SW-SEC-02 (MUST).** Decode JSON and property lists with `JSONDecoder`/`JSONSerialization`/`PropertyListDecoder` (scanner depth cap 512) rather than a hand-written recursive parser; a hand-written, YAML, XML or form decoder carries SW-SEC-01 itself, and a library decoder is trusted only for the limit it documents (protobuf `messageDepthLimit` 100; Hummingbird `maxKeyDepth` 64).
- *Why:* the platform scanner throws at 512 before any `Decodable` recursion.
- **Verify:** `grep -rn --include='*.swift' -e 'func parseValue' -e 'func parseArray' -e 'func parseObject' -e 'indirect enum' Sources` lists hand-written recursive shapes for review (heuristic); depth probe `deepcodable 100000 decoder` exit 65.
- **Run: yes** for the platform limit (`deepcodable`: 511 deep exit 0, 513 exit 65, 100000 exit 65, `serialization` exit 65); the grep is a reading heuristic, no.

**SW-SEC-03 (MUST).** A tree or graph built from untrusted input whose nodes own a collection of children is bounded by SW-SEC-01 at build time, or has an iterative teardown (work-list `deinit` with `isKnownUniquelyReferenced`), or is stored flat (indices). Do not add the work list to a singly linked chain.
- *Why:* `deinit` recursion kills the process at 100,000 even when the parser was iterative; the chain form does not crash at 10,000,000.
- **Verify:** `$F/pkg` `listred 100000 kids` and `listgreen 3000000`; in an adopter, the SW-SEC-01 hostile-nesting test must also *drop* the parsed value (`_ = try parse(...)` inside the exit test is not enough; assign and release).
- **Run: yes**, `listred 100000 kids` exit 139, `listred 1000000 kids` (release) exit 139, `listgreen 3000000` exit 0, `listred 10000000 next` exit 0.

**SW-SEC-04 (MUST).** Never read an untrusted stream to its end into memory without a cap: replace `readDataToEndOfFile()`, `Data(contentsOf:)`, `String(contentsOfFile:)` and `readToEnd()` on wire, stdin or socket input with a chunked read that checks the running total before appending, or `collect(upTo:)`; a hit that is local trusted input carries `// bounded: <limit or why>`. Defaults: 4 MiB for registry JSON bodies, 1 MiB for error bodies, 1 MiB for stdin documents.
- *Why:* 311 MB RSS vs 19 MB, exit 0 vs 65; containerization defaults 4 MiB (RegistryClient.swift:106).
- **Verify:** `grep -rn --include='*.swift' -e 'readDataToEndOfFile' -e 'Data(contentsOf' -e 'contentsOfFile' -e 'readToEnd(' Sources | grep -v -e 'bounded:'`.
- **Run: yes**, `$F/checks.sh` K1: red 1 line, twin 0; runtime `head -c 300000000 /dev/zero | sizered` exit 0 (`VmHWM 311632 KiB`), `| sizegreen` exit 65 (`19008 KiB`).

**SW-SEC-05 (MUST).** Never allocate from a wire-declared length: compare the unconverted wire integer with a configured cap (SW-SEC-07), then allocate; `[T](repeating:count:)`, `reserveCapacity`, `.allocate(capacity:)` and `unsafeUninitializedCapacity` on a non-literal count carry `// bounded: <where checked>`.
- *Why:* allocation failure is `Fatal error: failed to allocate` exit 134 (abort), a remote kill.
- **Verify:** `grep -rn --include='*.swift' -e 'repeating:.*count:' -e 'reserveCapacity(' -e 'allocate(capacity:' -e 'unsafeUninitializedCapacity' Sources | grep -v -e 'bounded:'` (noisy; run on changed files).
- **Run: yes**, `allocred` 2^40 and 2^63-1 exit 134; `allocgreen` exit 65; K2 red 1, twin 0.

**SW-SEC-06 (SHOULD).** Any decompressing reader sets an explicit limit (NIO `DecompressionLimit` via `decompression: .enabled(limit: ...)`), never `.none`/unlimited, and bounds the inflated size, not the compressed size.
- *Why:* ratio bombs; AHC and Vapor expose the limit type.
- **Verify:** `grep -rn --include='*.swift' -e 'decompression' -e 'DecompressionLimit' Sources` and read each hit for a finite limit.
- **Run: no, reading heuristic only** (async-http-client@017115279d09:Sources/AsyncHTTPClient/HTTPClient.swift:1227).

**SW-SEC-07 (MUST; was S1, S5).** An integer from outside the process stays in its wire type and is converted with `T(exactly:)` (throw on `nil`) or compared with the limit first; the conversion and the size-limit check happen before the value is used for an index, allocation or copy. `T(clamping:)` only where saturation is the specified behaviour. Cross-reference: SW-ERR-14.
- *Why:* `Int(UInt64 >= 2^63)` traps before any configured `maxFrameSize` (CVE-2026-43678).
- **Verify:** `find Sources -name '*.swift' -print0 | xargs -0 -r grep -H -n -e '\bU\?Int[0-9]*([a-zA-Z_.]*[lL]en' -e '\bU\?Int[0-9]*([a-zA-Z_.]*[sS]ize' -e '\bU\?Int[0-9]*([a-zA-Z_.]*[oO]ffset' -e '\bU\?Int[0-9]*([a-zA-Z_.]*QWord' -e '\bU\?Int[0-9]*([a-zA-Z_.]*[hH]eader' | grep -v -e 'exactly:' -e 'clamping:' -e 'truncatingIfNeeded:' -e 'bitPattern:' -e 'bounded:' -e 'radix:' -e '\.count)'` (name-based, run on changed files).
- **Run: yes**, `$F/conv`: `ared 8000000000000000` exit 132 (debug and release), `agreen` exit 65; S1 grep red 1 line, twin 0; order half (S5) is a reading heuristic, no.

**SW-SEC-08 (MUST; was S3).** `T(truncatingIfNeeded:)` appears only with `// truncate-ok: <why>` on the same line.
- *Why:* wraps past the bounds check and corrupts memory in release (CVE-2026-43671).
- **Verify:** `grep -rn --include='*.swift' -e 'truncatingIfNeeded' Sources | grep -v -e 'truncate-ok:'`.
- **Run: yes**, `$F/conv/Sources/bred`: 3 lines, `bgreen` 0; release `bred write` exit 0 `wrote 64 bytes into a 16-byte allocation`, ASan exit 1.

**SW-SEC-09 (MUST; was S4).** Arithmetic on an untrusted value uses `addingReportingOverflow`/`multipliedReportingOverflow` or a pre-check; `&+ &- &*` carry `// wrap-ok: <why>`.
- *Why:* `+` traps (132); `&+` wraps silently (`-9223372036854775808`).
- **Verify:** `grep -rn --include='*.swift' -e ' &+ ' -e ' &- ' -e ' &\* ' Sources | grep -v -e 'wrap-ok:'`.
- **Run: yes**, `add-trap` 132, `add-safe` 0, `wrap-add` 0; grep red 1, twins 0.

**SW-SEC-10 (SHOULD; was S2).** `Int(_ double:)` on parsed floats uses `Int(exactly:)`; `lower...upper` and `lower..<upper` built from parsed bounds are preceded by `lower <= upper` in the same function.
- *Why:* NaN/infinity/out-of-range and `5...2` trap (CVE-2026-97697, Hummingbird `Range: bytes=5-2`).
- **Verify:** named reading heuristic: "every `a...b`/`a..<b` with parsed bounds has a dominating comparison"; runtime exit-code test.
- **Run:** runtime yes (`range-trap 5` 132, `range-safe 5` 0, `double-trap nan` 132, `double-safe nan` 0); the heuristic, no.

**SW-SEC-11 (MUST; was S6).** A target that combines unsafe pointers with an externally derived size has a test run under `swift test --sanitize=address` (or `swift build -c release --sanitize=address` plus the hostile input), run in CI.
- *Why:* the release build of the overflow exits 0; only ASan is deterministic; it also catches the `unsafe`-acknowledged use-after-free that StrictMemorySafety cannot.
- **Verify:** `swift build -c release --sanitize=address` then run the hostile input: must exit non-zero on the violation. CI job exists (reading).
- **Run: yes**, `bred write` ASan exit 1 / `bgreen` 65; `EscapeExe` ASan exit 1 / `EscapeTwin` 0.

**SW-SEC-12 (MUST for C-wrapping or pointer-parsing targets, CONSIDER elsewhere; confirms conflict 10).** Targets that import a C module, hold `Unsafe*Pointer`/`OpaquePointer`/`Unmanaged` outside tests, or parse untrusted bytes through unsafe pointers set `.strictMemorySafety()` and `.treatWarning("StrictMemorySafety", as: .error)` (tools 6.2+). Ordinary targets do not; it is never a repo-wide gate.
- *Why:* SE-0458 is opt-in by design; 3 of 40 repos enable it; it is the only compiler check that audits every unsafe use.
- **Verify:** `swift build --target <seam-target>` exits non-zero on an unacknowledged use; `grep -rn --include='Package*.swift' -e 'strictMemorySafety' .` lists the targets that enable it (every C-wrapping target must be in the list).
- **Run: yes**, `$F/sms`: `RedLib` exit 1 (`8:32: error: expression uses unsafe constructs but is not marked with 'unsafe' [#StrictMemorySafety]`), `GreenLib` 0, `PlainRed` (flag off, same code) 0; 6.4 and 6.3.3.

**SW-SEC-13 (MUST).** `unsafe` is an acknowledgement, not a fix: never add it (or run `swift package migrate --to-feature StrictMemorySafety`) to silence a warning without reading the site; keep `unsafe` expressions inside designated seam files; every `@safe` declaration (the encapsulation claim) carries a `// SAFETY: <invariant>` comment naming what makes it safe.
- *Why:* the migration marks every flagged site mechanically; `EscapeExe` is fully acknowledged and still use-after-free; the corpus has 5,310 `unsafe` lines and 0 SAFETY comments, so the claim is currently unreviewable.
- **Verify:** `grep -rn --include='*.swift' -e '@safe' Sources` and read the preceding line for `SAFETY:` (reading heuristic); `grep -rln --include='*.swift' -e '\bunsafe ' Sources` lists seam files, which must be on the declared seam list.
- **Run:** no, reading heuristic (the mechanical-insertion behaviour is measured: `smsmig` diff).

**SW-SEC-14 (MUST).** A pointer from `withUnsafeBufferPointer`, `withUnsafeBytes`, `withUnsafe(Mutable)Pointer` or `&x`-to-pointer conversion never leaves its closure or call: return a value computed inside, not the pointer; prefer `Span`/`RawSpan` (6.2+) where the callee accepts one. Public API never returns a pointer into Swift-owned storage.
- *Why:* StrictMemorySafety does not flag the escape (6.4: `EscapeOnly` exit 0), only the later dereference.
- **Verify:** (a) compile: `Span` return from local storage fails (`a function cannot return a ~Escapable result`); (b) `grep -rn --include='*.swift' -e 'public .*Unsafe' -e 'open .*Unsafe' -e 'public .*OpaquePointer' -e 'open .*OpaquePointer' Sources`; (c) ASan run (SW-SEC-11); (d) build log: `swift build 2>&1 | grep -e 'TemporaryPointers'` must be empty (the warning cannot be promoted on 6.4).
- **Run: yes**, `SpanRed` exit 1; K5 red 1 (`public func firstBytePointer(... ) -> UnsafePointer<UInt8>?`), `GreenLib` 0; `EscapeExe` ASan exit 1, `EscapeTwin` 0; `TmpPtr` prints `[#TemporaryPointers]` and `-Werror TemporaryPointers` exits 0 on 6.4, 1 on 6.3.3.

**SW-SEC-15 (MUST).** A C handle or pointer lives in one Swift type: stored `private`, never in a `public`/`open` signature; acquired in `init` only after the input is validated; released in exactly one place, that type's `deinit` (or a `~Copyable` type's `deinit`); an `init` error path frees nothing the object will free. Hand out Swift values, not the handle.
- *Why:* swift-crypto CVE-2026-43823 (error path frees, `deinit` frees again); `dfred` exit 134.
- **Verify:** `grep -rc --include='*.swift' -e 'free(' Sources | grep -v -e ':0$' -e ':1$'` lists files with two or more `free(` calls for review; the public-pointer grep of SW-SEC-14(b); a test that constructs the type with malformed input (an `init` that throws) under ASan.
- **Run: yes**, `dfred` exit 134 (`free(): double free detected in tcache 2`), `dfgreen` 0; K6 red 1 (`dfred/main.swift:2`), twin 0; `CRed` (public `OpaquePointer?`) exit 1, `CGreen` 0.

**SW-SEC-16 (SHOULD).** Acknowledge a C call with `unsafe` on the call expression (`unsafe cbuf_sum(a, a.count)`), not around a closure that also uses `$0`/`b`; the direct form is clean on 6.3 and 6.4, the closure form only on 6.4.
- *Why:* the floor policy spans 6.3; the closure spelling fails there.
- **Verify:** `swift build --target <seam>` on both toolchains (CI matrix).
- **Run: yes**, `cspell.sh`: spellings B and C exit 0 on both; A (closure, inner `unsafe` only) rc 1 on 6.3.3, rc 0 on 6.4.

**SW-SEC-17 (SHOULD).** A class that holds a C handle across tasks is `Sendable` through one of: an actor, a `Mutex`, or `nonisolated(unsafe) let` on an immutable handle with the owning `deinit` (SW-CONC's guard-and-reason clause); strict mode flags every *use* of a `nonisolated(unsafe)` variable, so the seam file lists them.
- *Why:* sourcekit-lsp's shape; strict mode is the only tool that sees the uses (conflict 10).
- **Verify:** `grep -rn --include='*.swift' -e 'nonisolated(unsafe)' Sources` plus `swift build` of the seam target under SW-SEC-12.
- **Run:** use-flagging yes (`Zoo2` `z5use` warns, declaration silent); policy half no (SW-CONC owns it).

**SW-SEC-18 (MUST).** A credential (token, password, `Authorization` value, cookie, API key, presigned signature) is held in a `Secret` type whose `description`/`debugDescription` are fixed, whose `customMirror` is empty, that is not `Codable`, and whose `reveal()` is the single egress; a plain `String` credential field is allowed only inside the function that builds the header. Never log, interpolate or `dump` an HTTP-client request, header map or authorization object.
- *Why:* async-http-client's `Authorization` prints its token three ways (1.36.2).
- **Verify:** runtime canary (SW-SEC-22); `grep -rn --include='*.swift' -i -e 'var [a-z]*password: String' -e 'var [a-z]*token: String' -e 'let [a-z]*token: String' -e 'let [a-z]*secret: String' Sources` lists credential-shaped stored `String`s for review.
- **Run: yes** for the leak (`ahc/Sources/ahcleak`: 3 outputs contain `SECRETCANARY123`) and the `Secret` twin (`loggreen` 0); the stored-field grep is a reading heuristic, no.

**SW-SEC-19 (MUST).** Every `URL` that enters error text, a log line, metadata or a terminal passes through `redacted(_:)` (drops userinfo and fragment, replaces every query value); errors store the redacted string at construction; render a foreign `URLError`/`NSError` with `localizedDescription` and `redacted(failingURL)`, never `"\(error)"` (SW-ERR-18).
- *Why:* `"\(urlError)"` prints userinfo and the presigned query; OCI blob redirects are presigned URLs.
- **Verify:** `grep -rn --include='*.swift' -e '\\(url' -e '\\(.*[uU][rR][lL])' -e '\\(request.url' Sources | grep -v -e 'redacted'` (a hit is a URL interpolation without redaction; mark safe-by-construction lines with a trailing `// redacted: <why>`); canary test (SW-SEC-22).
- **Run: yes**, K7b red 4 lines, twin 0; `logred` 3 canary lines, `loggreen` 0; `urlerr` 2 canary lines via interpolation and `failingURL`, 0 via `localizedDescription`.

**SW-SEC-20 (MUST).** Log metadata whose key names a credential (`authorization`, `cookie`, `password`, `token`, `secret`, `api-key`) takes `.stringConvertible(Secret(...))` only; swift-log provides no privacy levels, so the type is the control. Do not enable header logging by default; an allow-list of header names beats a deny-list (Hummingbird `includeHeaders: .none`).
- *Why:* `.string` metadata prints verbatim.
- **Verify:** `grep -rn --include='*.swift' -i -e 'metadata:.*authorization' -e 'metadata:.*password' -e 'metadata:.*token' -e 'metadata:.*secret' -e 'metadata:.*cookie' -e 'metadata:.*api-key' Sources | grep -v -e '\.stringConvertible(' -e 'secret-ok:'`.
- **Run: yes**, K7a red 1 (`logred/main.swift:12`), twin 0.

**SW-SEC-21 (MUST).** Secrets reach the process through stdin, a `0600` file (SW-IO-21) or the environment, never as an `@Option`/`@Argument` value.
- *Why:* `argv` is world-readable (`/proc/<pid>/cmdline` mode 444).
- **Verify:** `grep -rn --include='*.swift' -e '@Option.* var [a-zA-Z]*[pP]assword' -e '@Option.* var [a-zA-Z]*[tT]oken' -e '@Option.* var [a-zA-Z]*[sS]ecret' Sources | grep -v -e 'File' -e 'Stdin' -e 'Env'`.
- **Run: yes**, K12 red 2 (`rules/bad/Cli.swift:3,4`), twin 0 (`passwordStdin` flag, `tokenFile`).

**SW-SEC-22 (MUST).** A canary test runs every failing and verbose path of the CLI/SDK with a unique secret value in the credential inputs and asserts the value never appears in stdout, stderr or the log sink: `... 2>&1 | grep -c CANARY` prints `0`.
- *Why:* only a runtime check sees leaks through library types, `dump`, `Mirror` and `Foundation` errors.
- **Verify:** `"$BIN" <failing-case> --token CANARY123 2>&1 | grep -c CANARY123` must print `0` (adapt to the secret channel of SW-SEC-21).
- **Run: yes**, `logred SECRETCANARY123 2>&1 | grep -c SECRETCANARY123` prints 3 (exit status of the pipeline 0), `loggreen` prints 0 (grep exits 1 on no match; judge by the printed count).

**SW-SEC-23 (MUST).** All wire-supplied text reaches a terminal through `sanitizeForTerminal`, called at exactly three boundaries: the root `main()` error writer (the one stderr boundary of SW-CLI-02/03, composed after SW-ERR's `render(_:)`), the log handler (message, error text and every metadata value), and every human-format stdout render of registry text. It escapes (not strips) C0, DEL, C1, Cf, U+2028 and U+2029 as `\u{HEX}`, keeps `\n` and `\t`, is idempotent, and is pinned by the 19-row corpus including the SGR-only-regex counterexample. Do not substitute `debugDescription`, `String(reflecting:)`, `escaped(asASCII:)` or an `ESC[...m` regex.
- *Why:* ArgumentParser, swift-log and `FileHandle.standardError.write` all pass the bytes through; the shortcuts leave bidi and C1 raw; 0 of 40 exemplars sanitise.
- **Verify:** (a) structural: `grep -rl --include='*.swift' -e 'standardError' -e 'stderr' -e 'fputs' Sources | xargs -r grep -L -e 'sanitizeForTerminal'` lists stderr-writing files with no sanitiser (judge by output; `xargs` exits 123 when `grep -L` lists a file); (b) behavioural: `"$BIN" <hostile-registry-case> 2>&1 >/dev/null | LC_ALL=C grep -a -c -e '[[:cntrl:]]' -e $'\xc2[\x80-\x9f]' -e $'\xe2\x80[\x8b-\x8f\xa8-\xae]' -e $'\xe2\x81[\xa6-\xa9]' -e $'\xef\xbb\xbf'` must print `0`; (c) the corpus executable exits 0.
- **Run: yes**, K8 red 1 (`termred`), twin 0; (b) `termred` prints 1, `termgreen` 0, `termlog red` 1 / `green` 0, `termargs validation` (ArgumentParser raw) 1, `termboundary validation|plain|exit3` 0 with exit 64 / 1 / 3; `sancorpus` exit 0, `sancorpusred` exit 1 (16 FAIL); 6.4 and 6.3.3.

**SW-SEC-24 (MUST).** Wire names, tags and digests are validated against their grammar at parse time and rejected on mismatch (OCI repository `[a-z0-9]+((\.|_|__|-+)[a-z0-9]+)*(\/...)*`, tag `[a-zA-Z0-9_][a-zA-Z0-9._-]{0,127}`; digest per SW-IO-13); the sanitiser of SW-SEC-23 is for free text only (registry `message`, `detail`).
- *Why:* validation removes the hostile bytes before they are in a string at all; the sanitiser is the catch-all, not the first line.
- **Verify:** a table test: names with `\u{1B}`, `\r`, U+202E, uppercase and `..` all throw at parse (reading heuristic for coverage; the grammar regexes are in the OCI spec).
- **Run:** no, reading heuristic only (the grammar is the spec's; no fixture built).

**SW-SEC-25 (SHOULD).** Machine output stays faithful (JSON stdout is not rewritten), but a human format and any stdout that is a TTY go through `sanitizeForTerminal`; document that `JSONEncoder` escapes ESC/CR but not U+202E/U+2028.
- *Why:* measured `jsonenc` output carries `342 200 256` raw.
- **Verify:** `"$BIN" list --format json | od -c` against a hostile fixture shows the raw bytes (known, documented); `"$BIN" list --format text | LC_ALL=C grep -a -c -e '[[:cntrl:]]'` prints `0`.
- **Run:** JSON half yes (`jsonenc`); the human-format half no (no CLI built).

**SW-SEC-26 (MUST).** Random values that must be unguessable (tokens, nonces, salts, keys, session ids) come from `SystemRandomNumberGenerator` (explicit `using: &g`, or the default `random(in:)`) or `SymmetricKey(size:)`; no seeded or custom `RandomNumberGenerator`, no `rand()`, `random()`, `srand`, `drand48`, `arc4random*`.
- *Why:* `SystemRandomNumberGenerator` is the CSPRNG on every platform; custom generators are predictable.
- **Verify:** `grep -rn --include='*.swift' -e ': RandomNumberGenerator' -e 'arc4random' -e 'drand48' -e 'srand(' -e '\brand()' -e '\brandom()' Sources`; SwiftLint `legacy_random` (default on, 0.65.1) as a second net.
- **Run: yes**, `$F/rules/bad/Rng.swift` 2 lines, good 0; `swiftlint lint` on bad: 2 `legacy_random` warnings (13:33, 13:70), good 0.

**SW-SEC-27 (MUST).** Cross-platform code imports `Crypto` (swift-crypto, range `"1.0.0" ..< "6.0.0"`, floor 4.5.1), never bare `import CryptoKit` (guard with `#if canImport(CryptoKit)` in Apple-only files); compare MACs and tags with `isValidAuthenticationCode`/`SymmetricKey ==`, never `==` on bytes; `Insecure.MD5`/`Insecure.SHA1` only with `// insecure-ok: <why not authentication>`; no hand-rolled primitives.
- *Why:* `no such module 'CryptoKit'` on Linux; constant-time compare; MD5/SHA1 are collision-broken.
- **Verify:** `grep -rn --include='*.swift' -e 'Insecure\.' Sources | grep -v -e 'insecure-ok:'`; `grep -rn --include='*.swift' -e 'import CryptoKit' Sources` (each hit under `#if canImport(CryptoKit)` or an Apple-only target); `swift build` on Linux.
- **Run: yes**, `import CryptoKit` exit 1 on Linux 6.4; `import Crypto` builds (`rngchk` exit 0); Insecure grep: bad 1 line (`Rng.swift:14`), good 0 (marker present).

**SW-SEC-28 (SHOULD).** Do not rely on any `_`-prefixed or `Staging` swift-crypto symbol (outside SemVer) and import `CryptoExtras` only when needed: it bundles BoringSSL and XKCP into the application.
- *Why:* README states both.
- **Verify:** `grep -rn --include='*.swift' -e 'import _CryptoExtras' -e 'import CryptoExtras' -e '_RSA\.' Sources` lists use for review.
- **Run:** no, reading heuristic.

**SW-SEC-29 (MUST for executables, servers and apps; SHOULD for libraries).** Commit `Package.resolved` for executables and apps, and gate CI on a lockfile scan: `osv-scanner scan source -L Package.resolved` (exit 1 on findings), plus Dependabot `package-ecosystem: swift` for alerts and update PRs. Do not look for `swift package audit`; it does not exist.
- *Why:* three scanners read `Package.resolved` (OSV, Trivy, Syft/Grype); GitHub's Swift feed has 64 reviewed advisories.
- **Verify:** `osv-scanner scan source -L Package.resolved; echo $?`.
- **Run: yes**, `$F/scan/red` (swift-nio 2.62.0) exit 1, 3 GHSA lines; `scan/green` (2.100.0) exit 0 `No issues found`; `swift package audit` exit 64 on 6.3.3 and 6.4. Dependabot/Trivy/Syft: `unverified: docs only`.

**SW-SEC-30 (MUST).** Treat the scanner as one input, not the verdict: declare version floors for dependencies with known repository-only advisories (swift-nio `>= 2.101.0`, hummingbird `>= 2.26.0`, swift-crypto `>= 4.5.1`) in `Package.swift` (`from:`), and re-check the global feed per CVE.
- *Why:* CVE-2026-43678/-97696/-97697/-102835/-43820/-43823 are not in GitHub's feed or OSV; swift-nio 2.100.0 passes OSV and is inside the CVE-2026-43678 range.
- **Verify:** `gh api -X GET advisories -f cve_id=CVE-2026-43678 -f type=reviewed --jq 'length'` prints `0` (the advisory is missing from the feed, so the scanner is blind to it); `grep -rn --include='Package.swift' -e 'swift-nio.git' -e 'hummingbird.git' -e 'swift-crypto.git' .` lists the declared floors for reading.
- **Run: yes** for the gap (`length` 0 for six CVEs, 1 for CVE-2026-43671 and CVE-2026-28815; OSV swift-nio 2.100.0 `[]`); the floor grep is a reading heuristic, no.

**SW-SEC-31 (SHOULD, Swift 6.4+).** Produce an SBOM at release with `swift package generate-sbom` (CycloneDX 1.7 and SPDX 3.0.1) and archive it with the artifact; scan it as `*.cdx.json`. On a 6.3 toolchain the subcommand does not exist.
- *Why:* purls name the exact versions that shipped.
- **Verify:** `swift package generate-sbom` exits 0 on 6.4 and writes both files; `osv-scanner scan source -L bom.cdx.json` parses them.
- **Run: yes**, 6.4 exit 0 (25 components); 6.3.3 exit 64.

## Verification runs

Fixture root `F=/home/mherwig/.cache/research-lang/swift-tools/fixtures/untrusted-input`. Toolchain wrapper `R=/home/mherwig/.cache/research-lang/swift-tools/run.sh` (swift:6.4, `SWIFT_VERSION=6.3` for 6.3.3). Scripts: `pkgruns.sh` (packages `pkg`), `allsms.sh` (`sms`, `conv`), `checks.sh` (host greps). Logs: `$F/logs/run-6.4.log`, `run-6.3.log`, `sms-6.4.log`, `sms-6.3.log`, `checks.log`, `rng.log`, `osv.log`, `ahc-6.4.log`, `cspell-*.log`, `mig-6.4.log`, `pkghelp-*.log`. Every build used `--scratch-path "$SWIFT_SCRATCH/untrusted-input-<version>"`. The 42 `CHECK` lines of `pkgruns.sh` are identical (exit codes and outputs, except RSS numbers) on 6.4.0 and 6.3.3; differences are listed below.

Run each: `R=/home/mherwig/.cache/research-lang/swift-tools/run.sh; $R bash $F/pkgruns.sh`, `$R bash $F/allsms.sh`, `SWIFT_VERSION=6.3 $R bash $F/pkgruns.sh`, `bash $F/checks.sh`.

| ID | Fixture and command | Violation | Compliant twin | Relevant lines |
|---|---|---|---|---|
| V1 recursion | `pkg`: `deepred 100000` / `deepgreen 100000` | exit 139 (debug, release; 50,000 also 139; 20,000 exit 0) | exit 65 | `error: nesting deeper than 64`; 63 deep exit 0, 65 deep exit 65 |
| V2 Foundation cap | `deepcodable 100000 decoder` | n/a | exit 65 (511 deep exit 0, 513 exit 65) | `DecodingError.dataCorrupted`; `serialization`: `NSCocoaErrorDomain Code=3840 ... Too many nested arrays or dictionaries around character 513` |
| V3 teardown | `listred 100000 kids` / `listgreen 3000000` | exit 139 (also 1,000,000 release) | exit 0 | `built 3000000 via kids~released 3000000 via kids`; `listred 10000000 next` exit 0 (not a violation) |
| V4 size cap | `head -c 300000000 /dev/zero | sizered` / `sizegreen` | exit 0, `VmHWM 311632 KiB` | exit 65, `VmHWM 19008 KiB`; 1,000 bytes exit 0 | |
| V5 allocation | `allocred` (2^40, 2^63-1) / `allocgreen` | exit 134 | exit 65 (`declared length exceeds 16777216`); 1,000 exit 0 | `Fatal error: failed to allocate 1099511627808 bytes of memory` |
| V6 conversions | `$F/conv` via `conv.sh` | `ared 8000000000000000` exit 132 (debug, release); `bred write` release exit 0, ASan exit 1; `traps double-trap nan` 132, `range-trap 5` 132, `add-trap 1` 132, `wrap-add 1` exit 0 | `agreen` 65; `bgreen` ASan 65; `double-safe nan` 0; `range-safe 5` 0; `add-safe 1` 0 | `Swift/Integers.swift:3641: Fatal error: Not enough bits to represent the passed value`; `heap-buffer-overflow`; `wrote 64 bytes into a 16-byte allocation` |
| V7 strict memory | `sms`: `swift build --scratch-path ... --target T` with `.strictMemorySafety()` + `.treatWarning("StrictMemorySafety", as: .error)` | `RedLib` 1, `RedCaller` 1, `CRed` 1 | `GreenLib` 0, `CGreen` 0, `PlainRed` 0 (flag off) | `RedLib.swift:8:32: error: expression uses unsafe constructs but is not marked with 'unsafe' [#StrictMemorySafety]`; `CRed.swift:3:20: error: class 'Buffer' has storage involving unsafe types` |
| V7b escape only | `EscapeOnly` | 6.4 exit **0** (not red); 6.3.3 exit 1 | n/a | reported as not red on 6.4: strict mode is silent on a bare escape |
| V8 Span | `SpanRed` | exit 1 | n/a | `SpanRed.swift:2:23: error: a function cannot return a ~Escapable result` |
| V9 ASan escape | `swift build --sanitize=address --product EscapeExe` then run, `ASAN_OPTIONS=detect_leaks=0` | `EscapeExe` exit 1 `heap-use-after-free ... READ of size 1`, with strict-as-error build exit 0 | `EscapeTwin` exit 0 (`read 7`) | |
| V10 TemporaryPointers | `swiftc -typecheck -swift-version 6 -Werror TemporaryPointers TmpPtr.swift`; also `-warnings-as-errors`, `-emit-sil`, `-c` | 6.4: rc 0 in all 9 combinations (warning only); 6.3.3: rc 1 with `-warnings-as-errors` and with `-Werror TemporaryPointers` | n/a | `initialization of 'UnsafePointer<Int>' results in a dangling pointer [#TemporaryPointers]`; reported as: not escalatable on 6.4 |
| V11 spelling | `cspell.sh` (A closure, B outer `unsafe`, C direct, D) | 6.3.3: A rc 1 `2:40: error: expression uses unsafe constructs`, D rc 1 | B, C rc 0 on both; A, D rc 0 on 6.4 | |
| V12 migration | `mig.sh`: `swift package migrate --to-feature StrictMemorySafety --target Mig` (6.4) | rc 0; inserts `unsafe t += Int(b[i])`, `unsafe unsafeBitCast(...)`, `unsafe s.load(as: Int.self)`; leaves `firstBytePointer` | n/a | diff in `mig-6.4.log` |
| V13 double free | `dfred` / `dfgreen` | exit 134 | exit 0 | `free(): double free detected in tcache 2` |
| V14 canary | `logred SECRETCANARY123 2>&1 | grep -c SECRETCANARY123` | prints 3 | `loggreen` prints 0 | `Authorization=Bearer SECRETCANARY123 url=https://user:SECRETCANARY123@...` vs `Authorization=<redacted> url=https://registry.example/...?X-Amz-Signature=REDACTED` |
| V15 library leak | `ahc/Sources/ahcleak` (async-http-client 1.36.2) | interpolation, `String(describing:)`, `dump` all print `Bearer("SECRETCANARY123")`; `headers` and `url` print canary | n/a | `Authorization(scheme: ...Scheme.Bearer("SECRETCANARY123"))` |
| V16 Foundation error | `urlerr` | `"\(error)"` and `failingURL` contain the canary (2 lines) | `localizedDescription` has 0 | 6.4 and 6.3.3 |
| V17 terminal | `termred 2>&1 >/dev/null | od -c`; control/bidi regex count | prints `033 [ 2 J 033 ] 8 ; ; ... \a x \r 342 200 256`; count 1 | `termgreen`: `\u{1B}[2J\u{1B}]8;;...\u{7}x\u{D}\u{202E}gnp.exe`, count 0 | |
| V18 log handler | `termlog red` / `termlog green` | count 1 (message, `error.message=`, `repo=` metadata raw) | count 0 | |
| V19 ArgumentParser | `termargs validation` | count 1: raw ESC/CR/U+202E after `Error:` | `termboundary validation` exit 64, `plain` exit 1, `exit3` exit 3, all count 0 | |
| V20 corpus | `sancorpus` / `sancorpusred` | `sancorpusred` exit 1, `failed=16` | `sancorpus` exit 0, `failed=0` | |
| V21 shortcuts | `dbgdesc/d.swift` | `debugDescription`, `String(reflecting:)`, `escaped(asASCII:false)` leave U+202E, U+0085, U+2028, U+200B, U+FEFF, U+009B raw | n/a | `342 200 256`, `302 205`, `342 200 250`, `342 200 213`, `357 273 277`, `302 233` |
| V22 JSON | `jsonenc` | U+202E, U+2028 raw in JSON | ESC → `\u001b`, CR → `\r` escaped | `[ " a p p \ u 0 0 1 b [ 2 J \ r 342 200 256 ...` |
| V23 greps | `checks.sh` | K1 1, K2 1, K4 3, K5 1+1, K6 1, K7a 1, K7b 4, K8 1, K12 2, S1 1, S3 3, S4 1 | all 0 | S1 real tree: pre-fix 10 lines, post-fix 9 (name-based noise, run on changed files); S3 real: 2 vs 3 |
| V24 RNG | `rules/rng.sh` (grep, grep, swiftlint) | `: RandomNumberGenerator`, `arc4random`/`drand48` (2 lines); `Insecure.MD5` unmarked (1 line); `legacy_random` 2 warnings | 0, 0, 0 | `bad/Rng.swift:13:33: warning: Legacy Random Violation` |
| V25 CryptoKit | `swiftc -typecheck cryptokit.swift` (6.4) | exit 1 `error: no such module 'CryptoKit'` | `rngchk` (`import Crypto`) exit 0 | |
| V26 scanner | `osv-scanner scan source -L scan/red/Package.resolved` (v2.6.0, sha256 `ca69b3d3...b108` verified) | exit 1, 3 vulnerabilities | `scan/green` exit 0 `No issues found` | |
| V27 advisory gap | `gh api -X GET advisories -f cve_id=CVE-2026-43678 -f type=reviewed --jq 'length'` | `0` for 43678, 97696, 97697, 102835, 43820, 43823 | `1` for CVE-2026-43671, CVE-2026-28815 | |
| V28 tooling | `swift package audit`; `swift package generate-sbom` | `audit` rc 64 both toolchains | `generate-sbom` rc 0 on 6.4, rc 64 on 6.3.3 | `created cyclonedx1 v1.7 SBOM`, `created spdx3 v3.0.1 SBOM` |

A verification that did not go red, and why: **V7b** (`EscapeOnly` on 6.4): StrictMemorySafety does not flag a pointer that escapes by return; the red fixture for the escape is V8 (`Span`) or V9 (ASan). **V10**: the diagnostic exists but cannot be turned into a failing build on 6.4, so SW-SEC-14(d) greps the build log. **Not run**: Dependabot, Trivy, Syft/Grype, decompression-bomb limits, Windows/Apple behaviour (`unverified: read only`), `os.Logger` privacy, constant-time compare observability.

## Exemplar evidence

| Candidate | Satisfies | Violates / contradicts |
|---|---|---|
| SW-SEC-01/02 depth | hummingbird@1bd3b407fb47:Sources/Hummingbird/Codable/URLEncodedForm/URLEncodedFormNode.swift:262,276 (`maxKeyDepth = 64`); swift-protobuf@6c84c3dedac0:Sources/SwiftProtobuf/JSONDecodingOptions.swift:22 (100); swift-foundation@aadd9259be07:Sources/FoundationEssentials/JSON/JSONScanner.swift:290 (512) | the pre-2.26.0 Hummingbird decoder (advisory); `recursionLimit` and `maxNesting` appear in 0 repos |
| SW-SEC-04 size | containerization@3e7bc39e66b3:Sources/ContainerizationOCI/Client/RegistryClient.swift:106,316 (4 MiB); `RegistryClient+Error.swift:53` (1 MiB); `collect(upTo:)` in hummingbird 11 files, vapor 9, containerization 6, async-http-client 4 | `readDataToEndOfFile` in swift-package-manager 5 files, tuist 4, swift-argument-parser 4, container 3 (mostly local trusted input; the rule is "wire input", so most are not violations, and none carries a `bounded:` marker: 0 adoption) |
| SW-SEC-12 strict mode | swift-collections@935f696a549a:Package.swift:111; vapor@bf77fc69b142:Package.swift:246; swift-testing@c7d68ca20cd7:Package.swift:199; SwiftPM ships a migration fixture swift-package-manager@5546f44a3b52:Fixtures/SwiftMigrate/StrictMemorySafetyMigration/Package.swift | 37 of 40 repos do not enable it, including every C-wrapping repo outside collections (sourcekit-lsp, containerization, swift-crypto); none uses `.treatWarning("StrictMemorySafety", as: .error)` (the three enable the flag as warnings) |
| SW-SEC-13 `unsafe` audit | swift-collections: 5,310 `unsafe` lines, 479 `@safe`/`@unsafe` lines | 0 `// SAFETY` comments in swift-collections, vapor, swift-testing; 1 in swift-foundation: the convention does not exist |
| SW-SEC-15 one owner | sourcekit-lsp@c6ce93d5f8aa:Sources/SourceKitD/SKDRequestDictionary.swift:57,65-67 (`nonisolated(unsafe) let dict`, release in `deinit`) | `SourceKitDCore.swift:78-83`: `deinit` closes the dylib handle from `Task.detached` (teardown not ordered with process exit; strict mode off); swift-crypto GHSA-8q93-f6xh-4f6f (catch + `deinit` free) |
| SW-SEC-18/20 secrets | hummingbird@1bd3b407fb47:Sources/Hummingbird/Middleware/LogRequestMiddleware.swift:51-62,108,122 (allow-list default, `redactHeaders`); `TracingMiddleware.swift:56-62` (`redactingQueryParameters`) | async-http-client@017115279d09:Sources/AsyncHTTPClient/HTTPHandler.swift:466-479 (`Authorization` prints its token); `CustomReflectable` redaction in 0 repos |
| SW-SEC-23 sanitiser | none: 0 of 40 sanitise wire text for terminals | tuist@2f6ac74754bf:swifterpm/Sources/swifterpm/Restore.swift:1374 filters `controlCharacters` from a path, not a terminal boundary; swift-argument-parser prints raw; swift-log `StreamLogHandler` prints raw |
| SW-SEC-26/27 crypto | swift-crypto@1c80d3aff53f:Sources/CryptoExtras/AES/AES_CTR.swift:65 (`SystemRandomNumberGenerator`), `HMAC.swift:205,214`, `SymmetricKeys.swift:198` (`safeCompare`); containerization imports `Crypto` in 23 files | swift-system@486d48c80fce:Sources/System/MachPort.swift:68 `mach_port_context_t(arc4random())` (a port-name secret; Apple-only); container@f70ecbb926d9 imports `CryptoKit` in 5 files (Apple-only product, not a violation); `Insecure.MD5/SHA1` in tuist (7 files) and container as cache/avatar keys, never marked `insecure-ok` |
| SW-SEC-29 scanning | 3 libraries commit `Package.resolved` (map H5) | no exemplar runs `osv-scanner` in a workflow (not measured here beyond the config audit) |

## AI-agent angle

| Characteristic mistake | Why it happens | Smallest mechanical check |
|---|---|---|
| Writes a hand-rolled recursive-descent parser (JSON, YAML, query string, config) with no depth parameter, or a recursive `Codable` over a custom `Decoder` | trained on parsers for trusted input | exit-code test with 100,000 nested levels; SW-SEC-01 (exit 139 vs 65) |
| `Data(contentsOf: url)`, `readDataToEndOfFile()`, `URLSession.data(from:)` on a registry response | shortest API | K1 grep; `collect(upTo:)` or capped read (SW-SEC-04) |
| `Int(x)` on a `UInt64`/`UInt32` wire field, `UInt32(truncatingIfNeeded:)` to "fix" a conversion error, `&+` to silence a trap | silences the compiler or the crash | S1/S3/S4 greps (SW-SEC-07 to -09) |
| Runs `swift package migrate --to-feature StrictMemorySafety` or sprinkles `unsafe` on every warning | the diagnostic is a warning with an obvious fix-it | review `unsafe` additions as new code (SW-SEC-13); ASan run (SW-SEC-11) |
| Returns `buffer.baseAddress` from `withUnsafeBufferPointer`, or `let p = UnsafePointer(&x)` | "just need the pointer" | `SpanRed`-style compile error; K5 grep; ASan; build-log grep for `TemporaryPointers` |
| Public Swift wrapper around a C handle with `public var raw: OpaquePointer?`, `free` in both `init` error path and `deinit` | C-style cleanup | K5 and K6 greps; construct-with-bad-input test under ASan |
| Believes strict memory safety "proves" the code is safe, or enables it repo-wide and then silences it | misreads SE-0458 as a checker | read SW-SEC-12/13: the group audits uses and is silent on escapes |
| `logger.info("...", metadata: ["Authorization": "\(header)"])`, `print(error)`, `"\(url)"` in an error description | logging debugging habit | K7a/K7b greps; canary test (SW-SEC-22) |
| Interpolates a Foundation `URLError`/`NSError` into error text (`"\(error)"`) | works on Apple platforms with a prettier format | SW-ERR-18 check `grep -c 'Error Domain='` plus the canary test |
| `@Option var password: String` | natural CLI shape | K12 grep (SW-SEC-21) |
| Prints registry text with `print`/`FileHandle.standardError.write` and assumes ArgumentParser or `debugDescription` sanitises | trusts the framework | K8 structural grep and the `[[:cntrl:]]` + bidi byte count (SW-SEC-23) |
| Writes a "sanitiser" as `replacingOccurrences(of: "\u{1B}\\[[0-9;]*m", ...)` | copies the colour-strip idiom | the 19-row corpus (16 FAIL on the regex) |
| `import CryptoKit` in cross-platform code, `SHA256.hash(...).hexString`, `digest.count` (no such members; `count` resolves to `Sequence.count(where:)` and errors with `generic parameter 'E' could not be inferred`, a misleading message) | CryptoKit examples dominate | `swift build` on Linux; use `Array(digest)` or `.map` |
| `UUID().uuidString` or `Int.random(in:using: &seeded)` for a token; `arc4random()`/`drand48()` | stackoverflow idioms | SW-SEC-26 grep and `legacy_random` |
| "Dependabot/OSV is green, so we are patched" | assumes scanners are complete | SW-SEC-30: the six-CVE gap and the hand-set floors |
| Searches for `swift package audit` and invents one | exists in npm, cargo | `swift package audit` exits 64 |

## Contested / evolving

- **StrictMemorySafety as default.** Still opt-in "with no path toward becoming the default" ([vision](https://github.com/swiftlang/swift-evolution/blob/main/visions/memory-safety.md)); adoption is 3/40 in October 2026, led by swift-collections. Trend: more libraries with C seams will enable it; the 6.4 relaxation (no warning for safe members of unsafe-typed closure parameters, no warning on a bare `baseAddress` return) shrinks the noise and widens the blind spot. The group is not escalatable for `TemporaryPointers` on 6.4, which looks like a regression from 6.3.3; no upstream issue was filed or checked here.
- **`Span` replacing pointers.** SE-0447/SE-0446 (6.2) and the 6.2 post push `Span`; C-library APIs and Foundation still take pointers. Trend: pointer escape becomes a compile error for new code; seam code keeps `unsafe` for years.
- **Depth numbers.** 64 (Hummingbird), 100 (protobuf), 512 (Foundation) are three defensible constants; no Swift convention exists. This file picks 64 / ceiling 512 and says why; a fleet CLI parsing larger documents would raise its own constant with a test.
- **Escape vs strip in the sanitiser.** Rust SEC-34 strips with a VT state machine; this file escapes every control scalar. Escape keeps evidence and needs no state machine, but changes the visible text (a legitimate `\r` progress bar in error text is also escaped, ZWJ emoji look odd). The disagreement is about readability, not safety. Trend: unknown; no Swift library does either.
- **JSON output and bidi.** Machine JSON containing U+202E is faithful but terminal-unsafe on `cat`; sanitising JSON would break round-tripping. Left to SW-SEC-25's TTY rule; unresolved.
- **Where the sanitiser is called.** Root hook vs type-level `SafeDisplay`-style newtype (Rust SEC-31). The hook is the only place every path is forced through; a newtype for wire strings is stronger but requires every decoded model to use it. This file mandates the hook and lists the newtype as optional, not researched.
- **GitHub advisory coverage.** 64 reviewed Swift advisories, six well-known 2026 CVEs absent. Whether GitHub will import repository advisories later is unknown; the check in SW-SEC-30 re-runs cheaply.
- **Dependabot for Xcode projects.** GA 2026-03-31; Swift registries unsupported ("Swift registries are not supported"). If the fleet uses a SwiftPM registry, Dependabot is blind.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0458-strict-memory-safety.md | SE-0458 Opt-in strict memory safety (primary) | Implemented 6.2 | `unsafe`, `@unsafe`, `@safe`, diagnostics group, SwiftPM spelling |
| https://github.com/swiftlang/swift-evolution/blob/main/visions/memory-safety.md | Optional strict memory safety vision (primary) | 2025 | why it stays opt-in; C-interop limit |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0480-swiftpm-warning-control.md | SE-0480 SwiftPM warning control (primary) | Implemented 6.2 | `.treatWarning(_:as:)` spelling |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0447-span-access-shared-contiguous-storage.md | SE-0447 Span (primary) | Implemented 6.2 | the safe replacement for escaping pointers |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0446-non-escapable.md | SE-0446 Nonescapable types (primary) | Implemented 6.2 | why `Span` return from local storage is an error |
| https://www.swift.org/blog/swift-6.2-released/ | Swift 6.2 release post (primary) | 2025-09 | "best left for projects with the strongest security requirements" |
| https://github.com/swiftlang/swift/blob/main/stdlib/public/core/Random.swift | `SystemRandomNumberGenerator` docs and source (primary) | main, 2026-10 | per-platform CSPRNG implementation |
| https://github.com/apple/swift-crypto | swift-crypto README (primary) | 2026-10 | CryptoKit relationship, `Crypto` vs `CryptoExtras`, SemVer scope |
| https://github.com/apple/swift-crypto/security/advisories/GHSA-8q93-f6xh-4f6f | CVE-2026-43823 double free (primary vendor) | 2026-07-16 | the catch-plus-`deinit` free; fixed 4.5.1 |
| https://github.com/hummingbird-project/hummingbird/security/advisories/GHSA-97r6-mq85-c3rv | CVE-2026-97696 unbounded recursion (primary vendor) | 2026-08 | the parser-limit advisory; fixed 2.26.0 |
| https://github.com/apple/swift-nio/security/advisories/GHSA-qcc5-f287-vgmq | CVE-2026-43678 WebSocket length trap (primary vendor) | 2026-07-09 | the conversion advisory; `<= 2.100.0` |
| https://github.com/apple/swift-log | swift-log source and docs, tag 1.16.1 (primary) | 2026 | `Logger.MetadataValue`, `LogEvent`, no privacy model |
| https://github.com/opencontainers/distribution-spec/blob/main/spec.md | OCI distribution spec (standard) | main | name and tag grammar; free-text `message` |
| https://developer.apple.com/documentation/os/oslogprivacy.md | Apple OSLogPrivacy reference (primary, Apple-only) | 2026 | the privacy model swift-log lacks |
| https://github.com/google/osv-scalibr/blob/main/extractor/filesystem/language/swift/packageresolved/packageresolved.go | OSV-Scalibr `Package.resolved` extractor (tool source) | 2026 | proves what OSV-Scanner reads |
| https://github.com/google/osv-scanner/releases | OSV-Scanner v2.6.0 release (tool) | 2026 | binary run for the red/green scan |
| https://docs.github.com/en/code-security/dependabot/ecosystems-supported-by-dependabot/supported-ecosystems-and-repositories | Dependabot ecosystems table | 2026 | `swift`, v5/v6, registry limits |
| https://github.blog/changelog/2026-03-31-dependabot-now-supports-xcode-projects-using-swiftpm-with-xcodeproj-manifests | Dependabot Xcode SwiftPM changelog | 2026-03-31 | `Package.resolved` in `.xcodeproj`/`.xcworkspace` |
| https://github.blog/changelog/2023-08-01-swift-support-for-dependabot-updates/ | Dependabot Swift updates changelog | 2023-08-01 | Swift advisories in Dependabot alerts since June 2023 |
| https://trivy.dev/latest/docs/coverage/language/swift/ | Trivy Swift coverage | 2026 | reads `Package.resolved`, stale-file caveat |
| https://github.com/anchore/syft/blob/main/syft/pkg/cataloger/swift/cataloger.go | Syft Swift cataloger | 2026 | globs `**/Package.resolved`, `**/.package.resolved` |
| https://cwe.mitre.org/data/definitions/150.html | CWE-150 escape/control sequences | current | the weakness class and mitigations |
| https://trojansource.codes/ | Trojan Source, CVE-2021-42574 | 2021 | why bidi controls matter in names |
| https://invisible-island.net/xterm/ctlseqs/ctlseqs.html | xterm control sequences | current | OSC 52 clipboard writes and other sequences to neutralise |
| `gh api -X GET advisories -f ecosystem=swift` | GitHub global advisory API (measured) | 2026-10-10 | 64 reviewed Swift advisories; six CVEs absent |
| https://api.osv.dev/v1/query | OSV query API (measured) | 2026-10-10 | `SwiftURL` names; swift-nio 2.100.0 clean |
| swift-foundation@aadd9259be07:Sources/FoundationEssentials/JSON/JSONScanner.swift | exemplar: JSON depth cap 512 | 2026-10-10 | where the 512 comes from |
| hummingbird@1bd3b407fb47:Sources/Hummingbird/Codable/URLEncodedForm/URLEncodedFormNode.swift | exemplar: fixed decoder, `maxKeyDepth` | 2026-10-10 | the shipped fix and its comment |
| containerization@3e7bc39e66b3:Sources/ContainerizationOCI/Client/RegistryClient.swift | exemplar: 4 MiB body cap | 2026-10-10 | fleet-relevant OCI size defaults |
| sourcekit-lsp@c6ce93d5f8aa:Sources/SourceKitD/SKDRequestDictionary.swift | exemplar: C handle owner class | 2026-10-10 | the one-owner `deinit` pattern |
| async-http-client@017115279d09:Sources/AsyncHTTPClient/HTTPHandler.swift | exemplar: `Authorization` type | 2026-10-10 | the leaking library type |
