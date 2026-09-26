export const meta = {
  name: 'go-wave1-map',
  description: 'Go research program phase 3: one opus agent reads the 5 audits + 7 scouts + frame and writes the prioritised topic map, decides the artifact set, and commissions wave 2 with wave 3 staged',
  phases: [{ title: 'Map', detail: 'deduplicate the candidates, resolve conflicts, decide the artifact set, commission wave 2', model: 'opus' }],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/go'
const RESEARCH = ROOT + '/.agents/research'
const DATE = '2026-09-26'

const SELECTION_ITEM = {
  type: 'object',
  properties: {
    group: { type: 'string', description: 'topic slug WITHOUT the go- prefix, e.g. errors; the consolidation becomes go-<group>.md and dives go under go-<group>/' },
    group_label: { type: 'string' },
    id_family: { type: 'string', description: 'the GO-<FAMILY> this group owns, e.g. GO-ERR, GO-CONC, GO-MOD, GO-TEST, BZL-GO' },
    slug: { type: 'string', description: 'dive worker slug; file becomes go-<group>/<slug>.md' },
    label: { type: 'string' },
    brief: { type: 'string', description: '10-25 lines written as a professional research commission: exactly what to investigate, which sources (URLs from the scouts) to fetch, which APIs/analyzers/lints/flags/versions to pin down, what exemplar evidence (repo@sha:path:line) to test against, what to RUN with the local toolchain against planted fixtures, and what the deliverable must DECIDE' },
  },
  required: ['group', 'group_label', 'id_family', 'slug', 'label', 'brief'],
}

const MAP_SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    candidates_deduplicated: { type: 'number' },
    conflicts_resolved: { type: 'array', items: { type: 'string' } },
    artifact_set: {
      type: 'object',
      properties: {
        rules: { type: 'array', items: { type: 'string' }, description: 'one line per rule: name, glob list, depth files' },
        skills: { type: 'array', items: { type: 'string' } },
        id_families: { type: 'array', items: { type: 'string' } },
        bazel_go_handoff: { type: 'string', description: 'how the Bazel-Go depth file is delivered to the published bazel-quality set' },
        rationale: { type: 'string' },
      },
      required: ['rules', 'skills', 'id_families', 'bazel_go_handoff', 'rationale'],
    },
    wave2: { type: 'array', items: SELECTION_ITEM },
    wave3_staged: { type: 'array', items: SELECTION_ITEM },
    deferred_count: { type: 'number' },
    owner_questions: { type: 'array', items: { type: 'string' } },
    frame_corrections: { type: 'array', items: { type: 'string' }, description: 'every frame premise the audits or scouts overturned, one line each with the evidence key' },
  },
  required: ['path', 'candidates_deduplicated', 'conflicts_resolved', 'artifact_set', 'wave2', 'wave3_staged', 'deferred_count', 'owner_questions', 'frame_corrections'],
}

