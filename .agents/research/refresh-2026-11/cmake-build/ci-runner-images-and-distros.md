---
title: CMake build pair, delta on hosted CI images, setup actions and distro packages
pair: cmake-build
date_researched: 2026-11-27
window_start: 2026-09-26
model: sonnet
sources_fetched: 24
---

# Delta: hosted CI images, CMake setup actions, distro packages (2026-09-26 to 2026-11-27)

Scope: a delta on the existing research, not a re-creation. Every claim at risk is marked "unchanged", "changed" or "could not determine". Fetch limits are stated where they matter: the GitHub REST API and Phoronix returned HTTP 403, and src.fedoraproject.org returned an Anubis access-denied page.

## Summary

- The two-gates statement is stale in its details but the point still holds. `ubuntu-24.04` and `windows-2025` are still on 3.31.6. `macos-15` moved from 4.4.2 to 4.5.0 (README 2026-11-18) and the release feed shows 4.5.1 on 2026-11-24.
- `ubuntu-latest` moved to Ubuntu 26.04 inside the window (announced rollout 2026-10-19 to 2026-11-19). `macos-latest` now means macOS 26. `windows-latest` is still Windows Server 2025.
- Fedora 45 was released on 2026-11-03. Whether the `%cmake` macro actually dropped the five variables could not be determined.
- The 3.25 floor distro table is unchanged. Debian bookworm is 3.25.1 and Ubuntu jammy is 3.22.1.

## CMake version per image label as of 2026-11-27

