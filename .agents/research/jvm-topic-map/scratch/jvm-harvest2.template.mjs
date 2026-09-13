export const meta = {
  name: 'jvm-wave3-harvest-and-convergence',
  description: 'JVM research program phase 6 after wave 3: one opus agent harvests the seven new consolidations, checks the stop condition, and either commissions a small wave 4 or declares the corpus ready to draft with authoring notes binding on the drafters',
  phases: [{ title: 'Converge', detail: 'harvest wave 3, apply the stop condition, write the authoring notes or the wave-4 commissions', model: 'opus' }],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake'
const RESEARCH = `${ROOT}/.agents/research`
const DATE = '__DATE__'
const WAVE3_RECEIPT = __WAVE3_RECEIPT__

const SELECTION_ITEM = {
  type: 'object',
  properties: {
    group: { type: 'string' }, group_label: { type: 'string' }, id_family: { type: 'string' },
    slug: { type: 'string' }, label: { type: 'string' }, brief: { type: 'string' },
  },
  required: ['group', 'group_label', 'id_family', 'slug', 'label', 'brief'],
}

const SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    verdict: { type: 'string', enum: ['ready-to-draft', 'needs-another-round'] },
    verdict_reason: { type: 'string' },
    wave4: { type: 'array', items: SELECTION_ITEM, description: 'empty when ready-to-draft; at most 6 dives otherwise, each justified by a load-bearing open question' },
    frame_corrections: { type: 'array', items: { type: 'string' } },
    rule_totals: { type: 'object', properties: { ids: { type: 'number' }, must: { type: 'number' }, families: { type: 'number' } }, required: ['ids', 'must', 'families'] },
    contradictions_across_consolidations: { type: 'array', items: { type: 'string' }, description: 'rule pairs across the 13 consolidations that conflict, with the resolution the drafters must apply' },
    authoring_notes: { type: 'array', items: { type: 'string' }, description: 'binding instructions for the phase-7 drafters, one per line' },
    owner_decisions_outstanding: { type: 'array', items: { type: 'string' } },
  },
  required: ['path', 'verdict', 'verdict_reason', 'wave4', 'frame_corrections', 'rule_totals', 'contradictions_across_consolidations', 'authoring_notes', 'owner_decisions_outstanding'],
}

