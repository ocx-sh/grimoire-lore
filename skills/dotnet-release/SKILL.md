---
name: dotnet-release
description: Ordered runbook for cutting a .NET release, for a NuGet library or SDK (version from the tag, cold restore, pack, package validation, dotnet-validate, PublicAPI promotion, Trusted Publishing from a tag job) and for an app (publish mode table, trim and AOT warning gate, run the artifact, SHA256SUMS and provenance, container, SIGTERM). Use when releasing, tagging or packing a .NET package or app, writing or reviewing a release workflow, choosing a dotnet publish mode, or hitting NU5104, NU5125, package validation errors (CP0002, CP0008), IL2026 or IL3050 on publish, an app that exits 134 after a clean publish, or a nupkg versioned 0.0.0-alpha.0. Not for moving to a new SDK or target framework (dotnet-upgrade), not for a build, restore or test that already fails (dotnet-diagnose), and not for MSI, MSIX, Authenticode or app-store signing.
license: Apache-2.0
metadata:
  summary: Gate-ordered .NET release procedure for NuGet libraries and published apps, built around the permanence of a pushed tag and a nuget.org version, with its commands watched red and green on SDK 10.0.401
  keywords: dotnet,nuget,release,pack,package-validation,dotnet-validate,minver,publicapi,trusted-publishing,publish,trimming,native-aot,self-contained,single-file,sha256sums,attestation,container
---

# dotnet-release

## A pushed tag or nuget.org version is permanent. Read this before step 1

nuget.org never deletes a version. Unlisting hides it from search, but the ID and version stay
taken, and a restore that names the version still receives the bytes. `dotnet nuget push
--skip-duplicate` skips a version that exists, so a rerun with rebuilt bytes exits 0 and the
registry keeps the first bytes (CS-PKG-12). A tag moved after the release job ran leaves the
registry holding the old commit's bytes under the version the tag now names. An app release is bound
the same way: the published `SHA256SUMS` and attestation name the old digests.

Two consequences bind everything below.

- **There is no fix-the-release path, so do not design one.** No unlist-and-reuse,
  no moved tag, no re-uploaded asset. A bad release is followed by the next
  patch version.
- **Every gate runs before `git push origin TAG`.** A defect found before the
  push costs a commit. A defect found after it costs a version number. Step 13
  is the only step that publishes, and it runs only when the owner asked for
  this release to be cut.

