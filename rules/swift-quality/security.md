---
# Read on demand through the index. This glob matches no file, so a client never auto-loads the file.
paths:
  - "**/.swift-quality-depth-on-demand"
title: Untrusted Input
summary: The SW-SEC family, owning parser depth and size limits, integer conversion, unsafe-pointer seams, secrets, terminal-safe text, randomness and dependency advisory floors
---

# Untrusted Input

Binds to Swift 6.4.0 (current) and 6.3.3 (previous), SwiftPM tools 6.2 and later, swift-nio 2.101.0,
swift-crypto 4.5.1, SwiftLint 0.65.1 and osv-scanner 2.6.0, measured 2026-10-10 unless a row says read.

Owns what a process does with bytes it did not write: parser depth and size, integer conversion and
overflow, memory-safety seams, secrets, terminal-safe text, randomness and dependency advisory floors.
Not owned here: traversal (`SW-IO-20`), digests (`SW-IO-13`), secret file modes (`SW-IO-21`), command
injection (`SW-IO-08`) and subprocess output limits (`SW-IO-03`) are `SW-IO`. Throw-not-trap
(`SW-ERR-14`) is `SW-ERR`. The root error writer and exit-status table are `SW-CLI`. Client limits and the
rendering of network errors are `SW-NET` (`SW-NET-07`, `SW-NET-14`). Dependency ranges and the lock policy
are `SW-PKG` (`SW-PKG-25`, `SW-PKG-27`). The Sendable handle policy is `SW-CONC-09`, the TSan job is
`SW-GATE-27` and the release SBOM is `SW-REL`. Archive-layer bombs and HTTP header validation have no
researched rule here. Apple Keychain and `os.Logger` privacy are `unverified: read only`.

