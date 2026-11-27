---
title: "Voice and AI authorship: when AI involvement on a marketing surface must be disclosed"
program: product
sub_program: marketing
topic: marketing-voice-ai-authorship
worker: voice-ai-disclosure
date_researched: 2026-11-27
model: sonnet
sources_fetched: 18
refresh_by: 2026-12-02
scope: "Covers EU AI Act Article 50 as it binds an adopter that uses a generative model to produce marketing text, images and demo media; the Commission guidelines and Code of Practice; C2PA provenance as a practical mechanism; a measurement of fleet assets; and the interaction with DOC-PLAIN-08/-09/-22. Does not cover endorsements, testimonials and AI avatars (claims-endorsements-proof), platform-specific AI labels (channels), voice and slop avoidance (sibling dive), or non-EU law."
---

# Voice and AI authorship: disclosure

## Contents

1. [Summary](#summary)
2. [Findings](#findings)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Dated facts](#dated-facts)
5. [What an agent must not decide alone](#what-an-agent-must-not-decide-alone)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- Verdict: ordinary marketing text written or drafted by an agent needs no AI disclosure under EU law. The Commission guidelines list "AI-manipulated text that is part of a company's advertisement or product descriptions (not including any claims related to e.g. health, consumer safety or sustainability)" as outside Article 50(4) ([guidelines 6.2.1, 5 Nov 2026](https://ec.europa.eu/newsroom/dae/redirection/document/131215)).
- The text duty is narrow: text "published with the purpose of informing the public on matters of public interest" with no qualifying human review. Public interest includes public health, environmental protection and consumer safety ([guidelines 6.2.1](https://ec.europa.eu/newsroom/dae/redirection/document/131215)).
- The review exception needs two cumulative conditions: substantive human review or editorial control (fact-checking is the minimum), and a named person or entity holding editorial responsibility ([guidelines 6.2.3](https://ec.europa.eu/newsroom/dae/redirection/document/131215)).
- Spell-check, grammar fixes, an editorial policy on paper, automated review, or an AI reviewing an AI do not count ([guidelines para 135, and example list](https://ec.europa.eu/newsroom/dae/redirection/document/131215)).
- Any substantive AI edit after sign-off voids the exception ([guidelines para 136](https://ec.europa.eu/newsroom/dae/redirection/document/131215)). An agent that "polishes" a human-approved page re-opens the duty.
- The image, audio and video duty is wider than the text duty: a deepfake must carry a visible or audible label. A deepfake is AI content that resembles real persons, objects, places or events and would falsely appear authentic ([Art. 3(60) as quoted in the Commission FAQ, updated 24 Jul 2026](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act)).
- For marketing, the guidelines name as deepfakes: an AI image of a product that "can affect the audience's perception and mislead as to the actual product appearance, characteristics or use", a synthetic celebrity or influencer in an ad, and a realistic synthetic CEO avatar ([guidelines 6.1.1 examples](https://ec.europa.eu/newsroom/dae/redirection/document/131215)).
- Not deepfakes: a flying sphinx, talking cartoon mice, a real product against an AI-generated background that does not mislead about the product, AI colour correction, rescaling, and background tidy-up ([guidelines 6.1.1 examples and para 116](https://ec.europa.eu/newsroom/dae/redirection/document/131215)).
- Machine-readable provider marking does not discharge the deployer's duty. Deployers "cannot rely on the machine-readable marking" ([guidelines para 117](https://ec.europa.eu/newsroom/dae/redirection/document/131215)).
- The 2026-12-02 transition covers only providers' marking duty under Art. 50(2) for generative systems already on the market. It does not delay deployer labelling under Art. 50(4), which applies since 2026-08-02 ([guidelines para 153](https://ec.europa.eu/newsroom/dae/redirection/document/131215)). The scout row reading "Systems placed on the market before 2026-08-02 have until 2026-12-02" overstated this for adopters.
- Content made before 2026-08-02 need not be labelled retroactively; text generated earlier but first published on or after 2026-08-02 must be labelled if in scope ([guidelines para 154](https://ec.europa.eu/newsroom/dae/redirection/document/131215)).
- Label placement: visible without user action, at the latest at first exposure, embedded in the content or an equivalent overlay, remains visible when reshared; for video, at the start and at intervals ([Code of Practice, Section 2, Measure 1.2](https://ec.europa.eu/newsroom/dae/redirection/document/129555)).
- For published text the Code suggests the icon above the text, near the headline, or in the colophon at the beginning ([Code, Sub-measure 1.2.2 f)](https://ec.europa.eu/newsroom/dae/redirection/document/129555)).
- Fine ceiling per the Commission FAQ: up to EUR 15 million or 3% of worldwide turnover, with proportionality for SMEs ([Commission FAQ, 24 Jul 2026](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act)).
- Fleet measurement: 0 of 49 owned image and cast files carry any provenance metadata (section 2.6). No fleet surface needs a label today, so the gap is a posture decision, not a violation.
- DOC-PLAIN-08 and Article 50 do not conflict if the adopter takes the review route for text: no badge, one public editorial-responsibility statement in legal pages. Only a labelled deepfake needs an "AI-generated" string, and the checker needs an allow marker for it.

## Findings

### 2.1 Primary-source status and law protocol

| Provision or document | Fetched from | Fetch date | In force |
|---|---|---|---|
| Regulation (EU) 2024/1689, Art. 50(1)-(7) | EUR-Lex returned an empty body to `curl` (HTTP 202, 0 bytes) and to WebFetch, so the OJ text was not read directly. The operative text of Art. 50(4) and (5) was read verbatim as reproduced in the [Code of Practice PDF, Commitment 1](https://ec.europa.eu/newsroom/dae/redirection/document/129555) and paragraph-by-paragraph on the [mirror](https://artificialintelligenceact.eu/article/50/) (not a primary source). | 2026-11-27 | Art. 50 applies from 2026-08-02 (guidelines para 153, citing Art. 113) |
| Commission guidelines on Art. 50, C(2026) 7702 final | [PDF](https://ec.europa.eu/newsroom/dae/redirection/document/131215), text-extracted with `pypdf` | 2026-11-27 | Communication dated Brussels, 5.11.2026; library page says published 20 Jul 2026, updated 5 Nov 2026 ([library](https://digital-strategy.ec.europa.eu/en/library/guidelines-transparency-obligations-providers-and-deployers-ai-systems)) |
| Code of Practice on transparency of AI-generated content | [PDF](https://ec.europa.eu/newsroom/dae/redirection/document/129555), 38 pages, extracted the same way | 2026-11-27 | Final 10 Jun 2026; voluntary |
| AI Omnibus, the grandfathering rule | Described in guidelines para 153 as "recently adopted". Regulation number and entry-into-force date came only from law-firm search snippets and are unverified, omitted. | 2026-11-27 | see para 153 |

One reconciliation point. The Commission signing FAQ, written before adoption, says the Omnibus "would give" existing systems until 2026-12-02 "if adopted" ([signing FAQ](https://digital-strategy.ec.europa.eu/en/faqs/signing-code-practice-transparency-ai-generated-content)). The 5 Nov 2026 guidelines state it is adopted. Use the guidelines.

### 2.2 Who is the deployer, and what the adopter is not

- The adopter that prompts a model to write copy or generate a banner is a deployer: the party using an AI system under its authority, other than for personal non-professional use. A company that only commissions an agency, without deciding whether and how the agency uses AI, is not a deployer ([guidelines, deployer section, lines on advertising agency](https://ec.europa.eu/newsroom/dae/redirection/document/131215)).
- The model vendor is the provider and owns marking (Art. 50(2)). Code Section 1 commits signatory providers to metadata marking, watermarking, and to forbid users in their terms from stripping marks ([Code Section 1, Measure 1.2](https://ec.europa.eu/newsroom/dae/redirection/document/129555)). An adopter who builds its own generative feature into a product becomes a provider as well, which is a separate decision (section 5).

### 2.3 Text

Three elements, all required, for the Art. 50(4) text duty ([guidelines 6.2.1](https://ec.europa.eu/newsroom/dae/redirection/document/131215)):

1. Published: reachable by an indeterminate, fairly large number of unrelated readers. Closed groups, private professional correspondence and internal texts are not published.
2. Informing the public: communicates knowledge, opinions or facts. Short texts that do not materially do so are out.
3. On matters of public interest: politics, public administration, justice, fundamental rights, public security, public health, environmental protection, consumer safety, and "any economic, financial, political, scientific, or cultural development that may be relevant subject of public debate".

In scope per the guidelines: an AI summary of a human article on a council decision; an AI-manipulated diet-and-disease article; AI-manipulated investor reports on a listed company's site. Out of scope: AI fantasy novels, AI advertising and product-description text without health, safety or sustainability claims, a chatbot summary visible only to the prompter.

Mapping to marketing surfaces, as the adopter's reading of the guidelines (the guidelines do not list these surfaces; the mapping is this dive's inference):

| Artefact | Reading | Basis |
|---|---|---|
| Landing page, pricing, feature copy, README, tagline | Out of scope | Advertising and product-description example |
| Release notes and changelog about features | Out of scope | Product description; no public-interest topic |
| Blog post explaining a technique | Out of scope in general: informs, but not a public-interest matter unless it covers a listed topic | Inference |
| Security advisory, vulnerability disclosure, supply-chain incident post | Unclear: "public security" and "consumer safety" are listed topics. Treat as possibly in scope and route through the review route. | Inference; not decided by any cited source |
| Sustainability, energy, health, or safety claims | In scope if AI-written, because the advertising carve-out explicitly excludes them | Guidelines 6.2.1 example |
| Financial or regulatory-compliance explainers | Possibly in scope ("economic, financial" development) | Inference |

### 2.4 Human review: what removes the text duty

The exception needs both conditions ([guidelines 6.2.3, paras 133-138](https://ec.europa.eu/newsroom/dae/redirection/document/131215)):

- Human review: "deliberate examination of the substance" by persons with relevant knowledge and professional judgement; fact-checking "is a minimum requirement".
- Editorial control: an accountable entity that can "approve, alter or reject the substance" on substantive grounds.
- Not enough: spell-checking, grammar correction, an editorial policy that merely exists, automated review, cursory approval, an AI reviewing another AI plus a "superficial, grammatical check".
- Sign-off order matters: a substantive AI change after sign-off makes the text AI-generated again.
- Editorial responsibility: a legal or natural person holds ultimate responsibility, and "the identity and contact details ... should be made publicly available on an easily findable location", for example a website's terms or legal information, or a colophon.
- A small publisher without media-law duties can rely on the Code: Commitment 4 asks for a policy naming the responsible function (name, role, contact), an overview of organisational measures, and does not require documenting each review ([Code, Commitment 4](https://ec.europa.eu/newsroom/dae/redirection/document/129555)).

Worked example on a security advisory, stated as a reading heuristic:

- Pass: an agent drafts the advisory; a named maintainer checks every version number, CVE id, affected range and mitigation against the code and the tracker, edits it, approves it, and the project's legal page names the responsible maintainer role and contact. The agent does not touch it again.
- Fail: the agent drafts it, a second agent "reviews" it, a human skims for typos, and an agent re-formats it after approval.

### 2.5 Images, audio and video

- Test (cumulative, per Art. 3(60)): resembles existing persons, objects, places, entities or events; the subject exists or plausibly could; it would falsely appear authentic to a person ([Commission FAQ](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act)).
- Decorative or obviously fictional illustration, abstract art, mascots and logos generated by AI are not deepfakes because no authenticity is falsely implied.
- A generated product screenshot, UI mockup presented as the real product, or a synthetic "customer" photo can mislead about "actual product appearance, characteristics or use". The guidelines name this as a deepfake. The adopter's software equivalent is a generated screenshot or a fabricated terminal cast shown as a real run. That equivalence is this dive's inference, not stated by the Commission.
- Advertising can sometimes qualify for the lighter "evidently artistic, creative, satirical, fictional" disclosure, but informative or commercial content recognisable as such is excluded, and where informative and creative aspects combine "the informative character should always prevail" ([guidelines para 122](https://ec.europa.eu/newsroom/dae/redirection/document/131215)). Do not plan on the light regime for product demos.
- Labels must be understood "without needing to rely on any specific technical tools or performing dedicated actions"; provider metadata is not a label ([guidelines para 117](https://ec.europa.eu/newsroom/dae/redirection/document/131215)).
- Timing: at the latest at first exposure, and in a clear, distinguishable manner that is not "only included as part of a manual or hidden under layers of menu options" or terms of use ([guidelines paras 142-143](https://ec.europa.eu/newsroom/dae/redirection/document/131215)).
- Accessibility: the information must meet applicable accessibility requirements; Art. 50 adds none of its own ([guidelines para 144](https://ec.europa.eu/newsroom/dae/redirection/document/131215)).

Wording and form (the Code is voluntary, and the Commission says it "does not impose obligations beyond the AI Act", so these are the accepted way to show compliance, not the only way: [Commission FAQ](https://digital-strategy.ec.europa.eu/en/faqs/code-practice-transparency-ai-generated-content)):

- EU icon, three kinds: basic, fully AI-generated, partially AI-modified. Four colour variants, SVG and PNG, free of charge, no attribution required. Adding a text label improved comprehension in the Commission's testing, which the icon page reports without giving figures ([icons page, updated 25 Nov 2026](https://digital-strategy.ec.europa.eu/en/policies/eu-icons-labelling-ai-generated-content)).
- Accompanying words should avoid abbreviations other than "AI", and alt text should state the content is AI-generated or manipulated, where possible (same page, listed as encouraged).
- Image or video: icon where no overlay sits on it, for example top right; video at the start, at intervals and after interruptions such as ad breaks; audio-only content gets an audible disclaimer at first exposure, plus a visual one where a screen exists ([Code, Sub-measure 1.2.2](https://ec.europa.eu/newsroom/dae/redirection/document/129555)).
- An illustrative on-page pair (the Commission prescribes no wording; this is a candidate): visible caption "Illustration generated with AI" next to the image, and alt text beginning "AI-generated image:".

### 2.6 Fleet measurement

Scope: image, video and cast files owned by the fleet, excluding downloaded VS Code test builds, `.tmp` visual diffs, `dist`, and coverage output. Commands, run 2026-11-27 from `/home/mherwig/dev`:

```
find ocx-sh/website ocx-sh/ocx grimoire-rs -path '*/node_modules' -prune -o -path '*/.git' -prune -o \
  -path '*/target' -prune -o -path '*/.agents/worktrees' -prune -o \
  \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.webp' -o -iname '*.gif' -o -iname '*.cast' \
     -o -iname '*.mp4' -o -iname '*.webm' \) -print | grep -v -E 'node_modules|/\.venv/|site-packages'
# 457 raw hits; after dropping .vscode-test, .tmp, dist, coverage: 49 owned files = 31 png, 3 jpg, 15 cast
```

Then a script (`python3 -I`, standard library only) parsed the PNG chunk list of every PNG and searched all 49 files for the byte strings `c2pa`, `jumb` and `trainedAlgorithmicMedia`, and read the first line of each cast as JSON. `exiftool`, `c2patool` and ImageMagick are not installed on this host, so those two commands were not run; the chunk parse stands in for them.

| Check | Result |
|---|---|
| Files with a C2PA box (`caBX` chunk), `c2pa` or `jumb` bytes, or IPTC `trainedAlgorithmicMedia` | 0 of 49 |
| PNGs with a `tEXt` chunk | 8 of 31; the only `Software` values are `www.inkscape.org` (the two logo files) |
| Cast headers | 15 of 15 carry only `version`, `width`, `height`, `title` (and `theme` in 12); no provenance or generator field |

Reading: nothing on the fleet claims or proves AI origin, and nothing proves human origin. Whether any fleet image was AI-generated is not recoverable from the files.

### 2.7 C2PA as the practical mechanism

- Spec: the C2PA Content Credentials specification, current series 2.x; the 2.2 page is dated May 2025 in its version history and links to versions up to 2.5 ([C2PA spec 2.2](https://spec.c2pa.org/specifications/specifications/2.2/specs/C2PA_Specification.html), and the [specifications index](https://spec.c2pa.org/specifications/) redirecting to 2.5). The release date of 2.5 was not read.
- Embeddable formats include PNG, JPEG, SVG, GIF, MP4/BMFF, PDF, WebP, WAV, MP3 per the maintained list ([c2pa-rs supported-formats.md](https://github.com/contentauth/c2pa-rs/blob/main/docs/supported-formats.md)). WebM is not listed.
- Plain text is supported only with the non-default `unstable_plain_text` build feature; Markdown, CSS, JS, Python, TOML and YAML need `unstable_structured_text` (same page). Treat text provenance as unavailable for practical purposes.
- asciinema `.cast` files are newline-delimited JSON text with a `.cast` extension. The extension is not in the list, so `c2patool` cannot embed in a cast. Options: a sidecar `.c2pa` manifest store (listed as `application/x-c2pa-manifest-store`), or sign the rendered derivative (GIF, SVG, MP4) instead. Whether a given `c2patool` build writes a sidecar for an unsupported source was not tested here (tool not installed).
- c2patool: lives in [contentauth/c2patool](https://github.com/contentauth/c2patool) (moved out of c2pa-rs; the c2pa-rs README says so). Install with `brew install c2patool` or a release archive. Add a manifest with `c2patool image.jpg --manifest manifest.json --signer-path ./my-signer -o signed.jpg` ([signing.md](https://github.com/contentauth/c2patool/blob/main/docs/signing.md)). With no signer configured it uses a built-in test certificate "only suitable for development". A test certificate gives credentials that no validator trusts, which is not useful provenance.
- A signed manifest needs a real signing certificate and key custody, which is a secrets and brand decision (section 5).
- Reader side: LinkedIn shows a C2PA icon on image and video that carries credentials, including single-image and video ads at upload, and states it is rolling this out gradually ([LinkedIn help, "Last updated: 1 month ago", undated](https://www.linkedin.com/help/linkedin/answer/a6282984)). Stripping metadata in an image pipeline therefore silently removes this signal. Whether the fleet's build tooling strips metadata was not measured.
- C2PA metadata is the provider's Art. 50(2) mechanism and an optional extra for a deployer. It is not the deployer's Art. 50(4) label.

### 2.8 DOC-PLAIN-08, -09 and -22: the interaction

What the docs rule says ([docs-quality.md rows 10-12](../../../rules/docs-quality.md), [plain-english.md DOC-PLAIN-08](../../../skills/docs-quality-reference/plain-english.md)): remove chatbot artifacts and AI-authorship badges from published docs pages (`AI-generated`, `AI-assisted`, assisted-by phrasings; checked by `python3 checks/prose.py --root . PATH`); never claim who wrote a page (DOC-PLAIN-09); state AI assistance in the PR body and never name a tool as author (DOC-PLAIN-22).

Resolution by surface:

| Situation | Marketing-surface duty | Docs rule |
|---|---|---|
| Ordinary landing, README, release notes, product copy | None under Art. 50 | DOC-PLAIN-08 applies: no badge. Consistent. |
| Public-interest text with substantive review | No label; publish editorial-responsibility statement (named function and contact) once in legal/terms page | No per-page badge, so consistent. The statement is about accountability, not authorship, so DOC-PLAIN-09 is not engaged. |
| Public-interest text with no substantive review | Label required | Conflict. Prefer to add the review. If publishing unreviewed, the label wins over DOC-PLAIN-08, and the checker needs an allow marker (the rule file does not define one in the pages read; ask the rule owner). |
| Deepfake image, audio or video | Visible or audible label | Not a docs-page authorship badge: label belongs to the media (caption, embedded icon, alt text). Add a narrow carve-out to the checker for that label wording. |
| Pull request | None under Art. 50 | DOC-PLAIN-22 remains: say in the PR body that AI drafted it. |

Process disclosure and legal disclosure are different acts. The PR note serves maintainers; the public label serves the person exposed to a deceptive artefact.

## Normative guidance candidates

Severity key: MUST, SHOULD, CONSIDER. Law rows carry the in-force date and the fetch date 2026-11-27.

| ID | Rule | Rationale | Severity | Verification |
|---|---|---|---|---|
| VAD-01 | Do not add an AI-authorship badge, "written by AI" line or "AI-assisted" footer to ordinary marketing text (landing, pricing, README, release notes, product copy). | Art. 50(4) does not cover advertising or product-description text without health, safety or sustainability claims ([guidelines 6.2.1](https://ec.europa.eu/newsroom/dae/redirection/document/131215)); a badge adds an unmaintained authorship claim (DOC-PLAIN-08). | MUST | `python3 checks/prose.py --root . PATH` returns no DOC-PLAIN-08 hit on the page. |
| VAD-02 | Before publishing agent-written text, classify it with the three-part test: published, informs the public, public-interest topic. Record the verdict in the PR body. | Only text meeting all three is in scope ([guidelines 6.2.1](https://ec.europa.eu/newsroom/dae/redirection/document/131215)). | MUST | PR body has a line "Art. 50(4) text scope: out / in, because ..."; reviewer checks the topic list (public health, environment, consumer safety, public security, public administration, economic or financial development). |
| VAD-03 | Route every agent-drafted text that is in scope, or uncertain, through substantive human review by a named person who fact-checks it, and make no AI edit after sign-off. | The exception needs substantive review plus editorial responsibility; later AI edits void it ([guidelines paras 134-136](https://ec.europa.eu/newsroom/dae/redirection/document/131215)). | MUST | `git log --follow <file>`: the last commit touching the file is a human commit or carries a recorded reviewer approval, and no agent commit follows it. Fail example: agent re-formatting commit after approval. |
| VAD-04 | Never count spell-check, grammar correction, a style linter, a second model's review or a policy document as human review. | [Guidelines para 135, section 6.2.3](https://ec.europa.eu/newsroom/dae/redirection/document/131215) list spell-check, grammar and purely formal checks as insufficient; [Code Commitment 4](https://ec.europa.eu/newsroom/dae/redirection/document/129555) asks for a named responsible function, not a tool. | MUST | Reading heuristic: the review record names a person, what facts they checked and against which source. Fail: "reviewed by lint and Claude". |
| VAD-05 | Publish the identity and contact of the function holding editorial responsibility in an easily findable place (terms, imprint, legal page) before relying on the review exception. | Guidelines para 138 and Code Commitment 4. | MUST (owner supplies the name; see section 5) | `grep -r -i -E 'editorial responsib' <site-src>` finds a page linked from the footer with a role and contact. |
| VAD-06 | Treat security advisories, incident posts, and any health, safety, sustainability, financial or regulatory-compliance explainer as potentially in scope, and do not publish them AI-drafted without VAD-03 review. | "Public security", "consumer safety" and "economic, financial" development are listed topics; the advertising carve-out excludes health, safety and sustainability claims. The advisory mapping is an inference. | SHOULD | Same check as VAD-03 for files under advisory, security, incident or compliance paths. |
| VAD-07 | Do not publish an AI-generated or AI-edited image, video or audio that resembles a real person, product, place or event and could pass as authentic, without a visible or audible label. | That is the deepfake definition; product images that mislead about appearance or use are named examples ([guidelines 6.1.1](https://ec.europa.eu/newsroom/dae/redirection/document/131215)). | MUST | Reading heuristic: ask "would a reader take this for a photo or real recording of a real thing?" Pass: abstract mascot illustration. Fail: AI-generated "customer" photo or a generated product screenshot presented as the real UI. |
| VAD-08 | Never present a generated terminal session, screenshot or UI as a real run. Record demos from real execution, or label them. | A fabricated product demo can "mislead as to the actual product ... characteristics or use" (guidelines example, extended by inference to software); also DOC-EX-12 says a recording is a real run. | MUST | Each cast or screenshot has a generating command in the repo; `asciinema rec` or a script that runs the real binary. No such command, no publish. |
| VAD-09 | Put the label on the media itself or beside it, visible without interaction, at first exposure, in plain words ("Generated with AI", "Edited with AI"), with matching alt text. | [Guidelines 7.1-7.2, paras 142-143](https://ec.europa.eu/newsroom/dae/redirection/document/131215): information is not clear if only in a manual, hidden under menu layers or in terms of use, and is due at the latest at first exposure; [Code Section 2, Measure 1.2 placement, Sub-measure 1.2.2](https://ec.europa.eu/newsroom/dae/redirection/document/129555). | MUST for VAD-07 media | `grep -n -i -E 'generated with ai|edited with ai|ai-generated' <page>` finds the caption; the `<img>` alt text starts with the same words; label is not inside `<details>`, a tooltip only, or a footer. |
| VAD-10 | Do not rely on embedded metadata as the label. Add the visible label even when C2PA or IPTC data is present. | [Guidelines para 117](https://ec.europa.eu/newsroom/dae/redirection/document/131215): deployers cannot rely on the machine-readable marking; the label must be understood without specific technical tools. | MUST | Visible caption exists regardless of `c2patool <file>` output. |
| VAD-11 | For video, show the label at the start and again after any break; for audio-only, state it in the opening seconds. | [Code Section 2, Sub-measure 1.2.2 b) and e)](https://ec.europa.eu/newsroom/dae/redirection/document/129555): video label at the beginning, at intervals and after breaks; audio deep fakes get an audible disclaimer plus a visual one where a screen exists. Guidelines [para 143](https://ec.europa.eu/newsroom/dae/redirection/document/131215) set the first-exposure timing. | SHOULD | Frame at t=0 shows the icon or caption; transcript or script contains the spoken line. |
| VAD-12 | When an AI step only alters insignificant aspects (colour correction, rescaling, noise removal, tidying a background, compositing a real product on a non-misleading background), do not add a deepfake label. Record the step in the PR body. | [Guidelines para 116 and section 6.1.1 examples](https://ec.europa.eu/newsroom/dae/redirection/document/131215): AI manipulation of insignificant substantive or technical aspects is not a deepfake. | SHOULD | PR body names the edit type; reviewer compares original and output for changes to product appearance. |
| VAD-13 | Do not strip or rewrite provenance metadata (C2PA, IPTC, XMP) from images that arrive with it in an image or build pipeline. | The Code asks providers to preserve marks and forbid deliberate removal; LinkedIn reads the C2PA data ([LinkedIn help](https://www.linkedin.com/help/linkedin/answer/a6282984)). The Code's non-removal duty binds signatory providers, not deployers: [Code Section 1, Measure 1.2](https://ec.europa.eu/newsroom/dae/redirection/document/129555). Fleet pipeline strip behaviour is not measured. | SHOULD | `c2patool <built-asset>` on the source and the built output report the same manifest; or a byte search for `caBX` in the built PNG. |
| VAD-14 | When the project has AI-generated media in its own repo, record provenance in a sidecar record (tool, model, prompt reference, date, human editor) next to the asset or in the PR body. | Gives the reviewer the evidence VAD-07 and VAD-12 need ([guidelines 6.1.1 and para 116](https://ec.europa.eu/newsroom/dae/redirection/document/131215)); [Code Commitment 4](https://ec.europa.eu/newsroom/dae/redirection/document/129555) likewise asks for documented, verifiable processes. This record format is this dive's proposal, not required by either source. | SHOULD | File exists at `<asset>.provenance.md` or the PR body names tool, date, edit type. |
| VAD-15 | Do not sign C2PA manifests with the built-in test certificate. Sign only with a certificate the owner has provisioned, or do not sign. | The tool's own [signing doc](https://github.com/contentauth/c2patool/blob/main/docs/signing.md) marks the test signer "only suitable for development"; an untrusted credential carries no value. | MUST | `c2patool` invocation in CI uses `--signer-path` or a secret-backed signer; no use of the sample certificate paths. |
| VAD-16 | Do not claim provenance the file cannot back up: no "100% human-written" or "authentic" badge on assets without a signed credential or a repo record. | A false authenticity claim is a marketing claim problem (claims-endorsements-proof owns the claims rule); a signed credential is what [C2PA](https://spec.c2pa.org/specifications/specifications/2.2/specs/C2PA_Specification.html) defines as provenance, and [guidelines para 117](https://ec.europa.eu/newsroom/dae/redirection/document/131215) say unsigned metadata is no label. | SHOULD | `grep -r -i -E 'human[- ]written|no ai|100% human' <site-src>` returns nothing without a linked policy. |
| VAD-17 | Keep the deployer duty date separate from the provider transition. An adopter must not treat 2026-12-02 as a deadline for its own labelling. | [Guidelines para 153](https://ec.europa.eu/newsroom/dae/redirection/document/131215), also [Commission FAQ](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act): Art. 50 applies from 2026-08-02; the grace period is for providers' Art. 50(2) marking only. | MUST | Any compliance note in the repo cites 2026-08-02 for deployer duties. |

## Dated facts

| Fact | Source | Date the source states | Source kind |
|---|---|---|---|
| Art. 50 applies from 2026-08-02, regardless of when a system was placed on the market | [Guidelines para 153](https://ec.europa.eu/newsroom/dae/redirection/document/131215) | 5 Nov 2026 (C(2026) 7702 final) | Authority |
| AI Omnibus grandfathering: only Art. 50(2) marking and detection, only generative systems on the market before 2026-08-02, until 2026-12-02; partly interactive systems get it for marking only | same | 5 Nov 2026 | Authority |
| Content generated before 2026-08-02 need not be labelled retroactively; text generated earlier but published on or after 2026-08-02 must be labelled if in scope | same, para 154 | 5 Nov 2026 | Authority |
| Fines up to EUR 15 million or 3% of worldwide turnover; proportionality for SMEs | [Commission FAQ](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act) | last updated 24 Jul 2026 | Authority |
| Guidelines first published 20 Jul 2026, updated 5 Nov 2026; draft consultation 8 May 2026 | [library page](https://digital-strategy.ec.europa.eu/en/library/guidelines-transparency-obligations-providers-and-deployers-ai-systems), [Code page](https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content) | as stated | Authority |
| Code of Practice final 10 Jun 2026 (updated 12 Jun); signature forms due 27 Jul 2026; not signing "does not constitute non-compliance"; non-signatories must demonstrate compliance by other means | [news](https://digital-strategy.ec.europa.eu/en/news/commission-publishes-code-practice-marking-and-labelling-ai-generated-content), [signing FAQ](https://digital-strategy.ec.europa.eu/en/faqs/signing-code-practice-transparency-ai-generated-content) | Jun 2026 | Authority |
| About 190 signatories by end of July 2026; Commission and AI Board confirmed the Code an "adequate voluntary tool" | [Code page, updated 25 Nov 2026](https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content) | 25 Nov 2026 | Authority |
| The AI Office reviews the Code at least every 2 years | [Code FAQ](https://digital-strategy.ec.europa.eu/en/faqs/code-practice-transparency-ai-generated-content) | 10 Jun 2026 | Authority |
| EU icon: 3 kinds, 4 colour variants, SVG and PNG, free, no attribution; use optional and does not by itself prove compliance | [icons page](https://digital-strategy.ec.europa.eu/en/policies/eu-icons-labelling-ai-generated-content) | 25 Nov 2026 | Authority |
| The Code FAQ says Annex I offers the icon "in three variants" while the icon page says four colour variants | [Code FAQ](https://digital-strategy.ec.europa.eu/en/faqs/code-practice-transparency-ai-generated-content) vs icons page | Jun / Nov 2026 | Authority, internally inconsistent; the two count different things (kinds versus colours) |
| C2PA spec 2.2 dated May 2025; later versions to 2.5 | [spec](https://spec.c2pa.org/specifications/specifications/2.2/specs/C2PA_Specification.html) | May 2025 | Standard body |
| c2pa-rs lists `txt` support only behind `unstable_plain_text`; `.cast` absent | [supported-formats.md](https://github.com/contentauth/c2pa-rs/blob/main/docs/supported-formats.md) | undated, fetched 2026-11-27 | Tool maintainer |
| LinkedIn shows a C2PA icon on image and video carrying credentials, gradually rolled out | [LinkedIn help](https://www.linkedin.com/help/linkedin/answer/a6282984) | undated ("Last updated: 1 month ago") | Platform |
| Labelling a headline "AI-generated" lowered perceived accuracy by 2.66 percentage points and sharing intent, N = 4,976, including for true headlines; the effect vanished when participants were told AI only edited or drafted | [Altay and Gilardi, PNAS Nexus](https://academic.oup.com/pnasnexus/article/3/10/pgae403/7795946) | 1 Oct 2024 | Independent study |

Unverified, omitted (no rule row): the Official Journal citation and entry-into-force date of the AI Omnibus; US state laws (California AI Transparency Act amendments, page returned HTTP 403); UK and other non-EU rules; any fine decision already made under Art. 50.

**refresh_by: 2026-12-02**, the earliest date the Commission names for a change (end of the provider transition). Re-fetch the guidelines library page and the Code page on or after that date. The Code is reviewed at least every two years, so no earlier scheduled change is named.

## What an agent must not decide alone

- Whether the project signs the Code of Practice. Voluntary, with a documented-compliance burden if not.
- Who holds editorial responsibility, and publishing their name and contact on the legal page. A legal and brand decision.
- Whether a borderline artefact (security advisory, compliance explainer, sustainability claim) is "public interest". Ask; default to the review route.
- Whether to publish AI-generated imagery of a real person, a customer, a team member or a lookalike. Also needs consent and personality-right checks ([guidelines paras 127-129](https://ec.europa.eu/newsroom/dae/redirection/document/131215)). The endorsement and avatar rules belong to claims-endorsements-proof.
- Whether to buy and hold a C2PA signing certificate and custody of its private key.
- Whether to adopt the EU icon or an own wording as the house label.
- Whether the project becomes a provider by shipping a generative feature, which brings Art. 50(1) and (2) duties.
- Any statement on the site about how much AI the project uses ("human-written", "AI-free"). A brand claim.

## AI-agent angle

| Characteristic mistake | Smallest mechanical check |
|---|---|
| Adds "Generated with Claude" or "AI-assisted" footers to pages and READMEs by habit | `python3 checks/prose.py --root . PATH` (DOC-PLAIN-08) |
| Treats Art. 50 as a blanket duty to label all AI text, or as no duty at all | VAD-02 scope line in the PR body |
| Treats 2026-12-02 as the date for everything | grep for "2026-12-02" in compliance notes; each must say "providers, Art. 50(2)" |
| Believes its own or a second model's review counts as human review | VAD-04: review record must name a person |
| Reformats or "improves" approved text after sign-off | `git log` order check from VAD-03 |
| Embeds C2PA data and calls the label done | VAD-10: look for the visible caption |
| Runs `c2patool` with the sample certificate and reports "signed" | VAD-15 check on the signer flag |
| Writes alt text "image" or "screenshot" on a label-bearing image | VAD-09 alt-text grep |
| Generates a fake terminal transcript for a demo | VAD-08 generating-command check |
| Quotes the Article 50 text from memory, or the mirror's two-version paragraph 7 | Re-read the primary; cite the Commission guidelines |

## Contested / evolving

- Does an AI label help or hurt? Independent evidence: an "AI-generated" label lowers perceived accuracy and sharing of headlines, including true ones, because readers assume no human involvement; defining the AI role as editing or drafting removed the penalty ([Altay and Gilardi, PNAS Nexus, Oct 2024](https://academic.oup.com/pnasnexus/article/3/10/pgae403/7795946)). The Commission's icon testing reports that a text label next to the icon improved performance on all measures ([icons page](https://digital-strategy.ec.europa.eu/en/policies/eu-icons-labelling-ai-generated-content), no figures given). Practical direction: when a label is required, name the AI role ("edited with AI"), not a bare "AI-generated". This is a design inference from both sources, not a tested result for marketing copy.
- Is a security advisory "public interest" text? The guidelines list "public security" and "consumer safety" but give no software example. Unresolved by sources read. The cautious and cheap route is review (VAD-03).
- Scope of the grandfathering: law-firm commentary in May to July 2026 disagreed on whether it covers only systems on the market before 2026-08-02 or all generative systems; the guidelines settle it as the former (para 153). Commentary pre-dating the guidelines should not be used.
- Whether national authorities will read "published ... to inform the public" more widely than the Commission does. Enforcement is by national market-surveillance authorities with no case yet found. Re-check after the first decisions.
- The Code's non-signatory burden: legally equal, practically heavier (more information requests; gap analysis) per the [signing FAQ](https://digital-strategy.ec.europa.eu/en/faqs/signing-code-practice-transparency-ai-generated-content).
- Direction of travel: a single interoperable EU icon and, per the guidelines, harmonised standards for detection are still pending; the guidelines contemplate marking techniques being limited in time "until harmonised standards ... emerge" (guidelines para 76 text). Expect label specifications to change.

Cross-territory, one line each: platform AI labels and their auto-detection (LinkedIn, YouTube, Meta) belong to channels; endorsements, testimonials and AI avatars belong to claims-endorsements-proof; the plain-English and slop-tell rules belong to the voice dive and docs-quality.

## Sources

Count basis for `sources_fetched: 18`: 16 external pages fetched (every row below except EUR-Lex, which returned an empty body) plus the 2 local catalog files. The guidelines and Code PDFs were re-fetched and text-extracted on 2026-11-27 in the repair pass to confirm paragraphs 116, 117, 135, 142-143, 153 and Code Section 1 Measure 1.2 and Section 2 Sub-measure 1.2.2.

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://ec.europa.eu/newsroom/dae/redirection/document/131215 | Commission guidelines on Art. 50, C(2026) 7702 (primary) | 5 Nov 2026 | The only authoritative reading of "public interest text", review exception, deepfake examples, transition |
| https://ec.europa.eu/newsroom/dae/redirection/document/129555 | Code of Practice on transparency of AI-generated content, final (primary; voluntary) | 10 Jun 2026 | Label placement, Commitment 4 on review policy, quotes Art. 50(4)-(5) |
| https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act | Commission Q&A on Art. 50 (primary) | updated 24 Jul 2026 | Transition scope, fines, deepfake test |
| https://digital-strategy.ec.europa.eu/en/library/guidelines-transparency-obligations-providers-and-deployers-ai-systems | Library entry for the guidelines (primary) | published 20 Jul 2026, updated 5 Nov 2026 | Dates and PDF link |
| https://digital-strategy.ec.europa.eu/en/news/commission-publishes-guidelines-transparency-obligations-providers-and-deployers-certain-ai-systems | Commission news item on the guidelines (primary) | 20 Jul 2026 | Publication date |
| https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content | Commission Code policy page (primary) | updated 25 Nov 2026 | Adequacy confirmation, signatory count, timeline |
| https://digital-strategy.ec.europa.eu/en/faqs/code-practice-transparency-ai-generated-content | Commission Code FAQ (primary) | Jun 2026 | Sections 1 and 2, "no obligations beyond the AI Act" |
| https://digital-strategy.ec.europa.eu/en/faqs/signing-code-practice-transparency-ai-generated-content | Commission signing FAQ (primary) | Jun to Jul 2026 | Non-signatory burden, 27 Jul deadline |
| https://digital-strategy.ec.europa.eu/en/news/commission-publishes-code-practice-marking-and-labelling-ai-generated-content | Commission news on the Code (primary) | 10 Jun 2026, updated 12 Jun | Publication facts |
| https://digital-strategy.ec.europa.eu/en/policies/eu-icons-labelling-ai-generated-content | Commission EU icon page (primary) | updated 25 Nov 2026 | Icon kinds, placement, accessibility, licence |
| https://artificialintelligenceact.eu/article/50/ | Mirror of Art. 50 (secondary; not the Official Journal) | undated | Paragraph-level cross-check; shows two versions of para 7 |
| https://eur-lex.europa.eu/eli/reg/2024/1689/oj | Official Journal text (primary), could not be fetched: empty body | n/a | Named in the commission; verify by hand before citing a paragraph |
| https://spec.c2pa.org/specifications/specifications/2.2/specs/C2PA_Specification.html | C2PA specification 2.2 (standard body) | May 2025 | Embeddable formats, soft binding |
| https://github.com/contentauth/c2pa-rs/blob/main/docs/supported-formats.md | c2pa-rs supported formats (tool maintainer) | fetched 2026-11-27 | PNG, SVG, GIF, MP4 yes; text experimental; sidecar |
| https://github.com/contentauth/c2patool/blob/main/docs/signing.md | c2patool signing doc (tool maintainer) | fetched 2026-11-27 | Test certificate warning, command line |
| https://github.com/contentauth/c2patool | c2patool repository (tool maintainer) | fetched 2026-11-27 | Install, relocation from c2pa-rs |
| https://www.linkedin.com/help/linkedin/answer/a6282984 | LinkedIn Content Credentials help (platform) | undated, "1 month ago" | Reader-side use of C2PA |
| https://academic.oup.com/pnasnexus/article/3/10/pgae403/7795946 | Altay and Gilardi, AI-generated label study (independent, peer reviewed) | 1 Oct 2024 | Evidence on label effects |
| /home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/rules/docs-quality.md | Catalog rule, rows 10-12 | repo, 2026 | DOC-PLAIN-08, -09, -22 text |
| /home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/skills/docs-quality-reference/plain-english.md | Catalog depth file | repo, 2026 | Checker command and measured accuracy figures |
