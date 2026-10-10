---
# Read on demand through the index. This glob matches no file, so a client never auto-loads the file.
paths:
  - "**/.swift-package-depth-on-demand"
title: Release
summary: The SW-REL family, owning the exact-patch toolchain pin, the static Linux SDK build, the glibc floor, build-product paths, stripping, SBOM, version stamping, assets and checksums, images, attestation, and the tag and API-breakage rules of a library release
---

# Release

Binds to Swift 6.4.0 (current) and 6.3.3 (previous), Static Linux SDK 0.1.0 and the SwiftPM SBOM flag of SE-0509
(Swift 6.4 only), all measured 2026-10-10. Every Windows, macOS, arm64 and GitHub Actions statement is
`unverified: read only`.

This file owns how a Swift package becomes a release: which toolchain builds it, which binary shape ships, how the
artifact is located, checked, stripped, stamped, hashed and described, and how a library tag must resolve for the
consumers who depend on it by version. Not owned here: the gate step list and the API-breakage gate itself are
`SW-GATE` (`SW-GATE-20`, with `SW-GATE-23` the action pin and `SW-GATE-25` the static-leg matrix). The CI test matrix
image is `SW-CORE-09`. How a dependency is declared is `SW-PKG` (`SW-PKG-09`, `SW-PKG-10`, `SW-PKG-26`, `SW-PKG-28`,
`SW-PKG-29`). The `canImport(Musl)` branch is `SW-LANG-02`, the durable write helper is `SW-IO-18`, the exit-status
table is `SW-CLI-01`, parser depth is `SW-SEC-01`, the vulnerability scan of `Package.resolved` and the SBOM is
`SW-SEC-21`, and enum evolution is `SW-API-11`. **SDK** means the pinned default shape, a library that wraps a CLI.
Without one, read "library".

