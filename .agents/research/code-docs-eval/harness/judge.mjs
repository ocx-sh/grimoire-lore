export const meta = {
  name: 'code-docs-eval-judge',
  description: 'Blind opus judge for reason-recovery probes: two independent passes per site packet, arm labels withheld',
  phases: [{ title: 'Judge', detail: 'two opus passes per site packet' }],
}

// args: { packets: "<dir>", out: "<dir>", sites: "ID,ID,...", passes: "a,b", group: 1 }
// group > 1 hands one agent that many packets in turn; use it for packets of a few probes.
const H = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/code-docs/.agents/research/code-docs-eval/harness'
const SITES = args.sites.split(',')
const PASSES = (args.passes || 'a,b').split(',')

const GROUP = Number(args.group || 1)
const CHUNKS = []
for (let i = 0; i < SITES.length; i += GROUP) CHUNKS.push(SITES.slice(i, i + GROUP))

const PROMPT = (sites, pass) => `Model rationale: opus — blind grading of guard survival and reason recovery against ground truth; the judge tier must differ from the sonnet actor.

Read the rubric ${H}/fixtures/judge-rubric.md in full. Then take these packets one at a time, each in full: ${sites.map((s) => args.packets + '/' + s + '.json').join(', ')}. Grade every probe in a packet by the rubric. Grade each probe independently; do not rank probes against each other and do not guess what made them differ. Read the repository file named in the packet at /home/mherwig/dev/<repo>/<file> only if the packet's excerpt is not enough to judge the property. Do not open anything under /home/mherwig/dev/grimoire-lore other than the rubric and the packets.

Write each packet's JSON array to ${args.out}/<SITE>.${pass}.json, where <SITE> is the packet's file stem, and validate it parses (python3 -c "import json; json.load(open(PATH))"). Return the paths and the number of probes graded.`

const SCHEMA = { type: 'object', properties: { paths: { type: 'array', items: { type: 'string' } }, graded: { type: 'number' } }, required: ['paths', 'graded'] }

phase('Judge')
const jobs = []
for (const c of CHUNKS) for (const pass of PASSES) jobs.push(() => agent(PROMPT(c, pass), { label: 'judge:' + c.join('+') + ':' + pass, phase: 'Judge', schema: SCHEMA, model: 'opus' }))
const res = await parallel(jobs)
log('judged ' + res.filter(Boolean).length + '/' + jobs.length)
return res
