export const meta = {
  name: 'code-docs-wave2-dive-and-consolidate',
  description: 'code-docs program wave 2: 13 deep dives across 7 topic groups, each group consolidated by a strongest-tier agent into a decided ruleset',
  phases: [
    { title: 'Dive', detail: 'one sonnet researcher per commissioned subtopic' },
    { title: 'Consolidate', detail: 'one opus consolidator per group' },
  ],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/code-docs'
const RESEARCH = ROOT + '/.agents/research'
const DATE = '2026-09-27'
const GROUPS = __GROUPS__

const CONTEXT = `PROJECT CONTEXT (context for you, not content to reproduce):
- Research program 'code-docs' in the lore catalog worktree ${ROOT} (treat it as the repository root; never cd to /home/mherwig/dev/grimoire-lore). Goal: shorter, better code comments for codebases AI agents mostly write and read, without a cold agent losing why a non-obvious line looks the way it does or whether it may change it. Output: a rule globbed on every source extension (short index plus depth files), checks under rules/code-docs/checks/ (comment_census.py exists), a cleanup skill, amendments to overlapping lore rules, and a reason-recovery eval that sets the cut line.
- Read these before anything else: ${RESEARCH}/code-docs-frame.md, ${RESEARCH}/code-docs-topic-map.md (the map; its "What the grounding changed" section is the current state of knowledge), and the audit files your brief names under ${RESEARCH}/code-docs-audit/.
- Measured so far: human apps 0.12 comment:code, libraries 0.27, plain-comment blocks p90 3 lines; ocx 0.89, doc comments 11x the app rate; fleet guards are about half of comment lines, median 6 lines vs human 2; plan IDs collide (0 of 30 unique); golden JSON schemas leak 64 internal IDs.
- The fleet under /home/mherwig/dev: ocx, grimoire, grimoire-vscode, grimoire-indexer, ocx-indexbot, ocx-mirror, ocx-sdk-python, ocx-catalog, arcana, creeptd-ng and smaller repos. Never read ocx-save, ocx-sion, ocx-soraka, ocx-evelynn, grimoire-duo, grimoire-wt-*, index-claims, index-fix67, mirror-*, uv, or any .worktrees/, .agents/worktrees/, .tmp-*, .tmp/ directory. Reference clones (read-only, never check out) live at /home/mherwig/.cache/research-lang/exemplars/code-docs/.
- Overlapping shipped rules: ${ROOT}/rules/rust-quality/docs-and-tracing.md (DOC-01..20), ${ROOT}/rules/docs-quality.md and depth files (user-facing prose, reused by reference), and the other language sets under ${ROOT}/rules/.
- The owner's premises and the frame's hypotheses are hypotheses. Contradicting one with evidence is the most valuable result you can produce.
- VERIFICATION COMMAND SHAPE (every verification you write must follow it; a checker rejects the rest): use a directory operand with -r or rg, never a bare shell glob like src/*.rs; one -e per alternative instead of \\| inside a pattern; no angle-bracket placeholders inside a quoted pattern (write NAME=example; grep -e "$NAME"); pipe file lists through xargs -r; quote globs after --include= and --glob; never put an unescaped | inside a markdown table cell (write \\|).
- Date everything researched ${DATE}. The only file you may create or modify is your own OUTPUT FILE.`

const DIVE_CONTRACT = (path) => `OUTPUT FILE: ${path}

Structure, in this order:
1. YAML frontmatter: title, topic, agent, model, date_researched: ${DATE}, sources_count, scope (2-3 lines on what is and is not covered).
2. A table of contents.
3. "## Summary" — 10-20 bullet lines, each a standalone actionable claim.
4. "## Findings" — numbered subsections. EVERY non-obvious claim carries an inline citation: a markdown link to the exact URL read, or repo:path:line for fleet and reference-corpus evidence. Correct and incorrect examples side by side wherever a rule is easier shown than told. Exact tool names with versions, exact lint names, exact command lines, exact numeric thresholds.
5. "## Normative guidance candidates" — numbered, crisp, checkable imperative rules distilled from the findings, each with: the rule, a one-line rationale naming the failure it prevents, how a reviewer VERIFIES it (a command following the verification command shape, a lint, or a named reading heuristic), and a proposed severity (MUST / SHOULD / CONSIDER). This is the section that matters most — dense and specific. Where you ran a command, say so and give its result on a real fleet tree; where you planted a violation to watch a check go red, say so.
6. "## AI-agent angle" — what an LLM characteristically gets WRONG here and the smallest mechanical check that catches each mistake.
7. "## Contested / evolving" — where practice genuinely disagrees or recently changed, and which way it is trending, as of when.
8. "## Decisions this dive proposes" — the brief says what the deliverable must decide; answer each item as a decision with its reason.
9. "## Sources" — table: URL or path | what it is | date/era | why worth reading. Minimum 12 distinct sources, at least 6 primary. For a measurement-led brief, fleet and reference-corpus files count as primary, but still fetch at least 6 external sources.

Hard requirements:
- Load the web tools first: call ToolSearch with query "select:WebSearch,WebFetch" before anything else. For GitHub-hosted files prefer curl -sL https://raw.githubusercontent.com/<org>/<repo>/<branch>/<path> through Bash; for arXiv fetch the abstract and, where a claim depends on it, arxiv.org/html/<id>.
- Actually FETCH the primary sources; never write from search snippets. If a source cannot be fetched, say so and do not cite its content.
- No "it depends" without saying what it depends on.
- Do not modify any file other than your output file. Return the structured receipt.`

const CONSOLIDATE = (g, dir, files, out) => `You are consolidating the topic group '${g.label}' into the single authoritative artifact a later author works from. Its question: ${g.question}

Read EVERY file in ${dir} that this wave produced (${files.join(', ')}); list the directory first and read each in full. Then read the audit files they cite under ${RESEARCH}/code-docs-audit/ and the map ${RESEARCH}/code-docs-topic-map.md sections that concern this group. Where a claim matters to a rule, open the cited fleet file:line yourself.

Write ${out}:
1. YAML frontmatter: title, topic: ${g.group}, model, consolidates (the file list), date: ${DATE}.
2. "## Verdict" — 5-15 lines: the position this program takes, stated as DECISIONS, not a survey. Where sub-researchers disagreed, decide and say why.
3. "## The ruleset" — merged, de-duplicated, numbered rules with IDs ${g.prefix}-01, ${g.prefix}-02, ... Each entry: ID, the rule as one imperative sentence, rationale (one line naming the failure it prevents), verification (exact command following the verification command shape, a lint, or a named reading heuristic), severity (MUST / SHOULD / CONSIDER), and portability (portable / fleet default the adopter may override / fleet-only). Drop rules that restate what a model already does unprompted; keep the ones an agent gets wrong without being told. Smallest set with the highest yield. Keep the MUST list short.
4. "## Applied to the fleet" — which rules ocx, grimoire and the other fleet repos already satisfy, which they violate, which are new commitments, with repo:path:line evidence.
5. "## AI-agent failure modes" — merged, ranked by how often each bites.
6. "## Decisions for the eval" — what this group's verdict means for the reason-recovery eval: which arm it defines or changes, which site property it cares about, and which of its rules the eval must confirm before they can ship as MUST.
7. "## Open questions" — what needs a human decision (one-way doors only), and which subarea deserves ANOTHER research round (name the subarea and the question).
8. "## Sub-artifacts" — relative markdown links to each sub-file with a one-line description.
9. "## Key sources" — the 10-15 best URLs or paths across all sub-artifacts.

Merge rules: no claim without a citation that traces to a sub-artifact, a URL or a file:line; no duplicated rules; prefer the more specific formulation; when two sub-artifacts conflict, state the conflict and resolve it with a reason. A consolidation with no resolved conflict and no 'violated' row is a survey, not a verdict. Do not modify any file other than ${out}. Return the structured receipt.`

const DIVE_SCHEMA = {
  type: 'object',
  properties: { path: { type: 'string' }, sources_count: { type: 'number' }, top_rules: { type: 'array', items: { type: 'string' } } },
  required: ['path', 'sources_count', 'top_rules'],
}
const CONS_SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    rules: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, rule: { type: 'string' }, severity: { type: 'string' } }, required: ['id', 'rule', 'severity'] } },
    conflicts_resolved: { type: 'array', items: { type: 'string' } },
    eval_decisions: { type: 'array', items: { type: 'string' } },
    another_round: { type: 'array', items: { type: 'string' } },
  },
  required: ['path', 'rules', 'conflicts_resolved', 'eval_decisions', 'another_round'],
}

