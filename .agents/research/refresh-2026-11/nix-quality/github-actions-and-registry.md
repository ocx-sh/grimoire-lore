---
title: nix-quality delta, GitHub Actions and ghcr.io facts
pair: nix-quality
date_researched: 2026-11-27
window_start: 2026-09-27
model: sonnet
sources_fetched: 14
---

# nix-quality delta: GitHub-side facts, 2026-09-27 to 2026-11-27

This is a delta update of the baseline research. Only facts that moved are listed as changes. Dates come from the releases.atom feeds (full ISO timestamps), the actions/runner-images README, and live anonymous probes. The GitHub REST API was rate limited for this user at fetch time, so no release SHA beyond the one named below was verified.

## Verdicts per claim

### NIX-GATE-13, install-nix-action v31.11.1 and "hardcodes 2.35.2": CHANGED

Old text: "install-nix-action v31.11.1, commit 13d8dd58da0234aa297dedd986986ccb8e7f3e24 (2026-08-13)" and "v31.11.1 hardcodes 2.35.2".

New facts, from https://github.com/cachix/install-nix-action/releases.atom and https://github.com/cachix/install-nix-action/releases:

- The v31.11.1 date and "nix: 2.35.1 -> 2.35.2" are confirmed (2026-08-13T14:23:34Z). The pinned commit is therefore valid but stale.
- v31.11.2 (2026-10-14): Nix 2.35.2 to 2.35.3.
- v31.11.3 (2026-10-27): 2.35.3 to 2.35.4.
- v31.11.4 (2026-11-11): 2.35.4 to 2.35.5.
- v31.11.5 (2026-11-11, short SHA 3dc140b): 2.35.5 to 2.35.6. The floating tag v31 points at it.
- v32.0.0 (2026-11-20, short SHA bb0495a): 2.35.6 to 2.36.0. A new major.
- v32.1.0 (2026-11-23, full SHA `382a9ed9481c7c1f94f68b72ef105b3417c73877`, verified at https://github.com/cachix/install-nix-action/commit/382a9ed): release notes mention `install_sha256`, no Nix bump stated, so it keeps 2.36.0 (inferred from v32.0.0 and the absence of a bump line). The floating tag v32 (2026-11-24) points at 382a9ed.
- Latest release is v32.1.0, hardcoding Nix 2.36.0 (inferred as above). Latest v31 line is v31.11.5 with 2.35.6.

The rule text (SHA-pin, pass `install_url`, "the action SHA fixes Nix only implicitly") is unchanged in substance and is now demonstrated: five Nix bumps in 3.5 months. Only the example version, SHA and date need refreshing. Whether v32.0.0 changed anything breaking besides the Nix bump was not read (the release body shows only the bump line).

Candidate edit (normative, evidence cell only): replace the pinned example with v32.1.0 and commit 382a9ed9481c7c1f94f68b72ef105b3417c73877 (2026-11-23), and say "hardcodes 2.36.0". Rationale: a stale example SHA teaches readers to pin an old Nix. Verification: `grep -n "install-nix-action" skills/nix-quality-reference/gates.md` shows the new SHA, and the cross-check that `nix-2.36.0` is a published release at https://releases.nixos.org/nix/nix-2.36.0/install (not fetched in this run, so run it before writing). NIX-SEC-06 already lists 2.36.0 as measured green, so its floor logic needs no change.

### NIX-GATE-14, cache-nix-action v7 (2026-01-08): CHANGED (minor)

Source: https://github.com/nix-community/cache-nix-action/releases.atom and /releases.

- The atom feed timestamps are 2026-01-18 (v7.0.0, v7.0.1) and 2026-01-30 (v7.0.2, and the floating tag v7), while the release page labels show "31 Dec", "08 Jan", "17 Jan" and "30 Jan". The two sources disagree on dates (feed timestamps follow tag updates, page labels follow publication), so the "2026-01-08" in the baseline is not contradicted but is not confirmed either. Treat dates as could not determine exactly.
- Newer than the baseline wording: v7.0.2 is latest (fixes Nix below 2.33 being rejected, more precise version check). v7.0.1 checkpoints the Nix store database before saving. No v8 exists in the feed as of 2026-11-27.
- Nothing in the window (after 2026-09-27) changed. Verdict for "v7 is current": unchanged. The cited date could name v7.0.2 (2026-01-30) as the latest patch if the rule wants a SHA-pinnable example.
- The v7 notes list support for the cachix and Determinate install actions and "caching only /nix by default". Neither contradicts the rule.

Open question, GitHub's 10 GB Actions cache cap: CHANGED, but before the window. https://github.blog/changelog/2025-11-20-github-actions-cache-size-can-now-exceed-10-gb-per-repository/ (2025-11-20) lets repository admins raise the cap above 10 GB, pay-as-you-go. Docs at https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching state the 10 GB and seven-day defaults still apply at no cost, with LRU eviction, and a configurable ceiling up to 10,000 GB. So the open question is answerable: the cap is a default, not a hard limit, but raising it bills. The default pinned posture (no billing) is unchanged. This landed 10 months before the window, so the baseline missed it; it is not a window event. Candidate note (not a rule change): when NIX-GATE-14 mentions the cap, say it is a default that admins can raise at a cost. Verification: the dependency-caching doc page above.

### NIX-GATE-15, runner labels: CHANGED, the list needs editing

Old text: "`ubuntu-24.04`, `ubuntu-24.04-arm` and one Apple-silicon macOS runner (`macos-15` or `macos-14`)".

Source: https://github.com/actions/runner-images/blob/main/README.md and https://github.com/actions/runner-images/issues/15226.

- `macos-14` retired from GitHub Actions on 2026-11-02 (README: "All macOS 14 images retired from GitHub Actions on November 2, 2026"; issue 15226 lists the same date for Intel and arm64). The README table still lists `macos-14` marked "(deprecated)" for x64 only. The README text that the retirement "does not apply to Arm64" refers to the Azure DevOps Intel extension to 2026-11-23, not to GitHub Actions. A workflow that names `macos-14` should now fail to get a runner.
- `macos-15` (arm64, labels `macos-15`, `macos-15-xlarge`) is listed. `macos-26` (arm64, `macos-26`, `macos-26-xlarge`) is listed, and `macos-latest` now points at macOS 26 arm64. Intel images (`macos-15-intel`, `macos-26-intel`) exist but the rule says add no Intel macOS, which stays correct.
- `ubuntu-24.04` and `ubuntu-24.04-arm` are still listed and valid. `ubuntu-latest` now points at Ubuntu 26.04 (`ubuntu-26.04`, `ubuntu-26.04-arm` also exist). The README gives no date for the `ubuntu-latest` move, so the date of that change could not be determined.

Candidate edit (normative): change "(`macos-15` or `macos-14`)" to "(`macos-15` or `macos-26`)" and change the source cell to "GitHub-hosted runner labels, 2026-11 (macos-14 retired 2026-11-02)". Rationale: a rule that offers a retired label sends readers to a failing job. Verification: `grep -n "macos-14" rules/nix-quality.md skills/nix-quality-reference/*.md` is empty after the edit, and each remaining label appears in the runner-images README table. Optional, not required: mention that `ubuntu-26.04` exists; a fixed `ubuntu-24.04` stays correct because the rule pins labels instead of using `-latest`.

### NIX-GATE-12, SHA pinning: UNCHANGED in window, rationale source available

No new org-level SHA-pinning policy or immutable-action change was found in the window. The enforcement policy already existed: https://github.blog/changelog/2025-08-15-github-actions-policy-now-supports-blocking-and-sha-pinning-actions/ (2025-08-15) lets an owner require full-length commit SHAs (REST field `sha_pinning_required`, API version 2026-03-10), and the dependency-lockfile docs describe locked dependencies. Neither changes the rule. The github.blog changelog index (fetched) showed no Sep or Oct 2026 entries and nothing on SHA pinning in November. Search coverage was limited to snippets of docs and one changelog, so a complete negative is not proven. Optional candidate: cite the 2025-08-15 policy as the platform enforcement of NIX-GATE-12 (verification: open the changelog URL). Not required.

### NIX-GEN-05, 08, 10 and Dates and Floors, ghcr.io anonymous behaviour: UNCHANGED, one part needs re-measurement

Live anonymous probes on 2026-11-27, no credentials (the anonymous `ghcr.io/token` flow and the literal `Authorization: Bearer QQ==` header, against the public packages `nixos/nix` and `astral-sh/uv`):

- Header-less blob GET on `ghcr.io/v2/nixos/nix/blobs/sha256:6287c0aa...`: 401. Matches the claim.
- The same blob with `Authorization: Bearer QQ==`: 307 to `https://pkg-containers.githubusercontent.com/ghcrblobs03/blobs/sha256:6287c0aa...`. Matches the claim. The URL expiry (about 10 minutes) was not re-measured here.
- Manifest GET without an Accept header on `astral-sh/uv:latest`, with either the QQ header or an anonymous token: 404 with `content_type: application/json`. Matches "a bare 404" on an OCI-index package. On `nixos/nix` (Docker v2 manifest list) the same request returns 200, so the 404 depends on the package's media type, which the baseline wording ("without Accept: application/vnd.oci.image.manifest.v1+json") already implies.
- Needs re-measurement: with `Accept: application/vnd.oci.image.index.v1+json` the `astral-sh/uv:latest` request returned 403, and `application/vnd.oci.image.manifest.v1+json` also returned 403. This is not explained by the baseline claims. The probe may have hit a package-specific restriction rather than a registry change. The positive path (correct Accept returning 200) was confirmed only on `nixos/nix` (200 for a manifest list Accept and for the digest GET). The grimoire/OCI-manifest package that NIX-GEN-08 actually targets was not probed because it is not named in the commission. Re-measure against that package before editing.

Does a ghcr.io behaviour change break NIX-GEN-08? No change was observed: header-less 401, QQ 307, bare 404 all reproduce. The docs page https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry says only "You can also access public container images anonymously" and lists a 10-minute upload timeout. It does not document the QQ behaviour, which remains undocumented behaviour, as the baseline already treats it. No source announced a change.

### NIX-GEN-16, `peter-evans/create-pull-request@v7`: CHANGED

Source: https://github.com/peter-evans/create-pull-request/releases.atom.

- v8.0.0 shipped 2025-12-09 (moves to actions/checkout v6, needs runner 2.327.1 or later for Node 24 on self-hosted). v8.1.0 2026-01-21, v8.1.1 2026-04-10, v8.1.2 2026-11-09, v8.1.3 2026-11-10 (latest; fixes signed-commit pushes). The last v7 release is v7.0.11 (2025-12-05).
- So the rule's v7 reference is a superseded major, and was already superseded at the baseline date (v8 predates 2026-09-27). In the window only the patches v8.1.2 and v8.1.3 landed. Nothing in the window broke v7 users, and no deprecation notice for v7 was found.
- Candidate edit: change "@v7" to the current v8 line (v8.1.3, SHA to be resolved with `git ls-remote https://github.com/peter-evans/create-pull-request refs/tags/v8.1.3`, not resolved in this run). Rationale: the compliant PR action should be the supported major. Verification: `grep -n "create-pull-request@" skills/nix-quality-reference/generated-flakes.md` shows the v8 SHA with a version comment.

### NIX-INP-11, default GITHUB_TOKEN does not trigger CI on a bot PR: UNCHANGED

https://github.com/peter-evans/create-pull-request/blob/main/docs/concepts-guidelines.md still says PRs created with the default `GITHUB_TOKEN` cannot trigger other workflows, and recommends a PAT, a GitHub App token, draft plus `ready_for_review`, or deploy keys. The GitHub changelog index showed nothing in the window that changes this. One adjacent change: a 2026-11-02 changelog entry says `pull_request_target` is blocked by default on December 2 (title as shown on the index page; the entry body was not opened). It concerns `pull_request_target` and does not touch the bot-PR token behaviour. A reader of NIX-INP-11 or NIX-GATE-12 does not use `pull_request_target` there, so no edit is needed, but if any exemplar workflow in the pair uses it, open the entry and re-check before 2026-12-02.

## Summary

| Claim | Verdict |
|---|---|
| NIX-GATE-13 (v31.11.1, 2.35.2) | changed: latest v32.1.0, Nix 2.36.0 (2026-11-23); v31 line latest v31.11.5, 2.35.6 |
| NIX-GATE-14 (v7) | unchanged in window; v7.0.2 is latest patch; 10 GB cap is raisable since 2025-11-20 |
| NIX-GATE-15 (runners) | changed: `macos-14` retired 2026-11-02; edit the list |
| NIX-GATE-12 (SHA pins) | unchanged in window |
| NIX-GEN-05/08/10 (ghcr.io) | unchanged for 401, 307 and bare 404; Accept-header positive path needs re-measurement on the target package |
| NIX-GEN-16 (create-pull-request v7) | changed: v8.1.3 current since 2026-11-10 (v8 since 2025-12-09) |
| NIX-INP-11 (token behaviour) | unchanged |

## Not determined

- Full 40-hex SHAs for v31.11.5, v32.0.0 and create-pull-request v8.1.3 (the GitHub API was rate limited).
- The date `ubuntu-latest` moved to 26.04.
- Whether `nix-2.36.0` install URL exists on releases.nixos.org (not fetched).
- The Nix version of v32.1.0 (inferred, not stated).
- The target OCI package behaviour for NIX-GEN-08.
