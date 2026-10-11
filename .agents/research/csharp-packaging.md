---
title: "Shipping the SDK, and getting the ocx binary to it"
topic: csharp-packaging
model: claude-opus-5-5
consolidates:
  - csharp-packaging/csharp-packaging-nuget-release.md
  - csharp-packaging/csharp-packaging-ocx-binary-acquisition.md
grounding:
  - csharp-audit/ocx-cli-contract.md
  - csharp-audit/python-sdk-digest.md
  - csharp-audit/exemplar-build-and-gates.md
  - csharp-audit/exemplar-cli-wrappers-and-sdks.md
date: 2026-10-11
feeds:
  - "dotnet-build/packaging.md (rules CS-PKG-*)"
  - "dotnet-release skill (procedure R1-R14)"
  - "csharp-quality security + platform row (rules CS-BIN-*)"
fixtures: /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/consolidate-csharp-packaging/
---

# Shipping the SDK, and getting the ocx binary to it

Short names for the sub-artifacts: **NR** = [csharp-packaging-nuget-release](csharp-packaging/csharp-packaging-nuget-release.md); **BA** = [csharp-packaging-ocx-binary-acquisition](csharp-packaging/csharp-packaging-ocx-binary-acquisition.md).
NR's measurements are V1-V11 in its §14. BA's measurements are rows 1-14 of the F11 table.
The fixtures this consolidation added live under `fixtures/consolidate-csharp-packaging/`: `ridfallback2/`, `banparams/`, `banname/` and `lint/`.

## Verdict

1. **ocx delivery: locate first, then download on demand with sha256 verification. The SDK nupkg ships no ocx binary.** The owner's decision (map Owner decision 3) has not landed, so all three models appear below with their trade-offs. This program recommends (a) plus (c), as the Python SDK does. Shipping all 8 binaries costs 91.6 MB per ocx release (BA F1). A RID-specific publish also drops binaries silently (BA F9).
2. **Conflict: the ocx contract says "ship/locate per-RID binaries" (ocx-cli-contract §8.13).** Resolved in favour of BA's measured costs. If the owner picks bundling anyway, the layout is fixed by a measurement this consolidation ran:
   - put the static **musl** build under `runtimes/linux-x64/native/` and `runtimes/linux-arm64/native/`;
   - `linux-musl-*` publishes fall back to those directories;
   - a musl-only layout vanishes from `-r linux-x64` publishes.
   - So the gnu build is never packaged.
3. **Discovery order: explicit path, `OCX_SDK_EXE`, `OCX_BINARY_PIN`, PATH, then `$OCX_HOME`.** Every tier resolves to one rooted path.
   - The `$OCX_HOME` tier reads `OCX_HOME`, else the user profile, and looks in `symlinks/ocx.sh/ocx/cli/current/content/bin/`.
   - PATH entries count only if rooted, and the file name must be exactly `ocx` or `ocx.exe`. PATHEXT is never honoured.
   - **Conflict:** BA and the Python SDK omit `OCX_BINARY_PIN` and honour PATHEXT. The contract (§6, §8.1) requires the pin and exact names. The contract wins. The pin keeps nested launches on one binary and one store. Exact names avoid `.cmd`/`.bat` resolution, which goes through cmd.exe (BatBadBut).
4. **Host selection uses `RuntimeInformation.OSArchitecture` in a pure function, with musl as the Linux default.** Nothing parses the RID or probes for Rosetta or libc. Here the Python SDK's sysctl probe and HOME-only lookup are **not** copied.
5. **The bootstrap downloads the SDK's tested ocx version by default, never `latest`.** **Conflict:** Python's `ensure(version=None)` takes the channel's latest (`ocx-sdk-python@80136dde4162:src/ocx_sdk/_bootstrap.py:147-168`). The contract handshake checks exact per-command versions (ocx-cli-contract §5), so `latest` can fetch a binary the SDK refuses.
6. **Trust boundary: the sha256 of the whole archive, checked before any byte of it is parsed.** CRC32 and gzip are not integrity: `ZipArchive` accepted 19 of 20 corrupted real archives on .NET 8 and 10. Extraction streams one named member under a cap, and install is atomic into a version/triple directory.
7. **Build the package from properties and verify the artifact, not the exit code.**
   - Pack properties: the metadata block, `PublishRepositoryUrl`, snupkg symbols, `ContinuousIntegrationBuild` set only under `GITHUB_ACTIONS`, and `EnablePackageValidation`.
   - No SourceLink package, no strong naming, no hand-set versions.
   - Pack exits 0 on an anonymous, unlicensed package (NR V1). It also writes the nupkg when validation fails (NR V7).
8. **Versioning: MinVer from `v*` tags.** Release checkouts use `fetch-depth: 0`, and a guard checks that the packed version equals the tag.
9. **Publishing: NuGet Trusted Publishing (OIDC) only, from a tag-triggered, environment-gated job that pushes the artifacts it verified.** No author signing at v1. Both choices are owner-reversible (Owner decision 5).
10. **Conflict: symbols.** Embedded PDBs (DotNet.ReproducibleBuilds, 16 corpus repos) compete with snupkg (Polly, Serilog, 9 repos). snupkg wins for a nuget.org-only SDK: the nupkg is 6.7 KB against 21.2 KB, and nuget.org's symbol server indexes it (NR §4).
11. **Conflict: version tool.** Candidates were Nerdbank.GitVersioning (7 repos), GitVersion (5), MinVer (3), and Python's "tag equals file" check. MinVer wins: it reads the version from the tag, so there is no version file to drift (NR §6).

## The ruleset

Columns: **Sev** gives the severity. **Watched** says whether the verification went red on a planted defect and then green on the fixed twin. The value is the run that did it: NR Vn, BA row n, or "this" (this consolidation). "doc" means documentary only.
Commands assume the SDK layout `src/Ocx.Sdk`, `artifacts/` and `.github/workflows/release.yml`, with package ID `Ocx.Sdk` (the ID is Owner decision 5).

### Packaging and release (CS-PKG) — target: `dotnet-build/packaging.md`

**CS-PKG-01 (MUST) Declare the full metadata block once in `Directory.Build.props` and pack the readme.**
- **Block:** `Authors`, a non-default `Description`, an SPDX `PackageLicenseExpression`, `PackageReadmeFile`, `PackageProjectUrl`, `PackageTags`, `Copyright`.
- **Readme item:** `<None Include="$(MSBuildThisFileDirectory)README.md" Pack="true" PackagePath="" />`. Do the same for the icon if one is declared.
- **Rationale:** `dotnet pack` exits 0 with 0 warnings when all of it is missing and ships `<authors>Ocx.Sdk</authors><description>Package Description</description>`. It catches only declared-but-unpacked files (NU5039/NU5046/NU5030) (NR §1).
- **Verify:**

  ```sh
  p=$(ls artifacts/Ocx.Sdk.*.nupkg | grep -v -e '\.symbols\.nupkg$' | head -n 1)
  n=$(unzip -p "$p" '*.nuspec' | grep -c -E -e '<license type="expression">' -e '<readme>' -e '<projectUrl>' -e '<tags>' -e '<copyright>' -e '<repository type="git" url="https://[^"]+" .*commit="[0-9a-f]{40}"')
  test "$n" -eq 6 && ! unzip -p "$p" '*.nuspec' | grep -q -e '<description>Package Description</description>'
  ```
