# What agents get wrong in a Swift release

Load this from the last section of swift-release. Ranked by how often it bites.

1. **Writes `swift build -c release --static-swift-stdlib` as "the static
   build".** It links on a toy and fails once Foundation is reachable, on the
   Swift Build engine (the 6.4 default, and 6.3.3 with `--build-system
   swiftbuild`). On 6.3.3 the default engine is native and exits 0, so a 6.3.3
   run proves nothing about the removal condition (SW-REL-03).
2. **Copies `.build/release/tool` or the swift.org example path
   `.build/x86_64-swift-linux-musl/release/tool`**, or runs `--show-bin-path`
   without the build's `--swift-sdk` and ships the host binary.
3. **Sets `.swift-version` to `6.4` or `latest`**, uses `FROM swift:latest`, or
   "fixes" an exact pin to `6.4` because `swift --version` prints it.
4. **Builds the dynamic binary in `swift:6.4` and runs it on Ubuntu 22.04**, or
   reads the glibc floor off `objdump -T` of the executable.
5. **Stamps the version from an environment variable read inside a plugin**,
   hard-codes `let version = "1.0.0"`, or uses `.prebuildCommand`.
6. **Tags `v1.2`, `1.2`, `release-1.2.0` or a lightweight tag**, or runs `git
   tag -f` and force-pushes to "fix the release".
7. **Adds `.package(path: "../Shared")` or `branch: "main"` to a library
   "temporarily" and tags it.** Every consumer's resolve then fails.
8. **Passes the bundle id from `swift sdk list` to `--swift-sdk`**, installs the
   SDK without `--checksum`, or installs one from another release.
9. **Treats `swift package generate-sbom` as the release SBOM**, invents
   `swift build --sbom`, or gates on the SBOM's hash.
10. **Strips the binary and keeps no twin**, or refuses to strip and ships 138
    MB.
11. **Runs the API gate against `main` or the pull request base**, and reads
    exit 1 on a shallow clone as "API broke".
12. **Ports cargo or Go ideas**: `--locked` (exit 64), a `retract` stanza,
    "yank", or `cargo publish`.
13. **Releases 0.x with a breaking minor and a `from:` README snippet.**
14. **Builds an image nobody asked for**, or ships a `FROM scratch` image that
    never opened one HTTPS connection.
15. **Writes a macOS, Windows or arm64 step from memory** and reports it as run.
