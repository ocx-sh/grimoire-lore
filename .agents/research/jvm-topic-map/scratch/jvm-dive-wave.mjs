export const meta = {
  name: 'jvm-dive-wave',
  description: 'JVM research program phases 4+5 for one wave: sonnet deep dives per commissioned subtopic, pipelined into one opus consolidation (or revision) per group',
  phases: [
    { title: 'Dive', detail: 'one sonnet researcher per commissioned subtopic; each persists a cited artifact' },
    { title: 'Consolidate', detail: 'one opus consolidator or reviser per group; writes jvm-<group>.md', model: 'opus' },
  ],
}

// args: { wave: number, date: 'YYYY-MM-DD', selection: SELECTION_ITEM[], already_covered: string[], existing_groups: string[] }
const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake'
const RESEARCH = `${ROOT}/.agents/research`
const FRAME = `${RESEARCH}/jvm-frame.md`
const MAP = `${RESEARCH}/jvm-topic-map.md`
const EX = '/home/mherwig/dev/.tmp-jvm-exemplars'
const WAVE = args.wave
const DATE = args.date
const SELECTION = args.selection
const ALREADY = (args.already_covered || []).map(s => `- ${s}`).join('\n') || '- (nothing consolidated yet)'
const EXISTING = new Set(args.existing_groups || [])

const CONTEXT = `PROJECT CONTEXT (context for you, not content to reproduce):
- This is wave ${WAVE} of the research program that makes an AI-agent fleet expert in the JVM ecosystem: Java, Kotlin/JVM, Gradle (including plugin development), Maven, Ant as legacy, Bazel for Java/Kotlin, SDK authoring, dependency management, fat/shadow jars and distribution, linting, testing and coverage. Its output becomes AI-agent configuration (glob-scoped rules with support directories, at most two skills, a bundle) used without a human in the loop, published through the lore catalog at ${ROOT} (a git worktree — treat it as the repository root; never cd to /home/mherwig/dev/grimoire-lore).
- Read the frame first (${FRAME}, including its Corrections), then the topic map (${MAP}): its "Conflicts resolved", "Artifact set decision" and the row(s) your brief cites. The map's decisions bind you; your job is depth, not re-deciding the artifact shape.
- THE FLEET HAS NO JAVA OR KOTLIN CODE. Evidence comes from the exemplar corpus of 32 upstream repositories under ${EX}/<owner>__<repo> (blob-less depth-1 clones; \`git -C <dir> ls-tree -r --name-only HEAD\` lists paths, build files are checked out, \`git -C <dir> show HEAD:<path>\` fetches any other file). The four audits under ${RESEARCH}/jvm-audit/ already measured them — cite the audits, and re-measure only what your brief needs. Never run gradle, mvn, bazel or java; none is installed.
- The two future consumers the artifacts must serve on day one: an OCX SDK for the JVM (mirroring /home/mherwig/dev/ocx-sdk-python) and an OCX Gradle plugin (mirroring /home/mherwig/dev/rules_ocx and /home/mherwig/dev/setup-ocx). See jvm-audit/config-inventory.md for their contracts.
- Sibling lore sets own Cargo/pyproject/package.json/docs/Bazel-core topics; the sibling Bazel program (read-only at /home/mherwig/dev/grimoire-lore/.agents/research/bazel-*) owns bzlmod, hermeticity, caching, CI and flags — a Bazel-Java dive covers rules_java/rules_jvm_external/rules_kotlin only.
- Use read-only tools everywhere; the only file you may create or modify is your own OUTPUT FILE. Date everything ${DATE}; version-tag every Java/Kotlin/Gradle/Maven/Bazel-specific claim.

ALREADY COVERED (do not re-tread; cite these consolidations' rule IDs instead):
${ALREADY}
`

