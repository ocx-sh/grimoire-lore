---
# Read on demand through the index. This glob matches no file, so a client never auto-loads the file.
paths:
  - "**/.swift-quality-depth-on-demand"
title: API and SDK Shape
summary: The SW-API family, owning the public surface of a Swift library or SDK, which is import access levels, Sendable intent, public enum evolution, deprecation, library logging and speculative protocols, plus the pinned shape of an SDK that wraps a CLI
---

# API and SDK Shape

Binds to Swift 6.4.0 (current), 6.3.3 (previous) and the 6.2.0 floor leg, swift-log 1.16.1, swift-subprocess 1.0.1
and ocx 0.6.5 (measured 2026-10-10).

This file owns what a library or SDK exposes and how that is kept honest: which imports are public, which public
types state their `Sendable` intent, how a public enum may grow, how API is deprecated, how a library takes a
logger, when a protocol earns its place, and the pinned shape of an SDK that wraps a CLI (targets, dependency budget,
argv, exit mapping, cancellation, timeout, capture, decoding, tests). Not owned here: the error type's design is
`SW-ERR` (`SW-ERR-08`, `SW-ERR-20`), `Sendable` and isolation semantics and the consumer-package vehicle are
`SW-CONC` (`SW-CONC-04`, `SW-CONC-06`), subprocess teardown and environment are `SW-IO` (`SW-IO-23`, `SW-IO-24`,
`SW-IO-26`), exit-status tables and the executable's logger bootstrap are `SW-CLI` (`SW-CLI-01`, `SW-CLI-15`), and
the coverage and replay-seam rules are `SW-TEST`. Manifest flags are `SW-PKG-07`, CI wiring of the lint and the
API-breakage check is `SW-GATE-17` and `SW-GATE-20`, and version guards are `SW-LANG-03` and `SW-LANG-04`. Naming
(the Swift API Design Guidelines), `@retroactive` and module splits beyond the SDK's two targets are not owned here.
**SDK** means the pinned default shape, a library that wraps a CLI through swift-subprocess. Without one, read
"library".