| Label | CMake | README image version and date | Source |
|---|---|---|---|
| `ubuntu-24.04` | 3.31.6 | 20261116.376.1 (2026-11-16). The release feed shows 24.04 build 20261122.23 on 2026-11-23 with no CMake change listed. | [Ubuntu2404-Readme](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md), [releases](https://github.com/actions/runner-images/releases) |
| `windows-2025` | 3.31.6 | 20261116.335.1 (2026-11-16). A later 20261124.341 release exists on 2026-11-25; its CMake line was not read. | [Windows2025-Readme](https://github.com/actions/runner-images/blob/main/images/windows/Windows2025-Readme.md) |
| `macos-15` (arm64) | 4.5.0 | 20261118.0550.1 (2026-11-18). The release feed shows 4.5.0 to 4.5.1 in build 20261123.0558 (2026-11-24). | [macos-15-arm64-Readme](https://github.com/actions/runner-images/blob/main/images/macos/macos-15-arm64-Readme.md), [releases](https://github.com/actions/runner-images/releases) |
| `macos-26` / `macos-latest` (arm64) | 4.5.0 | 20261117.0516.1 (2026-11-17) | [macos-26-arm64-Readme](https://github.com/actions/runner-images/blob/main/images/macos/macos-26-arm64-Readme.md) |
| `ubuntu-26.04` / `ubuntu-latest` | 4.5.0 in README (2026-11-16); 4.5.1 per release 20261122.9 (2026-11-23) | 20261116.202.1 | [Ubuntu2604-Readme](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2604-Readme.md), [releases](https://github.com/actions/runner-images/releases) |
| `ubuntu-22.04` | 3.31.6 | 20261116.365.1 (2026-11-16) | [Ubuntu2204-Readme](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2204-Readme.md) |

Caveat: the raw READMEs fetched through the summarizing fetch tool may lag the release feed by a few days (README 2026-11-16 versus release 2026-11-23 for the same image). The 4.5.1 values come from the release feed, not from a README. The Android SDK section of every README also lists separate CMake builds (3.31.5, 4.1.2); those are not the `PATH` CMake.

## Claims at risk

### Two gates on one unpinned workflow (rules/cmake-build.md The Gate; CMK-VER-03; CMK-CI-01 and its Re-check)

Status: changed in its numbers, unchanged in its conclusion.

- Old text: on 2026-09-26 `ubuntu-24.04` and `windows-2025` ship 3.31.6 and `macos-15` ships 4.4.2.
- New fact: `ubuntu-24.04` and `windows-2025` are still 3.31.6. `macos-15` ships 4.5.0 (README 2026-11-18), and 4.5.1 per the 2026-11-24 release. Gap between the 3.31 and 4.5 images is wider, not narrower.
- Source: the READMEs and release feed above. Upstream change date for `macos-15`: between 2026-09-26 and 2026-11-18 (the exact bump release was not located; the release page only showed 2026-11-23 to 2026-11-25).
- Additional gate: `ubuntu-latest` is now Ubuntu 26.04 with CMake 4.5.x, so an unpinned `ubuntu-latest` now lands on the new gate while `ubuntu-24.04` stays on 3.31.6. Any pair text that treats `ubuntu-latest` as 24.04 is wrong.

### Ubuntu 22.04 apt ships 3.22.1 (CMK-VER-03)

Status: unchanged. packages.ubuntu.com shows jammy 3.22.1-1ubuntu1 and jammy-updates 3.22.1-1ubuntu1.22.04.2. Source: [packages.ubuntu.com search](https://packages.ubuntu.com/search?keywords=cmake&searchon=names&suite=all&section=main). Note the hosted `ubuntu-22.04` image itself ships 3.31.6 from the image tooling, not from apt.

### `-latest` label moves

Status: changed.

- `ubuntu-latest` moves from Ubuntu 24.04 to 26.04, rolling out gradually 2026-10-19 to 2026-11-19. Source: [GitHub changelog 2026-09-17](https://github.blog/changelog/2026-09-17-ubuntu-26-generally-available-and-latest-migration). Corroboration that the move had happened by 2026-10-22: a downstream commit titled "ci: fix build after ubuntu-latest moved to Ubuntu 26.04", quoted in [runner-images#14226](https://github.com/actions/runner-images/issues/14226) (closed as completed 2026-11-17). The repository table lists `ubuntu-latest` on Ubuntu 26.04: [runner-images README](https://github.com/actions/runner-images).
- `macos-latest` points to macOS 26 arm64 in the same table. The date of that move was not found; the GitHub changelog label page for the window showed no entry for it.
- `windows-latest` is Windows Server 2025 in the table. No move.
- Other events: macOS 14 images retired from Actions on 2026-11-02 (changelog 2026-10-01); Xcode 27 images generally available 2026-10-15; `ubuntu-slim` and `windows-2025-vs2026` labels appear in the table.

### CMK-CI-05 (presets-and-ci.md)

- runner-images#10443: unchanged. Closed as completed 2024-08-20 by the reporter after a Podman workaround; no image fix. Source: [issue 10443](https://github.com/actions/runner-images/issues/10443).
- runner-images#11489: unchanged. Closed unmerged by subir0071 on 2025-01-28 ("workaround already exists"). Later link-backs in 2026 only; an October 2026 commit message calling it declined is third-party wording, not thread content. Source: [PR 11489](https://github.com/actions/runner-images/pull/11489). Note it is a pull request, not an issue.
- "Ubuntu 24.04 restricts unprivileged user namespaces": no change found for 24.04. Whether the new `ubuntu-26.04` image keeps the restriction was not measured and could not be determined from the sources read.
- "macOS runners ship no Docker": unchanged for macOS 15 and 26. Neither README lists Docker. Ubuntu 26.04 README lists Docker 29.4.2, Compose 5.1.3, Buildx 0.39.0.
- "No hosted runner was measured": still true; this research read READMEs only and did not run a probe. The open question stays open.
- Normative candidate: extend CMK-CI-05 to name `ubuntu-latest` (now 26.04). Rationale: the rule names `ubuntu-24.04` only, while the unpinned label has moved. Verification: `grep -n 'ubuntu-latest' .github/workflows/*.yml`; an empty result passes, a hit needs a measured probe on `ubuntu-26.04`. Not yet justified for a rule edit without a measurement; report to the owner.

### CMK-CORE-05 shell default

Status: unchanged. Workflow-syntax page, shell parameters table: explicit `shell: bash` runs `bash --noprofile --norc -eo pipefail {0}`; unspecified shell on Linux and macOS runs `bash -e {0}` (falls back to `sh -e {0}`). Source: [workflow-syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax), read 2026-11-27 (the fetch tool gave the same answer on two page segments). The page's dated change history was not read; a change in the window is not evidenced.

### Action names `get-cmake` and `setup-cmake` (CMK-VER-03 grep)

Status: unchanged. Both repositories still exist with no archive or deprecation notice on their releases pages. [lukka/get-cmake](https://github.com/lukka/get-cmake/releases) publishes a release per CMake version (v4.5.0 on 13 Nov, v4.5.1 on 21 Nov, v4.4.5 on 28 Oct; years not shown on the page, so the dates are day and month only, likely 2026). [jwlawson/actions-setup-cmake](https://github.com/jwlawson/actions-setup-cmake/releases) latest is v2.2.0 (19 Mar, Node 24); nothing newer than the baseline appears. The GitHub API returned 403, so exact publish timestamps could not be read.

### CMK-INST-09 Fedora 45 `%cmake`

Status: Fedora 45 release state changed; macro claim could not be determined.

- Fedora 45 final released 2026-11-03, after slipping from 2026-10-20. Source: [itsfoss](https://itsfoss.com/news/fedora-45-features/) (secondary source; the Phoronix page returned 403, and the Fedora schedule page returned 404). It does not mention cmake.
- Change page [Changes/CMake_drop_install_vars](https://fedoraproject.org/wiki/Changes/CMake_drop_install_vars): last updated still 2026-03-10, target Fedora 45, tagged ChangeAcceptedF45, FESCo issue 3402. It drops `-DINCLUDE_INSTALL_DIR`, `-DLIB_INSTALL_DIR`, `-DSYSCONF_INSTALL_DIR`, `-DSHARE_INSTALL_PREFIX` and `-DLIB_SUFFIX`. It states the cmake change will not merge until affected packages are patched (309 of 2,359 affected at the last update). The page does not say the change landed.
- The macro source (src.fedoraproject.org) could not be read. So "Fedora 45's `%cmake` macro stopped injecting" is not confirmed as shipped. Recommend the rule text say "Fedora 45 targets dropping" or the owner verify with `rpm --eval '%cmake'` on a Fedora 45 container.
- Normative candidate: reword CMK-INST-09 from "stopped injecting" to "Fedora 45 planned to stop injecting". Rationale: no source in the window confirms the landing. Verification: run `podman run --rm fedora:45 rpm --eval '%cmake'` and grep the output for `LIB_SUFFIX`.

### 3.25 floor distro table (cmake-versions-and-gate.md, Key sources 10)

Status: unchanged. From packages.debian.org: bullseye 3.18.4-2+deb11u1, bookworm 3.25.1-1, trixie 3.31.6-2, forky 4.3.4-1, sid 4.4.5-1, bookworm-backports 3.31.6-2~bpo12+1. From packages.ubuntu.com: jammy 3.22.1, noble 3.28.3-1build7, resolute (26.04) 4.2.3-2ubuntu2. Sources: [Debian](https://packages.debian.org/search?keywords=cmake&searchon=names&suite=all&section=main), [Ubuntu](https://packages.ubuntu.com/search?keywords=cmake&searchon=names&suite=all&section=main).

Floor point for the owner (not decided here): nothing in the window forces the 3.25 floor to move. Bookworm (3.25.1) remains the binding distro at that floor. Jammy (3.22.1) stays below it, as before. Ubuntu 26.04 is now far above it (4.2.3 apt, 4.5.x on the runner).

## Could not determine

- The exact date `macos-15` moved from 4.4.2 to 4.5.0, and the date `macos-latest` moved to macOS 26.
- Whether the `windows-2025` 2026-11-25 build changed CMake.
- Whether `ubuntu-26.04` keeps the 24.04 user-namespace restriction.
- Whether the Fedora `%cmake` macro change shipped in Fedora 45.
- Exact publish dates of the lukka and jwlawson releases (API 403).
