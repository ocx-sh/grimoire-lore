# Upcoming features and migrate behaviour for steps U3 and U8

Load this from step U3 (the per-name probe loop) and step U8 (`migrate`). It holds
the compiler's own table of upcoming feature names, the probe loop, and what
`swift package migrate` does in each situation.

Measured 2026-10-10 on Swift 6.4.0 and 6.3.3 (Linux x86_64). `swift package
migrate` is introduced in Swift 6.2. The compiler's table was identical on both
toolchains. The per-name deltas come from one real package (swift-snapshot-testing
at `28e5de025e3f`, 5 mode, baseline 1 warning).

Contents: [The compiler's table](#the-compilers-table) ·
[The probe loop for U3](#the-probe-loop-for-u3) ·
[Measured deltas](#measured-deltas) ·
[What migrate does](#what-migrate-does) ·
[What migrate wrote on the measured package](#what-migrate-wrote-on-the-measured-package)

## The compiler's table

`swiftc -print-supported-features` is the machine-readable source. It prints JSON
with `upcoming`, `optional` and `experimental` lists. Read it again at every
toolchain bump, because names move from `enabled_in: "7"` to the default and more
names become migratable. Do not copy a name from a blog post or a forum thread
(SW-LANG-05).

| Name | Becomes default in | Migratable |
|---|---|---|
| The 15 Swift 6 group names below | Swift 6 | No |
| `ExistentialAny` | Swift 7 | Yes |
| `MemberImportVisibility` | Swift 7 | Yes |
| `InferIsolatedConformances` | Swift 7 | Yes |
| `NonisolatedNonsendingByDefault` | Swift 7 | Yes |
| `InternalImportsByDefault` | Swift 7 | No |
| `ImmutableWeakCaptures` | Swift 7 | No |
| `StrictMemorySafety` (listed as `optional`) | Never | Yes |

The 15 Swift 6 group names, whose manifest lines the flip deletes (SW-PKG-03):
`ConciseMagicFile`, `ForwardTrailingClosures`, `StrictConcurrency`,
`BareSlashRegexLiterals`, `DeprecateApplicationMain`, `ImportObjcForwardDeclarations`,
`DisableOutwardActorInference`, `IsolatedDefaultValues`, `GlobalConcurrency`,
`InferSendableFromCaptures`, `ImplicitOpenExistentials`, `RegionBasedIsolation`,
`DynamicActorIsolation`, `NonfrozenEnumExhaustivity` and
`GlobalActorIsolatedTypesUsability`.

`ImmutableWeakCaptures` names an upcoming flag. It is not the probe for the `weak
let` syntax, which arrived in Swift 6.2.3 (SW-LANG-03, SW-LANG-04).

## The probe loop for U3

Run this from the package root after sourcing the helper file of the skill's "Before
U0" (`. "${TMPDIR:-/tmp}/swift-upgrade/env.sh"`). `count` uses a fresh scratch
directory for every name, because a reused one prints nothing for modules it has
already built, and it builds the test targets too. The loop changes no file in the package.

```sh
for name in ConciseMagicFile ForwardTrailingClosures StrictConcurrency BareSlashRegexLiterals \
    DeprecateApplicationMain ImportObjcForwardDeclarations DisableOutwardActorInference \
    IsolatedDefaultValues GlobalConcurrency InferSendableFromCaptures ImplicitOpenExistentials \
    RegionBasedIsolation DynamicActorIsolation NonfrozenEnumExhaustivity \
    GlobalActorIsolatedTypesUsability; do
    echo "$name $(count "u3-$name" -Xswiftc -enable-upcoming-feature -Xswiftc "$name")"
done
```

Each line is a name and a count. Subtract the U0 baseline. A name with a delta of 0 is
not enabled in U4 and not worth a line in the manifest (it is deleted by the flip
anyway). Watched red and green (measured 2026-10-10): on a Swift 5 mode package with
one stored `static let` of a non-Sendable type, one mutable global and one `#file`
default argument passed to a `#filePath` parameter, the loop printed 1 for
`ConciseMagicFile`, 2 for `StrictConcurrency` and 1 for `GlobalConcurrency` on both
toolchains and 0 for the other twelve. Its baseline `count` was 0.

## Measured deltas

Per-name own-package warnings above the baseline, Swift 6.4, Swift 5 mode, on the
real package (sources only, measured before the counter included tests):

| Name | Delta |
|---|---|
| `StrictConcurrency` (complete checking) | +12 |
| `GlobalConcurrency` | +7 to +8 |
| `ConciseMagicFile` | +4 |
| The other twelve of the 15 | 0 |

Twelve of the 15 names added nothing. `ConciseMagicFile` is the one non-concurrency
name that had an effect, and the Swift migration guide's strategy page does not list
it (it lists only `DisableOutwardActorInference`, `GlobalConcurrency` and
`InferSendableFromCaptures`). Whole migration of that package, baseline to the folded
final tree: 10 files changed, +107 -69 lines, of which the manifest is +16.

## What migrate does

```text
$ swift package migrate --to-feature Bogus
error: Unsupported feature 'Bogus'. Available features: ExistentialAny, InferIsolatedConformances, MemberImportVisibility, NonisolatedNonsendingByDefault, StrictMemorySafety
$ swift package migrate --target A --to-feature GlobalConcurrency
error: Feature 'GlobalConcurrency' is not migratable
$ swift package migrate --targets A --to-feature ExistentialAny
error: Unknown option '--targets'. Did you mean '--target'?
```

All three exit 64 on both toolchains (the Bogus case and a two-target run watched
again 2026-10-10). A comma-separated `--target A,B` runs both targets in one call.

| Situation | Exit | Effect |
|---|---|---|
| Clean tree, green build | 0 | Builds, applies the fix-its, rewrites the manifest per target |
| Dirty tree | 0 | The fix-its and your edit coexist in `git status`. The clean-tree precondition is not enforced |
| Existing build error | 1 | No `migrate` edits |
| A bogus or a non-migratable name | 64 | No edits |
| `--targets` | 64 | No edits |
| `Package@swift-X.swift` in effect | 0 | Edits the dead `Package.swift`, enables nothing (SW-PKG-21, SW-CORE-04) |
| A second run of the same feature | 0 | Appends a second literal |
| A bare `swiftSettings: sharedVariable` | 1 | Rewrites sources, then fails (SW-PKG-18, SW-PKG-32) |
| `--scratch-path` with an existing directory | 0 | Accepted on both toolchains |

On a two-target package, `migrate --target A,B --to-feature ExistentialAny` applied 2
fix-its in 2 files and left `.enableUpcomingFeature("ExistentialAny")` literals inside
each target, outside the shared loop (exit 0, both toolchains, measured 2026-10-10).
`swift package dump-package | grep -c '"ExistentialAny"'` printed 2.

## What migrate wrote on the measured package

For `NonisolatedNonsendingByDefault`, 3 files changed (+17 -8). It wrote the
per-target literals and left the shared loop alone. It added `@concurrent` on
`public func withSnapshotTesting(operation:)` and `public func provideScope`
(stop condition S4: the skill reverts such a run and defers the feature),
`@concurrent` on their closure parameters, and `{ @concurrent in` on two closures. With the feature on, those two
closures call `TaskLocal.withValue(_:operation:isolation:file:line:)`, which 6.4
deprecates with "Prefer the 'nonisolated(nonsending)' overload". That gave two
`[#DeprecatedDeclaration]` warnings, so `-warnings-as-errors` exited 1 on 6.4 and 0
on 6.3. Removing `@concurrent in` from the two closures, with the functions keeping
`@concurrent`, made 6.4 clean.

The other three runs: `InferIsolatedConformances` and `MemberImportVisibility`
changed only the manifest (0 fix-its on that package), and `ExistentialAny`
rewrote two source files (+38 -35, `any` added).

The reason the procedure re-gates on the current toolchain after every run is this
row: the output was correct on 6.3 and needed a one-line edit on 6.4. Re-read the
compiler's table above at each bump, since more names are becoming migratable.
