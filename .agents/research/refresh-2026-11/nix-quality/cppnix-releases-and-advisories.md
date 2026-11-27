---
title: CppNix releases and advisories, delta 2026-09-27 to 2026-11-27
pair: nix-quality
date_researched: 2026-11-27
window_start: 2026-09-27
model: sonnet
sources_fetched: 16
---

# CppNix releases and advisories, delta update

This is a delta over the 2026-09-27 baseline (CppNix 2.35.2). Only what moved in the window is reported. Claims not listed below are untouched by this research.

## Summary

- Latest stable CppNix is 2.36.0. The manual release notes date it 2026-11-16; the signed git tag and GitHub release page show 2026-11-19 (tag commit `8890719`, 2026-11-19T01:26:06+03:00). Use the tag date.
- The 2.35 line received patches 2.35.3 (2026-10-13, security), 2.35.4 (2026-10-22), 2.35.5 (2026-11-08) and 2.35.6 (2026-11-10 per the release page, tag commit `4c9c249`). Latest 2.35.x is 2.35.6. No 2.37 line exists. No 2.36.x patch exists yet (tags end at 2.36.0).
- Five advisories were published 2026-10-13, all fixed in 2.35.3, 2.34.9, 2.31.6, 2.30.6 and 2.28.8. The CVE-2026-39860 floors (2.31.4 and 2.35.2) are now below the current floors.
- GHSA-jm6c-h95p-6qhj is still unbackported. The advisory states the fix will not be backported to any stable version; it lists affected versions as below 2.35 and the fix as landed on master via PR 16256.
- 2.36.0 keeps every quoted flake-check error string, `--update-input` as a warn-only alias, `nix profile install` as a deprecated alias of `add`, and `allow-import-from-derivation` defaulting to true.
- RFC 136 has no flake stabilisation milestone in the window.

## Findings

### 1. Releases

