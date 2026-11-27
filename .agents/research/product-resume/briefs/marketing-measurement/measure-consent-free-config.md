# Commission: marketing-measurement / measure-consent-free-config

Topic question: Given the fleet's stance of "measure without cookies or do not measure", what may a project measure, how is attribution tagged, and what may a report or a page claim from the numbers?

Question: Which analytics configurations are lawful without a consent banner in the EU, UK and Germany, and must the privacy statement match the script inventory?
Starts from: analytics-attribution.md #1-6 and #13; distribution-posture.md smell 3 and pattern 7 (0 analytics across 413 pages; grimoire privacy.html says no cookies, no analytics, no third-party resources).
Investigate, each from its primary source:
1. CNIL sheet 16 and its exemption conditions: https://www.cnil.fr/en/sheet-ndeg16-use-analytics-your-websites-and-applications.
2. EDPB Guidelines 2/2023 on Art. 5(3) ePrivacy, final adopted version, from edpb.europa.eu.
3. TDDDG §25, from gesetze-im-internet.de.
4. UK PECR regulation 6, https://www.legislation.gov.uk/uksi/2003/2426/regulation/6, and the Data (Use and Access) Act 2025 analytics exemption on legislation.gov.uk. Its commencement date must come from a commencement regulation on legislation.gov.uk.
5. The Digital Omnibus proposal, from Commission pages only. analytics-attribution.md left its status unverified.
6. Vendor configurations: Plausible and Fathom daily salt, PostHog cookieless_mode, Matomo without consent. These are vendor claims: label them.
Law protocol: record for each item the fetch date, the provision number and whether it is in force, commenced or proposed. Anything not confirmed from the primary page is written "unverified, omitted" and gets no rule row. Every law row carries refresh_by = fetch + 6 months, or the next scheduled change if sooner.
Measure, not cite:
- Run each candidate tool in its cookieless mode locally; record requests and storage writes with a Playwright HAR.
- Check each against the CNIL conditions.
The deliverable must decide: the allowed tools and configurations per jurisdiction that passed the law protocol; the privacy-statement match check; and what "unique visitors" may mean under a daily salt.
