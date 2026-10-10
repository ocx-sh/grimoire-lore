# swift-essentials

The OCX Swift set in one install: two rules for the files you edit and three skills for occasional procedures. It also carries the comment rule and cleanup skill shared by every language set.

```sh
grim add ghcr.io/ocx-sh/lore/swift-essentials
```

| Member | Kind | Covers |
|---|---|---|
| `swift-quality` | rule | 24 non-negotiables and 260 rules, 157 of them merge-blocking, across ten depth files: the language era, concurrency and isolation, errors, library and SDK API design, testing, the CLI contract, files and processes, networking, security, and Apple-platform apps. Installed on `**/*.swift` |
| `swift-package` | rule | 12 non-negotiables and 89 rules, 40 of them merge-blocking, across three depth files: the manifest, the gates with the pinned format and lint configs, and release builds. Installed on 8 globs, from `**/Package.swift` to `**/.spi.yml` |
| `swift-upgrade` | skill | An eleven-step, order-sensitive procedure to move a package to Swift 6 mode, an upcoming feature or a new toolchain, with six stop conditions and 17 dated re-checks |
| `swift-diagnose` | skill | Consent-gated, symptom-routed diagnosis through a 26-row route table keyed by exit code plus first stderr line, across crashes, hangs, races and type-check failures |
| `swift-release` | skill | A twelve-step gate-ordered runbook to tag and prove a release, for a CLI's static Linux binaries or a library's SwiftPM tag, built around the permanence of a pushed tag |
| `code-docs` | rule | Fifteen non-negotiables across five depth files: the guard floor, where each clause of a comment goes, record pointers and process IDs, doc text that renders into help and schemas, and the length caps. Shared by every language set |
| `code-docs-cleanup` | skill | A ten-step, guard-first procedure for shortening existing comments, gated by a structural diff check and a cold reason re-check per shortened guard |

## The premise

Swift's default toolchain does not gate what it looks like it gates. `swift format lint` without `--strict` exits 0 on findings. A misspelt upcoming-feature name exits 0 and turns the feature off. `swift package migrate` exits 0 on a manifest that a `Package@swift-X.swift` file shadows. A trap exits 132 for six different reasons.

A class holding a `var` built clean under `-warnings-as-errors` and lost 128,131 of 400,000 increments.

So the set trusts a command run on the tree over any page that describes it. It states which toolchain every claim was watched on. It was measured 2026-10-10 against a 40-repository upstream corpus on Swift 6.4.0 and 6.3.3, with a `swift:6.2.0` floor leg for libraries. macOS, Xcode, Windows and Wasm rows are `unverified: read only`.

## Why two rules and not one

The globs differ, which is the only thing that justifies a second rule file. A `.swift` edit is not a `Package.swift` edit. Loading the release engineering and lint-config depth while you touch a function body is pure cost.

So the split follows what the file under edit is. `swift-quality` carries the source standards and loads on `**/*.swift`. `swift-package` carries what a package and its build config claim about themselves. No compiler checks those files. It loads on the manifest, the lock file and the tool configs.

Workflows, Dockerfiles, `.xcconfig` and `*.pbxproj` files are never globbed. The `swift-quality` index routes those tasks by keyword.

## Why three skills

`swift-upgrade`, `swift-diagnose` and `swift-release` run at three different triggers, none of them every edit. Once per language-mode or toolchain move. Once per failing process or test. Once per release.

Loading any of them on a routine edit would be dead context weight, so they carry no rules of their own. Each restates the merge-blocking rows it enforces as findings with rule IDs. A review run without the rules loaded still reports them correctly.

The skills use scripts that ship in the `swift-quality` `checks/` directory. Install the bundle rather than a skill alone.

## Pinned decisions

- Libraries and the SDK use tools 6.2 and an explicit Swift 6 mode. CLIs and servers use the current release, 6.4.
- swift-format at 4 spaces and 120 columns. SwiftLint only carries `custom_rules`.
- No `defaultIsolation(MainActor.self)` outside apps.
- The SDK depends on the standard library and swift-subprocess only.
- `.swift-version` holds one exact patch. Tags are `vX.Y.Z`.
- A CLI ships static musl binaries from the Static Linux SDK, stripped, with the unstripped twin kept as a CI artifact.
- The apple depth file is read-only until a macOS runner exists.

Each is a default an adopter overrides once, in the manifest or the copied CI. Never per file and never per call site.

## What is not in it

Bazel: a repository that adopts Bazel for Swift gets that from `bazel-quality`, which has a Swift depth file and never loads on `*.swift`. README and CHANGELOG prose belongs to `docs-quality`. The reference SDK package is not shipped.

The bundle names its members without a tag. It says these seven belong together. Your `grimoire.lock` is what freezes them.

## Siblings

- **`bazel-quality`**: `rules_swift` and the `rules_swift_package_manager` bridge, if you adopt Bazel for Swift.
- **`docs-quality`**: README, guide and changelog prose around a package.
- **`code-docs`**: doc comments in every language. Part of this bundle.
