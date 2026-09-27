# Package templates

Loaded from step 4 of the `nix-flake-adopt` procedure. Each template was
copied into a toy repository and passed the skill's step 7 gate as printed on
2026-09-27 (CppNix 2.35.2, nixpkgs 26.11pre `8d5d2709`, nixfmt 1.5.0, deadnix
1.3.2), build included. Copy the file whole, then change only the lines each
section names.

Contents: [Rust CLI, one crate](#rust-cli-one-crate) ·
[Rust workspace with submodules](#rust-workspace-with-submodules) ·
[Python library](#python-library) ·
[The non-flake bridge](#the-non-flake-bridge)

## Rust CLI, one crate

`package.nix` at the repository root, beside `Cargo.toml`:

```nix
{
  lib,
  rustPlatform,
  versionCheckHook,
}:

rustPlatform.buildRustPackage {
  pname = "octool";
  version = (lib.importTOML ./Cargo.toml).package.version;

  src = lib.fileset.toSource {
    root = ./.;
    fileset = lib.fileset.unions [
      ./Cargo.toml
      ./Cargo.lock
      ./src
    ];
  };

  cargoLock.lockFile = ./Cargo.lock;

  strictDeps = true;
  __structuredAttrs = true;

  nativeInstallCheckInputs = [ versionCheckHook ];
  doInstallCheck = true;

  meta = {
    description = "Toy CLI that exercises the adopt template";
    homepage = "https://example.invalid/octool";
    license = lib.licenses.mit;
    mainProgram = "octool";
    platforms = lib.platforms.unix;
  };
}
```

Change `pname`, `mainProgram` (the binary's real name, never derived from
`pname`, NIX-FLK-15), and every `meta` value. The description starts with a
capital, has no leading article and no trailing period (NIX-PKG-07). `license`
is one `lib.licenses` attribute, or a list for a dual license. Never pass
`"MIT OR Apache-2.0"` to `lib.getLicenseFromSpdxId` (NIX-PKG-08). Add every
path the build or `cargo test` reads to the fileset (`./build.rs`, `./tests`,
`./examples`, `./benches`, and any fixture a test opens), and nothing else, so a
README commit leaves the `drvPath` unchanged (NIX-PKG-05). Count the `test
result:` lines in `nix build -L`: on sharkdp/hexyl the three-entry list ran 15
tests and silently skipped `tests/integration_tests.rs`, and adding `./tests`
and `./examples` ran 56 (watched 2026-09-27).

Add a native input only when a build error names it. rustls' aws-lc-sys
needs `nativeBuildInputs = [ pkg-config ];` at most on Linux, and a `Compiling
cmake` log line is the Rust wrapper crate, not a request for `cmake`
(NIX-PKG-17).

Watched red: the same crate printing `9.9.9` failed the build with `Did not find
version 0.1.0 in the output of the command …/bin/octool --version`, exit 1
(NIX-PKG-13).

## Rust workspace with submodules

The shape of ocx: a Cargo workspace whose version lives in
`[workspace.package]`, two binaries from one derivation, a path dependency that
sits in a git submodule, a git-sourced crate in `Cargo.lock`, and a CLI that
reports its version through a `version` subcommand and rejects `--version`.

```nix
{
  lib,
  rustPlatform,
  versionCheckHook,
}:

rustPlatform.buildRustPackage {
  pname = "tool";
  version = (lib.importTOML ./Cargo.toml).workspace.package.version;

  src = lib.fileset.toSource {
    root = ./.;
    fileset = lib.fileset.unions [
      ./Cargo.toml
      ./Cargo.lock
      ./rust-toolchain.toml
      ./crates
      ./external
    ];
  };

  cargoLock = {
    lockFile = ./Cargo.lock;
    outputHashes = {
      "itoa-1.0.15" = "sha256-7be7w9eSbX6d6nb6zaTNvp8gt8pxYdAQLGaaKfaUUns=";
    };
  };
  cargoBuildFlags = [
    "-p"
    "tool"
    "-p"
    "tool_shim"
  ];

  strictDeps = true;
  __structuredAttrs = true;

  nativeInstallCheckInputs = [ versionCheckHook ];
  versionCheckProgramArg = "version";
  doInstallCheck = true;

  meta = {
    description = "Toy workspace CLI with a submodule path dependency";
    homepage = "https://example.invalid/tool";
    license = lib.licenses.asl20;
    mainProgram = "tool";
    platforms = lib.platforms.unix;
  };
}
```

The flake's `inputs` gain one line, first, whenever `git ls-files --stage .`
lists a `160000` entry (NIX-INP-09):

```nix
{
  self.submodules = true;
  nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  flake-compat = {
    url = "github:NixOS/flake-compat";
    flake = false;
  };
}
```

What to change, line by line:

| Line | Keep it when | Otherwise | Rule |
|---|---|---|---|
| `outputHashes` | `grep -c 'source = "git+' Cargo.lock` prints more than `0`. One entry per distinct git revision, keyed by any one `name-version` from it, hash obtained in step 5 | delete the attribute and write `cargoLock.lockFile = ./Cargo.lock;` | NIX-PKG-22 |
| `cargoBuildFlags` | the workspace has more than one binary crate to ship. Name each `-p` | delete it: the default builds the root package | NIX-PKG-13 |
| `versionCheckProgramArg` | the CLI has no `--version` and does not print its version in `--help` | delete it: the hook's default runs `--version`, then `--help` | NIX-PKG-19 |
| `./external` | the path dependencies live in submodules there | list the real submodule directories | NIX-INP-09 |
| `./rust-toolchain.toml` | the file exists (the CI floor step reads it) | delete the line | NIX-PKG-16 |

Never answer a `versionCheckPhase` failure with `doInstallCheck = false`
(NIX-PKG-19). Set `doCheck = false` only with a comment naming why the tests
cannot run in the sandbox (network, a live registry).

Watched red on 2026-09-27: without `versionCheckProgramArg` the build printed
`error: unexpected argument '--version' found`, then `Did not find version
0.3.0`, exit 1. The missing-`self.submodules` red is in step 7 of the skill.

A plain clone without `--recurse-submodules` built green with
`self.submodules = true`: Nix fetched the submodule itself from `.gitmodules`.
The CI checkout therefore needs no `submodules:` option, and consumers never
append `?submodules=1`.

## Python library

`package.nix`, for a `pyproject.toml` whose backend is hatchling. Name the
backend the project declares, never the `setuptools` the evaluation error
suggests (NIX-PKG-18):

```nix
{
  lib,
  buildPythonPackage,
  hatchling,
}:

buildPythonPackage {
  pname = "toypkg";
  version = (lib.importTOML ./pyproject.toml).project.version;
  pyproject = true;

  src = lib.fileset.toSource {
    root = ./.;
    fileset = lib.fileset.unions [
      ./pyproject.toml
      ./src
    ];
  };

  build-system = [ hatchling ];
  pythonImportsCheck = [ "toypkg" ];

  meta = {
    description = "Toy library for the adopt template";
    homepage = "https://example.invalid/toypkg";
    license = lib.licenses.asl20;
    platforms = lib.platforms.unix;
  };
}
```

A library sets no `mainProgram` and no `versionCheckHook`. Its `flake.nix`
replaces the application overlay with NIX-PKG-21's `pythonPackagesExtensions`
form and has no devShell:

```nix
{
  description = "toypkg: one-line summary";

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
      overlays.default = _final: prev: {
        pythonPackagesExtensions = (prev.pythonPackagesExtensions or [ ]) ++ [
          (pyFinal: _pyPrev: {
            toypkg = pyFinal.callPackage ./package.nix { };
          })
        ];
      };
      packages = forAllSystems (pkgs: {
        toypkg = pkgs.python3Packages.callPackage ./package.nix { };
        default = self.packages.${pkgs.stdenv.hostPlatform.system}.toypkg;
      });
      checks = forAllSystems (pkgs: {
        inherit (self.packages.${pkgs.stdenv.hostPlatform.system}) toypkg;
      });
      formatter = forAllSystems (pkgs: pkgs.nixfmt-tree);
    };
}
```

The overlay is NIX-PKG-21's form. Its first argument is `_final` because
nothing reads it: `deadnix --fail --no-lambda-pattern-names` exits 1 on an
unused `final`, and CppNix 2.35.2, 2.31.5 and Lix 2.95.2 all accept `_final:
prev:`. NIX-FLK-02 accepts `final`, `_final` or `_` first, and nothing else.

Prove the export from a **second** flake that takes this one as an input,
applies `overlays.default` to its own nixpkgs, and defines `via-312 =
pkgs.python312.pkgs.toypkg;` and `via-313 = pkgs.python313.pkgs.toypkg;` under
`packages.x86_64-linux`. Evaluate each attribute in its own command, because
`nix eval` takes one installable and exits with `unexpected argument` on a second:

```sh
nix eval --no-write-lock-file --raw .#packages.x86_64-linux.via-312.drvPath
nix eval --no-write-lock-file --raw .#packages.x86_64-linux.via-313.drvPath
```

Each prints a distinct `python3.1N-toypkg-0.2.0.drv` path and exits 0. The
application-style overlay (`toypkg = final.python3Packages.callPackage …` at the
top level) fails the same probe with `error: attribute 'toypkg' missing`, exit
1 (watched 2026-09-27).

## The non-flake bridge

`default.nix` and `shell.nix` at the root, reading the `flake-compat` node the
flake template locks (NIX-REL-05). The two files differ only in the last
attribute:

```nix
(import (
  let
    lock = builtins.fromJSON (builtins.readFile ./flake.lock);
    node = lock.nodes.${lock.nodes.root.inputs.flake-compat}.locked;
  in
  fetchTarball {
    url = "https://github.com/NixOS/flake-compat/archive/${node.rev}.tar.gz";
    sha256 = node.narHash;
  }
) { src = ./.; }).defaultNix
```

`shell.nix` ends in `.shellNix` instead. `nix-build . --no-out-link` printed
the same store path as `nix build .#octool`, and `nix-shell . --run true` exited
0. This `fetchTarball` is the shim exemption of NIX-INP-10 and NIX-PKG-01.
