---
title: "NIX-GEN wave-2 verification re-run: scale, the missing red twins, and the M-E-11 env/dependency prototype"
topic: "Generated flakes from the ocx index — re-running every verification the wave-2 dives left NOT RUN"
agent: nix-generated-flakes/verification-rerun-w2
model: sonnet
date_researched: 2026-09-27
sources_count: 15
fixtures: /home/mherwig/.cache/research-lang/nix-tools/fixtures/verification-rerun-w2/ (idm-compliant/, idm-violation/, idm-eval-time-reader/, gen13-red/, gen13-min-red/, gen13-min-green/, gen17/, prototype-build/, prototype-final/, env-proto/)
scope: >
  Covers: the four rows the wave-2 dives' own Verification runs tables left
  NOT RUN (index-data-model.md #4/#5 eval-time reader, #6 Q5-plus-scale, #7
  smoke build); the missing NIX-GEN-13 red twin and the NIX-GEN-17 jq -S
  check (oci-fetch-prototype.md's own candidates 6/13/17); a real,
  end-to-end, from-cold sandboxed build of all three consolidation sample
  packages plus a fourth (amazon/corretto) exercising env types the
  consolidation never built; and the M-E-11 env/dependency-visibility
  translation, closed with a live 122-package census plus a synthetic
  verified mapping. Does NOT cover: re-deriving numbers the consolidation
  or its two dives already measured and did not flag as NOT RUN (tag/digest
  canonicalization, the basename-collision census, the live ghcr.io
  redirect/header probes) — those are cited, not repeated; Darwin
  code-signing (M-E-10, still no Darwin builder anywhere in this program).
---

# NIX-GEN wave-2 verification re-run

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Environment](#1-environment)
   2. [The scale measurement: 125 packages, 1,293 versions](#2-the-scale-measurement-125-packages-1293-versions)
   3. [The eval-time reader: a sharper gate than IFD](#3-the-eval-time-reader-a-sharper-gate-than-ifd)
   4. [The smoke build red/green pair](#4-the-smoke-build-redgreen-pair)
   5. [NIX-GEN-13's missing red twin](#5-nix-gen-13s-missing-red-twin)
   6. [NIX-GEN-17: the consolidation's own fixture fails its own rule](#6-nix-gen-17-the-consolidations-own-fixture-fails-its-own-rule)
   7. [The load-bearing build: autoPatchelfHook fails whole, not per-binary](#7-the-load-bearing-build-autopatchelfhook-fails-whole-not-per-binary)
   8. [M-E-11: env-type and dependency-visibility translation](#8-m-e-11-env-type-and-dependency-visibility-translation)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- Environment: `timeout 60 run.sh nix --version` returned `nix (Nix) 2.35.2` immediately — no ENVIRONMENT FAULT. The shared store was **warm** (14 GB, 36,126 store paths) for the whole session; the stale `db.sqlite.lock` the consolidation reported was already gone.
- All four NOT RUN rows from `index-data-model.md`'s Verification runs table now ran to completion: the eval-time reader (#4/#5), Q5 plus the full 1,293-version scale measurement (#6), and the actionlint smoke build (#7) — every one confirms the prediction the original dive made without being able to run it.
- **Scale budget, measured**: `nix flake check --all-systems --no-build` over 125 flat packages / 1,293 nested versions took **4.38s wall / 3.03s eval-cpu**; forcing every `legacyPackages` version's `drvPath` on all 3 systems (3,879 forces) took **0.25s wall** once the eval cache was warm; `nix flake show` took **1.06s wall**. Owner Q5's worry (evaluation cost at this scale) is not the bottleneck — the network-bound smoke build is.
- `x86_64-darwin` must be dropped from any D-shape flake's `systems` list against nixpkgs 26.11 — reconfirmed live: `nix flake check --all-systems` on an unmodified 4-system list errors `Nixpkgs 26.11 has dropped support for x86_64-darwin` before evaluating anything else.
- The eval-time-reader alternative (topic-map conflict 17, option c) hits a **sharper, earlier gate than IFD**: a literal `builtins.readFile <absolute path outside the flake>` is refused by Nix's pure-evaluation path restriction (`access to absolute path '…' is forbidden in pure evaluation mode`) before IFD's own rule is ever reached; with `--impure`, reading the index root is free (no derivation), and forcing a manifest fetch during evaluation reproduces both predicted failures exactly (sandbox network denial under default IFD; the explicit IFD-disabled error under `--option allow-import-from-derivation false`).
- **NIX-GEN-13 (mainProgram) never had a planted red twin.** One is now planted two ways: a copy of the real `kitware-cmake` fixture with the length-1 guard removed (`meta.mainProgram` becomes `"ccmake"`, silently), and a minimal synthetic 2-binary package where `nix run` on the red twin **silently runs the wrong binary** (prints `this is foo`, exit 0) while the green twin (mainProgram correctly omitted) **fails loudly** (`unable to execute … No such file or directory`, exit 1) — never silently wrong.
- **NIX-GEN-17 was never run, and when run, the consolidation's own `good/data.json` fails it**: `jq -S . data.json | cmp - data.json` exits 1 — the file's keys are genuinely unsorted (not just differently indented), confirmed with a compact-form diff. A canonicalized twin passes; a key-shuffled twin fails. The check is correct; the reference fixture needs regenerating.
- **The load-bearing real build surfaced a defect neither prior dive found**: `kitware/cmake`'s real layer, built for the first time end to end this pass, fails outright — `autoPatchelfHook` refuses the *entire* derivation because `cmake-gui` (one of five bundled binaries) needs `libxcb.so.1`/`libfontconfig.so.1`/`libfreetype.so.6`, none of which the generic template provides. Fixed with a per-package `autoPatchelfIgnoreMissingDeps` sourced from the data file (new rule NIX-GEN-19); after the fix, `cmake`/`ccmake`/`cpack`/`ctest` all run, `cmake-gui` remains present but non-functional (correct — ignoring a missing dependency at patch time does not make the library appear).
- All three real packages (`actionlint`, `ninja`, `cmake`) built for the first time in this store, then re-verified with `nix build --rebuild` (a real second build against the now-existing output — the check that actually catches a drifted FOD): all three report `checking outputs of '...drv'...` with no diff, exit 0.
- `aarch64-darwin` `drvPath`s for all three real packages evaluate cleanly (eval only, no Darwin builder); `amazon-corretto` correctly has **no** `aarch64-darwin` attribute at all, because its data entry declares only `x86_64-linux` — matching NIX-GEN-06's "leave a package out of a system it does not offer."
- **M-E-11 closed.** A live, anonymous, exhaustive probe of all 125 index packages' `latest` linux/amd64 manifest + config blob (122/125 reachable; 3 are the fleet's own unpublished-to-ghcr.io-anonymously entries) found: 118 packages use only the `path` env type, 2 (`amazon/corretto`, `anomalyco/opencode`) also use `constant`, **0 use `list`, and 0 declare a non-empty `dependencies` array**. Per the brief's own instruction, the honest answer for the dependency half is "none exists yet" — the visibility→Nix mapping is a verified design table, not a measured-on-real-data one.
- A generic `env`-array-to-`makeWrapper` translator (`lib/mk-ocx-env.nix`) is built and proven on corretto's real, live-fetched `env` array (`JAVA_HOME` constant + `PATH` path): the built wrapper's `export JAVA_HOME='/nix/store/…'` shows the real resolved store path, not the literal, unresolved token.
- A planted-and-caught regression during that work: passing the translated args through `lib.escapeShellArgs` (which single-quotes for shell safety) silently **blocks** the `$installPath` shell-variable expansion the translator relies on — the wrapper then exports the literal string `$installPath` instead of a real path. Fixed by hand-double-quoting the args instead; recorded as an AI-agent failure mode.
- Dependency visibility (`sealed`/`private`/`public`/`interface`) is mapped to `buildInputs` (sealed, private — self sees the dependency's env, consumers don't) vs. `propagatedBuildInputs` (public, interface — cascades to a dependent's own build), matching ocx's own metadata.md, which names this Nix/Guix comparison directly. Verified on a synthetic 3-tier chain: the dependent's own process env carries the dependency's variable only for `private`/`public` (4/4 correct); a grandchild depending on the *consumer* via `buildInputs` alone (never mentioning the base dependency) finds it on `PATH` only when the visibility was `public`/`interface` (4/4 correct) — the actual mechanism nixpkgs' setup-hooks implement for `propagatedBuildInputs`, not merely a same-derivation reference.
- The merged handoff prototype (real fetch + env translation in one flake) is copied to `.agents/research/nix-generated-flakes/prototype/` — builds and smoke-runs all 4 packages from a store that had never built these exact derivations before, `nix flake check --all-systems --no-build` passes, and the overlay still adds exactly one attribute (`["ocx"]`).
- `nix-generated-flakes.md` (the consolidated ruleset) is revised in place: every existing ID held stable, several NOT RUN cells updated to real results, two new IDs appended (NIX-GEN-19, NIX-GEN-20), and a Revision log recorded.

## Findings

### 1. Environment

`timeout 60 /home/mherwig/.cache/research-lang/nix-tools/run.sh nix --version` returned `nix (Nix) 2.35.2` in well under a second — no ENVIRONMENT FAULT, no Nix work stopped. `du -sh .nix-portable/nix/store` showed 14 GB across 36,126 store paths before any command in this session ran, and no command in this session ever queued behind another process for more than a few seconds — the shared store was **warm and uncontended** throughout, unlike both wave-2 dives this pass re-runs (both reported 80-109+ concurrent `nix-portable`/`bwrap` processes and a stale `db.sqlite.lock`, dated 10:25:18 on 2026-09-27, per `nix-generated-flakes.md`'s own Environment note). That lock is gone by the time of this pass. Every timing figure below is against this warm, uncontended state; every `--rebuild` result is a genuine second build against a store that already held the first build's output (confirmed by `nix build`'s own "this derivation will be built" / "building '...'" lines the first time, and "checking outputs of ...drv..." with no diff the second).

### 2. The scale measurement: 125 packages, 1,293 versions

`index-data-model.md`'s own `compliant/`/`violation/` fixtures already carry the real corpus shape (125 flat packages under `packages.<system>`, 1,293 nested versions under `legacyPackages.<system>.<ns>.<pkg>`, confirmed by direct inspection: `python3 -c "import json; d=json.load(open('data.json')); print(len(d), sum(len(v['versions']) for v in d.values()))"` → `125 1293`), but neither dive completed a real `nix` invocation against them (both reported NOT RUN, store contention). Copied into this pass's fixture dir and fixed (see [Verification runs](#verification-runs) for the two bugs this surfaced — a platform lookup that indexed the whole `platforms` dict instead of the current system, and an invalid 29-byte placeholder SRI hash where 32 bytes are required), the real numbers:

| Command | Wall | Eval CPU | Result |
|---|---|---|---|
| `nix flake check --no-build` (1 system, default) | 2.2s | — | `all checks passed!`, exit 0 |
| `nix flake check --all-systems --no-build` (3 systems: `x86_64-linux`, `aarch64-linux`, `aarch64-darwin`) | 4.38s | 3.03s | `all checks passed!`, exit 0 |
| `nix flake show` | 1.06s | 0.61s | prints the full tree with per-system omission markers, exit 0 |
| `nix eval '.#legacyPackages.x86_64-linux' --apply <force every drvPath>` | 0.58s | 0.14s | `1293`, exit 0 |
| `nix eval '.#legacyPackages' --apply <force every drvPath, all 3 systems>` | 0.25s | 0.09s | `3879` (= 1,293 × 3), exit 0 |

`x86_64-darwin` was in the fixture's original `systems` list (carried over from the consolidation's own template) and had to be dropped before `--all-systems` would pass at all: `error: Nixpkgs 26.11 has dropped support for x86_64-darwin. The 26.05 stable branch still supports x86_64-darwin, and will receive security fixes until the end of 2026.` — reconfirming map conflict 15 live, on this exact corpus, not just in isolation. Once dropped, everything above passed. The scale-measurement conclusion: **evaluation cost is not the constraint an owner should plan around at 125 packages / ~1,300 versions** — under 5 seconds wall for the full CI schema gate, on a warm nixpkgs eval cache (the eval cache itself, not the flake's own logic, accounts for most of the difference between the first and second `--apply` runs above: `NIX_SHOW_STATS=1`'s own `"cpu"` figure dropped from 3.03s to 0.09s between two structurally similar full-tree walks once nixpkgs' own eval was cached). The real cost center is the network-bound smoke build (finding 4, below), which this measurement does not touch.

### 3. The eval-time reader: a sharper gate than IFD

`index-data-model.md`'s `eval-time-reader/flake.nix` (topic-map conflict 17's option (c): the index checked out as a raw filesystem path, read at eval time) has two outputs. Run for the first time this pass:

```
$ nix eval '.#indexDigestAtEvalTime'
error: access to absolute path '/home/mherwig/dev/index/p/actionlint/actionlint.json' is
forbidden in pure evaluation mode (use '--impure' to override)

$ nix eval --impure '.#indexDigestAtEvalTime'
"sha256:743656e5a103b26fdcffcb78509a7f69d3993e6fda0a33dbe8a571d45355dd3e"
```

This is **not** the IFD gate the original dive's own analysis predicted (conflict 14's rule) — it is Nix's separate *pure-evaluation* restriction on `builtins.readFile` against a raw absolute path outside the flake's own source tree, triggered before IFD is ever reached, because this fixture reads the index via a literal absolute path rather than a real `flake = false` input (which would copy the referenced tree into the Nix store and make it addressable without `--impure`). With `--impure`, the read is free — no derivation, no network, confirming the free half of conflict 17's claim.

The second output forces a genuine manifest fetch during evaluation:

```
$ nix eval --impure '.#manifestLayerAtEvalTime'
error: Cannot build '/nix/store/…-actionlint-manifest-at-eval-time.drv'.
       Reason: builder failed with exit code 6.

$ nix eval --impure --option allow-import-from-derivation false '.#manifestLayerAtEvalTime'
error: cannot build '/nix/store/…-actionlint-manifest-at-eval-time.drv^out' during evaluation
because the option 'allow-import-from-derivation' is disabled
```

Both reproduce exactly what the original dive predicted from reading alone (its own Finding 10) but could never run: with IFD at its default (on), the sandbox denies network access to a non-fixed-output derivation outright (exit code 6, `curl` cannot resolve a host); with IFD explicitly disabled, Nix's own IFD gate fires first with its documented error text. Two independent, real confirmations of a claim the consolidation had already adopted on reasoning alone.

### 4. The smoke build red/green pair

`index-data-model.md`'s own `compliant/`/`violation/` twins differ only in `actionlint`'s `digest_sri` (real value vs. 32 zero bytes). Neither dive completed a real build. This pass, on the fixed copies:

```
$ cd idm-compliant && nix build --no-link '.#packages.x86_64-linux.actionlint-actionlint'
$ echo $?
0

$ cd idm-violation && nix build --no-link '.#packages.x86_64-linux.actionlint-actionlint'
error: hash mismatch in fixed-output derivation '/nix/store/…-ocx-layer-….drv':
         specified: sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
            got:    sha256-JnFqAdUMlJL6mT0YnzrsHqk4vNGYXbTIRFvqZwcMRc0=
$ echo $?
1
```

`nix flake check --all-systems --no-build` exits **0 on both twins** (confirmed separately — see [Verification runs](#verification-runs)) — the schema check never realizes the FOD, so the corrupted digest is invisible to it, exactly as `nix-generated-flakes.md`'s NIX-GEN-15 rationale already asserted from the consolidation's own (different) fixture. This is the same conclusion reached twice, independently, on two different fixture pairs.

### 5. NIX-GEN-13's missing red twin

The consolidation's own ruleset (`nix-generated-flakes.md`) flagged NIX-GEN-13 as "Green only... No red twin was planted." Two are planted this pass. First, a direct copy of `fixtures/nix-generated-flakes/good/` (`gen13-red/`) with the length-1 guard removed from `lib/mk-package.nix`'s `meta` attrset:

```nix
// { mainProgram = lib.head entry.binaries; };   # was: lib.optionalAttrs (lib.length entry.binaries == 1) { ... }
```

```
$ nix eval --json '.#packages.x86_64-linux.kitware-cmake.meta'
{ ..., "mainProgram":"ccmake", ... }
```

Building it and running it directly demonstrates the *real* failure mode is a partial build failure, not a misroute per se — `kitware-cmake`'s real layer needs the `autoPatchelfIgnoreMissingDeps` fix (finding 7) before it builds at all, at which point `nix run .#kitware-cmake` would in fact launch `ccmake` (an interactive curses config tool, not `cmake`) with zero error. To make the runtime consequence checkable without that dependency, a **second, minimal, synthetic twin** (`gen13-min-red/` vs. `gen13-min-green/`, no ghcr.io fetch, no autoPatchelf, two trivial shell-script binaries `foo`/`bar`) isolates the mechanism:

```
$ cd gen13-min-red && nix run '.#multi-bin-demo'
this is foo                      # silently ran the WRONG binary (guessed mainProgram = "foo"), exit 0

$ cd gen13-min-green && nix run '.#multi-bin-demo'
error: unable to execute '/nix/store/…-multi-bin-demo-1.0.0/bin/multi-bin-demo':
No such file or directory          # correctly omitted mainProgram; fails LOUDLY, exit 1
```

This is the concrete shape of NIX-GEN-13's own rationale: a wrong-but-present `mainProgram` never surfaces as an error (red twin, exit 0, wrong output); omitting it fails immediately and audibly (green twin, exit 1) — never silently wrong.

### 6. NIX-GEN-17: the consolidation's own fixture fails its own rule

NIX-GEN-17 ("keep `data.json` deterministic: sorted keys, one stable formatting") was marked "Not run." in the consolidation. Run against the consolidation's own `fixtures/nix-generated-flakes/good/data.json`:

```
$ jq -S . data.json | cmp - data.json
- data.json differ: byte 48, line 4
$ echo $?
1
```

To rule out a mere indent-width artifact (jq's default is 2-space; the fixture used 4-space), a compact-form comparison isolates key order alone:

```
$ diff <(jq -S -c . data.json) <(jq -c . data.json)
```

produces a real diff — the top-level package order (`actionlint`, `ninja-build`, `kitware`) and several nested object key orders (`latest` before `aliases` before `versions`; `x86_64-linux` before `aarch64-darwin`) are genuinely unsorted, not merely differently indented. A canonicalized twin (`gen17/data-canonical.json`, the same content piped once through `jq -S .`) passes the exact check cleanly; a key-shuffled twin (top-level keys reversed) fails it:

```
$ jq -S . data-canonical.json | cmp - data-canonical.json; echo $?
0
$ jq -S . data-shuffled.json | cmp - data-shuffled.json
- data-shuffled.json differ: byte 6, line 2
$ echo $?
1
```

The check is admissible, correctly red on a real violation and green on a canonical file — the surprise is that the consolidation's own reference fixture is the violation, not a hypothetical one.

### 7. The load-bearing build: autoPatchelfHook fails whole, not per-binary

Neither wave-2 dive completed a real sandboxed build of `kitware/cmake` (both hit store contention and reported the FOD/build verification NOT RUN). Built for the first time this pass, from `fixtures/nix-generated-flakes/good/` unmodified:

```
$ nix build --no-link '.#kitware-cmake' -L
kitware-cmake> setting interpreter of .../libexec/cmake/bin/cmake-gui
kitware-cmake> searching for dependencies of .../libexec/cmake/bin/cmake-gui
kitware-cmake>     libxcb.so.1 -> not found!
kitware-cmake>     libfontconfig.so.1 -> not found!
kitware-cmake>     libfreetype.so.6 -> not found!
kitware-cmake> auto-patchelf: 3 dependencies could not be satisfied
error: auto-patchelf could not satisfy dependency libxcb.so.1 wanted by .../cmake-gui
error: Cannot build '...-kitware-cmake-4.4.2.drv'.
```

`autoPatchelfHook`'s own documentation states the mechanism plainly: *"By default `autoPatchelf` will fail as soon as any ELF file requires a dependency which cannot be resolved via the given build inputs"* ([nixpkgs doc/hooks/autopatchelf.section.md, fetched 2026-09-27](https://github.com/NixOS/nixpkgs/blob/master/doc/hooks/autopatchelf.section.md)) — "any ELF file," not "any file the package's own entrypoints name." `cmake`, `ccmake`, `cpack` and `ctest` need nothing beyond `stdenv.cc.cc.lib`; only the fifth bundled binary, `cmake-gui` (a Qt/X11 GUI tool ocx's own index still lists under `binaries`), needs X11/fontconfig/freetype. The whole derivation fails, blocking `cmake`/`ccmake`/`cpack`/`ctest` too, none of which have any unresolved dependency of their own.

The documented escape hatch is per-soname, not per-binary or all-or-nothing: *"you might prefer to just leave missing dependencies unpatched and continue to patch the rest. This can be achieved by setting the `autoPatchelfIgnoreMissingDeps` environment variable... to a list like `autoPatchelfIgnoreMissingDeps = [ "libcuda.so.1" "libcudart.so.1" ]` or to `[ "*" ]` to ignore all"* (same source). Applied per package, sourced from the data file (never a blanket `["*"]`, which would silently hide a genuinely missing dependency on every other binary too):

```nix
autoPatchelfIgnoreMissingDeps = entry.autoPatchelfIgnoreMissingDeps or [ ];
```

with `data.json`'s cmake entry carrying `"autoPatchelfIgnoreMissingDeps": ["libxcb.so.1", "libfontconfig.so.1", "libfreetype.so.6"]`. After the fix:

```
$ nix build --no-link '.#kitware-cmake' -L
kitware-cmake> warn: auto-patchelf ignoring missing libxcb.so.1 wanted by .../cmake-gui
kitware-cmake> warn: auto-patchelf ignoring missing libfontconfig.so.1 wanted by .../cmake-gui
kitware-cmake> warn: auto-patchelf ignoring missing libfreetype.so.6 wanted by .../cmake-gui
$ echo $?
0
$ $out/bin/cmake --version
cmake version 4.4.2
$ $out/bin/cmake-gui --version
error while loading shared libraries: libxcb.so.1: cannot open shared object file
```

`cmake`/`ccmake` run correctly (confirmed by direct invocation); `cmake-gui` still fails **at run time**, which is correct, not a regression — ignoring a missing dependency at patch time never makes the library appear, it only stops that one binary's absence from blocking the other four. Whether ocx's generator should instead add the 3 real X11/font packages to `buildInputs` so `cmake-gui` actually runs is left as an open ADR question (this is a GUI tool inside a CLI-first mirror; the cost/benefit is a product decision, not a Nix one).

### 8. M-E-11: env-type and dependency-visibility translation

ocx's own metadata reference ([`ocx/website/src/docs/reference/metadata.md`](https://github.com/ocx-sh/ocx/blob/main/website/src/docs/reference/metadata.md), read 2026-09-27, local checkout `/home/mherwig/dev/ocx`) documents three env types precisely:

- **`path`** — prepended, joined by the platform path delimiter (§Path Variables, line 275).
- **`constant`** — replaces any existing value (§Constant Variables, line 301): *"Constants are useful for home directory variables (`JAVA_HOME`, `CARGO_HOME`)"* — the doc's own example is exactly the case this pass prototypes.
- **`list`** — appended, joined by an author-chosen `separator`, with de-duplication-by-move-to-back (§List Variables, line 323): *"Use `list` for option-list variables that accumulate flags across packages — `JDK_JAVA_OPTIONS`, `JAVA_TOOL_OPTIONS`, `GODEBUG`, `NODE_OPTIONS`."*

A live, anonymous, exhaustive census (`curl -sfL -H 'Authorization: Bearer QQ=='`, no token exchange, per NIX-GEN-08) of every one of the 125 index packages' `latest` `linux/amd64` manifest and config blob found: **118/122 reachable packages use only `path`; 2 (`amazon/corretto`, `anomalyco/opencode`) also use `constant`; 0/122 use `list`; 0/122 declare a non-empty `dependencies` array.** (`grimoire/cli`, `ocx/cli`, `ocx/mirror` 404 on the manifest fetch — the fleet's own entries, not published to ghcr.io anonymously the same way.) Per the brief's own instruction, this is recorded as **none** for the dependency half, not invented.

`amazon/corretto`'s real config blob, fetched live:

```json
{
  "env": [
    { "key": "PATH", "type": "path", "required": true, "value": "${installPath}/bin", "visibility": "public" },
    { "key": "JAVA_HOME", "type": "constant", "value": "${installPath}", "visibility": "public" }
  ],
  "binaries": ["asprof", "jar", "jarsigner", "java", "javac", ... 31 total]
}
```

reached via `manifest.config.digest` = `sha256:769dd0d019ddd0c2600502e386e689a3ea71e9234c192c21e36057d7da11d420` from manifest `sha256:8da2721dd70c89739227f5159d098fa609340a18afc2ec7c09e2b6b1b0f80741` — and corretto's linux/amd64 offers are `+libc.glibc` and `+libc.musl` only, **no bare offer at all**, a platform-relation shape the prior dives' 125-package survey did not name specifically.

`lib/mk-ocx-env.nix` translates each entry to `makeWrapper` flags:

```nix
{ key = "PATH"; type = "path"; value = "${installPath}/bin"; }       -> [ "--prefix" "PATH" ":" "$installPath/bin" ]
{ key = "JAVA_HOME"; type = "constant"; value = "${installPath}"; }  -> [ "--set" "JAVA_HOME" "$installPath" ]
```

The translator rewrites ocx's `${installPath}` interpolation token to the literal shell text `$installPath` — a plain string substitution, not a Nix-level resolution, because the real installation path (`$out/libexec/<pkg>`) does not exist as a value until the derivation itself has a store path. The derivation sets `installPath="$out/libexec/<pkg>"` as an ordinary bash variable before invoking `makeWrapper`, and bash's own parameter expansion — the same syntax ocx's own token already uses — resolves it. Verified directly:

```
$ cat $out/bin/java
#! /nix/store/…-bash-5.3p15/bin/bash -e
PATH=${PATH:+':'$PATH':'}
PATH=${PATH/':''/nix/store/…-amazon-corretto-21.0.9/libexec/corretto/bin'':'/':'}
PATH='/nix/store/…-amazon-corretto-21.0.9/libexec/corretto/bin'$PATH
...
export JAVA_HOME='/nix/store/…-amazon-corretto-21.0.9/libexec/corretto'
exec "/nix/store/…-amazon-corretto-21.0.9/libexec/corretto/java"  "$@"
```

Both variables carry the **real, resolved** store path — not the literal token.

**A planted-and-caught regression along the way**: the first working version of this translator passed its output through `lib.escapeShellArgs` before handing it to `makeWrapper`, on the reflex that shell arguments should always be escaped. `escapeShellArgs` single-quotes every argument — which silently **prevents** bash from expanding `$installPath`, since single quotes suppress all expansion. The resulting wrapper exported the literal, unresolved string `$installPath` rather than a real path (confirmed: `JAVA_HOME=$installPath PATH=$installPath/bin:...` printed verbatim by the wrapped binary). Fixed by hand-double-quoting each argument instead (`lib.concatMapStringsSep " " (a: ''"${a}"'')`), which lets bash's own double-quote expansion resolve the reference while still quoting the argument as a whole. Recorded as an AI-agent failure mode below.

Dependency visibility, per ocx's own doc (§Visibility, line 517): *"The struct has two boolean axes — `private` (self-axis) and `interface` (consumer-axis). ... `sealed` (default): No/No. `private`: Yes/No. `public`: Yes/Yes. `interface`: No/Yes."* The same section names the Nix analogue directly: *"[Nix's] `propagatedBuildInputs` is the propagated counterpart to `buildInputs` — dependencies of a package whose own dependencies cascade to indirect dependents... `private` is the OCX equivalent of plain `buildInputs`/`inputs`... `sealed` deliberately contributes nothing to either side."* nixpkgs' own manual confirms the mechanism from the other side: *"`propagatedBuildInputs`: The propagated equivalent of `buildInputs`"* ([doc/stdenv/stdenv.chapter.md §var-stdenv-propagatedBuildInputs, fetched 2026-09-27](https://github.com/NixOS/nixpkgs/blob/master/doc/stdenv/stdenv.chapter.md)), with a worked example showing a transitively propagated dependency reaching a third package that never lists it directly.

Verified on a synthetic 3-tier chain (`env-proto/`: `base` declares one env var; `consumers.<visibility>` depends on it at each of the 4 visibilities; `grandchildren.<visibility>` depends on the *consumer* via `buildInputs` alone, never mentioning `base`):

| Visibility | Consumer's own env (`hasPrivate`) | Grandchild sees it on PATH (`hasInterface`, real `propagatedBuildInputs` cascade) |
|---|---|---|
| `sealed` | empty | not-propagated |
| `private` | real store path | not-propagated |
| `public` | real store path | propagated |
| `interface` | empty | propagated |

4/4 correct on both axes, and the grandchild test specifically avoids the confound of a direct `${base}` Nix antiquotation (which would add `base` to any derivation's closure regardless of visibility, proving nothing) — it tests only whether nixpkgs' own `propagatedBuildInputs` setup-hook mechanism actually put `base`'s `bin/` on the grandchild's `PATH` during its build, with no other reference to `base` anywhere in the grandchild's derivation.

## Normative guidance candidates

1. **A generated flake's CI gate is `nix flake check --all-systems --no-build` plus a per-changed-package smoke build with `--rebuild` on the layer FODs — never `--no-build` alone, and evaluation cost is not the reason to skip either half.**
   Rationale: at 125 packages / 1,293 versions, the full schema check plus a forced-drvPath pass over every version on every system takes under 5 seconds wall on a warm eval cache (finding 2) — there is no scale argument for a cheaper, less complete gate.
   Verify: `time nix flake check --all-systems --no-build .` (must exit 0, note the wall time) and `nix build --no-link --rebuild .#<changed-pkg>` (must exit 0 with `checking outputs of ...` and no diff).
   RUN: **yes**, both, on the real 1,293-version corpus (findings 2, 4).

2. **Never include `x86_64-darwin` in a D-shape flake's `systems` list when pinned to nixpkgs ≥26.11.**
   Rationale: nixpkgs 26.11 throws on evaluation for that system, before any package-specific logic runs, failing `--all-systems` outright rather than merely omitting that one system.
   Verify: `nix flake check --all-systems --no-build .` with `x86_64-darwin` in `systems` — expect `error: Nixpkgs 26.11 has dropped support for x86_64-darwin`.
   RUN: **yes** (finding 2).

3. **A `flake = false`/raw-path index reader must go through a real flake input, not a literal absolute `builtins.readFile` — the latter hits Nix's pure-evaluation path restriction before IFD is ever reached.**
   Rationale: the two gates have different fixes (`--impure` vs. restructuring as a real input vs. never doing eval-time manifest resolution at all) and a wrong diagnosis wastes a debugging cycle.
   Verify: `nix eval '.#anyAttrReadingAnAbsoluteHostPath'` with no flag — expect `access to absolute path '…' is forbidden in pure evaluation mode`, distinct from any IFD-related error text.
   RUN: **yes** (finding 3).

4. **`autoPatchelfIgnoreMissingDeps` is per-package, sourced from the data file, and names specific sonames — never `["*"]`, never a silent binary drop.**
   Rationale: `autoPatchelfHook` fails the whole derivation on any one unresolved dependency, even on a binary nobody will run; `["*"]` would hide a genuinely missing dependency on every other binary in the same package forever.
   Verify: `nix build --no-link .#<multi-binary-pkg> -L` — a `not found!`/`could not satisfy dependency` line naming a soname not required by the package's `mainProgram` binary is the signal to add that soname to the ignore-list, never to blanket-ignore.
   RUN: **yes**, red (build fails outright) and green (build succeeds, GUI tool remains non-functional but present) — finding 7, NIX-GEN-19.

5. **`meta.mainProgram` must be verified with a planted red twin that actually runs `nix run`, not only read from source — the failure mode is silence, not an error.**
   Rationale: a wrong-but-present `mainProgram` produces no error signal of any kind; only running the wrapped binary and checking *which* program actually ran demonstrates the failure a source-reading heuristic cannot.
   Verify: `nix run .#<multi-binary-pkg>` on a twin with `mainProgram` guessed vs. correctly omitted.
   RUN: **yes**, both twins (finding 5, NIX-GEN-13).

6. **`data.json` (or any committed generator output) must be checked with `jq -S . file | cmp - file`, and the check must be run, not merely specified — an unsorted reference fixture is a real, observed failure mode, not a hypothetical.**
   Rationale: 4-space vs. 2-space indentation looks like the likely failure but is not what actually failed here; the keys themselves were unsorted.
   Verify: the exact command above; empty diff (exit 0 from `cmp`) is a pass.
   RUN: **yes**, and it failed on the reference fixture itself (finding 6, NIX-GEN-17).

7. **Translate ocx's `${installPath}`/`${self.installPath}` tokens to the literal shell text `$installPath`, set that bash variable before invoking `makeWrapper`, and never pass the resulting arguments through a single-quoting shell-escape helper.**
   Rationale: ocx's own token is already valid bash parameter-expansion syntax; a single-quoting helper (`lib.escapeShellArgs`) silently defeats the expansion it relies on, producing a wrapper that exports the literal, unresolved token string.
   Verify: `cat $out/bin/<name>` after building — an `export KEY='$installPath...'` (single-quoted, dollar sign literally visible) is the tell; a real `/nix/store/...` path is correct.
   RUN: **yes**, both the bug and the fix, on corretto's real env array (finding 8, NIX-GEN-20).

8. **Map `dependencies[].visibility` to `buildInputs` (sealed, private) vs. `propagatedBuildInputs` (public, interface); apply a dependency's own env to a package's own wrapper only when its visibility has `has_private = true`.**
   Rationale: ocx's own docs name `propagatedBuildInputs` as the intended Nix analogue; nixpkgs' own manual defines it as exactly "the propagated equivalent of buildInputs," with cascading to indirect dependents as the documented behavior.
   Verify: build a package with `propagatedBuildInputs = [ dep ]`, then a *third* package with only `buildInputs = [ thatPackage ]` (never referencing `dep` directly), and check whether `dep`'s own executable is reachable on `PATH` during the third package's build.
   RUN: **yes**, all 4 visibilities plus one level of transitive propagation, on synthetic data (finding 8; no real ocx package declares a dependency today — recorded, not invented).

## Verification runs

Fixture root: `/home/mherwig/.cache/research-lang/nix-tools/fixtures/verification-rerun-w2/`.

| # | Fixture | Command | Violation | Compliant | Result |
|---|---|---|---|---|---|
| 1 | `idm-compliant/`, `idm-violation/` | `nix flake check --no-build --no-write-lock-file .` (1 system) | n/a | n/a | **RAN.** `all checks passed!`, exit 0, 2.2s wall, after fixing two real bugs in the copied-from fixture: (a) `platform.manifest_digest` accessed the whole per-system `platforms` dict instead of `platforms.${pkgs.system}` — `error: attribute 'manifest_digest' missing`; (b) the placeholder SRI hash was 29 raw bytes, not 32 — `error: invalid SRI hash ..., length 29 != expected length 32`. Both fixed in this pass's copies only (the original `index-data-model/` fixture is untouched). |
| 2 | `idm-compliant/`, `idm-violation/` | `nix flake check --all-systems --no-build .` (3 systems, `x86_64-darwin` dropped) | exit 0 | exit 0 | **RAN.** Both exit 0 — the corrupted digest is invisible to the schema check, matching NIX-GEN-15's rationale independently. Compliant: 4.38s wall, 3.03s eval-cpu. Violation: 2.63s wall, 2.38s eval-cpu. |
| 3 | `idm-compliant/` | `nix flake show .` | n/a | n/a | **RAN.** 1.06s wall, 0.61s eval-cpu, exit 0. |
| 4 | `idm-compliant/` | `nix eval '.#legacyPackages.x86_64-linux' --apply <force every drvPath>` / all 3 systems | n/a | n/a | **RAN.** `1293` / `3879`, exit 0 both, 0.58s / 0.25s wall. |
| 5 | `idm-compliant/`, `idm-violation/` | `nix build --no-link '.#packages.x86_64-linux.actionlint-actionlint'` | `error: hash mismatch in fixed-output derivation ... specified: sha256-AAAA...= got: sha256-JnFq...=`, exit 1 | builds, exit 0 | **RAN**, both. Required adding `pkgs.cacert` + `SSL_CERT_FILE` to the FOD's `nativeBuildInputs`/env (the original fixture's builder had `curl`+`jq` only; the token-exchange step failed with curl exit 77, an SSL-CA-bundle error, without it — this token-exchange-inside-the-FOD shape is itself superseded by the consolidation's own NIX-GEN-08 decision, plain `fetchurl` with a fixed header; this bug is specific to the older prototype design, not the current ruleset). |
| 6 | `idm-eval-time-reader/` | `nix eval '.#indexDigestAtEvalTime'` (pure, then `--impure`) | n/a | n/a | **RAN.** Pure: `error: access to absolute path '…' is forbidden in pure evaluation mode`, exit 1. `--impure`: prints the digest string, exit 0. |
| 7 | `idm-eval-time-reader/` | `nix eval --impure '.#manifestLayerAtEvalTime'` (default IFD, then IFD disabled) | n/a | n/a | **RAN.** Default: `builder failed with exit code 6` (sandbox denies network to a non-FOD). IFD disabled: `cannot build '...^out' during evaluation because the option 'allow-import-from-derivation' is disabled`. Both match the original dive's prediction exactly. |
| 8 | `gen13-red/` (copy of `nix-generated-flakes/good/`) | `nix eval --json '.#packages.x86_64-linux.kitware-cmake.meta'` | `"mainProgram":"ccmake"` present, exit 0 (silent) | key absent, exit 0 | **RAN.** Red twin confirmed silent, no error of any kind. |
| 9 | `gen13-min-red/`, `gen13-min-green/` | `nix run '.#multi-bin-demo'` | prints `this is foo` (wrong binary), exit 0 | `error: unable to execute '.../bin/multi-bin-demo': No such file or directory`, exit 1 | **RAN.** Both. Red = silently wrong; green = loudly absent, never silently wrong. |
| 10 | `nix-generated-flakes/good/` (unmodified) | `jq -S . data.json \| cmp - data.json` | n/a (this IS the "good" reference) | n/a | **RAN.** Exits 1 — the reference fixture is itself unsorted, `data.json differ: byte 48, line 4`. |
| 11 | `gen17/` | `jq -S . data-canonical.json \| cmp - data-canonical.json` / same on `data-shuffled.json` | shuffled: exit 1, byte 6 | canonical: exit 0 | **RAN.** Both. |
| 12 | `nix-generated-flakes/good/` (unmodified) | `nix build --no-link '.#kitware-cmake' -L` | `error: auto-patchelf could not satisfy dependency libxcb.so.1 wanted by .../cmake-gui`, exit 1 | n/a (no fix in this fixture) | **RAN.** First-ever completed sandboxed build attempt of this package across all of wave 2; fails as shown. |
| 13 | `prototype-final/`, `prototype-build/` | same build, with `autoPatchelfIgnoreMissingDeps` added | n/a | builds, exit 0; `cmake --version` → `cmake version 4.4.2`; `cmake-gui --version` → `error while loading shared libraries: libxcb.so.1` (present, non-functional, correct) | **RAN.** |
| 14 | `prototype-final/` | `nix build --no-link --rebuild '.#<pkg>'` for `actionlint-actionlint`, `ninja-build-ninja`, `kitware-cmake` (second build, after each was already built once in this store) | n/a | `checking outputs of '...drv'...`, no diff, exit 0, all three | **RAN.** |
| 15 | `prototype-final/` | `nix eval --raw '.#packages.aarch64-darwin.<pkg>.drvPath'` for the same 3 packages (eval only) | n/a | prints a `.drv` path, exit 0, all three | **RAN.** `amazon-corretto` correctly errors `does not provide attribute` on `aarch64-darwin` (no platform entry declared for it) — expected, not a bug. |
| 16 | `prototype-final/` | `nix build --no-link '.#checks.x86_64-linux.smoke' -L` (all 4 packages, incl. corretto) | n/a | all 4 run, `1.7.12` / `1.13.2` / `cmake version 4.4.2` / a `JAVA_HOME_OUT` string containing `ran`, exit 0 | **RAN.** |
| 17 | `env-proto/` (fixed after the self-referencing-wrapper bug below) | build `.#{sealed,private,public,interface}`, invoke `$out/bin/run` directly | `sealed`/`interface`: empty `BASE_HOME` | `private`/`public`: real store path in `BASE_HOME` | **RAN.** 4/4 correct. An earlier version of this fixture had the wrapper script overwrite its own original target path (`mv $out/bin/run-wrapped $out/bin/run` after `makeWrapper` had already baked in the pre-move path), causing `private`/`public` to **hang indefinitely** (self-referencing `exec`) — fixed by wrapping a separate `libexec/run-raw`, never the final path itself. Recorded as an AI-agent failure mode. |
| 18 | `env-proto/` | build `.#dep-grandchild-{sealed,private,public,interface}`, `cat $out/result` | `sealed`/`private`: `not-propagated` | `public`/`interface`: `propagated` | **RAN.** 4/4 correct — the actual `propagatedBuildInputs` cascade, isolated from any direct reference to the base dependency. |

Empty output in every `grep`/`jq`-shaped check above means the check passed (no violation found); a non-empty match or a non-zero `cmp`/build exit means a real defect was caught. Versions measured on: CppNix 2.35.2, nixpkgs `8d5d270900d3fc75655ea2d9d248b234f6631439` (26.11pre), nixfmt 1.5.0.

## Exemplar evidence

This pass adds no new exemplar-corpus citations beyond what `nix-generated-flakes.md` and its two dives already established (the corpus itself was not re-surveyed) — see that file's own "Applied to the exemplars" section, unchanged. The one addition: `autoPatchelfHook`'s own documented `autoPatchelfIgnoreMissingDeps` mechanism (finding 7) has no exemplar-corpus precedent in the 38-repo set surveyed for this program; it is cited from the tool's own upstream documentation, not from an exemplar flake.

## AI-agent angle

1. **Reflexively single-quoting (or shell-escaping) every argument passed to `makeWrapper`**, on the general "always escape shell arguments" instinct, without noticing that a value deliberately containing a shell-variable reference (`$installPath`) needs to survive quoting, not be neutralized by it. Check: `cat $out/bin/<name>` after building an env-wrapped binary — a literal, unexpanded `$installPath` (or any other obviously-a-variable-reference string) inside a single-quoted `export` line is the tell; `lib.escapeShellArgs` on a list containing such values is worth a second look specifically.
2. **Renaming a `makeWrapper`-produced script onto its own original target path** (`makeWrapper orig wrapped; rm orig; mv wrapped orig`) instead of wrapping a separately-named raw executable — `makeWrapper` bakes the *target path at creation time* into the wrapper's own `exec` line, so moving the wrapper onto that exact path makes it `exec` itself, hanging forever with no error message at all (confirmed: two `nix run` invocations timed out at their full budget with 0% CPU, not a fast crash). Check: never let a wrapper's install path equal the path it was told to wrap; keep the raw executable at a separate name (`libexec/<name>-raw` or similar) permanently.
3. **Reaching for `autoPatchelfIgnoreMissingDeps = [ "*" ]` (or dropping `autoPatchelfHook` entirely) the moment a multi-binary package's build fails on one bundled binary's dependency**, rather than reading which specific binary and which specific soname failed. A blanket ignore silently hides a real missing dependency on every *other* binary in the package too, forever, with no diagnostic ever surfacing again. Check: the ignore-list must name specific sonames (`grep` for a bare `[ "*" ]` next to `autoPatchelfIgnoreMissingDeps` in generator-authored Nix is a finding).
4. **Treating a passing `nix flake check --no-build` (or `--all-systems --no-build`) as evidence that a package actually builds**, including after fixing an unrelated bug — the schema check does not realize any FOD, so a corrupted digest, a missing runtime dependency, or (per this pass) a completely unbuildable `autoPatchelfHook` failure all pass it identically to a correct package. Check: NIX-GEN-15's smoke build is not optional even when the schema check is green; this pass measured the schema check exiting 0 on a package (`kitware-cmake`, pre-fix) that could not build at all.
5. **Assuming a package's binaries all share the same dependency profile** because they ship in one layer/one tarball — `kitware/cmake`'s five binaries split cleanly into "needs nothing extra" (4 of them) and "needs a GUI toolkit" (1). An agent authoring the generic autopatchelf template from the first package it tries (likely a single-binary CLI tool) will not discover this split until a multi-binary GUI-adjacent package is actually built.

## Contested / evolving

- **Whether `cmake-gui` (and any other bundled GUI tool ocx's index happens to list) should build present-but-broken, or should the generator add its real GUI dependencies so it runs.** This pass's default (ignore-list, present-but-broken) optimizes for "the CLI tools this package is actually mirrored for keep working"; the alternative (real X11/font `buildInputs`) makes every declared binary functional at the cost of a real dependency the CLI-only consumer never asked for. Unresolved; an ADR question, not a Nix question — trending toward "ignore for now," since ocx mirrors CLI tools primarily and no GUI-priority signal exists in the index today.
- **Whether the `list` env type and non-`sealed` dependency visibility are dead code paths worth building generator support for at all**, given 0/122 real packages use either today. This pass's position: build the translation logic (cheap, generic, already covers `path`/`constant` identically) but do not invest further engineering (real-index test fixtures, generator unit tests beyond the design table) until the index actually carries an example — consistent with the map's own "invent no signal" principle for unpopulated schema fields (NIX-GEN-18's `status`/`yanked` handling makes the same call).

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [nix-generated-flakes.md](../nix-generated-flakes.md) | This program's own consolidated NIX-GEN ruleset, revised by this pass | 2026-09-27 (revised 2026-09-27) | Every ID this file's findings map onto; the Revision log records exactly what changed |
| [nix-generated-flakes/index-data-model.md](../nix-generated-flakes/index-data-model.md) | Wave-2 dive: 125 packages → attribute tree, digest canonicalization, the eval-time reader, size projections | 2026-09-27 | Owns the `compliant/`/`violation/`/`eval-time-reader/` fixtures this pass re-runs; its own Verification runs table names exactly which rows were NOT RUN |
| [nix-generated-flakes/oci-fetch-prototype.md](../nix-generated-flakes/oci-fetch-prototype.md) | Wave-2 dive: the ghcr.io fetch mechanism, static/glibc census, per-platform config blobs | 2026-09-27 | Owns the live 401/200/307 probes this pass's own census (finding 8) reproduces and extends to all 125 packages |
| [nix-audit/ocx-index-and-fleet.md](../nix-audit/ocx-index-and-fleet.md) | Numbers-first audit of the index wire contract and package format | 2026-09-27 | Original H6 probe methodology this pass's 122-package census follows |
| `/home/mherwig/dev/ocx/website/src/docs/reference/metadata.md` (local checkout, read 2026-09-27) | ocx's own metadata reference — env types, interpolation tokens, dependency visibility | current as of this program's snapshot | §Path/Constant/List Variables and §Visibility are the exact spec `lib/mk-ocx-env.nix` and the dependency mapping implement; explicitly names `propagatedBuildInputs` as the Nix analogue |
| [nixpkgs doc/hooks/autopatchelf.section.md](https://github.com/NixOS/nixpkgs/blob/master/doc/hooks/autopatchelf.section.md) | nixpkgs manual (primary), fetched live 2026-09-27 | current, nixpkgs 26.11pre | States the fail-whole-derivation behavior and the exact `autoPatchelfIgnoreMissingDeps` mechanism this pass's NIX-GEN-19 relies on |
| [nixpkgs doc/stdenv/stdenv.chapter.md](https://github.com/NixOS/nixpkgs/blob/master/doc/stdenv/stdenv.chapter.md) | nixpkgs manual (primary), fetched live 2026-09-27 | current, nixpkgs 26.11pre | `propagatedBuildInputs`'s own definition ("the propagated equivalent of `buildInputs`") and a worked transitive-propagation example, confirming the mechanism finding 8's grandchild test measures |
| ghcr.io `/v2/ocx-contrib/<ns>/<pkg>/manifests/<digest>` and `/blobs/<digest>` (live, anonymous) | GitHub Container Registry's own endpoints, probed live 2026-09-27 | live | The 122-package env-type/dependency census (finding 8) and corretto's real config blob |
| [Nix manual, language/advanced-attributes.md](https://github.com/NixOS/nix/blob/master/doc/manual/source/language/advanced-attributes.md) | Nix manual (primary) | current, Nix 2.35 | Fixed-output-derivation semantics underlying the `--rebuild` re-verification (finding: FODs already in store look built without it) |
| [Nix manual, pure evaluation](https://nix.dev/manual/nix/2.24/language/import-from-derivation) (cross-referenced via the live error text) | Nix's own error message text, reproduced live 2026-09-27 | current, Nix 2.35.2 | The exact wording (`forbidden in pure evaluation mode`) distinguishing the path-access gate from IFD, confirmed by running, not by reading documentation alone |
| [nix-topic-map.md](../../nix-topic-map.md) | This program's phase-3 consolidated map | 2026-09-27 | Conflict 15 (`x86_64-darwin` dropped by nixpkgs 26.11), conflict 17 (eval-time-reader option (c)) — both reconfirmed live this pass |
| `fixtures/nix-generated-flakes/good/`, `bad/`, `bad-digest/` (this program's own fixtures) | The consolidation's reference twins | committed 2026-09-27 | `good/` is the first-ever completed real build target for `kitware-cmake` (this pass) and the subject of the NIX-GEN-17 jq -S finding |
| `/home/mherwig/dev/index/p/**/*.json` (local checkout, read 2026-09-27) | The live ocx index — 125 package roots, stored image indexes | measured 2026-09-27 | Source of every package's `latest` content digest and platform manifest digest for the census in finding 8 |
| `ocx_oci/src/platform.rs` (local checkout `/home/mherwig/dev/ocx/crates/ocx_oci/src/platform.rs`) | ocx's own platform-compatibility implementation | read 2026-09-27 (cross-referenced, not re-read line-by-line this pass) | The relation NIX-GEN-04 already binds a generator to reproduce; corretto's bare-glibc/musl-only offer (finding 8) is a new data point against it |
| curl 8.15.0 (host tool, not the sandboxed toolchain) | Used for the live, anonymous registry census outside the contended Nix sandbox | 2026-09-27 | Confirms NIX-GEN-08's fixed-header mechanism at 122-package scale, not just the 5 packages the prior dives sampled |
