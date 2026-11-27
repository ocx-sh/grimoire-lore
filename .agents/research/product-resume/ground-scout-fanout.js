export const meta = {
  name: 'product-research-fanout',
  description: 'research-lang phases 1-2 for the UX and marketing program: grounding audits and landscape scouts',
  phases: [
    { title: 'Work', detail: 'sonnet: one cited artifact per worker', model: 'sonnet' },
    { title: 'Check', detail: 'sonnet: contract check on thin or failed artifacts, one retry', model: 'sonnet' },
  ],
}

const W = '/home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product'
const TODAY = args.today

const CONTEXT = `Model rationale: sonnet, volume research work (reading, measuring, enumerating) under a fixed output contract.

PROJECT CONTEXT (context for you, not content to reproduce):
- This is a research-lang program ported from programming languages to two practice domains: UX design of software interfaces, and marketing of software products and services (owned surfaces plus platform channels such as LinkedIn and YouTube).
- The output becomes published AI-agent configuration (rules and skills in the grimoire-lore catalog) that coding and writing agents load and follow WITHOUT a human in the loop. So only guidance that changes what an agent does, and that can be checked, is worth anything.
- Adopters: first the OCX and Grimoire fleet under /home/mherwig/dev (open-source developer tools: Astro and MkDocs sites, a Vite GUI at grimoire-rs/grim-gui, the CLIs ocx and grim, READMEs, release notes), then any team building or selling software.
- Frame: ${W}/.agents/research/product-frame.md. Read it first.
- Era: today is ${TODAY}. Platform algorithms, format limits, ad products, accessibility law and AI-disclosure rules moved in the last 24 months and your training data predates part of it. Fetch; never write a platform fact, a limit, a law or a statistic from memory. Load web tools with ToolSearch ("select:WebSearch,WebFetch"). Search snippets are not sources: open the page.
- Contracts: read ${W}/.claude/skills/research-lang/references/prompt-contracts.md, sections "Shared Preamble"${args.kind === 'scout' ? ', "Scout"' : ', "Grounding Worker"'} and "Return Values", and follow the artifact contract there.

ALREADY COVERED by this catalog (do not re-tread; mark candidates that overlap as covered or partial): css-theming (tokens, dark mode, theming mechanics; ${W}/rules/css-theming.md), docs-quality and the docs skills (page types, plain English, navigation, examples; ${W}/rules/docs-quality.md), code-docs, CLI stream and exit-code contracts in the language sets, installer-script and shell-integration. Skim those two rule files' headings so you know the boundary.

HARD LIMITS:
- Write exactly one file, the path given below, inside ${W}. Create its directory if needed. Never write anywhere else in any repository; the fleet is read-only. Clones and scratch files go under ~/.cache/research-lang/exemplars/product/<your-slug>/ only (shallow clones, --depth 1).
- No git command that changes state in any existing repository.
- The artifact is plain, complete English prose and tables, with frontmatter: title, program, worker, date_researched: ${TODAY}, model: sonnet, sources_fetched (a count).
- Every external claim carries an inline URL. Every measurement carries the exact command that produced it.`

const scoutPrompt = w => `${CONTEXT}

You are a LANDSCAPE SCOUT. Your job is NOT to answer questions. It is to DISCOVER which questions exist: survey one corpus and come back with the topics an expert must be expert in, ranked by how much each changes real outcomes for software teams.

YOUR CORPUS (${w.slug}):
${w.brief}

Write ${W}/${w.path}. Beyond the standard artifact contract it must contain "## Candidate topics": a table with columns topic | why it matters | source (URL) | already-covered? (yes/partial/no) | priority for this project shape | could a rule or skill check it, and how. Aim for 25-40 candidates. A candidate is a QUESTION with a decision behind it ("when does a LinkedIn document post beat a text post for a developer-tool launch, and what are its current format limits?"), never a subject area ("LinkedIn"). Include the candidates that sound boring but bite: limits and truncation points, defaults, legal disclosure, accessibility of the artifact itself, measurement validity, decay rate of the advice. Also include "## Dated facts": every platform limit, policy or number you verified, with its source URL and the date the source states. And "## Contested": positions where credible sources disagree, with both sides cited.
Then return the receipt.`

