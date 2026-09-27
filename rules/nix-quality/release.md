---
title: Release, Versioning and Publishing
summary: The NIX-REL family, owning a flake's version string, its release tags and the lock at release, deprecation of published outputs, README install instructions, the non-flake bridge, the compatibility promise, the nix-update contract and the nixpkgs copy
---

# Release, Versioning and Publishing

Measured 2026-09-27 on CppNix 2.35.2, nixpkgs 26.11pre `8d5d2709`; floor `nix_2_31` = 2.31.5; Lix 2.95.2; nixfmt 1.5.0, deadnix 1.3.2, flake-checker 0.2.15.

Owns what a consumer sees of a release: the `version` a package evaluates to, the tag a consumer pins, the lock at the tag, FlakeHub, the README install block, `default.nix` and `shell.nix` for non-flake users, renaming or removing an output, the scope of `abort-on-warn`, the compatibility promise, public caches, and what `nix-update` needs from a `package.nix`.
Fetchers, hashes, `tag` versus `rev` and the version entry point are `NIX-PKG`. Lock cadence and `follows` are `NIX-INP`. Output layout, eval-time reads and `mainProgram` are `NIX-FLK`. A generated flake's README, smoke build and deprecations are `NIX-GEN`. `nixConfig` and `--accept-flake-config` are `NIX-SEC`. The computed consumer floor is `NIX-GATE`.

