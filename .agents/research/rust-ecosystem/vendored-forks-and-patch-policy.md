---
title: Vendored Dependency Forks, [patch] Policy, and Audit Blind Spots
topic: Fork ownership, [patch.crates-io] mechanics, and supply-chain audit coverage for OCX/Grimoire's oci-client and docker_credential forks
agent: inv-vendored-forks
model: sonnet
date_researched: "2026-08"
sources_count: 17
scope: >
  Empirical investigation of the ocx repo's two git-submodule forks
  (external/rust-oci-client, external/docker_credential) consumed via
  [patch.crates-io], cross-checked against Cargo's own reference docs and
  the primary source of cargo-deny, rustsec, cargo-auditable, and
  cargo-cyclonedx to determine exactly what each audit/SBOM tool records
  for a patched dependency, plus divergence accounting and upstreaming status.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

1. `[patch.crates-io]` is the only correct mechanism here; `[source] replace-with` requires the replacement to be **content-identical** to what it replaces and explicitly refuses divergent code — Cargo's own docs say so and name `[patch]` as the tool for exactly this case.
2. **Cargo.lock records no pin at all for these two crates.** A normal registry dependency gets a `source = "registry+..."` + `checksum = "..."` line; the path-patched `oci-client`/`docker_credential` entries have neither — verified directly against `ocx/Cargo.lock`. The *only* thing pinning the fork's revision is the git submodule gitlink SHA committed in the superproject's tree.
3. The submodule gitlink is a real commit-SHA pin, not a moving branch pointer — `.gitmodules`' `branch = ocx/integration` field is metadata for `git submodule update --remote` only; a plain `git submodule update --init` (what CI's `actions/checkout@*` with `submodules: true|recursive` does) always checks out the committed SHA regardless of what the upstream branch has since done. No workflow in the repo runs `--remote`. The pin holds.
4. Because Cargo.lock carries no source/checksum for the patched crates, `cargo update`/`cargo update -p oci-client` cannot silently advance them (there's nothing lock-recorded to advance) — but it also means nobody can audit the fork's pinned revision from Cargo.lock or `cargo tree` output alone; it must be read from `git ls-tree`/`git submodule status`.
5. **The real footgun is version-requirement drift, not lock drift.** `[patch]` only applies while the patch crate's own declared version (`0.17.0` in the fork's `Cargo.toml`) still satisfies the workspace's requested range (`oci-client = "0.17"`). If that range is ever bumped (by hand or by Renovate, which *does* see this plain version string) past what the fork declares, Cargo's documented behavior is to silently fall back to unpatched upstream and emit only a `warning: Patch ... was not used in the crate graph`, not a hard error — a build could quietly lose the empty-trust-store fix and the SSRF/redirect hardening with nothing but an easy-to-miss cargo warning as evidence.
6. Both forks keep the exact upstream version string (`0.17.0`, `1.3.3`) — this is what makes RustSec-style advisory matching degrade gracefully to name+version (see next point) but also what makes accidental patch-drop (point 5) resolve to a real, matching upstream version instead of erroring on a missing version.
7. `cargo-deny check advisories`/`cargo audit` **will still match** a RustSec advisory filed against upstream `oci-client 0.17.0` against the patched path dependency: the underlying `rustsec` crate's `Query::matches()` only applies its source filter `if let Some(package_source) = &self.package_source`, and a Cargo.lock package with no recorded source (our case) leaves that `None`, so matching silently degrades to name+version only — read directly from `rustsec`'s source.
8. That is a mixed blessing: it means the tools will **not** miss an advisory that also affects the fork's unmodified code (good, if noisy) — but it also means every upstream advisory against `oci-client 0.17.0`/`docker_credential 1.3.3`, even one the fork already independently fixed, becomes a false-positive gate that needs a manually-justified `deny.toml` ignore entry.
9. **The blind spot that no tool closes**: none of these scanners can ever produce a finding for a vulnerability introduced by the fork's *own* code — RustSec's advisory-db only tracks the published crates.io package; nobody files a CVE against a private git fork. The fork's ~1,475 changed lines (`src/client.rs` alone: +1,066/-?) are permanently outside RustSec/cargo-deny/cargo-audit coverage. This is structural, not a tool bug, and is the actual finding to act on.
10. `cargo-auditable`'s embedded `.dep-v0` schema **does** have a `source` field (`CratesIo` / `Git` / `Local` / `Registry`) — so a path-patched dependency is recorded as `Local`, distinguishable from a real crates.io package in principle — but "all URLs and file paths are redacted" in the embedded data, so the binary's own audit trail can say *this is local*, never *this is which fork at which commit*.
11. `cargo-cyclonedx` similarly **does** encode non-crates.io provenance: for a path dependency (`package.source == None` from `cargo metadata`) it adds a `file://`-style PURL qualifier pointing at the crate's on-disk path (relative, inside the workspace) — confirmed by reading `purl.rs` directly. The base identity of the PURL, however, is still `pkg:cargo/oci-client@0.17.0` — identical to real upstream.
12. Per the Package URL spec, `qualifiers` are an explicitly optional, type-specific component separate from the `type/namespace/name/version` identity that hierarchically anchors a PURL. Standard vulnerability-matching workflows (Grype, Trivy, OSV/GHSA lookups, Dependency-Track) key on that core identity; the fork-marking qualifier cargo-cyclonedx adds is present in the SBOM XML for a human to notice but is not what automated downstream scanners normally compare on. **A shipped `bom.xml` is functionally indistinguishable from real upstream `oci-client 0.17.0` to any downstream automated consumer**, even though the raw field to tell them apart is technically present.
13. The repo's own SBOM ADR (`adr_sbom_strategy.md`) already flagged half of this in March 2026 as an open risk — "cargo-cyclonedx *should* respect `[patch.crates-io]`... but this should be verified" — and proposed only a one-time manual spot-check of the first generated `bom.xml`, not a standing CI check. There is no evidence that spot-check, or any recurring verification, has ever been run.
14. Zero of the fork's 33 commits ahead of `v0.17.0` (oci-client) and zero of docker_credential's one ahead-of-tag commit have an open or merged upstream PR from the `ocx-sh` org — `gh pr list` against both upstream repos returns none authored by the org. One change (`fix(client): Allow null in /tags/list responses`) *did* independently land upstream (PR [#277](https://github.com/oras-project/rust-oci-client/pull/277)) via a third party, meaning the fork can drop its own copy of that fix on the next rebase — a small, real, achievable exit-criterion win sitting unclaimed.
15. `subsystem-deps.md` in the ocx repo references a `feedback_submodule_upstream_pr.md` file as the place upstreaming status is tracked. That file does not exist anywhere in the repository (checked exhaustively). The upstreaming obligation is asserted in prose but has no accounting artifact — precisely the gap the deliverable is asked to close.
16. Renovate's `git-submodules` manager is opt-in/beta and disabled by default; `ocx/renovate.json` only enables `cargo`, `github-actions`, `dockerfile`, and `npm` managers — it never opts into `git-submodules`. Renovate therefore never proposes advancing either fork's pinned commit; rebasing onto upstream releases is 100% manual and has no automated staleness signal.
17. Renovate's `cargo` manager *does* see the plain `oci-client = "0.17"` / implicit `docker_credential` version requirements in `Cargo.toml` and can open a `chore(deps)` PR bumping them independent of the fork — which is exactly the mechanism in finding 5 that can silently drop the patch if merged without also rebasing the submodule and bumping the fork's own declared version in lockstep.
18. `deny.toml`'s `unknown-git = "allow"` is required for this setup to pass `cargo deny check bans` at all (path deps under submodules trip the "unknown source" ban otherwise) — it is a deliberate, load-bearing, and correctly-documented exception, not an oversight.
19. `quality-core.md`'s "Bar for owning it" tier 2 ("a library exists but leaks substantial features genuinely needed") already names the oci-client fork as its own canonical precedent — the *rule* that forking is legitimate here already exists in-repo; what's missing is the *operational half*: a per-change upstreaming ledger and exit criteria, which this deliverable supplies.
20. The verification claims above (advisory matching, SBOM purl shape, `.dep-v0` source field) are derived from reading the actual source of `rustsec`, `cargo-deny`, and `cargo-cyclonedx` — not from their prose docs, which do not state any of this explicitly. Treat the "Verification" line on each normative rule below as the reproducible command that re-derives the same conclusion locally.

## Findings

### 1. `[patch]` vs `[source] replace-with` — mechanism confirmation

Cargo's overriding-dependencies reference states the core constraint on source replacement directly: *"Cargo has a core assumption about source replacement that the source code is exactly the same from both sources... As a consequence, source replacement is not appropriate for situations such as patching a dependency... Cargo supports patching dependencies through the usage of the `[patch]` key"* — [Overriding Dependencies — Source Replacement](https://doc.rust-lang.org/cargo/reference/source-replacement.html). `[patch]`, by contrast, is explicitly built for divergent content: *"Sources can be patched with versions of crates that do not exist, and they can also be patched with versions of crates that already exist"* — [Overriding Dependencies](https://doc.rust-lang.org/cargo/reference/overriding-dependencies.html). ocx's forks carry genuinely different code (see §3), so `replace-with` would be a spec violation the moment Cargo tried to checksum-verify it; `[patch.crates-io]` is the only mechanism that fits, and `ocx/Cargo.toml` already uses it correctly.

### 2. What actually pins the fork's revision

Empirically, in `/home/mherwig/dev/ocx/Cargo.lock`, a normal registry crate carries both `source` and `checksum`:

```
[[package]]
name = "tokio"
version = "1.53.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "202caea871b69668250d242070849eb495be178ed697a3e98aebce5bc81a0bed"
```

The patched crates carry neither:

```
[[package]]
name = "oci-client"
version = "0.17.0"
dependencies = [ "bytes", "chrono", "futures-util", "hex", ... ]
```

Cargo.lock literally cannot pin a path dependency to a revision — there is no revision concept at that layer. The *only* artifact pinning what code actually builds is the git submodule gitlink (`git submodule status` → `a4d92857d392c139aec4a5156b1818cedd6ec04d external/rust-oci-client (v0.17.0-49-ga4d9285)`), i.e. a commit SHA recorded in the superproject's own tree. `.gitmodules`' `branch = ocx/integration` key only feeds `git submodule update --remote`, which none of the repo's ~15 checkout call sites use (all use `submodules: true` or `submodules: recursive`, which check out the committed SHA) — [git-submodule(1)](https://git-scm.com/docs/git-submodule) documents `--remote` as the only mode that consults the tracked branch. This gives an *equivalent* immutability guarantee to `git = "...", rev = "<sha>"` in Cargo.toml (both are SHA pins immune to upstream force-push/branch-move), but through a different audit surface: a reviewer checking "what commit are we building" must read `git submodule status` or `git ls-tree HEAD external/rust-oci-client`, not `Cargo.lock` or `cargo tree`.

### 3. The version-requirement footgun (patch silently stops applying)

`[patch]` only takes effect while the patch's own declared version is semver-compatible with what's requested elsewhere in the graph. The fork's `Cargo.toml` declares `version = "0.17.0"`; the workspace requests `oci-client = "0.17"`. If that requirement is ever advanced (manually, or by Renovate's `cargo` manager, which parses this plain version string with no awareness it feeds a patch) past what the fork's `Cargo.toml` declares, the patch stops matching. Cargo's documented behavior for an unapplied patch is a warning, not a hard failure — [Overriding Dependencies](https://doc.rust-lang.org/cargo/reference/overriding-dependencies.html) covers patch application but the "unused patch" diagnostic is a `cargo build`-time stderr warning (`Patch ... was not used in the crate graph`), easily lost in CI logs unless explicitly grepped for. The practical failure mode: the empty-trust-store fix, the SSRF `dns_resolver` seam, and the cross-host-upload-credential-leak fixes (see §5) would silently disappear from the build, replaced by real unpatched upstream code that happens to satisfy the new version range.

### 4. Advisory matching: name+version, source filter degrades to none

Read directly from `rustsec`'s query engine (`rustsec/src/database/query.rs`, fetched from [rustsec/rustsec@main](https://github.com/rustsec/rustsec/blob/main/rustsec/src/database/query.rs)):

```rust
if let Some(package_source) = &self.package_source {
    let advisory_source = advisory.metadata.source.as_ref().cloned().unwrap_or_default();
    if advisory_source.kind() != package_source.kind()
        || advisory_source.url() != package_source.url() {
        return false;
    }
}
```

The source check is conditional on `self.package_source` being `Some`. `Query::package()` sets it from the Cargo.lock-derived package's `source` field — which, per §2, is `None` for our path-patched crates. With no source to compare, the block is skipped and matching falls through to name+version alone (checked earlier in the same function via `advisory.versions.is_vulnerable(package_version)`). `cargo-deny check advisories` (`src/advisories.rs`, [EmbarkStudios/cargo-deny@main](https://github.com/EmbarkStudios/cargo-deny/blob/main/src/advisories.rs)) delegates straight to `rustsec::Report::generate(&ctx.cfg, advisory_dbs, ctx.krates, ...)` over the *entire* dependency graph with no source-based filtering of its own — path/git crates are not excluded from the scan. Net effect: an advisory against `oci-client 0.17.0` **will** fire against the patched path dependency, correctly or not, because both forks kept the identical upstream version string. `cargo audit` shares this behavior — it is built on the same `rustsec` crate.

### 5. Divergence: what each fork actually changes

`external/rust-oci-client` (`git diff --stat v0.17.0..HEAD` inside the submodule, 33 commits, since 2026-05-19):

```
src/client.rs      | 1066 ++++++++++++++++++++++++++++++----
src/manifest.rs    |  131 +++++
tests/cross_host_upload.rs | 181 ++++++
tests/digest_validation.rs |  122 +++-
... 1475 insertions(+), 119 deletions(-) across 13 files
```

Named by commit subject: refuse a TLS-dropping redirect; refuse a plaintext token realm against an HTTPS registry; refuse a cross-host upload session instead of silently stripping auth; stop a cross-host upload Location leaking registry credentials; stop a chunk push committing bytes the registry never stored; seed bundled CA roots in `ClientConfig::default()` (the empty-trust-store fix cited in the brief); add an injectable `dns_resolver` (SSRF pin seam); preserve HTTP status distinction on token-auth failures; `mount_blob` returns a typed response instead of erroring on a 202 miss. **One commit — "Allow null in `/tags/list` responses" — already landed upstream independently** as [oras-project/rust-oci-client#277](https://github.com/oras-project/rust-oci-client/pull/277) (merged), making it a ready-now exit candidate on the next rebase. None of the other 32 commits have an open or merged PR from the `ocx-sh` org against `oras-project/rust-oci-client` (`gh pr list --repo oras-project/rust-oci-client` shows no ocx-authored PRs, open or closed).

`external/docker_credential` diverges by one commit ahead of its last tag (`1.3.3`): `feat: add store/erase/list helpers and safety guards`. No corresponding PR exists against `keirlawson/docker_credential` either.

Every change above is a security-relevant hardening fix to a wire-protocol/credential client — squarely inside `quality-core.md`'s tier-2 bar for owning non-domain code ("a library exists but leaks substantial features genuinely needed"), which the rule text names this exact fork as precedent for.

### 6. SBOM/attestation: what `cargo-auditable` and `cargo-cyclonedx` actually record

`cargo-auditable`'s embedded JSON schema (fetched from [rust-secure-code/cargo-auditable@main](https://github.com/rust-secure-code/cargo-auditable/blob/main/cargo-auditable.schema.json)) defines a required `source` field per package with enum values `CratesIo | Git | Local | Registry`, and the project's own docs state *"All URLs and file paths are redacted, but the crate names and versions are recorded as-is."* — [rust-secure-code/cargo-auditable README](https://github.com/rust-secure-code/cargo-auditable#readme). So a scan of the shipped binary's `.dep-v0` section would show `oci-client, 0.17.0, source: Local` — flagged as non-crates.io, but with no path, URL, or commit to identify *which* fork or *which* revision.

`cargo-cyclonedx`'s PURL generator (`cargo-cyclonedx/src/purl.rs`, [CycloneDX/cyclonedx-rust-cargo@main](https://github.com/CycloneDX/cyclonedx-rust-cargo/blob/main/cargo-cyclonedx/src/purl.rs)) branches explicitly on `package.source`:

```rust
if let Some(source) = &package.source {
    if !source.is_crates_io() { /* git → vcs_url qualifier */ }
} else {
    // source is None for packages from the local filesystem.
    // package_dir encoded as a file:// qualifier
}
```

So the generated `bom.xml` entry for the patched `oci-client` carries a `file://`-style qualifier pointing at the relative on-disk submodule path — real, present, inspectable. But per the [PackageURL spec](https://github.com/package-url/purl-spec/blob/master/docs/specification/standard/specification.md), qualifiers are an explicitly optional component layered on top of the `type/namespace/name/version` identity ("Components are designed such that they form a hierarchy from the most significant on the left to the least significant components on the right" — qualifiers rank below version). Standard vulnerability-matching against OSV/GHSA-style feeds (Grype, Trivy, Dependency-Track) keys on that core identity; the base PURL for both forks is still `pkg:cargo/oci-client@0.17.0`. **A downstream SBOM consumer doing routine PURL-based vulnerability matching will not distinguish the shipped patched binary from real upstream `oci-client 0.17.0`.** The repo's own `adr_sbom_strategy.md` (2026-03-13) flagged this as an open, unverified risk ("cargo-cyclonedx *should* respect `[patch.crates-io]`... but this should be verified") and proposed only a one-time manual `bom.xml` spot-check, not a recurring CI gate — and no evidence in the repo shows that check was ever performed or automated.

### 7. Renovate coverage

`renovate.json`'s `packageRules` enable `cargo`, `github-actions`, `dockerfile`, and `npm` managers via `config:recommended` plus custom rules — [ocx/renovate.json](https://github.com/ocx-sh/ocx/blob/main/renovate.json). Renovate's `git-submodules` manager is beta and explicitly opt-in — *"Git Submodules functionality is currently in beta testing, so you must opt-in to test it"*, default `"enabled": false` — [Renovate docs: git-submodules manager](https://docs.renovatebot.com/modules/manager/git-submodules/). It is not opted into here. Renovate therefore (a) never proposes advancing either fork's pinned commit toward upstream releases, and (b) *does* still see and can bump the plain `oci-client = "0.17"` version string via its `cargo` manager — the exact mechanism that can silently break the patch per §3 if merged without a matching submodule/version bump.

## Normative guidance candidates

1. **Never let a version-requirement bump for `oci-client`/`docker_credential` land without a matching fork rebase in the same PR.** Rationale: `[patch]` silently stops applying (warning, not error) the moment the workspace's requested range outruns the fork's declared version, quietly reverting to unpatched upstream. Verification: `cargo build 2>&1 | grep -i "was not used in the crate graph"` must be empty after any dependency bump touching these two crates; additionally `cargo metadata --format-version1 | jq '.packages[] | select(.name=="oci-client") | .source'` must print `null` (path/local), never a `registry+...` string.
2. **Treat the submodule gitlink, not Cargo.lock, as the authoritative pin for these two crates in review.** Rationale: Cargo.lock carries no `source`/`checksum` for path-patched deps (confirmed empirically), so lock-diff review misses fork-revision changes entirely. Verification: `git diff --stat <base>..<head> -- external/rust-oci-client external/docker_credential` in the *superproject* (gitlink diff), not `git diff Cargo.lock`.
3. **Never run `git submodule update --remote` in CI or scripts for these paths.** Rationale: it would silently move the "locked" build onto whatever the tracked branch (`ocx/integration`) points to *today*, defeating the SHA pin the same way tracking `branch =` instead of `rev =` would for an ordinary git dependency. Verification: `grep -rn "submodule update.*--remote\|submodules:.*true.*# tracking" .github/ taskfiles/` returns nothing.
4. **Do not trust `cargo deny check advisories` / `cargo audit` to confirm a fork-introduced vulnerability is absent.** Rationale: RustSec advisory-db only tracks the published crates.io package name — it structurally cannot cover code that only exists in the fork's own diff. Verification: any change to `external/rust-oci-client/src/*.rs` or `external/docker_credential/src/*.rs` requires a `security-review`-tier human/opus code review pass, tracked separately from the routine `cargo deny check` CI gate.
5. **Every un-upstreamed fork commit needs a live tracking record (issue or ledger file), not a prose promise.** Rationale: `subsystem-deps.md` already references a `feedback_submodule_upstream_pr.md` that does not exist in the repo — the obligation is asserted with no accounting artifact, and `gh pr list` confirms zero PRs were ever opened for 33+1 divergent commits. Verification: `test -f feedback_submodule_upstream_pr.md` (or wherever the ledger lands) plus a row-count check that it lists every commit `git log --oneline v0.17.0..HEAD` shows in the submodule.
6. **Rebase-and-drop `fix(client): Allow null in /tags/list responses` from the fork on the next sync**, since it landed upstream verbatim as [#277](https://github.com/oras-project/rust-oci-client/pull/277). Rationale: free reduction of maintained diff surface. Verification: after rebasing onto a `v0.17.x`/`v0.18.0` tag containing #277, `git diff --stat <new-tag>..HEAD` should show one fewer file touched in `src/client.rs`'s null-handling region.
7. **Spot-check the generated `bom.xml`/`.dep-v0` after every fork rebase, and treat "PURL matches upstream" as expected, not reassuring.** Rationale: the SBOM's `file://` qualifier is real but is not what downstream automated scanners (Grype/Trivy/Dependency-Track) key on for vulnerability matching — the base `pkg:cargo/oci-client@0.17.0` identity is indistinguishable from real upstream regardless of qualifier correctness. Verification: `cargo cyclonedx -p ocx_cli 2>&1` then `grep -A3 'name="oci-client"' bom.xml` — confirm a `qualifiers`/`vcs_url` or `file://`-bearing purl is present, and separately document (in the fork ledger from rule 5) that this qualifier is advisory-only, not scanner-load-bearing.
8. **Opt into Renovate's `git-submodules` manager scoped to `external/*`, or explicitly document why not.** Rationale: without it, staleness against upstream releases (`v0.17.0` → whatever comes after) has zero automated signal — the fork can drift arbitrarily far with nothing surfacing it. Verification: `renovate.json` contains a `git-submodules` block with `"enabled": true` scoped to `external/rust-oci-client` and `external/docker_credential`, or a `renovate.json` comment recording the deliberate opt-out and the manual cadence that replaces it.
9. **Never widen the `oci-client`/`docker_credential` version requirement without also confirming `cargo tree -p oci-client` resolves to the path entry, not a registry entry, in the same PR's CI run.** Rationale: this is the single concrete command that would have caught the finding-5 footgun before merge. Verification: add `cargo tree -p oci-client -p docker_credential --format "{p} {r}"` (or `cargo metadata | jq`) as a CI assertion step gated on any diff touching the `Cargo.toml` version lines for these two crates.
10. **Keep `unknown-git = "allow"` in `deny.toml` scoped and commented, never blanket-loosened further.** Rationale: it is required for the submodule setup to pass `cargo deny check bans` at all, and is already correctly justified in-repo — the risk is a future contributor loosening `unknown-registry` the same way "because unknown-git already needed it," which would defeat the license/source allowlist entirely. Verification: `deny.toml`'s `[sources]` block still reads `unknown-registry = "deny"` alongside `unknown-git = "allow"`.

## AI-agent angle

An autonomous agent asked to "bump oci-client" will, by default, edit the plain `oci-client = "0.17"` version string in `Cargo.toml` (the only edit a naive dependency-bump task pattern-matches on) and run `cargo update` — which will appear to succeed, because `[patch]` silently stops applying rather than erroring, and the newly-requested version resolves against real crates.io. The agent will report success; the build will compile; the empty-trust-store fix and SSRF pin will be gone with only a stderr warning as the trace. The smallest mechanical check that catches this: after *any* edit to a line matching `oci-client\s*=` or `docker_credential\s*=` in `Cargo.toml`, run `cargo metadata --format-version1 | jq -r '.packages[] | select(.name=="oci-client" or .name=="docker_credential") | .source'` and require both lines to print literal `null` — a non-null (`"registry+..."`) result means the patch silently detached. This is a one-line, deterministic, no-network check an agent can and should run before considering any dependency-bump task in this repo complete; it should be added to whatever pre-merge gate this codebase already runs for `Cargo.toml` diffs (see `subsystem-deps.md`'s "Adding a Dependency" checklist, which currently has no equivalent step for patched crates).

A second, subtler failure: an agent asked to "check for known vulnerabilities in oci-client" and told `cargo deny check advisories` passes will incorrectly conclude the fork's 1,475 lines of hand-written protocol/auth-hardening code are vulnerability-free. That check can only ever attest to the *upstream* crate's known-CVE status; it says nothing about the fork's own diff. An agent should be explicitly told (and this file's finding 9 should be encoded as a rule) that any diff under `external/rust-oci-client/src/` or `external/docker_credential/src/` requires the security-review path, never the routine dependency-audit path, regardless of what `cargo deny`/`cargo audit` report.

## Contested / evolving

- **Cargo's own git-dependency docs do not, in as many words, tell you to prefer `rev` over `branch`/`tag`.** The reference page ([Specifying Dependencies](https://doc.rust-lang.org/cargo/reference/specifying-dependencies.html)) presents all three as equally valid syntactic choices and only notes that Cargo locks the resolved commit in Cargo.lock at add-time. The "pin by rev, not branch/tag" rule is broader supply-chain-security community practice (mutable-ref risk), not an explicit Cargo-book mandate — worth stating precisely rather than over-citing the book for a stronger claim than it makes.
- **cargo-auditable's format is versioned and actively changing** (`format` field 0/1/8 in its own schema, moving toward Cargo's native unstable `-Z build-sbom`/SBOM precursor on nightly for more accurate dependency-kind classification) — the redaction-of-paths behavior described here is current as of the schema fetched in this research pass; a future format revision could change what's recorded. Re-check the schema on any `cargo-auditable` version bump.
- **Whether Renovate's beta `git-submodules` manager is safe to enable unattended is genuinely unresolved** — Renovate's own docs badge it as beta, and blindly advancing a fork's submodule pin without also re-running the fork's own test suite (which `ocx/Cargo.toml`'s workspace `exclude` exists specifically to allow) could land an unreviewed upstream commit. The rule above (§8) recommends opting in *scoped and reviewed*, not auto-merged — this is a judgment call the project should make explicitly rather than by Renovate-default omission.
- **No evidence exists, in either direction, that the repo's `deny.toml` `ignore` list has ever needed an entry for a false-positive advisory against the patched crates** (finding 8's predicted friction). This may mean it hasn't happened yet, or that nobody has checked whether an applicable RustSec advisory against `oci-client 0.17.0`/`docker_credential 1.3.3` currently exists. Worth a one-time `cargo deny check advisories -v` audit as part of adopting these rules.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [Overriding Dependencies — Cargo Book](https://doc.rust-lang.org/cargo/reference/overriding-dependencies.html) | Primary Cargo reference | current, 2026 | Defines `[patch]` semantics and how patched crate versions must resolve into the graph |
| [Source Replacement — Cargo Book](https://doc.rust-lang.org/cargo/reference/source-replacement.html) | Primary Cargo reference | current, 2026 | States the content-identity requirement that rules out `replace-with` for this use case |
| [Specifying Dependencies — Cargo Book](https://doc.rust-lang.org/cargo/reference/specifying-dependencies.html) | Primary Cargo reference | current, 2026 | `rev`/`tag`/`branch` git-dependency syntax and Cargo.lock's commit-locking behavior |
| [rustsec/rustsec `query.rs`](https://github.com/rustsec/rustsec/blob/main/rustsec/src/database/query.rs) | Primary source, advisory matching engine | 2026 snapshot | The exact `Query::matches()` logic showing source-filter degrades to name+version for sourceless (path) packages |
| [EmbarkStudios/cargo-deny `advisories.rs`](https://github.com/EmbarkStudios/cargo-deny/blob/main/src/advisories.rs) | Primary source | 2026 snapshot | Shows `cargo deny check advisories` delegates the whole graph (incl. path deps) straight into `rustsec::Report::generate` with no source filtering of its own |
| [rust-secure-code/cargo-auditable `cargo-auditable.schema.json`](https://github.com/rust-secure-code/cargo-auditable/blob/main/cargo-auditable.schema.json) | Primary source, embedded SBOM schema | 2026 snapshot | Defines the `source: CratesIo\|Git\|Local\|Registry` field and its format-revision history |
| [rust-secure-code/cargo-auditable README](https://github.com/rust-secure-code/cargo-auditable) | Primary project docs | 2026 | States URLs/paths are redacted from embedded data while name/version are kept |
| [CycloneDX/cyclonedx-rust-cargo `purl.rs`](https://github.com/CycloneDX/cyclonedx-rust-cargo/blob/main/cargo-cyclonedx/src/purl.rs) | Primary source, PURL generator | 2026 snapshot | Shows exactly how a path/git dependency's PURL qualifier is built vs. a crates.io one |
| [PackageURL spec — specification.md](https://github.com/package-url/purl-spec/blob/master/docs/specification/standard/specification.md) | Primary spec | current | Defines qualifiers as optional/type-specific, subordinate to the type/namespace/name/version identity hierarchy |
| [Renovate docs — git-submodules manager](https://docs.renovatebot.com/modules/manager/git-submodules/) | Primary tool docs | 2026 | Confirms the manager is beta/opt-in and disabled by default |
| [oras-project/rust-oci-client PR #277](https://github.com/oras-project/rust-oci-client/pull/277) | Primary, merged upstream PR | 2026 | The one fork change independently landed upstream — direct exit-criterion evidence |
| [oras-project/rust-oci-client open/merged PR list](https://github.com/oras-project/rust-oci-client/pulls) | Primary, live repo state | 2026 | Confirms zero `ocx-sh`-authored PRs against upstream |
| [keirlawson/docker_credential PR list](https://github.com/keirlawson/docker_credential/pulls) | Primary, live repo state | 2026 | Confirms zero `ocx-sh`-authored PRs against upstream |
| `/home/mherwig/dev/ocx/Cargo.toml`, `Cargo.lock`, `.gitmodules`, `deny.toml`, `renovate.json` | Primary, in-repo source of truth | 2026-08-14 snapshot | Ground truth for how `[patch]`, the submodule, and the lockfile actually interact in this codebase |
| `/home/mherwig/dev/ocx/.claude/rules/subsystem-deps.md`, `.claude/rules/quality-core.md` | Primary, in-repo policy docs | 2026-08-14 snapshot | Existing (partial) policy this deliverable extends; names the missing `feedback_submodule_upstream_pr.md` ledger |
| `/home/mherwig/dev/ocx/.claude/artifacts/adr_sbom_strategy.md` | Primary, in-repo ADR | 2026-03-13 | The project's own prior art flagging the exact SBOM-vs-patch verification gap this research closes |
| `external/rust-oci-client` and `external/docker_credential` git history (`git log`, `git diff --stat` against upstream tags) | Primary, in-repo submodule history | 2026-08-14 snapshot | Direct enumeration of what each fork actually changes against upstream |