Contents: [Scope](#scope) · [The runbook](#the-runbook) · [The app rules](#the-app-rules) ·
[The MUST rows this procedure enforces](#the-must-rows-this-procedure-enforces) ·
[What agents get wrong here](#what-agents-get-wrong-here) ·
[The receipt](#the-receipt)

## Scope

| Code kind | Steps | Rule families it draws on |
|---|---|---|
| NuGet library or SDK (a package, no app) | 0 to 8, 13 to 16 | CS-PKG-01 to 15, CS-SEC-09, CS-SEC-10, CS-API-11, CS-API-14, CS-API-15, CS-BUILD-13, CS-BUILD-21, CS-BUILD-25 to 27 |
| App: CLI, service, container or download | 0, 1, 3, 9 to 16 | DN-REL-01 to 14, CS-BUILD-13, CS-JSON, CS-XP |
| A repository that ships both | the union | both rows |
| A single-file script (`dotnet run --file`) | 9, then DN-REL-14 | DN-REL-14 |

Out of scope, with no rule behind them here: installers, MSI and MSIX, Authenticode and store
signing. `unverified: read only` goes in the receipt for every write to nuget.org (push, unlist,
prefix reservation), the Trusted Publishing exchange, `gh attestation verify`, a registry push, and
any Windows, macOS or arm64 artifact; a cross-built binary never executed is `built, not run`.

Tool versions, measured 2026-10-11 on Linux x64: SDK 10.0.401 (SDK 8.0.425 ignores
`SOURCE_DATE_EPOCH` and fails NETSDK1045 on `net10.0`, so the release job runs the newest SDK from
`global.json`, never the floor), MinVer 8.0.0, PublicApiAnalyzers 5.6.0, `dotnet-validate`
0.0.1-preview.582 pinned in `.config/dotnet-tools.json`, GNU `grep`, `jq` and `sha256sum`. .NET 8
and 9 reach end of support on 2026-11-10. A step that names a rule ID is a procedure around that
rule, whose text lives with the ID. Depth is in
[references/library-steps.md](references/library-steps.md) and
[references/app-modes.md](references/app-modes.md). The release defaults (MinVer from tags, snupkg,
Trusted Publishing, a cold restore, `--self-contained` on every publish) are the owner defaults of
the `csharp-quality` index; each rule cited below states how to override its own.

## The runbook

Run the steps in order. Steps 0 to 12 exist to fail before anything is pushed. Every `dotnet` build,
restore, pack and publish line is wrapped per DN-RULE-01 (timeout, output to a file, exit printed)
and takes no CLI-wide flag on `dotnet test` (DN-RULE-02). Every log and output goes under `LOGS`
outside the tree (`ART` holds the nupkgs, `OUT` the publish output), so the step 3 clean-tree check
sees real changes only; the rule blocks that name `artifacts` or `$PACK` read `$ART`. The blocks run
in one bash shell (zsh aborts on an unmatched glob) and share `LOGS`, `ART`, `OUT`, `G`, `SLN`,
`TAG`, `COLD`, `OLD_PKG` and the exports: a harness that starts a fresh shell per command sets them
again from the printed `LOGS=` and `COLD=` lines. This runbook is the gates of the release job
(R1 to R14, with its workflow, in [references/library-steps.md](references/library-steps.md))
run locally.

```sh
LOGS=${LOGS:-$(mktemp -d)}; ART=$LOGS/artifacts; OUT=$LOGS/out; echo "LOGS=$LOGS" # rm -rf "$LOGS" after the receipt
```

### 0. Precondition: the SDK

The assertion of CS-BUILD-21 exits 0, or the job would run on whatever SDK the host holds. `dotnet`
walks up for `global.json` from the working directory, not the solution: run every step from the
directory that holds it (`src` for `src/global.json`). The walk stops at the repository root, so a
file in `$HOME` or above never counts. The major comes from that file:

```sh
TOP=$(git rev-parse --show-toplevel); d=$PWD; while [ ! -f "$d/global.json" ] && [ "$d" != "$TOP" ] && [ "$d" != / ]; do d=$(dirname "$d"); done
G=$d/global.json; if [ -f "$G" ]; then M=$(jq -r '.sdk.version // empty | split(".")[0]' "$G") && test -n "$M" && dotnet --version | grep -q -E "^$M\."; echo "sdk exit $? ($G)"; else G=; echo "sdk exit none"; fi
```

`sdk exit 0` passes. `sdk exit 1` (no `sdk.version`, or a host on another major) and `sdk exit none`
(no `global.json` up to the root) are CS-BUILD-21 findings, not stops (NSubstitute, refit: the host
then takes its newest installed SDK, which can be a preview); with `G` empty the runner is VSTest
(step 3). Any other number is a file `jq` cannot parse (it rejects the comments `global.json`
allows): read it, and say so. The release commit adds `sdk.version` (the owner's call: ask before
step 3); later steps run on that SDK only, and the receipt records `dotnet --version`.

### 1. Decide the version and the tag

- Tags are `vX.Y.Z`, three components, annotated by default. The tag is the only version source
  (CS-PKG-06). A repository whose tags are all lightweight (the second list below prints every one)
  still gets an annotated new tag, and the receipt notes the mixed forms; the old ones stay.
- A library takes the bump from the mechanical signals of CS-API-14 (the
  `PublicAPI.Unshipped.txt` diff, `*REMOVED*` lines, suppressions), never from the
  size of the diff. With no `PublicAPI` files there are no signals: the bump is the
  owner's call (ask before step 3) and the missing files are the CS-API-11
  finding. An app takes it from the owner.
- A tag that already exists on the remote is a new version number, never a move.

**Check the tag.** A clone may hold no tags, which makes the two tag-form lists vacuous, so fetch
them first (a blob-less or shallow clone needs it). `exit 2` means the tag is absent, and `exit 0`
means the version number is spent. The other two print nothing when the tags are well formed (the
second lists every lightweight tag):

```sh
TAG=v1.2.3 # rename
git fetch --tags origin
git ls-remote --exit-code --tags origin "refs/tags/$TAG"; echo "exit $?"
git tag -l | grep -v -x -E 'v[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?'
git for-each-ref --format='%(objecttype) %(refname:short)' refs/tags | grep -v -e '^tag '
```

A finding on an already pushed tag goes into the receipt and is never repaired: moving it is the
violation this skill opens with.

### 2. Library: promote the public API files and pin the tools in the release commit

CS-API-11 owns the file discipline and CS-API-15 owns the order. In the release commit, fold every
`PublicAPI.Unshipped.txt` into its `PublicAPI.Shipped.txt` (script in
[references/library-steps.md](references/library-steps.md): it appends and never re-sorts, so the
diff holds the new lines only), then rebuild with warnings as errors. After the promotion `PublicAPI.Unshipped.txt` holds only `#nullable enable` and
`PublicAPI.Shipped.txt` changes only in release commits. Never hand-write entries. The file count
must print `1` or more (none in a packable library is a CS-API-11 finding) and the remaining entries
`0`:

```sh
git ls-files '*PublicAPI.Unshipped.txt' | wc -l
git ls-files -z '*PublicAPI.Unshipped.txt' | xargs -0 -r grep -hvE -e '#nullable enable' -e '^[[:space:]]*$' | wc -l
```

A package without a `PublicAPI.Shipped.txt` has no baseline for the analyzer, and `*REMOVED*` lines
are breaking-change markers that still need package validation in step 4 (the analyzer cannot see
binaries).

Step 6 runs pinned tools, so the manifest belongs in this commit, before the step 3 tag
([commands](references/library-steps.md#pin-the-tools-step-2); `tool update` re-serializes every
entry, so its diff is wider than the pin).

### 3. Gate the exact commit: cold restore, build, format, test, tag locally

Run the gate of CS-BUILD-16 (build, then format) on the commit the tag will point at, plus the
audit-off restore, the NU190x count and the repository's test command. Every `dotnet` line takes the
solution (a bare one exits MSB1003 with none in the directory, MSB1011 with two). The fetch and
prefetch lines keep a shallow or partial clone from packing `0.0.0-alpha.0` or failing `MSB4018`,
and the grep names the CI variable the props key on: export it, or no snupkg is packed (CS-PKG-03).
`COLD`, the cold packages folder, lives until the cleanup after step 8 and is printed; a rerun
empties it and never makes a second. Notes: [library-steps.md](references/library-steps.md#step-3-host-notes).

```sh
SLN=Acme.slnx # rename: the .sln or .slnx that builds everything (a project operand skips the solution-level audit assertion)
test -f "$SLN"; echo "sln exit $?"
git grep -n -F -e GITHUB_ACTIONS -e TF_BUILD -e '$(CI)' -- '*.props' '*.targets' '*.csproj'
export GITHUB_ACTIONS=true CI=true MSBUILDTERMINALLOGGER=off DOTNET_NOLOGO=1 # plus TF_BUILD=true when the grep names it
test "$(git rev-parse --is-shallow-repository)" = false || git fetch --unshallow --tags origin
git rev-parse --is-shallow-repository
test "$(git config remote.origin.promisor)" != true || git log -p --format= -- '*version.json' '*version.jsonc' > /dev/null
timeout 900 dotnet restore "$SLN" --force -p:NuGetAudit=false --tl:off --interactive false --disable-build-servers -nologo -v:q > "$LOGS/noaudit.log" 2>&1; echo "audit-off exit $?"
grep -c -e 'Restore did not audit every project' "$LOGS/noaudit.log"
test -n "${COLD-}" || { COLD=$(mktemp -d); OLD_PKG=${NUGET_PACKAGES-}; }; find "$COLD" -mindepth 1 -delete; export NUGET_PACKAGES=$COLD; echo "COLD=$COLD OLD_PKG=$OLD_PKG"
timeout 900 dotnet restore "$SLN" --force --tl:off --interactive false --disable-build-servers -nologo -v:q > "$LOGS/restore.log" 2>&1; echo "restore exit $?"
grep -c -E 'NU190[0-5]' "$LOGS/restore.log"
timeout 900 dotnet build "$SLN" -c Release --no-restore --no-incremental --tl:off --interactive false --disable-build-servers -nologo -v:q > "$LOGS/build.log" 2>&1; echo "build exit $?"
timeout 900 dotnet format "$SLN" --verify-no-changes --no-restore > "$LOGS/format.log" 2>&1; echo "format exit $?"
```

The runner picks the test line: `G` from step 0 names it, and no `G` or no `test.runner` is VSTest.
Microsoft Testing Platform takes `--solution` and the zero-test gate (CS-TEST-06). VSTest rejects
both (MSB1001 `Unknown switch`) and exits 0 on a filter that matches nothing, so its `Total:` count
must print `1` or more:

```sh
if [ -n "$G" ]; then jq -r '.test.runner // "VSTest"' "$G"; else echo VSTest; fi
timeout 900 dotnet test --solution "$SLN" -c Release --no-build --minimum-expected-tests 1 > "$LOGS/test.log" 2>&1; echo "test exit $?"
timeout 900 dotnet test "$SLN" -c Release --no-build > "$LOGS/test.log" 2>&1; echo "test exit $?"; grep -c -E 'Total: +[1-9]' "$LOGS/test.log"
```

- `sln exit` must be `0`. `audit-off exit` must be non-zero **and the count after it `1` or more**:
  that is the audited-count assertion (CS-BUILD-26) firing. Exit `0` means nothing asserts the
  audit, a MUST row 1 finding; another exit 1 (a missing source, a compile error) is not it.
- `restore exit` must be `0` into the empty packages folder (CS-BUILD-27), and the count `0`. Any
  NU1900 to NU1905 line is a finding: fix the advisory or accept it through `NuGetAuditSuppress`
  with a reason, never mute it (DN-RULE-04).
- `build exit` and `format exit` must be `0` (a format exit 2 after a green build
  is a formatting diff only, CS-BUILD-16). A non-zero build is dotnet-diagnose's: an `error :` line
  with no code and `invalid digest` is DN-DIAG-69, and an analyzer error that only the newest SDK
  raises on code the CI's SDK builds clean is a finding to record with that SDK's version (never
  `NoWarn`, DN-RULE-04). `test exit` must be `0`: exit 8 is zero tests and a failure, not a pass
  (CS-TEST-06, DN-RULE-07). A host runtime gap is not a failing test: the host-condition
  rows of the dotnet-diagnose catalogue (DN-DIAG-70) hold the strings. Install the runtime, or add
  `-f <installed TFM>` and say so in the receipt.

Require a clean tree, then tag the commit **locally**, annotated. Do not push the tag before step
13:

```sh
git status --porcelain
TAG=v1.2.3 # rename
git tag -a "$TAG" -m "$TAG"
```

Until the push, fix a failed later step in a new commit, run `git tag -d "$TAG"` and start again
from step 2.

### 4. Library: pack, and gate on the exit code

A repository that ships several packages runs steps 4 to 7 once per packable project (`for PRJ in
src/Acme.Lib src/Acme.Lib.Extras; do ...; done`, the package ID in place of `Acme.Lib`).

```sh
test "$(dotnet msbuild src/Acme.Lib -getProperty:EnablePackageValidation)" = true; echo "validation exit $?"
rm -rf "$ART"
SOURCE_DATE_EPOCH=$(git log -1 --format=%ct) timeout 900 dotnet pack src/Acme.Lib -c Release -o "$ART" --tl:off --interactive false -nologo -v:q > "$LOGS/pack.log" 2>&1; echo "pack exit $?"
ls "$ART"/*.snupkg
```

`validation exit` must be `0`: with `EnablePackageValidation` empty or `false`, `pack` exits 0 and
validates nothing. `pack exit` must be `0`; package validation (CS-PKG-09) runs inside it: a removed
member is `error CP0002` and the exit is 1, yet the nupkg is still written, so a gate on `ls
"$ART"/*.nupkg` passes a broken release. With no version source (no MinVer, no `Version` in the
props: NSubstitute) the pack writes `1.0.0`: add `-p:PackageVersion=${TAG#v}` to this pack and to
step 7's (`-p:Version` is ignored when the props set `PackageVersion`), and record a CS-PKG-06
finding, not a stop. After a failure delete `$ART`, fix, and rerun.
NU5104 (a stable package with a prerelease dependency) and NU5125 (a deprecated license or icon URL)
fail the pack under warnings-as-errors: fix the reference or the metadata, never `NoWarn`
(DN-RULE-04). The first release leaves `PackageValidationBaselineVersion` unset; a baseline not on a
feed yet fails restore with NU1102.

### 5. Library: check the package, not the exit code

`pack` exits 0 on an anonymous package with the SDK's default author and description, so read the
artifact. The first command exits 0 when the packed version is the tag, and the second prints
nothing (`find`, because `ls` with an unmatched glob prints `no matches found` under zsh). The
glob stops at the version digit, so `Acme.Lib.Extras.*` of a sibling package never matches:

```sh
TAG=v1.2.3 # rename
P=$(ls "$ART"/Acme.Lib.[0-9]*.nupkg | grep -v -e '\.symbols\.nupkg$' | head -n 1)
test "$(basename "$P" .nupkg)" = "Acme.Lib.${TAG#v}" && echo "version ok"
find "$ART" -name 'Acme.Lib.0.0.0*'
```

Then run, against `$ART` and once per nupkg (a rule line that globs `artifacts/*.nupkg` into one
`unzip -p` breaks with two packages), the nuspec check of CS-PKG-01 (six elements and a non-default
description), the listing and size check of CS-PKG-15 and the leak check of CS-SEC-10; each exits 0
or prints nothing, as its rule states. A library that wraps no tool (no `TOOL`) and a repository
without `eng/runtime-dependencies.txt` follow the [per-nupkg
notes](references/library-steps.md#check-the-packed-dependencies-per-nupkg), which also hold the
CS-SEC-09 loop.

### 6. Library: dotnet-validate on every nupkg

`dotnet-validate` is its own pinned tool, not an SDK verb (CS-PKG-10); its exit 1 causes are in
[library-steps.md](references/library-steps.md#dotnet-validate-failures-step-6). With no tool
manifest `tool restore` restores nothing and exits 0, so the `jq` line must print
`0.0.1-preview.582` (step 2 committed it). The restore runs against the real packages folder, not
`COLD`: the tool cache records the path it restored into, and a second `tool restore` does not
repair it after `COLD` is deleted (`Run "dotnet tool restore"` at the next `tool run`):

```sh
git grep -n -E -e 'EmbedUntrackedSources>[[:space:]]*false' -- '*.props' '*.csproj' '*.targets'
jq -r '.tools["dotnet-validate"].version' .config/dotnet-tools.json
( test -n "$OLD_PKG" && export NUGET_PACKAGES=$OLD_PKG || unset NUGET_PACKAGES; timeout 300 dotnet tool restore > "$LOGS/tool.log" 2>&1; echo "tool restore exit $?" )
( for p in "$ART"/*.nupkg; do timeout 300 dotnet tool run dotnet-validate package local "$p" > "$LOGS/validate.log" 2>&1 || exit 1; done ); echo "validate exit $?"
```

### 7. Library: reproduce in a second directory

Pack a fresh clone with step 4's command (CS-PKG-05): the pass is `clone pack exit 0` and
`reproducible` ([commands](references/library-steps.md#reproduce-in-a-second-directory-step-7)).

### 8. Library: check the release workflow before the first tag

Define the operands the CS-PKG blocks read (each exits on an unset one): `CIF` is the workflow
directory, `REL` the workflow that holds `nuget push`, the file the per-file loop below prints (two
files: run the `REL` lines once per file):

```sh
CIF=.github/workflows
REL=$(git grep -l -e 'nuget push' -- "$CIF" | head -n 1); : "${REL:?MISSING REL}"
```

Run the Verify lines of CS-PKG-07, CS-PKG-09, CS-PKG-11, CS-PKG-12 and CS-PKG-13 against them: a
full-depth checkout, no `continue-on-error`, no API-key secret, `NuGet/login` pinned at a full SHA,
`id-token: write` only on the publish job, a tag-only trigger, `--skip-duplicate`, exactly one
`dotnet pack`. Those blocks miss some triggers (`on: release:` passes), so run the [per-file
loop](references/library-steps.md#check-every-publishing-workflow); it also counts the
`fetch-depth: 0` of a `git describe` version (NSubstitute, CS-PKG-07) and flags a pack that lives in
a script (a `dotnet pack` count of `0` beside a printed script line: read the script, require one
across both). A repository with none (`MISSING REL`) says in the receipt which pipeline publishes
(Azure Pipelines, for one), or that the publishing path is unverified. Placeholder pins satisfy
every pin grep, so this must print nothing:

```sh
git grep -n -E -e '@0{40}' -- .github/workflows
```

The workflow that satisfies all of them is in [library-steps.md](references/library-steps.md).

**Clean up the cold folder here** (after step 12 for an app; the path is the `COLD=` line of step 3).
The restore left `obj/project.assets.json` pointing into it, so deleting it alone fails every later
`--no-restore` build with NETSDK1064; restore normally after the delete:

```sh
rm -rf "${COLD:?MISSING COLD}"; export NUGET_PACKAGES=$OLD_PKG; test -n "$OLD_PKG" || unset NUGET_PACKAGES
unset GITHUB_ACTIONS CI TF_BUILD COLD OLD_PKG
timeout 900 dotnet restore "$SLN" --tl:off --interactive false --disable-build-servers -nologo -v:q > "$LOGS/restore2.log" 2>&1; echo "restore2 exit $?"
```

### 9. App: pick the mode

Read the mode table in [references/app-modes.md](references/app-modes.md), top to bottom, and take
the first row that fits. Single-file and AOT output is specific to one OS and architecture, so a
release is a matrix of RIDs, each built on a runner that can link it. Record the row.

### 10. App: publish under warnings-as-errors and gate on zero IL diagnostics

The publish properties live in the csproj (DN-REL-01). `--self-contained` is written on the command
(DN-REL-02). ILLink inherits `TreatWarningsAsErrors` (CS-BUILD-13), so IL2026 and IL3050 fail the
publish. In a repository without that posture they are warnings, the publish exits 0 and the
artifact exits 134. The publish exit is `0`, the count prints `0`, `suppress exit` prints `0` and the
`git grep` prints nothing (DN-REL-03; the app-modes.md blocks that read `out` read `$OUT`):

```sh
RID=linux-x64 # rename
timeout 900 dotnet publish src/Acme.App -c Release -r $RID --self-contained true -p:TrimmerSingleWarn=false -o "$OUT" --tl:off --interactive false --disable-build-servers -nologo -v:q > "$LOGS/pub.log" 2>&1; echo "publish exit $?"
grep -c -e 'warning IL' -e 'error IL' "$LOGS/pub.log"
test "$(dotnet msbuild src/Acme.App -getProperty:SuppressTrimAnalysisWarnings)" != true; echo "suppress exit $?"
git grep -n -E -e 'SuppressTrimAnalysisWarnings>[[:space:]]*true' -- '*.csproj' '*.props' '*.targets'
```

The last two lines catch the gate gone vacuous: `SuppressTrimAnalysisWarnings` set to `true` hides
every IL diagnostic, so the count prints `0` and the artifact still exits 134. A Native AOT publish
that exits 1 with `ld returned 1` hides the cause at `-v:q`: rerun at `-v:m`. `cannot find -lz` or
`Requested linker ('clang') not found in PATH` is a missing prerequisite, not a defect in the code
([app-modes.md](references/app-modes.md#traps-by-mode) lists the packages per distro).

Fix an IL diagnostic in this order: remove the reflection, then annotate with
`DynamicallyAccessedMembers`, then `RequiresUnreferencedCode`. Never `UnconditionalSuppressMessage`,
`#pragma warning disable` or `NoWarn` (CS-CORE-01).

### 11. App: run every artifact, then the container and the stop

Exit 0 from a publish proves nothing (CS-CORE-03). Run a copy of exactly the unit that ships, from
an empty directory (DN-REL-09). Empty output from the `cp` and `exit 0` from the run is the pass:

```sh
SHIP="$OUT/Acme.App" # rename: every file the release ships, space-separated; a directory release is SHIP="$OUT/." 
ARGS="serialize" # rename: one invocation of the app's main feature (a build, a serialize, a request)
d=$(mktemp -d); cp -a $SHIP "$d"/
( cd "$d" && timeout 60 ./Acme.App $ARGS > run.log 2>&1; echo "run exit $?"; test -s run.log && head -3 run.log )
rm -rf "$d"
```

For a trimmed, R2R or AOT artifact `--version` and `--help` start before any reflected or trimmed
member is touched and pass an app that cannot do its job (DN-REL-05): `ARGS` is a command on the
main feature path. An app that rejects an unsupported flag exits non-zero (134 on an unhandled
exception): that is the argument, not the artifact. A container build, a stop test and the
globalization run are DN-REL-10, DN-REL-11 and DN-REL-07. A Native AOT leg runs on a native runner
per OS; a leg that cannot run its artifact (osx, arm64) says `built, not run`.

### 12. App: checksums and attestation

Write `SHA256SUMS` over the final bytes, after any compression, then verify it (DN-REL-13). The
attestation step runs in the tag job only (`unverified: read only`). This block proves only that
the sums file lists every shipped file and matches the bytes at hand (exit 1 on a missing file); the
tamper check is the step 14 consumer run:

```sh
D=$LOGS/dist # the folder the release job assembles
# flat Acme.App-* files (exits 1 on a directory)
( cd "$D" && sha256sum Acme.App-* > SHA256SUMS && sha256sum -c --strict SHA256SUMS ); echo "sums exit $?"
# a release of directories, one publish folder per RID
( cd "$D" && find . -type f ! -name SHA256SUMS | sort | xargs -r -d '\n' sha256sum > SHA256SUMS && sha256sum -c --strict SHA256SUMS ); echo "sums exit $?"
```

### 13. Push the tag (only when the owner asked)

The check must print `exit 2`. Exit 0 means the tag exists and the version number is spent, and the
push does not run. A rehearsal pushes to a throwaway bare repository, never the real remote
([commands](references/library-steps.md#rehearse-the-push-step-13)):

```sh
TAG=v1.2.3 # rename
git ls-remote --exit-code --tags origin "refs/tags/$TAG"; rc=$?; echo "exit $rc"
[ "$rc" -eq 2 ] && git push origin "$TAG"
```

The tag push starts the release workflow, the only publishing path. A library verifies, then pushes
through Trusted Publishing (`unverified: read only`; a policy scoped to a package ID that does not
exist yet was never exercised). An app builds each RID, runs each artifact, writes `SHA256SUMS`,
attests, and creates the release (DN-REL-12). Never `dotnet nuget push` or `docker push` from a
laptop or an agent sandbox, and never store an API key or a signing key.

### 14. Verify what was published

A library: poll for up to 15 minutes while the symbol package indexes, then validate the remote
package and run the SourceLink test (commands in
[references/library-steps.md](references/library-steps.md); `unverified: read only`). An app: download the release as a consumer would, run `sha256sum -c --strict SHA256SUMS`,
then `gh attestation verify` on each asset (`unverified: read only`).

### 15. After the release

A library: in a separate commit after the package is on the feed, set
`PackageValidationBaselineVersion` to the released version (CS-API-15 step 4). Once, after the first
publish, the owner applies for the ID prefix on nuget.org.

```sh
TFM=$(dotnet msbuild src/Acme.Lib -getProperty:TargetFrameworks -getProperty:TargetFramework | jq -r '.Properties | (if .TargetFrameworks != "" then .TargetFrameworks else .TargetFramework end) | split(";")[0]')
test "$(dotnet msbuild src/Acme.Lib -getProperty:PackageValidationBaselineVersion -p:TargetFramework=$TFM)" = "$(git describe --tags --abbrev=0 | sed 's/^v//')" && echo "baseline ok"
```

### 16. A release went out wrong

Ship the next patch version and run this procedure from step 1 (the opening section). Unlisting a
version is a registry operation, `unverified: read only`.

## The app rules

`DN-REL` is this skill's own family of app-release steps. Each is a gate in the release workflow,
checked on the published artifact or the repository text, never on the publish exit code alone. Era:
SDK 10.0.401, .NET 10, linux-x64, measured 2026-10-11. Commands marked "block" are in the DN-REL
blocks of app-modes.md. Empty output passes unless the cell says otherwise.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| DN-REL-01 | Set `PublishAot`, `PublishSingleFile`, `PublishTrimmed` and `PublishReadyToRun` in the csproj or props, never as `-p:` in CI. | Only project-level properties switch the analyzers on during `dotnet build`: IL2026 and IL3050 appeared at build, before any publish. | `dotnet msbuild src/Acme.App -getProperty:EnableTrimAnalyzer -getProperty:EnableSingleFileAnalyzer -getProperty:EnableAotAnalyzer` prints `true`, with no extra argument, for the analyzer of the mode the release publishes: `EnableTrimAnalyzer` for `PublishTrimmed`, `EnableSingleFileAnalyzer` for `PublishSingleFile`, `EnableAotAnalyzer` for `PublishAot` (which turns all three on). An empty one for a published mode is the finding; the other two may be empty (a `PublishSingleFile`-only app has `EnableTrimAnalyzer` empty), and `PublishReadyToRun` has no analyzer. Block REL-01 prints nothing. Watched (SDK 10.0.401): a trim-only, a single-file-only and an AOT csproj print `true` for their own analyzer (single-file-only `EnableTrimAnalyzer` empty, where the old trim-only cell read it as a defect), and a csproj with no mode, which CI would give `-p:`, prints all three empty. | MUST |
| DN-REL-02 | Write `--self-contained true` or `--no-self-contained` on every `dotnet publish -r`, and `-p:SelfContained=` on every `msbuild -t:Publish`. | On net8 and later `-r` alone is framework-dependent and silent (SDK 8.0.425 and 10.0.401). `msbuild -t:Publish` ignores the single-file implication: 116,197 bytes against 73,626,120. | Block REL-02. Watched red and green. | MUST |
| DN-REL-03 | Publish under CS-BUILD-13 warnings-as-errors with `-p:TrimmerSingleWarn=false`, and gate on zero IL diagnostics. | IL3000, IL2026 and IL3050 are warnings by default: the publish exits 0 and the artifact exits 134. ILLink inherits `TreatWarningsAsErrors`, and `TrimmerSingleWarn=false` expands a package's one-line IL2104 into its real sites. | Step 10: `publish exit` prints `0`, the count prints `0`, `suppress exit` prints `0` and the `git grep` prints nothing: with `SuppressTrimAnalysisWarnings` `true` the count is `0` over hidden diagnostics (bicep showed 0 and hid 944). Watched: a reflection-JSON app exits 1 under the posture, and exits 0 then 134 at run time without it; with the suppression it publishes with count 0 and `suppress exit` 1; the source-generated twin exits 0 with 0 diagnostics and `suppress exit` 0. | MUST |
| DN-REL-04 | No `Assembly.Location`, `.CodeBase` or `.EscapedCodeBase` in app code or in any library the app ships. Use `AppContext.BaseDirectory` for the directory and `Environment.ProcessPath` for the exe. | In a single-file bundle `Location` is `""`, `Path.GetDirectoryName("")` returns null, and the next `Path.Combine` throws (exit 134 on Linux and Windows). | The shipped posture does not ban it: in a repo with BannedApiAnalyzers add `P:System.Reflection.Assembly.Location;single-file returns "": use AppContext.BaseDirectory` to the app's `BannedSymbols.txt`, and RS0030 then fails the build; IL3000 (a warning) flags it too under `PublishSingleFile`. Block REL-04 is a reading heuristic over shipped trees: judge each hit against the unit the release ships. Watched red and green. | MUST |
| DN-REL-05 | Never publish a trimmed, AOT or file-based app that serializes with reflection JSON. Use source generation (CS-JSON). | It fails at run time with `Reflection-based serialization has been disabled`. A file-based app already fails under `dotnet run`, because AOT is its default. | DN-REL-03 is the gate, and the DN-REL-09 run prints the serialized document. Watched with DN-REL-03. | MUST |
| DN-REL-06 | Never ship `PublishTrimmed` without `PublishReadyToRun`, except Native AOT (`PublishAot=true` trims and compiles ahead of time, and R2R does not apply). Treat `EnableCompressionInSingleFile` as measured-only. | Trim-only startup went from 64 ms to 162 ms, trim plus R2R gave 41 to 62 ms. Compression halves the size and doubles startup (126 ms against 68 ms). | `dotnet msbuild src/Acme.App -p:RuntimeIdentifier=linux-x64 -getProperty:PublishAot -getProperty:PublishTrimmed -getProperty:PublishReadyToRun` shows `PublishAot` `true` (the row is skipped), or both trim and R2R `true`, or no `PublishTrimmed`. Measured, not a red and green pair. | SHOULD |
| DN-REL-07 | Set `InvariantGlobalization=true` only after the CS-XP culture rules pass, and test with `DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1`. A non-invariant self-contained or AOT app ships only into an image or host that has ICU. | Invariant mode throws `CultureNotFoundException` for `de-DE` and compares ordinally (31 against -1). A no-ICU image exits 139 at startup. The SDK picks the `-extra` (ICU) base image unless invariant is set. | The shipped artifact run with `DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1` set exits 0; the DN-REL-09 run happens in the target image. Watched: a `de-DE` lookup exits 134, an `InvariantCulture` twin exits 0. | MUST |
| DN-REL-08 | Set `IncludeNativeLibrariesForSelfExtract=true` when, and only when, a single-file app has third-party native libraries (`.so`, `.dll`, `.dylib`), and set `DOTNET_BUNDLE_EXTRACT_BASE_DIR` in service units, never `/tmp`. An extensionless executable under `runtimes/<rid>/native/` stays a sidecar even with the flag: ship the publish directory for it. | A lone exe without the flag dies with `DllNotFoundException` for `e_sqlite3` (exit 134), and runs with it. The runtime itself is statically linked: 73,607,592 bytes either way. | Block REL-08, only when a native asset ships: it lists the publish directory (no symbols, `.xml` or `.config`). Compare the list with the files the release ships (`SHIP`, step 11): a listed file the exe-alone run needs and the release omits is the finding. A RID-foreign file that run never loads (bicep's Cosmos Windows `.dll` files in a linux-x64 publish) is not. Watched: a content sidecar lists 2 files where the release ships 1 and the exe alone exits 3; a docs `.xml`, a `.config` and a foreign `.dll` leave the lone exe at exit 0. Windows `.exe` assets: `unverified: read only`. | MUST |
| DN-REL-09 | Execute every published artifact before release: from an empty directory, as a copy of exactly the unit that ships, in the target base image for container, musl or no-ICU targets, and on a native runner per OS for Native AOT. | Each mode fails only at run time: trimmed reflection, a missing sidecar, no ICU, glibc on Alpine. osx and arm64 binaries cross-built with R2R were produced but never run, which means built, not works. | Step 11: `run exit` prints `0` for an invocation of the app's main feature (a trimmed, R2R or AOT artifact answers `--version` before it touches a trimmed member). Block REL-09 is a reading heuristic (list the matrix and compare each AOT RID with its `runs-on`): it covers each OS of every AOT RID, and a Linux leg publishing `win-*` or `osx-*` with `PublishAot` is a finding. Watched: the lone exe exits 3 without its sidecar, the pair exits 0; the reflection-JSON artifact exits 0 on `--version` and 134 on the serialize command. | MUST |
| DN-REL-10 | Build containers with `dotnet publish -c Release -r <rid> --self-contained <bool> -t:PublishContainer`. Leave `ContainerFamily` and `ContainerUser` unset (uid 1654 `app`). Tag with an immutable `$(Version)` as well as anything else. Archive the `Building image ... on top of base image` log line. | Family strings drift: `jammy` became `noble`, and `-aot` was removed (CONTAINER1015). The tag defaults to `latest`. AOT with ICU silently costs 87.6 MB against 30.7 MB. | `docker image inspect acme-app --format '{{.Config.User}}'` prints `1654`. `git grep -n -E -e 'ContainerUser' -e 'ContainerFamily' -- '*.csproj' '*.props' '*.yml'` prints nothing, or each hit is justified. Watched on a local daemon. | MUST |
| DN-REL-11 | Every long-running .NET 10 app handles SIGTERM with Generic Host or `PosixSignalRegistration.Create(PosixSignal.SIGTERM, ...)`, sets `HostOptions.ShutdownTimeout` below the orchestrator's grace period, and passes a stop test only with exit 0. | .NET 10 installs no default SIGTERM handler: `ProcessExit` is not raised and the exit is 143 on 8 and 10. The default 30 s `ShutdownTimeout` outlasts the 10 s `docker stop` grace, so the app is SIGKILLed with exit 137. | `docker run -d --name stop-probe acme-app && sleep 3 && docker stop -t 10 stop-probe; test "$(docker inspect --format '{{.State.ExitCode}}' stop-probe)" -eq 0; docker rm -f stop-probe`. Watched: 143 and 137 red, 0 green. | MUST |
| DN-REL-12 | Push no registry image and create no release outside the tag-triggered, environment-gated job. It has the job shape of CS-PKG-11 and CS-PKG-12, with app assets in place of the nupkg. PR legs use `ContainerArchiveOutputPath` or the local daemon. | `PublishContainer` pushes to whatever `ContainerRegistry` names, and fork PRs get no `id-token`. | Block REL-12 prints nothing. Watched red and green. | MUST |
| DN-REL-13 | Ship `SHA256SUMS` over the final bytes, after any compression or signing, verified with `sha256sum -c --strict`. Attest with `actions/attest` pinned to a full SHA in the tag job only, with `id-token: write`, `attestations: write`, `artifact-metadata: write` and `contents: read` (`contents: write` when the same job creates the release). | Consumers verify before they parse (CS-BIN-07 is the consumer side). `attest-build-provenance` v4 is only a wrapper around `actions/attest` (v4.2.2, read 2026-10-11). | `sha256sum -c --strict SHA256SUMS` exits 0, and exits 1 on a tampered or missing file (step 12 has the flat and the directory form). Block REL-13: the pin hits and the placeholder grep prints nothing. Watched red and green. `gh attestation verify`: `unverified: read only`. | MUST |
| DN-REL-14 | Keep file-based apps outside any project cone. Pin every `#:package Name@x.y.z`, and set `#:property PublishAot=false` when the script reflects. | With a csproj nearby, `dotnet run app.cs` runs that project instead (CS8802). AOT is the file-based default, and it disables dynamic code even under `dotnet run`. | Block REL-14 prints nothing. Era: .NET 10 (SDK 10.0.100; `#:include` needs 10.0.300). Watched red and green. | SHOULD |

The blocks REL-01 to REL-14 are in
[app-modes.md](references/app-modes.md#the-dn-rel-blocks). `git grep` reads one
line at a time: a publish command split over a backslash-continued line or a `run: |` block is a
reading heuristic, so read the workflow once.

## The MUST rows this procedure enforces

These library-path rows are restated as findings with their rule IDs, so a release review that runs
this procedure without the rule files loaded still reports them. The text and the verification live
with the rule.

| # | Finding | Rule |
|---|---|---|
| 1 | The release restore used `--locked-mode`, a warm packages folder, or no proof that the audit ran | CS-BUILD-25, CS-BUILD-26, CS-BUILD-27 |
| 2 | The job did not assert the SDK, or ran an SDK other than `global.json`'s | CS-BUILD-21 |
| 3 | The release build was not warnings-as-errors from the props, or used `-warnaserror` | CS-BUILD-13 |
| 4 | The nuspec carries the SDK's default author or description, or lacks the license, readme, URL, tags, copyright or repository commit | CS-PKG-01 |
| 5 | A stale pack idiom: a SourceLink package, `PackageLicenseUrl`, `PackageIconUrl`, `DeterministicTimestamp=true`, or no `PublishRepositoryUrl` | CS-PKG-02 |
| 6 | `ContinuousIntegrationBuild` is unconditional, keyed on `CI`, or assumed from the SDK | CS-PKG-03 |
| 7 | Symbols are not snupkg, or a `.symbols.nupkg` exists | CS-PKG-04 |
| 8 | A project file sets a version property, or MinVer is not a build-only reference with the `v` prefix: a `GlobalPackageReference` under central package management, else `PackageReference` with `PrivateAssets="all"` and `MinVerTagPrefix` | CS-PKG-06, CS-SEC-10 |
| 9 | The release checkout is shallow, or the packed version is not the tag | CS-PKG-07 |
| 10 | An `.snk`, `SignAssembly` or `PublicSign` with every target framework net8.0 or later | CS-PKG-08 |
| 11 | Package validation is off, `continue-on-error` is set, or the gate was the nupkg's existence and not `pack`'s exit code | CS-PKG-09 |
| 12 | A nupkg was pushed without `dotnet-validate` exit 0 | CS-PKG-10 |
| 13 | The publish path holds an API-key secret, an unpinned `NuGet/login`, or `id-token: write` outside the publish job | CS-PKG-11 |
| 14 | The push is not tag-triggered, does not follow the verify job, rebuilds, or lacks `--skip-duplicate` | CS-PKG-12 |
| 15 | The nupkg carries the wrapped tool's binary or exceeds 5 MiB | CS-PKG-15 |
| 16 | The packed dependency groups exceed the budget, or a build-only package leaked into the nuspec | CS-SEC-09, CS-SEC-10 |
| 17 | A packable library lacks either `PublicAPI` file, or runs an RS00xx rule below error | CS-API-11 |
| 18 | A pushed tag was moved, re-created or deleted, or the tag existed on the remote before the push | gap: no rule (steps 1, 13, 16) |

## What agents get wrong here

The ranked mistakes are in
[references/library-steps.md](references/library-steps.md) for a library and
[references/app-modes.md](references/app-modes.md) for an app. The four that cost
most: reporting a release from an exit code (a pack that wrote its nupkg while validation failed, a
publish with IL warnings that exits 0 and crashes with 134), hand-setting a version or building in
the publish job, writing `-r` without `--self-contained`, and moving or deleting a pushed tag to fix
a release.

## The receipt

Every run ends with the release form of the CS-CORE-03 receipt, whether it stopped at a failed gate
or published:

- **Request:** the release asked for, in the owner's words.
- **Build identity:** `dotnet --version`, the target frameworks, the tag, the
  commit it points at, and the app mode row if an app.
- **Evidence:** per step, the command and its exit code or verbatim output. A
  step that was not run says `not run`.
- **Findings:** each with its rule ID, or a named gap when no rule covers it.
- **Unverified:** every `unverified: read only` item (nuget.org writes, Trusted
  Publishing, the attestation, a registry push, osx, arm64 and Windows artifacts).
- **Rules relied on:** every rule ID the run cited.
- **Stopped at:** the step, and the one action only the owner can take. State
  whether the tag was pushed.
