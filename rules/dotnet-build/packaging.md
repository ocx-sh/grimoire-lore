---
# Read on demand through the index. This glob matches no file, so a client never auto-loads the file.
paths:
  - "**/.dotnet-build-depth-on-demand"
title: Packaging
summary: The CS-PKG rows for a library nupkg, owning the metadata block, SourceLink and CI-build properties, symbols, deterministic packing, tag-derived versions, strong-naming policy, package validation, dotnet-validate, Trusted Publishing and the tag-only push, author signing, readme images and the no-tool-binary budget
---

# Packaging

Binds to .NET SDK 10.0.401 with NuGet 7.9.0 on Linux x64 (measured 2026-10-11), MinVer 8.0.0 and `dotnet-validate`
0.0.1-preview.582, every pack watched on `net8.0;net10.0`. SDK 8.0.425 and 11.0 RC1 appear only where a row names them.
Windows, macOS and arm64 behaviour is `unverified: read only`, and so is every nuget.org write path (the push, the
Trusted Publishing exchange, prefix reservation): nothing was pushed.

Owns CS-PKG-01 to CS-PKG-16, the pack properties and publish gates of a library nupkg. The release procedure that
runs these rows in order is the `dotnet-release` skill. The SDK-pin, central-package and nuspec-budget rows are
CS-BUILD-21, CS-BUILD-23 and CS-SEC-09, and the build-only package rule is CS-SEC-10. Every row binds `[packable-library]`
repositories and CS-PKG-11 and 12 also `[gha]` (tags: `csharp-quality` Conventions); a tool, sample or test project in the same
repository is outside them, and a repository whose versioning belongs to Nuke, Arcade, `version.json`, GitVersion (a semantic-version action
passing `-p:PackageVersion`: CsvHelper) or a hand-set `VersionPrefix` with a CI build number (CommandLineUtils) replaces CS-PKG-06 and 07
when it says so in one line. CS-PKG-15 binds `[cli-wrapper]` libraries, the ones that wrap a native tool. Besides the dedicated tag workflow two
release shapes are real, and CS-PKG-11 and 12 give the form of each: a combined workflow (CI and release jobs in one file, the release job gated by
an `if:` on a tag or a dispatch input: CommandLineUtils) and a delegated releaser (`dotnet-releaser`, a Cake target or a reusable workflow packs and
pushes outside the file: markdig, Ocelot). `PRJ`, `PACK` and `TOOL` (Conventions) name the project, the packable project and the wrapped tool in
every command.