- **Watched:** this run, on NR's fixtures. `red-bare` gave `elements=0` and exit 1; `green-complete` gave `elements=6` and exit 0.

**CS-PKG-02 (MUST) Use no stale or redundant pack idioms, and set `<PublishRepositoryUrl>true</PublishRepositoryUrl>`.**
- **Banned:**
  - a `Microsoft.SourceLink.{GitHub,GitLab,AzureRepos.Git,Bitbucket.Git}` reference;
  - `PackageLicenseUrl` and `PackageIconUrl`;
  - `DeterministicTimestamp` set to `true`;
  - the pdb-in-nupkg `AllowedOutputExtensionsInPackageBuildOutputFolder` trick.
- **Rationale:**
  - SourceLink ships in SDK 8+ for these hosts, and a package reference overrides the bundled one (NR §2).
  - The URL properties are deprecated (NU5125/NU5048).
  - `DeterministicTimestamp=true` means the wall clock (NR V5).
  - The pdb trick makes `dotnet-validate` print `No files found to validate`: its checks are skipped, not passed (NR §4).
  - Without `PublishRepositoryUrl` the nuspec has a commit but no URL (NR §2).
- **Verify:**

  ```sh
  grep -rn -E --include='*.csproj' --include='*.props' --include='*.targets' -e 'Microsoft\.SourceLink\.(GitHub|GitLab|AzureRepos\.Git|Bitbucket\.Git)' -e 'Package(License|Icon)Url' -e 'DeterministicTimestamp>true' -e 'AllowedOutputExtensionsInPackageBuildOutputFolder' .
  ```

  This prints nothing. The repository-URL regex in CS-PKG-01 must match. For a hard gate, run the release pack with `-p:WarningsAsErrors=NU5124%3BNU5125%3BNU5048`.
- **Watched:** this run, `lint/check.sh` `PKG-config-bans`: FAIL on `bad/`, PASS on `good/`. NR V1 covers NU5125 as an error.

**CS-PKG-03 (MUST) Set `ContinuousIntegrationBuild` only as `<ContinuousIntegrationBuild Condition="'$(GITHUB_ACTIONS)' == 'true'">true</ContinuousIntegrationBuild>`.** Never set it unconditionally, never from `CI`, and never assume the SDK sets it.
- **Rationale:**
  - The SDK does not set it, even under `CI=true` or `GITHUB_ACTIONS=true` (NR V10).
  - Without it, the PDB maps absolute paths, `dotnet-validate` exits 1 with `Non deterministic`, and DLLs differ per checkout directory (NR V2, V4).
  - Setting it unconditionally breaks local source stepping.
  - **Conflict:** Polly uses `CI`, and Microsoft's docs use `TF_BUILD`. A developer shell that exports `CI=true` would flip local builds, so the provider variable wins.
- **Verify:**
  - `GITHUB_ACTIONS=true dotnet msbuild src/Ocx.Sdk -getProperty:ContinuousIntegrationBuild -p:TargetFramework=net10.0` prints `true`.
  - `env -u GITHUB_ACTIONS -u CI dotnet msbuild src/Ocx.Sdk -getProperty:ContinuousIntegrationBuild -p:TargetFramework=net10.0` prints an empty line.
  - `grep -rn --include='*.props' --include='*.targets' --include='*.csproj' -e '<ContinuousIntegrationBuild' . | grep -v 'Condition='` prints nothing.
- **Watched:** NR V2, V4 and V10, plus this run's `lint` `PKG-cib-unconditional`.

**CS-PKG-04 (MUST) Ship symbols as `<IncludeSymbols>true</IncludeSymbols><SymbolPackageFormat>snupkg</SymbolPackageFormat>`.**
- **Rationale:** the default format is `.symbols.nupkg`. nuget.org's symbol server rejects it, and the `*.nupkg` push glob pushes it as a second package (NR V6).
- **Verify:** `ls artifacts/Ocx.Sdk.*.snupkg && ! ls artifacts/*.symbols.nupkg 2>/dev/null`.
- **Watched:** NR V6.

**CS-PKG-05 (SHOULD) Pack releases as `SOURCE_DATE_EPOCH=$(git log -1 --format=%ct) dotnet pack ...` on SDK >= 10.0.401.**
- **Rationale:** a fixed timestamp is the only setting that gives byte-identical nupkg and snupkg across clones. SDK 8.0.425 ignores it, and 11.0 RC1 is still non-identical by default (NR V5).
- **Verify:** pack a fresh clone in a second directory, then `test "$(sha256sum artifacts/*.nupkg | cut -d' ' -f1)" = "$(sha256sum ../clone2/artifacts/*.nupkg | cut -d' ' -f1)"`.
- **Watched:** NR V5.

**CS-PKG-06 (MUST) Derive the version from the git tag with `<PackageReference Include="MinVer" Version="8.0.0" PrivateAssets="all" />` and `<MinVerTagPrefix>v</MinVerTagPrefix>`.** No project file sets `Version`, `VersionPrefix`, `PackageVersion`, `AssemblyVersion`, `FileVersion` or `InformationalVersion`.
- **Rationale:** one source of truth. MinVer sets `AssemblyVersion` to `{major}.0.0.0` (Microsoft guidance), and SourceLink appends `+commit` to InformationalVersion (NR §6, V8).
- **Verify:**

  ```sh
  grep -rn -E --include='*.csproj' --include='*.props' --include='*.targets' -e '<(Version|VersionPrefix|VersionSuffix|PackageVersion|AssemblyVersion|FileVersion|InformationalVersion)>' .
  ```

  This prints nothing. Central-package-management `<PackageVersion Include=...>` items do not match.
- **Watched:** this run, `lint` `PKG-hand-version` (`good/` carries a `Directory.Packages.props` to prove there is no false positive).

**CS-PKG-07 (MUST) Check out the release with `fetch-depth: 0` and fail when the packed version is not the tag.**
- **Rationale:** a shallow clone silently packs `0.0.0-alpha.0` (NR V8).
- **Verify:**
  - `grep -n -e 'fetch-depth: 0' .github/workflows/release.yml` hits.
  - In the job: `test "$(basename "$(ls artifacts/Ocx.Sdk.*.nupkg | grep -v -e '\.symbols\.nupkg$')" .nupkg)" = "Ocx.Sdk.${GITHUB_REF_NAME#v}"`.
- **Watched:** NR V8 (shallow red, then unshallow green) and this run's `lint` `PKG-fetch-depth`.

**CS-PKG-08 (MUST) Do not strong-name while every TFM is net8.0+.** No `.snk`, `SignAssembly`, `AssemblyOriginatorKeyFile` or `PublicSign`.
- **Rationale:**
  - Microsoft: "no benefits on .NET Core/5+".
  - Adding a key later is a breaking identity change.
  - The corpus's 22 of 35 `.snk` files all come with netstandard2.0/net4x targets (NR §7).
  - The rule flips to "strong-name all TFMs" if Owner decision 1 adds netstandard2.0.
