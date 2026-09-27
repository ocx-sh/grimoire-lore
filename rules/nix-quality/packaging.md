---
title: Derivations, Fetchers and Builders
summary: The NIX-PKG family, owning how a derivation or package.nix fetches and hashes its source, filters src, sets meta, places dependencies and phases, proves its version at build time, and drives the Rust and Python builders
---

# Derivations, Fetchers and Builders

Measured 2026-09-27 on CppNix 2.35.2, nixpkgs 26.11pre `8d5d2709`; floor `nix_2_31` = 2.31.5; Lix 2.95.2; nixfmt 1.5.0, deadnix 1.3.2, flake-checker 0.2.15.

Owns what goes inside a derivation: fetchers and their hashes, `src` filtering, where `package.nix` lives, `meta`, dependency roles and phases, `substituteInPlace`, the install-time version check, `finalAttrs`, the Rust and Python builders, and how a Python library exports itself.
The flakes family (NIX-FLK) owns `flake.nix` outputs, evaluation-time source reads (NIX-FLK-07), the overlay form (NIX-FLK-13) and `mainProgram` with its `nix run` smoke test (NIX-FLK-15). The inputs family (NIX-INP) owns builtin fetchers (NIX-INP-10) and self submodules (NIX-INP-09).
The gates family (NIX-GATE) owns deadnix and building every package in CI (NIX-GATE-05, NIX-GATE-10). The generated-flakes family (NIX-GEN) owns prebuilt binaries and their `meta`. The release family (NIX-REL) owns the version string and the scope of `abort-on-warn` (NIX-REL-11).

