export const meta = {
  name: 'jvm-review-a',
  description: 'JVM research program phase 8: opus content reviewers apply the validation reference (deletion test, contradiction sweep, verification honesty against planted fixtures, era check, portability) and skill trigger evals to the drafted java-quality, maven-build, skills and Bazel-Java handoff; findings only, no edits',
  phases: [{ title: 'Review', detail: 'one opus reviewer per artifact set', model: 'opus' }],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake'
const RESEARCH = `${ROOT}/.agents/research`
const MAIN = '/home/mherwig/dev/grimoire-lore'
const SCRATCH = '/tmp/claude-1000/-home-mherwig-dev-grimoire-lore--agents-worktrees-cmake/0338694a-012b-46c4-935e-41953f5c1ce2/scratchpad/review-a'

const SETS = [
  {
    label: 'java-quality',
    kind: 'rule',
    files: [`${ROOT}/rules/java-quality.md`, `${ROOT}/rules/java-quality/*.md (all ten files, read each in full)`],
    sources: ['jvm-language-api.md', 'jvm-concurrency.md', 'jvm-quality-gates.md', 'jvm-java-runtime-safety.md', 'jvm-platform-and-toolchains.md'],
    extra: [`${ROOT}/rules/typescript-quality.md and ${ROOT}/rules/typescript-quality/async.md as the house shape`],
  },
  {
    label: 'maven-build-and-bazel-handoff',
    kind: 'rule',
    files: [`${ROOT}/rules/maven-build.md`, `${ROOT}/rules/maven-build/*.md (all four)`, `${RESEARCH}/handoff/bazel-quality-java.md`, `${RESEARCH}/handoff/bazel-quality-index-row.md`],
    sources: ['jvm-maven-and-ant.md', 'jvm-bazel-java.md', 'jvm-publishing.md', 'jvm-dependencies.md'],
    extra: [`${MAIN}/rules/bazel-quality.md and ${MAIN}/rules/bazel-quality/rust.md as the shipped sibling contract the handoff must match exactly (read only, never edit anything under ${MAIN})`],
  },
  {
    label: 'skills',
    kind: 'skill',
    files: [`${ROOT}/skills/jvm-release/SKILL.md`, `${ROOT}/skills/jvm-dependency-triage/SKILL.md`],
    sources: ['jvm-publishing.md', 'jvm-dependencies.md', 'jvm-distribution.md'],
    extra: [`${ROOT}/skills/docs-instrument/SKILL.md as the house skill shape`, `${ROOT}/rules/java-quality/*.md and ${ROOT}/rules/maven-build/*.md to resolve the rule IDs the skills cite (GRADLE-* and KT-* IDs are drafted by a later batch: list them as unresolved-yet, do not flag them as missing)`],
  },
]

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['set', 'files_read', 'findings', 'verifications_exercised', 'unresolved_ids', 'trigger_evals', 'verdict'],
  properties: {
    set: { type: 'string' },
    files_read: { type: 'array', items: { type: 'string' } },
    findings: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['file', 'line', 'severity', 'kind', 'finding', 'fix'],
        properties: {
          file: { type: 'string' }, line: { type: 'number' },
          severity: { type: 'string', enum: ['blocker', 'fix', 'nit'] },
          kind: { type: 'string', enum: ['contradiction', 'verification-dishonest', 'unsupported-claim', 'era-unlabelled', 'notes-violation', 'portability', 'duplication', 'budget', 'style', 'deletion-candidate', 'trigger'] },
          finding: { type: 'string' }, fix: { type: 'string', description: 'the exact replacement text or the exact edit, so a mechanical fixer can apply it without re-deciding' },
        },
      },
    },
    verifications_exercised: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'went_red', 'went_green', 'note'], properties: { id: { type: 'string' }, went_red: { type: 'boolean' }, went_green: { type: 'boolean' }, note: { type: 'string' } } } },
    unresolved_ids: { type: 'array', items: { type: 'string' }, description: 'rule IDs cited in the set that no table in the repository defines yet' },
    trigger_evals: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['skill', 'should_trigger', 'should_not_trigger', 'weakness'], properties: { skill: { type: 'string' }, should_trigger: { type: 'array', items: { type: 'string' } }, should_not_trigger: { type: 'string' }, weakness: { type: 'string' } } }, description: 'empty for rule sets' },
    verdict: { type: 'string', enum: ['ship', 'fix-then-ship', 'redraft-file'] },
  },
}

