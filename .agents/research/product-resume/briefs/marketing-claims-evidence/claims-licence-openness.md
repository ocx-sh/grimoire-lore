# Commission: marketing-claims-evidence / claims-licence-openness

Topic question: Which claims may product copy make, and what evidence record must exist on disk before each class of claim ships?

Question: When may copy say "open source", "free" or "source-available", and what must agree with the LICENSE file?
Starts from: codified-law-policy.md #1 (177 files say "open source"; 15 LICENSE files, 14 Apache); pricing-plg.md #3-5; failure-corpus.md "licence-change announcements".
Investigate:
1. The OSI Open Source Definition and the OSI trademark guidelines: https://opensource.org/osd and https://opensource.org/trademark-guidelines. Record the version and date shown on each page.
2. The OSAID, for "open-source AI" wording: https://opensource.org/ai/open-source-ai-definition.
3. The SPDX licence list JSON (https://spdx.org/licenses/licenses.json). Use its isOsiApproved and isDeprecatedLicenseId fields; do not hand-maintain a list.
4. Wording failures around licence changes: HashiCorp BSL (2023), Elastic's return to an OSI licence (2024), and the Percona contributor study. All are linked in the scouts.
Measure, not cite:
- For each of the 17 fleet repos, read the LICENSE SPDX id and the Cargo.toml, package.json or pyproject.toml licence field. Note any disagreement between the two.
- Diff those against every "open source", "free" and "source-available" hit in that repo's README and site sources.
- Record the command and each mismatch with file:line.
Out of scope: how a licence change is announced (release-deprecation-breaking owns it).
The deliverable must decide: a mapping from licence class to the wording allowed; the check that compares the SPDX id with the claim words; whether "free" needs a qualifier (free of charge vs libre); and which evidence-record class (licence) fields apply.
