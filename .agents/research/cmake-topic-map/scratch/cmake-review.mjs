export const meta = {
  name: 'cmake-review',
  description: 'CMake research program phase 8: opus content reviewers apply the validation reference (notes compliance, contradiction sweep, verification honesty against planted fixtures on real CMake binaries, era check, portability) and skill trigger evals to the drafted cmake-build, cpp-packaging and skills; findings only, no edits',
  phases: [{ title: 'Review', detail: 'one opus reviewer per artifact slice', model: 'opus' }],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/java'
const RESEARCH = ROOT + '/.agents/research'
const SCRATCH = '/home/mherwig/.cache/cmake-measure-scratch/review'

const SETS = [
  {
    label: 'cmake-build-a',
    kind: 'rule',
    files: [ROOT + '/rules/cmake-build.md (the index)', ROOT + '/rules/cmake-build/versions-and-policies.md', ROOT + '/rules/cmake-build/language.md', ROOT + '/rules/cmake-build/module-authoring.md', ROOT + '/rules/cmake-build/testing.md', ROOT + '/rules/cmake-build/presets-and-ci.md'],
    sources: ['cmake-versions-and-gate.md', 'cmake-language.md', 'cmake-module-authoring.md', 'cmake-testing-and-ci.md'],
    extra: [ROOT + '/rules/cmake-build/*.md (the other depth files, to resolve cited IDs only)', ROOT + '/rules/gradle-build.md as the house index shape'],
  },
  {
    label: 'cmake-build-b',
    kind: 'rule',
    files: [ROOT + '/rules/cmake-build/targets.md', ROOT + '/rules/cmake-build/install-and-export.md', ROOT + '/rules/cmake-build/dependencies.md', ROOT + '/rules/cmake-build/toolchains-and-providers.md', ROOT + '/rules/cmake-build/bazel-seam.md'],
    sources: ['cmake-targets-and-abi.md', 'cmake-consumable-library.md', 'cmake-dependency-seam.md', 'cmake-skills.md', 'cmake-bazel-seam.md'],
    extra: [ROOT + '/rules/cmake-build.md (the index that routes here)', ROOT + '/rules/bazel-quality/cpp.md (read only; the BZL-CC rows bazel-seam.md must cite, never restate)'],
  },
  {
    label: 'cpp-packaging',
    kind: 'rule',
    files: [ROOT + '/rules/cpp-packaging.md (the index)', ROOT + '/rules/cpp-packaging/conan.md', ROOT + '/rules/cpp-packaging/vcpkg.md'],
    sources: ['cmake-package-managers.md', 'cmake-dependency-seam.md', 'cmake-consumable-library.md'],
    extra: [ROOT + '/rules/cmake-build.md and ' + ROOT + '/rules/cmake-build/*.md to resolve cited CMK IDs', ROOT + '/rules/typescript-packaging.md as the house manifest-rule shape'],
  },
  {
    label: 'skills',
    kind: 'skill',
    files: [ROOT + '/skills/cmake-dependency-triage/ (SKILL.md and every references/*.md)', ROOT + '/skills/cmake-modernize/ (SKILL.md and every references/*.md)'],
    sources: ['cmake-skills.md', 'cmake-dependency-seam.md', 'cmake-targets-and-abi.md', 'cmake-consumable-library.md', 'cmake-language.md'],
    extra: [ROOT + '/skills/jvm-dependency-triage/SKILL.md and ' + ROOT + '/skills/bazel-adopt/SKILL.md as the house skill shape', ROOT + '/rules/cmake-build/*.md and ' + ROOT + '/rules/cpp-packaging/*.md to resolve every cited rule ID'],
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
    unresolved_ids: { type: 'array', items: { type: 'string' }, description: 'rule IDs cited in the set that no table in the repository defines' },
    trigger_evals: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['skill', 'should_trigger', 'should_not_trigger', 'weakness'], properties: { skill: { type: 'string' }, should_trigger: { type: 'array', items: { type: 'string' } }, should_not_trigger: { type: 'string' }, weakness: { type: 'string' } } }, description: 'empty for rule sets' },
    verdict: { type: 'string', enum: ['ship', 'fix-then-ship', 'redraft-file'] },
  },
}

