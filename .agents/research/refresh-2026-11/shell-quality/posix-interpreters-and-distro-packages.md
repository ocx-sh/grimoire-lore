---
title: POSIX interpreters and distro packages delta, 2026-10-11 to 2026-11-27
pair: shell-quality
date_researched: 2026-11-27
window_start: 2026-10-11
model: sonnet
sources_fetched: 22
---

# POSIX interpreters and distro packages delta

Scope: dash, bash, busybox, yash, ksh93u+m, mksh, posh and the Debian, Ubuntu and Alpine packaging of them, between 2026-10-11 and 2026-11-27, checked against the version-specific claims of the shell-quality pair. This is a delta update of an existing artifact, not a re-creation. Things not named here are unchanged.

## Summary

1. CHANGED (dash packaging). A distro package with upstream dash 0.5.13.x now exists. Ubuntu 26.10 (Tenacious T-Rex) has `dash 0.5.13.5-1ubuntu1` in its release pocket since 2026-10-31 and `0.5.13.5-2ubuntu1` in proposed since 2026-11-23. The dialect.md claim "Upstream dash 0.5.13.5 has `$'..'`, no package does" is no longer true.
2. CHANGED (upstream dash). Upstream dash 0.5.13.6 was tagged on 2026-11-11, after 0.5.13.5 (2026-07-18). The only code change is "expand: Fix out-of-bounds syntax table access". Any text naming 0.5.13.5 as the newest upstream needs "0.5.13.6".
3. Unchanged by 0.5.13.6, measured by building the tag in an Ubuntu 26.10 container: `set -o pipefail` works, `$'a\tb'` expands to a tab, and `read -d x v` still fails with `read: Illegal option -d` (rc 2). SH-DIAL-10 holds for 0.5.13.6 too.
4. Debian did not move its default dash. Stable (Debian 13) is 0.5.12-12; testing and unstable got 0.5.12-13 (changelog dated 2026-11-15, migrated to testing 2026-11-24; translations and dependency changes only). Debian experimental has 0.5.13.5-2. Debian oldstable is 0.5.12-2. SH-CORE-04's version triple stays true.
5. Ubuntu 24.04 is still 0.5.12-6ubuntu5 and Ubuntu 26.04 is 0.5.12-12ubuntu3 (the 26.04 package is a no-change rebuild of Debian's 0.5.12-12).
6. Alpine 3.23 ships dash 0.5.13.1-r2 as an optional package (measured: `$'..'` and pipefail work, `read -d` fails). Alpine's `/bin/sh` is busybox ash, unchanged. This existed before the window, but the pair's "no package does" was wrong for Alpine 3.23 and 3.24 as well.
7. Bash: no change. The 5.3 patch directory ends at bash53-020 (2026-09-14, before the window). No bash 5.4 alpha, beta or rc exists on ftp.gnu.org or in the November bug-bash thread index.
8. Busybox: 1.38.0 (unstable series) was announced 2026-05-13, before the window; nothing newer in the window. Alpine 3.22, 3.23 and 3.24 all still ship busybox 1.37.0. "busybox 1.37 (cells' host)" stays true for Alpine; Debian unstable and Alpine edge carry 1.38.0.
9. yash: newest is 2.61 (2026-03-03), no release in the window. ksh93u+m: newest tag is v1.0.10 (2024-08-01), no release in the window. mksh and posh: no mksh change found (see Findings 8); posh 0.14.6 exists in Debian testing and unstable (migrated 2026-08-20), while stable stays 0.14.1.
10. Alpine 3.23 (branch 2025-12-03, supported to 2027-11-01) and 3.22 (supported to 2027-05-01) are unchanged. Alpine 3.24 (branch 2026-06-09) exists and is newer than the "3.22 and 3.23" pair of claims.

## Findings

### 1. Dash upstream (git.kernel.org)

The tag list at https://git.kernel.org/pub/scm/utils/dash/dash.git/refs/tags and the log at https://git.kernel.org/pub/scm/utils/dash/dash.git/log/ give: 0.5.13 (2025-09-21), 0.5.13.1 (2025-10-13), 0.5.13.2 (2026-03-21), 0.5.13.3 (2026-04-18), 0.5.13.4 (2026-05-09), 0.5.13.5 (2026-07-18), 0.5.13.6 (2026-11-11). The atom feed https://git.kernel.org/pub/scm/utils/dash/dash.git/atom/?h=master shows the 0.5.13.6 release commit and "expand: Fix out-of-bounds syntax table access" (both 2026-11-11), and "builtin: Add CTLESC before all CCTLs in dollar single quote" (2026-07-17, before the window). No commit in the window touches pipefail, trap or errexit.

Measurement, 2026-11-27, `dash-v0.5.13.6` snapshot tarball from the same tree, built with `./autogen.sh && ./configure && make` in `ubuntu:26.10`:

```
$ dash -c 'set -o pipefail; false | true; echo "pipefail rc=$?"'   -> pipefail rc=1
$ dash -c "printf '%s\n' \$'a\\tb'"                                -> a<TAB>b
$ dash -c 'read -d x v'                                            -> read: Illegal option -d   (rc 2)
```

Verdict per claim:

- dialect.md line 102 "Upstream dash 0.5.13.5 has `$'..'`, no package does": CHANGED. New text: "Upstream dash 0.5.13.x (latest 0.5.13.6, 2026-11-11) has `$'..'`. Ubuntu 26.10 ships 0.5.13.5-1ubuntu1 (archive date 2026-10-31); Alpine 3.23 and 3.24 offer 0.5.13.1-r2 as an optional package; Debian stable, Ubuntu 24.04 and 26.04 do not." Source: https://launchpad.net/ubuntu/+source/dash and the Alpine package listing below.
- SH-DIAL-10 "`read -d` is `Illegal option -d` on every dash (upstream 0.5.13.5 too)": UNCHANGED in substance. Replace "0.5.13.5" with "0.5.13.6" or "0.5.13.x" (measured on 0.5.13.6 and on Alpine's 0.5.13.1).
- dialect.md line 101 "Dash 0.5.12-7 (2024-05-17) backported pipefail": UNCHANGED, not touched by any source read in the window.

### 2. Debian packaging

https://tracker.debian.org/pkg/dash lists oldoldstable 0.5.11+git20200708+dd9ef66-5, oldstable 0.5.12-2, stable 0.5.12-12, testing and unstable 0.5.12-13, experimental 0.5.13.5-2. News: 0.5.13.5-1 accepted to experimental 2026-09-23; 0.5.12-13 accepted to unstable 2026-11-15 and migrated to testing 2026-11-24; 0.5.13.5-2 accepted to experimental 2026-11-15. The changelogs https://metadata.ftp-master.debian.org/changelogs/main/d/dash/unstable_changelog and .../experimental_changelog show 0.5.12-13 is translations plus dependency edits, and 0.5.13.5-1 is "New upstream release (Closes: #1106180, #972886)", with 0.5.13.5-2 adding an out-of-bounds fix and a privilege-dropping change in privileged mode (`sh -p`).

- SH-CORE-04 / SH-CORE-03 triple (0.5.12-2 aborts, Ubuntu 24.04 0.5.12-6ubuntu5 aborts, 0.5.12-12 accepts for Debian 13 and Ubuntu 26.04): UNCHANGED. Optional wording addition: Debian testing and unstable are 0.5.12-13 (same behaviour as -12), and Debian experimental and Ubuntu 26.10 carry 0.5.13.x (pipefail accepted).

### 3. Ubuntu

The Launchpad page https://launchpad.net/ubuntu/+source/dash lists: Noble (24.04) 0.5.12-6ubuntu5 (2024-04-02); Resolute Raccoon (26.04) 0.5.12-12ubuntu3 (2026-02-07 in the pocket listing; the changelog is a no-change mass rebuild dated 2026-02-02); Tenacious T-Rex (26.10) 0.5.13.5-1ubuntu1 release (2026-10-31) and 0.5.13.5-2ubuntu1 proposed (2026-11-23). The changelog https://changelogs.ubuntu.com/changelogs/pool/main/d/dash/dash_0.5.13.5-1ubuntu1/changelog shows "Merge with Debian experimental (LP: #2171203)" dated 2026-10-23, with the only Ubuntu delta being a test-architecture restriction.

Caution: the Docker Hub image `ubuntu:26.10` pulled on 2026-11-27 still contains `dash 0.5.12-12ubuntu3`, and `/bin/sh` is dash. So the package in the archive changed, but the image the cells would pull today did not yet. Re-check the image before claiming "Ubuntu 26.10 images have `$'..'`". Verdict for question (3): the Ubuntu 26.10 archive changed which dash it ships; the published base image had not caught up on 2026-11-27.

### 4. Bash

The patch directory https://ftp.gnu.org/gnu/bash/bash-5.3-patches/ lists bash53-001 to bash53-020. The latest, 010 to 020, are dated 2026-06-02 to 2026-09-14, so none falls in the window (the listing's directory mtime is 2026-09-14). The root listing https://ftp.gnu.org/gnu/bash/ has bash-5.3.tar.gz (2025-07-30) and no bash-5.4 alpha, beta or rc. The bug-bash thread index https://lists.gnu.org/archive/html/bug-bash/2026-11/threads.html shows only bug reports (5.3, "Bug in `time` builtin", 2026-11-16) and no 5.4 announcement.

- dialect.md line 8 "bash 3.2.57 to 5.3.20": UNCHANGED. 5.3.20 is still the newest patch level.
- shell-errexit Open question on "bash 5.3 interp 1602 (bare `exit` in a trap)": UNCHANGED, no new patch or release in the window to re-measure against. I did not read the content of patches 010 to 020 for trap semantics because they predate the window.

### 5. Busybox

https://busybox.net/news.html: newest entries are "13 May 2026 -- BusyBox 1.38.0 (unstable)" and "27 September 2024 -- BusyBox 1.37.0 (unstable)". There is no 1.38.1 or other release in the window. Alpine's package index (https://pkgs.alpinelinux.org/packages) gives busybox 1.37.0-r20 (3.22), 1.37.0-r30 (3.23), 1.37.0-r31 (3.24) and 1.38.0-r8 (edge). `docker run alpine:3.24` reports "BusyBox v1.37.0 (2026-01-10)". Debian tracker https://tracker.debian.org/pkg/busybox shows 1:1.38.0-3 in the current development suite.

- "busybox 1.37 (ash, wget, host of the cells)" and SH-INST-22 "only options in the BusyBox v1.37.0 set": UNCHANGED for Alpine 3.22 to 3.24. A busybox 1.38.0 now exists upstream (before the window), so any claim worded "latest busybox is 1.37" is stale; the claims worded "Alpine's busybox 1.37.0" are right. Whether 1.38 changed ash, wget or the options in SH-INST-22 was not measured (could not determine; no cell ships it yet).

### 6. yash, ksh93u+m, mksh, posh

- yash: https://github.com/magicant/yash/tags shows 2.61 (2026-03-03) newest; 2.60 is 2025-09-15. No release in the window. "yash 2.52 and 2.61": UNCHANGED.
- ksh93u+m: https://github.com/ksh93/ksh/tags and the releases feed show v1.0.10 (2024-08-01) as newest. "ksh93u+m 1.0.4 and 1.0.10": UNCHANGED.
- mksh: the Debian tracker https://tracker.debian.org/pkg/mksh shows 59c-43 in testing and unstable, 59c-41 stable; still R59c. The upstream page https://www.mirbsd.org/mksh.htm could not be fetched (TLS protocol error), so an upstream R60 release is "could not determine" from the primary site; Debian's version supports "no change".
- posh: https://tracker.debian.org/pkg/posh shows 0.14.6 in testing and unstable (migrated 2026-08-20), stable 0.14.1. "posh 0.14.1" is correct for Debian 13 stable; posh 0.14.6 exists. The posh 0.14.6 changelog was not read, so whether it changes any measured row is "could not determine".

### 7. Alpine

https://alpinelinux.org/releases/ lists v3.22 (branch 2025-05-30, end of support 2027-05-01), v3.23 (2025-12-03, 2027-11-01), v3.24 (2026-06-09, 2028-06-01), nothing newer. Release notes pages were not opened; branch dates come from the releases table. `alpine:3.23` image: `/bin/sh -> /bin/busybox`; `apk add dash` installs dash 0.5.13.1-r2 and measured pipefail rc=1 (accepted), `$'a\tb'` works, `read -d` is `Illegal option -d`.

- fish.md line 11 and userland.md "Alpine 3.22 and 3.23": UNCHANGED as factual statements, but Alpine 3.24 is now a third supported release; add it if the text is meant as "the current supported set".

### 8. What could not be determined

- The Docker Hub `ubuntu:26.10` image content after 2026-10-31 (the image pulled still had 0.5.12-12ubuntu3).
- Content of bash 5.3 patches 010 to 020 beyond their dates, and the busybox 1.38.0 changelog, mksh upstream, and posh 0.14.6 changelog.
- The dash mailing list (lore.kernel.org returned HTTP 403) and the kernel.org commit page (403); the atom feed and the log page were used instead.

## Normative guidance candidates

1. Rule: in SH-DIAL-08 and SH-DIAL-09, state that `$'..'` exists in dash 0.5.13 and later, that Ubuntu 26.10 ships it, and that no `#!/bin/sh` portable script may rely on it until Debian stable and Ubuntu 26.04 and 24.04 (all 0.5.12) leave support. Rationale: the "pin until an sh floor with `$'..'` exists" text stays correct as a floor rule, because the floor is still set by 0.5.12 on Debian 13, Ubuntu 24.04 and 26.04, but the "no package ships it" justification is false now. Verification: `grep -n "no package" skills/shell-quality-reference/ -r` returns nothing; reading check that SH-DIAL-08 names the 0.5.12 releases that set the floor.
2. Rule: the identity-block probe text must not assume "dash means no `$'..'`". Probe the feature, `sh -c "printf %s \$'a'"`, instead of the version string. Rationale: dash 0.5.13.x on Ubuntu 26.10 and Alpine's optional dash answer differently from Debian's. Verification: grep the identity-block probe for a version comparison against 0.5.12; the probe uses the behavioural test.
3. Rule: keep SH-DIAL-10 (`read -d` is illegal on every dash) and change "0.5.13.5" to "0.5.13.6". Rationale: measured on the 0.5.13.6 tag on 2026-11-27. Verification: `docker run ... dash -c 'read -d x v'` prints "Illegal option -d".
4. Rule: wherever the pair says "latest busybox is 1.37", reword to "the busybox Alpine 3.22 to 3.24 ship is 1.37.0". Rationale: upstream 1.38.0 exists (2026-05-13). Verification: `grep -rn "1.37" rules/shell-quality.md skills/shell-quality-reference/`.

## AI-agent angle

- A model trained before late 2025 asserts "dash has no `$'..'`" and rewrites a correct bashism-free script into `printf '\t'` spelled workarounds, or refuses valid Ubuntu 26.10 code. Check: run the script under the target image's `sh` rather than reasoning from the distro name.
- A model reads "Ubuntu 26.10" as "dash 0.5.12". The archive says 0.5.13.5, the Docker image said 0.5.12-12ubuntu3 on 2026-11-27. Check: `dpkg -s dash | grep Version` inside the image.

## Contested / evolving

- Dash is moving: Debian carries 0.5.13.5-2 in experimental only, with the stable and unstable default staying at 0.5.12. Expect Debian unstable to adopt 0.5.13.x; as of 2026-11-27 it had not. Trend: `$'..'` in `/bin/sh` on Debian 14 era and Ubuntu 26.10, not on the 2026 LTS floors.
- Bash 5.4: no pre-release as of 2026-11-27, so the "bash 5.3.20 is current" claim is stable.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://git.kernel.org/pub/scm/utils/dash/dash.git/refs/tags | dash tag list (primary) | read 2026-11-27 | Release dates 0.5.13 to 0.5.13.6 |
| https://git.kernel.org/pub/scm/utils/dash/dash.git/log/ | dash commit log (primary) | to 2026-11-11 | Shows 0.5.13.6 content |
| https://git.kernel.org/pub/scm/utils/dash/dash.git/atom/?h=master | dash atom feed (primary) | to 2026-11-11 | Commit subjects with timestamps |
| https://git.kernel.org/pub/scm/utils/dash/dash.git/snapshot/dash-0.5.13.6.tar.gz | source tarball, built and run | 2026-11-11 | pipefail, `$'..'`, `read -d` measurement |
| https://tracker.debian.org/pkg/dash | Debian tracker (primary) | 2026-11-27 | Per-suite versions and news dates |
| https://metadata.ftp-master.debian.org/changelogs/main/d/dash/unstable_changelog | Debian changelog | 2026-11-15 | 0.5.12-13 content |
| https://metadata.ftp-master.debian.org/changelogs/main/d/dash/experimental_changelog | Debian changelog | 2026-11-15 | 0.5.13.5-1 and -2 content |
| https://launchpad.net/ubuntu/+source/dash | Launchpad package page (primary) | 2026-11-23 | Ubuntu series versions and dates |
| https://changelogs.ubuntu.com/changelogs/pool/main/d/dash/dash_0.5.13.5-1ubuntu1/changelog | Ubuntu changelog | 2026-10-23 | Merge from Debian experimental |
| https://packages.ubuntu.com/source/tenacious/dash | Ubuntu source package page | 2026-11-27 | Confirms 26.10 version |
| https://ftp.gnu.org/gnu/bash/ | bash release directory (primary) | to 2025-07-30 | No 5.4 pre-release |
| https://ftp.gnu.org/gnu/bash/bash-5.3-patches/ | bash 5.3 patches (primary) | to 2026-09-14 | Newest patch is 020 |
| https://lists.gnu.org/archive/html/bug-bash/2026-11/threads.html | bug-bash November thread index | 2026-11 | No 5.4 announcement |
| https://busybox.net/news.html | busybox announcements (primary) | 2026-05-13 | 1.38.0 date, nothing later |
| https://pkgs.alpinelinux.org/packages | Alpine package index | 2026-11-27 | busybox and dash per branch |
| https://alpinelinux.org/releases/ | Alpine release table (primary) | 2026-11-27 | 3.22 to 3.24 dates |
| https://github.com/magicant/yash/tags | yash tags (primary) | 2026-03-03 | Newest 2.61 |
| https://github.com/magicant/yash/releases.atom | yash release notes | 2026-03-03 | 2.61 contents |
| https://github.com/ksh93/ksh/tags | ksh93u+m tags (primary) | 2024-08-01 | Newest v1.0.10 |
| https://github.com/ksh93/ksh/releases.atom | ksh93u+m release notes | 2024-08 | 1.0.10 contents |
| https://tracker.debian.org/pkg/mksh | Debian mksh tracker | 2026-11-27 | R59c still current there |
| https://tracker.debian.org/pkg/posh | Debian posh tracker | 2026-11-27 | posh 0.14.6 in testing |
| https://tracker.debian.org/pkg/busybox | Debian busybox tracker | 2026-11-27 | busybox 1.38.0-3 in development |
