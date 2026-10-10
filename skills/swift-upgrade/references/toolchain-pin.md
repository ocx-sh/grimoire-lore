# Toolchain pin and bump order for steps U1 and U10

Load this from step U1 of the swift-upgrade procedure, and again whenever the
toolchain itself is being bumped. It holds the one-pin pattern and the order in which
a bump touches things. The pin policy itself is SW-GATE-08, the derivation is
SW-CORE-09, and the floor leg is SW-LANG-03.

Measured 2026-10-10 on Swift 6.4.0 (current) and 6.3.3 (previous). The CI shape below
is read from a public project and not run here.

Contents: [One pin, derived everywhere](#one-pin-derived-everywhere) ·
[The CI derivation](#the-ci-derivation) ·
[The inventory grep](#the-inventory-grep) ·
[The bump order](#the-bump-order)

## One pin, derived everywhere

`.swift-version` holds the exact patch, for example `6.4.0`. The primary CI image is
built from that file, so a bump is one edit and a floating tag such as `swift:6.3`
cannot split two legs onto different patches (`swift:6.3` floated to 6.3.3 during
this research). A literal `swift:` tag is allowed on a matrix leg that exists to test
that version: the floor leg of a library (`swift:6.2.0`, never the floating `swift:6.2`)
and the nightly leg. Release jobs and the shipped `Dockerfile` follow the release
rules (SW-REL-01), not this derivation.

Tools that read the file: swiftly walks up to the nearest `.git` and reads
`.swift-version` (`swiftly@c8cf2e35bfca:Sources/Swiftly/Use.swift:191,235`), and
swift-embedded-examples has a workflow that opens a pull request updating the file
(`swift-embedded-examples@119b29f83550:.github/workflows/update-swift-version.yml:12,57`).

## The CI derivation

The shape below is read from apple/containerization at `3e7bc39e66b3`
(`.github/workflows/containerization-build-template.yml:26-34,49`), trimmed. A first
job checks out only `.swift-version` and emits the image name, and the build job uses
it as its container:

```yaml
jobs:
  swift-version:
    runs-on: ubuntu-24.04
    outputs:
      image: ${{ steps.version.outputs.image }}
    steps:
      - uses: actions/checkout@v6
        with:
          sparse-checkout: .swift-version
          sparse-checkout-cone-mode: false
      - id: version
        run: echo "image=swift:$(cat .swift-version)-noble" >> "$GITHUB_OUTPUT"

  build:
    needs: swift-version
    runs-on: ubuntu-24.04
    container: ${{ needs.swift-version.outputs.image }}
    steps:
      - uses: actions/checkout@v6
      - run: swift build -Xswiftc -warnings-as-errors
```

Rename the runner label and the variant suffix (`-noble`) to your own. Pin the action
by commit when your policy requires it.

## The inventory grep

Run from the repository root. It is a bump-time inventory and not a gate: every hit
is either derived or a deliberate leg. A tree with no `.swift-version` needs the file
created first (the exact patch of `swift --version`) and its CI image derived from it.

```sh
grep -rn -E -e 'swift:[0-9]' -e 'matrix\.swift' -e '^[[:space:]]*swift:[[:space:]]*(\[|-)?[[:space:]]*["'"'"']?[0-9]' -e '^[[:space:]]*swift:[[:space:]]*$' --include='*.yml' --include='*.yaml' --include='Dockerfile*' --include='Makefile' --exclude-dir=.build --exclude-dir=.git --exclude-dir=.claude --exclude-dir=.agents .
```

Output is the inventory. Empty output means no literal tag. A `matrix.swift` or bare
`swift:` hit means a matrix: read its values. Watched red and green (measured
2026-10-10): a Makefile `swift:5.7-focal`, a matrix `swift: ['6.1']` with
`container: swift:${{ matrix.swift }}` and a list-form matrix printed a line each
(exit 0), the derived twin printed nothing (exit 1).

CI that selects Xcode instead of an image (`xcode-select`, `DEVELOPER_DIR`, a
`xcode:` matrix) is invisible to this grep.

The Xcode legs, which the inventory above cannot see. Output is the list of legs
the derivation does not cover, and empty output means every leg is a Linux image
(watched 2026-10-10: Kingfisher, SwiftTerm, RxSwift, SQLite.swift and SwiftGen printed
their lines, a `container: swift:6.4.0` twin printed nothing, exit 1). A hit on
`runs-on: macos-*` with no `xcode-select`, `setup-xcode` or `DEVELOPER_DIR` beside it
(SQLite.swift, SwiftGen) uses the runner image's default Xcode: pin one, or record the
`swift --version` the run prints, and never derive an image for that tree:

```sh
grep -rn -E -e 'xcode-select' -e 'Xcode_[0-9]' -e 'setup-xcode' -e 'xcode-version' -e 'DEVELOPER_DIR' -e '^[[:space:]]*(-[[:space:]]*)?xcode:' -e 'runs-on:.*[Mm]ac[Oo][Ss]' -e 'macos-[0-9a-z]' --include='*.yml' --include='*.yaml' --include='Makefile' --exclude-dir=.build --exclude-dir=.git --exclude-dir=.claude --exclude-dir=.agents .
```

The manifest floor is a separate number. `swift package tools-version` prints it,
and comparing it with `.swift-version` is a reading step.

## The bump order

0. Precondition from U1: the pin must be at or above the tools version the manifest
   is about to carry. A pin below it cannot load that manifest, so the pin bump comes
   first and is never folded into the manifest commit. On Xcode-select CI there is no
   image to derive: pin one Xcode in the workflow and require `swift --version` under
   it to print the `.swift-version` patch.
1. Change `.swift-version` and nothing else that names a version.
2. Run the gate block (SW-GATE-01) on the new patch. `swift format` and the compiler
   differ between patches, and the format step ships together with the regenerated
   `.swift-format` and the reformatted files (SW-GATE-08).
3. If the package floor is below the new toolchain, run the build on the previous
   line too, because consumers still resolve on it (SW-PKG-33).
4. Run the dated re-checks of step U10.
5. Only then raise the manifest floor, in its own commit.

Never raise `swift-tools-version` and bump the toolchain in the same commit. A reviewer
could not tell which change caused a red leg.
