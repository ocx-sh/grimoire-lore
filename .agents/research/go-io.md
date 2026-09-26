---
title: "Go files and processes — consolidated verdict (GO-IO)"
topic: "Files and processes: atomic writes, path confinement, archive extraction, permissions, locks, and the os/exec child-process contract"
model: opus
id_family: GO-IO
consolidates:
  - go-io/files-and-atomicity.md
  - go-io/subprocess-contract.md
  - go-io/process-group-sweep.md
date: 2026-09-26
revised: 2026-09-26
target: "go-quality/io.md (GO-IO), per go-topic-map.md › Artifact set decision"
fixtures:
  - /home/mherwig/.cache/research-lang/go-tools/fixtures/go-io-consolidation/
  - /home/mherwig/.cache/research-lang/go-tools/fixtures/process-group-sweep/
  - /home/mherwig/.cache/research-lang/go-tools/fixtures/go-io-revision/
toolchain: "Go 1.27.1, golangci-lint 2.14.0 (bundled gosec, staticcheck 0.8.1), via /home/mherwig/.cache/research-lang/go-tools/run.sh"
---

# Go files and processes (GO-IO)

This file consolidates the two wave-2 dives for map section G (rows M-G-01..18, plus M-E-18), revised with the wave-3 follow-up `io/process-group-sweep` that it commissioned (see the Revision log).

Bracketed keys used below:
- [fa] is [files-and-atomicity](go-io/files-and-atomicity.md).
- [sp] is [subprocess-contract](go-io/subprocess-contract.md).
- [pgs] is [process-group-sweep](go-io/process-group-sweep.md) (wave 3). Its runs live under `fixtures/process-group-sweep/`.
- **[r]** marks a measurement taken during the wave-3 revision of this file, under `fixtures/go-io-revision/` (module `goiorev`, `go 1.26.0`).
- [run] is [exemplar-runtime-posture](go-audit/exemplar-runtime-posture.md).
- [gates] is [exemplar-quality-gates](go-audit/exemplar-quality-gates.md).
- [cfg] is [config-inventory](go-audit/config-inventory.md).
- **[c]** marks a measurement taken during this consolidation. Every [c] run lives under `fixtures/go-io-consolidation/` (full path in the frontmatter). Its command, exit code and output are recorded in the verification cells.

## Verdict

1. **Every child process uses one shape, which is fixed.** It starts with `exec.CommandContext`, sets a nonzero `WaitDelay`, and takes its argv directly with no shell. Secrets go to the child on stdin or in env. This binds all code kinds. `WaitDelay` is the kill-grace period: after `Cancel` runs, `WaitDelay` escalates to `os.Process.Kill` (`go1.27.1:src/os/exec/exec.go:289-314`, [c] ladder test). So the fleet never hand-rolls a SIGTERM→SIGKILL timer.
2. **The SDK, and any CLI whose child can spawn descendants, tears down the child's process group.** This is not the whole tree: see the gaps in item 9. Its parts:
   - On Unix, the child gets `Setpgid`.
   - A build-tagged `Cancel` sends SIGTERM to the group.
   - After `Wait`, a SIGKILL sweep hits the group. [c] measured a SIGTERM-ignoring grandchild that survives `WaitDelay`'s leader-only Kill.
   - **The sweep is reuse-safe for the case it exists for** ([pgs] §1, settled in wave 3). A pgid stays unallocatable while any group member (leader zombie or a live or zombie descendant) exists, so a sweep that reaches a live survivor cannot hit a stranger. `ESRCH` from the sweep means the group is already empty and is success.
   - On Linux the direct child also SHOULD get `Pdeathsig: SIGKILL`, paired with `runtime.LockOSThread` (GO-IO-21, new). It is the only mechanism that fires when the SDK's own process is SIGKILLed or OOM-killed, because then no Go code runs to sweep ([pgs] §4c).
   - On Windows the default `Kill` stays. `Process.Signal(SIGTERM)` returns `EWINDOWS` there (`go1.27.1:src/os/exec_windows.go:65-77`).
   - Job objects are deferred for SDK v0.1 (open question 1).
3. **Crash-surviving state is written only through one internal atomic-write helper.** The steps are:
   - `CreateTemp` in the target directory;
   - write;
   - `Sync`;
   - a checked `Close`;
   - `Rename`;
   - a Unix directory fsync;
   - cleanup that runs only if the rename did not happen.

   There is no `renameio`, because the SDK is stdlib-only (Q2) and renameio exports nothing on Windows. A temp file in `os.TempDir()` is a finding, because `Rename` fails across filesystems. On Windows the rename gets a bounded retry (Q6).
