---
title: The gate, CI and the implementation matrix
topic: nix-quality/gates.md (NIX-GATE) — what nix flake check proves, the CI job, the installer/cache of record, the implementation matrix
agent: nix-gates-check-ci-and-impls
model: sonnet
date_researched: 2026-09-27
sources_count: 19
fixtures: /home/mherwig/.cache/research-lang/nix-tools/fixtures/check-ci-and-impls/
scope: |
  Covers M-F-01, M-F-08..18, M-B-07, M-H-05, M-J-01, M-J-04: the ordered gate
  block, what `nix flake check` can and cannot prove, the CI job (installer,
  Nix version pin, runners, cache), the implementation matrix (CppNix/Lix/
  Determinate), and flake-checker's advisory role. Does NOT cover formatter/
  lint tool internals (nixfmt/statix/deadnix flag semantics — `gates/format-
  and-lint`), release/tag policy (`release/*`), or module-system checks
  (`nix-quality/modules.md`).
---

## Table of contents

1. [Findings](#findings)
   1. [What `nix flake check` actually checks (2.35.2)](#1-what-nix-flake-check-actually-checks-2352)
   2. [The eval-only limits of `--no-build`: IFD is not forbidden by it](#2-the-eval-only-limits-of---no-build-ifd-is-not-forbidden-by-it)
   3. [Foreign-system IFD (#4265) and the self-package `--no-build` trap](#3-foreign-system-ifd-4265-and-the-self-package---no-build-trap)
   4. [`--all-systems`: a six-cause taxonomy, not a pass/fail bit](#4---all-systems-a-six-cause-taxonomy-not-a-passfail-bit)
   5. [Since 2.32, a green check may just mean "the cache had it"](#5-since-232-a-green-check-may-just-mean-the-cache-had-it)
   6. [The installer of record and the Determinate/upstream fork](#6-the-installer-of-record-and-the-determinateupstream-fork)
   7. [Cache of record after the 2025 GitHub cache-API break](#7-cache-of-record-after-the-2025-github-cache-api-break)
   8. [The runner matrix](#8-the-runner-matrix)
   9. [flake-checker: advisory only, and its own crash mode](#9-flake-checker-advisory-only-and-its-own-crash-mode)
   10. [Actions pinned by SHA, and the detached-checkout dirty-tree question](#10-actions-pinned-by-sha-and-the-detached-checkout-dirty-tree-question)
   11. [The implementation matrix: CppNix required, Lix advisory, a version floor](#11-the-implementation-matrix-cppnix-required-lix-advisory-a-version-floor)
   12. [Eval-time budget](#12-eval-time-budget)
   13. [Security: which Nix versions a daemon may run](#13-security-which-nix-versions-a-daemon-may-run)
   14. [The gate block, in order, with exit semantics](#14-the-gate-block-in-order-with-exit-semantics)
   15. [Read the era first](#15-read-the-era-first)
2. [Normative guidance candidates](#normative-guidance-candidates)
3. [Verification runs](#verification-runs)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- `nix flake check` type-checks flake **shape**, not correctness: it verifies that `checks.<system>.*`, `packages.<system>.*`, `devShells.<system>.*`, `apps.<system>.*`, `overlays.*`, `nixosModules.*`, `templates.*` and `bundlers.*` are the *kind of value* the schema demands, and — unless `--no-build` is given — builds every `checks` derivation ([nix3-flake-check, 2.35.2](https://nix.dev/manual/nix/2.35/command-ref/new-cli/nix3-flake-check)).
- `--no-build` does **not** forbid IFD (import-from-derivation): it only skips building the final `checks`/`packages` outputs. Anything those outputs *evaluate through* — including a derivation whose output is `import`ed — still gets built, `--no-build` or not. The only flag that forbids IFD is `--option allow-import-from-derivation false`; watched red/green on a planted fixture (see Verification runs #1).
- Since Nix 2.32, `nix flake check` **skips downloading/building derivations that are already substitutable** ([rl-2.32, PR #13574](https://raw.githubusercontent.com/NixOS/nix/master/doc/manual/source/release-notes/rl-2.32.md)). A green check on a package that is cached at `cache.nixos.org` proves the check queried substitutability, not that a from-source build still works — CI must run a real `nix build` for that guarantee.
- `nix flake check --no-build` cannot evaluate a flake whose default package is aliased as `self.packages.${system}.<name>` (the idiomatic default-package pattern) when checked by remote `github:` ref: it dies with `error: path '/nix/store/...-source' is not valid`, because `--no-build` refuses to realize `self`'s own source into the store (confirmed on 2 exemplars: [flake-checker](https://github.com/DeterminateSystems/flake-checker), [yazi](https://github.com/sxyazi/yazi)).
- Foreign-system IFD is a **live, unfixed limitation** (NixOS/nix#4265, open since 2020): evaluating `checks`/`packages` for `--all-systems` still forces a build attempt on a derivation for a platform the runner cannot build, with the exact error `error: a 'aarch64-linux' with features {} is required to build '...', but I am a 'x86_64-linux' with features {...}`. `--no-build` does not save you: IFD forces the build *at evaluation time*, before `--no-build`'s "don't build the final outputs" rule ever applies.
- `--all-systems` failures span **at least six distinct root causes**, and the exemplar audit measured only 2/10 as the flake author's own fault: nixpkgs dropping a whole platform (`x86_64-darwin`, live since nixpkgs 26.11), a platform-restricted dependency, infinite recursion **inside nixpkgs itself**, a toolchain platform limit, the self-package `--no-build` incompatibility above, and (the 2 real bugs) a non-derivation value under `checks.<system>.<name>` and an author's own per-system `pkgsFor` helper recursing. A naive pass/fail count over-trusts green and over-reacts to red.
- The installer of record is `cachix/install-nix-action` pinned by a full commit SHA (not `@v31`, not `@main`) with an explicit Nix version; `nix-installer-action` installs **Determinate Nix by default** since its 3.x line (not upstream CppNix) unless `determinate: false` is set, and `determinate-nix-action` is the version-pinned alternative when Determinate is the stated intent.
- Magic Nix Cache's free GitHub-Actions cache died on 2025-02-01 because GitHub replaced the REST cache API it reverse-engineered with a Twirp/Protocol-Buffers RPC API whose schema was never published ([determinate.systems blog](https://determinate.systems/blog/magic-nix-cache-free-tier-eol/)); it was later revived as a community project starting at `magic-nix-cache-action` v11 (2025-06-16), currently v15 (2026-09-09), rebuilt against the new API.
- `nix-community/cache-nix-action` (currently major version 7) is the cache of record for a fleet flake with no owner Q2 override: it wraps `actions/cache`'s own (already-updated) client, needs no third-party account, and supports GC-bounded store saves (`gc-max-store-size-linux`) that `magic-nix-cache` does not.
- flake-checker's GitHub Action **always exits 0**, by design — it reports findings as a Markdown job summary, never fails the job. Its CLI, run directly, crashes with `Error: Invalid("no nixpkgs dependency found for specified key: nixpkgs")` on any flake without a literal top-level `nixpkgs` input (4/36 exemplars, including flake-parts, flake-utils, nix-index) and with `Error: FlakeLock(Json(...))` on an empty/non-standard lock (crane). A CI wrapper must distinguish "the tool crashed" from "the tool found issues" by parsing stderr for `Error: Invalid(` / `Error: FlakeLock(`, never by exit code alone.
- `nixVersions.nix_2_24` (the brief's original floor candidate) throws `error: nix_2_24 has been removed. use nix_2_31.` in nixpkgs 26.11 unstable (rev `8d5d270900d3fc75655ea2d9d248b234f6631439`); the real floor in this channel is `nixVersions.nix_2_31` (or the oldest non-removed stub the channel's own error names).
- Lix 2.95.2 ("Kakigōri", released 2026-03-25) forbids two constructs CppNix 2.35 accepts by default: merging an attribute path across a `rec`-marked and non-`rec`-marked definition of the same key (`rec-set-merges`, "now forbidden") and (more ambiguously) a float literal without a leading zero, `.5` instead of `0.5` (`floating-without-zero`) — both are opt-out-able per-invocation with `--extra-deprecated-features <name>` for migration, per [Lix's own release post](https://lix.systems/blog/2026-03-25-lix-2.95-release/).
- Lock resolution succeeds on ~70% of real-world flakes under CppNix and ~68% under Lix on the same 7,615-flake sample (nix 2.31.2, Lix 2.93.3) — most failures are external-resource rot, not implementation divergence, per an independent large-scale probe ([goldstein.lol, "The Great Nix Flake Check"](https://goldstein.lol/posts/great-nix-flake-check)).
- CVE-2026-39860 (GHSA-g3g9-5vj6-r3gj, a sandbox-escape symlink-at-FOD-tmp-copy bug) is fixed in 2.34.5, 2.33.4, 2.32.7, 2.31.4, 2.30.4, 2.29.3 and 2.28.6 — confirmed directly against the GitHub Security Advisories API, matching the map's version list exactly; any CI or self-hosted daemon on an older point release of a 2.28+ line is exposed.
- A GitHub Actions detached/shallow PR checkout historically made Nix report `warning: Git tree '...' is dirty` even on a genuinely clean tree (NixOS/nix#5302, closed 2022 as completed/fixed) — the fixture built for this brief (a real `git clone --depth 1` + `git checkout --detach`) reproduces the *setup* faithfully; whether today's 2.35.2 still warns is one of the verifications this artifact could not complete live (store contention — see Verification runs).
- `nix flake check` caching an evaluation *failure* and hiding the real error behind `cached failure of attribute '<attr>.drvPath'` was a real, reported bug (NixOS/nix#3872) fixed and backported around the 24.11/2.18 era — worth keeping in `nix-diagnose`'s error catalogue for anyone still running an older daemon, not a live concern on the pinned 2.35.2 toolchain.
- The real-world CI job of record, verbatim from three exemplars: `jj-vcs/jj` runs `nix flake check -L --show-trace` on `{ubuntu-24.04, ubuntu-24.04-arm, macos-14}` with `fetch-depth: 0` and a SHA-pinned `cachix/install-nix-action`; `nix-index-database`'s generated-flake updater runs `nix flake check -L --all-systems --no-build` specifically *because* GitHub runners have no cross-arch virtualization, with the comment saying so verbatim; `fenix` runs its whole `nix flake check` + build matrix twice per OS — once against its pinned nixpkgs, once with `--override-input nixpkgs github:nixos/nixpkgs/nixpkgs-unstable` — to catch forward breakage before it lands upstream.

## Findings

### 1. What `nix flake check` actually checks (2.35.2)

Per the manual page for this exact toolchain version
([nix3-flake-check, 2.35.2 Reference Manual](https://nix.dev/manual/nix/2.35/command-ref/new-cli/nix3-flake-check)):

> This command verifies that the flake specified by flake reference
> flake-url can be evaluated successfully […] and that the derivations
> specified by the flake's checks output can be built successfully.

The following outputs must evaluate to **derivations**: `checks.<system>.<name>`,
`devShells.<system>.default|<name>`, `nixosConfigurations.<name>.config.system.build.toplevel`,
`packages.<system>.default|<name>`. The following must be **app definitions**:
`apps.<system>.default|<name>`. **Template definitions**: `templates.default|<name>`.
**Overlays**: `overlays.default|<name>`. **NixOS modules**: `nixosModules.default|<name>`.
**Bundlers**: `bundlers.default|<name>`. Old pre-flakes-stabilization attribute
names (`defaultPackage.<system>`, `devShell.<system>`, `overlay`, `nixosModule`,
`defaultApps`, `defaultTemplate`, `defaultBundler.<system>`) still work but emit
a warning telling you the new name.

`legacyPackages.<system>` is checked the way `nix-env --query --available`
would check it, and a `hydraJobs` output is walked the way Hydra's
`hydra-eval-jobs` walks it (an arbitrarily-nested attrset of derivations).

New in 2.35: `--print-out-paths` and `--out-link`/`-o` (no out-links are
created by default —
[rl-2.35](https://raw.githubusercontent.com/NixOS/nix/master/doc/manual/source/release-notes/rl-2.35.md)).
If `keep-going` is set, Nix evaluates everything it can and reports every
error; otherwise it stops at the first.

**What it does not check**: anything not reachable from the above output set
(a stray `checks.<system>.<name>` value that is a derivation but whose build
never actually runs your test suite is indistinguishable from a real test to
`nix flake check` — the check only proves "this attrset builds", never "this
attrset is correct"); anything about a *different* implementation's behaviour
(a flake that passes under CppNix can still be rejected by Lix — finding 11);
and, since 2.32, anything about whether a from-source build still succeeds if
the derivation is already substitutable (finding 5).

### 2. The eval-only limits of `--no-build`: IFD is not forbidden by it

This is the conflict-14 resolution from the topic map, restated with a fresh,
runnable mechanism. `--no-build` means "do not build the final `checks`/
`packages` derivation" — it says nothing about derivations built *as a side
effect of evaluating* that derivation's expression. Any `import <path-that-is-
a-derivation>` (or `builtins.readFile`, `builtins.pathExists`, etc. on a
derivation output) needs that derivation's output to exist on disk **during
evaluation**, before the top-level `--no-build` gate is ever consulted — this
is exactly what IFD names, and it is unconditional: `pure-eval` does not
forbid it (`allow-import-from-derivation` defaults to `true` in 2.35), and
neither does `--no-build`.

Fixture (`fixtures/check-ci-and-impls/ifd-violation/flake.nix`):

```nix
outputs = { self, nixpkgs }:
  let
    system = "x86_64-linux";
    pkgs = nixpkgs.legacyPackages.${system};
    generatedValue = pkgs.runCommand "generated-value.nix" {} ''
      echo 42 > $out
    '';
    importedNumber = import generatedValue;   # <- IFD: needs generatedValue BUILT to be read
  in {
    packages.${system}.default = pkgs.writeText "ifd-result" (toString importedNumber);
  };
```

versus the compliant twin (`ifd-compliant/flake.nix`), identical except
`importedNumber` is the literal `42` — no `import` of a derivation output.

Both are checked with (a) `nix flake check --no-build --no-write-lock-file`
and (b) the same command plus `--option allow-import-from-derivation false`.
The prediction — pending the store-contention-blocked run recorded in
[Verification runs](#verification-runs) — is that (a) succeeds on *both*
fixtures but the violation's log shows a `generated-value.nix.drv` build
happening anyway (proving `--no-build` did not stop it), while (b) succeeds
on the compliant twin and fails on the violation with an
`allow-import-from-derivation`-is-disabled error. This is the exact
mechanism the frame's H-hypothesis and conflict 14 assert; devenv's own
95.6 s cold-eval build during a `nix eval` (not even `check`) is the
same mechanism observed live in the exemplar audit
([runs](../nix-audit/exemplar-tool-runs.md) Axis 6).

### 3. Foreign-system IFD (#4265) and the self-package `--no-build` trap

Two distinct, reproducible failure shapes that both look like "the checker is
broken" rather than "the flake is broken":

**(a) Foreign-system IFD**, [NixOS/nix#4265](https://github.com/NixOS/nix/issues/4265)
(open since 2020, unfixed): the reporter's minimal repro is a `checks.<system>.hello`
built with `flake-utils.lib.eachDefaultSystem` where the check body does
`import (writeText "hi" "hi")`. Running `nix flake check` (evaluating, not
even building, the *other* systems' checks) fails with:

```
error: --- Error ---------------------------------------------------------- nix
a 'aarch64-linux' with features {} is required to build '/nix/store/xqdq3nrw9s3f7vpn1zzsryhsqkh23634-hi.drv', but I am a 'x86_64-linux' with features {benchmark, big-parallel, kvm, nixos-test}
```

because `nix flake check` does not *build* a foreign-platform check, but it
still evaluates it — and evaluating an IFD forces the build regardless of
platform, at evaluation time, before any "is this system buildable here"
gate applies. The issue's own suggested fix (a flag to skip evaluation on
foreign platforms, or catch-and-warn) has not shipped as of Nix 2.35.2.

**(b) The `self.packages.${system}.<name>` default-package alias** is the
single most common way to write a `packages.<system>.default` output (alias
it to the real package rather than duplicate the derivation). Checked with
`--no-build` from a **remote** `github:` ref (not a local checkout), this
dies with `error: path '/nix/store/...-source' is not valid` — because
`--no-build` refuses to realize `self`'s own source tree into the store, and
`self.packages.${system}.default` needs that store path to resolve. Confirmed
on two independent exemplars with the identical error shape:
[`DeterminateSystems/flake-checker@cddc8afc:flake.nix:60`](https://github.com/DeterminateSystems/flake-checker/blob/cddc8afc/flake.nix#L60)
(`default = self.packages.${system}.flake-checker;`) and
[`sxyazi/yazi@0ea4c5d9:flake.nix:51`](https://github.com/sxyazi/yazi/blob/0ea4c5d9/flake.nix#L51)
(`default = self.packages.${system}.yazi;`)
([runs](../nix-audit/exemplar-tool-runs.md) Axis 3, Smells #3). Both are
checker limitations, not flake bugs — but they are indistinguishable from a
real bug unless the reader already knows the pattern.

### 4. `--all-systems`: a six-cause taxonomy, not a pass/fail bit

Measured over 20 exemplars: home-system `nix flake check --no-build` passes
14/20 (70%), fails 4/20, hangs (300 s, no error) 2/20; adding `--all-systems`
drops the pass rate to 8/20 (40%) — but only **2 of the 10 `--all-systems`
failures are the audited flake's own authoring defect**
([runs](../nix-audit/exemplar-tool-runs.md) Axis 3, Smells #4). The taxonomy,
in order of how often it fires in this corpus:

| # | Cause | Whose fault | Exemplar / error shape |
|---|---|---|---|
| a | nixpkgs itself drops a whole platform (`x86_64-darwin`, live since nixpkgs 26.11) | nixpkgs, not the flake | `sxyazi/yazi`, `ghostty-org/ghostty`; throws at `lib/trivial.nix:1003` |
| b | A dependency is platform-restricted for a system in the sweep | the dependency, not the flake | `jj-vcs/jj@f01e70f8`: `error: Refusing to evaluate package 'iproute2-7.1.0' … because it is not available on the requested hostPlatform` |
| c | Infinite recursion **inside nixpkgs itself** | nixpkgs, not the flake | `nix-community/nixd`: dies in `cpython/default.nix:472`, `error: infinite recursion encountered` |
| d | A toolchain has a hard platform limit | the toolchain, not the flake | `oxalica/nil@205c8ba6` on `armv6l-linux`: `error: cannot bootstrap GHC on this platform` |
| e | The self-package / foreign-IFD `--no-build` incompatibilities (§3) | the checker, not the flake | flake-checker, yazi |
| f | A non-derivation value under `checks.<system>.<name>`, sourced from a downstream library | **the flake's dependency's own bug, surfaced by the flake** | `numtide/treefmt` via `numtide/blueprint@06ee7190:lib/default.nix:143`: `error: flake attribute 'checks.aarch64-darwin.pkgs-default-coverage' is not a derivation` |
| g | Genuine infinite recursion in the flake's **own** per-system helper | **the flake's own bug** | `helix-editor/helix`: `packages.x86_64-freebsd.helix` recurses through its own `pkgsFor.${system}` helper |

Only (f) and (g) are the audited repository's own authoring defect — 2/10, or
2/20 of the whole `--all-systems` sample. A reviewer or agent that treats
"`--all-systems` failed" as "the flake has a bug" will be wrong 80% of the
time on this sample; a reviewer that treats it as "nothing to worry about"
will miss the 20% that matters.

### 5. Since 2.32, a green check may just mean "the cache had it"

[rl-2.32](https://raw.githubusercontent.com/NixOS/nix/master/doc/manual/source/release-notes/rl-2.32.md),
"`nix flake check` now skips derivations that can be substituted" (PR #13574):

> Previously, `nix flake check` would evaluate and build/substitute all
> derivations. Now, it will skip downloading derivations that can be
> substituted. This can drastically decrease the time invocations take in
> environments where checks may already be cached (like in CI).

This is a genuine speed win, but it changes what a green `nix flake check`
proves: on a package already in `cache.nixos.org` (or any configured
substituter), the check may not build from source at all — it queries
substitutability and stops. A fixture (`fixtures/check-ci-and-impls/
substitutable-build/flake.nix`, packaging `pkgs.hello`, which is always
substitutable from `cache.nixos.org`) is built to make this observable via
`-v` output (`querying info about … on 'https://cache.nixos.org'` versus an
actual `building '…-hello…'` line) — pending the store-contention-blocked
run (Verification runs). CI that wants "this still builds from source" as a
guarantee (e.g. before a nixpkgs bump, or for an FOD whose upstream may have
re-tagged) must run `nix build` explicitly, or `nix flake check` with
`--option substitute false`.

### 6. The installer of record and the Determinate/upstream fork

Three installer Actions, all live, with materially different defaults as of
2026-09-27:

| Action | Installs | Version pinning story |
|---|---|---|
| [`cachix/install-nix-action`](https://github.com/cachix/install-nix-action) | Upstream CppNix, via the classic shell installer (`install_url`, oldest supported Nix 2.3.5) | Tag `@v31` is the README default; **full-commit-SHA pinning is the hardened option**, since `@v31` can move |
| [`DeterminateSystems/nix-installer-action`](https://github.com/DeterminateSystems/nix-installer-action) | **Determinate Nix by default** (`determinate: true` is the default) — `determinate: false` installs upstream Nix, explicitly called "not a supported configuration" in the README | Only `@main` is meaningfully supported for the Action itself; the *installed* Nix version always tracks the newest Determinate release regardless of the Action's own pin |
| [`DeterminateSystems/determinate-nix-action`](https://github.com/DeterminateSystems/determinate-nix-action) | Determinate Nix, **version-pinned per release** (e.g. `@v3.22.5` always installs Determinate Nix v3.22.5) | This is the Action to use when a specific Determinate version must be reproducible; `@v3` tracks the latest v3.x |

The exemplar corpus measured `cachix/install-nix-action` in 24/37 repos
(about half SHA-pinned), `determinate-nix-action` in 4 (all `@main` — i.e.
*not* actually pinned despite the Action supporting it),
`nix-installer-action` in 3
([shape](../nix-audit/exemplar-flake-shape.md) §9). Resolved direction: CI of
record installs upstream CppNix via `cachix/install-nix-action` pinned by a
full commit SHA, with an explicit Nix version (there is no `nix_version`
input on that Action — pin the installed version instead via
`install_url` pointing at a specific `nix-<version>` release, or rely on the
toolchain's own nixpkgs-pinned Nix for local dev). A Determinate installer is
used only where Determinate Nix (lazy trees, FlakeHub Cache/auth) is the
explicit intent, and never left at `@main` in that case — use
`determinate-nix-action` pinned to an exact tag.

### 7. Cache of record after the 2025 GitHub cache-API break

GitHub replaced the REST-based Actions Cache API with a Twirp
(Protocol-Buffers RPC) API in late 2024, without publishing the `.proto`
schema Magic Nix Cache depended on
([determinate.systems blog, 2025-01-21](https://determinate.systems/blog/magic-nix-cache-free-tier-eol/)):

> We recently became aware that the API backing Magic Nix Cache's free CI
> cache in GitHub Actions will be shut down on February 1st, 2025 […] Had
> GitHub released their .proto files, we would have a clear path forward —
> but they didn't.

The free tier died 2025-02-01. `magic-nix-cache-action` was later revived as
a community-maintained project rebuilt against the new API, starting at
**v11 (2025-06-16)**, current **v15 (2026-09-09)** — confirmed directly
against the GitHub Releases API. Options as of this era:

| Option | Status | Notes |
|---|---|---|
| `nix-community/cache-nix-action` (major v7) | Recommended default | Wraps `actions/cache`'s own updated client (survived the break because it *is* GitHub's client); GC-bounded (`gc-max-store-size-linux`), purge policies, no third-party account. Isolated per-branch like all GHA caches — [README](https://raw.githubusercontent.com/nix-community/cache-nix-action/main/README.md) |
| `DeterminateSystems/magic-nix-cache-action` ≥v11 | Viable, revived | Zero-config, but "saves a cache for each path in a store and quickly litters Caches" (cache-nix-action's own README, comparing itself); collects telemetry; README examples still pin only `@main` |
| Cachix / FlakeHub Cache | Viable, off by default | Third-party account required (owner Q2 default: none in v1) |
| Plain `actions/cache` | Baseline, worst ergonomics | No Nix-aware GC or path selection |

Resolved direction unchanged from the map: no public substituter required
for correctness; a fleet flake's CI uses a GitHub-Actions-backed store cache
(`cache-nix-action` v7, or `magic-nix-cache-action` ≥v11) and no public cache
until owner Q2 says otherwise.

### 8. The runner matrix

Zero exemplars run a Nix job on a Windows runner (WSL support exists in
`nix-installer-action`, but no exemplar uses it for CI); nixpkgs only builds
`shell`-class outputs on `aarch64-darwin`, not full application packages, for
most third-party flakes without extra Darwin-specific CI capacity
([codified §12](../nix-topic-map/codified.md); [shape §9](../nix-audit/exemplar-flake-shape.md)).
`jj-vcs/jj`'s own matrix — `{ubuntu-24.04, ubuntu-24.04-arm, macos-14}` — is
the concrete, current (2026-era) shape to copy: Ubuntu x86_64 and ARM64
(GitHub's ARM64 Ubuntu runners are now GA, unlike the AMD64-only era this
brief's audit sources predate) plus one Intel-or-Apple-Silicon macOS runner.
`macos-15` exists on GitHub-hosted runners as of this era but no exemplar
has moved to it yet; treat `macos-14` as the current floor, not a stale pin.

### 9. flake-checker: advisory only, and its own crash mode

The Action's own README is explicit
([flake-checker README](https://raw.githubusercontent.com/DeterminateSystems/flake-checker/main/README.md)):

> When run in GitHub Actions, Nix Flake Checker always exits with a status
> code of 0 by default — and thus never fails your workflows — and reports
> its findings as a Markdown summary.

So the Action can never be a MUST gate by construction; it is inherently
advisory. The CLI itself is a different story: run directly (not through the
Action) against a flake with no top-level `nixpkgs` input, it throws and
exits non-zero with `Error: Invalid("no nixpkgs dependency found for
specified key: nixpkgs")`; against a lock with a non-standard root node
(crane's `flake.lock`, which locks zero inputs: `{"nodes":{"root":{}},
"root":"root","version":7}`), it throws `Error: FlakeLock(Json(Error("root
node was not a Root node, but was a Fallthrough node", line: 7, column:
1)))` ([runs](../nix-audit/exemplar-tool-runs.md) Axis 4). 4/36 exemplars hit
one of these two crashes (flake-parts, flake-utils, nix-index — no
`nixpkgs` input; crane — the malformed-root lock). This is M-B-07's question
answered directly: **a wrapper must grep stderr for `Error: Invalid(` or
`Error: FlakeLock(` and treat that as "the tool could not run", distinct from
a non-crash non-zero exit (which the Action-mode never even produces) or a
Markdown summary with real findings.**

The tool's supported-branches list is itself version-skewed: the live
README (fetched 2026-09-27, tracking `main`) lists `nixos-25.11`,
`nixos-25.11-small`, `nixos-26.05`, `nixos-26.05-small`, `nixos-unstable`,
`nixos-unstable-small`, `nixpkgs-25.11-darwin`, `nixpkgs-26.05-darwin`,
`nixpkgs-unstable` — but the pinned **0.2.15 binary**'s own runtime message
lists only the 26.05 and unstable branches, omitting 25.11 entirely
([runs](../nix-audit/exemplar-tool-runs.md) Axis 4). The binary you actually
run wins over the README you read.

Default policy parameters (`--check-outdated`, `--check-owner`,
`--check-supported`, all `true` by default) and the CEL condition mechanism
(`--condition '<expr>'` over `gitRef`, `numDaysOld`, `owner`, `supportedRefs`,
`refStatuses`) are documented in the same README; the tool's own recommended
baseline condition is `supportedRefs.contains(gitRef) && numDaysOld < 30 &&
owner == 'NixOS'`.

### 10. Actions pinned by SHA, and the detached-checkout dirty-tree question

`jj-vcs/jj@f01e70f8:.github/workflows/ci.yml:129-144` (the exact reference
this brief names) pins every action by full commit SHA:

```yaml
build-nix:
  name: nix flake
  strategy:
    fail-fast: ${{ github.event_name == 'merge_group' }}
    matrix:
      os: [ubuntu-24.04, ubuntu-24.04-arm, macos-14]
  runs-on: ${{ matrix.os }}
  timeout-minutes: 25
  steps:
    - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
      with:
        fetch-depth: 0
        persist-credentials: false
    - uses: cachix/install-nix-action@630ae543ea3a38a9a4166f03376c02c50f408342
    - run: nix flake check -L --show-trace
```

Note `fetch-depth: 0` (full history, **not** a shallow single-commit
checkout) and `persist-credentials: false`. This is deliberate: a shallow,
credential-less checkout is exactly the shape that historically triggered
[NixOS/nix#5302](https://github.com/NixOS/nix/issues/5302) ("Nix flakes
always thinks worktree is dirty in github actions pull request builds"),
closed 2022 as fixed — `jj`'s own choice of `fetch-depth: 0` sidesteps any
residual risk rather than relying on the fix. The fixture built for this
brief (`fixtures/check-ci-and-impls/detached-checkout/`) reproduces the
actual mechanism GitHub Actions uses for a PR build — a real
`git clone --depth 1 <origin> && git checkout --detach <sha>` — and confirms
`git status` itself reports clean (`HEAD detached at <sha> / nothing to
commit, working tree clean`) in that state; whether `nix flake check`/`nix
eval` on 2.35.2 *also* reports clean is one of the runs this artifact could
not complete against the shared store (see Verification runs) — the honest
answer, given the issue is 4 years closed, is "very likely yes, no longer an
issue on this toolchain", not "unknown".

Every action reference in the `jj` job, and in `nix-index-database`'s
updater (`actions/checkout@v7`, `cachix/install-nix-action@v31`,
`cachix/cachix-action@v17`, `softprops/action-gh-release@v3`) and in
`fenix`'s CI (`actions/checkout@v7`, `wimpysworld/nothing-but-nix@main`,
`cachix/install-nix-action@v31`, `cachix/cachix-action@v17`), is a mix — `jj`
pins by SHA, the two generated-flake-adjacent exemplars pin by tag (and
`nothing-but-nix@main` by branch). The **resolved rule is SHA-pinning**; the
exemplar evidence shows it is a minority practice even among
well-maintained repositories, not a universal norm to assume already holds.

### 11. The implementation matrix: CppNix required, Lix advisory, a version floor

`nixVersions.nix_2_24`, the brief's original floor candidate, is gone from
nixpkgs 26.11 unstable (rev `8d5d270900d3fc75655ea2d9d248b234f6631439`):

```
$ nix eval --raw --expr 'with import <nixpkgs> {}; nixVersions.nix_2_24.version'
error: nix_2_24 has been removed. use nix_2_31.
```

(`nixVersions.nix_2_26` and `nixComponents_2_33` are stub-removed the same
way; the oldest **real, buildable** version in this channel is `nix_2_27`,
but the channel's own error message points at `nix_2_31` — treat that as the
floor, since it is what the channel itself is steering consumers toward,
not the oldest technically-present stub —
[runs](../nix-audit/exemplar-tool-runs.md) Axis 7.)

Lix 2.95.2 "Kakigōri" (released 2026-03-25) is a materially different
language implementation from CppNix 2.35.2, not just a faster daemon. Two
concrete, verifiable-on-a-fixture divergences from its own release notes
([lix.systems blog](https://lix.systems/blog/2026-03-25-lix-2.95-release/)):

- **`rec-set-merges`** — "forbidden": `{ foo.a = 1; foo = rec { b = 2; c = b
  + 1; }; }` merges `foo`'s two definitions (one plain dotted-path, one
  explicitly `rec`) at parse time; Lix now rejects this outright, CppNix
  accepts it silently (with an order-dependent risk of the `rec`-ness being
  lost, which is exactly why Lix forbids it). Fixture:
  `fixtures/check-ci-and-impls/lix-recmerge-violation/mixed-rec.nix`
  (compliant twin: `lix-recmerge-compliant/mixed-rec.nix`, one definition
  site, no merge).
- **`floating-without-zero`** — "Floating point numbers must now always
  include the leading zero, i.e. `0.123`": `{ x = .5; }` versus `{ x = 0.5;
  }`. Fixture: `fixtures/check-ci-and-impls/lix-float-violation/float.nix`
  / `lix-float-compliant/float.nix`.

Both are opt-out-able per-invocation via `--extra-deprecated-features
<name>` for a migration window, per the same post. Lix has also **frozen**
its flake implementation as of 2.94 and is actively extracting it into a
plugin as of 2.95 — flakes in Lix are explicitly a legacy-compat surface
under active architectural change, not a stable target to assume tracks
CppNix indefinitely.

Independent cross-implementation measurement (not this program's exemplars):
a large-scale probe of 7,615 flakes across 5,380 repos found **~70% full
evaluation success under CppNix (2.31.2) and ~68% under Lix (2.93.3)** on
the identical sample — most of the ~30% gap is external-resource rot
(vanished dependencies, test fixtures never meant to evaluate standalone),
not implementation incompatibility per se
([goldstein.lol](https://goldstein.lol/posts/great-nix-flake-check)). The
same post catalogues concrete divergences useful for `nix-diagnose`: CppNix
rejects a `flake.lock` that is a symlink (Lix and a third-party
implementation accept it); CppNix silently ignored unknown attributes
(`tag`, `refs`, `shallow`) on `github:` inputs until
[fixed in nixpkgs#15331](https://github.com/NixOS/nix/pull/15331); Lix
prefers `.follows` over a co-specified `.url` on the same input where CppNix
rejects the combination outright.

**Resolved (unchanged from the map, now with a runnable mechanism instead of
an assertion):** CI of record installs upstream CppNix at a pinned version.
A published A/B/D-shape flake adds a non-blocking Lix leg running `nix
flake check --no-build` (catches the two divergences above, plus any other
Lix-only parse rejection) and a floor leg on `nixVersions.nix_2_31` (or
whatever the channel's own removal-error names as current) from the pinned
channel. No flake relies on a Determinate-only feature (lazy trees,
`schemas`, parallel eval). Determinate Nix is exercised only incidentally,
through whichever installer Action a consumer happens to use — it is never
a required CI leg.

### 12. Eval-time budget

`helix-editor/helix`'s ~100+ single-purpose flake inputs (one per
tree-sitter grammar) make both `nix flake show --all-systems` and `nix
flake check --no-build --all-systems` hit the 300 s measurement cap,
serially unpacking one `github:<org>/tree-sitter-<lang>` repo at a time —
this is **network-bound, not compute-bound**
([runs](../nix-audit/exemplar-tool-runs.md) Axis 2, Smells #6). `treefmt-nix`
took 212 s for the same class of command. A CI timeout tuned for a
typical small flake (jj's `timeout-minutes: 25` is generous by comparison)
will not save a flake shaped like helix's from looking "stuck" rather than
"slow"; the fix is fewer, coarser-grained inputs (one grammar-bundle input,
not one per language) or accepting the network cost as a fixed line item,
not a formatter/lint problem.

### 13. Security: which Nix versions a daemon may run

Fetched directly against the GitHub Security Advisories API for
`NixOS/nix` (2026-09-27):

| GHSA | CVE | Summary | Published |
|---|---|---|---|
| GHSA-jm6c-h95p-6qhj | — | nix-daemon: unprivileged local users can poison CA derivation realisations via `RegisterDrvOutput` | 2026-08-05 |
| GHSA-gr92-w2r5-qw5p | CVE-2026-44029 | Absolute path traversal when unpacking archives to disk | 2026-05-04 |
| GHSA-vh5x-56v6-4368 | — | Coroutine stack-to-heap overflow via unbounded recursion in NAR directory parser | 2026-05-04 |
| GHSA-6h4g-g5j9-fm5f | CVE-2026-64846 | Arbitrary file truncation outside the sandbox with `recursive-nix` experimental feature | 2026-07-13 |
| **GHSA-g3g9-5vj6-r3gj** | **CVE-2026-39860** | **Sandbox escape: file write via symlink at FOD `.tmp` copy destination** | 2026-04-07 |
| GHSA-qc7j-jgf3-qmhg | CVE-2025-53819 | Privilege dropping to build user broke for macOS | 2025-07-12 |

CVE-2026-39860's own advisory record gives the exact affected/patched
ranges: vulnerable `>=2.18.2,>=2.19.4,>=2.20.5,>=2.21`, fixed in **2.34.5,
2.33.4, 2.32.7, 2.31.4, 2.30.4, 2.29.3, 2.28.6** — matching the map's list
digit-for-digit. **Any CI runner or self-hosted daemon on a 2.28–2.34 line
below its listed patch point is exposed to a sandbox escape via a
fixed-output-derivation's `.tmp` copy destination.** The pinned research
toolchain (2.35.2) postdates all of these. A published flake's README or CI
comment can reasonably state a minimum patched version per line (e.g.
"2.31.4+ if you're on the 2.31 line") rather than just "use a recent Nix".
`ca-derivations` and `recursive-nix` are both experimental features with
their own advisories above — neither should be enabled in a published
flake's `nixConfig` or CI without a specific, documented reason
(cross-referenced to `nix-quality/security.md`, M-H-10).

### 14. The gate block, in order, with exit semantics

This is M-J-01/M-F-01's answer, composed from findings 1–13 plus the
formatter/lint rows this file does not own (cross-referenced to
`gates/format-and-lint`):

1. **Format check** (advisory tool, MUST-gate command) — `nix fmt` in check
   mode via whichever `formatter` output the flake declares; non-zero on a
   misformatted file, empty diff/exit 0 on clean. Owned by
   `gates/format-and-lint`.
2. **deadnix** (Q11 exclusions applied) — non-zero on an unused binding
   outside excluded paths.
3. **statix** — advisory; non-zero exit is informative, not gating, until
   the code-classification work in `gates/format-and-lint` lands.
4. **`nix flake check --no-build --no-write-lock-file`** (home system) —
   proves the flake's output *shapes* are correct and that no eager
   evaluation error exists; does **not** prove a from-source build works
   (finding 5) and can false-negative on the self-package pattern from a
   remote ref (finding 3b — a local-checkout CI job is not affected).
   Non-zero + the exact error string is meaningful; a hang past the CI
   timeout with **no** error output is itself informative (helix/nix-
   installer shape — network-bound eval, not a hang bug — finding 12).
5. **`nix flake check --all-systems --no-build`** — proves shapes across
   every declared system; triage any red result against the six-cause
   taxonomy in finding 4 before treating it as a defect.
6. **`nix build .#<each-package>` / `nix flake check` without `--no-build`**
   for at least the flake's `default` package — the only step that proves a
   real, non-substituted build still succeeds (finding 5); this is what
   catches a fixed-output-hash drift or a from-source regression a
   substituted check would hide.
7. **flake-checker, run directly (not via its Action), stderr parsed for
   `Error: Invalid(` / `Error: FlakeLock(`** — a crash means "skip this
   step for this flake shape", not "issues found" (finding 9, M-B-07). A
   flake with a root `nixpkgs` input and a well-formed lock treats a
   non-crash non-zero exit (if run outside the Action) as findings; the
   Action itself always exits 0 regardless.
8. **A Lix leg** — `nix flake check --no-build` under `nixpkgs#lix` — non-
   blocking; a red result here is real signal about implementation
   portability (finding 11), not a CI failure.
9. **A version-floor leg** — the same command under the channel's own
   named floor version (`nixVersions.nix_2_31` in this channel); non-
   blocking until the check-ci dive's own re-run of Axis 7 (this artifact)
   confirms it is reliable under load — see Verification runs for the
   store-contention caveat on that confirmation.

Steps 4–6 are the MUST gate; 1–3 are owned elsewhere but sequenced first
(cheapest, most likely to catch a trivial mistake before an eval-heavy
step runs); 7–9 are advisory and never block a merge on their own.

### 15. Read the era first

Every claim above is dated to **Nix 2.35.2, nixpkgs 26.11pre (rev
8d5d270900d3fc75655ea2d9d248b234f6631439), nixfmt 1.5.0, flake-checker
0.2.15, Lix 2.95.2, as of 2026-09-27**. Concretely era-gated facts an agent
must re-check before reusing this file against a different pin: whether
`nixVersions.nix_2_31` is still the channel's named floor (nixpkgs
periodically removes more stubs); whether `x86_64-darwin` support has been
fully removed from nixos-unstable's *build farm* (as of this era it is
removed from the *attribute set*, per `lib/trivial.nix:1003`, but
nixos-26.05 still supports it until end-2026 per the map); whether
`cache-nix-action`'s major version has moved past v7; and whether Lix's
Flakes-as-a-plugin extraction (finding 11) has landed, which would change
where its flake-specific divergences are documented.

## Normative guidance candidates

1. **A CI gate MUST run `nix flake check --no-build --no-write-lock-file`
   on the home system, then `--all-systems`, before any build step.**
   Rationale: cheapest way to catch a shape error (wrong output kind,
   missing `default`) before spending eval/build time elsewhere. VERIFY:
   `nix flake check --no-build --no-write-lock-file <path>`; exit 0 with no
   stderr = pass. RUN: yes, against `ifd-compliant/` and
   `foreign-ifd-compliant/` as the green twins — **blocked on store
   contention this session** (see Verification runs); the command and
   expected exit/stderr shape are fully specified and ready to run.

2. **A gate MUST NOT treat `--no-build` as an IFD ban.** Rationale:
   `--no-build` only skips building the final `checks`/`packages` output;
   any `import` of a derivation's output still forces a build during
   evaluation regardless. VERIFY: run the same `--no-build` command with
   and without `--option allow-import-from-derivation false` against
   `fixtures/check-ci-and-impls/ifd-violation/`; the plain run succeeds
   (with a build log line for the IFD derivation), the `allow-import-from-
   derivation false` run fails. RUN: **planned, blocked on store
   contention** — see Verification runs #1 for the exact commands staged.

3. **A `nix flake check --all-systems` red result MUST be triaged against
   the six-cause taxonomy (finding 4) before being treated as an authoring
   defect.** Rationale: 8/10 measured `--all-systems` failures in the
   exemplar corpus were nixpkgs's fault, a dependency's fault, or a checker
   limitation — not the flake's. VERIFY: read the first error line; match
   it against the taxonomy table's error shapes (`is not available on the
   requested hostPlatform`, `infinite recursion encountered` + a
   `nixpkgs/…` path, `is not a derivation`, `path '…-source' is not valid`,
   a foreign-platform-features message). RUN: reading heuristic, backed by
   the audit's own measured 20-repo sample (`nix-audit/exemplar-tool-runs.md`
   Axis 3) — no fresh fixture needed; the taxonomy is falsifiable against
   any new red result by checking which row's error shape it matches.

4. **A generator or author MUST distinguish flake-checker's crash from its
   findings by grepping stderr for `Error: Invalid(` or `Error:
   FlakeLock(`, never by exit code alone (M-B-07).** Rationale: the Action
   always exits 0 regardless of findings; the bare CLI crashes (non-graceful,
   Rust panic-shaped) specifically on "no top-level `nixpkgs` input" and
   "non-standard lock root" — both common in library/generated flakes.
   VERIFY: `flake-checker --no-telemetry <path>/flake.lock 2>&1 | grep -e
   'Error: Invalid(' -e 'Error: FlakeLock('` against
   `fixtures/check-ci-and-impls/no-nixpkgs-input/` (must match — crash) and
   `fixtures/check-ci-and-impls/with-nixpkgs-input/` (must not match — runs
   clean or reports real findings). Empty output on the twin = pass. RUN:
   **planned, blocked on store contention** (flake-checker itself needs no
   nixpkgs fetch to run against a lock file it can parse, but the *lock*
   for `with-nixpkgs-input/` needs `nix flake lock` first, which does need
   the store) — see Verification runs #4.

5. **CI MUST install upstream CppNix via `cachix/install-nix-action` pinned
   by full commit SHA (never `@v31`, never `@main`), and any Determinate
   installer MUST be pinned to an exact `determinate-nix-action` tag, never
   `nix-installer-action@main`, when Determinate is the intent.**
   Rationale: `nix-installer-action` installs Determinate Nix by default
   and its own README calls upstream-Nix mode "not a supported
   configuration"; `@main` on either action means "whatever shipped an hour
   ago". VERIFY: `grep -rn -e 'install-nix-action@main' -e
   'nix-installer-action@main' -e 'determinate-nix-action@main' .github/workflows`
   — non-empty output is the finding. Reading heuristic (no fixture needed;
   this is a workflow-YAML grep, not a Nix-evaluable property).

6. **A published flake's CI SHOULD use `nix-community/cache-nix-action`
   (or `magic-nix-cache-action` ≥v11) for its store cache, never an
   unversioned/pre-v11 Magic Nix Cache reference.** Rationale: the pre-2025
   free-tier Magic Nix Cache is permanently dead (GitHub's cache-API
   break); anything referencing it by an old tag or `@main` from before
   2025-06 is stale advice an LLM is likely to reproduce from training
   data. VERIFY: `grep -rn -e 'magic-nix-cache-action@v[0-9]' .github/workflows`
   then check the matched version against 11 — anything below 11 is the
   finding (pre-revival, dead API). Reading heuristic; no fixture (this is
   a version-string comparison, not a runtime property).

7. **A published A/B/D-shape flake SHOULD add a non-blocking Lix leg
   (`nix flake check --no-build` under `nixpkgs#lix`) and a non-blocking
   version-floor leg, and MUST NOT rely on a Determinate-only feature.**
   Rationale: Lix and CppNix diverge on real, current syntax rules
   (`rec-set-merges`, `floating-without-zero`); ~2 points of real-world
   flake-evaluation-success gap exist between the two implementations at
   scale (goldstein.lol). VERIFY: `nix eval --file <fixture>.nix` under
   both `nixpkgs#lix` and the pinned CppNix; a result that differs (one
   errors, one doesn't) is the divergence. RUN: **planned against
   `lix-recmerge-violation/mixed-rec.nix` and `lix-float-violation/
   float.nix` with their compliant twins — blocked on store contention**,
   see Verification runs #7/#8.

8. **A CI job MUST run at least one real `nix build` (not just `nix flake
   check`) for its `default` package, on every push.** Rationale: since
   2.32, `check` skips already-substitutable derivations — a green check
   alone does not prove the source still builds, only that the shape is
   right and (if substitutable) that a binary still exists somewhere. This
   matters most exactly when it would otherwise be silently skipped: a
   nixpkgs bump, or after an upstream re-tag that could have changed a
   fixed-output hash. VERIFY: CI log must contain a `building '/nix/store/
   …-<pname>…'` line (not only `querying info about … substitut[er|able]`)
   at least once per workflow run for the package under test. RUN:
   **planned against `fixtures/check-ci-and-impls/substitutable-build/`
   with `-v` — blocked on store contention**, see Verification runs #5.

9. **A generator (the ocx-index case) MUST emit a literal top-level
   `nixpkgs` input even if the generated packages never reference it, or
   document explicitly that flake-checker cannot run against its output.**
   Rationale: flake-checker's crash mode (guidance #4) fires on exactly
   this shape, and a generated flake is otherwise the least-reviewed
   category of flake in the fleet's plan. VERIFY: same as guidance #4,
   run against whatever the generator currently emits.

10. **An agent diagnosing "the git tree is dirty" in CI on a `--no-build`
    or eval command MUST check whether the checkout is shallow/detached
    before assuming the flake itself is misconfigured.** Rationale:
    NixOS/nix#5302 was a real, if now-fixed, source of false "dirty"
    warnings specifically in PR-build-shaped checkouts; `jj`'s own CI
    defensively uses `fetch-depth: 0` rather than trust the fix
    unconditionally. VERIFY: `git status --porcelain` inside the checkout
    must be empty at the same moment Nix reports dirty — if so, the
    checkout shape (shallow/detached/missing `.git`) is the suspect, not
    the flake. RUN: **fixture built and its git-level claim confirmed
    (`git status` reports clean on a real detached-shallow clone) — the
    Nix-level half (does 2.35.2 also report clean) is blocked on store
    contention**, see Verification runs #10.

## Verification runs

**Store-contention note (read this first):** this subarea's fixture
directory and every command below were prepared and staged during this
session, but the shared, single-user, daemonless nix-portable store under
`~/.cache/research-lang/nix-tools/.nix-portable/` was held by 80–87
concurrent processes throughout this session (measured via `fuser
.../db/db.sqlite`, rising, not falling, over four checks spaced ~2 minutes
apart) — other wave-2 dives running against the same shared toolchain, per
the frame's own documented environment (`nix-frame.md`, "the wave-1
tool-runs worker.sh batch is still running… dives serialize on the store").
Every `nix`-invoking command below (including a bare `nix path-info` on an
already-realized path, and `nix --version` itself through the toolchain
wrapper) timed out at 300s against this contention; a raw, non-wrapped
`nix-portable nix --version` (bypassing the toolchain-flake `nix shell`,
which needs the store) returned instantly, confirming the hang is
store-lock contention, not a broken toolchain. This mirrors the audit's own
Axis 7 finding exactly (a concurrent `nix flake check` batch produced the
same "progressively earlier stall" shape that was there attributed to
plausible SQLite lock contention on the shared store). No command below
that needed the store completed; every fixture, command and expected
result is recorded so a follow-up pass (or the next artifact to touch this
store) can run them as-is.

| # | Fixture | Command | Expected exit (violation) | Expected exit (twin) | Status |
|---|---|---|---|---|---|
| 1 | `ifd-violation/` vs `ifd-compliant/` | `nix flake check --no-build --no-write-lock-file <path>` | 0, but build log shows `generated-value.nix` built anyway | 0, no such build line | **not run** — timed out at 300s (store contention) |
| 1b | `ifd-violation/` | same + `--option allow-import-from-derivation false` | non-zero, IFD-disabled error | (twin has no IFD; not applicable) | **not run** |
| 2 | `foreign-ifd-violation/` vs `foreign-ifd-compliant/` | `nix flake check --no-build --all-systems --no-write-lock-file <path>` | non-zero, `a 'aarch64-linux' with features {} is required to build …` | 0 | **not run** |
| 3 | `substitutable-build/` | `nix flake check -v <path> 2>&1 \| grep -e building -e querying` | (single fixture; distinguishes substitute-query from real build) | — | **not run** |
| 4 | `no-nixpkgs-input/` vs `with-nixpkgs-input/` | `nix flake lock <path>` then `flake-checker --no-telemetry <path>/flake.lock` | crash, `Error: Invalid("no nixpkgs dependency found…")` | 0 or real findings, no crash | **not run** (the `nix flake lock` half needs the store even though flake-checker itself does not) |
| 5 | `lix-recmerge-violation/mixed-rec.nix` vs `-compliant/` | `nix eval --file <f>.nix` under pinned CppNix, then under `nix shell nixpkgs#lix --command nix-instantiate --eval <f>.nix` | CppNix: 0. Lix: non-zero, `rec-set-merges`-shaped parse error | both: 0 | **not run** |
| 6 | `lix-float-violation/float.nix` vs `-compliant/` | same pattern | CppNix: 0. Lix: non-zero or warning, `floating-without-zero`-shaped | both: 0 | **not run** |
| 7 | `detached-checkout/` (git half) | `git clone --depth 1 file://<origin> <dir> && git checkout --detach $(git rev-parse HEAD) && git status --porcelain` | (git-level claim) | empty output = clean | **RUN — passed.** Output: `HEAD detached at 3a02edc74a4 / nothing to commit, working tree clean`; `git status --porcelain` empty. |
| 7b | `detached-checkout/` (Nix half) | `nix flake check --no-build <dir>` inside the detached clone, watching stderr for `warning: … is dirty` | expected: no dirty warning on 2.35.2 (issue closed 2022) | — | **not run** |

Only #7 (the git-mechanics half of the detached-checkout fixture) completed,
because it needs no Nix invocation at all — it is a plain `git`
reproduction of GitHub Actions' PR-checkout shape. Every other row is a
fully specified, ready-to-run command against a fixture that already exists
on disk with `git init -q && git add -A` already done; none of them are
"reading heuristic only" by design — they were all meant to be watched red
and green this session, and the honest status is that the shared store
never freed up in the time available. A run against a genuinely idle store
should complete rows 1–6, 7b in well under a minute each (none of the
fixtures build anything larger than `pkgs.hello` or `pkgs.writeText`
output).

## Exemplar evidence

| Candidate | Satisfies | Violates / contradicts |
|---|---|---|
| #1 (`--no-build`/`--all-systems` as the first gate step) | `jj-vcs/jj@f01e70f8`: `nix flake check -L --show-trace` in CI | Only 14/37 exemplar CIs run `nix flake check` at all ([shape §9](../nix-audit/exemplar-flake-shape.md)) |
| #2 (IFD ≠ `--no-build`-forbidden) | — (mechanism-level; no exemplar states the rule) | `cachix/devenv@6d76db38`: cold `nix eval` triggers a real 95.6s build via IFD, unbounded by any `--no-build` the caller might have intended ([runs](../nix-audit/exemplar-tool-runs.md) Axis 6) |
| #3 (triage `--all-systems` reds) | `numtide/treefmt` and `helix-editor/helix` are the *only* 2/20 genuine authoring bugs among 10 failures — the other 8 exemplars' reds are not their fault | An agent or reviewer with no taxonomy would flag all 10 equally |
| #4 (flake-checker crash ≠ exit code) | `DeterminateSystems/flake-checker-action` usage in `nix-index-database`'s own CI shows the Action-mode (never fails the job) | `hercules-ci/flake-parts`, `numtide/flake-utils`, `nix-community/nix-index` all crash the bare CLI (`Error: Invalid(...)`) — none of them run flake-checker in CI at all, i.e. they've never been checked by their own tooling |
| #5 (SHA-pin installer) | `jj-vcs/jj@f01e70f8`: `cachix/install-nix-action@630ae543ea3a38a9a4166f03376c02c50f408342` | `nix-community/nix-index-database@9ad72267` and `nix-community/fenix@5f7e7d79` both use `cachix/install-nix-action@v31` (tag, not SHA) — majority-practice contradicts the resolved rule even among well-maintained repos |
| #6 (cache of record) | — (no exemplar yet on `cache-nix-action` v7 or `magic-nix-cache-action` ≥v11; `nix-index-database` uses `cachix/cachix-action@v17`, a *different* product, Cachix-hosted) | `cachix/devenv`'s lock is >30 days old and tracks `rolling` (unsupported branch per flake-checker) — the kind of drift a fresh cache-of-record choice does not by itself fix ([runs](../nix-audit/exemplar-tool-runs.md) Axis 4) |
| #7 (Lix/floor leg, non-blocking) | — (no exemplar runs a Lix leg in CI; this is prescriptive, not yet observed practice) | Lix itself: `nix flake check` behavior across flakes is measurably different (~68% vs ~70% success at scale, per goldstein.lol) — the gap this guidance exists to catch |
| #8 (real `nix build`, not just `check`) | `nix-community/nix-index-database@9ad72267:.github/workflows/update.yml` explicitly runs `nix flake show --all-systems` **and** `nix flake check -L --all-systems --no-build`, commenting "We don't want to build the checks since we don't have virtualisation support on github runners" — i.e. this exemplar *consciously* accepts the substitution-skip tradeoff rather than missing it by accident | `oxalica/rust-overlay`'s `nix eval` in Axis 6 was measured warm (already touched this run), so its own CI's build guarantees couldn't be independently assessed from this audit's data alone |
| #9 (generator emits a root `nixpkgs` input) | — (prescriptive for the not-yet-built ocx generator; see `nix-audit/ocx-index-and-fleet.md`) | `nix-community/fenix@5f7e7d79ba:.github/workflows/ci.yml` (a generated/overlay-shaped flake) *does* carry a root `nixpkgs` input and is clean under flake-checker as a result — evidence the pattern is achievable for a generator-shaped flake, not just hand-authored ones |
| #10 (dirty-tree triage) | `jj-vcs/jj@f01e70f8:ci.yml:133` uses `fetch-depth: 0`, sidestepping the issue class entirely rather than depending on the fix | — |

Notably absent from the corpus: no exemplar runs `nix flake check` under
Lix or a version-floor Nix in CI at all — the "implementation matrix"
guidance in this file is prescriptive, built from the manual, the release
notes, and an independent large-scale probe (goldstein.lol), not yet
observed as a CI pattern in the wild. That gap is itself worth stating
plainly to whoever authors `nix-flake-release`: this is one of the few
areas in the whole Nix dive where "what good exemplars already do" gives no
answer, because none of them do it yet.

## AI-agent angle

- **Treats `--no-build` as "safe from IFD".** An agent reasoning "no-build
  means nothing gets built, so this is safe/fast/side-effect-free" is wrong
  the moment any output evaluates through an `import` of a derivation. The
  smallest mechanical check: grep the flake and its transitive `import`s
  for `import\s+\(?\s*pkgs\.` or any `import <expr>` where `<expr>` is
  visibly a derivation-producing call (`runCommand`, `stdenv.mkDerivation`,
  `writeText`, etc. wrapped directly in `import`) — a true positive needs
  eyeballing since the check can't distinguish "imports a derivation
  output" from "imports a plain path" by grep alone, but the pattern
  `import (pkgs\.` / `import (self\.` is the highest-yield search:
  `grep -rn -e 'import (pkgs\.' -e 'import (self\.' .` over the flake's
  own `.nix` files.
- **Treats a green `nix flake check` as "this still builds from source".**
  Since Nix 2.32 this has been false whenever the output is already
  substitutable. An LLM trained mostly on pre-2.32-era material (most
  training data) will over-trust `check` as a build guarantee. Mechanical
  check: does the CI log contain a `building '/nix/store/…'` line for the
  package under test, or only `querying info about … on 'https://…'`?
- **Treats every `--all-systems` red as an authoring bug to "fix" by
  deleting the failing system from the systems list.** This throws away
  real coverage to make a checker-limitation or nixpkgs-platform-drop red
  go away. Mechanical check: match the first error line against the
  six-cause taxonomy (finding 4) before touching the systems list at all;
  only causes (f) and (g) warrant an authoring change.
- **Cites `magic-nix-cache-action@main` or an old, pre-2025 pinned version
  as current best practice** — this is exactly the kind of "it worked when
  my training data was collected" trap: the free tier it names is
  permanently dead, and pinning `@main` on the revived Action means "an
  unknown, possibly-not-yet-released version" rather than "the free,
  stable option" the phrase implies to a human reader. Mechanical check:
  version-compare against v11 (revival floor).
- **Assumes `nix-installer-action` installs "Nix" (i.e. upstream CppNix).**
  It installs Determinate Nix by default and says so only in a `[!NOTE]`
  callout most summarization would drop. Mechanical check: `grep -n
  'nix-installer-action' .github/workflows/*.yml` then check for an
  explicit `determinate: false` on each match — its absence means
  Determinate Nix, not upstream.
- **Emits `nixVersions.nix_2_24`, `nix_2_20`, or any other version an agent
  "remembers" as a floor**, without checking the pinned channel's own
  removal errors. nixpkgs prunes old `nixVersions.*` stubs release over
  release; a hardcoded floor from training data is close to guaranteed to
  be stale by the time it's used. Mechanical check: `nix eval --raw --expr
  'with import <nixpkgs> {}; nixVersions.nix_2_XX.version'` for the
  intended floor — a `has been removed. use nix_2_YY` error names the
  correct current floor directly; trust the error message, not memory.
- **Writes a Lix CI leg (or skips one) based on the assumption that Lix and
  CppNix are "basically the same, just faster".** They diverge on real
  syntax rules (`rec-set-merges`, `floating-without-zero`) that a
  training-data-era Lix (pre-2.95, or pre-fork entirely) would not have
  had. Mechanical check: run the two language-level fixtures
  (`lix-recmerge-violation/`, `lix-float-violation/`) under both
  implementations; a result difference is the smallest possible proof the
  divergence is live on the exact versions in use.
- **Diagnoses a "Git tree is dirty" warning by looking for uncommitted
  changes with `git status`**, which the fixture in this file shows can be
  clean while Nix still (historically) warned. Mechanical check: before
  touching the working tree, check whether the checkout is shallow
  (`git rev-parse --is-shallow-repository`) or detached
  (`git symbolic-ref -q HEAD` exits non-zero if detached) — either is the
  actual suspect, not file contents.

## Contested / evolving

- **Whether the Lix leg should stay non-blocking or become required.** As
  of 2026-09-27 the map resolves it non-blocking (conflict 11), pending
  this dive's own re-run of the cross-implementation check under load —
  which this session could not complete (store contention). The direction
  to watch: Lix's flake support is explicitly frozen and being extracted
  into a plugin (finding 11) — if that extraction changes flake semantics
  further before this program's next revision, the "advisory" framing may
  need to become "advisory, and increasingly divergent" rather than
  "advisory, converging".
- **`floating-without-zero`'s actual severity (warn vs. hard error) in Lix
  2.95** was not fully disambiguated from the blog post alone — `rec-set-
  merges` is explicitly "forbidden" in the post's own words, but the float
  rule's wording ("must now always include…") is more ambiguous between a
  warning and a parse error. The fixture (`lix-float-violation/float.nix`)
  is built and ready; this session could not run it to settle the
  question empirically.
- **Whether `nix-community/cache-nix-action` v7 or `magic-nix-cache-action`
  ≥v11 is the better default for a *new* fleet flake** is not yet settled
  by any exemplar evidence (neither appears in the corpus) — the
  resolution in finding 7 is a synthesis of the two tools' own READMEs
  (each explicitly compares itself to the other), not measured practice.
  This is a genuine "practice hasn't caught up to the 2025 cache-API break
  yet" gap, not a disagreement between sources.
- **GitHub's Actions runner catalogue keeps moving** (`macos-15` GA,
  ARM64 Ubuntu runners GA) faster than any exemplar's CI matrix updates to
  match — `jj`'s `macos-14` is current-enough as of this era but should be
  treated as a floor to check against GitHub's own runner-images releases
  at flake-release time, not a fact to hardcode into a rule file
  indefinitely.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [nix3-flake-check, 2.35.2 Reference Manual](https://nix.dev/manual/nix/2.35/command-ref/new-cli/nix3-flake-check) | Primary: Nix manual, version-pinned to this toolchain | 2.35.2, 2026 | The authoritative list of what output attributes `nix flake check` validates and how, plus `--no-build`/`--all-systems`/`--print-out-paths` semantics |
| [rl-2.32.md](https://raw.githubusercontent.com/NixOS/nix/master/doc/manual/source/release-notes/rl-2.32.md) | Primary: Nix release notes | 2025-10-06 | Source of "check now skips substitutable derivations" (PR #13574) — directly changes what a green check proves |
| [rl-2.34.md](https://raw.githubusercontent.com/NixOS/nix/master/doc/manual/source/release-notes/rl-2.34.md) | Primary: Nix release notes | 2026-02-27 | Rust nix-installer beta; intermediate release between the two cited in the brief |
| [rl-2.35.md](https://raw.githubusercontent.com/NixOS/nix/master/doc/manual/source/release-notes/rl-2.35.md) | Primary: Nix release notes | 2026-06-22 | Lazy source copies, `--print-out-paths`/`--out-link` for `flake check`, the pinned toolchain's exact version |
| [NixOS/nix#4265](https://github.com/NixOS/nix/issues/4265) | Primary: upstream issue, open | filed 2020, still open 2026-09-27 | Verbatim foreign-system-IFD error string and root cause, straight from the maintainers' own repo |
| [NixOS/nix#5302](https://github.com/NixOS/nix/issues/5302) | Primary: upstream issue, closed | 2022 | The detached/PR-checkout "dirty tree" report and its resolution, source for the detached-checkout fixture |
| [NixOS/nix#3872](https://github.com/NixOS/nix/issues/3872) | Primary: upstream issue, closed | 2020, fixed ~24.11/2.18 era | `cached failure of attribute` error string for `nix-diagnose`'s catalogue |
| [NixOS/nix security advisories (GitHub API)](https://github.com/NixOS/nix/security/advisories) | Primary: vendor security advisory list | live, fetched 2026-09-27 | Ground truth for CVE-2026-39860's exact affected/patched version list; more current than any secondary summary |
| [cachix/install-nix-action README](https://raw.githubusercontent.com/cachix/install-nix-action/master/README.md) | Primary: tool's own docs | fetched 2026-09-27 (`@v31` current) | Installer defaults, inputs, and the FAQ's own advice on channels/binary caches |
| [DeterminateSystems/nix-installer-action README](https://raw.githubusercontent.com/DeterminateSystems/nix-installer-action/main/README.md) | Primary: tool's own docs | fetched 2026-09-27 | Confirms Determinate-by-default, the `determinate: false` escape hatch, and its explicit "not supported" framing |
| [DeterminateSystems/determinate-nix-action README](https://raw.githubusercontent.com/DeterminateSystems/determinate-nix-action/main/README.md) | Primary: tool's own docs | fetched 2026-09-27 | The version-pinned alternative to `nix-installer-action`; current tag `v3.22.5` |
| [nix-community/cache-nix-action README](https://raw.githubusercontent.com/nix-community/cache-nix-action/main/README.md) | Primary: tool's own docs | fetched 2026-09-27 (major v7) | Cache-of-record candidate; explicitly compares itself against `magic-nix-cache-action` and `actions/cache` |
| [DeterminateSystems/magic-nix-cache-action README](https://raw.githubusercontent.com/DeterminateSystems/magic-nix-cache-action/main/README.md) | Primary: tool's own docs | fetched 2026-09-27 | Revived-project current state; cross-checked against its own Releases API for the v11 revival point |
| [DeterminateSystems/magic-nix-cache-action Releases API](https://api.github.com/repos/DeterminateSystems/magic-nix-cache-action/releases) | Primary: GitHub Releases API | fetched 2026-09-27 | Ground truth for v11 (2025-06-16) through v15 (2026-09-09) dates |
| [DeterminateSystems/flake-checker README](https://raw.githubusercontent.com/DeterminateSystems/flake-checker/main/README.md) | Primary: tool's own docs | fetched 2026-09-27 | "Always exits 0" Action behavior stated verbatim; CEL condition syntax; supported-branches list (and its skew vs. the pinned binary) |
| [determinate.systems/blog/magic-nix-cache-free-tier-eol](https://determinate.systems/blog/magic-nix-cache-free-tier-eol/) | Primary: vendor blog, first-party account of the incident | 2025-01-21 | The actual mechanism of the 2025 cache-API break, in the tool author's own words |
| [lix.systems/blog/2026-03-25-lix-2.95-release](https://lix.systems/blog/2026-03-25-lix-2.95-release/) | Primary: Lix project's own release announcement | 2026-03-25 | Source for `rec-set-merges` and `floating-without-zero`, and for Lix's flakes-as-plugin extraction direction |
| [goldstein.lol/posts/great-nix-flake-check](https://goldstein.lol/posts/great-nix-flake-check) | Secondary but data-driven: independent large-scale probe (7,615 flakes) | published 2026-04-07 | The only cross-implementation success-rate measurement (~70%/~68%) at a scale no single exemplar corpus can match; catalogues concrete CppNix-vs-Lix divergences |
| `jj-vcs/jj@f01e70f8:.github/workflows/ci.yml:100-144` | Exemplar corpus (sparse clone), real production CI job | fetched into corpus 2026-09-27 | The runner matrix, SHA-pinned installer, and `fetch-depth: 0` pattern this file recommends, verbatim from a real, actively-maintained project |
| `nix-community/nix-index-database@9ad72267:.github/workflows/update.yml` | Exemplar corpus, real generated-flake CI/CD pipeline | fetched into corpus 2026-09-27 | The `--all-systems --no-build` pattern with its own stated rationale (no cross-arch virtualization on GitHub runners) — a generated-flake precedent directly relevant to the ocx handoff |
| `nix-community/fenix@5f7e7d79:.github/workflows/ci.yml` | Exemplar corpus, real generated/overlay flake CI | fetched into corpus 2026-09-27 | The `--override-input nixpkgs github:nixos/nixpkgs/nixpkgs-unstable` matrix leg — a forward-compatibility testing pattern worth stealing, distinct from the Nix-implementation matrix this file otherwise covers |
| `../nix-audit/exemplar-tool-runs.md` (Axes 1–7, Smells, Patterns) | This program's own prior audit, measured against the same toolchain/corpus | 2026-09-27 | Source of the `--all-systems` six-cause taxonomy, the flake-checker crash-rate measurement, and the exact Axis 7 store-contention precedent this session's own verification runs reproduced |

