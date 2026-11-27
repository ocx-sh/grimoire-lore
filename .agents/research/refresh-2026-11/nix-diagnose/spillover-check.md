---
title: nix-diagnose spillover check from nix-quality
target: nix-diagnose
date_researched: 2026-11-27
model: sonnet
sources_fetched:
  - https://raw.githubusercontent.com/NixOS/nixpkgs/nixos-unstable/pkgs/tools/package-management/nix/default.nix
  - https://raw.githubusercontent.com/NixOS/nixpkgs/release-26.11/pkgs/tools/package-management/nix/default.nix
  - https://docs.lix.systems/manual/lix/stable/release-notes/rl-2.96.html
---

# Spillover check for nix-diagnose

Evidence in the originating pair: `.agents/research/refresh-2026-11/nix-quality/nixpkgs-branch-lifecycle.md` (items 44 to 49, rev `2786a2a72088`) and `.agents/research/refresh-2026-11/nix-quality/lix-releases.md` (2.96 items). Decision file: `.agents/research/refresh-2026-11/nix-quality.md`.

## Item: floor `nix_2_31` = 2.31.5 and the "use nix_2_31" throw text are stale; Lix 2.96 flake validation may add catalog entries

### Part A, floor and throw text

Verdict: confirmed by primary source.

Source: nixpkgs `pkgs/tools/package-management/nix/default.nix` on `nixos-unstable` and on `release-26.11` (read 2026-11-27; the file carries no date, it is the branch head). Both branches read identically:

- `nix_2_34` is the oldest defined `nix_2_*` (`version = "2.34.9"`); `nix_2_35` is 2.35.6, `nix_2_36` exists, `stable = nix_2_35`, `latest = nix_2_36`.
- `nix_2_31 = throw "nix_2_31 has been removed. use nix_2_34.";` and the same text, ending `use nix_2_34.`, for `nix_2_24` to `nix_2_33`.

So the floor on those branches is `nix_2_34` = 2.34.9, and `nix shell ... nixVersions.nix_2_31` now fails on them. Caveat: `release-26.05` still defines real `nix_2_30` and `nix_2_31` (per the nix-quality note, not re-read here), so the old command still works against a 26.05 pin. The skill's pin is nixpkgs 26.11pre, so the stale text is true only as a dated measurement.

Affected text in `skills/nix-diagnose/SKILL.md`:

- Line 6 (metadata summary): "measured on CppNix 2.35.2, 2.31.5 and Lix 2.95.2". Dated measurement, leave.
- Lines 15 to 16: "Measured 2026-09-27 on CppNix 2.35.2 with nixpkgs 26.11pre `8d5d2709`, the floor `nix_2_31` = 2.31.5". Dated measurement, leave.
- Lines 25 to 26: "The consumer floor is the oldest non-stub `nixVersions.nix_2_*` in the pinned nixpkgs, computed, never remembered (frame Q8, today 2.31.5)." Present-tense claim, stale.
- Line 155: the command `nix shell --inputs-from . nixpkgs#nixVersions.nix_2_31 --command nix flake check ...`. Breaks on a 26.11 pin.
- Line 158: "`nix_2_31` is the 2026-09-27 floor (NIX-GATE-16 computes it)." Already dated and says "computes it", so true as written.
- Lines 267 and 408 (path-not-valid and absolute-path messages quoting CppNix 2.35.2 and 2.31.5): measurements, leave.

Affected text in `skills/nix-diagnose/references/error-catalog.md`:

- Line 18: "`nix_2_31` = 2.31.5" inside the "Measured 2026-09-27" stamp. Leave.
- Line 102 (row 34): "`error: nix_2_24 has been removed. use nix_2_31.` | All three, nixpkgs `8d5d2709` ... | re-verified-2026-09-27". Correct for that pin, stale for 26.11.
- Lines 25, 42, 59 to 113: other "2.31.5" mentions are per-version measurements of error text, not floor claims. Leave.

Smallest change to be true on 2026-11-27:

1. SKILL.md line 26: replace "today 2.31.5" with "2.34.9 on nixpkgs `2786a2a72088`, `nix_2_34`".
2. SKILL.md line 155: replace `nix_2_31` with `nix_2_34`; line 158: say "`nix_2_34` is the 2026-11-27 floor on nixpkgs `2786a2a72088`, `nix_2_31` was the 2026-09-27 floor at `8d5d2709`".
3. error-catalog.md row 34: keep the 2026-09-27 text but add that at `2786a2a72088` and `release-26.11` the message is `nix_2_24 has been removed. use nix_2_34.`, labelled "read from source 2026-11-27, not run".

No Nix was run here, so no "re-verified" stamp should be added.

### Part B, Lix 2.96 flake validation

Verdict: confirmed by primary source (the change exists); effect on the skill could not be confirmed.

Source: https://docs.lix.systems/manual/lix/stable/release-notes/rl-2.96.html, release date 2026-10-13 (Lix 2.96 "Bingsu"). Breaking change, verbatim: "Lix has now replaced all the old checks by a simple rule: No function calls outside of `outputs`." Newly allowed syntax such as let bindings will not evaluate on older Lix. The notes do not mention `flake-self-attrs`, formatter, overlays or apps, so whether catalog rows 12, 16, 17, 18, 19 (Lix leniency on formatter, overlays, apps) still hold on 2.96 is unmeasured.

Target text: SKILL.md line 150 "Lix 2.95.2 exits 0 on a string `formatter`, a ..." and catalog rows 12 to 18 name Lix 2.95.2 explicitly, so they remain true as dated measurements. The target says nothing about Lix 2.96 or literal `inputs` computed with `let`.

Smallest change: none required for truth. Optionally add one line to error-catalog.md after line 19: "Lix 2.96 (2026-10-13) changed flake validation to 'no function calls outside of `outputs`'. The Lix rows above are measured on 2.95.2 and not re-run on 2.96." No new catalog row, since no error string was observed.
