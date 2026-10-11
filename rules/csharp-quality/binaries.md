---
# Read on demand through the index. This glob matches no file, so a client never auto-loads the file.
paths:
  - "**/.csharp-quality-depth-on-demand"
title: Native Binary Acquisition and Verification
summary: The CS-BIN family, owning how a library resolves, selects, downloads, verifies, installs and caches a native binary it launches, the compiled-in SHA-256 pin and the refresh gate for it, the fail-hard rule and the trust boundary a README must state
---

# Native Binary Acquisition and Verification

Binds to .NET SDK 10.0.401 on net8.0 and net10.0, Linux x64, jq 1.8.1 and ripgrep, measured 2026-10-11. Rows that name Windows were
measured on SDK 10.0.102 and say so. macOS and arm64 rows are `unverified: read only`.

Owns acquiring, verifying, installing and caching the native binary a library launches: where it is found, which build is chosen,
how the download is fetched, checked and written, and what the library tells its callers about trust. Not owned here: the resolver
order, argv, streams, kill protocol and environment scrub are `CS-PROC`, the home directory is `CS-XP-04`, the one byte-authentication
helper is `CS-SEC-08`, the fake-CLI tier is `CS-TEST-01`, and every ban line lives in the dotnet-build checks directory (rows below
cite the file and quote the symbol only). `ocx`, `OCX_BINARY_PIN`, `OCX_NO_VERIFY`, `setup.ocx.sh`, `dist.json`, `ocx-pins.json`,
`TrustManifestOrigin`, `Bootstrap` and the README phrase `signed by ocx` are example names from the reference consumer: rename them once, and every command below
keeps working on the new names. Verification is a compiled-in SHA-256 pin, never a signature (the example tool, ocx 0.6.5, publishes
none, read 2026-10-11). Every row binds a `[cli-wrapper]` repository. A row led by `[downloads-binary]` binds only a library that fetches
the binary (it resolves a manifest and downloads an archive); `CS-BIN-01`, `CS-BIN-02`, `CS-BIN-24`, `CS-BIN-25` and `CS-BIN-26`
carry no tag and bind a locate-only library too (the pin sentences of `CS-BIN-26` lead with `[json-cli]`). A client library that downloads nothing owes this family only those five: the
cells of `CS-BIN-11`, `-14` and `-15` printed 82, 80 and 35 hits on such a tree (refit, 2026-10-11). A library
that downloads owes every row, and its acquisition failures (a missing caller digest, a pin or checksum mismatch, a size cap) throw the one
sixth leaf `CS-ERR-01` admits for a shipped download path (example name `OcxAcquireException`, a `Reason` per failure).

