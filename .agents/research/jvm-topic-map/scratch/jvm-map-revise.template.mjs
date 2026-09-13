export const meta = {
  name: 'jvm-wave2-harvest-and-wave3-briefs',
  description: 'JVM research program phase 6: one opus agent harvests the wave-2 consolidations (surprises, follow-ups, contradictions), appends the harvest to the topic map, and rewrites the staged wave-3 briefs against what wave 2 settled',
  phases: [{ title: 'Harvest', detail: 'read six consolidations, revise six staged briefs, commission wave 3', model: 'opus' }],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake'
const RESEARCH = `${ROOT}/.agents/research`
const DATE = '__DATE__'
const WAVE2_RECEIPT = __WAVE2_RECEIPT__
const WAVE3_STAGED = __WAVE3_STAGED__

const SELECTION_ITEM = {
  type: 'object',
  properties: {
    group: { type: 'string' },
    group_label: { type: 'string' },
    id_family: { type: 'string' },
    slug: { type: 'string' },
    label: { type: 'string' },
    brief: { type: 'string' },
  },
  required: ['group', 'group_label', 'id_family', 'slug', 'label', 'brief'],
}

const SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    wave3: { type: 'array', items: SELECTION_ITEM, description: 'the full wave-3 selection, revised briefs verbatim; at most 14 dives' },
    added_from_surprises: { type: 'array', items: { type: 'string' }, description: 'dives added or re-scoped because wave 2 surfaced them' },
    dropped: { type: 'array', items: { type: 'string' }, description: 'staged dives dropped or merged, with the reason' },
    frame_corrections: { type: 'array', items: { type: 'string' } },
    convergence: { type: 'string', description: 'one paragraph: did wave 2 add MUST rules and failure modes the map did not anticipate? what does that predict for wave 3 being the last?' },
  },
  required: ['path', 'wave3', 'added_from_surprises', 'dropped', 'frame_corrections', 'convergence'],
}

phase('Harvest')
const r = await agent(`Model rationale: opus — harvesting six consolidations into commissions and rewriting research briefs is a judgment task whose errors waste a whole wave of workers.

PROJECT CONTEXT (context for you, not content to reproduce):
- You are phase 6 (Iterate) of the research-lang program for the JVM ecosystem, run from ${ROOT} (a git worktree; never cd to /home/mherwig/dev/grimoire-lore, read it only). Wave 2 has landed. Your job: fold what it settled into the topic map, and turn the staged wave-3 briefs from guesses into commissions grounded in wave-2 results.
- Read, in this order and in full: ${ROOT}/.claude/skills/research-lang/references/wave-plan.md (Phase 3, Phase 6, Convergence); ${RESEARCH}/jvm-frame.md (Corrections first); ${RESEARCH}/jvm-topic-map.md sections "Conflicts resolved", "Artifact set decision", "Selected for wave 2", "Staged for wave 3", "Questions for the owner"; then EVERY wave-2 consolidation jvm-<group>.md for the groups gradle-core, gradle-plugin-dev, dependencies, distribution, quality-gates, language-api (list ${RESEARCH}/jvm-*.md; read each consolidation in full, especially its Verdict, Open questions and AI-agent failure modes). Skim the dive files under each jvm-<group>/ only where a consolidation cites a surprise.
- Owner decisions: none were given; the map's defaults stand (Java-first SDK with Kotlin-friendly API, JDK floor 17 / toolchain 25, Gradle floor 8.11, Kotlin DSL examples with two Groovy rows, Maven gets its own rule with Ant as a depth file, the Bazel-Java depth file is drafted here and OFFERED to bazel-quality, 90 percent coverage floor Linux-only, one docs-quality row).
- The sibling Bazel set has SHIPPED to main since the map was written: /home/mherwig/dev/grimoire-lore/rules/bazel-quality.md and rules/bazel-quality/{architecture,bzlmod,caching,ci,cpp,flags,hermeticity,python,rust,starlark,testing,typescript}.md. Read the index (147 lines) and the routing table, and skim rust.md as the per-language exemplar the java.md must mirror. The map's drafts cite older working names (caching-rbe.md, flags-and-versions.md, javascript-typescript.md); the wave-3 bazel-java briefs must route to the SHIPPED names and match the shipped per-language file's section shape and rule-row format.

WAVE-2 RECEIPT (structured; the files are authoritative where they differ):
${JSON.stringify(WAVE2_RECEIPT, null, 1)}

STAGED WAVE-3 BRIEFS (from the map; six are marked REVISE):
${JSON.stringify(WAVE3_STAGED, null, 1)}

DO TWO THINGS.

1. APPEND to ${RESEARCH}/jvm-topic-map.md (never rewrite earlier sections; M-IDs are stable) a section "## Wave 2 landed (${DATE})" with: (a) per group, the consolidation path, the MUST count, the conflicts it resolved and the follow-ups it named; (b) "Surprises" — every finding the dives flagged that the map did not anticipate, each with a verdict: promote to a wave-3 dive, fold into an existing wave-3 brief, defer with M-ID, or reject with a reason; (c) "Map rows affected" — M-IDs whose coverage changed from uncovered to covered, and any row whose priority the evidence moved; (d) "Frame corrections" — anything wave 2 overturned in the frame or in the map's own Conflicts resolved (say which conflict number); (e) "Convergence" — did wave 2 add MUST rules and failure modes the map did not anticipate? By the wave-plan's stop condition, what must wave 3 show for the program to converge, and what is the expected residue?

2. RETURN the wave-3 selection: at most 14 dives, each with the full brief (10-25 lines, a professional commission: what to investigate, which sources to fetch — reuse URLs the scouts and wave-2 dives already found — which flags/APIs/plugin ids/rule names/versions to pin down, what exemplar or wave-2 evidence to test against, what to DECIDE). Rewrite the six REVISE briefs against the wave-2 results they depend on (name the settled fact in the brief); keep the others unless a surprise changes them; add dives only for surprises whose consolidation said "deserves another round" AND that no wave-3 brief already covers; drop or merge a staged dive if wave 2 already answered it (say so). The two bazel-java briefs must instruct the worker to read the shipped rules/bazel-quality/rust.md and index and to produce findings in that file's shape. Keep the group slugs and families exactly as staged unless you state a reason.

Rules: no claim without a source key, a path, or a rule ID; version-tag every era-specific line; use read-only tools except for the one append to jvm-topic-map.md. Return the structured receipt with the briefs verbatim.`,
  { label: 'harvest:wave2→wave3', phase: 'Harvest', model: 'opus', effort: 'high', schema: SCHEMA })

if (!r) { log('HARVEST RETURNED NULL — read journal.jsonl'); return { harvest: null } }
log(`Wave 3 commissioned: ${r.wave3.length} dives · added ${r.added_from_surprises.length} · dropped ${r.dropped.length} · frame corrections ${r.frame_corrections.length}`)
return { harvest: r }
