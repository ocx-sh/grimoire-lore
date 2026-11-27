---
title: Userland (uutils, GNU, sudo-rs, git) and base images delta, 2026-10-11 to 2026-11-27
pair: shell-quality
date_researched: 2026-11-27
window_start: 2026-10-11
model: sonnet
sources_fetched: 17
---

# Userland and base images delta

Scope: the external-command userland the shell-quality pair pins, checked against the window 2026-10-11 to 2026-11-27. This is a delta update of an earlier research round, not a re-creation. Where nothing shipped in the window, the claim stays as written.

## Summary

1. uutils 0.13.0 shipped on 2026-11-20 (inside the window). 0.11.0 (2026-08-31) and 0.12.0 (2026-09-17) predate the window but postdate the baseline's pinned 0.10.0. Ubuntu 26.10 ("stonking") carries 0.12.0-1ubuntu2. Ubuntu 26.04 ships 0.8.0 at release and 0.10.0 in resolute-updates.
2. None of the 0.11.0, 0.12.0 or 0.13.0 notes says ICU collation changed to stop selecting on uninstalled `*.UTF-8` names. The notes do show more locale-aware collation (0.11.0: `ls` and `comm` collate by locale). The SH-USER-09 claim is therefore not contradicted, and the scheduled re-diff is triggered by an image that now carries 0.12 (26.10), not by a behaviour fix.
3. sudo-rs is the default `sudo` on 25.10 and on 26.04. The "unverified" sentence in SH-SEC-06 scope can be replaced by a fact.
4. No git release after 2.54 touches credential-header handling (`http.extraHeader`, `GIT_CONFIG_COUNT`). Git 2.55 and 2.56 exist.

## Findings per claim at risk

### userland.md line 7 and SH-USER-09, uutils version in images: CHANGED (version fact only)

- Old text: "uutils coreutils 0.2.2 and 0.10.0 (the Ubuntu 25.10 and 26.04 default)".
- New fact: the Ubuntu package page for rust-coreutils lists resolute (26.04) at 0.8.0-0ubuntu3, resolute-updates at 0.10.0-1ubuntu2~26.04.1, and stonking (26.10) at 0.12.0-1ubuntu2. `coreutils-from-uutils` is listed for resolute (0.0.0~ubuntu25) and stonking (2ubuntu1). The Ubuntu 26.04 release notes state the release shipped Rust coreutils 0.8.0 and sudo-rs 0.2.13, with `cp`, `mv` and `rm` still taken from GNU.
- Sources: https://packages.ubuntu.com/search?keywords=rust-coreutils&searchon=names&suite=all&section=all , https://packages.ubuntu.com/search?keywords=coreutils-from-uutils&searchon=names&suite=all&section=all , summary of https://documentation.ubuntu.com/release-notes/26.04/summary-for-lts-users/ (reached through a search result, not opened directly).
- Date of upstream change: 26.10 package with 0.12.0 is a fact on 2026-11-27; the exact upload date was not shown. The 0.10.0 SRU date was not shown.
- Consequence: "0.10.0 (the Ubuntu 25.10 and 26.04 default)" is true only for a 26.04 image with updates applied. A fresh 26.04 image at release is 0.8.0. The 25.10 package version was not fetched (the page search did not list questing); "could not determine" for 25.10.
- 0.13.0 is not in any Ubuntu image fetched.

### SH-USER-09, ICU collation for any `*.UTF-8` name: UNCHANGED (no evidence of change); re-diff trigger FIRED by 26.10 carrying 0.12

- 0.11.0 (2026-08-31): "ls sorts names using locale-aware collation (#11841)", "comm now compares lines using locale collation (#14047)", ICU crates updated to 2.3.x. Source: https://github.com/uutils/coreutils/releases/tag/0.11.0
- 0.12.0 (2026-09-17): sort `-n` key fix, ICU derive crates updated, Windows locale detection. No collation entry. Source: https://github.com/uutils/coreutils/releases/tag/0.12.0
- 0.13.0 (2026-11-20): `date` ICU formatters and locale date format verbatim, "sort: merge lazily in UTF-8 locales instead of precomputing sort keys", many `comm`, `join` and `sort` option fixes. No entry says collation stops applying to uninstalled UTF-8 names. Only the first 100,000 of about 210,000 characters of this page were read, so entries after that point were not seen. Source: https://github.com/uutils/coreutils/releases/tag/0.13.0
- Verdict: no source says the behaviour changed, and "sort ... in UTF-8 locales" in 0.13.0 suggests UTF-8 locale handling is still the selector. This is absence of evidence in release notes; it is not a measurement. The claim stays.
- Re-diff: the shell-dialect open question names "uutils re-diff at 0.12 and Ubuntu 26.10". Both conditions now exist as packages (0.12.0 in stonking, 0.13.0 upstream). The re-diff is due; it needs a container run and was not done here.

### SH-USER-08 and userland.md line 88, `xargs -r` and `env -S`: UNCHANGED / could not determine

- `xargs` is not part of uutils coreutils (it lives in uutils findutils). The coreutils release notes for 0.11 to 0.13 do not mention it. GNU findutils NEWS was requested twice and timed out; `xargs` empty-input behaviour on GNU is "could not determine" for the window. The claim stays.
- `env -S`: 0.13.0 lists "env: do not start a word for an unset variable in -S" and "env: take the value of -C, -u and -a as is, not as a -S string". These are behaviour fixes inside uutils `env -S`. userland.md line 88 lists `env -S` as unsupported on busybox, AL2 and Ubuntu 25.10. Ubuntu 25.10 carries an older uutils than 0.13, so the line stays true for that image. Whether the 0.13 fix changes the Ubuntu 26.04 or 26.10 verdict was not measured: could not determine.
- Source: https://github.com/uutils/coreutils/releases/tag/0.13.0

