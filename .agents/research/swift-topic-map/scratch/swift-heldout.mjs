export const meta = {
  name: 'swift-heldout',
  description: 'Swift research program convergence: held-out round over nine fresh trees, plus docs and publish entries',
  phases: [{ title: 'Held-out' }, { title: 'Docs' }],
}

const WT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/swift'
const HO = '/home/mherwig/.cache/research-lang/heldout/swift'
const RUN = '/home/mherwig/.cache/research-lang/swift-tools/run.sh'
const CLASSES = WT + '/.agents/research/swift-topic-map/scratch/review-classes.md'

const GROUPS = [
  { label: 'ho-libs', trees: ['onevcat__Kingfisher', 'ReactiveX__RxSwift', 'migueldeicaza__SwiftTerm'], focus: 'Apple-platform and legacy-era libraries: swift-quality index plus language, concurrency, api-design, testing, apple depth files; swift-package manifest and gates; swift-upgrade skill dry-run (read the ladder and state which rung each tree sits on and what the first step would be; do not edit the tree).' },
  { label: 'ho-server', trees: ['vapor__postgres-nio', 'soto-project__soto-core', 'apple__swift-certificates'], focus: 'Server and SDK libraries: swift-quality index plus concurrency, errors, io, network, security depth files; swift-package manifest, gates, release; swift-diagnose skill (plant one crash and one hang in a scratch copy and follow the skill literally).' },
  { label: 'ho-tools', trees: ['swiftlang__swift-docc', 'jpsim__Yams', 'yonaskolb__Mint'], focus: 'Tools, CLIs and C-wrapping libraries: swift-quality index plus cli-contract, io, language, testing depth files; swift-package all depth files; swift-release skill run literally on Mint (release build in a scratch copy, stop before any publish step).' },
]

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
          known_class: { type: 'string', description: 'number or text of the matching class in review-classes.md, or NEW' },
          new_class: { type: 'string', description: 'if NEW: a one-line class name general enough to group future hits' },
          new_must: { type: 'boolean', description: 'true only if a real defect in the tree is uncovered by any rule and is merge-blocking quality' },
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

phase('Held-out')
const heldout = parallel(GROUPS.map(g => () => agent(
  'Model rationale: verification pass over real trees, sonnet default per routing policy.\n\n' +
  'You are the held-out convergence round of a research program that wrote a Swift lore set. The set lives in the worktree ' + WT + ': rules/swift-quality.md with rules/swift-quality/*.md and rules/swift-quality/checks/, rules/swift-package.md with rules/swift-package/*.md, skills/swift-upgrade, skills/swift-diagnose, skills/swift-release. ' +
  'Phase 8 already reviewed it against a 40-repo corpus and grouped failures into the classes listed in ' + CLASSES + '. Read that file first.\n\n' +
  'Your trees are fresh, never seen by the set authors: ' + g.trees.map(t => HO + '/' + t).join(', ') + '. Treat them read-only; copy into a scratch dir under ' + HO + '/scratch-' + g.label + ' for any plant or build. ' +
  'Toolchain: ' + RUN + ' runs any command inside the swift:6.4 image (SWIFT_VERSION=6.3 for the older leg), mounts ' + HO + ' and the worktree; cwd must be under one of those. The SourceKit SwiftLint image is ghcr.io/realm/swiftlint:0.65.1.\n\n' +
  'Focus: ' + g.focus + '\n\n' +
  'Method: act as a coding agent that has the set loaded and is asked to review each tree. Run every verification cell and check script in your focus files on each tree, as written (copy-paste, no repair). For each hit decide true or false positive by reading the code; for each script read its exit code against what the row says. Also note any real, merge-blocking defect class in the tree that no rule covers (new_must). ' +
  'Report only failures of the SET (wrong advice, false positive, false negative, broken command, contradiction, stale version claim), not style nits about the trees. Map each to a known class number from the file or mark NEW with a general class name. Do not edit any file in the worktree. Be thorough: aim for 25 or more cells run per tree.',
  { label: g.label, phase: 'Held-out', schema: SCHEMA, model: 'sonnet', effort: 'high' },
)))

phase('Docs')
const docs = agent(
  'Model rationale: docs and mechanical config edits, sonnet default per routing policy.\n\n' +
  'Worktree ' + WT + ' (git repo grimoire-lore, a lore catalog). A Swift set was drafted: rules swift-quality and swift-package, skills swift-upgrade, swift-diagnose, swift-release, bundle bundles/swift-essentials.toml, logo assets/lore-swift.svg. Do two things, editing only the files named here.\n\n' +
  '1. publish.toml: append a Swift block after the Nix block, shaped exactly like the Nix block (a comment paragraph saying what the set is and how the two rules split by glob, then [rules.swift-quality], [rules.swift-package], [skills.swift-upgrade], [skills.swift-diagnose], [skills.swift-release], [bundles.swift-essentials], each version 0.1.0 with description = { readme = docs/NAME.md, logo = assets/lore-swift.svg }). Read the rules index frontmatter for the real globs.\n\n' +
  '2. Write docs/swift-quality.md, docs/swift-package.md, docs/swift-upgrade.md, docs/swift-diagnose.md, docs/swift-release.md, docs/swift-essentials.md. Match the house shape and voice by reading docs/nix-quality.md, docs/nix-essentials.md, docs/nix-diagnose.md, docs/go-quality.md, docs/go-release.md first (title, one-paragraph lead, grim add line, Loads on line, sections on what the set does differently and what agents get wrong by default, measured). Every number you write (index lines, non-negotiable count, depth file count, rule ID count, measured tool versions, dates) must come from a command you ran on the shipped files, not from memory: count IDs with grep over the files. Facts come from the shipped files themselves and from .agents/research/swift-topic-map.md Authoring notes; the research corpus was 40 upstream repos measured on Swift 6.4.0, 6.3.3 and 6.2 floor, dated 2026-10. No home paths, no .agents/research paths in shipped docs. Plain English: short sentences, no marketing words.\n\n' +
  '3. docs/bazel-essentials.md carries a stale count of the bazel-quality rules and depth files; correct it by counting rules/bazel-quality.md plus rules/bazel-quality/*.md IDs the same way docs/bazel-quality.md states them, and check git log -p on publish.toml for whether a readme-only change bumped a bundle patch version before (go-essentials went 0.1.0 to 0.1.1); follow that precedent for bazel-essentials if it applies.\n\n' +
  'Then run: python3 -I .claude/skills/research-lang/scripts/check-artifacts.py --forbid /home/mherwig --forbid .agents/research rules/swift-quality.md rules/swift-package.md skills/swift-upgrade skills/swift-diagnose skills/swift-release, and python3 rules/docs-quality/checks/prose.py over the six new docs pages if that script exists; fix your pages until clean. Do not commit. Return a short list of files written and the counts you measured.',
  { label: 'docs', phase: 'Docs', model: 'sonnet', effort: 'high' },
)

const [h, d] = await Promise.all([heldout, docs])
return { heldout: h.filter(Boolean), docs: d }
