---
title: Nix ecosystem shifts not yet in the nix-quality pair (delta 2026-09-27 to 2026-11-27)
pair: nix-quality
date_researched: 2026-11-27
window_start: 2026-09-27
model: sonnet
sources_fetched: 22
---

# Scope

This is a delta update of the nix-quality pair (rules/nix-quality.md and skills/nix-quality-reference/*), baseline measured 2026-09-27 on CppNix 2.35.2, Lix 2.95.2 and nixpkgs 26.11pre. Version bumps of named tools are covered by other briefs and are mentioned here only where they create a new rule. Six candidates are listed; nothing is padded. Every fact below was read from the cited page itself.

# Candidate shifts

## 1. CppNix daemon-repair advisory moves the NIX-SEC-06 floor (family NIX-SEC, with NIX-GATE-13 and NIX-GATE-16)

- Source: [GHSA-jwvx-xq5j-gc56](https://github.com/NixOS/nix/security/advisories/GHSA-jwvx-xq5j-gc56), published 2026-10-13, CVE-2026-110450, severity high. Unprivileged clients could corrupt store paths through the repair flag in AddToStoreNar and AddMultipleToStore. Patched in 2.35.3, 2.34.9, 2.31.6, 2.30.6 and 2.28.8. No fix is listed for the 2.29, 2.32 and 2.33 lines, which appear affected. The same day, [GHSA-hf6w-2rg9-v84g](https://github.com/NixOS/nix/security/advisories/GHSA-hf6w-2rg9-v84g) (bad store ownership in the multi-user scripted installer, moderate) was patched in the same releases, and [GHSA-25vp-6h23-hj3g](https://github.com/NixOS/nix/security/advisories/) (`builtins.genList` overflow) and GHSA-m4vq-qf6v-82pj (macOS seatbelt bypass) were published too (advisory list read at https://github.com/NixOS/nix/security/advisories). Lix fixed the same set in 2.94.3 and 2.95.4 ([Lix blog 2026-10-13](https://lix.systems/blog/2026-10-13-lix-cves/)), and Determinate Nix in 3.23.2 ([changelog 3.23.3, 2026-10-20](https://determinate.systems/blog/changelog-determinate-nix-3-23-3)).
- Old text: security.md `cve-floor.nix` stops at `"2.35" = "2.35.2"` and `"2.31" = "2.31.4"`; NIX-SEC-06 says "2.35.2 or later"; NIX-GATE-13 pins `nix-2.35.2`; the pair's floor `nix_2_31` is 2.31.5, which is now below the 2.31.6 fix. Status: changed.
- Draft rule: NIX-SEC-06 gains a second advisory row and the `cve-floor.nix` table takes the maximum fixed version per line across both advisories (2.28.8, 2.30.6, 2.31.6, 2.34.9, 2.35.3), and a line with no listed fix (2.29, 2.32, 2.33) is treated as unsafe for any host with an untrusted daemon client.
- Rationale: a CI or builder on 2.35.2 or 2.31.5 passes today's gate and is vulnerable. Verification: the NIX-SEC-06 command (`nix --version` read against the floor table) with the new table.
- Classification: documentation-only (a version table and its pinned install_url), except that the "unsafe lines" claim is worth one reading-heuristic line.
- Caveat: the advisory page did not show a CppNix fix for 2.29, 2.32 or 2.33; verify against the advisory before writing "no fix".

## 2. Daemon is not a security boundary for untrusted users; macOS sandbox is off by default (family NIX-SEC)

- Source: [Determinate 3.23.3 changelog, 2026-10-20](https://determinate.systems/blog/changelog-determinate-nix-3-23-3) (macOS sandbox escape needs the sandbox enabled, "off by default"; build-users-group not rejected on macOS) and [Lix advisory, 2026-10-13](https://lix.systems/blog/2026-10-13-lix-cves/) (the daemon is not a security boundary; run build farms with an unprivileged daemon user).
- Old text: security.md says `sandbox` defaults to true on Linux only and the macOS default "was not measured". Status: could not determine on CppNix; the Determinate text confirms off by default on macOS for Determinate Nix.
- Draft note: a macOS CI runner or builder that evaluates third-party flakes must set `sandbox = true` explicitly and must not treat the daemon as a boundary between untrusted users.
- Verification: `nix config show sandbox` on the macOS runner (already the pair's NIX-SEC command shape). Classification: needs a measured red/green pair (measure the macOS default on CppNix 2.35.3 first), otherwise documentation-only.

## 3. darwin.linux-builder leaks its SSH key into the store (family NIX-SEC, macOS CI builders)

- Source: [NixOS Discourse security advisory, 2026-11-06](https://discourse.nixos.org/t/security-advisory-darwin-linux-builder-leaks-its-ssh-private-key-into-the-nix-store-and-exposes-its-ssh-port-to-the-network/81001), GHSA-45qr-47fw-2p57 and GHSA-w5j5-2jpq-3cv3. Fixed in nixpkgs PRs 582262/582263 (unstable) and 582270/582271 (26.05). A builder started from an affected revision must have its key rotated and its disk image deleted.
- Old text: the pair has no mention of `linux-builder` (grep over rules and skills returned nothing). Status: new.
- Draft rule: never run `darwin.linux-builder` or nix-darwin `nix.linux-builder` from an unpatched nixpkgs revision in a gate, and treat a key from such a run as compromised.
- Verification: grep for `linux-builder` in tracked Nix and workflows, then read the pinned nixpkgs revision against the fix PRs. Classification: documentation-only (narrow audience).

## 4. nixpkgs 26.11 builder defaults a generated or packaged flake meets (families NIX-PKG, NIX-GEN)

- Source: [nixpkgs rl-2611 release notes, release-26.11 branch](https://raw.githubusercontent.com/NixOS/nixpkgs/release-26.11/doc/release-notes/rl-2611.section.md) (branch-off 2026-11-24 per [the cycle thread](https://discourse.nixos.org/t/let-s-have-a-great-26-11-release-cycle/80323)).
  - `buildPythonPackage` and `buildPythonApplication` set `__structuredAttrs = true` by default, warn on `unittestFlagsArray` (use `unittestFlags`), and deprecate overriding `disabled` in favour of `meta.problems.unsupportedPython`.
  - `rustPlatform.cargoSetupHook` now forces several common C libraries to link against nixpkgs versions; `dontCargoUseSystemLibs = true;` opts out.
  - `config.allowBrokenPredicate` is deprecated in favour of `config.problems.handlers`.
  - `writeTextFile` and `makeSetupHook` use structured attributes and `passAsFile` is gone; `replaceVarsWith` enables `strictDeps` and `__structuredAttrs`; `fetchPnpmDeps` `fetcherVersion` 1 and 2 throw; `writers.makeDataWriter` removed.
- Old text: packaging.md NIX-PKG-10 already demands `__structuredAttrs = true` and NIX-PKG-18 covers the `pyproject` builder; none of `unittestFlagsArray`, `dontCargoUseSystemLibs`, `config.problems`, `allowBrokenPredicate`, `passAsFile`, `makeDataWriter`, `fetchPnpmDeps` appear anywhere in the pair. Status: new facts, existing rules unchanged.
- Draft notes: (a) in NIX-PKG-10 state that nixpkgs 26.11 Python builders already default to structured attributes, so an explicit `__structuredAttrs = true` is redundant there but still required for `mkDerivation`; (b) add a "What Agents Get Wrong" entry for `unittestFlagsArray`, `disabled = ...`, `allowBrokenPredicate` and `passAsFile`, which models trained before 26.11 emit; (c) note `dontCargoUseSystemLibs` for a Rust package that must link vendored C libraries.
- Verification: grep `unittestFlagsArray|allowBrokenPredicate|passAsFile|makeDataWriter|fetcherVersion = [12]` over tracked Nix; evaluation on 26.11 shows the warnings. Classification: (b) documentation-only; (a) and (c) need a measured red/green pair, because a default change must be shown by building with and without the attribute on 26.11.

## 5. Lix 2.96 relaxes flake.nix validation, so portable flakes diverge (family NIX-FLK, NIX-GATE-16)

- Source: [Lix 2.96 release, 2026-10-13](https://lix.systems/blog/2026-10-13-lix-2.96-release/): "no function calls are allowed outside of `outputs`", so `let` blocks and string interpolation in `inputs` are accepted, and the announcement warns other implementations may not evaluate such flakes. Also removed `daemon-trust-override` (CppNix 2.36.0 stabilised it, per the [2.36 release notes, 2026-11-16](https://nix.dev/manual/nix/2.36/release-notes/rl-2.36)) and deprecated `ssh://` store URIs.
- Old text: gates.md says Lix "froze flake support" and gates it behind `flake-self-attrs`; no rule forbids computed `inputs`. Status: could not determine whether the pair's own text on Lix flake support still holds, since 2.96 still changes flake parsing.
- Draft rule: `inputs` is a literal attribute set with no `let`, interpolation or function call, even where Lix accepts more.
- Verification: the Lix advisory leg of NIX-GATE-16 plus a reading step on `inputs = ` blocks. Classification: needs a measured red/green pair (a flake with a `let` in inputs evaluated on CppNix 2.35.3 and Lix 2.96).

## 6. CppNix 2.36 behaviours that touch gate commands (family NIX-GATE, NIX-FLK)

- Source: [Nix 2.36.0 release notes, 2026-11-16](https://nix.dev/manual/nix/2.36/release-notes/rl-2.36).
  - `nix flake metadata`, `nix flake show` and `nix search` drop ANSI styling when stdout is not a terminal or `NO_COLOR` is set.
  - `builtins.pathExists` no longer swallows access errors from evaluating its argument; this restores 2.19 behaviour and can turn a silent false into an error.
  - `nix run`, `nix search` and `nix bundle` auto-call functions passed through `--file` or `--expr` when all arguments have defaults.
  - A path-like flake reference inside a Mercurial checkout resolves to `hg+file:`.
  - `impersonate-linux-26` was removed, so `nix develop` no longer disables ASLR.
- Old text: gates.md and flakes.md parse command output in several places and name only 2.35.2; packaging.md mentions `pathExists`. Status: unchanged on 2.35, changed on 2.36.
- Draft note: any gate that greps `nix flake show` or `nix search` output must not rely on ANSI codes, and a NIX-GATE-16 floor leg on 2.36 should be added once a 2.36 patch release lands.
- Verification: run the pair's flake-show greps on 2.36.0. Classification: needs a measured red/green pair (the pair measured on 2.35.2 only); a 2.36 version bump itself belongs to the version-bump brief.

# Categories with nothing in the window

- NixOS/nix `flake.lock` version, `nix flake check` behaviour, flake schemas, new `nixConfig` whitelist: none found in the 2.36.0 release notes (they state no lock-file or `nixConfig` change). Lazy trees landed earlier, in 2.35.0 (2026-06-22), before the window.
- Merged or FCP RFCs: none found (the NixOS/rfcs merged-PR query for 2026-09-27 to 2026-11-27 returned zero results).
- nixfmt or formatting standard change: none found. The [Formatting Team meeting of 2026-11-11](https://discourse.nixos.org/t/formatting-team-meeting-2026-11-11/81145) discussed nixfmt issues and a lexer performance merge only.
- New `lib` functions replacing an idiom the pair teaches: none found. The 26.11 "Nixpkgs Library" additions section is an empty placeholder.
- New nixpkgs-vet or mandatory nixpkgs CI checks: none found in the release notes or cycle thread.
- Tool archived or replaced as a community default for a gate step: none found. A search for deprecation of Determinate's flake-checker-action, nix-installer-action and magic-nix-cache-action found no 2026 announcement, and the [Determinate GitHub Actions guide](https://docs.determinate.systems/guides/github-actions/) (last updated 2025-11-10) shows no deprecation notice. A forum reply in the [Nix 2.36.0 thread](https://discourse.nixos.org/t/nix-2-36-0-released/81345) calls nix-serve unmaintained and points to harmonia; this is one comment, not a decision, and the pair does not name nix-serve.
- home-manager, nix-darwin and flake-parts module export conventions: none found in the sources read.
- Hydra vulnerabilities (path traversal, stored XSS, SQL injection, [2026-11-03 and 2026-11-17](https://discourse.nixos.org/t/recent-security-vulnerabilities-in-hydra/80913)): not relevant to flake authoring, and the pair does not cover Hydra deployment. Not a candidate.
- Determinate Nix `nix flake bake` (baked flakes, experimental, 3.23.3): not a rule candidate; NIX-SEC-09 already bans experimental features beyond `nix-command flakes` in CI.

# Claims at risk, status

- x86_64-darwin dropped in 26.11: unchanged (gates.md already carries the error line).
- `nixexprs.tar.zst` preferred, `nixexprs.tar.xz` discontinued with 27.05 after 2027-12-31: unchanged (NIX-INP-05 already requires `.tar.zst`); the 2027-12-31 date could be added as a one-clause note.
- CVE-2026-39860 floor table: changed, see candidate 1.
- Pinned `install_url` nix-2.35.2: changed, see candidate 1.
- macOS `sandbox` default: could not determine for CppNix.
- Everything else in the pair: unchanged or not examined, since nothing in the window contradicts it.
