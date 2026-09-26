# go-diagnose

A symptom-routed diagnosis skill for a Go process or test that is already
wrong. It starts from what the reporter says: it hangs, goleak failed, the
goroutine count keeps growing, zombie processes pile up, DATA RACE, it's
slow and CPU is pegged, latency spikes while idle, memory keeps rising, it
only uses one core in the container, this change is X% faster. It routes
each to the one measurement that names the cause.

```sh
grim add ghcr.io/ocx-sh/lore/go-diagnose
```

It stops when the root cause is named as a mechanism, the measurement that
proved it is pasted rather than narrated, and either a fix was watched to
clear the symptom or the cause is recorded as a named gap with the Go
version that would settle it.

## The measurement, not the folklore

Nine symptom routes cover a hang, a goroutine leak, a leaked child process,
a data race, CPU burn, an idle stall, memory and GC growth, a performance
claim, and a wrong CPU count. Each names the exact command, what output
confirms the hypothesis, and how empty output reads. Several routes exist
because the obvious reading was measured wrong: a `goroutineleak` profile
total of 0 means "none found", never "no leak". `GODEBUG=execwait=2` never
fires for a leaked `exec.CommandContext`, and only after a GC. A live block
or mutex profile with no sample lines means the rate was never set, not that
there is no contention. Touching a process nobody named as theirs to touch
is consent-gated, with the cost of each action printed before it runs: a
SIGQUIT dump, a CPU profile window, a forced-GC heap snapshot.

## Never fix the check

Deleting `goleak.VerifyTestMain`, dropping `-race`, adding a `time.Sleep` so
a race stops reproducing, or raising `-timeout` so a hanging test finishes
are each named as violations rather than fixes. The symptom goes quiet and
the defect ships.

## Pinned decisions

Measured on Go 1.27.1, linux/amd64, with goleak v1.3.0 and benchstat from
`golang.org/x/perf` at its 2026-09-08 pseudo-version. `GOTRACEBACK=crash`
cores are unreadable on Linux 6.12 and 6.13 (sourceware bug 32713, not a
`golang/go` issue), so the last resort calls for kernel 6.14 or later.

## What it does not cover

Writing the code standards this skill cites by rule ID, that is
`go-quality`. Bumping the toolchain itself, that is `go-upgrade`.

## Siblings

`go-quality` is the rule set whose verifications this skill runs in anger.
`go-upgrade` moves the toolchain forward. Run this skill after, if the
symptom survives the bump.
