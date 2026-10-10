# swift-package

Standards for the files a Swift compiler never checks: the manifest, the lock file, the format and lint configs, and the release build. It holds the gate, twelve merge-blocking non-negotiables and three depth files routed to by task.

```sh
grim add ghcr.io/ocx-sh/lore/swift-package
```

Loads on `**/Package.swift`, `**/Package@swift-*.swift`, `**/Package.resolved`, `**/.swift-format`, `**/.swiftformat`, `**/.swiftlint.yml`, `**/.swift-version` and `**/.spi.yml`. The index is 214 lines and always present. A depth file is read only when the work calls for it. It ships beside `swift-quality` in `swift-essentials`.

## It starts by reading which manifest is in effect

A `Package@swift-*.swift` file can shadow `Package.swift`. Then `swift package migrate` edits the dead file and exits 0, and the feature you thought you enabled is not there. `head -1 Package.swift` fails the same way, because the tools-version comment can sit on a later line.

So the first instruction is a command, not a rule. SW-PKG-06 lists the manifests, reads the tools version, and counts the language mode and the enabled features from `dump-package`. It runs before the first edit and again after it. Run it under `set -o pipefail`, or a toolchain below the manifest's tools version makes `jq` print nothing and the audit reads green.

## What agents get wrong by default, measured

Measured 2026-10-10 on Swift 6.4.0 and 6.3.3, SwiftLint 0.65.1 and Static Linux SDK 0.1.0, over a 40-repository upstream corpus. macOS, Xcode, Windows and Wasm rows are marked `unverified: read only`.

Agents copy habits that no longer build. `defaultSwiftSettings:` fails on 6.4 with `extra argument` and exit 1, because its proposal is accepted and unshipped. 15 of 38 corpus manifests declare tools below 6.2, and below 6.2 a manifest loses `treatWarning`. `--static-swift-stdlib` links on a toy and exits 1 with an undefined `Mutex` symbol once any Foundation symbol is reachable. The path `.build/x86_64-swift-linux-musl/release` does not exist on 6.4.0, so a `cp` from it exits 1.

Gates fail quietly. `swift format lint` without `--strict` exits 0 on findings. The static `swiftlint` binary exits 0 on a violating tree and prints one `Skipping enabled rule` line. Only 15 of 40 corpus repositories run the API-breakage check in a way that can fail, and only 12 of 40 gate on warnings as errors. A misspelt upcoming-feature name is ignored with exit 0.

## What is in it

The index carries the gate, twelve non-negotiables, the manifest skeleton and sixteen SW-PKG rules, thirteen of them merge-blocking. 89 rules in total, 40 of them merge-blocking, spread over three depth files. `manifest.md` holds the other 22 SW-PKG rows. `gates.md` holds 29 SW-GATE rows: the done-gate, the pinned `.swift-format` and `.swiftlint.yml` bodies, warning control, sanitizers, API-breakage and DocC. `release.md` holds 22 SW-REL rows: the toolchain pin, the static Linux SDK build, stamping, stripping, the SBOM, assets, attestation and library tags.

Every rule carries an ID, a rationale, a runnable verification and a severity. Each verification says which way empty output reads. A check nobody watched go red is a hypothesis (SW-CORE-02). The shipped wrapper `swiftlint-gate.sh` exists because of that. It exits 70 when SwiftLint prints `Skipping enabled rule`.

## Pinned decisions

Some rules encode an agreed decision rather than a derivable fact. They are marked pinned.

A new manifest declares tools 6.2 or later. A library and the SDK declare exactly 6.2, and a leaf CLI or server declares 6.4. Every target of a new package enables `ExistentialAny`, `MemberImportVisibility` and `InternalImportsByDefault` through one shared loop. `.swift-version` holds one exact patch. Tags are `vX.Y.Z`.

A CLI ships static musl binaries from the Static Linux SDK, stripped, with the unstripped twin kept as a CI artifact. The SBOM is CycloneDX only.

Each is a default an adopter overrides once, in the manifest or the copied CI. Never per target. Overriding one is a decision, recorded with its reason. Ignoring one is a violation.

## What it does not cover

Swift source is `swift-quality`, on `**/*.swift`. This rule never loads on a source edit. It also does not load on workflows, Dockerfiles, `.xcconfig` and `*.pbxproj` files. The routing table in the `swift-quality` index sends those tasks here by keyword instead.

It does not restate SwiftPM or the manifest API, which the model already knows. Windows, macOS notarization and arm64 hardware runs are read-only here.

## Siblings

`swift-quality` owns SW-CORE and the source families. It loads on `*.swift`, so a source edit never pays for this rule and a config edit always does.

`bazel-quality` has a Swift depth file for `rules_swift` if you adopt Bazel for Swift. `swift-upgrade`, `swift-diagnose` and `swift-release` are procedures that cite this set's rule IDs by number and never restate them. Bundled with `swift-quality` and `code-docs` as `swift-essentials`.
