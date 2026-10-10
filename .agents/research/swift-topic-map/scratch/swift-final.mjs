export const meta = {
  name: 'swift-final-fix',
  description: 'Swift research program convergence: final fix wave for held-out round 4 findings and refused halves by file owner',
  phases: [{ title: 'Fix' }],
}

const WT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/swift'
const HO = '/home/mherwig/.cache/research-lang/heldout/swift'
const RUN = '/home/mherwig/.cache/research-lang/swift-tools/run.sh'
const SC = WT + '/.agents/research/swift-topic-map/scratch/'
const CHECK = 'python3 -I .claude/skills/research-lang/scripts/check-artifacts.py --root /home/mherwig/.cache/research-lang/exemplars/swift/apple__containerization --forbid /home/mherwig --forbid .agents/research --allow-absent \'**/.swiftformat\' --allow-absent \'**/.swiftlint.yml\' --allow-absent \'**/Package@swift-*.swift\' --allow-absent \'**/.swift-quality-depth-on-demand\' --allow-absent \'**/.swift-package-depth-on-demand\' rules/swift-quality.md rules/swift-package.md skills/swift-upgrade skills/swift-diagnose skills/swift-release'

const OWNERS = [
  { label: 'fix-q-core', files: 'rules/swift-quality.md, rules/swift-quality/checks/*, rules/swift-quality/language.md, rules/swift-quality/concurrency.md, rules/swift-quality/apple.md, rules/swift-quality/api-design.md' },
  { label: 'fix-q-rest', files: 'rules/swift-quality/errors.md, io.md, network.md, security.md, testing.md, cli-contract.md (all under rules/swift-quality/)' },
  { label: 'fix-pkg', files: 'rules/swift-package.md, rules/swift-package/manifest.md, gates.md, release.md' },
  { label: 'fix-skills', files: 'skills/swift-upgrade/**, skills/swift-diagnose/**, skills/swift-release/**, and bundles/bazel-essentials.toml (its description still says thirteen depth files and lists the old languages; docs/bazel-essentials.md now says 390 rules across fifteen depth files, so match it)' },
]

const FIX = {
  type: 'object',
  properties: {
    unit: { type: 'string' },
    applied: { type: 'array', items: { type: 'string' } },
    refused: { type: 'array', items: { type: 'string' } },
    checker_clean: { type: 'boolean' },
  },
  required: ['unit', 'applied', 'refused', 'checker_clean'],
}

phase('Fix')
const fixes = await parallel(OWNERS.map(o => () => agent(
  'Model rationale: implementation edits to a decided finding list, sonnet default per routing policy.\n\n' +
  'Worktree ' + WT + ' holds a Swift lore set. Held-out round 3 on fresh trees produced the findings in ' + SC + 'heldout4-findings.json: key round2 (12 items with file, rule_id, evidence and a proposed fix; trees under ' + HO + ') and key refused_halves (cross-file halves the previous fixers could not apply because the file was not theirs; apply every one that lands in your files). Skill bodies must stay at or under 500 lines. ' +
  'You own ONLY these files: ' + o.files + '. Other fixers edit the other files in parallel; never touch a file outside your list. A finding that spans files: apply your half and say in refused what the other half needs.\n\n' +
  'For every finding that lands in your files: reproduce it first on the named tree (toolchain wrapper ' + RUN + ' runs commands inside swift:6.4; cwd must be under ' + HO + ' or the worktree), then fix it, then watch the changed command red on a plant and green on a twin and on the tree that raised it. Prefer the smallest change that makes the rule say the true thing. Round 4 opened no new class; these are known-class instances and earlier refused halves. Where a refused half says no measured defect, leave it.\n\n' +
  'Contracts: rule IDs are stable, never renumber or delete an ID (reword in place, or mark superseded); keep each index file body at or under 200 lines (frontmatter excluded); verification commands use directory operands, -e alternatives, xargs -r, no placeholders in angle brackets; no home paths. Date any new measurement 2026-10-10. Then run from the worktree root: ' + CHECK + ' and fix until it prints clean. Do not commit.',
  { label: o.label, phase: 'Fix', schema: FIX, model: 'sonnet', effort: 'high' },
)))

return { fixes: fixes.filter(Boolean) }
