export const meta = {
  name: 'product-validate',
  description: 'research-lang phase 8 for the UX and marketing program: run each new artifact literally on a real tree, fix what breaks, and run trigger evals on two model tiers',
  phases: [
    { title: 'Literal run', detail: 'sonnet: one fresh agent follows each artifact on a copy of a real repository', model: 'sonnet' },
    { title: 'Fix', detail: 'sonnet: repair the defects the literal run found', model: 'sonnet' },
    { title: 'Trigger', detail: 'sonnet writes utterances; haiku and sonnet route them from descriptions alone', model: 'haiku' },
  ],
}

// args: { today, items: [{ id, load: [paths], task }], skills: [names for trigger evals] }
const W = '/home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product'
const C = `${W}/.claude/skills/research-lang`
const SCRATCH = '~/.cache/research-lang/exemplars/product/phase8'

const LIMITS = `HARD LIMITS:
- Real repositories under /home/mherwig/dev are read-only. Work on a copy: git clone --depth 1 <local path> into ${SCRATCH}/<your item id>/ and run everything there. Never write in the original, never push, never create a tag or a release.
- Never post, publish, upload, schedule, log in, create an account or send anything to any platform or registry. A step that would do so is executed up to the draft or the dry run and then stops.
- Never use a credential, token or logged-in CLI found on this machine (no gh api, no docker login, no npm token). Public data may be read with plain unauthenticated curl.
- No git command that changes state outside your scratch copy.
- Use /usr/bin/grep when you search yourself (a shell hook rewrites bare grep). Commands quoted from the artifact are run exactly as written.`

const DEFECT = {
  type: 'object',
  properties: {
    file: { type: 'string', description: 'path relative to the catalog root' },
    line: { type: 'integer' },
    severity: { type: 'string', enum: ['blocking', 'minor'] },
    problem: { type: 'string' },
    evidence: { type: 'string', description: 'the command run and the decisive line of its output, or the quoted instruction' },
    fix: { type: 'string' },
  },
  required: ['file', 'severity', 'problem', 'evidence', 'fix'],
}
const RUN_SCHEMA = {
  type: 'object',
  properties: {
    tree: { type: 'string', description: 'the repository the run used' },
    stepsRun: { type: 'integer' },
    stepsBlocked: { type: 'integer', description: 'steps that could not be executed as written' },
    checksRun: { type: 'integer' },
    checksBroken: { type: 'integer', description: 'verification commands or scripts that errored, could not go red on a planted violation, or fired falsely' },
    defects: { type: 'array', items: DEFECT },
    notCovered: { type: 'array', items: { type: 'string' }, description: 'parts of the artifact this run did not exercise, and why' },
  },
  required: ['tree', 'stepsRun', 'stepsBlocked', 'checksRun', 'checksBroken', 'defects', 'notCovered'],
}
const FIX_SCHEMA = {
  type: 'object',
  properties: {
    fixed: { type: 'array', items: { type: 'string' } },
    notFixed: { type: 'array', items: { type: 'string' }, description: 'defect and the reason it was left' },
    gate: { type: 'string', description: 'the gate commands run and their exit codes' },
  },
  required: ['fixed', 'notFixed', 'gate'],
}

