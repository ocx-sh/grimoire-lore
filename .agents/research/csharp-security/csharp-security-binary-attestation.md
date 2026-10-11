---
title: "Verifying the ocx binary beyond sha256: what ocx publishes, what C# can check in-box, what v1 does"
topic: csharp-security-binary-attestation (group: Security; target csharp-quality/security.md; closes PK-12; adds CS-BIN-20..34)
agent: research-lang deep-dive researcher (wave 3)
model: sonnet (Sonnet 5.5)
date_researched: 2026-10-11
sources_count: 29
scope: |
  Covered: the trust chain of the ocx binary today (dist.json, GitHub release assets, OCI packages, Docker image); what ocx's own
  release pipeline publishes (measured against v0.6.5, not assumed); in-box C# verification (ECDsa P-256, Ed25519 availability on
  net8/net10/net11 RC1, Windows host); the managed Sigstore verifier on NuGet (tested against a real ocx attestation); shelling out
  to gh/cosign; pins, rotation, offline, hard-fail; prior art (rustup, nvm, cosign-installer, Python SDK, Aspire CLI).
  Not covered: NuGet package signing of the SDK itself (CS-PKG), consumer-side trustedSigners and SBOM (csharp-security-supply-chain),
  macOS runtime behaviour (no macOS host), a real ocx release key (none exists; the ECDSA fixture uses generated keys).
---

