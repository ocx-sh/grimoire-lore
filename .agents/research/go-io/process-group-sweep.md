---
title: "GO-IO-14 reuse-safety and Pdeathsig placement (wave 3)"
topic: "Proving the post-Wait process-group SIGKILL sweep in GO-IO-14 is safe against pgid reuse, and deciding where Linux Pdeathsig belongs relative to it"
agent: io/process-group-sweep
model: sonnet
date_researched: 2026-09-26
sources_count: 16
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/process-group-sweep/
scope: >
  Covers only GO-IO-14's post-Wait `Kill(-pgid, SIGKILL)` sweep and where `Pdeathsig` belongs
  relative to it, on Go 1.27.1 / linux-amd64, with golangci-lint 2.14.0. Does not cover the
  Windows job-object gap (open question 1, unchanged), GO-IO-15 pipe draining, or any rule other
  than GO-IO-14. Does not reproduce the Pdeathsig thread-exit footgun ("golang/go#27505") inside
  the Go runtime itself — that would need forcing the runtime to retire a specific M, which this
  fixture set does not attempt.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [What a process group's numeric id actually is, and when it can be reused](#1-what-a-process-groups-numeric-id-actually-is-and-when-it-can-be-reused)
   2. [Where GO-IO-14's sweep sits relative to `Cmd.Wait`, and why that already matters](#2-where-go-io-14s-sweep-sits-relative-to-cmdwait-and-why-that-already-matters)
   3. [`Pdeathsig`: what it is, where it exists, and its thread-vs-process footgun](#3-pdeathsig-what-it-is-where-it-exists-and-its-thread-vs-process-footgun)
   4. [The three planted cases](#4-the-three-planted-cases)
   5. [macOS (and everything else) has no `Pdeathsig`](#5-macos-and-everything-else-has-no-pdeathsig)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- The post-Wait `kill(-pgid, SIGKILL)` sweep in GO-IO-14 is reuse-safe for the case it exists for: while a plausible surviving descendant is actually alive, the pgid it targets cannot have been handed to an unrelated process, because the kernel keeps that number attached to the group for as long as any member — leader zombie or descendant, live or zombie — still exists.
- The only genuine race window is the group already being empty by the time the sweep runs; `kill(2)`'s own contract makes that safe — it returns `ESRCH`, "the target process or process group does not exist," never a signal to a stranger by itself.
- `ESRCH` from the sweep is success, not a failure to swallow silently: change GO-IO-14's wording from "ignore `ESRCH`" to "treat `ESRCH` as success."
- A second, independent coincidence (the kernel reallocating that exact freed pid to a brand-new process that itself becomes a group leader with the same number, before the sweep executes) would still misdirect the signal; this fixture set cannot force that coincidence and does not claim to rule it out — it is the same residual risk `ocx-sdk-python/_process.py:803`'s `returncode is not None` guard (CWE-367) accepts rather than eliminates.
- Go's own stdlib independently confirms the underlying pid-reuse race is real: `os/pidfd_linux.go` says pidfd exists because "there is no wait/kill race … (described in CL 23967)" for a *single* pid — but pidfd has no group-scoped analogue, so the numeric-pgid sweep is what remains for the group case.
- `Pdeathsig` (`syscall.SysProcAttr.Pdeathsig`; the stdlib exposes it on `linux || freebsd`, but this revision's SHOULD binds linux only — no fleet target or exemplar, including go-runc itself, exercises freebsd) is a genuine complement to the sweep, not a substitute: it is the only one of the two mechanisms that fires when the SDK's *own* process is SIGKILLed or OOM-killed, because at that instant no Go code is left running to perform the sweep.
- Case (c) proves this directly: a direct child of a SIGKILLed parent dies within 300ms when `Pdeathsig: SIGKILL` is set, and survives (orphaned, re-parented to init) when it is not.
- `Pdeathsig` is thread-scoped, not process-scoped, on Linux: the signal fires when the *creating thread* dies, which the stdlib's own doc comment says "may happen before process termination" (`go1.27.1:src/syscall/exec_linux.go:92-95`), citing `golang/go#27505`.
- In practice this is not a hazard for the SIGKILL-the-whole-process case (every OS thread dies at once, so the creating thread trivially dies too) — the documented footgun is the opposite direction: the Go runtime retiring the specific OS thread that executed the fork *while the process is otherwise healthy*, delivering a spurious kill. This is why `Pdeathsig` is a SHOULD, not a MUST, and why the SHOULD includes a mitigation, not just the field.
- **The ecosystem has already solved the thread-retirement footgun, and this dive initially missed the evidence.** `containerd/containerd`'s vendored `go-runc` sets `Pdeathsig` in two real production sites and pairs it with `runtime.LockOSThread()`/`defer runtime.UnlockOSThread()` around exactly the `Start`-through-`Wait` span, citing `golang/go#27505` by name and warning that `GOMAXPROCS=1` can hang if the caller does not retain an unlocked thread. A first pass of this dive re-grepped the corpus and reported zero hits; a corrected, unfiltered re-grep (below) found 10, including two real containerd production sites — the corpus has direct precedent for both the field and its mitigation, just not for pairing either with the sweep.
- `Pdeathsig` exists only on `syscall.SysProcAttr` for `freebsd || linux` (`exec_freebsd.go`, `exec_linux.go`); it does not exist on darwin or openbsd (`exec_libc2.go`), dragonfly or netbsd (`exec_bsd.go`), or aix or solaris (`exec_libc.go`) — confirmed by reading each OS's struct definition directly, not by GOOS-name pattern-matching.
- `GOOS=darwin go vet ./...` catches an unconstrained `Pdeathsig` reference exactly the same way it already catches an unconstrained `Setpgid` for GO-IO-06: `unknown field Pdeathsig in struct literal of type syscall.SysProcAttr`.
- The corpus does have real `Pdeathsig` precedent — `containerd/containerd@934434dde54b:pkg/sys/unshare_linux.go:188` and `core/mount/mount_idmapped_utils_linux.go:47` set it directly, and its vendored `go-runc` pairs it with `runtime.LockOSThread` (see §3). What has no precedent is pairing `Pdeathsig` with a post-Wait group sweep, or the sweep itself.
- `Pdeathsig` is cleared by a setuid/setgid credential change if set beforehand (`golang/go#9686`) — irrelevant to the SDK, which never runs a child under a different credential, but worth knowing if a CLI ever combines the two.
- POSIX `setpgid(2)` and `kill(2)` supply the two facts this whole proof rests on: a process group is a membership concept, not tied to any one member's lifetime, and `ESRCH` is kill(2)'s documented response to signalling a group (or process) that no longer exists.
- GO-IO-14's severity is unchanged (MUST for the sweep on the code kinds it already bound); `Pdeathsig` is added as a Linux-only SHOULD inside the same rule (the stdlib also exposes it on FreeBSD, but no fleet target or exemplar exercises it there), not a new rule id — every GO-IO id stays stable.

## Findings

### 1. What a process group's numeric id actually is, and when it can be reused

A process group's id is not a separate namespace value the kernel invents — it is literally the pid of whichever process created the group (`setpgid(pid, 0)` with `pgid==0` sets the group id to the calling process's own pid) ([man7 setpgid(2)](https://man7.org/linux/man-pages/man2/setpgid.2.html)). Membership, not the leader's survival, is what keeps that number alive: a group "continues to exist as long as it has at least one process in it, no matter whether that process is the group leader." Concretely, once a process (leader or descendant) attaches to a numeric id as its `pgid`, the kernel will not hand that same number to a brand-new, unrelated task anywhere on the system until every attachment to it — as a pid, a pgid, or a session id — has been released, which only happens when every member has both exited and (for the specific pid-holding member) been collected.

This is exactly the invariant GO-IO-11's atomic-write neighbour rules rely on for files, restated for process ids: a resource is not "free" the instant one owner lets go of it, only once every reference is gone.

Two consequences for the sweep:
- **While a target member is provably alive, the pgid cannot have been recycled.** This is what makes case (a) below safe: the grandchild's own liveness is the proof, not the sweep's timing.
- **Once the group is provably empty, the number is free — and `kill(2)` says so.** `ESRCH`: "the target process or process group does not exist. Note that an existing process might be a zombie … but has not yet been waited for" ([man7 kill(2)](https://man7.org/linux/man-pages/man2/kill.2.html)).

### 2. Where GO-IO-14's sweep sits relative to `Cmd.Wait`, and why that already matters

`os/exec.(*Cmd).Wait` calls the raw `os.Process.Wait` (the actual reap) as its very first statement, before `awaitGoroutines`'s `WaitDelay` handling even starts (`go1.27.1:src/os/exec/exec.go:936-970`). So by the time `Cmd.Wait()` returns to caller code, the leader has already been reaped, and its specific pid slot is free — *if nothing else is still using it*. GO-IO-14's sweep runs after that return.

The stdlib's own `WaitDelay` escalation (`os.Process.Kill`, leader-only) is scheduled from a separate goroutine racing the blocking reap, and on Linux 1.23+ it goes through a pidfd rather than the numeric pid, specifically to dodge this exact class of race for the single leader (`go1.27.1:src/os/pidfd_linux.go:88-92`: "there is no wait/kill race … because the PID recycle issue doesn't exist … since pidfd, unlike PID, is guaranteed to refer to one particular process"). There is no equivalent "pgid-fd" concept in Linux or in Go, so the group sweep has no pidfd escape hatch — it is stuck with the numeric `-pgid` form, and its safety has to come from the membership fact in §1, not from a kernel handle.

Given §1, the design in go-io.md ("after Wait returns … send `Kill(-pgid, SIGKILL)`") does not need to be reordered relative to `Wait`. Sweeping *before* the reap (interposing on `Cmd.Wait`'s internal call) is not achievable without reimplementing `os/exec`'s reap loop, and would not close any additional gap: the exposure is already limited to the already-empty-group case, which reordering cannot help (there is nothing left to protect once the group is empty either way). The correct fix is narrower: **stop discarding `ESRCH` as a no-op and stop treating it as anything other than the sweep's documented success path**, and document exactly how narrow the remaining coincidence is, which is what this revision does.

### 3. `Pdeathsig`: what it is, where it exists, and its thread-vs-process footgun

`syscall.SysProcAttr.Pdeathsig` asks the kernel (via `prctl(PR_SET_PDEATHSIG, sig)`, called by the child right after `fork`/`clone`, `go1.27.1:src/syscall/exec_linux.go:552-570`) to deliver `sig` to the child when its parent goes away — without any cooperation from the parent's own code. The Linux manual is explicit that "parent" here means "the *thread* that created this process": "The parent-death signal is sent upon subsequent termination of the parent thread" ([man7 PR_SET_PDEATHSIG](https://man7.org/linux/man-pages/man2/PR_SET_PDEATHSIG.2const.html)). Two lifecycle facts from the same page matter for placement: the setting is cleared for the child of a `fork(2)` (a grandchild does not inherit it automatically — each hop that wants the guarantee must set it again) and preserved across `execve(2)`, except when executing a setuid/setgid binary or one with file capabilities, which clears it (also the subject of `golang/go#9686`, fixed by moving the `prctl` call after credential changes in `exec_linux.go`).

Go's own doc comment names the exact hazard this dive was asked to establish: "Pdeathsig, if non-zero, is a signal that the kernel will send to the child process when the creating thread dies. Note that the signal is sent on thread termination, which may happen before process termination. There are more details at https://go.dev/issue/27505" (`go1.27.1:src/syscall/exec_linux.go:92-95`). [golang/go#27505](https://github.com/golang/go/issues/27505) is exactly that: because Go multiplexes goroutines onto a pool of OS threads it manages independently, the specific OS thread that happened to execute the `fork`/`clone` syscall for a given `cmd.Start()` is not guaranteed to live for the process's whole lifetime — if the Go runtime later retires that thread for unrelated scheduling reasons, the kernel treats that exactly like "the parent died," delivering the signal to the child even though the actual Go process is completely healthy.

For the SDK's use case — the whole process being SIGKILLed or OOM-killed — this footgun does not apply: `SIGKILL` terminates every thread in the process at once, so the specific creating thread dies right along with everything else, and the signal fires reliably (proved in §4, case c). The footgun only matters for a *long-lived* healthy process that might have the runtime shed the specific M involved; that is a documented, sourced caveat this revision records, not a scenario this fixture set forces or claims to reproduce (see the Contested section).

**The mitigation is not hypothetical — it is already shipped, in the exact codebase that already sets `Pdeathsig`.** `containerd/containerd`'s vendored `go-runc` (`containerd/containerd@934434dde54b:vendor/github.com/containerd/go-runc/runc.go:83-90`) documents the field with: "When Pdeathsig is set, command invocations will call runtime.LockOSThread to prevent OS thread termination from spuriously triggering the signal. See https://github.com/golang/go/issues/27505 … A program with GOMAXPROCS=1 might hang because of the use of runtime.LockOSThread. Callers should ensure they retain at least one unlocked thread." The implementation is `ProcessMonitor.StartLocked` (`monitor.go:79-90`): a dedicated goroutine calls `runtime.LockOSThread()` before `cmd.Start()`, `defer runtime.UnlockOSThread()`, and only then calls `cmd.Start()` followed by `cmd.Wait()` in that same goroutine — pinning the "creating thread" identity for the entire span `Pdeathsig` cares about, and releasing the lock only once the child's exit has already been collected. This is the shape this revision adopts: `Pdeathsig` is a SHOULD *together with* this pairing, not the bare field alone.

### 4. The three planted cases

All three live under `fixtures/process-group-sweep/` (module `process-group-sweep`, `go 1.26.0`), verified with `run.sh` (Go 1.27.1, golangci-lint 2.14.0).

**(a) A SIGTERM-ignoring grandchild alive after `Wait`; the sweep must kill it, and must be the exact grandchild, not a stranger.** `reuse/sweep_reuse_test.go`'s `TestSweep_KillsSurvivingGrandchild` starts `sh -c 'trap "" TERM; sleep 30 & echo $! > pidfile; wait'` under `Setpgid: true` with a 300ms `WaitDelay`, lets the context deadline (100ms) fire so `Cancel` sends the group `SIGTERM` and `WaitDelay`'s leader-only `Kill` follows, calls `cmd.Wait()` (reaping the leader), reads the grandchild's pid from the file *before* sweeping, confirms it is alive, sweeps with `syscall.Kill(-pgid, syscall.SIGKILL)`, and confirms that exact pid is dead afterward. §1's invariant is what makes reading the pid before the sweep a meaningful check at all: the grandchild's continued existence is the proof the pgid was never up for grabs.

**(b) An empty group; the sweep must return `ESRCH`.** `TestSweep_EmptyGroup_ESRCH` runs the same shape without the `trap`, so the descendant exits cleanly on `SIGTERM` before the sweep fires, leaving the group empty by the time `syscall.Kill(-pgid, syscall.SIGKILL)` runs. It asserts `errors.Is(err, syscall.ESRCH)`.

**(c) The SDK's own process SIGKILLed mid-run, with and without `Pdeathsig`.** `pdeathsig/parent/main.go` is a small stand-in for "the SDK's own process": it starts one child (`sleep 30`), optionally with `Pdeathsig: SIGKILL` set on the child's `SysProcAttr` and paired with `runtime.LockOSThread()` (the go-runc shape from §3), writes the child's pid to a file, prints `ready`, and then blocks in `select{}` forever — no defer, no signal handler, nothing that could clean up on its own. `pdeathsig/pdeathsig_linux_test.go` builds that binary with `go build` (never `go run`, which would interpose the toolchain's own build process between the test and the exact process whose death matters — defeating the whole point of the case), starts it, reads the child's pid once it reports ready, sends `SIGKILL` to the parent binary itself, waits 300ms, and checks whether the child is still alive. With `Pdeathsig` set, the child is dead; without it, the child survives, orphaned and reparented (to init or the nearest subreaper) — exactly the two outcomes the rule needs distinguished.

### 5. macOS (and everything else) has no `Pdeathsig`

Reading each OS's `syscall.SysProcAttr` definition directly (not inferring from the field's name or from one GOOS) settles this precisely:

| File | `//go:build` | `Setpgid`/`Pgid` | `Pdeathsig` |
|---|---|---|---|
| `exec_linux.go` | linux | yes | yes |
| `exec_freebsd.go` | freebsd | yes | yes |
| `exec_libc2.go` | `darwin \|\| openbsd` | yes | **no field** |
| `exec_bsd.go` | `dragonfly \|\| netbsd` | yes | **no field** |
| `exec_libc.go` | `aix \|\| solaris` | yes | **no field** |
| `exec_windows.go` | windows | **no field** | **no field** |

`GOOS=darwin go vet ./...` is the mechanical proof for this table's absence column, the same check GO-IO-06 already prescribes for `Setpgid` on Windows: it fails to compile any file that references `Pdeathsig` without a `linux || freebsd` build constraint, with `unknown field Pdeathsig in struct literal of type syscall.SysProcAttr` (§Verification runs).

## Normative guidance candidates

1. **Treat `ESRCH` from the post-Wait group sweep as success, never as an error to surface or retry.**
   - Rationale: it is `kill(2)`'s documented, correct response to an already-empty group (§1); anything else either masks the real signal-delivery outcome or invites a retry loop that reopens the coincidence window instead of closing it.
   - Verify: read the sweep's error handling for `errors.Is(err, syscall.ESRCH)` (or the platform equivalent) mapped to a no-op, not a logged failure.
   - Watched red: **yes** — `fixtures/process-group-sweep/reuse/sweep_reuse_test.go::TestSweep_EmptyGroup_ESRCH`.

2. **Do not add a delay, retry, or "double-check the process is gone" step between `Cmd.Wait()` returning and the sweep's `Kill(-pgid, SIGKILL)` call.**
   - Rationale: every extra syscall or scheduling point between the reap and the sweep only widens the already-narrow coincidence window from §1; the correct mitigation is minimizing that gap, not adding logic to it.
   - Verify: a reading heuristic — the sweep call is the next statement after `Wait` returns, with no intervening I/O, sleep, or channel receive.
   - Watched red: no (reading heuristic only; there is no analyzer for "statement adjacency").

3. **Add `SysProcAttr.Pdeathsig: syscall.SIGKILL` to the SDK's direct child on linux, as a SHOULD alongside `Setpgid`, never as a replacement for the post-Wait sweep.**
   - Rationale: it is the only mechanism of the two that reaches the child when the SDK's own process is SIGKILLed or OOM-killed — the sweep cannot run in that case because no Go code is left executing. Scoped to linux, not the stdlib's wider `linux || freebsd`, because no fleet target or exemplar (including go-runc, which gates its own support the same way) exercises freebsd.
   - Verify: `go build ./... && GOOS=linux go vet ./...` confirms it compiles, but the behavioural proof is the fixture in item 4 below; a reading heuristic on the spawn function (GO-IO-13) that `Pdeathsig` is set alongside `Setpgid`.
   - Watched red: **yes** — `fixtures/process-group-sweep/pdeathsig/pdeathsig_linux_test.go::TestPdeathsig_ParentKilled_ChildDies` (child dies with it set) against `::TestPdeathsig_ParentKilled_WithoutIt_ChildSurvives` (child survives without it).

4. **Never reference `Pdeathsig` in a file without a `//go:build linux || freebsd` constraint (or an equivalent `_linux.go`/`_freebsd.go` filename).**
   - Rationale: `syscall.SysProcAttr` has no such field on darwin, openbsd, netbsd, dragonfly, aix, or solaris; an unconstrained reference breaks every one of those builds.
   - Verify: `GOOS=darwin go vet ./...` (fails to compile the violation); fallback grep: `grep -rl --include='*.go' -e 'Pdeathsig' DIR | xargs -r grep -L -e 'go:build'` — a hit is an unconstrained use; empty output means every `Pdeathsig` reference this grep found is inside a file that also carries a `go:build` line (it does not itself verify which OSes that line names, so pair it with the vet run for a MUST-grade check).
   - Watched red: **yes** — `fixtures/process-group-sweep/darwinvet/`: `GOOS=darwin go vet ./bad/...` exits 1; `./good/...` exits 0; the grep prints `darwinvet/bad/spawn.go` and nothing for `darwinvet/good/`.

5. **Never describe the group sweep as either "definitely safe" or "definitely racy" without naming which of the two cases (a live descendant vs. an already-empty group) is under discussion.**
   - Rationale: the two cases have different safety properties (§1); a blanket claim in either direction is wrong for one of them.
   - Verify: a reading/reviewing heuristic on any PR description or doc comment that touches the sweep — it should name the case.
   - Watched red: no (documentation-discipline heuristic, not a runnable check).

6. **Capture the leader's pid into a single local variable immediately after `Start`, and use only that captured value for both the graceful `Cancel` and the SIGKILL sweep — never re-read `cmd.Process.Pid` a second time after `Wait` has returned.**
   - Rationale: `cmd.Process.Pid` itself does not change after reap, so this is not a correctness bug today, but re-reading it invites a future refactor to substitute a "current" pid from somewhere else (e.g., re-resolving a stored pgid from disk after a restart), which would reintroduce exactly the reuse risk this rule closes; capturing once at `Start` makes that substitution visibly wrong in review.
   - Verify: a reading heuristic — grep for `cmd.Process.Pid` occurring more than once in the same function that also calls `Wait`.
   - Watched red: no (style/defense-in-depth heuristic; not independently exercised by a fixture, since the current code already satisfies it).

7. **Document, do not attempt to eliminate, the residual "double coincidence" race in the sweep (freed pid reused by a brand-new process that itself becomes a group leader with the same number, before the sweep fires).**
   - Rationale: closing it fully would require a kernel-level group-scoped handle (a "pgidfd") that does not exist in Linux or in Go as of 1.27.1; the practical mitigation available today is the membership fact in §1 plus a minimal reap-to-sweep gap (item 2), and pretending otherwise invites an unbuildable fix.
   - Verify: a reading heuristic — the rule's own text names the residual risk explicitly (this revision's GO-IO-14 text does).
   - Watched red: no, by design — this is exactly the coincidence this fixture set states it cannot force (see scope and Contested).

8. **Never claim `Process.Kill`, `WaitDelay`'s escalation, or a pidfd-backed signal protects anything beyond the single leader process; only the numeric `-pgid` sweep reaches the rest of the group, and it is the piece with the residual race.**
   - Rationale: it is tempting to assume 1.23's pidfd support "fixes" process-group signalling generally, since it fixed the single-pid wait/kill race; it does not, because there is no group-scoped pidfd analogue (`go1.27.1:src/os/pidfd_linux.go:88-92`).
   - Verify: a reading heuristic on any comment or doc that credits pidfd with group safety — it is wrong.
   - Watched red: no (conceptual/documentation heuristic).

9. **Never set `Pdeathsig` without pairing it with `runtime.LockOSThread()` around the span from before `Start` to after the guarantee is no longer needed (typically after `Wait` returns), and never do so on a program that cannot spare an unlocked thread (`GOMAXPROCS=1` with no other headroom).**
   - Rationale: this is the ecosystem's own already-shipped fix for the #27505 thread-retirement footgun in §3, not a novel precaution — `containerd/containerd`'s vendored `go-runc` does exactly this, by name, citing the same issue.
   - Verify: a reading heuristic — a `Pdeathsig` site should have a `runtime.LockOSThread()`/`defer runtime.UnlockOSThread()` pair enclosing it in the same function or an immediately enclosing goroutine; fallback grep: `grep -rl --include='*.go' -e 'Pdeathsig' DIR | xargs -r grep -L -e 'LockOSThread'` — a hit is a file containing `Pdeathsig` with no `LockOSThread` anywhere in it (file-granular, so a hit is a finding to read, not an automatic fail). Confirmed camelCase false-positive against this fixture set itself: `pdeathsig_linux_test.go` is flagged because it names a local variable `usePdeathsig` (a substring match, not a real reference to the field), and `-w` does not filter it out because Go's camelCase gives no regex word boundary between `use` and `Pdeathsig` — expected, and why this check stays a reading heuristic rather than a MUST-backing lint.
   - Watched red: **yes**, for the shape compiling and behaving correctly under `Pdeathsig=true` — `fixtures/process-group-sweep/pdeathsig/parent/main.go` now pairs them and `TestPdeathsig_ParentKilled_ChildDies` still passes; **no** for the footgun itself, which this fixture set does not force (same caveat as item 7).

## Verification runs

All commands run through `/home/mherwig/.cache/research-lang/go-tools/run.sh` (Go 1.27.1, `GOTOOLCHAIN=local`, golangci-lint 2.14.0) from `/home/mherwig/.cache/research-lang/go-tools/fixtures/process-group-sweep/`.

**(a) Sweep kills a surviving grandchild, provably the same one.**
```
run.sh go test ./reuse/... -run Sweep -v
```
Exit 0. Relevant output:
```
=== RUN   TestSweep_KillsSurvivingGrandchild
    sweep_reuse_test.go:84: sweep=Kill(-1364636, SIGKILL) reaped grandchild 1364637
--- PASS: TestSweep_KillsSurvivingGrandchild (0.50s)
```
No compliant/violating twin is applicable here — this is a behavioural proof of the sweep's own effect, not a static rule with a violating form.

**(b) Sweep on an empty group returns `ESRCH`.**
Same command as (a) (both subtests run together). Relevant output:
```
=== RUN   TestSweep_EmptyGroup_ESRCH
    sweep_reuse_test.go:107: sweep=Kill(-1364672, SIGKILL) on an empty group: no such process (expected)
--- PASS: TestSweep_EmptyGroup_ESRCH (0.25s)
```
Exit 0 (test framework reports PASS on the correct `ESRCH`; the raw `syscall.Kill` call itself, in isolation, returns the non-nil `ESRCH` error, which is the assertion's target, not a test failure).

**(c) Pdeathsig, with and without, on the SDK's own process being SIGKILLed.**
```
run.sh go test ./pdeathsig/... -run Pdeathsig -v -timeout 30s
```
Exit 0. Relevant output:
```
=== RUN   TestPdeathsig_ParentKilled_ChildDies
    pdeathsig_linux_test.go:94: usePdeathsig=true childPid=1384541 alive=false
--- PASS: TestPdeathsig_ParentKilled_ChildDies (0.43s)
=== RUN   TestPdeathsig_ParentKilled_WithoutIt_ChildSurvives
    pdeathsig_linux_test.go:100: usePdeathsig=false childPid=1384705 alive=true
--- PASS: TestPdeathsig_ParentKilled_WithoutIt_ChildSurvives (0.39s)
```
This is a genuine violation/twin pair in the behavioural sense: `usePdeathsig=false` is the violation (child survives its logical owner's death), `usePdeathsig=true` is the fix (child dies with it).

**(d) macOS has no `Pdeathsig`; `GOOS=darwin go vet` is the mechanical proof.**
```
GOOS=darwin run.sh go vet ./darwinvet/bad/...
```
Exit 1:
```
# process-group-sweep/darwinvet/bad
vet: darwinvet/bad/spawn.go:13:41: unknown field Pdeathsig in struct literal of type syscall.SysProcAttr
```
```
GOOS=darwin run.sh go vet ./darwinvet/good/...
```
Exit 0, no output. Native-leg sanity check, `GOOS=linux run.sh go vet ./darwinvet/...`, also exits 0 (the constrained-good tree compiles on both, the bad tree only on linux/freebsd).

Grep fallback for item 4 of the Normative guidance:
```
grep -rl --include='*.go' -e 'Pdeathsig' darwinvet/bad | xargs -r grep -L -e 'go:build'
```
Prints `darwinvet/bad/spawn.go`, exit status of the pipeline reflects the final `grep -L` finding a match (nonzero when no output only). Against the compliant tree:
```
grep -rl --include='*.go' -e 'Pdeathsig' darwinvet/good | xargs -r grep -L -e 'go:build'
```
Empty output — every `Pdeathsig` reference found sits in a file that also carries a `go:build` line. Empty output is pass; a printed path is a finding to read (it does not itself confirm which OSes the constraint names, so it is a fallback for repos without the real toolchain, not a replacement for the vet run). Directory operand is explicit (`darwinvet/bad`, `darwinvet/good`); `xargs -r` avoids invoking `grep -L` with no input when the first grep finds nothing.

**Not run:** the "double coincidence" residual race (item 7 of the Normative guidance) — reproducing it would require controlling the system-wide pid allocator (e.g., a container with `kernel.pid_max` pinned low) to force immediate reuse of a specific freed number, which this sandbox does not have permission to configure and which would be unsafe to force on a shared machine. This is reported as not run, not as a pass.

## Exemplar evidence

`grep -rl --include='*.go' -e 'Pdeathsig' <exemplar-root>` (unfiltered — the corpus's own vendor trees included, since GO-IO-14 binds the SDK and CLIs, and a vendored dependency's own choices are exactly what an adopting repo inherits) found 10 files. An initial pass of this dive filtered too aggressively and reported zero; the corrected, unfiltered re-grep is what backs every claim below.

- **Real production precedent, not just a library:** `containerd/containerd@934434dde54b:pkg/sys/unshare_linux.go:188` and `core/mount/mount_idmapped_utils_linux.go:47` both set `Pdeathsig: syscall.SIGKILL` directly on `os.StartProcess`/`os.ProcAttr`, in containerd's own non-vendored source.
- **The `LockOSThread` mitigation, shipped, not proposed:** containerd's vendored `github.com/containerd/go-runc` (`vendor/github.com/containerd/go-runc/runc.go:83-90`, `monitor.go:79-90`) documents and implements exactly the pairing this revision adopts, citing `golang/go#27505` by name and the `GOMAXPROCS=1` hang caveat. `command_linux.go:44` (`cmd.SysProcAttr.Pdeathsig = r.PdeathSignal`) is where the field is actually set on the `exec.Cmd`; the `LockOSThread` call lives one layer up, in the `StartLocked` monitor that owns the `Start`/`Wait` pair.
- **Three more direct `Pdeathsig` sites**, all in containerd's own integration-test and failpoint helpers rather than shipped production code: `integration/failpoint/cmd/runc-fp/main.go:90`, `integration/release_upgrade_linux_test.go:815`, `integration/issue7496_linux_test.go:128` — each a bare `cmd.SysProcAttr = &syscall.SysProcAttr{Pdeathsig: syscall.SIGKILL}` with no `LockOSThread` pairing, which is acceptable for a short-lived test helper whose creating goroutine does not outlive the call, but would be the AI-agent failure mode below if copied into long-lived SDK code.
- **Two hits are noise, not usage:** `golang/tools@d2d3de9f066e:internal/stdlib/manifest.go` and `google/go-containerregistry@0c8bedb78437:vendor/golang.org/x/tools/internal/stdlib/manifest.go` are both generated API-surface listings that mention `Pdeathsig` only as a symbol name, not a call site.
- `containerd@934434dde54b:pkg/imageverifier/bindir/processes_unix.go:38-44` (already cited in go-io.md for GO-IO-06/14) sets `Setpgid` and does a group `Cancel`, but does not set `Pdeathsig` and has no post-Wait sweep of its own.
- `cli/cli@9b031151a825:.github/skills/cli-exercise/tool/internal/cliutil/process_unix.go:28-40` (already cited) is the same shape: `Setpgid` without `Pdeathsig`.
- **What genuinely has no precedent:** no exemplar pairs `Pdeathsig` with a post-Wait group sweep, and the sweep itself (GO-IO-14's original commitment) remains unprecedented on its own.
- **The ecosystem is more conservative than the stdlib requires:** go-runc gates its own `Pdeathsig` support to plain `linux` (`command_linux.go`, filename-constrained; `command_other.go` carries `//go:build !linux` and has no `Pdeathsig` field at all), not the wider `linux || freebsd` the stdlib's `syscall.SysProcAttr` actually supports (§5). containerd's two direct sites are also both `*_linux.go`. No exemplar was found exercising `Pdeathsig` on freebsd specifically — this revision's own SHOULD is wider than every exemplar's practice.

## AI-agent angle

- **Assumes a process group is "freed" the instant `Cmd.Wait()` returns, and therefore either (a) refuses to write the sweep at all ("it's racy, so don't"), or (b) writes it with an unconditional error check that treats `ESRCH` as a bug.** Both are wrong for the reason in §1. Check: read GO-IO-14's reuse-safety paragraph; for (b), grep the sweep's error handling for a path that logs or returns on `ESRCH` instead of treating it as success.
- **Sets `Pdeathsig` in a file gated only to `unix` (copying the existing `Setpgid` gate reflexively), not `linux` (or `linux || freebsd` if a target ever needs it).** It compiles on linux (and freebsd), breaks on darwin, openbsd, netbsd, dragonfly, aix and solaris. Check: `GOOS=darwin go vet ./...` (this revision's fixture; the same discipline GO-IO-06 already prescribes for `Setpgid` on Windows).
- **Treats `Pdeathsig` as a substitute for the group sweep** ("we set Pdeathsig, so we don't need the SIGKILL sweep too") or the reverse ("we have the sweep, Pdeathsig is redundant"). Neither: they cover disjoint failure modes (§3, §4c). Check: a reading heuristic — the spawn function (GO-IO-13) should show both, each with a one-line comment naming which failure mode it covers.
- **Assumes `Pdeathsig` fires "when the parent process dies," per its own plausible-sounding field name, and never reads the actual semantics.** It fires when the *creating thread* dies (§3). This does not change the SDK's SIGKILL-the-whole-process case (harmless), but would mislead an agent reasoning about any scenario involving `runtime.LockOSThread` or cgo callback threads. Check: cite `golang/go#27505` and the doc comment at `exec_linux.go:92-95` before writing anything that depends on `Pdeathsig`'s exact trigger.
- **Copies the bare `Pdeathsig` field from a search result or an old snippet without the `LockOSThread` pairing** — it is the single most likely mistake here, because the field alone compiles, passes every test that does not specifically target the footgun (including this dive's own case-c fixture, which passes with or without the pairing, since it never forces a spurious thread-retirement kill), and looks identical to correct code in review. Check: the fallback grep in Normative guidance item 9 (`Pdeathsig` present, `LockOSThread` absent in the same file) — read every hit, since the check is file-granular and camelCase identifiers (e.g. a variable named `usePdeathsig`) can false-positive.
- **Hallucinates a "pgidfd" or assumes 1.23's pidfd support makes the group sweep as safe as `Process.Kill` became.** It does not — pidfd is per-process, and there is no group-scoped analogue (`os/pidfd_linux.go:88-92`). Check: a reading heuristic; no such type exists in `os` or `syscall` as of 1.27.1 (`grep -rn --include='*.go' -e 'PidFD' "$(go env GOROOT)/src/os/pidfd_linux.go"` shows the single-process scope directly).
- **Writes the sweep with a retry loop** ("if the first `Kill(-pgid, ...)` fails, try again after a short sleep") on the theory that a transient failure deserves a retry, the way a network call would. This is exactly backwards for this call: a retry after any delay only widens the coincidence window in §1's second bullet. Check: a reading heuristic — the sweep should be a single call, and `ESRCH` should be the only expected non-nil result.

## Contested / evolving

- **How much the "double coincidence" residual race matters in practice is not settled, and this dive does not settle it.** The mechanism is real (confirmed from `setpgid(2)`/`kill(2)` semantics and Go's own pidfd rationale for the single-pid case), but its practical likelihood depends on kernel pid-allocation behavior (cyclic, wrap-around allocation over the whole `pid_max` range) and system-wide fork churn, neither of which this sandbox can safely manipulate to measure. CPython's ecosystem has debated the identical question for `os.killpg` under the same CWE-367 heading (the guard `ocx-sdk-python/_process.py:803` cites is that lineage) without a definitive "this is negligible" or "this must be closed" resolution; as of 2026-09-26, the accepted mitigation across ecosystems is the membership-and-`ESRCH`-contract shape this revision documents, not a stronger guarantee. Trending: no active Go proposal (searched golang/go issues) proposes a group-scoped handle; the direction of travel for the single-process case (pidfd, 1.23) has not been extended to groups and there is no signal it will be.
- **Whether the Go runtime's OS-thread-retirement footgun (`golang/go#27505`) is a live concern for typical Go programs, or a theoretical one that mostly matters for cgo-heavy or `LockOSThread`-heavy code, is not resolved by this dive.** The issue itself does not report a confirmed in-the-wild misfire from ordinary goroutine scheduling (as opposed to deliberate thread manipulation); this revision treats it as a documented caveat worth a one-line SHOULD-not-MUST justification, not as grounds to avoid `Pdeathsig` altogether.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [man7.org kill(2)](https://man7.org/linux/man-pages/man2/kill.2.html) | POSIX/Linux man page (primary spec) | current (man-pages project, 2026) | Defines negative-pid group signalling and the `ESRCH` contract this whole proof leans on. |
| [man7.org setpgid(2)](https://man7.org/linux/man-pages/man2/setpgid.2.html) | POSIX/Linux man page (primary spec) | current | Defines process-group creation and membership; the basis for §1's reuse argument. |
| [man7.org PR_SET_PDEATHSIG](https://man7.org/linux/man-pages/man2/PR_SET_PDEATHSIG.2const.html) | Linux `prctl(2)` sub-page (primary spec) | current | The exact thread-vs-process wording, and fork/execve/setuid clearing rules. |
| [pkg.go.dev/os/exec](https://pkg.go.dev/os/exec) | Go stdlib package docs (primary, tool's own docs) | Go 1.27.1 | `Cancel`/`WaitDelay` semantics and their interaction with `Wait`. |
| [go.dev/doc/go1.20](https://go.dev/doc/go1.20) | Go release notes (primary) | Go 1.20 (2023) | Introduced `Cmd.Cancel`/`Cmd.WaitDelay`, the mechanism this rule builds on. |
| `go1.27.1:src/syscall/exec_linux.go` | Go stdlib source (primary, tool's own repository, read locally via the pinned toolchain) | Go 1.27.1 | The `Pdeathsig` doc comment (lines 92-95) and its exact `prctl` placement (lines 552-570). |
| `go1.27.1:src/syscall/exec_freebsd.go`, `exec_libc2.go`, `exec_bsd.go`, `exec_libc.go` | Go stdlib source (primary) | Go 1.27.1 | The per-OS `SysProcAttr` struct definitions that settle exactly which OSes have `Pdeathsig`. |
| `go1.27.1:src/os/exec/exec.go` | Go stdlib source (primary) | Go 1.27.1 | `Wait`/`awaitGoroutines`: confirms the reap happens before `WaitDelay` handling. |
| `go1.27.1:src/os/pidfd_linux.go` | Go stdlib source (primary) | Go 1.27.1 (pidfd since 1.23) | The stdlib's own statement that the single-pid wait/kill race is real, and that pidfd (not a group concept) is its fix. |
| [golang/go#27505](https://github.com/golang/go/issues/27505) | Accepted Go issue, closed with a doc fix (primary, tool's own tracker) | filed 2018, doc landed since | The thread-vs-process `Pdeathsig` footgun this rule's SHOULD (not MUST) rests on. |
| [golang/go#9686](https://github.com/golang/go/issues/9686) | Go issue (primary) | 2015 | `Pdeathsig` cleared by a setuid/setgid credential change; context for never combining the two. |
| [golang-dev: StartProcess and prctl(PR_SET_PDEATHSIG)](https://groups.google.com/g/golang-dev/c/WXeVIp0LY8A/m/2C2HAgoYvU4J) | Go core-team mailing list discussion (secondary, practitioner) | ~2013 | Early design discussion of fork/exec safety that led to the current `SysProcAttr` shape. |
| [go-io.md GO-IO-06, -07, -14 and conflicts 6-7](../go-io.md) | This program's own prior consolidation (internal) | 2026-09-26 | The pre-revision rule text, its exemplar counts, and the `procgroup/` fixture this dive extends rather than duplicates. |
| `ocx-sdk-python/src/ocx_sdk/_process.py:784-820` | The Python SDK's own kill-ladder and pid-recycling guard (internal reference codebase) | current | The `_signal_group`/`returncode is not None` guard this dive's Go design mirrors, and its own CWE-367/bpo-38630 citation. |
| [go.dev/issue/23019](https://go.dev/issue/23019) | Go issue (primary, already cited in go-io.md) | 2017 | The orphaned-descendant-holding-a-pipe hazard `WaitDelay` bounds, adjacent context for why the sweep exists at all. |
| `containerd/containerd@934434dde54b:vendor/github.com/containerd/go-runc/{runc.go,monitor.go,command_linux.go,command_other.go}` | Exemplar corpus source, vendored dependency (primary, an actual shipped mitigation) | fetched 2026-09-26 | The only corpus evidence for `Pdeathsig` in real use and the `LockOSThread` pairing that closes #27505 — this dive's design is adopted from here, not invented. |
