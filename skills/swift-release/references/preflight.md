# Preflight scan for a CLI release

Step 4 of `swift-release` loads this file. It greps the build scripts,
workflows, Dockerfiles and manifests for the release recipes that look right
and are not. Each block was watched red on a planted tree and empty on a
compliant twin (measured 2026-10-10, Swift 6.4.0 and 6.3.3).

Contents: [The scan](#the-scan) · [What each output means](#what-each-output-means) ·
[The permitted fallback line](#the-permitted-fallback-line)

## The scan

Any output line is a finding, and empty output is the pass. Run it from the
repository root. `.build` and `.git` are excluded because a checked-out
dependency under `.build/checkouts` legitimately carries `branch:` pins.
Test-matrix and floor legs in other workflows (SW-CORE-09, SW-GATE-25) are never
findings: P2 reads only shipped Dockerfiles and the release workflow.

```sh
V=$(cat .swift-version 2>/dev/null); VS=${V%.0}
scan() { grep -rn --exclude-dir=.build --exclude-dir=.git --include='Dockerfile*' --include='*.yml' --include='*.yaml' --include='*.sh' --include='Makefile' --include='*.mk' --include='*.ps1' "$@" .; }

# P1 SW-REL-01: the pin is exactly X.Y.Z. An absent or empty file prints FAIL, and P2, P3 and P5 then print `pin missing, see P1` and no result
printf '%s\n' "$V" | grep -q -x -E -e '[0-9]+\.[0-9]+\.[0-9]+' || echo "FAIL P1: .swift-version is absent, empty or not X.Y.Z (got '$V')"
# P2 SW-REL-01: every swift: tag in a shipped Dockerfile and the release workflow is that literal version (an ARG-built tag is flagged: write the literal; rename the workflow path). No Dockerfile and no release.yml print nothing here
{ grep -rn --include='Dockerfile*' --exclude-dir=.build --exclude-dir=.git -e 'swift:' . ; [ -f .github/workflows/release.yml ] && grep -n -e 'swift:' .github/workflows/release.yml ; } | grep -v -F -e "swift:${V:?pin missing, see P1}"
# P3 SW-REL-01: the compiler reports the pin, and 6.4.0 prints as "6.4"
swift --version | grep -F -e 'Swift version' | grep -v -F -e "Swift version ${VS:?pin missing, see P1} ("

# P4 SW-REL-02: a swift sdk install without --checksum, backslash continuations joined
find . -type f \( -name 'Dockerfile*' -o -name '*.yml' -o -name '*.yaml' -o -name '*.sh' -o -name 'Makefile' \) -not -path './.build/*' -print0 | xargs -0 -r -n1 sh -c 'sed -e ":a" -e "/\\\\\$/N; s/\\\\\n//; ta" "$0" | grep -n -e "swift sdk install" | grep -v -e "--checksum" | sed "s|^|$0:|"'
# P5 SW-REL-02: an SDK bundle whose version differs from the pin
scan -E -e 'static-linux-[0-9.]+\.artifactbundle' | grep -v -F -e "swift-${V:?pin missing, see P1}-RELEASE_static-linux"

# P6 SW-REL-03: --static-swift-stdlib outside the labelled glibc fallback
scan -e 'static-swift-stdlib' | grep -v -e 'build-system native' -e 'swift-sdk'
# P7 SW-REL-04: a hard-coded build path (use --show-bin-path with the build's own flags)
scan -e '\.build/release' -e '\.build/debug' -e '\.build/[A-Za-z0-9_.-]*/release' -e '\.build/[A-Za-z0-9_.-]*/debug' -e '\.build/out/'
# P8 SW-REL-05: the SDK selected by bundle id instead of triple (a Wasm id is the exception)
scan -e 'swift-sdk[ =]swift-' | grep -v -e '_wasm'
# P9 SW-REL-11: the wrong SBOM source
scan -e 'generate-sbom'
scan -e '--sbom-spec' | grep -e 'build-system native'

# P10 SW-REL-17: a root manifest reachable from a tag with path:, branch: or revision: (a root consumer may use path: locally). Root manifests only, as SW-PKG-20: a nested Benchmarks or Tests manifest is no product. The last grep drops commented lines
find . -maxdepth 1 -name 'Package*.swift' -exec grep -Hn -e '\.package(path:' -e '\.package(name:[^)]*path:' -e 'branch:' -e 'revision:' {} + | grep -v -E -e ':[0-9]+:[[:space:]]*//'
# P11 SW-REL-22 (CONSIDER): an exact: prerelease swift-syntax pin defeats the prebuilt artifact
grep -rn --exclude-dir=.build --exclude-dir=.git --include='Package.swift' --include='Package@swift-*.swift' -e 'swift-syntax.*exact' .
```

## What each output means

| Output of | Meaning | Rule |
|---|---|---|
| P1 | `.swift-version` is absent, or a partial selector such as `6.4`, which resolves to whatever each machine has installed | SW-REL-01 |
| P2, P3 | An image tag or the running compiler is not the pin. `swift:latest` and `swift:6.3` float | SW-REL-01 |
| P4, P5 | The SDK is installed without its checksum, or from another release than the toolchain | SW-REL-02 |
| P6 | The static-stdlib recipe, which fails to link once a Foundation symbol is reachable, on the Swift Build engine (the 6.4 default, and 6.3.3 with `--build-system swiftbuild`; 6.3.3 builds with native and exits 0) | SW-REL-03 |
| P7 | A path that does not exist under Swift Build, or a `release` symlink the last build repointed | SW-REL-04 |
| P8 | A bundle id: `has multiple target triples` | SW-REL-05 |
| P9 | `generate-sbom` and the native engine omit build-time conditionals | SW-REL-11 |
| P10 | The tag will not resolve for any version consumer (root manifests only; watched 2026-10-10: console-kit's `Benchmarks/Package.swift` printed under the old whole-tree grep and prints nothing now) | SW-REL-17 |
| P11 | swift-syntax builds from source: 73 s against 16 s with `-j 2` (measured 2026-10-10) | SW-REL-22 |

An absent file is a state, not an error. Measured on Mint (no `.swift-version`, no
`release.yml`, no `Dockerfile`, 2026-10-10): the old scan exited 2 with `No such
file or directory` three times and a literal reader had no verdict.

| Absent file | Meaning |
|---|---|
| `.swift-version` | FAIL (P1 prints it): the release has no pin. Create it before anything else |
| `.github/workflows/release.yml` | P2 prints nothing for it. A CLI release still FAILs at step 10, which has no attesting workflow without it |
| `Dockerfile*` | N/A: P2 has nothing to read, and the receipt says `no Dockerfile` |

P7 cannot see a path built from a variable, and P3 cannot see a Dockerfile
`ARG`. SW-REL-05's `file` check in step 7 backs both up.

## The permitted fallback line

A glibc fallback may keep `--static-swift-stdlib` when the line also carries
`--build-system native`, a comment naming
[swift-build#1764](https://github.com/swiftlang/swift-build/issues/1764), and
the removal condition "drop when the pinned toolchain contains
swift-build#1763". On 2026-10-10 the fix is merged to main and the 6.4.x
branches, and 6.4.0 is the only 6.4 tag, so the removal condition has not been
met. The Swift Build engine is the 6.4 default, and the native engine is
deprecated with removal planned for 2026H2 (read 2026-10-10).
