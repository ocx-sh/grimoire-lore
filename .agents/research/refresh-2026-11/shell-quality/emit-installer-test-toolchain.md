---
title: Emit, installer, test and security toolchain delta, 2026-10-11 to 2026-11-27
pair: shell-quality
date_researched: 2026-11-27
window_start: 2026-10-11
model: sonnet
sources_fetched: 27
---

# Emit, installer, test and security toolchain delta

Scope: releases, changelogs and source of the third-party tools pinned by emit.md, installers.md, testing.md and security.md, checked for the window 2026-10-11 to 2026-11-27. This is a delta update, not a re-creation. Nothing was re-measured: every "unchanged" below means that the upstream record shows no change that touches the quoted claim, not that a probe was re-run. All GitHub reads used the public atom feeds, release pages and raw files, because the shared API quota was exhausted.

## Summary

1. bats-core: no release after 1.14.0 (2026-07-21). bats-support stays at 0.3.0 and bats-assert at 2.2.4. The pin does not move and no vacuous-form plant needs a re-run.
2. cargo-dist: PR 2497 is still open (last update 2026-09-05). Releases 0.33.1 (2026-10-21) and 0.34.0 (2026-11-01) exist; their notes list a dependency and certificate update and a macOS runner bump only. No installer-template fix, so checklist rows 1, 3, 4 and 5 are not shown fixed. The newest release is now 0.34.0, so the text "cargo-dist 0.33.0" is a measured-version statement, not "current". Issue 457 is still open.
3. curl: 8.23.0 shipped 2026-10-14 (in window). Its bugfix list has no change to `--retry` on a 404, to `--retry-all-errors` or to `--tlsv1.2`. The SH-INST-16 measurement was taken on 8.22.0, so its range label needs "8.23.0 not re-measured, changelog shows no retry change".
4. mise fixed the curly-quote injection in release v2026.10.19 (2026-10-24), PR 14898. direnv did not: master still doubles only the ASCII apostrophe. The emit.md evidence wording must say so.
5. ble.sh: no v0.4.0 final. Tags still end at Devel 0.4.0-devel3 (2024-08-05) and Patch 0.3.4. The nightly moved to 2026-10-31.
6. bash-preexec: no release in the window; newest is "Purple Boa" (2026-08-24), master still says V0.7.0.
7. cargo: Rust 1.100.0 (cargo 1.100, 2026-11-12) and 1.100.1 (2026-11-27) are out. Neither changes token handling. SH-SEC-14 stays correct; its measured range ends at 1.99.0.
8. clap_complete: only 4.6.12 (2026-11-16, no changelog entries) is in the window. 4.6.10 and 4.6.11 (2026-09-14 and 2026-09-15, a zsh escaping fix) predate the window but are newer than the pinned 4.6.9.
9. PSScriptAnalyzer: still 1.25.0 (2026-03-20). Unchanged.

## Findings

### 1. bats-core, bats-support, bats-assert (testing.md, rule line 188)