const DIVE_CONTRACT = (path) => `OUTPUT FILE: ${path}
Write it with the Write tool; create parent directories as needed.

Structure, in this order:
1. YAML frontmatter: title, topic, agent (your label), model: sonnet, date_researched: ${DATE}, sources_count, scope (2-3 lines on what is and is not covered).
2. A table of contents.
3. "## Summary" — 10-20 bullet lines, each a standalone actionable claim.
4. "## Findings" — numbered subsections. EVERY non-obvious claim carries an inline citation as a markdown link to the exact URL read, or a repo@sha:path:line into the exemplar corpus. Correct and incorrect code or build-script side by side wherever a rule is easier shown than told (Kotlin DSL for Gradle examples unless the map says otherwise). Exact plugin ids, task names, flag names, lint/check names, artifact coordinates, exact command lines, exact numeric thresholds, with the version/era they apply to.
5. "## Normative guidance candidates" — numbered, crisp, checkable imperative rules distilled from the findings, each with: the rule, a one-line rationale, and how a reviewer VERIFIES it (a grep, a lint or Error Prone/detekt check name, a Gradle task or Maven goal, a plugin's report, or a named reading heuristic). This is the section that matters most — make it dense and specific.
6. "## Exemplar evidence" — which exemplars already satisfy, violate or contradict each candidate, with repo@sha:path:line (from the audits or your own re-measurement).
7. "## AI-agent angle" — what an LLM characteristically gets WRONG here (outdated idioms it was trained on — Groovy-era Gradle, JUnit 4, javax, kapt, OSSRH, pre-K2 Kotlin; hallucinated plugin ids or APIs; patterns that build but are wrong) and the smallest mechanical check that catches each mistake.
8. "## Contested / evolving" — where practice genuinely disagrees or recently changed, and which way it is trending, as of when.
9. "## Sources" — table: URL | what it is | date/era | why worth reading. Minimum 12 distinct sources, at least 6 primary (official docs, JEPs, the tool's own repository or release notes, specs, talks).

Hard requirements:
- Call ToolSearch with query "select:WebSearch,WebFetch" FIRST to load the web tools, then research. For GitHub-hosted markdown prefer \`curl -sL https://raw.githubusercontent.com/...\` through Bash so you read the whole file.
- Actually FETCH the primary sources; never write from search snippets.
- Reflect current practice as of ${DATE}; flag historical-only guidance with the version it stopped applying.
- No "it depends" without saying what it depends on.
- Do not modify any file other than your output file.`

const DIVE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['path', 'sources_count', 'top_rules', 'surprises'],
  properties: {
    path: { type: 'string' },
    sources_count: { type: 'number' },
    top_rules: { type: 'array', items: { type: 'string' }, maxItems: 10 },
    surprises: { type: 'array', items: { type: 'string' }, maxItems: 6, description: 'findings the brief did not anticipate and that deserve their own round' },
  },
}

const CONSOLIDATE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['path', 'rule_ids', 'conflicts_resolved', 'needs_another_round', 'must_count'],
  properties: {
    path: { type: 'string' },
    rule_ids: { type: 'array', items: { type: 'string' }, description: 'ID — imperative, one per rule' },
    conflicts_resolved: { type: 'array', items: { type: 'string' } },
    needs_another_round: { type: 'array', items: { type: 'string' }, description: 'subarea + the question, one per line' },
    must_count: { type: 'number' },
  },
}

function dive(item) {
  const path = `${RESEARCH}/jvm-${item.group}/${item.slug}.md`
  return agent(
    `Model rationale: sonnet — online research and source digestion; volume work whose cost is in pages read, not in judgment.

${CONTEXT}

YOUR SUBAREA: ${item.label} (group: ${item.group_label}; rule family: ${item.id_family})

RESEARCH BRIEF (from the topic map; follow it exactly):
${item.brief}

${DIVE_CONTRACT(path)}

Return ONLY the structured receipt: the output path, source count, your 8 strongest normative rules as one-liners, and up to 6 surprises.`,
    { label: `dive:${item.group}/${item.slug}`, phase: 'Dive', model: 'sonnet', effort: 'high', schema: DIVE_SCHEMA },
  )
}

