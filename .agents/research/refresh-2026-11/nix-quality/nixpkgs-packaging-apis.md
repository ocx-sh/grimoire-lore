---
title: nixpkgs builder, hook, lib and policy behaviours, delta 2026-09-27 to 2026-11-27
pair: nix-quality
date_researched: 2026-11-27
window_start: 2026-09-27
model: sonnet
sources_fetched: 33
---

# nixpkgs builder, hook, lib and policy behaviours: delta update

This is a delta update of the earlier nix-packaging, nix-flakes, nix-generated-flakes, nix-release and nix-modules research. It reports only upstream changes dated 2026-09-27 to 2026-11-27 on nixpkgs master or in the 26.11 release, plus an "unchanged" verdict for each claim at risk.

Method and limits. The GitHub REST API was rate limited (5,000 per hour used up by the shared account), so every commit date below comes from the public GitHub commit-history pages (`github.com/NixOS/nixpkgs/commits/master/<path>`). Current-state facts come from raw files on `master` fetched on 2026-11-27 (`raw.githubusercontent.com/NixOS/nixpkgs/master/...`). Individual commit pages do not show dates, so a date is stated only where a history page printed it. The 26.11 release notes were read from `doc/release-notes/rl-2611.section.md` on master, which is the unreleased 26.11 file and still moving. Nothing was measured by building; every "unchanged" verdict is a source reading, not a re-measurement.

## Contents

1. Summary
2. Findings per claim
3. Normative guidance candidates
4. AI-agent angle
5. Contested and evolving
6. Sources

## Summary

