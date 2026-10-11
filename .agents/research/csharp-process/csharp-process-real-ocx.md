---
title: "The wave-2 process engine against a real ocx (Linux + Windows): error documents, report_then_fail, colour, handshake, tree reaping, login stdin"
topic: csharp-process revision - real-ocx evidence for the CS-PROC and CS-ERR rows
agent: csharp-process-real-ocx (sonnet subagent, research-lang csharp, revision wave)
model: claude-sonnet-5-5
date_researched: 2026-10-11
sources_count: 17
scope: |
  Covers: the wave-2 reference engine (fixture consolidate-csharp-process/engine, 276-LOC OcxProcess) driven against a REAL ocx built from ~/dev/ocx at 3485207c1 (Linux glibc, Windows MSVC via cargo-xwin) and the released 0.6.5 musl binary; 85 PROC-R-nn observations, 6 engine divergences found red and fixed green, a Windows host leg (SDK 10.0.102, runtime 10.0.2) for tree reaping, the launcher-shim job object, the error/handshake/colour contract and CLI exit codes.
  Not covered: macOS and arm64 (no hardware here), ocx on musl at main, `ocx self update` actually repointing `current` (needs ocx.sh; recorded as NOT RUN), `patch test`, the report path of update/upgrade/inspect/copy/deps/cascade (only their error documents were reached), signing with Fulcio/Rekor (key-based signing against a local distribution:edge only), and the Windows PATH ACL check (a sibling topic).
---

# The wave-2 process engine against a real ocx

