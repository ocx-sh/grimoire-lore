---
title: shell-quality delta refresh decision, 2026-10-11 to 2026-11-27
pair: shell-quality
date: 2026-11-27
window_start: 2026-10-11
model: opus
consolidates:
  - .agents/research/refresh-2026-11/shell-quality/shellcheck-shfmt-delta.md
  - .agents/research/refresh-2026-11/shell-quality/github-actions-runners-and-workflow-linters.md
  - .agents/research/refresh-2026-11/shell-quality/task-and-gitlab-runner.md
  - .agents/research/refresh-2026-11/shell-quality/posix-interpreters-and-distro-packages.md
  - .agents/research/refresh-2026-11/shell-quality/userland-coreutils-and-base-images.md
  - .agents/research/refresh-2026-11/shell-quality/alt-shells-zsh-fish-nu-elvish.md
  - .agents/research/refresh-2026-11/shell-quality/emit-installer-test-toolchain.md
  - .agents/research/refresh-2026-11/shell-quality/recent-shifts-without-a-rule.md
revises:
  - .agents/research/shell-ci.md
  - .agents/research/shell-gate.md
  - .agents/research/shell-dialect.md
  - .agents/research/shell-security.md
  - .agents/research/shell-emit.md
  - .agents/research/shell-alt-shells.md
---

# shell-quality delta refresh decision

This is a delta update of the pair measured on 2026-10-11. Nothing is re-created. A claim that no delta artifact contradicts with a fetched primary source stays as written. Measurement statements of the form "Rows bind to X, measured 2026-10-11" stay true as records of what was measured, so they change only where they also make a claim about the present (a future date that has passed, "no package does", "unverified here", a ceiling the gate was re-run on).

## Verdict

1. The two dated end points in the rule have passed. pwsh 7.4 and 7.5 left support on 2026-11-10 (Microsoft PowerShell Support Lifecycle), and the runner-images README has mapped `ubuntu-latest` to 26.04 since PR 15381 was merged on 2026-11-24. Every "until 2026-11-19" and "moves there by 2026-11-19" text is rewritten into present tense.
2. SH-CI-15 keeps its ID, number and meaning (a shell-heavy job must be correct on both Ubuntu images and detect features). It loses its expiry date and becomes a standing SHOULD that holds while `ubuntu-24.04` stays a hosted label.
3. SH-CI-03 keeps its MUST. Only its scope sentence changes, because the pipefail hazard still exists on `ubuntu-24.04`, Debian 12 containers and posh after `ubuntu-latest` moved.
4. dash: "no package ships `$'..'`" is false. The Ubuntu 26.10 archive ships 0.5.13.5 and Alpine offers 0.5.13.1 as an optional package. The sh floor still lacks `$'..'`, because Debian 13, Ubuntu 24.04 and 26.04 stay on 0.5.12. SH-DIAL-09 is unchanged in force. SH-DIAL-10 is re-measured on upstream 0.5.13.6 and holds.
5. nushell 0.117.0 (2026-11-09) is the only alt-shell release in the window. The gate and the hang check were re-run on it. SH-NU-04 gains `filter` and `type` as a command name and records `get -i` as an error from 0.117.0. SH-NU-11 records that the hang does not reproduce on 0.117.0 and stays MUST, because the floor-to-ceiling range still holds 0.112.1 to 0.116.1. The gate's own `nu-range` header and the parse-gate row move to 0.117.0. The rule's "nu 0.105.1 to 0.116.0" was already a defect against 0.116.1 and is fixed.
6. Other ceilings (SH-NU-01, SH-NU-05, the emit.md nu rows) do not move, because nothing but the gate and the hang check was re-run on 0.117.0.
7. SH-SEC-06's "unverified here" sentence is replaced by Ubuntu's own announcement that 25.10 made sudo-rs the default `sudo`.
8. userland: a 26.04 image without updates carries uutils 0.8.0, not 0.10.0, and 26.10 carries 0.12.0. The header says so. The scheduled uutils re-diff is now due, but it was not run, so SH-USER-09 keeps its claim and the re-diff is an open question.
9. SH-EMIT-03: mise fixed the curly-quote gap in v2026.10.19 (2026-10-24), and direnv master did not. The evidence sentence says so, so a reader does not take mise as still vulnerable.
10. No new rule. No ShellCheck, shfmt, bash, busybox, zsh, fish, elvish, Task, actionlint or bats release in the window changes a claim.
11. Budgets hold. Every edit is in place and adds no line. The rule stays at 200 lines total with its body under 200, and every file over 100 lines keeps its table of contents.
12. Bumps: the rule gets a patch (corrected dates and a corrected nu range). The reference skill gets a minor, because SH-NU-04 bans two new forms that an adopter's gate now flags.