Contents: [How to Run the Cells](#how-to-run-the-cells) · [Metadata and Symbols](#metadata-and-symbols) ·
[Source Link and Determinism](#source-link-and-determinism) · [Version](#version) · [Gates Before the Push](#gates-before-the-push) ·
[Publishing](#publishing) · [Agent Errors](#what-agents-get-wrong-here)

## How to Run the Cells

A `grep` check prints its violation, so empty output is the pass (grep exits 1 on no match, ignore it); a presence
check is labelled. Run each from the repository root, the one cwd, after `dotnet pack "${PACK:?MISSING PACK}" -c Release -o artifacts` (the project, never the `.slnx`: CS-BUILD-29) where the row needs
the nupkg, and wrap every `dotnet` call per DN-RULE-01 (cells show the bare command). A missing operand prints `MISSING <x>`
and fails: set `CIF`, `PRJ`, `PACK`, `TOOL` (Conventions) and `REL`, your release workflow, where a cell names them. `dotnet pack` exits 0 on an
anonymous, unlicensed package and writes the nupkg even when package validation fails (measured 2026-10-11), so every
row asserts on the artifact or the exit code, never on the nupkg existing.

## Metadata and Symbols

Gate: block `nuspec-meta`, then blocks `config-bans` and `symbols`.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CS-PKG-01 | Declare the full metadata block once in `Directory.Build.props`: `Authors`, a non-default `Description`, an SPDX `PackageLicenseExpression`, `PackageReadmeFile`, `PackageProjectUrl`, `PackageTags`, `Copyright`. Pack the readme with `<None Include="$(MSBuildThisFileDirectory)README.md" Pack="true" PackagePath="" />`, and the icon the same way when one is declared. | `dotnet pack` exits 0 with 0 warnings when all of it is missing and ships `<authors>` set to the package ID and `<description>Package Description</description>`. It catches only a declared file that is not packed (`NU5039` readme, `NU5046` icon, `NU5030` license file). | Block `nuspec-meta` exits 0. Watched red and green (measured 2026-10-11, SDK 10.0.401): the bare tree gave 0 of 6 elements and exit 1, the complete tree 6 of 6 and exit 0. nuget.org itself accepts the bare package (read 2026-10-11). | MUST |
| CS-PKG-02 | Set `<PublishRepositoryUrl>true</PublishRepositoryUrl>` and reference no SourceLink package: no `Microsoft.SourceLink.*`, no `PackageLicenseUrl` or `PackageIconUrl`, no `DeterministicTimestamp` set to `true`, no `GeneratePackageOnBuild` (CS-PKG-16) and no `AllowedOutputExtensionsInPackageBuildOutputFolder` pdb trick. Embedded symbols (`<DebugType>embedded</DebugType>`, CS-PKG-04) are the sanctioned form when no snupkg ships. | SDK 8+ bundles SourceLink for GitHub, GitLab, Azure Repos and Bitbucket, and a package reference overrides the bundled one. The URL properties warn `NU5125` and `NU5048` and ship. `DeterministicTimestamp=true` means the wall clock (measured 2026-10-11). The pdb trick adds a loose `.pdb` per TFM to the nupkg that nuget.org's symbol server never reads, and makes `dotnet-validate` print `No files found to validate`, so its checks are skipped, not passed; an embedded PDB validates (Source Link, Deterministic and Compiler Flags each `Valid`, measured 2026-10-11). Without `PublishRepositoryUrl` the nuspec has a commit but no URL. | Block `config-bans`, first command (empty output = pass); the `repository` element in block `nuspec-meta` must match. For a hard gate pack with `-p:WarningsAsErrors=NU5124%3BNU5125%3BNU5048`. Watched red and green (measured 2026-10-11): a `PackageLicenseUrl` plus a `Microsoft.SourceLink.GitHub` reference printed 2 lines, the complete tree none, and a blank `<PackageLicenseUrl></PackageLicenseUrl>` or a `<PackageReference Remove="Microsoft.SourceLink.GitHub" />` printed none (only a non-empty value or an `Include=` is a defect). | MUST |
| CS-PKG-04 | Ship symbols with `<IncludeSymbols>true</IncludeSymbols>` and `<SymbolPackageFormat>snupkg</SymbolPackageFormat>`, or embed them with `<DebugType>embedded</DebugType>` and set neither. | The default format is `.symbols.nupkg`, which nuget.org's symbol server rejects, and the `*.nupkg` push glob pushes it as a second package. An embedded PDB makes the dll larger and needs no second artifact; it is the form to pick over the pdb-in-nupkg trick (CS-PKG-02). | Block `symbols` exits 0. Watched red and green (measured 2026-10-11): `symbols.nupkg` format exited 1, the snupkg tree and the `embedded` tree (pack exit 0, three `Valid` lines from `dotnet-validate`) exited 0. | MUST |
| CS-PKG-14 | Readme images use absolute `https://` URLs on nuget.org's allow-listed hosts (`img.shields.io` and `raw.githubusercontent.com` are on the list). | A relative or other-host image does not render on nuget.org, and fixing it needs a new version because versions are immutable. | Block `readme-images` (empty output = pass). The host list itself is a reading heuristic (`unverified: read only`). Watched red and green (measured 2026-10-11): 3 relative or `http:` images printed 3 lines, the shields badge none. | SHOULD |
| CS-PKG-16 | Leave `GeneratePackageOnBuild` unset: pack is its own step, `dotnet pack "$PACK" -c Release -o artifacts`. | With it `true`, `dotnet pack` on a clean tree exits 1 with `error NU5026: The file ... Pkg.Lib.dll to be packed was not found on disk` and writes no nupkg, and every `dotnet build` writes a nupkg (measured 2026-10-11, SDK 10.0.401; ardalis/GuardClauses hit it on 5 of 5 clean packs). | Block `config-bans`, first command (empty output = pass). Watched red and green (measured 2026-10-11): a project with the property exited 1 with `NU5026` and printed its line, the complete tree none. On an `NU5026` symptom read the `dotnet-diagnose` skill. | SHOULD |

```sh
# nuspec-meta (CS-PKG-01): exit 0 = all six elements, a real description and an author that is not the package ID
p=$(ls artifacts/*.nupkg | head -n 1)
n=$(unzip -p "$p" '*.nuspec' | grep -c -E -e '<license type="expression">' -e '<readme>' -e '<projectUrl>' -e '<tags>' -e '<copyright>' -e '<repository type="git" url="https://[^"]+" .*commit="[0-9a-f]{40}"')
test "$n" -eq 6 && ! unzip -p "$p" '*.nuspec' | grep -q -e '<description>Package Description</description>' && unzip -p "$p" '*.nuspec' | xmllint --xpath 'string(//*[local-name()="authors"]) != string(//*[local-name()="id"])' - | grep -q -x true
# config-bans (CS-PKG-02 and CS-PKG-16, then CS-PKG-08): the output is a banned line (a non-empty value or an Include=, never a blank element or a Remove=); empty output = pass
grep -rnE --include='*.csproj' --include='*.props' --include='*.targets' --exclude-dir=obj --exclude-dir=bin --exclude-dir=.git -e '<PackageReference[^>]* Include="Microsoft\.SourceLink\.' -e 'Package(License|Icon)Url[^>]*>[^<[:space:]]' -e 'DeterministicTimestamp>[[:space:]]*true' -e 'AllowedOutputExtensionsInPackageBuildOutputFolder[^>]*>[^<]*\.pdb' -e 'GeneratePackageOnBuild>[[:space:]]*true' .
git grep --untracked -qE '<TargetFrameworks?[ >][^<]*(netstandard|netcoreapp|net[1-4][0-9]{1,2}([^0-9.]|$))' -- '*.csproj' '*.props' '*.targets' ':(exclude,glob)**/[Tt]est/**' ':(exclude,glob)**/[Tt]ests/**' ':(exclude,glob)**/*Test/**' ':(exclude,glob)**/*Tests/**' ':(exclude,glob)**/*TestFixtures/**' ':(exclude,glob)**/*TestServices/**' || { git grep --untracked -nE 'SignAssembly>[[:space:]]*true|AssemblyOriginatorKeyFile|PublicSign>[[:space:]]*true' -- '*.csproj' '*.props' '*.targets' ':(exclude)eng/common'; git ls-files '*.snk'; }
# symbols (CS-PKG-04): exit 0 = a snupkg or an embedded PDB, and no .symbols.nupkg
{ ls artifacts/*.snupkg > /dev/null 2>&1 || test "$(dotnet msbuild "${PRJ:?MISSING PRJ}" -getProperty:DebugType -p:Configuration=Release -p:TargetFramework=net10.0)" = embedded; } && ! ls artifacts/*.symbols.nupkg > /dev/null 2>&1
# readme-images (CS-PKG-14): the output is an image outside a code fence whose target does not start with https://; empty output = pass; the readme is the file PackageReadmeFile names
r=$(git grep -hoE '<PackageReadmeFile>[^<]+' -- '*.csproj' '*.props' '*.targets' | head -n 1 | sed 's/.*>//'); f=$(git ls-files -- "${r:?MISSING PackageReadmeFile}" "*/$r" | head -n 1); awk 'index($0, "\140\140\140") == 1 {f = !f; next} !f {print NR ": " $0}' "${f:?MISSING readme}" | grep -P '!\[[^]]*\]\((?!https://)|<img [^>]*src=["\x27](?!https://)'
```

## Source Link and Determinism

Gate: block `cib-probe` for the property, block `repro` for the bytes.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CS-PKG-03 | Set `<ContinuousIntegrationBuild Condition="'$(GITHUB_ACTIONS)' == 'true'">true</ContinuousIntegrationBuild>` and nothing else: never unconditionally, never keyed on `CI`, and never assume the SDK sets it. Passing `-p:ContinuousIntegrationBuild=true` on every CI `dotnet pack` and `build` is the equal alternative. | The SDK does not set it, even under `CI=true` or `GITHUB_ACTIONS=true` (measured 2026-10-11). Without it the PDB maps absolute paths, `dotnet-validate` exits 1 with `Non deterministic`, and the DLL differs per checkout directory. Unconditional breaks local source stepping, and a developer shell that exports `CI=true` would flip local builds. The provider variable wins over Polly's `CI`. | Block `cib-probe`: line 1 prints `true` or line 4 prints the CI commands that pass the property or line 5 names a delegated releaser, and lines 2 and 3 print an empty line. Watched red and green (measured 2026-10-11, net10.0): the unconditional tree printed `true` on line 2, the `CI`-keyed tree printed `true` on line 3, the conditional tree passed. Other CI providers set their own variable in the same condition; that is `unverified: read only`. A delegated releaser (`dotnet-releaser`, a reusable workflow: markdig) keeps CI outside the repository, so lines 1 and 4 print nothing: the fifth line names the releaser and its config is read for the property (`unverified: read only`). | MUST |
| CS-PKG-05 | Pack releases as `SOURCE_DATE_EPOCH=$(git log -1 --format=%ct) dotnet pack ...` on SDK 10.0.401 or newer, with `GITHUB_ACTIONS=true` (CS-PKG-03). | A fixed timestamp is the only setting that gives a byte-identical nupkg and snupkg across clones. SDK 8.0.425 ignores `SOURCE_DATE_EPOCH`, and 11.0 RC1 is still non-identical by default (measured 2026-10-11). | Block `repro` prints `EQUAL`. Watched red and green (measured 2026-10-11): two clones packed 2 s apart gave no `EQUAL` without the variable and `EQUAL` with it; a clone whose pack failed printed `FAILED pack in b` and an empty artifacts folder printed no `EQUAL`. | SHOULD |

```sh
# cib-probe (CS-PKG-03): line 1 prints true, or line 4 prints the CI commands that pass the property, or line 5 names a delegated releaser; lines 2 and 3 print an empty line
GITHUB_ACTIONS=true dotnet msbuild "${PRJ:?MISSING PRJ}" -getProperty:ContinuousIntegrationBuild -p:TargetFramework=net10.0
env -u GITHUB_ACTIONS -u CI dotnet msbuild "${PRJ:?MISSING PRJ}" -getProperty:ContinuousIntegrationBuild -p:TargetFramework=net10.0
env -u GITHUB_ACTIONS CI=true dotnet msbuild "${PRJ:?MISSING PRJ}" -getProperty:ContinuousIntegrationBuild -p:TargetFramework=net10.0
grep -rnHE -e '(-p:|/p:)ContinuousIntegrationBuild=true' ${CIF:?MISSING CIF} | grep -v '^[^:]*:[0-9]*:[[:space:]]*#'
grep -rlE 'dotnet-releaser' $CIF | sed 's/$/: delegated releaser, read its config for ContinuousIntegrationBuild/'
# repro (CS-PKG-05): clone twice into different directories (a, b); a failed pack, an empty artifacts folder or a failed cd prints MISSING or FAILED and exits 1; EQUAL only when both packs pass and every hash matches
for c in a b; do (cd "${c:?MISSING clone}" && rm -rf artifacts && SOURCE_DATE_EPOCH=$(git log -1 --format=%ct) GITHUB_ACTIONS=true dotnet pack "${PACK:?MISSING PACK}" -c Release -o artifacts > pack.log 2>&1) || { echo "FAILED pack in $c"; false; }; done
h() ( cd "$1" && set -o pipefail && ls artifacts/*nupkg > /dev/null && sha256sum artifacts/*nupkg | cut -d' ' -f1 )
A=$(h a) && B=$(h b) && test -n "$A" && test "$A" = "$B" && echo EQUAL
```

## Version

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CS-PKG-06 | Derive the version from the git tag: declare `<GlobalPackageReference Include="MinVer" Version="8.0.0" />` in `Directory.Packages.props` or the `Directory.Packages.analyzers.props` it imports (CS-BUILD-15, CS-SEC-10; delete any existing MinVer `PackageReference` first, or restore fails with `NU1504`) and `<MinVerTagPrefix>v</MinVerTagPrefix>` in `Directory.Build.props`. A version-less `<PackageReference Include="MinVer" PrivateAssets="all" />` beside a central `<PackageVersion Include="MinVer" Version="8.0.0" />` is equally valid. No `PackageReference` carries a `Version=` for MinVer, and no project file sets `Version`, `VersionPrefix`, `VersionSuffix`, `PackageVersion`, `AssemblyVersion`, `FileVersion` or `InformationalVersion`. | One source of truth, with no version file to drift. A `PackageReference Include="MinVer" Version="8.0.0"` under central package management is `error NU1008`, so CS-BUILD-23 and a per-project MinVer reference cannot both hold; the global form also never reaches the nuspec. MinVer sets `AssemblyVersion` to `major.0.0.0` (read 2026-10-11), and SourceLink appends `+commit` to the informational version. | Block `minver-present` exits 0 (either form; presence check). Block `version-source` prints nothing (a `Version=` on a MinVer reference or a hand-set version in a project that is not `IsPackable` false, the shared `sf` filter of `dotnet-build`: Ocelot printed 37 sample and test hits), and `<PackageVersion Include=...>` central items do not match it. A repository named in the intro (GitVersion, hand-set) skips this block and CS-PKG-07. Watched red and green (measured 2026-10-11, SDK 10.0.401): the project-level reference exits 1 with `NU1008: ... cannot define a value for Version: MinVer`, a hand-set `<Version>` is a printed line, the global form packs `1.0.0` from tag `v1.0.0` with an empty `<dependencies>` group. | MUST |
| CS-PKG-07 | Check out the release with `fetch-depth: 0` and fail the job when the packed version is not the tag. | A clone without the tags silently packs `0.0.0-alpha.0` with no diagnostic (measured 2026-10-11). | Block `tag-version` (the `grep` hits, the `test` exits 0). Watched red and green (measured 2026-10-11): a `--depth 1` clone of a repository whose tag is 2 commits back packed `Lib.0.0.0-alpha.0` and the `test` exited 1, the same clone fetched with `--tags --unshallow` and checked out at the tag packed `Lib.1.0.0`; removing `fetch-depth: 0` makes the `grep` print nothing. | MUST |
| CS-PKG-08 | Do not strong-name while every shipped TFM is net8.0 or newer: no `.snk`, `SignAssembly`, `AssemblyOriginatorKeyFile` or `PublicSign`. A shipped `netstandard2.0` or `net4x` TFM is the exception: there strong-name every TFM, with a key fixed forever. | Microsoft: strong naming has "no benefits on .NET Core/5+" (read 2026-10-11). A key added later is a breaking identity change. 22 of the corpus's 35 `.snk` files come with netstandard2.0 or net4x targets (read 2026-10-11). Reach is net8+ only by owner default (the adopter may override). A SHA1 `.snk` also fails to sign on a host whose OpenSSL policy forbids SHA1 (`invalid digest`; DN-DIAG-69 in the `dotnet-diagnose` skill). | Block `config-bans`, second command (empty output = pass; it prints nothing when a shipped project targets `netstandard`, `netcoreapp` or `net4x` in a `.csproj`, `.props` or `.targets`: markdig keeps its list in `Markdig.targets`). Watched red and green (measured 2026-10-11): `SignAssembly` plus a planted `k.snk` printed the property line and `k.snk`, the complete tree and a `netstandard2.0` tree none. The policy itself is a pinned decision, not a check. | MUST |

```sh
git grep --untracked -qE '<(Global)?PackageReference +Include="MinVer"' -- '*.props' '*.csproj' '*.targets' && git grep --untracked -qE '<(GlobalPackageReference|PackageVersion) +Include="MinVer" +Version="[0-9][^"]*"' -- 'Directory.Packages*.props' && git grep --untracked -q 'MinVerTagPrefix>v<' -- 'Directory.Build.props'    # minver-present (CS-PKG-06): exit 0 = a MinVer reference (global, or version-less beside a central PackageVersion), its exact version and the tag prefix are declared
sf() { while IFS= read -r l; do f=${l%%:*}; case $f in *.csproj) grep -qE 'IsPackable>[[:space:]]*false' "$f" && continue ;; esac; echo "$l"; done; }; git grep --untracked -nE -e '<PackageReference +Include="MinVer"[^>]*Version=' -e '<(Version|VersionPrefix|VersionSuffix|AssemblyVersion|FileVersion|InformationalVersion)[ >]' -e '<PackageVersion( Condition=[^>]*)?>' -- '*.csproj' '*.props' '*.targets' ':(exclude)eng/common' | grep -vE '^[^:]*:[0-9]*:[[:space:]]*<!--' | sf    # version-source (CS-PKG-06): the output is a hand-set version (with or without a Condition) or a MinVer reference with Version=, in a project that is not IsPackable false (sf is the same line as in dotnet-build); empty output = pass
# tag-version (CS-PKG-07): the grep hits; GITHUB_REF_NAME is the tag (v1.0.0) in a tag-triggered job; the test exits 0
grep -n -e 'fetch-depth: 0' "${REL:?MISSING REL}"
p=$(ls artifacts/*.nupkg | head -n 1); v=${GITHUB_REF_NAME:?MISSING GITHUB_REF_NAME}; test "$p" != "${p%".${v#v}.nupkg"}"
```

## Gates Before the Push

Gate: the pack exit code first, then blocks `pack-coe`, `validate-loop` and `no-binary`.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CS-PKG-09 | Set `<EnablePackageValidation>true</EnablePackageValidation>` and gate on the `dotnet pack` exit code, never on the nupkg's existence. Leave `PackageValidationBaselineVersion` unset until the first release is on the feed; from the second release on (0.y.z included) set it to the last published version, in the commit right after each release (`CS-API-15` step 4). | A removed public member is `error CP0002` and pack exits 1, yet the nupkg is still written to `-o`. A baseline that is not yet published fails restore with `NU1102`. Which CP diagnostics are errors is the API-evolution rows' business (family CS-API). | `dotnet msbuild "${PRJ:?MISSING PRJ}" -getProperty:EnablePackageValidation -p:TargetFramework=net10.0` prints `true`; block `pack-coe` prints nothing (empty output = pass; a `continue-on-error` on a pack or push step, in a file that does not gate on a `steps.<id>.outcome`). Watched red and green (measured 2026-10-11, net8.0 and net10.0; a tree with validation off printed `false` and a `continue-on-error` line): with baseline 1.0.0 a pack that removed `Api.Sub` exited 1 with `error CP0002: Member 'int Pkg.Lib.Api.Sub(int, int)' exists on [Baseline] ...` and still wrote the nupkg, a pack that added `Mul` exited 0, baseline `9.9.9` exited 1 with `NU1102`. | MUST |
| CS-PKG-10 | Every nupkg passes `dotnet tool run dotnet-validate package local <file>` with exit 0 before the push. Pin the tool in `.config/dotnet-tools.json`; it is the separate `dotnet-validate` tool, not an SDK verb. | It is the only gate that checks Source Link, Deterministic and Compiler Flags together, and it caught the missing CI flag (CS-PKG-03) and an unrecognised remote. | Block `validate-loop` exits 0 (presence check on the manifest entry). Watched red and green (measured 2026-10-11, 0.0.1-preview.582): a pack without `GITHUB_ACTIONS` printed `Deterministic (dll/exe): Non deterministic` and exited 1, the CI pack printed three `Valid` lines and exited 0. | MUST |
| CS-PKG-15 | `[cli-wrapper]` A library that launches a native tool ships no tool binary in its nupkg unless the delivery model bundles it, and the nupkg stays under 5 MiB. | A bundled set of 8 tool binaries came to 91,600,345 bytes per tool release (read 2026-10-11), the managed-only package is 3,269 bytes, and a RID-specific publish drops bundled binaries silently. The default is locate plus an opt-in verified download, no binary in the nupkg. | Block `no-binary` prints nothing (empty output = pass); `TOOL` is the wrapped tool's file name, and the block prints `N/A` when `TOOL` is unset (the row binds `[cli-wrapper]` only). Watched red and green (measured 2026-10-11): a `runtimes/linux-x64/native/` + `$TOOL` item printed `FAIL`, the managed-only package printed nothing. | MUST |

```sh
grep -rLZE --include='*.yml' --include='*.yaml' 'steps\.[A-Za-z0-9_-]+\.outcome' ${CIF:?MISSING CIF} | xargs -r -0 awk 'function flush() { if (coe && pk) print lastf ":" coe ": continue-on-error on a pack or push step"; coe = 0; pk = 0 } FNR == 1 {flush()} /^[[:space:]]*- / {flush()} /^[[:space:]]*#/ {next} /continue-on-error:[[:space:]]*true/ {coe = FNR} /dotnet (pack|nuget push)/ {pk = 1} {lastf = FILENAME} END {flush()}'    # pack-coe (CS-PKG-09): the output is a pack or push step that may fail without failing the job; a file that gates on a steps.<id>.outcome is the sanctioned pair (Conventions) and is skipped
# validate-loop (CS-PKG-10): exit 0 on every file; the manifest entry is the presence check
dotnet tool restore
for p in artifacts/*.nupkg; do dotnet tool run dotnet-validate package local "$p" || exit 1; done
grep -n -e '"dotnet-validate"' .config/dotnet-tools.json
# no-binary (CS-PKG-15): the output is FAIL plus the nupkg, or an oversize nupkg; empty output = pass; N/A when TOOL is unset (not a cli-wrapper)
if [ -z "${TOOL:-}" ]; then echo 'N/A: TOOL unset, CS-PKG-15 binds [cli-wrapper]'; else for p in artifacts/*.nupkg; do unzip -Z1 "$p" | grep -q -E -e '^runtimes/[^/]+/native/' -e "(^|/)$TOOL(\\.exe)?\$" && echo "FAIL $p"; done; find artifacts -name '*.nupkg' -size +5120k; fi
```

## Publishing

Gate: blocks `workflow-pins`, `push-gate` and `signing-gate`. The OIDC exchange and every nuget.org write are `unverified: read only`.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CS-PKG-11 | `[gha]` Publish to nuget.org only through NuGet Trusted Publishing: `NuGet/login@<40-hex sha>` with `user:` set to the nuget.org profile name (not an email), `id-token: write` on the publish job only, and `environment:` on that job. No `NUGET_API_KEY` secret exists (`secrets.NUGET_USER` is the profile name and is fine). A third-party publish action (`uses: owner/repo/.../publish-nuget@ref`) is the same gate and is pinned to a 40-hex SHA like `NuGet/login`; a push to another feed (MyGet, Azure Artifacts, GitHub Packages: `--source github`, `secrets.GITHUB_TOKEN`) is outside this row, and the row binds the nuget.org destination only. A delegated releaser (`dotnet-releaser` with `[nuget] trusted_publishing = true`, a Cake target) is the publish job itself: it keeps `id-token: write` on that job only, `environment:` and the 40-hex pin on the releaser action, while `needs:`, the download and the push greps do not apply and its config names Trusted Publishing and no API-key secret (`unverified: read only`). | The temporary key lives 1 hour and is single-use, so there is nothing to leak. A tag-pinned action is mutable, and a long-lived key in `secrets` outlives the job. | Block `workflow-pins`: the greps print nothing and the awk prints the publish job's name twice and exits 0 (for a delegated releaser the awk skips the `needs:` test). Watched red and green (measured 2026-10-11): a `secrets.NUGET_API_KEY` push, a `NuGet/login@v1` pin, an email `user:`, a `publish-nuget@main` action and an `id-token` on the verify job each broke the block's expected output, the complete workflow (with `secrets.NUGET_USER`) passed. | MUST |
| CS-PKG-12 | `[gha]` Trigger the release workflow from a `v*.*.*` tag only, in a publish job that `needs:` the verify job, downloads its artifacts and never rebuilds. Push with `--skip-duplicate`. A `workflow_dispatch` release is the same gate when it declares `inputs:` (a `tag`, or a bump the workflow turns into a tag) and derives the version from that tag (CS-PKG-07); a publish job that calls a reusable workflow or a publish action keeps the `needs:` and the pin (CS-PKG-11), and its pack and push live in the called file. A combined workflow (CI and release in one file) keeps the gate on the release job: an `if:` naming `refs/tags/` or a dispatch input, `needs:` on the build job and no second pack (CommandLineUtils; its `push:` and `pull_request:` triggers are the CI's). A delegated releaser has no `dotnet nuget push` in the file, so the block prints `N/A` and the releaser's tag condition is read in its config. | nuget.org versions are immutable and cannot be deleted, so the checked bytes must be the pushed bytes. `--skip-duplicate` makes a rerun idempotent. | Block `push-gate` prints nothing (the trigger lines are read only when no job is gated by an `if:` on a tag or input, and the pack count may be 0 or 1) and `N/A` for a file with no push. That the publish job has `needs:` and `actions/download-artifact` is a reading heuristic. Watched red and green (measured 2026-10-11): a push without `--skip-duplicate`, a `branches:` trigger, a `workflow_dispatch` with no `inputs:` and a second `dotnet pack` each failed the block, the complete workflow and a dispatch with a tag input passed. | MUST |
| CS-PKG-13 | Do not author-sign at v1. If signing is ever added, use a SHA-256 or longer `--certificate-fingerprint`, always pass `--timestamper`, and register a certificate on nuget.org only when every future push will be signed. | Signing needs a CA certificate, a key vault and a Windows x64 runner. Registering a certificate forces signing on every later push, and a SHA-1 fingerprint is `error NU3043` on SDK 10 (read 2026-10-11). nuget.org already countersigns every package (read 2026-10-11). | Block `signing-gate` prints nothing. Watched red and green (measured 2026-10-11): a workflow with a 40-hex fingerprint printed 1 line, the complete workflow none. The SHA-256 path is `unverified: not run` (no trusted certificate here). | SHOULD |

```sh
# workflow-pins (CS-PKG-11): the three greps print nothing (the last is a publish action not pinned to a 40-hex SHA); the awk prints the publish job's name twice and exits 0 (id-token and environment on one job, and that job has `needs:`; a second job, a job with no `needs:` or a workflow-level id-token exits 1)
grep -rnHE -e 'secrets\.[A-Za-z0-9_]*(NUGET_API_KEY|NUGET_KEY|APIKEY|API_KEY)' -e 'nuget push.*secrets\.' ${CIF:?MISSING CIF} | grep -v -e '^[^:]*:[0-9]*:[[:space:]]*#' -e MYGET -e myget.org -e pkgs.dev.azure.com -e nuget.pkg.github.com -e 'secrets\.[A-Za-z0-9_]*GITHUB' -e '--source github' -e '-s github'
grep -rnHE -e 'uses: *NuGet/login@[^ ]*[^0-9a-f ]' -e 'uses: *NuGet/login@[0-9a-f]{0,39}( |$)' -e 'uses: *NuGet/login@[0-9a-f]{41,}' -e 'user: *[^ ]*@' $CIF | grep -v '^[^:]*:[0-9]*:[[:space:]]*#'
grep -rniHE 'uses: *[^ ]*(publish|nuget|releaser)[^ ]*@' $CIF | grep -v -e '^[^:]*:[0-9]*:[[:space:]]*#' -e 'NuGet/login@' -e '@[0-9a-f]\{40\}\([[:space:]]\|$\)'
awk -v d="$(grep -c -e 'dotnet-releaser' -e 'cake-action' "${REL:?MISSING REL}")" '/^  [A-Za-z0-9_-]+:/ {job = $1} /id-token: write|environment:/ {print job; n++; if (!(job in hit)) {hit[job] = 1; jobs++}} /needs:/ {needs[job] = 1} END {for (j in hit) if (!needs[j] && !d) bad = 1; exit (n != 2 || jobs != 1 || bad)}' "$REL"
# push-gate (CS-PKG-12): the first line (a trigger other than a tag, unless a job is gated by an if: on a tag or an input; or a dispatch with no inputs), the second grep and the count test print nothing; a file with no push prints N/A (delegated releaser)
if grep -q 'dotnet nuget push' "${REL:?MISSING REL}"; then grep -q -E '^ +if:.*(refs/tags/|inputs\.)' "$REL" || grep -n -E -e '^ +(branches|pull_request|schedule):' "$REL"; grep -q -E '^ +inputs:' "$REL" || grep -n -E '^ +workflow_dispatch:' "$REL"; else echo 'N/A: no dotnet nuget push in REL (delegated releaser)'; fi
grep -rnH -e 'dotnet nuget push' ${CIF:?MISSING CIF} | grep -v -e '--skip-duplicate' -e '^[^:]*:[0-9]*:[[:space:]]*#'
test "$(grep -c -e 'dotnet pack' "$REL")" -le 1 || echo "FAIL: more than one dotnet pack in $REL"
# signing-gate (CS-PKG-13): the output is a SHA-1 length fingerprint or a signing step; empty output = pass
grep -rnHE -e '--certificate-fingerprint +[0-9A-Fa-f]{40}( |$)' -e 'dotnet nuget sign' ${CIF:?MISSING CIF} | grep -v '^[^:]*:[0-9]*:[[:space:]]*#'
```

## What Agents Get Wrong Here

| # | What the agent does | Mechanical check | Rule |
|---|---|---|---|
| 1 | Writes a csproj with only `<TargetFramework>`, or with `PackageLicenseUrl` or `PackageIconUrl`. Pack exits 0. | Block `nuspec-meta`, `config-bans` | CS-PKG-01, CS-PKG-02 |
| 2 | Adds `Microsoft.SourceLink.GitHub`, often pinned to 1.1.1 or without `PrivateAssets`. | Block `config-bans` | CS-PKG-02 |
| 3 | Sets `IncludeSymbols` without `snupkg`, or copies the pdb-in-nupkg trick from a popular library (embed the PDB instead). | Block `symbols`, block `config-bans` | CS-PKG-04, CS-PKG-02 |
| 4 | Sets `ContinuousIntegrationBuild` unconditionally, keys it on `CI`, or believes the SDK sets it. | Block `cib-probe` | CS-PKG-03 |
| 5 | Presents `DeterministicTimestamp=true` as reproducible packaging. | Block `repro` | CS-PKG-05, CS-PKG-02 |
| 6 | Hand-sets `<Version>`, references MinVer with `Version=` under central package management (`NU1008`), or runs MinVer on a shallow clone. | Block `version-source`, block `tag-version` | CS-PKG-06, CS-PKG-07 |
| 7 | Adds `SignAssembly` and a generated `.snk` "for NuGet". | Block `config-bans` | CS-PKG-08 |
| 8 | Sets the baseline to the version being released (`NU1102`), or gates on `ls artifacts/*.nupkg`. | The pack exit code | CS-PKG-09 |
| 9 | Calls `dotnet validate` an SDK verb, or skips the check. | Block `validate-loop` | CS-PKG-10 |
| 10 | Writes `secrets.NUGET_API_KEY` with `dotnet nuget push -k`, `NuGet/login@v1` or `publish-nuget@main` by mutable ref, or `user:` set to an email. | Block `workflow-pins` | CS-PKG-11 |
| 11 | Pushes without `--skip-duplicate`, or rebuilds in the publish job. | Block `push-gate` | CS-PKG-12 |
| 12 | Signs with a SHA-1 thumbprint or a self-signed certificate. | Block `signing-gate` | CS-PKG-13 |
| 13 | Bundles the wrapped tool's binaries under `runtimes/*/native` in the library nupkg. | Block `no-binary` | CS-PKG-15 |
| 14 | Sets `GeneratePackageOnBuild` so "build also packs"; the clean-tree `dotnet pack` then exits 1 with `NU5026`. | Block `config-bans` | CS-PKG-16 |
