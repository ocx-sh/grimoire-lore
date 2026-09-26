---
title: HTTP and Registry Clients
summary: The GO-NET family owns HTTP clients, transports and servers, stall bounds for API and blob-streaming clients, redirect credentials, body bounds, response closing, retry and Retry-After, and OCI registry content (digest parsing, verify-at-EOF, blob staging, store format versions, credential helpers)
---

# HTTP and Registry Clients

Binds to Go 1.27.1, golangci-lint v2.14.0 and go-containerregistry v0.22.1, measured 2026-09-26.

Owns every outbound HTTP request and every `http.Server`: client and transport
construction, stall bounds, redirect credentials, body bounds, closing and
retrying. It also owns registry content: digest parsing, verify-at-EOF, staging
into a content-addressed store, the store's format version, and credential
helpers. Neighbours, cited by ID: context plumbing, `noctx` and the typed cause
are GO-CONC (GO-CONC-03, GO-CONC-17). The atomic-write shape, locks and
decompression are GO-IO (GO-IO-11, GO-IO-12, GO-IO-19, GO-IO-03). Decoder and
multipart bounds are GO-SEC-05, retry tests GO-TEST-11, gosec settings GO-GATE,
and the SDK import graph GO-MOD-10. GO-IO-18 is retired, superseded by GO-NET-14, and not reused.

Code kinds: a **CLI** ships a `main` binary. The **SDK** (pinned default, the adopter renames it) is a stdlib-only library that wraps a CLI and whose only network code downloads it. A **library** is any other package. A **service** is a long-running server, which the pinned defaults do not expect.