Contents: [Dates, Floors and Pinned Defaults](#dates-floors-and-pinned-defaults) ·
[The Compiler Gate](#the-compiler-gate) · [Evolution: Enums, Deprecation, Library Evolution](#evolution-enums-deprecation-library-evolution) ·
[Library Logging](#library-logging) · [Protocols](#protocols) · [SDK Shape: Greps and Manifest](#sdk-shape-greps-and-manifest) ·
[SDK Behaviour: Tests Against a Fake CLI](#sdk-behaviour-tests-against-a-fake-cli) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates, Floors and Pinned Defaults

Measured 2026-10-10 on Linux x86_64 in the `swift:6.4` and `swift:6.3` images unless a row says read. Every
Apple-platform and Windows statement is `unverified: read only`. No SwiftLint 0.65.1 or swift-format 6.4 rule covers
any row here, so each gate is a compiler build, the API-breakage digester, a grep or perl scan, a test, or the
coverage jq. A SwiftLint `custom_rules` regex is only a delivery vehicle for a grep (`SW-GATE`). Run
`bash "$CHECKS/canary.sh"` first (`SW-CORE-03`, `CHECKS` as in the index gate block), because an empty-output grep
passes on an empty tree. Cells assume GNU grep with `-P` and `jq`.

- Mechanism of each floor. Manifest-gated: tools 6.2 (`unsafeFlags` no longer blocks dependents, group promotion in
  `swiftSettings`). Compiler-gated: `@nonexhaustive` at Swift 6.2.3 (SE-0487, read 2026-10-10), `package` access at
  5.9 (SE-0386), `InternalImportsByDefault` at 6.0 (SE-0409), `MemberImportVisibility` at 6.1 (SE-0444). Dependency-gated:
  `Logger.current` at swift-log 1.14.0, `InMemoryLogHandler` at 1.16.1, the whole SDK at swift-subprocess 1.0.1.
- Pinned defaults, each overridable once with the reason recorded:
  - Libraries and the SDK use tools 6.2 and Swift 6 mode, so `@nonexhaustive` is guarded (SW-API-05). The adopter may
    instead state `swift:6.2.3` as the floor leg and drop the guard.
  - The SDK depends on swift-subprocess only, links `FoundationEssentials` only, and gates 100% line coverage on the
    Linux leg. It has no logger and no downloader in v1. An adopter who wants SDK logging widens the dependency budget
    to swift-log, and SW-API-07 then binds the SDK.
  - Signals map to `128 + n` (SW-API-16). Windows is `unverified: read only`.
  - One major from deprecation to removal is a decided policy, not a measured fact (SW-API-06).
- Ocx names are examples the adopter renames to the wrapped CLI: public target and product `OcxSDK`, spawn target
  `OcxSpawn`, error `OcxError`, `Code`, the `OCX_SDK_EXE` and `OCX_HOME` variables, the `--format json --color never`
  argv prefix, and the exit table in SW-API-24. The mechanism in each row stays, only the names and values change.
- The reference SDK package is not shipped. SW-API-09 to SW-API-24 are its shape: a 467-line source and 487-line test
  suite that passed 38 tests in about 3 s on both toolchains (measured 2026-10-10).

## The Compiler Gate

Gate: `swift build` in the package, and again in a separate consumer package that depends on it by path. Exit 1 is the
violation. The consumer package is the `CompileTests/` vehicle of SW-CONC-06.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-API-01 | Import with the access level the declaration needs. With `InternalImportsByDefault` on (SW-PKG-07), write `public import M` only where a type of M appears in a `public`, `open` or `@inlinable` signature of that file, `package import M` where it appears only in a `package` signature, and a bare `import M` otherwise. `package import` never satisfies a `public` signature. Binds library and SDK. | In Swift 6 mode a bare `import` is still public (SE-0409 makes it internal only in a future language mode), so every dependency re-exports to clients silently. With the flag the compiler names each leaking signature. | `swift build` exits 1 on a leak: `error: function cannot be declared public because its parameter uses an internal type` plus `note: struct 'DepType' imported as 'internal' from 'Dep' here`. `package import` on a public signature exits 1 `... uses a package type`. A missing direct import under `MemberImportVisibility` exits 1 `is not available due to missing import of defining module`. Watched red on 6.4.0 and 6.3.3, green on the `public import` twin (measured 2026-10-10). `swift package migrate --to-feature MemberImportVisibility` works. `--to-feature InternalImportsByDefault` exits 64 `is not migratable`, so adopt that flag by hand: enable it, let the compiler list the leaks, add `public import` to exactly those files. The reverse direction (a `public import` no public signature needs) has no diagnostic. Reading heuristic: `grep -Rn -e '^public import' --include='*.swift' Sources`, then ask per hit whether the module's type is in a public signature there (empty output = no public imports). `swift build --explicit-target-dependency-import-check error` did not go red on the plant and is not a gate. | MUST |
| SW-API-02 | Every public type states its Sendable intent. The library gate is SW-GATE-17's `.treatWarning("ExplicitSendable", as: .error)` in the target's `swiftSettings`, and a consumer package proves the statement from outside: it stores each public type in a `Sendable` struct property and captures one in a `@Sendable` closure. A deliberately non-Sendable type says `@available(*, unavailable) extension T: Sendable {}` and its consumer line is the expected failure. Every `-require-explicit-sendable` spelling is inert, never use one as the gate. Binds library and SDK. Floor: the `ExplicitSendable` group is Swift 6.3 (a 6.2 leg guards it, `SW-GATE-29`), `~Sendable` Swift 6.4 (below it use the unavailable extension, `SW-CONC-04`). | Only non-public types get `Sendable` inferred, so a public type with no statement compiles in its own package and is red in every consumer. The group gate answers "is there a statement" and the consumer answers "does it behave as intended" (the unavailable extension passes the group gate and must stay red for the consumer). `Task {}` in `main.swift` crosses no isolation boundary and proves nothing. | Library side: `swift build` exits 1 `error: public struct 'Config' does not specify whether it is 'Sendable' or not [#ExplicitSendable]`, exit 0 with `public struct Config: Sendable`. The group is opt-in, so no setting exits 0 silently. The same promotion beside `-Xfrontend -require-explicit-sendable` exits 0 with two warnings. Consumer side: `swift build` in the consumer package exits 1 `stored property 'config' of 'Sendable'-conforming struct 'Job' has non-Sendable type 'Config'` and `capture of 'c' with non-Sendable type 'Config' in a '@Sendable' closure [#SendableClosureCaptures]`, exit 0 once stated. Watched red and green on 6.4.0 and 6.3.3 (measured 2026-10-10). | SHOULD |
| SW-API-25 | Declarations used only by sibling targets of the same package are `package`, not `public`. Binds library and SDK. Floor: Swift 5.9. | Every `public` symbol is versioned API. `package` (SE-0386) is invisible outside the package. | `swift build` in a consumer package that calls the symbol exits 1 `error: cannot find 'helper' in scope`, which proves the visibility (watched red, exit 0 on the `public` twin). Finding the over-public declarations in existing code is a reading heuristic: list `public` declarations whose only referrers are in the same package. | SHOULD |

Wrong, then right:

```swift
// wrong: Dep leaks to every client, and the flag turns this into a build error
import Dep

public func decode(_ value: DepType) {}

// right
public import Dep

public func decode(_ value: DepType) {}
```

## Evolution: Enums, Deprecation, Library Evolution

Gate: the `pubenum` scan below, `swift package diagnose-api-breaking-changes "$BASELINE"` (exit 1 on a break,
baseline per SW-REL-20, wiring per SW-GATE-20), and the greps in the table. Empty output = pass for each grep and for
the scan.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-API-03 | No `@_exported import` in a library or SDK target. The one exception is a deliberate platform overlay module, with a comment naming it (`swift-crypto@1c80d3aff53f:Sources/Crypto/PRF/AES.swift`, `@_exported import CryptoKit`). Binds library and SDK. | SE-0409 accepts `@_exported` only on `public import` and does not bless it as a public-dependency feature. Re-export defeats SW-API-01 and ties clients to the dependency. Agents reach for it to silence a leak error. | `grep -Rn -e '@_exported' --include='*.swift' Sources`. Watched red (plant hit `Ex.swift:1:@_exported import Dep`, twin empty, measured 2026-10-10). | MUST |
| SW-API-04 | Never pass `-enable-library-evolution` for a source-distributed SwiftPM library. Enable it only for a binary framework built apart from its clients, from its first release, and then every public non-`@frozen` enum forces `@unknown default` on consumers. Binds library and SDK. | swift.org says SwiftPM packages "should not be built with library evolution support". The flag has no `SwiftSetting`, only `.unsafeFlags`, which a dependency cannot carry below tools 6.2 (`error: ... contains unsafe build flags`, exit 1) and which tools 6.2 stopped checking, so it now ships by accident. | `grep -Rn --exclude-dir=.build --exclude-dir=.git -e 'enable-library-evolution' --include='Package*.swift' .` Every hit needs a binary-distribution justification in the change. Watched red: a plain-enum consumer exits 1 `switch covers known cases, but 'Status' may have additional unknown values`, the `@frozen` twin exits 0 (measured 2026-10-10). In 40 corpus repos only swift-testing and SwiftPM enable it, both for ABI-stable binaries. Apple `BUILD_LIBRARY_FOR_DISTRIBUTION` and XCFrameworks: unverified: read only. | MUST |
| SW-API-05 | Every new public enum of a library or SDK is `@frozen`, `@nonexhaustive` or a struct. `@frozen` for a domain closed by construction. `@nonexhaustive` (SE-0487) from the first release where `switch` is the point and cases will grow. Otherwise a `struct` with `static` members. A public error type is SW-ERR-20's struct and in an SDK never an enum (SW-API-17). While the declared floor admits Swift 6.2.0 to 6.2.2, wrap the attribute in `#if hasAttribute(nonexhaustive)`. Never write `@nonexhaustive` with `@frozen`, and never invent a spelling (`@nonExhaustive`, `@extensible`). A caseless namespace enum is exempt: the scan prints it, skip it on reading. Binds library and SDK with external consumers. Floor: `@nonexhaustive` Swift 6.2.3, `@frozen` any. | A case added to a plain public enum is `error: switch must be exhaustive` in every external consumer (same-package consumers never see it), and retrofitting `@nonexhaustive` later is itself source-breaking. `@frozen` changes nothing mechanically in a source package. It records a promise the digester then enforces. 85% of public enums in 17 library-shaped corpus repos carry neither attribute. | The `pubenum` scan prints each unmarked public enum, plus SW-API-11. Gate it on the changed-file form: the whole-tree form is a census. Availability: `swiftc -typecheck -parse-as-library -swift-version 6` exits 1 `unknown attribute 'nonexhaustive'` on 6.1.3 and exits 0 on 6.3.3 and 6.4.0. Confirm each use is guarded or the floor is stated: `grep -Rn -e '@nonexhaustive' --include='*.swift' Sources`. Watched red (measured 2026-10-10): the scan prints 1 line for a plain enum and nothing for `@nonexhaustive`, struct and `@frozen` twins. A consumer exits 1 on a new case of a plain enum and exits 0 with `@unknown default`, a struct or `@frozen`. `@nonexhaustive` with `@frozen` exits 1 `cannot use '@nonexhaustive' together with '@frozen'`. The guarded library on 6.1 builds both consumer styles, on 6.4 the `@unknown default` consumer builds and the exhaustive one exits 1. | MUST |
| SW-API-06 | Deprecate with a replacement and a removal major: `@available(*, deprecated, renamed: "fetch(url:)", message: "removed in 3.0")` on the member, and `@available(*, deprecated, renamed: "NewName") public typealias OldName = NewName` for a renamed type. Never a bare `@available(*, deprecated)`. Removal or `unavailable` happens in the next major only (SW-API-11). Binds library and SDK. | A bare deprecation names no replacement and no date (`warning: 'get' is deprecated [#DeprecatedDeclaration]`), and the digester treats removal as breaking. | `grep -Rn -F -e '@available(*, deprecated)' --include='*.swift' Sources`. Consumers that must stay current add `.treatWarning("DeprecatedDeclaration", as: .error)` (exit 1) and, per SW-GATE-15, `UnknownWarningGroup` beside any group. A `renamed:` string that is not the new declaration's full name (`"fetch"` for `fetch(url:)`) is a reading check, not run. Watched red (measured 2026-10-10): bare grep hit versus empty, the deprecated step passes the digester, `unavailable` exits 1 `func Client.get(_:) has been removed`. | SHOULD |
| SW-API-11 | A minor release only adds API: no removed or renamed declaration, no new case on a plain public enum, no plain `@nonexhaustive` added to a shipped enum (only the `(warn)` staging form, allowlist line (b)). Stage a shipped plain enum with `@nonexhaustive(warn)` in a minor and add cases in the next major. This row owns what the allowlist may contain, SW-GATE-20 owns the wiring (full history and tags fetched). Binds library and SDK with tagged releases. Floor: Swift 6.2.3. | The digester is the only tool that turns the enum, retrofit and removal rules into an exit code. | `swift package diagnose-api-breaking-changes "$BASELINE"` exits 1 on a break: `enumelement Status.timedOut has been added as a new enum case` for a plain enum plus a case, `enum Status is now with @nonexhaustive` for the plain-to-`@nonexhaustive` change, `func Client.get(_:) has been removed` for a removal. A struct plus a static exits 0. Exactly two allowlist lines are legitimate, each a reviewed policy change (SW-GATE-12), passed with `--breakage-allowlist-path api-allow.txt`. (a) A tool gap: a case added to an already `@nonexhaustive` enum is still reported on 6.3.3 and 6.4.0 although SE-0487 says the digester understands the attribute. Re-run the plant on every toolchain bump and delete the line when it goes green. (b) The one-time staging line `API breakage: enum Status is now with @nonexhaustive` for the `(warn)` minor. The `(warn)` retrofit is source-compatible: the consumer's exhaustive switch builds with `warning: switch covers known cases, but 'Status' may have additional unknown values`, and a later added case is `error: switch must be exhaustive`. Watched red on 6.4.0 and 6.3.3 (measured 2026-10-10). | MUST |

Wrong, then right:

```swift
// wrong: the next case is a build error in every external consumer
public enum Status { case ready, failed }

// right: floor-safe on Swift 6.2.0 to 6.2.2, the attribute applies from 6.2.3
#if hasAttribute(nonexhaustive)
    @nonexhaustive
#endif
public enum Status { case ready, failed }
```

The `pubenum` scan (SW-API-05). Save it as `pubenum.pl` and run it from the package root. Watched red and green
(measured 2026-10-10).

```sh
# gate: the files this change adds or modifies (file granularity: a touched legacy file prints its legacy enums). Set BASE to the merge target.
# An unresolved BASE printed `fatal: bad revision` and exited 0 with no enum line, a silent pass, so the guard exits 66 first (measured 2026-10-10).
set -o pipefail; git rev-parse --verify -q "${BASE}^{commit}" > /dev/null || { echo "pubenum: BASE does not resolve: $BASE" >&2; exit 66; }
git add -N . && git diff --name-only -z --diff-filter=AM --merge-base "$BASE" -- 'Sources/*.swift' ':(exclude,glob)**/Fixtures/**' ':(exclude,glob)**/*TestUtils/**' | xargs -r -0 perl pubenum.pl
# census, never a gate on a mature library: every public enum in the tree
find -L Sources -name '*.swift' -not -path '*/Fixtures/*' -not -path '*/*TestUtils/*' -print0 | xargs -r -0 perl pubenum.pl
```

On a mature library only the first form gates, because the census prints every existing enum (SwiftTerm 52, Kingfisher 35,
RxSwift 16, measured 2026-10-10). The gate form printed the one unmarked `public enum` of a planted new file and was empty on its `@frozen` twin and on a
change that touches no enum (measured 2026-10-10). The census is NUL-delimited and skips `Fixtures` and `*TestUtils`
directories: swift-markdown (`Block Nodes/` has a space) printed 10 enums without `-print0` and 13 with it, SwiftGen 220
with golden fixtures and 33 without (measured 2026-10-10).

```perl
#!/usr/bin/perl
# Prints each public enum NOT carrying @nonexhaustive or @frozen (same line, or on attribute-only / #if / #endif lines directly above).
use strict; use warnings;
for my $f (@ARGV) {
  open my $h, '<', $f or next; my ($n, $attrs) = (0, '');
  while (my $l = <$h>) { $n++;
    if ($l =~ /^\s*((?:@[\w.]+(?:\([^)]*\))?\s+)*)public\s+(?:indirect\s+)?enum\s+(\w+)/) {
      my ($same, $name) = ($1, $2); my $all = $attrs . $same;
      print "$f:$n: public enum $name lacks \@nonexhaustive or \@frozen\n" unless $all =~ /\@(?:nonexhaustive|frozen)\b/;
      $attrs = ''; next; }
    if ($l =~ /^\s*(@[\w.]+(?:\([^)]*\))?)\s*$/) { $attrs .= " $1"; }
    elsif ($l =~ /^\s*#(?:if|elseif|else|endif)\b/) { }
    elsif ($l !~ /^\s*(\/\/|$)/) { $attrs = ''; }
  } }
```

## Library Logging

Gate: the greps in the table, run over each library target directory (`Sources/Lib` is the example, rename it, and
the executable target's directory is never an operand). Empty output = pass. The executable side is SW-CLI-15.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-API-07 | A non-executable target never bootstraps swift-log and never builds its own logger. A public API that logs takes `logger: Logger` or, at swift-log 1.14.0 or later, defaults that parameter to `Logger.current`. `logger ?? Logger(label: "...")` is banned. Binds library and any non-executable target, and the SDK only once it logs. | `LoggingSystem.bootstrap` is once per process: `Logging/LoggingSystem.swift:165: Precondition failed: logging system can only be initialized once per process.` exits 132 on Linux x86_64 under the default backtracer (main-thread trap, no `SWIFT_BACKTRACE` set), also with `-c release`. A self-made `Logger(label:)` discards the caller's handler, level and metadata, and the swift-log best-practice page lists a library constructing its own `Logger(label:)` under "Avoid", which the `??` fallback is a case of. | `grep -Rn -e 'LoggingSystem\.bootstrap' --include='*.swift' Sources/Lib` and `grep -Rn -e 'Logger(label:' --include='*.swift' Sources/Lib`. Watched red (measured 2026-10-10): a library that bootstraps exits 132 on 6.4.0 and 6.3.3 with both greps printing a line, the twin that takes `logger:` exits 0 printing `CUSTOM: working [:]` with both greps empty. | MUST |
| SW-API-08 | Library tests never call `LoggingSystem.bootstrap`. They build `Logger(label:factory:)` over `InMemoryLogHandler` (product `InMemoryLogging`) and assert on `entries`. Binds library, SDK and test code. Floor: swift-log 1.16.1. | Two tests that each bootstrap crash the test process: `Precondition failed: ...`, `Process '...' exited with unexpected signal code 4`, `swift test` exits 1. | `grep -Rn -e 'LoggingSystem\.bootstrap' --include='*.swift' Tests` and `swift test` (exit 1 on a crash). Watched red: 2 lines and exit 1 versus empty and exit 0, on 6.4.0 and 6.3.3 (measured 2026-10-10). | MUST |
| SW-API-27 | In an executable or server, re-bind the logger explicitly where task-locals do not propagate. `Logger.current` and `withLogger` are task-local: inside `withLogger(bound)` a child `Task {}` sees the bound logger and its metadata, while `Task.detached` and every non-task boundary (GCD, completion handlers, delegates, C callbacks) see the process-wide fallback without request metadata, so call `withLogger(captured)` there. Bootstrap before the first read of `Logger.current` is SW-CLI-15. Binds executable and server. Floor: swift-log 1.14.0. | The unbound default is captured at first access, so a `bootstrap` that comes after a read is invisible to it. Output stays on the default stream handler (`info: [Lib] working`), exit 0, silent misrouting. | A smoke run that logs through `Logger.current` and asserts the custom handler's marker (`CUSTOM`) appears in the output. The red is the output, not the exit code. Detach points to inspect: `grep -Rn -e 'Task\.detached' --include='*.swift' Sources` (reading heuristic, every hit is a candidate). Watched red (measured 2026-10-10): the late bootstrap prints `info: [Lib] working` and no `CUSTOM`, the child task keeps `["req": 42]` metadata, the detached task loses it. Apple-only types: unverified: read only. | SHOULD |

Wrong, then right:

```swift
// wrong: discards the caller's handler, level and metadata
public func sync(logger: Logger? = nil) {
    let log = logger ?? Logger(label: "mylib")
}

// right: swift-log 1.14.0 or later
public func sync(logger: Logger = .current) {}
```

## Protocols

Gate: the `proto1` scan below, then a read of each hit. Output = candidate. It sees one-line type headers only, and a
macro-generated double is invisible, which is intended.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-API-26 | Delete a speculative protocol. A protocol is speculative when it is not `public` or `open`, exactly one type conforms across `Sources/` and `Tests/` (extensions count), no hand-written test double conforms (a generated mock does not count), and no second conformer is named in the same change. Replace it with the concrete type, a stored closure (`var send: @Sendable (String) async throws -> Void`) or a struct of closures. Add the protocol when the second real conformer or the first hand-written spy exists. Judge a `public` protocol by whether its doc comment names who conforms. Binds library, SDK, CLI and server. An app that depends on a mock generator keeps the exception it states. | 39% of 1,752 corpus protocols (690) have one conformer, 427 are pure single-production-conformer and 238 of those are internal. Each is an `any` existential or generic parameter, a mock-generator dependency and a dead abstraction (the one-protocol-per-class DI habit in tuist and element-x-ios). | The `proto1` scan, then apply the four-point test by reading. Watched red (measured 2026-10-10): the planted `MailSending` with one conformer prints `protocol MailSending has one conformer (SMTPMailer)`, the twin with a hand-written `SpyMailer` in `Tests/` and a `public` protocol print nothing. The "named second conformer" judgement is a reading heuristic. | SHOULD |

The `proto1` scan. Save it as `proto1.pl` and run it from the package root.

```sh
find -L Sources Tests -name '*.swift' -print0 | xargs -r -0 perl proto1.pl
```

```perl
#!/usr/bin/perl
# Prints each NON-public protocol (internal, package, private, fileprivate, default) with exactly ONE conformer across all files given.
use strict; use warnings;
my (%decl, %conf);
for my $f (@ARGV) {
  open my $h, '<', $f or next; my $n = 0;
  while (my $l = <$h>) { $n++;
    if ($l =~ /^\s*(?:(?:package|internal|private|fileprivate)\s+)?protocol\s+(\w+)/) { $decl{$1} = "$f:$n"; }
    if ($l =~ /^\s*(?:@\w+(?:\([^)]*\))?\s+)*(?:(?:public|package|internal|private|fileprivate|final)\s+)*(?:struct|class|actor|enum|extension)\s+([\w.]+)\s*(?:<[^>]*>)?\s*:\s*([^{]*)/) {
      my ($ty, $inh) = ($1, $2); $inh =~ s/\bwhere\b.*//;
      $conf{$_}{$ty} = 1 for ($inh =~ /(\w+)/g);
    } } }
for my $p (sort keys %decl) { my @c = sort keys %{ $conf{$p} || {} };
  print "$decl{$p}: protocol $p has one conformer ($c[0])\n" if @c == 1; }
```

## SDK Shape: Greps and Manifest

Gate: the greps in the table, run from the SDK package root with the spawn target's directory renamed to yours
(`OcxSpawn` is the example). Output = violation unless the cell says otherwise. These rows bind the SDK.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-API-09 | The SDK has exactly one public library target and one non-product spawn target, and only the spawn target imports `Subprocess`. Cross-target API is `package`, never `public`. No `SubprocessError`, `TerminationStatus`, `Execution` or `PlatformOptions` appears in a `public` or `package` signature outside the spawn target (a seam initializer that mentions `ProcessRunner` is `package import OcxSpawn`, SW-API-01). Floor: swift-subprocess 1.0.1, tools 6.2. | One place owns limits, grace, environment and exit mapping (SW-IO-26). SwiftPM does not enforce the single importer: `import Subprocess` added to the public target built and passed on 6.4 and 6.3 with both import flags on, so the grep is the enforcement. | `grep -Rl --include='*.swift' --exclude-dir=OcxSpawn -e 'import Subprocess' -e 'import SystemPackage' Sources` and `grep -Rn --include='*.swift' --exclude-dir=OcxSpawn -e 'public .*SubprocessError' -e 'package .*SubprocessError' -e 'public .*TerminationStatus' -e 'package .*TerminationStatus' -e 'public .*Execution' -e 'package .*PlatformOptions' Sources`. Watched red (measured 2026-10-10): the first prints the offending file on the planted tree and nothing on the twin and the package, the second prints 2 lines on the plant. | MUST |
| SW-API-10 | The SDK `Sources/` pass the tell grep: no `exit(`, `fatalError(`, `preconditionFailure(`, `Process()` or `Foundation.Process`, and no `@unchecked Sendable`, `nonisolated(unsafe)` or `Task.detached`. | A library reports failure by throwing (SW-CLI-03, SW-ERR-15). The spawn goes through Subprocess (SW-IO-05). The escape hatches belong to SW-CONC-01 and SW-CONC-09 and an SDK has no reason for them. This row is the aggregate gate for the SDK kind and the owners keep their own severities. | `bash "$CHECKS/k07.sh" e01 e02 e03 e11 e16` (the K-07 tells `@unchecked Sendable`, `nonisolated(unsafe)`, `Task.detached`, `Process()` and `exit(`) plus `grep -Rn --include='*.swift' -e 'fatalError(' -e 'preconditionFailure(' Sources`. Watched red: each prints the planted lines, the twin and the package print nothing (measured 2026-10-10). | MUST |
| SW-API-12 | The SDK's direct dependencies are exactly `swift-subprocess`, floor `from: "1.0.1"`. `swift-system` arrives transitively, only `Synchronization` and `FoundationEssentials` come from the toolchain, and no unguarded `import Foundation` appears in `Sources/` (SW-IO-04). The `traits:` argument is `SW-IO-06`'s. Floor: tools 6.2. | The dependency budget keeps the SDK a one-dependency install. 1.0.0 leaks one descriptor per early-break `.sequence` (SW-IO-06). | The dependency budget block below. The jq exits 1 on a violation and strips a `.git` suffix from the URL, the floor `from: "1.0.1"` is read in the manifest (SW-IO-06 owns that grep). The grep prints each file that imports Foundation without a `canImport(FoundationEssentials)` guard (output = violation, and `xargs` exits 123 when `grep -L` lists a file). Watched red (measured 2026-10-10): the package prints `true` and exits 0, a plant adding swift-log prints `false` and exits 1. | MUST |
| SW-API-17 | The SDK's one public error is the SW-ERR-20 struct, `Code` is a function of the exit status alone, and cancellation is `CancellationError`. `struct OcxError: Error, Sendable` has an open `Code`, `exitStatus`, `signal`, `stderr`, `envelope` and `cause`. No `public enum ...: Error` and no `@nonexhaustive` enum exception. The internal `ProcessFailure` enum stays `package`. The stdout failure envelope is attached with `try?` as optional data and never classifies the error, and no code path that builds an error may throw. Floor: Swift 6.0. | A status a newer CLI adds becomes a new `Code`, never a source break (ocx's own `ExitCode` is `#[non_exhaustive]`). Real ocx 0.6.5 labels exit 81 (`policyBlocked`) with `kind: "permission_denied"`, so the envelope is for people. SE-0413 keeps untyped `throws` the public default (SW-ERR-08). Other libraries follow SW-ERR-20 and SW-API-05, the SDK is stricter. | `grep -RnE --include='*.swift' -e 'public enum [A-Za-z0-9_]+(<[^>]*>)?:[^{]*\b(Localized)?Error\b' Sources` (wider than SW-ERR-20's N1, which passes an attributed enum), plus a test that exit 81 gives `.policyBlocked` while `envelope.kind == "permission_denied"`, and one that a non-JSON stdout still yields an `OcxError`. Watched red (measured 2026-10-10): the grep prints the planted enum and nothing on the twin, and changing the `try?` to `try` turns every non-JSON failure into a thrown `DecodingError` (suite exits 1 on 6.4.0 and 6.3.3). | MUST |
| SW-API-20 | Capture is bounded by one symmetric `captureLimit`, default 4 MiB per stream, configurable. stdout is `.bytes(limit:)`, stderr is `.string(limit:)`, and overflow is `outputTooLarge(limit:)`. Never `Int.max`, and never a per-stream default below the largest observed stderr. Floor: swift-subprocess 1.0.1. | Against real ocx 0.6.5 stdout is at most 4,040 bytes (recorded fixtures 7,145) but a traced `package pull` writes 1,372,005 bytes to stderr, so a 256 KiB stderr default turns `--log-level trace` into `outputTooLarge`. `SubprocessError`'s context is private, so two different limits could not say which stream tripped. Subprocess 1.0 made every limit explicit on purpose (SF-0037). | `grep -Rn --include='*.swift' -e 'limit: Int.max' -e 'limit: .max' Sources`, plus tests that a trace-sized stderr fits the default and that 1,000 bytes against a 500-byte limit gives `outputTooLarge`. Watched red (measured 2026-10-10): the grep prints the planted line, a 256 KiB default and an `Int.max` default each fail the suite (exit 1) on 6.4.0 and 6.3.3. | MUST |

The dependency budget block (SW-API-12). Run from the SDK package root.

```sh
swift package dump-package | jq -e '[.dependencies[] | .sourceControl[0].location.remote[0].urlString | sub("\\.git$"; "")] == ["https://github.com/swiftlang/swift-subprocess"]'
grep -RlEZ --include='*.swift' --exclude-dir='Fixtures' --exclude-dir='*TestUtils' --exclude-dir='*.playground' -e '^((public|package|internal|@preconcurrency) )*import Foundation$' Sources | xargs -0 -r grep -L -e 'canImport(FoundationEssentials)' -e 'canImport(Darwin)'
```

## SDK Behaviour: Tests Against a Fake CLI

Gate: `swift test` in the SDK package on the 6.4.0 leg and the 6.2.0 floor leg. Exit 1 is the violation. Each
behaviour below was watched red (measured 2026-10-10) by mutating one line of the reference SDK, on 6.4.0 and 6.3.3
unless the cell says otherwise. The fake CLI is a script that runs out of process, so the timeout race, the
cancellation and the kill ladder meet real children.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-API-13 | SDK tests run a fake CLI out of process and gate line coverage of `Sources/` at 100 on the Linux leg. The fake is a script found through `Bundle.module` `.copy` resources (never `#filePath`), selected per test by an environment variable so the SDK's own argv stays untouched. Seams are stored values (`captureLimit`, `killGrace`, an injectable `sleep`) and pure `static` functions for branches no real child can reach, not a protocol. The public initializer is exercised end to end once. This is the SDK test shape. SW-TEST-20 to SW-TEST-22 (replay seam, excluded adapter) bind a CLI core and any SDK that keeps a replacing runner. Regions are reported, not gated, for this shape. Floor: Swift Testing. | The timeout race, cancellation and kill ladder (SW-API-18, SW-API-19) fail only against real children, and an injected `run` closure cannot catch them. An earlier 282/283 miss was the public `init`'s default closure, which only the production entry point executes. | The `sw-test-16` block of `SW-TEST-16` with `MIN=100`, run from the SDK package root. Exit 1 or 123 = violation. Reading heuristic for the seam: `grep -Rn --include='*.swift' -e 'protocol [A-Za-z]*Runn' -e 'protocol [A-Za-z]*Spawn' Sources` (empty on a conforming SDK). Watched red: the reference SDK reaches 283/283 lines (gate exit 0) and 179/182 regions (a regions gate at 100 would exit 1, so it is not used), and deleting one test file drops it to 259/283 and exits 123. 38 tests in 3.3 s on both toolchains. | MUST |
| SW-API-14 | Resolve the binary once, at `init`, in a fixed order from an environment snapshot: explicit path, then `OCX_SDK_EXE`, then `PATH` entries that are absolute and whose parent directory is neither group- nor other-writable, then `$OCX_HOME` or `$HOME/.ocx` plus `/symlinks/ocx.sh/ocx/cli/current/content/bin/ocx`. The resolver takes `[String: String]`, never reads `ProcessInfo` itself, never shells out to `which`, and passes a resolved absolute path to `.path`, never `.name`. | A relative `PATH` entry is the working directory in disguise and a writable directory is a planted binary (CWE-426). It mirrors the trust rules in `ocx-sh/ocx-sdk-python@80136dde4162:src/ocx_sdk/_bootstrap.py:245-292`. | A test with a relative entry and a world-writable directory on `PATH` must resolve neither (neutralising the guard fails it: `an error was expected but none was thrown`). `grep -Rn --include='*.swift' -e '"which"' -e '/usr/bin/which' Sources` (output = violation, reading heuristic, not run). Windows `.exe` suffix and cwd exclusion: unverified: read only. | MUST |
| SW-API-15 | argv is `--format json --color never`, then global flags, command, positionals. A positional that starts with `-` throws `invalidArgument` before any spawn. | The CLI's grammar takes globals first, and a leading-dash positional is option injection (CWE-88). Environment overrides reach the child unchanged (SW-IO-24). | A test running the fake in `argv` mode and comparing every line, and a test that a `-x` positional throws and spawns nothing. Neutralising the guard exits 1 on both toolchains. | MUST |
| SW-API-16 | `.exited(n)` maps to `n` and `.signaled(s)` maps to `128 + s` with `s` kept in a `signal` field. A status of 128 or more, or negative, is `crashed`, and statuses 2-63 and 88-127 are `unknownStatus` (`SW-CLI-01` holds the exit-status table, SW-API-24 the wrapped CLI's own, and `unknownStatus` covers a value outside it). The mapping is one pure `static` function over `TerminationStatus`, with the `.signaled` arm under `#if !os(Windows)`. CLIs that forward a child's status reuse the function. Floor: swift-subprocess 1.0.1. Pinned default: `128 + s`. | A raw pass-through files a SIGTERM-killed child as status 15 and the error as `unknownStatus`. ocx never assigns 128 or more, a main-thread Swift trap exits 132 on Linux x86_64 under the default backtracer (`SW-CLI-01`), and a signal death is `128 + s`. | A test over every `TerminationStatus` case (`.signaled(15)` gives `(143, 15)`, `.signaled(9)` gives `(137, 9)`) and nine real children (exit 1, 64, 75, 79, 87, 99, 132, `sigterm` giving 143 with signal 15, `sigkill` giving 137 with signal 9). Reading heuristic: `grep -Rn --include='*.swift' -e 'case .signaled' Sources` lists exactly one site and it contains `128 +`. A raw pass-through fails 6 expectations. Windows has only `.exited(DWORD)`: a negative status after `Int32(truncatingIfNeeded:)` is `crashed`, and the Linux test proves the branch, not the platform (unverified: read only). | MUST |
| SW-API-18 | After the spawn returns, a cancelled caller gets `CancellationError`, never a result. `if Task.isCancelled { throw .cancelled }` follows the spawn and the SDK maps it to `CancellationError`. Teardown is Subprocess's job via SW-IO-23 (`createSession = true`, a `teardownSequence` with `toProcessGroup: true`, 5 s grace). Document on mutating calls (`install`, `pull`) that a cancelled call means "outcome unknown, re-query". Binds any wrapper of a child process. Floor: swift-subprocess 1.0.1. | swift-subprocess does not throw on cancel. It starts the teardown and `run` returns the dead child's `terminationStatus` (SW-IO-27), here `.signaled(15)` and status 143 under the SIGTERM-first sequence. A child that finished at the instant of cancellation is discarded too, the check cannot tell. SE-0504 `withTaskCancellationShield` is for cleanup bodies and does not change this. | A cancel test that expects `CancellationError`, and after `swift test` a `pgrep -af "sleep 300[01]"` in the same container exits 1 (no survivor). Deleting the check fails 3 expectations (`expected error of type CancellationError, but "crashed: ocx x exited 143" of type OcxError was thrown`), and removing the teardown leaves 97 `sleep` survivors (`pgrep` exits 0). | MUST |
| SW-API-19 | A timeout is a task-group race against an injectable timer, and `timedOut` wins over a later cancel. `timedOut` is thrown iff the timer completed before the child finished, only after the child's process group is dead, and a late timer cannot turn a finished child into a timeout. The checks run in this order: timer, then `Task.isCancelled`. Floor: Swift Testing, swift-subprocess 1.0.1. | The reversed order reports a timeout as a cancellation. | A test whose injected `sleep` waits for the child's pid file, flips a flag and returns, and which cancels the outer task only after reading the flag (a trapping child keeps teardown running): expect `.timedOut`. That is 100 races by construction. On 6.4 also `swift test --filter CancellationTests --repeat-until fail --maximum-repetitions 10` (the flag does not exist on 6.3.3). Swapping the two lines fails 100 of 100 races, green passes 1,000 of 1,000 on 6.4.0. | MUST |
| SW-API-21 | Decode tolerantly: `decode` for the fields the CLI always writes, `decodeIfPresent` for the rest, unknown keys ignored. A missing required key, a wrong type, non-JSON and empty stdout give a typed error naming the command and key. Tests decode recorded documents from at least two CLI releases. A strict unknown-key contract follows `SW-IO-28`. Floor: Swift 6.0. | The CLI adds fields between releases (ocx 0.6.5 `about` adds `features`), so a strict decoder rejects the recorded document. | `swift test` with the recorded 0.5.8 and 0.6.5 documents and an invented `"future":{"x":1}` key. Watched red: a required `channel` field and a strict `AnyKey` decoder (`SW-IO-28`'s recipe) each exit 1 on the recorded document on 6.4.0 and 6.3.3. | MUST |
| SW-API-22 | Probe `<cli> version` lazily, once per handle family, and cache only success. Refuse a version below the floor, accept a newer one, ignore a pre-release tail (`0.5.8-rc1` compares as `[0,5,8]`). The memo is a `Sendable` class holding `Mutex<Bool>` shared by every copy of the handle. Floor: Swift 6.0 (`Mutex`). | A pre-release tail must not fail `0.6.2-rc1` against a floor of `0.6.2`, and an eager probe turns a missing binary into a version error at construction. | Tests that two typed calls produce one probe line and two failing calls two more, and `swift test` parse cases. Reading heuristic: green only, no mutation was watched red. | SHOULD |
| SW-API-23 | A contract tier runs the real binary behind an environment gate: `.enabled(if: ProcessInfo.processInfo.environment["OCX_SDK_EXE"] != nil)`, a throwaway `OCX_HOME`, assertions on real failures (exit 64 for an unknown subcommand, 81 for `package which --offline` of an unknown package) and one real cancel. Floor: a pinned CLI version. | The fake proves the SDK and the real binary proves the fake. | `env OCX_SDK_EXE=/path/to/ocx swift test --filter RealOcxContractTests` (exit 1 = violation). Reading heuristic: green only (4 tests against ocx 0.6.5 on both toolchains), no mutation was watched red. | SHOULD |
| SW-API-24 | Copy the exit-status table from the wrapped CLI's source at a pinned commit, never from another SDK, and walk 0...255 in a test. Pinned default for ocx (rename for your CLI): 1 `failure`, 64 `usage`, 65 `dataError`, 69 `unavailable`, 74 `ioError`, 75 `tempFail` (the only retry-safe one), 77 `permissionDenied`, 78 `config`, 79 `notFound`, 80 `auth`, 81 `policyBlocked`, 82 `dirtyRcBlock`, 83 `transparencyLogUnavailable`, 84 `referrersUnsupported`, 85 `unsupportedKeyBackend`, 86 `forgeCapabilityUnavailable`, 87 `registryDeleteUnsupported`. | A table copied from the Python SDK stops at 86 (`ocx-sh/ocx-sdk-python@80136dde4162:src/ocx_sdk/_errors.py:28-51`) while `ocx-sh/ocx@5de9d777eb7d:crates/ocx_exit/src/exit_code.rs` assigns 87, so a status is silently lost. | Reading heuristic, because no mechanical check can know the CLI repository's current table: `grep -n -e '= 8[0-9],' -e '= 9[0-9],' crates/ocx_exit/src/exit_code.rs` in the CLI checkout against the SDK's cases (numbers match one to one). The 0...255 test walks an independently typed expectation and exit 87 runs through a real child (both green in the reference SDK, the diff against the CLI repository was never automated). | MUST |

Wrong, then right (SW-API-16):

```swift
// wrong: a SIGTERM-killed child becomes status 15 and unknownStatus
case .signaled(let signal): return (Int(signal), Int(signal))

// right: one pure function, signal kept
case .signaled(let signal): return (128 + Int(signal), Int(signal))
```

## What Agents Get Wrong Here

Ranked by how often the habit bites. Each has its check.

1. **`public enum FooError: Error { case a, b }`, or any new public enum with no attribute.** It compiles and breaks
   consumers on the next case. Check: SW-API-05 scan, SW-API-17 grep, SW-API-11 digester.
2. **Wrapping the CLI with `Foundation.Process`, `Pipe` and `waitUntilExit()`.** It deadlocks above 64 KiB. Check:
   SW-API-10 grep, the `stderr-bytes` fake-CLI test of SW-API-13.
3. **Passing `.signaled(n)` through as `n`, copying the exit table from another SDK, or treating a non-zero status
   as "the CLI said no" and parsing stderr.** Check: SW-API-16 test, SW-API-24 table diff, SW-API-17 envelope test.
4. **A protocol plus a mock for every service (`FooServicing`, `MockFoo`).** A pre-concurrency DI habit. Check:
   SW-API-26 scan, and the SDK has no protocol seam (SW-API-13).
5. **`LoggingSystem.bootstrap` in a library `init`, a `static let`, a test `init` or every `@Test`, a private
   `Logger(label:)`, or `logger ?? Logger(label:)`.** It exits 132 or misroutes silently. Check: SW-API-07 and
   SW-API-08 greps.
6. **Bare `import X` everywhere with `public func f(_: X.Type)`, then "fixing" the flag's error with
   `@_exported import` or `package import`.** Check: SW-API-01 build (`package import` stays red), SW-API-03 grep.
7. **`Task { try await run(...) }` or `Task.detached` to add a timeout, then `task.cancel()`, `try? await
   Task.sleep` as the timer, or the cancel check before the timer check.** `run` returns `.signaled` instead of
   throwing. Check: SW-API-18 and SW-API-19 tests, SW-API-10 grep.
8. **Guessing a capture limit (`Int.max`, "a big number") or keeping 256 KiB on stderr.** Check: SW-API-20 grep and
   the trace-size test.
9. **Adding `-enable-library-evolution` to every package, or `@frozen` on structs "for performance".** Check:
   SW-API-04 grep.
10. **Strict decoding through `container.allKeys`, every field non-optional, or `decodeIfPresent` on required
    fields.** Check: SW-API-21 recorded-document tests.
11. **Adding a case to a shipped enum "because the compiler will find the switches", adding `@nonexhaustive` to a
    shipped enum, deleting the old API in the same change, or a bare `@available(*, deprecated)`.** Check: SW-API-11
    digester, SW-API-06 grep.
12. **`import Subprocess` in the public target "because it is already a dependency", or `public init(runner:)`
    leaking the seam.** Check: SW-API-09 greps and the SW-API-01 build.
13. **Pasting `@nonexhaustive` into a tools-6.2 library with no guard, or an invented spelling.** It fails on 6.2.0
    to 6.2.2 and on 6.1. Check: `swiftc -typecheck` on the floor image (`unknown attribute`) and the SW-API-05 grep.
14. **`Task {}` in `main.swift` as the Sendable proof, or "fixing" a consumer error with `extension Config:
    @retroactive @unchecked Sendable` instead of stating it in the library.** Check: SW-API-02 consumer package.
    `grep -Rn -e '@retroactive' -e '@unchecked Sendable' --include='*.swift' Sources` finds the smell (each hit on a
    type the repo does not own is suspect, and `SW-CONC` owns the rule).
15. **Hallucinated or removed spellings**: Subprocess 0.x (`output: .string` with no limit, `.sendSignal`), `ocx
    --json`, `Subprocess.run(...).result`, `.name("./tool")`. Check: `swift build` against the pinned 1.0.1 and the
    SW-API-15 argv test.
16. **Copying swift-log's `-Xfrontend -require-explicit-sendable` (or the `-Xswiftc` form) believing it gates public
    Sendable statements.** Five corpus repos did. The frontend spelling only warns and the driver spelling does
    nothing, and none of 40 repos promotes the group to an error. Check: SW-GATE-17's ban grep and SW-API-02.
