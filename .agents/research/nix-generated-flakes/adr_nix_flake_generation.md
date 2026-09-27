# ADR: Nix Flake Generation from the Package Index

## Metadata

**Status:** Proposed
**Date:** 2026-09-27
**Deciders:** mherwig
**Beads Issue:** N/A
**Related PRD:** N/A
**Tech Strategy Alignment:**
- [x] Decision follows Golden Path in `.claude/rules/product-tech-strategy.md`: Rust 2024, no new crate dependency, reuses the platform relation, the index client and the registry client.
**Domain Tags:** integration | oci | devops | security
**Supersedes:** N/A
**Superseded By:** N/A
**Evidence:** the Nix research corpus in `ocx-sh/grimoire-lore`, paths below relative to its `.agents/research/` directory. Every measurement is dated 2026-09-27 on CppNix 2.35.2 with nixpkgs 26.11pre `8d5d2709`, unless a line names another version.

Contents: Context · Decision Drivers · Industry Context · Considered Options · Decision Outcome (D1 to D14) · Requests to ocx-sh/index · Prototype Status and Migration · Consequences · Technical Details · Implementation Plan · Validation · Open Questions · Links · Changelog

## Context

Nix users cannot install packages from the ocx index today. The index holds 125 packages and 1,720 stored image indexes, with 2,985 tags over 1,293 distinct digests (`nix-audit/ocx-index-and-fleet.md` §1). A Nix flake that exposes those packages must solve five problems that the index does not solve for it.

1. **The fetch.** ghcr.io answers 401 to an anonymous blob GET, and a blob GET that succeeds redirects to a signed URL that expires in about 10 minutes (`nix-audit/ocx-index-and-fleet.md` §3). `nix-prefetch-url` and a header-less `fetchurl` both fail.
2. **Platform selection.** Several manifests can match one Nix system. `astral-sh/ruff` lists its bare linux/amd64 manifest before its glibc one, and `amazon/corretto` has glibc and musl manifests and no bare one. Choosing by first (os, arch) match misroutes ruff and drops corretto (`nix-generated-flakes/verification-rerun-w3.md` §3). The correct answer is ocx's directed relation.
3. **Per-platform metadata.** `binaries`, `env` and `strip_components` live only in each platform's config blob. kitware/cmake 4.4.2 sets `PATH` to `${installPath}/bin` on Linux and to `${installPath}/CMake.app/Contents/bin` on Darwin (`nix-generated-flakes/verification-rerun-w3.md` §4).
4. **Name collisions.** 96 of 122 index basenames already exist under nixpkgs `pkgs/by-name`, and `cli` exists in 4 namespaces (`nix-generated-flakes/index-data-model.md` §3, §4).
5. **Trust.** Consumers run these prebuilt third-party binaries unseen. The OCI digest proves integrity against the index, not the authenticity of the index.

The research program built and cold-rebuilt a prototype flake over four packages and distilled 22 rules, NIX-GEN-01 to 22, which ship in the `nix-quality` rule's `generated-flakes` depth file (`nix-generated-flakes.md`). This ADR decides how ocx implements them. Owner defaults Q1 to Q8 were applied during the autonomous research run (`nix-frame.md`, last section). Each is marked **(pinned)** where it appears: a default the owner confirms or overrides once.

## Decision Drivers

- **One platform relation.** A second implementation of `is_compatible` drifts from the first. setup-ocx already carries one (`nix-audit/ocx-index-and-fleet.md`, smell 4).
- **Pure evaluation.** Consumers evaluate with IFD off and without `--impure`. Nothing reads the network during evaluation.
- **Wrong binaries must fail loudly.** A wrong `mainProgram`, a wrong platform, or a mistranslated env var builds cleanly and misbehaves at run time. Each needs a check that can go red.
- **Registry data is untrusted input.** Env values are interpolated into a builder script and must never execute.
- **Reviewability.** Every update is a diff a human can read before consumers get it.
- **Cheap to consume.** Each package is one blob fetch and an unpack. No cache and no `nixConfig`.

## Industry Context & Research

