---
title: "Registry clients on Swift 6.4 (Linux): HTTP client choice, credentials, timeouts, token auth, streamed blobs, URLError rendering"
topic: network/registry-clients (SW-NET, revised W3-4; rows M-H-01..M-H-10, M-G-20, URLError rendering follow-up)
agent: W3-4 registry-clients
model: sonnet
date_researched: 2026-10-10
sources_count: 26
fixtures: /home/mherwig/.cache/research-lang/swift-tools/fixtures/registry-clients/
scope: >
  Covers the HTTP client for OCI registry work on Linux (AsyncHTTPClient 1.36.2 vs URLSession/FoundationNetworking in Swift 6.4 and 6.3), credential handling across redirects, the Docker/OCI bearer-token flow, timeouts, retries, HTTPClient lifetime, streamed blob download and verification, 1 GiB memory behaviour, proxy and TLS configuration, cancellation, and rendering network errors as one clean sentence.
  Does NOT re-derive SW-CONC-24 (timeout race), SW-IO-02 (FoundationNetworking guard), SW-IO-13 (digest parse), SW-IO-19 (CAS publish), SW-IO-30 (hash received bytes) or SW-ERR-20 (error shape); it imports them by ID.
  Linux only (swift:6.4 and swift:6.3 images, registry:2 2.8.3, Python fixture servers). Anything about Darwin or Windows is marked "unverified: read only".
---

# Registry clients on Swift 6.4 (Linux)

