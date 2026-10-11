export const meta = {
  name: 'csharp-dive-consolidate',
  description: 'C# research-lang: one sonnet deep dive per subtopic, pipelined into one opus consolidation per topic group',
  phases: [
    { title: 'Dive', detail: 'sonnet deep dives, toolchain-verified' },
    { title: 'Consolidate', detail: 'opus consolidation per group', model: 'opus' },
  ],
}

const R = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/csharp/.agents/research'
const TOOLS = '/home/mherwig/.cache/research-lang/dotnet-tools'
const EX = '/home/mherwig/.cache/research-lang/exemplars/csharp'
const DATE = args.date
const WAVE = args.wave

const CONTEXT = [
  'PROJECT CONTEXT (context for you, not content to reproduce):',
  '- Program: research-lang for C# / .NET, dated ' + DATE + '. Output becomes AI-agent configuration (rules + skills) loaded by coding agents with no human in the loop.',
  '- Era: C# 14 on .NET 10 LTS (SDK 10.0.401) target; .NET 8 LTS floor; .NET 11 / C# 15 at RC1 (GA Nov 2026) - flag anything specific to it.',
  '- Adopting codebase: a NEW C# SDK wrapping the ocx CLI (Rust, ~/dev/ocx), mirroring the Python SDK ~/dev/ocx-sdk-python. Modern .NET on Windows, Linux, macOS, x64 and arm64 is a hard requirement.',
  '- Grounding: read what is relevant in ' + R + '/csharp-audit/ (ocx-cli-contract.md, python-sdk-digest.md, exemplar-cli-wrappers-and-sdks.md, exemplar-build-and-gates.md, exemplar-language-shape.md) and the map ' + R + '/csharp-topic-map.md.',
  '- Exemplars: 35 clones under ' + EX + ' (owner__repo dirs); cite as owner__repo@<sha12>:path:line.',
  '- Toolchain: ' + TOOLS + '/run.sh <cmd> (SDKs 8.0.425, 10.0.401, 11.0 RC1). Fixtures ONLY under ' + TOOLS + '/fixtures/<your-slug>/ (parent global.json pins 10.0.401; add your own global.json to test other SDKs). Every verification you propose that CAN run must be watched red on a planted bad fixture and green on its fixed twin; record the exact command and observed output in the artifact. Windows-only claims: the Windows host has SDK 10.0.102 reachable via /mnt/c/Windows/System32/cmd.exe /c from a C:\\Users\\ecom\\ cwd - use it only if a claim is load-bearing.',
  args.covered ? '\nALREADY COVERED (earlier waves; do not re-tread):\n' + args.covered : '',
].join('\n')

const DIVE_CONTRACT = [
  'Structure, in this order:',
  '1. YAML frontmatter: title, topic, agent, model, date_researched, sources_count, scope (2-3 lines on what is and is not covered).',
  '2. A table of contents.',
  '3. "## Summary" - 10-20 bullet lines, each a standalone actionable claim.',
  '4. "## Findings" - numbered subsections. EVERY non-obvious claim carries an inline citation as a markdown link to the exact URL read, or an exemplar file:line. Correct and incorrect code side by side wherever a rule is easier shown than told. Exact API names with the .NET/C# version they apply to, exact analyzer IDs, exact MSBuild properties, exact command lines, exact thresholds. Include a "Verified on the toolchain" subsection: fixture path, command, red output, green output.',
  '5. "## Normative guidance candidates" - numbered, crisp, checkable imperative rules, each with: the rule, a one-line rationale, and how a reviewer VERIFIES it (analyzer ID + severity config, a grep/rg with the exact pattern, an MSBuild property check, a dotnet subcommand, or a named reading heuristic). Make it dense and specific. Verification commands must be real shell: directory operands, no <placeholder> tokens, xargs -r, -e for alternatives.',
  '6. "## AI-agent angle" - what an LLM characteristically gets WRONG here (outdated idioms, hallucinated APIs, .NET Framework-era advice, patterns that compile but are wrong) and the smallest mechanical check that catches each.',
  '7. "## Contested / evolving" - where practice disagrees or recently changed, which way it trends, as of when.',
  '8. "## Sources" - table: URL | what it is | date/era | why worth reading. Minimum 12 distinct sources, at least 6 primary (learn.microsoft.com, dotnet/* repos, API docs, specs, real source).',
  'Hard requirements: load the web tools first (ToolSearch "select:WebFetch,WebSearch"; context7 for library docs). FETCH the primary sources; never write from search snippets. Reflect practice as of ' + DATE + '; flag historical-only guidance. No "it depends" without saying on what. Do not modify any file other than your output file and your own fixtures dir.',
].join('\n')

const DIVE_SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    sources_count: { type: 'number' },
    top_rules: { type: 'array', items: { type: 'string' } },
    verified_red_green: { type: 'number' },
  },
  required: ['path', 'sources_count', 'top_rules'],
}