## Changed rules

### SH-CI-03 (ci.md, scope sentence only)

- Old: "Scope: `shell: sh`, until the `ubuntu-latest` move to 26.04 completes 2026-11-19."
- New: "Scope: `shell: sh` on every runner. `ubuntu-latest` (26.04 since 2026-11-24) accepts bare pipefail, while `ubuntu-24.04`, Debian 12 containers and posh do not."
- Source: runner-images PR 15381 (merged 2026-11-24) and the Ubuntu 26.04 and 24.04 image READMEs (images 20261116.202.1 and 20261116.376.1), which list dash 0.5.12-12ubuntu3 and 0.5.12-6ubuntu5. URLs: https://github.com/actions/runner-images/pull/15381 , https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2604-Readme.md , https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md
- Verification: the existing cell SH-CI-03 is unchanged. `grep -rn '2026-11-19' rules skills/shell-quality-reference` prints nothing.

### SH-CI-15 (ci.md, rule, rationale and scope)

- Old rule: "Until the `ubuntu-latest` move to 26.04 completes (rollout 2026-10-19 to 2026-11-19, rule expires 2026-11-19), make a shell-heavy job correct on ubuntu-24.04 and ubuntu-26.04: pin `ubuntu-24.04` or add a 26.04 leg, and detect features, never `--version \| grep GNU`."
- New rule: "`ubuntu-latest` has been ubuntu-26.04 since 2026-11-24, and ubuntu-24.04 stays available by its explicit label. Make a shell-heavy job correct on the image it runs on: a job written against 24.04 either pins `ubuntu-24.04` or gets a 26.04 leg, and it detects features, never `--version \| grep GNU`."
- Rationale change: the image versions are dated by README image tag. The PR 15381 move is recorded. The uutils sentence names what the runner README lists (`coreutils 9.5-1ubuntu2+0.0.0~ubuntu25` and no uutils package) and keeps "not probed". The scope changes from "remove after the window" to "until ubuntu-24.04 leaves the hosted images".
- Source: runner-images PR 15381, issue 14748, and the Ubuntu2604 and Ubuntu2404 READMEs. URLs: https://github.com/actions/runner-images/pull/15381 , https://github.com/actions/runner-images/issues/14748 , https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2604-Readme.md , https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md
- Verification: cell SH-CI-15 is unchanged (a listing of exposed jobs and GNU sniffing).
- Severity: SHOULD, unchanged.

### SH-USER-09 (userland.md, rationale parenthetical)

- Old: "On Ubuntu 26.04 (`ubuntu-latest` moves there by 2026-11-19) `LANG=en_US.UTF-8` sorts `a A b B`."
- New: "On the `ubuntu:26.04` image `LANG=en_US.UTF-8` sorts `a A b B`."
- Source: the date passed (runner-images PR 15381). The measurement was taken on the container image, and which coreutils the runner uses is not probed. URL: https://github.com/actions/runner-images/pull/15381
- Verification: u09 is unchanged.

### SH-DIAL-10 (dialect.md, rationale)

- Old: "`read -d` is `Illegal option -d` on every dash (upstream 0.5.13.5 too)"
- New: "`read -d` is `Illegal option -d` on every dash (upstream 0.5.13.6 and Alpine's 0.5.13.1 too, measured 2026-11-27)"
- Source: the dash tag 0.5.13.6 (git.kernel.org, 2026-11-11), built and run in `ubuntu:26.10`, and Alpine 3.23 `apk add dash` (0.5.13.1-r2). URLs: https://git.kernel.org/pub/scm/utils/dash/dash.git/refs/tags , https://git.kernel.org/pub/scm/utils/dash/dash.git/snapshot/dash-0.5.13.6.tar.gz , https://pkgs.alpinelinux.org/packages
- Verification: `dash -c 'read -d x v'` prints `read: Illegal option -d` with rc 2 on both builds.

### SH-SEC-06 (security.md, scope bullet)

