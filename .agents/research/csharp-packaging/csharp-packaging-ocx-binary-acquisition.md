---
title: "How a C# SDK obtains, selects and verifies the ocx binary"
topic: csharp-packaging / csharp-packaging-ocx-binary-acquisition
agent: deep-dive researcher (sonnet subagent, research-lang csharp, wave 1)
model: claude-sonnet-5-5
date_researched: 2026-10-10
sources_count: 31
scope: >
  Covers: delivery models for the ocx executable (locate / ship in nupkg / download at first use), the .NET RID to cargo-dist triple
  table for the 8 ocx targets, host-architecture detection (OSArchitecture vs ProcessArchitecture, Rosetta, Windows on ARM, 32-bit hosts, musl),
  sha256 verification of the dist manifest and archives, tar/zip extraction, atomic install, exec bit, cache-root checks, HttpClient
  lifetime/redirect/credential/proxy/cap rules. Measured on SDK 8.0.425 / 10.0.401 / 11.0 RC1, Linux (Fedora/WSL2), Alpine 3.x container, Windows 10.0.26200 (SDK 10.0.102).
  Not covered: process spawning/cancellation (other subtopics), signature (sigstore) verification of ocx (upstream open item), macOS runtime
  (no macOS host available; macOS claims rest on docs and source), final owner decision on the delivery model.
---

# How a C# SDK obtains, selects and verifies the ocx binary

Fixtures, logs and archives: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-packaging-ocx-binary-acquisition/` (re-run everything with `run-all.sh` there).
Citation forms: `owner__repo@sha12:path:line` for the exemplar clones under `/home/mherwig/.cache/research-lang/exemplars/csharp`; `ocx-sdk-python@80136dde4162:src/ocx_sdk/<file>:line` for the Python reference; markdown links for web sources.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   - [F1 Verdict: delivery model](#f1-verdict-delivery-model-subject-to-the-owners-decision)
   - [F2 What the C# exemplars do](#f2-what-the-c-exemplars-do)
   - [F3 Locating an existing binary](#f3-locating-an-existing-binary)
   - [F4 RID to triple table and host detection](#f4-rid-to-triple-table-and-host-detection)
   - [F5 Manifest and archive verification](#f5-manifest-and-archive-verification)
   - [F6 Transport: HttpClient, redirects, credentials, proxy, caps](#f6-transport-httpclient-redirects-credentials-proxy-caps)
   - [F7 Extraction](#f7-extraction)
   - [F8 Install, exec bit, cache root](#f8-install-exec-bit-cache-root)
   - [F9 If binaries ship inside NuGet packages](#f9-if-binaries-ship-inside-nuget-packages)
   - [F10 API availability on the .NET 8 floor](#f10-api-availability-on-the-net-8-floor)
   - [F11 Verified on the toolchain](#f11-verified-on-the-toolchain)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- **Recommend (owner decides): locate first, then download-on-demand into a per-user cache with sha256 verification; ship no ocx binary inside the SDK nupkg.** Measured cost of shipping all 8: 91,600,345-byte nupkg (36% of nuget.org's ~250 MB cap) per ocx release, 202 MB extracted on every restore, and a RID-specific `dotnet publish -r linux-x64` silently drops a musl-only payload.
- Discovery order is explicit path, then `OCX_SDK_EXE`, then PATH, then `$OCX_HOME/symlinks/ocx.sh/ocx/cli/current/content/bin/{ocx,ocx.exe}`; resolve once to an absolute path and pin it. Never `Process.Start("ocx")` with a bare name: .NET resolves `./ocx` in the current directory before PATH on Linux and Windows (measured).
- Select the binary with `RuntimeInformation.OSArchitecture` (since .NET 7 it reports Arm64 under Rosetta 2 and under x64/x86 emulation on Windows ARM64), never `ProcessArchitecture`; no `sysctl.proc_translated` P/Invoke is needed. A 32-bit .NET host on 64-bit Windows maps to the x64 build; 32-bit Windows, 32-bit Linux, riscv64, s390x, loongarch64 and non-Windows/Linux/macOS hosts throw `PlatformNotSupportedException`.
- Linux defaults to the **static musl** build on every distro (`file` says `static-pie linked`; it ran on Fedora glibc and Alpine in the fixtures), so no libc detection is needed; glibc is an explicit opt-in. Do not parse `RuntimeInformation.RuntimeIdentifier` (opaque since .NET 8, Alpine reports `linux-musl-x64`).
- Verify the **whole archive's sha256 against the manifest row before reading a single member**. .NET `ZipArchive` does not verify CRC32 on .NET 8 and 10 (19 of 20 single-bit flips in a real `ocx.exe` zip were accepted with different bytes); 11.0 RC1 catches 14 of 20, not all.
- Compare digests as bytes: `CryptographicOperations.FixedTimeEquals(hash, Convert.FromHexString(expected))`. `Convert.ToHexString(hash) == expected` is always false against the lowercase manifest (measured: the correct archive was refused), and `Convert.ToHexStringLower` is .NET 9+ (CS0117 on the net8 floor).
- Treat `dist.json` as untrusted input: `schema == 1`, `\A[A-Za-z0-9._+-]+\z` for names (plus a separate `..` test), `\A[0-9a-f]{64}\z` for digests, https URLs without userinfo. `^...$` accepts a trailing `\n` in .NET (measured), so anchor with `\A...\z`.
- Off `setup.ocx.sh` (or with a mirror) require an explicit manifest digest; TLS proves reachability, not authenticity. There is no signature check anywhere in the chain today.
- Never call `TarFile.ExtractToDirectory` or `ZipFile.ExtractToDirectory` on a release archive. .NET rejects `../evil`, absolute names and symlink escapes (IOException), but caps nothing (300 MiB bomb accepted), follows a pre-existing symlinked destination (write landed in the attacker directory), and leaves earlier members behind when a later one is rejected. Stream exactly one named regular-file member with `TarReader`/`ZipArchive`, counting bytes against a 256 MiB cap.
- Install atomically: write to a `FileMode.CreateNew` temp file in the target directory (`UnixCreateMode = 0600`), `File.SetUnixFileMode(..., 0700)` behind `!OperatingSystem.IsWindows()`, then `File.Move(tmp, final, overwrite: true)`. Writing into a running binary fails (`ETXTBSY` on Linux, sharing violation on Windows) and renaming over a running `.exe` fails on Windows (`UnauthorizedAccessException`), so install into a version/target directory that is never overwritten.
- Use one long-lived `HttpClient` over `SocketsHttpHandler { AllowAutoRedirect = false, PooledConnectionLifetime = ... }`; set a `User-Agent` yourself (default sends none); bound each attempt with a `CancellationTokenSource` because `HttpClient.Timeout` does not bound a streamed body (a stalled body ran 4.0 s under `Timeout = 1 s`).
- Credentials: the default redirect handler strips only the typed `Authorization` header; a custom header such as `X-Ocx-Token` was forwarded to the other origin (measured). Follow redirects by hand (cap 5 hops, https only) and attach credentials only when scheme, host and port match.
- Cache root: `Directory.CreateDirectory(path, UnixFileMode)` applies the mode to the leaf only (parents came out 755), `DirectoryInfo.LinkTarget` detects a symlinked root, and .NET has no managed owner/uid accessor, so ownership checks need P/Invoke or are skipped; refuse group/other-writable roots instead.
- Enforce what a machine can check: `Microsoft.CodeAnalysis.BannedApiAnalyzers` RS0030 with **full parameter lists** (a parameterless `M:` line matched nothing for overloaded methods), CA1416, CA5350, CA5359, SYSLIB0014 at error severity, plus the 11 `rg` rules in the Normative section (each watched red on a planted file and green on its twin).
- Unit-test the RID mapping as a pure function over `(os, osArch, processArch, libc)` tuples (20 rows pass on net10; the `ProcessArchitecture` variant fails 4). The Python SDK has no arm64 CI leg; do not copy that gap.

## Findings

### F1 Verdict: delivery model (subject to the owner's decision)

Three models were commissioned. Measured facts decide between them:

| Model | Measured / sourced cost | Failure mode found | Verdict |
|---|---|---|---|
| (a) Locate only (explicit path, `OCX_SDK_EXE`, PATH, ocx symlink) | zero bytes, zero trust surface | fresh CI runner or container has no ocx | Mandatory first tier in every design |
| (b1) All 8 binaries in one nupkg under `runtimes/<rid>/native/` | **91,600,345 bytes** per ocx release (8 binaries raw 202,369,448 bytes); nuget.org limit is "about 250 MB" ([nuget.org publish docs](https://learn.microsoft.com/en-us/nuget/nuget-org/publish-a-package)); `du` of a restored feed: 281 MB for two such packages | RID-specific publish flattens native assets to the app root and keeps **only the matching RID** (`dotnet publish -r linux-x64` of a musl-only package produced no `ocx`, no warning); exec bit depends on the extractor | Reject as default |
| (b2) Per-RID runtime packages under a meta package (Aspire DCP pattern) | ~11-12 MB per package (archive sizes, F4) | Aspire selects the package from the **build host** OS/arch (`dotnet__aspire@af646baee1e8:Directory.Build.props:50-57`), wrong for cross-publish; consumer still pays 7 package versions per ocx bump (`eng/Versions.props:27-33`) | Possible later add-on for air-gapped users |
| (c) Download at first use from `setup.ocx.sh/dist.json` with sha256 | one 86 KB manifest + one ~11 MB archive; hash of the 25.4 MiB binary costs 12.6 ms (cache-hit re-verify) | needs network once; trust surface = TLS to `setup.ocx.sh` + digest from the same origin (no signature) | **Recommended default**, same as the Python SDK |

Recommended shape: `OcxLocator.Discover(...)` (tiers a) plus `OcxBootstrap.EnsureAsync(...)` (tier c) that returns an absolute path; callers pass that path to the client. An optional, separate `Ocx.Sdk.Binaries` package (b2 layout) can serve air-gapped installs later. This keeps the SDK nupkg a few KB of IL (the managed-only fixture package is 3,269 bytes).

Python reference behaviour being mirrored: discovery `ocx-sdk-python@80136dde4162:src/ocx_sdk/_bootstrap.py` (`discover`, digest §5 cites `:245-292`), triple mapping `uname_to_triple` (`:106-144`), manifest caps `_dist.py:67` (1 MiB) and `:70` (256 MiB), redirect cap `:73` (5).

### F2 What the C# exemplars do

| Exemplar | Mechanism | Digest? | Evidence |
|---|---|---|---|
| `pulumi__pulumi-dotnet@2a0dca84f09b` | downloads `https://get.pulumi.com/install.sh` / `install.ps1` with `new HttpClient()`, runs it (PowerShell with `-ExecutionPolicy Bypass`), shells out to `chmod u+x`; swallows every exception from the "already installed" probe | **none** (anti-pattern) | `sdk/Pulumi.Automation/Commands/LocalPulumiCommand.cs:112,135,152,163,190,210,228` |
| `dotnet__aspire@af646baee1e8` | one NuGet package per OS/arch (`microsoft.developercontrolplane.<os>-<arch>`, incl. `linuxmusl-amd64`), path stored as `AssemblyMetadata("DcpCliPath")`, overridable by config/env (`ASPIRE_DCP_PATH`); selects `ProcessArchitecture` for `conpty.dll` but `OSArchitecture` for `OpenConsole.exe` | NuGet's own package integrity only | `eng/Versions.props:27-33`; `Directory.Build.props:50-57`; `src/Aspire.Hosting/Dcp/DcpOptions.cs:238,266-275`; `src/Aspire.Hosting/Dcp/DcpHost.cs:389-445` |
| `Tyrrrz__CliWrap@7dbc252fa773` | helper `.exe` embedded as a resource and extracted to `%TEMP%\CliWrap.Signaler.<guid>.exe` per use, deleted on dispose | none needed (same assembly) | `CliWrap/Native/WindowsSignaler.cs:58-65`; `CliWrap/CliWrap.csproj:60-63` |
| `nuke-build__nuke@27e8077b8ab0` | explicit option, then `<TOOL>_EXE` env var, then attribute-driven PATH/npm resolution; never downloads a binary | n/a | `source/Nuke.Tooling/ToolTasks.ToolPath.cs:22-31,50-57` |
| `cake-build__cake@08885933e936` | tools come through in-process NuGet install; RID chosen from `RuntimeInformation.RuntimeIdentifier` and an embedded portable RID graph | NuGet's | `src/Cake.NuGet/NuGetContentResolver.cs:64,99` |

