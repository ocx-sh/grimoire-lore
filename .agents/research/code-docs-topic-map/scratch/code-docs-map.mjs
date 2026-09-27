export const meta = {
  name: 'code-docs-map',
  description: 'code-docs program phase 3: one strongest-tier agent maps scouts and audits into a prioritised topic backlog and the next wave of dive commissions',
  phases: [{ title: 'Map', detail: 'topic-map.md plus structured dive commissions' }],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/code-docs'
const RESEARCH = ROOT + '/.agents/research'
const DATE = '2026-09-27'

const PROMPT = `Model rationale: opus — prioritisation and commissioning; this decides what the program researches and which rules can exist.

PROJECT CONTEXT (context for you, not content to reproduce):
- Research program 'code-docs': shorter, better code comments for codebases that AI agents mostly write and read, without losing the reason a non-obvious line looks the way it does. Output: AI-agent configuration used without a human in the loop — a rule globbed on every source file (short index plus depth files), runnable checks under rules/code-docs/checks/, a cleanup skill, amendments to overlapping lore rules, and a reason-recovery eval whose result sets the cut line. Published through the lore catalog at ${ROOT} (a git worktree; treat it as the repository root).
- The owner's premise (ocx at about 1:1 should go to 1:4-1:6) is a hypothesis. The reference corpus measured human apps at 0.12 and libraries at 0.27; plain-comment blocks p90 = 3 lines everywhere; ocx is 0.89 with doc comments 11x the app rate.
- The owner explicitly seeded (seeds, not scope): what a comment should still say, how long, and where everything else goes (decision records, tests, types and names, path-scoped agent rules, git history); discoverability between code and decision records in both directions across their lifecycle; methodologies that make intent discoverable (TDD, BDD, DDD, living documentation, fitness functions as examples); test naming and traceability; developer UX of code-rendered surfaces (IDE hover, rendered API docs, CLI help and schemas generated from doc comments, onboarding into a module) — docs-quality owns user-facing prose and is reused by reference; what changed now that agents write and read code.

Read IN FULL, in this order:
1. ${RESEARCH}/code-docs-frame.md
2. ${RESEARCH}/code-docs-audit/reference-corpus.md
3. Every file in ${RESEARCH}/code-docs-audit/ (census.md, sample.md, human-sample.md, eval-sites.md, records.md, config.md)
4. Every scout in ${RESEARCH}/code-docs-topic-map/ (canon.md, methods.md, empirical.md, agent-era.md, tooling.md, failure.md)
5. The prior research at /home/mherwig/dev/ocx/.claude/artifacts/research_code_comment_density.md (its critique overrides its synthesis)
6. The overlapping shipped rules: ${ROOT}/rules/rust-quality/docs-and-tracing.md, ${ROOT}/rules/docs-quality.md, and grep the other language sets under ${ROOT}/rules for their doc-comment rules.

Write ${RESEARCH}/code-docs-topic-map.md:
1. YAML frontmatter: title, model, date: ${DATE}, reads (the file list).
2. "## What the grounding changed" — 8-15 bullets: every place an audit or the reference corpus confirmed, contradicted or sharpened a frame hypothesis (H1-H7) or the owner's premise, with the number.
3. "## The map" — every deduplicated candidate from the scouts plus the ones the audits surface that no scout named, as a table: slug | question | coverage (covered / partial / uncovered, against shipped lore rules and the prior research) | priority P0-P3 with a one-line justification against THIS fleet | source scouts. Merge duplicates; a topic is a QUESTION.
4. "## Selected for wave 2" — at most 7 topics (groups), each with 1-3 dive commissions. Choose by: blocks a MUST rule or the eval design; uncovered; the agent demonstrably gets it wrong; a check could verify it. At least one commission must come from a topic NO scout named but an audit exposed. Also commission, as its own group, the design of the reason-recovery eval itself if the audits show a design question (arm definitions, site selection bias, scoring rubric, what counts as recovering a reason) that research can settle.
5. "## Deferred" — everything else, each with one line on why it waits.
6. "## Questions for the owner" — only one-way doors (irreversible or outward-facing decisions). Everything else you decide and say so.

Each dive commission is a RESEARCH BRIEF of 10-25 lines handed verbatim to a sonnet worker with web tools and read access to the fleet: exactly what to investigate, which primary sources to fetch, which fleet files or measurements to take, which named tools, lints or APIs to check, and what the deliverable must DECIDE (the normative-guidance candidates it must produce, with verification commands). Tell the worker which audit files to read first. A vague brief wastes a worker.

Return the selection as structured data. Do not modify any file other than ${RESEARCH}/code-docs-topic-map.md.`

const SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    grounding_changes: { type: 'array', items: { type: 'string' } },
    groups: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          group: { type: 'string' },
          label: { type: 'string' },
          question: { type: 'string' },
          dives: {
            type: 'array',
            items: {
              type: 'object',
              properties: { slug: { type: 'string' }, label: { type: 'string' }, brief: { type: 'string' } },
              required: ['slug', 'label', 'brief'],
            },
          },
        },
        required: ['group', 'label', 'question', 'dives'],
      },
    },
    owner_questions: { type: 'array', items: { type: 'string' } },
  },
  required: ['path', 'grounding_changes', 'groups', 'owner_questions'],
}

phase('Map')
const map = await agent(PROMPT, { label: 'map', phase: 'Map', schema: SCHEMA, model: 'opus' })
return map
