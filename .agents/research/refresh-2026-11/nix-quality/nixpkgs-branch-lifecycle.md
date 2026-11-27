---
title: nixpkgs branch and release lifecycle delta, 2026-09-27 to 2026-11-27
pair: nix-quality
date_researched: 2026-11-27
window_start: 2026-09-27
model: sonnet
sources_fetched: 9
---

# nixpkgs branch and release lifecycle delta

Delta update of the 2026-09-27 baseline. Only facts that moved are listed as changed. All facts were read from primary sources on 2026-11-27.

## Headline

NixOS 26.11 "Zokor" has **branched but is not yet released**. The `release-26.11` branch was created on 2026-11-24 (18:00 UTC). The planned release date is **2026-11-30 08:00 UTC**, three days after this research date. The stable channel `nixos-26.11` does not exist yet: `https://channels.nixos.org/nixos-26.11` returns HTTP 404, and `git ls-remote` shows `release-26.11`, `staging-26.11` and `nixos-26.11-small`, but no `nixos-26.11` head. The final rl-2611 release notes are therefore not final: the title line still reads `Release 26.11 ("Zokor", 2026.11/??)`.

Consequence for every stamp: the pair's depth files may now say "nixpkgs 26.11pre" only for `nixos-unstable`; once 26.11 releases on 2026-11-30 the stamp should name a release branch. Recommendation: re-stamp after 2026-11-30 as `nixos-26.11`, or, if the pair ships before then, as `nixos-unstable` at the new rev and add "release-26.11 branched 2026-11-24, release planned 2026-11-30".

## Current branch table (as of 2026-11-27)

| Branch | Status | End of life | Latest rev read |
|---|---|---|---|
| `nixos-unstable` | rolling, `26.11pre1125864` | none | `2786a2a72088ecf32aea5b3ec52099e6a7cff78f` (channels.nixos.org redirect) |
| `release-26.11` | branched 2026-11-24, unreleased; no `nixos-26.11` channel yet | planned 2027-06-30 (derived, see below) | `952e16774c428d11d93b6c0176abf714ce884bba` |
| `nixos-26.05` ("Yarara") | supported, released 2026-05-30 | 2026-12-31 | `0dc498bfe49baeb18b0f9891e800b53bb2603193` (`nixos-26.05.15079`) |
| `nixos-25.11` | end of life since 2026-06-30; the head still exists | 2026-06-30 | `b6018f87da91d19d0ab4cf979885689b469cdd41` (`nixos-25.11.12484`) |

The 26.11 end-of-life date is derived from the 26.05 pattern (seven months after release) and is not stated in any source fetched: could not determine from a primary source. The 25.11 end-of-life is from the 26.05 announcement. `lib.trivial.oldestSupportedRelease` on master is `2605`, consistent with 25.11 being out of support.

## Claim verdicts

1. **Stamp "nixpkgs 26.11pre `8d5d2709`" in every depth file.** Changed. Unstable is now `2786a2a72088` (`26.11pre1125864`). The baseline rev `8d5d2709` could not be resolved by `git ls-remote` as an abbreviation, which proves nothing about its existence; it is simply older. Whether the pair's stamps should name a release branch: not yet, because `nixos-26.11` is not a channel; yes after 2026-11-30. Source: https://github.com/NixOS/nixpkgs/issues/567567 (release calendar, `release-26.11` created 2026-11-24), https://channels.nixos.org/nixos-unstable (redirect target above).

2. **"nixpkgs 26.11 throws on any `x86_64-darwin` attribute" (rules/nix-quality.md and flakes.md NIX-FLK-09).** Unchanged. `release-26.11` and unstable `pkgs/top-level/default.nix` still define `x86_64DarwinDeprecationMessage` starting with the exact text `Nixpkgs 26.11 has dropped support for x86_64-darwin.`. The message continues: "The 26.05 stable branch still supports x86_64-darwin, and will receive security fixes until the end of 2026." and recommends, for flakes, `inputs.nixpkgs = { url = "github:NixOS/nixpkgs/nixpkgs-26.05-darwin"; };` (branch `nixpkgs-26.05-darwin`, not `nixos-26.05`). Source: https://raw.githubusercontent.com/NixOS/nixpkgs/release-26.11/pkgs/top-level/default.nix.

