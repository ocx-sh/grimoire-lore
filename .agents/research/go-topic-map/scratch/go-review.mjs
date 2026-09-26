export const meta = {
  name: 'go-review',
  description: 'Go research program phase 8: opus content reviewers apply the validation reference (notes compliance, contradiction sweep, verification honesty against planted fixtures with the real Go toolchain, era check, portability) and skill trigger evals to the drafted Go set; findings only, no edits',
  phases: [{ title: 'Review', detail: 'one opus reviewer per artifact set', model: 'opus' }],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/go'
const RESEARCH = ROOT + '/.agents/research'
const RUN = '/home/mherwig/.cache/research-lang/go-tools/run.sh'
const FIX = '/home/mherwig/.cache/research-lang/go-tools/fixtures'

const SETS = [
  { label: 'quality-a', kind: 'rule',
    files: [ROOT + '/rules/go-quality.md', ROOT + '/rules/go-quality/language.md', ROOT + '/rules/go-quality/errors.md', ROOT + '/rules/go-quality/concurrency.md'],
    sources: ['go-language.md', 'go-errors.md', 'go-concurrency.md', 'go-gates.md'] },
  { label: 'quality-b', kind: 'rule',
    files: [ROOT + '/rules/go-quality/api-design.md', ROOT + '/rules/go-quality/testing.md', ROOT + '/rules/go-quality/cli-contract.md'],
    sources: ['go-api.md', 'go-testing.md', 'go-cli.md'] },
  { label: 'quality-c', kind: 'rule',
    files: [ROOT + '/rules/go-quality/io.md', ROOT + '/rules/go-quality/network.md', ROOT + '/rules/go-quality/security.md', ROOT + '/rules/go-quality/observability.md'],
    sources: ['go-io.md', 'go-network.md', 'go-security.md', 'go-observability.md'] },
  { label: 'modules', kind: 'rule',
    files: [ROOT + '/rules/go-modules.md', ROOT + '/rules/go-modules/gates.md', ROOT + '/rules/go-modules/release.md', ROOT + '/rules/go-modules/golangci/ (every file; run golangci-lint config verify on each)'],
    sources: ['go-modules.md', 'go-gates.md', 'go-release.md'] },
  { label: 'skills', kind: 'skill',
    files: [ROOT + '/skills/go-release/ (SKILL.md and references/)', ROOT + '/skills/go-upgrade/ (SKILL.md and references/)', ROOT + '/skills/go-diagnose/ (SKILL.md and references/)'],
    sources: ['go-release.md', 'go-modules.md', 'go-language.md', 'go-observability.md', 'go-gates.md'] },
  { label: 'bazel-go', kind: 'rule',
    files: [ROOT + '/rules/bazel-quality/go.md', ROOT + '/rules/bazel-quality.md (only the Go routing row, keywords and Siblings edits; diff it with git diff -- rules/bazel-quality.md)'],
    sources: ['go-bazel.md'] },
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
    unresolved_ids: { type: 'array', items: { type: 'string' }, description: 'rule IDs cited in the set that no table in the repository defines' },
    trigger_evals: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['skill', 'should_trigger', 'should_not_trigger', 'weakness'], properties: { skill: { type: 'string' }, should_trigger: { type: 'array', items: { type: 'string' } }, should_not_trigger: { type: 'string' }, weakness: { type: 'string' } } }, description: 'empty for rule sets' },
    verdict: { type: 'string', enum: ['ship', 'fix-then-ship', 'redraft-file'] },
  },
}

