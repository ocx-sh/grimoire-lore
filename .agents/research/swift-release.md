---
title: "Swift release (SW-REL): toolchain pin, static Linux binaries, glibc floor, build paths, Wasm, SBOM, stamping, assets, images, library tags"
topic: release
model: sonnet
id_family: SW-REL
consolidates:
  - swift-release/binaries-and-platforms.md
  - swift-release/release-pipeline.md
date: 2026-10-10
---

# Swift release (SW-REL), Swift 6.4 era, 2026-10-10

Keys. **[BP]** = [binaries-and-platforms](swift-release/binaries-and-platforms.md) (finding §, verification run Vn, dive rule BP-nn). **[RP]** = [release-pipeline](swift-release/release-pipeline.md) (finding §, VR-n, dive rule RP-nn). **[RC]** = a re-run made for this consolidation (table "Re-runs made for this consolidation", fixtures under `/home/mherwig/.cache/research-lang/swift-tools/fixtures/release/`). **[pkg]**, **[gates]**, **[cfg]** = the audits under `swift-audit/`. **[map]** = [swift-topic-map](swift-topic-map.md). Sibling rule IDs (SW-GATE, SW-PKG, SW-LANG, SW-CLI, SW-IO, SW-SEC, SW-API) are the consolidated ones in `swift-gates.md`, `swift-package.md`, `swift-language.md`, `swift-cli.md`, `swift-io.md`, `swift-security.md`, `swift-api.md`. Every Windows, macOS, arm64 and GitHub-Actions statement is "unverified: read only" (owner Q7, no runner).

## Verdict

