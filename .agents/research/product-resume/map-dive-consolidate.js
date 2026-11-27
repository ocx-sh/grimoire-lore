export const meta = {
  name: 'product-map-dive-consolidate',
  description: 'research-lang phases 3-5 for one sub-program of the UX and marketing program: topic map, deep dives, consolidated rulesets',
  phases: [
    { title: 'Map', detail: 'opus: topic map and wave selection, critic, revision', model: 'opus' },
    { title: 'Dive', detail: 'sonnet: one cited artifact per subtopic, contract check, one repair', model: 'sonnet' },
    { title: 'Consolidate', detail: 'opus: verdict and ruleset per topic', model: 'opus' },
    { title: 'Challenge', detail: 'sonnet skeptic on each ruleset, opus revision', model: 'sonnet' },
  ],
}

const W = '/home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product'
const R = `${W}/.agents/research`
const C = `${W}/.claude/skills/research-lang/references`
const TODAY = args.today
const G = args.group
const MAX_TOPICS = 8
const MAX_DIVES = 4

const CONTEXT = `PROJECT CONTEXT (context for you, not content to reproduce):
- A research-lang program ported from programming languages to two practice domains: UX design of software interfaces, and marketing of software products and services across owned surfaces and platform channels (LinkedIn, YouTube and others). Frame: ${R}/product-frame.md.
- The output becomes published AI-agent configuration (rules and skills in the grimoire-lore catalog) that coding and writing agents follow WITHOUT a human in the loop. Only guidance that changes what an agent does, and that can be checked, is worth anything.
- Adopters: first the OCX and Grimoire fleet under /home/mherwig/dev (open-source developer tools: two landing pages, Astro and MkDocs docs sites, a VS Code extension, the CLIs ocx and grim, READMEs, release notes; no social channel presence yet), then any team building or selling software.
- Grounding audits of that fleet and of exemplar corpora are in ${R}/product-audit/ (ten files). They are measurements; where they contradict the frame, the audits win.
- Era: today is ${TODAY}. Platform algorithms, limits, policies and accessibility and AI-disclosure law moved in the last 24 months; training data predates part of it. Fetch; never write a platform fact, a limit, a law or a statistic from memory. Load web tools with ToolSearch ("select:WebSearch,WebFetch"). Search snippets are not sources: open the page.

ALREADY COVERED by this catalog: css-theming (tokens, dark mode, theming mechanics; ${W}/rules/css-theming.md), docs-quality and the docs skills (page types, plain English, navigation, examples, landing-page counts DOC-TYPE-10..15; ${W}/rules/docs-quality.md), code-docs, CLI stream and exit-code contracts and TUI rows in the language sets, installer-script and shell-integration.

THIS SUB-PROGRAM: "${G.name}". Territory: ${G.territory}
The sibling sub-programs run in parallel and own the rest: ${G.siblings}. Stay inside your territory; name a cross-territory finding in one line and leave it.

HARD LIMITS:
- Write only the file(s) your task names, inside ${W}. The fleet and every other repository are read-only. Scratch and clones go under ~/.cache/research-lang/exemplars/product/ only.
- No git command that changes state in any repository.
- Artifacts are plain, complete English prose and tables. Every external claim carries an inline URL; every dated fact carries the source's date; vendor data is labelled as vendor data; every measurement carries its command.`

const MAP_SCHEMA = {
  type: 'object',
  properties: {
    mapPath: { type: 'string' },
    selected: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          slug: { type: 'string', description: `kebab-case, starts with "${G.prefix}"` },
          label: { type: 'string' },
          idFamily: { type: 'string', description: 'stable rule-ID prefix for this topic, upper case, e.g. UX-FORM' },
          question: { type: 'string', description: 'the question this topic decides, one sentence' },
          dives: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                slug: { type: 'string', description: 'kebab-case, unique within the topic' },
                brief: { type: 'string', description: '10-25 line professional commission handed to the worker verbatim' },
              },
              required: ['slug', 'brief'],
            },
          },
        },
        required: ['slug', 'label', 'idFamily', 'question', 'dives'],
      },
    },
    deferredCount: { type: 'integer' },
    frameCorrections: { type: 'array', items: { type: 'string' } },
    artifactSet: { type: 'array', items: { type: 'string' }, description: 'the rules and skills this sub-program should ship, one line each with what loads it' },
  },
  required: ['mapPath', 'selected', 'deferredCount', 'frameCorrections', 'artifactSet'],
}
const CRITIC_SCHEMA = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    missing: { type: 'array', items: { type: 'string' }, description: 'high-priority uncovered candidates or audit smells the selection ignores, with the scout or audit file that raised each' },
    weakBriefs: { type: 'array', items: { type: 'string' } },
    overlaps: { type: 'array', items: { type: 'string' } },
  },
  required: ['ok', 'missing', 'weakBriefs', 'overlaps'],
}
const DIVE_SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    blocked: { type: 'boolean' },
    sourcesFetched: { type: 'integer' },
    topRules: { type: 'array', items: { type: 'string' } },
  },
  required: ['path', 'blocked', 'sourcesFetched', 'topRules'],
}
const CHECK_SCHEMA = {
  type: 'object',
  properties: { ok: { type: 'boolean' }, problems: { type: 'array', items: { type: 'string' } } },
  required: ['ok', 'problems'],
}
const CONS_SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    rules: { type: 'integer' },
    must: { type: 'integer' },
    conflictsResolved: { type: 'array', items: { type: 'string' } },
    anotherRound: { type: 'array', items: { type: 'string' }, description: 'subareas that deserve another research round, each as a question' },
    humanDecisions: { type: 'array', items: { type: 'string' }, description: 'open questions only the owner can decide' },
    failureModes: { type: 'array', items: { type: 'string' } },
  },
  required: ['path', 'rules', 'must', 'conflictsResolved', 'anotherRound', 'humanDecisions', 'failureModes'],
}

