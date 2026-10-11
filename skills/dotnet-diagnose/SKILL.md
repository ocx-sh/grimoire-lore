---
name: dotnet-diagnose
description: 'Symptom-routed diagnosis of a .NET restore, build, analyzer, trim or test run that is already failing with no SDK or target-framework migration in progress, from a missing SDK to a hung build. Use when someone reports "A compatible .NET SDK was not found" (exit 155), MSB1003 or MSB1011 (no project to build), MSB4242, MSB3202, NU1605, NU1102 or NU1301 on restore, NU1008, NETSDK1045, MSB3073, CS0246, CS9057, IL2026 or IL3050 outside a release run, a build error with no code (`error :`), "Zero tests ran" (exit code 5 or 8), a VSTest filter that ran nothing, a missing shared runtime at test time, "Test Run Aborted" on a net4x test module, "All projects must use that test runner", a failing test, or "the build hangs" or leaves dotnet processes behind. Not for writing new code (csharp-quality), the build standards (dotnet-build), a failure that follows an SDK, target-framework or AnalysisLevel change (dotnet-upgrade), or cutting a release (dotnet-release).'
license: Apache-2.0
metadata:
  summary: Routes a failing dotnet command by stage (SDK, restore, project, compile, analyzers, trim, test, hang) to one catalogue row, code-less errors included, fixes the first diagnostic and proves it by a zero count, measured on SDK 10.0.401 and 8.0.425
  keywords: dotnet,diagnose,debugging,msbuild,nuget,restore,sdk,global-json,analyzers,trim,aot,microsoft-testing-platform,exit-code,hang,build-server
---

# dotnet-diagnose

A .NET command is already failing: no SDK, a restore that stops, a build that
errors or hangs, an analyzer that never loads, a publish that crashes, a test run
that ran nothing. This skill routes the symptom to one catalogue row, applies the
fix, and proves it. It carries the procedure only. The standards live in the
`csharp-quality` and `dotnet-build` rules, and this skill cites them by ID (DN-RULE
rules bind every `dotnet` call, CS-CORE-01 and CS-CORE-03 bind the fix, CS-BUILD
rows are cited from the catalogue).

Every command was run on **SDK 10.0.401 and 8.0.425, Linux x64, on 2026-10-11**,
with SDK 11.0.100-rc.1.26425.128 for the `net11-RC1` rows. Rows tagged
`unverified: read only` were not re-run. The DN-DIAG rows are in
[references/catalogue.md](references/catalogue.md), one table per stage, each row
with its code, exact first line, cause, fix, a zero-count proof and its era.