Conclusion: no C# exemplar verifies a downloaded artifact's digest; the only one that downloads and executes (Pulumi) does so unverified. The explicit-path then env-var then PATH ladder (Nuke, Python SDK) is the shared, proven locate tier.

### F3 Locating an existing binary

Order (same as Python, `python-sdk-digest.md` §5): explicit `exe` argument, `OCX_SDK_EXE`, PATH scan, ocx's own stable symlink `$OCX_HOME/symlinks/ocx.sh/ocx/cli/current/content/bin/{ocx,ocx.exe}`. `$OCX_HOME` defaults to `~/.ocx` on every OS (`%USERPROFILE%\.ocx` on Windows) per `ocx-cli-contract.md` line 83; on Windows the directory links are NTFS junctions (no admin needed).

1. **Never start a bare name.** Measured with `Process.Start("ocx")` (`UseShellExecute = false`):

```csharp
// INCORRECT: red on Linux ('trap' printed by ./ocx in cwd, real ocx on PATH) and on Windows (cwd copy ran: whoami.exe stand-in exit=1)
var psi = new ProcessStartInfo("ocx");
// CORRECT: green on both (real ocx ran: 0.6.5 on Linux, 0.6.3 on the Windows host)
var psi = new ProcessStartInfo(pinnedAbsolutePath);
```

2. The home tier must read `Environment.GetFolderPath(Environment.SpecialFolder.UserProfile)` (`$HOME` on Linux/macOS, `%USERPROFILE%` on Windows) in addition to `OCX_HOME`; the Python SDK reads only `HOME`, which is normally unset on Windows (digest S7, likely latent defect).
3. PATH scan: walk entries yourself, skip an entry equal to the current directory on Windows, skip group/other-writable directories on POSIX (`File.GetUnixFileMode`/`DirectoryInfo.UnixFileMode & (GroupWrite | OtherWrite)`), honour `PATHEXT` on Windows. Resolve to a full path once at construction and keep it.
4. A resolved path from tier 1 or 2 is trusted as given (the operator named it); tiers 3 and 4 are inferred and get the hardening above.

### F4 RID to triple table and host detection

Live manifest (`https://setup.ocx.sh/dist.json`, fetched 2026-10-10: schema 1, 86.2 KB, latest `0.6.5`): 8 targets per version; archives `.tar.gz` except Windows `.zip`. All 8 archives for 0.6.5 were downloaded and their sha256 matched the manifest rows.

| .NET RID | cargo-dist triple (manifest `target`) | Archive (bytes) | Member inside | Binary bytes |
|---|---|---|---|---|
| `linux-musl-x64` (default for `linux-x64` hosts) | `x86_64-unknown-linux-musl` | `.tar.gz` 11,838,585 | `ocx-<triple>/ocx` | 26,681,272 |
| `linux-musl-arm64` (default for `linux-arm64` hosts) | `aarch64-unknown-linux-musl` | `.tar.gz` 11,015,039 | `ocx-<triple>/ocx` | 22,019,392 |
| `linux-x64` (opt-in glibc) | `x86_64-unknown-linux-gnu` | `.tar.gz` 11,737,093 | `ocx-<triple>/ocx` | 26,486,808 |
| `linux-arm64` (opt-in glibc) | `aarch64-unknown-linux-gnu` | `.tar.gz` 11,157,072 | `ocx-<triple>/ocx` | 23,244,416 |
| `osx-x64` | `x86_64-apple-darwin` | `.tar.gz` 11,510,037 | `ocx-<triple>/ocx` | 24,918,568 |
| `osx-arm64` | `aarch64-apple-darwin` | `.tar.gz` 10,982,371 | `ocx-<triple>/ocx` | 22,517,232 |
| `win-x64` | `x86_64-pc-windows-msvc` | `.zip` 12,276,706 | `ocx.exe` (flat) | 30,434,816 |
| `win-arm64` | `aarch64-pc-windows-msvc` | `.zip` 11,699,930 | `ocx.exe` (flat) | 26,066,944 |

Unsupported (no ocx build): `win-x86`, `linux-arm`, `linux-x86`, `linux-riscv64`, `linux-s390x`, `linux-loongarch64`, `browser-wasm`, FreeBSD and every other OS. Select the archive member by base name and require exactly one regular-file match: the tar has a top-level directory plus README/LICENSE/CHANGELOG members, the zip is flat.

Host detection semantics:

