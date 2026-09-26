---
title: "SDK contract probes: version handshake, signal exit path, timeout cause"
topic: go-api
agent: sdk-contract-dive
model: sonnet
date_researched: 2026-09-26
sources_count: 14
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/sdk-contract/
scope: >
  Revision dive for go-api.md (GO-API). Plants and watches the three SDK
  contract rows the map left unwatched: GO-API-18's version handshake, a new
  signal-exit-path row, and a new timeout-cause row that closes wave-2
  contradiction 12 / wave-3 contradiction 19. Does not touch GO-CLI, GO-ERR
  or GO-CONC text directly (cross-family notes only), and does not re-open
  gates/config-assembly (not landed as of this dive — checked, absent from
  the go-gates research tree).
---

# SDK contract probes: version handshake, signal exit path, timeout cause

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Version handshake (GO-API-18, revised)](#1-version-handshake-go-api-18-revised)
   2. [Signal exit path at the SDK's spawn point (new: GO-API-19)](#2-signal-exit-path-at-the-sdks-spawn-point-new-go-api-19)
   3. [Timeout cause (new: GO-API-20, closes contradiction 19)](#3-timeout-cause-new-go-api-20-closes-contradiction-19)
   4. [Overlay-noise check](#4-overlay-noise-check)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- GO-API-18's version clause promotes **SHOULD → MUST (SDK)**: it is now watched red (never gates) and green (gates once, cached) on a planted `TestMain` helper-process fixture — the map's stated precondition for planting is met.
- The Go SDK's version check is **lazy, not eager**: it runs on first typed call through a `gate()` method, not in `NewClient`, exactly mirroring `ocx-sdk-python`'s `Compat.checked`/`accept()` (`ocx-sdk-python@9713f0a9ff02:_client.py:826-857`).
- The check runs **at most once per `*Client`** and is cached; a version reported after the first call, even a failing one, is never re-probed (`_client.go:838-857`'s `if self.compat.checked: return` pattern, ported).
- `*VersionCompatError` carries `Found string` and `Minimum string`, and its message is `"ocx %s is older than the minimum supported %s"`, byte-for-byte the Python wording (`_errors.py:354-368`).
- The probe reads **plain-text** `ocx version` (bare semver token on stdout), not `--format json version`: this is what the Python SDK does today (`_client.py:679,841`), and it is one process spawn cheaper than parsing JSON for a single string.
- A version **newer** than `TestedOcxVersion` is accepted silently (permissive direction); only a version **older** than `MinSupportedOcx` raises. Comparison ignores any pre-release tail (`0.5.8-rc1` reads as `0.5.8`).
- **New row GO-API-19 (MUST, SDK): the SDK's own spawn point (`internal/process`) must classify a signal-killed `ocx` child the same way GO-CLI-12 already requires of a CLI's own exit forwarding** — `128+signal`, never a raw, unchecked `ExitCode()`. This was previously unexercised at the SDK layer (map's "unexercised" note); it is now watched.
- The unchecked mistake is worse than "wrong in memory": `(*exec.ExitError).ExitCode()` on a signal-killed child returns **-1**, which is outside `os.Exit`'s documented portable range `[0,125]` (`pkg.go.dev/os#Exit`) and which the OS truncates to **255** once anything (a CLI's `main`) forwards it — measured end-to-end on this dive's fixture, not just asserted.
- The signal-exit-path fixture compiles and `go vet`s clean under `GOOS=windows`, `GOOS=darwin` and `GOOS=linux`; Windows *runtime* behaviour (no POSIX signal delivery) stays out of scope, per the map.
- **New row GO-API-20 (MUST, SDK): the timeout cause is a `*TimeoutError` value (not the bare `ErrOcxTimeout` sentinel) passed to `context.WithTimeoutCause`, with `(*TimeoutError).Is` targeting the sentinel.** This is the shape `go-api/sdk-surface.md` already argued for and pins here with a watched contract test, closing wave-2 contradiction 12 / wave-3 contradiction 19 (**no longer provisional**).
- **Cross-family correction (not an edit to `go-concurrency.md`): GO-CONC-17's own rule text writes `WithTimeoutCause(ctx, d, ErrOcxTimeout)` — passing the bare sentinel as the cause.** The settled, watched shape passes the typed `*TimeoutError` instead; GO-CONC-17's *mechanism* (attach a cause) is correct, only its example value is superseded by GO-ERR-20/GO-API-20's typed cause.
- `errors.Is(err, ErrOcxTimeout)` is true whether the caller unwraps to the concrete type or not; `errors.AsType[*TimeoutError]` is true; `errors.AsType[*ExitError]` is false — the two failure kinds never conflate (go1.26 floor for `AsType`).
- **A caller's own, shorter `context.WithTimeout` deadline firing first must never surface as `ErrOcxTimeout`.** `context.WithTimeoutCause`'s own doc guarantees this: the *first* context to expire sets the cause every descendant observes, so a parent's plain `DeadlineExceeded` wins over a child's un-fired cause. Watched on this dive's fixture.
- `gates/config-assembly.md` has **not landed** (absent from the `go-gates` research tree as of this dive), so GO-API-06/07's severities are unchanged by this dive, per the brief's conditional instruction.
- **Zero exemplar hits** for either contract: no exemplar in the 35-repo corpus gates a wrapped subprocess's version, and no exemplar's own code (only vendored `x/sys/unix`) calls `syscall.WaitStatus.Signaled()`. The closest live analogue of the unchecked-forward defect is `cli/cli`'s already-documented `ExternalCommandExitError` bug (GO-CLI-12's exemplar evidence).
- All three contracts are new ground for the fleet — there is no legacy code to grandfather, so every row above lands at MUST with no SHOULD fallback.

## Findings

### 1. Version handshake (GO-API-18, revised)

**What ocx-sdk-python actually does.** Two module-level constants set the
window: `TESTED_OCX_VERSION = "0.6.2"` and `MIN_SUPPORTED = "0.6.2"`
([`_types.py:30-34`](../../../../../../ocx-sdk-python/src/ocx_sdk/_types.py)).
`Client.gate()` is called from `typed()`, the entry point every typed SDK
call goes through, and does nothing if `self.compat.checked` is already
true:

```python
# ocx-sdk-python@9713f0a9ff02:_client.py:826-830
def gate(self) -> None:
    """Probe the binary's version once per handle family."""
    if self.compat.checked:
        return
    self.accept(self.probe(timeout=UNSET, retry=UNSET))
```

`accept()` does the comparison and raises, or marks the handle checked:

```python
# _client.py:846-857
def accept(self, found: str) -> None:
    core = _core(found)
    if not core or core < _core(MIN_SUPPORTED):
        raise VersionCompatError(found, MIN_SUPPORTED)
    if core > _core(TESTED_OCX_VERSION):
        _LOG.debug("ocx %s is newer than the tested %s; that is expected.", found, TESTED_OCX_VERSION)
    self.compat.checked = True
```

The probe itself runs `ocx version` in plain-text presentation
(`_client.py:679`: `argv = self.compose(("version",), presentation=_PLAIN)`),
not `--format json`. `ocx version`'s plain output is a single bare version
token by contract
(`ocx@2691d3c1638e:crates/ocx_cli/src/api/data/version.rs:12-15`: "Bare
version string ..., preserving the pre-enrichment contract that scripts can
`ocx version` and parse stdout as a single semver token"), so the SDK never
pays for a JSON round-trip to learn one string.

**Decision: the Go SDK ports this shape unchanged.** `NewClient` does not
probe; a `gate()` method runs once per `*Client`, guarded by a boolean under
a mutex, and every typed method calls it first. This settles the map's open
question ("at `NewClient` or lazily on the first call?") in favour of
**lazily, on first call, cached** — matching the Python SDK exactly, and
cheaper for a caller who never calls a method that needs the SDK's own
version window enforced.

```go
// fixtures/sdk-contract/version/fixed/client.go — correct
func (c *Client) gate() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.checked {
		return nil
	}
	out, err := exec.Command(c.exe, "version").Output()
	if err != nil {
		return err
	}
	found := strings.TrimSpace(string(out))
	if versionLess(found, MinSupportedOcx) {
		return &VersionCompatError{Found: found, Minimum: MinSupportedOcx}
	}
	c.checked = true
	return nil
}

func (c *Client) Do() error {
	if err := c.gate(); err != nil {
		return err
	}
	return nil // the real call runs here
}
```

```go
// the planted defect — nothing calls gate()
func (c *Client) Do() error {
	return nil
}
```

**`*VersionCompatError`'s shape mirrors `_errors.py:354-368` field-for-field**
(`found`/`minimum` → `Found string`/`Minimum string`) and its message
(`"ocx %s is older than the minimum supported %s"` → `fmt.Sprintf("ocx %s
is older than the minimum supported %s", e.Found, e.Minimum)`) is the same
string, not a paraphrase — an agent porting the Python SDK's error text by
hand is the likeliest place a rewrite drifts.

**Watched** (see [Verification runs](#verification-runs)): a `TestMain`
helper process (GO-TEST-12) re-execs the test binary itself as a fake `ocx`
that prints whatever `GO_WANT_HELPER_PROCESS` carries and exits 0. Three
subtests: a version below the floor, a version above both the floor and the
tested version, and a same-`Client` two-call check that a version dropping
below the floor mid-session is never re-probed. The violation (`Do` skips
`gate`) fails the first subtest (`Do() = <nil>, want *VersionCompatError`);
the fixed twin passes all three.

### 2. Signal exit path at the SDK's spawn point (new: GO-API-19)

GO-CLI-12 already settles this for a **CLI's own** exit forwarding
(`main` reporting its own process's exit status) and is watched on its own
fixture. What the map flagged as unexercised is the **SDK's** spawn point —
`internal/process`, the one place the SDK observes `*exec.ExitError` from
the `ocx` child it wraps and translates it into the public `*ExitError`
(`go-api/sdk-surface.md` §4, quoted in [go-api.md](../go-api.md):219-224).
That translation is a different code path from a CLI's `main`, and nothing
had planted a signalled child against it before this dive.

```go
// fixtures/sdk-contract/signal/fixed/process.go — correct
func Classify(err error, stderr string) error {
	var exitErr *exec.ExitError
	if !errors.As(err, &exitErr) {
		return err
	}
	code := exitErr.ExitCode()
	if ws, ok := exitErr.Sys().(syscall.WaitStatus); ok && ws.Signaled() {
		code = 128 + int(ws.Signal())
	}
	return &ExitError{Code: code, Stderr: stderr}
}
```

```go
// fixtures/sdk-contract/signal/violation/process.go — the planted defect
func Classify(err error, stderr string) error {
	var exitErr *exec.ExitError
	if !errors.As(err, &exitErr) {
		return err
	}
	return &ExitError{Code: exitErr.ExitCode(), Stderr: stderr} // never checks Signaled
}
```

**Why "unchecked" is worse than "wrong": it becomes a different, plausible
wrong number one layer up.** `(*os.ProcessState).ExitCode()`'s own doc is
exact: "returns the exit code of the exited process, **or -1** if the
process hasn't exited or was terminated by a signal"
([pkg.go.dev/os#ProcessState.ExitCode](https://pkg.go.dev/os#ProcessState.ExitCode)).
In-process, the violation's `*ExitError.Code` is therefore `-1`, not `255` —
watched directly (`Code = -1, want 143`). The `255` only appears once that
`-1` crosses a real process boundary: `os.Exit`'s own doc says "For
portability, the status code should be in the range [0, 125]"
([pkg.go.dev/os#Exit](https://pkg.go.dev/os#Exit)), and a Unix `wait()`
truncates the exit status to 8 bits, so `os.Exit(-1)` is observed by a
parent as `255`. This dive plants that second layer too: a `"forward"`
helper role runs `Classify` and then `os.Exit(code)`, exactly the shape of
a CLI's `main` forwarding an SDK error's `Code` unchecked, and an *outer*
`go test` process observes the forwarder's real OS exit status. Watched:
the fixed twin's forwarder exits 143/137; the violation's forwarder exits
**255 for both SIGTERM and SIGKILL** (both collapse to the same wrong number,
because `ExitCode()` returns -1 regardless of which signal killed the
child).

**Never success.** Both subtests also assert `Code != 0`: there is no
signal whose default disposition looks like a clean exit, so "never
success" is watched as a side effect of asserting the exact code, not as a
separate case.

**Cross-GOOS `go vet`.** `syscall.WaitStatus` has a `Signal() Signal`
method on `windows` and `darwin` as well as `linux` (confirmed with
`go doc` under each `GOOS`, see [Verification runs](#verification-runs)),
and `syscall.SIGTERM`/`SIGKILL` are defined placeholder constants on
`windows` too — this is the same fact GO-CLI-12 already states ("Windows'
`WaitStatus.Signaled()` compiles and returns false"). `go vet ./...` under
`GOOS=windows`, `GOOS=darwin` and `GOOS=linux` exits 0 for both the fixed
and violation packages (the violation is a valid *program*, just a wrong
one). Windows *runtime* behaviour — whether a real Windows `ocx` child can
even be SIGTERM'd (it can't; `Process.Signal` returns `EWINDOWS`, already
recorded in `go-cli.md`'s "Dropped as a separate rule" note) — is out of
scope here, per the brief.

### 3. Timeout cause (new: GO-API-20, closes contradiction 19)

Wave-2 contradiction 12 (repeated as wave-3 contradiction 19 in
[go-topic-map.md](../go-topic-map.md) §(e).19) named two shapes for one
event: GO-CONC-17's rule text, `WithTimeoutCause(ctx, d, ErrOcxTimeout)`
(the bare sentinel as the cause), against GO-ERR-20's typed `*TimeoutError`.
`go-api/sdk-surface.md` §5 already argued for composing them — cause is the
typed value, whose `Is` method targets the sentinel — but flagged its own
contract test as unplanted. This dive plants exactly that.

```go
// fixtures/sdk-contract/timeout/fixed/timeout.go — correct
var ErrOcxTimeout = &sentinelError{"ocx: command timed out"}

type TimeoutError struct{ Stderr string }

func (e *TimeoutError) Error() string        { return ErrOcxTimeout.Error() }
func (e *TimeoutError) Is(target error) bool { return target == ErrOcxTimeout }

func Run(parent context.Context, d time.Duration, stderr string) error {
	cause := &TimeoutError{Stderr: stderr}
	ctx, cancel := context.WithTimeoutCause(parent, d, cause)
	defer cancel()
	<-ctx.Done()
	return context.Cause(ctx)
}
```

```go
// fixtures/sdk-contract/timeout/violation/timeout.go — the planted defect
func Run(parent context.Context, d time.Duration, stderr string) error {
	ctx, cancel := context.WithTimeout(parent, d) // no cause attached
	defer cancel()
	<-ctx.Done()
	return context.Cause(ctx) // == context.DeadlineExceeded, never ErrOcxTimeout
}
```

**Cross-family note on GO-CONC-17 (not an edit to `go-concurrency.md`).**
GO-CONC-17's own rule text ([go-concurrency.md](../go-concurrency.md):241)
reads "The SDK wraps its own timeout in
`context.WithTimeoutCause(ctx, d, ErrOcxTimeout)`" — the bare sentinel
passed directly as the cause value. That compiles and satisfies
`errors.Is(context.Cause(ctx), ErrOcxTimeout)` (a sentinel `errors.New`
value equals itself), but it throws away the one thing a typed cause is
for: a caller who wants `Stderr` off the timeout (as `*ExitError` already
carries it) gets nothing, because there is no concrete type to
`errors.AsType` into. GO-CONC-17's *mechanism* — attach a cause — is
correct and this dive changes nothing about it; only the concrete value in
its own example is superseded by the typed shape GO-ERR-20 already settled
and this dive now watches. `go-concurrency.md` is not edited (out of this
dive's remit); a future GO-CONC revision should swap the example.

**The four watched properties, from the brief, in one contract test:**
1. `errors.Is(err, ErrOcxTimeout)` — true.
2. `errors.AsType[*TimeoutError](err)` — true, and the returned value's
   `Stderr` field survives the round trip through `context.Cause`.
3. `errors.AsType[*ExitError](err)` — false. A timeout and a non-zero exit
   are structurally distinct; a classifier that conflates them would retry
   a timeout as if it were `TempFail` (GO-ERR-20's own rationale).
4. **A caller's own shorter deadline never matches.** `context.WithTimeoutCause`'s
   doc states the composition rule exactly: "if parentContext is canceled
   with cause1 before childContext is canceled with cause2, then
   `Cause(parentContext) == Cause(childContext) == cause1`"
   ([pkg.go.dev/context#WithTimeoutCause](https://pkg.go.dev/context#WithTimeoutCause)).
   A caller's own `context.WithTimeout(parent, 10*time.Millisecond)` around
   an SDK call whose own `WithTimeoutCause` uses a much longer duration
   expires first, so its own generic `context.DeadlineExceeded` is what
   `context.Cause` returns — never `ErrOcxTimeout`. Watched: the violation
   and the fixed twin **both** pass this specific subtest (property 4 holds
   regardless of the cause-plumbing bug, because the caller's own deadline
   still wins on the timeline either way); it is properties 1-3 that the
   violation fails.

### 4. Overlay-noise check

The brief's conditional instruction: *if `go-gates/config-assembly.md` has
landed, read its overlay-noise table for GO-API-06/07's library severities*.
Checked: no `config-assembly.md` exists anywhere under the `go-gates`
research tree (`go-gates.md`, `go-gates/config-revision.md`,
`go-gates/gate-commands.md`, `go-gates/golangci-config.md` — no fifth
file). It has not landed. **GO-API-06/07's severities are therefore
unchanged by this dive**: GO-API-06 stays MUST (SDK) / SHOULD (library),
GO-API-07 stays SHOULD, and the SDK clauses this dive adds (GO-API-18/19/20)
are all new code with no legacy-FP concern either way, consistent with
`go-api.md`'s existing conflict-22 note that "the SDK clauses stand (new
code, no legacy FPs)".

## Normative guidance candidates

1. **GO-API-18 (revised) — MUST (SDK). A typed SDK call gates the wrapped
   binary's version lazily, once per `*Client`, before doing anything else;
   it never probes at construction and never re-probes after the first
   success.**
   - *Rationale:* a caller who never calls a method that needs the window
     enforced should not pay for a spawn; a cached result must not flap
     mid-session if the binary changes underfoot (mirrors
     `ocx-sdk-python@9713f0a9ff02:_client.py:826-857`).
   - *Verifies:* a contract test asserting (a) a below-floor version raises
     `*VersionCompatError` on the first call, (b) an above-floor version
     never raises, (c) a second call after a cached success never re-probes
     even if the reported version would now fail.
   - *Run:* **yes** — `fixtures/sdk-contract/version/{violation,fixed}`.

2. **`*VersionCompatError` carries `Found string` and `Minimum string`
   and the message `"ocx %s is older than the minimum supported %s"`.**
   - *Rationale:* a caller-facing message that drifts from the Python
     SDK's wording on a straightforward one-language port is a
     documentation, not a code, defect, and it is the exact string a
     support ticket will grep for.
   - *Verifies:* `errors.As(err, &verr); verr.Found == …; verr.Minimum == …`
     in the same contract test.
   - *Run:* **yes** — same fixture, `TestGateRejectsBelowFloor`.

3. **The probe runs `ocx version` (plain text), never `ocx --format json
   version`, to learn the bare version token.**
   - *Rationale:* the plain path is documented as stable for exactly this
     purpose (`ocx@2691d3c1638e:crates/ocx_cli/src/api/data/version.rs:12-15`)
     and is one process spawn cheaper than a JSON round-trip for one string.
   - *Verifies:* reading heuristic — `grep -rn --include='*.go' -F '"version"' internal/process` should show the argv building the plain call, and a golangci `forbidigo` pattern is overkill for one call site.
   - *Run:* no — reading heuristic only; the choice is architectural, not lint-checkable.

4. **GO-API-19 (new) — MUST (SDK). The SDK's own spawn point (`internal/process`) classifies a signal-killed `ocx` child as `128+signal` on `*ExitError.Code`, never a raw, unchecked `(*exec.ExitError).ExitCode()`, and never as success.**
   - *Rationale:* the unchecked value is `-1` in-process and `255` once
     anything forwards it to `os.Exit`, which is outside `os.Exit`'s
     documented portable range `[0,125]` either way
     ([pkg.go.dev/os#Exit](https://pkg.go.dev/os#Exit)).
   - *Verifies:* a `TestMain` helper-process contract test that signals a
     blocked child with `SIGTERM` and `SIGKILL` and asserts `Code == 143`
     / `Code == 137`, plus a `grep -rn --include='*.go' -F '.ExitCode()' internal/process` whose every hit sits inside a `ws.Signaled()` branch (GO-CLI-12's own grep shape, reused).
   - *Run:* **yes** — `fixtures/sdk-contract/signal/{violation,fixed}`, plus the two-layer forwarded-exit-status check.

5. **A `syscall.WaitStatus`-inspecting spawn-point file needs no `//go:build` tag; it must still `go vet` clean under every `GOOS` the fleet ships (`windows`, `darwin`, `linux`).**
   - *Rationale:* `syscall.WaitStatus.Signal()`/`.Signaled()` and `syscall.SIGTERM`/`SIGKILL` are defined (as inert placeholders on non-Unix) on every GOOS Go supports; a build tag would be dead weight, and its absence is itself a claim worth checking on every bump.
   - *Verifies:* `GOOS=windows go vet ./internal/process/...` and `GOOS=darwin go vet ./internal/process/...`, each expecting exit 0.
   - *Run:* **yes** — all three GOOS values, both packages, [Verification runs](#verification-runs) §5.

6. **GO-API-20 (new) — MUST (SDK). The SDK's own timeout attaches `context.WithTimeoutCause(ctx, d, cause)` where `cause` is a `*TimeoutError` (not a bare sentinel), and `(*TimeoutError).Is` targets the exported `ErrOcxTimeout` sentinel.**
   - *Rationale:* a caller wants `errors.Is` simplicity and `errors.AsType` detail from the same event; a bare-sentinel cause gives the first and forecloses the second.
   - *Verifies:* the four-property contract test in [Findings §3](#3-timeout-cause-new-go-api-20-closes-contradiction-19).
   - *Run:* **yes** — `fixtures/sdk-contract/timeout/{violation,fixed}`.

7. **A `*TimeoutError` must never satisfy `errors.AsType[*ExitError]`, and vice versa.**
   - *Rationale:* GO-ERR-20's own rationale: conflating the two retries a
     timeout as though it were exit-code 75 (`TempFail`).
   - *Verifies:* `errors.AsType[*ExitError](err)` returns `false` in the same contract test as candidate 6.
   - *Run:* **yes** — same fixture.

8. **A caller's own `context.WithTimeout`/`WithDeadline` around an SDK call is respected: if it fires before the SDK's own timeout would, the caller sees its own cause, never `ErrOcxTimeout`.**
   - *Rationale:* this is `context.WithTimeoutCause`'s documented composition rule, not an SDK-specific mechanism; an SDK that somehow made its own cause win regardless of timing would violate the stdlib contract, not just a style preference.
   - *Verifies:* a contract test wrapping the SDK call in a shorter caller deadline and asserting `errors.Is(err, ErrOcxTimeout) == false` and `errors.Is(err, context.DeadlineExceeded) == true`.
   - *Run:* **yes** — passes on both the violation and the fixed twin (this property does not depend on the cause-plumbing bug; see Findings §3).

9. **GO-API-06/07's severities are unchanged pending `gates/config-assembly.md`.**
   - *Rationale:* the brief's own conditional; that file does not exist yet.
   - *Verifies:* `find /home/mherwig/dev/grimoire-lore/.agents/worktrees/go/.agents/research/go-gates -iname '*config-assembly*'` — empty output means the condition does not apply and the existing severities stand.
   - *Run:* **yes** — ran, empty, confirmed absent (see [Verification runs](#verification-runs) §6).

## Verification runs

Fixture root: `/home/mherwig/.cache/research-lang/go-tools/fixtures/sdk-contract/`
(module `sdkcontract`, `go 1.27`). Every command below runs through
`/home/mherwig/.cache/research-lang/go-tools/run.sh` (Go 1.27.1,
`GOTOOLCHAIN=local`).

**§1 — Version handshake**

| Command (from the fixture root) | Exit, violation | Exit, fixed | Relevant output |
|---|---|---|---|
| `go test ./version/violation/...` | **1** | — | `client_test.go:33: Do() = <nil>, want *VersionCompatError` (`TestGateRejectsBelowFloor` FAILs; the other two subtests pass because the violation happens to also never error on a good version) |
| `go test ./version/fixed/...` | — | **0** | `--- PASS: TestGateRejectsBelowFloor`, `--- PASS: TestGateAcceptsAboveFloor`, `--- PASS: TestGateChecksOnlyOnce`, `ok  sdkcontract/version/fixed  0.005s` |

Empty output beyond the `ok`/`FAIL` line means no other subtest failed;
`go test` prints nothing on a passing run beyond the summary.

**§2 — Signal exit path, in-process classification**

| Command | Exit, violation | Exit, fixed | Relevant output |
|---|---|---|---|
| `go test ./signal/violation/... -v` | **1** | — | `Code = -1, want 143 (128+SIGTERM)`; `Code = -1, want 137 (128+SIGKILL)` |
| `go test ./signal/fixed/... -v` | — | **0** | `--- PASS: TestClassifySIGTERM (0.15s)`; `--- PASS: TestClassifySIGKILL (0.15s)` |

**§3 — Signal exit path, forwarded OS exit status (the "255" layer)**

Same fixture, `TestForwardedExitStatus`, which runs the package's own
`Classify` inside a `"forward"` helper role that ends in `os.Exit(code)`,
then reads the *outer* process's observed exit status via
`(*exec.Cmd).Wait()` → `(*exec.ExitError).ExitCode()`.

| Command | Exit, violation | Exit, fixed | Relevant output |
|---|---|---|---|
| `go test ./signal/violation/... -run TestForwardedExitStatus -v` | **1** | — | `forwarded exit status for SIGTERM = 255, want 143`; `forwarded exit status for SIGKILL = 255, want 137` |
| `go test ./signal/fixed/... -run TestForwardedExitStatus -v` | — | **0** | `--- PASS: TestForwardedExitStatus (0.30s)` |

**§4 — Cross-`GOOS` `go vet`, both packages**

| Command | Exit |
|---|---|
| `GOOS=linux go vet ./signal/fixed/...` / `./signal/violation/...` | **0** / **0** |
| `GOOS=windows go vet ./signal/fixed/...` / `./signal/violation/...` | **0** / **0** |
| `GOOS=darwin go vet ./signal/fixed/...` / `./signal/violation/...` | **0** / **0** |

Empty output on every one of the six runs; `go vet` prints nothing on a
clean pass. Both packages vet clean under every `GOOS` because the
violation is a valid Go program, only a wrong one — `go vet` is a type/shape
checker, not a behaviour oracle, which is exactly why the behavioural
contract test in §2/§3 is the check that matters, not `go vet` here.

**§5 — Timeout cause**

| Command | Exit, violation | Exit, fixed | Relevant output |
|---|---|---|---|
| `go test ./timeout/violation/... -v` | **1** | — | `errors.Is(err, ErrOcxTimeout) = false, want true`; `errors.AsType[*TimeoutError] = false, want true` (`TestOwnTimeoutMatchesSentinel` FAILs; `TestCallerShorterDeadlineDoesNotMatch` PASSes on both, per Findings §3) |
| `go test ./timeout/fixed/... -v` | — | **0** | `--- PASS: TestOwnTimeoutMatchesSentinel (0.02s)`; `--- PASS: TestCallerShorterDeadlineDoesNotMatch (0.01s)` |

**§6 — `gates/config-assembly.md` landed check**

```
find /home/mherwig/dev/grimoire-lore/.agents/worktrees/go/.agents/research/go-gates -iname '*config-assembly*'
```
Empty output; **empty means the file has not landed**, so GO-API-06/07's
severities are unchanged (Findings §4). Directory operand given explicitly
(`go-gates`, not `.`); `-iname` needs no `-r` (find is always recursive).

**§7 — Whole-fixture sanity**

| Command | Exit |
|---|---|
| `go vet ./...` (fixture root) | **0** |
| `gofmt -l .` (fixture root) | **0**, no filenames printed |

Both confirm the fixture tree itself is not the source of any red result
above — the reds are the planted defects, not build breakage.

## Exemplar evidence

**Zero exemplar hits for either new contract** — both are genuinely new
ground for the fleet, consistent with `go-cli.md`'s own note that "the
whole ExitCode layer is new for fleet Go CLIs":

- `grep -rln 'MinSupported\|MinimumVersion\|VersionCompat' <dir>` over
  every non-vendor `.go` file in the 35-repo corpus: **empty**. No exemplar
  gates a wrapped subprocess's own version the way this contract does; the
  closest adjacent pattern in the corpus is protocol/API version
  negotiation (registry API versions in `oras-project/oras-go`), not a
  spawned-binary compatibility floor.
- `grep -rn 'syscall.WaitStatus' <dir>` over the same corpus, excluding
  `vendor/` and `_test.go`: **empty** in application code. The only hits
  are `golang.org/x/sys/unix`'s own vendored implementation of
  `WaitStatus.Signaled()`
  (`containerd__containerd/vendor/golang.org/x/sys/unix/syscall_linux.go:332,338`,
  `syscall_bsd.go:108,118`) — the mechanism this contract relies on, never
  called from any exemplar's own subprocess-handling code.
- **The live counterexample already on file**, reused from GO-CLI-12's own
  exemplar evidence (`go-cli.md`:205): `cli/cli@9b031151a825:internal/ghcmd/cmd.go:209-210`
  forwards `exitCode(extError.ExitCode())` on `ExternalCommandExitError`,
  which embeds `*exec.ExitError` (`pkg/cmd/root/extension.go:18-19`) —
  exactly the unchecked-forward shape this dive's `signal/violation`
  fixture reproduces on purpose, confirming the bug is real, not
  hypothetical, and that the SDK's spawn point (this dive's new ground)
  must not repeat it.
- No exemplar calls `context.WithTimeoutCause`/`WithDeadlineCause` at all;
  the corpus's only cause-API user is `caddyserver/caddy@54937914234b:listeners.go:567`
  with `WithCancelCause` (already GO-CONC-17's exemplar evidence). Nothing
  in the corpus demonstrates the specific "typed cause vs bare sentinel"
  choice this dive settles.

## AI-agent angle

1. **Checking the version at every call, or building a semver dependency
   for a three-field compare.** A model that has not read the Python SDK
   reaches for `golang.org/x/mod/semver` (an extra dependency, against
   Q2's stdlib-only default) or re-probes on every method call "to be
   safe." *Check:* the `TestGateChecksOnlyOnce` shape — a second call after
   a cached success must not re-exec the binary; a `go test -v` transcript
   showing more than one helper-process invocation per `*Client` is the
   tell.
2. **Copying the Python SDK's message with a paraphrase** ("ocx version
   too old" instead of the exact wording). *Check:* the exact-string
   assertion in `TestGateRejectsBelowFloor` — a reading diff against
   `_errors.py:354-368` is the fallback when no test exists yet.
3. **`code := exitErr.ExitCode(); return &ExitError{Code: code}` with no
   `Signaled()` branch — the single most natural line to write**, because
   it is exactly what a model trained on ordinary (non-signal) exit-code
   handling produces, and it compiles, vets clean, and passes on every
   *unsignaled* test case. *Check:* `grep -rn --include='*.go' -F '.ExitCode()' internal/process` (GO-CLI-12's grep, reused at the SDK layer) — every hit must sit inside a `ws.Signaled()` branch; a hit outside one is the finding.
4. **Assuming a Windows build tag is needed around the `syscall.WaitStatus` type assertion.** It is not: the type exists (as an inert placeholder) on every GOOS, and adding `//go:build unix` breaks the Windows build instead of protecting it. *Check:* `GOOS=windows go vet` on the file — if a build tag was added, the file simply isn't compiled for that GOOS and the omission is invisible to `go vet`; the check has to be "does the file **without** a tag still vet clean," not "does a build with a tag succeed."
5. **`WithTimeoutCause(ctx, d, ErrOcxTimeout)` — copying GO-CONC-17's own literal example**, which passes the bare sentinel and forecloses `errors.AsType[*TimeoutError]`. This is the one mistake this dive expects an agent to make *because a rule file itself states the wrong-shape example*; the fix is to read GO-ERR-20's type and GO-API-20's contract test together, not GO-CONC-17 alone. *Check:* `errors.AsType[*TimeoutError](err)` in a contract test; a bare-sentinel cause fails it even though `errors.Is` still passes, so an `errors.Is`-only test suite would never catch this mistake.
6. **Reasoning about `os.Exit(-1)` as "just a negative number" instead of a truncated byte.** A model unfamiliar with POSIX `wait()` semantics will predict the *in-process* value (`-1`) survives to the parent, and will write a test asserting `-1`, which fails against reality (`255`) the first time it is actually run through a subprocess boundary. *Check:* run the assertion through a real `os/exec` boundary, not just in-process — this dive's two-layer fixture (§2 vs §3) exists specifically because the in-process number and the OS-observed number differ.
7. **Using `errors.As` where the brief calls for `errors.AsType`.** Both work on Go ≥1.26, but `errors.AsType[T](err)` is the shape this program's other GO-ERR/GO-API contract tests already standardise on (`go-errors-consolidation/sdkexit_twin`); mixing the two idioms across one SDK is a style tell, not a bug, but it is exactly the kind of inconsistency an agent introduces when it drafts each file independently. *Check:* `grep -rn --include='*.go' -F 'errors.As(' internal/` inside the SDK module — every hit should be justified (translating a *stdlib* error like `*exec.ExitError`, where there is no generic-friendly alternative because the target isn't parameterised at the call site) rather than a public-contract assertion that could have been `AsType`.

## Contested / evolving

- **Whether the version probe should ever use `--format json version` instead of plain text.** The Python SDK's choice (plain) is settled for this dive because it is what ships today, but `ocx version`'s JSON payload carries build provenance (`channel`, `commit`, `ci`) that a future SDK feature (e.g., surfacing "you're running a dev build" to a caller) might want. As of 2026-09-26, no such feature is a named consumer requirement, so plain text stays the answer; revisit if one appears.
- **Whether `gate()` should be exported so a caller can force an eager check (e.g., at startup, for a fail-fast CLI).** Not resolved here — the map's default (lazy) covers the SDK's own contract; a CLI built on the SDK that wants fail-fast behaviour today has to call some no-op method early, which is a slightly awkward idiom. This is a candidate for a future `api/sdk-surface` revision, not this dive's scope.
- **GO-CONC-17's example value is now known-stale** (bare sentinel vs typed cause) but the file itself is explicitly not edited by this dive's brief. Until a GO-CONC revision fixes it, a reader of `go-concurrency.md` alone (without also reading `go-api.md`'s GO-API-20) will copy the wrong-shape example. Flagged, not fixed, here.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [pkg.go.dev/context#WithTimeoutCause](https://pkg.go.dev/context#WithTimeoutCause) | Package doc, `context` | go1.21.0 (current) | The exact composition rule ("the first cancellation wins") that Findings §3 property 4 and Normative candidate 8 rest on. |
| [pkg.go.dev/context#Cause](https://pkg.go.dev/context#Cause) | Package doc, `context` | go1.20 (current) | `Cause` is what the SDK's `Run` returns to the caller; its doc is the other half of the composition contract. |
| [pkg.go.dev/os/exec#ExitError](https://pkg.go.dev/os/exec#ExitError) | Package doc, `os/exec` | current | Confirms `*ExitError` embeds `*os.ProcessState` and carries `Stderr`; the type this dive's `Classify` observes with `errors.As`. |
| [pkg.go.dev/os#ProcessState.ExitCode](https://pkg.go.dev/os#ProcessState.ExitCode) | Package doc, `os` | go1.12 (current) | The exact wording — "-1 if ... terminated by a signal" — that Findings §2 quotes verbatim and that the violation fixture reproduces. |
| [pkg.go.dev/os#Exit](https://pkg.go.dev/os#Exit) | Package doc, `os` | current | "For portability, the status code should be in the range [0, 125]" — the doc-level warning the unchecked forward violates before the OS even truncates it. |
| [pkg.go.dev/errors#AsType](https://pkg.go.dev/errors#AsType) | Package doc, `errors` | go1.26.0 (current) | `func AsType[E error](err error) (E, bool)` — the exact generic signature this dive's contract tests use for both `*TimeoutError` and `*ExitError`. |
| [go.dev/doc/go1.21](https://go.dev/doc/go1.21) | Release notes | 2023-08 (introduces `WithTimeoutCause`) | Primary source for the Go version floor on the timeout-cause mechanism (go1.21.0). |
| [go.dev/doc/go1.26](https://go.dev/doc/go1.26) | Release notes | 2026-02 (current -1) | Primary source for `errors.AsType`'s introduction and the `go fix` modernizer rewrite, both load-bearing for this dive's floors. |
| [go.dev/doc/go1.27](https://go.dev/doc/go1.27) | Release notes | 2026-08 (current) | Confirms no `os/exec`, `os/signal`, `context`, `errors` or `syscall.WaitStatus` changes landed in 1.27 — the three contracts are stable across the fleet's two supported releases (1.26, 1.27). |
| [golang/go@go1.27.1:src/os/exec/exec_test.go](https://raw.githubusercontent.com/golang/go/go1.27.1/src/os/exec/exec_test.go) | Stdlib test source | go1.27.1 (pinned) | The stdlib's own re-exec-self helper-process idiom (`TestMain`, lines 73-127; `cmdHang`, line 1143, using `time.Sleep` rather than a bare `select{}` — confirms this dive's own deadlock-detector fix independently, see Verification runs). |
| [`ocx-sdk-python@9713f0a9ff02:src/ocx_sdk/_types.py:30-34`](../../../../../../ocx-sdk-python/src/ocx_sdk/_types.py) | Fleet source, Python SDK | 2026-09-26 (repo HEAD) | `TESTED_OCX_VERSION`/`MIN_SUPPORTED` — the exact constants the Go SDK's `TestedOcxVersion`/`MinSupportedOcx` port. |
| [`ocx-sdk-python@9713f0a9ff02:src/ocx_sdk/_errors.py:354-368`](../../../../../../ocx-sdk-python/src/ocx_sdk/_errors.py) | Fleet source, Python SDK | 2026-09-26 | `VersionCompatError`'s exact field names and message wording. |
| [`ocx-sdk-python@9713f0a9ff02:src/ocx_sdk/_client.py:826-857,679`](../../../../../../ocx-sdk-python/src/ocx_sdk/_client.py) | Fleet source, Python SDK | 2026-09-26 | `gate()`/`accept()`/`probe()` — the lazy-once-cached handshake this dive ports, and confirmation the probe uses plain text, not JSON. |
| [`ocx@2691d3c1638e:crates/ocx_cli/src/api/data/version.rs:9-48`](../../../../../../ocx/crates/ocx_cli/src/api/data/version.rs) | Fleet source, ocx CLI | 2026-09-26 (repo HEAD) | `ocx version`'s documented wire contract: bare token in plain text, `version` key always present in JSON — what the SDK's `gate()` actually parses. |

Fourteen sources tabled above: ten primary (`pkg.go.dev` ×6, `go.dev/doc`
×3 — the release notes for 1.21/1.26/1.27 — plus the pinned stdlib source)
and four fleet-internal (three `ocx-sdk-python` files, one `ocx` file). Not
separately tabled but cited throughout Findings: this program's own prior
consolidations — `go-api.md`, `go-api/sdk-surface.md`, `go-cli.md`,
`go-concurrency.md`, `go-errors.md`, `go-testing.md`, `go-topic-map.md`.
