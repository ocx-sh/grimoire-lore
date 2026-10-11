# Dated re-checks

Five claims in the rule files are true for a window, not for ever. Each one below has
a trigger, a probe that runs, what the probe printed on 2026-10-11 and the decision for
each outcome. Run an item only when its trigger fires, and record `STILL`, `FLIPPED` or
`NOT-TRIGGERED` for it in the receipt of [SKILL.md](../SKILL.md).

Contents: [Before any probe](#before-any-probe) · [R1 process APIs](#r1-net-11-process-apis) ·
[R2 C# 15 fencing](#r2-c-15-fencing) · [R3 analyzer re-diff](#r3-the-110-all-analyzer-re-diff) ·
[R4 net8 numbers](#r4-the-net8-floor-numbers) · [R5 dropping net8](#r5-dropping-net8-removes-the-cs-lang-08-and-09-cause)

| Re-check | Trigger | Rules it can change | Reads |
|---|---|---|---|
| R1 | An 11.0.1xx GA SDK is installed and the owner asks for a `net11.0` leg | CS-LANG-16; CS-PROC-23 is retired | .NET 11 process APIs |
| R2 | The same trigger, before any C# 15 construct is written | CS-BUILD-04, CS-LANG-15, CS-LANG-16; CS-LANG-17 is retired | C# 15 per-TFM fence |
| R3 | The same trigger, or any new SDK feature band | CS-BUILD-10 | New `11.0-all` diagnostics |
| R4 | A change claims a speed or allocation effect and `net8.0` is still in the list | CS-PERF-07, CS-PERF-09 | net8 against net10 allocation |
| R5 | `net8.0` leaves `TargetFrameworks` (DN-UPG-11) | CS-LANG-08, CS-LANG-09 | The net8 binding cause |

## Before any probe

Every probe runs in `$L/probe`, a directory outside the repository that carries its own
`global.json`, so the repository pin is never touched. Set `V` to the SDK under test.
Dated 2026-10-11 it is the RC1 build; at GA it is the 11.0.1xx GA version and
`allowPrerelease` can be `false`. The helper block of [SKILL.md](../SKILL.md) must exist
(`$L` and `dn`). Run `r0` once; every later block starts a fresh shell, so each one repeats
the first line below and stops when `r0` has not run. Run the blocks from the repository root: sourcing the helper file
there reads the tracked solution files, and a `STOP S7` line it prints does not concern a probe.

```sh
# r0
. "${TMPDIR:-/tmp}/dotnet-upgrade/env.sh"
V=11.0.100-rc.1.26425.128
P="$L/probe"; mkdir -p "$P" && cd "$P" || exit 1
printf '{ "sdk": { "version": "%s", "rollForward": "disable", "allowPrerelease": true } }\n' "$V" > global.json
dn r0 --version; cat "$L/r0.log"                      # exit 0, then the value of V
```

A probe on an SDK that is not installed exits 155 with "A compatible .NET SDK was not found" in the log; stop and
report the exact install command to the owner (DN-RULE-06).

## R1 .NET 11 process APIs

The former CS-PROC-23 (retired, not reused). `Process.RunAsync`, `Process.Run`, `RunAndCaptureText` and
`ProcessStartInfo.KillOnParentExit` exist from .NET 11. No leg compiles a region behind
`NET11_0_OR_GREATER` until a `net11.0` leg exists (CS-LANG-16), so the code waits.

```sh
# r1
. "${TMPDIR:-/tmp}/dotnet-upgrade/env.sh"; P="$L/probe"; test -f "$P/global.json" || { echo 'run r0 first'; exit 1; }
mkdir -p "$P/r1" && cd "$P/r1" || exit 1
cat > P.csproj <<'EOF'
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net11.0</TargetFramework>
    <OutputType>Exe</OutputType>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
</Project>
EOF
cat > Program.cs <<'EOF'
using System.Diagnostics;

#if NET11_0_OR_GREATER
using var cts = new CancellationTokenSource(300);
var status = await Process.RunAsync(new ProcessStartInfo("sleep", ["5"]), cts.Token);
Console.WriteLine($"R1 RunAsync Canceled={status.Canceled}");
var info = new ProcessStartInfo("sleep", ["0"]);
Console.WriteLine($"R1 KillOnParentExit settable={info.KillOnParentExit == false}");
#else
Console.WriteLine("R1 no .NET 11 process API on this TFM");
#endif
EOF
dn r1 run; tail -2 "$L/r1.log"         # exit 0: Canceled=True, then settable=True
```

Red twin: the same project under an SDK 10 `global.json` exits 1 with
`NETSDK1045`, which is why CS-LANG-16 forbids the region. Observed 2026-10-11 on the RC1 SDK: the
exit was 0, `RunAsync` cancelled the child after 300 ms (`Canceled=True`) and `KillOnParentExit`
was settable. Not probed: the grandchild of a killed child on Linux.

| Outcome | Decision |
|---|---|
| Both lines print as above on the GA SDK | `STILL`. Design the replacement of the hand-written pump as its own change, tests first (CS-PROC-01), after the leg exists. Never inside the SDK commit |
| `RunAsync` is missing, renamed or throws instead of returning a status | `FLIPPED`. Report the diagnostic verbatim to the owner and write no .NET 11 process code |

## R2 C# 15 fencing

The former CS-LANG-17 (retired, not reused). C# 15 syntax that needs no new runtime type (labeled `break` and `continue`) compiles
into net8.0 code when `LangVersion` is one value for every leg, and `union` needs runtime types from
.NET 11. Both are fenced with a per-TFM `LangVersion` and `NET11_0_OR_GREATER`.

```sh
# r2
. "${TMPDIR:-/tmp}/dotnet-upgrade/env.sh"; P="$L/probe"; test -f "$P/global.json" || { echo 'run r0 first'; exit 1; }
git grep --untracked -nE -e 'class[[:space:]]+UnionAttribute' -e 'interface[[:space:]]+IUnion' -e 'IsClosedTypeAttribute' -- '*.cs'    # exit 1, no output: no local declaration (from the repository root)
mkdir -p "$P/r2" && cd "$P/r2" || exit 1
cat > Fence.csproj <<'EOF'
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFrameworks>net8.0;net10.0;net11.0</TargetFrameworks>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <EnableDefaultCompileItems>false</EnableDefaultCompileItems>
  </PropertyGroup>
  <PropertyGroup Condition="'$(Variant)' == 'uniform15'"><LangVersion>15</LangVersion></PropertyGroup>
  <PropertyGroup Condition="'$(Variant)' != 'uniform15'">
    <LangVersion Condition="$([MSBuild]::IsTargetFrameworkCompatible('$(TargetFramework)', 'net11.0'))">15</LangVersion>
    <LangVersion Condition="!$([MSBuild]::IsTargetFrameworkCompatible('$(TargetFramework)', 'net11.0'))">14</LangVersion>
  </PropertyGroup>
  <ItemGroup><Compile Include="$(Src).cs" /></ItemGroup>
</Project>
EOF
cat > Guarded.cs <<'EOF'
public record class Cat(string Name);
public record class Dog(string Name);
#if NET11_0_OR_GREATER
public union Pet(Cat, Dog);
public static class Lib { public static string Name(Pet p) => p switch { Dog d => d.Name, Cat c => c.Name }; }
#else
public static class Lib { public static string Name(object p) => p switch { Dog d => d.Name, Cat c => c.Name, _ => throw new ArgumentException("not a pet", nameof(p)) }; }
#endif
EOF
sed '/^#/d; /^public static class Lib { public static string Name(object/d' Guarded.cs > Unguarded.cs
dn r2g build Fence.csproj -p:Src=Guarded; diags r2g       # exit 0 on all three legs, no output
dn r2u build Fence.csproj -p:Src=Unguarded; diags r2u     # exit 1: CS0106, CS1001 and CS8803 on net8.0 and net10.0
dn r2v build Fence.csproj -p:Src=Unguarded -p:Variant=uniform15; diags r2v    # exit 1: CS0518 and CS0656 on net8.0 and net10.0
```

The syntax-only half, a labeled `continue`, on one TFM per call:

```sh
# r2b
. "${TMPDIR:-/tmp}/dotnet-upgrade/env.sh"; P="$L/probe"; test -f "$P/global.json" || { echo 'run r0 first'; exit 1; }
mkdir -p "$P/r2b" && cd "$P/r2b" || exit 1
cat > Label.csproj <<'EOF'
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>$(TFM)</TargetFramework>
    <LangVersion>$(LV)</LangVersion>
    <ImplicitUsings>enable</ImplicitUsings>
    <EnableDefaultCompileItems>false</EnableDefaultCompileItems>
  </PropertyGroup>
  <ItemGroup><Compile Include="Label.cs" /></ItemGroup>
</Project>
EOF
cat > Label.cs <<'EOF'
int hits = 0;
outer: for (int i = 0; i < 3; i++) { for (int j = 0; j < 3; j++) { if (j == 1) continue outer; hits++; } }
Console.WriteLine(hits);
EOF
dn r2n run --project Label.csproj -p:TFM=net8.0 -p:LV=15; tail -1 "$L/r2n.log"    # exit 0, prints 3: C# 15 ran on net8.0
dn r2m run --project Label.csproj -p:TFM=net8.0 -p:LV=14; diags r2m               # exit 1: CS9327
```

Observed 2026-10-11 on the RC1 SDK: the guarded file built on all three legs; the unguarded `union` failed
with `CS0518` and `CS0656` at `LangVersion` 15 and with `CS0106`, `CS1001` and `CS8803` at 14, both on
`net8.0` and `net10.0`; the labeled `continue` printed `3` on `net8.0` at 15 and failed with `CS9327` at 14.

| Outcome | Decision |
|---|---|
| The guarded build is green and the unguarded build is red as above | `STILL`. Add the per-TFM `LangVersion` pair to the root props in the commit that adds `net11.0`; every C# 15 construct goes behind `NET11_0_OR_GREATER` or a folder compiled for `net11.0` only (CS-BUILD-04, CS-LANG-15, CS-LANG-16). Never declare `UnionAttribute`, `IUnion` or `IsClosedTypeAttribute` locally: the grep above holds |
| The unguarded build is green on `net8.0` or `net10.0` | `FLIPPED`. The fence is no longer needed for that construct: report which one, and keep the fence until the owner edits the rules |

## R3 The 11.0-all analyzer re-diff

New rule IDs arrive with each SDK feature band. `AnalysisLevel` moves to `11.0-all` in its own commit (CS-BUILD-10)
after the added IDs are known. The first probe lists the IDs the level adds; the second plants one site per ID.

```sh
# r3
dir=$(dotnet --list-sdks | awk '$1 ~ /^11\./ {gsub(/[][]/, "", $2); print $2 "/" $1}' | tail -1)
c="$dir/Sdks/Microsoft.NET.Sdk/analyzers/build/config"
test -f "$c/analysislevel_11_all.globalconfig" || { echo "no SDK 11"; exit 1; }
comm -13 <(grep -E '^dotnet_diagnostic\.' "$c/analysislevel_10_all.globalconfig" | sort) <(grep -E '^dotnet_diagnostic\.' "$c/analysislevel_11_all.globalconfig" | sort)
```

Observed 2026-10-11 (RC1): exit 0 and six added lines, each `severity = warning`: CA1517, CA1876, CA1877,
CA2026, CA2027, CA2028. **CA1878 is absent from the RC1 file.** Run the probe at GA and add every ID it prints.
Red twin: the same lines with `^12` in place of `^11` print `no SDK 11` and exit 1.

```sh
# r3b
. "${TMPDIR:-/tmp}/dotnet-upgrade/env.sh"; P="$L/probe"; test -f "$P/global.json" || { echo 'run r0 first'; exit 1; }
mkdir -p "$P/r3" && cd "$P/r3" || exit 1
cat > A.csproj <<'EOF'
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net11.0</TargetFramework>
    <OutputType>Exe</OutputType>
    <ImplicitUsings>enable</ImplicitUsings>
    <AnalysisLevel>$(Level)</AnalysisLevel>
    <EnableDefaultCompileItems>false</EnableDefaultCompileItems>
  </PropertyGroup>
  <ItemGroup><Compile Include="$(Case).cs" /></ItemGroup>
</Project>
EOF
cat > Red.cs <<'EOF'
using System.Text.Json;
foreach (var x in new[] { 1, 2 }.AsParallel()) { Console.WriteLine(x); }
Console.WriteLine(Path.Combine(Path.Combine("a", "b"), "c"));
Console.WriteLine(JsonDocument.Parse("{}").RootElement.ValueKind);
EOF
cat > Green.cs <<'EOF'
using System.Text.Json;
foreach (var x in new[] { 1, 2 }) { Console.WriteLine(x); }
Console.WriteLine(Path.Combine("a", "b", "c"));
Console.WriteLine(JsonElement.Parse("{}").ValueKind);
EOF
dn r3a build A.csproj -p:Case=Red -p:Level=11.0-all; diags r3a      # CA1861, CA1876, CA1877, CA2026
dn r3b build A.csproj -p:Case=Red -p:Level=10.0-all; diags r3b      # CA1861 only
dn r3c build A.csproj -p:Case=Green -p:Level=11.0-all; diags r3c    # no output
```

Observed 2026-10-11: the `Red` site printed CA1876 (`AsParallel()` directly in a `foreach`), CA1877 (nested
`Path.Combine`) and CA2026 (`JsonDocument.Parse(...).RootElement` leaks the document) at `11.0-all`, and only CA1861 at
`10.0-all` on the same SDK; `Green` printed nothing. On the two-project test library (DN-UPG-12): `IDE0370` once per TFM, and on the
`net11.0` leg `CA2016` (`WriteAsync(string)` gained a token overload). CA1517, CA2027 and CA2028 found no site in the test library.

| Outcome | Decision |
|---|---|
| The diff lists IDs and the tree has sites | `STILL`. One commit raises `AnalysisLevel`, fixes each site at the site (CS-BUILD-12) and lists the new IDs in its body. Never a `NoWarn` |
| The diff prints nothing and the tree builds | `FLIPPED`. Raise the level in a single line commit and say the diff was empty |

## R4 The net8 floor numbers

The numbers behind CS-PERF-07 were measured on .NET 10 only. This probe compares allocation per call on the two
runtimes with one counter, so a claim keeps its meaning while `net8.0` is in the list.

```sh
# r4
. "${TMPDIR:-/tmp}/dotnet-upgrade/env.sh"; P="$L/probe"; test -f "$P/global.json" || { echo 'run r0 first'; exit 1; }
mkdir -p "$P/r4" && cd "$P/r4" || exit 1
cat > P.csproj <<'EOF'
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFrameworks>net8.0;net10.0</TargetFrameworks>
    <OutputType>Exe</OutputType>
    <ImplicitUsings>enable</ImplicitUsings>
    <TieredPGO>false</TieredPGO>
    <TieredCompilation>false</TieredCompilation>
  </PropertyGroup>
</Project>
EOF
cat > Program.cs <<'EOF'
using System.Runtime.CompilerServices;

int[] data = Enumerable.Range(0, 1000).ToArray();

static long Bytes(Func<long> body)
{
    for (int i = 0; i < 50; i++) { body(); }
    long before = GC.GetAllocatedBytesForCurrentThread();
    body();
    return GC.GetAllocatedBytesForCurrentThread() - before;
}

[MethodImpl(MethodImplOptions.NoInlining)]
static long Linq(int[] d) => d.Where(x => x % 2 == 0).Select(x => x * 2).Sum();
[MethodImpl(MethodImplOptions.NoInlining)]
static long ToListCount(int[] d) => d.Where(x => x % 2 == 0).Select(x => x * 2).ToList().Count;
[MethodImpl(MethodImplOptions.NoInlining)]
static long Loop(int[] d) { long s = 0; foreach (int x in d) { if (x % 2 == 0) { s += x * 2; } } return s; }
[MethodImpl(MethodImplOptions.NoInlining)]
static long Concat() { string s = ""; for (int i = 0; i < 200; i++) { s += "line"; } return s.Length; }

Console.WriteLine($"R4 {Environment.Version} Where.Select.Sum={Bytes(() => Linq(data))} B");
Console.WriteLine($"R4 {Environment.Version} ToList().Count={Bytes(() => ToListCount(data))} B");
Console.WriteLine($"R4 {Environment.Version} foreach={Bytes(() => Loop(data))} B");
Console.WriteLine($"R4 {Environment.Version} string += x200={Bytes(() => Concat())} B");
EOF
dn r4 build -c Release; diags r4                      # exit 0, no output
for t in net8.0 net10.0; do dotnet "bin/Release/$t/P.dll"; done    # four lines per runtime
```

Observed 2026-10-11 (runtimes 8.0.31 and 10.0.12): `Where.Select.Sum` 104 B on both, `foreach` 0 B on both,
`string +=` over 200 appends 165568 B on both, and `.ToList().Count` **4408 B on 8.0.31 against 2160 B on 10.0.12**.
The probe's counter is not the BenchmarkDotNet `Allocated` column of CS-PERF-07 (152 B and 1,544 B per 1,000 items
on .NET 10), so use the probe for the cross-runtime comparison and for a before and after on one method, and use
BenchmarkDotNet for any claim (CS-PERF-09).

| Outcome | Decision |
|---|---|
| The ordering holds on both runtimes (`foreach` 0 B, LINQ above it, `.ToList().Count` above LINQ, `+=` far above) | `STILL`. CS-PERF-07 stands for both legs; quote the .NET 10 numbers only with the runtime named |
| `foreach` allocates, or the ordering changes on one runtime | `FLIPPED`. Report the lines verbatim; no allocation claim for that runtime |

## R5 Dropping net8 removes the CS-LANG-08 and 09 cause

CS-LANG-08 exists because the same `a.Reverse();` at `LangVersion` 14 reverses in place on net8.0 and is a discarded
no-op on net10.0. Run this after `net8.0` leaves `TargetFrameworks` (DN-UPG-11), and before it to see the cause.

```sh
# r5
. "${TMPDIR:-/tmp}/dotnet-upgrade/env.sh"; P="$L/probe"; test -f "$P/global.json" || { echo 'run r0 first'; exit 1; }
mkdir -p "$P/r5" && cd "$P/r5" || exit 1
cat > P.csproj <<'EOF'
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFrameworks>$(Legs)</TargetFrameworks>
    <OutputType>Exe</OutputType>
    <LangVersion>14</LangVersion>
    <AnalysisLevel>10.0-all</AnalysisLevel>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
</Project>
EOF
printf 'int[] a = [1, 2, 3];\na.Reverse();\nConsole.WriteLine("R5 " + string.Join(",", a));\n' > Program.cs
dn r5a build -p:Legs=net8.0; diags r5a; dotnet bin/Debug/net8.0/P.dll    # exit 0, no diagnostic, R5 3,2,1
dn r5b build -p:Legs=net10.0; diags r5b                                  # exit 1: CA1806 on the discarded result
```

Observed 2026-10-11 on SDK 10.0.401: `net8.0` built clean and printed `R5 3,2,1`; `net10.0` failed with `CA1806`.
Same source, same `LangVersion`, opposite result: this is the cause.

| Outcome | Decision |
|---|---|
| `TargetFrameworks` still lists `net8.0` | `NOT-TRIGGERED`. CS-LANG-08 and CS-LANG-09 stand |
| `net8.0` is gone and the second command fails with CA1806 | `FLIPPED`. The binding cause is gone: tell the owner that CS-LANG-08's ban and CS-LANG-09's per-TFM wording can be re-scoped to one leg. Do not edit the rule files in the upgrade commit |