- Nothing the pair quotes was removed, renamed or turned into a throw in the window. Eleven of the sixteen claim groups are unchanged.
- `versionCheckHook` is unchanged: its directory has no commit in the window. The last change was 2026-05-25 (license metadata). The `--version`-then-`--help` order dates from 2025-11-20.
- `pkgs.system` is still `warnAlias` on master (marked "Converted to warning 2025-10-28"), with the same text. NIX-FLK-12 stands.
- `--replace` is still not removed. [nixpkgs#356002](https://github.com/NixOS/nixpkgs/issues/356002) is still open, with only cross-reference activity (latest 2026-10-08).
- CHANGED, new in the window: `buildPythonPackage` and `buildPythonApplication` warn when `__structuredAttrs = true` or `strictDeps = true` is set explicitly, because both are now the default (commit ba375ac, 2026-11-24). NIX-PKG-10 says "Set `__structuredAttrs = true`" and is now wrong for Python builders.
- CHANGED, new in the window: nixpkgs-vet gained two ratchets, "must not use a list for `meta.license`" (2026-11-03, PR 316) and "must not enable `dontCargoUseSystemLibs`" (2026-11-22, PR 326). The strictDeps and `__structuredAttrs` ratchets still exist with the same text.
- CHANGED, 26.11 release notes (undated in the file): `rustPlatform.cargoSetupHook` now forces common C libraries (aws-lc, openssl, libz, libsqlite3, zstd, libgit2 and others) to link the nixpkgs copy. `dontCargoUseSystemLibs = true` opts out, and nixpkgs-vet now bans that opt-out for new by-name packages.
- `buildRustPackage` internals changed without altering the pair's claims: `cargoHash` is read from `finalAttrs` (2026-10-22) and the `useFetchCargoVendor` option and its warning were deleted (2026-10-23).
- `fetchCargoVendor`, `importCargoLock` (one hash per git revision) and `allowBuiltinFetchGit` keep their semantics. `importCargoLock` gained `strictDeps` and `__structuredAttrs` on its internal derivations (2026-10-26), which changes no hash input the pair documents.
- `check-meta.nix` was refactored to use `lib.licenses` helpers on 2026-11-05 and the refactor was reverted the same day. Master still contains `any (l: !l.free or false) licenses` inside `isUnfree`. The NIX-GEN-14 quote survives, but this is churn: re-check before the 26.11 release.
- `lib/fileset` has no commit in the window (newest 2026-09-17). The quoted `gitTrackedWith` comment is still at `lib/fileset/default.nix`.
- `lib.types.pathWith { inStore = false; }`, `lib.mkPackageOption`, `pkgs.formats` and `nixosModules.readOnlyPkgs` have no behavioural change in the window. `lib/options.nix` newest commit 2026-08-10, `read-only.nix` newest 2026-01-22, `pkgs/pkgs-lib/formats.nix` newest 2026-09-06, all before the window.
- `lib.derivations.warnOnInstantiate` has no commit since 2026-07-01. `mkRenamedOptionModule` is still exported from `lib`.
- `makeWrapper`: one addition in the window, `makeBinaryWrapper` gained options to accept empty segments in `--suffix` and `--prefix` (2026-10-11). The flags NIX-GEN-20 and NIX-GEN-22 rely on are unchanged.
- Could not determine: r-ryantm and `nix-update-script` behaviour (NIX-REL-14). `nix-update.nix` is unchanged since 2024-09-17, but the nixpkgs-update repository page did not load.

## Findings

Verdict key: unchanged, changed (old text, new fact, source, upstream date), could not determine.

### 1. versionCheckHook (NIX-PKG-13, NIX-PKG-19): unchanged

- Claim: with no `versionCheckProgramArg` the hook runs `meta.mainProgram --version`, then `--help`, and passes when either output contains `version`. Also `versionCheckProgramArg` and `versionCheckProgram`.
- The commit history of [`pkgs/by-name/ve/versionCheckHook`](https://github.com/NixOS/nixpkgs/commits/master/pkgs/by-name/ve/versionCheckHook) has no commit in the window. Newest is 2026-05-25 "treewide: set meta.license on hooks". "versionCheckHook: Check for --version first" is 2025-11-20.
- The master [`hook.sh`](https://raw.githubusercontent.com/NixOS/nixpkgs/master/pkgs/by-name/ve/versionCheckHook/hook.sh) was read on 2026-11-27. It resolves the program from `versionCheckProgram`, then `NIX_MAIN_PROGRAM`, then `pname` (with a deprecation warning). Without `versionCheckProgramArg` it loops over `--version` then `--help`. It matches `[[ "$versionOutput" =~ "$version" ]]` and exits 2 on a miss. Failure text is `Did not find version ... in the output of the command ...`.
- Verdict: unchanged. A fine point the existing rule can keep: the fallback to `pname` still exists but is documented as deprecated; the hook still emits the warning text "does not have the `meta.mainProgram` attribute".

### 2. Bare `--replace` (NIX-PKG-12): unchanged

- [nixpkgs#356002](https://github.com/NixOS/nixpkgs/issues/356002) is open. Title "Tracking: `substitute*` functions `--replace` -> `--replace-fail`", opened 2024-11-14, latest activity 2026-10-08 (a package commit referencing it). About 7,000 in-tree uses are still cited. The issue says bare `--replace` "currently uses the behavior of `--replace-warn`".
- The [`setup.sh` history](https://github.com/NixOS/nixpkgs/commits/master/pkgs/stdenv/generic/setup.sh) shows three commits in the window (2026-10-08, two on 2026-10-18) and none concerns substitute. The 2026-10-18 pair is a commit and its revert ("stdenv: run pre/post hooks automatically").
- Verdict: unchanged. The exit-0 behaviour was not re-measured; the issue wording implies it. The claim "re-check at each nixpkgs release" stays valid: 26.11 notes do not mention removal.

### 3. strictDeps and `__structuredAttrs` ratchets (NIX-PKG-09, NIX-PKG-10): partly changed

- [nixpkgs-vet README](https://raw.githubusercontent.com/NixOS/nixpkgs-vet/main/README.md) still says: "New top-level packages must evaluate with `strictDeps = true`" and "New top-level packages must evaluate with `__structuredAttrs = true`", each with "can't regress to `false`". Unchanged.
- New ratchets in the same README: "New top-level packages must not use a list for `meta.license`" (nixpkgs-vet commit "Ensure meta.license is not a list (#316)", 2026-11-03) and "New top-level packages must not enable `dontCargoUseSystemLibs`" (nixpkgs-vet "Ban dontCargoUseSystemLibs (#326)", 2026-11-22). The README says nothing about `--replace`.
- `env` error text: not re-fetched. No stdenv change in the window touches `env` validation (setup.sh history above). Verdict: could not determine a change; no evidence of one.
- CHANGED for Python: old claim "Set `__structuredAttrs = true`" (NIX-PKG-10, general). New fact: `mk-python-derivation.nix` on master now does `warn "Explicitly setting `__structuredAttrs = true;` for Python package ${name} is redundant"` and the same for `strictDeps`. Introduced by "python3Packages.mkPythonDerivation: warn if strictDeps or __structuredAttrs are redundantly set to true" (ba375ac, 2026-11-24, [history](https://github.com/NixOS/nixpkgs/commits/master/pkgs/development/interpreters/python/mk-python-derivation.nix)). The 26.11 release notes say: "`buildPythonPackage` and `buildPythonApplication` now set `__structuredAttrs = true` by default."
- Other builders that now enable both by default in 26.11 (release notes, dates not in the file): `bundlerApp` (`__structuredAttrs`), `buildGoModule.goModules` (both), `tcl.mkTclDerivation`, `fetchurl` (`strictDeps`), `replaceVarsWith`/`replaceVars` (both, passing them is now an error), `makeSetupHook` (structured attributes, only `substitutions` are substituted). For these, an explicit `true` is redundant and, for `replaceVarsWith`, forbidden.

### 4. Rust builders (NIX-PKG-01, NIX-PKG-15, NIX-PKG-22): unchanged in contract

- `cargoSha256`: master `build-rust-package/default.nix` has no `cargoSha256` anywhere (grep empty), so it is not accepted as an attribute. Together with the 25.05 claim, unchanged. The legacy `sha256 =` on generic fetchers: no change found, but not re-measured.
- `fetchCargoVendor` is still the vendoring path (`fetchCargoVendor (` at line 106 of master). Window changes: "buildRustPackage: use cargoHash from finalAttrs" (5c99496, 2026-10-22) so `overrideAttrs` on `cargoHash` is now honoured; "rustPlatform.buildRustPackage: remove unused useFetchCargoVendor logic" (78fd2bc, 2026-10-23) deleted the `useFetchCargoVendor` argument, the assert and the "non-optional as of 25.05" warning. Passing it is now silently ignored or an unknown-attribute difference, not a documented error.
- `rustPlatform: be explicit when cargoDeps is not set instead of failing to unpack (#553035)` (737e010, 2026-10-23): `cargoSetupHook` prints `ERROR: Missing cargoDeps` and exits 1 earlier.
- `rustPlatform.importCargoLock: enable strictDeps / structuredAttrs in various runCommand` (096c92c, 2026-10-26): adds `strictDeps = true` and `__structuredAttrs = true` to internal `runCommand`s. The diff touched no `outputHashes` or `allowBuiltinFetchGit` logic. Verdict: unchanged for NIX-PKG-22, but the NIX-PKG-22 red message `No hash was found while vendoring the git dependency ...` was not re-measured; flag for a re-run because the vendoring derivations were edited.
- `rustPlatform.cargoSetupHook: limit Cargo jobs to NIX_BUILD_CORES` (967015d, 2026-10-23): no contract change.
- CHANGED (26.11 notes, undated in the file): `cargoSetupHook` forces aws-lc, openssl, libz, libsqlite3, zstd, libgit2, sodium, rustonig, libssh2, nginx, duckdb and jemalloc to the nixpkgs library, and `dontCargoUseSystemLibs = true;` opts out. This can change the ocx-like vendored build and its closure; the pair does not mention it.

### 5. Python (NIX-PKG-18, NIX-PKG-21): error text unchanged

- `mk-python-derivation.nix` on master still throws: "`${name} does not configure a `format`. To build with setuptools as before, set `pyproject = true` and `build-system = [ setuptools ]`.`" (line 234). This matches the quoted "does not configure a `format`" and the "suggests setuptools" remark. Unchanged.
- Same file, window changes: pytestFlagsArray and unittestFlagsArray deprecations moved to `meta.problems` and `checkPhase` to `installCheckPhase` handling (2026-10-28 to 2026-10-29). Not cited by the pair.
- `pythonPackagesExtensions`: not named in any window commit or 26.11 note. Verdict: unchanged (no evidence of change; not re-measured).

### 6. Fileset and by-name README (NIX-PKG-05, NIX-PKG-06): unchanged

- [`lib/fileset` history](https://github.com/NixOS/nixpkgs/commits/master/lib/fileset): newest commit 2026-09-17, so nothing in the window. Master `lib/fileset/default.nix` still reads "`gitTrackedWith` does not perform any filtering when the path is a [Nix store path] and not a repository."
- [`pkgs/by-name/README.md` history](https://github.com/NixOS/nixpkgs/commits/master/pkgs/by-name/README.md): newest 2026-01-13. Master line 138 still reads "Packages in `pkgs/by-name` cannot refer to files outside their own directory." The nixpkgs-vet README repeats it as "Each package directory must not refer to files outside itself using symlinks or Nix path expressions."

### 7. `pkgs.system` alias (NIX-FLK-12): unchanged, still a warning

- Master `pkgs/top-level/aliases.nix` line 2694: `system = warnAlias "'system' has been renamed to/replaced by 'stdenv.hostPlatform.system'" stdenv.hostPlatform.system; # Converted to warning 2025-10-28`. The text is identical to the quote, and it has not become a `throw`. Other aliases are annotated "Converted to throw 2025-10-27", so the aliases file is on a periodic conversion cycle; `system` is a candidate for the next one.

### 8. Licenses and check-meta (NIX-GEN-14): unchanged now, churned in the window

- `lib.getLicenseFromSpdxIdOr`: still in `lib/default.nix` exports. `lib/meta.nix` history has nothing after 2026-09-20 (`getDarwinApp`), none touching it. Unchanged.
- `pkgs/stdenv/generic/check-meta.nix` window commits: "stdenv/check-meta: always use the license checks from `lib.licenses`" (aafc4bd, 2026-11-05) removed `isUnfree` and its `any (l: !l.free or false)` branch; "lib.licenses.helpers: handle string and list licenses correctly (#574361)" (bc14f73, 2026-11-05); then "Revert lib.licenses.helpers: handle string and list licenses correctly" (be0d285, 2026-11-05) restored `isUnfree`, `any (l: !l.free or false) licenses` and the string-returns-false TODO. A fetch of master on 2026-11-27 shows the restored code at line 136. Verdict: unchanged as of 2026-11-27, but a second attempt at this refactor is likely; the quote is fragile.
- Other check-meta commits: "pkgs/stdenv/problems: match kind not problem name" (b68597d, 2026-11-06), CPE `toLower` (2026-10-06, 2026-10-17), `cmakeConfigModules` (2026-10-05). Not cited.
- 26.11 notes: `requireFile` now defaults `meta.license = lib.licenses.unfree`. Also "Setting `config.allowBrokenPredicate` is deprecated in favor of `config.problems.handlers.PackageName.broken`". The pair does not cite either.

### 9. autoPatchelfHook, makeWrapper (NIX-GEN-11, 19, 20, 22): unchanged

- `autoPatchelfHook` ([`by-name/au/autoPatchelfHook`](https://github.com/NixOS/nixpkgs/commits/master/pkgs/by-name/au/autoPatchelfHook)): only "autoPatchelfHook: add license" (7bdd2ea, 2026-10-18). The `auto-patchelf` tool: newest 2026-08-15 ("enable strictDeps"), before the window. `autoPatchelfIgnoreMissingDeps` was not searched in a fetched source file (the script path in my fetch returned 404), so the semantics are "could not determine a change, no commit touches the hook in the window except licensing".
- `make-wrapper.sh` ([history](https://github.com/NixOS/nixpkgs/commits/master/pkgs/build-support/setup-hooks/make-wrapper.sh)): one window commit, "makeBinaryWrapper: add options to accept empty segments in suffix and prefix" (2026-10-11). Earlier: `--add-flag`/`--append-flag` (2025-04-25) and the missing-target log (2026-07-04). Unchanged for NIX-GEN-20 and NIX-GEN-22.
- Python-side relevance: "treewide: fix python makeWrapperArgs with __structuredAttrs (#575801)" (1a8b209, 2026-10-28). Relevant if a generated flake sets `makeWrapperArgs` on a Python builder.

### 10. Release mechanics (NIX-REL-10, NIX-REL-14): unchanged / could not determine

- `lib.derivations.warnOnInstantiate`: [history](https://github.com/NixOS/nixpkgs/commits/master/lib/derivations.nix) newest 2026-07-01 ("remove throwIfNot usage"); "make `warnOnInstantiate` recurse into `overrideAttrs` result" is 2026-03-28. Unchanged in the window.
- `lib.mkRenamedOptionModule`: present in master `lib/default.nix` exports. `lib/modules.nix` had only performance commits (2026-11-04 to 2026-11-14). Unchanged.
- `nix-update-script`: `pkgs/common-updater/nix-update.nix` newest commit 2024-09-17. Unchanged. The 26.11 notes contain no mention of r-ryantm, nixpkgs-update or `updateScript`. The [nixpkgs-update repository](https://github.com/nix-community/nixpkgs-update/commits/master) page returned no commit list, so r-ryantm's own behaviour is "could not determine".

### 11. Modules (modules.md): unchanged

- `lib.types.pathWith { inStore = false; }`: master `lib/types.nix` still documents `pathWith { inStore ? null, absolute ? null }`, `externalPath = pathWith { inStore = false; absolute = true; }`. Window commits to `lib/types.nix` are documentation edits (2026-11-25) and performance work (2026-11-06 to 2026-11-08). No semantic change.
- `lib.mkPackageOption`: `lib/options.nix` newest commit 2026-08-10, before the window.
- `pkgs.formats`: newest 2026-09-06 ("formats: split into individual files", "java-properties: expose as `format`"), 3 weeks before the window. Because the file was split, the measurement path `pkgs/pkgs-lib/formats.nix` is now an aggregator; the `pkgs.formats.json { }` call form the pair uses is unchanged.
- `nixosModules.readOnlyPkgs`: `nixos/modules/misc/nixpkgs/read-only.nix` newest commit 2026-01-22. Unchanged.

## Normative guidance candidates

1. Rule (amend NIX-PKG-10): "For `buildPythonPackage` and `buildPythonApplication`, never set `__structuredAttrs = true` or `strictDeps = true`; nixpkgs 26.11 enables both and warns when they are set." Rationale: ba375ac (2026-11-24) warns "is redundant" at every evaluation, into every consumer's log. Verification: `grep -n -e '__structuredAttrs = true' -e 'strictDeps = true' package.nix` inside a Python builder call, plus `nix eval .#default.drvPath 2>&1 | grep 'is redundant'` (empty is the pass). Needs a re-measurement on a nixpkgs revision newer than 2026-11-24 before shipping; on older revisions the warning does not exist.
2. Rule (amend NIX-PKG-09/10 by-name text): "A by-name submission must not set `meta.license` to a list and must not set `dontCargoUseSystemLibs = true`." Rationale: nixpkgs-vet ratchets added 2026-11-03 and 2026-11-22. Verification: `grep -n -e 'meta.license = \[' -e 'license = \[' -e 'dontCargoUseSystemLibs' package.nix`, or run `nixpkgs-vet` on the submission tree.
3. Rule (add to the Rust family, SHOULD): "Do not set `useFetchCargoVendor`; it was deleted on master on 2026-10-23." Rationale: the option and its warning no longer exist, so a leftover is dead configuration that old guidance copies. Verification: `grep -rn useFetchCargoVendor -- '*.nix'` (empty passes).
4. Note for NIX-PKG-15 (no rule change): a Rust package that relies on vendored openssl, zstd or sqlite now links the nixpkgs copy on 26.11; opt out with `dontCargoUseSystemLibs = true` only in a non-nixpkgs flake (rule 2 forbids it in nixpkgs). Verification: `nix build .#default && nix path-info -r .#default | grep -E 'openssl|zstd|sqlite'` shows the dependency.
5. Re-measurement flags (not rules): (a) NIX-PKG-22 red message after the 2026-10-26 `importCargoLock` edit; (b) NIX-PKG-10 `env` error text, unchanged in source but unverified; (c) NIX-PKG-01 `sha256 =` still building on a 2026-11 revision; (d) NIX-PKG-12 bare `--replace` exit code on a 2026-11 revision; (e) NIX-GEN-14 `any (l: !l.free or false)` before the 26.11 branch-off, since the license refactor landed and was reverted on 2026-11-05.

## AI-agent angle

- An agent trained before November 2026 will add `__structuredAttrs = true;` and `strictDeps = true;` to `buildPythonPackage`, copying NIX-PKG-10 and the general advice. Mechanical check: the `is redundant` warning grep in candidate 1.
- An agent will keep `useFetchCargoVendor = true;` copied from 25.05 migration guides. Check: grep in candidate 3.
- An agent will set `dontCargoUseSystemLibs = true;` to work around a link failure on 26.11 and then fail nixpkgs-vet. Check: candidate 2 grep.
- An agent will write `meta.license = with lib.licenses; [ mit asl20 ];` for a by-name package. The ratchet rejects it for new packages. Check: nixpkgs-vet or the grep in candidate 2.
- An agent treats an old `--replace` migration as finished because the flag is "deprecated". It is not removed (issue open as of 2026-10-08). Check: the NIX-PKG-12 grep.

## Contested and evolving

- License handling in `check-meta.nix` is actively being refactored (2026-11-05 land and revert). The trend is to route all license checks through `lib.licenses`; expect `isUnfree` and its `any (l: !l.free or false)` branch to disappear before or shortly after 26.11. As of 2026-11-27 it is present.
- Structured attributes and `strictDeps` are being defaulted per builder in 26.11 (Python, Go modules, Tcl, fetchurl, replaceVars, bundlerApp, makeSetupHook). The trend is that the explicit setting becomes redundant for nixpkgs builders and stays necessary for `stdenv.mkDerivation` and flake-local derivations.
- The `aliases.nix` file converts warnings to throws in batches (2025-10-27 for a large batch). `pkgs.system` was converted to a warning on 2025-10-28 and is a candidate for a throw in the next conversion; no date announced.
- 26.11 release notes are still in flux on master, and their entries carry no dates. A re-read after the 26.11 branch-off is advisable.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://raw.githubusercontent.com/NixOS/nixpkgs/master/doc/release-notes/rl-2611.section.md | 26.11 nixpkgs release notes (incompatibilities, lib) | read 2026-11-27 | Primary: builders defaulting strictDeps/structuredAttrs, cargoSetupHook system libs |
| https://nixos.org/manual/nixos/unstable/release-notes | NixOS unstable release notes page | read 2026-11-27 | Only the first 100k characters were read (highlights); the raw file above was used instead |
| https://github.com/NixOS/nixpkgs/commits/master/pkgs/by-name/ve/versionCheckHook | versionCheckHook history | newest 2026-05-25 | No commit in window |
| https://raw.githubusercontent.com/NixOS/nixpkgs/master/pkgs/by-name/ve/versionCheckHook/hook.sh | hook source | master 2026-11-27 | Primary: fallback order and failure text |
| https://github.com/NixOS/nixpkgs/issues/356002 | `--replace` tracking issue | opened 2024-11-14, last 2026-10-08 | Primary: deprecation status |
| https://github.com/NixOS/nixpkgs/commits/master/pkgs/stdenv/generic/setup.sh | stdenv setup history | 2026-10-08, 2026-10-18 | Window commits |
| https://raw.githubusercontent.com/NixOS/nixpkgs-vet/main/README.md | nixpkgs-vet ratchets | main 2026-11-27 | Primary: ratchet text |
| https://github.com/NixOS/nixpkgs-vet/commits/main | nixpkgs-vet history | 2026-11-03 to 2026-11-25 | Dates of the new ratchets |
| https://github.com/NixOS/nixpkgs/commits/master/pkgs/build-support/rust | Rust builders history | 2026-10-20 to 2026-10-30 | Window commits 5c99496, 78fd2bc, 737e010, 096c92c, 967015d |
| https://github.com/NixOS/nixpkgs/commit/5c99496 | cargoHash from finalAttrs | 2026-10-22 | Diff |
| https://github.com/NixOS/nixpkgs/commit/78fd2bc | remove useFetchCargoVendor logic | 2026-10-23 | Diff |
| https://github.com/NixOS/nixpkgs/commit/737e010 | Missing cargoDeps error | 2026-10-23 | Diff |
| https://github.com/NixOS/nixpkgs/commit/096c92c | importCargoLock strictDeps/structuredAttrs | 2026-10-26 | Diff |
| https://raw.githubusercontent.com/NixOS/nixpkgs/master/pkgs/build-support/rust/build-rust-package/default.nix | buildRustPackage source | master 2026-11-27 | Primary: no cargoSha256, fetchCargoVendor |
| https://raw.githubusercontent.com/NixOS/nixpkgs/master/pkgs/build-support/rust/import-cargo-lock.nix | importCargoLock source | master 2026-11-27 | Primary |
| https://github.com/NixOS/nixpkgs/commits/master/pkgs/development/interpreters/python/mk-python-derivation.nix | Python builder history | 2026-10-28 to 2026-11-24 | Redundancy warning commit |
| https://raw.githubusercontent.com/NixOS/nixpkgs/master/pkgs/development/interpreters/python/mk-python-derivation.nix | Python builder source | master 2026-11-27 | Primary: `format` error text, redundancy warnings |
| https://raw.githubusercontent.com/NixOS/nixpkgs/master/pkgs/top-level/aliases.nix | aliases | master 2026-11-27 | Primary: `system` warnAlias |
| https://github.com/NixOS/nixpkgs/commits/master/pkgs/top-level/aliases.nix | aliases history | 2026-11-25 to 2026-11-26 | Confirms no `system` commit among newest |
| https://github.com/NixOS/nixpkgs/commits/master/pkgs/stdenv/generic/check-meta.nix | check-meta history | 2026-09-20 to 2026-11-06 | License refactor and revert |
| https://github.com/NixOS/nixpkgs/commit/aafc4bd | check-meta license helpers | 2026-11-05 | Diff |
| https://github.com/NixOS/nixpkgs/commit/be0d285 | revert | 2026-11-05 | Diff restoring `isUnfree` |
| https://raw.githubusercontent.com/NixOS/nixpkgs/master/pkgs/stdenv/generic/check-meta.nix | check-meta source | master 2026-11-27 | Primary: `any (l: !l.free or false)` present |
| https://github.com/NixOS/nixpkgs/commits/master/lib/meta.nix | lib.meta history | 2026-09-20 | getLicenseFromSpdxIdOr untouched |
| https://github.com/NixOS/nixpkgs/commits/master/lib/fileset | fileset history | 2026-09-17 | No window commit |
| https://raw.githubusercontent.com/NixOS/nixpkgs/master/lib/fileset/default.nix | fileset source | master 2026-11-27 | Primary: gitTrackedWith comment |
| https://raw.githubusercontent.com/NixOS/nixpkgs/master/pkgs/by-name/README.md | by-name README | master 2026-11-27 | Primary: outside-files rule |
| https://github.com/NixOS/nixpkgs/commits/master/pkgs/by-name/README.md | by-name README history | 2026-01-13 | No window commit |
| https://github.com/NixOS/nixpkgs/commits/master/lib/types.nix | lib.types history | 2026-10-16 to 2026-11-25 | Docs and performance only |
| https://github.com/NixOS/nixpkgs/commits/master/pkgs/build-support/setup-hooks/make-wrapper.sh | make-wrapper history | 2026-10-11 | makeBinaryWrapper addition |
| https://github.com/NixOS/nixpkgs/commits/master/pkgs/by-name/au/autoPatchelfHook | autoPatchelfHook history | 2026-10-18 | License only |
| https://github.com/NixOS/nixpkgs/commits/master/lib/derivations.nix | derivations history | 2026-07-01 | warnOnInstantiate |
| https://github.com/NixOS/nixpkgs/commits/master/lib/options.nix, .../lib/modules.nix, .../nixos/modules/misc/nixpkgs/read-only.nix, .../pkgs/pkgs-lib/formats.nix, .../pkgs/common-updater/nix-update.nix | module-side and updater histories | 2026-08-10, 2026-11-14, 2026-01-22, 2026-09-06, 2024-09-17 | No semantic change in window |
