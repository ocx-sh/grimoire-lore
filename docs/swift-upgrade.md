# swift-upgrade

An order-sensitive procedure for moving a Swift library, SDK, CLI or server package. The target is Swift 6 language mode, an upcoming feature, or a new toolchain. It starts from a measured baseline and ends on a receipt. App targets are out of scope.

```sh
grim add ghcr.io/ocx-sh/lore/swift-upgrade
```

Run it when moving a package from Swift 5 to Swift 6 mode or fixing its Swift 6 concurrency errors. Run it when bumping the toolchain, `.swift-version` or `swift-tools-version`, enabling an upcoming feature such as `ExistentialAny`, or running `swift package migrate`. It needs both `swift-quality` and `swift-package` installed, because it cites their rule IDs and uses the scripts in the `swift-quality` `checks/` directory.

## The order is the product

Eleven steps, U0 to U10. A convenient order gives a green build that is quietly wrong, so five facts fix the sequence. Probe with flags, but change only through the manifest, because `-Xswiftc -swift-version 6` reaches dependencies and the manifest does not. A plain green build is not done. Done is `swift build --build-tests -Xswiftc -warnings-as-errors` exiting 0 on the current and the floor toolchain.

"No new hatches" is a delta, not a state. On an adopted tree the whole-tree scan prints the legacy hatches before and after. Only the added-lines check against the baseline commit tells a clean fix from a silenced one. The measured twin that silenced everything with `nonisolated(unsafe)` and `@unchecked Sendable` built green in Swift 6 mode with 13 added hatch lines. The ladder result added 0.

## What it does differently

`migrate` exiting 0 proves little. It exits 0 on a dirty tree and on a manifest that a `Package@swift-X.swift` file shadows. The proof is a feature count in `dump-package` after the edit. It handles exactly five names on 6.4 and 6.3.

`ExistentialAny`, `InferIsolatedConformances`, `MemberImportVisibility`, `NonisolatedNonsendingByDefault` and `StrictMemorySafety`. They go one per run, from a clean tree, in a fixed order. The flag is `--target`, and the `--targets` spelling from the official guide exits 64.

Diagnostics are counted as unique `file:line:col` entries from a fresh scratch directory each time. A reused scratch directory prints nothing for modules it already built, and that reads as zero. The counter prints `FAILED`, never 0, when the build fails without a diagnostic.

## Stop conditions

Six stop conditions, S1 to S6, mark where the lazy shortcut becomes the only way to green. The causes are:

- a dependency you do not own
- an API above the platform floor
- a frontend crash
- a `migrate` fix-it that adds `@concurrent` to public API
- a ladder class that does not lower the count
- a current leg and a floor leg that disagree

The skill stops and reports each one. It never adds a hatch or an `#if compiler` split to get past it.

## Dated re-checks

U10 ends with 17 dated re-checks. Each probe reports STILL while a pinned fact holds and FLIPPED when it no longer does. They cover accepted-but-unshipped proposals such as `withDeadline` and `defaultSwiftSettings:`, the `--static-swift-stdlib` fix, the `Skipping enabled rule` canary and the advisory floors. A FLIPPED result means the cited rules are stale. The skill reports it and does not quietly proceed.

## What agents get wrong by default

Measured 2026-10-10 on Swift 6.4.0 and 6.3.3, on a real package of 37 source files, 3 library and 2 test targets. Complete checking in Swift 5 mode gave 13 diagnostics. Swift 6 mode gave 0 warnings with `-warnings-as-errors` exit 0 and 0 added hatches.

The skill lists 13 failure patterns. Examples are silencing every error with `nonisolated(unsafe)`, using `-swift-version 6` as the migration, and removing `[.v5]` first. Others are reading `migrate` exit 0 as success and hard-coding `swift:6.4` in CI beside a `.swift-version` that says something else.

## Pinned decisions

Libraries and the SDK use tools 6.2, Swift 6 mode and a `swift:6.2.0` floor leg. CLIs and servers use the current release. `.swift-version` holds the exact patch. The hatch budget is 0 against the U0 commit. Each is a default an adopter overrides once, with the reason recorded.

## What it does not cover

Writing new concurrent code is the job of the rules. A crash, hang or slow type-check after the upgrade is `swift-diagnose`. Tagging and publishing is `swift-release`. macOS, Xcode projects, app targets with `defaultIsolation` and Windows are `unverified: read only`.

## Siblings

The procedure restates 22 merge-blocking findings, by rule ID, so a review that runs it without the rule sets loaded still reports them correctly. The rule text and verification stay with `swift-quality` and `swift-package`. Bundled with them as `swift-essentials`.