- Old: "Whether a stock Ubuntu 25.10 or later makes sudo-rs the default `sudo` is unverified here."
- New: "Ubuntu 25.10 made sudo-rs the default `sudo` (Ubuntu announcement of 2025-09-02, with classic sudo kept as `sudo.ws`), and 26.04 ships sudo-rs 0.2.13, the version measured here, so the dropped `-E` is the default behaviour on those images."
- Source: discourse.ubuntu.com "sudo-rs is now default for Questing Quokka", and the packages.ubuntu.com resolute listing of sudo-rs 0.2.13-0ubuntu1. URLs: https://discourse.ubuntu.com/t/sudo-rs-is-now-default-for-questing-quokka/66497 , https://packages.ubuntu.com/search?keywords=sudo-rs&searchon=names&suite=resolute&section=all
- Verification: in `ubuntu:26.04` with sudo installed, `readlink -f /usr/bin/sudo` and `sudo --version` name sudo-rs.

### SH-NU-04 (nushell.md, list, scope and verification)

- Old: "`get -i` (warning from 0.106.1)" and "`random dice` (gone by 0.114.1). Use instead", scope "nu 0.100.0 to 0.116.1.", verification "(`name_is_keyword` on 0.116.1)".
- New: "`get -i` (warning from 0.106.1, an error from 0.117.0)", then "`random dice` (gone by 0.114.1), `filter` (removed in 0.117.0, use `where`), `type` as a command name (a parser keyword from 0.117.0). Use instead". The scope reads "nu 0.100.0 to 0.116.1, plus the three 0.117.0 entries." The verification appends "on 0.117.0 `nu-gate.nu --strict` exits 1 on `filter`, `get -i` and `def type` and 0 on the safe twin, measured 2026-11-27".
- Source: the nushell 0.117.0 release post (2026-11-09), and the `nu-gate.nu --strict` run on the 0.117.0 musl binary. URLs: https://www.nushell.sh/blog/2026-11-09-nushell_v0_117_0.html , https://github.com/nushell/nushell/releases/download/0.117.0/nu-0.117.0-x86_64-unknown-linux-musl.tar.gz
- Verification: as stated in the new text.

### SH-NU-11 (nushell.md, scope and verification)

- Old: "(0.105.1, 0.110.0 and 0.111.0 finish)" and "red on 0.112.1 and 0.116.1. Grep"
- New: "(0.105.1, 0.110.0, 0.111.0 and 0.117.0 finish)" and "red on 0.112.1 and 0.116.1, green on 0.117.0 (measured 2026-11-27). Grep"
- Source: `NU=<0.117.0> sh checks/nushell-hang.sh` exits 0. The 0.117.0 release post lists the `try` stderr-draining fix. URL: https://www.nushell.sh/blog/2026-11-09-nushell_v0_117_0.html
- Verification: `nushell-hang.sh` exits 0 on 0.117.0 and 1 on 0.116.1. Severity stays MUST.

### SH-EMIT-03 (emit.md, rationale)

- Old: "direnv 2.37.1, mise 2026.10.2 and ocx double only U+0027,"
- New: "direnv 2.37.1, mise 2026.10.2 and ocx double only U+0027 (mise doubles all five from v2026.10.19, 2026-10-24, and direnv master still doubles one on 2026-11-27),"
- Source: `src/shell/pwsh.rs` at mise tag v2026.10.19 (a `SINGLE_QUOTES` constant with the five characters, absent at v2026.10.18), the v2026.10.19 release notes, and direnv `internal/cmd/shell_pwsh.go` on master. URLs: https://raw.githubusercontent.com/jdx/mise/v2026.10.19/src/shell/pwsh.rs , https://github.com/jdx/mise/releases/tag/v2026.10.19 , https://raw.githubusercontent.com/direnv/direnv/master/internal/cmd/shell_pwsh.go
- Verification: `curl -sL https://raw.githubusercontent.com/jdx/mise/v2026.10.19/src/shell/pwsh.rs | grep -c SINGLE_QUOTES` is non-zero, and the same command on v2026.10.18 prints 0.

### SH-EMIT-05 (emit.md, scope tense)

- Old: "binds while 7.4 (end of support 2026-11-10)"
- New: "binds while 7.4 (out of support since 2026-11-10)"
- Source: Microsoft Learn, PowerShell Support Lifecycle. URLs: https://learn.microsoft.com/en-us/powershell/scripting/install/powershell-support-lifecycle , https://github.com/PowerShell/PowerShell/releases
- Verification: reading. The clause's trigger (a range that includes 7.4.7 or 5.1) is unchanged.

### Non-row text changed with the rows above

