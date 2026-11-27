---
title: Claims and evidence - licence and openness wording
program: product
sub_program: marketing
topic: marketing-claims-evidence
worker: claims-licence-openness
date_researched: 2026-11-27
model: sonnet
sources_fetched: 20
scope: |
  Covers when product copy may say "open source", "free" or "source-available", and what must agree with the LICENSE file. Includes the fleet measurement of LICENSE versus manifest versus copy.
  Does not cover how a licence change is announced (release-deprecation-breaking owns it), trademark clearance of product names, or legal advice on licence choice.
---

# Claims and evidence: licence and openness wording

## Contents

1. Summary
2. Findings (1 OSD; 2 OSI marks; 3 OSAID; 4 SPDX data; 5 wording failures; 6 "free"; 7 fleet measurement)
3. Normative guidance candidates
4. Mapping: licence class to allowed wording
5. Evidence record: licence fields
6. What an agent must not decide alone
7. AI-agent angle
8. Contested / evolving
9. Dated facts
10. Sources

## Summary

- "Open source" is permitted only when the repo's licence is OSI-approved. The check is mechanical: read the SPDX id, look up `isOsiApproved` in the SPDX licence list, and block the phrase otherwise.
- The SPDX list (v3.29.0, released 2026-09-16) marks 154 of 740 entries OSI-approved and 32 deprecated. BUSL-1.1, SSPL-1.0, Elastic-2.0 and the PolyForm and CC-NC licences are all `isOsiApproved: false`. Do not hand-maintain a list.
- Licences that are not OSI-approved get "source-available" (or "fair source" for delayed-open licences), never "open source". The OSI board states a company may not claim or imply that software under an unapproved licence is open source.
- Use the licence's exact SPDX id as the primary claim ("Apache-2.0"). The id is checkable; the adjective is not.
- "Free" on its own is ambiguous. Write "free of charge" for price and "free software" or "open source" only for the freedoms. Never put "free" next to a feature that has a paid tier unless the boundary is stated beside it.
- "Open-source AI" requires data information, complete code and parameters under OSI-approved terms (OSAID 1.0). A weights-only release is "open weights", not "open source".
- Fleet measurement: 18 repos checked; 14 have a LICENSE file, all Apache-2.0 text; every manifest licence field read says `Apache-2.0`; zero LICENSE-versus-manifest disagreements.
- Fleet gaps: 4 repos have no LICENSE file (arcana, e2e-index, grimoire-lore, index). arcana's README claims Apache-2.0 with no file behind it. grimoire-lore ships 75 rules whose frontmatter says `license: Apache-2.0` with no LICENSE in the repo.
- The fleet's own copy rarely claims openness: the only self-description found is `grimoire/docs/public/privacy.html:174` ("private, non-commercial open-source project"), which is accurate under Apache-2.0. The 177-file count in the scout is mostly third-party descriptions and agent-config text, not product claims.
- Wording failures: HashiCorp (2023-08-10) called BSL "source-available" correctly but left "competitive offering" undefined; Redis called its tri-licence both "source-available and open source" and Elastic said "worked". Precision in the term, not the licence choice, is what the checkable rule covers.
- "Open source" must be true of the whole claim scope. A product with an open core and a proprietary edition is "open core"; say which parts are under which licence.
- The word "open source" has no OSI trademark restriction (OSI marks are "OSI", "Open Source Initiative", the logo, "OSI Approved Open Source License"). "OSI Approved" is a registered mark; copy may use it only for licences OSI approved.
- Package manifests are part of the claim: npm, Cargo, PyPI and the OCI `org.opencontainers.image.licenses` annotation each carry an SPDX expression that must equal the LICENSE file.
- Compound licences ("Apache-2.0 OR MIT", "AGPL-3.0-only OR SSPL-1.0") are open source only if every option the user can choose is OSI-approved; if one option is not, copy names which option is which.
- Agents should stop and ask before choosing, changing or characterising a licence. Wording follows the licence; the licence is an owner and legal decision.

## Findings

### 1. The Open Source Definition fixes what the phrase means

