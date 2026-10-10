---
title: JSON determinism, digests, Foundation on Linux, clocks and String views (Swift 6.4 / 6.3)
topic: swift-io / formats-and-determinism (W2-13; rows M-A-03, M-A-04, M-A-05, M-G-10..M-G-16, M-I-05)
agent: formats-and-determinism
model: sonnet
date_researched: 2026-10-10
sources_count: 28
fixtures: /home/mherwig/.cache/research-lang/swift-tools/fixtures/formats-and-determinism/
scope: |
  Covers: the canonical-JSON recipe for hashed or diffed bytes, a verbatim digest parse-and-compare function, the Foundation import rule
  (conflict 12 confirmed and sharpened), the Date and Codable policy, locale-free machine output, directory-order sorting, the clock-choice table
  and the String-view rule for protocol parsing. Every runnable claim was run on swift:6.4 and swift:6.3.3 Linux x86_64 (Docker).
  Not covered: Darwin behaviour (no macOS: marked "unverified: read only"), Windows, Wasm, the static Linux SDK binary sizes (SDK not installed here),
  HTTP client choice (AsyncHTTPClient vs URLSession beyond the import guard), and subprocess or archive topics (other W2 dives).
---

# JSON determinism, digests, Foundation on Linux, clocks and String views

All dates 2026-10-10. Toolchains: Swift 6.4 (`swift-6.4-RELEASE`, Swift Build engine) and 6.3.3, via
`~/.cache/research-lang/swift-tools/run.sh`. Fixture root: `~/.cache/research-lang/swift-tools/fixtures/formats-and-determinism/`
(driver: `verify.sh [6.4|6.3]`, logs: `verify-6.4.log`, `verify-6.3.log`). Exemplar SHAs: swift-foundation `aadd9259be07`,
containerization `3e7bc39e66b3`, swift-container-plugin `a9646b8d4dca`, swift-argument-parser `efd239f0055b`, swift-crypto `1c80d3aff53f`.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   - [1. Dictionary order is per-process random; JSON must be sorted explicitly](#1-dictionary-order-is-per-process-random-json-must-be-sorted-explicitly)
   - [2. The canonical JSON recipe, and what `.sortedKeys` is not](#2-the-canonical-json-recipe-and-what-sortedkeys-is-not)
   - [3. Digest grammar and the String-view trap](#3-digest-grammar-and-the-string-view-trap)
   - [4. The verbatim digest parse-and-compare function](#4-the-verbatim-digest-parse-and-compare-function)
   - [5. String views for protocol parsing](#5-string-views-for-protocol-parsing)
   - [6. Foundation, FoundationEssentials, FoundationNetworking: the import rule](#6-foundation-foundationessentials-foundationnetworking-the-import-rule)
   - [7. Date and Codable policy](#7-date-and-codable-policy)
   - [8. Locale-sensitive machine output](#8-locale-sensitive-machine-output)
   - [9. Directory listing order](#9-directory-listing-order)
   - [10. Clocks: ContinuousClock, SuspendingClock, Date](#10-clocks-continuousclock-suspendingclock-date)
   - [11. Hex encoding without Foundation, and compressed-blob determinism](#11-hex-encoding-without-foundation-and-compressed-blob-determinism)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- `Dictionary` and `Set` iteration order is seeded per process; bytes built by iterating one (or by a bare `JSONEncoder()`) differ between two runs (`cmp` exit 1 on 6.4 and 6.3). Sort explicitly, or encode with `[.sortedKeys, .withoutEscapingSlashes]`.
- On Linux (swift-foundation, 6.3 and 6.4) `.sortedKeys` sorts keys by UTF-8 bytes and reproduces the RFC 8785 sample byte for byte, but it is not JCS: key order differs from UTF-16 order for non-BMP keys, `-0.0` prints `-0`, and `123456789012345680000.0` prints `1.2345678901234568e+20`.
- Never re-encode a received JSON document to compute its digest; hash the bytes you received. containerization re-encodes an OCI index with a bare `JSONEncoder()` (`ImageStore+Export.swift:130`).
- Parse digests over `utf8` bytes: algorithm allow-list, lowercase ASCII hex, exact length, then compare the parsed value, not raw strings. Character-level checks accepted `b`+U+0308 and `d`+U+200D as hex digits (red on 6.4 and 6.3).
- Swift `Regex` digest patterns fail closed on combining marks but swift-container-plugin's `[a-fA-F0-9]{64}` accepts uppercase, which the OCI spec forbids (MUST NOT use `[A-F]`) and which makes two spellings of one digest unequal.
- `Character.isHexDigit` accepts fullwidth `U+FF41`; `hasPrefix`, `split(separator:)`, `contains` and `firstIndex(of:)` on protocol text are grapheme-level: `"a:\u{301}b"` has no `:` and `"a\r\nb".split(separator: "\n")` has one element. Use `utf8` (or `unicodeScalars`) for protocol text.
- `import Foundation` changes overload resolution: `"a\r\nb".contains("\n")` is `true` with Foundation and `false` stdlib-only (both 6.4 and 6.3).
- Library rule (conflict 12 confirmed): `#if canImport(FoundationEssentials) import FoundationEssentials #else import Foundation #endif`; CLIs may `import Foundation`. Essentials-only code links 10.7 MB `libFoundationEssentials.so` and avoids the 40.5 MB `lib_FoundationICU.so`.
- FoundationEssentials lacks `String(format:)`, `trimmingCharacters`, `replacingOccurrences`, `range(of:)`, `NumberFormatter`, `DateFormatter`, `Process`, `FileHandle`, `Pipe`, `NSLock`, `exit()` and numeric `.formatted()` (the last is in FoundationInternationalization). Typecheck matrix, 6.3 = 6.4.
- `URLSession` needs `#if canImport(FoundationNetworking) import FoundationNetworking #endif` on Linux; without it the error is `type 'URLSession' (aka 'AnyObject') has no member 'shared'` (build exit 1; guarded twin exit 0; same on 6.3).
- The default `Date` strategy encodes `timeIntervalSinceReferenceDate` (`Date.swift:352-355`): Unix epoch 0 becomes `-978307200`. Set `.iso8601` (second precision, drops fractions) or `.secondsSince1970`/`.millisecondsSince1970` on every encoder and decoder that touches a wire format.
- Synthesized `Decodable` still requires a property that has a default value (`var mode = "fast"` gives `keyNotFound` on an old document); unknown keys are silently ignored. Use a custom `init(from:)` with `decodeIfPresent(...) ?? default`.
- On Linux `Locale.current` is hard-wired to `en_001` (`Locale_Cache.swift:302-315`): `LANG`/`LC_ALL=de_DE.UTF-8` changed nothing (the brief's planted red did not go red), but `.formatted()` is still not machine output (`1,234.5`, `14/11/2023`). Use interpolation or `Date.ISO8601FormatStyle`. Darwin consults user preferences: unverified: read only.
- Sort every `contentsOfDirectory` / enumerator result by UTF-8 bytes before it reaches output, a digest or a test; ext4 returned `e,w,m,f,a,y,b,z,d,k,c,x` for 12 names (43 of 70 non-test exemplar files that list a directory never sort).
- Elapsed time and timeouts use `ContinuousClock` (also `Task.sleep(for:)`'s default); `SuspendingClock` only for awake time; `Date` only for wall timestamps. Linux maps them to `CLOCK_BOOTTIME` and `CLOCK_MONOTONIC` (`Clock.cpp:52-59,85-88`).
- `SWIFT_DETERMINISTIC_HASHING=1` makes hash order repeatable across runs (cmp exit 0) but not sorted and not stable across stdlib releases; it is a test aid, never a canonicalizer.
- Canonically-equivalent JSON member names (`é` vs `e`+U+0301) collapse silently when decoded into `[String: T]` (count 1), and a dictionary literal with both crashes at runtime.
- Hex-encode bytes with a lookup table, not `String(format: "%02x")`, which needs full Foundation and defeats the Essentials import rule.

## Findings

### 1. Dictionary order is per-process random; JSON must be sorted explicitly

- The stdlib documents it: dictionary order "is stable between mutations but is otherwise unpredictable" ([Dictionary.swift](https://github.com/swiftlang/swift/blob/main/stdlib/public/core/Dictionary.swift) lines 331-332), and `Hasher` "is usually randomly seeded ... different values on every new execution" ([Hasher.swift](https://github.com/swiftlang/swift/blob/main/stdlib/public/core/Hasher.swift) lines 289-293; per-execution seed at 300-301).
- `SWIFT_DETERMINISTIC_HASHING` is read at startup: when set, seeds are `{0, 0}`; the comment says "hash values aren't guaranteed to remain stable across even minor stdlib releases" ([GlobalObjects.cpp](https://github.com/swiftlang/swift/blob/main/stdlib/public/stubs/GlobalObjects.cpp) lines 143-156, read 2026-10-10).
- Measured (6.4 and 6.3.3, fixture `fx/Sources/JsonRed`): the same 12-key dictionary, iterated by hand into a JSON string and encoded by a bare `JSONEncoder()`, printed a different key order in every pair of process runs compared (4 pairs across the two toolchains); the hand-iterated and encoder lines also differed from each other inside one run. `cmp` of two runs exits 1.

```text
run 1: {"india":9,"lima":12,"bravo":2,"alpha":1,"hotel":8,...}
run 2: {"golf":7,"hotel":8,"alpha":1,"lima":12,"bravo":2,...}
sorted twin (both runs): {"alpha":1,"bravo":2,"charlie":3,"delta":4,...,"lima":12}
```

- With `SWIFT_DETERMINISTIC_HASHING=1` two runs of the red program were byte-identical (`cmp` exit 0) but the output was still hash order, not sorted (`cmp` against the sorted output exits 1). It is a test-harness aid; the stdlib says hash values may change between any two versions.

Incorrect (order leaks into bytes):

```swift
let body = "{" + tags.map { "\"\($0.key)\":\($0.value)" }.joined(separator: ",") + "}"   // iteration order
let bytes = try JSONEncoder().encode(tags)                                                 // no .sortedKeys
```

Correct:

```swift
let enc = JSONEncoder()
enc.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
let bytes = try enc.encode(tags)
// hand-built output: tags.sorted { $0.key.utf8.lexicographicallyPrecedes($1.key.utf8) }
```

### 2. The canonical JSON recipe, and what `.sortedKeys` is not

- `OutputFormatting` has `.prettyPrinted`, `.sortedKeys` ("sorts keys in lexicographic order"), `.withoutEscapingSlashes` (default escapes `/` as `\/`) ([swift-foundation@aadd9259be07:Sources/FoundationEssentials/JSON/JSONEncoder.swift:61-85](https://github.com/swiftlang/swift-foundation/blob/main/Sources/FoundationEssentials/JSON/JSONEncoder.swift)). Not Darwin-only text: the same file builds on Linux.
- The sort path off Apple frameworks is `a.key.utf8.lexicographicallyPrecedes(b.key.utf8)` (`swift-foundation@aadd9259be07:Sources/FoundationEssentials/JSON/JSONWriter.swift:297-305`). Under `FOUNDATION_FRAMEWORK` with `JSONEncoder.compatibility1` it instead uses `NSString.compare` with `[.numeric, .caseInsensitive, .forcedOrdering]` (`JSONWriter.swift:274-290`). Apple's developer forum records a one-time `sortedKeys` order change in macOS Sequoia and an engineer saying you cannot set the order ([thread 763965](https://developer.apple.com/forums/thread/763965)). Darwin behaviour: unverified: read only.
- Measured on Linux (fixture `fx/Sources/JcsProbe`, 6.4 and 6.3.3): with `[.sortedKeys, .withoutEscapingSlashes]` the [RFC 8785 section 3.2.2 sample](https://www.rfc-editor.org/rfc/rfc8785.txt) encodes byte-identical to the RFC text (`sample == RFC 8785 text: true`): `{"literals":[null,true,false],"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27],"string":"€$\u000f\nA'B\"\\\\\"/"}`. Non-ASCII is not escaped, control characters use lowercase `\u000f`, `Double.nan` throws `EncodingError.invalidValue`.
- It is still not JCS ([RFC 8785 section 3.2.3](https://www.rfc-editor.org/rfc/rfc8785.txt) sorts by UTF-16 code units; the OCI spec says implementations MAY use it, [considerations.md](https://github.com/opencontainers/image-spec/blob/main/considerations.md)):

| Probe | `.sortedKeys` output (Linux, 6.4 = 6.3) | RFC 8785 requires |
|---|---|---|
| keys `～` (U+FF5E) and `𐀀` (U+10000) | `...,"～":1,"𐀀":2}` (UTF-8 order) | `"𐀀"` before `"～"` (UTF-16 order) |
| `-0.0` | `-0` | `0` |
| `123456789012345680000.0` | `1.2345678901234568e+20` | `123456789012345680000` |
| `9007199254740993` as `Int` / as `Double` | `9007199254740993` / `9007199254740992` | I-JSON: numbers should fit IEEE double |

- OCI content is I-JSON (UTF-8, no duplicate names, order not significant) and the digest covers the exact bytes ([considerations.md](https://github.com/opencontainers/image-spec/blob/main/considerations.md), [descriptor.md](https://github.com/opencontainers/image-spec/blob/main/descriptor.md) "Verification"). So: write once with the recipe, store the bytes, hash the stored bytes; for a document you received, hash what you received.
- Decoding trap, same fixture: `{"\u00e9":1,"e\u0301":2}` decoded into `[String: Int]` yields `count=1` (`["é": 1]`), silent loss, because `String` keys are compared by canonical equivalence ([Apple String docs](https://developer.apple.com/documentation/swift/string), [TSPL](https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/LanguageGuide/StringsAndCharacters.md) lines 1292-1294). A dictionary literal containing both spellings traps at runtime: `Fatal error: Dictionary literal contains duplicate keys`.
- Gzip bytes are not portable either: swift-container-plugin pins the gzip header OS byte to 255 because zlib's default changed between releases and platforms, and still notes "Different versions of zlib might still produce different compressed output" (`swift-container-plugin@a9646b8d4dca:Sources/containertool/gzip.swift:38-61`). Reading only; not run.

### 3. Digest grammar and the String-view trap

- OCI grammar ([descriptor.md](https://github.com/opencontainers/image-spec/blob/main/descriptor.md) lines 75-90): `digest ::= algorithm ":" encoded`, `algorithm ::= component (separator component)*`, component `[a-z0-9]+`, separator `[+._-]`, `encoded ::= [a-zA-Z0-9=_-]+`. Registered: `sha256` and `sha512`/`blake3` with `/[a-f0-9]{64}/` (`{128}` for sha512): "Note that `[A-F]` MUST NOT be used here." Implementations SHOULD pass unknown algorithms that match the grammar, and MUST implement sha256.
- containerization's `ParsedDigest` is the exemplar. It validates over `utf8` and says why: `Character` comparison uses canonical ordering, so `"b" + U+0308` "compares as inside `"a"..."f"` and would be accepted" (`containerization@3e7bc39e66b3:Sources/ContainerizationOCI/Content/Digest.swift:80-91`). It is deliberately narrower than the grammar (`sha256` only, lowercase only) because the blob path is `blobs/sha256/<hex>` (`Digest.swift:21-38`), and it has a containment check for the path (`Digest.swift:119-131`).
- Measured (fixture `fx/Sources/DigestCheck`, 16 vectors, 6.4 = 6.3): three naive implementations were each wrong somewhere; the byte-level one was right on all 17 checks.

| Implementation | Wrongly accepted |
|---|---|
| `("0"..."9").contains($0) \|\| ("a"..."f").contains($0)` on `Character`s | `63 hex + b U+0308`, `last hex + U+0301`, `last hex + ZWJ U+200D` (chars=71, utf8=73/74) |
| `Character.isHexDigit` | uppercase hex, fullwidth `ａ` U+FF41 (`hexDigitValue == 10`) |
| `/(sha256):([a-fA-F0-9]{64})/.wholeMatch` (swift-container-plugin's shape, `ImageReference.swift:287`) | uppercase hex (OCI MUST NOT); fails closed on combining marks (Regex is grapheme-level) |
| byte-wise `ContentDigest(parsing:)` (finding 4) | nothing |

- Why raw `==` on digest strings is the second half of the bug: `String ==` is canonical equivalence (`"é" == "e\u{301}"` is `true`, `utf8` bytes differ), and `.lowercased() ==` "normalization" makes uppercase and lowercase spellings equal, so two spellings of one digest map to two blob names or one wrongly. Compare parsed values (`algorithm`, `hex`), never raw strings. containerization compares raw strings at `ImageStore+Import.swift:174,198` and `RegistryClient+Push.swift:83,157`; safe only because both sides were already validated, which the code does not state.

### 4. The verbatim digest parse-and-compare function

Run as `ContentDigest(parsing:)` in `fx/Sources/DigestCheck/Digest.swift` (Swift 6 mode, typed throws, no Foundation). 17/17 decisions correct on 6.4 and 6.3.3.

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
// Compare: `try ContentDigest(parsing: a) == ContentDigest(parsing: b)` (synthesized Hashable: algorithm and hex).
// Unregistered algorithms that must pass through (OCI SHOULD): a separate byte-wise grammar check, isWellFormedOCI(_:), in the same file.
```

Rejected in the run: uppercase, `b`+U+0308, `d`+U+0301, `d`+ZWJ, fullwidth `ａ`, fullwidth colon, trailing `\n`, trailing NUL, 63 and 65 hex, `sha256:../../etc/hosts`, `sha384`, empty hex, missing colon. Accepted: `sha256:ba7816bf...15ad` and a 128-hex `sha512:`. The result is a validated ASCII path component (containerization's design goal, `Digest.swift:21-38`).

### 5. String views for protocol parsing

[TSPL](https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/LanguageGuide/StringsAndCharacters.md) lines 1292-1294 and [Apple's String docs](https://developer.apple.com/documentation/swift/string): equality and ordering use Unicode canonical equivalence over extended grapheme clusters; [UAX #29](https://www.unicode.org/reports/tr29/tr29-47.html) rule GB3 (`CR × LF`) joins CRLF into one cluster and GB9 (`× (Extend | ZWJ)`) attaches combining marks and ZWJ to the previous character. Measured on 6.4 and 6.3.3 (fixtures `fx/Sources/Strings`, `probe/stringsstd.swift`):

| Expression | Result | View that gives the protocol answer |
|---|---|---|
| `"e\u{301}x".hasPrefix("e")` | `false` | `utf8.starts(with: "e".utf8)` is `true` |
| `"sha256:\u{301}ab".hasPrefix("sha256:")` | `false` (fails closed) | `utf8.starts(with:)` is `true`: the bytes do start with the prefix, validate the rest |
| `"a:\u{301}b".split(separator: ":").count` | `1` | `utf8.split(separator: 0x3A).count` is `2` |
| `"a:\u{301}b".firstIndex(of: ":")` | `nil` | byte search |
| `"a\r\nb".split(separator: "\n").count` | `1` | `utf8.split(separator: 0x0A).count` is `2` |
| `"a\r\nb".count` / `utf8.count` | `3` / `4` | |
| `"\u{E9}" == "e\u{301}"` / `utf8.elementsEqual` | `true` / `false` | decide which you mean |
| `("a"..."f").contains(Character("b\u{308}"))` | `true` | byte range `0x61...0x66` |
| `Character("\u{FF41}").isHexDigit` / `.hexDigitValue` | `true` / `10` | byte range |
| `Int("\u{663}")` (Arabic-indic 3) | `nil`, but `Character.isNumber` is `true`, `wholeNumberValue` is `3` | byte range `0x30...0x39` |
| `"\u{212A}".lowercased() == "k"` (Kelvin sign) | `true` | ASCII-only fold if you need one |

- `import Foundation` changes the answer: with Foundation, `"a\r\nb".contains("\n")` is `true`; stdlib-only, `crlf.contains("\n" as String)`, `crlf.contains(Character("\n"))` and `crlf.firstIndex(of: "\n")` are `false` / `false` / `nil`. Foundation `range(of: "e")` in `"e\u{301}x"` is `nil` and `replacingOccurrences(of: "e", with: "E")` replaces nothing (scalars stay `65 301 78`, grapheme-aware matching).
- Rule shape: grapheme views (`String`, `Character`) answer "what does a human see"; `utf8` answers "what bytes are on the wire"; `unicodeScalars` answers "which code points". Protocol text (digests, HTTP header names and lines, tokens, paths, media types, JSON member names that matter for identity) is bytes. Validate ASCII first (`utf8.allSatisfy { $0 < 0x80 }`), then the String operations are safe.
- Case: `Content-Length` vs `content-length` is `false` by `==`; `caseInsensitiveCompare` (Foundation) is `true`. For header names fold ASCII bytes yourself.

### 6. Foundation, FoundationEssentials, FoundationNetworking: the import rule

- Layering ([swift-foundation README](https://github.com/swiftlang/swift-foundation/blob/main/README.md), [swift-corelibs-foundation README](https://github.com/swiftlang/swift-corelibs-foundation/blob/main/README.md)): swift-foundation (`FoundationEssentials`, `FoundationInternationalization`) is the shared implementation; corelibs `Foundation` re-exports both and adds `NSObject`-style compatibility; corelibs also installs `FoundationXML` and `FoundationNetworking`. Since Swift 6.0 importing `Foundation` on Linux uses the new implementation; `FoundationEssentials` is "almost all of Foundation minus the huge internationalization (ICU) part" ([Tony Parker, Swift Forums, 2024-07-29](https://forums.swift.org/t/swift-foundation-now-available/73530)).
- Do not depend on the swift-foundation package: "Prefer using a built-in copy of Foundation unless you're making changes to Foundation itself" ... "not suitable for use in a package or app that you intend to ship" ([Distributions.md](https://github.com/swiftlang/swift-foundation/blob/main/Distributions.md)). swift-foundation's own `Package.swift:41-45` (strict concurrency experimental feature plus `.swiftLanguageMode(.v5)`) is its internal build, not an adoption model.
- Measured typecheck matrix (fixture `fe-probe/`, `swiftc -typecheck`, 6.4 = 6.3.3; "ok" = compiles with only that import):

| Symbol | `import FoundationEssentials` | `import FoundationInternationalization` | `import Foundation` |
|---|---|---|---|
| `JSONEncoder`, `JSONDecoder`, `Data`, `Date`, `URL`, `UUID`, `FileManager`, `ProcessInfo`, `Locale.current`, `Decimal`, `Calendar`, `TimeZone`, `AttributedString`, `PropertyListEncoder`, `Date.ISO8601FormatStyle` | ok | FAIL (not re-exported) | ok |
| `Double.formatted()` | FAIL | ok | ok |
| `String.components(separatedBy:)`, `String.data(using:)` | ok | ok | ok |
| `trimmingCharacters`, `replacingOccurrences`, `range(of:)`, `String(format:)`, `NumberFormatter`, `DateFormatter`, `ISO8601DateFormatter`, `Process`, `FileHandle`, `Pipe`, `NSString`, `NSRegularExpression`, `NSLock`, `Thread`, `Bundle` | FAIL | FAIL | ok |
| `exit(0)` | FAIL (needs `import Glibc`/`Musl`/`Darwin`) | FAIL | ok |
| `URLSession`, `URLRequest` | FAIL | FAIL | FAIL (needs `FoundationNetworking`) |

- Footprint (dynamic, 6.4 image): `ldd` of an Essentials-only executable lists only `libFoundationEssentials.so` (10,700,160 bytes); a `Foundation` one adds `libFoundation.so` (8,879,456), `libFoundationInternationalization.so` (3,792,216) and `lib_FoundationICU.so` (40,468,648). The static-musl numbers (10.3 MB vs 55.6 MB) are from [eco](../swift-topic-map/ecosystem-tooling.md) section 9; the static SDK was not installed here: unverified here, read only.
- Exact Linux error without the guard (fixture `net-red`, `swift build`, exit 1, 6.4 and 6.3.3): `main.swift:4:42: error: type 'URLSession' (aka 'AnyObject') has no member 'shared'`. `URLSession` resolves to a placeholder alias, so the symptom is a missing member, not a missing module. The guarded twin (`#if canImport(FoundationNetworking) import FoundationNetworking #endif`) builds (exit 0).
- Adoption (grep over the 40-repo corpus, includes tests): `import FoundationEssentials` 656 files in 13 repos (mostly swift-foundation itself); `import Foundation` 6,617 files in 38; `canImport(FoundationNetworking)` 54 files in 10 repos; `URLSession` 210 files in 19 repos. Un-guarded non-test `URLSession` outside Darwin-only apps: `swift-argument-parser@efd239f0055b:Tools/changelog-authors/ChangelogAuthors.swift:103`, SwiftFormat `Snapshots/` samples.
- Confirms and sharpens topic-map conflict 12: libraries import `FoundationEssentials` behind `canImport` with a `Foundation` fallback; CLIs may import `Foundation`; every `URLSession` file carries the `FoundationNetworking` guard. Added: the Essentials-only build is the enforcement (it fails to compile on the symbols in the table), so a library that migrates must replace `String(format:)`, `trimmingCharacters` etc. by stdlib code. Apple-platform behaviour of `import FoundationEssentials`: unverified: read only.

### 7. Date and Codable policy

- Default strategy is `.deferredToDate` (`swift-foundation@aadd9259be07:Sources/FoundationEssentials/JSON/JSONEncoder.swift:254,381`); `Date.encode(to:)` writes `timeIntervalSinceReferenceDate` (`Sources/FoundationEssentials/Date.swift:352-355`). Measured (fixture `fx/Sources/DateCheck`, 6.4 = 6.3):

| Strategy | `Date(timeIntervalSince1970: 0)` | `Date(timeIntervalSince1970: 1_700_000_000.123456)` |
|---|---|---|
| default | `{"d":-978307200}` | `{"d":721692800.123456}` |
| `.iso8601` | `{"d":"1970-01-01T00:00:00Z"}` | `{"d":"2023-11-14T22:13:20Z"}` (fraction dropped) |
| `.secondsSince1970` | | `{"d":1700000000.123456}` |
| `.millisecondsSince1970` | | `{"d":1700000000123.456}` |
| `.custom` with `Date.ISO8601FormatStyle(includingFractionalSeconds: true)` | | `{"d":"2023-11-14T22:13:20.123Z"}` (millisecond precision) |

- Round trips: default `delta=0.0` (lossless inside Swift, wrong to anyone reading a Unix epoch); `.iso8601` `delta=-0.123456`. Decoding `"2023-11-14T22:13:20.123Z"` with `.iso8601` succeeded (`1700000000.1230001`) and `+01:00` offsets are honored (`1699996400.0`), so the decoder is more lenient than the encoder; do not rely on that leniency across versions.
- Policy: set `dateEncodingStrategy` and `dateDecodingStrategy` explicitly on every coder; `.iso8601` when seconds suffice; `.custom` fractional or `.millisecondsSince1970` otherwise; never persist the default. `Date` is wall-clock: not for durations (finding 10).
- Codable evolution (fixture `fx/Sources/CodableEvolve`, 6.4 = 6.3): unknown keys are ignored (`V1` decodes a document with `futureField`); an `Optional` property is `decodeIfPresent` automatically; **a property with a default value is not**: `struct V2 { var name: String; var mode: String = "fast" }` fails on `{"name":"a"}` with `DecodingError.keyNotFound: Key 'mode' not found`; nil optionals are omitted on encode (`{"mode":"fast","name":"a"}`); a 64-bit integer above 2^53 decoded through `Double` becomes `9007199254740992.0` while `Int64` keeps `9007199254740993`. Use a custom `init(from:)` with `decodeIfPresent(...) ?? default`, and where the contract is strict, compare `container.allKeys` against the known set. `DecodingError` prints readably since SE-0489 (Swift 6.3, [SE-0489](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0489-codable-error-printing.md)).

### 8. Locale-sensitive machine output

- On non-Darwin builds `LocalePreferences` is fixed: `prefs.locale = "en_001"`, `prefs.languages = ["en-001"]`, `preferredLocale()` returns `"en_001"` (`swift-foundation@aadd9259be07:Sources/FoundationEssentials/Locale/Locale_Cache.swift:302-315`). Environment variables are never read (no `LANG`/`LC_ALL` match in `Sources/FoundationEssentials/Locale` or `Sources/FoundationInternationalization/Locale`).
- Measured (fixture `fx/Sources/LocaleCheck`, 6.4 = 6.3): with default env, `LANG=de_DE.UTF-8`, `LC_ALL=de_DE.UTF-8`, `LANG=C` and `LANG=POSIX`, output is byte-identical (`Locale.current.identifier=en_001`; `cmp` exit 0). The brief's planted red (LANG changes machine output) therefore did not go red on Linux. The image has only `C`, `C.utf8`, `POSIX` glibc locales, so glibc-level effects (`setlocale`, `printf`) are untestable here.
- It still goes red the other way: `Locale.current` on Linux is `en_001`, whose formats are not machine formats. `1234.5.formatted()` is `1,234.5`; `1_234_567.formatted()` is `1,234,567`; `Date.formatted(date: .numeric, time: .omitted)` is `14/11/2023` (day first, not `en_US`'s `11/14/2023`). Explicit locale changes it again: `x.formatted(.number.locale(Locale(identifier: "de_DE")))` is `1.234,5`, and `Date.formatted(.dateTime.locale(de))` is `14.11.2023, 22:13`.
- Locale-independent already: `"\(x)"` / `String(describing:)` (`1234.5`), `Double("1.5")` (`1.5`; `Double("1,5")` is `nil`), `String(format: "%.2f", x)` (`1234.50`, nil locale), `Date.ISO8601FormatStyle()`. Locale-dependent: `.formatted()`, `NumberFormatter`, `DateFormatter` without `locale`/`timeZone`, `Locale.current`, `lowercased(with:)`.
- Darwin reads user preferences for `Locale.current`: unverified: read only (`#if FOUNDATION_FRAMEWORK` branch of the same file).

### 9. Directory listing order

- `FileManager.contentsOfDirectory(atPath:)` and `enumerator(atPath:)` return raw `readdir` order. Measured (fixture `fx/Sources/DirOrder`, ext4 under WSL2, 6.4 = 6.3): files created `k,b,z,a,m,c,y,d,x,e,w,f` list as `e,w,m,f,a,y,b,z,d,k,c,x`; the enumerator returns the same order. A sort by `utf8.lexicographicallyPrecedes` gives `a,b,c,d,e,f,k,m,w,x,y,z`. Other filesystems (tmpfs, APFS, NTFS) order differently: unverified: read only.
- Corpus: 70 non-test files call `contentsOfDirectory`; 27 contain `sorted`/`.sort(`; the 43 without include `apple/container` `ContainerPersistence/EntityStore.swift:109` and `ContainersService.swift:93` (listing used to rebuild state).
- The sort key matters: `sorted()` on `[String]` is canonical-equivalence order (Unicode scalar order after normalization), `utf8.lexicographicallyPrecedes` is byte order. For output and digests choose bytes, and say so.

### 10. Clocks: ContinuousClock, SuspendingClock, Date

- Source of truth ([Clock.cpp](https://github.com/swiftlang/swift/blob/main/stdlib/public/Concurrency/Clock.cpp) lines 48-120): `ContinuousClock` is `CLOCK_BOOTTIME` on Linux (`CLOCK_MONOTONIC_RAW` on Apple, `QueryInterruptTimePrecise` on Windows, `CLOCK_MONOTONIC` on BSD/WASI); `SuspendingClock` is `CLOCK_MONOTONIC` on Linux (`CLOCK_UPTIME_RAW` on Apple, `QueryUnbiasedInterruptTimePrecise` on Windows). [SE-0329](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0329-clock-instant-duration.md) (Implemented in Swift 5.7) describes them as "continuous" (keeps counting while the machine sleeps) and "suspending" (stops); its prose says Linux `ContinuousClock` refers to "the uptime clock", which differs from the final source, so trust `Clock.cpp`. The doc comments: continuous instants "are only comparable locally during the execution of a program" ([ContinuousClock.swift](https://github.com/swiftlang/swift/blob/main/stdlib/public/Concurrency/ContinuousClock.swift) lines 17-20); suspending instants "only comparable on the same machine in the same booted session" ([SuspendingClock.swift](https://github.com/swiftlang/swift/blob/main/stdlib/public/Concurrency/SuspendingClock.swift) lines 17-20).
- `Task.sleep(for:)` and `Task.sleep(until:)` default to `clock: .continuous` ([TaskSleepDuration.swift](https://github.com/swiftlang/swift/blob/main/stdlib/public/Concurrency/TaskSleepDuration.swift) lines 215-224).
- Measured (fixture `fx/Sources/Clocks`): both `Instant` types report `minimumResolution` 1e-09 s; a 120 ms `Task.sleep` measured `0.1204 s` continuous, `0.1204 s` suspending, `0.1204 s` by `Date`. On this WSL2 kernel `CLOCK_BOOTTIME - CLOCK_MONOTONIC = 0 s` (never suspended), so the continuous-vs-suspending difference could not be observed: unverified: read only. `Date(timeIntervalSince1970: 0).timeIntervalSinceReferenceDate` is `-978307200.0`. `Duration.seconds(1.5) == .milliseconds(1500)`. `Duration.components` is `(seconds: 0, attoseconds: 120389877000000000)`.

Clock-choice table:

| Need | Use | Why | Do not use |
|---|---|---|---|
| Elapsed time, timeout, retry backoff, rate limit, benchmark | `ContinuousClock` (`clock.measure {}`, `start.duration(to: .now)`) | monotonic, unaffected by wall-clock steps, default of `Task.sleep` | `Date()` subtraction, `timeIntervalSinceNow` |
| "Awake" time (work excluding system sleep) | `SuspendingClock` | stops while suspended | choosing it for deadlines that must still fire after wake |
| Persisted, logged, sent or compared-with-the-outside timestamp (token expiry, file mtime, event time) | `Date` plus `.iso8601` or epoch strategy | wall clock is the only shared reference; it can jump | an `Instant` (process or boot-session local) |
| Cross-process or cross-reboot ordering | wall `Date` or a sequence number | `Instant`s do not survive a process boundary | serializing an `Instant` |
| Machine output of a duration | `Duration.components`, or `Double` seconds you format yourself | `Duration` description is `0.120389877 seconds` (not a contract) | `Duration.formatted()` (localized) |
| Absolute deadline API (`withDeadline`) | not available in 6.4 (SE-0526 not implemented, per topic-map correction) | | assuming it exists |

### 11. Hex encoding without Foundation, and compressed-blob determinism

- swift-container-plugin hex-encodes with `hash.compactMap { String(format: "%02x", $0) }.joined()` (`swift-container-plugin@a9646b8d4dca:Sources/ContainerRegistry/ImageReference+Digest.swift:39-41,44-46`) and then `try!` re-parses. `String(format:)` needs full Foundation (matrix above), so it pins a library to `import Foundation`.
- swift-crypto's `hexString` is `internal` (`swift-crypto@1c80d3aff53f:Sources/Crypto/Util/PrettyBytes.swift:46`, no `public`); the public `Digest.description` is `"\(Self.self): \(hex)"` with a type-name prefix (`Sources/Crypto/Digests/Digest.swift:96-98`), so it is not the hex string.
- Foundation-free replacement (run, `hexLower([0x00,0x0f,0xab,0xff]) == "000fabff"`, and `"sha256:" + hexLower(32 bytes)` parses as a `ContentDigest`):

```swift
public func hexLower<S: Sequence>(_ bytes: S) -> String where S.Element == UInt8 {
    let digits = Array("0123456789abcdef".utf8)
    var out = [UInt8](); out.reserveCapacity(bytes.underestimatedCount * 2)
    for b in bytes { out.append(digits[Int(b >> 4)]); out.append(digits[Int(b & 0x0F)]) }
    return String(decoding: out, as: UTF8.self)
}
```

## Normative guidance candidates

IDs are provisional (`SW-IO-FD-nn`); the consolidator renumbers. "RAN" = the verification was run against a planted violation and its compliant twin in the fixture directory (all paths relative to `~/.cache/research-lang/swift-tools/fixtures/formats-and-determinism/`); exit codes in [Verification runs](#verification-runs). Every grep prints violations (empty output = pass). Rows: M-A-04, M-G-12 map to SW-LANG / SW-IO; M-A-03, M-I-05 to SW-LANG / SW-SEC.

1. **SW-IO-FD-01 (M-G-12, M-A-04). Bytes that are hashed, signed, diffed, committed or compared across runs are produced with `JSONEncoder` configured `outputFormatting = [.sortedKeys, .withoutEscapingSlashes]`, or by an explicit sort; never by iterating a `Dictionary` or `Set` into output.**
   Rationale: hash seeds are per-process, so two runs produce different bytes and different digests.
   Verify: `grep -rl --include='*.swift' -e 'JSONEncoder()' Sources | xargs -r grep -L -e 'sortedKeys'` (lists files that build an encoder without `sortedKeys`; empty = pass). Runtime twin: run the tool twice in separate processes and `cmp -s out1 out2` (exit 0 = pass).
   RAN: yes, `grep/red/json.swift` vs `grep/green/json.swift` and `fx/Sources/JsonRed|JsonGreen` (A1, GREP-json).

2. **SW-IO-FD-02 (M-G-12). Never re-encode a received JSON document to compute or check its digest, and never store a digest of bytes you did not write. Hash the exact bytes received or written.**
   Rationale: the OCI digest covers bytes; a decode and re-encode changes key order, whitespace and number text (`ImageStore+Export.swift:130` re-encodes an index with a bare encoder).
   Verify: reading heuristic: in any function that computes `SHA256.hash(data:)` or compares a descriptor digest, the `data` argument must come from `Data` read from the wire or file, not from `JSONEncoder().encode(`; plus the SW-IO-FD-01 grep on the same files.
   RAN: no (reading heuristic; grep half is FD-01).

3. **SW-IO-FD-03 (M-G-12). `.sortedKeys` is not RFC 8785. Where a spec or a peer requires JCS bytes (UTF-16 key order, ES6 number text), write the serializer or restrict inputs to BMP keys and integers; otherwise treat `.sortedKeys` as "stable on one implementation", document it, and keep hashing stored bytes (FD-02).**
   Rationale: measured divergences: non-BMP key order, `-0`, and doubles at or above 1e20 print as `1.2345678901234568e+20`.
   Verify: run `JcsProbe` and diff its `keys sortedKeys` and `keys UTF-16 (JCS)` lines; a conformance claim in docs must cite the probe.
   RAN: yes as a probe (`fx/Sources/JcsProbe`, J1; table, not a red/green pair; the RFC sample matches byte for byte).

4. **SW-IO-FD-04 (M-I-05, M-A-03). Parse a digest with a byte-level function (the `ContentDigest.init(parsing:)` shown in finding 4): prefix by `utf8.starts(with:)`, algorithm allow-list (`sha256`, `sha512`), `encoded` exactly 64 or 128 bytes, each in `0x30...0x39` or `0x61...0x66`; reject everything else, including uppercase. Compare `ContentDigest` values (algorithm and hex), never raw strings, never `.lowercased() ==`.**
   Rationale: `Character` ranges accept `b`+U+0308 and `d`+ZWJ; `isHexDigit` accepts fullwidth and uppercase; `String ==` is canonical equivalence.
   Verify: `grep -rn --include='*.swift' -e 'hasPrefix("sha' -e 'split(separator: ":")' -e '"a"..."f"' -e 'isHexDigit' -e 'lowercased() ==' Sources` (any hit in digest or reference parsing is a violation) plus a unit test feeding the vector set from `fx/Sources/DigestCheck/main.swift` (combining mark, ZWJ, fullwidth, uppercase, 63/65 length, trailing newline, traversal) that must reject all.
   RAN: yes (`DigestCheck naive-character|naive-ishexdigit|naive-regex` exit 1; `strict` exit 0; GREP-digest).

5. **SW-IO-FD-05 (M-I-05). A digest `Regex` is lowercase-only and anchored (`wholeMatch`): `/sha256:[a-f0-9]{64}/`; `[a-fA-F0-9]` is wrong for OCI sha256/sha512/blake3. Do not use a regex as the only gate before a digest becomes a path component (FD-04 plus a containment check, as `ParsedDigest.path(in:)` does).**
   Rationale: the spec says `[A-F]` MUST NOT be used; uppercase creates two names for one blob.
   Verify: `grep -rn --include='*.swift' -e 'A-F' Sources` (any hit inside a digest pattern is a violation).
   RAN: yes for the behaviour (`DigestCheck naive-regex` exit 1: accepts uppercase); the grep itself: no (reading heuristic).

6. **SW-IO-FD-06 (M-A-03). Protocol text (digests, HTTP request lines and header names, tokens, media types, path components, version strings) is parsed on `utf8` bytes (`utf8.split(separator: 0x3A)`, `utf8.firstIndex(of:)`, `utf8.starts(with:)`), after an ASCII check; `String`/`Character` operations (`split(separator:)`, `contains`, `firstIndex(of:)`, `hasPrefix`, `count`) are for human text only. CRLF is one `Character`: split lines on bytes.**
   Rationale: `"a:\u{301}b"` has no `:` and `"a\r\nb".split(separator: "\n")` has one element; `import Foundation` flips `contains("\n")` from `false` to `true`.
   Verify: a planted test on `"a:\u{301}b"` expecting two fields and on `"a\r\nb"` expecting two lines; grep for the usual suspects in the parser directory: `grep -rn --include='*.swift' -e 'split(separator: ":")' -e 'split(separator: "\n")' -e 'components(separatedBy: "\r\n")' Sources/Parsing` (replace the directory operand with the parser directory).
   RAN: yes (`Strings red` exit 1, `Strings green` exit 0; the grep half is a reading heuristic).

7. **SW-IO-FD-07 (M-G-11, conflict 12). Library targets import `FoundationEssentials` behind `#if canImport(FoundationEssentials) import FoundationEssentials #else import Foundation #endif`; CLI and server executables may `import Foundation`. A library whose Essentials-only build fails does not fall back silently: replace the symbol (`String(format:)`, `trimmingCharacters`, `replacingOccurrences`, `range(of:)`, `NumberFormatter`, `DateFormatter`, `Process`, `FileHandle`, `NSLock`, `exit`) or justify the full `Foundation` import in a comment.**
   Rationale: Essentials-only links 10.7 MB instead of adding 40.5 MB of ICU; the same code compiles under both imports.
   Verify: `grep -rl --include='*.swift' -e '^import Foundation$' Sources | xargs -r grep -L -e 'canImport(FoundationEssentials)'` (library `Sources/` only; empty = pass). Build proof: `swift build --scratch-path "$SWIFT_SCRATCH/formats-and-determinism"` on Linux with the Essentials import.
   RAN: yes for the grep (`import-red` vs `import-green`, GREP-import) and for the symbol matrix (`fe-probe/run-probe.sh`, 6.4 = 6.3).

8. **SW-IO-FD-08 (M-G-11). Never add `swiftlang/swift-foundation` (or `apple/swift-foundation`) as a SwiftPM dependency of shipped code; use the toolchain's built-in copy.**
   Rationale: [Distributions.md](https://github.com/swiftlang/swift-foundation/blob/main/Distributions.md): source builds, ambiguous symbols and module conflicts with other packages.
   Verify: `grep -rn --include='Package.swift' -e 'swiftlang/swift-foundation' -e 'apple/swift-foundation' -e 'swift-corelibs-foundation' .`
   RAN: yes (`grep/red/Package.swift`, GREP-pkg).

9. **SW-IO-FD-09 (M-G-10). Every file that names `URLSession` carries `#if canImport(FoundationNetworking) import FoundationNetworking #endif` (or the code is Darwin-only and says so), so Linux builds.**
   Rationale: without it Linux fails with `type 'URLSession' (aka 'AnyObject') has no member 'shared'`.
   Verify: `grep -rl --include='*.swift' -e 'URLSession' Sources | xargs -r grep -L -e 'canImport(FoundationNetworking)'` (empty = pass), and a Linux `swift build` in CI.
   RAN: yes (`net-red` build exit 1, `net-green` exit 0; GREP-net).

10. **SW-IO-FD-10 (M-G-13). Every `JSONEncoder` and `JSONDecoder` that touches a `Date` sets `dateEncodingStrategy` / `dateDecodingStrategy` explicitly (`.iso8601` for seconds precision; `.millisecondsSince1970` or a custom fractional ISO style for sub-second; never the default). Wire dates are UTC `Z` strings or documented epoch numbers.**
    Rationale: the default writes a reference-date double: Unix 0 is `-978307200`; `.iso8601` drops fractions (round trip loses 0.123456 s), so choose per field.
    Verify: `grep -rl --include='*.swift' -e 'JSONEncoder()' Sources | xargs -r grep -l -e 'Date' | xargs -r grep -L -e 'dateEncodingStrategy'` (empty = pass); runtime: encode `Date(timeIntervalSince1970: 0)` and require `1970-01-01` or `0`.
    RAN: yes (`DateCheck default` exit 1, `DateCheck iso8601` exit 0; GREP-date).

11. **SW-IO-FD-11 (M-G-14). A persisted or wire `Decodable` that gains a field gets a custom `init(from:)` using `decodeIfPresent(...) ?? default` (a Swift default value does not make a synthesized decoder optional); unknown keys are ignored by default, so a strict contract compares `container.allKeys` to the known set and fails with `DecodingError.dataCorrupted`. 64-bit identifiers above 2^53 are `Int64`/`UInt64` or strings, never `Double`.**
    Rationale: an older document missing the new key throws `keyNotFound`.
    Verify: a planted test decoding the previous version's fixture document into the current type (must succeed), and one decoding a document with an extra key (must succeed or fail, as the contract states).
    RAN: yes (`CodableEvolve red` exit 1: `keyNotFound: Key 'mode'`; `CodableEvolve green` exit 0).

12. **SW-IO-FD-12 (M-G-15). Machine-facing numbers and dates never pass through `.formatted()`, `NumberFormatter`, `DateFormatter`, `Locale.current` or `lowercased(with:)`. Use interpolation or `String(describing:)` for numbers, `Date.ISO8601FormatStyle()` for dates, and `Locale(identifier: "en_US_POSIX")` where a formatter is unavoidable. Human-facing output opts in with an explicit `Locale`.**
    Rationale: on Linux `.formatted()` yields `1,234.5` and `14/11/2023` (the `en_001` locale); on Darwin it follows user preferences (unverified: read only).
    Verify: `grep -rn --include='*.swift' -e '\.formatted()' -e 'formatted(date:' -e 'NumberFormatter()' -e 'DateFormatter()' Sources`, plus a test comparing machine strings to literals. (Setting `LANG` in the test environment does nothing on Linux, so do not use it as the red.)
    RAN: yes (`LocaleCheck red` exit 1, `LocaleCheck green` exit 0; GREP-locale; `LANG=de_DE.UTF-8` produced identical output: a measured non-effect).

13. **SW-IO-FD-13 (M-G-16). Sort `contentsOfDirectory` / `enumerator` / `subpathsOfDirectory` results by UTF-8 bytes (`sorted { $0.utf8.lexicographicallyPrecedes($1.utf8) }`) before they reach output, a digest, a manifest or an assertion; do not sort with `sorted()` on text meant for bytes.**
    Rationale: `readdir` order is filesystem-specific (`e,w,m,f,a,y,b,z,d,k,c,x` on ext4).
    Verify: `grep -rl --include='*.swift' -e 'contentsOfDirectory' Sources | xargs -r grep -L -e 'sorted'` (empty = pass).
    RAN: yes (`DirOrder` exit 1 unsorted, exit 0 with the sorted twin; GREP-dir).

14. **SW-IO-FD-14 (M-A-05). Clock choice follows the finding-10 table: elapsed, timeouts, backoff and benchmarks use `ContinuousClock` (`start.duration(to: .now)`, `clock.measure`), `SuspendingClock` only for awake time, `Date` only for wall-clock timestamps; no `Date()` subtraction, `timeIntervalSince(`, `timeIntervalSinceNow` or `DispatchTime.now` for durations; an `Instant` is never serialized or compared across processes.**
    Rationale: wall time jumps (NTP, manual set, VM resume); `ContinuousClock` is `CLOCK_BOOTTIME` on Linux and is what `Task.sleep(for:)` uses.
    Verify: `grep -rn --include='*.swift' -e 'timeIntervalSince(' -e 'timeIntervalSinceNow' -e 'DispatchTime.now' Sources` (each hit needs a comment saying it is wall-clock arithmetic on external data).
    RAN: yes for the grep (`grep/red/clock.swift`, GREP-clock); the behavioural difference under suspend: unverified: read only (kernel never suspended).

15. **SW-IO-FD-15 (M-A-04). `SWIFT_DETERMINISTIC_HASHING=1` is allowed only in test or debug harnesses to make a hash-order bug reproducible; product output must be sorted (FD-01). Never document it as the fix.**
    Rationale: it makes order repeatable (cmp exit 0) but not sorted, and the runtime says hash values are not stable across even minor stdlib releases.
    Verify: `grep -rn -e 'SWIFT_DETERMINISTIC_HASHING' .github scripts Package.swift` (hits only in test configuration; replace the directories with the repo's CI and script directories).
    RAN: yes for the behaviour (A2: run-to-run `cmp` exit 0, against sorted output exit 1); the grep: no.

16. **SW-IO-FD-16 (M-I-05, M-G-11). Hex-encode digests with a table lookup (`hexLower`), not `String(format: "%02x")`; do not rely on `Digest.description` or a hallucinated `.hexString`.**
    Rationale: `String(format:)` is absent from FoundationEssentials (blocks FD-07); swift-crypto's `hexString` is internal and `description` has a type prefix.
    Verify: `grep -rn --include='*.swift' -e 'String(format:' -e '.hexString' Sources` (library targets; empty = pass); compile under the Essentials import.
    RAN: yes for the Essentials failure of `String(format:)` (matrix) and the `hexLower` round trip (`DigestCheck strict`); grep: no.

17. **SW-IO-FD-17 (M-G-12). String-keyed dictionaries compare keys by canonical equivalence: when two JSON member names must stay distinct (signed or digested objects), validate member names as ASCII (or NFC) before decoding into `[String: T]`, or decode into an array of pairs.**
    Rationale: `{"é":1,"e\u0301":2}` decodes to one entry (`count=1`); the same two keys in a dictionary literal trap.
    Verify: a planted test decoding that document and asserting 2 entries or a thrown error.
    RAN: yes as a probe (`JcsProbe`: `count=1`); no red/green pair for the mitigation.

## Verification runs

Driver: `bash ~/.cache/research-lang/swift-tools/fixtures/formats-and-determinism/verify.sh 6.4` (and `6.3`). Builds use `swift build --scratch-path "$SWIFT_SCRATCH/formats-and-determinism"` for 6.4 and `...-63` for 6.3 (different engine layout; the two `net-*` packages use `-net-red` / `-net-green` suffixes because a failing build must not poison the shared scratch). `run.sh` = `~/.cache/research-lang/swift-tools/run.sh`; `$BIN` = `.../build/formats-and-determinism/out/Products/Debug-linux-x86_64` (6.4). Results are identical on 6.3.3 (`diff` of the 20 `RESULT` lines: no difference). Red = exit code on the planted violation, green = exit code on the compliant twin; exit 1 is the signal in every row.

| ID | Fixture | Command (verbatim) | Red | Green | Relevant output |
|---|---|---|---|---|---|
| A1 | `fx/Sources/JsonRed`, `JsonGreen` | `run.sh $BIN/JsonRed > out-6.4/red1.txt` twice (separate processes), then `cmp -s out-6.4/red1.txt out-6.4/red2.txt`; same for `JsonGreen` | 1 | 0 | red run 1 `{"india":9,"lima":12,"bravo":2,...}`, run 2 `{"golf":7,"hotel":8,"alpha":1,...}`; green both `{"alpha":1,"bravo":2,"charlie":3,...}` |
| A2 | `fx/Sources/JsonRed` | `run.sh env SWIFT_DETERMINISTIC_HASHING=1 $BIN/JsonRed` twice, `cmp -s det1 det2`; then `cmp -s det1 green1.txt` | n/a (baseline A1 = 1) | 0 (identical across runs); vs sorted output: 1 | identical but still hash order (`{"lima":12,"echo":5,"alpha":1,...}`): not a canonicalizer |
| B1a | `fx/Sources/DigestCheck` | `run.sh $BIN/DigestCheck naive-character` / `... strict` | 1 | 0 | `WRONG 63 hex + b U+0308: accepted=true expected=false chars=71 utf8=73`; `WRONG last hex + U+0301`; `WRONG last hex + ZWJ U+200D ... utf8=74`; `wrong=3` |
| B1b | same | `run.sh $BIN/DigestCheck naive-ishexdigit` | 1 | 0 | `WRONG uppercase hex`; `WRONG fullwidth a U+FF41 as first` |
| B1c | same | `run.sh $BIN/DigestCheck naive-regex` | 1 | 0 | `WRONG uppercase hex: accepted=true expected=false`; combining-mark vectors rejected (fails closed) |
| C1 | `fx/Sources/DateCheck` | `run.sh $BIN/DateCheck default` / `run.sh $BIN/DateCheck iso8601` | 1 | 0 | `CHECK default: {"d":-978307200}`; `CHECK iso8601: {"d":"1970-01-01T00:00:00Z"}` |
| D1 | `net-red`, `net-green` | `swift build --scratch-path "$SWIFT_SCRATCH/formats-and-determinism-net-red"` (cwd `net-red`) / `...-net-green` (cwd `net-green`) | 1 | 0 | `net-red/Sources/App/main.swift:4:42: error: type 'URLSession' (aka 'AnyObject') has no member 'shared'`; green `Build complete!` |
| E1 | `fx/Sources/LocaleCheck` | `run.sh $BIN/LocaleCheck red` / `... green` | 1 | 0 | `DIFF got=1,234.5 want=1234.5`; `DIFF got=14/11/2023 want=2023-11-14T22:13:20Z`; `DIFF got=1,234,567 want=1234567`; green `bad=0` |
| E2 | same | `run.sh env LANG=de_DE.UTF-8 LC_ALL=de_DE.UTF-8 $BIN/LocaleCheck red` vs default, `cmp -s` | n/a | cmp 0 (identical) | planted red (LANG changes output) did NOT go red: `Locale.current.identifier=en_001` in every environment |
| F1 | `fx/Sources/Strings` | `run.sh $BIN/Strings red` / `... green` | 1 | 0 | `CHECK red: colon-fields=1 crlf-lines=1`; `CHECK green: colon-fields=2 crlf-lines=2` |
| G1 | `fx/Sources/DirOrder` | `run.sh $BIN/DirOrder $F/dirorder-scratch` / `... sorted` | 1 | 0 | `contentsOfDirectory: e,w,m,f,a,y,b,z,d,k,c,x` vs `sorted: a,b,c,d,e,f,k,m,w,x,y,z` |
| H1 | `fx/Sources/CodableEvolve` | `run.sh $BIN/CodableEvolve red` / `... green` | 1 | 0 | `FAILED DecodingError.keyNotFound: Key 'mode' not found in keyed decoding container.`; green `old document decoded` |
| J1 | `fx/Sources/JcsProbe` | `run.sh $BIN/JcsProbe` | probe | probe | `sample == RFC 8785 text: true`; `keys sortedKeys: {"10":5,"9":6,"B":4,"a":3,"～":1,"𐀀":2}` vs `keys UTF-16 (JCS): "10","9","B","a","𐀀","～"`; `[-0,1e+21,1.2345678901234568e+20]`; `decode {"é":1,"e+U+0301":2} -> count=1` |
| K1 | `fe-probe/` | `run.sh sh fe-probe/run-probe.sh` (`swiftc -typecheck` per symbol per module) | matrix | matrix | see finding 6 table; `matrix-6.3.txt` = `matrix-6.4.txt` |
| K2 | `fx` | `ldd $BIN/JsonGreen` vs `ldd $BIN/DateCheck` in the image | n/a | n/a | Essentials-only: `libFoundationEssentials.so`; Foundation adds `libFoundation.so`, `libFoundationInternationalization.so`, `lib_FoundationICU.so` |
| S1 | `probe/stringsstd.swift` | `swiftc -o stringsstd stringsstd.swift` (stdlib only) | table | table | `crlf.contains("\n" as String): false`, `crlf.firstIndex(of: "\n"): nil`, `Set(["é", "e\u{301}"]).count: 1` |

Grep checks (driver function `g_*`, run from `grep/`; "exit" is 1 when the check printed a violation, 0 when it printed nothing), both versions:

| ID | Command (verbatim) | Red | Green | Red output |
|---|---|---|---|---|
| GREP-json | `grep -rl --include='*.swift' -e 'JSONEncoder()' red \| xargs -r grep -L -e 'sortedKeys'` | 1 | 0 | `red/json.swift` |
| GREP-date | `grep -rl --include='*.swift' -e 'JSONEncoder()' red \| xargs -r grep -l -e 'Date' \| xargs -r grep -L -e 'dateEncodingStrategy'` | 1 | 0 | `red/date.swift` |
| GREP-digest | `grep -rn --include='*.swift' -e 'hasPrefix("sha' -e 'split(separator: ":")' -e '"a"..."f"' -e 'isHexDigit' -e 'lowercased() ==' red` | 1 | 0 | `red/digest.swift:2`, `:3`, `:5`, `:8` |
| GREP-net | `grep -rl --include='*.swift' -e 'URLSession' red \| xargs -r grep -L -e 'canImport(FoundationNetworking)'` | 1 | 0 | `red/net.swift` |
| GREP-clock | `grep -rn --include='*.swift' -e 'timeIntervalSince(' -e 'timeIntervalSinceNow' -e 'DispatchTime.now' red` | 1 | 0 | `red/clock.swift:2`, `:3` |
| GREP-locale | `grep -rn --include='*.swift' -e '\.formatted()' -e 'formatted(date:' -e 'NumberFormatter()' -e 'DateFormatter()' red` | 1 | 0 | `red/locale.swift:2`, `:3` |
| GREP-dir | `grep -rl --include='*.swift' -e 'contentsOfDirectory' red \| xargs -r grep -L -e 'sorted'` | 1 | 0 | `red/dir.swift` |
| GREP-pkg | `grep -rn --include='Package.swift' -e 'swiftlang/swift-foundation' -e 'apple/swift-foundation' -e 'swift-corelibs-foundation' red` | 1 | 0 | `red/Package.swift:5` |
| GREP-import | `grep -rl --include='*.swift' -e '^import Foundation$' import-red \| xargs -r grep -L -e 'canImport(FoundationEssentials)'` | 1 | 0 | `import-red/import.swift` |

Totals: 10 runtime red/green pairs (A1, B1a, B1b, B1c, C1, D1, E1, F1, G1, H1) plus 9 grep pairs = 19 verifications watched red on a planted fixture and green on the twin (A1, B1a-c, C1, D1, E1, F1, G1, H1, 9 greps), on both 6.4 and 6.3.3. Not red: E2 (LANG never changed output on Linux), A2 (a baseline, no violation to detect), J1/K1/K2/S1 (measurements). The one brief item that did not hold: plant (e) as specified.

## Exemplar evidence

| Rule | Satisfies | Violates / contradicts |
|---|---|---|
| FD-01 canonical JSON | `swift-container-plugin@a9646b8d4dca:Sources/ContainerRegistry/ImageSource.swift:19-24` (`[.sortedKeys, .prettyPrinted, .withoutEscapingSlashes]` + `.iso8601`); `containerization@3e7bc39e66b3:Sources/ContainerizationOCI/Content/ContentWriter.swift:32`, `LocalContentStore.swift:51`, `Sources/Containerization/BridgeStateFile.swift:68` | `containerization@3e7bc39e66b3:Sources/Containerization/Image/ImageStore/ImageStore+Export.swift:130` (`try JSONEncoder().encode(idx)` rewrites an OCI index; the resulting digest is order-dependent); corpus: 307 files / 31 repos use `JSONEncoder()`, 105 files / 24 repos mention `.sortedKeys`, 43 / 14 `.withoutEscapingSlashes` |
| FD-02 hash received bytes | `ImageStore+Export.swift:126-128` returns `content.data()` untouched when no platform is filtered | the filtered-platform branch at `:129-130` re-encodes |
| FD-03 not JCS | swift-foundation `JSONWriter.swift:297-305` documents the UTF-8 rule in code | none claim JCS; OCI makes JCS optional (considerations.md) |
| FD-04 digest parse | `containerization@3e7bc39e66b3:Sources/ContainerizationOCI/Content/Digest.swift:53-92` (byte validation with the rationale comment, sha256 only, lowercase only, containment check at `:119-131`) | `swift-container-plugin@a9646b8d4dca:Sources/ContainerRegistry/ImageReference.swift:281-298` accepts `[a-fA-F0-9]` and compares stored strings; raw `==` on digests in `ImageStore+Import.swift:174,198`, `RegistryClient+Push.swift:83,157` (validated upstream, not stated) |
| FD-05 regex lowercase | none found | `ImageReference.swift:287,295` (uppercase accepted, contradicting OCI "MUST NOT") |
| FD-06 byte parsing | containerization `Digest.swift:85-92`; corpus: only 6 files / 2 repos use `utf8.starts(with` | corpus: `isHexDigit` in 10 files / 6 repos, `hasPrefix("sha` in 1 |
| FD-07 Foundation import | swift-foundation itself (Essentials sources); 15 repos use `canImport(FoundationEssentials)` in 606 files | 38 of 40 repos `import Foundation` (6,617 files); the fleet rule is stricter than every exemplar except swift-foundation |
| FD-08 no package dep | none of the 40 depend on swift-foundation as a package for shipping | n/a |
| FD-09 `FoundationNetworking` guard | 10 repos / 54 files (`tuist`, `Alamofire`, `swift-package-manager`, `swift-container-plugin`, `swift-snapshot-testing`, ...) | `swift-argument-parser@efd239f0055b:Tools/changelog-authors/ChangelogAuthors.swift:103` (macOS tool script), `nicklockwood__SwiftFormat/Snapshots/...` (sample apps); Darwin-only apps (IceCubes, element-x-ios) are out of scope |
| FD-10 dates | `ImageSource.swift:22` (`.iso8601`); 29 files / 11 repos set `dateEncodingStrategy` | none measured deliberately using the default; not audited per call site |
| FD-11 Codable evolution | 113 files / 17 repos use `decodeIfPresent` | not audited |
| FD-12 locale | `en_US_POSIX` in 20 files / 10 repos | `.formatted()`/`NumberFormatter`/`DateFormatter` in machine contexts not audited; `NumberFormatter` 30 files / 10 repos, `DateFormatter` 91 / 17, `Locale.current` 24 / 6 |
| FD-13 directory sort | 27 of 70 non-test files that list a directory also sort | `apple/container` `ContainerPersistence/EntityStore.swift:109`, `Services/ContainerAPIService/Server/Containers/ContainersService.swift:93` (listing feeds state rebuild; unsorted in-file) |
| FD-14 clocks | `ContinuousClock` in 91 files / 19 repos (`containerization` `CHProcess.swift:165`, `cctl/ImageCommand.swift:127,137`) | `timeIntervalSince(` 79 files / 16 repos (tuist 17 non-test files, swift-foundation 8, sourcekit-lsp 6); `DispatchTime.now` 37 / 12; `SuspendingClock` only 11 files / 6 repos |
| FD-15 deterministic hashing | `SWIFT_DETERMINISTIC_HASHING` appears in 2 files of 1 repo (`apple/swift-collections` `Package.swift` and `Package@swift-6.2.swift`, in a comment about reproducible hashing: lines 71-72 of `Package.swift`) | n/a |
| FD-16 hex | none | `ImageReference+Digest.swift:39-46` uses `String(format: "%02x")` |

Counts are from `grep -rlF --include='*.swift'` over the corpus root, including tests and sample code; they measure presence, not misuse.

## AI-agent angle

| Characteristic mistake | Why it compiles and is wrong | Smallest mechanical check |
|---|---|---|
| `JSONEncoder().encode(x)` and then hash, diff or write the bytes | no `.sortedKeys`; order varies per process | FD-01 grep; `cmp` of two runs |
| Builds JSON with string interpolation over a `Dictionary` | iteration order is seeded; also no escaping | `grep -rn --include='*.swift' -e '.joined(separator: ",")' Sources` then read; `cmp` of two runs |
| Re-encodes a decoded manifest to "verify" its digest | bytes differ from the wire | reading heuristic (FD-02) |
| Hallucinates `JSONEncoder.OutputFormatting.canonical`, `encoder.sortKeys = true`, `.iso8601withFractionalSeconds` strategy, `SHA256.hash(...).hexString`, `Locale.posix` | none of these are API; the compiler rejects them, but agents "fix" by switching to `String(format:)`/NSString | Linux `swift build` (diagnostic: `has no member`); FD-16 grep |
| `import Foundation` plus bare `URLSession.shared` and a completion-handler `dataTask` | breaks on Linux; pre-Swift-6 shape | FD-09 grep; Linux `swift build` |
| `import Foundation` in every library file | defeats the Essentials policy; adds ICU | FD-07 grep |
| Digest check by `hasPrefix("sha256:")` + `split(separator: ":")` + `("a"..."f").contains($0)` or `isHexDigit` or `[a-fA-F0-9]` | grapheme semantics; uppercase | FD-04 grep + vector test |
| `a.lowercased() == b.lowercased()` to compare digests or header values | collapses uppercase to lowercase, `String ==` canonical equivalence | FD-04 grep (`lowercased() ==`) |
| `Date()` minus `Date()` for timeouts, `DispatchTime.now()`, `Thread.sleep` | wall clock steps; GCD idiom | FD-14 grep |
| `Task.sleep(nanoseconds:)` for durations | deprecated numeric form; `Task.sleep(for: .seconds(1))` is the current shape | `grep -rn --include='*.swift' -e 'Task.sleep(nanoseconds' Sources` (not run) |
| Relies on the default `Date` strategy, then reads the field from Python/Go | reference-date double | FD-10 grep + epoch-zero test |
| Adds a `var newField = default` to a Codable struct and ships | `keyNotFound` on old documents | FD-11 old-document test |
| Uses `.formatted()` for a size or timestamp in log lines parsed by tools | `1,234.5`, `14/11/2023`; Darwin differs | FD-12 grep |
| `contentsOfDirectory` then loops, appends to a manifest | readdir order | FD-13 grep |
| "Fixes" flaky dictionary-order tests with `SWIFT_DETERMINISTIC_HASHING=1` | hides the bug; unstable across releases | FD-15 grep |
| `"a\r\nb".split(separator: "\n")` or `contains("\n")` to split HTTP lines | CRLF is one `Character`; result flips with `import Foundation` | FD-06 test on `"a\r\nb"` |
| `@unchecked Sendable` or `Task.detached` wrappers around `URLSession`/`DateFormatter` shared instances | out of this dive's scope (concurrency dives own it); mention: `DateFormatter`/`NumberFormatter` are reference types, not Sendable-safe to share | `swift build` in Swift 6 mode |

## Contested / evolving

- **`.sortedKeys` as a canonical form (as of 2026-10-10).** Linux swift-foundation sorts by UTF-8 bytes; Apple frameworks keep a legacy `NSString` numeric, case-insensitive sort under `compatibility1`, and an Apple engineer confirmed a one-time order change in macOS Sequoia ([thread 763965](https://developer.apple.com/forums/thread/763965)). Trend: no canonical-JSON guarantee is promised; the safe route remains hashing stored bytes. Darwin side: unverified: read only.
- **Foundation vs FoundationEssentials.** Official guidance prefers built-in Foundation and discourages the package ([Distributions.md](https://github.com/swiftlang/swift-foundation/blob/main/Distributions.md)); the Swift Forums announcement positions Essentials as the focused subset ([post, 2024-07-29](https://forums.swift.org/t/swift-foundation-now-available/73530)). Practice: 15 of 40 exemplar repos use `canImport(FoundationEssentials)`, almost all server and core libraries; apps and tools stay on `Foundation`. Trend: Essentials growing, but missing `String(format:)`, formatters and `Process`.
- **Which JSON library for canonical output.** `JSONEncoder` + `.sortedKeys` (this dive's default) versus a hand-written JCS writer or a third-party package: no consensus, none in the corpus.
- **Continuous vs suspending clock.** SE-0329's prose and the final implementation differ on the Linux mapping; `Clock.cpp` is authoritative; `withDeadline` (SE-0526) is still not in 6.4.
- **`Locale.current` on Linux.** Hard-coded `en_001` today; a future change to honor `LANG` would alter every `.formatted()` call. The rule (never use it for machine output) is stable either way.
- **Regex vs bytes for tokens.** Swift Regex is grapheme-level by default (measured: fails closed on combining marks); matching-semantics options (`.unicodeScalar`) exist but were not exercised here. Trend: bytes for protocol text, Regex for human text.
- **Dated guidance to discount.** Anything before Swift 6.0 saying `import Foundation` on Linux is the old corelibs implementation (it is swift-foundation since 6.0); `DecodingError` descriptions before 6.3 (SE-0489) were unreadable.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://github.com/opencontainers/image-spec/blob/main/descriptor.md | OCI descriptor spec (digest grammar, registered algorithms, verification) | main, read 2026-10-10 | the grammar and `[A-F]` MUST NOT, primary |
| https://github.com/opencontainers/image-spec/blob/main/considerations.md | OCI considerations (canonicalization, I-JSON, RFC 8785 MAY) | main, 2026-10-10 | says order is not significant and JCS optional, primary |
| https://www.rfc-editor.org/rfc/rfc8785.txt | RFC 8785 JSON Canonicalization Scheme | 2020 | UTF-16 key sort and number text, used in JcsProbe |
| https://github.com/swiftlang/swift-foundation | swift-foundation README | main, 2026-10-10 | module layering, `FoundationEssentials` import, primary |
| https://github.com/swiftlang/swift-foundation/blob/main/Distributions.md | how to obtain Foundation | 2026 | "prefer built-in", no package dependency, primary |
| https://github.com/swiftlang/swift-corelibs-foundation | corelibs README | main, 2026-10-10 | `FoundationNetworking`/`FoundationXML` live here, primary |
| https://forums.swift.org/t/swift-foundation-now-available/73530 | Tony Parker (Foundation lead) announcement | 2024-07-29 | what Essentials is; Linux uses it from 6.0, primary (core-team post) |
| https://developer.apple.com/documentation/swift/string | Apple `String` documentation (DocC data) | read 2026-10-10 | canonical equivalence of `==` and grapheme view, primary |
| https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/LanguageGuide/StringsAndCharacters.md | The Swift Programming Language, Strings and Characters | main, 2026-10-10 | canonical equivalence examples, primary |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0329-clock-instant-duration.md | SE-0329 Clock, Instant, Duration | Swift 5.7 | clock model, primary |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0489-codable-error-printing.md | SE-0489 readable Codable errors | Swift 6.3 | `DecodingError` printing, primary |
| https://github.com/swiftlang/swift/blob/main/stdlib/public/stubs/GlobalObjects.cpp | stdlib hashing parameters (`SWIFT_DETERMINISTIC_HASHING`) | main, 2026-10-10 | the exact switch and its stability caveat, primary |
| https://github.com/swiftlang/swift/blob/main/stdlib/public/core/Hasher.swift | `Hasher` docs (per-execution seed) | main | why order differs per run, primary |
| https://github.com/swiftlang/swift/blob/main/stdlib/public/core/Dictionary.swift | `Dictionary` docs (order unpredictable) | main | the documented non-guarantee, primary |
| https://github.com/swiftlang/swift/blob/main/stdlib/public/Concurrency/Clock.cpp | clock id mapping per platform | main | `CLOCK_BOOTTIME` vs `CLOCK_MONOTONIC`, primary |
| https://github.com/swiftlang/swift/blob/main/stdlib/public/Concurrency/ContinuousClock.swift | `ContinuousClock` doc comments | main | "only comparable locally", primary |
| https://github.com/swiftlang/swift/blob/main/stdlib/public/Concurrency/SuspendingClock.swift | `SuspendingClock` doc comments | main | boot-session scope, primary |
| https://github.com/swiftlang/swift/blob/main/stdlib/public/Concurrency/TaskSleepDuration.swift | `Task.sleep(for:)` default clock | main | default is `.continuous`, primary |
| https://github.com/swiftlang/swift-foundation/blob/main/Sources/FoundationEssentials/JSON/JSONEncoder.swift | `JSONEncoder` options and default date strategy | aadd9259be07 | lines 61-85, 254, 381, primary |
| https://github.com/swiftlang/swift-foundation/blob/main/Sources/FoundationEssentials/JSON/JSONWriter.swift | key-sort implementation | aadd9259be07 | lines 274-306 UTF-8 vs NSString sort, primary |
| https://github.com/swiftlang/swift-foundation/blob/main/Sources/FoundationEssentials/Date.swift | `Date: Codable` | aadd9259be07 | lines 345-355 reference-date encoding, primary |
| https://github.com/swiftlang/swift-foundation/blob/main/Sources/FoundationEssentials/Locale/Locale_Cache.swift | non-Darwin locale preferences | aadd9259be07 | lines 302-315 hard-coded `en_001`, primary |
| https://developer.apple.com/forums/thread/763965 | Apple Developer Forums: `sortedKeys` order change | 2024 (macOS 15) | evidence `.sortedKeys` order is not frozen on Darwin |
| https://www.unicode.org/reports/tr29/tr29-47.html | UAX #29 grapheme cluster boundaries (Unicode 17.0.0) | 2025 | GB3 CRLF and GB9 extend rules behind the String behaviour |
| https://www.unicode.org/reports/tr15/ | UAX #15 normalization (canonical equivalence) | current | definition of canonical equivalence |
| https://github.com/apple/containerization | `Sources/ContainerizationOCI/Content/Digest.swift` | 3e7bc39e66b3 | the exemplar of byte-level digest validation, lines 53-131 |
| https://github.com/apple/swift-container-plugin | `ImageReference.swift`, `ImageReference+Digest.swift`, `ImageSource.swift`, `gzip.swift` | a9646b8d4dca | regex digest, `String(format:)`, canonical encoder, gzip header pin |
| https://github.com/apple/swift-crypto | `Sources/Crypto/Digests/Digest.swift`, `Util/PrettyBytes.swift` | 1c80d3aff53f | `description` and internal `hexString` |