Contents: [Dates and Floors](#dates-and-floors) · [Fetchers and Hashes](#fetchers-and-hashes) · [Source Filtering and Layout](#source-filtering-and-layout) · [Meta and Licenses](#meta-and-licenses) · [Proven by a Real Build](#proven-by-a-real-build) ·
[Self-Reference and deadnix](#self-reference-and-deadnix) · [Rust and Python Builders](#rust-and-python-builders) · [Exporting a Python Library](#exporting-a-python-library) · [Applied Evidence](#applied-evidence-held-out-round-2026-09-27) · [Not a Finding](#not-a-finding) · [What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Floors

- **Implementation.** Every row was measured on CppNix 2.35.2 against nixpkgs 26.11pre `8d5d2709` unless its Severity cell names another floor. Only `abort-on-warn` (NIX-PKG-08) is implementation-sensitive, and it was measured on CppNix alone. The cold-source failure behind NIX-PKG-15 is also red on CppNix 2.31.5.
- **nixpkgs floors.** SRI `hash` needs 21.11. `cargoSha256` is a hard error and `fetchCargoVendor` the default since 25.05. An explicit Python `pyproject` or `format` is required since 25.11. `versionCheckProgramArg`, `pythonPackagesExtensions` and per-revision `cargoLock.outputHashes` were run on 26.11pre. The pinned `rustc` is 1.98.1.
- **Volatile.** nurl 0.4.1 prints `tag = "<hex>"` for any argument that is not exactly 40 hex (re-check at each nurl release). Bare `--replace` still exits 0 on a miss (re-check [nixpkgs#356002](https://github.com/NixOS/nixpkgs/issues/356002) at each nixpkgs release).
- **Pinned defaults** an adopter overrides once: NIX-PKG-06 (a by-name-ready `package.nix` now, a nixpkgs submission later) and NIX-PKG-16 (stock `rustPlatform` plus a floor step).
- **Shapes** are NIX-CORE-05's: A app, B library, C module, D generated, E template. Each Severity cell names the shapes it binds. A template (E) satisfies the rows of the shape it scaffolds.

Every command was watched red on a planted violation and green on its twin. Every grep is a violation locator where empty output (exit 1) is the pass, except the NIX-PKG-19 and NIX-PKG-22 pre-checks, whose output says whether the row applies. Substitute your package attribute for `.#default`.

## Fetchers and Hashes

```sh
grep -rn -e 'sha256 = "' -e 'cargoSha256' -e 'vendorSha256' --include='*.nix' .       # NIX-PKG-01
grep -rnE -e 'rev = "[0-9a-f]{7,39}"' -e 'tag = "[0-9a-f]{7,40}"' --include='*.nix' . # NIX-PKG-02
nix build --no-link .#default.src            # NIX-PKG-03: a fake hash fails here and prints got:
nix build --no-link --rebuild .#default.src  # NIX-PKG-04: re-fetches and compares
```

Both builds pass on exit 0. On the `--rebuild` line, `hash mismatch` or `curl: (22) … 404` (exit 1) is the finding. `--rebuild` on a path that was never built exits 1 with `not valid, so checking is not possible`: that means the plain build was skipped, not a defect.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-PKG-01 | Spell every nixpkgs fetcher hash (`fetchFromGitHub`, `fetchurl`, `fetchzip`, …) as SRI `hash = "sha256-…"`. Never write `sha256 =`, `cargoSha256` or `vendorSha256`. Whether a `src` may use a builtin fetcher is NIX-INP-10 (inputs family). | `hash` is the attribute the nixpkgs fetchers chapter prefers, and `cargoSha256` is a hard error since nixpkgs 25.05. The legacy `sha256 =` still builds on 26.11pre, which is why this is not a MUST. | The first grep. Watched red on `sha256 = "0abc"` (exit 0), green on the SRI twin (exit 1). A `sha256 =` inside `builtins.fetchTarball`, `builtins.fetchurl` or bare `fetchTarball` is not a finding: builtin fetchers reject `hash` (`unsupported argument 'hash' to 'fetchTarball'` on CppNix 2.31.5 and 2.35.2 and Lix 2.95.2, watched 2026-09-27), and whether a builtin may be used is NIX-INP-10. Files NIX-GATE-04 excludes are not findings. | SHOULD (every shape). | nixpkgs 21.11, CppNix 2.35.2 measured |
| NIX-PKG-02 | Pin a git source with a full 40-hex `rev`, or with `tag` naming a real tag. Never a short or 39-hex rev, a branch name, or `tag = "<hex>"`. When `nurl` prints `tag =` for a hex argument, re-run it with the full 40-hex SHA. | GitHub shares commit objects across forks, so a short hash can turn ambiguous and 404 (nixpkgs `pkgs/README.md`). `tag = X` fetches `archive/refs/tags/X.tar.gz`, so a hex "tag" 404s on any store that lacks the output. A 7-hex rev still resolves on GitHub, so the grep is the gate, not a build. | The second grep. Watched red on a 7-hex `rev` and a 39-hex `tag` (exit 0), green on a 40-hex `rev` beside `tag = "v1.2.3"` (exit 1). | MUST (every shape with a git fetch). | nurl 0.4.1, nixpkgs 26.11pre |
| NIX-PKG-03 | Never write a hash by hand. Take it from `nurl` or `nix-prefetch-*`, or set exactly `lib.fakeHash`, `lib.fakeSha256`, `lib.fakeSha512` or `""`, build once and copy the `got:` value. | With any other placeholder nixpkgs passes `--insecure` to curl, which opens the download to MITM even over HTTPS (fetchers chapter). A guessed hash that matches a cached path also triggers NIX-PKG-04's silent reuse. | The plain build. Watched 2026-09-27: `lib.fakeHash` failed with `hash mismatch in fixed-output derivation`, `specified: sha256-AAAA…` and the real `got:` value, exit 1. | MUST (every shape). | CppNix 2.35.2, all Nix versions |
| NIX-PKG-04 | Whenever you change a fetcher argument (`url`, `rev`, `tag`, `owner`, `repo`, `curlOptsList`), reset `hash` to `lib.fakeHash` in the same edit and verify with `--rebuild`. A plain `nix build` is not a verification. | A fixed-output path depends only on name and hash, and "existing store objects that match the output hash will be re-used rather than fetching new content" (fetchers chapter). A bumped `rev` with a stale hash silently ships the old source. | The plain build, then the `--rebuild` build. Watched 2026-09-27: with `rev` bumped and the hash kept, the plain build exited 0 printing the old `-source` path, and `--rebuild` exited 1 with `hash mismatch … got: sha256-MX8NoLcp…`. The compliant twin exits 0 on both. | MUST (every shape). D's transport form is NIX-GEN-08 and NIX-GEN-15. | CppNix 2.35.2, all Nix versions |

```nix
# wrong: rev bumped, hash kept, and a warm store still builds the old source
fetchFromGitHub {
  owner = "octocat";
  repo = "Hello-World";
  rev = "553c2077f0edc3d5dc5d17262f6aa498e69d6f8e";
  hash = "sha256-gdkPz7VJ8ZOwJ5oetnuXBXPkkHlOsU7w0PghYjWgpAo=";
}
```

```nix
# right: the same edit resets the hash, then build plain and with --rebuild
fetchFromGitHub {
  owner = "octocat";
  repo = "Hello-World";
  rev = "553c2077f0edc3d5dc5d17262f6aa498e69d6f8e";
  hash = lib.fakeHash;
}
```

## Source Filtering and Layout

```sh
nix eval --raw .#default.src                    # 1: note the path
echo '# unrelated' >> flake.nix && git add -A    # 2: an unrelated edit (a comment), reverted afterwards
nix eval --raw .#default.src                    # 3: NIX-PKG-05, must print the path from step 1
test -f package.nix                              # NIX-PKG-06: exit 1 = no root package.nix
grep -n -e '=[[:space:]]*\.\./' -e '([[:space:]]*\.\./' -e '\[[[:space:]]*\.\./' -e '[$]{[[:space:]]*\.\./' -e 'import[[:space:]]*\.\./' -e 'callPackage[[:space:]]*\.\./' -e '^[[:space:]]*\.\./[^[:space:]]*$' -e '^\./\.\./' -e '[^.]\./\.\./' package.nix   # NIX-PKG-06
```

Steps 1 and 3 must print the same path, and a changed path is the finding. Revert step 2 with `git checkout HEAD -- flake.nix`.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-PKG-05 | Set `src = lib.fileset.toSource { root = ./.; fileset = lib.fileset.unions [ … ]; }` over an explicit list (for Rust: `./Cargo.toml`, `./Cargo.lock`, `./src` and each workspace member directory). Never `src = ./.` or `src = self` unfiltered, and never `lib.fileset.gitTracked` inside a flake. | An unfiltered `src` moves the `drvPath` on every README, workflow or docs commit, so each one rebuilds the package. Inside a flake the source is already a git-filtered store path, and `gitTrackedWith` "does not perform any filtering when the path is a Nix store path" (`lib/fileset/default.nix`). | The three drvPath steps. Watched 2026-09-27: `src = ./.` moved from `84m54b0g…` to `nz413g7y…`, and the fileset twin kept `16w01q09…`. The steps compare `src`, not `drvPath`: a `drvPath` also moves when the package reads `self.dirtyShortRev` (NIX-REL-03), which misattributes the churn. Watched 2026-09-27: nix-direnv's `builtins.path { path = ./.; }` src moved, and nh's fileset src stayed put while its drvPath moved. Step 2 appends a comment: a bare `x` is a syntax error, so step 3 exits 1 on every tree (watched 2026-09-27, C22). Re-watched over eight trees: `src` moved for nil (`src = self`), treefmt (an exclude-list filter that keeps `flake.nix`), flake-checker and nix-direnv (`builtins.path`), and stayed for nh, disko, nixpkgs-review and nix-index. | MUST (A). CONSIDER for a one-file package. Not D, which builds no source. | CppNix 2.35.2, nixpkgs 26.11pre |
| NIX-PKG-06 | **pinned** Put `package.nix` at the repository root as a plain `callPackage` function whose formals are only nixpkgs attributes, with no `../` path and no symlink out of its directory. A nixpkgs `pkgs/by-name` submission then changes only `src`, `version` and the cargo hash attribute. | A by-name package "cannot reference files outside its own directory" (`pkgs/by-name/README.md`), so `nix/package.nix` with `root = ../.` can never be copied, and extra formals such as `version ? "git"` are not by-name compatible. Package and overlay drvPath equality is NIX-FLK-13. Pinned default: by-name-ready now, submitted later. An adopter with no nixpkgs plan overrides it once. | `test -f package.nix` (exit 1 is the finding), then the grep: empty (exit 1) passes, and a hit inside a `''` string or a comment is read and is not a finding. Watched 2026-09-27: `test` exit 1 on ghostty (only `nix/package.nix`), a grep hit on a root `package.nix` with `root = ../.`, and empty on a twin whose only `../` is `cd ../..` in `postInstall` and a comment. disko and nh are empty. The `[$]{` pattern catches an interpolated `"${../shared/data.txt}"`, which the other patterns missed, and skips shell brace expansion such as `{../res,$out}` (watched 2026-09-27). | SHOULD (A), pinned. | CppNix 2.35.2, nixpkgs 26.11pre by-name layout |

```nix
{
  # wrong: every README or workflow commit changes the drvPath
  src = ./.;
}
```

```nix
{ lib }:
{
  # right: only the listed paths reach the build
  src = lib.fileset.toSource {
    root = ./.;
    fileset = lib.fileset.unions [
      ./Cargo.toml
      ./Cargo.lock
      ./src
    ];
  };
}
```

## Meta and Licenses

```sh
nix eval --json --no-write-lock-file .#packages.x86_64-linux --apply 'ps: builtins.mapAttrs (n: p: { d = p.meta.description or null; l = p.meta ? license; p = p.meta ? platforms; }) ps' | jq -e 'all(.[]; .d != null and .l and .p and (.d | test("^[A-Z]") and (test("[.]$") | not) and (test("^(A|An|The) ") | not)))'
nix eval --option abort-on-warn true --json .#packages.x86_64-linux.default.meta.license
```

The set check prints `true` and exits 0 on a pass, and `false` with exit 1 is the finding. The license line runs once per named package: exit 1 with `getLicenseFromSpdxId: No license with the given SPDX ID found` is the finding. Never widen it to `nix flake check` or a whole-flake build (NIX-REL-11).

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-PKG-07 | Every package built from source sets `meta.description`, `meta.license` and `meta.platforms`. The description starts with a capital, has no leading article and no trailing period, and does not restate the name. Set `meta.homepage` too. `mainProgram` is NIX-FLK-15 and `sourceProvenance` NIX-GEN-12. | A missing field fails neither `nix flake check` nor the build and silently degrades `nix search`, license gating and `meta.available`. The grammar is nixpkgs' (`pkgs/README.md`, `doc/stdenv/meta.chapter.md`). | The set check. Watched 2026-09-27: missing `platforms` and the description `"A fixture CLI for the packaging rules."` each gave `false`, exit 1, and the twin `true`, exit 0. `homepage` is a reading heuristic. | MUST for description, license and platforms presence (A and any from-source package). SHOULD for grammar and homepage. D: license is NIX-GEN-14, description and homepage NIX-GEN-21. | CppNix 2.35.2, nixpkgs 26.11pre |
| NIX-PKG-08 | Give `meta.license` as a `lib.licenses` attribute or one SPDX id. Never pass a compound expression such as `"Apache-2.0 OR MIT"` to `lib.getLicenseFromSpdxId`. Write a list of licenses instead. Evaluate each named current package's `meta.license` with `abort-on-warn`. | A compound expression does not parse and prints a warning into every consumer's evaluation. Rust's default `MIT OR Apache-2.0` makes it the first thing an agent writes for a dual-licensed crate. The attribute scope is NIX-REL-11's. | The license line. Watched red: `No license with the given SPDX ID found: Apache-2.0 OR MIT`, exit 1. The `lib.licenses` twin exits 0. | MUST (A). D implements it in the generator (NIX-GEN-14). | `abort-on-warn` on CppNix 2.35.2 (re-check on Lix and Determinate Nix before relying on it) |

```nix
{ lib }:
{
  # wrong: does not parse, and warns in every consumer's evaluation
  license = lib.getLicenseFromSpdxId "Apache-2.0 OR MIT";
}
```

```nix
{ lib }:
{
  # right: one entry per license
  license = [
    lib.licenses.asl20
    lib.licenses.mit
  ];
}
```

## Proven by a Real Build

```sh
nix build --no-link -L .#default                                          # NIX-PKG-09, 10, 13, 19
grep -rn -e '--replace[[:space:]]' -e '--replace$' --include='*.nix' .    # NIX-PKG-12
grep -rn -e 'doInstallCheck = false' --include='*.nix' .                                # NIX-PKG-19: empty = pass
nix build --impure -o marker-probe --expr '(builtins.getFlake (toString ./.)).packages.x86_64-linux.default.overrideAttrs (o: { postInstall = (o.postInstall or "") + "touch $out/MARKER"; })'
test -e marker-probe/MARKER                                               # NIX-PKG-11
```

The build passes on exit 0 with `Executing versionCheckPhase` in its log. Read each grep hit, because another tool's own `--replace` flag also matches. The override-marker pair runs on your own flake only: `test` exit 0 is the pass, and exit 1 means an overridden phase dropped its hooks. Delete `marker-probe` afterwards.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-PKG-09 | Put build-time tools in `nativeBuildInputs` and link-time or runtime libraries in `buildInputs`, and set `strictDeps = true` from the first commit. | Under `strictDeps` only `nativeBuildInputs` reach `PATH`, and nixpkgs-vet ratchets the setting one-way for by-name packages. Without it a misplaced tool works natively and breaks cross builds. | The build. Watched red: a tool in `buildInputs` under `strictDeps` failed with `hello: command not found`, exit 1. A derivation without `strictDeps = true` is a reading-heuristic finding. | MUST (A). | CppNix 2.35.2, nixpkgs 26.11pre |
| NIX-PKG-10 | Set `__structuredAttrs = true`. Keep `env.*` scalar (string, bool, int or derivation) and put list-valued attributes at the top level. | Without structured attrs a top-level list is space-joined and re-split, so `"--message=hello world"` becomes two arguments, with exit 0 either way. `env` rejects a list with or without the flag. | A list under `env` fails evaluation with `The 'env' attribute set can only contain derivation, string, boolean or integer attributes` (watched). A list attribute without `__structuredAttrs = true` is a reading-heuristic finding. | SHOULD (A). MUST for a by-name submission, where the nixpkgs-vet ratchet applies. | CppNix 2.35.2, nixpkgs 26.11pre |
| NIX-PKG-11 | Start every overridden phase with `runHook pre<Phase>` and end it with `runHook post<Phase>`. Never set `phases`. | Without the hooks the package builds, but every downstream `overrideAttrs { postInstall = …; }` silently does nothing. No linter reads the phase body, which is a shell string. | The override-marker pair. Watched 2026-09-27: an `installPhase` without `runHook` built (exit 0) and `test` exited 1, and the hooked twin exited 0. Reading pre-check: every `Phase = ''` block contains `runHook`. For a wrapper builder whose exported derivation is not the one carrying your phases (for example `resholve.mkDerivation`, whose outer `installPhase` is nixpkgs' `cp -R $src $out`), run the pair on the inner derivation (`.#default.unresholved`), and read an outer red as not a finding. Watched 2026-09-27 on nix-direnv: outer red on the hooked twin, inner green on the twin and red on the unhooked original. | MUST (A, and D's shared builder). | CppNix 2.35.2, nixpkgs 26.11pre |
| NIX-PKG-12 | `substituteInPlace` and `substitute` use `--replace-fail`, or `--replace-warn` where a miss is expected. Never bare `--replace` in new code. | Bare `--replace` on a pattern that matches nothing exits 0 silently on 26.11pre. Its deprecation (open since 2024-11-14, about 7,000 uses inside nixpkgs) has not removed it. | The grep. Watched 2026-09-27: hits on `--replace "a" "b"` and on a trailing `--replace` continuation (exit 0), none on `--replace-fail` or `--replace-warn` (exit 1). `--replace-fail` on a miss fails the build with `pattern … doesn't match anything`. | MUST in new code (A, D). Existing code migrates when touched. | CppNix 2.35.2, nixpkgs 26.11pre |
| NIX-PKG-13 | Every A package that ships a CLI sets `nativeInstallCheckInputs = [ versionCheckHook ]` and `doInstallCheck = true`, pointed at the CLI's real version entry point (NIX-PKG-19). Behaviour beyond the version goes in `passthru.tests` built against `finalAttrs.finalPackage`. | `nix flake check` never runs the binary. With no `versionCheckProgramArg` the hook runs `meta.mainProgram --version`, then `--help`, in the sandbox, and passes when either output contains the package's `version` value (for example `0.1.0`) as a substring (`versionCheckHook/hook.sh`). This is the sandbox layer under NIX-FLK-15's CI smoke run and NIX-REL-16's release smoke run. | The build logs `Executing versionCheckPhase`, exit 0. Watched red: a binary printing `9.9.9` failed with `Did not find version 0.1.0 in the output of the command …/bin/octool --version`, exit 1. | MUST (A CLIs). CONSIDER elsewhere. | CppNix 2.35.2, nixpkgs 26.11pre |
| NIX-PKG-19 | Before relying on `versionCheckHook`'s default, confirm the CLI answers `--version` or prints its version in `--help`. If it does not, set `versionCheckProgramArg` to the real entry point (ocx: `"version"`, a subcommand). Set `versionCheckProgram` only when the version-reporting binary is not `meta.mainProgram`. Never answer a `versionCheckPhase` failure with `doInstallCheck = false` or by removing the hook. | clap registers `--version` only when the command attribute names `version`. ocx omits it, so the default fails with `unexpected argument '--version' found` after a full compile of about 6 minutes, which reads like a CLI bug. Disabling the check deletes NIX-PKG-13's guarantee (NIX-CORE-01). | The build. Watched on ocx 0.6.3: red with `Did not find version 0.6.3 in the output of the command …/bin/ocx --version`, green with `versionCheckProgramArg = "version"`. Reading pre-check for a clap CLI, run from its crate: `grep -rn -e '#\[command(.*version' -e '#\[clap(.*version' -e '^[[:space:]]*version[[:space:]]*[,)=]' -e 'version:[[:space:]]*bool' -e '\.version([^)]' --include='*.rs' .`, where empty output (exit 1) means the default will fail. The third pattern catches `version,` on its own line inside a multi-line `#[command(…)]`, the fourth a hand-declared flag (yazi, nil), and `\.version([^)]` skips a `.version()` getter, which the earlier `\.version(` read as a flag (C27). A `disable_version_flag` hit means the default will fail. Read each hit. Watched 2026-09-27: a hit on `#[command(author, version, about)]`, single-line and multi-line attributes exit 0, empty on `#[command(name = "ocx")]`. Locator: the `doInstallCheck = false` grep. Each hit on an A CLI is the finding unless its comment names a reason other than a version-check failure. Watched 2026-09-27: it hits nh's package.nix:73. A hit inside an `overrideAttrs` of a package the repository does not build (devenv's trimmed `git`, a test helper) is out of scope. | MUST (A CLIs). | CppNix 2.35.2, nixpkgs 26.11pre `versionCheckHook` |

```nix
{
  # wrong: versionCheckPhase failed on --version, so the check was deleted
  doInstallCheck = false;
}
```

```nix
{ versionCheckHook }:
{
  # right: point the hook at the entry point the CLI really has
  nativeInstallCheckInputs = [ versionCheckHook ];
  doInstallCheck = true;
  versionCheckProgramArg = "version";
}
```

## Self-Reference and deadnix

```sh
deadnix --fail --no-lambda-pattern-names .   # NIX-GATE-05's command
nix flake check --no-build .
```

Both pass on exit 0.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-PKG-14 | Write `mkDerivation (finalAttrs: { … })` when the package refers to its own final attributes (`passthru.tests`, `finalAttrs.version` in a URL, `finalAttrs.finalPackage`), never `rec { }`. When nothing refers to them, write a plain attrset. | `rec` cannot name the fixed-point output, and `finalPackage` pasted into `rec` is `error: undefined variable 'finalPackage'`. An unused `finalAttrs` fails the deadnix gate. `rec` for plain `pname` and `version` interpolation stays legitimate. | Both commands. Watched red: `Unused lambda argument: finalAttrs` (exit 1), and the `rec` plus `finalPackage` twin failing evaluation (exit 1). Watched green: the plain attrset, and `finalAttrs` with its test, exit 0. | SHOULD (A, D). | deadnix 1.3.2 |

## Rust and Python Builders

```sh
grep -rn -e 'lockFile = "${' -e 'builtins\.path[[:space:]]*{' --include='*.nix' .   # NIX-PKG-15 pre-check
git archive --format=tar.gz -o src.tar.gz HEAD
nix flake check --no-build "tarball+file://$PWD/src.tar.gz"             # NIX-PKG-15, cold by construction
grep -c 'source = "git+' Cargo.lock                                      # NIX-PKG-22 pre-check
grep -rn -e 'allowBuiltinFetchGit = true' --include='*.nix' .                        # NIX-PKG-22: empty = pass
nix eval --impure --raw --expr 'let ch = (builtins.fromTOML (builtins.readFile ./rust-toolchain.toml)).toolchain.channel; v = (builtins.getFlake (toString ./.)).inputs.nixpkgs.legacyPackages.x86_64-linux.rustc.version; in assert builtins.compareVersions v ch >= 0; v'   # NIX-PKG-16
```

The tarball check reads `HEAD`, so commit first and delete `src.tar.gz` afterwards. It passes on exit 0, and `path '/nix/store/…-source' is not valid` (exit 1) is the finding. A nonzero count from `grep -c` (exit 0) means `outputHashes` is required, and `0` (exit 1) means it is not. The floor line prints the pinned `rustc` version on a pass (exit 0). `assertion … failed` (exit 1) is the finding. It needs a numeric `channel` and an input named `nixpkgs`, and it runs as a CI step, not in `checks`, because the `checks` form was never watched.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-PKG-15 | In-repo Rust uses `rustPlatform.buildRustPackage` with `cargoLock.lockFile = ./Cargo.lock`. Never `"${src}/Cargo.lock"` or `"${finalAttrs.src}/Cargo.lock"`, even over a fileset `src`, and never `src = builtins.path { path = self; }`. Use `cargoHash` only in a nixpkgs submission. Crane is accepted with `src = craneLib.cleanCargoSource ./.`. | The nixpkgs Rust manual calls `cargoHash` "tedious" within a project, since every `Cargo.lock` change moves it. The interpolated read is an evaluation-time read through the source store path, NIX-FLK-07's cold-store failure, and this row is the builder spelling NIX-FLK-07 delegates here. | The pre-check and the tarball check. Watched red: `"${finalAttrs.src}/Cargo.lock"` over a fileset exited 1 both by tarball and locally, and so did `builtins.path { path = self; }`. Watched green: `./Cargo.lock`, exit 0. The pre-check re-watched 2026-09-27: hits on both interpolated forms (exit 0), none on `./Cargo.lock` (exit 1). The pre-check matches `builtins.path {`, not `builtins.pathExists`. Watched 2026-09-27: it hits `src = builtins.path { path = self; }` and `"${src}/Cargo.lock"`, and it is empty on a twin holding `builtins.pathExists ./README.md` and `./Cargo.lock`. Read each pre-check hit: only a `builtins.path` that becomes a Rust package's `src` is this row's, not a flake-compat shim, a test or a container image, and the tarball check decides. | MUST (A, Rust). | nixpkgs 25.05 `fetchCargoVendor`. Red on CppNix 2.35.2 and 2.31.5 |
| NIX-PKG-22 | When `Cargo.lock` has any `source = "git+…"` entry, set `cargoLock.outputHashes` with one entry per distinct git revision, keyed by any one `name-version` from that revision, and take each hash with NIX-PKG-03's fake-hash procedure. When a locked git revision changes, reset its entry to `lib.fakeHash` in the same edit (NIX-PKG-04). Never `allowBuiltinFetchGit`. | `importCargoLock` validates every crate from one revision against one hash, so 10 git crates from 2 revisions need exactly 2 entries. `allowBuiltinFetchGit` fetches at evaluation time, which is NIX-INP-10's builtin-fetcher problem. | `nix flake check --no-build .` Watched red on ocx without the entries: `No hash was found while vendoring the git dependency uv-cache-key-0.0.1`, exit 1. Green with the two entries, exit 0. The `grep -c` pre-check says whether the row applies. `nix flake check` goes green when `allowBuiltinFetchGit = true` stands in for the entries (yazi, watched 2026-09-27), so the `allowBuiltinFetchGit` grep is the check for that clause: a hit is the finding, and empty (exit 1) passes. | SHOULD (A, Rust): the missing-entry failure is loud and cannot ship. | CppNix 2.35.2, nixpkgs 26.11pre |
| NIX-PKG-16 | **pinned** Build with the pinned nixpkgs `rustPlatform`, and add a CI step asserting its `rustc` is at least the `rust-toolchain.toml` channel. Never assume `buildRustPackage` reads `rust-toolchain.toml`. Keep rust-overlay and fenix out of `package.nix`. A devShell may carry the exact channel (CONSIDER). | Nothing in nixpkgs parses the file, and a non-default Rust needs rust-overlay or fenix through `makeRustPlatform` (Rust manual). A rust-overlay `package.nix` cannot go to nixpkgs and adds an input every consumer locks. Pinned default: stock `rustPlatform` plus this floor step. An adopter who needs the exact channel in the package overrides it once. | The floor line. Watched 2026-09-27: channel `1.95.0` printed `1.98.1`, exit 0, and channel `99.0.0` failed the assertion, exit 1. | SHOULD (A, Rust), pinned. | rustc 1.98.1 in nixpkgs `8d5d2709` |
| NIX-PKG-17 | Start native inputs at the minimum the build asks for (`nativeBuildInputs = [ pkg-config ]` for aws-lc-sys under rustls) and add a tool only when an error names it. Before adding `bindgenHook` or `libclang` for a `-sys` entry in `Cargo.lock`, trace it with `cargo tree --target all -i clang-sys` (substitute the crate). | aws-lc-sys builds with `pkg-config` alone while it selects its `cc` builder: pre-generated bindings for the target, no FIPS, no `AWS_LC_SYS_CMAKE_BUILDER`, no sanitizer or `no_asm`. Otherwise add `cmake`, plus `rustPlatform.bindgenHook` when bindings are missing. `Compiling cmake v0.1.58` is the Rust wrapper crate, not the binary. | Reading heuristic, no clean red/green pair: build first with `nix build --no-link -L .#default` and read the first failure. A `cmake`, `libclang` or `bindgenHook` in `nativeBuildInputs` that no log line asked for is the finding. | SHOULD (A, Rust). | x86_64-linux, aws-lc-sys 0.43 built and 0.45.0's builder read (re-check at each aws-lc-sys minor) |
| NIX-PKG-18 | Python uses `python3Packages.buildPythonPackage { pyproject = true; build-system = [ hatchling ]; }` with the backend `pyproject.toml` names, not the setuptools the error message suggests. Reach for uv2nix or pyproject.nix only when compiled runtime dependencies must be reproduced from `uv.lock`. | Without `pyproject` or `format` nixpkgs refuses to evaluate, and its message suggests `build-system = [ setuptools ]`, the wrong backend for a hatchling project. uv2nix's value is a resolved wheel graph, which a zero-dependency package does not have. | `nix build --no-link -L .#default` reaches `pythonMetadataCheckPhase`, exit 0. Watched red: no `pyproject` failed evaluation with ``does not configure a `format` ``, exit 1. Reading heuristic: `build-system` matches `[build-system] requires`. | SHOULD (A, Python). | CppNix 2.35.2, nixpkgs 25.11 |

```nix
{ src }:
{
  # wrong: an evaluation-time read through the source store path, red on a cold store
  cargoLock.lockFile = "${src}/Cargo.lock";
}
```

```nix
{
  # right: a path relative to package.nix, read from the source tree
  cargoLock.lockFile = ./Cargo.lock;
}
```

## Exporting a Python Library

From a separate consumer flake that applies the producer's `overlays.default` and defines `packages.x86_64-linux.via-312 = pkgs.python312.pkgs.mylib` and `via-313` likewise (substitute your library name for `mylib`):

```sh
nix eval --no-write-lock-file .#packages.x86_64-linux.via-312.drvPath
nix eval --no-write-lock-file .#packages.x86_64-linux.via-313.drvPath
```

Each passes on exit 0 with a distinct `python3.12-…` and `python3.13-…` drv. `attribute 'mylib' missing` (exit 1) is the finding.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-PKG-21 | A Python library flake exports two things: an `overlays.default` that extends `pythonPackagesExtensions` (the right snippet below), and a `packages` entry per system (`mylib` and `default`) bound to the flake's own `python3`. Never export a Python library only as a top-level attribute, and never with NIX-FLK-13's top-level overlay form. | The nixpkgs Python manual documents `pythonPackagesExtensions` as the way to add a package "for all Python versions". A top-level attribute exists only for the one `python3` the producer bound, so a consumer composing under `python312.pkgs` cannot see it. The top-level package keeps `nix build` and `nix run` working. | The two evals. Watched 2026-09-27: the extensions export gave `python3.12-mylib-0.1.0.drv` and `python3.13-mylib-0.1.0.drv`, exit 0, and the top-level-only export failed with `attribute 'mylib' missing`, exit 1. The overlay's `_final:` is NIX-FLK-02's spelling for an unused first argument: deadnix passes it and CppNix 2.35.2 `nix flake check` accepts it (exit 0). A plain `final:` fails deadnix (watched 2026-09-27). | MUST (A, Python library). | CppNix 2.35.2, nixpkgs 26.11pre |

```nix
# wrong: exists only for the producer's python3, missing from python312.pkgs
final: _prev: { mylib = final.python3Packages.callPackage ./package.nix { }; }
```

```nix
# right: registered for every Python set a consumer composes
_final: prev: {
  pythonPackagesExtensions = (prev.pythonPackagesExtensions or [ ]) ++ [
    (pyFinal: _pyPrev: { mylib = pyFinal.callPackage ./package.nix { }; })
  ];
}
```

## Applied Evidence (held-out round 2026-09-27)

- add to Applied: nix-community/nix-direnv@b0557d237b01 violates NIX-PKG-02 at tests/nix/bats-assert.nix:8 (39-hex rev, C23)
- add to Applied: nix-community/nix-direnv@b0557d237b01 violates NIX-PKG-11 at default.nix:20 (inner-derivation probe red, C25)
- add to Applied: ryantm/agenix@654f73179924 violates NIX-PKG-11 at pkgs/agenix.nix:79 (installPhase without runHook, C25)
- add to Applied: nix-community/nix-direnv@b0557d237b01 violates NIX-PKG-05 at default.nix:15 (src = builtins.path { path = ./.; }, src moved on an unrelated edit, C18)
- add to Applied: ryantm/agenix@654f73179924 violates NIX-PKG-07 at pkgs/agenix.nix:83 (no meta.license or meta.platforms, set check false, C13)
- add to Applied: NixOS/nixos-hardware@30d48a0ec603 violates NIX-PKG-12 at nxp/imx8mp-evk/bsp/imx8mp-boot.nix:31 (bare --replace, 14 sites, C9)
- add to Applied: nix-community/nh@b6869cdf9860 violates NIX-PKG-06 at package.nix:11 (extra formal rev ? "dirty", not by-name compatible; the grep cannot see it, reading heuristic)
- add to Applied: nix-community/nh@b6869cdf9860 violates NIX-PKG-19 at package.nix:73 (doInstallCheck = false after a version-check failure, C7)

## Not a Finding

- `overrideAttrs` in an out-of-tree or generated flake. The nixpkgs ban covers in-tree code only.
- `rec` for plain `pname` and `version` interpolation (NIX-PKG-14).
- `sha256` inside any builtin fetcher call (`builtins.fetchTarball`, `builtins.fetchurl`), which rejects `hash`.
- Legacy `sha256` in generated files (crate2nix `Cargo.nix`, bundix `gemset.nix`), which NIX-GATE-04 excludes.
- `Compiling cmake v…` in a build log (NIX-PKG-17).

NIX-PKG-20 is retired and its number is not reused. Its measured cost, a full recompile for any `package.nix` edit, is a note under NIX-GATE-10 in the gates family.

## What Agents Get Wrong Here

Ranked by how often each bites an agent working unsupervised.

1. **Trusting a green build on a warm store.** A bumped `rev` with the old hash, or nurl's `tag = "<hex>"` pasted in, builds from the cached path (NIX-PKG-04, NIX-PKG-02).
2. **Reading `Cargo.lock` through `${src}`**, even over a fileset. It works on the author's machine and fails cold with an error that never names `cargoLock` (NIX-PKG-15).
3. **Inventing a hash or hand-truncating a SHA** (NIX-PKG-03, NIX-PKG-02).
4. **`src = ./.` or `src = self`**, so every README commit rebuilds the package (NIX-PKG-05).
5. **Treating `nix flake check` as proof the package works.** Missing `meta`, missing `runHook` and a binary that reports the wrong version all pass it (NIX-PKG-07, NIX-PKG-11, NIX-PKG-13).
6. **Setting `doInstallCheck = false` when `versionCheckPhase` fails on `--version`** (NIX-PKG-19).
7. **Copying bare `--replace` from pre-2024 examples**, including the flake-parts package template (NIX-PKG-12).
8. **Build tools in `buildInputs`** (NIX-PKG-09).
9. **Adding cmake, clang or `bindgenHook` "to be safe"** because a `-sys` name appears in `Cargo.lock` or a log (NIX-PKG-17).
10. **Believing Nix honours `rust-toolchain.toml`**, or reflexively adding rust-overlay (NIX-PKG-16).
11. **Wrapping every derivation in `finalAttrs:` by reflex**, or pasting `finalPackage` into `rec` (NIX-PKG-14).
12. **Trusting an inherited "no git dependencies" count** and skipping `outputHashes`. Re-run the `grep -c` on the live lock (NIX-PKG-22).
13. **Exporting a Python library like an application**, with a top-level overlay attribute or a `final:` that deadnix rejects (NIX-PKG-21).
14. **Forgetting submodules, or telling users to add `?submodules=1`** (NIX-INP-09 in the inputs family).
15. **Running `--rebuild` alone** on a path never built and reading `checking is not possible` as a defect. Build plain first (NIX-PKG-04).