- rules/shell-quality.md, the **Dates** paragraph: add the 2026-11-27 re-check, correct nu to 0.116.1 with the 0.117.0 gate re-run, and replace the two expired end points.
- gates.md line 10 (runner tools now in present tense), and the parse-gate table row for nu (0.116.0 becomes 0.117.0, backed by the 0.117.0 gate run).
- checks/nu-gate.nu: the `# nu-range:` header and the "runs on" comment move to 0.117.0 (the gate ran clean on itself on 0.117.0).
- nushell.md header: names what was re-run on 0.117.0.
- dialect.md section C: the dash 0.5.13.x packaging sentence.
- userland.md header: the uutils versions in 26.04 at release and in 26.10.
- emit.md header: "reaches end of support" becomes "reached end of support".

## New rules

None. No delta artifact found a shift that the pair lacks a rule for and that a competent model would get wrong without one. The candidates were a `runs-on` rule (covered by SH-CI-15 as rewritten), a zizmor version pin (a measured-version statement, not a rule) and SH-NU-05 additions for names born in 0.117.0. The last one is deferred until the `nu-floor` cell is run, because SH-NU-05 lists names that were checked against the floor binary.

## Confirmed unchanged

- ShellCheck 0.11.0 is still the newest release. SC2337, the SC3040 relaxation and the SC3003 removal are still master-only, so SH-DIAL-02, SH-DIAL-08, SH-GATE-07 and SH-CI-16 hold. SH-DIAL-21 already names the `--detect` version (3.14.0). The `.shellcheckrc` keys are unchanged.
- shfmt 3.14.1 is still the newest release (3.15.0 is unreleased), so "3.13.0 or newer" holds.
- The dash triple of SH-CORE-04 and SH-CORE-03 holds: Debian 12 has 0.5.12-2, Ubuntu 24.04 has 0.5.12-6ubuntu5, and Debian 13 and Ubuntu 26.04 have 0.5.12-12 and -12ubuntu3. Debian testing's 0.5.12-13 changes translations and dependencies only.
- bash 5.3.20 (bash53-020, 2026-09-14) is still the newest patch level, and no 5.4 pre-release exists. Busybox in Alpine 3.22 to 3.24 is 1.37.0. yash 2.61, ksh93u+m 1.0.10 and mksh R59c are unchanged.
- zsh 5.9.2 is the newest tag and 5.10 is unreleased, so SH-ZSH-07 keeps its SHOULD half. fish 4.9.3 and elvish 0.21.0 are still the newest releases.
- Task 3.54.0 is the newest stable release, and SH-CI-17, 18, 20 and 25 to 27 and 32 hold. GitLab Runner 19.5 and 19.6 change no default errexit, pipefail or Windows-shell behaviour (the two concrete-path changes are behind feature flags), so SH-CI-28 to 30 and 33 hold.
- actionlint 1.7.12 is still the newest release. zizmor's persona and severity defaults show no change in the 1.31 to 1.33.1 notes. SH-CI-07, 08, 21 and 23 stand as measured on zizmor 1.30.1.
- bats-core 1.14.0, bats-support 0.3.0 and bats-assert 2.2.4 keep their pins.
- curl 8.23.0 has no retry or TLS-flag change, so SH-INST-16's measured range "7.61.1 to 8.22.0" stays true. cargo-dist 0.33.1 and 0.34.0 change no installer template, so the 0.33.0 checklist rows stand as measured.
- cargo 1.100.x has no token-handling change (SH-SEC-14). git 2.55 and 2.56 have no `http.extraHeader` or `GIT_CONFIG_COUNT` change (SH-SEC-13).
- clap_complete 4.6.11 fixed zsh escaping, not the PowerShell `escape_string` that SH-EMIT-41 measures. PSScriptAnalyzer 1.25.0 is unchanged.
- GNU coreutils 9.12 is still the newest release, so the "8.22 to 9.12" range holds.
- The fish 3.6.0 floor end point (2028-06-30) is unchanged.

## Open questions

