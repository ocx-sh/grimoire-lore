---
paths:
  - "**/*.nix"
  - "**/flake.lock"
  - "**/statix.toml"
summary: The Nix quality index, holding the gate, the non-negotiables, the flake shapes and where the depth lives
keywords: nix,nixpkgs,flake,flakes,flake.lock,follows,derivation,package.nix,overlay,devshell,nixfmt,deadnix,statix,flake-checker,lix,nixconfig,generated-flake,release
license: Apache-2.0
repository: https://github.com/ocx-sh/grimoire-lore
---

# Nix Quality

Traps, not tutorials. Every line names a mistake generated Nix makes by default.
The language manual and the nixpkgs manual are already in the model, so neither is in this file.

Contents: [The Gate](#the-gate) · [Non-Negotiables](#non-negotiables) ·
[Rules This File Owns](#rules-this-file-owns) · [Where the Depth Is](#where-the-depth-is) ·
[Severity](#severity) · [Siblings](#siblings)

**Before trusting any rule below, read the era (NIX-CORE-04) and name the flake's
shape (NIX-CORE-05).** Rows in every family are gated by the locked nixpkgs branch
(nixpkgs 26.11 throws on any `x86_64-darwin` attribute), by the implementation
(Lix 2.95.2 accepts overlays CppNix rejects) and by the shape, which each Severity
cell names. A flake whose outputs span several shapes takes every one of their rows.
This rule installs with `paths: ["**/*.nix", "**/flake.lock", "**/statix.toml"]`.
`.envrc`, workflow files, `treefmt.toml` and README install blocks are never
globbed, so the routing table reaches them by task.

| Shape | Recognised by | Example |
|---|---|---|
| A app | `packages` or `apps` built from the repository's own source | a CLI with `package.nix` |
| B library | `lib`, `overlays` or `flakeModules` only, functions that take the caller's `pkgs` | a builder library |
| C module | `nixosModules`, `homeModules` or `darwinModules` | a service module |
| D generated | a committed data file, a small reader and a CI updater | a flake generated from the ocx package index |
| E template | `templates` | a `nix flake init -t` starter |

## The Gate

Run it after every change from a local checkout, never by remote ref, cheapest step
first. Steps 1 to 6 block a merge. Steps 7 to 9 are advisory and run as
`continue-on-error` jobs.

```sh
nix fmt -- --ci                                                           # 1 NIX-GATE-01/02: exit 0 pass, exit 1 unformatted (it writes the fix)
grep -rn -e 'nixfmt-rfc-style' -e 'nixfmt-classic' -e 'nixpkgs-fmt' --include='*.nix' .   # 2 NIX-GATE-03: empty = pass
# 2a security, NIX-SEC-02, NIX-SEC-03, NIX-SEC-08: empty output from the two grep lines = pass; a NIX-SEC-08 hit inside an exported host-administration module is read and passes. The NIX-SEC-04 git ls-files line is a reading step: each listed path is read, and only a tracked plaintext credential is the finding.
grep -rnE --exclude-dir=.git --exclude-dir=.claude -e 'accept-flake-[c]onfig' -e 'trusted-[u]sers' -e 'settings\.access-[t]okens' -e 'gh[pousr]_[A-Za-z0-9]{20,}' -e 'github_pat_[A-Za-z0-9_]{20,}' -e 'glpat-[A-Za-z0-9_-]{20,}' .
grep -rn --exclude-dir=.git --exclude-dir=.claude --exclude='*.md' --exclude='*.mdx' -e 'access-[t]okens *=' -e '--access-[t]okens' . | grep -v -e '[$]{{ secrets[.]' -e '[$]{{ github[.]token }}'
git ls-files -- '*.env' '*.env.*' '*.pem' '*.key' '*.p12' '*.pfx' '*secret*' '*token*' '*credential*'
deadnix --fail --no-lambda-pattern-names --exclude vendor tests/fixtures -- .   # 3 NIX-GATE-05: exit 0 pass, list only excludes that exist
git ls-files --others --exclude-standard .                                # 3a NIX-FLK-16: empty = pass, git add what it lists
nix flake check --no-build --option allow-import-from-derivation false    # 4 NIX-GATE-08, the output contract: exit 0 pass
nix flake check --all-systems --no-build                                  # 5 NIX-GATE-09: exit 0 pass, a red is triaged first
set -o pipefail; nix eval --raw .#packages.x86_64-linux --apply 'ps: toString (map (n: ".#packages.x86_64-linux.\\\"" + n + "\\\"") (builtins.attrNames ps))' | xargs -r nix build --no-link --print-build-logs   # 6 NIX-GATE-10: exit 0 pass, 123 a package failed, 1 the package set did not evaluate
flake-checker --no-telemetry --fail-mode --condition "numDaysOld < 30 && ((gitRef == '' && owner == '') || (supportedRefs.contains(gitRef) && owner == 'NixOS'))" flake.lock 2> flake-checker.err   # 7 NIX-INP-06: exit 0 clean
grep -c -e 'Error: Invalid(' -e 'Error: FlakeLock(' flake-checker.err    # 7 NIX-GATE-11, after exit 1: 0 = finding, 1+ = tool could not run
nix shell --inputs-from . nixpkgs#lix --command nix flake check --no-build --extra-experimental-features flake-self-attrs   # 8 NIX-GATE-16 Lix leg: exit 0 pass
nix eval --json --inputs-from . nixpkgs#nixVersions --apply 'v: builtins.filter (n: builtins.match "nix_2_[0-9]+" n != null && (builtins.tryEval (v.${n}.version or null)).success) (builtins.attrNames v)'   # 9 the first element is the floor
nix shell --inputs-from . nixpkgs#nixVersions.nix_2_31 --command nix flake check --no-build   # 9 NIX-GATE-16 floor leg, nix_2_31 replaced by that element
```

Substitute each system the runner can build for `x86_64-linux` in step 6, and in
step 2a replace `.claude` with the directory your agent client installs rules into,
whose copies name every banned string. The bracketed patterns and `[$]{{` keep a
workflow or gate script that carries these lines from matching itself. CI wiring
(`if grep …; then exit 1; fi`, never `! grep …`) is NIX-GATE's.
B and C flakes that export no packages skip steps 6 and 7 and build their `checks`.
A D flake builds only the packages whose data changed, per NIX-GEN-15. An E flake
also runs steps 1 to 4 inside the template directory, because it is copied verbatim.

Measured 2026-09-27 on CppNix 2.35.2, nixpkgs 26.11pre `8d5d2709`, nixfmt 1.5.0
(nixfmt-tree 2.6.0), deadnix 1.3.2, flake-checker 0.2.15 and Lix 2.95.2. CI pins
Nix through NIX-GATE-13's `install_url`. Judge each step by what its comment
names, never by a summary line: `nix flake check` prints `all checks passed!`
without building a package. Chain steps 1 to 6 into one named target that fails a
grep step on any output rather than on its exit code, except the NIX-SEC-04 `git ls-files`
line and a NIX-SEC-08 host-module hit, which are read, and have CI and every agent
loop call it, never a hand-copied subset. A task is done when a command, its exit
code and the tree it ran against are all named. Narration is not evidence.

## Non-Negotiables

Every line below blocks a merge within the shapes it names. IDs resolve through
[Where the Depth Is](#where-the-depth-is), where each rule carries its rationale
and verification. The gate block's own rules are not repeated here.

| # | Rule | ID |
|---|---|---|
| 1 | `git add` every new file a flake reads (`package.nix`, patches, `flake.lock`) before any `nix eval`, `nix build` or `nix flake check`. An untracked file is absent from the source Nix sees, and no error names it. | NIX-FLK-16 |
| 2 | Never read a file at evaluation time through the flake's own source store path (`"${src}/Cargo.lock"`, `builtins.path { path = self; }`). Read `./Cargo.lock` and `./Cargo.toml`. The failure shows only on a cold store, so a warm laptop hides it. | NIX-FLK-07, NIX-PKG-15 |
| 3 | Iterate systems with `nixpkgs.lib.genAttrs` over a literal list. No flake-utils, `lib.systems.flakeExposed` or `nix-systems/default`, and no `x86_64-darwin` against nixpkgs 26.11 or unstable (A, D, E). | NIX-FLK-08, NIX-FLK-09 |
| 4 | Never read `pkgs.system` or `.system` on any package set. Use `pkgs.stdenv.hostPlatform.system`. | NIX-FLK-12 |
| 5 | On a host whose `nix --version` prints `Lix`, count the output contract green only after gate step 4 ran on CppNix 2.31.5 or later. Lix 2.95.2 passes `self: super:` overlays and a string `formatter` that CppNix rejects. | NIX-FLK-19 |
| 6 | Never write a hash by hand. Every fetcher edit resets `hash` to `lib.fakeHash`, takes the `got:` value and is verified with `nix build --rebuild`. A plain build silently reuses the old source. | NIX-PKG-03, NIX-PKG-04 |
| 7 | `src` is `lib.fileset.toSource` over an explicit list, never `./.` or `self`, so a README-only edit leaves the `drvPath` unchanged (A). | NIX-PKG-05 |
| 8 | Read `version` from the manifest through a source-tree path (`(lib.importTOML ./Cargo.toml).package.version`) and emit it verbatim, with no rev, date, `-dirty` or `-unstable` suffix, so the version at tag `vX.Y.Z` is `X.Y.Z` (A). | NIX-REL-01, NIX-REL-02 |
| 9 | Reach a file or a derivation output at build time only through interpolation or `lib.fileset.toSource`, never `toString ./path` or `builtins.unsafeDiscardStringContext`. | NIX-LANG-02 |
| 10 | Keep `builtins.getEnv`, `builtins.nixPath`, `builtins.currentSystem` and `<nixpkgs>` out of anything reachable from `outputs`. Pure evaluation returns `""` and `[ ]` for the first two with exit 0, and `--impure` is not the fix. | NIX-LANG-04 |
| 11 | Classify an `infinite recursion encountered` by shape with `--show-trace` before changing anything. Never apply a generic fix: deleting a system, deleting the overlay or renaming `final:` to `self:`. | NIX-LANG-10 |
| 12 | Never set, pass, script or recommend `accept-flake-config`, in any file, and never answer Nix's trust prompt with "permanently". | NIX-SEC-02 |
| 13 | Never let a secret reach evaluation: no tracked secret file, no `readFile` or `getEnv` of a secret, no credential in a derivation attribute (`curlOptsList`, `netrc`, `env`). Every store object is world-readable. | NIX-SEC-04 |
| 14 | Evaluate a flake you do not own only at a full 40-hex rev with `--no-write-lock-file --option allow-import-from-derivation false`, and never `nix develop`, `nix shell`, `nix run` or `direnv allow` it. | NIX-SEC-05 |
| 15 | Never put `abort-on-warn` on `nix flake check` or a whole-flake build. Apply it only to named current attributes or to a `packages.<system>` set that carries no deprecation shims. | NIX-REL-11 |

## Rules This File Owns

Six cross-cutting rules that belong to no single depth file. Everything else is
defined in a depth file and only cited here. The commands they name are in the
block under the table, run from the repository root.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-CORE-01 | Never reach green by weakening the check. A change adds no `# deadnix: skip`, `doCheck = false` or `doInstallCheck = false`, no `--impure`, no `--no-verify`, no `continue-on-error`, and removes no `versionCheckHook`, no `deadnix --fail`, no `allow-import-from-derivation false` and no system from the systems list. It adds no exclude, disabled lint or skipped leg to `statix.toml`, `treefmt.toml` or a workflow. The only such moves allowed are the ones a depth rule prescribes: dropping `x86_64-darwin` (NIX-FLK-09), `continue-on-error` on the flake-checker step (NIX-INP-06, NIX-GATE-11) and on the Lix and floor legs (NIX-GATE-16), NIX-GATE-06's statix list and NIX-GATE-08's commented IFD exception. | The gate's value is that it can go red. A change that edits the code and the check that judges it reports green and reads like a passing one. Agents answer a `versionCheckPhase` failure with `doInstallCheck = false` (NIX-PKG-19) and an `--all-systems` red by deleting a system (NIX-GATE-09). | `weaken-check`: every printed line is read, a move no depth rule prescribes is the finding, and empty output is the pass. `gate-files-touched`: any output in a change that is not itself a gate change is the finding. Watched 2026-09-27 (git 2.54.0, GNU grep 3.12): a planted branch printed its dropped system, `# deadnix: skip`, `doInstallCheck = false`, the removed hook, the dropped `--fail` and IFD option, `--impure`, `continue-on-error` and the workflow file, and a twin that dropped only `x86_64-darwin` printed nothing. | MUST, every shape | git ≥2.30 (`--merge-base`) |
| NIX-CORE-02 | A verification enters a rule, a CI job or a review only after it has been watched go red on a planted violation and green on a compliant twin, on the Nix implementation and version it names and on the store state it depends on. A check that cannot be watched is written as a named reading heuristic, never as a command. | A check that cannot fail launders an unchecked change. Nix has one of each kind: deadnix without `--fail` exits 0 on findings, `--no-build` alone passes an IFD flake on a warm store, flake-checker without `--fail-mode` exits 0, Lix passes overlays CppNix rejects, and a plain `nix build` after a fetcher edit reuses the stale source. | Copy the subject into a fixture, run `git init -q && git add -A` (NIX-FLK-16), break the thing the rule forbids and run the verification: a pass on the broken copy is the violation. Run it on the twin: a red there is a false positive. Record whether the store was cold or warm. | MUST, every shape | every implementation |
| NIX-CORE-03 | State in every verification what empty output and each exit code mean, and name the Nix or tool version it was watched on. | Nix checks invert both ways. `grep -c` prints `0` with exit 1 on the pass, `git ls-files` exits 0 whether or not it lists a file, the step 6 pipeline exits 123 when one package fails, `getEnv` returns `""` with exit 0, an `unknown flake output` warning exits 0, and `nix derivation show` failing still leaves a `0` count. A presence check (NIX-GATE-13's `install_url`, NIX-GATE-10's workflow `nix build`) fails on empty output. | Read each verification cell: one whose empty output or exit code is ambiguous, or that names no version, is the violation. | SHOULD, every shape | every implementation |
| NIX-CORE-04 | Before writing or judging era-gated Nix, read `nix --version` (implementation and version) and the root nixpkgs node of `flake.lock` (its ref or rev, its original type and its locked type), and use only the idioms that era admits. | Era decides the right answer, and the idiom that was right a branch earlier is what a model writes: `x86_64-darwin` throws from nixpkgs 26.11, `nixfmt-rfc-style` is a warning alias on 26.11pre, `cargoSha256` fails from 25.05, `nix profile add` exists from CppNix 2.30 and Lix rejects it, and `nix flake check` skips substitutable checks from 2.32. NIX-LANG-08 keys error diagnosis on the same reads. | The `era` lines print the inputs, which are read, not counted. The finding is an era-gated edit or suggestion made without them. Watched 2026-09-27 (jq 1.8.1): a branch input printed `nixos-unstable`, `github`, `github`, an indirect one printed `nixos-unstable`, `indirect`, `tarball` (a NIX-INP-05 finding), a lock with no nixpkgs node printed `null` three times, and a lock whose root names the node `nixpkgs_2` printed that node. A root `nixpkgs` that follows another input exits 5 with `Cannot index object with array`: read the followed input's node. `nix --version` printed `nix (Nix) 2.35.2` and `nix (Lix, like Nix) 2.95.2`. | MUST, every shape | CppNix 2.35.2, Lix 2.95.2 |
| NIX-CORE-05 | Name the flake's shape from its outputs, using the table above, before applying a rule, and apply every row whose Severity cell names a shape the flake has. | Shapes need opposite answers: B takes no nixpkgs input while A pins one, D never builds every package while A must, and a module export needs a check `nix flake check` never runs. A rule applied to the wrong shape fails a correct flake. | The `shape` lines print the output census, read against the shape table. `nix flake show` must exit 0 first. For a flake you do not own, add NIX-SEC-05's flags before running it. Reading heuristic. | MUST, every shape | CppNix 2.35.2 |
| NIX-CORE-06 | A generated `.nix` file opens with a `# Generated by` comment naming the generator and its input, sits in NIX-GATE-04's exclude list, is emitted deterministically (NIX-GEN-17) and is regenerated, never hand-edited. A generated JSON data file, which cannot carry a comment, is written only by its updater (NIX-GEN-16). | The next generator run silently reverts a hand edit, and a formatter or linter that grades generated output fights the generator. A header below a license line escapes a check that reads only line 1. | `generated-touch` lists the generated Nix files this change edits. Each needs a generator rerun that reproduces it, a hand edit is the finding, and empty output is the pass. Watched 2026-09-27 (git 2.54.0, GNU grep 3.12): a hand edit to a file whose header sits on line 2 was printed while a line-1 check missed it, and a change to the generator input printed nothing, and a hand edit to a package whose comment reads `(generated by GitHub or cgit)` printed nothing (38 such nixpkgs files). A hand edit to the data file is a reading heuristic over the commit's author. | MUST (D, and any shape carrying generated Nix) | git 2.54.0 |

```sh
BASE=origin/main   # the branch this change merges into, rename it
# weaken-check (NIX-CORE-01): every printed line is read. Empty output is the pass.
git diff -U0 --merge-base "$BASE" -- '*.nix' '*.yml' '*.yaml' '*.sh' '*Makefile' | grep -v -e '^+++' -e '^---' \
  | grep -e '^+.*deadnix: skip' -e '^+.*doCheck = false' -e '^+.*doInstallCheck = false' -e '^+.*--impure' -e '^+.*--no-verify' -e '^+.*continue-on-error: true' \
    -e '^-.*versionCheckHook' -e '^-.*deadnix --fail' -e '^-.*allow-import-from-derivation false' -e '^-.*"x86_64-linux"' -e '^-.*"aarch64-linux"' -e '^-.*"aarch64-darwin"'
# gate-files-touched (NIX-CORE-01): any output in a change that is not itself a gate change is the finding.
git diff --name-only --merge-base "$BASE" -- statix.toml treefmt.toml .github/workflows
# era (NIX-CORE-04): read, not counted. The first line of nix --version names the implementation.
nix --version
jq -r '.nodes[.nodes.root.inputs.nixpkgs // "nixpkgs"] | .original.ref // .original.url // .original.rev, .original.type, .locked.type' flake.lock
# shape (NIX-CORE-05): the output census, read against the shape table.
nix flake show --json --no-write-lock-file . > show.json
jq -r 'keys' show.json
# generated-touch (NIX-CORE-06): generated Nix files this change edits. Empty output (exit 123 from xargs, or 0 with no files) is the pass.
git diff --name-only --diff-filter=d --merge-base "$BASE" -- '*.nix' | xargs -r grep -l -i -e '^# [^(]*generated by' -e '^# .*autogenerated' -e '^# .*auto-generated' -e '^# .*do not edit'
```

## Where the Depth Is

Read the file for the work you are about to do, not for the topic it is filed
under. One level deep: these files do not point at each other.

| Doing… | Read |
|---|---|
| Writing or restructuring `flake.nix` outputs, iterating systems, instantiating nixpkgs, adding packages, overlays, apps, devShells, formatter, checks or templates | [nix-quality/flakes.md](nix-quality/flakes.md) |
| Adding, removing or retargeting an input, writing `follows`, bumping or reviewing `flake.lock`, using submodules, LFS or sub-flakes | [nix-quality/inputs.md](nix-quality/inputs.md) |
| Writing or editing a derivation or `package.nix`: fetchers and hashes, `src` filtering, `meta`, phases, version checks, Rust or Python builders | [nix-quality/packaging.md](nix-quality/packaging.md) |
| Packaging a binary you did not build, or generating packages from an external index (committed data, reader, updater) | [nix-quality/generated-flakes.md](nix-quality/generated-flakes.md) |
| Running or wiring the gate: formatter, deadnix, statix, `nix flake check`, the CI workflow, installer, cache, implementation legs | [nix-quality/gates.md](nix-quality/gates.md) |
| Choosing a version string, tagging or publishing, deprecating an output, writing install instructions, supporting non-flake users, running nix-update, preparing a nixpkgs copy | [nix-quality/release.md](nix-quality/release.md) |
| Writing Nix expressions (`rec`, `let`, `with`, `//`, paths and string context, impure builtins) or reading an evaluation error | [nix-quality/language.md](nix-quality/language.md) |
| Touching `nixConfig`, tokens, secrets, substituters or trusted keys, the Nix version CI runs, or evaluating a flake you do not own | [nix-quality/security.md](nix-quality/security.md) |
| Writing a NixOS, home-manager, nix-darwin or flake-parts module a flake exports, or the check that evaluates one | [nix-quality/modules.md](nix-quality/modules.md) |
| Editing `.envrc` (devShell), a Nix job in `.github/workflows/` or `treefmt.toml` (the gate), or a README install block | flakes.md, gates.md and release.md above, in that order |
| Diagnosing an evaluation, build or check failure | the `nix-diagnose` skill |
| Adding a flake to a repository or modernizing one, or cutting a release | the `nix-flake-adopt` and `nix-flake-release` skills |
| Editing `Cargo.toml`, `rust-toolchain.toml` or a cargo-dist config beside a flake | `rust-cargo` (sibling rule) |
| Editing `pyproject.toml` or `uv.lock` beside a flake | `python-packaging` (sibling rule) |
| Editing `go.mod` or `go.sum` beside a flake | `go-modules` (sibling rule) |
| Wiring Nix into a Bazel build through `rules_nixpkgs` | `bazel-quality` (sibling rule) |
| Writing README or CHANGELOG prose around an install block | `docs-quality` (sibling rule) |

## Severity

MUST = Block: fix before it lands. SHOULD = Warn: fix, or state why not in the
commit body. CONSIDER = Suggest: never blocks, never re-raised after a decline.
A MUST binds only the shapes its Severity cell names.

Rules marked **pinned** encode an agreed decision rather than a derivable fact.
Each is a default an adopter may override, once, in the flake or the copied CI,
never per package and never per call site. Overriding one is a decision recorded
with its reason, ignoring one is a violation, and re-arguing one in a pull request
is not a review comment.

| Pinned default | Owner |
|---|---|
| **pinned** No FlakeHub, as input or as publish target. | NIX-REL-06 |
| **pinned** No public binary cache and no `nixConfig`, so every CI build really compiles. | NIX-SEC-01, NIX-REL-15 |
| **pinned** Every `package.nix` is by-name-ready now and goes to nixpkgs after the CLI's first stable release. | NIX-PKG-06, NIX-REL-14 |
| **pinned** A generated flake lives in its own repository, updated by CI from the index, with the generator a subcommand of the index's own client (ocx: `ocx-sh/ocx-nix`). | NIX-GEN-02, NIX-GEN-16 |
| **pinned** A generated flake keeps every digest until its data file passes 20 MB. | NIX-GEN-17 |
| **pinned** CppNix is the gate of record, Lix and the floor are advisory legs, and Determinate Nix is untested and never deliberately broken. | NIX-GATE-16, NIX-REL-12 |
| **pinned** The project exports no modules, and the module rows ship for adopters who do. | the NIX-MOD family |
| **pinned** The consumer floor is NIX-GATE-16's computed floor (today `nix_2_31` = 2.31.5), never a hardcoded version. | NIX-GATE-16, NIX-REL-12 |

Keep the Block list short enough that a blocked change is unusual. A rule set
where everything blocks teaches the reader to negotiate with all of it.

## Siblings

- **`rust-cargo`, `python-packaging` and `go-modules`**: the manifest a `package.nix` reads its version
  from, the lockfile it vendors and the release tooling beside the flake. This rule owns only how Nix
  reads them (NIX-REL-01, NIX-PKG-15, NIX-PKG-18).
- **`bazel-quality`**: Bazel builds that take tools from nixpkgs through `rules_nixpkgs`. It has no Nix glob of its own.
- **`docs-quality`**: README and CHANGELOG prose. The install block's commands are NIX-REL-09's, and its prose is `docs-quality`'s.
- **`nix-flake-adopt`, `nix-flake-release` and `nix-diagnose`**: procedures that cite these IDs by number
  and never restate them. The `nix-essentials` bundle ships all four artifacts together.
