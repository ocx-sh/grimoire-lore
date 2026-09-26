---
title: "Idle-read watchdog, go-containerregistry retried writes, and the dist CDN user agent"
topic: go-network (GO-NET revision — stream stall detection, registry write retries, dist user agent)
agent: network/stream-stall-and-retry
model: sonnet
date_researched: 2026-09-26
sources_count: 15
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/stream-stall-and-retry/
scope: >
  Answers three unwatched GO-NET rows from go-network.md's Open Questions:
  GO-NET-06's blob-streaming idle-read watchdog (fixtured), a fourth
  go-containerregistry write-path gap for GO-NET-17 (fixtured), and GO-NET-18's
  dist-CDN user-agent premise (measured live, not fixtured — there is no
  planted-violation/twin pair for a live third-party HTTP endpoint). Does not
  revisit GO-NET-01..05, -07..-16 or -19; their text and fixtures are
  unchanged. Does not cover TLS/proxy behavior of the retried transport, or
  pull/read-path retries (only the write path, which is what GO-NET-17 binds).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [GO-NET-06 — the idle-read watchdog](#1-go-net-06--the-idle-read-watchdog)
   2. [go-containerregistry's retried blob write](#2-go-containerregistrys-retried-blob-write)
   3. [GO-NET-18 — the dist CDN user agent](#3-go-net-18--the-dist-cdn-user-agent)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- GO-NET-06's streaming branch is now watched: `time.AfterFunc` reset per `Read` + `context.WithCancelCause` fails a stalled blob download within the idle bound, carrying a typed `*watchdog.StallErr` cause retrievable via `context.Cause(ctx)`.
- Without any watchdog, a stalled body read has no idle-based exit at all — it is still blocked past 3x the idle bound the watchdog would have used; only an external backstop (a test timeout, a process kill) ever stops it.
- go1.27.1's `net/http` has no built-in per-`Read` body idle deadline: `IdleConnTimeout` bounds only pooled-but-unused *connections* between requests, and `ResponseHeaderTimeout` bounds only the header round-trip — neither touches an in-progress body read (`go1.27.1:src/net/http/transport.go:229,235`).
- The rejected alternative — wrapping the dialed `net.Conn` and calling `SetReadDeadline` before every underlying `Read` — works, but couples idle detection to `Transport.DialContext` (conflicts with any other custom dialer) and surfaces as a generic `*net.OpError` with `Timeout()==true`, not a caller-chosen typed cause; the reader-wrapper shape needs no `Dial` hook and composes with GO-NET-03's transport clone unmodified.
- **go-containerregistry's `remote.WriteLayer`/`remote.Write` never uses the low-level, status-code-driven `retryTransport` for the blob PATCH/PUT sequence**: `uploadOne`'s `tryUpload` closure shadows `ctx := retry.Never(ctx)` before making any request, which makes `retryTransport.RoundTrip`'s own retry a no-op (`google/go-containerregistry@0c8bedb78437:pkg/v1/remote/write.go:386`, `pkg/v1/remote/transport/retry.go:97-99`).
- What actually retries a write-path 503 is a *second*, separate retry loop — `retry.Retry(tryUpload, w.predicate, w.backoff)` around the whole upload — and its predicate is `defaultRetryPredicate`, which checks `(*transport.Error).Temporary()`, backed by the package-level `temporaryStatusCodes` map (408, 429, 500, 502, 503, 504) in `transport/error.go:153-160`.
- **`remote.WithRetryStatusCodes` is measured inert on the write path.** Passing it an *empty* code list still let a planted 503 retry and succeed, because that option only feeds the disabled low-level `retryTransport`. `remote.WithRetryPredicate` is the option that actually controls write retries — a never-retry predicate turned the same 503 into a hard failure.
- A retried blob PATCH carries the **identical full body**, not an empty or truncated one: the retry re-invokes the entire `tryUpload` closure, which calls `layer.Compressed()` fresh and opens a brand-new upload session (new `POST /blobs/uploads/`, new location, new `PATCH`) — it never attempts to replay bytes on the *same*, already-sent `*http.Request`.
- The discarded 503 response body is closed, not leaked: `streamBlob`/`commitBlob` both `defer resp.Body.Close()` unconditionally. Measured: 8 total HTTP requests (across the retry) needed only 2 TCP connections, showing the small 503 body was drained on `Close` and the connection returned to the pool (the same 256 KiB auto-drain behaviour GO-NET-10 already documents).
- `remote.WithRetryBackoff` **does** matter for the write path — it's the backoff argument to the very same `retry.Retry(tryUpload, ...)` call. Left at the library default (`Duration: 1s, Factor: 3.0, Steps: 3`), a single retried write costs **≥1s** of extra latency; measured at 1.006s–1.038s across runs.
- **New GO-NET-17 gap (the fourth):** a caller who wants to retry a write on a status code outside the hardcoded `temporaryStatusCodes` set (say, a private registry's `520`) cannot do it with `WithRetryStatusCodes` — it must replace the whole predicate with `WithRetryPredicate`, wrapping `retry.IsTemporary` plus its own status check.
- GO-NET-18's premise did not reproduce today: requesting `https://setup.ocx.sh/dist.json` (the fleet's `DEFAULT_DIST_URL`) and the GitHub-release asset it points to, with `Go-http-client/1.1`, the exact Python 3.14 `urllib` default (`Python-urllib/3.14`), and `ocx-sdk-go/0.0.0`, all returned **200** on 2026-09-26 — no 403 from either host with any tested user agent, including the literal Python default the `_dist.py` docstring says gets rejected.
- GO-NET-18 stays a SHOULD, not a MUST: setting `User-Agent` is zero-cost and helps support/telemetry regardless, but the specific CDN-rejects-default-UA rationale is unconfirmed as measured and should not be cited as an enforced fact without a live re-check (bot-detection front ends commonly key on request *volume* or heuristics, not a static string, which would explain a single test request passing while a real rejection incident still happened once).
- The open question in `go-network.md` ("does the CDN reject `Go-http-client/1.1` the way it rejects `Python-urllib`?") is answered **no, not as measured on 2026-09-26** — this closes that residue row without promoting the rule.

## Findings

### 1. GO-NET-06 — the idle-read watchdog

**The shape the fixture builds and watches**, per the brief: a reader wrapper around `resp.Body` that resets a `time.AfterFunc` timer on every `Read` returning `n>0`, and on expiry calls `cancel(cause)` from a `context.WithCancelCause(ctx)` pair, where `ctx` is the same context the request was built with. The client's transport is `http.DefaultTransport.(*http.Transport).Clone()` with `ResponseHeaderTimeout` set (GO-NET-03's clone shape) and `Client.Timeout` left at `0` (GO-NET-06's existing streaming clause).

```go
type reader struct {
	rc     io.ReadCloser
	idle   time.Duration
	timer  *time.Timer
	cancel context.CancelCauseFunc
}

func Wrap(body io.ReadCloser, idle time.Duration, cancel context.CancelCauseFunc) io.ReadCloser {
	r := &reader{rc: body, idle: idle, cancel: cancel}
	r.timer = time.AfterFunc(idle, r.fire)
	return r
}
func (r *reader) fire() { r.cancel(&StallErr{Idle: r.idle}) }
func (r *reader) Read(p []byte) (int, error) {
	n, err := r.rc.Read(p)
	if n > 0 {
		r.timer.Reset(r.idle)
	}
	return n, err
}
func (r *reader) Close() error { r.timer.Stop(); return r.rc.Close() }
```
Full source: `/home/mherwig/.cache/research-lang/go-tools/fixtures/stream-stall-and-retry/watchdog/watchdog.go`.

**Wiring** (the part an agent most often gets wrong — see [AI-agent angle](#ai-agent-angle)): the `cancel` handed to `Wrap` must be the `CancelCauseFunc` for the *same* `context.Context` the request was built with via `http.NewRequestWithContext`, not a fresh one:

```go
ctx, cancel := context.WithCancelCause(context.Background())
defer cancel(nil)
req, _ := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
resp, _ := client.Do(req)
body := watchdog.Wrap(resp.Body, idle, cancel)
_, err := io.Copy(io.Discard, body)
// err wraps context.Canceled; context.Cause(ctx) is the typed *watchdog.StallErr.
```
This works because canceling a request's context aborts the in-flight read on the underlying connection — the same mechanism `Client.Timeout`/a plain `context.WithTimeout` already relies on for the whole-request case ([hcs §1](http-client-server.md), reused here per-read instead of once).

**No built-in alternative exists.** `go1.27.1:src/net/http/transport.go` has exactly three timeout knobs on `Transport`, and none of them is a per-`Read` body idle deadline:
- `IdleConnTimeout` (line 229): "the maximum amount of time an idle (keep-alive) connection will remain idle **before closing itself**" — a *between-requests* pool timeout (`transport.go:1227-1231`, `pconn.idleTimer`), not a mid-body-read one.
- `ResponseHeaderTimeout` (line 235): bounds only the wait for status line + headers (`transport.go:3078`); once the body starts streaming this timer is done.
- `ExpectContinueTimeout` (line 244): only for the `Expect: 100-continue` handshake before the request body is sent.

**The rejected alternative: a per-`Read` `SetReadDeadline` conn wrapper.** Override `Transport.DialContext` to return a wrapped `net.Conn` whose `Read` calls `conn.SetReadDeadline(time.Now().Add(idle))` before every delegated read. This also detects a stall (the deadline fires as a `*net.OpError` with `Timeout()==true`, working transparently through TLS since `tls.Conn.Read` calls the underlying conn's `Read`), but:
- it requires owning `DialContext`, which conflicts with any other custom dialer already installed on the clone (a proxy dialer, a test-only dialer, DNS caching);
- it also silently reshapes the connection's *idle-between-requests* timeout (a `SetReadDeadline` set on connect and never reset while idle would kill a perfectly reusable pooled connection early) unless carefully scoped to only the body-read phase, which needs the same amount of bookkeeping as the reader wrapper anyway;
- its failure surfaces as a generic timeout error several layers down (through `bufio`, gzip, chunked decoding), which the caller must recognize with `errors.As(err, &netErr) && netErr.Timeout()` — a weaker, less specific signal than a caller-chosen typed cause read once via `context.Cause(ctx)`.

**Decision: the reader-wrapper + `context.WithCancelCause` shape is what GO-NET-06 requires.** It needs no `Dial` hook, so it composes with whatever `DialContext` GO-NET-03's clone already carries, and it hands every caller the same one-line, type-safe check (`errors.As(context.Cause(ctx), &stallErr)`) regardless of how many decoding layers sit between the socket and `resp.Body`.

### 2. go-containerregistry's retried blob write

Read at `google/go-containerregistry@0c8bedb78437`, confirmed byte-identical at the installed `v0.22.1` module used for the fixture (only later CVE/dependency-bump commits differ; the cited lines are unchanged):

- `pkg/v1/remote/transport/retry.go:95-115` — `retryTransport.RoundTrip` calls `t.inner.RoundTrip(in)` once per attempt inside `retry.Retry(roundtrip, ...)`, but first checks `if !retry.Ever(in.Context()) { return nil }` (line 97) before ever inspecting `t.codes` for a matching status. `retry.Ever` returns `false` whenever the context was wrapped with `retry.Never` (`internal/retry/retry.go:87-93`).
- `pkg/v1/remote/write.go:386` (`uploadOne`) and `:624` (`WriteIndex`'s equivalent) — the very first line of the retried closure is `ctx := retry.Never(ctx)`, shadowing every request made afterward (`initiateUpload`, `streamBlob`, `commitBlob`) with a context the low-level `retryTransport` treats as "never retry".
- `pkg/v1/remote/write.go:469` — `return retry.Retry(tryUpload, w.predicate, w.backoff)`: the *entire* `tryUpload` closure — a fresh existence check, a fresh `POST /blobs/uploads/`, a fresh `PATCH`, a fresh `PUT` — is what actually gets retried, using the *writer's* own predicate and backoff, not the transport's.
- `pkg/v1/remote/options.go:69-79` — `defaultRetryPredicate` checks `retry.IsTemporary(err) || errors.Is(err, io.ErrUnexpectedEOF) || ... `. `retry.IsTemporary` (`internal/retry/retry.go:39-46`) is true only if the error implements `Temporary() bool` and returns true.
- `pkg/v1/remote/transport/error.go:79-90,153-160` — `(*Error).Temporary()` for a non-2xx/3xx response consults the package-level `temporaryStatusCodes` map: `{408, 429, 500, 502, 503, 504}`. This map is **not** `o.retryStatusCodes` — it is a separate, hardcoded set with no public setter.
- `pkg/v1/remote/options.go:95-104` (`defaultRetryStatusCodes`, used only by the disabled `retryTransport`) vs. `options.go:179` (where it's actually wired: `transport.NewRetry(o.transport, ..., transport.WithRetryStatusCodes(o.retryStatusCodes...))`) — this wiring is correct for **read/pull** operations (`remote.Get`, `remote.Image`, …), which do *not* wrap their context in `retry.Never`, but has no effect on `WriteLayer`/`Write`/`WriteIndex`, which do.

**Measured** ([fx] `retryreg/`, [Verification runs](#verification-runs)):
1. A planted 503 on the first blob-upload `PATCH` is followed by a retried upload that succeeds. `remote.WriteLayer` returns `nil`.
2. The retried `PATCH` carries the identical compressed body length as the failing one (33,972–33,984 bytes for a 32 KiB random layer across runs — `layer.Compressed()` gzips it, so the wire size isn't the raw size, but both attempts match each other exactly). The retry is a whole new upload session (new `POST`, new upload-session URL), not a resend on the same `*http.Request` — so whether `req.GetBody` is set (`write.go:319-325`, skipped only for `*stream.Layer`) is irrelevant to whether this particular retry succeeds.
3. 8 total HTTP requests (GET /v2/, HEAD, POST, PATCH-503, HEAD, POST, PATCH-202, PUT-201) needed only **2** TCP connections — the 503's small JSON body was drained by `resp.Body.Close()` (no explicit `io.Copy(io.Discard, ...)` needed; GO-NET-10's 256 KiB auto-drain covers it) and the connection was reused rather than torn down.
4. `remote.WithRetryStatusCodes()` called with **zero** codes still let the write retry and succeed — proving the option is inert here (it configures a `retryTransport` the write path bypasses via `retry.Never`).
5. `remote.WithRetryPredicate(func(error) bool { return false })` turned the same planted 503 into a hard, immediate failure — this is the option that actually governs write retries.
6. Leaving `remote.WithRetryBackoff` unset (library default `Duration: 1s, Factor: 3.0, Jitter: 0.1, Steps: 3`, `options.go:80-86`) made the same successful retry cost **1.006s–1.038s** of wall time across runs, versus ~15-16ms with a 10ms/2x-factor override.

### 3. GO-NET-18 — the dist CDN user agent

The fleet's Go SDK bootstraps from the same manifest its Python sibling does: `DEFAULT_DIST_URL = "https://setup.ocx.sh/dist.json"` (`ocx-sdk-python@9713f0a9ff02:src/ocx_sdk/_dist.py:63`), whose docstring claims "the CDN in front of `setup.ocx.sh` answers urllib's default `Python-urllib/3.x` with a 403" (`_dist.py:23-24`).

**Measured 2026-09-26** against both the manifest host and the actual artifact host the manifest points to (`https://github.com/ocx-sh/ocx/releases/download/v0.6.3/ocx-x86_64-unknown-linux-gnu.tar.gz`, resolved from the live manifest, `curl -sSL` following the GitHub→object-storage redirect):

| User-Agent | `setup.ocx.sh/dist.json` | GitHub release asset (HEAD, redirects followed) |
|---|---|---|
| `Go-http-client/1.1` (Go's default) | 200 | 200 |
| `Python-urllib/3.14` (this box's exact `urllib.request` default, confirmed via a real `urlopen` call, not a guessed string) | 200 | 200 |
| `ocx-sdk-go/0.0.0` | 200 | 200 |
| `curl/8.5.0` / no UA override | 200 | 200 |

Every request in every combination returned 200; no 403 was observed from either host. This means the specific, citable rationale behind GO-NET-18 (a UA-keyed 403) is **not reproducible today** against the URLs a Go SDK would actually hit. Plausible explanations that this measurement cannot distinguish between: the front-end's bot heuristic keys on request *volume*, ASN/IP reputation or TLS fingerprint rather than a static `User-Agent` string; the policy was tightened only after a past incident and has since been relaxed; or the docstring's claim was accurate for a different host that has since changed CDN vendors. None of this weakens the *practice* GO-NET-18 asks for — naming a client is free and helps a registry's own abuse triage even without an enforced block — but it does mean the rule's rationale should read as defensive best practice, not an enforced, currently-observed fact.

## Normative guidance candidates

1. **GO-NET-06 (revision, no new ID; the streaming clause's verification is now watched).** A blob-streaming `*http.Client` (`Timeout: 0`, `ResponseHeaderTimeout` set on a GO-NET-03 transport clone) wraps `resp.Body` with an idle-read watchdog: a `time.AfterFunc(idle, ...)` reset on every `Read` with `n>0`, firing a `context.CancelCauseFunc` (from `context.WithCancelCause`) with a typed stall cause, where that `ctx` is the one the request was built with.
   - Rationale: `net/http` has no built-in per-`Read` body idle deadline (`IdleConnTimeout` and `ResponseHeaderTimeout` cover different phases; `go1.27.1:src/net/http/transport.go:229,235`), and `Client.Timeout` cannot be used on a stream because it bounds the *whole* transfer, not idle gaps ([hcs §1](http-client-server.md)).
   - Verification: named reading heuristic (does the client-kind's constructor call a `Wrap`-shaped function around the body before the read loop?) plus the behavioral fixture below.
   - RUN: **yes** — `/home/mherwig/.cache/research-lang/go-tools/fixtures/stream-stall-and-retry/` (`watchdog/`, `stream_test.go`); see [Verification runs](#verification-runs) #1-3.
2. **A stall cause is always retrieved with `errors.As(context.Cause(ctx), &typed)`, never by matching the error string or by checking only `ctx.Err() == context.Canceled`.** `ctx.Err()` collapses every cancellation reason to `context.Canceled`; only `context.Cause` preserves which one it was.
   - Rationale: distinguishing "the user pressed Ctrl-C" from "the peer stalled" changes both the exit code and the retry decision a caller makes next.
   - Verification: named reading heuristic — every `cancel(err)` call site pairs with at least one `context.Cause(ctx)` read somewhere on the failure path.
   - RUN: **yes**, exercised by `TestWatchdog_DetectsStall`'s `errors.As(context.Cause(ctx), &stall)` assertion (fails the test if the cause isn't the typed value).
3. **The idle-read watchdog and `ResponseHeaderTimeout` are a matched pair, not alternatives.** The watchdog only starts once headers have arrived and the body read loop begins; it does nothing about a server that never answers headers at all, which is exactly what `ResponseHeaderTimeout` is for.
   - Rationale: a client with only one of the two either hangs on a headers-never-sent peer (watchdog alone) or accepts an unbounded, slowly-progressing body (`ResponseHeaderTimeout` alone) — GO-NET-06's own row already requires both; this candidate makes the pairing explicit so a reviewer doesn't accept a client with only one.
   - Verification: reading heuristic — the client-kind constructor sets both `ResponseHeaderTimeout` (on the transport) and wraps the body (watchdog) for any client whose `Timeout` is `0`.
   - RUN: no — a reading heuristic only; both are already exercised individually ([Verification runs](#verification-runs) #1-3 for the watchdog; `server/bad`/`server/good` in `go-network.md`'s own fixtures for `ResponseHeaderTimeout`-adjacent `G112`, though that's a server-side timeout, not this client-side one — no fixture combines both on one client in this dive).
4. **Never override `Transport.DialContext` solely to add a `SetReadDeadline`-based idle timeout when a body-reader wrapper will do.** Reserve a `DialContext` override for cases that genuinely need connection-level control (custom dialing, connection pooling metrics); layering an idle timeout onto it couples two unrelated concerns and produces a generic, unqualified timeout error instead of a typed cause.
   - Rationale: see [Findings §1](#1-go-net-06--the-idle-read-watchdog)'s comparison; the coupling is a maintenance hazard, not a correctness bug, so this is a SHOULD.
   - Verification: named reading heuristic — a `DialContext` override whose only job is calling `SetReadDeadline` inside the wrapped `Read`.
   - RUN: no — reading heuristic only (the alternative was read and compared, not built, per [Findings §1](#1-go-net-06--the-idle-read-watchdog)).
   - Severity: SHOULD.
5. **GO-NET-17 gains a fourth gap: `remote.WithRetryStatusCodes` has no effect on `remote.Write`/`WriteLayer`/`WriteIndex`.** A CLI that needs to retry a write on a status code outside `{408, 429, 500, 502, 503, 504}` uses `remote.WithRetryPredicate`, wrapping `func(err error) bool { return retry.IsTemporary(err) || myOwnCheck(err) }` (importing `github.com/google/go-containerregistry/internal/retry` is not possible — it's an internal package — so the caller re-implements the equivalent status check against a `*transport.Error`, which is exported).
   - Rationale: the option's own doc comment ("sets which http response codes will be retried") does not say it is inert for writes; an agent or a human reading it would reasonably expect it to work everywhere `remote` retries.
   - Verification: named reading heuristic — a CLI that calls `remote.WithRetryStatusCodes` alongside any `remote.Write*` call is a smell; check whether that same call site is a push (dead option) or a pull (live option).
   - RUN: **yes** — `retryreg/statuscodes_test.go`'s `TestWithRetryStatusCodes_HasNoEffectOnWrite` and `TestWithRetryPredicate_IsTheRealWriteLever`.
   - Severity: SHOULD (a documentation/usage gap, not a security or data-loss defect — the write still retries correctly on the hardcoded set; a caller only loses control over which set).
6. **A CLI that wants faster (or slower) retry timing on a registry write sets `remote.WithRetryBackoff` explicitly; it does not assume the library default is fast.** The unconfigured default costs ≥1s of wall time on the very first retried write.
   - Rationale: measured 1.006s-1.038s for a single retry at the library default vs. ~15-16ms with a 10ms-start, 2x-factor override — a CLI progress bar or a CI step timeout budget can be silently eaten by this.
   - Verification: named reading heuristic — any `remote.Write*`/`remote.WriteLayer` call site is read for a `remote.WithRetryBackoff` option; its absence is not wrong, but is a latency choice worth a one-line acknowledgment in review.
   - RUN: **yes** — `retryreg/defaultbackoff_test.go`'s `TestDefaultBackoff_TakesAtLeastOneSecond`.
   - Severity: SHOULD.
7. **GO-NET-18 stays a SHOULD; its rationale is corrected, not strengthened.** Set `User-Agent: <tool>/<version>` on every outbound request (unchanged rule text), but the rule's rationale no longer cites an enforced 403 as a currently-observed fact — it is cheap defensive practice whose payoff (support triage, abuse-team allowlisting) doesn't depend on the CDN actually blocking anything today.
   - Rationale: [Findings §3](#3-go-net-18--the-dist-cdn-user-agent) measured 200 from both the manifest host and the GitHub release asset host for every tested UA, including the exact Python default, on 2026-09-26.
   - Verification: unchanged — `grep -rn --include='*.go' -e 'User-Agent' .` must print at least one line in any module that makes HTTP calls; empty output means fail (no UA set anywhere).
   - RUN: no — this was always a reading/grep heuristic (GO-NET-18's own row already says "No: whether the CDN rejects the Go user agent itself was not measured"); it is now measured, and measured negative, which is why the severity does not change to MUST.

## Verification runs

All runs used `/home/mherwig/.cache/research-lang/go-tools/fixtures/stream-stall-and-retry/` (module `fx`, `go 1.27.1`) via `/home/mherwig/.cache/research-lang/go-tools/run.sh`, and `go-containerregistry` module `v0.22.1` (line-identical at the cited spots to the exemplar's `0c8bedb78437`).

| # | Command | Violation (no watchdog / no fix) | Twin (with watchdog / fixed) | Relevant output |
|---|---|---|---|---|
| 1 | `go test -run TestNoWatchdog_BlocksUntilBackstop -v -count=1 .` | exit 0 (test *confirms* the red behaviour; it fails only if the read stops early on its own) | — | `stream_test.go:81: confirmed red: read is still blocked 900ms after the last byte, with no idle-based mechanism to stop it` — nothing bounds the stall short of the test's own 900ms backstop |
| 2 | `go test -run TestWatchdog_DetectsStall -v -count=1 .` | — | exit 0 | `stall surfaced after 300.517647ms: copyErr=stream stalled: no read progress for 300ms cause=stream stalled: no read progress for 300ms bytesRead=4096` — fails within 1x the 300ms idle bound (well under the 2x ceiling asserted), carrying the typed cause |
| 3 | `go test -run TestWatchdog_TrickleCompletes -v -count=1 .` | — | exit 0, `PASS` | trickle server (1 byte/100ms for 3s) completes fully under the same 300ms idle bound (100ms < 300ms, so it never stalls) |
| 4 | `go vet ./... ` and `gofmt -l .` in the fixture root | — | exit 0; `gofmt -l` prints nothing | clean |
| 5 | `go test -run TestWriteLayer_RetriesAfter503 -v -count=1 ./retryreg/...` | — | exit 0 | 8 requests, 2 PATCH attempts (503 then 202), both carrying the identical ~33,972-33,984-byte compressed body; `TCP connections opened for 8 total HTTP requests (incl. the 503): 2` |
| 6 | `go test -run TestWithRetryStatusCodes_HasNoEffectOnWrite -v -count=1 ./retryreg/...` | n/a (this test IS the check that the option is inert; it fails if `WriteLayer` ever fails with an empty code list) | exit 0 | `WriteLayer succeeded even with WithRetryStatusCodes() (no codes): confirms the option is inert on the write path` |
| 7 | `go test -run TestWithRetryPredicate_IsTheRealWriteLever -v -count=1 ./retryreg/...` | exit 0 (asserts the write **fails** under a never-retry predicate) | — | `WriteLayer failed as expected with a never-retry predicate: PATCH …: UNAVAILABLE: planted 503` |
| 8 | `go test -run TestDefaultBackoff_TakesAtLeastOneSecond -v -count=1 ./retryreg/...` | — | exit 0 | `default backoff: WriteLayer succeeded after 1.006043434s` (and 1.037569648s on a second run); asserted `>= 850ms` |
| 9 | `go test -count=1 ./...` (whole fixture module, both packages) | — | exit 0, `ok fx 4.258s`, `ok fx/retryreg 1.042s`, `? fx/watchdog [no test files]` | all green together |
| 10 | `for ua in "Go-http-client/1.1" "Python-urllib/3.14" "ocx-sdk-go/0.0.0" "curl/8.5.0"; do curl -sS -o /dev/null -w "%{http_code}" -A "$ua" https://setup.ocx.sh/dist.json; done` | n/a — live measurement, no fixture; recorded as data, not a pass/fail check | — | `200 200 200 200` |
| 11 | same UA loop against `https://github.com/ocx-sh/ocx/releases/download/v0.6.3/ocx-x86_64-unknown-linux-gnu.tar.gz` with `curl -sSL -I` (redirects followed) | n/a — live measurement | — | `200 200 200` (3 UAs tested) |

Row 1 is reported as "did not go red in the failing sense" deliberately: there is no analyzer or lint that can watch "an unbounded blocking read," so the fixture's job is to demonstrate the absence of any idle-based exit, which is what a passing `TestNoWatchdog_BlocksUntilBackstop` proves (it would fail, i.e. go red, only if the naive read *did* stop on its own before the backstop — which would mean something else in the stack is already bounding it, invalidating the premise).

## Exemplar evidence

- **GO-NET-06 idle-read watchdog**: not found implemented anywhere in the 35-repo corpus by this dive's own search — this matches `go-network.md`'s existing note that the streaming branch was unfixtured because no exemplar carries the pattern verbatim; the corpus's blob-streaming clients ([reg §3](registry-client.md), go-containerregistry, oras-go, regclient) rely on their registry client's own retry/verify layer rather than an idle-read watchdog on the initial GET.
- **go-containerregistry's write retry (`retry.Never(ctx)` shadowing)**: `google/go-containerregistry@0c8bedb78437:pkg/v1/remote/write.go:386` (uploadOne) and `:624` (index upload) are the only two sites in the corpus implementing this pattern; no other exemplar's registry client (oras-go, regclient) shadows a retry-suppression context the same way, so this gap is specific to go-containerregistry, which GO-NET-17 already names as the CLI's chosen library.
- **`WithRetryStatusCodes` inertness**: not previously measured by any prior GO-NET dive or the consolidation; `go-network.md`'s existing table cites `options.go:95-104,142,179` only to explain that `remote.makeOptions` installs `defaultRetryStatusCodes` on every call (conflict-resolution item 6), without distinguishing the read-path wiring (live) from the write-path shadowing (dead) — this dive is the first to separate the two.
- **GO-NET-18 dist CDN**: the only prior evidence was the fleet's own Python SDK docstring (`ocx-sdk-python@9713f0a9ff02:src/ocx_sdk/_dist.py:23-24`), never independently measured against a live request; this dive's live measurement contradicts it as of 2026-09-26 for both the manifest host and the GitHub release asset host.

## AI-agent angle

1. **Wrapping `resp.Body` with a `context.WithCancelCause`-based watchdog but building the request with a *different*, unwrappable `context.Background()`.** The cancel call has nothing to cancel; the read never stops. Check: grep for `context.WithCancelCause(` and confirm the same variable name flows into both `http.NewRequestWithContext` and the watchdog's `cancel` argument (a reading heuristic — no analyzer distinguishes "this cancel func belongs to that request's context").
2. **Reaching for `context.WithTimeout` "because it's simpler" and calling it an idle timeout.** `context.WithTimeout` bounds total elapsed time from when it's created, not time-since-last-progress; it kills a large, healthy, still-progressing download at exactly the scenario GO-NET-06 exists to protect (see the consolidation's own [fx] `stream_test.go` finding at 5,120/10,240 bytes). Check: read every `context.With(Timeout|Deadline)` site paired with a body read loop and confirm it isn't standing in for an idle bound.
3. **Checking `ctx.Err() == context.Canceled` instead of `errors.As(context.Cause(ctx), &typed)`.** This is functionally correct for "did something cancel" but throws away exactly the information (which cause) the typed error exists to carry, so the caller can't decide "retry this" vs. "give up," which is the entire point of GO-NET-06 producing a typed cause. Check: grep for `context.Canceled` comparisons near a watchdog-wrapped read; a hit without an adjacent `context.Cause` read is the smell.
4. **Assuming `google/go-containerregistry`'s `remote.WithRetryStatusCodes` configures retry for pushes** (a very plausible hallucination: the option's name and doc comment give no hint it's write-inert, and most agents trained on the read/pull-heavy tutorials for this library never see a push path). Check: `go list -deps` or a grep for `WithRetryStatusCodes` near a `WriteLayer`/`Write`/`WriteIndex` call — flag for a human read, since no static check can see through to the runtime `retry.Never` shadowing.
5. **Assuming a retried `PATCH` on a blob upload replays a partially-consumed `io.Reader`,** and therefore "fixing" a supposed body-exhaustion bug by manually buffering the whole layer into memory first. The measured behavior shows the retry already starts a fresh upload session with a fresh `layer.Compressed()` call — no such bug exists in this library, and the buffering "fix" only adds memory pressure for large layers. Check: read `pkg/v1/remote/write.go`'s `uploadOne` before touching it; the retry boundary is the whole closure, not the individual HTTP request.
6. **Citing the fleet's own `_dist.py` docstring as a currently-enforced fact** ("the CDN rejects Python-urllib") when writing the Go SDK's bootstrap client, and skipping a live check because "the Python code already proved it." Measured 2026-09-26: it does not reproduce. Check: any `User-Agent`-setting rationale that cites another SDK's comment, rather than its own measurement, gets re-verified before being copied into a new artifact — the standing instruction this dive follows (`AI-agent failure modes`, item in `go-network.md`) already flags "trusting" claims without re-checking; this is the same failure applied to cross-language borrowing.
7. **Using `time.After(idle)` in the watchdog's `Read` instead of `time.AfterFunc` + `Reset`.** `time.After` allocates a new, unstoppable timer on every call and leaks one per `Read` until it fires — exactly the `time.After`-in-a-loop leak GO-CONC's era material already tracks for other contexts (H3 in the frame), reappearing here because a watchdog reader's `Read` method *is* a loop caller.

## Contested / evolving

- **Whether `remote.WithRetryStatusCodes`'s write-path inertness is a bug or intended scoping** is not settled by reading the source alone — the doc comment doesn't scope it, but the design (retry the whole upload, not a single request) is arguably correct given `streamBlob`'s own comment "We can't retry streaming layers" (`write.go:319`, guarding `req.GetBody`). As of 2026-09-26 this dive treats it as an underdocumented gap (worth a one-line mitigation in GO-NET-17), not a defect to report upstream, since fixing it would mean either documenting the scoping or unifying two retry loops that currently serve different purposes (per-request transient errors vs. whole-upload-session retries).
- **Whether a per-`Read` idle watchdog belongs in every streaming client, or only in ones the fleet controls end-to-end.** For the SDK's own bootstrap downloader (GO-NET-06's stated consumer), the shape here is a clean fit. For a CLI wrapping `google/go-containerregistry`'s `remote.Get`/`Layer().Compressed()` pull path, the library's own `io.ReadCloser` is already several decode layers deep by the time the fleet's code sees it, and the library offers no hook to inject a watchdog at the raw-body layer — only at the outermost reader the caller receives, which this dive's shape already targets, so no gap exists there in practice, but it hasn't been fixtured against `go-containerregistry`'s actual pull path (only against a bare `net/http` client) — flagged as residue.
- **GO-NET-18's true state is genuinely unresolved, not merely unmeasured.** A single-request, single-IP measurement cannot rule out volume- or reputation-based bot detection that a sustained CI fleet or a popular CDN blocklist might still trigger. Trend: treat the rule as permanently a cheap SHOULD rather than chase a MUST that would need continuous re-measurement to stay true.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [pkg.go.dev/net/http](https://pkg.go.dev/net/http) | Package docs: `Transport.Clone`, `Client.Timeout`, `ResponseHeaderTimeout`, `IdleConnTimeout` | fetched 2026-09-26, go1.27.1-current | Primary; confirms the built-in timeout knobs' exact scope and that no per-Read body idle deadline exists |
| `go1.27.1:src/net/http/transport.go` (local GOROOT, read via `run.sh go env GOROOT`) | stdlib source | go1.27.1 (installed 2026-09-26) | Primary; line-cited for `IdleConnTimeout`/`ResponseHeaderTimeout`/`ExpectContinueTimeout` scope and `Transport.Clone`'s field list |
| [pkg.go.dev/context#WithCancelCause](https://pkg.go.dev/context#WithCancelCause) | Package docs: `WithCancelCause`, `CancelCauseFunc`, `Cause` | fetched 2026-09-26; API since go1.20 | Primary; the exact contract the watchdog relies on ("Calling Cause on the canceled context … retrieves the cause") |
| [github.com/google/go-containerregistry `pkg/v1/remote/transport/retry.go`](https://github.com/google/go-containerregistry/blob/main/pkg/v1/remote/transport/retry.go) | source, also read locally at `exemplars/go/google__go-containerregistry@0c8bedb78437` and module `v0.22.1` | read 2026-09-26 | Primary; the low-level retry transport this dive shows is bypassed for writes |
| `google/go-containerregistry@0c8bedb78437:pkg/v1/remote/write.go` | source (exemplar clone, local) | fetched at frame time (2026-09-26), read this dive | Primary; `uploadOne`/`streamBlob`/`commitBlob`/`retry.Never` — the actual write retry mechanism |
| `google/go-containerregistry@0c8bedb78437:pkg/v1/remote/options.go` | source (exemplar clone, local) | read this dive | Primary; `defaultRetryPredicate`, `defaultRetryBackoff`, `defaultRetryStatusCodes`, and where each is (or isn't) wired |
| `google/go-containerregistry@0c8bedb78437:pkg/v1/remote/transport/error.go` | source (exemplar clone, local) | read this dive | Primary; `temporaryStatusCodes`, `(*Error).Temporary()` — the set that actually governs write retries |
| `github.com/google/go-containerregistry/pkg/registry` (module `v0.22.1`, `pkg/registry/registry.go`) | source, fetched via `go get`/module cache | fetched 2026-09-26 | Primary; the in-memory OCI registry this dive's fixture wraps to plant the 503 |
| `ocx-sdk-python@9713f0a9ff02:src/ocx_sdk/_dist.py` | fleet source (local repo) | read 2026-09-26 | Primary; `DEFAULT_DIST_URL`, the UA rationale this dive re-measured, and the C-005 retry/redirect contract the Go SDK's network surface must mirror |
| [go.dev blog: "Contexts and structs"](https://go.dev/blog/context-and-structs) | Go team blog | 2023, still current guidance | Secondary; background on why `context.Cause`/`WithCancelCause` exist as a pattern, complementing the pkg.go.dev reference |
| [go.dev/ref/spec](https://go.dev/ref/spec) | Language spec | current for go1.27 | Secondary background; not cited for a specific claim in this dive but kept as the spec-of-record cross-reference other GO- families use |
| [RFC 9110 §15.6.4 (503 Service Unavailable)](https://www.rfc-editor.org/rfc/rfc9110#section-15.6.4) | IETF HTTP semantics RFC | 2022, current | Primary; the 503 semantics the planted fixture exercises and that `temporaryStatusCodes` encodes |
| [opencontainers/distribution-spec spec.md](https://github.com/opencontainers/distribution-spec/blob/main/spec.md) | OCI distribution spec | current | Primary; the POST-then-PATCH-then-PUT blob upload protocol the fixture's registry and client both implement |
| [go-network/registry-client.md](registry-client.md) | this program's own prior dive | 2026-09-26 | Sibling dive; library-choice and verify-at-EOF context this revision builds on without repeating |
| [go-network.md](../go-network.md) | this program's own consolidation | 2026-09-26 | The document this dive revises; cites the exact open-question rows answered here |

