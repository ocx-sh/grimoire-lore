---
title: Spillover check for nix-flake-release
target: nix-flake-release
date_researched: 2026-11-27
model: sonnet
sources_fetched:
  - https://raw.githubusercontent.com/NixOS/nixpkgs/master/pkgs/tools/package-management/nix/default.nix
  - https://github.com/NixOS/nixpkgs-vet
  - https://github.com/NixOS/nixpkgs-vet/pull/316
---

# Spillover check for nix-flake-release

One item, from the nix-quality pair. Evidence read in
`.agents/research/refresh-2026-11/nix-quality.md` (verdict bullets and the
NIX-GATE-16, NIX-FLK-19, NIX-REL-12 and NIX-REL-14 sections) and
`nix-quality/recent-shifts.md`.

## Item: stale floor 2.31.5 / nix_2_31, and the list-license allowance

The item: SKILL.md carries the stale floor 2.31.5 / `nix_2_31`. Align it with
NIX-REL-12's new floor wording and NIX-REL-14's list-license allowance for the
nixpkgs copy.

### Part A: the floor moved to nix_2_34

Verdict: confirmed by primary source.

Source: nixpkgs master, `pkgs/tools/package-management/nix/default.nix`,
fetched 2026-11-27 (the file states no date). `nix_2_24` through `nix_2_33` are
all `throw "nix_2_NN has been removed. use nix_2_34."`. `nix_2_34` is defined
and is `version = "2.34.9"`. So on nixpkgs master the oldest non-stub is
`nix_2_34` = 2.34.9. The nix-quality pair states the same for `release-26.11`
and `2786a2a72088`; only master was re-read here. The skill pins nixpkgs
`8d5d2709` for its 2026-09-27 measurements, and that pin still had
`nix_2_31`, so the dated measurements stay true. The present-tense
statements and the command that substitutes `nix_2_31` do not.

Affected text, all in `/home/mherwig/dev/ocx-sh/grimoire-lore/skills/nix-flake-release/SKILL.md`:

- Line 61, table row: "The oldest non-stub `nixVersions.nix_2_*` in the pinned nixpkgs, computed at each release (2026-09-27: `nix_2_31` = 2.31.5)". Dated, so true as written. No change needed.
- Lines 43-44, "Measured 2026-09-27 on CppNix 2.35.2 with nixpkgs 26.11pre `8d5d2709`, floor `nix_2_31` = 2.31.5". Dated measurement. Leave it, as the pair does.
- Line 242: "# The floor is the first name printed (2026-09-27: nix_2_31). Substitute it for nix_2_31 on the next line." Still true as a dated remark.
- Line 244: `nix shell --inputs-from . nixpkgs#nixVersions.nix_2_31 --command nix flake check --no-build`. This throws on current nixpkgs master. It is the one broken command.
- Lines 256-257: "`nixVersions.nix_2_30` throws `nix_2_30 has been removed. use nix_2_31.` on nixpkgs `8d5d2709`." Scoped to a commit, true.
- Lines 334-335: "(`nixVersions.nix_2_31` = 2.31.5)", in the release-note promise. Present tense, no date, and the line 334 text names "2.35.2 on 2026-09-27" for the CI pin only.

Smallest change:

- Line 244: replace `nix_2_31` with `nix_2_34`, and change the comment on line 242 to "(2026-11-27 on nixos-unstable: nix_2_34). Substitute it for nix_2_34 on the next line."
- Lines 334-335: replace "(`nixVersions.nix_2_31` = 2.31.5)" with "(on nixos-unstable, 2026-11-27: `nixVersions.nix_2_34` = 2.34.9)". This is NIX-REL-12's new wording.
- Optionally add to line 257 that `nix_2_24` to `nix_2_33` all throw on master as of 2026-11-27. Not required.

Note on the CVE side: the pair also moves the CVE floors (2.31.6, 2.34.9, 2.35.3, advisories of 2026-10-13). That belongs to NIX-SEC-06 and is not this item. The skill's line 326 ("also exits 0 on CppNix 2.31.5") is a dated measurement and stays.

### Part B: list license allowed in the nixpkgs copy (NIX-REL-14)

Verdict: confirmed by primary source.

Source: nixpkgs-vet README, fetched 2026-11-27: "New top-level packages must not use a list for `meta.license`." The README gives no date. Pull request
https://github.com/NixOS/nixpkgs-vet/pull/316 "Ensure `meta.license` is not a list", merged 2026-11-03 (NPV-168 for new packages, NPV-169 against regression).

Target text: step 8 (lines 338-396) never says the nixpkgs copy may change
only certain attributes, and never mentions `meta.license`. The three-attribute
limit ("exactly `version`, `src`, the dependency hash", "any change beyond the
three attributes and `updateScript` is the finding") lives in the
`nix-quality` rule's NIX-REL-14, not in this skill. Line 63 only says "Step 8
applies to the copy from the day it exists". Line 430 (step 5, NIX-GEN-14)
checks license warnings, which is unaffected.

Verdict for the target on this part: target says nothing on the point; no
change is required. The smallest optional change, only if the skill should
mention it: add one sentence to step 8's opening paragraph (after line 342,
"hand-written packages."): "A nixpkgs copy of a package whose `meta.license`
is a list also changes that to a single license or a `lib.licenses.AND` or
`OR` expression, because nixpkgs-vet rejects a list in a new top-level
package since 2026-11-03 (NIX-REL-14)."

## Receipt

Part A confirmed, needs 3 small edits (lines 242, 244, 334-335). Part B
confirmed, target silent, optional one sentence. Dated 2026-09-27 stamps are
left alone.
