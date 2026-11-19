---
name: swift-package-reference
description: Depth files behind the swift-package rule, loaded on demand. Use when the swift-package rule routes you to a depth file, or when a task cites a rule ID the index only summarises.
license: Apache-2.0
metadata:
  summary: Depth files behind the swift-package rule
  keywords: swift,swiftpm,package,manifest,swift-format,swiftlint,release,reference
  claude.user-invocable: "false"
---

# swift-package-reference

Depth for the `swift-package` rule, installed with it. The rule index says which file fits the task. Read that one file; do not read the set.

| File | Holds |
|---|---|
| [gates.md](gates.md) | done-gate, swift-format and SwiftLint configs, warning control, API-breakage, DocC, TSan and CI-matrix gates |
| [manifest.md](manifest.md) | dependency requirements and pins, traits, tools version, language mode, platforms, versioned manifests, lock hygiene |
| [release.md](release.md) | toolchain pin, static Linux SDK build, glibc floor, stripping, SBOM, version stamping, checksums, tags |