- **Verify:** `git ls-files '*.snk'` prints nothing, and `grep -rn -E --include='*.csproj' --include='*.props' --include='*.targets' -e 'SignAssembly|AssemblyOriginatorKeyFile|PublicSign' .` prints nothing.
- **Watched:** the grep, in this run's `lint` `PKG-config-bans` (both rules share one ban line). The policy itself is doc.

**CS-PKG-09 (MUST) Set `<EnablePackageValidation>true</EnablePackageValidation>`, and gate on the pack exit code, never on the nupkg's existence.**
- **Baseline:** leave `PackageValidationBaselineVersion` unset until the first stable release. After that, set it to the latest stable version in the commit right after each release.
- **Rationale:**
  - A removed member is `error CP0002` and pack exits 1, but the nupkg is still written to `-o` (NR V7).
  - A baseline that is not yet published fails restore with NU1102.
- **Verify:**
  - `dotnet msbuild src/Ocx.Sdk -getProperty:EnablePackageValidation -p:TargetFramework=net10.0` prints `true`.
  - `grep -n -e 'continue-on-error' .github/workflows/release.yml` prints nothing.
- **Watched:** NR V7. Which diagnostics are errors belongs to `csharp-api-evolution-gates`.

**CS-PKG-10 (MUST) Every nupkg passes `dotnet tool run dotnet-validate package local <file>` with exit 0 before push.** The tool is pinned in `.config/dotnet-tools.json`; it is the separate `dotnet-validate` tool, not an SDK verb.
- **Rationale:** it is the only gate that checks Source Link, Deterministic and Compiler Flags together. It caught the missing CI flag and the unrecognised-remote defect (NR V2, V3).
- **Verify:**
  - `for p in artifacts/*.nupkg; do dotnet tool run dotnet-validate package local "$p" || exit 1; done`
  - `grep -n -e '"dotnet-validate"' .config/dotnet-tools.json`
- **Watched:** NR V2 and V3.

**CS-PKG-11 (MUST) Publish only through NuGet Trusted Publishing.**
- **Workflow shape:** `NuGet/login@<40-hex sha>` with `user:` set to the nuget.org profile name, not an email. `id-token: write` appears only on the publish job, and that job has `environment:`. No `NUGET_API_KEY` secret exists.
- **Rationale:** the temporary key lives 1 hour and is single-use, so there is nothing to leak. The Python SDK already uses PyPI OIDC (python-sdk-digest §7, `release.yml:14-73`).
- **Verify:**
  - `grep -rn -E -e 'secrets\.NUGET[A-Z_]*KEY' -e 'nuget push.*(-k|--api-key) +\$\{\{ *secrets' .github/workflows` prints nothing.
  - `grep -rn -E 'uses: *NuGet/login@' .github/workflows | grep -v -E 'NuGet/login@[0-9a-f]{40}'` prints nothing.
- **Watched:** this run, `lint` `PKG-api-key` and `PKG-login-unpinned`. The OIDC exchange itself is doc (nothing was pushed).

**CS-PKG-12 (MUST) Publish only from a `v*.*.*` tag, in a job that `needs:` the verify job, downloads its artifacts, and never rebuilds.** Push with `--skip-duplicate`.
- **Rationale:** nuget.org versions are immutable and undeletable (NR §1), so the checked bytes must be the pushed bytes. `--skip-duplicate` makes reruns idempotent.
- **Verify:**
  - `grep -rn 'dotnet nuget push' .github/workflows | grep -v -e '--skip-duplicate'` prints nothing.
  - `grep -c -e 'dotnet pack' .github/workflows/release.yml` prints `1`.
  - Reading heuristic: the publish job has `needs:` and `actions/download-artifact`.
- **Watched:** this run, `lint` `PKG-push-no-skip`.

**CS-PKG-13 (SHOULD) Do not author-sign at v1.** If signing is ever added, use SHA-256+ fingerprints, always pass `--timestamper`, and register a certificate on nuget.org only when every future push will be signed.
- **Rationale:**
  - Signing needs a CA certificate, Azure Key Vault and a Windows x64 runner (dotnet/sign).
  - Registering a certificate forces signing on every later push.
  - A SHA-1 fingerprint is error NU3043 on SDK 10.
  - nuget.org already countersigns every package (NR §9, V9).
- **Verify:** `grep -rn -E -e '--certificate-fingerprint +[0-9A-Fa-f]{40}( |$)' .github` prints nothing.
- **Watched:** NR V9, red only (no trusted certificate available).

**CS-PKG-14 (SHOULD) Readme images use absolute `https://` URLs on nuget.org's allow-listed hosts.**
- **Rationale:** relative or other-host images do not render, and fixing them needs a new version (NR §1).
- **Verify:** `grep -n -E -e '!\[[^]]*\]\((\./|\.\./|[^h])' README.md` prints nothing.
- **Watched:** doc.

**CS-PKG-15 (MUST, delivery models a and c) The SDK nupkg contains no ocx binary and stays under 5 MiB.**
- **Rationale:** all 8 binaries come to 91,600,345 bytes per ocx release, and the managed-only package is 3,269 bytes (BA F1).
- **Verify:**

  ```sh
  for p in artifacts/*.nupkg; do unzip -Z1 "$p" | grep -q -E -e '^runtimes/[^/]+/native/' -e '(^|/)ocx(\.exe)?$' && { echo "FAIL $p"; exit 1; }; done
  test "$(stat -c %s artifacts/Ocx.Sdk.*.nupkg | sort -n | tail -n 1)" -lt 5242880
  ```
- **Watched:** BA row 6.

### ocx binary acquisition (CS-BIN) — target: `csharp-quality` security and platform row

Gate configuration that CS-BIN-04, -10, -11, -12, -16 rely on:
- `<PackageReference Include="Microsoft.CodeAnalysis.BannedApiAnalyzers" Version="5.6.0" PrivateAssets="all" />`
- `<AdditionalFiles Include="BannedSymbols.txt" />`
- `.editorconfig`:

  ```ini
  [*.cs]
  dotnet_diagnostic.RS0030.severity = error
  dotnet_diagnostic.CA1416.severity = error
  dotnet_diagnostic.CA5350.severity = error
  dotnet_diagnostic.CA5359.severity = error
  dotnet_diagnostic.SYSLIB0014.severity = error
  ```

**CS-BIN-01 (MUST) Resolve the binary once to a rooted path and start only that path.**
- **Order:**
  1. the explicit argument;
  2. `OCX_SDK_EXE`;
  3. `OCX_BINARY_PIN`;
  4. PATH, using only rooted entries, the exact file name `ocx` or `ocx.exe`, never PATHEXT, and skipping group/other-writable directories on POSIX;
  5. `<home>/symlinks/ocx.sh/ocx/cli/current/content/bin/ocx[.exe]`;
  6. with model c only, and only when the caller opts in: `EnsureAsync`.
- An empty variable counts as unset. The process is never started as `ProcessStartInfo("ocx")`.
- **Rationale:**
  - .NET runs `./ocx` from the current directory before PATH on Linux and on Windows (BA row 13).
  - PATHEXT resolution can land on a `.cmd`, which runs through cmd.exe (ocx-cli-contract §6 BatBadBut).
  - ocx ships only `ocx.exe`.