Contents: [Defaults](#defaults) · [Grep Gate](#grep-gate) · [Analyzer Canary](#analyzer-canary) · [Pin File Gate](#pin-file-gate) ·
[Behavioural Tests](#behavioural-tests) · [Retired](#retired) · [Not Covered](#not-covered) · [What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Defaults

- Defaults, the adopter may override each: locate first, download only on an explicit call; no binary in the package; one constant
  holds the tested tool version; caps are 1 MiB for the manifest, 256 MiB for the archive and 256 MiB for the extracted member; no
  signature verification at v1.
- Every grep below takes its operands from the environment and stops with `MISSING <name>` when one is unset, with no default. `SRC` is the shipped source
  directories and `INSTALL_DIR` the directories that hold the download, manifest-parsing and install code (example: `src/Bootstrap`; it may equal `SRC`): each is a space-separated list of
  repo-relative directories, written unquoted as `$SRC` and `$INSTALL_DIR` (the quoted `"${SRC:?MISSING SRC}"` made `rg` read `SRC="src tools"` as one directory and exit 2, markdig, 2026-10-11).
  `PINS` the pin file and `CANARY` the canary csproj are one path each. Every cell and block `G1` to `G4` runs this guard first, in the same shell (an unset operand expands to nothing and `rg` then reads the working directory):

  ```sh
  : "${SRC:?MISSING SRC}" "${INSTALL_DIR:?MISSING INSTALL_DIR}"
  case " $SRC $INSTALL_DIR " in *" /"*|*" "?:*) echo 'MISSING repo-relative SRC'; false ;; esac
  [ -n "$(rg --files $SRC $INSTALL_DIR -g '*.cs' -g '!**/{[Tt]est,[Tt]ests,*.[Tt]est,*.[Tt]ests,*Tests,*TestFixtures,*TestServices}/**' | head -1)" ] || echo 'MISSING scanned zero files'
  ```

  The cells of `CS-BIN-06`, `-08`, `-11` to `-15` and `-17` scan `INSTALL_DIR`, because the same patterns hit a compiler's regexes, an Azure SDK `GetAsync` and a
  typed client elsewhere in `SRC`. Each ends with `-g '*.cs'` and the shared test exclusion `-g '!**/{[Tt]est,[Tt]ests,*.[Tt]est,*.[Tt]ests,*Tests,*TestFixtures,*TestServices}/**'` (last, because a later glob wins;
  unexcluded, a test project multiplied hits 4 to 36 and 30 to 47 on two held-out trees; the path-segment keys leave a shipped `Foo.Testing` package in scope). An empty output is the pass unless the row
  says a hit is required; `rg` exit 2 (a directory operand that does not exist) is a failure, never a pass. A call written `Name (args)` is matched too (`\s*\(`).
- `dotnet build` here always carries `--no-incremental`: an incremental rebuild after an `AdditionalFiles` or variant change exited 0
  on a project that fails clean (measured 2026-10-11).

## Grep Gate

Each command is a site finder. A planted file made every one of them print (red) and its twin print nothing, or the one required
line (green), measured 2026-10-11 with ripgrep. A grep never stands in for the test a row names.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CS-BIN-01 | Start only the rooted path that `CS-PROC-03` returned: never a bare tool name and never `PATHEXT`. | .NET runs `./ocx` from the current directory before PATH on Linux and Windows (measured 2026-10-11, red then green on both), and PATHEXT resolution can land on a `.cmd`, which runs through `cmd.exe`. | No grep of its own: the `CS-PROC-03` grep (`new ProcessStartInfo("`, `PATHEXT`, a literal `FileName`) and the `CS-PROC-02` single-seam grep cover the literal forms. A variable holding an unrooted string passes both, so the `CS-PROC-03` per-tier unit test asserts `Path.IsPathRooted(result)`. | MUST |
| CS-BIN-02 | When the tool defines a re-entry pin variable (example: `OCX_BINARY_PIN`), set it in every spawned child's environment to the resolved path. | The tool's launchers re-enter through the pin, so a nested launch stays on one binary and one store; a child without it can pick another binary from PATH. | `rg -n -e '\["OCX_BINARY_PIN"\]\s*=[^=]' -e 'Add\s*\("OCX_BINARY_PIN"' $SRC -g '*.cs' -g '!**/{[Tt]est,[Tt]ests,*.[Tt]est,*.[Tt]ests,*Tests,*TestFixtures,*TestServices}/**'` prints the child-environment write; empty output means the pin is read but never propagated. A unit test on the fake spawner asserts the variable equals the resolved path. | MUST |
| CS-BIN-05 | [downloads-binary] On Linux select the build variant the tool ships and never probe the libc (`ldd`, `/etc/alpine-release`, `ld-musl`). The caller may opt into the other variant by name. Example: the static musl build for both architectures, the gnu build on opt-in. | The static musl build ran on glibc (Fedora) and on musl (Alpine) (measured 2026-10-11), so a probe adds failure modes without choosing a better binary. | `rg -n -e '\bldd\b' -e 'alpine-release' -e 'ld-musl' $SRC -g '*.cs' -g '!**/{[Tt]est,[Tt]ests,*.[Tt]est,*.[Tt]ests,*Tests,*TestFixtures,*TestServices}/**'` prints nothing (`RuntimeIdentifier` is the RS0030 ban of `CS-BIN-04`; `CS-XP-10` restates this rule and adds no check). | MUST |
| CS-BIN-06 | [downloads-binary] The install entry point with no version argument installs the compiled-in tested version: a null or absent version is never resolved through the release API's latest (`releases/latest`, a `GetLatest...Version` call). `latest` is used only when the caller asks for it by name. | The tool refuses a binary whose machine contract differs from the generated one, and a `latest` default drifts the day the tool releases (the reference consumer's Python SDK pinned 0.6.2 while the live default was 0.6.5, read 2026-10-11). A null version that falls through to `GetLatestBicepVersion` and `/releases/latest` drifts the same way (`Azure__bicep@5c15624d19a7:src/Bicep.RpcClient/BicepClientFactory.cs:51`). | `rg -n -i -e '\?\?\s*"latest"' -e 'version\s*=\s*"latest"' -e 'releases/latest' -e 'GetLatest\w*Version' $INSTALL_DIR -g '*.cs' -g '!**/{[Tt]est,[Tt]ests,*.[Tt]est,*.[Tt]ests,*Tests,*TestFixtures,*TestServices}/**'` prints nothing. A unit test with a fake manifest whose `latest` differs from the constant asserts the tested version's URL was requested (`unverified: read only`). | MUST |
| CS-BIN-07 | [downloads-binary] Hash the whole downloaded archive with SHA-256 and compare it, as bytes through the `CS-SEC-08` helper, with the validated digest before opening it as an archive. Never compare the hex strings of an archive, a pin or a sidecar, by `==`, `!=`, `string.Equals` or `.Equals`, and never call `Convert.ToHexStringLower` (.NET 9 and later). Sanctioned form, worded as `CS-SEC-08` words it: a protocol-defined lowercase `sha256:<hex>` digest that is public on both sides (an OCI descriptor, a registry's reported digest) is an identifier and may be compared `Ordinal`; a secret, a pin and the archive hash stay on the byte compare. | `ZipArchive` accepted 19 of 20 bit-flipped real archives on .NET 8 and 10 and 6 of 20 on .NET 11 RC1, a repacked valid tar.gz passes every format check, and `Convert.ToHexString` is uppercase, so `==` refused the genuine archive (measured 2026-10-11). `BitConverter.ToString(h).Replace("-","")` plus an ordinal compare is the same hazard on an archive and the sanctioned form on a descriptor (`Azure__bicep@5c15624d19a7:src/Bicep.Core/Registry/Oci/OciDescriptor.cs:49`, `src/Bicep.Core/Registry/AzureContainerRegistryManager.cs:337,348`, read 2026-10-11). | `rg -n -P -e 'Convert\.ToHexString\s*\([^;]*\)\s*==' -e 'Convert\.ToHexString\s*\([^;]*\)\s*!=' -e 'Convert\.ToHexString\s*\([^;]*\)\s*\.Equals' -e '==\s*Convert\.ToHexString' -e '!=\s*Convert\.ToHexString' -e '\bEquals\s*\([^;]*Convert\.ToHexString' -e '\bEquals\s*\([^;]*[Dd]igest' -e '\.ToLower(?:Invariant)?\s*\(\s*\)\s*[=!]=' -e 'BitConverter\.ToString' -e 'ToHexStringLower' $SRC -g '*.cs' -g '!**/{[Tt]est,[Tt]ests,*.[Tt]est,*.[Tt]ests,*Tests,*TestFixtures,*TestServices}/**'` prints no hit on an archive hash, a pin or a sidecar; read each hit, and only a compare of two protocol `sha256:<hex>` strings is the sanctioned form (watched red on `==`, `string.Equals`, `.Equals` on either side, `ToLowerInvariant() ==`, `BitConverter.ToString` and `ToHexStringLower`, green on the `FixedTimeEquals` twin). Block G2 closes the gap a negative-only cell leaves: it prints every file that calls `HttpClient`, writes a file and never calls `SHA256`, and the one `FixedTimeEquals` helper file (a download with no verification at all passed the cell above: `Azure__bicep@5c15624d19a7:src/Bicep.RpcClient/Helpers/BicepInstaller.cs:56-62`, read 2026-10-11). Building the net8.0 leg also fails CS0117 on `ToHexStringLower` (net8.0 exit 1, net10.0 exit 0). A flip-one-byte test expects `ChecksumMismatchException` and an empty cache. | MUST |
| CS-BIN-08 | [downloads-binary] Treat the release manifest as untrusted: parse it with System.Text.Json, require `schema` to be the integer the library was written against (example: 1), stream the body under the 1 MiB cap (`CS-BIN-11`), match names against `\A[A-Za-z0-9._+-]+\z` with `..` tested separately, digests against `\A[0-9a-f]{64}\z` (anchored at both ends with `\A` and `\z`, never `^`, `$` or an unanchored start), and require https URLs with no userinfo. One invalid row fails the whole manifest. Validators are `[GeneratedRegex]` (`CS-PERF-03`). | In .NET `$` accepts a trailing `\n`, so a `^...$` check, written with an `(?i)` prefix, as `"^" + x + "$"` or with no start anchor at all, passes a digest with a newline, and the manifest chooses the bytes that get executed. | `rg -n -P -e '@?"(?:\(\?[a-z]+\))?\^[^"]*(?<!\\)\$"' -e '"\^"\s*\+' -e '\+\s*"\$"' -e '"(?![^"]*\\A)[^"]*\{64\}' -e 'Regex\w*\s*\([^;]*[^\\\s"(,]\$"' -e 'Match\w*\s*\([^;]*[^\\\s"(,]\$"' $INSTALL_DIR -g '*.cs' -g '!**/{[Tt]est,[Tt]ests,*.[Tt]est,*.[Tt]ests,*Tests,*TestFixtures,*TestServices}/**'` prints nothing (watched red on `^...$`, `(?i)^...$`, concatenated anchors, a `{64}` literal with no `\A` and a trailing-`$` literal with no `^`, green on the `\A...\z` twin and an interpolated `$"{a}$"`). Read each hit: only a literal that validates manifest text (a name, digest or URL) counts, and a GUID or filter regex does not. Tests for `schema: 2`, `schema: "1"`, `filename: "../x"`, a 64-hex digest plus `\n` and a body of 1 MiB + 1 byte (`unverified: read only`). | MUST |
| CS-BIN-12 | [downloads-binary] Install into `<cache>/<version>/<triple>/` without ever writing into or over a final path that may be running. (1) [greenfield] Create the temp file with `FileMode.CreateNew` in the target directory and `UnixCreateMode = UserRead \| UserWrite`. (2) [greenfield] Call `File.SetUnixFileMode(tmp, UserRead \| UserWrite \| UserExecute)` behind `!OperatingSystem.IsWindows()`. (3) Publish with `File.Move(tmp, final, overwrite: false)` and catch `IOException`: the loser of a race deletes its temp file and uses the winner's binary once the sidecar check passes. (4) Write a sidecar holding the SHA-256 of the extracted binary and re-hash on every cache hit through the `CS-SEC-08` helper. (5) The one sanctioned `FileMode.OpenOrCreate` is the install lock: `new FileStream(<binary>.lock, FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None, 1, FileOptions.None)` on a dedicated `.lock` path, never on the binary, the temp file or the sidecar; an `IOException` of exactly that type means held, so retry until a timeout. `File.Create`, `File.OpenWrite`, `File.Replace`, `FileMode.Create` and `overwrite: true` appear on no other path. On a TFM without `UnixCreateMode` and `File.SetUnixFileMode` (netstandard2.0) create with `FileMode.CreateNew`, set the mode through the fixed-argv `chmod` of `CS-BIN-17`, and publish with the two-argument `File.Move`, which throws `IOException` when the target exists. | Writing into a running binary fails with ETXTBSY on Linux (read 2026-10-11) and a sharing violation on Windows. `overwrite: true` over an open file threw `UnauthorizedAccessException` on Windows (SDK 10.0.102), while `overwrite: false` threw `IOException` on Linux and Windows and kept the winner's content (measured 2026-10-11). Re-hashing 25.4 MiB costs 12.6 ms. The lock file is the only file opened `OpenOrCreate` and held with `FileShare.None`; the sources comment that `FileOptions.DeleteOnClose` is not atomic on Linux and macOS (`Azure__bicep@5c15624d19a7:src/Bicep.RpcClient/Helpers/BicepInstaller.cs:193`, `src/Bicep.IO/FileSystem/FileSystemStreamLock.cs:30`, read 2026-10-11). The same installer creates its temp with `File.Create` (line 59) and publishes with `File.Replace` over the final path (line 207), which the cell flags. | `rg -n -P -U -e 'File\.WriteAll\w*\s*\(' -e 'File\.Copy\s*\(' -e 'File\.Create\s*\(' -e 'File\.OpenWrite\s*\(' -e 'File\.Replace\s*\(' -e 'FileMode\.Create\b' -e 'FileMode\.Truncate' -e 'FileMode\.OpenOrCreate(?![^;]*FileShare\.None)' -e 'overwrite:\s*true' $INSTALL_DIR -g '*.cs' -g '!**/{[Tt]est,[Tt]ests,*.[Tt]est,*.[Tt]ests,*Tests,*TestFixtures,*TestServices}/**'` prints nothing (the lock form carries `FileShare.None` in its statement and is not flagged; watched red on each pattern, on a wrapped `OpenOrCreate` with no `FileShare.None` and on a `FileShare.ReadWrite` lock of the binary itself, green on the lock form and on `CreateNew` plus `File.Move(..., overwrite: false)`; read each hit and the lock's path, which must end `.lock`). CA1416 at `error` in `analyzers.globalconfig` fails an unguarded `SetUnixFileMode` (watched, one site, both TFMs). An install-twice test asserts zero downloads on the second call, and a contention test asserts the second process waits on the lock and then reuses the binary (`unverified: read only`). | MUST |
| CS-BIN-13 | [downloads-binary] Choose the cache root from the caller's environment snapshot: the rooted `LOCALAPPDATA` on Windows, `~/Library/Caches` on macOS, the rooted `XDG_CACHE_HOME` else `~/.cache` on Linux, each plus a library directory (example: `ocx-sdk`). A relative or empty variable counts as unset (the `CS-XP-04` cwd hazard). Never `SpecialFolder.LocalApplicationData`, which is `~/.local/share` on Linux. [greenfield] Create the root level by level with `Directory.CreateDirectory(path, UnixFileMode.UserRead \| UnixFileMode.UserWrite \| UnixFileMode.UserExecute)`, refuse a root or level whose `DirectoryInfo.LinkTarget` is not null and a root with group or other write, and do not check ancestors. On a TFM without that overload, `LinkTarget` and `UnixFileMode` (netstandard2.0), create the root with `Directory.CreateDirectory(path)` and set 0700 through the fixed-argv `chmod` of `CS-BIN-17`; the link and group or other write refusals then have no managed check. | The mode applies to the leaf only: parents came out 755 (measured 2026-10-11). `/home -> /var/home` is legitimate on Fedora Atomic, which is why ancestors are exempt. | `rg -n -P -U 'Directory\.CreateDirectory\s*\((?![^;]*UnixFileMode)' $INSTALL_DIR -g '*.cs' -g '!**/{[Tt]est,[Tt]ests,*.[Tt]est,*.[Tt]ests,*Tests,*TestFixtures,*TestServices}/**'` prints nothing on a `[greenfield]` project; on a lower TFM each hit is the `CreateDirectory` the fixed-argv `chmod` follows. POSIX tests for a symlinked root and a 0777 root (`unverified: read only`). | MUST |
| CS-BIN-14 | [downloads-binary] Own exactly one HttpClient: a `static readonly HttpClient` over `SocketsHttpHandler { PooledConnectionLifetime = ..., AllowAutoRedirect = false }`, or, in a DI host, one typed or named client from `IHttpClientFactory` (`AddHttpClient`, `CreateClient`) whose `ConfigurePrimaryHttpMessageHandler` builds that handler; never a `new HttpClient(` or `new HttpClient {` beside the factory. The rest applies to either form. Set an identifying `User-Agent` (library name and version) on every request, bound each attempt with a `CancellationTokenSource` built with the injected `TimeProvider` (`CS-XP-11`) and linked to the caller's token, use the default proxy only, and add no library-specific proxy variable. | `HttpClient.Timeout` does not bound a streamed read: a stalled body ran 4.0 s under `Timeout = 1 s` (measured 2026-10-11). The default client sends no User-Agent; send one to identify the library (a CDN 403 without it was read in the reference consumer's Python SDK and not reproduced). | `rg -n -e 'new\s+HttpClient\s*\(' -e 'new\s+HttpClient\s*\{' -e 'new\s+HttpClient\s*$' -e '\bHttpClient\s+\w+\s*=\s*new\s*\(' -e '\bAddHttpClient\b' -e '\bCreateClient\b' -e 'IHttpClientFactory' $INSTALL_DIR -g '*.cs' -g '!**/{[Tt]est,[Tt]ests,*.[Tt]est,*.[Tt]ests,*Tests,*TestFixtures,*TestServices}/**'` prints exactly one client: one `new HttpClient(` or `new HttpClient {` line (the second and third patterns catch an object initializer on the same or the next line, `refit` `Program.cs:41`; the fourth catches the target-typed `new()`), or, in a DI host, no `new HttpClient` and the `AddHttpClient`, `CreateClient` or `IHttpClientFactory` lines of one registered client (read each hit: a method named like the factory is not the factory). A stalled-server test fails the attempt at its budget (`unverified: read only`). | MUST |
| CS-BIN-15 | [downloads-binary] Follow redirects by hand: at most 5 hops, https only, no userinfo. Attach a credential only to a request whose scheme, host and port equal the origin it was issued for, and never put a secret in `DefaultRequestHeaders`. | The default handler strips only the typed `Authorization` header: a custom token header reached the other origin (measured 2026-10-11). | `rg -n 'AllowAutoRedirect\s*=\s*false' $INSTALL_DIR -g '*.cs' -g '!**/{[Tt]est,[Tt]ests,*.[Tt]est,*.[Tt]ests,*Tests,*TestFixtures,*TestServices}/**'` prints the handler line; empty output means redirects are automatic. `rg -n -e 'DefaultRequestHeaders\.Add' -e 'DefaultRequestHeaders\.TryAddWithoutValidation' -e 'DefaultRequestHeaders\.Authorization' $INSTALL_DIR -g '*.cs' -g '!**/{[Tt]est,[Tt]ests,*.[Tt]est,*.[Tt]ests,*Tests,*TestFixtures,*TestServices}/**'` prints nothing. A two-listener test asserts the second origin sees no credential (`unverified: read only`). | MUST |
| CS-BIN-17 | [downloads-binary] Never run a downloaded installer script and never shell out to `curl` or `Invoke-WebRequest`. [greenfield] Set the mode with `File.SetUnixFileMode` (`CS-BIN-12`). Where the lowest TFM lacks it (netstandard2.0), `chmod` is the only route: one call through the `CS-PROC` spawner with `FileName` the rooted `/bin/chmod`, a literal mode (`0700`) and the library-built install path as its only variable argument (never a name taken from the manifest or the archive), no shell. | An exemplar runs `install.sh` and `install.ps1` with no digest check (`pulumi__pulumi-dotnet@2a0dca84f09b:sdk/Pulumi.Automation/Commands/LocalPulumiCommand.cs:152,190,228`). `File.SetUnixFileMode` arrived in .NET 7, so netstandard2.0 has no managed route; the bare `chmod +x "{filePath}"` through PATH in `Azure__bicep@5c15624d19a7:src/Bicep.RpcClient/Helpers/BicepInstaller.cs:121` is the case this row sanctions only in its rooted, literal-mode form (read 2026-10-11). | `rg -n -i -e 'install\.sh' -e 'install\.ps1' -e 'ExecutionPolicy' -e 'chmod"' -e 'Invoke-WebRequest' $INSTALL_DIR -g '*.cs' -g '!**/{[Tt]est,[Tt]ests,*.[Tt]est,*.[Tt]ests,*Tests,*TestFixtures,*TestServices}/**'` and `rg -n -U -P -w -e 'ProcessStartInfo[^;]*\bcurl\b' -e 'FileName[^;]*\bcurl\b' -e 'Process\.Start[^;]*\bcurl\b' $INSTALL_DIR -g '*.cs' -g '!**/{[Tt]est,[Tt]ests,*.[Tt]est,*.[Tt]ests,*Tests,*TestFixtures,*TestServices}/**'` print nothing on a `[greenfield]` project; on a project whose lowest TFM lacks `SetUnixFileMode` the only hit is the one `chmod"` helper (read it: rooted, literal mode, library-built path; watched red on `"chmod"` and `"/bin/chmod"`, green on `SetUnixFileMode`; the `curl` pattern is case-sensitive and sits beside a process start, as in `G1`, because `curl ` under `-i` hit 5 identifiers ending in `Url ` in markdig: watched red on `ProcessStartInfo("curl")`, `FileName = "/usr/bin/curl"` and a wrapped start, green on `LinkUrl `). | MUST |
| CS-BIN-22 | [downloads-binary] Require a caller-supplied archive digest for any version other than the compiled-in one. The only bypass is an option whose name says it trusts the manifest origin (example: `TrustManifestOrigin`); it is never a default and library code never sets it. This extends `CS-BIN-09` to the canonical host. | Without a pin the manifest origin is the only authority. `CS-BIN-06` made `latest` explicit and this makes its trust explicit. | `rg -n -i 'TrustManifestOrigin[^;]*=\s*true' $SRC -g '*.cs' -g '!**/{[Tt]est,[Tt]ests,*.[Tt]est,*.[Tt]ests,*Tests,*TestFixtures,*TestServices}/**'` prints nothing (no default of true and no library site sets it). A unit test requests an older version with no digest and expects a typed exception and zero requests (`unverified: read only`). | MUST |
| CS-BIN-24 | Library code never spawns `gh`, `cosign`, `minisign` or `openssl`, never passes `--no-verify` and never sets the tool's verify-off variable (example: `OCX_NO_VERIFY`, scrubbed by `CS-PROC-06`). | These tools are absent on the clean machine the library exists to bootstrap, and a missing attestation and a tampered file both answer HTTP 404 with exit 1, so "tool failed" cannot mean "unsigned, continue" (read 2026-10-11). The verify-off variable disables the tool's own signature policy. | Block G1 prints nothing (the tool name must sit beside a process start: a bare `"gh"` matched country codes in a data-generator library; watched red on `ProcessStartInfo("gh")`, `FileName = "openssl.exe"`, `Process.Start("cosign"` and `--no-verify`, green on a country-code array), and `rg -n -e 'OCX_NO_VERIFY"\]\s*=' -e 'SetEnvironmentVariable\s*\("OCX_NO_VERIFY"' $SRC -g '*.cs' -g '!**/{[Tt]est,[Tt]ests,*.[Tt]est,*.[Tt]ests,*Tests,*TestFixtures,*TestServices}/**'` prints nothing (the scrub list names the variable but assigns nothing). | MUST |
| CS-BIN-25 | Fail verification hard: add no warn tier, no `Skip*`, `Disable*` or `AllowUnsigned` option and no environment variable that turns the pin check off. The only ways around the pin are a different explicit digest (`CS-BIN-22`) or locate-only, and both are visible in the caller's code. | The library's callers include agent loops nobody reads, and a skip flag is the first thing added to turn a red run green. | `rg -n -P -i -e '(?<!SecurityPermissionFlag\.)Skip\w*Verif' -e 'Disable\w*Verif' -e 'NoVerif' -e 'AllowUnsigned' -e 'AllowInsecure' -e 'Skip\w*Checksum' -e 'Disable\w*Checksum' $SRC -g '*.cs' -g 'PublicAPI.*.txt' -g '!**/{[Tt]est,[Tt]ests,*.[Tt]est,*.[Tt]ests,*Tests,*TestFixtures,*TestServices}/**'` prints nothing; the `PublicAPI` files are scanned so a flag added there cannot hide, and the BCL's `SecurityPermissionFlag.SkipVerification` is not an option the library adds. | MUST |
| CS-BIN-26 | Say in one sentence each, in the README the package ships (the file `PackageReadmeFile` names, else the root `README*`) and in the XML docs of the install or locate entry point: [json-cli] what the pin proves, [json-cli] what it does not prove (a compromised release pipeline of the tool), and that a located binary (explicit path, override variable, PATH) is not verified. [json-cli] Never write "signature verified" until the tool publishes a signature. | A pin sold as signature verification over-promises: it moves the digest's authority from the manifest host to the published package, no further. | Block G4 prints the sentences in each shipped README and in the XML docs (an empty `==` section means they are missing) and nothing under any `-- banned` line (watched red on a packed README that lacks the sentences and one that says `signature verified`, with `PackageReadmeFile` set in a `.targets` file, green on the twin). Resolved as pack does, the block reads `README.markdown` at a root with no `PackageReadmeFile` (CsvHelper), prints each README once (a hard-coded `README.md` beside a `PackageReadmeFile` of the same name printed it twice, command-line-utils and Ocelot) and no longer reads a nested `docs/README.md` through `-g "**/README.md"`. A root-only `README.md` operand missed the packed `PACKAGE.md` (`Azure__bicep@5c15624d19a7:src/Bicep.RpcClient/PACKAGE.md`, read 2026-10-11). | MUST |

**G1** (`CS-BIN-24`) is the one grep with an alternation, so it sits outside a table cell:

```sh
rg -n -P -e '(?:ProcessStartInfo|FileName|Process\.Start)[^;]*"(?i:gh|cosign|minisign|openssl)(?:\.exe)?"' -e '--no-verify' $SRC -g '*.cs' -g '!**/{[Tt]est,[Tt]ests,*.[Tt]est,*.[Tt]ests,*Tests,*TestFixtures,*TestServices}/**'
```

**G2** (`CS-BIN-07`, `CS-BIN-20`) is the positive cell: a pipe, so it sits outside a table cell. It prints every file that names `HttpClient`, writes a file and never calls `SHA256`
(a download with no verification), then the file of the `CS-SEC-08` helper. Empty output from the pipeline is the pass; the last line must print one file (watched red on a download that writes and never hashes and on a tree with no `FixedTimeEquals`, green on its twin):

```sh
rg -l0 -e '\bHttpClient\b' $INSTALL_DIR -g '*.cs' -g '!**/{[Tt]est,[Tt]ests,*.[Tt]est,*.[Tt]ests,*Tests,*TestFixtures,*TestServices}/**' \
  | xargs -0 -r rg -l0 -P -e 'File\.(?:WriteAll\w*|Create|OpenWrite|Move|Replace)\s*\(' -e 'new\s+FileStream\s*\(' \
  | xargs -0 -r rg --files-without-match -e 'SHA256'
rg -l -e 'FixedTimeEquals' $SRC -g '*.cs' -g '!**/{[Tt]est,[Tt]ests,*.[Tt]est,*.[Tt]ests,*Tests,*TestFixtures,*TestServices}/**' || echo 'MISSING the CS-SEC-08 helper'
```

**G3** (`CS-BIN-11`) reads only the files that name `HttpClient`, so a `GetAsync` of another SDK is out of scope:

```sh
rg -l0 -e '\bHttpClient\b' $INSTALL_DIR -g '*.cs' -g '!**/{[Tt]est,[Tt]ests,*.[Tt]est,*.[Tt]ests,*Tests,*TestFixtures,*TestServices}/**' \
  | xargs -0 -r rg --with-filename -n -U -P -e '\.GetAsync\s*\((?![^;]*ResponseHeadersRead)' -e '(?<![Ss]ocket)(?<![Tt]ransport)(?<!base)\.SendAsync\s*\((?![^;]*ResponseHeadersRead)'
```

**G4** (`CS-BIN-26`) reads each README once: the file every `PackageReadmeFile` resolves to (the nearest file of that name, any case, from the declaring file's directory up to the root; a name that resolves nowhere prints `MISSING`), else the root `README*` in any case or extension:

```sh
RM=$( { rg -N --null -o -r '$1' '<PackageReadmeFile[^>]*>\s*([^<\s]+)' -g '*.csproj' -g '*.props' -g '*.targets' . \
  | while IFS= read -r -d '' p && IFS= read -r v; do
      b=${v##*[/\\]}; d=${p%/*}; f=
      while [ -z "$f" ]; do f=$(find "$d" -maxdepth 1 -type f -iname "$b" | head -1); [ "$d" = . ] && break; d=${d%/*}; done
      echo "${f:-MISSING readme $v declared in $p}"
    done; } | sort -u )
[ -n "$RM" ] || RM=$(find . -maxdepth 1 -type f -iname 'README*' | sort -u)
[ -n "$RM" ] || RM='MISSING readme: no PackageReadmeFile and no root README*'
printf '%s\n' "$RM" | while IFS= read -r f; do
  case $f in MISSING*) echo "$f"; continue ;; esac
  echo "== $f"; rg -n -i -e 'not verified' -e 'trust boundary' "$f"
  echo "-- banned in $f"; rg -n -i -e 'signed by ocx' -e 'signature verified' "$f"
done
echo '== XML docs'; rg -n -i -e '^\s*///.*not verified' -e '^\s*///.*trust boundary' $SRC -g '*.cs' -g '!**/{[Tt]est,[Tt]ests,*.[Tt]est,*.[Tt]ests,*Tests,*TestFixtures,*TestServices}/**'
echo '-- banned in XML docs'; rg -n -i -e 'signed by ocx' -e 'signature verified' $SRC -g '*.cs' -g '!**/{[Tt]est,[Tt]ests,*.[Tt]est,*.[Tt]ests,*Tests,*TestFixtures,*TestServices}/**'
```

## Analyzer Canary

A ban that is registered but cannot fire reads as a gate and checks nothing. Keep one canary project beside the library: it
compiles `src/$(Variant).cs`, `Variant=Bad` calls one overload per banned symbol (a net10.0-only overload behind `#if NET10_0_OR_GREATER`) and one symbol per security group of `CS-SEC-02`, `Variant=Good` is its twin, and it loads the same
`BannedSymbols.txt`. Its csproj sets three things or the block misreports: `<EnableDefaultCompileItems>false</EnableDefaultCompileItems>`
(else `src/*.cs` compiles twice and the build stops with NETSDK1022), `<IsPackable>false</IsPackable>` (else the posture's
`PublicApiAnalyzers` raises RS0016 and RS0037 on the Good twin and it exits 1) and `<AdditionalFiles Include="BannedSymbols.txt" />`
(plus `BannedSymbols.Src.txt` when used), because RS0030 reads nothing from a ban file that is not an `AdditionalFiles` item.

```sh
: "${CANARY:?MISSING CANARY}"
if [ -f "$CANARY" ]; then
for tfm in net8.0 net10.0; do
  timeout 900 dotnet build "$CANARY" -f $tfm -p:Variant=Bad --no-incremental --tl:off --interactive false --disable-build-servers -nologo -v:q > bad-$tfm.log 2>&1; echo "bad $tfm exit $?"
  rg -q 'error RS0030' bad-$tfm.log; echo "bad $tfm RS0030 $?"
  timeout 900 dotnet build "$CANARY" -f $tfm -p:Variant=Good --no-incremental --tl:off --interactive false --disable-build-servers -nologo -v:q > good-$tfm.log 2>&1; echo "good $tfm exit $?"
done
else echo "MISSING canary project $CANARY: no ban is proven without it"; false
fi
```

With `CANARY` unset the block stops at `MISSING CANARY`, and with a path that is not a file it prints `MISSING canary project` and exits 1 instead of the expected-looking `bad` exit 1 (watched). Expected on both TFMs: `bad` exit 1, `RS0030 0` (a match), `good` exit 0 (watched with the three settings; with `IsPackable` true the Good twin exited 1 on 8 PublicAPI errors, measured 2026-10-11). Watched 2026-10-11 with 15 banned calls: 15 distinct RS0030 sites, one CA1416 site
(the unguarded `SetUnixFileMode`), two CA5359 sites and SYSLIB0014 on `WebClient`, all at `error` through the globalconfig; the twin exited 0.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CS-BIN-04 | [downloads-binary] Select the target with a pure function `(operating system, RuntimeInformation.OSArchitecture) -> target triple` and table-test it with at least 20 rows, among them: Windows ARM64 maps to the aarch64 Windows triple, a 32-bit process on x64 Windows maps to the x64 Windows triple, macOS under Rosetta maps to the aarch64 macOS triple. Anything else throws `PlatformNotSupportedException` naming the OS and architecture and telling the caller to pass an explicit path; there is no fallback architecture. Never use `ProcessArchitecture`, `Environment.Is64Bit*`, `RuntimeInformation.RuntimeIdentifier` or a sysctl or Rosetta P/Invoke. | Since .NET 7 `OSArchitecture` sees through Windows and macOS emulation, and the process view failed 4 of 20 table rows (red 16/20, green 20/20, measured 2026-10-11). `RuntimeIdentifier` is opaque since .NET 8. | `BannedSymbols.txt` carries `RuntimeInformation.ProcessArchitecture`, `Environment.Is64BitOperatingSystem`, `Environment.Is64BitProcess` and `RuntimeInformation.RuntimeIdentifier` (`CS-XP-10` owns them); the canary block fails RS0030 on each (watched, both TFMs). The table test also runs on the arm64 legs of the CI matrix (arm64 itself `unverified: read only`). | MUST |
| CS-BIN-10 | [downloads-binary] Never call a whole-archive extractor: `ExtractToDirectory` or `ExtractToDirectoryAsync` on `TarFile`, `ZipFile` or `ZipFileExtensions`. Stream exactly one regular-file member, whose base name is the tool's executable name, through `TarReader` or `ZipArchive`, and reject absolute names, `..` segments, backslashes, links, devices, directories and duplicates. Never write an archive-supplied name to disk. Ban files are named `BannedSymbols.txt` or `BannedSymbols.*.txt` and hold one `M:` line per overload with its full parameter list. | The stock extractors accept a 300 MiB bomb, follow a symlinked destination and leave earlier members behind on failure (measured 2026-10-11). The family has 14 overloads on net8.0 and 24 on net10.0 (counted by reflection), so a hand-listed ban misses the async ones. A ban file named `full.txt` produced no RS0030, and a parameterless `M:` line binds only the parameterless overload (both measured, see `CS-BIN-11`). | `rg -n -e 'ExtractToDirectory' $SRC -g '*.cs' -g '!**/{[Tt]est,[Tt]ests,*.[Tt]est,*.[Tt]ests,*Tests,*TestFixtures,*TestServices}/**'` prints nothing and covers the whole family by substring. `BannedSymbols.txt` carries all 24 overloads (the 10 net10.0-only async lines bind nothing on net8.0); the canary block fails RS0030 on both TFMs, and a net10.0-only `ZipFile.ExtractToDirectoryAsync` call fails RS0030 on net10.0 (watched 2026-10-11). A bomb test expects `InvalidDataException` (`unverified: read only`). | MUST |
| CS-BIN-11 | [downloads-binary] Cap while streaming, counting the bytes actually read and never trusting `Content-Length` or a declared entry `Length`: manifest 1 MiB, archive 256 MiB, extracted member 256 MiB. Never call `HttpClient.GetByteArrayAsync`, `GetStringAsync`, `GetFromJsonAsync`, `HttpContent.ReadAsByteArrayAsync`, `ReadAsStringAsync`, `ReadFromJsonAsync` or `LoadIntoBufferAsync`, and pass `HttpCompletionOption.ResponseHeadersRead` to every `GetAsync` and `SendAsync` (the default buffers the whole body before returning); the ban file lists every overload of each (12 for the first four, both TFMs). | An uncapped reader buffers a hostile body whole. The overload list matters: `M:` lines without parameter lists left `ReadAsStringAsync(CancellationToken)` unbanned and the canary exited 0, while the full list exited 1 (measured 2026-10-11, both TFMs). | `rg -n -P -e '\.GetByteArrayAsync\s*\(' -e '\.GetStringAsync\s*\(' -e '\.ReadAsByteArrayAsync\s*\(' -e '\.GetFromJsonAsync\s*[<(]' -e '\.ReadFromJsonAsync\s*[<(]' -e '\.LoadIntoBufferAsync\s*\(' -e '(?<![Rr]eader)(?<![Rr]eader\?)(?<!this)(?<!base)\.ReadAsStringAsync\s*\(' $INSTALL_DIR -g '*.cs' -g '!**/{[Tt]est,[Tt]ests,*.[Tt]est,*.[Tt]ests,*Tests,*TestFixtures,*TestServices}/**'` prints nothing (receiver-qualified: a `JsonReader.ReadAsStringAsync` call or declaration is not a `HttpContent` read, and 4 such hits in a serializer library are gone), and block G3 prints nothing (it reads only files that name `HttpClient`, so an Azure SDK `GetAsync` is out of scope; watched red on one-line and wrapped calls, green with the option and on a file that never names `HttpClient`; read each hit: `Socket.SendAsync`, a mail transport's `SendAsync` and a handler's `base.SendAsync` are not client calls); the canary block fails RS0030 on `HttpClient.GetByteArrayAsync`, `HttpContent.ReadAsByteArrayAsync` and `HttpContent.ReadAsStringAsync` (watched). A bomb test expects `InvalidDataException` (`unverified: read only`). | MUST |
| CS-BIN-16 | [downloads-binary] Never accept every certificate: no `=> true`, `delegate { return true; }` or `DangerousAcceptAnyServerCertificateValidator`, whatever the callback property. A private CA replaces trust through `SslClientAuthenticationOptions.CertificateChainPolicy` with `X509ChainTrustMode.CustomRootTrust`. Sanctioned form: a validation callback the caller supplies through a library option whose default is the strict platform check, forwarded unchanged at one site (a strict library default plus caller plumbing is not a violation). | TLS is the only authenticity a manifest has, and a library that only forwards its caller's callback (MailKit `MailService.cs:451,472`) disables nothing: a blanket ban on the callback properties hit 30 of 30 sites there, every one of them strict default or plumbing (read 2026-10-11). The lambda forms (`(_, _, _, _) => true`) are silent at `AnalysisLevel 10.0-all`; only CA5359 (`ServicePointManager`) fires without a ban, so the bans carry the rule. | `BannedSymbols.txt` carries `HttpClientHandler.DangerousAcceptAnyServerCertificateValidator`, `HttpClientHandler.ServerCertificateCustomValidationCallback`, `SslClientAuthenticationOptions.RemoteCertificateValidationCallback` and `ServicePointManager.ServerCertificateValidationCallback`; the canary block fails on all of them (watched), and the one forwarding site of a caller-supplied callback carries `#pragma warning disable RS0030` with a comment naming the option. CA5359 and SYSLIB0014 sit at `error` in `analyzers.globalconfig` and cover `ServicePointManager`, `WebClient`, `WebRequest` and `HttpWebRequest` (the canary fired on both IDs). `rg -n -P -e 'DangerousAcceptAnyServerCertificateValidator' -e 'Callback[^;]*=>\s*true\b' -e 'Certificate[^;]*=>\s*true\b' -e 'Callback\s*\+?=\s*delegate[^{;]*\{\s*return\s+true\s*;' $SRC -g '*.cs' -g '!**/{[Tt]est,[Tt]ests,*.[Tt]est,*.[Tt]ests,*Tests,*TestFixtures,*TestServices}/**'` prints nothing (watched red on the lambda, `delegate`, `+=` and `Dangerous...` forms, green on a strict default, a forwarded callback and `Any(x => true)`); a named method that returns true needs a unit test that calls the callback with `SslPolicyErrors.RemoteCertificateNameMismatch` and expects false (`unverified: read only`). | MUST |

## Pin File Gate

The pin file is JSON with `version` and a `pins` object from target triple to lowercase SHA-256. The library compiles it into an
internal static class, so the digest authority travels with the code.

```sh
jq -e '(.version | type == "string") and (.pins | length > 0) and (.pins | all(.[]; test("\\A[0-9a-f]{64}\\z")))' "${PINS:?MISSING PINS}"
```

Exit 0 on the genuine file. Exit 1 on a pin with a trailing newline, a 63-character pin and an empty `pins`. The naive `test("^[0-9a-f]{64}$")`
exited 0 on the trailing-newline pin (measured 2026-10-11, jq 1.8.1).

The refresh gate is an adopter script, `eng/triangulate.py`, that takes the three published sources, the version and the pin file
and exits 1 on any disagreement, on an empty manifest (no row for the version), on a duplicate `(version, target, filename)` row, when the pin file's `version` is not the version, when a pin differs from the digest the three sources agree on, and when the manifest's target triples differ from
the pin file's keys. Its inputs: `dist.json` (the manifest; `releases[]` rows with `version`, `target`, `filename`, `sha256`),
`sha256.sum` (the release's checksum file, `<hex>  <name>` lines) and `assets.json` (the release API; `assets[]` with `name` and
`digest` as `sha256:<hex>`). Example inputs are from the 0.6.5 release; rename the member names to the tool's.

```python
import json, sys

dist, sumf, apif, ver, pinf = sys.argv[1:6]
d = json.load(open(dist))
rows = [r for r in d["releases"] if r["version"] == ver]
manifest = {r["filename"]: r["sha256"] for r in rows}
target = {r["filename"]: r["target"] for r in rows}
sums = {}
for l in open(sumf):
    if l.strip():
        h, n = l.split()
        sums[n.lstrip("*")] = h
api = {
    a["name"]: a["digest"].split(":")[1]
    for a in json.load(open(apif))["assets"]
    if a["name"].endswith((".tar.gz", ".zip"))
}
bad = 0
triples = {r["target"] for r in rows}
pinfile = json.load(open(pinf))
pins = pinfile["pins"]
if not manifest:
    bad += 1
    print("DIFF empty manifest")
elif triples != set(pins):
    bad += 1
    print("DIFF triples", sorted(triples ^ set(pins)))
if len(rows) != len(manifest):
    bad += 1
    print("DIFF duplicate manifest row")
if pinfile["version"] != ver:
    bad += 1
    print("DIFF pin version", pinfile["version"], ver)
for n in sorted(manifest):
    t = (manifest[n], sums.get(n), api.get(n), pins.get(target[n]))
    ok = len(set(t)) == 1
    bad += not ok
    print("OK  " if ok else "DIFF", n, [x[:6] + ".." + x[-6:] if x else None for x in t])
print("rows", len(rows), "mismatches", bad)
sys.exit(1 if bad else 0)
```

```sh
python3 -I eng/triangulate.py dist.json sha256.sum assets.json 0.6.5 "${PINS:?MISSING PINS}"
```

Genuine inputs print `rows 8 mismatches 0` and exit 0. One altered line of `sha256.sum` prints `mismatches 1` and exits 1 (watched 2026-10-11).
A file missing from `sha256.sum` or `assets.json` counts as a mismatch. A version with no manifest row printed `rows 0 mismatches 0`
and exited 0 before; it now exits 1, as does a pin file with a triple the manifest lacks or the reverse, a wrong pin digest, a wrong pin `version` and a poisoned duplicate manifest row listed first (each `mismatches 0` and exit 0 before; watched red on all three plants, 2026-10-11).

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CS-BIN-20 | [downloads-binary] Commit one pin file (example: `ocx-pins.json`) holding a per-triple SHA-256 for the compiled-in tested version, and check in this order: (1) validate the manifest row (`CS-BIN-08`); (2) when the requested version equals the pin version, the manifest digest must equal the pin, else throw the acquisition leaf (example `OcxAcquireException`, reason `ManifestDisagreesWithPin`) before any archive request; (3) hash the streamed archive and compare it with the pin through the `CS-SEC-08` helper; (4) only then open the archive. | The pin moves the digest's authority from the manifest host to the published package that carries the code. Without it the manifest host controls the manifest, the URL and the digest. | The pin block exits 0 on the genuine file and 1 on the three planted defects (watched). Block G2 prints no file that calls `HttpClient`, writes a file and never calls `SHA256`, and prints the `FixedTimeEquals` helper file. A unit test flips one hex character of a pin and expects the acquisition leaf with that reason, no file in the cache, and zero archive requests when the manifest row disagrees (`unverified: read only`). | MUST |
| CS-BIN-21 | [downloads-binary] Regenerate the pin file only through a triangulation gate: three independently published sources must agree for every triple before the file is written (the manifest row, the release's checksum file and the release API's asset `digest` field). Run the gate on every change to the pin file and nightly. Never copy a digest from one source, a chat message or a model answer. | One poisoned publication point cannot pass three. The gate defends against a compromised manifest origin or CDN, not against a compromised release pipeline. | The refresh block (`eng/triangulate.py` above) exits 0 on genuine inputs and 1 on one altered line, on a version with no manifest row, on a pin file that adds or drops a triple, on a pin whose digest or `version` differs from the agreed one and on a duplicate manifest row (watched on the release's real inputs, 2026-10-11). | MUST |

## Behavioural Tests

Each row needs a fake handler or loopback server bound to port 0, and no grep above stands in for it. Every verification cell
here is a test shape run by the `dotnet test` line of the index gate block; none was run against a real CDN (`unverified: read only`).

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CS-BIN-09 | [downloads-binary] Require an explicit archive digest from the caller whenever the manifest host is not the tool's canonical host (example: `setup.ocx.sh`) or a mirror is configured, and fail before any network I/O. | TLS proves reachability, not authenticity (CWE-345): a mirror controls the manifest, the URL and the digest. | A counting fake handler: a mirror configured with no digest throws a typed exception and records zero requests. | MUST |
| CS-BIN-18 | [downloads-binary] Retry only transport failures: resets, timeouts, truncated bodies, HTTP 429 and 5xx. Never retry 401, 403, 404, a size-cap abort or a checksum mismatch. Each attempt starts by discarding the previous partial file, and jitter comes from `RandomNumberGenerator.GetInt32` (`CS-SEC-07`). | Wrong bytes are not late bytes: retrying a mismatch re-downloads the same attack. | A classifier unit test with one case per class; a fake handler that serves a bad digest is called exactly once. | SHOULD |

## Retired

- `CS-BIN-03` is retired, not reused: the home directory resolver is `CS-XP-04`.
- `CS-BIN-19` is retired, not reused: bundling per-RID binaries in a package is a delivery model this set does not ship (the design record holds it).
- `CS-BIN-23` is retired, not reused: the crypto-package ban belongs to the reference consumer's upgrade path (the design record holds it).
- `CS-BIN-27` is retired, not reused: staged-binary checks before `dotnet pack` belong to the bundled-binary model (the design record holds it).
- `CS-BIN-28` is retired, not reused: signature verification is dormant until the tool publishes a signature (the design record holds it).

## Not Covered

No plant or exemplar reached these, so the rows above say nothing about them.

- A real CDN or mirror download, a real proxy and a real certificate chain: every network behaviour above is a fake-handler shape.
- macOS and arm64 hosts: the target table is tested, the archive formats and Gatekeeper behaviour are not.
- An ownership check on the cache root. .NET 8 and 10 expose no managed owner or uid accessor (read 2026-10-11), so the library skips
  the check and documents the gap; do not add a `stat` P/Invoke for it.
- Windows ACLs on the install directory: `CS-PROC-25` owns the trust check on a discovered binary.
- Signature or attestation verification of any kind: retired above.

## What Agents Get Wrong Here

Ranked by estimated frequency times blast radius. The order is a judgement, not a count.

| # | Failure | Why it compiles and misleads | Check and rule |
|---|---|---|---|
| 1 | `TarFile.ExtractToDirectory` or `ZipFile.ExtractToDirectory` "because .NET guards `../`" | The traversal test is green; the bomb and symlinked-destination cases are not. | substring grep, canary, `CS-BIN-10` |
| 2 | `Process.Start("ocx")` after "checking PATH" | Works until a file named `ocx` sits in the working directory. | grep, `CS-BIN-01` |
| 3 | `new HttpClient()` per call, `HttpClient.Timeout` as the download deadline, `GetByteArrayAsync` | A stalled body outlives the timeout; the buffer is uncapped. | `CS-BIN-14`, `CS-BIN-11`, canary |
| 4 | `Convert.ToHexString(hash) == expected`, or an invented `ToHexStringLower` on net8.0 | Uppercase refuses the genuine archive; `ToHexStringLower` is .NET 9 and later. | grep, net8.0 CS0117, `CS-BIN-07` |
| 5 | A `^...$` validation regex for a digest or name | `$` accepts a trailing newline. | grep, `CS-BIN-08` |
| 6 | `ProcessArchitecture` or `RuntimeIdentifier` parsing to pick the binary | Passes on every non-emulated runner. | canary RS0030, `CS-BIN-04` |
| 7 | `File.WriteAllBytes(final, bytes)` then `Process.Start("chmod", ...)` on a net8.0 or newer project | Fails on a running binary and on Windows; `SetUnixFileMode` exists there. | grep, CA1416, `CS-BIN-12`, `CS-BIN-17` |
| 8 | A ban file that is silent: parameterless lines, a file not named `BannedSymbols*.txt`, RS0030 at warning, or an incremental rebuild | The build exits 0 and the gate reads green. | canary with `--no-incremental`, `CS-BIN-10`, `CS-BIN-11` |
| 9 | `ServerCertificateCustomValidationCallback = (_, _, _, _) => true` "for the proxy" or a test | Silent at `10.0-all`; disables the only authenticity the manifest has. | ban, canary, `CS-BIN-16` |
| 10 | `Ensure(version: null)` taking `latest` | Drifts from the tested contract the day the tool releases. | grep, `CS-BIN-06` |
| 11 | Refreshing the pin from the manifest alone | One compromised origin writes the new pin. | refresh block, `CS-BIN-21` |
| 12 | A `SkipVerification` or `AllowInsecure` option "for corporate mirrors" | The first flag an agent loop sets to get green. | grep over `src` and `PublicAPI`, `CS-BIN-25` |
| 13 | A credential in `DefaultRequestHeaders` on an auto-redirecting client | Only the typed `Authorization` header is stripped on redirect. | grep, `CS-BIN-15` |
| 14 | `SpecialFolder.LocalApplicationData` as the Linux cache, `Directory.CreateDirectory(path)` with no mode, a relative `XDG_CACHE_HOME` | Parents come out 755 and the root lands in the working directory. | grep, `CS-BIN-13` |
| 15 | A README that says "signature verified" for a digest pin | The pin proves less than a signature. | grep, `CS-BIN-26` |
| 16 | Spawning `gh` or `openssl` to verify, treating a 404 as "unsigned, continue" | Absent on a clean machine; a tampered file and a missing attestation look the same. | grep, `CS-BIN-24` |
| 17 | A download that writes the file and never hashes it (`HttpClient` plus `File.Create`, a "latest" resolved from the release API) | Every negative grep passes on code that verifies nothing. | G2, `CS-BIN-06`, `CS-BIN-07`, `CS-BIN-20` |
