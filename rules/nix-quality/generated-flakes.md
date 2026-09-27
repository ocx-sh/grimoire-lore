---
title: Generated Flakes and Prebuilt Binaries
summary: The NIX-GEN family, owning flakes that package binaries you did not build or that are generated from an external package index, covering the committed data file, the reader, the registry fetch, the attribute shape and overlay, the prebuilt derivation template and its meta, metadata translation, the generator and the update loop
---

# Generated Flakes and Prebuilt Binaries

Measured 2026-09-27 on CppNix 2.35.2, nixpkgs 26.11pre `8d5d2709`; floor `nix_2_31` = 2.31.5; Lix 2.95.2; nixfmt 1.5.0, deadnix 1.3.2, flake-checker 0.2.15.

Owns shape D, a flake generated from an external package index, and every
prebuilt binary a flake of another shape wraps. That is the architecture
(committed data, a small reader, a CI updater), the fetch of a registry blob,
the `packages` and `legacyPackages` shape, the overlay, the derivation template
for a binary you did not build, its `meta`, the translation of an index's env
and entry-point metadata, the generator and the update loop. The worked example
is the public ocx package index, whose packages are OCI artifacts on ghcr.io.
Every ocx name below is an example: replace it with your index's. Flake outputs,
the systems list, the `final: _prev:` overlay spelling and the one-builder rule
are NIX-FLK. Derivation phases, `runHook`, the `--rebuild` rule for every
fixed-output fetch and `meta` presence for source builds are NIX-PKG. The gate
block, the IFD ban for your own flake, the Darwin runner and the CI workflow are
NIX-GATE. The lock and its weekly PR are NIX-INP. Install lines, tags and README
blocks are NIX-REL. Credentials in `curlOptsList` and `nixConfig` are NIX-SEC.

