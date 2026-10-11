---
name: dotnet-upgrade
description: 'Procedure for moving a .NET library from net8.0 to net10.0 on SDK 10 and C# 14, one commit per step, proved by per-TFM test counts, and for probing .NET 11 on a throwaway branch. Use when .NET 8 and 9 reach end of support on 2026-11-10, when asked to add net10.0, pin SDK 10 in global.json, move to LangVersion 14 or AnalysisLevel 10.0-all, migrate a .sln to .slnx or undo a failed upgrade, and when an SDK, target-framework or AnalysisLevel change shows NETSDK1045, "framework not found", "A compatible .NET SDK was not found", MSB1003, MSB1011, NU1510, NU1903 or IDE0370, or `dotnet test` prints "Testing with VSTest target is no longer supported by Microsoft.Testing.Platform" (the `test.runner` key of `global.json`). Not for a build that fails for another reason (dotnet-diagnose), the build standards (dotnet-build), cutting a release (dotnet-release), or migrating an application, ASP.NET, WPF, MAUI or .NET Framework project.'
license: Apache-2.0
metadata:
  summary: Order-sensitive net8.0 to net10.0 upgrade ladder for a .NET library with a tag-plus-worktree rollback, per-TFM test-count proof and dated .NET 11 re-checks, measured on SDK 8.0.425, 10.0.401 and 11.0 RC1
  keywords: dotnet,upgrade,net10,net8,sdk,global-json,tfm,target-framework,analysislevel,langversion,csharp-14,nuget-audit,nu1510,slnx,rollback,end-of-support,net11,dated-recheck
---

# dotnet-upgrade

## The order is the product. Read this before DN-UPG-00

Five facts make the order below load-bearing. An agent that changes
`TargetFramework` to `net10.0`, sees a green build and stops has skipped most of
the upgrade.

- **The SDK goes first, with the analyzers frozen.** A new SDK on a floating
  `AnalysisLevel` and a bulk severity line breaks the build for two reasons at once.
- **Audit mode is made explicit before the TFM.** The default flips to `all` when
  `net10.0` joins (measured 2026-10-11, SDK 10.0.401), so the findings would land inside
  the TFM commit.
- **Exit 0 proves nothing.** A step is done when its command, exit code and tree are
  named and the per-TFM test counts equal the baseline (CS-CORE-03).
- **Rollback is a tag plus a worktree.** A `global.json` revert alone fails with
  NETSDK1045 and MSB1003 (measured 2026-10-11, SDK 8.0.425).
- **`net9.0` is never a stop, `net11.0` is a probe branch only.** .NET 8 and 9 both end
  support on 2026-11-10, .NET 10 LTS runs to 2028-11-14, and .NET 11 reaches GA in
  November 2026.