Citation forms: `ocx@3485207c1:path:line` (clone `/home/mherwig/dev/ocx`, build SHA `3485207c183ead4ae15b6cb2931ca7fb70fe8461`), `fixture:path` = `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-process-real-ocx/path`, `W2:path` = `.../fixtures/consolidate-csharp-process/path`. CS-PROC numbers follow the wave-2 fixture comments.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   - 2.1 [What was built and how the runs were made hermetic](#21-what-was-built-and-how-the-runs-were-made-hermetic)
   - 2.2 [Usage errors: one pretty document on stdout, prose on stderr (item 1)](#22-usage-errors-one-pretty-document-on-stdout-prose-on-stderr-item-1)
   - 2.3 [report_then_fail: the observed command list (item 1, feeds CS-TEST-07)](#23-report_then_fail-the-observed-command-list-item-1-feeds-cs-test-07)
   - 2.4 [Flag placement and the CLICOLOR_FORCE leak (item 2)](#24-flag-placement-and-the-clicolor_force-leak-item-2)
   - 2.5 [The handshake: contract on main, absent on 0.6.5 (item 3)](#25-the-handshake-contract-on-main-absent-on-065-item-3)
   - 2.6 [Observed exit codes against the CS-ERR table (item 5)](#26-observed-exit-codes-against-the-cs-err-table-item-5)
   - 2.7 [Passthrough: exec(2) on Unix, spawn on Windows, and ocx's own failures in the same exit channel (RED 1)](#27-passthrough-exec2-on-unix-spawn-on-windows-and-ocxs-own-failures-in-the-same-exit-channel-red-1)
   - 2.8 [Exit 75 is not always transient (RED 2)](#28-exit-75-is-not-always-transient-red-2)
   - 2.9 [Cancellation and tree reaping on Linux and Windows, and the shim job object (item 4)](#29-cancellation-and-tree-reaping-on-linux-and-windows-and-the-shim-job-object-item-4)
   - 2.10 [login --password-stdin against registry:2 (item 6)](#210-login---password-stdin-against-registry2-item-6)
   - 2.11 [The environment scrub on real output](#211-the-environment-scrub-on-real-output)
   - 2.12 [ocx self update (item 7): not run](#212-ocx-self-update-item-7-not-run)
   - 2.13 [Row verdicts: which CS-PROC / CS-ERR rows real ocx confirms and which change](#213-row-verdicts-which-cs-proc--cs-err-rows-real-ocx-confirms-and-which-change)
   - 2.14 [Verified on the toolchain](#214-verified-on-the-toolchain)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- Both ocx builds succeeded inside the 30-minute budget, so no fallback binary was needed: Linux `cargo build --release --locked -p ocx` took 6m32s, Windows `cargo xwin build --release --target x86_64-pc-windows-msvc` took 5m28s (pinned image `messense/cargo-xwin@sha256:543cdaeb...`). Both report `v0.6.5-15-g3485207c1-dirty` (the dirt is one unrelated tracked file, `.agents/memory/hex.md`).
- On main, EVERY ocx failure after argument parsing, and every clap usage error whenever `--format json` appears anywhere on the command line, prints one pretty-printed error document on STDOUT and human prose on stderr. The engine's `RawResult` captures both streams; all 49 error documents of the full Linux run had `exit_code` equal to the process exit.
- On released 0.6.5 a clap usage error (exit 64) prints NOTHING on stdout even with `--format json`; command-level errors print a COMPACT one-line document that has no `detail` member. The earlier audit line "0.6.5 exits 64 with 0 bytes on stdout" holds only for clap errors.
- A non-zero exit does not mean "no report": 5 of the 14 `report_then_fail` commands were reached with a genuine report AND a non-zero exit (`package push` 74, `package prune` 81 and 82, `package sign`/`attest` sweeps 79, `package test --script` 1); the other 8 reachable ones produced only an error document, and `patch test` was not run. A report-then-fail stdout contains NO `error` member.
- Classify stdout after any non-zero exit by shape, not by command: error document = root object with integer `exit_code` equal to the exit and `error.kind` string; report = root object without `error`. Never branch on the command name or on whether stderr is empty (the sweep failures print 0 bytes on stderr).
- `--format json` and `--color never` must precede the subcommand: `version --format json`, `version --json` and `version --color never` all exit 64 on both versions. `--format=json` and the `--json` alias work.
- `CLICOLOR_FORCE=1` in the ambient environment ANSI-highlights the JSON on STDOUT (not only stderr), so the document stops parsing; either defence alone (the 7-key scrub or `--color never`) is sufficient and the engine applies both. The scrub is confirmed necessary by a planted-bad twin.
- `ocx --format json version` carries `schema_version: 1` and a `contract` object (`errors: 1`, 70 `commands`, 56 `reports`) on main and neither on 0.6.5; the handshake answer `Unsupported` is correct for every released ocx today.
- CS-PROC-20/22 CHANGES (red, fixed, green): exit 75 is also the exit of a successful-but-skipped `self update --check --offline` report, so "exit 75 and non-mutating" retried a deterministic skip. The retry classifier must also require an error document of kind `temp_fail`.
- CS-PROC-21 CHANGES (red, fixed, green): on passthrough commands ocx's own pre-launch failures (command not found 65, not executable 77, no project 64) arrive in the same exit channel as the child's code; `ChildExit` gained `OcxErrorDocument` (stdout is an ocx error document whose `exit_code` equals the exit) so exit 77 from ocx and exit 77 from the tool are distinguishable.
- On Linux `ocx exec` replaces itself with `execvp(2)`: the process tree is `engine > tool`, with no ocx in it; on Windows ocx spawns and waits, so `engine > ocx.exe > tool`. The engine's `Kill(entireProcessTree: true)` reaped the whole tree on both (Windows: `ocx.exe > cmd.exe > ocxslow.exe`, tasklist before and after).
- `ocx.exe` carries no job object (control: `Kill(false)` on `ocx.exe` leaves the tool alive); only the launcher shim (`crates/ocx_shim`) creates one with `KILL_ON_JOB_CLOSE`. Killing the shim alone reaped its descendants, so the job is an independent second net and does not change the engine's tree-kill behaviour.
- `TermGrace > 0` (SIGTERM first) is confirmed unsafe for tools with grandchildren on real ocx: the orphan `sleep` survived and the call returned only after the 5 s drain grace (5975 ms). The default `TermGrace = TimeSpan.Zero` stays.
- `ocx login --password-stdin`: BOM-less UTF-8 bytes are stored byte-exact (including non-ASCII); exactly one trailing LF is stripped, a CR is NOT, a UTF-8 BOM is stored verbatim, UTF-16 stdin fails with exit 1 `internal` and an error document with no `detail`. `login` exit 0 proves nothing against a Basic-challenge registry; only a follow-up authenticated call distinguishes 79 (accepted) from 80 (rejected).
- Windows passes 32-bit child exit codes through: a child `exit 300` returns 300 on Windows and 44 on Linux. Exit codes are `int`, never `byte`.
- Observed error-document exit codes: 1, 64, 65, 69, 74, 75, 77, 78, 79, 80, 81 (all conform to `errors.json`); 82 appeared only inside a `package prune` report. `detail` is optional (absent on the exit-1 `internal` document).
- `ocx exec -- cmd` under the hermetic `OCX_NO_PROJECT=1` exits 64 `no_project`; the SDK's `exec` must pass `--project <ocx.toml>` or explicit package identifiers.
- Ambient `OCX_OFFLINE`, `OCX_FROZEN`, `OCX_NO_CONSENT` with a garbage value exit 78 `invalid_env` for every command and are NOT in the 7-key scrub; `OCX_OFFLINE=1` turns every networked call into 81. That is a policy choice left to the owner, not a defect.

## Findings

### 2.1 What was built and how the runs were made hermetic

| Item | Value |
|---|---|
| ocx source | `/home/mherwig/dev/ocx` `main` at `3485207c183ead4ae15b6cb2931ca7fb70fe8461` (selection SHA `3485207c1`); working tree dirty only in `.agents/memory/hex.md`; HEAD has since moved to `a23ec5be2939` (not built) |
| Linux build | `CARGO_TARGET_DIR=fixture:target cargo build --release --locked -p ocx` (toolchain 1.95.0 per `rust-toolchain.toml`), 6m32s, 65.1 MB, glibc dynamic; `fixture:bin/main/ocx` sha256 `cfacbb64...2db96a` |
| Windows build | `docker run messense/cargo-xwin@sha256:543cdaeb...635869 sh -c 'rustup target add x86_64-pc-windows-msvc && cargo xwin build --release -p ocx --target=x86_64-pc-windows-msvc --locked'` with the repo mounted read-only (no write into `~/dev/ocx`), 5m28s, 53.0 MB, staged to `C:\Users\ecom\csharp-wintest\real-ocx\ocx\ocx.exe` sha256 `934cc06d...ea61e` |
| Released binary | the installed 0.6.5 musl binary, `fixture:bin/v065/ocx`, sha256 `c83257b2...09702c`; used for the Linux 0.6.5 leg only (no fallback was needed on Windows) |
| Shim | `crates/ocx_store/src/shims/ocx-shim-x86_64.exe` (the committed blob), sha256 `f0452016...d4ca` |
| Registries (docker, 127.0.0.1) | 55421 `registry:2` + htpasswd (bcrypt; users `ocxuser`/`s3cret-pw` and `uniuser`/`pässw0rd€`), 55422 `registry:2` open, 55423 `distribution/distribution:edge` (OCI 1.1 referrers, needed for `sign`/`attest`) |
| Hermetic env per scenario | fresh `OCX_HOME`, `OCX_NO_CONFIG=1`, `OCX_NO_PROJECT=1`, `HOME`/`USERPROFILE`/`DOCKER_CONFIG`/`XDG_CONFIG_HOME`/`APPDATA` pointed at a temp dir; the engine adds `OCX_NO_UPDATE_CHECK=1` and `OCX_BINARY_PIN=<exe>` and scrubs 7 keys. Nothing wrote to a real registry. |

Driver: `fixture:driver/Program.cs` (570 lines) runs the UNCHANGED `OcxProcess.RunAsync` through the SDK path `OcxProcess.ComposeArgv` (which prepends `--format json --color never`); `fixture:engine/` is the wave-2 engine plus three small files (`OcxExitDocument.cs`, revised `ChildExit.cs`, `OcxRetry.cs`); `fixture:engine-orig/` is the wave-2 engine untouched, used for the red runs.

### 2.2 Usage errors: one pretty document on stdout, prose on stderr (item 1)

Observed on main, engine `RawResult` (stdout and stderr both captured, PROC-R-01):

```text
$ ocx --format json --color never --bogus        # exit 64
stdout (217 B, pretty-printed):
{
  "schema_version": 1,
  "command": "",
  "exit_code": 64,
  "error": { "kind": "usage_error", "detail": "invalid_command_line",
             "message": "unexpected argument '--bogus' found", "context": {} }
}
stderr (125 B): error: unexpected argument '--bogus' found\n\nUsage: ocx ...
```

Five usage-error shapes (unknown root flag, unknown sub-flag, missing required argument, unknown verb, malformed identifier) all gave exit 64, `error.kind == "usage_error"`, a document on stdout and prose on stderr, on Linux and Windows (`fixture:logs/run-main-linux-net10.0.txt`, `fixture:logs/run-main-windows.txt`). The document is written whether or not a command was named (`command` is `""` for a flag-level error, `"exec"` for a command-level one). Source: the "stdout holds exactly one document per invocation, also after a usage error" contract in the earlier audit (`csharp-audit/ocx-cli-contract.md` section 2) is now measured, not read.

Released 0.6.5 differs (PROC-R-01, `fixture:logs/run-v065-linux.txt`): all five clap errors exit 64 with 0 bytes on stdout and prose on stderr; command-level errors (exit 81 `--offline package inspect`, exit 65 `exec` of a missing program, exit 77, exit 78) print a COMPACT single-line document with `schema_version: 1`, `command`, `exit_code` and `error{kind,message,context}` but NO `detail` member:

```text
{"schema_version":1,"command":"package inspect","exit_code":81,"error":{"kind":"permission_denied","message":"failed to inspect package: ...","context":{}}}
```

Correct and incorrect handling side by side:

```csharp
// INCORRECT: assumes an error document exists for every non-zero exit and that `detail` is always present.
var doc = JsonSerializer.Deserialize<ErrorDocument>(r.Stdout)!;          // throws on 0.6.5 clap errors (empty stdout)
var slug = doc.Error.Detail.Length;                                      // NRE on 0.6.5 and on the exit-1 `internal` document

// CORRECT: classify by shape; stdout may be empty (0.6.5 clap error), a report (report_then_fail), or a document.
// `Detail` is optional; `Kind` and `ExitCode` are the stable parts.
var shape = OcxExitDocument.TryRead(r.Stdout);                           // null => not an error document
if (shape is { } d && d.ExitCode == r.ExitCode) throw new OcxCommandException(r.ExitCode, d.Kind, d.Detail);
```

The engine already satisfies "capture both": `RawResult(ExitCode, Stdout, Stderr, ...)` (`W2:engine/OcxProcess.cs:64`) keeps both byte arrays, and `Tail(se)` feeds only the timeout exception. Confirmed, no change.

### 2.3 report_then_fail: the observed command list (item 1, feeds CS-TEST-07)

`cli.json` on main lists 17 `report_then_fail` output modes across 14 commands (`ocx@3485207c1:crates/ocx_cli/src/command/contract.rs:37` defines the mode: "One JSON report of the named root, then a non-zero exit"). Each was probed with the cheapest reproducible failure:

| Command (mode root) | Reached as report + non-zero? | Observed (PROC-R-05) |
|---|---|---|
| `package push` (PushReport) | YES | `--tags-file /nonexistent/dir/tags`: exit 74, stdout 536 B PushReport `status: pushed`, NO error member, stderr 912-952 B (progress, warning, `error: writing tags file`) |
| `package prune` (PackagePrune) | YES, twice | `--dry-run` of tags with no ephemeral index: exit 81, stdout report, stderr 178 B; `--force` against registry:2 with delete disabled: exit 82, stdout report with `action: not_attempted`, stderr 74 B (`does not support deleting tags (HTTP 405)`) |
| `package sign` (SweepReport<SignatureReport>) | YES | `--key key.pem --no-rekor-upload --tags 1.0.0,nosuch`: exit 79, stdout `items[completed, failed(target_not_found)]`, **stderr 0 bytes** |
| `package attest` (SweepReport<AttestationReport>) | YES | same sweep shape, exit 79, stderr 0 B |
| `package test` (ScriptRunReport) | YES | `--script bad.star` (planted `expect.fail`): exit 1, stdout `status: failed` + `assertion{kind,message,location}`, stderr 0 B; the same with `--offline` (no registry needed); green script: exit 0 `status: passed` |
| `package copy` (CopyReport) | error document only | `--to localhost:1`: exit 75 `temp_fail`/`registry_transient`; missing source: 79 `manifest_not_found` |
| `package inspect` (InspectReport) | error document only | one missing identifier among several: exit 79 `package_not_found`, no partial report |
| `inspect` (InspectReport) | error document only | project without lock 78 `lock_missing`; stale lock 65 `lock_stale` |
| `package deps` (DependenciesTrace) | error document only | missing package: exit 79 |
| `package cascade check` / `repair` | error document only | missing repository: exit 79 `repository_not_found` |
| `update`, `upgrade` | error document only | missing tag 79 `tag_not_found`; no lock 78; `--offline` 81 `project_resolution_blocked` |
| `patch test` (ScriptRunReport, PatchTestReport) | NOT RUN | needs a patch descriptor; shares the `ScriptRunReport` root with `package test` |

What the stream behaviour is, as a rule: for a report-then-fail command, **stdout carries exactly the report (no error envelope) and the failure is the exit code plus, for some commands, prose on stderr**. The source states why: after a successful report the code returns an `ExitCode` instead of raising, "stdout already holds the report, so an error envelope would be suppressed" (`ocx@3485207c1:crates/ocx_cli/src/command/package_push.rs:501-502`). A raised error AFTER the report (the tags-file write) reaches stderr only; stdout stays the report. So the SDK cannot tell "report then fail" from "report, exit 0" by stdout alone: it must treat the exit code as authoritative and attach the parsed report to the failure.

Correct and incorrect handling side by side:

```csharp
// INCORRECT: throws away a report the command already printed (and sign/attest print nothing on stderr to fall back on).
if (r.ExitCode != 0) throw new OcxCommandException(r.ExitCode, Tail(r.Stderr));

// CORRECT: a non-zero exit is the outcome; the shape of stdout decides what extra data exists.
if (r.ExitCode != 0)
{
    var err = OcxExitDocument.TryRead(r.Stdout);                 // error document => no report exists
    var report = err is null ? TryDecodeReport<T>(r.Stdout) : null;   // report_then_fail commands only
    throw new OcxCommandException(r.ExitCode, err?.Kind, err?.Detail, report);
}
```

### 2.4 Flag placement and the CLICOLOR_FORCE leak (item 2)

PROC-R-02 matrix (main; 0.6.5 identical on exit codes, stdout empty instead of a document for the three failing rows):

| argv | exit | stdout |
|---|---|---|
| `--format json --color never version` | 0 | report |
| `--format=json version` | 0 | report |
| `--json version` (alias) | 0 | report |
| `version --format json` | 64 | error document (main) / empty (0.6.5) |
| `version --json` | 64 | error document / empty |
| `--format json version --color never` | 64 | error document / empty |
| `--color never version` | 0 | plain text, NOT JSON (6 B) - the SDK must pass `--format json` on every call |
| `exec -- printf '[%s]' --json` | 0 | `[--json]` raw: `--json` after `--` belongs to the child; child stdout is not wrapped in JSON |

Main parses `--format json` even on the clap error path (so a misplaced flag still returns a document); without `--format json` anywhere, a usage error leaves stdout empty.

Colour (PROC-R-03, `CLICOLOR_FORCE=1` set in the DRIVER's own environment so the engine's inherit-then-scrub path is exercised, command `--offline index list zz`, which warns on stderr):

| variant | stdout | stderr |
|---|---|---|
| engine baseline (scrub + `--color never`) | parses, no ESC | warning, no ESC |
| scrub only (no `--color`) | parses | no ESC |
| `--color never` only (scrub undone through `OcxInvocation.Env`) | parses | no ESC |
| neither (planted bad) | **ANSI-highlighted, `NotJson`**: `<ESC>[1m{<ESC>[0m\n  <ESC>[1;34m"<ESC>[0m<ESC>[1;34mschema_version...` | `<ESC>[33m<ESC>[1mwarning:` |

The leak therefore corrupts the machine document itself, a stronger statement than the audit's "ANSI in a pipe on stderr". The precedence is the documented CLICOLOR rule: `CLICOLOR_FORCE` set and `NO_COLOR` unset forces colour "no matter what" ([CLICOLORS](https://bixense.com/clicolors/)), and a per-invocation command-line argument is the sanctioned override ([NO_COLOR](https://no-color.org/)); ocx's own order is `NO_COLOR` > `CLICOLOR_FORCE` > ... with `--color` outranking all (`csharp-audit/ocx-cli-contract.md` section 2).

### 2.5 The handshake: contract on main, absent on 0.6.5 (item 3)

PROC-R-04, both OSes: main `version` is 3555 B with `schema_version: 1`, `version`, `commit{sha,short,describe,dirty,timestamp}` and `contract{errors: 1, commands: {70 entries, "exec": 1, ...}, reports: {56 entries, "AttestationReport": 2, ...}}`. Released 0.6.5: 614 B with keys `version, commit, build, ci` only, no `schema_version`, no `contract`. So the decision "no `contract` key => `Unsupported`" is right for every released ocx today and `version` itself reports `0.6.5` on the unreleased main build (`describe: v0.6.5-15-g3485207c1-dirty`), meaning the semantic version string cannot distinguish the two protocols: the handshake MUST key on `contract`, never on `version`. This confirms the CS-JSON handshake row and the earlier warning that `MINIMUM_OCX = "0.6.4"` in the Rust generator is wrong.

### 2.6 Observed exit codes against the CS-ERR table (item 5)

All 49 error documents of the full Linux run were checked (PROC-R-06 `conform`) against `crates/ocx_schema/tests/golden/errors.json` (`$defs.ExitCode['x-ocx-enum']` for `exit -> category`, `$defs.ErrorDetail['x-ocx-enum']` for `detail -> exit_code`): `doc.exit_code == process exit`, `error.kind == category(exit)`, `detail`'s own `exit_code == exit` (absent `detail` allowed only for exit 1). Result: 0 nonconforming. Reproducible triggers:

| Exit | `error.kind` | Observed trigger (stdout form) |
|---|---|---|
| 1 | `internal` (no `detail`) | `login --password-stdin` with UTF-16LE stdin (document); `package test --script` red (report) |
| 64 | `usage_error` | `--bogus`; `exec` with no project under `OCX_NO_PROJECT=1` (`no_project`) |
| 65 | `data_error` | `exec -- definitely-not-a-command-xyz` (`command_not_found`, 1.5 KB document) |
| 69 | `unavailable` | `lock` with a tool on `localhost:1` (`registry_unreachable`) |
| 74 | `io_error` | `package push -i x /etc/shadow` (`file_io`); `package push --tags-file /nonexistent/...` (report + 74) |
| 75 | `temp_fail` | `package copy --to localhost:1` (`registry_transient`, document); `self update --check --offline` (REPORT `skipped`, no document) |
| 77 | `permission_denied` | `exec -- <mode-644 script>` (`permission_denied`) |
| 78 | `config_error` | ambient `OCX_OFFLINE=bogus` (`invalid_env`); `inspect` without lock (`lock_missing`); `login` with no credential helper (`no_credential_store`) |
| 79 | `not_found` | `package inspect` of an absent tag (`package_not_found`) |
| 80 | `auth_error` | any authenticated call against an htpasswd registry with wrong or no credentials (`registry_auth_failed`) |
| 81 | `permission_denied` | `--offline package inspect` (`index_resolution_blocked`) |
| 82 | (report only) | `package prune --force` against registry:2 without delete enabled: stdout PackagePrune report, no document |

Facts that change how the five CS-ERR leaves are built: (a) 77 and 81 both carry `kind: permission_denied`, so the exit code, not `kind`, selects the category (confirmed live, not read); (b) `detail` is optional (the exit-1 `internal` document has none, and 0.6.5 documents never have one); (c) 82 can arrive without any error document, inside a report, and 75 can arrive inside a report (section 2.8); (d) the document shape differs between 0.6.5 (compact, no `detail`, no `$defs`) and main (pretty, `detail`), so `OcxException` construction must not assume either.

### 2.7 Passthrough: exec(2) on Unix, spawn on Windows, and ocx's own failures in the same exit channel (RED 1)

Source: on Unix `ocx exec` calls `CommandExt::exec` (`ocx@3485207c1:crates/ocx_package_manager/src/launch/child_process.rs:65-68`, "replacing the running process (`execvp(2)` on Unix; spawn, wait and exit elsewhere)"), with `env_clear().envs(env)` so the tool gets ocx's composed environment, not the SDK's; off Unix it spawns with `.kill_on_drop(true)` and waits (`child_process.rs:124-137`); only `--rm` forces the spawn path on Unix (`ocx@3485207c1:crates/ocx_cli/src/command/exec.rs:205-212`). Measured: the Linux tree is `engine(dotnet) > sh > sleep` with no ocx process (PROC-R-09 chain line).

Exit forwarding (PROC-R-08, Linux / Windows): child `exit 0/1/64/75` pass through unchanged; `exit 300` -> **44** on Linux (mod 256) and **300** on Windows; `kill -TERM $$` -> 143; `exit 127` -> 127; child stdout is byte-exact UTF-8 `héllo→世界` and `NotJson`; no JSON wrapping.

The divergence (RED, PROC-R-08 launch-missing / launch-noexec / child-exit77 / child-exit65): the wave-2 claim "passthrough returns the child's raw code, never mapped" is true but incomplete. ocx's own failures on a passthrough command use the same numbers and the same exit channel:

```text
$ ocx --project p.toml exec -- definitely-not-a-command-xyz     exit 65, stdout 1517 B error document (data_error / command_not_found)
$ ocx --project p.toml exec -- ./noexec.sh   (mode 644)          exit 77, stdout error document (permission_denied)
$ ocx --project p.toml exec -- sh -c 'exit 77'                    exit 77, stdout EMPTY            <- the tool's own 77
```

`ChildExit(int Code)` could not tell the first two from the third. Fix (`fixture:engine/ChildExit.cs`, `fixture:engine/OcxExitDocument.cs`):

```csharp
public readonly record struct ChildExit(int Code, bool OcxErrorDocument)
{
    public static ChildExit From(RawResult r) =>
        new(r.ExitCode, OcxExitDocument.TryRead(r.Stdout) is { } d && d.ExitCode == r.ExitCode);
}
```

`OcxExitDocument.TryRead` parses only if stdout is `<= 64 KiB` and starts with `{`, so a chatty tool's output is never parsed. The heuristic can be spoofed by a tool that prints a matching document; ocx has no sideband to prevent that (Contested). Red/green evidence in 2.14.

### 2.8 Exit 75 is not always transient (RED 2)

CS-PROC-22 says "retry only on 75 for non-mutating commands". Real ocx emits 75 in a successful report: `ocx self update --check` under `--offline` prints `{"status":"skipped","skipped_reason":{"reason":"offline"}}` (98 B on main, 77 B on 0.6.5) and exits 75 (`ocx@3485207c1:crates/ocx_cli/src/command/self_group/update.rs:26` "75 (`EX_TEMPFAIL`) if the check was skipped"). It is non-mutating, so the wave-2 classifier returned `IsRetryable == true` for a deterministic skip. The transient case is real too: `package copy --to localhost:1` returns exit 75, an error document with `kind: temp_fail`, `detail: registry_transient`.

```csharp
// INCORRECT (wave-2): the number alone.
!passthrough && !mutating && r.ExitCode == (int)OcxExitCode.TempFail;

// CORRECT: the number AND a temp_fail error document with the same exit_code.
!passthrough && !mutating && r.ExitCode == (int)OcxExitCode.TempFail
    && OcxExitDocument.TryRead(r.Stdout) is { Kind: "temp_fail" } d && d.ExitCode == r.ExitCode;
```

A bare child `exit 75` (no document) is also not retryable under the fixed rule even if a caller misclassifies the command as non-passthrough (PROC-R-08 `exit75-retry`).

### 2.9 Cancellation and tree reaping on Linux and Windows, and the shim job object (item 4)

Linux (PROC-R-09, `ocx exec -- sh -c 'sleep <unique> & wait'`, process scan through `/proc`):

| scenario | chain | outcome | orphans after |
|---|---|---|---|
| caller cancel (`TermGrace 0`) | `dotnet > sh > sleep` | `OperationCanceledException`, 1169-1192 ms | 0 |
| SDK timeout 2 s | same | `OcxTimeoutException`, 2.7 s | 0 |
| `TermGrace = 2 s` (SIGTERM first) | same | `OperationCanceledException`, **5975 ms** | **1** |

The third row reproduces the wave-2 dummy finding with real ocx: SIGTERM kills `sh`, `sleep` keeps the stdout/stderr pipes, `DrainAsync` waits its full 5 s grace, and the engine never reaches `Kill(entireProcessTree: true)` because the root already exited (`W2:engine/OcxProcess.cs:232-247`). Because `ocx exec` replaces itself, SIGTERM reaches the tool directly; there is no ocx signal-forwarding race. `TermGrace` stays default zero.

Windows (host dotnet 10.0.102 / runtime 10.0.2, `cmd.exe` from a `C:` cwd; child = `cmd.exe /c C:\...\ocxslow.exe -n 300 127.0.0.1`, `ocxslow.exe` a copy of `PING.EXE` so the image name is unique):

```text
GREEN PROC-R-09 before   ocx.exe=1 cmd.exe=1 ocxslow.exe=1 tasklist[ocxslow]="ocxslow.exe","50016"
GREEN PROC-R-09 win-tree outcome=OperationCanceledException after: ocx.exe=0 cmd.exe=0 ocxslow.exe=0
                         tasklist[ocxslow]=INFO: No tasks are running which match the specified criteria.
```

So `ocx.exe > cmd.exe > ocxslow.exe` was fully reaped by `Kill(entireProcessTree: true)`. Mechanism, from the runtime source: on Windows `KillTree` terminates the process first ("so that no further children can be created"), then enumerates children as processes whose `ParentProcessId` equals the pid AND whose `StartTime` is later, and recurses (`dotnet/runtime@v10.0.0:.../Process.Win32.cs:329-333,372-409`); on Unix it sends SIGSTOP, lists children, SIGKILLs, and recurses (`.../Process.Unix.cs:94-141`). The documented limits apply: `WaitForExit`/`HasExited` report completion when the root exits "even if all descendants have not yet exited", and processes the caller cannot inspect are silently skipped ([Process.Kill](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process.kill?view=net-10.0)). A descendant whose intermediate parent died BEFORE the kill is unreachable by this walk; that case was not exercised (source-derived only).

Does ocx's own job object change it? There are two different things:

- `ocx.exe` itself creates no job object. Control (`PROC-R-09 no-shim-control`): spawn `ocx exec -- cmd.exe /c <tool>`, `Kill(entireProcessTree: false)` on `ocx.exe` only: **the tool survived (`orphans-after=1`)**. A grep of `JobObject|KILL_ON_JOB|setsid|process_group` over `crates` at 3485207c1 matches only `ocx_shim/src/main.rs` (plus the two committed shim blobs), `ocx_console/src/progress.rs` and `ocx_project/src/lazy.rs`; nothing in the exec path.
- The launcher shim (the Windows entrypoint stub of installed packages, `crates/ocx_shim`) creates an anonymous job with `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` and starts its child inside it via `PROC_THREAD_ATTRIBUTE_JOB_LIST` (`ocx@3485207c1:crates/ocx_shim/src/main.rs:276-303,398-415`). Per the Win32 rules a job's processes inherit it by default and closing the last handle with `KILL_ON_JOB_CLOSE` terminates everything ([Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects)). Chain tested: `engine > ocx.exe > cmd.exe > shim > ocx.exe(launcher exec) > tool`, the shim being the committed blob copied to `slowtool.exe` plus a `slowtool.exec` sidecar (project path line, baked ocx path line). Engine cancel: before `ocx.exe=2 shim=1 real=1`, after `shim=0 real=0 ocx=0` (`shim-tree`). Killing the shim ALONE (`Kill(false)`, no tree walk): descendants `real-after=0 ocx#2-after=0` (`job-alone`): the job reaps even when the walk would miss them.

Net: the job object does not change what the engine does or needs; it is a second, independent net on the shim path only. `ocx exec` also REFUSES to exec a shim directly: `ocx exec -- <shim.exe>` exits 64 with `"... resolves to an ocx launcher trampoline ...; running it would re-enter ocx against itself"` (`ocx@3485207c1:crates/ocx_config/src/env.rs:627`), so an SDK cannot route a shim through `exec`.

### 2.10 login --password-stdin against registry:2 (item 6)

Docker was available. PROC-R-07 against `registry:2` + bcrypt htpasswd (the registry accepts basic auth over HTTP on loopback in practice although its docs say TLS is required for authentication, [deploying](https://distribution.github.io/distribution/about/deploying/)), `OCX_INSECURE_REGISTRIES=localhost:55421`, `--allow-insecure-store` (without it a hermetic home with no credential helper exits 78 `no_credential_store`). For each attempt the driver read the stored base64 `auths` entry back (what ocx actually kept) and then made an authenticated call (`--remote package inspect <reg>/nosuch:1`: 79 = credentials accepted, repository absent; 80 = rejected):

| stdin bytes | login exit | stored `user:password` bytes | follow-up |
|---|---|---|---|
| `s3cret-pw` (BOM-less, no newline) | 0 | `ocxuser:s3cret-pw` | 79 accepted |
| `s3cret-pw\n` | 0 | same (one LF stripped) | 79 |
| `s3cret-pw\r\n` | 0 | `...pw` + `0D` (CR kept) | **80** |
| `EF BB BF s3cret-pw` | 0 | `ocxuser:` + `EFBBBF` + `s3cret-pw` (BOM kept) | **80** |
| `wrong` | **0** | (rejected only later) | **80** |
| `pässw0rd€` UTF-8, user `uniuser` | 0 | byte-exact `70C3A4...E282AC` | 79 |
| the same in UTF-16LE | **1**, document `internal`, no `detail` | - | - |
| empty | 64 `usage_error` | - | - |

BOM-less stdin bytes are therefore accepted, confirming CS-PROC-12/11 (`StandardInputEncoding = UTF8Encoding(false)`, bytes written with no newline then EOF). Three consequences: the CR/BOM rows are the observable reason the encoding rule exists; `login` exit 0 does not validate a Basic-realm credential (the oci-client `auth` returns the Basic credential without a request when the challenge is unsupported, `external/rust-oci-client@3ee5a1f:src/client.rs:1063-1074`, and `login` calls exactly that, `ocx@3485207c1:crates/ocx_oci/src/auth/login.rs` `OciClientPing::ping`); and ocx strips only a single `\n` (`ocx@3485207c1:crates/ocx_cli/src/command/login.rs:83`). No password appeared in any stdout or stderr. `docker login` documents stdin as the way to keep the secret out of history and logs but is silent on newline handling ([docker login](https://docs.docker.com/reference/cli/docker/login/)), so ocx's LF-only strip is its own behaviour.

### 2.11 The environment scrub on real output

PROC-R-11 compares three runs per key: baseline (key absent), scrubbed (key ambient in the driver, engine active) and leaked (key forced back through `OcxInvocation.Env`). The engine contract is: scrubbed == baseline.

| Key | Effect when leaked (observed) | Scrubbed == baseline |
|---|---|---|
| `OCX_QUIET=1` | `version` stdout becomes 0 bytes | yes |
| `OCX_PROJECT=<nope>` | `status` 64 `no_project` -> 79 `config_file_not_found` | yes |
| `OCX_GLOBAL=1` | `status` 64 -> 74 `project_io` | yes |
| `OCX_NO_VERIFY=garbage` | `package install` 81 -> 78 `invalid_env` | yes |
| `CLICOLOR_FORCE=1` | stdout/stderr ANSI (2.4) | yes |
| `OCX_NO_HOOK=1` | none observable on `version` (defensive) | yes |

Not in the scrub and observable: ambient `OCX_OFFLINE=bogus`, `OCX_FROZEN=bogus`, `OCX_NO_CONSENT=bogus` exit 78 `invalid_env` for every command; `OCX_OFFLINE=1` makes `package inspect` exit 81. Under hermetic `OCX_NO_PROJECT=1` the `OCX_PROJECT` row only matters when the SDK does not set `OCX_NO_PROJECT`; the SDK is expected to pass `--project` explicitly, which outranks ambient state.

### 2.12 ocx self update (item 7): not run

`ocx --offline self update --check` and `--offline self update` both exit 75 with a `skipped` report (98 B on main, 77 B on 0.6.5), so nothing was downloaded and `current` was not repointed. A real run needs `ocx.sh`; the task rule forbids touching real registries. `self setup` offline exits 81 `offline_mode`. NOT RUN: whether `self update` repoints `current` atomically.

### 2.13 Row verdicts: which CS-PROC / CS-ERR rows real ocx confirms and which change

| Row | Verdict | Evidence |
|---|---|---|
| CS-PROC-01 argv via `ArgumentList` | confirmed | `--json`/hostile child argv through `ocx exec` (R-02) on both OSes |
| CS-PROC-03 resolver, exact `ocx`/`ocx.exe` | confirmed | Windows runs used the absolute `ocx.exe` |
| CS-PROC-06 7-key scrub | confirmed; 5 keys observable, 2 defensive | 2.11 |
| CS-PROC-07 flags before subcommand, `--` before child | confirmed, plus: `--format json` is mandatory on every call | 2.4 |
| CS-PROC-11/12 UTF-8 no BOM, stdin bytes | confirmed with a real consumer | 2.10; R-12 no BOM, non-ASCII message round trip |
| CS-PROC-13 bounded drain | confirmed | term-first row, 5975 ms |
| CS-PROC-14 `Kill(entireProcessTree: true)` + reap | confirmed on Linux and Windows | 2.9 |
| CS-PROC-15 cancel vs timeout types | confirmed | `OperationCanceledException` / `OcxTimeoutException` with real exec |
| CS-PROC-18 `TermGrace` default 0 | confirmed; reason sharpened | 2.9 |
| CS-PROC-19 raw result for every exit | confirmed; nonzero + report is common | 2.3 |
| CS-PROC-20/22 retry classifier | **CHANGED** (RED -> GREEN) | 2.8 |
| CS-PROC-21 `ChildExit` | **CHANGED** (RED -> GREEN) | 2.7 |
| CS-ERR exit table keyed by code, conformance vs `errors.json` | confirmed (49 documents, 0 nonconforming) | 2.6 |
| CS-ERR "kind does not determine the code" | confirmed live (77 and 81 both `permission_denied`) | 2.6 |
| CS-ERR `OcxCommandException` leaf | **CHANGED**: must be able to carry the parsed report of a report-then-fail command; `Detail` nullable | 2.3, 2.6 |
| CS-ERR passthrough exits are data | confirmed, with the `OcxErrorDocument` hint | 2.7 |
| CS-JSON handshake on `contract` | confirmed | 2.5 |
| CS-TEST-07 contract tier | **EXTENDED**: probes listed in 2.3 and in the normative rules | 2.3 |

### 2.14 Verified on the toolchain

Fixture root `fixture:` = `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-process-real-ocx/`. Reproduce everything with `fixture:run-all.sh` (docker registries 55421-55423 must be up; Windows leg is the `cmd.exe` line in the script's last comments).

Commands (Linux): `T=/home/mherwig/.cache/research-lang/dotnet-tools/run.sh; $T dotnet fixture:driver-orig/bin/Release/net10.0/Driver.dll fixture:bin/main/ocx main --errors .../errors.json --reg localhost:55422 --reg3 localhost:55423 --auth localhost:55421 --work fixture:work-red`. Windows: `cd /mnt/c/Users/ecom && cmd.exe /v:on /c "chcp 437 >nul & cd /d C:\Users\ecom\csharp-wintest\real-ocx & dotnet driver\Driver.dll C:\...\ocx\ocx.exe main --errors C:\...\errors.json --shim C:\...\shim.exe --work C:\...\work & echo exit=!ERRORLEVEL!"`.

RED (wave-2 engine `engine-orig`, real ocx main; `fixture:logs/run-main-linux-RED-engine-orig.txt`, final line `greens=72 reds=6`):

```text
RED   PROC-R-08 exit75-retry    ... a child's bare exit 75 (no ocx error document) is never retried ... observed[passthrough->False native->True]
RED   PROC-R-08 launch-missing  ... distinguishable from a child exit of the same number ... observed[exit=65 stdout=1517B/ErrorDoc ... flag=(no such member)]
RED   PROC-R-08 launch-noexec   ... observed[exit=77 stdout=337B/ErrorDoc ... flag=(no such member)]
RED   PROC-R-08 child-exit77    ... a child that merely exits with the same number is NOT flagged ... observed[exit=77 stdout=0B/Empty ... flag=(no such member)]
RED   PROC-R-08 child-exit65    ... observed[exit=65 stdout=0B/Empty ... flag=(no such member)]
RED   PROC-R-10 retry-skip      ... IsRetryable must be false ... observed[exit=75 stdout=98B/Report stderr=0B IsRetryable=True]
main linux dotnet=10.0.12 greens=72 reds=6
```

GREEN (fixed engine `fixture:engine`, same driver source; `fixture:logs/run-main-linux-net10.0.txt`, `...-net8.0.txt`, `fixture:logs/run-main-windows.txt`):

```text
GREEN PROC-R-08 launch-missing  ... observed[exit=65 stdout=1517B/ErrorDoc stderr=1267B kind=data_error detail=command_not_found flag=True]
GREEN PROC-R-08 launch-noexec   ... observed[exit=77 stdout=346B/ErrorDoc ... flag=True]
GREEN PROC-R-08 child-exit77    ... observed[exit=77 stdout=0B/Empty stderr=0B flag=False]
GREEN PROC-R-08 child-exit65    ... observed[exit=65 stdout=0B/Empty stderr=0B flag=False]
GREEN PROC-R-08 exit75-retry    ... observed[passthrough->False native->False]
GREEN PROC-R-05 retry-copy-down ... observed[exit=75 ... kind=temp_fail ... retry(nonmut)=True retry(mut)=False]
GREEN PROC-R-10 retry-skip      ... observed[exit=75 stdout=98B/Report stderr=0B IsRetryable=False]
main linux dotnet=10.0.12 greens=78 reds=0      (net8.0, runtime 8.0.31: greens=78 reds=0)
main windows dotnet=10.0.2 greens=44 reds=0     (exit=0)
v065 linux dotnet=10.0.12 greens=49 reds=0      (version-keyed rows print INFO, not a verdict)
```

Engine build gate (analyzers at error, `TreatWarningsAsErrors`): `(cd fixture:engine && $T dotnet build -c Release)` -> `0 Warning(s) 0 Error(s)` for net8.0 and net10.0; the wave-2 pattern checks `W2:rules/rules-check.sh fixture:engine` -> `P01-wired 1`, `P02-seam 1`, all `must be 0` rows 0.

Planted-bad / good twins watched (each "bad" row was red before, or is the leak the guard defends against):

| Twin | Bad (observed) | Good (observed) |
|---|---|---|
| ocx pre-launch failure vs tool exit (2.7) | engine-orig: `flag=(no such member)` x4 RED | fixed: `flag=True/True/False/False` GREEN |
| retry of a skipped report (2.8) | `IsRetryable=True` RED | `IsRetryable=False` GREEN |
| bare child 75 retry (2.8) | `native->True` RED | `native->False` GREEN |
| CLICOLOR_FORCE (2.4) | neither defence: stdout `NotJson`, ESC in both streams | scrub-only, flag-only, both: parses, no ESC |
| ambient OCX_QUIET / PROJECT / GLOBAL / NO_VERIFY (2.11) | leaked: empty stdout / 79 / 74 / 78 | scrubbed == baseline x4 |
| login CRLF / BOM / wrong password (2.10) | follow-up 80 (stored `...0D`, stored `EFBBBF...`) | BOM-less/LF/UTF-8: follow-up 79 |
| shim job (2.9) | `no-shim-control`: tool orphaned after `Kill(false)` | `job-alone`: descendants reaped after killing only the shim |

Scenario-design reds that were mine, not the engine's, and were fixed in the driver (recorded for honesty): `exec` without a project (64 `no_project`), the `OCX_PROJECT` leak check under `OCX_NO_PROJECT=1`, `--color` after the subcommand without `--format json` (empty stdout), the `login` exit-code assumption (exit 0 for a wrong password), and `ocx exec -- <shim>` (refused by design).

## Normative guidance candidates

1. **Classify stdout by shape after every non-zero exit, in one place.** Error document = root object with integer `exit_code` equal to the process exit and object `error` with string `kind`; report = root object without `error`; empty = no document (0.6.5 clap error). Rationale: report_then_fail commands print a report and exit non-zero, and 0.6.5 prints nothing. Verify: `rg -n -e 'TryGetProperty\("exit_code"' src/ | wc -l` is exactly 1 and sits in `OcxExitDocument`; contract tier test PROC-R-05 `push`/`sign-sweep`.
2. **Never read `error.detail` as required.** Declare it `string?`; fall back to `kind` and the exit code. Rationale: the exit-1 `internal` document and all 0.6.5 documents have no `detail`. Verify: `rg -n -e 'required\s+string\s+Detail' src/` returns nothing; unit test decoding `{"schema_version":1,"command":"login","exit_code":1,"error":{"kind":"internal","message":"x","context":{}}}`.
3. **Keep the exit code authoritative; attach the report to the failure.** For the 14 report_then_fail commands a non-zero exit with a parseable report throws `OcxCommandException` whose `Report` property holds the decoded document. Rationale: `package sign --tags a,b` prints its only failure detail in the report (stderr 0 B). Verify: reading heuristic - `rg -n -e 'ExitCode\s*!=\s*0' src/` sites all route through the single classifier; contract test PROC-R-05 `sign-sweep` expects `Report.Items[1].Status == "failed"`.
4. **Never retry on exit 75 alone.** Retry only when `!passthrough && !mutating` AND the error document has `kind == "temp_fail"` and `exit_code == 75`. Rationale: 75 is also a deterministic `self update --check --offline` skip. Verify: `rg -n -e '== 75|TempFail' src/` hits only `OcxRetry.cs`; contract test `retry-skip` and `retry-copy-down`.
5. **Return passthrough exits as `ChildExit(Code, OcxErrorDocument)`.** Set the flag only when stdout is an ocx error document whose `exit_code` equals the exit; document it as a heuristic. Rationale: ocx's own 65/77/64 launch failures share the child's exit channel. Verify: `rg -n -e 'record struct ChildExit' src/` shows the second member; tests `launch-missing`, `launch-noexec`, `child-exit77`.
6. **Pass `--format json --color never` BEFORE the subcommand on every call and scrub `CLICOLOR_FORCE`.** Rationale: after-subcommand placement exits 64; no `--format json` yields plain text; `CLICOLOR_FORCE=1` makes stdout unparseable. Verify: `rg -n -e '"--format"' src/ | wc -l` is 1 (the composer); `rg -n -e 'CLICOLOR_FORCE' src/OcxProcess.cs` matches the scrub array; tests PROC-R-02, PROC-R-03.
7. **Spawn ocx with an explicit project for `exec`.** `exec` must receive `--project <abs ocx.toml>` (or package identifiers); do not rely on cwd discovery and do not drop the hermetic `OCX_NO_PROJECT=1`. Rationale: under `OCX_NO_PROJECT=1` a bare `exec` exits 64 `no_project`. Verify: unit test that `ExecAsync` argv contains `--project` or a package operand before `--`.
8. **Keep `TermGrace` defaulting to zero.** SIGTERM-first only as an opt-in for tools known to have no grandchildren. Rationale: real `ocx exec` + a grandchild left an orphan and a 5975 ms return. Verify: `rg -n -e 'TermGrace\s*\{\s*get;\s*init;\s*\}\s*=\s*TimeSpan\.Zero' src/` has 1 hit; test `term-first` documents the cost.
9. **Use `Kill(entireProcessTree: true)` and no job object in the SDK.** Do not P/Invoke `CreateJobObject`/`AssignProcessToJobObject`. Rationale: the tree walk reaped `ocx.exe > cmd.exe > tool` and the shim chain; a job adds failure modes. Verify: `rg -n -e 'CreateJobObject|AssignProcessToJobObject|SetInformationJobObject' src/` returns nothing; Windows leg `win-tree` and `shim-tree` green.
10. **Exit codes are `int` end to end.** Never cast `ExitCode` to `byte`/`sbyte`; the exit table is keyed by `int`. Rationale: a Windows child exits 300; 32-bit NTSTATUS exits exist. Verify: `rg -n -e '\((s?byte)\)\s*\w*[Ee]xit' src/` returns nothing; analyzer CA2020/CS0652-class overflow checks stay at error.
11. **Write secrets to stdin as exact UTF-8 bytes: no BOM, no newline, never CRLF.** Rationale: ocx strips one `\n`, keeps `\r` and a BOM as password bytes (follow-up 80). Verify: `rg -n -e 'Encoding\.UTF8\b|StandardInputEncoding\s*=' src/` shows only `OcxProcess.Utf8NoBom`; BannedSymbols `P:System.Text.Encoding.UTF8` stays; test PROC-R-07 reads the stored `auths` bytes.
12. **Do not claim `LoginAsync` validated credentials.** Name the result `LoginResult` without a `Verified` flag, and document that exit 0 against a Basic-realm registry is unverified. Rationale: a wrong password exits 0. Verify: `rg -n -i -e 'verified|validated' src/Login*.cs` returns nothing; doc-comment review.
13. **Handshake on `contract`, never on `version`.** Rationale: main reports `0.6.5`. Verify: `rg -n -e 'Version\s*(>=|<|==)' src/Handshake*.cs` returns nothing; tests `contract` (main) and `absent` (0.6.5).
14. **Contract tier (CS-TEST-07) must carry these offline-safe probes**: usage error (`--bogus`), placement matrix, handshake, `package test --script` red/green (`create` + `test`, no registry), `exec` exit passthrough table, CLICOLOR_FORCE; docker-gated probes: `push --tags-file`, `prune --dry-run`/`--force` on registry:2, `sign`/`attest` sweeps on distribution:edge, `login` byte rows. Verify: `dotnet test --filter "Category=Contract" --minimum-expected-tests 20` (xUnit v3 MTP, armed by `OCX_SDK_CONTRACT`).
15. **Do not extend the scrub list to `OCX_OFFLINE`/`OCX_FROZEN`/`OCX_NO_CONSENT`.** They are caller intent; surface exit 78 `invalid_env` and 81 as typed `ConfigError`/`PolicyBlocked` outcomes. Rationale: scrubbing would silently disable an operator's offline mode. Verify: reading heuristic against `BannedSymbols`/`Scrubbed` array length 7; contested (section 5).
16. **Decode with tolerance for both document shapes.** Accept compact (0.6.5) and pretty (main) documents; require only `exit_code` and `error.kind`. Verify: two fixture documents in `tests/` (one per version) both decode.

## AI-agent angle

| What an LLM characteristically gets wrong | Smallest mechanical check |
|---|---|
| Treats a non-zero exit as "no output": `if (exit != 0) throw new Exception(stderr)` and drops the report | `rg -n -e 'ExitCode\s*!=\s*0' src/` must route to the classifier; contract test `sign-sweep` (stderr is empty there) |
| Parses stderr for the JSON error (Python Click habit) or expects the document on stderr | `rg -n -e 'Stderr.*Deserialize|Deserialize.*Stderr' src/` returns nothing |
| Puts `--json`/`--format json` after the subcommand ("per-command flag") | the composer is the only place that spells `--format`; test `format-after-sub` expects 64 |
| Believes `ocx exec` always has an ocx process to signal or kill (it is `execvp(2)` on Unix) | test `cancel-tree` asserts the chain has no ocx; never `Process.Kill()` bare (BannedSymbols CS-PROC-14) |
| Uses `Process.Kill()` or SIGTERM-first "to be polite" | `rg -n 'TermGrace' src/` default zero; `term-first` documents the 5.9 s cost |
| Assumes exit 75 means retry | `rg -n -e '== 75|TempFail' src/` only in `OcxRetry.cs`; `retry-skip` test |
| Casts child exit to `byte` or assumes `% 256` on every OS (Linux 300 -> 44, Windows 300) | `rg -n -e '\(byte\)\s*\w*Exit' src/` returns nothing |
| Treats `login` exit 0 as proof the password works | doc-comment review; PROC-R-07 `wrong` row |
| Pipes `"pw\r\n"` or `Encoding.UTF8.GetPreamble()` + bytes into `--password-stdin` | BannedSymbols `P:System.Text.Encoding.UTF8`; test reads stored bytes |
| Hallucinated flags/subcommands (`ocx --version --json`, `ocx exec --json`, `ocx version --format=json`) | every argv is composed from `cli.json` names; the schema-diff test fails on an unknown command |
| Assumes the `version` string identifies the protocol | `rg -n 'Version' src/Handshake*.cs` shows no comparison |
| .NET Framework-era advice: `ProcessStartInfo.Arguments` string, `UseShellExecute` true, `WaitForExit()` sync, `Process.Start("ocx", "...")` | BannedSymbols rows already in the 25-line fragment (CS-PROC-01/02/09) |
| Assumes a Windows `ocx` is a shim/job and so skips tree kill | `rg -n 'entireProcessTree' src/` must show `true` |

## Contested / evolving

- **Unreleased contract.** Everything marked "main" lives in 15 commits ahead of v0.6.5 (`v0.6.5-15-g3485207c1`); the earlier audit records PR #604 rolling error/report schema versions back to 1 in place. The `detail` field set, `contract.errors`, and the error document `schema_version` can still move. Trend: stabilisation toward a first baseline; as of 2026-10-11 nothing is frozen.
- **Who classifies passthrough failures.** The `OcxErrorDocument` flag is a heuristic: a tool can print a document with matching `exit_code`. Options: accept it (documented), or ask ocx for a sideband (an `OCX_*` env-controlled marker or a distinct exit range). No upstream position known.
- **`login` verification.** Exit 0 for a wrong password against a Basic-realm registry is arguably an ocx bug (the stated intent is to verify before storing). If fixed, the `wrong` row flips to 80 and rule 12 can relax; until then the SDK must not promise validation.
- **Scrub breadth.** Seven keys are scrubbed; `OCX_OFFLINE`, `OCX_FROZEN`, `OCX_NO_CONSENT`, `OCX_CONFIG`, `OCX_INDEX`, `OCX_REMOTE`, `OCX_DEFAULT_REGISTRY` flow through. Python SDK and the Rust SDK differ (drop-all `OCX_*` vs a list). Hermetic-by-default favours dropping more; user-intent favours less. Owner decision.
- **Tree kill on Windows.** `Kill(entireProcessTree: true)` is a snapshot-and-walk, not a job; races with grandchildren spawned between enumeration and termination are possible by design ("this method can return before stopping has completed" in the runtime comment). For ocx-launched tools (single chain) it was complete; a tool that double-forks is out of scope.
- **.NET 11 / C# 15 (RC1).** Not exercised here. The wave-2 `#if NET11_0_OR_GREATER` signal API remains the only version-specific piece; nothing in this revision depends on it.
- **macOS and arm64.** Unverified: `ocx exec` replacement semantics are Unix-generic by source (`#[cfg(unix)]`), but no Apple or arm64 run was made.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process.kill?view=net-10.0 | `Process.Kill(bool entireProcessTree)` reference | net10.0, updated 2026-09 | exact exceptions (AggregateException on partial tree), "WaitForExit does not reflect descendants", silent skip of unreadable processes |
| https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects | Win32 job object concepts | 2025-07 | default job inheritance for CreateProcess children, `KILL_ON_JOB_CLOSE` semantics, nested jobs (Windows 8+) |
| https://raw.githubusercontent.com/dotnet/runtime/v10.0.0/src/libraries/System.Diagnostics.Process/src/System/Diagnostics/Process.Win32.cs | real source of `KillTree` on Windows | .NET 10.0.0 | kill-then-walk order, `IsParentOf` = parent pid + later start time (lines 329-333, 372-409) |
| https://raw.githubusercontent.com/dotnet/runtime/v10.0.0/src/libraries/System.Diagnostics.Process/src/System/Diagnostics/Process.Unix.cs | real source of `KillTree` on Unix | .NET 10.0.0 | SIGSTOP, enumerate, SIGKILL, recurse (lines 94-141) |
| https://raw.githubusercontent.com/dotnet/runtime/v10.0.0/src/libraries/System.Diagnostics.Process/src/System/Diagnostics/Process.NonUap.cs | real source of `Kill(bool)` entry | .NET 10.0.0 | refuses a tree that contains the calling process; aggregates failures |
| https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process.waitforexitasync?view=net-10.0 | `WaitForExitAsync(CancellationToken)` | net10.0 | completes on exit or cancellation; exception stored in the task |
| https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createprocessw | `CreateProcessW` reference | 2025-07 | handle inheritance, `lpApplicationName` search rules (the shim's CWE-428 note), environment block semantics |
| https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.processstartinfo.environment?view=net-10.0 | `ProcessStartInfo.Environment` | net10.0, 2026-08 | mutate the dictionary, `UseShellExecute` must be false |
| https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/tasklist | `tasklist` filters (`/fi "IMAGENAME eq ..." /nh /fo csv`) | 2026-02 | the before/after evidence command |
| https://bixense.com/clicolors/ | CLICOLOR / CLICOLOR_FORCE convention | deprecated page, still the de-facto rule | `CLICOLOR_FORCE` forces colour on non-tty; precedence with `NO_COLOR` |
| https://no-color.org/ | NO_COLOR standard | current | command-line arguments override the variable (basis for `--color never`) |
| https://distribution.github.io/distribution/about/deploying/ | registry:2 deployment, htpasswd auth | current | bcrypt-only htpasswd, `REGISTRY_AUTH_*` variables, TLS caveat |
| https://docs.docker.com/reference/cli/docker/login/ | `docker login --password-stdin` | current | stdin keeps secrets out of history; silent on newline handling |
| https://docs.rs/tokio/latest/tokio/process/struct.Command.html#method.kill_on_drop | tokio `kill_on_drop` | current | why ocx's Windows spawn path kills only the direct child on drop, no descendants |
| ocx@3485207c1 (local clone `/home/mherwig/dev/ocx`): `crates/ocx_cli/src/command/{login,package_push,contract,exec,self_group/update}.rs`, `crates/ocx_package_manager/src/launch/child_process.rs`, `crates/ocx_shim/src/{main,core}.rs`, `crates/ocx_config/src/env.rs`, `crates/ocx_schema/tests/golden/{errors,cli}.json` | the real CLI source and contract goldens | 2026-10-10 | every behaviour above has its line (login.rs:83, package_push.rs:501, child_process.rs:65-68,136, main.rs:285, env.rs:627) |
| external/rust-oci-client@3ee5a1f (`src/client.rs:1063-1074`) | the vendored OCI client's `auth` | same checkout | why `login` against a Basic realm verifies nothing |
| fixture:engine, fixture:driver, fixture:logs/* | the wave-2 engine, the real-ocx driver and every run transcript | 2026-10-10/11 | the executable evidence for each PROC-R-nn row |