3. **flakes.md "`nixos-26.05` is the last branch that supports it, until its end of life at the end of 2026".** Unchanged in substance. 26.05 end of life is 2026-12-31 (announcement, "seven months (up until 2026-12-31)"), and it "will be the last release of Nixpkgs to support x86_64-darwin". Optional wording fix: the throw message itself points flake users at the `nixpkgs-26.05-darwin` branch. Source: https://nixos.org/blog/announcements/2026/nixos-2605/. Re-check trigger "(re-check then)" is now 34 days away.

4. **inputs.md pinned default "stable `nixos-26.05` only for a flake that promises NixOS-release compatibility"; modules.md `system.stateVersion = "26.05"`.** Not yet changed; will change on release. Supported branches today: `nixos-26.05` and unstable only (25.11 is out of support, 26.11 unreleased). Recommendation: do not move to 26.11 now, because `nixos-26.11` does not exist and a flake input pointing at it fails to resolve. Move the stable default and the recipe `stateVersion` to 26.11 after the 2026-11-30 release once `nixos-26.11` appears on channels.nixos.org. `stateVersion` should always be the release a machine is first installed with, so the modules.md recipe (a new-install example) should read 26.11 after release; the probe value must match the stable branch the probe runs against. Verdict: update the value (deferred to after 2026-11-30). Second-order: modules.md claim "No supported branch needs a fallback" and presence on `nixos-25.11` and `nixos-26.05` still hold, but 25.11 is no longer a supported branch; the sentence should say 26.05 and 26.11. Verdict: the rule text may be tightened (could not re-verify the `types.pathWith`, `_class` and `importApply` presence on 26.11 in this research; that belongs to the modules research item).

5. **inputs.md NIX-INP-05 "nixpkgs 26.11's release notes end `.tar.xz` channels after 2027-12-31 (re-check at nixpkgs 27.05)".** Unchanged against the current rl-2611 text: "The `nixexprs.tar.xz` tarball will be discontinued together with Nixpkgs 27.05 after 2027-12-31. Migrate to the `nixexprs.tar.zst` tarball instead." The notes are still a draft until 2026-11-30, so the wording could still move: could not determine finality. Note the example in the notes uses `https://channels.nixos.org/nixos-26.05/nixexprs.tar.zst`. Source: https://raw.githubusercontent.com/NixOS/nixpkgs/master/nixos/doc/manual/release-notes/rl-2611.section.md.

6. **gates.md NIX-GATE-16, index pinned-defaults table, release.md floor.** Changed, and this one needs rule text care.
   - On `release-26.11` and unstable the `nixVersions` set contains only `nix_2_34` (2.34.9), `nix_2_35` (2.35.6) and `nix_2_36` (2.36.0); `latest = nix_2_36`, `stable = nix_2_35`. The gate's probe expression (`builtins.filter ... attrNames v` over attributes whose `.version` evaluates) now returns `["nix_2_34","nix_2_35","nix_2_36"]`. **The floor element is `nix_2_34` (2.34.9).**
   - `nix_2_31` now throws `nix_2_31 has been removed. use nix_2_34.`, as do `nix_2_24` to `nix_2_33` (every one now says `use nix_2_34`, not `use nix_2_31`). `nix_2_4` to `nix_2_23` throw `nix_2_N has been removed`. `nixVersions.minimum` and `nixVersions.unstable` throw.
   - On `release-26.05` the set still defines real `nix_2_30` and `nix_2_31` (grep lines 180 and 196), while `nix_2_32` and `nix_2_33` throw; `stable = nix_2_34`, `latest = nix_2_35`. The 26.05 floor element was not fully probed (earlier attributes were not checked) and the 2.30 and 2.31 versions there were not read: could not determine. The "2.31.5" figure was true only for the baseline unstable.
   - Old text to change: "today `nix_2_31` = 2.31.5", the literal `nixpkgs#nixVersions.nix_2_31` in the rules/nix-quality.md gate line and gates.md line 190 example, the pinned-defaults probe output `["nix_2_31","nix_2_34","nix_2_35"]`, "`nix_2_24` and `nix_2_30` throw `has been removed. use nix_2_31`", release.md line 18 and NIX-REL-12 "today `nixVersions.nix_2_31` = 2.31.5". The release.md condition "re-check when nixpkgs turns `nix_2_31` into a throwing stub" has fired: it happened on unstable and `release-26.11`. Verdict: update the values (floor `nix_2_34` = 2.34.9; probe output; throw text `use nix_2_34`); the rule text itself (floor is computed, never hardcoded) stays correct, and the throw-stub re-check sentence should be replaced by "re-check when nixpkgs turns the current floor into a throwing stub".
   - Verification: `nix eval --json --inputs-from . nixpkgs#nixVersions --apply '<expression from gates.md>'` against the pinned rev; expect the first element `nix_2_34`. Rationale for the unchanged computed-floor rule: the floor moved by three minor versions in two months, which supports never hardcoding it.
   - A side effect: the floor leg `nix shell ... nixVersions.nix_2_31` in the rule and flakes.md line 58 now fails on 26.11 and unstable with `nix_2_31 has been removed. use nix_2_34.`, so the examples are not just stale but broken against the new pin.
   Sources: https://raw.githubusercontent.com/NixOS/nixpkgs/master/pkgs/tools/package-management/nix/default.nix and the same path on `release-26.11` and `release-26.05`.

