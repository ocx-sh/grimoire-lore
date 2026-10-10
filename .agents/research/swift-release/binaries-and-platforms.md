---
title: "Swift release binaries and platforms: static Linux SDK, glibc floor, Swift Build output paths, musl runtime, prebuilts, Wasm, Windows"
topic: release/binaries-and-platforms (SW-REL), wave 3 dive W3-6 (revised), rows M-N-01..M-N-04, M-N-10, M-N-12, M-G-11
agent: W3-6 binaries-and-platforms
model: sonnet
date_researched: 2026-10-10
sources_count: 27
fixtures: /home/mherwig/.cache/research-lang/swift-tools/fixtures/binaries-and-platforms/
scope: >
  Covers how a Swift CLI or library becomes a portable Linux binary on Swift 6.4.0 (and 6.3.3): the static Linux SDK recipe, the
  --static-swift-stdlib failure and its fix status, the glibc symbol floor, where Swift Build puts binaries, what runs and what breaks
  inside a musl binary (swift-subprocess, the SW-IO-18 durable helper, dlopen, task stacks), binary size, swift-syntax prebuilts, Wasm
  builds and tests, and a Windows section that is read-only. Rule IDs are SW-REL-BP-nn (provisional; the sibling dive uses SW-REL-RP-nn).
  Not covered: SBOM, checksums, stamping, images, library tags (sibling release-pipeline.md), macOS universal binaries and notarisation,
  Android, Embedded Swift beyond one build, Bazel. Every Windows and Apple statement is "unverified: read only" (owner Q7).
---

# Swift release binaries and platforms