**Research artifact:** `nix-generated-flakes.md` (the NIX-GEN ruleset), with dives `nix-generated-flakes/oci-fetch-prototype.md`, `nix-generated-flakes/index-data-model.md`, and re-runs `nix-generated-flakes/verification-rerun-w2.md` and `nix-generated-flakes/verification-rerun-w3.md`.
**Trending approaches:** every generator in the corpus commits data or generated Nix (8 of 8). None reads upstream at evaluation time. zig-overlay fetches Homebrew bottles from ghcr.io with the same `Authorization: Bearer QQ==` header and overlays one name (`zigpkgs`). nixpkgs-terraform and nixpkgs-python land updates as reviewed PRs under a GitHub App token. zig-overlay, fenix and nix-index-database push directly, and only zig-overlay verifies a signature (minisign) first.
**Key insight:** the OCI layer digest is itself a valid fixed-output hash (`sha256:<hex>`), accepted by CppNix 2.35.2 and Lix 2.95.2. With the anonymous placeholder header, plain nixpkgs `fetchurl` fetches every public ghcr.io package in the sandbox, with no token exchange and no committed URL.

## Considered Options

### Option 1: ocx subcommand writes committed data, a small Nix reader, a CI updater (chosen)

**Description:** `ocx index nix` resolves every (package, version, platform) through ocx's own index client, relation and registry client, and writes one deterministic `data.json`. The flake repository commits it and reads it with `builtins.fromJSON`. A scheduled workflow regenerates it and opens a reviewed PR.

| Pros | Cons |
|------|------|
| One platform relation, one registry client, one template grammar | The generator ships in the ocx binary and follows its release cadence |
| Pure evaluation, IFD off, no network at eval | Two registry round trips per (package, platform) at generation time until the index publishes a resolved projection (A5) |
| Every update is a readable JSON diff | The flake repository depends on an ocx release to change generation |

### Option 2: standalone generator script in the flake repository

**Description:** a Python or TypeScript script in `ocx-sh/ocx-nix` walks the index and the registry itself.

| Pros | Cons |
|------|------|
| Flake repository is self-contained | Reimplements the directed relation and the scoring (NIX-GEN-02). The wave-3 red twin `gen02/` shows the shape, and first-match selection misroutes ruff and drops corretto |
| No ocx release needed to change the generator | Reimplements token handling, the manifest `Accept` header and the `${…}` grammar |

### Option 3: evaluation-time reader over `ocx-sh/index` as a `flake = false` input

**Description:** no generator. The flake reads package files from the index input and fetches manifests during evaluation.

| Pros | Cons |
|------|------|
| No update loop, always current | Blocked at three measured gates (NIX-GEN-01): pure evaluation refuses the absolute path, IFD-off refuses the build, and with IFD on the manifest fetch is not fixed-output, so the sandbox has no network (builder exit 6) |
| | Viable only after the index publishes a resolved projection with layer digests (A5), and even then unreviewed |

### Fetch transport, compared inside Option 1

| Transport | Result | Verdict |
|---|---|---|
| nixpkgs `fetchurl` with `curlOptsList = [ "-H" "Authorization: Bearer QQ==" ]`, `hash` = layer digest | Sandboxed build exit 0. Without the header: `curl: (22) … 401` | **Chosen** (NIX-GEN-08, 09) |
| Token exchange inside the FOD | Works, adds a script per fetch | Fallback only, if ghcr.io changes anonymous pull |
| `skopeo` or `dockerTools.pullImage` | Works, heavier closure, image-shaped output | Fallback only |
| `nix-prefetch-url`, builtin fetchers | 401 | Rejected |
| Committed resolved blob URL | Expires in about 10 minutes | Rejected (NIX-GEN-10) |

## Decision Outcome

**Chosen Option:** Option 1.

**Rationale:** it is the only option that keeps one platform relation, evaluates purely, and gives a reviewable diff per update. Option 3 is architecturally blocked until A5 lands. Option 2 duplicates the knowledge this ADR exists to keep in one place.

### D1. The generator is an `ocx` subcommand (NIX-GEN-02, 03, 05)

- **Name:** `ocx index nix --output data.json [REGISTRY…]`, a sibling of `ocx index catalog` in the `index` verb family (`crates/ocx_cli/src/command/index_catalog.rs` is the closest existing shape). The name is a two-way door.
- **Reuse, never reimplement:**
  - platform selection through `Index::select` (`crates/ocx_index/src/lib.rs:810`), which routes through `select_best` (`crates/ocx_oci/src/platform.rs:518`), `is_compatible` (`crates/ocx_oci/src/platform.rs:416`) and `compatibility_score` (`crates/ocx_oci/src/platform.rs:485`)
  - manifests and config blobs through `ocx_oci::Client` (`crates/ocx_oci/src/client.rs:284`, `fetch_manifest` at `:716`), which pulls manifests with `ACCEPTED_MANIFEST_MEDIA_TYPES` as the `Accept` header and handles the anonymous token exchange. Without the `Accept` header ghcr.io answers a bare 404 that reads like a missing digest (`nix-generated-flakes/verification-rerun-w3.md` §8)
  - the `${…}` token grammar from `crates/ocx_package/src/metadata/template.rs` (`resolve` at `:202`), so the generator's tokenizer and ocx's resolver accept the same language