- **Verify:** `rg -n -e 'ProcessStartInfo\(\s*"' -e 'Process\.Start\(\s*"' -e 'PATHEXT' src/` prints nothing. Add one unit test per tier asserting `Path.IsPathRooted(result)`.
- **Watched:** BA row 13 (cwd hijack: red on Linux and Windows, then green), plus this run's `lint` `BIN-bare-name` and `BIN-home-env`.

**CS-BIN-02 (MUST) Set `OCX_BINARY_PIN` in every spawned child's environment to the resolved path.**
- **Rationale:** ocx's launchers re-enter through the pin, so nested launches stay on one binary and one store (ocx-cli-contract §8.1; ocx `environment.md` › OCX_BINARY_PIN). The Python SDK does neither (rg: 0 hits in `ocx-sdk-python/src`).
- **Verify:** `rg -n 'OCX_BINARY_PIN' src/` finds both the read tier and the child-env write. Add a unit test on the fake spawner asserting the variable equals the pinned path.
- **Watched:** this run, `lint` `BIN-binary-pin` (presence only).

**CS-BIN-03 (MUST) Compute the ocx home as the non-empty `OCX_HOME` from the caller's environment snapshot, else `Path.Join(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".ocx")`.**
- **Rationale:** ocx uses `%USERPROFILE%` on Windows (ocx-cli-contract §3). The Python SDK reads `HOME` only, and HOME is unset on Windows (python-sdk-digest S7).
- **Verify:** `rg -n 'GetEnvironmentVariable\(\s*"HOME"\s*\)' src/` prints nothing.
- **Watched:** this run, `lint` `BIN-home-env`.

**CS-BIN-04 (MUST) Select the target with a pure function `(Host, Architecture osArch, Libc) -> triple`, fed by `RuntimeInformation.OSArchitecture`, and table-test it with at least 20 rows.**
- **Expected rows:**
  - Windows ARM64 maps to `aarch64-pc-windows-msvc`.
  - A 32-bit process on x64 Windows maps to `x86_64-pc-windows-msvc`.
  - macOS under Rosetta maps to `aarch64-apple-darwin`.
  - Anything else throws `PlatformNotSupportedException` naming the OS and architecture, and tells the caller to pass an explicit path. There is no fallback architecture.
- **Never use:** `ProcessArchitecture`, `Environment.Is64Bit*`, `RuntimeInformation.RuntimeIdentifier`, or a sysctl/Rosetta P/Invoke.
- **Rationale:** since .NET 7, `OSArchitecture` sees through Windows and macOS emulation, and the process view fails 4 of 20 rows. `RuntimeIdentifier` has been opaque since .NET 8 (BA F4).
- **Verify:**
  - `BannedSymbols.txt` line: `P:System.Runtime.InteropServices.RuntimeInformation.RuntimeIdentifier;opaque, select by OSArchitecture`.
  - `rg -n -e 'RuntimeInformation\.ProcessArchitecture' -e 'Environment\.Is64Bit(OperatingSystem|Process)' --glob '!**/Diagnostics*.cs' src/` prints nothing.
  - `dotnet test` runs the table on the `ubuntu-24.04-arm` and `windows-11-arm` legs as well (`rg -n -e 'ubuntu-24.04-arm' -e 'windows-11-arm' .github/workflows/`).
- **Watched:** BA row 3 (red 16/20, green 20/20, also on the Windows host), BA row 9 (RS0030) and BA lint G1.

**CS-BIN-05 (MUST) On Linux, default to `*-unknown-linux-musl` for both architectures, and use `*-gnu` only when the caller opts in.** Never probe for libc (`ldd`, `/etc/alpine-release`, `ld-musl`).
- **Rationale:** the musl build is static-pie and ran on Fedora glibc and on Alpine (BA F4, row 4).
- **Verify:** `rg -n -e 'RuntimeIdentifier\b' -e '\bldd\b' -e 'alpine-release' -e 'ld-musl' src/` prints nothing.
- **Watched:** BA lint G2.

**CS-BIN-06 (MUST) `EnsureAsync` with no version argument installs the SDK's compiled-in `TestedOcxVersion`.** `latest` is used only when the caller asks for it explicitly.
- **Rationale:** the handshake refuses any binary whose per-command contract differs from the generated one (ocx-cli-contract §5, §8.10). Python's `latest` default is the S13 drift (`_types.py:30` pins 0.6.2 while the live default is 0.6.5).
- **Verify:** a unit test with a fake manifest whose `latest` differs from `TestedOcxVersion` asserts that the tested version's URL was requested.
- **Watched:** doc.

**CS-BIN-07 (MUST) Hash the whole downloaded archive with SHA-256 and compare it to the validated manifest digest before opening it as an archive.**
- **Compare as bytes:** `CryptographicOperations.FixedTimeEquals(hash, Convert.FromHexString(expected))`. Never compare hex strings, and never use `Convert.ToHexStringLower`, which is .NET 9+.
- **Rationale:**
  - `ZipArchive` accepted 19 of 20 bit-flipped real archives on .NET 8 and 10, and 6 of 20 on 11 RC1.
  - A repacked valid tar.gz passes every format check.
  - `ToHexString` is uppercase, so `==` refused the genuine archive (BA F5, rows 2 and 14).
- **Verify:** `rg -n -e 'ToHexString\([^;]*\)\s*(==|!=)' -e '(==|!=)\s*Convert\.ToHexString' -e 'ToHexStringLower' src/` prints nothing. Add a flip-one-byte test that expects `ChecksumMismatchException` and leaves nothing in the cache.
- **Watched:** BA rows 2 and 14, and lint G3.

**CS-BIN-08 (MUST) Treat `dist.json` as untrusted input.**
- **Checks:**
  - Parse with `System.Text.Json`.
  - `schema` must be the integer 1.
  - Stream the body with a 1 MiB cap.
  - Names must match `\A[A-Za-z0-9._+-]+\z`, with `..` tested separately. Digests must match `\A[0-9a-f]{64}\z`. URLs must be https with no userinfo.
  - One invalid row fails the whole manifest.
- **Rationale:** in .NET, `$` accepts a trailing `\n` (BA row 11). The manifest picks the bytes that get executed.
- **Verify:** `rg -n -e '@?"\^[^"]*\$"' src/` prints nothing. Add tests for `schema: 2`, `schema: "1"`, `filename: "../x"`, `<64 hex>\n`, and a 1 MiB + 1 body.
- **Watched:** BA row 11 and lint G4.

**CS-BIN-09 (MUST) Require an explicit manifest digest whenever the manifest host is not `setup.ocx.sh` or a mirror is configured, and fail before any network I/O.**
- **Rationale:** TLS proves reachability, not authenticity (CWE-345; `_dist.py:611-653`).
- **Verify:** unit tests asserting that zero requests reach the fake handler.
- **Watched:** doc.

**CS-BIN-10 (MUST) Never call `TarFile.ExtractToDirectory`, `ZipFile.ExtractToDirectory` or `ZipFileExtensions.ExtractToDirectory`.**
- **How to extract instead:** stream exactly one regular-file member whose base name is `ocx` or `ocx.exe`, using `TarReader` or `ZipArchive`. Reject:
  - absolute names, `..` segments and backslashes;
  - links, devices and directories;
  - duplicates.
