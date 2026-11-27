# Commission: marketing-voice-ai-authorship / voice-guide-encoding

Topic question: How does an agent write copy in a project's voice that readers do not reject as AI slop, and when must AI involvement be disclosed?

Question: How is a voice and tone guide encoded so an agent applies it (banned words with exceptions, preferred terms, error tone), and who owns which word list?
Starts from: brand-voice-assets.md #20-22; config-inventory.md (0 tone-of-voice guidance in the catalog; docs-style says "No sales pitch or marketing open"; the DOC-PLAIN-12 superlative list); messaging-inventory.md pattern 8 (grimoire headline surfaces use 0 of the 20-adjective list).
Investigate:
1. The Mailchimp, Atlassian and Monzo voice guides and the GOV.UK A to Z. Record their structure: principles, word lists, examples, exceptions.
2. Vale rule formats (existence, substitution, exceptions) via Context7, as an encoding target. docs-quality keeps Vale at tier 1, optional; no marketing rule may rest on Vale alone.
3. docs-quality DOC-PLAIN-12 and the fleet docs-style files, to draw the line between the docs register and the marketing register.
Measure, not cite:
- Run skills/docs-quality-reference/checks/prose.py over the fleet README and landing source files.
- Classify the findings that fall on marketing surfaces against those on docs pages.
- Record the command.
The deliverable must decide: the encoding (a word table with exceptions in the reference skill, checkable by a tier-0 script); how docs-style's "no marketing open" coexists with pitch-page copy, using the scoping key from page-surface-scope; and which list docs-quality keeps.