4. **Any name the program did not choose is opened through `os.Root`.** That covers an archive entry, a tag, a digest or a ref. Every fleet `go` line is ≥ 1.26 (Q1), which is above the 1.25 floor where `os.Root`'s method set is complete. `filepath.IsLocal` is only the early reject that gives a clear error, never the guard. For archives, gosec G305 is the mechanical proof: it fires on *any* `filepath.Join(dest, entry.Name)`, including an `IsLocal`-guarded one ([c]). So compliant code never joins entry names.
5. **Binaries that read archives pin `tarinsecurepath=0` and `zipinsecurepath=0` in a `go.mod` `godebug` block.** Libraries and the SDK cannot do this. `go vet` rejects `//go:debug` outside `package main` ([c]). So libraries and the SDK reject non-local names themselves, per rule 4 above.
6. **Permissions are gated by gosec with fleet thresholds `G301: 0755`, `G302: 0644`, `G306: 0644`.** gosec's shipped defaults (0750 and 0600) fire on the conventional 0755 and 0644 ([c]). The corpus has 335 `644` literals and 100 `MkdirAll(…, 0755)` calls ([run] §6), so the defaults would be noise. Secrets get 0600 by review.
7. **gosec G204 is not the secrets-in-argv check.** It fires on any argv that is not a constant, including a `--password-stdin` twin ([c]). The SDK therefore routes every spawn through one function and suppresses G204 once there, with a reason. A grep catches secrets in argv.
8. **The SDK takes no cross-process file locks.** The Windows primitive, `LockFileEx`, is not in `syscall`, and `ocx` owns store locking. CLIs use a GOOS-split `flock`/`LockFileEx` (`x/sys/windows`) or `gofrs/flock`.
9. **"Tears down the whole process tree" has three documented gaps, which the rules name and do not claim to close.**
   - **Session escape.** A descendant that calls `setsid`/`setpgid` leaves the group, and the sweep cannot reach it ([r] `escape/`: `setsid=true … alive=true` after the sweep). On Linux only a delegated cgroup reaches it: `cgroup.kill`, with `SysProcAttr.UseCgroupFD`/`CgroupFD` (`go1.27.1:src/syscall/exec_linux.go:107-108`, since 1.20). On Windows only a job object reaches it. Neither is adopted: user processes rarely own a delegated cgroup, and job objects are open question 1.
   - **The double coincidence.** A signal can be misdirected only if the group is already empty and the kernel hands the freed number to a new process that itself becomes a group leader before the sweep runs. This cannot be forced without controlling `pid_max`, so it was not run ([pgs] §Verification "Not run"). There is no group-scoped pidfd in Linux or Go 1.27.1 (`go1.27.1:src/os/pidfd_linux.go:88-92`), so the fleet accepts this residue, as `_process.py:803` does (CWE-367).
   - **The `Pdeathsig` thread-retirement footgun** ([golang/go#27505](https://github.com/golang/go/issues/27505)) is documented, not reproduced. GO-IO-21 adopts go-runc's `LockOSThread` mitigation, and that is why GO-IO-21 is a SHOULD.

### Conflicts resolved

1. **`os.Root` or `IsLocal` as the confinement MUST.** [fa] allowed `IsLocal` alone for symlink-free formats and asked for the choice by `go` line. Every fleet floor is ≥ 1.26 (Q1), and G305 fires on any `IsLocal`-guarded Join ([c]). So `os.Root` is the MUST everywhere and `IsLocal` is only the early reject.
2. **How to pin the archive `GODEBUG` settings.** [fa] said "via `//go:debug` in main or env", which is impossible for a library ([c]: `go vet` rejects it). Binaries pin in a `go.mod` `godebug` block, verified by `go list`; libraries reject names themselves.
3. **Permission thresholds.** [fa] set the finding line at 0755/0644 but left gosec's defaults unknown. Measured, the defaults are 0750/0600 and flag conventional modes, so the fleet pins 0755/0644.
4. **G204 as the secrets-in-argv check.** [sp] rule 10 cited it. Measured, G204 fires on any argv that is not a constant, so a grep replaces it and G204 is suppressed once at the SDK's single spawn point.
5. **Precedent for group kill and job objects.** [sp] claimed "zero corpus hits for Setpgid/group-kill or job objects". Measured: 11 `Setpgid` sites in 8 repos, all OS-constrained, and a containerd job-object twin.
6. **The kill ladder.** [sp] described a hand-built SIGTERM→SIGKILL grace like Python's `KILL_GRACE`. `WaitDelay` already is that grace (exec.go:289-314, [c] ladder). Its escalation is leader-only, so a post-Wait group sweep is added ([c] sweep).
7. **SIGTERM on Windows.** [sp]'s MUST example `Cancel = Signal(SIGTERM)` fails on Windows with `EWINDOWS`, so `Cancel` is build-tagged and Windows keeps `Kill`.
8. **renameio.** [fa] rated it a SHOULD. The SDK is stdlib-only (Q2), the corpus has 0 imports, and it exports nothing on Windows, so there is one internal helper and renameio is not recommended.
9. **gofrs/flock or hand-rolled locks for the SDK.** A stdlib-only SDK cannot reach `LockFileEx`, and ocx owns locking, so the SDK takes no locks.
10. **Who owns `noctx`.** It appears both in context-contract rule 7 and in [sp] rule 1. GO-IO owns the exec half, GO-NET the http half, and GO-CONC cites both.
11. **Where `execwait=2` belongs.** It goes in GO-TEST-12's CI leak check and a `go-diagnose` step, and never becomes a GO-IO runtime rule, because it panics the whole program ([sp] §8).
12. **The 9/92 extraction-guard rate** ([run] §6). The re-read found 4 of 5 guarded ([fa]), so no exemplar is cited as a proven zip-slip.
13. **GO-IO-06's `//go:build unix` gate for `Pdeathsig`.** GO-IO-06 listed `Pdeathsig` with the other Unix-only attributes and allowed a `unix` gate. [pgs] §5 shows the field exists only for `linux || freebsd`. [r] `unixgate/`: a `//go:build unix` file setting `Pdeathsig` fails `GOOS=darwin go vet`, exit 1. GO-IO-06 now requires a `linux` constraint for `Pdeathsig` (wave 3).
14. **The `Pdeathsig` grep fallback** (`… | xargs -r grep -L -e 'go:build'`), which [pgs] item 4 proposed and the first wave-3 edit put into GO-IO-14. [r] watched it fail in both directions. It printed nothing for the `//go:build unix` violation, and it flagged the compliant `_linux.go` twin, exit 123. It is removed, and `GOOS=darwin go vet` is the only check.
15. **Where `Pdeathsig` lives.** The first wave-3 edit folded it into GO-IO-14 as a SHOULD next to that rule's MUST sweep. It is split out as GO-IO-21. That keeps GO-IO-14's original meaning (the sweep, MUST) and gives the SHOULD its own ID and verification.
16. **`Pdeathsig` precedent.** The first pass of [pgs] reported that no exemplar sets it. An unfiltered re-grep found 10 files, including `containerd@934434dde54b:pkg/sys/unshare_linux.go:188` and go-runc's `LockOSThread` pairing. The claim with no precedent is narrower: `Pdeathsig` combined with a post-Wait sweep.
17. **`linux || freebsd` or `linux` for `Pdeathsig`.** The stdlib has the field on both. GO-IO-21 binds linux only, because no fleet target or exemplar uses freebsd and go-runc gates the field to `linux`. A `linux || freebsd` gate still satisfies GO-IO-06.
18. **The sweep's `ESRCH`.** The rule used to say "ignore `ESRCH`". It now says "treat `ESRCH` as success", which is kill(2)'s documented reply for an empty group ([pgs] item 1). "Ignore" also invited a retry loop.

## The ruleset

Severity follows the house tiers ([cfg] §1.6): MUST blocks, SHOULD is fixed unless there is a stated reason, CONSIDER is advisory. "Floor" is the lowest `go` line the rule assumes. Every fleet module is ≥ 1.26.0 (Q1), so every floor below is met by construction. Floors are stated for foreign repos. `grep` commands take a directory operand `DIR`: run them with the package or repo root in place of `DIR`, or with `.` from the root.

### GO-IO — caught by golangci-lint (pinned 2.14.0, fleet config)

**GO-IO-01 — Start every child with `exec.CommandContext`; never call `exec.Command`.**
- **Binds:** all code kinds, test helpers included.
- **Rationale:** a child with no context has no deadline and no cancel path. 443 `Command` calls against 141 `CommandContext` in the corpus ([run] §6).
- **Verify:** golangci-lint `noctx` is not in `standard`, so the config needs `enable: [noctx]`. Without golangci, the fallback is `grep -rn --include='*.go' -e 'exec\.Command(' DIR`.
- **Watched red:** yes, in two places.
  - [sp] Verification runs #4/#5: `golangci-lint run --default=none --enable-only=gosec,noctx ./...` gives `12 issues … noctx: 3`, exit 1, against `0 issues.`, exit 0, on `gosec-noctx-twin/`.
  - Reproduced by go-concurrency/context-contract rule 7, fixture `g-exectx/`.
- **Severity:** MUST.
- **Floor:** 1.7.
- **Ownership:** GO-IO owns the `os/exec` half of `noctx`; GO-NET owns the `net/http` half, and GO-CONC cites both (conflict 10).

**GO-IO-02 — Open every file name the program did not choose through `os.Root`/`os.OpenInRoot`.**
- **Binds:** library, SDK, CLI.
- **Which names:** archive entries, and tag-, digest-, ref- or URL-derived names.
- **For archive entries:**
  1. First reject `!filepath.IsLocal(name)` with an error.
  2. Always check the reader's error. `zip.NewReader` returns a populated `.File` alongside `ErrInsecurePath` ([fa] §6).
  3. Pass the entry name straight to `root.OpenFile`/`MkdirAll`/`Symlink`, never through `filepath.Join(dest, name)`.
- **Rationale:** `filepath.Join` rejects nothing. `IsLocal` is lexical-only: a symlink entry followed by `link/x` escapes an `IsLocal`-guarded extractor. `os.Root` rejects both forms with `path escapes from parent` ([fa] §4–5, fixture `extract`). CVE-2025-3445 is this bug class in 2025.
- **Verify:** for archives, the gosec **G305** rule. It is on in the fleet gosec config (only G104 and G115 are excluded). For other untrusted names, a reading heuristic: `grep -rn --include='*.go' -e 'filepath\.Join(' DIR` in packages that take external names, where no `os.Root` appears in the same function.
- **Watched red:** yes, in three runs.
  - [c] `gosec-io/`: `golangci-lint run --default=none --enable-only=gosec ./bad/...` gives `bad/x.go:20:8: G305: File traversal when extracting zip/tar archive`, exit 1. The `os.Root` twin `./good/...` has no G305; its one remaining issue is G204, see rule 13.
  - [c] `g305/`: G305 also fires on an `IsLocal`-guarded `filepath.Join(dest, hdr.Name)`, exit 1. It is not guard-aware, so the compliant form avoids the Join.
  - [fa] `extract`: the behavioural proof for naive, `islocal` and `root`.
- **Severity:** MUST.
- **Floor:** 1.24 for `os.Root`, 1.25 for the full method set.

**GO-IO-03 — Bound every decompression of external data before copying.**
- **How:**
  - Use `io.Copy(dst, io.LimitReader(r, max+1))`, then treat `n > max` as an error.
  - Check the declared size (`UncompressedSize64`, `hdr.Size`) against the cap first.
  - Cap the entry count.
- **Binds:** all code kinds.
- **Rationale:** a 51,969-byte zip expands to 52,428,800 bytes with `err == nil` ([fa] §7). syncthing layers all three bounds (`syncthing/syncthing@94c3c1cdef71:lib/upgrade/upgrade_supported.go:245-291`).
- **Verify:** the gosec **G110** rule.
- **Watched red:** yes.
  - [c] `gosec-io/bad`: `G110: Potential DoS vulnerability via decompression bomb` at `bad/x.go:33:12`, exit 1. The `LimitReader` twin has no G110.
  - [fa] `zip-bomb`: unbounded exits 0 at 50 MiB; bounded exits 1 at the 8 MiB cap.
- **Severity:** MUST.

**GO-IO-04 — Never request world-writable modes (`0o777`, `0o666`).**
- **Defaults:** directories 0o755, files 0o644. Secrets (tokens, credentials, private keys) get 0o600.
- **Config:** the fleet gosec config pins the thresholds:

  ```yaml
  linters:
    settings:
      gosec:
        config: { G301: "0755", G302: "0644", G306: "0644" }
  ```
- **Binds:** all code kinds.
- **Rationale:** the literal is a request that the umask filters; the call site owns neither the umask nor where it runs ([fa] §8, `umask-perms`: 0o777 becomes 755 under umask 022 and 700 under 077). gosec's shipped defaults (0750/0600) flag the conventional modes. The corpus has 100 `MkdirAll(…, 0755)` calls and 335 `644` literals ([run] §6), so the defaults would breach the ≤1 FP/10k LOC bar that a MUST-backing linter must meet (map conflict 2).
- **Verify:** gosec G301/G302/G306 with the thresholds above. For secrets, a reading heuristic: a secret-bearing write whose mode is not 0o600.
- **Watched red:** yes, [c] `gosec-perms/`.
  - `golangci-lint run --no-config --default=none --enable-only=gosec ./...` reports 4 issues, exit 1. That includes `G301: Expect directory permissions to be 0750 or less` on the conventional `0o755`: the noise.
  - With the fleet config, `golangci-lint run ./...` reports 2 issues, exit 1: only `0o777` (G301) and `0o666` (G306).
  - `gosec-io/good` (0o750/0o600) has none.
- **Severity:** MUST.
- **Conflict:** the gosec thresholds settle [fa]'s open "default thresholds unknown" (conflict 3).

### GO-IO — caught by the `go` command

**GO-IO-05 — Any binary that parses tar or zip pins strict archive paths in `go.mod`.**
- **The pin:**

  ```
  godebug (
  	tarinsecurepath=0
  	zipinsecurepath=0
  )
  ```

  `//go:debug` lines in `package main` are equivalent.
- **Also:** never set `execerrdot=0`.
- **Binds:** CLI and service main modules. Libraries and the SDK cannot pin: `go vet` reports `//go:debug directive only valid in package main or test` ([c]). They rely on GO-IO-02's `IsLocal` reject.
- **Rationale:** both settings default to permissive in 1.27.1. `tar.Next` returns a `../` header with no error ([fa] §6, `go1.27.1:src/archive/tar/reader.go:44-57`). `execerrdot=0` re-enables the current-directory binary hijack that Go 1.19 closed ([sp] §3).
- **Verify:** run `go list -f '{{.DefaultGODEBUG}}' ./cmd/...` or the main package path. The output must contain `tarinsecurepath=0,zipinsecurepath=0` and must not contain `execerrdot=0`.
- **Watched red:** yes, [c] `godebug-pin/` and `godebug-gomod/`.
  - `./bad` (no pin) prints an empty line.
  - `./good` (`//go:debug`) prints `tarinsecurepath=0,zipinsecurepath=0`.
  - The `go.mod` `godebug` block prints the same.
  - `go vet ./lib` on a library carrying `//go:debug` exits 1.
- **Severity:** MUST.
- **Floor:** 1.21 for `//go:debug`, 1.23 for the `go.mod` `godebug` block.

**GO-IO-06 — Put OS-specific process attributes in files constrained to the OSes that declare them.**
- **Which, and where:**
  - `SysProcAttr.Setpgid`, `Pgid` and `syscall.Kill(-pid, …)`: a `//go:build unix` file, or a `_unix.go`/`_linux.go` file.
  - `SysProcAttr.Pdeathsig`: a `//go:build linux` file or a `_linux.go` file. `linux || freebsd` is also allowed. **Never use a `unix` gate:** darwin, openbsd, netbsd, dragonfly, aix and solaris have no such field ([pgs] §5; corrected in wave 3, conflict 13).
  - Put the Windows counterpart in `_windows.go`.
- **Binds:** all code kinds. Windows is first-class (Q6).
- **Rationale:** `Setpgid` does not exist in Windows' `SysProcAttr`, and `Pdeathsig` does not exist outside `linux || freebsd`, so a gate that is too wide breaks those builds. Copying the `Setpgid` gate onto `Pdeathsig` is the likely agent mistake.
- **Verify:** `GOOS=windows go vet ./...` and `GOOS=darwin go vet ./...` in CI, beside the native leg. The darwin leg is the only check for `Pdeathsig`. The `grep -L 'go:build'` fallback is not admissible (conflict 14).
- **Watched red:** yes, in three runs.
  - [c] `procgroup/`: `GOOS=windows go vet ./bad/` exits 1 with `unknown field Setpgid in struct literal of type syscall.SysProcAttr`. `./good/` exits 0 for linux, windows and darwin.
  - [pgs] `darwinvet/`: an unconstrained `Pdeathsig` fails `GOOS=darwin go vet ./bad/...`, exit 1. The `linux || freebsd` twin exits 0.
  - [r] `unixgate/`: `GOOS=darwin run.sh go vet ./unixgate/bad/...` exits 1 with `vet: unixgate/bad/spawn_unix.go:13:56: unknown field Pdeathsig in struct literal of type syscall.SysProcAttr`, on the `//go:build unix` violation. The filename-only `_linux.go` twin exits 0 for darwin and freebsd, and `GOOS=linux go vet ./unixgate/...` exits 0.
- **Exemplars:** all 11 non-test `Setpgid` sites in the corpus comply ([c], 8 repos).
- **Severity:** MUST.

### GO-IO — caught by a grep (directory operand; empty output = pass)

**GO-IO-07 — Set a nonzero `Cmd.WaitDelay` on every `exec.Cmd`.**
- **Value:** the SDK uses its kill grace, 5 s, mirroring `KILL_GRACE = 5.0` at `ocx-sdk-python/src/ocx_sdk/_process.py:68-69`.
- **Binds:** all code kinds.
- **Rationale:** a canceled or exited child whose descendant holds a pipe open blocks `Wait` forever. `WaitDelay` also bounds the time between a graceful `Cancel` and `Kill`. It is set at only 8 of 584 exec sites in the corpus ([run] §6).
- **Verify:**

  ```
  grep -rl --include='*.go' -e 'exec\.CommandContext(' -e 'exec\.Command(' DIR | xargs -r grep -L -e '\.WaitDelay'
  ```

  This is file-granular: a hit is a finding to read.
- **Watched red:** yes.
  - [c] `waitdelay/`: `bad/` prints `bad/run.go`; `good/` prints nothing.
  - [sp] #1 behavioural: `WaitDelay==0` is still blocked at 800 ms; `WaitDelay=300ms` returns `exec.ErrWaitDelay`.
  - [c] ladder test: `TestLadder_TermIgnored_KilledAfterWaitDelay` shows `elapsed=400ms err=signal: killed` against `TestLadder_NoWaitDelay_StillBlocked`, which is still blocked at 1.5 s.
- **Severity:** MUST.
- **Floor:** 1.20.

**GO-IO-08 — Pass argv directly; never run `sh -c`, `bash -c` or `cmd /c` with a composed string.**
- **Binds:** all code kinds.
- **Rationale:** a shell reintroduces word-splitting, globbing and injection, which `os/exec` avoids by design ([pkg.go.dev/os/exec](https://pkg.go.dev/os/exec)). No linter catches a literal shell-out: gosec, noctx and staticcheck SA1005 all stay silent ([sp] §12). SA1005 skips any `argv[0]` containing `/` (`dominikh/go-tools@6cb65e58a558:staticcheck/sa1005/sa1005.go:58`).
- **Verify:**

  ```
  grep -rl --include='*.go' -e 'exec\.Command("/bin/sh"' -e 'exec\.Command("sh"' -e 'exec\.CommandContext([^,]*, "/bin/sh"' -e 'exec\.CommandContext([^,]*, "sh"' -e '"bash", "-c"' -e '"cmd", "/c"' DIR | xargs -r -n1 echo
  ```
- **Watched red:** yes, [sp] #4. `shellout-check/` prints `violation.go`; `shellout-check-twin/` is empty. The same run showed staticcheck exiting 0 on the violation.
- **Severity:** MUST.

**GO-IO-09 — Pass secrets to a child on stdin or in env; never in argv.**
- **How:** use a `--password-stdin`-style flag, with `cmd.Stdin` set.
- **Binds:** all code kinds, test helpers included.
- **Rationale:** any co-resident user can read argv through `ps` and `/proc/<pid>/cmdline`.
- **Verify:**

  ```
  grep -rnE --include='*.go' 'exec\.Command(Context)?\(.*"(-p|--password|--token|--secret|--api-key)"' DIR
  ```

  gosec G204 is **not** this check (conflict 4).
- **Watched red:** yes, [c] `gosec-io/`. `bad/` prints `x.go:45: … "-p", password`, exit 0 with a match. `good/` (stdin) prints nothing, exit 1.
- **Severity:** MUST.

**GO-IO-10 — Decide "timed out or canceled" from `ctx.Err()`/`context.Cause(ctx)` after `Wait`, never from `errors.Is(waitErr, context.DeadlineExceeded)`.**
- **Binds:** the SDK and CLIs.
- **Rationale:** a child killed by `Cancel` reports `*exec.ExitError` ("signal: terminated"). The context error surfaces only when the child exits 0 after `Cancel` (`go1.27.1:src/os/exec/exec.go:272-279,944-957`). The SDK maps the timeout to its separate non-`ExitError` timeout type (go-errors/wrapping-and-classification). Exit-status mapping of a signalled child is owned by GO-CLI (128+N; exit-codes-and-signals rule 6).
- **Verify:**

  ```
  grep -rl --include='*.go' 'os/exec' DIR | xargs -r grep -nE 'errors\.Is\([^)]*context\.(DeadlineExceeded|Canceled)'
  ```
- **Watched red:** yes.
  - [c] `ctxclass/`: `bad/` prints `16: if errors.Is(err, context.DeadlineExceeded)`; `good/` prints nothing.
  - [sp] `TestClassify_*` shows the two branches behaviourally.
- **Severity:** MUST.

**GO-IO-11 — Write crash-surviving state only through the atomic-write shape; never call `os.WriteFile`/`os.Create` on the final path.**
- **What counts as state:** config, index, lock metadata, cache entries and store blobs.
- **The shape:**
  1. `os.CreateTemp(filepath.Dir(target), pattern)`.
  2. Write.
  3. `Sync`.
  4. A checked `Close`.
  5. `os.Rename`.
  6. Open the directory and `Sync` it. This step is Unix-only: directory sync is not meaningful on Windows.
- **Binds:** the SDK and CLIs. Disposable output such as logs and reports is exempt.
- **Rationale:** `os.WriteFile` truncates at `open` time. A kill mid-write leaves a truncated file, where the atomic twin leaves the old bytes intact ([fa] §1, `crash-write`). A temp file in `os.TempDir()` fails `Rename` across filesystems (`oras-project/oras-go@cb6d6dc79f83:content/file/file.go:713-714`). An orphaned `*.tmp` is the only crash residue; a store sweeps these on open.
- **Verify:** a reading heuristic. `grep -rn --include='*.go' -e 'os\.WriteFile(' -e 'os\.Create(' DIR` lists candidates; classify each target as state or disposable. No analyzer can tell the two apart ([fa] §1).
- **Watched red:** yes, behaviourally: [fa] `crash-write` under SIGKILL shows `after (naive): AAAA…` against `after (atomic): OLD-CONTENT-V1`.
- **Severity:** MUST. The static half can only be a heuristic, because state versus disposable is a judgement about the target.

**GO-IO-12 — Remove the temp file only if the rename did not happen.**
- **How:** set a `renamed` flag after `Rename`, and have the deferred closure check it. Never write `defer os.Remove(tmp.Name())` in a function that renames.
- **Binds:** all code kinds.
- **Rationale:** after `Rename` the temp path is free. The unconditional defer deletes whatever reoccupies that path ([fa] §2, `defer-remove`). It is also the placement an agent writes by reflex, next to `CreateTemp`.
- **Verify:**

  ```
  grep -rl --include='*.go' 'defer os\.Remove(' DIR | xargs -r grep -l 'os\.Rename('
  ```
- **Watched red:** yes.
  - [c] `deferremove/`: `bad/` prints `bad/w.go`; `good/` prints nothing.
  - [fa] `defer-remove`, behavioural: the collision victim is deleted in buggy mode and survives in safe mode.
- **Severity:** MUST.

**GO-IO-13 — Spawn from exactly one internal function in the SDK.**
- **Where:** one function in one file, for example `internal/process.Run`. It applies GO-IO-01, -07, -08, -14, -20 and -21 once, and carries the package's only `//nolint:gosec // G204: argv is the wrapped CLI's contract`.
- **Binds:** the SDK. For CLIs this is a CONSIDER.
- **Rationale:** G204 fires on every call whose argv is not a constant ([c] `gosec-io/good`: `G204: Subprocess launched with variable` on a stdin-only call). With one spawn point, the suppression and the policy each live in one place. This mirrors `ocx-sdk-python`'s single `_process.py` ([sp] §Exemplar evidence).
- **Verify:** this must print `1`:

  ```
  grep -rl --include='*.go' --exclude='*_test.go' -e 'exec\.Command(' -e 'exec\.CommandContext(' DIR | wc -l
  ```
- **Watched red:** yes, [c]. `gosec-io/` prints `2`; `procgroup/good/` prints `1`.
- **Severity:** SHOULD.

### GO-IO — behavioural fixture or reading heuristic

**GO-IO-14 — Tear down the child's process group when the child can spawn descendants.**
- **Unix:**
  - Set `Setpgid: true`, and capture `pgid := cmd.Process.Pid` once, right after `Start`. The graceful `Cancel` and the sweep both use that value; never re-read or re-resolve it ([pgs] item 6).
  - Use a custom `Cancel` that checks `cmd.ProcessState == nil` (pid-reuse guard, CWE-367) and then calls `syscall.Kill(-pgid, SIGTERM)`.
  - `WaitDelay` is the grace period.
  - After `Wait` returns on a canceled context, send `syscall.Kill(-pgid, SIGKILL)` as the next statement. **Treat `ESRCH` as success**: the group is already empty (wave 3, conflict 18). Make it a single call, with no sleep, retry or liveness probe between `Wait` and the sweep. Each extra step only widens the reuse window ([pgs] items 1-2).
- **Linux companion:** `Pdeathsig` is GO-IO-21, a SHOULD. It covers a failure mode that this rule cannot reach, and it replaces no part of this rule.
- **Windows:** keep the default `Kill`. See open question 1.
- **Binds:**
  - the SDK;
  - CLIs that wrap tools;
  - not one-shot probes such as `go env` and `sysctl`, which are exempt.
- **Rationale:**
  - `Process.Kill` reaches only the leader ([sp] §7).
  - `WaitDelay`'s escalation is also leader-only. The Linux pidfd path (1.23+) protects only that single leader; there is no group-scoped pidfd (`go1.27.1:src/os/pidfd_linux.go:88-92`, [pgs] item 8). A grandchild that ignores SIGTERM survives it and is reaped only by the sweep ([c] `TestSweep`).
  - `Process.Signal(SIGTERM)` fails on Windows with `EWINDOWS` (`go1.27.1:src/os/exec_windows.go:65-77`), so the graceful `Cancel` must be build-tagged (GO-IO-06).
  - **Reuse-safety of the sweep** ([pgs] §1-2). A pgid is the leader's original pid. The kernel keeps that number unallocatable for as long as any group member exists: the leader as an unreaped zombie, or a descendant, live or zombie. That holds even after `Cmd.Wait` has reaped the leader. So while a surviving descendant (the case the sweep exists for) is alive, the sweep cannot hit a stranger. `TestSweep_KillsSurvivingGrandchild` reads the grandchild's pid before sweeping and confirms that exact pid is dead afterward. If the group is already empty, kill(2) returns `ESRCH` ("the target process or process group does not exist", [man7 kill(2)](https://man7.org/linux/man-pages/man2/kill.2.html)). `TestSweep_EmptyGroup_ESRCH` confirms this. Sweeping before the reap would require reimplementing `os/exec`'s wait loop, and it would close no additional gap.
  - **What the sweep does not guarantee** (Verdict 9). It misses a descendant that left the group through `setsid`/`setpgid` ([r] `escape/`). It also cannot rule out the double coincidence, where a freed number is reused by a new group leader before the sweep runs. That was not run. The rule names both gaps and makes no claim about either. When describing the sweep, say which case applies: a live descendant (safe) or an empty group (`ESRCH`, or the double coincidence) ([pgs] item 5).
- **Verify:** a reading heuristic on the spawn function (GO-IO-13), backed by behavioural fixtures. Check four things:
  - `Setpgid` is set;
  - the pgid is captured once;
  - the sweep follows `Wait` with nothing in between;
  - `ESRCH` is mapped to nil.
- **Watched red:** yes, behaviourally, in six runs.
  - [sp] #7: `TestKillWithoutGroup_LeavesGrandchildAlive_Violation` against `…WithGroup_ReachesGrandchild_Twin`.
  - [c] `procgroup/good`, `go test -run Sweep -v`: `sweep=false grandchild=825747 alive=true` against `sweep=true … alive=false`, PASS.
  - [c] `go test -run Ladder -v`: PASS, as in GO-IO-07.
  - [pgs] `reuse/`, `run.sh go test ./reuse/... -run Sweep -v`, exit 0. `TestSweep_KillsSurvivingGrandchild` logs `sweep=Kill(-1364636, SIGKILL) reaped grandchild 1364637`. `TestSweep_EmptyGroup_ESRCH` logs `… on an empty group: no such process (expected)`.
  - [r] `escape/`, `run.sh go test ./escape/... -run Sweep -v -count=1`, exit 0. `setsid=false … alive=false` shows the sweep reaching an in-group grandchild. `setsid=true pgid=1739271 grandchild=1739272 alive=true` shows the documented gap: a session-escaped grandchild survives the same sweep.
  - [r] re-ran [pgs]'s recorded commands during this revision, `run.sh go test ./reuse/... ./pdeathsig/... -run 'Sweep|Pdeathsig' -v -count=1`, exit 0. Every [pgs] outcome reproduced. The only [pgs] check that did not hold is its `Pdeathsig` grep fallback (conflict 14).
- **Severity:** MUST, for the code kinds named. The static half is a heuristic, because whether a child can spawn descendants is a property of the wrapped tool, not of the code.
- **Floor:** 1.20 (`Cancel`).
- **Per-OS summary:**

  | OS | `Setpgid` and the group sweep (GO-IO-14) | `Pdeathsig` (GO-IO-21) |
  |---|---|---|
  | linux | MUST | SHOULD (paired with `LockOSThread`) |
  | freebsd | MUST | available in the stdlib, not adopted (no fleet target, no exemplar) |
  | darwin, openbsd, netbsd, dragonfly, aix, solaris | MUST | not available (no such field) |
  | windows | default `Kill` only (leader, no group); job object deferred, open question 1 | not available |

**GO-IO-15 — Capture output through `Cmd.Stdout`/`Cmd.Stderr` writers.**
- **Pipes:** use `StdoutPipe`/`StderrPipe` only when you stream, and then drain every pipe you took, concurrently.
- **Stderr:** bound the diagnostic stream with a prefix/suffix saver, as the stdlib does with `prefixSuffixSaver{N: 32<<10}` at `go1.27.1:src/os/exec/exec.go:1035-1037`.
- **Stdout:** never truncate a stdout payload such as the JSON envelope. Reject it with an error above a contract size.
- **Binds:** the SDK and CLIs.
- **Rationale:** reading one of two pipes deadlocks as soon as the other fills its OS buffer ([sp] §5: 1 MiB of stderr hangs). A truncated JSON document is corrupt, not partial ([sp] §6, `_process.py` §12).
- **Verify:** a reading heuristic. Every `StdoutPipe()`/`StderrPipe()` hit from `grep -rn --include='*.go' -e 'StdoutPipe()' -e 'StderrPipe()' DIR` needs its own reader goroutine.
- **Watched red:** yes, behaviourally. [sp] #3: `TestDrainOnlyStdout_Deadlocks_Violation` is blocked at 1 s; the twin completes with 1,048,576 bytes. The bounded writer's tests pass.
- **Severity:** SHOULD.

**GO-IO-16 — Reject Windows-reserved device names in any file name derived from external input, whatever `GOOS` the check runs on.**
- **The names:** `CON`, `PRN`, `AUX`, `NUL`, `COM1-9` and `LPT1-9`, case-insensitive, with or without an extension.
- **Binds:** the SDK and CLIs that write tag-, digest- or ref-derived paths (Q6).
- **Rationale:** `filepath.IsLocal`'s reserved-name check is compiled only into the Windows build (`internal/filepathlite/path_windows.go:93-130`). On a Linux CI runner `IsLocal("CON")` is `true` ([fa] §9).
- **Verify:** a table test of the name validator that includes `CON`, `nul` and `COM1.txt`, run on the Linux leg.
- **Watched red:** yes, [fa] `reserved-name`: `tag="CON" IsLocal=true … naive-verdict-from-IsLocal-alone=safe portable-verdict=UNSAFE`.
- **Severity:** MUST.

**GO-IO-17 — Retry the atomic rename on Windows, bounded.**
- **How:** 5–10 attempts with exponential backoff from about 1 ms. Retry only on `ERROR_ACCESS_DENIED` and `ERROR_SHARING_VIOLATION`; everything else is fatal. Use a `_windows.go` helper.
- **Binds:** the SDK and CLIs (Q6).
- **Rationale:** `MoveFileEx` fails transiently while a scanner or reader holds the target ([golang/go#22397](https://github.com/golang/go/issues/22397)). The Rust fleet does the same (`rename_replace`, [fa] §3).
- **Verify:** a reading heuristic now. Wave 3 plants a held-handle test on the `windows-latest` leg.
- **Watched red:** **no**, because there is no Windows runtime in the sandbox ([fa] §Verification runs, "Not run").
- **Severity:** SHOULD until that test runs.

**GO-IO-18 — Stage content-addressed blobs off the final path.**
- **How:**
  1. Write to a temp file in the store directory.
  2. Verify size, then digest.
  3. Only then rename into `blobs/<alg>/<hex>`.
  4. Treat "target already exists with this digest" as success for a concurrent ingest.
- **Binds:** CLIs and the SDK when they hold a store.
- **Rationale:** `oras-project/oras-go@cb6d6dc79f83:content/file/file.go:499-518` writes the final blob in place and removes it on verification failure. A crash in between leaves an unverified blob at a trusted path.
- **Verify:** a reading heuristic.
- **Watched red:** no.
- **Severity:** SHOULD.

**GO-IO-19 — Take cross-process file locks through a GOOS split; the SDK takes none.**
- **Unix:** `syscall.Flock(fd, LOCK_EX|LOCK_NB)`.
- **Windows:** `golang.org/x/sys/windows.LockFileEx(…, LOCKFILE_EXCLUSIVE_LOCK|LOCKFILE_FAIL_IMMEDIATELY, …)`.
- **Behind one API:** `TryLock`/`ErrLocked`. Read and write through the locked handle.
- **Alternative:** use `github.com/gofrs/flock` where a dependency is acceptable.
- **Binds:** CLIs. The SDK takes no locks.
- **Rationale:** there is no portable stdlib lock, and `syscall` has no `LockFileEx` ([c]: `grep LockFileEx $GOROOT/src/syscall/*windows*.go` is empty). The SDK is stdlib-only (Q2) and `ocx` owns its store locks. The pattern is hand-rolled in `cli/cli@9b031151a825:internal/flock/` and in etcd, controller-runtime, prometheus, golangci-lint, containerd and syncthing; none imports gofrs ([fa] §11, §Exemplar evidence).
- **Verify:** a reading heuristic.
- **Watched red:** no; two-process fixture not built ([fa] "Not run").
- **Severity:** SHOULD.

**GO-IO-20 — Build the SDK child's environment from an explicit allowlist.**
- **How:** use a `ComposedEnv`-shaped builder. Never leave `cmd.Env = nil` or `os.Environ()` for a child that is third-party or user-supplied.
- **Binds:** the SDK.
- **Rationale:** otherwise the child inherits credentials it was never meant to see. This mirrors ocx-sdk-python ([cfg] §3, [sp] §9).
- **Verify:** a reading heuristic on the spawn function.
- **Watched red:** no.
- **Severity:** SHOULD.

**GO-IO-21 — On Linux, give the direct child `Pdeathsig: SIGKILL`, and hold `runtime.LockOSThread()` from before `Start` until `Wait` returns (wave 3, new).**
- **How:**
  1. In a `_linux.go` file (GO-IO-06), a dedicated goroutine calls `runtime.LockOSThread()` and `defer runtime.UnlockOSThread()`.
  2. It then calls `cmd.Start()` and `cmd.Wait()` in that same goroutine. This is go-runc's `ProcessMonitor.StartLocked` shape.
  3. Set it next to GO-IO-14's `Setpgid`, with a one-line comment naming the failure mode it covers.
- **Never:**
  - Use it as a substitute for GO-IO-14's sweep, or the sweep as a substitute for it. They cover disjoint failure modes.
  - Use it in a program that cannot spare an unlocked OS thread (`GOMAXPROCS=1` with no headroom). It can hang there.
  - Combine it with a setuid/setgid child. The credential change clears it ([golang/go#9686](https://github.com/golang/go/issues/9686)).
- **Binds:** the SDK, and CLIs that wrap tools, on linux. It does not bind freebsd, which has the field but no fleet target (conflict 17), and one-shot probes are exempt.
- **Rationale:**
  - When the SDK's own process is SIGKILLed or OOM-killed, no Go code runs, so GO-IO-14's sweep cannot happen. Only the kernel-side parent-death signal reaches the child ([pgs] §3-4c).
  - The signal fires when the *creating thread* dies, not when the process dies (`go1.27.1:src/syscall/exec_linux.go:92-95`, [golang/go#27505](https://github.com/golang/go/issues/27505)). If the runtime retires that OS thread while the process is healthy, the child gets a spurious kill. `LockOSThread` pins the thread identity. `containerd/containerd@934434dde54b:vendor/github.com/containerd/go-runc/monitor.go:79-90` does exactly this, and `runc.go:83-90` cites #27505 and the `GOMAXPROCS=1` caveat.
  - The setting is cleared for a grandchild on `fork(2)` ([man7 PR_SET_PDEATHSIG](https://man7.org/linux/man-pages/man2/PR_SET_PDEATHSIG.2const.html)). So it protects only the direct child. The rest of the tree still depends on the group sweep while the SDK is alive.
- **Verify:**
  - The OS constraint is mechanical: `GOOS=darwin go vet ./...` (GO-IO-06).
  - The pairing is a reading heuristic: a `Pdeathsig` site needs a `LockOSThread`/`UnlockOSThread` pair around `Start`-through-`Wait` in the same goroutine. `grep -rl --include='*.go' -e 'Pdeathsig' DIR | xargs -r grep -L -e 'LockOSThread'` lists candidates to read. It is file-granular and matches camelCase substrings: [pgs] recorded a false positive on a local variable named `usePdeathsig`. So it never backs a MUST.
- **Watched red:** partly.
  - The crash case is behavioural. [pgs] `pdeathsig/` and the [r] re-run give `usePdeathsig=true … alive=false` against `usePdeathsig=false … alive=true`, both PASS, exit 0. The parent under test holds the `LockOSThread` pairing.
  - The constraint went red in [pgs] `darwinvet/` and [r] `unixgate/` (GO-IO-06).
  - The #27505 footgun was **not** reproduced. That needs the runtime to retire a specific OS thread (Verdict 9).
- **Severity:** SHOULD. It is not a MUST because the footgun it guards against was not reproduced, and because the pairing has a `GOMAXPROCS=1` hang cost.
- **Floor:** any supported Go. The field predates the fleet floor, and the #27505 doc note is in 1.27.1.

**MUST count: 14** (GO-IO-01 to 12, 14 and 16). Wave 3 added GO-IO-21 as a SHOULD, so the count is unchanged.

## Applied to the exemplars and the future consumers

| Rule | Satisfied by (strict exemplars) | Violated by | Consumer commitment |
|---|---|---|---|
| 01 | `goreleaser/goreleaser@ff8de3d6c389:internal/exec/exec.go:99`; `containerd/containerd@934434dde54b:pkg/imageverifier/bindir/processes_unix.go` | 443 `exec.Command` calls corpus-wide ([run] §6), e.g. `golang/tools@d2d3de9f066e:internal/gocommand/invoke.go:248` (handles ctx by hand) and `aquasecurity/trivy@ae561f8cca36:pkg/fanal/test/integration/docker/docker.go:63` | SDK and CLIs: `noctx` in the pinned config |
| 07 | `golang/tools@d2d3de9f066e:internal/gocommand/invoke.go:258` (30 s, citing go.dev/issue/59541); `goreleaser@ff8de3d6c389:internal/exec/exec.go:100` | 576 of 584 exec sites set none ([run] §6); no WaitDelay in [sp]'s 20-site sample | SDK: `WaitDelay = KillGrace` (5 s) at the one spawn point |
| 06, 14 | `containerd@934434dde54b:pkg/imageverifier/bindir/processes_unix.go:38-44` (Setpgid plus a group-kill `Cancel`) with a job-object twin in `processes_windows.go:43-92`; `cli/cli@9b031151a825:.github/skills/cli-exercise/tool/internal/cliutil/process_unix.go:28-40`; all 11 `Setpgid` sites OS-constrained ([c]) | none for 06. For 14, containerd's group kill is SIGKILL with no graceful phase, which is acceptable for a verifier binary. No exemplar has a post-Wait sweep ([pgs] §Exemplar evidence) | SDK: a build-tagged SIGTERM group `Cancel` plus a post-Wait sweep, with `ESRCH` treated as success |
| 21 | `containerd@934434dde54b:vendor/github.com/containerd/go-runc/monitor.go:79-90` (`LockOSThread` across `Start`-through-`Wait`, citing #27505 in `runc.go:83-90`; field set at `command_linux.go:44`, `linux`-gated); `containerd@934434dde54b:pkg/sys/unshare_linux.go:188` and `core/mount/mount_idmapped_utils_linux.go:47` | three containerd integration helpers set a bare `Pdeathsig` with no `LockOSThread` (`integration/issue7496_linux_test.go:128` and two others, [pgs]); that is acceptable for short-lived test code, and it is failure mode 18 if copied into the SDK | SDK: `Pdeathsig`+`LockOSThread` on linux, in go-runc's shape. No exemplar combines it with a group sweep |
| 08 | direct argv is the norm; 5 `sh -c` sites corpus-wide ([run] §6) | — | grep in CI |
| 09 | — | `aquasecurity/trivy@ae561f8cca36:pkg/fanal/test/integration/docker/docker.go:63` (`docker login -p <password>`) | SDK: an `Input` parameter written to stdin and redacted from logs, mirroring `_process.py:236-239` |
| 02, 05 | `aquasecurity/trivy@ae561f8cca36:pkg/x/os/root.go:12-42` (`os.Root` wrapper with a documented TOCTOU note); `containerd@934434dde54b:pkg/archive/tar.go:264-273` (`fs.RootPath`); `syncthing@94c3c1cdef71:lib/upgrade/upgrade_supported.go:342` and `tailscale@6b3a45f14ef6:clientupdate/clientupdate.go:1053-1108` (basename allowlist to fixed destinations) | none proven. [run]'s "9/92 guarded" is a lower bound: 4 of 5 re-read "unguarded" sites were guarded by delegation or an allowlist ([fa] §Exemplar evidence). No exemplar pins `tarinsecurepath` | CLIs: a `go.mod` `godebug` block; SDK: `IsLocal` plus `os.Root` |
| 04 | 100 `MkdirAll(…, 0755)` calls | `bazel-contrib/rules_go@970e99d77c8b:go/tools/builders/go_path.go:153` (`os.MkdirAll(out, 0777)`); 64 such sites ([run] §6) | fleet gosec thresholds 0755/0644 |
| 11, 12, 18 | `CreateTemp` 105 ≈ `Rename` 101 ([run] §6); tailscale stages `.new` files and renames only "after everything extracted correctly" | `os.WriteFile` 388 sites; `bazel-contrib/rules_go@970e99d77c8b:go/tools/builders/protoc.go:197` (`ioutil.WriteFile`); `oras-project/oras-go@cb6d6dc79f83:content/file/file.go:499-518` (in-place blob) and `:713-714` (`CreateTemp("", …)`) | one internal `atomicfile` helper in the SDK and each CLI; `renameio` 0 in the corpus and not adopted |
| 19 | `cli/cli@9b031151a825:internal/flock/` plus etcd, controller-runtime, prometheus, golangci-lint, containerd and syncthing hand-rolling the same split ([fa] §Exemplar evidence) | — | CLIs only |

New commitments with no exemplar precedent:
- the post-Wait group sweep (GO-IO-14);
- combining `Pdeathsig` with the sweep (GO-IO-21 with GO-IO-14). Each of `Pdeathsig` and its `LockOSThread` mitigation has precedent in containerd/go-runc;
- the GO-IO-05 pin;
- the gosec permission thresholds (GO-IO-04);
- the single spawn point (GO-IO-13).

## AI-agent failure modes

Ranked by how often each bites. The first two use the corpus base rate: an agent reproduces what it was trained on.

1. **Writes `exec.Command` because most training data does.** The corpus has 76% `exec.Command` ([run] §6). Check: `noctx` (GO-IO-01).
2. **Believes `CommandContext` bounds `Wait`, and omits `WaitDelay`.** 576 of 584 sites have none. Check: the GO-IO-07 grep.
3. **Uses `os.WriteFile` for state.** It is the shortest idiom, with 388 sites against 105 temp-then-rename. Check: the GO-IO-11 grep, read by a reviewer.
4. **Writes `defer os.Remove(tmp.Name())` right after `CreateTemp`**, mirroring the `defer f.Close()` reflex. Check: the GO-IO-12 grep.
5. **Joins `filepath.Join(dest, entry.Name)` and trusts `filepath.Clean` or `IsLocal` as the guard.** Check: gosec G305 (GO-IO-02); it also fires on the `IsLocal`-guarded form.
6. **Expects `errors.Is(err, context.DeadlineExceeded)` after a cancelled `Wait`.** It is the pattern that works for HTTP and SQL. Check: the GO-IO-10 grep.
7. **Unbounded `io.Copy` from a `zip.File`/`gzip.Reader`.** Check: gosec G110 (GO-IO-03).
8. **Assumes `archive/tar` and `archive/zip` are secure by default**, and discards the error from `zip.NewReader`. Check: `go list -f '{{.DefaultGODEBUG}}'` (GO-IO-05); the discarded error is a reading check (errcheck ignores `_` by default).
9. **Puts `Setpgid: true` in an unconstrained file**, copied from a Unix snippet. Check: `GOOS=windows go vet ./...` (GO-IO-06).
10. **Writes `sh -c` from Python `shell=True` habit.** It survives every linter. Check: the GO-IO-08 grep.
11. **Adds `StderrPipe()` later without a second reader.** Check: the GO-IO-15 grep.
12. **Cites gosec G204 as the secrets check, or G307 by its retired meaning** ([fa] §8; RULES.md, not README). Check: cite GO-IO-09's grep; G307 backs no rule here.
13. **Hallucinates a stdlib `os.Lock`.** Check: the GO-IO-19 reading.
14. **Sets `GODEBUG=execerrdot=0` to "fix" `exec: … resolves to executable in current directory`.** Check: the GO-IO-05 `go list`.
15. **Trusts `IsLocal("CON")` on a Linux runner.** Check: the GO-IO-16 table test.
16. **Gates `Pdeathsig` with `//go:build unix`**, copying the `Setpgid` gate. It compiles on linux and breaks darwin and every BSD, AIX and Solaris build. Check: `GOOS=darwin go vet ./...` (GO-IO-06; [r] `unixgate/`). Do not use a `grep -L go:build` check: it passes this exact mistake (conflict 14).
17. **Reasons about the post-`Wait` group sweep as if `kill(-pgid, SIGKILL)` on a freed pgid definitely hits nothing, or definitely could hit a live stranger.** Both overstate it. Check: read GO-IO-14's reuse-safety paragraph before changing where the sweep sits relative to `Wait`.
18. **Copies the bare `Pdeathsig` field without the `runtime.LockOSThread()` pairing** (`go-runc/monitor.go:79-90`, #27505). It compiles and passes every test that does not force thread retirement, [pgs]'s own fixture included. Check: the GO-IO-21 reading heuristic.
19. **Retries the sweep, sleeps before it, or logs `ESRCH` as a failure**, the way it would handle a network call. Every delay widens the reuse window. Check: the GO-IO-14 reading heuristic: one call, the next statement after `Wait`, with `ESRCH` mapped to nil.
20. **Treats `Pdeathsig` and the sweep as interchangeable, or claims the sweep kills "the whole tree".** They cover disjoint failure modes. A `setsid` descendant escapes both, because `Pdeathsig` is cleared on fork ([r] `escape/`). Check: the spawn function names each mechanism's failure mode in a comment (GO-IO-14, GO-IO-21, Verdict 9).

## Open questions

**Owner decisions** (the program applies the default until told otherwise):
1. **Windows process-tree kill in SDK v0.1.** Default: no job object. The SDK documents the gap as `ocx-sdk-python` does (`_process.py:479-481,721-724`), and `WaitDelay` still bounds `Wait`. containerd's `processes_windows.go:43-92` is the reference when this is taken up. It tensions with Q6 ("Windows first-class"), which named rename retry and reserved names but not tree kill.
2. **gosec permission thresholds** in the shared fleet config. Default: `G301: "0755"`, `G302: "0644"`, `G306: "0644"`. The gates consolidation must carry them into `.golangci.yml`, next to the existing `G104`/`G115` excludes.
3. **Whether the SDK exposes a process-group helper as public API.** Default: internal only, as in ocx-sdk-python. This is deferred to wave-3 `api/sdk-surface`.

**Another research round:**
- **`io/windows-runtime`** needs a `windows-latest` runner. Questions:
  - Does `os.Rename` onto a target held open by a second handle fail with `ERROR_SHARING_VIOLATION`/`ERROR_ACCESS_DENIED`, and does GO-IO-17's bounded retry turn it green?
  - Does `os.Open(dir).Sync()` error on Windows, which would confirm the Unix-only directory fsync in GO-IO-11?
  - Does a job object assigned right after `Start` reap a grandchild spawned at once?
  - Does GO-IO-16's validator pass there?
- **`network/registry-client` (wave 3) should absorb GO-IO-18**, which is SHOULD and not watched red. Questions: concurrent ingest of one digest from two processes; verify-before-rename; and rename-over-existing on Windows. It needs a planted two-writer fixture.

## Sub-artifacts

- [go-io/files-and-atomicity.md](go-io/files-and-atomicity.md) covers:
  - atomic-write crash fixture and the `defer os.Remove` trap;
  - `os.Root` against `IsLocal` against a naive extractor;
  - the archive `GODEBUG` defaults;
  - the zip bomb, umask, reserved names and GOOS-split locks.
- [go-io/subprocess-contract.md](go-io/subprocess-contract.md) covers:
  - `CommandContext`/`WaitDelay`/`Cancel`, ErrDot, and the classification of signal death against a context error;
  - pipe deadlock, bounded capture and process-group kill;
  - the `execwait=2` finalizer and linter coverage (noctx, G204, SA1005).
- [go-io/process-group-sweep.md](go-io/process-group-sweep.md) (wave 3) covers:
  - the reuse-safety proof for GO-IO-14's post-Wait sweep, and why the residual race is bounded to an already-empty group;
  - `Pdeathsig` placement, its thread-vs-process semantics, and its per-OS availability;
  - the SDK's-own-process-SIGKILLed fixture, with and without `Pdeathsig`.
  - Its item-4 grep fallback is not adopted (conflict 14).
- Related, cited not restated:
  - [go-testing.md](go-testing.md) GO-TEST-12 owns testing the wrapper with a `TestMain` helper process, and the `GODEBUG=execwait=2` leak check. `execwait=2` is also a `go-diagnose` step and never a runtime default (conflict 11).
  - [go-cli/exit-codes-and-signals.md](go-cli/exit-codes-and-signals.md) rule 6 owns the 128+N mapping of a signalled child.
  - [go-errors/wrapping-and-classification.md](go-errors/wrapping-and-classification.md) owns the SDK's `*ExitError` and separate timeout type.

## Key sources

- [pkg.go.dev/os/exec](https://pkg.go.dev/os/exec): `CommandContext`, `Cancel`, `WaitDelay`, `ErrDot`, `ErrWaitDelay`, and the pipe warnings.
- [go.dev/doc/go1.20](https://go.dev/doc/go1.20): `Cmd.Cancel` and `Cmd.WaitDelay`.
- [go.dev/blog/path-security](https://go.dev/blog/path-security): `ErrDot` and `execerrdot`.
- [go.dev/doc/godebug](https://go.dev/doc/godebug): `tarinsecurepath`, `zipinsecurepath`, `execerrdot`, and the `go.mod` `godebug` block.
- [pkg.go.dev/os#Root](https://pkg.go.dev/os#Root) and [go.dev/blog/osroot](https://go.dev/blog/osroot): confinement, and the "local-filesystem half" scope.
- [pkg.go.dev/path/filepath#IsLocal](https://pkg.go.dev/path/filepath#IsLocal): lexical only.
- [raw archive/tar reader.go](https://raw.githubusercontent.com/golang/go/master/src/archive/tar/reader.go) and [archive/zip reader.go](https://raw.githubusercontent.com/golang/go/master/src/archive/zip/reader.go): the permissive default, and `.File` populated alongside the error.
- [google/renameio README](https://github.com/google/renameio/blob/master/README.md): the three atomic-write subtleties, and no exports on Windows.
- [golang/go#22397](https://github.com/golang/go/issues/22397#issuecomment-498856679): Windows replace has no atomic guarantee.
- [danluu.com/file-consistency](https://danluu.com/file-consistency/): fsync and directory-fsync semantics.
- [securego/gosec RULES.md](https://raw.githubusercontent.com/securego/gosec/master/RULES.md): G110, G204, G301-G307, G305, and G307's reassignment.
- [GHSA-7vpp-9cxj-q8gv / CVE-2025-3445](https://github.com/advisories/GHSA-7vpp-9cxj-q8gv): zip-slip in 2025.
- [pkg.go.dev/golang.org/x/sys/windows](https://pkg.go.dev/golang.org/x/sys/windows): job objects and `LockFileEx`.
- [go.dev/issue/23019](https://go.dev/issue/23019): an orphaned descendant holding the pipe, the hazard `WaitDelay` bounds.
- [sonatard/noctx](https://github.com/sonatard/noctx): covers `os/exec.Command`.
- [man7.org kill(2)](https://man7.org/linux/man-pages/man2/kill.2.html): negative-pid group signalling and the `ESRCH` contract (wave 3).
- [man7.org setpgid(2)](https://man7.org/linux/man-pages/man2/setpgid.2.html): process-group membership and creation (wave 3).
- [man7.org PR_SET_PDEATHSIG](https://man7.org/linux/man-pages/man2/PR_SET_PDEATHSIG.2const.html): the parent-*thread*, not parent-process, semantics; cleared across `fork(2)`; preserved across `execve(2)` except for a setuid/setgid or capability-bearing binary (wave 3).
- [golang/go#27505](https://github.com/golang/go/issues/27505): `Pdeathsig` fires on the creating thread's death, which can precede the Go process's death; the doc fix this issue produced is `go1.27.1:src/syscall/exec_linux.go:92-95` (wave 3).
- [golang/go#9686](https://github.com/golang/go/issues/9686): `Pdeathsig` is cleared by a setuid/setgid credential change if set before it (context for why the SDK never combines the two) (wave 3).
- `go1.27.1:src/os/pidfd_linux.go:88-92`: the stdlib's own comment that pidfd exists because "there is no wait/kill race … (described in CL 23967)" for a single pid — normative confirmation that the pre-pidfd race this revision reasons about for the *group* case is real for the *single-process* case, and that pidfd has no group-scoped analogue (wave 3).
- `containerd/containerd@934434dde54b:vendor/github.com/containerd/go-runc/{runc.go:83-90,monitor.go:79-90}`: the exemplar precedent for `Pdeathsig` and its `LockOSThread`-pairing mitigation, cited by name against #27505 (wave 3).
- `go1.27.1:src/syscall/exec_linux.go:107-108`: `UseCgroupFD`/`CgroupFD`, the only Linux spawn-time hook into a cgroup, and the route to a session-escape-proof `cgroup.kill` (Verdict 9, not adopted).

## Revision log

Every GO-IO ID from 01 to 20 keeps its number and meaning. None was renumbered, removed or reused.

- **2026-09-26, first wave-3 edit (made by the `io/process-group-sweep` dive, [pgs]):**
  - GO-IO-14: proved the post-Wait sweep reuse-safe while a descendant is alive ([pgs] `reuse/`).
  - GO-IO-14: changed "ignore `ESRCH`" to "treat `ESRCH` as success".
  - GO-IO-14: added `Pdeathsig`+`LockOSThread` as an inline Linux SHOULD, with the per-OS table.
  - Corrected the first pass's "no exemplar sets `Pdeathsig`" to 10 hits, 2 of them containerd production code.
  - Removed `io/process-group-sweep` from "Another research round".
- **2026-09-26, wave-3 consolidation (this revision):**
  - **Frontmatter:** added `go-io/process-group-sweep.md` to `consolidates`, the `revised` key, and the [pgs] and [r] fixture roots. Defined the [pgs] and [r] keys.
  - **GO-IO-06, changed in place (an overclaim):** it allowed a `//go:build unix` gate for `Pdeathsig`, a gate that breaks darwin and the BSDs. `Pdeathsig` now requires a `linux` constraint. Watched red on [r] `unixgate/` (conflict 13).
  - **GO-IO-14, verification replaced:** removed the `Pdeathsig` `grep -L 'go:build'` fallback. [r] watched it miss the `unix`-gated violation and flag the compliant `_linux.go` twin (exit 123). `GOOS=darwin go vet` is the only check (conflict 14).
  - **GO-IO-14, `Pdeathsig` split out:** the inline SHOULD moved to new GO-IO-21. GO-IO-14 keeps its original meaning, the MUST group sweep (conflict 15).
  - **GO-IO-14, title and scope narrowed (an overclaim):** "the whole process tree" became "the child's process group". [r] `escape/` watched a `setsid` grandchild survive the sweep, so this is now a documented gap in Verdict 9.
  - **GO-IO-14, extended:** capture the pgid once at `Start`, and sweep with a single call as the next statement after `Wait`, with no retry or sleep ([pgs] items 2 and 6). Recorded that pidfd protects only the leader ([pgs] item 8).
  - **GO-IO-21, new** (SHOULD): Linux `Pdeathsig` paired with `LockOSThread` across `Start`-through-`Wait`, never with `GOMAXPROCS=1`, never as a substitute for the sweep.
  - **GO-IO-13:** its "applies" list now includes GO-IO-21.
  - **Verdict:** item 2 now records the settled reuse-safety and GO-IO-21. New item 9 lists three documented gaps: the session escape, the double coincidence, and the unreproduced #27505 footgun. These were settled as gaps, not answered.
  - **Conflicts:** added 13 to 18.
  - **Exemplar table:** added a row for GO-IO-21.
  - **Failure modes:** rewrote 16 (the `unix` gate) and 18 (now cites GO-IO-21), and added 19 (retrying the sweep) and 20 (sweep and `Pdeathsig` treated as interchangeable).
  - **MUST count:** unchanged at 14, because GO-IO-21 is a SHOULD.
  - **Open questions:** no change. Wave 3 answered only `io/process-group-sweep`, which the first edit had already removed. Its unanswerable parts are gaps in Verdict 9, not open questions.
  - **Re-run:** [r] re-ran [pgs]'s `reuse/`, `pdeathsig/` and `darwinvet/` commands. All reproduced.
