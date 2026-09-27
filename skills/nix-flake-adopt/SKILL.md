---
name: nix-flake-adopt
description: Ordered procedure for adding a Nix flake to an existing repository or modernizing one, from reading the Nix era and the flake shape through the flake.nix template, a package.nix for a Rust CLI, a Rust workspace with git submodules or a Python library, real hashes, git add, the gate, the nix.yml CI workflow and the README install block. Use when a repository gets its first flake.nix or package.nix, when wiring Nix CI or a Nix install section, or when migrating a flake off flake-utils, per-system import nixpkgs, pkgs.system, rec derivations, file-scope with pkgs, nixfmt-rfc-style, singular outputs or x86_64-darwin. Not for cutting a release or tag (nix-flake-release), triaging an evaluation or build error (nix-diagnose), generating flakes from a package index, or writing a NixOS, home-manager or nix-darwin module.
license: Apache-2.0
metadata:
  summary: Step-ordered procedure to add or modernize a flake, with every template built and every gate watched red and green on CppNix 2.35.2, nixpkgs 26.11pre and Lix 2.95.2
  keywords: nix,flakes,flake.nix,package.nix,nixpkgs,buildRustPackage,buildPythonPackage,cargo-workspace,git-submodules,flake-compat,nixfmt-tree,deadnix,flake-checker,genAttrs,flake-utils,overlays,pythonPackagesExtensions,github-actions,install-nix-action,lix,modernize,adopt
---

# nix-flake-adopt

## Two facts decide every step. Read this before step 1

1. **An untracked file does not exist.** A flake inside a git repository sees
   only tracked files. An un-added `package.nix` fails evaluation with `Path
   'package.nix' in the repository "…" is not tracked by Git`, and nothing else
   in the output names the cause (NIX-FLK-16). `git add` every new file before
   the first `nix` command, and never `git add` a secret so the flake can see it
   (NIX-SEC-04).
2. **A green `nix flake check --no-build` proves the output schema and little
   else.** It builds nothing, runs no binary, reads no `meta`, and checks no
   formatting, dead code or foreign system. Each step below names the command
   that does. Each was watched red on a planted defect and green on the
   template, and a check you have not watched red is not yet evidence
   (NIX-CORE-02).

