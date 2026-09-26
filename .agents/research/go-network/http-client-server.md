---
title: "HTTP clients and servers: timeouts, bodies, retries, redirects"
topic: go-network/http-client-server
agent: network/http-client-server (wave 3)
model: sonnet
date_researched: 2026-09-26
sources_count: 17
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/http-client-server/
scope: >
  net/http rules for fleet HTTP CLIENTS (Client.Timeout, request construction,
  body close/drain/bounds, retry policy, redirect-Authorization, registry
  Transport defaults) plus one short net/http SERVER section
  (ReadHeaderTimeout, Shutdown, MaxBytesReader). Does NOT restate context
  propagation or the context-taking-call MUST (GO-CONC-01/03 own that; cited,
  not repeated) or the subprocess/os-exec noctx rule (also GO-CONC-03). Does
  NOT cover digest verification, credential-helper resolution or on-disk
  staging (that is `network/registry-client`, GO-NET's sibling dive).
---

## Table of contents

1. [Findings](#findings)
   1. [Client.Timeout is the MUST; context alone is not a substitute](#1-clienttimeout-is-the-must-context-alone-is-not-a-substitute)
   2. [bodyclose: hand-classified, demoted, and what replaces it](#2-bodyclose-hand-classified-demoted-and-what-replaces-it)
   3. [Body bounds: LimitReader's +1 trick and the 256KiB auto-drain surprise](#3-body-bounds-limitreaders-1-trick-and-the-256kib-auto-drain-surprise)
   4. [Retry policy: statuses, idempotency, backoff, and Retry-After's two forms](#4-retry-policy-statuses-idempotency-backoff-and-retry-afters-two-forms)
   5. [Redirect-Authorization: what 1.27.1 actually strips](#5-redirect-authorization-what-1271-actually-strips)
   6. [Registry transport defaults](#6-registry-transport-defaults)
   7. [The server SHOULD section](#7-the-server-should-section)
   8. [hostport: vet's same-function limit](#8-hostport-vets-same-function-limit)
   9. [usestdlibvars and gosec G107: scope caveats](#9-usestdlibvars-and-gosec-g107-scope-caveats)
2. [Normative guidance candidates](#normative-guidance-candidates)
3. [Verification runs](#verification-runs)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- Every `*http.Client` a fleet program constructs sets `Timeout > 0`; a context deadline is not a substitute, because it only protects call sites that remember to build one — `Timeout` is the client-level backstop ([pkg.go.dev/net/http `Client.Timeout`](https://pkg.go.dev/net/http#Client)).
- Never use `http.Get`/`http.Post`/`http.Head`/`http.DefaultClient` for a real request — no `Timeout`, ever ([go-audit/exemplar-runtime-posture.md §5](../go-audit/exemplar-runtime-posture.md), 128 corpus-wide hits).
- `bodyclose` is a SHOULD, not a MUST-backer, on registry-client code: hand-classifying regclient's 75 non-test findings shows ~92% are false positives (a custom `*reghttp.Resp` wrapper's own `Close()`/ownership-transfer the linter can't trace), but 2 real leaks survive review inside that noise (`scheme/reg/blob.go:60` `BlobDelete`, and `scheme/reg/blob.go:108` `BlobGet`'s error branch) — confirmed by direct code reading, not by the linter.
- GO-NET's close-and-drain MUST therefore rests on a **reading heuristic** (does every return path from a function that calls a `Do`-shaped method close the body or transfer it into a returned `io.Closer`?), with `bodyclose` kept as an informational SHOULD limited to packages calling `net/http` directly.
- `io.ReadAll(resp.Body)` with no bound will pull an entire 1 GiB adversarial body into memory in ~1.2s on loopback; `io.LimitReader(resp.Body, n+1)` bounds it to `n+1` bytes and lets the caller detect truncation — the same off-by-one trick `http.MaxBytesReader` uses server-side.
- `net/http`'s own `(*body).Close` silently auto-drains up to `maxPostHandlerReadBytes` (**256 KiB**, `go1.27.1:src/net/http/server.go:1164`) of an unread body so the connection can still be reused — closing-without-draining only churns connections once the unread remainder exceeds that threshold ([go1.27.1:src/net/http/transfer.go:983-1012](https://pkg.go.dev)).
- Retry only 429, 503 and other 5xx except 501, and only for idempotent methods (GET, HEAD, PUT, DELETE, OPTIONS, TRACE — [RFC 9110 §9.2.2](https://www.rfc-editor.org/rfc/rfc9110#section-9.2.2)) unless the request carries an explicit idempotency key; `hashicorp/go-retryablehttp`'s own `DefaultRetryPolicy` does **not** enforce this and will retry a POST on a 500.
- Parse `Retry-After` with **both** forms RFC 9110 §10.2.3 allows — an integer delay-seconds, or an HTTP-date — never `time.ParseDuration(header + "s")` alone: that is exactly `regclient/regclient@43d2acb9fafd:internal/reghttp/http.go:694-695`'s bug, confirmed by fixture to silently return a 0 delay on the HTTP-date form.
- The default `http.Client` (`CheckRedirect == nil`) strips `Authorization`, `Www-Authenticate`, `Cookie`, `Cookie2`, `Proxy-Authorization` and `Proxy-Authenticate` whenever the redirect's destination hostname is not an exact match or a subdomain of the original hostname — keyed on `url.URL.Hostname()` (**port is not part of the comparison**) via `isDomainOrSubdomain` (`go1.27.1:src/net/http/client.go:826-827,1017-1035`); confirmed on 1.27.1 by fixture.
- That stripping rule is asymmetric: a redirect from `example.com` to `sub.example.com` **keeps** credentials (dest is a subdomain of the origin); a redirect from `sub.example.com` back to `example.com` **strips** them (origin is not a subdomain of the destination) — a detail that will surprise anyone who assumes "same registrable domain" is symmetric.
- Never write a `CheckRedirect` that unconditionally re-sets `Authorization`; only do it after validating the destination host yourself, and treat that as a reviewed exception, not a default.
- A registry-shaped HTTP client sets its own `Transport` with explicit `DialContext` timeout, `TLSHandshakeTimeout`, `IdleConnTimeout` and a `MaxIdleConnsPerHost` well above stdlib's default of 2 (`DefaultMaxIdleConnsPerHost = 2`, `go1.27.1:src/net/http/transport.go:62`) — `google/go-containerregistry@0c8bedb78437:pkg/v1/remote/options.go:116-129` sets `MaxIdleConnsPerHost: 50` with the comment "we usually are dealing with 2 hosts (at most), split MaxIdleConns between them."
- Every `http.Server` sets `ReadHeaderTimeout > 0` (gosec G112): 41 of 56 sampled server literals in the corpus have none (73% unguarded, [go-audit/exemplar-runtime-posture.md §5](../go-audit/exemplar-runtime-posture.md)); confirmed by fixture that a slowloris client is never disconnected without it, and is dropped within ~300ms with it.
- Never call `http.ListenAndServe`/`ListenAndServeTLS` directly for anything but a disposable example (gosec G114) — construct an `*http.Server` so `ReadHeaderTimeout` and `Shutdown` are reachable.
- A server registers a graceful shutdown path: `signal.NotifyContext` + `srv.Shutdown(ctx)` with a bounded grace period; `Shutdown` "gracefully shuts down the server without interrupting any active connections" ([pkg.go.dev/net/http `Server.Shutdown`](https://pkg.go.dev/net/http#Server.Shutdown)).
- Bound request bodies server-side with `http.MaxBytesReader(w, r.Body, n)` before decoding; it "prevents clients from accidentally or maliciously sending a large request and wasting server resources" and returns `*http.MaxBytesError` past the limit.
- Build `host:port` with `net.JoinHostPort`, never `fmt.Sprintf("%s:%d", host, port)` (breaks on an IPv6 literal); `go vet`'s `hostport` analyzer (default-on at 1.27.1) only fires when the `Sprintf` result reaches `net.Dial`/`net.Listen` **in the same function** — confirmed by fixture: splitting the identical defect across a helper function makes the analyzer silent on the exact same bug.
- `usestdlibvars` only flags a **typed** `resp.StatusCode == 200`-shaped literal comparison; treat it as a style SHOULD, not a correctness MUST-backer, and always use `http.StatusOK` etc. regardless of whether the linter would catch a given call site.

## Findings

### 1. Client.Timeout is the MUST; context alone is not a substitute

[`Client.Timeout`](https://pkg.go.dev/net/http#Client) is documented precisely: "The timeout includes connection time, any redirects, and reading the response body. The timer remains running after Get, Head, Post, or Do return and will interrupt reading of the Response.Body. A Timeout of zero means no timeout." `DefaultClient` "is the default Client and is used by Get, Head, and Post" — and it has `Timeout: 0`.

Wave 2 (GO-CONC-01, GO-CONC-03) already MUSTs a context-taking call and a non-`Background()` context on every blocking call, including `http.NewRequestWithContext`; GO-NET does not restate that. What GO-CONC does not cover: a context with no deadline is legal (`context.WithCancel(context.Background())` never expires on its own), and a caller several frames up the chain can pass exactly that. `Client.Timeout` is the client-level backstop that does not depend on every caller remembering a deadline — belt-and-suspenders, not a duplicate of the context rule.

Correct:

```go
c := &http.Client{Timeout: 10 * time.Second}
req, _ := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
resp, err := c.Do(req)
```

Incorrect:

```go
resp, err := http.Get(url)          // http.DefaultClient, Timeout == 0
```

Measured: 87 of 143 `&http.Client{}` literals in the corpus have no `Timeout:` field (61% unguarded); 128 corpus-wide calls to `http.Get`/`Post`/`DefaultClient` ([go-audit/exemplar-runtime-posture.md §5](../go-audit/exemplar-runtime-posture.md)); a spot-read confirms genuine misses, e.g. `syncthing/syncthing@94c3c1cdef71:lib/ur/usage_report.go:360` builds an elaborate `Transport`/`TLSClientConfig` but sets no `Timeout`.

Watched red/green: [`timeout_test.go`](#verification-runs) — a client with no `Timeout` against a server that accepts the TCP connection and never answers is still blocked after 1.5s; the same server against a `Timeout: 300ms` client fails in ~300ms.

### 2. bodyclose: hand-classified, demoted, and what replaces it

Wave 2's [go-gates.md GO-GATE-19](../go-gates.md) already demoted `bodyclose` to SHOULD after finding 88/88 hits on `oras-go` were the wrapper false-positive shape, and flagged regclient's 78 non-test hits as unclassified. This dive hand-classifies them.

Running `bodyclose` on `regclient/regclient@43d2acb9fafd` with `uniq-by-line: false` and the issue caps removed gives **120 total findings, 75 on non-test lines** (the map's own count of 78 is within normal variance of a differently-configured run — both are far from the 3 findings golangci-lint's *default* limits (`max-issues-per-linter: 50`, `uniq-by-line: true`) would have shown, which is itself GO-GATE-10's point).

Every flagged call site funnels through `reghttp.Resp`, an internal wrapper around `*http.Response` (`internal/reghttp/http.go:118`) with its own `Close() error` method (`internal/reghttp/http.go:619-632`, which does `resp.resp.Body.Close()`) and a `Read`/`Seek` surface so the wrapper itself can be handed to a caller as an `io.ReadCloser`. `bodyclose`'s static analysis looks for `.Body.Close()` reachable from a value that flows out of a `net/http`-shaped call; it cannot trace through a custom wrapper's own `Close()` method or through an ownership transfer into a different exported type. Grouping the 75 flagged non-test lines by the function they sit in:

| Function | `reghttp.Do` called | `.Close()` present in the function | Verdict |
|---|---|---|---|
| `manifest.go` `ManifestGet`/`Delete`/`Head`/`Put`, `ping.go` `Ping`, `referrer.go` `referrerListByAPIPage`/`referrerPing`, `repo.go` `RepoList`, `tag.go` `TagDelete`/`tagListOCI`/`tagListLink`, `blob.go` `blobGetUploadURL`/`blobMount`/`blobPutUploadFull`/`blobPutUploadChunked`/`blobUploadCancel`/`blobUploadStatus`, `blob.go` `BlobHead` | yes | yes (`defer resp.Close()` or an inline `resp.Close()` right after the call) | **false positive** — the wrapper's own `Close()` reaches the body; `bodyclose` cannot see it |
| `blob.go` `BlobDelete` (`scheme/reg/blob.go:47-63`) | yes | **no**, on either the success (202) or the error return | **real leak** — this is the exact function the brief flagged (`blob.go:60`, the `!= 202` check); nothing ever closes the response on either branch |
| `blob.go` `BlobGet` (`scheme/reg/blob.go:67-118`) | yes | on the success path, `resp` is handed to `blob.NewReader(blob.WithReader(resp), ...)`, transferring `Close` ownership to the returned `blob.Reader` — correct; on the `StatusCode != 200` error return (line 108) it returns **without** closing `resp` first | **partial real leak** — the error branch specifically leaks |

Rate: **2 genuinely defective functions out of 13** call sites that invoke `reghttp.Do` directly, and only on some of their return paths. On a per-finding-line basis that is roughly 4-6 of 75 flagged non-test lines (≈6-8%) pointing at a real defect — a false-positive rate around 92-94%. `regclient` is ≈62k LOC ([go-gates.md](../go-gates.md) §"gate-commands" cites this figure); ~70 false-positive findings over 6.2 units of 10k LOC is **≈11 FP/10k LOC**, far over the map's own ≤1 FP/10k LOC admission bar for a MUST-backing linter.

**Decision:** `bodyclose` does not meet the bar on wrapper-heavy HTTP-client code and stays SHOULD-only, scoped to packages that call `net/http` directly (as GO-GATE-19 already states). GO-NET's own close-and-drain MUST is a **reading heuristic**: for every function whose body calls a `Do`-shaped method that returns a value backed by an `http.Response` (directly, or through one layer of wrapper), does *every* return path either (a) call `.Close()` on it (directly, or via the wrapper's own `Close()`), or (b) transfer it into a returned value whose documented contract makes the caller responsible for closing it? `BlobDelete` fails (a) on both branches; `BlobGet` passes (b) on success and fails (a) on its error branch — that error-branch gap is exactly the shape a reviewer should be trained to spot, because it is invisible to `bodyclose` and easy to miss by eye too (the success path "looks done" once ownership transfer is understood, so the reviewer's attention moves on before checking the error branch).

### 3. Body bounds: LimitReader's +1 trick and the 256KiB auto-drain surprise

`io.ReadAll(resp.Body)` has no ceiling: fixture `bodylimit_test.go` streams a genuine 1 GiB response (built without ever buffering it server-side, one 1 MiB chunk written 1024 times) and `io.ReadAll` pulls in all 1,073,741,824 bytes in 1.24s. The fix is `io.LimitReader(resp.Body, n+1)` before `io.ReadAll`: reading exactly `n+1` bytes proves the body was at least that large and must be rejected, versus reading `≤n` bytes meaning the real body fit; this is the same trick `http.MaxBytesReader` documents server-side ("closes the underlying reader when its Close method is called," returns `*http.MaxBytesError` past the limit). `http.MaxBytesReader` itself takes an `http.ResponseWriter` as its first argument and is designed for bounding an inbound *request* body inside a handler — a client bounding a *response* body uses `io.LimitReader` (or a hand-rolled counting reader) instead; there is no client-side `MaxBytesReader` analogue in stdlib.

Measured: 215 `io.ReadAll(...Body)` sites in the corpus versus 105 `LimitReader` sites ([go-audit/exemplar-runtime-posture.md §5](../go-audit/exemplar-runtime-posture.md)) — the map flagged these as needing cross-referencing, which this dive's fixture does at the mechanism level rather than by re-auditing every corpus call site (out of scope for this brief; `M-G-15`/on-disk format and `M-I-09`'s general untrusted-size row own the broader audit).

A genuine surprise while building the connection-churn fixture (`drain_test.go`): closing a response body **without** draining it does not always defeat connection reuse. `net/http`'s client-side body wrapper's `Close()` (`go1.27.1:src/net/http/transfer.go:983-1012`) auto-drains up to `maxPostHandlerReadBytes` bytes — **256 KiB**, `const maxPostHandlerReadBytes = 256 << 10` (`go1.27.1:src/net/http/server.go:1164`) — looking for EOF so the connection can still be handed back to the pool. Below that threshold, "close without draining" is silently safe for reuse; above it, the `Transport` gives up (`b.earlyClose = true`) and the connection is closed instead of pooled. The fixture proves both sides: against a 2 MiB body, 5 requests that read 8 bytes then `Close()` get **0** reused connections (all 5 dial fresh, via `httptrace.GotConnInfo.Reused`); against the same shape with `io.Copy(io.Discard, resp.Body)` before `Close()`, 4 of 5 requests reuse the pooled connection.

### 4. Retry policy: statuses, idempotency, backoff, and Retry-After's two forms

[RFC 9110 §9.2.2](https://www.rfc-editor.org/rfc/rfc9110#section-9.2.2) defines idempotent methods as those where "the intended effect on the server of multiple identical requests ... is the same as ... a single ... request": GET, HEAD, PUT, DELETE, OPTIONS and TRACE; POST, PATCH and CONNECT are not. A retry policy that fires on a non-idempotent method without an idempotency key risks a duplicate side effect (a double-charged payment, a duplicate upload) on nothing more than a dropped ACK.

`hashicorp/go-retryablehttp`'s `DefaultRetryPolicy`/`baseRetryPolicy` (`client.go:472-534`) retries on: any connection error not matching a redirect-loop, bad-scheme, bad-header or TLS-verification regex; `resp.StatusCode == 429`; and `resp.StatusCode == 0 || (resp.StatusCode >= 500 && resp.StatusCode != 501)`. **It does not check the request method at all** — it will retry a `POST` on a `500` exactly as readily as a `GET`. That is a real, current (checked 2026-09-26 against the `main` branch) divergence from RFC 9110's idempotency guidance in the ecosystem's most-cited Go retry library; a fleet client either restricts its own retry wrapper to idempotent methods (or requests carrying an explicit idempotency key) or accepts the duplicate-side-effect risk knowingly.

`google/go-containerregistry@0c8bedb78437:pkg/v1/remote/transport/retry.go` takes the opposite shape: `WithRetryStatusCodes(codes ...int)` is opt-in — nothing is retried unless the caller names status codes — with `defaultBackoff = retry.Backoff{Duration: 100ms, Factor: 3.0, Jitter: 0.1, Steps: 3}` and a `retry.Predicate` (`retry.IsTemporary`) checked against errors, not statuses, by default.

Backoff with jitter is the consensus shape (both go-retryablehttp's exponential-with-cap and go-containerregistry's `Factor`/`Jitter`/`Steps` triple do it); a fixed-interval retry storm against a struggling server is the antipattern both avoid.

`Retry-After` ([RFC 9110 §10.2.3](https://www.rfc-editor.org/rfc/rfc9110#section-10.2.3); mirrored exactly by [MDN's Retry-After page](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Retry-After)) has exactly two forms: `<delay-seconds>` (a non-negative integer) or `<http-date>`. `regclient/regclient@43d2acb9fafd:internal/reghttp/http.go:687-715`'s `backoffSet` reads the header and does:

```go
ras := resp.resp.Header.Get("Retry-After")
ra, _ := time.ParseDuration(ras + "s")   // http.go:694-695
if ra > 0 { ... }
```

`time.ParseDuration` only understands Go duration syntax (`"120s"` parses fine because appending `"s"` to `"120"` yields `"120s"`); an HTTP-date value like `"Sun, 27 Sep 2026 10:15:00 GMT"` becomes `"Sun, 27 Sep 2026 10:15:00 GMTs"`, which `ParseDuration` rejects, the error is discarded (`, _`), and `ra` stays `0` — the delay is silently dropped and the caller falls through to the counter-based backoff instead of honouring the server's requested wait. `hashicorp/go-retryablehttp`'s `parseRetryAfterHeader` (`client.go:568-600`) gets both forms right: `strconv.ParseInt` first, `time.Parse(time.RFC1123, header)` second. Fixture `retryafter_test.go` reproduces the regclient shape (`parseRetryAfterBroken`) side by side with a correct parser and confirms the exact failure: the broken parser returns `0` for the HTTP-date form and the correct `120s` for the delay-seconds form; the correct parser returns a real, positive duration for both.

### 5. Redirect-Authorization: what 1.27.1 actually strips

[`Client.CheckRedirect`](https://pkg.go.dev/net/http#Client)'s doc states the rule directly: sensitive headers like `Authorization`, `WWW-Authenticate` and `Cookie` are "ignored when following a redirect to a domain that is not a subdomain match or exact match of the initial domain." The mechanism (`go1.27.1:src/net/http/client.go:826-827` for the header list — `Authorization`, `Www-Authenticate`, `Cookie`, `Cookie2`, `Proxy-Authorization`, `Proxy-Authenticate` — and `:1017-1035` for `shouldCopyHeaderOnRedirect`/`isDomainOrSubdomain`) compares `initial.Hostname()` against `dest.Hostname()` — **`url.URL.Hostname()` strips the port**, so a redirect that changes port but not hostname is *not* a host change for this purpose. `isDomainOrSubdomain(sub, parent)` (the destination is `sub`, the original request is `parent`) returns true when `sub == parent` or `sub` ends with `"."+parent` — i.e. the destination must be the same host or a **subdomain of the original**, checked in that direction only.

Fixture `redirect_test.go` confirms both the rule and its port-blindness on go1.27.1:

- Two `httptest.Server`s both bind to `127.0.0.1` on different ports; a redirect between them is **not** cross-host by `Hostname()` and forwards `Authorization` — the fixture had to rewrite the `Location` header's hostname string to `localhost` (a different string, same loopback resolution) to exercise a genuine cross-host case.
- With a real hostname difference (`127.0.0.1` origin → `localhost` target), the default client strips `Authorization` on the hop: `TestRedirect_CrossHost_AuthorizationStripped_ByDefault` passes.
- A same-host redirect (two paths on the same server) forwards it: `TestRedirect_SameHost_AuthorizationForwarded` passes.
- A custom `CheckRedirect` that unconditionally re-sets `Authorization` reaches the new host regardless of `shouldCopyHeaderOnRedirect`, because `CheckRedirect` runs and can mutate the outgoing request *before* the header-copy logic would have stripped it: `TestRedirect_CustomCheckRedirect_CanReattachAuth` passes, proving the escape hatch exists and is exactly as dangerous as it sounds.

The asymmetry is the sharpest edge here: a redirect from `example.com` to `sub.example.com` keeps `Authorization` (destination is a subdomain of the origin); the reverse, `sub.example.com` to `example.com`, strips it (the origin is not a subdomain of the destination). A registry that redirects a blob GET to `blobs.example.com` while the API lives at `example.com` gets its credentials stripped unless it names its API host as a subdomain of the blob host — which is backwards from how most registries are actually laid out (API at the apex or a generic subdomain, storage at a different, unrelated subdomain or entirely different provider, e.g. an S3 bucket). In practice this means: **do not rely on stdlib's stripping rule to "just work" for a same-registrable-domain redirect** — verify the actual hostnames in play, and if the registry's blob storage genuinely needs the bearer token forwarded, do it explicitly and deliberately in `CheckRedirect` after checking the destination is the registry's own storage host, never by assuming subdomain geometry lines up.

### 6. Registry transport defaults

`http.DefaultTransport` (`go1.27.1:src/net/http/transport.go:47-58`):

```go
var DefaultTransport RoundTripper = &Transport{
    Proxy: ProxyFromEnvironment,
    DialContext: defaultTransportDialContext(&net.Dialer{
        Timeout:   30 * time.Second,
        KeepAlive: 30 * time.Second,
    }),
    ForceAttemptHTTP2:     true,
    MaxIdleConns:          100,
    IdleConnTimeout:       90 * time.Second,
    TLSHandshakeTimeout:   10 * time.Second,
    ExpectContinueTimeout: 1 * time.Second,
}
```

`DefaultMaxIdleConnsPerHost = 2` (`go1.27.1:src/net/http/transport.go:62`) is *not* in that literal — it is `Transport`'s zero-value fallback, applied per-host, and it is the one field a registry client almost always wants to raise, because a registry client talks to very few hosts (the registry itself, maybe one CDN) far more often than the general-purpose default assumes.

`google/go-containerregistry@0c8bedb78437:pkg/v1/remote/options.go:116-129`'s `DefaultTransport` keeps every one of stdlib's values **except** `MaxIdleConnsPerHost`, which it raises to 50 with the comment "we usually are dealing with 2 hosts (at most), split `MaxIdleConns` between them" — i.e. it derives the per-host figure from the same `MaxIdleConns: 100` total rather than inventing a new number. `Cloudflare's guide` ("The complete guide to Go net/http timeouts") adds `ResponseHeaderTimeout` (bounding only the header-read phase after the request is sent, distinct from `Client.Timeout`'s whole-exchange bound) as a further knob worth setting explicitly when `Client.Timeout` alone is judged too coarse (e.g. a client that streams a large response body and does not want the *whole* transfer time-boxed, only the time-to-first-byte).

**Decision:** a registry-shaped client's `Transport` sets `DialContext` with an explicit `net.Dialer{Timeout: ...}`, `TLSHandshakeTimeout`, `IdleConnTimeout`, `ForceAttemptHTTP2: true`, keeps `Proxy: http.ProxyFromEnvironment` (gosec has no rule against this; it is the documented default and correct for a CLI that must honour `HTTPS_PROXY`), and raises `MaxIdleConnsPerHost` above 2 — `go-containerregistry`'s 50 (derived from splitting `MaxIdleConns` across "usually 2 hosts") is a reasonable default to copy rather than re-derive.

### 7. The server SHOULD section

Three gosec rules cover this ground and each has a documented, narrow scope ([securego/gosec RULES.md](https://github.com/securego/gosec/blob/master/RULES.md)):

- **G107** — "URL provided to HTTP request as taint input." Flags a URL value passed to an HTTP call that did not originate as a `const`; `securego.io`'s own G107 example shows it firing on `var url string = "https://www.google.com"; http.Get(url)` — a hardcoded value, not attacker-controlled — which is the rule's known noise shape (see [AI-agent angle](#ai-agent-angle) and [Contested](#contested--evolving)).
- **G112** — "Detect ReadHeaderTimeout not configured as a potential risk." Fires on an `&http.Server{}` literal with no `ReadHeaderTimeout` field.
- **G114** — "Use of net/http serve function that has no support for setting timeouts." Fires on `http.ListenAndServe`/`ListenAndServeTLS` (the package-level convenience functions), which construct their own `*http.Server` internally and give the caller no way to reach it.

[`Server.ReadHeaderTimeout`](https://pkg.go.dev/net/http#Server) (`go1.27.1:src/net/http/server.go:3072-3078`): "the amount of time allowed to read request headers. The connection's read deadline is reset after reading the headers ... If zero, the value of ReadTimeout is used. If negative, or if zero and ReadTimeout is zero or negative, there is no timeout." Fixture `slowloris_test.go` proves both ends: a server with neither field set never disconnects a client that sends one byte every 50ms and never completes its headers (still connected after 1.2s of budget); the same server with `ReadHeaderTimeout: 300ms` closes the connection (observed as `EOF` on the client's next read) within ~300ms.

Measured: 41 of 56 sampled `&http.Server{}` literals have no `ReadHeaderTimeout` (73% unguarded); `tailscale/tailscale` alone accounts for 31 of the 41 misses, and `caddyserver/caddy` is the one repo in the sample that is majority-guarded ([go-audit/exemplar-runtime-posture.md §5](../go-audit/exemplar-runtime-posture.md)). Cloudflare's guide separately warns that server-side `WriteTimeout` measures from *connection accept* on a TLS listener (so it silently eats the handshake and header-read time too) and that there is no way to reset it from inside a streaming `ServeHTTP` — a reason to prefer bounding writes via the request's own context deadline (propagated from `ReadHeaderTimeout`/`ReadTimeout`) rather than a blanket `WriteTimeout` on a server that streams responses.

`Shutdown` ([pkg.go.dev/net/http `Server.Shutdown`](https://pkg.go.dev/net/http#Server.Shutdown)): "gracefully shuts down the server without interrupting any active connections," by closing listeners then waiting (indefinitely, unless the caller's `ctx` has a deadline) for connections to go idle. The SHOULD: `signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)` plus a bounded `ctx` passed to `Shutdown`, so a stuck connection cannot hang a deploy forever.

`MaxBytesReader` bounds an inbound *request* body inside a handler: `http.MaxBytesReader(w, r.Body, n)` "returns a non-nil error of type `*MaxBytesError` for a Read beyond the limit, and closes the underlying reader when its Close method is called" — the server-side half of the LimitReader-shaped bound in [§3](#3-body-bounds-limitreaders-1-trick-and-the-256kib-auto-drain-surprise); use it before decoding any request body a fleet-authored server accepts.

### 8. hostport: vet's same-function limit

`go vet`'s `hostport` analyzer (default-on at 1.27.1, no special flag needed) flags `fmt.Sprintf("%s:%d", host, port)`-shaped address construction that reaches `net.Dial`/`net.Listen` because it breaks on an IPv6 literal host (`"::1:8080"` parses as something other than the intended address). `net.JoinHostPort(host, port)` is the fix and handles IPv6 bracketing correctly.

Fixture `hostport/` confirms the map's own finding (`hostport fires only when the Sprintf result reaches net.Dial in the same function`) exactly: `samefunc_bad.go`'s `DialSprintf` (Sprintf and `net.Dial` in one function) is flagged; `crossfunc.go`'s `DialAcrossHelper`, which has the **identical bug** — a helper `buildAddr` does the Sprintf, a different function calls `net.Dial` on its result — is not flagged at all, on the same `go vet ./...` run. `samefunc_good.go`'s `net.JoinHostPort`-based version is clean either way.

**GO-NET's rule text must state the limit explicitly**: `go vet`'s `hostport` finding is sufficient evidence of the defect, but its silence is not sufficient evidence of the defect's absence — a reviewer reading code that builds an address string in one function and dials in another must check the construction by eye, because the analyzer will not.

### 9. usestdlibvars and gosec G107: scope caveats

`usestdlibvars` (golangci-lint, wave 2's [go-gates.md](../go-gates.md) confirms it "fires only on a typed `resp.StatusCode == 200`-shaped literal comparison") catches exactly that AST shape — a comparison between a value statically typed as (or provably derived from) `int` holding an HTTP status and a numeric literal matching a `net/http` `Status*` constant. It does not catch a status compared through an interface, through a wrapper's accessor whose return type it cannot trace (`resp.HTTPResponse().StatusCode`, regclient's own shape, still triggers it fine since the accessor's return type is `*http.Response`), or a status value round-tripped through a `string`/`fmt.Sprintf`. Treat it as a style SHOULD: always spell `http.StatusOK` etc., but do not rely on the linter's silence as proof every comparison in a codebase already does.

G107 is the noisiest of the three gosec rules used here by design: it is a taint-shaped check that in practice fires on any non-`const` string handed to an HTTP call, including a hardcoded `var`. Treat a G107 finding as "confirm this URL cannot be attacker-influenced" rather than "rewrite this as a `const`" — the fix that actually matters is validating/allow-listing the URL's origin when it *can* be, not silencing the linter by changing a `var` to a `const` on a value that was never user-controlled to begin with.

## Normative guidance candidates

1. **GO-NET-01 (MUST).** Every `*http.Client` a program constructs sets `Timeout > 0`; never use `http.DefaultClient`, `http.Get`, `http.Post`, `http.Head` or `http.PostForm` for a real (non-throwaway) request.
   - **Rationale:** a context deadline only protects call sites that build one; `Timeout` is the client-level backstop against a caller that passed `context.Background()` (which GO-CONC-01 forbids in library code but cannot enforce transitively at every call site). 87/143 client literals in the corpus have no `Timeout` ([run §5](../go-audit/exemplar-runtime-posture.md)).
   - **Verify:** `grep -rn --include='*.go' -e '&http\.Client{' -e 'http\.Get(' -e 'http\.Post(' -e 'http\.Head(' -e 'http\.DefaultClient' .` then read forward from each `&http.Client{` hit for a `Timeout:` field within its literal (a grep-only check cannot see across the multi-line literal, so this is grep-to-locate plus a reading step). Empty output on the `Get`/`Post`/`Head`/`DefaultClient` alternatives is itself a partial pass signal.
   - **RUN:** yes — `timeout_test.go`, [fixture path below](#verification-runs).

2. **GO-NET-02 (MUST).** Every function that obtains an HTTP response (directly, or through one layer of custom wrapper) closes its body on every return path, or transfers the response into a returned value whose contract makes the *caller* responsible for closing it — checked whether or not that response ever satisfies `bodyclose`'s pattern.
   - **Rationale:** `bodyclose` measured ≈92% false-positive on regclient's wrapper-shaped code (2 real leaks in 13 call sites; see [Finding 2](#2-bodyclose-hand-classified-demoted-and-what-replaces-it)), which fails the map's ≤1 FP/10k LOC bar by roughly 11×. The two real leaks found (`BlobDelete`, `BlobGet`'s error branch) prove the underlying risk is real even where the linter is useless.
   - **Verify:** named reading heuristic — for each function that calls a `Do`-shaped method, trace every `return` and confirm a `Close()` call (direct or via the wrapper) or an ownership-transferring construction (`NewReader(..., WithReader(resp), ...)`-shaped) precedes it, on *every* branch including error returns. `bodyclose` remains an informational SHOULD, scoped per GO-GATE-19 to packages calling `net/http` directly (no custom response wrapper in the call chain).
   - **RUN:** partially — hand-classification against real code (`regclient/regclient@43d2acb9fafd`) was run and read; the heuristic itself was not encoded as an executable linter (none exists that understands the ownership-transfer shape), so this is "no, reading heuristic only" per the required disclosure, backed by a real, reproduced defect rather than a hypothetical one.

3. **GO-NET-03 (MUST).** Bound every untrusted response body with `io.LimitReader(resp.Body, n+1)` before `io.ReadAll`, and treat a read of exactly `n+1` bytes as "reject: body exceeds the bound," never as "silently truncate and continue."
   - **Rationale:** unbounded `io.ReadAll` on a response body has no ceiling; a 1 GiB body is consumed in full in ~1.2s on loopback with default settings ([Finding 3](#3-body-bounds-limitreaders-1-trick-and-the-256kib-auto-drain-surprise)). The `+1` trick distinguishes "body was exactly at the limit" from "body was larger and got truncated," mirroring `http.MaxBytesReader`'s own off-by-one design.
   - **Verify:** `grep -rn --include='*.go' -e 'io\.ReadAll(' . | grep -v -e '_test\.go'` then, for each hit whose argument traces to a response/request body, confirm a preceding `io.LimitReader`/counting reader in the same data-flow (reading step; a bare grep cannot prove absence of a prior bound three lines up).
   - **RUN:** yes — `bodylimit_test.go`.

4. **GO-NET-04 (MUST).** A retry wrapper retries only 429, 503 and other 5xx except 501, and only for idempotent methods (GET, HEAD, PUT, DELETE, OPTIONS, TRACE, [RFC 9110 §9.2.2](https://www.rfc-editor.org/rfc/rfc9110#section-9.2.2)) unless the request carries an explicit idempotency key; backoff is exponential with jitter, bounded by a min and max.
   - **Rationale:** `hashicorp/go-retryablehttp`'s `DefaultRetryPolicy` retries any method on a 500, which risks a duplicate side effect for POST/PATCH; `google/go-containerregistry`'s retry transport is opt-in by status code and checks error-temporariness, not method, either — the idempotency check is something a fleet wrapper must add itself, it is not inherited free from either reference implementation.
   - **Verify:** named reading heuristic on the retry wrapper's `CheckRetry`/predicate function: does it inspect `req.Method` (or an explicit idempotency-key field) before deciding to retry a request that already reached the server? No linter checks this; it is a design-review item.
   - **RUN:** no, reading heuristic only — confirmed by reading `hashicorp/go-retryablehttp@main:client.go:472-534` and `google/go-containerregistry@0c8bedb78437:pkg/v1/remote/transport/retry.go` directly; no fixture needed since the absence of a method check is provable by inspection of the linked source.

5. **GO-NET-05 (MUST).** Parse `Retry-After` with both forms RFC 9110 §10.2.3 allows: an integer delay-seconds (`strconv.Atoi`/`ParseInt`) or an HTTP-date (`http.ParseTime`, which accepts RFC 1123, RFC 850 and ANSI C `asctime` forms). Never `time.ParseDuration(header + "s")` alone.
   - **Rationale:** that exact shape is `regclient/regclient@43d2acb9fafd:internal/reghttp/http.go:694-695`'s bug — the HTTP-date form fails to parse, the error is discarded, and the computed delay is silently `0`, meaning "retry immediately" instead of honouring the server.
   - **Verify:** `grep -rn --include='*.go' -e 'ParseDuration(.*Retry-After' -e 'Retry-After.*ParseDuration' .` (empty output is necessary but not sufficient — the two-line split in the real bug, `Get` on one line and `ParseDuration` two lines later, will not match a single-line pattern; treat a hit as conclusive and a miss as "read the Retry-After handling by eye"). A stronger check: confirm the parser calls something equivalent to `http.ParseTime` on the fallback path.
   - **RUN:** yes — `retryafter_test.go`, reproducing the exact regclient shape (`parseRetryAfterBroken`) beside a correct parser and a live 429 response carrying each form.

6. **GO-NET-06 (SHOULD).** Do not assume `Authorization` survives an HTTP redirect to a different registrable domain, or even to what looks like "the same service on a different port" — Go's stripping rule compares `url.URL.Hostname()` only (port-blind) and is asymmetric (destination-is-subdomain-of-origin keeps credentials; the reverse direction strips them).
   - **Rationale:** the default client already does the safe thing for a true cross-host redirect ([Finding 5](#5-redirect-authorization-what-1271-actually-strips)); the risk is a developer's *mental model* being wrong about which redirects count as "cross-host," not the stdlib default itself.
   - **Verify:** named reading heuristic — for a registry client that must forward credentials across a real redirect (blob storage on a different host than the API), confirm the code path that does so validates the destination host explicitly, rather than relying on assumed subdomain geometry.
   - **RUN:** yes — `redirect_test.go` (all three sub-cases: cross-host strips, same-host forwards, custom `CheckRedirect` can re-attach).

7. **GO-NET-07 (MUST).** Never write a `CheckRedirect` that unconditionally re-adds `Authorization`, `Cookie` or any header stdlib's default deliberately strips, without first checking the destination host against an explicit allow-list.
   - **Rationale:** fixture `TestRedirect_CustomCheckRedirect_CanReattachAuth` proves the API allows exactly this, with no guard rail — a `CheckRedirect` runs and can mutate the outgoing request however it likes, before the header-copy logic that would otherwise have stripped the header even runs.
   - **Verify:** named reading heuristic — read every `CheckRedirect` implementation in the codebase for a header `Set`/`Add` call and confirm a preceding host check.
   - **RUN:** yes — same fixture as GO-NET-06 demonstrates the mechanism exists; the "must be guarded" half is a design-review item, not something a fixture can fail on its own (a `CheckRedirect` that reattaches unconditionally still "works" functionally; the defect is a security posture, not a crash).

8. **GO-NET-08 (SHOULD).** A registry-shaped HTTP client sets an explicit `Transport`: `DialContext` with a `net.Dialer{Timeout: ...}`, `TLSHandshakeTimeout`, `IdleConnTimeout`, `ForceAttemptHTTP2: true`, `Proxy: http.ProxyFromEnvironment`, and `MaxIdleConnsPerHost` raised above stdlib's default of 2 (`go-containerregistry`'s 50, derived from splitting `MaxIdleConns: 100` across "usually 2 hosts," is a reasonable value to copy).
   - **Rationale:** stdlib's `DefaultTransport` is tuned for a general-purpose client talking to many different hosts; a registry client talks to very few hosts very often, so the per-host idle-connection cap is the one field worth deliberately overriding (`go1.27.1:src/net/http/transport.go:47-62`; `google/go-containerregistry@0c8bedb78437:pkg/v1/remote/options.go:116-129`).
   - **Verify:** named reading heuristic — does the client's `Transport` set `MaxIdleConnsPerHost` explicitly, or does it inherit the value-2 default while making many repeated calls to the same host? No linter flags an unset field with a documented-but-unhelpful zero value.
   - **RUN:** no, reading heuristic only — the stdlib and go-containerregistry values were read from source; no runtime behavior distinguishes "correct" from "default" cheaply enough to be worth a fixture here (both function; the difference is connection-reuse efficiency under load, not a pass/fail outcome a short-lived test can observe reliably).

9. **GO-NET-09 (MUST).** Every `http.Server` a program constructs sets `ReadHeaderTimeout > 0` (gosec G112); never call `http.ListenAndServe`/`http.ListenAndServeTLS` directly outside a disposable example (gosec G114) — construct an `*http.Server` so `ReadHeaderTimeout` and `Shutdown` are reachable.
   - **Rationale:** a server with neither field set has no bound on how long it waits for a client to finish sending headers — the slowloris shape; 41/56 sampled server literals in the corpus have no `ReadHeaderTimeout` ([run §5](../go-audit/exemplar-runtime-posture.md)).
   - **Verify:** `golangci-lint run --enable-only=gosec ./...` with G112 and G114 enabled (both are in gosec's default rule set); grep fallback: `grep -rn --include='*.go' -e 'http\.ListenAndServe(' -e 'http\.ListenAndServeTLS(' .` (empty output means no bare convenience-function call exists) plus a reading check that every `&http.Server{}` literal sets `ReadHeaderTimeout`.
   - **RUN:** yes — `slowloris_test.go` (a raw-TCP slowloris client against a server with and without `ReadHeaderTimeout`).

10. **GO-NET-10 (SHOULD).** A server registers a graceful shutdown path: catch `SIGTERM`/`SIGINT` (`signal.NotifyContext`), call `srv.Shutdown(ctx)` with a bounded grace period, and treat a `Shutdown` that does not return before the grace period expires as a forced exit.
    - **Rationale:** `Shutdown` "gracefully shuts down the server without interrupting any active connections" but will wait indefinitely absent a deadline on the passed context — a caller that does not bound the wait can hang a deploy on one stuck connection ([pkg.go.dev/net/http `Server.Shutdown`](https://pkg.go.dev/net/http#Server.Shutdown)).
    - **Verify:** named reading heuristic — does `main` (or the service's top-level runner) call `srv.Shutdown` from a signal handler, and is the context passed to it derived with a timeout?
    - **RUN:** no, reading heuristic only — this is a `main`-level wiring pattern, not a unit-testable mechanism distinct from `Shutdown`'s own documented and already-relied-upon behavior; a fixture would only re-test stdlib's own `Shutdown`, not the fleet's use of it.

11. **GO-NET-11 (SHOULD).** A fleet-authored server bounds every request body it decodes with `http.MaxBytesReader(w, r.Body, n)` before passing it to a decoder.
    - **Rationale:** the server-side half of GO-NET-03's body-bound rule; `MaxBytesReader`'s documented purpose is exactly "prevent clients from accidentally or maliciously sending a large request and wasting server resources."
    - **Verify:** `grep -rln --include='*.go' -e 'func.*http\.ResponseWriter.*http\.Request' . | xargs -r grep -L 'MaxBytesReader'` (lists handler files with no `MaxBytesReader` call at all; a false positive on a handler that never reads a body is expected and requires a reading step to confirm).
    - **RUN:** no, reading heuristic only — `http.MaxBytesReader`'s documented behavior was not independently re-verified by fixture in this dive (it is a stdlib guarantee, not a fleet-authored mechanism whose correctness is in question); GO-NET-03's client-side `LimitReader` fixture already exercises the identical off-by-one logic this rule depends on.

12. **GO-NET-12 (MUST).** Build every `host:port` string with `net.JoinHostPort(host, port)`; never `fmt.Sprintf("%s:%d", host, port)` or string concatenation.
    - **Rationale:** `Sprintf("%s:%d", ...)` breaks on an IPv6 literal host; `net.JoinHostPort` brackets IPv6 correctly.
    - **Verify:** `go vet ./...` (the `hostport` analyzer is default-on at 1.27.1) — **but state the limit**: it only fires when the `Sprintf` result reaches `net.Dial`/`net.Listen` in the *same function*; a construction split across a helper is invisible to it. Grep fallback for the same-function case: `grep -rn --include='*.go' -e 'Sprintf("%s:%d"' .` then read forward for a `net.Dial`/`net.Listen` call anywhere in the same file, not just the same function (a stricter, over-inclusive substitute for the analyzer's real scope).
    - **RUN:** yes — `hostport/samefunc_bad.go` (flagged), `hostport/crossfunc.go` (same defect, split across a helper, not flagged), `hostport/samefunc_good.go` + `hostport_twin/` (clean).

13. **GO-NET-13 (SHOULD).** Always spell HTTP status codes with the `http.Status*` constants; do not rely on `usestdlibvars` catching every literal comparison.
    - **Rationale:** `usestdlibvars` only fires on a typed `resp.StatusCode == 200`-shaped literal comparison — a status value that has passed through a `string`, an interface, or certain wrapper accessor patterns will not be flagged even when miswritten.
    - **Verify:** `golangci-lint run --enable-only=usestdlibvars ./...` for the cases it does catch; `grep -rn --include='*.go' -e '\.StatusCode ==' -e '\.StatusCode !=' . | grep -vE 'http\.Status[A-Za-z]+'` as a reading-oriented supplement (lists every raw-integer status comparison for manual confirmation the constant form was intentionally skipped, if ever).
    - **RUN:** no, reading heuristic only — this restates and scopes wave 2's already-confirmed linter behavior ([go-gates.md](../go-gates.md)); no new fixture was needed to reconfirm a fact already watched in wave 2.

14. **GO-NET-14 (SHOULD).** Treat a gosec G107 finding as "confirm this URL's origin cannot be attacker-influenced," not as "make the variable a `const`."
    - **Rationale:** G107 fires on any non-`const` string handed to an HTTP call, including a hardcoded `var` with a literal value — changing `var` to `const` silences the linter without addressing any real SSRF risk when the value already could not be attacker-controlled, and does nothing for a genuinely tainted URL that happens to flow through a `const`-looking indirection the analyzer still treats as safe.
    - **Verify:** named reading heuristic — for each G107 finding, trace the URL's origin: request input, config, or a genuine literal. Only the first needs a fix (validation/allow-list), and the fix is not "declare it `const.`"
    - **RUN:** no, reading heuristic only — `securego.io`'s own G107 example (`var url string = "https://www.google.com"`) demonstrates the false-positive shape directly from the rule's own documentation; no fixture was built since the rule's behavior is already demonstrated by its author's chosen example.

## Verification runs

All commands below run through `/home/mherwig/.cache/research-lang/go-tools/run.sh` (Go 1.27.1, `GOTOOLCHAIN=local`, golangci-lint 2.14.0) from `/home/mherwig/.cache/research-lang/go-tools/fixtures/http-client-server/`.

| # | Fixture | Command | Violation exit | Twin exit | Relevant output |
|---|---|---|---|---|---|
| 1 | `timeout_test.go` | `go test -run TestClient -v .` | n/a (both are assertions inside one run) | 0 | `TestClient_NoTimeout_Hangs`: "confirmed: http.Get with no Timeout is still blocked after 1.5s". `TestClient_WithTimeout_Fails`: "confirmed: Client.Timeout=300ms failed in 300.8ms" |
| 2 | `drain_test.go` | `go test -run TestBody -v .` | n/a | 0 | No-drain (2 MiB body, 8-byte read then Close): `reused=0 fresh=5`. Drained (`io.Copy(io.Discard, ...)` then Close): `reused=4 fresh=1` |
| 3 | `bodylimit_test.go` | `go test -run TestBody_Unbounded -v . -timeout 55s` then `-run TestBody_LimitReader` | 0 (both pass; the "violation" is the *behavior*, not a test failure) | 0 | Unbounded: "pulled all 1073741824 bytes (1 GiB) into memory", 1.24s. Bounded: exactly `10485761` bytes (limit+1), 0.01s |
| 4 | `retryafter_test.go` | `go test -run TestRetryAfter -v .` | 0 | 0 | Broken: `parseRetryAfterBroken("Sun, 27 Sep 2026...") = 0s`. Correct: same input `= 25h58m55s, ok=true` |
| 5 | `redirect_test.go` | `go test -run TestRedirect -v .` | 0 | 0 | Cross-host (different `Hostname()`): stripped. Same-host: forwarded. Custom `CheckRedirect`: re-attached |
| 6 | `slowloris_test.go` | `go test -run TestServer -v . -timeout 25s` | 0 (no-timeout twin logs "still hanging" as the expected/confirmed behavior) | 0 | No `ReadHeaderTimeout`: connection open after 1.2s of trickled bytes. `ReadHeaderTimeout: 300ms`: connection closed (`EOF`) at 300.6ms |
| 7 | `hostport/samefunc_bad.go` vs `hostport/crossfunc.go` vs `hostport_twin/` | `go vet ./hostport/...` then `go vet ./hostport_twin/...` | **1** (`address format "%s:%d" does not work with IPv6 (passed to net.Dial at L12)`, `samefunc_bad.go:11:22` only — `crossfunc.go`'s identical bug is silent) | **0**, empty output | See exact text above |
| 8 | regclient `bodyclose` classification | `golangci-lint run --config <bodyclose-only, uniq-by-line:false, no caps> ./...` inside the read-only exemplar clone | n/a (measurement, not a fixture) | n/a | 120 total findings, 75 non-test; 2 functions (`BlobDelete`, `BlobGet`) genuinely leak on at least one return path; the other 11 call sites are wrapper-Close false positives |

For #3, both the violation and the fix are separate `PASS`ing tests by design — the fixture asserts the *behavior* (all bytes consumed vs. bytes capped at the limit), not a pass/fail outcome, because "the linter/tool catches this" does not apply (there is no linter for unbounded `ReadAll`; the check is architectural). Rows 1, 2, 5 and 6 are the same shape: both the "bad" and "good" tests pass, each asserting what actually happens under that configuration, which is the correct way to watch a *runtime-behavior* rule red/green (as opposed to a *lint* rule, where the violation fixture fails a linter and the twin passes it, as in row 7).

## Exemplar evidence

| Candidate | Satisfies | Violates | Notes |
|---|---|---|---|
| GO-NET-01 (`Client.Timeout`) | `oras-project/oras@a0cd4de5cfcd` (spot-check: registry commands construct `&http.Client{Timeout: ...}` via the auth library) | `syncthing/syncthing@94c3c1cdef71:lib/ur/usage_report.go:360` (elaborate `Transport` config, no `Timeout`) | Corpus-wide 87/143 client literals miss it ([run §5](../go-audit/exemplar-runtime-posture.md)) |
| GO-NET-02 (close-and-drain) | `regclient/regclient@43d2acb9fafd:scheme/reg/manifest.go:141` (`defer resp.Close()` right after the error check) | `regclient/regclient@43d2acb9fafd:scheme/reg/blob.go:47-63` (`BlobDelete`, no `Close()` on either branch); `scheme/reg/blob.go:67-118` (`BlobGet`, leaks on the `!= 200` branch only) | Both violations found by hand-reading this dive's own `bodyclose` run, not by the linter's ranking |
| GO-NET-03 (body bounds) | n/a — no corpus repo streams a comparably adversarial body under test in this dive's scope | Corpus-wide: 215 `io.ReadAll(...Body)` vs 105 `LimitReader` sites ([run §5](../go-audit/exemplar-runtime-posture.md)) — the gap is the exposure, not attributed to a specific confirmed-unbounded call site in this dive |
| GO-NET-04/05 (retry, Retry-After) | `google/go-containerregistry@0c8bedb78437:pkg/v1/remote/transport/retry.go` (opt-in status codes; no method check either, so not a full pass) | `regclient/regclient@43d2acb9fafd:internal/reghttp/http.go:694-695` (drops the HTTP-date `Retry-After` form) | `hashicorp/go-retryablehttp@main` handles both `Retry-After` forms correctly but ignores method idempotency for its own retry trigger |
| GO-NET-06/07 (redirect-auth) | stdlib default itself ([Finding 5](#5-redirect-authorization-what-1271-actually-strips)) | none identified in this corpus (no exemplar's `CheckRedirect` was found reattaching `Authorization` unconditionally; this dive did not exhaustively grep all 35 repos for `CheckRedirect` implementations — out of this brief's fixture budget) | Candidate for a follow-up grep sweep if the fleet ships more than one registry client |
| GO-NET-08 (registry transport defaults) | `google/go-containerregistry@0c8bedb78437:pkg/v1/remote/options.go:116-129` | n/a | Direct model for the fleet's own registry client transport |
| GO-NET-09 (`ReadHeaderTimeout`/no bare `ListenAndServe`) | `caddyserver/caddy@54937914234b` (majority-guarded in the sample); `etcd-io/etcd@7583cc6e7e27:server/etcdmain/grpc_proxy.go:575` (clean citation) | `tailscale/tailscale@6b3a45f14ef6` (31 of the corpus's 41 unguarded `&http.Server{}` literals) | [run §5](../go-audit/exemplar-runtime-posture.md) |
| GO-NET-12 (`hostport`) | any exemplar using `net.JoinHostPort` (widespread; not separately tallied in this dive) | not separately measured across the corpus in this dive — the fixture proves the analyzer's mechanism and limit, which is what the brief asked for, not a corpus census | Wave-2 `go-gates.md`/`[map] M3` already registered `hostport` as a `go fix` analyzer too |

## AI-agent angle

- **`http.Get`/`http.Post` as the reflexive choice.** An LLM trained on years of tutorial code reaches for the package-level convenience functions by default; they compile, run, and work in every demo — until the target hangs. Smallest check: the GO-NET-01 grep for `http\.Get\(`/`http\.Post\(`/`http\.DefaultClient` with no exceptions list; there is no legitimate production use.
- **`defer resp.Body.Close()` treated as sufficient.** An agent that has internalized "always close the body" stops there; it does not additionally drain the body, and does not notice when the "response" is a hand-rolled wrapper type whose `Close()` needs tracing, not assuming. Smallest check: for any response type that is not literally `*http.Response`, read its `Close()` method once and confirm it reaches `.Body.Close()` — do not trust the method name.
- **`ioutil.ReadAll` or unbounded `io.ReadAll` on a response body "because it's simple."** Pre-1.16 muscle memory (`io/ioutil` is soft-deprecated) compounds with no size discipline at all — an agent asked to "read the response" writes exactly `io.ReadAll(resp.Body)` with nothing upstream of it. Smallest check: GO-NET-03's grep, `io\.ReadAll\(` on a body, then confirm a `LimitReader` precedes it in the same function.
- **A hallucinated or misremembered `http.Client.RetryOn` / retry-by-default belief.** Some agents assume `net/http` retries transient failures itself (it does not — zero retries, ever, at any layer) and either add no retry logic or bolt on a retry that ignores method idempotency because "the client already handles safe retries." Smallest check: grep the codebase for any retry wrapper's predicate function and confirm it inspects `req.Method` (GO-NET-04); absence of any retry logic at all around a registry client is also worth flagging, since none of the stdlib types add it.
- **Assuming `Retry-After` is always a plain integer.** An agent writing a "handle 429" branch from memory of the common case reaches for `strconv.Atoi(header)` or `time.ParseDuration(header + "s")` and never learns the HTTP-date form exists, because the delay-seconds form is what nearly every rate-limit example on the internet shows. Smallest check: GO-NET-05 — confirm the parser has a second branch for a date string, not just a numeric one.
- **Assuming stdlib's redirect-Authorization stripping is either "always happens" or "never happens."** An agent that knows the rule exists in the abstract ("stdlib strips Authorization on redirect, that's secure") will not notice the port-blindness or the subdomain-direction asymmetry, and will either over-trust a same-registrable-domain redirect or add unnecessary manual stripping where stdlib already handles it. Smallest check: GO-NET-06's reading heuristic, applied specifically at the hostnames actually in play, not the abstract rule.
- **`http.ListenAndServe(addr, handler)` as the whole server.** The single most common minimal-server snippet in any Go tutorial; an agent writing "a small server" defaults to it and gosec G114 exists specifically because this pattern is endemic. Smallest check: GO-NET-09's grep for the bare package-level convenience functions.
- **Treating `context.WithTimeout` on the request as making `Client.Timeout` redundant, or vice versa.** An agent that has learned "always pass a context with a deadline" (correctly, per GO-CONC-01) may conclude `Client.Timeout` is now unnecessary boilerplate and drop it, defeating GO-NET-01's defense-in-depth rationale the moment any caller further up the chain passes a context without one.

## Contested / evolving

- **gosec G107's false-positive rate.** The rule's own documentation example (a hardcoded `var` string) is a false positive by the rule's own showing; several projects disable it outright or restrict it to specific packages (e.g. an SSRF-focused audit surface) rather than running it fleet-wide. As of 2026-09-26, no consensus replacement exists in the golangci-lint v2 default sets; treat it as SHOULD with the GO-NET-14 reading discipline, and revisit if a lower-noise SSRF-specific analyzer emerges.
- **Whether `hashicorp/go-retryablehttp`'s method-blind retry is a bug or an accepted trade-off.** Checked against the `main` branch on 2026-09-26; no open issue or changelog entry in the repository disclaims idempotency-awareness as a design non-goal, and the library predates RFC 9110 (2022) by several years (its retry logic traces to the RFC 7231 era). This may change if the project revisits its default policy; until then, a fleet wrapper built on top of it must add the method check itself rather than assuming the dependency does.
- **`ResponseHeaderTimeout` vs `Client.Timeout` as the primary client-side knob.** Cloudflare's guide (era: the guide predates `context.Context` becoming the idiomatic cancellation mechanism for HTTP, per its own text noting context-based cancellation as the newer replacement for `Request.Cancel`) leans toward fine-grained `Transport` timeouts; current practice (post context ubiquity) leans toward `Client.Timeout` plus a context deadline as the two-layer default, with `ResponseHeaderTimeout` reserved for a client that deliberately wants unbounded body-streaming time but bounded time-to-first-byte — a narrower use case than the guide's framing suggests for general-purpose fleet code.
- **Whether `MaxIdleConnsPerHost: 50` is still the right number for a registry client in 2026.** `go-containerregistry`'s value was chosen for "usually 2 hosts"; a fleet client that also talks to `ghcr.io`-style registries plus a CDN plus a mirror may want a different split. No new measurement in this dive revisits the number itself — it is copied as a reasonable starting point, not re-derived from fleet-specific traffic patterns that do not exist yet (no fleet Go code runs today).

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [pkg.go.dev/net/http](https://pkg.go.dev/net/http) | go.dev package reference | current (tracks 1.27.1) | `Client.Timeout`, `DefaultClient`, `NewRequestWithContext`, `CheckRedirect`'s cross-host Authorization rule, `Server.ReadHeaderTimeout`/`Shutdown`, `MaxBytesReader` — primary, fetched directly |
| `go1.27.1:src/net/http/transport.go:47-62` | stdlib source (read via `run.sh go env GOROOT`) | 1.27.1, installed 2026-09-26 | `DefaultTransport`'s exact field values and `DefaultMaxIdleConnsPerHost = 2` — primary |
| `go1.27.1:src/net/http/server.go:1164,3072-3078` | stdlib source | 1.27.1 | `maxPostHandlerReadBytes = 256 << 10`; `ReadHeaderTimeout`'s doc comment verbatim — primary |
| `go1.27.1:src/net/http/transfer.go:983-1012` | stdlib source | 1.27.1 | The client-side body `Close()` auto-drain-up-to-256KiB logic — primary, explains the connection-churn fixture's threshold |
| `go1.27.1:src/net/http/client.go:826-827,1017-1045` | stdlib source | 1.27.1 | The sensitive-header list and `shouldCopyHeaderOnRedirect`/`isDomainOrSubdomain` — primary, the exact redirect-stripping mechanism |
| [RFC 9110 §9.2.2 (Idempotent Methods), §10.2.3 (Retry-After)](https://www.rfc-editor.org/rfc/rfc9110) | IETF standard | June 2022, current | The idempotent-method list and the two `Retry-After` forms; read via [MDN's Idempotent glossary](https://developer.mozilla.org/en-US/docs/Glossary/Idempotent) and [MDN's Retry-After page](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Retry-After) as accessible mirrors after the RFC text itself declined verbatim reproduction over copyright, cross-checked against `go-retryablehttp`'s own RFC-citing implementation |
| [Cloudflare: "The complete guide to Go net/http timeouts"](https://blog.cloudflare.com/the-complete-guide-to-golang-net-http-timeouts/) | vendor engineering blog | 2018-era, still the canonical reference cited by current practitioners | `DialContext`/`TLSHandshakeTimeout`/`ResponseHeaderTimeout`/`ExpectContinueTimeout` breakdown; server-side `ReadTimeout`/`WriteTimeout` interaction with TLS handshakes and streaming responses |
| [hashicorp/go-retryablehttp `client.go`](https://github.com/hashicorp/go-retryablehttp/blob/main/client.go) | the library's own source | checked 2026-09-26 against `main` | `DefaultRetryPolicy`/`baseRetryPolicy` (method-blind retry triggers), `DefaultBackoff`, `parseRetryAfterHeader` (both forms, correctly) — primary |
| [100go.co](https://100go.co/) (#79-81) | "100 Go Mistakes and How to Avoid Them," companion site | book era (2022), still cited as current practice | #79 not closing transient resources (HTTP body among them), #80 forgetting `return` after replying, #81 using the default HTTP client/server |
| [securego/gosec RULES.md](https://github.com/securego/gosec/blob/master/RULES.md) | the linter's own rule catalogue | checked 2026-09-24 install | G107, G112, G114's canonical one-line descriptions — primary |
| [securego.io G107 rule page](https://securego.io/docs/rules/g107) | gosec's own docs site | current | The rule's own chosen example, which is itself the false-positive shape (a hardcoded `var` flagged) |
| `regclient/regclient@43d2acb9fafd` | exemplar corpus clone | fetched 2026-09-26 | `internal/reghttp/http.go` (Retry-After bug, response wrapper shape), `scheme/reg/blob.go`/`manifest.go`/`ping.go`/`referrer.go`/`repo.go`/`tag.go` (bodyclose hand-classification) — primary evidence for this dive's two central findings |
| `google/go-containerregistry@0c8bedb78437` | exemplar corpus clone | fetched 2026-09-26 | `pkg/v1/remote/options.go` (`DefaultTransport`), `pkg/v1/remote/transport/retry.go` (opt-in status-code retry, no method check) — primary |
| [go-audit/exemplar-runtime-posture.md §5](../go-audit/exemplar-runtime-posture.md) | wave-1 program audit | 2026-09-26 | The corpus-wide `Timeout`/`ReadHeaderTimeout`/`LimitReader`/`InsecureSkipVerify` counts this dive builds on rather than re-measures |
| [go-gates.md GO-GATE-19](../go-gates.md) | wave-2 consolidation | 2026-09-26 | The prior `bodyclose` demotion this dive's hand-classification confirms and sharpens |
| [go-concurrency.md GO-CONC-01, GO-CONC-03](../go-concurrency.md) | wave-2 consolidation | 2026-09-26 | The context-propagation and context-taking-call MUSTs this dive cites rather than restates |
| [go-topic-map.md](../go-topic-map.md) | phase-3 topic map | 2026-09-26 | The brief's own source: rows M-H-01..06, M-H-09, M-H-11's hostport caveat, and the wave-2 settled verdicts this dive was told to take as given |
