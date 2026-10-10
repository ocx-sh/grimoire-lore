---
name: swift-upgrade
description: Use when asked to move a Swift library, CLI or server package (not an app target) from Swift 5 to Swift 6 language mode or to fix its Swift 6 concurrency errors, to bump the toolchain, .swift-version or swift-tools-version, to enable an upcoming feature such as NonisolatedNonsendingByDefault, ExistentialAny or MemberImportVisibility, to run swift package migrate, or after errors such as "is not concurrency-safe because", "this is an error in the Swift 6 language mode", "unknown warning group", "is not a recognized upcoming feature" or "Unknown option '--targets'". Not for diagnosing a crash, hang or slow type-check (swift-diagnose) and not for cutting a release (swift-release).
license: Apache-2.0
metadata:
  summary: Order-sensitive Swift 6 mode, upcoming-feature and toolchain upgrade procedure with a zero-new-hatch delta and dated probes, measured on Swift 6.4.0 and 6.3.3
  keywords: swift,swiftpm,upgrade,swift-6,language-mode,strict-concurrency,sendable,concurrency-migration,migrate,upcoming-feature,toolchain,swift-version,swift-tools-version,existentialany,nonisolatednonsendingbydefault,memberimportvisibility,hatch,nonisolated-unsafe,warnings-as-errors,dated-recheck
---

# swift-upgrade

## The order is the product. Read this before U0

Five facts make the order below load-bearing. An agent that runs the steps in a
convenient order gets a green build that is quietly wrong.

- **Probe with flags, change through the manifest.** `-Xswiftc -swift-version
  -Xswiftc 6` and `-strict-concurrency=complete` reach dependencies. The
  manifest does not. Flags measure (U3) and are never committed (SW-CORE-11).
- **A green plain build is not done.** The flip leaves warnings that only
  `-warnings-as-errors` turns into an exit code, test targets fail where the
  library does not, and `migrate` can emit code the current toolchain deprecates.
  Done is exit 0 of `swift build --build-tests -Xswiftc -warnings-as-errors` on
  the current and the floor toolchain (SW-CORE-11), and a target held in mode 5 also needs U7's `count` to print 0 (SW-GATE-13).
- **"No new hatches" is a delta.** On an adopted tree the whole-tree hatch pass
  prints the legacy lines before and after, and the lazy result looks the same
  to the compiler. Only the added-lines check tells them apart (SW-CORE-10).
- **`migrate` exiting 0 proves little.** It exits 0 on a dirty tree and on a
  manifest that a `Package@swift-X.swift` file shadows. The proof is a feature
  count in `dump-package` after the edit (SW-CORE-04).
- **Accepted is not shipped.** `withDeadline`, `defaultSwiftSettings:` and the
  stdlib `FilePath` are accepted proposals that do not compile on 6.4 and 6.3
  (measured 2026-10-10). U10 re-checks them at every bump.

