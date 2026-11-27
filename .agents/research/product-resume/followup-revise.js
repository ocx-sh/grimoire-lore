export const meta = {
  name: 'product-followup-revise',
  description: 'research-lang phase 6 for the UX and marketing program: one follow-up dive per open question, then one revision per consolidated topic',
  phases: [
    { title: 'Follow-up', detail: 'sonnet: one cited or measured artifact per open question, contract check, one repair', model: 'sonnet' },
    { title: 'Revise', detail: 'opus: fold the follow-ups into the topic, IDs stable', model: 'opus' },
  ],
}

// args: { today, wave (default 2), topics: [{ slug, idFamily, group, q: [indices] }] }
// Question i of a topic is the file product-resume/wave2/<slug>/q<i>.md.
const W = '/home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product'
const R = `${W}/.agents/research`
const C = `${W}/.claude/skills/research-lang/references`
const TODAY = args.today
const WAVE = args.wave || 2

const CONTEXT = `PROJECT CONTEXT (context for you, not content to reproduce):
- A research-lang program for two practice domains: UX design of software interfaces, and marketing of software products and services across owned surfaces and platform channels. Frame: ${R}/product-frame.md. The output becomes published AI-agent configuration (rules and skills) that agents follow without a human in the loop, so only checkable guidance is worth anything.
- Wave 1 is finished: 23 consolidated topics under ${R}/ (ux-*.md, marketing-*.md, channel-*.md), each with its dive artifacts in a directory of the same name. Grounding audits are in ${R}/product-audit/.
- This is WAVE ${WAVE}: each consolidation named open questions that deserve another round. You work on one of them.
- Era: today is ${TODAY}. Fetch; never write a platform fact, a limit, a law or a statistic from memory. Load web tools with ToolSearch ("select:WebSearch,WebFetch"). Search snippets are not sources: open the page.

HARD LIMITS:
- Write only the file(s) your task names, inside ${W}. The fleet under /home/mherwig/dev and every other repository are read-only.
- Measurements that need to run or change something happen ONLY in a throwaway directory under ~/.cache/research-lang/exemplars/product/wave2/ (clones with --depth 1, scratch repositories, a temporary HOME, a local registry on localhost). Never create a tag, commit or file in an existing repository. Never publish, post, upload, log in, create an account or send anything to a platform. Never use a credential or token you find on this machine.
- No git command that changes state in any existing repository.
- If the question cannot be answered without a human, a credential or a logged-in browser, say exactly what is missing and stop: a documented gap is a finding. Do not fill it from memory.
- Artifacts are plain, complete English prose and tables. Every external claim carries an inline URL and the source's date; vendor data is labelled; every measurement carries its exact command and its output.`

const DIVE_SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    answered: { type: 'string', enum: ['yes', 'partly', 'no'] },
    sourcesFetched: { type: 'integer' },
    affectedRules: { type: 'array', items: { type: 'string' }, description: 'rule IDs with the proposed effect: confirm, change, promote, demote, retire or new' },
  },
  required: ['path', 'answered', 'sourcesFetched', 'affectedRules'],
}
const CHECK_SCHEMA = {
  type: 'object',
  properties: { ok: { type: 'boolean' }, problems: { type: 'array', items: { type: 'string' } } },
  required: ['ok', 'problems'],
}
const REV_SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    rules: { type: 'integer' },
    must: { type: 'integer' },
    newMust: { type: 'array', items: { type: 'string' }, description: 'IDs that are MUST now and were not MUST before this revision (new or promoted)' },
    newIds: { type: 'array', items: { type: 'string' } },
    changedIds: { type: 'array', items: { type: 'string' } },
    retiredIds: { type: 'array', items: { type: 'string' } },
    newFailureClasses: { type: 'array', items: { type: 'string' } },
    stillOpen: { type: 'array', items: { type: 'string' }, description: 'open questions a reviewer would call load-bearing, each as a question' },
  },
  required: ['path', 'rules', 'must', 'newMust', 'newIds', 'changedIds', 'retiredIds', 'newFailureClasses', 'stillOpen'],
}

const qFile = (t, i) => `${R}/product-resume/wave${WAVE}/${t.slug}/q${i}.md`
const outFile = (t, i) => `${R}/${t.slug}/followup-${WAVE === 2 ? '' : `w${WAVE}-`}q${i}.md`