- **Per-platform resolution:** fetch the manifest and the config blob separately for every (package, platform). Never copy one platform's `env`, `binaries` or `strip_components` to another.
- **Versions:** group tags by image-index digest first. One version per digest, canonical tag chosen in this order: full semver, then `x.y.z_YYYYMMDD`, then build number, timestamp or variant, then float, then `latest`. The other tags become aliases. A digest with no semver tag is kept (corretto `11.0.32_10001`). The version count must equal the unique-digest count, 1,293 today.
- **Per-item failure:** a 404 or a tie refusal (`Selection::Ambiguous`, exit 65) is reported for that item and never aborts the run. The previous entry for that item is kept. The subcommand exits non-zero only when it cannot write a valid file.
- **Output:** `data.json` with sorted keys and one fixed formatting (NIX-GEN-17). The flake repository carries no platform logic.

### D2. Repository `ocx-sh/ocx-nix` (Q4, pinned)

- Flake reference `github:ocx-sh/ocx-nix`. The name says what it is and leaves `ocx-sh/ocx`'s own source-built flake (shape A) separate.
- **Inputs:** `nixpkgs` only, as a branch reference (`github:NixOS/nixpkgs/nixos-unstable`) locked by `flake.lock`. A root `nixpkgs` input lets flake-checker run (settles M-E-21). No FlakeHub input or publication (Q1, pinned).
- `formatter = pkgs.nixfmt-tree` (NIX-GATE-01). No tags: a generated flake cuts no releases (NIX-REL-07). Its release-time proof is the update PR's smoke build.

### D3. The fetch (NIX-GEN-08, 09, 10)

- Layers use nixpkgs `fetchurl` with `url = "https://ghcr.io/v2/<registry-repo>/blobs/<digest>"` and `curlOptsList = [ "-H" "Authorization: Bearer QQ==" ]`. The placeholder token works for every public package, `ocx-contrib` and Homebrew included. GitHub does not document it (observed 2026-09-27, re-check when a smoke build turns 401).
- `hash` is the OCI layer digest verbatim (`"sha256:<hex>"`), stored once. No SRI copy, no prefetch, no `builtins.convertHash` (Lix 2.95.2 lacks it). A second stored copy was measured to drift into a hash mismatch.
- `data.json` carries each package's registry repository explicitly. The reader never derives it from the namespace, because fleet packages do not all live under `ocx-contrib`.
- Never commit a resolved `pkg-containers.githubusercontent.com` URL, `--location-trusted`, or `lib.fakeHash`. `--location-trusted` forwards the bearer header across hosts, which the OCI distribution spec forbids.
- Token-exchange FOD and `skopeo` are fallbacks, adopted only if ghcr.io withdraws anonymous pull. A layer FOD's store path depends only on its name and hash, so switching transport never changes a consumer's store paths.

### D4. Attribute shape (NIX-GEN-06, 07)

- `packages.<system>.<ns>-<pkg>`: flat, latest version only, always a derivation.
- `legacyPackages.<system>.<ns>.<pkg>."<version>"`: every canonical version plus its aliases. The version is quoted (`kitware.cmake."4.4.2"`). Unquoted fails with `does not provide attribute`.
- A package absent on a system is omitted from that system, never a `throw`.
- `overlays.default = final: _prev: { ocx = …; }` adds exactly one attribute, built against `final` (`_prev` per NIX-FLK-02). It never merges generated names into `pkgs`, which would silently replace a consumer's `pkgs.cmake`.
- NIX-FLK-13's drvPath equality compares `packages.<system>.<ns>-<pkg>` with `(… .extend overlays.default).ocx.<ns>.<pkg>`. One shared builder file serves every entry.

### D5. The libc template (NIX-GEN-11, 19)

- Every `*-linux` package gets `nativeBuildInputs = [ autoPatchelfHook ]` and `buildInputs = [ stdenv.cc.cc.lib ]`, bare or `+libc.glibc`. Bare does not mean static: 12 packages sit in both the bare and the tagged set. On a static ELF the hook is a measured no-op with an identical closure.
- `autoPatchelfHook` fails the whole derivation when one bundled binary lacks a library. A package may carry `autoPatchelfIgnoreMissingDeps` as a list of exact sonames, never `["*"]`, and only for sonames wanted solely by binaries outside the primary command set while the smoke check runs a primary binary.
- Source of that list: a small reviewed `overrides.json` in `ocx-sh/ocx-nix`, keyed by `<ns>/<pkg>`, that `ocx index nix --overrides` copies into `data.json`. The generator cannot learn it without building. The trigger that justifies an entry is the build log's `<soname> -> not found!` line naming the binary.

