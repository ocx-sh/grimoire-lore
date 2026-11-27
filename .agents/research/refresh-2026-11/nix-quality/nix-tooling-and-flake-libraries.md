---
title: Nix formatters, linters, helper tools and flake libraries, delta 2026-09-27 to 2026-11-27
pair: nix-quality
date_researched: 2026-11-27
window_start: 2026-09-27
model: sonnet
sources_fetched: 30
---

# Delta: Nix tooling and flake libraries

This is a delta update of the baseline research dated 2026-09-27. Anything not listed as changed stays as written. The GitHub REST API was rate limited, so release data comes from each project's `releases.atom`, `commits` atom, raw files on `raw.githubusercontent.com`, and the packaged versions on `nixos-unstable` (raw `pkgs/by-name/*/package.nix`). WebFetch summaries are produced by a small model, so every load-bearing fact below was cross-checked against a raw file or a second page where possible.

## Summary

- No tool in the stamp line has a new release inside the window. nixfmt 1.5.0 (2026-09-10), treefmt 2.6.0 (2026-08-31), deadnix 1.3.2 (2026-07-26), nurl 0.4.1 (2026-08-29) and nixf-diagnose 0.1.4 (2025-09-20) are still current upstream and on nixos-unstable. The stamps hold.
- nix-update released 1.17.0 on 2026-11-22. nixos-unstable still packages 1.16.0. The rewrite makes the release.md claim about `replace_hash` textually stale (see claim R1).
- nixpkgs `nixos-unstable` `aliases.nix` still matches NIX-GATE-03 for `nixfmt-classic` and `nixfmt-rfc-style`. `nixpkgs-fmt` 1.3.0 is still a package.
- flake-utils had commits again: 2026-10-13, 2026-10-22 and 2026-11-11. NIX-FLK-08 "no commit since 2024-11-13" is wrong. Rule text must change.
- `nix-systems/default` `main` and the `future-26.11` branch now both list only `aarch64-darwin`, `aarch64-linux`, `x86_64-linux`. NIX-FLK-08's statement that `nix-systems/default` still carries `x86_64-darwin` is wrong for `main` as of 2026-10-05. Rule text must change.
- `nix-community/flake-compat` is now archived (2025-10-28) and says "This fork is no-longer maintained." It is stronger than "self-declared unmaintained". `edolstra/flake-compat` still answers HTTP 301 to `NixOS/flake-compat`. NIX-REL-05 holds; the wording can be tightened.
- flake-parts has no code change after `31729ca8` (2026-09-03); later commits are lock updates only.
- statix: the repository master is active (dependabot only seen) and its `bin/Cargo.toml` says version `0.6.0`, but the last tag is still v0.5.8 (2023-09-09). nixpkgs still packages `0.5.8-unstable-2026-07-17`. Needs re-measurement of real code changes since 2026-07-17.

## Findings

### 1. Versions and dates