7. **packaging.md "pinned `rustc` is 1.98.1" and NIX-PKG-16 "rustc 1.98.1 in nixpkgs `8d5d2709`".** Changed. At `2786a2a72088` and on `release-26.11`, `rust = rust_1_99` with `rustcVersion = "1.99.1"` (`pkgs/development/compilers/rust/1_99.nix`). Verdict: update the value to 1.99.1 and the rev to `2786a2a72088`. Verification: `nix eval --raw --inputs-from . nixpkgs#rustc.version`. Source: https://raw.githubusercontent.com/NixOS/nixpkgs/2786a2a72088ecf32aea5b3ec52099e6a7cff78f/pkgs/development/compilers/rust/1_99.nix.

## Other things that moved

- Nix 2.35 became the nixpkgs `stable` alias on unstable and `release-26.11`, with 2.36 as `latest`. rl-2611 says "Nix was updated to 2.35". The pair's "CppNix 2.35.2 is the gated implementation" is therefore a stable-alias statement that now holds with `nix_2_35` = 2.35.6 (2.35.2 is no longer what nixpkgs ships); release.md line 18 and the measured stamps should be re-measured, which is the measuring agents' job.
- rl-2611 Highlights add: default PostgreSQL v18 for `system.stateVersion >= 26.11`, nextcloud34 by default for `>= 26.11`. These are stateVersion-gated defaults and are relevant to the modules.md recipe: a `stateVersion = "26.11"` example changes defaults.

## Could not determine

- The 26.11 end-of-life date (no primary source; derive 2027-06-30 only as a pattern).
- Whether rl-2611 text is final (release is 2026-11-30).
- status.nixos.org: the page rendered with no rows (client-side data); channel state came from channels.nixos.org redirects and `git ls-remote` instead.
- The 2.30 and 2.31 versions on `release-26.05`.

## Recommendation

Do not move the stable pinned default or `stateVersion` to 26.11 before the release. The sequence is: now, fix the nix floor (`nix_2_34`), probe output, throw text, rustc 1.99.1 and the stamp rev; on or after 2026-11-30, when `https://channels.nixos.org/nixos-26.11` resolves, move the stable default and recipe `stateVersion` to 26.11 and name `nixos-26.11` in the stamps.

## Sources

- https://github.com/NixOS/nixpkgs/issues/567567 (NixOS 26.11 release schedule; read via `gh issue view`)
- https://raw.githubusercontent.com/NixOS/nixpkgs/master/nixos/doc/manual/release-notes/rl-2611.section.md
- https://raw.githubusercontent.com/NixOS/nixpkgs/master/pkgs/tools/package-management/nix/default.nix, and `release-26.11` and `release-26.05` copies
- https://raw.githubusercontent.com/NixOS/nixpkgs/release-26.11/pkgs/top-level/default.nix (x86_64 darwin message)
- https://nixos.org/blog/announcements/2026/nixos-2605/
- https://raw.githubusercontent.com/NixOS/nixpkgs/2786a2a72088ecf32aea5b3ec52099e6a7cff78f/pkgs/development/compilers/rust/1_99.nix
- `git ls-remote --heads https://github.com/NixOS/nixpkgs` (branches), `https://channels.nixos.org/<branch>` redirects
- https://status.nixos.org/ (fetched; empty table)
