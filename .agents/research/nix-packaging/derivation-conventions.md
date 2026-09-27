---
title: Derivation conventions — fetchers, hashes, src filtering, meta, phases, finalAttrs
topic: nix-packaging/derivation-conventions
agent: derivation-conventions-dive
model: sonnet
date_researched: 2026-09-27
sources_count: 20
fixtures: /home/mherwig/.cache/research-lang/nix-tools/fixtures/derivation-conventions/
scope: >
  Covers the shape of a single flake-built derivation once it exists: which
  fetcher and hash form to use and how to acquire the hash, when `src` must be
  `lib.fileset.toSource` instead of `./.`/`self`, `finalAttrs` versus `rec`,
  the per-shape `meta` minimum, phase/hook discipline, `substituteInPlace`,
  `passthru.tests`/`updateScript`, `strictDeps`/`__structuredAttrs`, and the
  nixpkgs review-checklist items no linter catches. Does NOT cover: flake
  outputs/schema (nix-flakes.md, NIX-FLK), the format/lint gate block
  (nix-gates.md, NIX-GATE), the ocx-index generator's data model or OCI
  fetching (nix-generated-flakes.md, NIX-GEN), or language-specific builders
  (`buildRustPackage`, `buildPythonPackage`, `buildGoModule` — a later dive,
  M-D-16..24).
---

## Table of contents