The OSI page shows "Version 1.9, last modified 2007-03-22"; the page itself was created 2006-07-07 and last edited 2024-02-16 ([OSD](https://opensource.org/osd), fetched 2026-11-27; the authority itself). Ten criteria: free redistribution, source code, derived works, integrity of the author's source code, no discrimination against persons or groups, no discrimination against fields of endeavour, distribution of licence, licence must not be specific to a product, must not restrict other software, must be technology-neutral.

Criterion 6 is the one that excludes most "source-available" licences: "The license must not restrict anyone from making use of the program in a specific field of endeavor", with the example that it may not restrict use in a business. Licences with a non-commercial or competing-service clause fail it. Criterion 5 excludes person or group restrictions.

The page is an authority for the definition, not a licence list. Which licences pass is decided by the OSI approval list, which SPDX mirrors (finding 4).

### 2. OSI marks bind the OSI names, not the phrase

The [trademark guidelines](https://opensource.org/trademark-guidelines) show no version or revision date; they state changes take effect "ten (10) days after the changes are posted" (authority itself, fetched 2026-11-27). The marks listed are "OSI", "Open Source Initiative", the OSI logo and "OSI Approved Open Source License" (registered). Written approval is needed for domain names and non-software goods. Use "must promote OSI-approved software licenses"; do not imply OSI is responsible for third-party products or services.

The guidelines set no rule for the generic phrase "open source". The binding statement on the phrase is the OSI board's post [The SSPL is Not an Open Source License](https://opensource.org/blog/the-sspl-is-not-an-open-source-license) (2021-01-19): a company may not "claim or imply that software under a license that has not been approved by the Open Source Initiative" is open source. That is a position, not law. The legal exposure is false-advertising and consumer-protection claims about a material attribute, plus licence-compliance disputes with downstream users; this worker did not fetch a court ruling, so treat the legal reading as unsourced and escalate (see "must not decide alone").

Practical consequence: copy may say "OSI-approved licence" only when `isOsiApproved` is true for every selectable option; copy that uses the logo or the registered phrase needs the owner.

### 3. "Open-source AI" has its own definition

[OSAID 1.0](https://opensource.org/ai/open-source-ai-definition) (page shows "version 1.0", no date; authority itself, fetched 2026-11-27) requires, for the preferred form of modification: sufficiently detailed data information about the training data (including a description of unshareable data and lists of public and third-party sources), the complete source code used to train and run the system (processing, filtering, training, validation, testing, inference, architecture), and the model parameters (weights or other configuration, optionally checkpoints and optimizer state), each under OSI-approved terms.

A release of weights under Apache-2.0 alone fails the data-information and training-code requirements. Wording: "open weights" or "weights available under Apache-2.0". This is relevant to the fleet only if it ships a model; none was found. Source dates: see Contested for whether OSAID itself is accepted.

### 4. SPDX data is the lookup, not a hand list

Measured: `curl -sL https://spdx.org/licenses/licenses.json` (SPDX is the authority; list version **3.29.0**, release date **2026-09-16T00:00:00Z**). 740 entries; 154 `isOsiApproved: true`; 32 `isDeprecatedLicenseId: true`.

| SPDX id | isOsiApproved | isDeprecatedLicenseId |
|---|---|---|
| Apache-2.0, MIT, MPL-2.0, AGPL-3.0-only, Unlicense, 0BSD | true | false |
| Fair | true | false |
| BUSL-1.1, SSPL-1.0, Elastic-2.0, PolyForm-Noncommercial-1.0.0, CC-BY-NC-4.0 | false | false |
| AGPL-3.0, GPL-3.0 (bare ids) | true | **true** |

Command: `python3 -I -c "import json;L=json.load(open('licenses.json'))['licenses'];..."` over `licenseId`. Two consequences. A deprecated id (`GPL-3.0`) is still OSI-approved, but a manifest must use the replacement (`GPL-3.0-only` or `-or-later`); copy and badges must follow. `Fair` is OSI-approved and is not the "fair source" movement; an agent matching on the word "fair" would misclassify.

Package-manager rules that tie the manifest to SPDX: [Cargo](https://doc.rust-lang.org/cargo/reference/manifest.html#the-license-and-license-file-fields) reads `license` as an SPDX 2.3 expression and says the `/` separator is deprecated in favour of `OR`; `license-file` is for nonstandard licences. [npm](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#license) wants a current SPDX id, `UNLICENSED` for code granting no rights, and `SEE LICENSE IN <file>` for custom terms; the object and array styles are deprecated. The SPDX spec page redirected to v2.3.1 and was not read; expression grammar here comes from Cargo's and npm's docs.

### 5. Wording failures around licence changes

| Event | What the source says | Date | Source type |
|---|---|---|---|
| HashiCorp MPL 2.0 to BSL 1.1 | The post says "BSL 1.1 is a source-available license" and keeps "open source" for the earlier model. "Competitive offering" is used in the permitted-use sentence and not defined in the post; it points to an FAQ. Change applies to "all future releases"; APIs, SDKs and "almost all other libraries" stay MPL 2.0. | 2023-08-10 | Vendor ([HashiCorp](https://www.hashicorp.com/en/blog/hashicorp-adopts-business-source-license)) |
| Elastic adds AGPL | Calls AGPL "an OSI approved license"; adds it "next to ELv2 and SSPL"; says of the earlier change "while it was painful, it worked". No admission about earlier wording. | 2024-08-29 | Vendor ([Elastic](https://www.elastic.co/blog/elasticsearch-is-open-source-again)) |
| Redis tri-licence | RSALv2 and SSPLv1 "not an open source license"; AGPLv3 "an OSI-approved open source license"; Redis Open Source is "both source-available and OSI-compliant open source". Version table: 7.2 and earlier BSD-3-Clause; 7.4-7.8 RSALv2 or SSPLv1; 8.0+ RSALv2 or SSPLv1 or AGPLv3. Redis Insight is under a commercial licence for paying customers. | page undated; AGPL at Redis 8 GA, 2025-05-01 (per The Register) | Vendor ([Redis](https://redis.io/legal/licenses/)) |
| Redis return | Register: AGPL "approved as open source by the Open Source Initiative", SSPL "remains outside". CEO: "no movement towards really accepting SSPL as a valid open source license". Percona's Zaitsev calls AGPL "halfway". | 2025-05-01 | Trade press ([The Register](https://www.theregister.com/2025/05/01/redis_returns_to_open_source/)) |
| Contributor erosion | "37.5% of contributors (9 of 24) stopped contributing to Redis after the fork"; Valkey "18 to 49 contributors in 18 months"; 80 PRs a month versus Redis 42 in 2025. The article counts quantity, not size or quality; data from GitHub. Percona sells Redis and Valkey support and the page promotes migration; the article discloses no interest. | 2025-12-05 | Vendor data ([Percona](https://www.percona.com/blog/community-erosion-post-license-change-quantifying-the-power-of-open-source/)) |
| GitHub explainer | Confluent, MongoDB, Cockroach Labs, Redis Labs, Timescale and Graylog "moved away from OSI-approved licenses to licenses that are not 'open source'". | 2021-03-18 | Platform ([GitHub](https://github.blog/open-source/whats-up-with-these-new-not-open-source-licenses)) |

Reading for copy rules: the wording error that costs trust is an undefined term in the licence's operative clause and a blurred "both source-available and open source" label. A checkable lesson is a defined-terms rule and a per-component licence table, not a ban on any licence.

### 6. "Free" has three meanings; the law covers one

- Price: "free of charge", "no cost". The US FTC guide [16 CFR 251.1](https://www.law.cornell.edu/cfr/text/16/251.1) (published 36 FR 21517, 1971-11-10; the page shows no currency date; authority itself) says offers of "Free" items need "extreme care so as to avoid any possibility that consumers will be misled", that consumers expect the free item's cost not to be recovered via the required purchase, and that all terms "should be stated clearly and conspicuously at the outset of the offer"; an asterisked footnote does not count. The guide is written for "Buy 1 Get 1 Free" offers. Applying it to a free tier is an inference; confirm with the owner.
- Freedom: "free software" in the Free Software Foundation sense (four freedoms). The GNU page was not fetched (HTTP 429), so no FSF quote is recorded here.
- Trial or tier: "free for 14 days", "free plan". The qualifier is the checkable part.

Decision: copy that means price says "free of charge" or "no cost" and names the scope in the same sentence ("free of charge under Apache-2.0", "free plan: 3 projects"). Copy that means the licence says the licence ("open source under Apache-2.0"); bare "free software" is not used unless the licence is FSF-approved, which this worker did not source. A bare "free" in a headline is permitted only when the same screen shows the limit or the paid boundary.

### 7. Fleet measurement

All commands run from `/home/mherwig/dev` on 2026-11-27; trees excluded: `node_modules`, `.git`, `target`, `worktrees`, `.agents`, `external`, `dist`, `.venv`, `.claude`, `build`, `.vscode-test`.

**LICENSE file versus manifest licence** (command: `ls $d/LICENSE*`, `grep -m1 -oE "Apache License|MIT License|..." $LICENSE`, and `find $d -maxdepth 3 ( -name Cargo.toml -o -name package.json -o -name pyproject.toml ) | xargs grep -HnE '^\s*(license|license-file)\s*=|"license"\s*:|license\.workspace'`; plus the checker below):

| Repo | LICENSE file | Manifest field (file:line) | Agree |
|---|---|---|---|
| grimoire-rs/grim-gui | Apache | `Cargo.toml:8` Apache-2.0 | yes |
| grimoire-rs/grim-mirror | Apache | `Cargo.toml:10` Apache-2.0 | yes |
| grimoire-rs/grimoire | Apache | `Cargo.toml:14` Apache-2.0; vendored `external/docker_credential` MIT OR Apache-2.0 | yes |
| grimoire-rs/indexer | Apache | `package.json:6` Apache-2.0 | yes |
| grimoire-rs/vscode | Apache | `package.json:7` Apache-2.0 | yes |
| michael-herwig/arcana | **none** | none; README says "Apache-2.0." (`README.md:86`) | **README claims, no file** |
| ocx-sh/catalog | Apache | `package.json:13` Apache-2.0 | yes |
| ocx-sh/conventions | Apache | no root manifest, README has no licence section | no manifest to compare |
| ocx-sh/devcontainer-features | Apache | `package.json:5` Apache-2.0 | yes |
| ocx-sh/e2e-index | **none** | none | no licence declared |
| ocx-sh/grimoire-lore | **none** | `rules/*` frontmatter `license: Apache-2.0` (75 files, `grep -rhE "^license:" rules skills`) | **published artifacts claim, no LICENSE file** |
| ocx-sh/index | **none** | none | no licence declared |
| ocx-sh/indexbot | Apache | `pyproject.toml:6` Apache-2.0 | yes |
| ocx-sh/ocx | Apache (plus `LICENSE-THIRD-PARTY.md`) | `Cargo.toml:18` Apache-2.0 | yes |
| ocx-sh/ocx-mirror | Apache | `Cargo.toml:26` Apache-2.0 | yes |
| ocx-sh/rules_ocx | Apache | no root manifest; README `:316` Apache-2.0 | yes (README) |
| ocx-sh/website | Apache | only `packages/theme/package.json:13` Apache-2.0; no root manifest, README no licence section | partial |
| ocx-sh/www-setup | Apache | no root manifest; README `:102` Apache-2.0 | yes (README) |

Result: 18 repos, 14 LICENSE files (all Apache-2.0 text), 0 LICENSE-versus-manifest disagreements, 4 repos with no LICENSE (arcana, e2e-index, grimoire-lore, index), 5 repos with no README licence statement (conventions, e2e-index, grimoire-lore, index, website). The task named 17 fleet repos; `find` found 18 git repos (the extra is `michael-herwig/arcana`, which is not under the ocx-sh or grimoire-rs organisations). The scout's "15 LICENSE" counted `LICENSE-THIRD-PARTY.md` as a file (`ls -d */*/LICENSE*` lists 15 paths, 14 plain `LICENSE`).

**Claim words** (command, bash, public-copy globs `README*`, `*.mdx`, `*.md`, `*.astro`, `*.html`, manifests; excludes also `research`, `plans`, `adr`):
`grep -rIniE "open[- ]source|source[- ]available|libre|free software|FOSS"` yields 64 hits across 11 repos (index 17, catalog 14, grimoire-lore 11, ocx 5, then 4 each in www-setup, website, rules_ocx, ocx-mirror, devcontainer-features, conventions, and 1 in grimoire). Where they are:

- Third-party descriptions of other tools, accurate and not about the fleet: `ocx-sh/catalog/.dev-indexes/.../bazelbuild/bazel/...md:3` ("Google's open-source build and test tool"), the trivy and opencode entries, and their `.dev-indexes.staging-*` duplicates. Whether each named tool's licence is OSI-approved was not verified.
- Agent-config text about studied corpora: `www-setup/.opencode/rules/code-docs.md:110` ("32 open-source repos").
- Fleet self-claim: `grimoire-rs/grimoire/docs/public/privacy.html:174` ("private, non-commercial open-source project"). Apache-2.0 is OSI-approved; "non-commercial" describes the operator, not the licence, and a reader could misread it as a licence restriction. This is a mismatch risk, not an error.
- Source-available hits: `grimoire-lore/skills/docs-instrument/references/reader-signals.md:80` ("GoatCounter | free, source available") and copies in 6 other repos' `.opencode` folders. That is about a third-party tool; GoatCounter's licence was not checked here.
- `ocx-sh/index/p/opentofu/...:7` mentions "Terraform moved to the Business Source License" (third-party description).
- `ocx/website/src/content/docs/publishing/announce.mdx:116` says "any open-source contribution" (generic).

`grep -iE "\bfree( of charge| to use| forever| tier|-tier)|completely free|100% free|always free"` over the same globs finds no fleet product claiming itself "free" in public copy; the hits are docs-quality text about analytics vendors' free tiers (`docs-quality/navigation.md:110,116`; `reader-signals.md:59,78`) and licence boilerplate inside a downloaded Chromium licence file (excluded from the final run).

Fleet reading: contrary to the scout (177 files), the number of copy claims about the fleet's own openness is near zero. The 177 is overwhelmingly agent-config, indexed third-party descriptions and vendored licence text. The high-value finding is the opposite gap: openness is under-stated. Five repos have no README licence section, four have no LICENSE file, and the website, which is the public face, has no root manifest licence field. Whether the site footer or landing page names the licence was not found in the files grepped. This should be audited by the ux or landing-conversion worker.

**Checker, run on the fleet**: `/tmp/.../lic.py <repo> licenses.json` (scratch script, reproduced as rule MKT-LIC-01 verification below) reads the manifest licence, loads SPDX data, and prints `osi_all`. It returned `osi_all=True` for the 10 repos with a root or workspace manifest licence and `manifest=none` for the other 8. One bug was found while writing it: Cargo workspaces put `license` under `[workspace.package]`; a checker reading only `[package]` misses it (grimoire and ocx-mirror first printed `none`).

## Normative guidance candidates

Each rule has a severity and a verification.

1. **MKT-LIC-01 (MUST).** Before writing "open source" or "open-source" about a product, read its LICENSE SPDX id and confirm `isOsiApproved: true` in the current SPDX `licenses.json` for every option in the expression. Rationale: the OSI board position and OSD criterion 6 exclude field-restricted and competing-service licences. Verification: script that reads manifest and `licenses.json` (never a hand list); any copy hit with `osi_all=False` fails. Example: `grep -rniE "open[- ]source" README.md site/` plus `python3 -I check.py .`.
2. **MKT-LIC-02 (MUST).** If any selectable licence is not OSI-approved (BUSL-1.1, SSPL-1.0, Elastic-2.0, PolyForm-*, CC-*-NC-*, RSALv2), write "source-available"; never "open source" for that component. Rationale: precedent: Redis states RSALv2 and SSPLv1 "not an open source license". Verification: same checker; pass "Source-available under BUSL-1.1", fail "open source under BUSL-1.1".
3. **MKT-LIC-03 (MUST).** For compound licences, name each option with its class on the same page ("AGPL-3.0-only is open source; SSPL-1.0 is source-available"); do not apply one adjective to the set. Rationale: Redis's "both source-available and open source" label was the confusing wording. Verification: reading heuristic; pass the per-option table, fail a headline "open source" over "A OR B" where B is unapproved.
4. **MKT-LIC-04 (MUST).** The LICENSE file, the manifest field (`license`, `license-file`, `pyproject` `project.license`, OCI `org.opencontainers.image.licenses`), the README licence line and the site licence line must carry the same SPDX id. Rationale: the id is the one machine-checkable claim. Verification: checker compares ids across the four places; any inequality fails; in Cargo check `[workspace.package]` first.
5. **MKT-LIC-05 (MUST).** A README or published artifact that names a licence requires a LICENSE file in the same repository. Rationale: arcana and grimoire-lore name Apache-2.0 without one. Verification: `test -f LICENSE || grep -qiE "apache|mit|licen[cs]e" README.md` must not hold; per-repo `ls LICENSE*`.
6. **MKT-LIC-06 (MUST).** Manifests use a current SPDX id; no deprecated ids (`GPL-3.0`, `AGPL-3.0`), no `/` separator in Cargo, no npm object-style licence. Rationale: Cargo and npm docs state these are deprecated. Verification: `isDeprecatedLicenseId` from `licenses.json`; `grep -nE 'license.*"?[A-Za-z0-9.-]+/[A-Za-z0-9.-]+' Cargo.toml`.
7. **MKT-LIC-07 (MUST).** Never use "OSI Approved" (registered mark), the OSI logo or "Open Source Initiative" endorsement wording without the owner's approval; "OSI-approved licence" is a factual statement allowed only under MKT-LIC-01. Rationale: OSI trademark guidelines. Verification: `grep -rniE "OSI[- ]approved|Open Source Initiative|osi logo"` in copy; each hit needs `isOsiApproved: true` and an owner note.
8. **MKT-LIC-08 (MUST).** "Free" in copy states which meaning it carries in the same sentence: "free of charge" for price, a named plan limit for a tier, a licence id for freedoms. Bare "free" is allowed only when the limit or paid boundary appears in the same viewport. Rationale: FTC 16 CFR 251.1 asks for clear and conspicuous terms at the outset, not in an asterisked footnote. Verification: `grep -rniE "\bfree\b"` over rendered copy; each hit fails unless the same sentence or an adjacent line names the limit; footnote-only qualifiers fail.
9. **MKT-LIC-09 (MUST).** Do not write "free" or "open source" next to a feature that is gated, trial-limited or in a paid edition. Label by edition (open core, paid). Rationale: HashiCorp, Redis and Elastic show that edition boundaries drive community response; Redis's Insight tools carry a commercial licence. Verification: for each feature claim, find its edition in the pricing or packaging record; mismatch fails.
10. **MKT-LIC-10 (MUST).** "Open-source AI", "open-source model" requires data information, complete training and inference code, and parameters, all under OSI-approved terms (OSAID 1.0). Otherwise write "open weights" with the weights' licence id. Rationale: OSAID 1.0 requirements. Verification: a model manifest lists three items with licence ids; any missing item fails.
11. **MKT-LIC-11 (SHOULD).** State the licence id on the first screen of the site and in the README top, with a link to the LICENSE file; use "Apache-2.0" rather than "free". Rationale: the failure-corpus scout measured pricing objections in 14 of the 100 most popular 2026 Show HN threads (independent measurement, 2026-11-27; method and command in Dated facts row D1; the one thread cited by URL, [HN 47809438](https://news.ycombinator.com/item?id=47809438), posted 2026-04-17, contains the quote "No pricing page, you've lost my interest" but not the count); the licence id is checkable. Verification: render check: link text matching `licen[cs]e|Apache|MIT` present in the header or hero.
12. **MKT-LIC-12 (SHOULD).** Define every contested term in a licence or terms announcement ("competitive offering", "hosted service") at the point of use, with an example of a covered and an uncovered use. Rationale: HashiCorp left "competitive offering" undefined ([HashiCorp](https://www.hashicorp.com/en/blog/hashicorp-adopts-business-source-license), 2023-08-10) and the OpenTofu fork was announced two weeks later ([OpenTofu](https://opentofu.org/blog/opentofu-announces-fork-of-terraform/), 2023-08-25); the fork post cites the licence change itself, not the undefined term, so the link to wording is an inference. Verification: defined-terms check over the announcement; each quoted term has a definition within one section. (Announcement structure belongs to release-deprecation-breaking; only the wording rule is here.)
13. **MKT-LIC-13 (SHOULD).** Describe a licence by its SPDX name or id, not by an adjective ("permissive", "business-friendly", "truly open"). Rationale: adjectives are unverifiable. Verification: `grep -rniE "truly open|fully open|100% open|business-friendly|commercial-friendly"`.
14. **MKT-LIC-14 (SHOULD).** Do not use "non-commercial" about a project's operator in a licence context without saying the licence has no such restriction. Rationale: `grimoire/docs/public/privacy.html:174` pairs "non-commercial" with "open-source", and OSD criterion 6 forbids non-commercial licence restrictions. Verification: grep `non-?commercial` next to `open[- ]source`; pass "operated privately; licensed Apache-2.0".
15. **MKT-LIC-15 (SHOULD).** Third-party tool descriptions that say "open source" cite the tool's licence from its repo's LICENSE, checked by the same lookup, or omit the adjective. Rationale: catalog entries describe other projects, and a relicensed tool (Terraform, Redis, Elastic) makes the adjective stale. Verification: for each catalog description hit, compare against the upstream SPDX id.
16. **MKT-LIC-16 (CONSIDER).** Name "fair source" for delayed-open licences (FSL) and state the conversion date; do not call them open source until converted. Rationale: Fair Source says it is not open source. Verification: licence class is source-available until the conversion event is reached.

## Mapping: licence class to the wording allowed

| Class | Examples (SPDX id) | `isOsiApproved` | Allowed | Forbidden |
|---|---|---|---|---|
| OSI-approved permissive or copyleft | Apache-2.0, MIT, MPL-2.0, AGPL-3.0-only, Unlicense | true | "open source", "OSI-approved", "free of charge" (if no paid gate), the SPDX id | "free software" unless FSF-approved (unsourced here) |
| Deprecated id of an approved licence | GPL-3.0, AGPL-3.0 | true, deprecated | as above, but switch the manifest to the current id | the bare deprecated id in new manifests |
| Source-available | BUSL-1.1, SSPL-1.0, Elastic-2.0, RSALv2, PolyForm-*, CC-BY-NC-* | false | "source-available", "source available under <id>" | "open source", "OSI-approved", "free software" |
| Fair source (delayed open) | FSL | false until conversion | "fair source", "source-available", state the conversion date | "open source" |
| Multi-licence with mixed classes | AGPL-3.0-only OR SSPL-1.0 | mixed | Per-option statement (MKT-LIC-03) | One adjective over the set |
| Proprietary / unlicensed | UNLICENSED (npm), none | n/a | "proprietary", "source available on request" only if true | any openness word |
| Open core | OSI core plus paid edition | per component | "open core"; name which components are which licence | "open source product" for the whole |
| AI model | any | OSAID, not SPDX | "open source AI" only if OSAID 1.0 met; else "open weights" | "open source" for weights alone |

## Evidence record: licence fields

The licence class of evidence record carries these fields. The agent fills them from files, never from memory.

| Field | Value source | Check |
|---|---|---|
| `scope` | which component, binary, package or model the claim covers | one record per component; no repo-wide claim for a mixed repo |
| `spdx_expression` | LICENSE file and manifest | equal in both places (MKT-LIC-04) |
| `license_file` | path to LICENSE | exists (MKT-LIC-05) |
| `osi_approved` | `licenses.json` `isOsiApproved` per id | derived, never hand-entered |
| `spdx_list_version` and `spdx_list_date` | `licenseListVersion` and `releaseDate` of the file fetched | recorded (3.29.0, 2026-09-16 at time of research) |
| `deprecated_id` | `isDeprecatedLicenseId` | false |
| `class` | one row of the mapping above | decides the allowed wording |
| `claim_words_used` | grep hits with file:line | each hit permitted by `class` |
| `paid_boundary` | list of gated features and the edition, or "none" | needed before "free" or "open source" next to a feature |
| `model_items` (AI only) | data information, code, parameters each with licence id | all three present for "open source AI" |
| `owner_approved` | the owner's decision on licence and on OSI marks | required for any change or any mark use |
| `checked_on` | date and command | re-run when the licence file or SPDX list changes |

## What an agent must not decide alone

- Choosing, changing or adding a licence, including adding a second option or a contributor agreement. It changes the legal rights of every user and contributor.
- Whether a licence "meets" the Open Source Definition when it is not on the SPDX list or is a custom text. Ask the owner or legal counsel.
- Whether a product or edition is "open source", "open core" or "source-available" when components differ, or when a vendored dependency is under a different licence. Ask.
- Whether a free tier, trial or "free" claim is lawful in a given market (FTC 16 CFR 251.1 applies to promotions in the US; EU and German rules were not sourced here). Ask.
- Using the OSI logo, "OSI Approved Open Source License", or any partner mark.
- Announcing a licence change, naming a competitor in a licence term, or defining a restrictive term like "competitive offering".
- Adding a LICENSE file to the four repos that lack one (arcana, e2e-index, grimoire-lore, index) or a licence field to the website: the owner confirms the intended licence first. The README and frontmatter suggest Apache-2.0; that is evidence of intent, not authority.
- Describing a third-party tool's licence from memory.

## AI-agent angle

| Typical agent mistake | Smallest mechanical check |
|---|---|
| Writes "open source" because the repo is public on GitHub | MKT-LIC-01 SPDX lookup; a public repo without a LICENSE is "all rights reserved" by default (not sourced here; owner to confirm) |
| Treats "source-available" and "open source" as synonyms, or uses "open" for both | grep `source[- ]available` and `open[- ]source` in the same file; per-component class check |
| Uses a remembered licence list (trains on pre-2023 data, when Redis and Elastic were open or ES was Apache) | Fetch `licenses.json`; ignore memory; also check the upstream LICENSE file at the commit being described |
| Copies a deprecated id (`GPL-3.0`, `AGPL-3.0`) or `MIT/Apache-2.0` into a manifest | `isDeprecatedLicenseId`; MKT-LIC-06 |
| Reads only `[package]` in Cargo and reports "no licence" | check `[workspace.package]` and `license.workspace = true` (found while building the checker) |
| Writes "free" in a hero line with a paid tier below the fold | MKT-LIC-08, MKT-LIC-09 viewport check |
| Writes "open source AI" for a model with open weights | MKT-LIC-10 three-item manifest |
| Matches on the word "fair" and treats `Fair` as fair source | classify by `isOsiApproved` and id, not by name |
| Invents an OSI-approved claim for a licence it half remembers | `osi_approved` is derived from the list, not typed |
| Adds a LICENSE file to be helpful | listed under "must not decide alone" |

## Contested / evolving

- **Is a licence change a success or a mistake?** Elastic: "while it was painful, it worked" ([Elastic](https://www.elastic.co/blog/elasticsearch-is-open-source-again), 2024-08-29, vendor). Percona: 9 of 24 Redis contributors stopped and Valkey went from 18 to 49 contributors ([Percona](https://www.percona.com/blog/community-erosion-post-license-change-quantifying-the-power-of-open-source/), 2025-12-05, vendor with a commercial interest in Valkey and Redis support; counts quantity only). The failure-corpus scout also records a Redis CEO claim of record growth and 98 percent of contributors working for Redis. Verified: CEO Rowan Trollope said "We've had record growth since we switched the license" ([InfoWorld](https://infoworld.com/article/3975620/redis-bets-big-on-an-open-source-return.html), 2025-05-01, trade press quoting the CEO; unaudited vendor claim). Not verified: the 98 percent figure appears in neither InfoWorld nor [The Register](https://www.theregister.com/2025/05/01/redis_returns_to_open_source/); do not cite it.
- **Is AGPL "open source again"?** Redis and Elastic say yes, citing OSI approval ([Redis](https://redis.io/legal/licenses/)). Percona's Zaitsev calls AGPL "halfway" and "probably the most restrictive, popular open source license out there" ([The Register](https://www.theregister.com/2025/05/01/redis_returns_to_open_source/), 2025-05-01). Both agree the licence is OSI-approved; they disagree on whether the company's product is trusted as open source. The rule here follows the OSI list, not the sentiment.
- **Is "source-available" a legitimate honest category?** Dries Buytaert (Drupal founder) argues it is not open source and that this is fine: "'Source available' is not Open Source (and that's okay)" ([dri.es](https://dri.es/node/5976), 2025-12-09, personal blog, also excerpted on opensource.org). Keygen's founder Zeke Gabrielse argues the opposite emphasis: "Source-available is meaningless" as a label, "no meaning outside of the thin freedom to read the source code", and prefers "fair source" ([Keygen](https://keygen.sh/blog/source-available-is-meaningless/), 2024-10-02, vendor with a stake in the term). Both agree the licence is not open source; they disagree on whether "source-available" is a useful category. The Fair Source project says it is "not" open source and aims not to confuse the two ([fair.io](https://fair.io/about/), 2026, project page).
- **OSAID 1.0.** The page shows no date, and this worker did not source adoption or criticism; the strict data-information requirement is the point most likely to be disputed. Re-check before encoding as a hard rule beyond "open weights" wording.
- **Legal force.** The OSD and OSAID are definitions by a standards body, not statute. The FTC "Free" guide is a 1971 guide on promotions. No court ruling on "open source" mislabelling was fetched. Trend: the SPDX list and ecosystem tooling (Cargo, npm) treat SPDX ids as the contract; list version 3.29.0 dated 2026-09-16.

## Dated facts

| ID | Fact | Source URL | Source date | Source type |
|---|---|---|---|---|
| D1 | Pricing objection in 14 of the 100 highest-ranked 2026 Show HN threads with 40 or more comments (18,721 comments; narrow regex, lower bound). Re-measurement attempted 2026-11-27 and blocked by HTTP 403 from hn.algolia.com; the figure is the scout's. Command: `curl -s -G "https://hn.algolia.com/api/v1/search" --data-urlencode "tags=show_hn" --data-urlencode "numericFilters=created_at_i>1767225600,num_comments>=40" --data-urlencode "hitsPerPage=100"`, then `https://hn.algolia.com/api/v1/items/<objectID>` per story, regex for no pricing, pricing page/info/link, can't find pricing, how much does it cost, free tier | method in `.agents/research/marketing-topic-map/failure-corpus.md` lines 22-36; example thread https://news.ycombinator.com/item?id=47809438 | measured 2026-11-27; thread 2026-04-17 | independent measurement (popular-thread sample over-represents successful launches) |
| D2 | OSD version 1.9; criterion 6 bars field-of-endeavour restrictions | https://opensource.org/osd | 2007-03-22 (edited 2024-02-16) | authority |
| D3 | SPDX list 3.29.0: 740 entries, 154 OSI-approved, 32 deprecated | https://spdx.org/licenses/licenses.json | 2026-09-16 | authority |
| D4 | OSI board: a company may not claim or imply an unapproved licence is open source | https://opensource.org/blog/the-sspl-is-not-an-open-source-license | 2021-01-19 | authority |
| D5 | HashiCorp moved Terraform to BSL 1.1 and called it source-available | https://www.hashicorp.com/en/blog/hashicorp-adopts-business-source-license | 2023-08-10 | vendor |
| D6 | OpenTofu fork announced in response to the BSL change | https://opentofu.org/blog/opentofu-announces-fork-of-terraform/ | 2023-08-25 | project (interested party) |
| D7 | Elastic added AGPL; "while it was painful, it worked" | https://www.elastic.co/blog/elasticsearch-is-open-source-again | 2024-08-29 | vendor |
| D8 | Redis added AGPLv3 at Redis 8; CEO: "We've had record growth since we switched the license" | https://infoworld.com/article/3975620/redis-bets-big-on-an-open-source-return.html ; https://www.theregister.com/2025/05/01/redis_returns_to_open_source/ | 2025-05-01 | trade press quoting vendor |
| D9 | 9 of 24 pre-fork Redis contributors stopped; Valkey 18 to 49 | https://www.percona.com/blog/community-erosion-post-license-change-quantifying-the-power-of-open-source/ | 2025-12-05 | vendor data |
| D10 | Buytaert: "source available" is not open source (O'Saasy / Fizzy case) | https://dri.es/node/5976 | 2025-12-09 | personal blog, opinion |
| D11 | Keygen: "Source-available is meaningless"; fair source preferred | https://keygen.sh/blog/source-available-is-meaningless/ | 2024-10-02 | vendor, opinion |
| D12 | FTC Guide on use of "Free": terms clear and conspicuous at the outset | https://www.law.cornell.edu/cfr/text/16/251.1 | 1971-11-10 (36 FR 21517) | authority (US) |
| D13 | OSAID 1.0: data information, code, parameters under OSI-approved terms | https://opensource.org/ai/open-source-ai-definition | no date shown | authority |
| D14 | Cargo: SPDX 2.3 expression, `/` deprecated; npm: SPDX id, `UNLICENSED` | https://doc.rust-lang.org/cargo/reference/manifest.html#the-license-and-license-file-fields ; https://docs.npmjs.com/cli/v10/configuring-npm/package-json#license | current docs, undated | authority |
| D15 | GitHub: Confluent, MongoDB, Redis Labs and others moved to non-OSI licences | https://github.blog/open-source/whats-up-with-these-new-not-open-source-licenses | 2021-03-18 | platform |
| D16 | Fair Source: delayed open, not open source | https://fair.io/about/ | 2026 (page copyright) | project |

## Sources

| URL | What it is | Date / era | Type | Why worth reading |
|---|---|---|---|---|
| https://opensource.org/osd | Open Source Definition 1.9 | version 2007-03-22; page edited 2024-02-16 | authority | defines the phrase; criteria 5 and 6 |
| https://opensource.org/trademark-guidelines | OSI trademark guidelines | undated; changes take effect 10 days after posting | authority | which marks are restricted; no rule for the generic phrase |
| https://opensource.org/ai/open-source-ai-definition | OSAID 1.0 | no date shown | authority | AI wording; data, code, parameters |
| https://spdx.org/licenses/licenses.json | SPDX licence list | v3.29.0, 2026-09-16 | authority | `isOsiApproved`, `isDeprecatedLicenseId` |
| https://opensource.org/blog/the-sspl-is-not-an-open-source-license | OSI board statement on SSPL | 2021-01-19 | authority | the position on claiming or implying |
| https://www.hashicorp.com/en/blog/hashicorp-adopts-business-source-license | HashiCorp BSL announcement | 2023-08-10 | vendor | "source-available" use; undefined term |
| https://www.elastic.co/blog/elasticsearch-is-open-source-again | Elastic adds AGPL | 2024-08-29 | vendor | OSI-approval argument; "it worked" |
| https://redis.io/legal/licenses/ | Redis licence page | undated; Redis 8 era | vendor | exact per-licence wording and version table |
| https://www.theregister.com/2025/05/01/redis_returns_to_open_source/ | Redis returns to AGPL | 2025-05-01 | trade press | CEO and Zaitsev quotes |
| https://www.percona.com/blog/community-erosion-post-license-change-quantifying-the-power-of-open-source/ | Percona contributor study | 2025-12-05 | vendor data | the 9-of-24 and Valkey figures; method and interest noted |
| https://github.blog/open-source/whats-up-with-these-new-not-open-source-licenses | GitHub policy explainer | 2021-03-18 | platform | which vendors moved to non-OSI licences |
| https://www.law.cornell.edu/cfr/text/16/251.1 | FTC Guide on use of "Free" | 36 FR 21517, 1971-11-10; no currency date shown | authority (US) | clear and conspicuous terms |
| https://opentofu.org/blog/opentofu-announces-fork-of-terraform/ | OpenTofu fork announcement | 2023-08-25 | project | date and stated cause of the fork |
| https://infoworld.com/article/3975620/redis-bets-big-on-an-open-source-return.html | Redis CEO interview | 2025-05-01 | trade press | "record growth" quote; no 98% figure |
| https://dri.es/node/5976 | Buytaert on source-available | 2025-12-09 | blog | contested position |
| https://keygen.sh/blog/source-available-is-meaningless/ | Keygen on source-available | 2024-10-02 | vendor | contested position |
| https://news.ycombinator.com/item?id=47809438 | HN thread with pricing-objection quote | 2026-04-17 | independent | example for D1; holds no count |
| https://fair.io/about/ | Fair Source definition | page copyright 2026 | project | delayed open source; not open source |
| https://doc.rust-lang.org/cargo/reference/manifest.html#the-license-and-license-file-fields | Cargo manifest reference | list 3.20 cited by the page | authority | SPDX 2.3, `/` deprecated |
| https://docs.npmjs.com/cli/v10/configuring-npm/package-json#license | npm package.json reference | v10 docs | authority | SPDX id, UNLICENSED |
| https://spdx.github.io/spdx-spec/v2.3/SPDX-license-expressions/ | SPDX expressions spec | redirect only (v2.3.1); not read | authority | attempted; grammar taken from Cargo and npm instead |

Not fetched: gnu.org free-software definition (HTTP 429, two attempts); ecfr.gov Part 251 (redirected to a block page, Cornell mirror used instead). Neither blocks the central question.