const runPrompt = it => `Model rationale: sonnet, literal execution of published agent configuration on a real repository.

You are an agent in a team that just installed some published AI-agent configuration. You have no other knowledge of how it was made. Your job is to FOLLOW IT LITERALLY on a real repository and report every place where it cannot be followed as written. You do not edit the configuration.

The configuration under test (item ${it.id}), in the catalog at ${W}:
${it.load.map(p => `- ${W}/${p}`).join('\n')}
Read these the way an agent would: a rule file in full; a skill's SKILL.md in full, then each depth or reference file only when SKILL.md or the rule routes you to it for the task. Run its scripts from where they are (${W}/skills/<name>/checks/...).

Your task, as the user would give it: ${it.task}
Pick the repository under /home/mherwig/dev (the ocx-sh/* and grimoire-rs/* checkouts) where this task most naturally occurs, and say which you picked and why in one line.

${LIMITS}

How to run it:
1. Follow the procedure step by step. For each step record: could it be executed exactly as written? A step is BLOCKED when a command errors for a reason that is the artifact's fault (wrong flag, wrong path, a file the artifact assumes, a tool it never told you to install, a dialect that fails on this machine), when the instruction is ambiguous enough that two careful agents would do different things, or when it needs something the artifact said a human provides and gives no way to continue.
2. Run every verification the steps reach (each command in a check block, each shipped script) on the real tree. Read the output: does a hit look like a true finding? Sample at least five hits per check, or all if fewer.
3. Verification honesty: for at least five checks that came back clean (or all, if fewer), plant the violation the rule describes in your scratch copy and run the check again. A check that stays green on a planted violation is BROKEN. Remove the planted change afterwards.
4. Read what you loaded once more for: two rows that contradict each other or a sibling artifact they cite; a fact stated in two places with different values; a version- or date-specific statement with no date; an instruction that names a file, a script, a flag or a rule ID that does not exist (check the path, run --help, search the catalog for the ID).
5. Stop at the publishing boundary as the limits say, and report whether the artifact itself told you to stop there.

Report defects only against the artifact (file under ${W}, line), never against the repository you ran on. "blocking" = an agent following the artifact would do the wrong thing, fail, or report a false pass or false fail; "minor" = wording, ordering, a nit. Give the evidence (command and decisive output line) and a concrete fix for each. Do not pad: zero defects is a valid result. Clean up large scratch files when done.`

const fixPrompt = (it, defects) => `Model rationale: sonnet, targeted repair of published configuration from run evidence.

Catalog: ${W}. A fresh agent followed item ${it.id} literally on a real repository and found the defects below. Fix them in the artifact.
Files you may write: anything under ${it.load.map(p => `${W}/${p}`).join(', ')} (a skill directory includes its references/, checks/ and fixtures). Nothing else.

Before editing read: ${W}/.agents/research/product-authoring-plan.md section "Authoring contract for every unit" (binding: portability, ID stability, portable verification dialect, script rules), and the consolidation(s) the affected rule IDs come from under ${W}/.agents/research/ (find one by its ID prefix: the file whose frontmatter id_family matches) so that a fix never contradicts the researched rule. A rule keeps its ID and severity. If a defect is really the rule being wrong, fix the verification or the wording to what the consolidation says, and if the consolidation itself is wrong, leave the rule and report it under notFixed.

Defects:
${defects.map((d, i) => `${i + 1}. [${d.severity}] ${d.file}${d.line ? ':' + d.line : ''}: ${d.problem}\n   evidence: ${d.evidence}\n   suggested fix: ${d.fix}`).join('\n')}

Rules for the fix:
- Reproduce a check defect first (run the evidence command), fix it, then show it now goes red on the planted violation and green on the clean case. Add the case to the script's fixtures and --self-test when the defect is in a shipped script.
- Fix every blocking defect. Fix a minor one when it is a one-line change; otherwise list it under notFixed.
- Published text stays self-contained: no /home/mherwig, no .agents/research, no fleet repository or product names, no mention of this run.
- Gate, from ${W}, all must pass before you return: python3 ${C}/scripts/check-artifacts.py --forbid '/home/mherwig' --forbid '.agents/research' <each rule file and skill DIRECTORY you touched, plus skills/ux-quality-reference skills/ux-cli skills/ux-agent-interfaces when you touched any ux artifact> ; python3 -I <each script you touched> --self-test ; ocx exec ruff -- ruff check <dirs you touched> ; ocx exec ruff -- ruff format --check <dirs you touched> ; grim build <each rule file or skill directory you touched>.
No git command that changes state. Do not spawn sub-agents. Use /usr/bin/grep for your own searches.`