Contents: [Dates and Defaults](#dates-and-defaults) · [The Hostile-Input Run](#the-hostile-input-run) ·
[Marker Greps](#marker-greps) · [Compiler, SwiftPM and Sanitizers](#compiler-swiftpm-and-sanitizers) ·
[Canaries and Byte Counts](#canaries-and-byte-counts) · [Banned APIs](#banned-apis) · [The Lockfile](#the-lockfile) ·
[Reading Heuristics](#reading-heuristics) · [What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Defaults

- A crash is the failure, not an error. Stack overflow, `Int(UInt64)`, `Range(5...2)` and an oversized
  allocation kill the process, so every limit is checked before the dangerous operation and proven by a
  hostile-input run of the built binary (exit 65, never 132, 134 or 139).
- Markers `bounded:`, `truncate-ok:`, `wrap-ok:`, `redacted:`, `secret-ok:`, `insecure-ok:` and `SAFETY:`
  have no corpus adoption and no tool reads them except the greps. Default, the adopter may rename them
  once. Every grep takes a directory operand (`Sources`) and prints violations. Source trees may be symlinks (RxSwift's `Sources/` is a symlink farm of 412 files): every scan here uses `grep -R` and `find -L`, because `grep -r` skips symlinked files and `find` without `-L` skips a symlinked directory, so the scan and the `SW-CORE-03` canary must count the same files (measured 2026-10-10: `find` 412 files, `grep -r` 1, `grep -R` 412). Empty output passes only
  after the `SW-CORE-03` canary shows the operand holds Swift files.
- Defaults the adopter may override once: depth 64, the 1 MiB stdin cap (registry caps are `SW-NET-07`'s), the names
  `Secret`, `redacted` and `sanitizeForTerminal`, and the advisory floors, a 2026-10-10 snapshot.
- `tool`, `parse` and `load` in the commands are example names, rename them. Linux runs used the official
  swift:6.4 Docker image (swift:6.3 where a row says 6.3.3). Run it on a bind-mounted tree
  with `--scratch-path .build-linux` so the container never writes the host `.build` (`SW-IO` header). A 128 KiB thread stack on glibc simulates
  musl, and the static Linux SDK itself was not run.

## The Hostile-Input Run

Build the release binary, feed it the hostile input and read the exit status. A library gets the same
shape as a test whose crash fails the run.

```bash
# hostile-run (bash): BIN is the release build
: "${BIN:?set BIN to the release binary}"; test -x "$BIN" || { echo "hostile-run: $BIN is not built" >&2; exit 66; }
head -c 1000000 /dev/zero | tr '\0' '[' > deep.json
"$BIN" parse deep.json; echo "exit=$?"                       # SW-SEC-01, SW-SEC-02: 65 passes, 139 is a stack overflow
head -c 300000000 /dev/zero | "$BIN" load; echo "exit=$?"    # SW-SEC-03: 65 passes, 0 means the stream was buffered whole
```

```bash
# a-greps (bash): each command prints violations, empty output passes. Run on changed files, they are noisy
grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'readDataToEndOfFile' -e 'Data(contentsOf' -e 'contentsOfFile' -e 'readToEnd()' -e '\.data(from:' -e '\.data(for:' Sources | grep -v -e 'bounded:'   # SW-SEC-03
grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'repeating:.*count:' -e 'reserveCapacity(' -e 'allocate(capacity:' -e 'unsafeUninitializedCapacity' Sources | grep -v -E 'bounded:|reserveCapacity\([0-9_]+\)'   # SW-SEC-04: a literal reserveCapacity(8) is bounded, swift-nio-ssh printed 3 of them beside 2 wire-sized sites (2026-10-10)
find -L Sources -name '*.swift' -not -path '*/Fixtures/*' -not -path '*/TestUtils/*' -not -path '*.playground/*' -print0 | xargs -0 -r grep -H -n -e '\bU\?Int[0-9]*([a-zA-Z_.]*[lL]en' -e '\bU\?Int[0-9]*([a-zA-Z_.]*[sS]ize' -e '\bU\?Int[0-9]*([a-zA-Z_.]*[oO]ffset' -e '\bU\?Int[0-9]*([a-zA-Z_.]*QWord' -e '\bU\?Int[0-9]*([a-zA-Z_.]*[hH]eader' | grep -v -e 'exactly:' -e 'clamping:' -e 'truncatingIfNeeded:' -e 'bitPattern:' -e 'bounded:' -e 'radix:' -e '\.count)'   # SW-SEC-05
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-SEC-01 | Give every recursive parser, decoder or tree walk over untrusted input a `depth` parameter, check `depth < maxDepth` before recursing and throw a typed error. `maxDepth` is a named constant, **default 64**. A larger value needs the hostile run to pass on a thread with the smallest stack the code runs on (128 KiB under musl, `Thread.stackSize = 131072`). Prefer `JSONDecoder`, `JSONSerialization` or `PropertyListDecoder` to a hand-written parser, because their scanners stop at depth 512 (swift-foundation, read 2026-10-10). That cap protects the scanner only: a recursive `Decodable` decoded through it recurses on the thread stack, so give such a type its own depth guard (`JSONDecoder` into a recursive `Decodable` exits 139 at depth 200 on a 128 KiB thread, Swift 6.4, measured 2026-10-10). A hand-rolled, YAML, XML or form decoder, or a `Codable` over a custom `Decoder`, carries its own limit. Trust a library decoder only for the limit it documents (swift-protobuf `messageDepthLimit` 100, Hummingbird `maxKeyDepth` 64). | Stack exhaustion is a signal, not a catchable error. Hummingbird CVE-2026-97696 (`<= 2.25.1`, fixed 2.26.0, read 2026-10-10) is this defect. A depth-512 parse on a 128 KiB thread exits 139 in debug and 0 in release, and depth 64 passes both (Swift 6.4.0, measured 2026-10-10). | `hostile-run`, first command, prints `exit=65`. Library form: `#expect(throws: ParseError.tooDeep) { try parse(nested(1_000_000)) }`, where a stack overflow kills the test process and fails the run. Reading heuristic: every self-calling parser function has a `depth` parameter and a guard before the call, listed by `grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'func parseValue' -e 'func parseArray' -e 'func parseObject' -e 'indirect enum' Sources` (rename to your parser). Watched red (measured 2026-10-10, Swift 6.4.0): 1,000,000 levels exit 139 without a limit under the default and the `enable=no` backtracer, and exit 65 with it. | MUST |
| SW-SEC-02 | Bound a tree or graph built from untrusted input whose nodes own a collection of children by `SW-SEC-01` at build time. Otherwise tear it down iteratively (a work-list `deinit` using `isKnownUniquelyReferenced`) or store it flat (`[Entry]` plus `Int` indices). Do not add the work list to a singly linked chain. | `final class Node { var kids: [Node] }` built in a loop, with no parser recursion, crashes in `deinit` at 100,000 deep in debug and release (exit 139). A linked `final class Link { var next: Link? }` survived 10,000,000 (Swift 6.4.0, measured 2026-10-10). Hummingbird's fix notes that a deep key builds a node tree whose construction or deallocation overflows the stack. | The `hostile-run` nesting test must also drop the parsed value (assign it and let it go out of scope, because `_ = try parse(...)` inside an exit test is not enough). Reading heuristic: a node type with a stored `[Self]` or `[Node]` child property and no depth cap at its builder. Watched red: the 100,000-kid plant exit 139, the 3,000,000-deep flat or work-list twin exit 0. | MUST |
| SW-SEC-03 | Never read an untrusted stream to its end into memory without a cap. On stdin, socket or file input replace `readDataToEndOfFile()`, `Data(contentsOf:)`, `String(contentsOfFile:)` and `readToEnd()` with a chunked read that checks the running total before appending (NIOFileSystem's `readToEnd(maximumSizeAllowed:)` is the compliant capped form, and the first `a-greps` command does not list it). On the network use AsyncHTTPClient's `for try await buffer in response.body` with a running total, or `collect(upTo:)` with the `SW-NET-07` limits. Never `URLSession.data(from:)`, `data(for:)` or `bytes(for:)`, which buffer the body or do not exist on Linux (`SW-NET-01`). Defaults, the adopter may override: registry bodies per the `SW-NET-07` limits and 1 MiB stdin documents. A hit on local trusted input carries `// bounded: 1 MiB config file`. Captured subprocess output is `SW-IO-03`'s `limit:`. | A 300 MB stdin through `readDataToEndOfFile()` peaks at 311 MB RSS and exits 0. The capped chunked read stops at 1 MiB, exits 65 and peaks at 19 MB RSS (Swift 6.4.0, measured 2026-10-10). The shortest network read, `URLSession.data(from:)`, passed the first version of this grep. | `a-greps`, first command (empty output = pass). Runtime: `hostile-run`, second command, prints `exit=65`. Watched on soto-core (2026-10-10): the pre-fix pattern `readToEnd(` printed three capped `readToEnd(maximumSizeAllowed: .megabytes(1))` lines beside the one real hit, `readToEnd()` prints the real hit alone. Watched red (measured 2026-10-10): the plant with the stdin reader and both `URLSession` calls prints 3 grep lines and exits 0 after buffering all 300000000 bytes, the twin with `collect(upTo:)` and a capped loop prints 0 lines and exits 65. | MUST |
| SW-SEC-04 | Never allocate from a wire-declared length. Compare the unconverted wire integer with a configured cap (`SW-SEC-05`), then allocate. `Array(repeating:count:)`, `reserveCapacity`, `.allocate(capacity:)` and `unsafeUninitializedCapacity` on a non-literal count carry `// bounded: capped at 16 MiB in readFrame`. | An allocation failure is `Fatal error: failed to allocate N bytes`, exit 134 (abort), a remote kill. It is neither the conversion trap (132) nor a throw. | `a-greps`, second command (noisy, run on changed files, empty output = pass). Runtime: a header declaring 2^40 and one declaring 2^63-1 must both exit 65. Watched red (measured 2026-10-10, Swift 6.4.0): the uncapped plant exits 134 on both, the capped twin exits 65 (`declared length exceeds 16777216`) and exits 0 on 1,000. | MUST |
| SW-SEC-05 | Keep an integer from outside the process in its wire type and convert it with `T(exactly:)`, throwing on `nil`, or compare it with the limit first. The conversion and the size check happen before the value indexes, allocates or copies. Use `T(clamping:)` only where saturation is the specified behaviour. The thrown error, not a trap, is `SW-ERR-14`. | `Int(UInt64 >= 2^63)` traps before any configured `maxFrameSize` (swift-nio CVE-2026-43678, `<= 2.100.0`, fixed 2.101.0, read 2026-10-10, [GHSA-qcc5-f287-vgmq](https://github.com/apple/swift-nio/security/advisories/GHSA-qcc5-f287-vgmq)). | `a-greps`, third command (name-based, changed files, empty output = pass). The order half, convert then bound, is a reading heuristic: the cap compares the wire-typed value. Watched red (measured 2026-10-10, Swift 6.4.0): `Int(x)` for a `UInt64` x of 2^63 exits 132 in debug and release (`Not enough bits to represent the passed value`), the `exactly:` twin exits 65. | MUST |
| SW-SEC-06 | A target that combines unsafe pointers with an externally derived size has a test run under `swift test --sanitize=address` (or `swift build -c release --sanitize=address` plus the hostile input), and CI runs it. Ordinary code is out of scope. | The release build of an out-of-bounds write exits 0 (`wrote 64 bytes into a 16-byte allocation`). ASan is the deterministic catch, and it also catches the use-after-free that `StrictMemorySafety` stays silent on. The TSan job is `SW-GATE-27`, and this row adds only the ASan leg. | `swift build -c release --sanitize=address`, then the hostile input must exit non-zero on the violation. The CI job exists (reading). Watched red (measured 2026-10-10, Swift 6.4.0): the release plant exits 0, ASan exits 1 (`heap-buffer-overflow`), the bounded twin exits 65. | MUST |

```swift
// wrong: the stack is the only limit
mutating func value() throws -> JSON {
    items.append(try value())
}

// right: depth is a parameter, checked before the recursive call
let maxDepth = 64
mutating func value(depth: Int = 0) throws -> JSON {
    guard depth < maxDepth else { throw ParseError.tooDeep(limit: maxDepth) }
    items.append(try value(depth: depth + 1))
}
```

## Marker Greps

An unmarked hit is the violation. Each command prints violations, so empty output passes.

```bash
# b-greps (bash)
grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'truncatingIfNeeded' Sources | grep -v -e 'truncate-ok:'   # SW-SEC-07
grep -RnE --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' '[^&]&[-+*]=? ' Sources | grep -v -e 'wrap-ok:'              # SW-SEC-08
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-SEC-07 | Write `T(truncatingIfNeeded:)` only with `// truncate-ok: hash mixing` (a reason) on the same line. Using it to "fix" a conversion error is the defect. Hashing and PRNG code that truncates on purpose carries the marker. | It wraps past the bounds check and corrupts memory in release (swift-nio CVE-2026-43671, `< 2.100.0`, fixed 2.100.0, read 2026-10-10, [GHSA-r3rc-9hpw-54v9](https://github.com/advisories/GHSA-r3rc-9hpw-54v9)). | `b-greps`, first command. Watched red (measured 2026-10-10, Swift 6.4.0): the plant prints 3 lines and the twin 0. The release plant exits 0 where ASan exits 1. | MUST |
| SW-SEC-08 | Do arithmetic on an untrusted value with `addingReportingOverflow` and `multipliedReportingOverflow` or a pre-check. `&+`, `&-` and `&*` (and the compound forms) carry `// wrap-ok: counter wraps by design`. Binds parser, decoder, framing and size-computation targets. `-Ounchecked` is banned by `SW-ERR-16`. | `+` traps (exit 132) and `&+` wraps silently to `-9223372036854775808`. | `b-greps`, second command. It cannot tell untrusted from trusted operands, so run it on those targets and on changed files. Expected noise: a mature NIO-style tree prints hundreds of lines (`&+=` on trusted index math). Watched red (measured 2026-10-10): the plant prints 4 lines (`&+=`, `&*=`, `&-`, `&-=`), the twin 0, and `+` exits 132 where `&+` exits 0. | MUST (boundary targets) |

## Compiler, SwiftPM and Sanitizers

Compiler diagnostics gate first, then the sanitizer run, then the greps below. `Span` is compiler-gated
at Swift 6.2. `.strictMemorySafety()` and `.treatWarning` are manifest-gated at tools 6.2.

```bash
# c-checks (bash)
swift build -c release --sanitize=address && { timeout 60 "$BIN" parse deep.json; echo "exit=$?"; }    # SW-SEC-06: the build must pass first, the run's exit is non-zero on the violation and 124 when the hostile input hangs it (also a finding)
grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'public .*Unsafe' -e 'open .*Unsafe' -e 'public .*OpaquePointer' -e 'open .*OpaquePointer' Sources   # SW-SEC-09 (b)
swift package clean && swift build 2>&1 | grep -e 'TemporaryPointers'                          # SW-SEC-09 (d): must print nothing. A cached rebuild replays no warnings, so an unclean tree proves nothing
grep -Rc --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'free(' Sources | grep -v -e ':0$' -e ':1$'                    # SW-SEC-10: files with two or more
swift build --target CSeam                                                                     # SW-SEC-11: non-zero on an unacknowledged use
grep -Rn --include='Package*.swift' --exclude-dir='.build*' --exclude-dir=.claude --exclude-dir=.agents -e 'strictMemorySafety' .   # SW-SEC-11: enabled targets
git diff -U0 -- '*.swift' | grep -E '^\+.*\bunsafe\b'                                          # SW-SEC-12: review each added site
grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e '@safe' Sources                                                # SW-SEC-12: read the line above for SAFETY:
grep -Rln --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e '\bunsafe ' Sources                                           # SW-SEC-12: only declared seam files
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-SEC-09 | A pointer obtained from `withUnsafeBufferPointer`, `withUnsafeBytes`, `withUnsafe(Mutable)Pointer` or an `&x`-to-pointer conversion never leaves its closure or call. Return a value computed inside, not the pointer. Prefer `Span` and `RawSpan` where the callee accepts one (Swift 6.2). Public API never returns a pointer into Swift-owned storage. | `StrictMemorySafety` does not flag the escape, only a later dereference, and a fully `unsafe`-acknowledged escape builds clean and is a use-after-free under ASan. The `TemporaryPointers` warning (`results in a dangling pointer`) cannot be promoted to an error on 6.4.0. | Four layers. (a) Compile: returning `a.span` from local storage fails with `a function cannot return a ~Escapable result`. (b) and (d) in `c-checks`. (c) The ASan run of `SW-SEC-06`. No check relies on strict mode flagging a returned pointer. Watched red (measured 2026-10-10): (a) exit 1 with that diagnostic, (b) prints 1 line on a `public` pointer return declared on one line and 0 on the twin, whose body sits on its own lines, (c) the escape plant exits 1 (`heap-use-after-free`) and the twin 0, (d) prints `[#TemporaryPointers]` and the build exits 0 under `-warnings-as-errors`, `-Werror TemporaryPointers` and `-Xswiftc -Werror -Xswiftc TemporaryPointers` on 6.4.0 (exit 1 on 6.3.3). | MUST |
| SW-SEC-10 | Keep a C handle or pointer in one Swift type. Store it `private`, never in a `public` or `open` signature, acquire it in `init` only after the input is validated and release it in exactly one place, that type's `deinit` (or a `~Copyable` type's `deinit`). An `init` error path frees nothing the object will free. Hand out Swift values, not the handle. A handle shared across tasks is `Sendable` through an actor, a `Mutex` or an immutable `nonisolated(unsafe) let` with the owning `deinit` (`SW-CONC-09`). | swift-crypto CVE-2026-43823 (critical, `>= 3.2.0, <= 4.5.0`, fixed 4.5.1, read 2026-10-10): initialising an RSA public key from DER or PEM that BoringSSL cannot decode freed the `EVP_PKEY*` in the catch block and again in `deinit` ([GHSA-8q93-f6xh-4f6f](https://github.com/apple/swift-crypto/security/advisories/GHSA-8q93-f6xh-4f6f)). | `c-checks`: the `free(` count lists files with two or more lines containing it, counting lines and not calls (add your library's release function, for example `EVP_PKEY_free`), the public-pointer grep of `SW-SEC-09` (b), and a test that constructs the type from malformed input (a throwing `init`) under ASan. Watched red (measured 2026-10-10, Swift 6.4.0): the double-free plant exits 134 (`double free detected in tcache 2`) and the twin 0, and the grep lists the plant file with `free(` on two lines and not the twin. | MUST |
| SW-SEC-11 | A target that imports a C module, holds `Unsafe*Pointer`, `OpaquePointer` or `Unmanaged` outside tests, or parses untrusted bytes through unsafe pointers sets `.strictMemorySafety()` and, in CI, `.treatWarning("StrictMemorySafety", as: .error)`. Ordinary targets do not, and it is never a repo-wide gate. Acknowledge a C call with `unsafe` on the call expression (`unsafe cbuf_sum(a, a.count)`), not around a closure that also uses `$0`. Strict mode lists every use of a `nonisolated(unsafe)` variable and is silent on the declaration (`SW-CONC-09`). Re-check `-Werror TemporaryPointers` on each 6.4.x release, and until it errors the build-log grep of `SW-SEC-09` (d) is the check. | SE-0458 is opt-in by design, "no path toward becoming the default", and it is the only compiler check that audits every unsafe use. It is an audit trail, not a lifetime checker, so it is SHOULD. The closure spelling errors on 6.3.3 and builds clean on 6.4.0 (measured 2026-10-10). | `c-checks`: `swift build --target CSeam` (rename) exits non-zero on an unacknowledged use, and the `strictMemorySafety` grep lists enabled targets, where every C-wrapping target must appear. Diagnostics on 6.4.0: `expression uses unsafe constructs but is not marked with 'unsafe' [#StrictMemorySafety]` and `class 'Buffer' has storage involving unsafe types`. Watched red (measured 2026-10-10): the plant exits 1, the twin and the flag-off plant exit 0. The `strictMemorySafety` grep excludes `.build`, `.claude` and `.agents`: a plant with `.strictMemorySafety(),` in a `.build/checkouts/*/Package.swift` and a `.claude/worktrees/*/Package.swift` printed 2 lines without the excludes and 0 with them (measured 2026-10-10). | SHOULD (C-wrapping and pointer-parsing targets) · CONSIDER (elsewhere) |
| SW-SEC-12 | Treat `unsafe` as an acknowledgement, not a fix. Never add it, or run `swift package migrate --to-feature StrictMemorySafety`, to silence a warning without reading the site. Keep `unsafe` expressions in designated seam files, and give every `@safe` declaration a `// SAFETY: buffer is never shared across tasks` comment naming what makes it safe. | The migration marks every flagged site mechanically (`for i in 0..<b.count { t += Int(b[i]) }` becomes `unsafe t += Int(b[i])`) and leaves a returned pointer alone. swift-collections has 5,310 lines containing `unsafe ` and no `// SAFETY` comment (read 2026-10-10), so its safety claims are unreviewable. | Reading heuristic, because no mechanical test can tell whether a site was read. Review every added acknowledgement as new code with the three `c-checks` commands for `SW-SEC-12`. The mechanical insertion is measured (Swift 6.4.0, 2026-10-10), the `SAFETY:` convention has no run and no precedent in the corpus. | SHOULD |

## Canaries and Byte Counts

A leak through a library type, `dump`, `Mirror` or a Foundation error is visible only at runtime, so these
rows are proven by a unique canary value or a count of control bytes in the real output. The `SW-SEC-16`
canary test lives in the test target and is the verification of `SW-SEC-13`, `SW-SEC-14` and `SW-SEC-15`.

```bash
# d-checks (bash): CANARY123 is any unique secret value
grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -i -e 'metadata:.*authorization' -e 'metadata:.*password' -e 'metadata:.*token' -e 'metadata:.*secret' -e 'metadata:.*cookie' -e 'metadata:.*api-key' Sources | grep -v -e '\.stringConvertible(' -e 'secret-ok:'   # SW-SEC-13
grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -i -e 'var [a-z]*password: String' -e 'var [a-z]*token: String' -e 'let [a-z]*token: String' -e 'let [a-z]*secret: String' Sources   # SW-SEC-13: reading heuristic
grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e '\\(url' -e '\\(.*[uU][rR][lL])' -e '\\(request.url' Sources | grep -v -e 'redacted'   # SW-SEC-14
grep -RPzo --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' '@(Option|Argument)(?:[^\n]*\bvar |(?:(?!\bvar\b)[^\n])*\n[^\n]*\bvar )(?![a-zA-Z]*(File|Stdin|Env))[a-zA-Z]*([pP]assword|[tT]oken|[sS]ecret)[^\n]*' Sources | tr '\0' '\n'   # SW-SEC-15: multi-line, each match is a violation
test -x "$BIN" && printf '%s' CANARY123 | "$BIN" login --password-stdin 2>&1 | grep -c CANARY123   # SW-SEC-16: must print 0 (grep -c exits 1 on zero), no output means $BIN is missing
grep -RlZ --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'standardError' -e 'stderr' -e 'fputs' Sources | xargs -0 -r grep -L -e 'sanitizeForTerminal'   # SW-SEC-17 (a): lists stderr writers with no sanitiser, read the output, the xargs status is 123 or 0 by batch
test -x "$BIN" && "$BIN" lookup bad-name 2>&1 >/dev/null | LC_ALL=C grep -a -c -e '[[:cntrl:]]' -e $'\xc2[\x80-\x9f]' -e $'\xc2\xad' -e $'\xd8\x9c' -e $'\xe2\x80[\x8b-\x8f\xa8-\xae]' -e $'\xe2\x81[\xa0-\xaf]' -e $'\xef\xbb\xbf' -e $'\xf3\xa0[\x80-\x81]'   # SW-SEC-17 (b): must print 0
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-SEC-13 | Hold a credential (token, password, `Authorization` value, cookie, API key, presigned signature) in a `Secret` type with fixed `description` and `debugDescription`, an empty `customMirror`, no `Codable` and `reveal()` as the single egress. A plain `String` credential field exists only inside the function that builds the header. Log metadata whose key names a credential takes `.stringConvertible(Secret(...))` only. Header logging is off by default and an allow-list of header names beats a deny-list. Never log, interpolate or `dump` an HTTP client's request, header map or authorization object. `Secret` stops `description`, `dump` and `Mirror` leaks only, it does not zero memory or defeat a debugger, and no document may claim more. | swift-log has no privacy model (`Logger.MetadataValue` is `.string`, `.stringConvertible`, `.dictionary` or `.array`). AsyncHTTPClient 1.36.2 `HTTPClient.Authorization` prints its bearer token through interpolation, `String(describing:)` and `dump`, and `HTTPClientRequest.headers` prints `Authorization: Bearer ...` (measured 2026-10-10). | The canary of `SW-SEC-16`, plus the first two `d-checks` commands, the second being a reading heuristic. The first is line-based: a wrapped metadata dictionary escapes it, and the canary is then the check. Watched red (measured 2026-10-10, Swift 6.4.0): the logging plant puts the canary in 3 outputs and the `Secret` twin in 0, the AHC client leaks it in 3 outputs, and the metadata grep prints 1 line on the plant and 0 on the twin. | MUST |
| SW-SEC-14 | Pass every `URL` that enters error text, a log line, metadata or a terminal through `redacted(_:)`, which drops userinfo and fragment and replaces every query value. Errors store the redacted string at construction. Render a network error through `SW-NET-14`'s `render`, which calls `redacted(_:)`, and never through `"\(error)"`. A line that is safe by construction carries a trailing `// redacted: path only`. | `"\(urlError)"` and `failingURL` print `NSErrorFailingURLKey=http://user:CANARY@...?X-Amz-Signature=CANARY`, and OCI blob redirects are presigned URLs (Swift 6.4.0 and 6.3.3, measured 2026-10-10). | The third `d-checks` command (empty output = pass) and the canary test. Watched red (measured 2026-10-10): the grep prints 2 lines on a plant that interpolates a URL into `print` and a stderr write and 0 on the twin, the logging plant puts the canary in 3 lines, and interpolation plus `failingURL` put it in 2 lines of a `URLError`. | MUST |
| SW-SEC-15 | A secret reaches the process through stdin, a `0600` file (`SW-IO-21`) or the platform credential store, never as an `@Option` or `@Argument` value. An environment variable is allowed only as the documented non-interactive (CI) channel. Wrap it in `Secret` on read, redact it from logs and error text and do not forward it to a child that does not need it. An SDK passes the token to the CLI child on stdin or in the documented environment triple, never in the child's argv. Secrets stay outside the flag over environment over file precedence of `SW-CLI-17`. | `argv` is world-readable (`/proc/PID/cmdline` is mode 444). `/proc/PID/environ` is owner-only 400, but children inherit it and CI dumps it (measured 2026-10-10). Default, the adopter may tighten it to no environment channel at all. | The fourth `d-checks` command (empty output = pass), which is multi-line, so the attribute and `var` may sit on separate lines, and also catches `@Argument var secret`. Watched red (measured 2026-10-10): the plant prints 2 matches (one per layout, `@Option` and `var` on one line or on two) and the twin (`passwordStdin` flag, `tokenFile`) 0. | MUST |
| SW-SEC-16 | Run a canary test over every failing and verbose path of the CLI or SDK with a unique secret value in the credential inputs, and assert that it never appears in stdout, stderr or the log sink. An SDK that captures a child process's output also hands the canary to a fake child that echoes it on stderr and asserts the surfaced error text is clean. The SDK scrubs the exact credential values it handed the child before the text enters an error. The SDK clause is SHOULD and `unverified: read only`. | Only a runtime check sees leaks through library types, `dump`, `Mirror` and Foundation errors. | The fifth `d-checks` command prints `0`, judged by the printed count. Adapt it to the channel of `SW-SEC-15`. Watched red (measured 2026-10-10): the canary pipeline prints 3 on the logging plant and 0 on the twin. The fake-child clause and the stdin variant were not run. | MUST |
| SW-SEC-17 | Send all wire-supplied text to a terminal through `sanitizeForTerminal`, called at exactly three boundaries: the root `main()` error writer (the single stderr boundary of `SW-CLI-02`, composed after `SW-ERR`'s `render(_:)`, where `SW-CLI-25` applies it to `fullMessage(for:)`), the log handler (message, error text and every metadata value) and every human-format stdout render of registry text. It escapes, never strips, C0, DEL, C1, `Cf`, U+2028 and U+2029 as `\u{HEX}`, keeps `\n` and `\t`, is idempotent and is pinned by the 19-row corpus below. A library or SDK applies it when it builds an error `message` from wire- or child-derived text, and its docs say `message` is for people and `code` for programs. Machine JSON stdout stays faithful, so sanitise on a TTY or in the human format. Do not substitute `debugDescription`, `String(reflecting:)`, `escaped(asASCII:)` or an `ESC[...m` regex. | ESC sequences "change console colors, move the cursor, clear the screen, or fake prompts" ([CWE-150](https://cwe.mitre.org/data/definitions/150.html)). OSC 52 writes the clipboard and bidi controls reorder what a human reads (CVE-2021-42574). ArgumentParser 1.8.2, swift-log 1.16.1 `StreamLogHandler` and `FileHandle.standardError.write` print the bytes raw, and `debugDescription` leaves U+202E, U+0085, U+2028, U+200B, U+FEFF and U+009B raw (measured 2026-10-10). An SGR-only regex fails 16 of the 19 rows. `JSONEncoder` escapes ESC and CR but writes U+202E and U+2028 raw. 0 of 40 surveyed Swift repositories sanitise wire text. | (a) and (b) in `d-checks`: (a) lists stderr-writing files with no sanitiser, and (b) prints `0` for the stderr of a hostile-registry case (keep tabs out of that case, `[[:cntrl:]]` matches one). (c) The corpus test below passes. Watched red (measured 2026-10-10, Swift 6.4.0 and 6.3.3): the raw writer counts 1 and the sanitised writer 0, the raw log handler 1 and ArgumentParser's own error output 1, the sanitised root hook counts 0 with exits 64, 1 and 3, and the corpus test fails 16 rows for the SGR-only regex. The SDK clause is a decision, not a run. | MUST |

```swift
public struct Secret: Sendable, CustomStringConvertible, CustomDebugStringConvertible, CustomReflectable {
    private let value: String
    public init(_ value: String) { self.value = value }
    /// The single egress, so every call site is a review point.
    public func reveal() -> String { value }
    public var description: String { "<redacted>" }
    public var debugDescription: String { "<redacted>" }
    public var customMirror: Mirror { Mirror(self, children: [:]) }
}  // deliberately not Codable

logger.info("request", metadata: ["Authorization": .stringConvertible(Secret(authHeader))])

public func redacted(_ url: URL) -> String {
    guard var c = URLComponents(url: url, resolvingAgainstBaseURL: false) else { return "<unparseable url>" }
    c.user = nil
    c.password = nil
    c.fragment = nil
    c.queryItems = c.queryItems?.map { URLQueryItem(name: $0.name, value: "REDACTED") }
    return c.string ?? "<unparseable url>"
}
```

The sanitiser costs ZWJ emoji sequences (rendered `👨\u{200D}👩`) legitimate `\r` progress text and ZWNJ in Persian and Indic text, all accepted.

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

The 19-row corpus pins it. `ToolCore` is the module that holds `sanitizeForTerminal`, rename it.

```swift
import Testing
import ToolCore

struct Row: Sendable, CustomTestStringConvertible {
    let name: String
    let input: String
    let gone: [UInt32]
    let shown: String
    var testDescription: String { name }
}

let corpus: [Row] = [
    Row(name: "CSI clear screen", input: "a\u{1B}[2Jb", gone: [0x1B], shown: "a\\u{1B}[2Jb"),
    Row(name: "OSC 8 hyperlink", input: "\u{1B}]8;;http://evil/\u{07}x", gone: [0x1B, 0x07], shown: "\\u{7}x"),
    Row(name: "OSC 52 clipboard", input: "\u{1B}]52;c;SGVsbG8=\u{1B}\\", gone: [0x1B], shown: "\\u{1B}"),
    Row(name: "tmux DCS", input: "\u{1B}Ptmux;\u{1B}\u{1B}]0;x\u{07}\u{1B}\\", gone: [0x1B, 0x07], shown: "Ptmux;"),
    Row(name: "8-bit CSI", input: "x\u{9B}2Jy", gone: [0x9B], shown: "\\u{9B}"),
    Row(name: "CR overwrite", input: "ok\rEVIL", gone: [0x0D], shown: "\\u{D}"),
    Row(name: "NUL", input: "a\u{0}b", gone: [0x00], shown: "\\u{0}"),
    Row(name: "DEL", input: "a\u{7F}b", gone: [0x7F], shown: "\\u{7F}"),
    Row(name: "backspace", input: "abc\u{08}\u{08}X", gone: [0x08], shown: "\\u{8}"),
    Row(name: "bidi override", input: "app\u{202E}gnp.exe", gone: [0x202E], shown: "\\u{202E}"),
    Row(name: "bidi isolates", input: "a\u{2066}b\u{2069}", gone: [0x2066, 0x2069], shown: "\\u{2069}"),
    Row(name: "zero-width space", input: "a\u{200B}b", gone: [0x200B], shown: "\\u{200B}"),
    Row(name: "BOM", input: "\u{FEFF}x", gone: [0xFEFF], shown: "\\u{FEFF}x"),
    Row(name: "NEL", input: "a\u{85}b", gone: [0x85], shown: "\\u{85}"),
    Row(name: "line separator", input: "a\u{2028}b", gone: [0x2028], shown: "\\u{2028}"),
    Row(name: "newline and tab survive", input: "a\nb\tc", gone: [], shown: "a\nb\tc"),
    Row(name: "CJK survives", input: "名前/タグ", gone: [], shown: "名前/タグ"),
    Row(name: "emoji survives", input: "ok 🚀 🇩🇪", gone: [], shown: "ok 🚀 🇩🇪"),
    Row(name: "ZWJ is escaped (accepted cost)", input: "👨\u{200D}👩", gone: [0x200D], shown: "\\u{200D}"),
]

@Test(arguments: corpus)
func escapesHostileText(_ row: Row) {
    let out = sanitizeForTerminal(row.input)
    #expect(!out.unicodeScalars.contains { row.gone.contains($0.value) })
    #expect(out.contains(row.shown))
    #expect(sanitizeForTerminal(out) == out)
}
```

## Banned APIs

```bash
# e-greps (bash): each command prints violations, empty output passes
grep -RnE --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e '(struct|class|enum|actor|extension) +[A-Za-z0-9_.]+(<[^>]*>)? *:[^{]*RandomNumberGenerator' -e 'arc4random' -e 'drand48' -e 'srand\(' -e '\brand\(\)' -e '\brandom\(\)' Sources   # SW-SEC-18
grep -RnE --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'Insecure\.(MD5|SHA1)\b' Sources | grep -v -e 'insecure-ok:'                                                           # SW-SEC-19
grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'import CryptoKit' Sources                                                                                  # SW-SEC-19: each hit under #if canImport(CryptoKit) or an Apple-only target
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-SEC-18 | Take unguessable random values (tokens, nonces, salts, keys, session ids) from `SystemRandomNumberGenerator` (explicit `using: &g`, or the default `random(in:)`) or `SymmetricKey(size:)`. Use no seeded or custom `RandomNumberGenerator` (the grep lists single-line conformers and the libc generators; a generic `<G: RandomNumberGenerator>` parameter is the prescribed `using: &g` shape and is not listed). `UUID().uuidString` is an identifier, not an authentication token. | `SystemRandomNumberGenerator` is the CSPRNG on every platform: `getrandom(2)` on Linux, `arc4random_buf` on Apple and `BCryptGenRandom` on Windows, the last two `unverified: read only`. A custom generator is predictable. | `e-greps`, first command, plus SwiftLint 0.65.1 `legacy_random` (default on), which does not see a custom generator where the grep does. Watched red (measured 2026-10-10): the plant prints 3 grep lines and 2 `legacy_random` warnings, the twin 0. Conformer pattern (measured 2026-10-10): a plant with `struct`, `final class`, `extension` and generic-type conformers prints 4 lines, a twin with `func f<G: RandomNumberGenerator>(using g: inout G)` and `struct Box<G: RandomNumberGenerator>` prints 0, and swift-numerics, swift-case-paths and console-kit print 0. | MUST |
| SW-SEC-19 | Cross-platform code imports `Crypto` (swift-crypto), never bare `import CryptoKit`, which is guarded by `#if canImport(CryptoKit)` in Apple-only files. Compare MAC tags with `isValidAuthenticationCode` or `SymmetricKey ==`, never `==` on bytes. `Insecure.MD5` and `Insecure.SHA1` appear only with `// insecure-ok: cache key, not authentication`. Hand-roll no primitive. The dependency range is `SW-PKG-25` and advisory floors are `SW-SEC-20`. | `no such module 'CryptoKit'` on Linux. `HMAC.isValidAuthenticationCode` compares in constant time. MD5 and SHA-1 are collision-broken, and content-addressed digests are SHA-256 or SHA-512 (`SW-IO-13`). | `e-greps`, second and third commands, and `swift build` on Linux. The MAC-compare half is a reading heuristic, because the compare is not observable in a fixture. Watched red (measured 2026-10-10, Swift 6.4.0): `import CryptoKit` exits 1 on Linux and `import Crypto` builds, the `Insecure.MD5` and `Insecure.SHA1` grep prints 1 line on the plant and 0 on the twin, and 0 on jwt-kit where the broad `Insecure\.` form printed 12 `Insecure.RSA` lines of a JWT library (RS256 is mandated, swift-crypto files RSA under `Insecure` by naming; measured 2026-10-10). | MUST |

## The Lockfile

A scanner is one input. SwiftPM has no audit subcommand (an unknown subcommand name exits 64 on 6.3.3 and
6.4.0, measured 2026-10-10). `floors` exits 0 when no committed pin is below a floor. `discovery` lists the
repository advisories of every pinned dependency, so it finds a CVE nobody has mentioned yet.

```sh
# floors: prints BELOW FLOOR for each pin under its advisory floor, exits 1 if any. An absent dependency passes.
# A branch or revision pin has no version, so it passes here and is SW-PKG-09's to forbid.
# Preconditions are checked first: no jq exits 69 and no Package.resolved exits 66. Without them the bare swift:6.4 image printed BELOW FLOOR for every dependency (measured 2026-10-10).
command -v jq >/dev/null || { echo 'floors: needs jq' >&2; exit 69; }
f=Package.resolved; test -f "$f" || { echo 'floors: no Package.resolved in the current directory' >&2; exit 66; }; bad=0
floor() { jq -e --arg i "$1" --argjson m "$2" '[.pins[] | select(.identity==$i) | .state.version | select(. != null) | sub("[-+].*$";"") | split(".") | map(tonumber)] | all(. >= $m)' "$f" >/dev/null || { echo "BELOW FLOOR: $1 (need >= $3)"; bad=1; }; }
floor swift-nio '[2,101,0]' 2.101.0; floor swift-nio-ssl '[2,37,2]' 2.37.2; floor swift-nio-extras '[1,34,1]' 1.34.1
floor swift-crypto '[4,5,1]' 4.5.1; floor hummingbird '[2,26,0]' 2.26.0; exit $bad
```

```sh
# discovery: needs jq, gh and a GitHub token
for c in jq gh; do command -v $c >/dev/null || { echo "discovery: needs $c" >&2; exit 69; }; done; test -f Package.resolved || { echo 'discovery: no Package.resolved in the current directory' >&2; exit 66; }
jq -r '.pins[] | select(.location | test("github.com")) | .location' Package.resolved | sed -E 's#.*github.com/([^/]+/[^/.]+)(\.git)?$#\1#' | while read -r r; do echo "== $r"; gh api "repos/$r/security-advisories" --jq '.[] | select(.state=="published") | "\(.cve_id // .ghsa_id) \(.severity) vulnerable=\(.vulnerabilities[0].vulnerable_version_range) fixed=\(.vulnerabilities[0].patched_versions)"'; done
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-SEC-20 | The committed `Package.resolved` of a root that ships (the `SW-PKG-26` kinds) pins every dependency at or above its advisory floor, the `floors` script exits 0 in CI, and floors are re-derived with `discovery` whenever a dependency is bumped, by whoever bumps it. A library or SDK keeps its wide range (`SW-PKG-25`) and raises the lower bound (`"4.5.1" ..< "6.0.0"`) only when it calls the affected API. Floors, a snapshot read 2026-10-10 from repository advisories: swift-nio 2.101.0 (CVE-2026-43678, -43671, -28980, -28970), swift-nio-ssl 2.37.2 (CVE-2026-43820, critical, out-of-bounds read from a non-string SAN, `>= 2.18.0, <= 2.37.1`), swift-nio-extras 1.34.1 (CVE-2026-28975, decompression ratio bypass), swift-crypto 4.5.1 (CVE-2026-43823, critical) and hummingbird 2.26.0 (CVE-2026-97696, -97697, -102835). Re-run `discovery` before trusting the table. | A green scanner is not a safe tree. CVE-2026-43678, -97696, -97697, -102835, -43820 and -43823 return 0 from GitHub's global advisory API and OSV, and swift-nio 2.100.0 is scanner-green and inside CVE-2026-43678's `<= 2.100.0` (measured 2026-10-10). | The `floors` block: its output is the pins below a floor, and exit 1 means a failure. Watched red (measured 2026-10-10): a tree pinning swift-nio 2.100.0, swift-nio-ssl 2.37.1, swift-crypto 4.5.0, hummingbird 2.25.1 and swift-nio-extras 1.34.0 prints 5 `BELOW FLOOR` lines and exits 1, the tree at each floor exits 0, an OSV-clean tree at swift-nio 2.100.0 prints `BELOW FLOOR: swift-nio` and exits 1, and `discovery` on it lists CVE-2026-43678 `vulnerable=<= 2.100.0 fixed=2.101.0`. | MUST (roots that ship) · SHOULD (libraries) |
| SW-SEC-21 | CI scans the lockfile with `osv-scanner scan source -L Package.resolved`, which exits 1 on findings, and the repository enables Dependabot `package-ecosystem: swift` for alerts and update PRs. A release SBOM from `SW-REL` scans as `*.cdx.json`. A library that does not commit its lock (`SW-PKG-27`) scans the lock a fresh `swift package resolve` produces, which is a reading and was not run. | Three scanners read `Package.resolved` (OSV-Scanner, Trivy and Syft with Grype). GitHub's Swift feed holds 64 reviewed advisories and misses six well-known 2026 CVEs, so the scan is one input. 4 of 40 surveyed repositories enable the Dependabot `swift` ecosystem and 0 scan `Package.resolved` in a workflow (read 2026-10-10). | `osv-scanner scan source -L Package.resolved` exits 1 on a finding and 0 with `No issues found`. Watched red (measured 2026-10-10, osv-scanner 2.6.0): a tree pinning swift-nio 2.62.0 exits 1 with 3 vulnerabilities (GHSA-cq87-8r7h-962v, GHSA-r3rc-9hpw-54v9, GHSA-rj37-6j9x-74q6), and 2.100.0 exits 0. Dependabot, Trivy and Syft are `unverified: docs only`, and Dependabot does not support Swift registries. | SHOULD |

## Reading Heuristics

No fixture decides these rows. A reviewer applies the named heuristic to the changed lines.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-SEC-22 | Convert a parsed float with `Int(exactly:)`, not `Int(_ double:)`, and precede `lower...upper` and `lower..<upper` built from parsed bounds with `lower <= upper` in the same function. | NaN, infinity and out-of-range values trap, and `5...2` aborts the process (Hummingbird CVE-2026-97697, `Range: bytes=5-2`, read 2026-10-10). | Reading heuristic "every `a...b` or `a..<b` with parsed bounds has a dominating comparison", because a range built from a variable is not greppable. Runtime, watched (measured 2026-10-10, Swift 6.4.0): `5...2` exits 132 and the guarded twin 0, `Int(Double.nan)` exits 132 and the `exactly:` twin 0. | SHOULD |
| SW-SEC-23 | Give any decompressing reader an explicit finite limit (NIO `DecompressionLimit` through `decompression: .enabled(limit: ...)`), never `.none` or unlimited, and bound the inflated size, not the compressed size. | Ratio bombs. The related advisories are swift-nio-extras CVE-2026-28975 and swift-nio CVE-2026-28980 (read 2026-10-10). AsyncHTTPClient and Vapor expose the setting. | `grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'decompression' -e 'DecompressionLimit' Sources` (empty output = the row does not apply), then read each hit for a finite limit. Reading heuristic: decompression-ratio behaviour was not run, and archive-layer bombs (a libarchive-style extractor) are not covered at all. | SHOULD |
| SW-SEC-24 | Validate wire names and tags against their grammar at parse time and reject a mismatch (an OCI repository is lowercase alphanumeric components joined by `.`, `_`, `__` or one or more `-` and separated by `/`, a tag matches `[a-zA-Z0-9_][a-zA-Z0-9._-]{0,127}`), with digests following `SW-IO-13`. The parsed value type is the only thing that may become a path component or be printed unsanitised, and `SW-SEC-17` is for free text only (registry `message`, `detail`). A `Regex` check uses `wholeMatch`, never `contains` or `firstMatch`. | Validation removes the hostile bytes before they are in a string at all, and the sanitiser is the catch-all, not the first line. The OCI spec leaves `message` free-form. | Reading heuristic: a table test where names with `\u{1B}`, `\r`, U+202E, uppercase and `..` all throw at parse. No fixture was built, which is why it is not MUST. | SHOULD |

## What Agents Get Wrong Here

1. **`Data(contentsOf:)`, `readDataToEndOfFile()` or `URLSession.data(from:)` on a registry response or stdin.** Shortest API, exit 0 at 311 MB. `SW-SEC-03`.
2. **Interpolating `"\(error)"`, `"\(url)"` or `print(error)` into text or logs, or logging `Authorization`.** Foundation and HTTP client types print userinfo, signatures and tokens. `SW-SEC-13`, `SW-SEC-14`, `SW-SEC-16`.
3. **`Int(x)` on a `UInt64` wire field, `truncatingIfNeeded:` to "fix" a conversion error, `&+` to silence a trap.** It trades exit 132 for silent corruption. `SW-SEC-05`, `SW-SEC-07`, `SW-SEC-08`.
4. **A hand-rolled recursive parser, or a `Codable` over a custom `Decoder`, with no depth parameter.** The failure is an uncatchable exit 139. `SW-SEC-01`, `SW-SEC-02`.
5. **Printing registry text raw, trusting ArgumentParser or `debugDescription`, or writing the sanitiser as an `ESC\[[0-9;]*m` regex.** That regex fails 16 of 19 rows. `SW-SEC-17`.
6. **`@Option var password: String` or a `--token` flag.** `cmdline` is world-readable. `SW-SEC-15`.
7. **Sprinkling `unsafe`, running the `StrictMemorySafety` migration, or returning `buffer.baseAddress` from `withUnsafeBufferPointer`.** Strict mode is silent on a returned pointer. `SW-SEC-09`, `SW-SEC-11`, `SW-SEC-12`.
8. **A public C-handle wrapper with `public var raw: OpaquePointer?` and `free` in both the `init` error path and `deinit`.** `SW-SEC-10`.
9. **"Dependabot and OSV are green, so we are patched", or inventing a SwiftPM audit subcommand.** Scanners miss repository advisories. `SW-SEC-20`, `SW-SEC-21`.
10. **`import CryptoKit` in cross-platform code, `UUID().uuidString` or a seeded generator as a token, `arc4random()`.** `SW-SEC-18`, `SW-SEC-19`.
11. **Raising `maxDepth` to 512 or 1000 "because Foundation does".** A 128 KiB thread exits 139. `SW-SEC-01`.
12. **Validating a name with `contains` or `firstMatch`, or leaning on the sanitiser instead.** Display safety is not path safety. `SW-SEC-24`.
