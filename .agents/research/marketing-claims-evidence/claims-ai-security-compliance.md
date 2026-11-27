---
title: "Claims about AI capability, security and compliance: which need proof, which need a named human"
program: product
sub_program: marketing
topic: marketing-claims-evidence
worker: claims-ai-security-compliance
date_researched: 2026-11-27
model: sonnet
sources_fetched: 21
---

Scope: what product copy (README, landing, trust page, release note, package description) may claim about AI capability, security and compliance; which claim classes need an evidence record; which need a named human sign-off. Not covered: performance and price claims (sibling `claims-evidence-record`), endorsements (`claims-endorsements-proof`), licence claims (`claims-licence-openness`), the design of an in-product AI disclosure (ux sub-program). This file uses the evidence record of `claims-evidence-record` (classes `security` and `ai-capability`) and adds no record.

Fetch protocol: every URL below was fetched on 2026-11-27 unless a row says otherwise. Every law row carries `refresh_by` = fetch + 6 months = **2027-05-27**. Pages read through the WebFetch summariser are marked "(summarised read)"; the EU texts and the security.txt files were read raw.

## Contents

1. Summary
2. Findings (F1 FTC AI cases, F2 SOC 2 and ISO wording, F3 AI Act, F4 trust pages and security.txt, F5 fleet measurement, F6 mechanism-over-outcome)
3. Normative guidance candidates
4. Dated facts
5. What an agent must not decide alone
6. AI-agent angle
7. Contested / evolving
8. Sources

## Summary