Research date 2026-10-10. Toolchains: `swift:6.4` (Swift 6.4.0, `swiftCompilerTag` `swift-6.4.0-RELEASE`, Ubuntu 26.04.1, glibc 2.43) and `swift:6.3` (Swift 6.3.3).
Extra images pulled for this dive: `swift:6.4-noble`, `swift:6.4-jammy`, `swift:6.4-amazonlinux2023`, `swiftlang/swift:nightly-6.4.x-noble` (Swift 6.4.4-dev).
Every plant lives under the fixture directory above; scripts there are named in "Verification runs".

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The engine change that moved every path](#1-the-engine-change-that-moved-every-path)
   2. [Static Linux SDK: install, select, build](#2-static-linux-sdk-install-select-build)
   3. [`--static-swift-stdlib`: red on 6.4.0 and 6.3.3, fixed upstream, not yet released](#3---static-swift-stdlib-red-on-640-and-633-fixed-upstream-not-yet-released)
   4. [Where the binary is: `--show-bin-path` and the `release` symlink](#4-where-the-binary-is---show-bin-path-and-the-release-symlink)
   5. [The glibc floor](#5-the-glibc-floor)
   6. [What runs inside a musl binary](#6-what-runs-inside-a-musl-binary)
   7. [Size: the import line is not the lever](#7-size-the-import-line-is-not-the-lever)
   8. [swift-syntax prebuilts](#8-swift-syntax-prebuilts)
   9. [Wasm](#9-wasm)
   10. [Windows (unverified: read only)](#10-windows-unverified-read-only)
   11. [The Linux release recipe](#11-the-linux-release-recipe)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- **Linux release CLIs use the static Linux SDK:** `swift build -c release --swift-sdk x86_64-swift-linux-musl`. `file` reports "statically linked", the binary runs on `FROM scratch`, and it ran unchanged in Ubuntu 22.04, Debian 12/13, Amazon Linux 2023, AlmaLinux 9 and Alpine (6.4.0 and 6.3.3).
- **`--static-swift-stdlib` is not the recipe.** Under the default build system it fails to link as soon as a Foundation symbol is reachable (6.4.0 and 6.3.3 with `--build-system swiftbuild`); a stdlib-only program links. The fix is merged in swift-build ([#1763](https://github.com/swiftlang/swift-build/pull/1763), 2026-09-22) and backported to the 6.4.x branches; no tagged release contains it as of 2026-10-10 (only 6.4.0 exists). A 6.4.x nightly (6.4.4-dev) links the same fixtures.
- **Never hardcode `.build/...` output paths.** Swift Build writes to `<scratch>/out/Products/<Config>-<platform>-<arch>/`; `.build/<triple>/release` does not exist, and `.build/release` is a symlink that is repointed by whichever build ran last (host build, then musl build: it follows the musl build). Ask `swift build <same flags> --show-bin-path`.
- **`--show-bin-path` must receive the same `--swift-sdk`/`-c`/`--scratch-path` flags as the build.** Without `--swift-sdk` it returns the host directory; a stale glibc binary there is copied silently and only a `file` check catches it.
- **The glibc floor of a dynamic build is set by the build image, not by the code.** `swift:6.4` is Ubuntu 26.04 (glibc 2.43): a `--static-swift-stdlib` binary needs `GLIBC_2.43` (libm `sqrtf`, `remainder`, `log10f`, `acosf`...) and died on Ubuntu 22.04, Debian 13 and AL2023. Built in `swift:6.4-amazonlinux2023` (glibc 2.34) the same source ran on all six hosts.
- **`objdump -T` on a dynamically linked Swift executable is blind to the floor.** The executable showed at most `GLIBC_2.34` while `libswiftCore.so` in the same image needed `GLIBC_2.43`. Scan the executable only for static-stdlib builds; scan the toolchain's runtime libraries for dynamic ones.
- **swift-subprocess 1.0.1 works in a static musl binary** although upstream CI is "Build only": `run()` with `.path` and `.name`, 1 MiB of output, and task cancellation (child killed with SIGKILL after 307 ms) all passed in 6.4.0. Smoke-run the static binary anyway.
- **The SW-IO-18 durable helper's `canImport(Musl)` branch compiles and passes the strace check** (`fsync` of the directory after `rename`: exit 0; `Data.write(.atomic)` twin: exit 1), 6.4.0 and 6.3.3.
- **A Glibc-only import chain fails on musl** (`cannot find 'getpid' in scope`); every `canImport(Glibc)` chain needs a `canImport(Musl)` branch. `@preconcurrency import Musl` is accepted, but bare `import Musl` already lets `fflush(stdout)` compile in Swift 6 mode (SW-CLI-07 stays valid, the Musl half is optional).
- **musl task threads have a 128 KiB stack.** A recursive function that runs fine in a `Task` on glibc crashes with SIGSEGV (exit 139) at depth 400 on musl; `-Xlinker -z -Xlinker stack-size=0x80000` moves the limit to about depth 700. `dlopen` returns nil ("Dynamic loading not supported").
- **`import Foundation` versus `import FoundationEssentials` does not change size.** Both programs were 10,718,576 bytes stripped; `DateFormatter`/`Locale` took the same program to 55,831,480 bytes. The size lever is the API surface, so M-G-11's rationale for FoundationEssentials is a compile-time guard, not a size saving.
- **Static SDK binaries are not larger than glibc static-stdlib ones:** `essentials` 10.7 MB (musl SDK) against 13.7 MB (glibc, `--static-swift-stdlib`, native engine). `-Xlinker -s` strips at link time (138,119,728 to 55,831,488 bytes).
- **swift-syntax prebuilts hit only for a released swift-syntax tag and a released toolchain with a published manifest.** `from: "604.0.0"` on `swift:6.4-noble` downloaded the prebuilt (16 s with `-j 2`); `exact: "604.0.0-prerelease-2026-09-15"` got a 404 and built from source (73 s); the same range on Ubuntu 26.04 (not in SwiftPM's platform enum) built from source (69 s); Swift 6.3.3 has no manifest at all.
- **Wasm:** a pure library builds with `--swift-sdk swift-6.4.0-RELEASE_wasm --target <Lib>` (and with the `-embedded` SDK); `swift-subprocess` does not build for WASI (`'grp.h' file not found`), a `condition: .when(platforms: [...])` plus `canImport` guard fixes the library. `swift test --swift-sdk <wasm>` fails (exit 1) unless `--disable-xctest` is passed.
- **Pin the SDK to the toolchain exactly.** A 6.3.3 static SDK under the 6.4 compiler fails with `module compiled with Swift 6.3.3 cannot be imported by the Swift 6.4 compiler`. Select by triple (`x86_64-swift-linux-musl`), never by bundle id (`multiple target triples`).
- **Windows is not verified here.** Reading shows the corpus builds Windows release binaries with a hardcoded `.build\<triple>\release` path in two repos; the same grep that guards Linux paths covers it.

## Findings

### 1. The engine change that moved every path

SwiftPM 6.4 makes Swift Build the default engine. The 6.4 release notes name three consequences that matter here ([SwiftPM 6.4 release notes](https://github.com/swiftlang/swift-package-manager/blob/main/Sources/PackageManagerDocs/Documentation.docc/ReleaseNotes/6.4.md), `swift-package-manager@5546f44a3b52:Sources/PackageManagerDocs/Documentation.docc/ReleaseNotes/6.4.md:11-15`):

- "Swift Build outputs build artifacts to a different location. For all build systems, use `swift build --show-bin-path <other build arguments>` to determine the build output location."
- "Swift Build enforces stricter validation for `--static-swift-stdlib`, producing an error instead of silently ignoring the option."
- One test runner per test target.

Timeline: the October 2025 plan was "Enable `--build-system swiftbuild` as SwiftPM's default ... Remove SwiftPM's current default build system implementation in 2026H2" ([Owen Voorhees, forums, 2025-10-27](https://forums.swift.org/t/swiftpm-on-swift-build-october-update/82889)); the default flipped on main on 2026-03-24 ([PSA, same author](https://forums.swift.org/t/swiftpm-development-update-default-build-system-change/85548), PR [#9661](https://github.com/swiftlang/swift-package-manager/pull/9661)) and shipped in 6.4.0 ([Swift 6.4 released](https://www.swift.org/blog/swift-6.4-released/)). `--build-system native` still works on 6.4.0 and prints `warning: '--build-system native' has been deprecated and will be removed in a future release` (measured, every native run in this dive). Swift 6.3 and earlier default to `native`; `--build-system swiftbuild` is opt-in there ([swift-build README](https://github.com/swiftlang/swift-build)).

Measured layouts (fixture `relcli`, scratch `S`):

| Case | 6.4.0 (Swift Build) | 6.3.3 (native) |
|---|---|---|
| host release | `S/out/Products/Release-linux-x86_64` | `S/x86_64-unknown-linux-gnu/release` |
| host debug | `S/out/Products/Debug-linux-x86_64` | `S/x86_64-unknown-linux-gnu/debug` |
| static SDK release | `S/out/Products/Release-staticlinux-x86_64` | `S/x86_64-swift-linux-musl/release` |
| Wasm release | `S/out/Products/Release-webassembly-wasm32` | `S/wasm32-unknown-wasip1/release` |
| `S/release` | symlink to the last build's directory | symlink to the last build's directory |

The platform segment (`staticlinux`, `webassembly`) comes from swift-build's platform table (`swift-build@2187330e13e7:Sources/SWBGenericUnixPlatform/Plugin.swift:92,119-122`).

### 2. Static Linux SDK: install, select, build

What the SDK is: musl-based, "no support for dynamic linking whatsoever — even the `dlopen()` function will not work", "The Swift toolchain must match the version of the Static Linux SDK", remote installs "must pass a `--checksum`" ([swift.org: Getting Started with the Static Linux SDK](https://www.swift.org/documentation/articles/static-linux-getting-started.html)). The tool enforces the checksum itself: `swift sdk install <https URL>` without it exits 1 with "Bundles installed from remote URLs ... require their checksum passed via `--checksum` option" (measured, 6.3.3).

Measured facts, 6.4.0:

- Download 284,728,145 bytes; installed 1.1 GB; `toolset.json` adds `-static-executable -static-stdlib`; SBOM components: swift 6.4.0-RELEASE, musl 1.2.5, musl-fts 1.2.7, libxml2 2.14.5, curl 8.15.0, boringssl, zlib 1.3.1, bzip2, XZ 5.8.1, libarchive 3.8.1, mimalloc 2.2.4 (`sbom.spdx.json` in the bundle).
- `swift build -c release --swift-sdk x86_64-swift-linux-musl` built the fixture CLI in 15 s; `file` says `ELF 64-bit LSB executable, x86-64, version 1 (SYSV), statically linked`; `ldd` says "not a dynamic executable".
- The same binary ran in `ubuntu:22.04`-class hosts, `debian:13-slim`, `alpine:3.22`, and an empty image created with `docker import` (`FROM scratch` equivalent: `hello` and the durable helper ran; `run()` of `/bin/echo` failed with "Executable ... not found" because the image has no `/bin/echo`, the correct error).
- **Selector.** `swift sdk list` prints bundle ids (`swift-6.4.0-RELEASE_static-linux-0.1.0`), and `--swift-sdk <that id>` fails: "The query for `swift-6.4.0-RELEASE_static-linux-0.1.0` and host triple `x86_64-unknown-linux-gnu` has multiple target triples. Use the `--triple` flag". The triple `x86_64-swift-linux-musl` works, as [SE-0387](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0387-cross-compilation-destinations.md) intends (a triple is accepted when it identifies a single SDK). Wasm is the reverse: its bundle holds a single triple per SDK id, and the id is `<swiftCompilerTag>_wasm` (`swiftc -print-target-info` prints `"swiftCompilerTag": "swift-6.4.0-RELEASE"`; same trick in `swift-testing@c7d68ca20cd7:Documentation/WASI.md:26`).
- **Exact match.** 6.4 compiler with the 6.3.3 SDK: `error: module compiled with Swift 6.3.3 cannot be imported by the Swift 6.4 compiler: ...swift_static/linux-static/Swift.swiftmodule/x86_64-swift-linux-musl.swiftmodule` (exit 1, [Verification runs](#verification-runs) V10).
- **Machine-readable pins.** `https://www.swift.org/api/v1/install/releases.json` carries, per release, the static-sdk `version` (0.1.0) and sha256 `checksum` (6.4.0: `47d2fd89...`, 6.3.3: `87c3eaf9...`); `swiftlang/github-workflows` reads it with `jq` ([install-and-build-with-sdk.sh](https://github.com/swiftlang/github-workflows/blob/main/.github/workflows/scripts/install-and-build-with-sdk.sh), lines 202-270). The URL pattern is `https://download.swift.org/swift-X.Y.Z-release/static-sdk/swift-X.Y.Z-RELEASE/swift-X.Y.Z-RELEASE_static-linux-0.1.0.artifactbundle.tar.gz`.
- **Static SDK plus Swift Build is green on the package that broke it in June.** `aws-lambda-runtime` still forces `--build-system native` for its static leg citing duplicate libc++abi symbols from two vendored BoringSSLs (`swift-aws-lambda-runtime@8abd464310c7:.github/workflows/pull_request.yml:36-42`, upstream [SwiftPM #10237](https://github.com/swiftlang/swift-package-manager/issues/10237), closed 2026-07-02). Planted: `swift-nio-ssl` 2.37.5 plus `swift-crypto` 4.5.2 under `--swift-sdk x86_64-swift-linux-musl` on 6.4.0 linked with both engines (exit 0 each, 119 s and 123 s with `-j 6`). That workaround looks stale on 6.4.0.
- **Known issue that is not this SDK:** "Swift Build fails to build projects with Linux SDKs generated by the SDK generator" ([#10006](https://github.com/swiftlang/swift-package-manager/issues/10006), in the 6.4 release notes). Apple's own list for swift-crypto uses SDK-generator SDKs (`swift-crypto@1c80d3aff53f:scripts/vendor-boringssl.sh:110`); the official Static SDK is a different artifact and worked.

### 3. `--static-swift-stdlib`: red on 6.4.0 and 6.3.3, fixed upstream, not yet released

Planted in `relcli` (glibc, host build, `--static-swift-stdlib`):

| Product | content | `--build-system swiftbuild` | `--build-system native` |
|---|---|---|---|
| `stdio-good` | stdlib + Glibc only | links (8,859,768 bytes; dynamic libc/libm/libstdc++ only) | n/a |
| `essentials` | `FoundationEssentials` JSON | **exit 1**, `undefined reference to '$s15Synchronization12_MutexHandleV11_unlockSlowyyF'` (6.4.0); 6.3.3 adds `_FoundationCollections._HashTable...` | exit 0 |
| `full` | `Foundation` + `DateFormatter` | **exit 1** (same `_MutexHandle` symbols) | exit 0 |
| `relcli` before `naive` was added | `import Foundation`, no Foundation symbol used | links | links |

So the failure needs a reachable Foundation symbol; an `import Foundation` line alone does not trigger it. This reconciles the four scouts of conflict 16: the symptom text differs (`swift_unum*`, `_MutexHandle`, missing `_FoundationICU`) because the linker reports different first symbols for different programs.

Root cause and fix, from the tracker: [swift-build #1764](https://github.com/swiftlang/swift-build/issues/1764) (opened 2026-09-21 against 6.4.0 and the 2026-09-10 nightly: "`swift build --static-swift-stdlib` fails on the `Ld` step if any source file links to Foundation"; "If, instead, you run `swift build` or `swift build --static-swift-stdlib --build-system native`, the build works"). Fix [swift-build #1763](https://github.com/swiftlang/swift-build/pull/1763): "compile tasks were using the wrong resource dir to compute autolink entries ... Add an explicit `-static-stdlib` to compile tasks" (merged 2026-09-22, closes #1764); backports #1770 (`release/6.4.x`, 2026-09-23), #1771 (`release/6.4.2`), #1772 (`release/6.4.1`). The fix is visible in the corpus clone: `swift-build@2187330e13e7:Sources/SWBCore/SpecImplementations/Tools/SwiftCompiler.swift:1259-1260` ("-static-stdlib is required here to ensure autolink entries are derived from the correct resource dir").

Verification of the fix: `swiftlang/swift:nightly-6.4.x-noble` (Swift 6.4.4-dev) built `essentials`, `full` and `relcli` with `--static-swift-stdlib --build-system swiftbuild`, clean scratch, exit 0 each; 6.4.0 on the same sources exit 1. As of 2026-10-10 Swift 6.4.0 is the only 6.4 release (`gh api repos/swiftlang/swift/tags`), so no released toolchain carries the fix.

Interaction with the SDK: with `--swift-sdk x86_64-swift-linux-musl` the flag is redundant (`toolset.json` already passes `-static-stdlib`): `full` linked at 138,119,728 bytes with and without it. `aws-lambda-runtime` still passes both (`StaticLinuxSDKBuildBackend.swift:103-107`).

### 4. Where the binary is: `--show-bin-path` and the `release` symlink

Planted scripts (`dist-bad.sh`, `dist-good.sh`) copy the musl binary to a dist directory:

```bash
# VIOLATION: the path swift.org's static-linux article shows (native layout)
cp "$S/x86_64-swift-linux-musl/release/relcli" dist/relcli

# COMPLIANT: ask SwiftPM, with the flags of the build
swift build -c release --swift-sdk x86_64-swift-linux-musl --show-bin-path | xargs -I{} cp {}/relcli dist/relcli
```

6.4.0: violation exit 1 (`cp: cannot stat '.../d2/x86_64-swift-linux-musl/release/relcli'`), twin exit 0 (54.7 MB binary). 6.3.3: both exit 0, because the native layout still exists there. The article's own example path (`.build/x86_64-swift-linux-musl/debug/hello`) is native-layout; no Swift Build sentence updates it.

The symlink is not a safe fallback. On 6.4.0, `S/release` pointed to `out/Products/Release-linux-x86_64` after the host build and to `out/Products/Release-staticlinux-x86_64` after the following musl build: a script that builds both and then runs `S/release/relcli hello` printed "hello from glibc" then "hello from musl". (6.3.3 behaves the same: `release -> x86_64-swift-linux-musl/release`.) Two builds in one scratch directory, one symlink, last writer wins.

The flags must match. Planted: musl-only scratch, `swift build -c release --scratch-path S --show-bin-path` (no `--swift-sdk`) printed `.../out/Products/Release-linux-x86_64`, where `relcli` did not exist (cp would fail loudly). After a host build also ran into that directory the same call returned a directory holding a **glibc** binary: `cp` succeeds and ships the wrong artifact. Only a `file` check ([SW-REL-BP-01](#normative-guidance-candidates)) turns that silent failure into red.

Fleet precedent for doing it right: `containerization@3e7bc39e66b3:scripts/build-dist-x86_64.sh:154-162` (build with `--swift-sdk x86_64-swift-linux-musl`, then `swift build ... --swift-sdk ... --show-bin-path` to find `cctl`), `vminitd/Makefile:38,57-59`, and `aws-lambda-runtime` `StaticLinuxSDKBuildBackend.swift:67-90` (it calls `--show-bin-path` with the same `--swift-sdk` and `--scratch-path` before building, "doubles as the SDK preflight").

### 5. The glibc floor

Distro glibc, measured with `ldd --version` in the named images (2026-10-10): `ubuntu:22.04` 2.35, `ubuntu:24.04` 2.39, Ubuntu 26.04 (`swift:6.4`) 2.43, `debian:12-slim` 2.36, `debian:13-slim` 2.41, `amazonlinux:2023` 2.34, `almalinux:9-minimal` 2.34 (stand-in for UBI 9, same RHEL 9 glibc).

Swift 6.4.0's published Linux images are Ubuntu 22.04/24.04/26.04, Debian 12/13, Fedora 41, Amazon Linux 2023, UBI 9/10 ([releases.json](https://www.swift.org/api/v1/install/releases.json)). The tag `swift:6.4` is the newest Ubuntu (26.04, "resolute"), not the oldest.

One program (`essentials`, `--static-swift-stdlib --build-system native`, so the stdlib's libm references live in the executable) built in four images and run on six hosts:

| Built in | highest `GLIBC_` in `objdump -T` | runs on 22.04 (2.35) | Debian 13 (2.41) | AL2023 (2.34) |
|---|---|---|---|---|
| `swift:6.4` (26.04, 2.43) | 2.43 | no: `GLIBC_2.38`/`2.43 not found` | no: `GLIBC_2.43` | no |
| `swift:6.4-noble` (2.39) | 2.38 | no: `GLIBC_2.38` | yes | no |
| `swift:6.4-jammy` (2.35) | 2.35 (`hypotf`) | yes | yes | no: `GLIBC_2.35` |
| `swift:6.4-amazonlinux2023` (2.34) | none above 2.34 | yes | yes | yes |

The `swift:6.4-amazonlinux2023` binary also ran on Debian 12, Ubuntu 24.04 and AlmaLinux 9. The 2.43 symbols are libm entry points re-versioned in glibc 2.43 (`acosf acoshf asinf atan2f atanhf coshf log10f remainder remainderf sinhf sqrtf tgammaf lgammaf_r`), `fmod`/`hypotf` 2.38/2.35, plus C23 `__isoc23_strtol`/`sscanf` (2.38) and `strlcpy` (2.38); the stdlib's objects carry them into any static-stdlib executable.

The floor check on the **dynamic** executable passes while the target host fails. The dynamic `essentials` built in `swift:6.4` needed at most `GLIBC_2.34`; its runtime dependency `/usr/lib/swift/linux/libswiftCore.so` (and `libFoundation*.so`) needed `GLIBC_2.43` (`objdump -T ... | grep UND`). Every dynamic build in the image therefore has a floor set by libs the host must also provide (the deployment target needs the Swift runtime of the same image, e.g. the `-slim` runtime image of the same distro). The earlier scout figure ("a binary built in the 6.4 image needs `GLIBC_2.43`", [eco](../swift-topic-map/ecosystem-tooling.md) §9) is therefore true for static-stdlib builds and for the runtime libraries, but **not** for the executable of a plain dynamic build, which showed 2.34/2.38.

Corpus context: `containerization` documents this exact failure as a troubleshooting entry (`containerization@3e7bc39e66b3:docs/x86_64-build.md:224`, "`libc.so.6: version 'GLIBC_2.35' not found` — the deployment host's glibc is older than the build's baseline") and fixes it by building at a lower baseline (zig `-target x86_64-linux-gnu.<ver>`).

### 6. What runs inside a musl binary

All runs: fixture `relcli` built with `--swift-sdk x86_64-swift-linux-musl`, language mode 6, 6.4.0 unless stated.

- **swift-subprocess 1.0.1.** The package's README table lists "Static Linux SDK | Build only" ([swift-subprocess README](https://github.com/swiftlang/swift-subprocess/blob/main/README.md)); the source has explicit `canImport(Musl)` branches (`swift-subprocess` 1.0.1 `Sources/Subprocess/IO/AsyncIO+Linux.swift:27-28,61-64`, `Teardown.swift:20-21`). Runtime result: `run(.path("/bin/echo"), ...)` printed `status=exited(0) out=from-subprocess`; `run(.name("echo"), ...)` with PATH set printed `by-name`; with `PATH=` it threw `Executable "echo" is not found` (exit 132); a 1,048,576-byte child output through `.string(limit: 2_000_000)` returned `bytes=1048576`; cancelling a task running `sleep 30` returned `signaled(9)` after 307 ms. Same results with 6.3.3 for `hello`/`run`/`shell`. "Build only" is an upstream CI statement, not a defect report; SW-IO-06's `from: "1.0.1"` pin works on the static leg.
- **SW-IO-18 durable helper.** The helper compiles on musl through its `#elseif canImport(Musl) import Musl` branch (no Foundation, SystemPackage only). Under `strace -f -y -e trace=fsync,fdatasync,rename,renameat,renameat2` the musl binary issued `fsync(fd)`, `rename`, then `fsync` on the directory fd; the `Data.write(to:options:.atomic)` twin issued `fsync` and `rename` but no directory fsync (`.dat.nosync...` temp name). `check-dirfsync.sh`: durable exit 0, naive exit 1; 6.4.0 and 6.3.3. The strace RPM from the files-and-paths fixture needs glibc 2.43 (`GLIBC_ABI_GNU2_TLS`): run it in `swift:6.4` even when the binary was built by 6.3, otherwise the check reports a false red (the check script now exits 2 when no trace exists).
- **SW-CLI-07.** `stdio-bad` (`import Glibc` / `import Musl` without `@preconcurrency`, `fflush(stdout)`) fails on glibc with `reference to var 'stdout' is not concurrency-safe because it involves shared mutable state` (exit 1) and **compiles on musl** (exit 0); `stdio-good` (`@preconcurrency import ...`) compiles on both. Keep the `@preconcurrency` first import on both branches; it is required only on glibc.
- **Missing Musl branch.** `nomusl` (`#if canImport(Darwin) ... #elseif canImport(Glibc) import Glibc #endif`, calls `getpid()`) builds on glibc and fails on musl: `error: cannot find 'getpid' in scope` (exit 1); `withmusl` with a `#elseif canImport(Musl)` branch builds on both. The corpus has 368 `canImport(Musl)` sites in 12+ repositories (`swift-nio` 51, `containerization` 51, `swift-foundation` 31, `swift-system` 13, `tuist` 11).
- **`dlopen`.** In the musl binary `dlopen("libm.so.6", RTLD_NOW)` returns nil and `dlerror()` says "Dynamic loading not supported" (no crash); on glibc it succeeds. SwiftLint's static release therefore compiles with `-Xswiftc -DSWIFTLINT_DISABLE_SOURCEKIT` (`SwiftLint@ec4691d9e813:.github/workflows/release.yml:172`).
- **Thread stacks.** musl gives non-main threads a 128 KiB default stack. Probe `relcli deep <n> task` (recursion with a 512-byte frame inside `Task`): glibc survived depth 5000 (a 629,476-checksum return); musl crashed at depth 400 and above with exit 139 (SIGSEGV), 6.4.0 and 6.3.3. The main thread on musl inherits the 8 MiB rlimit and survived depth 5000. With `-Xlinker -z -Xlinker stack-size=0x80000` musl survived depth 700 and crashed at 1000. SwiftLint's static build does exactly this ("increase the stack size to 512KiB and replace musl's default allocator with mimalloc", `release.yml:166-176`).
- **Allocator.** The SDK bundles mimalloc 2.2.4 for linking; SwiftLint links its own mimalloc object with `--whole-archive` to replace musl's allocator (performance, not correctness; not measured here).

### 7. Size: the import line is not the lever

Static musl, release, stripped with `strip` (and `-Xlinker -s` gives the same bytes), 6.4.0:

| Program | unstripped | stripped |
|---|---:|---:|
| `stdio-good` (stdlib + libc) | 35,578,648 | 6,298,992 |
| `essentials` (`import FoundationEssentials`, `JSONEncoder`/`Decoder`) | 53,158,160 | 10,718,576 |
| `foundation-json` (`import Foundation`, identical code) | 53,159,000 | **10,718,576** |
| `relcli` (Foundation import, subprocess, SystemPackage, durable helper) | 54,764,064 | 10,882,520 |
| `full` (`DateFormatter`, `Locale`) | 138,119,728 | 55,831,480 |

6.3.3: 6.9 / 12.0 / 58.4 / 12.1 MB for `stdio-good` / `essentials` / `full` / `relcli`. The scout's 10.3 MB versus 55.6 MB is confirmed in magnitude, but the cause is not the import line: `essentials` and `foundation-json` are byte-identical in stripped size. Internationalisation APIs (ICU data) are the 45 MB. `FoundationEssentials` remains the right import for libraries because it makes ICU-dependent API a compile error, not because it shrinks the binary. Glibc comparison, same source: `essentials` with `--static-swift-stdlib --build-system native` is 13.7 MB stripped (13,697,112 / 13,672,536 / 13,717,944 in the three images); the dynamic executable is 60,624 bytes plus the shared runtime.

`aws-lambda-runtime` makes the same point in prose: "statically linking musl does not, in practice, produce a much larger binary than the container build ... the Swift standard library ... dominates the size" (`aws-lambda-runtime@8abd464310c7:Sources/AWSLambdaRuntime/Docs.docc/using-the-spm-plugins.md:174-178`).

### 8. swift-syntax prebuilts

SwiftPM downloads prebuilt swift-syntax for macro builds by default: `--enable-experimental-prebuilts`/`--disable-experimental-prebuilts`, default on (`swift-package-manager@5546f44a3b52:Sources/CoreCommands/Options.swift:219-223`). The manifest URL is `https://download.swift.org/prebuilts/swift-syntax/<swift-syntax version>/<swiftCompilerVersion>-<platform>.json`, where the version is the **resolved tag** (`manifest.manifest.version`) and the host platform comes from `/etc/os-release` (`Workspace+Prebuilts.swift:223-229,309-311`; `PrebuiltLibrary.swift:58-76` enum; host detection at `:192` noble, `:218` Fedora "39"/"41", AL2 only "2", RHEL 9, Debian 12). A miss writes an empty manifest and builds from source ("Prebuilt swift-6.4.0-RELEASE-ubuntu_noble_x86_64.json: badResponseStatusCode(404)").

Published manifests probed with `curl` on 2026-10-10 (platform `ubuntu_noble_x86_64`; other platforms not probed): swift-syntax 602.0.0, 603.0.0, 603.0.1 with toolchains `swift-6.3-RELEASE` and `swift-6.3.1-RELEASE`; 603.0.2 and 604.0.0 with `swift-6.4.0-RELEASE`. Nothing for 6.3.2, 6.3.3, 6.2.x, 6.1.x (all returned 404 in the probe). The SwiftPM platform enum has no Ubuntu 26.04, Debian 13, Amazon Linux 2023 or UBI 10, all of which are published 6.4.0 platforms.

Planted macro package (`pb-range`, `pb-exact`, `pb-rangepre`, `pb63-*`; `swift build -v`, `JOBS=2` where stated):

| Pin | Toolchain / OS | Result |
|---|---|---|
| `from: "604.0.0"` | `swift:6.4-noble` | `Prebuilt artifact swift-6.4.0-RELEASE-ubuntu_noble_x86_64-MacroSupport.tar.gz downloaded`; 15 s (16 s with `-j 2`) |
| `from: "604.0.0-prerelease-2026-09-15"` | `swift:6.4-noble` | resolves to 604.0.0; prebuilt downloaded; 17 s |
| `exact: "604.0.0-prerelease-2026-09-15"` | `swift:6.4-noble` | `.json: badResponseStatusCode(404)`; from source, 31 s (73 s with `-j 2`) |
| `from: "604.0.0"` | `swift:6.4` (Ubuntu 26.04) | no prebuilt line; from source, 26 s (69 s with `-j 2`) |
| `from: "603.0.0"` | `swift:6.3` (6.3.3, noble) | resolves 603.0.2; `swift-6.3.3-RELEASE-ubuntu_noble_x86_64.json` 404; from source, 78 s (`-j 2`) |
| `exact: "603.0.0-prerelease-2026-06-05"` | `swift:6.3` | 404; from source, 71 s (`-j 2`) |

The cost is a build-time cost on small runners (32 cores hid most of it: 15 s against 31 s), not a correctness issue. An `exact:` swift-syntax pin in a library also blocks every consumer's resolution, independent of prebuilts.

### 9. Wasm

Facts from the primary article ([Getting Started with Swift SDKs for WebAssembly](https://www.swift.org/documentation/articles/wasm-getting-started.html)): Swift 6.2 and later; install per toolchain with `swift sdk install <url> --checksum <sum>`; two ids per bundle (`swift-<version>_wasm`, `swift-<version>_wasm-embedded`); "Cross-compilation with Swift SDKs on Windows hosts is not supported yet"; `swift run --swift-sdk ...` delegates to WasmKit; the `.sourcekit-lsp/config.json` key is `swiftPM.swiftSDK`.

Measured (6.4.0 with `swift-6.4.0-RELEASE_wasm`, 6.3.3 with `swift-6.3.3-RELEASE_wasm`; bundle 92,760,992 bytes download, 347 MB installed for 6.4.0):

- **(e) pure library.** `swift build -c release --target PureLib --swift-sdk swift-6.4.0-RELEASE_wasm` exit 0 (1.2 s); output dir `out/Products/Release-webassembly-wasm32` holds `PureLib.objlib` and `PureLib.swiftmodule` (a `--target` build emits no `.a`). 6.3.3: exit 0, dir `wasm32-unknown-wasip1/release`. The same target builds with `swift-6.4.0-RELEASE_wasm-embedded` (exit 0).
- **FoundationEssentials runs.** `essentials` built to a 17,101,648-byte `essentials.wasm` (6.3.3: 16,828,837) and `swift run -c release --swift-sdk swift-6.4.0-RELEASE_wasm essentials` printed `{"n":1,"name":"x"}` through WasmKit (exit 0; a `safeExec: signal(33, SIG_DFL) failed` warning appears).
- **A dependency that does not build for WASI breaks the whole build.** `relcli` (swift-subprocess) fails: `WASI lacks process-associated clocks ... getrusage` and `_SubprocessCShims/process_shims.c:31:10: fatal error: 'grp.h' file not found` (exit 1, both versions). `MixedLib` with `.product(name: "Subprocess", package: "swift-subprocess", condition: .when(platforms: [.linux, .macOS, .windows, .android]))` and `#if canImport(Subprocess)` builds for Wasm (exit 0) and for the host (exit 0).
- **Tests.** `swift test --swift-sdk swift-6.4.0-RELEASE_wasm` on a Swift-Testing-only package exited 1 (`posix_spawn error: Exec format error (8)` on `PureLibTests-test-runner.wasm`; 6.3.3: same on `puretestPackageTests.xctest`). `swift test --disable-xctest --swift-sdk <id>` exited 0 and printed `Test run with 1 test in 0 suites passed` (6.4.0 and 6.3.3). `swift test --build-system native --swift-sdk <id>` ran the Swift Testing tests but still exited 1 ("Some test targets reported failures: puretestPackageTests (XCTest)"). `wasmkit run <runner>.wasm --testing-library swift-testing` also passed (exit 0). The documented one-liner in `swift-testing` (`Documentation/WASI.md:20-26`) is missing `--disable-xctest` in this environment.

Corpus: `swift-nio` builds against Wasm and Android SDKs through scripts that pick ids from `swift sdk list --swift-sdks-path` (`swift-nio@e12881f2a691:scripts/swift-build-with-wasm-sdk.sh:28-34`, `swift-build-with-android-sdk.sh:43` adds `--build-system native`); JavaScriptKit builds all examples with `--build-system native --swift-sdk` (`JavaScriptKit@c68ee9bdebfa:Examples/Basic/build.sh:3`). On 6.4.0 the default engine built the Wasm fixtures, so `--build-system native` there is a historical workaround, not a requirement.

### 10. Windows (unverified: read only)

Nothing in this section was run; the host has no Windows toolchain in the research image and owner Q7's default is read-only.

- Install: WinGet (`Swift.Toolchain`) after Visual Studio 2022 with the `Windows11SDK.22621` and `VC.Tools.x86.x64`/`ARM64` components, or the `.exe` installer; containers `6.4.0-windowsservercore-ltsc2022` ([swift.org Windows install](https://www.swift.org/install/windows/)). Swift 6.4.0 lists "Windows 10" x86_64 and arm64 in `releases.json`.
- No static Linux SDK from the Windows side is documented as a target; the static article says only that the SDK "can be used from any platform supported by the Swift compiler and package manager". Wasm cross-compilation from Windows hosts is "not supported yet" (Wasm article).
- Windows CI wraps every command: `Invoke-Program swift test -Xswiftc -warnings-as-errors ...` (`swift-format@b15dd59fad21:.github/workflows/publish_release.yml:131`, `pull_request.yml:37-39`; `swift-syntax@be549876fe91:.github/workflows/pull_request.yml:24`), which SW-GATE-25 already requires.
- Windows release binaries in the corpus are built with a static stdlib through an experimental SDK and a snapshot toolchain: `swiftformat` `windows_release.yml:41` (`swift build -c release --triple ... -Xswiftc -static-stdlib -Xswiftc -sdk -Xswiftc ${ExperimentalSDK}`, `WindowsExperimental.sdk`), SwiftLint `release.yml:243-255`. **Both hardcode the native layout downstream:** `-p:SwiftFormatBuildDir=...\.build\${{ matrix.target-triple }}\release` (`SwiftFormat@fbc07aca5373:.github/workflows/windows_release.yml:52`). That path pattern is what Swift Build replaced on Linux; whether Windows Swift Build 6.4 keeps `.build\<triple>\release` was not measured. The path rule (SW-REL-BP-05) is stated for Windows as "ask `--show-bin-path`", unverified.
- Windows `.exe` suffix on `--show-bin-path` products, `canImport(WinSDK)`/`ucrt` import branches, the ArgumentParser exit-code divergence (160) and `FilePath` instability are carried by SW-CLI/SW-IO and not repeated here.

### 11. The Linux release recipe

Decision (all steps measured on 6.4.0; the 6.3.3 equivalents ran too):

```bash
# 0. Pin: toolchain X.Y.Z in .swift-version; SDK URL + sha256 for the SAME X.Y.Z from releases.json.
# 1. Install the SDK once per runner (checksum is mandatory for URLs; 285 MB download, 1.1 GB installed).
swift sdk install \
  https://download.swift.org/swift-6.4.0-release/static-sdk/swift-6.4.0-RELEASE/swift-6.4.0-RELEASE_static-linux-0.1.0.artifactbundle.tar.gz \
  --checksum 47d2fd89eebfdf9eb4d536b6710414297f755c17926cdebc4742c08982b40a9e
# 2. Build per architecture, select by TRIPLE, strip at link time.
swift build -c release --product relcli --swift-sdk x86_64-swift-linux-musl -Xlinker -s
# 3. Locate with the SAME flags, never .build/release.
swift build -c release --swift-sdk x86_64-swift-linux-musl --show-bin-path | xargs -I{} cp {}/relcli dist/relcli-linux-x86_64
# 4. Gate: static, then a smoke run.
file dist/relcli-linux-x86_64 | grep -v -e 'statically linked'      # empty = pass
dist/relcli-linux-x86_64 --version
```

`aarch64-swift-linux-musl` cross-builds from any host (same SDK bundle; not run on arm64 here). Add `-Xlinker -z -Xlinker stack-size=0x80000` if tasks recurse (finding 6). When the binary needs `dlopen`, plugins, SourceKit, or a C library absent from the SDK, the static recipe is out; build a glibc binary in `swift:X.Y.Z-amazonlinux2023` (floor 2.34) and ship it with the Swift runtime of that image, or with `--static-swift-stdlib --build-system native` plus the floor check. Images, SBOM, checksums and naming are in the sibling `release-pipeline.md`.

## Normative guidance candidates

Provisional IDs `SW-REL-BP-nn`; each lists the rule, rationale, how a reviewer verifies it, and whether that verification was run red-then-green against a planted violation. All fixtures are under `/home/mherwig/.cache/research-lang/swift-tools/fixtures/binaries-and-platforms/` (`FX/` below). "Empty output = pass" for every grep and `find` pipeline.

**SW-REL-BP-01 (MUST). A Linux CLI release artifact is built with the static Linux SDK and is reported static.** `swift build -c release --swift-sdk <arch>-swift-linux-musl`; the shipped file must satisfy `file`.
- Why: runs on any Linux (measured on seven distros/images), no glibc floor; it is the leg SW-GATE-25 requires.
- Verify: `file dist/relcli | grep -v -e 'statically linked'` (empty = pass; `file(1)` is not in the swift image, run it on the host or add it to the CI image).
- Run: **yes**. Dynamic glibc executable: prints the `ELF 64-bit LSB pie executable` line (grep exit 0). Musl executable: empty (grep exit 1). `FX/relcli`.
- Floor: Swift 6.2+ toolchain with matching Static SDK (SE-0387 implemented in 6.1; SDK 0.1.0).

**SW-REL-BP-02 (MUST). The Static SDK version equals the toolchain version exactly, and the install pins URL and `--checksum` from one place.**
- Why: a 6.3.3 SDK under the 6.4 compiler fails (`module compiled with Swift 6.3.3 cannot be imported by the Swift 6.4 compiler`); remote installs refuse to run without `--checksum`; releases.json gives both values.
- Verify: `swift build --swift-sdk x86_64-swift-linux-musl` exits non-zero on mismatch (the compiler is the checker); for the pin, reading heuristic: the version in `static-sdk/swift-X.Y.Z-release/` in workflows equals `.swift-version`.
- Run: **yes** for the compiler red/green (exit 1 vs 0, V10); the pin comparison is a reading heuristic only.

**SW-REL-BP-03 (MUST). Select the static SDK by triple, Wasm SDKs by id; never pass a static bundle id to `--swift-sdk`.**
- Why: the static bundle id carries two triples (`multiple target triples`); `swift sdk list` prints ids, not triples. Wasm ids are `<swiftCompilerTag>_wasm`.
- Verify: `grep -rn --include='*.yml' --include='*.yaml' --include='*.sh' --include='Makefile' --include='Dockerfile*' -e 'swift-sdk swift-' . | grep -v -e '_wasm'` (empty = pass).
- Run: **yes**, `FX/sdkselect/bad` prints the line (rc 0), `FX/sdkselect/good` empty (rc 1); the build error was also run.

**SW-REL-BP-04 (MUST NOT). Do not present `--static-swift-stdlib` as the static recipe; it is tolerated only for glibc builds with `--build-system native`, a comment linking [swift-build#1764](https://github.com/swiftlang/swift-build/issues/1764), and a removal condition ("drop when the pinned toolchain contains swift-build#1763").**
- Why: under the 6.4.0 default engine it fails to link once any Foundation symbol is reachable (exit 1); the native engine is deprecated with removal planned for 2026H2.
- Verify: `grep -rn --include='Makefile' --include='Dockerfile*' --include='*.sh' --include='*.yml' --include='*.yaml' --include='*.mk' -e 'static-swift-stdlib' . | grep -v -e 'build-system native' -e 'swift-sdk'` (empty = pass; a flag on a continuation line escapes it). Behavioural probe for the removal condition: build a product that uses `JSONEncoder` with `--static-swift-stdlib` and the default engine; exit 0 means the fix is present.
- Run: **yes**. `FX/stdlibcheck/bad` prints 2 lines (rc 0), `good` empty (rc 1). Link probe: `FX/plant-a.sh essentials --static-swift-stdlib --build-system swiftbuild` exit 1 on 6.4.0 and 6.3.3, exit 0 on `nightly-6.4.x`; `--build-system native` exit 0.

**SW-REL-BP-05 (MUST). Locate build products with `swift build <the build's own flags> --show-bin-path`; no script, workflow, Makefile or Dockerfile names `.build/release`, `.build/debug`, `.build/<triple>/...` or `.build/out/...`.**
- Why: Swift Build moved the output tree; `.build/release` is a last-writer-wins symlink; `.build/x86_64-swift-linux-musl/release` does not exist on 6.4.0 (cp exit 1); `--show-bin-path` without the SDK flag points at the host tree.
- Verify: `grep -rn --include='*.sh' --include='*.yml' --include='*.yaml' --include='Makefile' --include='Dockerfile*' --include='*.mk' --include='*.ps1' -e '\.build/release' -e '\.build/debug' -e '\.build/[A-Za-z0-9_.-]*/release' -e '\.build/[A-Za-z0-9_.-]*/debug' -e '\.build/out/' -e '\.build\\' .` (empty = pass). Limits: template paths such as `.build/${{ matrix.sdk }}/release` and a custom `--scratch-path` variable escape the pattern; `.build/docs` and `.build/checkouts` do not match it.
- Run: **yes**. `FX/pathcheck/bad` prints 6 lines (rc 0), `FX/pathcheck/good` empty (rc 1). Behaviour: `FX/plant-d.sh` 6.4.0 `dist-bad` exit 1 / `dist-good` exit 0; 6.3.3 both exit 0. The same grep over the corpus's scripts and workflows hits 15 of 40 repositories.

**SW-REL-BP-06 (MUST). A dynamic glibc release is built in the oldest-glibc image the project supports (`swift:X.Y.Z-amazonlinux2023`, glibc 2.34, or `-ubi9`), never `swift:X.Y.Z`/`latest`, and the executable carries no `GLIBC_` version above the declared floor.**
- Why: `swift:6.4` is Ubuntu 26.04 (2.43); its static-stdlib output did not start on 22.04, Debian 13 or AL2023.
- Verify (floor 2.34 shown; widen the pattern for a higher floor): `objdump -T dist/relcli | grep -e 'GLIBC_2\.3[5-9]' -e 'GLIBC_2\.[4-9][0-9]'` (empty = pass; keep the pattern in step with the floor).
- Run: **yes**. Built in 26.04, noble, jammy: prints symbols (rc 0; 2.43/2.38/2.35). Built in AL2023: empty (rc 1), and the binary ran on six hosts (V5, V6).

**SW-REL-BP-07 (MUST). For a dynamic (shared-stdlib) build, the floor check also covers the toolchain's runtime libraries that the deployment host must supply.**
- Why: the dynamic `essentials` executable showed `GLIBC_2.34` while `/usr/lib/swift/linux/libswiftCore.so` of the same image needed 2.43; the executable-only check is green and the host fails.
- Verify (run inside the build image): `objdump -T /usr/lib/swift/linux/libswiftCore.so | grep UND | grep -e 'GLIBC_2\.3[5-9]' -e 'GLIBC_2\.[4-9][0-9]'` (empty = pass at floor 2.34).
- Run: **yes**. `swift:6.4` prints `GLIBC_2.38`/`2.43` symbols; `swift:6.4-noble` prints 2.38; `swift:6.4-amazonlinux2023` and `-jammy` empty (V7).

**SW-REL-BP-08 (MUST). Every `#if canImport(Glibc)` import chain also has a `canImport(Musl)` branch in code that ships on the static leg.**
- Why: a Glibc-only chain compiles on glibc and fails on musl (`cannot find 'getpid' in scope`); musl is not Glibc.
- Verify: `grep -rl --include='*.swift' -e 'canImport(Glibc)' Sources | xargs -r grep -L -e 'canImport(Musl)'` (empty = pass; do not rely on the exit status, xargs reports 123 when a file is listed); the build on the static leg is the authority.
- Run: **yes**. `FX/muslbranch/Sources/nomusl` prints the file, `withmusl` empty; build exit 1 (musl) vs 0.

**SW-REL-BP-09 (MUST). The static leg smoke-runs the artifact it just built, including one `swift-subprocess` `run()` and the durable-write directory-fsync check where the CLI persists state.**
- Why: upstream CI for swift-subprocess on the Static SDK is "Build only"; the runtime passed here, and the strace check is the only proof of SW-IO-18's order.
- Verify: execute `dist/relcli --version` (exit 0) and `FX/check-dirfsync.sh dist/relcli durable <workdir>` (exit 0 = directory fsync present, 1 = violation, 2 = tool failure).
- Run: **yes**: `hello`/`run`/`shell` exit 0; `check-dirfsync.sh` durable exit 0 / naive exit 1 on 6.4.0 and 6.3.3.

**SW-REL-BP-10 (SHOULD). Code that recurses or allocates deeply in a `Task` on the static leg either bounds its depth or links with `-Xlinker -z -Xlinker stack-size=0x80000`.**
- Why: musl non-main threads get 128 KiB; the same code ran to depth 5000 on glibc and crashed at depth 400 (exit 139) on musl.
- Verify: run the depth probe on the static binary: `relcli deep 1000 task` must exit 0 (reading heuristic for which code needs it; the probe is the check).
- Run: **yes**: musl exit 139 vs glibc exit 0; with the linker flag musl exit 0 at depth 700.

**SW-REL-BP-11 (MUST NOT). Static binaries contain no `dlopen`/`Bundle`-plugin/SourceKit-style loading; code that needs it is compiled out on the static leg.**
- Why: "even the `dlopen()` function will not work"; measured `dlopen nil: Dynamic loading not supported`.
- Verify: `grep -rn --include='*.swift' -e 'dlopen(' -e 'NSClassFromString' -e 'Bundle(path' Sources` shows each use; each must sit under an `#if` that excludes the static leg (reading heuristic on the hits).
- Run: **no** for the grep (reading heuristic); the runtime behaviour was run (exit 0, nil result).

**SW-REL-BP-12 (SHOULD). Strip at link time and budget the stripped size.** `-Xlinker -s`; fail a release leg when the stripped CLI exceeds the declared budget.
- Why: unstripped static binaries are 5x larger (138 MB vs 55.8 MB); the budget catches an accidental ICU pull-in (10.7 MB to 55.8 MB).
- Verify: `find dist -maxdepth 1 -name 'relcli*' -size +20M` (empty = pass at a 20 MiB budget; set the number per project).
- Run: **yes**: `find` prints `f2-full.stripped` and nothing for `f2-essentials.stripped` (the exit status is 0 either way, the output is the verdict).

**SW-REL-BP-13 (SHOULD). Choose `FoundationEssentials` for libraries to forbid ICU-dependent API at compile time, not to save size; a CLI that uses `DateFormatter`, `Locale`, `NumberFormatter` or `String.formatted()` with a locale pays about 45 MB static.**
- Why: `import Foundation` with Essentials-level API was byte-identical in size to `import FoundationEssentials`.
- Verify: compare the stripped size of the artifact with the budget (BP-12); compile-time check: replace the import with `FoundationEssentials` and build (`error: cannot find 'DateFormatter' in scope` marks ICU use).
- Run: **yes** (size pair, V8); the compile-time probe was not run (reading heuristic).

**SW-REL-BP-14 (SHOULD). For swift-syntax macro packages, depend with `from:` on a released tag and pin a CI toolchain that has a prebuilt manifest; never `exact:` a prerelease tag.**
- Why: prebuilts are keyed by resolved tag and `swift-X.Y.Z-RELEASE` + platform; `exact: ...prerelease...` built from source (73 s vs 16 s with `-j 2`), Swift 6.3.3 and Ubuntu 26.04 have none.
- Verify: `grep -rn --include='Package.swift' --include='Package@swift-*.swift' -e 'swift-syntax.*exact' .` (empty = pass) and on a CI log: `grep -L -e 'Prebuilt artifact' build.log` lists the log when no prebuilt was downloaded (run `swift build -v`).
- Run: **yes**: log check prints `hB.log`, `hD.log`, `jB.log`, `jD.log`, `k63A.log`, `k63B.log` and nothing for `hA.log`, `hC.log`, `jA.log`.

**SW-REL-BP-15 (MUST). A package that claims Wasm has a CI leg `swift build --swift-sdk <swiftCompilerTag>_wasm --target <Lib>` per claimed library target, and dependencies that do not build for WASI carry `condition: .when(platforms: [...])` with a `canImport` guard in source.**
- Why: swift-subprocess does not compile for WASI and takes the whole build down (exit 1); the conditional twin builds for both.
- Verify: `swift build -c release --target PureLib --swift-sdk swift-6.4.0-RELEASE_wasm` exit 0 is the check; manifest side, reading heuristic.
- Run: **yes**: PureLib exit 0 (6.4.0 and 6.3.3), `relcli` exit 1, `MixedLib` exit 0.

**SW-REL-BP-16 (MUST). Wasm tests are Swift Testing only and run as `swift test --disable-xctest --swift-sdk <id>`.**
- Why: without `--disable-xctest` the command exits 1 (`Exec format error`) on 6.4.0 and 6.3.3 even with no XCTest present.
- Verify: `swift test --disable-xctest --swift-sdk swift-6.4.0-RELEASE_wasm` exit 0; or `wasmkit run <runner>.wasm --testing-library swift-testing`.
- Run: **yes**: exit 1 vs 0, 6.4.0 and 6.3.3.

**SW-REL-BP-17 (SHOULD). Windows legs wrap each command in `Invoke-Program` (SW-GATE-25) and locate binaries with `--show-bin-path`.**
- Why: PowerShell does not stop on a failing subcommand; the corpus's Windows release workflows hardcode `.build\<triple>\release`.
- Verify: the BP-05 grep (its `\.build\\` alternative); `Invoke-Program` by reading heuristic.
- Run: **grep yes against a planted twin only** (`FX/pathcheck/bad/.github/workflows/windows.yml` prints; `good` empty); everything Windows-behavioural is **unverified: read only**.

## Verification runs

Scripts are in `FX/`; every build uses `--scratch-path "$SWIFT_SCRATCH/binaries-and-platforms/<tag>"` (fresh tags; the earlier base-path runs were repeated with fresh tags because the sandbox refused `rm -rf` of scratch variables). `relcli/` is the CLI package; "6.3" means `SWIFT_VERSION=6.3` (Swift 6.3.3). Exit codes are the script's/command's.

| # | Plant / check | Command (verbatim shape) | Red | Green |
|---|---|---|---|---|
| V1 | (a) static-stdlib link, 6.4.0 | `TAG=<t> FX/plant-a.sh essentials --static-swift-stdlib --build-system swiftbuild` (also `full`) | rc=1, `undefined reference to '$s15Synchronization12_MutexHandleV11_unlockSlowyyF'` | same with `--build-system native`: rc=0, `Build of product 'essentials' complete!` |
| V1b | (a) 6.3.3 | `SWIFT_VERSION=6.3 TAG=<t> FX/plant-a.sh full --static-swift-stdlib --build-system swiftbuild` | rc=1, `_MutexHandleV9_lockSlowyys6UInt32VF`, `_FoundationCollections10_HashTable...` | native: rc=0 |
| V1c | (a) fix present | `IMG=swiftlang/swift:nightly-6.4.x-noble TAG=<t> FX/plant-a-img.sh essentials --static-swift-stdlib --build-system swiftbuild` (Swift 6.4.4-dev, clean scratch; `full`, `relcli` too) | (6.4.0 same sources: rc=1) | rc=0 (`Build complete!`) |
| V1d | BP-04 grep | `grep -rn --include='Makefile' --include='Dockerfile*' --include='*.sh' --include='*.yml' --include='*.yaml' --include='*.mk' -e 'static-swift-stdlib' FX/stdlibcheck/bad \| grep -v -e 'build-system native' -e 'swift-sdk'` | 2 lines (`Makefile:2`, `Dockerfile:2`), final grep rc=0 | `.../good`: empty, rc=1 |
| V2 | (b) static SDK + `file` | `TAG=<t> KDIR=FX/../sdks-installed FX/plant-b.sh` (from `relcli/`) | n/a (green plant) | build rc=0; `ELF 64-bit LSB executable, x86-64, ... statically linked`; `ldd`: `not a dynamic executable`; `hello`, `run`, `shell` rc=0 |
| V2b | BP-01 check | `file <exe> \| grep -v -e 'statically linked'` | dynamic `Release-linux-x86_64/essentials`: prints the ELF pie line, rc=0 | musl `relcli`: empty, rc=1 |
| V2c | 6.3.3 static | `SWIFT_VERSION=6.3 TAG=b63 KDIR=FX/../sdks-installed-63 FX/plant-b.sh` | n/a | build rc=0, `statically linked`, runs rc=0 |
| V3 | SW-IO-18 under strace, musl | `FX/check-dirfsync.sh <musl relcli> naive <work>` | rc=1: `fsync(3<...>) = 0`, `rename(...) = 0`, no directory fsync (6.4.0 and 6.3.3) | `... durable <work>`: rc=0 `PASS: directory fsync present` |
| V3b | subprocess behaviours in musl | `TAG=<t> KDIR=... FX/plant-b2.sh` | `PATH=` + `.name`: `Executable "echo" is not found` rc=132 | `big`: `status=exited(0) bytes=1048576`; `cancel`: `cancelled status=signaled(9)` in 307 ms |
| V4 | (c) glibc floor | `TAG=<t> IMG=swift:6.4 FX/plant-c.sh` (also `swift:6.4-noble`, `-jammy`, `-amazonlinux2023`, 6.3) | static-stdlib exe: `highest=GLIBC_2.43` (noble 2.38; 6.3 2.38), `floor-check rc=1` | jammy: `GLIBC_2.35`; AL2023: `GLIBC_2.34`, rc=0 against a 2.35 floor |
| V5 | BP-06 grep, floor 2.34 | `objdump -T <exe> \| grep -e 'GLIBC_2\.3[5-9]' -e 'GLIBC_2\.[4-9][0-9]'` | c-res: 19 symbols (`acosf ... sqrtf strlcpy`), rc=0; noble: 7; jammy: `hypotf` | c-al23: empty, rc=1 |
| V6 | runtime proof | `docker run --rm -v <cache>:<cache> <image> <exe>` | `swift:6.4`-built on ubuntu:22.04/debian:13-slim/AL2023: rc=1, `GLIBC_2.43' not found`; noble-built on 22.04/AL2023: `GLIBC_2.38' not found`; jammy-built on AL2023: `GLIBC_2.35' not found` | AL2023-built: rc=0 on ubuntu:22.04, 24.04, debian:12-slim, 13-slim, AL2023, almalinux:9-minimal; jammy-built on 22.04 and debian:13: rc=0 |
| V7 | BP-07 runtime libs | `docker run --rm swift:<tag> sh -c "objdump -T /usr/lib/swift/linux/libswiftCore.so \| grep UND \| grep -e 'GLIBC_2\.3[5-9]' -e 'GLIBC_2\.[4-9][0-9]'"` | `swift:6.4`: `GLIBC_2.38 GLIBC_2.43`; `swift:6.4-noble`: `GLIBC_2.38` (while the dynamic exe check passes: `highest=GLIBC_2.34`) | `-jammy`, `-amazonlinux2023`: empty |
| V8 | (f) sizes | `TAG=<t> KDIR=... FX/plant-f.sh` (6.4.0; 6.3 with `-63`) | `full` stripped 55,831,480 (`find ... -size +20M` prints it) | `essentials` 10,718,576 = `foundation-json` 10,718,576 (`find` empty); 6.3.3: 11,992,432 / 58,448,824 |
| V8b | `-Xlinker -s` | `swift build ... --swift-sdk x86_64-swift-linux-musl --static-swift-stdlib -Xlinker -s` | n/a | `full` 55,831,488 bytes (138,119,728 without); `--static-swift-stdlib` alone changes nothing |
| V9 | (d) hardcoded path, behaviour | `TAG=<t> KDIR=... FX/plant-d.sh` | 6.4.0: `dist-bad rc=1` (`cannot stat ...x86_64-swift-linux-musl/release/relcli`) | `dist-good rc=0`; 6.3.3: both rc=0 |
| V9b | symlink | same script | after host then musl build `release -> out/Products/Release-staticlinux-x86_64`, `hello from musl` | after host build `release -> out/Products/Release-linux-x86_64`, `hello from glibc` |
| V9c | BP-05 grep | `grep -rn --include='*.sh' --include='*.yml' --include='*.yaml' --include='Makefile' --include='Dockerfile*' --include='*.mk' --include='*.ps1' -e '\.build/release' -e '\.build/debug' -e '\.build/[A-Za-z0-9_.-]*/release' -e '\.build/[A-Za-z0-9_.-]*/debug' -e '\.build/out/' -e '\.build\\' FX/pathcheck/bad` | 6 lines, rc=0 | `.../good`: empty, rc=1 |
| V9d | wrong-flag `--show-bin-path` | `TAG=<t> KDIR=... FX/plant-k.sh` | no-SDK call prints `Release-linux-x86_64`, `relcli` absent (`ls: cannot access`); after a host build the same path holds a glibc binary | with `--swift-sdk`: the `Release-staticlinux-x86_64` binary |
| V10 | SDK/toolchain mismatch | `swift build -c release --product stdio-good --swift-sdk x86_64-swift-linux-musl --swift-sdks-path <6.3.3 dir>` under 6.4 | rc=1 `module compiled with Swift 6.3.3 cannot be imported by the Swift 6.4 compiler` | matching 6.4.0 SDK: rc=0 |
| V11 | selector | `swift build ... --swift-sdk swift-6.4.0-RELEASE_static-linux-0.1.0` | rc=1 `has multiple target triples. Use the --triple flag`; `--swift-sdk x86_64-swift-linux-gnu`: `No Swift SDK found matching query` | `--swift-sdk x86_64-swift-linux-musl`: rc=0 |
| V11b | BP-03 grep | `grep -rn --include='*.yml' --include='*.yaml' --include='*.sh' --include='Makefile' --include='Dockerfile*' -e 'swift-sdk swift-' FX/sdkselect/bad \| grep -v -e '_wasm'` | 1 line, rc=0 | `.../good`: empty, rc=1 |
| V12 | checksum enforced | `swift sdk install <https URL>` (no `--checksum`) | rc=1 `require their checksum passed via --checksum option` | with `--checksum`: installed |
| V13 | SW-CLI-07 on both libcs | `TAG=<t> KDIR=... FX/plant-j.sh`-style build of `stdio-bad`/`stdio-good` | `stdio-bad` glibc rc=1 `reference to var 'stdout' is not concurrency-safe` | `stdio-good` glibc rc=0; `stdio-bad` musl rc=0 (compiles) |
| V14 | BP-08 | `TAG=<t> KDIR=... FX/plant-j.sh` (from `muslbranch/`) | `nomusl musl rc=1` `cannot find 'getpid' in scope`; grep prints `Sources/nomusl/main.swift` | `withmusl` gnu rc=0, musl rc=0; grep empty |
| V15 | musl stack | `TAG=<t> KDIR=... FX/plant-i.sh` (6.4.0, 6.3.3) | `depth=400 task musl rc=139`, 1000 and 5000 rc=139 | glibc depth 5000 rc=0; musl depth 200 rc=0; main thread depth 5000 rc=0; with `-Xlinker -z -Xlinker stack-size=0x80000` (`plant-i2.sh`): 700 rc=0, 1000 rc=139 |
| V16 | `dlopen` | `TAG=<t> KDIR=... FX/plant-k.sh` | musl `dlopen nil: Dynamic loading not supported` (rc=0, no crash) | glibc `dlopen ok` |
| V17 | (e) Wasm library | `TAG=<t> KDIR=... WASMID=swift-6.4.0-RELEASE_wasm FX/plant-e.sh` (6.3: `swift-6.3.3-RELEASE_wasm`) | `relcli (swift-subprocess) wasm rc=1` `'grp.h' file not found` | `PureLib target (wasm) rc=0`; `essentials` rc=0, run via WasmKit rc=0; `MixedLib` rc=0; `-embedded` SDK `PureLib` rc=0 |
| V18 | Wasm tests | `TAG=<t> KDIR=... WASMID=... FX/plant-e3.sh` (from `puretest/`) | `swift test --swift-sdk wasm rc=1` (6.4.0, 6.3.3) | `swift test --disable-xctest --swift-sdk wasm rc=0`, `Test run with 1 test ... passed` |
| V19 | (g) prebuilts | `FX/pg.sh pb-range 6.4-noble <tag> [2]` (pb-exact, pb-rangepre, pb63-*) and `grep -L -e 'Prebuilt artifact' <log>` | logs of `exact`, `26.04`, `6.3.3`: file name printed (no prebuilt) | logs of `from: "604.0.0"` and `from: "604.0.0-prerelease-..."` on noble: empty (prebuilt downloaded) |
| V20 | static SDK + two BoringSSLs | `TAG=<t> KDIR=... FX/plant-h.sh` (from `dupsym/`, `-j 6`) | n/a (reported failure on 6.4 not reproduced) | `swiftbuild rc=0`, `native rc=0` |
| V21 | Windows grep twin | V9c pattern on `FX/pathcheck/{bad,good}/.github/workflows/windows.yml` | bad prints `...\.build\${{ matrix.target-triple }}\release` | good empty |

Items that did not behave as the brief predicted:

- **(c) did not show `GLIBC_2.43` on the plain dynamic executable.** The executable of the dynamic build topped out at 2.34-2.38; 2.43 appears in static-stdlib executables and in the runtime libraries. The 2.35-floor red was produced with the static-stdlib build and with `libswiftCore.so` (V4, V5, V7).
- **(a) did not go red for a Foundation program that never used a Foundation symbol** (`relcli` before `naive` was added linked fine under Swift Build); it went red once a symbol was reachable. The earlier audit "E8" and the eco scout both used a Foundation-symbol program.
- **(d) is red only on 6.4.0 for the cross-SDK path;** the host-triple `.build/release` symlink still exists on 6.4.0, so a host-only `cp .build/release/relcli` is green there.
- **V20 did not reproduce the reported 6.4 regression**; the aws-lambda-runtime workaround looks stale (swift-nio-ssl 2.37.5, swift-crypto 4.5.2, 6.4.0).

## Exemplar evidence

Corpus SHAs from `swift-audit/scratch/exemplar-shas.md`.

| Candidate | Satisfies | Violates / contradicts |
|---|---|---|
| BP-01 static SDK | `containerization@3e7bc39e66b3:scripts/build-dist-x86_64.sh:154-162`, `vminitd/Makefile:38,41`; `SwiftLint@ec4691d9e813:.github/workflows/release.yml:122-179`; `swiftly@c8cf2e35bfca:Tools/build-swiftly-release/BuildSwiftlyRelease.swift:199-234,283`; `swift-aws-lambda-runtime@8abd464310c7:Sources/AWSLambdaPluginHelper/lambda-build/BuildBackends/StaticLinuxSDKBuildBackend.swift:58-107`; `swift-nio@e12881f2a691:.github/workflows/static_sdk.yml:15-16` (a reusable static leg, default `--swift-sdk x86_64-swift-linux-musl`) | none; the static leg is in the audit's 13-15 of 40 |
| BP-02 exact SDK, checksum | `SwiftLint` matrix pins `swift_version: 6.3.2`, `swift_sdk_checksum: 3fd798be...` (`release.yml:130-142`) and installs with `--checksum` (`:151`); swiftly verifies sha256 of the downloaded SDK before extracting (`BuildSwiftlyRelease.swift:226-228`); `containerization@3e7bc39e66b3:vminitd/Makefile:50-52` pins URL and checksum; `aws-lambda-runtime` docs: "the Static Linux SDK version must exactly match your installed Swift toolchain version" (`using-the-spm-plugins.md:163-166`) | the aws-lambda-runtime docs example installs a `6.4.x-DEVELOPMENT-SNAPSHOT-2026-05-31-a` SDK (`:158-162`), which only matches a matching snapshot toolchain |
| BP-03 triple selector | all of the above use `<arch>-swift-linux-musl`; `aws-lambda-runtime` notes "`swift sdk list` is deliberately NOT used ... prints SDK bundle identifiers ... which do not contain the target triple" (`StaticLinuxSDKBuildBackend.swift:71-75`) | none |
| BP-04 no `--static-swift-stdlib` recipe | `aws-lambda-runtime` uses it only with the static SDK or in the container backend (`NativeBuildBackend.swift:47`, `ContainerBuildBackend.swift:100`) and keeps a native-engine workaround (`pull_request.yml:36-42`) | `swift-dependencies@b476cc576105:Makefile:38-39,65,70` runs `swift build -c release --static-swift-stdlib` in Docker (a dependency-free library; no Foundation symbols reachable is plausible but unmeasured); `swiftformat`/SwiftLint Windows jobs pass `-Xswiftc -static-stdlib` (Windows, unverified) |
| BP-05 `--show-bin-path` | `containerization` (`build-dist-x86_64.sh:162`, `vminitd/Makefile:59`), `aws-lambda-runtime` (`StaticLinuxSDKBuildBackend.swift:78-90`, `NativeBuildBackend.swift:57-60`) | 15 of 40 repos have a hit in a script, workflow, Makefile or Dockerfile: `SwiftLint@ec4691d9e813:.github/workflows/release.yml:120,147`; `swiftly@c8cf2e35bfca:Tools/build-swiftly-release/BuildSwiftlyRelease.swift:285,299,321,330` and `.github/workflows/pull_request.yml:93,100,119,126`; `container-plugin@a9646b8d4dca:scripts/test-containertool-elf-detection.sh:43-47,60-63` (builds with `--swift-sdk x86_64-swift-linux-musl`, then reads `.build/x86_64-swift-linux-musl/debug/hello`); `aws-lambda-runtime@8abd464310c7:.github/workflows/scripts/check-link-foundation.sh:19` (`OUTPUT_DIR=.build/release`); `containerization@3e7bc39e66b3:examples/ctr-example/Makefile:28-29,41`; `swift-protobuf Makefile:32,60,105`; `tuist` mise tasks; `SwiftFormat@fbc07aca5373:.github/workflows/windows_release.yml:52` (Windows, unverified) |
| BP-06/07 glibc floor | `containerization@3e7bc39e66b3:docs/x86_64-build.md:224` documents the failure and a lower-baseline rebuild; `swiftly` builds its release in `redhat/ubi9` (glibc 2.34): `.github/workflows/build_release.yml:20-26` (the musl artifact itself is static) | nothing in the corpus runs a floor check (`grep GLIBC_` finds only the containerization doc and one SwiftPM test fixture) |
| BP-08 Musl branch | 368 `canImport(Musl)` sites: `swift-nio` 51, `containerization` 51, `swift-foundation` 31, `swift-system` 13, `tuist` 11 | none measured (a Glibc-only chain was planted, not found) |
| BP-09 smoke run | `containerization` runs the static `vminitd` inside its VM; `container-plugin` runs `containertool` on the produced ELF (`test-containertool-elf-detection.sh:44-47`, uses `file` on the artifact) | no corpus repository runs `swift-subprocess` on the static leg; upstream marks it Build only |
| BP-10 stack | `SwiftLint@ec4691d9e813:.github/workflows/release.yml:166-176` ("increase the stack size to 512KiB and replace musl's default allocator with mimalloc") | none |
| BP-11 no dlopen | `SwiftLint@ec4691d9e813:.github/workflows/release.yml:172` (`-DSWIFTLINT_DISABLE_SOURCEKIT`) | none |
| BP-12/13 size | `aws-lambda-runtime` strips with `-Xlinker -s` (`StaticLinuxSDKBuildBackend.swift:98-100`, `NativeBuildBackend.swift:50-52`); `vminitd/Makefile:41` `-Xlinker -s`; SwiftLint runs `strip -s` (`release.yml:179`) | the audit counts 388 `FoundationEssentials` files against 3,824 `Foundation` files ([pkg](../swift-audit/exemplar-packaging-and-release.md) Headline 9); nothing in the corpus measures size |
| BP-14 prebuilts | no exemplar sets `--disable-experimental-prebuilts`; none pins an exact prerelease swift-syntax tag in the sampled manifests (not exhaustively checked) | none found |
| BP-15/16 Wasm | `swift-nio` (`wasm_swift_sdk.yml`, `swift-build-with-wasm-sdk.sh:28-34`); `JavaScriptKit@c68ee9bdebfa:Examples/Basic/build.sh:3`, `Makefile:20`; `swift-testing@c7d68ca20cd7:Documentation/WASI.md:20-44` | `swift-testing` WASI.md's one-line `swift test --swift-sdk` omits `--disable-xctest` (did not pass here) |
| BP-17 Windows | `swift-format@b15dd59fad21:.github/workflows/pull_request.yml:37-39`, `publish_release.yml:131`; `swift-syntax@be549876fe91:.github/workflows/pull_request.yml:24` | `SwiftFormat@fbc07aca5373:.github/workflows/windows_release.yml:52` and SwiftLint's Windows job hardcode the native layout |

## AI-agent angle

| What an LLM characteristically gets wrong | Smallest mechanical check |
|---|---|
| Writes `swift build -c release --static-swift-stdlib` as "the static build" (the pre-6.4 Docker/Vapor recipe); passes on a stdlib-only toy and fails once a Foundation symbol is used | BP-04 grep; build a `JSONEncoder` probe on the pinned toolchain |
| Copies `.build/release/<name>` or `.build/x86_64-swift-linux-musl/release/<name>` (the swift.org article's own path) into a Dockerfile, Makefile or workflow | BP-05 grep; `dist-bad.sh` shape |
| Runs `swift build --show-bin-path` without the build's `--swift-sdk`, ships the host binary | BP-01 `file ... \| grep -v -e 'statically linked'` |
| Passes the bundle id from `swift sdk list` to `--swift-sdk` | BP-03 grep; the `multiple target triples` error |
| Installs "the latest" Static SDK URL or one from a different release than the toolchain; omits `--checksum` | the compiler error in V10; the tool's own checksum error |
| Uses `FROM swift:latest`/`swift:6.4` as the build stage and `FROM debian:...`/`ubuntu:22.04` as the runtime for a glibc binary | BP-06 `objdump -T` grep; run the artifact in the oldest target image |
| Declares the glibc floor from `objdump -T` of a dynamic executable | BP-07 on the runtime libs |
| Writes only `#if canImport(Glibc) import Glibc #endif` (or `#if os(Linux)`), forgetting Musl | BP-08 grep and the static-leg build |
| Assumes `import FoundationEssentials` shrinks the binary, or that `import Foundation` bloats it | BP-12 size budget; the byte-identical pair |
| Believes swift-subprocess cannot run on musl and reaches for `Foundation.Process` (hang risk, SW-IO-06) or the reverse: skips the runtime smoke test because CI says "Build only" | BP-09 smoke run |
| Uses `.name("echo")` in a `FROM scratch` image (no PATH entries, no binaries) | the smoke run inside the real image |
| Uses `dlopen`/plugins in code shipped on the static leg | BP-11 grep hits reviewed |
| Recurses deeply inside `Task` and trusts it because it passes on glibc | BP-10 depth probe on the musl binary |
| Adds swift-subprocess (or `Foundation.Process`) to a package claiming Wasm; writes `.macro(...)` without `import CompilerPluginSupport` (hit while building the prebuilt fixture: `type 'Target' has no member 'macro'`) | BP-15 Wasm leg; `swift package dump-package` |
| Runs `swift test --swift-sdk <wasm>` (exit 1) or adds XCTest to a Wasm test target | BP-16 |
| Pins swift-syntax `exact:` to a prerelease tag "for reproducibility" | BP-14 grep |
| Treats `ldd` exit 1 ("not a dynamic executable") as a failure of the static build | check `file`, not `ldd`'s status |
| Switches the whole project to `--build-system native` to silence a Swift Build error | BP-04 requires the comment and removal condition; native is deprecated and planned for removal in 2026H2 |

## Contested / evolving

- **`--build-system native` for SDK builds.** The corpus uses it as a standing workaround (`aws-lambda-runtime pull_request.yml:42`, `swift-nio swift-build-with-android-sdk.sh:43`, JavaScriptKit examples). On 6.4.0 the default engine built every static and Wasm fixture, including the case aws-lambda-runtime blames; native is deprecated with removal planned for 2026H2 (as of the 2025-10-27 plan). Trend: Swift Build everywhere; keep native only as a labelled, dated fallback (as of 2026-10-10).
- **Whether the `--static-swift-stdlib` fix reaches a tagged release.** Merged in swift-build main and the 6.4.x/6.4.1/6.4.2 branches (2026-09-22/23); 6.4.0 is the only 6.4 tag on 2026-10-10. The 6.4.x nightly passes. Guidance should re-test, not assume, when the pinned toolchain moves.
- **Static SDK versus glibc dynamic with an old-glibc image.** Practitioners and Apple's own repos both ship musl (SwiftLint, swiftly, containerization), but glibc remains right when `dlopen`, NSS or a missing C library matters. The two-way size comparison here favours musl (10.7 MB against 13.7 MB stripped), which differs from the common belief that musl binaries are larger.
- **Prebuilt coverage is thin and moving.** Manifests exist for 6.3.0/6.3.1 and 6.4.0 only, on the platforms in SwiftPM's enum. A 6.4.x patch release or a new swift-syntax tag may add or miss manifests without notice; the log check is the only reliable signal.
- **musl `swift-subprocess` support level.** Upstream says "Build only"; this dive shows it working. Whether upstream will promote it to "Automated" is not announced.
- **Windows static linking.** The corpus uses `WindowsExperimental.sdk` with snapshot toolchains; the swift.org Windows install page does not mention static linking. Unverified; the sentence in the SwiftFormat workflow says the experimental SDK "will be merged into Windows.sdk in the near future".

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://www.swift.org/documentation/articles/static-linux-getting-started.html | Official Static Linux SDK guide | 6.4.0 (examples show 6.1.2 SBOM) | no dlopen, exact toolchain match, `--checksum`, Musl import, native-layout example path |
| https://www.swift.org/documentation/articles/wasm-getting-started.html | Official Wasm SDK guide | 6.4.0 | SDK ids, Embedded id, Windows hosts unsupported, WasmKit |
| https://github.com/swiftlang/swift-build/issues/1764 | `--static-swift-stdlib` fails when linking Foundation | opened 2026-09-21, closed 2026-09-22 | the repro, the native-engine twin, 6.4.0 affected |
| https://github.com/swiftlang/swift-build/pull/1763 | Fix: explicit `-static-stdlib` on compile tasks (backports #1770, #1771, #1772) | merged 2026-09-22/23 | root cause and the fix's reach |
| https://github.com/swiftlang/swift-build | Swift Build repository and README | main, 2026 | engine status, opt-in on 6.2/6.3 |
| https://github.com/swiftlang/swift-package-manager/blob/main/Sources/PackageManagerDocs/Documentation.docc/ReleaseNotes/6.4.md | SwiftPM 6.4 release notes | 6.4.0 | `--show-bin-path`, stricter static-stdlib, known issues #10006 |
| https://forums.swift.org/t/swiftpm-development-update-default-build-system-change/85548 | PSA that main switched to `--build-system swiftbuild` (Owen Voorhees) | 2026-03-24 | date and fallback flag |
| https://forums.swift.org/t/swiftpm-on-swift-build-october-update/82889 | Swift Build roadmap (Owen Voorhees) | 2025-10-27 | "Remove ... current default build system implementation in 2026H2" |
| https://www.swift.org/blog/swift-6.4-released/ | Swift 6.4 release post | 2026-09-14/15 | Swift Build default, Wasm SDK, Windows, Subprocess 1.0 |
| https://github.com/swiftlang/swift-package-manager/blob/main/Sources/Workspace/Workspace%2BPrebuilts.swift | SwiftPM prebuilts manager (also `Sources/PackageModel/PrebuiltLibrary.swift`, `Sources/CoreCommands/Options.swift`) | main, 2026-10 | manifest URL shape, platform enum and host detection, default-on flag |
| https://download.swift.org/prebuilts/swift-syntax/604.0.0/swift-6.4.0-RELEASE-ubuntu_noble_x86_64.json | Published prebuilt manifests (probed with curl) | 2026-10-10 | which tag/toolchain/platform combinations exist |
| https://www.swift.org/api/v1/install/releases.json | Machine-readable releases, platforms, SDK checksums | 2026-10-10 | SDK pins, 6.4.0 platform list |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0387-cross-compilation-destinations.md | SE-0387 Swift SDKs for cross-compilation | Implemented 6.1 | `--swift-sdk` id and triple selection |
| https://github.com/swiftlang/swift-subprocess/blob/main/README.md | swift-subprocess README | 1.0.1, 2026-10-09 | platform table: Static Linux SDK "Build only", no Wasm |
| https://github.com/swiftlang/swift-package-manager/issues/10237 | Duplicate libc++abi symbols with two BoringSSLs under Swift Build (swiftlang/swift#90196) | 2026-06-25, closed 2026-07-02 | the reason aws-lambda-runtime forces native |
| https://github.com/swiftlang/github-workflows/blob/main/.github/workflows/scripts/install-and-build-with-sdk.sh | Apple's CI script that installs Static/Wasm/Android SDKs from releases.json | tag 0.0.15 era | `jq` over releases.json, checksum handling |
| https://www.swift.org/install/windows/ | Official Windows install page | 6.4.0 | WinGet command, VS components, containers |
| https://hub.docker.com/v2/repositories/swiftlang/swift/tags | Docker Hub tag list (nightly-6.4.x-noble etc.) | 2026-10-10 | where the fixed nightly came from |
| https://github.com/swiftlang/swift-syntax/tags | swift-syntax tags (604.0.0, 604.0.0-prerelease-2026-09-15) | 2026-09-15 | the pins compared |
| https://github.com/swiftlang/swift-testing/blob/main/Documentation/WASI.md | Swift Testing on Wasm | 6.3+ | documented `swift test --swift-sdk`, WasmKit |
| https://github.com/apple/containerization (corpus `containerization@3e7bc39e66b3`) | Apple's static-musl `vminitd` and dist scripts | 2026-10 | SDK pin constants, `--show-bin-path`, glibc-baseline troubleshooting |
| https://github.com/realm/SwiftLint (corpus `SwiftLint@ec4691d9e813` `.github/workflows/release.yml`) | SwiftLint static Linux and Windows release jobs | 2026-10 | stack size, mimalloc, SourceKit off, hardcoded path |
| https://github.com/swiftlang/swiftly (corpus `swiftly@c8cf2e35bfca` `Tools/build-swiftly-release`) | swiftly release tool | 2026-10 | SDK download + sha256 verification, musl build in Swift code |
| https://github.com/awslabs/swift-aws-lambda-runtime (corpus `swift-aws-lambda-runtime@8abd464310c7`) | Lambda runtime build plugin with three backends | 2026-10 | `--show-bin-path` preflight, native-engine workaround |
| https://github.com/swift-server/swift-aws-lambda-runtime/pull/567 | PR that found the BoringSSL link failure (linked from #10237) | 2026-06-25 | provenance of the workaround |
| https://github.com/swiftlang/swift-package-manager/issues/10006 | Swift Build fails with SDK-generator Linux SDKs | 6.4.0 known issue | do not confuse with the official Static SDK |
| https://github.com/nicklockwood/SwiftFormat (corpus `SwiftFormat@fbc07aca5373` `.github/workflows/windows_release.yml`) | SwiftFormat Windows release workflow | 2025-08 snapshot | experimental static SDK, hardcoded `.build\<triple>\release` |