Contents: [Dates and Defaults](#dates-and-defaults) · [Pins and Build Scripts](#pins-and-build-scripts) ·
[The Built Artifact](#the-built-artifact) · [Toolchain Commands](#toolchain-commands) ·
[Images and Provenance](#images-and-provenance) · [Tags and Library Resolution](#tags-and-library-resolution) ·
[The Build Log](#the-build-log) · [Unverified Here](#unverified-here) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Defaults

Measured 2026-10-10 against Swift 6.4.0 (Swift Build is its default engine) and 6.3.3, unless a row says read.
Floors say which mechanism gates them: the Static Linux SDK needs a Swift 6.1 toolchain, `--sbom-spec` exists on 6.4
only (6.3.3 exits 64 with `Unknown option`), and the Wasm rows need a 6.2 toolchain. Run every grep from the
repository root. Every grep is a locator, so read each hit before acting on it.

**Pinned defaults, the adopter may override each once per repository with the reason recorded:**

- Release assets are raw `tool-linux-amd64` style binaries plus `checksums.txt` (`SW-REL-13`). Rename `tool`.
- Tags are `vX.Y.Z`, annotated, one form per repository (`SW-REL-18`). A bare form is the override.
- Binaries are stripped and an unstripped twin is kept as a CI artifact (`SW-REL-08`).
- The SBOM is CycloneDX only (`SW-REL-11`). SPDX is built on request.
- Images are built only when the owner asks (`SW-REL-15`).
- Reproducibility is opt-in (`SW-REL-14`), and the 20 MiB size budget is a number to set per project.

| Code kind | Rows that bind |
|---|---|
| Library and SDK | `SW-REL-01`, `SW-REL-10` (only when the package claims Wasm), `SW-REL-17` to `SW-REL-22` |
| CLI and server | `SW-REL-01` to `SW-REL-16` |
| Source-distributed CLI plus library (built by the consumer from a tag, no shipped binary, image or checksum file) | `SW-REL-01`, `SW-REL-03`, `SW-REL-04`, `SW-REL-12`, `SW-REL-17` to `SW-REL-21` (`SW-REL-22` when it builds macros). `SW-REL-02`, `SW-REL-05` to `SW-REL-11` and `SW-REL-13` to `SW-REL-16` start when a binary, image or checksum file ships |
| Apple app and test code | none, signing and notarization are read-only material in `SW-APPLE` |

## Pins and Build Scripts

Gate: the greps in the table and the named blocks, run over release scripts, shipped `Dockerfile*` files and the
release workflow, never over the CI test matrix. A hit is the violation and empty output is the pass, except where a
cell says otherwise.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-REL-01 | Pin the release toolchain to one exact patch in `.swift-version` (`X.Y.Z`). Every `swift:` image tag in a release job and in a shipped `Dockerfile*` is that literal version (a variant suffix such as `-noble` is fine, an `ARG`-built tag is not, so write the literal), and the compiler the release job runs reports it. This row binds release jobs and shipped Dockerfiles only. The CI test matrix is `SW-CORE-09`. A snapshot selector is legitimate in a nightly-only repository. | swiftly and rules_swift select by that file, and a partial selector such as `6.4` resolves to whatever each machine holds (`swift:6.3` floated to 6.3.3 during the measurement). `swift --version` prints `Swift version 6.4 (swift-6.4-RELEASE)` for 6.4.0, so a naive compare fails a correct toolchain. A shared workflow can default its API and docs jobs to `swift:6.3-noble` (swiftlang/github-workflows 0.0.15). | (a) `grep -L -x -E -e '[0-9]+\.[0-9]+\.[0-9]+' .swift-version` lists the file when the pin is not exact (a missing file exits 2 and is a failure too). (b) block **pin-release**, which scans release Dockerfiles and the release workflow (rename its path to yours). `ARG`-built tags and nightly legs are flagged and read. (c) block **pin-compiler**. Watched red (measured 2026-10-10): a `6.4` pin and a `swift:6.3` tag in a Dockerfile and in the release workflow each printed, a test-matrix leg at `swift:6.2.0` was correctly not scanned, the exact twin printed nothing, and a `6.3.3` pin on the 6.4 image printed the `Swift version 6.4` line. | MUST |
| SW-REL-02 | Install the Static Linux SDK at exactly the toolchain's version, with its URL and `--checksum` taken from one source (`https://www.swift.org/api/v1/install/releases.json`, entry `static-sdk`). | A 6.3.3 SDK under the 6.4 compiler fails with `module compiled with Swift 6.3.3 cannot be imported by the Swift 6.4 compiler` (exit 1). A script can pass a `--checksum` copied from a stale document, and the checksum is the only integrity gate on the download. | (a) block **sdk-checksum** lists an install with no `--checksum`, continuation lines joined. (b) block **sdk-version** lists an SDK URL whose version differs from the pin. (c) `swift build --swift-sdk x86_64-swift-linux-musl` exits 1 on a version mismatch and 0 on a match. Watched red (measured 2026-10-10): the checksum-less line and a 6.3.3 URL under a 6.4.0 pin printed, a backslash-continued `--checksum` twin printed nothing, and (c) exited 1 against 0. | MUST |
| SW-REL-03 | Never present `--static-swift-stdlib` as the static recipe. It is tolerated only on a glibc fallback build, with `--build-system native`, a comment linking [swift-build#1764](https://github.com/swiftlang/swift-build/issues/1764), and a removal condition ("drop when the pinned toolchain contains swift-build#1763"). | On the Swift Build engine (the 6.4 default) it exits 1 with `undefined reference to '$s15Synchronization12_MutexHandleV11_unlockSlowyyF'` once any Foundation symbol is reachable (6.4.0, and 6.3.3 with `--build-system swiftbuild`). The native engine is deprecated with removal planned for 2026H2. State on 2026-10-10: the fix swift-build#1763 is merged to main and backported to 6.4.x, and 6.4.0 is the only 6.4 tag. The re-check is at 6.4.1 or later. | Block **stdlib-scan** lists a line that uses the flag without the native engine or an SDK. The comment and removal condition are a reading check. Behavioural probe for the removal condition, 6.4 only (the default engine there is Swift Build; on 6.3.3 the default is native and exits 0 whatever the fix state): build a product that uses `JSONEncoder` with `--static-swift-stdlib`, and exit 0 means the fix is present. Watched red (measured 2026-10-10): exit 1 on 6.4.0 default and on 6.3.3 with `--build-system swiftbuild`, exit 0 on 6.3.3 default (a linker warning only) and with `--build-system native` on both, and the permitted native fallback line passed the grep. | MUST |
| SW-REL-04 | Locate build products with `swift build` plus the build's own flags plus `--show-bin-path`. No script, workflow, Makefile or Dockerfile names `.build/release`, `.build/debug`, `.build/<triple>/...` or `.build/out/...`. A container that runs the toolchain on a bind-mounted work tree (`docker run -v "$PWD":/src ... swift` with `build`, `test`, `run` or `package`, SW-REL-06's glibc-floor build included) passes `-u "$(id -u):$(id -g)"` and `--scratch-path .build-linux` (any path that is not the host's `.build`), and a `Dockerfile` that copies the tree (`COPY . .`) has a `.dockerignore` listing `.build`. | Swift Build writes `<scratch>/out/Products/<Config>-<platform>-<arch>/`, so `.build/x86_64-swift-linux-musl/release` does not exist on 6.4.0 (`cp` exits 1). `.build/release` is repointed by the last build, and `--show-bin-path` without the `--swift-sdk` flag returns the host directory, which after a host build holds a glibc binary that `cp` ships silently. The native layout still exists on 6.3.3. The Windows layout on Swift Build 6.4 is `unverified: read only`. A `.build` is not portable between the host and a container: a host build followed by `docker run --rm -v "$PWD":/src -w /src swift:6.4 swift build` exits 1 with `precompiled file '/src/.build/out/ModuleCache.noindex/...SwiftShims....pcm' was compiled with module cache path '...' ... missing required module 'SwiftShims'`, the root-run container leaves root-owned files in `.build` that a later non-root build or `find` cannot open (`Permission denied`), and `COPY . .` of a built tree fails the image build the same way (exit 1) while a `.dockerignore` with `.build` builds (measured 2026-10-10, 6.4.0). | `grep -rn --include='*.sh' --include='*.yml' --include='*.yaml' --include='Makefile' --include='Dockerfile*' --include='*.mk' --exclude-dir=.build --exclude-dir=.claude --exclude-dir=.agents -e '\.build/release' -e '\.build/debug' -e '\.build/[A-Za-z0-9_.-]*/release' -e '\.build/[A-Za-z0-9_.-]*/debug' -e '\.build/out/' .`, where empty output = pass. A custom `--scratch-path` variable escapes the grep, so the `file` gate of `SW-REL-05` backs it up. Watched red (measured 2026-10-10): the plant printed both a `.build/release` path and a triple path, the twin printed nothing, and a `Package.swift` under `.build/checkouts` was not scanned. Block **container-scratch** prints a `docker run` or `podman run` line that builds without `--scratch-path` or without `-u` (continuation lines joined), and a second command prints `MISSING:` for a `COPY . .` Dockerfile with no `.dockerignore` entry. Both were watched red and green: the plant printed its three lines (no flags, no `--scratch-path`, no `-u`), and the twin and a copy of the plant under `.claude` printed nothing, the Dockerfile plant printed `MISSING:` and the twin and a Dockerfile with no `COPY .` printed nothing (measured 2026-10-10). | MUST |

**container-scratch** (SW-REL-04)

```sh
find . -type f \( -name 'Dockerfile*' -o -name '*.yml' -o -name '*.yaml' -o -name '*.sh' -o -name 'Makefile' -o -name '*.mk' \) -not -path './.build/*' -not -path './.claude/*' -not -path './.agents/*' -print0 | xargs -0 -r -n1 sh -c 'sed -e ":a" -e "/\\\\\$/N; s/\\\\\n//; ta" "$0" | grep -n -P "^(?!(?=.*--scratch-path)(?=.*( -u | --user)))(?=.*(docker|podman) run.*swift (build|test|run|package))" | sed "s|^|$0:|"'
grep -rq --include='Dockerfile*' --exclude-dir=.build --exclude-dir=.claude --exclude-dir=.agents -E -e '^(COPY|ADD) +\.( |$)' . && { grep -q -e '^\.build' .dockerignore 2>/dev/null || echo 'MISSING: .dockerignore does not list .build'; }
```

**pin-release**

```sh
read -r V < .swift-version && : "${V:?empty .swift-version}" || exit 66
{ grep -rn --include='Dockerfile*' --exclude-dir=.build --exclude-dir=.claude --exclude-dir=.agents -e 'swift:' . ; grep -n -e 'swift:' .github/workflows/release.yml ; } | grep -v -F -e "swift:$V"
```

**pin-compiler** (drops a trailing `.0`, because `swift --version` prints `6.4` for 6.4.0)

```sh
read -r V < .swift-version && : "${V:?empty .swift-version}" || exit 66
P=${V%.0}
swift --version | grep -F -e 'Swift version' | grep -v -F -e "Swift version $P ("
```

**sdk-checksum**

```sh
find . -type f \( -name 'Dockerfile*' -o -name '*.yml' -o -name '*.yaml' -o -name '*.sh' -o -name 'Makefile' \) -not -path './.build/*' -not -path './.claude/*' -not -path './.agents/*' -print0 | xargs -0 -r -n1 sh -c 'sed -e ":a" -e "/\\\\\$/N; s/\\\\\n//; ta" "$0" | grep -n -e "swift sdk install" | grep -v -e "--checksum" | sed "s|^|$0:|"'
```

**sdk-version**

```sh
read -r V < .swift-version && : "${V:?empty .swift-version}" || exit 66
grep -rn --include='Dockerfile*' --include='*.yml' --include='*.yaml' --include='*.sh' --include='Makefile' --exclude-dir=.build --exclude-dir=.claude --exclude-dir=.agents -E -e 'static-linux-[0-9.]+\.artifactbundle' . | grep -v -F -e "swift-$V-RELEASE_static-linux"
```

**stdlib-scan**

```sh
grep -rn --include='Makefile' --include='Dockerfile*' --include='*.sh' --include='*.yml' --include='*.yaml' --include='*.mk' --exclude-dir=.build --exclude-dir=.claude --exclude-dir=.agents -e 'static-swift-stdlib' . | grep -v -e 'build-system native' -e 'swift-sdk'
```

```sh
# wrong: the pre-6.4 recipe, and a path that Swift Build does not write
swift build -c release --static-swift-stdlib
cp .build/release/tool dist/tool-linux-amd64

# right: the SDK by triple, and the path from the build's own flags
SDK=x86_64-swift-linux-musl
swift build -c release --swift-sdk "$SDK"
BIN="$(swift build -c release --swift-sdk "$SDK" --show-bin-path)/tool"
```

## The Built Artifact

Gate: run a tool on the shipped file, never on the source. Each block is a command on the artifact, and a violation is
printed output unless a row says an exit code.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-REL-05 | A Linux CLI or server release is built with `swift build -c release --swift-sdk <arch>-swift-linux-musl`, the SDK selected by triple and never by bundle id, and the shipped file is reported statically linked. Out of scope when the binary needs `dlopen`, NSS or a C library the SDK lacks, which is `SW-REL-06`. | It runs unchanged on Ubuntu 22.04, Debian 12 and 13, Amazon Linux 2023, AlmaLinux 9, Alpine and `FROM scratch` (6.4.0 and 6.3.3), with no glibc floor. The bundle id from `swift sdk list` fails with `has multiple target triples`. It is also the leg `SW-GATE-25` requires. | Block **static-check** (`file(1)` is not in the swift image, so run it on the host or add it). `grep -rn --include='*.yml' --include='*.yaml' --include='*.sh' --include='Makefile' --include='Dockerfile*' --exclude-dir=.build --exclude-dir=.claude --exclude-dir=.agents -e 'swift-sdk[ =]swift-[0-9.]*-RELEASE_static' .` lists a bundle id used as the selector, where empty output = pass (Wasm ids end in `_wasm` and are exempt). `ldd` exits 1 with "not a dynamic executable" on a good binary, which is not a failure. Watched red (measured 2026-10-10): a dynamic binary printed its `ELF 64-bit LSB pie executable` line and the musl binary printed nothing. | MUST |
| SW-REL-06 | A dynamic glibc binary is built in the oldest-glibc image the project supports (`swift:X.Y.Z-amazonlinux2023`, glibc 2.34, or the `-rhel-ubi9` variant, because `swift:X.Y.Z-ubi9` does not exist), never in `swift:X.Y.Z` or `latest` (Ubuntu 26.04 with glibc 2.43 for 6.4). Check the floor on the object the host must supply: the executable for a static-stdlib build, the toolchain runtime libraries for a dynamic one. | The `swift:6.4` static-stdlib output died on Ubuntu 22.04, Debian 13 and Amazon Linux 2023 with `GLIBC_2.43' not found`. Built in `swift:6.4-amazonlinux2023`, the same source ran on six hosts. A dynamic executable shows at most `GLIBC_2.34` while its `libswiftCore.so` needs 2.38 and 2.43, so an executable-only check is green and the host fails. A plain `objdump -T` of a dynamic executable is blind. | Blocks **floor-exe** and **floor-runtime** (change `floor=` to your floor), where empty output = pass. Watched red (measured 2026-10-10): static-stdlib builds showed highest 2.43, 2.38, 2.35 and 2.34 in the 6.4, noble, jammy and AL2023 images. Dynamic executables all showed 2.34. `libswiftCore.so` printed 2.38 and 2.43 on `swift:6.4` and nothing on the AL2023 image. | MUST (when a dynamic glibc binary is released) |
| SW-REL-07 | The static leg runs the artifact it just built, in the target image: `--version` exits 0, one `swift-subprocess` `run()` if the CLI spawns processes, and the directory-fsync strace check where it persists state. A `FROM scratch` image has no `/bin/echo` and an empty `PATH`. | Upstream CI marks swift-subprocess on the Static SDK "Build only". Here `run()` with `.path` and `.name`, 1 MiB of output and task cancellation (child killed after 307 ms) all passed on 6.4.0 and 6.3.3. `Data.write(.atomic)` issues no directory fsync, and the `canImport(Musl)` branch of the `SW-IO-18` helper does. | Block **static-run**: `--version` exits 0 and the final `grep -q` exits 0 when the directory fsync is present. Run strace inside `swift:6.4` even when 6.3 built the binary (its package needs glibc 2.43, and a missing trace is a tool failure, not a pass). The image has no `strace`: `apt-get install -y strace` as root, and keep the default seccomp profile so `ptrace` works. Watched red (measured 2026-10-10): the naive writer printed `fsync` of the file then `rename` with no directory fsync and exited 1, the durable writer exited 0. | MUST |
| SW-REL-08 | Strip the shipped binary after the build, keep the unstripped twin as a CI artifact (not a release asset), and budget the stripped size. `FoundationEssentials` is a compile-time guard that keeps ICU-dependent API out, not a size lever. | An unstripped static binary is 2.5x larger for the ICU program (138 MB against 55.8 MB) and 5x for the small one (53.2 MB against 10.7 MB). An accidental `DateFormatter` or `Locale` takes the program from 10.7 MB to 55.8 MB, and `import Foundation` against `import FoundationEssentials` for identical code is byte-identical at 10,718,576 bytes, so the 45 MB is ICU. The static binary's backtrace is addresses only with or without symbols (exit 132 under `SWIFT_BACKTRACE=enable=yes` with the static helper, and exit 132 with no stderr under the default environment where no helper is in the image), so symbol names come only from the twin. | Block **strip-twin**: the `find` lists a file over the 20 MiB budget (set the number per project), and `addr2line` on the twin prints a `$s...` symbol where the shipped file prints `??`. Watched red (measured 2026-10-10): the `find` listed the 55.8 MB build and nothing for the 10.7 MB build, `addr2line` resolved a `$s...` symbol on the twin only, and `nm` on the stripped file printed `no symbols`. | SHOULD |
| SW-REL-09 | On the static leg, bound the recursion of any `Task` that recurses deeply or link with `-Xlinker -z -Xlinker stack-size=0x80000`, and load no code at run time (`dlopen`, plugins, SourceKit). Compile such code out under `#if`. | musl gives non-main threads a 128 KiB stack. Recursion in a `Task` that reached depth 5000 on glibc crashed at depth 400 with exit 139, and `dlopen` returns nil ("Dynamic loading not supported") without a crash. SwiftLint's static build raises the stack and compiles SourceKit out. `SW-SEC-01` owns the parser depth default, which is consistent with this stack. | Run the depth probe on the static binary (a test that recurses to the deepest depth the program accepts inside a `Task`), where exit 0 is required. `grep -Rn --include='*.swift' --exclude-dir=.build -e 'dlopen(' -e 'NSClassFromString' -e 'Bundle(path' Sources` lists loaders, and read each hit for an `#if` that excludes the static leg, because a grep cannot see a compile condition. Watched red (measured 2026-10-10): depth 1000 in a `Task` exited 139 on musl and 0 on glibc, and the grep printed the planted `dlopen` call. Which code needs the stack is a reading heuristic. | SHOULD |

**static-check**

```sh
command -v file >/dev/null || exit 69    # the swift image has no file(1): without it the pipe below is empty and reads as a pass
test -f dist/tool-linux-amd64 || exit 66
file dist/tool-linux-amd64 | grep -v -e 'statically linked'
```

**floor-exe** (executable of a static-stdlib build)

```sh
BIN=dist/tool-glibc
command -v objdump >/dev/null || exit 69
test -f "$BIN" || exit 66
objdump -T "$BIN" | grep -o 'GLIBC_[0-9.]*' | sed 's/GLIBC_//' | sort -V -u | awk -v floor=2.34 'function v(s){split(s,a,".");return a[1]*1000+a[2]} v($0)>v(floor){print "GLIBC_" $0 " above floor " floor}'
```

**floor-runtime** (a dynamic build, inside the build image)

```sh
command -v objdump >/dev/null || exit 69
test -f /usr/lib/swift/linux/libswiftCore.so || exit 66
objdump -T /usr/lib/swift/linux/libswiftCore.so | grep UND | grep -o 'GLIBC_[0-9.]*' | sed 's/GLIBC_//' | sort -V -u | awk -v floor=2.34 'function v(s){split(s,a,".");return a[1]*1000+a[2]} v($0)>v(floor){print "GLIBC_" $0 " above floor " floor}'
```

**static-run** (rename `save` to the subcommand that writes state)

```sh
command -v strace >/dev/null || exit 69
dist/tool --version
DIR=$(mktemp -d)
strace -f -y -e trace=fsync,fdatasync,rename,renameat,renameat2 -o trace.txt dist/tool save "$DIR/target"
grep -q -e "fsync([0-9]*<$DIR>)" trace.txt
```

**strip-twin**

```sh
: "${ADDR:?set ADDR to an address from a crash trace}"
command -v addr2line >/dev/null || exit 69
BIN=dist/unstripped-tool
cp "$BIN" dist/tool.debug
strip -o dist/tool-linux-amd64 "$BIN"
find dist -maxdepth 1 -name 'tool-*' -size +20M
addr2line -f -C -e dist/tool.debug "$ADDR"
```

`ADDR` is an address from a crash trace. The same `addr2line` call on `dist/tool-linux-amd64` prints `??`.

## Toolchain Commands

Gate: the toolchain's own build, test and hash commands. Each cell names the exit code or the output that fails.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-REL-10 | A package that claims Wasm has a CI leg `swift build --swift-sdk <swiftCompilerTag>_wasm --target Lib` per claimed library target. A dependency that does not build for WASI (swift-subprocess) carries `condition: .when(platforms: [...])` plus a `canImport` guard. Wasm tests are Swift Testing only, run as `swift test --disable-xctest --swift-sdk <id>`. | swift-subprocess fails for WASI (`'grp.h' file not found`) and takes the whole build down with exit 1. `swift test --swift-sdk <wasm>` exits 1 (`posix_spawn error: Exec format error`) unless `--disable-xctest` is passed, even with no XCTest present. The one-line example in swift-testing `Documentation/WASI.md` omits the flag. | `swift build -c release --target PureLib --swift-sdk swift-6.4.0-RELEASE_wasm` exits 0 (rename `PureLib` and use the id from `swiftc -print-target-info`, key `swiftCompilerTag`). `swift test --disable-xctest --swift-sdk swift-6.4.0-RELEASE_wasm` exits 0 and prints "Test run with N tests". The manifest side is a reading heuristic. Watched red (measured 2026-10-10): build exit 0, `swift test` without the flag exit 1, with the flag exit 0. | MUST (when the package claims Wasm, Swift 6.2+) |
| SW-REL-11 | The release SBOM is `swift build -c release --sbom-spec cyclonedx --sbom-output-dir DIR`, run on Swift 6.4 from a clean tree at the tag and published as `tool-linux-amd64.cdx.json`. Never `swift package generate-sbom`, never the native engine, never a build from a dirty tree (the installed `.claude/` and `.agents/` directories are untracked files too, so run `printf '.claude/\n.agents/\n' >> .git/info/exclude` first), and never gate on the file's bytes. | `generate-sbom` and `--build-system native` omit build-time conditionals and warn so. Swift 6.3.3 has no flag (`error: Unknown option '--sbom-spec'`, exit 64). The component name is the checkout directory and its version is the git tag verbatim (`unknown` without git, `<tag>-modified` from a dirty tree). The file name carries a timestamp and re-runs never overwrite. SPDX is built on request only, and `SW-SEC-21` scans `*.cdx.json`. | (a) `grep -rn --include='*.sh' --include='*.yml' --include='*.yaml' --include='Makefile' --include='Dockerfile*' --exclude-dir=.build --exclude-dir=.claude --exclude-dir=.agents -e 'generate-sbom' .` and `grep -rn --include='*.sh' --include='*.yml' --include='*.yaml' --include='Makefile' --include='Dockerfile*' --exclude-dir=.build --exclude-dir=.claude --exclude-dir=.agents -e 'build-system native.*sbom-spec' -e 'sbom-spec.*build-system native' .` each print nothing on a pass. (b) block **sbom-tag** lists an SBOM that lacks the tag, which also fires for a dirty tree. Watched red (measured 2026-10-10): the plant printed the `generate-sbom` and native lines and the twin printed nothing, a clean tag build exited 0 and the check printed nothing, a tree with untracked files produced `v1.2.3-modified` and the check listed both files, and a clean tagged tree with only an untracked `.claude/note` produced `v1.0.0-modified` where the same tree with `.claude/` in `.git/info/exclude` produced `v1.0.0`. | MUST (Swift 6.4, SE-0509) |
| SW-REL-12 | `--version` prints the tag minus `v`. The value comes from a build-tool plugin (`.buildCommand`, with `inputFiles` and `outputFiles`) or a generated file fed by a version file the release job writes, or by `git describe --tags --always --dirty`. Never an environment variable read inside a plugin, never a `.prebuildCommand` that runs a source-built tool, never a hardcoded default. | Swift Build, the 6.4 default, does not pass the environment to plugin commands (`MYTOOL_VERSION=9.9.9` printed `1.2.3-dirty` on Swift Build and `9.9.9` on native, on 6.4.0 and 6.3.3). A prebuild command cannot use executables built from source. A version file works on both engines. A `git describe` result is not a build input, so an incremental build keeps a stale value and a release uses a clean scratch path. A `sed` of a tracked template dirties the tree. | Block **stamp-check**, where empty output = pass and `1.2.3-dirty`, `1.2.3-1-gSHA`, `0.0.0-unknown`, an empty line and a failing `swift run` all print `FAIL: got '...'`. Watched red (measured 2026-10-10): a tag checkout printed nothing, and a dirty tree, an untagged commit and a checkout without git each printed one line, identically on 6.3.3. | MUST |
| SW-REL-13 | CLI release assets are raw static binaries `tool-linux-amd64` and `tool-linux-arm64` plus `checksums.txt` in `sha256sum` format, and `sha256sum --check --strict` passes on the downloaded set. **Pinned default, the adopter may override once:** tarballs `tool-VERSION-ARCH-linux-musl.tar.gz` built with `tar --sort=name --mtime=@EPOCH --owner=0 --group=0 --numeric-owner` and `gzip -n`. | One mirror and installer shape across repositories. The Swift ecosystem ships archives (swiftly, SwiftFormat, SwiftLint), so this is a pinned decision and not an ecosystem convention. A default `tar` and `gzip` embeds mtimes and changes the digest per run. The darwin and windows rows are `unverified: read only`. | Block **asset-set** (a printed `0` is a missing asset). `(cd dist && sha256sum --check --strict checksums.txt)` exits 0. Watched red (measured 2026-10-10): the plant printed `1` and `0`, a tampered asset exited 1 and a clean set exited 0, and the deterministic tar was identical across a `touch` where plain `tar` differed. The linux-arm64 asset built with `aarch64-swift-linux-musl` was never run. | MUST |
| SW-REL-14 | A CLI release can prove reproducibility by building twice from clean scratch directories at the same absolute source and scratch paths, with the pinned toolchain and, for a static build, fixed SDK mtimes. The two binary digests are equal. Compare SBOMs only after normalising UUIDs and timestamps, and never compare image IDs. | The digests were identical with fixed paths (dynamic and static, both toolchains) and different with another scratch path (807 bytes of embedded paths), another source path, or a re-installed SDK (new file mtimes). `find` over the SDK directory with `touch -h -d @1700000000 {} +` after `swift sdk install` restores identity, and three unfixed Docker builds gave three digests. No Swift primary source promises bit-for-bit output, so the claim is the measurement. | Block **repro-check**, where empty output = pass, `NOT REPRODUCIBLE` is the violation and `MISSING BUILD` means a build is absent (`cmp` exits 2 for it). Watched red (measured 2026-10-10): the same-path pair printed nothing and each of the scratch-path, source-path and re-installed-SDK variants printed the line. This is opt-in per release. | SHOULD |

**sbom-tag**

```sh
TAG=$(git describe --tags --exact-match) || exit 66    # not on a tag
test -d sboms || exit 66
(cd sboms && grep -L -F -e " : \"$TAG\"" ./*.json)
```

**stamp-check**

```sh
TAG=v1.2.3 SCRATCH=$(mktemp -d)    # rename TAG, and tool to your executable
GOT=$(swift run -c release --scratch-path "$SCRATCH" tool --version) && [ "$GOT" = "${TAG#v}" ] || echo "FAIL: got '$GOT'"
```

**asset-set**

```sh
for p in linux-amd64 linux-arm64; do ls dist | grep -c -x -e "tool-$p"; done
```

**repro-check**

```sh
test -f dist1/tool -a -f dist2/tool || echo "MISSING BUILD"
cmp dist1/tool dist2/tool || echo "NOT REPRODUCIBLE"
for f in sbom1.json sbom2.json; do sed -E -e 's/urn:uuid:[0-9a-f-]{36}/urn:uuid:UUID/g' -e 's/[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:]{8}Z/TS/g' "$f" | sha256sum; done | cut -d' ' -f1 | uniq | awk 'END { if (NR != 1) print "SBOM DIFFERS" }'
```

## Images and Provenance

Gate: `grep -L` over the Dockerfile and the release workflow lists the file when a required line is missing, so empty
output = pass. The exit-status table is `SW-CLI-01`.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-REL-15 | A static image, built only when the owner asks, is two-stage: a `swift:X.Y.Z` build stage with the Static SDK installed `--checksum`, then `FROM scratch`, `USER` non-root, and an exec-form `ENTRYPOINT`. The running image exits per `SW-CLI-01` (0, 64 usage, 69 unavailable). **SHOULD, `unverified: read only`:** a binary that opens TLS copies a CA bundle into the scratch image, and the release leg makes one HTTPS request from the image. | 16.9 MB against 415 MB for the same app on `swift:6.4-slim` with a dynamic binary, and no shell. A `FROM scratch` image has no libc, CA bundle, `/tmp` or timezone data. Where the TLS stack looks for certificates in a static musl binary was not measured, and `SW-NET-08` owns the `SSL_CERT_FILE` note. | `grep -L -e '^USER ' Dockerfile`, `grep -L -e '^FROM scratch' Dockerfile` and `grep -L -e '^ENTRYPOINT \[' Dockerfile` each list the file when the line is missing, so empty output = pass. Read the `USER` value, which must not be `root`. `SW-REL-02` (a) applies to the Dockerfile. `docker run --rm IMG --bogus` exits 64 and `docker run --rm IMG --unavailable` exits 69 (rename `IMG` and the flags to your image and a failing input). Watched red (measured 2026-10-10): a Dockerfile with no `USER` and one with no checksum each listed themselves, the shell-form `ENTRYPOINT` plant was listed, and exits were 0, 64 and 69 on 6.4.0 and 6.3.3. The CA-bundle clause is a reading heuristic: the Dockerfile copies `/etc/ssl/certs/ca-certificates.crt` from the build stage and the HTTPS request is the run. | MUST (when an image ships) · SHOULD (CA bundle) |
| SW-REL-16 | Release workflows run `actions/attest-build-provenance` with `subject-checksums: dist/checksums.txt`, declare `id-token: write` and `attestations: write`, fetch tags (`fetch-depth: 0`), and pin every `uses:` at a 40-hex SHA (`SW-GATE-23`). Consumers verify with `gh attestation verify`. | Provenance keywords matched 2 of 40 surveyed Swift repositories and none signed a Linux artifact, so this is a differentiator and not a convention. Whether the attestation verifies is `unverified: read only` (no GitHub run was made). | `grep -L -e 'id-token: *write' .github/workflows/release.yml`, `grep -L -e 'attestations: *write' .github/workflows/release.yml`, `grep -L -e 'subject-checksums: *dist/checksums.txt' .github/workflows/release.yml` and `grep -L -e 'fetch-depth: *0' .github/workflows/release.yml` each list the file when the line is missing, so empty output = pass (rename the path to your release workflow). The SHA pin is the check of `SW-GATE-23`. Watched red (measured 2026-10-10) for the greps only: the compliant workflow printed nothing, the plant listed the file for each. | SHOULD |

## Tags and Library Resolution

Gate: git and SwiftPM resolution. A library or SDK is consumed by version, so a tag that does not resolve fails every
consumer, and no gate in the source tree sees it.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-REL-17 | The root manifest (and each `Package@swift-*.swift`) of a tagged library has no `.package(path:)`, `branch:` or `revision:` dependency. A root consumer may use `path:` for local development, a tagged library never does. | Resolving a tagged library with any of them fails for every version consumer with exit 1: `required using a stable-version but 'lib' depends on an unstable-version package 'helper'`, even for a `path:` inside the same repository. A `branch:` consumer gets `depends on local package ... which is not supported`. Merging the code as a second target of the same package builds. `SW-PKG-09` owns the declaration forms, and this row adds `path:` and the consumer smoke test. | `find . -maxdepth 1 -name 'Package*.swift' -exec grep -n -e '\.package(path:' -e '\.package(name:[^)]*path:' -e 'branch:' -e 'revision:' {} +`, where empty output = pass (the root only: a nested `Benchmarks` or test-fixture manifest is never resolved for a consumer). Publishability smoke test: `swift package resolve` in a throw-away consumer that depends on the library by a `file://` URL at the local tag exits 0. Watched red (measured 2026-10-10): the `path:`, `branch:` and `revision:` libraries each printed their line and their consumers exited 1, the pure-URL twin printed nothing and its consumer exited 0. | MUST |
| SW-REL-18 | Release tags are three-component SemVer, `vX.Y.Z` or `vX.Y.Z-pre.N`, one form per repository, with no one- or two-component tags and no word prefixes, and every tag is annotated. **Pinned default:** the `v` form. An adopter that tags bare removes the `v` from the pattern, and the check then also rejects any `v` tag. | SwiftPM resolves `1.3` as 1.3.0 although its documentation says tags with fewer than three components are not versions. `release-1.4.0` is silently ignored. When both `v1.0.0` and `1.0.0` exist the bare tag wins. A lightweight tag carries no tagger or date and is invisible to `git describe` without `--tags`. | Block **tag-shape**, where empty output = pass. Watched red (measured 2026-10-10): a repository with `1.1.0`, `1.3`, `release-v1.4.0`, `v1.6` and a lightweight `v1.5.0` printed the four shape violations and `commit v1.5.0`, and the `v` and bare twins printed nothing against their own pattern. | MUST |
| SW-REL-19 | Never move, re-create or delete a pushed release tag, and confirm the tag does not exist on the remote before pushing. A bad release is followed by the next patch. | After `git tag -f` a consumer with `Package.resolved` keeps the old revision (exit 0, no message) while a fresh consumer gets the new one, both labelled `1.2.0`. SwiftPM has no `retract`. A registry unpublish endpoint is `unverified: read only`. | `git ls-remote --exit-code --tags origin "refs/tags/$TAG"` must exit 2 before the push, and exit 0 means the tag exists and is the violation. Watched red (measured 2026-10-10): an existing tag exited 0 and an absent tag exited 2. | MUST |
| SW-REL-20 | Before tagging a library or SDK release, `swift package diagnose-api-breaking-changes "$LAST_RELEASE_TAG"` exits 0 from a checkout that has the tags (`fetch-depth: 0`, `fetch-tags: true`), and the version bump agrees with the report. The baseline of a release is the previous release tag, not the pull request's base branch. `SW-GATE-20` owns the gate and `SW-API-11` the enum rules. | A shared workflow defaults the baseline to the PR base, which on a non-PR event is empty and on a PR proves only "no new break against main" (swiftlang/github-workflows 0.0.15). Exit 1 has two meanings, `1 breaking change detected` and `error: Couldn't get revision` (a missing tag or a shallow clone). | The command exits 0. On exit 1, block **api-cause** tells the two cases apart (it prints nothing on exit 0). A first plant that does not compile produces no report, so build first. Watched red (measured 2026-10-10): a removed function and a re-typed parameter exited 1, an additive change exited 0, a missing tag exited 1 with `Couldn't get revision`, on 6.4.0 and 6.3.3. **api-cause** printed `1 breaking change detected` for the removed function, `Couldn’t get revision` for the missing tag and nothing on the clean library, where the older `grep -e 'breaking change'` pipe printed `No breaking changes detected` on that pass (measured 2026-10-10, 6.4.0). | MUST (for a library or SDK with tagged releases) |
| SW-REL-21 | A library at 0.x tells consumers how to depend (`.upToNextMinor(from:)` in the README snippet) or moves to 1.0 before it has users who run `from:`. | SwiftPM gives 0.x no special treatment: `from: "0.1.0"` resolved 0.3.0 across two breaking minors, and `.upToNextMinor(from: "0.1.0")` resolved 0.1.0 (6.4.0). | Reading heuristic: `git tag -l 'v0.*'` lists the 0.x tags, then read the README dependency snippet for `upToNextMinor`. The resolution behaviour was watched (measured 2026-10-10), the README check was not. | SHOULD |

**tag-shape**

```sh
git tag -l | grep -v -x -E 'v[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?'
git for-each-ref --format='%(objecttype) %(refname:short)' refs/tags | grep -v -e '^tag '
```

**api-cause**

```sh
: "${LAST_RELEASE_TAG:?set LAST_RELEASE_TAG}"
# run once into a log and read it only on a failure: 'breaking change' is a substring of the pass line `No breaking changes detected`
# a scratch path goes before the subcommand (`swift package --scratch-path DIR diagnose-api-breaking-changes TAG`): after it the exit is 64
LOG=$(mktemp); swift package diagnose-api-breaking-changes "$LAST_RELEASE_TAG" > "$LOG" 2>&1 || { grep -e '[1-9][0-9]* breaking change' -e 'get revision' "$LOG" || tail -n 20 "$LOG"; }
```

```swift
// wrong: reachable from the tag, so every version consumer fails to resolve
let wrongDependencies: [Package.Dependency] = [
    .package(path: "../Shared"),
    .package(url: "https://example.com/helper.git", branch: "main"),
]

// right: a released version range
let rightDependencies: [Package.Dependency] = [
    .package(url: "https://example.com/helper.git", from: "1.0.0")
]
```

## The Build Log

Gate: read the log of a build on a toolchain that publishes prebuilt manifests. This is a build-time cost on small
runners and not a correctness issue.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-REL-22 | A package that builds macros takes swift-syntax at a released tag on a CI toolchain that has a published prebuilt manifest, never an `exact:` prerelease tag, and CI greps the build log for "Prebuilt artifact". `SW-PKG-10` owns the declaration policy, and leaf executables are exempt from it. | Prebuilts are keyed by the resolved tag and `swift-X.Y.Z-RELEASE` plus the platform. `exact: "604.0.0-prerelease-2026-09-15"` got a 404 and built from source (73 s against 16 s with `-j 2`). Ubuntu 26.04 and Swift 6.3.3 have none (SwiftPM 6.4.0 prebuilts are on by default, read 2026-10-10). | `swift build -v > build.log 2>&1`, then `grep -L -e 'Prebuilt artifact' build.log` lists the log when no prebuilt was downloaded (empty output = pass on a supported toolchain). `grep -rn --include='Package.swift' --include='Package@swift-*.swift' --exclude-dir=.build -e 'swift-syntax.*exact' .` lists an `exact:` pin, where empty output = pass. Watched red (measured 2026-10-10): the log check listed the `exact`, Ubuntu 26.04 and 6.3.3 logs and nothing for `from:` on noble, and the manifest grep printed the planted `exact:` line. | CONSIDER |

## Unverified Here

These carry no MUST and are named so a reader does not mistake silence for a measurement (read 2026-10-10).

- Windows, macOS (universal binaries, notarization), Android and Embedded releases. The rules say nothing about them.
- The linux-arm64 asset, and whether `actions/attest-build-provenance` verifies with `gh attestation verify` for a
  Swift release.
- Where `URLSession`, AsyncHTTPClient and swift-nio-ssl look for certificates in a static musl binary, and the failure
  text when the directory is absent. `SW-REL-15` holds the SHOULD until it is measured.
- Whether NIO threads on real musl keep the 128 KiB stack behaviour of `SW-REL-09`.
- Re-check `--static-swift-stdlib` when 6.4.1 or a later tag lands (`SW-REL-03`), and the swift-syntax prebuilt
  manifest per toolchain (`SW-REL-22`).

## What Agents Get Wrong Here

1. **`swift build -c release --static-swift-stdlib` as "the static build".** It links on a stdlib-only toy and fails once a Foundation symbol is reachable, on the Swift Build engine (the 6.4 default; 6.3.3 builds with native and exits 0). `SW-REL-03`.
2. **Copying `.build/release/tool` or `.build/x86_64-swift-linux-musl/release/tool` into a Dockerfile, or running `--show-bin-path` without the build's `--swift-sdk` and shipping the host binary.** `SW-REL-04`, `SW-REL-05`.
3. **`.swift-version` as `6.4` or `latest`, `FROM swift:latest`, or "fixing" the pin to `6.4` because `swift --version` prints it.** `SW-REL-01`.
4. **A `FROM swift:6.4` build stage plus `FROM ubuntu:22.04` for a dynamic binary, or declaring the floor from `objdump -T` of a dynamic executable.** Run the check on the right object and run the artifact in the oldest target image. `SW-REL-06`.
5. **Stamping with an environment variable read inside a plugin, a hardcoded `let version = "1.0.0"`, or a `.prebuildCommand` with a source-built tool.** `SW-REL-12`.
6. **Tags `v1.2`, `1.2` or `release-1.2.0`, a lightweight tag, or `git tag -f` to "fix the release".** `SW-REL-18`, `SW-REL-19`.
7. **A temporary `.package(path: "../Shared")` or `branch: "main"` in a library that then gets tagged.** `SW-REL-17`.
8. **Passing the bundle id from `swift sdk list` to `--swift-sdk`, installing the SDK without `--checksum`, or installing one from another release than the toolchain.** `SW-REL-02`, `SW-REL-05`.
9. **Treating `swift package generate-sbom` as the release SBOM, inventing `swift build --sbom` or `--reproducible`, or gating on SBOM bytes.** `SW-REL-11`, `SW-REL-14`.
10. **`#if canImport(Glibc)` only, deep recursion in a `Task`, or `dlopen` on the static leg.** `SW-LANG-02` owns the first, `SW-REL-09` the others.
11. **`swift test --swift-sdk <wasm>` without `--disable-xctest`, or swift-subprocess in a package that claims Wasm.** `SW-REL-10`.
12. **Stripping the binary and losing all crash evidence, or refusing to strip and shipping 138 MB.** `SW-REL-08`.
13. **Running the API gate against `main` or the PR base and calling it a release check, or reading exit 1 on a shallow clone as "the API broke".** `SW-REL-20`.
14. **Porting cargo or Go ideas: `--locked` (exit 64), a `retract` stanza, "yank", or `cargo publish` for a package.** `SW-PKG-28` names `--force-resolved-versions`.
15. **Releasing 0.x with a breaking minor and a `from:` README snippet.** `SW-REL-21`, `SW-REL-18`.