// ---- literal runs, then fixes ----
const literal = pipeline(
  args.items,
  it => agent(runPrompt(it), { label: `run:${it.id}`, phase: 'Literal run', model: 'sonnet', schema: RUN_SCHEMA }),
  async (r, it) => {
    if (!r) return { id: it.id, died: true }
    const blocking = r.defects.filter(d => d.severity === 'blocking')
    let fix = null
    if (r.defects.length) {
      fix = await agent(fixPrompt(it, r.defects), { label: `fix:${it.id}`, phase: 'Fix', model: 'sonnet', effort: 'high', schema: FIX_SCHEMA })
    }
    return { id: it.id, tree: r.tree, stepsRun: r.stepsRun, stepsBlocked: r.stepsBlocked, checksRun: r.checksRun, checksBroken: r.checksBroken, blocking: blocking.length, minor: r.defects.length - blocking.length, defects: r.defects, notCovered: r.notCovered, fix }
  },
)

// ---- trigger evals ----
const UTT_SCHEMA = {
  type: 'object',
  properties: {
    cases: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          skill: { type: 'string' },
          kind: { type: 'string', enum: ['should', 'should-not'] },
          utterance: { type: 'string' },
        },
        required: ['skill', 'kind', 'utterance'],
      },
    },
  },
  required: ['cases'],
}
const ROUTE_SCHEMA = {
  type: 'object',
  properties: {
    picks: {
      type: 'array',
      items: {
        type: 'object',
        properties: { n: { type: 'integer' }, skills: { type: 'array', items: { type: 'string' }, description: 'skill names to load, most relevant first; empty when none applies' } },
        required: ['n', 'skills'],
      },
    },
  },
  required: ['picks'],
}

const trigger = (async () => {
  const utt = await agent(`Model rationale: sonnet, writing realistic user requests for a routing test.

For each of these skills, read ONLY its description (run from ${W}: python3 .agents/research/product-resume/list-descriptions.py and find the line): ${args.skills.join(', ')}.
Write, per skill, three "should" utterances and one "should-not" utterance.
- A "should" utterance is what a real developer, founder or maintainer would type when they need that skill, in their own words: never the skill's name, never a phrase copied from its description, with the ordinary context such a person gives (a product, a release, a file). Vary them: one short and casual, one specific with a file or an artefact, one indirect (the need is implied).
- A "should-not" utterance is a nearby task that must NOT load this skill: something another skill in the catalog owns, or something no skill should claim. It should be tempting.
Return all cases. Do not read any SKILL.md body.`, { label: 'trigger:write', phase: 'Trigger', model: 'sonnet', schema: UTT_SCHEMA })
  if (!utt) return { died: true }
  const cases = utt.cases.map((c, i) => ({ n: i + 1, ...c }))
  const list = cases.map(c => `${c.n}. ${c.utterance}`).join('\n')
  const route = model => agent(`Model rationale: ${model}, routing test on this model tier from descriptions alone.

You are a coding agent with a catalog of skills installed. You see only their names and descriptions: run, from ${W}, python3 .agents/research/product-resume/list-descriptions.py (67 lines, "name: description"). Do not open any other file.
For each numbered user request below, decide which skill or skills you would load before starting work, exactly as you would in a real session: load a skill when its description says it applies, load none when none does. At most three per request, most relevant first.

${list}`, { label: `trigger:route:${model}`, phase: 'Trigger', model, schema: ROUTE_SCHEMA })
  const [h, s] = await parallel([() => route('haiku'), () => route('sonnet')])
  const score = (res, tier) => {
    if (!res) return { tier, died: true }
    const by = new Map(res.picks.map(p => [p.n, p.skills]))
    const fails = []
    for (const c of cases) {
      const got = by.get(c.n) || []
      const hit = got.includes(c.skill)
      if (c.kind === 'should' && !hit) fails.push({ skill: c.skill, kind: 'missed', utterance: c.utterance, got })
      if (c.kind === 'should-not' && hit) fails.push({ skill: c.skill, kind: 'overtriggered', utterance: c.utterance, got })
    }
    return { tier, cases: cases.length, fails }
  }
  return { haiku: score(h, 'haiku'), sonnet: score(s, 'sonnet') }
})()

const [lit, trig] = await Promise.all([literal, trigger])
return { literal: lit, trigger: trig }
