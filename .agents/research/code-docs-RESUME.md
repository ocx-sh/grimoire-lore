# code-docs — resume state (paused 2026-09-27 on owner request)

Done and committed: waves 1-3, map, 7 consolidations (revised), shipped checks,
eval harness, calibration, 331 of ~400 eval probes (core, pointer, history,
controls; results/main-extracted.json), and phase 7-8 authoring: rules/code-docs.md
+ 5 depth files, skills/code-docs-cleanup, amendments, wiring, 3-lens review
(49 findings: 14 blocker, 24 fix, 11 nit) and one fix pass (gate green).

Left, in order:
1. DONE: probes (401). Was: rerun `~/.cache/research-lang/code-docs-eval/main/run-main.sh`
   (skips finished cells; extra_b and oneline remain). Arms live in
   ~/.cache/research-lang/code-docs-eval/arms; rebuild with harness/build_arms.py
   if the cache was cleared.
2. DONE: judged, results in code-docs-eval/results.md. Was: judge_packets.py -> judge.mjs (opus a,b) -> merge_judged.py -> stats.py.
3. DONE: GRD-02, RTE-03 local line, LEN-05 no-truncation now MUST; GRD-04, GRD-08, CLN-06 stay SHOULD with evidence. Was: set eval-dependent severities (GRD-02, GRD-04, GRD-08, CLN-06, RTE-03 never-zero
   clause) from the arm verdicts; write code-docs-eval results report.
4. DONE (de0eb24): SRF-01 intra-doc ban scoped to raw-copy generators.
5. DONE: held-out rounds 1-3 on checks (6 fleet repos + openai/codex, simonw/llm) and one
   end-to-end skill run (bob, obere-heide-planer); all defects fixed (1ec2433, 9d889e4,
   350b088, 3c46756). task ci green with CONSUMER=../ocx TS_CONSUMER=/home/mherwig/dev.
6. DONE: skill confirmation run on kate-middlechild + ocx-mirror-sdk; its blocker (rules/** auto-load)
   fixed for code-docs, fix-level items fixed (26adf23, 038769b). Was: running
   (.agents/research/code-docs-heldout/cleanup-confirm.md). If it finds no new blocker,
   the program has converged; fix any fix-level items, then final report.
7. When the branch lands: delete ~/.cache/research-lang/{exemplars/code-docs,code-docs-eval,
   code-docs-heldout,code-docs-fix,code-docs-scratch}.