const mapPrompt = (critique, prev) => `Model rationale: opus, topic prioritisation with a blast radius: the selection decides what every later worker researches.

${CONTEXT}

You are the MAP for this sub-program. Read ${C}/wave-plan.md section "Phase 3: Map" and follow it.
Read in full: every scout artifact (${G.scouts.map(s => `${R}/${s}`).join(', ')}) and every grounding audit in ${R}/product-audit/, weighting ${G.audits.join(', ')}.
${critique ? `THIS IS A REVISION. Your first map is at ${prev.mapPath}. A completeness critic found:\nMissing: ${critique.missing.join(' | ') || 'none'}\nWeak briefs: ${critique.weakBriefs.join(' | ') || 'none'}\nOverlaps: ${critique.overlaps.join(' | ') || 'none'}\nRewrite the map file in place and return the full revised selection. Accept a criticism or answer it in the file under "Critic responses"; do not silently ignore one.` : ''}

Write ${R}/${G.mapFile} with frontmatter (title, program: product, sub_program: ${G.name}, date: ${TODAY}, model: opus) and sections:
- "The map": every deduplicated candidate from the scouts with coverage (covered / partial / uncovered) and a one-line priority justified against THIS project and against software teams in general, not against the discipline in the abstract.
- "Selected for this wave": at most ${MAX_TOPICS} topics. Choose: uncovered first, then leverage for the adopters, then areas where agents demonstrably get it wrong, then "a rule or a skill step could actually check this". Each topic is a QUESTION with a decision behind it, never a subject area. Each gets 2 to ${MAX_DIVES} subtopic dives that do not overlap.
- "Deferred": everything else, grouped, so the next wave starts from a backlog.
- "Artifact set": the rules and skills this sub-program should ship and what loads each; revise the frame's hypothesis where the audits and scouts contradict it.
- "Frame corrections": numbered, each with the audit or scout file that forces it.
Every dive brief is a professional commission of 10 to 25 lines: exactly what to investigate, which primary sources to fetch (named), which platform documents, standards, studies or exemplars to read, what must be measured rather than cited, which scout artifact rows it starts from (file and candidate), and what the deliverable must DECIDE. A vague brief is a wasted worker. Topic slugs start with "${G.prefix}".
Return the structured selection.`

const criticPrompt = m => `Model rationale: sonnet, completeness check of a selection against its inputs.

${CONTEXT}

You are a COMPLETENESS CRITIC. You change nothing. Read the map ${m.mapPath}, then the "Candidate topics" table of every scout artifact (${G.scouts.map(s => `${R}/${s}`).join(', ')}) and the "Smells" and "What this contradicts in the frame" sections of every audit in ${R}/product-audit/.
Answer:
- missing: candidates that at least two scouts rated high and uncovered, or audit smells with measured evidence, that the map neither selects nor defers with a stated reason. Name the file that raised each.
- weakBriefs: dive briefs that are a subject area instead of a question, that name no primary source to fetch, that cannot produce a checkable rule, or that would have a worker write platform facts from memory.
- overlaps: pairs of dives, in this map, that would return the same findings; and topics that sit in a sibling sub-program's territory.
ok=true only if all three lists are empty. Be specific and brief: one line per item.`

