---
title: nix-flake-adopt refresh, spillover round decision
target: nix-flake-adopt
date: 2026-11-27
model: opus
consolidates:
  - /home/mherwig/dev/ocx-sh/grimoire-lore/.agents/research/refresh-2026-11/nix-flake-adopt/spillover-check.md
---

# nix-flake-adopt: spillover round

## Verdict

Two items from the nix-quality refresh change this skill and one needs no change. The CI Nix pin moves from 2.35.2 to 2.35.6, because 2.35.2 is below the 2.35.3 fix for GHSA-jwvx-xq5j-gc56 (2026-10-13). The present-tense consumer floor moves from `nix_2_31` = 2.31.5 to `nix_2_34` = 2.34.9, because current nixpkgs unstable throws on `nix_2_31`. The macOS runner item is already correct: the skill uses `macos-15`, never `macos-14`. No rule or step IDs are added, renumbered or repurposed. The skill cites rule IDs (NIX-GATE-13, NIX-GATE-16, NIX-SEC-06, NIX-FLK-19) and owns no ID family of its own, so no new IDs arise.

The first refresh round did not change any file under `skills/nix-flake-adopt/`. The edits below match the text the first round wrote into the rule and its reference skill: NIX-GATE-13 in `nix-quality-reference/gates.md` already pins `nix-2.35.6`, NIX-GATE-16 already names `nix_2_34` = 2.34.9 on nixos-unstable (2026-11-27), and the rule's step 9 already uses `nixVersions.nix_2_34`.

Measurement stamps stay as they are, because they record what was run on 2026-09-27: SKILL.md lines 6, 44 and 45 and line 412, `references/ci-and-readme.md` lines 6, 7, 163 and 210, and `references/package-templates.md` lines 5 and 259.

## Changed statements

1. `SKILL.md`, defaults table, "CI Nix" row: `CppNix 2.35.2 through install_url` becomes `CppNix 2.35.6 through install_url`. Verification: NIX-SEC-06's check, `nix eval --file ./cve-floor.nix --apply 'f: f { v = "2.35.6"; }' ''`, prints `true` and exits 0 on the 2026-11-27 table, and NIX-GATE-13's `install_url:` grep is non-empty. Primary source: GHSA-jwvx-xq5j-gc56 (patched in 2.35.3), and https://releases.nixos.org/nix/nix-2.35.6/install resolves to an installer script.
2. `references/ci-and-readme.md`, both workflow `install_url` lines (the `gate` job and the `implementations` job): `nix-2.35.2` becomes `nix-2.35.6`. Verification: the same two checks as statement 1.
3. `SKILL.md`, defaults table, "Consumer floor" row: `today nix_2_31 = 2.31.5` becomes `today nix_2_34 = 2.34.9 (nixos-unstable, 2026-11-27)`. Verification: NIX-GATE-16's floor expression (the `floor` step in `references/ci-and-readme.md`) prints `nix_2_34` against a lock on nixos-unstable `2786a2a72088`. Primary source: nixpkgs master `pkgs/tools/package-management/nix/default.nix`, which defines `nix_2_31` as `throw "nix_2_31 has been removed. use nix_2_34."` and `nix_2_34` at 2.34.9.
4. `SKILL.md`, the "`nix --version` names Lix" row: both `nix_2_31` become `nix_2_34`. On current unstable the old command fails at evaluation, so the CppNix cross-check could never pass. Verification: `nix shell --inputs-from . nixpkgs#nixVersions.nix_2_34 --command nix --version` prints `nix (Nix) 2.34.9` against a current nixos-unstable lock. This was read from source on 2026-11-27, not run. A lock older than the floor, such as one predating `nix_2_34`, still takes the row's existing fallback of dropping `--inputs-from .`.

## New rules

None.

## Declined

