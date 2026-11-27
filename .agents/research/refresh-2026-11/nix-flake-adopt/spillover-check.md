---
title: nix-flake-adopt spillover check from nix-quality
target: nix-flake-adopt
date_researched: 2026-11-27
model: sonnet
sources_fetched:
  - https://github.com/NixOS/nix/security/advisories/GHSA-jwvx-xq5j-gc56
  - https://github.com/actions/runner-images/issues/15226
  - https://raw.githubusercontent.com/NixOS/nixpkgs/master/pkgs/tools/package-management/nix/default.nix
  - https://releases.nixos.org/nix/nix-2.35.6/install
---

# Spillover check: nix-quality items for nix-flake-adopt

Evidence read in `.agents/research/refresh-2026-11/nix-quality.md` and `nix-quality/cppnix-releases-and-advisories.md`.

## Item 1: CI install_url 2.35.2 is below the advisory floor (move to 2.35.6)

Verdict: confirmed by primary source (the floor 2.35.3). The choice of 2.35.6 specifically is only supported by the install URL resolving (it returns a valid installer script); I did not independently confirm 2.35.6 is the newest 2.35 patch.

Source: https://github.com/NixOS/nix/security/advisories/GHSA-jwvx-xq5j-gc56, published 2026-10-13, High (CVSS 8.4), patched in 2.35.3, 2.34.9, 2.31.6, 2.30.6 and 2.28.8. https://releases.nixos.org/nix/nix-2.35.6/install resolves.

Affected text, `skills/nix-flake-adopt/references/ci-and-readme.md` lines 43 and 95: `install_url: https://releases.nixos.org/nix/nix-2.35.2/install`. `SKILL.md` line 67: `| CI Nix | CppNix 2.35.2 through `install_url` (NIX-GATE-13, NIX-SEC-06) | a newer patch release, moved in its own pull request |`.

Smallest change: replace `nix-2.35.2` with `nix-2.35.6` in the two `install_url` lines, and `CppNix 2.35.2` with `CppNix 2.35.6` in the SKILL.md line 67 row. Leave the "Measured 2026-09-27 on CppNix 2.35.2" stamps (SKILL.md lines 6 and 44, ci-and-readme.md line 6, package-templates.md line 5) and the "CppNix 2.35.2, 2.31.5 ... all accept" records (SKILL.md line 412, package-templates.md line 259), because they record what was measured. ci-and-readme.md line 210 (`2.35.2 warns on install`) is likewise a measurement.

## Item 2: floor nix_2_31 = 2.31.5 is stale (now nix_2_34 = 2.34.9)

Verdict: confirmed by primary source. nixpkgs master (read 2026-11-27, no date stated in the file) defines `nix_2_31 = throw "nix_2_31 has been removed. use nix_2_34.";` and `nix_2_34` as a real package at version 2.34.9. 2.34.9 is the 2.34 fix in the 2026-10-13 advisory. The active set is nix_2_34, nix_2_35, nix_2_36. Note the nixpkgs revision the skill measured (`8d5d2709`) still had nix_2_31, so the stamp is true for that revision, but the present-tense commands fail on current unstable.

Affected text, `SKILL.md` line 66: `| Consumer floor | NIX-GATE-16's computed floor, today `nix_2_31` = 2.31.5, never a hardcoded number | none |`. `SKILL.md` line 90 contains `nixpkgs#nixVersions.nix_2_31 --command nix flake check ...` and `A lock older than the floor has no `nix_2_31``. `ci-and-readme.md` line 103 computes the floor with a `nix_2_[0-9]+` match (computed, no literal; already correct).

Smallest change: in SKILL.md line 66 write `today `nix_2_34` = 2.34.9 (nixpkgs unstable, 2026-11-27)`; in line 90 replace both `nix_2_31` with `nix_2_34`. Keep the stamps at SKILL.md lines 44-45 and ci-and-readme.md lines 6-7 and 163 as measured records.

## Item 3: macos-14 runner label (retired 2026-11-02)

Verdict: target already correct. Primary source https://github.com/actions/runner-images/issues/15226 says GitHub Actions macOS 14 retires on 2026-11-02 (the thread names no replacement labels; `macos-26` comes from nix-quality's other evidence, not this thread). The target never uses `macos-14`: a grep finds only `macos-15` (SKILL.md line 307 and ci-and-readme.md lines 35 and 157).

Affected text: none. No change needed.
