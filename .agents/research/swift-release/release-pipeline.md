---
title: "Swift release pipeline: toolchain pin, artifacts, SBOM, stamping, images, library tags"
topic: release/release-pipeline (SW-REL), wave 3 dive W3-7, rows M-N-05..M-N-08, M-N-14, M-N-15, M-P-03, M-L-20
agent: W3-7 release-pipeline
model: sonnet
date_researched: 2026-10-10
sources_count: 24
fixtures: /home/mherwig/.cache/research-lang/swift-tools/fixtures/release-pipeline/
scope: >
  Covers the exact-patch toolchain pin (.swift-version, image tags), the release artifact set and checksums, SwiftPM's SBOM output (measured), version
  stamping, double-build reproducibility, a static `FROM scratch` image, library tagging and SemVer behaviour in SwiftPM, the local `path:` dependency answer (M-L-20), the API-breakage baseline, and the outline of the `swift-release` skill.
  Not covered: the static-SDK link recipe, glibc floor and `--show-bin-path` rule (sibling binaries-and-platforms, M-N-02..04), Windows, macOS notarisation or universal binaries,
  Wasm/Android/Embedded, Bazel. Linux only (swift:6.4 = 6.4.0 and swift:6.3 = 6.3.3 images); every Apple or Windows or GitHub-hosted claim is marked "unverified: read only" (owner Q7).
---

# Swift release pipeline (SW-REL), Swift 6.4 era, 2026-10-10