- **Never** write an archive name to disk.
- **Ban each overload:** the ban file must be named `BannedSymbols.txt` or `BannedSymbols.*.txt`, with **one `M:` line per overload, each with its full parameter list**.
- **Rationale:**
  - The stock extractors accept a 300 MiB bomb, follow a symlinked destination, and leave earlier members behind on failure (BA F7).
  - **Conflict with BA's claim that a parameterless `M:` line "matched nothing":** this run measured that it binds the parameterless overload only. `M:System.Net.Http.HttpContent.ReadAsStringAsync` fired on `ReadAsStringAsync()` but not on `ReadAsByteArrayAsync(CancellationToken)`, which is exactly the hole in BA's own `gate/BannedSymbols.txt`.
  - An `AdditionalFiles` entry with any other name bans nothing: 0 errors.
- **Verify:** add a canary file of banned calls built with `-p:Variant=Bad`. `dotnet build -p:Variant=Bad` must fail with RS0030, and `dotnet build -p:Variant=Good` must succeed.
- **Watched:** BA rows 1 and 9; this run's `banparams/` (noparams: 1 error, full: 2 errors) and `banname/` (`full.txt`: 0 errors).

**CS-BIN-11 (MUST) Cap while streaming, counting bytes actually read rather than trusting `Content-Length` or the declared entry `Length`.** Caps: manifest 1 MiB, archive 256 MiB, extracted member 256 MiB.
- **Ban the uncapped readers:** `HttpClient.GetByteArrayAsync`, `GetStringAsync`, `HttpContent.ReadAsByteArrayAsync` and `ReadAsStringAsync`, with every overload listed in `BannedSymbols.txt`.
- **Rationale:** the bomb case (BA F7 E) and Python parity (`_dist.py:67,70`).
- **Verify:** `rg -n -e 'GetByteArrayAsync|GetStringAsync|ReadAsByteArrayAsync|ReadAsStringAsync' src/` prints nothing. Add a bomb test expecting `InvalidDataException`.
- **Watched:** BA row 1 (E) and lint G11.

**CS-BIN-12 (MUST) Install into `<cache>/<ocx version>/<triple>/` without ever writing into or over a final path that may be running.**
- **Steps:**
  1. Create the temp file with `FileMode.CreateNew` in the target directory, using `UnixCreateMode = UserRead | UserWrite`.
  2. Call `File.SetUnixFileMode(tmp, UserRead | UserWrite | UserExecute)` behind `!OperatingSystem.IsWindows()`.
  3. `File.Move(tmp, final, overwrite: true)`.
  4. Write a sidecar `ocx.sha256` holding the digest of the extracted binary, and re-hash it on cache hits.
- **Rationale:**
  - Writing into a running binary fails with ETXTBSY on Linux and a sharing violation on Windows.
  - On Windows, a rename over a running `ocx.exe` throws `UnauthorizedAccessException` (BA row 12).
  - Re-hashing costs 12.6 ms for 25.4 MiB.
- **Verify:**
  - `rg -n -e 'File\.(WriteAllBytes|Copy|WriteAllText)\(' -e 'FileMode\.(Create|OpenOrCreate|Truncate)\b' src/Bootstrap/` prints nothing.
  - CA1416 is at error.
  - An install-twice test asserts zero downloads on the second call.
- **Watched:** BA rows 9 (CA1416) and 12, and lint G9.

**CS-BIN-13 (MUST) Choose and create the cache root safely.**
- **Root per OS:**
  - Windows: `%LOCALAPPDATA%\ocx-sdk`.
  - macOS: `~/Library/Caches/ocx-sdk`.
  - Linux: `$XDG_CACHE_HOME` or `~/.cache`, plus `/ocx-sdk`. Not `SpecialFolder.LocalApplicationData`, which is `~/.local/share` on Linux.
- **Creation:** create level by level with `Directory.CreateDirectory(path, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute)`.
- **Refusals:** refuse a root or level whose `DirectoryInfo.LinkTarget is not null`, and a root with group or other write. Do not check ancestors.
- **Rationale:**
  - The mode applies to the leaf only: parents came out 755 (BA F8).
  - `/home -> /var/home` is legitimate on Fedora Atomic.
- **Verify:** `rg -n 'Directory\.CreateDirectory\([^,()]*\)' src/Bootstrap/` prints nothing. Add POSIX tests for a symlinked root and a 0777 root.
- **Watched:** BA lint G10 and the `dirs/` fixture.

**CS-BIN-14 (MUST) Own exactly one `static readonly HttpClient` over `SocketsHttpHandler { PooledConnectionLifetime = ..., AllowAutoRedirect = false }`.**
- **Per request:** set `User-Agent: ocx-sdk-dotnet/<version>`, and bound each attempt with `new CancellationTokenSource(perAttemptBudget)` linked to the caller's token.
- **Proxy:** use the default only; add no SDK-specific proxy variables.
- **Rationale:**
  - A stalled body ran 4.0 s under `Timeout = 1 s`, so `HttpClient.Timeout` does not bound a streamed read.
  - The default client sends no User-Agent (BA row 8).
  - **Conflict:** Python says the CDN returns 403 without a User-Agent; BA could not reproduce that. Send the User-Agent to identify the SDK, not as a workaround.
- **Verify:** `test "$(rg -c 'new HttpClient\(' src/ | awk -F: '{s+=$2} END {print s+0}')" -le 1`, and add a stalled-server test.
- **Watched:** BA row 8 and lint G6.

**CS-BIN-15 (MUST) Follow redirects by hand.**
- **Limits:** at most 5 hops, https only, no userinfo.
- **Credentials:** attach them only when scheme, host and port equal the origin they were issued for. Never put a secret in `DefaultRequestHeaders`.
- **Rationale:** the default handler strips only the typed `Authorization` header. `X-Ocx-Token` reached the other origin (BA row 7).
- **Verify:**
  - `rg -n 'AllowAutoRedirect\s*=\s*false' src/` matches.
  - `rg -n 'DefaultRequestHeaders\.(Add|TryAddWithoutValidation|Authorization)' src/` prints nothing.
- **Watched:** BA row 7 and lint G7/G8.

**CS-BIN-16 (MUST) Never disable TLS validation, and never use `WebClient`, `WebRequest`, `HttpWebRequest` or `ServicePointManager`.**
- **Custom CA:** it replaces trust through `SslOptions.CertificateChainPolicy` with `X509ChainTrustMode.CustomRootTrust`.
- **Rationale:** TLS is the only authenticity the manifest has (Verdict 6).
- **Verify:**
  - `BannedSymbols.txt` line: `P:System.Net.Http.HttpClientHandler.DangerousAcceptAnyServerCertificateValidator`.
  - CA5359 and SYSLIB0014 are at error.
  - `rg -n -e 'CertificateCustomValidationCallback' -e 'RemoteCertificateValidationCallback' src/` prints nothing.
- **Watched:** BA row 9 (Bad and Legacy: RS0030, CA5359, SYSLIB0014 ×3; Good: 0).

**CS-BIN-17 (MUST) Never run a downloaded installer script, and never shell out to `chmod`, `curl` or `Invoke-WebRequest`.**
- **Rationale:** Pulumi runs `install.sh` and `install.ps1` with no digest check (`pulumi__pulumi-dotnet@2a0dca84f09b:sdk/Pulumi.Automation/Commands/LocalPulumiCommand.cs:152,190,228`).
- **Verify:** `rg -n -i -e 'install\.(sh|ps1)' -e 'ExecutionPolicy' -e '"chmod"' -e 'curl ' -e 'Invoke-WebRequest' src/` prints nothing.
- **Watched:** BA lint G5.