1. zizmor 1.31.0 to 1.33.1 were released, and SH-CI-24 asks for the dotted-matrix plant to be re-run on each zizmor release. It was not re-run. Run `zizmor` on a fixture with `${{ matrix.item.name }}` from a `fromJSON(needs.*.outputs.*)` matrix. If it is now flagged, narrow SH-CI-24 to a Limits note.
2. The uutils re-diff is due: `ubuntu:26.10` carries 0.12.0 and upstream is 0.13.0. Replay u01 to u09 and the uninstalled-locale `sort` case before changing SH-USER-09 or switching the "informational until uutils 0.12" cell to required.
3. Which coreutils answers on the 26.04 runner? The README lists `coreutils 9.5-1ubuntu2+0.0.0~ubuntu25`, whose suffix matches the `coreutils-from-uutils` version. Probe `sort --version` in a job before SH-CI-15 states either way.
4. The runner READMEs do not list shfmt, so the gates.md figures 3.12.0 (26.04) and 3.8.0 (24.04) were not re-confirmed.
5. These were not re-run on nu 0.117.0: the `nu-floor` and `nu-denylist` cells, the SH-EMIT-46 `env_change.PWD` probe, and `where` with a closure on the 0.105.1 floor. Run `nu-floor` before adding the 0.117.0-born names (`record where`, `record each`, `find --only-matching`, `uniq --keep-last`, `join --anti`, `from dotenv`, `to dotenv`) to SH-NU-05.
6. pwsh 7.7.0 (2026-11-10) was not measured for the SH-EMIT-05 empty value or the SH-EMIT-07 date coercion.
7. mise's fish quoting fix in v2026.10.19 was not re-run against the earlier `a\\b` finding. direnv 2.38.x was read from source only, not run through `RT`.
8. The ubuntu-24.04 hosted-image retirement date was not researched, so SH-CI-15 has no end date.
9. busybox 1.38.0, posh 0.14.6 and mksh upstream were not read for option or behaviour changes.
10. If ShellCheck tags a release newer than 0.11.0, re-measure SH-DIAL-08, SH-GATE-07, SH-CI-16 and the shell-errexit rows together. When bats tags 1.14.1 or 1.15.0, re-run the `-j`, `bats_test_function` and junit census.
11. GitLab Runner `FF_ENABLE_BASH_EXIT_CODE_CHECK`: the combined-`script:` probe should record the flag state when it is run.

## Revision log

- rules/shell-quality.md Dates paragraph: re-check date added, nu range corrected to 0.116.1 plus the 0.117.0 gate re-run, expired end points replaced (pwsh 7.4 and 7.5 out of support, 7.6 LTS to 2028-11-14, `ubuntu-latest` is 26.04). Sources: https://learn.microsoft.com/en-us/powershell/scripting/install/powershell-support-lifecycle , https://github.com/PowerShell/PowerShell/releases , https://github.com/actions/runner-images/pull/15381 , https://www.nushell.sh/blog/2026-11-09-nushell_v0_117_0.html
- SH-CI-03: scope rewritten for the completed `ubuntu-latest` move, MUST kept.
- SH-CI-15: expiry removed, rewritten as a standing two-image SHOULD, runner README facts dated.
- gates.md line 10: runner tool versions in present tense.
- gates.md parse-gate nu row: 0.116.0 becomes 0.117.0.
- userland.md header: uutils 0.8.0 at the 26.04 release and 0.12.0 in 26.10 added. Sources: https://github.com/uutils/coreutils/releases/tag/0.12.0 , https://documentation.ubuntu.com/release-notes/26.04/summary-for-lts-users/ , https://packages.ubuntu.com/search?keywords=coreutils-from-uutils&searchon=names&suite=all&section=all
- SH-USER-09: the expired `ubuntu-latest` parenthetical removed.
- dialect.md section C: "no package does" replaced by the dash 0.5.13.x packaging facts.
- SH-DIAL-10: re-measured on dash 0.5.13.6 and 0.5.13.1.
- SH-SEC-06: "unverified here" replaced by Ubuntu's sudo-rs default.
- nushell.md header: the 0.117.0 re-run is named.
- SH-NU-04: `filter`, `type` and `get -i` added as 0.117.0 breaks, with the 0.117.0 gate measurement.
- SH-NU-11: 0.117.0 finishes.
- checks/nu-gate.nu: `nu-range` and the "runs on" comment moved to 0.117.0.
- emit.md header: pwsh 7.4 end of support in past tense. Source: https://learn.microsoft.com/en-us/powershell/scripting/install/powershell-support-lifecycle
- SH-EMIT-05: scope tense.
- SH-EMIT-03: mise fixed from v2026.10.19, direnv not.

## Edit list

Apply each entry with an exact string replacement. Every quoted find string is unique in its file (checked on 2026-11-27).