const divePrompt = (t, i) => `Model rationale: sonnet, one bounded follow-up question answered from primary sources or by measurement.

${CONTEXT}

You are a FOLLOW-UP RESEARCHER for the topic ${t.slug} (rule family ${t.idFamily}).
Your commission is the file ${qFile(t, i)}. Read it first. Then read ${R}/${t.slug}.md in full: the rule or rules the question concerns, the Verdict, the Open questions and the Revision log tell you what is already known and what evidence would change the ruleset.
Read ${C}/prompt-contracts.md sections "Shared Preamble" and "Deep-Dive Researcher" and follow that output contract, adapted to a follow-up:
- Answer the question. If it asks for a measurement, measure, with the command and its output inline. If it asks what a law, a policy or a study says, fetch the primary text and quote the operative passage with its date.
- "Effect on the ruleset": for each rule the answer touches, by ID, one of confirm / change (give the exact new text) / promote / demote / retire, or a NEW rule (imperative, rationale, severity, verification). No rule without a verification an agent can run or apply.
- "Dated facts" and "What could not be determined", the latter stating exactly what is missing.
Write exactly one file: ${outFile(t, i)}, with frontmatter title, program: product, topic: ${t.slug}, worker: followup-${WAVE === 2 ? '' : `w${WAVE}-`}q${i}, wave: ${WAVE}, date_researched: ${TODAY}, model: sonnet, sources_fetched.
Return the receipt.`

const revisePrompt = (t, dives) => `Model rationale: opus, revision of an enforced ruleset from follow-up evidence.

${CONTEXT}

You are REVISING the consolidated topic ${R}/${t.slug}.md (rule family ${t.idFamily}) to fold in the follow-up round it commissioned. Read the "Reviser" section of ${C}/prompt-contracts.md and follow it exactly.
Read ${R}/${t.slug}.md in full, then the new artifacts: ${dives.map(d => `${d.path} [answered: ${d.answered}]`).join(', ')}.
- ID STABILITY IS A HARD CONTRACT: every existing rule ID keeps its number and meaning; a contradicted rule changes in place; new rules continue the sequence; a retired number is never reused.
- A follow-up that answered "no" or "partly" changes nothing by itself: move what it established into the Verdict as a documented gap and leave the rule's severity where the evidence supports it.
- Promote to MUST only on evidence the follow-up actually produced. Demote or retire a rule whose check the follow-up showed cannot separate a pass from a fail.
- Remove answered items from Open questions. Add one "## Revision log" line per change, dated ${TODAY}, naming the IDs and the follow-up file.
- Update the Decay section if a dated fact moved.
Then return the receipt. "stillOpen" lists only questions a reviewer would call load-bearing for publishing this ruleset, not the whole backlog.`

const results = await pipeline(
  args.topics,
  async t => {
    const dives = (await parallel(t.q.map(i => async () => {
      let r = await agent(divePrompt(t, i), { label: `followup:${t.slug}:q${i}`, phase: 'Follow-up', model: 'sonnet', schema: DIVE_SCHEMA })
      if (!r) return null
      const chk = await agent(`Model rationale: sonnet, contract check on one research artifact.
Read ${qFile(t, i)} and then ${r.path} in full. You change nothing. ok=false with one line per problem if any fail: the artifact answers the question or states exactly what is missing; it has an "Effect on the ruleset" section where every changed or new rule has a verification; every external claim carries an inline URL and a date (sample ten, fail if more than two lack one); every measurement carries its command and output; nothing reads as written from memory where a fetch or a measurement was required.`,
        { label: `check:${t.slug}:q${i}`, phase: 'Follow-up', model: 'sonnet', effort: 'low', schema: CHECK_SCHEMA })
      if (chk && !chk.ok) {
        const again = await agent(`${divePrompt(t, i)}

THIS IS A REPAIR PASS. The artifact at ${r.path} exists; keep what is sound and fix exactly these problems by doing the missing work, not by rewording:
- ${chk.problems.join('\n- ')}`, { label: `repair:${t.slug}:q${i}`, phase: 'Follow-up', model: 'sonnet', schema: DIVE_SCHEMA })
        if (again) r = again
      }
      return r
    }))).filter(Boolean)
    if (!dives.length) throw new Error(`${t.slug}: every follow-up died`)
    if (dives.length < t.q.length) log(`${t.slug}: ${t.q.length - dives.length} follow-ups died`)
    return dives
  },
  async (dives, t) => {
    const rev = await agent(revisePrompt(t, dives), { label: `revise:${t.slug}`, phase: 'Revise', model: 'opus', schema: REV_SCHEMA })
    if (!rev) throw new Error(`${t.slug}: revision failed`)
    return { slug: t.slug, idFamily: t.idFamily, followups: dives.length, unanswered: dives.filter(d => d.answered === 'no').length, ...rev }
  },
)

const failed = args.topics.filter((t, i) => !results[i]).map(t => t.slug)
if (failed.length) log(`topics that did not finish: ${failed.join(', ')}`)
return { topics: results.filter(Boolean), failed }
