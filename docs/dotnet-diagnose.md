# dotnet-diagnose

A triage-ordered diagnosis skill for a .NET build, restore, analyzer run, publish, test or process that is already failing. It starts from the first diagnostic by position, never the loudest line, and routes each symptom to the one measurement that names the cause. It never fixes by silencing.

```sh
grim add ghcr.io/ocx-sh/lore/dotnet-diagnose
```

Run it on `A compatible .NET SDK was not found`, `MSB4242`, `NU1605`, `NU1510`, `NETSDK1045`, `IL2026`, `IL3050`, "Zero tests ran", "exit code 8", or "the build hangs". Install the bundle (`csharp-quality` and `dotnet-build` with it), because it cites their rule IDs. Do not use it to move a solution to a new SDK (`dotnet-upgrade`) or to cut a release (`dotnet-release`).

## The triage order

One order, fixed: SDK resolution, restore, project and MSBuild, compile, analyzers, trim and AOT, tests, then hangs and no-diagnostic failures. SDK comes first on purpose. A malformed `global.json` silently selects the newest installed SDK, prerelease included (SDK 11.0.100-rc.1 on the measuring host, measured 2026-10-11), which can change which restore codes exist, and the visible failure is an unrelated MSB4242 cascade. `dotnet --version` is one line and settles it.

The catalogue is `references/catalogue.md`, 74 rows numbered DN-DIAG-01 to DN-DIAG-79 (five retired, never reused), grouped in that order. Each row names the symptom as the tool prints it, the cause as a mechanism, the fix and the check that proves it. An era tag marks whether a row is the same on SDK 8.0.425 and SDK 10.0.401 (`all`), new in .NET 10 (`net10`), seen only on SDK 8 (`net8-SDK`) or on netstandard2.0 (`ns2.0`), or measured only on the 11.0 RC1 (`net11-RC1`). A failure that prints `error :` or no code at all has its own routing table by message and file.

## What it does differently

Exit 0 is not evidence. It has been measured meaning a publish with IL warnings whose artifact then crashes with exit 134, an SDK 8 `dotnet test` that ran no test, a VSTest filter that matched nothing and a restore that passed on a warm package cache. A fix is proved by a zero diagnostic count on the same command, not by a changed exit code.

Eleven blockers go to the owner and are never worked around: feed credentials, an SDK install, a new package source, a target-framework change, a SHA1 signing policy, a missing shared runtime, a package with no trim-safe replacement, a process the agent did not start, a missing native toolchain, config above the repository and a missing `csharp-quality` install (DN-RULE-06). Under Microsoft.Testing.Platform the knobs go in the environment, not on `dotnet test`, because `--tl:off` and `--interactive false` make the test app report "Zero tests ran" with exit 5 (measured 2026-10-11, SDK 10.0.401).

## What agents get wrong by default

Measured 2026-10-11 on SDK 10.0.401 and SDK 8.0.425, Linux x64. Agents read the last lines of the log and fix a cascade or the summary copy, because diagnostics print twice and MSB3073 is a wrapper. They reach for `NoWarn`: CS1591 is muted in 19 of 35 exemplar repositories. They paste CLI-wide flags onto `dotnet test`, get exit 5 and delete the test gate. They trust a warm-cache restore after a source fix. They widen `rollForward` or delete `global.json` to get past exit 155.

## The receipt

Every run ends on the CS-CORE-03 receipt: the stage, the first code by position, the catalogue row, the fix, the command, its exit code, the code's count before and after and the tree. A run that stopped at an owner handoff names the blocker and the one-line request instead of a count. Before it, `weaken-check.sh` runs against the merge target, and each line it prints needs a written reason.

## What it does not cover

macOS, arm64 and Windows rows are `unverified: read only`, and the rows that touch them say so. F#, Visual Basic and desktop UI frameworks are not covered. Writing the standards it cites is `csharp-quality` and `dotnet-build`.

## Siblings

`csharp-quality` and `dotnet-build` own the rules this skill cites and the checks it runs. `dotnet-upgrade` moves a solution forward and hands any failure it cannot name to this skill. Bundled with them as `dotnet-essentials`.
