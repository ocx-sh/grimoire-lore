---
# Read on demand through the index. This glob matches no file, so a client never auto-loads the file.
paths:
  - "**/.swift-quality-depth-on-demand"
title: Network and Registry Clients
summary: The SW-NET family, owning HTTP client choice on Linux, credentials on redirect, timeouts, proxy and TLS trust, the bearer-token exchange, streamed and verified blobs, client lifetime, retries and the rendering of network errors
---

# Network and Registry Clients

Binds to Swift 6.4.0 and 6.3.3 on Linux, AsyncHTTPClient (AHC) 1.36.2, swift-nio-ssl 2.30 and `registry:2` 2.8.3, measured 2026-10-10 unless a row says read. Darwin and Windows behaviour is `unverified: read only`.

Owns which HTTP client a Swift program uses and how it is built: redirects and credentials, timeouts, proxy and CA trust, the bearer-token exchange, manifest negotiation, streamed and digest-checked blobs, client lifetime, retries and the one renderer for network errors. It binds library, SDK, CLI, server and test code that builds on Linux. An Apple app keeps `URLSession` as its platform client. Not owned here: the staged-file publish and digest parser are `SW-IO-19`, `SW-IO-13` and `SW-IO-30` (`SW-IO`). The whole-transfer race is `SW-CONC-24` and the shielded cleanup await is `SW-CONC-32` (`SW-CONC`). The error type that wraps a network failure is `SW-ERR-20` (`SW-ERR`). Secret types, URL redaction, terminal sanitising and inbound limits are `SW-SEC-13`, `SW-SEC-14`, `SW-SEC-17` and `SW-SEC-03` (`SW-SEC`). The exit-status table is `SW-CLI-01` (`SW-CLI`). Fixture ports are `SW-TEST-19` (`SW-TEST`). **SDK** means the pinned default shape, a library that wraps a CLI and does no HTTP of its own (`SW-API-14`), so this family binds it only if it adds a bootstrap downloader. Pinned default, the adopter may override: the SDK has no downloader. If one is added it uses AHC in an optional target and owes `SW-NET-03`, `SW-NET-05`, `SW-NET-06`, `SW-NET-07`, `SW-NET-12` and `SW-NET-14`, with https-only redirects capped at 5.

