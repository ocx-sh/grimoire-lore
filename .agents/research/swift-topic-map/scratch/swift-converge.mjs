export const meta = {
  name: 'swift-converge',
  description: 'Swift research program convergence: fix held-out round 1 findings by file owner, then held-out round 2 on five fresh trees',
  phases: [{ title: 'Fix' }, { title: 'Held-out 2' }],
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
  'Worktree ' + WT + ' holds a Swift lore set. A held-out review on fresh trees produced the findings in ' + SC + 'heldout1-findings.json (39 items, each with file, rule_id, evidence and a proposed fix; trees under ' + HO + '). ' +
  'You own ONLY these files: ' + o.files + '. Other fixers edit the other files in parallel; never touch a file outside your list. A finding that spans files: apply your half and say in refused what the other half needs.\n\n' +
  'For every finding that lands in your files: reproduce it first on the named tree (toolchain wrapper ' + RUN + ' runs commands inside swift:6.4; cwd must be under ' + HO + ' or the worktree), then fix it, then watch the changed command red on a plant and green on a twin and on the tree that raised it. Prefer the smallest change that makes the rule say the true thing. Three findings opened NEW classes; give them general fixes, not tree-specific ones: (a) symlinked Sources (find lists symlinks, grep -r skips them) so canary.sh and every grep cell with a Sources operand must agree (use grep -R or find -L consistently and plant a symlinked Sources in canary watched-red); (b) a rule whose prescribed replacement API is unavailable at the tree floor must name the compliant shape for older floors; (c) a procedure step must establish its own preconditions (pin vs manifest floor, Xcode-select CI with no container image, tree already in mode 6).\n\n' +
  'Contracts: rule IDs are stable, never renumber or delete an ID (reword in place, or mark superseded); keep each index file body at or under 200 lines (frontmatter excluded); verification commands use directory operands, -e alternatives, xargs -r, no placeholders in angle brackets; no home paths. Date any new measurement 2026-10-10. Then run from the worktree root: ' + CHECK + ' and fix until it prints clean. Do not commit.',
  { label: o.label, phase: 'Fix', schema: FIX, model: 'sonnet', effort: 'high' },
)))

const SCHEMA = {
  type: 'object',
  properties: {
    group: { type: 'string' },
    trees_done: { type: 'array', items: { type: 'string' } },
    cells_run: { type: 'number' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          rule_id: { type: 'string' },
          known_class: { type: 'string', description: 'number from review-classes.md, or one of the three round-1 NEW class names, or NEW' },
          new_class: { type: 'string' },
          new_must: { type: 'boolean' },
          severity: { type: 'string', enum: ['blocker', 'fix', 'nit'] },
          evidence: { type: 'string' },
          fix: { type: 'string' },
        },
        required: ['file', 'rule_id', 'known_class', 'severity', 'evidence', 'fix'],
      },
    },
  },
  required: ['group', 'trees_done', 'cells_run', 'findings'],
}

const GROUPS = [
  { label: 'ho2-a', trees: ['stephencelis__SQLite.swift', 'SwiftGen__SwiftGen', 'swiftlang__swift-markdown'], focus: 'full swift-quality set (index, every depth file, every checks/ script) plus swift-package; run swift-upgrade as a dry-run on SQLite.swift and swift-release literally on SwiftGen in a scratch copy, stopping before any publish step.' },
  { label: 'ho2-b', trees: ['vapor__jwt-kit', 'swift-server__swift-prometheus'], focus: 'full swift-quality set plus swift-package all depth files; follow swift-diagnose literally on one planted crash, one planted hang and one planted data race in a scratch copy of swift-prometheus.' },
]

phase('Held-out 2')
const round2 = await parallel(GROUPS.map(g => () => agent(
  'Model rationale: verification pass over real trees, sonnet default per routing policy.\n\n' +
  'You are held-out round 2 of a research program that wrote a Swift lore set in the worktree ' + WT + ' (rules/swift-quality.md and rules/swift-quality/, rules/swift-package.md and rules/swift-package/, skills/swift-upgrade, skills/swift-diagnose, skills/swift-release). ' +
  'Known failure classes: ' + SC + 'review-classes.md, plus three from round 1: symlinked Sources blind spot; replacement API unavailable at the tree floor; procedure step assumes preconditions it never establishes. Round 1 findings, now fixed: ' + SC + 'heldout1-findings.json. Read both first.\n\n' +
  'Your trees, never seen by the set authors: ' + g.trees.map(t => HO + '/' + t).join(', ') + '. Read-only; copy into ' + HO + '/scratch-' + g.label + ' for plants or builds. Toolchain: ' + RUN + ' runs commands inside swift:6.4 (SWIFT_VERSION=6.3 for the older leg); cwd must be under ' + HO + ' or the worktree. SourceKit SwiftLint image: ghcr.io/realm/swiftlint:0.65.1.\n\n' +
  'Focus: ' + g.focus + '\n\n' +
  'Run every verification cell and script as written on each tree, decide each hit true or false by reading the code, read exit codes against what the row says. Report only failures of the SET, each mapped to a known class or marked NEW with a general class name; mark new_must only for a real merge-blocking defect class in a tree that no rule covers. Do not edit the worktree.',
  { label: g.label, phase: 'Held-out 2', schema: SCHEMA, model: 'sonnet', effort: 'high' },
)))

return { fixes: fixes.filter(Boolean), round2: round2.filter(Boolean) }
