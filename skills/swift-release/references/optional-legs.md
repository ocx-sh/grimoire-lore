# Optional legs: the glibc fallback, the reproducibility proof, the image

Step 7 (the fallback paragraph) and step 9 of `swift-release` load this file. Nothing here runs by
default: the fallback is for code the Static Linux SDK cannot build, and the
other two run only when the owner asked.

Contents: [The glibc fallback](#the-glibc-fallback) ·
[When the static build fails inside a dependency](#when-the-static-build-fails-inside-a-dependency) ·
[The reproducibility proof](#the-reproducibility-proof) · [The image](#the-image) ·
[The CA bundle](#the-ca-bundle)

## The glibc fallback

SW-REL-06. Use it only when the binary needs `dlopen`, NSS or a C library
absent from the SDK. Build in `swift:6.4.0-amazonlinux2023` (glibc 2.34, measured 2026-10-10) or the
`-rhel-ubi9` variant (`swift:6.4.0-ubi9` does not exist), and never in `swift:6.4.0` or `latest` (Ubuntu 26.04, glibc
2.43, measured 2026-10-10). Check the floor on what the host must supply, because a plain
`objdump -T` of a dynamic executable is blind: it showed `GLIBC_2.34` while its
`libswiftCore.so` needs 2.38 and 2.43. A `--static-swift-stdlib` fallback
carries the comment and removal condition from `preflight.md`.

Output is the finding, and `floor` is the oldest glibc you support. The first
line is for a static-stdlib build's executable. The second runs inside the
build image, on the runtime library a dynamic build depends on:

```sh
objdump -T "$BIN" | grep -o 'GLIBC_[0-9.]*' | sed 's/GLIBC_//' | sort -V -u | awk -v floor=2.34 'function v(s){split(s,a,".");return a[1]*1000+a[2]} v($0)>v(floor){print "GLIBC_" $0 " above floor " floor}'
objdump -T /usr/lib/swift/linux/libswiftCore.so | grep UND | grep -o 'GLIBC_[0-9.]*' | sed 's/GLIBC_//' | sort -V -u | awk -v floor=2.34 'function v(s){split(s,a,".");return a[1]*1000+a[2]} v($0)>v(floor){print "GLIBC_" $0 " above floor " floor}'
```

Watched (measured 2026-10-10): a static-stdlib Foundation program reached 2.43 built in
`swift:6.4`, 2.38 on noble, 2.35 on jammy and 2.34 on Amazon Linux 2023. Then
run the artifact in the oldest target image.

## When the static build fails inside a dependency

Step 6 of `swift-release` sends a musl failure here. Example (measured 2026-10-10,
Mint on 6.4.0 with the musl SDK): `no such module 'Glibc'` in
`.build/checkouts/PathKit/Sources/PathKit.swift`. The static recipe has no branch
that fixes a dependency you do not own, and SwiftPM has no cargo-style patch table.
Never edit `.build/checkouts`. Record the failing module, the dependency and its
version in the receipt, then take the first row that applies:

| Situation | Action |
|---|---|
| A newer release of that dependency builds on musl | Raise it in its own commit, re-resolve, restart from step 2 |
| None does, and the binary needs that dependency | Take the glibc fallback above (SW-REL-06): the oldest-glibc image and the floor check. A dynamic stdlib build needs no `--static-swift-stdlib`. A line that keeps it carries `--build-system native` and the SW-REL-03 comment. Report the missing musl support to the dependency and name that issue in the receipt |
| The dependency is optional for the tool | Remove it in its own commit, or keep the release a library tag (step 3) |

Mint built green on the dynamic glibc path: exit 0, default engine (measured
2026-10-10, 6.4.0, in `swift:6.4`, which is not the floor image).

## The reproducibility proof

SW-REL-14, a SHOULD and opt-in. Two clean builds from clean scratch directories
at the **same absolute source and scratch paths**, with the pinned toolchain,
`Package.resolved` forced (SW-PKG-28) and `fetch-depth: 0` so the stamped
version matches. A static build also fixes the SDK file mtimes right after
`swift sdk install`, because the Clang module cache fingerprints the sysroot
headers:

```sh
find ~/.swiftpm/swift-sdks -exec touch -h -d @1700000000 {} +
test -f dist1/tool -a -f dist2/tool || echo "MISSING BUILD"
cmp dist1/tool dist2/tool || echo "NOT REPRODUCIBLE"
```

Output is the finding (a missing build prints `MISSING BUILD`, and `cmp` exits 2 for it). Identical across repeats on 6.4.0 and 6.3.3 (dynamic and
static). Different with another scratch path (807 bytes, embedded paths),
another source path, or a re-installed SDK. `-Xswiftc -file-prefix-map` did not
recover cross-path identity (measured 2026-10-10). No Swift source documents
bit-for-bit reproducibility, so the claim is only this measurement.

SBOMs differ per run in `serialNumber`, tool `bom-ref`, `timestamp` and the
file-name timestamp. Compare them only after replacing every `urn:uuid:`
value and ISO timestamp, and never compare container image IDs, which differ
for identical binaries.

## The image

SW-REL-15, and only when the owner asked for an image. Two stages: a
`swift:X.Y.Z` build stage that installs the Static Linux SDK with `--checksum`,
then `FROM scratch`, a non-root numeric `USER`, and an exec-form `ENTRYPOINT`.
The same app came to 16.9 MB against 415 MB on `swift:6.4-slim` with a dynamic
binary (measured 2026-10-10). Pass the SDK URL and checksum from step 6 as
build arguments:

```dockerfile
FROM swift:6.4.0 AS build
ARG SDK_URL
ARG SDK_SUM
RUN swift sdk install "$SDK_URL" --checksum "$SDK_SUM"
WORKDIR /src
COPY . .
RUN swift build -c release --product tool --swift-sdk x86_64-swift-linux-musl --scratch-path /scratch \
 && cp "$(swift build -c release --swift-sdk x86_64-swift-linux-musl --scratch-path /scratch --show-bin-path)/tool" /tool \
 && strip /tool

FROM scratch
COPY --from=build /tool /tool
USER 65534:65534
ENTRYPOINT ["/tool"]
```

`--scratch-path /scratch` is deliberate: `COPY . .` brings a host `.build` into the image, and a build that reuses it
fails with `precompiled file ... was compiled with module cache path` (measured 2026-10-10, 6.4: host build,
then a container build of the same tree at `/src`, red; with `--scratch-path`, green).
The Dockerfile must build the same `--product` as step 6: without it a library
with test-helper targets fails on `no such module 'Testing'`. `COPY . .` must
include `.git` or a version file, because a `.dockerignore` listing `.git` makes
the image print `0.0.0-unknown` (measured 2026-10-10).

Checks. The three `grep -L` lines print `Dockerfile` when the line is missing,
and that is the finding. The `docker run --bogus` line must print `exit 64` for
a usage error and `exit 69` for an unavailable service, per the exit-status
table (SW-CLI-01). The `--version` line prints nothing on a pass and `FAIL:
got '...'` otherwise (SW-REL-12). The step 4 P4 scan must stay empty on the
Dockerfile:

```sh
TAG=v1.2.3 # rename
grep -L -e '^USER ' Dockerfile
grep -L -e '^FROM scratch' Dockerfile
grep -L -e '^ENTRYPOINT \[' Dockerfile
docker run --rm IMG --bogus; echo "exit $?"
GOT=$(docker run --rm IMG --version) && [ "$GOT" = "${TAG#v}" ] || echo "FAIL: got '$GOT'"
```

A `FROM scratch` image has no shell, so `docker run --entrypoint /bin/sh` fails
with `no such file or directory`. Run the published digest, not the local
build, when verifying a published image.

## The CA bundle

SW-REL-15, a SHOULD and `unverified: read only`. A `FROM scratch` image
has no libc, CA bundle, `/tmp` or timezone data. A binary that opens TLS copies
a CA bundle into the final stage, and the release leg makes one HTTPS request
from the built image. This step's own run is the check. The bundle path is the
one the TLS library reads and not a guess: SW-NET-08 records that neither
HTTP client honours `SSL_CERT_FILE` by default, so confirm the path
by running the image, not by reading.

```dockerfile
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
```

```sh
docker run --rm IMG TLS_CMD; echo "exit $?" # rename TLS_CMD to the CLI's cheapest command that opens one HTTPS connection. exit 0 required
```

A non-zero exit with a certificate or trust error is a missing bundle. Record
the result as `unverified: read only` until it ran on a built image.
