---
title: "Windows PATH ACL check for the ocx resolver"
topic: csharp-process-windows-path-acl
agent: csharp-process-windows-path-acl deep-dive researcher (research-lang, C# / .NET)
model: sonnet (claude-sonnet-5-5)
date_researched: 2026-10-11
sources_count: 26
scope: |
  Covers: whether the SDK resolver should refuse a Windows PATH hit (and the `$OCX_HOME` tier) whose directory or file can be changed by anyone but the current user, Administrators, SYSTEM and TrustedInstaller. Covers the API (`FileSystemAclExtensions.GetAccessControl`), CA1416 shape, the SID and rights sets, ACE semantics, default ACLs on this Windows 11 host, red/green resolver runs, false positives, failure modes, LOC and latency, tests and the CS-PROC row text.
  Does not cover: the rest of the resolver (cwd, PATHEXT, `.cmd`, POSIX mode bits: CS-PROC-03/04/06), the binary download and cache (CS-BIN), or kill/stream rules. Not run (needs elevation, a domain, a symlink privilege or an ARM host): see section 1.16.
  Fixtures: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-process-windows-path-acl/` (called FX below). Windows host: Windows 11 build 26200, SDK 10.0.102 plus a local runtime 8.0.31, non-elevated user, staged under `C:\Users\ecom\csharp-wintest\csharp-process-windows-path-acl\`. Linux: SDK 10.0.401 via `run.sh`.
---

# Windows PATH ACL check for the ocx resolver

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  - [1.1 Decision](#11-decision)
  - [1.2 The API: where it lives and what CA1416 does](#12-the-api-where-it-lives-and-what-ca1416-does)
  - [1.3 Reading the ACL: GetAccessRules, sections, SID type](#13-reading-the-acl-getaccessrules-sections-sid-type)
  - [1.4 Which principals are untrusted: allow-list, not deny-list](#14-which-principals-are-untrusted-allow-list-not-deny-list)
  - [1.5 Which rights matter: the measured matrix](#15-which-rights-matter-the-measured-matrix)
  - [1.6 Inherited, inherit-only, generic and Deny ACEs](#16-inherited-inherit-only-generic-and-deny-aces)
  - [1.7 The owner](#17-the-owner)
  - [1.8 Default ACLs at realistic locations](#18-default-acls-at-realistic-locations)
  - [1.9 Resolver red and green](#19-resolver-red-and-green)
  - [1.10 Junctions, the hit file, and failure modes](#110-junctions-the-hit-file-and-failure-modes)
  - [1.11 False positives](#111-false-positives)
  - [1.12 What others do](#112-what-others-do)
  - [1.13 Cost: LOC, latency, guard](#113-cost-loc-latency-guard)
  - [1.14 The code](#114-the-code)
  - [1.15 Proposed CS-PROC row and its test](#115-proposed-cs-proc-row-and-its-test)
  - [1.16 Not run](#116-not-run)
  - [1.17 Verified on the toolchain](#117-verified-on-the-toolchain)
- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- **Adopt the check, Windows only.** Cost: one 59-line file (43 code lines), a 3-line call site, no package. It closes the Windows gap that the Python SDK and the ocx CLI itself both leave open ([ocx-sdk-python@80136dde4162:src/ocx_sdk/_bootstrap.py:467-484], [ocx@a23ec5be2939:crates/ocx_config/src/lib.rs:165-168]).
- **It is real, not theoretical.** On this stock Windows 11 host a directory created by a standard user under `C:\` inherits `Authenticated Users: Modify` and is refused; a directory under `C:\ProgramData` inherits `Users: Write` and is refused. The same classes shipped as CVEs on PATH directories ([usd-2019-0068](https://herolab.usd.de/security-advisories/usd-2019-0068/), [CVE-2022-45301](https://cveawg.mitre.org/api/cve/CVE-2022-45301)).
- **Zero false positives on a real developer PATH:** 41 of 43 entries accepted, 2 missing, 0 refused (`FX/windows/pathaudit.txt`). Program Files, System32, `C:\ProgramData\chocolatey\bin`, `%USERPROFILE%\.ocx`, `.cargo\bin`, WindowsApps and the WinGet links are all accepted.
- **Trust model is an allow-list:** current user SID, `S-1-5-18` SYSTEM, `S-1-5-32-544` Administrators, `S-1-3-0` CREATOR OWNER, and TrustedInstaller `S-1-5-80-956008885-3418522649-1831038044-1853292631-2271478464`. Every other principal holding a mutating right refuses the hit. A deny-list of Everyone/Authenticated Users/Users missed three of the measured bad directories (INTERACTIVE, a second local account, the user's own shared group).
- **Rights mask is exactly four bits:** `WriteData` (= `CreateFiles`), `AppendData` (= `CreateDirectories`), `ChangePermissions`, `TakeOwnership`. Composite masks are wrong in both directions: `FileSystemRights.Write` refuses write-attributes-only grants and accepts `WriteDAC`/`WriteOwner`; `FileSystemRights.Modify` refuses plain `ReadAndExecute` (so it would refuse Program Files-style directories).
- **Read the ACL with `GetAccessControl(AccessControlSections.Access | AccessControlSections.Owner)` and `GetAccessRules(true, true, typeof(SecurityIdentifier))`.** `NTAccount` is never needed.
- **The API is in the shared framework on net8, net10 and net11.** The whole `System.IO.FileSystem.AccessControl` ref assembly carries `[assembly: SupportedOSPlatform("windows")]`, so CA1416 fires on 34 symbols of a 15-statement snippet on both TFMs. Annotate the helper CLASS, not one method (method-only left 13 diagnostics), and guard the single call site with `OperatingSystem.IsWindows()`.
- **Do not add the `System.IO.FileSystem.AccessControl` package** for net8+: it is pruned and the shared-framework assembly loads (measured). The package is stale (5.0.0, 2020-11-09) and only serves netstandard2.0/net461.
- **Skip `InheritOnly` ACEs on directories** (they are the `CREATOR OWNER` and generic-rights copies meant for children) but keep inherited, non-inherit-only ACEs: those are what make `C:\tools` hijackable.
- **Resolve links first.** `GetAccessControl` returns the ACL of a junction itself, not its target: a junction in a user-only directory pointing at an Everyone-writable directory passed the check (red) until `ResolveLinkTarget(true)` was applied (green).
- **Check the hit file as well as its directory.** A user-only directory holding an `ocx.exe` with `Everyone:F` ran the planted binary under a directory-only check (red) and is refused when the file is checked too (green). One extra line.
- **Fail closed on `UnauthorizedAccessException`, `IOException` and `InvalidOperationException`** and nothing broader. `C:\Windows\Temp` raises the first, a missing drive the second, a 9P/WSL UNC share the third (uncaught in the first draft: red, then green after the filter was widened). FAT32 is refused through its synthesised `Everyone` owner.
- **Ignore Deny ACEs, document it.** Conservative: the one measured false positive is `Users: Modify` plus a cross-SID `Everyone: Deny Write`. Exact evaluation needs the Authz API (about 60 P/Invoke lines) and is not worth it.
- **Apply the check to the PATH tier and the `$OCX_HOME` tier, not to an explicit path or `OCX_SDK_EXE`.** Those are caller intent (same split as POSIX).
- **Unit tests must protect the DACL from inheritance.** A "safe" directory created under `%TEMP%` is refused on this host because `%TEMP%` grants a second local account `Modify`.
- **The same helper serves the CS-BIN cache root on Windows.** Python skips that check on Windows because POSIX bits are synthesised there ([_bootstrap.py:364](file:///home/mherwig/dev/ocx-sdk-python/src/ocx_sdk/_bootstrap.py)).

## Findings

### 1.1 Decision

**Adopt**, with this exact shape (all of it measured in section 1.17):

| Question | Decision |
|---|---|
| Where | Windows only, behind `OperatingSystem.IsWindows()`, PATH tier and `$OCX_HOME` tier |
| Subject | the hit's directory (after `ResolveLinkTarget(true)`) AND the hit file |
| Trusted principals | current user, `S-1-5-18`, `S-1-5-32-544`, `S-1-3-0`, TrustedInstaller; the object owner must be one of them |
| Mutating rights | `WriteData`, `AppendData`, `ChangePermissions`, `TakeOwnership` |
| ACE filter | Allow only; skip `InheritOnly` on directories; include inherited ACEs |
| On error | refuse (fail closed) for `UnauthorizedAccessException`, `IOException`, `InvalidOperationException`; let anything else crash |
| Diagnostics | record `dir: reason` for each skipped hit and append it to the `NotFound` launch error, otherwise an agent sees "ocx not found" while `where ocx` finds it |
| Cost | 59 lines in one file (43 code lines), 3 call-site lines, 0 packages |

The commission asked "adopt or document the gap". The gap is not documentable as acceptable: the Windows analogue of the POSIX `S_IWGRP | S_IWOTH` refusal costs about ten times the POSIX LOC (43 vs 4, [_bootstrap.py:484](file:///home/mherwig/dev/ocx-sdk-python/src/ocx_sdk/_bootstrap.py)) but catches a class that default Windows ACLs create by themselves (section 1.8).

### 1.2 The API: where it lives and what CA1416 does

- `FileSystemAclExtensions.GetAccessControl(DirectoryInfo)`, `(DirectoryInfo, AccessControlSections)`, `(FileInfo)` and `(FileInfo, AccessControlSections)` live in `System.IO.FileSystem.AccessControl.dll`, namespace `System.IO` ([learn: GetAccessControl](https://learn.microsoft.com/en-us/dotnet/api/system.io.filesystemaclextensions.getaccesscontrol?view=net-10.0), [learn: class](https://learn.microsoft.com/en-us/dotnet/api/system.io.filesystemaclextensions?view=net-10.0)). The docs header still says "Package: System.IO.FileSystem.AccessControl v5.0.0"; that is stale for net8+.
- **In the shared framework on net8, net10 and net11.** Measured: the runtime directories contain the assembly (`Microsoft.NETCore.App/8.0.31`, `10.0.12`, `11.0.0-rc.1`), and a `PackageReference` to the 5.0.0 package on `net8.0;net10.0` builds clean and the process loads `shared/Microsoft.NETCore.App/{8.0.31,10.0.12}/System.IO.FileSystem.AccessControl.dll` (the package is pruned) [FX/transcript-linux.txt V5]. [NuGet](https://www.nuget.org/packages/System.IO.FileSystem.AccessControl/) lists 5.0.0 (updated 2020-11-09) as latest stable, targeting netstandard2.0 and net461 only; the version list tops out at `6.0.0-preview.5` ([flat container](https://api.nuget.org/v3-flatcontainer/system.io.filesystem.accesscontrol/index.json)). Only a netstandard2.0 build of the SDK needs it (outside the default TFM answer in CS-BUILD).
- **Annotation is at assembly level in the reference assemblies.** Reading the ref packs with `System.Reflection.Metadata` printed `ASSEMBLY [SupportedOSPlatformAttribute(windows)]` for `System.IO.FileSystem.AccessControl.dll` in `ref/net8.0`, `ref/net10.0` and `ref/net11.0` (RC1), and for `System.Security.AccessControl.dll` and `System.Security.Principal.Windows.dll` [FX/refattr, FX/transcript-linux.txt V4]. The implementation assemblies carry no such attribute, so CA1416 is compile-time only: an unguarded call on Linux compiles with the diagnostic suppressed and then throws `PlatformNotSupportedException: Windows Principal functionality is not supported on this platform` at `WindowsIdentity.GetCurrent()` (net8 and net10) [FX/ca1416/runtime-red]. The [source](https://raw.githubusercontent.com/dotnet/runtime/main/src/libraries/System.IO.FileSystem.AccessControl/src/System/IO/FileSystemAclExtensions.cs) confirms the parameterless overload requests `Access | Owner | Group`.
- **CA1416 is a warning by default for net5+ projects** ([CA1416](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1416)); with CS-BUILD's unconditional TWAE it is an error. It recognises `OperatingSystem.IsWindows()` as a guard and a type- or assembly-level `[SupportedOSPlatform("windows")]` as forwarding.
- **Which symbols fire** (net8.0 and net10.0 give the same 34 errors for the 15-line probe) [FX/ca1416/which]: `GetAccessControl` (all overloads), `GetAccessRules`, `GetOwner`, `FileSystemRights.*`, `AccessControlType.*`, `PropagationFlags.*`, `AccessControlSections.*`, `FileSystemAccessRule.FileSystemRights`, `AuthorizationRule.IdentityReference/IsInherited/PropagationFlags`, `SecurityIdentifier` (type, `.Value`, `.Equals`, `.IsWellKnown`), `WellKnownSidType.*`, `WindowsIdentity.GetCurrent()/.User`. Constants and enum members count, so a `const FileSystemRights` in an unannotated class fails.
- **Annotate the class, not the method.**

```csharp
// WRONG: attribute on one method. 13 CA1416 errors remain: the const mask, the Trusted() helper,
// and the unannotated sibling WhyUntrusted() that calls the annotated method.   [FX/ca1416/method-only]
internal static class PathAcl
{
    private const FileSystemRights Mutating = FileSystemRights.WriteData;          // CA1416
    private static bool Trusted(SecurityIdentifier sid) => sid.IsWellKnown(...);   // CA1416
    [SupportedOSPlatform("windows")] internal static string? Check(...) { ... }
}

// RIGHT: [SupportedOSPlatform("windows")] on the class; the one call site is guarded.   [FX/ca1416/green: 0 warnings, 0 errors]
[SupportedOSPlatform("windows")] internal static class PathAcl { ... }
if (OperatingSystem.IsWindows() && PathAcl.WhyUntrusted(dir) is { } why) { ... }
```

Red: the unannotated class plus an unguarded call gave 58 errors (29 per TFM, net8.0 + net10.0). Green: 0/0 on both TFMs [FX/transcript-linux.txt V1].

### 1.3 Reading the ACL: GetAccessRules, sections, SID type

- `CommonObjectSecurity.GetAccessRules(bool includeExplicit, bool includeInherited, Type targetType)`: pass `true, true, typeof(SecurityIdentifier)`. `targetType` "must be a type that can be translated to the SecurityIdentifier type" ([learn: GetAccessRules](https://learn.microsoft.com/en-us/dotnet/api/system.security.accesscontrol.commonobjectsecurity.getaccessrules?view=net-10.0)). `SecurityIdentifier` is the identity as stored; `NTAccount` would force a name lookup for every ACE for no benefit, and SID comparison is what the trust list needs.
- **Ask for `Access | Owner` explicitly.** The parameterless overload also requests `Group`, which the check never uses. The `Audit` section needs `SeSecurityPrivilege` and must never be requested.
- `GetAccessRules` returns the ACEs in ACL order. Windows keeps explicit denies before explicit allows, then inherited denies before inherited allows ([Order of ACEs in a DACL](https://learn.microsoft.com/en-us/windows/win32/secauthz/order-of-aces-in-a-dacl), [icacls remarks](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/icacls)). The check does not rely on the order because it ignores Deny ACEs (section 1.6).
- `FileInfo` and `DirectoryInfo` need different overloads (`FileSecurity` vs `DirectorySecurity`), both derive from `FileSystemSecurity`: one local `FileSystemSecurity acl = real is DirectoryInfo d ? d.GetAccessControl(s) : ((FileInfo)real).GetAccessControl(s);` serves both.

### 1.4 Which principals are untrusted: allow-list, not deny-list

SIDs on this host's tokens and in the measured ACLs ([well-known SIDs](https://learn.microsoft.com/en-us/windows/win32/secauthz/well-known-sids)):

| SID | Name | Doc description | Measured here |
|---|---|---|---|
| `S-1-1-0` | Everyone | "A group that includes all users" | `bad-everyone-m` refused |
| `S-1-5-11` | Authenticated Users | "The authenticated users" | `C:\acl-probe-tools` (inherited from `C:\`) refused |
| `S-1-5-32-545` | BUILTIN\Users | "A local group that represents all users in the domain" | `bad-users-w`, `C:\ProgramData\...` refused |
| `S-1-5-4` | INTERACTIVE | "Users who log on for interactive operation" | `bad-interactive-w` refused |
| `S-1-5-3` | BATCH | batch logons | `C:\Users\Public` (CreateFiles) refused |
| `S-1-5-21-...-501` | another local account (Guest) | | `bad-other-account` refused |
| `S-1-5-21-...-1002` | a group the user belongs to (docker-users) | | `bad-own-group` refused |
| `S-1-5-18` | LocalSystem | "A special account used by the operating system" | trusted |
| `S-1-5-32-544` | BUILTIN\Administrators | admin alias | trusted |
| `S-1-3-0` | CREATOR OWNER | placeholder replaced by the creator in inheritable ACEs | trusted |
| `S-1-5-80-956008885-3418522649-1831038044-1853292631-2271478464` | NT SERVICE\TrustedInstaller | owner of System32 content | trusted; measured as owner of `C:\Windows\System32` |
| current user SID | | | trusted |

**Allow-list wins.** The brief named four untrusted SIDs. A deny-list of the classic three (`WorldSid`, `AuthenticatedUserSid`, `BuiltinUsersSid`) let `bad-interactive-w`, `bad-other-account` and `bad-own-group` through [FX/mutants/diff-vs-baseline.txt, mutant `denylist-3-sids`]. The allow-list also covers `Domain Users`, `Power Users` (`S-1-5-32-547`), `ALL APPLICATION PACKAGES` and any account an installer grants, without enumerating them.

The price: a directory shared with a group the user belongs to (e.g. `docker-users`) is refused. That is intended; the group's other members can plant a binary.

The user's own SID comes from `WindowsIdentity.GetCurrent().User` (disposed). The token's `BUILTIN\Administrators` entry is "Group used for deny only" on this host (filtered admin token, section 1.16), which is irrelevant: the check compares ACL SIDs, not token groups.

### 1.5 Which rights matter: the measured matrix

`FileSystemRights` values ([learn](https://learn.microsoft.com/en-us/dotnet/api/system.security.accesscontrol.filesystemrights?view=net-10.0)): `CreateFiles = WriteData = 2`, `CreateDirectories = AppendData = 4`, `DeleteSubdirectoriesAndFiles = 64`, `Write = 278`, `Delete = 65536`, `ChangePermissions = 262144`, `TakeOwnership = 524288`, `Modify = 197055`, `FullControl = 2032127`. On a directory these are the Win32 `FILE_ADD_FILE`, `FILE_ADD_SUBDIRECTORY` etc. ([file access rights](https://learn.microsoft.com/en-us/windows/win32/fileio/file-security-and-access-rights)).

Each row: `Users` granted one `icacls` right on a directory that otherwise inherits only user/SYSTEM/Administrators. Verdict of the shipped check [FX/windows/audit-fixtures.txt]:

| icacls right | .NET rights seen | verdict | why |
|---|---|---|---|
| `R`, `RX`, `GE`, `S`, `MA` | read / execute / synchronize | accept | cannot change the tree |
| `WD` | `CreateFiles` | **refuse** | plant `ocx.exe` |
| `AD` | `CreateDirectories` | **refuse** | plant a directory, or replace via rename into subdirectory |
| `W` | `Write` | **refuse** | contains `WriteData` |
| `M`, `F`, `GA`, `GW` | `Modify`, `FullControl`, `Write` | **refuse** | contain `WriteData` |
| `WDAC` | `ChangePermissions` | **refuse** | can grant itself write |
| `WO` | `TakeOwnership` | **refuse** | owner implicitly has full access ([FileSystemRights.TakeOwnership remark](https://learn.microsoft.com/en-us/dotnet/api/system.security.accesscontrol.filesystemrights?view=net-10.0)) |
| `DC` | `DeleteSubdirectoriesAndFiles` | accept | can delete a child, cannot create one: denial of service, not planting |
| `D`, `DE` | `Delete` | accept | deletes the directory entry, cannot add |
| `WEA`, `WA` | write extended attributes / attributes | accept | no content change |

Composite masks fail both ways [FX/mutants/diff-vs-baseline.txt]:

| mutant mask | wrongly refused | wrongly accepted |
|---|---|---|
| `FileSystemRights.Write` | `WA`, `WEA` | `WDAC`, `WO` |
| `FileSystemRights.Modify` | `RX`, `R`, `GE`, `D`, `DE`, `WA`, `WEA`, `rx-users`, `rx-everyone` | `WDAC`, `WO` |
| every write-ish bit incl. `Delete`, `DeleteSubdirectoriesAndFiles` | `D`, `DC`, `DE`, `WA`, `WEA` | none |

`Modify` is the worst: it includes the read bits, so `Users: ReadAndExecute` (the Program Files default) would be refused.

### 1.6 Inherited, inherit-only, generic and Deny ACEs

- **Inherited ACEs count.** `C:\acl-probe-tools` (created by a standard user) shows `S-1-5-11 Modify inherited=True`; `C:\ProgramData\acl-probe-global\shims` shows `S-1-5-32-545 Write inherited=True` [FX/windows/locations.txt]. Passing `includeInherited: false` would accept both: that is the classic hijack.
- **`InheritOnly` ACEs on a directory describe its children, not it.** `icacls C:\` on this host prints `Authenticated Users:(OI)(CI)(IO)(M)` and `Authenticated Users:(AD)`; `C:\ProgramData` has `S-1-3-0 ... prop=InheritOnly`; System32 has seven `InheritOnly` ACEs. Skip them for directories (`(r.PropagationFlags & PropagationFlags.InheritOnly) != 0`). Not skipped for files (the flag is meaningless there). Test: `ioonly-users-m` (`Users:(OI)(CI)(IO)M`) is accepted; `noinherit-users-m` (`Users:M`, applies to the directory) is refused.
- **Generic bits show up as raw integers on inherit-only ACEs**: `268435456` (GENERIC_ALL), `1073741824` (GENERIC_WRITE), `-1610612736` (0xA0000000), `-2147483648` (GENERIC_READ). These are the generic constants ([generic access rights](https://learn.microsoft.com/en-us/windows/win32/secauthz/generic-access-rights)). On a non-inherit-only ACE Windows mapped them when the ACE was written: an SDDL `(A;OICI;GW;;;BU)` planted on `raw-GW` reads back as `Write, ReadPermissions, Synchronize` plus an inherit-only `1073741824` copy, and is refused; `raw-GA` is refused; `raw-GR` is accepted [FX/windows/raw-generic.txt]. `new FileSystemAccessRule(sid, (FileSystemRights)0x40000000, ...)` throws `ArgumentOutOfRangeException`, so tests cannot build such an ACE through the rule class (use SDDL via `SetSecurityDescriptorSddlForm`). An ACE with unmapped generic bits written by a raw `SetSecurityDescriptorDacl` caller was not constructed (section 1.16).
- **Deny ACEs are ignored.** `AccessCheck` stops at the first matching deny or sufficient allow ([How AccessCheck works](https://learn.microsoft.com/en-us/windows/win32/secauthz/how-dacls-control-access-to-an-object)), so a deny can cancel an allow for a principal. Two measured cases: (a) `Users: Modify` + `icacls /deny Users:W` is normalised by icacls into a single `Users:(RX,D)` allow ("the same permissions in any explicit grant are removed", [icacls](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/icacls)), so it is accepted correctly (`deny-same`; Windows then refuses to launch the file: `Win32Exception 5`); (b) `Users: Modify` + `Everyone: Deny Write` leaves a real `Users: Modify` allow behind an `Everyone` deny, which blocks every `Users` member, yet the check refuses it (`deny-cross`, a false positive). The Win32 `GetEffectiveRightsFromAcl` that would resolve it "may be altered or unavailable", fails with `ERROR_INVALID_ACL` on an inherited deny, and ignores owner rights and logon-session groups ([doc](https://learn.microsoft.com/en-us/windows/win32/api/aclapi/nf-aclapi-geteffectiverightsfromacla)); the supported route is Authz P/Invoke. Not worth it.

### 1.7 The owner

The owner of an object has implicit `READ_CONTROL | WRITE_DAC`, so an untrusted owner can rewrite the DACL ([How AccessCheck works](https://learn.microsoft.com/en-us/windows/win32/secauthz/how-dacls-control-access-to-an-object) discusses ACE evaluation; the `TakeOwnership` remark above states "owners of a resource have full access"). The check therefore requires `GetOwner(typeof(SecurityIdentifier))` to be trusted.

Measured owners: the user (every fixture), `S-1-5-32-544` (`C:\ProgramData\chocolatey\bin`), `S-1-5-18` (`C:\ProgramData`), TrustedInstaller (`C:\Windows\System32`, `C:\`), and `S-1-1-0` for every FAT32 volume (`E:\KateD` printed `owner S-1-1-0` and `Allow S-1-1-0 -1`: Windows synthesises an Everyone-owned, full-access descriptor, so FAT/exFAT PATH entries are refused through the owner rule) [FX/windows/scripts/vol.cmd, run live]. Setting an untrusted owner on a fixture needs `SeRestorePrivilege`: `icacls /setowner *S-1-5-32-545` printed "This security ID may not be assigned as the owner of this object" (not run, section 1.16).

### 1.8 Default ACLs at realistic locations

Measured with the shipped check, non-elevated, Windows 11 build 26200 [FX/windows/locations.txt, pathaudit.txt]. "Created" rows were made by this standard user and removed afterwards.

| Location | Verdict | ACL fact |
|---|---|---|
| `C:\Windows\System32` and `C:\Windows` | accept | owner TrustedInstaller; Users `ReadAndExecute` only; SYSTEM, Administrators `Modify` |
| `C:\Program Files`, `...\dotnet`, `...\Git\cmd`, `C:\Program Files (x86)` | accept | Users read/execute only |
| `C:\Windows\Temp` | **refuse** (unreadable, `UnauthorizedAccessException`) | standard user cannot read the DACL; fail closed |
| `C:\ProgramData` | **refuse** | `Users: Write` (container-inherit), owner SYSTEM |
| `C:\ProgramData\acl-probe-global\shims` (created; analogue of scoop `-g` and any admin-created tool dir) | **refuse** | inherits `Users: Write` |
| `C:\ProgramData\chocolatey\bin` | accept | owner Administrators; SYSTEM and Administrators `F`, Users `RX`, inheritance protected |
| `C:\acl-probe-tools` and `\bin` (created; the classic `C:\tools`) | **refuse** | inherits `Authenticated Users (S-1-5-11): Modify` from `C:\` |
| `C:\Users\Public` | **refuse** | `S-1-5-3` (BATCH) `CreateFiles, CreateDirectories` |
| `%USERPROFILE%`, `.ocx`, `.ocx\symlinks\ocx.sh\ocx\cli\current\content\bin` | accept | `.ocx` also grants a second local account (`...-1003`) `ReadAndExecute`: harmless |
| `.cargo\bin`, `%APPDATA%\npm`, `%LOCALAPPDATA%`, `...\Programs`, `...\Python312` | accept | profile inheritance: user, SYSTEM, Administrators |
| `%LOCALAPPDATA%\Microsoft\WindowsApps`, `...\WinGet\Links`, `...\WinGet\Packages\*` | accept | user only |
| `%TEMP%` (not on PATH; shown because tests use it) | **refuse** | second local account `...-1003` has `Modify`, inherited into every new subdirectory |
| `E:\KateD` (FAT32 removable) | **refuse** | synthesised Everyone owner |
| `\\wsl.localhost\...` (9P share) | **refuse** | `InvalidOperationException` ("Method failed with unexpected error code 1"), caught |

The `C:\` default differs by baseline. This host: `Authenticated Users:(OI)(CI)(IO)(M)` plus `(AD)`. The Microsoft Server 2022 STIG baseline lists `Users:(CI)(AD)` and `Users:(CI)(IO)(WD)` ([WN22-00-000140](https://stigaview.com/products/winserv2022/v2r8/WN22-00-000140)). Both let a standard user create a top-level folder that stays writable by other users, so both are refused; [Portcullis](https://labs.portcullis.co.uk/blog/allowing-low-privileged-users-to-create-directories-in-c) described the root-folder creation default in 2013.

Real PATH of the developer host: 43 entries, **41 accept, 2 missing, 0 refuse** (Oracle `javapath`, `.dotnet\tools` missing) [FX/windows/pathaudit.txt].

Scoop is not installed on this host. `~\scoop\shims` sits under the profile, so it inherits the same ACL as `.cargo\bin` (accepted by inference, not run). Scoop's global install goes under `C:\ProgramData\scoop`, which behaves like the created `acl-probe-global\shims` row (refused); that was simulated with a standard user, because an elevated install needs elevation (not run).

### 1.9 Resolver red and green

Fixture: a resolver identical in shape to CS-PROC-03's PATH loop (absolute entries, exact `ocx.exe`, first hit wins), with `--mode none` (no check) and `--mode dir`/`dirfile` (check). `ocx.exe` is a copy of `whoami.exe` so "ran" is real execution. PATH is `"<bad>;<user-only>"` [FX/windows/resolve.txt].

| bad directory first on PATH | no check | with check |
|---|---|---|
| `Everyone:(OI)(CI)M` | RED: ran `bad-everyone-m\ocx.exe` | skipped (`S-1-1-0 Modify`), ran `user-only-inherited\ocx.exe` |
| `Users:(OI)(CI)W` | RED | skipped (`S-1-5-32-545 Write`) |
| `Authenticated Users:(OI)(CI)M` | RED | skipped (`S-1-5-11 Modify`) |
| `INTERACTIVE:(OI)(CI)W` | RED | skipped (`S-1-5-4 Write`) |
| `Guest:(OI)(CI)M` (another account) | RED | skipped (`...-501 Modify`) |
| `docker-users:(OI)(CI)F` (user's own group) | RED | skipped (`...-1002 FullControl`) |
| only the Everyone directory on PATH | | `RESULT NOTFOUND` (no silent fallback) |

Positive controls, accepted both with and without the check: `rx-users` (Users `RX` only, the Program Files shape), `rx-everyone` (`Everyone:RX`), `user-only-explicit` (inheritance removed, user `F` only), `junc-to-good`.

### 1.10 Junctions, the hit file, and failure modes

- **Junction bypass (red then green).** `GetAccessControl(DirectoryInfo)` on a junction returned the ACL of the junction object: `junc-to-bad` (a junction inside a user-only parent pointing at the Everyone-writable directory) printed `ACCEPT` with user/SYSTEM/Administrators ACEs and the planted binary ran. With `fsi.ResolveLinkTarget(true) ?? fsi` it prints `REFUSE S-1-1-0 Modify`. [`ResolveLinkTarget`](https://learn.microsoft.com/en-us/dotnet/api/system.io.filesysteminfo.resolvelinktarget?view=net-10.0) resolves "symbolic links and junctions", returns `null` when the path is not a link, follows at most 63 levels on Windows and throws `IOException` past that or when the path is missing, so it belongs inside the `try`. File symlinks need a privilege this session lacks (`mklink` printed "You do not have sufficient privilege"): not run; the same call handles `FileInfo`.
- **File-level hit (red then green).** `file-bad-dir-ok`: user-only directory, `ocx.exe` with `Everyone:F`. A directory-only check ran the planted file; checking the `FileInfo` too refused it (`S-1-1-0 FullControl`). Cheap because the same method takes any `FileSystemInfo`.
- **Failure modes** (fail closed returns a reason string, never `null`):
  - `UnauthorizedAccessException`: `C:\Windows\Temp`.
  - `IOException` family: a missing drive (`D:\` printed `DirectoryNotFoundException`); the first draft let this one through the filter's sibling cases.
  - `InvalidOperationException`: a `\\wsl.localhost\...` PATH entry. RED: the first filter (`UnauthorizedAccessException or IOException`) let `System.InvalidOperationException: Method failed with unexpected error code 1` escape from `NativeObjectSecurity.CreateInternal` [FX/windows/unc-red.txt]. GREEN: with `InvalidOperationException` added both UNC paths print `REFUSE ... unreadable ACL (InvalidOperationException)` [FX/windows/unc-green.txt].
  - Anything else (a `PlatformNotSupportedException` from a missed guard, a null reference) is a bug and must crash the test run, not become a silent refusal. Measured: with a filter limited to the three types, the unguarded Linux call surfaces `PlatformNotSupportedException` [FX/ca1416/runtime-red]; with `catch (Exception)` it would have turned into "refuse every directory" (observed on the earlier draft).

### 1.11 False positives

Wanted: "a directory writable only by the user is fine". Result: accepted in all measured user-only shapes (inherited from the profile, explicit `F`, SYSTEM-less explicit ACL). Known false positives, all fail-closed with a reason string:

1. A directory shared with a group the user belongs to (`docker-users`), by design (section 1.4).
2. A cross-SID Deny (`Everyone: Deny Write` over `Users: Modify`), rare.
3. FAT32/exFAT, UNC and other volumes that cannot report an ACL, by design: pass `exe=` or `OCX_SDK_EXE`.
4. A directory the standard user cannot read the DACL of (`C:\Windows\Temp`), by design.

The remedy for every one is an explicit path, which skips the check.

### 1.12 What others do

- **Python SDK:** `_trusted_location` on Windows is `directory != cwd`; POSIX is `not os.lstat(directory).st_mode & (S_IWGRP | S_IWOTH)` ([ocx-sdk-python@80136dde4162:src/ocx_sdk/_bootstrap.py:467-484]). `_verify_root` skips ownership and mode on Windows because "Windows reports synthesized POSIX bits that say nothing about the real ACL" (`:340-366`). Both Windows gaps are the same gap.
- **The ocx CLI:** `toolchain_dir` must be non-group/world-writable on Unix; "Windows checks no ownership" and the owner-SID check "is not implemented off Unix: the owner SID needs a `windows-sys` feature this workspace does not enable" ([ocx@a23ec5be2939:crates/ocx_config/src/lib.rs:165-168, 1048-1049]). The SDK check goes beyond the CLI; it does not contradict it.
- **Go:** `LookPath` refuses only a result in the current directory (`ErrDot`, since Go 1.19) and the docs say nothing about directory permissions ([os/exec](https://pkg.go.dev/os/exec#hdr-Executables_in_the_current_directory)).
- **The 35 C# exemplar clones:** none uses `GetAccessControl`, `DirectorySecurity` or `FileSystemAccessRule` (`grep -rIl --include='*.cs' -e GetAccessControl -e DirectorySecurity -e FileSystemAccessRule` over `exemplars/csharp` printed nothing). No C# precedent exists to copy.
- **Advisories show the class is exploited, not hypothetical:** the Chocolatey Python 3 package gave "all authenticated Users ... the modify (M) permission on the Python folder", which was on the default PATH, so replacing `python.exe` ran code as other users ([usd-2019-0068](https://herolab.usd.de/security-advisories/usd-2019-0068/), fixed 2020-01-10); the Chocolatey Ruby package granted Authenticated Users write on `C:\tools\ruby31` ([CVE-2022-45301](https://cveawg.mitre.org/api/cve/CVE-2022-45301), CWE-732, 2022-11-29). [CWE-426](https://cwe.mitre.org/data/definitions/426.html) lists "check your search path before use and remove any elements that are likely to be unsafe" as a mitigation; [MITRE T1574.007](https://attack.mitre.org/techniques/T1574/007/) lists restricting write permissions on directories (M1022).

### 1.13 Cost: LOC, latency, guard

- **LOC:** `PathAcl.cs` is 59 lines, 43 code lines (no blanks, comments, `using`, `namespace`), no package [FX/aclprobe/PathAcl.cs]. The POSIX counterpart is one expression (`File.GetUnixFileMode(dir) & (GroupWrite | OtherWrite)`). The call site is 3 lines (section 1.14).
- **Latency** on net10 and on a local net8.0.31 runtime: first call 5.3 to 9.9 ms (JIT plus the first security descriptor read), warm mean 0.06 to 0.14 ms [FX/windows/bench.txt]. The resolver runs once per handle (CS-PROC-03), so cost is irrelevant.
- **Guard:** the class carries `[SupportedOSPlatform("windows")]`; the one call site sits under `OperatingSystem.IsWindows()`; on Linux/macOS the type is never touched (`aclprobe audit /usr/bin` prints `not windows` on net8 and net10) [FX/transcript-linux.txt V2]. A second guard, `RuntimeInformation.IsOSPlatform(OSPlatform.Windows)`, is equally recognised by CA1416 but CS-XP already standardises on `OperatingSystem`.
- **Reuse:** the same `WhyUntrusted(FileSystemInfo)` can verify the CS-BIN cache root on Windows (what Python skips).

### 1.14 The code

Verified verbatim in FX/aclprobe (net8.0 and net10.0, Windows and compile on Linux). The `follow` parameter exists only so the fixture can show the junction bypass; the SDK keeps `follow: true` and drops it.

```csharp
using System.Runtime.Versioning;
using System.Security.AccessControl;
using System.Security.Principal;

namespace Ocx.Internal;

[SupportedOSPlatform("windows")]
internal static class PathAcl
{
    // Rights that let a principal plant or replace a binary, or grant itself those rights.
    private const FileSystemRights Mutating =
        FileSystemRights.WriteData            // = CreateFiles on a directory
        | FileSystemRights.AppendData         // = CreateDirectories on a directory
        | FileSystemRights.ChangePermissions  // WRITE_DAC
        | FileSystemRights.TakeOwnership;     // WRITE_OWNER

    // NT SERVICE\TrustedInstaller owns System32 and Program Files content.
    private const string TrustedInstaller = "S-1-5-80-956008885-3418522649-1831038044-1853292631-2271478464";

    private static bool Trusted(SecurityIdentifier sid, SecurityIdentifier self) =>
        sid.Equals(self)
        || sid.IsWellKnown(WellKnownSidType.LocalSystemSid)           // S-1-5-18
        || sid.IsWellKnown(WellKnownSidType.BuiltinAdministratorsSid) // S-1-5-32-544
        || sid.IsWellKnown(WellKnownSidType.CreatorOwnerSid)          // S-1-3-0
        || sid.Value == TrustedInstaller;

    /// <summary>Why someone other than the current user, Administrators, SYSTEM or TrustedInstaller can change
    /// <paramref name="fsi"/>; null when nobody can. Fails closed.</summary>
    internal static string? WhyUntrusted(FileSystemInfo fsi)
    {
        try
        {
            using var me = WindowsIdentity.GetCurrent();
            var self = me.User!;
            // GetAccessControl reads the ACL of the link object itself, so resolve junctions and symlinks first.
            var real = fsi.ResolveLinkTarget(true) ?? fsi;
            const AccessControlSections sections = AccessControlSections.Access | AccessControlSections.Owner;
            FileSystemSecurity acl = real is DirectoryInfo d ? d.GetAccessControl(sections) : ((FileInfo)real).GetAccessControl(sections);
            if (acl.GetOwner(typeof(SecurityIdentifier)) is SecurityIdentifier owner && !Trusted(owner, self))
                return $"owner {owner.Value}";
            foreach (FileSystemAccessRule r in acl.GetAccessRules(true, true, typeof(SecurityIdentifier)))
            {
                if (r.AccessControlType != AccessControlType.Allow) continue;                                  // Deny ignored: conservative
                if (real is DirectoryInfo && (r.PropagationFlags & PropagationFlags.InheritOnly) != 0) continue; // children only
                if ((r.FileSystemRights & Mutating) == 0) continue;
                var sid = (SecurityIdentifier)r.IdentityReference;
                if (!Trusted(sid, self)) return $"{sid.Value} {r.FileSystemRights} inherited={r.IsInherited}";
            }
            return null;
        }
        catch (Exception e) when (e is UnauthorizedAccessException or IOException or InvalidOperationException)
        {
            return $"unreadable ACL ({e.GetType().Name})";   // fail closed
        }
    }
}
```

Call site, inside the CS-PROC-03 PATH loop after `File.Exists(candidate)`, and again in the `$OCX_HOME` tier's `Accept`:

```csharp
if (OperatingSystem.IsWindows()
    && (PathAcl.WhyUntrusted(new DirectoryInfo(dir)) ?? PathAcl.WhyUntrusted(new FileInfo(candidate))) is { } why)
{ skipped.Add($"{dir}: {why}"); continue; }          // surfaced in the NotFound OcxLaunchException message
```

Analyzer note: the file builds with `AnalysisLevel 10.0-all`, `TreatWarningsAsErrors` and CA1031 on (the exception filter names three types, so CA1031 is satisfied); `CA2208` rejected an earlier `throw new ArgumentException("mask")` in the fixture driver (use `nameof` or a specific type).

### 1.15 Proposed CS-PROC row and its test

Amends CS-PROC-03 (resolver order, step 3 and step 4). Proposed id **CS-PROC-25** (consolidator may renumber).

**CS-PROC-25 (MUST, Windows): a PATH-tier or `$OCX_HOME`-tier hit is accepted only if neither its directory nor the file can be changed by anyone except the current user, Administrators, SYSTEM and TrustedInstaller.**
- Rule: after the exact-name hit `ocx.exe`, call `PathAcl.WhyUntrusted` on the directory and the file under `OperatingSystem.IsWindows()`; a non-null reason skips the entry and is appended to the `NotFound` message. Do not apply it to an explicit path or `OCX_SDK_EXE`.
- Trust model: allow-list (user SID, `S-1-5-18`, `S-1-5-32-544`, `S-1-3-0`, TrustedInstaller). Everything else holding `WriteData`, `AppendData`, `ChangePermissions` or `TakeOwnership` on an Allow ACE, inherited or explicit, refuses; so does an untrusted owner. Deny ACEs are ignored. `InheritOnly` ACEs are skipped on directories. Junctions and symlinks are resolved first. Unreadable ACLs refuse.
- Why: default Windows ACLs make `C:\<new folder>` (`Authenticated Users: Modify`) and `C:\ProgramData\<new folder>` (`Users: Write`) writable by other users; CWE-426.
- Check: the six cases below; `rg` rules 2, 3, 5, 6 in the next section.

Test (xUnit v3, in the unit-test project; runs on the `windows-2025` and `windows-11-arm` legs, skipped elsewhere). The attribute syntax is `[Fact(Skip = "...", SkipUnless = nameof(IsWindows))]` ([xunit__xunit@0c7aa4991fa3:src/xunit.v3.core.tests/Runners/XunitTestRunnerTests_reflection.cs:467-473]). Build each directory WITH its DACL atomically through `FileSystemAclExtensions.Create(DirectoryInfo, DirectorySecurity)` and protect it from inheritance; verified as `selftest` on net10 and net8.0.31 (12 PASS, `SELFTEST OK` twice) [FX/windows/selftest.txt]:

```csharp
// self only (protected)                  -> null          (accept)
// Users: ReadAndExecute                  -> null          (accept)
// Everyone: Modify                       -> "S-1-1-0 ..." (refuse)
// Users: CreateFiles                     -> refuse
// Users: ChangePermissions               -> refuse
// Users: DeleteSubdirectoriesAndFiles    -> null          (accept; delete-only is not a plant)
var sec = new DirectorySecurity();
sec.SetAccessRuleProtection(isProtected: true, preserveInheritance: false);   // else %TEMP% inherits foreign ACEs
sec.AddAccessRule(new FileSystemAccessRule(self, FileSystemRights.FullControl, inherit, PropagationFlags.None, AccessControlType.Allow));
sec.AddAccessRule(new FileSystemAccessRule(everyone, FileSystemRights.Modify, inherit, PropagationFlags.None, AccessControlType.Allow));
new DirectoryInfo(path).Create(sec);
Assert.NotNull(PathAcl.WhyUntrusted(new DirectoryInfo(path)));
```

Pitfall measured by the same run: `INFO default dir under %TEMP% (inherits): refuse: S-1-5-21-...-1003 Modify, Synchronize inherited=True`. A test that creates a plain directory under `%TEMP%` and expects "accept" fails on this host. Add a seventh case: a missing directory must refuse with `unreadable ACL (DirectoryNotFoundException)` (runnable on any CI image; observed with `D:\`).

### 1.16 Not run

| Scenario | Why not run | Expectation |
|---|---|---|
| Directory created by an elevated shell (owner Administrators) | session is not elevated (`net session` printed "System error 5 ... Access is denied"); token shows `BUILTIN\Administrators` as "Group used for deny only" | ACL identical to the non-elevated creation (inherited from `C:\ProgramData` or `C:\`); owner `S-1-5-32-544` is trusted (seen on `chocolatey\bin`) |
| Plant `ocx.exe` under `C:\Program Files` | needs elevation | accepted dirs only audited; the plant would be refused by the OS to a standard user, which is the point |
| `icacls /setowner Users` | `SeRestorePrivilege` | owner rule covered via FAT32's synthesised Everyone owner only |
| File symlink as the hit | `mklink` needs a privilege | `ResolveLinkTarget(true)` handles files |
| Domain-joined host (`Domain Users`, `Domain Admins`) | no domain | `Domain Users` is untrusted under the allow-list; `Domain Admins` holding write would refuse unless it is also Administrators-nested (it is not an ACL SID match). Re-run if a corporate image matters |
| Windows on ARM and Windows Server SKUs | no host | API and ACL model are architecture-independent; the `windows-11-arm` CI leg runs the unit test |
| ACE with unmapped generic bits written by a raw `SetSecurityDescriptorDacl` | not constructible through .NET | Windows maps generic bits on write (measured with SDDL); a raw writer is the only gap |
| Ancestor directories (a writable parent that can rename a child) | not measured | [File security doc](https://learn.microsoft.com/en-us/windows/win32/fileio/file-security-and-access-rights): "the security descriptor of a parent directory is not used to control access to any child". Same ceiling as the POSIX check, which also inspects only the immediate directory |
| Check-then-launch race | by design | resolve once and pin (CS-PROC-03); only trusted principals can swap the file after the check |
| Real SMB share on PATH | no share | 9P share behaves as `InvalidOperationException` and is refused |

### 1.17 Verified on the toolchain

Fixture root FX = `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-process-windows-path-acl/`. Re-run Linux: `FX/repro-linux.sh`. Windows battery from WSL: `FX/run-windows-battery.sh` (scripts in `FX/windows/scripts`, host copies under `C:\Users\ecom\csharp-wintest\csharp-process-windows-path-acl\`). Counts of watched red/green pairs: 16 (below), plus the 19-right matrix and the 12-assert selftest.

| # | Claim | Command | Red | Green |
|---|---|---|---|---|
| 1 | CA1416 forces annotation and guard | `cd FX/ca1416/red && run.sh dotnet build -c Release` vs `.../green` | `58 Error(s)` (29 x net8.0/net10.0), e.g. `CA1416 'SecurityIdentifier.IsWellKnown(WellKnownSidType)' is only supported on: 'windows'` | `0 Warning(s) 0 Error(s)` |
| 2 | Unguarded Linux run | `cd FX/ca1416/runtime-red && run.sh dotnet run -c Release -f net10.0` (and `net8.0`) | `Unhandled exception. System.PlatformNotSupportedException: Windows Principal functionality is not supported on this platform.` | `aclprobe audit /usr/bin` prints `not windows` on both TFMs |
| 3 to 8 | Resolver refuses each untrusted principal | `ap resolve --mode none/dir --path "<bad>;<user-only>"` (`FX/windows/resolve.txt`) | six `RESULT RED (planted hit executed)` (Everyone, Users, Authenticated Users, INTERACTIVE, Guest, docker-users) | six `skip fx\<bad>: <sid> <rights>` then `exe=fx\user-only-inherited\ocx.exe` / `RESULT GREEN` |
| 9 | Hit file ACL | `resolve --mode dir` vs `--mode dirfile` on `file-bad-dir-ok` | `mode=dir`: `exe=fx\file-bad-dir-ok\ocx.exe`, `RESULT RED` | `mode=dirfile`: `skip fx\file-bad-dir-ok: S-1-1-0 FullControl inherited=False`, `RESULT GREEN` |
| 10 | Junction target | `ACLPROBE_NOFOLLOW=1 ap resolve --mode dir --path "junc-to-bad;..."` vs default | `RESULT RED`, `exe=fx\junc-to-bad\ocx.exe` | `skip fx\junc-to-bad: S-1-1-0 Modify, Synchronize inherited=False` |
| 11 | net8 on the Windows host | `ap8.cmd audit` (local runtime `Microsoft.NETCore.App 8.0.31`) | n/a | `REFUSE fx\bad-everyone-m`, `REFUSE fx\junc-to-bad`, `ACCEPT fx\rx-users`, `ACCEPT C:\Windows\System32` (same as net10) |
| 12 | UNC / 9P ACL read | `ap audit \\wsl.localhost\ocx.sh\tmp` | `Unhandled exception. System.InvalidOperationException: Method failed with unexpected error code 1.` | `REFUSE ... unreadable ACL (InvalidOperationException)` |
| 13 | Composite mask `Write` | mutant build `FX/mutants/mask-write`, diff vs baseline | `r-WA ACCEPT->REFUSE`, `r-WEA ACCEPT->REFUSE`, `r-WDAC REFUSE->ACCEPT`, `r-WO REFUSE->ACCEPT` | baseline (4-bit mask) matches the matrix |
| 14 | Composite mask `Modify` | `FX/mutants/mask-modify` | 11 flips incl. `rx-users ACCEPT->REFUSE`, `r-RX ACCEPT->REFUSE`, `r-WDAC`, `r-WO` | baseline |
| 15 | Mask with delete bits | `FX/mutants/mask-all-write-bits` | `r-D`, `r-DC`, `r-DE`, `r-WA`, `r-WEA` ACCEPT->REFUSE | baseline |
| 16 | Deny-list of 3 SIDs | `FX/mutants/denylist-3-sids` | `bad-interactive-w`, `bad-other-account`, `bad-own-group` REFUSE->ACCEPT | baseline |

Further observations, same transcripts: method-only annotation leaves 13 CA1416 diagnostics (`FX/ca1416/method-only`); the unit-test pattern passes 6/6 on net10 and net8.0.31 (`FX/windows/selftest.txt`); `pathaudit` 41 accept / 0 refuse / 2 missing; bench 5.3 to 9.9 ms first call, 0.06 to 0.14 ms warm; the rg rules in the next section were each run against a red and a green twin (`rg` 14.x at `~/.ocx/toolchain/active/bin/rg`; the interactive shell rewrites bare `rg`).

## Normative guidance candidates

1. **On Windows, accept a PATH-tier or `$OCX_HOME`-tier `ocx.exe` only when `PathAcl.WhyUntrusted(directory)` and `PathAcl.WhyUntrusted(file)` are both `null`; never apply it to `exe=`/`OCX_SDK_EXE`.** Rationale: default Windows ACLs create writable-by-others directories on their own (`C:\<folder>`, `C:\ProgramData\<folder>`); explicit paths are caller intent. Verify: `rg -n 'WhyUntrusted' src -g '*.cs'` shows the resolver's PATH loop and `$OCX_HOME` accept path and no hit in the explicit/override branch (reading heuristic on those two branches); the six-case unit test in 1.15 passes on the Windows legs.
2. **Use an allow-list of trusted SIDs; never enumerate untrusted ones.** Rationale: a deny-list missed INTERACTIVE, another local account and the user's own group. Verify: `rg -n -e 'WellKnownSidType\.(WorldSid|AuthenticatedUserSid|BuiltinUsersSid|InteractiveSid|NetworkSid)' src -g '*.cs'` prints nothing.
3. **The mutating mask is exactly `WriteData | AppendData | ChangePermissions | TakeOwnership`; never `Write`, `Modify` or `FullControl`.** Rationale: composites flip 4 to 11 verdicts (section 1.5). Verify: `rg -o --no-filename 'FileSystemRights\.\w+' src -g '*PathAcl*.cs' | sort -u` prints exactly those four lines (the `Modify` mutant prints one line `FileSystemRights.Modify`).
4. **Request `AccessControlSections.Access | AccessControlSections.Owner`, call `GetAccessRules(true, true, typeof(SecurityIdentifier))`, and never use `NTAccount`.** Rationale: inherited ACEs are the hijack; SID comparison needs no lookup. Verify: `rg -n 'NTAccount' src -g '*.cs'` prints nothing; `rg -n 'GetAccessRules\(\s*true\s*,\s*true' src -g '*.cs'` prints one line.
5. **Resolve links before reading the ACL and skip `InheritOnly` ACEs on directories only.** Rationale: junction ACL bypass (red 10); `InheritOnly` ACEs describe children. Verify: `rg -n 'ResolveLinkTarget\(' src -g '*PathAcl*.cs'` prints at least one line; `rg -n 'PropagationFlags\.InheritOnly' src -g '*PathAcl*.cs'` prints at least one line.
6. **Every file that calls `GetAccessControl` carries `[SupportedOSPlatform("windows")]` on its class, and every call site is under `OperatingSystem.IsWindows()`.** Rationale: assembly-level Windows-only API in the ref packs; method-level annotation leaves 13 diagnostics. Verify: `rg -l 'GetAccessControl' src -g '*.cs' | xargs -r rg --files-without-match 'SupportedOSPlatform\("windows"\)'` prints nothing (xargs exits 123 when ripgrep finds no unannotated file; ignore the status; note `rg -L` means "follow symlinks", not "files without match"); CA1416 not downgraded: `rg --hidden -n -e 'CA1416\.severity\s*=\s*(none|silent|suggestion|hidden)' -g '.editorconfig' -g '.globalconfig' -g '*.globalconfig' .` prints nothing.
7. **Catch only `UnauthorizedAccessException`, `IOException` and `InvalidOperationException` around the ACL read, and turn them into a refusal reason.** Rationale: fail closed for `C:\Windows\Temp`, missing drives and 9P shares; a broad catch hides a missing guard. Verify: `rg -n -e 'catch\s*\{' -e 'catch\s*\(\s*(System\.)?Exception\s+\w+\s*\)\s*$' src -g '*PathAcl*.cs'` prints nothing; CA1031 stays at its TWAE severity (CS-ERR-11).
8. **Ignore Deny ACEs and skip nothing else; leave a comment saying so.** Rationale: exact evaluation needs Authz P/Invoke; the conservative error is a refusal. Verify: `rg -n 'AccessControlType\.Allow' src -g '*PathAcl*.cs'` prints one line followed by a `Deny ignored` comment (reading heuristic).
9. **Do not add `System.IO.FileSystem.AccessControl` or `System.Security.AccessControl` `PackageReference`s for `net8.0`/`net10.0` targets.** Rationale: the shared framework provides them and the package is pruned (stale 5.0.0). Verify: `rg -n -e 'System\.IO\.FileSystem\.AccessControl' -e 'System\.Security\.AccessControl' -g '*.csproj' -g 'Directory.Packages.props' .` prints nothing unless a `netstandard2.0` TFM is in `TargetFrameworks` (reading heuristic).
10. **Report the skipped hits in the `NotFound` error: `dir: reason`, one per skipped entry.** Rationale: otherwise the caller sees "not found" while `where ocx` finds the file. Verify: unit test with a planted Everyone-writable hit asserts the exception message contains the directory and the SID; reading heuristic on the `skipped` list.
11. **Tests build directories with `Create(DirectoryInfo, DirectorySecurity)` after `SetAccessRuleProtection(true, false)`.** Rationale: `%TEMP%` inherits foreign ACEs on this host, so unprotected "safe" directories are refused. Verify: `rg -n 'SetAccessRuleProtection\(' tests -g '*.cs'` prints at least one line; the six assertions in 1.15 pass; a test with a missing directory asserts `unreadable ACL`.
12. **Windows-only tests use `[Fact(Skip = "...", SkipUnless = nameof(IsWindows))]` (xUnit v3) and run on `windows-2025` and `windows-11-arm`.** Rationale: ACL behaviour is observable only there (CS-CI-01). Verify: `rg -n 'SkipUnless\s*=\s*nameof\(' tests -g '*.cs'` prints the ACL tests; the CI matrix log shows them passed, not skipped, on both Windows legs (`--minimum-expected-tests` per CS-TEST).
13. **Reuse `WhyUntrusted` for the CS-BIN cache root on Windows instead of skipping the check.** Rationale: Python skips it and ships a dead Windows branch. Verify: `rg -n 'WhyUntrusted' src -g '*.cs'` shows a call in the cache-root verification.
14. **Document the residual gaps next to the code: Deny ACEs, ancestors, check-then-launch.** Rationale: a reviewer must not assume more than the check proves. Verify: reading heuristic: the `///` summary or a `// ponytail:`-style comment on `PathAcl` names all three.

## AI-agent angle

| What an LLM gets wrong | Why it compiles | Smallest mechanical check |
|---|---|---|
| Uses `new DirectoryInfo(p).GetAccessControl()` (parameterless) and `FileSystemRights.Write`/`Modify` as the mask | compiles and mostly works | `rg -o --no-filename 'FileSystemRights\.\w+' src -g '*PathAcl*.cs' \| sort -u` must list four names; the matrix test (`r-RX` accepted, `r-WDAC` refused) catches `Modify`/`Write` |
| Checks only `Everyone`, `Users`, `Authenticated Users` (deny-list) | compiles; passes the obvious test | rule 2 `rg`; fixtures `bad-interactive-w`, `bad-other-account`, `bad-own-group` |
| `GetAccessRules(true, false, ...)` (explicit only) because "inherited ones are not set by the user" | compiles | rule 4; the `acl-probe-tools` shape (inherited `Authenticated Users: Modify`) |
| Translates to `NTAccount` and compares names like `"Everyone"` or `"BUILTIN\\Users"` | compiles; breaks on localised Windows (`Jeder`, `Benutzer`) and on lookup failures | rule 4 `rg 'NTAccount'` |
| Adds `Install-Package System.IO.FileSystem.AccessControl` (outdated .NET Framework / netstandard advice) | builds, package pruned | rule 9 `rg` over csproj |
| Calls the API under `#if WINDOWS` or with no guard, or annotates one method | warnings suppressed with `#pragma warning disable CA1416` | rule 6; red 1 and 2 |
| Wraps the read in `catch (Exception)` or `catch {}` and treats the failure as "safe" | compiles | rule 7 `rg`; the missing-directory test must refuse |
| Treats `File.GetUnixFileMode` or `FileInfo.Attributes` as portable and runs it on Windows | `GetUnixFileMode` throws `PlatformNotSupportedException` on Windows; `ReadOnly` attribute is not an ACL | rule 1 reading heuristic plus a Windows-leg test |
| Believes `icacls` `M` means write-only or that `IO` ACEs apply to the directory | | fixtures `ioonly-users-m` (accept) and `noinherit-users-m` (refuse) |
| Builds the safe test directory under `Path.GetTempPath()` without protecting inheritance | passes on CI images, fails on dev boxes with extra local accounts | rule 11 `rg 'SetAccessRuleProtection'` |
| Ports the POSIX `0o022` check literally ("Windows has no mode bits, skip it") | the Python SDK did exactly this | rule 1; absence of `WhyUntrusted` in the resolver |
| Calls `Directory.GetAccessControl(path)` (a .NET Framework static) | does not exist in .NET (the extension methods replaced it) | compile error: harmless but a sign of Framework-era advice |

## Contested / evolving

- **Allow-list vs deny-list.** Most hardening scripts name `Everyone`/`Users`/`Authenticated Users`. The measured miss rate (3 of 6 bad fixtures) favours the allow-list; the cost is refusing directories shared with the user's own groups. As of 2026-10-11 no source I read recommends either; this is a design choice backed by the fixtures.
- **Ignoring Deny ACEs vs exact evaluation.** Exact needs `AuthzAccessCheck` with an initialised client context for each candidate principal; Microsoft steers away from `GetEffectiveRightsFromAcl` ([doc](https://learn.microsoft.com/en-us/windows/win32/api/aclapi/nf-aclapi-geteffectiverightsfromacla)). Trend: stay conservative. Revisit only if a field report shows Deny-heavy PATH directories (not seen on this host).
- **Check the file too?** The commission asked about directories; the file check costs one `??` and caught a measured case. Python and Go check neither.
- **Whether `$OCX_HOME` should be checked.** Chosen: yes, because `OCX_HOME` can be pointed at `C:\ocx`. It is a SHOULD-level call; the Python reference does not check that tier on Windows or POSIX.
- **Is the .NET docs page current?** The API pages (updated 2026-05-27) still print "Package: System.IO.FileSystem.AccessControl v5.0.0". Trend: the shared-framework assembly is the live one on net8, net10 and net11 RC1; ignore the package line for those TFMs.
- **.NET 11 / C# 15.** Nothing specific: the net11.0 RC1 ref assembly keeps the same assembly-level `SupportedOSPlatform("windows")`. No new ACL helpers were found; none are claimed.
- **Windows default ACLs move.** `C:\` differs between this Windows 11 build (Authenticated Users Modify, inherit-only) and the Server 2022 STIG listing (Users `WD`/`AD`); future builds may tighten root creation. The check reads real ACLs, so it follows whatever the OS does.
- **Developer drives (Dev Drive / ReFS).** Not measured; ReFS supports ACLs, so no behavioural change is expected. Not run.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://learn.microsoft.com/en-us/dotnet/api/system.io.filesystemaclextensions.getaccesscontrol?view=net-10.0 | GetAccessControl overloads (primary) | updated 2026-05-27 | exact overloads; stale package line |
| https://learn.microsoft.com/en-us/dotnet/api/system.io.filesystemaclextensions?view=net-10.0 | FileSystemAclExtensions class incl. `Create(DirectoryInfo, DirectorySecurity)` (primary) | updated 2026-05-27 | atomic create with a DACL for tests |
| https://learn.microsoft.com/en-us/dotnet/api/system.security.accesscontrol.commonobjectsecurity.getaccessrules?view=net-10.0 | GetAccessRules(bool, bool, Type) (primary) | updated 2026-05-27 | `targetType` semantics |
| https://raw.githubusercontent.com/dotnet/runtime/main/src/libraries/System.IO.FileSystem.AccessControl/src/System/IO/FileSystemAclExtensions.cs | runtime source of the extensions (primary) | main, read 2026-10-11 | confirms `Access | Owner | Group` default and `FullName` path use |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1416 | CA1416 rule page (primary) | updated 2026-07-12 | guards, assembly/type attributes, default severity |
| https://learn.microsoft.com/en-us/dotnet/api/system.security.accesscontrol.filesystemrights?view=net-10.0 | FileSystemRights values and remarks (primary) | updated 2026-05-27 | numeric values, `CreateFiles = WriteData`, owner remark |
| https://learn.microsoft.com/en-us/dotnet/api/system.io.filesysteminfo.resolvelinktarget?view=net-10.0 | ResolveLinkTarget (primary) | updated 2026-07-01 | symlinks and junctions, 63-level limit, exceptions |
| https://learn.microsoft.com/en-us/windows/win32/secauthz/well-known-sids | well-known SIDs (primary) | 2025-10 | SID strings and meanings |
| https://learn.microsoft.com/en-us/windows/win32/secauthz/how-dacls-control-access-to-an-object | AccessCheck algorithm (primary) | 2025-03 | deny-first evaluation |
| https://learn.microsoft.com/en-us/windows/win32/secauthz/order-of-aces-in-a-dacl | canonical ACE order (primary) | 2025-03 | denies precede allows per level |
| https://learn.microsoft.com/en-us/windows/win32/secauthz/generic-access-rights | generic rights constants (primary) | 2025-07 | decodes the raw integers seen on inherit-only ACEs |
| https://learn.microsoft.com/en-us/windows/win32/fileio/file-security-and-access-rights | file and directory access rights (primary) | 2025-07 | parent ACL does not control child access; inherit-only ACEs |
| https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/icacls | icacls reference (primary) | 2026-10-01 | rights letters, `/deny` normalisation, `/remove:d`, `(IO)` |
| https://learn.microsoft.com/en-us/windows/win32/api/aclapi/nf-aclapi-geteffectiverightsfromacla | GetEffectiveRightsFromAcl (primary) | 2025-07 | why exact evaluation is not a one-liner |
| https://pkg.go.dev/os/exec#hdr-Executables_in_the_current_directory | Go LookPath and ErrDot (primary) | Go 1.19 behaviour | what Go refuses (cwd only) |
| https://cwe.mitre.org/data/definitions/426.html | CWE-426 Untrusted Search Path (primary) | current | mitigation wording |
| https://attack.mitre.org/techniques/T1574/007/ | ATT&CK T1574.007 PATH interception (primary) | v2.0, modified 2026-05-12 | M1022 restrict write permissions |
| https://www.nuget.org/packages/System.IO.FileSystem.AccessControl/ | package page (primary) | last updated 2020-11-09 | latest stable 5.0.0, netstandard2.0/net461 |
| https://api.nuget.org/v3-flatcontainer/system.io.filesystem.accesscontrol/index.json | package version list (primary) | read 2026-10-11 | no 8.x to 10.x versions exist |
| https://cveawg.mitre.org/api/cve/CVE-2022-45301 | CVE record, Chocolatey Ruby package (primary) | 2022-11-29 | `C:\tools\ruby31` writable by Authenticated Users |
| https://herolab.usd.de/security-advisories/usd-2019-0068/ | Chocolatey Python 3 advisory | 2020-04-29 | PATH directory with Authenticated Users Modify |
| https://stigaview.com/products/winserv2022/v2r8/WN22-00-000140 | Server 2022 STIG default `C:\` ACL | v2r8 | `Users:(CI)(AD)` and `(CI)(IO)(WD)` baseline |
| https://labs.portcullis.co.uk/blog/allowing-low-privileged-users-to-create-directories-in-c | Portcullis post | 2013-08-15 | low-privilege folder creation at `C:\` |
| ocx-sdk-python@80136dde4162:src/ocx_sdk/_bootstrap.py:340-366, 430-484 | Python SDK `_which`, `_trusted_location`, `_verify_root` (local) | 2026 | the Windows gap being closed |
| ocx@a23ec5be2939:crates/ocx_config/src/lib.rs:165-168, 525-550, 1048-1049 | ocx CLI toolchain-dir checks (local) | 2026 | CLI is Unix-only for the same check |
| xunit__xunit@0c7aa4991fa3:src/xunit.v3.core.tests/Runners/XunitTestRunnerTests_reflection.cs:467-473 | `[Fact(Skip=..., SkipUnless=nameof(...))]` (local exemplar) | 2026 | skip syntax for Windows-only tests |