function consolidate(group, items) {
  const path = `${RESEARCH}/jvm-${group}.md`
  const dir = `${RESEARCH}/jvm-${group}/`
  const families = [...new Set(items.map(i => i.id_family))]
  const family = families.join(' + ')
  const label = items[0].group_label
  const revise = EXISTING.has(group)
  const task = revise
    ? `You are REVISING an existing consolidated artifact to fold in a follow-up round it itself commissioned.

Read ${path} IN FULL, then every file in ${dir} in full — including the new artifact(s) this round produced: ${items.map(i => i.slug + '.md').join(', ')}.

Rewrite ${path} in place, preserving its structure:
- ID STABILITY IS A HARD CONTRACT. Every existing rule ID keeps its number and its meaning. Do not renumber, do not reorder into different IDs, do not reuse a retired number.
- New rules get NEW IDs continuing the sequence.
- If the follow-up CONTRADICTS an existing rule, change that rule's text in place and record the change — never leave both standing. A rule that overclaims a guarantee the new research shows does not exist is the most dangerous kind; fix it explicitly.
- Update the Verdict for whatever the follow-up settled, and REMOVE from Open questions whatever it answered. Where the research established a GAP rather than an answer, move it into the Verdict as a documented gap.
- Add or extend a "## Revision log": one line per change — what, which IDs, why.
- Update the frontmatter's consolidates list and add a revised: ${DATE} key.`
    : `You are consolidating a topic into the single authoritative artifact a later author works from.

Read EVERY file in ${dir} (list it first; read each in full), plus the four audits under ${RESEARCH}/jvm-audit/ and the topic map's rows for this group.

Write ${path}:
1. YAML frontmatter: title, topic, model: opus, id_family: ${families.join(', ')}, consolidates (the file list), date: ${DATE}.
2. "## Verdict" — 5-15 lines: the position this program takes, stated as DECISIONS, not as a survey. Where sub-researchers disagreed, decide and say why. Name the consumer kind each decision binds (library / application / Gradle plugin / CLI / SDK) when it differs.
3. "## The ruleset" — merged, de-duplicated, numbered rules, one subsection per ID family this group owns (${families.join(', ')} — each dive's brief names its family; a family's rules are the ones an agent needs while editing that family's file kind, so keep GRADLE- and MVN- rows apart even when they answer the same question). Each entry: ID (<FAMILY>-nn), the rule as an imperative sentence, rationale (one line), verification (exact command, task, lint or check name, or grep), severity (MUST / SHOULD / CONSIDER), and the version floor it assumes if any. Drop rules that are generic model common knowledge and would not change behaviour; keep the ones an agent gets wrong without being told. Smallest set with the highest yield. Group rows by the check that catches them.
4. "## Applied to the exemplars and the two future consumers" — which rules the strict exemplars already satisfy, which prominent exemplars violate (repo@sha:path:line from the audits or sub-artifacts), and which are new commitments for the OCX SDK and the OCX Gradle plugin.
5. "## AI-agent failure modes" — merged, ranked by how often it bites, each with the mechanical check.
6. "## Open questions" — what needs an owner decision, and which subarea deserves ANOTHER research round (name the subarea and the question).
7. "## Sub-artifacts" — relative markdown links to each jvm-${group}/<file>.md with a one-line description.
8. "## Key sources" — the 10-15 best URLs across all sub-artifacts.

Merge rules: no claim without a citation that traces to a sub-artifact or a URL; no duplicated rules; prefer the more specific formulation; when two sub-artifacts conflict, state the conflict and resolve it with a reason. A consolidation with no resolved conflict and no "violated" row is a survey wearing a verdict's clothes — do not produce one.`

  return agent(
    `Model rationale: opus — synthesis across conflicting sources plus normative decisions that later become enforced rules.

${CONTEXT}

TOPIC: ${label} (family ${family})

${task}

Do not modify any file other than ${path}.

Return ONLY the structured receipt: path, rule IDs with one-line imperatives, conflicts resolved, subareas needing another round, and the MUST count.`,
    { label: `${revise ? 'revise' : 'consolidate'}:${group}`, phase: 'Consolidate', model: 'opus', effort: 'high', schema: CONSOLIDATE_SCHEMA },
  )
}

// ---------------------------------------------------------------- Run
const groups = {}
for (const item of SELECTION) (groups[item.group] = groups[item.group] || []).push(item)
const entries = Object.entries(groups)
log(`Wave ${WAVE}: ${SELECTION.length} dives across ${entries.length} groups (${entries.map(([g, i]) => `${g}×${i.length}`).join(', ')}); revising: ${entries.filter(([g]) => EXISTING.has(g)).map(([g]) => g).join(', ') || 'none'}`)

const results = await pipeline(
  entries,
  ([group, items]) => parallel(items.map(item => () => dive(item).then(r => ({ slug: item.slug, ...(r || {}) , ok: !!r })))),
  (dives, [group, items]) => {
    const ok = dives.filter(Boolean).filter(d => d.ok)
    if (!ok.length) { log(`SKIP consolidate:${group} — every dive dropped`); return { group, dives, consolidation: null } }
    if (ok.length < items.length) log(`consolidate:${group} proceeding with ${ok.length}/${items.length} dives`)
    return consolidate(group, items).then(c => ({ group, dives, consolidation: c }))
  },
)

const out = results.filter(Boolean)
const surprises = out.flatMap(r => (r.dives || []).filter(Boolean).flatMap(d => (d.surprises || []).map(s => `${r.group}/${d.slug}: ${s}`)))
const another = out.flatMap(r => ((r.consolidation && r.consolidation.needs_another_round) || []).map(s => `${r.group}: ${s}`))
const musts = out.reduce((n, r) => n + ((r.consolidation && r.consolidation.must_count) || 0), 0)
log(`Wave ${WAVE} done: ${out.length}/${entries.length} groups consolidated · ${musts} MUST rules · ${surprises.length} surprises · ${another.length} follow-ups`)
return { wave: WAVE, groups: out, surprises, needs_another_round: another, must_count: musts }