# Verifying the ocx binary beyond sha256

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The trust chain today](#f1-the-trust-chain-today)
   2. [What ocx publishes for itself (measured)](#f2-what-ocx-publishes-for-itself-measured)
   3. [In-box C#: ECDSA P-256 yes, Ed25519 no](#f3-in-box-c-ecdsa-p-256-yes-ed25519-no)
   4. [A managed Sigstore verifier exists, with traps](#f4-a-managed-sigstore-verifier-exists-with-traps)
   5. [Shelling out to gh or cosign](#f5-shelling-out-to-gh-or-cosign)
   6. [The decision: pin in the assembly, verify nothing else at v1](#f6-the-decision-pin-in-the-assembly-verify-nothing-else-at-v1)
   7. [The three delivery models](#f7-the-three-delivery-models)
   8. [Rotation, old SDKs, offline, hard-fail](#f8-rotation-old-sdks-offline-hard-fail)
   9. [Prior art](#f9-prior-art)
   10. [The upstream ask](#f10-the-upstream-ask)
   11. [Verified on the toolchain](#f11-verified-on-the-toolchain)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- **ocx publishes no publisher-verifiable artifact for its binaries today.** The v0.6.5 release has 8 archives, 8 `.sha256` files, `sha256.sum`, `dist-manifest.json` and a CycloneDX SBOM; `gh attestation verify` returns HTTP 404, `gh release verify v0.6.5` says "no attestations for tag", and `setup.ocx.sh/dist.json.minisig` and `.sig` return 404 (F2, F11.1).
- **The digest in `dist.json` proves integrity relative to one origin only.** A forger who controls the manifest host controls the manifest, the URL and the digest; the Python SDK says the same and leaves it open ([www-setup#14](https://github.com/ocx-sh/www-setup/issues/14), open since 2026-08-20).
- **Decision for v1: verify against a digest pin compiled into the SDK assembly, not against a publisher signature.** The pin table (8 triples for `TestedOcxVersion`) moves the trust root from `setup.ocx.sh` to the signed NuGet package that carries the code. Nothing else can be verified yet, because nothing else exists.
- **Generate the pin table by triangulation, never from one source.** For v0.6.5 the `dist.json` row, the release `sha256.sum` line and GitHub's own API asset digest agreed on all 8 archives; one altered line in `sha256.sum` made the gate fail (F11.9).
- **Triangulation defends against a compromised manifest origin or CDN, not against a compromised ocx release pipeline.** Say so in the SDK README; do not call the pin a signature.
- **Ed25519 is not in-box on net8, net10 or 11.0 RC1.** No public Ed25519/EdDSA type exists in `System.Security.Cryptography` on any of the three (reflection probe, F11.5); the API is approved ([dotnet/runtime#63174](https://github.com/dotnet/runtime/issues/63174), 2026-05-05) but only as an OpenSSL-backed type marked unsupported on Windows and macOS.
- **So the upstream ask must be ECDSA P-256, not minisign.** `www-setup#14` proposes minisign (Ed25519); that cannot be verified in-box. A `cosign sign-blob --key` or `openssl dgst -sha256 -sign` signature over `dist.json` verifies with `ECDsa.VerifyData(..., DSASignatureFormat.Rfc3279DerSequence)` on net8, net10, net11 RC1 and Windows (F11.4).
- **The in-box check is 15 lines and was watched red on 7 attacks.** Flipped manifest bit, flipped signature bit, wrong key, truncated signature, empty signature, forged manifest under an attacker key, DER signature through the default P1363 overload: all `verified=False`; the genuine pair is `True` on Linux net8/net10/net11 RC1 and Windows net10 (F11.4).
- **The key must not travel with the thing it signs.** A design that takes the public key from the manifest origin accepted the forged triple (`verified=True`, F11.4 row 8). The SPKI is a constant in the assembly.
- **A managed Sigstore verifier now exists (`Sigstore` 1.1.1, 2026-10-09) but is not a v1 dependency.** It targets `net10.0` only (net8 floor fails), pulls BouncyCastle and TUF, has 12.8K downloads, and in this run accepted a tampered artifact against a genuine DSSE bundle unless the caller binds the in-toto subject digest itself (F4, F11.6).
- **`CertificateIdentity.ForGitHubActions(owner, repo)` is repo-wide.** It accepted bundles from `refs/pull/580/merge` as well as `refs/heads/main`. Pin the exact SAN and issuer (F11.6).
- **Do not shell out to `gh` or `cosign` from library code.** Neither is on a clean runner, both add a runtime tool dependency, and a missing attestation (HTTP 404) looks identical to a tampered file (F11.1, F11.2). Extends CS-BIN-17.
- **Cheapest upstream wins, in order:** set `github-attestations = true` in `dist-workspace.toml` (cargo-dist 0.31.0 is already pinned there); turn on GitHub immutable releases for `ocx-sh/ocx` (`immutable: false` today); publish `dist.json.sig` as ECDSA P-256 DER.
- **Hard-fail, no warn tier, no off switch.** A warning nobody reads is not a control in a no-human loop; the SDK already scrubs `OCX_NO_VERIFY` from child environments (CS-PROC) and must never add `--no-verify`.
- **Key rotation: ship at most two SPKIs (`current`, `next`), select by key id, fail closed on unknown.** Old SDKs after a rotation stop installing and must say "upgrade the SDK"; locate-only and an explicit caller digest remain the escape hatches.
- **Offline and air-gapped work with pins and with an ECDSA key, not with Sigstore.** Pin check and ECDSA check touch no network; Sigstore needs a trusted root (TUF) and, for `gh`, a downloaded trusted-root file ([GitHub docs](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/verify-attestations-offline)).
- **Add CS-BIN-20..34 (below).** They hold under all three delivery models of owner decision 3; the pin table is the common core, and only its consumer differs.

## Findings

### F1. The trust chain today

- **Manifest and archive share an origin.** `https://setup.ocx.sh/dist.json` (schema 1, 280 rows, 35 versions, 8 targets; re-measured 2026-10-11: 86.2 KB, latest 0.6.5) lists `version, channel, tag, target, filename, sha256, url`. The `url` points at `github.com/ocx-sh/ocx/releases/download/...`, so the archive's host differs from the manifest's, but the digest that authenticates the archive comes from the manifest. Control of the manifest is control of the executed bytes ([ocx-cli-contract §Release metadata](../csharp-audit/ocx-cli-contract.md); CS-BIN-08).
- **The Python SDK stops at TLS plus sha256.** "There is no signature check; sigstore verification is an open upstream item" (`python-sdk-digest.md` S14; `/home/mherwig/dev/ocx-sdk-python/.claude/artifacts/sdk-design.md:952-957`). It mitigates only off the canonical host: an explicit `sha256=` pin is then required and the SDK fails closed (`_dist.py:611-653`).
- **The existing C# rules inherit that boundary.** CS-BIN-06 compiles in `TestedOcxVersion`; CS-BIN-07 hashes the archive against the manifest row; CS-BIN-09 requires an explicit digest off `setup.ocx.sh`. None of them gives the digest an authority independent of the manifest host when the host is the canonical one.
- **ocx itself documents the same flow.** The installation page tells humans to `curl` the archive and `sha256.sum` from the same release and run `sha256sum --check --ignore-missing` ([installation.md:124-132](file:///home/mherwig/dev/ocx/website/src/docs/installation.md)). There is no signature step in the documented manual flow.
- **The threat the pin addresses:** a compromised or malicious manifest host, CDN, corporate mirror, or TLS-intercepting proxy serving a self-consistent (manifest, archive) pair. The threat it does not address: a compromised `ocx-sh/ocx` release workflow or maintainer account (the pin would be regenerated from the poisoned release). Only a publisher signature or attestation bound to a workflow identity narrows that.

### F2. What ocx publishes for itself (measured)

Measured against `ocx-sh/ocx` v0.6.5 (published 2026-10-07T13:21:32Z; checkout `ocx@a23ec5be2939`).

| Channel | What is published | Verifiable by a consumer? |
|---|---|---|
| GitHub release assets | 8 archives (`.tar.gz`, Windows `.zip`), 8 `*.sha256`, `sha256.sum`, `dist-manifest.json`, `ocx.cdx.xml` (CycloneDX SBOM) | sha256 only. No `.sig`, `.pem`, `.minisig`, `.intoto.jsonl`, no Sigstore bundle. |
| GitHub artifact attestation for the archives | none: `gh attestation verify` -> `HTTP 404` | no |
| GitHub release attestation | none: `immutable: false`; `gh release verify v0.6.5` -> "no attestations for tag" | no |
| `setup.ocx.sh/dist.json` signature | `dist.json.minisig` and `dist.json.sig` both HTTP 404 | no |
| OCI package `ocx.sh/ocx/cli` (physical `ghcr.io/ocx-sh/ocx/cli`) | 125 tags; no `sha256-*` signature tags; `.github/workflows/oci-publish.yml` has no sign or attest step | no (anonymous referrers lookup returns `Not authorized` on ghcr) |
| Docker image `ghcr.io/ocx-sh/ocx` | SLSA build provenance via `actions/attest-build-provenance@a2bbfa25...` (v2.2.3), `docker-publish.yml:205-206`; `sha256-*` attestation tags present | yes, but it is not the binary the SDK downloads |
| Windows launcher shims (committed blobs) | SLSA provenance via the same action, `build-windows-shims.yml:244-245` | yes: verified green below (F11.2) |

- **The release pipeline is cargo-dist 0.31.0 with `hosting = "github"` and no attestation key.** `dist-workspace.toml:7` pins `cargo-dist-version = "0.31.0"`; the file has no `github-attestations` key (one `attest` match, line 39, is the docker job's `attestations = "write"` permission). The only job granted `attestations: write` is `custom-docker-publish` (`release.yml:355-366`).
- **The capability is one config key away.** cargo-dist `github-attestations` was introduced in 0.16.0, defaults to `false`, is "global-only, experimental", and attests in the `build-local-artifacts` phase by default ([cargo-dist config reference](https://axodotdev.github.io/cargo-dist/book/reference/config.html)). The workflow also needs `id-token: write` and `attestations: write` on the build job ([GitHub docs](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations)); `actions/attest-build-provenance` is now a thin wrapper over `actions/attest` ([action README](https://github.com/actions/attest-build-provenance)).
- **Immutable releases are a repo setting, not code.** An immutable release locks assets and tag, and generates a release attestation that `gh release verify <tag>` and `gh release verify-asset <tag> <file>` check ([immutable releases](https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/immutable-releases), [verifying a release](https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/verifying-the-integrity-of-a-release)). `gh api repos/ocx-sh/ocx/immutable-releases` returned `{"enabled":false}`.
- **ocx has the signing machinery for OCI packages but does not apply it to itself.** `ocx package sign|verify|attest` produce and check Sigstore bundle v0.3 as OCI referrers (cosign-compatible), keyless or `--key` ECDSA P-256 ([signing.md](file:///home/mherwig/dev/ocx/website/src/docs/in-depth/signing.md), "The ECDSA P-256 signature over the subject manifest's SHA-256 digest"; [cosign-parity.md](file:///home/mherwig/dev/ocx/website/src/docs/in-depth/cosign-parity.md)). `ocx package verify` with no policy fails with exit 64 `no_identity_provided`; with an identity it reached ghcr and stopped at `Not authorized` on the referrers call. `OCX_NO_VERIFY` disables the "policy-gated automatic signature verification" on install, pull and exec ([environment.md:842-848](file:///home/mherwig/dev/ocx/website/src/docs/reference/environment.md)).
- **Upstream already has the right issue, with the wrong algorithm for .NET.** [ocx-sh/www-setup#14](https://github.com/ocx-sh/www-setup/issues/14) proposes "minisign or sigstore", `dist.json.minisig`, public key pinned in consuming SDKs. Minisign is Ed25519 (F3). [www-setup#15](https://github.com/ocx-sh/www-setup/issues/15) (size field) is the companion.

### F3. In-box C#: ECDSA P-256 yes, Ed25519 no

- **ECDSA verification API.** `ECDsa.VerifyData(ReadOnlySpan<byte> data, ReadOnlySpan<byte> signature, HashAlgorithmName, DSASignatureFormat)` exists on net5.0 through net11.0, not on netstandard2.0/2.1 ([ECDsa.VerifyData](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.ecdsa.verifydata?view=net-10.0): the `DSASignatureFormat` overloads list monikers `net-5.0 ... net-11.0` only). The three-argument overloads have been there since netstandard1.4 and default to IEEE P1363 `r||s`.
- **The wire format decides the overload.** `openssl dgst -sha256 -sign` and `cosign sign-blob --key` emit a DER `SEQUENCE { INTEGER r, INTEGER s }` (70-72 bytes for P-256; measured 71 and 70). Feed that to the default overload and the answer is a silent `false` (F11.4 row 9). Use `DSASignatureFormat.Rfc3279DerSequence`.
- **Public key import.** `ECDsa.ImportSubjectPublicKeyInfo(ReadOnlySpan<byte>, out int)` takes DER SPKI only; PEM must be decoded first ([docs](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.ecdsa.importsubjectpublickeyinfo?view=net-10.0)). Assert the curve after import: `ExportParameters(false).Curve.Oid.Value == "1.2.840.10045.3.1.7"` (P-256).
- **Ed25519 is not available.** Probe `typeof(ECDsa).Assembly.GetExportedTypes()` for names containing `Ed25519` or `EdDsa`: `count=0` on .NET 8.0.31, 10.0.12 and 11.0.0-rc.1 (F11.5). On net10 and net11 the only match is the non-public `CompositeMLDsaManaged+EdDsaAlgorithm`, an implementation detail of composite ML-DSA. The proposal [dotnet/runtime#63174](https://github.com/dotnet/runtime/issues/63174) was API-approved on 2026-05-05 with an `Ed25519OpenSsl` class marked unsupported on Android, browser, iOS, macOS, tvOS and Windows; the older [#14741](https://github.com/dotnet/runtime/issues/14741) closed on 2026-04-27 pointing at it. A 2026-08-16 milestone `11.0.0` event exists, but 11.0 RC1 has no public type, so do not plan on it. X25519 (key agreement) is a different primitive and ships in .NET 11.
- **Consequence.** A publisher key for in-box verification must be ECDSA P-256 (or P-384/RSA). Minisign (Ed25519) forces a managed crypto dependency (BouncyCastle) or a hand-written curve implementation, both of which fail the dependency-minimal rule (csharp-security-supply-chain) and a "never roll your own crypto" review.
- **Interop is free.** `ocx package sign --key` already uses ECDSA P-256 SPKI PEM keys; `cosign` and `openssl` produce the same DER wire format. The same key could sign `dist.json` and OCI packages.

### F4. A managed Sigstore verifier exists, with traps

[`Sigstore` on NuGet](https://www.nuget.org/packages/Sigstore/) (repo [mitchdenny/sigstore-dotnet](https://github.com/mitchdenny/sigstore-dotnet)), as of 2026-10-11:

| Attribute | Observed |
|---|---|
| Version | 1.1.1, updated 2026-10-09; 1.2.0-alpha.169 prerelease next to it |
| TFM | `net10.0` only (lib/net10.0 in the nupkg) - **no net8.0**, so it cannot sit in a net8;net10 library |
| Dependencies | `BouncyCastle.Cryptography >= 2.7.0`, `Tuf >= 1.1.1` |
| Adoption | 12.8K total downloads, ~220/day; dependents: `ActionsToolkit.Attest`, dotnet/aspire, OPCFoundation/UA-EdgeTranslator |
| License / claims | MIT; "pure .NET implementation of the Sigstore Client Specification"; bundle v0.1-0.3, Rekor inclusion proof and checkpoint, RFC 3161, DSSE, AOT-safe |
| Maturity signals | no audit statement, no conformance-suite claim on the page, 8 stars at fetch time |
| Trust root | `TufTrustRootProvider.ProductionUrl` (embedded TUF root, refreshed online), `FileTrustRootProvider`, `InMemoryTrustRootProvider` |

- **Precedent in .NET:** the Aspire CLI verifies npm provenance with it: `SigstoreBundle.Deserialize`, `CertificateIdentity.ForGitHubActions(owner, repo)`, `TryVerifyDigestAsync`, then compares the in-toto subject name and digest itself ([SigstoreNpmProvenanceChecker.cs](https://raw.githubusercontent.com/dotnet/aspire/main/src/Aspire.Cli/Npm/SigstoreNpmProvenanceChecker.cs)). That is the caller binding the subject, which the next bullet shows is necessary.
- **Trap 1: `VerifyStreamAsync` on a DSSE attestation did not bind the artifact.** With a genuine ocx attestation bundle, a tampered copy of the attested file was `ACCEPTED` (`bound=False`); the library had verified signature, certificate chain, SCT, and Rekor entry, but not that the stream's SHA-256 is in `Statement.Subject`. The caller must compare `result.Statement.Subject[*].Digest["sha256"]` with the file hash (F11.6).
- **Trap 2: the repo-wide identity helper.** `CertificateIdentity.ForGitHubActions("ocx-sh", "ocx")` accepted four bundles, one from `refs/heads/main` and three from `refs/pull/580/merge` of the same workflow. With `new CertificateIdentity { SubjectAlternativeName = "<exact>@refs/heads/main", Issuer = "https://token.actions.githubusercontent.com" }` only the main-branch bundle verified and the other three were rejected.
- **Verdict.** Not a v1 dependency. TFM mismatch with the net8 floor (CS-BUILD), two transitive crypto/TUF dependencies, a one-week-old 1.x line, and nothing to verify today. Revisit when ocx publishes attestations and the floor moves to net10 (after 2026-11-10 EOS of 8 and 9). If adopted later, isolate it in an optional add-on package, never in the core assembly.

### F5. Shelling out to gh or cosign

- **`gh attestation verify <file> -R ocx-sh/ocx`** works (F11.2) and supports offline use with `gh attestation download`, `gh attestation trusted-root > trusted_root.jsonl`, `--bundle` and `--custom-trusted-root` ([offline verification](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/verify-attestations-offline)). It needs a `gh` binary, network or pre-staged bundle plus trusted root, and, for most users, a token.
- **Missing and tampered are indistinguishable.** Both a tampered file and a file that never had an attestation produce `HTTP 404` from `.../attestations/sha256:<digest>` and exit 1 (F11.1 vs F11.2). A library that maps "gh failed" to "unsigned, continue" would let an attacker choose the tamper path.
- **A runtime tool dependency contradicts the locate-first design.** The SDK exists to bootstrap `ocx` onto machines that lack it (CS-BIN locate-then-download); requiring `gh` or `cosign` there recreates the problem one level up. CS-BIN-17 already forbids shelling out to `curl`/`chmod`; extend it.
- **Where shelling out is fine:** build and release CI of the SDK (verify before pack), and ad-hoc human checks. Not library code.

### F6. The decision: pin in the assembly, verify nothing else at v1

**Verify or not at v1: verify against a compiled-in digest pin (yes); verify a publisher signature or attestation (no, not yet).**

Reasons, in order:

1. There is nothing to verify: no signature, attestation, or signed checksum exists for any ocx binary channel (F2). A verifier with no input is dead code.
2. A pin moves the trust root from `setup.ocx.sh` to the NuGet package. The SDK's own authenticity then rests on nuget.org repository signing (verified by the NuGet client on Windows always, on Linux since .NET 8 SDK by default, and off by default on macOS: [NuGet signed-package verification](https://learn.microsoft.com/en-us/dotnet/core/tools/nuget-signed-package-verification)), Trusted Publishing from a tag-triggered job (CS-PKG), and MinVer tags. That chain exists today.
3. It costs nothing at runtime: one `SHA256` compare already required by CS-BIN-07, against a constant instead of (or in addition to) the manifest row.
4. It is the only mechanism that holds under every delivery model (F7).
5. The deferred work is concrete and small (F10): when ocx publishes an ECDSA P-256 signature, the SDK adds a ~15-line check with a pinned SPKI.

Mechanism:

```csharp
// OcxPins.cs - generated by the pin gate, committed, reviewed like code. One row per supported triple.
internal static class OcxPins
{
    internal const string Version = "0.6.5";                    // == TestedOcxVersion (CS-BIN-06)
    internal static readonly IReadOnlyDictionary<string, string> Sha256ByTriple = new Dictionary<string, string>(StringComparer.Ordinal)
    {
        ["x86_64-unknown-linux-musl"]  = "bb4d306debca428fdc326ec587047c7efc3f3a2262b06eacfdaca46fa75a4dac",
        ["x86_64-unknown-linux-gnu"]   = "f8b30fbfb1adec2c9281ed40960d562fcd9d51d39b06b8f65775b9de29505d14",
        ["aarch64-apple-darwin"]       = "270634b7d62067abbfed35331c29ee7b62db6b76e8f307bf5cd14b24c2297ce1",
        // ... 8 rows, from `sha256.sum` of the v0.6.5 release (F11.9)
    };
}
```

- **Check order for the download model:** (1) manifest row validated (CS-BIN-08); (2) if `version == OcxPins.Version`, the row digest must equal the pin (else `ChecksumMismatchException`, reason `manifest-disagrees-with-pin`, no download); (3) stream the archive to a temp file, hash, compare with the pin using `CryptographicOperations.FixedTimeEquals` (CS-BIN-07); (4) only then open the archive.
- **Other versions** (caller asks for `latest` or an older tag): no pin exists. Require an explicit caller-supplied digest, as CS-BIN-09 already does off the canonical host; a version request without a digest is allowed only through an option whose name says it trusts the manifest origin. The default path never uses it.
- **Pin generation = triangulation** (script in the fixture: `triangulate.py`; port to a .NET 10 file-based app or the repo's `task` runner): for the version, take the 8 digests from (a) `setup.ocx.sh/dist.json`, (b) the release asset `sha256.sum`, (c) `gh release view vX --json assets` (`digest` field, computed by GitHub at upload). Write the pin file only if all three agree for all 8 triples; run the same check nightly and on every pin bump. Record `attested: false` per row until upstream ships attestations; flip a policy bit when `gh attestation verify` starts succeeding.

### F7. The three delivery models

| Model (owner decision 3) | What the pin table does | What verifies the SDK's own authenticity | Residual risk |
|---|---|---|---|
| (a) Locate only (PATH, `OCX_SDK_EXE`, `$OCX_HOME`) | Not compiled in; nothing is downloaded | Operator's own supply chain | The SDK cannot attest a binary it did not fetch. It can only run the handshake (CS-JSON schema/contract check). Document this plainly. |
| (b) Bundle per-RID binaries in NuGet | Build-time gate: before `dotnet pack`, `sha256sum -c` the staged `runtimes/*/native/ocx` against the pin file (F11.7) | nuget.org repository signature + Trusted Publishing; the pins live in the same repo | macOS dev machines do not verify NuGet signatures by default; TLS plus nuget.org hash only. 91.6 MB nupkg cost is not this topic. |
| (c) Download from dist manifest at first use | Runtime gate: archive hash must equal the pin (F6) | same as (b) | A compromised ocx release pipeline poisons the next pin bump; narrow only with upstream attestations (F10). |

The same `ocx-pins` file serves all three; models (a) and (b) simply never run the runtime branch. The rule set below is written so a reviewer can apply it without knowing which model the owner chose.

### F8. Rotation, old SDKs, offline, hard-fail

- **Pin rotation is a release.** Each new ocx version needs a new pin table, hence a new SDK release (this already follows from CS-BIN-06 and the exact-equality contract handshake, `ocx-cli-contract.md` §5). Old SDKs keep working against their own tested version for as long as the GitHub release asset exists; if the asset is deleted, the download fails (HTTP 404), never silently falls back.
- **Signature key rotation (v1.x, when upstream ships a key).** Ship at most two SPKIs: `current` and `next`. Identify a key by `keyid = hex(SHA-256(SPKI))[..16]` carried next to the signature. Sequence: (1) SDK N ships `next` as the second key; (2) once N is the oldest supported SDK, upstream signs with `next`; (3) SDK N+k promotes `next` to `current` and adds a new `next`. An SDK older than the rotation sees an unknown keyid and fails closed with "this SDK predates the ocx signing key; upgrade the SDK, pass an explicit digest, or use a located binary". There is no remote key fetch: a key fetched from the origin is exactly the bad design in F11.4 row 8.
- **Revocation.** There is no online revocation in a pin-or-key model. Key compromise is answered by an SDK release plus NuGet deprecation of older versions. State this limit in the README.
- **Offline and air-gapped.** The pin check needs the archive only; the ECDSA check needs the manifest, its `.sig`, and an in-assembly key. Neither touches the network (test it with a handler that throws on any request after the bytes are on disk). Sigstore bundle verification needs a trusted root: `gh` can run offline only with a pre-downloaded bundle and `trusted_root.jsonl`; the .NET library defaults to a TUF fetch. Prefer the key model for air-gapped fleets; mirrors then re-host `dist.json`, `dist.json.sig` and the archive unchanged.
- **Hard-fail vs warn: hard-fail.** The consumer of this SDK is frequently an agent loop with no human reading logs. A mismatch throws; there is no warn tier and no `SkipVerification` option. The only way around a pin is a different explicit digest or locate-only, both of which are visible in the caller's code. The SDK already scrubs `OCX_NO_VERIFY` (CS-PROC); it must also never pass `--no-verify` to ocx.
- **Missing signature is a failure once required.** Because a 404 for a missing attestation and a 404 for a tampered file look the same (F5), "not found" never means "unsigned, fine" after the SDK declares signatures required for that version.

### F9. Prior art

| Project | What it verifies | Source |
|---|---|---|
| Python `ocx-sdk-python` | TLS plus sha256 from the same manifest; pin required off canonical host; no signature; tracked as upstream item | `_dist.py:611-653`; `sdk-design.md:952-957`; [www-setup#14](https://github.com/ocx-sh/www-setup/issues/14) |
| rustup | HTTPS only: "does not yet validate signatures of downloads" | [rustup security](https://rust-lang.github.io/rustup/security.html) |
| nvm | A checksum step ("Computing checksum with sha256sum" / "Checksums matched!"); no signature step documented | [nvm README](https://raw.githubusercontent.com/nvm-sh/nvm/master/README.md) |
| `sigstore/cosign-installer` | Pins a bootstrap cosign version and per-platform SHA-256 in the action, pins the SHA-256 of `release-cosign.pub`, then verifies the requested release with the bootstrap binary (keyless bundle for v3.0.1+, `verify-blob --key` for older) | [action.yml](https://raw.githubusercontent.com/sigstore/cosign-installer/main/action.yml) |
| Aspire CLI | Sigstore .NET library for npm provenance (identity + subject name + digest), not for its own binary; ships per-RID packages | [SigstoreNpmProvenanceChecker.cs](https://raw.githubusercontent.com/dotnet/aspire/main/src/Aspire.Cli/Npm/SigstoreNpmProvenanceChecker.cs) |

Read-across: the only prior art that does better than "TLS plus checksum" pins its trust anchor inside the tool (cosign-installer) rather than fetching it from the origin. The proposed C# design is that pattern with the pin table (now) and an SPKI (later).

### F10. The upstream ask

Ordered by cost for ocx maintainers; all are small and none needs C# changes beyond CS-BIN-20..34.

1. **`github-attestations = true` in `/home/mherwig/dev/ocx/dist-workspace.toml`** (cargo-dist ≥ 0.16, repo pins 0.31.0) plus `id-token: write` and `attestations: write` on the build job. Result: every archive gets SLSA provenance bound to `ocx-sh/ocx`'s `release.yml`; `gh attestation verify ocx-<triple>.tar.gz -R ocx-sh/ocx` goes green. The exact signer SAN to pin is then `https://github.com/ocx-sh/ocx/.github/workflows/release.yml@refs/tags/v<version>`.
2. **Enable immutable releases on `ocx-sh/ocx`** (setting, no code). Result: `gh release verify-asset v<version> <file>` works and an attacker cannot swap an asset after publication. Create the release as a draft, upload all assets, then publish ([GitHub guidance](https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/immutable-releases)).
3. **Publish `dist.json.sig` (and `dist/<sha256>.json.sig`) as a detached ECDSA P-256 / SHA-256 signature, DER-encoded** (what `cosign sign-blob --key` and `openssl dgst -sha256 -sign` emit), plus the SPKI PEM in the repo and docs. Change [www-setup#14](https://github.com/ocx-sh/www-setup/issues/14) from "minisign or sigstore" to "ECDSA P-256 key, cosign-compatible". Same key family `ocx package sign --key` already supports.
4. **Sign the `ocx.sh/ocx/cli` OCI packages** in `oci-publish.yml` (`ocx package sign`, keyless in Actions). Then, once the SDK has a pinned first binary, later upgrades can be delegated to `ocx self setup <ver>@sha256:<digest>` and `ocx package verify` with a trust policy; the SDK implements no Sigstore at all.
5. **A `schema: 2`-free addition to `dist.json`:** a `signature` or `attestations` field per row is optional; not required if (1)-(3) land.

### F11. Verified on the toolchain

Fixture root: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-security-binary-attestation/` (SDK 10.0.401 via the parent `global.json`; `ecdsa-ref-net11/` pins 11.0.100-rc.1.26425.128). All commands are prefixed with `/home/mherwig/.cache/research-lang/dotnet-tools/run.sh` and run inside the named subdirectory. Downloads are read-only.

**1. Release assets carry no attestation (red, publisher side).**

```
$ gh attestation verify dl/ocx-x86_64-unknown-linux-gnu.tar.gz --repo ocx-sh/ocx
Error: HTTP 404: Not Found (https://api.github.com/repos/ocx-sh/ocx/attestations/sha256:f8b30fbfb1ad...?per_page=30&predicate_type=...slsa.dev%2Fprovenance%2Fv1)
$ gh release verify v0.6.5 --repo ocx-sh/ocx
no attestations for tag v0.6.5 (sha1:26ad03a17b34ed85b6d0dabc90a2eced7c403f7c)
$ curl -sI https://setup.ocx.sh/dist.json.minisig | head -1   -> HTTP/2 404
$ curl -sI https://setup.ocx.sh/dist.json.sig     | head -1   -> HTTP/2 404
$ gh api repos/ocx-sh/ocx/releases/tags/v0.6.5 --jq .immutable -> false
```

**2. A real ocx attestation exists for the Windows shim (green) and a tampered copy fails (red).** `crates/ocx_store/src/shims/ocx-shim-x86_64.exe` (sha256 `f0452016...d4ca`), attested by `build-windows-shims.yml`:

```
$ cd real
$ gh attestation verify ocx-shim-x86_64.exe -R ocx-sh/ocx --format json    # exit 0, 4 attestations
  signer  https://github.com/ocx-sh/ocx/.github/workflows/build-windows-shims.yml@refs/heads/main
  issuer  https://token.actions.githubusercontent.com   predicate https://slsa.dev/provenance/v1
$ printf '\x00' | dd of=tampered.exe bs=1 seek=100 conv=notrunc    # one byte changed
$ gh attestation verify tampered.exe -R ocx-sh/ocx
Error: HTTP 404: Not Found (.../attestations/sha256:0f7047462655...)   # exit 1
```

Reading: the tampered file is a 404, identical to the unattested release archive in 1.

**3-4. In-box ECDSA P-256 reference design (`ecdsa-ref/`, `ecdsa-ref-net11/`).** Keys A (publisher, pinned) and B (attacker) generated with `openssl ecparam -name prime256v1`; the real 86 KB `dist.json` signed with `openssl dgst -sha256 -sign keys/A.pem` (DER, 70-71 bytes; `openssl dgst -verify` agreed). `forged.json` is the manifest with `0.6.5` replaced by `0.6.6`, signed with B. Command: `dotnet build -nologo -v q && dotnet bin/Debug/<tfm>/ecdsa-ref.dll` (TreatWarningsAsErrors, AnalysisLevel latest-all).

```
runtime=.NET 10.0.12 os=Fedora Linux 43 (WSL) arch=X64
ok   green: genuine manifest + genuine sig, pinned key    verified=True  expected=True
ok   red: one flipped manifest bit                        verified=False expected=False
ok   red: one flipped signature bit                       verified=False expected=False
ok   red: wrong key (attacker key B pinned)               verified=False expected=False
ok   red: truncated signature (malformed DER)             verified=False expected=False
ok   red: empty signature (missing .sig file)             verified=False expected=False
ok   red: forged manifest+sig under attacker key, pinned  verified=False expected=False
ok   BAD DESIGN: forged triple, key shipped w/ manifest   verified=True  expected=True
ok   BAD CODE: DER sig through default (P1363) overload   verified=False expected=False
ok   green: same sig as P1363, P1363 overload             verified=True  expected=True
ALL AS EXPECTED
```

Identical output on `.NET 8.0.31` (Linux), `.NET 11.0.0-rc.1.26425.128` (Linux), and `.NET 10.0.2` on Windows 10.0.26200 x64 (`cmd.exe /c "cd /d C:\Users\ecom\ocx-attest-wintest && dotnet run -c Release -f net10.0"`, staging dir removed afterwards). Row 8 is the point of the exercise: a verifier that takes its key from the manifest origin accepts the forgery.

**5. Ed25519 probe (same program, last lines).** `public in-box Ed25519/EdDSA types: [] count=0` on net8.0.31, net10.0.12 and net11.0.0-rc.1. On net10/net11 the non-exported `CompositeMLDsaManaged+EdDsaAlgorithm` is the only name match (found with `GetTypes()` before restricting to `GetExportedTypes()`). `halluc2/`: `System.Security.Cryptography.Ed25519.Verify(...)` -> `error CS0234: The type or namespace name 'Ed25519' does not exist`.

**6. Managed Sigstore verifier against the real ocx attestation (`sigstore-verify/`, `Sigstore` 1.1.1, net10.0, `TufTrustRootProvider.ProductionUrl`).** `dotnet bin/Debug/net10.0/sv.dll <file> <bundle.jsonl> <SAN> <naive|pinned>` with the 4-bundle file from `gh attestation download`:

```
naive  (ForGitHubActions("ocx-sh","ocx")), genuine file : ACCEPTED x4  (1x refs/heads/main, 3x refs/pull/580/merge)
naive,                                       tampered   : ACCEPTED x4  bound=False     <- library did not bind the subject digest
pinned (exact SAN@refs/heads/main + issuer + digest bind), genuine : accepted=1 rejected=3   (exit 0)
pinned,                                      tampered   : REJECTED subject digest != artifact sha256 ; accepted=0 (exit 1)
first run, ForGitHubActions("ocx-sh","evil")           : REJECTED x4
```

**7. Pin gate on a real archive (shell).**

```
GREEN ocx-x86_64-unknown-linux-gnu.tar.gz pin-match
RED   flipped.tar.gz pin-mismatch got=3d62d908c525      # one byte at offset 5,000,000 set to 0x01
```

**8. Banned-overload gate (`ban-gate/`, `Microsoft.CodeAnalysis.BannedApiAnalyzers` 5.6.0, `BannedSymbols.txt` as an `AdditionalFiles` item, one `M:` line per overload).**

```
$ dotnet build -nologo -v q -p:Variant=Good --no-incremental   -> Build succeeded. 0 Warning(s)
$ dotnet build -nologo -v q -p:Variant=Bad  --no-incremental
Bad.cs(8,16):  error RS0030: The symbol 'ECDsa.VerifyData(byte[], byte[], HashAlgorithmName)' is banned in this project: Pass a DSASignatureFormat explicitly ...
Bad.cs(10,92): error RS0030: The symbol 'ECDsa.VerifyData(ReadOnlySpan<byte>, ReadOnlySpan<byte>, HashAlgorithmName)' is banned ...
```

**9. Triangulation gate (`triangulate.py <dist.json> <sha256.sum> <assets.json> 0.6.5`).** Green: `rows 8 mismatches 0`, exit 0 (dist.json row = `sha256.sum` line = GitHub API asset digest for all 8). Red: with the first `sha256.sum` line altered (`2706...` -> `3706...`): `DIFF ocx-aarch64-apple-darwin.tar.gz ['270634b7d620', '370634b7d620', '270634b7d620']`, `rows 8 mismatches 1`, exit 1.

**10. Halluc probes (`halluc/`, net10.0 Linux).**

```
ECDsa.Create(ECCurve.CreateFromFriendlyName("ed25519"))  -> THROWS PlatformNotSupportedException: The specified curve 'ed25519' ... not valid
ECDsa.Create(ECCurve.CreateFromFriendlyName("curve25519"))-> THROWS PlatformNotSupportedException
DER sig (70 B) through VerifyData(data, sig, SHA256)       -> verifyDefault=False   (silent)
VerifyData(.., malformed 3-byte DER, Rfc3279DerSequence)   -> False               (no throw on Linux/OpenSSL; keep catch (CryptographicException))
```

Counts: 6 distinct red/green pairs (items 2, 4, 6, 7, 8, 9), the ECDSA pair repeated on 4 runtimes, plus 4 publisher-side reds (item 1). 9 pair-runs in total.

## Normative guidance candidates

Numbering continues CS-BIN-19. Rules marked (v1.x) apply once upstream publishes a P-256 signature; the pin rules apply from v1.

**CS-BIN-20 (MUST) Compile a per-triple SHA-256 pin table for `TestedOcxVersion` into the assembly (`OcxPins`) and compare the downloaded archive against the pin.**
- **Rationale:** moves the digest's authority from the manifest origin to the signed NuGet package (F1, F6).
- **Verify:** `rg -n -e 'OcxPins' src/` finds the table, its reader, and the download path; `jq -e '.pins | length == 8 and all(.[]; test("^[0-9a-f]{64}$"))' ocx-pins.json` exits 0; a unit test flips one hex char of a pin and expects `ChecksumMismatchException` and no file left in the cache.

**CS-BIN-21 (MUST) A manifest row for `TestedOcxVersion` whose digest differs from the pin fails before any archive request.**
- **Rationale:** a disagreeing manifest is the signal this design exists to catch (F11.9).
- **Verify:** unit test with a fake manifest carrying a different digest asserts zero archive requests reached the handler (same shape as CS-BIN-09's test).

**CS-BIN-22 (MUST) Regenerate pins only through the triangulation gate: `dist.json` row, release `sha256.sum`, and the GitHub API asset `digest` must agree for all triples. Never copy a digest from a single source, a chat message or a model answer.**
- **Rationale:** one poisoned source cannot pass three independent publication points (F11.9).
- **Verify:** CI job runs the gate on every change to `ocx-pins.json` and nightly: `python3 -I scripts/triangulate.py dist.json sha256.sum assets.json "$(jq -r .version ocx-pins.json)"` exits 0. Reading heuristic: a diff touching `ocx-pins.json` without the gate's log in the PR is rejected.

**CS-BIN-23 (MUST) A version other than `TestedOcxVersion` requires a caller-supplied archive digest. The option that trusts the manifest alone must be named for what it does and must never be a default.**
- **Rationale:** without a pin the manifest origin is the only authority (F6).
- **Verify:** unit test: request version `0.6.4` without a digest -> typed exception, zero requests. `rg -n -i -e 'TrustManifest' -e 'Unpinned' src/` shows each occurrence behind an explicit option read, none in a default value.

**CS-BIN-24 (MUST NOT) Take a verification key, signature, or digest from the same origin as the artifact it authenticates.**
- **Rationale:** the forged triple verified under a shipped key (F11.4 row 8).
- **Verify:** `rg -n -e 'ImportSubjectPublicKeyInfo' -e 'ImportFromPem' -e 'ImportPkcs8' src/` matches in exactly one file, and its argument is a `const`/`static readonly` byte source in the assembly: `rg -c 'ImportSubjectPublicKeyInfo' src/ | wc -l` prints `1`. A test verifies a forged (manifest, sig, key) triple is rejected.

**CS-BIN-25 (v1.x, MUST) Verify manifest signatures with `ECDsa` P-256 / SHA-256, `DSASignatureFormat.Rfc3279DerSequence`, an SPKI pinned in the assembly, and a curve assertion (`1.2.840.10045.3.1.7`) after import.**
- **Rationale:** the only scheme in-box on net8, net10, net11 RC1 and Windows (F3, F11.4).
- **Verify:** the Variant=Bad / Variant=Good canary build of F11.8: `dotnet build -p:Variant=Bad` fails with RS0030 and `dotnet build -p:Variant=Good` succeeds; `BannedSymbols.txt` lists `M:System.Security.Cryptography.ECDsa.VerifyData(System.Byte[],System.Byte[],System.Security.Cryptography.HashAlgorithmName)`, the `ReadOnlySpan{System.Byte}` overload, the `Stream` overload, and both `VerifyHash` overloads, one `M:` line each, RS0030 at error in `.editorconfig`.

**CS-BIN-26 (v1.x, MUST) Every failure path in the signature check returns not-verified or throws a typed exception. No `catch { return true; }`, no `catch (Exception)`; catch `CryptographicException` and return false.**
- **Rationale:** exceptions from import or verify are attacker-reachable (truncated, empty, malformed inputs, F11.4 rows 5-6).
- **Verify:** `dotnet build` with `CA1031` at `error` (CS-ERR) ; `rg -n -U -e 'catch\s*(\([^)]*\))?\s*\{\s*return\s+true' src/` prints nothing; the seven red rows of F11.4 exist as tests.

**CS-BIN-27 (MUST NOT) Add an Ed25519, minisign, or NaCl implementation or package to the core SDK.**
- **Rationale:** no in-box Ed25519 on any shipping .NET (F3); a managed crypto package or hand-rolled curve code fails supply-chain minimalism.
- **Verify:** `dotnet list src/Ocx.Sdk/Ocx.Sdk.csproj package --include-transitive | rg -i -e 'BouncyCastle' -e 'NSec' -e 'Sodium' -e 'Chaos\.NaCl' -e 'Sigstore'` prints nothing; `rg -n -i -e 'minisign' -e 'ed25519' src/` matches only comments referencing this rule.

**CS-BIN-28 (MUST NOT) Reference the `Sigstore` NuGet package, or any Sigstore client, from the core SDK at v1. Revisit only as an optional add-on package after the floor is net10 and ocx publishes attestations.**
- **Rationale:** `net10.0`-only TFM vs net8 floor, BouncyCastle + TUF transitive, 1.x line two days old, nothing to verify yet (F4).
- **Verify:** `rg -n -e 'PackageReference[^>]*Sigstore' -e 'PackageVersion[^>]*Sigstore' -g '*.csproj' -g 'Directory.Packages.props' .` matches only an add-on project, if one exists.

**CS-BIN-29 (MUST, if a Sigstore bundle is ever verified) Pin the exact certificate SAN and issuer, and compare the in-toto subject digest with the artifact hash yourself.**
- **Rationale:** `ForGitHubActions(owner, repo)` accepted PR-merge refs; `VerifyStreamAsync` accepted a tampered file against a DSSE bundle (F11.6).
- **Verify:** `rg -n 'ForGitHubActions\(' src/` prints nothing; `rg -n -e 'Statement\??\.Subject' src/` appears next to every `VerifyStreamAsync|VerifyDigestAsync|TryVerify` call; a test feeds a tampered file with a genuine bundle and expects rejection.

**CS-BIN-30 (MUST NOT) Spawn `gh`, `cosign`, `minisign` or `openssl` from library code, and never pass `--no-verify` or set `OCX_NO_VERIFY`.**
- **Rationale:** runtime tool dependency; 404 ambiguity (F5, F8). Extends CS-BIN-17 and CS-PROC env scrub.
- **Verify:** `rg -n -i -e '"gh"' -e '"cosign"' -e '"minisign"' -e '"openssl"' -e '--no-verify' src/` prints nothing; `rg -n 'OCX_NO_VERIFY' src/` matches only the scrub list.

**CS-BIN-31 (MUST) Verification is hard-fail. No warn tier, no skip option, no environment variable that disables the pin or signature check.**
- **Rationale:** unattended agent loops cannot act on a warning (F8).
- **Verify:** `rg -n -i -e 'SkipVerif' -e 'NoVerif' -e 'DisableVerif' -e 'Insecure' -e 'AllowUnsigned' src/` prints nothing; the public API listing (`PublicAPI.Shipped.txt`) contains no bool whose name starts with `Skip|Disable|Allow` and ends `Verification|Signature|Checksum`.

**CS-BIN-32 (MUST) Pin and signature checks perform no network I/O.**
- **Rationale:** air-gapped installs and mirrors must work with archive, `dist.json`, `dist.json.sig` only (F8).
- **Verify:** a test installs from a pre-populated local source with an `HttpMessageHandler` that throws on any request after the bytes are on disk; it passes.

**CS-BIN-33 (v1.x, SHOULD) Hold at most two pinned SPKIs (`current`, `next`), selected by key id `hex(SHA256(SPKI))[..16]` carried with the signature; an unknown key id fails closed with an upgrade message.**
- **Rationale:** rotation without remote key fetch (F8).
- **Verify:** `rg -n 'Spki' src/ -g 'PinnedKeys*.cs'` shows at most two entries; a test with an unknown key id expects the typed exception whose message contains `upgrade`.

**CS-BIN-34 (MUST) State the trust boundary in the README and the XML docs of the install entry point in one sentence each: what the pin proves, what it does not (a compromised ocx release pipeline), and that a located binary is not verified.**
- **Rationale:** a pin sold as "signature verification" over-promises (F1, F7).
- **Verify:** reading heuristic: `rg -n -i 'does not verify|not verified|trust boundary' README.md src/` finds the sentence; `rg -n -i -e 'signed by ocx' -e 'signature verified' README.md src/` prints nothing until upstream ships a signature.

**CS-BIN-35 (MUST, delivery model b) Before `dotnet pack`, verify every staged `runtimes/*/native/ocx*` against the pin file.**
- **Rationale:** the bundle model's equivalent of the runtime gate (F7, F11.7).
- **Verify:** a CI step (`sha256sum -c` over a generated list, or the .NET equivalent) fails with exit 1 on a flipped byte and exits 0 on the genuine staging tree; `rg -n 'ocx-pins' .github/workflows/ taskfile.yml` shows the step before the pack step.

## AI-agent angle

| What an LLM characteristically gets wrong | Smallest mechanical check |
|---|---|
| Recommends `System.Security.Cryptography.Ed25519` or `Ed25519.Verify` "available since .NET 7/8" (hallucinated type; common because other languages have it). | `dotnet build` -> `CS0234` (F11.5). Also `rg -n -i 'ed25519' src/`. |
| Writes `ECDsa.Create(ECCurve.CreateFromFriendlyName("ed25519"))`, which compiles and throws `PlatformNotSupportedException` at runtime on Linux (F11.10). | `rg -n -i 'CreateFromFriendlyName' src/` prints nothing; unit test on Linux. |
| Verifies an openssl/cosign DER signature with the default `VerifyData(data, sig, SHA256)` overload; returns `false` for genuine data, then "fixes" it by weakening the check. | RS0030 ban on the three-argument overloads (CS-BIN-25, F11.8). |
| Takes the public key from the same URL as the manifest ("download `dist.json` and `dist.json.pub`"). Verifies, passes tests, defends nothing (F11.4 row 8). | CS-BIN-24 `rg` count of key-import call sites; forged-triple test. |
| Treats `gh attestation verify` exit code 1 / HTTP 404 as "no attestation, continue" (indistinguishable from tampering). | `rg -n -i '"gh"' src/` prints nothing (CS-BIN-30); tampered-file test. |
| Uses `CertificateIdentity.ForGitHubActions(owner, repo)` and `VerifyStreamAsync` and calls it done (accepts PR-merge refs and a tampered file against a DSSE bundle). | CS-BIN-29 `rg`; tamper test. |
| Claims ocx ships cosign signatures / SLSA provenance / minisign for its release binaries because "that is standard for Rust projects" or because cargo-dist supports it. Measured: none (F2). | Require a command transcript: `gh attestation verify <archive> -R ocx-sh/ocx` exit status before any rule cites attestation. |
| Compares hex digests with `==` or `Convert.ToHexString(...) == expected` (uppercase vs lowercase, timing). | CS-BIN-07 `rg` pattern; `FixedTimeEquals`. |
| Adds BouncyCastle or `NSec` to get Ed25519 "just for the checksum file". | CS-BIN-27 `dotnet list package --include-transitive`. |
| Offers a `SkipSignatureVerification` / `AllowInsecure` flag "for tests and corporate mirrors". | CS-BIN-31 `rg`; the existing digest-pin option (CS-BIN-09) already covers mirrors. |
| Refreshes the pin by pasting the digest from `dist.json` alone (the very source being defended against). | CS-BIN-22 triangulation job in the PR; reading heuristic on `ocx-pins.json` diffs. |
| Suggests Authenticode / strong-name "signing the binary" as the answer. ocx is a Rust binary; neither strong names nor Authenticode apply to the verification problem (strong naming is already rejected, CS-PKG). | Reading heuristic; `rg -n -i 'SignAssembly|AssemblyOriginatorKeyFile|CreateFromSignedFile' src/` prints nothing. |

## Contested / evolving

- **Ed25519 in .NET (as of 2026-10-11).** API shape approved 2026-05-05 but OpenSSL-only (`Ed25519OpenSsl`, unsupported on Windows/macOS); not present in 11.0 RC1. Trend: if it ships it will be a conditional-platform API, so a cross-platform SDK still cannot rely on it. The decision (ECDSA P-256 upstream) does not depend on this resolving.
- **Managed Sigstore on .NET.** `Sigstore` 1.1.1 appeared as a 1.x line in October 2026 and is already used by the Aspire CLI; before that the options were shelling out or porting Go/Rust. Trend: rising; conformance and audit claims are not on the package page. Re-evaluate after 12 months or when its TFM list includes net8.0. If ocx later insists on keyless-only, an optional add-on package is the likely shape.
- **GitHub attestations vs a project-owned key.** GitHub's route needs no key custody and binds a workflow identity, but needs Sigstore verification client-side and an online trusted root (or a staged one). A project key is verifiable in 15 lines, offline, but moves key custody and rotation onto ocx maintainers. Both can coexist; the SDK only needs the second to stay dependency-free.
- **cargo-dist `github-attestations` is "experimental"** (global-only; `github-attestations-phase` since 0.30.0). `actions/attest-build-provenance` became a wrapper over `actions/attest` at v4, and new work is told to use `actions/attest` directly. Expect config names to move; pin the dist version when enabling.
- **Immutable releases** are recent GitHub functionality; behaviour of `gh release verify` and `verify-asset` is documented only briefly. Treat as promising, confirm in a throwaway repo before making the SDK depend on it.
- **Rekor v2.** ocx documents Rekor v1 only (signing.md); a Sigstore instance moving to v2 changes what bundles verify. This is on the ocx side, but it bears on any future in-SDK Sigstore use.
- **NuGet signature verification on the client** is on by default on Windows, on by default on Linux since the .NET 8 SDK, and off by default on macOS with an explicit recommendation not to enable it ([NuGet docs](https://learn.microsoft.com/en-us/dotnet/core/tools/nuget-signed-package-verification)). The bundle model's integrity on macOS therefore rests on TLS and nuget.org hashes.
- **Pin tables vs signed manifests.** TUF-style freshness (rollback/freeze protection) is not provided by either: `www-setup#14` lists it as phase 3. A pinned SDK is immune to rollback by construction (it only installs its own version) but also cannot learn about security releases of ocx without an SDK release.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.ecdsa.verifydata?view=net-10.0 | `ECDsa.VerifyData` overload list, monikers | docs updated 2026-07 | Exact overloads and which TFMs have `DSASignatureFormat` (net5+ only) |
| https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.ecdsa.importsubjectpublickeyinfo?view=net-10.0 | `ImportSubjectPublicKeyInfo` | docs updated 2026-07 | DER-only SPKI import; PEM must be decoded first |
| https://github.com/dotnet/runtime/issues/63174 | Ed25519 API proposal | approved 2026-05-05 | Why Ed25519 is OpenSSL-only and not shipped |
| https://github.com/dotnet/runtime/issues/14741 | Original Ed25519 request | closed 2026-04-27 | History of the stall; points to #63174 |
| https://www.nuget.org/packages/Sigstore/ | Managed Sigstore client, 1.1.1 | 2026-10-09 | TFM, dependencies, adoption (primary for maturity) |
| https://github.com/mitchdenny/sigstore-dotnet | Library source and README | 2026-10 | Verification API shape, bundle I/O, trust-root providers |
| https://raw.githubusercontent.com/dotnet/aspire/main/src/Aspire.Cli/Npm/SigstoreNpmProvenanceChecker.cs | Aspire CLI use of the library | 2026 | A real .NET caller that binds subject name and digest itself |
| https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations | Artifact attestations how-to | 2026 | Permissions, `actions/attest`, `gh attestation verify -R` |
| https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/verify-attestations-offline | Offline verification | 2026 | `gh attestation download`, `trusted-root`, `--bundle`, `--custom-trusted-root` |
| https://github.com/actions/attest-build-provenance | Action README | 2026 (v4 wrapper) | Deprecation toward `actions/attest`; public-repo availability |
| https://axodotdev.github.io/cargo-dist/book/reference/config.html | cargo-dist config reference | dist 0.31 era | `github-attestations` key, default, phase, filters |
| https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/immutable-releases | Immutable releases | 2025-26 | What immutability and release attestation guarantee |
| https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/verifying-the-integrity-of-a-release | `gh release verify` / `verify-asset` | 2025-26 | The consumer commands for immutable releases |
| https://rust-lang.github.io/rustup/security.html | rustup security page | current | Prior art: HTTPS only, no signature validation |
| https://raw.githubusercontent.com/sigstore/cosign-installer/main/action.yml | cosign-installer bootstrap | 2026 (cosign v3.1.x) | Pins the trust anchor inside the tool |
| https://raw.githubusercontent.com/nvm-sh/nvm/master/README.md | nvm README | v0.40.x | Prior art: checksum step only |
| https://learn.microsoft.com/en-us/dotnet/core/tools/nuget-signed-package-verification | NuGet signed-package verification per OS | updated 2024-03 | Defaults by OS; basis for the bundle model's runtime trust |
| https://learn.microsoft.com/en-us/nuget/reference/errors-and-warnings/nu3042 | NU3042 root certificate bundles | 2024-08 | SDK-bundled root stores on Linux/macOS |
| https://learn.microsoft.com/en-us/nuget/consume-packages/installing-signed-packages | Package trust boundaries | 2025-10 | `signatureValidationMode`, `trustedSigners`, repository owners |
| https://github.com/ocx-sh/www-setup/issues/14 | Upstream: detached signature for `dist.json` | open since 2026-08-20 | States the problem and the minisign proposal this report amends |
| https://github.com/ocx-sh/www-setup/issues/15 | Upstream: size field in `dist.json` rows | open since 2026-08-20 | Companion item for exact size caps |
| /home/mherwig/dev/ocx/.github/workflows/release.yml (lines 355-366), /home/mherwig/dev/ocx/dist-workspace.toml (7, 36, 39) | ocx release pipeline | `ocx@a23ec5be2939` | Only the docker job has `attestations: write`; no `github-attestations` key |
| /home/mherwig/dev/ocx/.github/workflows/docker-publish.yml:205-206, build-windows-shims.yml:244-245 | Where ocx already attests | same | The two attested artifacts; model for the missing one |
| /home/mherwig/dev/ocx/website/src/docs/in-depth/signing.md and cosign-parity.md | ocx signing design | same | Bundle v0.3, ECDSA P-256, `--key` mode, cosign interop |
| /home/mherwig/dev/ocx/website/src/docs/reference/environment.md:842-848 | `OCX_NO_VERIFY` | same | What the opt-out disables; flag wins over variable |
| /home/mherwig/dev/ocx/website/src/docs/installation.md:124-132 | Manual install flow | same | The documented trust flow: sha256 only |
| /home/mherwig/dev/ocx-sdk-python/.claude/artifacts/sdk-design.md:944-960 | Python SDK open items | 2026 | "SDK adopts both when they land" |
| https://github.com/ocx-sh/ocx/releases/tag/v0.6.5 (read via `gh release view`, `gh api`) | Release asset list and digests | 2026-10-07 | Ground truth for F2 |
| /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-security-binary-attestation/ | Fixtures for F11 | 2026-10-11 | Reproduce every red/green line |
