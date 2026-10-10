---
title: "Network and registry clients on Swift 6.4 (Linux): the consolidated SW-NET ruleset"
topic: network
model: sonnet
id_family: SW-NET
consolidates:
  - swift-network/registry-clients.md
date: 2026-10-10
---

# Network and registry clients (SW-NET)

Date 2026-10-10. One sub-artifact feeds this file, so the work here is not merging peers; it is (a) turning 23 candidate rules into the smallest set that changes agent behaviour, (b) re-running what the dive left green-only or file-level, and (c) settling every place the dive disagrees with a sibling consolidation, the topic map or the fleet's own shipped code.

Citation keys. `[rc §n]` = a section of [registry-clients.md](swift-network/registry-clients.md). `[rc VR x]` = row `x` (plant letter a to m, `s`, `manifest`) of its "Verification runs" table; fixture root `/home/mherwig/.cache/research-lang/swift-tools/fixtures/registry-clients/`. `[NC-n]` = a re-run made for this consolidation, fixture root `/home/mherwig/.cache/research-lang/swift-tools/fixtures/network-consolidation/` (recorded at the end of the ruleset). Toolchains `swift:6.4` and `swift:6.3` (Linux), AsyncHTTPClient (AHC) 1.36.2, `registry:2` 2.8.3. Every Darwin and Windows statement is `unverified: read only`.

## Verdict