1. File: `rules/shell-quality.md`
   Find:
   ```
   **Dates.** Version claims in this rule set are dated 2026-10-11 and were measured on ShellCheck 0.11.0, shfmt 3.13.1, bash 3.2.57 to 5.3, dash 0.5.12, busybox 1.37, zsh 5.0.8 to 5.9, fish 3.6.0 to 4.9.3,
   nu 0.105.1 to 0.116.0 and elvish 0.21.0. macOS and BSD rows are unverified: read only. Dated end points: pwsh 7.4 ends support 2026-11-10, `ubuntu-latest` moves to 26.04 by 2026-11-19 (SH-CI-15), and the fish 3.6.0 floor holds until 2028-06-30.
   ```
   Replace with:
   ```
   **Dates.** Version claims in this rule set are dated 2026-10-11, re-checked against upstream releases on 2026-11-27, and were measured on ShellCheck 0.11.0, shfmt 3.13.1, bash 3.2.57 to 5.3, dash 0.5.12, busybox 1.37, zsh 5.0.8 to 5.9, fish 3.6.0 to 4.9.3,
   nu 0.105.1 to 0.116.1 (the nu gate and hang check also on 0.117.0) and elvish 0.21.0. macOS and BSD rows are unverified: read only. Dated end points: pwsh 7.4 and 7.5 left support on 2026-11-10 (7.6 LTS is supported until 2028-11-14), `ubuntu-latest` has been 26.04 since 2026-11-24 (SH-CI-15), and the fish 3.6.0 floor holds until 2028-06-30.
   ```

2. File: `skills/shell-quality-reference/ci.md`
   Find:
   ```
   Scope: `shell: sh`, until the `ubuntu-latest` move to 26.04 completes 2026-11-19.
   ```
   Replace with:
   ```
   Scope: `shell: sh` on every runner. `ubuntu-latest` (26.04 since 2026-11-24) accepts bare pipefail, while `ubuntu-24.04`, Debian 12 containers and posh do not.
   ```

3. File: `skills/shell-quality-reference/ci.md`
   Find:
   ```
   | SH-CI-15 | Until the `ubuntu-latest` move to 26.04 completes (rollout 2026-10-19 to 2026-11-19, rule expires 2026-11-19), make a shell-heavy job correct on ubuntu-24.04 and ubuntu-26.04: pin `ubuntu-24.04` or add a 26.04 leg, and detect features, never `--version \| grep GNU`. | 24.04 has bash 5.2.21, dash 0.5.12-6ubuntu5 (no pipefail) and ShellCheck 0.9.0, 26.04 has bash 5.3.9, dash 0.5.12-12ubuntu3 (pipefail) and ShellCheck 0.11.0. The plain `ubuntu:26.04` image ships uutils coreutils 0.10.0 (GNU not detected), whether the runner image does is unverified. Scope: `ubuntu-latest`, remove after the window and re-check the image READMEs. |
   ```
   Replace with:
   ```
   | SH-CI-15 | `ubuntu-latest` has been ubuntu-26.04 since 2026-11-24, and ubuntu-24.04 stays available by its explicit label. Make a shell-heavy job correct on the image it runs on: a job written against 24.04 either pins `ubuntu-24.04` or gets a 26.04 leg, and it detects features, never `--version \| grep GNU`. | 24.04 has bash 5.2.21, dash 0.5.12-6ubuntu5 (no pipefail) and ShellCheck 0.9.0, 26.04 has bash 5.3.9, dash 0.5.12-12ubuntu3 (pipefail) and ShellCheck 0.11.0 (image READMEs 20261116.376.1 and 20261116.202.1). Runner-images PR 15381 moved the label in the README on 2026-11-24, after the announced 2026-11-19 rollout end. The plain `ubuntu:26.04` image ships uutils coreutils 0.10.0 (GNU not detected). The runner README lists `coreutils 9.5-1ubuntu2+0.0.0~ubuntu25` and no uutils package, so which implementation answers on the runner is not probed. Scope: `ubuntu-latest` and `ubuntu-24.04` jobs, until ubuntu-24.04 leaves the hosted images. |
   ```

4. File: `skills/shell-quality-reference/gates.md`
   Find:
   ```
   Until 2026-11-19 `ubuntu-latest` may still resolve to 24.04 (ShellCheck 0.9.0, shfmt 3.8.0), then to 26.04 (0.11.0, 3.12.0).
   ```
   Replace with:
   ```
   `ubuntu-latest` has resolved to 26.04 (ShellCheck 0.11.0, shfmt 3.12.0) since 2026-11-24, and `ubuntu-24.04` keeps ShellCheck 0.9.0 and shfmt 3.8.0. The shfmt figures are from 2026-10-11, because the runner READMEs do not list shfmt.
   ```

5. File: `skills/shell-quality-reference/gates.md`
   Find:
   ```
   | nu 0.105.1 to 0.116.0 (also SH-NU-02) |
   ```
   Replace with:
   ```
   | nu 0.105.1 to 0.117.0 (also SH-NU-02) |
   ```