Contents: [Dates and Floors](#dates-and-floors) · [Servers: gosec](#servers-gosec) · [Client Plumbing: Greps Where Empty Output Passes](#client-plumbing-greps-where-empty-output-passes) ·
[Stall Bounds and Body Bounds: Locate, Then Read](#stall-bounds-and-body-bounds-locate-then-read) · [Closing, Draining and Retrying](#closing-draining-and-retrying) ·
[Registry Content and Local Stores](#registry-content-and-local-stores) · [Library Choice, Identification and Shutdown](#library-choice-identification-and-shutdown) · [What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Floors

Every row was measured or read 2026-09-26 on Go 1.27.1 (linux/amd64), golangci-lint v2.14.0 and go-containerregistry v0.22.1 unless it says otherwise.

- **`context.WithCancelCause` and `context.Cause`** (go 1.20, go-line gated) carry GO-NET-06's typed stall cause. **`testing/synctest`** (go 1.25, go-line gated) backs GO-NET-11's test. vet `hostport` (go 1.25, toolchain gated) is not GO-NET-04's check.
- **Stdlib facts** (read from the go1.27.1 source): `DefaultMaxIdleConnsPerHost = 2`, `Close` lets a connection be reused when at most 256 KiB is unread, `defaultCheckRedirect` stops at 10 hops, and no per-`Read` body deadline exists (`IdleConnTimeout` covers idle pooled connections, `ResponseHeaderTimeout` only the headers).
- The pinned `go` lines (SDK and libraries `go 1.26.0`, CLIs `go 1.27.0`) clear every floor above.

## Servers: gosec

```bash
golangci-lint run --enable-only=gosec ./...   # with the project gosec settings (GO-GATE-14). Exit 0 is the pass.
```

`noctx` already bans `http.Get`, `http.Post`, `http.Head`, `http.NewRequest` and `http.DefaultClient.Get` under GO-CONC-03, so no row here restates it.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-NET-01 | Construct every `http.Server` as a value with `ReadHeaderTimeout > 0`. Never call `http.ListenAndServe`, `http.ListenAndServeTLS` or `http.Serve`. | A server with no header timeout holds a slowloris connection open indefinitely: without it the connection was still open at 1.2 s, with a 300 ms timeout it closed at 300.6 ms. 41 of 56 server literals in a 35-repo corpus lack one. | The gate command. G112 (`ReadHeaderTimeout is not configured`) and G114 (the package-level serve helpers, which take no timeouts) are in gosec's default set. Exit 0 is the pass, and each finding blocks. Watched red on a planted server, green on the twin (golangci-lint v2.14.0, 2026-09-26). | MUST |

## Client Plumbing: Greps Where Empty Output Passes

```bash
grep -rn --include='*.go' -e 'http\.DefaultClient' .                  # GO-NET-02
grep -rn --include='*.go' -e '&http\.Transport{' .                    # GO-NET-03
grep -rn --include='*.go' -E 'Sprintf\("[^"]*%[sv]:%[dsv]"' .         # GO-NET-04
grep -rl --include='*.go' -e 'CheckRedirect' . | xargs -r grep -L -E 'len\(via\) *>= *[1-9]'   # GO-NET-05 hop cap
grep -rn --include='*.go' -e 'via\[[^]]*\]\.Header' .                 # GO-NET-05 credential copy
```

Empty output from every line is the pass. Tests are included.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-NET-02 | Never reference `http.DefaultClient`, including `http.DefaultClient.Do(req)`, which `noctx` accepts. | `DefaultClient` has `Timeout: 0` and a shared, mutable, process-global `CheckRedirect`. The corpus holds 128 package-level client calls. | The GO-NET-02 grep. Empty output is the pass, any line is the finding. | MUST |
| GO-NET-03 | Derive every `*http.Transport` from `http.DefaultTransport.(*http.Transport).Clone()` and then set fields. Never write a `&http.Transport{...}` literal. A registry client also raises `MaxIdleConnsPerHost` above the zero-value default of 2 (go-containerregistry uses 50). | A bare literal has `Proxy == nil`, so it ignores `HTTPS_PROXY` (a proxy saw 0 requests from the literal and 1 from the clone), has no dial, TLS-handshake or idle timeout, and stops attempting HTTP/2 once `TLSClientConfig` is set. The corpus holds 73 bare literals against 10 clones. | The GO-NET-03 grep. Empty output is the pass. A remaining hit needs a `//` comment on the literal saying why the defaults must not apply. | MUST |
| GO-NET-04 | Build every `host:port` with `net.JoinHostPort`, never with `fmt.Sprintf("%s:%d", ...)` or string concatenation. | The `Sprintf` form breaks on an IPv6 literal. vet's `hostport` (go 1.25) inspects only `net.Dial`, `net.DialTimeout` and `(*net.Dialer).Dial` inside one function, so it is silent on `DialContext`, the form GO-CONC-03 mandates, and on `Listen`. | The GO-NET-04 grep. Empty output is the pass. `go vet` is a bonus, not the check: on go1.27.1 it flagged the `net.Dial` line of a planted file and stayed silent on the `DialContext` line the grep caught. | MUST |
| GO-NET-05 | Any client that sends `Authorization`, `Cookie` or `Proxy-Authorization` sets a `CheckRedirect` that (a) returns an error at `len(via) >= 10`, (b) refuses an `https` to `http` hop, and (c) never copies a credential out of `via`. It re-adds credentials only by looking up the destination origin (scheme, host and port). Any other custom `CheckRedirect` still keeps (a). **pinned**: the SDK's bootstrap client caps at 5 hops and is https-only, and an adopter overrides the number once. | A custom `CheckRedirect` replaces the default and its 10-hop cap: an uncapped one followed 51 hops. The default strips credentials by `Hostname()` alone, ignoring scheme and port, and was watched forwarding `Authorization: Bearer secret` over an https to http redirect (go1.27.1, 2026-09-26). go-containerregistry's `checkRedirectSSRF` has no hop cap. | The two GO-NET-05 greps. Empty output from both is the pass. The first lists files that set `CheckRedirect` with no cap, the second lists credential copies out of `via`. Then read (b) and (c) in every function that sets `CheckRedirect`. | MUST |

## Stall Bounds and Body Bounds: Locate, Then Read

```bash
grep -rn --include='*.go' --exclude='*_test.go' -e 'http\.Client{' .                           # GO-NET-06
grep -rn --include='*.go' -e 'io\.ReadAll(' . | grep -v -e 'LimitReader' -e 'MaxBytesReader'   # GO-NET-07
grep -rl --include='*.go' -e 'Retry-After' . | xargs -r grep -L -e 'http\.ParseTime'          # GO-NET-08
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-NET-06 | Build every `*http.Client` in one package-internal constructor that sets the transport (GO-NET-03), `CheckRedirect` (GO-NET-05) and the stall bound for its kind. An **API client** (bounded responses: manifests, tokens, JSON) sets `Timeout > 0`. A **blob-streaming client** sets `Timeout: 0`, sets `ResponseHeaderTimeout` on its cloned transport, **and** wraps `resp.Body` in an idle-read watchdog: a `time.AfterFunc(idle, ...)` that is `Reset` on every `Read` with `n > 0`, `Stop`ped in `Close`, and on expiry calls the `CancelCauseFunc` of the same `context.WithCancelCause` context the request was built with, passing a typed stall error that callers recover with `errors.As(context.Cause(ctx), &stall)` (GO-CONC-17). A whole-transfer deadline may sit outside as a backstop, never in place of the watchdog. On go-containerregistry's pull path, create the `WithCancelCause` context **before** `remote.Layer` (one per layer) or `remote.Image` and pass it with `remote.WithContext`, then wrap the `Compressed()` reader. That pull-path wiring is by source read, not fixture-watched. | `Client.Timeout` includes reading the body: it killed a live, progressing stream at 5,120 of 10,240 bytes, while `ResponseHeaderTimeout` alone let it finish. With no watchdog a read was still blocked 900 ms after the last byte, the watchdog failed it at 300.5 ms with the typed cause, and a 1 byte per 100 ms trickle still completed (go1.27.1, 2026-09-26). go-containerregistry v0.22.1 fixes a layer's context when the layer object is built (`pkg/v1/remote/image.go:154`, `layer.go:38-39`, `fetcher.go:323`, read 2026-09-26), so a cancel created later never reaches the request. A `SetReadDeadline` conn wrapper installed through `DialContext` also bounds the stall and satisfies this rule, but it takes over the dialer, cuts idle pooled connections short and fails with an untyped `*net.OpError`. The timer also runs while the consumer processes a chunk, so `idle` must exceed the slowest per-chunk work. 87 of 143 corpus client literals set no `Timeout`. | The GO-NET-06 grep prints at most one line per package, the constructor, and more is the finding. Then read the constructor for the bound that matches its kind. For a `Timeout: 0` client, also confirm `ResponseHeaderTimeout` is set, the body is wrapped before the read loop, and the watchdog's cancel comes from the context passed to `http.NewRequestWithContext` (or to `remote.WithContext`). | MUST |
| GO-NET-07 | Bound every network body before reading it whole. On a client, `io.ReadAll(io.LimitReader(resp.Body, max+1))` and reject when `len > max`, never truncate silently. In a handler, `r.Body = http.MaxBytesReader(w, r.Body, max)` before decoding. Decoder and multipart bounds are GO-SEC-05. **pinned**: the SDK caps a manifest at 1 MiB and an artifact at 256 MiB, and an adopter overrides the numbers once. | An unbounded `io.ReadAll` pulled a 1 GiB body into memory in 1.24 s. The corpus holds 215 `ReadAll` calls on a body against 105 limit sites. | The GO-NET-07 grep. Read each line whose argument is a body already bounded further up, and drop it. Empty output is the pass. | MUST |
| GO-NET-08 | Parse `Retry-After` in both RFC 9110 §10.2.3 forms: `strconv.ParseInt` for delay-seconds, then `http.ParseTime` for the HTTP-date. Cap the honoured delay at the policy's maximum backoff, and when the server asks for longer, fail with a temporary error rather than sleep. | `time.ParseDuration(v + "s")` returns 0 on the date form, so the client retries at once (regclient does this). oras-go reads only the integer form, and go-containerregistry ignores the header (read 2026-09-26). | The GO-NET-08 grep lists files that read the header without the date parser. Empty output is the pass. A server that only sets the header is a false positive the reading step drops. | MUST |

```go
type StallError struct{ Idle time.Duration } // the typed cause, read back with context.Cause

func (e *StallError) Error() string { return fmt.Sprintf("body stalled: no progress for %s", e.Idle) }

type idleReader struct {
	rc    io.ReadCloser
	idle  time.Duration
	timer *time.Timer
}

// watch wraps body. cancel must belong to the context the request was built with.
func watch(body io.ReadCloser, idle time.Duration, cancel context.CancelCauseFunc) io.ReadCloser {
	r := &idleReader{rc: body, idle: idle}
	r.timer = time.AfterFunc(idle, func() { cancel(&StallError{Idle: idle}) })
	return r
}

func (r *idleReader) Read(p []byte) (int, error) {
	n, err := r.rc.Read(p)
	if n > 0 {
		r.timer.Reset(r.idle)
	}
	return n, err
}

func (r *idleReader) Close() error {
	r.timer.Stop()
	return r.rc.Close()
}

// wrong: &http.Client{Timeout: 30 * time.Second} for this, which kills a healthy large pull.
// right: Timeout 0, ResponseHeaderTimeout on the cloned transport, and the watchdog.
func fetch(parent context.Context, c *http.Client, url string, dst io.Writer) error {
	ctx, cancel := context.WithCancelCause(parent)
	defer cancel(nil)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	resp, err := c.Do(req)
	if err != nil {
		return err
	}
	body := watch(resp.Body, time.Minute, cancel)
	defer body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("GET %s: %s", url, resp.Status)
	}
	if _, err := io.Copy(dst, body); err != nil {
		var stall *StallError
		if errors.As(context.Cause(ctx), &stall) {
			return stall
		}
		return err
	}
	return nil
}
```

## Closing, Draining and Retrying

```bash
golangci-lint run --enable-only=bodyclose ./...        # only in a package with no response wrapper type (GO-GATE-19)
grep -rn --include='*.go' -e 'io\.Copy(io\.Discard, ' .  # GO-NET-10
```

No analyzer decides these three rows, so each is a named reading heuristic.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-NET-09 | Every function that obtains a response, directly or through one wrapper type, closes it on **every** return path, error branches included, or returns it inside a value whose documented contract makes the caller close it. | regclient leaks the body on both branches of its blob delete and on the non-200 branch of its blob get. `bodyclose` on regclient produced 120 findings, about 92% false positives (the wrapper shape), with those 2 real leaks inside the noise, so the linter stays a SHOULD (GO-GATE-19) and the close is read. | Named reading heuristic: for each `Do`-shaped call, trace every `return` to a `Close()` or an ownership transfer. A return path with neither is the finding. Run the `bodyclose` line of the gate block only where no wrapper type holds `resp.Body`, and exit 0 is its pass. | MUST |
| GO-NET-10 | Do not write `io.Copy(io.Discard, resp.Body)` on an untrusted body. `Close` already lets the connection be reused when at most 256 KiB remains unread. To give back a connection after abandoning a larger body, drain with `io.CopyN(io.Discard, resp.Body, limit)`. | Connections were reused 4 of 4 times at 1 KiB and 64 KiB with no drain, 0 of 4 at 2 MiB, and 4 of 4 at 2 MiB drained (go1.27.1, 2026-09-26). An unbounded drain of an adversarial body is the GO-NET-07 exposure in a new place. | The GO-NET-10 grep. Empty output is the pass. Read each hit for whether its source is a network body, and a network body drained with no bound is the finding. Watched red on a planted `io.Copy` drain and silent on the `io.CopyN` twin (2026-09-26). | SHOULD |
| GO-NET-11 | Retry only transport errors, 408, 429, and 5xx except 501. Retry only idempotent methods (GET, HEAD, PUT, DELETE, OPTIONS, RFC 9110 §9.2.2) or a request whose call site documents why a duplicate is harmless (an idempotency key, an OCI upload-session `POST`). Retry only a replayable body (`req.Body == nil` or `req.GetBody != nil`). Back off exponentially with jitter, bounded by a minimum, a maximum and an attempt count. Never retry 401, 403, 404, a cancelled context, a size-cap abort or a verification failure. Every attempt restarts its output from zero. **pinned**: this status set is the program's retry classes, and an adopter overrides the set once, in one predicate. | RFC 9110 §9.2.2 says a client should not automatically retry a non-idempotent method without knowing it is safe. go-retryablehttp, go-containerregistry and oras-go all retry without checking the method (read 2026-09-26), so the method check has to be added. 408 invites a repeat and 501 is permanent (RFC 9110 §15.5.9, §15.6.2). | Named reading heuristic on the retry predicate: it reads `req.Method` and `req.GetBody` before retrying, and a predicate that reads neither is the finding. The behavioural test is GO-TEST-11's `synctest` retry test (go 1.25). | MUST |

## Registry Content and Local Stores

```bash
grep -rn --include='*.go' -i -e 'HasPrefix(.*digest' -e 'Contains(.*digest' .   # GO-NET-13
grep -rn --include='*.go' -e 'os\.Create(' -e 'O_TRUNC' .                        # GO-NET-14 work list
golangci-lint run --enable-only=errcheck,gosec ./...                              # GO-NET-16 adjacent hint only
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-NET-12 | Drain a verifying reader (go-containerregistry `verify.ReadCloser`, go-digest `Verifier`) to `io.EOF` with `io.Copy` or `io.ReadAll`, and check its error before using a byte. Never use a fixed-size `Read` or an `io.CopyN` short of the declared size. Check size first, then digest. | Both libraries check only at EOF. A 100-byte prefix read of a verifying reader returned no error and verified nothing. The size-first order comes from the OCI image-spec descriptor definition. | Named reading heuristic: every loop over a verifying reader ends only on `io.EOF`, and a loop that stops earlier and uses the bytes is the finding. `go vet` is silent on both shapes. | MUST |
| GO-NET-13 | Parse every digest with a strict parser: go-containerregistry `v1.NewHash`, go-digest `Parse`, or an anchored per-algorithm regex requiring lower-case hex of the exact length (64 for sha256, 128 for sha512). Compare digests as whole strings and sizes as exact integers, never with `HasPrefix` or `Contains`. Register your own hasher before relying on go-digest for `blake3`, because go-digest implements only sha256, sha384 and sha512. **pinned**: the SDK accepts only `^[0-9a-f]{64}$` after `sha256:`. | A prefix check accepted 6 of 9 malformed digests, and an 8-hex prefix match accepted a 2,048-byte payload declared as 4,096 bytes. `v1.NewHash` enforces lower hex and exact length. | The GO-NET-13 grep. Empty output is the pass. Then read any hand-rolled digest parser for the anchors and the length. | MUST |
| GO-NET-14 | Stage every incoming content-addressed blob with `os.CreateTemp(storeDir, ".ingest-*.tmp")` in the GO-IO-11 write shape, verify it (GO-NET-12), then `os.Rename` it into `blobs/<alg>/<hex>`. Never call `os.Create` or `O_TRUNC` on a final blob path. Treat "the target already exists" as success, including a rename that fails on Windows because a same-digest target is open. Do not add a cross-process lock as the fix. On store open, sweep only this store's own `.ingest-*.tmp` pattern. | `os.Create` truncates the live inode: two concurrent naive writers left 2,048 bytes matching neither, and a SIGKILL left unverified content at the trusted path. Staged, one writer's bytes won and no temp file remained. Identical verified content renamed atomically needs no lock (mutable state still takes GO-IO-19's lock). Temp removal follows GO-IO-12, and other rename failures take GO-IO-17's bounded retry. | Reading heuristic: run the GO-NET-14 grep, then classify each hit that writes a blob path. A final blob path opened with `os.Create` or `O_TRUNC` is the finding. Empty output is the pass. | MUST |
| GO-NET-15 | Give every on-disk format the tool owns (store layout, index, lock metadata, cache metadata) a version marker from its first release. Check it on open, and refuse a **newer** version with an actionable error, not only an older one. | A naive opener reported "opened OK" on a store written by a newer layout. The OCI layout's `imageLayoutVersion` and containerd's schema and database versions with an ordered migration walk are the precedents. | Named reading heuristic: the opener has a `found > supported` branch that returns an error naming both versions, and an opener without one is the finding. | MUST |
| GO-NET-16 | Resolve registry credentials from `config.json` in this order: `credHelpers[host]`, then `credsStore`, then `auths`, speaking the `docker-credential-NAME get` stdin and stdout protocol. A **configured** helper that fails (missing binary, non-zero exit, unparseable JSON) is a hard error, never "proceed anonymously". | go-containerregistry, oras-go and regclient converge on this protocol. Swallowing the exec error makes a broken helper indistinguishable from an anonymous host. | The `errcheck,gosec` line catches only an adjacent ignored `json.Unmarshal`, and exit 0 there proves nothing about the exec error. The check is a named reading heuristic: each `err != nil` from the helper's `cmd.Output` or `Run` that returns a zero credential with a `nil` error is the finding. | MUST |

## Library Choice, Identification and Shutdown

```bash
go list -deps ./...   # GO-NET-17: read for oras.land or github.com/regclient in a CLI
grep -rl --include='*.go' -e 'WithRetryStatusCodes(' . | xargs -r grep -l -e 'remote\.Write(' -e 'remote\.WriteLayer(' -e 'remote\.WriteIndex('   # GO-NET-17 gap 4
grep -rn --include='*.go' -e 'User-Agent' .   # GO-NET-18: empty output is the FINDING
```

These are review-time SHOULDs. The gap-4 locator's empty output is the pass. The `User-Agent` grep is a presence check: empty output in a module that makes HTTP calls is the finding.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-NET-17 | **pinned**: CLIs build registry access on `google/go-containerregistry` `pkg/v1/remote` and `pkg/authn`, and the SDK imports no OCI library (GO-MOD-10). An adopter may override the library choice once. On every call pass `remote.WithContext(ctx)` with a bound (GO-NET-06) and `remote.WithTransport(t)` with a GO-NET-03 clone. Four gaps are the caller's: (1) it sets no `Client.Timeout` and defaults to `context.Background()`, (2) its redirect check has no hop cap (GO-NET-05), (3) its retry ignores the method and `Retry-After` (GO-NET-08, GO-NET-11), (4) on `remote.Write`, `WriteLayer` and `WriteIndex`, `remote.WithRetryStatusCodes` does nothing. A push that must retry another status sets `remote.WithRetryPredicate` and matches `*transport.Error` itself, and a push that must not spend the default of at least 1 s per retry sets `remote.WithRetryBackoff`. | go-containerregistry is a direct dependency in 6 of 35 exemplars, against 0 for oras-go or regclient, and oras-go's credential API is mid-migration to `/v3`. Gap 4 (go-containerregistry v0.22.1, measured 2026-09-26): every write runs under `retry.Never`, so the status-code transport is off and the whole upload session retries through the writer's predicate over a fixed {408, 429, 500, 502, 503, 504}. `WriteLayer` succeeded with an empty `WithRetryStatusCodes()`, failed as expected with a never-retry predicate, and took 1.07 s to retry at the default backoff. A `*stream.Layer` cannot be retried and fails loudly with `ErrConsumed` (read from source, not fixtured). | Reading: `go list -deps ./...` shows no `oras.land` or `github.com/regclient` module in a CLI and no non-stdlib module in the SDK. Gap 4: the locator lists files pairing the option with a write, and empty output is the pass. Read each listed call site, where a push makes the option dead and a pull makes it live. | SHOULD |
| GO-NET-18 | Set `User-Agent` to the tool's name and version (for example `mytool/1.4.2`) on every outbound request, in the client constructor's transport wrapper. | Go's default is `Go-http-client/1.1`. A named client costs nothing and lets registry and CDN operators triage support and abuse by client. | The `User-Agent` grep must print at least one line in any module that makes HTTP calls. Empty output is the finding. | SHOULD |
| GO-NET-19 | A long-running server stops through `signal.NotifyContext`, then `srv.Shutdown(ctx)` where `ctx` carries a bounded grace period, and forces the exit after it. | `Shutdown` waits indefinitely on a context with no deadline. The pinned defaults expect no services, so this is hygiene, not a gate. | Named reading heuristic on `main` or `run`: a `Shutdown` call whose context has no deadline is the finding. | SHOULD |

## What Agents Get Wrong Here

1. **A bare `io.ReadAll(resp.Body)`.** The corpus holds 215 body `ReadAll` calls against 105 limit sites, so it is the idiom an agent reproduces. GO-NET-07.
2. **`&http.Client{}` with no `Timeout`, or with `Timeout` on a blob stream.** 61% of corpus literals set none, and the "fix" of adding one kills large pulls mid-transfer. GO-NET-06.
3. **`&http.Transport{TLSClientConfig: cfg}` to "just add TLS".** It silently drops proxy support and every timeout. GO-NET-03.
4. **Trusting stdlib redirect stripping.** Agents know it exists, not that it is blind to scheme and port, and the custom `CheckRedirect` they then write drops the 10-hop cap. GO-NET-05.
5. **A retry that ignores the method and replays a consumed body,** copied from go-retryablehttp or oras-go defaults. GO-NET-11.
6. **`Retry-After` parsed as an integer only,** so the date form retries at once. GO-NET-08.
7. **`fmt.Sprintf("%s:%d", host, port)` with false comfort from `go vet`,** which never looks at `DialContext`. GO-NET-04.
8. **`defer resp.Body.Close()` on the success path only,** or a wrapper whose `Close` nobody traced through the error branches. GO-NET-09.
9. **Treating "no error from `Read`" as "verified", or comparing digests by prefix.** GO-NET-12, GO-NET-13.
10. **Writing a blob straight to its final path, then adding a `flock` to "fix" concurrency.** Staging is the fix. GO-NET-14.
11. **A credential helper whose exec error collapses into an anonymous request.** errcheck and gosec only hint at it. GO-NET-16.
12. **`http.ListenAndServe(addr, h)` as the whole server.** GO-NET-01.
13. **`context.WithTimeout` presented as an idle timeout on a stream.** It bounds total time, so it kills a healthy large pull. GO-NET-06.
14. **A watchdog whose cancel belongs to a different context than the request,** including one created after go-containerregistry built the layer. It cancels nothing and the read never stops. GO-NET-06.
15. **`remote.WithRetryStatusCodes` on a push,** assumed to tune write retries. It is inert there. GO-NET-17.
