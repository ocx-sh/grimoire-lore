---
title: ocx index wire contract, package format, and fleet flake-readiness — a numbers-first audit
agent: nix-audit/ocx-index-and-fleet
model: sonnet
scope: >
  /home/mherwig/dev/index (index.ocx.sh checkout), /home/mherwig/dev/ocx
  (website/src/docs + crates/), one live H6 probe against ghcr.io for
  ocx-contrib/actionlint, and four fleet repos (ocx, grimoire,
  ocx-sdk-python, setup-ocx) for flake-readiness.
method: >
  jq over every file under /home/mherwig/dev/index/p/ (125 package roots,
  1720 stored image indexes); grep + spot-read over ocx crates/ and
  website/src/docs/; live curl/token/blob probe against ghcr.io/v2 with no
  credentials; find/grep over fleet Cargo.lock, dist-workspace.toml, .github/workflows.
  Every command is inlined next to its result below — copy-paste to re-run.
date_researched: 2026-09-27
---

# ocx index + package format + fleet — numbers-first audit

## Table of contents

- [Headline numbers](#headline-numbers)
- [1. Index wire contract](#1-index-wire-contract)
- [2. The ocx package format](#2-the-ocx-package-format)
- [3. H6 probe: ghcr.io blob fetching, live](#3-h6-probe-ghcrio-blob-fetching-live)
- [4. Fleet repos that could ship a flake](#4-fleet-repos-that-could-ship-a-flake)
- [5. Gaps for an ocx-index flake generator](#5-gaps-for-an-ocx-index-flake-generator)
- [Smells (ranked)](#smells-ranked)
- [Patterns worth encoding](#patterns-worth-encoding)
- [Contradictions of the frame](#contradictions-of-the-frame)
- [Gaps](#gaps)

## Headline numbers

| Metric | Value |
|---|---|
| Packages in the index (`p/<ns>/<pkg>.json`) | **125**, across **99** namespace dirs |
| Stored OCI image indexes (`p/**/o/sha256/*.json`) | **1720** |
| Tags per package | min **4**, median **13**, mean **23.9**, max **135** (`bazelbuild/bazel`) |
| Tags whose digest is shared with another tag in the same package | **56.7%** (1692/2985) |
| `status` values observed | **100% `active`** (schema also allows `deprecated`, `yanked` — unused) |
| `root.schema.json`'s `variants` field, populated | **0/125** — field exists, bot-derived, never non-empty in this corpus |
| Platform combos across all image indexes | **10** distinct `{os,arch[,os.features]}` shapes over 9115 entries |
| Image indexes with `os.features` on **some** linux platform, vs. bare-only | 665 files (31 distinct packages) vs. 1170 files (104 distinct packages) — **12 packages appear in both sets** (same package, different releases, inconsistent tagging over time) |
| `artifactType` across every stored index | **100%** `application/vnd.sh.ocx.package.v1` (1720/1720) |
| Annotation key coverage | `org.opencontainers.image.source` 98.3%, `.revision` 97.2%, `.licenses` 92.6% — **no `mainProgram`-equivalent key anywhere** |
| H6 (ghcr.io needs a bearer token even anonymously) | **CONFIRMED** — 401 bare, 200 with anonymous token; blob itself 307-redirects to an Azure-SAS-signed, time-expiring URL on a different host |
| Fleet repos with a Rust workspace | 2/4 (`ocx`, `grimoire`); `ocx-sdk-python` is pure Python (zero native deps declared); `setup-ocx` is pure TypeScript/bun |
| `-sys` crates in `ocx`'s Cargo.lock | **17** (incl. `aws-lc-sys`, `zstd-sys`, `liblzma-sys`, `clang-sys`) |
| `-sys` crates in `grimoire`'s Cargo.lock | **10** (incl. `aws-lc-sys`; no compression/clang `-sys` crates) |
| Both `ocx` and `grimoire` release via | `dist-workspace.toml` (cargo-dist), GitHub-hosted, `.tar.gz`/`.zip` archives, `cargo-auditable` + `cargo-cyclonedx` SBOM |

## 1. Index wire contract

Checkout: `/home/mherwig/dev/index`. Docs read: `README.md`, `CLAUDE.md`, `.claude/rules/product-context.md`, `schema/*.schema.json`, `catalog.config.json`.

### 1.1 Wire shapes (from `product-context.md`)

Four frozen URL shapes, `format_version`-gated: `/config.json`, `/p/<ns>/<pkg>.json` (root: governance + `tags` map), `/p/<ns>/<pkg>/o/sha256/<hex>.json` (verbatim OCI image index), `/c/index.json` (enumeration: `ns/pkg → sha256(root)`, added 2026-07-17). Desc blobs (`o/sha256/<hex>.{md,svg,png}`) share the CAS convention but the product-context doc itself flags their frozen-contract status as **unresolved** (`product-context.md:` the desc-blob paragraph, unannotated in `plan_index_v1.md`'s Wire Format block).

### 1.2 Package + tag counts

```
find p -maxdepth 1 -type d | wc -l                              # → 99 (namespace dirs, includes p/ itself so 98 real)
find p -maxdepth 2 -name '*.json' | wc -l                        # → 125 (package roots)
find p -path '*/o/sha256/*.json' | wc -l                         # → 1720 (stored image indexes)
```

Tags per package (`jq '.tags|length'` over all 125 roots, sorted):

```
find p -maxdepth 2 -name '*.json' -exec jq '.tags|length' {} \; | sort -n \
  | awk '{a[NR]=$1;s+=$1} END{print "n="NR" min="a[1]" max="a[NR]" median="a[int((NR+1)/2)]" mean="s/NR}'
# → n=125 min=4 max=135 median=13 mean=23.88
```

Extremes: `bazelbuild/bazel` (135 tags, 83 unique digests), `astral-sh/uv` (111 tags, 58 unique), `github/cli` (86, 31 unique) at the high end; `direnv/direnv`, `elvish/elvish`, `lychee/lychee` at 4–5 tags, 1–2 unique digests, at the low end.

### 1.3 Tag shapes

```
find p -maxdepth 2 -name '*.json' -exec jq -r '.tags|keys[]' {} \; > /tmp/alltags.txt   # 2985 lines
grep -cE '^[0-9]+\.[0-9]+\.[0-9]+$'              /tmp/alltags.txt   # full semver
grep -cE '^[0-9]+\.[0-9]+$'                      /tmp/alltags.txt   # minor float
grep -cE '^[0-9]+$'                              /tmp/alltags.txt   # major float
grep -c  '^latest$'                              /tmp/alltags.txt   # latest
grep -cE '^[0-9]+\.[0-9]+\.[0-9]+_[0-9]{8}$'      /tmp/alltags.txt   # semver + observed-date suffix
```

| Shape | Count | Share |
|---|---|---|
| Full semver `x.y.z` | 1224 | 41.0% |
| `x.y.z_YYYYMMDD` (semver + mirror-observed date) | 907 | 30.4% |
| Minor float `x.y` | 480 | 16.1% |
| Major float `x` | 147 | 4.9% |
| `latest` | 125 | 4.2% (exactly one per package, as expected) |
| Other | 102 | 3.4% |

"Other" (102) spot-read and classified: 36 are variant-prefixed (`slim-*` 25, `server-*` 4, `client-*` 4, plus the 3 bare `slim`/`server`/`client` rolling tags) on `python-build-standalone`-style packages; the remaining 66 are non-`YYYYMMDD` build suffixes — `amazon/corretto`'s `8.0.504_1001` (vendor build number, not a date) and `jdx/mise`'s full-timestamp `0.5.8_20260811122328`. **False-positive check on the "other" bucket**: read 3 hits (`slim-3.14.7_20260814`, `8.0.504_1001`, `0.5.8_20260811122328`) — all three are genuine non-conforming-to-the-four-buckets tags, not a regex miss; 0% false positive.

### 1.4 Digest sharing (aliasing)

```
find p -maxdepth 2 -name '*.json' -exec jq -r \
  '[.name, (.tags|length), (.tags|[.[].content]|unique|length)] | @tsv' {} \; \
  > /tmp/digest_sharing.tsv
awk -F'\t' '{t+=$2;u+=$3} END{print t, u, (t-u)/t}' /tmp/digest_sharing.tsv
# → 2985 1293 0.566834
```

**56.7% of all tags point at a digest some other tag in the same package already points at** — i.e. more than half of published tags are pure aliases (a minor/major/`latest` float pointing at the same content as a full-semver tag). This is the mechanism behind H1's "tag proliferation" concern from the ocx side, and it is exactly the shape a flake generator's version-resolution logic must collapse (see §5).

### 1.5 Status values

```
find p -maxdepth 2 -name '*.json' -exec jq -r '.status' {} \; | sort | uniq -c
# → 125 active
```

`root.schema.json`'s `status` enum also allows `deprecated` and `yanked` — **0 occurrences of either** in the corpus measured 2026-09-27. `superseded_by` (a root-schema optional property) — 0 occurrences too (`jq -e 'has("superseded_by")'` over all 125 → 0 true).

### 1.6 `variants` field

`root.schema.json`'s `$defs` documents `variants` as "Bot-derived, never human-set: a pure projection of `tags`... enforced by `check_variants_match_tags`". Measured:

```
find p -maxdepth 2 -name '*.json' -exec jq -e 'has("variants")' {} \; 2>/dev/null | grep -c true
# → 0
```

Despite 36 tags in §1.3 being variant-prefixed (`slim-*` etc.), **no package root's `variants` array is populated**. Either the derivation hasn't run over this corpus yet, or the variant-prefixed tags predate the field. A flake generator cannot use `variants` to discover multi-variant packages today — it has to re-derive variant prefixes from `tags` keys itself, the same grammar the bot uses.

### 1.7 Image-index platforms

```
find p -path '*/o/sha256/*.json' -exec jq -c '.manifests[]?.platform // empty' {} \; \
  | sort | uniq -c | sort -rn
```

| Platform (os/arch[+features]) | Count |
|---|---|
| darwin/arm64 | 1549 |
| darwin/amd64 | 1427 |
| windows/amd64 | 1339 |
| linux/amd64 (bare) | 1164 |
| linux/arm64 (bare) | 1111 |
| windows/arm64 | 852 |
| linux/arm64 + `libc.glibc` | 654 |
| linux/amd64 + `libc.glibc` | 607 |
| linux/amd64 + `libc.musl` | 221 |
| linux/arm64 + `libc.musl` | 191 |

9115 platform entries total across 1720 indexes (mean 5.3 platforms/index). No `variant` (armv7-style) entries anywhere in this corpus — every entry is a bare `{os, arch}` or `{os, arch, os.features}` pair.

**Same-(os,arch), two-manifest phenomenon** (spot-read: `astral-sh/ruff`): a single image index can list **both** a bare `linux/amd64` manifest *and* a separate `linux/amd64+libc.glibc` manifest, at two different content digests, in the same index. This is not a bug — it is documented, intentional scoring behavior (`ocx/website/src/docs/reference/platforms.md:154-172`, "Scoring": a bare offer satisfies any glibc/musl host, a feature-tagged offer wins for a host that has that feature; ties are refused, exit 65). A flake/derivation generator must implement this **directed compatibility relation**, not a naive `(os,arch)` key lookup — see §5.

### 1.8 `artifactType` and annotation keys

```
find p -path '*/o/sha256/*.json' -exec jq -r '.artifactType' {} \; | sort | uniq -c
# → 1720 application/vnd.sh.ocx.package.v1   (100%, no variance)

find p -path '*/o/sha256/*.json' -exec jq -r '.annotations|keys[]?' {} \; | sort | uniq -c | sort -rn
```

| Annotation key | Count | Coverage |
|---|---|---|
| `org.opencontainers.image.source` | 1691 | 98.3% |
| `org.opencontainers.image.revision` | 1672 | 97.2% |
| `org.opencontainers.image.licenses` | 1592 | 92.6% |

No per-manifest annotations anywhere (`jq -r '.manifests[]?.annotations//empty|keys[]?'` → empty output for all 1720 files) — annotations are index-level only. **128 indexes (7.4%) carry no license annotation at all** — a Nix `meta.license` cannot be filled from the index for those. No key resembling `mainProgram`, `homepage`, or `description` exists at the OCI-annotation layer; those live only in the package-root's `desc` block (title/description/keywords/readme/logo, §2) or inside the per-platform config blob's `metadata.json` (`binaries` array — only fetchable per-platform, from the registry, not from the index).

## 2. The ocx package format

Docs read: `ocx/website/src/docs/reference/metadata.md` (1151 lines), `platforms.md`, `ocx/website/src/docs/in-depth/storage.md` (377 lines). Crates cited: `ocx_package`, `ocx_oci`.

### 2.1 `metadata.json` — the config blob

Top-level: `type` (must be `"bundle"`), `version` (must be `1`), `strip_components`, `env[]`, `dependencies[]`, `entrypoints{}`, `binaries[]`, `integrations{}` (`ocx/website/src/docs/reference/metadata.md:31-40`).

**`env` entries** (`metadata.md:106-404`): `key`, `type` (`path`|`constant`|`list`), `value` template, `visibility` (`private`|`public`|`interface`, default `private`). `path` prepends to the existing var; `constant` replaces; `list` appends with a required `separator` and de-dups by exact-string re-declaration. Interpolation is a **closed** `${…}` namespace — `${installPath}` / `${self.installPath}` (exact alias) / `${self.env.KEY}` (env-only, forward-reference refused) / `${deps.NAME.installPath}` — each taking an optional `:native`/`:posix` render modifier; an unrecognized token is refused at exit 65, never passed through (`metadata.md:129-274`). Implementation: `ocx_package/src/metadata/template.rs:202` (`resolve`), `:218` (`resolve_without_existence_checks`); env struct at `ocx_package/src/metadata/env.rs:38`.

**`dependencies`**: digest-pinned in published form, tag-only allowed in the authoring sidecar (`ocx package create --platform` resolves and rewrites in place). Pin must reference a platform **manifest**, never an image index — index digests get GC'd the moment a new platform is pushed (`metadata.md:406-485`). Visibility is a two-axis struct (`private`, `interface`) with four named constants (`sealed`/`private`/`public`/`interface`) — doc explicitly maps this onto Nix: *"`public`/`interface` are the same shape [as] `propagatedBuildInputs`... `private` is the OCX equivalent of plain `buildInputs`"* (`metadata.md:563-576`).

**`entrypoints`**: object keyed by invocable name; `{}` = name dispatches itself; `command` overrides the dispatch target; `args[]` bakes fixed leading argv (`${installPath}` interpolated per-element, `${deps.*}`/`${self.env.*}` rejected). OCX **generates** a `.sh` launcher (POSIX) or `.exe`+`.shim` pair (Windows) per entry at install time (`metadata.md:603-691`).

**`binaries`**: unverified, publisher-declared array of bare executable names on the interface `PATH` — explicitly compared to npm `bin`, Cargo `[[bin]]`, and **nixpkgs' `meta.mainProgram`** in the docs themselves (`metadata.md:727-733`). `None` vs `[]` are distinct wire states (undeclared vs. "publisher asserts zero").

**`os.features` / libc tagging** (`metadata.md:1021-1054`): `libc.glibc` / `libc.musl` are the two defined values; a static binary carries neither ("the absent or empty set matches every Linux host"). Implementation: `ocx_oci/src/host_capabilities.rs:188` (`enum LibcFlavor`), `:768` (`LIBC_FAMILY` table), lint enforcement in `ocx_package/src/libc_lint.rs` (refuses a Linux platform whose `os.features` don't cover what the packaged binary's dynamic loader needs, exit 65).

**Platform compatibility relation** — implementation matches docs exactly: `ocx_oci/src/platform.rs:416` `pub fn is_compatible(required, offered)`:
```rust
// offered.os_features ⊆ required.os_features (inverted: offer declares what it demands)
offered_os_features.iter().all(|feature| required_os_features.contains(feature))
```
Scoring: `Specific` beats `Any`; among `Specific`, more matched features win; a tie is refused (exit 65), never guessed (`platforms.md:154-172`).

### 2.2 Storage / install mechanics (`in-depth/storage.md`)

`~/.ocx/{packages,layers,blobs,index,toolchain,state,symlinks,temp,locks}/`. Packages are content-addressed by SHA-256 (`packages/{registry}/sha256/{2hex}/{30hex}/{content/, entrypoints/, metadata.json, refs/}`) — doc's own words: **"Similar to the Nix store and Git objects... the path is a function of the content"** (`storage.md:100-102`). Layers are extracted once and hardlinked into each package's `content/` (pnpm/Docker-layer analogy, `storage.md:120-141`). GC is back-reference-counted (`refs/symlinks/`, `refs/deps/`), not mark-and-sweep from roots the way Nix's is. Stable paths are two symlink levels: `candidates/{tag}` (pinned) and `current` (floating, explicit `select`) — SDKMAN/Homebrew/`update-alternatives` analogy (`storage.md:203-245`).

### 2.3 ocx concept → Nix derivation mapping

| ocx concept | Where defined | Nix equivalent |
|---|---|---|
| `env` (`path` type) | `metadata.md:275-299`, `env.rs:38` | `makeWrapper --prefix VAR : "$out/bin"` (or plain `$out` in a derivation's own env for build-time) |
| `env` (`constant` type) | `metadata.md:301-321` | `makeWrapper --set VAR value`, or a derivation-time env var |
| `env` (`list` type, dedup-by-value) | `metadata.md:323-353` | `makeWrapper --prefix VAR ":"` idiom already dedups by prefix membership at shell level; ocx's re-append-moves-to-back has no direct wrapper equivalent — would need a small script |
| `dependencies` (`sealed`) | `metadata.md:517-532` | `buildInputs` (content on disk, not in env) |
| `dependencies` (`public`/`interface`) | same | `propagatedBuildInputs` — doc says so itself |
| `entrypoints` (generated launcher) | `metadata.md:603-691` | a `bin/<name>` wrapper script `makeWrapper` emits, or `writeShellScriptBin` |
| `binaries` claim | `metadata.md:693-836` | `meta.mainProgram` (single) / nothing structural for a multi-binary claim — nixpkgs has no array equivalent |
| platform `os.features` libc tag | `platforms.md`, `host_capabilities.rs:188` | `stdenv.hostPlatform.libc` (`"glibc"`/`"musl"`) — same binary distinction, opposite direction (Nix picks the derivation set, ocx picks the manifest at install time) |
| static binary, no `os.features` | `metadata.md:1036` | no `autoPatchelfHook` needed; a dynamic glibc/musl binary needs it (H7 territory — not probed live here, see Gaps) |
| content-addressed `packages/{sha256}/` | `storage.md:69-102` | `/nix/store/{hash}-name/` — explicitly analogized in ocx's own docs |
| `current`/`candidates` symlinks | `storage.md:203-245` | Nix profile generations / `nix-env` symlink switching, or a flake's `apps.default` |
| digest-pinned dependency (never an index digest) | `metadata.md:461-485` | a flake input pinned by `rev`/`narHash`, never a floating branch |

## 3. H6 probe: ghcr.io blob fetching, live

Package: `ocx.sh/actionlint/actionlint`, tag `latest` → index digest `sha256:743656e5…` → `linux/amd64` manifest digest `sha256:f5467fd4be6eebddb0e5eaf18a498f4e44bf3632cdc086c73acfbc271d7d2c64`.

**(a) Bare manifest fetch, no auth:**
```
curl -s -w '%{http_code}' https://ghcr.io/v2/ocx-contrib/actionlint/actionlint/manifests/sha256:f5467fd4… \
  -H 'Accept: application/vnd.oci.image.manifest.v1+json'
# → {"errors":[{"code":"UNAUTHORIZED","message":"authentication required"}]}  HTTP 401
```

**(b) Anonymous token, then retry:**
```
curl -s 'https://ghcr.io/token?scope=repository:ocx-contrib/actionlint/actionlint:pull'
# → {"token":"djE6b2N4LWNvbnRyaWIvYWN0aW9ubGludC9hY3Rpb25saW50OjE3OTA0OTU3MDE3NDEwMzUzNTk="}
# (retry with `-H "Authorization: Bearer $TOKEN"`) → HTTP 200, manifest body:
#   config: sha256:20f521c7…, size 155
#   layers[0]: application/vnd.oci.image.layer.v1.tar+xz, sha256:26716a01…, size 1951640
```
No GitHub credentials of any kind were used — the anonymous-scope token is issued to anyone.

**(c) Blob fetch, redirect behavior (no `-L`):**
```
curl -sD - -o /dev/null https://ghcr.io/v2/ocx-contrib/actionlint/actionlint/blobs/sha256:26716a01… -H "Authorization: Bearer $TOKEN"
# → HTTP/2 307
#    location: https://pkg-containers.githubusercontent.com/ghcrblobs07/blobs/sha256:26716a01…
#      ?se=2026-09-27T08%3A05%3A00Z&sig=dul6c93%2BLlVmhk9…&sr=b&sv=2025-01-05&hmac=…
```
Redirect target is a **different host** (`pkg-containers.githubusercontent.com`, Azure Blob Storage), signed with `se=` (expiry, ~10 minutes out from request time), `sig=`/`hmac=` (HMAC signature) — a classic time-limited SAS URL. Same shape for the config blob.

**(d) Digest verification:**
```
curl -sL … -o actionlint-layer.tar.xz && sha256sum actionlint-layer.tar.xz
# → 26716a01d50c9492fa993d189f3aec1ea938bcd1985db4c8445bea67070c45cd   (exact match to the manifest's declared digest)
```

**(e) `nix-prefetch-url`, no token, against the ghcr.io URL directly:**
```
nix-prefetch-url --name actionlint-layer.tar.xz https://ghcr.io/v2/ocx-contrib/actionlint/actionlint/blobs/sha256:26716a01…
# → error: unable to download …: HTTP error 401
#    response body: {"errors":[{"code":"UNAUTHORIZED","message":"authentication required"}]}
```
Confirms the ocx-frame prediction verbatim: a plain Nix fetcher hits the same bare-401 wall `curl` did in (a). Nix's builtin fetchers carry no bearer-token exchange step.

**(f) Layer contents and binary:**
```
tar -tJf actionlint-layer.tar.xz | head -30    # → LICENSE.txt, README.md, actionlint, docs/*, man/actionlint.1  (13 entries total)
file actionlint  # (after tar -x)
# → ELF 64-bit LSB executable, x86-64, statically linked, Go BuildID=…, stripped
readelf -l actionlint | grep -i interp   # → (nothing — no PT_INTERP; static, no dynamic loader)
```

**What H6 turns out to be**: **confirmed, and sharper than the hypothesis text**. It is not merely "needs a bearer token" — the token step is the *easy* half (an anonymous-scope token needs no secret and is a single unauthenticated GET). The harder half is that the actual bytes live behind a **307 redirect to a different, SAS-signed, expiring URL** — so even a generator that resolves the token once cannot cache a static blob URL into a Nix expression; the URL is dead within roughly the `se=` window (~10 min observed here). A working fixed-output fetcher needs to run the full token-exchange-then-redirect dance *inside* the derivation's build (impure network, permitted under an FOD's known-hash sandbox exception) — nixpkgs already has exactly this shape in `dockerTools.pullImage`/`skopeo`-based fetchers for OCI registries generally; that is the closest existing prior art, not a plain `fetchurl`. actionlint itself, being a static Go binary with no `os.features` (confirmed by (f) — no PT_INTERP, matches the doc's "static binary carries no os.features" rule from §2.1), sidesteps the H7 `autoPatchelfHook` question entirely; a dynamic-glibc package (e.g. `astral-sh/ruff`, `kitware/cmake`) was not probed live and remains open (see Gaps).

## 4. Fleet repos that could ship a flake

`ocx-sdk-python` and `setup-ocx` both present; none of the four is missing.

| Repo | Language / shape | Native deps | Release today | What `nix run github:ocx-sh/<repo>` needs | Hardest part |
|---|---|---|---|---|---|
| **ocx** | Rust workspace, `resolver="3"`, `members=["crates/*"]`, 2 bin crates (`ocx`, `ocx-shim`), `build.rs` in `ocx_cli` | 17 `-sys` crates in `Cargo.lock`: `aws-lc-sys`, `zstd-sys`, `liblzma-sys`, `libbz2-rs-sys`, `linux-raw-sys`, `clang-sys`, `windows-sys`, `jni-sys`/`js-sys`/`web-sys` (wasm-adjacent, likely transitive), `core-foundation-sys`/`security-framework-sys`/`system-configuration-sys` (macOS) | `dist-workspace.toml` (cargo-dist 0.31.0), GH-hosted, targets incl. `*-unknown-linux-{gnu,musl}` both arches + `*-apple-darwin` + `*-pc-windows-msvc`; post-announce jobs push to `docker-publish`, `post-release-oci-publish`, `deploy-website-release`; `cargo-auditable`+`cargo-cyclonedx` | `buildRustPackage` with `OPENSSL_NO_VENDOR`-style handling for `aws-lc-sys` (needs a C/asm toolchain — `aws-lc-sys` builds its own BoringSSL-derived C code) and a real reason for `clang-sys` (bindgen-shaped dep, likely from a transitive crate — worth tracing before assuming a plain buildRustPackage "just works") | `aws-lc-sys` + `clang-sys` — both want `libclang`/`cc` at build time inside the sandbox; the workspace's own cross-compile story (Windows shim via `cargo-zigbuild`, `rust-toolchain.toml`) is *itself* a second, parallel hermetic-build system a flake would either wrap or bypass |
| **grimoire** (`grim`) | Single-crate Rust binary, `edition="2024"`, 1 bin (`grim`, `default-run`) | 10 `-sys` crates: `aws-lc-sys`, `linux-raw-sys`, `windows-sys` (×3 dep edges), `jni-sys`/`js-sys`/`web-sys`, `core-foundation-sys`/`security-framework-sys` — **no** compression/`clang-sys` entries | `dist-workspace.toml` (cargo-dist 0.33.0), installers `["shell","powershell"]`, same 8-target matrix as ocx; post-announce publishes to its own OCX registry + republishes the catalog | `buildRustPackage`, same `aws-lc-sys` build-time C dependency, otherwise plain | Only `aws-lc-sys` — smaller surface than `ocx` |
| **ocx-sdk-python** | `pyproject.toml`, `requires-python=">=3.12"`, `dependencies=[]` (zero runtime deps declared) | None — pure Python, no native extension | `uv.lock` present; no `.github/workflows` release inspected here (not requested to go further given zero native deps) | `buildPythonApplication` / `python3Packages.buildPythonPackage`, trivial | Nothing hard — the whole point of probing it was to confirm it has *no* `-sys` surface, and it doesn't |
| **setup-ocx** | GitHub Action, TypeScript + bun (`bun.lock`, `bunfig.toml`), `esbuild` bundler, `@actions/*` deps only | None — reimplements libc detection itself (`src/setup.ts`, `src/project.ts`, `src/constants.ts` all reference `glibc`/`musl`/a `libc` CLI input) rather than shelling out to ocx | `.github/workflows/release.yml`; `dist/` checked in (bundled JS, the standard GH-Action pattern) | Not really a Nix consumer target (it *is* CI glue, runs inside GitHub Actions' own Node runtime) — a flake would at most offer a `devShell` for its own bun/TS toolchain | N/A — flagged mainly because it independently reimplements the exact glibc/musl detection logic ocx's Rust code already has (`host_capabilities.rs`), a duplicate-knowledge smell, not a packaging problem |

```
grep -c '^name = ".*-sys"' Cargo.lock                 # ocx: 17, grimoire: 10
grep -A20 '^\[workspace\]' Cargo.toml                  # ocx: resolver="3", members=["crates/*"]
find crates/*/Cargo.toml -exec grep -l '^\[\[bin\]\]' {} \;   # ocx_cli, ocx_shim
cat rust-toolchain.toml                                # both pin channel = "1.95.0"
cat dist-workspace.toml                                # both: [dist] cargo-dist-version, targets[], ci="github"
```

## 5. Gaps for an ocx-index flake generator

- **No stable, unsigned blob URL.** The index gives a manifest digest; the manifest gives a layer digest; but the *bytes* are only reachable through the token+307-redirect dance in §3, and the redirect URL expires in minutes. Evidence: §3(c)/(e). A generator needs either an FOD that runs the fetch itself, or ocx to publish a stable mirror.
- **No `mainProgram`/binary-name field at the index layer.** `binaries` (the closest analogue, and explicitly compared to `meta.mainProgram` in the docs — `metadata.md:727-733`) lives only in the per-platform config blob, one registry fetch away per platform, never in `p/<ns>/<pkg>.json` or the image index. Evidence: §1.8 (no such annotation key), §2.1 (field's actual location).
- **License coverage is 92.6%, not 100%, and it's free text at the OCI-annotation layer, not the wire-contract root.** `nixpkgs` wants an SPDX-shaped `meta.license`; 128/1720 image indexes (7.4%) have no `org.opencontainers.image.licenses` annotation at all, and the ones that do are unvalidated strings. Evidence: §1.8.
- **The platform-compatibility relation is nontrivial and undocumented in wire form.** The index alone doesn't tell a consumer "prefer the `+libc.glibc` manifest over the bare one for a glibc host" — that logic lives in `ocx_oci/src/platform.rs:416` and would have to be reimplemented (or its output pre-baked) by anything that isn't the ocx client itself, including a flake generator deciding which manifest maps to which Nix `system`. Evidence: §1.7, §2.1.
- **`variants` is schema-ready but empty across the whole corpus.** A generator cannot detect "this package has a slim/server/client split" from the root document today; it must independently re-parse `tags` keys for a `<name>-` prefix, using the same grammar the (unseen, Python-side) bot uses. Evidence: §1.6.
- **Dynamic-libc packages were not probed live.** §3 confirms the token/redirect mechanics and the *static*-binary case (no `autoPatchelfHook` needed); it does not confirm what a `linux/amd64+libc.glibc` manifest's binary actually needs (`autoPatchelfHook`, specific `.so` versions) — H7 remains partially open pending a second live probe against e.g. `astral-sh/ruff` or `kitware/cmake`.
- **`aws-lc-sys`'s and `clang-sys`'s actual build-time system requirements inside the Nix sandbox are unmeasured.** Both appear in `ocx`'s `Cargo.lock` (§4); neither was built inside `nix-tools/run.sh` here (out of scope for this audit — "never `nix build` large packages" applies to compiler-adjacent crates too, and a full `cargo build` wasn't attempted). This is the single largest unknown standing between "ocx has a Rust workspace" and "ocx has a working `nix build`."

## Smells (ranked)

1. **56.7% tag/digest aliasing** (§1.4) means any generator that walks `tags` naively will emit 2–3x more Nix "versions" than there are distinct builds — it must dedup by content digest first, then choose a canonical tag per digest (prefer full-semver over floats/`latest`).
2. **The bare-vs-feature-tagged same-`(os,arch)` duplication** (§1.7) looks like a data-quality bug on first read (two entries, same os/arch, different digest) but is *intentional* scoring behavior per `platforms.md` — a generator naively deduping by `(os,arch)` would silently pick the wrong (less-specific) manifest roughly as often as the right one, with no error surfaced.
3. **`clang-sys` in `ocx`'s dependency tree with no obvious first-party need** (§4) — worth tracing to its actual consumer (likely a transitive `bindgen` user) before assuming a Nix build needs `libclang` in `nativeBuildInputs`; if untraced, this is exactly the kind of native-toolchain surprise that breaks a first `nix build` attempt.
4. **`setup-ocx` reimplements glibc/musl host detection in TypeScript** (§4) that `ocx`'s own Rust `host_capabilities.rs` already implements — duplicate knowledge across the fleet, a smell for the flake-authoring skill to flag rather than a blocker.
5. **The desc-blob path's frozen-contract status is explicitly unresolved by the index repo's own docs** (`product-context.md`, §1.1) — a generator embedding README/logo content from `o/sha256/<hex>.md|svg|png` is building on a documented ambiguity, not a stable contract.

## Patterns worth encoding

- **Content-digest-first, tag-second resolution.** Both ocx (§1.4, §2.1 "Manifest Pins, Never Index Pins") and the generator's own dedup problem (Smell 1) point the same direction: canonicalize on digest, treat tags as labels applied after the fact. A `nix-generated-flakes` depth file should teach exactly this — group by digest, pick one canonical version string per digest group, expose the rest as aliases if at all.
- **ocx's own docs already draw the Nix/Guix comparison for dependency visibility** (`metadata.md:563-576`) and for content-addressed storage (`storage.md:100-102`) — both citations are ready-made "compare with Nix" material for an authoring skill, not something this program needs to invent.
- **`dockerTools.pullImage`-style FOD fetching is the right prior art for H6**, not a plain `fetchurl` — nixpkgs already solves "fetch from an OCI registry, handle the token dance, verify by digest" for the general case; the ocx-specific work is only the `metadata.json`/`entrypoints`/`env` translation layer on top, per the §2.3 mapping table.
- **Platform-string grammar is a genuinely reusable idea**: ocx's `os/arch[/variant][+feature[,feature]]` grammar (`platforms.md:14-101`, with percent-escaping for round-tripping) is structurally close to a Nix `system` string extended with a libc tag — worth a side-by-side in the eventual `nix-generated-flakes` artifact rather than re-deriving the mapping from scratch each time.

## Contradictions of the frame

- **H6 is confirmed, but the frame undersells it.** The hypothesis as written ("ghcr.io serves blobs only behind a bearer token, even anonymously, so a plain `fetchurl` cannot fetch an ocx package layer") is true but incomplete: the harder blocker is the **expiring signed redirect** (§3c), not the token step, which is a single unauthenticated GET. A fixer restricted to "handle the bearer token" would still fail — it also has to handle the redirect happening *inside* the same derivation build, not as a pre-resolved constant.
- **H7 (libc detection → `autoPatchelfHook`/nothing) is only half-checked here.** The static-binary half is confirmed live (actionlint, §3f); the dynamic-glibc half was designed into this audit's scope only as a "pick a small package" step, and actionlint turned out to be static — so H7's harder claim (what a *dynamic* glibc/musl manifest actually needs) is still open, not contradicted or confirmed, despite the live probe running to completion. Flag for the next dive wave: probe `astral-sh/ruff`'s `linux/amd64+libc.glibc` manifest specifically.
- **The frame's `variants` field description (as an existing signal) doesn't hold up against this corpus** — it exists in schema and is well-specified, but is populated in 0/125 packages measured. Any downstream design that assumed `variants` was a live, queryable signal today would be wrong.

## Gaps

- No fleet repo's `Cargo.lock`/`pyproject.toml`/`package.json` was actually built inside the Nix sandbox in this pass (measurement-only per the brief) — `aws-lc-sys`/`clang-sys` build-time behavior under Nix is inferred from crate identity, not observed.
- Only one package (`actionlint`, static Go) was probed live end-to-end; the dynamic-libc case, the multi-layer case (`storage.md`'s "Multi-Layer Packages"), and the zero-layer/config-only case were read about but not exercised against a real registry response.
- `ocx-sdk-python`'s and `setup-ocx`'s own release workflows (`.github/workflows/release.yml` for setup-ocx; none inspected for ocx-sdk-python beyond `pyproject.toml`) were not read in depth — the audit stopped at "confirms no native-dependency surface," per the brief's own per-repo table shape, not at "here is exactly how they cut a release."
- The index's `.claude/artifacts/` ADR set (`adr_locked_observation_index_format.md`, `adr_fork_pr_announce.md`, `adr_enumeration_index.md`, etc.) was read only through `product-context.md`'s summaries, not each ADR body directly — anything in an ADR beyond what `product-context.md` restates is unmeasured here.