phase('Converge')
const r = await agent(`Model rationale: opus — the convergence verdict, the cross-consolidation contradiction sweep and the authoring notes are decisions with a blast radius over every artifact the program ships.

PROJECT CONTEXT (context for you, not content to reproduce):
- You are phase 6 (Iterate) of the research-lang program for the JVM ecosystem after its third wave, run from ${ROOT} (a git worktree; never cd to /home/mherwig/dev/grimoire-lore, read it only). Thirteen consolidations now exist. Your job is to decide whether the research has converged, and to hand the authoring pass a corpus it can draft from without re-deriving anything.
- Read, in this order and in full: ${ROOT}/.claude/skills/research-lang/references/wave-plan.md (Convergence), ${ROOT}/.claude/skills/research-lang/references/rule-distillation.md (all of it — it is the drafters' contract and your notes must speak its language); ${RESEARCH}/jvm-frame.md (Corrections last); ${RESEARCH}/jvm-topic-map.md sections "Conflicts resolved", "Artifact set decision", "Wave 2 landed", "Questions for the owner"; then EVERY consolidation ${RESEARCH}/jvm-<group>.md — the six from wave 2 (gradle-core, gradle-plugin-dev, dependencies, distribution, quality-gates, language-api) and the seven from wave 3 (concurrency, gradle-settings, publishing, bazel-java, maven-and-ant, platform-and-toolchains, java-runtime-safety). Read each in full; the Verdict, ruleset, failure modes and Open questions sections are the material. Open dive files only where a consolidation cites a surprise you must judge.
- The house shape the drafters will follow: ${ROOT}/rules/typescript-quality.md (the index: gate, non-negotiables, rules the index owns, task-worded routing, severity, siblings) and ${ROOT}/rules/typescript-quality/async.md (a depth file: scope, one gate block per check, rule tables with a verification per row, what agents get wrong). For the Bazel-Java handoff, the shipped /home/mherwig/dev/grimoire-lore/rules/bazel-quality/rust.md is the per-language exemplar and /home/mherwig/dev/grimoire-lore/rules/bazel-quality.md the index it must be routed from.
- The checker the artifacts must pass: python3 ${ROOT}/.claude/skills/research-lang/scripts/check-artifacts.py --help (run it). Its known lints on verification cells: no bare shell-glob operands, one -e per grep alternative rather than \\| inside a pattern, no <angle-bracket> placeholders inside quoted patterns, no operands from $(git ls-files ...), no unquoted **, and any table row whose first cell is a rule ID is read as a rule definition.
- Owner decisions: none given; the map's defaults stand (Java-first SDK with a Kotlin-friendly API, JDK floor 17 / toolchain 25, Gradle floor 8.11, Kotlin DSL examples with two Groovy rows, own Maven rule with Ant as a depth file, Bazel-Java drafted here and offered to bazel-quality, 90 percent coverage floor Linux-only, one docs-quality row).

WAVE-3 RECEIPT (structured; the files are authoritative where they differ):
${JSON.stringify(WAVE3_RECEIPT, null, 1)}

DO THREE THINGS.

1. APPEND to ${RESEARCH}/jvm-topic-map.md (never rewrite earlier sections) a section "## Wave 3 landed (${DATE})" with: (a) per group: consolidation path, ID count, MUST count, conflicts resolved, follow-ups named; (b) "Surprises" with a verdict each (promote / fold / defer with M-ID / reject); (c) "Map rows affected"; (d) "Frame corrections"; (e) "Cross-consolidation contradictions" — read all thirteen rulesets against each other and list every pair that conflicts or overlaps (a GRADLE-DEP row and an MVN-DEP row answering the same question differently is fine if the difference is the build system; a JAVA-CONC row and a KT-CORO row that disagree about the same JVM fact is not; a quality-gates row and a platform row that set different JDK floors is not), each with the resolution the drafters must apply and which ID keeps the text; (f) "Convergence" — apply the wave-plan's stop condition honestly: new MUST rules and new failure modes in freshly opened families are expected and do not by themselves fail it; the clause that decides is whether any open question remaining across the thirteen files is load-bearing AND answerable by a source read. Classify every remaining open question as dated re-check / measurement the corpus cannot supply / owner decision / answerable-now. If any are answerable-now and load-bearing, the verdict is needs-another-round and wave 4 is exactly those (at most 6 dives, with full briefs). Otherwise ready-to-draft. (g) "Residue" — what the program deliberately leaves open, so nobody re-investigates it.

2. WRITE the authoring notes as a section "## Authoring notes (binding on the drafters)" in the same append: the decisions a drafter must not re-take — the four rules and their exact glob lists (re-check each glob against rule-distillation's cannot-miss bar using the exemplar counts in the audits and the wave-2/3 evidence; **/*.versions.toml versus **/gradle/libs.versions.toml is one such decision), the 27 depth files with the ID family each owns and the two or three consolidation sections each draws from, which rules are index-owned (the CORE families) versus depth-owned, the bounded-duplication list (the handful of MUST rows that appear in both java-quality and kotlin-quality, by ID), the pinned decisions and their defaults (JDK floor, Gradle floor, coverage floor, JUnit baseline, the gate of record per language), the rules to DROP at authoring time because the model already does them or they lack a verification (name IDs), the version-dating convention (every version-specific row names the version and the date it was verified), the Kotlin-DSL-only convention and its two Groovy exceptions, the verification-command shape rules above, the ruff-format constraint (fenced python blocks must be ruff-stable; Starlark or BUILD snippets are tagged starlark), the "what empty output means" clause for every verification cell, and the skills' scope (jvm-release, jvm-dependency-triage: procedures only; each duplicates the MUST rows it enforces in a | # | Finding | Rule | table, never as rule-ID-first rows). Also the Bazel-Java handoff shape: one file drafted at ${RESEARCH}/handoff/bazel-quality-java.md in the exact shape of the shipped rust.md, family BZL-JAVA, routing into the shipped sibling files by their shipped names (caching.md, flags.md, typescript.md, not the map's older working names), plus the one routing row to add to bazel-quality.md's "Where the Depth Is" table.

3. RETURN the structured receipt. rule_totals counts across all thirteen consolidations (IDs, MUST rows, distinct families). owner_decisions_outstanding lists what is still the owner's call, with the default the drafters will assume.

Rules: no claim without a source key, a path, or a rule ID; use read-only tools except for the one append to jvm-topic-map.md; do not launch anything; do not edit any consolidation — where two conflict, record the resolution in the append and name which ID's text the drafters keep.`,
  { label: 'converge:wave3', phase: 'Converge', model: 'opus', effort: 'high', schema: SCHEMA })

if (!r) { log('CONVERGE RETURNED NULL — read journal.jsonl'); return { harvest: null } }
log(`Verdict: ${r.verdict} · wave4 ${r.wave4.length} · IDs ${r.rule_totals.ids} · MUST ${r.rule_totals.must} · families ${r.rule_totals.families} · contradictions ${r.contradictions_across_consolidations.length} · notes ${r.authoring_notes.length}`)
return { harvest: r }
