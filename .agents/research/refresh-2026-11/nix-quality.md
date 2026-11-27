---
title: nix-quality delta refresh, 2026-09-27 to 2026-11-27
pair: nix-quality
date: 2026-11-27
window_start: 2026-09-27
model: opus
consolidates:
  - .agents/research/refresh-2026-11/nix-quality/cppnix-releases-and-advisories.md
  - .agents/research/refresh-2026-11/nix-quality/lix-releases.md
  - .agents/research/refresh-2026-11/nix-quality/nixpkgs-branch-lifecycle.md
  - .agents/research/refresh-2026-11/nix-quality/nixpkgs-packaging-apis.md
  - .agents/research/refresh-2026-11/nix-quality/nix-tooling-and-flake-libraries.md
  - .agents/research/refresh-2026-11/nix-quality/determinate-systems-tooling.md
  - .agents/research/refresh-2026-11/nix-quality/github-actions-and-registry.md
  - .agents/research/refresh-2026-11/nix-quality/recent-shifts.md
revises:
  - .agents/research/nix-security.md
  - .agents/research/nix-gates.md
  - .agents/research/nix-flakes.md
  - .agents/research/nix-release.md
  - .agents/research/nix-packaging.md
  - .agents/research/nix-inputs.md
  - .agents/research/nix-language.md
---

# nix-quality delta refresh

## Verdict