6. File: `skills/shell-quality-reference/userland.md`
   Find:
   ```
   and 26.04 default)
   ```
   Replace with:
   ```
   and 26.04 default; a 26.04 image without updates has 0.8.0 and 26.10 carries 0.12.0, read 2026-11-27)
   ```

7. File: `skills/shell-quality-reference/userland.md`
   Find:
   ```
   On Ubuntu 26.04 (`ubuntu-latest` moves there by 2026-11-19) `LANG=en_US.UTF-8` sorts `a A b B`.
   ```
   Replace with:
   ```
   On the `ubuntu:26.04` image `LANG=en_US.UTF-8` sorts `a A b B`.
   ```

8. File: `skills/shell-quality-reference/dialect.md`
   Find:
   ```
   Upstream dash 0.5.13.5 has `$'..'`, no package does.
   ```
   Replace with:
   ```
   Dash 0.5.13.x (upstream 0.5.13.6, 2026-11-11) has `$'..'` and accepts pipefail. The Ubuntu 26.10 archive ships 0.5.13.5 (the `ubuntu:26.10` image still had 0.5.12-12ubuntu3 on 2026-11-27) and Alpine offers 0.5.13.1 as an optional package, but Debian 13, Ubuntu 24.04 and 26.04 stay on 0.5.12, so the sh floor still lacks `$'..'`.
   ```

9. File: `skills/shell-quality-reference/dialect.md`
   Find:
   ```
   (upstream 0.5.13.5 too)
   ```
   Replace with:
   ```
   (upstream 0.5.13.6 and Alpine's 0.5.13.1 too, measured 2026-11-27)
   ```

10. File: `skills/shell-quality-reference/security.md`
    Find:
    ```
    Whether a stock Ubuntu 25.10 or later makes sudo-rs the default `sudo` is unverified here.
    ```
    Replace with:
    ```
    Ubuntu 25.10 made sudo-rs the default `sudo` (Ubuntu announcement of 2025-09-02, with classic sudo kept as `sudo.ws`), and 26.04 ships sudo-rs 0.2.13, the version measured here, so the dropped `-E` is the default behaviour on those images.
    ```

11. File: `skills/shell-quality-reference/nushell.md`
    Find:
    ```
    Windows facts are nu 0.116.1. macOS, BSD and nu 0.117 or
    later are `unverified: read only`. Re-run the gate on each new minor.
    ```
    Replace with:
    ```
    Windows facts are nu 0.116.1. On nu 0.117.0 (2026-11-09) only `nu-gate.nu --strict` and `nu-hang` were re-run, on 2026-11-27.
    macOS, BSD and every other row on nu 0.117 or later are `unverified: read only`. Re-run the gate on each new minor.
    ```

12. File: `skills/shell-quality-reference/nushell.md`
    Find:
    ```
    `get -i` (warning from 0.106.1)
    ```
    Replace with:
    ```
    `get -i` (warning from 0.106.1, an error from 0.117.0)
    ```

13. File: `skills/shell-quality-reference/nushell.md`
    Find:
    ```
    `random dice` (gone by 0.114.1). Use instead
    ```
    Replace with:
    ```
    `random dice` (gone by 0.114.1), `filter` (removed in 0.117.0, use `where`), `type` as a command name (a parser keyword from 0.117.0). Use instead
    ```

14. File: `skills/shell-quality-reference/nushell.md`
    Find:
    ```
    Scope: INST, EMIT, DEV, nu 0.100.0 to 0.116.1.
    ```
    Replace with:
    ```
    Scope: INST, EMIT, DEV, nu 0.100.0 to 0.116.1, plus the three 0.117.0 entries.
    ```

15. File: `skills/shell-quality-reference/nushell.md`
    Find:
    ```
    (`name_is_keyword` on 0.116.1)
    ```
    Replace with:
    ```
    (`name_is_keyword` on 0.116.1; on 0.117.0 `nu-gate.nu --strict` exits 1 on `filter`, `get -i` and `def type` and 0 on the safe twin, measured 2026-11-27)
    ```

16. File: `skills/shell-quality-reference/nushell.md`
    Find:
    ```
    (0.105.1, 0.110.0 and 0.111.0 finish)
    ```
    Replace with:
    ```
    (0.105.1, 0.110.0, 0.111.0 and 0.117.0 finish)
    ```

