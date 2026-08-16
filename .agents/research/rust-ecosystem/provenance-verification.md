---
title: Provenance and Signature Verification for OCI Artifacts
topic: rust-ecosystem
phase: 4 (deep dive)
model: sonnet
date: 2026-08-14
grounded_by: ocx @ HEAD, grimoire @ HEAD (both read 2026-08-14); ghcr.io tested live 2026-08-14
axis: cuts across ecosystem (rust-cargo/crates-of-record.md) and tooling/CI (rust-cargo.md, rust-quality/security.md) — owned by neither
rule_prefix: PROV (candidate; not yet assigned into a published ruleset)
---

# Provenance and Signature Verification for OCI Artifacts

Scope: **verification**, not generation. ocx and grimoire already generate
signed build provenance for what they publish
(`actions/attest-build-provenance`, REL-04/SEC-29). Neither verifies
anything it consumes — no cosign, no Sigstore, no in-toto attestation check,
anywhere in either tree. This document establishes what a defensible
verification policy would cost and require, and is explicit that the answer
is **not yet — but the deferral should be a standing decision, not a gap
nobody noticed.**

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   - [1. The OCI side: referrers, notation, in-toto](#1-the-oci-side-referrers-notation-in-toto)
   - [2. Rust libraries: sigstore-rs](#2-rust-libraries-sigstore-rs)
   - [3. Keyless verification specifics](#3-keyless-verification-specifics)
   - [4. The crates.io side](#4-the-cratesio-side)
   - [5. The failure-mode question](#5-the-failure-mode-question)
3. [Applied to the codebases](#applied-to-the-codebases)
4. [Normative guidance candidates](#normative-guidance-candidates)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

Digest verification proves an artifact wasn't corrupted or truncated in
transit and matches what *this pull, right now* claims. It says nothing
about whether the artifact is what the original publisher intended to ship.
Both ocx and grimoire recompute the SHA-256 of every manifest and blob they
pull and compare it against the registry-claimed digest
([`verify_raw_bytes_digest`](#applied-to-the-codebases), SEC-19 already
mandates this) — that check is real and it is sound. But the digest it
checks against comes from the registry, for a mutable tag, at the moment of
the pull. Once a digest is written into a lockfile, every later `install`
re-verifies against *that* pin, which is a real integrity guarantee against
a passive MITM or a swapped mirror. The gap is the moment the digest first
enters the lock — resolving a tag during `add`/`update` — which is pure
trust-on-first-use. ocx's own architecture docs name this exactly:
["the D3 trade-off consciously accepts TOFU-until-lockfile; supply-chain
hardening is a separate ADR"](#applied-to-the-codebases). That ADR does not
exist yet in either tree.

Building it now is not recommended. Three independent primary sources
converge on the same conclusion: `sigstore-rs` states in its own README that
it "will not be considered stable until the 1.0 release" and shipped a
breaking change (cosign v3 verification, dropped rust-crypto) in its most
recent release; ghcr.io — tested live against a real ocx package on
2026-08-14 — returns `404 MANIFEST_UNKNOWN` for the OCI 1.1 referrers API,
which is the standard discovery mechanism a verifier would use; and
`sigstore-rs`'s own README says plainly it "does not handle verification of
attestations yet" — the exact envelope PyPI's PEP 740 and npm provenance
both use to carry SBOM/provenance claims. Verifying a bare cosign signature
is buildable today; verifying an in-toto attestation (what SLSA provenance,
SBOMs, and PEP 740 actually are) is not, with this library, yet.

The asymmetry the task named is real and already visible in-tree: ocx signs
its own `ghcr.io` images and Windows shim binaries with GitHub's
Sigstore-backed `attest-build-provenance` action, and its own source
comment calls `gh attestation verify` "the real provenance control" —  but
that verify step is a **manual PR-checklist item**, never run by CI, and
never run by the tool at pull time. grimoire generates no attestations at
all. Both consume third-party OCI content (base images, mirrored tools) and
crates.io dependencies with zero authenticity check beyond TLS and the
digest-matches-itself test.

## Findings

### 1. The OCI side: referrers, notation, in-toto

The OCI Distribution Spec v1.1 added a dedicated discovery endpoint,
`GET /v2/<name>/referrers/<digest>`, returning an `image.index` of every
manifest whose `subject` field points at `<digest>` — this is how a client
finds "is there a cosign signature / SBOM / in-toto attestation attached to
this artifact" without guessing a tag name. A compliant registry that
supports the API **must not** return 404 for it, even with zero referrers —
it returns an empty index. Where the API is absent, the spec defines a
fallback: a tag of the form `<algorithm>-<hex-digest>` (e.g.
`sha256-aaaa…`) is expected to resolve to the same index
[[OCI distribution-spec, referrers section]](https://raw.githubusercontent.com/opencontainers/distribution-spec/main/spec.md).
Cosign's original attachment scheme (which predates OCI 1.1) uses this
exact tag convention with `.sig`/`.att`/`.sbom` suffixes, so cosign continues
to work against a registry that never adopted the dedicated endpoint.

**ghcr.io does not implement the referrers endpoint, tested live
2026-08-14.** Against a real published ocx artifact
(`ghcr.io/ocx-sh/ocx/cli`), a `HEAD` on the `latest` tag correctly resolves
and returns `docker-content-digest:
sha256:f8615313f840b6ed89f60d8dbe9b74eced464f1a4b808af0fe78e800e95b629d`
(HTTP 200) — the manifest exists and the registry knows it. A `GET
/v2/ocx-sh/ocx/cli/referrers/sha256:f861…` against that *same, confirmed-to-
exist* digest returns `HTTP 404 {"errors":[{"code":"MANIFEST_UNKNOWN"}]}`.
Per spec, a registry that supports the API must not 404 here; it must
return an empty index. This is what ocx's own internal research
(`research_ghcr_constraints.md`, read below) independently found and cited
against [github/community#163029](https://github.com/orgs/community/discussions/163029):
GitHub's own `attest-build-provenance` action pushes `subject`-bearing
manifests to ghcr.io (they exist, `docker buildx imagetools inspect` shows
them) but the registry's referrers *query* endpoint is unimplemented — GitHub
Attestations discovery goes through a separate GitHub API, not the OCI
spec's mechanism.

Notary v2 (`notation`) is the alternative signing scheme, standardized under
the same `subject`-field/referrers mechanism as cosign — it differs in
signature envelope (COSE/JWS) and trust-store/trust-policy model, not in how
it attaches to the registry
[[notaryproject/notaryproject]](https://github.com/notaryproject/notaryproject/blob/main/README.md).
Neither project's spec repo shows evidence of one winning outright; registries
that support referrers generally support discovering either.

in-toto attestations are the format underneath SLSA provenance, PyPI's PEP
740 attestations, and npm's provenance statements: a signed DSSE envelope
wrapping an in-toto `Statement` (subject digest + `predicateType` + a
predicate body). The framework is stable as a spec but explicitly
"still under development" for tooling integration across languages
[[in-toto/attestation README]](https://github.com/in-toto/attestation/blob/main/README.md).
On an OCI registry, an in-toto attestation is just another `subject`-linked
manifest discovered the same way a cosign signature is — so everything said
above about ghcr.io's referrers gap applies equally to attestation discovery,
not just signature discovery.

### 2. Rust libraries: sigstore-rs

[`sigstore`](https://crates.io/api/v1/crates/sigstore) on crates.io: newest
version **0.14.0**, published **2026-05-22** (crates.io API, authoritative
timestamp — a GitHub releases-page fetch mis-rendered this as "2025"; trust
the API). 826,009 lifetime downloads. Description: *"An experimental crate
to interact with sigstore."* Its README states, verbatim: *"This crate is
under active development and will not be considered stable until the 1.0
release."* [[sigstore-rs README]](https://raw.githubusercontent.com/sigstore/sigstore-rs/main/README.md).
This is the ECO-02 pattern in reverse: unlike a `+deprecated` suffix
signalling death, this is a maintained, sigstore-org-owned, Apache-2.0
project (the canonical Rust binding) whose own maintainers say not to treat
it as stable — 826K downloads is not evidence against that.

**Release cadence and breaking changes** (crates.io `versions[].created_at`,
authoritative):
- 0.14.0 (2026-05-22): *"feat!: Drop rust crypto & wasm target, align with
  Sigstore algs"*, *"feat!: cosign v3 signature verification"* — two breaking
  changes in one release.
- 0.13.0 (2025-10-16): Edition 2024, moved releases to Trusted Publishing.
- 0.12.x (2025-05): removed `ring`, enabled native cert store with rustls.

**What it can verify, as of 0.14.0:** keyless/Fulcio signature verification,
key-based cosign sign/verify, bundle verification (Rekor-produced bundles),
SCT verification. **What it explicitly cannot:** *"The crate does not handle
verification of attestations yet"* — stated in its own README. That is the
in-toto/SLSA/SBOM envelope, not the bare signature — the gap that matters
most for a package manager wanting to check "was this built by the CI it
claims" rather than just "was this blob signed by someone with a cert."

**Crypto/TLS stack, read from `Cargo.toml` directly**
[[sigstore-rs Cargo.toml, fetched 2026-08-14]](https://raw.githubusercontent.com/sigstore/sigstore-rs/main/Cargo.toml):
```toml
default = ["full", "native-tls"]
native-tls = ["oci-client?/native-tls", "reqwest?/native-tls"]
rustls-tls = ["oci-client?/rustls-tls", "reqwest?/rustls"]
...
[target.'cfg(not(target_arch = "powerpc64"))'.dependencies]
aws-lc-rs = { version = "1" }
```
Two separate findings here:

1. **Its default feature set pulls `native-tls` (OpenSSL), not rustls.**
   Adding `sigstore = "0.14"` with no feature changes puts `native-tls`/
   `openssl-sys` straight into the dependency graph both repos' `deny.toml`s
   are supposed to ban (SEC-14) — but currently don't enforce (`[bans].deny`
   is empty in both, per the ecosystem consolidation's Violated table). The
   fix is mechanical and known: `default-features = false, features =
   ["cosign", "rustls-tls"]`.
2. **Its own cryptographic primitives (ECDSA-P256 verify, SHA-256) run on
   `aws-lc-rs` unconditionally**, regardless of the TLS feature choice — this
   is the *same* provider `reqwest`'s `rustls` feature already selects in
   both trees (ECO-07/ECO-08's premise). So the "second crypto stack" risk
   ECO-18…21 warns about for TLS providers does **not** materialize for
   sigstore-rs's verification math — only for its own HTTP transport, and
   only if the default features are left on.

**A sharper cost: `sigstore-rs`'s `cosign`/`registry`/`mock-client` features
depend on `oci-client = { version = "0.17", default-features = false,
optional = true }`** — the exact crate ocx and grimoire vendor as a 33-commit
hardened fork via `[patch.crates-io]` (ECO-12…17). Because `[patch]`
redirects every crate-graph edge to `oci-client` by name, Cargo would likely
route sigstore-rs's dependency through the same patched fork automatically
— *provided* the fork's declared version stays within sigstore-rs's `"0.17"`
requirement. Adding sigstore-rs is exactly the kind of "routine" dependency
addition ECO-13 warns detaches a patch silently (`warning: Patch … was not
used`, never a hard error) the moment a version range drifts — it just adds
a second, independent consumer whose requirement must also be checked on
every fork rebase, not a wholesale new risk.

**A build-surface cost specific to a read-only verifier**: the `verify`
feature requires `fulcio`, and `fulcio` pulls `oauth` → `openidconnect` +
`webbrowser` — the interactive OAuth device/browser flow used for *signing*
(obtaining an OIDC token to request a Fulcio cert), not verifying. A
verify-only build still compiles and links this code, because the feature
graph doesn't separate "verify a cert chain against a known Fulcio root"
from "interactively obtain one." This is dead weight for a package manager
that will never sign, confirmed by reading the feature graph directly
(`cosign = [..., "verify"]`, `verify = [..., "fulcio"]`, `fulcio =
["dep:webbrowser", ..., "oauth"]`).

**Alternative: shell out to the `cosign` binary.** This avoids the Rust
dependency-graph cost entirely but trades it for: pinning and verifying the
`cosign` binary itself (a chicken-and-egg problem — SEC-21/22 already govern
spawning a downloaded binary by absolute path with argument-injection
guards), parsing CLI output instead of a typed API, and a process-spawn per
verification instead of an in-process call. `cosign`'s CLI itself now
*enforces* identity scoping at the flag level (see §3) — which is a genuine
advantage: the safety rail is baked into the binary's argument parser, not
something the calling code can accidentally omit.

### 3. Keyless verification specifics

Fulcio is the free, CA for OIDC-bound code-signing certificates: it *"only
issues short-lived certificates that are valid for 10 minutes,"* binds the
cert's SAN to the OIDC identity (email or workflow identity), and publishes
issued certs to Certificate Transparency for monitoring. It is General
Availability with a 99.5% SLO and semver-stable API
[[Fulcio README]](https://github.com/sigstore/fulcio/blob/main/README.md).
Rekor is the append-only transparency log: entries are recorded with a
Merkle inclusion proof, so a client (or a third-party monitor) can prove an
entry exists in the log without trusting the log operator not to have
silently omitted it. **Rekor v1 is in maintenance mode; v2 is a rewritten
tile-based log backed by Trillian-Tessera** [[Rekor README]](https://github.com/sigstore/rekor/blob/main/README.md)
— any integration should expect the bundle/proof format to move again.

**The standard mistake is verifying "a valid Fulcio certificate exists"
without checking *whose* it is.** A Fulcio certificate proves an OIDC
provider vouched for an identity at signing time — it does not, by itself,
say the signer is anyone you'd trust. Both of the two most mature keyless
verification tools now make identity scoping **mandatory, not optional, at
the argument level** — direct primary-source evidence, not inference:

- `cosign verify`'s own flag help: *"Either --certificate-identity or
  --certificate-identity-regexp must be set for keyless flows"* and the same
  for `--certificate-oidc-issuer`
  [[cosign `doc/cosign_verify.md`, fetched from source]](https://raw.githubusercontent.com/sigstore/cosign/main/doc/cosign_verify.md).
- `gh attestation verify`'s Cobra command definition:
  `verifyCmd.Flags().MarkFlagsOneRequired("owner", "repo")` — the CLI refuses
  to parse without one, before any cryptographic check runs
  [[cli/cli `pkg/cmd/attestation/verify/verify.go`]](https://raw.githubusercontent.com/cli/cli/trunk/pkg/cmd/attestation/verify/verify.go).

Both tools converged on the same design independently: identity is not a
knob a caller can leave unset and still get a meaningful "verified" result.
A correct identity policy names the expected OIDC issuer (e.g.
`https://token.actions.githubusercontent.com`) *and* the expected
subject/SAN (e.g. a specific `repo:org/repo:ref:refs/heads/main` claim, not
a regex loose enough to match any fork's workflow) — sigstore's
policy-controller documents this as an array of `{issuer, subject}` pairs on
a keyless authority [[policy-controller overview]](https://docs.sigstore.dev/policy-controller/overview/).
The mistake this guards against: "verified: signature valid" reads as a
security control to anyone glancing at output, whether or not an identity
was ever pinned — the wrong default is silently permissive, which is exactly
why both tools removed the option to be silently permissive.

### 4. The crates.io side

**Trusted Publishing (OIDC-based publish auth) is real and shipped**, not
merely proposed. [RFC 3691](https://raw.githubusercontent.com/rust-lang/rfcs/master/text/3691-trusted-publishing-cratesio.md)
merged 2024-12-13 (confirmed via the GitHub API's `merged_at` field); the
crates.io source repository contains a live `trustpub` controller module as
of this fetch (2026-08-14). It scopes initially to GitHub Actions, with
GitLab/CircleCI planned as follow-ups. This is **already covered** by
REL-06 in `rust-cargo.md` ("Dormant until a first crates.io publish") — cited
here only to confirm current (2026-08) ship status, not to re-litigate it.

**This is authentication for the publish step, not a signature on the
artifact.** No evidence of crates.io artifact **signing** was found: the
crates.io repository's `docs/` directory has no signing-related file, and
neither the Cargo Book's publishing reference nor its registry-index
reference mentions a cryptographic signature anywhere.

**What `cargo` actually verifies on fetch: a checksum, not a signature.**
The registry index's `cksum` field is documented, verbatim: *"A SHA256
checksum of the `.crate` file"* [[Cargo Book — Registry Index]](https://doc.rust-lang.org/cargo/reference/registry-index.html).
This is the same self-consistency check as SEC-19/`verify_raw_bytes_digest`
below — it proves the downloaded bytes match what the index (served by
crates.io, over TLS) currently claims for that version, not that the
version was published by whoever the crate's ostensible owner is. The index
itself carries no signature. `cargo` performs no GPG, cosign, or Sigstore
verification of any kind on a crate download — this is a negative finding
from reading the Cargo Book's own reference pages directly, not a search
snippet.

### 5. The failure-mode question

Four other ecosystems have already answered "what does defensible
verification look like," with different trade-offs:

- **npm provenance**: generates an in-toto/SLSA attestation via Sigstore
  (Fulcio + Rekor), restricted to GitHub Actions and GitLab CI/CD — supported
  CI only, no local `npm publish --provenance` from a laptop. `npm audit
  signatures` verifies registry signatures and attestations on demand.
  Explicitly: *"does not guarantee the package has no malicious code"* — it
  proves origin, not safety. Verification is **opt-in on the consumer side**
  (`npm audit signatures` is a separate command, not part of `npm install`)
  [[npm docs — generating provenance statements]](https://docs.npmjs.com/generating-provenance-statements).
- **PyPI / PEP 740**: standardizes the attestation upload/serving format
  (in-toto Statement + DSSE), Final/accepted 2024-07-17. It deliberately
  takes no position on enforcement: *"This PEP does not make a policy
  recommendation around mandatory digital attestations on release uploads or
  their subsequent verification by installing clients like pip"*
  [[PEP 740]](https://peps.python.org/pep-0740/). Format standardized;
  verification policy is punted to each client.
- **Homebrew**: SHA-256 checksum is committed *inside the Formula source
  file itself* — the Formula's own trust root is code review + signed commits
  on the `homebrew-core` repo, not a signature on the downloaded artifact
  [[Homebrew Formula-Cookbook.md]](https://raw.githubusercontent.com/Homebrew/brew/master/docs/Formula-Cookbook.md).
  No GPG/cosign check of the upstream release exists; the checksum is only
  as trustworthy as the PR review that added it.
- **apt/dpkg (SecureApt)**: the most mature model here — GPG-signs the
  `Release` file, which carries checksums for every `Packages` file, which in
  turn lists a hash for every `.deb`. This is a real chain of custody from a
  human-reviewed signing key down to the byte. It **fails closed by
  default**: an unsigned/unverifiable repo produces *"WARNING: The following
  packages cannot be authenticated!"* and requires an explicit interactive
  override to proceed [[Debian wiki — SecureApt]](https://wiki.debian.org/SecureApt).
  Known weaknesses: MD5-era collision exposure (migrated to SHA-256 by
  0.7.7), and no standardized third-party-repo key distribution — the
  "curl a key off some website" pattern that undermines the model in
  practice even where the mechanism is sound.

**What a defensible policy looks like, synthesized:** fail-closed by
default (apt's model, not npm's opt-in-command model) with a **named**
escape hatch, never a generic environment-variable bypass a script can set
accidentally. Both ocx and grimoire already have the right *shape* for this
— `--allow-insecure-store`, `--allow-http-registry`/`insecure = true` are
explicit, named, single-purpose flags, never a blanket `INSECURE=1`. Any
verification feature should extend that same naming convention rather than
invent a new one. **Verification that only runs in CI on the project's own
build is theatre for a consumer**: it proves what the project *shipped*, not
what a user's `install`/`add`/`pull` actually *received* — the runtime pull
path is the only place a check has any value, and neither tool's pull path
runs one today (§ Applied, below).

## Applied to the codebases

Evidence read directly from `ocx @ HEAD` and `grimoire @ HEAD` on
2026-08-14, plus one live registry probe against `ghcr.io` on the same date.

### Digest verification exists and is sound (the floor SEC-19 requires)

- `ocx/crates/ocx_lib/src/oci/client.rs:2051` — `verify_raw_bytes_digest`
  recomputes `claimed.algorithm().hash(raw_bytes)` and hard-errors
  (`ClientError::DigestMismatch`) on mismatch; called at `client.rs:1943`
  inside `fetch_manifest_raw_bytes_capped`, with an explicit doc comment
  naming it *"the write-path trust anchor"* per `adr_index_indirection.md`
  A3. Regression tests at `client.rs:2174` and `:2181`.
- `grimoire/src/oci/access/registry_client.rs:429-439` — inside
  `pull_blob`, after the size-capped `CappedSink` streaming read completes,
  `digest.algorithm().hash(&bytes)` is recomputed and compared, with a
  comment: *"Defence in depth: verify the bytes hash to the requested digest
  before handing them up."*

Both are recompute-and-compare against the **registry-claimed** digest for
the reference just resolved — not against any independently-known-good
value. Neither is a signature check; SEC-32 already states this is a
deliberate, documented absence ("digest verification and no signature
verification"), and this document does not relitigate that pinned decision.

### The TOFU moment is real, and the project has already named it

- `ocx/.claude/artifacts/adr_public_index_registry_indirection.md:371-373`
  — under "Deferred / Out of Scope": *"Signing / provenance / index-level
  digest pinning — the D3 trade-off consciously accepts TOFU-until-lockfile;
  supply-chain hardening is a separate ADR."*
- `ocx/.claude/artifacts/design_spec_registry_indirection.md:23-25` — same
  scope cut, listed under "Out of scope (deferred per ADR, do not build
  here)."
- Once a digest **is** in the lockfile, both `ocx/crates/ocx_lib/src/project/lock.rs`
  and `grimoire/src/lock/grimoire_lock.rs` pin per-platform digests (not
  bare tags) — so a subsequent `install` against an existing lock re-verifies
  bytes against that fixed pin, catching a registry swap on a version
  already installed once. The TOFU window is specifically first-resolution
  (`add`/`update`), not every pull.
- No `adr_*signing*` / `adr_*provenance-verif*` file exists in either repo's
  `.claude/artifacts/` or `.agents/adr/` — the deferred ADR the project's own
  docs reference has not been written.

### No signature/attestation verification exists, anywhere

- `grep -rn 'sigstore\|cosign\|notation\|in.toto\|slsa'` across both trees'
  `*.rs`/`*.toml` returns zero real hits — the only near-matches are
  substring collisions (`annotations.rs` containing the literal substring
  `notation`), confirmed by inspection, not signal.
- No `sigstore` (or any Sigstore/cosign) crate in either `Cargo.lock`.

### The signing/verifying asymmetry, concretely

- `ocx/.github/workflows/docker-publish.yml:206` and
  `ocx/.github/workflows/build-windows-shims.yml:237` — both run
  `actions/attest-build-provenance@a2bbfa2…` (v2.2.3), producing
  Sigstore-backed SLSA provenance for the ghcr.io image and the committed
  Windows shim blob respectively, with `push-to-registry: true` on the
  Docker leg.
- `ocx/crates/ocx_lib/src/shim.rs:28-29` — doc comment: *"CI
  (`build-windows-shims.yml`) reproducibly rebuilds and asserts
  byte-equality + `gh attestation verify` (the real provenance control..."*
  — but reading the workflow itself
  (`ocx/.github/workflows/build-windows-shims.yml:233-237`) shows CI runs
  only the *generation* step (`attest-build-provenance`); the adjacent
  comment on line 235 says *"Refresh-PR checklist adds `gh attestation
  verify`"* — i.e. a **human, manual, PR-checklist step**, not something CI
  enforces. The source comment overstates what CI actually does.
- `ocx/.claude/artifacts/adr_sbom_strategy.md:201` — *"This produces a
  Sigstore-signed in-toto attestation, verifiable with `gh attestation
  verify`. Provides SLSA Build Level 2 provenance. **Not in scope for the
  initial implementation** — evaluate after the base SBOM generation is
  validated."* — a first-party admission that verification was consciously
  deferred, independent of this research task.
- `grimoire/.github/workflows/publish-catalog.yml` and `publish-ocx.yml`
  contain **zero** `attest` references — grimoire generates no build
  provenance at all, unlike ocx. The signing side is inconsistent within the
  family; the verifying side is uniformly absent.

### ghcr.io's referrers API — live-tested, not assumed

- Probe run 2026-08-14 against a real published artifact:
  `HEAD https://ghcr.io/v2/ocx-sh/ocx/cli/manifests/latest` → `200`,
  `docker-content-digest:
  sha256:f8615313f840b6ed89f60d8dbe9b74eced464f1a4b808af0fe78e800e95b629d`.
  `GET https://ghcr.io/v2/ocx-sh/ocx/cli/referrers/sha256:f861…` (same,
  confirmed-existing digest) → `404 {"code":"MANIFEST_UNKNOWN"}`.
- ocx's own prior research reaches the identical conclusion independently:
  `ocx/.claude/artifacts/research_ghcr_constraints.md:17-18,58,98,107` —
  *"GHCR's registry endpoint itself has **not** implemented the
  `/v2/<name>/referrers/<digest>` API,"* citing
  [github/community#163029](https://github.com/orgs/community/discussions/163029),
  and recommends: *"Do not build anything around GHCR's Referrers API; ...
  design against GitHub's Attestations API or a registry-agnostic mechanism
  instead."*
- Separately, ocx's own index-indirection scheme already emits and
  round-trips the OCI `subject` field for its own package-linking purposes —
  `ocx/crates/ocx_lib/src/oci/index/ocx_index.rs:1355,1365`,
  `wire.rs:538-539`, `local_index.rs:1109,1299,1317` all construct or parse
  an image index carrying `"subject": {"mediaType": ...,"digest": ...}`.
  This is architecturally adjacent to consuming a `subject`-linked
  signature/attestation manifest, but nothing today queries the referrers
  endpoint or verifies anything found there — the plumbing exists for a
  different purpose (ocx's own package indirection, not third-party
  signature discovery).
- The pseudo-tags visible on the live repo (`sha256.016cb5f5…`, note the
  literal dot, not the spec's hyphen) are ocx's own chained-index tag scheme
  (`ocx/crates/ocx_lib/src/oci/index/chained_index.rs`), not the OCI 1.1
  referrers tag-fallback convention — confirming ocx built a
  registry-agnostic workaround rather than relying on ghcr.io referrers
  support, consistent with its own research recommendation above.

### The "insecure" escape hatches that exist are for transport, not for signatures

- `ocx/crates/ocx_cli/src/app/context.rs:72,180,193,217` —
  `insecure_hosts: Vec<String>` resolved from `[registries."<name>"].insecure`
  and `OCX_INSECURE_REGISTRIES`, feeding `plain_http_registries(...)`. This
  governs plain-HTTP transport, not signature bypass.
- `grimoire/src/config/declaration.rs:352-354`,
  `grimoire/src/config/registry_resolve.rs:142-154` — the equivalent
  `insecure: bool` field on a `[[registries]]` entry, same shape.
- There is no `--insecure`/`--no-verify` flag anywhere that bypasses a
  *signature* check, because there is no signature check to bypass. The
  named-escape-hatch convention (§5) is already the house style for the
  controls that do exist; it is the pattern to extend, not invent, if
  verification is ever added.

## Normative guidance candidates

Candidates only — not yet adopted into any ruleset, and deliberately framed
for the deferred ADR both trees already reference rather than for immediate
implementation. None of these duplicate SEC-19 (digest verification, already
mandatory) or SEC-32 (must not claim a control that doesn't exist) — they
extend both, for the day this gets built.

1. **PROV-01 — Any keyless-verification code path MUST require an explicit
   identity constraint (issuer + subject/subject-regex) with no default that
   accepts an unscoped-but-otherwise-valid Fulcio certificate.** Rationale:
   this is the one mistake that makes "verified" a lie while still returning
   `Ok`, and it is precisely what both `cosign verify` and `gh attestation
   verify` now enforce at the argument-parsing layer, independently of each
   other. Verification: a unit test asserting that a syntactically valid
   Sigstore bundle signed by an *unexpected* identity is rejected, not
   merely that an unsigned artifact is rejected; the verifier's public
   constructor has no code path that omits the identity parameter. **MUST**
   (when built).
2. **PROV-02 — Verification MUST fail closed by default; a Rekor/Fulcio
   network error, timeout, or malformed bundle is a hard error, never a
   silent skip. Any bypass is a single named flag, following the existing
   `--allow-insecure-store`/`insecure = true` convention** — never a generic
   environment variable a CI script could set by accident. Rationale: this
   is what separates apt's model (fails closed, interactive override
   required) from theatre; both repos already have the naming pattern to
   extend. Verification: a fault-injection test that severs network access
   to Rekor/Fulcio mid-verify asserts an `Err`, not an `Ok`/skip; `rg -n
   '<verify-fn-name>' | rg -v 'unwrap_or\(true\)|\.ok\(\)'` around the call
   site. **MUST** (when built).
3. **PROV-03 — Verification MUST run in the runtime pull path
   (`ocx_lib::oci::client` / `grimoire::oci::access`), not only as a
   release-time CI check on the project's own artifacts.** Rationale: a
   CI-only check (which is all that exists today — `attest-build-provenance`
   generation with a manual `gh attestation verify` PR-checklist item) proves
   what the project shipped; it says nothing about what a user's `install`
   actually received from a base image, a mirror, or a third-party OCI
   source. Verification: the function implementing signature/attestation
   verification is reachable from the same call site as
   `verify_raw_bytes_digest`/`pull_blob`'s digest check, not only from a
   `.github/workflows/*.yml` step. **MUST** (when built).
4. **PROV-04 — Design against GitHub's Attestations API or the legacy
   tag-based fallback convention, not the OCI 1.1 referrers endpoint, for
   any ghcr.io-targeted feature.** Rationale: confirmed live, 2026-08-14 —
   `ghcr.io` returns 404 for `/v2/<name>/referrers/<digest>` against a
   real, existing manifest digest; ocx's own prior research reached the
   same conclusion independently. Verification: re-run the two-curl probe
   in this document's Applied section before relying on referrers-API
   availability; treat a change to `200` as the trigger to revisit this
   candidate, not a standing assumption. **SHOULD** (when built).
5. **PROV-05 — If `sigstore-rs` is adopted, pin `default-features = false,
   features = ["cosign", "rustls-tls"]` explicitly (never the crate's own
   `default = ["full", "native-tls"]`), and add its `oci-client = "0.17"`
   requirement to the ECO-13 fork-compatibility check on every rebase.**
   Rationale: the crate's defaults pull `native-tls`/OpenSSL, which
   `deny.toml` is meant to ban (SEC-14); its crypto math already runs on
   `aws-lc-rs`, the same provider already selected, so this is a feature-flag
   discipline problem, not a second-crypto-stack problem. Verification:
   `cargo tree -i native-tls -i openssl-sys` stays empty after the crate is
   added; the ECO-13 patch-detachment check (`cargo build 2>&1 | rg 'was not
   used in the crate graph'`) includes sigstore-rs's dependency edge, not
   only the two existing direct consumers. **SHOULD** (when adopting).
6. **PROV-06 — Sequence the first verification target as the project's own
   already-signed artifacts (ocx's ghcr.io image, its Windows shim blob),
   not third-party base images or crates.io dependencies.** Rationale: this
   is the smallest bounded slice — it reuses a trust root (GitHub's
   attestation-signing identity) the project already emits into via
   `attest-build-provenance`, turning an existing manual PR-checklist step
   into an automated one, before attempting the much larger problem of
   deciding what identity to trust for artifacts this project did not sign.
   It is also the natural home for the eventual `ocx self update` (ECO-20
   already commits that flow to ocx's own OCI client) to verify what it
   pulls. Verification: the first shipped verifier call site names a single
   hardcoded expected identity (this project's own GitHub Actions OIDC
   subject), not a configurable trust policy — configurability is a later
   problem. **CONSIDER**.

## Contested / evolving

- **Rekor v1 → v2.** v1 is in maintenance mode; v2 rewrites the log as a
  tile-based structure on Trillian-Tessera. Any bundle-format assumption
  baked into code today should expect to be revisited — this is not a
  hypothetical, it's an announced transition with no fixed date found in
  the sources reviewed.
- **OCI 1.1 referrers adoption is uneven and mid-transition.** ocx's own
  research lists ECR, ACR, Harbor, and Zot as adopting; ghcr.io — the
  registry both ocx and grimoire actually use — is not, as of the live test
  in this document. Any design assuming universal referrers support is
  premature for this specific pair of codebases' actual registry.
- **`sigstore-rs` cannot verify in-toto attestations.** This is the
  single largest gap between "what this library can do" and "what PEP
  740/npm-provenance/SLSA actually need verified" — a bare cosign signature
  check is not equivalent to checking a provenance/SBOM attestation, and the
  crate says so itself. Revisit when the crate's changelog shows attestation
  verification landing.
- **crates.io's roadmap beyond Trusted Publishing is unclear.** Trusted
  Publishing hardens *who* can push; nothing found here suggests crates.io
  plans artifact signing analogous to npm provenance or PEP 740 attestations
  — this may simply not have been prioritized yet, not a considered
  rejection. Worth re-checking on the next sweep rather than treating as
  settled either way.
- **cosign vs. Notary v2 (`notation`).** Both are live, both attach via the
  same OCI `subject`-field mechanism, and nothing in the sources reviewed
  shows the ecosystem converging on one over the other — a registry
  supporting referrers generally supports discovering signatures from
  either scheme, so this is a signing-tool choice, not an availability
  constraint, and out of this document's verification-only scope regardless.

## Sources

| Source | What it established | URL |
|---|---|---|
| OCI Distribution Spec, referrers section | Endpoint shape, 404 semantics, tag-fallback schema, MUST/SHOULD language | https://raw.githubusercontent.com/opencontainers/distribution-spec/main/spec.md |
| ghcr.io, live probe 2026-08-14 | Referrers endpoint returns 404 against a confirmed-existing manifest digest | `HEAD`/`GET` against `ghcr.io/v2/ocx-sh/ocx/cli/...` (this session) |
| ocx `research_ghcr_constraints.md` | First-party, independent confirmation of the same referrers gap, citing github/community#163029 | `ocx/.claude/artifacts/research_ghcr_constraints.md` (local) |
| crates.io API — `sigstore` crate | `updated_at`/`newest_version`/`description`, authoritative version dates | https://crates.io/api/v1/crates/sigstore |
| sigstore-rs README | Stability disclaimer, supported/unsupported verification features (no attestation verify) | https://raw.githubusercontent.com/sigstore/sigstore-rs/main/README.md |
| sigstore-rs `Cargo.toml` | Feature graph, `default = ["full","native-tls"]`, `oci-client = "0.17"` dependency, unconditional `aws-lc-rs` | https://raw.githubusercontent.com/sigstore/sigstore-rs/main/Cargo.toml |
| sigstore-rs GitHub releases | Recent breaking changes (0.14.0: cosign v3, dropped rust-crypto) | https://github.com/sigstore/sigstore-rs/releases |
| Fulcio README | Short-lived cert issuance model, GA status, SLO | https://github.com/sigstore/fulcio/blob/main/README.md |
| Rekor README | Transparency-log model, v1 maintenance mode / v2 Trillian-Tessera | https://github.com/sigstore/rekor/blob/main/README.md |
| cosign `doc/cosign_verify.md` (source) | `--certificate-identity`/`--certificate-oidc-issuer` are mandatory for keyless verify | https://raw.githubusercontent.com/sigstore/cosign/main/doc/cosign_verify.md |
| GitHub CLI `attestation/verify/verify.go` (source) | `MarkFlagsOneRequired("owner","repo")` — identity mandatory at parse time | https://raw.githubusercontent.com/cli/cli/trunk/pkg/cmd/attestation/verify/verify.go |
| sigstore policy-controller overview | Keyless identity-policy shape (`issuer`+`subject` array) | https://docs.sigstore.dev/policy-controller/overview/ |
| notaryproject/notaryproject README | Notary v2 spec scope, COSE/JWS envelopes, active maintenance | https://github.com/notaryproject/notaryproject/blob/main/README.md |
| in-toto/attestation README | Statement + predicate model, SLSA relationship, tooling maturity | https://github.com/in-toto/attestation/blob/main/README.md |
| PEP 740 | PyPI attestation format (in-toto+DSSE), Final 2024-07-17, explicitly punts on enforcement policy | https://peps.python.org/pep-0740/ |
| npm docs — provenance statements | Sigstore-backed provenance, GH Actions/GitLab-only, `npm audit signatures`, explicit "no malware guarantee" | https://docs.npmjs.com/generating-provenance-statements |
| Debian wiki — SecureApt | GPG Release-file chain of trust, fails closed, MD5→SHA256 history | https://wiki.debian.org/SecureApt |
| Homebrew `Formula-Cookbook.md` | SHA-256-in-formula trust model, no signature on upstream artifact | https://raw.githubusercontent.com/Homebrew/brew/master/docs/Formula-Cookbook.md |
| Cargo Book — Registry Index | `cksum` field is SHA-256 of the `.crate` file; no signature field | https://doc.rust-lang.org/cargo/reference/registry-index.html |
| Cargo Book — Publishing | No mention of trusted publishing or signing (confirms scope) | https://doc.rust-lang.org/cargo/reference/publishing.html |
| RFC 3691 (rust-lang/rfcs) | crates.io Trusted Publishing design, merged 2024-12-13 | https://raw.githubusercontent.com/rust-lang/rfcs/master/text/3691-trusted-publishing-cratesio.md |
| rust-lang/crates.io repo, live check 2026-08-14 | `trustpub` controller module present (shipped); no signing-related docs | https://raw.githubusercontent.com/rust-lang/crates.io/main/src/controllers/trustpub/mod.rs (200) |
| `ocx/crates/ocx_lib/src/oci/client.rs`, `ocx/.../shim.rs`, `.github/workflows/{docker-publish,build-windows-shims}.yml`, `.claude/artifacts/{adr_public_index_registry_indirection,design_spec_registry_indirection,adr_sbom_strategy}.md` | Digest-verification implementation; signing-vs-verifying asymmetry; TOFU self-admission | local repo, read 2026-08-14 |
| `grimoire/src/oci/access/registry_client.rs`, `.github/workflows/{publish-catalog,publish-ocx}.yml`, `src/config/{declaration,registry_resolve}.rs` | Digest verification; no attestation generation at all; insecure-transport flag shape | local repo, read 2026-08-14 |
| `.agents/research/rust-ecosystem.md`, `rules/rust-cargo.md`, `rules/rust-cargo/crates-of-record.md`, `rules/rust-quality/security.md` | Prior-art check: SEC-19/SEC-32/REL-04/REL-06/ECO-12…17 already published; this document extends, does not duplicate | local repo (grimoire-lore), read 2026-08-14 |