function review(set) {
  return agent(`Model rationale: opus — content review of text that becomes an enforced rule; a wrong MUST or a verification that cannot go red propagates into every future diff.

PROJECT CONTEXT (context for you, not content to reproduce):
- You are a reviewer in phase 8 (Validate) of the research-lang program for CMake and C++ package management, run from ${ROOT} (a git worktree; treat it as the repository root). The drafted artifacts ship through the lore catalog to coding agents that load them without a human in the loop. You find defects; you do not fix them, and you never edit a file under ${ROOT}. Your only writes are planted fixtures under ${SCRATCH}/${set.label}/ (on disk; never /tmp).
- READ FIRST, in this order and in full: ${ROOT}/.claude/skills/research-lang/references/validation.md (Content Review is your checklist); ${ROOT}/.claude/skills/research-lang/references/rule-distillation.md; ${RESEARCH}/cmake-topic-map.md section "## Authoring notes (binding on the drafters)" and every "Cross-consolidation contradictions" list in the "Wave N landed" sections — the decisions the drafters were bound by. A drafted file that departs from them is a notes-violation finding; one that follows them is not a finding even if you would have decided otherwise.
- THE SET UNDER REVIEW (read every file in full): ${set.files.join(' ; ')}
- THE CONSOLIDATIONS the set was drafted from, with their verification ledgers under the matching cmake-<group>/ directories (read in full; they and your own measurements are the only admissible evidence for a fact check — do not rely on memory of versions): ${set.sources.map(s => RESEARCH + '/' + s).join(', ')}
- ALSO READ: ${set.extra.join(' ; ')}
- MEASUREMENT: real CMake 3.31.12, 4.3.4 and 4.4.2 run on this host via 'ocx package exec kitware/cmake:<3.31|4.3|4.4> -- cmake' (run from ${ROOT}); ninja via 'ocx package exec ninja-build/ninja -- ninja'; gcc for C; /home/mherwig/.cache/cmake-measure-scratch/zig-cxx-wrapper.sh as a C++ compiler. No network: fetched dependencies come from a local file:// git repo you create. Delete build trees when done.

DO SIX THINGS AND RETURN STRUCTURED FINDINGS.
1. Notes compliance: every glob, pinned decision (floor 3.25...4.4, gate spelling per CMake line, gersemi SHOULD, CPS stance, provider stance, CMAKE_POLICY_VERSION_MINIMUM value, LANG-04 migration clause), dropped or citation-only ID, bounded-duplication row and portability rule is either applied or its departure is a finding. Every rule row cites the consolidation ID verbatim; an ID the consolidation does not have is an unsupported-claim; a reserved ID (CONAN-19, VCPKG-19, VCPKG-20, PKG-05..07) that appears is a blocker.
2. Contradiction sweep: within the set (index versus depth, depth versus depth) and against the resolutions in the Cross-consolidation contradictions lists. Two rows answering one question differently is a blocker.
3. Verification honesty: pick at least SIX rule rows across different files whose verification is a shell command or a cmake configure, and at least four of them MUST rows. Plant a minimal violating fixture and a minimal compliant fixture under ${SCRATCH}/${set.label}/, run the command EXACTLY as written against each (on the CMake line the row names), and record whether it went red on the violation, green on the compliant one, and whether the cell's statement of what empty output means is true. A verification that cannot go red is a blocker. Also read every other verification cell for shape: a directory operand with -r, --include globs quoted, one -e per alternative, no \\| in a pattern, no unescaped | in a table cell, no <placeholder> inside quotes, no $(...) operands, xargs -r, an explicit empty-output clause; report shape defects as fix. Run python3 ${ROOT}/.claude/skills/research-lang/scripts/check-artifacts.py on the set and report anything it flags.
4. Fact and era check: sample at least ten version-specific or date-specific claims (a CMake version floor, a policy number, a Conan or vcpkg version, a variable name, a date) and confirm each against the consolidation text or by running it; an unsupported or misquoted one is a blocker in a MUST row and a fix otherwise. Any version-specific row without a floor and a dated verification is era-unlabelled.
5. Portability and style: fleet paths, owner__repo directory names, OCX names (ocx, find_ocx, ocx-sh, ocx.lock), repo@sha citations in shipped text; em dashes or semicolons in prose (code and tables excepted); missing Contents line on a file over 100 lines; an index over 200 lines, a depth file over 300 or a SKILL.md over 500; a depth file linking to another depth file; a hoisted non-negotiable whose ID does not exist in a depth table; an untagged fence; a cmake fence not in gersemi layout; a python fence that would fail ruff format; a json fence that is not valid JSON. Apply the deletion test to each index: name up to five lines whose removal would cause no mistake.
6. ${set.kind === 'skill' ? 'Trigger evals per validation.md: for each skill write three should-trigger utterances a real user would type (not the description read back) and one should-not-trigger neighbour, judge the description against them, and name the weakness if any. Check each skill ends with a | # | Finding | Rule | table repeating exactly the MUST rows authoring note 3.1 lists for it (triage 11 rows, modernize 12 rows), ID last, and list every cited rule ID no rule table in the repository defines. Run each procedure end to end once against a tiny planted project (a legacy CMakeLists.txt for modernize; a two-copies-of-one-dependency project for triage) and report any step that does not produce what the skill says it produces.' : 'Trigger evals do not apply to a rule set; return an empty list. Instead confirm each glob in the index frontmatter against authoring note 1 and flag a glob that would miss a file the rule instructs the reader to create, and check every residual-miss routing line note 1 requires is present.'}

Every finding names file and line, a severity (blocker: wrong or unenforceable rule; fix: defect a mechanical fixer can apply from your fix text; nit: style), a kind, and the exact fix text — the literal replacement, so a fixer applies it without re-deciding. Do not pad: a clean file with zero findings is a valid result. Verdict: ship, fix-then-ship, or redraft-file (name the file and why in a blocker).`,
    { label: 'review:' + set.label, phase: 'Review', model: 'opus', effort: 'high', schema: SCHEMA })
}

phase('Review')
const results = await parallel(SETS.map(s => () => review(s)))
const all = results.filter(Boolean)
const findings = all.flatMap(r => r.findings.map(f => ({ set: r.set, ...f })))
const bySev = sev => findings.filter(f => f.severity === sev).length
log('Review done: ' + all.length + '/' + SETS.length + ' sets · blockers ' + bySev('blocker') + ' · fixes ' + bySev('fix') + ' · nits ' + bySev('nit') + ' · verdicts ' + all.map(r => r.verdict).join(','))
return { results: all, findings }
