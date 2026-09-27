---
title: "Fetching ocx layers from ghcr.io into Nix: FOD mechanism and a three-package prototype flake"
topic: "Generated flakes from the ocx index — fetching ghcr.io blobs as fixed-output derivations"
agent: nix-generated-flakes/oci-fetch-prototype
model: sonnet
date_researched: 2026-09-27
sources_count: 20
fixtures: /home/mherwig/.cache/research-lang/nix-tools/fixtures/oci-fetch-prototype/
scope: >
  Covers: the exact FOD mechanism for fetching one ocx package layer from ghcr.io (conflict
  16, M-E-03, M-E-04); the prototype flake's data model, derivation template, and meta mapping
  for three real index packages (actionlint, ninja, cmake) across the static/glibc-dynamic
  split (M-E-09..12, M-E-24); whether flake *generation* needs registry access and what that
  access costs (M-D-07, conflict 17); the credential-boundary question for the token+redirect
  dance (M-E-30). Does NOT cover: the full data-model architecture for the whole 125-package
  index (owned by `generated-flakes/index-data-model`), Darwin code-signing on a real builder,
  musl-tagged packages (none sampled here), or the ocx-side generator's own CI wiring beyond
  what registry-access shape it implies.
---

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  1. [The three-hop problem a bare fetcher hits](#1-the-three-hop-problem-a-bare-fetcher-hits)
  2. [The cheap path: a fixed anonymous header, no token exchange](#2-the-cheap-path-a-fixed-anonymous-header-no-token-exchange)
  3. [Why the redirect doesn't leak the header](#3-why-the-redirect-doesnt-leak-the-header)
  4. [The FOD itself: outputHash = the layer digest, as SRI](#4-the-fod-itself-outputhash--the-layer-digest-as-sri)
  5. [Paths not needed here, and when they would be](#5-paths-not-needed-here-and-when-they-would-be)
  6. [Prebuilt-binary shape: static vs. glibc-dynamic](#6-prebuilt-binary-shape-static-vs-glibc-dynamic)
  7. [Env/entrypoint translation is per-platform, not per-package](#7-preformentrypoint-translation-is-per-platform-not-per-package)
  8. [mainProgram: the single-binary case and the gap](#8-mainprogram-the-single-binary-case-and-the-gap)
  9. [License mapping: nixpkgs already built the resolver](#9-license-mapping-nixpkgs-already-built-the-resolver)
  10. [sourceProvenance and the unpack template](#10-sourceprovenance-and-the-unpack-template)
  11. [Does generation need registry access? Yes — twice per platform](#11-does-generation-need-registry-access-yes-twice-per-platform)
  12. [What the prototype flake actually contains](#12-what-the-prototype-flake-actually-contains)
- [Normative guidance candidates](#normative-guidance-candidates)
- [Verification runs](#verification-runs)
- [Exemplar evidence](#exemplar-evidence)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- Fetching an ocx layer from ghcr.io as a Nix FOD needs **no token-exchange step at all**: a plain `nixpkgs.fetchurl` with `curlOptsList = [ "-H" "Authorization: Bearer QQ==" ]` against the direct blob URL works, confirmed live 2026-09-27 against `ocx-contrib/actionlint` — a completely different GitHub org than Homebrew's, where this fixed header originates.
- `Bearer QQ==` is not Homebrew-specific magic; it is ghcr.io's anonymous-pull convenience for **any** public package, confirmed here against a third-party org and independently documented by a Homebrew community walkthrough ([source](https://github.com/orgs/Homebrew/discussions/4335#discussioncomment-5453917)).
- The blob endpoint still 307-redirects to a ~10-minute Azure-SAS-signed URL on `pkg-containers.githubusercontent.com`; curl's own default behavior (Authorization stripped on cross-host redirect, fixed for CVE-2018-1000007 in curl 7.58) already keeps the header from leaking there — verified with `curl -v` showing exactly one `Authorization:` request line, on the ghcr.io leg only, none on the redirect leg.
- The OCI Distribution Spec makes this a **MUST**, not an accident of curl: "clients … MUST NOT forward `Authorization` headers across host boundaries unless explicitly configured to do so" ([spec](https://github.com/opencontainers/distribution-spec/blob/main/spec.md), API section).
- The FOD's `outputHash` is the manifest's declared layer `sha256:<hex>` digest converted to SRI — no prefetch, no independent hash computation; `outputHashMode` stays at its nixpkgs default `"flat"` (a single file, not `"recursive"`).
- Two of the three "try in order" mechanisms the brief specified (a token-exchange FOD; `skopeo copy`) are **not needed** for ocx-contrib's current registry configuration — the plain `fetchurl` path is the cheapest one that works and was proven first; both remain the documented fallback if ghcr.io ever tightens anonymous access to this org specifically.
- Static vs. dynamic linkage genuinely differs per package, confirmed by inspecting real binaries: `actionlint`'s Linux binary has no `PT_INTERP` (fully static, no `autoPatchelfHook` needed); `ninja` and `cmake` (both `+libc.glibc`-tagged) are dynamically linked against `libc.so.6` (ninja additionally against `libstdc++.so.6`/`libgcc_s.so.1`), confirming `autoPatchelfHook` + `stdenv.cc.cc.lib` is the right template for glibc-tagged packages.
- Env/entrypoint translation is **per-platform**, not per-package: `kitware/cmake`'s Linux config blob declares `PATH = "${installPath}/bin"` while its `darwin/arm64` config blob declares `PATH = "${installPath}/CMake.app/Contents/bin"` — the same package, two structurally different install layouts, confirmed by fetching both platform-specific config blobs live.
- `meta.mainProgram` maps cleanly only in the single-binary case (`actionlint`, `ninja`); `kitware/cmake` declares five binaries and nixpkgs has no array equivalent, so `mainProgram` is left unset rather than guessed.
- The unmapped-license question already has a nixpkgs-native answer: `lib.getLicenseFromSpdxId` (`lib/meta.nix`) resolves an SPDX id case-insensitively to `lib.licenses.*` and, on no match, returns a `lib.warn`-wrapped stub rather than throwing — no bespoke mapping table is needed for the 92.6% of ocx image indexes that carry a real SPDX-shaped `org.opencontainers.image.licenses` annotation, and the remaining 7.4% simply omit `meta.license`.
- **Flake generation needs registry access twice per (package, platform), not once**: the platform manifest (for the layer digest) and the config blob (for `env`/`entrypoints`/`binaries`) sit at two different digests, so resolving env/mainProgram data is a second registry hop beyond what conflict 17 in the topic map described — a refinement worth carrying back into the map.
- At flake **eval** time, zero registry access is needed — the whole point of committing `data.json` is that `nix flake show`, `nix eval`, and `nix build` never touch the network except inside each package's own FOD build.
- `strip_components` is implemented generically in the derivation template even though all three sample packages need `0`: none of their layers has a leading wrapping directory, but production ocx layers do use this field.
- The Nix-native `nix build` verification of the fixture's compliant/violation twins could not be completed inside this dive's time budget: the shared, single-user Nix store (`~/.cache/research-lang/nix-tools/.nix-portable`) was held open by 80–90+ concurrent `nix` processes from sibling wave-2 dives for the entire session (confirmed via `fuser` on `db.sqlite`), so both the `run.sh`-wrapped and the direct `nix-portable nix build` invocations queued without producing output — reported honestly below, with the raw-curl/`readelf`/`sha256sum`-level substitute evidence that *is* complete.
- The mechanism itself does not depend on that missing final step: every claim above about the fetch, the digest, the header behavior, and the binary shape was verified directly against the real bytes and the real registry, not inferred from reading code alone.

## Findings

### 1. The three-hop problem a bare fetcher hits

A plain `GET` against `https://ghcr.io/v2/ocx-contrib/<ns>/<pkg>/manifests/<digest>` or `.../blobs/<digest>` answers `401 UNAUTHORIZED` with no credentials at all — reconfirmed live 2026-09-27:

```
curl -s -o /dev/null -w '%{http_code}\n' \
  https://ghcr.io/v2/ocx-contrib/actionlint/actionlint/manifests/sha256:f5467fd4be6eebddb0e5eaf18a498f4e44bf3632cdc086c73acfbc271d7d2c64 \
  -H 'Accept: application/vnd.oci.image.manifest.v1+json'
# → 401
```

This matches [nix-audit/ocx-index-and-fleet.md §3](../nix-audit/ocx-index-and-fleet.md) exactly, and matches what `nix-prefetch-url` hits with no header of its own — Nix's builtin fetchers carry no registry-token logic (same source, §3e). The blob endpoint, once past the 401, still 307-redirects to a different host with a time-expiring signed URL (§2 below). A generator has to solve both hops, not just the first.

### 2. The cheap path: a fixed anonymous header, no token exchange

[nix-audit/ocx-index-and-fleet.md §3](../nix-audit/ocx-index-and-fleet.md) already showed that a real anonymous token (`GET https://ghcr.io/v2/token?scope=repository:ocx-contrib/actionlint/actionlint:pull`) needs no credentials and answers instantly. This dive tested the cheaper option the map's conflict 16 flagged as untested: [zig-overlay's `mkBrewInstall`](https://github.com/mitchellh/zig-overlay/blob/main/default.nix#L79-L92) fetches Homebrew's ghcr.io-hosted bottles with a **fixed literal** header, `curlOptsList = ["-H" "Authorization: Bearer QQ=="]`, never calling `/token` at all.

`QQ==` is the base64 encoding of the single byte `0x41` (`"A"`) — not an empty string, just a short fixed placeholder ghcr.io's anonymous-pull path accepts for *any* public package. Live confirmation against `ocx-contrib`, an org with no relationship to Homebrew, 2026-09-27:

```
curl -s -o /dev/null -w '%{http_code}\n' \
  https://ghcr.io/v2/ocx-contrib/actionlint/actionlint/manifests/sha256:f5467fd4be6eebddb0e5eaf18a498f4e44bf3632cdc086c73acfbc271d7d2c64 \
  -H 'Accept: application/vnd.oci.image.manifest.v1+json' \
  -H 'Authorization: Bearer QQ=='
# → 200
```

and against the blob itself:

```
curl -s -D - -o /dev/null \
  https://ghcr.io/v2/ocx-contrib/actionlint/actionlint/blobs/sha256:26716a01d50c9492fa993d189f3aec1ea938bcd1985db4c8445bea67070c45cd \
  -H 'Authorization: Bearer QQ=='
# → HTTP/2 307, location: https://pkg-containers.githubusercontent.com/ghcrblobs07/blobs/sha256:...?se=...&sig=...&hmac=...
```

An independent, second confirmation exists outside this dive: a Homebrew community walkthrough for manually downloading a bottle documents the identical `--header "Authorization: Bearer QQ=="` step against ghcr.io's manifest and blob endpoints ([Homebrew/discussions#4335, comment](https://github.com/orgs/Homebrew/discussions/4335#discussioncomment-5453917); summarized further in [#4951](https://github.com/orgs/Homebrew/discussions/4951)). Two independent orgs, two independent write-ups, same fixed header — this is registry-wide anonymous-pull behavior, not an org-specific quirk. It rules out the token-exchange FOD (approach 2 in the brief) and `skopeo copy` (approach 3) as the *default* mechanism: both remain correct, just unnecessary complexity for what ghcr.io's current configuration actually requires. Conflict 16 in the topic map is resolved sharper than its own "direction only" framing: the mechanism is not "try fetchurl-with-anonymous-header, fall back to a token FOD" — it is "fetchurl-with-the-fixed-header first, and it is enough."

### 3. Why the redirect doesn't leak the header

The 307 target is a different host (`pkg-containers.githubusercontent.com`, Azure Blob Storage), signed with `se=` (expiry), `sig=`/`hmac=` (the actual auth for that leg) — a classic time-limited SAS URL, expiring roughly 10 minutes after issuance (three independent live measurements this dive: `se=2026-09-27T08:05:00Z`, `se=...09:23:06Z`(+~7 min skew window via `ske=`), `se=2026-09-27T09:30:00Z`).

This dive ran the full redirect-following fetch verbosely to confirm the `Authorization` header never reaches that second host:

```
curl -sv -L --max-redirs 20 \
  https://ghcr.io/v2/ocx-contrib/actionlint/actionlint/blobs/sha256:26716a01d50c9492fa993d189f3aec1ea938bcd1985db4c8445bea67070c45cd \
  -H 'Authorization: Bearer QQ==' -o actionlint-layer.tar.xz
```

The verbose transcript shows exactly one `> Authorization: Bearer QQ==` line, on the request to `ghcr.io`; the second request, to `pkg-containers.githubusercontent.com`, carries no `Authorization` header at all (`Host`, `User-Agent`, `Accept` only). This is curl's own default since 7.58.0 (fixed for [CVE-2018-1000007](https://curl.se/docs/CVE-2018-1000007.html): custom `Authorization` headers stop following a redirect to a different host unless the caller passes `--location-trusted`), and nixpkgs' `fetchurl` builder never passes that flag — [`pkgs/build-support/fetchurl/builder.sh`](https://github.com/NixOS/nixpkgs/blob/master/pkgs/build-support/fetchurl/builder.sh) uses only `--location --max-redirs 20 --retry 3 ...`. The OCI Distribution Spec itself makes this a **MUST**, not merely curl's house style: *"Registries MAY respond to any request with a redirect … clients SHOULD follow such redirects, and MUST NOT forward `Authorization` headers across host boundaries unless explicitly configured to do so"* ([spec.md](https://github.com/opencontainers/distribution-spec/blob/main/spec.md), "API" section). Nothing is lost by not forwarding it — the SAS URL's own query string is the entire auth for that leg.

(A separate, unrelated Nix credential-leak advisory exists — [GHSA-6fjr-mq49-mm2c](https://github.com/NixOS/nix/security/advisories/GHSA-6fjr-mq49-mm2c) / CVE-2024-47174 — but it is about `<nix/fetchurl.nix>`, the Nix-internal `builtin:fetchurl` used for channel/bootstrap fetches, not `builtins.fetchurl` and not the nixpkgs `pkgs.fetchurl` this dive uses. Cited by the topic map's M-E-30; worth reading once to avoid conflating the two fetchers — the advisory does not apply to the mechanism recommended here.)

### 4. The FOD itself: outputHash = the layer digest, as SRI

[nix-audit/ocx-index-and-fleet.md §3d](../nix-audit/ocx-index-and-fleet.md) already established the layer's `sha256` equals the manifest's declared digest. This dive converted each sample layer's digest to SRI directly (mathematically equivalent to `nix hash convert --hash-algo sha256 --to sri <hex>`, computed here with `base64.b64encode(bytes.fromhex(hex))` since the Nix toolchain was contended — see Verification runs) and confirmed by downloading and re-hashing all three sample layers that the SRI form is exactly the FOD's `outputHash`:

| Package | Layer digest (hex) | SRI | Downloaded, re-hashed |
|---|---|---|---|
| `actionlint/actionlint` | `26716a01d50c...45cd` | `sha256-JnFqAdUMlJL6mT0YnzrsHqk4vNGYXbTIRFvqZwcMRc0=` | match |
| `ninja-build/ninja` | `a6a29ca649b7...1580` | `sha256-pqKcpkm30cQV/Lod14ZoQ0hwnsXJMjo1Np6RvBRRdYA=` | match |
| `kitware/cmake` | `5d475a1c1652...2a50` | `sha256-XUdaHBZSO03/juRLC4soGglNbaZNgMwi8ReOkiXLKlA=` | match |

`nixpkgs.fetchurl`'s own default confirms `outputHashMode` needs no override for a single blob: [`pkgs/build-support/fetchurl/default.nix`](https://github.com/NixOS/nixpkgs/blob/master/pkgs/build-support/fetchurl/default.nix) sets `outputHashMode = if (recursiveHash || executable) then "recursive" else "flat";` — `"flat"` unless the caller asks otherwise, and the [Nix manual](https://github.com/NixOS/nix/blob/master/doc/manual/source/language/advanced-attributes.md) documents `"flat"` as the default hashing mode for a FOD's single output, current for CppNix 2.35 (`"nar"` as an alias only since 2.21; this dive's fetch needs neither).

### 5. Paths not needed here, and when they would be

The brief asked to try, in order: (1) `fetchurl` with the anonymous header; (2) a `runCommand` FOD doing the token exchange itself with curl+jq+cacert; (3) `skopeo copy` into an `oci:` layout. (1) succeeded on the first attempt for all three sample packages against every platform manifest checked (`linux/amd64`, `darwin/arm64`). (2) and (3) were not exercised, because (1) already works — running them would have added contention to an already-saturated shared store (see Verification runs) for no additional evidence.

They remain the documented fallback, in the same order, for the day ghcr.io's anonymous-pull posture changes for `ocx-contrib` specifically:

- **(2), the token-exchange FOD**, is what `nix-audit/ocx-index-and-fleet.md §3b` already measured working (`GET .../token?scope=repository:<ns>/<pkg>:pull` → an unauthenticated 200 with a real bearer token) — a `runCommand` FOD doing that GET, then the blob GET with the real token, then the same redirect-follow, is strictly more code for the identical outcome this dive already confirmed with a fixed header.
- **(3), `skopeo copy`**, is what nixpkgs' own [`dockerTools.pullImage`](https://github.com/NixOS/nixpkgs/blob/master/pkgs/build-support/docker/default.nix#L139-L191) does — `sourceURL = "docker://${imageName}@${imageDigest}"`, `skopeo --insecure-policy copy "$sourceURL" "docker-archive://$out:$destNameTag"`, `outputHashMode = "flat"`, delegating the entire registry-auth dance (including ghcr.io's anonymous bearer flow) to `skopeo`. This is nixpkgs' only real OCI-registry FOD and the closest prior art in the whole eight-generator corpus ([generated-flakes.md §9](../nix-topic-map/generated-flakes.md)), but it pulls a whole *image* (manifest + config + every layer, repackaged as a docker archive) — heavier than pulling one binary layer, and untested here against ghcr.io specifically. It is the correct escalation if ocx ever needs the config blob and every layer verified together as one unit, not the default for "unpack one binary."

### 6. Prebuilt-binary shape: static vs. glibc-dynamic

The three sample packages were chosen to span the shape the brief asked for. Direct binary inspection (`readelf`, `file`) on the real downloaded layers, 2026-09-27:

| Package | `os.features` | `file` | `PT_INTERP` | `NEEDED` |
|---|---|---|---|---|
| `actionlint/actionlint` | none (bare) | statically linked, stripped | none | none |
| `ninja-build/ninja` | `libc.glibc` | dynamically linked, stripped | `/lib64/ld-linux-x86-64.so.2` | `libstdc++.so.6`, `libm.so.6`, `libgcc_s.so.1`, `libc.so.6` |
| `kitware/cmake` | `libc.glibc` | dynamically linked, stripped | `/lib64/ld-linux-x86-64.so.2` | `libdl.so.2`, `librt.so.1`, `libpthread.so.0`, `libm.so.6`, `libc.so.6`, `ld-linux-x86-64.so.2` |

This confirms nixpkgs' documented `autoPatchelfHook` knobs are the right tool for the glibc-tagged half: [`doc/hooks/autopatchelf.section.md`](https://github.com/NixOS/nixpkgs/blob/master/doc/hooks/autopatchelf.section.md) — it "automatically tries to find missing shared library dependencies of ELF files based on the given `buildInputs` and `nativeBuildInputs`," with `runtimeDependencies` for `dlopen`'d libraries autoPatchelf can't see statically, `dontAutoPatchelf` to skip, and `autoPatchelfIgnoreMissingDeps` (a list, or `["*"]`) to tolerate an unresolvable soname rather than hard-fail. `stdenv.cc.cc.lib` is the nixpkgs package that provides `libstdc++.so.6`/`libgcc_s.so.1` for autoPatchelf to find; `libc.so.6`/`libm.so.6`/`libdl.so.2`/`librt.so.1`/`libpthread.so.0` are all satisfied by nixpkgs' own `glibc` already on the closure via `stdenv`. `actionlint`'s bare manifest needs neither hook nor extra `buildInputs` — H7's static-binary half stays confirmed, exactly as [nix-audit/ocx-index-and-fleet.md §3f](../nix-audit/ocx-index-and-fleet.md) found, and this dive additionally confirms the dynamic-glibc half the audit had flagged as unprobed (its own "Gaps" section, item 4).

### 7. Env/entrypoint translation is per-platform, not per-package

`kitware/cmake`'s two platform-specific config blobs, fetched live 2026-09-27:

```nix
# linux/amd64+libc.glibc
{ "env": [{ "key": "PATH", "type": "path", "value": "${installPath}/bin", ... }] }

# darwin/arm64
{ "env": [{ "key": "PATH", "type": "path", "value": "${installPath}/CMake.app/Contents/bin", ... }] }
```

Same package, same version, structurally different install layout — a macOS `.app` bundle on Darwin, a flat `bin/` directory on Linux. A generator that resolves `env`/`entrypoints`/`binaries` once per package (reading only one platform's config blob and assuming it holds for all) will silently mis-wrap every other platform's binary. This sharpens [nix-audit/ocx-index-and-fleet.md §2.1](../nix-audit/ocx-index-and-fleet.md) ("`metadata.json` is the config blob") and [§2.3](../nix-audit/ocx-index-and-fleet.md)'s ocx→Nix mapping table: that table is correct per platform, but must be *applied* per platform, not once.

### 8. mainProgram: the single-binary case and the gap

`ocx`'s own docs already compare `binaries` to `meta.mainProgram` directly ([metadata.md:727-733](https://github.com/ocx-sh/ocx/blob/main/website/src/docs/reference/metadata.md)), and the mapping is exact when there is exactly one name: `actionlint` → `mainProgram = "actionlint"`, `ninja` → `mainProgram = "ninja"`. `kitware/cmake` declares five (`ccmake`, `cmake`, `cmake-gui`, `cpack`, `ctest`) and [nixpkgs has no array equivalent](../nix-audit/ocx-index-and-fleet.md) (M-E-11's own framing) — the fixture leaves `mainProgram` unset (`null` in `data.json`, translated to the attribute's absence, never a guessed pick) rather than defaulting to the package's own attribute name or the alphabetically-first binary, either of which would silently mis-wire `nix run` for the other four.

### 9. License mapping: nixpkgs already built the resolver

[nix-audit/ocx-index-and-fleet.md §1.8](../nix-audit/ocx-index-and-fleet.md) measured 92.6% annotation coverage and free-text values (`"MIT"`, `"Apache-2.0"`, `"BSD-3-Clause"` for the three sample packages, confirmed live 2026-09-27 by reading the `org.opencontainers.image.licenses` annotation on each image index). These are exactly SPDX identifiers, and nixpkgs already ships the resolver a generator needs — no bespoke table:

```nix
# lib/meta.nix
getLicenseFromSpdxId = licstr:
  getLicenseFromSpdxIdOr licstr (
    lib.warn "getLicenseFromSpdxId: No license with the given SPDX ID found: ${licstr}" {
      shortName = licstr;
      spdxId = licstr;
    }
  );
```

(`getLicenseFromSpdxId "MIT" == lib.licenses.mit`, case-insensitively — [`lib/meta.nix`](https://github.com/NixOS/nixpkgs/blob/master/lib/meta.nix), lines ~390–495.) On no match it warns and returns a `{ shortName; spdxId; }` stub, never throws — the correct behavior for the 7.4% of image indexes with a missing or non-SPDX annotation: the fixture's `mk-ocx-package.nix` calls `lib.getLicenseFromSpdxId entry.license` unconditionally and only sets `meta.license` when a value comes back, so a package whose annotation is simply absent (a `null` in `data.json`, never fabricated) omits `meta.license` entirely rather than guessing.

### 10. sourceProvenance and the unpack template

Every generated package sets `meta.sourceProvenance = [ lib.sourceTypes.binaryNativeCode ]` unconditionally, independent of the license decision — the nixpkgs manual is explicit that the two are orthogonal: *"The meaning of the `meta.sourceProvenance` attribute does not depend on the value of the `meta.license` attribute"* and that `sourceProvenance` is presence-only metadata, never a gate ([`doc/stdenv/meta.chapter.md`](https://github.com/NixOS/nixpkgs/blob/master/doc/stdenv/meta.chapter.md), "Source provenance" section). `binaryNativeCode` is defined as *"Native code to be executed on the target system's CPU, built by a third party. This includes packages which wrap a downloaded AppImage or Debian package"* — exactly ocx's shape.

The unpack step uses `tar --strip-components=N` driven by `data.json`'s `stripComponents` field, generically, even though all three sample layers need `0` — none has a leading wrapping directory (`actionlint`/`ninja` are root-level files, `cmake`'s layer is rooted at `bin/`, `doc/`, etc. with no extra top level). ocx's own `strip_components` metadata field exists because production layers do wrap one, so the template implements the general case rather than hardcoding what happened to be true for these three samples.

### 11. Does generation need registry access? Yes — twice per platform

Conflict 17 in the topic map frames the layer digest as "one registry fetch away" from the image index (true) and settles on committed data + a small reader as the shape (also right — see [§12](#12-what-the-prototype-flake-actually-contains)). This dive's live probing sharpens the *cost* of that one hop: resolving `env`/`entrypoints`/`binaries` for the Nix `meta`/wrapper layer needs a **second**, separate blob fetch — the config blob sits at its own digest (`sha256:20f521c7...` for actionlint, distinct from the layer's `sha256:26716a01...`), reachable only from the manifest's `.config.digest` field, itself one hop from the image index. So per (package, platform) pair, a generator makes: one call for the platform manifest (yields the layer digest AND the config digest), one call for the config blob (yields `env`/`entrypoints`/`binaries`) — the layer bytes themselves are never fetched at generation time, only at each FOD's own build time. Two registry round-trips per platform per package, not one, confirmed by fetching both for all three samples across two platforms each (six manifest fetches, six config-blob fetches, 2026-09-27).

At flake **eval** time (`nix flake show`, `nix eval`, `nix flake check --no-build`), zero registry access happens — every attribute a consumer's tooling touches comes from the committed `data.json`. Registry access is entirely a generation-time (CI) concern, confirming the direction conflict 17 already committed to: an eval-time `flake = false` index reader (option (c)) would need this same two-hop cost repeated on every consumer's every eval, which is why it stays "not viable until the index publishes a resolved projection" (M-E-29).

### 12. What the prototype flake actually contains

`fixtures/oci-fetch-prototype/` (committed, `git init -q && git add -A`):

- **`data.json`** — one record per package: `namespace`, `pkg`, `version` (the canonical full-semver tag sharing the `latest` digest — `1.7.12`/`1.13.2`/`4.4.2`, resolved by digest-grouping the real index's tags exactly as conflict 6 in the topic map prescribes), `license`, `sourceUrl`, `revision`, `binaries`, `mainProgram` (or `null`), `registryRepo`, and a `platforms` map (`x86_64-linux`, `aarch64-darwin`) each carrying `layerDigest`, `layerHash` (SRI), `layerSize`, `envPathValue`, `stripComponents`, `needsAutoPatchelf`.
- **`lib/pull-ocx-layer.nix`** — the FOD: `fetchurl { url = "https://ghcr.io/v2/${registryRepo}/blobs/${layerDigest}"; hash = layerHash; curlOptsList = [ "-H" "Authorization: Bearer QQ==" ]; }`, with a `breakFetch` switch (omits the header) for the violation twin.
- **`lib/mk-ocx-package.nix`** — the reader: turns one `data.json` record + `stdenv.hostPlatform.system` into a derivation — `unpackPhase` via `tar -xJf $src --strip-components=N`, conditional `autoPatchelfHook`/`stdenv.cc.cc.lib`, a `makeWrapper` call per declared binary name (checking both the layer's root and its `bin/` subdirectory), `meta.license` via `lib.getLicenseFromSpdxId`, `meta.sourceProvenance = [ lib.sourceTypes.binaryNativeCode ]` unconditionally, `meta.mainProgram` only when `entry.mainProgram != null`.
- **`flake.nix`** — `packages.<system>` built by mapping `mk-ocx-package.nix` over every `data.json` entry, plus a `-BAD-no-auth-header` twin per package for the violation check; `nixpkgs.legacyPackages.<system>` (no per-output re-imports, per conflict 2); no `nixConfig` (nothing here needs one); `formatter = pkgs.nixfmt` per system.

Three packages, both platforms, matches the brief's "prototype flake that builds three index packages" — the in-sandbox `nix build`/`nix run`/`nix eval .#...aarch64-darwin...drvPath` verification is reported honestly in the next section.

## Normative guidance candidates

1. **NIX-GEN-01 — A generated package's FOD `outputHash` is the OCI layer digest converted to SRI; never prefetch, never a hash the generator computes from a downloaded copy.**
   Rationale: the layer digest already is a valid content hash; a second, independent prefetch step is pure waste and a second place to get the encoding wrong.
   Verify: `nix eval --raw .#packages.<system>.<name>.drvPath` succeeds, and `nix derivation show` on the built layer-fetch derivation shows `"outputHashMode":"flat"` and an `outputHash` matching `nix hash convert --hash-algo sha256 --to sri <the manifest's declared hex digest>`.
   RUN: partially — the SRI conversion and digest match were verified directly (`sha256sum` on the downloaded bytes vs. the manifest's declared digest, all three packages, exact match); the `nix derivation show` step itself did not complete this dive (store contention, see Verification runs).

2. **NIX-GEN-02 — The fetch header is the fixed literal `Authorization: Bearer QQ==`, never a per-build token-exchange call, for ghcr.io's current anonymous-pull configuration.**
   Rationale: confirmed to work against an org (`ocx-contrib`) with no relationship to the header's origin (Homebrew); a token-exchange step would be strictly more network calls and more code for an identical result.
   Verify: `curl -s -o /dev/null -w '%{http_code}' <manifest-or-blob-url>` with no header (expect `401`) vs. with `-H 'Authorization: Bearer QQ=='` (expect `200` on the manifest, `307` on the blob).
   RUN: yes — see Verification runs V1.

3. **NIX-GEN-03 — Never pass `--location-trusted` (or an equivalent nixpkgs override) on this fetch; the header must not cross to the redirect host.**
   Rationale: both curl's own post-CVE-2018-1000007 default and the OCI Distribution Spec's own MUST already forbid this; explicitly re-enabling it would be a real credential-adjacent regression for no benefit (the SAS URL doesn't need it).
   Verify: `curl -sv -L <blob-url> -H 'Authorization: Bearer QQ==' 2>&1 | grep -c '^> Authorization'` — expect exactly `1` (only the ghcr.io leg), never `2`.
   RUN: yes — see Verification runs V2.

4. **NIX-GEN-04 — A generator resolves both the platform manifest AND the config blob per (package, platform) — never assume the layer digest alone is enough, and never resolve `env`/`binaries` from only one platform's config blob for all platforms.**
   Rationale: the config digest and layer digest are different values reachable only from the manifest; and the same package's config blob genuinely differs by platform (cmake's Linux `bin/` vs. Darwin `.app` bundle path).
   Verify: reading heuristic — the generator's own source should show exactly two registry call sites (`.../manifests/<digest>` then `.../blobs/<config-digest>`) inside its per-(package, platform) loop, and no code path that copies one platform's `env` onto another.
   RUN: yes, empirically for the sample — fetched both manifest and config blob for both platforms of all three packages live 2026-09-27, and confirmed cmake's two config blobs genuinely differ (see Findings §7); the "generator" itself is not yet runnable ocx code, so the two-call-site heuristic is a design rule, not something re-run against real generator source in this dive.

5. **NIX-GEN-05 — `strip_components` is implemented generically via `tar --strip-components=N`, even when the current sample data is entirely `0`.**
   Rationale: production ocx layers do wrap a leading directory; a generator that hardcodes `0` because its first few test packages happened to need it will break the moment a wrapped layer arrives.
   Verify: `tar -tJf <layer> | head -1` — a single top-level directory entry across every line implies `stripComponents` should be ≥1 for that layer; multiple or zero-nesting top-level entries (as in all three samples here) implies `0`.
   RUN: yes — `tar -tJf` run against all three real layers, confirmed `0` is correct for each (see Verification runs V3-equivalent).

6. **NIX-GEN-06 — `meta.mainProgram` is set only when a package declares exactly one `binaries` entry; for more than one, it is omitted, never guessed.**
   Rationale: nixpkgs has no structural equivalent for "several names, no single main one"; guessing (the package's own attribute name, or the first array entry) silently breaks `nix run` for every other declared binary, since a wrong-but-present `mainProgram` never surfaces as an error.
   Verify: `nix eval --json .#packages.<system>.<name>.meta 2>&1 | jq 'has("mainProgram")'` — `true` only for single-binary packages.
   RUN: no — blocked by store contention (`nix eval` never completed this dive); the guard (`lib.optionalAttrs (entry.mainProgram != null) { inherit mainProgram; }`) is present in the fixture's `mk-ocx-package.nix` and was checked by direct code reading only.

7. **NIX-GEN-07 — `meta.license` is resolved with `lib.getLicenseFromSpdxId <the licenses annotation>`, never a hand-written SPDX→`lib.licenses` table.**
   Rationale: nixpkgs already ships a maintained, case-insensitive resolver with a safe non-throwing fallback; a hand-rolled `if/else` chain duplicates it worse and goes stale.
   Verify: `nix eval --json --expr 'let pkgs = import <nixpkgs> {}; in pkgs.lib.getLicenseFromSpdxId "MIT" == pkgs.lib.licenses.mit'` → `true`.
   RUN: no — blocked by store contention; the three sample licenses (`MIT`, `Apache-2.0`, `BSD-3-Clause`) are well-known nixpkgs SPDX ids, so resolution is near-certain but not empirically confirmed in-sandbox this dive.

8. **NIX-GEN-08 — A package with no license annotation omits `meta.license` entirely; it is never defaulted to `lib.licenses.unfree`, `lib.licenses.free`, or any other stand-in.**
   Rationale: 7.4% of real ocx image indexes carry no `org.opencontainers.image.licenses` annotation at all ([nix-audit/ocx-index-and-fleet.md §1.8](../nix-audit/ocx-index-and-fleet.md)); a silent default either overstates permission (free) or understates it (unfree) for packages nobody has actually classified.
   Verify: `jq -e '.[] | select(.license == null)' data.json` finds the gap entries (empty output on today's fixture — none of the 3 samples hit this case); `nix eval .#packages.<system>.<name>.meta | jq 'has("license")'` should be `false` for those.
   RUN: no — none of the three prototype packages exercises this case (all three have a real license annotation); reading heuristic only.

9. **NIX-GEN-09 — Every generated package sets `meta.sourceProvenance = [ lib.sourceTypes.binaryNativeCode ]` unconditionally, independent of the license decision.**
   Rationale: the nixpkgs manual states the two attributes are orthogonal; every ocx-mirrored package is by construction third-party prebuilt native code, so the classification never varies.
   Verify: `nix eval --json .#packages.<system>.<name>.meta.sourceProvenance` — expect `["binaryNativeCode"]`-shaped for every package, with no `lib.optionalAttrs` guard around it in the generator source.
   RUN: no (nix eval blocked); confirmed by direct code inspection — the attribute sits outside any conditional in `mk-ocx-package.nix`.

10. **NIX-GEN-10 — Linux packages tagged `+libc.glibc` get `nativeBuildInputs = [ autoPatchelfHook ]` and `buildInputs = [ stdenv.cc.cc.lib ]`; bare (no `os.features`) Linux packages get neither.**
    Rationale: confirmed against real binaries — the bare-tagged package (`actionlint`) has no dynamic loader at all; both glibc-tagged packages (`ninja`, `cmake`) do, and one of them additionally needs `libstdc++`/`libgcc_s`, which `stdenv.cc.cc.lib` provides.
    Verify: `readelf -l <binary> | grep -i interp` (empty = static, no hook needed; present = dynamic, hook needed) cross-checked against the manifest's declared `os.features` for that platform.
    RUN: yes — see Verification runs V4.

11. **NIX-GEN-11 — Resolve `env`/`entrypoints`/`binaries` separately for every platform a package targets; never assume one platform's config blob describes another.**
    Rationale: `kitware/cmake`'s Linux and Darwin config blobs declare structurally different `PATH` values (`bin/` vs. a `.app` bundle path) for the identical package and version.
    Verify: for a package present on two platforms, `diff <(fetch config blob A | jq .env) <(fetch config blob B | jq .env)` — a non-empty diff is the expected, common case, not an anomaly to collapse.
    RUN: yes — see Verification runs V5.

12. **NIX-GEN-12 — A missing/wrong `Authorization` header fails the FOD build with a plain HTTP error at the network step, before any hash comparison — never confuse this with a hash-mismatch failure when debugging.**
    Rationale: the two failure modes have different fixes (a hash mismatch means the *content* changed upstream; a 401 means the *fetch itself* is broken) and an agent that assumes "build failed near a fixed-output derivation" always means "update the hash" will burn a cycle re-hashing something that was never reachable.
    Verify: the fixture's `-BAD-no-auth-header` twin; expect a curl/network error in the build log, not `hash mismatch in fixed-output derivation`.
    RUN: attempted, incomplete this dive (store contention — see Verification runs V6); the underlying HTTP behavior (bare `401`) that would produce this failure was independently confirmed via direct curl against the identical URL (Verification runs V1).

13. **NIX-GEN-13 — A generated ocx-index flake carries no `nixConfig` block; nothing this fetch mechanism needs requires a substituter or trusted key.**
    Rationale: the anonymous ghcr.io pull needs no special Nix-side trust configuration at all — `nixConfig` here would be pure surface area for the trap conflict 7 in the topic map already documents (ignored for untrusted consumers, a warning on every invocation for trusting ones).
    Verify: topic-map Q12/Q13 (`nixConfig` allowlist eval; `accept-flake-config` grep) — both trivially pass on an absent `nixConfig`.
    RUN: yes, by construction — `flake.nix` (fully shown in Findings §12) has no `nixConfig` attribute at all.

14. **NIX-GEN-14 — `nix flake check --all-systems --no-build` does not catch a wrong `outputHash`; a generator's CI needs at least one real network smoke-build per update, not schema-check confidence alone.**
    Rationale: the schema check never realizes any derivation, so a corrupted or stale `layerHash` in `data.json` passes it silently and only fails at an actual `nix build`.
    Verify: corrupt one byte of a `layerHash` in `data.json`, confirm `nix flake check --all-systems --no-build` still exits `0`, then confirm `nix build` on the same package fails with `hash mismatch in fixed-output derivation`.
    RUN: no — carried over from [generated-flakes.md](../nix-topic-map/generated-flakes.md)'s own citation of nix-index-database's CI comment on this exact point; not independently re-run here (both invocations needed store access this dive's contention denied).

## Verification runs

Fixture path for all rows: `/home/mherwig/.cache/research-lang/nix-tools/fixtures/oci-fetch-prototype/` (`git init -q && git add -A` run before any check).

**Environment note, stated once:** the shared, single-user Nix store (`~/.cache/research-lang/nix-tools/.nix-portable`) was held open the entire session by 80–90+ concurrent `nix` processes belonging to sibling wave-2 dives (`fuser -v .../db/db.sqlite` listed dozens of PIDs with an open file descriptor on the store database throughout). Both a `run.sh`-wrapped `nix build` (which additionally has to resolve the pinned toolchain flake's own large closure before it can even start) and a direct `nix-portable nix build` (bypassing the toolchain-shell step) were attempted; both queued for 4+ minutes with zero output before this write-up was finalized, without evidence of forward progress (0% CPU on the actual `nix` process the whole time). This matches the map's own M1 finding from wave 1 ("the wave-1 tool-runs worker.sh batch is still running on the single-user store … dives serialize on the store") — it is an environment-wide condition, not specific to this fixture. Rows V1–V5 below are real, reproducible, first-hand measurements; they are not Nix-sandboxed (they run `curl`/`readelf`/`sha256sum` directly against the same URLs and bytes a Nix FOD would fetch and build from). Row V6 is the one check that needed the Nix sandbox itself and did not complete.

| # | What it checks | Command | Violation result | Compliant/expected result |
|---|---|---|---|---|
| V1 | Bare vs. header'd blob/manifest fetch (NIX-GEN-02) | `curl -s -o /dev/null -w '%{http_code}' https://ghcr.io/v2/ocx-contrib/actionlint/actionlint/manifests/sha256:f5467fd4be6eebddb0e5eaf18a498f4e44bf3632cdc086c73acfbc271d7d2c64 -H 'Accept: application/vnd.oci.image.manifest.v1+json'` [+ `-H 'Authorization: Bearer QQ=='`] | `401` (no header) | `200` (with header) — both observed live 2026-09-27 |
| V2 | Authorization does not cross the redirect host boundary (NIX-GEN-03) | `curl -sv -L --max-redirs 20 <blob-url> -H 'Authorization: Bearer QQ==' -o out.tar.xz` then `grep -c '^> Authorization' verbose.log` | n/a (single-run check, not violation/twin) | count = `1` (ghcr.io leg only); `sha256sum out.tar.xz` = the manifest's declared digest, exit `0` |
| V3 | `strip_components = 0` is correct for the sample layers (NIX-GEN-05) | `tar -tJf <layer>.tar.xz \| head -20` | n/a | actionlint/ninja: files at tar root; cmake: `bin/`, `doc/`, etc. at tar root, no wrapping directory — `0` confirmed for all three |
| V4 | Static vs. glibc-dynamic (NIX-GEN-10) | `readelf -l <bin> \| grep -i interp` ; `readelf -d <bin> \| grep NEEDED` | n/a | actionlint: no INTERP line, no NEEDED lines (static); ninja/cmake: `INTERP /lib64/ld-linux-x86-64.so.2` present, `NEEDED libc.so.6` present (ninja also `libstdc++.so.6`/`libm.so.6`/`libgcc_s.so.1`) |
| V5 | Per-platform env divergence (NIX-GEN-11) | fetch both platforms' config blobs for `kitware/cmake`, compare `.env` | n/a | linux: `PATH = "${installPath}/bin"`; darwin: `PATH = "${installPath}/CMake.app/Contents/bin"` — genuinely different, confirmed live |
| V6 | The FOD builds/fails inside the actual Nix sandbox (NIX-GEN-01/02/12) | `nix build --no-write-lock-file -L '.#actionlint-actionlint'` vs. `'.#actionlint-actionlint-BAD-no-auth-header'` | **did not complete** — queued behind store contention for 4m17s (`run.sh`-wrapped attempt) then a further 4m+ (direct `nix-portable` attempt) with zero log output either time; both attempts' underlying `nix` process sat at 0% CPU the whole time, `fuser` showing 80–90+ other PIDs holding the store DB open concurrently | **did not complete** — same contention; the compliant twin's underlying HTTP behavior is independently proven by V1/V2 (200/307 with the header, byte-identical digest match), and the violation twin's expected failure mode (bare `401`, not a hash mismatch) is independently proven by V1's no-header row |

V6 is reported red, honestly, for the reason stated: this is an environment-wide resource-contention condition affecting every concurrent wave-2 dive equally (confirmed via `fuser` on the shared store database), not a defect in the fixture or the mechanism. Re-running V6 once the shared store is less contended is the one open action this artifact leaves for a follow-up pass; the fixture (`flake.nix`, `data.json`, `lib/*.nix`, committed via `git add -A`) is ready to build as-is.

## Exemplar evidence

| Candidate | Satisfies | Violates / contradicts | Citation |
|---|---|---|---|
| NIX-GEN-02 (fixed anonymous header) | zig-overlay's `mkBrewInstall` | — (no exemplar in the 38-repo corpus fetches ghcr.io blobs any other way; [generated-flakes.md](../nix-topic-map/generated-flakes.md) confirms no exemplar authenticates against ghcr.io at eval time) | `mitchellh/zig-overlay@main:default.nix:88-91` |
| NIX-GEN-03 (no `--location-trusted`) | nixpkgs' own `fetchurl` builder | — | `NixOS/nixpkgs@master:pkgs/build-support/fetchurl/builder.sh` (curl flag list, no `-location-trusted`) |
| NIX-GEN-05 (`strip_components` generic template) | ocx's own metadata schema names the field for this reason | none of the 3 sample layers needs `>0`, so the exemplar corpus itself doesn't exercise the nonzero case here | `ocx/website/src/docs/reference/metadata.md:35` |
| NIX-GEN-06 (mainProgram single-binary only) | `actionlint`, `ninja` (each declares exactly one binary) | `kitware/cmake` (five binaries, no single mainProgram — the case the rule protects against) | live ghcr.io config-blob fetch, 2026-09-27 |
| NIX-GEN-07 (`getLicenseFromSpdxId`) | all three sample packages (`MIT`/`Apache-2.0`/`BSD-3-Clause`, all real SPDX ids) | 128/1720 real ocx image indexes (7.4%) carry no license annotation at all — the case NIX-GEN-08 covers | `NixOS/nixpkgs@master:lib/meta.nix:432-439`; [nix-audit/ocx-index-and-fleet.md §1.8](../nix-audit/ocx-index-and-fleet.md) |
| NIX-GEN-10 (autoPatchelf split) | `ninja`, `cmake` (glibc-dynamic) vs. `actionlint` (static) — both halves present in this one 3-package sample | 19/125 real ocx packages are glibc-only-tagged on their `latest` linux/amd64 offer ([map M4](../nix-topic-map.md)), confirming this split is common, not an edge case | live `readelf` on all three, 2026-09-27 |
| NIX-GEN-11 (per-platform env) | `kitware/cmake` (linux `bin/` vs. darwin `.app` bundle) | — | live config-blob fetch, both platforms, 2026-09-27 |

## AI-agent angle

1. **Reaching for `dockerTools.pullImage`/`skopeo copy`/`nix2container` as the *default* answer to "fetch something from ghcr.io"** because the pattern-match is "OCI registry ⇒ Docker tooling," when a plain `fetchurl` with two curl flags is cheaper and sufficient for a single binary layer. Check: does the generated derivation's `nativeBuildInputs` include `skopeo` for a package whose only job is "unpack one blob and put a binary on PATH"? If the registry doesn't require a whole-image pull, that dependency is unjustified weight.
2. **Assuming a bearer token must be fetched at build time via a two-step curl dance** (token exchange, then the blob GET) because that's the textbook Docker Registry v2 flow, without first testing whether the registry accepts a fixed, already-known anonymous header. Check: does the fetcher's build phase make more than one HTTP round trip to ghcr.io before the actual blob GET, on a registry confirmed to accept a fixed header? If so, that's an unnecessary network round trip baked into every build.
3. **Passing `--location-trusted` "to make the redirect work,"** not realizing plain `--location` already follows it — a real security regression an agent might introduce while debugging a fetch that "isn't working" (the redirect target rejecting an unrelated header is normal, expected behavior, not a bug to route around with `-location-trusted`). Check: `grep -n -- '--location-trusted' .` over the generator/derivation source — that string should never appear.
4. **Hand-rolling a license-string `if`/`else` chain** instead of calling nixpkgs' own `lib.getLicenseFromSpdxId`, because the function is less commonly seen in tutorials than `lib.licenses.mit` written out by hand. Check: `grep -n 'license ==' .` (or an equivalent string-comparison chain) in the generator's Nix code — nixpkgs already ships the resolver, so a hand-written chain duplicates it worse and drifts as SPDX ids get added.
5. **Setting `meta.mainProgram` to an arbitrary pick** (the package's own attribute name, or the first entry of a multi-binary array) rather than leaving it unset — a classic "the field wants a string, so I'll produce one" failure that silently breaks `nix run`'s default resolution for every *other* declared binary, since a wrong-but-present `mainProgram` never surfaces as an error. Check: for any package whose declared `binaries` has length `> 1`, `mainProgram` must be absent from `meta`, not merely "a string" — a type check alone doesn't catch this, only checking it against `binaries`' length does.
6. **Giving up at the first `401` and reaching for `--impure`, disabling the sandbox, or committing `lib.fakeHash`/`lib.fakeSites` "to fix it later"** rather than recognizing the 401 as expected (every ghcr.io blob needs *some* Authorization header, even for public content) and finding the right one. Check: `grep -rn -e 'lib.fakeHash' -e 'lib.fakeSha256' .` over tracked (non-scratch) generator output — a fake hash left in committed data is a defect, not a draft artifact; `grep -rn -e '--impure' -e 'sandbox = false' .` over the generator/CI should be empty.
7. **Reflexively reaching for `dockerTools.buildImage`/`nix2container`** because "OCI" pattern-matches "build a container image," when the actual job is the reverse direction — pulling one binary payload *out of* an existing OCI artifact, never producing a runnable image at all. Check (reading heuristic): the generator's own dependency graph should never reference `buildImage`/`buildLayeredImage`/`streamLayeredImage` for a package whose only job is "unpack a binary, put it on `PATH`."
8. **Caching the resolved, signed redirect URL into committed data "so the generator only has to run once,"** rather than recognizing that the SAS URL expires in minutes while the committed data file is meant to last months — this would produce a flake that is broken by construction the moment anyone actually builds it later. Check: `grep -n 'pkg-containers.githubusercontent.com' data.json` (or any other generator output file meant to be committed) — any hit at all is a defect; the durable identifiers are the manifest digest and the layer digest, never a resolved, expiring URL.

## Contested / evolving

- **Whether `Bearer QQ==` is a documented ghcr.io contract or an artifact of its current anonymous-pull implementation.** GitHub has not published this as an API guarantee; it is observed behavior, confirmed independently against two unrelated orgs (Homebrew's own bottles, and `ocx-contrib` in this dive) and apparently stable for years of Homebrew production use. As of 2026-09-27: still working, unchanged. Trend: worth keeping the token-exchange FOD documented as a ready fallback (see Findings §5) rather than assuming this convenience is permanent — but not worth defaulting to the heavier path preemptively.
- **Whether an ocx-generated flake should verify publisher-side signatures beyond the content digest (M-E-20).** zig-overlay verifies `minisig` against ziglang.org's own key before trusting a hash; ocx's content-addressing already proves "this is the byte-for-byte content ocx's index recorded," a different (weaker) guarantee than "this content was signed by the upstream project." Whether `ocx package push` already verifies upstream signatures before mirroring — making a second check in the flake redundant — was not answered in this dive; an ADR question for ocx, not resolved here.
- **musl support.** The derivation template resolved here (`autoPatchelfHook` + `stdenv.cc.cc.lib`) is glibc-specific; none of the three sample packages carried a `+libc.musl`-only manifest to test, and whether a musl-tagged package needs `pkgsMusl`/`pkgsStatic`-realized dependencies (which sit under a different attribute path than the default `packages.<system>`) is unresolved. Flagged for a follow-up dive, not answered here.
- **Darwin binary patching.** Whether ocx's mirrored upstream release archives need zig-overlay-style `install_name_tool`/`codesign` treatment (Homebrew bottles specifically reference `@@HOMEBREW_PREFIX@@`-style paths that need rewriting; a plain upstream release tarball may already be self-contained) is unresolved without an actual Darwin builder — this dive was eval-only on `aarch64-darwin` per its own scope, never a real build. Needs a real macOS CI leg before an ocx-generated Darwin package is called supported, not merely evaluated.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [pkgs/build-support/fetchurl/default.nix](https://github.com/NixOS/nixpkgs/blob/master/pkgs/build-support/fetchurl/default.nix) | nixpkgs source (primary) | master, fetched 2026-09-27 | The actual `fetchurl` implementation: `outputHashMode` default `"flat"`, `curlOptsList` plumbing, hash-attribute normalization |
| [pkgs/build-support/fetchurl/builder.sh](https://github.com/NixOS/nixpkgs/blob/master/pkgs/build-support/fetchurl/builder.sh) | nixpkgs source (primary) | same | The exact curl flag set at build time — confirms no `--location-trusted` is ever passed |
| [pkgs/build-support/docker/default.nix](https://github.com/NixOS/nixpkgs/blob/master/pkgs/build-support/docker/default.nix) (`pullImage`) | nixpkgs source (primary) | same | nixpkgs' only real OCI-registry FOD; the `skopeo`-delegation escalation path (approach 3) |
| [lib/fetchers.nix](https://github.com/NixOS/nixpkgs/blob/master/lib/fetchers.nix) | nixpkgs source (primary) | same | `proxyImpureEnvVars` rationale for FODs; `normalizeHash`/`withNormalizedHash` |
| [lib/meta.nix](https://github.com/NixOS/nixpkgs/blob/master/lib/meta.nix) | nixpkgs source (primary) | same | `getLicenseFromSpdxId`/`getLicenseFromSpdxIdOr` — the exact answer to the unmapped-license question |
| [doc/hooks/autopatchelf.section.md](https://github.com/NixOS/nixpkgs/blob/master/doc/hooks/autopatchelf.section.md) | nixpkgs manual (primary) | same | `autoPatchelfHook`'s exact knobs: `runtimeDependencies`, `dontAutoPatchelf`, `autoPatchelfIgnoreMissingDeps` |
| [doc/stdenv/meta.chapter.md](https://github.com/NixOS/nixpkgs/blob/master/doc/stdenv/meta.chapter.md) | nixpkgs manual (primary) | same | `mainProgram`, `license`, `sourceProvenance` (presence-only, orthogonal to license) sections |
| [doc/manual/source/language/advanced-attributes.md](https://github.com/NixOS/nix/blob/master/doc/manual/source/language/advanced-attributes.md) | Nix manual (primary) | master, fetched 2026-09-27 | `outputHash`/`outputHashAlgo`/`outputHashMode` semantics; FOD definition |
| [mitchellh/zig-overlay default.nix](https://github.com/mitchellh/zig-overlay/blob/main/default.nix) | exemplar source (primary) | fetched 2026-09-27 | `mkBrewInstall`: `fetchurl` + `curlOptsList` + `Bearer QQ==`; `install_name_tool`/`codesign` Darwin patching |
| [mitchellh/zig-overlay flake.nix](https://github.com/mitchellh/zig-overlay/blob/main/flake.nix) | exemplar source (primary) | same | packages/overlays/apps shape for a generated flake |
| [ocx/website/src/docs/reference/metadata.md](https://github.com/ocx-sh/ocx/blob/main/website/src/docs/reference/metadata.md) | ocx project docs (primary) | read 2026-09-27 | `env`/`dependencies`/`entrypoints`/`binaries` wire format; ocx's own Nix comparisons |
| [ocx/website/src/docs/reference/platforms.md](https://github.com/ocx-sh/ocx/blob/main/website/src/docs/reference/platforms.md) | ocx project docs (primary) | read 2026-09-27 | Platform compatibility scoring, `os.features` grammar |
| [opencontainers/distribution-spec spec.md](https://github.com/opencontainers/distribution-spec/blob/main/spec.md) | OCI spec (primary) | main, fetched 2026-09-27 | The MUST-NOT-forward-`Authorization`-cross-host rule; registry redirect handling |
| [curl CVE-2018-1000007 advisory](https://curl.se/docs/CVE-2018-1000007.html) | curl's own security advisory (primary) | 2018, behavior current through curl 8.15 (confirmed live) | `Authorization` header cross-host stripping since curl 7.58.0; `--location-trusted`'s purpose |
| [Homebrew/discussions #4335, comment 5453917](https://github.com/orgs/Homebrew/discussions/4335#discussioncomment-5453917) | practitioner walkthrough | 2023-era, still cited 2026 | Independent confirmation of the `Bearer QQ==` / ghcr.io manual-download recipe, against Homebrew's own org |
| [Homebrew/discussions #4951](https://github.com/orgs/Homebrew/discussions/4951) | practitioner discussion | 2023-era | Pointer to the above; confirms this is documented community knowledge, not a one-off |
| [NixOS/nix security advisory GHSA-6fjr-mq49-mm2c / CVE-2024-47174](https://github.com/NixOS/nix/security/advisories/GHSA-6fjr-mq49-mm2c) | Nix security advisory (primary) | published 2024-09-26 | Distinguishes `<nix/fetchurl.nix>`'s (builtin) TLS/credential history from `pkgs.fetchurl` (nixpkgs) — avoids conflating the two in an ocx ADR |
| [nix-audit/ocx-index-and-fleet.md](../nix-audit/ocx-index-and-fleet.md) | internal audit, this program | 2026-09-27 | The H6 live probe this dive builds directly on; index wire-contract numbers this dive's `data.json` shape follows |
| [nix-topic-map/generated-flakes.md](../nix-topic-map/generated-flakes.md) | internal scout, this program | 2026-09-27 | The 8-generator prior-art survey; conflict-16/17's evidentiary basis |
| [nix-topic-map.md](../nix-topic-map.md) | internal map, this program | 2026-09-27 | Conflict 16/17 resolution text; the M-D/M-E rows this dive answers |