Contents: [Scope](#scope) · [Pinned defaults](#pinned-defaults) ·
[Before DN-UPG-00](#before-dn-upg-00) · [The ladder](#the-ladder) ·
[The verification blocks](#the-verification-blocks) · [The first reds](#the-first-reds) ·
[Rollback](#rollback) · [Stop conditions](#stop-conditions) ·
[The MUST rows this procedure enforces](#the-must-rows-this-procedure-enforces) ·
[The receipt](#the-receipt)

## Scope

A .NET library or SDK package on `net8.0`, in a git repository, moving to
`net8.0;net10.0` and later to `net10.0`. Measured 2026-10-11 on Linux x64 with SDK
8.0.425, 10.0.401 and 11.0.100-rc.1.26425.128 (RC1), on a two-project test library
(`Lib` and `Lib.Tests`, VSTest, `Directory.Build.props`, central package management, a
classic `.sln`). The MTP step (DN-UPG-08) was measured on a separate `xunit.v3.mtp-v2`
4.0.2 project. Windows, macOS and arm64 are `unverified: read only`. Applications, publish
modes and `netstandard2.0` are out of scope (`dotnet-release`).

The rules are cited by ID and live in `csharp-quality` (DN-RULE, CS-CORE, CS-LANG,
CS-TEST) and `dotnet-build` (CS-BUILD). **This skill needs both installed.** The
weaken check named in the receipt lives in the `csharp-quality` `checks/` directory.
Without the rules, stop and ask. **The tree already follows `dotnet-build`**
(CS-BUILD-01, 10, 13 and 20: one TFM list in the root props, an `AnalysisLevel`,
warnings as errors, a `global.json`); otherwise stop and adopt that posture first, in
its own commits. A build that fails for a reason the ladder does not name is
`dotnet-diagnose`; tagging and publishing are `dotnet-release`.

## Pinned defaults

Each row is an agreed default an adopter overrides once, in their own repository.

| Decision | Default (2026-10-11) | Override looks like |
|---|---|---|
| Target | `net10.0` (LTS to 2028-11-14) beside `net8.0` until .NET 8 end of support | `net10.0` only, as its own major-version change after 2026-11-10 (DN-UPG-11) |
| SDK | `10.0.401`, `rollForward: latestFeature`, no prerelease, an `errorMessage` (CS-BUILD-20) | A newer 10.0 feature band in `global.json` |
| Analyzer and language level | `AnalysisLevel` `10.0-all` and `LangVersion` 14 (CS-BUILD-10, CS-BUILD-04) | A bump to `11.0-all` in its own commit after .NET 11 GA (DN-UPG-12) |
| Lock files | None for a library (CS-BUILD-25); where a repo tracks them, regenerated in the same commit as every SDK, TFM or version edit (DN-UPG-01, 05, 06, 07) and `rollForward` `disable` | None |
| Commit shape | One commit per step on an upgrade branch, `verify:` line in the body | None |

## Before DN-UPG-00

1. **Find every project and the current state.** `git ls-files '*.csproj'` lists the
   projects (empty output: not a .NET repo, stop). `git ls-files '*.sln' '*.slnx'`
   must list exactly one file, the operand of every build and test below (`SOLUTION`); none or several is S7. A repo that publishes an application is out of scope.
2. **Ask for a clean branch.** The upgrade edits `global.json`, the props and the
   solution. If `git status --porcelain -- . ':(exclude).claude' ':(exclude).agents'`
   prints anything, stop and ask the owner to commit or stash. Do the work on a branch
   other than the default branch, and never push or merge it.
3. **Write the helper file once** (block below). A shell call keeps no functions, so
   every later block starts with `. "${TMPDIR:-/tmp}/dotnet-upgrade/env.sh"`. **Blocks run under bash 4+**: zsh reads
   `$t[|)]` as a subscript and aborts with no output, so a variable before `[` is written `${t}`. `dn`
   is the DN-RULE-01 form, `prop` reads an evaluated property (DN-RULE-09) or prints `ERR(rc=N)` and counts as a finding, `pertfm`
   reads it per project and leg (an unset level or version shows the SDK default here),
   `projs` lists the governed projects, `noimp` the ones that never import the props
   (`PROPS`), `tfmlines` the TFM lines (a pure `$(Prop)` value is no list: that property's definitions stand in), `exes` builds the skipped siblings (the error set of
   a sibling that is red at `b00` is its baseline, later steps print the difference), `diags` prints each error once with
   its TFM suffix stripped, in log order (DN-RULE-03), then `warnings N` with the codes and, after a non-zero exit, `RED rc=` with the first
   uncoded `error :` and `Unhandled exception` line, `tst` runs the tests (the solution, or every leg the `norun` file does not exclude), `tests` prints one counts line per TFM (and
   the `total:` line of a Microsoft.Testing.Platform run) and `legs` proves the `net10.0`
   leg ran what the newest baseline TFM ran.

```sh
S=${TMPDIR:-/tmp}/dotnet-upgrade; mkdir -p "$S"
cat > "$S/env.sh" <<'EOF'
L=${TMPDIR:-/tmp}/dotnet-upgrade
export MSBUILDTERMINALLOGGER=off DOTNET_NOLOGO=1    # DN-RULE-02: CLI-wide knobs live in the environment
SOLUTION=$(git ls-files '*.sln' '*.slnx'); test "$(printf '%s\n' "$SOLUTION" | grep -c .)" -eq 1 || { echo "STOP S7: not one tracked solution file: ${SOLUTION:-none}"; SOLUTION=NO-SINGLE-SOLUTION-FILE.sln; }    # the operand of every build, test and restore below
PROPS=$(git ls-files '*Directory.Build.props' | awk '{print length($0), $0}' | sort -n | sed -n '1s/^[0-9]* //p')    # the props that carry the TFM list: the shallowest
SKIP=$(cat "$L/skip" 2>/dev/null)    # path regex of the sibling Exe projects the ladder leaves alone (entry table); empty when none
LP=$(cat "$L/langpin" 2>/dev/null)    # path regex of the projects that share source with a lower-language consumer and keep their LangVersion (DN-UPG-03); empty when none
ACC=$(cat "$L/accept" 2>/dev/null)    # the one diagnostic code the owner accepted in the baseline (NETSDK1138, entry table); empty when none
KEEP=$(cat "$L/keep" 2>/dev/null)    # regex of the legacy TFMs the owner keeps (the S8 answer); empty when none
NORUN=$(cat "$L/norun" 2>/dev/null)    # regex of the test legs this host cannot run (a net4x leg on Linux, S2); empty when none
OLDLVL=$(cat "$L/oldlevel" 2>/dev/null)    # the level DN-UPG-01 freezes at: upg-00 writes it (8.0-all)
test -f "$L/roll" && export DOTNET_ROLL_FORWARD=$(cat "$L/roll")    # only after S2 and the owner's yes: one value for the baseline and every later count
dn() { n=$1; shift; timeout 900 dotnet "$@" > "$L/$n.log" 2>&1; r=$?; echo $r > "$L/$n.rc"; echo "$n exit $r"; return $r; }    # DN-RULE-01: dn NAME ARGS
projs() { git ls-files '*.csproj' | grep -vE "${SKIP:-^$}"; }    # every project the ladder governs
prop() { timeout 120 dotnet msbuild "$1" -getProperty:"$2" ${3:+-p:TargetFramework=$3} > "$L/prop.out" 2> "$L/prop.err" && cat "$L/prop.out" || echo "ERR(rc=$?)"; }    # prop PROJECT PROPERTY [TFM]: the value, or ERR(rc=N) (stderr, such as MSBuild server fallback noise, stays in prop.err)
eachprop() { projs | while read -r p; do echo "$p $(prop "$p" "$1" $2)"; done; }    # eachprop PROPERTY [TFM]
pertfm() { projs | while read -r p; do f=$(prop "$p" TargetFrameworks); [ -n "$f" ] || f=$(prop "$p" TargetFramework); for t in $(echo "$f" | tr ';' ' '); do echo "$p $t $(prop "$p" "$1" "$t")"; done; done; }    # pertfm PROPERTY: project TFM value; a level or version the SDK defaults shows here too
tfmlines() { { projs | xargs -r grep -hoE '<TargetFrameworks?[^>]*>[^<]*'; git grep -hoE '<TargetFrameworks?[^>]*>[^<]*' -- '*.props' '*.targets'; } > "$L/tl.all"; seen=' '    # every TFM line the ladder governs, attributes included
  for i in 1 2 3; do for P in $(grep -oE '[$][(][A-Za-z_]+[)]' "$L/tl.all" | tr -d '$()' | sort -u); do case "$seen" in *" ${P} "*) continue;; esac; seen="${seen}${P} "; git grep -hoE "<${P}( [^>]*)?>[^<]*" -- '*.csproj' '*.props' '*.targets' >> "$L/tl.all"; done; done    # a $(Prop) in a TFM line: read that property's definitions, three levels deep
  grep -vE '^<[A-Za-z]+>[$][(][A-Za-z_]+[)]$' "$L/tl.all" | sort -u; }    # an unconditional pure $(Prop) value is no list of its own
sibs() { git ls-files '*.csproj' | grep -E "${SKIP:-^$}"; }    # the skipped sibling projects
packable() { projs | while read -r p; do test "$(prop "$p" IsPackable)" = true && test "$(prop "$p" OutputType)" = Library && echo "$p"; done; }    # the library projects that ship
noimp() { projs | while read -r p; do dotnet msbuild "$p" -pp:"$L/pp.xml" > /dev/null 2>&1; grep -qF "$PWD/$PROPS" "$L/pp.xml" || echo "$p"; done; }    # projects that never import the edited props (an isolating Directory.Build.props)
exes() { sibs | while read -r p; do k=$(basename "$p" .csproj); dn "$1-$k" build "$p"; diags "$1-$k" | sed -E 's/[(][0-9]+,[0-9]+(,[0-9]+,[0-9]+)?[)]//' > "$L/$1-$k.d"
    if [ "$1" = b00 ]; then cp "$L/$1-$k.d" "$L/base-$k.d"; cat "$L/$1-$k.d"; else diff "$L/base-$k.d" "$L/$1-$k.d"; fi; done; }    # exes STEP: build each skipped sibling once; b00 prints its diagnostics and keeps them as its baseline set, a later step prints the difference from it
diags() { d=$(grep -E '(error|warning) [A-Z]+[0-9]+:' "$L/$1.log" | sed -E 's/ \[[^]]*\]$//' | grep -vE "${ACC:-^$}")    # the diagnostics of log NAME, TFM suffix stripped (DN-RULE-03)
  printf '%s\n' "$d" | grep -E 'error [A-Z]+[0-9]+:' | awk '!s[$0]++'    # errors once each in log order: the first by position is the first line
  w=$(printf '%s\n' "$d" | grep -E 'warning [A-Z]+[0-9]+:' | sort -u); test -z "$w" || echo "warnings $(printf '%s\n' "$w" | wc -l): $(printf '%s\n' "$w" | grep -oE 'warning [A-Z]+[0-9]+' | sort | uniq -c | awk '{print $3 "x" $1}' | tr '\n' ' ')"    # a warning count with the codes, never the lines
  r=$(cat "$L/$1.rc" 2>/dev/null); test "$r" = 0 || { echo "RED rc=$r"; { grep -m1 ' error : ' "$L/$1.log"; grep -m1 'Unhandled exception' "$L/$1.log"; } | uniq; }; }    # a non-zero exit also prints the first uncoded error and crash line: a compiler crash has no code and other errors bury it (S10)
testlegs() { { pertfm IsTestProject; pertfm IsTestingPlatformApplication; } | awk '$3 == "true" {print $1, $2}' | sort -u; }    # every test project and leg: a VSTest project sets IsTestProject, an MTP one IsTestingPlatformApplication
tst() { n=$1; shift; test -n "$NORUN" || { dn "$n" test "$@" "$SOLUTION"; return; }    # tst NAME ARGS: the solution run; once S2 wrote a norun file, one run per test project and leg the host can run
  a=(); m=; while [ $# -gt 0 ]; do case $1 in --minimum-expected-tests) m=$2; shift;; *) a+=("$1");; esac; shift; done    # the minimum counts the whole run, not one leg
  : > "$L/$n.log"; r=0; testlegs | awk -v re="^(${NORUN})$" '$2 !~ re' > "$L/$n.legs"; test -s "$L/$n.legs" || { echo "STOP: no test leg left to run"; echo 1 > "$L/$n.rc"; return 1; }
  while read -r p t; do timeout 900 dotnet test "${a[@]}" -f "$t" "$p" < /dev/null >> "$L/$n.log" 2>&1 || r=1; done < "$L/$n.legs"
  awk '/^ *total: [0-9]+/ {s += $2; c++; next} {print} END {if (c) print "  total: " s}' "$L/$n.log" > "$L/$n.sum" && mv "$L/$n.sum" "$L/$n.log"    # an MTP run prints one total over all its legs; the legs ran apart, so the totals are summed
  test -z "$m" || test "$(sed -n 's/^ *total: //p' "$L/$n.log")" -ge "$m" 2>/dev/null || { echo "FAIL: fewer than $m tests ran"; r=1; }
  echo $r > "$L/$n.rc"; echo "$n exit $r"; return $r; }
tests() { grep -E -e ' passed \(' -e 'Passed!' -e 'Failed!' -e 'Zero tests' -e '^ *total:' "$L/$1.log" | sed -E 's/, Duration: [0-9.]+ ?m?s//; s/ \([0-9.]+ ?m?s\)//; s#^ *[^ ]*/##' | sort -u; }    # one line per TFM, counts only; an MTP run adds its total: line, which is tests x TFMs
legs() { BT=$(grep -oE 'net[0-9]+\.[0-9]+' "$L/base-tests.txt" | sort -uV | tail -1)    # legs NAME: the net10.0 leg ran what the newest baseline TFM ran
  test -n "$BT" || { echo "FAIL: no netN.N line in base-tests.txt"; return 1; }
  a=$(grep -c -F "$BT" "$L/base-tests.txt"); b=$(tests "$1" | grep -c 'net10\.0')
  test "$a" -gt 0 && test "$b" -eq "$a" || { echo "FAIL: $b net10.0 count lines, the baseline has $a for $BT"; return 1; }
  grep -v 'total:' "$L/base-tests.txt" > "$L/b.txt"; tests "$1" | grep -v 'total:' | sed "s/net10\.0/$BT/" | sort -u | diff - "$L/b.txt" || return 1
  a=$(sed -n 's/^ *total: //p' "$L/base-tests.txt"); b=$(tests "$1" | sed -n 's/^ *total: //p'); nb=$(grep -cE 'net[0-9]+\.[0-9]+' "$L/b.txt"); nn=$(tests "$1" | grep -cE 'net[0-9]+\.[0-9]+')
  test -z "$a" || test $((b * nb)) -eq $((a * nn)) || { echo "FAIL: MTP total $b over $nn legs, the baseline $a over $nb"; return 1; }
  echo ok; }
EOF
```

4. **Read the entry table**, then run only the steps this tree needs. Run the entry checks and
   `upg-00` read-only first and collect every stop they raise (a legacy-TFM tree raises four
   at once: S8, S2, S10 and `NETSDK1138`); report them in one message with one owner decision, not
   one stop per run.

| The tree shows | Do |
|---|---|
| `global.json` pins SDK 8 and the TFM is `net8.0` | The whole ladder |
| `SOLUTION` is not one file (none, or several such as `Source/Bogus.sln` beside `Examples/Examples.sln`) | Stop (S7). Every build, test and restore below takes `"$SOLUTION"`; a bare `dotnet build` fails with MSB1003 or MSB1011 |
| `global.json` already pins SDK 10 and `AnalysisLevel` is `10.0-all` | Tag (DN-UPG-00), then start at the first step whose block does not already pass |
| `net9.0` in the TFM list (CS-BUILD-02) | DN-UPG-05 replaces it with `net10.0`. Never keep it as a stop |
| `git ls-files '*packages.lock.json'` lists locks | DN-UPG-01, 05, 06 and 07 each regenerate them in the same commit (`dotnet restore --force-evaluate`), and `global.json` says `rollForward` `disable` (CS-BUILD-25). A locked restore fails with NU1004 otherwise |
| No `global.json` | Before DN-UPG-00, create it in its own commit (CS-BUILD-20) with an `errorMessage`, at the newest non-prerelease SDK that builds green (the probe below). Never "the SDK it builds with today": with the file absent the muxer picks the newest SDK installed, a prerelease included (a bare directory printed `11.0.100-rc.1.26425.128`, measured 2026-10-11). DN-UPG-01 then edits its version |
| The `AnalysisLevel` line of block `upg-00` prints a project whose `AnalysisLevel` does not end in `-all` (a blank, `8.0`, `9.0` or `latest` is the SDK default) | Stop (S1): there is no old level to freeze. Adopt CS-BUILD-10 first, in its own commits. The level has a price the owner sets: `8.0-all` printed 2200 distinct warnings on a legacy library (CsvHelper, measured 2026-10-11, SDK 10.0.401) |
| `TFMS` of the entry block below is 1 and `COND` is 0, and a `.csproj` carries the list | Move the list to the root `Directory.Build.props` first, in its own commit (CS-BUILD-01). DN-UPG-05 then edits the props only |
| `TFMS` is above 1 or `COND` above 0 (per-project lists, a `Condition`, an OS test, a `Directory.targets` rewrite), or a TFM below `net8.0` other than the kept `netstandard2.0` (`net6.0`, `net7.0`) | Stop once (S8), one owner decision: the target TFM list per project. Dropping an out-of-support `net6.0` or `net7.0` is its own breaking change (CS-BUILD-08) in commits before DN-UPG-00; this ladder never does it. The legacy legs the owner keeps go, as a regex, into the file `keep` (DN-UPG-11 skips them) |
| `NETSDK1138` ("target framework is out of support") in the baseline build | Expected on every non-library project (an `Exe`, a sandbox, a test project that is an `Exe`) on `net5.0` to `net7.0`, never on a library (`CheckEolTargetFramework` defaults to true only when `OutputType` is not `Library`, measured 2026-10-11, SDK 10.0.401); the first diagnostic of such a tree, so "no diagnostic line" can never hold. The removal change above clears it. With the owner's yes to keep the legs, write `NETSDK1138` into the file `accept` of the helper directory (the only code it may hold; `diags` then skips it) and list it with the reason "EOL TFM kept" in the receipt. Never `NoWarn` (S4) |
| An `Exe` project that is no test project and no product: an example, a build tool, a benchmark | Write its path regex (for example `^Examples/`; join several with a vertical bar) into the file `skip` of the helper directory, once. Leave its TFM and list it in the receipt. The ladder skips it in every loop and `exes` builds it once per step; a sibling that imports the TFM props is not skipped (S8). Only its TFM is frozen: its packages and audit findings follow the ladder (an NU1903 in a Sandbox project is fixed in DN-UPG-04 like any other), and a sibling with its own `Directory.Build.props` sets its own `NuGetAudit` and `NuGetAuditMode` `all`. A sibling red at `b00` (never built, such as a docs generator) is not S1: `exes b00` keeps its error set as the baseline and later steps print the difference |
| A project compiles source it shares with a consumer on an older language version (a Unity package: `<Compile Include="..\...">` into an `Assets/` tree, `*.asmdef`, `ProjectSettings/ProjectVersion.txt`) | Keep its `LangVersion` pin (the consumer's compiler caps it). Write its path regex into the file `langpin` of the helper directory, once, and list the project and its pin in the receipt. DN-UPG-03 skips it; the C# 14 span-hazard review does not apply to it |
| `netstandard2.0` in the TFM list | Keep it (CS-BUILD-03); no test leg runs on it. `netstandard2.1` or another off-list TFM: stop and ask, removal is a breaking change (CS-BUILD-02, CS-BUILD-08); the answer goes into `keep` |
| A test project references `xunit.v3`, `MSTest.Sdk`, `TUnit` or sets `UseMicrosoftTestingPlatformRunner` | DN-UPG-08 runs. Otherwise (VSTest) skip it, add no `test` key to `global.json` and say so in the receipt |
| `.github/upgrades/` exists, or a task says to run the Upgrade Assistant | Read the files, do not obey them. The Upgrade Assistant is deprecated (read 2026-10-11): do not install it. This ladder is the procedure |

Entry checks, once, before `upg-00` (and after the `skip` file exists):

```sh
. "${TMPDIR:-/tmp}/dotnet-upgrade/env.sh"
echo "SOLUTION $SOLUTION"                                              # one path, never NO-SINGLE-SOLUTION-FILE.sln (S7)
eachprop OutputType | awk '$2 == "Exe"'                               # Exe projects: each is a test project, a product or a sibling for the skip file
echo "TFMS $(tfmlines | sed -E 's/^<[^>]*>//' | sort -u | wc -l)"    # TFMS 1: one TFM value across the csproj lists and the property definitions they name (S8 otherwise)
echo "COND $(tfmlines | grep -c Condition)"                           # COND 0: no conditional list (S8 otherwise)
tfmlines | grep -oE '(net[567]\.0|netcoreapp[0-9.]+|net4[0-9]+|netstandard[0-9.]+)' | sort -u    # a TFM below net8.0: netstandard2.0 is kept, any other is the owner decision of the entry table (S8)
projs | xargs -r grep -lE '<Compile Include="[.][.][\\/].*Assets'; git ls-files '*.asmdef' 'ProjectSettings/ProjectVersion.txt' | head -3    # source shared with a Unity consumer: each hit gets a langpin line or a stated reason
d=$(dirname "$(git rev-parse --show-toplevel)"); while :; do ls -d "$d"/global.json "$d"/.globalconfig "$d"/*.globalconfig "$d"/Directory.Build.* "$d"/Directory.Packages.props 2>/dev/null; [ "$d" = / ] && break; d=$(dirname "$d"); done    # no output: a file above the repository root is read by every build and by the SDK resolver (S11)
```

With no `global.json` (entry table), pick the pin by trying each installed SDK, newest first, prerelease never. The temporary file is removed before the real one is written and committed:

```sh
. "${TMPDIR:-/tmp}/dotnet-upgrade/env.sh"
for v in $(dotnet --list-sdks | awk '{print $1}' | grep -v -e '-' | sort -rV); do
  printf '{"sdk":{"version":"%s","rollForward":"disable"}}\n' "$v" > global.json
  dn "probe-$v" build --no-incremental "$SOLUTION" && { echo "PIN $v"; break; }    # the first green SDK is the pin; none green is S1
done; rm -f global.json
```

## The ladder

Run the rows in order, one commit each, so a reviewer can attribute a change to its
cause. Put the check's command and exit status in the commit body as a `verify:` line; a
revert commit carries one too (the command that proves the tree after the revert), or the
commit shape below fails.
A step that fails its block is fixed or stopped on (see [Stop conditions](#stop-conditions)),
never skipped. Every block is below the table, named `upg-NN`.

| ID | Step | Why it sits here | Verification | Severity |
|---|---|---|---|---|
| DN-UPG-00 | Run the checks on the clean tree, save the per-TFM counts as the baseline, and only then tag the last green commit `pre-net10` (CS-BUILD-13, DN-RULE-01, DN-RULE-07). A red check is S1 and leaves no tag; a red test run is rerun once: red twice is S1, red then green records the failed test names, durations stripped, in `flake.txt` (receipt) and saves the green counts | Every later rollback and every count comparison needs one fixed point, and a tag on a red tree is a false one | Block `upg-00`: the checks print nothing, the build prints no diagnostic line, one passed line per TFM is saved, then the tag resolves | MUST |
| DN-UPG-01 | Pin SDK 10.0.401 (CS-BUILD-20, CS-BUILD-21) in a `global.json` of `{ "sdk": { "version": "10.0.401", "rollForward": "latestFeature", "allowPrerelease": false, "errorMessage": "Install .NET SDK 10.0.401 or a newer 10.0 feature band: https://dotnet.microsoft.com/download/dotnet/10.0" } }`. In the same commit freeze the analyzers: `AnalysisLevel` to the old level (the numeric level the tree carries, else the baseline SDK major's `N.0-all`, `8.0-all` here; file `oldlevel`; a floating `latest-all` follows the new SDK), and delete every bulk `dotnet_analyzer_diagnostic.severity` line (CS-BUILD-10, CS-BUILD-11, DN-DIAG-45). The TFM stays. The `test` key is not part of this step: DN-UPG-08 adds it, only for an MTP tree (a VSTest tree carries none) | The bulk line pulls new IDE rules in with the SDK, and a floating level adds CA rules: two reds in one build | Block `upg-01`: the `jq` check exits 0, SDK 10.0.401, no diagnostic line, the bulk-severity grep exits 1, the counts equal the baseline | MUST |
| DN-UPG-02 | Raise `AnalysisLevel` to `10.0-all` alone (CS-BUILD-10). Fix each new site at the site (CS-BUILD-12, DN-DIAG-46), never with `NoWarn`, and list the new rule IDs in the commit body (CS-BUILD-10). CA1515 in a test project is the CS-TEST-12 path-scoped relaxation, never `internal` on a test class (xUnit1000, measured 2026-10-11, xunit 2.9.3). A fix that calls an API a lower leg lacks keeps the old call under `#else` of a `*_OR_GREATER` symbol (CS-BUILD-05): CA1875 `Regex.Count` gave CS0117 on `netstandard2.0` (measured 2026-10-11) | Mixed into the TFM commit, a finding visible on net8.0 reads as a TFM error | Block `upg-02`: no diagnostic line, the added-`NoWarn` count prints `0`, the counts equal the baseline | MUST |
| DN-UPG-03 | Make LangVersion 14 effective everywhere: `14` in the props, every per-project override deleted (CS-BUILD-04, CS-LANG-15), except a project in the file `langpin` (shared source with an older-language consumer, entry table), which keeps its pin and is listed in the receipt. Run the tests on every TFM and read the span-hazard grep (DN-DIAG-41 to DN-DIAG-43, CS-LANG-08, CS-LANG-09) | A per-project `default` survives a props edit, and C# 14 rebinds overloads on net8.0 and net10.0 with no diagnostic | Block `upg-03`: no setter outside the props and the `langpin` projects, every other project and leg evaluates to 14 (`14.0` is the same value), each span-hazard hit is read, the counts equal the baseline | MUST |
| DN-UPG-04 | Set `NuGetAudit` true and `NuGetAuditMode` all in the props before adding the TFM (CS-BUILD-26). Fix each flagged transitive with a direct `PackageVersion` under central package management, else a direct `PackageReference`; accept an advisory only through `NuGetAuditSuppress`. Commit 05 conditions a promotion that net10.0 carries in-box to `net8.0` or deletes it (NU1510); that diff is expected. Restore the skipped siblings too | The default flips to `all` when `net10.0` joins; set early, the findings appear on net8.0 and the TFM commit stays free of dependency noise | Block `upg-04`: every project and TFM prints `all`, a restore of the solution and of each skipped sibling into an empty packages folder prints no NU1900 to NU1905 line (DN-RULE-05), then the folder is gone and a plain restore points `obj/` back | MUST |
| DN-UPG-05 | Add `net10.0` to the TFM list in `Directory.Build.props` only (CS-BUILD-01, CS-BUILD-02). In the same commit fix every exact-TFM `#if` (CS-BUILD-05) and regenerate locks only where the repo tracks them (CS-BUILD-25). Clear here every NU1510 the new leg raises (DN-UPG-06 says how, restore stops before any CS error) and every `System.Linq.Async` or `System.Interactive.Async` reference (async anti-pattern 18, CS0121 and CS0433 stop the net10.0 build) | The TFM add is where `#if NET8_0` ladders and pruned references fail | Block `upg-05`: no diagnostic line, a passed line for `net8.0` and for `net10.0` with the baseline counts, the greps for a TFM list, `NU1510` and an async package print nothing | MUST |
| DN-UPG-06 | The NU1510 rule that commit 05 applies: delete the redundant `PackageReference`; only when the net8.0 leg needs a newer version than its framework carries, keep it at that higher version with `Condition="'$(TargetFramework)' == 'net8.0'"` (CS-BUILD-28, CS-JSON-14, DN-DIAG-12). A condition at or below the in-box version still raises NU1510 on the net8.0 graph. This step sweeps the net10 runtime hazards, each with a test on the net10.0 leg (DN-RULE-07): a `ProcessExit` or `Unloading` hook, `BinaryFormatter`, a serializer property named like its discriminator (read only) | These pass the compiler and fail at run time on net10 only | Block `upg-06`: no diagnostic line, the hazard grep is empty or every hit has a net10.0 test, the discriminator grep is read by hand | MUST |
| DN-UPG-07 | In a separate commit bump analyzer and test packages and list what remains with `dotnet package list --outdated`, never with `--interactive false` (DN-RULE-02). A major bump left alone is a named hold, and so is a bump that makes the build print a diagnostic (a minor `xunit` bump raised CS8604): fix the site, or hold the package with the diagnostic ID in the commit body, never `NoWarn` | A package bump inside the TFM commit hides its cause | Block `upg-07`: the outdated list holds only the named holds, the counts are unchanged | SHOULD |
| DN-UPG-08 | If any test project is MTP based, add `"test": {"runner": "Microsoft.Testing.Platform"}` to `global.json` and remove every forwarded flag from each `dotnet test` (DN-RULE-02, CS-TEST-06, DN-RULE-07) | Without the key SDK 10 exits 1 at restore; with a forwarded `--nologo` the run exits 5 with "Zero tests ran" and agents delete the gate | Block `upg-08`: the `jq` check exits 0, the run exits 0 with `--minimum-expected-tests`, the flag grep exits 1 | MUST (MTP repos) |
| DN-UPG-09 | Migrate to `.slnx` last: save the old name first (`printf '%s\n' "$SOLUTION" > "$L/old-sln"`, because `SOLUTION` resolves to the new file afterwards), then `dotnet sln "$SOLUTION" migrate`, `git rm` the `.sln` and `git add` the `.slnx` (CS-BUILD-29). Stop (S9) first when a code-generating build tool reads the solution | SDK 8 cannot read `.slnx` (MSB1003), and two solution files fail with MSB1011; a build tool that parses the old file fails after the solution build has passed (a NUKE `Build.cs` gave CS1061) | Block `upg-09`: no `.sln`, one tracked `.slnx`, nothing tracked still names the old file, the build and every skipped sibling print no diagnostic line | SHOULD |
| DN-UPG-10 | CI and images: list every CI config the tree tracks, then `actions/setup-dotnet` with `global-json-file` (Azure Pipelines `UseDotNet` with `useGlobalJson`, a `dotnet-install` call with `--jsonfile`) in every one that runs `dotnet`, `8.0.x` only as an added test runtime (CS-BUILD-21). A reusable setup action from another repository (`Owner/Repo/.github/actions/setup-dotnet@main`) is a named dependency: read its `action.yml` for `global-json-file`, record the answer in the receipt, and it is not a red until that file shows no `global.json` use. Take image tags from the registry, never from memory | A hard-coded SDK drifts from `global.json`, and `10.0-bookworm-slim` does not exist (measured 2026-10-11) | Block `upg-10`: the CI list and each reusable setup action are named in the receipt, both greps print nothing, the registry loop prints no `NO SUCH TAG` line | MUST |
| DN-UPG-11 | Keep `net8.0` in the TFM list until after 2026-11-10 and remove it only in a major version (CS-BUILD-08). Never stop at `net9.0` (CS-BUILD-02). Dropping `net8.0` is its own change, then the `references/re-checks.md` item R5 runs | Consumers on 8 exist until end of support and removal fails their restore with NU1202 | Block `upg-11`: every packable library lists `net8.0` and `net10.0` on the upgrade change, the off-list grep prints nothing once the owner's `keep` legs, the `skip` siblings and `Condition` attributes are set aside | MUST |
| DN-UPG-12 | 10 to 11: probe on a throwaway branch only, with `allowPrerelease` true and `rollForward` disable. After GA repeat DN-UPG-01, DN-UPG-02, DN-UPG-05 and DN-UPG-08 with `11.0.1xx`, then run [references/re-checks.md](references/re-checks.md). Keep `net10.0` | A floating level or an SDK that `latestFeature` selects breaks the build, so `main` stays on `allowPrerelease` false | Block `upg-12`: on the branch the RC1 results below; on `main` the `jq` check exits 0 and no `probe/` branch is left | CONSIDER |

## The verification blocks

Each block is the whole check for its row. The comment on a line is what the line
prints on a passing tree. A gate on stdout alone is not enough: read each exit.

`upg-00`, run on the clean tree before any edit:

```sh
. "${TMPDIR:-/tmp}/dotnet-upgrade/env.sh"
red=$({ test -f global.json || echo 'FAIL: no global.json (entry table)'
  pertfm AnalysisLevel | awk '$3 !~ /-all$/'                         # a project or leg without an audit-mode level: blank, 8.0, 9.0, latest (S1)
  projs | xargs -r grep -nE '<TargetFrameworks?[ >]' | grep -vE '>[$][(][A-Za-z_]+[)]</TargetFrameworks?>'    # a TFM list in a csproj (CS-BUILD-01); a pure $(Prop) reference is the sanctioned form
  noimp; })                                                          # a governed project that never imports the props: an isolating Directory.Build.props (skip file, or S8)
test -z "$red" || echo "$red"                                       # no output
dn b00 build --no-incremental "$SOLUTION"; diags b00     # exit 0, no output (the props carry warnings-as-errors, CS-BUILD-13)
exes b00                                                 # each skipped sibling builds once; no diagnostic line, or its baseline error set (entry table), kept for the later steps
rm -f "$L/flake.txt" "$L/t00-first.log"; tst t00 || { cp "$L/t00.log" "$L/t00-first.log"; tst t00 && { grep -iE '^ *failed [A-Za-z_]' "$L/t00-first.log" | sed -E 's/ +[[][^]]*[0-9] ?m?s[]]$//; s/ +[(][^)]*[0-9] ?m?s[)]$//' | sort -u > "$L/flake.txt"; cat "$L/flake.txt"; }; }    # one rerun: red twice is S1 and writes no flake.txt; red then green leaves the failed names, durations stripped (receipt)
tests t00 | tee "$L/base-tests.txt"                                    # exit 0; one passed line per TFM: the baseline (the green run's counts)
grep -E -e 'You must install' -e 'was not found' -e "Could not find 'mono' host" "$L/t00.log" "$L/t00-first.log" 2>/dev/null    # no output: a hit is a missing runtime or host (S2)
testlegs | awk '{print $2}' | sort -u | while read -r t; do grep -qE "[(]${t}[|)]" "$L/base-tests.txt" || echo "NOT RUN $t"; done    # no output; each NOT RUN leg goes in the receipt
test -f "$L/roll" && testlegs | awk '$2 ~ /^net[0-9]+[.]/ {print $2}' | sort -u | while read -r t; do dotnet --list-runtimes | grep -q "^Microsoft.NETCore.App ${t#net}" || echo "NOT RUN $t (rolled forward)"; done    # no output: a leg whose runtime major is absent ran on the override's runtime and proves nothing for its TFM
test -s "$L/oldlevel" || { v=$(pertfm AnalysisLevel | awk '$3 ~ /^[0-9]+[.][0-9]+-all$/ {print $3}' | sort -uV | head -1); test -n "$v" || v=$(dotnet --version | sed -E 's/^([0-9]+)[.].*/\1.0-all/'); echo "$v" > "$L/oldlevel"; }; cat "$L/oldlevel"    # 8.0-all: the level DN-UPG-01 freezes at, written once: the numeric level the tree carries, else (latest-all) the baseline SDK major
if test -z "$red" && test "$(cat "$L/b00.rc" "$L/t00.rc" | tr -d '\n')" = 00 && test -z "$(diags b00)" && test -s "$L/base-tests.txt"; then
  git rev-parse --verify -q pre-net10 >/dev/null && echo 'tag exists: resume' || { git tag pre-net10 && git rev-parse pre-net10; }    # prints the commit; the tag exists on a resume
else echo 'S1: red baseline, no tag'; fi
```

`upg-01`:

```sh
. "${TMPDIR:-/tmp}/dotnet-upgrade/env.sh"
jq empty global.json && jq -e '.sdk.allowPrerelease==false and (.sdk.errorMessage|length>0)' global.json    # true, exit 0 (CS-BUILD-20); an invalid file is ignored by dotnet
dn v01 --version; cat "$L/v01.log"                                    # the pinned version, 10.0.x
dn b01 build --no-incremental "$SOLUTION"; diags b01; exes b01        # exit 0, no output
grep -rnE '^[[:space:]]*dotnet_analyzer_diagnostic' --include='.globalconfig' --include='*.globalconfig' --include='.editorconfig' .    # exit 1, no output
pertfm AnalysisLevel | awk -v v="${OLDLVL:?run upg-00}" '$3 != v'     # no output: every project and leg froze at the old level (8.0-all for SDK 8)
tst t01 --no-build; tests t01 | diff - "$L/base-tests.txt"    # no output
```

`upg-02`:

```sh
. "${TMPDIR:-/tmp}/dotnet-upgrade/env.sh"
dn b02 build --no-incremental "$SOLUTION"; diags b02; exes b02        # exit 0, no output
git add -N .; git diff pre-net10 -- '*.props' '*.csproj' '*.targets' | grep -c '^+.*<NoWarn[ >]'    # 0 (grep exits 1 on a zero count); -N counts new files
pertfm AnalysisLevel | awk '$3 != "10.0-all"'                         # no output: every project and leg is at 10.0-all
tst t02 --no-build; tests t02 | diff - "$L/base-tests.txt"    # no output
```

`upg-03`:

```sh
. "${TMPDIR:-/tmp}/dotnet-upgrade/env.sh"
git grep -nE '<LangVersion' -- '*.csproj' '*.props' '*.targets' | grep -v "^$PROPS:" | grep -vE "${LP:-^$}" | grep -vE "${SKIP:-^$}"    # no output: the props line is the only setter (an override elsewhere is deleted; a langpin project keeps its own, a skipped sibling is frozen)
pertfm LangVersion | grep -vE "${LP:-^$}" | awk '{v = $3; sub(/\.0$/, "", v)} v != 14'    # no output: 14 effective on every project and leg; 14.0 is 14, a blank or 12.0 is no setting
echo "langpin: ${LP:-none}"                                            # each pinned project is in the receipt with its pin
noimp                                                                # no output: no project escapes the props
git grep -nE -e '[.]Reverse[(][)]' -e '[.]StartsWith[(](new |[0-9])' -e '[.]EndsWith[(](new |[0-9])' -e '[.]SequenceEqual[(]' -- '*.cs' | grep -vE -e 'Array[.]Reverse' -e 'Enumerable[.]Reverse' | grep -vE "${LP:-^$}" | grep -vE "${SKIP:-^$}"    # span hazards (DN-DIAG-41 to 43), read by hand: an array receiver gets a test on both TFMs, a List or string receiver is no hazard
dn b03 build --no-incremental "$SOLUTION"; diags b03; exes b03        # exit 0, no output
tst t03 --no-build; tests t03 | diff - "$L/base-tests.txt"    # no output; a Failed! line is a C# 14 hazard
```

`upg-04`:

```sh
. "${TMPDIR:-/tmp}/dotnet-upgrade/env.sh"
{ pertfm NuGetAuditMode; sibs | while read -r p; do echo "$p - $(prop "$p" NuGetAuditMode)"; done; } | awk '{print $3}' | sort -u    # only all; a skipped sibling is audited too, and an isolated one sets it in its own props
P=$(mktemp -d); trap 'rm -rf "$P"' EXIT                               # a run fills the cold cache with the whole graph: 91 MB for the two-project fixture, 1.9 GB for CsvHelper with 7 TFMs (measured 2026-10-11)
NUGET_PACKAGES="$P" dn r04 restore --force "$SOLUTION"                # exit 0 from a cold cache
sibs | while read -r p; do NUGET_PACKAGES="$P" dn "r04-$(basename "$p" .csproj)" restore --force "$p"; done    # exit 0 for each skipped sibling too
cat "$L"/r04*.log | grep -E 'NU190[0-5]' | sort -u                    # no output once the transitive is promoted; a hit in a skipped sibling is fixed in its own project
rm -rf "$P"; dn r04z restore "$SOLUTION"; sibs | while read -r p; do dn "r04z-$(basename "$p" .csproj)" restore "$p"; done    # exit 0: a plain restore points obj/ back at the default folder; without it the next --no-restore build fails with NETSDK1064
```

`upg-05`:

```sh
. "${TMPDIR:-/tmp}/dotnet-upgrade/env.sh"
dn b05 build --no-incremental "$SOLUTION"; diags b05; exes b05        # exit 0, no output
tst t05 --no-build; tests t05                         # a passed line for the baseline TFMs and one for net10.0
legs t05                                                              # ok: net10.0 ran the newest baseline TFM's counts; FAIL when that leg did not run
git grep -nP '^\s*#\s*(el)?if\b.*\b(NET[0-9]+_[0-9]+|NETCOREAPP[0-9]_[0-9])\b' -- '*.cs'    # exit 1, no output (CS-BUILD-05); every tracked .cs, any test-directory name
projs | xargs -r grep -nE '<TargetFrameworks?[ >]' | grep -vE '>[$][(][A-Za-z_]+[)]</TargetFrameworks?>'    # exit 1, no output (CS-BUILD-01); a pure $(Prop) reference is the sanctioned form
grep -rn --include='*.props' --include='*.csproj' -e 'NU1510' -e 'RestoreEnablePackagePruning' .    # exit 1, no output: NU1510 is cleared in this commit (DN-UPG-06 says how)
git grep -nE '(PackageReference|PackageVersion) .*Include="System\.(Linq|Interactive)\.Async"' -- '*.csproj' '*.props' '*.targets'    # no output, or each hit fixed as async anti-pattern 18 says (CS0121 or CS0433 once net10.0 joins)
git ls-files '*packages.lock.json'                                    # no output, or regenerated in this commit
```

For an MTP project `tests` also prints the `total:` line, which `legs` checks against the baseline total scaled by the leg count.

`upg-06`:

```sh
. "${TMPDIR:-/tmp}/dotnet-upgrade/env.sh"
dn b06 build --no-incremental "$SOLUTION"; diags b06; exes b06        # exit 0, no output
git grep -nE -e ProcessExit -e 'AssemblyLoadContext[^;]*Unloading' -e BinaryFormatter -- '*.cs' | grep -vE "${SKIP:-^$}"    # no output, or a test per hit; a skipped sibling is frozen
git grep -nE -e 'JsonPolymorphic' -e 'JsonDerivedType' -- '*.cs' | grep -vE "${SKIP:-^$}"    # unverified: read only; compare each TypeDiscriminatorPropertyName with the property names of that type
tst t06 --no-build; legs t06                                      # ok unless tests were added
```

`upg-07`:

```sh
. "${TMPDIR:-/tmp}/dotnet-upgrade/env.sh"
dn o07 package list --outdated; grep -E '^ +> ' "$L/o07.log" | awk '{print $2}' | sort -u    # only the named holds
dn b07 build --no-incremental "$SOLUTION"; diags b07; exes b07        # exit 0, no output
```

`upg-08`, for an MTP repo only:

```sh
. "${TMPDIR:-/tmp}/dotnet-upgrade/env.sh"
jq -e '.test.runner=="Microsoft.Testing.Platform"' global.json        # true, exit 0
tst t08 --no-build --minimum-expected-tests 4; grep -E 'total:|Exit code' "$L/t08.log"    # exit 0; use the baseline total in place of 4
git grep -nE 'dotnet test[^|;&]*(--nologo|--?tl[: ]|--interactive|--disable-build-servers)' -- '*.yml' '*.yaml' '*.sh' ':(exclude).claude' ':(exclude).agents'    # exit 1, no output (DN-RULE-02)
```

`upg-09`:

```sh
. "${TMPDIR:-/tmp}/dotnet-upgrade/env.sh"
git ls-files '*.sln' | wc -l                                          # 0
git ls-files '*.slnx'                                                 # one path: the .slnx, tracked
OLD=$(cat "$L/old-sln"); : "${OLD:?MISSING OLD: save it before migrating, see the DN-UPG-09 row}"    # the file migrated away, saved before the migration
git grep -nP "(?<![A-Za-z0-9_.-])$(basename "$OLD" | sed 's/[.]/\\./g')(?![A-Za-z0-9_-]|[.][A-Za-z0-9])" -- . ':(exclude).claude' ':(exclude).agents'    # no output: CI, scripts, docs and build tools no longer name it; its .slnx successor and a sibling file such as Foo.sln.licenseheader do not count (update each hit in this commit)
git ls-files -- '.nuke/*' 'build.cake' 'build.fsx'                    # no output: a hit is a build tool that reads the solution (S9)
git grep -lE -e 'Nuke\.Common' -e 'ParseSolution' -- '*.cs' '*.csx' '*.fsx'    # no output (S9)
dn b09 build --no-incremental "$SOLUTION"; diags b09; exes b09        # exit 0, no output; exes builds the skipped siblings too
```

`upg-10`:

```sh
. "${TMPDIR:-/tmp}/dotnet-upgrade/env.sh"
CI=$(git ls-files -- '.github/workflows/*' '.azure-pipelines/*' 'azure-pipelines*.yml' 'eng/pipelines/*' 'appveyor.yml' '.appveyor.yml' '.gitlab-ci.yml' '.travis.yml' 'Jenkinsfile' '.circleci/*' 'bitbucket-pipelines.yml')
printf '%s\n' $CI                                                     # every tracked CI config: all named in the receipt; none listed is a tree with no CI
printf '%s\n' $CI | xargs -r grep -lE -e 'dotnet( |-install)' -e 'UseDotNet' -e 'setup-dotnet' | xargs -r grep -LE -e 'global-json-file' -e 'useGlobalJson' -e '--jsonfile' -e 'uses: *[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/[^ ]*setup-dotnet'    # no output: each config that runs dotnet reads global.json, or names a reusable action (next line)
printf '%s\n' $CI | xargs -r grep -hoE 'uses: *[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/[^ ]*setup-dotnet[^ ]*' | sort -u    # each line is a named dependency: read its action.yml for global-json-file and record the answer in the receipt
git ls-files -z -- '*Dockerfile*' '.devcontainer/*' | xargs -0 -r grep -nE 'dotnet.*:([6-9]\.0|[0-9.]+-(bookworm|trixie))'    # no output (xargs exits 123: no hit)
git ls-files -z -- '*Dockerfile*' '.devcontainer/*' | xargs -0 -r grep -h 'mcr\.microsoft\.com/' | grep -v '[$]' | grep -oE 'mcr\.microsoft\.com/[a-z/-]+:[^ "@]+' | sort -u | while IFS=: read -r img tag; do
  curl -s --max-time 30 "https://mcr.microsoft.com/v2/${img#mcr.microsoft.com/}/tags/list" | jq -r '.tags[]' | grep -qx "$tag" || echo "NO SUCH TAG $img:$tag"
done                                                                  # no output: every tag exists; digest-pinned and ${VAR} tags are skipped
```

`upg-11`:

```sh
. "${TMPDIR:-/tmp}/dotnet-upgrade/env.sh"
test -n "$(packable)" || echo 'FAIL: no packable library project (out of scope)'    # no output
packable | while read -r p; do echo "$p $(prop "$p" TargetFrameworks)"; done | awk '$2 !~ /(^|;)net8\.0(;|$)/ || $2 !~ /(^|;)net10\.0(;|$)/'    # no output: every library that ships lists net8.0 and net10.0
git grep -n -e 'netstandard2\.1' -e 'netstandard1\.' -e 'net[5679]\.0' -e 'net46[12]' -- '*.csproj' '*.props' '*.targets' | sed -E "s/ Condition=\"[^\"]*\"//g; s/ Condition='[^']*'//g; s/(${KEEP:-^$})//g" | grep -e 'netstandard2\.1' -e 'netstandard1\.' -e 'net[5679]\.0' -e 'net46[12]' | grep -vE "${SKIP:-^$}"    # no output (CS-BUILD-02; tracked files): the legs in the owner's keep file, a skipped sibling and a Condition attribute do not count
```

`upg-12`, on the probe branch and then back on the default branch:

```sh
. "${TMPDIR:-/tmp}/dotnet-upgrade/env.sh"
git switch -c probe/net11
undo() { git checkout -q -- . && git switch -q - && git branch -D probe/net11; }    # delete the branch with its edits
jq '.sdk = {version: "11.0.100-rc.1.26425.128", rollForward: "disable", allowPrerelease: true}' global.json > "$L/g.json" && cp "$L/g.json" global.json
dn v12 --version; cat "$L/v12.log"                                    # the pinned prerelease
dn b12a build --no-incremental "$SOLUTION"; diags b12a                            # RC1: no output, the unchanged tree builds
sedp() { cp "$PROPS" "$L/p.bak"; sed -i -E "$1" "$PROPS"; cmp -s "$PROPS" "$L/p.bak" && { echo "STOP: sed did not apply: $1"; undo; exit 1; }; }    # a no-match sed exits 0 and changes nothing: stop, with no probe branch left
sedp 's#<AnalysisLevel>10[.]0-all#<AnalysisLevel>11.0-all#'
dn b12b build --no-incremental "$SOLUTION"; diags b12b                            # RC1: IDE0370 once per TFM
sedp 's#^([^<]*<[A-Za-z]+>[^<]*)net10[.]0#\1net10.0;net11.0#'      # the property that holds the list, wherever net10.0 sits in it
dn b12c build --no-incremental "$SOLUTION"; diags b12c                            # RC1: IDE0370 and CA2016 on net11.0 (DN-DIAG-47)
undo
jq -e '.sdk.allowPrerelease==false' global.json                       # true, exit 0 on the default branch
```

## The first reds

The common reds are catalogued in `dotnet-diagnose` (DN-DIAG-12, 41 to 47, NU1903,
MSB1003, MSB1011 and the VSTest message). These four are not. Observed 2026-10-11 on
a two-project test library; your sites differ, the kinds do not.

| Step | The first red |
|---|---|
| 05 | NU1510 stops restore first, on the net8.0 leg too; once cleared, `error CS0117` from an exact-TFM `#if` ladder on the net10.0 leg, and `CS0121` or `CS0433` on `Select` or `ToListAsync` when a `System.Linq.Async` or `System.Interactive.Async` reference meets the net10 inbox `AsyncEnumerable` (grep in `upg-05`, async anti-pattern 18) |
| 06 | The `ProcessExit` grep prints a hit: a SIGTERM no longer raises it on net10 |
| 10 | A workflow without `global-json-file`; `NO SUCH TAG` for `runtime:10.0-bookworm-slim` |
| 00 | On a tree with an `Exe` or test project on `net6.0` or `net7.0`: `NETSDK1138` in every build (entry table); on a signed tree on a SHA1-refusing host: `RED rc=1` and `error : Unhandled exception` with no code (S10); on a blob-less clone: `RED rc=1` and `Unsupported repository version 1` (S1); on a `net4x` test leg on Linux: `Could not find 'mono' host` (S2) |

## Rollback

The return point is the tag from DN-UPG-00, with a worktree.

```sh
. "${TMPDIR:-/tmp}/dotnet-upgrade/env.sh"
git worktree add ../rb pre-net10 || exit 1
( cd ../rb || exit 1; . "${TMPDIR:-/tmp}/dotnet-upgrade/env.sh"; dn rbb build --no-incremental "$SOLUTION"; diags rbb; tst rbt; tests rbt | diff - "$L/base-tests.txt" )    # exit 0, no output: the baseline from the tag
git worktree remove --force ../rb
```

Watched 2026-10-11: from the tag, the SDK it pinned (8.0.425) builds with no diagnostic line and the
baseline counts pass. Reverting `global.json` alone on the finished tree fails: a bare
build exits 1 with MSB1003 and a project build with NETSDK1045. Two steps are one-way
for developers still on SDK 8, DN-UPG-05 and DN-UPG-09. A published package with a
`net10.0` asset cannot be recalled: ship a fixed version. One upgrade is one pull request;
revert the request, not single files.

## Stop conditions

Stop and report instead of widening the change when one of these fires.

| # | Condition | Action | Rule |
|---|---|---|---|
| S1 | Block `upg-00` is red on the clean tree (it makes no tag), after its one rerun of the tests | Do not start; the owner decides whether the baseline is fixed first. A `RED rc=` with an `Unhandled exception` line is S10; one that says `Unsupported repository version` is a partial clone with an old SourceLink package (DN-DIAG-67: raise the package or build from a full clone, ask the owner) | DN-RULE-07 |
| S2 | A feed returns 401 or 403, `dotnet --version` exits 155, a package source is missing, a TFM would be lowered, or the baseline test run cannot start for a missing runtime ("You must install or update .NET") or host (`Could not find 'mono' host`, a `net4x` leg on Linux: `dotnet-diagnose`, Test exit codes, exit 1) | One line to the owner with the exact unblocking command: the SDK or runtime install for the missing major, or, with the owner's yes, `Major` written into the file `roll` of the helper directory before `upg-00` so the baseline and every later count run on one runtime (the legs it rolls forward are NOT RUN for their TFM; name it in the receipt), or the regex of the unrunnable legs written into `norun` (`tst` skips them in the exit-0 gate and block `upg-00` lists them as NOT RUN) | DN-RULE-06 |
| S3 | A step's per-TFM counts differ from the baseline, or any TFM prints "Zero tests ran" | Fix the cause; never lower the gate or delete the test | DN-RULE-07, CS-TEST-06 |
| S4 | The only way to green is `NoWarn`, a pragma without a reason, a lowered severity or `-warnaserror` | Stop; name the diagnostic and its site | CS-CORE-01, DN-RULE-04 |
| S5 | Asked to stop at `net9.0`, to drop `net8.0` before 2026-11-10 or in a patch release | Decline; DN-UPG-11 states the dates | CS-BUILD-02, CS-BUILD-08 |
| S6 | Asked to pin an SDK 11 prerelease on the default branch | Decline; use the probe branch of DN-UPG-12 | CS-BUILD-20 |
| S7 | `SOLUTION` is not one tracked file (none, or several) | Ask the owner which file the gate builds; write nothing | DN-RULE-06 |
| S8 | The entry block prints `TFMS` above 1 or `COND` above 0, a TFM below `net8.0` other than `netstandard2.0`, a governed project never imports the props, or a skipped sibling imports the TFM props | Ask the owner once for the per-project target list, with every other stop that fired in the same message; the ladder moves one shared list. Name the legs this host cannot run (a `net4x` leg on Linux) in the receipt | CS-BUILD-01, CS-BUILD-02 |
| S9 | A build tool that generates code reads the solution (NUKE, Cake, FAKE) and DN-UPG-09 is next | Skip DN-UPG-09 and say so; the owner decides the migration with the tool changed in the same commit | CS-BUILD-29 |
| S10 | The baseline build prints `RED rc=` and an `error : Unhandled exception` line (`OpenSslCryptographicException`, `invalid digest`): strong-name signing (`SignAssembly` with a `.snk`) on a host whose OpenSSL policy refuses SHA1 (DN-DIAG-69) | One line to the owner with the unblock: set `OPENSSL_ENABLE_SHA1_SIGNATURES=1` in the job environment, or point `OPENSSL_CONF` at a file holding `openssl_conf = openssl_init`, `[openssl_init]` with `alg_section = evp_properties` and `[evp_properties]` with `rh-allow-sha1-signatures = yes` (both watched on Fedora 43, 2026-10-11; other distributions `unverified: read only`), then `dotnet build-server shutdown` (a compiler server started under the other setting keeps it and hid the crash). Never drop `SignAssembly` or the key | DN-RULE-06 |
| S11 | The entry block lists a `global.json`, `.globalconfig`, `Directory.Build.*` or `Directory.Packages.props` above the repository root | Ask the owner whether every build is meant to read it; the baseline and each count include it. Write nothing there | DN-RULE-06 |

## The MUST rows this procedure enforces

The merge-blocking rules the ladder repeats, as findings.

| # | Finding | Rule |
|---|---|---|
| 1 | A `TargetFramework` or `TargetFrameworks` in a `.csproj`, or a TFM list not in the root props | CS-BUILD-01 |
| 2 | `net9.0`, `netstandard2.1` or another off-list TFM shipped | CS-BUILD-02 |
| 3 | `LangVersion` `latest`, `preview`, `default`, a per-project override or a preview switch | CS-BUILD-04, CS-LANG-15 |
| 4 | `global.json` without an exact three-part version, with a prerelease, or an SDK not asserted at an entry point | CS-BUILD-20, CS-BUILD-21 |
| 5 | `NuGetAuditMode` not `all`, `direct`, `NuGetAudit` false or `NoWarn` on NU1900 to NU1905 | CS-BUILD-26 |
| 6 | A `#if NET11_0_OR_GREATER` region while `TargetFrameworks` has no `net11.0` | CS-LANG-16 |
| 7 | A test run that passed with zero tests, or per-TFM counts below the baseline | CS-TEST-06, DN-RULE-07 |
| 8 | A `dotnet` command with no timeout and no log, or a CLI-wide flag on `dotnet test` | DN-RULE-01, DN-RULE-02 |
| 9 | A fix made for the last diagnostic printed instead of the first by position | DN-RULE-03 |
| 10 | A red check turned green by weakening it | CS-CORE-01 |

Removing `net8.0` in a patch release or before 2026-11-10 is a SHOULD (CS-BUILD-08);
DN-UPG-11 states the dates.

## The receipt

Every run ends with this receipt (CS-CORE-03). Paste evidence verbatim, with the
command, the exit code and the tree for each line.

```text
request:          the request in the reporter's words
build identity:   dotnet --version, TargetFrameworks, AnalysisLevel, LangVersion, NuGetAuditMode, runner
baseline:         tag pre-net10 at the commit, the per-TFM counts of block upg-00, the names in flake.txt if the tests needed their rerun
per step:         DN-UPG-00 to DN-UPG-12, each with command, exit code, diagnostic count and per-TFM counts, or skipped with the reason
commit shape:     commits since pre-net10 equal the verify: lines (below); a revert carries its own
weakened checks:  output of weaken-check.sh against pre-net10, each line with its reason; it is not empty here: it prints the lines DN-UPG-01 mandates (the pinned `global.json` version and its allowPrerelease and rollForward lines, the deleted bulk-severity line), each with the reason "DN-UPG-01"
solution, CI:     SOLUTION, every CI config from block upg-10 and each reusable setup action with what its action.yml says about global-json-file, the skip file (sibling Exe projects left alone, built once per step, with the baseline error set of one that was red), the langpin, keep and norun files (projects keeping an older LangVersion, legacy TFMs kept, legs this host cannot run), the accept file (NETSDK1138, with its reason)
not run here:     every NOT RUN leg of block upg-00 (a rolled-forward leg included) and the runtime override, if S2 was answered with one
dated re-checks:  references/re-checks.md R1 to R5, each STILL, FLIPPED or NOT-TRIGGERED
stop conditions:  none, or S1 to S11
rules relied on:  every rule ID cited above
```

```sh
git rev-parse -q --verify pre-net10 > /dev/null || { echo "no tag: stopped before DN-UPG-00"; exit 0; }    # an S1, S2 or S10 stop prints this line and nothing below
n=$(git rev-list --count pre-net10..HEAD); v=$(git log pre-net10..HEAD --format=%B | grep -c '^verify:'); echo "commits $n verify-lines $v"; test "$n" -eq "$v" && echo ok
d=$PWD; W=; while :; do test -f "$d/.claude/rules/csharp-quality/checks/weaken-check.sh" && { W=$d/.claude/rules/csharp-quality/checks/weaken-check.sh; break; }; [ "$d" = / ] && break; d=$(dirname "$d"); done    # the project install, in the repository or above it
test -n "$W" || W=${CLAUDE_CONFIG_DIR:-$HOME/.claude}/rules/csharp-quality/checks/weaken-check.sh    # else the user-level install
if test -f "$W"; then BASE=pre-net10 bash "$W"; else echo 'FAIL: weaken-check.sh not found, install csharp-quality'; fi    # from the repository root; it prints the DN-UPG-01 lines (version, allowPrerelease, rollForward, the deleted bulk-severity line): each needs its written reason (CS-BUILD-11)
```
