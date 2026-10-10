---
name: swift-release
description: Ordered runbook for cutting a Swift release, for a CLI or server shipped as static per-architecture Linux binaries and for a library or SDK shipped as a SwiftPM tag, from the toolchain pin and the vX.Y.Z tag decision through the API-breakage gate, the static Linux SDK build, the statically-linked and glibc-floor checks, version stamping, stripping with an unstripped twin, the CycloneDX SBOM and checksums, to CI attestation and verifying what was published. Use when tagging or releasing a Swift package, CLI or SDK, writing or reviewing a release workflow, Dockerfile or Makefile that runs swift build -c release, building a static or musl binary with --swift-sdk, deciding a version bump, generating an SBOM with --sbom-spec, or hitting the errors GLIBC_2.43 not found, has multiple target triples, Unknown option '--sbom-spec' or Couldn’t get revision. Not for bumping the toolchain or a Swift 6 migration, not for crashes or Illegal instruction, and not for Xcode, app signing or notarization.
license: Apache-2.0
metadata:
  summary: Gate-ordered Swift release procedure for static Linux CLIs and tagged libraries, built around the permanence of a pushed tag, with its commands watched red and green on Swift 6.4.0 and 6.3.3
  keywords: swift,swiftpm,release,static-linux-sdk,musl,glibc,sbom,cyclonedx,semver,tag,api-breakage,version-stamping,checksums,strip,attestation,github-actions
---

# swift-release

## A pushed tag is permanent. Read this before step 1

SwiftPM has no `retract` and no yank. A consumer's `Package.resolved` pins a
revision, so moving a tag leaves old consumers on the old commit and gives new
consumers the new one, both labelled with the same version, with exit 0 and no
message (SW-REL-19). A binary release is bound the same way: the published
`checksums.txt` and the attestation name the old digests.

Two consequences bind everything below.

- **There is no fix-the-release path, so do not design one.** A bad release is
  followed by the next patch version, never a moved tag or a re-uploaded asset.
- **Every gate runs before `git push origin TAG`.** A defect found before the
  push costs a commit. A defect found after it costs a version number. Step 10
  is the only step that publishes, and it runs only when the owner asked for
  this release to be cut.