const groundPrompt = w => `${CONTEXT}

You are a GROUNDING WORKER. You measure what exists; you do not research best practice. Counts, not adjectives. The frame's description of the fleet is a hypothesis: if what you measure contradicts it, say so plainly; that is the most valuable result you can return.

YOUR AXIS (${w.slug}):
${w.brief}

Write ${W}/${w.path}. Every number sits next to the exact command that produced it, so the audit can be re-run. Give file:line evidence for every claim about the fleet. End with "## Smells" (ranked), "## Patterns worth encoding" and "## What this contradicts in the frame".
Then return the receipt.`

const SCOUT_SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    sourcesFetched: { type: 'integer' },
    blocked: { type: 'boolean' },
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          slug: { type: 'string' },
          why: { type: 'string' },
          covered: { type: 'string', enum: ['yes', 'partial', 'no'] },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['slug', 'why', 'covered', 'priority'],
      },
    },
  },
  required: ['path', 'sourcesFetched', 'blocked', 'candidates'],
}

const GROUND_SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    blocked: { type: 'boolean' },
    headline: { type: 'array', items: { type: 'string' }, description: 'headline numbers, one per line' },
    smells: { type: 'array', items: { type: 'string' } },
    patterns: { type: 'array', items: { type: 'string' } },
    contradictsFrame: { type: 'array', items: { type: 'string' } },
  },
  required: ['path', 'blocked', 'headline', 'smells', 'patterns', 'contradictsFrame'],
}

const CHECK_SCHEMA = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    problems: { type: 'array', items: { type: 'string' } },
  },
  required: ['ok', 'problems'],
}

const isScout = args.kind === 'scout'
const build = isScout ? scoutPrompt : groundPrompt
const schema = isScout ? SCOUT_SCHEMA : GROUND_SCHEMA

const results = await pipeline(
  args.workers,
  w => agent(build(w), { label: `${args.kind}:${w.slug}`, phase: 'Work', model: 'sonnet', schema }),
  async (r, w) => {
    if (!r) throw new Error(`${w.slug} died`)
    const check = await agent(`Model rationale: sonnet, contract check on one research artifact.
Read ${W}/${w.path} in full. You change nothing. Check, and answer ok=false with one line per problem if any of these fail:
- the file exists and has frontmatter with date_researched and sources_fetched;
- ${isScout ? 'it has a "## Candidate topics" table with at least 20 rows, each row a question with a source URL, plus "## Dated facts" and "## Contested" sections' : 'every number is accompanied by the command that produced it, and it ends with "## Smells", "## Patterns worth encoding" and "## What this contradicts in the frame"'};
- external claims carry inline URLs (sample ten; fail if more than two lack one);
- nothing reads as written from memory where a fetch was required (platform limits, laws, statistics without a URL and date);
- the worker stayed on its own corpus or axis: ${w.brief.slice(0, 300)}`,
      { label: `check:${w.slug}`, phase: 'Check', model: 'sonnet', effort: 'low', schema: CHECK_SCHEMA })
    if (check && !check.ok) {
      log(`${w.slug}: retry, ${check.problems.length} contract problems`)
      const again = await agent(`${build(w)}

THIS IS A REPAIR PASS. The artifact at ${W}/${w.path} already exists; read it, keep what is sound, and fix exactly these contract problems by doing the missing work (fetching, measuring), not by rewording:
- ${check.problems.join('\n- ')}`,
        { label: `repair:${w.slug}`, phase: 'Work', model: 'sonnet', schema })
      return { slug: w.slug, repaired: true, ...(again || r) }
    }
    return { slug: w.slug, repaired: false, ...r }
  },
)

const failed = args.workers.filter((w, i) => !results[i]).map(w => w.slug)
if (failed.length) log(`workers that did not finish: ${failed.join(', ')}`)
return { group: args.group, done: results.filter(Boolean), failed }