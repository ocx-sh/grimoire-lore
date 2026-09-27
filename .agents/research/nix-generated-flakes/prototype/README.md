# ocx-index generated-flake prototype

## Known breaks (evidence, not a reference)

Fix all ten before adoption.

1. NIX-GEN-20: `${self.env.KEY}` spliced as `"$KEY"` (`lib/mk-ocx-env.nix`).
2. NIX-GEN-20: first-token-only `renderChunk` ships `${deps.…}` literally.
3. NIX-GEN-21: synthesised description, no homepage.
4. NIX-GEN-22: `entrypoints`/`dependencies` silently ignored.
5. NIX-PKG-11: `unpackPhase`/`installPhase` without `runHook`
   (`lib/mk-package.nix:67,80`).
6. NIX-GATE-01: bare `nixfmt` formatter.
7. NIX-INP-03: rev in `url` with no frozen-on-purpose comment.
8. NIX-GEN-14: unmapped SPDX ids dropped (`lib/mk-package.nix:23`, use
   `{ spdxId = id; shortName = id; }`).
9. Registry repository hardcoded to `ocx-contrib` (`lib/mk-package.nix:63`).
10. `data.json` is a sample: 1 of 13 actionlint digests (NIX-GEN-03,
    NIX-GEN-17).

## Revision, 2026-09-27 (verification-rerun-w3): the three Verdict-10 breaks are fixed

Verdict 10 of `nix-generated-flakes.md` listed three ways this prototype
broke its own ruleset. All three are fixed, and the fixed build re-ran the
full checklist (Q5, `--rebuild` on all four packages, the smoke check,
`aarch64-darwin` `drvPath` eval, `gen13-check.sh`, the NIX-GEN-19 and
NIX-GEN-07 jq checks, `nixfmt --check`, `deadnix --fail`) — every one exit
0. Full commands and output are in `verification-rerun-w3.md`.

1. **NIX-GEN-11**: `lib/mk-package.nix` gated the hook on
   `plat.libc == "glibc"`. Fixed to `isLinux = lib.hasSuffix "-linux"
   stdenv.hostPlatform.system` — every Linux package gets the hook,
   whatever its libc tag (bare does not mean static).
2. **NIX-GEN-17**: `data.json` was hand-edited and drifted from `jq -S`
   order. Regenerated with `jq -S . data.json` in place; `jq -S . data.json
   | cmp - data.json` now exits 0.
3. **NIX-GEN-20**: `lib/mk-package.nix` hand double-quoted each translated
   arg into the builder (`"${a}"` over a whole value) — a build-time shell
   injection from registry data, and it broke ocx's own `$${` escape.
   `lib/mk-ocx-env.nix` is rewritten to segment-escape every literal
   portion of a value with `lib.escapeShellArg` and splice in only the bare
   `$installPath` (or `$KEY` for `${self.env.KEY}`) reference — proven
   safe by planting a hostile `HOSTILE=pre$(touch /tmp/PWNED)post` value on
   the real corretto entry, building it, and confirming both that the
   build succeeds and that `/tmp/PWNED` is never created (the wrapper's
   `export HOSTILE='pre$(touch /tmp/PWNED)post'` line is single-quoted, so
   bash never evaluates the substitution). The planted value was removed
   again before `data.json` was finalized.

`mk-ocx-env.nix` was also extended past the wave-2 rerun's `installPath`-only
form to the full token grammar (`:native`/`:posix` modifiers — inlined,
no-op on Nix's POSIX-only targets; `${self.env.KEY}` — translated to a
bash variable reference, correct only because entries are emitted to
`makeWrapper` in the same order as ocx's own array; `${deps.NAME.installPath}`
— left as a `throw`, since 0/122 real packages declare a dependency today
and building that plumbing now would be unverifiable). See
`verification-rerun-w3.md` for the full census and the per-form decision
table, and its `entrypoints/` fixture for the one planted entrypoint twin
(`entrypoints`/`makeWrapper --add-flags` is designed and proven there, not
wired into this small prototype, since 0/122 real packages declare an
entrypoint either).


Wave-2 re-run + M-E-11 extension. Extends the wave-2-dive prototypes
(`nix-generated-flakes/oci-fetch-prototype.md`, `.../index-data-model.md`)
and the consolidation's `fixtures/nix-generated-flakes/good/` with:

1. a real fix (`autoPatchelfIgnoreMissingDeps`, sourced from the data file)
   that makes `kitware/cmake`'s real 5-binary layer actually build — the
   consolidation's own fixture did not build end to end before this pass;