Contents: [Floors and Pinned Defaults](#floors-and-pinned-defaults) · [Compiler and Runtime Traps](#compiler-and-runtime-traps) · [Grep Gate](#grep-gate) · [Behavioural Tests](#behavioural-tests-against-a-fixture-server) · [Reading Heuristics](#reading-heuristics) · [Not Covered](#not-covered) · [What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Floors and Pinned Defaults

- Floors: AHC 1.36.2 for every AHC row (`withHTTPClient`, `Proxy.server(host:port:authorization:)`), swift-nio-ssl 2.30 for `additionalTrustRoots`, Swift 6.2 for `processExitsWith`. `URLSession.bytes` is absent on Swift 6.3 and 6.4 Linux. `withDeadline` (SE-0526) is not in 6.4, so `SW-CONC-24` is the answer until it ships.
- Pinned defaults, the adopter may override each. Timeouts are 30 s connect and 120 s idle read, and a manifest, tag or token client may tighten read to 30 s. The retry ladder is 3 attempts, 250 ms base, 3 s cap, full jitter, `Retry-After` clamped at 30 s. Whole-transfer budgets are 60 s for a manifest, tag list or token and `max(60 s, size / 1 MiB/s)` for a blob. Proxy variables are read upper case first. These are the numbers of the `ocx` CLI, so a Swift CLI in its mould behaves like it on the same host. Rename them for another tool.
- AHC's README says a custom `Configuration` must opt in to redirects. That sentence is stale: the default `Configuration()` follows, and a 302 became 200 (measured 2026-10-10, AHC 1.36.2). Always set `redirectConfiguration`.

## Compiler and Runtime Traps

```sh
swift build
swift test
```

Run both on the Linux image, because the Mac build is green where the Linux build fails. The lifetime trap fires only in a debug build. A leaked client exits 132 in debug and 0 in release, measured with `SWIFT_BACKTRACE=enable=no` as a per-command prefix (the `SW-CORE-18` carve-out for a test that asserts a trap). Under the default backtracer a trap on a non-main thread can exit 0 with `Program crashed:` on stderr (`SW-CORE-16`).

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-NET-01 | Never call `URLSession.bytes(for:)` or `bytes(from:)` or name `AsyncBytes` in code that compiles on Linux. Stream with AHC's `for try await buffer in response.body`, or with `URLSession.download(for:)` to a file. Keep any Apple-only fast path behind `#if canImport(Darwin)`. An Apple-only app target is exempt. | FoundationNetworking has no such member, so the code builds on the author's Mac and fails only in the Linux job. | `swift build` on the Linux image fails with `error: value of type 'URLSession' has no member 'bytes'` (exit 1). Static pre-check G1b in the grep gate (empty output = pass). Watched red (measured 2026-10-10, Swift 6.4 and 6.3), and the `download(for:)` twin exits 0. | MUST |
| SW-NET-02 | Shut down every `HTTPClient` you construct, with `await`, on every path. Scoped use goes through `HTTPClient.withHTTPClient(configuration:)`. A long-lived owner exposes `func close() async throws` that awaits `shutdown()` on every client it created (the data client and the token client). The entry point awaits `close()` on success and on error. On the cancellation path the same await runs in a shielded `defer` (`SW-CONC-32`), because a plain `await` on a cancelled path aborts. `deinit { _ = client.shutdown() }` is a backstop only. Never `syncShutdown()` in async code, never `shutdown()` on `HTTPClient.shared`, never `defer { Task { try? await client.shutdown() } }`. | A client released un-shut-down hits `preconditionFailure` in debug (`HTTPClient.swift:211`) and leaks silently in release. Shutdown with a request in flight fails it with `HTTPClientError.cancelled`. An un-awaited task may not run before the process exits. | A debug test that builds and drops each owner, asserted as an exit test (`SW-TEST-11`): the leak prints `Fatal error: Client not shut down before the deinit` and exits 132 under the prefix above, while a release build exits 0, so a release run proves nothing. G3, G3b and G3c in the grep gate (empty output = pass). `swift build` rejects `syncShutdown()` in async code with `instance method 'syncShutdown' is unavailable from asynchronous contexts`. Watched red (measured 2026-10-10): the leak in debug, `explicit`, `withHTTPClient` and the fire-and-forget `deinit` exit 0, and G3b red on both shapes with the awaited twin green. | MUST |

```swift
// wrong: head-only default configuration, shutdown may never run
let client = HTTPClient(eventLoopGroupProvider: .singleton)
defer { Task { try? await client.shutdown() } }

// right: scoped lifetime, one explicit configuration
try await HTTPClient.withHTTPClient(configuration: makeRegistryConfiguration(environment: environment)) { client in
    try await fetchManifest(with: client)
}
```

## Grep Gate

Run from the package root. Each command prints its violations and empty output is the pass. Source trees may be symlinks (RxSwift's `Sources/` is a symlink farm of 412 files): every scan here uses `grep -R` and `find -L`, because `grep -r` skips symlinked files and `find` without `-L` skips a symlinked directory, so the scan and the `SW-CORE-03` canary must count the same files (measured 2026-10-10: `find` 412 files, `grep -r` 1, `grep -R` 412). G1, G3, G4b, G5, G8 and G11 are file-level, so one mention anywhere in a file satisfies them. That is why G3b and G9c exist and why each rule keeps a behavioural half. G9c misses a constructor split over several lines and G13 misses a `try?` on a continuation line. In a pipeline ending in `grep -L`, `xargs` exits 123 when a batch lists files and none matched, and 0 for a mixed batch, so read the output and never the status: a listed file is the violation. All of them are greps over a `Sources` operand. In an adopted tree run them on changed files, where a hit on trusted local code needs a reasoned exemption. In a NIO-based codebase the AHC-named greps (G3c, G4a, G4b) also match NIO's own types, so read each hit. Watched red on a planted tree and green on its twin (measured 2026-10-10).

```sh
# G1  (SW-NET-03) URLSession file naming a credential with no session-level redirect delegate
grep -RlZ --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'URLSession' Sources | xargs -0 -r grep -lZ -e 'Authorization' -e 'authorization' | xargs -0 -r grep -L -e 'willPerformHTTPRedirection'
# G1b (SW-NET-01) URLSession streaming API absent on Linux (swift build is authoritative)
grep -RnE --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e '\.bytes\((for|from):' -e 'AsyncBytes' Sources
# G2  (SW-NET-03) per-task delegate, never called for a redirect on Linux
grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'data(for:.*delegate:' -e 'upload(for:.*delegate:' -e 'download(for:.*delegate:' Sources
# G3  (SW-NET-02) a client constructed in a file that never says shutdown or withHTTPClient
grep -RlZ --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'HTTPClient(' Sources | xargs -0 -r grep -L -e 'shutdown' -e 'withHTTPClient'
# G3b (SW-NET-02) fire-and-forget shutdown, single or multi line
grep -RPzo --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'Task\s*\{[^}]*\.shutdown\(' Sources
# G3c (SW-NET-02) review list: never in async code, a blocking backstop in deinit
grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e '\.syncShutdown()' Sources
# G4a (SW-NET-05) no wall-clock bound at all
grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'distantFuture' Sources
# G4b (SW-NET-04) a file building a client or configuration with no read timeout
grep -RlZ --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'HTTPClient.Configuration(' -e 'HTTPClient(' Sources | xargs -0 -r grep -L -e 'read:' -e 'timeout.read'
# G4c (SW-NET-05) a no-op on Linux
grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'timeoutIntervalForResource' Sources
# G5  (SW-NET-10) a realm handled with a client that may follow redirects
grep -RlZ --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'realm' Sources | xargs -0 -r grep -L -e 'disallow'
# G6b (SW-NET-07) unbounded or oversized collect
grep -RnE --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'collect\(upTo: *(Int\.max|\.max)' -e 'collect\(upTo: *[0-9]+ *<< *(2[89]|[3-9][0-9])' -e 'collect\(upTo: *[0-9_]{10,}' Sources
# G7  (SW-NET-08) TLS verification off
grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'certificateVerification = .none' -e 'INSECURE_SSL_NO_VERIFY' Sources
# G8  (SW-NET-06) shared singleton in a file that handles digests
grep -RlZ --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'HTTPClient.shared' Sources | xargs -0 -r grep -l -e 'SHA256' -e 'digest'
# G9c (SW-NET-04, SW-NET-09) a client built with the default or an inline-empty configuration
grep -RnE --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'HTTPClient\(eventLoopGroupProvider: *\.[A-Za-z]+\)' -e 'withHTTPClient *(\(\))? *\{' -e 'HTTPClient\(.*configuration: *(\.init\(\)|HTTPClient\.Configuration\(\))' Sources
# G10 (SW-NET-14) secondary list: localizedDescription in a file that talks to the network
grep -RlZ --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'AsyncHTTPClient' -e 'FoundationNetworking' Sources | xargs -0 -r grep -n -e 'localizedDescription'
# G11 (SW-NET-06) automatic decompression in a file that handles digests
grep -RlZ --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'decompression: .enabled' -e 'decompression = .enabled' Sources | xargs -0 -r grep -l -e 'digest' -e 'SHA256'
# G13 (SW-NET-13) a network call under try?
grep -RnE --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'try\? +await .*(\.execute\(|\.data\(for:|\.data\(from:|\.download\(|\.upload\()' Sources
```

Peak memory for SW-NET-07 is a second gate. Rename `.build/release/fetcher` to the fixture binary that downloads a 1 GiB blob from a loopback server. The pipeline exits 1 above 262144 KiB, on a non-zero exit of the fetcher and when no `Maximum resident` line appears, and exits 124 when the fetcher outlives its 300 s `timeout` (a stalled transfer, itself a finding of `SW-NET-05`; watched 2026-10-10 with stand-in programs: 0 clean, 1 over the cap or failing, 124 hung). It needs GNU time (apt `time`), which the `swift` image lacks.

```sh
/usr/bin/time -v timeout 300 .build/release/fetcher 2>&1 | awk '/Maximum resident/ { seen = 1; if ($6 > 262144) bad = 1 } /Exit status:/ { if ($3 == 124) hung = 1; else if ($3 != 0) bad = 1 } END { if (hung) exit 124; exit (bad || !seen) }'
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-NET-03 | A redirect target never receives a credential. Send every request that carries `Authorization`, a cookie or a token through AHC and set `redirectConfiguration` explicitly. If `URLSession` is unavoidable, install a session-level `URLSessionTaskDelegate.willPerformHTTPRedirection` that drops `Authorization` (case-insensitive) unless scheme, host and port all match. The `delegate:` argument of `data(for:delegate:)`, `upload` and `download`, `httpAdditionalHeaders` and "set the header on the first request only" are not fixes. | On Linux `URLSession` re-sends the header to another host and to another port, and the per-task delegate is never called for a redirect (`HTTPURLProtocol.swift:453-501`). A presigned CDN hop answers 400 when it sees `Authorization`, and the OCI distribution spec says clients must not forward it across host boundaries. | G1 and G2 in the grep gate (empty output = pass). Test: a loopback server answers 302 to a second host and to a second port, an echo endpoint logs the request headers, and `grep -c -e 'Bearer SECRET' echo.log` must print 0. Watched red (measured 2026-10-10, Swift 6.4 and 6.3): the plain, per-task-delegate, `httpAdditionalHeaders` and different-port clients leak, the session-level delegate and AHC do not. | MUST |
| SW-NET-04 | Build every `HTTPClient` from one factory that returns an explicit `HTTPClient.Configuration` with `timeout: .init(connect:, read:)` from named constants (the pinned 30 s and 120 s), an explicit `redirectConfiguration`, the proxy (`SW-NET-09`) and TLS (`SW-NET-08`). Never `HTTPClient(eventLoopGroupProvider:)` alone, `withHTTPClient { }` without `configuration:`, or `configuration: .init()`. | AHC's default has a 10 s connect timeout and no read timeout, so a server that stalls mid-body held the client for the fixture's full 20 s. `Timeout.read` is an idle gap that resets on every byte, so it is not a total bound (`SW-NET-05`). | G9c and G4b (empty output = pass). Test: a server sends the head and 1 KiB then goes silent, and the client must throw within the read timeout plus 2 s of slack. Watched red (measured 2026-10-10, AHC 1.36.2): the default configuration hung to the guard, `read: 1 s` gave up after 1.00 s. G4b checks only an explicit read timeout, so the connect timeout and the numbers are the pinned defaults. | MUST |
| SW-NET-05 | Bound whole-transfer time with the `SW-CONC-24` structured race around request plus body. Never pass `deadline: .distantFuture`. Treat `execute(_:timeout:)` and `deadline:` as a bound on the response head only. Never rely on `URLSessionConfiguration.timeoutIntervalForResource` for a total cap on Linux, set `timeoutIntervalForRequest` (the idle bound) and the race instead. | AHC cancels its deadline task when the head arrives (`HTTPClient+execute.swift:173-177`), so a 3 s deadline did not stop a body trickling for 7.5 s. `timeoutIntervalForResource` is consumed nowhere in FoundationNetworking, so the effective cap is the 7-day default. | G4a and G4c (empty output = pass). Test: a trickling body under a 1 s `deadline:` and under `timeoutIntervalForResource = 1` runs past the guard, while `timeoutIntervalForRequest = 1` and the race stop at once. Watched red (measured 2026-10-10, Swift 6.4 and 6.3). | MUST |
| SW-NET-06 | A request whose bytes are compared with a registry digest (blobs, manifests) uses an own AHC client with `decompression` left `.disabled`. `HTTPClient.shared` and `URLSession` serve only small unauthenticated requests whose bytes are never hashed. Never call `shutdown()` on the shared client. A client that does decompress sets the finite limit of `SW-SEC-23`. | `HTTPClient.shared` is browser-like (decompression `.enabled(limit: .ratio(25))`, 90 s connect and read, 20 redirects) and `URLSession` always decodes, so a CDN that adds `Content-Encoding: gzip` to an already-gzipped layer returns decoded bytes and the digest never matches. | G8 and G11 (empty output = pass). Test: a loopback server serves a gzipped layer with `Content-Encoding: gzip` and the received bytes must hash to the served digest. Watched red (measured 2026-10-10, AHC 1.36.2): `shared`, `.enabled` and `URLSession` return decoded bytes, the default client returns wire bytes. Decoding on purpose for non-hashed traffic is correct and carries a comment. | MUST for digest-checked bytes |
| SW-NET-07 | Stream anything not known to be small. `collect(upTo:)` takes a named bound (manifest and index at most 4 MiB, token, tag list and error body at most 1 MiB, the registry-body limits `SW-SEC-03` applies) and never `.max`, `Int.max`, a shift of 28 or more or a literal of ten digits or more. Layers and configs above 1 MiB flow through `for try await` (or `FileDownloadDelegate`) into a staged file and are hashed as they pass. Never use `URLSession.data(from:)` or `data(for:)` for a blob. | Peak RSS for a 1 GiB blob was 1058 MiB through `collect` plus `Data`, 2095 MiB through `URLSession.data` and 35 MiB through the AHC loop. The compiler demands the `upTo:` argument and `.max` defeats it. | G6b (empty output = pass) and the peak-memory gate above (exit 1 = fail). Watched red (measured 2026-10-10, AHC 1.36.2): `collect` and `URLSession.data` fail, the stream loop, the delegate and `download(for:)` pass (35 to 40 MiB), and G6b prints all 4 planted shapes. | MUST |
| SW-NET-08 | Keep TLS verification on. Never `certificateVerification = .none` and never `INSECURE_SSL_NO_VERIFY`. Trust a private CA through `TLSConfiguration.additionalTrustRoots = [.file(path)]` on AHC (a system-store install on `URLSession`). Neither client reads `SSL_CERT_FILE`, so a CLI that documents the variable reads it itself and feeds the path to `additionalTrustRoots`. | A self-signed registry failed the handshake on both clients, and `SSL_CERT_FILE` and `CURL_CA_BUNDLE` changed nothing. `URLSessionCertificateAuthorityInfoFile` is read only under `#if os(Android)` (`EasyHandle.swift:205-221`). | G7 (empty output = pass). Test: a self-signed loopback server, and the client's output must show the handshake failure rather than the echo body. Watched red (measured 2026-10-10): both clients, with and without `SSL_CERT_FILE`, fail, `additionalTrustRoots` succeeds. Additive trust is the measured route. A tool whose variable replaces host-store discovery and keeps bundled roots cannot copy that without bundling roots, so document the difference. | MUST |
| SW-NET-09 | The factory sets `Configuration.proxy = .server(host:port:)` from the environment. `HTTPS_PROXY` serves https, `HTTP_PROXY` serves http and `ALL_PROXY` is the fallback, each read upper case first and lower case second, once at start. `NO_PROXY` bypasses on an exact host, a leading-dot suffix, a CIDR block or `*`. | AHC 1.36.2 contains no environment lookup for proxies, and `URLSession` on Linux (libcurl) honours lowercase `http_proxy` only. Both connect direct without a word when an agent assumes otherwise. | G9c guarantees an explicit configuration, and a reading step confirms the factory assigns `.proxy` (a grep for `HTTPS_PROXY` passes on a comment, so it is not a check). Test: a loopback listener logs connections, `HTTPS_PROXY` points at it, and `test -s proxy.log` exits 1 on an empty log (the variable was ignored). With `NO_PROXY` naming the target the log must stay empty. Watched red (measured 2026-10-10): AHC plain and `URLSession` with upper-case `HTTP_PROXY` ignore it. Not planted: `ALL_PROXY`, CIDR and suffix matching, and https through `CONNECT` end to end. | MUST for a registry-talking CLI · SHOULD elsewhere |

```swift
// wrong: head-only bound, unbounded collect, default configuration
let client = HTTPClient(eventLoopGroupProvider: .singleton)
let response = try await client.execute(request, timeout: .seconds(30))
var body = try await response.body.collect(upTo: .max)

// right: one factory, explicit timeouts, redirects, proxy and CA
func makeRegistryConfiguration(environment: [String: String]) -> HTTPClient.Configuration {
    var configuration = HTTPClient.Configuration()
    configuration.timeout = .init(connect: .seconds(30), read: .seconds(120))
    configuration.redirectConfiguration = .follow(max: 5, allowCycles: false)
    // proxyEndpoint reads HTTPS_PROXY then https_proxy then ALL_PROXY and honours NO_PROXY.
    if let proxy = proxyEndpoint(for: "https", in: environment) {
        configuration.proxy = .server(host: proxy.host, port: proxy.port)
    }
    if let caFile = environment["SSL_CERT_FILE"] {
        var tls = TLSConfiguration.makeClientConfiguration()
        tls.additionalTrustRoots = [.file(caFile)]
        configuration.tlsConfiguration = tls
    }
    return configuration
}
```

## Behavioural Tests Against a Fixture Server

```sh
swift test
```

Each row needs a loopback server bound to port 0 (`SW-TEST-19`), and a green grep never stands in for the test. A violation in these rows compiles, passes the type checker and works against a friendly server.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-NET-10 | The bearer-token exchange uses a dedicated `HTTPClient` with `redirectConfiguration = .disallow`, so any 3xx is an error. It refuses to send credentials unless the challenge `realm` has the registry's own scheme, host and port and both endpoints are https (plain http only for a host the caller named as insecure). It does one token fetch and one retry per 401. Credential values are `Secret` (`SW-SEC-13`) and never logged. | A challenge naming `realm="http://127.0.0.1:8105/token"` made the naive client send the user's Basic credentials to that foreign host. A redirected token request moves a credential-bearing request off-origin. A separate client leaves the data client free to follow CDN redirects. | Test with two loopback listeners: a registry whose 401 names a realm on the second, then assert the second saw zero requests (`test -s evil.log` exits 1 = pass) and that a redirecting token endpoint is refused. G5 in the grep gate (empty output = pass). Watched red (measured 2026-10-10, AHC 1.36.2): the naive client sent `Authorization=Basic` to the foreign realm and the strict client refused. The https refusal itself was not planted. | MUST |
| SW-NET-11 | Every manifest or index request sets `Accept` to the full supported list: OCI image manifest, OCI image index, Docker v2 manifest and Docker manifest list. | `registry:2` 2.8.3 answers an OCI manifest requested with no `Accept`, or with Docker v2 only, with HTTP 404 and not 406, which an agent reads as "image not found". | Test against a `registry:2` instance: no `Accept` and Docker-v2-only each answer 404 (red), the full list answers 200. Reading step: `grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e '/manifests/' Sources` lists the sites and each must set the four types in the same function. Watched red (measured 2026-10-10, `registry:2` 2.8.3 only). Other registries are unmeasured. | MUST |
| SW-NET-12 | A blob arrives into a staged file and publishes by `SW-IO-19`, with the HTTP additions. Require status 200. Reject a declared `Content-Length` or a running total above the descriptor size before writing the overflowing chunk. Require `received == size`. Hash while writing. Unlink the staged file on every exit that does not publish. | A writer that opens `blobs/sha256:...` and compares afterwards left a file under the digest name after a mismatch and after a truncation. The staged recipe left nothing. | After each failing fetch (mismatch, truncated, oversize) `find blobs -type f` must print nothing, and the good blob publishes read-only (`find blobs -type f ! -perm 0444` prints nothing). Watched red (measured 2026-10-10): the naive writer left `blobs/sha256:0000...0001` behind, the staged writer passed all three failures and published mode 0444. | MUST |
| SW-NET-13 | Never wrap a network call in `try?`. Rethrow cancellation as `CancellationError`, mapping `URLError(.cancelled)` (code -999) at the module boundary. Never feed a cancellation into the retry loop. Remove staged files in `defer`. | Both clients surface a cancelled stalled body within 1.00 s (AHC `CancellationError`, `URLSession` `URLError(.cancelled)`), and a `try?` turns that into a silent `nil` or a hot retry loop (`SW-CONC-17`). | G13 in the grep gate (empty output = pass). Test: cancel a stalled request and assert it throws `CancellationError` within 1 s. G13 is the discriminating check because the cancel test is green-only: no swallowing client was planted. G13 watched red on 3 planted `try?` shapes with the `catch` twin green (measured 2026-10-10). | MUST |
| SW-NET-14 | Show a network failure through one `render(_:)` keyed on the error type and `URLError.code`, producing `host: reason`. Wrap it at the module boundary so the raw error is the `cause` of an `SW-ERR-20` error with `Code`s `.timeout`, `.dns`, `.tls`, `.connection` and `.cancelled`. Never use `localizedDescription` or `"\(error)"` for `URLError`, `HTTPClientError`, `NIOConnectionError`, `NIOSSLError` or `IOError`. `HTTPClientError` is a struct with static members, so compare with `==` patterns and not an enum `switch`. TLS failures arrive as `URLError` code -1 (`.unknown`), so switch on type, code and text together. Host names only through `SW-SEC-14`'s `redacted(_:)`, and wire text is sanitised at the stderr boundary (`SW-SEC-17`). | On Linux the timeout string is `The operation could not be completed. (NSURLErrorDomain error -1001.)`, every AHC and NIO error reads `(AsyncHTTPClient.HTTPClientError error 1.)`, and `"\(error)"` leaks a build path such as `.../CNIOBoringSSL/ssl/handshake.cc:288`. `SW-ERR-18`'s `Error Domain=` check alone is green on that unreadable line, which is why this rule widens the check. | Per failure class (timeout, DNS, untrusted TLS, TLS to a plain port, refused) capture stderr and run `grep -c -e 'NSURLErrorDomain' -e 'Error Domain=' -e 'error -[0-9]' -e 'OPENSSL_internal' -e 'NIOSSL\.' -e 'AsyncHTTPClient\.' -e 'NIOCore\.' -e 'NIOPosix\.' -e 'could not be completed' stderr.txt`, which must print 0. G10 is a secondary list (empty output = pass). Watched red (measured 2026-10-10, Swift 6.4 and 6.3): `localizedDescription` printed six raw lines, `render()` printed `127.0.0.1: timed out`, `nonexistent.invalid: cannot resolve host`, `127.0.0.1: TLS handshake failed (certificate verify failed)` and `127.0.0.1: connection refused`. | MUST |
| SW-NET-15 | Cache the bearer token per `scope` until `expires_in` (60 s when omitted) and fetch it once per scope. | The naive client fetched 4 tokens for 3 requests and 1 blob. The Docker token spec defines the 60 s default. A violation costs rate-limit exposure and not correctness. | Test: a token endpoint that counts requests reports exactly 1 fetch after N requests in one scope, using the same two-listener setup as `SW-NET-10`. Watched red (measured 2026-10-10): the naive client made 4 fetches, the caching client 1. | SHOULD |

```swift
// wrong: credentials go to whatever realm the challenge names
let realm = try parseChallenge(header).realm
var tokenRequest = HTTPClientRequest(url: realm.absoluteString)

// right: the realm must be the registry's own origin
guard realm.scheme == "https", realm.host == registry.host, realm.port == registry.port else {
    throw TokenError.foreignRealm(host: registry.host ?? "unknown")
}
```

## Reading Heuristics

The commands below only list sites. No wrong output exists for a grep to show, so a reviewer reads each hit. None was watched red, and each row says why.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-NET-16 | Retry only idempotent requests (GET, HEAD, DELETE, a blob `PUT` keyed by digest, a manifest `PUT` by digest) with at most 3 attempts in total. Retry on connect or timeout errors, `HTTPClientError.remoteConnectionClosed` and HTTP 408, 429, 500, 502, 503 and 504. The delay is full jitter, uniform in [0, min(3 s, 250 ms x 2^n)). Honour `Retry-After` (seconds or HTTP date) and stop retrying when it exceeds 30 s. Never retry a 401 beyond one token refresh, other 4xx, a refused certificate, `CancellationError`, a digest mismatch or a POST that starts an upload session. Sleep with `Task.sleep(for:)` (`SW-IO-16`, `SW-CONC-17`). When many requests fan out, cap retries at about 10 percent of traffic with a floor of 10. | One reference client retries 5xx only at a fixed 1 s and never on transport errors, so a connection reset fails the pull. An unclamped `Retry-After` is a denial of service on the caller (CWE-400) and lockstep backoff reproduces the spike (RFC 9110 sections 9.2.2 and 10.2.3). | Reading heuristic: `grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'maxRetries' -e 'retryCount' -e 'for attempt in' -e 'attempt <' -e 'attempts' Sources` lists loops (a comment line is noise), then read each for the method and status allow-list, the jitter, the `Retry-After` clamp and the `CancellationError` pass-through. The allow-list is a policy decision, so no wrong output exists. A table test over (method, status, error class) is the next step. | SHOULD |
| SW-NET-17 | Treat `Docker-Content-Digest` as a hint. Parse it with the `SW-IO-13` parser before it becomes a URL or path component, and store the hash of the bytes received (`SW-IO-30`). | The spec lets the header differ in algorithm and older registries omit it. | Reading heuristic: `grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'Docker-Content-Digest' Sources` lists the sites and each must be followed by a digest-parser call in the same function. A parser call in the same function is a data-flow fact, and the red (a lying header) could not be planted because `registry:2` always returns the matching header. `SW-IO-13` and `SW-IO-30` carry the watched failures. | SHOULD |
| SW-NET-18 | Classify registry failures into the `SW-CLI-01` `Status` table with an exhaustive `switch`. HTTP 401, 403 or missing credentials map to 80. A 404 on a manifest or blob maps to 79. HTTP 408, 429, 500, 502, 503, 504 (the `SW-NET-16` retry list), a connect failure (a DNS failure included, the one deliberate reading of "unreachable" that maps to 75) and a connect or read timeout map to 75. Any other 5xx and a refused certificate map to 69. A digest mismatch, a malformed manifest and a size-cap abort map to 65. An SDK maps the same `Code`s without exit numbers. | 75 means a rerun may succeed and 69 means it will not, so a CLI that returns 1 for both breaks every wrapper that retries on 75. | The exhaustive `switch` with no `default:` over the `SW-NET-14` `Code`, so an unmapped case fails `swift build`, plus one exit test per `Status` case (`SW-CLI-14`). The mechanism is watched, the mapping is a design decision. The 65 for digest and size cases and the DNS placement under 75 are this ruleset's own choices. | SHOULD |
| SW-NET-19 | Send an identifying `User-Agent` of the form `tool/version` on every request. | AHC 1.36.2 sets none (its sources mention the header only in DocC examples), and some CDNs answer an unnamed client with 403. | Reading heuristic: `grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'User-Agent' Sources` must show it set in the request builder. Whether a given CDN rejects an anonymous client is not observable offline. | SHOULD |

## Not Covered

No plant or exemplar reached these, so the rows above say nothing about them.

- Blob push flows: `POST` session start, chunked `PATCH` with `Content-Range`, the finalising `PUT`, cross-repo mount and the upload `Location` redirect. A throttled uplink is why the pinned idle read is 120 s.
- TLS through a CONNECT proxy end to end, and `NO_PROXY` suffix and CIDR matching.
- Real registries: Docker Hub, GHCR and ECR, `429` with `Retry-After`, and the OAuth2 refresh-token flow.
- The CA trust store of a static musl binary in a `FROM scratch` image. `SW-REL-15` owns the SHOULD that such an image copies a CA bundle and makes one HTTPS request.
- Darwin and Windows: `URLSession` redirects, `timeoutIntervalForResource` and FoundationNetworking availability are `unverified: read only`.

## What Agents Get Wrong Here

Ranked by estimated frequency times blast radius. The order is a judgement, not a count.

| # | Failure | Why it compiles and misleads | Check and rule |
|---|---|---|---|
| 1 | `URLSession.shared.data(for: requestWithBearer)` for a registry, then "adds" a per-call `delegate:` or `httpAdditionalHeaders` as the safe place | Works on macOS. On Linux it leaks to another host and port and breaks on CDN redirects with a 400. | G1, G2, redirect test, SW-NET-03 |
| 2 | Prints `error.localizedDescription` or `"\(error)"` for a network failure | Compiles. Shows `(NSURLErrorDomain error -1001.)`, `(AsyncHTTPClient.HTTPClientError error 1.)` or a build path. | stderr pattern per failure class, G10, SW-NET-14 |
| 3 | `HTTPClient(eventLoopGroupProvider: .singleton)` with no shutdown, a `defer { Task { ... } }` shutdown or `syncShutdown()` | Runs in release and traps in debug tests. The task may never run. | G3, G3b, G3c, debug test, SW-NET-02 |
| 4 | `execute(request, timeout: .seconds(30))` believed to cap the download, or `timeoutIntervalForResource = 30` | A head-only bound and a no-op on Linux. | G4a, G4c, trickle test, SW-NET-05 |
| 5 | The default `HTTPClient.Configuration` | No read timeout, no proxy and no explicit redirect policy. | G9c, G4b, stall test, SW-NET-04 |
| 6 | `collect(upTo: .max)`, `1 << 40` or `URLSession.data(from:)` for a layer | Bounded in name only, and 2 GiB RSS for 1 GiB. | G6b, peak-memory gate, SW-NET-07 |
| 7 | `URLSession.bytes(for:)` to stream | Exists on Apple and fails only in the Linux job. | `swift build`, G1b, SW-NET-01 |
| 8 | Assumes AHC honours `HTTPS_PROXY`, or sets `SSL_CERT_FILE` or `certificateVerification = .none` for a private CA | The environment is ignored and the client connects direct. `.none` disables security. | proxy-log test, G7, SW-NET-08, SW-NET-09 |
| 9 | `HTTPClient.shared` or `URLSession` for blobs | Decompression is on, so hashes mismatch only behind gzip-encoding CDNs. | G8, G11, gzip test, SW-NET-06 |
| 10 | Fetches a token per request, or sends credentials to the `realm` it was handed | Rate limits and exfiltration. | two-listener test, SW-NET-10, SW-NET-15 |
| 11 | A manifest request with no `Accept` or Docker v2 only | `registry:2` answers 404, read as "not found". | `Accept` test, SW-NET-11 |
| 12 | Writes `blobs/<digest>` first and compares after | A mismatch or truncation leaves a file under a digest name. | `find blobs -type f` after a failing fetch, SW-NET-12 |
| 13 | `try? await` around `execute` or `data(for:)` with a fixed `sleep(1)` retry | Swallows cancellation and every error class. | G13, SW-NET-13, SW-NET-16 |
| 14 | Invents `Configuration.timeout = .seconds(30)`, `request.timeout`, `HTTPClientRequest.timeoutInterval` or `EventLoopGroupProvider.createNew` | Not APIs. AHC has `Timeout(connect:read:write:)` and per-call `timeout:` and `deadline:`, and `createNew` is deprecated. | `swift build` (the deprecation warning is not planted), SW-NET-04 |
| 15 | Stores `Docker-Content-Digest` as the blob's digest | Trusts the registry's claim, which may be absent or another algorithm. | `SW-IO-13` and `SW-IO-30` checks, SW-NET-17 |
| 16 | Compares `URLError.code == .secureConnectionFailed` for TLS | On Linux TLS failures are code -1 (`.unknown`). | reading heuristic, the renderer switches on type, code and text, SW-NET-14 |
