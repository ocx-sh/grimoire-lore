# Library floor proof for step U2

Load this from step U2 when a library or SDK raises `swift-tools-version`. It holds the
check that SW-PKG-33 asks for before the commit: what a consumer on the OLD toolchain
resolves once the new manifest is released.

Measured 2026-10-10 on SQLite.swift (tools 6.1 raised to 6.2, previous release `0.15.4`)
with the `swift:6.1` and `swift:6.2` images, needing `docker` and `git`.

## Why not build the library on the old image

The old toolchain refuses the raised manifest by design: `swift package dump-package`
on `swift:6.1` prints `package 'lib' is using Swift tools version 6.2.0 but the
installed version is 6.1.3` and exits 1. With the old manifest the same build proves
nothing about the new one. The run that settles it is a consumer: a package on the old
image that depends on the library by `from:` and must stay on the previous release,
because SwiftPM skips a tag whose manifest it cannot read (SW-PKG-33).

## The check

Run from the library root with the raised manifest in the working tree. `OLDIMG` is the
image of the OLD tools version, an exact tag. The script clones the repository into a
scratch directory, commits the edited `Package*.swift` there with the next patch tag, and
leaves the library untouched. Every container run is `dk`: as your user, inside the clone,
so no root-owned `.build` lands in the library tree (measured 2026-10-10, 6.4):

```sh
OLDIMG=swift:6.1.3
PREV=$(git describe --tags --abbrev=0 --match '[0-9]*' --match 'v[0-9]*') || { echo 'no previous release tag'; exit 65; }
V=${PREV#v}; NEXT=${V%.*}.$(( ${V##*.} + 1 ))   # the next patch: inside every from: range
W=$(mktemp -d "${TMPDIR:-/tmp}/floor.XXXXXX")
dk() { docker run --rm -u "$(id -u):$(id -g)" -e HOME=/tmp -v "$W":"$W" -w "$1" "$OLDIMG" "${@:2}"; }
git clone -q "$PWD" "$W/lib" && cp Package*.swift "$W/lib/" || exit 1
git -C "$W/lib" -c user.name=probe -c user.email=probe@example.com commit -q -a -m probe && git -C "$W/lib" tag "$NEXT"
mkdir -p "$W/consumer/Sources/c" && echo 'print(1)' > "$W/consumer/Sources/c/main.swift"
cat > "$W/consumer/Package.swift" <<MANIFEST
// swift-tools-version: 5.9
import PackageDescription
let package = Package(name: "c", dependencies: [.package(url: "file://$W/lib", from: "$V")],
    targets: [.executableTarget(name: "c")])
MANIFEST
dk "$W/lib" swift package dump-package >/dev/null 2>"$W/lib.err"; echo "library on $OLDIMG: exit $?"; grep -m1 -e 'tools version' "$W/lib.err"
dk "$W/consumer" swift package resolve >/dev/null 2>"$W/c.err"; echo "consumer resolve exit $?"
GOT=$(grep -A8 -F -e 'lib' "$W/consumer/Package.resolved" | grep -m1 -o -E '"version" : "[^"]+"')
echo "resolved $GOT, want $V"
case $GOT in *"$V\"") echo OK ;; *) echo "FAIL: consumer did not stay on $V" ;; esac
rm -rf "$W"
```

Output is the record for the receipt. Pass: the library line exits 1 with the `tools
version` line, the consumer exits 0, and the last line is `OK`. Any `FAIL` line is the
finding, and a consumer that resolved `NEXT` means the old image can read the raised
manifest (the tools version was not raised, or the image is not the old one). The
library line exit 0 is not a failure of the script on a floor that did not move.

Watched (measured 2026-10-10): `swift:6.1` printed `library on swift:6.1: exit 1`, the
tools version line, `consumer resolve exit 0`, `resolved "version" : "0.15.4"` and `OK`
(the green case). The same script on `swift:6.2` printed `library ... exit 0`,
`resolved "version" : "0.15.5"` and `FAIL: consumer did not stay on 0.15.4` (the planted
red: the new image reads the raised manifest, so the consumer moves). A consumer that
pins `exact:` is the other SW-PKG-33 case and fails with `contains incompatible tools
version` instead of staying put.