2. a generic env-array-to-`makeWrapper` translator (`lib/mk-ocx-env.nix`)
   covering ocx's `path`/`constant`/`list` env types, tested against
   `amazon/corretto`'s real, live-fetched metadata (`JAVA_HOME`
   constant + `PATH` path).

Environment: `/home/mherwig/.cache/research-lang/nix-tools/run.sh`, CppNix
2.35.2, nixpkgs pinned to `8d5d270900d3fc75655ea2d9d248b234f6631439`
(26.11pre). Store was **warm** (14 GB / 36k paths already present from
earlier wave-2 work) for every run below except the derivations this
prototype itself introduces, which were cold on first build and are
re-verified with `--rebuild` (a second build against the already-built
output, which is what actually catches a drifted FOD — `--rebuild` errors
outright if nothing was built yet, "Hint: --rebuild and --check error if
the derivation was not previously built"). Registry probes were anonymous
only (`Authorization: Bearer QQ==`, ghcr.io's public-pull convenience —
NIX-GEN-08).

## Files

- `flake.nix` — `packages`/`legacyPackages`/`overlays.default`/`checks.smoke`.
- `flake.lock` — pinned nixpkgs input, generated in this fixture (not
  hand-written).
- `data.json` — 4 packages: `actionlint/actionlint`, `ninja-build/ninja`,
  `kitware/cmake` (real ghcr.io layers, from the wave-2 consolidation's own
  `nix-generated-flakes/good/` fixture) and `amazon/corretto` (real,
  live-fetched `env`/`binaries` metadata; **synthetic** stub payload — see
  below).
- `lib/fetch-layer.nix`, `lib/tree.nix` — unchanged from the consolidation.
- `lib/mk-package.nix` — extended: `autoPatchelfIgnoreMissingDeps` (per
  package, from the data file) and env-array translation via `mk-ocx-env`;
  branches on `platforms.<system>.synthetic` to skip the real ghcr.io fetch
  for the one demo package that needs none.
- `lib/mk-ocx-env.nix` — new: ocx `path`/`constant`/`list` env types →
  `makeWrapper --prefix`/`--set`/`--suffix`.

## Why corretto's payload is synthetic

corretto's real linux/amd64+glibc layer is 209 MB (measured live,
`manifest.layers[0].size`). The fetch mechanism itself (NIX-GEN-08/09) is
already proven on 5 other packages across two prior dives and re-proven
below on 3 more (actionlint, ninja, cmake) — downloading a fourth, much
larger blob would prove nothing new about the *env-translation* mechanism
this file exists to test. `data.json`'s corretto entry carries its config
blob's **real** `env` array and `binaries` list verbatim (fetched live
2026-09-27, digests recorded in `data.json`'s own `_comment` fields); only
the multi-hundred-MB tar+xz layer is swapped for two-line stub scripts
(`mk-package.nix`'s `synthetic` branch). Nothing about the wrapper
mechanism differs between a real and a synthetic payload — `makeWrapper`
wraps whatever executable is at that path.

## Real config blobs fetched live (2026-09-27, anonymous)

```
curl -sfL -H 'Authorization: Bearer QQ==' \
  https://ghcr.io/v2/ocx-contrib/amazon/corretto/manifests/sha256:8da2721dd70c89739227f5159d098fa609340a18afc2ec7c09e2b6b1b0f80741
# -> config.digest = sha256:769dd0d019ddd0c2600502e386e689a3ea71e9234c192c21e36057d7da11d420

curl -sfL -H 'Authorization: Bearer QQ==' \
  https://ghcr.io/v2/ocx-contrib/amazon/corretto/blobs/sha256:769dd0d019ddd0c2600502e386e689a3ea71e9234c192c21e36057d7da11d420
# -> {"env":[{"key":"PATH","type":"path","required":true,"value":"${installPath}/bin","visibility":"public"},
#            {"key":"JAVA_HOME","type":"constant","value":"${installPath}","visibility":"public"}],
#     "binaries":["asprof","jar",...,"31 total"]}
```

corretto offers BOTH a `+libc.glibc` and a `+libc.musl` linux/amd64
manifest, no bare one (unlike the map's earlier assumption that a package
is either bare or single-tagged glibc).

### 122-package census: env types and dependency usage (live, anonymous)

Every one of the 125 index packages' `latest` linux/amd64 manifest and
config blob was fetched (122/125 succeeded; `grimoire/cli`, `ocx/cli`,
`ocx/mirror` 404 — the fleet's own unpublished-to-ghcr.io-anonymous
entries):

| Env types present | Package count |
|---|---|
| `path` only | 118 |
| `constant` + `path` | 2 (`amazon/corretto`, `anomalyco/opencode`) |
| `list` | 0 |
| non-empty `dependencies` | 0 |

**`list` and `dependencies` are both unused across the real index today** —
confirmed by exhaustive live probe, not sampling. This directly answers the
brief's "record 'none' if no such package exists" for the dependency half
of M-E-11: none exists. The dependency-visibility mapping below is
therefore a **design table**, verified on a synthetic 2-hop chain (kept in
the wave-2 verification fixtures, not duplicated into this small handoff
prototype), not on real index data.

## Verbatim commands and results

Store state: **warm** for nixpkgs/toolchain paths; **cold** for this
prototype's own derivations (`git+file://.../prototype-final`'s hash is
new every time the source changes, so each edit forces a genuine
from-scratch build of the affected derivation — confirmed by `nix build`'s
own "this derivation will be built" / "building '...'" lines below, not
"copying path ... from cache").

