# Commission: marketing-measurement / measure-attribution-tagging

Topic question: Given the fleet's stance of "measure without cookies or do not measure", what may a project measure, how is attribution tagged, and what may a report or a page claim from the numbers?

Question: What UTM convention applies, where are UTMs banned, and is a self-reported "how did you hear about us" (HDYHAU) field required?
Starts from: analytics-attribution.md #9-10 and #15; canonical-guides.md #13 (keying); recent-shifts.md (Safari 26 parameter stripping, unresolved).
Investigate:
1. GA4 docs on UTM parameters, case sensitivity, default channel grouping and attribution models. URLs are in analytics-attribution.md.
2. WebKit's Safari 26 notes on link tracking protection: which parameters are stripped, and in which modes. https://webkit.org/blog/17333/webkit-features-in-safari-26-0/. Record what the page states, and nothing beyond it.
3. Self-reported attribution in practitioner sources (Growth Unhinged and others). Note bias and response rates, labelled by source type.
4. Hopkins-style keyed offers, as the pre-digital method.
Measure, not cite:
- Grep fleet sites and READMEs for links with tracking parameters, and for internal links carrying UTMs.
- Record the command.
The deliverable must decide: the UTM vocabulary (lower-case source, medium and campaign values); the internal-link ban; and whether attribution uses UTMs, HDYHAU or both, given the fleet has no sign-up form today.