### GNU coreutils range "8.22 to 9.12": UNCHANGED

- https://ftp.gnu.org/gnu/coreutils/ lists 9.12 (2026-09-14) as newest and no 9.13. The range ends where the baseline says. The GNU NEWS file returned HTTP 502, so 9.12 behaviour changes were not read.

### SH-GATE-33, "uutils coreutils 0.10.0 on ubuntu:26.04": UNCHANGED, with a note

- It is accurate for an updated 26.04 image (resolute-updates 0.10.0). It would be wrong for an image without updates (0.8.0). A gate cell should print `rust-coreutils` package version rather than assume it. No change required unless the row claims a fresh image.

### SH-SEC-06 scope, sudo-rs default: CHANGED (unverified sentence now resolvable)

- Old text: "Whether a stock Ubuntu 25.10 or later makes sudo-rs the default `sudo` is unverified here".
- New fact: Ubuntu announced on 2025-09-02 "sudo-rs 0.2.8 is now the default sudo in Ubuntu daily images" for 25.10. Classic sudo remains as `sudo.ws` (switch with `update-alternatives --set sudo /usr/bin/sudo.ws`). For 26.04 the Ubuntu documentation (via search result) states sudo-rs is the default provider, original sudo renamed `sudo.ws`, and the release shipped sudo-rs 0.2.13. The resolute package page lists sudo-rs 0.2.13-0ubuntu1 and a security-pocket 0.2.13-0ubuntu1.2.
- Sources: https://discourse.ubuntu.com/t/sudo-rs-is-now-default-for-questing-quokka/66497 , https://packages.ubuntu.com/search?keywords=sudo-rs&searchon=names&suite=resolute&section=all , https://ubuntu.com/server/docs/reference/other-tools/sudo-rs/ (search result only).
- Effect on `sudo -E` claims: none negative. The SH-SEC-06 measurement already used sudo-rs 0.2.8 and 0.2.13, which are exactly the versions the 25.10 and 26.04 defaults ship. The Discourse post does not discuss `-E`, so the rationale rests on the earlier measurement, not on this source. sudo-rs 0.2.13 is not newer than the 0.2.13 already measured. 26.10 sudo-rs version was not fetched.

### Git, SH-SEC-13 and security.md line 8 "git 2.43.0 to 2.54.0": UNCHANGED for credential handling

- Tags on https://github.com/git/git/tags: v2.56.0 (2026-09-28), v2.56.1 (2026-10-26), and maintenance releases v2.50.2, 2.51.3, 2.52.1, 2.53.1, 2.54.1, 2.55.1 (all 2026-11-03).
- 2.55.0 notes: the only credential-adjacent entry is "http.emptyAuth=auto now correctly attempts Negotiate authentication". No mention of `http.extraHeader`, `GIT_CONFIG_COUNT` or `Authorization` redaction. Source: https://raw.githubusercontent.com/git/git/v2.56.1/Documentation/RelNotes/2.55.0.adoc
- 2.56.0 notes: wincred fixes and a Git for Windows NTLM symlink leak fix. Nothing about the two credential forms. Source: https://raw.githubusercontent.com/git/git/v2.56.1/Documentation/RelNotes/2.56.0.adoc
- 2.54.1 / 2.56.1 maintenance: six CVEs merged (CVE-2026-111760, CVE-2026-113408, CVE-2026-114466, CVE-2026-114467, CVE-2026-114469, CVE-2026-105437) with no description in the notes. Whether any concerns credentials was not determined; the CVE entries were not fetched. Source: https://raw.githubusercontent.com/git/git/v2.54.1/Documentation/RelNotes/2.54.1.adoc
- Reading: the claim "git 2.43.0 to 2.54.0" bounds what was measured, and stays true. The cells' host git remains 2.54.0 until re-run.

## Normative candidates

1. userland.md line 7: add "(0.8.0 at the 26.04 release, 0.10.0 after updates; 26.10 carries 0.12.0)". Rationale: the baseline's "26.04 default = 0.10.0" is true only after updates and the gate cell may run on a fresh image. Verification: `docker run --rm ubuntu:26.04 sh -c 'apt-cache policy rust-coreutils'` and compare with `sort --version`.
2. SH-SEC-06 scope: replace "is unverified here" with "sudo-rs is the default sudo on Ubuntu 25.10 and 26.04; classic sudo is `sudo.ws`". Rationale: fetched from the Ubuntu announcement and package pages. Verification: `docker run --rm ubuntu:26.04 sh -c 'readlink -f /usr/bin/sudo'` on an image with sudo installed, and `sudo --version`.
3. Schedule: run the uutils re-diff against ubuntu:26.10 (0.12.0) and an upstream 0.13.0 build, comparing the 30 differing cases and `LANG=xx_YY.UTF-8 sort` on a locale that is not installed. Rationale: both named triggers exist as packages. Verification: the existing cells u01 to u09 replayed on the new images.
4. Q4 "informational until uutils 0.12 reaches an image, required after": 0.12 has reached an image (stonking), so the switch condition is met on the letter. Recommendation to the orchestrator: defer the switch until the re-diff in candidate 3 is run, since release notes alone do not show whether the 30 cases moved.

## Not determined

- GNU findutils NEWS and GNU coreutils NEWS (timeout and 502 respectively).
- Ubuntu 26.10 release notes (404 on the guessed Discourse URL) and its sudo-rs version.
- Ubuntu 25.10 rust-coreutils version.
- Second half of the 0.13.0 release notes.
- Content of the six git CVEs.
