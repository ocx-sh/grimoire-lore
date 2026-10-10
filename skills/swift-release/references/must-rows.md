# The MUST rows the swift-release procedure enforces

Load this from the last-but-one section of swift-release. Merge-blocking rows, restated
as findings so a review that runs this procedure without the rule files loaded still
reports them with the right ID. The rationale and full verification live with the rule
named by the ID.

| # | Finding | Rule |
|---|---|---|
| 1 | The gate block was not run, with exit 0 on every applicable step, on the commit that was tagged | SW-GATE-01 |
| 2 | A shipping binary does not track `Package.resolved`, CI does not force it on a fresh scratch directory, or a plain build rewrote it | SW-PKG-26, SW-PKG-28, SW-PKG-29 |
| 3 | `.swift-version` is not one exact `X.Y.Z`, or an image tag or the running compiler differs from it | SW-REL-01 |
| 4 | The Static Linux SDK is not the toolchain's version, or was installed without `--checksum` | SW-REL-02 |
| 5 | `--static-swift-stdlib` is presented as the static recipe | SW-REL-03 |
| 6 | A script or workflow names `.build/release`, `.build/<triple>/...` or `.build/out/...` | SW-REL-04 |
| 7 | A Linux release binary is not built by triple from the Static Linux SDK, or the shipped file is not reported statically linked | SW-REL-05 |
| 8 | A released dynamic glibc binary was built outside the oldest-glibc image, or its floor was read off the executable alone | SW-REL-06 |
| 9 | The static leg did not run the artifact it built | SW-REL-07 |
| 10 | A package that claims Wasm has no per-target Wasm leg, or runs `swift test` without `--disable-xctest` | SW-REL-10 |
| 11 | The SBOM is not `--sbom-spec cyclonedx` from a clean tagged tree on the default engine | SW-REL-11 |
| 12 | `--version` is not the tag minus `v`, or comes from an environment variable, a `.prebuildCommand` or a hard-coded default | SW-REL-12 |
| 13 | Assets are not `tool-linux-ARCH` plus a `checksums.txt` that passes `sha256sum --check --strict` | SW-REL-13 |
| 14 | An image shipped that is not two-stage `FROM scratch` with a non-root `USER`, or that skips `--checksum` | SW-REL-15 |
| 15 | A manifest reachable from a release tag has `path:`, `branch:` or `revision:` | SW-REL-17 |
| 16 | A tag is not three-component SemVer in one form, or is lightweight | SW-REL-18 |
| 17 | A pushed tag was moved, re-created or deleted, or the tag existed on the remote before the push | SW-REL-19 |
| 18 | The API-breakage gate was not run, or ran against the pull request base instead of the last release tag | SW-REL-20, SW-GATE-20 |