1. **A Linux CLI or server release is a static musl binary from the static Linux SDK** (`--swift-sdk <arch>-swift-linux-musl`), SDK version equal to the toolchain patch, installed with `--checksum` from `releases.json`, shipped only after `file` says "statically linked" and the binary has been run ([BP] §2, §11; SW-REL-02, -05, -07). `--static-swift-stdlib` is not a recipe: it fails to link on 6.4.0 and 6.3.3 the moment a Foundation symbol is reachable; the fix (swift-build#1763) is merged but no tagged toolchain carries it yet ([BP] §3; SW-REL-03).
2. **The glibc dynamic build is the fallback, not the default**, for code that needs `dlopen`, NSS or a C library the SDK lacks. It is built in the oldest-glibc image (`swift:X.Y.Z-amazonlinux2023`, 2.34), and the floor is checked on what the host must supply: the executable for a static-stdlib build, the toolchain runtime libraries for a dynamic one. A plain `objdump -T` of a dynamic executable is blind ([BP] §5; SW-REL-06).
3. **Locate artifacts with `--show-bin-path` and the build's own flags; never name `.build/release` or `.build/<triple>/...`.** Swift Build (default in 6.4) moved the tree and `.build/release` is a last-writer-wins symlink; 15 of 40 corpus repos hardcode a path ([BP] §1, §4; SW-REL-04).
4. **One exact toolchain patch, one source.** `.swift-version` holds `X.Y.Z`, every `swift:` tag is that literal, and a pin check drops a trailing `.0` because `swift --version` prints `6.4` for 6.4.0 ([RP] §2; SW-REL-01).
5. **Strip, but keep the unstripped twin.** This deliberately differs from go-release's "do not strip" (GO-REL-05): on a static musl Swift binary the in-process backtrace prints `<unknown>` frames stripped or not, so the only symbol source is an unstripped twin that `addr2line` resolves; shipping the twin is cheap, shipping without one is not recoverable ([RC] R1; SW-REL-08).
6. **Version, SBOM and bytes.** `--version` is stamped from the tag by a build-tool plugin or generated file fed by a version file or `git describe`, never an environment variable (Swift Build drops it for plugin commands, [RC] R6). The release SBOM is `swift build --sbom-spec cyclonedx` on Swift 6.4 from a clean tagged tree and is never gated on bytes. Reproducibility is an opt-in SHOULD with fixed paths and fixed SDK mtimes ([RP] §3-§5; SW-REL-11, -12, -14).
7. **Assets are the fleet's pinned shape:** raw `<tool>-<os>-<arch>` plus `checksums.txt`, tags `vX.Y.Z` in every fleet repo (library SDK included; `git tag -l` of ocx, grimoire and ocx-sdk-python, [RC] R13). A general adopter may use bare tags or archives; the checks enforce one consistent form, three components, annotated, never moved (SW-REL-13, -18, -19).
8. **A library or SDK tag must resolve for version consumers:** no `path:`, `branch:` or `revision:` in the tagged manifest (resolution fails with exit 1 for every consumer, [RP] §9), the API-breakage baseline is the last release tag, and a 0.x library tells consumers to use `.upToNextMinor` ([RP] §8, §10; SW-REL-17, -20, -21).
9. **Scope the platform claims.** Wasm is a rule only for packages that claim it, with `--disable-xctest`; Windows, macOS, arm64, attestation and TLS-in-`FROM scratch` are unverified here and carry no MUST ([BP] §9, §10; SW-REL-10, -16).
10. **Binds by code kind.** Library and SDK: SW-REL-01, -10 (if claimed), -17 to -22. CLI and server: SW-REL-01 to -16. Apple app and test code: nothing here (xcodebuild, signing and notarization are read-only depth in `apple.md`).

### Conflicts resolved

| # | Conflict | Decision and reason |
|---|---|---|
| 1 | [RP] RP-04(a) flags every `build-system native` and `static-swift-stdlib` line; [BP] BP-04 tolerates them on a labelled glibc fallback | BP-04 wins; the SBOM concern is narrowed to lines that carry `--sbom-spec`. Watched: RP's grep flags the permitted fallback line, the consolidated pair does not ([RC] R2). |
| 2 | [BP] BP-12 strips (`-Xlinker -s`); go-release GO-REL-05 says do not strip; swift-diagnose needs crash evidence | Strip after the build, keep the twin. Measured: stripped and unstripped static binaries print the same `<unknown>` frames (exit 132, 47 lines each); `addr2line` resolves `$s6crashy7explodeyS2iF` only on the twin ([RC] R1). Go's reason (binary-mode vuln scan needs symbols) does not transfer: SW-SEC-21 scans `Package.resolved` and the SBOM. |
| 3 | [map] M-N-03 and [eco]: "a binary built in the 6.4 image needs GLIBC_2.43" with `objdump -T bin \| ... \| tail -1`; [BP] §5: true for static-stdlib builds and runtime libraries, false for a plain dynamic executable | BP wins, re-run: dynamic `essentials` built in `swift:6.4` shows highest `GLIBC_2.34`, its `libswiftCore.so` needs 2.38 and 2.43 ([RC] R4). The check is per build type (SW-REL-06). |
| 4 | [map] conflict 12: Foundation 55.6 MB vs FoundationEssentials 10.3 MB is "real cost"; [BP] §7: the two are byte-identical (10,718,576) for the same code | BP wins (measured, [BP] V8). The 45 MB is ICU, pulled by `DateFormatter`/`Locale`. `FoundationEssentials` stays the library import as a compile-time guard (SW-LANG, SW-IO), not a size rule (SW-REL-08). Also answers swift-io open question 3. |
| 5 | [BP] BP-14: swift-syntax `from:` on a released tag; SW-PKG-10: libraries declare a range, `from:` only in leaf executables | SW-PKG-10 owns the declaration. SW-REL-22 keeps only the release-side facts: no `exact:` prerelease, and the CI log shows "Prebuilt artifact" ([BP] §8). |
| 6 | [RP] RP-13: bare tags for libraries, `v` for binary repos; fleet repos tag `v` everywhere, the Python SDK included | One form per repo is the enforced rule; the fleet default is `v` (SwiftPM resolves both identically, [RP] §8). Bare stays legal for external libraries. |
| 7 | [BP] BP-05 MUST vs [BP] V9: a host-only `.build/release` still works on 6.4.0 (red only for cross-SDK paths) | Keep MUST. The symlink printed "hello from musl" after a host build followed by a musl build ([BP] §4); a script that later gains `--swift-sdk` breaks silently. |
| 8 | [BP] BP-08 (every `canImport(Glibc)` chain needs a Musl branch) vs SW-LANG-02; [BP] BP-17 vs SW-GATE-25; [RP] RP-18 vs SW-PKG-26/28/29; [RP] RP-17 vs SW-GATE-20 | Duplicates dropped or merged: SW-LANG-02, SW-GATE-25, SW-PKG-26/28/29 own them. SW-GATE-20 owns the gate; SW-REL-20 adds only the baseline (last release tag) and the two meanings of exit 1. |
| 9 | [BP] BP-02 version pin = "reading heuristic only" | Upgraded: a grep compares the SDK URL version with `.swift-version`, run red/green ([RC] R2). |
| 10 | [RP] §4 says RELCLI_VERSION reached the plugin on native but not on Swift Build; the final StampTool ignores the variable, so the recorded fixture could not show it | Re-ran with an env-reading tool: Swift Build `1.2.3-dirty`, native `9.9.9`, on 6.4.0 and 6.3.3 ([RC] R6). Claim stands. |
| 11 | [BP] V20: aws-lambda-runtime's `--build-system native` workaround (swift-aws-lambda-runtime@8abd464310c7:.github/workflows/pull_request.yml:36-42) did not reproduce | Treated as stale but labelled; SW-REL-03's comment-plus-removal-condition covers it. Not removed without a run on their tree. |

## The ruleset

Format per rule: the rule; **Why** (the failure it prevents); **Verify** (exact command; "output = violation" means an empty result is the pass, because the exit status of the final `grep` is not the signal); **Watched** (red on a plant, green on its twin; where); **Severity, floor**; **Binds**. Severity vocabulary: MUST, SHOULD, CONSIDER; "MUST when X" binds only where X holds. Dive rule IDs are in parentheses for traceability.

### A. Caught by a grep over pins, scripts and workflows

**SW-REL-01 (MUST; any Swift, swiftly 1.x reads the file). Pin the release toolchain to one exact patch in `.swift-version`; every `swift:` image tag in Dockerfiles and workflows is that literal version (a variant suffix such as `-noble` or `-amazonlinux2023` is fine); the compiler a release job runs reports it.** (RP-01, -02, -03; extends SW-GATE-08, which requires only that the file exists)
- Why: swiftly and rules_swift select by that file and a partial selector (`6.4`) resolves to whatever is installed per machine; `swift:6.3` floated to 6.3.3 during the research; `swiftlang/github-workflows@0.0.15` defaults its API and docs jobs to `swift:6.3-noble` ([RP] §2); `swift --version` prints `Swift version 6.4 (swift-6.4-RELEASE)` for 6.4.0 so a naive compare fails on a correct toolchain.
- Verify (a) `grep -L -x -E -e '[0-9]+\.[0-9]+\.[0-9]+' .swift-version` (output = violation; a missing file exits 2). (b) `read -r V < .swift-version; grep -rn --include='Dockerfile*' --include='*.yml' --include='*.yaml' -e 'swift:' . | grep -v -F -e "swift:$V"` (output = violation; nightly legs and an `ARG`-built tag are flagged and reviewed by reading, the `ARG` form is a measured false positive, write the literal). (c) `V=$(cat .swift-version); P=${V%.0}; swift --version | grep -F -e 'Swift version' | grep -v -F -e "Swift version $P ("` (output = violation).
- Watched: **yes**. [RP] VR-4: `good` empty, `bad` prints `.swift-version` and two image lines, `missing` exits 2; compiler spelling on both images. Re-run: [RC] R10, R11 (`swift:6.4` prints `Swift version 6.4 (swift-6.4-RELEASE)`, `swift:6.3` prints `Swift version 6.3.3 (swift-6.3.3-RELEASE)`).
- Exception: a snapshot selector (`main-snapshot-2026-09-10`, swift-embedded-examples@119b29f83550:.swift-version) is legitimate for a nightly-only repository; release jobs use the exact form.
- Binds: every kind with a CI image or a release.

**SW-REL-02 (MUST; Swift 6.1+, Static SDK 0.1.0 measured on 6.3.3 and 6.4.0). The Static Linux SDK has exactly the toolchain's version and is installed with its URL and `--checksum` taken from one source (`https://www.swift.org/api/v1/install/releases.json`, entry `static-sdk`).** (BP-02; RP-10 checksum clause)
- Why: a 6.3.3 SDK under the 6.4 compiler fails with `module compiled with Swift 6.3.3 cannot be imported by the Swift 6.4 compiler` (exit 1, [BP] V10); a remote install without `--checksum` is refused by the tool but a script can quietly pass `--checksum` from a stale doc; tuist pins Swift 6.2.3 with bundle `static-linux-0.0.1` while 6.4.0's is `static-linux-0.1.0` ([pkg] Release engineering).
- Verify (a), output = install without `--checksum`, continuation lines joined: `find . -type f \( -name 'Dockerfile*' -o -name '*.yml' -o -name '*.yaml' -o -name '*.sh' -o -name 'Makefile' \) -print0 | xargs -0 -r -n1 sh -c 'sed -e ":a" -e "/\\\\\$/N; s/\\\\\n//; ta" "$0" | grep -n -e "swift sdk install" | grep -v -e "--checksum" | sed "s|^|$0:|"'`. (b), output = SDK URL whose version differs from the pin: `V=$(cat .swift-version); grep -rn -E 'static-linux-[0-9.]+\.artifactbundle' . | grep -v -F -e "swift-$V-RELEASE_static-linux"`. (c) the compiler: `swift build --swift-sdk x86_64-swift-linux-musl` exits non-zero on a mismatch.
- Watched: **yes**. (a),(b) [RC] R2: `bad` prints the checksum-less line and the 6.3.3 URL, `good` (one-line and backslash-continued `--checksum`) prints nothing. (c) [BP] V10 exit 1 vs 0.
- Binds: CLI, server, image builds.

**SW-REL-03 (MUST NOT; 6.4.0 default engine, 6.3.3 with `--build-system swiftbuild`). Do not present `--static-swift-stdlib` as the static recipe.** It is tolerated only on a glibc fallback build, with `--build-system native`, a comment naming [swift-build#1764](https://github.com/swiftlang/swift-build/issues/1764), and a removal condition ("drop when the pinned toolchain contains swift-build#1763"). (BP-04; RP-04(a) narrowed)
- Why: under Swift Build it exits 1 with `undefined reference to '$s15Synchronization12_MutexHandleV11_unlockSlowyyF'` once any Foundation symbol is reachable; `import Foundation` alone does not trigger it; the native engine is deprecated with removal planned for 2026H2 ([BP] §3). Fixed in swift-build#1763 (merged 2026-09-22, backported to 6.4.x branches); only 6.4.0 is tagged on 2026-10-10.
- Verify: `grep -rn --include='Makefile' --include='Dockerfile*' --include='*.sh' --include='*.yml' --include='*.yaml' --include='*.mk' -e 'static-swift-stdlib' . | grep -v -e 'build-system native' -e 'swift-sdk'` (output = violation; the comment and removal condition are a reading check). Behavioural probe for the removal condition: build a product that uses `JSONEncoder` with `--static-swift-stdlib` on the default engine; exit 0 means the fix is present.
- Watched: **yes**. [BP] V1/V1b/V1c (6.4.0 and 6.3.3 exit 1, native exit 0, `nightly-6.4.x` exit 0), V1d; [RC] R2 (the permitted native fallback line passes, a bare `--static-swift-stdlib` line is flagged).
- Binds: CLI, server. Corpus context: [swift-dependencies Makefile](#applied-to-the-exemplars-and-the-future-consumers) runs the flag in Docker; unmeasured.

**SW-REL-04 (MUST; 6.4.0 layout, native layout still exists on 6.3.3). Locate build products with `swift build <the build's own flags> --show-bin-path`; no script, workflow, Makefile or Dockerfile names `.build/release`, `.build/debug`, `.build/<triple>/...` or `.build/out/...`.** (BP-05; BP-17 path clause)
- Why: Swift Build writes `<scratch>/out/Products/<Config>-<platform>-<arch>/`; `.build/x86_64-swift-linux-musl/release` does not exist on 6.4.0 (`cp` exit 1); `.build/release` is repointed by the last build; `--show-bin-path` without the `--swift-sdk` flag returns the host directory, which after a host build holds a glibc binary that `cp` ships silently ([BP] §4, V9, V9d). The swift.org static-linux article's own example path is native-layout.
- Verify: `grep -rn --include='*.sh' --include='*.yml' --include='*.yaml' --include='Makefile' --include='Dockerfile*' --include='*.mk' --include='*.ps1' -e '\.build/release' -e '\.build/debug' -e '\.build/[A-Za-z0-9_.-]*/release' -e '\.build/[A-Za-z0-9_.-]*/debug' -e '\.build/out/' -e '\.build\\' .` (output = violation; template paths and a custom `--scratch-path` variable escape it, so SW-REL-05's `file` gate backs it up). The Windows alternative `\.build\\` is unverified: read only.
- Watched: **yes**. [BP] V9c 6 lines red, empty green; V9 (`dist-bad` exit 1, `dist-good` exit 0 on 6.4.0; both 0 on 6.3.3); [RC] R10 re-run: `bad` prints the six lines, `good` is empty.
- Binds: every kind that builds a release in scripts. Windows layout on Swift Build 6.4 not measured.

### B. Caught by running a tool on the built artifact

**SW-REL-05 (MUST; Swift 6.1+, Static SDK). A Linux CLI release binary is built with `swift build -c release --swift-sdk <arch>-swift-linux-musl` (selected by triple, never by bundle id), and the shipped file is reported statically linked.** (BP-01, BP-03)
- Why: runs unchanged on Ubuntu 22.04, Debian 12/13, Amazon Linux 2023, AlmaLinux 9, Alpine and `FROM scratch` (6.4.0 and 6.3.3), no glibc floor; the bundle id from `swift sdk list` fails with `has multiple target triples` ([BP] §2, V11). It is also the leg SW-GATE-25 requires.
- Verify: `file dist/tool-linux-amd64 | grep -v -e 'statically linked'` (output = violation; `file(1)` is not in the swift image, run it on the host or add it); `grep -rn --include='*.yml' --include='*.yaml' --include='*.sh' --include='Makefile' --include='Dockerfile*' -e 'swift-sdk swift-' . | grep -v -e '_wasm'` (output = bundle id used; Wasm ids are the exception). `ldd`'s exit 1 ("not a dynamic executable") is not a failure.
- Watched: **yes**. [BP] V2b, V11b; [RC] R12 (dynamic `essentials` prints the `ELF 64-bit LSB pie executable` line; the musl `crashy` prints nothing).
- Binds: CLI, server. Out when the binary needs `dlopen`, NSS or a C library absent from the SDK: use SW-REL-06.

**SW-REL-06 (MUST when a dynamic glibc binary is released; any Swift). Build it in the oldest-glibc image the project supports (`swift:X.Y.Z-amazonlinux2023`, glibc 2.34, or `-ubi9`), never in `swift:X.Y.Z` or `latest` (Ubuntu 26.04, glibc 2.43 for 6.4); the floor is checked on what the host must supply.** (BP-06, BP-07)
- Why: the `swift:6.4` static-stdlib output died on Ubuntu 22.04, Debian 13 and AL2023 (`GLIBC_2.43' not found`); built in `swift:6.4-amazonlinux2023` the same source ran on six hosts ([BP] §5, V6). A dynamic executable shows at most `GLIBC_2.34` while its runtime `libswiftCore.so` needs 2.38 and 2.43, so the executable-only check is green and the host fails.
- Verify (floor 2.34 shown; change `floor=`). Executable of a static-stdlib build: `objdump -T "$BIN" | grep -o 'GLIBC_[0-9.]*' | sed 's/GLIBC_//' | sort -V -u | awk -v floor=2.34 'function v(s){split(s,a,".");return a[1]*1000+a[2]} v($0)>v(floor){print "GLIBC_" $0 " above floor " floor}'` (output = violation). Dynamic build, inside the build image: the same pipeline on `objdump -T /usr/lib/swift/linux/libswiftCore.so | grep UND`.
- Watched: **yes**. [BP] V4-V7; [RC] R4: static-stdlib `essentials` highest 2.43 (`swift:6.4`), 2.38 (noble), 2.35 (jammy), 2.34 (AL2023); the dynamic executables all show 2.34; `libswiftCore.so` prints 2.38 and 2.43 on `swift:6.4` and nothing on `swift:6.4-amazonlinux2023`.
- Binds: CLI, server (glibc fallback only). The map's M-N-03 one-liner is superseded (conflict 3).

**SW-REL-07 (MUST; measured 6.4.0 and 6.3.3). The static leg runs the artifact it just built: `--version` (exit 0), one `swift-subprocess` `run()` if the CLI spawns processes, and the directory-fsync strace check where it persists state; run it in the target image (a `FROM scratch` image has no `/bin/echo` and an empty `PATH`).** (BP-09)
- Why: upstream CI marks swift-subprocess on the Static SDK "Build only"; here `run()` with `.path` and `.name`, 1 MiB of output and task cancellation (child killed after 307 ms) all passed ([BP] §6). The `canImport(Musl)` branch of the SW-IO-18 durable helper compiles and passes the strace order; `Data.write(.atomic)` issues no directory fsync.
- Verify: `dist/tool --version` exit 0; `strace -f -y -e trace=fsync,fdatasync,rename,renameat,renameat2 -o trace.txt dist/tool <writing-command> "$DIR/target"; grep -q "fsync([0-9]*<$DIR>)" trace.txt` (exit 0 = directory fsync present). Run strace inside `swift:6.4` even when 6.3 built the binary (the strace RPM needs glibc 2.43; a missing trace is a tool failure, not a pass).
- Watched: **yes**. [BP] V3 (naive exit 1, durable exit 0, 6.4.0 and 6.3.3), V3b; [RC] R9 re-run: naive prints `VIOLATION: no fsync of directory` with `fsync(3<...>)` then `rename(...)` and no directory fsync; durable prints `PASS: directory fsync present`.
- Binds: CLI that writes state.

**SW-REL-08 (SHOULD; 6.4.0). Strip the shipped binary after the build, keep the unstripped twin as a CI artifact (not a release asset), and budget the stripped size; `FoundationEssentials` is a compile-time guard, not a size lever.** (BP-12, BP-13; new twin clause)
- Why: unstripped static binaries are 5x larger (138 MB vs 55.8 MB for the ICU program); an accidental `DateFormatter`/`Locale` takes the program from 10.7 MB to 55.8 MB, and `import Foundation` vs `import FoundationEssentials` for identical code is byte-identical at 10,718,576 ([BP] §7, V8). The static binary's backtrace is addresses only, with or without symbols, so symbol names come only from the twin ([RC] R1); with no helper in the image (`FROM scratch`) there is no backtrace at all (exit 132, 0 stderr lines).
- Verify (a) `cp "$BIN" dist/tool.debug; strip -o dist/tool-linux-amd64 "$BIN"; find dist -maxdepth 1 -name 'tool-*' -size +20M` (output = over the 20 MiB budget; set the number per project). (b) with an address from a crash trace: `addr2line -f -C -e dist/tool.debug "$ADDR"` prints a `$s...` symbol; the same call on `dist/tool-linux-amd64` prints `??`.
- Watched: **yes**. [BP] V8 (`find` prints the 55.8 MB `full`, nothing for `essentials`); [RC] R1: `addr2line -f -C -e crashy-unstripped 0x41c899` prints `$s6crashy7explodeyS2iF`, on `crashy-stripped` prints `??`; `nm crashy-stripped` prints `no symbols`.
- Binds: CLI, server. Differs from GO-REL-05 on purpose (conflict 2).

**SW-REL-09 (SHOULD; measured 6.4.0 and 6.3.3). On the static leg, tasks that recurse deeply are bounded or the link carries `-Xlinker -z -Xlinker stack-size=0x80000`, and no code path loads code at run time (`dlopen`, plugins, SourceKit); such code is compiled out under `#if`.** (BP-10, BP-11)
- Why: musl gives non-main threads a 128 KiB stack; recursion inside a `Task` that ran to depth 5000 on glibc crashed at depth 400 with exit 139; `dlopen` returns nil ("Dynamic loading not supported", no crash). SwiftLint's static build does both (swift: `SwiftLint@ec4691d9e813:.github/workflows/release.yml:166-176`, `-DSWIFTLINT_DISABLE_SOURCEKIT` at `:172`).
- Verify: run the depth probe on the static binary, exit 0 required (which code needs it is a reading heuristic); `grep -rn --include='*.swift' -e 'dlopen(' -e 'NSClassFromString' -e 'Bundle(path' Sources` and read each hit for an `#if` that excludes the static leg (a grep cannot see a compile condition).
- Watched: **yes** for the stack: [BP] V15 (musl depth 400 exit 139, glibc exit 0, flag moves the limit to ~700); [RC] R5 (`crashy deep`, depth 1000 in a Task: musl exit 139, glibc exit 0). **No** for the `dlopen` grep (reading heuristic; the runtime result was run, [BP] V16).
- Binds: CLI, server on the static leg.

### C. Caught by the toolchain's own build, test or hash commands

**SW-REL-10 (MUST when the package claims Wasm; Swift 6.2+, measured 6.4.0 and 6.3.3). A package that claims Wasm has a CI leg `swift build --swift-sdk <swiftCompilerTag>_wasm --target <Lib>` per claimed library target; a dependency that does not build for WASI (swift-subprocess) carries `condition: .when(platforms: [...])` plus a `canImport` guard; Wasm tests are Swift Testing only, run as `swift test --disable-xctest --swift-sdk <id>`.** (BP-15, BP-16)
- Why: swift-subprocess fails for WASI (`'grp.h' file not found`) and takes the whole build down (exit 1), the conditional twin builds for both; `swift test --swift-sdk <wasm>` exits 1 (`posix_spawn error: Exec format error`) unless `--disable-xctest` is passed, even with no XCTest present ([BP] §9). The one-line example in swift-testing@c7d68ca20cd7:Documentation/WASI.md:20-26 omits the flag.
- Verify: `swift build -c release --target PureLib --swift-sdk swift-6.4.0-RELEASE_wasm` exit 0; `swift test --disable-xctest --swift-sdk swift-6.4.0-RELEASE_wasm` exit 0 and "Test run with N tests". The id is `<swiftCompilerTag>_wasm` (`swiftc -print-target-info` prints `"swiftCompilerTag"`); the manifest side is a reading heuristic.
- Watched: **yes**. [BP] V17, V18; [RC] R8 (PureLib build exit 0; `swift test` no flag exit 1; `--disable-xctest` exit 0, `Test run with 1 test in 0 suites passed`).
- Binds: library and SDK that claim Wasm; the ocx SDK does not (subprocess).

**SW-REL-11 (MUST; Swift 6.4, SE-0509, default engine). The release SBOM is `swift build -c release --sbom-spec cyclonedx --sbom-output-dir DIR` run from a clean tree at the tag, published as `<tool>-<os>-<arch>.cdx.json`; never `swift package generate-sbom`, never the native engine, never a build from a dirty tree.** (RP-04)
- Why: `generate-sbom` and `--build-system native` omit build-time conditionals and warn so; Swift 6.3.3 has no flag (`error: Unknown option '--sbom-spec'`, exit 64); the component name is the checkout directory, its version the git tag verbatim, `unknown` without git, and `<tag>-modified` from a dirty tree; the file name carries a timestamp and re-runs never overwrite ([RP] §3). CycloneDX 1.7 and SPDX 3.0.1 are the newest minors only.
- Verify (a), output = violation: `grep -rn --include='*.sh' --include='*.yml' --include='*.yaml' --include='Makefile' --include='Dockerfile*' -e 'generate-sbom' .` and `grep -rn --include='*.sh' --include='*.yml' --include='*.yaml' --include='Makefile' --include='Dockerfile*' -e '--sbom-spec' . | grep -e 'build-system native'`. (b), output = SBOM that lacks the tag (also fires for a dirty tree): `TAG=$(git describe --tags --exact-match); (cd sboms && grep -L -F -e " : \"$TAG\"" ./*.json)`.
- Watched: **yes**. [RP] VR-5; [RC] R2 (`bad` prints `generate-sbom` and the native `--sbom-spec` line, `good` empty) and R7 (6.4.0 build exit 0, file names `...-sbom-v1.2.4-all-...json`, tag check empty; the first run from a tree with untracked files produced `v1.2.3-modified` and the check listed both files; 6.3.3 exit 64).
- Binds: CLI, server. SBOM consumer tool support not measured; SW-SEC-21 scans `*.cdx.json`.

**SW-REL-12 (MUST; 6.4.0 and 6.3.3, both engines). `--version` prints the tag minus `v`; the value comes from a build-tool plugin (`.buildCommand`, with `inputFiles` and `outputFiles`) or a generated file fed by a version file (`.tool-version` written by the release job) or `git describe --tags --always --dirty`; never an environment variable read inside a plugin, never a `.prebuildCommand` that runs a source-built tool, never a hardcoded default.** (RP-07)
- Why: Swift Build, the 6.4 default, does not pass the environment to plugin commands (`RELCLI_VERSION=9.9.9` printed `1.2.3-dirty` on Swift Build and `9.9.9` on native); a prebuild command cannot use executables built from source (`error: a prebuild command cannot use executables built from source`); a version file works on both engines; a `git describe` result is not an input, so an incremental build can keep a stale value and a release uses a clean scratch path ([RP] §5).
- Verify: `TAG=v1.2.3; swift run -c release --scratch-path "$SCRATCH" tool --version 2>/dev/null | grep -v -x -F -e "${TAG#v}"` (output = violation; `1.2.3-dirty`, `1.2.3-1-gSHA`, `0.0.0-unknown` all print).
- Watched: **yes**. [RP] VR-3 (tag checkout empty; dirty, untagged, no-git each print one line; identical on 6.3.3); [RC] R6 (env-reading tool: Swift Build `1.2.3-dirty`, native `9.9.9`, on 6.4.0 and 6.3.3; version file `7.7.7` on both engines).
- Binds: CLI, server. Corpus patterns: container's env → manifest `.define` is the C-target recipe B ([RP] §5); `sed` of a tracked template dirties the tree.

**SW-REL-13 (MUST; fleet pin, owner-overridable once per repo). CLI release assets are raw static binaries `<tool>-<os>-<arch>` (`linux-amd64`, `linux-arm64`) plus `checksums.txt` in `sha256sum` format; `sha256sum --check --strict` passes on the downloaded set. Tarballs `<tool>-<version>-<arch>-linux-musl.tar.gz` are the override and are built with `tar --sort=name --mtime=@EPOCH --owner=0 --group=0 --numeric-owner | gzip -n`.** (RP-08, RP-09)
- Why: one mirror and installer shape across the fleet (GO-REL-08); default `tar | gzip` embeds mtimes and changes the digest per run ([RP] §6). The Swift corpus ships archives (swiftly, SwiftFormat, SwiftLint), so this is a fleet decision, not an ecosystem convention.
- Verify: `for p in linux-amd64 linux-arm64; do ls dist | grep -c -x -e "tool-$p"; done` (a `0` = violation) and `(cd dist && sha256sum --check --strict checksums.txt)` exit 0.
- Watched: **yes**. [RP] VR-6 (`dist-good` prints `1`,`1`; `dist-bad` `1`,`0`; tampered asset exit 1, clean exit 0; deterministic tar identical across a `touch`, plain tar differs). darwin and windows rows: unverified: read only; linux-arm64 built with `aarch64-swift-linux-musl` is not run here.
- Binds: CLI.

**SW-REL-14 (SHOULD; 6.4.0 and 6.3.3). A CLI release can prove reproducibility by building twice from clean scratch directories at the same absolute source and scratch paths with the pinned toolchain and, for a static build, fixed SDK mtimes; the two binary digests are equal. SBOMs are compared only after normalising UUIDs and timestamps; image IDs are never compared.** (RP-05, RP-06)
- Why: identical with fixed paths (dynamic and static, both toolchains); different with another scratch path (807 bytes, embedded paths), another source path, or a re-installed static SDK (new file mtimes); `find <sdks> -exec touch -h -d @1700000000 {} +` after `swift sdk install` restores identity (three unfixed Docker builds gave three digests). No Swift primary source promises bit-for-bit reproducibility; the claim is the measurement ([RP] §4). SBOMs differ only in `serialNumber`, tool `bom-ref`, `timestamp` and the file-name timestamp.
- Verify: `sha256sum dist1/tool dist2/tool | cut -d' ' -f1 | uniq | awk 'END { if (NR != 1) print "NOT REPRODUCIBLE" }'` (output = violation); SBOM: pipe each file through `sed -E -e 's/urn:uuid:[0-9a-f-]{36}/urn:uuid:UUID/g' -e 's/[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:]{8}Z/TS/g' | sha256sum` and apply the same `uniq | awk`.
- Watched: **yes**. [RP] VR-1 (same path empty; scratch path, source path, re-installed SDK each print `NOT REPRODUCIBLE`; SDK `touch` step restores), VR-2 (SBOM pair). Not re-run here (build-heavy; the finding is the dive's).
- Binds: CLI; opt-in per release skill (Q-REL-4).

**SW-REL-15 (MUST when an image ships; 6.4.0 and 6.3.3). A static image is two-stage: a `swift:X.Y.Z` build stage with the Static SDK installed `--checksum`, then `FROM scratch`, `USER` non-root, exec-form `ENTRYPOINT`; the running image exits per SW-CLI-01 (0, 64 usage, 69 unavailable).** (RP-10)
- Why: 16.9 MB against 415 MB for the same app on `swift:6.4-slim` with a dynamic binary; no shell; the checksum is the only integrity gate on the SDK download. A `FROM scratch` image has no libc, CA bundle, `/tmp` or timezone data ([RP] §7); a CLI that opens TLS needs the CA bundle copied in, not run here.
- Verify, each output = violation: `grep -L -e '^USER ' Dockerfile`; `grep -L -e '^FROM scratch' Dockerfile`; SW-REL-02(a) on the Dockerfile; and `docker run --rm IMG --bogus` exits 64, `IMG --unreachable` 69.
- Watched: **yes**. [RP] VR-7 (`c-image/Dockerfile` empty on all three; `Dockerfile.nouser` and `Dockerfile.nosum` list themselves; exits 0/64/69 on 6.4.0 and 6.3.3). Not re-run here (60 s build).
- Binds: CLI or server whose owner asked for an image (go-release GO-REL-10: no image unless asked).

**SW-REL-16 (SHOULD; unverified: read only for the attestation itself). Release workflows run `actions/attest-build-provenance` with `subject-checksums: dist/checksums.txt`, declare `id-token: write` and `attestations: write`, fetch tags (`fetch-depth: 0`), and pin every `uses:` at a 40-hex SHA (SW-GATE-23); consumers verify with `gh attestation verify`.** (RP-11)
- Why: go-release GO-REL-11/12 shape; provenance keywords match 2 of 40 corpus repos and no step signs a Linux artifact ([pkg] Release engineering), so it is a differentiator, not a convention.
- Verify, each output = violation: `grep -L -e 'id-token: *write' .github/workflows/release.yml`; `grep -L -e 'subject-checksums: *dist/checksums.txt' .github/workflows/release.yml`; `grep -L -e 'fetch-depth: *0' .github/workflows/release.yml`; the SHA-pin check is SW-GATE-23's.
- Watched: **yes for the greps** ([RP] VR-8: `good` empty, `bad` three files and the unpinned `uses:` line); **no for whether the attestation verifies** (no GitHub run).
- Binds: CLI releases published by CI.

### D. Caught by git and SwiftPM resolution

**SW-REL-17 (MUST; 6.3.3 and 6.4.0). A manifest reachable from a release tag has no `.package(path:)`, `branch:` or `revision:` dependency.** (RP-12; SW-PKG-09 covers branch/revision/exact declarations, this adds `path:` and the consumer smoke test)
- Why: resolving a tagged library with any of them fails for every version consumer with exit 1: `required using a stable-version but 'lib' depends on an unstable-version package 'helper'`, even for a `path:` inside the same repository; a `branch:` consumer gets `depends on local package ... which is not supported` ([RP] §9). Merging the code as a second target of the same package builds (exit 0). A *root* consumer may depend on the library by `path:` for local development.
- Verify: `grep -rn --include='Package.swift' --include='Package@swift-*.swift' -e '\.package(path:' -e '\.package(name:[^)]*path:' -e 'branch:' -e 'revision:' .` (output = violation) and the publishability smoke test: `swift package resolve` in a throw-away consumer pinned by `file://` URL at the local tag exits 0.
- Watched: **yes**. [RP] VR-11 (`lib`, `libok`, `libbranch` print the line and their consumers exit 1; `libtwin` empty, consumer exit 0); [RC] R10 re-run of the grep (three lines, `libtwin` empty).
- Binds: library, SDK, any package consumed by version. The local `path:` idiom is for roots only (swift-package-manager@5546f44a3b52:Package.swift:1133,1152 switches `branch:` to `path:` behind `SWIFTCI_USE_LOCAL_DEPS`).

**SW-REL-18 (MUST; 6.3.3 and 6.4.0). Release tags are three-component SemVer (`X.Y.Z` or `X.Y.Z-pre.N`), one form per repository (bare or a single leading `v`; the fleet default is `v`), no one- or two-component tags, no word prefixes, and every tag is annotated.** (RP-13, RP-14)
- Why: SwiftPM resolves `1.3` as 1.3.0 although its docs say tags with fewer than three components are not versions; `release-1.4.0` is silently ignored; when both `v1.0.0` and `1.0.0` exist the bare tag wins (`SourceControlPackageContainer.swift:138-147`); a lightweight tag is invisible to `git describe` without `--tags` and carries no tagger or date ([RP] §8).
- Verify, each output = violation: `git tag -l | grep -v -x -E 'v?[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?'`; `git tag -l | awk '/^v[0-9]/{v=1} /^[0-9]/{b=1} END{if(v&&b)print "MIXED v/bare tags"}'`; `git for-each-ref --format='%(objecttype) %(refname:short)' refs/tags | grep -v -e '^tag '`.
- Watched: **yes**. [RP] VR-12; [RC] R3: `bad` prints `1.3`, `release-1.4.0`, `MIXED v/bare tags`, `commit 1.5.0`; `goodv` and `goodbare` print nothing.
- Binds: library, SDK, CLI. Tag style across the 40 corpus repos is unmeasured (depth-1 clones carry no tag list).

**SW-REL-19 (MUST NOT; measured 6.4.0). Never move, re-create or delete a pushed release tag; before pushing, the tag must not exist on the remote. A bad release is followed by the next patch.** (RP-15)
- Why: after `git tag -f` a consumer with `Package.resolved` keeps the old revision (exit 0, no message) while a fresh consumer gets the new one, both labelled `1.2.0`; SwiftPM has no `retract` ([RP] §8). Registries have an unpublish endpoint, not used in the corpus (unverified).
- Verify: `git ls-remote --exit-code --tags origin "refs/tags/$TAG"` must exit 2 before the push (exit 0 = the tag exists = violation).
- Watched: **yes**. [RP] VR-12 (existing tag exit 0, absent tag exit 2).
- Binds: library, SDK, CLI.

**SW-REL-20 (MUST for a library or SDK with tagged releases; 6.3.3 and 6.4.0). Before tagging, `swift package diagnose-api-breaking-changes "$LAST_RELEASE_TAG"` exits 0 from a checkout that has the tags (`fetch-depth: 0`, `fetch-tags: true`) and the bump size agrees with the report; the baseline of a release is the previous release tag, not the pull request's base branch.** (RP-17; gate itself is SW-GATE-20, enum rules SW-API-11)
- Why: `swiftlang/github-workflows@0.0.15` defaults the baseline to `${GITHUB_BASE_REF}` (soundness.yml:161-164), which on a non-PR event is empty and on a PR only proves "no new break against main". Exit 1 has two meanings: `1 breaking change detected` and `error: Couldn't get revision` (missing tag or shallow clone) ([RP] §10).
- Verify: the command exits 0; on exit 1, `... 2>&1 | grep -e 'breaking change' -e 'Couldn.t get revision'` tells the cases apart. A first plant that does not compile produces no report: build first.
- Watched: **yes**. [RP] VR-10: removed `shout` exit 1, re-typed parameter exit 1, additive exit 0, missing tag exit 1 with `Couldn’t get revision`, stale `--baseline-dir` still correct; 6.4.0 and 6.3.3 agree.
- Binds: library, SDK.

**SW-REL-21 (SHOULD; 6.4.0). A library at 0.x tells consumers how to depend (`.upToNextMinor(from:)` in the README snippet) or moves to 1.0 before it has users who run `from:`; a breaking change is never released as a patch.** (RP-16)
- Why: `from: "0.1.0"` resolved 0.3.0 across two breaking minors; SwiftPM gives 0.x no special treatment; `.upToNextMinor(from: "0.1.0")` resolved 0.1.0 ([RP] §8, VR-13). The Python SDK states "Pre-1.0. Breaking changes ship without migration shims" ([cfg] §4).
- Verify: reading heuristic: `git tag -l | grep -e '^v\?0\.'` then read the README dependency snippet. The resolution behaviour itself was run; the README check was not.
- Watched: **yes for the resolution behaviour** ([RP] VR-13), **no for the README check**.
- Binds: library, SDK.

### E. Caught by reading a build log

**SW-REL-22 (CONSIDER; SwiftPM 6.4.0 prebuilts default on, Swift 6.3.3 has no manifest). A package that builds macros takes swift-syntax at a released tag on a CI toolchain that has a published prebuilt manifest, never an `exact:` prerelease tag; CI greps the build log for "Prebuilt artifact".** (BP-14; the declaration policy is SW-PKG-10)
- Why: prebuilts are keyed by the resolved tag and `swift-X.Y.Z-RELEASE` plus platform; `exact: "604.0.0-prerelease-2026-09-15"` got a 404 and built from source (73 s vs 16 s with `-j 2`); Ubuntu 26.04 and Swift 6.3.3 have none ([BP] §8). A build-time cost on small runners, not a correctness issue.
- Verify: `swift build -v 2>&1 | tee build.log; grep -L -e 'Prebuilt artifact' build.log` (output = no prebuilt downloaded); `grep -rn --include='Package.swift' --include='Package@swift-*.swift' -e 'swift-syntax.*exact' .` (output = violation; leaf executables are exempt by SW-PKG-10).
- Watched: **yes**. [BP] V19 (log check prints the logs of `exact`, 26.04 and 6.3.3; empty for `from:` on noble).
- Binds: macro and plugin packages and their consumers. SwiftLint pins `exact: "605.0.0-prerelease-2026-09-15"` (SwiftLint@ec4691d9e813:Package.swift:39).

### Skill step order (input for `swift-release`, not rules)

[RP] §11 gives the go-release-shaped outline. Merged order: (1) pin and gate at the exact commit: SW-REL-01, SW-GATE-01, SW-PKG-26/28/29; library: SW-REL-17, -18, -20. (2) CLI: stamp (SW-REL-12), install the pinned SDK (SW-REL-02), build static (SW-REL-05), locate (SW-REL-04), `file` gate (SW-REL-05), smoke run (SW-REL-07), strip and keep the twin (SW-REL-08), SBOM (SW-REL-11), assets and checksums (SW-REL-13); optional repro (SW-REL-14) and image (SW-REL-15); glibc fallback only by SW-REL-06. (3) `git ls-remote` exit 2 (SW-REL-19), push the tag, CI attests (SW-REL-16), verify the published assets (`sha256sum --check --strict`, `gh attestation verify`, `docker run` the published digest). A release that went out wrong is never repaired by moving the tag.

### Re-runs made for this consolidation

Every command ran on 2026-10-10; fixtures under `/home/mherwig/.cache/research-lang/swift-tools/fixtures/release/`; builds used `--scratch-path "$SWIFT_SCRATCH/release-consolidation/..."`; image `swift:6.4` (Swift 6.4.0) unless stated; `SWIFT_VERSION=6.3` is Swift 6.3.3.

| # | Settles | Command (shape) | Result |
|---|---|---|---|
| R1 | conflict 2, SW-REL-08 | `crashy/build.sh` builds `crashy` for `--swift-sdk x86_64-swift-linux-musl` twice (plain, and `-Xlinker -s`); `SWIFT_BACKTRACE=enable=yes,interactive=no,color=no,swift-backtrace=<SDK>/usr/libexec/swift/linux-static/swift-backtrace-static ./crashy-$v trap`; `crashy/addr.sh` | both: exit 132, 47 stderr lines, frame `0 0x000000000041c899 <unknown> in crashy-<v>`; default env (no helper): exit 132, 0 lines; sizes 39,065,800 (plain) vs 7,015,792 (`-Xlinker -s`); `addr2line -f -C -e crashy-unstripped 0x41c899` = `$s6crashy7explodeyS2iF`, on `crashy-stripped` = `??`; `nm crashy-stripped` = `no symbols` |
| R2 | conflicts 1, 9; SW-REL-02, -03, -11 | `greps/check.sh bad` and `good` (consolidated greps of SW-REL-02(a)(b), -03, -11(a)) and the old RP-04(a) grep on `good` | `bad`: checksum-less `swift sdk install` line, 6.3.3 URL under a 6.4.0 pin, `generate-sbom` and `--sbom-spec ... --build-system native` lines, bare `--static-swift-stdlib` line; `good` (backslash-continued `--checksum`, native fallback line): all empty. Old RP-04(a) grep on `good`: prints the permitted `--static-swift-stdlib --build-system native` line (false positive) |
| R3 | SW-REL-18 | `tags/mk.sh` then `tags/check.sh bad|goodv|goodbare` | `bad`: `1.3`, `release-1.4.0`, `MIXED v/bare tags`, `commit 1.5.0`; `goodv`, `goodbare`: empty |
| R4 | conflict 3, SW-REL-06 | floor pipeline on `essentials` builds from the dive (`c-res`, `c-noble`, `c-jammy`, `c-al23`); `floor.sh 2.34` in `swift:6.4` and `swift:6.4-amazonlinux2023` | static-stdlib native builds: highest 2.43, 2.38, 2.35, 2.34; default-engine dynamic executables: 2.34 in all four; `libswiftCore.so`: `GLIBC_2.38`, `GLIBC_2.43` on `swift:6.4`, empty on AL2023 (rc 0) |
| R5 | SW-REL-09 | `crashy/deep.sh` (recursion depth 1000 in a `Task`) | glibc host build: prints 124948, rc 0; musl static: `Segmentation fault`, rc 139 |
| R6 | conflict 10, SW-REL-12 | `stamp/engines2.sh` with an env-reading StampTool (6.4.0 and 6.3.3); `stamp/engines.sh` with the final tool | `RELCLI_VERSION=9.9.9`: swiftbuild `1.2.3-dirty`, native `9.9.9` (both toolchains); final tool (file/git only): `1.2.3` for the env run, `7.7.7` for the version file on both engines |
| R7 | SW-REL-11 | `sbom/sbom.sh` (`swift build -c release --sbom-spec cyclonedx --sbom-spec spdx --sbom-output-dir sboms-$$ --scratch-path ...`, then the tag check) | 6.4.0: rc 0, `cyclonedx1-1.7-sbom-v1.2.4-all-<ts>.json` and `spdx3-3.0.1-...json`, tag check empty; from a tree with untracked files the names were `...-sbom-v1.2.3-modified-all-...` and the check listed both; 6.3.3: rc 64 `error: Unknown option '--sbom-spec'` |
| R8 | SW-REL-10 | `puretest/wasm.sh` with `swift-6.4.0-RELEASE_wasm` | `build --target PureLib` rc 0; `swift test` (no flag) rc 1; `swift test --disable-xctest` rc 0, `Test run with 1 test in 0 suites passed` |
| R9 | SW-REL-07 | `check-dirfsync.sh <static relcli> naive|durable <dir>` (strace in `swift:6.4`) | naive: `VIOLATION: no fsync of directory ...` with `fsync(3<...>) = 0`, `rename(...) = 0`; durable: `binary rc=0 (durable ok)`, `PASS: directory fsync present` (script contract exit 1 / 0; the shell exit code was not captured in this run, [BP] V3 recorded it) |
| R10 | SW-REL-01, -04, -17 | the greps above over the dive fixtures `g-pin/{good,bad,missing}`, `pathcheck/{bad,good}`, `d-pathdep/{lib,libok,libbranch,libtwin}` | pin: `good` empty, `bad` `.swift-version` plus `container: swift:6.3` and `FROM swift:latest`, `missing` rc 2; path: `bad` six lines, `good` empty; purity: three lines, `libtwin` empty |
| R11 | SW-REL-01(c) | `swift --version` in `swift:6.4` and `swift:6.3` | `Swift version 6.4 (swift-6.4-RELEASE)`; `Swift version 6.3.3 (swift-6.3.3-RELEASE)` |
| R12 | SW-REL-05 | `file <bin> \| grep -v -e 'statically linked'` | dynamic `essentials` (`c-noble/out/Products/Release-linux-x86_64`): prints the `ELF 64-bit LSB pie executable` line; stripped musl `crashy-stripped`: empty |
| R13 | conflict 6 | `git -C <repo> tag -l \| sort -V \| tail` | ocx-sdk-python: `v0.1.0`, `v0.2.0`; ocx: `v0.6.2`..`v0.6.5`; grimoire: `v0.14.1`..`v0.14.3` (and a `v99.0.0` tag) |

## Applied to the exemplars and the future consumers

**Satisfied by the strict exemplars.**
- SW-REL-01: containerization derives its CI image from the exact pin: containerization@3e7bc39e66b3:.swift-version (`6.3.0`) and `.github/workflows/linux-build.yml:21-36` (`swift:$(cat .swift-version)-noble`); swiftly@c8cf2e35bfca and swift-package-manager@5546f44a3b52 pin `6.4.0`; swift-build@2187330e13e7 pins `6.2.0` ([RP] §2).
- SW-REL-02, -05: SwiftLint pins `swift_version` and `swift_sdk_checksum` per matrix leg and installs with `--checksum` (SwiftLint@ec4691d9e813:.github/workflows/release.yml:130-142,151); swiftly verifies the SDK sha256 before extracting (swiftly@c8cf2e35bfca:Tools/build-swiftly-release/BuildSwiftlyRelease.swift:226-228); containerization pins URL and checksum (containerization@3e7bc39e66b3:vminitd/Makefile:50-52) and builds with `--swift-sdk x86_64-swift-linux-musl` (`scripts/build-dist-x86_64.sh:154-162`, `vminitd/Makefile:38,41`); swift-nio's reusable `static_sdk.yml:15-16` defaults to the triple ([BP] Exemplar evidence).
- SW-REL-04: containerization (`scripts/build-dist-x86_64.sh:162`, `vminitd/Makefile:59`) and aws-lambda-runtime (`StaticLinuxSDKBuildBackend.swift:67-90`, which calls `--show-bin-path` with the same `--swift-sdk` and `--scratch-path` as the SDK preflight).
- SW-REL-08, -09: aws-lambda-runtime strips with `-Xlinker -s` (`StaticLinuxSDKBuildBackend.swift:98-100`); SwiftLint's static build raises the stack to 512 KiB, swaps in mimalloc and compiles out SourceKit (`release.yml:166-176`).
- SW-REL-12: apple/container stamps `git describe` through the environment into a manifest `.define` read by a C target (container@f70ecbb926d9:Makefile:26, Package.swift:23-24,616-617), the recipe-B shape.
- SW-REL-10: swift-nio selects Wasm and Android ids from `swift sdk list` (swift-nio@e12881f2a691:scripts/swift-build-with-wasm-sdk.sh:28-34); JavaScriptKit builds with `--swift-sdk` (JavaScriptKit@c68ee9bdebfa:Examples/Basic/build.sh:3).

**Violated by prominent exemplars.**
- SW-REL-04: 15 of 40 repos hardcode a build path in a script, workflow, Makefile or Dockerfile: `SwiftLint@ec4691d9e813:.github/workflows/release.yml:120,147`; `swiftly@c8cf2e35bfca:Tools/build-swiftly-release/BuildSwiftlyRelease.swift:285,299,321,330` and `.github/workflows/pull_request.yml:93,100,119,126`; `swift-container-plugin@a9646b8d4dca:scripts/test-containertool-elf-detection.sh:43-47,60-63` (builds with `--swift-sdk x86_64-swift-linux-musl`, then reads `.build/x86_64-swift-linux-musl/debug/hello`, a path that does not exist under the 6.4 default engine); `swift-aws-lambda-runtime@8abd464310c7:.github/workflows/scripts/check-link-foundation.sh:19` (`OUTPUT_DIR=.build/release`); `containerization@3e7bc39e66b3:examples/ctr-example/Makefile:28-29,41`; SwiftFormat's Windows job (`SwiftFormat@fbc07aca5373:.github/workflows/windows_release.yml:52`, unverified). Several pin an older toolchain (SwiftLint 6.3.2), so they break on the bump to 6.4.
- SW-REL-01: `swiftlang/github-workflows@0.0.15` defaults the API-breakage and docs jobs to `swift:6.3-noble` (soundness.yml:21,29), used by 22 of 40 repos ([RP] §2, [pkg] Headline 7).
- SW-REL-02: tuist pins Swift 6.2.3 and SDK bundle `static-linux-0.0.1` while 6.4.0 publishes `static-linux-0.1.0` (tuist@2f6ac74754bf:mise/tasks/cli/bundle-linux.sh:25-26); aws-lambda-runtime's docs example installs a `6.4.x-DEVELOPMENT-SNAPSHOT-2026-05-31-a` SDK (using-the-spm-plugins.md:158-162), valid only with a matching snapshot toolchain.
- SW-REL-03: swift-dependencies runs `swift build -c release --static-swift-stdlib` in Docker (swift-dependencies@b476cc576105:Makefile:38-39,65,70; a dependency-free library, so no Foundation symbol is probably reachable, unmeasured); aws-lambda-runtime's native-engine workaround (pull_request.yml:36-42) is labelled but looks stale on 6.4.0 ([BP] V20).
- SW-REL-06: no corpus repository runs a glibc floor check (`grep GLIBC_` finds only containerization's troubleshooting entry, `docs/x86_64-build.md:224`, and one SwiftPM test fixture); swiftly builds its glibc side in `redhat/ubi9` (2.34) by habit (swiftly@c8cf2e35bfca:.github/workflows/build_release.yml:20-26).
- SW-REL-12: swiftly hardcodes `suffix: "dev"` (swiftly@c8cf2e35bfca:Sources/SwiftlyCore/SwiftlyCore.swift:5), so source builds always report `-dev`; SwiftLint and SwiftFormat `sed` a tracked template in the release job, dirtying the tree (SwiftLint@ec4691d9e813:.github/workflows/release.yml:51-55; SwiftFormat@fbc07aca5373:.github/workflows/release.yml:12-13).
- SW-REL-10: swift-testing@c7d68ca20cd7:Documentation/WASI.md:20-26 documents `swift test --swift-sdk` without `--disable-xctest`; it exited 1 here on 6.4.0 and 6.3.3.
- SW-REL-11: 39 of 40 repos publish no SBOM (hummingbird has a generator workflow); no corpus repository uses the 6.4 flag.
- SW-REL-20: the shared `soundness.yml` baseline is the PR base (`:161-164`); 15 of 40 repos run the gate effectively, protobuf and hummingbird inline (swift-protobuf@6c84c3dedac0:.github/workflows/build.yml:121, hummingbird@1bd3b407fb47:.github/workflows/api-breakage.yml:28).
- SW-REL-22: SwiftLint's `exact:` prerelease swift-syntax pin (SwiftLint@ec4691d9e813:Package.swift:39) is a leaf executable, exempt from SW-PKG-10 but costs a from-source swift-syntax build.

**New commitments.**
- **Swift SDK wrapping the ocx CLI** (mirrors `/home/mherwig/dev/ocx-sdk-python`, a library, no binary): SW-REL-01; SW-REL-17 (no `path:` in the tagged manifest, even while developing against a sibling checkout); SW-REL-18 with `v` tags like `v0.1.0`, `v0.2.0` of the Python SDK ([RC] R13); SW-REL-19; SW-REL-20 against the last tag; SW-REL-21, because the SDK starts at 0.x (document `.upToNextMinor(from:)`). Wasm is not claimed (swift-subprocess does not build for WASI), so SW-REL-10 stays dormant. The SDK needs no static binary; its tests that spawn `ocx` run on the Linux legs (SW-GATE-25).
- **Swift CLIs in the ocx and grimoire mould:** the full CLI path SW-REL-02 to -09, -11 to -13, with `vX.Y.Z` tags and per-arch static binaries named like the Rust releases; the exit codes of an image come from SW-CLI-01; durable writes are verified on the static binary (SW-REL-07, SW-IO-18); an OCI registry client must still cover TLS trust in `FROM scratch` (open question 1).
- **OCI tooling in the apple/containerization mould:** containerization is the in-corpus reference for the pin, the SDK checksum, `--show-bin-path`, and the glibc-baseline troubleshooting entry; it lacks only the floor check and the smoke run.

## AI-agent failure modes

Ranked by how often an agent is expected to hit them (the first four are the most plausible from training-data recipes; ranks 5 to 15 follow the dives' tables). Each has its mechanical check.

| # | Failure | Check |
|---|---|---|
| 1 | Writes `swift build -c release --static-swift-stdlib` as "the static build" (the pre-6.4 Docker/Vapor recipe); links on a stdlib-only toy, fails once a Foundation symbol is used | SW-REL-03 grep; a `JSONEncoder` probe on the pinned toolchain |
| 2 | Copies `.build/release/<tool>` or `.build/x86_64-swift-linux-musl/release/<tool>` (swift.org's own example path) into a Dockerfile, Makefile or workflow; or runs `--show-bin-path` without the build's `--swift-sdk` and ships the host binary | SW-REL-04 grep; SW-REL-05 `file ... \| grep -v -e 'statically linked'` |
| 3 | `.swift-version` as `6.4` or `latest`, `FROM swift:latest`, "fixes" the pin to `6.4` because `swift --version` prints it | SW-REL-01 (a)(b)(c) |
| 4 | `FROM swift:6.4` build stage plus `FROM ubuntu:22.04` runtime for a dynamic binary; declares the floor from `objdump -T` of a dynamic executable | SW-REL-06 on the right object; run the artifact in the oldest target image |
| 5 | Stamps with `VERSION=... swift build` read inside a plugin, hardcodes `let version = "1.0.0"`, or uses `.prebuildCommand` with a source-built tool | SW-REL-12 `--version \| grep -v -x -F` |
| 6 | Tags `v1.2`, `1.2`, `release-1.2.0`, a lightweight tag, or `git tag -f` / force-pushes to "fix the release" | SW-REL-18 and -19 checks |
| 7 | Adds `.package(path: "../Shared")` or `branch: "main"` to a library "temporarily" and tags it | SW-REL-17 grep and the `file://` consumer smoke test |
| 8 | Passes the bundle id from `swift sdk list` to `--swift-sdk`; installs the SDK without `--checksum`, or one from another release than the toolchain | SW-REL-02(a)(b), SW-REL-05 selector grep |
| 9 | Treats `swift package generate-sbom` as the release SBOM, invents `swift build --sbom`, `--reproducible`, `swift package release`, or gates on SBOM sha256 | SW-REL-11 greps; `swift build --help \| grep -e sbom`; SW-REL-14 normalised compare |
| 10 | Writes `#if canImport(Glibc)` only (SW-LANG-02); recurses deeply in a `Task` or calls `dlopen` on the static leg | SW-LANG-02 grep and the static-leg build; SW-REL-09 depth probe |
| 11 | Runs `swift test --swift-sdk <wasm>` (exit 1) or adds swift-subprocess to a package that claims Wasm | SW-REL-10 |
| 12 | Strips the binary and loses all crash evidence, or refuses to strip and ships a 138 MB file | SW-REL-08 twin and size budget |
| 13 | Runs the API gate against `main` or the PR base and calls it a release check; reads exit 1 on a shallow clone as "API broke" | SW-REL-20 grep for the two message forms |
| 14 | Ports cargo or Go ideas: `--locked` (exit 64), a `retract` stanza, "yank", `cargo publish` for a package | `swift package resolve --help`; SW-PKG-28 names `--force-resolved-versions` |
| 15 | Releases 0.x with a breaking minor and a `from:` README snippet; believes the docs that two-component tags are not versions | SW-REL-21; SW-REL-18 grep |

## Open questions

| # | Question | Default the program applies |
|---|---|---|
| Q-REL-1 | Pin the fleet asset shape (raw `<tool>-<os>-<arch>` + `checksums.txt`, tags `vX.Y.Z`) for Swift CLIs as go-release did, although the Swift corpus ships archives? | Yes, as a pinned default overridable once per repo (SW-REL-13, -18). |
| Q-REL-2 | Strip by default and ship an unstripped twin, against go-release's "do not strip" (GO-REL-05, CONSIDER)? | Yes: strip, keep the twin as a CI artifact (SW-REL-08). |
| Q-REL-3 | Windows host verification (owner Q7): may a research dive build and run a Windows release on the WSL Windows host via `cmd.exe`? | No: Windows stays "unverified: read only"; no Windows MUST in SW-REL. |
| Q-REL-4 | Is the double-build reproducibility step default or opt-in in the `swift-release` skill? | Opt-in (SW-REL-14 is SHOULD; it needs fixed paths, a fixed SDK mtime and a second build). |
| Q-REL-5 | Publish SPDX 3.0.1 next to CycloneDX 1.7 as go-release publishes SPDX? | CycloneDX 1.7 only; SPDX on request. SW-SEC-21 scans `*.cdx.json`. |
| Q-REL-6 | macOS (universal binaries, notarization), Android and Embedded releases: in scope? | Out of scope; the rules say nothing about them. |
| Q-REL-7 | linux-arm64 (`aarch64-swift-linux-musl`) is published from the same recipe but never built here. Ship without a run? | Ship; mark the asset unverified until an arm64 runner or qemu run exists. |

**Subareas that deserve ANOTHER research round**
1. **TLS trust store of a static musl binary in `FROM scratch`.** Where do `URLSession` (FoundationNetworking), AsyncHTTPClient and swift-nio-ssl look for CA certificates in a static musl binary, what is the failure text when `/etc/ssl/certs` is absent, and what must the image copy? Not covered by SW-NET or SW-SEC (no hit for `ca-certificates`); decisive for a Swift registry client shipped as a scratch image.
2. **Windows release builds** (needs a Q7 grant or CI evidence). Does Swift Build 6.4 keep `.build\<triple>\release` on Windows, what does `--show-bin-path` print, and does a Windows static-stdlib release link under the default engine (two corpus workflows rely on `WindowsExperimental.sdk` and a snapshot toolchain)?
3. **GitHub-hosted legs.** Does `actions/attest-build-provenance` with `subject-checksums` verify with `gh attestation verify` for a Swift release, and does the `swiftlang/github-workflows` API-breakage job accept a tag as baseline? Needs an Actions runner.
4. **Re-test `--static-swift-stdlib` when 6.4.1 or a later tag lands** (swift-build#1763 backports) and re-run the aws-lambda-runtime workaround case; SW-REL-03's removal condition depends on it.
5. **arm64 static builds and macOS** (universal binaries, `lipo`, notarization, M-N-09): unresearched P3 rows; also `swift package compute-checksum` for artifact bundles consumed by `binaryTarget` (M-L-17).

## Sub-artifacts

- [swift-release/binaries-and-platforms.md](swift-release/binaries-and-platforms.md): static Linux SDK recipe and pins, the `--static-swift-stdlib` failure and its fix status, `--show-bin-path` and the `release` symlink, the glibc floor by image, musl runtime limits (subprocess, durable helper, `dlopen`, stack), sizes, swift-syntax prebuilts, Wasm builds and tests, a read-only Windows section; rules BP-01..BP-17, runs V1..V21.
- [swift-release/release-pipeline.md](swift-release/release-pipeline.md): `.swift-version` and image-tag pin, SwiftPM SBOM output, reproducibility measurements, version stamping recipes, asset set and checksums, `FROM scratch` image, library tags and SemVer as SwiftPM reads them, `path:` dependencies (M-L-20), API-breakage baseline, the `swift-release` skill outline; rules RP-01..RP-18, runs VR-1..VR-13.

## Key sources

1. https://www.swift.org/documentation/articles/static-linux-getting-started.html (Static Linux SDK guide: no `dlopen`, exact toolchain match, `--checksum`)
2. https://www.swift.org/api/v1/install/releases.json (per-release static SDK checksums and platform list)
3. https://github.com/swiftlang/swift-build/issues/1764 (`--static-swift-stdlib` fails on the `Ld` step; native twin)
4. https://github.com/swiftlang/swift-build/pull/1763 (the fix, merged 2026-09-22, backports #1770 to #1772)
5. https://github.com/swiftlang/swift-package-manager/blob/main/Sources/PackageManagerDocs/Documentation.docc/ReleaseNotes/6.4.md (Swift Build default, `--show-bin-path`, stricter static-stdlib)
6. https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0509-swift-sboms-via-swiftpm.md (SE-0509: CycloneDX 1.7, SPDX 3.0.1, newest-minor-only)
7. https://raw.githubusercontent.com/swiftlang/swift-package-manager/main/Sources/PackageManagerDocs/Documentation.docc/GeneratingSBOMs.md (flags, output path, engine accuracy statement)
8. https://github.com/swiftlang/swift-evolution/blob/main/proposals/0387-cross-compilation-destinations.md (SE-0387: `--swift-sdk` id and triple selection)
9. https://www.swift.org/documentation/articles/wasm-getting-started.html (Wasm SDK ids, Embedded id, Windows hosts unsupported)
10. https://raw.githubusercontent.com/swiftlang/swift-package-manager/main/Sources/PackageManagerDocs/Documentation.docc/Package/PackageDiagnoseAPIBreakingChange.md (`diagnose-api-breaking-changes` options and treeish baseline)
11. https://raw.githubusercontent.com/swiftlang/swift-package-manager/main/Sources/PackageManagerDocs/Documentation.docc/Dependencies/AddingDependencies.md (tags as SemVer, local dependencies; the docs the behaviour contradicts)
12. https://www.swift.org/sswg/incubation-process.html (SSWG tagging and maturity bar)
13. https://github.com/swiftlang/swift-subprocess/blob/main/README.md (platform table: Static Linux SDK "Build only", no Wasm)
14. https://github.com/swiftlang/swift-package-manager/issues/10237 (duplicate libc++abi symbols with two BoringSSLs under Swift Build; the aws-lambda-runtime workaround)
15. https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations (`id-token`, `attestations`, `gh attestation verify`; not run here)
