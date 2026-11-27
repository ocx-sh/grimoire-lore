---
title: Claims and evidence for product copy
topic: marketing-claims-evidence
program: product
sub_program: marketing
date: 2026-11-27
revised: 2026-11-27
model: opus
id_family: MKT-CLAIM
consolidates:
  - marketing-claims-evidence/claims-evidence-record.md
  - marketing-claims-evidence/claims-licence-openness.md
  - marketing-claims-evidence/claims-ai-security-compliance.md
  - marketing-claims-evidence/claims-endorsements-proof.md
grounding:
  - product-audit/messaging-inventory.md
  - product-audit/site-shape.md
  - product-audit/distribution-posture.md
  - product-audit/exemplar-landing-pages.md
---

# Claims and evidence for product copy

Question: Which claims may product copy make, and what evidence record must exist on disk before each class of claim ships?

Scope of "copy surface" in every rule below: README files, landing and pitch pages, docs-site home pages, page titles and meta descriptions, package-manifest descriptions (`Cargo.toml`, `package.json`, `pyproject.toml`, extension manifests), the GitHub repository description, release notes, changelogs, pricing and service pages, trust and security pages, and email. Docs body pages are outside the claim gate. They keep DOC-PLAIN-12 (marketing words) and DOC-TYPE-15 (adoption-claim links) from [docs-quality](../../rules/docs-quality.md). This topic references those two rules and does not restate them.

## Verdict