1. **Client.** AsyncHTTPClient for any request that carries a credential, streams a body, hashes the bytes or needs proxy or TLS control; `URLSession` only for small unauthenticated requests, or behind a session-level strip delegate (SW-NET-03, -06). Binds library, SDK, CLI, server and test code that builds on Linux. An Apple app keeps `URLSession` as its platform client; its Darwin behaviour is unverified: read only.
2. **Credentials never leave the origin.** AHC strips on a cross-origin redirect; the per-task `delegate:` of `URLSession` is never called for a redirect on Linux, so only a session-level delegate counts (SW-NET-03). The bearer-token exchange runs on a second no-redirect client, checks the challenge realm against the registry origin and caches per scope (SW-NET-10, -15).
3. **Time.** Every client comes from one explicit `Configuration` factory (connect 30 s, idle read 120 s, the fleet's `ocx` values); whole-transfer time is the SW-CONC-24 race, never `deadline:`/`timeout:` (head only) or `timeoutIntervalForResource` (a no-op on Linux) (SW-NET-04, -05).
4. **Lifetime.** Scoped `HTTPClient.withHTTPClient`, or an owner with `close() async throws`; a leaked client traps in debug (exit 132) and leaks silently in release (SW-NET-02).
5. **Bytes.** Blobs stream into a staged file, are hashed as received, never decompressed by the client, and publish by SW-IO-19; `HTTPClient.shared` and `URLSession` are out for hashed bytes (SW-NET-06, -07, -12).
6. **Environment.** AHC reads no proxy or CA variable and `URLSession` ignores `SSL_CERT_FILE`, so the factory reads `HTTPS_PROXY`/`HTTP_PROXY`/`ALL_PROXY`/`NO_PROXY` (upper case first) and the CA path itself; TLS verification is never switched off (SW-NET-08, -09).
7. **Errors.** One `render(_:)` keyed on error type and `URLError.code` yields `<host>: <reason>`; this family owns it and overrides the `URLError` branch of SW-ERR-18/20 (SW-NET-14). Failures classify into the SW-CLI exit table as 69, 75, 79 or 80 (SW-NET-18).
8. **Retries** follow the `ocx` ladder (3 attempts, full jitter, `Retry-After` clamp 30 s); SHOULD, design not measured (SW-NET-16).
9. **Decided against siblings.** Nine conflicts are settled below; two need a one-line amendment in a sibling consolidation (SW-SEC-03 names `URLSession.bytes(for:)`, which does not compile on Linux; the SW-ERR-20 `render` template sends `URLError` to `localizedDescription`).
10. **Not covered by any plant or exemplar:** blob push (upload) flows, the OAuth2 refresh-token flow, inbound server-side HTTP limits (SW-SEC), TLS through a CONNECT proxy end to end, and every Darwin or Windows behaviour.

## The ruleset

### Conflicts resolved

Evidence tiers follow the topic map: normative, measured, codified, argued, asserted.

| # | Conflict | Resolution and reason |
|---|---|---|
| C1 | Map conflict 18 says "`URLSession` only with a redirect delegate that drops credentials". [rc §2.3] measured that the form an agent writes, the per-task `delegate:` of `data(for:delegate:)`, never receives the redirect callback (`HTTPURLProtocol.swift:453-501`), that `httpAdditionalHeaders` leaks identically, and that a port-only change leaks. | **Restated, not reversed:** the delegate must be session-level and compare scheme, host and port (SW-NET-03). Measured, 6.4 and 6.3 [rc VR a]. |
| C2 | `SW-SEC-03` (`swift-security.md:78`) replaces `URLSession.data(from:)` with "`URLSession.bytes(for:)` with a running total". [rc §2.16] says the member does not exist in FoundationNetworking. | **SW-NET-01 wins.** Re-run [NC-1]: `swiftc -typecheck` of `URLSession.shared.bytes(from:)` exits 1 with `value of type 'URLSession' has no member 'bytes'` on 6.4 and 6.3; the `download(for:)` twin exits 0. SW-SEC-03's network branch must read "AHC `for try await` with a running total, or `collect(upTo:)`; `bytes(for:)` only under `#if canImport(Darwin)`". Amendment needed in `swift-security.md`. |
| C3 | `SW-ERR-18/20` (`swift-errors.md:154,191`) render a `URLError` through `localizedDescription`; `SW-SEC-14` repeats it. [rc §2.15] and the errors consolidation's own row R8 measure that string as `The operation could not be completed. (NSURLErrorDomain error -1001.)`. | **SW-NET-14 wins for network error types**, as the map already routes it (`swift-topic-map.md:1569`, "the network family owns the error rendering of its client"). Re-run [NC-2]: the SW-ERR-18 check `grep -c 'Error Domain='` prints 0 on that string (green on an unreadable line), while `grep -c -E 'NSURLErrorDomain\|error -[0-9]\|could not be completed'` prints 2. The SW-ERR-20 `render` template needs a branch that delegates `URLError`, `HTTPClientError`, `NIOConnectionError`, `NIOSSLError` and `IOError` to the SW-NET renderer, and its check needs the widened regex. Amendment needed in `swift-errors.md`. |
| C4 | Proxy variable precedence. containerization reads upper case first (`ProxyUtils.swift:34-58`), swiftly lower case first and ignores `NO_PROXY` (`HTTPClient.swift:131-141`); [rc §2.12] says "curl's rule (lowercase wins) is what the Rust and Go fleet tools do". | **Upper case first, lower case fallback, `ALL_PROXY` fallback, `NO_PROXY` as host, leading-dot suffix, CIDR or `*`.** The fleet's own `ocx` documents exactly that (`ocx@5de9d777eb7d:website/src/docs/reference/environment.md:1205-1216`), which contradicts the dive's attribution. A Swift CLI in the `ocx` mould must behave as `ocx` does on the same host. |
| C5 | Timeout and retry numbers. The dive's are "decisions, not measured": connect 10 s, read 30 s (60 s blobs), backoff 1 s/2 s/8 s with +/-20 % jitter, no retry on 500. The fleet's shipped Rust client uses connect 30 s, idle read 120 s, 3 attempts, 250 ms base, 3 s cap, full jitter, 500 retried but exit 69, `Retry-After` above 30 s stops retrying. | **`ocx` numbers.** They are shipped, carry written reasons (a read timeout shorter than 120 s fails a `PATCH` on a throttled uplink: `ocx@5de9d777eb7d:crates/ocx_oci/src/client/builder.rs:18-22`; unclamped `Retry-After` is CWE-400: `transport_policy.rs:117-119`; lockstep backoff reproduces the spike: `:143-144`), and give the same exit code for the same condition. The measured facts (what each knob bounds) are unchanged. |
| C6 | The domain note and map said the token endpoint only needs `redirectConfiguration = .disallow`. [rc §2.4] planted a challenge whose realm is another host: the naive client sent the user's Basic credentials there. | **Realm validation is required in addition to `.disallow`** (SW-NET-10). Measured: `k.token/naive->evil-realm` red, `strict` green [rc VR k]; mirrors containerization's `validateRealm` (`RegistryClient+Token.swift:217-236`). |
| C7 | The dive's file-level lifetime grep (G3: a file containing the word `shutdown` passes) accepts the dive's own green twin `defer { Task { try? await c.shutdown() } }`, which its AI-angle table calls "process may exit before it runs". | **Added G3b** (a `Task` that contains `.shutdown(`, single or multi line). Watched red on both shapes and green on the awaited twin [NC-3]. |
| C8 | Counting. [rc §Exemplar evidence] gives `FoundationNetworking` as 57 files in 10 repos; the packaging audit gives 31 imports and 41 guards in 8 repos (`swift-audit/exemplar-packaging-and-release.md`). | **Audit numbers** (map conflict 21). Re-measured [NC-6]: 57/10 reproduces for the bare substring (guards and comments included); `^ *import FoundationNetworking` is 37 files in 8 repos. The other dive counts reproduce (AHC import 103 files in 6 repos). |
| C9 | `SW-SEC-23` wants an explicit finite `decompression` limit; SW-NET-06 wants decompression off for hashed bytes. | **Compatible, SW-NET-06 is the stricter special case.** A client that does decompress sets the finite limit (SW-SEC-23); a client whose bytes are hashed never decompresses. The AHC README sentence that custom clients must opt in to redirects is stale (the default `Configuration()` follows, 302 became 200, [rc §Contested]): always set `redirectConfiguration` explicitly. |

### A. Caught by the compiler or a runtime trap

**SW-NET-01 (MUST).** Never call `URLSession.bytes(for:)` or `bytes(from:)` or name `AsyncBytes` in code that compiles on Linux; stream a response with AHC's `for try await buffer in response.body`, or with `URLSession.download(for:)` to a file, and keep any Apple-only fast path behind `#if canImport(Darwin)`.
- Why: FoundationNetworking has no such member, so the code builds on the author's Mac and fails only in the Linux job.
- Verify: `swift build` on the Linux image, `error: value of type 'URLSession' has no member 'bytes'` (exit 1); static pre-check G1b below.
- Watched: yes. [rc VR m] (`swift build -Xswiftc -DCHECK_BYTES` exit 1, `Checks.swift:9:50`); [NC-1] (typecheck exit 1, `download(for:)` twin exit 0, 6.4 and 6.3); G1b red and green [NC-3].
- Floor: Swift 6.3 and 6.4 on Linux. Binds: library, SDK, CLI, server, test code compiled on Linux. An Apple-only app target is exempt (the member exists on Darwin: unverified: read only).

**SW-NET-02 (MUST).** Shut down every `HTTPClient` you construct, with `await`, on every path: scoped use goes through `HTTPClient.withHTTPClient(configuration:)`; a long-lived owner exposes `func close() async throws` that awaits `shutdown()` on every client it created (data client and token client), and the entry point awaits `close()` on success, error and cancellation; `deinit { _ = client.shutdown() }` is a backstop only; never `syncShutdown()` in async code, never `shutdown()` on `HTTPClient.shared`, never `defer { Task { try? await client.shutdown() } }`.
- Why: a client released un-shut-down hits `preconditionFailure` in debug (`HTTPClient.swift:211`, exit 132) and leaks silently in release; shutting down with a request in flight fails it with `HTTPClientError.cancelled`; an un-awaited task may not run before the process exits.
- Verify: a debug `swift test` that builds and drops each owner (the trap `Fatal error: Client not shut down before the deinit` means red; a release build exits 0, so the check must be a debug run); G3, G3b, G3c below; `swift build` rejects `syncShutdown()` in async (`instance method 'syncShutdown' is unavailable from asynchronous contexts`).
- Watched: yes. [rc VR c]: leak in debug exit 132, release exit 0 (invisible), `explicit`/`withHTTPClient`/`deinit-fire-and-forget` exit 0, `syncShutdown`-in-async compile error exit 1; G3 red/green [rc VR s]; G3b and G3c red/green [NC-3].
- Floor: AHC 1.36.2 (`withHTTPClient` measured there). Binds: library, SDK, CLI, server, test code (tests build clients with `withHTTPClient`: `hummingbird@1bd3b407fb47:Tests/HummingbirdHTTP2Tests/HTTP2Tests.swift:38,86,96`).

### B. Caught by grep, each with a behavioural twin

**SW-NET-03 (MUST).** A redirect target never receives a credential: send every request that carries `Authorization`, a cookie or a token through AHC and set `redirectConfiguration` explicitly; if `URLSession` is unavoidable, install a session-level `URLSessionTaskDelegate.willPerformHTTPRedirection` that drops `Authorization` (case-insensitive) unless scheme, host and port all match, and treat the `delegate:` argument of `data(for:delegate:)`/`upload`/`download`, `httpAdditionalHeaders` and "set the header on the first request only" as non-fixes.
- Why: on Linux `URLSession` re-sends the header to another host and to another port, the per-task delegate is never called for a redirect, and a presigned CDN hop (Docker Hub to S3) answers 400 when it sees `Authorization`; the OCI spec says clients "MUST NOT forward `Authorization` headers across host boundaries" (`spec.md` line 829).
- Verify: G1 (a file pairing `URLSession` with `Authorization` and no `willPerformHTTPRedirection`) and G2 (per-task `delegate:`), both below; behavioural: a local server answering 302 to another host and another port plus an echo endpoint, then `grep -e 'auth=Bearer SECRET'` over the client output must print nothing.
- Watched: yes. [rc VR a]: `urlsession`, `-pertask`, `-header-config`, different-port red (exit 1, `auth=Bearer SECRET`), `-delegate`, `ahc`, `ahc-shared` green (exit 0, `auth=NONE`); `a.s3-400` red/green; G1 and G2 red on `greps/red/Sources/App/UrlSessionAuth.swift`, empty on green [rc VR s]; G1 and G2 re-run [NC-4].
- Floor: AHC 1.36.2; Swift 6.3 and 6.4 on Linux. Binds: library, SDK, CLI, server, test code. Darwin `URLSession` redirect behaviour: unverified: read only.

**SW-NET-04 (MUST).** Build every `HTTPClient` from one factory that returns an explicit `HTTPClient.Configuration` with `timeout: .init(connect:, read:)` from named constants (connect 30 s, idle read 120 s; a manifest, tag or token client may tighten read to 30 s), an explicit `redirectConfiguration`, the proxy (SW-NET-09) and TLS (SW-NET-08); never `HTTPClient(eventLoopGroupProvider:)` alone, `withHTTPClient { }` without `configuration:`, or `configuration: .init()`.
- Why: AHC's default `Configuration` has a 10 s connect timeout and no read timeout, so a server that stalls mid-body held the client for the fixture's full 20 s; `ocx` met the same trap ("inheriting the fork's None means a stalled registry hangs the pull forever", `ocx@5de9d777eb7d:crates/ocx_oci/src/client/builder.rs:1029`). `Timeout.read` is an idle gap that resets on every byte (a steady trickle with `read: 1 s` completed in 7.54 s), so it is not a total bound (SW-NET-05).
- Verify: G9c (construct sites with the default or an inline-empty configuration) and G4b (a file building a client or configuration with no `read:`); behavioural: a server that sends the head and 1 KiB, then goes silent; the client must throw within the read timeout plus slack (`./rcrun.sh debug stall ahc-default | grep -e NO-TIMEOUT` prints `NO-TIMEOUT-WITHIN-GUARD after 5.00s` on the violation).
- Watched: yes. [rc VR f]: `f.stall/ahc-default` red exit 1, `ahc-read1` green exit 0 (`client gave up after 1.00s`); G4b red/green [rc VR s]; G9c red/green [NC-3].
- Floor: AHC 1.36.2. Binds: library, SDK, CLI, server. The numbers are decisions at parity with `ocx` (conflict C5); only "both timeouts explicit" is checked.

**SW-NET-05 (MUST).** Bound whole-transfer time with the SW-CONC-24 structured race around request plus body; never pass `deadline: .distantFuture`; treat `execute(_:timeout:)` and `deadline:` as a bound on the response head only; never rely on `URLSessionConfiguration.timeoutIntervalForResource` for a total cap on Linux (set `timeoutIntervalForRequest`, the idle bound, and the race). Budgets (decision): manifest, tag list and token 60 s; blob `max(60 s, size / 1 MiB/s)`.
- Why: AHC cancels its deadline task as soon as the head arrives (`HTTPClient+execute.swift:173-177`), so a 3 s deadline did not stop a body trickling for 7.5 s; `timeoutIntervalForResource` is declared but consumed nowhere in the FoundationNetworking protocol files, so the effective cap is the 7-day default.
- Verify: G4a (`distantFuture`), G4c (`timeoutIntervalForResource`); behavioural: `./rcrun.sh debug stall ahc-deadline1 | grep -e NO-TIMEOUT` and `urlsession-resource1`, with the race green (`rc timeouts2`: stopped at 3.00 s).
- Watched: yes. [rc VR f]: `ahc-deadline1` and `urlsession-resource1` red exit 1, `urlsession-request1` green exit 0; G4a and G4c red/green [rc VR s].
- Floor: Swift 6.3 and 6.4 on Linux; `withDeadline` (SE-0526) is absent in 6.4, SW-CONC-24 is the answer until it ships. Binds: library, SDK, CLI, server.

**SW-NET-06 (MUST for digest-checked bytes).** Any request whose bytes are compared with a registry digest (blobs, manifests) uses an own AHC client with `decompression` left `.disabled`; `HTTPClient.shared` and `URLSession` serve only small unauthenticated requests whose bytes are never hashed; never call `shutdown()` on the shared client.
- Why: `HTTPClient.shared` is configured like a browser (decompression `.enabled(limit: .ratio(25))`, 90 s connect and read, 20 redirects: `Configuration+BrowserLike.swift:32-44`) and `URLSession` always decodes, so a CDN that attaches `Content-Encoding: gzip` to an already-gzipped layer hands back decoded bytes and the registry digest never matches.
- Verify: G8 (`HTTPClient.shared` in a file that names `SHA256` or `digest`), G11 (`decompression: .enabled` in such a file); behavioural: `./rcrun.sh debug gz <client> http://127.0.0.1:8101/gz | grep -e DECODED`.
- Watched: yes. [rc VR l]: `ahc-shared`, `ahc-enabled`, `urlsession` red exit 1 (`DECODED`), `ahc-default` green exit 0 (`WIRE-BYTES`); G8 and G11 red/green [rc VR s].
- Floor: AHC 1.36.2. Binds: SDK, CLI, library, server clients. `vapor@bf77fc69b142:Sources/Vapor/Application.swift:137-139` decodes deliberately and says so; that is correct for non-hashed traffic.

**SW-NET-07 (MUST).** Stream anything not known to be small: `collect(upTo:)` takes a named bound (manifest and index at most 4 MiB, token, tag list and error body at most 1 MiB, the SW-SEC-03 limits) and never `.max`, `Int.max`, a shift of 28 or more, or a literal of ten digits or more; layers and configs above 1 MiB flow through `for try await` (or `FileDownloadDelegate`) into a staged file, hashing as they pass; `URLSession.data(from:)` and `data(for:)` are never used for a blob.
- Why: peak RSS for a 1 GiB blob was 1058 MiB through `collect` plus `Data`, 2095 MiB through `URLSession.data`, and 35 MiB through the AHC loop; the `upTo:` parameter is required by the compiler but `.max` defeats it.
- Verify: G6b below (the dive's G6 printed 2 of 4 planted shapes; G6b prints all 4, [NC-5]); a peak-RSS gate on a 1 GiB download: `/usr/bin/time -v <cmd> 2>&1 | grep 'Maximum resident'` above 262144 KiB fails.
- Watched: yes. [rc VR d]: `ahc-collect` (1083876 KiB) and `urlsession-data` (2145420 KiB) red exit 1, `ahc-stream` (36052), `ahc-delegate` (36884), `urlsession-download` (40328) green exit 0; G6b red/green [NC-3].
- Floor: AHC 1.36.2. Binds: SDK, CLI, library, server. Size limits for other untrusted streams are SW-SEC-03.

**SW-NET-08 (MUST).** Keep TLS verification on: never `certificateVerification = .none` and never `INSECURE_SSL_NO_VERIFY`; trust a private CA through `TLSConfiguration.additionalTrustRoots = [.file(path)]` on AHC (a system-store install on `URLSession`); neither client reads `SSL_CERT_FILE`, so a CLI that documents the variable reads it itself and feeds the path to `additionalTrustRoots`.
- Why: a self-signed registry failed the handshake on both clients; `SSL_CERT_FILE` and `CURL_CA_BUNDLE` changed nothing; `URLSessionCertificateAuthorityInfoFile` is read only under `#if os(Android)` (`EasyHandle.swift:205-221`).
- Verify: G7; behavioural: `./rcrun.sh debug tls <client> https://127.0.0.1:8443/echo | grep -v -e 'path=/echo'` (output = the handshake failure) with a self-signed server.
- Watched: yes. [rc VR h]: `ahc-default`, `urlsession`, both `+SSL_CERT_FILE` variants red exit 1, `ahc-additionalTrustRoots` green exit 0; G7 red/green [rc VR s].
- Floor: AHC 1.36.2, swift-nio-ssl 2.30. Binds: CLI, SDK, library. Additive `additionalTrustRoots` is the measured route; `ocx` semantics for `SSL_CERT_FILE` replace host-store discovery (`environment.md:1180-1187`), a difference to document (Open questions).

**SW-NET-09 (MUST for registry-talking CLIs, SHOULD elsewhere).** The factory sets `Configuration.proxy = .server(host:port:)` from the environment: `HTTPS_PROXY` for https, `HTTP_PROXY` for http, `ALL_PROXY` as the fallback, each checked upper case first and lower case second, read once at start; `NO_PROXY` bypasses on an exact host, a leading-dot suffix, a CIDR block or `*`.
- Why: AHC 1.36.2 contains no environment lookup for proxies, and `URLSession` on Linux (libcurl) honours lowercase `http_proxy` only; both silently connect direct when an agent assumes otherwise.
- Verify: behavioural: `RC_ENV='-e HTTPS_PROXY=http://127.0.0.1:8110' ./rcrun.sh debug proxy ahc-env <url>` then `test -s out/proxy.log` (empty log = the proxy variable was ignored), and with `NO_PROXY` naming the target the log must stay empty; static: G9c guarantees every client has an explicit configuration, and a reading step confirms the factory assigns `.proxy` (the dive's G9 is dropped: it passes on a comment, [NC-5]).
- Watched: yes for the behaviour. [rc VR g]: `ahc-plain` (`http_proxy`, then `HTTPS_PROXY`+`HTTP_PROXY`) and `urlsession(HTTP_PROXY)` red exit 1, `urlsession(http_proxy)`, `ahc-proxyfromenv(HTTP_PROXY)` and the `NO_PROXY` bypass green exit 0. Not planted: `ALL_PROXY`, CIDR and suffix matching (design, from `ocx`), and TLS through `CONNECT` end to end (the plant proxy answers `CONNECT` with 502, `HTTPClientError.invalidProxyResponse`).
- Floor: AHC 1.36.2 (`Proxy.server(host:port:authorization:)` exists). Binds: CLI, SDK. Windows and macOS system proxy settings (which `ocx` also reads): unverified: read only.

### C. Caught by a behavioural test against a fixture server

**SW-NET-10 (MUST).** The bearer-token exchange uses a dedicated `HTTPClient` with `redirectConfiguration = .disallow` (any 3xx is an error), refuses to send credentials unless the challenge `realm` has the registry's own scheme, host and port and both endpoints are https (plain http only for a host the caller named as insecure), and does one token fetch and one retry per 401.
- Why: a challenge naming `realm="http://127.0.0.1:8105/token"` made the naive client send the user's Basic credentials to the foreign host; a redirected token request moves a credential-bearing request off-origin; a separate client leaves the data client free to follow CDN redirects.
- Verify: a test with two local listeners, a registry whose 401 names a realm on the second, and asserts that the second saw zero requests (`[ -s out/evil.log ]` is the violation) and that a redirecting token endpoint is refused; G5 (a file handling a `realm` without `disallow`).
- Watched: yes. [rc VR k]: `naive->evil-realm` red exit 1 (`/token?client_id=rc-fixture&service=fake&scope=repository:x/y:pull Authorization=Basic dTpw`), `strict` green exit 0 (`authorization server 127.0.0.1:8105 is not the registry 127.0.0.1:8104`); G5 red/green [rc VR s]. The https refusal itself was not planted (the strict client was run with `allowInsecure` to reach loopback).
- Floor: AHC 1.36.2; Docker token spec. Binds: SDK, CLI, library. Credential values are `Secret` (SW-SEC-13), never logged.

**SW-NET-11 (MUST).** Every manifest or index request sets `Accept` to the full supported list (OCI image manifest, OCI image index, Docker v2 manifest, Docker manifest list).
- Why: `registry:2` 2.8.3 answers an OCI manifest requested with no `Accept`, or with Docker v2 only, with HTTP 404 (not 406), which an agent reads as "image not found".
- Verify: `./verify-manifest.sh red-no-accept`, `red-docker-only` and `green` (output = any request not answered 200); against another registry the same four-type list is the spec's "SHOULD include an `Accept` header".
- Watched: yes. [rc VR manifest]: red exit 1 (`HTTP 404` twice), green exit 0. Measured on `registry:2` 2.8.3 only; other registries unmeasured.
- Floor: none. Binds: SDK, CLI, library.

**SW-NET-12 (MUST).** A blob arrives into a staged file and publishes by SW-IO-19, with the HTTP additions: require status 200, reject a declared `Content-Length` or a running total above the descriptor size before writing the overflowing chunk, require `received == size`, hash while writing, and unlink the staged file on every exit that does not publish.
- Why: a writer that opens `blobs/sha256:<digest>` and compares afterwards left a file under the digest name after a mismatch and after a truncation (red); the staged recipe left nothing (green); containerization stages and compares but never unlinks on mismatch.
- Verify: after a failing fetch (mismatch, truncated, oversize) `find <store> -type f` must print nothing; the good blob publishes mode 0444.
- Watched: yes. [rc VR b]: `naive` mismatch and truncated red exit 1 (`blobs/sha256:0000…0001` left behind), `verified` mismatch, truncated, oversize green exit 0, good blob mode 444.
- Floor: AHC 1.36.2. Binds: SDK, CLI, library. The six publish steps themselves are SW-IO-19 and SW-IO-30; this rule adds the HTTP half.

**SW-NET-13 (MUST).** Never wrap a network call in `try?`; rethrow cancellation as `CancellationError` (map `URLError(.cancelled)`, code -999, at the module boundary); never feed a cancellation into the retry loop; remove staged files in `defer`.
- Why: both clients surface a cancelled stalled body within 1.00 s (AHC `CancellationError`, `URLSession` `URLError(.cancelled)`), and a `try?` turns that into a silent `nil` or a hot retry loop (SW-CONC-17).
- Verify: G13 below (a network call under `try?`); behavioural: `./rcrun.sh debug cancel ahc | grep -v -e 'threw after [01]\.[0-9]*s'` prints nothing.
- Watched: yes for the grep, [NC-3] (3 planted `try?` shapes red, the `catch`-based twin green). The behavioural half is green-only: `f.cancel-propagates/ahc` and `/urlsession` exit 0 [rc VR f]; no client that swallows was planted, which is why the grep is the discriminating check.
- Floor: Swift 5.5. Binds: SDK, CLI, library, server.

**SW-NET-14 (MUST).** Show a network failure through one `render(_:)` keyed on the error type and `URLError.code`, producing `<host>: <reason>`; wrap it at the module boundary so the raw error is the `cause` of an SW-ERR-20 error (`Code`s `.timeout`, `.dns`, `.tls`, `.connection`, `.cancelled`); never use `localizedDescription` or `"\(error)"` for `URLError`, `HTTPClientError`, `NIOConnectionError`, `NIOSSLError` or `IOError`.
- Why: on Linux the timeout string is `The operation could not be completed. (NSURLErrorDomain error -1001.)`, every AHC and NIO error is `(AsyncHTTPClient.HTTPClientError error 1.)`-shaped, and `"\(error)"` leaks a build path (`.../swift-nio-ssl/Sources/CNIOBoringSSL/ssl/handshake.cc:288`); TLS failures arrive as `URLError` code -1 (`.unknown`), so a `switch e.code` alone loses the TLS class.
- Verify: behavioural, per failure class (timeout, DNS, untrusted TLS, TLS to a plain port, refused): the CLI's stderr must not match `-e 'NSURLErrorDomain' -e 'Error Domain=' -e 'error -[0-9]' -e 'OPENSSL_internal' -e 'NIOSSL\.' -e 'AsyncHTTPClient\.' -e 'NIOCore\.' -e 'NIOPosix\.' -e 'could not be completed'` (the dive's `e.render` pattern, which supersedes SW-ERR-18's `Error Domain=` alone); G10 as a secondary list. Host names only (SW-SEC-14); wire text is sanitised at the stderr boundary (SW-SEC-17).
- Watched: yes. [rc VR e]: `localizedDescription` red exit 1 (six raw lines), `render()` green exit 0 (`127.0.0.1: timed out`, `nonexistent.invalid: cannot resolve host`, `127.0.0.1: TLS handshake failed (certificate verify failed)`, `127.0.0.1: connection refused`), 6.4 and 6.3; G10 red/green [rc VR s]; the SW-ERR-18 blind spot [NC-2].
- Floor: AHC 1.36.2; `HTTPClientError` is a struct with static members, so the helper uses `==` patterns, not an enum `switch`. Binds: CLI (stderr), SDK (error text), server (log text). Reference implementation: the dive's `rc/Sources/rc/Render.swift` (67 lines).

**SW-NET-15 (SHOULD).** Cache the bearer token per `scope` until `expires_in` (default 60 s when omitted), and fetch it once per scope.
- Why: the naive client fetched 4 tokens for 3 requests and 1 blob; the Docker token spec defines the 60 s default; `swift-container-plugin` caches nothing (`AuthHandler.swift:20-60`), containerization checks expiry (`RegistryClient+Token.swift:126`).
- Verify: the `tokenreg` stats endpoint after N requests in one scope reports `token_fetches` of 1 (more = violation); the same two-listener test as SW-NET-10.
- Watched: yes. [rc VR k]: `naive-cache` red (4 fetches), `strict-cache` green (1 fetch). SHOULD, not MUST: the violation costs rate-limit exposure, not correctness.
- Floor: none. Binds: SDK, CLI, library.

### D. Reading heuristics (named, not watched red)

**SW-NET-16 (SHOULD).** Retry only idempotent requests (GET, HEAD, DELETE, a blob `PUT` keyed by digest, a manifest `PUT` by digest) with at most 3 attempts in total, on connect or timeout errors, `HTTPClientError.remoteConnectionClosed` and HTTP 408, 429, 500, 502, 503, 504; delay is full jitter, uniform in [0, min(3 s, 250 ms x 2^n)); honour `Retry-After` (seconds or HTTP date) and stop retrying when it exceeds 30 s; never retry 401 beyond one token refresh, other 4xx, a refused certificate, `CancellationError`, a digest mismatch or a POST upload-session start; sleep with `Task.sleep(for:)` (SW-IO-16, SW-CONC-17); when many requests fan out, cap retries at about 10 % of traffic with a floor of 10.
- Why: containerization retries 5xx only, fixed 1 s, never on transport errors (`RegistryClient.swift:48-54,256-266`), so a connection reset fails the pull; the fleet ladder is `ocx@5de9d777eb7d:crates/ocx_oci/src/transport_policy.rs:14-16,35-37,112-131,185-222`; RFC 9110 sections 9.2.2 and 10.2.3.
- Verify: reading heuristic, run: `grep -rn --include='*.swift' -e 'maxRetries' -e 'retryCount' -e 'attempt' Sources`, then read the loop for the method and status allow-list, the jitter, the `Retry-After` clamp and `CancellationError` pass-through; a table test over (method, status, error class) is the next step. Why only a reading heuristic: the allow-list is a policy decision, there is no wrong output a grep can show.
- Watched: no. Floor: Swift 5.7 (`Clock`). Binds: SDK, CLI, library.

**SW-NET-17 (SHOULD).** Treat `Docker-Content-Digest` as a hint: parse it with the SW-IO-13 parser before it becomes a URL or path component, and store the hash of the bytes received (SW-IO-30).
- Why: the spec lets the header differ in algorithm and older registries omit it; containerization parses it before use (`RegistryClient+Fetch.swift:57-69`).
- Verify: reading heuristic, run: `grep -rn --include='*.swift' -e 'Docker-Content-Digest' Sources` lists the sites; each must be followed by a digest-parser call in the same function. Why only a reading heuristic: a parser call in the same function is a data-flow fact; the red (a lying header) could not be planted because `registry:2` always returns the matching header (`digest-header` is green-only [rc VR manifest]).
- Watched: no. Severity SHOULD because SW-IO-13 and SW-IO-30 (MUST, watched) already carry the failures. Floor: none. Binds: SDK, CLI, library.

**SW-NET-18 (SHOULD).** Classify registry failures into the SW-CLI `Status` table with an exhaustive `switch`: HTTP 401 or 403 or missing credentials to 80; a 404 on a manifest or blob to 79; HTTP 408, 429, 502, 503, 504 and a connect failure (a DNS failure included) or connect or read timeout to 75; any other 5xx and a refused certificate to 69; a digest mismatch, malformed manifest or size-cap abort to 65.
- Why: the fleet's `ocx` makes exactly this split (`exit_code.rs:23,28,35,37`; `transport_policy.rs:18-23,42-44`; `crates/ocx_cli/src/exit/ocx_announce.rs:51-54`): 75 means a rerun may succeed, 69 means it will not, so a Swift CLI that returns 1 for both breaks every wrapper that retries on 75.
- Verify: SW-CLI-14's exhaustive `switch` with no `default:` over the SW-NET `Code` (an unmapped case fails `swift build`), plus one exit test per `Status` case; the mapping itself is a design decision (65 for the digest and size cases and the DNS placement under 75 are mine, not `ocx`'s).
- Watched: the SW-CLI-14 mechanism yes, the mapping no. Floor: Swift 6.2 for `processExitsWith`. Binds: CLI. An SDK maps the same `Code`s without exit numbers.

**SW-NET-19 (SHOULD).** Send an identifying `User-Agent: <tool>/<version>` on every request.
- Why: AHC 1.36.2's `Sources` set no `User-Agent` (the only hits are DocC examples, [NC-6]); the CDN in front of the fleet's dist host answers an unnamed client with 403 (`ocx-sdk-python@80136dde4162:src/ocx_sdk/_dist.py:25-31`); containerization builds one for every request.
- Verify: reading heuristic, run: `grep -rn --include='*.swift' -e 'User-Agent' Sources` must show it set in the request builder. Why only a reading heuristic: whether a given CDN rejects an anonymous client is not observable offline.
- Watched: no. Floor: none. Binds: SDK, CLI, library.

### Check library (verbatim)

Run from the package root; each command prints its violations, empty output is a pass. G1 to G11 are the dive's (`greps/red`, `greps/green`, [rc VR s]); G1b, G3b, G3c, G6b, G9c and G13 were written and watched here ([NC-3]). The dive's G6 and G9 are replaced by G6b and G9c.

```sh
# G1  (NET-03) URLSession file naming a credential with no session-level redirect delegate
grep -rl --include='*.swift' -e 'URLSession' Sources | xargs -r grep -l -e 'Authorization' -e 'authorization' | xargs -r grep -L -e 'willPerformHTTPRedirection'
# G1b (NET-01) URLSession streaming API absent on Linux (swift build is authoritative)
grep -rnE --include='*.swift' -e '\.bytes\((for|from):' -e 'AsyncBytes' Sources
# G2  (NET-03) per-task delegate, never called for a redirect on Linux
grep -rn --include='*.swift' -e 'data(for:.*delegate:' -e 'upload(for:.*delegate:' -e 'download(for:.*delegate:' Sources
# G3  (NET-02) a client constructed in a file that never says shutdown or withHTTPClient
grep -rl --include='*.swift' -e 'HTTPClient(' Sources | xargs -r grep -L -e 'shutdown' -e 'withHTTPClient'
# G3b (NET-02) fire-and-forget shutdown, single or multi line
grep -rPzo --include='*.swift' -e 'Task\s*\{[^}]*\.shutdown\(' Sources
# G3c (NET-02) review list: never in async code, a blocking backstop in deinit
grep -rn --include='*.swift' -e 'syncShutdown' Sources
# G4a (NET-05) no wall-clock bound at all
grep -rn --include='*.swift' -e 'distantFuture' Sources
# G4b (NET-04) a file building a client or configuration with no read timeout
grep -rl --include='*.swift' -e 'HTTPClient.Configuration(' -e 'HTTPClient(' Sources | xargs -r grep -L -e 'read:' -e 'timeout.read'
# G4c (NET-05) no-op on Linux
grep -rn --include='*.swift' -e 'timeoutIntervalForResource' Sources
# G5  (NET-10) a realm handled with a client that may follow redirects
grep -rl --include='*.swift' -e 'realm' Sources | xargs -r grep -L -e 'disallow'
# G6b (NET-07) unbounded or oversized collect
grep -rnE --include='*.swift' -e 'collect\(upTo: *(Int\.max|\.max)' -e 'collect\(upTo: *[0-9]+ *<< *(2[89]|[3-9][0-9])' -e 'collect\(upTo: *[0-9_]{10,}' Sources
# G7  (NET-08) TLS verification off
grep -rn --include='*.swift' -e 'certificateVerification = .none' -e 'INSECURE_SSL_NO_VERIFY' Sources
# G8  (NET-06) shared singleton in a file that handles digests
grep -rl --include='*.swift' -e 'HTTPClient.shared' Sources | xargs -r grep -l -e 'SHA256' -e 'digest'
# G9c (NET-04, -09) a client built with the default or an inline-empty configuration
grep -rnE --include='*.swift' -e 'HTTPClient\(eventLoopGroupProvider: *\.[A-Za-z]+\)' -e 'withHTTPClient *(\(\))? *\{' -e 'configuration: *(\.init\(\)|HTTPClient\.Configuration\(\))' Sources
# G10 (NET-14) secondary list: localizedDescription in a file that talks to the network
grep -rl --include='*.swift' -e 'AsyncHTTPClient' -e 'FoundationNetworking' Sources | xargs -r grep -n -e 'localizedDescription'
# G11 (NET-06) automatic decompression in a file that handles digests
grep -rl --include='*.swift' -e 'decompression: .enabled' -e 'decompression = .enabled' Sources | xargs -r grep -l -e 'digest' -e 'SHA256'
# G13 (NET-13) a network call under try?
grep -rnE --include='*.swift' -e 'try\? +await .*(\.execute\(|\.data\(for:|\.data\(from:|\.download\(|\.upload\()' Sources
```

Limits. G1, G3, G4b, G5, G8, G11 are file-level: one mention anywhere satisfies them, which is why G3b and G9c exist and why each rule keeps a behavioural half. G9c misses a constructor split over several lines. G13 misses a `try?` on a continuation line. All are greps over a `Sources` directory operand; run them on changed files in an adopted tree, where hits on trusted local code need a reasoned exemption.

### Consolidation re-runs

| Key | What | Command (shape) and result |
|---|---|---|
| NC-1 | `URLSession.bytes` on Linux (settles C2) | In `network-consolidation/`: `SWIFT_VERSION=6.4 run.sh swiftc -typecheck -swift-version 6 bytes/red.swift` exit 1, `bytes/red.swift:7:50: error: value of type 'URLSession' has no member 'bytes'`; `bytes/green.swift` (`URLSession.shared.download(for:)`) exit 0. Identical with `SWIFT_VERSION=6.3`. |
| NC-2 | `URLError` rendering vs SW-ERR-18 (settles C3) | `err/main.swift` prints `URLError(.timedOut).localizedDescription` and `URLError(.cannotFindHost).localizedDescription`: `The operation could not be completed. (NSURLErrorDomain error -1001.)` and `... error -1003.)`, 6.4 and 6.3, run exit 0. SW-ERR-18 check `grep -c 'Error Domain='` gives 0; widened `grep -c -E 'NSURLErrorDomain\|error -[0-9]\|could not be completed'` gives 2. |
| NC-3 | New greps watched | `./v-grep.sh red` exit 1 prints G1b (1 line), G3c (2), G3b (2 shapes), G9c (5), G6b (4), G13 (3); `./v-grep.sh green` exit 0, no output. Planted violations: `.bytes(from:)`, `try? c.syncShutdown()` in `deinit` and in async, `defer { Task { try? await c.shutdown() } }` single and multi line, default and `.init()` configurations, `collect(upTo:)` with `.max`, `1 << 40`, `Int.max`, `10_000_000_000`, `try?` around `execute`/`data(for:)`. |
| NC-4 | The dive's greps re-run | `registry-clients/v-grep.sh red` exit 1 (G1 to G11 all print), `green` exit 0, as recorded. |
| NC-5 | Weaknesses found | The dive's G9 passes a file whose only proxy text is a comment, and passes `// HTTPS_PROXY is handled elsewhere` next to `HTTPClient(eventLoopGroupProvider: .singleton)`; with the comment deleted it flags. The dive's G6 prints 2 of the 4 planted `collect(upTo:)` lines (`1 << 40`, `Int.max`), missing `.max` and `10_000_000_000`; G6b prints 4. |
| NC-6 | Corpus counts (substring, `*.swift`, 40 clones, no worktrees) | `import +AsyncHTTPClient` 103 files in 6 repos; `HTTPClient.shared` 15 files in 3 (vapor 11, async-http-client 3, swiftly 1); `willPerformHTTPRedirection` 8 files in 4 (Alamofire, Nuke, SwiftPM, container-plugin); `timeoutIntervalForResource` 3 files, tuist only; `additionalTrustRoots` 1 file, tuist only; `URLSession` 210 files in 19 repos (the dive said 17); `^ *import FoundationNetworking` 37 files in 8 repos; `withHTTPClient` 4 files in 2 repos; `deadline: .distantFuture` 6 files in 4. AHC `Sources` contain no `User-Agent` outside two DocC examples (`grep -rn -i user-agent` over the dive's AHC checkout). |
| NC-7 | Fleet prior art read | `ocx@5de9d777eb7d`: `crates/ocx_oci/src/transport_policy.rs`, `crates/ocx_oci/src/client/builder.rs:18-30`, `crates/ocx_exit/src/exit_code.rs`, `website/src/docs/reference/environment.md:1174-1221`; `ocx-sdk-python@80136dde4162:src/ocx_sdk/_dist.py:1-47,73,520-523`. |

## Applied to the exemplars and the future consumers

**Strict exemplars already satisfy** (all from [rc §Exemplar evidence]; the audits do not measure network use):

| Rules | Exemplar |
|---|---|
| SW-NET-03 | `async-http-client@017115279d09:Sources/AsyncHTTPClient/RedirectState.swift:139-143` (strips on cross-origin); `swift-package-manager@5546f44a3b52:Sources/Basics/HTTPClient/URLSessionHTTPClient.swift:391-406,202-216` and `swift-container-plugin@a9646b8d4dca:Sources/ContainerRegistry/RegistryClient.swift:107-182` (session-level delegates comparing origin). |
| SW-NET-10, -15 | `containerization@3e7bc39e66b3:Sources/ContainerizationOCI/Client/RegistryClient.swift:55-61,141-143` (separate `tokenClient`, `.disallow`) and `RegistryClient+Token.swift:183-202,217-236` (realm validated, redirect and challenge refused), `:126` (expiry), `:95-96` (60 s default), `:221-222,255` (https-only exchange). |
| SW-NET-11, -17 | `containerization@3e7bc39e66b3:Sources/ContainerizationOCI/Client/RegistryClient+Fetch.swift:37-47` (full `Accept`), `:57-69` (parsed header digest). |
| SW-NET-12 (partly), -07 | `containerization@3e7bc39e66b3:RegistryClient+Fetch.swift:171-190,196-262` (size cap at every chunk, streamed) and `Sources/Containerization/Image/ImageStore/ImageStore+Import.swift:169-182` (ingest dir, UUID temp, digest compare). |
| SW-NET-09 | `containerization@3e7bc39e66b3:Sources/ContainerizationExtras/ProxyUtils.swift:34-58` with `RegistryClient.swift:122-126` (upper case first, `NO_PROXY`). |
| SW-NET-08 | `tuist@2f6ac74754bf:cli/Sources/TuistREAPI/REAPITransport.swift:54` (`additionalTrustRoots`); no exemplar sets `.none`. |
| SW-NET-02 (test code) | `hummingbird@1bd3b407fb47:Tests/HummingbirdHTTP2Tests/HTTP2Tests.swift:38,86,96` (`withHTTPClient`). |
| SW-NET-06 (deliberate) | `vapor@bf77fc69b142:Sources/Vapor/Application.swift:137-139` (`HTTPClient.shared`, decoding gzip on purpose, with a comment). |

**Prominent exemplars violate:**

| Rule | Violation |
|---|---|
| SW-NET-05 | `containerization@3e7bc39e66b3:Sources/ContainerizationOCI/Client/RegistryClient.swift:202` and `RegistryClient+Token.swift:196` pass `deadline: .distantFuture`; `tuist@2f6ac74754bf:swifterpm/Sources/swifterpm/Support.swift:195-207` bounds a transfer with `timeoutIntervalForResource` and builds `swift-crypto` for `.linux` (`Package.swift:26`), so its total bound is not enforced there (the 60 s idle bound still works). |
| SW-NET-04 | containerization builds its clients on the default `Configuration`, whose read timeout is none, so a stalled registry hangs the CLI. |
| SW-NET-02 | `containerization@3e7bc39e66b3:RegistryClient.swift:146-149` (`deinit { _ = client.shutdown() }` on two clients, no await, error dropped); `swiftly@c8cf2e35bfca:Sources/SwiftlyCore/HTTPClient.swift:149-153` (`try? httpClient.syncShutdown()` in `deinit`, blocks the releasing thread). |
| SW-NET-06 | `swiftly@c8cf2e35bfca:Sources/SwiftlyCore/HTTPClient.swift:145` uses `HTTPClient.shared` for toolchain downloads that are later digest-checked (not planted against swiftly). |
| SW-NET-10, -15 | `swift-container-plugin@a9646b8d4dca:Sources/ContainerRegistry/AuthHandler.swift:181-197` sends Basic credentials to whatever realm the challenge names, with no origin check, no cache and no expiry (`:20-60`); `RegistryClient.swift:101-104` picks `http` for `insecure \|\| isLocalRegistry` and `AuthHandler.swift` has no `https` check before sending. |
| SW-NET-12 | `containerization@3e7bc39e66b3:Sources/Containerization/Image/ImageStore/ImageStore+Import.swift:173-176` leaves the staged file on mismatch, publishes with `moveItem` and swallows `NSFileWriteFileExistsError` instead of `link`, no fsync; `RegistryClient+Fetch.swift:238-262` writes straight to the caller's path with `createFile`, and its Linux and macOS branches differ (macOS: unverified: read only). |
| SW-NET-14 | No exemplar has a transport-error renderer: `swift-container-plugin@a9646b8d4dca:RegistryClient.swift:28-45` wraps HTTP statuses only; `containerization@3e7bc39e66b3:RegistryClient.swift:268-282` builds the DNS-failure text and passes the rest through. |
| SW-NET-16 | `containerization@3e7bc39e66b3:RegistryClient.swift:48-54,242-266`: fixed 1 s, 5xx only, no transport-error retry, no `Retry-After`, no jitter. |
| SW-NET-09 | containerization reads upper case first, swiftly lower case first and ignores `NO_PROXY` (`HTTPClient.swift:131-141`). |
| Libraries that forward | `Alamofire@bda9ed57d729:Source/Core/SessionDelegate.swift:202-205` and `Nuke@d5548dd61395:Sources/Nuke/Loading/DataLoader.swift:249-250` hand `willPerformHTTPRedirection` to the caller without stripping; a library contract, not a defect, but a consumer who sets `Authorization` there owns SW-NET-03. |

**New commitments by consumer.**

- **A Swift SDK wrapping the `ocx` CLI** (`ocx-sdk-python` mould). `SW-API-14` resolves the binary and the SDK does no HTTP of its own, so SW-NET binds it only if it adds a bootstrap downloader. Python does: `_dist.py` and `_bootstrap.py` use `urllib` with credentials bound to an origin, redirects https-only and capped at `MAX_REDIRECTS = 5` (`_dist.py:73,520-523`), a named `User-Agent`, size-capped reads and per-attempt cleanup. A Swift downloader would owe SW-NET-03, -05, -06, -07, -12, -14 and the https-only redirect rule. Owner decision Q-N1 below; `URLSession` is the only in-budget client under owner Q4 and it always decodes `Content-Encoding`.
- **Swift CLIs in the `ocx` and `grimoire` mould** that talk to registries: all fourteen MUSTs, plus parity with `ocx`: proxy variables and `NO_PROXY` forms (SW-NET-09), the CA path (SW-NET-08), the 69/75/79/80 split (SW-NET-18), the retry ladder (SW-NET-16) and the timeouts (SW-NET-04).
- **OCI tooling in the `apple/containerization` mould**: containerization is the best Swift prior art and violates SW-NET-02, -04, -05, -12, -14, -16 as listed; copy its realm, expiry, `Accept` and header-digest code, not its lifetime and timeout code.
- **Servers** (Hummingbird, Vapor) as HTTP clients: SW-NET-02, -03, -04 bind; `HTTPClient.shared` is acceptable for non-hashed traffic (Vapor). Inbound limits and parser caps are SW-SEC.
- **Apple apps**: `URLSession` is the platform client, and its Darwin redirect, proxy, trust-store and resource-timeout behaviour is unverified: read only. SW-NET-01 and SW-NET-03 still bind any file that also compiles on Linux.
- **Test code**: build clients with `withHTTPClient`; bind fixture servers to port 0 (SW-TEST-19); run the lifetime check in a debug build; the redirect, stall, self-signed and wrong-realm servers of the dive are the fixtures to port.

## AI-agent failure modes

Ranked by estimated frequency times blast radius; the fleet has no Swift code and no corpus count of agent output exists, so the order is a judgement from [rc §AI-agent angle], not a measurement.

| Rank | Failure | Why it compiles and misleads | Mechanical check |
|---|---|---|---|
| 1 | `URLSession.shared.data(for: requestWithBearer)` for a registry; "adds" a per-call `delegate:` or `httpAdditionalHeaders` as the safe place | Works on macOS; on Linux it leaks to another host and port and breaks on CDN redirects (400) | G1, G2; redirect test (SW-NET-03) |
| 2 | Prints `error.localizedDescription` or `"\(error)"` for a network failure | Compiles; shows `(NSURLErrorDomain error -1001.)`, `(AsyncHTTPClient.HTTPClientError error 1.)`, a build path | stderr pattern per failure class, G10 (SW-NET-14) |
| 3 | `HTTPClient(eventLoopGroupProvider: .singleton)` with no shutdown, or `defer { Task { try? await client.shutdown() } }`, or `syncShutdown()` | Runs in release; traps in debug tests; the task may never run | G3, G3b, G3c; debug `swift test` (SW-NET-02) |
| 4 | `execute(request, timeout: .seconds(30))` believed to cap the download; `timeoutIntervalForResource = 30` | Head-only bound; no-op on Linux | G4a, G4c; trickle plant (SW-NET-05) |
| 5 | Default `HTTPClient.Configuration` | No read timeout; no proxy; no explicit redirect policy | G9c, G4b; stall plant (SW-NET-04) |
| 6 | `collect(upTo: .max)`, `1 << 40`, or `URLSession.data(from:)` for a layer | "Bounded" in name only; 2 GiB RSS for 1 GiB | G6b; RSS gate (SW-NET-07) |
| 7 | `URLSession.bytes(for:)` to stream | Exists on Apple; build fails only in the Linux job | `swift build`, G1b (SW-NET-01) |
| 8 | Assumes AHC honours `HTTPS_PROXY`; sets `SSL_CERT_FILE` or `certificateVerification = .none` for a private CA | Env ignored, direct connect; `.none` disables security | proxy-log test; G7 (SW-NET-08, -09) |
| 9 | `HTTPClient.shared` or `URLSession` for blobs | Decompression on; hash mismatches only behind gzip-encoded CDNs | G8, G11; gzip plant (SW-NET-06) |
| 10 | Fetches a token per request, or sends credentials to the `realm` it was handed | Rate limits and exfiltration | two-listener test (SW-NET-10, -15) |
| 11 | Manifest request with no `Accept` or Docker v2 only | `registry:2` answers 404, read as "not found" | `verify-manifest.sh` (SW-NET-11) |
| 12 | Writes `blobs/<digest>` first and compares after | Mismatch and truncation leave a file under a digest name | `find <store> -type f` after a failing fetch (SW-NET-12) |
| 13 | `try? await` around `execute`/`data(for:)`, with fixed `sleep(1)` retries | Swallows cancellation and every error class | G13; SW-CONC-17 (SW-NET-13, -16) |
| 14 | Invents `HTTPClient.Configuration.timeout = .seconds(30)`, `request.timeout`, `HTTPClientRequest.timeoutInterval`, `EventLoopGroupProvider.createNew` | Not APIs (AHC has `Timeout(connect:read:write:)` and per-call `timeout:`/`deadline:`); `createNew` is deprecated | `swift build` (the deprecation warning is not planted) |
| 15 | Stores `Docker-Content-Digest` as the blob's digest | Trusts the registry's claim; may be absent or another algorithm | SW-IO-13 and SW-IO-30 checks (SW-NET-17) |
| 16 | Compares `URLError.code == .secureConnectionFailed` for TLS | On Linux TLS failures are code -1 (`.unknown`) | reading: the renderer switches on type, code and text (SW-NET-14) |

## Open questions

Owner decisions (the program applies the default until overturned):

- **Q-N1. Does the Swift SDK carry a bootstrap downloader?** Default: no, in v1 (it resolves the binary, `SW-API-14`). If yes: AHC in an optional target, because `URLSession` always decodes `Content-Encoding` (a gzip tarball behind a CDN header cannot be hash-checked) and has no streaming API; that would amend owner Q4 ("stdlib + swift-subprocess only").
- **Q-N2. Timeout and retry numbers.** Default: `ocx` parity (connect 30 s, idle read 120 s, 3 attempts, 250 ms base, 3 s cap, full jitter, `Retry-After` clamp 30 s). Say if you prefer the dive's 10 s / 30 s / 60 s with 1 s, 2 s, 8 s.
- **Q-N3. `SSL_CERT_FILE` semantics.** Default: additive through `additionalTrustRoots` (measured green); `ocx` makes the variable replace host-store discovery while keeping the bundled Mozilla roots, which a Swift binary cannot copy without bundling roots. `SSL_CERT_DIR` and an extra-CA option are not implemented by default.
- **Q-N4. Proxy precedence.** Default: upper case first (conflict C4). Overturn only if the CLI should match `curl` rather than `ocx`.
- **Q-N5. Amendments in sibling consolidations.** Default: the orchestrator folds them when authoring `errors.md` and `security.md`: SW-SEC-03 network branch (C2) and the `URLError` branch plus widened check of SW-ERR-18/20 (C3). This file does not edit them.

Another research round, by subarea:

1. **Blob push (upload) flows.** No plant or exemplar covers `POST` session start, chunked `PATCH` with `Content-Range`, the finalising `PUT ?digest=`, cross-repo mount, or the `Location` redirect on upload. Question: which of SW-NET-03, -05 and -16 change for an upload, and how does a throttled uplink interact with the 120 s idle read (`ocx` sets it for exactly that, `builder.rs:18-22`)? A registry SDK or CLI that pushes needs this.
2. **TLS through a `CONNECT` proxy, end to end.** The plant proxy answers `CONNECT` with 502. Question: does AHC 1.36.2 complete an https request through `Proxy.server` with a CONNECT-capable proxy (and a proxy with `Proxy-Authorization`), and does `NO_PROXY` by suffix or CIDR behave as `ocx` documents?
3. **Real-registry behaviour.** `Accept` handling, `429` with `Retry-After`, token lifetime and presigned-redirect shapes were measured on `registry:2` 2.8.3 and Python fixtures only. Question: do Docker Hub, GHCR and ECR match, and is the OAuth2 refresh-token flow (no Swift exemplar implements it) needed?
4. **Static musl trust store.** Raised by the release consolidation (`swift-release.md:278`): where do `URLSession`, AHC and swift-nio-ssl look for CA certificates in a static musl binary in `FROM scratch`, and what must the image copy? `ocx` bundles Mozilla roots for exactly this case (`environment.md:1176`).
5. **Darwin and Windows legs.** `URLSession` cross-origin redirect behaviour on Darwin, whether `timeoutIntervalForResource` is honoured there, and AHC or FoundationNetworking availability on Windows: all need a macOS or Windows runner (owner Q7).

## Sub-artifacts

- [registry-clients.md](swift-network/registry-clients.md): HTTP client choice on Linux, credentials on redirect, the bearer-token flow, manifest negotiation, timeouts and retries, `HTTPClient` lifetime, streamed and verified blobs, 1 GiB memory behaviour, proxy and TLS, cancellation and `URLError` rendering, with 60 planted checks per toolchain (29 red, 31 green).

## Key sources

1. https://github.com/swift-server/async-http-client — AHC README: shutdown rule, redirects (stale sentence), timeouts, `HTTPClient.shared`.
2. https://github.com/swift-server/async-http-client/blob/017115279d09/Sources/AsyncHTTPClient/RedirectState.swift — cross-origin header stripping (`:139-143`).
3. https://github.com/swift-server/async-http-client/blob/1.36.2/Sources/AsyncHTTPClient/HTTPClient.swift — `Configuration.Timeout`, the `deinit` precondition (`:211`), `shutdown`, `EventLoopGroupProvider` deprecation.
4. https://github.com/swift-server/async-http-client/blob/1.36.2/Sources/AsyncHTTPClient/AsyncAwait/HTTPClient%2Bexecute.swift — the deadline task cancelled at the response head (`:165-180`).
5. https://github.com/swift-server/async-http-client/blob/1.36.2/Sources/AsyncHTTPClient/Configuration%2BBrowserLike.swift — `HTTPClient.shared` configuration.
6. https://github.com/swift-server/async-http-client/blob/1.36.2/Sources/AsyncHTTPClient/HTTPClient%2BStructuredConcurrency.swift — `withHTTPClient`.
7. https://github.com/opencontainers/distribution-spec/blob/main/spec.md — redirect and `Authorization` (line 829), `Accept`, `Docker-Content-Digest`, 4 MB manifests.
8. https://distribution.github.io/distribution/spec/auth/token/ — challenge, realm, scope, `expires_in` default 60 s.
9. https://github.com/swiftlang/swift-corelibs-foundation/blob/384ff680be7c/Sources/FoundationNetworking/URLSession/HTTP/HTTPURLProtocol.swift — why the per-task delegate never sees a redirect (`:453-501`).
10. https://github.com/swiftlang/swift-corelibs-foundation/blob/384ff680be7c/Sources/FoundationNetworking/URLSession/URLSessionConfiguration.swift — `timeoutIntervalForResource` declared and unused.
11. https://github.com/swiftlang/swift-corelibs-foundation/blob/384ff680be7c/Sources/FoundationNetworking/URLSession/libcurl/EasyHandle.swift — CA bundle only under Android (`:205-221`), proxy TODO (`:305`).
12. https://fetch.spec.whatwg.org/#http-redirect-fetch — `Authorization` removed when the origin changes.
13. https://www.rfc-editor.org/rfc/rfc9110 — idempotent methods (section 9.2.2), `Retry-After` (section 10.2.3).
14. https://github.com/apple/containerization/blob/3e7bc39e66b3/Sources/ContainerizationOCI/Client/RegistryClient%2BToken.swift — realm validation, expiry, https-only exchange.
15. https://github.com/swiftlang/swift-package-manager/blob/5546f44a3b52/Sources/Basics/HTTPClient/URLSessionHTTPClient.swift — the reference session-level strip delegate.