| Tool | Current upstream | Date | On nixos-unstable | Source |
|---|---|---|---|---|
| nixfmt | 1.5.0 | 2026-09-10 | 1.5.0 (`generated-package.nix`) | [CHANGELOG](https://raw.githubusercontent.com/NixOS/nixfmt/master/CHANGELOG.md), [nixpkgs](https://raw.githubusercontent.com/NixOS/nixpkgs/nixos-unstable/pkgs/by-name/ni/nixfmt/generated-package.nix) |
| treefmt | 2.6.0 | 2026-08-31 | 2.6.0 | [releases atom](https://github.com/numtide/treefmt/releases.atom), [nixpkgs](https://raw.githubusercontent.com/NixOS/nixpkgs/nixos-unstable/pkgs/by-name/tr/treefmt/package.nix) |
| deadnix | 1.3.2 | 2026-07-26 | 1.3.2 | [releases atom](https://github.com/astro/deadnix/releases.atom), [nixpkgs](https://raw.githubusercontent.com/NixOS/nixpkgs/nixos-unstable/pkgs/by-name/de/deadnix/package.nix) |
| statix (molybdenumsoftware) | no tag after v0.5.8 (2023-09-09); master `bin/Cargo.toml` `version = "0.6.0"` | master active 2026-11-27 (dependabot) | 0.5.8-unstable-2026-07-17 | [tags](https://github.com/molybdenumsoftware/statix/tags), [commits atom](https://github.com/molybdenumsoftware/statix/commits/master.atom), [nixpkgs](https://raw.githubusercontent.com/NixOS/nixpkgs/nixos-unstable/pkgs/by-name/st/statix/package.nix) |
| nixf-diagnose | 0.1.4 | 2025-09-20 | 0.1.4 | [tags](https://github.com/inclyc/nixf-diagnose/tags), nixpkgs `ni/nixf-diagnose` |
| nixd (nixf) | 2.9.4 | 2026-10-31 | not checked | [releases atom](https://github.com/nix-community/nixd/releases.atom) |
| nix-update | 1.17.0 | 2026-11-22 | 1.16.0 | [releases atom](https://github.com/Mic92/nix-update/releases.atom), [nixpkgs](https://raw.githubusercontent.com/NixOS/nixpkgs/nixos-unstable/pkgs/by-name/ni/nix-update/package.nix) |
| nurl | 0.4.1 | 2026-08-29 | 0.4.1 | [CHANGELOG](https://raw.githubusercontent.com/nix-community/nurl/main/CHANGELOG.md), nixpkgs `nu/nurl` |
| flake-utils | no release; commits 2026-10-13, 2026-10-22, 2026-11-11 | 2026-11-11 | n/a | [commits atom](https://github.com/numtide/flake-utils/commits/main.atom) |
| nix-systems/default | `main` HEAD `d36eeed` | 2026-10-05 | n/a | [commits atom](https://github.com/nix-systems/default/commits/main.atom) |
| flake-parts | HEAD `ea2630b7` (lock update) | 2026-11-01 | n/a | [commits atom](https://github.com/hercules-ci/flake-parts/commits/main.atom) |
| NixOS/flake-compat | last commits 2025-12-29 | 2025-12-29 | n/a | [commits atom](https://github.com/NixOS/flake-compat/commits/master.atom) |
| crane | v0.24.0 | 2026-08-21 | not checked | [releases atom](https://github.com/ipetkov/crane/releases.atom) |
| home-manager | no release feed entries read | n/a | n/a | flake-module.nix read directly |

nixd 2.9.3 and 2.9.4 notes name no nixf-diagnose diagnostic ids. 2.9.4 adds "Recursively merges attrsets in libnixf/Sema (#910)", which may touch the `merge-diff-rec` area; the id itself was not located in this run.

### 2. Claim verdicts

**Stamps ("nixfmt 1.5.0 (nixfmt-tree 2.6.0), deadnix 1.3.2", "statix 0.5.8-unstable-2026-07-17, nixf-diagnose 0.1.4").** Unchanged, with one caveat. nixfmt-tree is a nixpkgs wrapper whose version tracks treefmt 2.6.0 per the baseline; both are unchanged. Statix: needs re-measurement (see S1).

**NIX-GATE-02, nixfmt directory warning.** Unchanged. `main/Main.hs` on master (the 1.5.0 era) still prints `Passing directories or non-Nix files (such as "<path>") is deprecated and will be unsupported soon. Please use the nixfmt-tree wrapper instead...` and directory mode still runs ([Main.hs](https://raw.githubusercontent.com/NixOS/nixfmt/master/main/Main.hs), lines 122-134). It is not yet unsupported. New unrelated nixfmt facts: 1.3.0 (2026-05-26) deprecated formatting stdin without a `-` argument (bare invocation warns `Bare invocation of nixfmt is deprecated. Use 'nixfmt -' for anonymous stdin.`); 1.4.0 added `/*nixfmt:disable*/` and `/*nixfmt:enable*/`; 1.5.0 added `--follow-symlinks`. These predate the window or are additive, so no rule text changes.
treefmt `--ci`: unchanged. `cmd/format/format.go` still defines `ErrFailOnChange = errors.New("unexpected changes detected, --fail-on-change is enabled")` ([source](https://raw.githubusercontent.com/numtide/treefmt/main/cmd/format/format.go)). treefmt has no release after 2.6.0 in the window.

**NIX-GATE-03.** Unchanged. `aliases.nix` on nixos-unstable: `nixfmt-classic = throw "nixfmt-classic has been removed as it is deprecated and unmaintained."; # Converted to throw 2026-07-01` and `nixfmt-rfc-style = warnAlias "... same as pkgs.nixfmt ..." nixfmt; # Added 2025-07-14`. `nixpkgs-fmt` has no alias line and `pkgs/by-name/ni/nixpkgs-fmt/package.nix` is at version 1.3.0, so it still evaluates ([aliases.nix](https://raw.githubusercontent.com/NixOS/nixpkgs/nixos-unstable/pkgs/top-level/aliases.nix)). The archive date 2024-07-24 was not re-fetched.

**NIX-GATE-05, deadnix flags.** Unchanged. `src/main.rs` on main still defines `--fail` (`-f`), `--no-lambda-pattern-names` (`-L`), `--no-lambda-arg` (`-l`), `--exclude` and `--edit` (`-e`) ([main.rs](https://raw.githubusercontent.com/astro/deadnix/main/src/main.rs)). No release after 1.3.2.

**NIX-GATE-06, statix.** W12 (unquoted URI) and W17 (deprecated `toPath`) still carry `code = 12` and `code = 17` on master (`lib/src/lints/unquoted_uri.rs`, `deprecated_to_path.rs`). The `disabled` config key is still `disabled: Vec<String>` filtered by lint name in `bin/src/config.rs`. Individual lint names in the committed `disabled` list were not re-checked. Verdict: unchanged for codes and key; needs re-measurement for the pinned-build behaviour (S1).

**NIX-GATE-07, nixf-diagnose.** The `-i/--ignore <ID>` option still exists in the README ("Ignore diagnostics with specific ids", repeatable), along with `-o/--only`, `--auto-fix`, `--variable-lookup`. The two diagnostic ids `sema-unused-def-lambda-noarg-formal` and `merge-diff-rec` were not located in this run (the nixd source path I tried returned 404). nixf-diagnose has no release since 0.1.4. Verdict: option unchanged; ids could not determine.

**R1, release.md nix-update claim.** Changed. Baseline: "nix-update 1.16.0. Its `replace_hash` substitutes the evaluated old hash as text ... The `cargoHash` path is read from the code, not run".
- New fact: on `main`, `replace_hash` in `nix_update/dependency_hashes.py` is now `path.write_text(replace_in_strings(path.read_text(), current, normalized_hash))`, which edits only Nix string literals through a syntax tree, and the release notes of 1.17.0 say Nix files "are edited through a syntax tree instead of text replacement, so unrelated identifiers are no longer rewritten" and `cargoLock.outputHashes` updates keep other attributes intact ([1.17.0 notes via releases page](https://github.com/Mic92/nix-update/releases), [dependency_hashes.py](https://raw.githubusercontent.com/Mic92/nix-update/main/nix_update/dependency_hashes.py)). Date of upstream change: 2026-11-22.
- nixos-unstable still ships 1.16.0, so the rule's measured behaviour is still true of the packaged tool but not of the latest upstream. The 1.17.0 notes do not mention `cargoHash`. In the same file `cargo_deps` still goes through `update_hash_with_prefetch("cargoDeps")` and `cargo_lock` through `update_cargo_lock`, which is consistent with the baseline reading but not a run.
- Also new in 1.17.0: `tag` is preferred over `rev`; unchanged versions without `rev` or `tag` are skipped; `--version=skip` updates hashes only when needed; `--build` runs only when something changed. NIX-REL-13 mentions `nix-update -F --version=X` rewriting hash with a literal ref; the "unchanged versions without rev or tag are skipped" and "tag preferred over rev" fixes may change that failure mode. Verdict: needs re-measurement on 1.17.0 before the rule text changes the stamp.

**nurl, packaging.md.** Unchanged version. nurl 0.4.1 (2026-08-29) only fixes `fetchCrate` 403 by switching to `static.crates.io`. 0.4.0 (2026-02-06) already changed output to `tag = "...";` instead of `rev` for all fetchers and added `--overwrite-rev`. The claim "prints `tag = "<hex>"` for any argument that is not exactly 40 hex" was not re-run; the changelog does not contradict it.

**NIX-FLK-08 flake-utils.** Changed. Old text: "flake-utils has had no commit since 2024-11-13". New fact: commits on `main` on 2026-10-13 (merge of PR #127 "ci: install Nix with NixOS/nix-installer-action", commit `b7a79d3`), 2026-10-22 ("flake.lock: Update") and 2026-11-11 (merge of PR #128, bumping the locked `systems` input to a 2026-10-05 revision, closing issue #124 about x86_64-darwin removal). Sources: [commits atom](https://github.com/numtide/flake-utils/commits/main.atom), [PR 127](https://github.com/numtide/flake-utils/pull/127), [PR 128](https://github.com/numtide/flake-utils/pull/128). The commits are CI and lock maintenance only; no change to `lib` code was seen. The README carries no deprecation notice. The rule's conclusion (do not use flake-utils) can stay, but the "no commit" rationale must be reworded, for example "flake-utils's `eachDefaultSystem` still iterates `flake-utils`'s own default systems list". Whether that list drops `x86_64-darwin` was not measured: needs re-measurement (`grep -n darwin default.nix` in the flake-utils tree via its `systems` input).

**NIX-FLK-08 nix-systems.** Changed. Old text: "`nix-systems/default` still carr[ies] `x86_64-darwin`" and "`nix-systems/default/future-26.11` and `default-linux` carry no `x86_64-darwin`". New fact: both `main` and `future-26.11` now return the three-element list `aarch64-darwin`, `aarch64-linux`, `x86_64-linux` from `default.nix`, and the README matches. PR #3 "readme: remove `x86_64-darwin`" (base `future-26.11`) was merged 2026-10-05 as `d36eeed`, and the `main` commit feed shows the same head ([raw main default.nix](https://raw.githubusercontent.com/nix-systems/default/main/default.nix), [raw future-26.11](https://raw.githubusercontent.com/nix-systems/default/future-26.11/default.nix), [PR 3](https://github.com/nix-systems/default/pull/3)). Two interpretations remain: main may have been fast-forwarded to the future branch, or the baseline reading of `main` was stale. Both leave the same present fact. Consequence: the clause "never use `nix-systems/default` unless it is overridden to a list without `x86_64-darwin`" is no longer needed for an unpinned `main` input, but any lock pinned to an older revision (for example the 2023-04-09 revision flake-utils locked until 2026-11-11) still has four systems. The rule should say "a locked `nix-systems/default` revision from before 2026-10-05 carries `x86_64-darwin`". The `future-26.11` branch still exists. `default-linux` and `default-darwin` last updated 2023-07-14. The repository now also has a `triplet` sibling (updated 2026-04-14).

**NIX-FLK-10 and NIX-MOD-08, flake-parts.** Unchanged. `31729ca8` (2026-09-03, "default moduleLocation: avoid copy to store") is still the last non-lock change; later commits (`ea2630b7` 2026-11-01, `024633cd` 2026-10-01, `5bc9fbcb`, `d26f9783`, `57b75965`, `bc1363fc`) are `flake.lock` and `dev/flake.lock` updates. The `_file`, `key` and `_class = "flake"` claim was not re-read at the new HEAD, but no code commit exists after the pin.

**NIX-REL-05 flake-compat.** Changed in strength only. `nix-community/flake-compat` is archived: "This repository was archived by the owner on Oct 28, 2025. It is now read-only." with README text "This fork is no-longer maintained" and "Flake-compat is now an official NixOS project living at https://github.com/NixOS/flake-compat" ([page](https://github.com/nix-community/flake-compat)). `https://github.com/edolstra/flake-compat` still answers HTTP 301 to `https://github.com/NixOS/flake-compat`. `NixOS/flake-compat` is not archived, has 14 open issues and 8 open pull requests, and its last commits are 2025-12-29. The rule text can say "archived 2025-10-28" in place of "self-declared unmaintained, checked 2026-09-27". The rule itself is unchanged.

**NIX-MOD-02 home-manager.** Unchanged for the defining half. `flake-module.nix` defines `homeModules` (type `lazyAttrsOf deferredModule`, `_class = "homeManager"`, `_file = ...#homeModules.<k>`) and has no `homeManagerModules` option. The root `flake.nix` defines `nixosModules`, `darwinModules` and `flakeModules`. The "homeManagerModules is a deprecated alias" half was not located in code: could not determine whether home-manager still exports an alias; the rule only says third-party flakes keep it as a deprecated alias, which is a naming statement.

**NIX-PKG-15 crane.** Unchanged. `lib/cleanCargoSource.nix` still exists on crane master. v0.24.0 (2026-08-21) is the latest and drops Nix below 2.31.2, nixpkgs-25.11 and x86_64-darwin flake entries; this predates the window and does not touch `cleanCargoSource`. Note: Nix below 2.31.2 dropped. A consumer floor stated in the pair (CppNix 2.31.5) remains above that bound.

## Normative guidance candidates

1. **Reword NIX-FLK-08's flake-utils rationale.** Rule: replace "flake-utils has had no commit since 2024-11-13" with "flake-utils is CI and lock maintenance only since 2024-11-13 (last 2026-11-11)". Rationale: the stated fact is false and an agent verifying it would distrust the whole row. Verification: reviewer runs `git log -1 --format=%cs` on a flake-utils checkout, or reads the [commits atom](https://github.com/numtide/flake-utils/commits/main.atom).
2. **Reword NIX-FLK-08's nix-systems clause.** Rule: "a `nix-systems/default` revision locked before 2026-10-05 carries `x86_64-darwin`; `main` and `future-26.11` do not." Rationale: `main` now lists three systems, so a blanket ban misstates the state. Verification: `grep -c darwin default.nix` in the locked `nix-systems` store path, or `nix flake metadata --json | jq '.locks.nodes.systems.locked.rev'` compared with `d36eeed`.
3. **Tighten NIX-REL-05 wording.** Rule: "`nix-community/flake-compat` is archived since 2025-10-28." Rationale: archived is verifiable and stronger than self-declared. Verification: repository page banner, or `gh repo view nix-community/flake-compat --json isArchived`.
4. **Hold the nix-update stamp pending re-measurement.** Rule: keep "nix-update 1.16.0" and add "1.17.0 (2026-11-22) rewrites `replace_hash` through a syntax tree" only after re-running the NIX-REL-13 watched-red cases on 1.17.0. Rationale: 1.17.0 changes the literal-`tag` failure mode (tag preferred over rev, unchanged versions skipped). Verification: the NIX-REL-13 URL assertion with `nix-update -F --version=X` on a `tag = "v0.2.14"` twin.
5. **Statix pin.** Rule: keep `0.5.8-unstable-2026-07-17` until nixpkgs moves, and add a re-check at the next branch-off per gates.md. Rationale: master reports `0.6.0` in `bin/Cargo.toml` with no tag, so the version string the gate quotes can change without a release. Verification: `statix --version` and the NIX-GATE-06 watched cases.

## AI-agent angle

- An agent trained before 2026 writes `nix-systems/default` as "carries x86_64-darwin". Mechanical check: print the locked list (`nix eval --impure --expr 'import (builtins.fetchTree { type = "github"; owner = "nix-systems"; repo = "default"; rev = "<locked rev>"; })'`).
- An agent writes `nixfmt --check .` or `nixfmt .`. Directory mode still runs but warns; the NIX-GATE-02 command (`nix fmt -- --ci`) is the check.
- An agent picks a flake-compat URL from old posts (`edolstra/flake-compat`, `nix-community/flake-compat`). The NIX-REL-05 grep still catches both.
- An agent assumes `nix-update` text-replaces and writes a repeated hash literal as a workaround; on 1.17.0 only string literals are edited. Check by diffing after a bump.
- An agent reads a repository's `Cargo.toml` version (statix `0.6.0`) as a released version. Check `git tag` and the nixpkgs `version` attribute.

## Contested / evolving

- nix-systems is moving the default list toward three systems with `future-26.11`; as of 2026-10-05 `main` agrees. Trend: the `triplet` repository exists as a stable three-system sibling, and PR #3's question about its fate is unanswered.
- flake-utils is not dead but maintenance-only; the stronger recommendation (migrate off it) rests on design, not on inactivity.
- statix: a maintained fork with dependabot-only commits visible in the 2026-11-27 feed; real feature work since 2026-07-17 was not seen.
- nixfmt directory mode: "will be unsupported soon" has stood since 1.0.0 and is still not enforced at 1.5.0.

## Sources

| URL | What | Date/era | Why |
|---|---|---|---|
| https://github.com/NixOS/nixfmt/releases.atom | nixfmt releases | to 2026-09-10 | version, release dates |
| https://raw.githubusercontent.com/NixOS/nixfmt/master/CHANGELOG.md | nixfmt changelog | 2026-09-10 | flags and deprecations |
| https://raw.githubusercontent.com/NixOS/nixfmt/master/main/Main.hs | nixfmt CLI source | 1.5.0 era | directory warning text |
| https://github.com/numtide/treefmt/releases.atom | treefmt releases | to 2026-08-31 | version |
| https://raw.githubusercontent.com/numtide/treefmt/main/cmd/format/format.go | treefmt source | current | `--fail-on-change` message |
| https://github.com/astro/deadnix/releases.atom | deadnix releases | 2026-07-26 | version |
| https://raw.githubusercontent.com/astro/deadnix/main/src/main.rs | deadnix CLI | current | flags |
| https://github.com/molybdenumsoftware/statix/commits/master.atom | statix commits | 2026-11-27 | activity |
| https://github.com/molybdenumsoftware/statix/tags | statix tags | last 2023-09-09 | release status |
| https://raw.githubusercontent.com/molybdenumsoftware/statix/master/bin/Cargo.toml | statix manifest | current | 0.6.0 |
| https://github.com/nix-community/nixd/releases.atom | nixd releases | to 2026-10-31 | nixf changes |
| https://raw.githubusercontent.com/inclyc/nixf-diagnose/main/README.md | nixf-diagnose options | current | `-i` flag |
| https://github.com/inclyc/nixf-diagnose/tags | tags | 2025-09-20 | version |
| https://github.com/Mic92/nix-update/releases.atom | nix-update releases | 2026-11-22 | version |
| https://github.com/Mic92/nix-update/releases | 1.17.0 notes | 2026-11-22 | syntax-tree edit |
| https://raw.githubusercontent.com/Mic92/nix-update/main/nix_update/dependency_hashes.py | nix-update source | current | `replace_hash` |
| https://raw.githubusercontent.com/nix-community/nurl/main/CHANGELOG.md | nurl changelog | 2026-08-29 | `tag` output |
| https://github.com/numtide/flake-utils/commits/main.atom | flake-utils commits | to 2026-11-11 | activity |
| https://github.com/numtide/flake-utils/pull/127 | CI PR | 2026-10-13 | nature of commit |
| https://github.com/numtide/flake-utils/pull/128 | lock PR | 2026-11-11 | nature of commit |
| https://raw.githubusercontent.com/nix-systems/default/main/default.nix | systems list | 2026-10-05 | three systems |
| https://raw.githubusercontent.com/nix-systems/default/future-26.11/default.nix | systems list | 2026-10-05 | three systems |
| https://github.com/nix-systems/default/pull/3 | README PR | 2026-10-05 | merge date |
| https://github.com/hercules-ci/flake-parts/commits/main.atom | flake-parts commits | to 2026-11-01 | lock-only since pin |
| https://github.com/nix-community/flake-compat | archived repo | 2025-10-28 | maintenance status |
| https://github.com/NixOS/flake-compat/commits/master.atom | flake-compat commits | 2025-12-29 | activity |
| https://raw.githubusercontent.com/nix-community/home-manager/master/flake-module.nix | home-manager flake module | current | `homeModules` |
| https://github.com/ipetkov/crane/releases.atom | crane releases | to 2026-08-21 | version |
| https://raw.githubusercontent.com/NixOS/nixpkgs/nixos-unstable/pkgs/top-level/aliases.nix | nixpkgs aliases | 2026-11 | removal status |
| https://raw.githubusercontent.com/NixOS/nixpkgs/nixos-unstable/pkgs/by-name/st/statix/package.nix | nixpkgs statix | 2026-11 | packaged version |