1. **The basis comes before the claim, and a machine enforces it.** The FTC requires a "reasonable basis" before a claim runs, and later evidence does not cure a missing one ([FTC substantiation statement, 1984-11-23](https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation)). No human reviews an agent's copy, so the order is enforced by a CI gate that blocks publication. Only a human sign-off can satisfy it for some claim classes.
2. **There is one evidence store per repository: `claims.toml` at the repository root.** It holds every class of claim. Copy binds to a record by id, through a `claim:<id>` marker, by rendering the value from the record, or, on JSON and remote surfaces that cannot hold a marker, through the record's `surface` list. A record past its `refresh_by` date counts as no record.
3. **The gate keys on a narrow, measured pattern set, not on how a reader would take an adjective.** An agent cannot judge puffery, so the rule is mechanical: numbers with units, counts, prices, measurable comparatives and superlatives, compliance words, social-proof phrases, maturity grades and AI-capability words need a record or a rewrite. Universal quantifiers ("every", "all", "never") are a reading check on headline lines only. Measured on the fleet's headline corpus, the broad quantifier arm matched 170 of 2,610 lines, almost none of them claims. The narrow set matched 4 lines, and all 4 were real claim words. On the visible text of 26 exemplar home pages it matched 326 lines. Its percent and `×` arm finds all 32 percent and multiplier claims there; the first draft of the set found 7, because a trailing `\b` after `%` or `×` never matches (re-measured 2026-11-27, commands under "Applied").
4. **Five classes are blocked outright, with no allow-list bypass:** price or limit, count, attestation or certificate, AI capability figure, and endorsement. An agent never writes one of these from memory or by inference.
5. **When no record can be built, the fix is a mechanism rewrite, never a softer adjective.** "Switch versions instantly" becomes a sentence that names what the software does and how a reader can check it. An outcome word may stay as a headline only when the same or the next sentence names the artefact and links its proof.
6. **Licence wording follows SPDX data, never memory.** "Open source" is allowed only when every option of the SPDX expression is `isOsiApproved: true` in the current `licenses.json`. The LICENSE file, the manifest, the README and the artifact frontmatter carry the same id. A licence named anywhere requires a LICENSE file in the repository.
7. **Security and compliance copy names the report or the mechanism.** "SOC 2 certified" is never written: the AICPA calls SOC outputs "assurance reports" ([AICPA](https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services)). Compliance with a law is a legal judgement, not a copy edit.
8. **"AI-powered" is a fact about the shipped binary.** The label needs a call site that reaches a model at runtime. Using an AI assistant to build the product does not qualify ([FTC, "Keep your AI claims in check", 2023-02-27, archived](https://web.archive.org/web/2024/https://www.ftc.gov/business-guidance/blog/2023/02/keep-your-ai-claims-check)). This matters most for Grimoire, which installs AI configuration and calls no model.
9. **An agent never creates an endorsement.** Every quote, logo, badge, rating and adopter name resolves to a record that holds the person or organisation, the exact words, the capture date, the permission and the connection status. 16 CFR 465.2(a) names writing or creating a fake testimonial an unfair or deceptive act ([eCFR Part 465](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465), in force 2024-10-21).
10. **The fleet's gap today is missing records, not false claims.** It states no price, no percentage, no testimonial and no compliance status. Its violations are one unmeasured speed word, one unrecorded response-time promise, four repositories with no LICENSE file (this catalog among them), and no `security.txt`.

### Conflicts resolved

| # | Conflict | Decision | Why |
|---|---|---|---|
| C1 | Where the record lives. The record dive says a `claims.toml` beside each surface directory. The endorsements dive says one YAML file per endorsement under `proof/endorsements/`. | One `claims.toml` at the repository root holds every class, with endorsement rows as `[[claim]]` tables of `class = "endorsement"`. | One lint and one CODEOWNERS path. README and `Cargo.toml` sit at the root, so a per-directory file has no home for them. TOML matches the manifests the fleet already writes (`Cargo.toml`, `ocx.toml`, `publish.toml`). |
| C2 | Permission evidence. The endorsements dive commits raw mails (`proof/raw/*.eml`) to the repository. | The record holds `permission_ref`, a pointer to where the owner keeps the evidence. The message itself never enters a public repository. | Every fleet repository is public. A committed permission mail publishes the endorser's address and correspondence. That is the opposite of what the permission was for. |
| C3 | Detection breadth. The record dive's CLAIM-03 also matches `never|always|every|all|any|only|than|vs`. | The narrow set is the gate. Universal quantifiers and comparison words are a reading check on headline lines only. | On 2,610 headline lines, the universal arm matched 170 lines and the comparison arm 27 lines, almost all of them ordinary prose. The narrow set matched 4 lines, all of them claim words (commands under "Applied"). One arm is deliberately not narrowed: the bare social-proof arm (`trusted by`, `used by` ...). DOC-TYPE-15 tightened its bare "trusted by" arm after 3 of 3 false positives (`skills/docs-quality-reference/checks/landing_check.py:49`), but those came from security trust prose in docs body pages ([page-types.md DOC-TYPE-15 row](../../skills/docs-quality-reference/page-types.md)), which this gate excludes. On copy surfaces the bare arm matched 0 fleet lines, including the six `SECURITY.md` files, and 20 exemplar lines, 18 of them real social proof. The DOC-TYPE-15 regex caught 2 of those 18. |
| C4 | "SOC 2 certified". The endorsements dive allows it with a record. The AI, security and compliance dive bans it. | Banned for SOC in every case: name the report type, period and examiner. "ISO/IEC 27001 certified" is allowed only with a certificate record (number, body, scope, expiry). "Compliant with <law>" is never written by an agent. | The AICPA page uses "assurance reports" and never "certification". ISO calls management-system certification "a third-party conformity assessment activity" ([ISO/IEC 17021-1 page, archived 2025-11-29](https://web.archive.org/web/20251129184611/https://www.iso.org/standard/61651.html)). So the ISO certificate is a real object and the SOC certificate is not. |
| C5 | Default `refresh_by` for AI capability: 90 days (record dive) or 6 months (AI dive). For security: 90 days (record dive) or 6 to 12 months (AI dive). | AI capability: 90 days or any model change, whichever comes first. Security is split by sub-class (see MKT-CLAIM-05). | Model and provider versions change faster than six months, and re-running an eval costs little. A security mechanism lives in the code, so the release is the natural re-check. An attestation lives in a report with its own period. |
| C6 | A visible "as of" date. The endorsements dive requires it beside every quote and number (MUST). The record dive makes it optional for counts and prices (CONSIDER). | Required beside endorsements and beside counts taken from a third-party platform (stars, downloads, dependents). Not required for counts derived from code or for prices. For those, the record's freshness gate stands in. | 16 CFR 255.1 example 1(ii) ties old endorsements to a date, and platform counts change daily. A code-derived count is true of the release it ships with. A price must be current, not dated. |
| C7 | "The Simple Package Manager". The record dive classes it as puffery. The messaging audit flags it as an unsupported brand claim (smell 2). | An agent adds no new referent-free adjective to a headline line. Existing owner-written ones stay, and the agent reports them to the owner. | The record dive's own five-part test fails this tagline at `ocx-sh/ocx/Cargo.toml:19`, where it is the product's only description. Whether it is acceptable puffery for a developer audience is a brand and legal decision. |
| C8 | Record dive CLAIM-08: compare git dates so that a record is committed before its copy. | Dropped. The CI gate that blocks publication enforces "basis before dissemination". | `git log -S` ordering breaks under squash merges and adds nothing once publication cannot happen without the record. |
| C9 | Licence dive MKT-LIC-11: put the licence id on the first screen. | Dropped. Kept instead: the README and the manifests name the SPDX id and agree (MKT-CLAIM-12). | Its rationale, pricing objections in Show HN threads, does not bear on licence placement. |
| C10 | AI dive CLAIM-AI-08: an EU AI Act Art. 50 disclosure line. | No rule row. It is a human decision (see "What an agent must ask"). | Art. 50 is a transparency duty, not a rule on claim truth ([Regulation (EU) 2024/1689](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)). The ux sub-program owns AI-disclosure interfaces. |
| C11 | Scouts cite Rytr as barred from AI review tools. | Do not cite Rytr. Cite 16 CFR 465.2. | The Rytr order was set aside on 2025-12-22 by a 2-0 vote ([FTC](https://www.ftc.gov/news-events/news/press-releases/2025/12/ftc-reopens-sets-aside-rytr-final-order-response-trump-administrations-ai-action-plan)). Part 465 is untouched. |
| C12 | Sign-off. The AI dive uses CODEOWNERS review and no record field. The endorsements dive uses an `approved_by` field. | The proof is an approving pull-request review, read through the GitHub API, from a login that is neither the pull request's author nor any commit's author. `approved_by` stays on the row as an offline hint only; it is never proof. | An agent can type a field. In this fleet agents commit under the owner's git name, and `ocx-sh/ocx`, `grimoire-rs/grimoire` and `ocx-sh/grimoire-lore` set `commit.gpgsign = true` with `gpg.format = ssh` (`git config --get commit.gpgsign`, read 2026-11-27), so a commit from an agent session in those checkouts is signed with the same key. Neither the commit author nor a signature tells the owner from the agent. A review from a second identity is the one thing the agent cannot produce. |
| C14 | Happy-customer-only review requests. The endorsements dive (section 1.5 and "Contested") quotes the FTC Q&A: such requests do "not" violate a specific Part 465 prohibition, only possibly the FTC Act. The Federal Register preamble says they are not "generalized solicitations". | MKT-CLAIM-25 is a SHOULD, labelled the conservative reading of an unsettled point. The settled bars (no incentive conditioned on sentiment, 465.4; no "all reviews" claim over a filtered set, 465.7(b)) move to the new MKT-CLAIM-26 at MUST. | The two FTC instruments disagree on whether a rule is broken. A MUST that blocks publication needs a settled basis. 465.4 and 465.7(b) are rule text. |
| C13 | Licence fields. The licence dive keeps a separate field set that includes `osi_approved`. | Folded into the shared schema as class `licence`. `osi_approved` is never stored. The check derives it from `licenses.json` on every run. | A typed `osi_approved` is the exact error the rule prevents: an agent writing a value it half remembers. |

## The ruleset

Severity: **MUST** blocks publication. **SHOULD** warns, and the warning needs a recorded reason to pass. **CONSIDER** is advice. "Record" means a `[[claim]]` row in the repository-root `claims.toml` with the fields in MKT-CLAIM-04. "The lint" means the claims check described in MKT-CLAIM-01. It does not exist yet and is a new commitment (see "Applied").

**The lint's five checks.** Every verify below that names a check means one of these. They adapt the lint specification of the record dive (claims-evidence-record, CLAIM-12) to this ruleset's single root file.

| Check | What it does | Fails when |
|---|---|---|
| A, schema | Reads every `[[claim]]` row against the field tables in MKT-CLAIM-04. | A required field for the row's `class` is missing or empty; `id` is not unique; `observed` is not an ISO date; `refresh_by` is neither an ISO date after `observed` nor the string `"next-release"`; a `method` raw-data path or a `licence` `check` path fails `test -e`. |
| B, binding | Resolves every `claim:<id>` marker to a row, and every row to its surfaces. | A marker names no row; a row's `claim` string is not byte-equal in a file listed in its `surface`; for `github:description`, the string is absent from `gh repo view <owner>/<repo> --json description -q .description`. |
| C, detection | Runs the MKT-CLAIM-02 pattern set on every added line of a copy surface (code fences and `<style>` blocks removed). | A hit is not covered. A hit is covered by a `claim:<id>` marker at the end of the hit line, or by a line that holds only a marker directly above it, or (for JSON and remote surfaces, which cannot carry a marker) by a live row whose `surface` lists the file and whose `claim` string is on the hit line. An `[[allow]]` table entry with `file`, `text` and `reason` also covers a hit that is not a claim at all ("Quick start" style), except in check E's classes. |
| D, freshness | Compares each row's `refresh_by` with today and with the product version. | `refresh_by` is a date before today, or it is `"next-release"` and the version in the repository's manifest differs from `subject_version`. An expired row counts as absent for checks B, C and E. |
| E, blocked classes | Re-checks the hits of the count, price-or-limit, attestation, AI-capability and endorsement arms. | Such a hit is covered only by an `[[allow]]` entry, or by no live row of the matching class. For `class = "count"`, the lint re-runs `check` and fails when its output differs from `value`. |

Markers, by surface:

| Surface | Marker |
|---|---|
| Markdown, HTML, Astro templates | `<!-- claim:<id> -->` |
| MDX (`.mdx`): "Instead of HTML comments, you can use JavaScript comments in braces" ([mdxjs.com, What is MDX](https://mdxjs.com/docs/what-is-mdx/), page undated, read 2026-11-27) | `{/* claim:<id> */}` |
| TypeScript, JavaScript | `// claim:<id>` |
| TOML (`Cargo.toml`, `pyproject.toml`, `claims.toml`), YAML frontmatter | `# claim:<id>` |
| JSON (`package.json`, extension manifests), `github:description` | no marker; covered only by the `surface` binding |

Each marker sits at the end of the hit line, or alone on the line directly above it. A marker at the end of one line never covers the next line.

### Gate and record

**MKT-CLAIM-01 (MUST).** Run the claims lint in CI on every change to a copy surface, before publication. A pattern hit (MKT-CLAIM-02) on an added line must be covered by a marker that resolves to a live record (marker table above), or by the record's `surface` binding, or render its value from that record. Without a record, rewrite the sentence (MKT-CLAIM-08) or delete it.
- *Rationale:* the basis must exist before dissemination ([FTC 1984](https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation)), and no human reviews the agent's output.
- *Verify:* checks A to E pass in CI. The marker half of check C, as a reference shell function (tested 2026-11-27 on a Markdown and a TOML fixture: it passed a marker-only line above and an end-of-line marker, and failed a hit whose line above carried another line's marker):
  ```sh
  # usage: git diff -U0 origin/main -- "$f" | unmarked "$f"   (prints one line per uncovered hit)
  unmarked() {
    awk '/^@@/{split($3,a,/[+,]/);n=a[2];next} /^\+\+\+/{next} /^\+/{print n++}' | while read -r n; do
      sed -n "${n}p" "$1" | grep -q -i -E -f claim-patterns.txt || continue
      sed -n "${n}p" "$1" | grep -q -E 'claim:[a-z0-9-]+' && continue
      [ "$n" -gt 1 ] && sed -n "$((n-1))p" "$1" | grep -q -E '^[[:space:]]*(<!--|//|#|\{/\*)[[:space:]]*claim:[a-z0-9-]+[[:space:]]*(-->|\*/\})?[[:space:]]*$' && continue
      echo "$1:$n: claim pattern without a claim:<id> marker"
    done; }
  ```
  The function does not strip fences or `<style>` blocks and does not apply the JSON and remote `surface` binding; the lint does both.

**MKT-CLAIM-02 (MUST).** Treat a sentence on a copy surface as an objective claim when it matches this set, applied to prose outside fenced code blocks:
```
[0-9]+([.,][0-9]+)? ?(%|×)
\b[0-9]+(\.[0-9]+)? ?(x|ms|MB|GB|seconds|minutes)\b
\b([0-9]+([,.][0-9]+)*\+?|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|fifty|hundred|dozens|hundreds|thousands|millions) (users|clients|agents|packages|skills|tools|platforms|integrations|customers|companies|teams|developers|downloads|stars|contributors)\b
[$€£][0-9]|\bper (seat|user|month)\b|/mo\b|\bfree (tier|plan|trial|forever)\b|\bunlimited\b
\b(fast|faster|fastest|instant(ly)?|blazing\w*|lightning\w*|lightweight|smaller|smallest|cheaper|cheapest|scalable|reliable|secure|safest|unhackable)\b
\b(SOC ?[123]|ISO ?(/IEC )?27001|GDPR|HIPAA|PCI|FedRAMP|certified|compliant|audited)\b
\b(trusted by|used by|loved by|adopted by|chosen by|recommended by)\b
\b(production-ready|battle-tested|enterprise-grade|industry-leading|best-in-class|world-class|military-grade|bank-grade)\b
\b(AI-powered|AI-driven|powered by AI|human-level|no hallucinations?|state-of-the-art)\b
\b(better|best|cheaper) than\b|\bunlike\b
```
On headline lines only (title, tagline, hero H1 and subhead, meta description, manifest description, repository description), also read each universal quantifier (`every`, `all`, `any`, `never`, `always`, `zero`, `no <noun> required`). Each one needs a named list or a record beside it.
- *Rationale:* the FTC's puffery line is narrow. Exaggeration that readers take seriously is actionable ([FTC deception statement, 1983, fn. 41-42, archived](https://web.archive.org/web/2013id_/http://www.ftc.gov/bcp/policystmt/ad-decept.htm)). The quantifier arm is noise as a grep (C3).
- *Verify:* the lint loads exactly this file. Fenced blocks are removed first with `awk '/^[[:space:]]*(```|~~~)/{f=!f;next} !f'`, and in `.astro`, `.html` and `.svelte` files every `<style>` block too: without that, the percent arm matched 4 CSS lines (`88%`, `62%`, `inset(50%)`) in `grimoire-rs/grimoire/docs/src/pages/index.astro:118-120,312`. The percent and `×` arm has no `\b` on either side of the sign, because `\b` after a non-word character needs a word character next ("50% smaller" and "98%." never matched the first draft). The file header carries the precision note of 2026-11-27 (below). A pattern change must re-run it on the fleet and the exemplar corpus and update the note.
- *Precision note, 2026-11-27* (commands under "Applied"): fleet headline corpus, 4 hits, 4 claim words. 26 exemplar home pages (5,797 visible-text lines), 326 hits; the old draft 297. Hand-classified arms: percent and `×`, 40 hits, 32 real claims, 8 UI mock-ups and chart axes (Cal.com's demo dashboard, PostHog's "1.5×IQR", Vercel's demo report); the old draft caught 7 of the 32. Social proof, 20 hits, 18 real, 2 false ("Memory used by the same servers", "APIs used by the rider app"). Word-numeral counts, 1 hit, real ("Six tools, one binary."). The other arms were counted, not classified.

**MKT-CLAIM-03 (MUST).** Never write a price, limit, quota, plan or tier name, free-tier boundary, discount or count without a record whose `source` is the system of record: the pricing config, the limits file, the owner's written decision, a registry or API query, or a command over the code. `allow` entries never apply to these classes. When no source exists, ask the owner. Do not draft a number as a placeholder.
- *Rationale:* price is a listed element of the EU misleading-action test, and "free" while the reader pays more than the unavoidable cost is always unfair ([Directive 2005/29/EC Art. 6(1)(d)](https://www.legislation.gov.uk/eudr/2005/29/article/6), [Annex I point 20](https://www.legislation.gov.uk/eudr/2005/29/annex/I); UK-hosted copy of the EU text, fetched 2026-11-27, refresh_by 2027-05-27). The fleet has no prices, so any price an agent writes is invented.
- *Verify:* check E. A hit on the count line (line 3) or the price line (line 4) of MKT-CLAIM-02 with no live row of class `count` or `price-or-limit` fails, whatever `[[allow]]` says. For `class = "count"`, `check` holds a command; the lint re-runs it and fails when its output differs from `value`.

**MKT-CLAIM-04 (MUST).** Give every record the common fields plus the fields its class requires:

| Field | Meaning |
|---|---|
| `id` | kebab-case, unique in the file |
| `class` | `performance`, `comparison`, `statistic`, `count`, `price-or-limit`, `licence`, `security-mechanism`, `security-attestation`, `security-commitment`, `ai-capability`, `endorsement` or `maturity` |
| `claim` | the exact copy string, byte-equal to the surface |
| `surface` | list of repository paths or `github:description` |
| `value`, `unit` | for every number-bearing claim |
| `source`, `source_type` | URL, repository path or decision reference. `source_type` is one of `own-measurement`, `vendor-data`, `third-party-study`, `primary-law`, `authority-doc`, `platform-doc` or `owner-decision`. |
| `method`, `check` | how the value was made, and a command that re-measures or re-reads it, or `none` |
| `observed`, `refresh_by` | `observed` is an ISO date. `refresh_by` is an ISO date after `observed`, or the string `"next-release"`, which expires the row when the manifest version moves past `subject_version` (check D). |
| `definition`, `window` | what is counted or measured, and over which period or run set |
| `subject_version` | version of this product, and of each compared product |
| `caveat` | one line on what the figure does not show |
| `approved_by` | human handle, required on sign-off classes (MKT-CLAIM-16) |
| `legal_hold` | `none`, or the reason a human blocked the claim |

Required by class (X required, o when it applies):

| Class | value, unit | method, check | definition | window | subject_version | caveat | approved_by | extra fields |
|---|---|---|---|---|---|---|---|---|
| performance | X | X: command, hardware, OS, workload and revision, cache state, run count and statistic, raw-data path | o | X | X | X | | |
| comparison | X | X, both arms on the same workload | X: both sides named | X | X: both sides | X | | |
| statistic | X | o | X: population, measure | X | | X | | |
| count | X | X: command that counts | X: what is counted | o | X | | | |
| price-or-limit | X | X: how to re-read | X: plan, tax, billing unit | o | X | X | X | |
| licence | | X: path of the LICENSE file | | | X | | | `spdx_expression`, `spdx_list_version` |
| security-mechanism | | X: command or workflow file that shows it | X | | X | | | |
| security-attestation | | o | X: scope | X: audit period | X: in-scope service | X | X | `examiner`, `access_route` |
| security-commitment | X | o | X | | | | X | |
| ai-capability | X: metric | X: eval set name and size, who ran it | X: what counts as correct, conditions | X | X: model and product version | X | X | |
| endorsement | | | X: material connection | | o | | X | `kind`, `who`, `said_where`, `captured`, `original_ref`, `edits`, `permission`, `permission_ref`, `connection`, `disclosure_text`, `typical_result` |
| maturity | | o | X: criteria for the grade | | X | X | X | |

- *Rationale:* the field list merges the shared contract with SPEC's reproduction fields ([SPEC CPU 2017 run rules](https://www.spec.org/cpu2017/Docs/runrules.html)), the licence fields from SPDX, and the endorsement fields from 16 CFR 255.1 and 255.5 ([eCFR Part 255](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255), 88 FR 48102, 2023-07-26).
- *Verify:* check A, the schema check (table above): a missing required field fails; a date `refresh_by` must be after `observed`, and `"next-release"` is the only non-date value accepted; any raw-data or LICENSE path must pass `test -e`.

Example row. It is illustrative: no fleet surface says "10 clients" today. The grimoire README and GitHub description name the ten clients one by one instead.
```toml
[[claim]]
id = "grim-client-count"
class = "count"
claim = "10 clients"
surface = ["README.md"]
value = 10
unit = "supported clients"
source = "grimoire-rs/grimoire/README.md:17-19"
source_type = "own-measurement"
method = "count of client names in the README install sentence"
check = "sed -n 17,19p README.md | tr '\\n' ' ' | sed -E 's/.*writes it into (.*) — each.*/\\1/' | sed 's/, and /, /' | tr ',' '\\n' | grep -c ."   # prints 10 on 2026-11-27; swap for the product's own client listing once one exists
definition = "clients grim writes config for at the released version"
observed = 2026-11-27
refresh_by = "next-release"
subject_version = "grim 0.16.0"
```

**MKT-CLAIM-05 (MUST).** Give every record a `refresh_by`, and treat an expired record as absent. Take the interval from the default table below, or from a `[defaults]` table in `claims.toml` that the owner wrote. An agent never lengthens an interval, in `[defaults]` or in a row; it may shorten one and say why in `caveat`. The MUST is the expiry. The intervals are owner-tunable defaults.

| Class | Default `refresh_by` (owner-tunable, not sourced) |
|---|---|
| performance, comparison | 90 days, or the next minor release of the subject or any compared product, whichever comes first |
| statistic | 12 months from the source's own date |
| count from code | next release; the `check` command re-runs in the release pipeline |
| count from a third-party platform (stars, downloads, dependents) | 30 days, and the retrieval date is shown on the page |
| price-or-limit | 30 days, and on any change to the pricing source |
| licence | next release, any change to the LICENSE file, or a new SPDX list version |
| security-mechanism | next release |
| security-attestation | end of the audit period + 12 months, and never past the certificate's expiry |
| security-commitment | 12 months, reconfirmed by the owner |
| ai-capability | 90 days, or any change of model or provider version, whichever comes first |
| endorsement | 12 months, rechecked with the endorser |
| maturity | next release |
| law or platform fact cited inside a rule | 6 months from the fetch date |

- *Rationale:* claims decay at the rate of their source. 255.1(b) asks an advertiser to reconfirm an endorser's views "at reasonable intervals" ([eCFR Part 255](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255)). That sources the duty to expire, not the numbers: the intervals are this topic's design, which is why the owner may tune them and an agent may not loosen them.
- *Verify:* check D. The lint fails when a date `refresh_by` is before today, or when `refresh_by = "next-release"` and the manifest version differs from `subject_version`. It also fails when a row's interval (`refresh_by` minus `observed`) is longer than the default for its class, unless `[defaults]` allows it; `[defaults]` changes pass only under the MKT-CLAIM-16 review.

### Performance, statistics, rewrites

**MKT-CLAIM-06 (MUST).** Publish a performance or comparison figure only with a method page that the figure links within the same paragraph or caption. The page names hardware, OS, the version of each product, the workload, the run count and the statistic, the date, and the path to the raw data. Never put figures from different machines, versions or workloads in one chart without saying so beside it.
- *Rationale:* SPEC requires disclosure "sufficient for independent reproduction". uv's benchmark page omits date, version and hardware model, and bun.sh mixes hardware rows without comment ([uv BENCHMARKS.md](https://raw.githubusercontent.com/astral-sh/uv/main/BENCHMARKS.md), [bun.sh](https://bun.sh/), both vendor data, read 2026-11-27).
- *Verify:* the lint renders the page (or greps the source) and requires an `<a href>` to the record's `method` URL within 300 characters of each `value`. The record has every performance field, and the raw-data path passes `test -f`.

**MKT-CLAIM-07 (MUST).** Never write a statistic from memory. A statistic record holds a fetched URL that returns HTTP 200, the source's own date, the population and the measure. A figure from the vendor's own product, a sponsor or a vendor-run survey gets `source_type = "vendor-data"`, and the copy names the vendor or says "our test".
- *Rationale:* scouts found practitioner heuristics (60:40, 95:5) repeated as laws. The FTC asks for the level of proof that the ad itself conveys ([FTC 1984](https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation)).
- *Verify:* `curl -sIL -o /dev/null -w '%{http_code}' <source>` returns 200. In every `vendor-data` row, `claim` contains `our`, `we` or the vendor's name.

**MKT-CLAIM-08 (MUST).** When a claim has no record, rewrite it as a mechanism: the action the software takes, plus a command, file or test a reader can use to check it. An outcome word may stay only as a headline whose same or next sentence names the artefact and links its proof. A softer adjective is not a fix.
- *Rationale:* a mechanism can be checked by running the software. An adjective cannot. The fleet's supply-chain section already does this correctly: an outcome headline, a mechanism line, then a link to the verify guide (`ocx-sh/website/site/src/components/Landing.astro:127-133`).
- *Verify:* every outcome word from line 5 of MKT-CLAIM-02, and every `safe|trusted|private|encrypted|protected|hardened`, shares its sentence or the next one with a mechanism token (`sha256|digest|signature|Sigstore|SBOM|attestation|TLS|AES|lockfile|cache|--[a-z-]+` or a backticked command) or a link. Pass: "Switches the active version by moving one symlink; nothing is downloaded." Fail: "Switch versions instantly."

**MKT-CLAIM-09 (SHOULD).** Leave an existing owner-written tagline adjective on a headline line as it is: neither delete it nor replace it on your own initiative. List each one you meet in the change description for the owner. Add no new one.
- *Rationale:* puffery is a brand and legal call that an agent cannot make (C7). An agent's default on a referent-free tagline is to "fix" it; the owner decides. DOC-PLAIN-12 already covers word choice.
- *Verify:* the lint pattern is `simple|easy|modern|clean|elegant|intuitive` with `grep -i -w`, over the headline lines of `git diff -U0 origin/main`. A match on an added line with no matching removed line in the same hunk warns (a new adjective). A match on a removed line with no matching added line warns (a deleted owner adjective).

**MKT-CLAIM-10 (MUST).** Never delete or soften a statement of absence or limitation while editing copy: "no third-party audit", "no signature verification", "early development", "pre-1.0", "unstable", "no bounty", and any line the owner marked `keep:absence`. The only exception is a record or release that changes the fact.
- *Rationale:* agents "tighten" copy by cutting negatives because they read badly. These lines are the fleet's most honest claims (`grimoire-rs/grimoire/docs/src/content/docs/guides/inspect.md:148`, `Landing.astro:155-157`).
- *Verify:* `git diff -U0 origin/main -- <surfaces> | grep '^-' | grep -v '^---' | grep -i -E 'no (third-party )?audit|no signature|early development|pre-1\.0|unstable|no bounty|keep:absence'` prints nothing, unless the same commit changes the matching record or the release notes state the change. Any other absence the owner wants protected carries a `keep:absence` marker in the surface's comment syntax (marker table above). Measured 2026-11-27 on the fleet headline corpus: the named phrases match 5 lines, all of them limitation statements (`grimoire-rs/grim-mirror/README.md:10`, `grimoire-rs/indexer/README.md:60,69`, `ocx-sh/catalog/README.md:33`, `Landing.astro:157`). The first draft's pattern, with bare `does not` and `experimental`, matched 21.

### Licence and openness

**MKT-CLAIM-11 (MUST).** Write "open source" about a component only when every option of its SPDX expression has `isOsiApproved: true` in the SPDX `licenses.json` fetched on this run. Otherwise write "source-available under <id>", or "fair source" with the conversion date for a delayed-open licence. For a mixed expression, name each option's class. For open core, name which components carry which licence. For a model, write "open weights under <id>" unless all three OSAID 1.0 items are released (data information, complete code, parameters). "OSI Approved", the OSI logo and "Open Source Initiative" need the owner's approval.
- *Rationale:* the OSI board's position is that a company may not "claim or imply" that software under an unapproved licence is open source ([OSI, 2021-01-19](https://opensource.org/blog/the-sspl-is-not-an-open-source-license)). Platform fact: SPDX list 3.29.0, released 2026-09-16, has 740 entries, of which 154 are OSI-approved ([licenses.json](https://spdx.org/licenses/licenses.json)). BUSL-1.1, SSPL-1.0 and Elastic-2.0 are false. SPDX id `Fair` is OSI-approved and is not "fair source". Re-check: fetch the JSON and read `licenseListVersion` on every run. Never hand-maintain the list.
- *Verify:* `curl -sL https://spdx.org/licenses/licenses.json`, then a script reads the manifest expression (Cargo: `[package]` and `[workspace.package]`) and fails when copy matching `open[- ]source` sits in a repository where any option is not approved.

**MKT-CLAIM-12 (MUST).** Keep the licence identical everywhere it is stated: the LICENSE file, every manifest field (`license` in Cargo including `[workspace.package]`, `package.json`, `pyproject.toml` `project.license`, the OCI annotation `org.opencontainers.image.licenses`), the README licence line, and the `license:` frontmatter of published artifacts. Use a current, non-deprecated SPDX id. A repository that names a licence anywhere has a LICENSE file.
- *Rationale:* the SPDX id is the one machine-checkable licence claim. Cargo and npm deprecate the `/` separator and object-style licences ([Cargo manifest](https://doc.rust-lang.org/cargo/reference/manifest.html#the-license-and-license-file-fields), [npm package.json](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#license)).
- *Verify:* `ls LICENSE*` is non-empty whenever `grep -rlE '^license:|"license"|^license *=' . README.md` finds anything. All extracted ids are equal. `isDeprecatedLicenseId` is false for each id.

**MKT-CLAIM-13 (MUST).** Write "free" only with its meaning in the same sentence: "free of charge" plus its scope, a named plan limit, or a licence id. Never put "free" or "open source" next to a feature that is gated, trial-limited or only in a paid edition. A bare "free" in a headline is allowed only when the limit or the paid boundary is on the same screen.
- *Rationale:* the FTC "Free" guide requires terms "clearly and conspicuously at the outset", and an asterisked footnote is not enough ([16 CFR 251.1](https://www.law.cornell.edu/cfr/text/16/251.1), 1971-11-10). Applying it to free tiers is an inference.
- *Verify:* every `(^|[^[:alnum:]-])free\b` hit on a copy surface (so "dependency-free" is skipped) is covered by one of three things in the same sentence: a `claim:<id>` marker that resolves to a live `price-or-limit` row; an SPDX id from the fetched `licenses.json`; or a named limit, meaning a number with a unit (`[0-9]+[- ]?(day|month|year)s?`, or a number, optionally followed by "free", before `GB|MB|TB|requests|seats|users|projects|builds|minutes|hours|events|members`). The words "plan", "tier" and "trial" alone do not cover it, so "Free plan" with no limit fails. A headline hit also needs the covering row's `claim` string inside the same `<section>` of the built HTML. For each feature named next to "free", the row's edition is not a paid one. Measured 2026-11-27, line by line: 0 hits on the fleet headline corpus; 54 hits on the exemplar text, of which 4 are covered ("100 free projects", "30-day free trial", "2 months free", "Vite is MIT Licensed and will always be free") and 50 are not. 6 of the 50 are not the price sense (Cal.com's "an hour you're free"); they need an `[[allow]]` entry, and check E rejects that entry when the line also names a price or plan. A sentence split across extracted lines undercounts coverage (Svelte's "free and open source software released under the" MIT line).

### Security and compliance

**MKT-CLAIM-14 (MUST).** Never write "SOC 2 certified", "SOC 2 certification", "SOC 2 compliant", or "compliant with" or "certified for" a law (GDPR, HIPAA, CCPA, the EU AI Act). For a SOC report, state the type, the period, the examiner and the access route. Generic security superlatives are left to the lint pattern below and MKT-CLAIM-02; they need no rule text. "ISO/IEC 27001 certified" is allowed only with a `security-attestation` record holding the certificate number, certification body, scope and expiry.
- *Rationale:* see C4. Two market leaders write "SOC 2 Type II certification" and "SOC 2 type 2 certified" with no period or examiner ([Tailscale](https://tailscale.com/security), [1Password](https://1password.com/security), read 2026-11-27). Agents copy them.
- *Verify:* `grep -rniE 'SOC ?[123] (certif|compliant)|(GDPR|HIPAA|CCPA|AI Act)[- ](compliant|certified)|compliant with (GDPR|HIPAA|CCPA)|100% secure|unhackable|military-grade|bank-grade' <surfaces>` prints nothing. Every `ISO ?(/IEC )?27001` hit resolves to a record with `examiner`, `window` and an unexpired `refresh_by`.

**MKT-CLAIM-15 (SHOULD).** Write "verified" or "signed" only with the object and the method on the same line ("checksum-verified", "verified against CLI 1.0.88 on 2026-09-28", "keyless Sigstore signature from `release-ocx.yml`"). Never use it as a quality stamp ("verified publisher", "verified safe") unless a record names who verified what.
- *Rationale:* an undefined badge implies an audit. The fleet's 28 dated "Verified <date> against <source>" stamps are the model to follow (AI, security and compliance dive, F5).
- *Verify:* `grep -rniE -w 'verified (publisher|safe|secure|by us)|trusted publisher' <surfaces>` prints nothing without a resolving record.

**MKT-CLAIM-16 (MUST).** Get a named human sign-off before these classes ship: security attestation, security commitment (response time, SLA, uptime, bounty), any AI-capability figure or comparison, price-or-limit, maturity grade ("stable", "1.0", "production-ready"), and any endorsement whose `connection` is not all false. An agent never writes `source`, `window`, `observed` or `value` on these rows.
- *Rationale:* the advertiser answers for claims made on its behalf, including by its agents and agencies (255.1(d), 255.1(f), [eCFR Part 255](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255)). Only a human can attach the real report or confirm that a promise can be met.
- *Verify:* `CODEOWNERS` lists `/claims.toml`, and branch protection requires a code-owner review. For the pull request that adds or changes a sign-off row, `gh api repos/<owner>/<repo>/pulls/<n>/reviews --jq '[.[] | select(.state=="APPROVED") | .user.login]'` holds a login that is not in `gh api repos/<owner>/<repo>/pulls/<n> --jq .user.login` and not in `gh api repos/<owner>/<repo>/pulls/<n>/commits --jq '[.[].author.login]'`. `approved_by` is read only as a hint. Neither a commit author name nor a commit signature counts (C12). Where the agent and the owner share one GitHub login, as in this fleet today, the check cannot pass, so sign-off classes stay blocked until the owner gives agents their own identity.

**MKT-CLAIM-17 (SHOULD).** A site with a security page, or a repository with `SECURITY.md`, also serves `/.well-known/security.txt` with `Contact` and `Expires` (the two RFC 9116 MUST fields). `Expires` is less than one year ahead. Add `Policy` and `Canonical`.
- *Rationale:* RFC 9116 defines the disclosure channel that a trust claim points to ([RFC 9116](https://www.rfc-editor.org/rfc/rfc9116), April 2022, Informational). On 2026-11-27, Tailscale's and GitHub's files had both fields and 1Password's lacked `Expires`.
- *Verify:* `curl -sf https://<host>/.well-known/security.txt | grep -cE '^(Contact|Expires):'` returns 2. The `Expires` value is after today and fewer than 366 days ahead.

### AI capability

**MKT-CLAIM-18 (MUST).** Label a product or feature "AI-powered", "AI-driven", "agentic" or "intelligent" only when the shipped artefact calls a model at runtime for the function the copy names. The record's `source` is the call-site path. Building the product with an AI assistant, or installing configuration for AI tools, does not qualify.
- *Rationale:* the FTC says "merely using an AI tool in the development process is not the same as a product having AI in it", and its technologists "can look under the hood" ([FTC, 2023-02-27, archived](https://web.archive.org/web/2024/https://www.ftc.gov/business-guidance/blog/2023/02/keep-your-ai-claims-check)).
- *Verify:* each `AI[- ](powered|driven|enabled)|powered by AI|agentic|intelligent` hit resolves to a record whose `source` path exists and contains a model-client call (`grep -nE 'anthropic|openai|generativeai|ollama|onnx|transformers' <source>`).

**MKT-CLAIM-19 (MUST).** Write an AI accuracy, precision, error-rate, time-saved, "better than", "replaces" or "as good as a professional" claim only with an `ai-capability` record. The record holds the metric, what counts as correct, the eval set name and size, who ran it, the model and product version, the conditions the figure holds under, and both arms of any comparison. Never write "no hallucinations", "always accurate" or "100% accurate". Never claim prediction of human behaviour, detection of AI-written text, legal, medical or financial advice, or replacement of a licensed professional without the owner's sign-off.
- *Rationale:* Workado claimed "98 percent" accuracy and measured 53 percent on general content. Its order requires "competent and reliable evidence ... at the time it is made" ([FTC, 2025-04-28](https://www.ftc.gov/news-events/news/press-releases/2025/04/ftc-order-requires-workado-back-artificial-intelligence-detection-claims); [final order, 2025-08-28](https://www.ftc.gov/news-events/news/press-releases/2025/08/ftc-approves-final-order-against-workado-llc-which-misrepresented-accuracy-its-artificial)). DoNotPay never tested its "robot lawyer" ([FTC, 2025-02-11](https://www.ftc.gov/node/87474)).
- *Verify:* `grep -rniE '[0-9]{1,3}(\.[0-9]+)? ?% ?(accura|precis|recall|correct|faster)|(more|most) accurate|human[- ]level|replaces? (your|a|the) |as good as|no hallucinat|100% accurate|detect(s|or)? (AI|ChatGPT)|legal advice|diagnos' <surfaces>`. Every hit resolves to an `ai-capability` record with `method`, `window`, `subject_version` and `approved_by`. The banned phrases fail outright.

### Endorsements and proof

**MKT-CLAIM-20 (MUST).** Never write a quote, a name with a role, a rating, a review, a testimonial, a customer logo, a review-site badge or an adopter name unless an `endorsement` record backs it. Never generate one, never write a composite, and never draft review text for a customer to sign. A blank list of questions is allowed. A persona appears only under a heading labelled "Persona", without quotation marks. An adopter name needs a self-added pull request or a written permission. Dependency graphs, lockfiles and download counts are evidence of use, not consent.
- *Rationale:* 465.2(a) bars writing or creating a testimonial that misrepresents the person's existence or experience ([eCFR Part 465](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465), in force 2024-10-21). "AI-generated reviews are covered by the final rule" ([Federal Register, 2024-08-22, fn. 35](https://www.federalregister.gov/documents/2024/08/22/2024-18519/trade-regulation-rule-on-the-use-of-consumer-reviews-and-testimonials)). "The name or seal of an organization can be endorsements" (255.0(b)).
- *Verify:* every `<blockquote>`, every `[“"][^”"]{20,}[”"]\s*[-—–]\s*[A-Z]` match, every `<img alt="...logo...">` inside a proof block, every badge image and every `ADOPTERS.md` entry carries `data-proof="<id>"` or a `claim:` marker that resolves to an `endorsement` row whose `permission.type` is `written` or `public-statement`.

**MKT-CLAIM-21 (MUST).** Use quotation marks only for the endorser's exact words. List every cut in `edits`, and show it on the page as an ellipsis. Put the capture date beside the quote in a `<time datetime>` element inside the endorsement element.
- *Rationale:* quotation marks represent exact words, and shortening must not "distort in any way" (255.1(b)). Of 8 exemplar landing pages with quotes, 0 dated any of them, which is the base rate an agent copies (endorsements dive, 3.1, measured 2026-11-27).
- *Verify:* the text at `original_ref`, minus the `edits`, equals `published_text`. The DOM check finds `<time datetime>` inside each element with `data-proof`.

**MKT-CLAIM-22 (MUST).** When any `connection` field is true (paid, free product or discount, employee, contractor or agent, family, investor, partner or referral fee, early access or prize), state the connection in the same element as the endorsement. It must be visible without a click or hover and be in the endorsement's language. Use the wording "Paid testimonial", "{Name} works for {Company}", "{Name} is an investor in {Company}", "{Name} received {product} free of charge" or "{Name} had early access to {product}". A footer, a tooltip, a `<details>` element or a link to a disclosure page does not count.
- *Rationale:* on the internet a disclosure "must be unavoidable" and is "not clear and conspicuous if a consumer must take any action, such as clicking" (465.1(c), [eCFR Part 465](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465)). 255.5(a) requires that the disclosure "clearly communicate the nature of the connection".
- *Verify:* the DOM check finds `disclosure_text` inside the element with `data-proof`, and the disclosure is not inside `hidden`, `details`, a `title=` value or an `aria-describedby` target alone. The wording matches the list.

**MKT-CLAIM-23 (MUST).** Label a page "case study", "results" or "proof" only when its record holds a baseline, an outcome, a period, a method, a unit and a denominator. Every other page is a "customer story". Every result figure has a sentence beside it stating the generally expected result, unless `typical_result = true` is substantiated.
- *Rationale:* a result figure implies it is typical (255.2(b)). Of 15 exemplar case studies, 2 give both a before and an after value and 0 give a method (endorsements dive, 3.2, vendor data, measured 2026-11-27).
- *Verify:* `grep -rliE 'case[- ]stud|results' <page paths and h1>` resolves to a record with all six fields. Each numeric result has a sibling "Typical result" sentence or a record link.

**MKT-CLAIM-24 (MUST).** Show a third-party popularity count (stars, downloads, dependents, followers) only as the number, a link to its source and the retrieval date. Never present it as a customer or adopter list. Never buy one, and never trade one ("star for star").
- *Rationale:* 465.8(b) makes it unlawful to "purchase or procure fake indicators of social media influence", and 465.1(h) defines fake indicators to include those that "otherwise do not reflect a real individual's or entity's activities, opinions, findings, or experiences" ([eCFR, 16 CFR 465.1 and 465.8, point-in-time 2026-11-01, read 2026-11-27](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465)). Buying is in the text. Reading a traded star as one that does not reflect an opinion is this topic's inference. Plainly asking readers for a star is not reached by Part 465; whether a platform allows it is a platform term that the channels sub-program owns. Platform counts change daily (C6).
- *Verify:* each count hit sits within one element of an `<a href>` to the platform API or page and a `<time>`. `grep -rniE 'buy(ing)? (github )?(stars|followers|upvotes|downloads)|upvote ring|star[- ](for|4)[- ]star'` over every copy surface plus `CONTRIBUTING.md` and `.github/` prints nothing. The lint fails when that file list is empty, so the check cannot pass on no input.

**MKT-CLAIM-25 (SHOULD).** Send a review or testimonial request to every member of a defined set (all customers in a period, all users of a version), never filtered by score, NPS or sentiment.
- *Rationale:* this is the conservative reading of an unsettled point (C14). The rule preamble says requests "made only to customers whom the business believes to be happy customers would not be 'generalized solicitations'" ([Federal Register, 2024-08-22](https://www.federalregister.gov/documents/2024/08/22/2024-18519/trade-regulation-rule-on-the-use-of-consumer-reviews-and-testimonials)). The FTC's Q&A says the practice does not violate a specific Part 465 prohibition but "could still violate the FTC Act" (endorsements dive, section 1.5). Both point the same way; neither makes it a clear rule breach.
- *Verify:* the request automation has no condition on `score|nps|rating|sentiment`.

**MKT-CLAIM-26 (MUST).** Tie no incentive for a review to its rating or sentiment, in words or by implication. Title a curated set of reviews "Selected reviews", never "All reviews", whenever any review is withheld for its rating or negative sentiment.
- *Rationale:* 465.4 bars incentives "conditioned expressly or by implication on, the writing or creation of consumer reviews expressing a particular sentiment, whether positive or negative". 465.7(b) bars misrepresenting that displayed reviews "represent most or all the reviews submitted" while reviews are suppressed for their ratings or negative sentiment ([eCFR, 16 CFR 465.4 and 465.7, point-in-time 2026-11-01, read 2026-11-27](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465)).
- *Verify:* the incentive text contains none of `rating|stars|positive|5-star|five-star|good review`. The string `All reviews` is absent from any heading above a curated list.

Platform-specific review-site terms are left to the channels sub-program: G2's $100 incentive cap and its AI-drafting rule from 2026-11-04, and Clutch's caps ([G2](https://legal.g2.com/community-guidelines), page undated; [Clutch](https://clutch.co/methodology), "last updated October 2026"). This topic only requires that a badge or rating have a record (MKT-CLAIM-20).

## Applied to the fleet

Evidence paths are relative to `/home/mherwig/dev`. The headline measurement was re-run for this file on 2026-11-27, using `bash -c` because zsh does not split words:

```
cat ocx-sh/*/README.md grimoire-rs/*/README.md ocx-sh/website/site/src/components/Landing.astro \
    ocx-sh/website/site/src/components/landing-content.ts grimoire-rs/grimoire/docs/src/pages/index.astro \
    grimoire-rs/grimoire/docs/src/data/landing.ts > corpus.txt                     # 2,610 lines
grep -c -i -w -E "never|always|every|everywhere|zero|guaranteed|unlimited|all|any|only" corpus.txt   # 170
grep -c -i -w -E "than|vs\.?|versus|unlike|compared to|alternative to" corpus.txt                     # 27
# MKT-CLAIM-02 set, fenced code stripped per file: 4 hits (ocx README:16; vscode README:60, 62, 180)
```

The first draft of the set had two more arms. `quick` matched 6 "Quick start" headings, and a count arm that allowed a trailing dot matched the list item "3. Packages live in the shared `OCX_HOME` store" at `ocx-sh/rules_ocx/README.md:80`. Both were removed before the set above was fixed.

Re-measurement of the revised set, 2026-11-27. Scratch directory `S=~/.cache/research-lang/exemplars/product/mkt-claim-02-remeasure`; `old.txt` is the first-draft set, `new.txt` the set in MKT-CLAIM-02. All `grep` calls are `/usr/bin/grep`, because a shell hook on this machine rewrites `grep` and its redirected output came back empty.

```
# fleet: same 2,610-line file list, fences and <style> blocks stripped, file:line kept -> $S/fleet2.txt (2,043 lines)
for f in $files; do awk -v F="$f" '/^[[:space:]]*(```|~~~)/{f=!f;next} /<style[ >]/{s=1} s{if(/<\/style>/)s=0;next} !f{print F":"FNR":"$0}' "$f"; done
grep -c -i -E -f $S/new.txt $S/fleet2.txt                 # 4 (the same 4 lines as above); 8 before <style> stripping
# exemplars: 26 home pages from product-audit/exemplar-landing-pages.md (that audit's 27 minus grimoire.rs; ocx.sh unreachable),
# one curl each, all HTTP 200; visible text via a stdlib HTMLParser script that drops script, style, svg, pre, noscript
grep -c -i -E -f $S/old.txt $S/exemplars.txt              # 297 of 5,797 lines
grep -c -i -E -f $S/new.txt $S/exemplars.txt              # 326
grep -E '[0-9] ?(%|×)' $S/exemplars.txt | grep -c -i -E -f $S/old.txt   # 12 of 40 (7 of the 32 real claims)
grep -c -i -E '\b(trusted by|used by|loved by|adopted by|chosen by|recommended by)\b' $S/fleet2.txt     # 0
cat ocx-sh/*/SECURITY.md grimoire-rs/*/SECURITY.md | grep -c -i -E '<same arm>'                          # 0 (6 files)
grep -c -i -E '<same arm>' $S/exemplars.txt              # 20, 18 real
grep -c -i -E 'trusted by (thousands|millions|leading|[0-9,]+\+? (companies|developers|teams))|used by (thousands|leading)|[0-9,]+\+? (companies|developers|teams)\b' $S/exemplars.txt
                                                          # 7, of which 2 are among the 18 (the DOC-TYPE-15 form)
```

| Rule | Status | Evidence |
|---|---|---|
| 01 claims lint in CI | **new commitment** | No `claims.toml` and no claims check exist in any fleet repository. The nearest is `landing.test.ts`, which binds the landing's session lines to the built HTML but reads no date (claims-evidence-record, section 6). |
| 02, 08 objective word without mechanism | **violated** | `ocx-sh/ocx/README.md:16` "switch versions instantly": no timing anywhere, and `grep -rli -E "benchmark|hyperfine|faster"` over the ocx docs finds no measurement of ocx (messaging-inventory, section 2). The ocx GitHub description begins "A fast, cross-platform binary package manager" (`gh repo view ocx-sh/ocx --json description -q .description`, read 2026-11-27; messaging-inventory row 1) and has 0 measurements. |
| 08 outcome word plus mechanism | satisfied | `grimoire-rs/vscode/README.md:60-62` "Instant details — reopening an artifact paints immediately from an on-disk" cache, and `:180` names the prefetch setting. `Landing.astro:127-133` pairs the outcome line with "ocx never runs package code at install. Signature checks and SBOMs, by digest." and a link to `verify-installs.mdx`. `grimoire-rs/indexer/README.md:61` "frozen and safe to build on" names its three artefacts. |
| 02 universal on a headline line | **violated** | "installed into every coding agent you use" (`grimoire-rs/grimoire/README.md:8`, `Cargo.toml:21`, `docs/src/content/docs/introduction.md:9`). The same README names 10 clients and says grim "says so and skips" a client that has no supported surface (`README.md:17-24`), so the README limits its own "every". Fix: name the list or the count, backed by a count record. |
| 03 count without a record | satisfied (corrected) | The first version said the grimoire GitHub description states "10 clients". It does not. It names the ten clients one by one ("Claude Code, Copilot, Cursor, Codex, Gemini, Zed, Amp, Kiro, Junie, and opencode"; `gh repo view grimoire-rs/grimoire --json description -q .description`, read 2026-11-27), as `grimoire-rs/grimoire/README.md:17-18` does. No count arm fires. The list still has no check against the release, which is failure mode 4. The one word-numeral count, "ten clients" in `grimoire-rs/grimoire/docs/src/content/docs/changelog.md:956`, is a 0.11 release heading and true of that release. |
| 03 prices, limits, Nx, percentages | satisfied, keep at zero | The price, count-noun and numeral-unit greps on the headline corpus return 0 (claims-evidence-record, section 5). No proof section on either landing: `grep -ciE "stars|trusted|used by|customers|testimonial"` returns 0 for `Landing.astro`, `landing-content.ts`, `index.astro` and `landing.ts` (site-shape.md:130). |
| 04, 05 machine-readable freshness | **violated** | `ocx-sh/website/site/src/components/landing-content.ts:1-11` dates the drift table only in comments ("ocx 0.6.5 (Node v24.22.2, 2026-11-09)", "Versions as of 2026-11-08"). There is no `refresh_by`, and no test reads the date. As a comparison, its 90-day refresh falls on 2027-02-06. This is the right shape in the wrong medium: move the dates into records, or test them. |
| 06 performance method | satisfied (vacuously) | The fleet publishes no figure. `landing-content.ts:3` states "no timing or size is claimed", which is an absence the agent must keep (rule 10). |
| 09 referent-free adjective on a headline line | **violated, owner decision** | "The Simple Package Manager" or "the simple package manager" at `ocx-sh/ocx/README.md:7`, `Cargo.toml:19`, `ocx-sh/website/site/src/content/docs/index.mdx:2` and `ocx-sh/ocx/website/astro.config.mjs:44`. At `Cargo.toml:19` it is the only description, which fails the puffery test (C7). The landing hero already sells something else ("Same tools. Every machine.", `Landing.astro:39-41`). |
| 10 keep absences | satisfied | `grimoire-rs/grimoire/docs/src/content/docs/guides/inspect.md:148` "grim performs no signature verification at all". `Landing.astro:155-157` "ocx is in early development". `landing-content.ts:3` "no timing or size is claimed". |
| 11 "open source" wording | satisfied, with one risk | The only fleet self-claim is `grimoire-rs/grimoire/docs/public/privacy.html:174` "private, non-commercial open-source project", which is accurate under Apache-2.0. "Non-commercial" describes the operator, but a reader can take it as a licence restriction, which OSD criterion 6 forbids. Wording is the owner's call. |
| 12 licence agreement | satisfied for 14 repos | 14 LICENSE files, all Apache-2.0, 0 disagreements with the manifests. Cargo workspaces read from `[workspace.package]` (claims-licence-openness, section 7). |
| 12 LICENSE file exists | **violated** | `ocx-sh/grimoire-lore` publishes 75 rule and skill files with `license: Apache-2.0` (`grep -rlE "^license: Apache-2.0" rules skills | wc -l` = 75 in this worktree) and has no LICENSE file (`git ls-files | grep -i ^LICENSE` is empty). `michael-herwig/arcana/README.md:86` says "Apache-2.0." with no file. `ocx-sh/index` and `ocx-sh/e2e-index` declare no licence. Adding a file is the owner's decision. |
| 13 "free" | satisfied | No fleet product calls itself free in public copy (claims-licence-openness, section 7). |
| 14 compliance wording | satisfied | With `R` = the 23 READMEs and `L` = the 70 landing and docs sources defined in claims-ai-security-compliance F5 (`ls ocx-sh/*/README.md grimoire-rs/*/README.md grimoire-rs/*/*/README.md`; `find` over the two site source trees, `*.test.ts` excluded), re-run 2026-11-27: `echo "$R $L" \| xargs grep -n -i -w -E 'certified\|accurate\|AI-powered'` = 0. `compliant` = 2, both "spec-compliant" (`grimoire-rs/grimoire/docs/src/content/docs/artifacts.md:803`, `vendor-metadata.md:25`), not a status claim. |
| 15 "verified" with object and method | satisfied | Same `R` and `L`: `grep -n -i -E 'verified [0-9]{4}-[0-9]{2}-[0-9]{2}\|verified against'` = 21 lines, for example `grimoire-rs/grimoire/docs/src/content/docs/clients.md:224` "(verified against CLI 1.0.88)". The MKT-CLAIM-15 stamp pattern `verified (publisher\|safe\|secure\|by us)\|trusted publisher` = 0. The dive's 28 came from a hand-scored class, not this grep. |
| 16 commitment without sign-off | **violated** | `ocx-sh/ocx/SECURITY.md:14` "We will acknowledge receipt within 48 hours and aim to provide a fix or mitigation plan within 7 days for critical issues." It has no record and no recorded owner confirmation. No `CODEOWNERS` covers a claims file. |
| 17 security.txt | **violated** | `curl -sS -o /dev/null -w '%{http_code}' https://grimoire.rs/.well-known/security.txt` returned 404 on 2026-11-27. Neither `ocx-sh/website/site/public/.well-known` nor `grimoire-rs/grimoire/docs/public/.well-known` exists (re-checked with `ls`). Both repositories carry `SECURITY.md`. ocx.sh was unreachable, so it is unmeasured. |
| 18 "AI-powered" | satisfied, high-risk | Grimoire installs configuration for AI agents and calls no model. In `grimoire-rs/grimoire`, re-run 2026-11-27: `grep -rl -i -E 'anthropic\|openai\|generativeai\|ollama\|onnx\|transformers' src` = 12 files, all under `src/export/` and `src/install/` (client-format writers such as `src/install/vendor_opencode.rs`); `grep -rn -E 'api\.anthropic\.com\|api\.openai\.com\|generativelanguage\.googleapis\|/v1/(messages\|chat/completions)' src` = 0; `grep -c -i -E '^name = "(async-openai\|anthropic\|openai\|ollama-rs\|ort\|candle-core\|llm\|genai\|rig-core)' Cargo.lock` = 0. An agent asked to "punch up" grimoire copy is likely to write "AI-powered". Rule 18 blocks it. |
| 19 AI capability figure | satisfied | 0 claims in the fleet. |
| 20-26 endorsements | satisfied, new commitment if a proof section is added | Re-run 2026-11-27 over `Landing.astro`, `landing-content.ts`, `grimoire-rs/grimoire/docs/src/pages/index.astro` and `docs/src/data/landing.ts`: `grep -c -i -E '<blockquote\|testimonial\|trusted by\|used by\|loved by\|customers\|adopters\|data-proof'` = 0 in each, and `ls ocx-sh/*/ADOPTERS.md grimoire-rs/*/ADOPTERS.md` finds none (site-shape.md:130, :217 agree). The audit leaves open whether a proof section is wanted (site-shape smell 3). If one is added, its records come first. |
| 24 popularity counts | satisfied | Same four files: `grep -c -i -E 'stargazers\|\bstars\b\|downloads\|shields\.io'` = 0 in each. Stars (ocx 20, grimoire 17) and npm downloads (`@ocx-sh/theme` 5,353 in the 30 days to 2026-11-26) exist but are not shown (distribution-posture.md:211, :222). |

## AI-agent failure modes

Ranked by how often each bites, grouped by mechanism. "Check" names the rule that catches it.

**1. Filling a slot with plausible content (most frequent).** Asked for a hero, a pricing page or a proof section, the agent produces content shaped like the exemplars.
- It invents a number: "3x faster", "50% smaller", "10,000+ developers" (02, 03).
- It invents a price, plan name or free tier for a product that has none (03).
- It invents a testimonial, a persona with a name and role, or a "Trusted by teams at Google, Stripe" line from memory or from a dependency graph (20, 24).
- It quotes a remembered statistic ("78% of developers", 95:5) (07).

**2. Training-data vocabulary.** The agent writes what the corpus writes.
- "Blazing fast", "lightning-fast install", "instantly" (02, 08).
- "SOC 2 certified" or "GDPR compliant", copied from Tailscale and 1Password style (14).
- "AI-powered" for a repository built with an AI assistant, or for a tool that configures AI agents (18).
- "Secure by default" with no mechanism (08).

**3. Tightening drift.** A rewrite for punch loses the checkable part.
- "Signed releases with SBOM" becomes "secure supply chain" (08: the mechanism token is gone from the hunk).
- "No third-party audit", "early development" or "no timing is claimed" gets deleted as negative (10).
- A customer's words get paraphrased inside quotation marks (21).

**4. Stale carry-over.**
- A count survives a release ("10 clients" after an 11th client ships) (03, 05).
- A licence is described from pre-relicensing memory (Terraform, Redis and Elastic all changed between 2021 and 2025) (11).
- A deprecated SPDX id (`GPL-3.0`, `MIT/Apache-2.0`) gets copied into a manifest (12).
- The checker reads only Cargo's `[package]` and reports "no licence" for a workspace (12).
- SPDX id `Fair` gets read as "fair source" (11).

**5. Exemplar imitation.**
- An undated, unlinked quote wall: 0 of 8 exemplar pages dated their quotes (21).
- "Case study" over a story with a percentage that has no base (23).
- A vendor benchmark chart reproduced without its hardware or version (06, 07).

**6. Scope errors.**
- "Free" in the hero with the paid tier below the fold (13).
- "Open source" for an open-core product (11).
- "Every coding agent" next to a list of 10 (02, the universal arm).
- "Compliant" for one component, read as the whole service (14).

**7. Gaming the gate.** An agent blocked by the lint may add a `claim:` marker with no record, an `allow` entry for a price, or a record it filled itself for a sign-off class. Markers must resolve (01). Blocked classes have no `allow` (03). Sign-off rows need an approving review from a GitHub login that authored neither the pull request nor its commits; a typed `approved_by`, a commit author name or a commit signature proves nothing (16). An agent may also try to lengthen a `refresh_by` interval; check D rejects that (05).

## What an agent must ask a human

- Any price, plan, tier, limit, quota, discount or free-tier boundary. The owner's answer becomes the record's `source`.
- Whether to name a competitor or benchmark against one. The ocx drift table already names apt, brew, winget and nvm. Comparative-advertising law was not sourced in this round.
- Whether the organisation holds a SOC report or an ISO certificate, and its period, examiner, scope and access route.
- Any statement that a product is compliant with a law (GDPR, HIPAA, CCPA, EU AI Act), and the Art. 50 position for an AI feature or for agent-written public text.
- Any response-time, SLA, uptime, support or bounty promise, including the existing `SECURITY.md` "48 hours" line.
- Any AI accuracy figure, comparison or "replaces" claim, and whether a feature truly calls a model when the call site is not obvious.
- Choosing, changing or adding a licence, including adding a LICENSE file to the four repositories that lack one. Using the OSI logo or the "OSI Approved" mark.
- Every endorsement: asking for permission (the owner sends the request), accepting a quote from an employee, founder, investor or relative, deciding whether a connection is "reasonably expected" by the audience, displaying a third-party logo or badge whose licence terms the agent could not read, offering a review incentive, and naming an adopter found only in public data.
- Whether a referent-free tagline ("The Simple Package Manager") stays.
- Whether to call a product "stable", "production-ready" or "1.0". That is a release decision.
- Whether a law row the agent re-fetched still applies. The 6-month refresh is a fetch, not a legal opinion.

## Decay

| Rule | Moving fact | Source, date | Refresh |
|---|---|---|---|
| 01, 03, 05, 07 | FTC substantiation and deception statements | [FTC 1984](https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation); [1983, archived](https://web.archive.org/web/2013id_/http://www.ftc.gov/bcp/policystmt/ad-decept.htm) | 6 months; next due 2027-05-27 |
| 03, 13 | EU Directive 2005/29/EC Art. 6, 7, Annex I (read from the UK-hosted copy; later EU amendments unverified) | [legislation.gov.uk](https://www.legislation.gov.uk/eudr/2005/29/article/6), fetched 2026-11-27 | 6 months; 2027-05-27. Re-read from the Publications Office Cellar copy, which worked for the AI Act when EUR-Lex returned a bot challenge. |
| 11 | SPDX licence list version and `isOsiApproved` values | [licenses.json](https://spdx.org/licenses/licenses.json), 3.29.0, 2026-09-16 | Every run: the check fetches it. Record `spdx_list_version`. |
| 11 | OSAID 1.0 acceptance | [OSI](https://opensource.org/ai/open-source-ai-definition), page undated | 6 months |
| 14 | AICPA SOC wording; a proposed 2027 SOC 2 criteria exposure draft (2026-11-16) | [AICPA](https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services) | 6 months, and when the 2027 criteria are final |
| 17 | RFC 9116 fields | [RFC 9116](https://www.rfc-editor.org/rfc/rfc9116), 2022-04 | 24 months, or on an RFC update |
| 18, 19 | FTC AI enforcement posture (Workado final 2025-08-28; Rytr set aside 2025-12-22) | FTC releases linked above | 6 months; 2027-05-27 |
| 18, 19 | EU AI Act dates as amended by Reg. (EU) 2026/1744 (Art. 50 from 2026-08-02; Art. 50(2) grace to 2026-12-02; Annex III high-risk from 2027-12-02) | [2024/1689](https://eur-lex.europa.eu/eli/reg/2024/1689/oj); [2026/1744](https://eur-lex.europa.eu/eli/reg/2026/1744/oj), OJ 2026-07-24 | 6 months; check the consolidated text before citing |
| 20-26 | 16 CFR Part 465 (in force 2024-10-21; 465.1(h), 465.4, 465.7(b) and 465.8 re-read at point-in-time 2026-11-01) and Part 255 (88 FR 48102, 2023-07-26) | [eCFR 465](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465); [eCFR 255](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255) | 6 months; 2027-05-27. Read through the eCFR versioner API (`https://www.ecfr.gov/api/versioner/v1/versions/title-16.json?part=465`). |
| note under 25 | G2 and Clutch incentive and AI-drafting terms | [G2](https://legal.g2.com/community-guidelines) (AI clause from 2026-11-04, page undated); [Clutch](https://clutch.co/methodology) (October 2026) | 3 months; owned by channels |
| 02 | Precision of the pattern set | this file, measured 2026-11-27 | Re-measure when the set changes, or once a year over the fleet and exemplar corpora |
| marker table | MDX comment syntax `{/* */}` | [mdxjs.com](https://mdxjs.com/docs/what-is-mdx/), undated, read 2026-11-27 | 12 months, or on an MDX major release |
| all records | the per-class `refresh_by` in MKT-CLAIM-05 | design decision | as the table says |

## Open questions

Owner decisions:
1. Add LICENSE files to `ocx-sh/grimoire-lore`, `michael-herwig/arcana`, `ocx-sh/index` and `ocx-sh/e2e-index`. The catalog publishes 75 artifacts that declare Apache-2.0 with no licence text behind them.
2. Keep, define or retire "The Simple Package Manager" (four surfaces), and replace or record "fast" and "instantly".
3. Confirm, change or record the `SECURITY.md` "48 hours / 7 days" promise.
4. Roll-out mode: does the claims lint block from the first commit, or start as a ratchet that only blocks new hits on existing repositories?
5. Where the lint lives: a check script in a new marketing reference skill, beside `skills/docs-quality-reference/checks/`, or an extension of `landing_check.py`.
6. Whether ocx.sh and grimoire.rs serve `security.txt`, and who owns its `Expires` renewal.
7. Whether either landing should carry a proof section at all (site-shape smell 3). If yes, which named proof the owner can get permission for.
8. The `privacy.html:174` "non-commercial open-source" wording.
9. Give agents a GitHub identity of their own (a bot account or a GitHub App), or accept that every sign-off class stays blocked. Today agents open pull requests under the owner's login, which cannot approve its own pull request, so MKT-CLAIM-16 cannot pass.
10. Whether to tune the `refresh_by` defaults in MKT-CLAIM-05 through a `[defaults]` table. They are this topic's design, not sourced.

Subareas that deserve another round:
- What do EU UCPD Annex I points 23a to 23c (fake reviews, added by Directive 2019/2161) and the prior-price rule (Directive 98/6/EC Art. 6a) say, read from the Publications Office Cellar copy instead of EUR-Lex?
- What do the UK DMCC Act 2024 fake-review ban and the current CAP Code substantiation rule number require of an agent-written page?
- Does 16 CFR Part 465 reach business-to-business testimonials, or do only section 5 and the Endorsement Guides apply?
- What does comparative-advertising law (Directive 2006/114/EC, US Lanham Act case law) require of a table that names competitors, such as the ocx drift table? This may belong to positioning-alternatives-comparison.
- What precision do the MKT-CLAIM-02 arms that were counted but not hand-classified reach on the exemplar corpus (the outcome-word arm, 131 hits; the unit arm, 85 hits, mostly benchmark figures on bun.sh and deno.com)? And what real claims does the whole set miss there? Only the percent and social-proof arms were checked for recall.

## Sub-artifacts

- [claims-evidence-record.md](marketing-claims-evidence/claims-evidence-record.md): the FTC and EU tests, benchmark method fields, the record schema, `refresh_by` defaults, the lint specification and the fleet adjective measurement.
- [claims-licence-openness.md](marketing-claims-evidence/claims-licence-openness.md): OSD, OSI marks, OSAID, SPDX data, the meanings of "free", relicensing wording failures, and the fleet LICENSE-versus-manifest table.
- [claims-ai-security-compliance.md](marketing-claims-evidence/claims-ai-security-compliance.md): FTC AI cases, SOC and ISO wording, the reach of the AI Act, exemplar trust pages and `security.txt` files, and the fleet's mechanism-versus-outcome measurement.
- [claims-endorsements-proof.md](marketing-claims-evidence/claims-endorsements-proof.md): Parts 465 and 255, material-connection wording, G2, Clutch and brand terms, and quote and case-study field coverage on 25 exemplar pages and 15 case studies.

## Key sources

1. https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation (FTC, 1984-11-23): reasonable basis before dissemination.
2. https://web.archive.org/web/2013id_/http://www.ftc.gov/bcp/policystmt/ad-decept.htm (FTC deception statement, 1983, archived): net impression and the puffery line.
3. https://www.legislation.gov.uk/eudr/2005/29/article/6 (Directive 2005/29/EC, UK-hosted copy): the EU misleading-action test.
4. https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465 (16 CFR 465, in force 2024-10-21): fake reviews and testimonials.
5. https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255 (16 CFR 255, 2023-07-26): endorsements, exact words, material connection, typicality.
6. https://www.federalregister.gov/documents/2024/08/22/2024-18519/trade-regulation-rule-on-the-use-of-consumer-reviews-and-testimonials (FR, 2024-08-22): AI-generated reviews covered, generalised solicitation.
7. https://web.archive.org/web/2024/https://www.ftc.gov/business-guidance/blog/2023/02/keep-your-ai-claims-check (FTC, 2023-02-27): "AI-powered" must be true of the product.
8. https://www.ftc.gov/news-events/news/press-releases/2025/08/ftc-approves-final-order-against-workado-llc-which-misrepresented-accuracy-its-artificial (FTC, 2025-08-28): accuracy claims and evidence retention.
9. https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services (AICPA): "assurance reports", not certification.
10. https://eur-lex.europa.eu/eli/reg/2026/1744/oj (Reg. (EU) 2026/1744, OJ 2026-07-24): current AI Act dates.
11. https://opensource.org/blog/the-sspl-is-not-an-open-source-license (OSI board, 2021-01-19): no claiming or implying open source.
12. https://spdx.org/licenses/licenses.json (SPDX 3.29.0, 2026-09-16): `isOsiApproved` and `isDeprecatedLicenseId`.
13. https://www.spec.org/cpu2017/Docs/runrules.html (SPEC): disclosure sufficient for reproduction.
14. https://www.rfc-editor.org/rfc/rfc9116 (RFC 9116, 2022-04): `security.txt` fields.
15. https://www.law.cornell.edu/cfr/text/16/251.1 (16 CFR 251.1, 1971): "free" terms at the outset.

## Revision log

Revision of 2026-11-27, after an adversarial check. No rule was renumbered or retired. One rule was added (MKT-CLAIM-26).

- MKT-CLAIM-02, Verdict 3: the percent and `×` arm was fixed, because a trailing `\b` after a non-word sign never matched ("50% smaller", "98%."). It is now `[0-9]+([.,][0-9]+)? ?(%|×)`, and the unit arm keeps `\b` only for word units. Word numerals were added to the count arm ("Six tools"). `<style>` blocks are now stripped. The set was re-measured on the fleet (4 hits, unchanged) and on 26 re-fetched exemplar pages (326 hits; percent arm 32 of 32 real claims, the old draft 7). A precision note was added.
- MKT-CLAIM-02, C3: the bare social-proof arm was kept, not reused from DOC-TYPE-15. Measured: 0 fleet hits including six `SECURITY.md` files, and 18 of 20 exemplar hits real. The DOC-TYPE-15 regex caught 2 of those 18. Its 3 false positives came from docs body pages, which this gate excludes. C3 now says so.
- MKT-CLAIM-01, check C, new marker table: the marker position is defined for each surface (end of line, or alone on the line directly above; MDX uses `{/* */}`; JSON and remote surfaces bind through `surface`). The `grep -v 'claim:'` verify, which could not see a marker on the line above, was replaced by a tested reference function.
- MKT-CLAIM-03, 04, 05: checks A to E are now defined in the ruleset (new table "The lint's five checks"). Each verify names its check inline.
- MKT-CLAIM-04: `refresh_by` accepts an ISO date or `"next-release"`, and check A states both. The example row is now marked illustrative and binds to `README.md`, because no surface says "10 clients".
- MKT-CLAIM-05: still MUST on expiry. The interval table is now labelled as owner-tunable defaults that are not sourced. An owner-only `[defaults]` table was added, and an agent may not lengthen an interval (check D).
- MKT-CLAIM-09: rewritten in place to the behaviour that matters. Leave and report owner-written tagline adjectives; add none. The six-word list is now only the lint pattern.
- MKT-CLAIM-10: the verify was narrowed to the named phrases plus a `keep:absence` marker. Bare `does not` and `experimental` were dropped. Fleet hits went from 21 to 5, all limitation statements.
- MKT-CLAIM-13: the verify now needs a `price-or-limit` marker, an SPDX id or a number-with-unit limit. "plan", "tier" or "trial" alone no longer pass. Measured on fleet and exemplars.
- MKT-CLAIM-14: common-knowledge superlatives were removed from the rule text and kept only as lint patterns. The SOC and law-compliance core is unchanged.
- MKT-CLAIM-16, C12: the verify is now an approving GitHub review from a login that authored neither the pull request nor its commits. `git log %an` was dropped, and `approved_by` is now only a hint. Agents share the owner's name and SSH signing config, so this check blocks sign-off classes in the fleet until the owner decides (open question 9).
- MKT-CLAIM-24: "ask for" was dropped, because Part 465 does not reach a plain request (that is a platform term, owned by channels). The rule is now based on the fetched text of 465.8(b) and 465.1(h), with "trade" marked as an inference. The grep now names its files and fails on an empty file list.
- MKT-CLAIM-25: demoted from MUST to SHOULD, because the FTC Q&A and the preamble disagree (new C14). Its rationale now calls it the conservative reading of an unsettled point.
- MKT-CLAIM-26 (new, MUST): the settled parts that were in MKT-CLAIM-25 moved here: no sentiment-conditioned incentive (465.4) and no "All reviews" over a filtered set (465.7(b)). Both rest on rule text fetched from eCFR.
- Applied, rows 02/08 and 03: the remote descriptions were read live with `gh repo view`. Row 03 was corrected from violated to satisfied, because the grimoire description lists ten clients by name and states no count. Verdict 10 lost "one count with no record".
- Applied, rows 14, 15, 18, 20-26, 24: each now carries its command and hit count, re-run 2026-11-27. Row 15's count is 21 by grep, against the dive's hand-scored 28.
- Applied, measurement note: the "3. Packages" cite was corrected from `ocx-sh/rules_ocx/README.md:42` to `:80`.
- Open questions: added owner decisions 9 (agent identity) and 10 (refresh defaults). The exemplar precision and recall question was narrowed to the arms that are still unclassified.