- Choosing 2.35.6 as the newest 2.35 patch is not confirmed. The spillover check confirmed only that the installer URL resolves and that 2.35.6 is above the 2.35.3 fix. The edit uses 2.35.6 because it is a real release above the floor, and because NIX-GATE-13 already names it. The edit makes no claim that it is the newest patch.
- Item 3 (the `macos-14` runner retirement, actions/runner-images#15226): the target is already correct. It uses only `macos-15`, so nothing changes.

## Sources

- https://github.com/NixOS/nix/security/advisories/GHSA-jwvx-xq5j-gc56 (published 2026-10-13, high, patched in 2.35.3, 2.34.9, 2.31.6, 2.30.6 and 2.28.8).
- https://raw.githubusercontent.com/NixOS/nixpkgs/master/pkgs/tools/package-management/nix/default.nix (read 2026-11-27).
- https://releases.nixos.org/nix/nix-2.35.6/install (resolves, 2026-11-27).
- https://github.com/actions/runner-images/issues/15226 (macOS 14 retires 2026-11-02).

## Revision log

- 2026-11-27, spillover round: the CI Nix pin moves to 2.35.6 in SKILL.md and both workflow templates. The present-tense floor moves to `nix_2_34` = 2.34.9 in SKILL.md's defaults table and the Lix cross-check command. Measurement stamps are unchanged.

### Edit list (spillover round)

1. File: `skills/nix-flake-adopt/SKILL.md`
   Find:
   ```
   | Consumer floor | NIX-GATE-16's computed floor, today `nix_2_31` = 2.31.5, never a hardcoded number | none |
   ```
   Replace with:
   ```
   | Consumer floor | NIX-GATE-16's computed floor, today `nix_2_34` = 2.34.9 (nixos-unstable, 2026-11-27), never a hardcoded number | none |
   ```

2. File: `skills/nix-flake-adopt/SKILL.md`
   Find:
   ```
   | CI Nix | CppNix 2.35.2 through `install_url` (NIX-GATE-13, NIX-SEC-06) | a newer patch release, moved in its own pull request |
   ```
   Replace with:
   ```
   | CI Nix | CppNix 2.35.6 through `install_url` (NIX-GATE-13, NIX-SEC-06) | a newer patch release, moved in its own pull request |
   ```

3. File: `skills/nix-flake-adopt/SKILL.md`
   Find:
   ```
   nixpkgs#nixVersions.nix_2_31 --command nix flake check --no-build --option allow-import-from-derivation false` also exits 0 (NIX-FLK-19). A lock older than the floor has no `nix_2_31`: drop
   ```
   Replace with:
   ```
   nixpkgs#nixVersions.nix_2_34 --command nix flake check --no-build --option allow-import-from-derivation false` also exits 0 (NIX-FLK-19). A lock older than the floor has no `nix_2_34`: drop
   ```

4. File: `skills/nix-flake-adopt/references/ci-and-readme.md`
   Find:
   ```
           os: [ubuntu-24.04, ubuntu-24.04-arm, macos-15]
       runs-on: ${{ matrix.os }}
       steps:
         - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
           with:
             persist-credentials: false
         - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
           with:
             install_url: https://releases.nixos.org/nix/nix-2.35.2/install
   ```
   Replace with:
   ```
           os: [ubuntu-24.04, ubuntu-24.04-arm, macos-15]
       runs-on: ${{ matrix.os }}
       steps:
         - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
           with:
             persist-credentials: false
         - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
           with:
             install_url: https://releases.nixos.org/nix/nix-2.35.6/install
   ```

5. File: `skills/nix-flake-adopt/references/ci-and-readme.md`
   Find:
   ```
           leg: [lix, floor]
       runs-on: ubuntu-24.04
       continue-on-error: true
       steps:
         - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
           with:
             persist-credentials: false
         - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
           with:
             install_url: https://releases.nixos.org/nix/nix-2.35.2/install
   ```
   Replace with:
   ```
           leg: [lix, floor]
       runs-on: ubuntu-24.04
       continue-on-error: true
       steps:
         - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
           with:
             persist-credentials: false
         - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
           with:
             install_url: https://releases.nixos.org/nix/nix-2.35.6/install
   ```

Note for the applier: every code-fence block in this list is indented by three spaces for the list. Strip those three leading spaces from each line before matching. The file's own lines start at the indentation shown after that strip.