phase('Map')
const map = await agent(`Model rationale: opus — topic prioritisation, conflict resolution, the artifact-set decision and the commissioning of a whole wave across twelve corpus artifacts; these are decisions with a blast radius, and a wrong priority wastes a wave of workers.

PROJECT CONTEXT (context for you, not content to reproduce):
- You are phase 3 (Map) of the research-lang program for Go and its ecosystem (the language as of Go 1.27, the go command and toolchain management, modules, vet/staticcheck/golangci-lint, testing, concurrency and context, errors, the newer standard library, performance tooling, security, release and distribution, Bazel for Go), run from ${ROOT} (a git worktree — treat it as the repository root; never cd to /home/mherwig/dev/grimoire-lore). The output becomes AI-agent configuration (a glob-scoped rule with a support directory, a go.mod rule, one to three skills, a bundle, and a Go depth file offered to the published bazel-quality set) published through the lore catalog and used by coding agents without a human in the loop.
- The brief was one word, "go": the agenda is entirely self-directed. The scouts and audits are your only topic source; the frame's hypotheses H1-H8 are to be confirmed or overturned by them.
- Read the method first: ${ROOT}/.claude/skills/research-lang/references/wave-plan.md (Phase 3: Map, Phase 4, Phase 5, Sizing, Budget) and ${ROOT}/.claude/skills/research-lang/references/rule-distillation.md (Selection, Placement, "Narrow the Glob Only When It Cannot Miss", the index + support directory shape). Then the frame IN FULL including its Corrections section and the exemplar table: ${RESEARCH}/go-frame.md.
- Then read EVERY wave-1 artifact in full (list the directories first): ${RESEARCH}/go-audit/*.md (5 audits) and ${RESEARCH}/go-topic-map/*.md (7 scouts). Do not skim; the "Candidate topics" tables are the raw material and the "Contested", "Recent shifts" and "Contradictions of the frame" sections are where conflicts live. If a file is missing (a worker dropped), say so in the map and proceed.
- For the house shape of a finished map, read ${RESEARCH}/jvm-topic-map.md sections "How to read this", "Conflicts resolved" and "Artifact set decision" (the first ~250 lines), and ${ROOT}/rules/bazel-quality.md plus ${ROOT}/rules/bazel-quality/java.md (the published per-language Bazel depth file a Go one must mirror).
- Sibling lore sets already own these globs and subjects: rust-*, python-*, typescript-*, java-quality, kotlin-quality, gradle-build, maven-build, bazel-quality (BUILD.bazel, *.bzl, MODULE.bazel, rc files; bzlmod, hermeticity, caching, CI, flags), docs-quality (README/CHANGELOG/docs sites). A Go topic that is really one of theirs is covered-elsewhere. The Rust set's cli-contract depth file is the fleet's CLI contract: a Go CLI mirrors it rather than inventing a new exit-code table.
- A real Go 1.27.1 toolchain with staticcheck, golangci-lint v2.14.0, govulncheck, gofumpt, goimports, deadcode and modernize is available through /home/mherwig/.cache/research-lang/go-tools/run.sh; dives CAN and SHOULD run verifications against planted fixtures (small throwaway modules under /home/mherwig/.cache/research-lang/go-tools/fixtures/<slug>/, never under /tmp). Write briefs that demand it wherever a rule's verification is a lint or analyzer: the verification must be watched going red.
- Budget: wave 2 is at most 7 groups and 14 dives; wave 3 the same. Cross-cutting decisions come first.

WRITE ${RESEARCH}/go-topic-map.md with YAML frontmatter (title, phase: 3, model: opus, date: ${DATE}, wave: "1 consolidated → 2 commissioned, 3 staged", sources_surveyed: 12, candidates_deduplicated: N) and these sections, in order:

1. "## How to read this" — the row-is-a-question rule; coverage measured against the sibling lore sets (config-inventory.md), never against a fleet codebase (there is none — say so); priority against the future consumers (a Go SDK wrapping the ocx CLI, Go CLIs in the ocx/grimoire mould, Go release artifacts the fleet mirrors) and the general Go adopter; the SURFACE legend (lang / stdlib / concurrency / errors / testing / lint / toolchain / modules / release / bazel-go / cli / sdk / http / fs / security / perf / any) and an exemplar-shape legend named from the audits (e.g. A = small library, B = CLI, C = service/daemon, D = SDK/client library, E = multi-module monorepo, F = Bazel-built); the source-key link legend to every wave-1 file.
2. "## Conflicts resolved" — every place two wave-1 artifacts disagree, or an artifact disagrees with the frame or hypotheses H1-H8. Resolve each with the evidence that decided it (normative > measured > codified > argued > asserted). Known ones you must cover: testify vs stdlib+go-cmp as the test style the rule set teaches (the Go team and Google style vs the measured ecosystem); golangci-lint v2 as the gate of record vs go vet + staticcheck alone, and which linter set a MUST rule may name (use the audit's measured noise on well-maintained code); gofmt vs gofumpt vs goimports as the formatter of record; functional options vs config structs for SDK constructors; 'accept interfaces, return structs' and consumer-side interfaces; package layout (internal/, no pkg/, cmd/) vs the non-official project-layout repo; sentinel vs typed errors and %w exposure as API; panics in libraries; slog vs zap for new code; one go-quality rule with depth files vs separate rules; whether .golangci.yml, .goreleaser.yaml and go.work join the go-modules glob or get routed by subject (apply "Narrow the Glob Only When It Cannot Miss" with the audits' counts); the go and toolchain directive policy for libraries vs applications; testing/synctest and t.Context as defaults; json/v2 as experimental; the era rows the recent-shifts scout overturned.
3. "## The map" — EVERY deduplicated candidate as a table row grouped under lettered sections (one section per future depth file, across all rules): ID (M-<letter>-nn) | question | surface | shapes it binds | coverage (covered / partial / uncovered, with the source key) | priority P0-P3 with a one-clause justification against this program's consumers | proposed ID family. Deduplicate aggressively: several hundred raw rows should become 160-240. Merge synonyms, split subject areas into questions. Keep the numbering stable — later waves cite M-IDs.
4. "## Artifact set decision" — decide (as decisions, with the assumption named): the rules and their glob lists (which names does the go command or the tool REQUIRE? *.go, go.mod, go.sum, go.work, go.work.sum, .golangci.yml/.yaml/.toml/.json, .goreleaser.yml/.yaml, .ko.yaml — say which are safe and why, with the audit counts), the depth-file list per rule with one line each (route by task, never by topic name), the ID-family allocation (one family per depth file, GO-<FAMILY>; BZL-GO for the Bazel depth file), how the Bazel-Go depth file is delivered to bazel-quality (drafted in this program and added to rules/bazel-quality/ with a version bump, the precedent being java.md), the skills (one to three; procedures only — candidates: go-release, go-upgrade/modernize, go-diagnose; drop any that is really a rule), the bundle name, and what is explicitly NOT in scope (e.g. GUI, mobile, WebAssembly beyond a mention, specific web frameworks beyond net/http, Kubernetes operator frameworks beyond what the exemplars force) and why.
5. "## Selected for wave 2" — at most 7 groups and at most 14 dives total, 1-3 dives per group, chosen by: uncovered first, then leverage for the future consumers, then "an area where agents demonstrably get it wrong" (the recent-shifts scout and the modernize counts measure this), then "a rule could actually check this". Cross-cutting decisions (the gate of record, the test style, the module policy, error and context contracts, concurrency ownership) go in wave 2. For EACH dive: group slug (without the go- prefix), dive slug, label, the ID family, and a research BRIEF of 10-25 lines written as a professional commission — exactly what to investigate, which sources (URLs from the scouts) to fetch, which analyzers/lints/flags/APIs/versions to pin down, what exemplar evidence (repo@sha:path:line from the audits) to test against, what planted fixtures to RUN the candidate verification against, and what the deliverable must DECIDE. The brief is handed to a sonnet worker verbatim; a vague brief is a wasted worker. Name the "chase the surprise" items: any place the scouts or audits found something the frame did not name and that is load-bearing.
6. "## Staged for wave 3" — the next groups (at most 14 dives) with the SAME brief quality, so wave 3 launches mechanically after wave 2 lands. Mark which wave-3 briefs must be revised in light of wave-2 results.
7. "## Deferred" — everything else with its M-ID, one line on why, and what would promote it.
8. "## Questions for the owner" — only decisions no research can settle. Max 8. For each, propose the default the program will assume if unanswered (the owner has said to run autonomously; the defaults WILL be applied).
9. "## Explicitly not a defect" — frame suspicions the audits cleared, so nobody re-investigates them.
10. "## Frame corrections" — every frame premise (era, hypotheses, artifact set) the wave-1 evidence overturned, one line each with the source key; the orchestrator appends these to the frame verbatim.

Rules: no claim without a source key or a repo@sha:path:line; a topic is a QUESTION not a subject; every P0 must be checkable by a command, an analyzer, a lint, a grep or a named reading heuristic — say which; date every version-specific row with the Go or tool version. Use read-only tools except for your one output file. Return the structured receipt (wave2 and wave3_staged carry the full briefs verbatim, not summaries).`,
  { label: 'map:go-topic-map', phase: 'Map', model: 'opus', schema: MAP_SCHEMA })

if (!map) { log('MAP RETURNED NULL — read journal.jsonl'); return { map: null } }
log('Map: ' + map.candidates_deduplicated + ' rows · wave2 ' + map.wave2.length + ' dives in ' + new Set(map.wave2.map(d => d.group)).size + ' groups · wave3 staged ' + map.wave3_staged.length + ' · deferred ' + map.deferred_count + ' · owner questions ' + map.owner_questions.length + ' · frame corrections ' + map.frame_corrections.length)
return { map }