Contents: [Scope](#scope) · [Pinned defaults](#pinned-defaults) ·
[Before U0](#before-u0) · [The procedure](#the-procedure) ·
[Stop conditions](#stop-conditions) · [The receipt](#the-receipt) ·
[The MUST rows this procedure enforces](#the-must-rows-this-procedure-enforces) ·
[What agents get wrong](#what-agents-get-wrong-here)

## Scope

Moving an existing Swift library, SDK, CLI or server package, in Swift 5 mode or
already in Swift 6 mode, to Swift 6 language mode, to post-6 upcoming features, or
to a new toolchain. Measured 2026-10-10 on Linux x86_64 in the `swift:6.4` (6.4.0)
and `swift:6.3` (6.3.3) images, on a real package (swift-snapshot-testing at
`28e5de025e3f`, 37 source files; the counts are in
[references/ladder-cases.md](references/ladder-cases.md)). macOS, Xcode projects,
app targets with `defaultIsolation` and Windows are `unverified: read only`.

The rules are cited by ID and live in the `swift-quality` and `swift-package`
rule sets (SW-CORE, SW-CONC, SW-LANG, SW-PKG, SW-GATE and the families they
cite). **This skill needs both rule sets installed.** The scripts it names
(`canary.sh`, `k07.sh`, `fold-check.sh`, `weaken-check.sh`, `generated-touch.sh`)
live in the `swift-quality` `checks/` directory, default
`.claude/rules/swift-quality/checks/`. Without them, stop and ask. Writing new
concurrent code is the rules' job. A crash, hang or slow type-check afterwards is
`swift-diagnose`, and tagging and publishing are `swift-release`.

## Pinned defaults

Each row is an agreed default an adopter overrides once, in their own repository.

| Decision | Default (2026-10-10) | Override looks like |
|---|---|---|
| Floor by kind | Libraries and an SDK: tools 6.2, Swift 6 mode, floor leg `swift:6.2.0`. CLIs and servers: the current release (6.4) | A higher library floor, with a reason in the commit message (SW-PKG-12) |
| Toolchain pin | `.swift-version` holds the exact patch (6.4.0 current, 6.3.3 previous) and the primary CI image derives from it | An exact image tag, with the bump shipped together with the regenerated format config (SW-GATE-08) |
| Done test | `swift build --build-tests -Xswiftc -warnings-as-errors` exits 0 on the current and the floor toolchain | None. A leg that cannot meet it is a stop condition (S6) |
| Hatch budget | 0 hatches added, judged against the U0 commit | A named stop condition (S1 or S2) with the gap recorded |
| `migrate` scope | The five migratable names, one per run, from a clean tree | None. Other names exit 64 |
| Counting | Unique own-package `file:line:col` diagnostics of `swift build --build-tests` (sources and tests), one fresh scratch directory per measurement | Another counter, used for every step |

## Before U0

1. **Find every package root.** `find . -name 'Package*.swift' -not -path '*/.build/*' -not -path '*/Tests/*' -not -path '*/Benchmarks/*'`
   lists the manifests. A `Tests/` consumer smoke package (`.package(path: "../..")`) and a
   `Benchmarks/` package are fixtures, not roots, and a tool package elsewhere (`Tools/`) is a
   root only when it ships a product. Empty output means the tree is not a Swift package. Run
   every step once per package root.
2. **Classify each root by kind.** A library or SDK serves other toolchains
   (floor leg, SW-PKG-12, SW-PKG-33). A CLI or server builds one binary on the
   current release. An app target is out of scope (see Scope).
3. **Ask for a clean branch.** `migrate` rewrites sources and the manifest.
   If the tree is dirty, stop and ask the owner to commit or stash. Do not do it
   for them. The installed rule set and agent notes are not dirt: every clean-tree test
   below is `git status --porcelain -- . ':(exclude).claude' ':(exclude).agents'`
   (watched 2026-10-10: an untracked `.claude/` printed `?? .claude/` without the
   pathspec and nothing with it, a real untracked file printed with both).
4. **Write the helper file once** (block below). A shell tool call keeps no functions or
   variables, so every later command block starts with `. "${TMPDIR:-/tmp}/swift-upgrade/env.sh"`
   (it sets `S`, `CK`, `BASE` and `count`). `count` builds the tests too, into a fresh
   scratch directory outside the tree (a reused one prints nothing for modules it
   already built, which reads as zero), strips the colour escapes of 6.4.0, counts
   diagnostics outside `.build` and `checkouts` (a target with `path: "Source"`
   counts), and prints `FAILED`, never 0, when the build fails without one.

```sh
S=${TMPDIR:-/tmp}/swift-upgrade; mkdir -p "$S"
cat > "$S/env.sh" <<'EOF'
S=${TMPDIR:-/tmp}/swift-upgrade
CK=${CK:-.claude/rules/swift-quality/checks}   # the swift-quality checks/ directory
[ -r "$S/base" ] && BASE=$(cat "$S/base")      # written once in U0
dk() { docker run --rm -u "$(id -u):$(id -g)" -e HOME=/tmp -v "$PWD":/src -w /src "swift:${FLOOR:?set FLOOR}" "$@"; }   # floor image, as you, never root in the tree
count() { # NAME [swift build flags]: unique own-package diagnostics, sources and tests
    rm -rf "${S:?}/$1"
    local out rc n
    out=$(swift build --build-tests --scratch-path "$S/$1" "${@:2}" 2>&1); rc=$?
    n=$(printf '%s\n' "$out" \
        | sed -e 's/\x1b\[[0-9;]*m//g' -e 's/\x1b]8;;[^\x1b]*\x1b\\//g' \
        | grep -E -e '^/[^ ]*\.swift:[0-9]+:[0-9]+: (warning|error):' \
        | grep -v -e '/\.build/' -e '/checkouts/' -e "^$S/" | sort -u | wc -l)
    echo "build exit $rc" >&2
    if [ "$rc" -ne 0 ] && [ "$n" -eq 0 ]; then echo FAILED; else echo "$n"; fi
}
EOF
```

The plant check of `count` is in [references/ladder-cases.md](references/ladder-cases.md).

## The procedure

Run the steps in order, one commit each, so a reviewer can attribute a change to its
cause. A step that fails its verification is fixed or stopped on, never skipped.

### U0. Baseline

Rules: SW-CORE-04, SW-CORE-03, SW-PKG-06, SW-PKG-21, SW-GATE-10, SW-GATE-01.

```sh
. "${TMPDIR:-/tmp}/swift-upgrade/env.sh"
git status --porcelain -- . ':(exclude).claude' ':(exclude).agents'   # empty = clean tree. Anything else: stop and ask
swift --version
ls Package*.swift           # a Package@swift-X.swift here shadows Package.swift: read SW-PKG-21 first
swift package tools-version
count u0                    # the baseline count (build, warnings, tests included)
git rev-parse HEAD | tee "$S/base"   # BASE: every later delta is against this commit
```

Then run the floor command of SW-PKG-06 verbatim. Without `jq` (the `swift` images
ship none, exit 127) use `swift package tools-version` and `swift package dump-package
| grep -n -e swiftLanguageVersions -e enableUpcomingFeature`. Run the whole-tree
hatch pass of SW-GATE-10 (`"$CK/k07.sh"`), and `bash "$CK/canary.sh"` first: an
empty grep over the wrong directory looks identical to a clean tree (SW-CORE-03).

Then run the SW-GATE-01 block at BASE, skipping any `--in-place` format step (it
rewrites files and would dirty the upgrade diff), and record each step's exit. A step
red at BASE is `pre-existing`, not the upgrade's. A step that cannot apply (no DocC
plugin, no `.swift-format`) is `inapplicable`. Paste the floor output, the counts, the
legacy hatch lines and the per-step exits into the receipt. A hatch that exists now is
legacy and is not this upgrade's to remove.

#### Entry table: which steps this tree runs

Read the effective mode from the U0 output before U1:

```sh
swift package tools-version
swift package dump-package | grep -n -A2 -e '"swiftLanguageVersions"' -e '"swiftLanguageMode"'
```

| U0 shows | Do |
|---|---|
| Tools 6.2 or higher and the list is `null` or `["6"]`, no per-target `"5"` (already mode 6; SwiftTerm) | Skip the mode flip: run U1, then U2 for the loop and the typo guard only, then U8 to U10. U3 to U7 have nothing to measure. A `defaultIsolation` or an `[.v6]` already present is not this upgrade's to change |
| Already mode 6 on tools 6.0 or 6.1 (the loop's `treatWarning` needs 6.2) | Run U1, skip the loop and the typo guard of U2 and say so in the receipt, then U8 to U10. Raising the tools version is the owner's decision, as in the next row |
| A library or SDK in mode 5 with tools below 6.2 (RxSwift: 5.5, shadowed by a 5.9 file; SQLite.swift: 6.1) | Stop and ask the owner before U2. Raising the floor drops every consumer on an older toolchain with no warning (SW-PKG-12, SW-PKG-33), so it is a decision and not a step. Write the answer in the receipt. A refusal ends the 6.2 loop, not the flip: on tools 6.0 and 6.1 `swiftLanguageModes: [.v6]` and a per-target `.swiftLanguageMode(.v5)` load and only `treatWarning` is refused (measured 2026-10-10, 6.4.0), so U6 still applies with its settings per target. Below tools 6.0 the upgrade ends |
| A package-level `["5"]` list already (Kingfisher, tools 6.2) | U2 moves it into the loop. It does not add a second spelling |
| A `Package@swift-X.swift` in effect (RxSwift) | Every step runs on every manifest in effect (SW-PKG-21) |

### U1. Pin the toolchain once

Rules: SW-CORE-09, SW-GATE-08, SW-LANG-03.

`.swift-version` holds the exact patch. The primary CI image derives from it, and
a literal `swift:` tag is allowed only on a matrix leg that exists to test that
version (the floor leg, nightly). Every hit of this inventory is either derived or
a deliberate leg. The step is not skippable, and it makes its own preconditions true
before U2 relies on them:

1. **The pin must be at or above the floor U2 will write.** Read `.swift-version`
   (or `swift --version` when absent) against 6.2.0 for a library or SDK and 6.4.0
   for a CLI or server. A pin below it (RxSwift: `6.1` against a tools 6.2 target)
   cannot load the manifest U2 writes. Raise `.swift-version` first, in its own
   commit, and run the gate on the new patch (the bump order in
   [references/toolchain-pin.md](references/toolchain-pin.md)). If the installed
   `swift` is below the floor, stop and ask for a toolchain.
2. **With no `.swift-version`**, create it with the exact patch of `swift --version`.
3. **Derive the CI image from it on Linux legs.** Xcode-select CI has no container
   image to derive (Kingfisher: an `xcode:` matrix, SwiftTerm: `DEVELOPER_DIR`,
   RxSwift: `xcode-select -s`). For those legs, listed by the grep below, pin one Xcode
   in the workflow, require `swift --version` under it to print the `.swift-version`
   patch, and say in the receipt that the derivation does not apply. Mixed CI
   (SwiftTerm) does both.

```sh
grep -rn -E -e 'swift:[0-9]' -e 'matrix\.swift' -e '^[[:space:]]*swift:[[:space:]]*(\[|-)?[[:space:]]*["'"'"']?[0-9]' -e '^[[:space:]]*swift:[[:space:]]*$' -e 'swift_versions?:' --include='*.yml' --include='*.yaml' --include='Dockerfile*' --include='Makefile' --exclude-dir=.build --exclude-dir=.git --exclude-dir=.claude --exclude-dir=.agents .
```

Empty output means no literal tag. A `matrix.swift` or bare `swift:` hit means a
matrix: read its values. A `linux_swift_versions:` or `swift_version:` hit is a reusable-workflow input list: each entry is a leg, read by hand. A release job's literal tag belongs to `swift-release`
(SW-REL-01). Watched 2026-10-10: a Makefile `swift:5.7-focal` and two matrix forms printed a line each, the derived twin nothing. The derivation and the bump order are in [references/toolchain-pin.md](references/toolchain-pin.md).

The Xcode legs the inventory cannot see have their own grep in
[references/toolchain-pin.md](references/toolchain-pin.md). A hit means the derivation does not
apply to that leg: pin one Xcode or record the `swift --version` the run prints.

### U2. Manifest floor, shared loop, typo guard

Rules: SW-CORE-11, SW-PKG-11, SW-PKG-12, SW-PKG-18, SW-PKG-02, SW-PKG-01, SW-PKG-33, SW-PKG-06, SW-PKG-21.

Set `swift-tools-version` to the floor for the root kind (6.2 for a library or SDK,
6.4 for a CLI or server) and never lower it. A package in mode 5 (old tools below 6.0,
or a `["5"]` list) stays there until U6, because a `null` list means mode 6 on tools
6.x (SW-PKG-06). Hold it per target in the loop, never package-level (SW-PKG-14): put
`.swiftLanguageMode(.v5), // temporary: Swift 5 mode until U6, DATE` in the loop's
settings (SW-PKG-15). If a package-level `swiftLanguageVersions: [.v5]` or
`swiftLanguageModes: [.v5]` exists, delete it in the same edit. Adding the other
spelling beside it fails with `extra argument 'swiftLanguageModes' in call`, and
the old `swiftLanguageVersions` is deprecated on tools 6.x (measured 2026-10-10,
6.4.0). Move every shared setting into the one `for target in package.targets`
loop; a package with per-target literals and no loop (swift-numerics, case-paths)
first gets SW-PKG-18's example loop. Add `.treatWarning("StrictLanguageFeatures", as: .error)` to that loop. The
package stays in Swift 5 mode for now. Never write `defaultSwiftSettings:`
(SW-PKG-01). A library that raises its tools version proves what its consumers on the OLD
toolchain get before the commit (SW-PKG-33), with the throw-away consumer of
[references/library-floor-proof.md](references/library-floor-proof.md). The library's own
build on the old image refuses the new manifest by design, so it proves nothing. In a tree with `Package@swift-X.swift` files, edit every
manifest in effect on any leg or stop (SW-PKG-21).

Verify the build exits 0 and `count` is unchanged. Then prove the guard fires:
add `.enableUpcomingFeature("ExistentalAny")` (misspelt) to the loop, run
`swift build` and expect exit 1 with `is not a recognized upcoming feature`, then
remove the line. Without the guard it exits 0 (measured 2026-10-10, 6.4.0 and 6.3.3).

### U3. Probe, change nothing

Rules: SW-CORE-11, SW-PKG-03.

Measure the blast radius with flags and commit none of them.

```sh
. "${TMPDIR:-/tmp}/swift-upgrade/env.sh"
count u3-sc -Xswiftc -strict-concurrency=complete
count u3-sv -Xswiftc -swift-version -Xswiftc 6
```

Then run the per-name loop of
[references/feature-table.md](references/feature-table.md) over the 15 Swift 6
group names. Only names with a non-zero delta over the U0 count matter.
`-swift-version 6` is a lower bound. The compiler stops after the first module
with errors, so its count is toolchain dependent (10 on 6.4.0, 14 on 6.3.3 on the
measured tree, warnings included). Run it on the floor toolchain too and never
compare counts across toolchains. Committed scripts must not contain the flag: run
`flag-grep` of SW-CORE-11 (it also reads `Package*.swift` and `*.xcconfig`). Empty
output passes, any hit is a probe that leaked into a build script or a manifest.

### U4. Complete checking in Swift 5 mode, through the manifest

Rules: SW-CORE-11, SW-PKG-20, SW-PKG-03.

Add `.enableUpcomingFeature("StrictConcurrency")` to the shared loop, plus each
other name whose U3 delta was non-zero (`GlobalConcurrency` and
`ConciseMagicFile` in the measured package). Never `enableExperimentalFeature("StrictConcurrency")`
and never a `-strict-concurrency` flag in the manifest. Verify the build exits 0
with warnings only and that `count` equals the U0 count plus the deltas of the names
you added (17 on the measured package: 13 for `StrictConcurrency` and
`GlobalConcurrency` plus the 4 `#file` warnings of `ConciseMagicFile`).

### U5. Fix by ladder, one class of diagnostic at a time

Rules: SW-CORE-10, SW-CONC-28, SW-CONC-01, SW-CONC-02, SW-CONC-05, SW-CONC-09,
SW-CONC-10, SW-CORE-05, SW-CORE-15.

Group the diagnostics by class and fix one class per commit, rebuilding after
each. For every diagnostic name the highest rung of the SW-CONC-28 ladder that
applies and show why no higher rung does, before adding a hatch. The five classes
found on the measured package, each with wrong, lazy and ladder code, are in
[references/ladder-cases.md](references/ladder-cases.md). Record `count` after
each class. A generated file is regenerated from its spec, never edited to clear a
diagnostic (SW-CORE-05, check with the shipped `generated-touch.sh`).

After every class, judge hatches by the added lines, not the whole tree. Run the
`hatch-delta` command of SW-CORE-10 verbatim, not its `BASE=origin/main` line (it marks new files with `git add -N`;
a plain `git diff` misses an untracked file with a hatch). Set `BASE` from the saved
file first, so a lost shell variable fails loudly instead of diffing against
nothing:

```sh
. "${TMPDIR:-/tmp}/swift-upgrade/env.sh"; set -o pipefail; [ -n "$BASE" ] || echo 'BASE lost: stop'
```

Output is the violation, and empty output passes. A surviving line needs the written
justification of SW-GATE-10 and a stated reason why a lower rung does not apply, or
it is a stop condition (S1 to S6). The lazy twin (`nonisolated(unsafe)` and
`@unchecked Sendable` everywhere) added 13 lines, the ladder result 0 (measured 2026-10-10).

### U6. Flip to Swift 6 mode

Rules: SW-CORE-11, SW-PKG-03, SW-PKG-13, SW-PKG-14, SW-PKG-15, SW-CONC-11.

Set `swiftLanguageModes: [.v6]` and delete the Swift 5 mode lines (the loop's
temporary `.swiftLanguageMode(.v5)` from U2 among them) and the
`enableUpcomingFeature` lines of the Swift 6 group in the same commit. Test targets
are in the loop and flip with it. A target that must stay in mode 5 carries a
per-target `.swiftLanguageMode(.v5)` with a dated reason and a removal condition
(SW-PKG-15), and that is stop condition S1.

```sh
grep -Rn -e 'swiftLanguageModes: \[.v5\]' -e 'swiftLanguageVersions: \[.v5\]' -e 'swiftLanguageMode(.v5)' -e 'enableUpcomingFeature("StrictConcurrency")' --include='Package*.swift' --exclude-dir=.build .
grep -Rn -e 'defaultIsolation' --include='Package*.swift' --exclude-dir=.build .
```

The first command prints nothing when flipped, except a target held under S1 or S2
with its dated reason. The second lists every
`defaultIsolation` for review: only app targets may set it (SW-CONC-11). Verify the
build exits 0 and `count` equals the non-concurrency warnings U7 lists (6 on the
measured package), which means the ladder is done. A test target may still need a
ladder step: the measured one failed with `Tests/SnapshotTestingTests/WaitTests.swift:9:13:
error: sending 'value' risks causing data races`, cured by a `Mutex` or a value capture.

### U7. Clear the flip's non-concurrency warnings

Rules: SW-CORE-11, SW-GATE-13, SW-GATE-15, SW-CORE-01, SW-LANG-08, SW-GATE-20.

Swift 6 mode turns on warnings that complete checking never showed: `#file` against
`#filePath` default-argument mismatches (cure: change the callee default to
`#filePath`, a public behaviour change to note in the receipt), deprecations, and an
`open var` that SW-GATE-20 flags when changed to `public var` (a public-API break to
record). The measured cases are in [references/ladder-cases.md](references/ladder-cases.md).
Fix each at its cause. Demoting a warning group is allowed only on a toolchain-upgrade
branch (SW-GATE-15), and it is a weakening that needs its written reason (SW-CORE-01).

Done is exit 0 on both toolchains, tests included. `FLOOR` is the floor leg's patch,
`6.2.0` by default for a library or SDK (verify the patch per tree, SW-GATE-25) and the current patch for a CLI:

```sh
. "${TMPDIR:-/tmp}/swift-upgrade/env.sh"; FLOOR=6.2.0
swift build --build-tests --scratch-path "$S/u7" -Xswiftc -warnings-as-errors; echo "current exit $?"
dk swift build --build-tests --scratch-path /tmp/u7 -Xswiftc -warnings-as-errors; echo "floor exit $?"
dk swift package dump-package --scratch-path /tmp/u7 | grep -n -A2 -e '"swiftLanguageVersions"' -e '"toolsVersion"'
```

Every container run is `dk`: as your user, with its own scratch path. A root build in the mounted
tree leaves a root-owned `.build` and the next host build dies on `invalid access to
.../.build/manifest.pif`. A `.build` the host populated cannot be reused at `/src` either
(`module cache path` mismatch), and `dump-package` alone creates one (measured 2026-10-10, 6.4).

Both builds must print `exit 0` (a target held in mode 5 also needs `count u7` to print 0: 6.4 leaves its Sendable warnings as warnings, exit 0 with 4 on PromiseKit and exit 1 on 6.3, measured 2026-10-10), and the floor `dump-package` must show the tools
version and `swiftLanguageVersions` (null means mode 6) of the manifest you edited
(a `Package@swift-X.swift` can make the floor image read another file).
A pre-existing warning also fails this step, and fixing it belongs here (an
unhandled `.xctestplan` resource needed an `exclude:`). A plain `swift build` is not
the done test: a bare protocol in a test target built clean there and failed here. If
docker or the floor image is unavailable, record the floor leg as `unverified: not
run`, report S6-unknown and do not claim done.

### U8. Post-6 upcoming features, one at a time, with migrate

Rules: SW-CORE-12, SW-CONC-07, SW-PKG-07, SW-PKG-08, SW-PKG-32, SW-CORE-04, SW-GATE-13.

`migrate` handles exactly five names on 6.4 and 6.3 (measured 2026-10-10):
`ExistentialAny`, `InferIsolatedConformances`, `MemberImportVisibility`,
`NonisolatedNonsendingByDefault` and `StrictMemorySafety`. Take them one per run
in this order, and never paste a name into the manifest yourself:
`NonisolatedNonsendingByDefault` first (review every `@concurrent` it adds),
then `InferIsolatedConformances`, `MemberImportVisibility`, `ExistentialAny`.
`StrictMemorySafety` only where SW-SEC-11 applies. The flag is `--target`, and
`--targets` exits 64. List the targets with `swift package describe` (the Name and
Type lines) and migrate the regular and the test targets.

For each feature, from a clean tree and a green build:

```sh
. "${TMPDIR:-/tmp}/swift-upgrade/env.sh"
git status --porcelain -- . ':(exclude).claude' ':(exclude).agents'   # empty = clean. Anything else: stop
swift package migrate --target Core,Cli,CoreTests --to-feature ExistentialAny   # rename the targets
git diff                    # read every hunk. A fix-it that adds @concurrent to public API is stop condition S4
swift package dump-package | grep -c '"ExistentialAny"'   # use the name just enabled. At least 1 per target. 0 means the manifest was not edited
swift build --build-tests --scratch-path "$S/u8" -Xswiftc -warnings-as-errors   # then the same, dump-package included, on the floor image of U7
```

`migrate` exits 0 on a dirty tree (edits mix), exits 64 on a bogus or non-migratable
name (`GlobalConcurrency`, `StrictConcurrency` and `InternalImportsByDefault` among
them), and exits 1 in three ways that `git status --short` tells apart. No edits means an
existing build error. Source edits plus `Could not update manifest ... unable to find
target named 'T'` mean the manifest was not edited: a target built through a variable or
helper (`let target: Target = .target(...)`, `targets: [target]`) is invisible to it
(SQLite.swift, 282 fix-its in 20 files, count 0, and the loop fails the same way). Source
edits plus `package manifest version X is too old: please update to manifest version
5.8.0` mean the manifest `migrate` read is a shadowed one below tools 5.8 (PromiseKit,
`Package.swift` tools 4.0 shadowed by `Package@swift-5.3.swift`: 15 fix-its in 6 files, exit 1,
count 0, measured 2026-10-10, 6.4.0). In both, keep the source edits, add the printed
`.enableUpcomingFeature(...)` to that target's `swiftSettings` of the manifest in effect by
hand (or inline the target literals), and prove it with the count (0 before, 1 after). If the
edits are unwanted, `git checkout -- .` is the recovery. A second run of the same feature
appends a second literal. With a `Package@swift-X.swift` in effect and a dead
`Package.swift` at 5.8 or higher it edits the dead file, exits 0 and enables nothing. The
`dump-package` count is the only proof (SW-CORE-04, measured 0 versus 1 on 6.4 and 6.3).

**`NonisolatedNonsendingByDefault` on a library with a public async API ends in S4
on the first run** (it adds `@concurrent` to public functions). Revert the migrate
edits (`git checkout -- .`), record the feature as deferred in the receipt, and
continue with `InferIsolatedConformances`, `MemberImportVisibility` and
`ExistentialAny`. On a package with no public async API the run is kept, and then
re-gate on the **current** toolchain, not only the floor: the kept run exited 1 on
6.4 and 0 on 6.3 until two `{ @concurrent in` closures were edited. The feature table,
the behaviour table and that case are in
[references/feature-table.md](references/feature-table.md).

`InternalImportsByDefault` (SW-PKG-07) is not migratable. Add it to the shared loop
in its own commit, build with `-warnings-as-errors` on both legs, add
`public import` where the build asks, or record a deferral.

### U9. Fold the per-target literals into the loop

Rules: SW-CORE-13, SW-PKG-18, SW-CORE-04.

`migrate` never edits the shared loop. It writes
`swiftSettings: [.enableUpcomingFeature(...)]` literals beside it and the two
drift. Run the shipped `fold-check.sh` from the package root. It prints each
literal outside the loop (20 on the measured package when all 5 targets were
migrated in four runs) and prints nothing when folded. Move the names into the loop,
then repeat U8's `dump-package` proof for each name: the count equals the number of
regular, executable and test targets (4 names times 5 targets here). Test targets
receive the loop's features whether or not they were migrated. Re-run the U7 done
test on both toolchains.

### U10. Gate, then the dated re-checks

Rules: SW-GATE-01, SW-CORE-01, SW-CORE-02, SW-CORE-03, SW-CORE-06, SW-CORE-14.

Run the gate block of SW-GATE-01 and quote each command with its exit code,
compared per step with the U0 record: a step that was red at BASE is `pre-existing`
and is not the upgrade's. Then run the shipped `weaken-check.sh` with `BASE` set to
the U0 commit, and quote every printed stdout line with its reason (SW-CORE-01). Judge by
stdout, and keep stderr visible: a git `warning: unable to access '.gitignore'` line (a
symlinked ignore file) is noise, not a finding. The
`.swift-version` line created in U1 prints, and its standing reason is U1. Re-run the
U5 hatch delta once more. Run the K-07 pass in its generated-file-excluding form
(SW-CORE-06). Any new check this upgrade added (a grep, a CI step, a flag) is run
once on a planted violation and once on its compliant twin before it is relied on,
and the receipt quotes both results (SW-CORE-02). Run `canary.sh` before trusting any
empty result (SW-CORE-03).

Then run the dated re-checks. Each is one step, and the command or the reading
for each is in [references/dated-rechecks.md](references/dated-rechecks.md) (U10.1
to U10.6) and [references/dated-rechecks-tools.md](references/dated-rechecks-tools.md)
(U10.7 to U10.17), with the source rule. A probe reports STILL while the pinned fact
holds and FLIPPED when it no longer does. A FLIPPED result means the cited rules are
stale: report it, leave the rule text to its maintainer, do not quietly proceed. Do
not invent a result.

The 17 items and their triggers are at the top of the first reference. A trigger that
did not fire is `NOT-TRIGGERED`. U10.10, U10.16 and U10.17 are maintainer re-checks,
run only on request.

Finish with the receipt.

## Stop conditions

Stop and report instead of adding a hatch or widening the change when one of
these fires (SW-CORE-15). Each is the point where the lazy twin's shortcut becomes
the only way to green.

| # | Condition | Action | Rule |
|---|---|---|---|
| S1 | The errors sit in a dependency you do not own, found by the U3 probe | Stay on the manifest mode for that target, record the dependency and its version | SW-CORE-15, SW-PKG-15 |
| S2 | The highest applicable rung needs an API above the platform or tools floor (`Mutex` on an Apple floor below the OS that ships `Synchronization`, `weak let` below 6.3, `sending` below 6.0) | Record the gap and the floor, keep the diagnosed global, hold that target in `.swiftLanguageMode(.v5)` with a dated reason (SW-PKG-15), put S2 in the receipt, never drop to the hatch rung | SW-CORE-15, SW-APPLE-04 |
| S3 | A diagnostic reproduces as a frontend crash | Minimise, record the probe, wait. Do not rewrite around it in shared code | SW-CORE-15, SW-CORE-14 |
| S4 | A `migrate` fix-it adds `@concurrent` to a public async signature | Stop for a human. It is source and ABI visible. Revert that run and defer the feature (U8) | SW-CORE-15, SW-CONC-07 |
| S5 | Two consecutive ladder classes leave the count unchanged or higher | Stop and re-read the diagnostics instead of widening the change | SW-CORE-15 |
| S6 | The re-gate is green on one of the current and the floor toolchain and red on the other, or a leg could not run | Report both legs. Add no `#if compiler` split to make one leg green (the `SW-LANG-04` guard of a newer syntax form stays) | SW-CORE-15, SW-LANG-04 |

## The receipt

Every run starts with the consent of U0's clean-tree ask and ends with this receipt
(SW-CORE-21). Paste evidence verbatim, with two readings (before and after) per fix.

```text
request:          the request in the reporter's words
build identity:   swift --version, .swift-version, tools version, language mode, feature names
baseline (U0):    warnings N, legacy hatches N, clean tree, green build, BASE commit, each SW-GATE-01 step exit (pre-existing or inapplicable marked)
counts per step:  U3 probes, U4, U5 per class, U6, U7, U8 per feature, U9
done test:        build --build-tests -warnings-as-errors exit on the current toolchain and on the floor
hatches added:    0, from the added-lines check against BASE
stop conditions:  none, or S1 to S6 with the diagnostics left (deferred features named)
dated re-checks:  U10.1 to U10.17, each STILL, FLIPPED, NOT-TRIGGERED(reason) or NOT-APPLICABLE(no such dependency), with the toolchain version
what changed:     the fix, each with its rule ID or a named gap
rules relied on:  every rule ID cited above
```

## The MUST rows this procedure enforces

The 22 merge-blocking rows (a weakened check, an unproven new check, an untrusted
empty grep, an unproven manifest edit, a hand-edited generated file, an added hatch,
a package-level `[.v5]`, a floating floor leg and the rest) are restated as findings
with their rule IDs in [references/must-rows.md](references/must-rows.md). A review
without the rule files loaded reports them from there.

## What agents get wrong here

The 13 recurring mistakes, ranked, are in
[references/agent-mistakes.md](references/agent-mistakes.md). The three that cost most:
silencing every Swift 6 error with `nonisolated(unsafe)` or `@unchecked Sendable`
(only the added-lines delta of U5 tells it from the ladder result), reading `migrate`
exit 0 as success (U8), and calling a plain green build done instead of
`-warnings-as-errors` exit 0 with tests on both toolchains (U7).
