# swift-quality

Standards for writing and reviewing Swift: the gate, twenty-four merge-blocking non-negotiables, and ten depth files routed to by task.

```sh
grim add ghcr.io/ocx-sh/lore/swift-quality
```

Loads on `**/*.swift`. The index is 206 lines and always present. A depth file is read only when the work calls for it. It ships beside `swift-package` in `swift-essentials`, and that rule owns the manifest, the lint and format configs and the release builds.

## It starts by reading the manifest and compiling the claim

Swift advice goes stale in one toolchain patch. `weak let` compiles on 6.2.3 and not on 6.2.2. The stdlib `FilePath`, `withDeadline` and `defaultSwiftSettings:` are accepted proposals that do not compile on 6.4 or 6.3. A blog post or a release note names all of them as if they shipped.

So the first instruction is not a rule about code. Read the manifest in effect (SW-PKG-06), because a `Package@swift-*.swift` file can shadow `Package.swift`. Then compile any API a source only names (SW-LANG-05). Every version-bound claim in the set carries the tool, the version and the date it was watched on.

## What agents get wrong by default, measured

Measured 2026-10-10 on Swift 6.4.0 and 6.3.3, with a `swift:6.2.0` floor leg for libraries, over a 40-repository upstream corpus. macOS, Xcode, Windows and Wasm rows are marked `unverified: read only`.

Generated Swift reaches for the habit that compiles quietly. 709 of 882 corpus `Task {}` are bare statements that nobody stores or cancels. 380 of 554 corpus `@unchecked` lines carry no comment. A class holding a `var` built clean under `-warnings-as-errors` on 6.3 and 6.4, then lost 128,131 of 400,000 increments.

75 of 78 corpus streams take the unbounded buffer default. One run of that default peaked at 416,220 KiB against 11,404 KiB with a bound.

Checks lie in both directions. `swift format lint` without `--strict` exits 0 with findings. A misspelt feature name such as `ExistentalAny` exits 0 and disables the feature. `.atomic` writes appear 129 times in 21 of 40 repositories, and none syncs the directory. A trap exits 132 for six different causes, so the exit code alone routes nothing.

## What is in it

The index carries the gate, twenty-four non-negotiables and the nineteen SW-CORE rules it owns outright. 260 rules in total, 157 of them merge-blocking, spread over ten depth files. The files cover the language era, concurrency, errors, API design, testing, the CLI contract, files and processes, networking, security and Apple apps.

Every rule carries an ID, a rationale, a runnable verification and a severity. Each verification says which way empty output reads. SW-CORE-02 requires every check to be watched red on a planted violation and green on its compliant twin before it is relied on. Twelve shipped scripts and data files sit in a `checks/` directory the rules name by path.

## Pinned decisions

Some rules encode an agreed decision rather than a derivable fact. They are marked pinned so a later reader does not re-argue them. Libraries and the SDK use tools 6.2 and an explicit Swift 6 mode. CLIs and servers use the current release, 6.4.

Formatting is swift-format at 4 spaces and 120 columns, and SwiftLint only carries `custom_rules`. No `defaultIsolation(MainActor.self)` outside apps. The SDK depends on the standard library and swift-subprocess only. A signal-killed child maps to 128 plus the signal number.

Each is a default an adopter overrides once, in the manifest or the shared config. Never per file or per call site. Overriding one is a decision, recorded with its reason. Ignoring one is a violation. Names from the reference fleet, such as `ocx` and `OcxSDK`, are examples the adopter renames.

## What it does not cover

No restatement of the language, the standard library or SwiftUI, which the model already knows. It names traps, not maps. Once a depth file is read, that file does not point at another.

It does not load on manifests, lint configs, workflows, Dockerfiles or `.pbxproj` files. The routing table in the index sends those tasks to `swift-package` or the right depth file by keyword. The Apple depth file is read-only. It holds greps and heuristics with no compile check until a macOS runner exists.

## Siblings

`swift-package` owns what a package declares and what fails its build. That is the tools version, dependencies, the format and lint configs, the gate's depth and release builds. It loads on the files this rule does not reach.

`bazel-quality` has a Swift depth file for `rules_swift` if you adopt Bazel for Swift. It never loads on `*.swift`. `code-docs` and `docs-quality` cover doc comments, READMEs and changelogs.

`swift-upgrade`, `swift-diagnose` and `swift-release` are procedures that cite this set's rule IDs by number and never restate them. Bundled with `swift-package` and `code-docs` as `swift-essentials`.