function review(set) {
  return agent(`Model rationale: opus — content review of text that becomes an enforced rule; a wrong MUST or a verification that cannot go red propagates into every future diff.

PROJECT CONTEXT (context for you, not content to reproduce):
- You are a reviewer in phase 8 (Validate) of the research-lang program for the JVM ecosystem, run from ${ROOT} (a git worktree; treat it as the repository root; never cd to ${MAIN}, read it only). The drafted artifacts ship through the lore catalog to coding agents that load them without a human in the loop. You find defects; you do not fix them, and you never edit a file under ${ROOT} or ${MAIN}. Your only writes are planted fixtures under ${SCRATCH}/${set.label}/ (create it).
- READ FIRST, in this order and in full: ${ROOT}/.claude/skills/research-lang/references/validation.md (the section Content Review is your checklist); ${ROOT}/.claude/skills/research-lang/references/rule-distillation.md; ${RESEARCH}/jvm-topic-map.md sections "## Authoring notes (binding on the drafters)" and "Cross-consolidation contradictions" (inside "Wave 3 landed") and "## Wave 4 landed" — these are the decisions the drafters were bound by, so a drafted file that departs from them is a notes-violation finding, and a drafted file that follows them is not a finding even if you would have decided otherwise.
- THE SET UNDER REVIEW (read every file in full): ${set.files.join(' ; ')}
- THE CONSOLIDATIONS the set was drafted from (read in full; they are the only admissible evidence for a fact check — do not use the web, do not use your memory of versions): ${set.sources.map(s => `${RESEARCH}/${s}`).join(', ')}
- ALSO READ: ${set.extra.join(' ; ')}

DO SIX THINGS AND RETURN STRUCTURED FINDINGS.
1. Notes compliance: every glob, pinned default, version floor, dropped ID, bounded-duplication row, index-owned CORE family and Kotlin-DSL convention in the notes is either applied or its departure is a finding. Every rule ID row cites the consolidation ID verbatim; an ID the consolidation does not have is an unsupported-claim.
2. Contradiction sweep: within the set (index versus depth, depth versus depth) and against the resolutions in "Cross-consolidation contradictions". Two rows answering one question differently is a blocker.
3. Verification honesty: pick at least four rule rows across different files whose verification is a shell command, plant a minimal violating fixture and a minimal compliant fixture under ${SCRATCH}/${set.label}/, run the command exactly as written against each, and record whether it went red on the violation and green on the compliant one, and whether the cell's statement of what empty output means is true. A verification that cannot go red is a blocker. Also read every other verification cell for shape: a directory operand with -r, one -e per alternative, no placeholder inside quotes, xargs -r, and an explicit empty-output clause; report shape defects as fix.
4. Fact and era check: sample at least eight version-specific or date-specific claims (a version number, a plugin ID, a flag name, a date) and confirm each against the consolidation text; an unsupported or misquoted one is a blocker if it sits in a MUST row and a fix otherwise. Any version-specific row without a version and a verified date is era-unlabelled.
5. Portability and style: fleet paths, hostnames, repo-at-sha citations, exemplar names used where the fact is not load-bearing; em dashes or semicolons in prose (code and tables excepted); missing Contents line on a file over 100 lines; index over 200 lines or a depth file over 300; a depth file linking to another depth file; a hoisted non-negotiable whose ID does not exist in a depth table. Apply the deletion test to the index: name up to five lines whose removal would cause no mistake.
6. ${set.kind === 'skill' ? 'Trigger evals per validation.md: for each skill write three should-trigger utterances a real user would type (not the description read back) and one should-not-trigger neighbour, judge the description against them, and name the weakness if any. Also check each skill duplicates the MUST rows it enforces in a | # | Finding | Rule | table with the ID last, never as an ID-first row, and list every cited rule ID that no rule table in the repository defines yet (GRADLE-* and KT-* are expected to be unresolved and are not findings).' : 'Trigger evals do not apply to a rule set; return an empty list. Instead confirm each glob in the index frontmatter against the notes and against the exemplar counts cited in the topic map, and flag a glob that would miss a file the rule instructs the reader to create.'}

Every finding names file and line, a severity (blocker: wrong or unenforceable rule; fix: defect a mechanical fixer can apply from your fix text; nit: style), a kind, and the exact fix text. Do not pad: a clean file with zero findings is a valid result. Verdict: ship, fix-then-ship, or redraft-file (name the file and why in a blocker).`,
    { label: `review:${set.label}`, phase: 'Review', model: 'opus', effort: 'high', schema: SCHEMA })
}

phase('Review')
const results = await parallel(SETS.map(s => () => review(s)))
const all = results.filter(Boolean)
const findings = all.flatMap(r => r.findings.map(f => ({ set: r.set, ...f })))
const bySev = sev => findings.filter(f => f.severity === sev).length
log(`Review done: ${all.length}/${SETS.length} sets · blockers ${bySev('blocker')} · fixes ${bySev('fix')} · nits ${bySev('nit')} · verdicts ${all.map(r => r.verdict).join(',')}`)
return { results: all, findings }