- `RuntimeInformation.OSArchitecture` is "the actual architecture of the underlying operating system", takes Windows and macOS emulation into account, and does **not** see QEMU on Linux ([API docs](https://learn.microsoft.com/en-us/dotnet/api/system.runtime.interopservices.runtimeinformation.osarchitecture?view=net-10.0)). Since .NET 7 it returns `Arm64` for emulated processes on Windows ARM64 and Apple Silicon ([breaking change](https://learn.microsoft.com/en-us/dotnet/core/compatibility/interop/7.0/osarchitecture-emulation)). Source: Windows calls `IsWow64Process2` and maps the native machine (`dotnet/runtime@v10.0.0 RuntimeInformation.Windows.cs:34-62`), Unix asks the OS (`RuntimeInformation.Unix.cs:31-45`).
- Consequence for the Python mapping: Rosetta detection via `sysctlbyname("sysctl.proc_translated")` is not needed in C#; an x64 .NET under Rosetta already reports `Arm64`. The 20-row table below was checked as a pure function.
- A 32-bit .NET process on 64-bit Windows reports `OSArchitecture = X64` (so it gets the x64 ocx; ocx.exe is a separate 64-bit process, WOW64 is irrelevant). A 32-bit Windows OS reports `X86` and must throw.
- `RuntimeInformation.RuntimeIdentifier` returns the RID the runtime was built for since .NET 8 and is "an opaque value ... not intended to be parsed" ([breaking change](https://learn.microsoft.com/en-us/dotnet/core/compatibility/core-libraries/8.0/runtimeidentifier)). Measured: `linux-x64` on Fedora/glibc, `linux-musl-x64` inside `mcr.microsoft.com/dotnet/runtime:10.0-alpine`. Not a selector.
- The RID catalog warns "Don't try to parse RIDs" and "Don't build RIDs programmatically unless absolutely necessary" ([RID catalog](https://learn.microsoft.com/en-us/dotnet/core/rid-catalog)); here the mapping is a closed table of 8 triples plus a throw, which is the acceptable form.
- **musl policy**: the musl build is `static-pie linked` (`file`), ran on Fedora 43 (glibc) and Alpine. Default to it on Linux for both architectures and make glibc an explicit option (`OCX_SDK_LIBC=gnu`-style knob). Probing for Alpine (`/etc/alpine-release`, `ld-musl`, `ldd`) is unnecessary and fragile. Trade-off not measured here: static musl uses musl's resolver rather than glibc NSS, so unusual `nsswitch.conf` setups may resolve differently; that is why the opt-in exists.

```csharp
// CORRECT (net8+; fixture rid/Program.cs, 20/20 rows pass on net10 and on the Windows host)
public static string Select(Host os, Architecture osArch, Libc libc)
{
    var arch = osArch switch
    {
        Architecture.X64 => "x86_64",
        Architecture.Arm64 => "aarch64",
        _ => throw new PlatformNotSupportedException($"ocx publishes no build for {os}/{osArch}; install ocx and pass an explicit path."),
    };
    return os switch
    {
        Host.Linux => $"{arch}-unknown-linux-{(libc == Libc.Gnu ? "gnu" : "musl")}",
        Host.MacOS => $"{arch}-apple-darwin",
        Host.Windows => $"{arch}-pc-windows-msvc",
        _ => throw new PlatformNotSupportedException($"ocx publishes no build for {os}/{osArch}."),
    };
}
// INCORRECT: describes the .NET process, not the machine. Fails 4 of 20 rows: Windows ARM64 + x64 process,
// Windows ARM64 + x86 process, 32-bit host on x64 Windows, macOS arm64 + x64 process (Rosetta).
var arch = RuntimeInformation.ProcessArchitecture;
```

Which of x64-under-emulation or native is "better" on Windows ARM64: the table picks native (`aarch64-pc-windows-msvc`) because ocx.exe is a separate process and the native build avoids emulation cost; the x64 build would also run. Owner can flip this with one row if native arm64 proves problematic.

### F5 Manifest and archive verification

Trust chain today (mirrors Python `_dist.py`): TLS to `setup.ocx.sh` authenticates the manifest; the manifest row's `sha256` authenticates the archive. No signature exists ([digest S14](python-sdk-digest.md), sigstore is an upstream open item). Therefore:

1. **Digest of the archive before any parsing of its content.** Hash the downloaded temp file (`SHA256.HashDataAsync(Stream)`, .NET 7+) and compare to the validated row digest; only then open the archive. Measured on real archives (fixture `digest/`):

| Scenario (real 0.6.5 archives) | Without digest check (red) | With digest check (green) |
|---|---|---|
| 20 single-bit flips in `ocx-x86_64-pc-windows-msvc.zip` read with `ZipArchive` (net10.0.12, net8.0.31) | 19 accepted with different binary bytes, 1 exception | 20 rejected `ChecksumMismatch` |
| same on 11.0 RC1 | 6 accepted with different bytes, 14 exceptions (CRC32 is checked now, not always) | 20 rejected |
| 20 flips in the `.tar.gz`, reader stops after the `ocx` member | 19 accepted with different bytes | 20 rejected |
| 20 flips in the `.tar.gz`, reader drains to the end of the gzip stream | 0 accepted (gzip trailer CRC32 caught all 20) | 20 rejected |
| valid repacked `.tar.gz` containing a different `ocx` script | accepted (`sha(bin)=cebf25e06683`) | rejected `ChecksumMismatch` |

   So the zip path has no integrity net at all below the digest, and the tar path only has one if the reader drains the gzip stream. Never rely on CRC/gzip.
2. **Compare bytes, not strings.** `Convert.ToHexString` returns uppercase; the manifest is lowercase:

```csharp
// INCORRECT: red, the correct archive is refused ("FALSE MISMATCH")
if (Convert.ToHexString(SHA256.HashData(archive)) == row.Sha256) ...
// INCORRECT on the net8 floor: Convert.ToHexStringLower does not exist before .NET 9 (error CS0117, observed building digest-net8)
// CORRECT: validate spelling first, then compare raw bytes in constant time
if (!Sha256Hex().IsMatch(row.Sha256)) throw new DistManifestException(...);       // \A[0-9a-f]{64}\z
if (!CryptographicOperations.FixedTimeEquals(actual, Convert.FromHexString(row.Sha256))) throw new ChecksumMismatchException(...);
```
3. **Field validation** (port of `_validate_field`, `_dist.py:735-761`): `version` `\A[0-9]+(?:\.[0-9]+){1,2}(?:[-+][A-Za-z0-9.-]+)?\z`, `channel`/`tag`/`target`/`filename` `\A[A-Za-z0-9._+-]+\z` and no `..` substring, `sha256` `\A[0-9a-f]{64}\z`, `url` absolute https without userinfo. In .NET `$` matches before a final `\n`: measured `Regex.IsMatch("<64 hex>\n", "^[0-9a-f]{64}$")` is `True`; with `\A...\z` it is `False`. `..` matches the name class, so test it separately.
4. **Schema**: `schema` must be the integer 1, else fail closed; unknown envelope and row keys are ignored; one bad row fails the whole manifest (a manifest that can carry one hostile field can carry the one you were about to use).
5. **Pinning rule** (port of `_expected_digest`, `_dist.py:647-652`): a manifest fetched from any host other than `setup.ocx.sh`, or any fetch paired with a mirror, requires an explicit manifest digest (or a `dist/<sha256>.json` snapshot URL whose name is the digest, taken from the caller's string before any redirect). Local sources (path, embedded bytes) are exempt because they have provenance.
6. After install, record the digest of the **extracted binary** in a sidecar (`ocx.sha256`) and re-hash on cache hits (12.6 ms for 25.4 MiB), with an explicit opt-out for trusted caches.

### F6 Transport: HttpClient, redirects, credentials, proxy, caps

- **Lifetime.** One long-lived `HttpClient` with `SocketsHttpHandler.PooledConnectionLifetime` set, or `IHttpClientFactory`; never a client per request ([HttpClient guidelines](https://learn.microsoft.com/en-us/dotnet/fundamentals/networking/http/httpclient-guidelines)). A library without DI should own one private static client.
- **User-Agent.** `HttpClient` sends none by default (measured: `User-Agent=[]`). Set `ocx-sdk-dotnet/<assembly version>`. The Python digest says the CDN 403s urllib's default UA; I could not reproduce that with `curl -A 'Python-urllib/3.12'` today (HTTP 200 for no UA, urllib UA and a custom UA), so treat the UA as identification, not as a proven requirement.
- **Timeout.** `HttpClient.Timeout` does not bound a body read with `ResponseHeadersRead`:

```csharp
// INCORRECT: red, "Timeout=1s, body stalled: read finished after 4.0s"
using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(1) };
using var resp = await client.GetAsync(url, HttpCompletionOption.ResponseHeadersRead);
// CORRECT: green, aborted after 1.0s with TaskCanceledException
using var cts = new CancellationTokenSource(perAttemptBudget);
using var resp = await client.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, cts.Token);
await using var body = await resp.Content.ReadAsStreamAsync(cts.Token);
```
- **Caps.** Stream and count: manifest 1 MiB, archive 256 MiB, unpacked member 256 MiB (the same numbers as Python). `GetByteArrayAsync`/`GetStringAsync`/`ReadAsByteArrayAsync` buffer without a cap you control; ban them (RS0030 below).
- **Redirects and credentials.** The default handler (`dotnet/runtime@v10.0.0 RedirectHandler.cs`) blocks https to http redirects (`:133-139`), clears only the typed `Authorization` header on every hop (`:53`), and returns the 3xx response itself when the hop count is exceeded (`:38-48`, default 50). Custom headers survive redirects. Measured with a 302 from `127.0.0.1:A` to `localhost:B`: red `X-Ocx-Token: SECRET` reached B; green (manual loop, `AllowAutoRedirect = false`, credentials only for the original scheme/host/port) delivered nothing. Python's `add_unredirected_header` plus origin binding is the model.
- **Proxy.** Rely on `HttpClient.DefaultProxy`: Windows and macOS read env vars then system settings, Linux reads `HTTP_PROXY`/`HTTPS_PROXY`/`ALL_PROXY`/`NO_PROXY` only and otherwise bypasses ([DefaultProxy docs](https://learn.microsoft.com/en-us/dotnet/api/system.net.http.httpclient.defaultproxy?view=net-10.0)). Do not invent SDK-specific proxy variables.
- **Custom CA bundle** (Python's `ca_bundle` replaces the trust store): on Linux .NET honours `SSL_CERT_FILE`/`SSL_CERT_DIR` through OpenSSL ([cross-platform cryptography](https://learn.microsoft.com/en-us/dotnet/standard/security/cross-platform-cryptography)). For an in-process override use `SocketsHttpHandler.SslOptions.CertificateChainPolicy = new X509ChainPolicy { TrustMode = X509ChainTrustMode.CustomRootTrust, CustomTrustStore = { ... } }` (compiles and constructs on net8.0.31 and net10.0.12). Never use `ServerCertificateCustomValidationCallback = (...) => true`, `DangerousAcceptAnyServerCertificateValidator`, or `ServicePointManager.ServerCertificateValidationCallback` (CA5359, RS0030, SYSLIB0014 all fire in the gate fixture).
- **Retries.** Retry only transport conditions (resets, timeouts, truncated responses, 429, 5xx); never retry 401/403/404, size-cap aborts or a checksum mismatch ("the bytes are wrong, not late"); every attempt starts by discarding the previous partial file.

### F7 Extraction

Documented behaviour of `TarFile.ExtractToDirectory` ([docs](https://learn.microsoft.com/en-us/dotnet/api/system.formats.tar.tarfile.extracttodirectory?view=net-10.0)): throws if an entry would land outside the destination; throws `IOException` for a link entry that would escape; **follows** a pre-existing symlink/junction destination; "doesn't limit the total extracted size or the number of entries ... iterate over the entries manually using TarReader". `ZipFile.ExtractToDirectory`: entries outside the destination throw, partial extraction remains on error, a pre-existing link destination is followed ([docs](https://learn.microsoft.com/en-us/dotnet/api/system.io.compression.zipfile.extracttodirectory?view=net-10.0)).

Measured on `net10.0` (10.0.12) and `net8.0` (8.0.31), identical results (fixture `tar/`, `tar-net8/`):

| Case | `TarFile.ExtractToDirectory` (red) | Single-member `TarReader` extractor (green) |
|---|---|---|
| A `../evil` after a valid `ocx` | `IOException` (docs say `ArgumentException`), **but `dest-A/ocx` was already written** | `InvalidDataException`, nothing left in dest (staged, promoted last) |
| B absolute entry name | `IOException` | `InvalidDataException` |
| C symlink entry `link -> ..` then `link/pwn` | `IOException` | rejected (no `ocx` member) |
| D mode `7755` | extracted as `755` (setuid/setgid/sticky stripped by .NET) | extracted `0700` |
| E 300 MiB zero bomb | **accepted**, 314,572,800 bytes on disk | `InvalidDataException` at the 256 MiB cap |
| F destination is a pre-existing symlink | **accepted, file written into `attacker-dir/ocx`** | `IOException` (`DirectoryInfo.LinkTarget is not null`) |
| G hardlink entry to `/etc/passwd` | `FileNotFoundException` | rejected: not a regular file |

```csharp
// CORRECT (condensed from fixture tar/Program.cs, class Green)
if (new DirectoryInfo(destDir).LinkTarget is not null) throw new IOException("destination is a link");  // root only: /home -> /var/home is legitimate
using var tr = new TarReader(new GZipStream(File.OpenRead(archive), CompressionMode.Decompress));
while (tr.GetNextEntry(copyData: false) is { } e)
{
    var n = e.Name.Replace('\\', '/');
    if (n.StartsWith('/') || n.Split('/').Contains("..")) throw new InvalidDataException(e.Name);   // refuse even though the name is never used as a path
    if (e.EntryType is TarEntryType.Directory or TarEntryType.GlobalExtendedAttributes) continue;
    if (n.Split('/')[^1] != "ocx") continue;
    if (e.EntryType is not (TarEntryType.RegularFile or TarEntryType.V7RegularFile)) throw new InvalidDataException("not a regular file");
    // exactly one match, copy with a running byte count against the 256 MiB cap into a CreateNew temp file, promote after the loop
}
```

Zip (Windows): same shape with `ZipArchive`: `entry.FullName` base name must equal `ocx.exe`, reject directory entries and entries whose `ExternalAttributes >> 16` marks a symlink, count bytes while copying (the declared `Length` is attacker-controlled), and rely on the **archive digest**, not CRC32 (F5). On the net8 floor there is no `TarExtractOptions`/`ZipExtractionOptions`; .NET 11 adds those overloads ([TarFile docs](https://learn.microsoft.com/en-us/dotnet/api/system.formats.tar.tarfile.extracttodirectory?view=net-10.0)) and an invalid-checksum `InvalidDataException`, which does not help on the floor.

### F8 Install, exec bit, cache root

- **Never write into the final path.** On Linux, opening a running binary for write fails (`IOException: Text file busy`), rename-over succeeds. On Windows both fail (`IOException` sharing violation, `UnauthorizedAccessException` on `File.Move(..., overwrite: true)` over a running `ocx.exe`; measured on Windows 10.0.26200, SDK 10.0.102). Hence: `<cache>/<ocx version>/<triple>/ocx[.exe]`, written once per (version, target), plus the sidecar digest. A concurrent second installer must tolerate "already present and verified".
- **Exec bit.** `File.SetUnixFileMode(path, UserRead | UserWrite | UserExecute)` (.NET 7+, `[UnsupportedOSPlatform("windows")]`, [docs](https://learn.microsoft.com/en-us/dotnet/api/system.io.file.setunixfilemode?view=net-10.0)). Unguarded calls raise **CA1416** (error in the gate fixture). Do not shell out to `chmod` (Pulumi does, `LocalPulumiCommand.cs:228`). Create the temp file with `FileStreamOptions.UnixCreateMode = UserRead | UserWrite` so the secret-free binary is never group/world readable while partial.
- **Cache root.**
  - Windows: `Environment.GetFolderPath(LocalApplicationData)` + `ocx-sdk` (`C:\Users\ecom\AppData\Local`). macOS: `~/Library/Caches/ocx-sdk` composed by hand. Linux: `$XDG_CACHE_HOME` else `~/.cache`. `Environment.SpecialFolder.LocalApplicationData` on Linux is `~/.local/share` (measured), the data dir, not a cache dir.
  - `Directory.CreateDirectory(path, mode)` (.NET 7+) applied the mode to the **leaf only**: created `a/b` came out `b=700`, `a=755`. Create level by level, as Python's `_secure_mkdir` does.
  - `DirectoryInfo.LinkTarget` (.NET 6+) detects a symlink/junction root or level. Refuse them (CWE-59).
  - Mode check: refuse a root with `GroupWrite | OtherWrite` (CWE-732). **Ownership** (Python compares `st_uid` with `getuid()`): `FileSystemInfo` exposes only `Attributes, CreationTime*, Exists, Extension, FullName, LastAccessTime*, LastWriteTime*, LinkTarget, Name, UnixFileMode`, and `Environment` has no uid (measured by reflection on 10.0.12). A managed SDK either P/Invokes `stat`/`geteuid` (struct layout differs per platform) or documents that it does not check ownership. Windows needs no check (ACL inheritance of `%LOCALAPPDATA%`).
- Do not check ancestors for links: `/home -> /var/home` exists on Fedora Atomic; the first version of the fixture did and rejected legitimate roots.

### F9 If binaries ship inside NuGet packages

Only relevant if the owner overrides F1; measured with SDK 10.0.401 against a local feed (fixtures `pack/`, `pack-musl-only/`, `consumer/`, `consumer-musl/`).

- Layout: native assets are `runtimes/{rid}/native/*`; NuGet picks the single most compatible RID directory and "only the files in that directory are copied" ([native files in .NET packages](https://learn.microsoft.com/en-us/nuget/create-packages/native-files-in-net-packages)). The same page says the SDK flattens subdirectories under `native/` on copy.
- Output shape: RID-agnostic `dotnet build/publish` keeps `bin/runtimes/<rid>/native/ocx` for all 8 RIDs (8 `runtimeTargets` rows in `consumer.deps.json`); `dotnet publish -r linux-x64` puts one file `ocx` in the **app root**; `-r win-arm64` puts `ocx.exe` in the root. A resolver must probe both `runtimes/<rid>/native/` and `AppContext.BaseDirectory`.
- **Musl-only is a trap**: with only `linux-musl-*` assets, `dotnet publish -r linux-musl-x64` produced `ocx` (25.4 MB) but `dotnet publish -r linux-x64` (the normal container RID) produced no `ocx` and no warning (musl RIDs are not on `linux-x64`'s import chain). Covering it means duplicating the musl binary under `linux-x64` and `linux-arm64` (+~49 MB) or shipping glibc builds too.
- **Packing quirk**: for extensionless files "NuGet & MSBuild treat paths without an extension as directories" and a glob needs a trailing `/` in `PackagePath` ([msbuild-targets](https://learn.microsoft.com/en-us/nuget/reference/msbuild-targets)). A glob with `PackagePath="runtimes/%(RecursiveDir)native/"` produced `runtimes/linux-x64/native/linux-x64/ocx` (RID doubled); `%(Filename)%(Extension)` produced `native/ocx/linux-x64/ocx`; explicit per-file items with `PackagePath="runtimes/linux-x64/native/"` produced `runtimes/linux-x64/native/ocx`. `.exe` files accidentally worked.
- **Exec bit**: NuGet (4.3+) sets the user-execute bit when extracting ([NuGet/Home#7673](https://github.com/NuGet/Home/issues/7673)); measured `-rwxr--r--` (0744) in `~/.nuget`-style folders and in `bin/runtimes/.../ocx`; it ran on Fedora and in Alpine. A copy through a zip or a Windows build host loses it: planting `chmod 644` gave `Win32Exception: ... Permission denied` (red), `File.SetUnixFileMode(..., exec)` then ran `ocx version -> 0.6.5` (green).
- **Alpine proof**: the same framework-dependent output run in `mcr.microsoft.com/dotnet/runtime:10.0-alpine` resolved `runtimes/linux-musl-x64/native/ocx` (RID reported `linux-musl-x64`) and printed `0.6.5`.

### F10 API availability on the .NET 8 floor

| API | Since | Evidence |
|---|---|---|
| `System.Formats.Tar.TarReader/TarFile`, `File.SetUnixFileMode`, `FileStreamOptions.UnixCreateMode`, `Directory.CreateDirectory(string, UnixFileMode)`, `FileSystemInfo.UnixFileMode`, `SHA256.HashDataAsync(Stream)` | .NET 7 | `api8` fixture builds and runs on 8.0.31 |
| `FileSystemInfo.LinkTarget`, `Convert.FromHexString`, `CryptographicOperations.FixedTimeEquals` | .NET 6 / Core 3.0 | same |
| `[GeneratedRegex]`, `SocketsHttpHandler.PooledConnectionLifetime`, `SslClientAuthenticationOptions.CertificateChainPolicy` | .NET 7 / Core 2.1 / builds on 8 | `api8`, `http-net8` |
| `Convert.ToHexStringLower` | **.NET 9** | CS0117 on net8 |
| `OSArchitecture` correct under emulation | .NET 7 | breaking-change doc |
| `TarExtractOptions`, `ZipExtractionOptions`, tar checksum `InvalidDataException` | **.NET 11** | TarFile/ZipFile docs (RC1) |

### F11 Verified on the toolchain

Root: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-packaging-ocx-binary-acquisition/`. Build/run through `/home/mherwig/.cache/research-lang/dotnet-tools/run.sh` (SDK 10.0.401 via parent `global.json`; `tar-net8`, `digest-net8`, `http-net8`, `api8` pin 8.0.425; `digest-net11` pins `11.0.100-rc.1.26425.128`). Local files only for the experiments; the live manifest and the 8 release archives were read from the network once into `live/` and all digests matched. `./run-all.sh` replays everything.

| # | Fixture | Command | Red (observed) | Green (observed) |
|---|---|---|---|---|
| 1 | `tar/` tar extraction | `cd tar && ../../run.sh dotnet build -c Release -o bin && ../../run.sh dotnet bin/tar.dll red` (then `green`; `tar-net8/bin/tar8.dll` for 8.0) | `[red] E decompression bomb 300 MiB of zeros ACCEPTED ... ocx.len=314572800`; `[red] F destination is a pre-existing symlink ACCEPTED outside-dest=attacker-dir/ocx`; `[red] A ../evil REJECTED IOException ... in-dest=[dest-A/ocx]` | `[green] E ... REJECTED InvalidDataException`; `[green] F ... REJECTED IOException`; `[green] A ... REJECTED InvalidDataException ... in-dest=[]`; same on net8.0.31 |
| 2 | `digest/` | `dotnet bin/digest.dll red ../live` (then `green`) | `20 single-bit flips -> accepted=19 (of which different bytes than the release=19), runtime-exception=1, digest-rejected=0` (zip, net10 and net8); `repacked valid tar.gz ... ACCEPTED sha(bin)=cebf25e06683`; `pristine archive digest compare -> FALSE MISMATCH (correct archive refused)` | `accepted=0 ... digest-rejected=20`; `repacked ... REJECTED ChecksumMismatch`; `pristine ... MATCH`. net11 RC1 red: `accepted=6 ... runtime-exception=14` |
| 3 | `rid/` RID table | `dotnet bin/rid.dll red` / `green` (also run on the Windows host, SDK 10.0.102: 20/20, `selected=x86_64-pc-windows-msvc`) | `[red] 16/20 rows pass`; FAIL rows: Windows os=Arm64 proc=X64 -> `x86_64-pc-windows-msvc`, os=Arm64 proc=X86 -> UNSUPPORTED, os=X64 proc=X86 -> UNSUPPORTED, macOS os=Arm64 proc=X64 -> `x86_64-apple-darwin`; process exit code 1 | `[green] 20/20 rows pass`, exit 0; host: `OSArchitecture=X64 ... RuntimeIdentifier=linux-x64`, `selected=x86_64-unknown-linux-musl` |
| 4 | `consumer/` exec bit in Alpine | `docker run --rm -v "$PWD/bin:/app" mcr.microsoft.com/dotnet/runtime:10.0-alpine dotnet /app/consumer.dll red` after `chmod 644 bin/runtimes/linux-musl-x64/native/ocx` | `START FAILED Win32Exception: An error occurred trying to start process '/app/runtimes/linux-musl-x64/native/ocx' ... Permission denied` | `mode before = 644 / mode after = 744 / ocx version -> '0.6.5' exit=0`; unmodified NuGet output (0744) also ran: `RuntimeIdentifier=linux-musl-x64 ... ocx version -> '0.6.5'` |
| 5 | `pack/` vs `pack-musl-only/` | `dotnet pack` then `dotnet publish -r linux-x64 --self-contained false -p:UseAppHost=false` in `consumer-musl/` | musl-only package, `-r linux-x64`: `(no ocx in output)`; glob `PackagePath` produced `runtimes/linux-arm64/native/linux-arm64/ocx` | full package `-r linux-x64`: `ocx 25.3M` in app root; explicit items: `runtimes/linux-musl-x64/native/ocx` |
| 6 | `pack/feed` content check | `unzip -Z1 $p \| rg -q -e '^runtimes/[^/]+/native/' -e '(^\|/)ocx(\.exe)?$'` | `FAIL Ocx.Native.Fixture.0.6.5.nupkg ships an ocx binary` (91,600,345 bytes) | `PASS Ocx.Managed.Fixture.0.1.0.nupkg` (3,269 bytes) |
| 7 | `redirect/` | `dotnet bin/redirect.dll red` / `green` | `final=200 headers that reached the redirect target B: X-Ocx-Token: SECRET` | `... reached the redirect target B: none` |
| 8 | `http/` | `dotnet bin/http.dll red` / `green` (`http-net8` green too) | `default HttpClient sends User-Agent=[]`; `Timeout=1s, body stalled: read finished after 4.0s with 1 byte(s)` | `with explicit UA sends User-Agent=[ocx-sdk-dotnet/0.1.0]`; `aborted after 1.0s with TaskCanceledException` |
| 9 | `gate/` analyzers | `dotnet build -p:Variant=Bad -o bin/Bad` / `-p:Variant=Good` (BannedApiAnalyzers 5.6.0, `.editorconfig` severities = error) | Bad: `7 Error(s)`: RS0030 x5 (TarFile, ZipFile, GetByteArrayAsync, RuntimeIdentifier, DangerousAcceptAnyServerCertificateValidator), CA1416 `File.SetUnixFileMode`, CA5350 `SHA1`. Legacy: SYSLIB0014 x3 + CA5359 `(_,_,_,_) => true`. `BannedSymbols.noparams.txt` (no parameter lists): the TarFile/ZipFile/GetByteArrayAsync lines matched nothing (4 errors total instead of 7) | Good: `0 Error(s)` |
| 10 | `lint/` rg rules G1-G11 | `./check.sh bad` / `./check.sh good` | all 11 `FAIL`, exit 1 (G4 initially missed the `new("^...$")` form; fixed pattern is the one listed below) | all 11 `PASS`, exit 0 |
| 11 | `regex/` | `dotnet bin/regex.dll ../pack/native/linux-musl-x64/ocx` | `^[0-9a-f]{64}$ on 64 hex + trailing LF -> True` | `\A[0-9a-f]{64}\z on 64 hex + trailing LF -> False`; clean value `True`; SHA256 of 25.4 MiB: 12.6 ms |
| 12 | `replace/` | `dotnet bin/replace.dll /usr/bin/sleep 30` (Linux); `dotnet replace\replace.dll C:\Windows\System32\ping.exe -n 30 127.0.0.1` (Windows via `cmd.exe /c` from a `C:` cwd) | Linux open-for-write: `IOException: Text file busy`; Windows open-for-write `IOException ... being used by another process` and rename-over `UnauthorizedAccessException: Access to the path is denied` | Linux rename-over a running binary: `OK` |
| 13 | `cwd/` | in a dir containing an executable `ocx`: `dotnet bin/cwd.dll` (red) vs `dotnet bin/cwd.dll <absolute path>` (green) | Linux `started 'ocx': ... stdout='trap'`; Windows (cwd `ocx.exe` = `whoami.exe`) `started 'ocx': exit=1 stdout=''` | Linux `stdout='0.6.5'`; Windows `exit=0 stdout='0.6.3'` |
| 14 | `digest-net8/` API floor | `dotnet build` with `Convert.ToHexStringLower` | `error CS0117: 'Convert' does not contain a definition for 'ToHexStringLower'` | `Convert.ToHexString(x).ToLowerInvariant()` builds, 0 errors |

Not run: macOS (no host), Windows ARM64 (no host; covered by the pure-function table and the documented `IsWow64Process2` behaviour), `linux-arm64` execution.

## Normative guidance candidates

1. **Deliver ocx by locate-then-bootstrap; do not embed ocx binaries in the SDK nupkg by default.** Rationale: 91.6 MB per release, 202 MB extracted per restore, and RID-specific publish drops non-matching RIDs silently. Verify: `dotnet pack -c Release -o artifacts/pkg src/Ocx.Sdk && for p in artifacts/pkg/*.nupkg; do unzip -Z1 "$p" | rg -q -e '^runtimes/[^/]+/native/' -e '(^|/)ocx(\.exe)?$' && { echo "FAIL $p"; exit 1; }; done` (red on `Ocx.Native.Fixture`, green on `Ocx.Managed.Fixture`); and `test "$(stat -c %s artifacts/pkg/*.nupkg | sort -n | tail -1)" -lt 5242880`.
2. **Discovery order is explicit path, `OCX_SDK_EXE`, PATH, `$OCX_HOME` symlink; resolve once to an absolute path and hand `ProcessStartInfo` only that path.** Rationale: bare names run `./ocx` first on Linux and Windows. Verify: `rg -n 'new ProcessStartInfo\(\s*"' src/` and `rg -n 'Process\.Start\(\s*"' src/` return nothing; one unit test per tier asserting the returned path is rooted (`Path.IsPathRooted`).
3. **Read the user home from `Environment.GetFolderPath(SpecialFolder.UserProfile)` (and `OCX_HOME`), not `HOME` alone.** Rationale: `HOME` is normally unset on Windows. Verify: `rg -n 'GetEnvironmentVariable\("HOME"\)' src/` returns nothing; test on a Windows leg that clears `OCX_HOME` and finds `%USERPROFILE%\.ocx\symlinks\...\ocx.exe`.
4. **Select the target with `RuntimeInformation.OSArchitecture` only; `ProcessArchitecture` and `Environment.Is64Bit*` may appear only in a file named `Diagnostics*.cs`.** Rationale: process view picks x64 on emulated ARM hosts and rejects 32-bit hosts on 64-bit OSes. Verify: `rg -n -e 'RuntimeInformation\.ProcessArchitecture' -e 'Environment\.Is64Bit(OperatingSystem|Process)' --glob '!**/Diagnostics*.cs' src/` returns nothing (lint G1, red/green).
5. **Keep the RID to triple mapping a pure function `(Host, Architecture osArch, Libc) -> string` with a table test of at least the 20 rows in F11.3, run on Linux, Windows and macOS legs, x64 and arm64.** Rationale: host mocking is unnecessary and Python's CI never ran arm64. Verify: `dotnet test` includes `ArchitectureTableTests`; `rg -c 'InlineData|MemberData' tests/**/TargetSelection*Tests.cs` shows >= 20 rows (use `rg -c ... tests/` with a directory operand); CI matrix lists `ubuntu-24.04-arm` and `windows-11-arm` (`rg -n -e 'ubuntu-24.04-arm' -e 'windows-11-arm' .github/workflows/`).
6. **Never parse `RuntimeInformation.RuntimeIdentifier` and never probe for Alpine/musl (`ldd`, `/etc/alpine-release`, `ld-musl`).** Rationale: opaque since .NET 8; the default Linux build is the static musl one. Verify: RS0030 `P:System.Runtime.InteropServices.RuntimeInformation.RuntimeIdentifier` at error severity (red `error RS0030` in `gate/Bad`), and `rg -n -e 'RuntimeIdentifier\b' -e '\bldd\b' -e 'alpine-release' -e 'ld-musl' src/` returns nothing (lint G2).
7. **Linux defaults to `*-unknown-linux-musl`; `*-gnu` only when the caller opts in explicitly.** Rationale: static, one code path, no GLIBC version failures; verified running on glibc and Alpine. Verify: table-test rows `Linux x64 Musl -> x86_64-unknown-linux-musl` and `Linux x64 Gnu -> x86_64-unknown-linux-gnu`; reading heuristic: the default value of the libc option is `Musl`.
8. **Unsupported hosts throw `PlatformNotSupportedException` naming OS and architecture and telling the caller to pass an explicit executable path; never fall back to another architecture.** Rationale: ocx ships no win-x86, linux-arm, riscv64, s390x, loongarch64, FreeBSD. Verify: the 8 `UNSUPPORTED` rows of the table test; `rg -n 'default:\s*return' src/Bootstrap/` returns nothing for the selector.
9. **Hash the complete downloaded archive with SHA-256 against the validated manifest row before opening it as an archive.** Rationale: `ZipArchive` accepted 19/20 corrupted real archives on .NET 8 and 10; a repacked valid tar.gz passes every format check. Verify: a test that flips one byte in a fixture archive and asserts `ChecksumMismatchException` and that no file exists under the cache after the failure; `rg -n -B3 'new ZipArchive\(|new TarReader\(' src/Bootstrap/` shows a `FixedTimeEquals` call earlier in the same method (reading heuristic).
10. **Compare digests as bytes with `CryptographicOperations.FixedTimeEquals(hash, Convert.FromHexString(expected))` after validating `expected` against `\A[0-9a-f]{64}\z`; never compare hex strings with `==`.** Rationale: `Convert.ToHexString` is uppercase, the manifest lowercase. Verify: `rg -n -e 'ToHexString\([^;]*\)\s*(==|!=)' -e '(==|!=)\s*Convert\.ToHexString' src/` returns nothing (lint G3); the net8 leg of the build matrix fails on `ToHexStringLower` (CS0117).
11. **Anchor every validation regex with `\A` and `\z`, never `^`/`$`; test `..` separately.** Rationale: `$` accepts a trailing `\n`, and `..` matches `[A-Za-z0-9._+-]+`. Verify: `rg -n -e '@?"\^[^"]*\$"' src/` returns nothing (lint G4); a test feeds `<64 hex>\n` and `..` and expects `DistManifestException`.
12. **Parse `dist.json` with `System.Text.Json`, require integer `schema == 1`, cap the body at 1 MiB, ignore unknown keys, and fail the whole manifest on one invalid row.** Rationale: the manifest picks the bytes that get executed. Verify: tests with `schema: 2`, `schema: "1"`, a row with `filename: "../x"`, and a 1 MiB + 1 body (each throws); `rg -n 'MaxManifestBytes|1 << 20|1048576' src/Bootstrap/` finds the cap.
13. **Require an explicit manifest digest (or a `dist/<sha256>.json` URL) for any manifest host other than `setup.ocx.sh` and whenever a mirror is configured; fail before any network I/O.** Rationale: TLS proves reachability, not authenticity (CWE-345). Verify: unit tests `OffCanonicalHostWithoutDigest_Throws`, `MirrorWithoutDigest_Throws` asserting zero requests reached the fake handler.
14. **Never run a downloaded installer script and never shell out to `chmod`.** Rationale: Pulumi's `install.sh` flow has no digest and is code execution on a network response. Verify: `rg -n -i -e 'install\.(sh|ps1)' -e 'ExecutionPolicy' -e '"chmod"' -e 'curl ' -e 'Invoke-WebRequest' src/` returns nothing (lint G5).
15. **Do not call `TarFile.ExtractToDirectory`, `ZipFile.ExtractToDirectory` or `ZipFileExtensions.ExtractToDirectory` on release archives; extract exactly one named regular-file member with `TarReader`/`ZipArchive`.** Rationale: no size/entry cap, follows symlinked destinations, leaves earlier members behind. Verify: BannedApiAnalyzers with `<AdditionalFiles Include="BannedSymbols.txt" />` and `dotnet_diagnostic.RS0030.severity = error`; each `M:` line must carry the full parameter list (a parameterless `M:` line matched nothing); required lines: `M:System.Formats.Tar.TarFile.ExtractToDirectory(System.IO.Stream,System.String,System.Boolean)`, `...(System.String,System.String,System.Boolean)`, `M:System.IO.Compression.ZipFile.ExtractToDirectory(System.String,System.String)` plus the three other `ZipFile`/`ZipFileExtensions` overloads (see `gate/BannedSymbols.txt`). Check the ban list is live: `dotnet build gate -p:Variant=Bad` must exit non-zero with RS0030.
16. **Cap sizes while streaming: manifest 1 MiB, archive 256 MiB, extracted member 256 MiB; compare bytes read, not `Content-Length`.** Rationale: bomb of 300 MiB accepted by the stock extractor. Verify: RS0030 on `HttpClient.GetByteArrayAsync/GetStringAsync(String|Uri)` and `HttpContent.ReadAsByteArrayAsync/ReadAsStringAsync`; `rg -n -e 'GetByteArrayAsync|GetStringAsync|ReadAsByteArrayAsync|ReadAsStringAsync' src/` returns nothing (lint G11); a bomb-fixture test expects `InvalidDataException`.
17. **Reject archive members that are absolute, contain `..` segments or backslashes, are links, devices, FIFOs or directories where the binary belongs, or appear twice; use the member only by base-name match and never write an archive name to disk.** Rationale: F7 cases A-C, G. Verify: parametrised test over the 7 cases in F7; reading heuristic: no `Path.Combine(dest, entry.Name)` in `src/Bootstrap/` (`rg -n 'Path\.Combine\([^)]*\.(Name|FullName)\)' src/Bootstrap/` returns nothing).
18. **Write to a `FileMode.CreateNew` temp file in the target directory with `UnixCreateMode = UserRead | UserWrite`, `File.SetUnixFileMode(tmp, 0700)` behind `!OperatingSystem.IsWindows()`, then `File.Move(tmp, final, overwrite: true)`; never write into the final path.** Rationale: ETXTBSY / sharing violation on running binaries. Verify: `rg -n -e 'File\.(WriteAllBytes|Copy|WriteAllText)\(' -e 'FileMode\.(Create|OpenOrCreate|Truncate)\b' src/Bootstrap/` returns nothing (lint G9); `dotnet build -warnaserror:CA1416` passes (CA1416 error in `gate/Bad`, clean in `gate/Good`).
19. **Install into `<cache>/<ocx version>/<triple>/` and never overwrite an existing, digest-verified binary; record a sidecar `ocx.sha256` of the extracted binary and re-hash on cache hits unless the caller opts out.** Rationale: Windows cannot replace a running exe; 12.6 ms re-hash. Verify: test that installs twice and asserts the second call performs zero downloads and leaves the file's `LastWriteTimeUtc` unchanged; test that corrupts the cached binary and asserts a re-download.
20. **Create cache directories level by level with `Directory.CreateDirectory(path, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute)`; refuse a root or level where `DirectoryInfo.LinkTarget is not null`, and refuse a root with group/other write.** Rationale: the mode applies to the leaf only; symlinked roots redirect writes (CWE-59, CWE-732). Verify: `rg -n 'Directory\.CreateDirectory\([^,()]*\)' src/Bootstrap/` returns nothing (lint G10); tests with a symlinked root and a `chmod 777` root (POSIX-only, skipped on Windows with a reason).
21. **Do not check ancestors of the cache root for links; document that ownership is not verified unless the SDK adds a P/Invoke.** Rationale: `/home -> /var/home` is legitimate; no managed owner accessor exists. Verify: reading heuristic on the cache-root check (loop over `Parent` is a defect); the XML doc of the bootstrap type states the ownership limitation.
22. **Use exactly one long-lived `HttpClient` over `SocketsHttpHandler` with `PooledConnectionLifetime` set; never construct a client per request.** Rationale: socket exhaustion and DNS staleness ([guidelines](https://learn.microsoft.com/en-us/dotnet/fundamentals/networking/http/httpclient-guidelines)). Verify: `test "$(rg -c 'new HttpClient\(' src/ | awk -F: '{s+=$2} END {print s+0}')" -le 1` (lint G6); `rg -n 'PooledConnectionLifetime' src/` finds it.
23. **Set `User-Agent: ocx-sdk-dotnet/<version>` on every request.** Rationale: default is empty; the dist host identifies SDK versions. Verify: handler test asserting the header on the fake transport; `rg -n 'UserAgent' src/Bootstrap/` finds it.
24. **Bound each download attempt with a `CancellationTokenSource(perAttemptBudget)` linked to the caller's token; `HttpClient.Timeout` alone is not enough.** Rationale: a stalled body ran 4.0 s under `Timeout = 1 s`. Verify: stalled-server test expecting `OperationCanceledException` within budget + 1 s; `rg -n 'ResponseHeadersRead' src/Bootstrap/` appears together with a `CancellationToken` argument in the same call (reading heuristic).
25. **Follow redirects manually: `AllowAutoRedirect = false`, at most 5 hops, https only, no userinfo, credentials attached only when scheme+host+port equal the origin they were issued for; secrets never go in `DefaultRequestHeaders` or custom headers on an auto-redirecting client.** Rationale: custom headers cross origins (measured). Verify: `rg -n -e 'AllowAutoRedirect\s*=\s*false' -e 'MaxAutomaticRedirections\s*=\s*[1-5]\b' src/` matches and `rg -n 'DefaultRequestHeaders\.(Add|TryAddWithoutValidation|Authorization)' src/` does not (lint G7, G8); redirect-leak test as in `redirect/`.
26. **Never disable certificate validation; a custom CA replaces trust via `X509ChainPolicy` with `CustomRootTrust`.** Rationale: Python's `ca_bundle` semantics; TLS is the only authenticity for the manifest. Verify: RS0030 on `HttpClientHandler.DangerousAcceptAnyServerCertificateValidator`, CA5359 at error (red on `(_,_,_,_) => true`), `rg -n -e 'CertificateCustomValidationCallback' -e 'RemoteCertificateValidationCallback' src/` returns nothing outside the CA-bundle file.
27. **Do not use `WebClient`, `WebRequest`, `HttpWebRequest` or `ServicePointManager`.** Rationale: obsolete since .NET 6 (SYSLIB0014), .NET Framework-era idioms. Verify: `dotnet_diagnostic.SYSLIB0014.severity = error` in `.editorconfig` (3 errors on `gate/Legacy`, 0 on `gate/Good`).
28. **Honour the proxy environment through `HttpClient.DefaultProxy` only; add no SDK-specific proxy variables.** Rationale: documented `HTTP_PROXY`/`HTTPS_PROXY`/`ALL_PROXY`/`NO_PROXY` handling on all OSes. Verify: `rg -n -e 'WebProxy\(' -e 'UseProxy\s*=' src/` returns nothing unless a documented option wraps it.
29. **Retry only transport-class failures (resets, timeouts, truncated bodies, 429, 5xx); never 401/403/404, never a size-cap abort, never a checksum mismatch; discard the partial file at the start of each attempt.** Rationale: wrong bytes are not late bytes. Verify: classifier unit tests (one per status class); `rg -n 'ChecksumMismatch' src/Bootstrap/Retry*.cs` shows it in the non-retryable branch.
30. **Target the .NET 8 floor with APIs available there; use `Convert.ToHexString(x).ToLowerInvariant()` only for display, never for comparison.** Rationale: `Convert.ToHexStringLower` is .NET 9+. Verify: build and test the `net8.0` target in CI (`dotnet build -f net8.0 -warnaserror`); the fixture `digest-net8` is the red case (CS0117).

## AI-agent angle

What an LLM characteristically gets wrong here, and the smallest mechanical check:

| Characteristic error | Why it compiles or passes tests | Smallest check |
|---|---|---|
| `RuntimeInformation.ProcessArchitecture` (or `Environment.Is64BitOperatingSystem`) to pick the binary | works on every CI runner (no emulation) | lint G1; table row `Windows Arm64/X64 -> aarch64` |
| Parses `RuntimeInformation.RuntimeIdentifier` (`StartsWith("linux-musl")`, `Split('-')`) or sniffs `/etc/alpine-release` | true on Alpine in a smoke test; RID is opaque since .NET 8 | RS0030 on the property; lint G2 |
| `Convert.ToHexString(hash) == expected` | the compare is plausible; fails closed on every genuine archive in production | lint G3; a test with the real manifest value |
| Invents `Convert.ToHexStringLower` (exists only on .NET 9+) | builds on the SDK 10 developer machine | `dotnet build -f net8.0` leg (CS0117) |
| `^[0-9a-f]{64}$` as the validator | passes all happy-path tests; accepts `...\n` | lint G4; trailing-LF test |
| `TarFile.ExtractToDirectory(stream, dir, true)` / `ZipFile.ExtractToDirectory` "because .NET guards `../`" | the traversal guard is real (IOException), so a traversal test is green; the bomb, symlinked destination and partial-extract cases are not guarded | RS0030 with full parameter lists; bomb and symlink-destination tests |
| Banned-symbol file written as `M:System.Formats.Tar.TarFile.ExtractToDirectory;msg` (no parameter list) | the analyzer is installed and silent | `dotnet build gate -p:Variant=Bad` must fail; keep that canary |
| `new HttpClient()` per call, `using var`, default 100 s timeout, no User-Agent | works in a demo; the body stall is unbounded by `Timeout` | lint G6; stalled-server test |
| `client.DefaultRequestHeaders.Add("X-Token", ...)` on a default (auto-redirecting) client | typed `Authorization` is stripped on redirect, so a quick test with `Authorization` passes | lint G7; the redirect-leak test |
| `ServicePointManager.ServerCertificateValidationCallback = ...` or `WebClient.DownloadFile` ("it worked in .NET Framework") | compiles with warnings | SYSLIB0014 and CA5359 at error |
| `Process.Start("chmod", "+x ...")` or unguarded `File.SetUnixFileMode` | works on Linux CI | lint G5; CA1416 at error |
| `Process.Start("ocx")` after "checking PATH" | works unless a hostile or stale `./ocx` exists | rg on bare-name `ProcessStartInfo`; rooted-path assertion |
| `File.WriteAllBytes(finalPath, bytes)` then chmod | passes first install; second concurrent run hits ETXTBSY or a sharing violation | lint G9; install-twice test while the first binary runs |
| `Directory.CreateDirectory(path)` for the cache | world-readable per umask; `Directory.CreateDirectory(path, mode)` only fixes the leaf | lint G10; test asserting every created level is `0700` |
| Ships all 8 binaries under `runtimes/*/native` and calls it done | `dotnet run` on the dev machine finds one; `-r linux-x64` publish flattens, musl-only vanishes | pack-content check (rule 1); a publish test for `-r linux-x64`, `-r linux-musl-x64`, `-r win-x64` |
| `PackagePath="runtimes/%(RecursiveDir)native/"` for extensionless binaries | pack succeeds with a doubled RID path | `unzip -Z1 pkg.nupkg \| rg '^runtimes/[^/]+/native/[^/]+$'` count equals RID count |
| Runs the vendor's `curl ... \| sh` installer from C# | "mirrors what the docs say" (Pulumi did exactly this) | lint G5 |
| Treats `HttpClient.Timeout` as the whole-download deadline | true for buffered reads, false for streamed ones | stalled-server test |

## Contested / evolving

- **Delivery model.** Python chose bootstrap-at-runtime; Aspire chose per-RID packages; most CLI-wrapper SDKs locate only. Trend as of 2026-10: runtime download with pinned digests for tools that release independently of the SDK, per-RID packages for tools versioned with the SDK. The owner's call; the measured costs above are the inputs. Revisit if ocx publishes a NuGet or OCI-hosted payload (the ocx image on GHCR exists, not evaluated here).
- **Signature verification.** None exists in the Python reference or the dist manifest; sigstore verification is an upstream open item (digest S14). A C# SDK should reserve an `IArtifactVerifier` seam only when upstream defines the format; until then the digest is the trust boundary.
- **Windows ARM64 x64-under-emulation choice** (native vs emulated build): native chosen; both work. Re-check when a Windows ARM64 CI leg exists.
- **ZipArchive CRC32.** .NET 8/10: no read-time verification (measured). .NET 11 RC1: partial verification (14/20 flips caught). Direction: .NET 11 is adding checks and `TarExtractOptions`/`ZipExtractionOptions`; do not depend on them on the net8 floor, and re-measure at GA (Nov 2026).
- **musl everywhere on Linux** is the Python SDK's default and the measured-safe choice; the NSS/resolver difference of static musl is unmeasured here.
- **Ownership check of the cache root** is not expressible in managed .NET 8/10; if the SDK wants parity with Python it must P/Invoke or accept the gap. No .NET API proposal was found in this pass.
- **Manifest size drift**: Python's comment says ~60 KiB, measured 86.2 KB today (88,245 bytes in the audit); the 1 MiB cap has headroom for roughly 12x growth.
- **ocx contract is unreleased**: the machine-interface contract lives in unreleased `main` (`ocx-cli-contract.md` §0); bootstrap downloads today's 0.6.5, so any contract-version gate belongs in the client, not in this module.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://learn.microsoft.com/en-us/dotnet/api/system.formats.tar.tarfile.extracttodirectory?view=net-10.0 | TarFile.ExtractToDirectory API docs | updated 2026-05 | Documents the traversal guard, link-following, and "doesn't limit total extracted size" |
| https://learn.microsoft.com/en-us/dotnet/api/system.io.compression.zipfile.extracttodirectory?view=net-10.0 | ZipFile.ExtractToDirectory API docs | updated 2026-09 | Partial extraction on error, symlink destination followed, .NET 11 `ZipExtractionOptions` |
| https://learn.microsoft.com/en-us/dotnet/api/system.io.file.setunixfilemode?view=net-10.0 | File.SetUnixFileMode API docs | updated 2026-08 | `UnsupportedOSPlatform("windows")`, .NET 7+ |
| https://learn.microsoft.com/en-us/dotnet/api/system.runtime.interopservices.runtimeinformation.osarchitecture?view=net-10.0 | OSArchitecture docs | updated 2026-05 | Emulation semantics; QEMU not accounted |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/interop/7.0/osarchitecture-emulation | .NET 7 breaking change | 2022-09 | Why OSArchitecture is the right selector and Rosetta needs no probe |
| https://learn.microsoft.com/en-us/dotnet/core/rid-catalog | RID catalog | updated 2026-06 | Portable RIDs, `linux-musl-*`, "don't parse RIDs" |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/core-libraries/8.0/runtimeidentifier | .NET 8 RuntimeIdentifier change | .NET 8 | RuntimeIdentifier is the runtime's build RID, opaque |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/8.0/rid-graph | .NET 8 smaller RID graph | 2024-04 | Portable RIDs only; `UseRidGraph` escape hatch |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/networking/http/httpclient-guidelines | HttpClient guidelines | updated 2026-08 | Single client + `PooledConnectionLifetime` |
| https://learn.microsoft.com/en-us/dotnet/api/system.net.http.httpclient.defaultproxy?view=net-10.0 | HttpClient.DefaultProxy docs | updated 2026-07 | Exact proxy env-var semantics per OS |
| https://learn.microsoft.com/en-us/dotnet/standard/security/cross-platform-cryptography | Cross-platform cryptography | updated 2026-08 | `SSL_CERT_FILE`/`SSL_CERT_DIR` on Linux (large page, only the X.509 section matters) |
| https://learn.microsoft.com/en-us/nuget/create-packages/native-files-in-net-packages | NuGet: native files in .NET packages | updated 2025-10 | Asset selection, RID flattening, per-RID layout examples |
| https://learn.microsoft.com/en-us/nuget/reference/msbuild-targets | NuGet pack/restore MSBuild targets | updated 2026-07 | `PackagePath` rules; extensionless files treated as directories |
| https://learn.microsoft.com/en-us/nuget/create-packages/supporting-multiple-target-frameworks | NuGet multi-targeting / architecture-specific folders | 2019, updated 2025-10 | `runtimes/{platform}-{architecture}/native` definition |
| https://learn.microsoft.com/en-us/nuget/nuget-org/publish-a-package | nuget.org publishing | updated 2026-06 | "about 250 MB" package size limit and 413 behaviour |
| https://github.com/NuGet/Home/issues/7673 | NuGet execute-bit and umask issue | 2019 (CVE-2019-0757 fix) | NuGet 4.3 sets the exec bit; extraction permissions history |
| https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/System.Net.Http/src/System/Net/Http/SocketsHttpHandler/RedirectHandler.cs | SocketsHttpHandler redirect logic | .NET 10.0.0 | Lines 38-48, 53, 133-139: hop cap behaviour, Authorization strip, https to http block |
| https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/System.Private.CoreLib/src/System/Runtime/InteropServices/RuntimeInformation.Windows.cs | OSArchitecture on Windows | .NET 10.0.0 | `IsWow64Process2` native-machine mapping |
| https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/System.Private.CoreLib/src/System/Runtime/InteropServices/RuntimeInformation.Unix.cs | OSArchitecture on Unix | .NET 10.0.0 | OS query with ProcessArchitecture fallback |
| https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/System.IO.Compression/src/System/IO/Compression/ZipArchiveEntry.cs | ZipArchiveEntry | .NET 10.0.0 | CRC is stored/written; no read-side verification in this file |
| https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/System.Formats.Tar/src/System/Formats/Tar/TarEntry.Unix.cs | Tar extraction Unix helpers | .NET 10.0.0 | Device/FIFO/hardlink extraction paths |
| https://setup.ocx.sh/dist.json | Live ocx dist manifest | fetched 2026-10-10, 86.2 KB, schema 1, latest 0.6.5 | Ground truth for the 8 targets, filenames, digests |
| https://github.com/ocx-sh/ocx/releases/download/v0.6.5/ocx-x86_64-unknown-linux-musl.tar.gz (and the 7 sibling assets) | ocx 0.6.5 release archives | 2026-10-07 build | Real archive layout (top dir vs flat zip), sizes, static-pie musl build |
| /home/mherwig/dev/ocx-sdk-python/src/ocx_sdk/_dist.py (`ocx-sdk-python@80136dde4162`) | Python reference: manifest validation, transport | 2026 | Caps, pin rule, origin-bound credentials, regex validation |
| /home/mherwig/dev/ocx-sdk-python/src/ocx_sdk/_bootstrap.py | Python reference: discovery, triple mapping, install | 2026 | `uname_to_triple`, `_verify_root`, `_extract_member`, atomic publish |
| `pulumi__pulumi-dotnet@2a0dca84f09b:sdk/Pulumi.Automation/Commands/LocalPulumiCommand.cs` | Pulumi CLI installer | exemplar clone | The no-digest installer-script anti-pattern |
| `dotnet__aspire@af646baee1e8:Directory.Build.props, eng/Versions.props, src/Aspire.Hosting/Dcp/DcpOptions.cs, DcpHost.cs` | Aspire DCP per-RID packages | exemplar clone | The per-RID package pattern and its build-host selection |
| `Tyrrrz__CliWrap@7dbc252fa773:CliWrap/Native/WindowsSignaler.cs` | Embedded helper exe extracted to temp | exemplar clone | Third delivery model (embedded resource) |
| `nuke-build__nuke@27e8077b8ab0:source/Nuke.Tooling/ToolTasks.ToolPath.cs` | `<TOOL>_EXE` override then PATH | exemplar clone | Proven locate ladder |
| `cake-build__cake@08885933e936:src/Cake.NuGet/NuGetContentResolver.cs` | RID resolution for NuGet-installed tools | exemplar clone | Use of `RuntimeInformation.RuntimeIdentifier` with an embedded portable graph |
| /home/mherwig/dev/grimoire-lore/.agents/worktrees/csharp/.agents/research/csharp-audit/python-sdk-digest.md and ocx-cli-contract.md | Prior audits (digest §5, contract §0/§6) | 2026-10-10 | Discovery order, mapping, S7/S14 findings, unreleased-contract status |
| /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-packaging-ocx-binary-acquisition/ | This subtopic's fixtures and logs | 2026-10-10 | Every red/green result quoted above; `run-all.sh` reproduces them |
