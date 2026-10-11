# The library release job: steps R1 to R14

Step 3 to step 8 and step 14 to step 15 of `dotnet-release` load this file. It
holds the release job as CI runs it, the workflow that satisfies the CS-PKG
greps, the promotion script and the mistakes agents make. Binds to SDK 10.0.401
on Linux x64, MinVer 8.0.0, PublicApiAnalyzers 5.6.0 and `dotnet-validate`
0.0.1-preview.582 (measured 2026-10-11). `Acme.Lib` and `src/Acme.Lib` are
example names: rename them once. `LOGS`, `ART` and `OUT` are the directories of the runbook's
opening block, outside the tree.

Contents: [The 14 steps](#the-14-steps) · [Pin the tools](#pin-the-tools-step-2) · [dotnet-validate failures](#dotnet-validate-failures-step-6) · [Step 3 host notes](#step-3-host-notes) · [Reproduce in a second directory](#reproduce-in-a-second-directory-step-7) · [The workflow](#the-workflow) ·
[Promote the public API files](#promote-the-public-api-files) ·
[Check the packed dependencies per nupkg](#check-the-packed-dependencies-per-nupkg) ·
[Check every publishing workflow](#check-every-publishing-workflow) ·
[Rehearse the push](#rehearse-the-push-step-13) · [After the push](#after-the-push) ·
[What agents get wrong in a library release](#what-agents-get-wrong-in-a-library-release)

## The 14 steps

Each row is a check that fails the job when it is wired into it. The workflow
below wires R2, R4 to R6 and R8 to R12; R1, the audit-off half of R3 and R7 are
not in it, so add them from the rule blocks named in the Rule column (the
anonymous-package and oversized-package checks are MUST rows) before the first
tag. A step that names a rule ID is a procedure around that
rule, whose text and verification live with the ID.

| # | Step | Check | Rule |
|---|---|---|---|
| R1 | `actions/checkout@<full SHA>` with `fetch-depth: 0` and `persist-credentials: false` | `git rev-parse --is-shallow-repository` prints `false` and `git describe --tags --exact-match` exits 0 | CS-PKG-07 |
| R2 | `actions/setup-dotnet@<full SHA>` with `global-json-file: global.json`: the newest SDK, never the floor | The assertion of CS-BUILD-21 exits 0 | CS-BUILD-21 |
| R3 | Restore into an empty packages folder with the audit asserted: `NUGET_PACKAGES=$RUNNER_TEMP/nuget dotnet restore --force`. Never `--locked-mode` | `restore` exits 0, and `CI=true dotnet restore --force -p:NuGetAudit=false` exits non-zero (the audited-count assertion fires) | CS-BUILD-25, CS-BUILD-26, CS-BUILD-27 |
| R4 | `dotnet build -c Release --no-restore`, then `dotnet test -c Release --no-build --minimum-expected-tests N` | Both exit 0; exit 8 is zero tests and a failure | CS-TEST-06, DN-RULE-07 |
| R5 | `SOURCE_DATE_EPOCH=$(git log -1 --format=%ct) dotnet pack src/Acme.Lib -c Release -o artifacts` (`GITHUB_ACTIONS=true` is set by the runner) | Exit 0, which includes the CP#### package validation; `ls artifacts/*.snupkg` | CS-PKG-04, CS-PKG-05, CS-PKG-09 |
| R6 | Version and tag consistency | The packed file name is `Acme.Lib.` plus the tag minus `v`, and no `0.0.0` package exists | CS-PKG-07 |
| R7 | Metadata, dependency budget and no native binary | The nuspec check of CS-PKG-01, the listing check of CS-PKG-15, the two `test` lines of CS-SEC-09, the leak check of CS-SEC-10 | CS-PKG-01, CS-PKG-15, CS-SEC-09, CS-SEC-10 |
| R8 | Provenance: `dotnet tool restore`, then `dotnet-validate package local` on every nupkg | Exit 0 on each | CS-PKG-10 |
| R9 | Reproducibility: the same command as R5 in a second checkout in another directory | The nupkg and snupkg digests of the two checkouts are equal pairs | CS-PKG-05 |
| R10 | `actions/upload-artifact` of `artifacts/`, optionally `actions/attest` on `artifacts/*.nupkg` | The job is green | CS-PKG-12 |
| R11 | Publish job: `environment: nuget.org`, `permissions` of `id-token: write` and `contents: read`, `needs` the verify job, `actions/download-artifact`, `NuGet/login@<full SHA>`, then `dotnet nuget push` with `--skip-duplicate` | Exit 0, and the log names the nupkg and the snupkg | CS-PKG-11, CS-PKG-12 |
| R12 | Post-publish, polling for up to 15 minutes while symbols index | `dotnet-validate package remote` exits 0, and `sourcelink test` prints `sourcelink test passed` (`unverified: read only`) | CS-PKG-10 |
| R13 | In the next commit set `PackageValidationBaselineVersion` to the released version | The `baseline ok` test of step 15 (the project's first target framework, never a hard-coded `net10.0`) | CS-API-15, CS-API-12 |
| R14 | Once, after the first publish: the owner applies for the ID prefix on nuget.org | The search API reports the package as verified (`unverified: read only`) | CS-PKG-11 |

R3 replaces a locked restore. A library commits no lock file, and a restore into
a warm packages folder bypasses source mapping, so the cold folder is the proof.

## Pin the tools (step 2)

Step 6 runs pinned tools, so the manifest belongs in this commit, before the
step 3 tag. Create it only when absent (`dotnet new tool-manifest` over one exits
73); `update` installs a missing entry and fixes a different pin (`sourcelink` is
for the `confirm` job). The `jq` line must print `0.0.1-preview.582`. `update` re-serializes the
whole manifest: the diff touches every entry (inline arrays expand, `"rollForward": false` is added
to entries that lack it, the final newline goes), which is the tool's doing and not a change to
them. `jq '.tools["dotnet-validate"].version = "0.0.1-preview.582"'` changes the pin and re-indents
the arrays but adds nothing; say which in the commit message:

```sh
test -f .config/dotnet-tools.json || dotnet new tool-manifest --output .config
dotnet tool update dotnet-validate --version 0.0.1-preview.582
dotnet tool update sourcelink --version 3.1.1
jq -r '.tools["dotnet-validate"].version' .config/dotnet-tools.json
```

## dotnet-validate failures (step 6)

`dotnet-validate` is its own pinned tool, not an SDK verb (CS-PKG-10). It exits 1
with `Non deterministic` when `ContinuousIntegrationBuild` was off at pack time,
and with `Source Link: Contains untracked sources (obj)` when a props or project
file sets `EmbedUntrackedSources` to `false` (the first command prints it; set
`true` or delete it) or when `origin` is not a recognized host (a local path or an
unrecognized mirror: `true` does not help, so a local run needs the real remote
URL). A `Source Link` line marked with a warning sign is read, not muted.

## Step 3 host notes

Each is a host or repository fact that makes the step 3 gate read wrong. Measured
2026-10-11 on SDK 10.0.401, Linux x64.

- **Partial clone.** With `git config remote.origin.promisor` printing `true`
  (a `--filter=blob:none` clone, bicep), the history blobs of the version file are
  absent, and Nerdbank.GitVersioning cannot fetch them: `MSB4018: The
  "Nerdbank.GitVersioning.Tasks.GetBuildVersion" task failed unexpectedly` with
  `An blob object with SHA ... could not be found`. The step 3 line
  `git log -p --format= -- '*version.json' '*version.jsonc'` fetches exactly those
  blobs; `git fetch --refetch --no-filter origin` fetches every blob (large).
- **CI variable.** The runner sets `GITHUB_ACTIONS`. A props file may key
  `ContinuousIntegrationBuild`, `IncludeSymbols` or the symbol format on `CI`
  (NSubstitute: `'$(CI)' == 'True'`) or `TF_BUILD` (Azure Pipelines). Without it
  the pack exits 0 and writes `NSubstitute.1.0.0.nupkg` alone: no snupkg.
- **Test host gap.** A test project that lists a target framework the host has no
  runtime for fails that module, and the overall exit is 1 or 150. The strings are the
  host-condition rows of the dotnet-diagnose catalogue (DN-DIAG-70). `-f net10.0` runs the
  installed TFM (NSubstitute: 900 tests); the receipt names the TFMs not run.
- **Cold folder.** `restore` into the temp folder writes its path into every
  `obj/project.assets.json`. Deleting the folder leaves `NETSDK1064` (package not found) and
  `CS0006` on the next `--no-restore` build, which the plain restore of the step 8 cleanup repairs.
  `dotnet tool restore` is the exception: step 6 runs it against the real packages folder,
  because the tool cache records the path it restored into and a second `tool restore` does not
  rewrite a stale path. The
  folder holds every package of the solution: 669 MB for NSubstitute, 2.9 GB for bicep, so point
  `TMPDIR` at a disk when `/tmp` is a small tmpfs. A fresh shell has lost `COLD`: step 3 prints
  it (`COLD=<path>`), and a folder nobody deletes stays on disk (1017 MB measured).

## Reproduce in a second directory (step 7)

A fixed `SOURCE_DATE_EPOCH` is the only setting that gives byte-identical nupkgs
across clones (CS-PKG-05). Pack a fresh clone with the same command as step 4
(its `-p:PackageVersion` too, when step 4 needed one), and give it the same `origin` URL, because
the nuspec records it. CS-PKG-05 covers the snupkg too: both globs go in and the file holds four
lines, each digest twice. The globs stop at the version digit, so a sibling package never joins.
The pass is `clone pack exit 0` and `reproducible`; a failed clone pack leaves two lines:

```sh
R=$(mktemp -d); git clone -q "$PWD" "$R/clone"
git -C "$R/clone" remote set-url origin "$(git remote get-url origin)"
( cd "$R/clone" && SOURCE_DATE_EPOCH=$(git log -1 --format=%ct) timeout 900 dotnet pack src/Acme.Lib -c Release -o "$R/out" --tl:off --interactive false -nologo -v:q > "$R/pack.log" 2>&1; echo "clone pack exit $?" )
sha256sum "$ART"/Acme.Lib.[0-9]*nupkg "$R"/out/Acme.Lib.[0-9]*nupkg > "$R/sums.txt"
test "$(wc -l < "$R/sums.txt")" -eq 4 && test "$(cut -d' ' -f1 "$R/sums.txt" | sort | uniq -c | awk '$1 != 2' | wc -l)" -eq 0 && echo reproducible
rm -rf "$R" # after reading a failed clone's $R/pack.log
```

## The workflow

This `release.yml` satisfies the Verify lines of CS-PKG-07, CS-PKG-09, CS-PKG-11,
CS-PKG-12 and CS-PKG-13 (watched against those greps, measured 2026-10-11). The
verify job is a matrix of two copies, so `dotnet pack` appears once (CS-PKG-12
counts it) and R9 compares copy `first` with copy `second`. Every `@0000...` is a
placeholder that matches every pin grep and fails only on the tag push, after the
tag is permanent: replace each with the full SHA of the release you reviewed, then
`git grep -n -E '@0{40}' -- .github/workflows` must print nothing. `user:` is the nuget.org profile name, never an email. The `confirm`
job reads the tool manifest, which pins `dotnet-validate` and `sourcelink`.

```yaml
name: release
on:
  push:
    tags: ["v*.*.*"]
permissions:
  contents: read
env:
  MSBUILDTERMINALLOGGER: "off"
  DOTNET_NOLOGO: "1"
jobs:
  verify:
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    strategy:
      matrix:
        copy: [first, second]
    steps:
      - uses: actions/checkout@0000000000000000000000000000000000000000 # replace: pin the full SHA
        with:
          fetch-depth: 0
          persist-credentials: false
          path: ${{ matrix.copy }}
      - uses: actions/setup-dotnet@0000000000000000000000000000000000000000 # replace: pin the full SHA
        with:
          global-json-file: ${{ matrix.copy }}/global.json
      - name: Assert the SDK
        working-directory: ${{ matrix.copy }}
        run: jq empty global.json && dotnet --version | grep -qE '^10\.0\.[0-9]+$'
      - name: Restore into an empty packages folder
        working-directory: ${{ matrix.copy }}
        env:
          NUGET_PACKAGES: ${{ runner.temp }}/nuget
        run: dotnet restore --force --tl:off --interactive false --disable-build-servers -nologo -v:q
      - name: Build and test
        working-directory: ${{ matrix.copy }}
        run: |
          dotnet build -c Release --no-restore --tl:off --interactive false --disable-build-servers -nologo -v:q
          dotnet test -c Release --no-build --minimum-expected-tests 1
      - name: Pack
        working-directory: ${{ matrix.copy }}
        run: SOURCE_DATE_EPOCH=$(git log -1 --format=%ct) dotnet pack src/Acme.Lib -c Release -o artifacts --tl:off --interactive false -nologo -v:q
      - name: Check the version and the symbols
        working-directory: ${{ matrix.copy }}
        run: |
          test "$(basename "$(ls artifacts/Acme.Lib.[0-9]*.nupkg | grep -v -e '\.symbols\.nupkg$')" .nupkg)" = "Acme.Lib.${GITHUB_REF_NAME#v}"
          ls artifacts/*.snupkg
      - name: dotnet-validate
        working-directory: ${{ matrix.copy }}
        run: |
          dotnet tool restore
          for p in artifacts/*.nupkg; do dotnet tool run dotnet-validate package local "$p" || exit 1; done
      - uses: actions/upload-artifact@0000000000000000000000000000000000000000 # replace: pin the full SHA
        with:
          name: artifacts-${{ matrix.copy }}
          path: ${{ matrix.copy }}/artifacts
  publish:
    needs: [verify]
    runs-on: ubuntu-24.04
    environment: nuget.org
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/download-artifact@0000000000000000000000000000000000000000 # replace: pin the full SHA
        with:
          path: dl
      - name: The two builds are byte-identical
        run: |
          sha256sum dl/artifacts-first/*nupkg dl/artifacts-second/*nupkg > sums.txt
          test "$(wc -l < sums.txt)" -eq 4 && test "$(cut -d' ' -f1 sums.txt | sort | uniq -c | awk '$1 != 2' | wc -l)" -eq 0
      - uses: NuGet/login@0000000000000000000000000000000000000000 # replace: pin the full SHA
        id: login
        with:
          user: example-profile # the nuget.org profile name, never an email
      - run: dotnet nuget push "dl/artifacts-first/*.nupkg" --skip-duplicate --api-key "${{ steps.login.outputs.NUGET_API_KEY }}" --source https://api.nuget.org/v3/index.json
  confirm:
    needs: [publish]
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@0000000000000000000000000000000000000000 # replace: pin the full SHA
        with:
          persist-credentials: false
      - uses: actions/setup-dotnet@0000000000000000000000000000000000000000 # replace: pin the full SHA
        with:
          global-json-file: global.json
      - name: Validate the published package (unverified, read only)
        run: |
          dotnet tool restore
          V="${GITHUB_REF_NAME#v}"
          for i in $(seq 1 15); do
            dotnet tool run dotnet-validate package remote Acme.Lib -v "$V" > remote.log 2>&1; rc=$?
            test "$rc" -ne 69 && break # 69: not on the feed yet; any other exit is the verdict
            sleep 60
          done
          cat remote.log; test "$rc" -eq 0
          curl -fsL --retry 15 --retry-delay 60 --retry-all-errors -o s.snupkg "https://www.nuget.org/api/v2/symbolpackage/Acme.Lib/$V"
          unzip -q -o s.snupkg -d sp
          for f in sp/lib/*/Acme.Lib.pdb; do dotnet tool run sourcelink test "$f" || exit 1; done
```

The two waits are bounded at 15 minutes: `dotnet-validate package remote` exits 69
while the package is not on the feed and 1 on a validation verdict, which ends
the loop at once instead of retrying forever. The `sourcelink` loop tests the
pdb of every target framework, so dropping `lib/net8.0` (end of support
2026-11-10) or adding `netstandard2.0` changes nothing here. The job-level `timeout-minutes` stands in for the DN-RULE-01 `timeout` wrapper on
CI. `id-token: write` appears on the publish job only, and fork pull requests
get no `id-token`. The `publish` job downloads and compares, and never rebuilds.

## Promote the public API files

CS-API-15 step 2. The script folds `PublicAPI.Unshipped.txt` into
`PublicAPI.Shipped.txt` in one directory: it keeps every `Shipped` line where it is, deletes the
lines a `*REMOVED*` entry names, appends the other `Unshipped` lines that `Shipped` lacks, and
leaves `#nullable enable` in `Unshipped`. It never re-sorts, so the release commit's diff is the
new entries (a re-sorted file showed 418 lines of diff for a handful of entries). Run it per
directory that holds the files, in the release commit, then rebuild (watched with RS0016 and RS0017
at error). Save the script to `$LOGS/promote.sh`, never into the tree, or the step 3 clean-tree
check fails on it; the call below runs it through `bash`, so no `chmod` is needed, and its trap
removes its own temporary files:

```sh
#!/usr/bin/env bash
# promote.sh <dir>: fold PublicAPI.Unshipped.txt into PublicAPI.Shipped.txt in <dir>, keeping Shipped order
set -euo pipefail; export LC_ALL=C
dir=${1:-.}; S="$dir/PublicAPI.Shipped.txt"; U="$dir/PublicAPI.Unshipped.txt"; T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
{ grep -h '^\*REMOVED\*' "$U" || true; } | sed 's/^\*REMOVED\*//' > "$T/rm"
{ grep -hv -e '^#nullable' -e '^\*REMOVED\*' -e '^[[:space:]]*$' "$U" || true; } > "$T/add"
{ grep -vxF -f "$T/rm" "$S" || true; } > "$T/kept"
{ grep -vxF -f "$T/kept" "$T/add" || true; } | awk '!seen[$0]++' >> "$T/kept"
grep -qx '#nullable enable' "$T/kept" || sed -i '1i #nullable enable' "$T/kept"
cp "$T/kept" "$S"; echo '#nullable enable' > "$U"
```

```sh
find src -name PublicAPI.Unshipped.txt -print0 | xargs -0 -r -n1 dirname | sort -u | xargs -r -n1 bash "$LOGS/promote.sh"
```

Delete every `CompatibilitySuppressions.xml` entry that carried
`IsBaselineSuppression=true` in the same commit: a stale one fails the next pack
as "Unnecessary suppressions". Do not touch `PackageValidationBaselineVersion` in
the release commit.

## Check the packed dependencies per nupkg

Step 5 loads this. The `test` lines of CS-SEC-09 name the `net10.0` group and a
`net8.0` budget and glob `artifacts/*.nupkg`: a nuspec whose groups are
`.NETStandard2.0` has no `net10.0` group, so the count is 0 and the line passes
without reading anything, and two packages break `unzip -p`. This prints, per
package, the number of `lib/` target frameworks and one line per nuspec group
with its dependency ids (the `{*}` namespace wildcard needs Python 3.8):

```sh
for P in "$ART"/*.nupkg; do
  echo "$P: $(unzip -Z1 "$P" | sed -n 's#^lib/\([^/]*\)/.*#\1#p' | sort -u | wc -l) lib TFMs"
  unzip -p "$P" '*.nuspec' | python3 -I -c "import sys,xml.etree.ElementTree as E;[print(' ',g.get('targetFramework'),[d.get('id') for d in g.findall('{*}dependency')]) for g in E.parse(sys.stdin).getroot().findall('.//{*}group')]"
done
```

The pass is one group line per `lib/` target framework (fewer means a missing
group, which no budget test can see) and, in each, an empty list or only the ids
the CS-SEC-09 budget names (`System.Text.Json` below `net10.0`). Any other id is a
finding or a written owner exception.

Two cells assume the reference library. CS-PKG-15's `no-binary` block needs `TOOL`, the wrapped
tool's file name: a library that wraps no tool has nothing for it to match, so run only its size
line (`find "$ART" -name '*.nupkg' -size +5120k`, which prints nothing). CS-SEC-09 reads
`eng/runtime-dependencies.txt`, the owner's written exception; where the file is absent its cell
prints `MISSING-OPERAND` and checks nothing, which is the CS-SEC-09 finding. This writes the
candidate file per nupkg under `LOGS` for the owner to review and commit (never into the tree):

```sh
for P in "$ART"/Acme.Lib.[0-9]*.nupkg; do unzip -p "$P" '*.nuspec' | python3 -I -c "import sys,xml.etree.ElementTree as E;[print(g.get('targetFramework',''),d.get('id')) for g in E.parse(sys.stdin).getroot().findall('.//{*}group') for d in g.findall('{*}dependency')]" | sort -u > "$LOGS/runtime-dependencies.$(basename "$P" .nupkg).txt"; done
```

## Check every publishing workflow

Step 8 loads this. The CS-PKG-11 and CS-PKG-12 blocks bind their trigger greps
and their `awk` to `release.yml`, and look for `branches`, `pull_request`,
`workflow_dispatch` and `schedule` only. A repository whose publisher is
`publish.yml`, or whose trigger is `on: release:` (moq), passes them unread. This
takes every tracked workflow that holds `nuget push`. The first line prints how
many there are (`0`: the receipt names the real pipeline). Each file must then
print `tag-only` (a `push:` with `tags:` and no other trigger), a count of `1` or
more, nothing, and `1`. A `NOT TAG-ONLY` file prints its trigger block for
reading. A workflow whose pack lives in a script (`run: ./eng/pack.sh`) prints `0` for the pack
count and then `script <path>: <n>`: the `dotnet pack` count is the two added, and CS-PKG-12 wants
exactly `1`. A script calling another script, or a `run: |` block, is read by hand. Run the `awk`
of CS-PKG-11 with the same `$f`:

```sh
git grep -l -e 'nuget push' -- .github/workflows | wc -l
for f in $(git grep -l -e 'nuget push' -- .github/workflows); do
  echo "== $f"
  T=$(mktemp); awk '/^"?on"?:/ {p=1; print; next} p && /^[^ #]/ {p=0} p' "$f" > "$T"
  grep -q -E -e '^ +push:' "$T" && grep -q -e 'tags:' "$T" && ! grep -q -E -e '^ *(branches|branches-ignore|pull_request|pull_request_target|release|workflow_dispatch|workflow_run|workflow_call|schedule):' "$T" && echo "tag-only" || { echo "NOT TAG-ONLY"; cat "$T"; }
  rm -f "$T"
  grep -c -e 'fetch-depth: 0' "$f"
  grep -n -e 'nuget push' "$f" | grep -v -e '--skip-duplicate'
  grep -c -e 'dotnet pack' "$f"
  for s in $(grep -o -E 'run:[[:space:]]*(bash |sh |pwsh |powershell )?\.?/?[A-Za-z0-9_./-]+\.(sh|ps1|cmd|bat)' "$f" | sed -E 's/^run:[[:space:]]*(bash |sh |pwsh |powershell )?//'); do echo "script $s: $(grep -c -e 'dotnet pack' "$s" 2>&1)"; done
done
```

## Rehearse the push (step 13)

A rehearsal runs the runbook to the push without a release. Step 13 pushes to whatever `origin`
names, so point it at a bare repository under `LOGS` first (the check then prints `exit 2`, an
empty remote):

```sh
REAL=$(git remote get-url origin); git init -q --bare "$LOGS/origin.git"; git remote set-url origin "$LOGS/origin.git"
```

Run step 13's check and push, then put the real URL back and drop the local tag:

```sh
git remote set-url origin "$REAL"; git tag -d "$TAG"
```

## After the push

R12 and R14 write nothing to the registry but read nuget.org, so they are
`unverified: read only`. The remote validation and the symbol test run in the
`confirm` job above. The ID prefix is the owner's application; this reads its
result, and prints `True` when the prefix is reserved. `not indexed` means the
package is not in the search index yet: retry later.

```sh
curl -s 'https://azuresearch-usnc.nuget.org/query?q=packageid:Acme.Lib&take=1' | python3 -I -c "import sys,json;d=json.load(sys.stdin)['data'];print(d[0].get('verified') if d else 'not indexed')"
```

## What agents get wrong in a library release

Ranked by how often it bites. Each is caught by the step or rule named.

1. **Reports a release from `pack`'s exit code or `ls *.nupkg`.** Validation
   failure still writes the nupkg (step 4, CS-PKG-09).
2. **A csproj with only `<TargetFramework>`, or with `PackageLicenseUrl`.** Pack
   exits 0 and ships `Package Description` (step 5, CS-PKG-01, CS-PKG-02).
3. **Adds `Microsoft.SourceLink.GitHub`** or the pdb-in-nupkg trick (CS-PKG-02).
4. **`secrets.NUGET_API_KEY` with `nuget push -k`**, `NuGet/login@v1` by tag, or
   `user:` set to an email (step 8, CS-PKG-11).
5. **A hand-set `<Version>`, or a shallow checkout** that packs `0.0.0-alpha.0`
   (step 3, step 5, CS-PKG-06, CS-PKG-07).
6. **Gates the restore with `--locked-mode`** or a warm cache, so a source fix or a
   switched-off audit reads green (step 3, CS-BUILD-25 to 27).
7. **Rebuilds in the publish job**, or adds a second `dotnet pack` to prove
   reproducibility (CS-PKG-12; the matrix keeps one).
8. **`IncludeSymbols` without `snupkg`**, which pushes a `.symbols.nupkg` as a
   second package (CS-PKG-04).
9. **Sets `ContinuousIntegrationBuild` unconditionally** or believes the SDK sets
   it: `dotnet-validate` then prints `Non deterministic` (step 6, CS-PKG-03).
10. **Sets `PackageValidationBaselineVersion` to the version being released**,
    which fails restore with NU1102 (step 15, CS-API-15).
11. **Hand-writes `PublicAPI.Unshipped.txt` entries** or satisfies RS0017 with
    `*REMOVED*`, which makes the analyzer green and the binary break real
    (step 2, step 4, CS-API-11).
12. **`DeterministicTimestamp=true` presented as reproducible packages**: it is the
    wall clock. Only `SOURCE_DATE_EPOCH` gives equal digests (step 7, CS-PKG-05).
13. **Signs with a SHA-1 thumbprint** or calls `dotnet validate` an SDK verb
    (CS-PKG-13, CS-PKG-10).
14. **Moves, deletes or re-creates a pushed tag**, or tries to reuse an unlisted
    version (step 16).
15. **Deletes the temp packages folder** and builds with `--no-restore` next: the
    assets file still names it (NETSDK1064). Step 8 restores normally after the delete. Restoring
    the tools into it has the same effect on `tool run`: step 6 restores them outside it.
16. **Gates without the CI variable the props key on** (`CI`, `TF_BUILD`): the pack
    exits 0 with no snupkg, and without a version source writes `1.0.0` (step 3,
    step 4, CS-PKG-03, CS-PKG-06).