### D6. `cmake-gui` policy

kitware/cmake's `cmake-gui` needs `libxcb.so.1`, `libfontconfig.so.1` and `libfreetype.so.6`. `cmake`, `ccmake`, `cpack` and `ctest` need none. **Decision:** the D5 ignore list. `cmake-gui` stays present and fails at run time with `libxcb.so.1: cannot open shared object file`. ocx mirrors CLI tools first. Revisit if the index prioritizes GUI packages, by adding the three real libraries to `buildInputs` through `overrides.json`.

### D7. Meta mapping (NIX-GEN-12, 13, 14, 21)

| Field | Source | Rule |
|---|---|---|
| `sourceProvenance` | constant `[ lib.sourceTypes.binaryNativeCode ]` | always set, with `meta.platforms` |
| `license` | image-index `org.opencontainers.image.licenses` | the generator splits the expression on `OR` and `AND` into SPDX ids. The reader maps each with `lib.getLicenseFromSpdxIdOr id { spdxId = id; shortName = id; }`, with `free` set from a per-id flag the generator records from the SPDX license list (the base license for `WITH`), because a list entry without `free` is read as unfree and refused. Omitted when the annotation is absent, never defaulted to free or unfree |
| `description` | package index `desc.description` | present for 125 of 125 |
| `homepage` | package index `upstream.repository_url` | present for 123 of 125. Omitted when absent, never guessed |
| `mainProgram` | config blob `binaries` | set only when there is exactly one binary. Never guessed |

- Never read `description` or `homepage` from an OCI annotation. 0 of 1,720 image indexes carry `.description` or `.url`, and `.source` (1,691) names the `ocx-contrib/mirror-<ns>` repository, not upstream.
- A wrong `mainProgram` silently runs the wrong binary. An omitted one fails loudly with `unable to execute '…/bin/<pname>'`.
- NIX-PKG-07's license-presence clause does not bind this flake. NIX-GEN-14 replaces it (map E15). `homepage` is set from `upstream.repository_url` whenever present and omitted otherwise (NIX-GEN-21, MUST). E36's SHOULD applies to NIX-PKG-07 source builds only.

### D8. Env, entrypoint and dependency translation (NIX-GEN-20, 22)

- **Layout:** the payload unpacks to `$out/libexec/<pkg>/` with `tar --strip-components=N`. Wrappers live at `$out/bin/<binary>`. A wrapper never replaces the file it wraps, or it `exec`s itself and hangs.
- **Env types:** `path` becomes `--prefix KEY ":" VALUE`, `constant` becomes `--set KEY VALUE`, `list` becomes `--suffix KEY SEPARATOR VALUE`, emitted in the order of ocx's `env` array.
- **Rendering:** every literal segment goes through `lib.escapeShellArg`. The only unescaped splice is `"$installPath"`, for `${installPath}` or `${self.installPath}`, with `:native` or `:posix` stripped (both render `/` on Linux and Darwin). `$${` becomes a literal `${`. Never double-quote a value into the builder (measured: `$(…)` executes at build time) and never `lib.escapeShellArgs` a whole value (measured: exports the literal `$installPath`).
- **`${self.env.KEY}`:** the generator inlines the earlier entry's unresolved value textually, because ocx defines the token as this package's own resolved value. Never splice it as `"$KEY"`: that expands in the builder shell at build time (measured: `SDK_TOOL=/bin/tool`).
- **The reader throws** on any `${…}` left in any segment after splicing, so a second token in one value (`${self.installPath}/bin:${deps.cmake.installPath}/bin`) throws instead of shipping as text.
- **Dependencies:** 0 of 122 reachable packages declare one. The reader throws on a non-empty `dependencies` array and on `${deps.NAME.installPath}` until a real package does. The mapping for that day, verified on synthetic data only: `sealed` and `private` to `buildInputs`, `public` and `interface` to `propagatedBuildInputs`, the dependency's env applied to this wrapper for `private` and `public` only.
- **Entrypoints:** 0 packages declare one. Each `entrypoints.<name>` becomes `makeWrapper "$out/bin/<command>" "$out/bin/<name>" --add-flags …`, wrapping the already env-wrapped `bin/<command>`, never the raw payload. Each `args` element is rendered on its own and the results are space-joined. Until implemented, the reader throws on a non-empty `entrypoints`.

