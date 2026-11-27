---
title: Swift package CI workflows, provenance and action pinning, delta 2026-10-10 to 2026-11-27
pair: swift-package
date_researched: 2026-11-27
window_start: 2026-10-10
model: sonnet
sources_fetched: 19
---

# Delta: shared CI workflows, attestation action, action pinning, SPI manifest

This is a delta update. Only claims whose upstream source changed are marked "changed". Everything else stays as written. Source file contents for github-workflows were compared by downloading the files at tag 0.0.15 and tag 0.0.19 and reading them directly.

## Summary

- Newest swiftlang/github-workflows tag is 0.0.19 (tag dated 2026-11-18). Four tags landed after 0.0.15: 0.0.16 (2026-10-14), 0.0.17 (2026-10-20), 0.0.18 (2026-11-14 tag, release page says 16 Nov), 0.0.19 (2026-11-18).
- The `swift_package_test.yml` default `linux_swift_versions` changed in 0.0.16 or later: at 0.0.19 it is `["6.2", "6.3", "6.4", "nightly-main", "nightly-6.4.x"]`. At 0.0.15 it was `["5.9","5.10","6.0","6.1","6.2","6.3","nightly-main","nightly-6.4.x"]`.
- SW-GATE-24 text "5.9, 5.10 and 6.0 to 6.3 plus nightlies, with no 6.4" is now wrong. It was correct for 0.0.15 (the list there ran 5.9, 5.10, 6.0 to 6.3), but the current default has 6.4 and no 5.x or 6.0 or 6.1.
- `soundness.yml` no longer checks out `swiftlang/github-workflows` with a `repository:` line. It uses `uses: $/.github/actions/workflows-scripts`, which resolves the scripts from the same commit as the running workflow. A SHA pin of the reusable workflow now also pins `check-docs.sh` and `check-swift-format.sh`. SW-GATE-24's "floating scripts" sentence is obsolete for 0.0.18 and later.
- Soundness API and docs job images default to `swift:6.4-noble` at 0.0.19 (was `swift:6.3-noble` at 0.0.15). SW-REL-01 names the old default.
- API breakage baseline still defaults to the PR base. SW-REL-20 unchanged.
- `check-docs.sh` still logs `No '.spi.yml' found in "<dir>", no documentation targets to check.` and exits 0. Only a macOS empty-array fix landed. Note the logged text starts with a capital N and says `No '.spi.yml' found`, so the existing claim quotes a shortened form.
- GitHub shipped workflow dependency lockfiles (`.github/workflows/actions.lock`, `gh actions-lock`), public preview 2026-10-14, general availability 2026-10-28. GitHub's secure-use page now says the lockfile "supersedes SHA pinning for repositories that adopt it". SW-GATE-23's "only way" wording is no longer accurate.
- `actions/attest-build-provenance` is a wrapper on `actions/attest` since v4.0.0 (2026-02-25), with a "new implementations should use `actions/attest`" note. Latest wrapper release v4.2.2 (Aug 6, 2026) predates the window. `actions/attest` lists `artifact-metadata: write` in its permissions block.
- swift-protobuf still pins its sanitizer job to `swift:6.3`. The comment now reads "6.4 thread sanitizer fails" and links swift-build issue 1776, which closed 2026-09-27. The comment text differs from the existing claim.
- SPIManifest has newer tags: 1.13.1 (2026-10-05, just before the window), 1.14.0 (2026-11-26). `documentation_targets` still exists in the 1.14.0 source.

## Findings by claim

### 1. gates.md header "swiftlang/github-workflows 0.0.15" and SW-GATE-24 default versions

Status: CHANGED.