```
$ nix flake check --all-systems --no-build --no-write-lock-file .
all checks passed!
$ echo $?
0

$ nix build --no-link --no-write-lock-file '.#checks.x86_64-linux.smoke' -L
ocx-smoke> 1.7.12
ocx-smoke> installed by downloading from release page
ocx-smoke> built with go1.26.1 compiler for linux/amd64
ocx-smoke> 1.13.2
ocx-smoke> cmake version 4.4.2
ocx-smoke>
ocx-smoke> CMake suite maintained and supported by Kitware (kitware.com/cmake).
$ echo $?
0
```

Per-package, from a store that had never built these exact derivations
(first build), then re-verified with `--rebuild` (a genuine second build,
which is the check that actually catches an FOD whose declared hash no
longer matches what a rebuild fetches — NIX-GEN-15):

| Package | First build | `--rebuild` | `--version` output |
|---|---|---|---|
| `actionlint-actionlint` | built, exit 0 | `checking outputs of '...drv'...`, exit 0 | `1.7.12` |
| `ninja-build-ninja` | built, exit 0 | `checking outputs of '...drv'...`, exit 0 | `1.13.2` |
| `kitware-cmake` | built (after the `autoPatchelfIgnoreMissingDeps` fix — see below), exit 0 | `checking outputs of '...drv'...`, exit 0 | `cmake version 4.4.2` (via `$out/bin/cmake`, the PATH wrapper; `cmake-gui` remains present but non-functional — see below) |
| `amazon-corretto` | built, exit 0 | not applicable (synthetic payload; the fetch this check targets does not exist here) | `java ran` (`$out/bin/java`'s wrapper: `JAVA_HOME=/nix/store/...-amazon-corretto-21.0.9`, `PATH` prefixed with `.../libexec/corretto/bin` — both resolved from the *real* corretto env array) |

`aarch64-darwin` (eval only — no Darwin builder here):

```
$ nix eval --no-write-lock-file --raw '.#packages.aarch64-darwin.actionlint-actionlint.drvPath'
/nix/store/8vhi4nf2d61npr2ibzb4aqm96k90j0ps-actionlint-actionlint-1.7.12.drv
$ nix eval --no-write-lock-file --raw '.#packages.aarch64-darwin.ninja-build-ninja.drvPath'
/nix/store/34drxj46cb82lzn8536va2iwc0wzhfbr-ninja-build-ninja-1.13.2.drv
$ nix eval --no-write-lock-file --raw '.#packages.aarch64-darwin.kitware-cmake.drvPath'
/nix/store/bic72zmm1k71yh95qrgyrs4chrhrwk7c-kitware-cmake-4.4.2.drv
```

`amazon-corretto` correctly has **no** `aarch64-darwin` attribute at all
(NIX-GEN-06: "leave a package out of a system it does not offer" —
`data.json`'s corretto entry declares only an `x86_64-linux` platform;
`nix eval .#packages.aarch64-darwin.amazon-corretto` errors
`does not provide attribute`, exit 1, which is correct, not a bug).

Overlay (Q20) and legacyPackages tree, both still exactly as the
consolidation specified:

```
$ nix eval --no-write-lock-file --json '.#overlays.default' \
    --apply 'o: builtins.attrNames (o { } { })'
["ocx"]

$ nix eval --no-write-lock-file --json '.#legacyPackages.x86_64-linux.amazon.corretto' \
    --apply 'v: builtins.attrNames v'
["21","21.0.9","latest"]
```

## The `autoPatchelfHook` finding (new this pass)

Neither prior dive ever completed a real sandboxed build of
`kitware/cmake` (both hit shared-store contention and reported the
verification NOT RUN). Built for the first time this pass:

```
$ nix build --no-link --no-write-lock-file '.#kitware-cmake' -L
kitware-cmake> setting interpreter of .../libexec/cmake/bin/cmake-gui
kitware-cmake> searching for dependencies of .../libexec/cmake/bin/cmake-gui
kitware-cmake>     libxcb.so.1 -> not found!
kitware-cmake>     libfontconfig.so.1 -> not found!
kitware-cmake>     libfreetype.so.6 -> not found!
kitware-cmake> auto-patchelf: 3 dependencies could not be satisfied
kitware-cmake> error: auto-patchelf could not satisfy dependency libxcb.so.1 wanted by .../cmake-gui
error: Cannot build '...-kitware-cmake-4.4.2.drv'.
```

`autoPatchelfHook` fails the **entire derivation** if any one bundled
binary has an unresolved shared-library dependency — even though only
`cmake-gui` (a GUI tool ocx's own `binaries` list still declares) needs
X11/fontconfig/freetype; `cmake`/`ccmake`/`cpack`/`ctest` need nothing
extra. The fix, added to `mk-package.nix` and sourced from the data file
(never a blanket `["*"]`, which would silently hide a real missing
dependency on every other binary too):

```nix
autoPatchelfIgnoreMissingDeps = entry.autoPatchelfIgnoreMissingDeps or [ ];
```

with `data.json`'s cmake entry carrying
`"autoPatchelfIgnoreMissingDeps": ["libxcb.so.1", "libfontconfig.so.1", "libfreetype.so.6"]`.
After the fix: `cmake`/`ccmake`/`cpack`/`ctest` run; `cmake-gui` still
fails at *run* time (`error while loading shared libraries: libxcb.so.1`),
which is honest and correct — ignoring a missing dependency at patch time
does not make the library appear. Whether ocx's generator should instead
add the 3 real X11 packages to `buildInputs` (making `cmake-gui` actually
run) or keep the ignore-list (accepting that one bundled GUI tool is
inert) is an open ADR question — see the main report.

## Env translation mechanism (`lib/mk-ocx-env.nix`)

```nix
{ key = "PATH"; type = "path"; value = "${installPath}/bin"; }
  -> [ "--prefix" "PATH" ":" "$installPath/bin" ]

{ key = "JAVA_HOME"; type = "constant"; value = "${installPath}"; }
  -> [ "--set" "JAVA_HOME" "$installPath" ]

{ key = "GODEBUG"; type = "list"; separator = ","; value = "gctrace=1"; }
  -> [ "--suffix" "GODEBUG" "," "$installPath/..." ]   # (untested: 0/122 real packages use `list`)
```

ocx's `${installPath}` token is already valid bash parameter-expansion
syntax — the translator only rewrites it to the literal text
`$installPath`; the derivation sets `installPath="$out/libexec/<pkg>"`
before invoking `makeWrapper`, so bash's own expansion resolves it exactly
as ocx's own runtime would. Verified end to end: corretto's wrapper script
(`cat $out/bin/java`) contains
`export JAVA_HOME='/nix/store/...-amazon-corretto-21.0.9/libexec/corretto'`
and a `PATH` prefixed with the same root's `bin/` — both the *real*
resolved store path, not the literal token.

## Dependency-visibility mapping (design table; ADR input)

No real ocx-index package declares a dependency (see census above), so
this is verified on a synthetic 2-package chain in the wave-2 verification
fixtures (`fixtures/verification-rerun-w2/env-proto/`), not reproduced
here to keep this handoff small. Result, exhaustively confirmed for all 4
visibilities plus one level of transitive propagation:

| ocx `dependencies[].visibility` | `has_private` (self sees env) | `has_interface` (propagates to consumers) | Nix mapping |
|---|---|---|---|
| `sealed` (default) | no | no | plain `buildInputs`; **no** wrapper flags from the dependency's env at all |
| `private` | yes | no | `buildInputs` + apply the dependency's own public/interface env entries to *this* package's own wrapper only |
| `public` | yes | yes | `propagatedBuildInputs` (ocx's own metadata.md already names this as the closest Nix analogue) — wraps this package's own binaries **and** cascades to a dependent's `buildInputs` automatically |
| `interface` | no | yes | `propagatedBuildInputs`, but this package's **own** wrapper does not apply the env (Nix has no clean built-in split for "propagate but don't self-apply"; the fixture achieves it by keeping the dependency out of *this* package's env-application step while still listing it under `propagatedBuildInputs`) |

Verified (env-proto fixture, `nix build` + direct binary invocation):
`sealed`/`interface` consumers print an empty `BASE_HOME`; `private`/
`public` consumers print the dependency's real store path. A grandchild
package that depends on the consumer via `buildInputs` alone (never
mentioning the base dependency itself) finds the dependency's binary on
`PATH` only when the visibility was `public` or `interface`
(`propagated`/`not-propagated`, 4/4 correct).