Contents: [Dates and Floors](#dates-and-floors) · [The Version String](#the-version-string) · [Metadata Reads, the Non-Flake Bridge and FlakeHub](#metadata-reads-the-non-flake-bridge-and-flakehub) · [Tags and the Lock at Release](#tags-and-the-lock-at-release) ·
[Install Instructions and the Release Smoke](#install-instructions-and-the-release-smoke) · [Deprecating an Output](#deprecating-an-output) · [The nix-update Contract](#the-nix-update-contract) · [Promise, Cache and the nixpkgs Copy](#promise-cache-and-the-nixpkgs-copy) · [What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Floors

- **CppNix 2.35.2** is the gated implementation. **2.31.5** is today's computed consumer floor (`nixVersions.nix_2_31`, NIX-GATE-16), never hardcoded (re-check when nixpkgs turns `nix_2_31` into a throwing stub).
- **Lix 2.95.2** rejects `nix profile add` and accepts `nix profile install` without a warning. CppNix accepts `add` from 2.30 and warns on `install` (re-check at each Lix release).
- **Determinate Nix is untested.** nixpkgs `8d5d2709` packages no Determinate Nix, so no row here was run on it (re-check if nixpkgs gains an attribute).
- **nix-update 1.16.0.** Its `replace_hash` substitutes the evaluated old hash as text. Only the `src` hash path was run. The `cargoHash` path is read from the code, not run.
- **`builtins.warn`** needs Nix 2.23 or later. Flakes and the new CLI are experimental under RFC 136, so no row promises a stable lock schema or flag set.
- **Pinned defaults.** Each is a project decision an adopter overrides once, marked **pinned** in its row: no FlakeHub (NIX-REL-06), releases on the existing `vX.Y.Z` tags (NIX-REL-07), no git revision inside a package (NIX-REL-03), the compatibility wording (NIX-REL-12), `package.nix` nixpkgs-ready but not submitted (NIX-REL-14), no public cache (NIX-REL-15).
- **Shapes.** A app, B library, C module, D generated, E template. Each Severity cell names the shapes it binds. Every command below was re-run on planted twins on 2026-09-27 against a warm store, except where a row says the consolidation's run is cited.

## The Version String

```sh
nix eval --raw .#packages.x86_64-linux.default.version
nix eval --impure --raw --expr '(builtins.fromTOML (builtins.readFile ./Cargo.toml)).package.version'
git describe --tags --exact-match HEAD
```

On every commit the first two outputs are identical. At a tag the third equals the first with its leading `v`. Substitute your attribute, and your manifest path: a Cargo workspace reads `.workspace.package.version`, a Python project `./pyproject.toml` and `.project.version`. `git describe` exits 128 off a tag, which is not a finding.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-REL-01 | Read `version` from the project's own manifest through a source-tree path, `(lib.importTOML ./Cargo.toml).package.version` (workspace: `.workspace.package.version`) or `(lib.importTOML ./pyproject.toml).project.version`. Never duplicate it as a literal, and never read it through `"${src}/…"` (NIX-FLK-07). Keep `package.nix` beside the manifest so the read needs no `../` (NIX-PKG-06). | A literal drifts from the manifest at the next bump, and 16 of 37 exemplar flakes carry one (nixpkgs excluded). A `${src}` read forces a realisation during evaluation. | The first two commands above, whose outputs must be identical. Watched red: the literal twin printed `1.2.2` against the manifest's `1.2.3`, and the suffix twin `1.2.3pre20260927_43704f6`. For the `${src}` form: `nix flake check --no-build --option allow-import-from-derivation false .`, where exit 0 passes and exit 1 is the finding: `cannot build … during evaluation` when `src` is a fetcher derivation, `path '/nix/store/…-source' is not valid` when `src` is a fileset or `self` (NIX-FLK-07). | MUST (A) | CppNix 2.35.2 |
| NIX-REL-02 | Emit the manifest version verbatim. Never append `pre<date>_<rev>`, `+<rev>`, `-dirty` or `-unstable-…`, not even "only for untagged builds". The nixpkgs `-unstable-YYYY-MM-DD` form belongs to nixpkgs packages of untagged upstream commits, never to a project's own flake. | `self` has no tag or ref attribute at a tag ref (its keys are `lastModified`, `lastModifiedDate`, `narHash`, `outPath`, `rev`, `revCount`, `shortRev`, `sourceInfo`, `submodules`), so a conditional suffix cannot be written. Any suffix makes the version at tag `v1.2.3` differ from `1.2.3`, as yazi's `26.9.1pre20260901_8dd895c` does at `v26.9.1`. | At a tag: the first and third commands above, where the third must equal the first prefixed with `v`. Watched red: the suffix twin at `v1.2.3` printed `1.2.3pre20260927_43704f6`. Watched green: `1.2.3` against `v1.2.3`. NIX-REL-01's pair covers every other commit. | MUST (A) | CppNix 2.35.2 (`self` key set) |
| NIX-REL-03 | **pinned** Do not read `self.rev`, `dirtyRev`, `shortRev`, `dirtyShortRev`, `lastModified` or `revCount` in a derivation the flake exports. A build that must embed the revision passes it as a separate env var or flag, never in `version`, and accepts a new `drvPath` on every commit. Pinned default: no git revision in a released binary's version output. | Any read changes the `drvPath` on commits that touch no source, a README edit included, which loses cache hits and the skipped-substitutable economy of `nix flake check` (Nix 2.32 and later). Moving the revision into an env var does not stop the churn. | Evaluate `nix eval --raw .#packages.x86_64-linux.default.drvPath` before and after committing a README-only change. The two outputs must be identical. Watched red: the suffix twin moved from `…-reltool-1.2.3pre20260927_43704f6.drv` to `…_573e58d.drv`. Locator: `grep -rn -e 'self[.]rev[^[:alpha:]]' -e 'self[.]rev$' -e 'self[.]dirtyRev' -e 'self[.]shortRev' -e 'self[.]dirtyShortRev' -e 'self[.]lastModified' -e 'self[.]revCount' --include='*.nix' .`, where empty output passes and a hit inside an exported derivation is the finding (a hit in an app or banner is NIX-REL-04's). The bracketed dot and `[^[:alpha:]]` skip a fixed point's `self.reverseList` (nixpkgs `lib`), and `self.dirtyRev` alone was missed before (watched 2026-09-27). | SHOULD (A) | CppNix 2.35.2 |

```nix
{
  # wrong: at tag v1.2.3 this evaluates to 1.2.3pre20260927_43704f6
  version =
    manifest.package.version + "pre${builtins.substring 0 8 self.lastModifiedDate}_${self.shortRev}";
}
```

```nix
{
  # right: the manifest, verbatim, on every commit and at every tag
  version = (lib.importTOML ./Cargo.toml).package.version;
}
```

## Metadata Reads, the Non-Flake Bridge and FlakeHub

```sh
grep -rn -F -e 'shortRev or "dirty"' -e 'rev or "dirty"' --include='*.nix' .
grep -rn -e 'edolstra/flake-compat' -e 'nix-community/flake-compat' --include='*.nix' .
grep -rn -e 'flakehub[.]com/f/' -e 'flakehub-[p]ush' -e 'flakehub-cache-[a]ction' --include='*.nix' --include='*.yml' --include='*.yaml' .
```

Each grep is a violation locator: empty output (exit 1) is the pass, and any hit is the finding. The bracketed character keeps each grep from matching its own line once it runs inside a workflow step. Never wire it as `! grep …`, which never fails a `bash -e` step.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-REL-04 | Where `self` metadata is read at all (apps, devShell banners, non-package outputs), write `self.shortRev or self.dirtyShortRev or "unknown"`, never `self.shortRev or "dirty"`. Never expect `rev`, `shortRev` or `revCount` under `path:`, or `revCount` under `github:`. A local test that needs git identity uses `git+file:`. | On a dirty tree `rev`, `shortRev` and `revCount` are absent, not suffixed, so `or "dirty"` discards the hash. `path:` carries no git identity even when clean, and an archive-tarball URL carries no `rev` although its URL contains the SHA. | The first grep. Watched red on the `or "dirty"` twin (exit 0 with the hit), green on the `dirtyShortRev` twin (exit 1). | SHOULD (every shape that reads `self` metadata) | CppNix 2.35.2 (`dirtyShortRev` is undocumented, measured) |
| NIX-REL-05 | Ship `default.nix` and `shell.nix` for non-flake users through `inputs.flake-compat = { url = "github:NixOS/flake-compat"; flake = false; };`. Never cite `edolstra/flake-compat` (a redirect) or `nix-community/flake-compat` (self-declared unmaintained, checked 2026-09-27). | Of 12 exemplars using flake-compat (nixpkgs excluded), 10 cite a dated location. The sources build identically, so the choice is provenance, and only the NixOS repository is maintained. | The second grep, watched red and green. Function check (consolidation's run): `nix-build . --no-out-link` and `nix-shell . --run true` both exit 0. On a host with no channel, ignore the stderr line `file 'nixpkgs' was not found in the Nix search path`, which `nix-shell` prints on every implementation. The exit code decides. | SHOULD (A, D) | CppNix 2.31.5 and 2.35.2, Lix 2.95.2 (same store path) |
| NIX-REL-06 | **pinned** Take no `https://flakehub.com/f/…` input and run no `flakehub-push` or `flakehub-cache-action` step. Pinned default: no FlakeHub, as input or target. An adopter who publishes to FlakeHub publishes tagged releases only, never rolling releases once any tag 0.2.0 or later exists. | FlakeHub resolves the highest semver, so a rolling `0.1.<n>` published after a real tag is invisible to every unpinned consumer. A FlakeHub input ties the consumer's lock to one vendor's resolver. | The third grep. Watched red on a FlakeHub input (exit 0), green on the twin (exit 1). The tagged-only half is a reading heuristic over the publish workflow: `rolling: true` beside `tag:` is the finding. | MUST (all shapes, pinned). SHOULD for FlakeHub publishers | FlakeHub docs as of 2026-09-27 |

## Tags and the Lock at Release

```sh
set -o pipefail
nix flake metadata --no-write-lock-file --json github:sxyazi/yazi/v26.9.1 | jq -e '.original.ref == "v26.9.1" and (.locked.rev | length) == 40'
git diff --quiet v1.0.0~1 v1.0.0 -- flake.lock
```

Substitute your repository and tag. The pipeline (the tag-pin check) prints `true` and exits 0 to pass, and a missing tag exits 4. The `git diff` (the lock-order check) exits 0 to pass and 1 when the tag commit touched `flake.lock`.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-REL-07 | **pinned** Release a flake-bearing project by its existing tag scheme and invent no flake-only version or tag. Pinned default: `vX.Y.Z`, pinned by consumers as `github:owner/repo/vX.Y.Z`. A D flake cuts no tags: its lock revision is its version. | The corpus has no convention (10 of 37 repositories never tagged, nixpkgs excluded, and `vX.Y.Z`, bare semver, dates and bot timestamps coexist), so a second scheme only doubles the release surface. | The tag-pin check above. Watched red: `v99.99.99` exit 4. Watched green: `v26.9.1` printed `true`, exit 0. `.locked.ref` is `null` for `github:`, so the check reads `.original.ref`. | MUST (A, B, C) | CppNix 2.35.2 |
| NIX-REL-08 | Refresh `flake.lock` in its own commit (NIX-INP owns the cadence), run the full gate on it, then tag a later commit. The tag commit never modifies `flake.lock`. | A bundled commit mixes "did the dependency bump pass" with "is this the release", and the tag can point at a lock CI never saw. | The lock-order check above. Consolidation's run: the separate-commit twin exit 0, the lock-in-tag twin exit 1. | SHOULD (A, B, C) | git only |

## Install Instructions and the Release Smoke

The A README block, in this order (substitute your owner and repository):

```sh
nix run github:example-org/reltool -- --help
nix profile add github:example-org/reltool
# Lix, or Nix < 2.30: nix profile install github:example-org/reltool
```

```nix
{
  inputs.reltool.url = "github:example-org/reltool";
  # optional: builds against your nixpkgs, which this flake did not test
  inputs.reltool.inputs.nixpkgs.follows = "nixpkgs";
}
```

```sh
grep -rn -e 'nix-env -i' -e 'nix-env --install' --include='README*' .
grep -rn -e '^ *nix profile install' --include='README*' .
nix run --no-write-lock-file github:example-org/reltool -- --version 2>/dev/null | grep -E -e '[[:space:]v]1[.]2[.]3$' -e '^1[.]2[.]3$'
```

Both greps pass on empty output (exit 1). The last line (the release smoke) passes with exit 0 when the version is the last token of the line, alone, after a space or after a `v`. Substitute your tag and version with each dot bracketed, and for a CLI that prints text after the version, anchor on its own format, and the version entry point NIX-PKG-19 names (`-- --version` by default, `-- version` for a CLI such as ocx whose version is a subcommand).

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-REL-09 | An A README's install section gives the three lines above in order: `nix run … -- --help`, `nix profile add …` with the `nix profile install` fallback as a comment, and the input snippet with the optional `follows` line worded as shown (NIX-INP owns `follows`). Never `nix-env -i`. The `--accept-flake-config` ban is NIX-SEC-02's. A B flake gives only the input snippet, an E flake `nix flake init -t github:owner/repo#name`, and a D README follows NIX-GEN-13. | Lix 2.95.2 rejects `add` (`error: 'add' is not a recognised command`), while CppNix 2.35.2 accepts `install` as a deprecated alias, so a README needs both to serve every implementation. A blanket "show `nix run`" rule misfires on B and E flakes. | The two greps above. Watched red: a README with an uncommented `nix profile install` line and `nix-env -iA`, both exit 0. Watched green: the block above, both exit 1. Then run each README line verbatim from a clean store (NIX-REL-16). | SHOULD (A, with the B, D and E forms as stated) | `add`: CppNix 2.30 or later (2.31.5, 2.35.2 measured). Lix 2.95.2 needs `install` |
| NIX-REL-16 | Before announcing a release, run the README's own command against the pushed tag from a clean store, with the version entry point NIX-PKG-19 names. Its output must contain the version, the tag without any leading `v`. Never substitute a `path:` or local-clone run. | It is the only check that proves together that the tag resolves, the package builds, `mainProgram` is right (NIX-FLK-15) and the version equals the tag (NIX-REL-02). `nix flake check` runs no binary. | The release smoke above. Watched green: `nixpkgs-review 4.0.0`, exit 0. Watched red: a tagged twin carrying a literal `1.2.2` printed `reltool 1.2.2`, exit 1, and the real tag grepped for `4.0.1` exit 1. `grep -F -w` is not used because it accepts `4.4.2-1ccb0bf` and `4.4.2+dirty` (watched 2026-09-27). The anchored form matches `nixpkgs-review 4.0.0`, `reltool v1.2.3` and a bare `1.2.3`, and rejects both (watched 2026-09-27; the earlier `' 1[.]2[.]3$'` missed the last two). | MUST (A). D proves a release with NIX-GEN-15 | CppNix 2.35.2. 2.31.5 and Lix 2.95.2 from the consolidation's runs |

## Deprecating an Output

```sh
nix flake show --no-eval-cache . 2>&1 | grep -c -e 'evaluation warning:'
nix build --no-link .#old-name 2>&1 | grep -c -e 'evaluation warning:'
nix flake check --no-build . 2>&1 | grep -c -e 'evaluation warning:'
nix eval --option abort-on-warn true --raw .#packages.x86_64-linux.new-name.drvPath
grep -rn -e 'flake [c]heck.*abort-on-warn' -e 'abort-on-warn.*flake [c]heck' -e 'nix [b]uild[^#]*abort-on-warn[^#]*$' --include='*.yml' --include='*.yaml' .
```

The three counts (the firing matrix) must match the mechanism chosen. Substitute your old and current attribute names. The scoped eval passes with exit 0 while a shim exists. The workflow grep passes on empty output (exit 1). A hit (exit 0) is a `flake check` or an attribute-less `nix build` carrying the flag, and is the finding.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-REL-10 | Rename or remove a published output over two releases: the old name behind a warning first, deletion second. Pick the mechanism by what is deprecated. (a) A package that warns on any reference, `nix flake show` included: `lib.warn`. (b) A package that warns only when built: `lib.derivations.warnOnInstantiate`. (c) A whole tree: `lib.warn` mapped over each attribute. (d) A legacy singular output: the `builtins.warn` shim (NIX-FLK-04). (e) An option inside an exported module: `lib.mkRenamedOptionModule` or `mkRemovedOptionModule`, never `lib.warn`. D flakes follow NIX-GEN-18. | An outright deletion breaks every consumer's lock bump with `does not provide attribute`. The mechanisms are not interchangeable: `warnOnInstantiate` is silent on `nix flake show`, and `lib.warn` around a module does not forward the old option. | The firing matrix above: `lib.warn` counts 1, 1, 1 and `warnOnInstantiate` 0, 1, 1. Without `--no-eval-cache`, `show` on a clean tree answers from the eval cache and counts 0 for `lib.warn` too (re-run 2026-09-27). For (e): `nix eval --impure --file` on a config that sets the old option exits 0 and returns the new value, and the `lib.warn` wrapper fails with ``The option `old' does not exist`` (consolidation's run). | SHOULD (every shape that exports outputs. (e) binds C) | `builtins.warn` 2.23 or later. CppNix 2.35.2 |
| NIX-REL-11 | Never pass `--option abort-on-warn true` to `nix flake check` or to a whole-flake `nix build`. Where warnings must be fatal (NIX-GEN-14's license check, a consumer-noise check), apply it to named current attributes, or to a `packages.<system>` set that carries no deprecation shims. | `abort-on-warn` is a stack-trace debugging switch that also fires on `builtins.trace`. On a whole-flake check it turns every deliberate NIX-REL-10 shim into a red gate. `nix flake show` answers from the eval cache on a clean tree and exits 0 with the flag set, so it cannot verify the flag. | The scoped eval above. Watched: with a shim present, `new-name` and `default` exit 0 and `old-name` exits 1. `nix flake check --no-build --option abort-on-warn true .` exits 1 on the shim twin and 0 on the shim-free twin. The set form `nix eval --option abort-on-warn true --json .#packages.x86_64-linux --apply 'builtins.mapAttrs (n: p: p.drvPath)'` exits 1 with a shim in the set and 0 without. The workflow grep: red on a `flake check` step and on a bare `nix build .` step carrying the flag (exit 0), green on scoped `nix eval` and `nix build .#packages.x86_64-linux.default` steps (exit 1). | MUST (all shapes) | CppNix 2.35.2 |

```nix
{
  # release N: the old name still evaluates, and warns on every reference
  old-name = lib.warn "old-name is renamed to new-name; it is removed in the next release" new-name;
}
```

## The nix-update Contract

```sh
nix eval --json .#packages.x86_64-linux.default --apply 'p: let s = p.src.rev or p.src.url; in assert builtins.replaceStrings [ p.version ] [ "" ] s != s; true'
grep -rn -E -e 'rev = "v?[0-9]+\.[0-9]' -e 'tag = "v?[0-9]+\.[0-9]' --include='*.nix' .
grep -rn -e '^[^#]*lib\.fakeHash' -e '^[^#]*lib\.fakeSha256' -e '^[^#]*lib\.fakeSha512' --include='*.nix' .
```

The eval (the URL check) prints `true` and exits 0 to pass, and `assertion … failed` with exit 1 means the fetched URL does not contain the version. Substitute the attribute that exposes the package. Both greps pass on empty output (exit 1).

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-REL-13 | In any `package.nix` whose `src` is a forge fetcher (a nixpkgs copy, a hand-written package), write the ref as an interpolation of `finalAttrs.version`: `tag = "v${finalAttrs.version}";` inside `mkDerivation (finalAttrs: { … })`. `rev = "v${…}"` behaves the same, and NIX-PKG-02 owns the choice between them. Never write a literal, version-shaped `rev` or `tag` for the source the package's `version` names. Never accept "the hash changed too" as proof that a bump is correct. | With a literal ref, `nix-update -F --version=X` rewrites `version` and the hash, prints nothing and exits 0. The hash belongs to the old release because the fetch never moved, so the package claims X, builds the previous release, and `nix build` succeeds. The reviewer's diff looks like a normal bump. | The URL check after any version change, authoritative. Watched red: `tag = "v0.2.14"`, `rev = "v0.2.14"` and `tag = "0.2.14"` under version `0.2.15` failed the assertion (exit 1). Watched green: both interpolated forms exited 0. A 40-hex `rev` also fails the assertion and is reviewed against NIX-PKG-02. Pre-screen: the first grep, red on all three literals, green on the interpolated forms and on a 40-hex `rev`. A hit that pins a different source (a flake-compat `default.nix`) is allowed. The check reads `src.rev` first because a git-backed `fetchFromGitHub` (`fetchSubmodules = true`) has a version-free `src.url`. Watched 2026-09-27: agentty printed `true` (was `false` on `src.url`), and literal `tag = "v0.2.14"` twins printed `false` on both backends. Re-watched 2026-09-27 on 17 nixpkgs `8d5d2709` packages across `fetchFromGitHub` (both backends), GitLab, Sourcehut, Codeberg, Gitea, `fetchgit`, `fetchPypi`, `fetchCrate` and `fetchurl`: all `true` except abook, whose `rev = "ver_${lib.replaceStrings [ "." ] [ "_" ] finalAttrs.version}"` moves with the version but fails the assertion, so a transformed ref is read, not a finding. `attribute 'url' missing` (exit 1) means `src` is no fetcher derivation (nh's local source, a `runCommand` around `fetchzip` in llm-agents): the row does not apply, or check the inner fetch. | MUST (every forge-fetcher `package.nix`) | nix-update 1.16.0, nixpkgs `8d5d2709` `fetchFromGitHub` |
| NIX-REL-17 | Before running `nix-update`, leave the package's current hash as literal SRI text (`hash = "sha256-…";`), never the `lib.fakeHash`, `lib.fakeSha256` or `lib.fakeSha512` symbol. After every run, grep for a leftover fake-hash symbol, and obtain a leftover hash by hand per NIX-PKG-03. NIX-PKG-04's reset to `lib.fakeHash` governs hand edits, not a `nix-update` run. | `replace_hash` substitutes the evaluated old hash as text, and the symbol's source text never matches it, so the file keeps `lib.fakeHash` and the command exits 0 with no diagnostic. | The second grep, after the run. Consolidation's run: the symbol twin kept `hash = lib.fakeHash;` after the bump (exit 0), the literal twin received a real hash (exit 1). The grep re-run 2026-09-27: red on a planted `lib.fakeHash` (exit 0), green on literal SRI text (exit 1). The `^[^#]*` prefix skips a comment naming the symbol, such as the release template's `# … never lib.fakeHash` (watched 2026-09-27: red on four assignment forms, green on that comment). | SHOULD (every forge-fetcher `package.nix`) | nix-update 1.16.0 (`src` hash run, `cargoHash` read only) |

```nix
{
  # wrong: nix-update -F rewrites version and hash, and the fetch stays on v0.2.14
  src = fetchFromGitHub {
    tag = "v0.2.14";
    hash = "sha256-...";
  };
}
```

```nix
{
  # right: the fetched ref moves with finalAttrs.version, and the hash is literal SRI text
  src = fetchFromGitHub {
    tag = "v${finalAttrs.version}";
    hash = "sha256-...";
  };
}
```

## Promise, Cache and the nixpkgs Copy

No command carries the promise or the upstream shape. NIX-REL-15 has one locator.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-REL-12 | **pinned** State compatibility as: "gated on CppNix (the version CI pins). Minimum = NIX-GATE-16's computed floor (today `nixVersions.nix_2_31` = 2.31.5). Lix advisory. Determinate Nix untested. Flakes are experimental (RFC 136)." Never say "works with Nix" unqualified, never hardcode the floor, never promise a stable lock schema or CLI flag. Pinned default: Determinate Nix is untested and never deliberately broken. | RFC 136 allows breaking changes to flakes and the new CLI until they stabilise. A hardcoded floor goes stale when nixpkgs turns `nix_2_*` into a throwing stub (`nix_2_24` already has). | Reading heuristic over the README and CI: the floor number comes from NIX-GATE-16's expression, and any unqualified "works with" is the finding. | SHOULD (A, D) | RFC 136, undated |
| NIX-REL-14 | **pinned** Keep each CLI nixpkgs-ready without submitting. The in-repo `package.nix` passes NIX-PKG-06. The nixpkgs copy changes exactly `version` (a literal), `src` (`fetchFromGitHub` with `tag` per NIX-REL-13) and the dependency hash, adds `passthru.updateScript = nix-update-script { }` or a `# nixpkgs-update: no auto update` comment, and lands as `reltool: init at X.Y.Z`, then `reltool: A -> B`. Pinned default: submit after the first stable release. | Only `pkgs/by-name` PRs auto-merge. r-ryantm silently skips a package with no version signal or no readable `meta`. The commit prefix scopes nixpkgs CI's builds. | Reading heuristic: diff the copy against the in-repo file, and any change beyond the three attributes and `updateScript` is the finding. `nixpkgs-vet` enforces the structure only inside nixpkgs CI. | CONSIDER (A) | nixpkgs master `7e35f59c1f82` |
| NIX-REL-15 | **pinned** Stand up no public substituter. A project that has one documents the `nix.conf` pair (`extra-substituters`, `extra-trusted-public-keys`) in its README as an explicit opt-in. `nixConfig` repeats at most that pair (NIX-SEC-01) and is never described as automatic. Pinned default: no public cache. | Flake-declared substituters are ignored for an untrusted user, with `warning: ignoring untrusted flake configuration setting` on every run. A cache is a code-execution trust boundary. | Locator: `grep -rn -e 'extra-substituters' --include='flake.nix' .`, where empty output passes. Each hit needs the same URL in `nix.conf` form in the README, and a hit without it is the finding. Watched red on a `nixConfig` substituter (exit 0), green without one (exit 1). | SHOULD (A, D) | CppNix 2.35.2 |

## Applied Evidence (held-out round 2026-09-27)

- add to Applied: nix-community/nh@b6869cdf9860 violates NIX-REL-02 at package.nix:20 (version 4.4.2-b6869cd against manifest 4.4.2, and 4.4.2-1ccb0bf at tag v4.4.2, C18)
- add to Applied: nix-community/nh@b6869cdf9860 violates NIX-REL-03 at flake.nix:24 (self.shortRev passed into package.nix, C18)
- add to Applied: nix-community/nix-direnv@b0557d237b01 violates NIX-REL-09 at README.md:131 (uncommented nix profile install, C10)
- add to Applied: numtide/devshell@a67c0f87b63b violates NIX-REL-05 at templates/toml/flake.nix:8 (github:edolstra/flake-compat, C6)
- add to Applied: NixOS/nixos-hardware@30d48a0ec603 violates NIX-REL-13 at spacemit/k3-pico-itx/linux.nix:20 (literal tag = "v7.2" for the source its version names, C23)

## What Agents Get Wrong Here

Ranked by how often each would bite on a real flake.

1. **Copying yazi's version formula**, or "adding the git SHA for traceability" to `version` (NIX-REL-02, NIX-REL-03).
2. **Writing the version as a literal "to keep it simple"** (NIX-REL-01).
3. **Treating a tag as knowable inside the flake**, as in `if self ? ref`. No such attribute exists (NIX-REL-02).
4. **`nix profile add` alone, or `nix profile install` alone, in a README.** Neither works on every implementation (NIX-REL-09).
5. **Wrapping a deprecation in `lib.warn`, then adding `abort-on-warn` to `nix flake check` "to make deprecations visible"**, and "verifying" with a warm `nix flake show` that exits 0 (NIX-REL-11).
6. **Deleting an output outright on rename**, with no release behind a warning (NIX-REL-10).
7. **Trusting the diff after `nix-update -F`.** With a literal ref both `version` and the hash change, and the hash is the old release's (NIX-REL-13).
8. **Writing `hash = lib.fakeHash;` and expecting `nix-update` to fill it in.** It never does, and exits 0 (NIX-REL-17).
9. **`self.shortRev or "dirty"`**, from older templates (NIX-REL-04).
10. **Citing `edolstra/flake-compat`**, because older posts use it and the redirect hides the mistake (NIX-REL-05).
11. **Reading `error (ignored): … cannot rename: Permission denied` from `nix-update` in a nested sandbox as fatal.** Nix already ignored it, and the `got:` line follows. Look for `hash mismatch … got:` before declaring a run blocked (NIX-REL-17).
12. **Claiming Determinate Nix support from a nixpkgs attribute.** None exists (NIX-REL-12).