- bats-core releases feed ([releases.atom](https://github.com/bats-core/bats-core/releases.atom)) and tags feed ([tags.atom](https://github.com/bats-core/bats-core/tags.atom)): newest v1.14.0, 2026-07-21. Verdict: unchanged for SH-TEST-01, the `Bats 1.14.0` assertion in the CI example and rule line 188.
- bats-core [CHANGELOG on master](https://raw.githubusercontent.com/bats-core/bats-core/master/docs/CHANGELOG.md) has an Unreleased section; master was last updated 2026-11-23 ([commits feed](https://github.com/bats-core/bats-core/commits/master.atom)). Unreleased items that touch the testing claims:
  - "`--jobs` now aborts when GNU parallel is unavailable instead of failing later (#1237, #1238)". Unreleased. If the census under `-j` in shell-testing Open question 1 records a late failure, that is a future behaviour change, not a current one.
  - `$BATS_ALLOW_EMPTY_SUITE` added as a version-compatible alternative to `--allow-empty-suite`. Unreleased, and relevant only to SH-TEST-15's `--errexit` neighbours if the file mentions the empty-suite flag.
  - Duplicate-name detection for dynamic tests with argument prefixes, relevant to `bats_test_function` (Open question 1). Unreleased.
  Verdict: "could not determine" the effect on the census, because no release carries them. Do not change the pin; re-run the census only when 1.14.1 or 1.15.0 is tagged.
- bats-support ([tags.atom](https://github.com/bats-core/bats-support/tags.atom)): newest v0.3.0 (2022-03-04). Unchanged. bats-assert ([tags.atom](https://github.com/bats-core/bats-assert/tags.atom)): newest v2.2.4 (2025-10-14). Unchanged. Master commits exist (bats-assert 2026-10-18, bats-support 2026-10-29) without a tag; tag pins are unaffected.

### 2. cargo-dist (installers.md)

- Releases feed ([releases.atom](https://github.com/axodotdev/cargo-dist/releases.atom)): 0.33.0 (2026-09-10), 0.33.1 (2026-10-21), 0.34.0 (2026-11-01), plus prereleases.
- [CHANGELOG.md](https://raw.githubusercontent.com/axodotdev/cargo-dist/main/CHANGELOG.md): 0.33.1 "updates several dependencies" (the [release page](https://github.com/axodotdev/cargo-dist/releases/tag/v0.33.1) adds that certificate lists were refreshed so revoked certificates are no longer trusted). 0.34.0 upgrades the aarch64-apple-darwin runner (PR 2555). The Unreleased section lists only native Windows ARM64 on the github backend. No entry touches the shell installer's hash verification, download tooling, PATH handling or trap behaviour.
- PR 2497 "Verify archive checksums in PowerShell installers" ([page](https://github.com/axodotdev/cargo-dist/pull/2497)): state OPEN, last update 2026-09-05, not merged. It is also a PowerShell-installer change, so it would not affect the shell-installer checklist rows even if merged.
- Issue 457 "bump curl-sh exprs to tls 1.3?" ([page](https://github.com/axodotdev/cargo-dist/issues/457)): OPEN, last update 2024-04-30. Unchanged.
- Verdicts:
  - "cargo-dist 0.33.0" and the ten-row checklist (header line 8, line 114, SH-INST-20): "unchanged" as a measurement of 0.33.0; the rendered 0.33.1 and 0.34.0 installers were not re-rendered, so rows 1, 3, 4 and 5 are "could not determine" on those versions, with the changelog giving no reason to expect a change.
  - Open question 1 "adopt cargo-dist once PR 2497 ships": "unchanged", PR 2497 has not shipped. Rewording note: the PR is a PowerShell installer change; if the question is about the shell installer's missing-tool fail-open hash, PR 2497 is not the gate.
- The sentence "pin the generator version" in SH-INST-20 now has a second reason: the "current" version moved twice in 11 weeks.

### 3. curl (installers.md SH-INST-16, SH-INST-05)

- [curl.se/changes.html](https://curl.se/changes.html) and [releases](https://curl.se/docs/releases.html): 8.23.0 released 2026-10-14; 8.22.0 on 2026-09-02. No 8.24 yet.
- The 8.23.0 bugfix list was read in full. Retry-related items: "retry.md: clarify that the server can override retry delay time" (documentation), "tool_operate: clear the retry flag when the output file fails", "mdlinkcheck: pass `--retry-max-time`". None changes whether `--retry` retries a 404. No item changes `--retry-all-errors` (introduced in 7.71.0), `--retry-connrefused` or `--tlsv1.2`/`--help all`.
- Verdict: "On curl 8.22.0 a 404 is not retried by `--retry`" is "unchanged" and true as stated. The header range "curl 7.61.1 to 8.22.0" is accurate for what was measured; 8.23.0 was not run. The `--help all` probe rule is unaffected.

### 4. ble.sh and bash-preexec (emit.md header, SH-EMIT-24, 43, 44, open question)

- ble.sh [releases.atom](https://github.com/akinomyoga/ble.sh/releases.atom) and [tags.atom](https://github.com/akinomyoga/ble.sh/tags.atom): the only tags above 0.3.4 are Devel 0.4.0-devel3 (2024-08-05) and a rolling `nightly` tag, now "nightly 2026-10-31 08:31:54". No v0.4.0 final tag, no release other than those. Verdict: open question "whether a v0.4.0 final is tagged" is answered no as of 2026-11-27. The header's "nightly 0.4.0-nightly+d81fd54" is a build that is no longer the newest nightly; the `blehook` and `BLE_VERSION` rules were not re-measured on the new nightly, so "could not determine" for nightly behaviour, "unchanged" for the tagged releases v0.3.4 and 0.4.0-devel3.
- bash-preexec [releases.atom](https://github.com/rcaloras/bash-preexec/releases.atom): newest "Purple Boa" (2026-08-24, before the window); [bash-preexec.sh on master](https://raw.githubusercontent.com/rcaloras/bash-preexec/master/bash-preexec.sh) still reads `V0.7.0` and still uses `bash_preexec_imported`. Verdict: unchanged for SH-EMIT-44. If the baseline pinned "0.7.0" without naming the "Purple Boa" release, that is a pre-window gap, not a window change.

### 5. direnv and mise curly-quote injection (shell-emit open question 1, emit.md SH-EMIT-03 and SH-EMIT-41 evidence)

- direnv: releases v2.38.1 (2026-10-06) and v2.38.2 (2026-10-10) both predate the window but follow the tested 2.37.1 ([releases.atom](https://github.com/direnv/direnv/releases.atom)). Their notes list "fix(pwsh): quote the direnv.exe path" and "fix: escape the direnv path in bash code", which are about the executable path, not about exported values. [shell_pwsh.go on master](https://raw.githubusercontent.com/direnv/direnv/master/internal/cmd/shell_pwsh.go): `PowerShellEscapeVerbatimString` still escapes only the byte `SINGLE_QUOTE` by doubling; the file contains no U+2018, U+2019, U+201A or U+201B handling. The newest master commit is 2026-10-12. No advisory is published (the [security advisories page](https://github.com/direnv/direnv/security/advisories) lists none). Verdict: not fixed. Wording "direnv 2.37.1 ... double only the ASCII apostrophe" is "unchanged" for 2.37.1 and, from source, also true on master and 2.38.2.
- mise: [pwsh.rs at v2026.10.19](https://raw.githubusercontent.com/jdx/mise/v2026.10.19/src/shell/pwsh.rs) defines `SINGLE_QUOTES` as the ASCII apostrophe plus U+2018, U+2019, U+201A and U+201B and doubles each; the same file at v2026.10.2 through v2026.10.18 has no such constant (checked tag by tag). The [v2026.10.19 release](https://github.com/jdx/mise/releases/tag/v2026.10.19) (published 2026-10-24) states "Quoting for fish and PowerShell is also fixed" (#14898). Changed:
  - Old text: "ocx, direnv 2.37.1 and mise 2026.10.2 double only the ASCII apostrophe, and a project-controlled value then executes" (shell-emit.md, Open question 1 and the matching emit.md evidence).
  - New fact: mise doubles all five characters from v2026.10.19; direnv through master still doubles one.
  - Date of the upstream change: 2026-10-24 (release v2026.10.19).
  - The fix also touched fish quoting, which relates to the shell-audit finding "mise 2026.10.2 fish `a\\b` arrives as `a\b`"; that finding was not re-run on a newer mise, so it is "could not determine" whether it is fixed.
- Also in v2026.10.19: completers now shell-quote typed words and run only for trusted config. This does not affect an emitter rule.

### 6. cargo token handling (security.md SH-SEC-14)

- [Rust RELEASES.md](https://raw.githubusercontent.com/rust-lang/rust/master/RELEASES.md): 1.100.0 (2026-11-12) Cargo section lists the stable `[lints.cargo]` table, minimum publish age (dependency cooldowns, `registry.global-min-publish-age`), `cargo install` using the `.crate` lockfile by default, and a new build-directory layout. 1.100.1 (2026-11-27) is a library backport only.
- [Cargo book changelog](https://doc.rust-lang.org/nightly/cargo/CHANGELOG.html): the Cargo 1.100 section has no entry on `--token`, `CARGO_REGISTRY_TOKEN`, `CARGO_REGISTRIES_<NAME>_TOKEN`, `cargo login` or credential providers. The `--token` soft-deprecation entry is older (it sits far below the 1.100 section).
- Verdict: "unchanged". The measured range "cargo 1.93.1 to 1.99.0" is accurate; 1.100.0 was not run. A next cargo refresh can state "1.100.0 changelog lists no token change".
- Side note for SH-SEC-14 readers: the new dependency-cooldown setting is a supply-chain control that no current row mentions; it is not a token claim and is not recommended for the pair here.

### 7. clap_complete and PSScriptAnalyzer (emit.md header)

- [clap_complete CHANGELOG](https://raw.githubusercontent.com/clap-rs/clap/master/clap_complete/CHANGELOG.md) and [crates.io versions](https://crates.io/crates/clap_complete): 4.6.8 (2026-07-27), 4.6.9 (2026-08-06, "bash: make function names posix compatible"), 4.6.10 (2026-09-14), 4.6.11 (2026-09-15, "aot/zsh: fix escaping of possible values without a help message"), 4.6.12 (2026-11-16, no entries). Only 4.6.12 is in the window. The pair measured 4.6.8 and 4.6.9. Verdict: the pin text is "unchanged" for what was measured; the zsh escaping fix in 4.6.11 is not in the pair's measured range and is relevant to SH-EMIT-41 (help text escaping in completions), so the claim "clap_complete 4.6.8 and 4.6.9" should not be read as current.
- PSScriptAnalyzer [releases](https://github.com/PowerShell/PSScriptAnalyzer/releases.atom): 1.25.0 (2026-03-20) is newest. Unchanged.

## Decisions

1. Bats pin: does not move. No new bats version; no plant re-run required. Re-run the vacuous-form plants and the census when a release newer than 1.14.0 is tagged.
2. cargo-dist: PR 2497 not merged; no release after 0.33.0 fixes rows 1, 3, 4 or 5 on the changelog evidence. Rows stay as measured on 0.33.0; add that 0.33.1 and 0.34.0 were not re-rendered.
3. direnv/mise: mise fixed it (v2026.10.19, 2026-10-24); direnv did not. Evidence wording changes.
4. ble.sh: v0.4.0 not tagged.
5. cargo: no token-handling change through 1.100.1.

Unchanged tools: bats-core, bats-support, bats-assert, bash-preexec, PSScriptAnalyzer, curl retry and TLS flag behaviour, cargo token forms, ble.sh tagged releases.

## Normative guidance candidates

1. Rule: in the Open question and evidence wording, state "direnv through 2.38.2 and master doubles only U+0027; mise doubles all five from v2026.10.19 (2026-10-24)". Rationale: the current wording would tell a reader mise is still vulnerable. Verification: `grep -n "mise 2026.10.2" skills/shell-quality-reference/emit.md .agents/research/shell-emit.md` finds each place to edit; confirm the fix with `curl -sL https://raw.githubusercontent.com/jdx/mise/v2026.10.19/src/shell/pwsh.rs | grep -c SINGLE_QUOTES` (4) against `v2026.10.18` (0).
2. Rule: word the cargo-dist claim as "checklist measured on cargo-dist 0.33.0; 0.33.1 and 0.34.0 changelogs list no installer change; re-render before relying on it". Rationale: "0.33.0" reads as current today. Verification: `grep -n "cargo-dist 0.33.0" skills/shell-quality-reference/installers.md rules/shell-quality.md`; named heuristic: a version in a header names what was measured, and a newer release is named beside it.
3. Rule: reword shell-installer Open question 1 so the gate is not "PR 2497 ships" if the target is the shell installer's fail-open hash. Rationale: PR 2497 is a PowerShell change. Verification: `gh pr view 2497 -R axodotdev/cargo-dist --json title,state` shows the PowerShell title.
4. Rule: extend the curl range to "7.61.1 to 8.22.0 measured; 8.23.0 changelog shows no retry or TLS-flag change". Rationale: 8.23.0 is the current release. Verification: `curl -sL https://curl.se/changes.html | grep -n "Fixed in 8.23.0"` then read the list for "retry".
5. Rule: when the next bats release lands, re-run the `bats_test_function`, `-j` and `--formatter junit` census, because unreleased master changes `--jobs` failure timing and duplicate-name detection. Rationale: those would change census rows. Verification: read `docs/CHANGELOG.md` between 1.14.0 and the new tag for `--jobs`, duplicate and formatter entries.
6. Rule: note "clap_complete 4.6.11 fixed zsh escaping of possible values without help; 4.6.8 and 4.6.9 predate it" next to SH-EMIT-41. Rationale: the pinned versions lack a fix the rule's topic depends on. Verification: `curl -sL https://raw.githubusercontent.com/clap-rs/clap/master/clap_complete/CHANGELOG.md | grep -n -A3 "4.6.11"`.

## AI-agent angle

- An agent trained before this window recites "cargo-dist 0.33.0", "mise 2026.10.2 is vulnerable" and "ble.sh 0.4.0 is released" as current. Smallest check: the version-and-date lines above, verified by the three greps in the candidates.
- An agent will assume PR 2497 fixes the shell installer. Check: the PR title says PowerShell.
- An agent may treat `BATS_ALLOW_EMPTY_SUITE` or `--` as available in 1.14.0. They are unreleased. Check: `bats --version` is 1.14.0 and `docs/CHANGELOG.md` places them under Unreleased.

## Contested / evolving

- cargo-dist is shipping roughly monthly (0.33.0 on 2026-09-10, 0.33.1 on 2026-10-21, 0.34.0 on 2026-11-01); the pinned-version text will age fast.
- bats-core master carries a long unreleased list; a 1.15.0 or 1.14.1 is plausible soon, and then the census must be re-run.
- ble.sh 0.4.0 has been in devel since 2020; no final is announced. The rolling nightly is the only moving build.
- Rust 1.101 is dated 2026-12-24 in the Cargo book changelog; a token change there is outside this window.

## Sources

| URL | What | Date/era | Why worth reading |
|---|---|---|---|
| https://github.com/bats-core/bats-core/releases.atom | bats-core releases | newest 2026-07-21 | pin check |
| https://github.com/bats-core/bats-core/tags.atom | bats-core tags | same | confirms no newer tag |
| https://raw.githubusercontent.com/bats-core/bats-core/master/docs/CHANGELOG.md | bats-core changelog | master 2026-11-23 | unreleased items |
| https://github.com/bats-core/bats-core/commits/master.atom | bats-core commits | 2026-11-23 | master activity |
| https://github.com/bats-core/bats-support/tags.atom | bats-support tags | v0.3.0 2022 | pin check |
| https://github.com/bats-core/bats-assert/tags.atom | bats-assert tags | v2.2.4 2025-10-14 | pin check |
| https://github.com/axodotdev/cargo-dist/releases.atom | cargo-dist releases | 0.33.0 to 0.34.0 | version list |
| https://raw.githubusercontent.com/axodotdev/cargo-dist/main/CHANGELOG.md | cargo-dist changelog | 2026-11 | what each release changed |
| https://github.com/axodotdev/cargo-dist/releases/tag/v0.33.1 | 0.33.1 release page | 2026-10-21 | certificate update note |
| https://github.com/axodotdev/cargo-dist/pull/2497 | PR 2497 | open, 2026-09-05 | merge state |
| https://github.com/axodotdev/cargo-dist/issues/457 | issue 457 | open, 2024-04-30 | TLS 1.3 state |
| https://curl.se/changes.html | curl changelog | 8.23.0 2026-10-14 | retry and TLS items |
| https://curl.se/docs/releases.html | curl release list | 2026-11 | newest version |
| https://github.com/akinomyoga/ble.sh/tags.atom | ble.sh tags | nightly 2026-10-31 | no v0.4.0 |
| https://github.com/akinomyoga/ble.sh/releases.atom | ble.sh releases | same | no v0.4.0 |
| https://github.com/rcaloras/bash-preexec/releases.atom | bash-preexec releases | 2026-08-24 | newest release |
| https://raw.githubusercontent.com/rcaloras/bash-preexec/master/bash-preexec.sh | bash-preexec source | V0.7.0 | version marker |
| https://github.com/direnv/direnv/releases.atom | direnv releases | 2.38.2 2026-10-10 | notes |
| https://raw.githubusercontent.com/direnv/direnv/master/internal/cmd/shell_pwsh.go | direnv pwsh escaper | master 2026-10-12 | still ASCII only |
| https://github.com/direnv/direnv/security/advisories | direnv advisories | 2026-11-27 | none listed |
| https://raw.githubusercontent.com/jdx/mise/v2026.10.19/src/shell/pwsh.rs | mise pwsh quoter | 2026-10-24 | the fix |
| https://github.com/jdx/mise/releases/tag/v2026.10.19 | mise release notes | 2026-10-24 | fix statement |
| https://raw.githubusercontent.com/rust-lang/rust/master/RELEASES.md | Rust release notes | 1.100.1 2026-11-27 | cargo section |
| https://doc.rust-lang.org/nightly/cargo/CHANGELOG.html | Cargo changelog | 1.100 2026-11-12 | token search |
| https://raw.githubusercontent.com/clap-rs/clap/master/clap_complete/CHANGELOG.md | clap_complete changelog | 4.6.12 | versions |
| https://crates.io/crates/clap_complete | clap_complete versions | 2026-11-16 | dates |
| https://github.com/PowerShell/PSScriptAnalyzer/releases.atom | PSScriptAnalyzer releases | 1.25.0 2026-03-20 | pin check |
