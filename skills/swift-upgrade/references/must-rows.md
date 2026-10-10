# The MUST rows the swift-upgrade procedure enforces

Load this from the last section of swift-upgrade. Merge-blocking rows, restated as
findings so a review without the rule files loaded still reports them with the right
ID. Rule text and verification live in the rule sets.

| # | Finding | Rule |
|---|---|---|
| 1 | A red check was turned green by weakening it, without a one-line written reason per item | SW-CORE-01 |
| 2 | A new check was relied on without a run on a planted violation and on its compliant twin | SW-CORE-02 |
| 3 | An empty grep or find result was trusted without a non-empty canary | SW-CORE-03 |
| 4 | A manifest was edited without the recorded floor, or without the `dump-package` proof afterwards | SW-CORE-04, SW-PKG-06 |
| 5 | A generated file was edited by hand | SW-CORE-05 |
| 6 | The upgrade added a hatch while a lower rung of the ladder applied | SW-CORE-10, SW-CONC-28 |
| 7 | `@unchecked Sendable` was added without a visible guard and a comment naming it | SW-CONC-01 |
| 8 | `nonisolated(unsafe)` was added without a one-line reason, or on a `var` without the lock named | SW-CONC-09 |
| 9 | `@preconcurrency import` was used outside the libc and OS shims, without a comment | SW-CONC-10 |
| 10 | `defaultIsolation(MainActor.self)` was set outside an app target | SW-CONC-11 |
| 11 | `NonisolatedNonsendingByDefault` was pasted into the manifest instead of migrated | SW-CONC-07 |
| 12 | `defaultSwiftSettings:` was written from the proposal text | SW-PKG-01 |
| 13 | A package-level `swiftLanguageModes: [.v5]` survived the flip | SW-PKG-14 |
| 14 | A form newer than the floor was added without a guard, or the floor leg is a floating tag | SW-LANG-03, SW-LANG-04 |
| 15 | An API named in a release note or proposal was written without compiling it on the floor and the current image | SW-LANG-05 |
| 16 | A release-toolchain leg lacks `-Xswiftc -warnings-as-errors` | SW-GATE-13 |
| 17 | A hatch lacks a comment naming its guard | SW-GATE-10 |
| 18 | A closure stored by `self` captures `self` without one of the two lifetime designs | SW-LANG-08 |
| 19 | The stdlib `FilePath` or an unconditional `import System` was written | SW-IO-01 |
| 20 | A SwiftLint `custom_rules` gate ran on the static binary or without the skip wrapper | SW-GATE-26 |
| 21 | A root that ships has a resolved pin below an advisory floor | SW-SEC-20 |
| 22 | `--static-swift-stdlib` is presented as the static recipe | SW-REL-03 |