Contents: [Triage order](#triage-order) · [Capture](#capture) ·
[Procedure](#procedure) · [Stage notes](#stage-notes) · [Errors with no code](#errors-with-no-code) ·
[Test exit codes](#test-exit-codes) ·
[Owner handoff](#owner-handoff) · [Hang capture](#hang-capture) ·
[Never silence](#never-silence) · [Receipt](#receipt)

## Triage order

Go top to bottom and stop at the first stage that fails. A failure in an earlier
stage makes every later message a cascade: a restore error stops the build, so each
CS error after an NU error is noise. SDK comes first because the newest SDK,
a prerelease included, runs whenever `global.json` is ignored (malformed, no `sdk` key, or below
the working directory) or is absent (`global.json file:` then `Not found`), and the visible failure is an unrelated MSB4242 cascade (DN-DIAG-02).
`dotnet --version` is one line and `dotnet --info` names the file it read.

| Stage | Run | The symptom starts with | Rows |
|---|---|---|---|
| 1 SDK | `dotnet --version` | exit 155, `A compatible .NET SDK was not found`, MSB4242, NETSDK1045, an SDK you did not pin | DN-DIAG-01 to 05 |
| 2 Restore | `dotnet restore "$SLN" --force` | `NU1xxx`, `NU5104`, MSB3202 | DN-DIAG-06 to 22, 68 |
| 3 Project and MSBuild | `dotnet build "$SLN" --no-incremental` | `MSB`, `NETSDK`, `error :` from a `.targets` file, a property that "does not apply" | DN-DIAG-23 to 35, 67, 72, 73 |
| 4 Compile | `dotnet build "$SLN" --no-incremental` | `CS`, or `Unhandled exception` from the compiler | DN-DIAG-36 to 43, 69 |
| 5 Analyzers | `dotnet build "$SLN" --no-incremental` | `CS9057`, `IDE`, `CA`, `CS1591`, a severity no tracked file sets | DN-DIAG-44 to 48, 75 |
| 6 Trim, AOT, publish | `dotnet publish "$APP" -c Release -f "$TFM"` (an app project only, [Stage notes](#stage-notes)) | `IL`, `CONTAINER`, `NETSDK1129`, `collect2 : error : ld returned 1`, an artifact that dies at run time | DN-DIAG-49 to 56, 74, 76 |
| 7 Test | `dotnet test "$SLN" --no-build` | `Zero tests ran`, `Exit code:` (150 included), `exit code: N` with no `Exit code:` line, `No test matches`, `Testhost process ... exited with error`, `Test Run Aborted`, `All projects must use that test runner`, a `  Failed X` or `failed X` line | DN-DIAG-57 to 62, 70, 71, 77 to 79 |
| 8 Hang | the same command under `timeout` | exit 124, silence, leftover processes | DN-DIAG-63 to 66 |

## Capture

Name the operand first. A bare `dotnet restore` or `build` stops at MSB1003 (no project
file in the folder) or MSB1011 (several) in four of six held-out trees (DN-DIAG-33,
DN-DIAG-73). `SLN` is the one solution or project file the repository builds, `R` the
repository root. The block runs under bash 4 or newer and takes the solution named like the
repository (the part after `__` of a `owner__repo` folder), else the one solution beside a
`global.json` (or at the root):

```sh
R=$(git rev-parse --show-toplevel); cd "$R"
SLNS=$(git ls-files '*.slnx' '*.sln')
SLN=$(echo "$SLNS" | grep -i -E "(^|/)$(basename "$R" | sed 's/.*__//')\.slnx?$" | head -1)
if [ -z "$SLN" ]; then
  for G in $(git ls-files '*global.json') global.json; do
    P=$(dirname "$G")/; P=${P#./}
    C=$(echo "$SLNS" | grep -E "^$P[^/]+$")
    [ "$(echo "$C" | grep -c .)" = 1 ] && { SLN=$C; break; }
  done
fi
: "${SLN:?MISSING SLN}"
```

`MISSING SLN` means neither rule found one file (OpenTelemetry: several solutions). Take the file the CI names:
`grep -rn -e 'dotnet build' -e solutionFile -e '\.slnx\?' .github` (Refit: `solutionFile: Refit.slnx`).
Anything else: ask the owner which file the build uses (DN-RULE-06) and set `SLN` to it.

Run every capture from the folder of the nearest `global.json` at or above the solution,
because `dotnet` reads only that file, for the SDK pin and for the `test.runner` key
(Refit keeps `src/global.json` beside `src/Refit.slnx`; from the root its runner key is never
read, DN-DIAG-60). Each shell call forgets these variables, so repeat the block in the call
that runs the capture. From `D` a `git` pathspec sees only that folder: use `git -C "$R"`
for a repository-wide list.

```sh
D=$(dirname "$SLN"); until [ -f "$R/$D/global.json" ] || [ "$D" = . ]; do D=$(dirname "$D"); done
SLN=$R/$SLN; cd "$R/$D"
```

Never run a bare `dotnet` command (DN-RULE-01). Bound it by wall clock, send all
output to a file, print the exit status, read the file. Redirecting also turns the
Terminal Logger off and defaults `--interactive` to false. Put the CLI-wide knobs
in the environment (DN-RULE-02) and use the flags only on `restore`, `build`,
`publish`, `pack` and `clean`:

```sh
export MSBUILDTERMINALLOGGER=off DOTNET_NOLOGO=1
timeout 900 dotnet restore "$SLN" --force --tl:off --interactive false --disable-build-servers -nologo -v:q > restore.log 2>&1; echo $?
timeout 900 dotnet build "$SLN" --no-incremental --tl:off --interactive false --disable-build-servers -nologo -v:q > build.log 2>&1; echo $?
timeout 900 dotnet test "$SLN" --no-build > test.log 2>&1; echo $?
```

Stage 6 publishes the application the repository ships, never the solution, a library or a test
project: `APP` is `$R/` plus one of the projects that
`git -C "$R" grep -l -E '<OutputType>(Win)?Exe|Sdk="Microsoft.NET.Sdk.(Web|Worker)"' -- '*.csproj'`
lists (drop the test projects: an MTP test project is also `Exe`),
`TFM` one of its `TargetFramework` values, and the capture is
`timeout 900 dotnet publish "$APP" -c Release -f "$TFM" --tl:off --interactive false --disable-build-servers -nologo -v:q > publish.log 2>&1; echo $?`.
A repository with no such project has no stage 6 (DN-DIAG-76).

The commands assume Linux or macOS with GNU `timeout`; on Windows run them in WSL
or Git Bash.

On a Microsoft.Testing.Platform (MTP) project `dotnet test` takes no `--nologo`,
`--tl:off`, `--interactive` or `--disable-build-servers`: each one is passed to the test
app, which reports `Zero tests ran` and exit 5 (DN-DIAG-57). A VSTest project accepts
`--nologo`, `--tl:off` and `--disable-build-servers` (1218 tests ran with the first two)
and rejects `--interactive false` with MSB1001, so keep all four off `dotnet test` either
way (DN-RULE-02). Assert the SDK before the first diagnosis (DN-RULE-03, CS-BUILD-21):
`dotnet --version` prints a version inside the band `global.json` allows, which is the
pin itself only under `rollForward` `disable`. The file that set the band is the next line:

```sh
timeout 120 dotnet --info > info.log 2>&1; grep -A3 -e 'global.json file' info.log
```

It prints the path read, or `Invalid [path]` when the file is ignored. Compare the path
with `git -C "$R" ls-files '*global.json'`: `dotnet` reads only the nearest file at or above the
working directory, so a `Src/global.json` is not read from the root, and a path outside `$R`
is a file above the checkout (DN-DIAG-02).

## Procedure

1. **Capture** the failing stage as above. Read the exit status, then the log.
2. **Extract the diagnostics once.** SDK 10.0.401 prints each one twice, and a multi-target
   project prints it once per TFM with a `[proj::TargetFramework=..]` suffix, so strip the
   suffix before `sort -u` (NSubstitute: 20 identical CS0618 lines). The code is optional in
   the pattern, because a code-less `error : ...` line (SourceLink, a compiler crash) would
   otherwise leave this list empty, and the MTP lines `error test failed:` and
   `error run failed:` carry two words before the colon (Bicep: 4 failing tests, 0 matches
   with the single-word pattern). A failing test prints no `error` line at all: VSTest
   prints `  Failed Ns.Class.Method [5 ms]`, MTP `failed Ns.Class.Method (189ms)`, so the test
   pattern below finds them (the summaries `Failed!` and `failed: 1` do not match it).
   Read `test.log` instead of `build.log` for a test failure:

   ```sh
   sed -E 's/::TargetFramework=[^]]*\]$/]/' build.log | grep -E '(error|warning)( [A-Za-z0-9]+| (test|run) failed)? ?:' | sort -u | head -20
   grep -n -m1 -E 'error( [A-Za-z0-9]+| (test|run) failed)? ?:' build.log
   grep -n -m3 -E '(error|warning) ?:' build.log
   grep -n -E '^ *[Ff]ailed [^!:]' test.log | head -20    # a failing test (DN-DIAG-79)
   ```

   The second command prints the first error by position, with or without a code. Fix
   that one (DN-RULE-03). The third prints the first code-less lines, which the sorted
   list can push past its 20 lines (MailKit: 616 coded lines around a compiler crash). MSB3073 wraps another command: the
   real error is in the lines above it (DN-DIAG-23), and `-v:q` can drop it (DN-DIAG-74).
3. **Find the row.** With a code, search the catalogue for it, for example
   `grep -n -e NU1605 references/catalogue.md`, and match the first line to be sure.
   Without a code, go to [Errors with no code](#errors-with-no-code). A code with no
   row: read the message, find the cause in the Microsoft Learn page for the code, and
   fix the cause. Do not add a row.
4. **Apply the fix in the row.** A fix that is silencing is not a fix (see
   [Never silence](#never-silence)). A fix that needs a credential, an install or a
   policy decision stops here ([Owner handoff](#owner-handoff)).
5. **Capture again and read the count.** The row's Verification cell is a zero
   count of its code or message. Exit 0 alone proves nothing: it has been measured over a
   publish whose artifact then crashed, over a `dotnet test` that ran no test (SDK 8 on
   an MTP project, a VSTest filter that matched nothing), and over a restore that passed
   only on a warm cache (DN-RULE-05, DN-RULE-07). Prove a restore fix into a packages
   folder that starts empty (DN-RULE-05). The folder sits on the working disk, beside the
   repository (`dirname "$R"`), and goes after the capture: an empty-folder restore wrote 0.5 to 2 GB on the four
   round trees (`du -sh "$P"` prints it per tree), and a `mktemp -d` left on a tmpfs filled it. `--no-http-cache` is part
   of the proof: the HTTP cache serves a dead feed's index and packages, so an empty `--packages` folder alone restored
   green with the network down, and gave NU1301 only with the flag:

   ```sh
   P=$(mktemp -d "$(dirname "$R")/.pkgs.XXXXXX")
   timeout 900 dotnet restore "$SLN" --force --no-http-cache --packages "$P" --tl:off --interactive false --disable-build-servers -nologo -v:q > restore.log 2>&1; echo $?
   grep -c -e NU1605 restore.log    # the row's count, read before the folder goes
   rm -rf "$P"
   timeout 900 dotnet restore "$SLN" --tl:off --interactive false --disable-build-servers -nologo -v:q > again.log 2>&1; echo $?
   ```

   The last restore repoints `obj` at a folder that exists and must print `0`: with the
   packages folder gone and no restore after it, `dotnet build --no-restore` exits 1 with
   NETSDK1064 and `dotnet test --no-build` exits 0 and runs nothing (measured, "Skipping
   running test"). The same two lines close any other proof that points `obj` elsewhere.

6. **Next code.** Repeat from step 2 until the stage is clean, then run the next
   stage. Stop when the original failing command exits 0 and its code count is 0.
7. **Write the [receipt](#receipt).**

## Stage notes

The traps an agent hits without being told. The rows have the rest.

| Stage | Trap | Row |
|---|---|---|
| 1 | `dnx` ignores `global.json`, so a script can run SDK 11 RC1 while `dotnet --version` says 8.0.425. Use `dotnet tool run` | DN-DIAG-05 |
| 1 | `"version": "10.0"` is accepted silently. It needs three parts | DN-DIAG-03 |
| 1 | A `global.json` with no `sdk` key (only `msbuild-sdks`, or only `test`), a malformed one, one below the working directory, or none at all (`global.json file:` then `Not found`) is ignored, and the newest SDK, an RC included, runs. `dotnet --version` printing the pin is not the test: read `dotnet --info` | DN-DIAG-02 |
| 1 | A `latestPatch` pin ahead of every installed SDK in its band (10.0.402 against 10.0.401) is exit 155: read `Installed SDKs` before asking for an install | DN-DIAG-01 |
| 2 | A warm package cache and a warm HTTP cache hide a dead source, so a green restore proves nothing until it ran into an empty folder with `--no-http-cache` | DN-DIAG-10 |
| 3 | A nested `Directory.Build.props` shadows the root, and `TreatWarningsAsErrors` silently drops to warnings with exit 0. Read the property from a project below the nested file with `timeout 120 dotnet msbuild "$PRJ" -getProperty:TreatWarningsAsErrors` before editing anything. A solution gives MSB1063 | DN-DIAG-35 |
| 3 | `.slnx` is not a solution to SDK 8: `dotnet build x.slnx` is MSB4068, and a folder holding only one is MSB1003 | DN-DIAG-73 |
| 5 | A severity that `git grep` cannot find is set by an `.editorconfig` or `.globalconfig` above the repository root: list the sources with `dotnet msbuild "$PRJ" -p:TargetFramework=net10.0 -getItem:EditorConfigFiles,GlobalAnalyzerConfigFiles` (one TFM of the project: a multi-target project lists nothing without it). `root = true` ends only the `.editorconfig` search; a parent `.globalconfig` still applies | DN-DIAG-75 |
| 5 | CS9057 follows the SDK, not the TFM. An analyzer that fails to load enforces nothing, so muting it hides every later finding | DN-DIAG-44 |
| 6 | `dotnet publish` is for an application project, with `-f`. A multi-target library or a solution gives NETSDK1129: skip stage 6 for a library | DN-DIAG-76 |
| 6 | A `-v:q` capture keeps only `collect2 : error : ld returned 1` of a native link failure; the `cannot find -lz` line needs `-v:m` | DN-DIAG-74 |
| 6 | Without `TreatWarningsAsErrors` a publish with IL warnings exits 0 and the artifact crashes with exit 134. Run the artifact. A zero IL count counts only when `NoWarn` and `SuppressTrimAnalysisWarnings` suppress no IL code | DN-DIAG-49 |
| 6 | A single-file exe copied alone loses its native sidecar. Run a copy of the unit that ships | DN-DIAG-55 |
| 7 | A VSTest filter that matches nothing exits 0 and prints no `Passed!` line. The proof is `Passed!` with `Total` above 0 | DN-DIAG-71 |
| 7 | An MTP exit 150 is a missing shared runtime, not a test failure | DN-DIAG-70 |
| 7 | A net4x test module on Linux or macOS aborts the run (exit 1) while the other TFMs print `Passed!`: rerun each runnable TFM with `-f` | DN-DIAG-77 |
| 7 | With `test.runner` set to MTP in `global.json`, one VSTest project (a benchmark with `IsTestProject` true) makes `dotnet test` refuse the whole solution | DN-DIAG-78 |

## Errors with no code

Some of the commonest host, checkout and test failures print `error :` or no `error` line, so a
code-only filter shows an empty list. The step 2 pattern keeps the code optional. Route
a code-less line by its message and by the file named before its `(line,col)`:

| The message starts | File named | Row |
|---|---|---|
| `Error reading git repository information: Unsupported repository version` | `Microsoft.Build.Tasks.Git.targets` | DN-DIAG-67 |
| `Unhandled exception. Interop+Crypto+OpenSslCryptographicException`, ending `invalid digest` | `Microsoft.CSharp.Core.targets` | DN-DIAG-69 |
| `Testhost process for source(s) ... exited with error: You must install or update .NET`, or MTP `Exit code: 150` with the same text | none | DN-DIAG-70 |
| `collect2 : error : ld returned 1 exit status` (a native AOT link) | the project file, no line | DN-DIAG-74 |
| `Could not find 'mono' host` or `Running .NET Framework tests is supported on Windows only.`, then `Test Run Aborted.` | none | DN-DIAG-77 |
| `global.json defines test runner to be Microsoft.Testing.Platform. All projects must use that test runner.` | none | DN-DIAG-78 |
| `  Failed Ns.Class.Method [5 ms]` (VSTest) or `failed Ns.Class.Method (189ms)` (MTP), then an assertion text | none | DN-DIAG-79 |
| anything else | any | no row: the action below |

A line that only wraps a tool (`collect2`, an `Exec` that exits non-zero) has lost the tool's own stderr at
`-v:q`: rerun the same capture once at `-v:m` into a second log (`build-m.log`) and read the lines above the
wrapper there (Refit's AOT link showed `cannot find -lz` only at `-v:m`).

No row, one action: print the lines around the first match (`grep -n -m1 -A6 -E 'error( [A-Za-z0-9]+)? ?:' build.log`),
open the emitting file at the line it names and read the target that raised it, and fix
the cause the message names under [Never silence](#never-silence). A cause that needs an
install, a credential or a policy decision is an [Owner handoff](#owner-handoff). Anything
else is reported as a finding with the command, the exit status and the log line. Do not
add a row.

## Test exit codes

This table is for a Microsoft.Testing.Platform (MTP) project; read its exits by number
(DN-RULE-07). A VSTest project (a `Microsoft.NET.Test.Sdk` reference) has none of them:
it exits 0 or 1, rejects `--minimum-expected-tests` with MSB1001, and a filter or an
empty assembly that runs no test still exits 0 (DN-DIAG-71). Its proof is a `Passed!`
line with `Total` above 0 per project. The MTP proof is the summary block: `grep -c -e 'Test run summary: Passed' test.log`
prints 1 or more, and `grep -c -E 'total: +[1-9]' test.log` prints 1 or more. Exit 1 (the `mono` module), 5, 8, 9 and 150 were
measured on SDK 10.0.401 with `xunit.v3.mtp-v2` 4.0.2 (2026-10-11); exit 2 on Ocelot's `xunit.v3` unit tests; 3 and 7 are
unverified: read only.

| Exit | Meaning | Row |
|---|---|---|
| 1 | Generic failure with `0 failed`: a test module could not start (a `net48` module on a non-Windows host: `Win32Exception ... start process 'mono'`, and on SDK 11 RC1 `error NETSDK1243`), or `dotnet test` refused a mixed-runner solution. Read the first exception, then test each runnable TFM or project on its own, as the CI does | DN-DIAG-77, DN-DIAG-78 |
| 2 | At least one test failed (`failed X (12ms)`, then `Test run summary: Failed!`) | DN-DIAG-79 |
| 3 | The session was aborted | none |
| 5 | Invalid arguments. Run `dotnet run --project TESTPROJECT -- <the same arguments>` to see `Unknown option`, because `dotnet test` hides the reason | DN-DIAG-57 |
| 7 | The test host crashed or hung. Unverified: read only. Without the crash-dump extension a crash surfaces the native exit instead (134 on Linux, `non-success exit code: 134` in the log). Rerun with the hang and crash dump extensions | DN-DIAG-62 |
| 8 | Zero tests ran. Never ignore it. Gate every run with `--minimum-expected-tests N` | DN-DIAG-58 |
| 9 | Fewer tests ran than the minimum | DN-DIAG-59 |
| 150 | The apphost found no matching shared runtime (`You must install or update .NET`): owner handoff | DN-DIAG-70 |

On SDK 10 an MTP project needs `"test": {"runner": "Microsoft.Testing.Platform"}`
in `global.json` (DN-DIAG-60). On SDK 8 the same project exits 0 and runs nothing
(DN-DIAG-61), so read for a `Passed!` or `Failed!` line, not for the exit status.

## Owner handoff

Stop and hand these to the owner in one line with the exact unblocking command
(DN-RULE-06). Each needs a credential, an install or a policy decision, and none
is the agent's to make. `--interactive` changes nothing against a 401.

| Blocker | Recognised by | One-line handoff |
|---|---|---|
| Feed credentials | NU1301 with `401 (Unauthorized)` or 403 | "Blocked: feed returned 401. Provide the feed credential (token variable or credential provider) in this shell, then I rerun restore." |
| SDK install | exit 155, `A compatible .NET SDK was not found`, and no installed SDK in the pin's band (`Installed SDKs`, DN-DIAG-01) | "Blocked: SDK 10.0.401 is not installed. Install it, then I rerun `dotnet --version`." Never delete `global.json` or widen `rollForward` |
| New package source | NU1101 or NU1102 where only an unmapped source carries the package | "Blocked: acme.b is not on a mapped source. Add the source and its mapping to `nuget.config`, or name another package." |
| TFM change | NETSDK1045 with no installed SDK that supports the TFM (`dotnet --list-sdks`), NU1202 with no lower version, any lowering or removal of a TFM | "Blocked: needs a TFM decision. Install a newer SDK, or confirm dropping net8.0." |
| SHA1 signing policy | `invalid digest` from strong-name signing (DN-DIAG-69) | "Blocked: this host's OpenSSL policy refuses SHA1 signatures, which strong-name signing needs. Set `OPENSSL_ENABLE_SHA1_SIGNATURES=1` in this job's environment, then I rerun the build." |
| Missing shared runtime | `You must install or update .NET to run this application` at test time, or MTP exit 150 (DN-DIAG-70) | "Blocked: Microsoft.NETCore.App 9.0 is not installed. Install it, or approve running net9.0 tests on a newer runtime, then I rerun the tests." `DOTNET_ROLL_FORWARD` counts as widening `rollForward`: never set it to get green |
| No trim-safe package | IL2104 or IL3053 and no replacement exists | "Blocked: the package is not trim-safe and has no replacement. Choose one, or drop the trimmed mode." |
| A process the agent did not start | MSB3027 names it | "Blocked: process App (43792) holds the apphost. Stop it, then I rerun the build." |
| Missing native toolchain | `cannot find -lz` or `clang: not found` at `-v:m` under `collect2 : error : ld returned 1` (DN-DIAG-74) | "Blocked: the native link needs clang and zlib headers. Install `clang` and `zlib1g-dev` (`zlib-devel` on Fedora), then I rerun the publish." |
| Config above the repository | a path outside `$R` from `dotnet --info` or `-getItem:EditorConfigFiles,GlobalAnalyzerConfigFiles` (DN-DIAG-02, DN-DIAG-75) | "Blocked: /path/.editorconfig, outside the repository, sets CS0168 to error. Remove it, or approve `root = true` in the repository's own `.editorconfig`, then I rerun the build." For a `.globalconfig`, `root = true` does nothing: "Remove it, or approve a repository `.globalconfig` with `global_level = 101` that sets the severity back." |
| The `csharp-quality` rule is not installed | `MISSING weaken-check.sh` from the Never silence block | "Blocked: the weaken check ships in `csharp-quality`, which is not installed. Install the `dotnet-essentials` bundle, then I rerun it." |

## Hang capture

A hang prints nothing, so bound every command first (DN-RULE-01). Exit 124 from
`timeout` means the command hung. Work in this order, and stop when the hang clears:

1. **Look for an `Exec` that backgrounds a child** (DN-RULE-08). The child holds the
   output pipe open and `Exec` waits for it: the build ends tens of seconds late with the child
   still alive, and `Timeout` does not shorten the wait (DN-DIAG-63). A background `&amp;` anywhere in an `Exec` `Command` (multi-line, single-quoted and lower-case `<exec command=` included), unless both stdout and stderr are redirected, is the shape; this is the DN-RULE-08 block, run from `$R`:

   ```sh
   (cd "$R" && git ls-files -z --cached --others --exclude-standard -- '*.csproj' '*.props' '*.targets' '*.proj' '*.projitems' '*.msbuildproj' | xargs -0 -r perl -0777 -ne 'while (/<Exec\b[^>]*?\bCommand=(["\x27])(.*?)\1/gsi) { my ($c, $at) = ($2, $-[0]); next unless $c =~ /(?<!&amp;)(?<!&gt;)&amp;(?!&amp;|&gt;)/; next if $c =~ /&amp;&gt;/ || ($c =~ /(?<![2&;])&gt;/ && $c =~ /2&gt;/); printf "%s:%d: %s\n", $ARGV, 1 + (substr($_, 0, $at) =~ tr/\n//), $c =~ s/\s+/ /gr }')
   ```

   Output is a violation. Redirect the child's stdio. Where only the exit code
   should count, set `IgnoreStandardErrorWarningFormat="true"`.
2. **List what is alive in this tree.** A host-wide `ps | grep dotnet` prints every build of every
   job (37 lines on a shared host, one of them this tree's). Print only the processes whose working
   directory is under `$R`, which is where an `Exec` child starts (Linux or WSL, `/proc`). A leftover
   `sleep 300` shows with parent 1; an `Exec` with a `WorkingDirectory` outside the tree is the one miss:

   ```sh
   for d in /proc/[0-9]*; do p=${d#/proc/}; [ "$p" = "$$" ] && continue; case $(readlink "$d/cwd" 2>/dev/null) in "$R"|"$R"/*) ps -o pid=,ppid=,etimes=,args= -p "$p";; esac; done
   ```

   Build servers (VBCSCompiler, MSBuild nodes) run in another folder and are shared by every
   build of the user: count them with `pgrep -u "$(id -u)" -fc 'VBCSCompiler|MSBuild.dll'` before the
   capture and after it, and a count that rose is this job's.
3. **Shut the servers down** as the first response to a silent hang (DN-RULE-10):
   `dotnet build-server shutdown`. It is host-wide: on a host running other builds, read
   the step 2 server count first and hand the shutdown to the owner (DN-RULE-06) when a server
   is not this job's. Then rerun with `--disable-build-servers` on
   `build`, `publish` and `restore` only (DN-DIAG-64).
4. **A test host that hangs or crashes** (MTP exit 7): add the hang and crash dump
   packages and rerun with `--hangdump --hangdump-timeout 15m` and `--crashdump`
   (DN-DIAG-62).
5. **A silent wait on a feed** is a credential-provider prompt. The DN-RULE-01
   redirect defaults `--interactive` off, so a hang that survives it is not a prompt
   (DN-DIAG-66).

Touch only a process you started. Killing another one is an owner decision
(DN-RULE-06). A hang you cannot clear is a finding: report the capture, the
`ps` list and the last log line, not a raised timeout.

## Never silence

Making the code disappear by changing the check is the failure this skill exists to
prevent. Each of these is a violation, not a fix:

| # | Finding | Rule |
|---|---|---|
| 1 | `NoWarn` on NU1605, NU1608, NU1510, NU1701, NU1900 to NU1905, MSB3277, CS9057, CS8032 or an IL2xxx or IL3xxx code | DN-RULE-04, CS-CORE-01 |
| 2 | `IgnoreExitCode="true"` (except on an `Exec` that captures and acts on its `ExitCode`), `--ignore-exit-code`, `NuGetAuditMode` set to `direct`, `RestoreEnablePackagePruning` set to false | DN-RULE-04, CS-CORE-01 |
| 3 | `#pragma warning disable` or `[SuppressMessage]` with no reason, a lowered `dotnet_diagnostic` severity, a deleted `BannedSymbols` line | CS-CORE-01 |
| 4 | `--ignore-exit-code 8`, a lowered `--minimum-expected-tests`, a `Skip` with no reason, a deleted test | DN-RULE-07, CS-CORE-01 |
| 5 | Widening `rollForward` (`global.json`, a project `RollForward`, or `DOTNET_ROLL_FORWARD`), deleting `global.json`, or lowering a TFM to escape a code | DN-RULE-06 |
| 6 | Raising an `Exec` `Timeout` or the apphost copy retry count so the wait ends | DN-RULE-08 |
| 7 | `-p:TreatWarningsAsErrors=false` on the command line | CS-CORE-01 |
| 8 | Accepting an advisory by muting it. Accept through `NuGetAuditSuppress` | CS-BUILD-26 |

Before reporting a fix, run this from the repository root (`cd "$R"`). `W` is where the rule is
installed (the repository's `.claude/rules` or `~/.claude/rules`), and `BASE` is the merge
target, never a hard-coded `origin/main`:

```sh
W=$(find . "$HOME/.claude" -path ./.git -prune -o -path '*csharp-quality/checks/weaken-check.sh' -not -path './.agents/*' -print -quit 2>/dev/null)
: "${W:?MISSING weaken-check.sh, install csharp-quality (Owner handoff)}"
BASE=$(git symbolic-ref --short refs/remotes/origin/HEAD)
: "${BASE:?MISSING BASE}"
BASE=$BASE bash "$W"
```

Each stdout line needs a written reason, and empty stdout is the pass (CS-CORE-01).
Exit 64 means `BASE` is unset and 66 means it does not resolve (a shallow clone: fetch
the merge target with full history). A new `global.json` pin (DN-DIAG-02, no `sdk` key or `Not found`) prints every added `version`,
`rollForward` and `allowPrerelease` line (three for the CS-BUILD-20 shape, one for a pin written
on a single line): that is the expected output of a pin, and no form prints nothing. Give the reason in the
receipt ("no `sdk` key; CI `setup-dotnet` uses 10.0.x, pinned to the installed 10.0.401"). A catalogue
code is gone only when its count is zero and none of the edits above made it so.

## Receipt

Every run ends with this receipt (CS-CORE-03). A step is done when its command,
exit code and tree are named. A claim without them is a hypothesis.

```text
stage:   2 restore
code:    NU1605, first by position (restore.log line 14)
row:     DN-DIAG-07
fix:     PackageVersion acme.b 2.0.0 in Directory.Packages.props
command: timeout 900 dotnet restore --force --packages EMPTY --tl:off --interactive false --disable-build-servers -nologo -v:q
exit:    0
count:   grep -c -e NU1605 restore.log  3 -> 0
tree:    7a3f1c2, clean apart from Directory.Packages.props
```

If a stage ended at an owner handoff, the receipt names the blocker and the one-line
request instead of a count.