const divePrompt = (t, d) => `Model rationale: sonnet, deep reading of primary sources for one bounded question.

${CONTEXT}

You are a DEEP-DIVE RESEARCHER. Read ${C}/prompt-contracts.md, sections "Shared Preamble", "Deep-Dive Researcher" and "Return Values", and follow that output contract exactly.
Topic: ${t.label} (${t.slug}). It decides: ${t.question}
Your subtopic commission (${d.slug}):
${d.brief}

Start from the scout artifacts for this sub-program (${G.scouts.map(s => `${R}/${s}`).join(', ')}): read the rows your commission names, then go to the primary sources behind them and beyond them.
Requirements on top of the contract:
- "Normative guidance candidates": each rule is imperative, has a one-line rationale, a severity (MUST / SHOULD / CONSIDER), and a VERIFICATION an agent can run or apply: a command, a lint or audit rule name, a grep, a platform limit to count against (with source URL and the date the source states), or a named reading heuristic with a pass and fail example.
- "Dated facts": every limit, specification, policy or statistic, with URL, the date the source states and whether the source is the platform or authority itself, an independent study, or vendor data.
- "What an agent must not decide alone": business, legal or brand decisions where the right behaviour is to ask.
- "Contested": positions where credible sources disagree, both sides cited.
- If a primary source cannot be fetched, say so in the artifact and set blocked=true only if the commission's central question could not be sourced at all.
Write exactly one file: ${R}/${t.slug}/${d.slug}.md (create the directory) with frontmatter title, program: product, sub_program: ${G.name}, topic: ${t.slug}, worker: ${d.slug}, date_researched: ${TODAY}, model: sonnet, sources_fetched.
Return the receipt.`

const consPrompt = (t, dives) => `Model rationale: opus, consolidation that becomes enforced rule text.

${CONTEXT}

You are the CONSOLIDATOR for the topic "${t.label}" (${t.slug}), which decides: ${t.question}
Read ${C}/prompt-contracts.md section "Consolidator" and ${C}/wave-plan.md section "Phase 5: Consolidate", and follow them. Your job is to DECIDE, not to summarise.
Read in full: ${dives.map(d => d.path + (d.blocked ? ' [blocked]' : '')).join(', ')}; then the grounding audits in ${R}/product-audit/ that bear on this topic.

Write ${R}/${t.slug}.md with frontmatter (title, topic, program: product, sub_program: ${G.name}, date: ${TODAY}, model: opus, id_family: ${t.idFamily}, consolidates: the dive paths relative to this file) and the contract's sections:
- Verdict, written as decisions. Where the dives disagree, resolve it and say why.
- The ruleset: merged, de-duplicated, numbered ${t.idFamily}-01.. with imperative rule, one-line rationale, verification, severity. No rule without a verification. Drop what a competent model does without being told. A rule that rests on a platform fact names the fact's source and date and says how to re-check it.
- Applied to the codebase: already satisfied / violated / new commitment, with file:line evidence from the audits.
- Agent failure modes, ranked by how often each bites, grouped by mechanism.
- What an agent must ask a human.
- Decay: which rules rest on facts that move, and the refresh interval each needs.
- Open questions, including which subarea deserves another round (as questions) and which need an owner decision.
- Sub-artifacts and key sources.
A consolidation with no resolved conflict and no "violated" row is a survey wearing a verdict's clothes.
Return the receipt.`

const skepticPrompt = (t, c) => `Model rationale: sonnet, adversarial check of a ruleset against its own evidence.

${CONTEXT}

You are a SKEPTIC. You change nothing. Read ${c.path} and the dive artifacts in ${R}/${t.slug}/. Try to REFUTE the ruleset:
- For every MUST rule and a sample of at least eight other rules: is the claim actually supported by a fetched primary source in a dive artifact (follow the citation into the artifact)? Is the verification something an agent can really run or apply, with a pass and fail that differ? Is a platform fact dated and attributed to the right kind of source (platform, independent, vendor)?
- Is any rule common knowledge a competent model follows anyway? Is any rule a subject heading rather than an instruction?
- Is any "Applied to the codebase" row without file:line evidence from the audits?
- Does any rule contradict the already-covered catalog rules (css-theming, docs-quality)?
ok=true only if you find nothing. One line per problem: the rule ID, what is wrong, what would fix it.`

const revisePrompt = (t, c, problems) => `Model rationale: opus, revision of an enforced ruleset after an adversarial check.

${CONTEXT}

Revise ${c.path} in place under the "Reviser" contract in ${C}/prompt-contracts.md: existing rule IDs keep their numbers; fix or demote a rule in place; retire a rule by marking it retired, never by renumbering; add a "## Revision log" line per change.
A skeptic found:
- ${problems.join('\n- ')}
For each: fix it from the dive artifacts in ${R}/${t.slug}/ (fetch the primary source yourself if a citation must be confirmed), or demote the rule's severity, or retire it. Do not defend a rule without evidence.
Return the receipt.`

