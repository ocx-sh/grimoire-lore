---
title: nix-diagnose refresh decision, spillover round
target: nix-diagnose
date: 2026-11-27
model: opus
consolidates: /home/mherwig/dev/ocx-sh/grimoire-lore/.agents/research/refresh-2026-11/nix-diagnose/spillover-check.md
---

# nix-diagnose refresh decision, spillover round

## Verdict

One confirmed spillover item from nix-quality changes the skill. nixpkgs turned `nixVersions.nix_2_31` into a throwing stub on nixos-unstable `2786a2a72088` and on `release-26.11`. The computed consumer floor there is `nix_2_34` = 2.34.9. Three present-tense statements in the skill still name `nix_2_31` as the floor or run it, and Step 3's CppNix command fails on a 26.11 pin. They change in place. Dated measurements ("Measured 2026-09-27 ...", per-version error text for CppNix 2.31.5) stay, because they remain true as measurements. The wording matches what the first round already wrote into the nix-quality rule and the nix-quality-reference depth files (gates.md NIX-GATE-16, release.md NIX-REL-12, inputs.md). No rule or step ID changes and no new ID is added. The first round made no edits under `skills/nix-diagnose/`, so nothing here conflicts with it.

## Changed statements

1. SKILL.md, "Pinned defaults": the floor example changes from "today 2.31.5" to `nix_2_34` = 2.34.9 on nixos-unstable `2786a2a72088` (2026-11-27). Verification: the NIX-GATE-16 floor expression prints `nix_2_34` as its first element on that pin (read from source 2026-11-27, not run).
2. SKILL.md, Step 3: the CppNix re-run command uses `nixVersions.nix_2_34` instead of `nix_2_31`, and the sentence after it names `nix_2_34` as the 2026-11-27 floor, with `nix_2_31` kept as the 2026-09-27 floor at `8d5d2709`. Verification: the command's own exit code, as Step 3 already states (exit 0 passes, exit 1 prints the CppNix error). On a lock that lacks `nix_2_34`, the existing "does not provide attribute" fallback in the same paragraph still applies.
3. references/error-catalog.md, row 34: the verbatim string column adds the 26.11 form `… use nix_2_34.` next to the measured `use nix_2_31.`, labelled read from source and not run. The row's status stays `re-verified-2026-09-27`, which is true for the `8d5d2709` text it measured. No "re-verified" stamp is added, since no Nix was run.

## New rules

None.

## Declined

- Lix 2.96 flake validation (spillover Part B). The release note is primary (Lix 2.96, 2026-10-13: "No function calls outside of `outputs`"), but no change is needed for the skill to be true. The skill and catalog name Lix 2.95.2 for every Lix row, and the catalog stamp already says to re-check the Lix rows at each Lix release. No 2.96 error string was observed, so there is no catalog row to add, and whether rows 12 and 16 to 18 still hold on 2.96 is unmeasured.
- Dated measurements left as they are: SKILL.md metadata summary and the "Measured 2026-09-27" stamp, the error-catalog stamp, and the per-version CppNix 2.31.5 error texts (catalog rows 1, 12, 16, 17, 33, 39, 40 and the SKILL path-not-valid and absolute-path rows). They record what was run on 2026-09-27 and are not floor claims.

## Sources

- nixpkgs `pkgs/tools/package-management/nix/default.nix` on nixos-unstable (`2786a2a72088`) and `release-26.11`, read 2026-11-27: `nix_2_34` (2.34.9) is the oldest defined `nix_2_*`, and `nix_2_24` to `nix_2_33` are `throw "nix_2_XX has been removed. use nix_2_34."`. https://raw.githubusercontent.com/NixOS/nixpkgs/nixos-unstable/pkgs/tools/package-management/nix/default.nix and https://raw.githubusercontent.com/NixOS/nixpkgs/release-26.11/pkgs/tools/package-management/nix/default.nix
- Lix 2.96 release notes, 2026-10-13: https://docs.lix.systems/manual/lix/stable/release-notes/rl-2.96.html

## Revision log

- 2026-11-27 (opus, spillover round): floor statements in SKILL.md and catalog row 34 moved to `nix_2_34` on `2786a2a72088`; Lix 2.96 note declined.

### Edit list (spillover round)

1. File: `skills/nix-diagnose/SKILL.md`
   Find:
   ```
   Q8, today 2.31.5).
   ```
   Replace with:
   ```
   Q8, on nixos-unstable `2786a2a72088` on 2026-11-27: `nix_2_34` = 2.34.9).
   ```

2. File: `skills/nix-diagnose/SKILL.md`
   Find:
   ```
   nix shell --inputs-from . nixpkgs#nixVersions.nix_2_31 --command nix flake check --no-build --no-write-lock-file --option allow-import-from-derivation false .
   ```
   Replace with:
   ```
   nix shell --inputs-from . nixpkgs#nixVersions.nix_2_34 --command nix flake check --no-build --no-write-lock-file --option allow-import-from-derivation false .
   ```

3. File: `skills/nix-diagnose/SKILL.md`
   Find:
   ```
   Exit 0 passes. Exit 1 prints the CppNix error. `nix_2_31` is the 2026-09-27
   floor (NIX-GATE-16 computes it).
   ```
   Replace with:
   ```
   Exit 0 passes. Exit 1 prints the CppNix error. `nix_2_34` is the 2026-11-27
   floor on nixos-unstable `2786a2a72088` (NIX-GATE-16 computes it), and
   `nix_2_31` was the 2026-09-27 floor at `8d5d2709`.
   ```

4. File: `skills/nix-diagnose/references/error-catalog.md`
   Find:
   ```
   | 34 | `error: nix_2_24 has been removed. use nix_2_31.` | All three, nixpkgs `8d5d2709` |
   ```
   Replace with:
   ```
   | 34 | `error: nix_2_24 has been removed. use nix_2_31.` on nixpkgs `8d5d2709`, `… use nix_2_34.` on nixos-unstable `2786a2a72088` and `release-26.11` | All three, nixpkgs `8d5d2709`. The 26.11 text is read from source 2026-11-27, not run |
   ```
