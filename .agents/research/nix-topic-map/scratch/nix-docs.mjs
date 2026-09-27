export const meta = {
  name: 'nix-docs',
  description: 'Nix research program wiring: write the catalog description companions (docs/nix-*.md) for the five Nix packages, every count measured by command',
  phases: [{ title: 'Docs', detail: 'one writer per companion page' }],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix'
const RESEARCH = ROOT + '/.agents/research'

const PAGES = [
  { out: 'docs/nix-quality.md', about: 'the nix-quality rule: rules/nix-quality.md (index, which owns NIX-CORE and the gate block) and every file under rules/nix-quality/', model: 'docs/go-quality.md' },
  { out: 'docs/nix-flake-adopt.md', about: 'the nix-flake-adopt skill: skills/nix-flake-adopt/ (SKILL.md and references/)', model: 'docs/go-upgrade.md' },
  { out: 'docs/nix-flake-release.md', about: 'the nix-flake-release skill: skills/nix-flake-release/SKILL.md', model: 'docs/go-release.md' },
  { out: 'docs/nix-diagnose.md', about: 'the nix-diagnose skill: skills/nix-diagnose/ (SKILL.md and references/error-catalog.md)', model: 'docs/go-diagnose.md' },
  { out: 'docs/nix-essentials.md', about: 'the nix-essentials bundle: bundles/nix-essentials.toml and its four members (read each member index or SKILL.md); explain why one rule (every Nix file shares one glob family) and why three skills', model: 'docs/go-essentials.md' },
]

const SCHEMA = { type: 'object', additionalProperties: false, required: ['path', 'lines', 'numbers'], properties: { path: { type: 'string' }, lines: { type: 'number' }, numbers: { type: 'array', items: { type: 'string' }, description: 'each number stated on the page with the command that measured it' } } }

phase('Docs')
const results = await parallel(PAGES.map(p => () => agent(`Model rationale: sonnet — a catalog description page written against a fixed house model from files already on disk; every number measured, no rule decisions.

PROJECT CONTEXT (context for you, not content to reproduce):
- You write one catalog description page for the lore catalog at ${ROOT} (a git worktree; treat it as the repository root). The page is what a person reads on the catalog before installing a package. It describes; it does not restate the rules.
- House model: read ${ROOT}/${p.model} in full and match its structure, register, length (within 20 percent) and voice: a one-paragraph intro, the grim add install block (ghcr.io/ocx-sh/lore/<name>), what it loads on or when to run it, two or three sections on the premise and what is distinctive, pinned decisions, what it does not cover, and Siblings. No marketing, no em dashes, no semicolons in prose.
- Subject: ${p.about}. Read every file of it in full. For the premise and the measured facts, the research consolidations under ${RESEARCH}/nix-*.md and ${RESEARCH}/nix-frame.md are the source (measured on a 38-repository upstream exemplar corpus plus 8 held-out flakes with CppNix 2.35.2, nixpkgs 26.11pre, Lix 2.95.2 and CppNix 2.31.5 on 2026-09-27; the fleet itself has no Nix). Name a measured fact only if a consolidation or the artifact states it.
- EVERY number on the page (line counts, rule counts, MUST counts, non-negotiable counts, depth-file counts, step counts, glob counts) is measured by a command you run now against the files on disk, e.g. wc -l, or grep -c -e '^| NIX-FLK-' over a file, or grep -c -e '| MUST' for severity. Return each number with its command.
- No fleet paths, no /home paths, no .agents links on the page. Links to other catalog pages are by package name in backticks, not by URL.
- The only file you may create or modify is ${ROOT}/${p.out}.

Write ${ROOT}/${p.out}. Return the receipt.`, { label: 'docs:' + p.out, phase: 'Docs', model: 'sonnet', effort: 'medium', schema: SCHEMA })))
log('Docs done: ' + results.filter(Boolean).length + '/' + PAGES.length)
return { results }