- Old text: "The 0.0.15 default `linux_swift_versions` is 5.9, 5.10 and 6.0 to 6.3 plus nightlies, with no 6.4".
- New fact: tag 0.0.19 `swift_package_test.yml` line 48 default is `[ "6.2", "6.3", "6.4", "nightly-main", "nightly-6.4.x"]`. Release 0.0.16 notes: "Swift package test defaults updated to 6.4 (#319)". Release 0.0.18 notes: "Minimum Swift version floor no longer set at the patch level (#350)" and "macOS runners moved to goldengate and Swift 6.1 testing dropped (#351)". The 5.9, 5.10, 6.0 and 6.1 Linux entries left the default list; the exact release that dropped each was not isolated, only the 0.0.15 and 0.0.19 endpoints were diffed.
- Date of upstream change: 2026-10-14 (0.0.16) for the 6.4 default, at the latest 2026-11-18 for the full list.
- Sources: [releases](https://github.com/swiftlang/github-workflows/releases), [tags](https://github.com/swiftlang/github-workflows/tags), [0.0.19 swift_package_test.yml](https://raw.githubusercontent.com/swiftlang/github-workflows/0.0.19/.github/workflows/swift_package_test.yml), [0.0.15 swift_package_test.yml](https://raw.githubusercontent.com/swiftlang/github-workflows/0.0.15/.github/workflows/swift_package_test.yml).
- Version table at tag 0.0.19: `linux_swift_versions` default as above; the Android, Windows and static-SDK lists in the same file also include 6.4 (lines 64, 72, 80, 89).

Decision on SW-GATE-24 "pass `linux_swift_versions` explicitly": the rationale as written no longer holds. The default no longer contains 5.9 or 5.10, and does contain 6.4, so a tools-6.2 package builds on every default Linux leg. Explicit passing is still defensible only as a pin against future default drift (the default moved twice in six weeks), and for packages whose minimum is above 6.2. Recommend rewriting the rationale to "the default list moves with each release; pin it to the toolchains the package supports", and keeping the `shared-workflow` grep as a SHOULD or downgrading it. This is an authoring decision for the owner's pass.

### 2. SW-GATE-24 "Every soundness job checks out `swiftlang/github-workflows` with no `ref:`"

Status: CHANGED (from 0.0.18, tag dated 2026-11-14).

- Old text: a SHA pin freezes the YAML but not `check-docs.sh` or `check-swift-format.sh`.
- New fact: 0.0.18 notes "Added a workflows-scripts action that returns the running commit's scripts (#345)". In 0.0.19 `soundness.yml` steps use `uses: $/.github/actions/workflows-scripts`, and there is no `ref:` and no `repository: swiftlang/github-workflows` line (0 `ref:` matches; at 0.0.15 each job had `repository: swiftlang/github-workflows` at lines 191 to 473). The composite action's description says the scripts come "from the same commit as the workflow even when a caller pins the workflow to a release".
- `$/` is a GitHub Actions self-repository syntax announced 2026-07-30, runner 2.336.0 or newer: [changelog](https://github.blog/changelog/2026-07-30-reference-same-repository-actions-with-self-repository-syntax).
- Consequence: pinning `soundness.yml` at a SHA or a 0.0.18-or-later tag now freezes the scripts too. The floating-script risk remains only for callers on 0.0.17 or earlier, or on `@main` (also floating).
- Sources: [0.0.19 soundness.yml](https://raw.githubusercontent.com/swiftlang/github-workflows/0.0.19/.github/workflows/soundness.yml), [workflows-scripts action.yml](https://raw.githubusercontent.com/swiftlang/github-workflows/0.0.19/.github/actions/workflows-scripts/action.yml), [0.0.15 soundness.yml](https://raw.githubusercontent.com/swiftlang/github-workflows/0.0.15/.github/workflows/soundness.yml).

### 3. SW-GATE-24 `swift_flags` and `swift_nightly_flags` fall-through

Status: unchanged. Tag 0.0.19 still uses `(contains(matrix.swift_version, 'nightly') && inputs.swift_nightly_flags) || inputs.swift_flags` in every build step (for example line 521). The and-or chain falls back to `swift_flags` when `swift_nightly_flags` is empty. Source: [0.0.19 swift_package_test.yml](https://raw.githubusercontent.com/swiftlang/github-workflows/0.0.19/.github/workflows/swift_package_test.yml). Still read-only evidence.

### 4. SW-REL-01 "swift:6.3-noble (swiftlang/github-workflows 0.0.15)"

Status: CHANGED. At 0.0.19 `soundness.yml` image defaults (lines 25, 37, 105) are `swift:6.4-noble`; at 0.0.15 they were `swift:6.3-noble`. Release 0.0.16 and 0.0.18 notes: "Soundness Swift versions updated to 6.4 (#339)", and 0.0.19: "Default Swiftly toolchain updated to Xcode 27 / Swift 6.4 (#360)". Date: 2026-11-14 (0.0.18) at the latest for the soundness images. The point of the sentence (a shared workflow defaults to a minor-only tag) still stands; update the version number and the tag. Sources: [0.0.19 soundness.yml](https://raw.githubusercontent.com/swiftlang/github-workflows/0.0.19/.github/workflows/soundness.yml), [releases](https://github.com/swiftlang/github-workflows/releases).

### 5. SW-REL-20 API-breakage baseline defaults to PR base

Status: unchanged. 0.0.19 `soundness.yml` description: "By default the PR base is used", and when `API_BREAKAGE_CHECK_BASELINE` is empty it runs `git fetch ... ${GITHUB_BASE_REF}:pull-base-ref`. New inputs since 0.0.15, not contradicting the claim: `api_breakage_pre_build_command` (#333) and `api_breakage_check_additional_arguments` (#324). Source: same soundness.yml, [releases](https://github.com/swiftlang/github-workflows/releases).

### 6. SW-GATE-21 `check-docs.sh` and `.spi.yml` documentation_targets

Status: unchanged in behaviour. `check-docs.sh` 0.0.19 line 84: `log "No '.spi.yml' found in \"$(pwd)\", no documentation targets to check."` then `exit 0`, when no targets were passed and no `.spi.yml` exists. The only diff against 0.0.15 is `${collected[*]:-}` (empty-array safety, 0.0.16 #320 macOS fix). `check-swift-format.sh` is identical at both tags. The log text starts `No '.spi.yml' found`, not `no documentation targets to check` alone. If SW-GATE-21 quotes the string for a grep, quote the full line. Source: [0.0.19 check-docs.sh](https://raw.githubusercontent.com/swiftlang/github-workflows/0.0.19/.github/workflows/scripts/check-docs.sh).

### 7. SPIManifest `documentation_targets` (1.13.1)

Status: unchanged. Tags: 1.13.1 (2026-10-05), 1.14.0 (2026-11-26). The 1.14.0 `Manifest.swift` still decodes `documentation_targets` under `builder.configs`. 1.14.0 `SwiftVersion` enum is 6.2, 6.3, 6.4 with `latestRelease` 6.4 (release 1.13.0 added 6.4). Release notes for 1.14.0 were not available on the page, so the content of 1.14.0 beyond the source read is could not determine. If SW-GATE-21 cites "SPIManifest 1.13.1", the citation may say "1.14.0 (2026-11-26) checked" when refreshed. Sources: [tags](https://github.com/SwiftPackageIndex/SPIManifest/tags), [1.14.0 Manifest.swift](https://raw.githubusercontent.com/SwiftPackageIndex/SPIManifest/1.14.0/Sources/SPIManifest/Manifest.swift), [1.14.0 SwiftVersion.swift](https://raw.githubusercontent.com/SwiftPackageIndex/SPIManifest/1.14.0/Sources/SPIManifest/SwiftVersion.swift).

### 8. SW-GATE-13 / SW-GATE-24 swift-nio `unit_tests.yml` override

Status: unchanged. On main, `unit_tests.yml` passes `MATRIX_LINUX_COMMAND: "swift test"` plus per-version `*_arguments_override` strings (default empty) through `scripts/generate_matrix.sh`, which stores them as `command_arguments`; the matrix job runs `$MATRIX_COMMAND $MATRIX_COMMAND_ARGUMENTS`. So the override is the only argument string. Changes: a Linux 6.4 and Windows 6.4 override input now exist; the per-version enabled defaults are 6.1 to 6.4 true and 5.9, 5.10, 6.0 false; nightly 6.0 and 6.1 inputs are marked deprecated. The `arguments-override` grep is unaffected. Sources: [unit_tests.yml](https://github.com/apple/swift-nio/blob/main/.github/workflows/unit_tests.yml), [generate_matrix.sh](https://raw.githubusercontent.com/apple/swift-nio/main/scripts/generate_matrix.sh).

### 9. SW-REL-16 attestation action inputs and permissions

Status: partly changed, none of it dated inside the window.

- `actions/attest-build-provenance` is a wrapper on `actions/attest` from v4.0.0 (2026-02-25). README: "new implementations should use `actions/attest` instead"; existing use may continue, no removal date. Latest wrapper tag seen: v4.2.2 (Aug 6, 2026), before the window. No release in 2026-10-10 to 2026-11-27 was listed.
- `actions/attest` inputs: `subject-path`, `subject-digest` (needs `subject-name`), `subject-checksums` (shasum-format file), `sbom-path`, `predicate-type`, `predicate`, `predicate-path`, `push-to-registry` (default false), `create-storage-record` (default true, needs `push-to-registry: true`), `show-summary`, `github-token`. Default with no predicate input is SLSA build provenance. `subject-checksums` still exists, so the existing `subject-checksums: dist/checksums.txt` example works with either action.
- Permissions block shown in `actions/attest`: `id-token: write`, `attestations: write`, `artifact-metadata: write`. The existing SW-REL-16 lists only the first two. The wrapper README did not state permissions in the page read. Whether `artifact-metadata: write` is needed when `push-to-registry` is false was not determined. The storage-record feature landed in wrapper v3.1.0 (Dec 19, 2025) and v4.1.0 (Feb 26, 2026).
- `gh attestation verify`: wrapper README still says attestations are verified with the GitHub CLI attestation command; no syntax change was read.
- Sources: [attest-build-provenance releases](https://github.com/actions/attest-build-provenance/releases), [attest-build-provenance README](https://github.com/actions/attest-build-provenance), [actions/attest README](https://github.com/actions/attest).

Decision: the wrapper's inputs and permissions did not change inside the window. The recommendation to name `actions/attest` (the replacement) and to add `artifact-metadata: write` is a gap against older research, not a window delta; flag it for the owner. The grep verification for `subject-checksums` stays valid.

### 10. SW-GATE-23 "A full-length SHA is the only way to use an action as an immutable release"

Status: CHANGED.

- Old text: "A full-length SHA is the only way to use an action as an immutable release (GitHub secure-use guidance, read 2026-10-10)".
- New fact 1 (lockfiles): GitHub workflow dependency lockfiles reached general availability 2026-10-28 (public preview 2026-10-14). File `.github/workflows/actions.lock`, generated by `gh actions-lock`, pins every action including transitive ones to a commit, keeps readable tag references in workflows, and Dependabot updates entries. Docs: "For repositories that use a lockfile, pinning actions to SHAs in workflow files is no longer necessary", and it satisfies the "require full-length SHA" policy for onboarded workflows. Reusable workflow calls (`jobs.<id>.uses`) are not pinned by the lockfile: pin those by full SHA. Dependencies of a reusable workflow are covered by the lockfile of the repository that defines it.
- New fact 2 (secure-use page): "Pin references to actions to a commit SHA", and the lockfile is called "the best measure" that "supersedes SHA pinning for repositories that adopt it". A tag-only pin is described as acceptable only if the creator is trusted.
- Immutable releases for actions: generally available since 2025-10-28 (before the window). A release-specific tag tied to a GitHub release cannot be moved or deleted; major and minor tags without a release can move. The how-to page does not tell consumers to pin by tag or SHA. So a pin to a full release tag of an action whose repository enabled immutable releases is also immutable, but the consumer cannot tell from the tag alone; the "only way" claim is therefore wrong in two directions.
- Sources: [lockfile GA changelog](https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available), [lockfile preview changelog](https://github.blog/changelog/2026-10-14-github-actions-workflow-lockfiles-in-public-preview/), [lockfile docs](https://docs.github.com/actions/concepts/security/workflow-dependency-lockfiles), [secure use](https://docs.github.com/en/actions/reference/security/secure-use), [immutable releases for actions](https://docs.github.com/en/actions/how-tos/create-and-publish-actions/using-immutable-releases-and-tags-to-manage-your-actions-releases), [immutable releases GA](https://github.blog/changelog/2025-10-28-immutable-releases-are-now-generally-available/), [InfoQ report](https://infoq.com/news/2026/11/github-actions-lockfiles-ga).
- Decision: reword SW-GATE-23 to "A full-length SHA is the one in-workflow way to pin an action to an exact commit; a committed `actions.lock` (`gh actions-lock`) is the alternative GitHub now recommends; reusable-workflow `uses:` still needs a SHA." The `sha-pins` grep stays correct for the SHA form but would false-positive on a lockfile repository. A lockfile-aware verification: `test -f .github/workflows/actions.lock && gh actions-lock --help` (the verify subcommand name was not read; could not determine).

### 11. SW-GATE-27 swift-protobuf pin

Status: unchanged pin, CHANGED comment and context.

- Pin: current main `build.yml` sanitizer job (`sanitizer_testing`, address and thread, debug and release) still has `image: swift:6.3`.
- Comment now: "6.4 thread sanitizer fails, https://github.com/swiftlang/swift-build/issues/1776 isn't in a release yet." The existing claim quotes "6.4 is failing for some reason" and "unexplained", which is outdated: the reason is documented.
- The issue "[6.4] `--sanitize=thread` fails to link C/C++-only executables on Linux" closed as completed 2026-09-27 via swift-build PR 14357; the fixed-in release is not stated. Commit history of the file: 2026-09-22 "Roll some things back to 6.3 that seem to fail on 6.4 (#2171)", 2026-10-14 "Unpin the framework test since 6.4.1 should fix the issue (#2190)", 2026-11-02 "Work around the sanitizer issue (#2210)". So a 6.4.1 toolchain is expected to fix at least one failure, and the sanitizer job remained pinned at 6.3 on main as of 2026-11-27.
- Caution: that failure is a link error for C/C++-only executables, not the Swift Mutex "Swift access race" report that SW-GATE-27's own measurement describes. The two should not be conflated.
- Sources: [build.yml](https://raw.githubusercontent.com/apple/swift-protobuf/main/.github/workflows/build.yml), [commit history](https://github.com/apple/swift-protobuf/commits/main/.github/workflows/build.yml), [swift-build issue 1776](https://github.com/swiftlang/swift-build/issues/1776).
- The pinned commit in the existing text (`6c84c3dedac0`) was not re-verified against history; the current file is what was read.

## Normative guidance candidates

1. Pin the shared workflow to a tag or SHA at 0.0.18 or later when relying on `soundness.yml` script stability. Rationale: from 0.0.18 the scripts come from the same commit. Verify: `grep -n 'workflows-scripts' .github/workflows/soundness.yml` in the pinned tag, or read `grep -c 'ref:'` is 0 in the tag's `soundness.yml`.
2. Reword SW-GATE-24: pass `linux_swift_versions` explicitly because defaults moved at 0.0.16 and 0.0.18, not because of 5.9 and 5.10 legs. Verify: `shared-workflow` grep stays; diff the default at the pinned tag with `curl -sL .../swift_package_test.yml | grep -n 'linux_swift_versions' -A3`.
3. Reword SW-GATE-23 to name the lockfile alternative and keep SHA pins for reusable-workflow calls. Verify: for lockfile repositories `test -f .github/workflows/actions.lock`, and the `sha-pins` grep restricted to `jobs.<id>.uses` lines.
4. In SW-REL-16 mention `actions/attest` as the successor and `artifact-metadata: write` when `push-to-registry: true` and `create-storage-record` are in use. Verify: `grep -e 'artifact-metadata: *write' .github/workflows/release.yml` only when `push-to-registry` is set.
5. SW-GATE-27 re-check rule stays: re-read swift-protobuf `build.yml` at each toolchain bump, and record that the 6.4 failure there is the C/C++-only link error tracked at swift-build issue 1776 (fixed upstream, release not named).

## AI-agent angle

- An agent will write `uses: actions/attest-build-provenance@v2` or `@v1` from memory. Check: `grep -n 'attest-build-provenance@' .github/workflows/*.yml` and require a 40-hex SHA with a `v4` comment, or `actions/attest`.
- An agent will copy the old default list and add 6.4 by hand, or exclude 5.9 and 5.10, work that the defaults now do. Check: compare the explicit `linux_swift_versions` with the package's tools version.
- An agent writing `uses: swiftlang/github-workflows/.github/workflows/soundness.yml@main` floats scripts and YAML. Check: `sha-pins`.
- An agent may believe `$/` is a typo or "fix" it to `./` when editing a vendored copy of a shared workflow. Check: `grep -n 'uses: \$/' .github/workflows/*.yml`; `./` breaks reusable-workflow callers.

## Contested / evolving

- Lockfiles vs SHA pins: GitHub's documentation now prefers lockfiles. Preview-era articles disagreed about transitive dependency coverage; the GitHub docs page (read 2026-11-27) says transitive actions are covered and reusable workflow calls are not. Trend: lockfile adoption, enforced by a "Require lockfile" policy.
- Shared workflow defaults moved fast (four tags in about six weeks). Expect more drift; pin the tag.
- 6.4.1 may fix sanitizer problems that kept swift-protobuf at 6.3; not confirmed.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://github.com/swiftlang/github-workflows/releases | release notes 0.0.16 to 0.0.19 | 2026-10-14 to 2026-11-18 | change list |
| https://github.com/swiftlang/github-workflows/tags | tag dates | to 2026-11-18 | newest tag |
| https://raw.githubusercontent.com/swiftlang/github-workflows/0.0.19/.github/workflows/swift_package_test.yml | workflow at 0.0.19 | 2026-11-18 | defaults |
| https://raw.githubusercontent.com/swiftlang/github-workflows/0.0.15/.github/workflows/swift_package_test.yml | workflow at 0.0.15 | 2026-08-24 | baseline |
| https://raw.githubusercontent.com/swiftlang/github-workflows/0.0.19/.github/workflows/soundness.yml | soundness at 0.0.19 | 2026-11-18 | scripts, images, baseline |
| https://raw.githubusercontent.com/swiftlang/github-workflows/0.0.15/.github/workflows/soundness.yml | soundness at 0.0.15 | 2026-08-24 | baseline |
| https://raw.githubusercontent.com/swiftlang/github-workflows/0.0.19/.github/actions/workflows-scripts/action.yml | scripts action | 2026-11-18 | no-ref evidence |
| https://raw.githubusercontent.com/swiftlang/github-workflows/0.0.19/.github/workflows/scripts/check-docs.sh | script | 2026-11-18 | spi.yml behaviour |
| https://github.blog/changelog/2026-07-30-reference-same-repository-actions-with-self-repository-syntax | `$/` syntax | 2026-07-30 | explains soundness change |
| https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available | lockfile GA | 2026-10-28 | SW-GATE-23 |
| https://docs.github.com/actions/concepts/security/workflow-dependency-lockfiles | lockfile docs | read 2026-11-27 | scope |
| https://docs.github.com/en/actions/reference/security/secure-use | secure use | read 2026-11-27 | pin guidance |
| https://docs.github.com/en/actions/how-tos/create-and-publish-actions/using-immutable-releases-and-tags-to-manage-your-actions-releases | immutable action releases | read 2026-11-27 | tag immutability |
| https://github.com/actions/attest-build-provenance/releases | wrapper releases | to Aug 2026 | wrapper status |
| https://github.com/actions/attest | attest README | read 2026-11-27 | inputs, permissions |
| https://github.com/apple/swift-nio/blob/main/.github/workflows/unit_tests.yml | swift-nio caller | read 2026-11-27 | override |
| https://raw.githubusercontent.com/apple/swift-protobuf/main/.github/workflows/build.yml | protobuf build | read 2026-11-27 | pin and comment |
| https://github.com/swiftlang/swift-build/issues/1776 | sanitizer issue | closed 2026-09-27 | reason |
| https://github.com/SwiftPackageIndex/SPIManifest/tags | SPIManifest tags | to 2026-11-26 | version |

Could not determine: the 1.14.0 SPIManifest release notes; whether `artifact-metadata: write` is required for a checksum-only attestation without registry push; the lockfile verify subcommand name; the exact tag in which 5.9 to 6.1 left the Linux default list.
