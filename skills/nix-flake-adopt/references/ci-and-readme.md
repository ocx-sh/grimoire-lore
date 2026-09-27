# CI workflow and README install block

Loaded from steps 8 and 9 of the `nix-flake-adopt` procedure. Every `run:` block
below was executed as printed, under `bash --noprofile --norc -eo pipefail` (the
shell GitHub Actions uses), against a toy Rust CLI, a toy Rust workspace with a
submodule and a toy Python library, on 2026-09-27 (CppNix 2.35.2, nixpkgs 26.11pre
`8d5d2709`, Lix 2.95.2, floor `nix_2_31` = 2.31.5). `actionlint` 1.7.12 exits 0 on
the file. The action SHAs were resolved from their release tags through the
GitHub API on the same day. No hosted runner executed the file, so the runner
matrix and the cache are untested (NIX-GATE-14, NIX-GATE-15 stay SHOULD).

Contents: [The workflow](#the-workflow) ·
[Per-repository edits](#per-repository-edits) ·
[Checking the workflow itself](#checking-the-workflow-itself) ·
[The README install block](#the-readme-install-block)

## The workflow

`.github/workflows/nix.yml`:

```yaml
name: nix
on:
  push:
    branches: [main]
  pull_request:
permissions:
  contents: read

jobs:
  gate:
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-24.04, ubuntu-24.04-arm, macos-15]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          install_url: https://releases.nixos.org/nix/nix-2.35.2/install
          github_access_token: ${{ secrets.GITHUB_TOKEN }}
      - uses: nix-community/cache-nix-action@7df957e333c1e5da7721f60227dbba6d06080569 # v7
        with:
          primary-key: nix-${{ runner.os }}-${{ runner.arch }}-${{ hashFiles('flake.lock') }}
      - name: format and dead code
        run: |
          nix fmt -- --ci
          if grep -rn -e 'nixfmt-rfc-style' -e 'nixfmt-classic' -e 'nixpkgs-fmt' --include='*.nix' .; then exit 1; fi
          nix shell --inputs-from . nixpkgs#deadnix --command deadnix --fail --no-lambda-pattern-names .
      - name: trust boundaries
        run: |
          fail=0
          grep -rnE --exclude-dir=.git --exclude-dir=.claude -e 'accept-flake-[c]onfig' -e 'trusted-[u]sers' -e 'settings\.access-[t]okens' -e 'gh[pousr]_[A-Za-z0-9]{20,}' -e 'github_pat_[A-Za-z0-9_]{20,}' -e 'glpat-[A-Za-z0-9_-]{20,}' . && fail=1
          grep -rn --exclude-dir=.git --exclude-dir=.claude --exclude='*.md' --exclude='*.mdx' -e 'access-[t]okens *=' -e '--access-[t]okens' . | grep -v -e '[$]{{ secrets[.]' -e '[$]{{ github[.]token }}' && fail=1
          git ls-files -- '*.env' '*.env.*' '*.pem' '*.key' '*.p12' '*.pfx' '*secret*' '*token*' '*credential*'
          exit "$fail"
      - name: flake check
        run: |
          nix flake check --no-build --option allow-import-from-derivation false
          nix flake check --all-systems --no-build
      - name: build and run
        run: |
          nix build --print-build-logs .#octool
          nix run .#octool -- --version
      - name: rust toolchain floor
        if: hashFiles('rust-toolchain.toml') != ''
        run: |
          ch=$(sed -n 's/^channel *= *"\(.*\)"/\1/p' rust-toolchain.toml)
          v=$(nix eval --raw --inputs-from . nixpkgs#rustc.version)
          nix eval --expr "builtins.compareVersions \"$v\" \"$ch\" >= 0" | grep -qx true
      - name: version equals the manifest
        run: |
          test "$(nix eval --raw .#packages.x86_64-linux.default.version)" = "$(grep -m1 -E -e '^version[[:space:]]*=' Cargo.toml | cut -d'"' -f2)"
      - name: flake-checker (advisory)
        continue-on-error: true
        run: |
          nix shell --inputs-from . nixpkgs#flake-checker --command flake-checker --no-telemetry --fail-mode --condition "numDaysOld < 30 && ((gitRef == '' && owner == '') || (supportedRefs.contains(gitRef) && owner == 'NixOS'))" flake.lock

  implementations:
    strategy:
      fail-fast: false
      matrix:
        leg: [lix, floor]
    runs-on: ubuntu-24.04
    continue-on-error: true
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          install_url: https://releases.nixos.org/nix/nix-2.35.2/install
          github_access_token: ${{ secrets.GITHUB_TOKEN }}
      - name: lix
        if: matrix.leg == 'lix'
        run: nix shell --inputs-from . nixpkgs#lix --command nix flake check --no-build
      - name: floor
        if: matrix.leg == 'floor'
        run: |
          floor=$(nix eval --raw --inputs-from . nixpkgs#nixVersions --apply 'v: builtins.head (builtins.filter (n: builtins.match "nix_2_[0-9]+" n != null && (builtins.tryEval (builtins.getAttr n v).version).success) (builtins.attrNames v))')
          nix shell --inputs-from . "nixpkgs#nixVersions.$floor" --command nix flake check --no-build
```

What each step carries:

| Step | Blocks a merge | Rules |
|---|---|---|
| checkout, installer, cache | yes | NIX-GATE-12 (40-hex SHAs), NIX-GATE-13 and NIX-SEC-06 (upstream CppNix pinned by `install_url`), NIX-SEC-03 (the token only from `secrets`), NIX-GATE-14 |
| format and dead code | yes | NIX-GATE-01, NIX-GATE-02, NIX-GATE-03, NIX-GATE-05 |
| trust boundaries | yes | NIX-SEC-02, NIX-SEC-03, NIX-SEC-08, NIX-SEC-04 |
| flake check | yes | NIX-GATE-08, NIX-GATE-09 |
| build and run | yes | NIX-GATE-10, NIX-PKG-13, NIX-FLK-15 |
| rust toolchain floor | yes, when `rust-toolchain.toml` exists | NIX-PKG-16 |
| version equals the manifest | yes | NIX-REL-01 |
| flake-checker | no | NIX-GATE-11, NIX-INP-06 |
| lix, floor | no | NIX-GATE-16, NIX-FLK-19 |

Three shell details in the file are load-bearing. Keep them when editing:

- **No bare `! grep`.** Bash's `-e` ignores the status of a command negated with
  `!`, so `! grep … .` inside a `run:` block never fails the step. The file uses
  `if grep …; then exit 1; fi` and `grep … && fail=1`. The two grep lines are
  the `nix-quality` rule's gate step 2a, verbatim. Watched 2026-09-27 (GNU grep
  3.12): each planted violation alone failed the step (an
  `--accept-flake-config` README line, a `trusted-users` module line, a literal
  `ghp_` token, a `nix.settings.access-tokens` line even when fed from
  `${{ secrets.… }}`, a literal `access-tokens =` workflow line, and an
  `extra-access-tokens =` or `--access-tokens` line). A `${{ secrets.… }}` or
  `${{ github.token }}` access-tokens line passed, as did a README placeholder.
  The `git ls-files` line prints candidates to read by hand and never fails the
  step: name globs such as `*token*` match `semantic_tokens.rs`. Watched: it
  listed a tracked `secret.env` and left the step green.
- **Bracketed patterns** (`accept-flake-[c]onfig`, `trusted-[u]sers`,
  `settings\.access-[t]okens`, `access-[t]okens *=`) match the real strings but
  not the workflow's own line, so the gate does not report itself. The clean
  fixture, which carries this file, passed, and so did its twin with the rules
  and skills installed under `.claude`. Installed copies of the nix-quality rules and these skills contain
  every pattern in full, so each grep also takes `--exclude-dir=` for the
  directory your agent client installs into (`--exclude-dir=.claude` in the file
  above).
- **No `${{` inside `run:` text.** GitHub expands it before the shell runs, so
  the secrets filter is spelled `'[$]{{ secrets[.]'` and `'[$]{{ github[.]token }}'`.

## Per-repository edits

| Edit | When | Rule |
|---|---|---|
| Replace `.#octool` with one `nix build` line per package the flake defines | always | NIX-GATE-10 |
| Replace `-- --version` with the version entry point the package names (`-- version` for a CLI with a `version` subcommand). Delete the `nix run` line for a library | always | NIX-FLK-15, NIX-PKG-19 |
| Replace `Cargo.toml` in the manifest step with `pyproject.toml` | Python | NIX-REL-01 |
| Replace `Cargo.toml` in the manifest step with the member crate's manifest (`crates/octool/Cargo.toml`) | the root manifest has no `[package]` or `[workspace.package]` version, so its first `version =` line belongs to another table (zed: `[workspace.dependencies.windows]`) | NIX-REL-01 |
| Append `--extra-experimental-features flake-self-attrs` to the **lix** line only | `flake.nix` declares `inputs.self` | NIX-GATE-16, NIX-INP-09 |
| Drop `macos-15` from the matrix | the flake does not declare `aarch64-darwin` | NIX-GATE-15 |
| Add a `nix build .#checks.x86_64-linux.smoke` line per non-package check (substitute your check name) | a `checks` entry that is not a package | NIX-GATE-10 |
| Replace `.claude` in each `--exclude-dir=.claude` of the trust-boundaries step with the directory your agent client installs rules and skills into | the repository commits installed rules or skills, whose text names the banned strings, outside `.claude` | NIX-SEC-02, NIX-SEC-03, NIX-SEC-08 |

Watched on the workspace fixture: the Lix leg without the flag failed with
`experimental Lix feature 'flake-self-attrs' is disabled`, exit 1, and passed
with it. The floor leg (CppNix 2.31.5) passed without it. The rust floor step
failed with `channel = "99.0.0"` and passed with `1.85.0` against rustc 1.98.1.

The lock-refresh workflow is separate: weekly, SHA-pinned, opening a pull
request under a GitHub App or fine-grained token so this workflow runs on it,
and never merged automatically (NIX-INP-11, NIX-SEC-07).

## Checking the workflow itself

```sh
# Empty output is the pass. Any line is an action not pinned to a 40-hex SHA (NIX-GATE-12).
grep -rn -E -e 'uses:[[:space:]]*[^.[:space:]][^[:space:]]*@' .github/workflows |
  grep -v -E -e '@[0-9a-f]{40}[[:space:]]' -e '@[0-9a-f]{40}$'
# Empty output is the pass. A floating ref or a Determinate installer is the finding (NIX-GATE-13).
grep -rn -e '@main' -e 'nix-installer-action' .github/workflows
```

Watched: the first printed both `actions/checkout@v7` lines of a planted copy,
the second printed a planted `nix-installer-action@main` line, and a local
`./` action passed the first. Both printed nothing on the file above.

## The README install block

For an application flake. Rename `example/octool` to the repository's
`owner/repo` and `octool` to the input name:

````markdown
## Install with Nix

```sh
nix run github:example/octool -- --help
nix profile add github:example/octool # Lix, or Nix < 2.30: nix profile install
```

As a flake input:

```nix
{
  inputs.octool.url = "github:example/octool";
  # Optional: builds against your nixpkgs, which this flake did not test.
  inputs.octool.inputs.nixpkgs.follows = "nixpkgs";
}
```
````

A library flake gives only the input snippet. Never write `nix-env -i`, never
`nix profile install` as the primary line (Lix 2.95.2 rejects `add`, CppNix
2.35.2 warns on `install`), never `--accept-flake-config` (NIX-REL-09,
NIX-SEC-02), and never tell users to add themselves to `trusted-users`
(NIX-SEC-08). Under the pinned no-cache default there is no substituter line.

| Check | Command | Pass |
|---|---|---|
| no banned install line | `grep -n -e 'nix-env -i' -e 'nix-env --install' -e 'accept-flake-[c]onfig' README.md` | empty output (exit 1). Any line is the finding (NIX-REL-09). Exit 2 means no root `README.md`: name the file that carries the install section. Nested READMEs of vendored or example code are out of scope |
| `install` only as the comment | `grep -c -e '^ *nix profile install' README.md` | prints `0` with exit 1. `1` or more (exit 0) is the finding (NIX-REL-09) |
| the lines work | each line run with `.` in place of `github:example/octool` | exit 0. Before the first push the `github:` ref does not exist yet. The pushed-tag run is NIX-REL-16's, in the release procedure |

Watched: a README carrying `nix profile install … --accept-flake-config` and
`nix-env -i` hit both greps. The block above hit neither, and `nix run . --
--help` and `nix profile add --profile` into a scratch profile exited 0.
