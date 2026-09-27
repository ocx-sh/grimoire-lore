---
title: "Versioning and publishing flakes — consolidated (NIX-REL)"
topic: nix-quality/release.md (NIX-REL) — version strings, tags and pins, lock at release, FlakeHub, install blocks, non-flake users, deprecation, cache stance, upstreaming
model: opus
id_family: NIX-REL
consolidates:
  - nix-release/versioning-and-tags.md
  - nix-release/publishing-and-consumer-ux.md
  - nix-release/verification-rerun-w3.md
date: 2026-09-27
revised: 2026-09-27
era: "CppNix 2.35.2 + nixpkgs 26.11pre rev 8d5d270900d3; floor nixVersions.nix_2_31 = 2.31.5; Lix 2.95.2; nix-update 1.16.0; Determinate Nix untested (not in nixpkgs) — measured 2026-09-27"
fixtures: /home/mherwig/.cache/research-lang/nix-tools/fixtures/nix-release/ (this consolidation, including ref-grep/ from the revision), plus the dives' fixtures/versioning-and-tags/, fixtures/publishing-and-consumer-ux/ and fixtures/verification-rerun-w3/
---

# Versioning and publishing — consolidated (NIX-REL)

Both dives ran real commands on CppNix 2.35.2. This consolidation re-ran
the ones that settle conflicts, and it planted eight new twin pairs under
`fixtures/nix-release/`. Every MUST below was watched red on a planted
violation and green on its twin ([Consolidation verification runs](#consolidation-verification-runs), C1-C12).
Three dive claims did not survive: a version suffix that is conditional on
tags, `nix profile add` as the only install line, and "`abort-on-warn` never
in CI".

The wave-3 rerun ([w3](nix-release/verification-rerun-w3.md)) changed one
rule's severity and replaced a verification. NIX-REL-13's check ("the hash
changed as well as `version`") passed on a violation. A literal `rev` or `tag`
makes `nix-update` write the hash of the **old** source under the **new**
version. The rerun also showed that the blocked write-back was never an
environment fault: `nix-update` does not replace the `lib.fakeHash` symbol
(new REL-17). It measured REL-05, REL-09 and REL-16 on the 2.31.5 floor and on
Lix 2.95.2, and ran REL-16 against a real pushed `github:` tag. See the
[Revision log](#revision-log).

## Verdict

1. **Version = the manifest, verbatim, always.** An A flake reads `version` with `lib.importTOML ./Cargo.toml` (`.workspace.package.version` for ocx, `.package.version` for grimoire) or `./pyproject.toml` (`.project.version` for ocx-sdk-python). It never uses a literal and never adds a suffix. The deciding measurement: a flake evaluated at a tag ref has **no tag or ref attribute on `self`** (C2). So a flake cannot tell a release commit from any other commit, and any suffix of the yazi kind makes the version at the tag differ from the tag (C1).
2. **The revision stays out of the package.** Reading `self.rev` anywhere a derivation sees it changes the `drvPath` on every commit. That includes commits which only touch a README, and it happens whether the revision goes into `version` or into an env var ([vt] §3). Fleet flakes therefore do not feed ocx's `vergen` a git SHA.
3. **Releases are the project's existing `vX.Y.Z` git tags.** All four fleet repos already tag this way. Consumers pin `github:<owner>/<repo>/vX.Y.Z`. The lock is refreshed in its own commit, and the tag commit never touches `flake.lock` (C5). A D flake (the ocx-index flake) has no tags: its lock revision is its version (map conflict 9).
4. **No FlakeHub for fleet flakes, as either input or target** (owner Q1). This is decided, not deferred. For the general adopter who does use FlakeHub: tagged releases only, never rolling releases once a tag ≥0.2.0 exists.
5. **Consumer UX is decided by flake shape.** A and D flakes ship the README block `nix run` / `nix profile add` / input snippet, plus a one-line `nix profile install` fallback, because **Lix 2.95.2 rejects `nix profile add`** (C3). They also ship `default.nix`/`shell.nix` through **`NixOS/flake-compat` only**. B flakes give an input snippet and E flakes give `nix flake init -t`. The block and the bridge were measured on CppNix 2.31.5, CppNix 2.35.2 and Lix 2.95.2 ([w3] R7-R9). `nix profile add` on Lix is the only divergence, so no README needs a per-implementation variant.
6. **Renaming or removing an output takes one release behind a warning.** The mechanism depends on what is being deprecated: `lib.warn` for a package or tree, `warnOnInstantiate` when the warning should fire only on build, and `mkRenamedOptionModule` for module options. `abort-on-warn` is allowed only on named **current** attributes and never on `nix flake check` of the whole flake (C4). This settles the clash with the map's wave-4 amendment and NIX-GEN-14.
7. **Compatibility promise:** "gated on CppNix <pinned>, floor = NIX-GATE-16's computed floor, Lix advisory, Determinate Nix untested, flakes experimental per RFC 136". Nothing more.
   - **Documented gap: Determinate Nix.** It cannot be measured with this toolchain. The pinned nixpkgs (`8d5d2709`) has no `determinate` entry in `nixVersions` and no `determinate-nix` attribute; only `fh` 0.1.27 is packaged ([w3] R11). Determinate ships its own installer. Every Determinate claim in NIX-REL is therefore a reading, not a run. Per owner Q6, it is "untested, never deliberately broken", never "works".
8. **No public cache (owner Q2), and nixpkgs is deferred (owner Q3).** The in-repo `package.nix` is by-name-shaped (NIX-PKG-06). The nixpkgs copy differs from it in exactly three attributes: `version` literal, fetcher `src`, and dependency hash.
9. **A `package.nix` with a forge-fetcher `src` is safe to hand to `nix-update` only in one shape.** The ref interpolates the version (`tag = "v${finalAttrs.version}";`), and the hash is literal SRI text. With a literal ref, `nix-update -F --version=X` exits 0 after pairing the new version with the old source's hash. The package then claims X and builds the previous release, and `nix build` still succeeds ([w3] F3, C12). With the `lib.fakeHash` symbol, the hash is never written back ([w3] F2). "The hash changed too" proves nothing (REL-13, REL-17).

Shape binding: rules 01-03 and 14 bind **A**. Rules 05, 09 and 15 bind **A and D**. Rule 10 binds every shape that exports outputs, and its module half binds **C**. Rules 13 and 17 bind every `package.nix` whose `src` is a forge fetcher: the nixpkgs copy of an A package, and hand-written packages. The generated flake (**D**) takes 06, 07, 09, 10, 11 and 16, and replaces 01-05 with "the lock revision is the version". Its OCI-blob sources carry no `rev` or `tag` (NIX-GEN).

## The ruleset

### NIX-REL

"Watched red" = red on the planted violation, green on the compliant twin,
under CppNix 2.35.2 and nixpkgs 26.11pre `8d5d2709` unless stated. `[vt]` =
[versioning-and-tags](nix-release/versioning-and-tags.md) Verification runs,
`[pub]` = [publishing-and-consumer-ux](nix-release/publishing-and-consumer-ux.md)
Verification runs, `[w3]` = [verification-rerun-w3](nix-release/verification-rerun-w3.md)
runs R1-R11 and findings F1-F8, `C<n>` = this file's runs. Paths in commands are the
fixture directories; in a real repo the operand is `.`.

#### Check 1 — `nix eval` of the version against the manifest and the tag

| ID | Rule | Rationale (failure prevented) | Verification | Watched red? | Severity | Floor / impl |
|---|---|---|---|---|---|---|
| NIX-REL-01 | Read `version` from the project's own manifest through a source-tree path: `(lib.importTOML ./Cargo.toml).workspace.package.version` or `.package.version`, or `(lib.importTOML ./pyproject.toml).project.version`. Never duplicate it as a literal. Never read it through `"${src}/…"` (NIX-FLK-07). Keep `package.nix` next to the manifest so the read needs no `../` (NIX-PKG-06). | A literal drifts from `Cargo.toml` at the next bump, which is 259 literals in 16/37 exemplars ([shape](nix-audit/exemplar-flake-shape.md) §4). A `${src}` read forces a realisation during evaluation. | Every commit: `test "$(nix eval --raw .#packages.x86_64-linux.default.version)" = "$(grep -m1 -e '^version = ' Cargo.toml \| cut -d'"' -f2)"`, where exit 0 passes (ocx: grep under `[workspace.package]`). For the `${src}` form, use Q5: `nix flake check --no-build --option allow-import-from-derivation false .` | **Yes**. C1b: `tag-good` 0, `tag-bad-literal` 1 (`1.2.2` against `1.2.3`). [vt] run 1: `good-version` 0, `bad-version` 1 (`cannot build '…drv^out' during evaluation because the option 'allow-import-from-derivation' is disabled`). | MUST | 2.35.2 |
| NIX-REL-02 | Emit the manifest version **verbatim**. Never append `pre<date>_<rev>`, `+<rev>`, `-dirty` or `-unstable-…`, not even "only for untagged builds". The nixpkgs `-unstable-YYYY-MM-DD` form belongs to nixpkgs packages of untagged *upstream* commits, not to a project's own flake. | `self` exposes no tag or ref (C2: keys are `lastModified`, `lastModifiedDate`, `narHash`, `outPath`, `rev`, `revCount`, `shortRev`, `sourceInfo`, `submodules`), so a conditional suffix cannot be written. Any suffix makes the version at tag `vX.Y.Z` differ from `X.Y.Z`, as in yazi's `26.9.1pre20260901_8dd895c` at `v26.9.1` ([vt] run 6). | At a tag: `test "v$(nix eval --raw .#packages.x86_64-linux.default.version)" = "$(git describe --tags --exact-match HEAD)"`, where exit 0 passes. The REL-01 command covers every other commit. | **Yes**. C1: `tag-good` 0 (`1.2.3`), `tag-bad-suffix` 1 (`1.2.3pre20260927_97ecf65`), `tag-bad-literal` 1. | MUST | 2.35.2 (`self` key set) |
| NIX-REL-03 | Do not read `self.rev`, `shortRev`, `dirtyShortRev`, `lastModified` or `revCount` in a derivation the flake exports. If a build must embed the revision, pass it as a separate env var or flag, never in `version`, and accept a new `drvPath` on every commit. | Any read churns the `drvPath` on commits unrelated to the source, including README-only commits. That loses cache hits and, since Nix 2.32, the skipped-substitutable economy of `nix flake check`. Moving the revision from `version` into an env var does **not** stop the churn. | `git commit` an unrelated README change, then compare `nix eval --raw .#packages.x86_64-linux.default.drvPath` before and after: they must be identical. Fast pre-check: `grep -rn -e 'self.rev' -e 'self.shortRev' -e 'self.dirtyShortRev' -e 'self.lastModified' --include='*.nix' .`, where empty passes. | **Yes**. [vt] run 4: `baseline` drvPath identical across the README commit, while `version-embeds-rev` and `env-var-embeds-rev` both changed. | SHOULD | 2.35.2 |

#### Check 2 — a grep over `*.nix` (metadata idioms, flake-compat, FlakeHub)

| ID | Rule | Rationale | Verification | Watched red? | Severity | Floor / impl |
|---|---|---|---|---|---|---|
| NIX-REL-04 | Where `self` metadata is read at all (apps, devShell banners, non-package outputs), use `self.shortRev or self.dirtyShortRev or "unknown"`, never `self.shortRev or "dirty"`. Never expect `rev`/`shortRev`/`revCount` under `path:` (never present), or `revCount` under `github:`. For local tests that need git identity, use `git+file:`. | On a dirty tree `rev`, `shortRev` and `revCount` are **absent**, not suffixed, so `or "dirty"` discards the hash. `path:` carries no git identity even when clean. A plain archive-tarball URL carries no `rev` even though its URL contains the SHA. | `grep -rn -F -e 'shortRev or "dirty"' -e 'rev or "dirty"' --include='*.nix' .`, where empty passes. | **Yes**. C6: `greps/bad` exit 0 (hit), `greps/good` exit 1. The matrix itself is in [vt] run 2 (path:/git+file: × clean/dirty, `github:`, tarball). | SHOULD | 2.35.2 (`dirtyShortRev` is undocumented in `flake.md`; measured) |
| NIX-REL-05 | Ship `default.nix` and `shell.nix` for non-flake users through `inputs.flake-compat = { url = "github:NixOS/flake-compat"; flake = false; };`. Never cite `edolstra/flake-compat` (a stale redirect) or `nix-community/flake-compat` (self-declared unmaintained) in new code. | Of the 12 exemplars that use flake-compat, 10 cite the dated org ([shape](nix-audit/exemplar-flake-shape.md) §8). The two sources build identically, so the choice is about provenance, and only the NixOS repository is maintained. | `grep -rn -e 'edolstra/flake-compat' -e 'nix-community/flake-compat' --include='*.nix' .`, where empty passes. Function check: `nix-build . --no-out-link` and `nix-shell . --run true` both exit 0. The exit code decides. On a host with no channel, ignore the stderr line `file 'nixpkgs' was not found in the Nix search path`: it comes from `nix-shell`'s own bash bootstrap and appears identically on every implementation ([w3] F6). | **Yes**. [pub] Verification (flake-compat): the grep hits `compat-community` and passes `compat-nixos`. `nix-build` and `nix-shell` gave 4/4 green on 2.35.2 and 2.31.5. [w3] R9 on Lix 2.95.2: `nix-build` produced the **same store path** as 2.31.5 (`…-octool-fixture-0.1.0`), and `nix-shell` exited 0. | SHOULD (A, D) | ≥2.31.5 CppNix; Lix 2.95.2 measured; Determinate untested |
| NIX-REL-06 | Fleet flakes take no `https://flakehub.com/f/…` input and run no `flakehub-push` or `flakehub-cache-action` step (owner Q1). A general adopter who publishes to FlakeHub publishes **tagged releases only**, and never rolling releases once any tag ≥0.2.0 exists. | FlakeHub resolves by highest semver, so a rolling `0.1.<n>` published after a real tag is permanently invisible to unpinned consumers (the imTHAI/nix-packages workflow comment, first-party). A FlakeHub input also ties the consumer's lock to one vendor's resolver. | `grep -rn -e 'flakehub.com/f/' -e 'flakehub-push' -e 'flakehub-cache-action' --include='*.nix' --include='*.yml' --include='*.yaml' .`, where empty passes (fleet). The tagged-only half is a reading heuristic over the publish workflow (`rolling: true` next to `tag:` is a finding). | **Yes** for the grep. C6: `greps/bad` hit, `greps/good` exit 1. The rolling half is **not run**: no prototype was built, per Q1 ([vt] §5). | MUST (fleet), SHOULD (FlakeHub publishers) | FlakeHub docs as of 2026-09-27 |

#### Check 3 — git, around the tag

| ID | Rule | Rationale | Verification | Watched red? | Severity | Floor / impl |
|---|---|---|---|---|---|---|
| NIX-REL-07 | Release a flake-bearing project by its **existing** tag scheme: `vX.Y.Z` for all four fleet repos. Invent no flake-only version or tag. Document the pin as `github:<owner>/<repo>/vX.Y.Z`. A D flake cuts no tags, and its lock revision is its version. | No convention exists in the corpus (10/37 never tagged; `vX.Y.Z`, bare semver, dates and bot timestamps coexist, [shape](nix-audit/exemplar-flake-shape.md) §10), so a second scheme only doubles the release surface. | `nix flake metadata --no-write-lock-file --json github:<owner>/<repo>/vX.Y.Z \| jq -e '.original.ref == "vX.Y.Z" and (.locked.rev \| length) == 40'` (with `set -o pipefail`), where exit 0 passes. | **Yes**. C7: `github:sxyazi/yazi/v26.9.1` exit 0 (`true`). `…/v99.99.99` exit non-zero (GitHub `"status": "422"`). | MUST (A, B, C) | 2.35.2; `.locked.ref` is `null` for `github:` |
| NIX-REL-08 | Refresh `flake.lock` in its own commit (NIX-INP owns the cadence), run the full gate on it, then tag a later commit. The tag commit never modifies `flake.lock`. | A bundled change mixes "did the dependency bump pass" with "is this the release", and the tag can point at a lock CI never saw. | `git diff --quiet vX.Y.Z~1 vX.Y.Z -- flake.lock`, where exit 0 passes. | **Yes**. C5: `lock-sep` 0, `lock-in-tag` 1. | SHOULD | git only |

#### Check 4 — README greps plus running the README commands

| ID | Rule | Rationale | Verification | Watched red? | Severity | Floor / impl |
|---|---|---|---|---|---|---|
| NIX-REL-09 | An A or D README's install section gives three lines, in this order: `nix run github:<owner>/<repo> -- --help`; `nix profile add github:<owner>/<repo>` with the fallback comment `# Lix, or Nix < 2.30: nix profile install`; and `inputs.<name>.url = "github:<owner>/<repo>";`, with an optional `inputs.<name>.inputs.nixpkgs.follows = "nixpkgs";` described as "builds against your nixpkgs, which this flake did not test" (NIX-INP consumed-as rule). Never `nix-env -i`. Never `--accept-flake-config` (map conflict 7, NIX-SEC). B flakes give only the input snippet. E flakes give `nix flake init -t github:<owner>/<repo>#<name>`. | Lix 2.95.2 rejects `add` (`error: 'add' is not a recognised command`). CppNix 2.35.2 still accepts `install` as a deprecated alias. The README therefore needs both to serve every implementation. A blanket "every README shows `nix run`" rule mis-fires on B and E flakes: re-classifying 17 hint-less exemplar READMEs found only about 4 genuine gaps ([pub] §1). | `grep -rn -e 'nix-env -i' -e 'nix-env --install' -e 'accept-flake-config' --include='README*' .`, where empty passes. `grep -c -e '^ *nix profile install' README.md` must be 0: `install` appears only as the fallback comment. Run each line verbatim from a clean store (REL-16). | **Yes**. C3: Lix `profile add` exit 1, CppNix `install` warns and exits 0. C6: bad README hit on all three greps, good README clean. [pub] README runs: `nix run` exit 0, `nix profile add --profile <iso>` exit 0, input-snippet consumer `nix build` exit 0. [w3] R7/R8, consumer flow against `run-good` at `v1.2.3`: on 2.31.5, `run` 0, `profile add` 0, `profile install` 0 with a deprecation warning. On Lix 2.95.2, `run` 0, `profile add` 1 (`'add' is not a recognised command`), `profile install` 0 with no warning. | SHOULD | `add` ≥2.30 CppNix (2.31.5 and 2.35.2 measured); Lix 2.95.2 needs `install`; Determinate untested |
| NIX-REL-16 | Before announcing a release, run the README's own command against the **pushed tag** from a clean store: `nix run github:<owner>/<repo>/<tag> -- --version`. Its output must contain the version, which is the tag without any leading `v`. Never substitute a `path:` or local-clone run. | This is the only check that proves together that the tag resolves, the package builds, `mainProgram` is right (NIX-FLK-15) and the version equals the tag (REL-02). `nix flake check` runs no binary. | `nix run --no-write-lock-file "github:<owner>/<repo>/<tag>" -- --version 2>/dev/null \| grep -F -w <version>`, where exit 0 passes. | **Yes**. C8: `run-good` at `?ref=refs/tags/v1.2.3` printed `reltool 1.2.3`, exit 0. `run-bad` printed `reltool 1.2.2`, exit 1. [w3] R10, on a real pushed tag: `github:Mic92/nixpkgs-review/4.0.0` printed `nixpkgs-review 4.0.0`, exit 0, with no attribute path given. [w3] R7/R8: the `nix run` leg is also exit 0 on 2.31.5 and Lix 2.95.2. | MUST (A, D) | 2.31.5, 2.35.2, Lix 2.95.2; Determinate untested |

#### Check 5 — warning counts from `nix flake show`, `nix build` and `nix flake check`

| ID | Rule | Rationale | Verification | Watched red? | Severity | Floor / impl |
|---|---|---|---|---|---|---|
| NIX-REL-10 | Rename or remove a published output over two releases: first the old name behind a warning, then deletion. Choose the mechanism by what is deprecated. (a) A package that should warn on any reference, including `nix flake show`, uses `lib.warn` (the same function as `builtins.warn` on Nix ≥2.23). (b) A package that should warn only when built uses `lib.derivations.warnOnInstantiate`. (c) A whole tree maps `lib.warn` over each attribute (nix-index-database). (d) A legacy singular output uses the `builtins.warn` shim (NIX-FLK-04). (e) An option inside an exported module uses `lib.mkRenamedOptionModule` or `mkRemovedOptionModule`, never `lib.warn`. D flakes follow NIX-GEN-18. | An outright deletion breaks every consumer's lock bump with `does not provide attribute`. The mechanisms are not interchangeable: `warnOnInstantiate` stays silent on `nix flake show`, and `lib.warn` wrapped around a module does not forward the old option. | For (a)-(c), count `evaluation warning:` lines from `nix flake show`, `nix build .#<old>` and `nix flake check --no-build`. They must match the intended row of the firing matrix ([pub] §3). For (e): `nix eval --impure --file` on a config that still sets the old option must exit 0 and return the new value. | **Yes**. [pub] deprecation table: show counts `lib-warn` 1, `builtins-warn` 1, `warn-on-instantiate` 0, `good` 0; build and check 1 each. C9: `module-rename/good.nix` returned `3`, exit 0. `bad.nix` (`lib.warn` wrapper) failed with ``The option `old' does not exist … Did you mean `new'?``, exit 1. | SHOULD (all; (e) binds C) | `builtins.warn` ≥2.23; measured 2.35.2 |
| NIX-REL-11 | Never pass `--option abort-on-warn true` to `nix flake check` or to a whole-flake `nix build`. Where warnings must be fatal (NIX-GEN-14's license check, the consumer-noise check), apply it to **named current attributes** only: `nix eval --option abort-on-warn true --raw .#packages.<system>.<current>.drvPath`. | `abort-on-warn` is a stack-trace debugging switch (`primops.cc`), and it also fires on `builtins.trace`. On a whole-flake check it turns every deliberate REL-10 shim into a red gate. `nix flake show` swallows the abort (exit 0), so "verifying" with `show` gives the wrong answer. | `grep -rn -e 'abort-on-warn' .github/workflows`: every hit must be on a line that names a single attribute (`#packages.…`), never on `flake check`. The authoritative check is the scoped eval passing while the shim exists. | **Yes**. C4 on `deprecate/lib-warn`: scoped eval `new-name` 0, `default` 0, `old-name` 1. `nix flake check --no-build` with the flag: `lib-warn` 1, `good` 0. [pub]: `nix flake show` with the flag exited 0 (swallowed). | MUST | 2.35.2 |

#### Check 6 — reading heuristics (policy, promise, upstream readiness) and the nix-update contract (REL-13, REL-17 are mechanical)

| ID | Rule | Rationale | Verification | Watched red? | Severity | Floor / impl |
|---|---|---|---|---|---|---|
| NIX-REL-12 | State compatibility as: "gated on CppNix <the version CI pins>; minimum = NIX-GATE-16's computed floor (today `nixVersions.nix_2_31` = 2.31.5); Lix advisory; Determinate Nix untested; flakes are experimental (RFC 136)". Never say "works with Nix" unqualified, never hardcode the floor, never promise that the lock schema or CLI flags are stable. | RFC 136: "we are allowed to make breaking changes to experimental features, which includes both the new CLI and Flakes". A hardcoded floor goes stale when nixpkgs turns `nix_2_*` into a throwing stub (`nix_2_24` already has, [runs](nix-audit/exemplar-tool-runs.md)). | Reading heuristic over README and CI. The floor number is taken from NIX-GATE-16's expression. "Determinate Nix untested" is a measured fact, not modesty: nixpkgs `8d5d2709` packages no Determinate Nix ([w3] R11), so no leg of this toolchain can run it. | Floor value [vt] run 8: `2.31.5`. The absence of Determinate Nix was probed in [w3] R11. The wording is a heuristic. | SHOULD | RFC 136, undated |
| NIX-REL-13 | In any `package.nix` whose `src` is a forge fetcher (the nixpkgs copy, hand-written packages), write the ref as an interpolation of `finalAttrs.version`: `tag = "v${finalAttrs.version}";` inside `mkDerivation (finalAttrs: { … })` (NIX-PKG-14). `rev = "v${…}"` behaves the same; NIX-PKG-02 owns the choice between `tag` and `rev`. Never write a literal, version-shaped `rev` or `tag` for the source the package's `version` names. Never accept "the hash changed too" as proof that a bump is correct. | With a literal ref, `nix-update -F --version=X` rewrites `version` **and** the hash, exits 0 and prints nothing. The new hash belongs to the **old** release, because the fetch never moved. The package claims X, builds the previous release's bytes, and `nix build` succeeds ([w3] F3; C12 rebuilt that source with the rewritten hash, exit 0). A reviewer's `git diff` looks like a normal bump. A plain `rev = "v${version}"` without `finalAttrs`/`rec` is `error: undefined variable 'version'`. | Authoritative, after any version change: `test "$(nix eval --json .#<attr> --apply 'p: let s = p.src.url; v = p.version; in builtins.stringLength s != builtins.stringLength (builtins.replaceStrings [ v ] [ "" ] s)')" = true`, where exit 0 passes (the fetched URL contains the version). Pre-screen: `grep -rn -E -e '(rev\|tag) = "v?[0-9]+\.[0-9]' --include='*.nix' .`, where empty passes. Review each hit: a literal pin of a *different* source is allowed (zed's flake-compat pin `rev = "v1.1.0"` in `default.nix:3` is one). **Replaced:** the old check, "`git diff` shows `rev` or the hash changed as well as `version`", passed on the violation ([w3] R3), so it is not admissible. | **Yes**. C10 eval check: `rev-literal` and `tag-literal` exit 1 (URL `…/v0.2.14.tar.gz` against version `0.2.15`); interpolated `literal` and `tag-form` exit 0. C11 grep: `rev-literal`, `tag-literal` and `ref-grep/bad-bare` (`tag = "4.0.0"`) exit 0 (hit); `literal`, `tag-form` and `ref-grep/good-hex` (a 40-hex `rev`) exit 1. | MUST (every forge-fetcher `package.nix`) | nix-update 1.16.0; nixpkgs `8d5d2709` `fetchFromGitHub` |
| NIX-REL-14 | Keep the fleet CLIs nixpkgs-ready without submitting (owner Q3). The in-repo `package.nix` passes NIX-PKG-06 (callPackage-able, no `../`). The nixpkgs copy changes exactly `version` (a literal), `src` (`fetchFromGitHub` with `tag` per REL-13) and the dependency hash (`cargoHash`). It adds `passthru.updateScript = nix-update-script { }` or an explicit `# nixpkgs-update: no auto update`, and it lands as `ocx: init at X.Y.Z`, then `ocx: A -> B`. | Only `pkgs/by-name` PRs are auto-mergeable (`pkgs/by-name/README.md:81`). r-ryantm silently skips a package that has no version signal or no readable `meta`. The commit prefix scopes nixpkgs CI's builds. | Reading heuristic. `nixpkgs-vet` enforces the structure only inside nixpkgs CI. | **No**: nothing is upstreamed, so there is nothing to plant. | CONSIDER | nixpkgs master `7e35f59c1f82` |
| NIX-REL-15 | Stand up no public substituter for fleet flakes (owner Q2). If a project has one, its README documents the `nix.conf` pair (`extra-substituters` / `extra-trusted-public-keys`) as an explicit opt-in. `nixConfig` repeats at most that pair (map conflict 7, NIX-SEC) and is never described as automatic. | For an untrusted user, flake-declared substituters are ignored with `warning: ignoring untrusted flake configuration setting` on every run ([runs](nix-audit/exemplar-tool-runs.md) headline). A cache is a code-execution trust boundary (nix.dev add-binary-cache). | `grep -rn -e 'extra-substituters' flake.nix`: when non-empty, `README.md` must contain the same substituter URL in `nix.conf` form. Reading pair. | **No** (documentation policy). Q12/Q13 belong to NIX-SEC. | SHOULD (A, D) | 2.35.2 |
| NIX-REL-17 | Before running `nix-update`, leave the package's current hash as literal SRI text (`hash = "sha256-…";`), and never prime it with the `lib.fakeHash`/`lib.fakeSha256`/`lib.fakeSha512` symbol. After every `nix-update` run, grep the touched files for a leftover fake-hash symbol. If one remains, obtain the hash by hand per NIX-PKG-03. NIX-PKG-04's "reset to `lib.fakeHash`" governs hand edits of fetcher arguments, not a `nix-update` run. | `nix-update` 1.16.0's `replace_hash` substitutes the **evaluated** old hash (`sha256-AAAA…=`) as text (`nix_update/dependency_hashes.py:24-30`). The symbol's source text never matches that value, so the file keeps `lib.fakeHash`, and the command exits 0 with no diagnostic. The wave-1 attribution to nested bwrap was wrong: `cannot rename: Permission denied` is printed as `error (ignored):`, and the `got:` line still follows ([w3] F1, R6). | `grep -rn -e 'lib\.fakeHash' -e 'lib\.fakeSha256' -e 'lib\.fakeSha512' --include='*.nix' .` after the run, where empty (exit 1) passes. | **Yes**. [w3] R1/R2, re-run as C11b: `nix-update-probe` (symbol) still has `package.nix:9: hash = lib.fakeHash;` after the bump, grep exit 0. `nix-update-probe-literal` received `sha256-J0RAJJdp…`, grep exit 1. | SHOULD | nix-update 1.16.0 (the `src` hash path was run; the `cargoHash` path is only read from the code) |

**Dropped, with reasons.** These dive candidates did not make the ruleset.
- The `nix eval --json` `outPath` coercion trap ([vt] candidate 4): it is a debugging trap, so it goes to the nix-diagnose catalogue.
- "The README install block applies to A and D only" ([pub] NIX-REL-01): folded into REL-09.
- "by-name-ready `package.nix`" ([pub] NIX-REL-09): duplicates NIX-PKG-06, and REL-14 cites it.
- `passthru.updateScript` ([pub] NIX-REL-10): folded into REL-14, which owns it (NIX-PKG dropped it; map E10).
- "Prefer `tag` over `rev`" ([w3] candidate 5): NIX-PKG-02 owns it. REL-13's example uses `tag` and cites PKG-02.
- "Do not claim Determinate Nix compatibility without a direct measurement" ([w3] candidate 9): folded into REL-12's wording and Verdict 7's documented gap.
- `cargoSha256`: it hard-errors, so NIX-PKG and Q8 own it.
- "one flake per versioned thing" (M-G-12): ocx's `ocx` and `ocx-shim` share one version and one tag, so one flake with two packages is correct. No rule changes behaviour.

### Consolidation verification runs

All runs used `/home/mherwig/.cache/research-lang/nix-tools/run.sh`
(`timeout 60 … nix --version` → `nix (Nix) 2.35.2`, so there was no
environment fault) on a warm store for nixpkgs `8d5d2709`. Fixtures live in
`fixtures/nix-release/`, and each one is `git init`, `git add -A` and
committed. `FX` stands for that directory.

```sh
# C1 version equals tag (REL-02) — tag-good / tag-bad-suffix / tag-bad-literal, each tagged v1.2.3
cd $FX/<d> && v=$(nix eval --raw .#packages.x86_64-linux.default.version) && test "v$v" = "$(git describe --tags --exact-match HEAD)"
#   tag-good        version=1.2.3                      exit=0
#   tag-bad-suffix  version=1.2.3pre20260927_97ecf65   exit=1
#   tag-bad-literal version=1.2.2                      exit=1
# C1b version equals manifest (REL-01), same three fixtures
test "$(nix eval --raw .#packages.x86_64-linux.default.version)" = "$(grep -m1 -e '^version = ' Cargo.toml | cut -d'"' -f2)"
#   tag-good exit=0   tag-bad-suffix exit=1   tag-bad-literal exit=1

# C2 what self carries at a tag ref (decides REL-02)
nix eval --json "git+file://$FX/tag-good?ref=refs/tags/v1.2.3#selfKeys"     # selfKeys = builtins.attrNames self
#   ["_type","inputs","lastModified","lastModifiedDate","narHash","outPath","outputs","packages","rev","revCount","selfKeys","shortRev","sourceInfo","submodules"]
#   -> no ref/tag attribute: a flake cannot know it is at a tag

# C3 profile subcommand across implementations (REL-09)
nix profile install --help           # CppNix 2.35.2: "warning: 'install' is a deprecated alias for 'add'", rc=0
nix shell nixpkgs#lix --command nix profile add --help
#   nix (Lix, like Nix) 2.95.2 ... "error: 'add' is not a recognised command", rc=1

# C4 abort-on-warn scoped vs whole-flake (REL-11), fixtures/publishing-and-consumer-ux/deprecate/
nix eval --no-write-lock-file --option abort-on-warn true --raw "$D/lib-warn#packages.x86_64-linux.<a>.drvPath"
#   new-name exit=0   default exit=0   old-name exit=1 ("error: aborting to reveal stack trace of warning, as abort-on-warn is set")
nix flake check --no-build --no-write-lock-file --option abort-on-warn true "$D/lib-warn"   # exit=1
nix flake check --no-build --no-write-lock-file --option abort-on-warn true "$D/good"       # exit=0

# C5 tag commit leaves the lock alone (REL-08)
git -C $FX/lock-sep    diff --quiet v1.0.0~1 v1.0.0 -- flake.lock    # exit=0 (lock bumped one commit earlier)
git -C $FX/lock-in-tag diff --quiet v1.0.0~1 v1.0.0 -- flake.lock    # exit=1 (lock bumped in the release commit)

# C6 greps (REL-04, REL-06, REL-09) on greps/bad vs greps/good   — grep exit 0 = hit = red
grep -rn -e 'flakehub.com/f/' -e 'flakehub-push' -e 'flakehub-cache-action' --include='*.nix' --include='*.yml' --include='*.yaml' .   # bad 0, good 1
grep -rn -F -e 'shortRev or "dirty"' -e 'rev or "dirty"' --include='*.nix' .                                                          # bad 0, good 1
grep -rn -e 'nix-env -i' -e 'nix-env --install' --include='README*' .                                                                   # bad 0, good 1
grep -rn -e 'accept-flake-config' <dir>                                                                                                # bad 0, good 1
grep -c -e '^ *nix profile install' -r --include='README*' .                                                                          # bad 1, good 0

# C7 tag pin resolves (REL-07), real repo, cold fetch
set -o pipefail; nix flake metadata --no-write-lock-file --json github:sxyazi/yazi/<t> | jq -e '.original.ref == "<t>" and (.locked.rev | length) == 40'
#   v26.9.1 -> true, exit=0      v99.99.99 -> GitHub "status": "422", exit=4

# C8 release smoke from the tag (REL-16) — run-good reads Cargo.toml, run-bad carries a literal
nix run "git+file://$FX/<d>?ref=refs/tags/v1.2.3" -- --version 2>/dev/null | grep -F -w 1.2.3
#   run-good "reltool 1.2.3" exit=0      run-bad "reltool 1.2.2" exit=1

# C9 module option rename (REL-10e) — module-rename/{good,bad}.nix, nixpkgs lib at 8d5d2709
nix eval --impure --file $FX/module-rename/good.nix   # 3, exit=0  (mkRenamedOptionModule forwards old -> new)
nix eval --impure --file $FX/module-rename/bad.nix    # "The option `old' does not exist ... Did you mean `new'?", exit=1  (lib.warn wrapper)

# --- Revision (2026-09-27), on the post-nix-update state of the [w3] fixtures ---
# W3 = fixtures/verification-rerun-w3; every twin was bumped 0.2.14 -> 0.2.15 by
#   nix-update -F --version=0.2.15 --src-only flake-checker-probe   ([w3] R1-R5)

# C10 fetched URL contains the version (REL-13, authoritative)
test "$(nix eval --no-write-lock-file --json "path:$W3/<d>#packages.x86_64-linux.flake-checker-probe" \
  --apply 'p: let s = p.src.url; v = p.version; in builtins.stringLength s != builtins.stringLength (builtins.replaceStrings [ v ] [ "" ] s)')" = true
#   nix-update-probe-literal      rev = "v${finalAttrs.version}"  url …/v0.2.15.tar.gz            exit=0
#   nix-update-probe-tag-form     tag = "v${finalAttrs.version}"  url …/refs/tags/v0.2.15.tar.gz  exit=0
#   nix-update-probe-rev-literal  rev = "v0.2.14"                 url …/v0.2.14.tar.gz            exit=1
#   nix-update-probe-tag-literal  tag = "v0.2.14"                 url …/refs/tags/v0.2.14.tar.gz  exit=1

# C11 literal version-shaped ref (REL-13 pre-screen); widened from [w3]'s 'rev = "v[0-9]' to catch bare-semver tags
grep -rn -E -e '(rev|tag) = "v?[0-9]+\.[0-9]' --include='*.nix' .
#   W3 rev-literal 0 (hit)   W3 tag-literal 0 (hit)   FX/ref-grep/bad-bare 0 (hit: tag = "4.0.0"; [w3]'s grep misses it)
#   W3 literal 1             W3 tag-form 1            FX/ref-grep/good-hex 1 (40-hex rev, allowed by NIX-PKG-02)
# C11b leftover fake hash (REL-17)
grep -rn -e 'lib\.fakeHash' -e 'lib\.fakeSha256' -e 'lib\.fakeSha512' --include='*.nix' .
#   W3 nix-update-probe 0 ("package.nix:9: hash = lib.fakeHash;" after the bump)   W3 nix-update-probe-literal 1

# C12 the stale hash is real (REL-13 rationale): the rewritten hash matches the OLD release
nix build --rebuild --no-write-lock-file --no-link "path:$W3/nix-update-probe-rev-literal#packages.x86_64-linux.flake-checker-probe.src"
#   exit=0: hash sha256-MUbF2mOr… verifies v0.2.14's tarball while version evaluates to 0.2.15
```

Exemplar measurement for C11 (grep over the 38 clones, 2026-09-27): 794
literal version-shaped ref lines in `NixOS/nixpkgs`, 3 in
`numtide/llm-agents.nix`, 2 in `zed-industries/zed` and 2 in
`nix-community/home-manager`. Interpolated refs number 13,991 lines in
nixpkgs and 116 in llm-agents. The zed hits
(`zed-industries/zed@bda9c0bd43a8:default.nix:3`, `shell.nix:3`) are a
flake-compat pin, which is allowed. The llm-agents hit
`numtide/llm-agents.nix@efb10f28f724:packages/hermes-agent/package.nix:318-319`
pairs a literal `version` with a literal `tag` inside a dependency override,
which nix-update never drives. A grep hit therefore needs review, and C10
decides.

## Applied to the exemplars and the future consumers

**Already satisfied by exemplars.**
- REL-01 manifest read: `sxyazi/yazi@0ea4c5d9ef75:flake.nix:34-35` reads `./Cargo.toml`, not `${src}`.
- REL-04 fallback: the same file at `:32` uses `self.shortRev or self.dirtyShortRev or "dirty"`, which keeps the hash.
- REL-05 flake-compat: `cachix/git-hooks.nix@0d3997c4d325:flake.nix` and `NixOS/nix@209d2bc44288:flake.nix` cite `NixOS/flake-compat`.
- REL-07 tags: `ipetkov/crane`, `DeterminateSystems/flake-checker`, `stackbuilders/nixpkgs-terraform`, `sxyazi/yazi` and `direnv/direnv` tag `vX.Y.Z`. `nix-community/nix-index-database` uses bot timestamp tags, which is correct for a D flake whose lock revision is its version ([shape](nix-audit/exemplar-flake-shape.md) §10).
- REL-10(c) tree deprecation: `nix-community/nix-index-database@9ad722673ab3:flake.nix:49` wraps `hmModules.nix-index` in `lib.warn` ("renamed to `homeModules`"), and `:35` wraps the `legacyPackages` entries.
- REL-16 on a real pushed tag: `Mic92/nixpkgs-review` (clone `c8982ae494f6`) tags bare semver. `nix run github:Mic92/nixpkgs-review/4.0.0 -- --version` printed `nixpkgs-review 4.0.0` ([w3] R10). The repository sets no `mainProgram` in-tree, so the runnable default comes from `buildPythonApplication`'s `pname` ([w3] F7).
- REL-13 interpolated refs dominate where packages are bumped by tools: 13,991 interpolated ref lines in nixpkgs and 116 in `numtide/llm-agents.nix` (C11 measurement). *Correction to [w3]'s exemplar note:* `sxyazi/yazi` has **no** `rev = "v${finalAttrs.version}"`. Its `src` is local, and a grep for an interpolated ref over the yazi clone is empty.

**Violated by prominent exemplars.**
- **REL-02**: `sxyazi/yazi@0ea4c5d9ef75:flake.nix:36` appends `"pre${builtins.substring 0 8 date}_${rev}"` unconditionally. Measured live, `github:sxyazi/yazi/v26.9.1` builds version `26.9.1pre20260901_8dd895c` ([vt] run 6). This is the exemplar agents copy.
- **REL-09 / NIX-SEC**: `cachix/cachix@3349ce74ba77:README.md:90` tells users `nix profile install github:cachix/cachix/latest --accept-flake-config`, which is root-equivalent trust (NixOS/nix#9649) handed out in an install line. `numtide/llm-agents.nix@efb10f28f724:AGENTS.md:13` instructs **agents** to run `nix build --accept-flake-config`.
- **REL-09**: `oxalica/nil@205c8ba65a7f:README.md:31` gives `nix profile install` only, a deprecated alias that warns on CppNix ≥2.30.
- **REL-05**: `cachix/cachix@3349ce74ba77:default.nix:6` fetches `edolstra/flake-compat`. `numtide/treefmt@d68dddf6ac3a:flake.nix:14` cites `nix-community/flake-compat`, which that fork's README declares unmaintained.
- **REL-06 (fleet lens)**: `DeterminateSystems/flake-checker@cddc8afc9733:flake.nix:3,6,10,13` takes four FlakeHub inputs. `DeterminateSystems/nix-installer@76f61b5202e2:flake.nix:10,15` takes `…/*` wildcards, which move on every publish. `the-nix-way/dev-templates@6a7eefd8fd91:*/flake.nix:4` puts FlakeHub URLs into every template a user copies. These are legitimate for a FlakeHub vendor and forbidden for fleet flakes.
- **REL-07**: 10/37 repos have no tags at all (including `nix-darwin/nix-darwin`, which versions only in CHANGELOG prose), so consumers can pin nothing but a lock revision.

**New commitments for the fleet.**
- *ocx*: `package.nix` at the repository root. It reads `(lib.importTOML ./Cargo.toml).workspace.package.version` (today `0.6.3`) and packages two binaries from one flake and one tag.
  - `ocx_cli/build.rs` bakes `VERGEN_*` git provenance on a best-effort basis (its own header, `crates/ocx_cli/build.rs:6-24`). The flake passes no git env, so `ocx version` in a Nix build omits the SHA (REL-03). The `version` field still equals the tag.
- *grimoire*: reads `.package.version` (today `0.14.2`).
- *ocx-sdk-python*: reads `.project.version` (static, `0.2.0`).
- *Correction to the fleet-builders dive*: its literals `version = "0.14.2";` and `version = "0.2.0";` ([fleet-builders](nix-packaging/fleet-builders.md) §2, §8) violate REL-01 and must be replaced when the skills are authored.
- *setup-ocx*: an Action, not a Nix consumer product, so no install block. At most a devShell.
- *All four repos*: CI adds REL-01's manifest check on every commit, and the release workflow adds REL-08 and REL-16 after cargo-dist tags. No FlakeHub (REL-06). No `nixConfig` (REL-15).
- *nixpkgs copies (when owner Q3 flips)*: `src = fetchFromGitHub { tag = "v${finalAttrs.version}"; hash = "sha256-…"; }` with a literal hash, so that `nix-update-script` and r-ryantm bumps move the source (REL-13, REL-17). The in-repo flakes read `src` from the tree and are unaffected.
- *ocx-index generated flake (D)*: it has no tags, because the lock revision is the version (REL-07). Its README uses the REL-09 block pointing at `packages.<system>.<ns>-<pkg>`. It deprecates through NIX-GEN-18's `lib.warn`, which is REL-10(a). Any gate that makes warnings fatal is scoped per REL-11, so NIX-GEN-14's `abort-on-warn` runs over named current packages, never over `legacyPackages` versions that carry deprecation warnings.

## AI-agent failure modes

Ranked by how often each would bite on a fleet flake.

1. **Copying yazi's version formula.** The agent writes `fromTOML(...).version + "pre${date}_${rev}"`, or "adds the git SHA for traceability". Check: REL-02's `git describe` comparison at the tag, and REL-01's manifest comparison on every commit.
2. **Writing the version as a literal "to keep it simple"**, as the fleet-builders dive itself did. Check: the REL-01 command.
3. **Treating a tag as knowable from inside the flake**, for example `if self ? ref`. No such attribute exists (C2). Check: the REL-02 command, plus reading for `self.ref` or `self.tag`.
4. **`nix profile add` alone, or `nix profile install` alone, in a README.** Neither works everywhere (C3). Check: the REL-09 greps.
5. **Wrapping a deprecation in `lib.warn` and then adding `--option abort-on-warn true` to the CI check "to make deprecations visible"**, then "verifying" with `nix flake show`, which exits 0. Check: `grep -rn -e 'abort-on-warn' .github/workflows` must show attribute-scoped lines only (REL-11).
6. **Deleting an output outright on rename.** Check: diff the output keys with `nix flake show --json . | jq 'paths(scalars)'` between the previous tag and HEAD. A key that vanished without a release behind REL-10's warning is a finding.
7. **`self.shortRev or "dirty"`**, from older templates. Check: the REL-04 grep.
8. **Citing `edolstra/flake-compat`**, because older posts use it and the redirect hides the mistake. Check: the REL-05 grep.
9. **Passing or advertising `--accept-flake-config`**, which an exemplar's own `AGENTS.md` does. Check: `grep -rn -e 'accept-flake-config' .`; every hit must be a warning against it (map Q13).
10. **Trusting the `git diff` after `nix-update -F`.** With a literal `rev`/`tag`, both `version` and the hash change, and the hash is the old release's ([w3] F3). A diff that touches more than `version` proves nothing. Check: REL-13's C10 eval (the fetched URL contains the version), pre-screened by the C11 grep.
11. **Debugging `self` with `nix eval --json`** and getting only a store path, because an attrset with `outPath` collapses to that string ([vt] run 3). Check: select single fields (`#x.rev`). This one goes to the nix-diagnose catalogue.
12. **Writing `hash = lib.fakeHash;` and expecting `nix-update` to fill it in.** It never does, and the command exits 0 ([w3] F2). This is the same "the hash will be discovered" habit NIX-PKG-03 teaches for hand edits, applied to the wrong tool. Check: the REL-17 grep after every run.
13. **Reading `error (ignored): … cannot rename: Permission denied` as a fatal toolchain failure** in a nested sandbox. Nix already ignored it, and the `got:` line follows ([w3] F1). Check: look for `hash mismatch … got:` before declaring a run blocked.
14. **Claiming Determinate Nix support from a nixpkgs attribute.** No such attribute exists ([w3] F8). Check: REL-12's wording says "untested".

## Open questions

**Owner decisions (defaults the program applies).**
- Q1 FlakeHub. Default: no, as input or target. REL-06 is MUST under this default.
- Q2 public binary cache. Default: none. REL-15 applies if this changes.
- Q3 upstream to nixpkgs. Default: after each CLI's first stable release, outside this program. REL-14 stays CONSIDER until then.
- **New — git SHA in `ocx version` for Nix builds.** Default: omitted. REL-03 keeps drvPaths stable, and `version` still equals the tag. Flipping it costs a rebuild on every commit for every consumer who builds from source.

**Subareas that need another round.**
- **release/nix-update-cargohash**: does `nix-update -F` without `--src-only` write back a `cargoHash` primed with `lib.fakeHash`, and a real old `cargoHash` given as literal text? The code reading says the first fails and the second works, because both go through the same `replace_hash`. Only the `src` hash was run ([w3] R1-R5). All three fleet CLIs carry a dependency hash, so this sets whether REL-17 covers `cargoHash` by measurement or only by reading.
- **packaging/fleet-provenance**: does ocx's `vergen` build timestamp respect `SOURCE_DATE_EPOCH` under the Nix sandbox, so that REL-03's "no churn" also holds for output hashes? This is a NIX-PKG question.
- **release/flakehub-rolling** (only if Q1 flips): prototype a tagged-only `flakehub-push` and confirm on a live FlakeHub project that a tag ≥0.2.0 shadows rolling releases.

## Sub-artifacts

- [nix-release/versioning-and-tags.md](nix-release/versioning-and-tags.md): version source, the `self` metadata matrix per ref type and tree state, drvPath churn, tag pins, FlakeHub mechanics, lock order, nix-update, the RFC 136 promise.
- [nix-release/publishing-and-consumer-ux.md](nix-release/publishing-and-consumer-ux.md): README install template and hint re-classification, flake-compat sources, the deprecation firing matrix, `abort-on-warn`, cache stance, the nixpkgs upstreaming checklist, and draft procedures for `nix-flake-adopt` and `nix-flake-release`. *Stale in the procedures:* step 7 of `nix-flake-release` cites "`NIX-REL-02`" in the dive's own numbering, which is REL-09/REL-16 here.
- [nix-release/verification-rerun-w3.md](nix-release/verification-rerun-w3.md): the `nix-update` write-back mechanism (`replace_hash`), the silent stale-hash defect of literal refs, the `tag` form, the 2.31.5 and Lix 2.95.2 matrix for REL-05/09/16, REL-16 on a pushed `github:` tag, and the Determinate Nix gap. *Superseded in it:* its REL-13 grep (`rev = "v[0-9]`) misses bare-semver tags, and C11 widens it. Its yazi exemplar note is wrong (see Applied).

## Conflicts resolved

1. **Suffix at a tagged commit.** [vt] candidate 6 allowed a suffix except at a tag. yazi applies one unconditionally. **Resolved: never add a suffix.** C2 measured that `self` carries no tag or ref, so the conditional form cannot be written.
2. **Where the revision goes.** Map conflict 8 said "env var, accepting a rebuild". [vt] §3 measured that the env var churns the drvPath just as `version` does. **Resolved: the default package reads no revision** (REL-03). The env-var route stays only as a knowing opt-in.
3. **`abort-on-warn`.** The map's wave-4 amendment and NIX-GEN-14 use it as a check. [pub] NIX-REL-07 bans it from CI. **Resolved: it is allowed only on named current attributes, never on a whole-flake check or build.** C4: scoped eval was green with a shim present, and the whole-flake check was red.
4. **`nix profile add` vs `install`.** [pub] NIX-REL-02 said never `install`. C3 measured that Lix 2.95.2 rejects `add`, while CppNix 2.35.2 accepts `install` with a warning. **Resolved: `add` is primary, with an `install` fallback comment.**
5. **flake-compat source.** Map conflict 10 treated this as a live choice, and the shape audit §8 called `nix-community/flake-compat` "actively maintained". The fork's own README, re-fetched 2026-09-27, says "no-longer maintained". **Resolved: `NixOS/flake-compat` only.**
6. **Version literals in the fleet-builders dive** (`version = "0.14.2"`, `"0.2.0"`) against the versioning rule. **Resolved: REL-01 wins for the in-repo flake.** A literal belongs only in the nixpkgs copy (REL-14).
7. **"The nixpkgs submission is a copy"** (map conflict 13, NIX-PKG-06) against an in-repo `package.nix` that reads its manifest with `src = ./.`. **Resolved: it is a copy plus a three-attribute swap** (`version`, `src`, dependency hash). `package.nix` sits at the root so that PKG-06's no-`../` check holds.
8. **Lock order at release** was only a reading heuristic in [vt] candidate 8. **Resolved: it is mechanical** (`git diff --quiet vX.Y.Z~1 vX.Y.Z -- flake.lock`, C5) and stays SHOULD.
9. **README gap counts**: 20 in the shape audit's prose against 17 in its table. **Resolved: the table (17) is the ground truth.** Most of those READMEs are correctly hint-less for their shape ([pub] §1).
10. **The `follows` line in the README snippet.** [pub]'s verified consumer used `follows`, while NIX-INP decides `follows` by how the input is consumed. **Resolved: the snippet has no `follows` by default,** plus an optional line that states the trade-off.
11. **[vt] run 7 against [w3] R3: what does `nix-update` do with a literal ref?** [vt] saw only `version` change. [w3] saw `version` and the hash change, with the hash belonging to the stale source. **Resolved: both are right, and the difference is the hash line.** [vt]'s literal twin carried the `lib.fakeHash` symbol, which `replace_hash` never matches (F2), so its hash could not change. [w3]'s twin carried literal SRI text, so its hash was replaced. The dangerous case is the realistic one, because a package already in use carries a real literal hash.
12. **REL-13 severity (SHOULD in the consolidation, MUST proposed by [w3]).** **Resolved: MUST.** The failure ships wrong bytes under a correct-looking version, with exit 0 and a passing build. The replacement verification (C10) was watched red and green. The consolidation's reason for SHOULD ("the write-back is environment-blocked") was a misdiagnosis (F1).
13. **Map E24: REL-13's `rev` example against NIX-PKG-02's `tag`.** **Resolved as the map directed:** REL-13 keeps the interpolation requirement, its example becomes `tag = "v${finalAttrs.version}"`, and `tag` measured identically to `rev` ([w3] R4/R5, C10). PKG-02 keeps the choice between `tag` and `rev`.
14. **[w3]'s REL-13 grep (`rev = "v[0-9]` / `tag = "v[0-9]`) against the corpus's bare-semver tags** (`Mic92/nixpkgs-review` tags `4.0.0`). **Resolved: widened** to `grep -E -e '(rev|tag) = "v?[0-9]+\.[0-9]'`, watched red on `ref-grep/bad-bare` and green on a 40-hex `rev`. It is demoted to a pre-screen because allowed third-party pins also match it. The C10 eval is authoritative.
15. **Map E10: NIX-PKG citations.** REL-01, REL-14, Verdict 8 and the Dropped list cited PKG-01 (fetchers) for the by-name `package.nix`, and PKG-13 (`versionCheckHook`) for `updateScript`. **Resolved: they now cite PKG-06, and REL-14 owns `updateScript` itself.**
16. **REL-17 against NIX-PKG-04 ("reset `hash` to `lib.fakeHash` whenever you change a fetcher argument").** **Resolved: no contradiction, only a seam.** PKG-04 governs a human edit, where the next build prints `got:`. REL-17 governs a `nix-update` run, where the tool edits the arguments and needs the old literal hash to replace. REL-17 cites PKG-04 and PKG-03, and neither rule changes.

## Key sources

- https://raw.githubusercontent.com/NixOS/nix/2.35.2/src/nix/flake.md — `self` and input metadata at 2.35.2; `revCount` is absent for `github:`
- https://github.com/NixOS/nixpkgs/blob/master/pkgs/README.md#versioning — versions start with a digit; `-unstable-YYYY-MM-DD`; commit grammar
- https://raw.githubusercontent.com/NixOS/rfcs/master/rfcs/0136-stabilize-incrementally.md — flakes may break until stabilized
- https://docs.determinate.systems/flakehub/concepts/semver/ — highest-semver resolution; the rolling `0.1.<n>` scheme
- https://github.com/imTHAI/nix-packages/blob/master/.github/workflows/flakehub-publish-auto.yml — first-party account of rolling releases shadowed by a tag
- https://raw.githubusercontent.com/NixOS/flake-compat/master/README.md — the canonical non-flake bridge
- https://raw.githubusercontent.com/nix-community/flake-compat/master/README.md — "This fork is no-longer maintained"
- https://nix.dev/concepts/flakes.html — flake-compat named as the bridge for non-flake users
- https://raw.githubusercontent.com/NixOS/nixpkgs/7e35f59c1f8277732ccd2cff8f79a4617590ce33/lib/derivations.nix — `warnOnInstantiate` (line 254)
- https://raw.githubusercontent.com/NixOS/nixpkgs/7e35f59c1f8277732ccd2cff8f79a4617590ce33/lib/modules.nix — `mkRenamedOptionModule` and `mkRemovedOptionModule`
- https://raw.githubusercontent.com/NixOS/nix/2.35-maintenance/src/libexpr/primops.cc — `builtins.warn` and `abort-on-warn` semantics
- https://raw.githubusercontent.com/NixOS/nixpkgs/7e35f59c1f8277732ccd2cff8f79a4617590ce33/pkgs/by-name/README.md — only by-name PRs auto-merge (line 81)
- https://raw.githubusercontent.com/nix-community/nixpkgs-update/main/doc/nixpkgs-maintainer-faq.md — r-ryantm's silent skip conditions and the opt-out comment
- https://nix.dev/guides/recipes/add-binary-cache.html — a cache is a trust boundary
- https://github.com/Mic92/nix-update/blob/v1.16.0/nix_update/dependency_hashes.py#L24-L30 — `replace_hash`, a text substitution over the evaluated old hash (REL-17)
- https://raw.githubusercontent.com/NixOS/nixpkgs/7e35f59c1f8277732ccd2cff8f79a4617590ce33/doc/build-helpers/fetchers.chapter.md — `tag` preferred over `rev` for a real tag (lines 770, 866)
- https://docs.lix.systems/manual/lix/stable/command-ref/new-cli/nix3-profile-install.html — Lix documents `nix profile install` and no `add`
- https://docs.determinate.systems/determinate-nix/ — Determinate Nix ships through its own installer, not nixpkgs (the Verdict 7 gap)

## Revision log

- 2026-09-27: **NIX-REL-13** severity SHOULD → **MUST**. Text changed: literal refs are banned and the `tag` example is used (E24). Its verification is **replaced**, because the old "`git diff` shows the hash changed too" passed on the violation ([w3] R3). The authoritative check is now C10 (the fetched URL contains the version), with the C11 grep as a pre-screen. The rationale is corrected from "rewrites only `version`" to "silently pairs the new version with the old source's hash".
- 2026-09-27: **NIX-REL-17** added (SHOULD). Prime `nix-update` with a literal SRI hash, never the `lib.fakeHash` symbol, and grep for leftover fake hashes after every run ([w3] F1/F2, C11b). This answers the open question "release/nix-update-writeback": the cause is `replace_hash`, not nested bwrap.
- 2026-09-27: **NIX-REL-05**, **NIX-REL-09**, **NIX-REL-16**: evidence and floor columns extended to CppNix 2.31.5 and Lix 2.95.2 ([w3] R7-R9). No wording change beyond REL-05's note about the `NIX_PATH` stderr line. This answers the open question "consumer-ux/implementation-matrix".
- 2026-09-27: **NIX-REL-16**: generalised from `vX.Y.Z` to `<tag>`/`<version>` (bare-semver tags exist), `--no-write-lock-file` added, and evidence added for a real pushed `github:` tag ([w3] R10).
- 2026-09-27: **NIX-REL-12** and Verdict 7: Determinate Nix recorded as a documented gap (not in nixpkgs, untested by construction, [w3] F8/R11) and removed from Open questions.
- 2026-09-27: **NIX-REL-01**, **NIX-REL-14**, Verdict 8 and the Dropped list: NIX-PKG citations corrected (PKG-01 → PKG-06; PKG-13 removed from `updateScript`) per map E10. The meanings are unchanged.
- 2026-09-27: Verdict 9 added (the `nix-update` contract). The shape binding gains 13 and 17. AI failure mode 10 is rewritten, and 12-14 are added. Conflicts 11-16, runs C10-C12 and the fixture `fixtures/nix-release/ref-grep/{bad-bare,good-hex}` are added. A new open question, "release/nix-update-cargohash", records the one path that was only read, not run.
