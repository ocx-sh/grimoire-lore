export const meta = {
  name: 'go-docs',
  description: 'Go research program wiring: write the catalog description companions (docs/go-*.md) for the six Go packages and update docs/bazel-quality.md for its new Go depth file, every count measured by command',
  phases: [{ title: 'Docs', detail: 'one writer per companion page' }],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/go'
const RESEARCH = ROOT + '/.agents/research'

const PAGES = [
  { out: 'docs/go-quality.md', about: 'the go-quality rule: rules/go-quality.md (index) and every file under rules/go-quality/', model: 'docs/java-quality.md' },
  { out: 'docs/go-modules.md', about: 'the go-modules rule: rules/go-modules.md (index, which owns GO-MOD), rules/go-modules/gates.md, rules/go-modules/release.md and the three configs under rules/go-modules/golangci/', model: 'docs/gradle-build.md' },
  { out: 'docs/go-release.md', about: 'the go-release skill: skills/go-release/ (SKILL.md and references/)', model: 'docs/jvm-release.md' },
  { out: 'docs/go-upgrade.md', about: 'the go-upgrade skill: skills/go-upgrade/ (SKILL.md and references/)', model: 'docs/jvm-dependency-triage.md' },
  { out: 'docs/go-diagnose.md', about: 'the go-diagnose skill: skills/go-diagnose/SKILL.md', model: 'docs/bazel-diagnose.md' },
  { out: 'docs/go-essentials.md', about: 'the go-essentials bundle: bundles/go-essentials.toml and its five members (read each member index or SKILL.md)', model: 'docs/jvm-essentials.md' },
  { out: 'docs/bazel-quality.md', about: 'an UPDATE, not a rewrite: the published bazel-quality rule gained rules/bazel-quality/go.md (BZL-GO) in version 0.3.0. Edit only the sentences that count depth files or name the per-language files, add one short paragraph on the Go depth file in the house voice (what it owns, that it is framed for adopting Bazel for Go, that it cites the core BZL families rather than restating them), and name go-quality and go-modules where the page lists sibling sets. Re-measure every number you touch', model: 'docs/bazel-quality.md' },
]

const SCHEMA = { type: 'object', additionalProperties: false, required: ['path', 'lines', 'numbers'], properties: { path: { type: 'string' }, lines: { type: 'number' }, numbers: { type: 'array', items: { type: 'string' }, description: 'each number stated on the page with the command that measured it' } } }

phase('Docs')
const results = await parallel(PAGES.map(p => () => agent(`Model rationale: sonnet — a catalog description page written against a fixed house model from files already on disk; every number measured, no rule decisions.

PROJECT CONTEXT (context for you, not content to reproduce):
- You write one catalog description page for the lore catalog at ${ROOT} (a git worktree; treat it as the repository root). The page is what a person reads on the catalog before installing a package. It describes; it does not restate the rules.
- House model: read ${ROOT}/${p.model} in full and match its structure, register, length (within 20 percent) and voice: a one-paragraph intro, the grim add install block (ghcr.io/ocx-sh/lore/<name>), what it loads on or when to run it, two or three sections on the premise and what is distinctive, pinned decisions, what it does not cover, and Siblings. No marketing, no em dashes, no semicolons in prose.
- Subject: ${p.about}. Read every file of it in full. For the premise and the measured facts, the research consolidations under ${RESEARCH}/go-*.md and ${RESEARCH}/go-frame.md are the source (measured on a 35-repository upstream exemplar corpus with Go 1.27.1, golangci-lint v2.14.0 and staticcheck 2026.2.1 on 2026-09-26; the fleet itself has no Go). Name a measured fact only if a consolidation or the artifact states it.
- EVERY number on the page (line counts, rule counts, MUST counts, non-negotiable counts, depth-file counts, step counts, glob counts) is measured by a command you run now against the files on disk, e.g. wc -l, or grep -c -e '^| GO-ERR-' over a file, or grep -c -e '| MUST' for severity. Return each number with its command.
- No fleet paths, no /home paths, no .agents links on the page. Links to other catalog pages are by package name in backticks, not by URL.
- The only file you may create or modify is ${ROOT}/${p.out}.

Write ${ROOT}/${p.out}. Return the receipt.`, { label: 'docs:' + p.out, phase: 'Docs', model: 'sonnet', effort: 'medium', schema: SCHEMA })))
log('Docs done: ' + results.filter(Boolean).length + '/' + PAGES.length)
return { results }