const results = await pipeline(
  GROUPS,
  (g) => parallel(g.dives.map((d) => () => agent(
    'Model rationale: sonnet — web reading and fleet measurement for one commissioned subtopic; the decisions are consolidated later by opus.\n\n' + CONTEXT +
    '\n\nYOUR COMMISSION (' + g.label + ' / ' + d.label + '):\n' + d.brief + '\n\n' + DIVE_CONTRACT(RESEARCH + '/code-docs-' + g.group + '/' + d.slug + '.md'),
    { label: 'dive:' + d.slug, phase: 'Dive', schema: DIVE_SCHEMA, model: 'sonnet' }))),
  (dives, g) => agent(
    'Model rationale: opus — consolidation into enforced rules and eval decisions; conflicts and severities have a blast radius.\n\n' + CONTEXT + '\n\n' +
    CONSOLIDATE(g, RESEARCH + '/code-docs-' + g.group, g.dives.map((d) => d.slug + '.md'), RESEARCH + '/code-docs-' + g.group + '.md'),
    { label: 'consolidate:' + g.group, phase: 'Consolidate', schema: CONS_SCHEMA, model: 'opus' }),
)
const out = {}
GROUPS.forEach((g, i) => { out[g.group] = results[i] })
log('wave 2: ' + results.filter(Boolean).length + '/' + GROUPS.length + ' groups consolidated')
return out
