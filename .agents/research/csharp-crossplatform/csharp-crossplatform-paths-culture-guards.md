---
title: "Paths, culture and platform guards: portability rules for .NET library code"
topic: csharp-crossplatform-paths-culture-guards
agent: deep-dive researcher (group csharp-crossplatform, "Portable code, and the proof it runs everywhere")
model: sonnet (claude-sonnet-5-5)
date_researched: 2026-10-10
sources_count: 29
scope: |
  Covers rules for .NET 8 LTS floor / .NET 10 LTS (SDK 10.0.401) library code that touches file paths, string comparison and formatting, child-process output, special folders, links, time, and OS-specific APIs; each rule has an analyzer ID, a BannedSymbols.txt entry or a grep, and was exercised on Linux (Fedora/WSL2) and on the Windows 11 host.
  Does not cover: process-spawning design (cancellation, quoting, job objects), AOT/trimming, RID/packaging, CI matrix design. macOS behaviour is recorded as UNVERIFIED locally (no macOS host); where macOS is cited it comes from .NET runtime source or docs, not from a run.
  .NET 11 / C# 15 RC1: only the analyzer-default check was run (identical to 10.0.401); nothing else here is 11-specific.
---

# Paths, culture and platform guards

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Path.Combine discards, Path.Join does not](#1-pathcombine-discards-pathjoin-does-not)
   2. [Case sensitivity and path comparison](#2-case-sensitivity-and-path-comparison)
   3. [Windows names: reserved, trailing dot/space, colon, invalid chars](#3-windows-names-reserved-trailing-dotspace-colon-invalid-chars)
   4. [MAX_PATH and long paths](#4-max_path-and-long-paths)
   5. [Junctions vs symlinks, LinkTarget, ResolveLinkTarget](#5-junctions-vs-symlinks-linktarget-resolvelinktarget)
   6. [Home directory: GetFolderPath vs HOME/USERPROFILE (Python smell S7)](#6-home-directory-getfolderpath-vs-homeuserprofile-python-smell-s7)
   7. [Child output: NewLine, CRLF, encoding](#7-child-output-newline-crlf-encoding)
   8. [Culture: formatting into argv (CA1305) and the interpolation hole](#8-culture-formatting-into-argv-ca1305-and-the-interpolation-hole)
   9. [Culture: comparison rules CA1307/1309/1310/1311, InvariantCulture is not invariant](#9-culture-comparison-rules-ca130713091310-1311-invariantculture-is-not-invariant)
   10. [InvariantGlobalization in tests masks bugs](#10-invariantglobalization-in-tests-masks-bugs)
   11. [Platform guards and CA1416](#11-platform-guards-and-ca1416)
   12. [Time: TimeProvider and the RS0030 ban](#12-time-timeprovider-and-the-rs0030-ban)
   13. [The portability BannedSymbols.txt](#13-the-portability-bannedsymbolstxt)
   14. [Analyzer severities: the SDK is silent by default](#14-analyzer-severities-the-sdk-is-silent-by-default)
   15. [Verified on the toolchain](#15-verified-on-the-toolchain)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- `Path.Combine(root, x)` returns `x` alone when `x` is rooted; on Windows this includes `\Windows` (current-drive root) and `D:\x`, and `C:foo` is returned verbatim too. Use `Path.Join` to concatenate and a validated `PathSafe.Combine` for any segment not written as a literal in your own source. Observed on Linux and Windows 11 (see 1).
- `Path.Join` is not a sandbox either: `Path.Join(root, "../../x")` keeps the `..`. A safe combine rejects rooted input, then `GetFullPath`s and checks containment against `root + separator` (not bare `root`, or `home-evil` passes for `home`).
- Path comparison has no portable answer: the runtime itself treats Windows/macOS/iOS/tvOS as case-insensitive and everything else as case-sensitive; Linux produced 2 files for `Foo.txt`/`foo.txt`, Windows 1 (first-created name kept, last write wins). Use `Ordinal` vs `OrdinalIgnoreCase` by OS, never a culture comparer, and never create two artifacts that differ only by case.
- Linux happily creates names Windows cannot: `NUL.txt`, `con`, `trail.`, `trail `, `a:b`, `q?.txt`. Windows silently rewrote `trail.`/`trail ` to `trail` and turned `colon:stream` into an alternate data stream, and rejected `q?`. Any path component derived from external input (package name, tag, archive entry) must pass a portable-name validator; `Path.GetInvalidFileNameChars()` returns 2 chars on Linux and 41 on Windows, so it is not that validator.
- .NET Core/.NET 5+ does not enforce `MAX_PATH`; a 363-char path worked on Windows. Do not hand-prefix `\\?\`, ship a `longPathAware` manifest, or add 260-char checks to .NET 8+ code.
- Windows directory links in ocx are NTFS junctions. `FileSystemInfo.LinkTarget` and `ResolveLinkTarget(true)` resolve junctions and symlinks alike (observed); the BCL has no junction-creating API (reflection: only `CreateSymbolicLink`/`CreateAsSymbolicLink`), and `Directory.CreateSymbolicLink` failed on the Windows host with "A required privilege is not held". An SDK should read links, never create them.
- Home dir: ocx honours `OCX_HOME`, else `~/.ocx` via the OS home (`USERPROFILE` on Windows). .NET's `GetFolderPath(UserProfile)` ignores a changed `USERPROFILE` on Windows (returned `C:\Users\ecom` with `USERPROFILE=C:\fake`) and returns `""` on Linux when `$HOME` points to a missing dir. Resolve env first (`OCX_HOME`, then `USERPROFILE` on Windows or `HOME` elsewhere), then `GetFolderPath(UserProfile)`, and fail loudly on empty. Never use `SpecialFolder.Personal`/`MyDocuments` as "home" (changed meaning in .NET 8).
- Never split child output on `Environment.NewLine`. Real `ocx.exe` 0.5.7 on Windows emitted `\n` only (0 CR bytes), so `Split(Environment.NewLine)` returned 1 element; `printf 'a\r\nb\r\n'` on Linux left a trailing `\r` with `Split('\n')`. `StringReader`/`StreamReader.ReadLine` handles `\n`, `\r`, `\r\n`.
- Set `StandardOutputEncoding`/`StandardErrorEncoding` to `new UTF8Encoding(false)` on every redirected `Process`: on Windows the default decoded UTF-8 `café` as `caf` + U+251C U+2310 (OEM CP437), on Linux it was fine.
- The SDK ships CA1305/CA1307/CA1309/CA1310/CA1311 disabled. On 10.0.401 and 11.0.100-rc.1 a file with 14 culture violations built with 0 warnings; `<AnalysisModeGlobalization>All</AnalysisModeGlobalization>` turns them on as warnings. Set the six IDs to `error` in `src/`.
- `$"--timeout={1.5}"` is not flagged by any CA rule and produced `--timeout=1,5` under `de-DE`. Use `string.Create(CultureInfo.InvariantCulture, $"...")` and enable Meziantou `MA0076` as error (it fired on the red, not the green).
- `double.Parse("1.5")` under `de-DE` returned `15`, under `fr-FR` threw `FormatException`. Parsing is as dangerous as formatting; CA1305 covers it.
- `InvariantCulture` is not a comparison escape hatch: `StringComparison.InvariantCulture` equated `"\u00e9"` and `"e\u0301"` and ignored `\0`, and ICU vs NLS sort differences are documented. Ban `StringComparer.InvariantCulture*`/`StringComparison.InvariantCulture*` with RS0030; `CultureInfo.InvariantCulture` as an `IFormatProvider` stays correct.
- `InvariantGlobalization=true` in a test project hides culture bugs: with `LANG=de_DE.UTF-8` plus invariant mode `CurrentCulture` was `''` and `1.5.ToString()` was `1.5`. It also makes `new CultureInfo("de-DE")` throw. Keep it out of library test projects; keep it for AOT/container apps without libicu (the runtime otherwise terminates with "Failed to load system ICU").
- CA1416 only trusts `OperatingSystem.IsX()`, `RuntimeInformation.IsOSPlatform`, `Debug.Assert` of those, and members tagged `[SupportedOSPlatformGuard]`. `Environment.OSVersion.Platform == Win32NT` and an unattributed `IsWin()` helper both still raised CA1416. An unannotated `[DllImport("kernel32")]` raised nothing; annotate the wrapper `[SupportedOSPlatform("windows")]`.
- Raise CA1416 to `error` (default is warning), and prefer runtime guards in one `net8.0;net10.0` assembly over a `net10.0-windows` TFM, which marks the whole assembly Windows-only.
- Ban `DateTime.Now/UtcNow/Today` and `DateTimeOffset.Now/UtcNow` with `BannedSymbols.txt` (RS0030, default severity warning, set to error) and inject `TimeProvider` (in-box since .NET 8; `Microsoft.Bcl.TimeProvider` for netstandard2.0).
- `Directory.SetCurrentDirectory` is process-global; ban it in library and test code and pass absolute paths / `ProcessStartInfo.WorkingDirectory`.

## Findings

Environment key for every "observed" claim: **Linux** = Fedora 43 on WSL2, runtime 10.0.12, SDK 10.0.401 via `run.sh`. **Windows** = the Windows 11 host (OS 10.0.26200, runtime 10.0.2, de-DE regional settings, `LongPathsEnabled=1`, Developer Mode off), run via `cmd.exe /c "dotnet probe.dll <section>"` from `C:\Users\ecom\csharp-wintest\probe`. **macOS** = never run; marked UNVERIFIED. Raw outputs are in `fixtures/csharp-crossplatform-paths-culture-guards/results/` (path in 15).

### 1. Path.Combine discards, Path.Join does not

The docs: "if an argument other than the first contains a rooted path, any previous path components are ignored" and, for user-supplied input, "call the Join or TryJoin method instead" ([Path.Combine](https://learn.microsoft.com/en-us/dotnet/api/system.io.path.combine)). `Join` "does not attempt to root the returned path" and the Join page spells out the security consequence: with `Combine`, user input can reach "a file system resource ... that the application did not intend" ([Path.Join](https://learn.microsoft.com/en-us/dotnet/api/system.io.path.join)). `Path.Join(ReadOnlySpan<string>)` and `Path.Combine(ReadOnlySpan<string>)` exist from .NET 9 (same pages).

Windows adds two traps the Linux-only mind misses ([file path formats](https://learn.microsoft.com/en-us/dotnet/standard/io/file-path-formats)): `\Windows` is rooted on the current drive, and `C:foo` is "relative to the current directory of the C: drive" (drive-relative, "a common source of bugs"). `Path.IsPathRooted("C:foo")` is `True`, `Path.IsPathFullyQualified("C:foo")` is `False`.

Observed (probe section `pathjoin`, `root = /srv/ocx/home` on Linux, `C:\ocx\home` on Windows):

| relative arg | Combine | Join |
|---|---|---|
| Linux `/etc/passwd` | `/etc/passwd` (escapes) | `/srv/ocx/home/etc/passwd` |
| Linux `\etc\passwd` | `/srv/ocx/home/\etc\passwd` (backslash is a plain char) | same |
| Windows `\Windows\System32` | `\Windows\System32` (escapes, drive-less) | `C:\ocx\home\Windows\System32` |
| Windows `D:\x` | `D:\x` (escapes) | `C:\ocx\home\D:\x` (nonsense path) |
| Windows `C:foo` | `C:foo` (escapes, cwd-of-C: relative) | `C:\ocx\home\C:foo` |
| both `..\..\x` / `../../x` | keeps `..` | keeps `..` |

Incorrect (compiles, passes review on Linux, escapes on both OSes):

```csharp
// registry-derived or caller-supplied segment `rel`
var dest = Path.Combine(ocxHome, rel);          // rel = "/etc/passwd" -> "/etc/passwd"
var dest2 = Path.Join(ocxHome, rel);            // "../../x" still leaves the root
```

Correct (tested, rejects all rows above, plus the sibling-prefix case `../home-evil/x`):

```csharp
static string Combine(string root, string relative)
{
    if (Path.IsPathRooted(relative) || relative.StartsWith('\\') || relative.StartsWith('/'))
        throw new ArgumentException($"'{relative}' must be relative", nameof(relative));
    var full = Path.GetFullPath(Path.Join(root, relative));
    var rootFull = Path.TrimEndingDirectorySeparator(Path.GetFullPath(root)) + Path.DirectorySeparatorChar;
    if (!full.StartsWith(rootFull, Comparison))   // Ordinal on Linux, OrdinalIgnoreCase on Windows/macOS
        throw new ArgumentException($"'{relative}' escapes the root", nameof(relative));
    return full;
}
```

Two further BCL facts: `Path.GetFullPath(string, string)` (resolve against an explicit base) exists since .NET Core 2.1, and the docs warn "Relative paths are dangerous in multithreaded applications" because the current directory is per-process ([file path formats](https://learn.microsoft.com/en-us/dotnet/standard/io/file-path-formats)). Starting in .NET 8 the runtime no longer maps `\` to `/` on Unix, so `\` is a legal filename character there ([breaking change](https://learn.microsoft.com/en-us/dotnet/core/compatibility/core-libraries/8.0/file-path-backslash)): do not "normalize" backslashes in names on Unix. The docs' own advice: "Use Path.DirectorySeparatorChar ... instead of hardcoding" (same page).

Exemplars: Nuke asserts rather than bans: `Assert.False(HasPathRoot(right), "Second path must not be rooted")` (`nuke-build__nuke@27e8077b8ab0:source/Nuke.Utilities/IO/PathConstruction.cs:201`); Cake throws on a non-relative argument (`cake-build__cake@08885933e936:src/Cake.Core/IO/DirectoryPath.cs:114-117,131-134`). Both give the same guarantee as `PathSafe.Combine` minus the containment check.

### 2. Case sensitivity and path comparison

The runtime's own rule, in `PathInternal`: `IsCaseSensitive` is `!(OperatingSystem.IsWindows() || OperatingSystem.IsMacOS() || OperatingSystem.IsIOS() || OperatingSystem.IsTvOS())`, mapped to `StringComparison.Ordinal` or `OrdinalIgnoreCase` ([dotnet/runtime PathInternal.CaseSensitivity.cs](https://raw.githubusercontent.com/dotnet/runtime/main/src/libraries/Common/src/System/IO/PathInternal.CaseSensitivity.cs)). So the BCL treats macOS as insensitive; the macOS default is APFS case-insensitive but a volume can be case-sensitive, and .NET exposes no per-directory query. UNVERIFIED locally (no macOS host). Windows docs: "Do not assume case sensitivity"; NTFS can enable POSIX case sensitivity per directory but "this is not the default" ([Naming Files](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file)).

Observed (`case` section): writing `Foo.txt` ("upper") then `foo.txt` ("lower") in one directory:

- Linux: 2 files on disk `[Foo.txt,foo.txt]`; `File.Exists("FOO.TXT")` = `False`.
- Windows: 1 file on disk `[Foo.txt]` (first-created casing kept), `ReadAllText("Foo.txt")` = `lower` (second write won); `File.Exists("FOO.TXT")` = `True`.
- `HashSet<string>` with `Ordinal` counted 2 on both OSes, `OrdinalIgnoreCase` counted 1: the collection comparer is not the filesystem. A test asserting `Directory.GetFiles(...).Length == 1` passes on Windows and fails on Linux; one asserting `== 2` does the reverse. That is the "case-only collision test" red; the green is making the product refuse to create two entries whose names differ only by case (compare with `OrdinalIgnoreCase` on every OS when writing, because the *strictest* host decides portability).

Exemplar spread (all differ):

- Nuke picks the comparison from the *shape* of the path, not the OS: `HasWinRoot(_path) ? OrdinalIgnoreCase : Ordinal` (`nuke-build__nuke@27e8077b8ab0:source/Nuke.Utilities/IO/AbsolutePath.cs:141`).
- Cake picks by OS but treats macOS as case-sensitive: `PathComparer.Default = new PathComparer(EnvironmentHelper.IsUnix())` (`cake-build__cake@08885933e936:src/Cake.Core/IO/PathComparer.cs:25`) where `IsUnix` is `Linux || OSX || FreeBSD` (`.../Polyfill/EnvironmentHelper.cs:61-65`). That disagrees with the runtime's rule above.

Incorrect: `string.Equals(a, b, StringComparison.CurrentCultureIgnoreCase)` or `InvariantCultureIgnoreCase` on paths. Under `tr-TR` observed `Compare("I","i", tr, IgnoreCase)` = `-1` where `OrdinalIgnoreCase` = `0`. The best-practices doc tabulates "File paths. Registry keys and values. Environment variables" under *Ordinal / OrdinalIgnoreCase* ([best practices for comparing strings](https://learn.microsoft.com/en-us/dotnet/standard/base-types/best-practices-strings)).

### 3. Windows names: reserved, trailing dot/space, colon, invalid chars

Win32 rules ([Naming Files](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file)): reserved characters `< > : " / \ | ? *` and code points 1-31; reserved device names `CON, PRN, AUX, NUL, COM1-COM9, COM¹ COM² COM³, LPT1-LPT9, LPT¹ LPT² LPT³`, "also avoid these names followed immediately by an extension; for example, NUL.txt and NUL.tar.gz are both equivalent to NUL"; "Do not end a file or directory name with a space or a period". The .NET file-path doc adds that normalization strips trailing periods and spaces, and "You should **never** create a directory or filename with a trailing space" ([file path formats](https://learn.microsoft.com/en-us/dotnet/standard/io/file-path-formats)). Prior to Windows 11 `Path.GetFullPath` turns `COM1.TXT\file1.txt` into the device path `\\.\COM1` (same page).

Observed (`reserved` section, files written with `File.WriteAllText(Path.Join(dir, name))`):

| name | Linux | Windows 11 (26200) |
|---|---|---|
| `NUL.txt`, `con`, `aux.json`, `COM1`, `COM¹` | created, literal name on disk | created in a subdirectory on this build |
| `trail.` | created | written, but on-disk name is `trail` |
| `trail ` | created | written, on-disk name `trail` (collides with the line above) |
| `colon:stream` | created, literal | written to alternate data stream; listing shows an empty file `colon` |
| `q?.txt` | created | `IOException: The filename, directory name, or volume label syntax is incorrect` |

The reserved-name row is host-dependent: Windows 11 build 26200 let them be created with a full path, but the doc says pre-Windows-11 `GetFullPath` resolves them to devices, and shells/other tools still choke. Treat them as forbidden everywhere; I could not test Windows 10. The Windows lines for `trail.`, `trail `, `colon:stream` are the dangerous ones: silent aliasing, silent data redirection.

`Path.GetInvalidFileNameChars()` is *not* a portability validator: `Length=2` on Linux, `41` on Windows; `':'`, `'?'` and `'\'` are invalid only on Windows (`invalid` section). A validator that mirrors the Win32 table (tested; returned `False` for all ten names above except `ok.txt`):

```csharp
static readonly HashSet<string> Reserved = new(StringComparer.OrdinalIgnoreCase)
{ "CON","PRN","AUX","NUL","COM0","COM1","COM2","COM3","COM4","COM5","COM6","COM7","COM8","COM9","COM\u00B9","COM\u00B2","COM\u00B3",
  "LPT0","LPT1","LPT2","LPT3","LPT4","LPT5","LPT6","LPT7","LPT8","LPT9","LPT\u00B9","LPT\u00B2","LPT\u00B3" };

public static bool IsPortableFileName(string name)
{
    if (name.Length == 0 || name is "." or "..") return false;
    if (name[^1] is ' ' or '.') return false;
    if (name.AsSpan().IndexOfAny("<>:\"/\\|?*") >= 0) return false;
    foreach (var ch in name) if (ch < 32) return false;
    var stem = name.Contains('.', StringComparison.Ordinal) ? name[..name.IndexOf('.', StringComparison.Ordinal)] : name;
    return !Reserved.Contains(stem.TrimEnd(' '));
}
```

(`COM0`/`LPT0` come from the extended list in current Win32 docs' CLI behaviour; the page lists `COM1-COM9` explicitly, so `COM0`/`LPT0` is a conservative superset — cheap to forbid.)

### 4. MAX_PATH and long paths

Win32: `MAX_PATH` is 260; `\\?\` lifts it to ~32,767; since Windows 10 1607 opt-in needs the registry value `LongPathsEnabled=1` *and* a `longPathAware` manifest ([Maximum Path Length](https://learn.microsoft.com/en-us/windows/win32/fileio/maximum-file-path-limitation)). For .NET: "`.NET Core and .NET 5+ handles long paths implicitly and doesn't perform a MAX_PATH check. The MAX_PATH check applies only to .NET Framework`" ([file path formats](https://learn.microsoft.com/en-us/dotnet/standard/io/file-path-formats)). Observed: Windows created, wrote and read a 363-char path with plain `Directory.CreateDirectory`/`File.WriteAllText` (Linux: 387). Caveat: the host has `LongPathsEnabled=1`, so the `=0` case is documented but UNVERIFIED here. Shells, Explorer and many native tools still choke ("It is possible to create a path with the Windows API that the shell user interface is not able to interpret", same Win32 page), so keep ocx-facing paths short (`OCX_HOME` default `~/.ocx` is short by design) rather than "fixing" them.

Incorrect (.NET Framework-era advice): hand-prefixing `\\?\`, `if (path.Length > 259) throw`, `AppContext.SetSwitch("Switch.System.IO.UseLegacyPathHandling", false)`, manifests. Correct: pass the path to `System.IO`.

### 5. Junctions vs symlinks, LinkTarget, ResolveLinkTarget

ocx uses NTFS junctions for directory links on Windows because they need no privilege (`ocx-cli-contract.md`: "Directory links on Windows are NTFS junctions (no admin/Developer Mode needed)", citing ocx `in-depth/storage.md:267`). A junction "links directories located on different local volumes on the same computer", directories only, implemented as a reparse point ([Hard Links and Junctions](https://learn.microsoft.com/en-us/windows/win32/fileio/hard-links-and-junctions)).

`FileSystemInfo.ResolveLinkTarget(bool returnFinalTarget)`: returns the target "independently if the target exists or not; `null` if this file or directory is not a link"; "Symbolic links and junctions are the types of links this API can resolve"; limits 40 hops on Unix, 63 on Windows; throws `IOException` if the entry does not exist ([ResolveLinkTarget](https://learn.microsoft.com/en-us/dotnet/api/system.io.filesysteminfo.resolvelinktarget)).

Observed:

- Windows junction created with `cmd /c mklink /J`: `DirectoryInfo.Exists=True`, `LinkTarget=C:\...\target`, `ResolveLinkTarget(false)` and `(true)` both the absolute target, `Attributes` has `ReparsePoint`, and `keep.txt` is reachable through it. `Directory.Delete(junction, recursive:true)` removed the junction and left `target\keep.txt` intact (.NET 10.0.2).
- Windows `Directory.CreateSymbolicLink`: `IOException: A required privilege is not held by the client` (Developer Mode off). So an SDK cannot assume symlinks work on Windows and must not create links; it reads them.
- Reflection on `Directory`, `File`, `DirectoryInfo`, `FileInfo`, `FileSystemInfo`, `Path` (10.0.12): the only link members are `CreateSymbolicLink`, `CreateAsSymbolicLink`, `ResolveLinkTarget`, `LinkTarget`. There is no junction-creating API in the BCL.
- Linux: a relative symlink reports `LinkTarget='target'` (the stored text) while `ResolveLinkTarget(false).FullName` is absolute; a dangling symlink has `Exists=False` but non-null `LinkTarget`.

Rule of thumb: "is it a link" is `info.LinkTarget is not null`, never `Exists`/`Attributes`; "where does it go" is `ResolveLinkTarget(returnFinalTarget: true)?.FullName`. Exemplars use exactly this: `GitVersion ... GitStatusCalculator.cs:130` (`new FileInfo(filePath).LinkTarget`), `microsoft__testfx@7226b0c74729:src/Platform/SharedExtensionHelpers/MergeOutputFileHelper.cs:120` (`ResolveLinkTarget(returnFinalTarget: false)`, one hop then recurse). Temp-dir canonicalization on macOS (`/var` is a symlink to `/private/var`) is a known source of path-equality failures in tests; UNVERIFIED here.

### 6. Home directory: GetFolderPath vs HOME/USERPROFILE (Python smell S7)

The contract: ocx's data root is `$OCX_HOME`, else `~/.ocx` on every OS; the home is Rust `std::env::home_dir` ("`%USERPROFILE%` on Windows, deliberately not `dirs::home_dir`", `ocx_env/src/lib.rs:398-408`, quoted in `ocx-cli-contract.md`). Python SDK smell S7: `discover()` reads `HOME` only, which is normally unset on Windows, so `%USERPROFILE%\.ocx` is never found (`python-sdk-digest.md` S7: "`_types.py:104-107,160-173`; `_bootstrap.py:282-289`").

.NET behaviour, observed (`folders` section; raw in `results/folders-env.txt`):

| scenario | result |
|---|---|
| Linux, `HOME` unset or `env -i` | `GetFolderPath(UserProfile)` = `/home/mherwig` (passwd fallback) |
| Linux, `HOME=/tmp/fakehome-exists` (exists) | `/tmp/fakehome-exists` (env wins) |
| Linux, `HOME=/tmp/fakehome` (missing dir) | `""` empty string |
| Linux, `HOME=` (empty) | `/home/mherwig` |
| Windows, `HOME` and `USERPROFILE` both cleared | `C:\Users\ecom` (shell API fallback) |
| Windows, `USERPROFILE=C:\fake` | `C:\Users\ecom` (env var ignored) |

Consequences: (a) `Environment.GetEnvironmentVariable("HOME")` alone is the S7 bug; (b) `GetFolderPath(UserProfile)` alone ignores a hermetic test's `USERPROFILE` override on Windows (Rust ocx would honour it); (c) treat `""` as "missing", per the docs "otherwise, an empty string" ([GetFolderPath](https://learn.microsoft.com/en-us/dotnet/api/system.environment.getfolderpath)). So mirror ocx: `OCX_HOME` (non-empty) ?? (`USERPROFILE` on Windows, `HOME` elsewhere, non-empty) ?? `GetFolderPath(UserProfile)` (non-empty) ?? fail.

```csharp
static string OcxHome(Func<string, string?> env)           // env is the child env snapshot, not the process env
{
    static string? Nz(string? s) => string.IsNullOrEmpty(s) ? null : s;
    var home = Nz(env("OCX_HOME"));
    if (home is not null) return home;
    var user = Nz(env(OperatingSystem.IsWindows() ? "USERPROFILE" : "HOME"))
            ?? Nz(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile))
            ?? throw new InvalidOperationException("cannot determine home; set OCX_HOME");
    return Path.Join(user, ".ocx");
}
```

.NET 8 changed `MyDocuments`/`Personal` on Unix from `$HOME` to `~/Documents` (XDG_DOCUMENTS_DIR on Linux, NSDocumentDirectory on macOS) and macOS `ApplicationData`/`LocalApplicationData` to `Library/Application Support`; the doc's fix is "pass `SpecialFolder.UserProfile` instead" ([GetFolderPath on Unix](https://learn.microsoft.com/en-us/dotnet/core/compatibility/core-libraries/8.0/getfolderpath-unix)). Observed Linux 10.0.12: `Personal` = `/home/mherwig/Documents`.

Exemplars: dotnet/command-line-api picks the variable by OS (`RuntimeInformation.IsOSPlatform(OSPlatform.Windows) ? "USERPROFILE" : "HOME"`, `dotnet__command-line-api@ba7fb9bd4443:src/System.CommandLine.Suggest/DotnetProfileDirectory.cs:15`); GitVersion uses `HOME ?? GetFolderPath(UserProfile)` (`GitTools__GitVersion@5057cdbcc177:src/GitVersion.Git.Managed/Status/GitStatusCalculator.cs:212-213`); Nuke falls back `GetFolderPath` empty -> `USERPROFILE` (`nuke-build__nuke@27e8077b8ab0:source/Nuke.Utilities/EnvironmentInfo.SpecialFolder.cs:35`); SourceLink's hermetic tests set both `HOME` and `USERPROFILE` (`dotnet__sourcelink@6ec19dda0e19:src/SourceLink.Git.IntegrationTests/GitHubTests.cs:85,104`); Npgsql uses `APPDATA` vs `HOME` (`npgsql__npgsql@9c47244547c2:src/Npgsql/PostgresEnvironment.cs:60`).

### 7. Child output: NewLine, CRLF, encoding

`Environment.NewLine` is `\r\n` on non-Unix and `\n` on Unix ([Environment.NewLine](https://learn.microsoft.com/en-us/dotnet/api/system.environment.newline)); it describes *this* process's platform, not the child's. `StreamReader.ReadLine` defines a line as ending in `\n`, `\r` or `\r\n` and strips the terminator; a trailing newline does not yield an extra empty line ([StreamReader.ReadLine](https://learn.microsoft.com/en-us/dotnet/api/system.io.streamreader.readline)).

Observed (`newline` section; the raw bytes of a real ocx first):

- Real `ocx.exe` 0.5.7 on Windows, `ocx version > file` and `ocx --format json version > file`: `0.5.7\n` (6 bytes) and a JSON document with LF only; `grep -c $'\r'` = 0 for both. Rust `println!` does not translate to CRLF.
- Windows, LF-only text `"one\ntwo\n"`: `Split(Environment.NewLine)` -> **1 element** (`one\ntwo\n`), `Split('\n')` -> 2, `ReadLine` -> 2.
- Windows, CRLF text from `cmd /c echo`: `Split(NewLine)` -> 2, `Split('\n')` -> 2 but each keeps `\r` (`one\r`), `ReadLine` -> 2 clean.
- Linux, `printf 'one\r\ntwo\r\n'`: `Split(NewLine)` -> `one\r|two\r`, `Split('\n')` -> same, `ReadLine` -> `one|two`.

Only `ReadLine` is right in all four. Incorrect: `output.Split(Environment.NewLine)`, `output.Split('\n')`, `output.Replace("\r\n","\n")` on one side only. Correct:

```csharp
using var reader = new StringReader(stdout);
for (string? line; (line = reader.ReadLine()) is not null; ) { /* line has no terminator */ }
```

Exemplars that handle both: GitVersion tests `Split(["\r\n", "\n"], None)` (`GitTools__GitVersion@5057cdbcc177:src/GitVersion.Testing/Extensions/StringExtensions.cs:25`), Nuke `Split(new[] { "\r\n", "\n" }, options)` (`nuke-build__nuke@27e8077b8ab0:source/Nuke.Utilities/Text/String.Split.cs:69`).

Encoding (`encoding` section, child writes bytes `63 61 66 C3 A9` = `café` UTF-8): Linux default and explicit UTF-8 both returned `U+00E9`. Windows with `StandardOutputEncoding = null` returned `caf` + `U+251C U+2310` (the CP437 reading of `C3 A9`); with `new UTF8Encoding(false)` it returned `U+00E9`. ocx emits UTF-8 JSON, so every redirected `Process` needs the explicit encoding. Related: `Console.WriteLine` of non-ASCII on this Windows host printed best-fit garbage in the console while the underlying code points were right; assert on code points in tests.

Arguments: `ProcessStartInfo.ArgumentList` "escapes the provided arguments and internally builds a single string", versus the independent `Arguments`; use one, and prefer `ArgumentList` ([ArgumentList](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.processstartinfo.argumentlist)). CliWrap's `ArgumentsBuilder` defaults its formatter to invariant (`Tyrrrz__CliWrap@7dbc252fa773:CliWrap/Builders/ArgumentsBuilder.cs:15`), the right default for an argv builder.

### 8. Culture: formatting into argv (CA1305) and the interpolation hole

CA1305 ("Specify IFormatProvider"): "If the value will be stored and accessed by software ... use the invariant culture"; "to use the invariant culture, use a C# interpolated string and pass it to `String.Create(IFormatProvider, DefaultInterpolatedStringHandler)` along with `CultureInfo.InvariantCulture`". It is **not enabled by default in .NET 10** ([CA1305](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1305)); same "No" for CA1307, CA1309, CA1310, CA1311 ([CA1307](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1307), [CA1309](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1309), [CA1310](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1310), [CA1311](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1311)).

Observed red (`culture/red`, `CultureInfo.CurrentCulture = de-DE`, then `/bin/echo` as a stand-in for the child): `1.5.ToString()` = `1,5`; `$"--timeout={1.5}"` = `--timeout=1,5`; the child's `argv[1]` = `--timeout=1,5`; `double.Parse("1.5")` = `15` (de-DE) and `FormatException` (fr-FR). The Windows host's regional settings are de-DE, so there `1.5.ToString()` is `1,5` with no code setting culture (`cur` fixture, Windows). On Linux `LANG=de_DE.UTF-8` is enough (`CurrentCulture='de-DE'`, `1,5`), no locale needs to be installed.

Analyzer behaviour on the red: CA1305 fired on `double.ToString()` (line 7), `string.Format(string, object)` (9), `double.Parse(string)` (10). It did **not** fire on line 8, the interpolated string `$"--timeout={timeout}"`. That is the hole an LLM falls through. Meziantou.Analyzer 3.0.297 `MA0076` ("Do not use implicit culture-sensitive ToString in interpolated strings", [MA0076](https://raw.githubusercontent.com/meziantou/Meziantou.Analyzer/main/docs/Rules/MA0076.md)) fired on exactly that line (`ma/red`, error) and was silent on the `string.Create(CultureInfo.InvariantCulture, $"...")` green. The doc says `FormattableString.Invariant($"...")` is accepted but trips MA0111; prefer `string.Create`.

Correct pair:

```csharp
var arg = $"--timeout={timeout}";                                         // red: culture-bound, no CA rule fires
var arg = string.Create(CultureInfo.InvariantCulture, $"--timeout={timeout}"); // green
var v   = double.Parse(text, CultureInfo.InvariantCulture);               // green (CA1305)
```

`Console.WriteLine($"...{double}")` for human display is legitimately culture-bound; the rule is about data that crosses a process/file boundary. Exemplars: Aspire, testfx and Polly (library profile) set CA1305 to `warning` (`dotnet__aspire@af646baee1e8:.editorconfig:118`, `microsoft__testfx@7226b0c74729:.editorconfig:381`, `App-vNext__Polly@e4476096da5b:eng/analyzers/Library.globalconfig:443`); Humanizer turns CA1305 and CA1304 off because it is a culture-aware library by design (`Humanizr__Humanizer@4574b93883bf:.editorconfig:46-47`) and tests with `[UseCulture("en")]` (`tests/Humanizer.Tests/UseCultureAttribute.cs:22`); Polly's test profile sets CA1305/CA1307/CA1310 to `none` (`Test.globalconfig:427,433,451`) but keeps CA1311 at warning (`:457`).

### 9. Culture: comparison rules CA1307/1309/1310/1311, InvariantCulture is not invariant

- CA1307: "Whenever an overload exists that takes a StringComparison parameter, it should be used"; noisy on defaults that were already ordinal. CA1310: only methods that *default to culture-sensitive* comparison. The pages tell you to use CA1310 for correctness and CA1307 for clarity ([CA1310](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1310)). Observed on `string.StartsWith(string)`, `IndexOf(string)`, `Compare(string,string)`: CA1310; `Contains(string)`, `Replace(string,string)`: CA1307 only.
- CA1309: use `Ordinal`/`OrdinalIgnoreCase` for non-linguistic comparisons; it fired on `StringComparison.InvariantCultureIgnoreCase` and on `string.Compare(a, b, StringComparison.InvariantCulture)` (observed lines 14, 19).
- CA1311: `ToUpper()`/`ToLower()` without a culture; fix `ToUpperInvariant()`. The best-practices page says `ToUpperInvariant` "is the standard way to normalize case" and warns against `ToLowerInvariant` for comparison normalization ([best practices](https://learn.microsoft.com/en-us/dotnet/standard/base-types/best-practices-strings)); the companion rule CA1308 flags `ToLowerInvariant` (Polly sets it to warning, `Library.globalconfig:455`). Observed tr-TR: `"TITLE".ToLower(tr)` = `t U+0131 t l e` (dotless i), `"file".ToUpper(tr)` = `F U+0130 L E`; `ToLowerInvariant` = `title`. The doc's security example: `IsFileURI("file:")` flips with Turkish culture (best-practices page).

"InvariantCulture is not invariant": `StringComparison.InvariantCulture` is a *linguistic* comparer. The best-practices page: "Don't use string operations based on `StringComparison.InvariantCulture` in most cases"; its sole use is "persisting linguistically meaningful but culturally agnostic data". The ICU page documents NLS-vs-ICU differences in sorting, ligatures, `\0` handling and that `IndexOf("\0")` returns 0 under ICU but 3 ordinally ([Globalization and ICU](https://learn.microsoft.com/en-us/dotnet/core/extensions/globalization-icu)). Practitioner confirmation: results "can differ depending on the version of NLS or ICU", "only CultureData is invariant" and the author bans the symbols with BannedApiAnalyzers ([meziantou.net, 2025-05-05](https://www.meziantou.net/stringcomparison-invariantculture-is-not-always-invariant.htm)).

Observed (`casing` section, identical Linux/Windows): `Compare("a\0b","ab", InvariantCulture)` = `0` vs `Ordinal` = `-98`; `Equals("\u00e9","e\u0301", InvariantCulture)` = `True`, `Ordinal` = `False`. With `DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1` the first becomes `-98` and the second `False`: invariant *mode* behaves ordinally, so the same call changes meaning when the host sets invariant mode (the runtime doc says all culture-sensitive operations become ordinal, [invariant mode design](https://raw.githubusercontent.com/dotnet/runtime/main/docs/design/features/globalization-invariant-mode.md)). On both SDK 8.0.425 and 10.0.401 `"\u00e9".ToUpperInvariant()` is `U+00C9` even with `InvariantGlobalization=true` (the design doc's "ASCII range only" text is stale; `inv8`/`inv10` fixtures).

Exemplar of the bug in an SDK: `StringComparer.InvariantCultureIgnoreCase` used as the comparer for HTTP header dictionaries (`anthropics__anthropic-sdk-csharp@ae16e5933f39:src/Anthropic.Bedrock/MantleAwsAdaptationHandler.cs:148` and `src/Anthropic.Aws/AwsAdaptationHandler.cs:155`); header names are ASCII tokens, `OrdinalIgnoreCase` is the right comparer. Npgsql sets CA1310 to `error` in `src/Npgsql` (`npgsql__npgsql@9c47244547c2:.editorconfig:60-61`).

### 10. InvariantGlobalization in tests masks bugs

Switches: MSBuild `InvariantGlobalization` / runtimeconfig `System.Globalization.Invariant` / env `DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1`; `PredefinedCulturesOnly` (default `true` in invariant mode, .NET 6+) blocks creating any culture except invariant ([runtime config: globalization](https://learn.microsoft.com/en-us/dotnet/core/runtime-config/globalization)). Without invariant mode, Linux needs libicu: "If the libraries aren't found, the process terminates with an error message such as: Failed to load system ICU" ([Globalization and ICU](https://learn.microsoft.com/en-us/dotnet/core/extensions/globalization-icu)); that is the legitimate reason AOT and distroless container apps turn it on.

Observed (`cur` fixture, `1.5.ToString()`):

| env | `CurrentCulture` | result |
|---|---|---|
| `LANG=en_US.UTF-8` | `en-US` | `1.5` |
| `LANG=de_DE.UTF-8` | `de-DE` | `1,5` (bug visible) |
| `LANG=de_DE.UTF-8 DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1` | `''` | `1.5` (bug masked) |
| invariant mode + `new CultureInfo("de-DE")` (SDK 8 and 10) | | `CultureNotFoundException` |

So a test project with `InvariantGlobalization=true` is green for the exact bug class this document is about, and cannot even construct the cultures a red test needs. Exemplars set it only in AOT/MTP/benchmark apps: `nodatime__nodatime@4dd26f1ddfa7:src/NodaTime.AotCompatibilityTestApp/NodaTime.AotCompatibilityTestApp.csproj:9`, `StackExchange__StackExchange.Redis@e7c43a269f53:toys/AotRig/AotRig.csproj:12`, `npgsql__npgsql@9c47244547c2:test/Npgsql.NativeAotTests/Npgsql.NativeAotTests.csproj:7`; Nuke has it commented out (`nuke-build__nuke@27e8077b8ab0:build/_build.csproj:28`).

### 11. Platform guards and CA1416

CA1416 is "enabled by default ... As warning", only for projects targeting .NET 5+ ([CA1416](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1416)). An unannotated API "is considered to work on all OS platforms". Recognised guards: `OperatingSystem.Is<Platform>()`/`Is<Platform>VersionAtLeast(...)`, `RuntimeInformation.IsOSPlatform` (works on netstandard but "not as optimized"), `Debug.Assert(OperatingSystem.IsX())`, and members/fields tagged `[SupportedOSPlatformGuard]` / `[UnsupportedOSPlatformGuard]` (both .NET 6+) ([platform compatibility analyzer](https://learn.microsoft.com/en-us/dotnet/standard/analyzers/platform-compat-analyzer)). A TFM like `net10.0-windows` makes the SDK inject an assembly-level `SupportedOSPlatform("windows")`, so the whole assembly counts as Windows-only (same page, and CA1416 "TFM target platforms").

Observed (`guards/red`, severity error; line numbers are the 1-based source lines in that file):

- `Registry.CurrentUser.OpenSubKey(...)` unguarded: CA1416 (lines 16, 22).
- Guarded by `Environment.OSVersion.Platform == PlatformID.Win32NT`: CA1416 still fires (line 18). Runtime-correct, analyzer-invisible.
- Guarded by a local helper `static bool IsWin() => OperatingSystem.IsWindows();`: CA1416 still fires (line 20). Fix: put `[SupportedOSPlatformGuard("windows")]` on the helper; `guards/green` is clean.
- Call to an unannotated `[DllImport("kernel32")] static extern nint CreateJobObjectW(...)`: **no diagnostic**. A hand-written P/Invoke is invisible to CA1416; annotate the wrapper type with `[SupportedOSPlatform("windows")]` (green) so its callers must guard.
- Unguarded `Registry.CurrentUser.OpenSubKey` at runtime on Linux 10.0.12 threw `NullReferenceException`, not `PlatformNotSupportedException`, a worse failure to diagnose; on Windows it worked.

Exemplars: BenchmarkDotNet annotates wrappers (`dotnet__BenchmarkDotNet@61ebda8a50ae:src/BenchmarkDotNet/Running/WakeLock.cs:29`, `WakeLock.PInvoke.cs:13`) and defines custom guards (`Running/ConsoleTitler.cs:62`, `Portability/RuntimeInformation.cs:43`); Aspire uses plain `OperatingSystem.IsWindows()` branches (`dotnet__aspire@af646baee1e8:src/Aspire.Hosting/Dcp/DcpHost.cs:231`). Polly sets CA1416 to warning in every profile (`Library.globalconfig:485`, `Test.globalconfig:469`).

### 12. Time: TimeProvider and the RS0030 ban

`TimeProvider` is "included in the framework" for .NET 8+; .NET 5-7, .NET Framework 4.6.2+ and .NET Standard 2.0 use `Microsoft.Bcl.TimeProvider`; `FakeTimeProvider` is in `Microsoft.Extensions.TimeProvider.Testing`; `Task.Delay(TimeSpan, TimeProvider)`, `CancellationTokenSource(TimeSpan, TimeProvider)`, `GetTimestamp()`/`GetElapsedTime` ([TimeProvider overview](https://learn.microsoft.com/en-us/dotnet/standard/datetime/timeprovider-overview)). With `Microsoft.CodeAnalysis.BannedApiAnalyzers` 5.6.0 and `P:System.DateTime.UtcNow; Use TimeProvider.GetUtcNow().` in `BannedSymbols.txt`, `DateTime.UtcNow` and `DateTimeOffset.Now` each produced `RS0030` (see 13). The analyzer's own default severity is warning (the red project built with "Build succeeded" and 8 warnings until `dotnet_diagnostic.RS0030.severity = error`).

Exemplars: Polly bans `DateTime.Now/Today`, `DateTimeOffset.Now/Today` with the exact replacement text (`App-vNext__Polly@e4476096da5b:eng/analyzers/BannedSymbols.txt:1-4`), pinned `Microsoft.CodeAnalysis.BannedApiAnalyzers` 5.6.0 (`Directory.Packages.props:11`); Coverlet bans `DateTime.Now/UtcNow` in favour of its `IClock` (`coverlet-coverage__coverlet@ecd6fd5533e7:BannedSymbols.txt`); NodaTime documents `IClock` as the pre-`TimeProvider` equivalent ("strongly discouraged" to call the system clock directly, `nodatime__nodatime@4dd26f1ddfa7:src/NodaTime/IClock.cs:13-24`).

### 13. The portability BannedSymbols.txt

Syntax ([BannedApiAnalyzers help](https://raw.githubusercontent.com/dotnet/roslyn-analyzers/main/src/Microsoft.CodeAnalysis.BannedApiAnalyzers/BannedApiAnalyzers.Help.md)): file `BannedSymbols.txt` (or `BannedSymbols.*.txt`), one doc-comment-ID per line, optional `;message`, `//` comments, added via `<AdditionalFiles Include="BannedSymbols.txt" />`; prefixes `T:` `M:` `F:` `P:` `E:` `N:`. Diagnostic ID `RS0030` (observed in output; the help page does not state it). Package: `Microsoft.CodeAnalysis.BannedApiAnalyzers`. Tested file (every line below compiled; red project hit `RS0030` on the ones marked `*`):

```text
// paths
M:System.IO.Path.Combine(System.String,System.String);...Use Path.Join or PathSafe.Combine.        *
M:System.IO.Path.Combine(System.String,System.String,System.String);...
M:System.IO.Path.Combine(System.String,System.String,System.String,System.String);...
M:System.IO.Path.Combine(System.String[]);...
M:System.IO.Directory.SetCurrentDirectory(System.String);Process-global cwd...                      *
F:System.Environment.SpecialFolder.Personal;Means $HOME before .NET 8, ~/Documents after. Use UserProfile.   *
F:System.Environment.SpecialFolder.MyDocuments;...
P:System.Environment.OSVersion;Not a CA1416 guard. Use OperatingSystem.IsWindows()/IsLinux()/IsMacOS().    *
// culture
P:System.StringComparer.InvariantCulture;...Use StringComparer.Ordinal.                              *
P:System.StringComparer.InvariantCultureIgnoreCase;...
F:System.StringComparison.InvariantCulture;...
F:System.StringComparison.InvariantCultureIgnoreCase;...Use StringComparison.OrdinalIgnoreCase.     *
// time
P:System.DateTime.Now;Use TimeProvider.GetLocalNow().
P:System.DateTime.UtcNow;Use TimeProvider.GetUtcNow().                                                *
P:System.DateTime.Today;...
P:System.DateTimeOffset.Now;Use TimeProvider.GetLocalNow().                                           *
P:System.DateTimeOffset.UtcNow;...
```

Only the `(String,String)` Combine overload and one entry per other group were exercised by the red source; the other listed entries use the same syntax and the file loaded without error. Untested, deliberately omitted: `Path.Combine(ReadOnlySpan<string>)` (.NET 9 overload; doc-ID would be `M:System.IO.Path.Combine(System.ReadOnlySpan{System.String})`) and a `CultureInfo.CurrentCulture` ban (too blunt; see Contested). Banning `Path.Combine` entirely is the strict option; Nuke/Cake instead assert at the call.

### 14. Analyzer severities: the SDK is silent by default

Observed with a copy of `culture/red/Program.cs` and no config (`amode/default`, `root = true` .editorconfig so nothing inherited): **0 warnings, exit 0** on 10.0.401, and the same on 11.0.100-rc.1. With only `<AnalysisModeGlobalization>All</AnalysisModeGlobalization>` in the csproj (`amode/glob`): `CA1304`, `CA1305`, `CA1307`, `CA1309`, `CA1310`, `CA1311` all fired as **warnings** (14 distinct sites; line 8, the interpolation, still absent). On 11.0.100-rc.1 the same property produced the same six IDs. Per-rule control: `dotnet_diagnostic.CA1305.severity = error` in `.editorconfig` (`dotnet_diagnostic.RS0030.severity = error` likewise). `AnalysisMode<Category>` is a real per-category MSBuild property (shown working for `Globalization`); the equivalent for CA1416 is unnecessary since it is on already (as warning).

### 15. Verified on the toolchain

Fixture root: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-crossplatform-paths-culture-guards/` (global.json inherited from `fixtures/`, SDK 10.0.401; `inv8/` pins 8.0.425; `net11/` pins 11.0.100-rc.1.26425.128). Root `.editorconfig` sets `RS0030`, `CA1305`, `CA1307`, `CA1309`, `CA1310`, `CA1311`, `CA1416` to `error`. Helper `b.sh <dir>` runs `run.sh dotnet build --nologo -v q` and prints distinct diagnostics plus `build-exit`. Windows staging: `cp -r probe/bin/Debug/net10.0/. /mnt/c/Users/ecom/csharp-wintest/probe/` then `cmd.exe /c "dotnet probe.dll <section>"` from that directory.

| # | claim | red command / output | green command / output |
|---|---|---|---|
| 1 | RS0030 bans (path, special folder, OSVersion, invariant comparers, clock) | `./b.sh ban/red` -> 8 x `error RS0030` (`Path.Combine(string, string)` L3, `Directory.SetCurrentDirectory` L4, `Environment.SpecialFolder.Personal` L5, `Environment.OSVersion` L6, `StringComparer.InvariantCulture` L7, `StringComparison.InvariantCultureIgnoreCase` L8, `DateTime.UtcNow` L9, `DateTimeOffset.Now` L10) plus `error CA1309` L8; `build-exit=1`. Without the severity override the same build printed `Build succeeded. 8 Warning(s)`. | `./b.sh ban/green` -> no diagnostics, `build-exit=0`; `dotnet run --no-build` printed `/srv/ocx/etc/passwd /home/mherwig False ...` (Join kept the root). |
| 2 | CA1305/1307/1309/1310/1311 | `./b.sh culture/red` -> `CA1311` L17,18; `CA1309` L14,19; `CA1305` L7 (`double.ToString()`), L9 (`string.Format(string, object)`), L10 (`double.Parse(string)`); `CA1310` L12,13,14; `CA1307` L15,16; no diagnostic on L8 (interpolation); `build-exit=1` | `./b.sh culture/green` -> `build-exit=0` |
| 3 | culture really changes argv | `run.sh dotnet run -v q -p:RunAnalyzers=false -- de-DE` in `culture/red` -> `a1=1,5 a2=--timeout=1,5`, `child argv[1]=--timeout=1,5`, `Parse('1.5')=15`; `fr-FR` -> `Parse('1.5')=NaN` (FormatException caught) | same in `culture/green` -> `a1=1.5 a2=--timeout=1.5`, `child argv[1]=--timeout=1.5` (the trailing `Parse('1.5')=1,5` line is only the demo's own concat display under de-DE) |
| 4 | MA0076 closes the interpolation hole | `./b.sh ma/red` -> `error MA0076` L2 (`$"--timeout={timeout}"`), `error MA0074` L5 (`string.Compare` without comparison); `build-exit=1` | `./b.sh ma/green` -> `build-exit=0` (`string.Create(CultureInfo.InvariantCulture, $"...")`) |
| 5 | SDK defaults are silent; AnalysisModeGlobalization turns them on | `./b.sh amode/default` -> no output, `build-exit=0` (also `net11/default` on 11.0.100-rc.1: `Build succeeded. 0 Warning(s)`) | `./b.sh amode/glob` -> 14 `warning CA1304/1305/1307/1309/1310/1311`, `build-exit=0` (warnings) |
| 6 | CA1416 gaps | `./b.sh guards/red` -> 7 x `error CA1416` on L16, 18, 20, 22 (`Registry.CurrentUser`, `OpenSubKey`, `RegistryKey.Name`); none for the unannotated P/Invoke on L21; `build-exit=1` | `./b.sh guards/green` -> `build-exit=0` (`OperatingSystem.IsWindows()`, `RuntimeInformation.IsOSPlatform(OSPlatform.Windows)`, `[SupportedOSPlatformGuard("windows")]` helper, `[SupportedOSPlatform("windows")]` wrapper) |
| 7 | Combine escapes root | `probe pathjoin` Linux: `Combine('/etc/passwd')='/etc/passwd'`; Windows: `Combine('\Windows\System32')='\Windows\System32'`, `Combine('D:\x')='D:\x'`, `Combine('C:foo')='C:foo'` | `PathSafe.Combine` -> `ArgumentException` for `/etc/passwd`, `\etc\passwd`, `\Windows\System32`, `D:\x`, `C:foo`, `../../x`, `..\..\x`, `../home-evil/x`; `pkg` -> `/srv/ocx/home/pkg` / `C:\ocx\home\pkg` |
| 8 | case-only collision | Linux `probe case`: `files on disk=2 [Foo.txt,foo.txt]`, `Exists(FOO.TXT)=False` | Windows: `files on disk=1 [Foo.txt]`, content `lower`, `Exists(FOO.TXT)=True` (same assertion cannot pass on both: the divergence is the finding) |
| 9 | child-output parsing | Windows `probe newline`: LF-only `Split(NewLine)=1:[one\ntwo\n]`; real `ocx.exe version` bytes `30 2e 35 2e 37 0a` | `ReadLine=2:[one|two]` on Windows and Linux (also for CRLF); Linux `Split('\n')` on CRLF leaves `one\r|two\r` |
| 10 | child stdout encoding | Windows `probe encoding`: default -> `U+0063 U+0061 U+0066 U+251C U+2310 (MOJIBAKE)` | `UTF8Encoding(false)` -> `U+0063 U+0061 U+0066 U+00E9 (OK)`; Linux both OK |
| 11 | invariant mode masks the culture bug | `cur`: `LANG=de_DE.UTF-8` -> `CurrentCulture='de-DE' 1.5.ToString()='1,5'` | `LANG=de_DE.UTF-8 DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1` -> `CurrentCulture='' ... '1.5'` (masked); `inv8`/`inv10` `new CultureInfo("de-DE")` -> `CultureNotFoundException` |
| 12 | Windows-invalid names | Linux `probe reserved`: all ten names created | Windows: `trail.`/`trail ` -> on-disk `trail`; `colon:stream` -> ADS (listing shows `colon`); `q?.txt` -> `IOException`; `PathSafe.IsPortableFileName` -> `False` for all but `ok.txt` on both |
| 13 | greps are real | `greps/red`: each pattern in the Normative section matched (1 file/line, Split pattern 3 lines) | `greps/green`: 0 hits for all |
| 14 | links | Windows `probe links`: `CreateSymbolicLink -> IOException: A required privilege is not held by the client`; reflection lists no junction creator | junction via `mklink /J`: `LinkTarget`, `ResolveLinkTarget(true)` = target, `Directory.Delete(junction, true)` left `keep.txt` |

Red/green pairs actually watched flip: 13 (rows 1-12 plus the hard-coded-separator grep) and two one-sided baselines (rows 5, 14). Not run: macOS anything; Windows 10 (reserved names, `LongPathsEnabled=0`); `Path.Combine(ReadOnlySpan<string>)` ban entry; SDK 8.0.425 for the analyzer-default check (only 10.0.401 and 11 RC1).

## Normative guidance candidates

Config shared by the rules (put in `Directory.Build.props` + root `.editorconfig`):

```xml
<PropertyGroup>
  <AnalysisModeGlobalization>All</AnalysisModeGlobalization>
  <TreatWarningsAsErrors Condition="'$(CI)' == 'true'">true</TreatWarningsAsErrors>
</PropertyGroup>
<ItemGroup>
  <PackageReference Include="Microsoft.CodeAnalysis.BannedApiAnalyzers" Version="5.6.0" PrivateAssets="all" />
  <PackageReference Include="Meziantou.Analyzer" Version="3.0.297" PrivateAssets="all" />
  <AdditionalFiles Include="$(MSBuildThisFileDirectory)BannedSymbols.txt" />
</ItemGroup>
```

```ini
[src/**.cs]
dotnet_diagnostic.RS0030.severity = error
dotnet_diagnostic.CA1304.severity = error
dotnet_diagnostic.CA1305.severity = error
dotnet_diagnostic.CA1307.severity = error
dotnet_diagnostic.CA1309.severity = error
dotnet_diagnostic.CA1310.severity = error
dotnet_diagnostic.CA1311.severity = error
dotnet_diagnostic.CA1416.severity = error
dotnet_diagnostic.MA0076.severity = error
```

(`CA1304` was shown firing under `AnalysisModeGlobalization=All`; it was not set to `error` in the red/green fixtures, only in `amode/glob` as warning.)

1. **Join, never Combine.** Never call `Path.Combine`; concatenate with `Path.Join`. Rationale: `Combine` returns the later rooted argument and drops everything before it (observed on Linux and Windows). Verify: `RS0030` at `error` with the four `Path.Combine` entries from section 13; and `grep -rnE --include='*.cs' 'Path\.Combine\(' src` returns nothing.
2. **Validated combine for foreign segments.** Any segment not a literal in your own source (package name, tag, digest, archive entry, user path) goes through a `PathSafe.Combine(root, rel)` that rejects `Path.IsPathRooted`, leading `\` or `/`, then `GetFullPath` and requires `StartsWith(fullRoot + DirectorySeparatorChar, OS comparison)`. Rationale: `Join` alone keeps `..`; bare-`root` prefix test lets `home-evil` through `home`. Verify: unit-test matrix `/etc/passwd`, `\etc\passwd`, `\Windows`, `D:\x`, `C:foo`, `../../x`, `..\..\x`, `../home-evil/x`, all throw; plus reading heuristic: every `Path.Join(` whose second argument is a parameter is inside `PathSafe`.
3. **No hand-rolled separators or escapes.** Build paths with `Path.Join(a, b, c)`/`Path.DirectorySeparatorChar`; do not put `\` in path literals and do not rewrite `\` to `/` on Unix. Rationale: `\` is a legal name char on Unix since .NET 8. Verify: `grep -rnE --include='*.cs' '(Path\.(Join|Combine|GetFullPath)\(|new (File|Directory)Info\()[^;]*"[^"]*\\' src` returns nothing (verbatim `@"` strings with backslashes are caught only if inside those calls; review test fixtures by hand).
4. **Path equality uses the OS rule, never a culture rule.** Compare paths with `Ordinal` on Linux and `OrdinalIgnoreCase` on Windows/macOS (`!(IsWindows||IsMacOS||IsIOS||IsTvOS)` = case-sensitive, as the runtime does), or better: let the filesystem decide (`File.Exists`, `Path.GetFullPath` + same-file checks). Verify: `CA1309` + `CA1310` error; `RS0030` bans `StringComparison.InvariantCulture*`; `grep -rnE --include='*.cs' 'StringComparison\.(CurrentCulture|InvariantCulture)' src` returns nothing.
5. **Never create two entries that differ only by case.** Writers dedupe with `OrdinalIgnoreCase` on every OS; tests that need two case-variant names run only under `OperatingSystem.IsLinux()`. Rationale: Linux made 2 files, Windows 1 (last write won). Verify: a test creating `Foo`/`foo` asserts the product throws or dedupes on all three OSes; reading heuristic on `Directory.GetFiles(...).Length ==` assertions.
6. **Portable-name gate on external names.** Every file or directory name derived from external input passes `IsPortableFileName` (forbids `<>:"/\|?*`, code points <32, trailing space/dot, `.`/`..`, reserved device stems `CON PRN AUX NUL COM0-9 LPT0-9` plus `¹²³` variants, case-insensitive, with any extension). Rationale: Linux accepts all of them; Windows aliases or redirects them silently. Verify: unit test over the Win32 table; `grep -rn --include='*.cs' 'GetInvalidFileNameChars' src` returns nothing (it is not portable: 2 vs 41 chars).
7. **No manual long-path handling on .NET 8+.** Do not prefix `\\?\`, check against 260/`MAX_PATH`, or ship `longPathAware` for System.IO paths. Verify: `grep -rnE --include='*.cs' -e 'MAX_PATH' -e '@"\\\\\\\\\?' src` returns nothing.
8. **Read links, do not create them.** Detect a link with `info.LinkTarget is not null`; resolve with `ResolveLinkTarget(returnFinalTarget: true)`; never create symlinks or junctions from the SDK (BCL has no junction API; Windows symlinks need a privilege). Verify: `grep -rnE --include='*.cs' 'CreateSymbolicLink|CreateAsSymbolicLink|mklink' src` returns nothing; reading heuristic: `Exists`/`Attributes.HasFlag(ReparsePoint)` is not used to mean "is a link".
9. **Home resolves env first, then GetFolderPath, never empty.** `OCX_HOME` ?? (`USERPROFILE` on Windows, `HOME` elsewhere) ?? `GetFolderPath(UserProfile)` ?? throw; treat `""` as unset. Rationale: S7; `GetFolderPath` ignores `USERPROFILE` on Windows and returns `""` for a missing `$HOME` on Unix. Verify: `grep -rlE --include='*.cs' '"HOME"' src | xargs -r grep -L '"USERPROFILE"'` lists no file; `RS0030` bans `SpecialFolder.Personal` and `MyDocuments`.
10. **Parse child output with ReadLine.** Use `StringReader`/`StreamReader.ReadLine[Async]`; never `Split(Environment.NewLine)`, `Split('\n')` or `Split("\r\n")`. Rationale: real `ocx.exe` emits LF only; `printf`/`cmd` emit CRLF. Verify: `grep -rnE --include='*.cs' 'Split\((Environment\.NewLine|"\\r\\n"|.\\n.)\)' src` returns nothing.
11. **Explicit UTF-8 on every redirected process.** Set `StandardOutputEncoding` and `StandardErrorEncoding` to `new UTF8Encoding(false)` (and `StandardInputEncoding` if stdin is redirected). Rationale: Windows default is the OEM codepage (CP437 observed). Verify: `grep -rlE --include='*.cs' 'RedirectStandardOutput *= *true' src | xargs -r grep -L 'StandardOutputEncoding'` lists no file.
12. **ArgumentList only, numbers invariant.** Build argv with `ProcessStartInfo.ArgumentList`; format numbers/dates with `CultureInfo.InvariantCulture`. Verify: `grep -rnE --include='*.cs' '[.{ ]Arguments *= ' src` returns nothing; `CA1305` error.
13. **Interpolated strings that cross a boundary use string.Create.** `string.Create(CultureInfo.InvariantCulture, $"...")` for argv, files, JSON keys, cache keys; plain `$"..."` only for human display. Rationale: CA1305 does not fire on interpolation. Verify: `MA0076` at `error` (package `Meziantou.Analyzer`); fired on red, silent on green.
14. **Enable and escalate the culture analyzers.** `<AnalysisModeGlobalization>All</AnalysisModeGlobalization>` and `error` for `CA1304 CA1305 CA1307 CA1309 CA1310 CA1311` in `src/`. Rationale: all are off by default on 10.0.401 and 11.0.100-rc.1. Verify: `dotnet msbuild src/Lib/Lib.csproj -getProperty:AnalysisModeGlobalization` prints `All`; `grep -nE 'dotnet_diagnostic\.CA13(05|07|09|10|11)\.severity *= *error' .editorconfig` prints 5 lines.
15. **Ban InvariantCulture comparisons.** `StringComparer.InvariantCulture[IgnoreCase]` and `StringComparison.InvariantCulture[IgnoreCase]` are banned; `CultureInfo.InvariantCulture` as `IFormatProvider` is allowed. Verify: the four `RS0030` entries in section 13; `grep -rnE --include='*.cs' 'InvariantCulture(IgnoreCase)?\b' src | grep -v 'CultureInfo\.InvariantCulture'` returns nothing.
16. **Case-normalize with Invariant/Ordinal.** `ToUpperInvariant()` (docs' normalizer) or `OrdinalIgnoreCase`; never bare `ToLower()`/`ToUpper()`. Verify: `CA1311` error; CA1308 as warning if you normalize to lower anywhere.
17. **No InvariantGlobalization in library test projects.** Rationale: with `LANG=de_DE.UTF-8` plus invariant mode, `CurrentCulture` is `''` and the bug disappears; `new CultureInfo("de-DE")` throws. Allowed in AOT/container sample apps. Verify: `grep -rlE --include='*.csproj' --include='*.props' --include='*.targets' '<InvariantGlobalization>\s*true' tests` lists no file; and `dotnet msbuild tests/Lib.Tests/Lib.Tests.csproj -getProperty:InvariantGlobalization` prints empty or `false`.
18. **One CI leg under a non-English culture.** Linux job sets `LANG=de_DE.UTF-8` (no locale install needed); the Windows host's own regional setting can serve as the second. Verify: workflow grep `grep -rn 'de_DE' .github/workflows` finds the env, reading heuristic otherwise.
19. **Platform calls need a recognized guard; CA1416 is an error.** Guard with `OperatingSystem.IsWindows()` etc. (or `RuntimeInformation.IsOSPlatform` only for netstandard); custom helpers carry `[SupportedOSPlatformGuard]`; never branch on `Environment.OSVersion` or `PlatformID`. Verify: `CA1416` error; `RS0030` bans `Environment.OSVersion`.
20. **Annotate every P/Invoke wrapper.** Types holding `[DllImport]`/`[LibraryImport]` into `kernel32`/`advapi32`/Job Objects carry `[SupportedOSPlatform("windows")]`, with a non-Windows fallback path. Rationale: CA1416 does not see unannotated P/Invokes. Verify: `grep -rlE --include='*.cs' '\[(DllImport|LibraryImport)' src | xargs -r grep -L 'SupportedOSPlatform'` lists no file.
21. **No `-windows` TFM on the library.** Keep `net8.0;net10.0` (or `net10.0`) and guard at runtime. Rationale: the SDK injects an assembly-level `SupportedOSPlatform("windows")`, making all callers Windows-only. Verify: `grep -rnE --include='*.csproj' --include='*.props' '<TargetFrameworks?>[^<]*-windows' src` returns nothing.
22. **Clock through TimeProvider.** Constructors take `TimeProvider` (default `TimeProvider.System`); tests use `FakeTimeProvider`; `Stopwatch`-style timing uses `GetTimestamp`/`GetElapsedTime`. Verify: `RS0030` entries for `DateTime.Now/UtcNow/Today`, `DateTimeOffset.Now/UtcNow`; netstandard2.0 targets reference `Microsoft.Bcl.TimeProvider`.
23. **No process-global cwd.** Ban `Directory.SetCurrentDirectory`; pass absolute paths and `ProcessStartInfo.WorkingDirectory`. Verify: `RS0030` entry; `grep -rn --include='*.cs' 'SetCurrentDirectory' src tests` returns nothing.
24. **Hermetic home in tests sets both variables.** A test that isolates the home sets `OCX_HOME` and passes `HOME` *and* `USERPROFILE` in the child env (as SourceLink's tests do). Verify: `grep -rlE --include='*.cs' '"HOME"' tests | xargs -r grep -L '"USERPROFILE"'` lists no file.
25. **macOS is a first-class unverified host.** Any rule above that has only Linux and Windows evidence stays on the "CI must run it on `macos-latest` and `macos-13`/arm64" list. Verify: reading heuristic against the CI matrix.

## AI-agent angle

| What an LLM characteristically gets wrong | Why it compiles | Smallest mechanical check |
|---|---|---|
| `Path.Combine(dir, userOrRegistrySegment)` | Fine on Linux for relative input | `RS0030` on `Path.Combine`; `grep -rnE --include='*.cs' 'Path\.Combine\(' src` |
| `Path.Join` treated as safe against `..` | Join is documented to differ from Combine only on rooted input | containment test (`../../x`, `../home-evil/x`) in `PathSafe` tests |
| `$"--timeout={seconds}"` into argv or a cache key | CA1305 does not look at interpolation | `MA0076` error |
| `StringComparison.InvariantCultureIgnoreCase` "to be culture-safe" (the Anthropic SDK does this for HTTP headers, `anthropic-sdk-csharp@ae16e5933f39:src/Anthropic.Aws/AwsAdaptationHandler.cs:155`) | Name suggests invariance | `RS0030` entries for the four InvariantCulture symbols; `CA1309` |
| `ToLower()` for dictionary keys, or `ToLowerInvariant()` for normalization | Looks like normalization | `CA1311` error; CA1308 warning |
| `text.Split(Environment.NewLine)` or `Split('\n')` on child stdout | Passes on the author's OS | `grep -rnE --include='*.cs' 'Split\((Environment\.NewLine|"\\r\\n"|.\\n.)\)' src` |
| Reading `HOME` only, or `USERPROFILE` only, or `SpecialFolder.Personal` as "home" | All compile; Python S7 is the same bug | `grep -rlE --include='*.cs' '"HOME"' src \| xargs -r grep -L '"USERPROFILE"'`; `RS0030` on `Personal` |
| `Environment.OSVersion.Platform == PlatformID.Win32NT` / `RuntimeInformation.IsOSPlatform` in net8+ code / `#if WINDOWS` (.NET Framework-era) | Runtime-correct | `CA1416` error plus `RS0030` on `Environment.OSVersion` |
| Unannotated `[DllImport("kernel32")]` Job Object calls | CA1416 is silent for P/Invokes | `grep -rlE --include='*.cs' '\[(DllImport\|LibraryImport)' src \| xargs -r grep -L 'SupportedOSPlatform'` |
| Manual `\\?\` prefixing, `MAX_PATH` checks, `longPathAware` manifest | Correct for .NET Framework / native | `grep -rnE --include='*.cs' -e 'MAX_PATH' -e '@"\\\\\\\\\?' src` |
| `Path.GetInvalidFileNameChars()` as the cross-platform validator | Returns 2 chars on Linux | `grep -rn --include='*.cs' 'GetInvalidFileNameChars' src` |
| Redirecting `Process` stdout with no encoding | Works on Linux/macOS | `grep -rlE --include='*.cs' 'RedirectStandardOutput *= *true' src \| xargs -r grep -L 'StandardOutputEncoding'` |
| Creating a junction with `Directory.CreateSymbolicLink` (or assuming symlinks work on Windows) | Compiles; needs a privilege | `grep -rnE --include='*.cs' 'CreateSymbolicLink' src` |
| `InvariantGlobalization=true` "to make tests deterministic" | Tests go green | `dotnet msbuild <test.csproj> -getProperty:InvariantGlobalization` |
| `DateTime.UtcNow` for expiry/cache | Everywhere in training data | `RS0030` |
| `Directory.SetCurrentDirectory` in test setup | Convenient | `RS0030` |
| Treating `Exists` as "is symlink/junction" or following links by string-parsing | Works for regular files | review: only `LinkTarget`/`ResolveLinkTarget` |
| Using `OrdinalIgnoreCase` for paths everywhere "to be Windows-safe" | Wrong on Linux, silently merges `Foo` and `foo` in code that then hits a case-sensitive FS | reading heuristic: comparer chosen by OS, or filesystem asked |

## Contested / evolving

- **Ban `Path.Combine` vs assert at the call (as of 2026-10).** Microsoft recommends `Join` when later arguments are untrusted; Nuke and Cake keep a `Combine` helper that throws on rooted input (`PathConstruction.cs:201`, `DirectoryPath.cs:114-117`). This document picks the ban because an LLM cannot be trusted to tell which arguments are trusted. Trend: `Path.Join(ReadOnlySpan<string>)` and `Combine(ReadOnlySpan<string>)` were added in .NET 9; no SDK analyzer for rooted-argument misuse exists that I could find (security rule CA3003 is about taint, untested here).
- **CA1305 value.** Humanizer disables it because the library is culture-aware by design (`.editorconfig:46`); Polly disables it in tests but enforces in libraries; Aspire, testfx warn; Npgsql errors only CA1310 in `src/Npgsql`. The CA1305 page itself says suppression is fine when "the default format is the correct choice". For an SDK that serialises into argv/JSON the strict setting is right; for UI-facing code it is not.
- **Reserved names on newer Windows.** Docs still list them and say pre-Windows-11 `GetFullPath` maps them to devices; Windows 11 26200 created them with a full path. Trend: Windows is loosening, tools are not; keep forbidding.
- **macOS case sensitivity.** Runtime says insensitive, Cake says sensitive, real volumes can be either; no .NET API probes it. UNVERIFIED locally.
- **Long paths.** .NET stopped caring (no `MAX_PATH` check, .NET Core/5+); the OS opt-in (`LongPathsEnabled` + manifest) still governs native tools and anything you shell out to. `=0` case not run here.
- **InvariantGlobalization.** Growing default for AOT and slim containers (NodaTime AOT app, Redis AotRig, Npgsql AOT tests); wrong for test projects of culture-sensitive code. Runtime doc text ("ASCII range only") predates .NET 8; observed full simple case mapping on 8.0.425 and 10.0.401.
- **`TimeProvider` vs `IClock`/custom clocks.** `TimeProvider` is in-box since .NET 8 and is replacing home-grown clocks (Polly's ban text, Coverlet still on `IClock`, NodaTime has `IClock`). Not contested for new code.
- **RuntimeInformation vs OperatingSystem.** Docs call `RuntimeInformation.IsOSPlatform` "not as optimized"; new code uses `OperatingSystem.IsX()`; netstandard2.0 targets still need the former. `OSArchitecture` vs `ProcessArchitecture` for choosing an ocx binary on Windows-on-ARM64 under x64 emulation: not tested here; raise with the packaging subtopic.
- **.NET 11 / C# 15 RC1 (GA Nov 2026).** The analyzer-default check was identical to 10.0.401 (0 warnings without config; six CA IDs with `AnalysisModeGlobalization=All`). Nothing path- or culture-specific found; re-run section 14 at GA.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://learn.microsoft.com/en-us/dotnet/api/system.io.path.combine | `Path.Combine` API reference with remarks | page updated 2026-07-01, net-10.0 | Authoritative statement that a rooted later argument discards earlier ones; worked Windows/Unix outputs |
| https://learn.microsoft.com/en-us/dotnet/api/system.io.path.join | `Path.Join` API reference | updated 2026-07-01, net-10.0 | Join vs Combine example, "unintended access" security note, .NET 9 span overload |
| https://learn.microsoft.com/en-us/dotnet/standard/io/file-path-formats | File path formats on Windows | updated 2026-08-04 | Drive-relative paths, normalization, trailing dot/space, `\\?\`, ".NET Core and .NET 5+ handles long paths implicitly", case insensitivity |
| https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file | Win32 naming rules | 2024-08 | Reserved names list incl. superscript digits, reserved characters, trailing space/period rule |
| https://learn.microsoft.com/en-us/windows/win32/fileio/maximum-file-path-limitation | MAX_PATH and long-path opt-in | 2024-07 | `LongPathsEnabled` + `longPathAware`, 32,767 limit, shell caveat |
| https://learn.microsoft.com/en-us/windows/win32/fileio/hard-links-and-junctions | NTFS hard links and junctions | 2025-07 | Junction definition and limits (directories, local volumes) |
| https://learn.microsoft.com/en-us/dotnet/api/system.io.filesysteminfo.resolvelinktarget | `FileSystemInfo.ResolveLinkTarget` | net-6 to net-11 | Returns null for non-links, resolves symlinks and junctions, hop limits |
| https://learn.microsoft.com/en-us/dotnet/api/system.environment.getfolderpath | `Environment.GetFolderPath` | updated 2026-08-13 | Empty-string-when-missing semantics |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/core-libraries/8.0/getfolderpath-unix | .NET 8 breaking change: GetFolderPath on Unix | .NET 8 | `Personal`/`MyDocuments` meaning change; "use UserProfile instead" |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/core-libraries/8.0/file-path-backslash | .NET 8 breaking change: backslash on Unix | .NET 8 | `\` is a legal name char on Unix |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1305 | CA1305 Specify IFormatProvider | updated 2026-06-26 | Off by default in .NET 10; `string.Create(InvariantCulture, $"...")` fix |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1307 | CA1307 Specify StringComparison for clarity | 2026-04 | Off by default; relation to CA1310 |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1309 | CA1309 Use ordinal StringComparison | 2026-04 | Off by default; ordinal rationale |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1310 | CA1310 Specify StringComparison for correctness | 2026-04 | Off by default; targets culture-default overloads |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1311 | CA1311 Specify a culture or use invariant | 2026-04 | `ToUpperInvariant` fix |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1416 | CA1416 Validate platform compatibility | updated 2026-07-12 | On by default as warning; recognized guards; TFM platform injection |
| https://learn.microsoft.com/en-us/dotnet/standard/analyzers/platform-compat-analyzer | Platform compatibility analyzer guide | updated 2026-03-30 | `SupportedOSPlatformGuard`, `RuntimeInformation.IsOSPlatform` "not as optimized", `Debug.Assert` |
| https://learn.microsoft.com/en-us/dotnet/standard/base-types/best-practices-strings | Best practices for comparing strings | updated 2026-06-26 | Ordinal for paths/registry/env; InvariantCulture caveats; Turkish-I; `ToUpperInvariant` normalizer |
| https://learn.microsoft.com/en-us/dotnet/core/runtime-config/globalization | Globalization runtime config | updated 2025-12-03 | `InvariantGlobalization`, `PredefinedCulturesOnly`, env var names |
| https://learn.microsoft.com/en-us/dotnet/core/extensions/globalization-icu | Globalization and ICU | updated 2026-03-30 | NLS vs ICU differences, `\0` handling, "Failed to load system ICU" |
| https://raw.githubusercontent.com/dotnet/runtime/main/docs/design/features/globalization-invariant-mode.md | dotnet/runtime invariant-mode design doc | living doc | Culture-sensitive ops become ordinal; culture creation restrictions (casing text is stale vs .NET 8) |
| https://raw.githubusercontent.com/dotnet/runtime/main/src/libraries/Common/src/System/IO/PathInternal.CaseSensitivity.cs | `PathInternal.IsCaseSensitive` source | main, read 2026-10-10 | The runtime's own OS case-sensitivity table |
| https://learn.microsoft.com/en-us/dotnet/standard/datetime/timeprovider-overview | TimeProvider overview | updated 2026-01-20 | Availability by framework, FakeTimeProvider, async helpers |
| https://raw.githubusercontent.com/dotnet/roslyn-analyzers/main/src/Microsoft.CodeAnalysis.BannedApiAnalyzers/BannedApiAnalyzers.Help.md | BannedApiAnalyzers help | main, read 2026-10-10 | `BannedSymbols.txt` syntax and examples (RS0030 ID observed in builds) |
| https://learn.microsoft.com/en-us/dotnet/api/system.io.streamreader.readline | `StreamReader.ReadLine` | updated 2026-07-01 | Line terminators `\n`, `\r`, `\r\n` |
| https://learn.microsoft.com/en-us/dotnet/api/system.environment.newline | `Environment.NewLine` | updated 2026-08-13 | Per-platform value (and why it is not the child's) |
| https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.processstartinfo.argumentlist | `ProcessStartInfo.ArgumentList` | updated 2026-08-13 | Automatic escaping; independent of `Arguments` |
| https://www.meziantou.net/stringcomparison-invariantculture-is-not-always-invariant.htm | Practitioner post: InvariantCulture is not always invariant | 2025-05-05 | Recommends banning InvariantCulture comparers; app-local ICU option |
| https://raw.githubusercontent.com/meziantou/Meziantou.Analyzer/main/docs/Rules/MA0076.md | Meziantou.Analyzer MA0076 doc | main, read 2026-10-10 | Closes the CA1305 interpolation gap; `string.Create` fix |

Exemplars (cloned under `/home/mherwig/.cache/research-lang/exemplars/csharp/`, cited as `owner__repo@sha12:path:line` in Findings): `nuke-build__nuke@27e8077b8ab0`, `cake-build__cake@08885933e936`, `dotnet__command-line-api@ba7fb9bd4443`, `GitTools__GitVersion@5057cdbcc177`, `npgsql__npgsql@9c47244547c2`, `microsoft__testfx@7226b0c74729`, `App-vNext__Polly@e4476096da5b`, `coverlet-coverage__coverlet@ecd6fd5533e7`, `Humanizr__Humanizer@4574b93883bf`, `dotnet__aspire@af646baee1e8`, `nodatime__nodatime@4dd26f1ddfa7`, `anthropics__anthropic-sdk-csharp@ae16e5933f39`, `Tyrrrz__CliWrap@7dbc252fa773`, `dotnet__BenchmarkDotNet@61ebda8a50ae`, `dotnet__sourcelink@6ec19dda0e19`, `StackExchange__StackExchange.Redis@e7c43a269f53`. Program inputs: `csharp-audit/ocx-cli-contract.md` (lines 83, 110) and `python-sdk-digest.md` (S7, row 31).