The 2.36 manual page is titled Nix 2.36.0 and says "2026-11-16" ([release notes](https://nix.dev/manual/nix/latest/release-notes/rl-2.36)). The tag page ([2.36.0](https://github.com/NixOS/nix/releases/tag/2.36.0)) shows 19 November, and `git log -1 2.36.0` on a clone gives 2026-11-19. The two dates disagree; the manual date is probably the release-notes freeze. Tag list from `git ls-remote --tags https://github.com/NixOS/nix`: 2.35.0 to 2.35.6, 2.36.0, nothing higher. Tag dates read from the release pages: [2.35.3](https://github.com/NixOS/nix/releases/tag/2.35.3) 2026-10-13 14:31 UTC, [2.35.4](https://github.com/NixOS/nix/releases/tag/2.35.4) 2026-10-22, [2.35.5](https://github.com/NixOS/nix/releases/tag/2.35.5) 2026-11-08, [2.35.6](https://github.com/NixOS/nix/releases/tag/2.35.6) 10 November 2026 (year inferred from the page footer).

Commit logs between tags (read-only git on a bare clone): 2.35.4 is dependency and local-overlay-store fixes. 2.35.5 fixes `nix profile` upgrading unchanged Git flakes, lazy-attr comparison, and scripted-installer idempotency. 2.35.6 further hardens the scripted installer and fixes `builtins.readDir builtins.storeDir`. None adds a security advisory.

2.36.0 release-note items relevant to the pair: removed `impersonate-linux-26` setting; `nix develop` no longer disables ASLR; the shipped installer is multi-user only; the derivation ATerm parser is stricter; `builtins.addErrorContext` can no longer catch `abort`; `builtins.pathExists` no longer swallows access errors; `daemon-trust-override` is stabilised; `nix version --json` added; Mercurial path-like flake refs resolve to `hg+file:`; `nix run`, `nix search` and `nix bundle` auto-call functions given via `--file` or `--expr`. The page has no security section and does not mention `--update-input`, `lint-url-literals`, `allow-import-from-derivation` or `nix profile`.

### 2. Advisories published 2026-10-13

Source: [advisory list](https://github.com/NixOS/nix/security/advisories) and each GHSA page. All five: patched in 2.35.3, 2.34.9, 2.31.6, 2.30.6, 2.28.8.

| GHSA | Severity | Subject | Affects |
|---|---|---|---|
| [GHSA-jwvx-xq5j-gc56](https://github.com/NixOS/nix/security/advisories/GHSA-jwvx-xq5j-gc56) (CVE-2026-110450 as printed on the page) | High, CVSS 8.4 | Untrusted daemon clients overwrite store objects via repair mode; local root escalation | above 2.1, below the patched versions |
| [GHSA-m4vq-qf6v-82pj](https://github.com/NixOS/nix/security/advisories/GHSA-m4vq-qf6v-82pj) | Moderate | macOS seatbelt sandbox policy chunking bug exposes the host filesystem (sandbox is opt-in on macOS) | below 2.35.3 |
| [GHSA-hf6w-2rg9-v84g](https://github.com/NixOS/nix/security/advisories/GHSA-hf6w-2rg9-v84g) | Moderate | Multi-user scripted installer leaves store contents owned by the invoking user | 2.4 to below the patched versions |
| [GHSA-92x5-h528-wrmw](https://github.com/NixOS/nix/security/advisories/GHSA-92x5-h528-wrmw) | Low | BSD LOCAL_PEERCRED ignores gid, so build-users-group is not rejected | below 2.35.3 |
| [GHSA-25vp-6h23-hj3g](https://github.com/NixOS/nix/security/advisories/GHSA-25vp-6h23-hj3g) | Moderate | `builtins.genList` size overflow, out-of-bounds read or write | below 2.35.3 |

The CVE ids of the other four were not read; do not cite any CVE for them.

Note: the baseline floor 2.35.2 is now vulnerable to all five. The scripted-installer advisory means installs made with an older `install` script keep root-unsafe store ownership until Nix is updated and garbage collected.

### 3. GHSA-jm6c-h95p-6qhj (baseline NIX-SEC-09)

[Advisory page](https://github.com/NixOS/nix/security/advisories/GHSA-jm6c-h95p-6qhj), published 2026-08-05: no CVE, affected below 2.35, no patched version listed, fix on master via PR 16256, "will not be backported to any stable versions". Workaround is to leave `ca-derivations` disabled. The baseline text "no backported fix" remains true; "as of 2026-09-27" can become 2026-11-27.

### 4. Source reads at tag 2.36.0

Shallow clone of tag 2.36.0, read at `/tmp/nixsrc/n236` during research.

- `src/nix/flake.cc`: `flake attribute '%s' is not a derivation` (line 420), `app '%s' has unsupported attribute '%s'` (472, allowed names are `type`, `program`, `meta`), `overlay does not take an argument named 'final'` (488). The overlay check is `v.lambda().fun->getFormals() || !argHasName(arg, "final")`, so only the first argument is checked. Unchanged.
- `src/libcmd/installables.cc:116`: `'--update-input' is a deprecated alias for 'flake update' and will be removed in a future version.` Still present.
- `src/nix/profile.cc:1016`: `{"install", {AliasStatus::Deprecated, {"add"}}}`. Unchanged.
- `src/libexpr/include/nix/expr/eval-settings.hh`: `allow-import-from-derivation` default `true`; `lint-url-literals` setting exists (the old experimental feature is reported as stabilised and renamed). Unchanged.
- Not re-measured: "skips substitutable checks from 2.32" and NIX-LANG-05 "all four shapes silently". A source grep did not target them.

### 5. Issues and RFC

- [NixOS/nix#14339](https://github.com/NixOS/nix/issues/14339): open, last activity 2026-04-07, no linked PR. Unchanged.
- [NixOS/nix#9649](https://github.com/NixOS/nix/issues/9649): open, last activity 2026-07-15. Unchanged.
- [NixOS/nix#6752](https://github.com/NixOS/nix/issues/6752): closed 2022-12-02 as a duplicate of #6672. The baseline calls it a reference but its closed state is older than the window; check the security.md wording says closed-as-duplicate. Not changed in the window.
- [RFC 136](https://github.com/NixOS/rfcs/pull/136): accepted 2023; the only 2026 activity is a Discourse cross-reference on 2026-11-20. The [Tweag update 60](https://discourse.nixos.org/t/tweag-nix-dev-update-60/) says the team is "investigating practical approaches to flake stabilisation along the lines of RFC 136", no milestone. Tracking issue NixOS/nix#7701 is open. Flakes remain experimental.

### 6. URLs

`https://nix.dev/manual/nix/2.35/` and `/2.36/` both return HTTP 200, and `/latest/` redirects to `/2.36/`. The pair cites `2.35/command-ref/conf-file`, `2.35/language/string-context` and `2.35/language/types`; only the version-root URLs were fetched, not these three exact paths. `releases.nixos.org/nix/nix-2.35.2/install`, `nix-2.35.6/install` and `nix-2.36.0/install` all return 200.

## Per-claim table

| Claim | Status | Detail |
|---|---|---|
| "Measured 2026-09-27 on CppNix 2.35.2" (stamp, all files) | changed | Latest stable is 2.36.0 (tag 2026-11-19); latest 2.35 patch is 2.35.6. Stamp is stale for any claim that is re-measured; see decisions. |
| NIX-GATE-13 `install_url` 2.35.2 | changed | 2.35.2 is below every security floor from 2026-10-13. Move to `nix-2.35.6` (same line, 200 OK) or `nix-2.36.0`. |
| security.md cve-floor.nix "Lines above 2.35 postdate the fix" | changed | The 2.36 line now exists. Add per-line floors: 2.35 is 2.35.3 and 2.36 starts at 2.36.0 which carries the fixes (tag cut after 2.35.3). State the 2.36 claim only after reading the tag; it was cut from master which held the commits. |
| NIX-SEC-06 floors; "2.35.0 and 2.35.1 stay below the floor" | changed | New floors 2.28.8, 2.30.6, 2.31.6, 2.34.9, 2.35.3 for the October advisories. The CVE-2026-39860 floors are subsumed (all are higher) for lines 2.28, 2.30, 2.31, 2.34 and 2.35. Lines 2.29, 2.32 and 2.33 received no October fix and are end-of-life. |
| NIX-GATE-16 "above the CVE-2026-39860 patch (2.31.4)" and NIX-REL-12 `nixVersions.nix_2_31` = 2.31.5 | changed | The 2.31 floor is now 2.31.6. The nixpkgs attribute value was not checked; compute from the locked nixpkgs. |
| NIX-SEC-09 "no backported fix as of 2026-09-27" | unchanged | Still no backport; fix on master only. Date stamp may move. |
| gates.md "≥2.32 skips substitutable checks" | could not determine | Not re-read in source. No release-note item in 2.35 or 2.36 touches it. |
| gates.md "≥2.34 floor of native `lint-url-literals`" | unchanged | Setting still present in 2.36.0 source. |
| "`allow-import-from-derivation` defaults to true on 2.35.2" | unchanged | Still true on 2.36.0. |
| NIX-INP-07 `--update-input` | unchanged | Still a warn-only deprecated alias at 2.36.0; "will be removed in a future version". |
| NIX-REL-09 `add`, warns on `install` | unchanged | Alias status Deprecated still present at 2.36.0. |
| NIX-FLK-01 to 03 quoted errors and "never checks the second argument" | unchanged | All three strings verbatim in 2.36.0 `src/nix/flake.cc`. |
| NIX-LANG-05 "through 2.35.2 accepts all four shapes silently" | could not determine | Not re-measured on 2.35.3 to 2.36.0. 2.36.0 parser changes cover ATerm and Git trees only. Re-measure. |
| NIX-INP-08 `NixOS/nix#14339`, open | unchanged | Open, no linked PR. |
| security.md #9649, #6752 | unchanged | #9649 open; #6752 closed as duplicate of #6672 in 2022. |
| NIX-REL-12 "Flakes are experimental (RFC 136)" | unchanged | No stabilisation milestone. |
| nix.dev 2.35 manual URLs | unchanged | Roots resolve; `latest` now points to 2.36. Cite 2.36 on re-measurement; the three deep paths were not individually fetched. |

## Normative guidance candidates

1. Move NIX-GATE-13 `install_url` to `https://releases.nixos.org/nix/nix-2.35.6/install` (or 2.36.0). Rationale: 2.35.2 is vulnerable to the five October advisories. Verify: `curl -sI <url>` returns 200 and `grep install_url gates.md`.
2. Rewrite NIX-SEC-06 floor list: 2.28.8, 2.30.6, 2.31.6, 2.34.9, 2.35.3, and 2.36.0 or later. Rationale: October advisories. Verify: `nix --version` on CI and builders against the list; reviewer greps `install_url`.
3. Add a fix-table row for the scripted installer: any host installed with a pre-2.35.3 multi-user script should update Nix and garbage-collect, then check `stat` of store contents is root-owned. Rationale: GHSA-hf6w-2rg9-v84g. Verify: `find /nix/store -maxdepth 1 ! -user root | head`.
4. Add a fix-table row: macOS sandbox users and untrusted `allowed-users` clients are exposed below the floor (GHSA-m4vq-qf6v-82pj, GHSA-jwvx-xq5j-gc56). Verify: same version check as 2.
5. Keep NIX-SEC-09 text; update date stamp. Verify: re-open the advisory and confirm no patched version.
6. Update the cve-floor.nix table and its "lines above 2.35" prose to name the 2.36 line.

## AI-agent angle

- An agent copying `install_url` from the old pin installs 2.35.2, which now carries a High advisory. Check: grep the pin against the floor list.
- An agent may state a 2.36 error string from memory. None of the three contract strings changed; do not rewrite them.
- An agent may claim `--update-input` is removed. It is not at 2.36.0; it warns.

## Contested / evolving

- Release date of 2.36.0 is 2026-11-16 in the manual and 2026-11-19 on the tag; prefer the tag.
- Flake stabilisation: Tweag says it is investigating (2026-11). Trend: no committed milestone.
- `--update-input` will be removed in a future version; watch each release.

## Decisions requested

- Move the `install_url` pin: yes, to 2.35.6 (same line, minimal behaviour change) or 2.36.0 if the owner wants the newest line. 2.36.0 changes behaviour (auto-called `--file` functions, `pathExists` errors, stricter ATerm parser, multi-user-only installer), so re-measure first if moving.
- Move the "Measured on" stamps: only for claims actually re-measured. Re-measure the substitutable-check claim, NIX-LANG-05 and the flake contract errors on 2.36.0 before restamping; the three contract errors are source-verified and can be restamped 2026-11-27 on 2.36.0.
- Re-measurements needed on a 2.36.0 install: NIX-LANG-05 (four shapes accepted silently), `>=2.32` substitutable-checks claim, any `nix run` or `nix search` example using `--file`, `builtins.pathExists` on inaccessible paths.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://nix.dev/manual/nix/latest/release-notes/ | release notes index | 2026-11 | latest version |
| https://nix.dev/manual/nix/latest/release-notes/rl-2.36 | 2.36 notes | 2026-11-16 | breaking changes |
| https://nix.dev/manual/nix/latest/release-notes/rl-2.35 | 2.35 notes | 2026-06-22 | baseline line |
| https://github.com/NixOS/nix/releases/tag/2.36.0 | tag | 2026-11-19 | date |
| https://github.com/NixOS/nix/releases/tag/2.35.3 | tag | 2026-10-13 | security patch |
| https://github.com/NixOS/nix/releases/tag/2.35.4 | tag | 2026-10-22 | patch |
| https://github.com/NixOS/nix/releases/tag/2.35.5 | tag | 2026-11-08 | patch |
| https://github.com/NixOS/nix/releases/tag/2.35.6 | tag | 2026-11-10 | patch |
| https://github.com/NixOS/nix/security/advisories | advisory list | 2026-10-13 | all advisories |
| https://github.com/NixOS/nix/security/advisories/GHSA-jwvx-xq5j-gc56 | advisory | 2026-10-13 | High |
| https://github.com/NixOS/nix/security/advisories/GHSA-jm6c-h95p-6qhj | advisory | 2026-08-05 | no backport |
| https://github.com/NixOS/nix/issues/14339 | issue | 2026-04-07 | follows drift |
| https://github.com/NixOS/nix/issues/9649 | issue | 2026-07-15 | accept-flake-config |
| https://github.com/NixOS/nix/issues/6752 | issue | 2022-12-02 | closed duplicate |
| https://github.com/NixOS/rfcs/pull/136 | RFC | 2023, 2026-11-20 xref | flakes status |
| https://discourse.nixos.org/t/tweag-nix-dev-update-60/ | Discourse | 2026-11 | flake stabilisation |
| https://github.com/NixOS/nix (tag 2.36.0 source clone, bare clone for logs) | source | 2026-11-19 | error strings, aliases |