Contents: [Scope](#scope) · [Pinned defaults](#pinned-defaults) ·
[The procedure](#the-procedure) ·
[The MUST rows this procedure enforces](#the-must-rows-this-procedure-enforces) ·
[What agents get wrong here](#what-agents-get-wrong-here)

## Scope

| Situation | Steps | Template |
|---|---|---|
| No flake yet, a Rust CLI in one crate | 1 to 9 | [Rust CLI](references/package-templates.md#rust-cli-one-crate) |
| No flake yet, a Cargo workspace whose path dependencies sit in git submodules | 1 to 9 | [Rust workspace](references/package-templates.md#rust-workspace-with-submodules) |
| No flake yet, a Python library | 1 to 9 | [Python library](references/package-templates.md#python-library) |
| A flake exists | 1, 2, 10, then 4 to 9 | the same templates |

Step 2 stops the procedure for library-only (B), module (C), generated (D) and
template (E) flakes and names the rule file that owns each.

Measured 2026-09-27 on CppNix 2.35.2, nixpkgs 26.11pre `8d5d2709`, floor
`nix_2_31` = 2.31.5, Lix 2.95.2, nixfmt 1.5.0 (nixfmt-tree 2.6.0), deadnix
1.3.2, flake-checker 0.2.15 and actionlint 1.7.12. The CI workflow and the
README block are in [references/ci-and-readme.md](references/ci-and-readme.md).

## Pinned defaults

These encode agreed decisions, not derived facts. Each is a default the adopter
may override once, for the whole repository. Marked **pinned** so a later reader
does not re-litigate them.

| Decision | Default (pinned) | Override looks like |
|---|---|---|
| Systems and branch | `x86_64-linux`, `aarch64-linux`, `aarch64-darwin` on `nixos-unstable` (NIX-FLK-08, NIX-FLK-09) | a `nixos-26.05` pin, which may keep `x86_64-darwin` until that branch's end of life at the end of 2026 |
| Inputs | `nixpkgs` plus `flake-compat` (`flake = false`), and `inputs.self.submodules = true` when the tree has gitlinks. No `self.lfs` | `nixpkgs` alone, when no user builds without flakes |
| Formatter | `formatter = pkgs.nixfmt-tree`, required, not optional (NIX-GATE-01 makes the package a MUST once declared, NIX-FLK-17 makes declaring one a SHOULD) | a treefmt-nix wrapper that enables nixfmt |
| Rust builder | nixpkgs `rustPlatform` plus the CI floor step. Never crane or rust-overlay in the flake (NIX-PKG-15, NIX-PKG-16) | crane with `cleanCargoSource`, which NIX-PKG-15 accepts for a general adopter |
| Outputs | `packages`, `overlays.default`, `devShells.default` (plain `mkShell`, nix-direnv for contributors), `checks`, `formatter`. No `apps` for a second binary, no `templates.default` | an `apps` entry for a secondary entry point, smoke-run in CI (NIX-FLK-15) |
| FlakeHub | none, as input or publish target (NIX-REL-06) | tagged releases only, never rolling (NIX-REL-06's adopter clause) |
| Binary cache | none, and no `nixConfig` (NIX-SEC-01, NIX-REL-15) | the project's own cache, as the one allowed `nixConfig` pair plus a README `nix.conf` block |
| nixpkgs submission | `package.nix` by-name-ready now, submitted later (NIX-PKG-06, NIX-REL-14) | a submission, which swaps `version`, `src` and the dependency hash |
| Implementations | CppNix gated. Lix and the computed floor are advisory legs. Determinate Nix untested and never deliberately broken (NIX-GATE-16, NIX-REL-12) | none: a Lix-only project still needs the CppNix check (NIX-FLK-19) |
| Consumer floor | NIX-GATE-16's computed floor, today `nix_2_31` = 2.31.5, never a hardcoded number | none |
| CI Nix | CppNix 2.35.2 through `install_url` (NIX-GATE-13, NIX-SEC-06) | a newer patch release, moved in its own pull request |
| Lock refresh | weekly pull request under a GitHub App token, merged by a person (NIX-INP-11, NIX-SEC-07) | a fine-grained token with `contents` and `pull-requests` only |

## The procedure

Run the steps in order. Nothing is committed before step 7 is green.

### 1. Read the era (NIX-CORE-04)

```sh
nix --version
jq -r '.nodes[.nodes.root.inputs.nixpkgs // "nixpkgs"] | .original.ref // .original.url // .original.rev, .original.type, .locked.type' flake.lock
```

The `jq` line prints three lines for the root nixpkgs node, whatever the lock
names it (`nixpkgs_2` included): the ref (a channel URL, which names the
branch, or a rev when there is no ref), the input's type, and the type really
fetched. `null` three times means no nixpkgs node. Exit 5 with `Cannot index
object with array` means the root `nixpkgs` follows another input: read that
input's node.

| You read | It changes |
|---|---|
| `nix --version` names Lix | Lix 2.95.2 passes a `self: super:` overlay and a string `formatter` that CppNix fails. Count a flake check only when `nix shell --inputs-from . nixpkgs#nixVersions.nix_2_31 --command nix flake check --no-build --option allow-import-from-derivation false` also exits 0 (NIX-FLK-19). A lock older than the floor has no `nix_2_31`: drop `--inputs-from .`, and the flake still evaluates against its own lock |
| a ref of `nixos-unstable`, `nixpkgs-unstable` or 26.11 and later | any `x86_64-darwin` attribute throws (NIX-FLK-09). `nixfmt-rfc-style` warns on every evaluation and `nixfmt-classic` throws (NIX-GATE-03) |
| `nixos-26.05` | `x86_64-darwin` still evaluates, with a last-release warning. Drop it in the change that moves the pin |
| no `flake.lock` yet | the era is the branch you are about to lock: the pinned `nixos-unstable` |
| an input type of `indirect` | the input is a registry name, locked to whatever the registry pointed at (`tarball` on the third line). Rewrite it as `github:NixOS/nixpkgs/<branch>` (NIX-INP-05) |

### 2. Identify the shape (NIX-CORE-05)

Read what the repository ships, or will ship, and stop unless the row says
continue:

| The flake exports | Shape | This skill |
|---|---|---|
| `packages` or `apps`: a CLI, or a Python library that also ships `packages` | A | continue |
| `lib`, `overlays` or `flakeModules` only | B | stop: zero inputs or `nixpkgs-lib` only (NIX-INP-02) |
| `nixosModules`, `homeModules` or `darwinModules` | C | stop: the modules depth file of the `nix-quality` rule |
| committed data plus an updater | D | stop: the generated-flakes depth file |
| `templates` | E | stop: the template's own `flake.nix` must pass this procedure |

Then list gitlinks. Any output means the workspace template and
`inputs.self.submodules = true` (NIX-INP-09):

```sh
git ls-files --stage . | grep -e '^160000'
```

### 3. Compose `flake.nix`

Copy this whole file: skeleton A of the `nix-quality` rule plus the
`flake-compat` input. Rename `octool` everywhere (five places) and the description.
`grep -c octool flake.nix` prints `0` (exit 1) afterwards. A tree with gitlinks
adds `self.submodules = true;` as the first line of `inputs`. A Python library
takes its own `flake.nix` from
[references/package-templates.md](references/package-templates.md#python-library).

```nix
{
  description = "octool: one-line summary";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-compat = {
      url = "github:NixOS/flake-compat";
      flake = false;
    };
  };

  outputs =
    { self, nixpkgs, ... }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      overlays.default = final: _prev: { octool = final.callPackage ./package.nix { }; };
      packages = forAllSystems (pkgs: {
        octool = pkgs.callPackage ./package.nix { };
        default = self.packages.${pkgs.stdenv.hostPlatform.system}.octool;
      });
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          inputsFrom = [ self.packages.${pkgs.stdenv.hostPlatform.system}.octool ];
          packages = [
            pkgs.deadnix
            pkgs.flake-checker
          ];
        };
      });
      checks = forAllSystems (pkgs: {
        inherit (self.packages.${pkgs.stdenv.hostPlatform.system}) octool;
      });
      formatter = forAllSystems (pkgs: pkgs.nixfmt-tree);
    };
}
```

What the file already satisfies, so an edit must not undo it: a literal system
list through `genAttrs` (NIX-FLK-08), `legacyPackages` and no `import nixpkgs`
(NIX-FLK-11), `stdenv.hostPlatform.system` and never `pkgs.system`
(NIX-FLK-12), `final: _prev:` (NIX-FLK-02), one `package.nix` behind both the
overlay and `packages` (NIX-FLK-13), no builder in `flake.nix` (NIX-FLK-14),
`formatter` and `checks` (NIX-FLK-17), and a branch, not a revision, in each
`url` (NIX-INP-03). `inputsFrom` forwards the package's build tools (`cargo`,
`rustc`) to the shell, never the package's own binary (NIX-FLK-18).

Never add flake-utils or `nix-systems/default`, a `nixConfig` block, a
FlakeHub input, crane or rust-overlay (pinned), or an `apps` entry for a second
binary of the same package.

### 4. Write `package.nix`

Copy the template the Scope table named from
[references/package-templates.md](references/package-templates.md), at the
repository root beside the manifest, and change only the lines that file lists.
The templates already carry, and an edit must keep:

- `version` read from the manifest through a source-tree path, never a literal
  and never a suffix (NIX-REL-01, NIX-REL-02)
- `src` as a `lib.fileset.toSource` over an explicit list, never `./.` or
  `self` (NIX-PKG-05)
- `cargoLock.lockFile = ./Cargo.lock`, never `"${src}/Cargo.lock"` (NIX-FLK-07,
  NIX-PKG-15), and no `../` anywhere (NIX-PKG-06)
- `strictDeps` (NIX-PKG-09), a plain attribute set rather than `rec` (NIX-PKG-14)
- `versionCheckHook` pointed at the CLI's real version entry point (NIX-PKG-13,
  NIX-PKG-19)
- `meta.description`, `meta.license` and `meta.platforms` present (NIX-PKG-07)

Check the `meta` set after step 6 has run `git add` and `nix flake lock`,
because an untracked `flake.nix` fails every `nix` command:

```sh
# Prints true and exits 0 as the pass. false with exit 1 names a missing field or a description that breaks nixpkgs grammar (NIX-PKG-07).
nix eval --json --no-write-lock-file .#packages.x86_64-linux --apply 'ps: builtins.mapAttrs (n: p: { d = p.meta.description or null; l = p.meta ? license; p = p.meta ? platforms; }) ps' | jq -e 'all(.[]; .d != null and .l and .p and (.d | test("^[A-Z]") and (test("[.]$") | not) and (test("^(A|An|The) ") | not)))'
```

Add the non-flake bridge in the same change: `default.nix` and `shell.nix` from
[the templates](references/package-templates.md#the-non-flake-bridge)
(NIX-REL-05).

### 5. Obtain real hashes (NIX-PKG-03)

An in-repo `src` has no hash. A hash appears for each git revision in
`Cargo.lock` (NIX-PKG-22) and for any fetcher. Never type one, and never keep
a `tag = "<hex>"` that nurl printed for a SHA shorter than 40 hex (NIX-PKG-02).

1. `grep -c 'source = "git+' Cargo.lock`. `0` means no `outputHashes`. More
   than `0` means one entry per distinct git revision.
2. Set each unknown hash to `lib.fakeHash` and build the package. A flake check
   with `--no-build` passes with the fake hash present, so only the build shows
   it:

   ```sh
   nix build --no-link .#tool
   ```

   It exits 1 and prints `specified: sha256-AAAA…` followed by `got:
   sha256-…`. Copy the `got:` value in place of `lib.fakeHash`, and repeat
   until the build exits 0.
3. Leave no fake hash behind:

   ```sh
   # Empty output (exit 1) is the pass. Any line is a hash that was never filled in, unless it only quotes the symbol in a documentation string. A commented-out line never matches.
   grep -rn -e '^[^#]*lib\.fakeHash' -e '^[^#]*lib\.fakeSha256' -e '^[^#]*lib\.fakeSha512' --include='*.nix' .
   ```

Every later change to a fetcher argument resets its hash to `lib.fakeHash` in
the same edit, verified with `nix build --rebuild`, because a stale hash
silently reuses the old source from the store (NIX-PKG-04).

### 6. `git add` everything the flake reads (NIX-FLK-16)

```sh
git add flake.nix package.nix default.nix shell.nix
nix flake lock
git add flake.lock
# Empty output is the pass. Any path listed is invisible to every nix command.
git ls-files --others --exclude-standard .
```

`nix flake lock` writes the `flake-compat` and `nixpkgs` nodes. Commit the
lock with the flake.

### 7. Run the gate

Steps 1 to 6 of the `nix-quality` rule's gate block, with its security step.
The CI workflow in step 8 runs the same commands. Rename `.#octool` to each package the flake
defines, and `.claude` to the directory your agent client installs rules and
skills into: their text names every banned string.

```sh
nix fmt -- --ci                                                     # exit 0 (NIX-GATE-01, NIX-GATE-02)
grep -rn -e 'nixfmt-rfc-style' -e 'nixfmt-classic' -e 'nixpkgs-fmt' --include='*.nix' .   # empty (NIX-GATE-03)
grep -rnE --exclude-dir=.git --exclude-dir=.claude -e 'accept-flake-[c]onfig' -e 'trusted-[u]sers' -e 'settings\.access-[t]okens' -e 'gh[pousr]_[A-Za-z0-9]{20,}' -e 'github_pat_[A-Za-z0-9_]{20,}' -e 'glpat-[A-Za-z0-9_-]{20,}' .   # empty (NIX-SEC-02, NIX-SEC-03, NIX-SEC-08). A NIX-SEC-08 hit inside an exported host-administration module is read and passes
grep -rn --exclude-dir=.git --exclude-dir=.claude --exclude='*.md' --exclude='*.mdx' -e 'access-[t]okens *=' -e '--access-[t]okens' . | grep -v -e '[$]{{ secrets[.]' -e '[$]{{ github[.]token }}'   # empty (NIX-SEC-03)
git ls-files -- '*.env' '*.env.*' '*.pem' '*.key' '*.p12' '*.pfx' '*secret*' '*token*' '*credential*'   # candidates: read each, a tracked plaintext credential is the finding (NIX-SEC-04)
nix shell --inputs-from . nixpkgs#deadnix --command deadnix --fail --no-lambda-pattern-names .   # exit 0 (NIX-GATE-05)
nix flake check --no-build --option allow-import-from-derivation false   # exit 0 (NIX-GATE-08)
nix flake check --all-systems --no-build                            # exit 0, a red goes through NIX-GATE-09's triage table first
nix build --print-build-logs .#octool                               # exit 0 and "Successfully managed to find version" (NIX-GATE-10, NIX-PKG-13)
nix run .#octool -- --version                                       # exit 0, the version entry point NIX-PKG-19 names (NIX-FLK-15)
```

Then the proofs this procedure adds:

| Proof | Command | Pass | Rule |
|---|---|---|---|
| the formatter is the pinned one | `nix eval --raw .#formatter.x86_64-linux.pname` | prints `nixfmt-tree`. `nixfmt` (bare, or through the `nixfmt-rfc-style` alias) is the finding | NIX-GATE-01 |
| no crane, no rust-overlay (pinned) | `grep -rn -e 'crane' -e 'rust-overlay' --include='*.nix' .` | empty output. Any line is the finding | NIX-PKG-16 |
| the non-flake bridge builds | `nix-build . --no-out-link` and `nix-shell . --run true` | both exit 0 | NIX-REL-05 |
| the devShell holds what it promises | `nix develop -i --no-write-lock-file . --command bash -c 'command -v deadnix'`, repeated per promised tool | exit 0 per tool. Without `-i` the host `PATH` leaks in and fakes a pass | NIX-FLK-18 |
| the Lix leg (advisory) | `nix shell --inputs-from . nixpkgs#lix --command nix flake check --no-build` | exit 0. With `inputs.self` declared, append `--extra-experimental-features flake-self-attrs` | NIX-GATE-16 |

Watch one step go red before trusting the block. These were watched on the
templates, each against the step that caught it:

| Planted defect | Step | Output |
|---|---|---|
| `x86_64-darwin` added to `systems` | `--all-systems` | `error: Nixpkgs 26.11 has dropped support for x86_64-darwin.`, exit 1 |
| `package.nix` not tracked | the first flake check | `Path 'package.nix' in the repository "…" is not tracked by Git.`, exit 1 |
| the binary prints `9.9.9` | the build | `Did not find version 0.1.0 in the output of the command …/bin/octool --version`, exit 1 |
| `self.submodules` missing on a submodule tree | the build | `lib.fileset.unions: Element 4 (…/external) is a path that does not exist.`, exit 1 |
| `formatter = pkgs.nixfmt` | the formatter proof | prints `nixfmt` |

### 8. Add the CI workflow

Copy `.github/workflows/nix.yml` from
[references/ci-and-readme.md](references/ci-and-readme.md) and apply its
per-repository edits. It carries the gate on `ubuntu-24.04`,
`ubuntu-24.04-arm` and `macos-15`, every action at a 40-hex SHA (NIX-GATE-12),
upstream CppNix pinned by `install_url` (NIX-GATE-13, NIX-SEC-06), the token
only as `github_access_token: ${{ secrets.GITHUB_TOKEN }}` (NIX-SEC-03), the
store cache (NIX-GATE-14), one trust-boundary step (NIX-SEC-02, NIX-SEC-03, NIX-SEC-04, NIX-SEC-08),
the Rust floor step (NIX-PKG-16), the manifest check (NIX-REL-01), and the
advisory flake-checker, Lix and floor legs (NIX-GATE-11, NIX-GATE-16). The
lock-refresh workflow is separate and opens a pull request a person merges
(NIX-INP-11, NIX-SEC-07).

### 9. Write the README install block

Copy the block from
[references/ci-and-readme.md](references/ci-and-readme.md#the-readme-install-block):
`nix run`, `nix profile add` with its Lix fallback comment, and the input
snippet with the optional `follows` line worded as "builds against your
nixpkgs, which this flake did not test" (NIX-REL-09). Run each line with `.`
in place of the `github:` ref before merging. The run against a pushed tag
belongs to the release procedure (NIX-REL-16).

### 10. Modernize an existing flake

Inventory the legacy forms first. Every line prints nothing on the templates.
On a planted legacy flake every line printed at least one hit.

```sh
# Each line: empty output (exit 1) is the pass, any line is a form to replace.
grep -rn -e 'flake-utils' -e 'eachDefaultSystem' -e 'flakeExposed' -e 'nix-systems/default' --include='*.nix' .
grep -rn -e 'x86_64-darwin' --include='*.nix' .
grep -rn -e 'import nixpkgs' -e 'import inputs.nixpkgs' --include='*.nix' .
grep -rn -e '[^A-Za-z0-9_-]pkgs\.system[^A-Za-z0-9_-]' -e '[^A-Za-z0-9_-]pkgs\.system$' -e '^pkgs\.system' --include='*.nix' .
grep -rn -E -e '^with lib[[:space:]]*;[[:space:]]*$' -e '^with lib[[:space:]]*;[[:space:]]*[^[[:space:]]' -e '^with pkgs[[:space:]]*;[[:space:]]*$' -e '^with pkgs[[:space:]]*;[[:space:]]*[^[[:space:]]' -e '^with builtins[[:space:]]*;[[:space:]]*$' -e '^with builtins[[:space:]]*;[[:space:]]*[^[[:space:]]' --include='*.nix' .
grep -rn -e 'mkDerivation rec' -e 'Package rec' --include='*.nix' .
grep -rn -e 'nixfmt-rfc-style' -e 'nixfmt-classic' -e 'nixpkgs-fmt' --include='*.nix' .
```

| Legacy form | Replace with | Rule |
|---|---|---|
| `flake-utils.lib.eachDefaultSystem`, `eachSystem`, `flakeExposed` | the template's `forAllSystems` over a literal list | NIX-FLK-08 |
| `x86_64-darwin` in the list | nothing. The line is deleted on a 26.11 or unstable pin | NIX-FLK-09 |
| `import nixpkgs { inherit system; }` in each output | `nixpkgs.legacyPackages.${system}`. A configured instance (unfree, a needed overlay) is created once, in one named binding | NIX-FLK-11 |
| `pkgs.system` | `pkgs.stdenv.hostPlatform.system`. Renaming the `import` argument is not the fix | NIX-FLK-12 |
| `with pkgs;` or `with lib;` at file scope, on its own line or opening a one-line body (`with pkgs; mkShell { … }`) | qualified names, or `inherit (lib) …;`. A list-scoped `with pkgs; [ … ]` stays | NIX-LANG-07 |
| `mkDerivation rec { … }` | a plain attribute set when nothing refers to the derivation's own attributes, `mkDerivation (finalAttrs: { … })` when something does. A hit is a candidate, and `rec` used only for `pname` and `version` interpolation is not a finding | NIX-PKG-14 |
| `nixfmt-rfc-style`, `nixfmt-classic`, `nixpkgs-fmt`, bare `pkgs.nixfmt` | `formatter = pkgs.nixfmt-tree`, then `nix fmt` in a commit of its own, since it reformats the tree | NIX-GATE-01, NIX-GATE-03 |
| `defaultPackage`, `devShell`, `overlay`, `defaultApp`, `nixosModule` | the plural forms. A published singular output stays one release behind `builtins.warn` | NIX-FLK-04 |
| a builder body inside `flake.nix` | a root `package.nix` from step 4 | NIX-FLK-14 |

Then replace `flake.nix` with step 3's template, carrying the existing package
names, and rewrite `package.nix` from step 4. `nix flake lock` prunes what the
template dropped. Watched: `• Removed input 'flake-utils'`, `• Removed input
'flake-utils/systems'`, `• Added input 'flake-compat'`. Count the warnings on
the home system before and after:

```sh
# The count after the migration is 0, or one line per singular output kept behind builtins.warn on purpose.
nix flake check --no-build 2>&1 | grep -c -e 'is deprecated; use' -e "has been renamed to/replaced by 'stdenv.hostPlatform.system'"
```

The planted legacy flake printed `3` (two singular outputs and one
`pkgs.system` read) and its modernized twin printed `0`. Its `--all-systems`
check went from `Nixpkgs 26.11 has dropped support for x86_64-darwin` to exit
0. Continue with steps 5 to 9.

## The MUST rows this procedure enforces

Merge-blocking rows, restated as findings so a review that runs this procedure
without the rule files loaded still reports them with the right ID. The
rationale and full verification live with the rule named by the ID.

| # | Finding | Rule |
|---|---|---|
| 1 | A file the flake reads was not `git add`ed before evaluation | NIX-FLK-16 |
| 2 | An exported overlay's first argument is not `final`, `_final` or `_` (`self: super:`, `prev: final:`), or it takes formals | NIX-FLK-02 |
| 3 | A manifest or lock is read through `"${src}/…"` or `self` at evaluation time | NIX-FLK-07, NIX-PKG-15 |
| 4 | Systems come from flake-utils, `flakeExposed` or an unmodified `nix-systems/default` | NIX-FLK-08 |
| 5 | `x86_64-darwin` is declared against a 26.11 or unstable nixpkgs | NIX-FLK-09 |
| 6 | `pkgs.system` is read | NIX-FLK-12 |
| 7 | New code emits a singular output (`defaultPackage`, `devShell`, `overlay`) | NIX-FLK-04 |
| 8 | A runnable package has no hardcoded `meta.mainProgram`, or CI never runs `nix run` | NIX-FLK-15 |
| 9 | A flake check counted as green ran only on Lix | NIX-FLK-19 |
| 10 | A hash was typed, guessed or left as a fake-hash symbol, or a fetcher argument changed without a hash reset | NIX-PKG-03, NIX-PKG-04 |
| 11 | `src` is `./.` or `self` unfiltered | NIX-PKG-05 |
| 12 | `meta.description`, `meta.license` or `meta.platforms` is missing, or a license is a compound SPDX string | NIX-PKG-07, NIX-PKG-08 |
| 13 | A CLI has no `versionCheckHook`, or its version check was switched off instead of pointed at the real entry point | NIX-PKG-13, NIX-PKG-19 |
| 14 | A Python library is exported only as a top-level attribute | NIX-PKG-21 |
| 15 | The tree has gitlinks and `flake.nix` lacks `inputs.self.submodules = true` | NIX-INP-09 |
| 16 | The formatter is bare `pkgs.nixfmt` or a dead name, or CI checks formatting without `nix fmt -- --ci` | NIX-GATE-01, NIX-GATE-02, NIX-GATE-03 |
| 17 | deadnix runs without `--fail` or without `--no-lambda-pattern-names` | NIX-GATE-05 |
| 18 | CI does not `nix build` every package the flake defines | NIX-GATE-10 |
| 19 | A workflow action is not pinned to a 40-hex SHA, or Nix is installed by a Determinate installer or a floating ref | NIX-GATE-12, NIX-GATE-13 |
| 20 | `version` is a literal or carries a suffix | NIX-REL-01, NIX-REL-02 |
| 21 | `accept-flake-config` appears anywhere, or a token sits in a tracked file | NIX-SEC-02, NIX-SEC-03 |

## What agents get wrong here

Ranked by how often it bites.

1. **Pastes `flake-utils.lib.eachDefaultSystem` boilerplate.** Its hidden list
   still carries `x86_64-darwin`, so `--all-systems` fails on nixpkgs 26.11.
2. **Blames the build when the file is untracked**, and chases the error
   instead of running `git ls-files --others --exclude-standard .`.
3. **Reads `Cargo.lock` through `${src}`.** Green on a warm laptop, red on a
   fresh CI runner, with an error that never names `cargoLock`.
4. **Writes NIX-PKG-21's Python overlay with an unused `final`.**
   `deadnix --fail --no-lambda-pattern-names` exits 1 with `Unused lambda
   argument: final`. Name it `_final`: CppNix 2.35.2, 2.31.5 and Lix 2.95.2 all
   accept `_final: prev:`. NIX-FLK-02 accepts `final`, `_final` or `_` as the
   first argument and rejects any other name and formals.
5. **Switches off `versionCheckPhase`** when a CLI without `--version` fails it
   after a full compile, instead of setting `versionCheckProgramArg`.
6. **Guards CI greps with `! grep`.** Bash's `-e` ignores a negated command, so
   the step can never fail. It also forgets that a pattern such as
   `accept-flake-config` matches the workflow's own line and the installed
   copies of these skills.
7. **Tells users to append `?submodules=1`**, or adds `submodules: true` to
   the checkout. `inputs.self.submodules = true` is enough: Nix fetched the
   submodule itself from a plain clone.
8. **Hardcodes `version = "0.1.0"`** in `package.nix`, which drifts at the next
   manifest bump.
9. **Adds the Lix feature flag to every implementation leg.** Only Lix needs
   `flake-self-attrs`.
10. **Passes two installables to one `nix eval`.** It exits with `unexpected
    argument` before evaluating anything.
11. **Proves a devShell with `nix develop` and no `-i`**, where a host binary on
    `PATH` answers for a missing tool.
12. **Trusts `nix flake check --no-build` with a `lib.fakeHash` in place.** It
    passes. Only the build prints the `got:` line.