- An AI capability claim is an objective claim: the FTC treats "false or unsubstantiated claims about a product's efficacy" as its "bread and butter" ([FTC blog, 2023-02-27](https://www.ftc.gov/business-guidance/blog/2023/02/keep-your-ai-claims-check)). The evidence must exist before the claim runs.
- Workado claimed "98 percent" accuracy; independent testing measured 53 percent on general content ([FTC, 2025-04-28](https://www.ftc.gov/news-events/news/press-releases/2025/04/ftc-order-requires-workado-back-artificial-intelligence-detection-claims)). A number with no test set and no definition is the exact failure.
- DoNotPay paid $193,000 for "robot lawyer" claims it never tested ([FTC, 2025-02-11](https://www.ftc.gov/node/87474)). "Replaces / as good as a professional" claims are a banned class without a record.
- "AI-powered" must be true of the shipped product: "merely using an AI tool in the development process is not the same as a product having AI in it" (FTC blog above). Agent-built products must not borrow the label.
- The Workado order requires "competent and reliable evidence ... at the time it is made" and a retained record ([FTC, 2025-08-28](https://www.ftc.gov/news-events/news/press-releases/2025/08/ftc-approves-final-order-against-workado-llc-which-misrepresented-accuracy-its-artificial)). The record on disk is the retained evidence.
- The AICPA page calls SOC engagements "assurance reports" that CPAs provide; it does not use "certification" ([AICPA](https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services)). ISO says management-system certification is a "third-party conformity assessment activity" ([ISO 17021-1 page](https://www.iso.org/standard/61651.html), archived copy). Copy names the report, the period, the examiner, never "SOC 2 certified" or "certified compliant".
- Two market leaders still write "SOC 2 Type II certification" ([Tailscale](https://tailscale.com/security)) and "SOC 2 type 2 certified" ([1Password](https://1password.com/security)) with no audit period and no examiner. Do not copy them; the exemplar value is in their mechanism lines and their security.txt.
- The AI Act ([Regulation (EU) 2024/1689](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)) does not regulate the truthfulness of capability claims in marketing. Art. 50 is transparency (interaction notice, machine-readable marking, deepfake and public-interest-text disclosure). The Act reaches copy through two side doors: Art. 3(12) makes "promotional or sales materials and statements" part of a system's "intended purpose", and Art. 48(4) governs promotional mention of CE marking.
- The AI Act was amended by [Regulation (EU) 2026/1744](https://eur-lex.europa.eu/eli/reg/2026/1744/oj) (OJ 2026-07-24, in force 2026-07-27): Art. 50 duties apply from 2026-08-02; the Art. 50(2) marking duty has a grace to 2026-12-02 for systems already on the market; Annex III high-risk moved to 2027-12-02.
- Fleet measurement: across 23 READMEs and 69 landing and docs sources, the eight claim words produced 106 hits; **0 bare outcome claims**; no hit for `certified`, `accurate` or `AI-powered`. The fleet already writes mechanism ("checksum-verified", "Sigstore signature"). The gap is a missing `/.well-known/security.txt` (grimoire.rs returns 404; ocx.sh unreachable from this host) and one unrecorded commitment (SECURITY.md "48 hours").
- Decision: seven claim classes are blocked unless an evidence record links the proof; six need a named human (CODEOWNERS on the record path, no new record field). Both lists are enumerated in the "Claim classes" table in section 3.

## Findings

### F1. FTC: AI claims are objective claims

**Operation AI Comply, 2024-09-25** (platform authority; [press release](https://www.ftc.gov/news-events/news/press-releases/2024/09/ftc-announces-crackdown-deceptive-ai-claims-schemes), summarised read). Five actions: DoNotPay, Ascend Ecom, Ecommerce Empire Builders, Rytr, FBA Machine. Stated principle: "there is no AI exemption from the laws on the books" (Chair Khan). DoNotPay: $193,000. Rytr: an AI writing tool that generated fake reviews, treated as an unfair practice. The three income schemes are earnings claims, out of this file's scope.

**DoNotPay final order, 2025-02-11** ([FTC](https://www.ftc.gov/node/87474), summarised read). Commission vote 5-0 on 2025-01-16. DoNotPay promoted "the world's first robot lawyer"; the FTC charged it "did not test whether its 'AI lawyer' performed at the level of a human lawyer". It may not advertise that the service performs like a real lawyer unless it has "sufficient evidence to back it up", and must notify subscribers from 2021 to 2023. The press-release slug guessed from its title returned 404; the node URL above is the page that was read.

**Workado, proposed 2025-04-28, final 2025-08-28** ([April](https://www.ftc.gov/news-events/news/press-releases/2025/04/ftc-order-requires-workado-back-artificial-intelligence-detection-claims), [August](https://www.ftc.gov/news-events/news/press-releases/2025/08/ftc-approves-final-order-against-workado-llc-which-misrepresented-accuracy-its-artificial), both summarised reads). Claim: AI Content Detector "98 percent" accurate. Measured: 53 percent on general-purpose content; the FTC says the model was trained or fine-tuned only for academic content. Order: no efficacy representation "unless the claim is not misleading and the company has competent and reliable evidence to support the claim at the time it is made"; must retain the evidence; compliance reports at one year and annually for three more years; vote 3-0. No monetary penalty reported; the page states up to $53,088 per order violation. The press release does not say what counts as "competent and reliable"; that is in the linked order, which was not read. Unverified, omitted: any test-protocol rule.

**FTC guidance, "Keep your AI claims in check", 2023-02-27** (Michael Atleson, FTC Division of Advertising Practices; read through an archived copy because the live URL returned 404 to this host: [archive.org copy](https://web.archive.org/web/2024/https://www.ftc.gov/business-guidance/blog/2023/02/keep-your-ai-claims-check)). The questions the FTC may ask, quoted:

- "Are you exaggerating what your AI product can do?" Performance claims "would be deceptive if they lack scientific support or if they apply only to certain types of users or under certain conditions."
- "Are you promising that your AI product does something better than a non-AI product? ... if such proof is impossible to get, then don't make the claim."
- "If something goes wrong ... you can't just blame a third-party developer of the technology."
- "Does the product actually use AI at all? ... FTC technologists ... can look under the hood ... merely using an AI tool in the development process is not the same as a product having AI in it."

**Substantiation baseline** ([FTC Policy Statement Regarding Advertising Substantiation, 1984-11-23](https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation), summarised read). Advertisers need a "reasonable basis" before dissemination; reasonableness turns on "the type of claim, the product, the consequences of a false claim"; an express level of support ("tests prove") requires at least that level. The fetched page did not surface the establishment-claim test; the sibling `claims-evidence-record` owns it. This file does not restate it.

Not found by fetch: any FTC page specific to security or compliance claims (codified-law-policy.md #30 flagged the same gap). The compliance rules below therefore rest on the substantiation principle plus the primary wording of the attestation bodies, and are labelled as such.

### F2. SOC 2 is an assurance report; ISO certification is a third-party act

**AICPA SOC suite page** ([AICPA](https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services), summarised read, page carries dated items to 2026-11-16). Quoted: "System and Organization Controls (SOC) is a suite of service offerings CPAs may provide"; "CPAs can use the AICPA's various SOC offerings to provide assurance reports". The page has no "certification", no definition of Type 1 or Type 2, and no "attestation" in prose. SOC 2 appears as a publication title ("Reporting on an Examination of Controls at a Service Organization"). The page carries a notice that the AICPA is looking into allegations about a compliance vendor offering SOC services and "will take action" against members who were unlicensed, not in peer review, or did not follow professional standards. Dated items on the page: exposure draft of proposed 2027 SOC 2 criteria, 2026-11-16; "new offering that assures AI systems and agents", 2026-10-19 (headline only, not read). The scout row (services-b2b.md #22) said the AICPA wording was unread; this closes it: **the authority's page says "assurance reports" and never "certification"**.

**Type 1 versus Type 2.** The AICPA page does not define them, and the AICPA topic page ([link](https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2)) uses "assurance reports" and only a publication title for "examination". The definitions come from a vendor, [Vanta](https://www.vanta.com/collection/soc-2/introduction/is-soc-2-a-certification-or-attestation) (vendor data, undated, footer 2026): Type I is "a point-in-time, static snapshot"; Type II is a review "over a period of time, usually six to twelve months"; and "SOC 2 is an attestation, not a certification. There is no official certifying body or pass/fail status." Treat the Type 1 and 2 definitions as vendor-sourced; the record must carry the report's own stated period instead.

**ISO/IEC 17021-1:2015** (the ISO catalogue page returned 403 to direct fetch; read through an [archived snapshot of 2025-11-29](https://web.archive.org/web/20251129184611/https://www.iso.org/standard/61651.html), which is the standards body's own page). It states: Edition 1, 2015-06; "last reviewed and confirmed in 2020. Therefore this version remains current"; the standard "contains principles and requirements for the competence, consistency and impartiality of bodies providing audit and certification of all types of management systems"; "Certification of management systems is a third-party conformity assessment activity and bodies performing this activity are therefore third-party conformity assessment bodies." Recorded only what the page states. The page does not mention ISO/IEC 27001, the three-year certificate cycle, or surveillance audits; those scout claims (services-b2b.md #22, #24) rest on Wikipedia and stay **unverified, omitted** here. Consequence for copy: "ISO 27001 certified" is a claim about a certificate issued by a certification body; the record must link the certificate (number, body, scope, expiry).

### F3. The EU AI Act and marketing claims

Primary text read: Regulation (EU) 2024/1689, Official Journal L, 2024-07-12, as published at the Publications Office (Cellar) in XHTML. EUR-Lex itself answers this host with an empty 202 bot challenge, so the identical OJ text was fetched from `publications.europa.eu/resource/cellar/dc8116a1-3fe6-11ef-865a-01aa75ed71a1.0006.03/DOC_1`; canonical citation stays [`https://eur-lex.europa.eu/eli/reg/2024/1689/oj`](https://eur-lex.europa.eu/eli/reg/2024/1689/oj). Fetch date 2026-11-27. refresh_by 2027-05-27.

| Provision | What the text says (quoted or closely paraphrased) | Does it regulate a capability claim in marketing? |
|---|---|---|
| Art. 50(1) | Providers design AI systems that interact directly with natural persons so the persons "are informed that they are interacting with an AI system", unless obvious to a reasonably well-informed, observant, circumspect person | No. Interaction notice. |
| Art. 50(2) | Providers of systems generating synthetic audio, image, video or text "shall ensure that the outputs ... are marked in a machine-readable format and detectable as artificially generated or manipulated" | No. Output marking; assistive-editing exception. |
| Art. 50(3) | Deployers of emotion-recognition or biometric-categorisation systems inform exposed persons | No. |
| Art. 50(4) | Deployers of deep fakes disclose artificial generation; text "published with the purpose of informing the public on matters of public interest" must be disclosed, except where it "has undergone a process of human review or editorial control and ... a natural or legal person holds editorial responsibility" | No. Relevant to agent-written published text, see rule CLAIM-AI-08. |
| Art. 50(5) | Information given "in a clear and distinguishable manner at the latest at the time of the first interaction or exposure" and conforming to accessibility requirements | No. |
| Art. 3(12) ([text](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)) | "intended purpose" = the use intended by the provider "as specified in the information supplied by the provider in the instructions for use, promotional or sales materials and statements, as well as in the technical documentation" | **Indirectly yes.** Copy that says the tool does X sets the intended purpose, which drives risk classification and provider obligations. |
| Art. 48(4) ([text](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)) | The notified-body number "shall also be indicated in any promotional material which mentions that the high-risk AI system fulfils the requirements for CE marking" | **Yes, narrowly.** Only for high-risk systems. |
| Art. 5(1)(a) | Prohibits AI systems deploying "purposefully manipulative or deceptive techniques" that materially distort behaviour and cause significant harm | Targets the system's behaviour, not product copy. |
| Art. 4 | AI literacy of staff (original text "sufficient level"; replaced by Reg. 2026/1744, see below) | No. |
| Art. 99(4)(g) ([text](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)) | Fines up to EUR 15,000,000 or 3 % of worldwide turnover (whichever is higher) for breaches of Art. 50 | Penalty scale for the transparency duties only. |

Answer to the commission: **the AI Act has no provision that polices the truth of a capability claim in marketing. Article 50 is transparency. The Act reaches copy only by defining intended purpose through "promotional or sales materials and statements" (Art. 3(12)) and by the CE-marking mention rule (Art. 48(4)).** A search of the full text for "advertis" found only recitals and the targeted-job-advertisement use case; "marketing material" has no hit. Capability-claim truthfulness stays under consumer-protection law (the FTC cases above; the EU Unfair Commercial Practices Directive is owned by `claims-evidence-record`).

**In-force dates.** Original Art. 113 (OJ 2024-07-12): the Regulation "shall enter into force on the twentieth day following that of its publication" and "shall apply from 2 August 2026"; Chapters I and II from 2025-02-02; Chapter V and others from 2025-08-02. Entry into force is derived: publication 2024-07-12 plus twenty days gives 2024-08-01 (the text states the rule; the date is arithmetic, not quoted).

**Amendment: Regulation (EU) 2026/1744 "Digital Omnibus on AI"** ([OJ L, 2026-07-24](https://eur-lex.europa.eu/eli/reg/2026/1744/oj), dated 8 July 2026; read raw from the same Publications Office route, CELEX 32026R1744). It "shall enter into force on the third day following ... publication" (so 2026-07-27, matching [Lewis Silkin](https://www.lewissilkin.com/insights/2026/07/27/the-digital-omnibus-on-ai-enters-into-force-today), a law-firm secondary read). Relevant amendments, read in the text:

- Art. 4 replaced: providers and deployers "shall take measures to support the development of AI literacy"; "This obligation does not require providers or deployers to guarantee any specific level of AI literacy of any individual."
- Art. 50: only paragraph 7 (codes of practice) is replaced; a new Art. 111(4) adds: providers of generating systems "placed on the market before 2 August 2026 shall take the necessary steps in order to comply with Article 50(2) by 2 December 2026." Paragraphs 50(1) to (5) are unchanged in the text read, so they apply from 2026-08-02.
- Art. 113(3)(c): Chapter III Sections 1 to 3 apply from **2027-12-02** for Annex III high-risk systems and **2028-08-02** for Annex I.
- Art. 5(1) new points (ba), (bb) and (1a), (1b) apply from 2026-12-02 (non-consensual intimate content; not marketing).

Consolidated-text caution: a consolidated version was not fetched; the rows above are original text plus the amending text. Mark any dependent rule "check consolidated text before use".

### F4. Exemplar trust pages and security.txt (fields, not slogans)

Read 2026-11-27. Page reads are summarised reads of undated pages; the security.txt files were fetched raw with curl and quoted by field.

**Tailscale, [tailscale.com/security](https://tailscale.com/security).** Fields present: attestation named ("completed a SOC 2 Type II certification, meeting AICPA's Trust Services Criteria for security, availability, and confidentiality"); no audit period, no examiner for that report; report access by NDA via support and "legal page"; auditor named for security audits (Latacora), explicitly not stated as the SOC 2 examiner; "Tailscale does not have a bounty program" (a negative stated as a fact); disclosure address and coordination rules; public security bulletins URL; policies on GitHub; DPA and subprocessor list. Mechanism lines: WireGuard private keys "never leave their respective nodes"; coordination server handles only public keys; metadata encrypted at rest with 256-bit AES and in transit with TLS. Outcome lines: "Tailscale cannot read your traffic", "You are not the product". Raw `/.well-known/security.txt`: `Contact: mailto:security@tailscale.com`, `Expires: 2027-03-05T00:00:00Z`, `Hiring`, `Preferred-Languages: en`, `Canonical: https://tailscale.com/.well-known/security.txt`, `Policy: https://tailscale.com/security`. Complete against RFC 9116 required fields; expiry 98 days out at fetch.

**1Password, [1password.com/security](https://1password.com/security).** Fields present: "SOC 2 type 2 certified" with a "Read our SOC 2 report" link (no period, no examiner on the page); "regularly assessed by independent experts" with a link to assessments; white paper and security-model PDF linked; HackerOne programme link. Mechanism lines: two-key model with a "128-bit encrypted Secret Key"; SRP authentication; filling only in browsers "signed by an identified developer". Outcome lines: "Security is not just a feature. It's our foundation." and "The industry's largest bug bounty" (no figures). Raw security.txt: `Contact: mailto:security@agilebits.com`, `Site:` bug-bounty programme, `Encryption:` key URL, `Signature:` URL, comments with key fingerprint. **No `Expires` field**, which RFC 9116 says MUST be present; no `Canonical`, no `Policy`. The signature file was not fetched or verified.

**GitHub, [github.com/.well-known/security.txt](https://github.com/.well-known/security.txt)** (third exemplar, fetched raw): `Contact`, `Acknowledgments`, `Preferred-Languages`, `Canonical`, `Policy`, `Hiring`, `Expires: 2026-12-27T12:11:04z`; `github.com/security.txt` returns 404, which RFC 9116 permits because the top-level path is legacy only.

**RFC 9116** ([RFC Editor](https://www.rfc-editor.org/rfc/rfc9116), April 2022, Informational, summarised read). `Contact` "MUST always be present"; `Expires` "MUST always be present and MUST NOT appear more than once" and "RECOMMENDED ... less than a year into the future"; `Canonical`: if the retrieval URL is not listed, "the contents of the file SHOULD NOT be trusted"; `Policy` "SHOULD" point at the disclosure policy; `Encryption` must be a URI, "Keys MUST NOT appear in this field"; location `/.well-known/security.txt`, served over HTTPS as `text/plain`, UTF-8; signing "RECOMMENDED".

What the two pages share: both state the SOC 2 claim in a single sentence with no date; both link a report; both pair slogans with mechanism lines. What they omit and an agent should not omit: report period, examiner, "as of" date.

### F5. Fleet measurement

Rubric written before scoring (kept in the scratchpad as `rubric.txt`): **mechanism** = the line names a checkable artefact or procedure (digest, checksum, signature, SBOM, flag, command, file, dated source); **outcome** = an unqualified quality or result word with no artefact on the line; **N/A** = identifier, enum value, quoted example, third-party text; **operational** = idempotence or retry statement tied to a command.

Commands (run 2026-11-27 from `/home/mherwig/dev`):

```
PAT='secure|safe|verified|signed|compliant|certified|accurate|AI-powered'
R=$(ls ocx-sh/*/README.md grimoire-rs/*/README.md grimoire-rs/*/*/README.md | sort -u)               # 23 files
L=$(find ocx-sh/website/site/src/components ocx-sh/website/site/src/pages ocx-sh/website/site/src/fragments \
      grimoire-rs/grimoire/docs/src -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.astro' -o -name '*.md' -o -name '*.mdx' \) \
      -not -name '*.test.ts')                                                                          # 69 files
echo "$R" | xargs grep -n -i -E -w "$PAT"      # 13 hits
echo "$L" | xargs grep -n -i -E -w "$PAT"      # 93 hits
```

| Word | READMEs | Landing and docs src |
|---|---|---|
| secure | 0 | 1 (a URL slug) |
| safe | 2 | 43 |
| verified | 4 | 39 |
| signed | 7 | 5 |
| compliant | 0 | 2 |
| certified | 0 | 0 |
| accurate | 0 | 0 |
| AI-powered | 0 | 0 |

Classification (scored by a regex script over the hit lines, then the 9 unmatched lines read by hand; all 9 were identifier, enum or dated-source lines):

| Class | READMEs (13) | Landing and docs (93) |
|---|---|---|
| mechanism, artefact (signed, checksum-verified, sha256, SBOM, Sigstore) | 10 | 11 |
| mechanism, dated source ("Verified 2026-09-29 against ...", "verified against CLI 1.0.88") | 1 | 28 |
| N/A (identifier `approve-safe-commands`, enum `verified`, `--safe-mode`) | 0 | 32 + 9 hand-read |
| operational ("safe to retry", "safe to re-run") | 2 | 11 |
| standard compliance ("spec-compliant", named spec) | 0 | 2 |
| **bare outcome claim** | **0** | **0** |

Findings from the measurement:

- No fleet surface makes a bare `secure`, `certified`, `accurate` or `AI-powered` claim. The only product-surface outcome phrase in the set is [`grimoire-rs/indexer/README.md:61`](file:///home/mherwig/dev/grimoire-rs/indexer/README.md), "frozen and safe to build on", and the next sentences name exactly what is frozen (page URL layout, two data files, `/c/root.json`). That is the pattern done right (F6).
- The fleet states a limit as a claim: [`grimoire-rs/grimoire/docs/src/content/docs/guides/inspect.md:148`](file:///home/mherwig/dev/grimoire-rs/grimoire/docs/src/content/docs/guides/inspect.md): "grim performs no signature verification at all, a gap the project has weighed and accepted". This is the "write 'no audit' rather than imply one" row (services-b2b.md #23) already practised.
- A release claim has the full evidence chain in the docs: the changelog and `installation.md` state a keyless Sigstore signature and a signed CycloneDX SBOM attestation from workflow `release-ocx.yml` on `main`, from 0.16.1.
- The landing section "04 · supply chain" in `ocx-sh/website/site/src/components/Landing.astro:127-133` reads "Know what you run. Even offline." over "ocx never runs package code at install. Signature checks and SBOMs, by digest." and links `/docs/guides/verify-installs/`, which exists at `ocx-sh/ocx/website/src/content/docs/guides/verify-installs.mdx` and names the command (`ocx package verify`), the flags and exit 81 behaviour. Outcome headline plus mechanism body plus linked proof passes.
- AI capability: 0 claims in the fleet. Grimoire installs AI configuration; nothing says an AI feature is accurate. No record needed today.
- Disclosure channel gap: `grimoire.rs/.well-known/security.txt` returned HTTP 404 `text/html` (curl, 2026-11-27); `ocx.sh` was unreachable from this host (curl exit 000), so unmeasured. Neither site source has `public/.well-known/` (`ls ocx-sh/website/site/public/.well-known grimoire-rs/grimoire/docs/public/.well-known`: not found). Both repos carry `SECURITY.md`.
- Unrecorded commitment: `ocx-sh/ocx/SECURITY.md` says "We will acknowledge receipt within 48 hours and aim to provide a fix or mitigation plan within 7 days for critical issues." A response-time promise is a security claim the owner must decide (see section 5); no record backs it.
- Two README hero lines of other classes (not in the word set, not scored): "The Simple Package Manager" (ocx). It is an outcome adjective for the sibling comparison and puffery rules; flagged and left.

### F6. The mechanism-over-outcome rewrite pattern

Pattern: **outcome word, then artefact, then link, then date.** Replace the quality adjective with the thing a reader can check; keep the adjective only as a headline if the next sentence names the mechanism and links its proof.

| Fail (outcome) | Pass (mechanism) |
|---|---|
| "Secure by default." | "Installs refuse an unsigned package when a trust policy covers it; exit 81 offline with no trust material (`ocx package verify`, docs link)." |
| "Enterprise-grade encryption." | "Metadata encrypted with 256-bit AES at rest and TLS in transit." (Tailscale wording, mechanism form) |
| "SOC 2 certified." | "SOC 2 Type 2 report, 2025-10-01 to 2026-09-30, examined by <CPA firm>; available under NDA: <link>." (placeholders: values come from the record) |
| "Our AI is 99% accurate." | "Precision 0.91, recall 0.84 on the 1,200-item `eval/set-v3`, model `x-2026-10`, run 2026-11-20; method and data: <link>." (illustrative shape) |

Two fleet examples:

1. **Already passing, keep as the template.** `grimoire-rs/indexer/README.md:61`: "Three things are frozen and safe to build on" followed by the three named artefacts. If an agent edits it, "safe" may stay only while the three named items remain on the line or the next sentence.
2. **Worth tightening.** `Landing.astro:129`: "Signature checks and SBOMs, by digest." names no verifier identity. Rewrite shape from the fleet's own docs: "Every package is checked against a Sigstore signature and a CycloneDX SBOM attestation from the publisher's release workflow before first run." with the same link. Owner decides wording (brand), the agent supplies the evidence-record row (`class: security`, `source: verify-installs.mdx`, `observed` date).

## Normative guidance candidates

Severity key: MUST = block the publish; SHOULD = warn and require a recorded reason; CONSIDER = suggestion. IDs are working names for the catalog consolidator. "Record" means the evidence record of `claims-evidence-record` with `class` set to `security` or `ai-capability`; no new record or field is added. "Sign-off" means a named human approves by code-owner review on the record file (CODEOWNERS entry plus required review), not by a field.

### Security and compliance

**CLAIM-SEC-01 (MUST).** Never write "SOC 2 certified", "SOC 2 certification", "SOC 2 compliant", "ISO 27001 compliant", "GDPR compliant", "GDPR certified", "HIPAA certified", "PCI certified" or "100% secure". State the report or certificate instead: type, period, examiner or body, access route, as-of date.
Why: the AICPA page calls SOC outputs "assurance reports" and never "certification"; ISO frames certification as a third-party act; no fetched law makes the phrase unlawful, so the rule rests on accuracy and substantiation, not on a statute (F2, F1).
Verify: `grep -rniE 'SOC ?2 (certif|compliant)|ISO ?(/IEC )?27001 compliant|GDPR[- ](compliant|certified)|HIPAA[- ]certified|PCI[- ]certified|100% secure|unhackable|military-grade|bank-grade' <surface paths>` returns nothing.

**CLAIM-SEC-02 (MUST).** Every named attestation or certificate (SOC 1/2/3, ISO 27001, FedRAMP, CSA STAR, a pen-test report) has a Record with `source` = the report, certificate or public listing, `source_type` = third-party, `window` = the audit period, `observed` = date of the report, `refresh_by` <= `observed` + 12 months, `subject_version` = the in-scope service or product. No record: the claim is cut, not softened.
Why: a Type 2 report covers a period (vendor sources say 6 to 12 months) and a claim with no "as of" implies currency; the AICPA page itself dates its materials (F2).
Verify: for each hit of `grep -rniE '\b(SOC ?[123]|ISO ?(/IEC )?27001|FedRAMP|CSA STAR|pen(etration)? test)\b' <surfaces>`, a Record exists whose `claim` string matches, and `refresh_by` is in the future (a CI date comparison).

**CLAIM-SEC-03 (MUST).** A named attestation claim requires a **named human sign-off** before it ships, and an agent never creates or edits the Record's `source`, `window` or `observed`.
Why: the advertiser carries liability including for agency conduct (codified-law-policy.md #32); only a human can attach the real report; an agent can only copy a number that sounds right.
Verify: `CODEOWNERS` lists the record directory; branch protection requires a code-owner review; `git log --format='%an' -1 -- <record file>` is not an agent identity for these fields.

**CLAIM-SEC-04 (MUST).** If no audit exists, the page says so in one line ("no third-party audit has been performed") and lists only mechanisms backed by a repo file.
Why: an open-source tool must not imply an audit; the fleet already does this at `inspect.md:148` (F5).
Verify: reading heuristic, pass: "No third-party audit. Releases are signed (release-ocx.yml); SBOM attached." fail: "Built with security in mind." Each mechanism noun maps to a path: `grep -rl 'release-ocx.yml\|SBOM' .github docs`.

**CLAIM-SEC-05 (MUST).** No bare outcome word as a claim. `secure`, `safe`, `trusted`, `private`, `encrypted`, `protected`, `hardened` appear only in a sentence that also names the mechanism (algorithm, artefact, flag, command or file) or links proof.
Why: the 1Password and Tailscale slogans ("Security is not just a feature", "You are not the product") are unfalsifiable; their mechanism lines are what readers can check (F4, F6).
Verify: `grep -rniE -w 'secure|safe|trusted|private|encrypted|protected|hardened' <surfaces>`; for each hit apply the pass/fail table in F6. Mechanism tokens that pass: `sha256|digest|signature|Sigstore|SBOM|attestation|TLS|AES|WireGuard|SLSA|--[a-z-]+|`backticked command``.

**CLAIM-SEC-06 (MUST).** A security or privacy statement is present on a product's landing or docs home (a link is enough), because security or privacy concerns are the first rejection reason developers give.
Why: [Stack Overflow Developer Survey 2025](https://survey.stackoverflow.co/2025/) ranks "security or privacy concerns" first of the deal-breakers (rank, not a percentage; 49,000+ responses, 177 countries; self-reported survey by the platform).
Verify: the built site has a link whose href matches `/security|SECURITY\.md|trust|privacy/` from the home page: `grep -E 'href="[^"]*(security|trust|privacy)' dist/index.html`.

**CLAIM-SEC-07 (SHOULD).** Serve `/.well-known/security.txt` with `Contact` and `Expires` (the two RFC 9116 MUSTs), `Expires` within one year, plus `Policy` and `Canonical`; sign it when a key exists.
Why: RFC 9116 defines the channel; Tailscale and GitHub ship it complete; 1Password omits `Expires`; grimoire.rs returns 404 (F4, F5).
Verify: `curl -sf https://<host>/.well-known/security.txt | grep -E '^(Contact|Expires):'` returns both lines, and `Expires` is after today and under 366 days ahead; `curl -sI ... | grep -i 'content-type: text/plain'`.

**CLAIM-SEC-08 (MUST).** A response-time or bounty promise ("acknowledged within 48 hours", "bug bounty") ships only with a named owner's decision and a Record (`class: security`, `source` = SECURITY.md, `observed` = date the owner confirmed they can meet it).
Why: a number promised and missed is a measurable misstatement; Tailscale states "does not have a bounty program" as a fact, which is cheap and true (F4).
Verify: `grep -rniE 'within [0-9]+ (hours|days)|bounty|SLA' SECURITY.md docs README.md` hits map to Record rows.

**CLAIM-SEC-09 (SHOULD).** Every trust-page claim carries an "as of" date; CI warns when `observed` is older than the Record's `refresh_by`.
Why: trust claims decay (F2); a dated claim is checkable.
Verify: lint over Records: `refresh_by < today` fails the build for class `security`.

**CLAIM-SEC-10 (SHOULD).** Write "verified" only with its object and method on the line ("checksum-verified", "verified against CLI 1.0.88 on 2026-09-28"), never as a quality stamp ("verified publisher", "verified safe") unless the Record names who verified what.
Why: the fleet's 28 dated "Verified <date> against <source>" stamps are the model; an undefined badge implies an audit (F5).
Verify: `grep -rniE -w 'verified (publisher|safe|secure|by us)|trusted publisher' <surfaces>` returns nothing without a Record.

### AI capability

**CLAIM-AI-01 (MUST).** Any accuracy, precision, recall, error-rate, "better than", "replaces", "as good as a professional" or time-saved figure about an AI feature has a Record with: `value` and `unit`, `definition` (what counts as correct), `method` (data set name, size, who ran it), `window` (dataset or period), `subject_version` (model and product version), `observed`, `source_type` (own-measurement unless independently run), and `refresh_by` <= 6 months or the next model change, whichever is sooner.
Why: Workado's 98 % versus 53 % turned on test population (academic only versus general); the order requires competent and reliable evidence "at the time it is made" and retention (F1).
Verify: `grep -rniE '[0-9]{2,3}(\.[0-9]+)? ?% ?(accura|precis|recall|correct|reliab)|(more|most) accurate|human[- ]level|replaces? (your|a|the) |as good as' <surfaces>` hits each resolve to a Record; the Record's `method` links a runnable eval or dataset.

**CLAIM-AI-02 (MUST).** A claim that the AI feature outperforms a non-AI approach, a competitor or a human needs the comparison in the Record (`method` names both arms); if the comparison cannot be produced, cut the claim.
Why: FTC: "You need adequate proof for that kind of comparative claim, too, and if such proof is impossible to get, then don't make the claim." (F1).
Verify: reading heuristic, pass: "Cuts review time from a median 14 to 9 minutes in a 40-PR trial (method link)". fail: "Replaces your code reviewer".

**CLAIM-AI-03 (MUST).** "AI-powered", "AI-enabled", "built with AI", "agentic", "intelligent" may label a product or feature only if the shipped artefact calls a model at runtime for the stated function. Using an AI assistant to write the code does not qualify.
Why: FTC: "merely using an AI tool in the development process is not the same as a product having AI in it", and technologists can inspect the product (F1). An agent that built the repo with AI will otherwise label it AI.
Verify: the Record's `source` is a path to the call site; `grep -rnE 'anthropic|openai|generativeai|ollama|llama|transformers|onnx' src/ pyproject.toml Cargo.toml package.json` is non-empty for the feature the copy names; otherwise any `grep -rniE 'AI[- ](powered|enabled|driven)|powered by AI' <surfaces>` hit fails.

**CLAIM-AI-04 (MUST).** State the conditions the claim holds under: user type, language, input class, version. A figure measured on one population is not written as a general property.
Why: FTC: performance claims are deceptive "if they ... apply only to certain types of users or under certain conditions" (F1); Workado's model was trained for academic text (F1).
Verify: the Record's `definition` and `window` fields are non-empty and the copy repeats the condition in the same sentence or via a footnote link.

**CLAIM-AI-05 (MUST).** Never claim an AI feature predicts human behaviour, detects AI-written text, gives legal, medical or financial advice, or replaces a licensed professional without human sign-off and a Record.
Why: FTC example: "we're not yet living in the realm of science fiction, where computers can generally make trustworthy predictions of human behavior"; DoNotPay and Workado were exactly these classes (F1).
Verify: `grep -rniE 'detect(s|or)? (AI|ChatGPT)|predict(s)? (behaviou?r|churn|intent)|lawyer|legal advice|medical|diagnos' <surfaces>` hits require sign-off.

**CLAIM-AI-06 (SHOULD).** Do not claim "no hallucinations", "always correct", "guaranteed accurate", "100% accurate". Name the check that bounds the error (test run, human review step, schema validation).
Why: only 33 % of developers trust AI accuracy and 46 % distrust it ([Stack Overflow Developer Survey 2025](https://survey.stackoverflow.co/2025/), platform-run survey); unqualified accuracy claims lose the audience and the FTC test (F1).
Verify: `grep -rniE 'no hallucinat|always (correct|accurate)|guarantee[sd]? (accurate|correct)|100% accurate' <surfaces>` returns nothing.

**CLAIM-AI-07 (MUST).** Own the risk statement: copy never says the AI vendor, model or "black box" is responsible for errors.
Why: FTC: "you can't just blame a third-party developer"; "can't say you're not responsible because that technology is a 'black box'" (F1).
Verify: reading heuristic; grep `grep -rniE 'not responsible for (AI|model)|the model may' <terms pages>` flags disclaimers for human review.

**CLAIM-AI-08 (SHOULD).** If a surface is operated for EU users and publishes agent-written text on matters of public interest, or ships a feature that talks to people or generates synthetic media, route the Art. 50 decision to a human; the copy rule is only that the disclosure line exists once the human decides.
Why: Art. 50(1), (2), (4) apply from 2026-08-02 (marking: 2026-12-02 for systems already placed on the market); the text exempts public-interest text that went through human review with editorial responsibility, so the design of the review is a legal and process decision (F3).
Verify: the Record carries `claim: art50-decision`, `source` = the owner's written decision; the page contains the chosen disclosure string.

### Claim classes: blocked, and needing a named human

Seven classes are blocked: the claim does not ship until a Record links the proof. Six of them need a named human sign-off (code-owner review on the Record file).

| # | Claim class | Rule | Blocked without Record | Named human |
|---|---|---|---|---|
| 1 | Attestation or certificate (SOC, ISO 27001, FedRAMP, pen-test report) | CLAIM-SEC-02, -03 | Yes | Yes |
| 2 | Security mechanism ("signed releases", "SBOM attached") | CLAIM-SEC-05 | Yes | No (code owner reviews) |
| 3 | Response-time or bounty commitment | CLAIM-SEC-08 | Yes | Yes |
| 4 | AI number (accuracy, precision, time saved) | CLAIM-AI-01 | Yes | Yes |
| 5 | AI comparison ("better than", "replaces", "as good as") | CLAIM-AI-02 | Yes | Yes |
| 6 | "AI-powered" label | CLAIM-AI-03 | Yes | Only when first introduced; otherwise the call-site path suffices |
| 7 | Prediction, AI detection, legal, medical or financial advice, licensed-professional replacement | CLAIM-AI-05 | Yes | Yes |

Named-human count: classes 1, 3, 4, 5, 7 and the first introduction of class 6 make six. The Art. 50 decision (CLAIM-AI-08) is a separate human decision, not a claim class.

### Evidence-record fields by class (reusing `claims-evidence-record`)

| Class | Required fields (all of) | Default `refresh_by` | Human sign-off |
|---|---|---|---|
| security, attestation or certificate | claim, surface, class, source (report or certificate URL), source_type (third-party), window (audit period), observed, refresh_by, subject_version | 12 months from `observed`, or the report's end of period + 12 months | Yes, named |
| security, mechanism ("signed releases", "SBOM attached") | claim, surface, class, source (repo path or workflow file), source_type (own-measurement), method (command that shows it), observed, refresh_by, subject_version | 6 months or next release | No; code owner reviews |
| security, response-time or bounty commitment | claim, surface, class, source (SECURITY.md), observed (owner confirmed), refresh_by | 12 months | Yes, owner |
| ai-capability, number | claim, surface, class, value, unit, definition, method, window, subject_version, observed, source_type, refresh_by | 6 months or next model change | Yes, named |
| ai-capability, comparison or replacement | same as number, with `method` naming both arms | 6 months or next model change | Yes, named |
| ai-capability, prediction, detection or professional advice | same as number | 6 months or next model change | Yes, named |
| ai-capability, "AI-powered" label | claim, surface, class, source (call-site path), subject_version, observed, refresh_by | each release | No when the call site exists; yes when first introduced |

Defaults are this dive's proposal, not a sourced limit: the 6 and 12 month values follow the law-row protocol (fetch + 6 months) and the RFC 9116 "less than a year" expiry advice.

## Dated facts

| Fact | Value | Source (URL) | Date stated by source | Source kind |
|---|---|---|---|---|
| Operation AI Comply announced; five actions; DoNotPay $193,000 | 2024-09-25 | [FTC](https://www.ftc.gov/news-events/news/press-releases/2024/09/ftc-announces-crackdown-deceptive-ai-claims-schemes) | 2024-09-25 | authority |
| DoNotPay final order; 5-0 vote 2025-01-16; notice to 2021-2023 subscribers | 2025-02-11 | [FTC](https://www.ftc.gov/node/87474) | 2025-02-11 | authority |
| Workado: 98 % claimed, 53 % measured; proposed order, vote 3-0; per-violation penalty up to $53,088 | 2025-04-28 | [FTC](https://www.ftc.gov/news-events/news/press-releases/2025/04/ftc-order-requires-workado-back-artificial-intelligence-detection-claims) | 2025-04-28 | authority |
| Workado final order, 3-0, evidence retention, reports at 1 year and annually for 3 more | 2025-08-28 | [FTC](https://www.ftc.gov/news-events/news/press-releases/2025/08/ftc-approves-final-order-against-workado-llc-which-misrepresented-accuracy-its-artificial) | 2025-08-28 | authority |
| FTC AI-claims guidance (Atleson) | 2023-02-27 | [FTC archive copy](https://web.archive.org/web/2024/https://www.ftc.gov/business-guidance/blog/2023/02/keep-your-ai-claims-check) | 2023-02-27 | authority |
| FTC Policy Statement Regarding Advertising Substantiation | 1984-11-23 | [FTC](https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation) | 1984-11-23 | authority |
| AICPA SOC page: "assurance reports"; exposure draft of proposed 2027 SOC 2 criteria | 2026-11-16 (exposure draft); 2026-10-19 (AI-assurance news headline) | [AICPA](https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services) | as listed | authority |
| ISO/IEC 17021-1:2015: Edition 1, 2015-06; last reviewed and confirmed 2020; stage 90.20 under review in the 2025-11-29 snapshot | 2015-06 | [ISO catalogue (archived 2025-11-29)](https://web.archive.org/web/20251129184611/https://www.iso.org/standard/61651.html) | 2015-06; snapshot 2025-11-29 | authority |
| SOC 2 "is an attestation, not a certification"; Type II "usually six to twelve months" | undated (footer 2026) | [Vanta](https://www.vanta.com/collection/soc-2/introduction/is-soc-2-a-certification-or-attestation) | undated | vendor data |
| Regulation (EU) 2024/1689 (AI Act): OJ 2024-07-12; applies from 2026-08-02 (original Art. 113); Chapters I and II from 2025-02-02; Art. 50 fines up to EUR 15,000,000 or 3 % | in force: twentieth day after publication (derived 2024-08-01) | [EUR-Lex ELI](https://eur-lex.europa.eu/eli/reg/2024/1689/oj) (text read from the Publications Office copy) | 2024-06-13 (adoption), 2024-07-12 (OJ) | authority |
| Regulation (EU) 2026/1744 (Digital Omnibus on AI): adopted 2026-07-08, OJ 2026-07-24, in force third day after publication; Art. 50(2) grace to 2026-12-02; Annex III high-risk from 2027-12-02; Annex I from 2028-08-02; Art. 4 reworded | in force 2026-07-27 | [EUR-Lex ELI](https://eur-lex.europa.eu/eli/reg/2026/1744/oj) (read from the Publications Office copy); [Lewis Silkin](https://www.lewissilkin.com/insights/2026/07/27/the-digital-omnibus-on-ai-enters-into-force-today) | 2026-07-24 / 2026-07-27 | authority; law-firm secondary for the 07-27 date |
| RFC 9116: `Contact` and `Expires` MUST; `Expires` under a year recommended; location `/.well-known/` | April 2022 | [RFC Editor](https://www.rfc-editor.org/rfc/rfc9116) | 2022-04 | authority |
| Tailscale security.txt `Expires: 2027-03-05T00:00:00Z` | 2027-03-05 | [security.txt](https://tailscale.com/.well-known/security.txt) | fetched 2026-11-27 | exemplar, raw file |
| GitHub security.txt `Expires: 2026-12-27T12:11:04z` | 2026-12-27 | [security.txt](https://github.com/.well-known/security.txt) | fetched 2026-11-27 | exemplar, raw file |
| 1Password security.txt: no `Expires` field | n/a | [security.txt](https://1password.com/.well-known/security.txt) | fetched 2026-11-27 | exemplar, raw file |
| grimoire.rs `/.well-known/security.txt` | HTTP 404 `text/html` | `curl -sS -o /dev/null -w '%{http_code} %{content_type}' https://grimoire.rs/.well-known/security.txt` | 2026-11-27 | own measurement |
| Stack Overflow 2025: top-3 deal-breakers security/privacy, pricing, alternatives; 46 % distrust AI accuracy, 33 % trust; 49,000+ responses, 177 countries | 2025 | [survey](https://survey.stackoverflow.co/2025/) | 2025 | platform survey (self-reported) |

Every law row's `refresh_by`: **2027-05-27**.

## What an agent must not decide alone

Ask the owner (or the named legal contact) for each:

1. Whether the organisation holds a SOC 2 report, ISO 27001 certificate, HIPAA, PCI or FedRAMP status, and the audit period, examiner and access route. An agent never infers it from a README, a competitor page or a vendor's marketing.
2. Whether to say "compliant" with any law (GDPR, CCPA, EU AI Act): that is a legal judgement about processing, not a copy edit.
3. Any AI accuracy figure, benchmark, "replaces" or "as good as a professional" claim: the numbers come from a run a human owns.
4. Whether the product truly calls a model at runtime ("AI-powered") when the call site is not obvious.
5. A response-time, uptime, support or bounty commitment (the `SECURITY.md` "48 hours" line is such a decision).
6. The Art. 50 position (is the surface within scope; does a human-review process qualify for the public-interest-text exception; is the output marked). The AI Act text leaves these to the operator and, ultimately, authorities.
7. Whether to publish a statement about a known gap ("no signature verification at all"). The fleet did; the decision to disclose is the owner's.
8. Any claim in a regulated domain (health, legal, finance, employment, children).
9. Naming a customer, auditor or pen-test firm on a trust page.

## AI-agent angle

| Characteristic mistake | Smallest mechanical check |
|---|---|
| Writes "SOC 2 certified" or "GDPR compliant" because competitors and its training data do (including the two exemplars read here). | CLAIM-SEC-01 grep fails the build. |
| Describes a repo built with an AI assistant as "AI-powered". | CLAIM-AI-03: `source` must be a call-site path; grep for model SDK imports. |
| Invents plausible figures ("99.9% accurate", "trusted by 10,000 teams") when asked for a stronger hero. | CLAIM-AI-01 grep on `\d+%` near accuracy words; Record row required; refuses an empty `method`. |
| Turns a mechanism into an outcome while "tightening" copy ("signed releases with SBOM" becomes "secure supply chain"). | CLAIM-SEC-05: outcome words require a mechanism token on the line; a diff check flags a removed token in the same hunk. |
| Treats the AI Act as a rulebook for claims and cites "Art. 50" to justify copy. | Rule text and F3 table: Art. 50 is transparency; claim substantiation falls under consumer-protection law. |
| Writes a security.txt with only `Contact` or an `Expires` two years out. | CLAIM-SEC-07 curl-and-compare check. |
| Copies Tailscale's or 1Password's slogans ("You are not the product", "largest bug bounty") as if exemplary. | Slogan list in the rule; "largest/biggest/best" fall into the superlative lint of the sibling topic. |
| Backdates or omits "as of" on a trust claim. | CLAIM-SEC-09 lint: `observed` and `refresh_by` mandatory for class `security`. |
| Rewrites a security statement and drops the negative disclosure ("no audit", "no bounty"), because negatives read badly. | CLAIM-SEC-04: a rewrite may not delete a line that states an absence unless the Record changes. |

## Contested / evolving

- **"SOC 2 certified" versus "SOC 2 report".** Against: the AICPA page uses "assurance reports" and never "certification" ([AICPA](https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services)); vendors such as [Vanta](https://www.vanta.com/collection/soc-2/introduction/is-soc-2-a-certification-or-attestation) say "SOC 2 is an attestation, not a certification". For common use: Tailscale writes "SOC 2 Type II certification" and 1Password "SOC 2 type 2 certified" ([Tailscale](https://tailscale.com/security), [1Password](https://1password.com/security)), so buyers read it as normal. No fetched statute or order treats the phrase as unlawful. This file's rule (CLAIM-SEC-01) is stricter than market practice by choice, because an agent cannot tell when "certified" is harmless. Trend: the AICPA notice on compliance vendors suggests more scrutiny, not less (page dated to 2026-11).
- **How far the AI Act reaches marketing.** The text read says transparency (Art. 50) plus intended-purpose definition (Art. 3(12)). Law-firm commentary may argue wider consequences; none was fetched and none is relied on here. The Omnibus (in force 2026-07-27) moved the high-risk dates and kept Art. 50(1) to (5) intact in the text read; a Commission guidelines or code-of-practice outcome on marking was not read. Trend: dates keep moving; every law row refreshes on 2027-05-27.
- **Dating of the Art. 50(2) grace.** The amending text reads 2 December 2026 for systems placed on the market before 2 August 2026. One law-firm table in a search snippet listed 2027-12-02; the OJ text overrides it.
- **Independent testing for AI claims.** The EPIC comment urged independent testing in the Workado order; the FTC declined to change the order (from a search summary of the FTC response; the response document was not read). So the order requires competent and reliable evidence but not a named independent tester. Rule CLAIM-AI-01 therefore asks for `source_type` and who ran the test, not an independent tester. Credible practitioners could demand independence for any accuracy figure; unresolved.
- **security.txt as a trust signal versus a spam channel.** RFC 9116 is Informational, not a standard; 1Password ships a signed file without `Expires`. Whether `Expires` should be a hard gate or a warning varies by operator; this file picks SHOULD for the file and MUST for the two RFC fields if the file exists.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://www.ftc.gov/news-events/news/press-releases/2024/09/ftc-announces-crackdown-deceptive-ai-claims-schemes | FTC Operation AI Comply release (authority) | 2024-09-25 | Five actions; "no AI exemption" |
| https://www.ftc.gov/node/87474 | FTC DoNotPay final order release (authority) | 2025-02-11 | $193,000; "sufficient evidence" |
| https://www.ftc.gov/news-events/news/press-releases/2025/04/ftc-order-requires-workado-back-artificial-intelligence-detection-claims | FTC Workado proposed order (authority) | 2025-04-28 | 98 % claimed, 53 % measured |
| https://www.ftc.gov/news-events/news/press-releases/2025/08/ftc-approves-final-order-against-workado-llc-which-misrepresented-accuracy-its-artificial | FTC Workado final order (authority) | 2025-08-28 | Evidence retention and reporting terms |
| https://web.archive.org/web/2024/https://www.ftc.gov/business-guidance/blog/2023/02/keep-your-ai-claims-check | FTC "Keep your AI claims in check" (authority, archived copy) | 2023-02-27 | The four questions; development use is not "has AI" |
| https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation | FTC substantiation policy statement (authority) | 1984-11-23 | Reasonable-basis rule |
| https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services | AICPA SOC suite page (authority) | page items to 2026-11-16 | "assurance reports"; vendor-misuse notice |
| https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2 | AICPA SOC 2 topic page (authority) | 2026 | Confirms no "certification" wording |
| https://www.vanta.com/collection/soc-2/introduction/is-soc-2-a-certification-or-attestation | Vendor explainer (vendor data) | undated, 2026 | Type 1 and 2 definitions the authority page lacks |
| https://web.archive.org/web/20251129184611/https://www.iso.org/standard/61651.html | ISO/IEC 17021-1:2015 catalogue page (authority, archived) | 2015-06; snapshot 2025-11-29 | Third-party certification wording |
| https://eur-lex.europa.eu/eli/reg/2024/1689/oj | AI Act (authority; text read from the Publications Office Cellar copy) | 2024-07-12 | Art. 3(12), 4, 5, 48, 50, 99, 113 |
| https://eur-lex.europa.eu/eli/reg/2026/1744/oj | Digital Omnibus on AI (authority; Cellar copy) | 2026-07-24 | Dates, Art. 4, Art. 111(4) |
| https://www.lewissilkin.com/insights/2026/07/27/the-digital-omnibus-on-ai-enters-into-force-today | Law-firm secondary on the Omnibus | 2026-07-27 | Cross-check of in-force date |
| https://www.rfc-editor.org/rfc/rfc9116 | RFC 9116 security.txt (authority) | 2022-04 | Required fields, location, expiry |
| https://tailscale.com/security | Exemplar trust page | undated, read 2026-11-27 | Mechanism versus slogan lines |
| https://tailscale.com/.well-known/security.txt | Exemplar security.txt (raw) | read 2026-11-27 | Complete field set |
| https://1password.com/security | Exemplar trust page | undated, read 2026-11-27 | Report link; no period |
| https://1password.com/.well-known/security.txt | Exemplar security.txt (raw) | read 2026-11-27 | Missing `Expires` |
| https://github.com/.well-known/security.txt | Exemplar security.txt (raw) | read 2026-11-27 | Full set; expiry 2026-12-27 |
| https://survey.stackoverflow.co/2025/ | Developer survey (platform survey) | 2025 | Rejection reasons; AI trust figures |
| Fleet files under `/home/mherwig/dev` (READMEs, `Landing.astro`, `verify-installs.mdx`, `inspect.md`, `installation.md`, `SECURITY.md`) | Own measurement | read 2026-11-27 | Commands and counts in F5 |

Not fetched or not readable, stated plainly: the live FTC blog URL (404 to this host; archived copy read), the ISO catalogue page and the AICPA article on SOC 2 definitions (403 and 404; archived and vendor substitutes recorded), EUR-Lex HTML (bot challenge; Publications Office XHTML read instead), the Workado and DoNotPay order PDFs (press releases only), `ocx.sh/.well-known/security.txt` (host unreachable from this machine), the signature file of 1Password's security.txt. Anything resting only on those is marked unverified and carries no rule row.