Date 2026-10-10. Toolchains: `swift:6.4` (default) and `swift:6.3` via `run.sh`; every plant was run on both and the two logs are identical in outcome (60/60 checks on each). Libraries pinned in the throwaway package ([`rc/Package.swift`](file:///home/mherwig/.cache/research-lang/swift-tools/fixtures/registry-clients/rc/Package.swift)): `async-http-client` exact 1.36.2, `swift-crypto` exact 4.5.2, `swift-nio` from 2.100.0, `swift-nio-ssl` from 2.30.0, `.swiftLanguageMode(.v6)`.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   - 2.1 Method and what "red" means here
   - 2.2 Client choice on Linux (M-H-01)
   - 2.3 Credentials on redirect (M-H-02)
   - 2.4 Bearer-token flow, realm, caching (M-H-04)
   - 2.5 Manifest negotiation and `Docker-Content-Digest` (M-H-09)
   - 2.6 Timeouts: what each knob really bounds (M-H-03)
   - 2.7 Retries (M-H-03)
   - 2.8 `HTTPClient` lifetime (M-H-05)
   - 2.9 Streamed blobs, verification before publish (M-H-06)
   - 2.10 Large files without `Data` (M-G-20)
   - 2.11 Content-Encoding trap and `HTTPClient.shared`
   - 2.12 Proxy environment (M-H-07)
   - 2.13 TLS and custom CAs (M-H-08)
   - 2.14 Cancellation (M-H-10)
   - 2.15 Rendering `URLError` and friends
   - 2.16 APIs that do not exist or are unavailable
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- Use AsyncHTTPClient (`HTTPClient`) for every registry request that carries a credential, streams a body, or needs TLS or proxy control; `URLSession` is acceptable on Linux only for unauthenticated small requests, or with a session-level redirect delegate (Swift 6.4 and 6.3, measured).
- On Linux, `URLSession` forwards a hand-set `Authorization: Bearer SECRET` header to a different host and to a different port (red, 6.4 and 6.3); `httpAdditionalHeaders` leaks the same way; a per-task `delegate:` argument of `data(for:delegate:)` does NOT receive the redirect callback and does not fix it; only a session-level `URLSessionTaskDelegate.willPerformHTTPRedirection` strips it.
- AsyncHTTPClient strips `Origin`, `Cookie`, `Authorization` and `Proxy-Authorization` on a cross-origin redirect (green) and its default `HTTPClient.Configuration()` follows redirects (302 became 200 in the plant); the README sentence that custom clients must opt in is stale.
- Run the bearer-token exchange on a second `HTTPClient` with `redirectConfiguration = .disallow`, require the challenge realm to have the registry's own scheme, host and port (https unless explicitly opted out), and cache the token per scope until `expires_in` (default 60 s); the naive flow sent Basic credentials to a foreign realm host and fetched 4 tokens for 4 requests.
- Every manifest request needs an explicit `Accept` list; registry:2 2.8.3 answers an OCI manifest requested with no `Accept` (or with docker v2 only) with HTTP 404, not 406.
- AHC's default `HTTPClient.Configuration` has NO read timeout (connect defaults to 10 s); a server that stalls mid-body held the client for the full 20 s of the fixture, so always set `read:`.
- `execute(_:deadline:)` / `execute(_:timeout:)` bounds time to the response head only: the deadline task is cancelled when the head arrives (`HTTPClient+execute.swift:173-177`); a 3 s deadline did not stop a body trickling for 7.5 s. A total-transfer cap needs the SW-CONC-24 structured race (measured: stopped at 3.00 s).
- `URLSessionConfiguration.timeoutIntervalForResource` is a no-op in FoundationNetworking on Linux 6.4/6.3 (3 s resource timeout, 7.5 s transfer completed; the identifier appears only in the configuration class in the five protocol and session files read); `timeoutIntervalForRequest` works as an idle timeout.
- An `HTTPClient` that is released without `shutdown()` traps in debug builds (`HTTPClient.swift:211` "Client not shut down before the deinit", exit 132) and leaks silently in release; `HTTPClient.withHTTPClient { }` guarantees shutdown; `syncShutdown()` in an `async` context is a compile error; `HTTPClient.shared.shutdown()` throws `shutdownUnsupported`.
- `HTTPClient.shared` is a browser-like client: decompression enabled (ratio 25), 90 s connect and read, up to 20 redirects. It therefore hands you DECODED bytes for a `Content-Encoding: gzip` blob, so a digest over them never matches the registry digest; use your own client with `decompression: .disabled` (default) for blobs.
- A blob writer that opens the digest-named path and compares afterwards leaves `blobs/sha256:…` behind on mismatch and on truncation (red); the SW-IO-19 recipe (stage, size-cap, hash while writing, compare, `link`, 0444, fsync) leaves nothing (green); containerization's `ImageStore+Import.fetchBlob` stages and compares but does not unlink the staged file on mismatch.
- 1 GiB to disk, peak RSS (`/usr/bin/time -v`, release build, 6.4): `collect(upTo:)` + `Data` 1058 MiB, `URLSession.data` 2095 MiB, AHC `for try await` chunk loop 35 MiB, AHC `FileDownloadDelegate` 36 MiB, `URLSession.download(for:)` 39 MiB (but 7.5 s vs 1.2 s for the AHC loop).
- `URLSession.bytes(for:)` / `AsyncBytes` does not exist in FoundationNetworking (compile error `value of type 'URLSession' has no member 'bytes'`, 6.4 and 6.3), so there is no streaming API for URLSession on Linux other than `download(for:)` and delegates.
- AHC 1.36.2 reads no proxy environment variable; set `HTTPClient.Configuration.proxy` yourself (HTTPS_PROXY, HTTP_PROXY, lowercase fallbacks, NO_PROXY). `URLSession` on Linux (libcurl) honours lowercase `http_proxy` only; uppercase `HTTP_PROXY` is ignored.
- Neither client reads `SSL_CERT_FILE`. AHC trusts a private CA through `TLSConfiguration.additionalTrustRoots = [.file(path)]`; URLSession on Linux has no working environment route (`URLSessionCertificateAuthorityInfoFile` is compiled only for Android), so a private CA means installing it in the system store.
- Network failures must be rendered by one `render(_:)` helper, never `error.localizedDescription`: the timeout string is `The operation could not be completed. (NSURLErrorDomain error -1001.)` and every AHC/NIO error is `(AsyncHTTPClient.HTTPClientError error 1.)`-shaped; the helper keys on type and `URLError.code`, and the green output is `127.0.0.1: timed out`.
- Cancellation of a stalled body propagated within 1.00 s for both clients (AHC surfaces `CancellationError`, URLSession `URLError(.cancelled)` -999); never retry a cancelled request.

## Findings

### 2.1 Method and what "red" means here

Fixture directory [`fixtures/registry-clients/`](file:///home/mherwig/.cache/research-lang/swift-tools/fixtures/registry-clients/): `setup.sh` starts `registry:2` (2.8.3) on 127.0.0.1:5000 and Python fixture servers ([`servers/srv.py`](file:///home/mherwig/.cache/research-lang/swift-tools/fixtures/registry-clients/servers/srv.py): redirecting `web` 8101 and `web2` 8102, a token registry 8103, a registry whose challenge points at another origin 8104, a credential-logging "evil" token server 8105, a logging proxy 8110, a self-signed TLS server 8443); `build-all.sh` builds the `rc` package (debug+release, 6.4 and 6.3, each with `--scratch-path $SWIFT_SCRATCH/registry-clients[-63]`); `verify.sh` runs every plant and prints one line per check. A check's OUTPUT is the violation; the check "fails" (exit 1) when it prints something. A verification is admissible only if it went red (exit 1) on the violation and green (exit 0) on the twin; those lines are in "Verification runs". `rc/` is a throwaway package; nothing was built in an exemplar.

### 2.2 Client choice on Linux (M-H-01)

| Property (Swift 6.4 Linux, AHC 1.36.2) | AsyncHTTPClient | URLSession / FoundationNetworking |
|---|---|---|
| Authorization on cross-origin redirect | stripped ([`RedirectState.swift:139-143`](https://github.com/swift-server/async-http-client/blob/017115279d09/Sources/AsyncHTTPClient/RedirectState.swift)) | forwarded unless a session delegate strips it (2.3) |
| Streaming a response body | `for try await buf in response.body` with back-pressure | no `bytes(for:)`; `download(for:)` or delegate only (2.16) |
| Read/idle timeout default | none (`HTTPClient.swift:876`: "defaults to no read timeout and 10 seconds connect") | `timeoutIntervalForRequest` 60 s ([`URLSessionConfiguration.swift:63`](https://github.com/swiftlang/swift-corelibs-foundation/blob/384ff680be7c/Sources/FoundationNetworking/URLSession/URLSessionConfiguration.swift)) |
| Total-transfer timeout | none; compose with SW-CONC-24 | `timeoutIntervalForResource` (604800 s default) is not implemented on Linux (2.6) |
| Proxy from environment | not read (2.12) | libcurl: lowercase `http_proxy`, `https_proxy`, `no_proxy` |
| Private CA | `additionalTrustRoots` per client (2.13) | system store only |
| Needs lifetime management | yes: `shutdown()` (2.8) | no |
| Backing stack | SwiftNIO + BoringSSL (swift-nio-ssl) | libcurl (the static-SDK article: "Foundation Networking uses libcurl and libcurl uses libz", [swift.org](https://www.swift.org/documentation/articles/static-linux-getting-started.html)) |
| Decompression default | disabled in `Configuration`, enabled in `HTTPClient.shared` | always on |

Decision (M-H-01): AHC for registry work. The fleet's Rust prior art (ocx, grimoire) and Swift OCI prior art agree on the shape: containerization and swiftly use AHC ([`RegistryClient.swift:61,142`](https://github.com/apple/containerization/blob/3e7bc39e66b3/Sources/ContainerizationOCI/Client/RegistryClient.swift), [`swiftly HTTPClient.swift:131-151`](https://github.com/swiftlang/swiftly/blob/c8cf2e35bfca/Sources/SwiftlyCore/HTTPClient.swift)); swift-container-plugin and SwiftPM use URLSession and each carries a redirect delegate that strips `Authorization` ([`container-plugin RegistryClient.swift:107-182`](https://github.com/apple/swift-container-plugin/blob/a9646b8d4dca/Sources/ContainerRegistry/RegistryClient.swift), [`SwiftPM URLSessionHTTPClient.swift:391-406`](https://github.com/swiftlang/swift-package-manager/blob/5546f44a3b52/Sources/Basics/HTTPClient/URLSessionHTTPClient.swift)). The consequence of choosing URLSession is that the delegate becomes mandatory code, and that every other row of the table above (streaming, timeouts, CA, proxy) needs a workaround.

### 2.3 Credentials on redirect (M-H-02) — plant (a)

Chase-the-surprise: the topic map's claim reproduced, and was broader than stated. Server: `/redir` answers 302 to a different host (`127.0.0.1:8101` to `localhost:8101`), `/redir-port` to a different port (`127.0.0.1:8102`), `/echo` prints the `Authorization` it received. Client `rc redir <variant> <url>` sets `Authorization: Bearer SECRET` by hand. Swift 6.4, identical on 6.3:

```text
urlsession:                         status=200 path=/echo host=localhost:8101 auth=Bearer SECRET   (red)
urlsession+pertask-delegate:        status=200 path=/echo host=localhost:8101 auth=Bearer SECRET   (red)
urlsession+httpAdditionalHeaders:   status=200 path=/echo host=localhost:8101 auth=Bearer SECRET   (red)
urlsession (different port):        status=200 path=/echo host=127.0.0.1:8102 auth=Bearer SECRET   (red)
urlsession+session delegate:        status=200 path=/echo host=localhost:8101 auth=NONE            (green)
ahc (default Configuration):        status=200 path=/echo host=localhost:8101 auth=NONE            (green)
ahc (HTTPClient.shared):            status=200 path=/echo host=localhost:8101 auth=NONE            (green)
ahc same-origin (/redir-same):      auth=Bearer SECRET   (kept, correct)
```

Mechanism, read from [`HTTPURLProtocol.swift:453-501`](https://github.com/swiftlang/swift-corelibs-foundation/blob/384ff680be7c/Sources/FoundationNetworking/URLSession/HTTP/HTTPURLProtocol.swift): `redirectFor(request:)` calls `willPerformHTTPRedirection` only `if let delegate = task?.delegate`; otherwise it takes the `else` branch and calls `startNewTransfer(with: session._configuration.configure(request: request))`, so libcurl re-issues the request with the headers of the redirected `URLRequest` untouched. The delegate argument of `data(for:delegate:)` is stored as `.dataCompletionHandlerWithTaskDelegate(…, delegate)` ([`URLSession.swift:735-750`](https://github.com/swiftlang/swift-corelibs-foundation/blob/384ff680be7c/Sources/FoundationNetworking/URLSession/URLSession.swift)) and in the plant never produced the redirect callback (red above). Only a delegate passed to `URLSession(configuration:delegate:delegateQueue:)` works.

The registry-shaped consequence is also reproduced: `a.s3-400` serves a registry that answers a blob GET with 307 to a "CDN" that rejects any request carrying `Authorization` (`status=400 <Error>InvalidRequest: Missing x-amz-content-sha256</Error>`, the Docker Hub to S3 behaviour swift-container-plugin documents at `RegistryClient.swift:146-151`). URLSession without delegate: 400 (red); URLSession with the strip delegate and AHC: 200 with the CDN seeing no credential (green).

Standards: the OCI Distribution Spec says clients "MUST NOT forward `Authorization` headers across host boundaries unless explicitly configured to do so" ([spec.md line 829](https://github.com/opencontainers/distribution-spec/blob/main/spec.md)); the Fetch spec's HTTP-redirect-fetch removes `Authorization` the moment the origin changes ([fetch.spec.whatwg.org](https://fetch.spec.whatwg.org/#http-redirect-fetch)). Note both use origin (scheme+host+port), and the plant shows a port-only change leaks on URLSession. AHC compares `hasTheSameOrigin`.

The strip delegate, as run (and as SwiftPM ships it), compares scheme, host and port:

```swift
// WRONG on Linux: leaks to every redirect target
let (d, _) = try await URLSession(configuration: .ephemeral).data(for: authorized)
let (d, _) = try await URLSession.shared.data(for: authorized, delegate: strip)   // delegate never called

// RIGHT (only if URLSession is unavoidable): session-level delegate, origin compare
final class StripAuth: NSObject, URLSessionTaskDelegate, @unchecked Sendable {   // stateless
    func urlSession(_ s: URLSession, task: URLSessionTask, willPerformHTTPRedirection r: HTTPURLResponse,
                    newRequest q: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) {
        var q = q
        if let from = r.url, let to = q.url, !(from.scheme == to.scheme && from.host == to.host && from.port == to.port) {
            q.allHTTPHeaderFields = q.allHTTPHeaderFields?.filter { $0.key.lowercased() != "authorization" }
        }
        completionHandler(q)
    }
}
let session = URLSession(configuration: .ephemeral, delegate: StripAuth(), delegateQueue: nil)
```

Apple platforms: Darwin `URLSession` behaviour on cross-origin redirects is unverified: read only (no macOS here). Windows: unverified: read only.

### 2.4 Bearer-token flow, realm, caching (M-H-04) — plant (k)

Flow, from the [Docker token spec](https://distribution.github.io/distribution/spec/auth/token/) and [OCI spec](https://github.com/opencontainers/distribution-spec/blob/main/spec.md): (1) request `/v2/…` unauthenticated; (2) a 401 carries `WWW-Authenticate: Bearer realm="…",service="…",scope="repository:<name>:pull"`; (3) GET `realm?service=…&scope=…` (optionally `client_id`) with HTTP Basic credentials if the user has any, else anonymously; (4) the JSON answer has `token` and/or `access_token` ("at least one … must be specified"), optional `expires_in` ("When omitted, this defaults to 60 seconds"; a token is "never … less than 60 seconds"), optional `issued_at` and `refresh_token`; (5) retry the original request with `Authorization: Bearer <token>`. The OAuth2 `POST` variant with `refresh_token` is documented separately ([oauth](https://distribution.github.io/distribution/spec/auth/oauth/)); none of the three Swift exemplars implement it.

Three failures were planted against a minimal client ([`Auth.swift`](file:///home/mherwig/.cache/research-lang/swift-tools/fixtures/registry-clients/rc/Sources/rc/Auth.swift), `RegistryAuth` actor; `naive` vs `strict` mode):

1. Realm confusion. `evilreg` (8104) is a registry whose challenge says `realm="http://127.0.0.1:8105/token"`. The naive client fetched the token there and sent the user's credentials: the "evil" server logged `/token?client_id=rc-fixture&service=fake&scope=repository:x/y:pull Authorization=Basic dTpw` (red). The strict client throws `authorization server 127.0.0.1:8105 is not the registry 127.0.0.1:8104` and nothing reaches 8105 (green). Mirrors containerization's `validateRealm` ([`RegistryClient+Token.swift:217-236`](https://github.com/apple/containerization/blob/3e7bc39e66b3/Sources/ContainerizationOCI/Client/RegistryClient%2BToken.swift): https on both endpoints, same registrable domain, same host and port) which post-dates the domain note that only mentioned `.disallow`.
2. Redirecting token endpoint. A token request that is redirected moves a credential-bearing request to another host; the strict client's token `HTTPClient` has `redirectConfiguration = .disallow` and treats any 3xx as an error ([`Auth.swift` `token(for:)`](file:///home/mherwig/.cache/research-lang/swift-tools/fixtures/registry-clients/rc/Sources/rc/Auth.swift); containerization `RegistryClient.swift:141-143` and `+Token.swift:196-199`).
3. No token cache. Naive: `token fetched 4 times for 3 requests + 1 blob` (stats endpoint of `tokenreg`; red); strict, cached per `scope` until `expires_in` (default 60 s): 1 fetch (green). The container-plugin `AuthHandler.swift` has no cache or expiry handling at all (no `expires` use outside the decoder, `AuthHandler.swift:20-60`); containerization checks expiry (`+Token.swift:126`).

The same plant also covers plain-http safety: the strict client refuses a token exchange unless both endpoints are https or the caller passed `allowInsecure` explicitly (containerization `+Token.swift:221-222,255` throws `insecureCredentialExchange`).

### 2.5 Manifest negotiation and `Docker-Content-Digest` (M-H-09)

Spec: "The client SHOULD include an `Accept` header indicating which manifest content types it supports"; `Docker-Content-Digest` "MUST" be present on successful manifest and blob-upload responses, "MAY differ from the provided digest" if the algorithm differs, and clients may meet older registries that omit it ([spec.md](https://github.com/opencontainers/distribution-spec/blob/main/spec.md)). Measured on `registry:2` 2.8.3, repo `rc/img` holding an OCI image manifest ([`verify-manifest.sh`](file:///home/mherwig/.cache/research-lang/swift-tools/fixtures/registry-clients/verify-manifest.sh)):

```text
GET  rc/img/manifests/v1, no Accept                       -> HTTP 404   (red, exit 1)
HEAD rc/img/manifests/sha256:…, no Accept                 -> HTTP 404   (red)
GET  … Accept: application/vnd.docker.distribution.manifest.v2+json only -> HTTP 404 (red)
GET/HEAD … Accept: oci manifest, oci index, docker v2, docker list       -> 200 (green, exit 0)
Docker-Content-Digest == "sha256:" + sha256(body) for the OCI manifest   -> match (green, exit 0)
```

So an absent or too-narrow `Accept` surfaces as a misleading "not found". containerization sends `docker manifest, docker list, oci manifest, oci index, */*` on `resolve` ([`+Fetch.swift:37-47`](https://github.com/apple/containerization/blob/3e7bc39e66b3/Sources/ContainerizationOCI/Client/RegistryClient%2BFetch.swift)) and then validates the header digest with a parser before using it as a URL and path component (`+Fetch.swift:57-69`, SW-IO-13). The header digest is a hint; the digest that matters is the one computed over the received bytes (SW-IO-30). The "red" for a lying header was not planted: registry:2 always returns a matching header, so the `digest-header` check is green-only (reported as such).

### 2.6 Timeouts: what each knob really bounds (M-H-03) — plant (f)

Server behaviours: `/hang` (accept, never answer), `/slowbody` (head + 1 KiB, then silence for 20 s), `/trickle` (head, then 1 byte per 0.5 s for 8 s). Results, 6.4 (6.3 identical), from `rc timeouts`, `rc timeouts2`, `rc stall`:

| Configuration | Scenario | Observed |
|---|---|---|
| AHC `Timeout(read: 1 s)` | steady trickle | completed in 7.54 s (read timeout is an idle gap, resets on each byte) |
| AHC `Timeout(read: 1 s)` | stall after 1 KiB | `HTTPClientError.readTimeout` after 1.00 s |
| AHC no read timeout, `execute(deadline: 3 s)` | no response (hang) | `HTTPClientError.deadlineExceeded` after 3.00 s |
| AHC `execute(deadline: 3 s)` | steady trickle | completed in 7.50 s (deadline NOT enforced on the body) |
| AHC `execute(deadline: 1 s)` | stall after 1 KiB | no timeout within the 5 s guard (red) |
| AHC defaults | stall after 1 KiB | no timeout within the 5 s guard (red) |
| URLSession `timeoutIntervalForRequest = 1` | stall / trickle | `URLError(.timedOut)` after 1.00 s / completed 7.51 s (idle timeout) |
| URLSession `timeoutIntervalForResource = 3` | steady trickle | completed in 7.50 s (red: not enforced); stall: no timeout within 5 s (red) |
| `withTimeout(.seconds(3))` race (SW-CONC-24 shape) around either client | steady trickle | `timed out` after 3.00 s (green) |

Why the deadline does not cover the body: [`HTTPClient+execute.swift:165-180`](https://github.com/swift-server/async-http-client/blob/1.36.2/Sources/AsyncHTTPClient/AsyncAwait/HTTPClient%2Bexecute.swift) schedules `deadlineTask` on the event loop and cancels it in a `defer` as soon as `executeCancellable` returns the `HTTPClientResponse`, i.e. at the head. `execute(_:timeout:)` is `deadline: .now() + timeout` (line 77). The README's description ("Timeouts (connect and read)") is accurate; its examples that pass `timeout: .seconds(30)` read like a total cap and are not.

Why `timeoutIntervalForResource` does nothing: in swift-corelibs-foundation @384ff680be7c the identifier appears in `URLSessionConfiguration.swift` (declaration, `init`, copy) and nowhere in `HTTPURLProtocol.swift`, `NativeProtocol.swift`, `EasyHandle.swift`, `URLSession.swift` or `URLSessionTask.swift` (grep over the fetched files); `timeoutIntervalForRequest` is read at `HTTPURLProtocol.swift:411-434` and arms a `_TimeoutSource`. The default 604800 s (7 days) is therefore the real total cap. Contradicting exemplar: tuist's `swifterpm` configures a 600 s resource timeout to bound stalls ([`Support.swift:195-207`](https://github.com/tuist/tuist/blob/2f6ac74754bf/swifterpm/Sources/swifterpm/Support.swift)) and compiles `swift-crypto` for `.linux` (`Package.swift:26`), so on Linux its intended total bound is not enforced by the OS; the idle timeout (60 s) still works.

Defaults to adopt (decision): `connect` 10 s (AHC's own default; keep explicit), `read` 30 s idle for manifests/tokens/tags and 60 s for blobs (a slow CDN may pause between chunks), head deadline 30 s (`execute(…, timeout:)`), and a total budget by a structured race: manifests, tags, tokens 60 s; blobs `max(60 s, size / 1 MiB/s)` as a floor throughput of 1 MiB/s, adjustable by a flag. These figures are decisions; the measured facts are the semantics above. `containerization` passes `deadline: .distantFuture` on both data and token requests (`RegistryClient.swift:202`, `+Token.swift:196`) and relies on the default client timeouts (none for read), so a stalled registry hangs the CLI.

### 2.7 Retries (M-H-03)

Observed prior art: containerization retries up to 3 times, fixed 1 s, only when `status.code >= 500` (`RegistryClient.swift:48-54, 256-266`), never on transport errors; swiftly and container-plugin do not retry; AHC does not retry on its own. RFC 9110 defines idempotent methods (GET, HEAD, PUT, DELETE, OPTIONS, TRACE, [§9.2.2](https://www.rfc-editor.org/rfc/rfc9110#section-9.2.2)) and `Retry-After` ([§10.2.3](https://www.rfc-editor.org/rfc/rfc9110#section-10.2.3)). Decision (design, not measured): retry only idempotent requests (GET, HEAD, blob-content PUT with digest, manifest PUT by digest, DELETE); retry on `HTTPClientError.connectTimeout`, `.remoteConnectionClosed`, `NIOConnectionError`, and HTTP 429, 502, 503, 504; at most 3 attempts in total; exponential backoff 1 s, 2 s with ±20 % jitter, cap 8 s; honour `Retry-After` up to 30 s; never retry 401 more than once (token refresh), other 4xx, `CancellationError`, or a digest mismatch; do not retry a POST upload-session start. The sleep between attempts is `try await Task.sleep(for:)`, which throws on cancellation, so a cancelled caller stops promptly (2.14).

### 2.8 `HTTPClient` lifetime (M-H-05) — plant (c)

Facts, AHC 1.36.2 ([`HTTPClient.swift`](https://github.com/swift-server/async-http-client/blob/1.36.2/Sources/AsyncHTTPClient/HTTPClient.swift)):

- `deinit` (debug builds only) hits `preconditionFailure("Client not shut down before the deinit. Please call client.shutdown() when no longer needed. Otherwise memory will leak.")` at line 211 when the state is `.upAndRunning` (exemplar @017115279d09 line 213).
- `HTTPClient.shared` is built with `canBeShutDown: false` (`Singleton.swift:26-33`); `shutdown()` on it fails with `HTTPClientError.shutdownUnsupported` (`HTTPClient.swift:323-326`).
- `withHTTPClient(eventLoopGroup:configuration:backgroundActivityLogger:isolation:_:)` constructs a client and shuts it down in a `finally` whether `body` throws or not ([`HTTPClient+StructuredConcurrency.swift:26-52`](https://github.com/swift-server/async-http-client/blob/1.36.2/Sources/AsyncHTTPClient/HTTPClient%2BStructuredConcurrency.swift)).
- `syncShutdown()` is `@available(*, noasync, …)`.
- Shutting down while a request is in flight fails the request: `shutdown-inflight: in-flight request threw HTTPClientError.cancelled`; the README says the same ("you must not call `httpClient.shutdown` before all requests … have finished").

Plants (`rc shutdown <mode>`; debug build, `SWIFT_BACKTRACE=enable=no`):

```text
leak            HTTPClient created in a function, released, never shut down
                -> "AsyncHTTPClient/HTTPClient.swift:211: Fatal error: Client not shut down before the deinit …", exit 132 (red)
leak, release build   -> exit 0, no message: the resources leak silently (red in debug, invisible in release)
ok / withHTTPClient   -> exit 0 (green)
deinit-fire-and-forget (containerization's `deinit { _ = client.shutdown() }`) -> exit 0, alive (green; not awaited)
shared-shutdown       -> "threw HTTPClientError.shutdownUnsupported"
syncShutdown in async -> compile error: "instance method 'syncShutdown' is unavailable from asynchronous contexts; syncShutdown() can block indefinitely, prefer shutdown()" (red, swift build exit 1)
```

Decision: scoped use gets `HTTPClient.withHTTPClient`; a long-lived registry client owns its `HTTPClient`s, exposes `func close() async throws` that awaits `shutdown()` on every client it created (a data client and a token client), and the process entry point awaits it on success, error and cancellation paths. The `deinit { _ = client.shutdown() }` shape (containerization `RegistryClient.swift:146-149`, no await, result discarded) does not crash but gives no completion guarantee and drops shutdown errors; use it only as a last-resort backstop, never as the only path. swiftly's `deinit` calls `try? httpClient.syncShutdown()` (`HTTPClient.swift:149-153`), which blocks the releasing thread and is unavailable if `deinit` ever becomes isolated to an async context. Share one `HTTPClient` per process per TLS/proxy/timeout configuration (it owns the connection pool), but never share between data and token roles (2.4).

### 2.9 Streamed blobs, verification before publish (M-H-06) — plant (b)

SW-IO-19 / SW-IO-30 give the store recipe; this section ties it to the HTTP stream and measures it. Plant: `/mismatch` serves 1 MiB of `A`, `/trunc` declares 1 MiB and sends 256 KiB then closes; the client is asked for `sha256:000…001`. Variants in [`Blob.swift`](file:///home/mherwig/.cache/research-lang/swift-tools/fixtures/registry-clients/rc/Sources/rc/Blob.swift):

- `naiveFetch` (red): `createFile(atPath: "<store>/blobs/<digest>")`, write chunks, hash, compare at the end and throw. After a mismatch and after a truncation the find output is `store-6.4-naive-mismatch/blobs/sha256:0000…0001` (a file under the digest name that does not have that digest; truncated: the same).
- `verifiedFetch` (green): stage under `<store>/ingest/<UUID>` (`O_EXCL`, 0600), reject a response whose status is not 200, reject when `received > size` BEFORE writing the chunk that overflows, hash while writing, require `received == size`, compare digests, `fchmod 0o444`, `fsync(fd)`, `link(tmp, final)` treating `EEXIST` as success, `unlink(tmp)`, fsync the `blobs` directory; every non-publish exit unlinks the temp (`defer`). Mismatch, truncation and oversize (`size=1000` for a 1 MiB body) all leave `find <store> -type f` empty; the good 3 MB blob from `registry:2` publishes as mode 444.

containerization is mixed. `fetchBlob(…into:)` ([`+Fetch.swift:196-262`](https://github.com/apple/containerization/blob/3e7bc39e66b3/Sources/ContainerizationOCI/Client/RegistryClient%2BFetch.swift)) streams, bounds the stream by the descriptor size at every chunk (`validateReceivedSize`, line 185) and rejects a declared `Content-Length` above the descriptor size (lines 171-180), but it writes straight to the caller's `file` and returns the digest for the caller to compare. Its main caller stages into `ingestDir/<UUID>` and compares (`ImageStore+Import.swift:169-182`): steps 1 to 3 of SW-IO-19; on mismatch it throws and leaves the staged file (step 4 missing), and it publishes with `moveItem` and swallows `NSFileWriteFileExistsError` instead of `link`; there is no fsync. Used with a final path it is the naive writer. The Linux and macOS branches of `fetchBlob(…into:)` also differ (`_NIOFileSystem` buffered writer with `replaceExisting: true` vs `createFile` + `FileHandle`), so behaviour differs by platform; macOS branch unverified: read only.

### 2.10 Large files without `Data` (M-G-20) — plant (d)

1 GiB random blob stored in `registry:2` (`rc/big`), downloaded to disk, release build, `/usr/bin/time -v` Maximum resident set size (log lines in `out/rss-6.4-*.txt`, summary `out/rss-6.4-summary.txt`; 6.3 within 2 MiB except `URLSession.download`, 48 MiB):

| Variant | Peak RSS 6.4 | Peak RSS 6.3 | Time 6.4 | Verdict |
|---|---|---|---|---|
| AHC `response.body.collect(upTo: 4 << 30)` then `Data(buffer:)`, hash, `Data.write` | 1058 MiB (1083876 KiB) | 1057 MiB | 1.84 s | red: whole blob in memory (and a second copy transiently) |
| `URLSession.data(from:)` then hash and `write` | 2095 MiB (2145420 KiB) | 2093 MiB | 2.57 s | red: two copies |
| AHC `for try await buf in resp.body` + `FileHandle.write` + incremental `SHA256` | 35 MiB (36052 KiB) | 34 MiB | 1.17 s | green |
| AHC `FileDownloadDelegate(path:reportProgress:)` | 36 MiB (36884 KiB) | 35 MiB | 2.71 s | green (hash in a second pass over the file) |
| `URLSession.download(for:)` then move | 39 MiB (40328 KiB) | 48 MiB | 7.51 s | green on memory, 6x slower, no digest while streaming |

All five computed the same sha256 (`7f2398623dee…`). The check that makes the first two red is a threshold on peak RSS (256 MiB = 262144 KiB) printed by `rss()` in `verify.sh`.

Rule of thumb adopted: payloads whose size is not known to be small are streamed. Manifests and index documents are bounded at 4 MiB (the spec says implementations "SHOULD expect to be able to support manifest pushes of at least 4 megabytes", [spec.md](https://github.com/opencontainers/distribution-spec/blob/main/spec.md)); token and tag-list responses at 1 MiB; everything else (layers, configs above 1 MiB) is streamed to disk. `collect(upTo: n)` requires an explicit bound (the compiler rejects the call without `upTo`), and `collect(upTo: Int.max)` or a 4 GiB bound defeats it. AHC streams with back-pressure: the `for try await` loop only pulls when the body is consumed; hashing and writing inside the loop therefore throttles the TCP window.

Chunk-write choices: `FileHandle.write(contentsOf:)` as run is adequate; for no-FoundationNetworking file I/O see SW-IO (swift-system `FileDescriptor.write`, partial writes looped as in `Blob.swift`).

### 2.11 Content-Encoding trap and `HTTPClient.shared`

Blob stores behind CDNs can attach `Content-Encoding: gzip` to an already-gzipped layer (S3/GCS metadata). The registry digest covers the wire bytes. `/gz` serves a gzip layer with that header and `X-Wire-Sha256`:

```text
ahc-shared   bytes=60000 body_sha256=8f3dac6e… wire_sha256=6f59c7fc… DECODED   (red)
ahc-enabled  (Configuration.decompression = .enabled(limit: .ratio(25)))  DECODED   (red)
urlsession   DECODED   (red; no way to turn it off)
ahc-default  (Configuration(), decompression .disabled)  wire bytes, hash matches   (green)
```

`HTTPClient.shared` is configured by `HTTPClient.Configuration.singletonConfiguration` ([`Configuration+BrowserLike.swift:32-44`](https://github.com/swift-server/async-http-client/blob/1.36.2/Sources/AsyncHTTPClient/Configuration%2BBrowserLike.swift)): `.fullVerification`, `.follow(max: 20, allowCycles: false)`, `Timeout(connect: .seconds(90), read: .seconds(90))`, `connectionPool: .seconds(600)`, `decompression: .enabled(limit: .ratio(25))`. That is right for scraping a web page and wrong for a content-addressed download. Consequence: a layer that is *really* gzip content with `Content-Encoding: gzip` arrives unzipped (hash differs, SW-IO-30 mismatch); for correctness hash and store the wire bytes and never enable client-side decompression in a registry client. URLSession on Linux always decodes, which makes a verified blob download via URLSession unsound against such a CDN.

### 2.12 Proxy environment (M-H-07) — plant (g)

AHC 1.36.2 contains no environment lookup for proxies (no `HTTP_PROXY`, `getenv` or `ProcessInfo` use in `Sources/AsyncHTTPClient`; the Swift Configuration integration reads `proxy.*` keys only, `HTTPClientConfiguration+SwiftConfiguration.swift:29-56,157-162`). Plant: a logging proxy on 8110; target `http://127.0.0.1:8101/echo`:

```text
ahc, plain HTTPClient, http_proxy=http://127.0.0.1:8110            -> proxy log empty (red)
ahc, plain HTTPClient, HTTP_PROXY + HTTPS_PROXY                     -> proxy log empty (red)
urlsession, http_proxy=…                                            -> proxy saw the request (green)
urlsession, HTTP_PROXY=… (uppercase only)                           -> proxy log empty (red)
ahc + Configuration.proxy from a Go-style lookup (uppercase wins, lowercase fallback) -> proxied (green)
same, with NO_PROXY=127.0.0.1                                       -> proxy NOT used (green)
```

libcurl's convention explains the URLSession rows: "The environment variables can be specified in lower case or upper case. The lower case version has precedence. `http_proxy` is an exception as it is only available in lower case" ([curl man page](https://curl.se/docs/manpage.html)). FoundationNetworking's own proxy plumbing is a TODO (`EasyHandle.swift:305-306`: "Proxy setting, namely CFURLSessionOptionPROXY …"; `connectionProxyDictionary` is stored but not applied), so the environment is the only route. Exemplars that apply a proxy to AHC: containerization `ProxyUtils.proxyFromEnvironment(scheme:host:env:)` (uppercase first, NO_PROXY with `shouldBypassProxy`) feeding `httpConfiguration.proxy = .server(host:port:)` (`RegistryClient.swift:122-126`), and swiftly (`HTTPClient.swift:131-141`, lowercase first, no NO_PROXY handling). The two disagree on case precedence; curl's rule (lowercase wins, `http_proxy` lowercase only) is what the Rust and Go fleet tools do for `HTTPS_PROXY` fallbacks, so any choice must be documented.

Proxy for HTTPS goes through CONNECT: with `HTTPS_PROXY` pointing at the plant proxy and an https target, `proxy.log` gained `CONNECT 127.0.0.1:8443` and AHC threw `HTTPClientError.invalidProxyResponse` (the plant proxy answers CONNECT with 502). An end-to-end TLS-through-proxy run was not performed (no CONNECT-capable proxy in the fixture). Proxy credentials: `Proxy.server(host:port:authorization:)` exists (`HTTPClient+Proxy.swift:84`); 1.36.0 added proxy headers (domain note).

### 2.13 TLS and custom CAs (M-H-08) — plant (h)

Self-signed certificate (CN=localhost, SAN localhost and 127.0.0.1) on 8443:

```text
ahc default                                  threw TLS handshake failed (certificate verify failed)        (red = correct refusal)
ahc TLSConfiguration.additionalTrustRoots = [.file(cert)]   200 path=/echo                                 (green)
ahc + SSL_CERT_FILE=cert                     still threw: AHC does not read SSL_CERT_FILE
urlsession                                   threw "SSL certificate OpenSSL verify result: self-signed certificate (18)"
urlsession + SSL_CERT_FILE / CURL_CA_BUNDLE / URLSessionCertificateAuthorityInfoFile   still threw
```

`URLSessionCertificateAuthorityInfoFile` (also `INSECURE_SSL_NO_VERIFY`) is read in `EasyHandle.setCARootBundlePath()` only inside `#if os(Android)` ([`EasyHandle.swift:205-221`](https://github.com/swiftlang/swift-corelibs-foundation/blob/384ff680be7c/Sources/FoundationNetworking/URLSession/libcurl/EasyHandle.swift)); on Linux the bundle is found from a built-in list of system locations. Therefore: a private registry CA is a per-client `additionalTrustRoots` on AHC (NIOSSL `TLSConfiguration.additionalTrustRoots`, [`TLSConfiguration.swift:371-374`](https://github.com/apple/swift-nio-ssl/blob/main/Sources/NIOSSL/TLSConfiguration.swift)) and a system-store install for URLSession. `certificateVerification = .none` (or `INSECURE_SSL_NO_VERIFY=…`) is never a fix; tuist uses `additionalTrustRoots` (`REAPITransport.swift:54`), the only exemplar to do so.

Apple: Darwin `URLSession` uses the system keychain/ATS and `URLSessionDelegate` trust challenges: unverified: read only. Windows: unverified: read only.

### 2.14 Cancellation (M-H-10) — plant (f)

`rc cancel <client>` cancels the task 1 s into a stalled body. AHC: `cancel -> threw after 1.00s: cancelled [raw: CancellationError]`. URLSession: `cancel -> threw after 1.00s: cancelled [raw: URLError Error Domain=NSURLErrorDomain Code=-999 …]`. Both honour structured cancellation (`withTaskCancellationHandler` in `execute`, `URLSession.swift:735-750`), and AHC cancels through `TransactionCancelHandler` (`HTTPClient+execute.swift:165-190`). Callers must (1) not wrap the call in `try?`, (2) map `URLError.cancelled` to `CancellationError` at the module boundary so higher layers see one type (SW-CONC-17, SW-CONC-24), (3) never feed a cancellation into the retry loop, and (4) clean temp files in `defer` (2.9).

### 2.15 Rendering `URLError` and friends — plant (e)

Raw forms captured by `rc neterr <client> <kind>` (6.4; kinds: timeout, DNS failure, untrusted TLS, TLS to a plain-HTTP port, connection refused):

| Case | `localizedDescription` (what an agent prints) | Clean line from `render(_:)` |
|---|---|---|
| URLSession timeout | `The operation could not be completed. (NSURLErrorDomain error -1001.)` | `127.0.0.1: timed out` |
| URLSession DNS | `Could not resolve host: nonexistent.invalid` | `nonexistent.invalid: cannot resolve host` |
| URLSession TLS untrusted | `SSL certificate OpenSSL verify result: self-signed certificate (18)` (code -1, `.unknown`) | `127.0.0.1: SSL certificate OpenSSL verify result: self-signed certificate (18)` |
| URLSession refused | `Failed to connect to 127.0.0.1 port 9 after 0 ms: Could not connect to server` | `127.0.0.1: connection refused or unreachable` |
| AHC read timeout | `The operation could not be completed. (AsyncHTTPClient.HTTPClientError error 1.)` | `127.0.0.1: timed out waiting for data` |
| AHC DNS | `The operation could not be completed. (NIOPosix.NIOConnectionError error 1.)` | `nonexistent.invalid: cannot resolve host` |
| AHC TLS untrusted | `The operation could not be completed. (NIOSSL.NIOSSLError error 0.)` | `127.0.0.1: TLS handshake failed (certificate verify failed)` |
| AHC TLS to plain port | same `(NIOSSL.NIOSSLError error 0.)` | `127.0.0.1: TLS handshake failed (wrong version number)` |
| AHC refused | `The operation could not be completed. (NIOCore.IOError error 1.)` | `127.0.0.1: connection refused` |

`"\(error)"` is no better: `Error Domain=NSURLErrorDomain Code=-1001 "(null)"`, `handshakeFailed(NIOSSL.BoringSSLError.sslError([Error: 268435581 error:1000007d:SSL routines:OPENSSL_internal:CERTIFICATE_VERIFY_FAILED at /home/…/swift-nio-ssl/Sources/CNIOBoringSSL/ssl/handshake.cc:288]))` (a build path leaks into user output). Only the timeout case on URLSession produces the `-1001` sentence; the others carry libcurl text in `NSLocalizedDescriptionKey`, and the TLS ones surface as code `-1` (`.unknown`), so a `switch e.code` alone loses the TLS class.

Green helper ([`Render.swift`](file:///home/mherwig/.cache/research-lang/swift-tools/fixtures/registry-clients/rc/Sources/rc/Render.swift), 67 lines): control flow keys on the error type and `URLError.code`; the only text read is presentation (libcurl's `NSLocalizedDescriptionKey` for codes with no meaning of their own, and the BoringSSL reason token). It composes with SW-ERR-20: the `render` output becomes the one-sentence `message`, the original error is `cause`, a new `Code` per failure class (`.timeout`, `.dns`, `.tls`, `.connection`, `.cancelled`). Skeleton:

```swift
func render(_ error: any Error, host: String? = nil) -> String {
    if error is CancellationError { return "cancelled" }
    if let e = error as? URLError {
        switch e.code {
        case .timedOut: return "\(e.failingURL?.host ?? host ?? "?"): timed out"
        case .cannotFindHost, .dnsLookupFailed: return "\(e.failingURL?.host ?? host ?? "?"): cannot resolve host"
        default: return (e as NSError).userInfo[NSLocalizedDescriptionKey] as? String ?? "network error (URLError code \(e.errorCode))"
        }
    }
    if let e = error as? HTTPClientError {
        switch e {
        case .connectTimeout: return "timed out connecting"
        case .readTimeout: return "timed out waiting for data"
        case .deadlineExceeded: return "timed out (deadline exceeded)"
        case .remoteConnectionClosed: return "connection closed by the server"
        default: return "\(e)"
        }
    }
    // NIOConnectionError (DNS via dnsAError/dnsAAAAError, per-address IOError errno), NIOSSLError.handshakeFailed(reason token), IOError(errno)
    …
}
```

`HTTPClientError` is a struct with static members and `==`-based `switch` as run (not an enum). Compare containerization's own layer: `RegistryClient.swift:268-282` rebuilds messages such as `failed to resolve either repository hostname … or proxy hostname …` on DNS failure.

### 2.16 APIs that do not exist or are unavailable (Linux, 6.4 and 6.3)

- `URLSession.bytes(for:)` / `AsyncBytes`: `error: value of type 'URLSession' has no member 'bytes'` ([`Checks.swift:9`](file:///home/mherwig/.cache/research-lang/swift-tools/fixtures/registry-clients/rc/Sources/rc/Checks.swift), `-DCHECK_BYTES`, `swift build` exit 1); neither name occurs in the fetched `URLSession.swift`. It exists on Darwin: unverified: read only.
- `HTTPClient.syncShutdown()` in an `async` function: error above.
- `HTTPClient.EventLoopGroupProvider.createNew`: deprecated ("Please use the singleton EventLoopGroup explicitly", `HTTPClient.swift:1178`); use `.singleton`.
- `response.body.collect()` without `upTo:` does not compile (the parameter is required); `HTTPClientError.cancelled` is what `shutdown` produces, while task cancellation produces `CancellationError`.
- Imports: any file naming `URLSession` needs the `#if canImport(FoundationNetworking)` guard (SW-IO-02, imported unchanged); AHC files do not.

## Normative guidance candidates

Numbering is local (the consolidation assigns final SW-NET IDs). "Run" says whether the verification was run against a planted violation AND a compliant twin; fixture root is `/home/mherwig/.cache/research-lang/swift-tools/fixtures/registry-clients/`. Every grep-style check prints the violation; empty output is a pass. Fixture trees for the greps: `greps/red` (violations) and `greps/green` (twins).

1. **Registry and credentialed HTTP uses AsyncHTTPClient.** (MUST for any request carrying `Authorization`, cookies, or a streamed body > 4 MiB.) Rationale: URLSession on Linux leaks credentials across origins, has no streaming API, no total timeout, no CA or proxy control. Verify: `grep -rl --include='*.swift' -e 'URLSession' Sources | xargs -r grep -l -e 'Authorization' -e 'authorization' | xargs -r grep -L -e 'willPerformHTTPRedirection'` (output = files that pair URLSession with a credential and have no strip delegate). Run: yes, `v-grep.sh red` prints G1 for `greps/red/Sources/App/UrlSessionAuth.swift` (exit 1), `v-grep.sh green` empty (exit 0).
2. **If URLSession carries a credential on Linux, the strip delegate is a session-level `URLSessionTaskDelegate` implementing `willPerformHTTPRedirection`, comparing scheme+host+port and dropping `Authorization` (case-insensitive); the `delegate:` argument of `data(for:delegate:)`/`upload`/`download` never counts, and `httpAdditionalHeaders` is not a safe place for the credential.** (MUST.) Rationale: the per-task delegate is not consulted on a redirect (`HTTPURLProtocol.swift:473-501`). Verify: `grep -rn --include='*.swift' -e 'data(for:.*delegate:' -e 'upload(for:.*delegate:' -e 'download(for:.*delegate:' Sources` (output = per-task delegates to review; each must not be the credential strip). Run: yes, G2 red prints the `delegate: nil` and `delegate: d` lines; the behavioural plant `a.redirect-host/urlsession-pertask` is red (exit 1) and `urlsession-delegate` green (exit 0) on 6.4 and 6.3.
3. **A redirect target never receives a credential that the original host's user supplied: use a client that strips cross-origin (AHC `redirectConfiguration` follow or default) for data and `.disallow` for token exchange.** (MUST.) Rationale: OCI spec line 829, Fetch spec; Docker Hub to S3 returns 400 otherwise. Verify: behavioural, `rc redir <client> http://127.0.0.1:8101/redir | grep -e 'auth=Bearer SECRET'` (output = the leak). Run: yes, urlsession/pertask/header-config/redirect-port red, ahc/ahc-shared/delegate green; `a.s3-400` red/green.
4. **Token exchange uses a dedicated `HTTPClient` with `redirectConfiguration = .disallow`; any 3xx from the token endpoint is an error.** (MUST.) Rationale: a redirected token request moves a credential-bearing request off-origin; two clients keep the data client able to follow CDN redirects. Verify: `grep -rl --include='*.swift' -e 'realm' Sources | xargs -r grep -L -e 'disallow'` (output = files handling a realm without `.disallow`). Run: yes (G5 red on `greps/red`, empty on green; behavioural k plants in rule 5).
5. **The challenge `realm` is checked against the registry origin (same scheme, host, port; https on both unless the caller passed an explicit insecure opt-in) before any credential is sent; the token is cached per `scope` until `expires_in` (default 60 s) and fetched once per scope; one 401 triggers at most one token fetch and retry.** (MUST.) Rationale: realm confusion exfiltrates credentials; no caching multiplies token requests. Verify: `RC_ENV=… ./rcrun.sh debug auth strict http://127.0.0.1:8104 3` then `[ -s out/evil.log ]` (non-empty = credentials reached the foreign realm) and `curl -s localhost:8103/stats` (`token_fetches` > 1 for the cached run = violation). Run: yes, `k.token/naive->evil-realm` red / `strict->evil-realm` green; `k.token/naive-cache` red (4 fetches) / `strict-cache` green (1).
6. **Every manifest or index request sets `Accept` to the full supported list (OCI manifest, OCI index, Docker v2 manifest, Docker manifest list).** (MUST.) Rationale: registry:2 2.8.3 returns 404 for an OCI manifest when `Accept` is missing or lists only Docker v2. Verify: `./verify-manifest.sh red-no-accept` / `red-docker-only` / `green` (output = any request not answered 200). Run: yes, red exit 1 (two lines of `HTTP 404`), green exit 0.
7. **`Docker-Content-Digest` is parsed with the SW-IO-13 parser before it becomes a URL or path component and is only a hint: the stored digest is the hash of the bytes received (SW-IO-30).** (MUST.) Rationale: header digests bypass descriptor validation (containerization `+Fetch.swift:57-69`). Verify: reading heuristic: every use of `"Docker-Content-Digest"` is followed by a digest-parser call in the same function (`grep -rn --include='*.swift' -e 'Docker-Content-Digest' Sources` lists the sites to read). Run: no (the planted lying-header red was not built; `./verify-manifest.sh digest-header` is green-only, exit 0).
8. **Every `HTTPClient.Configuration` sets `timeout: .init(connect:, read:)`: connect 10 s; read 30 s (60 s for blob clients).** (MUST.) Rationale: AHC's default has no read timeout; a stalled server holds the CLI forever. Verify: `grep -rl --include='*.swift' -e 'HTTPClient.Configuration(' -e 'HTTPClient(' Sources | xargs -r grep -L -e 'read:' -e 'timeout.read'` (output = files that build a client without a read timeout). Run: yes (G4b red on `greps/red/Sources/App/Ahc.swift`, empty on green); behavioural `f.stall/ahc-default` red (`NO-TIMEOUT-WITHIN-GUARD after 5.00s`, exit 1) vs `ahc-read1` green (exit 0).
9. **Never pass `deadline: .distantFuture`; treat `execute(_:timeout:)`/`deadline:` as a head-only bound and enforce a whole-transfer budget with the SW-CONC-24 structured race around the entire request-plus-body operation.** (MUST.) Rationale: the deadline task is cancelled when the head arrives (`HTTPClient+execute.swift:173-177`); measured 7.5 s completion under a 3 s deadline. Verify: `grep -rn --include='*.swift' -e 'distantFuture' Sources`; behavioural `./rcrun.sh debug stall ahc-deadline1 | grep -e NO-TIMEOUT`. Run: yes (G4a red; `f.stall/ahc-deadline1` red exit 1; `rc timeouts2` shows the race stopping both clients at 3.00 s).
10. **Do not rely on `URLSessionConfiguration.timeoutIntervalForResource` for a total cap on Linux; set `timeoutIntervalForRequest` (idle) and use rule 9's race.** (MUST for code that builds on Linux.) Rationale: not implemented in FoundationNetworking (Swift 6.4, 6.3). Verify: `grep -rn --include='*.swift' -e 'timeoutIntervalForResource' Sources` (each hit must be accompanied by the race or be `#if canImport(Darwin)`-only). Run: yes (G4c red; `f.stall/urlsession-resource1` red exit 1, `urlsession-request1` green exit 0).
11. **Retry only idempotent requests, on transport errors and HTTP 429/502/503/504, at most 3 attempts total, exponential backoff 1 s/2 s ±20 % jitter, `Retry-After` honoured up to 30 s, never on 401 beyond one token refresh, other 4xx, cancellation or digest mismatch.** (SHOULD.) Rationale: containerization's fixed-interval 5xx-only retry misses transport faults and retries non-transient 500s; RFC 9110 §9.2.2. Verify: named reading heuristic: `grep -rn --include='*.swift' -e 'maxRetries' -e 'retryCount' -e 'attempt' Sources` then check the loop for the method and status allow-list, `Task.sleep`, and `CancellationError` pass-through. Run: no.
12. **Every `HTTPClient` the code constructs is shut down on every path: scoped use via `HTTPClient.withHTTPClient`; owned clients via an `async close()` that awaits `shutdown()` on each client; `deinit { _ = client.shutdown() }` is a backstop only; `syncShutdown()` never appears in `async` code.** (MUST.) Rationale: debug trap `HTTPClient.swift:211`, silent leak in release; `shutdown()` on in-flight work cancels it. Verify: `grep -rl --include='*.swift' -e 'HTTPClient(' Sources | xargs -r grep -L -e 'shutdown' -e 'withHTTPClient'` (output = files that construct a client and never shut it down) plus `swift build` for `syncShutdown` in async. Run: yes (G3 red on `greps/red/Sources/App/Ahc.swift`, empty on green; `c.shutdown-leak/debug` red exit 1 with the precondition message, `explicit`/`withHTTPClient`/`deinit-fire-and-forget` green exit 0; `m.syncShutdown-in-async-context` compile error exit 1).
13. **`HTTPClient.shared` is used only for small unauthenticated requests whose bytes are not digest-checked; never `shutdown()` it; blob, manifest and token clients are own instances with `decompression: .disabled`.** (MUST for digest-checked bytes.) Rationale: shared has decompression enabled (ratio 25), 90 s timeouts, 20 redirects; a `Content-Encoding: gzip` blob arrives decoded. Verify: `grep -rl --include='*.swift' -e 'HTTPClient.shared' Sources | xargs -r grep -l -e 'SHA256' -e 'digest'` and `grep -rl --include='*.swift' -e 'decompression: .enabled' -e 'decompression = .enabled' Sources | xargs -r grep -l -e 'digest' -e 'SHA256'`. Run: yes (G8 and G11 red on `greps/red`, empty on green; behavioural `l.gzip-wire-bytes` ahc-shared/ahc-enabled/urlsession red `DECODED`, ahc-default green).
14. **Blob download is streamed and verified before publish, exactly SW-IO-19 over the HTTP stream: stage, reject `received > size` before writing the overflowing chunk, require `received == size`, hash while writing, compare, link, fchmod 0444, fsync; unlink the temp on every non-publish exit.** (MUST.) Rationale: the naive writer leaves `blobs/sha256:<wrong>`. Verify: after a failing fetch `find <store> -type f` must print nothing (`b.blob-*` checks). Run: yes (`b.blob-mismatch/naive` red, `b.blob-truncated/naive` red; `verified` variants green incl. oversize; good blob published mode 444).
15. **Large payloads are never buffered in `Data` or `ByteBuffer`: `collect(upTo:)` is for manifests (≤ 4 MiB), tokens, tag lists and error bodies (≤ 1 MiB) only; layers and configs > 1 MiB stream through `for try await` (or `FileDownloadDelegate`) to a staged file; `URLSession.data(from:)` is not used for blobs.** (MUST.) Rationale: measured peak RSS 1058 / 2095 MiB vs 35 MiB for 1 GiB. Verify: `grep -rn --include='*.swift' -e 'collect(upTo: [0-9]* *<< *[3-9][0-9])' -e 'collect(upTo: 4 << 30)' -e 'collect(upTo: Int.max)' Sources` and the peak-RSS threshold (`/usr/bin/time -v … | grep 'Maximum resident'` > 262144 KiB fails). Run: yes (G6 red; `d.rss-1GiB/ahc-collect` and `urlsession-data` red exit 1, `ahc-stream`, `ahc-delegate`, `urlsession-download` green exit 0).
16. **Do not call `URLSession.bytes(for:)`/`AsyncBytes` in code that compiles on Linux; for URLSession streaming use `download(for:)` (to a file) or a session delegate, but prefer AHC.** (MUST.) Rationale: the API does not exist in FoundationNetworking (6.4, 6.3). Verify: `swift build` on Linux (exit 1, `has no member 'bytes'`); cheap static pre-check `grep -rn --include='*.swift' -e '\.bytes(for:' -e '\.bytes(from:' -e 'AsyncBytes' Sources`. Run: yes (compile check red exit 1; the static grep was not planted separately: reading heuristic, compile is authoritative).
17. **Network errors reach the user through one `render(_:)` helper keyed on error type and `URLError.code`; `localizedDescription` and `"\(error)"` are never the user text for `URLError`, `HTTPClientError`, `NIOConnectionError`, `NIOSSLError` or `IOError`; the sentence has the form `<host>: <reason>`, no domain/code/type names, no build paths.** (MUST.) Rationale: `(NSURLErrorDomain error -1001.)`, `(AsyncHTTPClient.HTTPClientError error 1.)`, `/home/…/swift-nio-ssl/…` in output. Verify: `grep -rl --include='*.swift' -e 'AsyncHTTPClient' -e 'FoundationNetworking' Sources | xargs -r grep -n -e 'localizedDescription'` (output = the violation) and behavioural `rc neterr <client> <kind> render | grep -e 'NSURLErrorDomain' -e 'Error Domain=' -e 'error -[0-9]' -e 'OPENSSL_internal' -e 'could not be completed'` (empty = pass). Run: yes (G10 red on `greps/red/Sources/App/Render.swift`, empty on green; `e.render/localizedDescription` red exit 1 with six raw lines, `e.render/render()` green exit 0, 6.4 and 6.3).
18. **Cancellation: a network call is never wrapped in `try?`; cancellation is rethrown as `CancellationError` (map `URLError.cancelled`); a cancelled request is not retried; temp files are removed in `defer`.** (MUST.) Rationale: both clients cancel in 1.00 s when the task is cancelled; swallowing hides it. Verify: `./rcrun.sh debug cancel ahc | grep -v -e 'threw after [01]\.[0-9]*s'` (empty = prompt) and `grep -rn --include='*.swift' -e 'try? await .*execute' -e 'try? await .*data(for' Sources`. Run: yes for the behavioural check (`f.cancel-propagates/ahc` and `/urlsession` green exit 0); the `try?` grep was not planted separately (reading heuristic).
19. **AHC clients get their proxy from the environment explicitly: `HTTPS_PROXY`/`https_proxy` for https, `HTTP_PROXY`/`http_proxy` for http, `NO_PROXY`/`no_proxy` bypass, applied via `HTTPClient.Configuration.proxy = .server(host:port:)`; document the case-precedence rule used.** (SHOULD for CLIs that run behind corporate proxies; MUST for registry CLIs.) Rationale: AHC 1.36.2 reads no proxy variable; URLSession on Linux reads only lowercase `http_proxy`. Verify: `grep -rl --include='*.swift' -e 'HTTPClient' Sources | xargs -r grep -L -e 'HTTPS_PROXY' -e 'https_proxy' -e 'proxyFromEnvironment'`. Run: yes (G9 red on the red tree, empty on green; behavioural `g.proxy-env/ahc-plain` red ×2, `urlsession(HTTP_PROXY)` red, `ahc-proxyfromenv` and NO_PROXY bypass green).
20. **TLS verification stays on: no `certificateVerification = .none`, no `INSECURE_SSL_NO_VERIFY`; a private CA is `TLSConfiguration.additionalTrustRoots = [.file(path)]` (AHC) or a system-store install (URLSession); do not expect `SSL_CERT_FILE` to work.** (MUST.) Rationale: neither client reads `SSL_CERT_FILE` on Linux; `URLSessionCertificateAuthorityInfoFile` is Android-only. Verify: `grep -rn --include='*.swift' -e 'certificateVerification = .none' -e 'INSECURE_SSL_NO_VERIFY' Sources`. Run: yes (G7 red, empty on green; `h.tls-selfsigned/ahc-additionalTrustRoots` green exit 0, `ahc-default`, `urlsession`, and both `+SSL_CERT_FILE` variants red exit 1).
21. **Credentials travel only over https; plain http is allowed only for an explicit insecure opt-in (loopback test registries), and a registry that issues a `WWW-Authenticate` challenge over http is refused.** (MUST.) Rationale: containerization `RegistryClient.swift:204-206`, `+Token.swift:221-222,255`. Verify: reading heuristic: the token/credential path contains an https check before the first `Authorization` header is added (`grep -rn --include='*.swift' -e 'scheme == "https"' Sources` lists candidates). Run: partly (the strict client's check is exercised by the `k` plants, which pass `allowInsecure: true` to reach loopback; the https refusal itself was not planted).
22. **Network code builds on Linux: every file naming `URLSession` carries the SW-IO-02 `FoundationNetworking` guard.** (MUST, imported.) Verify: SW-IO-02's command. Run: imported (see SW-IO-02).
23. **Clients set an identifying `User-Agent` on every request.** (SHOULD.) Rationale: registries and proxies may gate or reject anonymous clients (containerization `RegistryClient.swift` builds a `User-Agent` for every request, comment in `buildRequest`). Verify: reading heuristic (grep `User-Agent`). Run: no.

Decisions in one place (the brief's "Decide" list): client = AHC (rule 1); credential rule = rules 2-5 (never off-origin, token client without redirects, realm = registry origin, https only); timeouts = connect 10 s / read 30 s (60 s blobs) / head deadline 30 s / total race (rules 8-10); retries = rule 11; lifetime = rule 12-13; streamed verification and large-file rule = rules 14-16; URLError = rule 17; proxy/TLS = rules 19-21.

## Verification runs

All commands run from `/home/mherwig/.cache/research-lang/swift-tools/fixtures/registry-clients/` through `verify.sh` (`SWIFT_VERSION=6.4` default; `SWIFT_VERSION=6.3` rerun). Each line is `check expect got`; `expect=1` is the violation (red), `expect=0` the compliant twin (green). Logs: `out/verify-6.4.log` and `out/verify-6.3.log` (full: 60/60 OK each, 29 red and 31 green per toolchain); fresh reruns this session `out/verify-6.4-acesghklf.log` (a c e f g h k l s: 47/47 OK) and `out/verify-6.4-bm.log` (b m: 8/8 OK). `/usr/bin/time` is mounted into the container by `nrun.sh`; servers and `registry:2` run on the host network.

| Plant | Check (name in `verify.sh`) | Command (shape) | Red exit | Green exit | Relevant output |
|---|---|---|---|---|---|
| a | `a.redirect-host/urlsession` and `-pertask`, `-header-config` | `./rcrun.sh debug redir urlsession http://127.0.0.1:8101/redir \| grep -e 'auth=Bearer SECRET'` | 1 | n/a | `urlsession: status=200 path=/echo host=localhost:8101 auth=Bearer SECRET` |
| a | `a.redirect-host/urlsession-delegate`, `/ahc`, `/ahc-shared` | same with those clients | n/a | 0 | `auth=NONE` (empty grep) |
| a | `a.redirect-port/urlsession` (red), `/ahc` (green) | `… redir urlsession http://127.0.0.1:8101/redir-port \| grep -e 'auth=Bearer SECRET'` | 1 | 0 | `host=127.0.0.1:8102 auth=Bearer SECRET` |
| a | `a.s3-400/urlsession` (red), `-delegate`, `/ahc` (green) | `… redir <c> http://127.0.0.1:8103/v2/x/y/blobs/sha256:aa \| grep -e 'status=400'` | 1 | 0 | `urlsession: status=400 <Error>InvalidRequest: Missing x-amz-content-sha256</Error>` |
| b | `b.blob-mismatch/naive`, `b.blob-truncated/naive` | `./rcrun.sh release blob naive http://127.0.0.1:8101/mismatch sha256:00…01 1048576 <store>; find <store> -type f` | 1 | n/a | `…/store-6.4-naive-mismatch/blobs/sha256:0000…0001` |
| b | `b.blob-mismatch/verified`, `-truncated/verified`, `-oversize/verified`, `b.blob-good/verified-0444` | same with `verified` | n/a | 0 | empty `find`; good blob has mode 444 |
| c | `c.shutdown-leak/debug` | `./rcrun.sh debug shutdown leak http://127.0.0.1:8101/echo` | 1 (process exit 132) | n/a | `exit 132: AsyncHTTPClient/HTTPClient.swift:211: Fatal error: Client not shut down before the deinit. Please call client.shutdown() when no longer needed. Otherwise memory …` |
| c | `c.shutdown-leak/release(silent leak)` | same, release build | n/a (exit 0) | 0 | no output: invisible leak |
| c | `c.shutdown-explicit/debug`, `-withHTTPClient`, `-in-deinit-fire-and-forget`, `-of-shared` | `… shutdown ok|with|deinit-fire|shared-shutdown …` | n/a | 0 | `shared-shutdown: threw HTTPClientError.shutdownUnsupported` |
| d | `d.rss-1GiB/ahc-collect`, `urlsession-data` | `./nrun.sh /usr/bin/time -v …/release/rc big <variant> http://127.0.0.1:5000/v2/rc/big/blobs/$BIG out/dl.bin`; violation = peak RSS > 262144 KiB | 1 | n/a | `peak RSS 1083876 KiB > 262144`; `peak RSS 2145420 KiB > 262144` |
| d | `d.rss-1GiB/ahc-stream`, `ahc-delegate`, `urlsession-download` | same | n/a | 0 | 36052, 36884, 40328 KiB; sha256 `7f2398623dee…` for all five |
| e | `e.render/localizedDescription` | `./rcrun.sh debug neterr <urlsession\|ahc> <kind> render \| grep -e '^  localizedDescription=' \| grep -e 'NSURLErrorDomain' -e 'Error Domain=' -e 'error -[0-9]' -e 'OPENSSL_internal' -e 'NIOSSL\.' -e 'AsyncHTTPClient\.' -e 'NIOCore\.' -e 'NIOPosix\.' -e 'could not be completed'` | 1 | n/a | `localizedDescription=The operation could not be completed. (NSURLErrorDomain error -1001.)` (+5 more) |
| e | `e.render/render()` | same on the `^  render=` field | n/a | 0 | `render=127.0.0.1: timed out` etc. |
| f | `f.stall/ahc-default`, `ahc-deadline1`, `urlsession-resource1` | `./rcrun.sh debug stall <mode> \| grep -e NO-TIMEOUT` | 1 | n/a | `stall ahc-default: NO-TIMEOUT-WITHIN-GUARD after 5.00s` |
| f | `f.stall/ahc-read1`, `urlsession-request1` | same | n/a | 0 | `client gave up after 1.00s` |
| f | `f.cancel-propagates/ahc`, `/urlsession` | `./rcrun.sh debug cancel <c> \| grep -v -e 'threw after [01]\.[0-9]*s'` | n/a | 0 | `cancel -> threw after 1.00s: cancelled` |
| g | `g.proxy-env/ahc-plain(http_proxy)`, `(HTTPS_PROXY+HTTP_PROXY)`, `urlsession(HTTP_PROXY)` | `RC_ENV='-e http_proxy=http://127.0.0.1:8110' ./rcrun.sh debug proxy ahc-env http://127.0.0.1:8101/echo`, then test `-s out/proxy.log` | 1 | n/a | `proxy variable set, proxy log empty` |
| g | `g.proxy-env/urlsession(http_proxy)`, `ahc-proxyfromenv(HTTP_PROXY)`, `(NO_PROXY bypass)` | same | n/a | 0 | proxy log non-empty / empty under NO_PROXY as intended |
| h | `h.tls-selfsigned/ahc-default`, `urlsession`, `urlsession+SSL_CERT_FILE`, `ahc+SSL_CERT_FILE` | `./rcrun.sh debug tls <c> https://127.0.0.1:8443/echo \| grep -v -e 'path=/echo'` | 1 | n/a | `ahc-default: threw TLS handshake failed (certificate verify failed)`; `urlsession: threw 127.0.0.1: SSL certificate OpenSSL verify result: self-signed certificate (18)` |
| h | `h.tls-selfsigned/ahc-additionalTrustRoots` | `… tls ahc-trustroots https://127.0.0.1:8443/echo out/tls.crt` | n/a | 0 | `path=/echo` |
| k | `k.token/naive->evil-realm`, `k.token/naive-cache(token_fetches)` | `./rcrun.sh debug auth naive http://127.0.0.1:8104 3`; check `out/evil.log` and `curl localhost:8103/stats` | 1 | n/a | `credentials sent to the realm host: /token?client_id=rc-fixture&service=fake&scope=repository:x/y:pull Authorization=Basic dTpw`; `token fetched 4 times for 3 requests + 1 blob` |
| k | `k.token/strict->evil-realm`, `k.token/strict-cache` | same with `strict` | n/a | 0 | refused: `authorization server 127.0.0.1:8105 is not the registry 127.0.0.1:8104`; 1 fetch |
| l | `l.gzip-wire-bytes/ahc-shared`, `ahc-enabled`, `urlsession` | `./rcrun.sh debug gz <c> http://127.0.0.1:8101/gz \| grep -e DECODED` | 1 | n/a | `bytes=60000 body_sha256=8f3dac6e… wire_sha256=6f59c7fc… DECODED` |
| l | `l.gzip-wire-bytes/ahc-default` | same | n/a | 0 | `WIRE-BYTES` (grep empty) |
| m | `m.URLSession.bytes(for:)-on-Linux` | `swift build --scratch-path $SWIFT_SCRATCH/registry-clients-chk -Xswiftc -DCHECK_BYTES --package-path rc` | 1 | n/a | `Checks.swift:9:50: error: value of type 'URLSession' has no member 'bytes'` |
| m | `m.syncShutdown-in-async-context` | same with `-DCHECK_SYNCSHUT` | 1 | n/a | `error: instance method 'syncShutdown' is unavailable from asynchronous contexts; syncShutdown() can block indefinitely, prefer shutdown()` |
| s | `s.grep/red-tree`, `s.grep/green-tree` | `./v-grep.sh red` / `./v-grep.sh green` (G1..G11, each prints its violations) | 1 | 0 | red prints G1 `Sources/App/UrlSessionAuth.swift`, G2 lines 9 and 14, G3 `Ahc.swift`, G4a line 11, G4b, G4c line 19, G5, G6 line 21, G7 line 27, G8, G9, G10 `Render.swift:5`, G11 `Render.swift`; green prints nothing |
| manifest | `./verify-manifest.sh red-no-accept` / `red-docker-only` / `green` / `digest-header` | curl against `registry:2` 2.8.3 | 1, 1 | 0, 0 | `GET tag, no Accept: HTTP 404`, `HEAD digest, no Accept: HTTP 404`, `GET tag, Accept docker v2 only: HTTP 404` |

Not run red: the lying `Docker-Content-Digest` header (green-only); TLS through a CONNECT proxy; https refusal of the strict token client. Cleanup: the 1 GiB `out/big.bin` and the registry data were deleted after the final run (setup.sh recreates them).

## Exemplar evidence

All SHAs are the 12-character prefixes of the clones under `~/.cache/research-lang/exemplars/swift/`. Corpus-wide counts (my grep over the 40 clones, `*.swift`): `import AsyncHTTPClient` 103 files in 6 repos (container, containerization, hummingbird, swiftly, async-http-client, vapor); `FoundationNetworking` 57 files in 10 repos; `URLSession` 210 files in 17 repos; `HTTPClient.shared` 15 files in 3; `willPerformHTTPRedirection` 8 files in 4 (Alamofire, container-plugin, Nuke, SwiftPM); `timeoutIntervalForResource` 3 files, tuist only; `additionalTrustRoots` 1 file, tuist; proxy variables read in container, containerization, swiftly, tuist.

| Candidate | Satisfies | Violates / contradicts |
|---|---|---|
| 1-3 client + credential on redirect | async-http-client@017115279d09:Sources/AsyncHTTPClient/RedirectState.swift:139-143 (strip); swift-package-manager@5546f44a3b52:Sources/Basics/HTTPClient/URLSessionHTTPClient.swift:391-406 and :202-216 (session delegate re-derives `Authorization` per destination); swift-container-plugin@a9646b8d4dca:Sources/ContainerRegistry/RegistryClient.swift:107-182 (`.ephemeral` + `RegistryURLSessionDelegate`, origin compare, cites fetch spec); containerization@3e7bc39e66b3:Sources/ContainerizationOCI/Client/RegistryClient.swift:141-143 | Alamofire@bda9ed57d729 and Nuke@d5548dd61395 forward `willPerformHTTPRedirection` to user delegates without stripping (library, caller's problem): `SessionDelegate.swift:202-205`, `DataLoader.swift:249-250` |
| 4-5 token client and realm | containerization@3e7bc39e66b3:RegistryClient.swift:55-61,141-143 (`tokenClient`, `.disallow`), `RegistryClient+Token.swift:183-202,217-236` (realm validated, redirect and challenge refused), `:126` expiry, `:95-96` default 60 s | swift-container-plugin@a9646b8d4dca:Sources/ContainerRegistry/AuthHandler.swift:181-197 sends Basic credentials to whatever realm the challenge names, with no origin check, no cache, relying on the URLSession delegate for redirects |
| 6-7 negotiation and header digest | containerization@3e7bc39e66b3:RegistryClient+Fetch.swift:37-47 (full Accept list) and :57-69 (parsed header digest) | none observed |
| 8-10 timeouts | swiftly@c8cf2e35bfca:HTTPClient.swift (`timeout: .seconds(30)` on the Swift OpenAPI transport) | containerization@3e7bc39e66b3:RegistryClient.swift:202 and RegistryClient+Token.swift:196 (`deadline: .distantFuture`, default client without a read timeout); tuist@2f6ac74754bf:swifterpm/Sources/swifterpm/Support.swift:195-207 and cli/Sources/TuistHTTP/URLSession+Tuist.swift:78,147,166 (total transfer bounded by `timeoutIntervalForResource`, a no-op on Linux; the idle timeout still works) |
| 11 retries | containerization@3e7bc39e66b3:RegistryClient.swift:48-54,242-266 (bounded, status-gated) | same file: fixed 1 s interval, 5xx only, no transport-error retry, no `Retry-After`, no jitter |
| 12 lifetime | async-http-client `withHTTPClient` users: hummingbird@1bd3b407fb47:Tests/HummingbirdHTTP2Tests/HTTP2Tests.swift:38,86,96 | containerization@3e7bc39e66b3:RegistryClient.swift:146-149 (`deinit` fire-and-forget `_ = client.shutdown()`, two clients); swiftly@c8cf2e35bfca:Sources/SwiftlyCore/HTTPClient.swift:149-153 (`try? httpClient.syncShutdown()` in `deinit`) |
| 13 `HTTPClient.shared` | vapor@bf77fc69b142:Sources/Vapor/Application.swift:137-139 (uses `HTTPClient.shared` and says in a comment that it "is configured like a browser, which includes decoding gzip and deflate", then sets `decodesCompressedBodies: true`: the decompression default is known and deliberate) | swiftly@c8cf2e35bfca:Sources/SwiftlyCore/HTTPClient.swift:145 uses `HTTPClient.shared` when no proxy is set for toolchain downloads that are later digest-checked (the check hashes decoded bytes if a mirror ever sets `Content-Encoding`; not planted against swiftly) |
| 14 verified publish | containerization@3e7bc39e66b3:Sources/Containerization/Image/ImageStore/ImageStore+Import.swift:169-182 (ingest dir, UUID temp, digest compare) and `RegistryClient+Fetch.swift:171-190,208` (size caps at every chunk) | same: temp file not unlinked on mismatch (ImageStore+Import.swift:173-176); `fetchBlob(…into:)` writes directly to the caller's path with `createFile` (RegistryClient+Fetch.swift:238-262), no fsync |
| 15-16 streaming | containerization@3e7bc39e66b3:RegistryClient+Fetch.swift:196-262 (both branches stream `body.makeAsyncIterator()`) | any exemplar using `URLSession.bytes`: none found in Linux-compiled code (the 17 URLSession repos are Apple-first; unverified: read only) |
| 17 URLError rendering | none: no exemplar has a `render`-style helper for transport errors | swift-container-plugin@a9646b8d4dca:RegistryClient.swift:28-45 (`RegistryClientError` custom messages) wraps only HTTP statuses; containerization:RegistryClient.swift:268-282 builds DNS-failure text but passes other errors through |
| 19 proxy | containerization@3e7bc39e66b3:Sources/ContainerizationExtras/ProxyUtils.swift:34-58 + RegistryClient.swift:122-126; swiftly@c8cf2e35bfca:HTTPClient.swift:131-141 | the two use opposite case precedence; swiftly ignores NO_PROXY |
| 20 TLS | tuist@2f6ac74754bf:cli/Sources/TuistREAPI/REAPITransport.swift:54 (`additionalTrustRoots`) | none sets `.none` |
| 21 https-only credentials | containerization@3e7bc39e66b3:RegistryClient.swift:204-206 and `+Token.swift:221-222,255` | swift-container-plugin@a9646b8d4dca:RegistryClient.swift:101-104 chooses `http` for `insecure || isLocalRegistry`; `AuthHandler.swift` contains no scheme or `https` check before sending credentials to the challenge realm (grep: no `https`/`scheme`/`insecure` match) |

## AI-agent angle

What an LLM characteristically gets wrong here, and the smallest mechanical check:

| Mistake | Why it compiles and misleads | Smallest check |
|---|---|---|
| `URLSession.shared.data(for: requestWithBearer)` for a registry | Works on macOS where redirects strip; on Linux it leaks and breaks against S3/CDN redirects (400) | rule 1/2 grep (G1/G2); behavioural `a.redirect-host` |
| Per-call `data(for:delegate:)` "to add a redirect delegate" | Compiles, runs, the callback never fires on Linux | G2 grep |
| `config.httpAdditionalHeaders = ["Authorization": …]` as the safe place | Leaks identically | G1 (same file as `Authorization`) |
| Uses `URLSession.bytes(for:)` to stream a blob | Exists on Apple, absent on Linux: build fails only in the Linux job | `swift build` Linux; `grep -rn --include='*.swift' -e '\.bytes(for:' Sources` |
| `let (data, _) = try await URLSession.shared.data(from: url); try data.write(to:)` for a layer | 2 GiB RSS for 1 GiB | G6 and RSS threshold |
| `response.body.collect(upTo: .max)` / `1 << 40` | Compiles; "bounded" in name only | G6 |
| `execute(request, timeout: .seconds(30))` believed to cap the download | Bounds the head only; body trickles forever | rule 9 grep + SW-CONC-24 race |
| `timeoutIntervalForResource = 30` as total cap | No-op on Linux | G4c grep |
| `HTTPClient(eventLoopGroupProvider: .createNew)` | Deprecated; no longer creates a group | compiler deprecation warning (`-warnings-as-errors`) |
| `let client = HTTPClient(...)` in a function, no `shutdown()` | Runs in release; traps in debug tests | G3 grep |
| `defer { try? client.syncShutdown() }` inside an `async` function | Fails to compile (noasync) or, in a sync deinit, blocks | `swift build` |
| `defer { Task { try? await client.shutdown() } }` | Compiles; process may exit before it runs | rule 12 reading heuristic: shutdown awaited on the main path |
| `HTTPClient.shared` for every request including blobs | Decompression on, hash mismatches only on gzip-encoded blobs | G8, G11 |
| Assumes AHC honours `HTTPS_PROXY` | Silently direct-connects | G9 |
| Sets `SSL_CERT_FILE` or `certificateVerification = .none` to trust a private CA | Env is ignored; `.none` disables security | G7; rule 20 |
| Prints `error.localizedDescription` or `"\(error)"` | `(NSURLErrorDomain error -1001.)`, `(NIOSSL.NIOSSLError error 0.)`, build paths | G10 and the render check |
| Compares `error as? URLError` `.code == .secureConnectionFailed` for TLS | On Linux TLS failures are code -1 (`.unknown`) | reading heuristic: switch on type + code + text, as in `render` |
| Reads `Docker-Content-Digest` as the blob's digest and stores that | Trusts the registry's claim; header may be absent or differ in algorithm | rule 7 reading heuristic; SW-IO-30 |
| Decodes the manifest JSON and re-encodes it to hash | Digest changes (SW-IO-30) | SW-IO-30's grep |
| Fetches a bearer token per request, or sends credentials to the `realm` it was given | Rate-limits and exfiltration | `k.token` plants |
| Retries `URLError` in a loop with `try?` and fixed `sleep(1)` | Swallows cancellation | rule 11/18 heuristics |
| Invents `HTTPClient.Configuration.timeout = .seconds(30)`, `request.timeout`, `HTTPClientRequest.timeoutInterval` | Not APIs: AHC has `Timeout(connect:read:write:)` and per-call `timeout:`/`deadline:` | `swift build` |

## Contested / evolving

- AHC vs URLSession on Linux: trend as of 2026-10-10 is AHC for anything credentialed or streamed (containerization, swiftly, Vapor, Hummingbird); URLSession persists where the code is shared with Apple platforms (SwiftPM, container-plugin) and carries its delegate workaround. FoundationNetworking still sits on libcurl (swift.org static-SDK article); whether the URLSession-on-Linux gaps (no `bytes`, no resource timeout, per-task delegate not called, no proxy API) close is unknown; re-run the `a`, `f`, `m` plants on each new toolchain. 6.3 and 6.4 behave identically.
- AHC README vs code on redirects: the README says custom clients must opt in to follow redirects; 1.36.2's default `Configuration()` follows (measured 302 to 200). Treat the README as stale; always set `redirectConfiguration` explicitly so a future default change cannot flip behaviour.
- Total timeouts: `withDeadline` (SE-0526, accepted with modifications 2026-07-30, expected Swift 6.5, absent in 6.4) will replace hand-rolled races (SW-CONC-24); AHC could add a body-inclusive deadline, but 1.36.2 does not. Until then the structured race is the answer.
- Proxy environment: no consensus on case precedence (containerization uppercase first, swiftly and curl lowercase first). Trend: a shared helper in the client (AHC's Swift Configuration integration is the first step toward config-driven proxy, 1.36.0+); not environment-driven.
- Streaming APIs: AHC's `FileDownloadDelegate` (futures era) vs `for try await` loops; both measured equal on memory. Hashing during streaming favours the loop. `_NIOFileSystem` buffered writers (containerization's macOS branch) are underspecified for Linux.
- Docker Hub rate limits and `Retry-After` handling are practice, not spec; the 429/503 allow-list in rule 11 is a decision, not a measured server behaviour.
- Darwin-specific behaviour (ATS, system proxy, resource timeouts honoured, `bytes(for:)`): unverified: read only. Windows (AHC/NIO and FoundationNetworking availability): unverified: read only.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://github.com/swift-server/async-http-client | AsyncHTTPClient README (shutdown, redirects, timeouts, `HTTPClient.shared`) | 1.36.2, 2026-09-25 | Primary; the README states shutdown rules, and a stale redirect sentence |
| https://github.com/swift-server/async-http-client/blob/017115279d09/Sources/AsyncHTTPClient/RedirectState.swift | Redirect state, cross-origin header stripping (`:139-143`) | exemplar sha | The credential rule in code |
| https://github.com/swift-server/async-http-client/blob/1.36.2/Sources/AsyncHTTPClient/HTTPClient.swift | `HTTPClient`, `Configuration.Timeout`, `deinit` precondition, `shutdown`, `EventLoopGroupProvider` | 1.36.2 | Timeout defaults, lifetime trap, deprecations |
| https://github.com/swift-server/async-http-client/blob/1.36.2/Sources/AsyncHTTPClient/AsyncAwait/HTTPClient%2Bexecute.swift | async `execute` and the deadline task (`:165-180`) | 1.36.2 | Why the deadline covers only the head |
| https://github.com/swift-server/async-http-client/blob/1.36.2/Sources/AsyncHTTPClient/Singleton.swift and Configuration+BrowserLike.swift | `HTTPClient.shared` and `singletonConfiguration` | 1.36.2 | Shared client's decompression, 90 s timeouts, 20 redirects, `canBeShutDown: false` |
| https://github.com/swift-server/async-http-client/blob/1.36.2/Sources/AsyncHTTPClient/HTTPClient%2BStructuredConcurrency.swift | `withHTTPClient` | 1.36.2 | Scoped lifetime API |
| https://github.com/opencontainers/distribution-spec/blob/main/spec.md | OCI Distribution Spec (redirect line 829, Accept, `Docker-Content-Digest`, manifest 4 MB) | main, read 2026-10-10 | Normative HTTP behaviour a registry client must follow |
| https://distribution.github.io/distribution/spec/auth/token/ | Docker registry token authentication | read 2026-10-10 | The challenge/realm/scope/`expires_in` flow |
| https://distribution.github.io/distribution/spec/auth/oauth/ | Docker registry OAuth2 token flow (refresh tokens) | read 2026-10-10 | The POST variant none of the Swift exemplars implement |
| https://github.com/swiftlang/swift-corelibs-foundation/blob/384ff680be7c/Sources/FoundationNetworking/URLSession/HTTP/HTTPURLProtocol.swift | URLSession HTTP protocol on Linux (redirects, request timeout) | main @384ff680be7c | Primary; shows the delegate-gated redirect and why the leak happens |
| https://github.com/swiftlang/swift-corelibs-foundation/blob/384ff680be7c/Sources/FoundationNetworking/URLSession/URLSessionConfiguration.swift | `timeoutIntervalForRequest`/`Resource` declarations and defaults (60 s / 7 days) | main | Primary; the resource timeout is declared but not consumed elsewhere |
| https://github.com/swiftlang/swift-corelibs-foundation/blob/384ff680be7c/Sources/FoundationNetworking/URLSession/libcurl/EasyHandle.swift | libcurl glue: CA bundle (`#if os(Android)` env), proxy TODO (`:305`) | main | Primary; explains CA and proxy limits on Linux |
| https://github.com/swiftlang/swift-corelibs-foundation/blob/384ff680be7c/Sources/FoundationNetworking/URLSession/URLSession.swift | `data(for:delegate:)` and async wrappers | main | Primary; no `bytes(for:)` |
| https://fetch.spec.whatwg.org/#http-redirect-fetch | WHATWG Fetch redirect algorithm | living standard, read 2026-10-10 | Source of the "drop Authorization on cross-origin" rule cited by container-plugin |
| https://www.rfc-editor.org/rfc/rfc9110 | HTTP Semantics (idempotent methods §9.2.2, `Retry-After` §10.2.3, redirection §15.4) | RFC 9110, 2022 | Retry and redirect semantics |
| https://curl.se/docs/manpage.html | curl man page, proxy environment section | read 2026-10-10 | libcurl lowercase-wins and `http_proxy` lowercase-only rule |
| https://www.swift.org/documentation/articles/static-linux-getting-started.html | Static Linux SDK article ("Foundation Networking uses libcurl") | read 2026-10-10 | Primary; confirms the libcurl backing |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0526-deadline.md | SE-0526 `withDeadline` | accepted with modifications, expected 6.5 | Primary; future replacement for the timeout race |
| https://github.com/apple/swift-nio-ssl/blob/main/Sources/NIOSSL/TLSConfiguration.swift | `TLSConfiguration.additionalTrustRoots` (`:371-374`) | main | Primary; the per-client CA route |
| https://github.com/apple/containerization/blob/3e7bc39e66b3/Sources/ContainerizationOCI/Client/RegistryClient.swift | Swift OCI client on AHC: token client, retry, proxy, `deinit`, `distantFuture` | tag 0.33.x, @3e7bc39e66b3 | Best Swift prior art; also its gaps |
| https://github.com/apple/containerization/blob/3e7bc39e66b3/Sources/ContainerizationOCI/Client/RegistryClient%2BToken.swift | Token exchange, `validateRealm`, expiry | @3e7bc39e66b3 | Realm and redirect hardening |
| https://github.com/apple/swift-container-plugin/blob/a9646b8d4dca/Sources/ContainerRegistry/RegistryClient.swift | OCI client on URLSession with redirect delegate | 1.4.0, @a9646b8d4dca | Documents the Docker Hub to S3 400 and the Linux workaround |
| https://github.com/swiftlang/swift-package-manager/blob/5546f44a3b52/Sources/Basics/HTTPClient/URLSessionHTTPClient.swift | SwiftPM URLSession client with `redirecting(from:authorizationProvider:)` | @5546f44a3b52 | Primary; the reference strip delegate |
| https://github.com/swiftlang/swiftly/blob/c8cf2e35bfca/Sources/SwiftlyCore/HTTPClient.swift | swiftly's AHC wrapper (proxy env, shared client, `syncShutdown` in deinit) | @c8cf2e35bfca | Primary; real proxy-from-env code |
| https://github.com/tuist/tuist/blob/2f6ac74754bf/swifterpm/Sources/swifterpm/Support.swift | Tuist's URLSession wrapper relying on `timeoutIntervalForResource` | @2f6ac74754bf | The contradicting exemplar for the Linux timeout finding |