- Move the NIX-SEC-06 security floor. Five CppNix advisories published on 2026-10-13 (GHSA-jwvx-xq5j-gc56, high, and four more) are patched in 2.28.8, 2.30.6, 2.31.6, 2.34.9 and 2.35.3. Each is later than its line's CVE-2026-39860 fix, so the `cve-floor.nix` table keeps one version per line and takes the October values. The 2.29, 2.32 and 2.33 lines got no October fix, so they leave the table and fail through its fallback. The baseline install pin 2.35.2 and floor 2.31.5 are both below the new floors.
- Move the NIX-GATE-13 example `install_url` from `nix-2.35.2` to `nix-2.35.6`, the newest patch on the same line (URL returns 200). Do not move it to 2.36.0, because 2.36.0 changes CLI behaviour the pair has not re-measured. Keep the v31.11.1 action example and add the bump history as evidence for the rule's rationale.
- Replace the literal floor `nix_2_31` with `nix_2_34` in every command and "today" clause. On nixos-unstable `2786a2a72088` and `release-26.11`, nixpkgs turned `nix_2_31` into a stub that throws `has been removed. use nix_2_34.`, so the old floor-leg command now fails outright. The computed-floor rule itself stays as written, and this move is fresh evidence for it.
- Leave the "Measured 2026-09-27 on CppNix 2.35.2 … floor `nix_2_31` = 2.31.5" stamps alone. They record what was measured on that date, and nothing was re-measured. Clauses that state a present-tense floor are scoped to `8d5d2709` or moved to the new value instead.
- Replace the retired `macos-14` runner label in NIX-GATE-15 with `macos-26` (GitHub retired macOS 14 on 2026-11-02).
- Correct NIX-FLK-08's facts. flake-utils has had CI and lock commits since 2024-11-13, the latest on 2026-11-11. `nix-systems/default` `main` dropped `x86_64-darwin` on 2026-10-05. The ban stays: both are system lists the flake does not own, and this one moved under every consumer at a lock bump.
- Tighten NIX-REL-05: `nix-community/flake-compat` has been archived since 2025-10-28.
- Scope NIX-PKG-09 and NIX-PKG-10 for the Python builders. nixpkgs 26.11 makes structured attributes their default, and nixpkgs master `ba375ac` (2026-11-24) warns `is redundant` when `__structuredAttrs = true` or `strictDeps = true` is set explicitly.
- Record the nixpkgs-vet ratchets added in the window. A list `meta.license` is rejected in a new top-level package since 2026-11-03 (NIX-PKG-08's right example, and the nixpkgs copy of NIX-REL-14). `dontCargoUseSystemLibs` is banned since 2026-11-22 (a new What Agents Get Wrong entry, and a floor note on NIX-PKG-17 because `cargoSetupHook` now links aws-lc from nixpkgs).
- Refresh dated facts that a primary source re-read: NIX-SEC-09's no-backport status, the macOS sandbox default (GHSA-m4vq-qf6v-82pj calls it opt-in), Lix 2.96's flake-validation change, the nix-update 1.17.0 rewrite, and the nixpkgs `rustc` version.
- Add no new rule ID. These candidates lack a watched red and green pair, or fall outside the pair, so each goes to open questions: literal `inputs` under Lix 2.96, the `darwin.linux-builder` key leak, a `nixos-26.11` clause for flake-checker, `useFetchCargoVendor` cleanup, and the `unittestFlagsArray`, `allowBrokenPredicate` and `passAsFile` deprecations.
- Do not move the stable `nixos-26.05` default or the module recipe's `system.stateVersion` to 26.11. `nixos-26.11` does not exist as a channel until the planned 2026-11-30 release.
- Bump the rule by patch, because only facts changed there (a command placeholder and a floor value). Bump the reference skill by minor, because NIX-SEC-06 now fails versions it passed before, and NIX-PKG-09 and NIX-PKG-10 gain a Python-builder exception.

## Changed rules

### NIX-SEC-06 (security.md, with its `cve-floor.nix` block and its prose)

- Old text (rule): "Run CI and every self-hosted builder on CppNix at or above the CVE-2026-39860 fix for its release line: 2.28.6, 2.29.3, 2.30.4, 2.31.4, 2.32.7, 2.33.4 or 2.34.5, and 2.35.2 or later on the 2.35 line."
- New text (rule): "Run CI and every self-hosted builder on CppNix at or above its release line's fix in the `cve-floor.nix` table: 2.28.8, 2.30.6, 2.31.6, 2.34.9 or 2.35.3, or 2.36.0 or later. The 2.29, 2.32 and 2.33 lines received no fix for the 2026-10-13 advisories and always fail."
- Rationale gains the 2026-10-13 advisories and drops the "2.35.0 and 2.35.1 stay below the floor" sentence, because the 2.35.3 floor already excludes both.
- Verification: the same two commands. The 2026-09-27 watched results are kept and labelled with the old table. The new values are pure table data under unchanged logic, and no Nix was available to re-watch them, so the cell names the exact red and green versions to watch before relying on the table: `2.35.2`, `2.31.5` and `2.33.4` throw, and `2.35.3`, `2.34.9` and `2.36.0` print `true`.
- Floor cell: Lix (2.94.3, 2.95.4, 2.96) and Determinate Nix (3.23.2) published their own fixes on 2026-10-13. The cell no longer says their advisories are "unmeasured" and instead says this table does not cover them.
- Source: GitHub advisory pages GHSA-jwvx-xq5j-gc56, GHSA-m4vq-qf6v-82pj, GHSA-hf6w-2rg9-v84g, GHSA-92x5-h528-wrmw and GHSA-25vp-6h23-hj3g (all 2026-10-13, patched in 2.35.3, 2.34.9, 2.31.6, 2.30.6 and 2.28.8; three give the affected range as "below 2.35.3", which leaves 2.36.0 outside it). Also the Lix security post of 2026-10-13 and the Determinate Nix v3.23.2 release page.

### NIX-SEC-09 (security.md)

- Old text: "no backported fix as of 2026-09-27, re-check at each Nix security advisory", and floor cell "advisory status 2026-09-27".
- New text: "no backported fix as of 2026-11-27, re-checked after the 2026-10-13 advisories, re-check at each Nix security advisory", and "advisory status 2026-11-27".
- Verification: unchanged (the NIX-SEC-09 grep).
- Source: GHSA-jm6c-h95p-6qhj, which still lists no patched version and says the fix "will not be backported to any stable versions".

### NIX-GATE-13 (gates.md)

- Old text: "`install_url: https://releases.nixos.org/nix/nix-2.35.2/install`", "(v31.11.1 hardcodes 2.35.2)", and "The installed Nix carries the CVE-2026-39860 fix for its line (NIX-SEC-06)".
- New text: "`install_url: https://releases.nixos.org/nix/nix-2.35.6/install`", "(v31.11.1 hardcodes 2.35.2, and five releases between 2026-10-14 and 2026-11-20 moved the hardcoded Nix to 2.36.0)", and "The installed Nix carries every fix NIX-SEC-06's table names for its line, which 2.35.2 no longer does".
- Verification: unchanged (the installer check and the `install_url:` presence grep). The URL itself returns HTTP 200.
- Source: cachix/install-nix-action releases.atom (v31.11.2 2026-10-14 through v32.0.0 2026-11-20, each with its Nix bump line), releases.nixos.org `nix-2.35.6/install` (200), and the 2.35.3 advisories above.

### NIX-GATE-15 (gates.md)

- Old text: "(`macos-15` or `macos-14`)" and "GitHub-hosted runner labels, 2026-09 (re-check when a label is retired)".
- New text: "(`macos-15` or `macos-26`)" and "GitHub-hosted runner labels, 2026-11 (`macos-14` retired 2026-11-02, re-check when a label is retired)".
- Verification: unchanged (the reading heuristic over runner OSes).
- Source: actions/runner-images README ("All macOS 14 images retired from GitHub Actions on November 2, 2026") and issue 15226.

### NIX-GATE-16 (gates.md, the floor-leg command in the rule's gate block, and the pinned-defaults row)

- Old text: "`nix_2_24` and `nix_2_30` throw `has been removed. use nix_2_31`", "Floor today `nix_2_31` = 2.31.5, above the CVE-2026-39860 patch (2.31.4)", and the commands `nixpkgs#nixVersions.nix_2_31` with "`nix_2_31` replaced by that element".
- New text: on nixos-unstable `2786a2a72088` and `release-26.11`, "`nix_2_24` to `nix_2_33` throw `has been removed. use nix_2_34`", and the floor there is "`nix_2_34` = 2.34.9, the 2.34 fix in NIX-SEC-06's table". The commands name `nix_2_34`.
- Verification: the floor expression is unchanged. The cell adds what the 2026-11-27 source read predicts (first element `nix_2_34`) and labels it as read from source, not run.
- Source: `pkgs/tools/package-management/nix/default.nix` on nixpkgs master, `release-26.11` and `release-26.05`, read 2026-11-27.

### NIX-FLK-19 (flakes.md command)

- Old text: "`nixpkgs#nixVersions.nix_2_31` … `nix_2_31` replaced by gate step 9 floor element".
- New text: the same command with `nix_2_34` in both places. The rule's own ≥2.31.5 contract floor is a measured fact about output-contract strings and stays.
- Verification: unchanged. Source: as NIX-GATE-16.

### NIX-FLK-08 (flakes.md)

- Old text: "and never use `nix-systems/default` unless it is overridden to a list without `x86_64-darwin`" in the rule, and in the rationale "flake-utils and `nix-systems/default` still carry `x86_64-darwin` … flake-utils has had no commit since 2024-11-13".
- New text: the rule says "never use `nix-systems/default`, whose list moves with each lock bump, unless it is overridden to a literal list without `x86_64-darwin`". The rationale says both lists carried `x86_64-darwin` when watched on 2026-09-27, that `main` dropped it on 2026-10-05 (`d36eeed`), and that flake-utils has had only CI and lock-maintenance commits since 2024-11-13 (latest 2026-11-11).
- Verification: unchanged (gate step 5 and the FLK-08 grep). The watched red is dated 2026-09-27.
- Source: nix-systems/default raw `default.nix` on `main` and `future-26.11`, PR 3 (merged 2026-10-05). Also the flake-utils commits atom and PRs 127 and 128.

### NIX-REL-05 (release.md)

- Old text: "`nix-community/flake-compat` (self-declared unmaintained, checked 2026-09-27)".
- New text: "`nix-community/flake-compat` (archived on 2025-10-28, checked 2026-11-27)".
- Verification: unchanged (the flake-compat grep). Source: the nix-community/flake-compat repository banner and README.

### NIX-REL-12 (release.md)

- Old text: "(today `nixVersions.nix_2_31` = 2.31.5)" and "(`nix_2_24` already has)".
- New text: "(on nixos-unstable, 2026-11-27: `nixVersions.nix_2_34` = 2.34.9)" and "(`nix_2_24` to `nix_2_33` already have, `nix_2_31` between 2026-09-27 and 2026-11-27)".
- Verification: unchanged (the reading heuristic). Source: as NIX-GATE-16.

### NIX-REL-14 (release.md)

- Old text: "The nixpkgs copy changes exactly `version` (a literal), `src` (`fetchFromGitHub` with `tag` per NIX-REL-13) and the dependency hash," and in the verification "any change beyond the three attributes and `updateScript` is the finding".
- New text: the copy also changes a list `meta.license`, which nixpkgs-vet rejects in a new top-level package since 2026-11-03 (NIX-PKG-08). The verification allows that change.
- Source: nixpkgs-vet README ("New top-level packages must not use a list for `meta.license`") and commit "Ensure meta.license is not a list (#316)", 2026-11-03.

### NIX-PKG-08 (packaging.md)

- The rule text is unchanged. The flake's own `package.nix` still writes a list. The rationale gains: "Since 2026-11-03 nixpkgs-vet rejects a list `meta.license` in a new top-level package (nixpkgs-vet PR 316), so a nixpkgs copy changes it (NIX-REL-14)."
- Verification: unchanged (the `abort-on-warn` license line). Source: as NIX-REL-14.

### NIX-PKG-09 and NIX-PKG-10 (packaging.md)

- Old text (PKG-09): "and set `strictDeps = true` from the first commit." Old text (PKG-10): "Set `__structuredAttrs = true`."
- New text: both rules exempt `buildPythonPackage` and `buildPythonApplication`. On nixpkgs 26.11 these default structured attributes, and on a nixpkgs master revision from 2026-11-24 (`ba375ac`) they also default `strictDeps` and warn `is redundant` when either is set to `true` explicitly.
- Verification: the reading heuristics exempt the Python builders. NIX-PKG-10 adds an explicit `true` inside those builders as a reading-heuristic finding, labelled as read from source and not watched. The `env` evaluation check is unchanged.
- Source: rl-2611 release notes ("`buildPythonPackage` and `buildPythonApplication` now set `__structuredAttrs = true` by default"), and nixpkgs master `mk-python-derivation.nix` with commit `ba375ac` (2026-11-24).

### NIX-PKG-17 (packaging.md, floor cell only)

- Old text: "x86_64-linux, aws-lc-sys 0.43 built and 0.45.0's builder read (re-check at each aws-lc-sys minor)".
- New text: the same, plus "nixpkgs 26.11's `cargoSetupHook` links aws-lc from nixpkgs, so re-measure there".
- Verification: unchanged (reading heuristic over the first build failure). Source: rl-2611 release notes (`cargoSetupHook` forces aws-lc, openssl, libz, libsqlite3, zstd, libgit2 and others to the nixpkgs copy, and `dontCargoUseSystemLibs = true` opts out).

## New rules

None. No candidate in the window has a watched red and green pair, and adding one without that pair would break NIX-CORE-02. Each candidate is listed under open questions. The `dontCargoUseSystemLibs` guidance goes into packaging.md's What Agents Get Wrong list as item 16, citing NIX-PKG-17 and NIX-PKG-06. It adds no new ID.

## Confirmed unchanged

- nixpkgs 26.11 and unstable still throw `Nixpkgs 26.11 has dropped support for x86_64-darwin.`, and 26.05 reaches end of life on 2026-12-31 (NIX-FLK-09, index preamble, gates triage table).
- The three CppNix output-contract error strings, the overlay first-argument-only check, `--update-input` as a warn-only alias, `nix profile install` as a deprecated alias of `add`, `allow-import-from-derivation` defaulting to true, and the `lint-url-literals` setting were all read in the CppNix 2.36.0 source (NIX-FLK-01 to 03, NIX-INP-07, NIX-REL-09, NIX-SEC-05, NIX-GATE-06).
- NixOS/nix#14339 and #9649 are still open. RFC 136 has no flake stabilisation milestone (NIX-INP-08, NIX-SEC-02, NIX-REL-12).
- Lix: `flake-self-attrs` is still an experimental feature, nixpkgs `lix` still resolves to 2.95, and the mixed-`rec` rejection still holds (NIX-GATE-16, NIX-INP-09, NIX-LANG-05). NIX-FLK-19's leniency set stays true for the 2.95 that gate step 8 runs.
- flake-checker 0.2.15 is still the latest release, and its ref data still accepts exactly the refs NIX-INP-06 lists. Its flags, CEL variables and crash strings are unchanged (NIX-INP-06, NIX-GATE-11).
- update-flake-lock, nix-installer-action, magic-nix-cache-action and determinate-nix-action released nothing that changes NIX-INP-11, NIX-GATE-13 or NIX-GATE-14. cache-nix-action v7 is still current.
- nixfmt 1.5.0, treefmt 2.6.0, deadnix 1.3.2, nurl 0.4.1 and nixf-diagnose 0.1.4 have no release in the window. The `nixfmt-rfc-style` warnAlias, the `nixfmt-classic` throw, the deadnix flags, statix W12 and W17, and the nixfmt directory warning are unchanged (NIX-GATE-01 to 07).
- `versionCheckHook`, bare `--replace` (nixpkgs#356002 open), the `pkgs.system` warnAlias, `lib/fileset` and the `gitTrackedWith` comment, the by-name outside-files rule, `cargoSha256` absence, `fetchCargoVendor`, the Python `format` error, `getLicenseFromSpdxIdOr` and check-meta's `any (l: !l.free or false)` (restored by the 2026-11-05 revert) are unchanged. So are `autoPatchelfHook`, the `makeWrapper` flags, `warnOnInstantiate`, `mkRenamedOptionModule`, `pathWith`, `mkPackageOption`, `pkgs.formats` and `readOnlyPkgs` (NIX-PKG, NIX-GEN, NIX-REL-10, NIX-MOD).
- flake-parts has no code change after `31729ca8`, crane's `cleanCargoSource` exists, and home-manager defines `homeModules` (NIX-FLK-10, NIX-MOD-08, NIX-PKG-15, NIX-MOD-02).
- On ghcr.io, a header-less blob GET still returns 401, `Bearer QQ==` returns 307, and a manifest GET without `Accept` returns a bare 404 (NIX-GEN-05, 08, 10).
- A PR opened with the default `GITHUB_TOKEN` still triggers no CI (NIX-INP-11). NIX-GATE-12's SHA-pin rule is unchanged.
- NIX-GEN-16's watched green on `peter-evans/create-pull-request@v7` is a dated record, and its grep matches any version. v8 (current v8.1.3) predates the window, so the record stays.
- NIX-INP-05's `.tar.xz` end date (after 2027-12-31) is still the rl-2611 text.

## Open questions

- Watch the new `cve-floor.nix` table go red on `2.35.2`, `2.31.5` and `2.33.4` and green on `2.35.3`, `2.34.9` and `2.36.0`, and confirm from the 2.36.0 tag that it carries the 2026-10-13 fixes. No Nix was available for this refresh.
- Lix 2.96 allows `let` and other non-call syntax outside `outputs`. Measure a `let` in `inputs` on CppNix 2.35.3 and on Lix 2.96. If CppNix rejects it, propose a NIX-FLK rule for literal `inputs`.
- Re-measure NIX-FLK-19's Lix leniency set and NIX-LANG-05 on `nixpkgs#lix_2_96` before nixpkgs makes 2.96 the default `lix`. Check that the nixpkgs `lix` patch is at least 2.95.4.
- After `nixos-26.11` appears on channels.nixos.org (planned 2026-11-30): move the stable default (inputs.md) and the module recipe's `system.stateVersion` (modules.md) to 26.11, re-probe the 26.11 floor element, and decide whether NIX-INP-06 needs a clause for flake-checker rejecting `nixos-26.11` until a release lists it.
- Re-measure on a 2026-11 nixpkgs revision: the NIX-PKG-10 `is redundant` warning (watched red and green), the NIX-PKG-22 red message after `importCargoLock`'s 2026-10-26 edit, `sha256 =` still building (NIX-PKG-01), the bare `--replace` exit code (NIX-PKG-12), and NIX-PKG-17's pkg-config-only aws-lc-sys build under the new `cargoSetupHook`.
- Find the single-value `meta.license` form nixpkgs expects for a dual-licensed package now that nixpkgs-vet rejects a list. NIX-PKG-08's right example and NIX-REL-14's copy need it.
- Re-run NIX-REL-13's literal-ref cases and NIX-REL-17's fake-hash case on nix-update 1.17.0, which edits string literals through a syntax tree, prefers `tag` and skips unchanged versions.
- CppNix 2.36.0 behaviours (`pathExists` surfacing access errors, auto-called `--file` functions, the multi-user-only installer) were not measured. Decide whether to move NIX-GATE-13's pin to 2.36.x after its first patch release.
- `darwin.linux-builder` leaked its SSH key into the store (GHSA-45qr-47fw-2p57, GHSA-w5j5-2jpq-3cv3, 2026-11-06). The pair does not cover the builder. Decide whether NIX-SEC should.
- The macOS sandbox default on CppNix has not been measured, and the 2026-11-27 text cites the advisory's "opt-in" wording only.
- ghcr.io's correct-`Accept` manifest path returned 403 on `astral-sh/uv` and was not probed on the NIX-GEN-08 target package.
- Candidates declined for now: a `useFetchCargoVendor` cleanup rule (the option was deleted on master on 2026-10-23, and leftovers are dead configuration), and What Agents Get Wrong entries for `unittestFlagsArray`, `allowBrokenPredicate` and `passAsFile`, which no pair rule touches.

## Revision log

- NIX-SEC-06 and `cve-floor.nix`: floors 2.28.8, 2.30.6, 2.31.6, 2.34.9 and 2.35.3. The 2.29, 2.32 and 2.33 lines are removed, and the 2026-10-13 advisories are cited.
- security.md prose: the installer example becomes 2.35.6, and the finding text says "security fix".
- security.md Dates: the macOS sandbox is opt-in per GHSA-m4vq-qf6v-82pj.
- NIX-SEC-09: no-backport status re-dated to 2026-11-27.
- NIX-GATE-13: `install_url` becomes 2.35.6, with the action's Nix bump history added.
- gates.md Dates: latest install-nix-action named, runner labels re-dated, and the Lix 2.96 validation change noted.
- NIX-GATE-15: `macos-14` becomes `macos-26`.
- NIX-GATE-16 and the rule's gate step 9: floor `nix_2_34` = 2.34.9, and the throw text becomes `use nix_2_34`.
- Rule pinned-defaults row: the floor value becomes `nix_2_34` = 2.34.9.
- NIX-FLK-19 command: `nix_2_34`.
- NIX-FLK-08: flake-utils activity and the `nix-systems/default` list corrected.
- NIX-REL-05: archived on 2025-10-28.
- NIX-REL-12: the floor value and the stub list.
- NIX-REL-14: the copy may change a list license.
- release.md Dates: floor history and the nix-update 1.17.0 note.
- inputs.md Dates: the floor value.
- language.md Dates: the consumer floor is dated.
- packaging.md Dates: `rustc` 1.99.1 on unstable.
- NIX-PKG-08: nixpkgs-vet list-license ratchet.
- NIX-PKG-09 and NIX-PKG-10: Python-builder exception.
- NIX-PKG-17: `cargoSetupHook` floor note.
- packaging.md What Agents Get Wrong: item 16, `dontCargoUseSystemLibs`.

## Edit list

1. File: `rules/nix-quality.md`
   Find (verbatim):
   ```
   nix shell --inputs-from . nixpkgs#nixVersions.nix_2_31 --command nix flake check --no-build   # 9 NIX-GATE-16 floor leg, nix_2_31 replaced by that element
   ```
   Replace with:
   ```
   nix shell --inputs-from . nixpkgs#nixVersions.nix_2_34 --command nix flake check --no-build   # 9 NIX-GATE-16 floor leg, nix_2_34 replaced by that element
   ```

2. File: `rules/nix-quality.md`
   Find (verbatim):
   ```
   computed floor (today `nix_2_31` = 2.31.5), never a hardcoded version.
   ```
   Replace with:
   ```
   computed floor (on nixos-unstable, 2026-11-27: `nix_2_34` = 2.34.9), never a hardcoded version.
   ```

3. File: `skills/nix-quality-reference/gates.md`
   Find (verbatim):
   ```
   Lix froze flake support and is moving it into a plugin (2.95 release notes, re-check at each Lix release).
   ```
   Replace with:
   ```
   Lix 2.95's release notes announced a flake freeze and a move into a plugin, yet Lix 2.96 (2026-10-13) changed flake validation to "no function calls outside `outputs`", so a `let` outside `outputs` evaluates on 2.96 and fails on older Lix (CppNix unmeasured). nixpkgs unstable's `lix` still resolves to 2.95, so gate step 8 runs 2.95 (read 2026-11-27, re-check at each Lix release).
   ```

4. File: `skills/nix-quality-reference/gates.md`
   Find (verbatim):
   ```
   - **Actions**: `cachix/install-nix-action` v31.11.1 (2026-08-13) and `nix-community/cache-nix-action` v7 (2026-01-08). GitHub-hosted runner labels as of 2026-09.
   ```
   Replace with:
   ```
   - **Actions**: `cachix/install-nix-action` v31.11.1 (2026-08-13; latest v32.1.0, 2026-11-23) and `nix-community/cache-nix-action` v7 (2026-01-08). GitHub-hosted runner labels as of 2026-11.
   ```

5. File: `skills/nix-quality-reference/gates.md`
   Find (verbatim):
   ```
   pin the Nix version with `install_url: https://releases.nixos.org/nix/nix-2.35.2/install` (substitute your version).
   ```
   Replace with:
   ```
   pin the Nix version with `install_url: https://releases.nixos.org/nix/nix-2.35.6/install` (substitute your version).
   ```

6. File: `skills/nix-quality-reference/gates.md`
   Find (verbatim):
   ```
   The action SHA fixes Nix only implicitly (v31.11.1 hardcodes 2.35.2), so the next action bump silently changes Nix.
   ```
   Replace with:
   ```
   The action SHA fixes Nix only implicitly (v31.11.1 hardcodes 2.35.2, and five releases between 2026-10-14 and 2026-11-20 moved the hardcoded Nix to 2.36.0), so the next action bump silently changes Nix.
   ```

7. File: `skills/nix-quality-reference/gates.md`
   Find (verbatim):
   ```
   The installed Nix carries the CVE-2026-39860 fix for its line (NIX-SEC-06) |
   ```
   Replace with:
   ```
   The installed Nix carries every fix NIX-SEC-06's table names for its line, which 2.35.2 no longer does |
   ```

8. File: `skills/nix-quality-reference/gates.md`
   Find (verbatim):
   ```
   one Apple-silicon macOS runner (`macos-15` or `macos-14`) when the flake declares `aarch64-darwin`.
   ```
   Replace with:
   ```
   one Apple-silicon macOS runner (`macos-15` or `macos-26`) when the flake declares `aarch64-darwin`.
   ```

9. File: `skills/nix-quality-reference/gates.md`
   Find (verbatim):
   ```
   | GitHub-hosted runner labels, 2026-09 (re-check when a label is retired) |
   ```
   Replace with:
   ```
   | GitHub-hosted runner labels, 2026-11 (`macos-14` retired 2026-11-02, re-check when a label is retired) |
   ```

10. File: `skills/nix-quality-reference/gates.md`
    Find (verbatim):
    ```
    nix shell --inputs-from . nixpkgs#nixVersions.nix_2_31 --command nix flake check --no-build
    ```
    Replace with:
    ```
    nix shell --inputs-from . nixpkgs#nixVersions.nix_2_34 --command nix flake check --no-build
    ```

11. File: `skills/nix-quality-reference/gates.md`
    Find (verbatim):
    ```
    The third is the floor leg, with `nix_2_31` replaced by that first element.
    ```
    Replace with:
    ```
    The third is the floor leg, with `nix_2_34` replaced by that first element.
    ```

12. File: `skills/nix-quality-reference/gates.md`
    Find (verbatim):
    ```
    nixpkgs prunes old Nix versions: `nix_2_24` and `nix_2_30` throw `has been removed. use nix_2_31`.
    ```
    Replace with:
    ```
    nixpkgs prunes old Nix versions: on nixos-unstable `2786a2a72088` and `release-26.11`, `nix_2_24` to `nix_2_33` throw `has been removed. use nix_2_34` (source read 2026-11-27), and `nix_2_31`, the floor on 2026-09-27, is among them.
    ```

13. File: `skills/nix-quality-reference/gates.md`
    Find (verbatim):
    ```
    The floor expression prints `["nix_2_31","nix_2_34","nix_2_35"]` on `8d5d2709`, and a remembered `nix_2_24` exits 1 naming the floor.
    ```
    Replace with:
    ```
    The floor expression prints `["nix_2_31","nix_2_34","nix_2_35"]` on `8d5d2709`, and a remembered `nix_2_24` exits 1 naming the floor. On `2786a2a72088` the source defines only `nix_2_34` (2.34.9), `nix_2_35` (2.35.6) and `nix_2_36` (2.36.0), so its first element is `nix_2_34` (read from source 2026-11-27, not run).
    ```

14. File: `skills/nix-quality-reference/gates.md`
    Find (verbatim):
    ```
    | Floor today `nix_2_31` = 2.31.5, above the CVE-2026-39860 patch (2.31.4). Lix 2.95.2 (re-check at each Lix release) |
    ```
    Replace with:
    ```
    | Floor on nixos-unstable `2786a2a72088`: `nix_2_34` = 2.34.9, the 2.34 fix in NIX-SEC-06's table (2026-11-27). It was `nix_2_31` = 2.31.5 on `8d5d2709`. Lix 2.95.2 (re-check at each Lix release) |
    ```

15. File: `skills/nix-quality-reference/flakes.md`
    Find (verbatim):
    ```
    nix shell --inputs-from . nixpkgs#nixVersions.nix_2_31 --command nix flake check --no-build --option allow-import-from-derivation false .   # FLK-19 on a Lix host, exit 0 = pass, nix_2_31 replaced by gate step 9 floor element
    ```
    Replace with:
    ```
    nix shell --inputs-from . nixpkgs#nixVersions.nix_2_34 --command nix flake check --no-build --option allow-import-from-derivation false .   # FLK-19 on a Lix host, exit 0 = pass, nix_2_34 replaced by gate step 9 floor element
    ```

16. File: `skills/nix-quality-reference/flakes.md`
    Find (verbatim):
    ```
    and never use `nix-systems/default` unless it is overridden to a list without `x86_64-darwin`.
    ```
    Replace with:
    ```
    and never use `nix-systems/default`, whose list moves with each lock bump, unless it is overridden to a literal list without `x86_64-darwin`.
    ```

17. File: `skills/nix-quality-reference/flakes.md`
    Find (verbatim):
    ```
    | flake-utils and `nix-systems/default` still carry `x86_64-darwin`, and `flakeExposed` adds `x86_64-freebsd`, `armv6l-linux` and more, so the flake exports systems nobody tests. flake-utils has had no commit since 2024-11-13. |
    ```
    Replace with:
    ```
    | The flake does not own these lists. flake-utils and `nix-systems/default` carried `x86_64-darwin` when watched on 2026-09-27. `nix-systems/default` `main` dropped it on 2026-10-05 (`d36eeed`), so only a lock pinned before then still carries it, and flake-utils moved its locked `systems` input to that revision on 2026-11-11. `flakeExposed` adds `x86_64-freebsd`, `armv6l-linux` and more, so the flake exports systems nobody tests. flake-utils has had only CI and lock-maintenance commits since 2024-11-13 (latest 2026-11-11). |
    ```

18. File: `skills/nix-quality-reference/flakes.md`
    Find (verbatim):
    ```
    Watched red: `eachDefaultSystem` and a `nix-systems` input exit 1 with `Nixpkgs 26.11 has dropped support for x86_64-darwin.`
    ```
    Replace with:
    ```
    Watched red (2026-09-27, before `nix-systems/default` `main` dropped it): `eachDefaultSystem` and a `nix-systems` input exit 1 with `Nixpkgs 26.11 has dropped support for x86_64-darwin.`
    ```

19. File: `skills/nix-quality-reference/release.md`
    Find (verbatim):
    ```
    - **CppNix 2.35.2** is the gated implementation. **2.31.5** is today's computed consumer floor (`nixVersions.nix_2_31`, NIX-GATE-16), never hardcoded (re-check when nixpkgs turns `nix_2_31` into a throwing stub).
    ```
    Replace with:
    ```
    - **CppNix 2.35.2** is the gated implementation. **2.31.5** was the computed consumer floor on `8d5d2709` (`nixVersions.nix_2_31`, NIX-GATE-16). nixpkgs turned `nix_2_31` into a throwing stub on unstable and `release-26.11`, where the floor is `nix_2_34` = 2.34.9 (source read 2026-11-27). Never hardcode it, and re-check when nixpkgs turns `nix_2_34` into a stub.
    ```

20. File: `skills/nix-quality-reference/release.md`
    Find (verbatim):
    ```
    The `cargoHash` path is read from the code, not run.
    ```
    Replace with:
    ```
    The `cargoHash` path is read from the code, not run. nixpkgs unstable still ships 1.16.0. nix-update 1.17.0 (2026-11-22) instead edits Nix string literals through a syntax tree, prefers `tag` over `rev` and skips unchanged versions, and NIX-REL-13 and NIX-REL-17 were not re-run on it.
    ```

21. File: `skills/nix-quality-reference/release.md`
    Find (verbatim):
    ```
    `nix-community/flake-compat` (self-declared unmaintained, checked 2026-09-27)
    ```
    Replace with:
    ```
    `nix-community/flake-compat` (archived on 2025-10-28, checked 2026-11-27)
    ```

22. File: `skills/nix-quality-reference/release.md`
    Find (verbatim):
    ```
    Minimum = NIX-GATE-16's computed floor (today `nixVersions.nix_2_31` = 2.31.5).
    ```
    Replace with:
    ```
    Minimum = NIX-GATE-16's computed floor (on nixos-unstable, 2026-11-27: `nixVersions.nix_2_34` = 2.34.9).
    ```

23. File: `skills/nix-quality-reference/release.md`
    Find (verbatim):
    ```
    A hardcoded floor goes stale when nixpkgs turns `nix_2_*` into a throwing stub (`nix_2_24` already has).
    ```
    Replace with:
    ```
    A hardcoded floor goes stale when nixpkgs turns `nix_2_*` into a throwing stub (`nix_2_24` to `nix_2_33` already have, `nix_2_31` between 2026-09-27 and 2026-11-27).
    ```

24. File: `skills/nix-quality-reference/release.md`
    Find (verbatim):
    ```
    `src` (`fetchFromGitHub` with `tag` per NIX-REL-13) and the dependency hash, adds
    ```
    Replace with:
    ```
    `src` (`fetchFromGitHub` with `tag` per NIX-REL-13) and the dependency hash, plus a list `meta.license`, which nixpkgs-vet rejects in a new top-level package since 2026-11-03 (NIX-PKG-08), adds
    ```

25. File: `skills/nix-quality-reference/release.md`
    Find (verbatim):
    ```
    any change beyond the three attributes and `updateScript` is the finding.
    ```
    Replace with:
    ```
    any change beyond the three attributes, `updateScript` and that license change is the finding.
    ```

26. File: `skills/nix-quality-reference/inputs.md`
    Find (verbatim):
    ```
    computed floor (today `nix_2_31` = 2.31.5) and never hardcoded.
    ```
    Replace with:
    ```
    computed floor (on nixos-unstable, 2026-11-27: `nix_2_34` = 2.34.9) and never hardcoded.
    ```

27. File: `skills/nix-quality-reference/language.md`
    Find (verbatim):
    ```
    CppNix 2.31.5 (the consumer floor) behaves
    ```
    Replace with:
    ```
    CppNix 2.31.5 (the consumer floor on 2026-09-27) behaves
    ```

28. File: `skills/nix-quality-reference/security.md`
    Find (verbatim):
    ```
    (the macOS default was not measured).
    ```
    Replace with:
    ```
    (the macOS default was not measured, and GHSA-m4vq-qf6v-82pj, 2026-10-13, calls the macOS sandbox opt-in).
    ```

29. File: `skills/nix-quality-reference/security.md`
    Find (verbatim):
    ```
    # CppNix fix per release line for CVE-2026-39860 (GHSA-g3g9-5vj6-r3gj, 2026-04-07).
    # Lines above 2.35 postdate the fix. Re-check at each Nix security advisory.
    { v }:
    let
      fixed = {
        "2.28" = "2.28.6";
        "2.29" = "2.29.3";
        "2.30" = "2.30.4";
        "2.31" = "2.31.4";
        "2.32" = "2.32.7";
        "2.33" = "2.33.4";
        "2.34" = "2.34.5";
        "2.35" = "2.35.2";
      };
    ```
    Replace with:
    ```
    # CppNix fix per release line: the later of CVE-2026-39860 (GHSA-g3g9-5vj6-r3gj, 2026-04-07)
    # and the five advisories of 2026-10-13 (GHSA-jwvx-xq5j-gc56 and four more).
    # 2.29, 2.32 and 2.33 got no 2026-10-13 fix and are left out, so they fail.
    # Lines above 2.35 postdate both fixes. Re-check at each Nix security advisory.
    { v }:
    let
      fixed = {
        "2.28" = "2.28.8";
        "2.30" = "2.30.6";
        "2.31" = "2.31.6";
        "2.34" = "2.34.9";
        "2.35" = "2.35.3";
      };
    ```

30. File: `skills/nix-quality-reference/security.md`
    Find (verbatim):
    ```
    if ok then true else throw "CppNix ${v} is below the CVE-2026-39860 fix for its release line"
    ```
    Replace with:
    ```
    if ok then true else throw "CppNix ${v} is below the security fix for its release line"
    ```

31. File: `skills/nix-quality-reference/security.md`
    Find (verbatim):
    ```
    nix eval --file ./cve-floor.nix --apply 'f: f { v = "2.35.2"; }' ''
    ```
    Replace with:
    ```
    nix eval --file ./cve-floor.nix --apply 'f: f { v = "2.35.6"; }' ''
    ```

32. File: `skills/nix-quality-reference/security.md`
    Find (verbatim, two lines):
    ```
    `true` with exit 0 is the pass. Exit 1 with `CppNix … is below the
    CVE-2026-39860 fix` is the finding. Never run it on a Lix leg: Lix 2.95.2
    ```
    Replace with:
    ```
    `true` with exit 0 is the pass. Exit 1 with `CppNix … is below the
    security fix` is the finding. Never run it on a Lix leg: Lix 2.95.2
    ```

33. File: `skills/nix-quality-reference/security.md`
    Find (verbatim, the whole NIX-SEC-06 row):
    ```
    | NIX-SEC-06 | Run CI and every self-hosted builder on CppNix at or above the CVE-2026-39860 fix for its release line: 2.28.6, 2.29.3, 2.30.4, 2.31.4, 2.32.7, 2.33.4 or 2.34.5, and 2.35.2 or later on the 2.35 line. Pin it through NIX-GATE-13's `install_url`. Re-run the check whenever the pinned nixpkgs or the installer moves, and never write a remembered minimum version into docs or CI. | In [GHSA-g3g9-5vj6-r3gj](https://github.com/NixOS/nix/security/advisories/GHSA-g3g9-5vj6-r3gj) (critical, 2026-04-07), any user allowed to submit builds, which is everyone under the default `allowed-users = *`, escalates to root through a symlinked temp copy of a fixed-output derivation's output. The advisory names no 2.35 release, so 2.35.0 and 2.35.1 stay below the floor until a source read shows they carry the fix. | The two commands above. Watched red: `2.34.4`, `2.35.1` and `2.27.9` each threw, exit 1. Watched green: `2.31.5`, `2.34.8`, `2.35.2` and `2.36.0` printed `true`, exit 0, and so did `builtins.nixVersion` on CppNix 2.35.2 and 2.31.5. NIX-GATE-16's floor of 2.31.5 sits above the 2.31.4 fix. | MUST, the CI and builders of every shape | CppNix only (**pinned default**). Lix and Determinate Nix advisories unmeasured (re-check at each Lix and Determinate release) |
    ```
    Replace with:
    ```
    | NIX-SEC-06 | Run CI and every self-hosted builder on CppNix at or above its release line's fix in the `cve-floor.nix` table: 2.28.8, 2.30.6, 2.31.6, 2.34.9 or 2.35.3, or 2.36.0 or later. The 2.29, 2.32 and 2.33 lines received no fix for the 2026-10-13 advisories and always fail. Pin it through NIX-GATE-13's `install_url`. Re-run the check whenever the pinned nixpkgs or the installer moves, and never write a remembered minimum version into docs or CI. | In [GHSA-g3g9-5vj6-r3gj](https://github.com/NixOS/nix/security/advisories/GHSA-g3g9-5vj6-r3gj) (critical, 2026-04-07), any user allowed to submit builds, which is everyone under the default `allowed-users = *`, escalates to root through a symlinked temp copy of a fixed-output derivation's output. In [GHSA-jwvx-xq5j-gc56](https://github.com/NixOS/nix/security/advisories/GHSA-jwvx-xq5j-gc56) (high, 2026-10-13), an untrusted daemon client overwrites store objects through repair mode, again a local root escalation. Four more advisories published that day (GHSA-m4vq-qf6v-82pj, GHSA-hf6w-2rg9-v84g, GHSA-92x5-h528-wrmw, GHSA-25vp-6h23-hj3g) share its patched versions. Each October fix is later than its line's CVE-2026-39860 fix, so the table holds one version per line. A host set up with the multi-user scripted installer below 2.35.3 keeps user-owned store contents (GHSA-hf6w-2rg9-v84g) until Nix is updated and the store is garbage-collected. | The two commands above. Watched 2026-09-27 on the CVE-2026-39860 table: `2.34.4`, `2.35.1` and `2.27.9` each threw, exit 1, and `2.31.5`, `2.34.8`, `2.35.2` and `2.36.0` printed `true`, exit 0, and so did `builtins.nixVersion` on CppNix 2.35.2 and 2.31.5. The 2026-11-27 table changes only the values under the same logic. Before relying on it, watch `2.35.2`, `2.31.5` and `2.33.4` throw and `2.35.3`, `2.34.9` and `2.36.0` print `true`. NIX-GATE-16's floor on nixos-unstable, 2.34.9, is exactly the 2.34 fix. | MUST, the CI and builders of every shape | CppNix only (**pinned default**). Lix fixed the daemon repair issue in 2.94.3, 2.95.4 and 2.96, and Determinate Nix 3.23.2's release notes name four of the five GHSA ids (all 2026-10-13). This table covers neither (re-check at each Lix and Determinate release) |
    ```

34. File: `skills/nix-quality-reference/security.md`
    Find (verbatim):
    ```
    (GHSA-jm6c-h95p-6qhj, no backported fix as of 2026-09-27, re-check at each Nix security advisory)
    ```
    Replace with:
    ```
    (GHSA-jm6c-h95p-6qhj, no backported fix as of 2026-11-27, re-checked after the 2026-10-13 advisories, re-check at each Nix security advisory)
    ```

35. File: `skills/nix-quality-reference/security.md`
    Find (verbatim):
    ```
    | advisory status 2026-09-27 |
    ```
    Replace with:
    ```
    | advisory status 2026-11-27 |
    ```

36. File: `skills/nix-quality-reference/packaging.md`
    Find (verbatim):
    ```
    The pinned `rustc` is 1.98.1.
    ```
    Replace with:
    ```
    The pinned `rustc` was 1.98.1 at `8d5d2709` and is 1.99.1 on nixos-unstable `2786a2a72088` (read 2026-11-27).
    ```

37. File: `skills/nix-quality-reference/packaging.md`
    Find (verbatim):
    ```
    Rust's default `MIT OR Apache-2.0` makes it the first thing an agent writes for a dual-licensed crate. The attribute scope is NIX-REL-11's.
    ```
    Replace with:
    ```
    Rust's default `MIT OR Apache-2.0` makes it the first thing an agent writes for a dual-licensed crate. The attribute scope is NIX-REL-11's. Since 2026-11-03 nixpkgs-vet rejects a list `meta.license` in a new top-level package (nixpkgs-vet PR 316), so a nixpkgs copy changes it (NIX-REL-14).
    ```

38. File: `skills/nix-quality-reference/packaging.md`
    Find (verbatim):
    ```
    and set `strictDeps = true` from the first commit. |
    ```
    Replace with:
    ```
    and set `strictDeps = true` from the first commit, except inside `buildPythonPackage` and `buildPythonApplication` on a nixpkgs master revision from 2026-11-24 onward, which default it and warn when it is set (NIX-PKG-10). |
    ```

39. File: `skills/nix-quality-reference/packaging.md`
    Find (verbatim):
    ```
    A derivation without `strictDeps = true` is a reading-heuristic finding.
    ```
    Replace with:
    ```
    A derivation without `strictDeps = true`, other than such a Python builder call, is a reading-heuristic finding.
    ```

40. File: `skills/nix-quality-reference/packaging.md`
    Find (verbatim):
    ```
    | NIX-PKG-10 | Set `__structuredAttrs = true`. Keep
    ```
    Replace with:
    ```
    | NIX-PKG-10 | Set `__structuredAttrs = true`, except inside `buildPythonPackage` and `buildPythonApplication`. On nixpkgs 26.11 these default it, and from nixpkgs master `ba375ac` (2026-11-24) they also default `strictDeps` and warn that an explicit `true` for either is redundant. Keep
    ```

41. File: `skills/nix-quality-reference/packaging.md`
    Find (verbatim):
    ```
    `env` rejects a list with or without the flag. |
    ```
    Replace with:
    ```
    `env` rejects a list with or without the flag. The redundancy warning reaches every consumer's evaluation log. |
    ```

42. File: `skills/nix-quality-reference/packaging.md`
    Find (verbatim):
    ```
    A list attribute without `__structuredAttrs = true` is a reading-heuristic finding.
    ```
    Replace with:
    ```
    A list attribute without `__structuredAttrs = true` outside a Python builder is a reading-heuristic finding. So is an explicit `__structuredAttrs = true` or `strictDeps = true` inside `buildPythonPackage` or `buildPythonApplication` on a nixpkgs revision that carries the `is redundant` warning (read from source 2026-11-27, not watched).
    ```

43. File: `skills/nix-quality-reference/packaging.md`
    Find (verbatim):
    ```
    | x86_64-linux, aws-lc-sys 0.43 built and 0.45.0's builder read (re-check at each aws-lc-sys minor) |
    ```
    Replace with:
    ```
    | x86_64-linux, aws-lc-sys 0.43 built and 0.45.0's builder read (re-check at each aws-lc-sys minor). nixpkgs 26.11's `cargoSetupHook` links aws-lc from nixpkgs, so re-measure there |
    ```

44. File: `skills/nix-quality-reference/packaging.md`
    Insert after the anchor (verbatim):
    ```
    15. **Running `--rebuild` alone** on a path never built and reading `checking is not possible` as a defect. Build plain first (NIX-PKG-04).
    ```
    Text to insert on the next line:
    ```
    16. **Setting `dontCargoUseSystemLibs = true` to get past a link failure on nixpkgs 26.11**, where `cargoSetupHook` now links aws-lc, openssl, zstd, libgit2 and other C libraries from nixpkgs. nixpkgs-vet rejects it in a new top-level package since 2026-11-22, so read the link error first (NIX-PKG-17, NIX-PKG-06).
    ```
