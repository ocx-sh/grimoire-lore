# App publish modes

Step 9 to step 12 of `dotnet-release` load this file. It holds the mode table,
the properties each mode needs, the measured cost of each mode, the traps that
appear only at run time, and the workflow shape of an app release. Binds to SDK
10.0.401 and .NET 10 on linux-x64, with a hello-world console app (measured
2026-10-11). Absolute numbers are host-specific and the ratios are the finding.
Windows, macOS and arm64 rows are `unverified: read only`. `Acme.App` and
`src/Acme.App` are example names: rename them once.

Contents: [The mode table](#the-mode-table) · [The DN-REL blocks](#the-dn-rel-blocks) · [Properties per mode](#properties-per-mode) ·
[Measured size and startup](#measured-size-and-startup) · [Traps by mode](#traps-by-mode) ·
[Containers](#containers) · [The stop signal](#the-stop-signal) ·
[File-based apps](#file-based-apps) · [The release workflow for an app](#the-release-workflow-for-an-app) ·
[What agents get wrong in an app release](#what-agents-get-wrong-in-an-app-release)

## The mode table

Go top to bottom; the first row that fits wins. Single-file and AOT output is
specific to one OS and architecture, so a release is a matrix of RIDs, each built
on a runner that can link it.

| Situation | Mode and properties | Size / startup | Run-the-artifact check |
|---|---|---|---|
| Repo script or CI helper, the SDK is present | File-based app, `dotnet run --file x.cs`. Add `#:property PublishAot=false` if it uses reflection | n/a | `dotnet run --file x.cs -- <supported args>` exits 0 and prints output |
| The runtime is guaranteed on the host (a dotnet tool, a dev box, CI with `setup-dotnet`) | Framework-dependent: `-r <rid> --self-contained false`, `PublishReadyToRun` optional | 116 KB / 66 ms (R2R 56 ms) | `./app <supported args>` exits 0 and prints output |
| A server in a container, any dependency graph | Container, framework-dependent: `-t:PublishContainer` on `runtime:10.0` | 300 MB image | `docker run`, then the DN-REL-11 stop probe |
| A container, the code is AOT-clean | Container plus `PublishAot` plus `InvariantGlobalization=true`: base `runtime-deps:10.0-noble-chiseled` | 30.7 MB image (87.6 MB with ICU, the `-extra` base) | `docker run`; `Config.User` is `1654` |
| A standalone download, AOT-clean, a native runner per RID | `PublishAot` per RID | 2.2 MB / 15 ms (4 ms with invariant globalization and `OptimizationPreference=Size`) | Run from an empty directory on that OS |
| A standalone download, not AOT-clean (reflection, plugins) | `--self-contained true`, `PublishSingleFile`, `PublishReadyToRun`, not trimmed | 84 MB / 64 ms | Run a copy of the shipped unit (DN-REL-09) |
| A standalone download, trim-clean, size matters | `--self-contained true`, `PublishSingleFile`, `PublishTrimmed`, `PublishReadyToRun` | 19 MB / 41 to 62 ms | The same with one command on the main feature path (a build, a serialize, a request), and exercise every path that reflects |
| `Assembly.LoadFile`, `Reflection.Emit`, built-in COM or C++/CLI | Never AOT, never trim | n/a | n/a |

## The DN-REL blocks

The fenced commands that the `Block REL-nn` cells of the DN-REL table in `SKILL.md` cite.
Run them from the repository root. Empty output passes unless a comment says otherwise.

```sh
# REL-01: no publish property on the command line (-p:, /p:, -property:)
git grep -n -E -e '[-/]p(roperty)?:Publish(Aot|SingleFile|Trimmed|ReadyToRun)=' -- '*.yml' '*.yaml' '*.sh' '*.ps1' '*.cmd'
# REL-02: a runtime-specific publish names its self-containedness
git grep -n -E -e 'dotnet publish[^|;&]*(-r |--runtime[ =]|RuntimeIdentifier=)' -- '*.yml' '*.yaml' '*.sh' '*.ps1' '*.cmd' 'Makefile' '*.mk' | grep -v -E -e 'self-contained' -e 'SelfContained='
git grep -n -E -e 'msbuild[^|;&]*-t:Publish' -- '*.yml' '*.yaml' '*.sh' '*.ps1' '*.cmd' 'Makefile' '*.mk' | grep -v -e 'SelfContained='
# REL-04: the single-file hazards, outside test and sample trees (a heuristic: judge each hit)
git grep -n -E -e '[aA]ssembly[A-Za-z_]*(\(\))?[?!]?\.Location\b' -e '\b[aA]sm[A-Za-z_]*[?!]?\.Location\b' -e '\)[?!]\.Location\b' -e 'CodeBase\b' -- '*.cs' ':(exclude,glob)**/[Tt]est*/**' ':(exclude,glob)**/*[Tt]ests/**' ':(exclude,glob)**/[Ee]xamples/**' ':(exclude,glob)**/[Ss]amples/**' ':(exclude,glob)**/perf/**'
# REL-08: the files in the publish directory, not counting symbols, docs and config companions (compare with the files the release ships)
find out -maxdepth 1 -type f ! -name '*.pdb' ! -name '*.dbg' ! -name '*.xml' ! -name '*.config' | sort
# REL-09: a reading heuristic, the matrix to compare with each AOT RID
git grep -n -e 'runs-on' -- .github/workflows
# REL-12: no registry push or release outside release.yml
git grep -l -e 'ContainerRegistry' -e 'docker push' -e 'DOTNET_CONTAINER_REGISTRY' -e 'gh release create' -e 'gh release upload' -e 'action-gh-release' -- .github/workflows ':!.github/workflows/release.yml'
# REL-13: the attestation action is pinned (the first must hit), and no placeholder pin remains (the second prints nothing)
git grep -n -E -e 'actions/attest@[0-9a-f]{40}' -- .github/workflows
git grep -n -E -e '@0{40}' -- .github/workflows
# REL-14: every #:package carries an exact version
git grep -n -E -e '^#:package ' -- '*.cs' | grep -v -E -e '@[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?[[:space:]]*$'
```

## Properties per mode

Set them in the csproj or props, never as `-p:` in CI (DN-REL-01), so `dotnet
build` runs the trim, single-file and AOT analyzers too.

```xml
<!-- standalone, trim-clean (the mode of the watched red and green) -->
<PropertyGroup>
  <OutputType>Exe</OutputType>
  <TargetFramework>net10.0</TargetFramework>
  <PublishSingleFile>true</PublishSingleFile>
  <PublishTrimmed>true</PublishTrimmed>
  <PublishReadyToRun>true</PublishReadyToRun>
  <!-- only when a PackageReference ships native libraries (DN-REL-08): -->
  <IncludeNativeLibrariesForSelfExtract>true</IncludeNativeLibrariesForSelfExtract>
</PropertyGroup>
<!-- Native AOT -->
<PropertyGroup>
  <PublishAot>true</PublishAot>
  <InvariantGlobalization>true</InvariantGlobalization> <!-- only after DN-REL-07 -->
  <OptimizationPreference>Size</OptimizationPreference> <!-- optional -->
</PropertyGroup>
```

The command always names the self-containedness (DN-REL-02):

```sh
dotnet publish -c Release -r linux-x64 --self-contained true
dotnet publish -c Release -r linux-x64 --self-contained false
```

## Measured size and startup

Hello-world app with one source-generated JSON line, linux-x64, SDK 10.0.401,
median of 41 runs after 3 warm-ups, host idle (measured 2026-10-11).

| Mode (properties beyond `-r linux-x64`) | exe or dir bytes | files | median ms |
|---|---|---|---|
| Framework-dependent | dir 115,990 | 4 | 66.2 |
| Framework-dependent plus `PublishReadyToRun` | dir 136,470 | 5 | 56.0 |
| Framework-dependent plus `PublishSingleFile` | dir 116,197 | 1 | 64.2 |
| Self-contained | dir 82,640,529 | 191 | 64.4 |
| Self-contained, single-file | exe 73,607,592 | 1 | 67.5 |
| Self-contained, single-file, `EnableCompressionInSingleFile` | exe 39,238,722 | 1 | 125.8 |
| Self-contained, single-file, `PublishReadyToRun` | dir 83,856,071 | 1 | 64.0 |
| Self-contained, single-file, `PublishTrimmed` | exe 15,143,433 | 1 | 161.6 |
| Trimmed plus `PublishReadyToRun` | dir 19,482,204 | 1 | 62.5 |
| Trimmed plus R2R plus `InvariantGlobalization` | exe 19,207,344 | 1 | 41.1 |
| `PublishAot` | exe 2,225,448 plus a 4.7 MB `.dbg` | 1 | 15.1 |
| `PublishAot`, invariant, `OptimizationPreference=Size` | exe 2,040,696 | 1 | 4.2 |

Reading: trim alone hurts startup, so trim ships with R2R (DN-REL-06; Native AOT
is the exception, it trims and compiles ahead of time). R2R helps
framework-dependent apps modestly and a self-contained trivial app not at all.
Compression halves the size and doubles startup. AOT is the only mode that wins on
both axes.

## Traps by mode

**Self-containedness (SDK 8.0.425 and 10.0.401).** A `RuntimeIdentifier` no longer
implies `SelfContained` for net8 and later. `PublishSingleFile`, `PublishAot` and
`PublishTrimmed` imply it during `dotnet publish` only, not during build.
`PublishReadyToRun` does not. `dotnet publish --self-contained` with no `-r` infers
the current RID. `msbuild -t:Publish` skips that inference and needs `-p:SelfContained=`.

**Single-file API table.** `Assembly.Location` returns `""`. `Assembly.CodeBase`
and `EscapedCodeBase` throw `PlatformNotSupportedException`. `Assembly.GetFile(s)`
throws `IOException`. `Module.FullyQualifiedName` returns `<Unknown>` or throws.
Use `AppContext.BaseDirectory` for files beside the exe and
`Environment.ProcessPath` for the exe (DN-REL-04). IL3000 is a warning, so a
publish with it exits 0 and the artifact exits 134.

**Native libraries and extraction.** Without `IncludeNativeLibrariesForSelfExtract`
a third-party `.so` stays beside the exe, and the exe copied alone dies with
`DllNotFoundException` (exit 134). With it the exe runs alone and extracts the
library under `DOTNET_BUNDLE_EXTRACT_BASE_DIR`, else `$HOME/.net` on Linux and
macOS or `%TEMP%/.net` on Windows. Never `/tmp`, and set the variable in service
units where `$HOME` may be undefined. A portable publish (no `-r`) carries every
RID's native assets and a RID-specific publish silently drops the others.

**Trimming.** `PublishTrimmed` turns off `JsonSerializer` reflection. An app that
trims produces no trim warnings. The fix order is to remove the reflection, then
`DynamicallyAccessedMembers`, then `RequiresUnreferencedCode`, and never a
suppression (CS-CORE-01). `TrimmerSingleWarn=false` expands a package's one-line
warning into every site.

**Native AOT.** Prerequisites: Debian and Ubuntu `clang zlib1g-dev`, Alpine `clang build-base
zlib-dev`, Fedora `clang zlib-devel`, Windows the C++ desktop workload, macOS the Xcode
command line tools (Fedora, Windows and macOS: `unverified: read only`). Missing,
the publish exits 1 with `ld returned 1` (`cannot find -lz` shows at `-v:m`, not `-v:q`) or
`Requested linker ('clang') not found in PATH`: install the package, never edit the code.
A glibc `linux-x64` AOT binary mounted into Alpine fails `exec ... no such file or
directory` (exit 255): Alpine needs `-r linux-musl-x64` built on a musl toolchain.
`-r win-x64 -p:PublishAot=true` from Linux fails with `Cross-OS native compilation
is not supported`. Cross-architecture needs the target toolchain. Limits: no
`Assembly.LoadFile`, no `Reflection.Emit`, no C++/CLI, no built-in COM.

**ReadyToRun cross-compilation.** A Linux x64 host produced `-r linux-arm64` and
`-r osx-arm64` binaries (an ELF aarch64 and a Mach-O arm64). Neither was executed:
the receipt says `built, not run`.

**Globalization.** Invariant mode makes `CurrentCulture.Name` empty, compares
ordinally (`string.Compare("a", "B")` is 31, not -1), and throws
`CultureNotFoundException` for `de-DE`. Code that always passes
`CultureInfo.InvariantCulture` or `StringComparison.Ordinal` is unaffected. A
non-invariant AOT or self-contained app in an image without ICU prints `Couldn't
find a valid ICU package installed on the system` and exits 139. The Alpine and
chiseled base images carry no ICU and work only with invariant apps. ICU costs
startup: 15.1 against 4.2 ms for AOT, 62.5 against 41.1 ms for trimmed R2R.

## Containers

The SDK builds the image without a Dockerfile (SDK 10.0.401, local daemon, no
registry push when `ContainerRegistry` is unset):

```sh
dotnet publish -c Release -r linux-x64 --self-contained false -t:PublishContainer
```

| Properties | Base image chosen | Local image size |
|---|---|---|
| `-r linux-x64 --self-contained false` | `mcr.microsoft.com/dotnet/runtime:10.0` | 300 MB |
| `-r linux-musl-x64 --self-contained false -p:InvariantGlobalization=true` | `mcr.microsoft.com/dotnet/runtime:10.0-alpine` | 137 MB |
| `-r linux-x64 -p:PublishAot=true` | `runtime-deps:10.0-noble-chiseled-extra` | 87.6 MB |
| `-r linux-x64 -p:PublishAot=true -p:InvariantGlobalization=true` | `runtime-deps:10.0-noble-chiseled` | 30.7 MB |
| the same with `-p:ContainerFamily=noble-chiseled-aot` | CONTAINER1015: the tag does not exist | none |

Leave `ContainerFamily` unset: the `-aot` suffix of .NET 8 is gone and the family
is `noble`, not `jammy`. The image runs as uid 1654 `app`. A chiseled image has no
shell, so the user check is `docker image inspect --format '{{.Config.User}}'`. The
tag defaults to `latest`: add `ContainerImageTags` with the version, quoted in the
shell. `ContainerArchiveOutputPath` writes a tar.gz for scanning before any push.
No Dockerfile `RUN` exists: an OS package or a created user needs a custom base
image. A pull request leg never pushes (DN-REL-12).

## The stop signal

.NET 10 has no default SIGTERM handler on Unix. `docker stop` sends SIGTERM and
SIGKILL after 10 s (measured 2026-10-11, local daemon, app as PID 1):

| App | `docker stop` | Exit | After SIGTERM |
|---|---|---|---|
| Console, `Task.Delay(Infinite)`, no handler | 301 ms | 143 | nothing, `ProcessExit` is not raised |
| The same source on net8 | 374 ms | 143 | `ProcessExit raised` |
| Console plus `PosixSignalRegistration(SIGTERM)` | 544 ms | 0 | handler, then `ProcessExit raised` |
| Generic Host, fast `StopAsync` | 302 ms | 0 | clean stop |
| Generic Host, `StopAsync` takes 15 s, defaults | 10,517 ms | 137 | SIGKILL |
| Generic Host, `StopAsync` takes 15 s, `ShutdownTimeout` of 6 s | 6,350 ms | 0 | stops, in-flight work abandoned |

Exit 143 means the app died to SIGTERM on both 8 and 10, so the exit code alone
cannot tell a graceful stop from an abrupt one. Exit 137 means the grace period
expired. Workers must honor the cancellation token.

## File-based apps

SDK 10.0.100 or later. A file-based app enables Native AOT by default, so
`#:property PublishAot=false` goes on the first lines of a script that reflects.
`dotnet run app.cs` prints `dynamicCode=False` and a reflection JSON call throws
`Reflection-based serialization has been disabled`. With a csproj in the same
directory `dotnet run app.cs` runs that project and the csproj globs the script in
as a second entry point (CS8802): keep scripts outside any project cone. `#:package`
without a version works only under central package management, so pin every one
(`#:package Name@x.y.z`, DN-REL-14). `#:include` needs SDK 10.0.300.

## The release workflow for an app

The shape of the tag job (DN-REL-12, DN-REL-13). Each `@0000...` is a placeholder
that matches every pin grep and fails only on the tag push: replace it with the
full SHA you reviewed (the placeholder grep of block REL-13 prints nothing). The matrix lists
linux legs; add a leg on a native runner for every other OS and architecture.
`contents: write` is for `gh release create`, in the same job as the attestation.
The attestation step is `unverified: read only`.

```yaml
name: release
on:
  push:
    tags: ["v*.*.*"]
permissions:
  contents: read
env:
  MSBUILDTERMINALLOGGER: "off"
  DOTNET_NOLOGO: "1"
jobs:
  build:
    strategy:
      matrix:
        include:
          - { rid: linux-x64, os: ubuntu-24.04 }
          - { rid: linux-arm64, os: ubuntu-24.04-arm }
    runs-on: ${{ matrix.os }}
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@0000000000000000000000000000000000000000 # replace: pin the full SHA
        with:
          fetch-depth: 0
          persist-credentials: false
      - uses: actions/setup-dotnet@0000000000000000000000000000000000000000 # replace: pin the full SHA
        with:
          global-json-file: global.json
      - name: Publish and gate on zero IL diagnostics
        run: |
          dotnet publish src/Acme.App -c Release -r ${{ matrix.rid }} --self-contained true -p:TrimmerSingleWarn=false -o out --tl:off --interactive false --disable-build-servers -nologo -v:q > pub.log 2>&1
          test "$(grep -c -e 'warning IL' -e 'error IL' pub.log)" -eq 0
          mkdir dist && cp out/Acme.App dist/Acme.App-${{ matrix.rid }}
      - name: Run the shipped file from an empty directory
        run: |
          d=$(mktemp -d); cp dist/Acme.App-${{ matrix.rid }} "$d"/Acme.App
          cd "$d" && timeout 60 ./Acme.App serialize # replace: the app's main feature path, not --version; exit 0 and output are the pass
      - uses: actions/upload-artifact@0000000000000000000000000000000000000000 # replace: pin the full SHA
        with:
          name: acme-app-${{ matrix.rid }}
          path: dist
  release:
    needs: [build]
    runs-on: ubuntu-24.04
    environment: release
    permissions:
      id-token: write
      attestations: write
      artifact-metadata: write
      contents: write
    steps:
      - uses: actions/download-artifact@0000000000000000000000000000000000000000 # replace: pin the full SHA
        with:
          path: dist
          merge-multiple: true
      - name: Checksums over the final bytes
        run: cd dist && sha256sum Acme.App-* > SHA256SUMS && sha256sum -c --strict SHA256SUMS
      - uses: actions/attest@0000000000000000000000000000000000000000 # replace: pin the full SHA
        with:
          subject-checksums: dist/SHA256SUMS
      - run: gh release create "$GITHUB_REF_NAME" dist/* --verify-tag
        env:
          GH_TOKEN: ${{ github.token }}
```

## What agents get wrong in an app release

Ranked by how often it bites. Each is caught by the step or row named.

1. **Reports success from an exit code**: a publish with IL warnings exits 0 and the
   artifact exits 134, a SIGTERM exit 143 read as clean (DN-REL-03, DN-REL-09,
   DN-REL-11).
2. **Assumes `-r` implies self-contained**, or passes `-p:PublishAot` only on the
   command line, and ships 116 KB where 74 MB was meant (DN-REL-01, DN-REL-02).
3. **Uses `Assembly.GetExecutingAssembly().Location`** for the app directory. It
   passes under `dotnet run` and returns `""` in a bundle (DN-REL-04).
4. **Copies the lone exe to the smoke directory** when the release ships a
   directory, or copies the directory when it ships the exe (DN-REL-09).
5. **Sets `InvariantGlobalization=true`** to fix an ICU crash or shrink an image
   (DN-REL-07).
6. **Cross-compiles Native AOT for Windows or macOS on a Linux runner**, or ships a
   glibc build to Alpine (DN-REL-09).
7. **Invents image tags and families from memory** (`10.0-bookworm-slim`,
   `jammy-chiseled-aot`); query the registry or leave the family unset (DN-REL-10).
8. **Assumes `ProcessExit`, `CancelKeyPress` or `finally` run on `docker stop`**
   (DN-REL-11).
9. **Ships trim without R2R**, or turns on single-file compression for startup
   (DN-REL-06).
10. **Pushes an image or creates a release from a pull-request leg**, or attests
    before the final bytes exist (DN-REL-12, DN-REL-13).
11. **Runs reflection JSON in a trimmed app** and mutes the warning (DN-REL-05,
    CS-CORE-01).
12. **Writes an osx, arm64 or Windows step from memory** and reports it as run.
13. **Sets `SuppressTrimAnalysisWarnings=true`** to get a green publish: the IL count
    prints `0` over hidden diagnostics (DN-REL-03, CS-CORE-01).
14. **Runs the artifact with `--version` only**: a trimmed app prints its version and
    cannot serialize (DN-REL-09, step 11).