function review(set) {
  return agent(`Model rationale: opus — content review of text that becomes an enforced rule; a wrong MUST or a verification that cannot go red propagates into every future diff.

PROJECT CONTEXT (context for you, not content to reproduce):
- You are a reviewer in phase 8 (Validate) of the research-lang program for Go, run from ${ROOT} (a git worktree; treat it as the repository root; never cd to /home/mherwig/dev/grimoire-lore). The drafted artifacts ship through the lore catalog to coding agents that load them without a human in the loop. You find defects; you do not fix them, and you never edit a file under ${ROOT}. Your only writes are planted fixtures under ${FIX}/review-${set.label}/ (create it).
- A REAL TOOLCHAIN: '${RUN} <cmd>' runs Go 1.27.1 with staticcheck, golangci-lint v2.14.0, govulncheck, gofumpt, goimports, deadcode and modernize. Use it to run verifications against planted fixtures.
- READ FIRST, in this order and in full: ${ROOT}/.claude/skills/research-lang/references/validation.md (Content Review is your checklist); ${ROOT}/.claude/skills/research-lang/references/rule-distillation.md; ${RESEARCH}/go-topic-map.md sections "## Authoring notes (binding on the drafters)" and every "Cross-consolidation contradictions" list inside the "Wave N landed" sections (the latest wave wins). These are the decisions the drafters were bound by: a drafted file that departs from them is a notes-violation, and one that follows them is not a finding even if you would have decided otherwise.
- THE SET UNDER REVIEW (read every file in full): ${set.files.join(' ; ')}
- THE CONSOLIDATIONS the set was drafted from (read in full; they are the admissible evidence for a fact check; do not use your memory of versions): ${set.sources.map(s => RESEARCH + '/' + s).join(', ')}
- House shape: ${ROOT}/rules/java-quality.md and ${ROOT}/rules/java-quality/concurrency.md${set.kind === 'skill' ? ', and ' + ROOT + '/skills/jvm-release/SKILL.md for a skill' : ''}.

DO SIX THINGS AND RETURN STRUCTURED FINDINGS.
1. Notes compliance: every glob, pinned default, version pin, dropped or retired ID, bounded-duplication rule, index-owned GO-CORE or GO-MOD family is applied, or its departure is a finding. Every rule ID row matches the consolidation's ID and meaning; an ID the consolidation does not have is an unsupported-claim.
2. Contradiction sweep: within the set and against the resolutions in the contradiction lists. Two rows answering one question differently is a blocker.
3. Verification honesty: pick at least five rule rows across different files whose verification is a runnable command (a grep, a go command, an analyzer, a golangci config), plant a minimal violating Go fixture and a minimal compliant twin under ${FIX}/review-${set.label}/, run the command EXACTLY as written against each (from the fixture dir, through ${RUN} for go tools), and record whether it went red on the violation and green on the twin, and whether the cell's statement of what empty output means is true. A verification that cannot go red is a blocker. Read every other verification cell for shape: explicit directory operand with -r, one -e per alternative, quoted --include globs, no unquoted **, no $(...), no placeholder inside quotes, xargs -r, no unescaped pipe inside a table cell, an explicit empty-output clause. Report shape defects as fix.
4. Fact and era check: sample at least eight version-specific claims (a Go version floor, an analyzer or linter name, a flag, an API name, a date) and confirm each against the consolidation text; an unsupported or misquoted one is a blocker in a MUST row and a fix otherwise. A version-specific row without its version is era-unlabelled. Go snippets must compile where they claim to: paste one or two into a fixture and run ${RUN} go vet on it.
5. Portability and style: fleet paths (/home/...), .agents/research links, repo@sha citations, OCX internals not marked as a pinned default; em dashes or semicolons in prose (code and tables excepted); missing Contents line over 100 lines; index over 200 lines or a depth file over 300; a depth file linking to another depth file; a hoisted non-negotiable whose ID does not exist in a depth table. Apply the deletion test to any index in the set: name up to five lines whose removal would cause no mistake.
6. ${set.kind === 'skill' ? 'Trigger evals per validation.md: for each skill write three should-trigger utterances a real user would type (not the description read back) and one should-not-trigger neighbour, judge the description against them, and name the weakness if any. Check each skill duplicates the MUST rows it enforces in a | # | Finding | Rule | table with the ID last, never as an ID-first row, and list every cited rule ID that no rule table under ' + ROOT + '/rules defines.' : 'Trigger evals do not apply; return an empty list. Instead confirm each glob in any index frontmatter against the notes (N-1), and flag a glob that would miss a file the rule instructs the reader to create. List every cited rule ID that no rule table under ' + ROOT + '/rules defines.'}

Every finding names file and line, a severity (blocker: wrong or unenforceable rule; fix: defect a mechanical fixer can apply from your fix text; nit: style), a kind, and the exact fix text. Do not pad: a clean file with zero findings is a valid result. Verdict: ship, fix-then-ship, or redraft-file.`,
    { label: 'review:' + set.label, phase: 'Review', model: 'opus', effort: 'high', schema: SCHEMA })
}

phase('Review')
const results = await parallel(SETS.map(s => () => review(s)))
const all = results.filter(Boolean)
const findings = all.flatMap(r => r.findings.map(f => ({ set: r.set, ...f })))
const bySev = sev => findings.filter(f => f.severity === sev).length
log('Review done: ' + all.length + '/' + SETS.length + ' sets · blockers ' + bySev('blocker') + ' · fixes ' + bySev('fix') + ' · nits ' + bySev('nit') + ' · verdicts ' + all.map(r => r.verdict).join(','))
return { results: all, findings }
