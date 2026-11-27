# Commission: marketing-voice-ai-authorship / voice-ai-tells-baseline

Topic question: How does an agent write copy in a project's voice that readers do not reject as AI slop, and when must AI involvement be disclosed?

Question: Which observable style markers separate post-2023 agent-written copy from human-written copy of the same kind, at a false-positive rate low enough for a warning, given that detectors cannot gate?
Starts from: failure-corpus.md (an AI-authorship accusation in 66 of 100 popular 2026 Show HN threads, an upper bound; "AI slop" counts 385, 3,215 and 7,262 for 2024, 2025 and 2026 YTD); landing-conversion.md #35; brand-voice-assets.md #23-24; config-inventory.md smell 6 (2,378 grimoire and 670 ocx prose findings, warnings only).
Investigate:
1. Detector unreliability: arXiv 2303.11156 and 2304.02819, and any 2025-2026 follow-up on false positives for non-native writers.
2. Primary studies that publish LLM style markers with frequency data. Ignore blog lists that give no counts.
3. HN comments as reader-reported tells only. Use the failure-corpus.md method, and keep only comments that quote or describe the linked README or site copy. This is evidence about copy, not about the venue.
Measure, not cite (the core of this dive):
- Baseline corpus: clone into ~/.cache/research-lang/exemplars/product/ the 40 upstream repos from product-audit/exemplar-readmes.md. Extract each README at its last commit before 2022-11-30 and at HEAD. Exclude repos with no pre-2022 README.
- For each candidate marker (for example em-dash rate, "not X but Y", triads, the DOC-PLAIN-12 words), compute rate per 1,000 words in pre-2022 READMEs, HEAD READMEs and the 18 fleet READMEs.
- A marker qualifies only if its pre-2022 rate is low enough to bound false positives, and it is clearly higher in the fleet. State both thresholds before computing.
- Record every command.
Do not ship an "author-only fact per section" requirement as MUST or SHOULD. No named source tests it; it may appear only as CONSIDER, marked unverified: reading heuristic.
The deliverable must decide: the warning marker list with measured rates; the "never gate on a detector" rule; and which markers duplicate DOC-PLAIN rows and stay there.