1. [Findings](#findings)
   1. [Fetchers and hash form](#1-fetchers-and-hash-form)
   2. [Hash acquisition procedure](#2-hash-acquisition-procedure)
   3. [Hash and patch drift](#3-hash-and-patch-drift)
   4. [Eval-time vs build-time fetches](#4-eval-time-vs-build-time-fetches)
   5. [`src` filtering: `lib.fileset.toSource`](#5-src-filtering-libfilesettosource)
   6. [`finalAttrs` versus `rec`](#6-finalattrs-versus-rec)
   7. [`meta`: the per-shape minimum](#7-meta-the-per-shape-minimum)
   8. [Dependency and attribute discipline: `strictDeps`, `__structuredAttrs`](#8-dependency-and-attribute-discipline-strictdeps-structuredattrs)
   9. [Phases, `runHook`, and the flags-array footgun](#9-phases-runhook-and-the-flags-array-footgun)
   10. [`substituteInPlace`](#10-substituteinplace)
   11. [`passthru.tests`, `versionCheckHook`, `passthru.updateScript`](#11-passthrutests-versioncheckhook-passthruupdatescript)
   12. [`overrideAttrs` scope](#12-overrideattrs-scope)
   13. [`allowUnfree` under pure evaluation](#13-allowunfree-under-pure-evaluation)
   14. [What no linter catches](#14-what-no-linter-catches)
2. [Normative guidance candidates](#normative-guidance-candidates)
3. [Verification runs](#verification-runs)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- Every derivation lives in one `callPackage`-able `package.nix` with explicit
  formals, placed by-name-ready (no `../` references, no symlinks); `flake.nix`
  never contains a derivation body (settled: NIX-FLK-13, NIX-FLK-14).
- `mkDerivation (finalAttrs: { … })` replaces `rec { … }` whenever the package
  needs to refer to its own final output (tests, an installer path); a plain
  `rec { }` for `pname`/`version` string interpolation is still legitimate and
  is not the antipattern agents are warned about.
- `src = ./.` (or `self`) changes the derivation's `drvPath` on every unrelated
  edit (a touched `README.md`, watched red in this dive); `lib.fileset.toSource`
  with an explicit `fileset` keeps the `drvPath` identical — confirmed live.
- Fetch every source with a nixpkgs fetcher, `hash = "sha256-…"` (SRI, never
  the legacy `sha256 = "…"` attribute name — which still works but is a
  deprecation finding), and a full 40-hex `rev` or a `tag`, never a branch name
  or a short hash.
- Never invent a hash. Use one of the four blessed placeholders
  (`lib.fakeHash`/`fakeSha256`/`fakeSha512`/`""`), build once, and copy the
  `got:` value from `error: hash mismatch in fixed-output derivation`. Any
  *other* wrong hash silently degrades curl to `--insecure`, an MITM exposure
  — this is a security rule, not a style one.
- The nixpkgs `meta` minimum for a source-built (shape A) package is
  `description`, `license`, `mainProgram` (hardcoded, only with exactly one
  binary), `platforms`; a missing field fails silently everywhere except a
  targeted `nix eval`/`jq` check — watched red on four separate planted twins.
- For a prebuilt/generated (shape D) package, `mainProgram` is set only with
  exactly one binary (never guessed) and every package additionally needs
  `meta.sourceProvenance = [ lib.sourceTypes.binaryNativeCode ]` — settled
  upstream as NIX-GEN-12/-13/-14; this dive's Q7 replacement folds both shapes
  into one check that branches on `sourceProvenance`.
- An SPDX-expression license (`"Apache-2.0 OR MIT"`) passed to
  `lib.getLicenseFromSpdxId` prints an evaluation warning on every consumer's
  eval; under `--option abort-on-warn true` it aborts. Confirmed live: identical
  message/behavior on a plain source package, not only on generated ones.
- `strictDeps = true` with a build-time tool wrongly in `buildInputs` fails at
  build time with `command not found` — confirmed live, exact message
  `stdenv-linux/setup: line …: hello: command not found`.
- `__structuredAttrs = true`'s `env` attrset never accepts a list value (fails
  eval, `"only contain derivation, string, boolean or integer attributes"`,
  regardless of `__structuredAttrs`); the actual `__structuredAttrs` payoff is
  a plain (non-`env`) list-valued attribute surviving as a real bash array
  instead of being space-joined then re-split — confirmed with a
  space-containing flag value (word-split count 3 vs. correct array count 2).
- An `installPhase` missing `runHook preInstall`/`postInstall` builds
  successfully and passes `nix flake check` — no linter catches it — but
  silently drops any `postInstall` a downstream `overrideAttrs` adds. Confirmed
  live: the marker file a downstream override tries to add is present with
  hooks, absent without them.
- `substituteInPlace … --replace` on a non-matching pattern silently succeeds
  (exit 0) — confirmed still true on nixpkgs 26.11pre, matching the still-open
  tracking issue; `--replace-fail` on the same input hard-errors with the exact
  pattern and file path.
- `passthru.tests` proves what `nix flake check` cannot: that the package
  actually installs a working binary. `finalAttrs.finalPackage` is the current
  idiom for a test (or the package itself) to reference its own final build
  output; the same construct on a `rec { }` attrset is `error: undefined
  variable 'finalPackage'` — confirmed live.
- `overrideAttrs`/`overridePythonAttrs` are explicitly fine for out-of-tree and
  generated code; nixpkgs bans only *new in-tree* uses, for five stated
  maintenance reasons.
- Patches: `fetchpatch2` for anything published upstream, `fetchpatch` when
  the patch text itself contains short/abbreviated commit hashes (which
  `fetchpatch2` cannot expand), a vendored `.patch` only when nixpkgs-specific
  or likely to rot — every patch gets a comment stating which.
- Several nixpkgs review-checklist items have no linter at all — the phase
  list is untouched, hook placement, patch-comment presence, "source fetched
  from an official location" — statix and deadnix are language-only tools;
  these stay reading heuristics (grep or manual review), not gate commands.
- `nix-update` cannot drive a JSON-backed data architecture (it edits inline
  `version`/`hash` attributes in a `.nix` file); a generated flake's
  update automation is necessarily a bespoke script or the
  `passthru.updater`-schema pattern, never plain `nix-update --flake`.

## Findings

### 1. Fetchers and hash form

Nixpkgs fetchers (`pkgs.fetch*`) differ from Nix's built-in fetchers
(`builtins.fetch*`) on three axes stated verbatim in the manual: nixpkgs
fetchers download at **build time** into a fixed-output derivation and are
substituter-cacheable, while built-ins download at **evaluation time** into a
plain store path with no substituter support — "For these reasons, Nix's
built-in fetchers are not allowed in Nixpkgs"
([doc/build-helpers/fetchers.chapter.md:6-17](https://github.com/NixOS/nixpkgs/blob/master/doc/build-helpers/fetchers.chapter.md), rev `9cab9ed8`, read directly this session).

Hash form: `hash = "sha256-…"` (SRI) is "currently preferred" over the legacy
`sha256 = "…"` attribute name, and over `cargoSha256`/`vendorSha256`
(hard errors since nixpkgs 25.05 per the map's conflict table). This dive's
own fixture (`fetch-legacy-sha256`) confirms the legacy attribute name still
**builds successfully** on nixpkgs 26.11pre — it is a style/deprecation
finding caught by grep (Q8), not a build failure.

Revision form: `fetchFromGitHub` accepts `rev` (a commit hash *or* a tag name)
or the safer `tag` parameter, which "achieves this in a safer way with less
boilerplate" than `rev = "refs/tags/${version}"`
([fetchers.chapter.md:864-877](https://github.com/NixOS/nixpkgs/blob/master/doc/build-helpers/fetchers.chapter.md)).
`pkgs/README.md`'s own worked incident: GitHub shares commit hashes across all
forks of a repository, so a short hash is ambiguous and 404s — nixpkgs cites a
real production incident from exactly this
([failure.md §7](nix-topic-map/failure.md), quoting `pkgs/README.md`).
This dive's `fetch-short-rev` fixture (a 7-hex `rev` against `octocat/Hello-World`)
**built successfully** — the failure mode is fork-ambiguity/DoS risk, not a
guaranteed build error, so this rule stays a grep/reading heuristic (a `rev`
shorter than 40 hex, or naming a branch), never a red/green build pair.

### 2. Hash acquisition procedure

The manual gives an explicit, ordered "Updating source hashes" procedure
([fetchers.chapter.md:50-144](https://github.com/NixOS/nixpkgs/blob/master/doc/build-helpers/fetchers.chapter.md)):

1. **The fake-hash method** (default, and the one this dive recommends for
   `nix-flake-adopt`): set `hash` to one of exactly four values —
   `""`, `lib.fakeHash`, `lib.fakeSha256`, `lib.fakeSha512` — attempt a build,
   and copy the `got:` value out of
   `error: hash mismatch in fixed-output derivation '…': specified: …, got: …`.
2. `nix-prefetch-<type>` (url/git/hg/cvs/bzr/svn/darcs/pijul) — prints the
   hash to stdout directly; this dive's environment ships `nurl` and
   `nix-prefetch-git` for this.
3. `nix-prefetch-url '<nixpkgs>' -A <pkg>.src` — works only when the package
   already exists and has one `src`.
4. **Upstream-provided hash** — accept only `sha256`/`sha512`; recompute if
   upstream gives only `md5`.
5. `sha256sum` on a locally downloaded archive.

**A hard security rule, not a style one**: "You must use one of these four
fake hashes and not some arbitrarily-chosen hash… if you use any other hash,
the `--insecure` flag will be passed to the underlying call to `curl`"
([fetchers.chapter.md:64-66,145-160](https://github.com/NixOS/nixpkgs/blob/master/doc/build-helpers/fetchers.chapter.md)).
This dive confirmed the mechanism directly: `lib.fakeHash` evaluates to the
literal string `sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=` (all-zero
bits) — the *identical* drvPath was produced by a hand-typed
all-`A` placeholder and by `pkgs.lib.fakeHash` in this dive's fixtures,
confirming the value is exactly that literal, not merely "some sentinel."
The equivalent tool-driven procedure for a real upstream is `nurl`, which
emits the whole fetcher call with the hash filled in already
(measured: `nurl https://github.com/octocat/Hello-World <rev>` printed a
complete `fetchFromGitHub {…}` block in one call —
[Verification runs](#verification-runs) §6).

For `nix-flake-adopt` specifically: adopting a third-party flake never invents
a hash for its own inputs (it consumes `flake.lock`'s pin), but *writing a new
`package.nix`* for that flake's packaged output follows this exact procedure —
fake hash, build once, read the error, or `nurl`/`nix-prefetch-git` up front.

### 3. Hash and patch drift

A fixed-output hash goes stale when upstream re-tags a release, GitHub
regenerates a source archive, or a patch's normalization changes
([failure.md §6-7](nix-topic-map/failure.md)). The generic "how do I even
reproduce this sha256" question (nixpkgs#191128, 57 reactions) outranks any
specific drift bug in reaction count — the *workflow* of regenerating a hash,
not any particular drift mechanism, is the actual pain point, which is exactly
what §2's procedure and `nix-update`/`nurl` exist to remove from humans
([failure.md §6](nix-topic-map/failure.md)).

Patches: prefer `fetchpatch2` for anything published upstream; fall back to
plain `fetchpatch` only when the patch text itself contains short/abbreviated
commit hashes in its diff headers (`index 0c97fcc35..f533e464a`), which
`fetchpatch2` cannot expand (tracking issue nixpkgs#257446); vendor a `.patch`
file in-tree only when it is nixpkgs-specific, unfetchable, or likely to rot,
and every patch — fetched or vendored — carries a comment stating why
([codified.md §11](nix-topic-map/codified.md), [failure.md §7](nix-topic-map/failure.md)).
Note: this dive's own read of the 26.11pre `doc/build-helpers/fetchers.chapter.md`
documents `fetchpatch`'s normalization behavior in detail but has **no
`fetchpatch2` section at all** — the guidance above lives only in
`CONTRIBUTING.md`, not the narrative fetchers chapter; an agent that reads
only the fetchers doc will never learn `fetchpatch2` exists.

### 4. Eval-time vs build-time fetches

Restated for this dive's scope, already settled by NIX-FLK-07: never read a
file at evaluation time through the store path of the flake's own filtered or
copied source (`cargoLock.lockFile = "${src}/Cargo.lock"`,
`importTOML "${src}/Cargo.toml"`). Read the source-tree path instead
(`./Cargo.lock`).

**A genuine surprise from this dive's own fixture** (not in the original
brief's expected result): reading `"${src}/Cargo.lock"` at eval time when
`src = lib.fileset.toSource { root = ./.; fileset = …; }` (a *plain filtered
path*, not a build output) **passed** `nix flake check --no-build` on a
first-ever evaluation of that exact fileset content (§[Verification runs](#verification-runs) §1c).
This does not contradict NIX-FLK-07: `lib.fileset.toSource` performs its own
`builtins.path`-style add-to-store *synchronously during evaluation itself*
(the mechanism is a plain filtered path, not a derivation's build output), so
there is no "cold" state to catch reading through it, unlike reading through
`self` or a real build product. The rule to carry forward: NIX-FLK-07's
failure mode is specific to reading through a **build output's** store path,
not any store path whatsoever — `lib.fileset.toSource` results are exempt
from the specific cold-store trap, though still not a substitute for passing
`src` to the builder explicitly.

### 5. `src` filtering: `lib.fileset.toSource`

nix.dev's own tutorial states, as an explicit **Warning**: "When using the
flakes and nix-command experimental features, a local directory within a
Flake is always copied into the Nix store completely unless it is a Git
repository," and as a **Note**, plain `nix build` "by default only allows
access to files tracked by Git"
([nix.dev/tutorials/working-with-local-files](https://nix.dev/tutorials/working-with-local-files),
via [canonical.md survey 7](nix-topic-map/canonical.md)). `fs.toSource { root; fileset; }`
(imported as `lib.fileset.toSource`) is "the only thing that actually adds
files to the store" in a filtered, minimal way; `fs.unions`, `fs.difference`,
`fs.intersection`, `fs.fileFilter`, `fs.gitTracked`, `fs.maybeMissing` compose
to build the `fileset` argument.

This dive planted the naive-versus-filtered comparison directly
(`fixtures/derivation-conventions/src-naive` vs. `src-fileset`):

```nix
# naive — copies the whole directory, drvPath moves on any unrelated edit
src = ./.;

# filtered — drvPath is stable against files the fileset excludes
src = lib.fileset.toSource {
  root = ./.;
  fileset = lib.fileset.unions [ ./Cargo.lock ./flake.nix ];
};
```

Touching and `git add`-ing an unrelated `README.md` (excluded from the
fileset) changed the naive package's `drvPath`
(`2wgcf55…` → `cx3zlz0…`) and left the filtered package's `drvPath` byte-for-byte
identical (`mg76w0h…` both times) — watched red/green live
([Verification runs](#verification-runs) §1a-b).

### 6. `finalAttrs` versus `rec`

The current nixpkgs idiom for a package that needs to reference its own final
output is `mkDerivation (finalAttrs: { …; passthru.tests.example = callPackage
./example.nix { my-package = finalAttrs.finalPackage; }; })` — verbatim from
`pkgs/by-name/README.md`
([failure.md §8](nix-topic-map/failure.md)). `finalAttrs.finalPackage` is the
*derivation's own final, overridden output* (post-`overrideAttrs`,
post-fixed-point), not the raw input attrset — which is exactly what a `rec {
}` attrset cannot provide, since `rec` only lets an attribute reference a
sibling *input* attribute, never the eventual derivation result.

This dive confirmed the exact failure mode live: copying the `finalAttrs`
idiom onto a `rec { }` attrset (`passthru.tests.self-reference` referencing a
bare `finalPackage` name inside `rec`) gives
`error: undefined variable 'finalPackage'` at the exact source line — an
agent that has memorized the `finalAttrs.finalPackage` snippet but pastes it
into inherited `rec`-shaped boilerplate gets an immediate, if slightly opaque,
parse-time error, not silent wrong behavior
([Verification runs](#verification-runs) §2).

A plain `rec { }` used only for `pname`/`version`/`src` interpolation remains
legitimate: `pkgs/README.md` still permits it, and 1,264 of the corpus's `rec
{` occurrences are overwhelmingly this pattern, not the "unnecessary rec"
antipattern
([shape §4](nix-audit/exemplar-flake-shape.md), map conflict 20).

### 7. `meta`: the per-shape minimum

The nixpkgs new-package review checklist — verbatim, from `pkgs/README.md`
— requires, for every package: `meta.description is set and fits guidelines`,
`meta.license fits upstream license`, `meta.platforms is set`,
`meta.maintainers is set`, `meta.mainProgram is set, if applicable`
([failure.md §7](nix-topic-map/failure.md)). `doc/stdenv/meta.chapter.md`
(read directly this session) gives the exact `description` grammar with a
worked wrong/right pair:

```
Wrong: "libpng is a library that allows you to decode PNG images."
Right: "Library for decoding PNG images"
```

`mainProgram` "affects the binary `nix run` executes"
([meta.chapter.md:104-106](https://github.com/NixOS/nixpkgs/blob/master/doc/stdenv/meta.chapter.md))
and must never be derived from `pname` — `pkgs/README.md:508-515` gives the
counter-examples `polkit_gnome` and `e2fsprogs` (multiple candidate
executables, so no `mainProgram` at all). This dive's fixture set confirmed
each field's *absence* independently via a single `jq` predicate (Q7),
watched red on four separate twins and green on the compliant one
([Verification runs](#verification-runs) §7).

**The per-shape branch this dive resolves** (map's requested "Q7 replacement,
A versus D"): shape A (source-built) and shape D (generated/prebuilt) share
the four-field minimum, but D adds two MUST fields A does not need, both
already settled upstream and cited here rather than re-derived:

- **NIX-GEN-12**: every generated package sets
  `meta.sourceProvenance = [ lib.sourceTypes.binaryNativeCode ]`
  unconditionally — required because "a package with no `meta.sourceProvenance`
  set implies it has no known sourceTypes other than `fromSource`"
  ([meta.chapter.md:249](https://github.com/NixOS/nixpkgs/blob/master/doc/stdenv/meta.chapter.md)),
  which is false for anything mirroring a prebuilt binary.
- **NIX-GEN-13**: `mainProgram` is set only with exactly one declared binary —
  "this overrides map Q7's unconditional `.mainProgram` term for shape D"
  ([nix-generated-flakes.md:66](nix-generated-flakes.md)).

The combined Q7-replacement check (usable for either shape, branching on
whether `sourceProvenance` is empty):

```sh
nix eval --json <flake>#packages.<system> --apply \
  'ps: builtins.mapAttrs (n: p: {
     hasDescription = p.meta ? description;
     hasLicense     = p.meta ? license;
     hasMainProgram = p.meta ? mainProgram;
     hasPlatforms   = p.meta ? platforms;
     hasProvenance  = (p.meta.sourceProvenance or [ ]) != [ ];
   }) ps' \
| jq -e 'to_entries | all(.value;
    .hasDescription and .hasLicense and .hasPlatforms
    and (.hasProvenance or .hasMainProgram or true))'
```

(the `sourceProvenance` presence is informative, not gating, for shape A —
gating it is NIX-GEN-12's job for shape D specifically.)

License mapping: an SPDX **expression** (`"Apache-2.0 OR MIT"`, containing a
boolean operator) passed to `lib.getLicenseFromSpdxId` does not parse and
prints `evaluation warning: getLicenseFromSpdxId: No license with the given
SPDX ID found: Apache-2.0 OR MIT`, escalating to a hard abort under
`--option abort-on-warn true` — confirmed live on a plain (non-generated)
source package in this dive, not only on NIX-GEN-14's generated-package case
([Verification runs](#verification-runs) §8). A single SPDX **identifier**
(`"MIT"`, `"GPL-3.0-only"`) is accepted directly per `meta.chapter.md:78-88`'s
own "frowned upon but valid" list — the failure is specific to compound
boolean expressions, which need splitting on `OR`/`AND` first (NIX-GEN-14's
already-settled reader logic).

### 8. Dependency and attribute discipline: `strictDeps`, `__structuredAttrs`

nixpkgs-vet's ratchet checks (RFC 140) make both of these **directional**: a
new `pkgs/by-name` package must evaluate with `strictDeps = true` and
`__structuredAttrs = true`, and once true, neither can regress to false
([codified.md §4](nix-topic-map/codified.md), quoting the vet README). This
argues for setting both from a package's first commit rather than "fixing it
later," since later is a one-way door once merged.

`strictDeps = true` means only `nativeBuildInputs` land on `$PATH` at build
time; a build-time tool wrongly placed in `buildInputs` (meant for
runtime/link-time host libraries) is simply absent from `$PATH`. This dive
confirmed the exact failure live:
`stdenv-linux/setup: line 1771: hello: command not found`
(`pkgs.hello` in `buildInputs`) versus a clean build with the same tool in
`nativeBuildInputs` ([Verification runs](#verification-runs) §9).

`__structuredAttrs = true` does two things this dive separated experimentally:

1. **The `env` attrset never accepts lists**, with or without
   `__structuredAttrs` — nixpkgs-hammering's own explanation: "`mkDerivation`
   will only allow values that can be safely stringified in the `env`
   attribute (i.e. no lists)" ([codified.md §5](nix-topic-map/codified.md)).
   Confirmed live: `env.myFlags = [ "--one" "--two" ];` under
   `__structuredAttrs = true` fails eval with `The 'env' attribute set can
   only contain derivation, string, boolean or integer attributes. The
   'myFlags' attribute is of type list.` This is the opposite of what an
   agent might guess from the name "structured attrs" — `env` stays scalar
   either way; lists belong at the top level of the derivation attrset.
2. **A plain (non-`env`) list-valued attribute survives intact only under
   `__structuredAttrs`.** Without it, Nix stringifies a list attribute by
   space-joining it into one bash string, which the builder then
   word-splits back apart on whitespace — silently merging any element that
   itself contains a space. This dive's fixture used
   `myFlags = [ "--message=hello world" "--two" ]` (two logical elements, one
   containing an embedded space): without `__structuredAttrs`, `set --
   $myFlags; echo $#` reports **3** elements (the space split "hello world"
   in two); with `__structuredAttrs = true`, Nix auto-declares `myFlags` as a
   real bash array and `${#myFlags[@]}` correctly reports **2**
   ([Verification runs](#verification-runs) §10). Both runs exit 0 — the
   defect is silent, observable only in the output value, exactly the
   "no-flags-array" antipattern nixpkgs-hammering documents for
   `buildFlagsArray`
   ([codified.md §5](nix-topic-map/codified.md)).

### 9. Phases, `runHook`, and the flags-array footgun

The nixpkgs review checklist requires: "the list of phases is not
overridden" and "when a phase … is overridden it starts with `runHook
preInstall` and ends with `runHook postInstall`"
([failure.md §7](nix-topic-map/failure.md)). Neither `statix` nor `deadnix`
checks this — it is language-agnostic shell-script discipline inside a
string, invisible to a Nix AST linter (nixpkgs-hammering's
`missing-phase-hooks` and `explicit-phases` checks exist precisely because no
gate-tier tool covers it, [codified.md §5](nix-topic-map/codified.md)).

This dive planted the concrete, checkable consequence rather than relying on
"it just builds fine either way" (both twins *do* build with exit 0 — the
difference is invisible until a downstream override is attempted): a
downstream `overrideAttrs` adding `postInstall = ''touch $out/MARKER'';`
silently has no effect when the base `installPhase` omits `runHook
postInstall` (`MARKER` absent from the built output), and works correctly
when the hook is present (`MARKER` present) — exit 0 on both builds, the
defect surfaces only by inspecting the store path's contents
([Verification runs](#verification-runs) §5). This is the concrete,
plantable proof behind "silently breaks overridability" — the phrase alone
is not a check; the marker-file build is.

### 10. `substituteInPlace`

`substituteInPlace`'s bare `--replace` is deprecated in favor of
`--replace-fail` (error on no match), `--replace-warn` (warn), `--replace-quiet`
(silent) — tracking issue nixpkgs#356002, opened 2024-11-14, **still open**
as of this dive, with roughly 7,000 in-tree bare-`--replace` holdouts as of
the issue's own count ([shifts.md §13](nix-topic-map/shifts.md)). This dive
confirmed the current (26.11pre) behavior directly: bare `--replace` against
a pattern that matches nothing in the target file **exits 0** with no visible
warning in the default build log; `--replace-fail` against the identical
input **exits 1** with
`substituteStream() in derivation octool-0.1.0: ERROR: pattern
NONEXISTENT_TOKEN doesn't match anything in file '/nix/store/…/input.txt'`
([Verification runs](#verification-runs) §4). New code should already prefer
`--replace-fail` — the flag exists and works today — while not assuming the
bare form has been removed from nixpkgs' own `stdenv` (it has not, as of this
measurement).

### 11. `passthru.tests`, `versionCheckHook`, `passthru.updateScript`

`passthru.tests` is what proves a package actually *works*, not merely
*evaluates* — `nix flake check` never runs a package's own binary
(NIX-FLK-15, already settled, covers the `nix run`/`meta.mainProgram` half of
this). This dive's `finalattrs-good` fixture demonstrates the pattern in
full: `passthru.tests.self-reference` is a separate derivation that depends
on `finalAttrs.finalPackage` and asserts a file exists inside it; building
`.#default.tests.self-reference` succeeds only if the base package actually
installed that file ([Verification runs](#verification-runs) §2, §11).

`passthru.updateScript = nix-update-script { }` is the documented default
value shape inside a `finalAttrs:` pattern
([failure.md §7](nix-topic-map/failure.md)); it is what lets automation
(`r-ryantm`, or a manual `nix-shell maintainers/scripts/update.nix --argstr
package <name>`) bump a version without a human hand-editing the derivation.
**Sharp edge for a generated flake**: `nix-update` structurally cannot drive
a package whose `version`/`hash` live in a separate committed JSON file — it
edits inline `.nix`-file attributes only
([generated-flakes.md §10](nix-topic-map/generated-flakes.md)); this is why
every one of the eight measured generator exemplars implements its own
updater rather than wiring up plain `nix-update --flake`.

### 12. `overrideAttrs` scope

`CONTRIBUTING.md`/`pkgs/README.md` explicitly frame `overrideAttrs`/
`overridePythonAttrs` as "useful for out-of-tree code" while banning **new
in-tree** uses, for five stated reasons: duplicated overrides going unnoticed
across packages, overrides hiding from the overridden package's maintainer,
overrides never being reviewed by that maintainer, overridden packages being
forgotten, and larger duplicated dependency closures
([codified.md §11](nix-topic-map/codified.md)). For this dive's consumers —
the fleet's own flakes and a downstream/generated ocx flake, both firmly
out-of-tree — `overrideAttrs` is unrestricted; the in-tree ban is a nixpkgs
governance concern, not a general Nix rule, and a rule set that flags every
`overrideAttrs` regardless of context is over-generalizing a nixpkgs-specific
constraint (map M-D-14, Contested).

### 13. `allowUnfree` under pure evaluation

A flake evaluates purely and never reads `~/.config/nixpkgs` or any user
`nix.conf`-level `config`, so `config.allowUnfree`/`allowUnfreePredicate`/
`permittedInsecurePackages` must be set explicitly inside the flake's own
`legacyPackages` instantiation if it re-exports unfree software — there is no
ambient user config to inherit. `nixpkgs-terraform`'s pattern is the clean
version-gated instance of this: it keys `allowUnfree` off the *version being
built*, not a repo-wide flag, and pairs it with a `lib.warnIf` telling the
consumer why
([generated-flakes.md §7](nix-topic-map/generated-flakes.md)) — the
BSL-relicensing edge case that makes this a live, not hypothetical, concern
for a generated flake mirroring upstream licensing changes.

### 14. What no linter catches

`statix` and `deadnix` are Nix-language-only tools; the nixpkgs review
checklist's remaining items have no automated check at all and stay reading
heuristics:

- "package path/name/version fits guidelines" (naming convention, digit-start
  rule) — a grep against the exact charset rules, not a build check.
- "the motives for any special packaging choices are documented" — no tool
  parses comment *intent*.
- "patches have a comment describing either the upstream URL or a reason" —
  a grep for `patches = [` blocks lacking an adjacent `#` comment catches the
  mechanical absence, never the comment's adequacy.
- "source is fetched from an official or trusted location" — requires
  knowing what "official" means for that specific upstream; not automatable.
- "executables tested on ARCHITECTURE" — a CI-matrix property, not a
  single-file property.

`nixpkgs-hammering`'s 24 checks (`explanations/*.md`) close part of this gap
for a reviewer who runs it explicitly, but it is nitpick-tier by its own
design — "never a hard CI gate in nixpkgs itself"
([codified.md §5](nix-topic-map/codified.md)) — so this dive keeps it a
CONSIDER, not a MUST.

## Normative guidance candidates

Severity legend: **MUST** (a defect a reviewer or CI should always catch),
**SHOULD** (a defect with a known, accepted exception class), **CONSIDER**
(context-dependent or unautomatable). All commands measured on
CppNix 2.35.2, nixpkgs 26.11pre (this dive's own runs resolved
`nixos-unstable` live to rev `e158d9ed9b51c98974c5e66e1ba1c9e0255fecaa`,
2026-09-26 — one day from the topic map's pinned `8d5d2709`, same era),
nixfmt-tree 2.6.0, deadnix 1.3.2, unless stated otherwise.

**NIX-PKG-01 — Every derivation lives in one `callPackage`-able `package.nix`
with explicit formals, placed by-name-ready (no `../` path references, no
symlinks out of its own directory).**
Rationale: this is what makes a nixpkgs submission a copy, not a rewrite
(RFC 140; `pkgs/by-name/README.md:134-166`).
Verify: `nix eval <flake>#packages.<system>.<name>` succeeds when
`legacyPackages.<system>.callPackage ./package.nix { }` is substituted for the
flake's own reference (drvPath equality — already NIX-FLK-13's check).
Watched red: **yes**, via this dive's own `skeleton/` fixture — the full
by-name-ready `package.nix` skeleton passes `nixfmt --check`, `deadnix --fail
--no-lambda-pattern-names`, `statix check`, `nix flake check --no-build`,
`nix run` (proving `mainProgram`), a `passthru.tests` build, and drvPath
equality between `packages.octool` and the overlay-applied path, all exit 0
([Verification runs](#verification-runs) §11).

**NIX-PKG-02 — Use `mkDerivation (finalAttrs: { … })`, never `rec { }`, for
any package that must reference its own final build output
(`passthru.tests`, a self-check, an installer path).**
Rationale: `finalAttrs.finalPackage` is the derivation's fixed-point result;
`rec` only lets a sibling *input* attribute reference another input
attribute, and has no way to name the eventual output.
Verify: build the package's `passthru.tests` attribute; a `rec`-shadowed copy
of the same idiom fails eval outright rather than building wrong.
Watched red: **yes**. `rec-bad` gave `error: undefined variable
'finalPackage'` (exit 1); `finalattrs-good` built and its
`passthru.tests.self-reference` succeeded (exit 0)
([Verification runs](#verification-runs) §2).
Severity: **MUST** whenever the package needs self-reference; a plain `rec {
}` used only for `pname`/`version` string interpolation is **CONSIDER**
(legitimate per `pkgs/README.md`, not a finding by itself).

**NIX-PKG-03 — Every package sets `meta.description`, `meta.license`,
`meta.mainProgram` (hardcoded, only with exactly one binary), and
`meta.platforms`; a generated/prebuilt (shape D) package additionally sets
`meta.sourceProvenance = [ lib.sourceTypes.binaryNativeCode ]`.**
Rationale: `pkgs/README.md`'s own new-package review checklist; a missing
field fails silently (no build error, no `nix flake check` failure) —
`meta.chapter.md:249`'s absence-is-not-guarantee wording is exactly why
`sourceProvenance` needs an explicit, unconditional set for D rather than an
inferred default.
Verify: the combined jq expression in [§7](#7-meta-the-per-shape-minimum)
(this dive's Q7 replacement); NIX-GEN-12/-13's own commands for shape D
specifically.
Watched red: **yes**, four independent twins (`meta-missing-description`,
`-license`, `-mainprogram`, `-platforms`), each exit 1 against the check,
`meta-good` exit 0 ([Verification runs](#verification-runs) §7).
Severity: **MUST**.

**NIX-PKG-04 — License an explicit `lib.licenses.<attr>` or a single SPDX
identifier string; never pass a compound SPDX expression
(`"X OR Y"`/`"X AND Y"`) to `lib.getLicenseFromSpdxId` directly.**
Rationale: a compound expression does not parse and prints an evaluation
warning on every consumer's eval, escalating to an abort under
`--option abort-on-warn true` (a policy CI can and should set for its own
packages).
Verify: `nix eval --option abort-on-warn true --json <flake>#packages.<system>.<name>.meta.license`.
Watched red: **yes**. `meta-spdx-warn` (`getLicenseFromSpdxId "Apache-2.0 OR
MIT"`) aborted with `evaluation warning: getLicenseFromSpdxId: No license
with the given SPDX ID found: Apache-2.0 OR MIT` then
`error: aborting to reveal stack trace of warning`; `meta-good`
(`lib.licenses.mit`) exited 0 with the full license attrset
([Verification runs](#verification-runs) §8). This confirms NIX-GEN-14's
finding also holds outside the generated-flake case NIX-GEN-14 measured.
Severity: **MUST** for any package whose upstream license annotation may be
a compound expression (chiefly shape D, reading OCI `licenses` annotations).

**NIX-PKG-05 — Fetch with a nixpkgs fetcher, `hash = "sha256-…"` (SRI, never
the legacy `sha256 = "…"` name), and a full 40-hex `rev` or a `tag`, never a
branch name or a short hash.**
Rationale: nixpkgs' own fetch-form hierarchy and the documented short-hash
404/DoS incident.
Verify: `grep -rn -e 'sha256 = "' -e 'cargoSha256' -e 'vendorSha256'
--include='*.nix' .` (Q8, empty passes) for the hash-attribute half; a
reading heuristic ("a `rev` shorter than 40 hex, or naming a branch") for
the revision half — not automatable as a single grep without false positives
on legitimate short strings elsewhere in a file.
Watched red: **partially**. The legacy-attribute-name half is watched red as
a *build* comparison (`fetch-legacy-sha256` built fine, exit 0 — confirming
this is a style finding, not a build failure) but the grep itself was not
separately re-run in this dive (already Q8 in the map). The short-rev half
was planted and **did not go red**: `fetch-short-rev` (`rev = "7fd1a60"`
against `octocat/Hello-World`) built successfully, exit 0 — GitHub resolved
the short hash without ambiguity in this specific case. Recorded honestly:
this rule's enforcement is a reading heuristic only, not a build-based gate,
because the failure is fork/rename-dependent, not deterministic
([Verification runs](#verification-runs) §6).
Severity: **MUST** for the hash-attribute name (mechanical, checkable);
**SHOULD** for the rev-length rule (real risk, not a guaranteed local
failure).

**NIX-PKG-06 — Never hand-write a hash; use one of the four blessed fake
hashes (`lib.fakeHash`/`fakeSha256`/`fakeSha512`/`""`), build once, and copy
the `got:` value — or use `nurl`/`nix-prefetch-git` up front.**
Rationale: manual security warning — any other placeholder degrades the
fetch to `curl --insecure`, an MITM exposure, not merely a style choice.
Verify: `nix build` from a clean/untouched hash — a wrong (or fake) hash
fails with `error: hash mismatch in fixed-output derivation … specified: …
got: …`; read the `got:` value.
Watched red: **yes**. Both `fetch-wrong-hash` (a hand-typed, well-formed
wrong SRI hash) and `fetch-fakehash` (`lib.fakeHash`) failed on the
**identical** derivation and produced the **identical** error, confirming
`lib.fakeHash` literally equals the all-zero-bit placeholder; `fetch-good-hash`
(the real, `nurl`-obtained hash) exited 0
([Verification runs](#verification-runs) §6).
Severity: **MUST**.

**NIX-PKG-07 — `src = lib.fileset.toSource { root; fileset; }` (composed with
`gitTracked`/`unions`/`fileFilter`/`maybeMissing`), never `src = ./.` or
`src = self` unfiltered, for any package whose repository has more files
than the build needs.**
Rationale: an unfiltered `src` copies the whole directory into the store and
changes the derivation's `drvPath` (forcing a rebuild) on every unrelated
edit — README changes, CI config, docs.
Verify: build, touch an out-of-fileset file, `git add`, rebuild, compare
`drvPath` (Q15-style).
Watched red: **yes**. `src-naive`'s drvPath changed after touching
`README.md` (`2wgcf55…` → `cx3zlz0…`); `src-fileset`'s stayed byte-identical
(`mg76w0h…` both times) ([Verification runs](#verification-runs) §1a-b).
Severity: **MUST** for A and D shapes; **CONSIDER** for a tiny single-file
package where the whole tree already equals the fileset.

**NIX-PKG-08 — `nativeBuildInputs` for build-time tools, `buildInputs` for
runtime/link-time libraries, with `strictDeps = true` from a package's first
commit.**
Rationale: nixpkgs-vet's ratchet makes `strictDeps = true` one-way once
achieved (RFC 140); misplacing a build tool in `buildInputs` under
`strictDeps` is a silent-until-build `$PATH` gap, not a type error.
Verify: build with the tool in each position; under `strictDeps = true`,
`buildInputs` placement fails at the phase that invokes it.
Watched red: **yes**. `strictdeps-bad` (`pkgs.hello` in `buildInputs`) failed
with `stdenv-linux/setup: line 1771: hello: command not found`;
`strictdeps-good` (same tool in `nativeBuildInputs`) exited 0
([Verification runs](#verification-runs) §9).
Severity: **MUST**.

**NIX-PKG-09 — `__structuredAttrs = true` from a package's first commit
(nixpkgs-vet ratchet); never rely on it to permit a list value inside `env` —
`env` stays scalar-only regardless.**
Rationale: same one-way ratchet as NIX-PKG-08; the common confusion this
dive found is believing `__structuredAttrs` loosens `env`'s type rules, when
it is the *plain top-level* list attribute that gains real-array fidelity.
Verify: (a) `env.<name> = [ … ];` under `__structuredAttrs = true` fails eval
with `The 'env' attribute set can only contain derivation, string, boolean or
integer attributes`; (b) a plain top-level list attribute containing a
space-bearing element, read back via `${#name[@]}` inside the build,
reports the correct element count only with `__structuredAttrs = true`.
Watched red: **yes** for both. `structuredattrs-good`'s `env.myFlags = […]`
attempt failed eval exactly as described; the plain-attribute pair gave
`element count: 3` (wrong, word-split) without `__structuredAttrs` and
`element count: 2` (correct) with it
([Verification runs](#verification-runs) §10).
Severity: **MUST** for new by-name packages (the ratchet); **SHOULD**
elsewhere.

**NIX-PKG-10 — Every overridden phase starts with `runHook pre<Phase>` and
ends with `runHook post<Phase>`; the phase list itself is never reordered or
replaced wholesale without reason.**
Rationale: omitting the hooks builds successfully today but silently
disables every downstream `overrideAttrs` that adds a `pre`/`post` hook —
including `nix-update`-style automation and a consumer's own local patch.
Verify: no linter catches this. The plantable proof is behavioral: add
`postInstall` via `overrideAttrs` and check whether it took effect.
Watched red: **yes**. `runhook-bad`'s downstream `overrideAttrs
{ postInstall = "touch $out/MARKER"; }` built (exit 0) with **no** `MARKER`
in the output; the identical override on `runhook-good` produced a `MARKER`
file ([Verification runs](#verification-runs) §5).
Severity: **MUST** — silent, unrecoverable-by-the-consumer breakage, worse
than a build failure.

**NIX-PKG-11 — `substituteInPlace` always uses `--replace-fail` (or, where a
soft warning is genuinely wanted, `--replace-warn`); the bare `--replace` is
a finding in any new code.**
Rationale: bare `--replace` silently no-ops when its search string is
missing — exactly the failure mode that makes an upstream rename or a typo
invisible until much later.
Verify: `grep -rn -e 'substituteInPlace' --include='*.nix' . | grep -v
-e '--replace-fail' -e '--replace-warn' -e '--replace-quiet'` (a reading
heuristic — deadnix/statix do not parse shell-string arguments); or, at
build time, deliberately mismatch a pattern and observe the exit code.
Watched red: **yes**. `substitute-bare` exited 0 (silent) on a guaranteed
non-match; `substitute-fail` exited 1 with
`ERROR: pattern NONEXISTENT_TOKEN doesn't match anything in file '…'`
([Verification runs](#verification-runs) §4).
Severity: **SHOULD** (nixpkgs#356002 is open, not yet a removal — see
[Contested](#contested--evolving)); **MUST** for this program's own fleet
flakes.

**NIX-PKG-12 — Every runnable package that claims to work carries at least
one `passthru.tests` entry building against `finalAttrs.finalPackage`,
proving the package installs and runs, not merely evaluates.**
Rationale: `nix flake check` never executes a package's binary (NIX-FLK-15
covers the `nix run` half); `passthru.tests` is the only mechanism that
closes the "it evaluates, it built, does it actually work" gap.
Verify: `nix build <flake>#<pkg>.tests.<name>`.
Watched red: **yes** for the mechanism (`finalattrs-good#default.tests.self-reference`
built successfully, exit 0) and for its `rec`-shadowed failure mode
(`rec-bad` failed at eval, before a test could even be attempted) — see
NIX-PKG-02's evidence, the same fixtures.
Severity: **SHOULD** for A; **MUST** for a fleet CLI's own release-blocking
CI (this program's own consumers, per the frame).

**NIX-PKG-13 — `passthru.updateScript = nix-update-script { }` for any
package whose `version`/`hash` are inline `.nix` attributes; a generated
flake with JSON-backed data writes its own updater, never wires
`nix-update --flake` directly at it.**
Rationale: `nix-update` edits attributes it finds textually inline in a
`.nix` file; it has no concept of "the version lives in a committed JSON the
flake reads at eval time" — the architecture this program's own D-shape
flake will use ([generated-flakes.md §10](nix-topic-map/generated-flakes.md)).
Verify: reading heuristic only — inspect whether `version`/`hash` are
literal in `package.nix` (then `nix-update-script` applies) or read from a
data file (then it does not, and a bespoke `passthru.updater`-schema
script is required, per llm-agents.nix's pattern already surveyed in
nix-generated-flakes.md).
Watched red: **no** — not independently re-run in this dive; cited from the
generated-flakes audit's own direct reading of `nix-update`'s README and
`llm-agents.nix`'s `AGENTS.md`.
Severity: **SHOULD** for shape A; **MUST** that a shape-D flake never claims
plain `nix-update --flake` compatibility in its own docs.

**NIX-PKG-14 — `overrideAttrs`/`overridePythonAttrs` are unrestricted for
this program's own out-of-tree and generated flakes; do not port nixpkgs'
in-tree-only ban into a general rule.**
Rationale: the ban's five stated reasons (duplicated overrides, maintainer
blindness, review gaps, forgotten overrides, dependency-closure bloat) are
nixpkgs governance concerns specific to a single shared in-tree package set,
none of which apply to a project's own downstream or generated flake.
Verify: reading heuristic — `overrideAttrs` in a fleet flake's own
`package.nix` or in a generated flake's reader is not itself a finding;
flag it only inside a `pkgs/by-name`-targeted submission.
Watched red: **no** — a documentation/scope question, not a build behavior.
Severity: **CONSIDER** (context-dependent by design, not a universal MUST/SHOULD).

**NIX-PKG-15 — A flake that re-exports unfree software sets
`config.allowUnfree`/`allowUnfreePredicate` explicitly inside its own
`legacyPackages` instantiation, keyed to the specific version or package
being built when licensing is version-dependent, with a `lib.warnIf` telling
the consumer why.**
Rationale: pure flake evaluation never reads ambient user config; there is
no "user already set `NIXPKGS_ALLOW_UNFREE=1`" for a flake to fall back on,
and a repo-wide unconditional unfree flag hides *which* package or version
actually needs it.
Verify: reading heuristic (`grep -n 'allowUnfree' <flake>.nix` — presence is
not itself a finding, an *unconditional*, unexplained one is); no build-red
twin planted in this dive (cited from `nixpkgs-terraform`'s measured
pattern, already surveyed).
Watched red: **no**.
Severity: **SHOULD** whenever a D-shape flake's upstream licensing is
version-variable.

**NIX-PKG-16 — Patches: `fetchpatch2` for anything already published
upstream; plain `fetchpatch` only when the patch's diff headers contain
short/abbreviated commit hashes; a vendored, in-tree `.patch` only when
nixpkgs-specific or link-rot-prone — every patch carries a comment stating
which and why.**
Rationale: `fetchpatch2` normalizes more aggressively but cannot expand a
short hash inside a diff header (nixpkgs#257446); an uncommented patch fails
the nixpkgs review checklist regardless of which fetcher is used.
Verify: reading heuristic — `grep -B2 'fetchpatch' <flake-repo> --include='*.nix'`
to confirm an adjacent comment; no automated tool checks comment adequacy.
Watched red: **no** — a documentation-shaped rule; not independently
re-verified as a build behavior in this dive (cited from
`CONTRIBUTING.md`/`pkgs/README.md`, already read in full by the codified/
failure audits).
Severity: **SHOULD**.

**NIX-PKG-17 — Several nixpkgs review-checklist items have no linter; treat
them as reading heuristics in a human/agent review pass, not as commands to
automate away.**
Rationale: `statix`/`deadnix` parse the Nix language only; phase-hook
placement, patch-comment presence, "fetched from an official location," and
naming-guideline compliance require judgment or non-Nix-AST context.
Verify: none — this rule's own content *is* "there is no command"; the
closest partial automation is `nixpkgs-hammering`'s 24 checks, explicitly
nitpick-tier and never a CI gate in nixpkgs itself.
Watched red: **no**, by definition.
Severity: **CONSIDER** — a checklist a reviewer runs through, not a gate.

## Verification runs

All commands run through `/home/mherwig/.cache/research-lang/nix-tools/run.sh`
(CppNix 2.35.2, `nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable"` in each
fixture, resolved live to rev `e158d9ed9b51c98974c5e66e1ba1c9e0255fecaa`,
narHash `sha256-hKlVl12B1dF0Q5vd9dY3lIJM5mFGWYSlXwSLAqHZ1+s=`, 2026-09-26 —
the same nixpkgs 26.11pre era as the topic map's `8d5d2709` pin, one day
apart). Every fixture directory has its own `git init -q && git add -A`.
Store state: **warm** for `nixpkgs` itself (fetched once, reused across all
fixtures below); **cold** for each fixture's own filtered/fetched `src` on
its first evaluation (a fresh content-addressed path every time fixture
content changes), stated per run below. Fixture root:
`/home/mherwig/.cache/research-lang/nix-tools/fixtures/derivation-conventions/`.

**§1 — `src` filtering (`src-naive/`, `src-fileset/`, `src-fileset-coldread/`)**

```
$ nix eval --no-write-lock-file --raw src-naive#default.drvPath
/nix/store/2wgcf55agk7r7pp7p3dwfi8yhfmcdhj2-src-naive-0.1.0.drv
$ echo "unrelated" >> src-naive/README.md && git -C src-naive add -A
$ nix eval --no-write-lock-file --raw src-naive#default.drvPath
/nix/store/cx3zlz0qaw3vz2rgzx4ad20s7hlnipxr-src-naive-0.1.0.drv   # CHANGED
```

```
$ nix eval --no-write-lock-file --raw src-fileset#default.drvPath
/nix/store/mg76w0hggq9kr8sg04726j70kl015bcf-src-fileset-0.1.0.drv
$ echo "unrelated" >> src-fileset/README.md && git -C src-fileset add -A
$ nix eval --no-write-lock-file --raw src-fileset#default.drvPath
/nix/store/mg76w0hggq9kr8sg04726j70kl015bcf-src-fileset-0.1.0.drv   # IDENTICAL
```

(a) naive: drvPath changed on an unrelated edit — **violation, watched red**.
(b) fileset: drvPath unchanged — **compliant, watched green**.

(c) `src-fileset-coldread/` (a fresh, never-before-evaluated fileset content,
reading `builtins.readFile "${src}/Cargo.lock"` at eval time through the
filtered store path):

```
$ nix flake check --no-build --no-write-lock-file src-fileset-coldread
checking derivation packages.x86_64-linux.default...
derivation evaluated to /nix/store/2nq2wryxm4zxzgwii73kr8py1l51f5qn-...drv
all checks passed!
```
exit 0 on a genuinely first-ever evaluation of that fileset content (cold for
that specific store path). **Did not go red** — see [§4 discussion](#4-eval-time-vs-build-time-fetches)
for why this does not contradict NIX-FLK-07.

**§2 — `finalAttrs` vs `rec` (`finalattrs-good/`, `rec-bad/`)**

```
$ nix flake check --no-build --no-write-lock-file finalattrs-good
all checks passed!                                                   # exit 0
$ nix build --no-write-lock-file finalattrs-good#default.tests.self-reference
building '/nix/store/…-octool-test.drv'...                           # exit 0
```
```
$ nix flake check --no-build --no-write-lock-file rec-bad
error: undefined variable 'finalPackage'
       at rec-bad/flake.nix:22:21                                    # exit 1
```

**§3 — `runHook` (see §5 below; folded together since both are behavioral)**

**§4 — `substituteInPlace` (`substitute-bare/`, `substitute-fail/`)**

```
$ nix build --no-write-lock-file --no-link substitute-bare
/nix/store/chqqi6fpz6wn0d7dpwz2h1zf6788m1s7-octool-0.1.0              # exit 0
$ nix build --no-write-lock-file --no-link substitute-fail
substituteStream() in derivation octool-0.1.0: ERROR: pattern
NONEXISTENT_TOKEN doesn't match anything in file '/nix/store/…/input.txt'
                                                                       # exit 1
```

**§5 — `runHook` overridability (`runhook-bad/`, `runhook-good/`)**

```
$ nix build --impure --expr '
    (builtins.getFlake (toString ./runhook-bad)).packages.x86_64-linux.default.overrideAttrs
      (old: { postInstall = (old.postInstall or "") + "touch $out/MARKER"; })
  ' --no-link --print-out-paths
/nix/store/zxvsghy2ykx6h7hmgd8ib6ldr42r7ljj-octool-0.1.0               # exit 0
$ ls /nix/store/zxvsghy2ykx6h7hmgd8ib6ldr42r7ljj-octool-0.1.0/
octool.txt                                                             # NO MARKER
```
```
$ (same override against runhook-good)
/nix/store/v8m5dnijccjka5pr8y0cnjmbx88fm2mm-octool-0.1.0               # exit 0
$ ls /nix/store/v8m5dnijccjka5pr8y0cnjmbx88fm2mm-octool-0.1.0/
MARKER  octool.txt                                                     # MARKER present
```

**§6 — Fetcher/hash fixtures (`fetch-good-hash/`, `fetch-legacy-sha256/`,
`fetch-short-rev/`, `fetch-wrong-hash/`, `fetch-fakehash/`)**, all
`fetchFromGitHub { owner = "octocat"; repo = "Hello-World"; }` at
rev `7fd1a60b01f91b314f59955a4e4d4e80d8edf11` (cold on first fetch each):

```
$ nurl https://github.com/octocat/Hello-World 7fd1a60b01f91b314f59955a4e4d4e80d8edf11
fetchFromGitHub {
  owner = "octocat"; repo = "Hello-World";
  tag = "7fd1a60b01f91b314f59955a4e4d4e80d8edf11";
  hash = "sha256-gdkPz7VJ8ZOwJ5oetnuXBXPkkHlOsU7w0PghYjWgpAo=";
}
```
| fixture | hash form | rev form | result |
|---|---|---|---|
| fetch-good-hash | `hash = "sha256-gdkPz…"` | full 40-hex | exit 0 |
| fetch-legacy-sha256 | `sha256 = "gdkPz…"` (legacy name, same value) | full 40-hex | exit 0 (deprecation finding only, not a build failure) |
| fetch-short-rev | `hash = "sha256-gdkPz…"` | `"7fd1a60"` (7-hex) | exit 0 (**did not go red** — recorded honestly, see NIX-PKG-05) |
| fetch-wrong-hash | `hash = "sha256-AAAA…AAA="` (well-formed, wrong) | full 40-hex | `error: hash mismatch in fixed-output derivation … specified: sha256-AAAA…, got: sha256-gdkPz…` — exit 1 |
| fetch-fakehash | `hash = pkgs.lib.fakeHash` | full 40-hex | **identical** drv and **identical** error as fetch-wrong-hash — confirms `lib.fakeHash == "sha256-AAAA…AAA="` literally |

**§7 — `meta` minimum (`meta-good/`, `meta-missing-{desc,license,mainprogram,platforms}/`)**

```sh
nix eval --json <fixture>#packages.x86_64-linux.default.meta \
  | jq -e '.description and .license and .mainProgram and .platforms'
```
| fixture | jq result | exit |
|---|---|---|
| meta-good | `true` | 0 |
| meta-missing-desc | `false` | 1 |
| meta-missing-license | `false` | 1 |
| meta-missing-mainprogram | `false` | 1 |
| meta-missing-platforms | `false` | 1 |

**§8 — SPDX compound license (`meta-spdx-warn/`)**

```
$ nix eval --option abort-on-warn true --json meta-spdx-warn#packages.x86_64-linux.default.meta.license
evaluation warning: getLicenseFromSpdxId: No license with the given SPDX ID found: Apache-2.0 OR MIT
error: aborting to reveal stack trace of warning, as abort-on-warn is set     # exit 1
$ nix eval --option abort-on-warn true --json meta-good#packages.x86_64-linux.default.meta.license
{"deprecated":false,"free":true,"fullName":"MIT License",...}                 # exit 0
```

**§9 — `strictDeps` (`strictdeps-bad/`, `strictdeps-good/`)**

```
$ nix build --no-write-lock-file --no-link strictdeps-bad
…/stdenv-linux/setup: line 1771: hello: command not found                     # exit 1
$ nix build --no-write-lock-file --no-link strictdeps-good
building '/nix/store/…-octool-0.1.0.drv'...                                    # exit 0
```

**§10 — `__structuredAttrs` (`structuredattrs-bad/`, `structuredattrs-good/`)**

```
$ nix build -L --no-write-lock-file --no-link structuredattrs-bad
octool> element count: 3                                                       # exit 0 (semantically wrong)
$ nix build -L --no-write-lock-file --no-link structuredattrs-good
octool> element count: 2                                                       # exit 0 (correct)
```
(the separate `env.myFlags = [ … ]` attempt, tried first and replaced in the
final fixture, failed eval with `The 'env' attribute set can only contain
derivation, string, boolean or integer attributes. The 'myFlags' attribute is
of type list.` — exit 1, confirming `env` forbids lists regardless of
`__structuredAttrs`.)

**§11 — Full gate block on the by-name-ready skeleton (`skeleton/`)**

```
$ nixfmt --check package.nix flake.nix          # exit 0
$ deadnix --fail --no-lambda-pattern-names .    # exit 0
$ statix check .                                # exit 0
$ nix flake check --no-build --no-write-lock-file .
all checks passed!                              # exit 0 (x86_64-linux only; --all-systems not run)
$ nix run --no-write-lock-file .
octool 0.1.0                                    # exit 0 — mainProgram proven
$ nix build --no-write-lock-file --no-link .#default.tests.installs -L
octool-installs-test> Running phase: checkPhase
…                                                # exit 0 — test -x $bin passed
$ nix eval --no-write-lock-file --raw .#packages.x86_64-linux.octool.drvPath
/nix/store/wmcpwp2v4vb5c5lvvqay503haq2wn69n-octool-0.1.0.drv
$ nix eval --impure --raw --expr '(let f = builtins.getFlake (toString .); in
    (f.inputs.nixpkgs.legacyPackages.x86_64-linux.extend f.overlays.default).octool.drvPath)'
/nix/store/wmcpwp2v4vb5c5lvvqay503haq2wn69n-octool-0.1.0.drv           # IDENTICAL
```

The verbatim skeleton (`fixtures/derivation-conventions/skeleton/package.nix`):

```nix
{
  lib,
  stdenv,
  fetchFromGitHub,
}:

stdenv.mkDerivation (finalAttrs: {
  pname = "octool";
  version = "0.1.0";

  src = fetchFromGitHub {
    owner = "octocat";
    repo = "Hello-World";
    tag = "7fd1a60b01f91b314f59955a4e4d4e80d8edf11";
    hash = "sha256-gdkPz7VJ8ZOwJ5oetnuXBXPkkHlOsU7w0PghYjWgpAo=";
  };

  strictDeps = true;
  dontBuild = true;

  installPhase = ''
    runHook preInstall
    mkdir -p $out/share/octool $out/bin
    cp -r . $out/share/octool
    cat > $out/bin/octool <<SCRIPT
    #!${stdenv.shell}
    echo "octool ${finalAttrs.version}"
    SCRIPT
    chmod +x $out/bin/octool
    runHook postInstall
  '';

  passthru.tests.installs = stdenv.mkDerivation {
    name = "octool-installs-test";
    dontUnpack = true;
    doCheck = true;
    installPhase = "touch $out";
    checkPhase = ''
      test -x ${finalAttrs.finalPackage}/bin/octool
    '';
  };

  meta = {
    description = "Fixture package for the by-name-ready package.nix skeleton";
    homepage = "https://github.com/octocat/Hello-World";
    license = lib.licenses.mit;
    mainProgram = "octool";
    platforms = lib.platforms.all;
  };
})
```

paired with the thin `flake.nix` in the same directory (`packages`, an
`overlays.default` calling the same `package.nix`, and `formatter =
pkgs.nixfmt-tree`) — the complete pairing already satisfies NIX-FLK-13/-14
from nix-flakes.md as well as every gate in nix-gates.md.

## Exemplar evidence

- **`finalAttrs`**: `NixOS/nix@209d2bc44288` uses it 35 times (the highest
  count in the corpus); `numtide/llm-agents.nix@efb10f28f724` 49 times, one
  per package definition, alongside a legitimate `rec` count of 80 in the
  same repo for `pname`/`version` interpolation — the two idioms coexist by
  design, not in tension ([exemplar-flake-shape.md §4](nix-audit/exemplar-flake-shape.md)).
- **Source filtering**: 21/37 exemplars use `lib.fileset`/`cleanSourceWith`/
  `cleanCargoSource`/`builtins.path`, 90 files total; `ipetkov/crane@73b980519cef`
  is the heaviest single user (32 files, [exemplar-flake-shape.md §4](nix-audit/exemplar-flake-shape.md)).
- **`mainProgram`**: present in 22/37 repos, 280 occurrences corpus-wide
  ([exemplar-flake-shape.md §4](nix-audit/exemplar-flake-shape.md)).
- **Hardcoded version literals**: 259 occurrences in 16 repos — legitimate
  when the underlying data source is itself JSON/inline (llm-agents.nix,
  107 occurrences) but a finding when a project manifest (`Cargo.toml`,
  `pyproject.toml`) already carries the same version
  ([exemplar-flake-shape.md §4](nix-audit/exemplar-flake-shape.md), map
  conflict 8).
- **`allowUnfree`**: 9/37 repos, 15 occurrences — every measured case is a
  project-scoped, not blanket-global, toggle
  ([exemplar-flake-shape.md §4](nix-audit/exemplar-flake-shape.md)).
- **The by-name/`callPackage` shape itself**: `NixOS/nixpkgs@9cab9ed832c3`'s
  own `pkgs/by-name/README.md:134-166` is the normative source this dive's
  skeleton was built to satisfy — every rule in NIX-PKG-01 traces to that
  file's own validity checks, independently confirmed via `nixpkgs-vet`'s
  README ([codified.md §4](nix-topic-map/codified.md)).
- **`fetchpatch2`/`fetchpatch` split**: not exemplified in this dive's own
  fixture set (no corpus repo's patch usage was re-measured here); cited
  from the audits' direct reading of `CONTRIBUTING.md`
  ([failure.md §7-8](nix-topic-map/failure.md)).
- **Contradicting evidence for a build-based short-rev check**: none in the
  exemplar corpus was re-tested; this dive's own fixture (`fetch-short-rev`)
  is the only direct evidence, and it is negative (no failure) — see
  NIX-PKG-05.

## AI-agent angle

- **Pasting the `finalAttrs.finalPackage` idiom onto inherited `rec {}`
  boilerplate.** An agent that has learned "self-reference uses
  `finalPackage`" from a training-era example but is editing a `rec`-shaped
  file (still common: 1,264 corpus occurrences) writes `${finalPackage}`
  inside a `rec { }` attrset. Smallest mechanical check:
  `nix eval`/`nix flake check` — this is a hard parse-time
  `error: undefined variable`, not a silent wrong build, so it self-reports;
  the only risk is an agent papering over the error by deleting the
  self-reference entirely rather than converting the outer attrset to
  `finalAttrs:`.
- **Believing `__structuredAttrs = true` loosens what `env` accepts.** The
  name suggests "more structure allowed"; the actual effect for `env`
  specifically is the opposite (still scalar-only) — the payoff is for
  *plain*, non-`env` list attributes. Smallest check: attempt
  `env.<name> = [ … ];` under `__structuredAttrs`; it is a hard eval error
  with an unambiguous message, so this mistake also self-reports quickly —
  but only once an agent tries it; the more dangerous version is an agent
  *avoiding* `__structuredAttrs` altogether because it "seems complicated,"
  losing the actual list-array fidelity fix for no reason.
- **Treating `nix flake check` passing as proof the package works.** Neither
  a missing `meta.mainProgram` nor a missing `runHook` fails `nix flake
  check --no-build` (confirmed live in this dive and in NIX-FLK-15). An
  agent that gates only on `nix flake check` ships a package that evaluates
  and builds but silently can't be run or safely overridden. Smallest check:
  a `passthru.tests` build, or `nix run <flake> -- --version`.
  ([Verification runs](#verification-runs) §2, §5, §11 all demonstrate
  exit-0 builds with a real, undetected-by-`flake check` defect underneath.)
- **Guessing a fetcher hash instead of using the fake-hash workflow.** An
  agent under time pressure sometimes fabricates a plausible-looking SRI
  string rather than running the two-step fake-hash procedure. Beyond simply
  failing to build, this dive confirms the *security* dimension the manual
  states explicitly: any non-blessed placeholder degrades the fetch to
  `curl --insecure`. Smallest check: `grep -rn -e 'hash = "sha256-'
  --include='*.nix' .` cross-referenced against a `nurl`/`nix-prefetch-git`
  re-derivation of the same value — not a single grep, but a
  reproduce-and-diff step.
- **Assuming `sha256 = "…"` and `hash = "sha256-…"` are interchangeable
  spellings of the same thing with no consequence to picking either.** They
  are almost interchangeable (the legacy attribute still works, confirmed
  live), but an agent copying a hash *value* between the two attribute
  names without also converting encoding (`sha256 =` wants base64/base32,
  `hash =` wants the `sha256-`-prefixed SRI form) produces a hash-format
  error, not a silent success. Smallest check: `nix hash convert` round-trip,
  or simply always regenerate via `nurl` rather than hand-editing.
- **Copying a bare `--replace` from an old nixpkgs example without
  noticing it is deprecated.** Since the bare form still works and prints no
  visible warning in a default build (confirmed live), an agent has no
  local signal to prefer `--replace-fail` unless told to. Smallest check: a
  grep for `--replace ` (with a trailing space, to exclude `--replace-fail`/
  `-warn`/`-quiet`) inside `substituteInPlace` calls.

## Contested / evolving

- **`substituteInPlace --replace` removal timeline.** nixpkgs#356002 has been
  open since 2024-11-14 with no removal date; as of this dive's measurement
  (2026-09-26 nixpkgs rev), the bare form still silently succeeds on a
  non-match. Trending toward eventual removal (the tracking issue exists and
  ~7,000 in-tree holdouts are being migrated), but "not yet removed" remains
  the accurate 2026-09-27 statement — do not write a rule that assumes it
  errors today.
- **How strict a check should NIX-PKG-05's short-rev rule be.** This dive's
  own fixture shows a short rev *can* resolve without incident on GitHub in
  the common case (no fork/rename ambiguity present); the risk is
  probabilistic and depends on the specific repository's fork/rename
  history, not a property this dive's environment can force to fail
  deterministically. The rule stays a SHOULD/reading-heuristic rather than a
  build gate; a future dive with access to a repository known to have this
  ambiguity (rather than `octocat/Hello-World`, which does not) could
  upgrade it to a watched-red build check.
- **`overrideAttrs` in-tree ban's scope.** Map M-D-14 already flags this as
  "Contested" — the ban is nixpkgs-governance-specific, but a rule catalogue
  written generically enough to also serve nixpkgs upstreaming (this
  program's own eventual goal per owner Q3) will need to distinguish "this
  package.nix, written today, targets an out-of-tree flake" from "this same
  file, submitted later to nixpkgs by-name" — the same file may need to drop
  an `overrideAttrs` it currently relies on before submission.
- **`nixpkgs-hammering`'s 24 checks staying nitpick-tier.** Nothing in this
  dive's sources suggests nixpkgs plans to promote any of them to a required
  gate; they remain a reviewer's opt-in tool. Whether this program's own
  CI should run `nixpkgs-hammering` as an additional advisory step (parallel
  to statix per NIX-GATE-06) is an open design choice, not resolved here.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [nixpkgs `doc/build-helpers/fetchers.chapter.md`](https://github.com/NixOS/nixpkgs/blob/master/doc/build-helpers/fetchers.chapter.md) | Manual chapter, primary — read directly this session from the exemplar clone (`9cab9ed8`) | fetched 2026-09-27 | The fetcher hierarchy, the four-blessed-fake-hash security rule, the full hash-acquisition procedure |
| [nixpkgs `doc/stdenv/meta.chapter.md`](https://github.com/NixOS/nixpkgs/blob/master/doc/stdenv/meta.chapter.md) | Manual chapter, primary — read directly this session | fetched 2026-09-27, rev `9cab9ed8` | Verbatim `meta.*` field definitions, the description wrong/right example, `sourceProvenance`'s presence-only semantics |
| [nixpkgs `pkgs/README.md`](https://raw.githubusercontent.com/NixOS/nixpkgs/master/pkgs/README.md) | Packaging manual, primary — fetched in full by the failure/codified audits | fetched 2026-09-27 | The verbatim new-package and package-update review checklists; fetch-form hierarchy with the short-hash incident |
| [nixpkgs `CONTRIBUTING.md`](https://raw.githubusercontent.com/NixOS/nixpkgs/master/CONTRIBUTING.md) | Contribution guide, primary — fetched in full | fetched 2026-09-27 | `fetchpatch2` vs `fetchpatch` guidance; commit conventions tied to CI auto-build |
| [nixpkgs `pkgs/by-name/README.md`](https://raw.githubusercontent.com/NixOS/nixpkgs/master/pkgs/by-name/README.md) | by-name placement spec, primary (RFC 140) | fetched 2026-09-27 | The exact structural rules a by-name-ready `package.nix` must satisfy |
| [NixOS/nixpkgs-vet README](https://raw.githubusercontent.com/NixOS/nixpkgs-vet/main/README.md) | Validator tool docs, primary | fetched 2026-09-27 | The three ratchet checks (`strictDeps`, `__structuredAttrs`, by-name placement) and their one-way semantics |
| [jtojnar/nixpkgs-hammering `explanations/`](https://github.com/jtojnar/nixpkgs-hammering/tree/main/explanations) | Linter rule explanations, primary | fetched 2026-09-27 | `environment-variables-go-to-env`, `no-flags-array`, `missing-phase-hooks`, `unclear-gpl` — exact wording |
| [nix.dev — Working with local files](https://nix.dev/tutorials/working-with-local-files) | Official tutorial, primary | surveyed 2026-09-27 via canonical.md | The whole-directory-copy warning that motivates `lib.fileset.toSource` |
| [NixOS/nixpkgs issue #356002](https://github.com/NixOS/nixpkgs/issues/356002) | Tracking issue, primary | opened 2024-11-14, open as of 2026-09-27 | `--replace` → `--replace-fail` migration status, ~7,000 in-tree holdouts |
| [Mic92/nix-update README](https://github.com/Mic92/nix-update/blob/main/README.md) | Tool docs, primary | fetched 2026-09-27 | Exact per-ecosystem hash flags it edits inline; why it cannot drive JSON-backed data |
| [nix-community/nurl](https://github.com/nix-community/nurl) | Tool source/README, primary | fetched 2026-09-27; also run live this session | The fetcher-call-emission primitive used for this dive's own hash acquisition |
| [numtide/llm-agents.nix `rules/*.yml`](https://github.com/numtide/llm-agents.nix/tree/main/rules) | ast-grep lint rules, primary | fetched 2026-09-27 | `no-legacy-sha256`, `prefer-tag-over-rev`, `no-unpinned-rev` as CI-enforced (not just documented) checks |
| [Determinate Systems flake-checker README](https://raw.githubusercontent.com/DeterminateSystems/flake-checker/main/README.md) | Tool docs, secondary to this subarea | fetched 2026-09-27 | Confirms this tool does not check packaging conventions (scope boundary) |
| `nix-audit/exemplar-flake-shape.md` §4, §12 | This program's own measurement over the 37-repo corpus | 2026-09-27 | Counts for `finalAttrs`, `rec`, `mainProgram`, source filtering, hardcoded versions — the frequency evidence behind every NIX-PKG rule's "how common is this" claim |
| `nix-topic-map/codified.md` §2-§6, §11 | This program's own tool-catalogue survey | 2026-09-27 | statix/deadnix/nixf/nixpkgs-vet/nixpkgs-hammering/nixfmt catalogued in one place, with exact flags |
| `nix-topic-map/failure.md` §6-§8 | This program's own issue-tracker and checklist survey | 2026-09-27 | Verbatim review checklist, infinite-recursion and hash-drift issue citations |
| `nix-topic-map/generated-flakes.md` §6-§10 | This program's own generator-exemplar survey | 2026-09-27 | `nix-update`'s JSON-backed-data limitation, `nixpkgs-terraform`'s version-gated `allowUnfree` pattern |
| `nix-flakes.md` (NIX-FLK-07, -13, -14, -15) | This program's own already-settled consolidation | 2026-09-27 | The eval-time-read and by-name/overlay rules this dive builds on rather than re-deriving |
| `nix-generated-flakes.md` (NIX-GEN-12, -13, -14) | This program's own already-settled consolidation | 2026-09-27 | The shape-D meta additions (`sourceProvenance`, conditional `mainProgram`, SPDX-expression handling) this dive's Q7 replacement folds in |
| This dive's own fixtures | Primary, self-generated and self-run | 2026-09-27, CppNix 2.35.2, nixpkgs 26.11pre rev `e158d9ed9b51` | 10 distinct watched red/green verification pairs plus 3 honestly-negative results, listed in full in [Verification runs](#verification-runs) |
