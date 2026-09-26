---
title: Files, Paths and Child Processes
summary: The GO-IO family, owning atomic writes, file modes, path confinement with os.Root, archive extraction and decompression bounds, cross-process locks, and the os/exec contract for starting, cancelling and reaping a child and its process group
---

# Files, Paths and Child Processes

Owns every byte written to local disk, every path built from a name the program
did not choose, archive extraction, and the whole life of a child process from
`exec.CommandContext` to the post-`Wait` sweep. Code kinds below: *library*,
*CLI*, and *SDK*, meaning a library whose job is driving one external CLI (the
**pinned** default shape, stdlib-only, which an adopter without one skips). Not
owned here: HTTP body bounds, staging registry blobs and on-disk format versions
are `GO-NET` (network.md). Decoder and multipart bounds and secret redaction are
`GO-SEC`. The 128+N exit status of a signalled child is `GO-CLI`. The SDK's error
and timeout types are `GO-API` (GO-API-20). Linter config text, gosec excludes
and the CI OS legs are `GO-GATE`. The helper-process test and the limits of
`execwait=2` are `GO-TEST` (GO-TEST-12). The `net/http` half of `noctx` is GO-CONC-03.

Contents: [Dates and Floors](#dates-and-floors) ·
[Caught by golangci-lint](#caught-by-golangci-lint) ·
[Caught by the go Command](#caught-by-the-go-command) ·
[Caught by a Grep](#caught-by-a-grep) ·
[Caught by a Fixture or by Reading](#caught-by-a-fixture-or-by-reading) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Floors

Measured 2026-09-26 against Go 1.27.1 and golangci-lint v2.14.0 (bundled gosec
and `noctx`) unless a row says otherwise.

- **Pinned `go` lines** (default, the adopter may override): libraries and the
  SDK declare `go 1.26.0`, CLIs `go 1.27.0`, so every floor below is met by
  construction. The floors matter only in a foreign repo.
- Go-line gated: `exec.CommandContext` 1.7, `Cmd.Cancel`, `Cmd.WaitDelay` and
  `filepath.IsLocal` 1.20, `//go:debug` 1.21, the `go.mod` `godebug` block
  1.23, `os.Root` 1.24 and its full method set (`MkdirAll`, `Symlink`) 1.25.
- Behaviour-gated (read 2026-09-26): `tarinsecurepath` and `zipinsecurepath`
  still default to permissive in toolchain 1.27.1. The Linux pidfd path
  (toolchain 1.23+) protects only the leader pid, with no group-scoped pidfd.
- The Windows rows were not watched on a Windows runtime.

## Caught by golangci-lint

```bash
golangci-lint run --default=none --enable-only=gosec,noctx ./...
```

Exit 0 with `0 issues.` is the pass. Run it from the module root so it reads
the gosec thresholds from the repo's config.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-IO-01 | Start every child with `exec.CommandContext`, test helpers included. Never call `exec.Command`. | A child with no context has no deadline and no cancel path. It is what training data writes: 443 `exec.Command` calls against 141 `CommandContext` in the exemplar corpus (measured 2026-09-26). | The gate: `os/exec.Command must not be called` (`noctx`) is the red. `noctx` is not in golangci-lint's `standard` set, so the baseline config must enable it. Without golangci-lint: `grep -rn --include='*.go' -e 'exec\.Command(' .`, empty output = pass. | MUST |
| GO-IO-02 | Open every file name the program did not choose (an archive entry, or a name derived from a tag, digest, ref or URL) through `os.Root` or `os.OpenInRoot`. For an archive entry, first reject `!filepath.IsLocal(name)` with an error, check the reader's error (`zip.NewReader` returns a populated `.File` alongside `ErrInsecurePath`), then pass the name straight to `root.OpenFile`, `root.MkdirAll` or `root.Symlink`, never through `filepath.Join(dest, name)`. | `filepath.Join` rejects nothing, and `IsLocal` is lexical only: a symlink entry followed by `link/x` escapes an `IsLocal`-guarded extractor, while `os.Root` rejects both with `path escapes from parent`. CVE-2025-3445 is this bug class in 2025. | Archives: `G305: File traversal when extracting zip/tar archive` in the gate. It also fires on an `IsLocal`-guarded `filepath.Join(dest, hdr.Name)`, so compliant code never joins entry names. The gosec excludes are G104, G115 and G304 (GO-GATE-14), and G304 is excluded because this rule owns untrusted names. Other names, reading heuristic: `grep -rn --include='*.go' -e 'filepath\.Join(' .` in packages that take external names, where a hit with no `os.Root` in the same function is the finding. | MUST |
| GO-IO-03 | Bound every decompression of external data before copying: check the declared size (`UncompressedSize64`, `hdr.Size`) against a cap, cap the entry count, then `io.Copy(dst, io.LimitReader(r, max+1))` and treat `n > max` as an error. | A 51,969-byte zip expands to 52,428,800 bytes with `err == nil`. HTTP bodies are GO-NET-07 and decoders GO-SEC-05, and archives stay here. | `G110: Potential DoS vulnerability via decompression bomb` in the gate. The `LimitReader` twin is clean. | MUST |
| GO-IO-04 | Never request a world-writable mode (`0o777`, `0o666`). Directories get `0o755`, files `0o644`, secrets (tokens, credentials, private keys) `0o600`. **Pinned** thresholds, default the adopter may override: gosec `G301` `0755`, `G302` `0644`, `G306` `0644`, set in the baseline config that `GO-GATE` owns. | The literal is a request the umask filters, and the call site owns neither the umask nor where it runs. gosec's shipped defaults (0750 and 0600) flag the conventional modes, which the corpus writes hundreds of times, so they would train reviewers to ignore it. | G301, G302 and G306 in the gate: with the pinned thresholds only the `0o777` and `0o666` sites are red. Secrets, reading heuristic: a secret-bearing write whose mode is not `0o600` is the finding. | MUST |

```go
// wrong: G305 fires, and an IsLocal check in front does not silence it
p := filepath.Join(dest, hdr.Name)
out, err := os.Create(p)

// right: the root refuses ../ and symlink escapes, IsLocal only makes the error clear
if !filepath.IsLocal(hdr.Name) {
	return fmt.Errorf("unsafe entry %q", hdr.Name)
}
out, err := root.OpenFile(hdr.Name, os.O_CREATE|os.O_WRONLY|os.O_EXCL, 0o644)
```

## Caught by the go Command

```bash
go list -f '{{if eq .Name "main"}}{{.ImportPath}} {{.DefaultGODEBUG}}{{end}}' ./...
GOOS=windows go vet ./...
GOOS=darwin go vet ./...
```

The first prints one line per main package and is read, not counted. The two
vets exit 0 on the pass.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-IO-05 | Any binary that parses tar or zip pins `tarinsecurepath=0` and `zipinsecurepath=0` in a `go.mod` `godebug` block, or in `//go:debug` lines in `package main`. Never set `execerrdot=0`. Libraries and the SDK cannot pin, so they rely on GO-IO-02's `IsLocal` reject. | Both settings are permissive in Go 1.27.1: `tar.Next` returns a `../` header with no error. `execerrdot=0` reopens the current-directory binary hijack that Go 1.19 closed. `go vet` rejects `//go:debug` outside `package main` and tests. | The `go list` gate: a main package that parses archives and whose line lacks `tarinsecurepath=0,zipinsecurepath=0` is the finding, and so is any line carrying `execerrdot=0`. | MUST |
| GO-IO-06 | Put OS-specific process attributes only in files constrained to the OSes that declare them. `Setpgid`, `Pgid` and `syscall.Kill(-pid, sig)` go in a file that carries `//go:build unix`, or in a `_linux.go` file. A `_unix.go` name alone constrains nothing, because `unix` is not a GOOS file-name suffix. `Pdeathsig` goes in a `//go:build linux` file or a `_linux.go` file (a constraint naming both `linux` and `freebsd` is allowed), **never** behind a `unix` gate. The Windows counterpart goes in `_windows.go`. | `Setpgid` does not exist on Windows and `Pdeathsig` exists only on linux and freebsd, so a gate that is too wide breaks those builds. Copying the `Setpgid` gate onto `Pdeathsig` compiles on linux and breaks darwin, the BSDs, AIX and Solaris. | The two vets: `unknown field Setpgid` or `unknown field Pdeathsig in struct literal` is the red. The darwin vet is the only `Pdeathsig` check, and a grep for files lacking `go:build` is not admissible because it passes this exact mistake. The SDK and CLIs get the same coverage from their Windows and macOS test legs (GO-GATE-07), and libraries run the two vets. | MUST |

## Caught by a Grep

Each command takes `.` as the module root. Empty output is the pass except
where a row says otherwise.

```bash
# GO-IO-07: files that build an exec.Cmd and never set WaitDelay
grep -rl --include='*.go' -e 'exec\.CommandContext(' -e 'exec\.Command(' . | xargs -r grep -L -e '\.WaitDelay'
# GO-IO-10: a context sentinel matched against a Wait error
grep -rl --include='*.go' -e '"os/exec"' . | xargs -r grep -n -e 'errors\.Is([^)]*context\.DeadlineExceeded' -e 'errors\.Is([^)]*context\.Canceled'
# GO-IO-12: an unconditional temp removal in a file that renames
grep -rl --include='*.go' -e 'defer os\.Remove(' . | xargs -r grep -l -e 'os\.Rename('
# GO-IO-13: files that spawn, which must print 1 in the SDK
grep -rl --include='*.go' --exclude='*_test.go' -e 'exec\.Command(' -e 'exec\.CommandContext(' . | wc -l
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-IO-07 | Set a nonzero `Cmd.WaitDelay` on every `exec.Cmd`. **Pinned** SDK value: its kill grace, 5 s (default, the adopter may override). Never hand-roll a SIGTERM-then-SIGKILL timer, because `WaitDelay` already is that grace. | `CommandContext` does not bound `Wait`: a canceled or exited child whose descendant holds a pipe open blocks `Wait` forever. After `Cancel` runs, `WaitDelay` escalates to `os.Process.Kill`. Only 8 of 584 exec sites in the corpus set it. | The GO-IO-07 command: empty output = pass. It is file-granular, so a hit is a file to read. | MUST |
| GO-IO-08 | Pass argv directly. Never run `sh -c`, `bash -c` or `cmd /c` with a composed string. | A shell brings back word-splitting, globbing and injection, which `os/exec` avoids by design. No linter sees a literal shell-out: gosec, `noctx` and staticcheck SA1005 stay silent, and SA1005 skips any `argv[0]` containing `/`. | `grep -rn --include='*.go' -e 'exec\.Command("sh"' -e 'exec\.Command("/bin/sh"' -e 'exec\.CommandContext([^,]*, "sh"' -e 'exec\.CommandContext([^,]*, "/bin/sh"' -e '"bash", "-c"' -e '"cmd", "/c"' .`: empty output = pass. | MUST |
| GO-IO-09 | Pass a secret to a child on stdin (a `--password-stdin`-style flag with `cmd.Stdin` set) or in env, never in argv. Test helpers included. | Any co-resident user reads argv through `ps` and `/proc/PID/cmdline`. gosec G204 is not this check: it fires on every non-constant argv, the stdin twin included. | `grep -rn --include='*.go' -e 'exec\.Command.*"-p"' -e 'exec\.Command.*"--password"' -e 'exec\.Command.*"--token"' -e 'exec\.Command.*"--secret"' -e 'exec\.Command.*"--api-key"' .`: empty output = pass. A `-p` hit whose flag is not a password (`mkdir -p`, `ssh -p`) is read and cleared. It sees single-line calls only, so an argv slice built elsewhere is read by hand. | MUST |
| GO-IO-10 | Decide "timed out or canceled" from `context.Cause(ctx)` or `ctx.Err()` after `Wait`, checked **before** the exit is classified, never from `errors.Is(waitErr, context.DeadlineExceeded)`. | A child killed by `Cancel` reports `*exec.ExitError` (`signal: terminated`). The context error surfaces only when the child exits 0 after `Cancel`. The sentinel pattern works for HTTP and SQL, so it reads as correct here. | The GO-IO-10 command: empty output = pass. It cannot see check order, so in the SDK the check is GO-API-20's real-spawn contract case, where a deadline-killed helper child must surface the timeout type and not an `*exec.ExitError`. | MUST |
| GO-IO-11 | Write crash-surviving state (config, index, lock metadata, cache entries, store blobs) only through one internal atomic-write helper: `os.CreateTemp(filepath.Dir(target), pattern)`, write, `Sync`, a checked `Close`, `os.Rename`, then on Unix open the directory and `Sync` it. Never `os.WriteFile` or `os.Create` on the final path. Logs and reports are exempt. **Pinned**: one stdlib helper and no `renameio` (default, the adopter may override). | `os.WriteFile` truncates at open, so a kill mid-write leaves a truncated file where the atomic twin leaves the old bytes. A temp file in `os.TempDir()` fails `Rename` across filesystems. `renameio` exports nothing on Windows. An orphaned temp file is the only crash residue, so a store sweeps its own pattern on open. | Reading heuristic: `grep -rn --include='*.go' -e 'os\.WriteFile(' -e 'os\.Create(' .` lists candidates. A hit whose target is state is the finding, and no analyzer can tell state from disposable output. | MUST |
| GO-IO-12 | Remove the temp file only if the rename did not happen: set a `renamed` flag after `Rename` and check it in the deferred closure. Never write `defer os.Remove(tmp.Name())` in a function that renames. | After `Rename` the temp name is free, so the unconditional defer deletes whatever reoccupies that path. It is the placement written by reflex next to `CreateTemp`. | The GO-IO-12 command: empty output = pass. | MUST |
| GO-IO-13 | **Pinned**: the SDK spawns from exactly one internal function (for example `internal/process.Run`) that applies GO-IO-01, GO-IO-07, GO-IO-08, GO-IO-14, GO-IO-20 and GO-IO-21 once and carries the package's only `//nolint:gosec // G204: argv is the wrapped CLI's contract`. For a CLI this is CONSIDER. | G204 fires on every non-constant argv, so one spawn point keeps the suppression and the policy in one place. The suppression is valid only with golangci-lint's `common-false-positives` exclusion preset off (GO-SEC-01, GO-GATE-09), otherwise `nolintlint` reports it as unused. | The GO-IO-13 command must print `1` in the SDK. Any other number is the finding. | SHOULD |

```go
// wrong: after Rename this deletes whatever next lands on the temp name
defer os.Remove(tmp.Name())

// right: removed only if the rename never happened
renamed := false
defer func() {
	if !renamed {
		_ = os.Remove(tmp.Name())
	}
}()
// write, tmp.Sync(), a checked tmp.Close(), then:
if err := os.Rename(tmp.Name(), target); err != nil {
	return err
}
renamed = true
return syncDir(filepath.Dir(target)) // Unix only: open the directory and Sync it
```

## Caught by a Fixture or by Reading

```bash
# GO-IO-21: files that set Pdeathsig with no LockOSThread (candidates to read)
grep -rl --include='*.go' -e 'Pdeathsig' . | xargs -r grep -L -e 'LockOSThread'
```

GO-IO-18 is retired and its number is not reused: staging a content-addressed
blob off its final path is GO-NET-14 in the `GO-NET` family (network.md), and
versioning an on-disk format the tool owns is GO-NET-15 in the same family.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-IO-14 | When the child can spawn descendants (the SDK, and CLIs that wrap tools, but not one-shot probes like `go env`), tear down its process group. On Unix set `Setpgid: true` and a custom `Cancel` that returns `os.ErrProcessDone` once `cmd.ProcessState != nil` and otherwise sends SIGTERM to `-cmd.Process.Pid`. `WaitDelay` is the grace. After `Wait` returns on a canceled context, the very next statement is one `syscall.Kill(-pgid, syscall.SIGKILL)` with no sleep, retry or liveness probe before it, and `ESRCH` is success. Take the pgid from `cmd.Process.Pid` and never re-resolve it. Windows keeps the default `Kill`. | `Process.Kill` and `WaitDelay`'s escalation reach only the leader, so a grandchild that ignores SIGTERM survives both. The sweep is reuse-safe for the case it exists for: a pgid stays unallocatable while any group member lives, so a sweep that finds a survivor cannot hit a stranger, and `ESRCH` means the group is already empty. Every step added before it widens the reuse window. `Process.Signal(SIGTERM)` returns `EWINDOWS` on Windows, so `Cancel` is build-tagged (GO-IO-06). | Reading heuristic on the spawn function: `Setpgid` set, the pgid taken once from `cmd.Process.Pid`, the sweep the next statement after `Wait`, `ESRCH` mapped to nil. Any of the four missing is the finding. Backed by a behavioural fixture: a SIGTERM-ignoring grandchild is alive after `Wait` without the sweep and dead with it. | MUST |
| GO-IO-15 | Capture output through `Cmd.Stdout` and `Cmd.Stderr` writers. Use `StdoutPipe` or `StderrPipe` only to stream, and then drain every pipe you took concurrently. Bound stderr with a prefix-and-suffix saver (the stdlib keeps 32 KiB). Never truncate a stdout payload such as a JSON envelope: above a contract size, return an error. | Reading one of two pipes deadlocks once the other fills its OS buffer (1 MiB of stderr hangs). A truncated JSON document is corrupt, not partial. | Reading heuristic: every hit from `grep -rn --include='*.go' -e 'StdoutPipe()' -e 'StderrPipe()' .` needs its own reader goroutine, and a pipe with none is the finding. | SHOULD |
| GO-IO-16 | Reject Windows-reserved device names (`CON`, `PRN`, `AUX`, `NUL`, `COM1` to `COM9`, `LPT1` to `LPT9`, any case, with or without an extension) in every file name derived from external input, whatever `GOOS` the check runs on. Binds the SDK and CLIs that write tag-, digest- or ref-derived paths. **Pinned**: Windows is first-class (default, the adopter may override). | `filepath.IsLocal`'s reserved-name check is compiled only into the Windows build, so on a Linux CI runner `IsLocal("CON")` is `true`. | A table test of the name validator that includes `CON`, `nul` and `COM1.txt`, run on the Linux leg. A validator that accepts any of them is the finding. | MUST |
| GO-IO-17 | On Windows, retry the atomic rename 5 to 10 times with exponential backoff from about 1 ms, only on `ERROR_ACCESS_DENIED` and `ERROR_SHARING_VIOLATION`, from a `_windows.go` helper. Every other error is fatal. | `MoveFileEx` fails transiently while a scanner or reader holds the target, and Windows replace has no atomic guarantee ([golang/go#22397](https://github.com/golang/go/issues/22397), open on 2026-09-26). | Reading heuristic: a Windows rename with no bounded retry, or a retry on every error, is the finding. Not watched on a Windows runtime. | SHOULD |
| GO-IO-19 | CLIs take cross-process file locks through a GOOS split behind one `TryLock` and `ErrLocked` API: `syscall.Flock` with `LOCK_EX` and `LOCK_NB` on Unix, `golang.org/x/sys/windows.LockFileEx` with `LOCKFILE_EXCLUSIVE_LOCK` and `LOCKFILE_FAIL_IMMEDIATELY` on Windows, or `github.com/gofrs/flock` where a dependency is acceptable. Read and write through the locked handle. **Pinned**: the SDK takes no locks, because the wrapped CLI owns store locking. | There is no portable stdlib lock and no `os.Lock`, and `syscall` has no `LockFileEx`, so a stdlib-only SDK cannot lock on Windows. | Reading heuristic: a lock taken in the SDK, or a lock file with no GOOS split, is the finding. | SHOULD |
| GO-IO-20 | **Pinned**: build the SDK child's environment from an explicit allowlist. Never leave `cmd.Env` nil, or set it to `os.Environ()`, for a third-party or user-supplied child. | A nil `Env` hands the child the parent's whole environment, credentials included. | Reading heuristic on the spawn function: `cmd.Env` unset or copied from `os.Environ()` is the finding. | SHOULD |
| GO-IO-21 | On Linux, give the direct child `Pdeathsig: syscall.SIGKILL` in a `_linux.go` file, and hold `runtime.LockOSThread()` in one dedicated goroutine from before `Start` until `Wait` returns (go-runc's shape), with a comment naming the failure mode it covers. Never treat it and the GO-IO-14 sweep as substitutes, never use it where no spare OS thread exists (`GOMAXPROCS=1`, where it can hang), and never combine it with a setuid or setgid child. | When the SDK itself is SIGKILLed or OOM-killed no Go code runs, so only the kernel's parent-death signal reaches the child. It fires when the creating **thread** dies, not the process ([golang/go#27505](https://github.com/golang/go/issues/27505), closed with a doc fix), so a retired thread kills a healthy child. It is cleared on `fork`, protecting the direct child only, and by a credential change ([golang/go#9686](https://github.com/golang/go/issues/9686), closed). | The OS constraint is GO-IO-06's darwin vet. The pairing is a reading heuristic: the GO-IO-21 command lists candidates, file-granular and substring-matching (a local named `usePdeathsig` is a false positive), so read each hit. | SHOULD |

```go
// spawn_unix.go, //go:build unix
cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
cmd.Cancel = func() error {
	if cmd.ProcessState != nil { // already reaped: the number may belong to a stranger
		return os.ErrProcessDone
	}
	return syscall.Kill(-cmd.Process.Pid, syscall.SIGTERM)
}
if err := cmd.Start(); err != nil {
	return err
}
pgid := cmd.Process.Pid // taken once, never re-resolved
waitErr := cmd.Wait()
if ctx.Err() != nil { // next statement after Wait: no sleep, no retry, no probe
	if err := syscall.Kill(-pgid, syscall.SIGKILL); err != nil && !errors.Is(err, syscall.ESRCH) {
		return errors.Join(waitErr, err)
	}
}
return waitErr
```

Documented gaps, which the rules name and do not claim to close:

- **Session escape.** A descendant that calls `setsid` or `setpgid` leaves the
  group and escapes both the sweep and `Pdeathsig`. Only a delegated cgroup
  (`SysProcAttr.UseCgroupFD`, go 1.20) or a Windows job object reaches it.
- **Windows tree kill.** **Pinned** default: no job object, the gap is
  documented, and `WaitDelay` still bounds `Wait`.
- **The double coincidence.** The group empties and a new group leader takes
  the freed number before the sweep. It cannot be forced and is accepted
  (CWE-367). Say which case a sweep hit: a live descendant or an empty group.

## What Agents Get Wrong Here

1. **Writing `exec.Command`,** because most training data does. Caught by `noctx` (GO-IO-01).
2. **Believing `CommandContext` bounds `Wait`** and omitting `WaitDelay`. 576 of 584 corpus sites have none (GO-IO-07).
3. **Using `os.WriteFile` for state.** It is the shortest idiom and truncates first (GO-IO-11).
4. **Writing `defer os.Remove(tmp.Name())` right after `CreateTemp`,** mirroring the `defer f.Close()` reflex (GO-IO-12).
5. **Joining `filepath.Join(dest, entry.Name)` and trusting `filepath.Clean` or `IsLocal` as the guard.** G305 fires on the guarded form too (GO-IO-02).
6. **Matching `errors.Is(err, context.DeadlineExceeded)` after a cancelled `Wait`,** the pattern that works for HTTP and SQL (GO-IO-10).
7. **An unbounded `io.Copy` from a `zip.File` or `gzip.Reader`** (GO-IO-03).
8. **Assuming `archive/tar` and `archive/zip` are secure by default,** and discarding `zip.NewReader`'s error. errcheck ignores `_` by default, so only reading catches the discard (GO-IO-05, GO-IO-02).
9. **Copying a Unix gate onto the wrong field:** `Setpgid` in an unconstrained file, or `Pdeathsig` behind `//go:build unix`. Only the cross-`GOOS` vets catch either (GO-IO-06).
10. **Writing `sh -c` from Python's `shell=True` habit.** It survives every linter (GO-IO-08).
11. **Adding `StderrPipe()` later without a second reader** (GO-IO-15).
12. **Citing gosec G204 as the secrets-in-argv check,** or G307 by its retired meaning. Neither backs a rule here (GO-IO-09).
13. **Hallucinating a stdlib `os.Lock`** (GO-IO-19), or **setting `GODEBUG=execerrdot=0`** to silence `exec: ... resolves to executable in current directory` (GO-IO-05).
14. **Trusting `IsLocal("CON")` on a Linux runner** (GO-IO-16).
15. **Retrying the sweep, sleeping before it, or logging `ESRCH` as a failure,** the way a network call is handled, and overstating what the sweep guarantees in either direction (GO-IO-14).
16. **Copying a bare `Pdeathsig` without the `LockOSThread` pairing,** or treating it and the sweep as interchangeable, or claiming the sweep kills "the whole tree". It passes every test that does not force thread retirement (GO-IO-21).