### D9. Systems (NIX-GEN-04)

- Exported: `x86_64-linux`, `aarch64-linux`, `aarch64-darwin`. Never `x86_64-darwin`: nixpkgs 26.11 throws on it (NIX-FLK-09), so `darwin/amd64` offers are dropped.
- Linux selection uses the host requirement `{libc.glibc}` (nixpkgs' default stdenv), so a glibc offer beats a bare one and musl-only offers drop. No `latest` offer is musl-only today. `windows/*` offers drop.
- `aarch64-darwin` is evaluated in CI and not built. The README marks it so until a macOS smoke leg runs in the update PR (open question M-E-10). This is the stated deviation from NIX-GATE-15 (map E5).

### D10. History and pruning (NIX-GEN-17, Q5 pinned)

Keep every digest on every platform: about 2.06 MiB projected, latest-only about 205 KiB (`nix-generated-flakes/index-data-model.md` §9). When `data.json` passes 20 MB, switch to a rolling window, recorded as an amendment to this ADR. `packages` carries latest only, so history costs consumers nothing at `nix flake show`.

### D11. The update loop (NIX-GEN-15, 16)

- **Cadence:** a daily schedule plus `workflow_dispatch`, one open update PR at a time, force-updated on its branch. The daily update PR also runs `nix flake update` and carries the `flake.lock` bump (NIX-INP-11): a D flake opens no separate lock PR. Only wrappers rebuild, because layer FODs are invariant.
- **Token:** a GitHub App token scoped to `ocx-sh/ocx-nix` (`actions/create-github-app-token`), a fine-grained PAT scoped to `ocx-sh/ocx-nix` only as the fallback, never a classic PAT. PR opened by `peter-evans/create-pull-request`.
- **Gate on the PR:** `nix flake check --all-systems --no-build --option allow-import-from-derivation false .`, then a sandboxed smoke build that runs every changed x86_64-linux package's binary, then `nix build --rebuild` on every changed layer FOD on a warm runner. `--no-build` alone passed a corrupted digest twice and an unbuildable cmake. Evaluation cost is no argument: the full 125-package, 1,293-version, 3-system check took 4.38 s wall.
- **Review:** human-merged. The PR body lists per-item failures from D1. Never push to the default branch while publisher signatures are unverified (A4).

### D12. Yanked and deprecated versions (NIX-GEN-18)

`status` is `active` on 125 of 125 packages today, so the generator emits no signal. Once the index populates it: a `yanked` version stays in `legacyPackages` (pinned consumers keep resolving) and leaves `packages`, and a `deprecated` version is wrapped in `lib.warn`.

### D13. No cache and no `nixConfig` (Q2 pinned, M-E-19)

Each package is one blob fetch plus an unpack, so a binary cache saves nothing worth a trust decision. The flake carries no `nixConfig`, which would prompt every consumer to trust a substituter (NIX-SEC-01).

### D14. README with executed examples

- Show the quoted version form and `nix run` only on single-binary packages: `nix run 'github:ocx-sh/ocx-nix#legacyPackages.x86_64-linux.actionlint.actionlint."1.7.12"' -- -version` (measured: prints `1.7.12`).
- Show multi-binary packages with `nix shell`, for example `nix shell 'github:ocx-sh/ocx-nix#legacyPackages.x86_64-linux.kitware.cmake."4.4.2"'`. `nix run` on cmake fails with `unable to execute '…/bin/kitware-cmake'`. The `nix shell` form was not run in any research pass. Single-quote every installable that carries a quoted version.
- Every example sits in one fenced block that CI extracts and executes on each update PR. Evaluated or built is not enough: an earlier draft claimed a cmake `nix run` resolved, and it never did.
- State that `inputs.nixpkgs.follows` is safe, because layer FODs are invariant and only wrappers rebuild (map E17). Mark `aarch64-darwin` as evaluated, not built (D9).
- Consumer floor: the oldest non-stub `nixVersions.nix_2_*` in the pinned nixpkgs, today `nix_2_31` = 2.31.5, computed in CI and never hardcoded (Q8, pinned). CppNix is gated, Lix 2.95.2 is an advisory leg, Determinate Nix is untested and never deliberately broken (Q6, pinned).

## Requests to ocx-sh/index

| # | Request | Evidence | Effect on this ADR |
|---|---|---|---|
| A1 | Make `org.opencontainers.image.licenses` a required annotation | 128 of 1,720 image indexes lack it. 8 latest versions lack it, all open-source (the bazel family, regclient, `ocx/cli` with 26 indexes, `grimoire/cli` with 4) | Until then `meta.license` is omitted (D7) |
| A2 | Add `upstream.repository_url` to `ocx/cli` and `ocx/mirror` | Present on 123 of 125. These two are the gap | Their `homepage` is omitted until then |
| A3 | Fix the anonymous manifest 404 for `grimoire/cli`, `ocx/cli` and `ocx/mirror` | Both censuses, with the bearer and `Accept` headers, reached 122 of 125. These three returned 404 | The fleet's own tools are absent from the flake until then |
| A4 | Publisher-signature verification (M-E-20) | ocx ships signing and verification over OCI referrers (`adr_oci_referrers_signing_v1.md`). The research did not measure whether index packages carry signatures, and a read of the mirror tool's sources on 2026-09-27 found no upstream-signature check before push | Reviewed-PR updates (D11) until the mirror verifies upstream signatures where upstream publishes them and signs what it pushes, and `ocx index nix` verifies before writing. Direct push may be reconsidered then, as zig-overlay does with minisign |
| A5 | Publish a resolved projection (M-E-29): per package, version and platform, the manifest digest, layer digest, size, `strip_components`, `binaries`, `env`, `entrypoints`, `dependencies` and license | Generation needs two registry hops per (package, platform) today. The desc-blob contract is unresolved in the index's own docs | Removes the hops. Makes Option 3's evaluation-time read viable, still behind review |

## Prototype Status and Migration

The prototype lives at `nix-generated-flakes/prototype/` (`flake.nix`, `flake.lock`, `data.json`, `lib/fetch-layer.nix`, `lib/tree.nix`, `lib/mk-package.nix`, `lib/mk-ocx-env.nix`, `README.md`). It is evidence, not a reference implementation.

**What it proves.** It builds and smoke-runs actionlint, ninja, cmake and a synthetic corretto (real env and binaries, stub payload). It passes NIX-GEN-07, 11, 13, 17 and 19 and the escaping half of NIX-GEN-20 on a wave-3 cold rebuild: Q5, `--rebuild` with no diff, the smoke check, `aarch64-darwin` drvPath evaluation, `nixfmt --check` and `deadnix --fail`, all exit 0. A planted `HOSTILE=pre$(touch /tmp/PWNED)post` value stayed inert. Re-checked while drafting this ADR (CppNix 2.35.2): the gate step exits 0 on a copy of the prototype and exits 1 (`flake attribute 'packages.x86_64-linux.actionlint' is not a derivation`) when `packages` is pointed at the version tree.

**Seven breaks, all fixed before adoption:**

1. **NIX-GEN-20, `self.env` splice.** `lib/mk-ocx-env.nix` renders `${self.env.KEY}` as the builder variable `"$KEY"`. Fix: the generator inlines it (D8), the reader throws.
2. **NIX-GEN-20, first-token-only `renderChunk`.** A second, different token in one value passes through as literal text. Fix: check every segment after splicing and throw.
3. **NIX-GEN-21, meta source.** `meta.description` is synthesised as `"Prebuilt ${ns}/${pkg} from the ocx index"` and `homepage` is absent. Fix: D7.
4. **NIX-GEN-22, ignored fields.** `lib/mk-package.nix` never reads `entrypoints` or `dependencies`. Fix: throw on non-empty until implemented (D8).
5. **NIX-PKG-11, phase hooks.** `lib/mk-package.nix:67,80` override `unpackPhase` and `installPhase` without `runHook preUnpack`/`postUnpack` and `runHook preInstall`/`postInstall`.
6. **NIX-GATE-01, formatter.** `flake.nix` sets `formatter` to bare `nixfmt`. Fix: `nixfmt-tree` (D2).
7. **NIX-INP-03, frozen rev.** `flake.nix:3` pins a nixpkgs rev in `url` with no frozen-on-purpose comment. Fix: a branch reference locked by `flake.lock` (D2).

**Found while drafting, by reading, not run:** `lib/mk-package.nix` maps licenses with `lib.getLicenseFromSpdxIdOr id null` and filters the nulls, so an unmapped id (corretto's `GPL-2.0-only WITH Classpath-exception-2.0`) is dropped silently. NIX-GEN-14 keeps it as `{ spdxId = id; shortName = id; }` (D7). Replacing the drop with the D7 mapping without a `free` flag makes corretto unfree: gate step 4 exits 1 with `Refusing to evaluate package 'amazon-corretto-21.0.9' … unfree license`. The prototype also hardcodes `repo = "ocx-contrib/${ns}/${pkg}"`, which D3 replaces with an explicit repository per package.

## Consequences

**Positive:**
- Nix users get the whole index with no cache, no `nixConfig` and no `--impure`.
- One platform relation serves the CLI, the lock and the flake. A relation fix reaches Nix users on the next update PR.
- Every wrong-binary failure class the research found has a check that was watched red.

**Negative:**
- Changing generation needs an ocx release, and the flake repository pins the ocx version it runs.
- Two registry round trips per (package, platform) at generation time until A5.
- Darwin is evaluated, not built, and the README says so.
- `cmake-gui` ships present and broken (D6).

**Risks:**
- **ghcr.io withdraws anonymous pull or the placeholder header.** The smoke build turns 401 on the next update PR. Mitigation: the token-exchange FOD fallback (D3). Store paths do not change.
- **A mirrored upstream is compromised.** The digest matches whatever was mirrored. Mitigation: human review (D11) until A4.
- **The index adds a token form or a dependency.** The reader throws at evaluation, and the update PR's gate goes red. That is the intended signal to implement the translation.

### Quantified Impact

| Metric | Value | Notes |
|---|---|---|
| `data.json`, all digests, all platforms | about 2.06 MiB projected | 20 MB is the pruning trigger (Q5) |
| `nix flake check --all-systems --no-build` | 4.38 s wall | 125 packages, 1,293 versions, 3 systems, warm nixpkgs eval cache |
| Forcing every version's drvPath | 0.25 s wall | same corpus |
| Versions versus tags | 1,293 versus 2,985 | 56.7% of tags are aliases |

### How Would We Reverse This?

The fetch transport and the generator's name are two-way doors. The attribute shape (D4) and the repository name (D2) are consumer contracts: changing either breaks every consumer's flake reference, so a change keeps the old attribute path for one deprecation cycle with `lib.warn`.

## Technical Details

### Data flow

```text
ocx-sh/index (package files, image indexes)
  -> ocx index nix: Index::select per (package, version, system)
     -> Client: manifest (Accept header) + config blob per platform
     -> data.json (sorted, deterministic) + overrides.json merged
  -> ocx-sh/ocx-nix PR: gate, smoke build, --rebuild, human merge
  -> consumer: pure eval of data.json, fetchurl of one layer per package
```

### Flake outputs

```nix
{
  description = "Prebuilt packages generated from the ocx package index";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      # Never x86_64-darwin: nixpkgs 26.11 throws on it.
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
      data = builtins.fromJSON (builtins.readFile ./data.json);
      tree = pkgs: import ./lib/tree.nix { inherit pkgs data; };
    in
    {
      packages = forAllSystems (system: (tree nixpkgs.legacyPackages.${system}).latest);
      legacyPackages = forAllSystems (system: (tree nixpkgs.legacyPackages.${system}).byVersion);
      overlays.default = final: _prev: { ocx = (tree final).byVersion; };
      checks.x86_64-linux.smoke = import ./lib/smoke.nix {
        pkgs = nixpkgs.legacyPackages.x86_64-linux;
        packages = self.packages.x86_64-linux;
      };
      formatter = forAllSystems (system: nixpkgs.legacyPackages.${system}.nixfmt-tree);
    };
}
```

### Data model (`data.json`, one version entry)

`<ns>.<pkg>` holds `repository`, `description`, `homepage` (optional), `latest`, `aliases` (tag to canonical version) and `versions`. Each version holds `licenses` (SPDX id list, optional), `binaries`, `env` (generator-inlined, D8), `entrypoints`, `dependencies`, optional `autoPatchelfIgnoreMissingDeps`, and `platforms.<system>` with `layerDigest` and `stripComponents`.

## Implementation Plan

1. [ ] `ocx index nix` in `ocx_cli`, reusing D1's call sites, with unit tests on the ruff and corretto image indexes (glibc picked for both) and on cmake's two config blobs (Darwin `PATH` differs).
2. [ ] Generator tests for tag grouping (1,293 versions from 2,985 tags), license splitting, `${self.env.KEY}` inlining and deterministic output.
3. [ ] Create `ocx-sh/ocx-nix` from the prototype with the seven breaks and the two reading findings fixed.
4. [ ] Update workflow with the App token, the D11 gate and executed README examples.
5. [ ] File A1 to A5 on `ocx-sh/index`.

## Validation

Each command below was watched red and green in the research (`nix-generated-flakes.md`, the named rule's row) or while drafting this ADR (the gate step). Run from the flake root.

```sh
# Gate step. Exit 0 and "all checks passed!" is the pass.
nix flake check --all-systems --no-build --option allow-import-from-derivation false .
# NIX-GEN-07. Prints true, exit 0 is the pass. Exit 1 is the finding.
nix eval --json .#overlays.default --apply 'o: builtins.attrNames (o { } { })' | jq -e '. == ["ocx"]'
# NIX-GEN-12. Exit 0 is the pass. Exit 1 prints the packages missing provenance.
nix eval --json .#packages.x86_64-linux --apply 'ps: builtins.filter (n: (ps.${n}.meta.sourceProvenance or [ ]) == [ ]) (builtins.attrNames ps)' | jq -e 'length == 0'
# NIX-GEN-14. Exit 0 is the pass. A warning aborts with exit 1.
nix eval --option abort-on-warn true --json .#packages.x86_64-linux --apply 'ps: builtins.mapAttrs (n: p: p.meta.license or null) ps'
# NIX-GEN-15. Exit 0 is the pass.
nix build --no-link -L .#checks.x86_64-linux.smoke
# NIX-GEN-17. Exit 0 is the pass. Exit 1 names the first differing byte.
jq -S . data.json | cmp - data.json
# NIX-GEN-19. Prints true, exit 0 is the pass.
jq -e '[.. | objects | .autoPatchelfIgnoreMissingDeps? // empty | .[]] | all(. != "*" and test("^[A-Za-z0-9._+-]+\\.so(\\.[0-9]+)*$"))' data.json
# NIX-GEN-10. Empty output (exit 1) is the pass. Any match is the finding.
grep -rn -e 'pkg-containers.githubusercontent.com' -e 'location-trusted' -e 'lib.fakeHash' --include='*.json' --include='*.nix' .
# NIX-GEN-02. Empty output (exit 1) is the pass.
grep -rn -e 'os.features' -e 'os_features' -e 'libc.glibc' --include='*.nix' --include='*.py' --include='*.sh' .
# NIX-GEN-16. Empty output is the pass. A printed workflow pushes without a PR.
grep -rl -e 'git push' .github/workflows | xargs -r grep -L -e 'create-pull-request' -e 'create-pr'
```

NIX-GEN-13 runs as a checked-in script that compares each package's `meta.mainProgram` with `data.json`'s `binaries` count (red exit 1, green exit 0 in the research).

**Not yet watched, required before acceptance:** a Nix-level twin for `${self.env.KEY}` inlining and for the mixed-token throw (NIX-GEN-20), a flake-level check that evaluated `meta.description` and `meta.homepage` equal the index fields (NIX-GEN-21), and the throw on a non-empty `entrypoints` or `dependencies` (NIX-GEN-22). The research watched the first two only at the shell or generator level.

## Open Questions

- **Darwin prebuilt binaries (M-E-10).** Do mirrored upstream archives need `install_name_tool` rpath rewriting or an ad-hoc `codesign -f -s -` on aarch64-darwin, as zig-overlay's Homebrew bottles do? Answering needs a real aarch64-darwin build, and no pass had a Darwin builder. Default until answered: evaluated, not built, marked in the README (D9).
- **Dependencies ahead of data.** Default: throw (D8). Revisit when the roadmap makes a dependency declaration imminent.
- **The `nix shell` README form** for multi-binary packages was never executed. The first update PR's README job settles it (D14).

## Links

- `nix-generated-flakes.md`: the NIX-GEN ruleset, Verdicts 1 to 11, open questions
- `nix-generated-flakes/oci-fetch-prototype.md`: 401, 200 and 307 probes, header non-forwarding, meta mapping
- `nix-generated-flakes/index-data-model.md`: digest grouping, collisions, size projections, update loop
- `nix-generated-flakes/verification-rerun-w2.md`: scale timings, `autoPatchelfHook` finding, env translation
- `nix-generated-flakes/verification-rerun-w3.md`: red twins for NIX-GEN-02, 04, 05, 16, token and meta censuses, `nix run` measurement
- `nix-generated-flakes/prototype/`: the handoff prototype
- `nix-audit/ocx-index-and-fleet.md`: index wire contract and generator gaps
- `nix-frame.md`: owner defaults Q1 to Q8
- `nix-topic-map.md`: cross-family resolutions E2, E5, E7, E14, E15, E17, E26, E29, E34, E36, E37
- `.claude/artifacts/adr_platform_model_unification.md`: the D1 relation this ADR reuses
- `.claude/artifacts/adr_oci_referrers_signing_v1.md`: signing and verification (A4)
- `.claude/artifacts/adr_index_routing_semantics.md`: `IndexOperation` for the generator's reads

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-09-27 | research-lang Nix program (drafter) | Initial draft from the NIX-GEN consolidation |
