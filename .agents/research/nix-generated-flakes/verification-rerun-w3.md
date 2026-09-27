---
title: "NIX-GEN wave-3 rerun: red twins for GEN-02/04/05/16, a cold-rebuilt compliant prototype, the M-E-11 token/entrypoint census, and the D meta-source decision (M-E-31)"
topic: "Generated flakes from the ocx index — closing every NIX-GEN row that was MUST with no watched red"
agent: nix-generated-flakes/verification-rerun-w3
model: sonnet
date_researched: 2026-09-27
sources_count: 16
fixtures: /home/mherwig/.cache/research-lang/nix-tools/fixtures/verification-rerun-w3/generated-flakes/ (gen02/, gen04/, gen05/, gen16/, entrypoints/, meta-census/, mk-ocx-env-test/); the fixed prototype lives in-place at .agents/research/nix-generated-flakes/prototype/ (not under nix-tools/fixtures, per the existing convention for that sub-artifact)
scope: >
  Covers: planted red/green twins for NIX-GEN-02, 04, 05 and 16 (previously
  MUST-by-reading-heuristic only); making nix-generated-flakes/prototype/
  compliant with NIX-GEN-11, 17 and 20 (Verdict 10's three breaks), rebuilt
  cold and re-run through the full checklist (Q5, --rebuild ×4,
  aarch64-darwin drvPath eval, the smoke check, gen13-check.sh, the GEN-19
  and GEN-07 jq checks, nixfmt, deadnix); a live, exhaustive 122-package
  census of every interpolation-token form and of entrypoints/dependencies
  in real ocx config blobs, closing M-E-11's remainder with a per-form
  translate/inline/refuse decision and one planted entrypoint twin; a
  122-package census of OCI description/url/source/license annotations
  settling the D meta-source rule for NIX-PKG-07 (new row M-E-31, contested
  in E15); and replacing Verdict 3's wrong `nix run` example (E26) after
  measuring what it actually does. Does NOT cover: re-deriving numbers
  already measured and not flagged NOT RUN (tag/digest canonicalization,
  the nixpkgs-shadowing census, the live ghcr.io header/redirect probes);
  Darwin code-signing (M-E-10, no Darwin builder in this program); the
  `list` env type or `deps.NAME.installPath` beyond a design decision (both
  are 0/122 in real data, confirmed again this pass).
---

# NIX-GEN wave-3 rerun

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Environment](#1-environment)
   2. [NIX-GEN-02: a generator with its own platform logic vs a data-only reader](#2-nix-gen-02-a-generator-with-its-own-platform-logic-vs-a-data-only-reader)
   3. [NIX-GEN-04: first-match(os,arch) drops corretto and misroutes ruff](#3-nix-gen-04-first-matchosarch-drops-corretto-and-misroutes-ruff)
   4. [NIX-GEN-05: copying one platform's config blob onto another](#4-nix-gen-05-copying-one-platforms-config-blob-onto-another)
   5. [NIX-GEN-16: a checker that matches both twins, and its fix](#5-nix-gen-16-a-checker-that-matches-both-twins-and-its-fix)
   6. [The prototype's three Verdict-10 breaks, fixed and rebuilt cold](#6-the-prototypes-three-verdict-10-breaks-fixed-and-rebuilt-cold)
   7. [The `$$` string-escaping trap in the fix itself](#7-the--string-escaping-trap-in-the-fix-itself)
   8. [M-E-11 remainder: the full token and entrypoint census](#8-m-e-11-remainder-the-full-token-and-entrypoint-census)
   9. [M-E-31: the D meta-source census (description, homepage, license)](#9-m-e-31-the-d-meta-source-census-description-homepage-license)
   10. [E26: what `nix run` on a 5-binary package actually does](#10-e26-what-nix-run-on-a-5-binary-package-actually-does)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- `timeout 60 run.sh nix --version` returned `nix (Nix) 2.35.2` immediately — no ENVIRONMENT FAULT.
- **NIX-GEN-02, 04, 05 and 16 all now have a watched red twin**, closing the "MUST by reading heuristic only" flag the wave-3 harvest carried for them.
- **NIX-GEN-04's red twin is decisive, not cosmetic**: over the real `astral-sh/ruff` and `amazon/corretto` image indexes, a "bare-only, first match" selector silently **drops corretto entirely** (it has glibc+musl offers and no bare one) and **misroutes ruff** to its bare manifest instead of its glibc one. ocx's own directed relation gets both right.
- **NIX-GEN-05's red twin uses real, live-fetched `kitware/cmake` config blobs**: linux's `PATH` value is `${installPath}/bin`, darwin's is `${installPath}/CMake.app/Contents/bin` — a generator that resolves one platform's blob and reuses it for another ships a `PATH` that points at a directory the darwin payload never creates.
- **NIX-GEN-16's own grep, as specified, is not admissible**: it matches `contents: write` on both a bare-push workflow and a PR-based one (both legitimately need that permission), so it never goes green on a compliant twin. The check is replaced by a two-stage grep (files with `git push` that never also mention a PR-creation action), watched red and green.
- **The prototype's three Verdict-10 breaks are fixed and rebuilt cold, all green**: NIX-GEN-11 (hook now unconditional on every `*-linux` system, not gated on `libc == "glibc"`), NIX-GEN-17 (`data.json` regenerated through `jq -S`, confirmed canonical), NIX-GEN-20 (the translator rewritten to segment-escape every literal portion with `lib.escapeShellArg`, splicing only a bare `$installPath`/`$KEY` reference — proven safe by planting a real `HOSTILE=pre$(touch /tmp/PWNED)post` value on corretto's real data, building it, and confirming `/tmp/PWNED` is never created).
- **The fix itself required discovering a second Nix escaping trap**: writing the splice as one indented-string literal (`''"$${var}"''`) silently disables interpolation — Nix's indented **and** double-quoted strings both treat a bare `$$` immediately before `{` as "output a literal `${`, do not interpolate" (the same convention ocx's own `value` grammar uses). The fix is string **concatenation** (`"\"$" + var + "\""`), never one literal containing `$${`.
- **The full compliance checklist all passed after the fix**: Q5 (exit 0), `nix build --rebuild` on all four packages (exit 0, no diff on any), the smoke check (exit 0, all four binaries ran), `aarch64-darwin` `drvPath` eval (exit 0 on the 3 real packages; corretto correctly has no attribute there), `gen13-check.sh` (`true`), the NIX-GEN-19 jq (`true`), the NIX-GEN-07 overlay jq (`["ocx"]`), `nixfmt --check` (exit 0 after one reformat pass) and `deadnix --fail` (exit 0 after removing one dead binding and one unused lambda argument, `prev` → `_prev`, per NIX-FLK-02). No stray `result` symlink was present or created.
- **M-E-11's remainder is closed with a live, exhaustive 122-package census of every interpolation-token form**, not just env types: 121 uses of the bare `${installPath}`/`${self.installPath}` form, and **zero** uses of `:native`/`:posix` modifiers, `${self.env.KEY}`, `${deps.NAME.installPath}`, or the `$${` escape in real data (0/122 each). **Zero packages declare `entrypoints` and zero declare `dependencies`.**
- **The decision per token form**: `installPath`/`self.installPath` — translate (already done, now measured at 121/122). Modifiers — inline as a no-op (Nix's two targets, linux and darwin, are both POSIX; `:native` and `:posix` render identically). `self.env.KEY` — translate to a bash variable reference, correct only because the generator must emit `makeWrapper` flags in the same order as ocx's own `env` array. `deps.NAME.installPath` — **keep the throw**; 0/122 real packages need it, and building the dependency-derivation plumbing now would be unverifiable speculation, not a rule.
- **One entrypoint twin was planted and watched**: wrapping an entrypoint's raw, pre-env binary directly loses the package's own composed environment (`GREETING=` empty); wrapping the already-`env`-wrapped binary preserves it (`GREETING=hello-from-env`) while baked `args` resolve correctly in both cases — the bug is specifically about which binary an entry point wraps, never about the baked-args mechanism itself. `makeWrapper --add-flags` is confirmed as the right primitive.
- **M-E-31 settles NIX-PKG-07's D clause with hard data**: 0/1720 image indexes carry `org.opencontainers.image.description` or `.url`; 98.3% carry `.source`, but it names the **ocx-contrib mirror repository**, never the upstream project. Meanwhile 125/125 packages' own index entry (`p/<ns>/<pkg>.json`) carries a non-empty `desc.description`, and 123/125 carry `upstream.repository_url`. **Decision: source `description` and `homepage` from the ocx package index's own fields, never from OCI annotations** (which don't carry them, or, for `.source`, carry the wrong target).
- **E26 replaced**: `nix run <flake>#kitware.cmake."4.4.2"` does **not** resolve. Measured: `error: unable to execute '.../bin/kitware-cmake': No such file or directory` (exit 0 from `nix run` itself, the launched process fails) — `nix run` with no `mainProgram` looks for `$out/bin/<pname>`, which cmake never has (its real binaries are `cmake`, `ccmake`, `cpack`, `ctest`, `cmake-gui`). The example is replaced with `nix run <flake>#legacyPackages.x86_64-linux.actionlint.actionlint."1.7.12"`, a real single-binary package, measured working (prints `1.7.12`, exit 0).

## Findings

### 1. Environment

`timeout 60 run.sh nix --version` → `nix (Nix) 2.35.2`, immediate. No contention was observed across the whole dive; every `nix build`/`nix eval` below completed on the first try. Toolchain: CppNix 2.35.2, nixpkgs `8d5d270900d3fc75655ea2d9d248b234f6631439` (26.11pre), nixfmt 1.5.0, deadnix 1.3.2.

### 2. NIX-GEN-02: a generator with its own platform logic vs a data-only reader

Fixtures: `verification-rerun-w3/generated-flakes/gen02/{violation,compliant}/`.

The violation (`violation/generate.py`) is a hand-rolled second copy of ocx's `os.features`/`libc.glibc` relation — exactly the "a second implementation of the directed relation" smell `nix-generated-flakes.md`'s NIX-GEN-02 rationale already named from `ocx_oci/src/platform.rs:416` and the setup-ocx duplicate-knowledge finding ([ocx](../nix-audit/ocx-index-and-fleet.md) smell 4). The compliant twin (`compliant/flake.nix` + `compliant/data.json`) is a plain attribute lookup over already-resolved data, with no `os`/`arch`/`libc` comparison anywhere.

The rule's own grep, run verbatim:

```
grep -rn -e 'os.features' -e 'os_features' -e 'libc.glibc' --include='*.nix' --include='*.py' --include='*.sh' <dir>
```

- `violation/`: 3 matches (`generate.py:9,12,13`), exit 0.
- `compliant/`: no matches, exit 1.

This was previously a MUST with no red twin ("no generator exists"); it now has one.

### 3. NIX-GEN-04: first-match(os,arch) drops corretto and misroutes ruff

Fixture: `verification-rerun-w3/generated-flakes/gen04/select.py`, run directly over the real, locally-checked-out `astral-sh/ruff` and `amazon/corretto` image indexes at `/home/mherwig/dev/index/p/astral-sh/ruff/o/sha256/16bbad2d6…json` and `/home/mherwig/dev/index/p/amazon/corretto/o/sha256/108e201df…json` (both `latest`-tag digests, read 2026-09-27).

Real manifest order for `amazon/corretto`'s latest index (`index@current:p/amazon/corretto/o/sha256/108e201df…json:0-6`):

```
0 darwin/amd64 (bare)          4 linux/arm64 +libc.glibc
1 darwin/arm64 (bare)          5 linux/arm64 +libc.musl
2 linux/amd64  +libc.glibc     6 windows/amd64 (bare)
3 linux/amd64  +libc.musl
```

There is **no bare linux/amd64 offer at all**. Real manifest order for `astral-sh/ruff`'s latest index (`index@current:p/astral-sh/ruff/o/sha256/16bbad2d6…json:1-30`) has the **bare** linux/amd64 manifest *before* the glibc-tagged one.

Two selectors, run over both packages:

- **RED** — `select_violation_bare_only_first_match`: returns the manifest whose platform object has no `os.features` key at all, for the first (os, arch) match. Never falls back.
- **GREEN** — `select_compliant_relation`: prefers a `libc.glibc`-tagged offer for a glibc host, falls back to bare only if no tagged offer exists, never returns a musl-only offer.

```json
{
  "astral-sh/ruff":   { "violation": "sha256:71ae015be5354" (bare),  "compliant": "sha256:a662c4fb79a55" (glibc), "dropped": false },
  "amazon/corretto":  { "violation": null,                            "compliant": "sha256:8da2721dd70c8" (glibc), "dropped": true }
}
```

`select.py` exits 0 and asserts both findings itself (`corretto["violation_dropped"] == True` and `corretto["compliant_relation"] is not None`). This is exactly what NIX-GEN-04's rationale predicted from reading alone ("a first-match or bare-only selector drops or misroutes it") — now measured on the real data, not asserted.

### 4. NIX-GEN-05: copying one platform's config blob onto another

Fixture: `verification-rerun-w3/generated-flakes/gen05/flake.nix`. Real config blobs for `kitware/cmake@4.4.2`, fetched live 2026-09-27 (`curl -sfL -H 'Authorization: Bearer QQ==' -H 'Accept: application/vnd.oci.image.manifest.v1+json' https://ghcr.io/v2/ocx-contrib/kitware/cmake/manifests/<digest>`, then `/blobs/<config-digest>`):

- linux/amd64 (`+libc.glibc`, manifest `sha256:ffad8560…`, config `sha256:93bfa848…`): `env[0].value = "${installPath}/bin"`.
- darwin/arm64 (manifest `sha256:0171cee5…`, config `sha256:ce8d40cc…`): `env[0].value = "${installPath}/CMake.app/Contents/bin"`.

```
$ nix eval --no-write-lock-file --json .#violationDarwinArgs
["--prefix","PATH",":","$installPath/bin"]              # linux's value, reused on darwin — WRONG
$ nix eval --no-write-lock-file --json .#compliantDarwinArgs
["--prefix","PATH",":","$installPath/CMake.app/Contents/bin"]   # darwin's own value — RIGHT
$ nix eval --no-write-lock-file .#mismatch
true
```

This matches Verdict 3 §5's already-measured claim (real config blobs, two registry hops per platform) but adds the concrete, watched consequence: a generator that fetches one platform's blob and copies its `env` onto every other platform ships a `PATH` prefix that points at a directory darwin's payload never creates (`bin/` at the wrong location; the real payload puts binaries under `CMake.app/Contents/bin/`).

### 5. NIX-GEN-16: a checker that matches both twins, and its fix

Fixtures: `verification-rerun-w3/generated-flakes/gen16/{violation,compliant}/.github/workflows/update.yml`. The violation workflow ends its job with a bare `git config` + `git commit` + `git push` to the default branch under `permissions: contents: write`. The compliant workflow uses `peter-evans/create-pull-request@v7` instead, under the same `contents: write` (needed to push the PR branch) plus `pull-requests: write`.

Running the rule's own literal grep,

```
grep -rn -e 'contents: write' -e 'git push' -e 'create-pull-request' <dir>/.github/workflows
```

matches `contents: write` on **both** twins (line 5 in each), because a PR-creation action legitimately needs that permission too — **the check as specified is not admissible**: it can never be watched green on a real compliant twin without also being red on it. This is a checker-shape defect in the existing rule text, not a Nix finding, and is worth converging on (Contested/evolving, below).

Fixed, two-stage form (files that `git push` and never also mention a PR-creation action):

```
grep -rl -e 'git push' <dir>/.github/workflows | xargs -r grep -L -e 'create-pull-request' -e 'create-pr'
```

- `violation/`: prints `violation/.github/workflows/update.yml` (non-empty = finding).
- `compliant/`: empty output (pass).

### 6. The prototype's three Verdict-10 breaks, fixed and rebuilt cold

All three fixes land in `nix-generated-flakes/prototype/lib/`:

**NIX-GEN-11** (`lib/mk-package.nix`). Before:

```nix
glibc = plat.libc == "glibc" && patchelf;
nativeBuildInputs = [ makeWrapper ] ++ lib.optional glibc autoPatchelfHook;
```

After:

```nix
isLinux = lib.hasSuffix "-linux" stdenv.hostPlatform.system;
autoPatchelf = isLinux && patchelf;
nativeBuildInputs = [ makeWrapper ] ++ lib.optional autoPatchelf autoPatchelfHook;
buildInputs = lib.optional autoPatchelf stdenv.cc.cc.lib;
```

Matches Verdict 4's already-decided text ("Every Linux package gets `autoPatchelfHook` ... whatever its libc tag").

**NIX-GEN-17** (`data.json`). Regenerated in place with `run.sh jq -S . data.json` (piped through a temp file, since `jq -S` can't safely write its own input). `jq -S . data.json | cmp - data.json` now exits 0.

**NIX-GEN-20** (`lib/mk-ocx-env.nix`, `lib/mk-package.nix`). Before, `mk-package.nix`'s `installPhase` called `mkEnvArgs` (which returned a plain list of already-token-substituted-but-unescaped strings) and hand double-quoted each: `${lib.concatMapStringsSep " " (a: ''"${a}"'') (mkEnvArgs …)}` — the exact "hand double-quoting" injection the wave-2 rerun's own revision log flagged as an overclaim (executes `$(...)` from registry data at build time; breaks ocx's `$${` escape). After: `mkEnvArgs` itself returns one fully segment-escaped, ready-to-splice string per env entry; `mk-package.nix` splices it directly (`${mkEnvArgs (entry.env or [ ])}`, no extra quoting layer). See §7 for the escaping mechanics and §8 for the extended token grammar this rewrite also closes.

**Full checklist, in order, on the fixed prototype** (fixture: `.agents/research/nix-generated-flakes/prototype/`, in place):

| Step | Command | Exit |
|---|---|---|
| Q5 | `nix flake check --no-write-lock-file --no-build --option allow-import-from-derivation false .` | 0 (`all checks passed!`) |
| cold build ×4 | `nix build --no-write-lock-file --no-link .#<pkg>` for actionlint/ninja/cmake/corretto | 0, 0, 0, 0 |
| `--rebuild` ×4 | `nix build --no-write-lock-file --no-link --rebuild .#<pkg>` | 0, 0, 0, 0 (`checking outputs of ...`, no diff, all four) |
| smoke | `nix build --no-write-lock-file --no-link -L .#checks.x86_64-linux.smoke` | 0 (prints `1.7.12`, `1.13.2`, `cmake version 4.4.2`, the corretto stub's greeting) |
| aarch64-darwin eval ×3 | `nix eval --no-write-lock-file --raw .#packages.aarch64-darwin.<pkg>.drvPath` | 0, 0, 0 (a `.drv` path each; corretto correctly has no attribute there) |
| gen13-check.sh | `bash nix-generated-flakes-rev/gen13-check.sh` | 0 (`true`) |
| GEN-19 jq | `jq -e '[.. \| objects \| .autoPatchelfIgnoreMissingDeps? // empty \| .[]] \| all(. != "*" and test("^[A-Za-z0-9._+-]+\\.so(\\.[0-9]+)*$"))' data.json` | 0 (`true`) |
| GEN-07 overlay | `nix eval --no-write-lock-file --json .#overlays.default --apply 'o: builtins.attrNames (o { } { })'` | 0 (`["ocx"]`) |
| nixfmt | `nixfmt --check lib/*.nix flake.nix` | 0 (after one `nixfmt` reformat pass over the same files) |
| deadnix | `deadnix --fail --no-lambda-pattern-names lib/ flake.nix` | 0 (after removing a dead `stripModifier` binding and renaming an unused `prev` to `_prev` in the overlay, per NIX-FLK-02) |
| stray `result` | `ls -la .` | none present |

Every step is exit 0. `readelf -l` on ninja's real binary confirms the hook actually ran: `Requesting program interpreter: /nix/store/…-glibc-2.42-84/lib/ld-linux-x86-64.so.2`.

### 7. The `$$` string-escaping trap in the fix itself

The first draft of the corrected `mk-ocx-env.nix` wrote the splice as one indented-string literal:

```nix
lib.concatMapStringsSep ''"$${picked.varName}"'' lib.escapeShellArg picked.segs;
```

intending "a literal `$` immediately followed by the interpolated variable name". The actual output showed the **literal, unprocessed text** `''"$${picked.varName}"''` leaking into the built wrapper's argument list — no interpolation happened at all. Isolated with a minimal test:

```
$ nix eval --file t.nix   # let x = "VALUE"; in { t1 = "$${x}"; t2 = ''$${x}''; t3 = ''${x}''; }
{ t1 = "$\${x}"; t2 = "$\${x}"; t3 = "VALUE"; }
```

Both `"$${x}"` (double-quoted) and `''$${x}''` (indented) print the **literal** text `${x}`, unsubstituted; only a single `$` before `${x}` (`t3`) interpolates. Nix's indented **and** double-quoted strings both treat a bare `$$` immediately preceding `{` as an escape meaning "emit a literal `${`, do not interpolate" — the exact same convention ocx's own `value` grammar uses for its `$${` escape (a coincidence worth knowing, not a design correspondence). The fix is to build the splice by **concatenation**, never by writing `$${` adjacent in one literal:

```nix
splice = "\"$" + picked.varName + "\"";   # "\$" (one literal $) ++ "${picked.varName}" (real interpolation)
lib.concatMapStringsSep splice lib.escapeShellArg picked.segs;
```

Verified directly: `"\$" + "${x}"` → `"$VALUE"`. Every splice site in the corrected `mk-ocx-env.nix` (the `installPath`/`self.installPath`/`self.env.KEY` forms) uses this concatenation form; grepping the file for the literal 3-char sequence `$${` after the fix finds only the file's own comments describing ocx's escape, never Nix code.

The rest of the output that looked suspicious on first read (`''"$installPath"/bin`) was not a bug: nixpkgs' `lib.escapeShellArg ""` renders the POSIX-correct empty single-quoted string `''` (two apostrophes), and `lib.escapeShellArg "/bin"` renders the shell-safe string **unquoted** (`/bin`, no quoting at all) — both confirmed directly (`nix eval --raw`). Concatenated with the splice, `''` + `"$installPath"` + `/bin` is one valid, correctly-composed shell word.

### 8. M-E-11 remainder: the full token and entrypoint census

Fixture: `verification-rerun-w3/generated-flakes/meta-census/token-census.py` (raw responses saved under `meta-census/raw/`). A live, exhaustive, anonymous fetch (`Authorization: Bearer QQ==`, `Accept: application/vnd.oci.image.manifest.v1+json` on the manifest fetch — omitting this Accept header gives a bare 404, a new finding this pass, §AI-agent angle) of every one of the 125 index packages' `latest` linux/amd64 manifest + config blob, preferring the glibc-tagged manifest when both exist (NIX-GEN-04): **122/125 reachable** (`grimoire/cli`, `ocx/cli`, `ocx/mirror` 404 — the fleet's own entries, matching every prior pass; `docker/docker-credential-{osxkeychain,wincred}` have no linux/amd64 offer at all).

| Token form | Legal in | Occurrences / 122 | Decision |
|---|---|---|---|
| `${installPath}` / `${self.installPath}` | `env` values, `args` | **121** | **Translate** (unchanged; already `mkEnvArgs`'s core case) |
| `${installPath:native}` / `${...:posix}` (+ `self.` alias) | `env` values, `args` | **0** | **Inline** (no-op): Nix's only two targets, linux and darwin, are both POSIX — `:native` and `:posix` render identically (both `/`). Strip the modifier, translate as the bare form. |
| `${self.env.KEY}` | `env` values only | **0** | **Translate** to a bash variable reference `$KEY`, correct only because the generator emits each entry's `makeWrapper` flags in the **same order** as ocx's `env` array — matching ocx's own "declared strictly earlier" rule, so the wrapper script's sequential `export`/assignment lines have already set `$KEY` by the time a later entry's value reads it. |
| `${deps.NAME.installPath}` | `env` values only (ocx itself rejects it in `args` at publish time) | **0** | **Refuse** (keep the `throw`). 0/122 packages declare a dependency at all (same census). Translating this means threading a dependency's own Nix derivation through the reader with no real data to verify the mapping against — unverifiable speculation, not a rule yet. |
| `$${` (doubled-dollar escape) | `env` values, `args` | **0** | **Translate** to a literal `${` regardless of the 0-use finding — mechanical, already required by the existing NIX-GEN-20 text, and cheap to keep. |
| any other `${…}` | `env` values, `args` | 0 (would be a schema drift) | **Refuse** (`throw`) — matches ocx's own closed `${…}` namespace; a refusal here means this reader has fallen out of sync with ocx's schema, not a downstream authoring bug. |
| `entrypoints.<name>` (any form) | top-level | **0 packages** | Design implemented and proven (below), not wired into the small handoff prototype (nothing real to wire it to yet). |
| `dependencies[]` (any visibility) | top-level | **0 packages** | Unchanged from the w2 rerun's finding; still a design table only ([verification-rerun-w2](verification-rerun-w2.md) §8). |

`env_type_counts`: `path` 120, `constant` 2 (`amazon/corretto`, `anomalyco/opencode`), `list` 0 — identical to the w2 rerun's census, now cross-checked at the token level too.

**Entrypoint mapping, designed and proven** (`entrypoints/flake.nix`, per `metadata.md`'s own worked example: `{"fmt": {"command": "cmake-format"}}`, and its baked-`args` form `{"command": "python", "args": ["${installPath}/app/main.py"]}`): `entrypoints.<name>` becomes `makeWrapper <dispatch-target> $out/bin/<name> --add-flags "<escaped args>"`. The one **load-bearing** decision, planted as a twin:

- **RED**: the launcher wraps the package's **raw, pre-`env`** binary (reading `command` as "a binary on disk").
- **GREEN**: the launcher wraps the package's **own already-`env`-wrapped** `bin/<command>` (reading `command` as metadata.md's own words: "a dispatch command ... resolved against the composed `PATH`").

```
$ .../alias userarg          # RED
GREETING= arg1=/nix/store/…-entrypoint-demo/libexec/entrypoint-demo/extra-arg-file
$ .../alias userarg          # GREEN
GREETING=hello-from-env arg1=/nix/store/…-entrypoint-demo/libexec/entrypoint-demo/extra-arg-file
```

Both twins resolve the baked `${installPath}` arg correctly (each to its own derivation's real store path) — the bug is entirely about which binary the entry point wraps, never about the baked-args mechanism. `--add-flags` is confirmed as the right primitive: each `args` element is one atomic argv token (no shell word-splitting, per metadata.md), so every element must be individually `lib.escapeShellArg`-rendered (with the `installPath` splice, same mechanism as `env`) and space-joined for `--add-flags`, never passed as one unit through `lib.escapeShellArgs` on the whole array (the same GEN-20 pitfall the env translator already fixed).

### 9. M-E-31: the D meta-source census (description, homepage, license)

A full census of all **1,720** locally-checked-out image indexes under `/home/mherwig/dev/index/p/*/*/o/sha256/*.json` (an exact match to the map's earlier 1,720 count — confirmed independently: `rtk proxy find p -path '*/o/sha256/*.json' | wc -l` → 1720), reading each index's top-level `annotations` object (`index@current:p/astral-sh/ruff/o/sha256/16bbad2d6…json:annotations`, the same location NIX-GEN-14's license mapping already reads):

| Annotation | Present / 1,720 |
|---|---|
| `org.opencontainers.image.description` | **0** (0.0%) |
| `org.opencontainers.image.url` | **0** (0.0%) |
| `org.opencontainers.image.source` | 1,691 (98.3%) — but names `https://github.com/ocx-contrib/mirror-<ns>`, the mirror repository, never the upstream project |
| `org.opencontainers.image.licenses` | 1,592 (92.6%) — consistent with the map's earlier "128/1,720 (7.4%) lack a license" |
| `org.opencontainers.image.revision` | 1,672 (97.2%) |

Against the same 125-package set, the ocx package index's **own** file (`p/<ns>/<pkg>.json`, one level up from the image indexes — `p/astral-sh/ruff.json:desc.description`, `:upstream.repository_url`):

| Field | Present / 125 |
|---|---|
| `desc.description` (non-empty) | **125** (100%) |
| `upstream.repository_url` | **123** (98.4%) — missing only for `ocx/cli` and `ocx/mirror`, the fleet's own two entries, which have no "upstream" to name |

**Decision**, resolving E15 (NIX-PKG-07's `description`/`homepage` MUST vs NIX-GEN-14's "omit when missing" for `license`) for the D shape: **source `meta.description` from the package index's `desc.description` and `meta.homepage` from `upstream.repository_url` — never from any OCI annotation.** The OCI layer carries neither field at all, so a generator that only reads image-index annotations (the layer NIX-GEN-14 already reads for `license`) has no data to satisfy NIX-PKG-07's presence requirement for these two fields; the package index one level up does. `.source` is a documented trap here: it is present on 98.3% of packages and looks like a homepage, but names the **ocx-contrib mirror**, not the upstream project — a generator that maps `.source` → `homepage` would send every consumer to the wrong repository. For the fleet's own two entries lacking `upstream.repository_url`, `meta.homepage` is omitted, mirroring NIX-GEN-14's own precedent for a genuinely absent field (never defaulted, never guessed).

### 10. E26: what `nix run` on a 5-binary package actually does

[gen] Verdict 3 and its own Applied section cited `nix run <flake>#kitware.cmake."4.4.2"` as an example of the versioned attribute path resolving. Run against the fixed, rebuilt prototype:

```
$ nix run --no-write-lock-file .#kitware-cmake -- --version
error: unable to execute '/nix/store/…-kitware-cmake-4.4.2/bin/kitware-cmake': No such file or directory
$ nix run --no-write-lock-file '.#legacyPackages.x86_64-linux.kitware.cmake."4.4.2"' -- --version
error: unable to execute '/nix/store/…-kitware-cmake-4.4.2/bin/kitware-cmake': No such file or directory
```

`nix run` never resolves. With no `meta.mainProgram` (correctly omitted by NIX-GEN-13, since cmake declares 5 binaries), `nix run` falls back to `$out/bin/<pname>` — here `kitware-cmake`, the package's own attribute name, which is not and was never meant to be a binary name. The failure is loud (a clear `No such file or directory`), matching NIX-GEN-13's own rationale exactly (never silently wrong), but the example was still wrong: it claimed resolution that does not happen. Replaced with a real single-binary package, measured working:

```
$ nix run --no-write-lock-file '.#legacyPackages.x86_64-linux.actionlint.actionlint."1.7.12"' -- -version
1.7.12
installed by downloading from release page
built with go1.26.1 compiler for linux/amd64
$ nix run --no-write-lock-file .#actionlint-actionlint -- -version
1.7.12
...
```

Both the versioned `legacyPackages` path and the flat `packages` (latest-only) path resolve correctly, exit 0.

## Normative guidance candidates

1. **A "MUST by reading heuristic" row is closed only by a planted twin over real data, not by re-reading the rationale.** Rationale: NIX-GEN-02/04/05/16 all read as obviously correct from `platform.rs`/metadata.md alone, and all four still hid a decisive, measurable failure (corretto silently dropped; a checker that can't go green). Verify: the fixtures in `verification-rerun-w3/generated-flakes/gen02..gen16/`. RUN: **yes**, all four, red and green.
2. **`autoPatchelfHook` (and `stdenv.cc.cc.lib`) go on every `*-linux` package unconditionally — never gated on a `libc` tag, including `null`/bare.** Rationale: libc tagging drifts (12/125 packages sit in both the bare and glibc-tagged sets per the earlier ocx audit), and the hook is a measured no-op on a genuinely static ELF. Verify: `isLinux = lib.hasSuffix "-linux" stdenv.hostPlatform.system` gates the hook, not `plat.libc`. RUN: **yes** (the fixed prototype builds and the `readelf -l` interpreter check passes for a glibc-tagged package).
3. **Never splice a Nix-level interpolation immediately after a literal `$` inside one string token (`"$${x}"` or `''$${x}''`) when the intent is "one literal `$` then a real interpolation."** Rationale: Nix's indented and double-quoted strings both treat a bare `$$` before `{` as an escape for a literal `${`, silently disabling the interpolation, with no warning or error — the exact bug this dive hit while fixing NIX-GEN-20. Verify: `nix eval --expr 'let x = "V"; in "$${x}"'` must print the literal `"$\${x}"`, never `"$V"`; the correct form is `"\$" + "${x}"`. RUN: **yes**, both forms, isolated in a minimal test file.
4. **An env/entrypoint value translator sources its splice list from a live token census, not from an assumption about what the schema "could" contain.** Rationale: of 7 documented `${…}` forms plus 1 escape, real data uses exactly one (bare `installPath`) at 121/122 — building translation for the other 6 now, untested, risks exactly the kind of overclaim NIX-GEN-20's first revision already made once (segment-escaping) and a second time (`self.env`/modifier support that has no real caller yet). Verify: `meta-census/token-census-result.json`'s `token_counts`. RUN: **yes**, live, exhaustive (122/125).
5. **`${deps.NAME.installPath}` stays a `throw`, not a design exercise built ahead of data.** Rationale: 0/122 packages declare a dependency; the visibility→Nix mapping is already a verified *design table* (w2 rerun), and adding actual derivation-threading now cannot be checked against anything real. Verify: `grep -c 'deps\.' lib/mk-ocx-env.nix` should show the token recognized only to be refused, never resolved, until a real package declares one. RUN: partial — the refusal path is watched (`depsThrows.success == false`); the translate path is not built, by design.
6. **An entrypoint launcher wraps the package's own already-`env`-composed binary, never the raw payload underneath it.** Rationale: `command` in ocx's `entrypoints` schema names something "resolved against the composed `PATH` from the package's `env` block" (metadata.md, verbatim) — wrapping the raw binary silently drops every `env` entry the package declares. Verify: `entrypoints/flake.nix`'s `violation`/`compliant` twins; check the wrapped binary's own declared env var, not just that it runs. RUN: **yes**, both twins built and executed.
7. **A generated D package sources `meta.description`/`meta.homepage` from the ocx package index's own fields (`desc.description`, `upstream.repository_url`), never from any OCI image-index annotation.** Rationale: neither field exists at the OCI annotation layer (0/1,720 for both), and the one annotation that superficially resembles a homepage (`.source`, 98.3% present) names the ocx-contrib mirror, not the upstream project — mapping it to `homepage` would misdirect every consumer. Verify: the M-E-31 census script (embed as a jq query over a package's index file: `jq -e '.desc.description and (.upstream.repository_url // true)'` against `p/<ns>/<pkg>.json`, and confirm the OCI index's own `annotations` never has `description`/`url`). RUN: **yes**, full census, 1,720 image indexes + 125 package files.
8. **`nix run <flake>#<attr>` on a multi-binary package with no `mainProgram` fails loudly at run time (`unable to execute .../bin/<pname>`), never silently — but it does not "resolve," and no example should claim it does.** Rationale: `nix run`'s fallback target is `$out/bin/<pname>`, which a multi-binary generated package never has by design (NIX-GEN-13 omits `mainProgram` on purpose). Verify: `nix run <flake>#<multi-bin-attr>`, expect a nonzero-exiting child process with `No such file or directory`, never a running binary. RUN: **yes**, on the real, rebuilt `kitware-cmake` package.

## Verification runs

Fixture root: `/home/mherwig/.cache/research-lang/nix-tools/fixtures/verification-rerun-w3/generated-flakes/` unless noted; the prototype fixes were verified in place at `.agents/research/nix-generated-flakes/prototype/`.

| # | Fixture | Command | Violation | Compliant | Result |
|---|---|---|---|---|---|
| 1 | `gen02/{violation,compliant}/` | the NIX-GEN-02 grep (§2) | 3 matches, exit 0 | no matches, exit 1 | **RAN.** |
| 2 | `gen04/select.py` | `python3 select.py` over real ruff+corretto indexes | corretto dropped (`null`), ruff misrouted to bare | corretto and ruff both correctly glibc-routed | **RAN.** Script asserts and exits 0. |
| 3 | `gen05/flake.nix` | `nix eval --json .#violationDarwinArgs` / `.#compliantDarwinArgs` / `.#mismatch` | `$installPath/bin` (linux's value) | `$installPath/CMake.app/Contents/bin` (darwin's own) | **RAN.** `mismatch` = `true`, all exit 0. |
| 4 | `gen16/{violation,compliant}/` | rule's own literal grep (§5) | matches `contents: write` | **also** matches `contents: write` — not admissible | **RAN**, and shown inadmissible as specified. |
| 5 | `gen16/{violation,compliant}/` | fixed two-stage grep (§5) | prints the filename (finding) | empty (pass) | **RAN.** |
| 6 | prototype/ (in place) | Q5: `nix flake check --no-write-lock-file --no-build --option allow-import-from-derivation false .` | n/a (fixed already) | `all checks passed!`, exit 0 | **RAN.** |
| 7 | prototype/ | cold `nix build --no-link .#<pkg>` ×4 | n/a | exit 0 ×4 | **RAN.** |
| 8 | prototype/ | `nix build --no-link --rebuild .#<pkg>` ×4 | n/a | `checking outputs of ...`, no diff, exit 0 ×4 | **RAN.** |
| 9 | prototype/ | smoke: `nix build --no-link -L .#checks.x86_64-linux.smoke` | n/a | `1.7.12`/`1.13.2`/`cmake version 4.4.2`/greeting, exit 0 | **RAN.** |
| 10 | prototype/ | `nix eval --raw .#packages.aarch64-darwin.<pkg>.drvPath` ×3 | n/a | a `.drv` path each, exit 0 | **RAN.** corretto: `does not provide attribute`, exit 1, correctly (no aarch64-darwin entry). |
| 11 | prototype/ | `gen13-check.sh` | (superseded prototype would have failed) | `true`, exit 0 | **RAN.** |
| 12 | prototype/data.json | NIX-GEN-19 jq | n/a | `true`, exit 0 | **RAN.** |
| 13 | prototype/ | NIX-GEN-07 overlay jq | n/a | `["ocx"]`, exit 0 | **RAN.** |
| 14 | prototype/ | `nixfmt --check lib/*.nix flake.nix` | before fix: `not formatted` on 4 files, exit 1 | after `nixfmt` reformat: exit 0 | **RAN**, both. |
| 15 | prototype/ | `deadnix --fail --no-lambda-pattern-names lib/ flake.nix` | before fix: 2 findings (`stripModifier`, unused `prev`), exit 1 | after fix: exit 0 | **RAN**, both. |
| 16 | prototype/data.json | planted hostile value: `HOSTILE=pre$(touch /tmp/PWNED)post` on corretto, then `nix build .#amazon-corretto` + run the wrapper | (this is the compliant translator; a naive one from the w2 rerun would have executed the substitution) | builds exit 0; `export HOSTILE='pre$(touch /tmp/PWNED)post'` (single-quoted, inert); `/tmp/PWNED` never created | **RAN.** Reverted afterward; `data.json` re-canonicalized (`jq -S . data.json \| cmp - data.json`, exit 0). |
| 17 | `mk-ocx-env-test/flake.nix` | unit tests: corretto real values, hostile value, `self.env`, `:posix` modifier, `list` type, `deps.*` (must throw), entrypoint `args` | n/a (isolated function tests) | correct splices for all; `depsThrows.success == false` | **RAN.** |
| 18 | `entrypoints/flake.nix` | `nix build` both `violation`/`compliant`, then run `bin/alias` | `GREETING=` (empty; lost the env) | `GREETING=hello-from-env` (preserved) | **RAN.** Both twins' baked `installPath` arg resolves correctly regardless. |
| 19 | `meta-census/token-census.py` | live census, 125 packages' latest linux/amd64 manifest+config | n/a (a census, not a red/green pair) | 122/125 reachable; full token/entrypoint/dependency counts | **RAN.** |
| 20 | (no fixture; read-only over `/home/mherwig/dev/index`) | M-E-31: `annotations` census over 1,720 image indexes + `desc.description`/`upstream.repository_url` over 125 package files | n/a (a census) | 0/1,720 description, 0/1,720 url, 125/125 desc.description, 123/125 repository_url | **RAN.** |
| 21 | prototype/ | E26: `nix run .#kitware-cmake` / `.#legacyPackages.x86_64-linux.kitware.cmake."4.4.2"` | `unable to execute '.../bin/kitware-cmake': No such file or directory` (both forms) | n/a (cmake has no compliant "resolves" form by design) | **RAN.** |
| 22 | prototype/ | E26 replacement: `nix run .#legacyPackages.x86_64-linux.actionlint.actionlint."1.7.12"` / `.#actionlint-actionlint` | n/a | `1.7.12`, exit 0 (both forms) | **RAN.** |

Every row ran; none was blocked by the environment.

## Exemplar evidence

No new exemplar-corpus repository citations beyond what `nix-generated-flakes.md` and its prior dives already establish — this pass measures the ocx index and the ghcr.io registry directly, and a Nix-escaping mechanism internal to the fix, neither of which is exemplar-corpus material. The one addition: NIX-GEN-08's `Authorization: Bearer QQ==` header is not sufficient alone for a **manifest** fetch (as opposed to a **blob** fetch, which every prior pass exercised) — an `Accept: application/vnd.oci.image.manifest.v1+json` header is also required, or ghcr.io returns a bare 404 (§AI-agent angle, item 6, new this pass).

## AI-agent angle

1. **Trusting a rule's own reading-heuristic verification as if it were a watched check.** NIX-GEN-02/04/05/16 all read as self-evidently correct and all four still hid a distinct real failure once measured (corretto silently dropped is not a hypothetical — it is the actual, currently-shipping package with no bare offer). Check: before citing a MUST rule as "closed," confirm its Verification-runs row says RUN: yes, not "reading heuristic only."
2. **Writing `"$${var}"` (or the indented-string equivalent) expecting "one literal `$`, then interpolate `var`."** Nix silently treats this as an escape for a literal `${`, producing unsubstituted, garbage-looking output with no error — the exact trap this dive fell into while writing the very fix for a different escaping bug (NIX-GEN-20). Check: `nix eval --expr 'let x = "V"; in "$${x}"'` must print `"$V"` for the intent to have worked; if it instead prints the literal text back, the splice needs to be built by string concatenation (`"\$" + "${x}"`), not one adjacent literal.
3. **Assuming `nix run <flake>#<attr>` "resolves" because the attribute evaluates and the package builds.** `nix run` on a package with no `meta.mainProgram` falls back to `$out/bin/<pname>`, which a correctly-authored multi-binary generated package never has (NIX-GEN-13 omits `mainProgram` on purpose for exactly this case) — the failure is loud, but an author who never actually *runs* the example (only evaluates or builds it) will ship a broken worked example, as the prior consolidation did (E26). Check: every `nix run` example in documentation or a rule's own Applied section must be executed, not just evaluated.
4. **Mapping an OCI `org.opencontainers.image.source` annotation to `meta.homepage`.** It is present on 98.3% of this index's packages and reads like a homepage, but it names the **mirror repository** (`ocx-contrib/mirror-<ns>`), not the upstream project — a generator that takes the shortcut sends every consumer to the wrong repository, silently (the annotation is syntactically valid, so nothing errors). Check: compare a sample `.source` value against the package's own `upstream.repository_url`; they are never the same host+path.
5. **Building translation logic for every documented interpolation-token form "to be thorough," ahead of any real caller.** This dive's own predecessor already over-built once (segment-escaping was correct, but the surrounding claims about which forms were "verified" outran what was actually run — see the w2/w3 revision logs). Check: a live, exhaustive census before adding a translate path for a form with 0 real occurrences; keep the `throw` (a loud, safe failure) until data exists, rather than shipping an unverifiable mapping.
6. **Fetching an OCI manifest with only the bearer token header and no `Accept` header, then reading a bare 404 as "this package/digest doesn't exist."** ghcr.io's manifest endpoint (as opposed to its blob endpoint) requires `Accept: application/vnd.oci.image.manifest.v1+json` (or the image-index media type) to return content at all; omitting it gives a 404 indistinguishable from a genuinely missing digest. Check: `curl -sfL -H 'Authorization: Bearer QQ==' -H 'Accept: application/vnd.oci.image.manifest.v1+json' <manifest-url>` before concluding a manifest reference is invalid.

## Contested / evolving

- **NIX-GEN-16's own verification grep is not admissible as written**, and this dive did not settle what replaces it in the canonical ruleset — only that the two-stage form (§5) is watched red and green. The consolidation should adopt the two-stage form or an equivalent, since the current text would flag every legitimate PR-based updater as if it were a direct push.
- **Whether `${deps.NAME.installPath}` should ever be implemented ahead of real data** is a genuine trade-off, not a settled question: implementing it now would let the fleet's own future flakes (which may eventually declare inter-package dependencies inside the generated set) exercise the mechanism sooner, at the cost of shipping unverified Nix-derivation-threading logic. This dive's position (refuse, wait for data) follows the program's stated "invent no signal" convention (NIX-GEN-18), but the trade-off is worth an explicit owner call if the fleet's own roadmap makes dependency declarations imminent.
- **Whether `entrypoints` belongs in the generated flake's actual data model yet**, given 0/122 real packages use it. This dive's position: the mechanism is designed and proven (one twin), but not wired into `data.json`/`mk-package.nix`, since there is nothing real to wire it to — consistent with the same-named decision for `list` and `dependencies` in the w2 rerun.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [nix-generated-flakes.md](../nix-generated-flakes.md) | This program's consolidated NIX-GEN ruleset (Verdict 10, the three breaks this pass fixes) | 2026-09-27 | Every ID this pass's findings map onto |
| [nix-generated-flakes/verification-rerun-w2.md](verification-rerun-w2.md) | The prior rerun: NIX-GEN-19/20 origin, the M-E-11 env-type census this pass extends to token forms | 2026-09-27 | Baseline the token/entrypoint census (§8) extends and cross-checks |
| [nix-topic-map.md](../../nix-topic-map.md) | Phase-3 map: E15, E26, M-E-31's own commissioning text | 2026-09-27 | The exact wording this pass resolves (§9, §10) |
| `/home/mherwig/dev/ocx/website/src/docs/reference/metadata.md` (local checkout, read 2026-09-27) | ocx's own metadata reference — the full `${…}` token grammar, `entrypoints`, `args`, visibility | current as of this program's snapshot | The token table in §8 and the entrypoint mechanism in §8 both implement this document verbatim, including its own `propagatedBuildInputs` comparison |
| [nixpkgs doc/hooks/autopatchelf.section.md](https://github.com/NixOS/nixpkgs/blob/master/doc/hooks/autopatchelf.section.md) | nixpkgs manual (primary) | current, nixpkgs 26.11pre | `autoPatchelfIgnoreMissingDeps`'s exact mechanism, re-confirmed against the fixed prototype's build |
| [Nix manual, language/string-interpolation](https://nix.dev/manual/nix/2.24/language/string-interpolation) | Nix reference manual (primary) | current, Nix 2.24+ (unchanged in 2.35) | The `$${` / `''${` escaping rule this dive rediscovered empirically (§7) |
| [nixpkgs lib/strings.nix (`escapeShellArg`)](https://github.com/NixOS/nixpkgs/blob/master/lib/strings.nix) | nixpkgs source (primary) | nixpkgs 26.11pre | The actual implementation behind the "empty string → `''`, safe string → unquoted" behavior measured in §7 |
| [OCI image-spec, annotations](https://github.com/opencontainers/image-spec/blob/main/annotations.md) | OCI spec (primary) | current | Defines `org.opencontainers.image.description`/`.url`/`.source`; none of the three is required, which is why 0/1,720 carry the first two |
| ghcr.io `/v2/ocx-contrib/<ns>/<pkg>/{manifests,blobs}/<digest>` (live, anonymous) | GitHub Container Registry's own endpoints, probed live 2026-09-27 | live | Source of the M-E-11 census (§8) and the GEN-05 real config blobs (§4); the `Accept` header requirement (AI-agent angle §6) was found this way |
| `/home/mherwig/dev/index/p/**/*.json` (local checkout, read 2026-09-27) | The live ocx index — 125 package roots, 1,720 stored image indexes | measured 2026-09-27 | Source of the M-E-31 census (§9) and the GEN-04 real manifest orderings (§3) |
| [ocx_oci/src/platform.rs](https://github.com/ocx-sh/ocx) (local checkout `/home/mherwig/dev/ocx/crates/ocx_oci/src/platform.rs`) | ocx's own platform-compatibility implementation | read 2026-09-27 | The relation NIX-GEN-02/04 bind a generator to reuse rather than reimplement |
| [nixpkgs doc/stdenv/stdenv.chapter.md](https://github.com/NixOS/nixpkgs/blob/master/doc/stdenv/stdenv.chapter.md) | nixpkgs manual (primary) | current, nixpkgs 26.11pre | `propagatedBuildInputs`'s definition, cited again for the entrypoint/dependency design table (§8) |
| [makeWrapper source, `setup-hook.sh`](https://github.com/NixOS/nixpkgs/blob/master/pkgs/build-support/setup-hooks/make-wrapper.sh) | nixpkgs source (primary) | nixpkgs 26.11pre | `--add-flags`'s actual shell-splicing mechanism, underlying the entrypoint baked-args translation (§8) |
| [NixOS/nix, `nix run` implementation notes](https://nix.dev/manual/nix/2.24/command-ref/new-cli/nix3-run) | Nix reference manual (primary) | current, Nix 2.24+ (unchanged in 2.35) | Documents the `$out/bin/<pname>` fallback exercised in §10 |
| [GHCR anonymous pull discussion](https://github.com/orgs/community/discussions/26279) | GitHub community discussion | ongoing | Background on ghcr.io's anonymous-pull token behavior underlying NIX-GEN-08, cross-checked again this pass for the manifest-vs-blob Accept-header distinction |
| `fixtures/nix-generated-flakes-rev/env-escape/`, `.../gen13-check.sh`, `.../gen19/` (this program's own prior fixtures) | The w2-rerun-revision fixtures this pass's prototype fix reuses verbatim | committed 2026-09-27 | `gen13-check.sh` is run unmodified against the newly-fixed prototype; `env-escape/`'s `render` function is the pattern this pass's `mk-ocx-env.nix` generalizes |

## Revision note

This is a new sub-artifact of `nix-generated-flakes.md` (the `generated-flakes/verification-rerun-w3` dive named in the map's rerun-wave commissioning). It does not renumber or remove any NIX-GEN ID. Its findings are ready to fold into the next consolidation revision as: NIX-GEN-02/04/05/16 gain a watched red/green row each (their MUST severity is unchanged, now on stronger evidence); NIX-GEN-11/17/20 gain confirmation that the fixes described in the consolidation's Verdict 10 build, rebuild and pass the full gate; NIX-GEN-20's rule text should add the `self.env.KEY`/modifier-inlining/`deps`-refusal decision table from §8; a new row (or an amendment to NIX-GEN-12/14) should record the M-E-31 D meta-source decision from §9; and the "Applied to the exemplars" section's `nix run <flake>#kitware.cmake."4.4.2"` example should be replaced per §10.