17. File: `skills/shell-quality-reference/nushell.md`
    Find:
    ```
    red on 0.112.1 and 0.116.1. Grep
    ```
    Replace with:
    ```
    red on 0.112.1 and 0.116.1, green on 0.117.0 (measured 2026-11-27). Grep
    ```

18. File: `skills/shell-quality-reference/checks/nu-gate.nu`
    Find:
    ```
    # nu-range: 0.100.0..0.116.1
    ```
    Replace with:
    ```
    # nu-range: 0.100.0..0.117.0
    ```

19. File: `skills/shell-quality-reference/checks/nu-gate.nu`
    Find:
    ```
    # Written in the safe intersection: it runs on nu 0.100.0 .. 0.116.1.
    ```
    Replace with:
    ```
    # Written in the safe intersection: it runs on nu 0.100.0 .. 0.117.0.
    ```

20. File: `skills/shell-quality-reference/emit.md`
    Find:
    ```
    (7.4 reaches end of support 2026-11-10)
    ```
    Replace with:
    ```
    (7.4 reached end of support 2026-11-10)
    ```

21. File: `skills/shell-quality-reference/emit.md`
    Find:
    ```
    binds while 7.4 (end of support 2026-11-10)
    ```
    Replace with:
    ```
    binds while 7.4 (out of support since 2026-11-10)
    ```

22. File: `skills/shell-quality-reference/emit.md`
    Find:
    ```
    direnv 2.37.1, mise 2026.10.2 and ocx double only U+0027,
    ```
    Replace with:
    ```
    direnv 2.37.1, mise 2026.10.2 and ocx double only U+0027 (mise doubles all five from v2026.10.19, 2026-10-24, and direnv master still doubles one on 2026-11-27),
    ```

After applying all edits, these checks must pass: `grep -rn '2026-11-19' rules/shell-quality.md skills/shell-quality-reference` prints only the SH-CI-15 rationale line; `grep -rn 'no package does' skills/shell-quality-reference` prints nothing; `grep -rn '0\.116\.0 and elvish' rules/shell-quality.md` prints nothing; `grep -rln -e '/home/mherwig' -e '.agents/research' rules/shell-quality.md skills/shell-quality-reference` prints nothing; and `wc -l rules/shell-quality.md` is still 200.

## Spillover round

Input: .agents/research/refresh-2026-11/shell-quality/spillover-check.md, one item from powershell-quality (ubuntu-latest now Ubuntu 26.04, hosted pwsh 7.6.10, SH-CI-11 and SH-CI-12 hold).

### Verdict

No edit. The primary sources confirm the `ubuntu-latest` half of the item, and the target already states it after the first round: the rule Dates paragraph, SH-CI-15 in ci.md and gates.md line 10 all say `ubuntu-latest` has been 26.04 since 2026-11-24, and SH-CI-15 already names PR 15381 and the 2026-11-19 rollout end. Every "pwsh 7.6.6" in the target (ci.md line 10, emit.md lines 9, 77 and 124) is a host measurement dated 2026-10-11, not a hosted-image claim, so the hosted pwsh 7.6.10 figure contradicts nothing. dialect.md line 37 pins `ubuntu-24.04` by its explicit label and testing.md's `runs-on: ubuntu-latest` makes no version claim. SH-CI-11 and SH-CI-12 stay as written.

### Changed rules

None.

### New rules

None.

### Declined

- Rewording "since 2026-11-24" to "labelled 26.04 in the runner-images README since 2026-11-24": the only evidence for jobs landing on 26.04 earlier (about 2026-11-15) is non-official commenters on runner-images issue 14748, a secondary source. The present statement is not contradicted, and SH-CI-15 already says the date is the README move.
- Hosted pwsh 7.6.10 on the 2026-11-16 images: not re-fetched in the spillover check, and the target makes no hosted-image pwsh claim to correct.

### Sources (spillover round)

| Claim | Source | Kind | Effect |
|---|---|---|---|
| `ubuntu-latest` maps to 26.04 | https://raw.githubusercontent.com/actions/runner-images/main/README.md | primary | confirms existing text, no edit |
| Label moved in the README on 2026-11-24 | https://github.com/actions/runner-images/pull/15381 | primary | confirms existing SH-CI-15 rationale, no edit |
| Rollout 2026-10-19 to 2026-11-19 | https://github.com/actions/runner-images/issues/14748 | primary (issue body), secondary (comments) | confirms existing text, earlier-date wording declined |

### Edit list (spillover round)

Empty. No file under rules/shell-quality.md or skills/shell-quality-reference/ changes in this round.
