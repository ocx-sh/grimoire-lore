---
title: nix-flake-release refresh, spillover round
target: nix-flake-release
date: 2026-11-27
model: opus
consolidates: /home/mherwig/dev/ocx-sh/grimoire-lore/.agents/research/refresh-2026-11/nix-flake-release/spillover-check.md
---

# nix-flake-release refresh, spillover round

## Verdict

One spillover item arrived from the nix-quality pair, and a primary source confirms both of its parts.

Part A (the consumer floor moved from `nix_2_31` to `nix_2_34`) changes the skill. Two present-tense statements in SKILL.md still name `nix_2_31`, and one of them is a command that throws on current nixpkgs. Both change in place to the wording that NIX-REL-12 in the nix-quality rule now uses: "on nixos-unstable, 2026-11-27: `nix_2_34` = 2.34.9". The statements dated 2026-09-27 or scoped to nixpkgs `8d5d2709` stay as they are, because they record measurements that remain true for that pin.

Part B (nixpkgs-vet rejects a list `meta.license` in a new top-level package) does not change the skill. The skill says nothing on the point, so nothing in it is false. The optional sentence would push the SKILL.md body past its 500-line budget (it is 498 lines now), and the requirement already lives in the nix-quality rule's NIX-REL-14.

No rule or step ID changes or is added. No new rule IDs are introduced, so no verification is added.

## Changed statements

1. Step 5, the implementation-legs block in SKILL.md. The floor command substituted `nix_2_31`, which on nixpkgs master is `throw "nix_2_31 has been removed. use nix_2_34."`. The command now substitutes `nix_2_34`, and the comment above it names the current floor with its date and channel. The verification is the command itself: the `nix eval` line on the line above prints the floor name, and the `nix shell` line exits 0 when that name is used.
2. Step 7, the release-note promise in SKILL.md. The undated "(`nixVersions.nix_2_31` = 2.31.5)" becomes "(on nixos-unstable, 2026-11-27: `nixVersions.nix_2_34` = 2.34.9)", matching NIX-REL-12. The step already tells the reader to update the number from step 5 at each release, which stays the verification.

## New rules

None.

## Declined

- Part B, the one sentence on a list `meta.license` in a nixpkgs copy (step 8): confirmed by the nixpkgs-vet README and pull request 316, but the skill is silent rather than wrong, the SKILL.md body would exceed 500 lines, and NIX-REL-14 in the nix-quality rule already carries the requirement.
- The optional addition to the step 5 bullet that `nix_2_24` to `nix_2_33` all throw on master: the existing bullet is scoped to nixpkgs `8d5d2709` and stays true, and the addition is not required to make any statement true.
- The dated measurements (frontmatter summary, the 2026-09-27 measurement line, the Q8 table row, the CppNix 2.31.5 `nix run` observation in step 7): each is dated or scoped to a pin and remains true.
- The CVE floor changes (2.31.6, 2.34.9, 2.35.3): these belong to NIX-SEC-06 in the nix-quality rule, not to this item.

## Sources

- nixpkgs master, `pkgs/tools/package-management/nix/default.nix`, fetched 2026-11-27: https://raw.githubusercontent.com/NixOS/nixpkgs/master/pkgs/tools/package-management/nix/default.nix (primary; `nix_2_24` through `nix_2_33` throw "use nix_2_34", and `nix_2_34` has `version = "2.34.9"`).
- nixpkgs-vet README, fetched 2026-11-27: https://github.com/NixOS/nixpkgs-vet (primary).
- nixpkgs-vet pull request 316, "Ensure `meta.license` is not a list", merged 2026-11-03: https://github.com/NixOS/nixpkgs-vet/pull/316 (primary).

## Revision log

- 2026-11-27, spillover round: Part A applied as two in-place edits in SKILL.md (step 5 floor command and comment, step 7 release-note promise). Part B and the optional additions declined. Line count unchanged, so the SKILL.md body stays at 498 lines.

### Edit list (spillover round)

1. File: `skills/nix-flake-release/SKILL.md`

   Find:

   ```
   # The floor is the first name printed (2026-09-27: nix_2_31). Substitute it for nix_2_31 on the next line.
   ```

   Replace with:

   ```
   # The floor is the first name printed (2026-11-27 on nixos-unstable: nix_2_34). Substitute it for nix_2_34 on the next line.
   ```

2. File: `skills/nix-flake-release/SKILL.md`

   Find:

   ```
   nix shell --inputs-from . nixpkgs#nixVersions.nix_2_31 --command nix flake check --no-build
   ```

   Replace with:

   ```
   nix shell --inputs-from . nixpkgs#nixVersions.nix_2_34 --command nix flake check --no-build
   ```

3. File: `skills/nix-flake-release/SKILL.md`

   Find:

   ```
   (`nixVersions.nix_2_31` = 2.31.5), Lix advisory, Determinate Nix untested, and
   ```

   Replace with:

   ```
   (on nixos-unstable, 2026-11-27: `nixVersions.nix_2_34` = 2.34.9), Lix advisory, Determinate Nix untested, and
   ```
