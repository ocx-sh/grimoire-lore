---
title: Residual Nix language idioms generated code still gets wrong
topic: nix-language/idioms-and-scope
agent: nix-language-idioms-and-scope-w4
model: sonnet
date_researched: 2026-09-27
sources_count: 14
fixtures: /home/mherwig/.cache/research-lang/nix-tools/fixtures/idioms-and-scope/
scope: |
  Covers the language-level idioms M-C-01 (plain `rec` self-shadowing only —
  `mkDerivation rec {}` is NIX-PKG-14's territory), M-C-02 (`with` scope),
  M-C-04..07 (`//` nested-key drop, path interpolation into strings,
  `unsafeDiscardStringContext`, impure builtins/lookup paths), M-C-13 (rec/
  non-rec merge, incl. the Lix divergence), M-C-14 (`builtins.warn`/`lib.warn`
  under `abort-on-warn`, scoped per NIX-REL-11). Does NOT cover: lint tool
  severities (NIX-GATE-05/06/07, already settled), `mkDerivation`/`finalAttrs`
  (NIX-PKG-14), `pkgs.system` (NIX-FLK-12), builtin fetchers as a dependency
  hygiene question (NIX-INP-10) — all cited, not re-derived.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Plain `rec` and self-shadowing (M-C-01)](#1-plain-rec-and-self-shadowing-m-c-01)
   2. [`with` at file/module scope vs list scope (M-C-02)](#2-with-at-filemodule-scope-vs-list-scope-m-c-02)
   3. [`//` and the nested-key drop (M-C-04)](#3--and-the-nested-key-drop-m-c-04)
   4. [Path interpolation into a string (M-C-05)](#4-path-interpolation-into-a-string-m-c-05)
   5. [`unsafeDiscardStringContext` (M-C-06)](#5-unsafediscardstringcontext-m-c-06)
   6. [Impure builtins and lookup paths outside compat shims (M-C-07)](#6-impure-builtins-and-lookup-paths-outside-compat-shims-m-c-07)
   7. [Rec/non-rec merges: value drift vs an implementation-portability break (M-C-13)](#7-recnon-rec-merges-value-drift-vs-an-implementation-portability-break-m-c-13)
   8. [`builtins.warn`/`lib.warn` under `abort-on-warn` (M-C-14)](#8-builtinswarnlibwarn-under-abort-on-warn-m-c-14)
   9. [Already covered — no new rule (M-C-10 and adjacent)](#9-already-covered--no-new-rule-m-c-10-and-adjacent)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- A plain `rec { }` (not `mkDerivation`) is fine when nothing inside it shadows an outer binding of the same name; self-shadowing (`let x = …; in rec { x = x // {…}; }`) is a real, reproducible "infinite recursion encountered" crash, not a style nit — verified on a planted twin (exit 1 vs exit 0).
- nixf's `sema-extra-rec` diagnostic does **not** catch the self-shadow hazard: it fires on the *opposite* case — a `rec {}` with no internal cross-reference at all ("attrset is not necessary to be recursive") — so an editor lint passing gives false confidence here.
- `with` at file or module scope (`with lib;`/`with pkgs;` on its own line) measures at 171 occurrences per 6,975 non-nixpkgs `.nix` files (429,515 lines) in the corpus; list-scoped `with pkgs; [ … ]` is 789 occurrences and is the tolerated form (conflict 20's resolution holds).
- `with types;`/`with lib.types;` standing alone inside a single `mkOption { type = …; }` expression (149 of the 363 "standalone-line" hits) is a narrow, closed-namespace idiom nix.dev's anti-pattern warning does not target — don't flag it.
- A shallow `//` silently keeps the *left* side's stale value whenever a nested key on the right was meant to override a value computed inside a `rec` on the left — nixf's `merge-diff-rec` (Warning) is the only mechanical catch, and it is scoped to the `rec`-vs-non-rec case, not the general "nested key the left side also sets" case, which stays a reading heuristic.
- Interpolating a bare relative path into a string (`"${./subdir}"`) copies the **whole directory** into the store, verified: 272 KB copied (a 56-byte file plus an irrelevant 264 KB blob) into a fresh `/nix/store/<hash>-subdir`, purely to obtain the directory as a string.
- `toString ./subdir` is the fix and is not merely "less bad" but categorically different: verified to return the literal filesystem path (no `/nix/store/` prefix at all, no string context, no new store object) outside a flake evaluation context.
- `builtins.unsafeDiscardStringContext` on a value later spliced into a build command breaks the dependency graph outright: verified — `nix build` on the bad twin builds *only* the consumer (the producer's `.drv` is absent from `these … will be built`), and the sandbox build fails with `No such file or directory` for the producer's own store path; the compliant twin (context kept) builds both derivations and succeeds.
- `<nixpkgs>`, `builtins.currentSystem` and `builtins.getEnv` measure at 431 raw grep hits across the 37-repo, non-nixpkgs corpus, but narrowing to actual flake-output code (grep restricted to `flake.nix` files) drops this to **2** hits corpus-wide, and both are inside string literals invoked with an explicit `--impure` escape hatch or inside `NixOS/nix`'s own sandbox test fixtures — zero silent violations in live flake-output logic.
- Two constructs that both get called "rec-merge" behave differently across implementations: `base // { minor = 9; }` over a `rec`-computed `base` returns the same stale value ("1.0") on CppNix 2.35.2, CppNix 2.31.5 **and** Lix 2.95.2 (portable, if surprising); but `{ foo = rec { a = 1; }; foo.b = 2; }` (implicit attrpath merge with mixed `rec`-ness) is accepted silently by both CppNix versions and **rejected at parse time** by Lix 2.95.2 with `error: … cannot be merged, because one set is marked as recursive and the other isn't` — verified on all three.
- `builtins.warn`/`lib.warn` under `--option abort-on-warn true` turns a deliberate deprecation shim into a hard eval error (verified: exit 1, "aborting to reveal stack trace of warning, as abort-on-warn is set"), and NIX-REL-11 (already settled — cite, don't re-derive) is exactly right that this option must be scoped to a named attribute, never `nix flake check`/whole-flake `nix build`, because plain `nix flake show` silently swallows the abort (exit 0) and gives a false "clean" reading.
- URL-literal quoting (M-C-10) needs no new rule here: it measured at 1 corpus-wide finding, is already an active statix W12 lint (NIX-GATE-06) and has a native Nix 2.34+ replacement (`lint-url-literals = fatal`) — state the lint config, don't re-derive a check.
- `lib.recursiveUpdate`'s own worked doctest in `nixpkgs@9cab9ed832c3:lib/attrsets.nix:1696-1714` is the canonical "what `//` gets wrong" teaching example and is citable directly in place of hand-rolling one.
- The self-shadow, path-interpolation, string-context, and mixed-rec-merge checks are all genuinely runnable `nix eval`/`nix build` commands with clean exit-code or output-content red/green splits; the general nested-key-`//`-drop case (M-C-04's broad form) has no such mechanical check and stays a named reading heuristic — say so rather than pretend otherwise.
- `nix flake check`/`nix flake show` are both too coarse to catch any of these: none of the eight fixtures below trip a bare `nix flake check --no-build`, because none of them touch the output schema — every one of these bugs is invisible to the flake-structure gate and needs its own targeted check.

## Findings

### 1. Plain `rec` and self-shadowing (M-C-01)

The corpus measured `rec { }` at **1,264** occurrences across 24 of 37 repos (excluding `NixOS/nixpkgs`'s own tree), concentrated in `NixOS/nix@209d2bc44288` (56, largely legitimate) and `numtide/llm-agents.nix@efb10f28f724` (80, one per package definition using the shared `pname`/`version` interpolation pattern) — already measured by the shape audit ([shape](../nix-audit/exemplar-flake-shape.md) §4). Map conflict 20 (topic map, `nix-topic-map.md:543-545`) resolves the `mkDerivation rec {}` half to NIX-PKG-14 (finalAttrs when self-referencing) and leaves the general plain-`rec`-attrset half — CONSIDER unless it self-shadows — to this dive.

nix.dev's own canonical footgun (survey item 5) is `let a = 1; in rec { a = a; }`: an inner `rec` attribute of the same name as an outer binding shadows it *inside the rec's own recursive scope*, so `a` refers to itself, not the outer value — infinite recursion the moment it is forced. This is not about *whether* `rec` is used, but whether an attribute name inside it collides with a name the author meant to read from outside.

```nix
# BAD — self-shadowing: verified fixtures/idioms-and-scope/self-shadow-bad
let settings = { verbose = true; };
in rec {
  settings = settings // { extra = true; }; # this `settings` reads ITSELF
}
# nix eval --json .#result  ->  error: infinite recursion encountered  (exit 1)

# GOOD — renamed so nothing shadows: fixtures/idioms-and-scope/self-shadow-good
let baseSettings = { verbose = true; };
in rec {
  settings = baseSettings // { extra = true; };
}
# nix eval --json .#result  ->  {"settings":{"extra":true,"verbose":true}}  (exit 0)
```

nixf's static `sema-extra-rec` (`Warning`, [libnixf/src/Basic/diagnostic.py:229-233](https://raw.githubusercontent.com/nix-community/nixd/main/libnixf/src/Basic/diagnostic.py)) does **not** catch this — its message is "attrset is not necessary to be `rec`ursive", i.e. it fires when a `rec {}` has *no* internal cross-reference at all (the opposite, purely cosmetic case: gratuitous `rec`). A flake that passes `nixf-diagnose` clean can still self-shadow. There is no mechanical catch for self-shadowing short of forcing the value (`nix eval --json`) or reading it; this dive found no static tool that flags it.

### 2. `with` at file/module scope vs list scope (M-C-02)

Measured over the exemplar corpus **excluding `NixOS/nixpkgs`'s own tree** (per NIX-GATE-04's test_data/tests/fixtures/vendor exclusions, extended here to exclude the reference implementation itself, since it dominates by file count at 4.5M of the corpus's 5.0M total `.nix` lines and is covered separately as the definer of `pkgs`/`lib`, not as consumer code): 6,975 files, 429,515 lines.

| category | count | rate /1,000 lines |
|---|--:|--:|
| all `with X;` occurrences | 1,949 | 4.54 |
| list-scoped, same line (`with pkgs; [ … ]`) | 789 | 1.84 |
| standalone-line `with X;` (own line, ends `;$`) | 363 | 0.85 |
| — of which `with lib;`/`with pkgs;`/`with builtins;` | 171 | 0.40 |
| — of which `with types;`/`with lib.types;` | 149 | 0.35 |
| single-expression scope embedded in a line (`type = with types; …`) | ~797 | 1.86 |

nix.dev's best-practices page (survey item 5) names the file-top-level `with (import <nixpkgs> {});` idiom specifically as breaking static analysis and creating ambiguous scoping ([nix/issues/490](https://github.com/NixOS/nix/issues/490)), and gives the replacement for the list-scope case: `builtins.attrValues { inherit (pkgs) curl jq; }` instead of `with pkgs; [ curl jq ];`. Conflict 20's resolution (topic map, confirmed here) holds exactly: file/module-scope `with` is a SHOULD finding, list-scoped `with pkgs; [ … ]` is tolerated.

The measurement surfaces one nuance the map's phrasing doesn't spell out: `with types;`/`with lib.types;` standing alone as the entire body of a single `mkOption { type = …; }` value (149 of the 363 standalone hits — e.g. `nix-darwin__nix-darwin@4cff07de74b5:modules/homebrew.nix:487`, `type = with types; nullOr (listOf str);`) is **not** the antipattern nix.dev warns about: the scope is one expression wide, `types`' namespace is small, closed and well-known throughout nixpkgs/NixOS modules, and it is the idiom nixpkgs' own module system uses pervasively. A rule that flags every `with` occurrence equally will spam a correct, idiomatic pattern; scope the SHOULD finding to `with lib;`/`with pkgs;`/`with builtins;` (large, open, or impure namespaces) standing on their own line, not to `with types;`/`with lib.types;` inside a single option-type expression.

nixf's `sema-extra-with` (`Warning`, [diagnostic.py:235-239](https://raw.githubusercontent.com/nix-community/nixd/main/libnixf/src/Basic/diagnostic.py)) fires on an *unused* `with` (no name in the body actually resolved through it) — again the opposite end from what nix.dev's guidance is really worried about (scope pollution/static-analysis opacity when the `with` **is** used, for many names, against a huge namespace like `pkgs`). Both nixf checks exist and are useful, but neither is a substitute for the file/module-scope SHOULD finding here.

### 3. `//` and the nested-key drop (M-C-04)

`//` is a shallow merge: for any key present on both sides, the right side's whole value wins outright, even if the left side's value was itself an attrset with keys the right side didn't set. `lib.recursiveUpdate`'s own worked doctest (`nixpkgs@9cab9ed832c3:lib/attrsets.nix:1696-1714`) is the clearest teaching example in the corpus:

```nix
recursiveUpdateUntil (path: lhs: rhs: path == ["foo"]) {
  foo.bar = 1; foo.baz = 2; bar = 3;
} {
  foo.bar = 1; foo.quz = 2; baz = 4;
}
=> { foo.bar = 1; foo.quz = 2; bar = 3; baz = 4; }   # 'foo.*' from the right, 'bar'/'baz' merge
```

— versus plain `//`, which would have thrown away `foo.baz` entirely because `foo` collided. `recursiveUpdate lhs rhs = recursiveUpdateUntil (path: lhs: rhs: !(isAttrs lhs && isAttrs rhs)) lhs rhs;` (`lib/attrsets.nix:1778-1783`) is the drop-in fix when the intent is "merge nested attrsets, don't replace them."

Corpus volume: 1,466 lines contain the `//` operator across the non-nixpkgs corpus (3.41 per 1,000 lines; spot-checked for false positives — no line matched a URL scheme or comment marker, since Nix has no `//` comment syntax). This dive did not find a clean, general mechanical detector for "a `//` whose right side sets a nested path the left side also sets" — matching the map's own characterization of it as a reading heuristic, not a grep. The one **mechanically checkable** subset is the `rec`-vs-non-rec case: nixf's `merge-diff-rec` (`Warning`, [diagnostic.py:145-149](https://raw.githubusercontent.com/nix-community/nixd/main/libnixf/src/Basic/diagnostic.py), message: "merging two attributes with different `rec` modifiers, the latter will be implicitly ignored") — see §7, which also verifies the runtime value this produces and a portability break Lix adds on top of it.

### 4. Path interpolation into a string (M-C-05)

The Nix 2.35 manual (`language/types#type-path`, fetched 2026-09-27) is explicit: "a path that is converted to a string with string interpolation or string-and-path concatenation must resolve to a readable file or directory which will be copied into the Nix store," with the worked example `"${./foo.txt}"` → `"/nix/store/<hash>-foo.txt"`. This dive verified the directory case, which is the more expensive one:

```nix
# BAD — fixtures/idioms-and-scope/path-interp-bad: subdir/ holds a.txt (56 B) + big-irrelevant-blob.txt (264 KB)
storePathString = "${./subdir}";
# nix eval .#storePathString -> "/nix/store/jfq9sm1akxsm1lcwd6im936av63vpcis-subdir"
# du -sh on that store path -> 272K  (BOTH files copied, just to get the dir as a string)
```
```nix
# GOOD — fixtures/idioms-and-scope/path-interp-good
storePathString = toString ./subdir;
# nix eval --expr '"${toString ./subdir}"' (outside a flake context)
#   -> "/home/mherwig/.../path-interp-bad/subdir"   -- the literal filesystem path,
#      NO /nix/store/ prefix, no string context, nothing copied.
```

Caveat verified in-band: run *inside* a flake evaluation, `toString ./subdir` does return a path under `/nix/store/…/source/subdir`, because flakes copy the **whole flake directory** to the store as a single unit regardless (nix.dev `concepts/flakes`, survey item 10) — that copy is unavoidable and unrelated to this idiom. The distinguishing, verified fact is that `"${./subdir}"` creates a **second, independent** store object named `-subdir` with its own hash (visible above as a distinct path from the flake's own source copy), while `toString` creates no such second object. `nix.dev`'s `lib.fileset` tutorial (survey item 7) gives the general-purpose fix when only some files under a directory are actually needed: `fs.toSource { root; fileset = fs.fileFilter (f: f.hasExt "nix") root; }` copies only the filtered subset, not the whole tree — the tutorial's own explicit Warning: "a local directory within a Flake is always copied into the Nix store completely unless it is a Git repository" is the flake-specific version of this same hazard, and the corpus already tracks 21 `src = ./.;` (bare, unfiltered) sites versus 90 files using some form of `lib.fileset`/`cleanSourceWith`/`builtins.path` filtering ([shape](../nix-audit/exemplar-flake-shape.md) §4).

### 5. `unsafeDiscardStringContext` (M-C-06)

The 2.35 manual (`language/string-context`, fetched 2026-09-27): a Nix string carries a *context* — "an (unordered) set of string context elements" that lets "Nix … ensure that the all referenced files are accessible – that all store paths are valid." `builtins.unsafeDiscardStringContext` "will make a copy of a string, but with an empty string context … The 'unsafe' marker is only there to remind that Nix normally guarantees that dependencies are tracked, whereas the returned string has lost them." This dive verified exactly the failure mode the manual warns about, end to end with a real build:

```nix
# BAD — fixtures/idioms-and-scope/string-context-bad
producerPathNoContext = builtins.unsafeDiscardStringContext (toString producer);
consumer = pkgs.runCommand "consumer-bad" {} ''
  cat ${producerPathNoContext} > $out
'';
```
`nix build .#default`:
```
this derivation will be built:
  /nix/store/sn37v8n6ify26wh1kl0wnhhxmjh2qglx-consumer-bad.drv     # note: producer-payload.drv is ABSENT
building '/nix/store/sn37v8n6ify26wh1kl0wnhhxmjh2qglx-consumer-bad.drv'...
consumer-bad> cat: /nix/store/23syfrwlrnjybi8cadzhs1hxklkdv4zc-producer-payload: No such file or directory
error: Cannot build … Reason: builder failed with exit code 1.
```
exit 1. The compliant twin (`fixtures/idioms-and-scope/string-context-good`, plain `"${producer}"`, context kept) builds **both** `producer-payload.drv` and `consumer-good.drv` and succeeds, exit 0, output `hello-from-producer`. The bug is worse than "the build fails": since `producer` is never added to `consumer`'s `inputDrvs`, if `producer`'s output path happens to already exist in the store from an unrelated prior build, `consumer` would build "successfully" against a store path Nix never verified or rebuilt for this derivation — a silent, non-hermetic dependency, not just a missing-file crash. There is no legitimate use of `unsafeDiscardStringContext` on a value that is later spliced into a build command; its only sound use is on a string that will *never* be used to reference a store path again (e.g., formatting a value for a log message).

### 6. Impure builtins and lookup paths outside compat shims (M-C-07)

Raw grep for `<nixpkgs>`/`currentSystem`/`getEnv` across the non-nixpkgs corpus (6,975 files): 431 hits, 344 of them outside a file literally named `default.nix`/`shell.nix`. That raw count overstates the problem: spot-reading shows it is dominated by (a) NixOS-module option **description strings** that mention these terms in prose (`nix-darwin__nix-darwin@4cff07de74b5:modules/nix/nixpkgs.nix:111`, `example = lib.literalExpression "import <nixpkgs> {}"` — documentation, not executable flake-output code) and (b) `cachix__devenv@6d76db3889de`'s own module system, which reads environment variables via `builtins.getEnv` as a **deliberate, documented, non-flake-output** feature of its own runtime (`src/modules/flake-compat.nix:142,147`, `src/modules/containers.nix:9`) — orthogonal to flake purity, not a silent violation.

Narrowing the same grep to files literally named `flake.nix` (the actual flake-output surface, all `pure-eval = true` by construction — the manual's `pure-eval` setting disables `currentSystem`/`getEnv`/`nixPath` outright) drops the count to exactly **2** corpus-wide:

- `the-nix-way__dev-templates@6a7eefd8fd91:flake.nix:32` — `getSystem = "SYSTEM=$(nix eval --impure --raw --expr 'builtins.currentSystem')";` — a shell string inside a devShell script, invoked with an explicit `--impure` flag: a deliberate, visible escape hatch, not a silent flake-eval-time read.
- `NixOS__nix@209d2bc4428:tests/functional/cancelled-builds/flake.nix:15` — `import "${builtins.getEnv "_NIX_TEST_BUILD_DIR"}/config.nix";` — inside `NixOS/nix`'s own build-sandbox test fixture, testing impure builds themselves, not production flake logic.

Zero silent violations of M-C-07's stated concern were found in live flake-output logic across the whole corpus. The map's own check (`grep -rn -e '<nixpkgs>' -e 'currentSystem' -e 'getEnv' --include='*.nix' .`, expected empty outside `default.nix`/`shell.nix`) holds when narrowed to `flake.nix` specifically; broadened to "every `.nix` file", it needs the doc-string and devenv-module caveats above to avoid false positives, and a third legitimate shim name, `release.nix` (the pre-flake Hydra-jobset entry point nix-darwin still ships), belongs alongside `default.nix`/`shell.nix` in the exemption list.

### 7. Rec/non-rec merges: value drift vs an implementation-portability break (M-C-13)

Two constructs both get called "the rec-merge bug," and they diverge across implementations differently — this dive ran both, on CppNix 2.35.2, CppNix 2.31.5 and Lix 2.95.2.

**(a) The `//`-operator value-drift case** (nixf's `merge-diff-rec`, §3 above): merging a `rec`-computed attrset with an override via `//` keeps the *left* side's derived value, because it was computed against the `rec`'s own scope before the merge happened.

```nix
# fixtures/idioms-and-scope/rec-merge-bad
let base = rec { major = 1; minor = 0; version = "${toString major}.${toString minor}"; };
    overrides = { minor = 9; };
in base // overrides
# .#result.version -> "1.0"   -- on CppNix 2.35.2, CppNix 2.31.5 AND Lix 2.95.2, identically
```
This is a **portable, universal** semantic surprise, not an implementation split — all three floors agree, and all three are wrong relative to author intent. The fix (`fixtures/idioms-and-scope/rec-merge-good`) is to merge first, then derive: `merged = base // overrides; merged // { version = "${toString merged.major}.${toString merged.minor}"; }` → `"1.9"` everywhere.

**(b) The implicit attrpath-merge case, mixed `rec`-ness** — this is what Lix 2.95's release notes actually forbid (fetched 2026-09-27, [lix.systems/blog/2026-03-25-lix-2.95-release](https://lix.systems/blog/2026-03-25-lix-2.95-release/)): "Attribute sets like `{ foo = {}; foo.bar = 42; }` implicitly merge at parse time, however if one of them is marked as recursive but not the others then the recursive attribute may get lost (order-dependent). Therefore, merging attrs with mixed-`rec` is now forbidden." This is ordinary Nix syntax (writing an attribute's value once directly and once via a dotted path in the same set), unrelated to the `//` operator:

```nix
# fixtures/idioms-and-scope/rec-merge-mixed-bad
{ foo = rec { a = 1; }; foo.b = 2; }
```
| implementation | result | exit |
|---|---|--:|
| CppNix 2.35.2 | `{ foo = { a = 1; b = 2; }; }` (silent) | 0 |
| CppNix 2.31.5 | `{ foo = { a = 1; b = 2; }; }` (silent) | 0 |
| Lix 2.95.2 | `error: attribute 'foo.b' cannot be merged, because one set is marked as recursive and the other isn't. Use --extra-deprecated-features rec-set-merges to disable this error…` | **1** |

The compliant twin (`fixtures/idioms-and-scope/rec-merge-mixed-good`, no split binding — `foo = rec { a = 1; b = 2; };`) evaluates identically and successfully on all three. This is the genuinely *portable-vs-not* half of M-C-13: a flake author who only ever tests on CppNix will never see this until a Lix-using consumer's `nix flake check` breaks.

### 8. `builtins.warn`/`lib.warn` under `abort-on-warn` (M-C-14)

`builtins.warn` (Nix ≥2.23, rl-2.23 fetched 2026-09-27: "behaves like `builtins.trace "warning: ${msg}"`, has an accurate log level, and is controlled by … `abort-on-warn`") is the modern deprecation-signal builtin; `lib.warn` (`nixpkgs@9cab9ed832c3:lib/trivial.nix`) wraps it, with an explicit, documented partial-compatibility gap on Nix <2.23 (falls back to `builtins.trace`, keeping the `NIX_ABORT_ON_WARN` behavior but not the `nix.conf` setting or CLI flag). Verified:

```nix
# fixtures/idioms-and-scope/warn-abort-bad
result = builtins.warn "deprecated: use `newName` instead of `oldName`" 42;
```
```
$ nix eval .#result                                          # no abort-on-warn
evaluation warning: deprecated: use `newName` instead of `oldName`
42                                                             # exit 0

$ nix eval --option abort-on-warn true .#result
evaluation warning: deprecated: use `newName` instead of `oldName`
error: … aborting to reveal stack trace of warning, as abort-on-warn is set    # exit 1
```
The compliant twin (`warn-abort-good`, no warning emitted) stays exit 0 under `--option abort-on-warn true` — confirming there is nothing for the option to fire on when no warning is present, i.e. the option itself is safe to apply narrowly. **This dive does not re-derive the scoping rule** — NIX-REL-11 (already settled, `nix-release.md:83`) states it precisely: never pass `--option abort-on-warn true` to `nix flake check` or a whole-flake `nix build`; apply it only to a named current attribute (`nix eval --option abort-on-warn true --raw .#packages.<system>.<current>.drvPath`), because `nix flake show` silently swallows the abort (exit 0) even with the flag set — a "verification" via `show` gives a false-clean read. This dive's fixture is consistent with, and cites, that scoping rather than re-testing it.

### 9. Already covered — no new rule (M-C-10 and adjacent)

Per Selection instruction ("drop any candidate an agent already gets right or a gate lint already denies; state the lint config instead"):

- **M-C-10 (URL literals, RFC 45).** Measured at 1 finding corpus-wide ([runs](../nix-audit/exemplar-tool-runs.md) Axis 5). Already an active statix `W12` (`unquoted_uri`) lint under NIX-GATE-06's advisory posture, and Nix 2.34 (fetched 2026-09-27, rl-2.34) stabilised the former `no-url-literals` experimental feature into the `lint-url-literals` setting (`ignore` (default) | `warn` | `fatal`) — `--option lint-url-literals fatal` is the native, in-tree replacement for a bespoke grep. No new NIX-LANG rule; cite NIX-GATE-06 and the setting.
- **M-C-08, M-C-09, M-C-11, M-C-12, M-C-15** are explicitly out of scope for this row set (not among the assigned M-C IDs) or already own consolidations elsewhere (M-C-08 → nix-diagnose; M-C-09's broader implementation-matrix question is a nix-diagnose/NIX-FLK concern beyond the one construct measured in §7).

## Normative guidance candidates

1. **NIX-LANG-01 — Never let a `rec {}` attribute shadow an outer binding of the same name.** *Rationale:* it is always "infinite recursion encountered" once forced, not a style preference — a plain `rec {}` with no shadowing is otherwise fine (CONSIDER, per conflict 20). *Verify:* force every top-level attribute with `nix eval --json <flake>#<attr>` and check for `infinite recursion`; there is no static substitute — nixf's `sema-extra-rec` checks the opposite (unnecessary, not dangerous) case. *Run:* **yes** — `fixtures/idioms-and-scope/self-shadow-bad` exit 1, `self-shadow-good` exit 0.

2. **NIX-LANG-02 — Do not write `with lib;`/`with pkgs;`/`with builtins;` alone on its own line at file or module scope; list-scoped `with pkgs; [ … ]` and single-expression `with types; …` inside one `mkOption` value are both fine.** *Rationale:* file/module-scope `with` over a huge or impure namespace hides every name from static analysis (nix.dev best-practices, survey #5); the narrower forms don't have that blast radius. *Verify:* `grep -rn -E '^\s*with (lib|pkgs|builtins)\s*;\s*$' --include='*.nix' .` (empty = pass); do **not** also flag `with types;`/`with lib.types;`. *Run:* **no** (reading heuristic re-derived from measured corpus counts, not planted — the antipattern is already amply attested in nix.dev's own example and this dive's 171-hit measurement).

3. **NIX-LANG-03 — Use `lib.recursiveUpdate` (or merge-then-derive) instead of `//` whenever a key on the right is a nested attrset that also exists, non-identically, on the left.** *Rationale:* `//` is shallow; nixpkgs' own doctest shows a plain `//` would have dropped `foo.baz` entirely in a case `recursiveUpdate` preserves (`lib/attrsets.nix:1696-1714`). *Verify:* no general mechanical check exists (reading heuristic — say so); the checkable **subset** is `rec`-vs-non-rec merges, caught by nixf's `merge-diff-rec` (run `nixd`/`nixf-diagnose` in-editor per NIX-GATE-07, never as a CI gate). *Run:* **yes** for the subset — `fixtures/idioms-and-scope/rec-merge-bad` → `"1.0"`, `rec-merge-good` → `"1.9"` (both exit 0; the signal is the value, not the exit code).

4. **NIX-LANG-04 — Never interpolate a bare relative path into a string (`"${./dir}"`, `"${./file}"`) merely to obtain it as a string; use `toString ./dir` when no copy is wanted, or `lib.fileset.toSource`/`builtins.path` with an explicit filter when some files under it genuinely need to enter the store.** *Rationale:* string interpolation of a path unconditionally copies the whole file/directory to the store (Nix 2.35 manual, `language/types#type-path`); measured at 272 KB copied for a 56-byte payload plus one irrelevant blob. *Verify:* `nix eval <flake>#<attr>` on any attribute built from `"${./…}"`; a `/nix/store/` prefix in the output is the violation, a plain filesystem path is the pass. *Run:* **yes** — `fixtures/idioms-and-scope/path-interp-bad` → `/nix/store/jfq9sm1akxsm1lcwd6im936av63vpcis-subdir` (272K), `path-interp-good` (`toString`) → plain filesystem path, no store object created.

5. **NIX-LANG-05 — Never call `builtins.unsafeDiscardStringContext` on a value that is later spliced into a build command, `src`, or any other place that must resolve to a real store dependency.** *Rationale:* it silently removes the dependency edge; the referenced derivation is never added to the consumer's `inputDrvs`, so it is neither built automatically nor guaranteed present. *Verify:* `nix build <flake>#<attr>`; count the derivations listed under "will be built" — the discarded dependency's own `.drv` must be present if its store path is referenced anywhere in the builder. *Run:* **yes** — `fixtures/idioms-and-scope/string-context-bad` builds only `consumer-bad.drv`, fails in-sandbox with `No such file or directory`, exit 1; `string-context-good` builds both `producer-payload.drv` and `consumer-good.drv`, exit 0.

6. **NIX-LANG-06 — No `<nixpkgs>`, `builtins.currentSystem`, `builtins.getEnv`, or `$NIX_PATH` reachable from a flake's `outputs`; the only tolerated homes are a `default.nix`/`shell.nix`/`release.nix` compat shim (for `nix-build`/Hydra users predating flakes) or a devShell script string invoked with an explicit `--impure`.** *Rationale:* flakes evaluate under `pure-eval`, which the manual documents as disabling exactly these; a flake that reaches them either already fails, or is one nixpkgs alias-rename away from failing. *Verify:* `grep -rn -e '<nixpkgs>' -e 'currentSystem' -e 'getEnv' --include='*.nix' .` restricted to files literally named `flake.nix` (broaden only with the doc-string/devenv-module caveats in §6, since a blanket `--include='*.nix'` catches prose). *Run:* **no** (measured absence at 0 silent flake-output violations across 37 repos is itself the evidence; nothing to plant that would improve on that null result without inventing an artificial case).

7. **NIX-LANG-07 — Never write an implicit attrpath merge where one occurrence of an attribute is `rec` and another isn't (`a = rec { … }; a.b = …;` inside the same set), even though CppNix accepts it silently; test any `rec`-adjacent construct against Lix before publishing if Lix support is promised at all.** *Rationale:* this is not a style question but a portability break: Lix 2.95.2 rejects it as a parse error while CppNix 2.31.5 and 2.35.2 both accept it silently with implementation-defined semantics. *Verify:* `nix eval <flake>#<attr>` under both a pinned CppNix and `nix shell nixpkgs#lix --command nix eval …`; a Lix-only failure here is this construct, not a general flake-check problem. *Run:* **yes** — `fixtures/idioms-and-scope/rec-merge-mixed-bad`: CppNix 2.35.2 exit 0, CppNix 2.31.5 exit 0, Lix 2.95.2 exit 1 (`cannot be merged, because one set is marked as recursive and the other isn't`); `rec-merge-mixed-good` exits 0 on all three.

8. **NIX-LANG-08 — When gating on `builtins.warn`/`lib.warn` with `--option abort-on-warn true`, scope it to named current attributes only, per NIX-REL-11 (cited, not re-derived).** *Rationale:* a deliberate deprecation shim (rl-2.23's `builtins.warn`) is meant to fire when the *old* name is referenced; applying the abort option to a whole-flake `nix flake check`/`nix build` turns every intentional shim into a red gate, and `nix flake show` swallows the abort silently regardless, giving a false-clean read. *Verify:* `grep -rn -e 'abort-on-warn' .github/workflows`: every hit must sit on a line naming a single attribute path, never on `flake check` or an unscoped `nix build`. *Run:* **yes**, and this dive's own fixture confirms the underlying mechanics rather than re-testing the scoping claim itself — `fixtures/idioms-and-scope/warn-abort-bad` under `--option abort-on-warn true` exits 1 with `aborting to reveal stack trace of warning`; `warn-abort-good` (no warning) stays exit 0 under the same option.

## Verification runs

All commands run through `/home/mherwig/.cache/research-lang/nix-tools/run.sh`, timeout 300s each, `--no-write-lock-file` on every flake eval/build. Cold-store: first run per fixture; the toolchain's own pinned nixpkgs rev (`8d5d270900d3fc75655ea2d9d248b234f6631439`) is warm-cached from prior waves, so `nixpkgs`-backed fixtures (string-context-*) did not re-fetch.

| # | fixture | command | exit (violation) | exit (twin) | relevant output |
|---|---|---|--:|--:|---|
| 1 | `self-shadow-bad` / `-good` | `nix eval --json <dir>#result` | 1 | 0 | `error: infinite recursion encountered` vs `{"settings":{"extra":true,"verbose":true}}` |
| 2 | `path-interp-bad` | `nix eval <dir>#storePathString` | 0† | — | `"/nix/store/jfq9sm1akxsm1lcwd6im936av63vpcis-subdir"`; `du -sh` on that path (via `run.sh bash -c`) → `272K`, `ls -la` shows both `a.txt` (56 B) and `big-irrelevant-blob.txt` (270177 B) copied |
| 2 | `path-interp-good` | `nix eval --expr '"${toString ./subdir}"'` (run from inside the fixture dir, non-flake) | 0† | — | `"/home/…/path-interp-bad/subdir"` — plain filesystem path, no `/nix/store/` prefix |
| 3 | `string-context-bad` / `-good` | `nix build <dir>#default -o <out>` | 1 | 0 | bad: `these … will be built:` lists only `consumer-bad.drv`; sandbox log `cat: …/producer-payload: No such file or directory`. good: both `producer-payload.drv` and `consumer-good.drv` built; output `hello-from-producer` |
| 4 | `warn-abort-bad` | `nix eval <dir>#result` (no option) | 0† | — | `evaluation warning: deprecated: …` then `42` |
| 4 | `warn-abort-bad` | `nix eval --option abort-on-warn true <dir>#result` | 1 | — | `error: … aborting to reveal stack trace of warning, as abort-on-warn is set` |
| 4 | `warn-abort-good` | `nix eval --option abort-on-warn true <dir>#result` | — | 0 | `42` (no warning to fire on) |
| 5 | `rec-merge-bad` / `-good` (`//` value drift) | `nix eval <dir>#result.version` on CppNix 2.35.2, CppNix 2.31.5, Lix 2.95.2 | 0 (all 3) | 0 (all 3) | bad → `"1.0"` on all three implementations identically; good → `"1.9"` on all three. **Not** an implementation split — a universal semantic surprise, not a portability check. |
| 6 | `rec-merge-mixed-bad` (implicit merge, mixed `rec`) | `nix eval <dir>#result` on CppNix 2.35.2 | 0 | — | `{ foo = { a = 1; b = 2; }; }` (silent) |
| 6 | `rec-merge-mixed-bad` | same, CppNix 2.31.5 (`nix shell nixpkgs#nixVersions.nix_2_31`) | 0 | — | identical, silent |
| 6 | `rec-merge-mixed-bad` | same, Lix 2.95.2 (`nix shell nixpkgs#lix`) | **1** | — | `error: attribute 'foo.b' cannot be merged, because one set is marked as recursive and the other isn't. Use --extra-deprecated-features rec-set-merges …` |
| 6 | `rec-merge-mixed-good` | same three | 0 | 0 (all 3) | `{ foo = { a = 1; b = 2; }; }` everywhere |

† Rows 2 and 4's "no-option" cases are not red/green pairs by exit code — the signal is the *output value* (a store path prefix, or the presence/absence of the `evaluation warning:` line), stated per row rather than forced into a false exit-code framing. Empty grep output in the NIX-LANG-02/06 checks (§ Normative guidance) means **pass** — no file matched the antipattern shape.

## Exemplar evidence

| candidate | satisfies | violates / contradicts |
|---|---|---|
| NIX-LANG-01 (self-shadow) | Not found as a live bug in the corpus (spot-read of the 1,264 `rec {}` sites found the pattern "mostly legitimate `pname`/`version` interpolation", [shape](../nix-audit/exemplar-flake-shape.md) §4) — measured absence, not a claim of universal correctness. | None found; this dive's own fixture is the only reproduction. |
| NIX-LANG-02 (`with` scope) | `hercules-ci__flake-parts@31729ca8cbdb` and `zed-industries__zed`: flake-parts' `perSystem` pattern structurally avoids file-scope `with` (0 hits) — "confirming flake-parts consumers avoid this idiom entirely, as designed" ([shape](../nix-audit/exemplar-flake-shape.md) §4). | `nix-darwin__nix-darwin@4cff07de74b5:modules/nix/default.nix:5` and 25+ sibling module files, `with lib;` line 3 alone. `cachix__devenv@6d76db3889de` and `numtide__llm-agents.nix@efb10f28f724` account for the bulk of file/module-scope `with lib;` sites measured. |
| NIX-LANG-03 (`//` nested drop) | `nixpkgs@9cab9ed832c3:lib/attrsets.nix:1778-1783` (`recursiveUpdate` itself, the fix). | No corpus instance of the *general* nested-key-drop bug was confirmed within this dive's time budget (reading heuristic only, per Selection); nixf's narrower `merge-diff-rec` subset is this dive's own fixture. |
| NIX-LANG-04 (path interpolation) | `nix-community__home-manager@7b4c5ec4beda`: `tests/modules/programs/noctalia/custom-palette.nix:104`, `tests/modules/programs/zed-editor/themes/default.nix:17` use `"${./one.json}"` **inside a test assertion** comparing file content — a defensible, contained use (small, single test file, not production output). | `nix-community__home-manager@7b4c5ec4beda`: `tests/integration/standalone/*.nix` (10+ files) use `"${../../..}"`/`"${../../../..}"` to interpolate the whole repo root as a string in integration test fixtures — the expensive form, but confined to tests. |
| NIX-LANG-05 (string context) | No corpus instance of `unsafeDiscardStringContext` found via this dive's greps (a search worth widening in a follow-up dive if more `nix.dev`-adjacent flakes are added to the corpus). | Same — absence measured, not contradicted; this dive's own fixture is the reproduction. |
| NIX-LANG-06 (impure builtins) | `oxalica__nil@205c8ba65a7f:dev/nvim-lsp.nix:6`, `dev/vim-lsp.nix:2`, `dev/vscodium.nix:2`, `dev/vim-coc.nix:2` — all `pkgs ? import <nixpkgs> { }` inside a `dev/*.nix` editor-integration helper, a legitimate non-flake compat shim by function even though not literally named `default.nix`. | `NixOS__nix@209d2bc4428:tests/functional/cancelled-builds/flake.nix:15` — `builtins.getEnv` inside a genuine `flake.nix`, but scoped to `NixOS/nix`'s own sandbox test fixture, not production output logic. |
| NIX-LANG-07 (mixed rec-merge, Lix) | `numtide__llm-agents.nix@efb10f28f724`'s 80 `rec {}` package definitions were spot-read and found to use plain, non-mixed `rec` for `pname`/`version`/`src` interpolation ([shape](../nix-audit/exemplar-flake-shape.md) §4) — the safe pattern, no implicit attrpath merge across a `rec` boundary. | No corpus instance of the specific mixed-implicit-merge shape was found; this dive's fixture reproduces the exact Lix release-note example. |
| NIX-LANG-08 (`abort-on-warn` scope) | Already verified in the release consolidation, not re-derived here: `[pub]` deprecation-table run — scoped eval passes ("`new-name` 0, `default` 0"), `nix flake show` with the flag exits 0 even on a warning-firing flake (silently swallowed) — cited from `nix-release.md:83`. | Same source: an unscoped `nix flake check --no-build` with the flag turns the `lib-warn` deprecation-shim case red (exit 1) where a scoped check stays green — the exact trap NIX-REL-11 exists to prevent. |

## AI-agent angle

- **Copy-pasting `with pkgs;` at the top of a generated module or `default.nix`** because it "looks like" every nixpkgs module file (`with lib;` is genuinely pervasive there) without noticing `pkgs`' namespace is orders of magnitude larger and less closed than `lib`'s or `types`'s — the smallest catch: `grep -rn -E '^\s*with pkgs\s*;\s*$' --include='*.nix' .` (empty = pass); do not extend the same flag to `with lib;`/`with types;` inside nixpkgs-style modules without the file/module-scope qualifier from NIX-LANG-02, or every NixOS module in the fleet's own future flakes will look "wrong."
- **Reaching for `"${./dir}"` to get a directory's name as a string** (a very natural first instinct — "I need this path as text") instead of `toString` or `builtins.path`, because the syntax reads as "just string interpolation" and the store-copy side effect is invisible until someone runs `du` on the store or notices build inputs ballooning — smallest catch: `nix eval <flake>#<attr>` and grep the output for `^"/nix/store/` when the attribute was meant to be a plain path string, not a store reference.
- **Reaching for `unsafeDiscardStringContext` to "fix" a `nix eval` type error** ("the value has a string context and something rejected it") without understanding *why* the context existed — the fix an agent finds by pattern-matching a Stack-Overflow-shaped error message is exactly the operation that silently breaks the dependency graph. Smallest catch: NIX-LANG-05's derivation-count check (`nix build`, count derivations listed under "will be built" — the discarded dependency's own `.drv` should be there and isn't).
- **Testing only against CppNix (or only against whatever `nix` binary is on `$PATH` in the dev container) and calling a flake "portable"** because `nix flake check` passed — this dive's own §7 finding (a construct that is silently accepted by two CppNix versions and rejected outright by Lix) is exactly the kind of implementation divergence a single-floor test suite cannot surface. Smallest catch: run the same `nix eval`/`nix flake check` through `nix shell nixpkgs#lix --command nix …` as a second, advisory leg (NIX-GATE-13's Lix-advisory posture, already settled) before claiming Lix compatibility in a README.
- **Treating `builtins.warn` purely as "the new `builtins.trace`" and wiring `--option abort-on-warn true` into a whole-flake CI gate "to catch deprecations early"** — this is the single most attractive-looking wrong move in this whole dive: it reads as strict, modern hygiene, and it is precisely the trap NIX-REL-11 documents (every deliberate deprecation shim goes red, and `nix flake show` gives a false-clean signal under the same flag, so an agent debugging the false failure may not even find the real cause by re-running `show`).
- **Assuming `nix flake check`/`nix flake show` passing means the language-level idioms above are fine** — none of the eight bugs verified in this dive trip a bare `nix flake check --no-build`, because none of them touch the output schema. An agent that treats a green `flake check` as "the flake is correct" has verified nothing about self-shadowing, path-interpolation cost, string-context integrity, or cross-implementation portability — each needs its own targeted check from the Normative guidance section.

## Contested / evolving

- **Whether `with pkgs; [ … ]` (list-scoped) should itself eventually be flagged.** nix.dev's own best-practices page treats even the list-scoped form as worth replacing with `builtins.attrValues { inherit (pkgs) curl jq; }` (survey #5), but the measured corpus (789 occurrences, 40% of all `with` usage) and conflict 20's resolution both treat it as tolerated — as of 2026-09-27, practice has not converged with the strictest published guidance here; this dive follows the map's resolution (tolerated) rather than nix.dev's stricter position, and flags the gap rather than silently picking a side.
- **Lix's `rec-set-merges`/`rec-set-dynamic-attrs` deprecations are an escape-hatchable warning, not (yet) a permanent wall**: the error message itself offers `--extra-deprecated-features rec-set-merges` to opt back into the old behavior "with implementation-defined semantics" — Lix's stated direction (2.95 release notes, "several Nix-language strictness changes … that will break code that only ever ran on CppNix", [shifts](../nix-topic-map/shifts.md) §7) is toward eventually removing the escape hatch, but as of 2026-09-27 (last Lix release 2.95, 2026-03-25, no release since) it has not.
- **Whether `abort-on-warn` belongs in any CI at all, even scoped.** NIX-REL-11's scoped form is settled for this program, but it remains a narrow, easy-to-misuse primitive (it also fires on `builtins.trace`, per its own rationale) — a future Nix release adding a `builtins.warn`-specific abort option (as opposed to the current trace-wide one) would likely supersede this guidance; no such proposal was found as of 2026-09-27.

## Sources

| URL | what it is | date/era | why worth reading |
|---|---|---|---|
| [nix.dev/guides/best-practices](https://nix.dev/guides/best-practices) | nix.dev prescriptive style guide | fetched 2026-09-27 | primary source for the `rec`/`with`/`//`/URL-quoting anti-patterns, with the canonical footgun examples used throughout this dive |
| [nix.dev/manual/nix/2.35/language/string-context](https://nix.dev/manual/nix/2.35/language/string-context) | Nix 2.35 reference manual, string context | fetched 2026-09-27 | primary, exact definition of string context and `unsafeDiscardStringContext`'s documented risk |
| [nix.dev/manual/nix/2.35/language/types](https://nix.dev/manual/nix/2.35/language/types) | Nix 2.35 reference manual, the Path type | fetched 2026-09-27 | primary, exact wording on path-to-string coercion copying to the store |
| [nix.dev/manual/nix/2.35/release-notes/rl-2.23](https://nix.dev/manual/nix/2.35/release-notes/rl-2.23) | Nix 2.23 release notes | fetched 2026-09-27 | primary, introduces `builtins.warn` and its `abort-on-warn` control |
| [nix.dev/manual/nix/2.35/release-notes/rl-2.34](https://nix.dev/manual/nix/2.35/release-notes/rl-2.34) | Nix 2.34 release notes | fetched 2026-09-27 | primary, stabilises `lint-url-literals`, replacing the `no-url-literals` experimental feature |
| [nix-community/nixd — libnixf/src/Basic/diagnostic.py](https://raw.githubusercontent.com/nix-community/nixd/main/libnixf/src/Basic/diagnostic.py) | nixd/nixf's diagnostic source of truth | fetched 2026-09-27 | primary, the exact `sname`/`severity`/`message` for `sema-extra-rec`, `sema-extra-with`, `merge-diff-rec` used throughout Findings 1-3 |
| [lix.systems/blog/2026-03-25-lix-2.95-release](https://lix.systems/blog/2026-03-25-lix-2.95-release/) | Lix 2.95 "Kakigōri" release announcement | 2026-03-25, no Lix release since as of 2026-09-27 | primary, the exact wording the mixed-rec-merge fixture (§7) reproduces |
| `nixpkgs@9cab9ed832c3:lib/attrsets.nix` (exemplar clone) | nixpkgs' own `lib` source, `recursiveUpdate`/`recursiveUpdateUntil` | corpus fetch 2026-09-27, rev `9cab9ed832c3` | primary source code + worked doctest for the `//` nested-key-drop fix |
| [nix.dev/tutorials/working-with-local-files](https://nix.dev/tutorials/working-with-local-files) | nix.dev, `lib.fileset` tutorial | cited via canonical.md survey #7 | primary, the general-purpose fix for path-copy cost, and the flake-specific "always copied unless git-tracked" warning |
| [nix.dev/concepts/flakes](https://nix.dev/concepts/flakes) | nix.dev's flakes position statement | cited via canonical.md survey #10 | primary, documents the whole-flake-directory store copy this dive's §4 caveat relies on |
| `nix-topic-map.md` (this program's topic map, conflict 20 and rows M-C-01..14) | internal wave-3 consolidation | 2026-09-27 | the binding decisions this dive confirms or overturns; not re-derived |
| `nix-release.md` (NIX-REL-11) and `nix-gates.md` (NIX-GATE-05/06/07) and `nix-packaging.md` (NIX-PKG-14) | internal wave-3 consolidations | 2026-09-27 | already-settled rules this dive cites rather than re-deriving, per the brief |
| `nix-audit/exemplar-flake-shape.md` §4 | internal wave-1 measurement | 2026-09-27 | baseline `rec {}`/`with pkgs;`/source-filtering counts this dive builds on and re-measures a subset of |
| this dive's own re-measurement (`/tmp/with_hits.txt`, `/tmp/impure_hits.txt` working files; commands reproduced in Findings §2 and §6) | primary, first-hand grep over `/home/mherwig/.cache/research-lang/exemplars/nix`, 6,975 files / 429,515 lines, excluding `NixOS/nixpkgs` and NIX-GATE-04's test dirs | 2026-09-27 | the per-1,000-line rates and the `flake.nix`-narrowed impure-builtins count are new to this dive, not restated from prior waves |