Contents: [Scope](#scope) · [Pinned defaults](#pinned-defaults) ·
[The runbook](#the-runbook) ·
[The MUST rows this procedure enforces](#the-must-rows-this-procedure-enforces) ·
[What agents get wrong here](#what-agents-get-wrong-here) ·
[The receipt](#the-receipt)

## Scope

| Code kind | Steps | Rule families it draws on |
|---|---|---|
| Library or SDK (a tag, no binaries) | 1, 2, 3, 10, 11, 12 | SW-REL-01, SW-REL-17 to 22, SW-GATE-20, SW-GATE-01, SW-REL-10 if Wasm is claimed |
| CLI or server shipped as binaries | 1, 2, 4 to 8, 10, 11, 12 | SW-REL-01 to 16, 22, SW-PKG-26, SW-PKG-28, SW-PKG-29 |
| Library products and an executable in one package (a hybrid, SwiftGen) | 1, 2, 3, 4 to 8, 10, 11, 12 | both rows above |
| Either, when the owner asked for a proof or an image | plus step 9 | SW-REL-14, SW-REL-15 |

Out of scope, with no rule behind them here: macOS universal binaries and
notarization, Windows, Android, Embedded and anything under Xcode. If the
repository ships one, the receipt says `unverified: read only`. The
`linux-arm64` asset is built from the same recipe with the
`aarch64-swift-linux-musl` triple. It ran under qemu on an x86_64 host
(measured 2026-10-10) and is never executed on arm64 hardware: label it `not
run on arm64 hardware`.

Tool versions, measured 2026-10-10: Swift 6.4.0 current and 6.3.3 previous,
Static Linux SDK 0.1.0 (version label 0.1.0 on both rows, but one bundle per toolchain: take URL and checksum from the pin's own row), GNU `grep`,
`jq` and `sha256sum`. `--sbom-spec` exists on 6.4 only (6.3.3 exits 64 with
`Unknown option '--sbom-spec'`), so the release job runs 6.4. A step that
names a rule ID is a procedure around that rule, whose text lives with the ID.
Depth is in
[references/preflight.md](references/preflight.md) and
[references/optional-legs.md](references/optional-legs.md).

## Pinned defaults

Agreed decisions, not derived facts. Each is a default the adopter may override
once, for the whole repository. The full list is `release.md` under Dates and
Defaults (rules/swift-package/release.md). The rows this procedure needs:

| Decision | Default (pinned) | Override looks like |
|---|---|---|
| Linux build | Static musl binary from the Static Linux SDK, selected by triple (`x86_64-swift-linux-musl`) | A glibc dynamic binary built in the oldest-glibc image, only for code that needs `dlopen`, NSS or a C library the SDK lacks |
| Asset shape | Raw `tool-linux-amd64` and `tool-linux-arm64` (rename `tool`), plus `checksums.txt` in `sha256sum` format | Tarballs named `tool-VERSION-ARCH-linux-musl.tar.gz`, built with a sorted, zero-mtime `tar` piped to `gzip -n` |
| Tags | `vX.Y.Z`, three components, annotated, one form per repository | Bare `X.Y.Z` for an external library, consistently |
| Stripping | Strip the shipped binary, keep the unstripped twin as a CI artifact and never a release asset (unlike Go, where the vulnerability scan wants symbols) | Ship unstripped and budget the size |
| SBOM | CycloneDX only, `tool-linux-amd64.cdx.json`, from `swift build --sbom-spec cyclonedx` | Add `--sbom-spec spdx` on request |

## The runbook

Run the steps in order. Steps 0 to 9 exist to fail before anything is pushed.
Write build outputs (`dist`, SBOMs, traces, `releases.json`) outside the
checkout: an untracked file makes the SBOM version `TAG-modified` and `git
describe` say `-dirty`.

### 0. Precondition: the package builds on Linux

The runbook builds on the pinned Linux image. A package that imports `AppKit`,
`UIKit` or `SwiftUI` unconditionally does not, and every later step would fail for
that one reason. Run a plain build first. A hit line is a macOS-only package: the
receipt says `macOS-only, out of scope` and the runbook stops here. Exit 1 with no hit
line is an ordinary build defect, which step 2 reports as its finding:

```sh
LOG=$(mktemp); swift build --scratch-path "$(mktemp -d)" > "$LOG" 2>&1; echo "linux build exit $?"
grep -m1 -E -e "no such module '(AppKit|Cocoa|UIKit|SwiftUI|WatchKit)'" "$LOG"
```

Watched 2026-10-10 on `swift:6.4`: SwiftGen printed `linux build exit 1` and
`no such module 'AppKit'`, jwt-kit printed `linux build exit 0` and no hit line.

### 1. Decide the version and the tag

- Tags are `vX.Y.Z` (SW-REL-18). The size of the bump comes from step 3's API
  report for a library, never from the size of the diff.
- A 0.x library never ships a breaking change as a patch, and its README
  dependency snippet says `.upToNextMinor(from:)`, because `from: "0.1.0"`
  resolved 0.3.0 across two breaking minors (measured 2026-10-10, SW-REL-21).
- A tag that already exists on the remote is a new version number, never a
  move (SW-REL-19). Step 10 checks it.

**Check (reading heuristic):** `git tag -l` against the next version, because
one checkout cannot see another clone's tags.

### 2. Pin the toolchain, run the gate at the exact commit, tag locally

Pin first (SW-REL-01), then run SW-GATE-01's ordered block from the package
root on the commit the tag will point at. Run it once at BASE first (`git rev-parse
HEAD` when you start this step) and record each step's exit. A step red at BASE and
untouched by this release is `pre-existing`: the receipt names it and the owner decides,
and the tag commit is never reformatted to make it green (SwiftGen, no `.swift-format`:
the `--in-place` format step rewrote 359 files, 10125 insertions, and `lint --strict`
exited 123, measured 2026-10-10). Skip any `--in-place` step, and mark a step that
cannot apply (no DocC plugin, no `.swift-format`) `inapplicable`. Every other applicable
step must exit 0. A library adds the block's step 4 and step 5 (SW-GATE-20, SW-GATE-21).

A CLI or server that ships a binary tracks `Package.resolved` and proves the
lock (SW-PKG-26, SW-PKG-28, SW-PKG-29). A package with no dependencies writes no
`Package.resolved`: the first line exits 1 and the three lines are skipped, with
`no dependencies, no lock` in the receipt. Otherwise each line exits 0, or the
step fails. The first line needs no `jq` (the `swift` images ship none):

```sh
swift package dump-package | grep -c -E '^      "(sourceControl|fileSystem|registry)"' # prints the dependency count, exit 1 = none, skip the rest of this block
git ls-files --error-unmatch Package.resolved
swift build --force-resolved-versions --scratch-path "$(mktemp -d)"
git diff --exit-code -- Package.resolved
```

Require a clean tree, record the identity of the run, and tag the commit
**locally**, annotated. Do not push the tag before step 10:

```sh
printf '.claude/\n.agents/\n' >> "$(git rev-parse --git-path info/exclude)" # local, untracked: SwiftPM counts untracked files, so without it step 8's SBOM reads TAG-modified (watched 2026-10-10)
git status --porcelain -- . ':(exclude).claude' ':(exclude).agents' # any output is the finding: a release built from it is "-modified" or "-dirty". The installed rule set and agent notes are not dirt
swift --version
TAG=v1.2.3 # rename
git tag -a "$TAG" -m "$TAG"
```

Until the push, fix a failed later step in a new commit, run `git tag -d
"$TAG"` and start again from step 2.

**Check the tag form** (SW-REL-18). Every output line is a finding, and empty
output is the pass. A finding on a tag that is already pushed goes into the
receipt and is never repaired, because moving it is the SW-REL-19 violation:

```sh
git tag -l | grep -v -x -E 'v?[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?'
git tag -l | awk '/^v[0-9]/{v=1} /^[0-9]/{b=1} END{if(v&&b)print "MIXED v/bare tags"}'
git for-each-ref --format='%(objecttype) %(refname:short)' refs/tags | grep -v -e '^tag '
```

### 3. Library or SDK: the API gate and the publishability smoke test

SW-GATE-20 owns the gate and SW-REL-20 owns the baseline: the previous release
tag, never the pull request's base branch, in a checkout that has the tags
(`fetch-depth: 0`, `fetch-tags: true`). Build first, because a plant that does
not compile produces no report. Exit 0 passes:

```sh
LAST=v1.4.0 # rename: the previous release tag
LOG=$(mktemp); swift package diagnose-api-breaking-changes "$LAST" > "$LOG" 2>&1; echo "api exit $?"
grep -e '[1-9][0-9]* breaking change' -e 'get revision' "$LOG" # read only when the exit is not 0: a pass prints 'No breaking changes'
```

Exit 1 has two meanings, which the second line tells apart. A scratch path goes before the subcommand (`swift package --scratch-path DIR diagnose-api-breaking-changes`), after it exits 64. `1 breaking change
detected` blocks the tag: restore the API, or take the bump size the report
demands plus a changelog line. `Couldn't get revision` is a missing tag or a
shallow clone and not an API break.

Then prove the tag resolves for version consumers (SW-REL-17). Step 4's P10
grep finds the manifest lines. The proof is a throw-away consumer pinned by
`file://` URL at the local tag. Exit 0 passes, and exit 1 with `depends on an
unstable-version package` means a `path:`, `branch:` or `revision:`
dependency leaked:

```sh
# From the library root, with the local tag from step 2. Rename PRODUCT to the library product.
TAG=v1.2.3 PRODUCT=MyLib
LIB=$(basename "$PWD") # SwiftPM names a URL dependency after the last path component
SMOKE=$(mktemp -d)
mkdir -p "$SMOKE/Sources/smoke"
echo "import $PRODUCT" > "$SMOKE/Sources/smoke/smoke.swift"
cat > "$SMOKE/Package.swift" <<MANIFEST
// swift-tools-version: 6.2
import PackageDescription
let package = Package(
    name: "smoke",
    dependencies: [.package(url: "file://$PWD", exact: "${TAG#v}")],
    targets: [.target(name: "smoke", dependencies: [.product(name: "$PRODUCT", package: "$LIB")])]
)
MANIFEST
(cd "$SMOKE" && swift package resolve)
```

A library that claims Wasm adds one leg per claimed target (SW-REL-10).
`swift test` without `--disable-xctest` exits 1 on a Wasm SDK even with no
XCTest present:

```sh
swift build -c release --target PureLib --swift-sdk swift-6.4.0-RELEASE_wasm
swift test --disable-xctest --swift-sdk swift-6.4.0-RELEASE_wasm
```

A library skips steps 5 to 9 and runs only P10 and P11 of step 4's scan, then goes to step 10.

### 4. CLI: scan the scripts before building

Run the scan in [references/preflight.md](references/preflight.md) from the
repository root. It covers the pin and image tags (SW-REL-01), the SDK
checksum and version (SW-REL-02), `--static-swift-stdlib` (SW-REL-03), hard-coded
`.build` paths (SW-REL-04), bundle ids (SW-REL-05), the SBOM source
(SW-REL-11), `path:` and `branch:` in manifests (SW-REL-17) and a swift-syntax
`exact:` pin (SW-REL-22). Any output line is a finding. Empty output is the
pass. Fix every finding in a commit, then restart from step 2.

### 5. CLI: stamp the version

`--version` prints the tag minus `v` (SW-REL-12). The default recipe is a
build-tool plugin with a `.buildCommand` and declared `inputFiles` and
`outputFiles` that writes a `Version.swift` into the plugin work directory,
valued from `git describe --tags --always --dirty` with the leading `v` removed
(CI checks out with `fetch-depth: 0`). A version file is the fallback for a
build without `.git`, and writing it into the checkout dirties the tree, which
step 8's SBOM check catches.

Never read an environment variable inside the plugin: Swift Build, the 6.4
default, does not pass the environment to plugin commands, so
`MYTOOL_VERSION=9.9.9` printed `1.2.3-dirty` there and `9.9.9` on the native
engine (measured 2026-10-10 on 6.4.0 and 6.3.3). Never put `$(...)` or `${...}`
in a plugin command's arguments: Swift Build expands them, so
`/bin/sh -c 'v=$(git describe ...)'` wrote `let relVersion = ""` and `--version`
printed an empty line (measured 2026-10-10 on 6.4.0). Pass a script file or a
tool target as the command and list it in `inputFiles`. Never use `.prebuildCommand`
with a source-built tool, never `sed` a tracked template, and never hard-code a
default.

**Check** from the tagged clean tree with a clean scratch path (a reused one
can keep a stale value). Empty output is the pass. `FAIL: got '...'` is the
finding: `1.2.3-dirty`, `1.2.3-1-gSHA`, `0.0.0-unknown`, an empty line and a
non-zero exit all print it:

```sh
TAG=v1.2.3 SCRATCH=$(mktemp -d) # rename TAG, and tool to your executable
GOT=$(swift run -c release --scratch-path "$SCRATCH" tool --version 2>/dev/null) && [ "$GOT" = "${TAG#v}" ] || echo "FAIL: got '$GOT'"
```

### 6. CLI: install the static SDK and build

Install the SDK that matches `.swift-version` exactly, with its checksum read
from the same source as its version: the `static-sdk` entry of
`https://www.swift.org/api/v1/install/releases.json`, in the row named `6.4.0`
or `6.3.3` (measured 2026-10-10). An empty `SUM` means the pin names no row:
stop.

```sh
command -v jq >/dev/null && command -v curl >/dev/null || { echo 'ABSENT: jq and curl are host tools, not in the swift image'; exit 69; }
OUT=$(mktemp -d) # outside the checkout. Later blocks need this value: export it or re-set it
read -r V < .swift-version
curl -fsSL -o "$OUT/releases.json" https://www.swift.org/api/v1/install/releases.json
SDKV=$(jq -r --arg v "$V" '.[] | select(.name == $v) | .platforms[] | select(.platform == "static-sdk") | .version' "$OUT/releases.json")
SUM=$(jq -r --arg v "$V" '.[] | select(.name == $v) | .platforms[] | select(.platform == "static-sdk") | .checksum' "$OUT/releases.json")
swift sdk install "https://download.swift.org/swift-$V-release/static-sdk/swift-$V-RELEASE/swift-$V-RELEASE_static-linux-$SDKV.artifactbundle.tar.gz" --checksum "$SUM"
```

A mismatched SDK fails the build with `module compiled with Swift 6.3.3
cannot be imported by the Swift 6.4 compiler`. A missing `jq` or `curl` exits 69 here
rather than leaving `SUM` empty, which the paragraph above already treats as a
stop.

Build per architecture, selecting by triple from a clean scratch path, and
locate the product with the build's own flags (SW-REL-04, SW-REL-05). The SBOM
comes out of the same build, from the clean tagged tree (SW-REL-11):

```sh
ARCH=x86_64 # aarch64 for linux-arm64 (not run on arm64 hardware)
SCRATCH=$(mktemp -d)
swift build -c release --product tool --swift-sdk "$ARCH-swift-linux-musl" --scratch-path "$SCRATCH" --sbom-spec cyclonedx --sbom-output-dir "$OUT/sboms-$ARCH"
BIN=$(swift build -c release --swift-sdk "$ARCH-swift-linux-musl" --scratch-path "$SCRATCH" --show-bin-path)/tool
```

**The build fails inside a dependency** (`no such module 'Glibc'` under
`.build/checkouts/PathKit`, Mint on 6.4.0): the static recipe has no fix for a
dependency you do not own. Record the module and version, and follow the decision
table in [references/optional-legs.md](references/optional-legs.md) (a newer
release, else the glibc fallback, SW-REL-06). Do not edit `.build/checkouts`.

`--show-bin-path` without the `--swift-sdk` flag prints the host directory,
which holds a glibc binary after any host build. Step 7's `file` check exists
for that mistake. A package that builds macros adds `-v` and requires the log
to contain `Prebuilt artifact` (SW-REL-22, a build-time cost and not a
correctness failure).

### 7. CLI: inspect the artifact, then run it

`file` is not in the `swift` image, so run it on the host or add it to the CI
image. The output is the finding. Then run the binary that was just built
(SW-REL-07): `--version` exits 0 and equals the tag minus `v`. Empty output is
the pass, and `FAIL: got '...'` is the finding (a missing binary, a non-zero
exit and an empty line all print it):

```sh
TAG=v1.2.3 # rename
: "${BIN:?set BIN to the step 6 product path}" # an empty BIN would run a blank command
command -v file >/dev/null || { echo 'ABSENT: file'; exit 69; } # a missing producer would read as the pass
file "$BIN" | grep -v -e 'statically linked'
GOT=$("$BIN" --version) && [ "$GOT" = "${TAG#v}" ] || echo "FAIL: got '$GOT'"
```

A CLI that spawns processes also runs one `swift-subprocess` `run()` through a
command of its own. A CLI that persists state proves the directory fsync with
strace, inside `swift:6.4` even when 6.3 built the binary, because a missing
trace is a tool failure and not a pass. strace is not in the `swift` image
either: `apt-get update && apt-get install -y strace file` as root. Step 6's
`curl` and `jq` are absent too, so run step 6 on the host or runner. `Data.write(.atomic)` issues no
directory fsync. Exit 0 from the `grep` means the directory was synced:

```sh
: "${OUT:?set OUT from step 6}" "${BIN:?set BIN from step 6}" # an empty OUT greps /trace.txt
command -v strace >/dev/null || { echo 'ABSENT: strace'; exit 69; }
DIR=$(mktemp -d)
strace -f -y -e trace=fsync,fdatasync,rename,renameat,renameat2 -o "$OUT/trace.txt" "$BIN" WRITE_CMD "$DIR/target" # rename WRITE_CMD to a command that writes the file
grep -q "fsync([0-9]*<$DIR>)" "$OUT/trace.txt"
```

Two reading heuristics close the step (SW-REL-09). Recursion inside a `Task`
runs on musl's 128 KiB non-main stack and crashed at depth 400 with exit 139
where glibc passed (measured 2026-10-10 on 6.4.0 and 6.3.3): run the largest input the CLI accepts, require exit 0, then
bound the depth or link with `-Xlinker -z -Xlinker stack-size=0x80000`. And
`dlopen` returns nil on the static leg, so code that loads at run time is
compiled out under `#if`. The grep finds candidates, and reading decides. It is
`-R`, not `-r`: `-r` skips a symlinked directory or file below `Sources`, so a
symlink-farm layout (RxSwift, 412 files) scanned 1 and printed nothing. Run the
canary of SW-CORE-03 first: `grep -Rl --include='*.swift' . Sources | wc -l` must
equal `find -L Sources -name '*.swift' | wc -l` (watched 2026-10-10: a planted
symlinked `Sources/M` gave 0 with `-r` and 1 with `-R`, the compliant twin 1 and 1):

```sh
grep -Rn --include='*.swift' -e 'dlopen(' -e 'NSClassFromString' -e 'Bundle(path' Sources
```

If the binary needs `dlopen`, NSS or a C library the SDK lacks, the static
recipe is out. Use the glibc fallback and its floor check in
[references/optional-legs.md](references/optional-legs.md) (SW-REL-06).

### 8. CLI: strip, keep the twin, SBOM, assets, checksums

Strip after the build and keep the unstripped twin as a CI artifact outside
`dist` (SW-REL-08). A static musl binary prints `<unknown>` frames in its
backtrace, stripped or not, so only the twin resolves an address:
`addr2line -f -C -e "$OUT/twins/tool-linux-amd64.debug" "$ADDR"` prints a
`$s...` symbol, and prints `??` on the stripped file. The arm64 twin needs
`llvm-symbolizer`, which the `swift` image carries. `llvm-objcopy` ships there
too, and the arm64 asset it stripped printed its version under qemu.

```sh
: "${OUT:?set OUT from step 6}" "${BIN:?set BIN from step 6}" "${ARCH:?set ARCH from step 6}"
DIST=$OUT/dist ARCHNAME=amd64 # arm64 for aarch64
mkdir -p "$DIST" "$OUT/twins"
cp "$BIN" "$OUT/twins/tool-linux-$ARCHNAME.debug"
llvm-objcopy --strip-all "$BIN" "$DIST/tool-linux-$ARCHNAME" # GNU strip cannot read the aarch64 file (exit 1)
find "$DIST" -maxdepth 1 -name 'tool-*' -size +20M # output = over the 20 MiB budget, set the number per project
cp "$OUT/sboms-$ARCH"/*.json "$DIST/tool-linux-$ARCHNAME.cdx.json"
```

An accidental `DateFormatter` or `Locale` took a program from 10.7 MB to 55.8
MB, the ICU data (measured 2026-10-10 on 6.4.0). `import FoundationEssentials` is a compile-time guard and
not a size lever: both imports gave byte-identical binaries.

Each SBOM must carry the tag. An SBOM from a dirty tree reads `TAG-modified`,
and one without git reads `unknown`. Output lists the SBOMs that lack the tag.
Then write the checksums and check the names and the bytes (SW-REL-13). The
name loop prints `1` per platform and a `0` is a finding:

```sh
TAG=v1.2.3 # rename
: "${DIST:?set DIST from the strip block above}"
grep -L -F -e " : \"$TAG\"" "$DIST"/*.cdx.json
(cd "$DIST" && sha256sum tool-linux-* > checksums.txt)
for p in linux-amd64 linux-arm64; do ls "$DIST" | grep -c -x -e "tool-$p"; done
(cd "$DIST" && sha256sum --check --strict checksums.txt)
```

The last line exits 0 or the step fails. Never gate on the SBOM's bytes: its
`serialNumber`, tool `bom-ref`, `timestamp` and file-name timestamp differ per
run (SW-REL-14). A tarball override builds with `tar --sort=name
--mtime=@EPOCH --owner=0 --group=0 --numeric-owner` piped to `gzip -n`,
because a default `tar | gzip` embeds mtimes and changes the digest per run.

### 9. Only when asked: the proof, the image and the CA bundle

**Reproducibility** (SW-REL-14) and the **image** (SW-REL-15) run only when the
owner asked for them. Their commands, the Dockerfile and what each measured
are in [references/optional-legs.md](references/optional-legs.md).

**The CA bundle step** (SHOULD, `unverified: read only`) is a `FROM scratch`
image that copies a CA bundle and makes one HTTPS request. It is in
[references/optional-legs.md](references/optional-legs.md).

### 10. Push the tag and let CI attest

First confirm the tag is absent from the remote (SW-REL-19). The command must
print `exit 2`. Exit 0 means the tag exists, and then the version number is
spent:

```sh
TAG=v1.2.3 # rename
git ls-remote --exit-code --tags origin "refs/tags/$TAG"; echo "exit $?"
git push origin "$TAG"
```

A library is done at the push apart from step 11. A CLI's push runs the release
workflow, which attests the assets (SW-REL-16, `unverified: read only` for
whether the attestation itself verifies). The workflow declares `id-token:
write` and `attestations: write`, fetches tags with `fetch-depth: 0`, runs
`actions/attest-build-provenance` with `subject-checksums: dist/checksums.txt`
and pins every `uses:` at a 40-hex SHA (SW-GATE-23). Never sign on a laptop or
in an agent sandbox, and never store a signing key.

**Check the workflow before the first tag.** Output is the finding. A missing
workflow file is itself a finding, and `grep -L` on a missing file prints only an
error (exit 2), so the block tests for the file first. Point it at the real file:

```sh
if [ -f .github/workflows/release.yml ]; then
  grep -L -e 'id-token: *write' .github/workflows/release.yml
  grep -L -e 'subject-checksums: *dist/checksums.txt' .github/workflows/release.yml
  grep -L -e 'fetch-depth: *0' .github/workflows/release.yml
  grep -L -e 'attestations: *write' .github/workflows/release.yml
else
  echo 'FINDING: no .github/workflows/release.yml, a CLI release has no attesting workflow'
fi
[ -d .github/workflows ] && grep -rn -e 'uses: ' --include='*.yml' --include='*.yaml' .github/workflows | grep -v -e 'uses: \./' | grep -v -E -e '@[0-9a-f]{40}' -e '^[^:]*:[0-9]+: *#'
[ -d .github/workflows ] && grep -rn -e 'uses: .*@main' -e 'uses: .*@master' --include='*.yml' --include='*.yaml' .github/workflows
```

### 11. Verify what was published

Download the release as a consumer would and check the names, the bytes and
the provenance (SW-REL-13, SW-REL-16):

```sh
TAG=v1.2.3 REPO=example/tool TOOL=tool # rename all three
VERIFY=$(mktemp -d)
gh release download "$TAG" -R "$REPO" --dir "$VERIFY"
cd "$VERIFY"
for p in linux-amd64 linux-arm64; do ls | grep -c -x -e "$TOOL-$p"; done
sha256sum --check --strict checksums.txt
gh attestation verify "$TOOL-linux-amd64" -R "$REPO"
```

The name loop prints `1` per platform, and a `0` means an anchored mirror
pattern selects nothing. `sha256sum` must print `OK` for every asset and exit
0. `gh attestation verify` must exit 0 (`unverified: read only`), and a
non-zero exit means no attestation covers those bytes. Repeat the attestation
line for each platform a consumer installs. A library resolves the **published**
tag from a clean consumer: repeat step 3's smoke test with the hosting URL in
place of `file://`.

### 12. A release went out wrong

Never move, re-create, delete or re-upload (SW-REL-19, see the opening
section). Ship the next patch version and run this procedure from step 1. A
registry's unpublish endpoint is a registry operation: `unverified: read only`.

## The MUST rows this procedure enforces

The 18 merge-blocking rows (the gate on the tagged commit, the lock, the pin, the SDK
checksum, the static recipe, the SBOM, the version stamp, the checksums, the tag form
and the permanence of a pushed tag) are restated as findings with their rule IDs in
[references/must-rows.md](references/must-rows.md), so a review without the rule files
loaded still reports them.

## What agents get wrong here

The 15 recurring mistakes, ranked, are in
[references/agent-mistakes.md](references/agent-mistakes.md). The four that cost most:
presenting `--static-swift-stdlib` as the static build (step 6), copying a hard-coded
`.build/release` path or running `--show-bin-path` without the build's `--swift-sdk`
(step 6), a floating or partial toolchain pin (step 2), and moving or re-creating a
pushed tag to "fix" a release (step 12).

## The receipt

Every run ends with the release form of the SW-CORE-21 receipt, whether it stopped
at a failed gate or published:

- **Request:** the release asked for, in the owner's words.
- **Build identity:** `swift --version`, the configuration and SDK id, the tag,
  the commit it points at, and `echo "$SWIFT_BACKTRACE"`.
- **Evidence:** per step, the command and its exit code or verbatim output. A
  step that was not run says `not run`.
- **Findings:** each with its rule ID, or a named gap when no rule covers it.
- **Unverified:** every `unverified: read only` item (arm64, attestation, the
  CA bundle step, anything on macOS or Windows).
- **Rules relied on:** every rule ID the run cited.
- **Stopped at:** the step, and the one action only the owner can take. State
  whether the tag was pushed, because only step 10 publishes.