Contents: [Dates and Floors](#dates-and-floors) · [The Data File and Attribute Shape](#the-data-file-and-attribute-shape) ·
[The Overlay](#the-overlay) · [Fetching a Registry Blob](#fetching-a-registry-blob) ·
[The Prebuilt Template and Its Meta](#the-prebuilt-template-and-its-meta) ·
[Translating Env and Entry Points](#translating-env-and-entry-points) · [The Generator](#the-generator) ·
[The Update Loop](#the-update-loop) · [Applied Evidence](#applied-evidence-held-out-round-2026-09-27) · [What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Floors

- **Implementations.** Every row was measured on CppNix 2.35.2 (Linux, sandbox on). The fetch (NIX-GEN-08, NIX-GEN-09) and NIX-GEN-14's check were also run on CppNix 2.31.5 and Lix 2.95.2, with the same store path and the same exit codes. Lix 2.95.2 has no `builtins.convertHash` (`builtins ? convertHash` is `false`). Determinate Nix is unmeasured. The fixtures were re-planted on 2026-09-27 against a warm nixpkgs source and a cold registry: every layer was fetched from ghcr.io for the first time.
- **Registry behaviour (volatile, observed 2026-09-27, undocumented by GitHub).** ghcr.io answers a header-less blob GET with 401. With the anonymous `Authorization: Bearer QQ==` header it answers 307 to a signed `pkg-containers.githubusercontent.com` URL that expires in about 10 minutes. A manifest GET without `Accept: application/vnd.oci.image.manifest.v1+json` returns a bare 404 (re-check when an update PR's layer build fails with 401 or a manifest fetch with 404).
- **Which rows bind you.** A flake generated from an OCI package index like ocx's takes every row. A flake generated from another source reads "OCI layer digest" as "the upstream's published checksum", reads NIX-GEN-21 as "description and homepage from the upstream project, never from a mirror", and skips NIX-GEN-02, 04, 05, 08, 20 and 22, which exist for OCI registries and ocx metadata. NIX-GEN-16 binds every generated flake: an updater that commits third-party hashes ships binaries consumers trust unseen, whatever the source. A flake of shape A that adds a prebuilt `-bin` package takes NIX-GEN-12 to 14.
- **Precedence.** NIX-GEN-13 overrides NIX-FLK-15's `mainProgram` MUST for a package with several peer binaries. NIX-GEN-14 replaces NIX-PKG-07's license-presence clause for D, and NIX-GEN-21 omits `homepage` when the index has none. NIX-GEN-15 is D's form of NIX-GATE-10. D cuts no tags, so its release proof is NIX-GEN-15 plus every executed `nix run` example, never NIX-REL-16. NIX-GEN-09 replaces NIX-PKG-03's hash source for a D layer: the digest comes from the manifest, never from a prefetch.
- **Pinned default: the generator is a subcommand of the index's own client**, and the flake lives in its own repository (ocx: an `ocx` subcommand writing to `ocx-sh/ocx-nix`). An adopter names their own client and repository once.
- **Pinned default: keep every digest** until the data file passes 20 MB, then move to a rolling window (NIX-GEN-17).
- **Pinned default: systems** `x86_64-linux`, `aarch64-linux` and `aarch64-darwin`. `aarch64-darwin` is evaluated in CI but not built or smoke-run, and the README says so, until a Darwin smoke leg exists. This is D's stated reason for not taking NIX-GATE-15's Apple-silicon runner. musl-only and Windows offers are dropped.
- **Pinned defaults for gaps in the data.** A missing license annotation omits `meta.license` (NIX-GEN-14). Updates land as reviewed PRs until the index verifies publisher signatures (NIX-GEN-16). A dependency token or a non-empty `dependencies` array throws until a real package declares one (NIX-GEN-20). A bundled GUI binary with missing X11 libraries stays present but broken through a per-package ignore list (NIX-GEN-19).
- **Every `grep -rn` is a violation locator.** Empty output with exit 1 is the pass, and any printed line is the finding. Run each from the repository root. The `grep -e` and `grep -Fqx` lines after a build are the reverse: a match, exit 0, is the pass.

## The Data File and Attribute Shape

```sh
nix flake check --all-systems --no-build --option allow-import-from-derivation false .   # gate step 4, exit 0 = pass
```

`all checks passed!` with exit 0 is the pass. This is necessary and never
sufficient for D: it passed a corrupted digest (NIX-GEN-15).

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-GEN-01 | Commit the generated data file and read it with `builtins.fromJSON (builtins.readFile ./data.json)`. Never fetch registry or index data during evaluation, and never read an index checkout by path. | An eval-time registry read is IFD of a fetch that is not fixed-output: refused when IFD is off, and without network when IFD is on. An absolute-path read of an index checkout works only under `--impure`. | Gate step 4 above. Watched red: an eval-time read through a derivation, exit 1, and an absolute-path read, exit 1 on all three (CppNix 2.35.2: `access to absolute path '/tmp/index/data.json' is forbidden in pure evaluation mode`; CppNix 2.31.5 names only `'/tmp'`; Lix 2.95.2: `… is forbidden in pure eval mode`). Watched green: the committed-data twin, exit 0. | MUST (D) | CppNix 2.35.2 and Lix 2.95.2, IFD on by default in both |
| NIX-GEN-06 | Put only the latest version in `packages.<system>`, as a flat `<ns>-<pkg>` derivation. Put every canonical version and every alias in `legacyPackages.<system>.<ns>.<pkg>."<version>"`. Leave a package out of a system it does not offer, never `throw`. | `nix flake check` requires every `packages.<system>.<name>` to be a derivation. `<pkg>` alone collides: in the ocx index `cli` exists in 4 namespaces. Users must quote the version inside a single-quoted installable, `'…#kitware.cmake."4.4.2"'`, because the shell strips bare double quotes and `#kitware.cmake.4.4.2` fails with `does not provide attribute`. | Gate step 4 above. Watched red: versions nested under `packages`, `flake attribute 'packages.x86_64-linux.ninja-build' is not a derivation`, exit 1. Watched green: the flat twin, exit 0 on all three systems. | MUST (D) | CppNix 2.35.2 |

## The Overlay

```sh
nix eval --json .#overlays.default --apply 'o: builtins.attrNames (o { } { })' | jq -e '. == ["ocx"]'
nix eval --raw .#packages.x86_64-linux.ninja-build-ninja.drvPath
nix eval --impure --raw --expr 'let f = builtins.getFlake (toString ./.); in (f.inputs.nixpkgs.legacyPackages.x86_64-linux.extend f.overlays.default).ocx.ninja-build.ninja."1.13.2".drvPath'
nix eval --impure --expr 'let f = builtins.getFlake (toString ./.); p = f.inputs.nixpkgs.legacyPackages.x86_64-linux; marked = p.extend (_: prev: { coreutils = prev.coreutils.overrideAttrs { NIX_MARKER = "1"; }; }); get = pkgs: (pkgs.extend f.overlays.default).ocx.ninja-build.ninja."1.13.2"; in (get p).drvPath != (get marked).drvPath'
```

The first line passes with `true` and exit 0. It is pure, and replaces any
`getFlake --impure` form of the same check. Substitute your namespace for `ocx`.
The second and third lines are NIX-FLK-13's equality check on D's attribute
path: the two store paths must match (watched equal on the worked example).
The last line prints `true` when the overlay tree is built against `final`.
`false` is the finding. It exits 0 either way.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-GEN-07 | The overlay adds exactly one attribute, named for the index (`ocx` in the worked example), holding the `legacyPackages` tree built against `final`, spelled `final: _prev:` (NIX-FLK-02). It never merges generated names into `pkgs`. | 96 of 122 ocx package names match a nixpkgs `pkgs/by-name` entry. A flat merge silently replaces a consumer's `pkgs.cmake` or `pkgs.jq`. | The first line above. Watched red: a flat overlay throws (`attribute 'lib' missing`), pipeline exit 4, and one that adds names prints `false`. Watched green: `true`, exit 0. Built-against-final twin: `true` on the prototype. zig-overlay's `self.packages` overlay gives `false`. | MUST (D) | CppNix 2.35.2 |

```nix
{
  # wrong: every generated name lands in pkgs and shadows the consumer's own
  overlays.default = final: _prev: (reader final).latest;
}
```

```nix
{
  # right: one namespaced attribute, built against final
  overlays.default = final: _prev: { ocx = (reader final).byVersion; };
}
```

## Fetching a Registry Blob

```sh
nix build --no-link .#actionlint-actionlint.src             # cold store: proves the transport
nix build --no-link --rebuild .#actionlint-actionlint.src   # warm store: the only proof, exit 0 = pass
grep -rn -e 'convertHash' -e 'hash convert' --include='*.nix' .
grep -rn -e 'pkg-containers.githubusercontent.com' -e 'location-trusted' -e 'lib.fakeHash' --include='*.json' --include='*.nix' .
```

Substitute your attribute. A fixed-output path depends only on its name and
hash, so a transport change is invisible while the path is in the store: the
header-less twin "built" with exit 0 until `--rebuild` ran it.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-GEN-08 | Fetch a layer with nixpkgs `fetchurl` from `https://ghcr.io/v2/<repository>/blobs/<digest>` with `curlOptsList = [ "-H" "Authorization: Bearer QQ==" ]`. Never a header-less `fetchurl`, a builtin fetcher or `nix-prefetch-url`. A token-exchange fixed-output derivation or `skopeo` is a fallback for the day ghcr.io changes anonymous pull. | ghcr.io answers 401 to an anonymous blob GET. The placeholder works for any public package and is not a credential (NIX-SEC-04's scan counts it 0). It reached 122 of 125 ocx packages. | The two `nix build` lines above. Watched red: the header-less twin under `--rebuild`, `curl: (22) The requested URL returned error: 401`, exit 1. Watched green: the header twin, exit 0 cold and under `--rebuild`. | MUST (D, OCI registry) | nixpkgs 26.11pre `curlOptsList`, CppNix 2.35.2 and 2.31.5 |
| NIX-GEN-09 | Set `hash` to the OCI layer digest verbatim (`"sha256:<hex>"`), stored once in the data file and interpolated into the URL from the same field. Never store a converted SRI copy beside it, never prefetch, never call `builtins.convertHash`. | A second copy of the hash drifts from the URL's digest. `convertHash` breaks Lix. | The `convertHash` grep above. Watched red: a reader calling `builtins.convertHash`, exit 0. Watched green: exit 1. Drift twin: the URL of one layer with another hash, `hash mismatch in fixed-output derivation`, exit 1. The verbatim digest gives one store path under CppNix 2.35.2, CppNix 2.31.5 and Lix 2.95.2. | MUST (D) | CppNix 2.31.5 and later, Lix 2.95.2 accept `algo:hex` |
| NIX-GEN-10 | Never commit a resolved blob URL (`pkg-containers.githubusercontent.com`, signed, expires in about 10 minutes), `--location-trusted`, or `lib.fakeHash`. | The redirect URL is dead before anyone builds. `--location-trusted` forwards the bearer header across hosts, which the OCI distribution spec forbids. A fake hash is transient in an edit (NIX-PKG-03). | The second grep above. Watched red: a committed signed URL and a `--location-trusted` flag, exit 0 with both lines. Watched green: exit 1. | MUST (D) | curl 7.58 and later (CVE-2018-1000007) |

```nix
{ fetchurl }:
let
  digest = "sha256:26716a01d50c9492fa993d189f3aec1ea938bcd1985db4c8445bea67070c45cd";
in
# wrong: no bearer header (401), and a second hash copy that can drift from the URL
fetchurl {
  name = "actionlint-layer.tar.xz";
  url = "https://ghcr.io/v2/ocx-contrib/actionlint/actionlint/blobs/${digest}";
  hash = "sha256-JnFqAdUMlJL6mT0YnzrsHqk4vNGYXbTIRFvqZwcMRc0=";
}
```

```nix
{ fetchurl }:
let
  # the OCI layer digest from the image manifest, stored once in the data file
  digest = "sha256:26716a01d50c9492fa993d189f3aec1ea938bcd1985db4c8445bea67070c45cd";
in
fetchurl {
  name = "actionlint-layer.tar.xz";
  url = "https://ghcr.io/v2/ocx-contrib/actionlint/actionlint/blobs/${digest}";
  hash = digest;
  curlOptsList = [
    "-H"
    "Authorization: Bearer QQ=="
  ];
}
```

## The Prebuilt Template and Its Meta

```sh
nix build --no-link -L .#checks.x86_64-linux.smoke
nix build --out-link result-ninja .#ninja-build-ninja
readelf -l result-ninja/libexec/ninja/ninja | grep -e 'interpreter: /nix/store/'
nix eval --json .#packages.x86_64-linux --apply 'ps: builtins.filter (n: (ps.${n}.meta.sourceProvenance or [ ]) == [ ]) (builtins.attrNames ps)' | jq -e 'length == 0'
nix eval --json .#packages.x86_64-linux --apply 'ps: builtins.mapAttrs (n: p: p.meta.mainProgram or null) ps' > mainprogram.json
jq -e --slurpfile m mainprogram.json '[to_entries[] as $ns | $ns.value | to_entries[] as $p | $p.value.versions[$p.value.latest] | select(.platforms["x86_64-linux"]) | {k: "\($ns.key)-\($p.key)", want: (if (.binaries | length) == 1 then .binaries[0] else null end)}] | all(.want == $m[0][.k])' data.json
nix eval --option abort-on-warn true --json .#packages.x86_64-linux --apply 'ps: builtins.mapAttrs (n: p: p.meta.license or null) ps'
nix eval --json .#packages.x86_64-linux --apply 'ps: builtins.mapAttrs (n: p: p.meta.license or null) ps' > license.json
jq -e --slurpfile m license.json '[to_entries[] as $ns | $ns.value | to_entries[] as $p | $p.value.versions[$p.value.latest] | select(.platforms["x86_64-linux"]) | {k: "\($ns.key)-\($p.key)", has: ((.licenses // []) | length > 0)}] | all(.has == ($m[0][.k] != null))' data.json
grep -rn -e 'getLicenseFromSpdxIdOr [a-z]* null' --include='*.nix' .
jq -e '[.. | objects | .autoPatchelfIgnoreMissingDeps? // empty | .[]] | all(. != "*" and test("^[A-Za-z0-9._+-]+\\.so(\\.[0-9]+)*$"))' data.json
```

In order: the smoke check, the interpreter check (a printed line is the pass,
exit 1 the finding), provenance, `mainProgram`, license (the warning line, the presence pair and
the dropped-id grep) and the soname list.
Each `jq -e` passes with `true` and exit 0 and fails with `false` and exit 1, or with exit 4 when the `nix eval` before it errors and jq reads nothing.
The two `jq` programs over `data.json` assume the worked example's layout
(`<ns>.<pkg>.versions."<version>"` with `binaries`, `platforms` and a `latest`
key). Adapt the paths to yours once.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-GEN-11 | Every `*-linux` package gets `nativeBuildInputs = [ autoPatchelfHook ]` and `buildInputs = [ stdenv.cc.cc.lib ]`, whether the offer is bare or glibc-tagged. | "Bare" does not mean static: libc tagging drifts, and 12 ocx packages sit in both sets. On a static ELF the hook is a measured no-op with an identical closure. | The smoke check, then the `readelf` line. Watched red: without the hook the interpreter is `/lib64/ld-linux-x86-64.so.2`, the `grep` exits 1, and the smoke check fails with builder exit 127. Watched green: `/nix/store/…-glibc-2.42-84/lib/ld-linux-x86-64.so.2`, exit 0. | MUST (D) | nixpkgs 26.11pre, CppNix 2.35.2 |
| NIX-GEN-12 | Every prebuilt package sets `meta.sourceProvenance = [ lib.sourceTypes.binaryNativeCode ]` unconditionally, and sets `meta.platforms`. | nixpkgs requires provenance for anything not built from source, and it is independent of the license. Without it a consumer's policy cannot see the package is a binary. | The provenance line. Watched red: `false`, exit 1. Watched green: `true`, exit 0. | MUST (D, and A for a prebuilt package) | CppNix 2.35.2 |
| NIX-GEN-13 | Set `meta.mainProgram` only when the package declares exactly one binary. With more, omit it and never guess. A README shows `nix run` only for a one-binary package, `nix shell` for the rest, and executes every example. | A wrong `mainProgram` never errors and silently misroutes `nix run`. Without it `nix run` falls back to `bin/<pname>` and fails loudly: `nix run` on the five-binary `kitware.cmake."4.4.2"` gives `unable to execute '…/bin/kitware-cmake'`, exit 1, while `nix shell` of it runs `cmake --version`, exit 0. | The two `mainProgram` lines. Watched red: a first-binary guess, `false`, exit 1. Watched green: `true`, exit 0. `nix run` on the one-binary `actionlint.actionlint."1.7.12"` printed `1.7.12`, exit 0. | MUST (D, and A for a prebuilt package) | CppNix 2.35.2 |
| NIX-GEN-14 | The generator splits the license annotation on `OR` and `AND` into SPDX ids. The generator also records, per id, whether the SPDX license list marks it (for `X WITH Y`, its base `X`) OSI-approved or FSF-libre, and the reader maps each with `lib.getLicenseFromSpdxIdOr id { spdxId = id; shortName = id; free = entry.licenseFree.${id}; }`. Never drop an unmapped id. A missing annotation omits `meta.license`, never defaulted to free or unfree. Never pass the raw annotation to `lib.getLicenseFromSpdxId`. | 13.4% of ocx license annotations are SPDX expressions, and some ids (`PSF-2.0`) do not map. Passed raw, they warn on every evaluation for every consumer, and a fallback with no `free` attribute inside a license list is read as unfree by nixpkgs' check-meta (`any (l: !l.free or false)`), so the package is refused (`Refusing to evaluate … because it has an unfree license`), while the raw call's single-attrset fallback is read as free. | The license line, over `packages` only (no deprecation shims live there), never `legacyPackages`. Watched red: a raw expression, `aborting to reveal stack trace of warning`, exit 1. Watched green: exit 0. Same exit codes on CppNix 2.31.5 (same message) and Lix 2.95.2 (`error: evaluation aborted (abort-on-warn)`). Gate step 4 is the check for an unmapped id: watched red, a list fallback without `free`, exit 1 with `Refusing to evaluate … unfree license (‘GPL-2.0-only WITH Classpath-exception-2.0’)`. Green with `free` set, exit 0. A reader that drops unmapped ids passes both: the `getLicenseFromSpdxIdOr` grep locates it, empty output (exit 1) the pass, watched red on the prototype's `lib/mk-package.nix:23`. Then the presence pair: `true`, exit 0, is the pass. `false`, exit 1, names a package whose annotation was dropped. Watched red: `getLicenseFromSpdxIdOr id null` dropped corretto's `WITH` expression while the warning line exited 0. Watched green: both list fallbacks, with and without `free`. The warning line aborts on any warning, so read the one its trace names: nixpkgs-terraform exits 1 on its own `allowUnfree is enabled` warning, which is not this row's finding (watched 2026-09-27). | MUST (D, and A for a prebuilt package) | CppNix 2.31.5 and later, Lix 2.95.2 |
| NIX-GEN-15 | Gate every data update on a sandboxed smoke check that runs each changed x86_64-linux package's binary (`--version` or equivalent), in addition to gate step 4. On a warm store, rebuild each changed layer with `--rebuild`. | `--no-build` never realizes a fixed-output fetch. A corrupted digest passed gate step 4 with exit 0 and failed only at build time, with a 404 rather than a hash mismatch, because the URL carries the digest. A missing interpreter fails only when the binary runs. | The smoke line. Watched red: a corrupted digest passes gate step 4, exit 0, then its build fails with `curl: (22) … error: 404`, exit 1. The hook-less twin's smoke check fails, exit 1. Watched green: the smoke check prints `1.7.12`, `1.13.2` and `cmake version 4.4.2`, exit 0. | MUST (D) | CppNix 2.35.2 |
| NIX-GEN-19 | When `autoPatchelfHook` reports an unresolved soname wanted only by a bundled binary outside the package's primary command set (such as `cmake-gui` in a CLI package), list that exact soname in the package's `autoPatchelfIgnoreMissingDeps`, taken from the data file, and smoke-run a primary binary. Never `[ "*" ]`, never drop the hook, never drop a binary silently. | The hook fails the whole derivation when any one bundled ELF lacks a library. `[ "*" ]` hides a genuinely missing library on every other binary, with no diagnostic again. | The soname line. `nix build -L` prints `<soname> -> not found!` and names the binary that justifies an entry. Watched red: a `[ "*" ]` list, `false`, exit 1. Watched green: three named sonames, `true`, exit 0. | MUST (D) | nixpkgs 26.11pre `autoPatchelfHook` |

## Translating Env and Entry Points

Keep one test package, in `checks` or `legacyPackages` and never in
`packages`, whose env holds a constant `HOSTILE` = `pre$(echo INJECTED)post`, a
constant `DEVC` = `$${workspaceFolder}/x`, a constant `GREETING` and a `path`
entry, plus an entry point `greet` whose command is `show`, a script that
prints those variables. Keep a second test value that mixes two tokens,
`${self.installPath}/bin:${deps.cmake.installPath}/bin`, under `mixedToken`.

```sh
nix build --out-link result-show .#legacyPackages.x86_64-linux.envTest
./result-show/bin/show | grep -Fqx 'HOSTILE=pre$(echo INJECTED)post'
./result-show/bin/show | grep -Fqx 'DEVC=${workspaceFolder}/x'
./result-show/bin/greet | grep -Fqx 'GREETING=hello-from-env'
nix eval .#legacyPackages.x86_64-linux.mixedToken 2>&1 | grep -F -e 'unsupported ocx token'
```

Each `grep -Fqx` passes with exit 0. So does the last line, whose grep finds
the reader's `unsupported ocx token` throw. Exit 1 on the last line is the
finding: either a value printed, or `does not provide attribute` because the
test value is missing.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-GEN-20 | Translate env entries to `makeWrapper` flags in the index's order: `path` to `--prefix KEY ":" VALUE`, `constant` to `--set KEY VALUE`, `list` to `--suffix KEY SEP VALUE`. Shell-escape every literal segment with `lib.escapeShellArg` and splice only `"$installPath"` unescaped, for `${installPath}` or `${self.installPath}` with any `:native` or `:posix` suffix stripped. Turn the `$${` escape into a literal `${`. The generator inlines `${self.env.KEY}` textually from the earlier entry, never as a shell variable `"$KEY"`. The reader throws on every other `${…}` token, checking every segment after splicing, and on a non-empty `dependencies` array it does not translate. Map `dependencies` visibility `sealed` and `private` to `buildInputs`, `public` and `interface` to `propagatedBuildInputs`. | The values are third-party registry data in a builder script. Double-quoting them runs `$(…)` at build time and turns `$${` into the builder's PID. Escaping a whole value single-quotes `$installPath` too. A spliced `"$KEY"` expands in the builder, where `KEY` is unset or holds the sandbox's value. Splitting on the first token only ships a second token as literal text. | The commands above. Watched red: a double-quoting translator printed `HOSTILE=preINJECTEDpost` and `DEVC=1{workspaceFolder}/x`, exit 1, and a first-token-only renderer evaluated `mixedToken` to a string holding the literal `${deps.cmake.installPath}`, exit 0. Watched green: both lines literal, exit 0, and `mixedToken` and a `${self.env.A}` value threw `unsupported ocx token` (the bare `nix eval` exits 1). Watched red: the prototype, which lacks `mixedToken`, exit 1. Watched green: a twin whose `mixedToken` throws, exit 0. | MUST (D, ocx metadata) | nixpkgs 26.11pre `makeWrapper`, CppNix 2.35.2 |
| NIX-GEN-22 | Translate each entry point into a launcher, `makeWrapper "$out/bin/<command>" "$out/bin/<name>" --add-flags <args>`, wrapping the package's own env-wrapped `bin/<command>`, never the raw binary under `libexec/`. Render each `args` element on its own with NIX-GEN-20's segment renderer, then space-join. A reader that does not translate entry points throws on a non-empty `entrypoints`. | ocx resolves `command` against the package's composed env, so wrapping the raw payload silently drops every env entry. 0 of 122 ocx packages declare entry points (2026-09-27), so a dropped field goes unnoticed until one does. | The `greet` line. Watched red: a launcher over the raw binary printed `GREETING=`, exit 1. Watched green: `GREETING=hello-from-env`, exit 0, with `arg1=userarg` in both. | MUST (D, ocx metadata) | nixpkgs 26.11pre `makeWrapper --add-flags` |

## The Generator

```sh
grep -rn -e 'os.features' -e 'os_features' -e 'libc.glibc' --include='*.nix' --include='*.py' --include='*.sh' .
jq '[.tags[].content] | unique | length' p/actionlint/actionlint.json
jq '.actionlint.actionlint.versions | length' data.json
jq '[.manifests[]?.platform | select(.os == "linux" and .architecture == "amd64")] | length' index.json
curl -s -o /dev/null -w '%{http_code}\n' -H 'Authorization: Bearer QQ==' -H 'Accept: application/vnd.oci.image.manifest.v1+json' https://ghcr.io/v2/ocx-contrib/actionlint/actionlint/manifests/sha256:f5467fd4be6eebddb0e5eaf18a498f4e44bf3632cdc086c73acfbc271d7d2c64
grep -rn -F -e 'org.opencontainers.image.description' -e 'org.opencontainers.image.url' -e 'org.opencontainers.image.source' --include='*.nix' --include='*.py' --include='*.rs' --include='*.sh' .
```

Run the GEN-02 and GEN-21 greps in the flake repository, and in a standalone
generator script. In the index client's own source (the pinned default) they
hit the relation and annotation constants the rule tells you to reuse, so there
the check is the reading heuristic: the generator subcommand calls the client's
relation and reads `meta` from the package record. A hit that sets a label on
an image the repository builds (`dockerTools` `config.Labels`) is not a
finding. The two
middle `jq` lines count one package's unique content digests in the index and
its versions in the data file, and their outputs must match. The
`index.json` line counts linux/amd64 manifests in one image index: 2 or more
marks an index only the platform relation can decide. The `curl` line is the
manifest probe: `200` is the pass, and `404` without the `Accept` header is the
registry behaviour NIX-GEN-05 guards against.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-GEN-02 | The generator reuses the index client's own platform-compatibility relation and registry client (ocx: its `is_compatible` scoring). The flake repository carries no platform logic. | A second implementation of the relation drifts from the one that installs the packages. | The first grep, run in the flake repository only (the client that owns the relation legitimately matches it). Watched red: a hand-rolled relation in `generate.py`, exit 0 with the hit. Watched green: a script recording the client's resolved output, exit 1. | MUST (D, OCI index generator) | tool-independent |
| NIX-GEN-03 | Group tags by content digest first. Emit one version per unique image-index digest, name it by the first present of full semver, `x.y.z_YYYYMMDD`, a build number, timestamp or variant, a float, then `latest`, and expose the other tags as aliases. Never drop a digest that has no semver tag. | 56.7% of ocx tags are aliases of another tag's digest. Walking tags emits floats and `latest` as separate builds. | The two digest-count lines. Watched red: a tag-walking generator emitted 16 versions against 13 unique digests. Watched green: 13 and 13. | MUST (D, generator) | tool-independent |
| NIX-GEN-04 | Map offers to Nix systems through the index's relation, with the host requirement `{libc.glibc}` for `*-linux`, so a glibc offer beats a bare one and musl-only offers drop. Drop `windows/*`, and drop `darwin/amd64` against nixpkgs 26.11 and later. Never select by first match on (os, arch). | ruff lists its bare linux/amd64 manifest before its glibc one, and corretto has glibc and musl offers with no bare one. First match misroutes the first and drops the second. | The `index.json` line flags the ambiguity: ruff's index printed 2, actionlint's 1. Then a generator unit test over both shapes must pick the glibc manifest for each. | MUST (D, OCI index generator) | nixpkgs 26.11 and later for the darwin/amd64 drop |
| NIX-GEN-05 | Resolve the manifest and the config blob separately for every (package, platform) pair. Never copy one platform's env, binaries or `strip_components` onto another, and strip with `tar --strip-components=N`. Fetch manifests with the OCI `Accept` header as well as the bearer header. | cmake's config sets `PATH` to `${installPath}/bin` on Linux and `${installPath}/CMake.app/Contents/bin` on Darwin. Without `Accept`, ghcr.io answers a bare 404 that reads like a missing digest. | Reading heuristic: the per-platform loop has two registry call sites, `/manifests/` and `/blobs/`. The `curl` probe: watched red without the `Accept` header, `404`. Watched green with it, `200`. | MUST (D, OCI index generator) | ghcr.io, observed 2026-09-27 |
| NIX-GEN-21 | Take `meta.description` and `meta.homepage` from the index's own package record (ocx: `desc.description` and `upstream.repository_url`), never from an OCI annotation, and never map `org.opencontainers.image.source` to `homepage`. When the record has no URL, omit `homepage`, never default or guess it. | 0 of 1,720 ocx image indexes carry a description or URL annotation, and `.source` names the mirror repository, so mapping it sends every consumer to the mirror. A description synthesised from the attribute name tells the consumer nothing. | The last grep. Watched red: a generator mapping the annotations, exit 0 with the hit. Watched green: one reading the package record, exit 1. A description built from a template over the attribute name is a reading-heuristic finding. | MUST (D, generator) | tool-independent |

## The Update Loop

```sh
grep -rl -e 'git push' -e 'github-push-action' -e 'git-auto-commit-action' -e 'add-and-commit' .github/workflows | xargs -r grep -L -e 'create-pull-request' -e 'create-pr'
jq -S . data.json | cmp - data.json
```

The first line prints each workflow that pushes without opening a PR: a
printed path is the finding, empty output the pass, whatever the exit code. A
workflow that opens its PR with `gh pr create` is printed too and is read by
hand. Run it in a D flake's repository only: another shape's release or
docs workflow is not this row's. A printed workflow whose updater verifies
publisher signatures before it commits is not a finding, so read the script it
runs (zig-overlay's `./update` runs `minisign -V` on the index and on every
tarball). The second passes with exit 0 and no output.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-GEN-16 | Land updates as a reviewed PR under a GitHub App token. Report one item's 404 or tie refusal per item without failing the run. Never push to the default branch while the index does not verify publisher signatures. | These are third-party binaries that consumers trust unseen. A push gated only on `nix flake check --no-build` ships whatever the registry served. | The first line. Watched red: a `git push` to `main`, the workflow printed. Watched green: `peter-evans/create-pull-request@v7`, nothing printed. Watched red: rust-overlay's `ad-m/github-push-action` workflows printed. Watched green: nixpkgs-terraform's `peter-evans/create-pull-request`, nothing printed. Watched 2026-09-27: zig-overlay's `update.yml` printed, a push the signature clause exempts, so the reading step above clears it. | SHOULD (D) | tool-independent |
| NIX-GEN-17 | Keep every digest. Emit the data file deterministically, with sorted keys and one stable format, so update diffs are reviewable. Revisit pruning only past 20 MB (**pinned**). | All ocx digests on all platforms project to about 2.1 MiB. Pruning loses pins for no measured gain, and unsorted output turns every update into a full-file diff. | The second line. Watched red: reversed key order, `differ: byte 6, line 2`, exit 1. Watched green: exit 0. | SHOULD (D) | jq 1.8.1 |
| NIX-GEN-18 | Once the index populates a status field, keep `yanked` versions in `legacyPackages`, drop them from `packages`, and wrap `deprecated` versions in `lib.warn`. Until then, invent no signal. | ocx's `status` is set on 0 of 125 packages (2026-09-27). An invented signal drifts from the index. | Reading heuristic. | CONSIDER (D) | tool-independent |

## Applied Evidence (held-out round 2026-09-27)

- mitchellh/zig-overlay violates NIX-GEN-06 in `flake.nix`: gate step 4 by remote ref fails with `flake attribute 'packages.aarch64-darwin.brew' is not a derivation`, exit 1.
- mitchellh/zig-overlay violates NIX-GEN-07 in `flake.nix`: its overlay returns `self.packages`, so the tree is not built against `final`.
- nix-community/nix-index-database, nix-community/fenix, oxalica/rust-overlay and nix-community/nix-vscode-extensions violate NIX-GEN-16 in `.github/workflows/`: each updater pushes to the default branch with no PR.
- mitchellh/zig-overlay (`sources.json`), stackbuilders/nixpkgs-terraform (`versions.json`), nix-community/fenix (`data/stable.json`) and nix-community/nix-vscode-extensions (`data/cache/open-vsx-latest.json`) violate NIX-GEN-17: keys are unsorted, and `jq -S . F | cmp - F` exits 1.
- No held-out repository is shape D, and the NIX-GEN greps found no violation in the eight held-out trees.

## What Agents Get Wrong Here

Ranked by how often each bit in the research runs, from the most frequent.

1. **A header-less `fetchurl` or `nix-prefetch-url` against a ghcr.io blob**, then `--impure`, a token script or `dockerTools.pullImage` after the 401 (NIX-GEN-08).
2. **Believing a fetch fix worked because the fixed-output path was already in the store.** Only `--rebuild` proves it (NIX-GEN-08, NIX-GEN-15).
3. **Walking tags as versions**, or dropping a digest that has only a build-number tag (NIX-GEN-03).
4. **Merging the generated set into `pkgs`**, shadowing cmake, neovim and jq (NIX-GEN-07).
5. **Nesting versions under `packages`** (NIX-GEN-06).
6. **Selecting a manifest by first match on (os, arch)**, or assuming every package has a bare offer (NIX-GEN-04).
7. **Trusting `nix flake check --no-build` as proof a package builds.** It passed a corrupted digest and an unbuildable package (NIX-GEN-15).
8. **Calling `lib.getLicenseFromSpdxId` on an SPDX expression**, or defaulting a missing license (NIX-GEN-14).
9. **Guessing `mainProgram` for a multi-binary package**, or documenting a `nix run` example that was only evaluated (NIX-GEN-13).
10. **Committing the signed redirect URL "so generation runs once"**, or adding `--location-trusted` (NIX-GEN-10).
11. **Reaching for `builtins.convertHash` or a stored SRI copy** instead of the digest verbatim (NIX-GEN-09).
12. **Omitting `autoPatchelfHook` for bare offers** on the assumption that bare means static (NIX-GEN-11).
13. **`autoPatchelfIgnoreMissingDeps = [ "*" ]`, or dropping the hook**, the first time one bundled binary lacks a library (NIX-GEN-19).
14. **Quoting env values as a unit**: `lib.escapeShellArgs` ships the literal `$installPath`, and hand double-quoting runs `$(…)` from registry data at build time (NIX-GEN-20).
15. **Moving a `makeWrapper` output onto the path it wraps** (`makeWrapper orig tmp; mv tmp orig`). The wrapper execs itself and hangs at 0% CPU, so run the smoke check under `timeout` (NIX-GEN-15).
16. **Splicing `${self.env.KEY}` as `"$KEY"`**, or splitting a value on its first token only (NIX-GEN-20).
17. **Writing `"$${x}"` to mean a literal `$` then interpolation.** Both Nix string forms keep `$${` as literal text with no warning, so build the splice by concatenation (NIX-GEN-20).
18. **Wrapping an entry point's raw binary**, or ignoring `entrypoints` and `dependencies` because the 2026-09-27 data has none (NIX-GEN-22).
19. **Mapping `org.opencontainers.image.source` to `homepage`**, or synthesising a description (NIX-GEN-21).
20. **Reading ghcr.io's bare manifest 404 as a missing package** before adding the OCI `Accept` header (NIX-GEN-05).