**CS-BIN-18 (SHOULD) Retry only transport failures: resets, timeouts, truncated bodies, 429 and 5xx.**
- **Never retry:** 401/403/404, a size-cap abort, or a checksum mismatch.
- **Each attempt** starts by discarding the previous partial file.
- **Rationale:** wrong bytes are not late bytes (`_dist.py:778-795`).
- **Verify:** classifier unit tests, one per class.
- **Watched:** doc.

**CS-BIN-19 (MUST, delivery model b only) Lay out the native package with one explicit item per file, for example `<None Include="native/linux-x64/ocx" Pack="true" PackagePath="runtimes/linux-x64/native/" />`.**
- **Directories:** six RID directories (`linux-x64`, `linux-arm64`, `osx-x64`, `osx-arm64`, `win-x64`, `win-arm64`). The static **musl** binary goes under both `linux-*` directories.
- **Resolver:** probe `AppContext.BaseDirectory` first, then `runtimes/<rid>/native/`.
- **Exec bit:** re-apply it with `File.SetUnixFileMode` before the first start.
- **Rationale:**
  - A `%(RecursiveDir)` glob doubles the RID segment, and extensionless files are treated as directories.
  - A RID-specific publish flattens the binary into the app root.
  - The exec bit is lost through zip or Windows hosts (BA F9).
  - **Conflict with the contract §5 table (gnu under linux-x64):** this run measured `-r linux-musl-x64` and `-r linux-musl-arm64` publishes picking up `runtimes/linux-{x64,arm64}/native/ocx` (PRESENT), while a `linux-musl-*`-only package is ABSENT from `-r linux-x64` and `-r linux-arm64`. One static binary per architecture therefore serves both libcs, with no duplication.
- **Verify:** `unzip -Z1 artifacts/Ocx.Sdk.Native.*.nupkg | grep -c -E '^runtimes/(linux|osx|win)-(x64|arm64)/native/ocx(\.exe)?$'` prints `6`. Also run publish tests for `-r linux-x64`, `-r linux-musl-x64` and `-r win-x64`, each asserting the binary is present.
- **Watched:** this run's `ridfallback2/` (musl-only package: ABSENT for linux-x64 and linux-arm64; static binary under `linux-*`: PRESENT for all four RIDs). BA rows 4 and 5 cover the exec bit and the glob.

### dotnet-release procedure (skill steps; each step's check fails the job)

| # | Step and command | Check |
|---|---|---|
| R1 | `actions/checkout@<sha>` with `fetch-depth: 0`, `persist-credentials: false` | `test "$(git rev-parse --is-shallow-repository)" = false && git describe --tags --exact-match` (CS-PKG-07) |
| R2 | `actions/setup-dotnet@<sha>` with `global-json-file: global.json` (newest SDK, never the floor: SDK 8 fails NETSDK1045 on net10.0 and ignores `SOURCE_DATE_EPOCH`) | `test "$(dotnet --version)" = "$(python3 -I -c 'import json;print(json.load(open("global.json"))["sdk"]["version"])')"` |
| R3 | `dotnet restore --locked-mode` | exit 0 |
| R4 | `dotnet build -c Release --no-restore` and `dotnet test -c Release --no-build` | exit 0 |
| R5 | `SOURCE_DATE_EPOCH=$(git log -1 --format=%ct) dotnet pack src/Ocx.Sdk -c Release -o artifacts --no-build` (`GITHUB_ACTIONS=true` is set by the runner) | exit code 0, which includes CP#### package validation (CS-PKG-09); `ls artifacts/*.snupkg` (CS-PKG-04) |
| R6 | version/tag consistency | the CS-PKG-07 `test` line; `! ls artifacts/Ocx.Sdk.0.0.0*` |
| R7 | metadata completeness | CS-PKG-01 nuspec check; CS-PKG-15 no-binary check |
| R8 | provenance | `dotnet tool restore && for p in artifacts/*.nupkg; do dotnet tool run dotnet-validate package local "$p" \|\| exit 1; done` (CS-PKG-10) |
| R9 | reproducibility (separate job, fresh clone, other directory, same command as R5) | equal `sha256sum` of the two nupkgs (CS-PKG-05) |
| R10 | `actions/upload-artifact` of `artifacts/`; optional `actions/attest-build-provenance` on `artifacts/*.nupkg` | job green |
| R11 | publish job: `environment: nuget.org`, `permissions: {id-token: write, contents: read}`, `needs: [verify, reproduce]`, `actions/download-artifact`, `NuGet/login@<sha>`, `dotnet nuget push "artifacts/*.nupkg" --skip-duplicate --api-key "${{ steps.login.outputs.NUGET_API_KEY }}" --source https://api.nuget.org/v3/index.json` | exit 0; the log names the nupkg and the snupkg (CS-PKG-11, -12) |
| R12 | post-publish (poll up to 15 min for symbol indexing) | `dotnet tool run dotnet-validate package remote Ocx.Sdk -v "${GITHUB_REF_NAME#v}"` exits 0; `curl -sL -o s.snupkg "https://www.nuget.org/api/v2/symbolpackage/Ocx.Sdk/${GITHUB_REF_NAME#v}" && unzip -q -o s.snupkg -d sp && dotnet tool run sourcelink test sp/lib/net8.0/Ocx.Sdk.pdb` prints `sourcelink test passed` (NR V11) |
| R13 | next commit: set `PackageValidationBaselineVersion` to the released version | `dotnet msbuild src/Ocx.Sdk -getProperty:PackageValidationBaselineVersion -p:TargetFramework=net10.0` equals `git describe --tags --abbrev=0 \| tr -d v` |
| R14 | once, after the first publish: owner applies for the ID prefix | `curl -s 'https://azuresearch-usnc.nuget.org/query?q=packageid:Ocx.Sdk&take=1' \| python3 -I -c "import sys,json;print(json.load(sys.stdin)['data'][0].get('verified'))"` prints `True` |

## Applied to the ocx C# SDK

**New commitments (the SDK design must change for these):**
- **Two public types.**
  - `OcxLocator.Discover(options)` is synchronous and does no network I/O. It resolves the five-tier order (CS-BIN-01) and returns a rooted path.
  - `OcxBootstrap.EnsureAsync(options, CancellationToken)` is the model c download. It returns a rooted path and defaults to `TestedOcxVersion` (CS-BIN-06).
  - The client takes a path. It never searches by itself, and it sets `OCX_BINARY_PIN` on every child (CS-BIN-02).