const CONS_SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    rules: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, severity: { type: 'string' }, rule: { type: 'string' } }, required: ['id', 'severity', 'rule'] } },
    conflicts_resolved: { type: 'array', items: { type: 'string' } },
    another_round: { type: 'array', items: { type: 'string' } },
    owner_decisions: { type: 'array', items: { type: 'string' } },
  },
  required: ['path', 'rules', 'another_round'],
}

const results = await pipeline(
  args.topics,
  (t) => parallel(t.subtopics.map(st => () => agent(
    'Model rationale: sonnet - deep-dive web research and toolchain verification; decisions are made by the opus consolidator.\n\n' + CONTEXT + '\n\n' +
    'You are a DEEP-DIVE RESEARCHER on one subtopic of the group "' + t.label + '".\n\n' + (st.brief ? 'RESEARCH BRIEF (verbatim from the topic map):\n' + st.brief + '\n\n' : 'RESEARCH BRIEF: read it verbatim from ' + args.selection + ' - the JSON object topics[] with group "' + t.group + '", subtopics[] with slug "' + st.slug + '", field brief. It is your commission; follow it exactly.\n\n') +
    'OUTPUT FILE: ' + R + '/' + t.group + '/' + st.slug + '.md\n\n' + DIVE_CONTRACT +
    '\n\nReturn: path, source count, top 8 rules as one-liners, number of red/green verifications you watched.',
    { label: 'dive:' + st.slug, phase: 'Dive', schema: DIVE_SCHEMA, model: 'sonnet' }))).then(rs => rs.filter(Boolean)),
  (dives, t) => agent(
    'Model rationale: opus - consolidation decides MUST/SHOULD rules that become enforced agent config.\n\n' + CONTEXT + '\n\n' +
    (t.revise
      ? 'You are REVISING an existing consolidated artifact to fold in a follow-up round. Read ' + R + '/' + t.group + '.md IN FULL, then every file in ' + R + '/' + t.group + '/ in full. Rewrite it in place, preserving structure. ID STABILITY IS A HARD CONTRACT: existing IDs keep number and meaning; new rules get new IDs continuing the sequence; a contradicted rule is changed in place and logged; remove answered open questions; documented gaps move into the Verdict. Add/extend "## Revision log" (one line per change: what, which IDs, why) and update frontmatter consolidates + revised: ' + DATE + '.\n'
      : 'You are consolidating the topic group "' + t.label + '" into the single authoritative artifact a later author works from.\n') +
    (t.consolidation_brief ? 'CONSOLIDATION BRIEF (from the map):\n' + t.consolidation_brief + '\n\n' : 'CONSOLIDATION BRIEF: read field consolidation_brief of the topics[] entry with group "' + t.group + '" in ' + args.selection + '.\n\n') +
    'Read EVERY file in ' + R + '/' + t.group + '/ (list it first; read each in full; new this round: ' + dives.map(d => d.path).join(', ') + '), plus the grounding audits relevant to it.\n\n' +
    'Write ' + R + '/' + t.group + '.md:\n' +
    '1. YAML frontmatter: title, topic, model, consolidates (the file list), date.\n' +
    '2. "## Verdict" - 5-15 lines: the position this program takes, stated as DECISIONS. Where sub-researchers disagreed, decide and say why.\n' +
    '3. "## The ruleset" - merged, de-duplicated, numbered rules with a stable ID prefix (e.g. CS-PROC-01). Each: ID, imperative rule, rationale (one line), verification (exact command, analyzer ID + .editorconfig line, MSBuild property, or rg pattern - real shell, no placeholders), severity (MUST / SHOULD / CONSIDER), and whether it was watched red/green on the toolchain. Drop rules that are generic model common knowledge; keep what an agent gets wrong without being told. Smallest set with the highest yield.\n' +
    '4. "## Applied to the ocx C# SDK" - for the SDK to be written: which rules shape its design (new commitments), which the Python SDK already models (cite python-sdk-digest), which the ocx CLI contract forces (cite ocx-cli-contract), and any place the Python design should NOT be copied.\n' +
    '5. "## AI-agent failure modes" - merged, ranked by how often it bites, each with the check that catches it.\n' +
    '6. "## Failure classes" - group the failure modes by mechanism; each class with the check that catches it.\n' +
    '7. "## Open questions" - what needs a human decision, and which subarea deserves ANOTHER research round (name it and the question).\n' +
    '8. "## Sub-artifacts" - relative markdown links to each sub-file with one line each.\n' +
    '9. "## Key sources" - the 10-15 best URLs.\n' +
    'Merge rules: no claim without a citation traceable to a sub-artifact or URL; no duplicated rules; prefer the more specific formulation; state and resolve every conflict with a reason. A consolidation with no resolved conflict and no rule the SDK design must change for is a survey - do better. You may run the toolchain to settle a conflict (fixtures under ' + TOOLS + '/fixtures/consolidate-' + t.group + '/). Write ONLY that file (and fixtures).\n' +
    'Return: path, rule IDs with severity and imperative, conflicts resolved, subareas needing another round, owner decisions.',
    { label: 'consolidate:' + t.group, phase: 'Consolidate', schema: CONS_SCHEMA, model: 'opus' }),
)

return results.map((r, i) => r ? r : { failed: args.topics[i].group })