Rule IDs below are local (`SW-REL-RP-NN`, "release-pipeline"); the consolidation renumbers them. Fixture paths are relative to
`/home/mherwig/.cache/research-lang/swift-tools/fixtures/release-pipeline/` (written `FX/`). Scripts that ran inside the toolchain image live in `FX/scripts/`.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The shape to mirror (go-release) and what Swift changes](#1-the-shape-to-mirror-go-release-and-what-swift-changes)
   2. [Toolchain pin: `.swift-version`, image tags, the compiler's own spelling](#2-toolchain-pin-swift-version-image-tags-the-compilers-own-spelling)
   3. [SBOM: flags, output path, naming, content, non-determinism](#3-sbom-flags-output-path-naming-content-non-determinism)
   4. [Reproducibility: what makes two clean builds byte-identical](#4-reproducibility-what-makes-two-clean-builds-byte-identical)
   5. [Stamping the version](#5-stamping-the-version)
   6. [Artifact set, naming, checksums, provenance](#6-artifact-set-naming-checksums-provenance)
   7. [Images: two-stage static `FROM scratch`](#7-images-two-stage-static-from-scratch)
   8. [Library tagging and SemVer as SwiftPM reads it](#8-library-tagging-and-semver-as-swiftpm-reads-it)
   9. [Local `path:` dependencies (M-L-20)](#9-local-path-dependencies-m-l-20)
   10. [API-breakage baseline](#10-api-breakage-baseline)
   11. [The `swift-release` skill outline (M-P-03)](#11-the-swift-release-skill-outline-m-p-03)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- **Pin the toolchain to an exact patch, in one file.** `.swift-version` holds `X.Y.Z` (for example `6.4.0`); every `FROM swift:` and CI `container:` line is the literal tag `swift:X.Y.Z[-variant]`. A moving tag floats: `swift:6.3` resolved to 6.3.3 during this research.
- **The compiler spells `X.Y.0` as `X.Y`.** `swift --version` on the 6.4.0 image prints `Swift version 6.4 (swift-6.4-RELEASE)`; a pin check must drop a trailing `.0` before comparing (SW-REL-RP-03).
- **SBOM = `swift build --sbom-spec cyclonedx --sbom-output-dir sboms`, Swift 6.4 or newer, default Swift Build engine.** Swift 6.3.3 exits 64 with `Unknown option '--sbom-spec'`. `swift package generate-sbom` and `--build-system native` both print an accuracy warning; do not use them for a release.
- **An SBOM is never byte-reproducible and must not be gated on bytes.** Two builds differ only in the CycloneDX `serialNumber`, the tool `bom-ref` UUID, the timestamp, and the timestamp inside the file name; after normalising UUIDs and timestamps the files are identical (measured).
- **The SBOM's component name is the checkout directory, not the manifest `name`, and its version is the git tag verbatim** (`v1.2.3`, or `unknown` with no git). Name the release asset yourself; check the tag appears in it.
- **Two clean builds are byte-identical only under fixed paths.** Same absolute source path, same scratch path, same toolchain: identical, 6.4.0 and 6.3.3, dynamic and static. A different scratch path or source path changes about 800 bytes (embedded paths, `.swift_modhash`, build-id).
- **A static-SDK build is reproducible only if the SDK's file mtimes are fixed.** Re-installing the Static Linux SDK changes the output; `find <sdks> -exec touch -h -d @<epoch> {} +` after `swift sdk install` makes two `--no-cache` Docker builds byte-identical (measured, stripped binary, 3 unfixed builds gave 3 digests).
- **Stamp the version from the tag with a build-tool plugin or generated file, never with an environment variable read by a plugin.** Swift Build (the 6.4 default) does not pass the environment to plugin commands; the native engine does. A `.relcli-version` file plus `git describe --tags` works on both engines (measured). A manifest `Context.environment` into a C `define` also works on both.
- **A prebuild plugin cannot run an executable built from source** (`error: a prebuild command cannot use executables built from source`); use `.buildCommand` with an input file.
- **Fleet-compatible CLI release assets are raw static binaries `<tool>-<os>-<arch>` plus `checksums.txt` (sha256sum format), the go-release shape; tarballs are the override.** A deterministic tar needs `--sort=name --mtime --owner=0 --group=0 --numeric-owner` and `gzip -n` (measured identical, default tar differs).
- **A static image is two stages: `swift:X.Y.Z` builds with the Static Linux SDK (`swift sdk install URL --checksum SUM`), `FROM scratch` runs.** Stripped binary 11.5 MB, image 16.9 MB reported by Docker, versus 415 MB for the same app on `swift:6.4-slim` with a dynamic binary. The image exits 0, 64, 69 per SW-CLI-01 and is non-root.
- **Library tags are bare three-component SemVer, annotated, and immutable.** SwiftPM reads `1.3` as `1.3.0` (docs say it should not), ignores `release-1.4.0`, and a force-moved tag silently splits fresh consumers (new revision) from locked ones (old revision), both printing `1.2.0`.
- **`from: "0.1.0"` resolves 0.3.0.** SwiftPM gives 0.x no special treatment: any 0.x minor reaches `from:` consumers, so a 0.x library either reaches 1.0 or documents `.upToNextMinor`.
- **A tagged library must not carry `path:` (M-L-20: yes it blocks), `branch:` or `revision:` dependencies.** Resolution fails with exit 1 and `required using a stable-version but 'lib' depends on an unstable-version package 'helper'`, even for a `path:` inside the same repository. A `branch:` consumer gets `depends on local package ... which is not supported`.
- **`diagnose-api-breaking-changes <last release tag>` exits 1 on a removed or re-typed public symbol and 0 on an additive change** (6.4.0 and 6.3.3). Exit 1 also means "baseline tag not found" (shallow or tagless clone); tell them apart by the output text. The shared `swiftlang/github-workflows` job defaults the baseline to the PR base branch, not the last tag.
- **A release is verified from the published assets, not the build tree**: `sha256sum --check --strict`, `gh attestation verify` (unverified: read only), and `docker run` exit codes for an image.

## Findings

### 1. The shape to mirror (go-release) and what Swift changes

The go-release skill (`/home/mherwig/dev/grimoire-lore/.agents/worktrees/swift/skills/go-release/SKILL.md`) is a gate-ordered runbook: a permanence preface, a scope table, a "pinned defaults" table, eleven numbered steps that all exist to fail before the tag is pushed, a MUST-rows list and a "what agents get wrong" list. Its asset shape (GO-REL-08, `rules/go-modules/release.md:141`) is raw binaries `<bin>-<os>-<arch>` plus `checksums.txt`, tagged `vX.Y.Z`, verified through GitHub's asset digest by a downstream mirror.

What changes for Swift, all measured below:

| go-release | Swift |
|---|---|
| a proxied tag is permanent (module proxy + checksum DB) | a git tag has no proxy, but SwiftPM caches and `Package.resolved` pin revisions, so a moved tag silently splits consumers (section 8); there is **no `retract`** |
| `gorelease` API gate | `swift package diagnose-api-breaking-changes <tag>` (section 10) |
| `-X main.version` ldflags | no linker-time string injection in SwiftPM; stamp via a build-tool plugin, generated file, or manifest-defined C macro (section 5) |
| goreleaser + syft | none: assemble with shell, SBOM from SwiftPM itself (section 3) |
| `-trimpath`, reproducible by default | reproducible only under fixed absolute paths and fixed SDK mtimes (section 4) |
| module version from `debug.ReadBuildInfo()` | nothing equivalent: a Swift binary does not know its tag |

### 2. Toolchain pin: `.swift-version`, image tags, the compiler's own spelling

**swiftly semantics** (read from source, not run: swiftly is not in the image; "unverified: read only" for macOS):

- Selection walks from the working directory **up to the filesystem root** and takes the first `.swift-version` (swiftly@c8cf2e35bfca:Sources/Swiftly/Use.swift:226-235, `let svFile = cwd / ".swift-version"`). Creation, by contrast, stops at the first directory containing `.git` (`Use.swift:180-191`, `findNewVersionFile`).
- Newlines (and `\r`) are stripped, then the content is parsed as a **toolchain selector** (`Use.swift:248`; swiftly@c8cf2e35bfca:Sources/SwiftlyCore/ToolchainVersion.swift:314-329). Accepted forms: a full stable version `6.4.0`, a partial `6.4` or `6`, `latest`, `main-snapshot-YYYY-MM-DD`, `X.Y-snapshot-YYYY-MM-DD`, `xcode`. An empty file is an error (`The swift version file is empty`), an unparsable one is an error (`is malformed`), an uninstalled one is an error with an install hint (`Use.swift:236-266`).
- A partial selector (`6.4`) resolves to the **newest installed** 6.4.x on that machine, so two machines can build with different patches. Only the full `X.Y.Z` pins.
- Corpus: `.swift-version` is `6.4.0` in swiftly@c8cf2e35bfca and swift-package-manager@5546f44a3b52, `6.3.0` in containerization@3e7bc39e66b3, `6.2.0` in swift-build@2187330e13e7, `main-snapshot-2026-09-10` in swift-embedded-examples@119b29f83550.

**Consumers of the same file.** rules_swift reads it for a hermetic toolchain: `swift.toolchain(name = "swift_toolchain", swift_version_file = "//:.swift-version")` (bazelbuild/rules_swift@50450ed24dde:doc/standalone_toolchain.md:94-101; Bazel depth is another dive). containerization derives its CI image from it (apple/containerization@3e7bc39e66b3:.github/workflows/linux-build.yml:21-36):

```yaml
      - name: Checkout .swift-version
        with: { sparse-checkout: .swift-version }
      - run: echo "image=swift:$(cat .swift-version)-noble" >> "$GITHUB_OUTPUT"
    container: ${{ needs.swift-version.outputs.image }}
```

This is the cleanest single-source pin in the corpus (one file, no drift), and it only works because the file holds an exact `X.Y.Z`: `swift:6.4.0-noble` exists; a `latest` or snapshot selector in the file would produce a nonexistent tag.

**The image tag floats.** SW-GATE-08 already records that `swift:6.3` floated to 6.3.3 during this research; `swift:6.4.0` exists as a tag (`docker manifest inspect swift:6.4.0` returned an OCI image index, 2026-10-10; the `-noble-slim` variant lists amd64 and arm64). The shared `swiftlang/github-workflows@0.0.15` `soundness.yml` defaults its API-breakage and docs jobs to `swift:6.3-noble` (lines 21 and 29 of the file), a moving tag on the prior line while the matrix runs 6.1 to 6.4, so a repository calling it without overriding gets a different compiler for the API gate than for the build.

**The compiler spells `X.Y.0` as `X.Y`.** Measured with `FX/scripts/g2.sh`:

```text
swift:6.4 image  ->  Swift version 6.4 (swift-6.4-RELEASE)       (toolchain 6.4.0)
swift:6.3 image  ->  Swift version 6.3.3 (swift-6.3.3-RELEASE)
```

swiftly mirrors this (`Sources/SwiftlyCore/ToolchainVersion.swift:219-232`: patch 0 becomes `swift-X.Y-RELEASE`). So a verification that compares `swift --version` with the file must map `6.4.0` to `6.4` (`P=${V%.0}`), or it is red on a correct toolchain. `swift format --version` prints `main` on 6.4.0 and identifies nothing (SW-GATE-08).

**Pin, then check three things** (all run, section "Verification runs" VR-4): the file is exactly `X.Y.Z`; every `swift:` tag in Dockerfiles and workflows is literally that version; the running compiler reports it. An `ARG SWIFT_TAG=6.4.0` indirection before `FROM swift:${SWIFT_TAG}` defeats the literal-tag grep (measured false positive); write the literal tag in the `FROM` line, or accept that the check reads the `ARG` default.

### 3. SBOM: flags, output path, naming, content, non-determinism

**Flags** ([GeneratingSBOMs.md](https://raw.githubusercontent.com/swiftlang/swift-package-manager/main/Sources/PackageManagerDocs/Documentation.docc/GeneratingSBOMs.md), [SE-0509](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0509-swift-sboms-via-swiftpm.md), Implemented in Swift 6.4):

```sh
swift build -c release --sbom-spec cyclonedx --sbom-spec spdx --sbom-output-dir sboms   # default engine (Swift Build) on 6.4
swift package generate-sbom --sbom-spec cyclonedx                                        # no build: "may be inaccurate" warning
SWIFTPM_BUILD_SBOM_SPEC=cyclonedx,spdx swift build                                       # env form; flags win; SBOM only if the var is set
```

Also `--product`, `--sbom-filter package|product`, `--sbom-warning-only` (turns generation failure into a warning; default is a failing build). `cyclonedx` means "most recent supported CycloneDX major" = **1.7**; `spdx` = **SPDX 3.0.1**; only the newest minor of each major is ever supported (SE-0509, "Only the most recent minor version ...").

Measured on `swift:6.4` (FX/a-repro, FX/out-sbom, 2026-10-10):

| Observation | Result |
|---|---|
| `--sbom-spec cyclonedx --sbom-spec spdx` on `-c release` | exit 0; both files; generation took 0.09-0.10 s |
| default output dir | `<scratch>/out/Products/<Config>-<platform>/sboms/`, e.g. `Release-linux-x86_64`, `Release-staticlinux-x86_64` (static SDK), `Debug-linux-x86_64` (generate-sbom). The docs say `<build_output>/sboms`; `--sbom-output-dir DIR` overrides |
| file name | `cyclonedx1-1.7-<identity>-<version>-all-<UTC with underscores>.json`, `spdx3-3.0.1-...json`; re-running appends a new timestamped file, never overwrites (SE-0509 says so) |
| `--sbom-spec` with 6.3.3 | `error: Unknown option '--sbom-spec'`, exit 64 |
| `--sbom-spec cyclonedx2` | exit 64 with usage text |
| `--sbom-spec` with `--target` | `error: --sbom-spec or SWIFTPM_BUILD_SBOM_SPEC cannot be used with --target flag`, exit 1 (the build itself completes first) |
| `--build-system native` | works, with `warning: generating SBOM(s) without --build-system swiftbuild flag creates SBOM(s) without build-time conditionals` |
| both builds print | `warning: Bundle 'SwiftPM_SBOMModel' with schemas not found - skipping SBOM validation`: the shipped toolchain does not validate the SBOM it writes |

**Content.** The primary component is `type: application`, its `name` is the **checkout directory name** (the package identity: swift-package-manager@5546f44a3b52:Sources/SBOMModel/Extractor/SBOMDependenciesExtractor.swift:37, `rootPackage.identity.description`), not the manifest `name:` (the manifest said `relcli`; the SBOM said `a-repro` and, in a clone, `green`). Its `version` is the git tag verbatim when HEAD is tagged (`v1.2.3`), and the literal `unknown` in a directory with no git (a-repro). In a clone, `pedigree.commits[0].url` and the purl `?path=` carry the clone's origin URL, which was a local path in the fixture: in CI that is the GitHub URL, locally it leaks a machine path. Components listed: the root, each root target, each dependency package and product (`swift-argument-parser@1.8.0`, `ArgumentParser@1.8.0`). **Not listed**: the toolchain, the Swift runtime, and for a static build musl and the other SDK components. Those are in the Static SDK's own `sbom.spdx.json` (SPDX **2.3**, 12 packages: `swift 6.4.0-RELEASE`, `musl 1.2.5`, `libxml2 2.14.5`, `curl 8.15.0`, `zlib 1.3.1`, `libarchive 3.8.1`, `mimalloc 2.2.4`, ...), which the [Static Linux guide](https://www.swift.org/documentation/articles/static-linux-getting-started.html) also describes.

**Non-determinism.** Two builds of the same tree from the same scratch path (FX/out-samepath) produce byte-identical binaries and SBOMs that differ only in `metadata.timestamp`, the tool component `bom-ref` UUID and `serialNumber` (CycloneDX), and the `creationInfo`/`spdxId` UUIDs and `created` (SPDX). Source: `Date().ISO8601Format()` at swift-package-manager@5546f44a3b52:Sources/SBOMModel/Extractor/SBOMExtractor.swift:53 and a timestamp in the file name at `Sources/SBOMModel/Encoder/SBOMEncoder.swift:40-41`. After `sed -E 's/urn:uuid:[0-9a-f-]{36}/urn:uuid:UUID/g; s/[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:]{8}Z/TS/g'` the two files hash identically (VR-2).

**Recommendation.** Generate both formats in the one build (0.1 s), publish **CycloneDX 1.7** as `<tool>-<os>-<arch>.cdx.json` (stable name; the internal name is the checkout directory and the file name carries a timestamp), keep SPDX 3.0.1 as a pinned-default override for consumers that ask (go-release publishes SPDX; the fleet convention for the asset family is a `*.sbom.json` suffix), ship the Static SDK's `sbom.spdx.json` for the musl layer if the image or binary must account for it, and never gate on SBOM bytes. SBOM consumers' format support is not measured here (unverified: no scanner was run).

### 4. Reproducibility: what makes two clean builds byte-identical

Measured on `swift:6.4` and `swift:6.3` (FX/scripts/a2.sh, a2b.sh, build1.sh, build2.sh, s2.sh; package `relcli` = ArgumentParser 1.8.0 + one executable, `-c release`, scratch dir deleted between builds):

| Variation between the two builds | Result |
|---|---|
| same source dir, same scratch path, 6.4.0 dynamic | **identical** sha256 (`6a98c18c...`), 3 repeats |
| same, 6.3.3 | **identical** (`0d932662...`) |
| same, 6.4.0 static musl (SDK installed once) | **identical** (`84ef5b48...`); 57 MB unstripped |
| scratch path differs (`same-1` vs `same-2`) | **differs**, 807 bytes; the binary embeds the scratch path 219 times (checkout and module-cache paths) |
| source dir differs, scratch path same | **differs** |
| `-Xswiftc -file-prefix-map ...` + `-Xcc -ffile-prefix-map` | still differs (153 residual scratch-path strings) |
| `-Xswiftc -gnone -Xlinker --strip-all`, different scratch paths | differs, but only in `.swift_modhash` (48 bytes) and `.note.gnu.build-id` (19 bytes); `objcopy --remove-section .swift_modhash --remove-section .note.gnu.build-id` on both gives **identical** files |
| static SDK **re-installed** (new file mtimes, same path) | **differs** (`e54b9d3e...` vs `6d0cc790...`) |
| static SDK installed to a different path | differs |
| static SDK re-installed, then `find <sdks> -exec touch -h -d @1700000000 {} +` | **identical** (`0658cf54...`) twice |
| Docker `swift build` in a fresh container, dynamic, 3 runs | identical |
| Docker two-stage static, three `--no-cache` builds, SDK mtimes not fixed | **three digests** (`c7dd8db6...`, `abbe4d86...`, `731380a3...`); the differing bytes are `.swift_modhash` (887) and build-id (19) |
| same Dockerfile with the SDK `touch` step, two `--no-cache` builds | **identical** (`b6b23cc5...`); `swift:6.4` and `swift:6.4.0` give the same bytes |
| Docker image IDs for the identical binaries | different (layer metadata); compare the binary digest, not the image ID |

Reading: the Swift 6.4 toolchain is deterministic given identical inputs, but the inputs include absolute paths and, for the Static Linux SDK, **file modification times** (the Clang module cache fingerprints the sysroot headers). A reproducibility proof therefore fixes: the toolchain patch, one absolute source path and one scratch path (a Docker `WORKDIR /src` and `--scratch-path /scratch`, or a CI workspace path that does not change), `Package.resolved` with `--force-resolved-versions`, the SDK mtimes, and `fetch-depth: 0` so the stamped version is the same. This is the Go double-build step transplanted; it is **not** a property Swift documents (no Swift primary source claims reproducible builds; the claim here is only the measurement above). Cross-path reproducibility is not available; `-file-prefix-map` did not achieve it.

Reproducible archives, measured: `tar --sort=name --mtime=@1700000000 --owner=0 --group=0 --numeric-owner -cf - ... | gzip -n -9` gave identical digests across a `touch` of the input; plain `tar | gzip` differed (FX/h-dist). The [SOURCE_DATE_EPOCH spec](https://reproducible-builds.org/docs/source-date-epoch/) is the convention for the epoch value; Docker's [reproducible-builds guide](https://docs.docker.com/build/ci/github-actions/reproducible-builds/) covers image-level timestamps (not run).

### 5. Stamping the version

A Swift binary has no linker-time string injection and no `debug.ReadBuildInfo()`. Corpus patterns (swift-audit/exemplar-packaging-and-release.md, Release engineering): SwiftLint and SwiftFormat `sed` the tag into a checked-in `Version.swift` template at release time (SwiftLint@ec4691d9e813:.github/workflows/release.yml:51-55; SwiftFormat@fbc07aca5373:.github/workflows/release.yml:12-13), apple/container passes `git describe --tags --always` through an env var into a manifest `.define("RELEASE_VERSION", ...)` (container@f70ecbb926d9:Package.swift:23-24,616-617), swiftly hand-edits a constant with a `dev` suffix (swiftly@c8cf2e35bfca:Sources/SwiftlyCore/SwiftlyCore.swift:5). A `sed` of a tracked file leaves the tree dirty; the three patterns differ in whether a dev build shows a version.

Two recipes were built and watched (FX/b-stamp, FX/b-manifest):

**Recipe A (default): a build-tool plugin writes `Version.swift` into the plugin work directory.**

```swift
// Plugins/StampPlugin/Plugin.swift
import Foundation
import PackagePlugin

@main struct StampPlugin: BuildToolPlugin {
    func createBuildCommands(context: PluginContext, target: Target) throws -> [Command] {
        let out = context.pluginWorkDirectoryURL.appending(path: "Version.swift")
        let dir = context.package.directoryURL
        var inputs = [dir.appending(path: "Package.swift")]
        let versionFile = dir.appending(path: ".relcli-version")
        if FileManager.default.fileExists(atPath: versionFile.path()) { inputs.append(versionFile) }
        return [.buildCommand(displayName: "Stamp relcliVersion",
                              executable: try context.tool(named: "StampTool").url,
                              arguments: [out.path(), dir.path()],
                              inputFiles: inputs, outputFiles: [out])]
    }
}
```

`StampTool` (an `executableTarget`) writes `let relcliVersion = "<v>"`, where `<v>` is the first of: the trimmed content of `<package>/.relcli-version` (written by the release job or by `docker build --build-arg VERSION`), `git describe --tags --always --dirty` with a leading `v` removed, or `0.0.0-unknown`. The CLI target lists `plugins: ["StampPlugin"]` and passes `relcliVersion` to `CommandConfiguration(version:)`.

What was learned building it, each measured on 6.4.0 and, where noted, 6.3.3:

- **`.prebuildCommand` fails**: `error: a prebuild command cannot use executables built from source, including executable target 'StampTool'`. Use `.buildCommand`, which needs `inputFiles` and `outputFiles`.
- **An environment variable does not reach the plugin tool under Swift Build.** With `RELCLI_VERSION=9.9.9 swift build --build-system swiftbuild` the binary printed `1.2.3-dirty` (from git); with `--build-system native` it printed `9.9.9`. The 6.4 default is Swift Build, so an env-driven plugin silently stamps the wrong value. Use a file (works on both engines: `.relcli-version` created and changed between builds gave 9.9.9 then 8.8.8 incrementally on both) or git.
- **Incremental builds can keep a stale version.** The command reruns when an input file changes; `git describe` output is not an input, so a new commit or tag on the same scratch dir is not noticed. The release build uses a clean scratch path (which section 4 already requires).
- **The stamped value is the tag minus `v`**: tag `v1.2.3` printed `1.2.3`. An untagged commit printed `1.2.3-1-g95447aa`, a modified tree `1.2.3-dirty`, a tree without `.git` and without the file `0.0.0-unknown`. These are the red cases of the check.

**Recipe B (C targets only): the manifest defines a macro.** `Context.environment["RELCLI_VERSION"]` feeds `cSettings: [.define("RELCLI_VERSION", to: "\"\(version)\"")]` on a tiny C target that returns the string. Under both engines the first build printed `1.2.3` and an incremental rebuild after changing the variable printed `2.0.0` (no staleness; the manifest is re-evaluated). Costs a C target; works with plain `docker build --build-arg`. This is the apple/container mould. On macOS the manifest sandbox's treatment of `environment` is "unverified: read only".

**Check.** `swift run -c release relcli --version` equals the tag minus `v` (VR-3). A `--version` that prints a `dev` default or the placeholder is the finding.

### 6. Artifact set, naming, checksums, provenance

**Pinned default (matches go-release GO-REL-08 so the fleet's mirror and installer shape is one):** per release, for each platform that was *built and run* (Linux amd64 was built and run here by the section 7 recipe; Linux arm64 uses the same recipe with `aarch64-swift-linux-musl` and is "unverified: not built here"; darwin and windows "unverified: read only"):

```text
<tool>-linux-amd64          static musl, stripped, executable bit
<tool>-linux-arm64
<tool>-linux-amd64.cdx.json CycloneDX 1.7 from `swift build --sbom-spec cyclonedx` (renamed; internal name is the checkout dir)
checksums.txt               `sha256sum` format, one line per asset above
```

plus, for a library+CLI repository, nothing else (a SwiftPM library is distributed by the tag itself). Tag: `vX.Y.Z` for a binary release (SwiftPM resolves `v1.2.3` identically to `1.2.3`, measured; the SBOM then carries `v1.2.3`).

**Override: archives**, when the release must ship a LICENSE or completions beside the binary. Swift prior art uses archives: swiftly `swiftly-<version>-<arch>.tar.gz` containing `swiftly` and `LICENSE.txt` (swiftly@c8cf2e35bfca:Tools/build-swiftly-release/BuildSwiftlyRelease.swift:292-294), SwiftFormat `swiftformat_linux.zip` / `swiftformat_linux_aarch64.zip` and `swiftformat.artifactbundle.zip` (SwiftFormat@fbc07aca5373:.github/workflows/release.yml:92-98), SwiftLint `SwiftLintBinary.artifactbundle.zip` consumed by a `.binaryTarget(url:checksum:)` (SwiftLint@ec4691d9e813:Package.swift:260-265). The artifact bundle is the one Swift-specific format: a SwiftPM `binaryTarget` consumer needs it and `swift package compute-checksum` over the zip (not run here: `binaryTarget` is rare, M-L-17, deferred). Use the deterministic-tar recipe of section 4 for tarballs.

**Checksums.** `sha256sum <assets> > checksums.txt`, verified with `sha256sum --check --strict checksums.txt`: green exit 0 (`...: OK`), a one-byte-appended asset exit 1 (`FAILED`, `WARNING: 1 computed checksum did NOT match`) (FX/h-dist). Asset digests on GitHub are a second, independent check for a mirror; ship `checksums.txt` anyway because the installer path (`curl | sha256sum -c`) does not have the API.

**Signing and provenance (unverified: read only; no GitHub run).** The corpus is thin: provenance keywords match 2 of 40 repos; tuist attests one non-CLI workflow, no step signs a Linux artifact; `codesign`/`notarytool` appear only in macOS jobs (audit, Release engineering). Recommended default, mirroring go-release GO-REL-11: `actions/attest-build-provenance` with `subject-checksums: dist/checksums.txt`, `permissions: id-token: write` and `attestations: write`, run in CI only, verified by `gh attestation verify <asset> -R <owner>/<repo>` ([GitHub docs](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations)). Pin every `uses:` at a 40-hex SHA. For an OCI image, `docker buildx build --sbom=true --provenance=mode=max` attaches attestations ([Docker SBOM attestations](https://docs.docker.com/build/metadata/attestations/sbom/), not run). A `FROM scratch` image with the SwiftPM CycloneDX file as a release asset and the Static SDK SBOM covers the components; BuildKit's scanner SBOM is a third, independent view.

### 7. Images: two-stage static `FROM scratch`

Built and run (FX/c-image/Dockerfile; Docker 29.5.2 with BuildKit; 6.4.0 and 6.3.3):

```dockerfile
# syntax=docker/dockerfile:1
FROM swift:6.4.0 AS build
ARG VERSION=0.0.0-unknown
ARG SDK_URL=https://download.swift.org/swift-6.4.0-release/static-sdk/swift-6.4.0-RELEASE/swift-6.4.0-RELEASE_static-linux-0.1.0.artifactbundle.tar.gz
ARG SDK_SUM=47d2fd89eebfdf9eb4d536b6710414297f755c17926cdebc4742c08982b40a9e
RUN swift sdk install "$SDK_URL" --checksum "$SDK_SUM" \
 && find /root/.swiftpm/swift-sdks -exec touch -h -d @1700000000 {} +
WORKDIR /src
COPY Package.swift ./
COPY Sources Sources
COPY Plugins Plugins
RUN echo "$VERSION" > .relcli-version
RUN swift build -c release --swift-sdk x86_64-swift-linux-musl --scratch-path /scratch \
 && cp "$(swift build -c release --swift-sdk x86_64-swift-linux-musl --scratch-path /scratch --show-bin-path)/relcli" /relcli \
 && strip /relcli

FROM scratch
COPY --from=build /relcli /relcli
USER 65534:65534
ENTRYPOINT ["/relcli"]
```

Facts: the SDK URL and checksum come from the [swift.org static-linux guide](https://www.swift.org/documentation/articles/static-linux-getting-started.html) and, machine-readably, from `https://www.swift.org/api/v1/install/releases.json` (entry `platform: static-sdk`, field `checksum`; 6.3.3's is `87c3eaf9...`, 6.4.0's `47d2fd89...`, both accepted by `swift sdk install --checksum`); the toolchain must match the SDK version exactly ([guide](https://www.swift.org/documentation/articles/static-linux-getting-started.html)); the Swift Build engine is needed (the SDK build works on the default engine, `--static-swift-stdlib` does not, E7/E8 in the audit; the sibling dive owns that). `--show-bin-path` is used rather than `.build/release` (M-N-04). Measured: build 61 s including the SDK download; image `relcli-fixture:640` and `:pinned`; binary `ELF 64-bit ... statically linked ... stripped`, **11.5 MB**; Docker reports **16.9 MB** for the image (18.9 MB on 6.3.3); the same app on `swift:6.4-slim` (built from `swift:6.4`, dynamic binary) reports **415 MB**.

Behaviour of the running image (FX/c-image, ArgumentParser 1.8.0, `Status` enum per SW-CLI-01):

```text
docker run --rm IMG --version            -> 1.2.3                    exit 0   (stamped from --build-arg VERSION)
docker run --rm IMG                      -> relcli ok                exit 0
docker run --rm IMG --unreachable        ->                          exit 69  (.unavailable)
docker run --rm IMG --bogus              -> Error: Unknown option    exit 64  (.usage)
docker run --rm --read-only --cap-drop ALL IMG --version -> 1.2.3    exit 0
docker run --rm --entrypoint /bin/sh IMG -c true -> exec "/bin/sh": stat /bin/sh: no such file or directory
docker inspect --format '{{.Config.User}}' -> 65534:65534
```

There is no shell, no libc, no CA bundle, no `/tmp`, no timezone data in a `FROM scratch` image: a CLI that opens TLS needs the CA bundle copied from the build stage (the Static SDK links BoringSSL but Foundation's trust store location is the sibling's area: "unverified: not run here, no TLS in the fixture"). Choose the slim image only for a binary that must `dlopen` or links GNU-only code; the Static SDK has no `dlopen` ([guide](https://www.swift.org/documentation/articles/static-linux-getting-started.html)). Docker Hub variants measured by the eco dive: `6.4-noble-slim` about 105 MB compressed.

**Pin hygiene for the build stage**: literal `FROM swift:X.Y.Z` equal to `.swift-version` (section 2), `swift sdk install` always with `--checksum`, the SDK mtime fix of section 4 if the image is part of a reproducibility claim, `USER` non-root, exec-form `ENTRYPOINT`.

### 8. Library tagging and SemVer as SwiftPM reads it

SwiftPM reads git tags as versions: ["The package manager uses git tags, interpreted as a semantic version"](https://raw.githubusercontent.com/swiftlang/swift-package-manager/main/Sources/PackageManagerDocs/Documentation.docc/Dependencies/AddingDependencies.md), and "tags ... should include all three components ... Tags that only include one or two of those components are not interpreted as semantic versions". The code: `Version(tag:)` strips a leading `v` and parses with `usesLenientParsing: true` (swift-package-manager@5546f44a3b52:Sources/Basics/Version+Extensions.swift:19-25); when both `v1.0.0` and `1.0.0` exist the bare tag wins (`SourceControlPackageContainer.swift:138-147` per the audit). The [Swift Package Index](https://swiftpackageindex.com/add-a-package) requires "at least one release tagged as a semantic version"; the [SSWG minimal bar](https://www.swift.org/sswg/incubation-process.html) is "Follow semantic versioning, with at least one published pre-release (e.g. 0.1.0, 1.0.0-beta.1) or release (e.g. 1.0.0)".

Measured with a local git repo `tl` tagged `v1.0.0` (annotated), `1.1.0` (lightweight), `1.2.0` (annotated), `2.0.0-beta.1`, `1.3` (annotated), `release-1.4.0`, consumers resolving by `file://` URL (FX/f-tags, 6.4.0; 6.3.3 agrees on the `1.3` case):

| Consumer requirement | Resolved | Reading |
|---|---|---|
| `from: "1.0.0"` | **1.3.0** | the two-component tag `1.3` is accepted as 1.3.0 and beats 1.2.0; the doc statement is wrong in 6.3.3 and 6.4.0. `release-1.4.0` was ignored; the pre-release was excluded |
| `from: "2.0.0-beta.1"` | 2.0.0-beta.1 | a pre-release is eligible only when the range's lower bound is itself a pre-release |
| `exact: "2.0.0-beta.1"` | 2.0.0-beta.1 | |
| tags `0.1.0`, `0.2.0`, `0.3.0` (each a breaking change), `from: "0.1.0"` | **0.3.0** | no 0.x special case: `from:` is `upToNextMajor`, so 0.x minor breaks reach `from:` consumers |
| same, `.upToNextMinor(from: "0.1.0")` | 0.1.0 | the 0.x-safe spelling |
| `exact: "1.2.0"` resolved to revision `c048363c`; tag then `git tag -f` moved to a newer commit | with `Package.resolved` kept: still `c048363c`, exit 0, **no message**; `--force-resolved-versions` on a fresh scratch: still `c048363c`; with `Package.resolved` deleted: `0e068576` | the same version string `1.2.0` now names two revisions for locked and fresh consumers |

Rules that follow: tags are bare `X.Y.Z[-pre.N]` for libraries (Apple, Point-Free and SwiftLint use bare; `v` also resolves, and the SBOM and `--version` then differ in spelling, section 5, so a repo picks one form and the check enforces it); every tag is annotated, because `git describe` without `--tags` ignores lightweight tags and an annotated tag carries tagger and date; a published tag is never moved or deleted. SwiftPM has no `retract`; a bad release is followed by the next patch, never replaced (the go-release preface, minus the proxy). Registries (SE-0292) have an unpublish endpoint but the corpus does not use registries (M-L-18), "unverified: not run".

SSWG, for a server-side library, adds (from the [incubation process](https://www.swift.org/sswg/incubation-process.html)): Sandbox needs SwiftPM, Linux unit tests, CI on PRs and main, SemVer with a published pre-release or release, Apache-2/MIT/BSD licence, the API Design Guidelines, a formatter in CI. Graduation adds a 1.0 or later with a stable API, support for new GA Swift within 30 days, CI on the two latest Swift.org versions and at least one Linux distribution, "Documented release methodology", documented support for one previous major, GOVERNANCE.md and ADOPTERS.md. This is a maturity ladder, not a release gate; only the tagging parts are in the rules below.

### 9. Local `path:` dependencies (M-L-20)

**Question: does a local `path:` dependency block a version-tag consumer of a library?** Yes, always, whatever the path points at. Measured (FX/d-pathdep, Swift 6.4.0 and 6.3.3 give the same text):

| Library manifest at tag `1.0.0` | Consumer | Result |
|---|---|---|
| `.package(path: "../helper")` (sibling directory) | `from: "1.0.0"` by `file://` URL | `error: Dependencies could not be resolved because root depends on 'lib' 1.0.0..<2.0.0. 'lib' >= 1.0.0 cannot be used because ... package 'lib' is required using a stable-version but 'lib' depends on an unstable-version package 'helper'.` **exit 1** |
| `.package(path: "Vendored/Inner")` (inside the same repository) | `from:` | the same error, **exit 1** |
| `.package(url: ..., branch: "main")` | `from:` | the same error, **exit 1** |
| the sibling folded in as a second target of the same package | `from:` | `Build complete!`, **exit 0** |
| any of the above | `branch: "main"` of the library | `error: package 'lib' is required using a revision-based requirement and it depends on local package 'helper', which is not supported` (exit 1) |
| `path:` dependency | the *root* package (`.package(path: "../lib")`, lib itself using `../helper`) | `Build complete!`, exit 0 |

Source of the messages: swift-package-manager@5546f44a3b52:Sources/PackageGraph/Resolution/PubGrub/DiagnosticReportBuilder.swift:222 and Sources/PackageGraph/Resolution/DependencyResolverError.swift:24. The [SwiftPM docs](https://raw.githubusercontent.com/swiftlang/swift-package-manager/main/Sources/PackageManagerDocs/Documentation.docc/Dependencies/AddingDependencies.md) say "Local dependencies do not enforce version constraints", which is why they have no version for a SemVer range to select. **Rule:** `path:` is for the root package and its local development only; a manifest reachable from a release tag has no `path:`, `branch:` or `revision:` dependency. The fix is to merge the code as a target of the same package or to tag the other package and depend on it with `from:`. For local co-development, a root consumer may depend on the library by `path:` (exit 0 above); the library's own manifest stays clean. The earlier audit's P4 (`-warnings-as-errors` fails on a local path dependency, remote dependencies get `SUPPRESS_WARNINGS`) is a second, unrelated reason not to use `path:` in the gate's tree.

### 10. API-breakage baseline

`swift package diagnose-api-breaking-changes <treeish>` ([command reference](https://raw.githubusercontent.com/swiftlang/swift-package-manager/main/Sources/PackageManagerDocs/Documentation.docc/Package/PackageDiagnoseAPIBreakingChange.md)) compares every library-product module against the baseline revision; options `--products`, `--targets`, `--baseline-dir`, `--regenerate-baseline`, `--breakage-allowlist-path`. It is step 4 of SW-GATE-01 (library and SDK only). Measured on a library `Greeter` tagged `1.0.0` (FX/e-api, 6.4.0 and 6.3.3 identical):

| Change since 1.0.0 | Output | Exit |
|---|---|---|
| removed `public func shout(_:)` | `1 breaking change detected in Greeter:  API breakage: func shout(_:) has been removed` (also an `error:` line at `<unknown>:0`) | **1** |
| `greet(_ name: String)` changed to `Substring` | `API breakage: func greet(_:) has parameter 0 type change from Swift.String to Swift.Substring`, with a source location | **1** |
| added `public func whisper(_:)` | `No breaking changes detected in Greeter` | **0** |
| baseline tag does not exist (`9.9.9`) | `error: Couldn't get revision '9.9.9^{commit}': fatal: Needed a single revision` | **1** |
| clone without tags, baseline `1.0.0` | the same `error: Couldn't get revision` | **1** |
| stale `--baseline-dir` populated from `1.0.0`, then baseline `1.1.0` without `--regenerate-baseline` | correct (1 breaking change): the cache is keyed by revision, no stale-baseline false green | 1 |

Consequences: exit 1 has two meanings, so a wrapper greps for `breaking change` versus `Couldn't get revision`; the job needs the tags (`fetch-depth: 0` and `fetch-tags: true`; the shared workflow does exactly that, swiftlang/github-workflows@0.0.15:.github/workflows/soundness.yml:143-149); and the **baseline for a release is the previous release tag**, whereas the shared workflow defaults it to the pull request's base branch (`git fetch ... ${GITHUB_BASE_REF}:pull-base-ref`, soundness.yml:161-164), which on a non-PR event is empty and on a PR only proves "no new break against main", not against the last release. A first plant that did not compile produced no report (audit E3 caveat); run the build step first. API breakage is also the *semantic* input to the bump: a break needs a major (or, at 0.x, a documented minor, section 8).

### 11. The `swift-release` skill outline (M-P-03)

Mirror of go-release's structure (preface, scope table, pinned defaults, ordered steps that fail before the push, MUST rows, agent mistakes), with Swift's gates. Proposed frontmatter `description`: ordered runbook for cutting a Swift release, for a CLI shipped as static per-arch binaries (and optionally a `FROM scratch` image) and for a library or SDK shipped as a SwiftPM tag; covers the toolchain pin, the API-breakage gate, version stamping, SBOM, checksums, the double-build proof, attestation, verification of published assets; not for bumping the toolchain (`swift-upgrade`) and not for crashes (`swift-diagnose`).

**Preface: "A pushed tag is permanent. Read before step 1."** No retract exists; consumers' lockfiles pin revisions and a moved tag silently splits them (section 8). A bad release is followed by a new patch.

**Scope table.** Library or SDK: steps 1-4, 9-10. CLI binary: steps 1-3, 5-10. CLI with an image: plus step 8. Rule families: SW-REL, SW-GATE-01/03/20, SW-PKG-26/28/29, SW-CLI-01.

**Pinned defaults (override once per repo).** Asset shape raw `<tool>-<os>-<arch>` + `checksums.txt`; SBOM CycloneDX 1.7 via SwiftPM; stamping by plugin + `.relcli-version`; tags bare for libraries and `vX.Y.Z` for binaries (one form per repo); signing keyless in CI only; static musl for Linux; tool pins `.swift-version` and the SDK checksum from `releases.json`.

**Runbook.**

1. **Decide version and tag.** API report first (step 3) for a library; the size of the bump comes from it. Tag form per repo; no 0.x break without a minor and a README line.
2. **Pin and gate at the exact commit.** Run the pin checks (RP-01..03), then SW-GATE-01 steps 1-3 (steps 4-5 for a library) at the commit; for a CLI add `Package.resolved` tracked, `--force-resolved-versions` on every step, and `git diff --exit-code -- Package.resolved` (SW-PKG-26/28/29). `git status --porcelain` empty. Tag **locally** (annotated), push later.
3. **Library: API gate and publishability smoke.** `swift package diagnose-api-breaking-changes "$LAST_TAG"` exit 0; manifest purity grep (RP-12); then resolve the candidate from a throw-away consumer by `file://` URL at the local tag and build it (exit 0). The smoke test is the real proof that no `path:` or `branch:` leaked.
4. **Library: tag hygiene.** Tag form grep, annotated check, `git ls-remote --exit-code --tags origin refs/tags/$TAG` must exit 2.
5. **CLI: stamp.** Write `.relcli-version` from the tag in CI (or let `git describe` do it with `fetch-depth: 0`); `swift run -c release <tool> --version` equals the tag minus `v` (RP-07).
6. **CLI: build, name, SBOM, checksum.** `swift build -c release --swift-sdk <arch>-swift-linux-musl --sbom-spec cyclonedx --sbom-output-dir sboms --scratch-path "$SCRATCH"`; copy `$(swift build ... --show-bin-path)/<tool>` to `dist/<tool>-linux-<arch>`; strip; rename the SBOM; `sha256sum` into `checksums.txt`; check the SBOM carries the tag (RP-04); check asset names (RP-09). Glibc floor, `ldd` and the static-SDK specifics are the sibling dive's (binaries-and-platforms).
7. **CLI: double build.** Build again from a clean scratch path at the same absolute path with the SDK mtimes fixed; sha256 of binary equal (RP-06). SBOM compared only after normalisation (RP-05).
8. **Image (optional).** Two-stage static Dockerfile; Dockerfile greps (RP-10); `docker run` exit codes 0/64/69; second `--no-cache` build, binary digest equal.
9. **Push the tag, let CI sign.** `id-token: write`, attest over `checksums.txt`, actions pinned at 40-hex SHAs, `fetch-depth: 0` (RP-11). Unverified: read only; no GitHub run here.
10. **Verify what was published.** `gh release download`, `sha256sum --check --strict checksums.txt`, name loop, `gh attestation verify`, `docker run` the published image digest; for a library, resolve the *published* tag from a clean consumer.
11. **A release went out wrong.** Never move or delete the tag; ship the next patch; for a leaked bad binary, publish new assets under the new version only; if a registry is used, unpublish is a registry operation (unverified).

**MUST rows** = the Normative guidance candidates below. **What agents get wrong** = the AI-agent angle below.

## Normative guidance candidates

IDs local. Severity MUST/SHOULD. "Run" says whether the verification was run against a planted violation and its compliant twin (fixture paths relative to `FX/`; commands in "Verification runs" use these exact forms).

**SW-REL-RP-01 (MUST). Pin the toolchain in `.swift-version` as an exact `X.Y.Z`.**
Rationale: swiftly and rules_swift select by that file and a partial selector (`6.4`) resolves per machine; containerization derives its CI image from it.
Verify: `grep -L -x -E -e '[0-9]+\.[0-9]+\.[0-9]+' .swift-version` (output = violation; empty file or `6.4`/`latest` is listed; a missing file errors with exit 2). Floor: Swift 6.0; the file is read by swiftly 1.x.
Run: **yes**, `g-pin/good` empty, `g-pin/bad` prints `.swift-version`, `g-pin/missing` exit 2 (VR-4).

**SW-REL-RP-02 (MUST). Every `swift:` image tag in Dockerfiles and workflows is the literal pinned version (optionally with a variant suffix); no `latest`, no `X.Y`, no `ARG`-indirected tag.**
Rationale: `swift:6.3` floated to 6.3.3; the shared soundness workflow's `swift:6.3-noble` default gives the API gate a different compiler than the build.
Verify: `read -r V < .swift-version` then `grep -rn --include='Dockerfile*' --include='*.yml' --include='*.yaml' -e 'swift:' . | grep -v -F -e "swift:$V"` (output = violation).
Run: **yes**, `g-pin/good` empty, `g-pin/bad` two lines (`swift:6.3`, `swift:latest`); the `ARG SWIFT_TAG` form is a measured false positive, the literal `Dockerfile.pinned` is clean (VR-4).

**SW-REL-RP-03 (MUST). The compiler running a release job matches the pin, comparing with a trailing `.0` dropped.**
Rationale: `swift --version` prints `6.4` for toolchain 6.4.0; a naive compare is red on a correct toolchain.
Verify: `V=6.4.0; P=${V%.0}; swift --version | grep -F -e 'Swift version' | grep -v -F -e "Swift version $P ("` (output = violation; set `V` by `read -r V < .swift-version`).
Run: **yes**, 6.4 image + pin 6.4.0 empty; 6.4 image + pin 6.3.3 prints `Swift version 6.4 (swift-6.4-RELEASE)`; 6.3 image + 6.4.0 prints `Swift version 6.3.3 ...`; 6.3 + 6.3.3 empty (VR-4).

**SW-REL-RP-04 (MUST). Release SBOMs come from `swift build ... --sbom-spec cyclonedx --sbom-output-dir DIR` on Swift 6.4 or newer with the default engine, and carry the release tag.**
Rationale: `generate-sbom` and `--build-system native` omit build-time conditionals; 6.3.3 has no flag; the SBOM version is the git tag or `unknown`.
Verify (a): `grep -rn --include='*.sh' --include='*.yml' --include='Makefile' -e 'generate-sbom' -e 'build-system native' -e 'static-swift-stdlib' .` (output = violation). Verify (b): `TAG=v1.2.3; grep -L -F -e " : \"$TAG\"" ./*.json` run in the SBOM directory (output = an SBOM without the tag).
Run: **yes**, (a) `i-misc/bad/release.sh` two lines, `i-misc/good` none; (b) tagged build empty, untagged build lists all four files, wrong tag lists the SBOMs (VR-5).

**SW-REL-RP-05 (MUST NOT). Do not gate on SBOM or image-ID byte equality; compare SBOMs only after normalising UUIDs and timestamps.**
Rationale: serial numbers, tool `bom-ref`, `created` timestamps and the file name are per-run.
Verify: `{ for f in a.json b.json; do sed -E -e 's/urn:uuid:[0-9a-f-]{36}/urn:uuid:UUID/g' -e 's/[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:]{8}Z/TS/g' "$f" | sha256sum; done; } | uniq | awk 'END { if (NR != 1) print "SBOM DIFFERS BEYOND UUID/TIMESTAMP" }'` (output = violation).
Run: **yes**, same-tree pair empty; SBOMs of two different packages print the line (VR-2).

**SW-REL-RP-06 (SHOULD). A CLI release proves reproducibility by building twice from clean scratch directories at the same absolute source and scratch paths with the pinned toolchain and, for a static build, fixed SDK mtimes; the two binary digests are equal.**
Rationale: measured: identical with fixed paths, different with another scratch path, source path or a re-installed SDK; fixing SDK mtimes restores identity.
Verify: `sha256sum dist1/tool dist2/tool | cut -d' ' -f1 | uniq | awk 'END { if (NR != 1) print "NOT REPRODUCIBLE" }'` (output = violation). In Docker, after `swift sdk install`, `find /root/.swiftpm/swift-sdks -exec touch -h -d @1700000000 {} +`.
Run: **yes**, host dynamic same-path empty, scratch-path-differs and source-path-differs print the line; Docker static with the touch step empty, without it prints the line (VR-1).

**SW-REL-RP-07 (MUST). `--version` prints the tag minus `v`; the version comes from a build-tool plugin or generated file fed by a version file or `git describe`, never by an environment variable read inside a plugin, never a hardcoded default.**
Rationale: Swift Build drops the environment for plugin commands; prebuild commands cannot run source-built tools.
Verify: `TAG=v1.2.3; swift run -c release --scratch-path "$SCRATCH" tool --version 2>/dev/null | grep -v -x -F -e "${TAG#v}"` (output = violation; the unstamped placeholder `0.0.0-unknown`, `1.2.3-dirty` and `1.2.3-1-gSHA` are all printed).
Run: **yes**, tag checkout empty; dirty, untagged and no-git trees each print one line; same on 6.3.3 (VR-3).

**SW-REL-RP-08 (MUST). CLI release assets are `<tool>-<os>-<arch>` raw static binaries (default; tarballs `<tool>-<version>-<arch>-linux-musl.tar.gz` are the override) plus `checksums.txt` in `sha256sum` format; `sha256sum --check --strict` passes on the downloaded set.**
Rationale: one mirror/installer shape across the fleet (GO-REL-08); archives need a deterministic-tar recipe.
Verify: `for p in linux-amd64 linux-arm64; do ls dist | grep -c -x -e "tool-$p"; done` (a `0` = violation) and `sha256sum --check --strict checksums.txt` (exit 0).
Run: **yes**, `i-misc/dist-good` prints `1`,`1`; `dist-bad` prints `1`,`0` (go-release-style name); tampered asset exit 1, clean exit 0 (VR-6). darwin/windows rows: unverified: read only.

**SW-REL-RP-09 (SHOULD). Tarball release assets are built with `tar --sort=name --mtime=@EPOCH --owner=0 --group=0 --numeric-owner` and `gzip -n`.**
Rationale: default `tar | gzip` embeds mtimes; digest changes per run.
Verify: build twice with a `touch` between and compare `sha256sum` of the two (same `uniq | awk` form as RP-06).
Run: **yes**, deterministic recipe identical, plain tar differs (VR-6).

**SW-REL-RP-10 (MUST). A static image is two-stage `FROM scratch`, non-root, exec-form entrypoint, with `swift sdk install ... --checksum` and a literal `swift:X.Y.Z` build stage; the running image exits per SW-CLI-01.**
Rationale: measured 16.9 MB vs 415 MB; no shell to exploit; the checksum is the only integrity gate on the SDK download.
Verify: `grep -L -e '^USER ' Dockerfile`, `grep -L -e '^FROM scratch' Dockerfile`, `grep -n 'swift sdk install' Dockerfile | grep -v -F -e '--checksum'` (each: output = violation), and `docker run --rm IMG --bogus` exits 64, `IMG --unreachable` 69.
Run: **yes**, `c-image/Dockerfile` empty on all three, `Dockerfile.nouser` lists itself, `Dockerfile.nosum` prints the install line; exits 0/64/69 on 6.4.0 and 6.3.3 (VR-7).

**SW-REL-RP-11 (SHOULD). Release workflows attest the checksum file, with OIDC permission, tags fetched, and every `uses:` pinned at a 40-hex SHA.**
Rationale: go-release GO-REL-11/12 shape; provenance exists in 2 of 40 corpus repos, so it is a differentiator, not a convention.
Verify: `grep -L -e 'id-token: *write' .github/workflows/release.yml`, `grep -L -e 'subject-checksums: *dist/checksums.txt' .github/workflows/release.yml`, `grep -L -e 'fetch-depth: *0' .github/workflows/release.yml` (each: output = violation) and `grep -rn -E -e 'uses:[[:space:]]*[^.[:space:]][^[:space:]]*@' .github/workflows | grep -v -E -e '@[0-9a-f]{40}[[:space:]]*$'` (output = unpinned action).
Run: **yes** for the greps (`i-misc/good` empty, `i-misc/bad` four hits); whether the attestation verifies is **no**: unverified: read only (no GitHub run).

**SW-REL-RP-12 (MUST). A manifest reachable from a release tag has no `path:`, `branch:` or `revision:` dependency.**
Rationale: M-L-20: resolution of a tagged library with any of them fails for every version-tag consumer (exit 1, `depends on an unstable-version package`).
Verify: `grep -rn --include='Package.swift' --include='Package@swift-*.swift' -e '\.package(path:' -e '\.package(name:[^)]*path:' -e 'branch:' -e 'revision:' .` (output = violation) and the publishability smoke test: `swift package resolve` in a consumer pinned by `file://` URL at the local tag (exit 0).
Run: **yes**, `d-pathdep/lib`, `libok`, `libbranch` print the line and their consumers exit 1; `libtwin` is empty and its consumer exits 0 (VR-11).

**SW-REL-RP-13 (MUST). Library tags are bare three-component SemVer (`X.Y.Z` or `X.Y.Z-pre.N`) or, for a binary-release repository, `vX.Y.Z` consistently; no one- or two-component tags and no word prefixes.**
Rationale: `1.3` resolves as 1.3.0 although the docs say it should not; `release-1.4.0` is silently ignored.
Verify: `git tag -l | grep -v -x -E -e '[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?'` (output = violation; for the `v` form use `v[0-9]+...`).
Run: **yes**, `f-tags/tl` prints `1.3`, `release-1.4.0`, `v1.0.0`; `d-pathdep/libok` empty (VR-12).

**SW-REL-RP-14 (MUST). Release tags are annotated.**
Rationale: lightweight tags are invisible to `git describe` without `--tags` and carry no tagger or date.
Verify: `git for-each-ref --format='%(objecttype) %(refname:short)' refs/tags | grep -v -e '^tag '` (output = lightweight tags).
Run: **yes**, `f-tags/tl` prints `commit 1.1.0`; `libok` empty (VR-12).

**SW-REL-RP-15 (MUST NOT). Never move, re-create or delete a pushed release tag; before pushing, the tag must not exist on the remote.**
Rationale: measured silent split: locked consumers keep the old revision, fresh consumers get the new one, both labelled `1.2.0`; no `retract`.
Verify: `git ls-remote --exit-code --tags origin "refs/tags/$TAG"` must exit 2 (exit 0 = tag exists = violation).
Run: **yes**, existing tag exit 0, absent tag exit 2 (VR-12).

**SW-REL-RP-16 (MUST). A library at 0.x tells consumers how to depend (`.upToNextMinor(from:)`) or moves to 1.0 before it has users who run `from:`; a breaking change is never released as a patch.**
Rationale: `from: "0.1.0"` resolved 0.3.0 across two breaking minors.
Verify: reading heuristic: README dependency snippet and `git tag -l` major component 0 (run: `git tag -l | grep -e '^0\.'`). The resolution behaviour itself was run (VR-13); the README check is a reading heuristic only.

**SW-REL-RP-17 (MUST). Before tagging a library or SDK, `swift package diagnose-api-breaking-changes "$LAST_RELEASE_TAG"` exits 0, from a checkout with tags; the bump size agrees with the report.**
Rationale: SW-GATE-01 step 4 with the correct baseline; exit 1 is both break and missing baseline.
Verify: the command (exit 0 pass), and on exit 1 `... 2>&1 | grep -e 'breaking change' -e 'Couldn.t get revision'` to tell the cases apart.
Run: **yes**, removed func exit 1, re-typed parameter exit 1, additive exit 0, missing tag exit 1 with `Couldn’t get revision`, on 6.4.0 and 6.3.3 (VR-10).

**SW-REL-RP-18 (SHOULD). Release builds run from a clean checkout of the tag with `fetch-depth: 0`, `Package.resolved` tracked and `--force-resolved-versions` (CLIs; SW-PKG-26/28/29), no `.build/release` hardcoded path (sibling M-N-04).**
Rationale: the stamp, the SBOM version and the reproducibility proof all read git state.
Verify: SW-PKG-29's `git diff --exit-code -- Package.resolved` after the build; `git status --porcelain` empty before the build. Run: **no** here (owned by SW-PKG and the sibling; reading heuristic for this dive).

## Verification runs

Every command ran inside the toolchain image through `~/.cache/research-lang/swift-tools/run.sh` (`swift:6.4` unless "6.3" is stated, `SWIFT_VERSION=6.3` for 6.3.3), builds with `--scratch-path "$SWIFT_SCRATCH/release-pipeline[/name]"`, fixtures under `FX/`. Exit codes in parentheses are the shell exit of the command named; where the check's signal is its output (empty = pass) the exit of the final `grep`/`awk` is secondary and stated only when it carries meaning.

**VR-1 Reproducibility (RP-06)**, fixture `FX/a-repro` (package `relcli`, ArgumentParser `exact: "1.8.0"`), scripts `FX/scripts/a2.sh`, `a2b.sh`, `build1.sh`, `s2.sh`.

```sh
sha256sum A B | cut -d' ' -f1 | uniq | awk 'END { if (NR != 1) print "NOT REPRODUCIBLE: " NR " distinct digests" }'
```

| Pair | Build exit | Output |
|---|---|---|
| 6.4.0 dynamic, same source, same scratch path (`out-samepath/relcli1` vs `2`) | 0, 0 | empty (pass); digest `6a98c18c0a47...` |
| 6.4.0, scratch path `same-1` vs `same-2` (`out-same`) | 0, 0 | `NOT REPRODUCIBLE: 2 distinct digests`; `cmp` 807 bytes differ |
| 6.4.0, source dir `a-repro` vs copy `pkgcopy` (`out-v/p1`, `p1-othersrc`) | 0, 0 | `NOT REPRODUCIBLE: 2 distinct digests` |
| 6.4.0 with `-file-prefix-map` (`out-v/pm1`, `pm2`) | 0, 0 | still differs |
| 6.4.0 with `-gnone`/`--strip-all` (`out-v/g1`, `g2`) | 0, 0 | differs; after `objcopy --remove-section .swift_modhash --remove-section .note.gnu.build-id`: `identical` |
| 6.3.3 dynamic, same path (`out-v/t63-1`, `t63-2`) | 0, 0 | empty (identical, `0d932662...`) |
| 6.4.0 static musl, same path (`out-static/relcli1`, `relcli2`) | 0, 0 | empty (`84ef5b48...`) |
| static, SDK re-installed (`r-orig` vs `r-reinstalled`, `r-reinstalled2`) | 0 | differ (`84ef5b48...`, `e54b9d3e...`, `6d0cc790...`) |
| static, SDK re-installed and mtimes fixed (`r-touch1`, `r-touch2`) | 0, 0 | empty (`0658cf54...` both) |
| Docker two-stage, no mtime fix (`out-image-relcli-1.2.3`, `-b`, `-c`) | 0 | `NOT REPRODUCIBLE`; digests `c7dd8db6...`, `abbe4d86...`, `731380a3...` |
| Docker two-stage with the `touch` step (`out-image-relcli-r1`, `r2`; also `-640`) | 0, 0 | empty (`b6b23cc5...`) |

A fresh `swift:6.4` container per build with a dynamic binary (`out-d/relcli.{1,2,3}`): identical.

**VR-2 SBOM normalisation (RP-05)**, `FX/out-samepath/cdx1.json`, `cdx2.json`, `FX/out-sbom/`.

```sh
N() { sed -E -e 's/urn:uuid:[0-9a-f-]{36}/urn:uuid:UUID/g' -e 's/[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:]{8}Z/TS/g' "$1" | sha256sum; }
{ N out-samepath/cdx1.json; N out-samepath/cdx2.json; } | uniq | awk 'END { if (NR != 1) print "SBOM DIFFERS BEYOND UUID/TIMESTAMP" }'
```

Green (same tree twice): empty; raw digests `1cd93e04...` vs `a8f06783...` differ. Red (`cdx1.json` vs the tagged `green` package's SBOM): `SBOM DIFFERS BEYOND UUID/TIMESTAMP`. The key-by-key diff of the two raw CycloneDX files lists only `/metadata/timestamp`, `/metadata/tools/components[0]/bom-ref`, `/serialNumber`; SPDX lists UUID-bearing `@graph` ids and `created`.

**VR-3 Stamping (RP-07)**, `FX/b-stamp` (git repo, tag `v1.2.3`, annotated), clones `FX/bv/{green,dirty,untagged,nogit}`, script `FX/scripts/b5.sh`:

```sh
TAG=v1.2.3
swift run -c release --scratch-path "$SWIFT_SCRATCH/release-pipeline/bv-$1" relcli --version 2>/dev/null | grep -v -x -F -e "${TAG#v}"
```

| Variant | Output | grep exit | Verdict |
|---|---|---|---|
| green (tag checkout) | none | 1 | pass |
| dirty (one appended comment line) | `1.2.3-dirty` | 0 | red |
| untagged (one commit after the tag) | `1.2.3-1-g95447aa` | 0 | red |
| nogit (copy without `.git`, no version file) | `0.0.0-unknown` | 0 | red |

Identical outcomes with `SWIFT_VERSION=6.3` (6.3.3). Engine checks (`FX/scripts/b3.sh`, `b4.sh`, `bm.sh`): `RELCLI_VERSION=9.9.9` with swiftbuild prints `1.2.3-dirty`, with native `9.9.9`; `.relcli-version` incremental 9.9.9 then 8.8.8 on both engines; manifest-env C define `1.2.3` then `2.0.0` on both. The first plugin attempt with `.prebuildCommand` exited 1: `error: a prebuild command cannot use executables built from source, including executable target 'StampTool'`.

**VR-4 Pin (RP-01..03)**, `FX/g-pin/{good,bad,missing}`, scripts `FX/scripts/g1.sh`, `g2.sh`:

```sh
grep -L -x -E -e '[0-9]+\.[0-9]+\.[0-9]+' .swift-version
read -r V < .swift-version
grep -rn --include='Dockerfile*' --include='*.yml' --include='*.yaml' -e 'swift:' . | grep -v -F -e "swift:$V"
swift --version | grep -F -e 'Swift version' | grep -v -F -e "Swift version $P ("      # P=${V%.0}
```

| Fixture | RP-01 output | RP-02 output |
|---|---|---|
| `good` (`6.4.0`, `FROM swift:6.4.0`, `container: swift:6.4.0-noble`) | none | none |
| `bad` (`6.4`, `FROM swift:latest`, `container: swift:6.3`) | `.swift-version` | `./.github/workflows/ci.yml:3: container: swift:6.3` and `./Dockerfile:1:FROM swift:latest AS build` |
| `missing` (no file) | `grep: ... No such file` (exit 2) | read error |

RP-02 on the c-image files: `Dockerfile.pinned` (literal `FROM swift:6.4.0`) none; `Dockerfile` (`FROM swift:${SWIFT_TAG}`) prints its `FROM` line (the documented ARG false positive). `grep -L` exit status is inverted between greps (exit 0 with no output on the good file, exit 1 with the file name on the bad one on this grep version), so the output is the signal.

RP-03 (`FX/scripts/g2.sh`): image 6.4 + pin 6.4.0 none; 6.4 + 6.3.3 `Swift version 6.4 (swift-6.4-RELEASE)`; image 6.3 + 6.4.0 `Swift version 6.3.3 (swift-6.3.3-RELEASE)`; 6.3 + 6.3.3 none.

**VR-5 SBOM tag and flags (RP-04)**, `FX/scripts/sbomchk.sh`, `FX/out-sbom/`, `FX/i-misc/`.

```sh
TAG=v1.2.3; grep -L -F -e " : \"$TAG\"" ./*.json
grep -rn --include='*.sh' --include='*.yml' --include='Makefile' -e 'generate-sbom' -e 'build-system native' -e 'static-swift-stdlib' i-misc/bad
```

Tagged SBOMs (`out-sbom`, both CycloneDX and SPDX): empty. Untagged (`out-samepath`, four files): lists all four. Wrong tag `v1.2.4`: lists both. Flags grep: `i-misc/bad/release.sh:3` and `:4`, `i-misc/good` none. Build facts: 6.4.0 `--sbom-spec` exit 0; 6.3.3 exit 64 `error: Unknown option '--sbom-spec'`; with `--target` exit 1; `cyclonedx2` exit 64.

**VR-6 Assets, checksums, archives (RP-08/09)**, `FX/h-dist`, `FX/i-misc/dist-{good,bad}`.

```sh
sha256sum --check --strict SHA256SUMS         # clean: relcli-1.2.3-x86_64-linux-musl.tar.gz: OK, exit 0
printf 'x' >> relcli-1.2.3-x86_64-linux-musl.tar.gz; sha256sum --check --strict SHA256SUMS   # FAILED, exit 1
for p in linux-amd64 linux-arm64; do ls dist | grep -c -x -e "tool-$p"; done
```

Clean exit 0; tampered `FAILED`, `WARNING: 1 computed checksum did NOT match`, exit 1. `dist-good` prints `1` `1`; `dist-bad` (`tool_1.2.3_linux_amd64`, `tool-linux-amd64`) prints `1` `0`. Deterministic tar digest `8db238166948` twice (before and after a `touch`), plain `tar | gzip` `d6606a53eea0` then `5d6bc4a28322`.

**VR-7 Image (RP-10)**, `FX/c-image/{Dockerfile,Dockerfile.pinned,Dockerfile.nouser,Dockerfile.nosum,Dockerfile.slim}`.

```sh
docker build --build-arg VERSION=1.2.3 -t relcli-fixture:1.2.3 .          # exit 0 (6.4.0, 6.3.3, 6.4.0-literal)
docker run --rm relcli-fixture:1.2.3 --version                              # 1.2.3, exit 0
docker run --rm relcli-fixture:1.2.3 --unreachable                          # exit 69
docker run --rm relcli-fixture:1.2.3 --bogus                                # Error: Unknown option '--bogus', exit 64
grep -L -e '^USER ' Dockerfile                  # none         ; Dockerfile.nouser -> prints the file
grep -n 'swift sdk install' Dockerfile | grep -v -F -e '--checksum'   # none ; Dockerfile.nosum -> 8:RUN swift sdk install "$SDK_URL" \
```

6.3.3 build (`SWIFT_TAG=6.3`, SDK `swift-6.3.3-RELEASE`, checksum from `releases.json`): `--version` `1.2.3` exit 0, `--unreachable` 69, `--bogus` 64; image 18.9 MB. `swift:6.4-slim` dynamic image (`Dockerfile.slim` as first built, before its tags were made literal): 415 MB, `--version` `1.2.3`. `docker run --entrypoint /bin/sh` fails (no shell).

**VR-8 Provenance greps (RP-11)**, `FX/i-misc/{good,bad}/.github/workflows/release.yml`:

```sh
grep -L -e 'id-token: *write' .github/workflows/release.yml     # good: none ; bad: lists file
grep -L -e 'subject-checksums: *dist/checksums.txt' .github/workflows/release.yml
grep -L -e 'fetch-depth: *0' .github/workflows/release.yml
grep -rn -E -e 'uses:[[:space:]]*[^.[:space:]][^[:space:]]*@' .github/workflows | grep -v -E -e '@[0-9a-f]{40}[[:space:]]*$'
```

`good`: all empty. `bad`: three files listed and `bad/.github/workflows/release.yml:4:      - uses: actions/checkout@v4`. Attestation behaviour on GitHub: **not run** (unverified: read only).

**VR-10 API breakage (RP-17)**, `FX/e-api/{base,red,red-sig,green,stale}`, script `FX/scripts/e1.sh`, `e2.sh`:

```sh
swift package --scratch-path "$SWIFT_SCRATCH/release-pipeline/e-red" diagnose-api-breaking-changes 1.0.0
```

| Variant | Output line | Exit 6.4.0 | Exit 6.3.3 |
|---|---|---|---|
| `red` (removed `shout`) | `1 breaking change detected in Greeter:` / `API breakage: func shout(_:) has been removed` | 1 | 1 |
| `red-sig` (String to Substring) | `API breakage: func greet(_:) has parameter 0 type change from Swift.String to Swift.Substring` | 1 | not rerun |
| `green` (added `whisper`) | `No breaking changes detected in Greeter` | 0 | 0 |
| baseline `9.9.9` | `error: Couldn’t get revision ‘9.9.9^{commit}’: fatal: Needed a single revision` | 1 | 1 |
| tagless clone (`--no-tags`), baseline `1.0.0` | the same error | 1 | 1 |
| `stale` with a cached `--baseline-dir` from 1.0.0, baseline 1.1.0 | `1 breaking change detected` (correct) | 1 | 1 |

**VR-11 Path dependencies (RP-12)**, `FX/d-pathdep/{helper,lib,libok,libbranch,libtwin,app-out,app-in,app-out-branch,app-in-branch,app-branch,app-twin,app-local}`, script `FX/scripts/d1.sh`.

```sh
swift build --scratch-path "$SWIFT_SCRATCH/release-pipeline/d-app-out"        # in the consumer
grep -rn --include='Package.swift' --include='Package@swift-*.swift' -e '\.package(path:' -e '\.package(name:[^)]*path:' -e 'branch:' -e 'revision:' lib
```

| Consumer | Library | Exit | Message |
|---|---|---|---|
| `app-out` (`from: "1.0.0"`, URL) | `lib` (`path: "../helper"`) | **1** | `... is required using a stable-version but 'lib' depends on an unstable-version package 'helper'.` |
| `app-in` | `libok` (`path: "Vendored/Inner"`) | **1** | same, package `inner` |
| `app-branch` | `libbranch` (`branch: "main"` dependency) | **1** | same, package `libtwin` |
| `app-out-branch` (`branch: "main"`) | `lib` | **1** | `package 'lib' is required using a revision-based requirement and it depends on local package 'helper', which is not supported` |
| `app-in-branch` | `libok` | **1** | same, `inner` |
| `app-twin` | `libtwin` (helper as a second target) | **0** | `Build complete!` |
| `app-local` (root `path: "../lib"`) | `lib` with `../helper` | **0** | `Build complete!` |

6.3.3 reproduces the first two rows. The grep prints a line for `lib`, `libok`, `libbranch` (exit 0) and nothing for `libtwin` (exit 1).

**VR-12 Tags (RP-13/14/15)**, `FX/f-tags/tl`, `FX/d-pathdep/libok`.

```sh
git tag -l | grep -v -x -E -e '[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?'
git for-each-ref --format='%(objecttype) %(refname:short)' refs/tags | grep -v -e '^tag '
git ls-remote --exit-code --tags origin "refs/tags/$TAG"
```

`tl`: `1.3`, `release-1.4.0`, `v1.0.0` and `commit 1.1.0`; `libok`: nothing from either (grep exit 1). `ls-remote` for the existing `1.2.0`: exit 0; for absent `9.9.9`: exit 2. Resolution table of section 8 from `FX/scripts/f1.sh`, `f2.sh`, `f3.sh` (all resolves exit 0, `from: "1.0.0"` -> 1.3.0).

**VR-13 0.x**, `FX/f-tags/z0`: `from: "0.1.0"` resolved 0.3.0; `.upToNextMinor(from: "0.1.0")` resolved 0.1.0 (both exit 0).

No verification that was proposed failed to go red. Not run: `gh attestation verify`, any GitHub Actions behaviour, `swiftly` itself, `swift package compute-checksum`, any macOS or Windows step, a registry publish.

## Exemplar evidence

| Candidate | Satisfies | Violates / contradicts |
|---|---|---|
| RP-01 exact pin file | swiftly@c8cf2e35bfca:.swift-version (`6.4.0`), swift-package-manager@5546f44a3b52:.swift-version (`6.4.0`), containerization@3e7bc39e66b3:.swift-version (`6.3.0`), swift-build@2187330e13e7:.swift-version (`6.2.0`) | swift-embedded-examples@119b29f83550:.swift-version is `main-snapshot-2026-09-10`: a snapshot selector, legitimate for nightly legs, not an `X.Y.Z` pin (the rule scopes the exact-patch requirement to release jobs) |
| RP-02 image tag equals the pin | containerization derives the image from the file: apple/containerization@3e7bc39e66b3:.github/workflows/linux-build.yml:29-36 and containerization-build-template.yml:34-49 | swiftlang/github-workflows@0.0.15 `soundness.yml:21,29` default `swift:6.3-noble` (a moving tag, prior line); SW-GATE-08 notes swift-nio's HEAD is not a fixed point of either formatter |
| RP-04/05 SBOM | hummingbird has `sbom-generator.yml` (audit, Release engineering table: 1 of 40 matches `sbom`); SwiftPM generates it natively since 6.4 (SE-0509) | 39 of 40 repos publish no SBOM; tuist's `attest-build-provenance` is on a non-CLI workflow |
| RP-07 stamping | container: `git describe --tags --always` into a manifest `.define("RELEASE_VERSION", ...)` (container@f70ecbb926d9:Makefile:26, Package.swift:23-24,616-617), same mould as recipe B | SwiftLint and SwiftFormat `sed` a tracked template (SwiftLint@ec4691d9e813:.github/workflows/release.yml:51-55; SwiftFormat@fbc07aca5373:.github/workflows/release.yml:12-13), dirtying the tree; swiftly hardcodes `suffix: "dev"` (swiftly@c8cf2e35bfca:Sources/SwiftlyCore/SwiftlyCore.swift:5), so source builds are always `-dev` |
| RP-08 assets | swiftly tarball `swiftly-<version>-<arch>.tar.gz` (BuildSwiftlyRelease.swift:292-294), SwiftFormat zips and artifactbundle (release.yml:92-98), SwiftLint artifactbundle with checksum in `Package.swift:260-265` | none uses raw `<tool>-<os>-<arch>` + `checksums.txt`; the pinned default follows go-release, not the Swift corpus, so it is a fleet decision, not an ecosystem convention. swiftly and tuist check the static SDK download's sha256 in their release tooling (BuildSwiftlyRelease.swift:226-228; tuist@2f6ac74754bf:mise/tasks/cli/bundle-linux.sh:25-64) |
| RP-10 `swift sdk install --checksum` | tuist `bundle-linux.sh:25-64`, swiftly `BuildSwiftlyRelease.swift:212-283`, SwiftLint `release.yml:151` (installs from the swift.org URL) | tuist pins Swift 6.2.3 and SDK bundle `static-linux-0.0.1` while 6.4.0's is `static-linux-0.1.0` (audit): the checksum pins behaviour, not any doc |
| RP-12 no `path:` in tagged libraries | libok-style in-package targets are the corpus norm for libraries (swift-log, swift-argument-parser have no remote or path deps) | swiftly pins SwiftFormat `exact: "0.49.18"` (swiftly@c8cf2e35bfca:Package.swift:36) as a *root* dependency, which is allowed |
| RP-13 tag shape | SwiftLint publishes `0.65.1` (bare; SwiftLint@ec4691d9e813:Package.swift:263), swift-log's fixture tags `1.15.0`, `1.16.1` are bare (audit E5) | the audit could not measure tag style over the 40 (depth-1 clones carry no tag list): **unmeasured** for the corpus; SwiftPM's own `v` stripping is source-confirmed |
| RP-17 API gate | the shared workflow runs it with tags fetched (soundness.yml:143-149) | default baseline = PR base branch (soundness.yml:161-164), not the last release tag; SwiftPM itself and other repos set `api_breakage_check_baseline` or not (not traced) |
| SSWG bar | the incubation page itself | not enforced by tooling; nothing in the corpus checks it |

## AI-agent angle

What a model characteristically gets wrong here, and the smallest mechanical check that catches it (checks use the shapes above):

| Mistake | Why it compiles/looks fine | Catch |
|---|---|---|
| Writes `.swift-version` as `6.4` or `latest`, or `FROM swift:latest` / `swift:6.4` | passes locally, floats in CI | RP-01 `grep -L -x -E`, RP-02 `grep -v -F -e "swift:$V"` |
| Compares `swift --version` against `6.4.0` and "fixes" the pin to `6.4` | the compiler prints `6.4` for 6.4.0 | RP-03 with `${V%.0}` |
| `swift build -c release --static-swift-stdlib` then `FROM scratch` | the build fails to link under the default engine, or `--build-system native` is silently chosen (deprecated) | RP-04(a) grep for `static-swift-stdlib` and `build-system native`; sibling's SDK recipe |
| Copies `.build/release/tool` into the image | Swift Build writes to `out/Products/Release-...`; the path does not exist | `swift build --show-bin-path` (sibling M-N-04) |
| Stamps with `RELCLI_VERSION=... swift build` read inside a plugin; or hardcodes `let version = "1.0.0"`; or `#if DEBUG` "dev" | works on the native engine; silent wrong value on Swift Build | RP-07: `swift run -c release tool --version | grep -v -x -F -e "${TAG#v}"` |
| Uses `.prebuildCommand` with a source-built tool | looks like the documented pattern | the build error itself; use `.buildCommand` |
| Treats `swift package generate-sbom` as the release SBOM and looks for it under `.build` | no accuracy flag at the call site | RP-04(a) grep; check the path with `--sbom-output-dir` |
| Gates a pipeline on SBOM sha256, or "fixes" non-reproducibility by deleting the double build | SBOM carries UUIDs and timestamps | RP-05 normalised compare |
| Assumes the manifest `name:` becomes the SBOM component name | it is the checkout directory | read the asset name the pipeline sets, not the internal name |
| Claims reproducible builds because Swift is deterministic, after building in two different directories or re-installing the static SDK | true only for fixed paths and fixed SDK mtimes | RP-06 `sha256sum | uniq | awk` in the release job |
| `docker build` without `--checksum` on `swift sdk install`, or `USER root` | the SDK install works either way | RP-10 greps |
| Tags `v1.2`, `1.2`, `release-1.2.0`, or a lightweight tag, or `git tag -f` / `git push --force origin TAG` to "fix the release" | SwiftPM happily reads `1.2` as 1.2.0 | RP-13, RP-14, RP-15 |
| Adds `.package(path: "../Shared")` or `branch: "main"` to a library "temporarily" and tags it | resolves for the author | RP-12 grep and the `file://` consumer smoke test |
| Ports cargo/go ideas: `--locked` (exit 64), a `retract` stanza, "yank", `cargo publish` for a package | wrong tool | `swift package resolve --help`; SW-PKG-28 names `--force-resolved-versions` |
| Releases 0.x with a breaking minor and a `from:` README snippet | no SemVer guard at 0.x | RP-16 (resolution measured; README check is reading) |
| Runs the API gate against `main` or the PR base and calls it a release check; or on a shallow clone, reads exit 1 as "API broke" | the shared workflow's default | RP-17 grep for the two message forms; baseline is the last tag |
| Invents flags: `swift build --sbom`, `swift package generate-sbom --format cyclonedx`, `swift build --reproducible`, `swift package release` | none exists in 6.4.0 | `swift build --help | grep -e sbom`; exit 64 `Unknown option` is the tell |
| Believes the docs: "tags with fewer than three components are not semantic versions" | docs and behaviour disagree | RP-13 grep |

## Contested / evolving

- **SBOM format.** SwiftPM writes CycloneDX 1.7 and SPDX 3.0.1 and promises only the newest minor of each major (SE-0509): a CycloneDX 1.8 or SPDX 3.1 release removes 1.7 / 3.0 from SwiftPM. The Static Linux SDK still ships SPDX 2.3. go-release publishes SPDX; the Swift corpus publishes almost nothing. Trend (Swift 6.4, 2026-09): native generation arrived; validation is skipped in the shipped toolchain (schemas bundle not found warning). Format choice here is a default, not settled practice. SBOM consumer tool support was not measured.
- **Build engine.** 6.4 made Swift Build the default and deprecated `--build-system native`; the native engine still passes environment to plugins and still builds `--static-swift-stdlib` Foundation CLIs, so some pipelines will keep `native` for a while (aws-lambda-runtime pins it, audit). Whether the environment-to-plugin gap is a bug or intended is not documented ("unverified": no SwiftPM issue read); the fix direction is unknown. Do not depend on it either way.
- **Reproducibility.** No Swift primary source states bit-for-bit reproducibility as a goal. The measured behaviour (fixed paths and SDK mtimes) may change with Swift Build or an SDK 0.2.0; the Static SDK is labelled `0.1.0`. Re-measure on each toolchain bump (a step of the `swift-upgrade` skill).
- **Tag prefix.** SwiftPM accepts `v` and bare; Apple, Point-Free and SwiftLint use bare; go-release and the fleet's mirrors use `v`. Trend: no change; the lenient parser (`1.3` accepted) contradicts the docs and could be tightened, which would break any consumer relying on it.
- **Docs vs behaviour on two-component tags** (6.3.3 and 6.4.0 both accept them) and on SBOM paths (docs `<build_output>/sboms`, reality `out/Products/<cfg>/sboms/`).
- **The shared workflow's API baseline** (PR base, not last tag) and its `swift:6.3-noble` default image are the current practice of 22 corpus repos; the release-tag baseline is this dive's recommendation, not the ecosystem's.
- **Path dependencies.** A SwiftPM monorepo story for several libraries (one repo, several packages) is open; the only supported answers today are multi-target packages or separately tagged packages (swift-evolution has monorepo discussions; none read).
- **SSWG.** The incubation process page is the current bar; the 30-day new-Swift rule and the two-version CI rule interact with the pin policy (a pinned patch plus a nightly leg satisfies "two latest" only if the matrix also lists the previous release).

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://www.swift.org/sswg/incubation-process.html | SSWG incubation process: maturity levels, minimal and graduation requirements (SemVer, 30-day Swift support, release methodology) | current, 2026-10-10 | the only official tagging and maturity bar for Swift server libraries (primary) |
| https://raw.githubusercontent.com/swiftlang/swift-package-manager/main/Sources/PackageManagerDocs/Documentation.docc/GeneratingSBOMs.md | SwiftPM guide to `--sbom-spec`, `generate-sbom`, output dir, env vars | Swift 6.4 | exact flags and the Swift Build vs native accuracy statement (primary) |
| https://raw.githubusercontent.com/swiftlang/swift-package-manager/main/Sources/PackageManagerDocs/Documentation.docc/Package/PackageGenerateSBOM.md | command reference for `swift package generate-sbom` | Swift 6.4 | full option list incl. `--sbom-filter`, `--sbom-warning-only` (primary) |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0509-swift-sboms-via-swiftpm.md | SE-0509, SBOM generation for SwiftPM, Implemented (Swift 6.4) | 2025-11 to 2026-09 | design: CycloneDX 1.7 / SPDX 3.0.1, newest-minor-only policy, timestamped files, non-overwrite (primary) |
| https://raw.githubusercontent.com/swiftlang/swift-package-manager/main/Sources/PackageManagerDocs/Documentation.docc/ReleaseNotes/6.4.md | SwiftPM 6.4 release notes: Swift Build default, `--show-bin-path`, SBOM, `--static-swift-stdlib` error | Swift 6.4 | what changed in the build engine that breaks release scripts (primary) |
| https://raw.githubusercontent.com/swiftlang/swift-package-manager/main/Sources/PackageManagerDocs/Documentation.docc/Package/PackageDiagnoseAPIBreakingChange.md | command reference for `diagnose-api-breaking-changes` | Swift 6.4 | `--baseline-dir`, `--regenerate-baseline`, `--breakage-allowlist-path`, treeish semantics (primary) |
| https://raw.githubusercontent.com/swiftlang/swift-package-manager/main/Sources/PackageManagerDocs/Documentation.docc/Dependencies/AddingDependencies.md | SwiftPM docs on tags as SemVer and local dependencies | Swift 6.4 | the statement about three-component tags that the behaviour contradicts; "local dependencies do not enforce version constraints" (primary) |
| https://raw.githubusercontent.com/swiftlang/swift-package-manager/main/Sources/PackageManagerDocs/Documentation.docc/ResolvingPackageVersions.md | SwiftPM docs on `Package.resolved` | Swift 6.4 | lockfile semantics behind the moved-tag split (primary) |
| https://www.swift.org/documentation/articles/static-linux-getting-started.html | Static Linux SDK guide: install with `--checksum`, version match, SDK SBOM | Swift 6.4 | the pinned download URL, checksum rule and shipped component list (primary) |
| https://www.swift.org/api/v1/install/releases.json | swift.org release metadata incl. per-release `static-sdk` checksum | rolling, read 2026-10-10 | machine-readable SDK checksums for 6.3.1 to 6.4.0 (primary) |
| https://www.swift.org/blog/swift-6.4-released/ | Swift 6.4 release announcement | 2026-09-14 | confirms SBOM generation shipped in 6.4 (primary) |
| https://raw.githubusercontent.com/swiftlang/swiftly/main/Documentation/SwiftlyDocs.docc/use-toolchains.md | swiftly docs: `.swift-version` creation, lookup, global default | swiftly 1.x | the user-facing semantics, read with Use.swift (primary) |
| https://raw.githubusercontent.com/swiftlang/github-workflows/0.0.15/.github/workflows/soundness.yml | the shared soundness workflow: API breakage, docs, format jobs | tag 0.0.15, 2026-08-24 | baseline default, tag fetching, default image (primary) |
| https://swiftpackageindex.com/add-a-package | Swift Package Index inclusion requirements | current | SemVer tag requirement for discovery (community-run, widely used) |
| https://reproducible-builds.org/docs/source-date-epoch/ | the SOURCE_DATE_EPOCH specification | stable | the epoch convention for archives and images |
| https://docs.docker.com/build/ci/github-actions/reproducible-builds/ | Docker guide: reproducible image builds | current | image-level timestamp handling (not run here) |
| https://docs.docker.com/build/metadata/attestations/sbom/ | Docker BuildKit SBOM attestations | current | `--sbom=true` for images (not run here) |
| https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations | GitHub artifact attestations: `id-token`, `attestations`, `gh attestation verify` | current | provenance recipe for the release workflow (not run here) |
| https://github.com/bazelbuild/rules_swift/blob/main/doc/standalone_toolchain.md | rules_swift `swift_version_file` documentation (read at bazelbuild/rules_swift@50450ed24dde:doc/standalone_toolchain.md:94-101) | rules_swift 4.2.1 | a second consumer of the `.swift-version` convention |
| swiftly@c8cf2e35bfca:Sources/Swiftly/Use.swift and Sources/SwiftlyCore/ToolchainVersion.swift (exemplar corpus) | source of the `.swift-version` lookup and selector grammar | 2026-10-10 | exact semantics (primary, tool's own repository) |
| swift-package-manager@5546f44a3b52:Sources/{Basics/Version+Extensions.swift, PackageGraph/Resolution/..., SBOMModel/...} (exemplar corpus) | SwiftPM source for tag parsing, resolver messages, SBOM naming and timestamps | 2026-10-10 | the cause behind each measured behaviour (primary) |
| apple/containerization@3e7bc39e66b3:.github/workflows/linux-build.yml and .swift-version (exemplar corpus) | CI image derived from `.swift-version` | 2026-10-10 | the single-source pin in practice |
| realm/SwiftLint@ec4691d9e813, nicklockwood/SwiftFormat@fbc07aca5373 release workflows and Package.swift (exemplar corpus) | release asset naming, artifact bundle with `binaryTarget` checksum, `sed` stamping | 2026-10-10 | Swift CLI release practice to compare with the pinned default |
| /home/mherwig/dev/grimoire-lore/.agents/worktrees/swift/skills/go-release/SKILL.md and rules/go-modules/release.md | this repository's go-release skill and GO-REL rules | 2026-09-26 | the runbook shape and asset convention being mirrored |
| swift-audit/exemplar-packaging-and-release.md and swift-topic-map/ecosystem-tooling.md (this repository) | the audit and the eco scout this dive builds on | 2026-10-10 | E3/E4/E7/E8 fixtures, Release engineering table, P6 SBOM probe |