- **Two `public const string`s:** `TestedOcxVersion` drives the bootstrap default, and the CI contract tier provisions the same version (the C# equivalent of Python's `test_version_matches_the_tested_pin`).
- **CI matrix proves arm64.** Add `ubuntu-24.04-arm` and `windows-11-arm` legs running the RID table and a bootstrap smoke test (CS-BIN-04). This fixes python-sdk-digest S6.
- **Repository files from day one:** `BannedSymbols.txt` with every overload (CS-BIN-10, -11, -16), the `.editorconfig` severity lines above, a `Variant=Bad` analyzer canary project, and `.config/dotnet-tools.json` pinning `dotnet-validate` and `sourcelink`.
- **A release workflow shaped by R1-R14:** a two-job split (verify and publish) and a separate reproduction job.

**Already modelled by the Python SDK (port as-is; python-sdk-digest §5, §7):**
- the locate ladder `exe` → `OCX_SDK_EXE` → PATH → `$OCX_HOME` symlink (`_bootstrap.py:245-292`);
- musl as the Linux default, through the pure `uname_to_triple` (`:106-144`);
- the manifest as untrusted input: caps of 1 MiB and 256 MiB, and the regex field validation (`_dist.py:67,70,91-100,704-735`);
- the off-canonical-host digest requirement (`:611-653`);
- single-member extraction (`_bootstrap.py:718-874`);
- an atomic publish plus the sidecar digest (`:589-628`);
- origin-bound credentials and manual redirects capped at 5 hops;
- no retry on a checksum mismatch;
- the tag-triggered OIDC release (`release.yml:14-73`).

**Forced by the ocx CLI contract (ocx-cli-contract):**
- §8.1: `OCX_BINARY_PIN`, both read and propagated; rooted PATH entries; exact `ocx`/`ocx.exe`.
- §3 and §8.12: the home is `$OCX_HOME`, else `~/.ocx` on every OS, which means `%USERPROFILE%` on Windows.
- §5: the 8 dist targets, with no win-x86 or 32-bit Linux. Exact contract equality means the bootstrap must pin the tested version.
- §6: no shell launching (BatBadBut).

**Do NOT copy from the Python SDK:**
- the Rosetta `sysctl.proc_translated` ctypes probe: `OSArchitecture` already reports Arm64 (BA F4);
- the `HOME`-only home tier (S7);
- the missing `OCX_BINARY_PIN` support;
- PATHEXT-driven `shutil.which` on Windows;
- `ensure(version=None)` taking `latest` (S13);
- the absence of arm64 CI legs (S6);
- the root `st_uid` ownership check. .NET 8 and 10 have no managed owner or uid accessor (BA F8), so the SDK skips it and documents the gap on the bootstrap type. Do not hand-roll a `stat` struct P/Invoke (see Open questions);
- the claim that the User-Agent is required to avoid a CDN 403 (not reproduced; BA F6).

**Delivery-model trade-off (pending Owner decision 3):**

| Model | Cost (measured) | Failure mode | Rules that apply |
|---|---|---|---|
| (a) locate only | 0 bytes, no trust surface | a fresh CI runner or container has no ocx; the user must install it | CS-BIN-01..05, CS-PKG-15 |
| (b) bundle per-RID binaries (one native package, 6 RID dirs, static musl under `linux-*`) | raw binaries 152,638,224 bytes for the 6 (BA F4 sizes); all-8 package measured at 91,600,345 bytes; repeated on every ocx release; every restore extracts it | exec bit lost through zip or Windows hosts; publish flattens into the app root; nuget.org size cap ~250 MB; the SDK must release for each ocx release | CS-BIN-01..04, CS-BIN-19 |
| (c) download on first use, sha256-verified (recommended, with a) | 86 KB manifest + ~11 MB archive once per (version, target) | needs network once; trust = TLS to `setup.ocx.sh` plus a same-origin digest (no signature, S14) | CS-BIN-01..18, CS-PKG-15 |

## AI-agent failure modes

Ranked by how often an agent produces the defect unprompted. The rank is a judgement from the AI-agent tables in NR and BA, weighted by how much of the habit's training-era prevalence the 35-repo corpus shows.

1. **A csproj with only `<TargetFramework>`, or with `PackageLicenseUrl`/`PackageIconUrl`.** Pack exits 0. Caught by the CS-PKG-01 nuspec check and the CS-PKG-02 grep.
2. **Adds `Microsoft.SourceLink.GitHub`, often a pinned 1.1.1 or without `PrivateAssets`.** Caught by the CS-PKG-02 grep.
3. **`secrets.NUGET_API_KEY` with `dotnet nuget push -k`; `NuGet/login@v1` by tag; `user:` set to an email.** Caught by the CS-PKG-11 greps.
4. **A hand-set `<Version>`, or a version tool with a shallow checkout that packs `0.0.0-alpha.0`.** Caught by the CS-PKG-06 grep and the CS-PKG-07 guard.
5. **`RuntimeInformation.ProcessArchitecture` or `RuntimeIdentifier` parsing to pick the binary.** It passes on every non-emulated runner. Caught by the BannedSymbols `P:` line, lint G1 and the 20-row table.
6. **`TarFile.ExtractToDirectory` / `ZipFile.ExtractToDirectory`, justified by ".NET guards `../`".** The traversal test is green, but the bomb and symlink-destination cases are not. Caught by RS0030 with full parameter lists, plus the bomb test.
7. **`new HttpClient()` per call, `HttpClient.Timeout` treated as the download deadline, and `GetByteArrayAsync`.** Caught by lint G6, RS0030 and the stalled-server test.
8. **`Convert.ToHexString(hash) == expected`, or the invented `Convert.ToHexStringLower` on net8.** Caught by the CS-BIN-07 rg and the `net8.0` build leg (CS0117).
9. **`Process.Start("ocx")` "after checking PATH".** Caught by the CS-BIN-01 rg and the rooted-path test.
10. **`IncludeSymbols` without `snupkg`, or the pdb-in-nupkg trick copied from Polly/NodaTime.** Caught by CS-PKG-04 `ls` and the CS-PKG-02 grep.
11. **`ContinuousIntegrationBuild` set unconditionally, or believed to be set by the SDK.** Caught by the CS-PKG-03 getProperty pair.
12. **`File.WriteAllBytes(final, ...)` followed by `Process.Start("chmod", ...)`.** Caught by lint G9, lint G5, CA1416 and the install-twice test.
13. **`^...$` validation regexes.** Caught by lint G4 and the trailing-LF test.
14. **`SignAssembly` plus a generated `.snk` "for NuGet".** Caught by the CS-PKG-08 grep.
15. **A BannedSymbols file that is silent: parameterless lines, a non-`BannedSymbols*` file name, or RS0030 left at warning.** Caught by the `Variant=Bad` canary build, which must fail (CS-BIN-10).
16. **Ships all 8 binaries under `runtimes/*/native` in the SDK package, or only under `linux-musl-*`.** Caught by CS-PKG-15, the CS-BIN-19 count, and the `-r linux-x64` publish test.
17. **A credential in `DefaultRequestHeaders` on an auto-redirecting client.** Caught by lint G7 and the redirect-leak test.
18. **`HOME` read on Windows, `SpecialFolder.LocalApplicationData` used as the Linux cache, `Directory.CreateDirectory(path)` with no mode.** Caught by the CS-BIN-03 rg and lint G10.
19. **`DeterministicTimestamp=true` presented as "reproducible packages".** Caught by the CS-PKG-05 two-clone `sha256sum`.
20. **`PackageValidationBaselineVersion` set to the version being released at v1.0.0 (NU1102), or gating on `ls *.nupkg`.** Caught by CS-PKG-09.
21. **Signing with a SHA-1 thumbprint or a self-signed certificate, or calling `dotnet validate` an SDK verb.** Caught by the CS-PKG-13 grep and the pinned tool manifest.

## Failure classes

| Class (mechanism) | Members (failure-mode #) | Check that catches the class |
|---|---|---|
| **Silent acceptance by the toolchain.** The tool exits 0, and the defect shows only in the produced artifact. | 1, 4, 10, 11, 15, 16, 20 | Assert on the artifact, never on the exit code or file existence: nuspec grep, `unzip -Z1` listing, getProperty, the `Variant=Bad` canary that must fail, publish-per-RID tests |
| **Process or runtime view mistaken for the host view.** | 5, 18 | A pure-function table over (OS, OS-arch, process-arch, libc) run on arm64 legs; RS0030 on `RuntimeIdentifier`; rg on `HOME`/`ProcessArchitecture` |
| **Framework-era or stale idiom.** | 1, 2, 14, 21, and CS-BIN-16's WebClient/ServicePointManager | A config ban grep (CS-PKG-02/08) plus SYSLIB0014 at error |
| **Trusting a format or transport layer as integrity.** | 6, 8, 13, and TLS treated as authenticity off-canonical | A flip-one-byte test against a real archive; byte compare; `\A...\z`; a digest required off-canonical (CS-BIN-07..09) |
| **Convenience API with no bound.** | 6, 7, 17, and `CreateDirectory` with leaf-only mode | RS0030 with one line per overload, plus bomb, stall and redirect tests |
| **Non-atomic mutation of a path that may be in use.** | 12 | lint G9, CA1416 at error, the install-twice-while-running test |
| **Long-lived or forwardable secrets.** | 3, 17 | Workflow greps (CS-PKG-11), the origin-bound credential test |
| **Unverified reproducibility claims.** | 19 | A second clone in another directory with equal `sha256sum` |

## Open questions

**Owner decisions (cannot be closed by research):**
1. **Delivery model (map Owner decision 3).** The recommendation is (a) plus (c). Choosing (b) activates CS-BIN-19, makes every ocx release an SDK release, and adds 150+ MB per ocx version.
2. **Consumer reach (Owner decision 1).** Adding netstandard2.0 flips CS-PKG-08 to "strong-name every TFM, key fixed forever", and must be decided before the first publish.
3. **Publishing identity (Owner decision 5).** Needed: the package ID and root namespace (this file assumes `Ocx.Sdk`), the nuget.org organisation, the Trusted Publishing policy (owner, repo, `release.yml`, environment `nuget.org`), the ID-prefix application, and a yes/no on author signing. The default here is no (CS-PKG-13).
4. **Contract baseline (Owner decision 4).** `TestedOcxVersion` must be an ocx release that carries `contract`. No such release exists yet (ocx-cli-contract §0), so CS-BIN-06's default currently points at a binary the handshake refuses.
5. **Windows ARM64 binary.** The native `aarch64` build is chosen; flipping it to x64 under emulation is one table row (BA F4).

**Subareas that deserve ANOTHER research round:**
- **`csharp-packaging-ocx-binary-acquisition` (macOS leg):** no macOS host was available.
  - Measure `OSArchitecture` under Rosetta, the exec bit after NuGet extraction, and `~/Library/Caches` behaviour on a `macos-latest` runner.
  - Run the 20-row table on real `windows-11-arm` and `ubuntu-24.04-arm` runners.
- **`csharp-packaging-nuget-release` (first publish under Trusted Publishing):** can a policy scoped to a not-yet-existing package ID publish v0.1.0?
  - The new-package scope is documented but was never exercised.
  - The same round should confirm the current prefix-reservation channel (the docs page dates from 2022).
- **Static musl on glibc hosts:** does the musl build's resolver diverge from glibc NSS (`nsswitch.conf`, LDAP/sssd hosts, corporate DNS)? This is unmeasured (BA Contested) and decides whether the musl default needs a documented exception.
- **Cache-root ownership:** is a `geteuid()` + `stat` check worth a P/Invoke? `geteuid` has no struct, but `stat` layouts differ per OS and architecture. Alternatively, accept the documented gap. Python checks ownership; C# currently cannot.
- **.NET 11 GA re-measure (Nov 2026):**
  - ZipArchive CRC verification (RC1 catches 14 of 20 flips).
  - Pack `DeterministicTimestamp` defaults (RC1 is still non-identical).
  - `TarExtractOptions`/`ZipExtractionOptions` as a possible relaxation of CS-BIN-10, once the floor moves past net10.

## Sub-artifacts

- [csharp-packaging/csharp-packaging-nuget-release.md](csharp-packaging/csharp-packaging-nuget-release.md): pack metadata enforcement, SourceLink in SDK 8+, CI-flag determinism, snupkg, nupkg reproducibility, MinVer, strong naming, Trusted Publishing, author signing, package validation and prefix reservation; V1-V11 fixtures.
- [csharp-packaging/csharp-packaging-ocx-binary-acquisition.md](csharp-packaging/csharp-packaging-ocx-binary-acquisition.md): delivery-model costs, the RID-to-triple table, OSArchitecture semantics, digest-before-parse, extraction hazards, atomic install, cache root, HttpClient transport, and per-RID packaging traps; 14 red/green fixtures.

## Key sources

1. https://learn.microsoft.com/en-us/nuget/reference/msbuild-targets: pack properties, `PackagePath` rules, `DeterministicTimestamp`/`SOURCE_DATE_EPOCH` (NuGet 7.9).
2. https://learn.microsoft.com/en-us/nuget/nuget-org/trusted-publishing: OIDC policy fields, the 1-hour single-use key, scopes.
3. https://github.com/NuGet/login: the action's inputs, outputs and permissions.
4. https://raw.githubusercontent.com/dotnet/sourcelink/main/README.md: hosts bundled in SDK 8+, the PDB distribution comparison.
5. https://learn.microsoft.com/en-us/nuget/create-packages/symbol-packages-snupkg: snupkg constraints and nuget.org symbol-server rules.
6. https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/package-validation/overview: `EnablePackageValidation` and the baseline validator.
7. https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/strong-naming: "no benefits on .NET Core/5+".
8. https://raw.githubusercontent.com/adamralph/minver/main/README.md: the version algorithm, the AssemblyVersion policy, the shallow-clone fallback.
9. https://learn.microsoft.com/en-us/dotnet/core/compatibility/interop/7.0/osarchitecture-emulation: why `OSArchitecture` is the selector.
10. https://learn.microsoft.com/en-us/dotnet/core/compatibility/core-libraries/8.0/runtimeidentifier: `RuntimeIdentifier` is opaque.
11. https://learn.microsoft.com/en-us/dotnet/api/system.formats.tar.tarfile.extracttodirectory?view=net-10.0: no size cap, link-following destination.
12. https://learn.microsoft.com/en-us/nuget/create-packages/native-files-in-net-packages: `runtimes/<rid>/native` selection and flattening.
13. https://learn.microsoft.com/en-us/dotnet/fundamentals/networking/http/httpclient-guidelines: one client plus `PooledConnectionLifetime`.
14. https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/System.Net.Http/src/System/Net/Http/SocketsHttpHandler/RedirectHandler.cs: which headers survive a redirect.
15. https://setup.ocx.sh/dist.json: the ocx dist manifest (schema 1, 8 targets), ground truth for CS-BIN-04..09.