phase('Map')
// args.selection: a saved map result (selection-<group>.json). When present the
// Map phase is skipped and the wave starts at the dives.
// args.stopAfterMap: return the map result without starting any dive.
let map = args.selection ? args.selection : await agent(mapPrompt(null, null), { label: `map:${G.name}`, phase: 'Map', model: 'opus', schema: MAP_SCHEMA })
if (!map) throw new Error('map failed')
const critique = args.selection ? null : await agent(criticPrompt(map), { label: `critic:${G.name}`, phase: 'Map', model: 'sonnet', schema: CRITIC_SCHEMA })
if (critique && !critique.ok) {
  log(`${G.name}: critic found ${critique.missing.length} missing, ${critique.weakBriefs.length} weak briefs, ${critique.overlaps.length} overlaps; revising map`)
  const revised = await agent(mapPrompt(critique, map), { label: `map-revise:${G.name}`, phase: 'Map', model: 'opus', schema: MAP_SCHEMA })
  if (revised) map = revised
}
if (args.stopAfterMap) return { group: G.name, paused: 'after-map', map }
let topics = map.selected
if (topics.length > MAX_TOPICS) {
  log(`${G.name}: ${topics.length} topics selected, dropped ${topics.slice(MAX_TOPICS).map(t => t.slug).join(', ')}`)
  topics = topics.slice(0, MAX_TOPICS)
}
log(`${G.name}: ${topics.length} topics, ${topics.reduce((n, t) => n + Math.min(t.dives.length, MAX_DIVES), 0)} dives`)

const results = await pipeline(
  topics,
  async t => {
    const ds = t.dives.slice(0, MAX_DIVES)
    if (t.dives.length > MAX_DIVES) log(`${t.slug}: dropped dives ${t.dives.slice(MAX_DIVES).map(d => d.slug).join(', ')}`)
    const dives = (await parallel(ds.map(d => async () => {
      let r = await agent(divePrompt(t, d), { label: `dive:${t.slug}:${d.slug}`, phase: 'Dive', model: 'sonnet', schema: DIVE_SCHEMA })
      if (!r) return null
      const chk = await agent(`Model rationale: sonnet, contract check on one research artifact.
Read ${r.path} in full. You change nothing. ok=false with one line per problem if any fail: frontmatter has date_researched and sources_fetched; it has "Normative guidance candidates" where every rule has a rationale, a severity and a verification; it has "Dated facts", "What an agent must not decide alone" and "Contested"; external claims carry inline URLs (sample ten, fail if more than two lack one); no platform limit, law or statistic without a URL and a date; it answers its commission: ${d.brief.slice(0, 400)}`,
        { label: `check:${t.slug}:${d.slug}`, phase: 'Dive', model: 'sonnet', effort: 'low', schema: CHECK_SCHEMA })
      if (chk && !chk.ok) {
        const again = await agent(`${divePrompt(t, d)}

THIS IS A REPAIR PASS. The artifact at ${r.path} exists; keep what is sound and fix exactly these contract problems by doing the missing work (fetching, measuring), not by rewording:
- ${chk.problems.join('\n- ')}`, { label: `repair:${t.slug}:${d.slug}`, phase: 'Dive', model: 'sonnet', schema: DIVE_SCHEMA })
        if (again) r = again
      }
      return r
    }))).filter(Boolean)
    if (!dives.length) throw new Error(`${t.slug}: every dive died`)
    if (dives.length < ds.length) log(`${t.slug}: ${ds.length - dives.length} dives died`)
    return dives
  },
  async (dives, t) => {
    let c = await agent(consPrompt(t, dives), { label: `consolidate:${t.slug}`, phase: 'Consolidate', model: 'opus', schema: CONS_SCHEMA })
    if (!c) throw new Error(`${t.slug}: consolidation failed`)
    const s = await agent(skepticPrompt(t, c), { label: `skeptic:${t.slug}`, phase: 'Challenge', model: 'sonnet', schema: CHECK_SCHEMA })
    let challenged = 0
    if (s && !s.ok) {
      challenged = s.problems.length
      const rev = await agent(revisePrompt(t, c, s.problems), { label: `revise:${t.slug}`, phase: 'Challenge', model: 'opus', schema: CONS_SCHEMA })
      if (rev) c = rev
    }
    return { slug: t.slug, idFamily: t.idFamily, dives: dives.length, blocked: dives.filter(d => d.blocked).length, sources: dives.reduce((n, d) => n + d.sourcesFetched, 0), challenged, ...c }
  },
)

const failed = topics.filter((t, i) => !results[i]).map(t => t.slug)
if (failed.length) log(`${G.name}: topics that did not finish: ${failed.join(', ')}`)
return { group: G.name, mapPath: map.mapPath, artifactSet: map.artifactSet, frameCorrections: map.frameCorrections, deferredCount: map.deferredCount, topics: results.filter(Boolean), failed }