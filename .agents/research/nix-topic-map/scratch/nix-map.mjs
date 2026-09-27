export const meta = {
  name: 'nix-wave1-map',
  description: 'Nix research program phase 3: one opus agent reads the 3 audits + 6 scouts + frame and writes the prioritised topic map, decides the artifact set, commissions wave 2 and stages waves 3-4',
  phases: [{ title: 'Map', detail: 'deduplicate the candidates, resolve conflicts, decide the artifact set, commission wave 2', model: 'opus' }],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix'
const RESEARCH = ROOT + '/.agents/research'
const RUN = '/home/mherwig/.cache/research-lang/nix-tools/run.sh'
const FIX = '/home/mherwig/.cache/research-lang/nix-tools/fixtures'
const DATE = '2026-09-27'

const SELECTION_ITEM = {
  type: 'object',
  properties: {
    group: { type: 'string', description: 'topic slug WITHOUT the nix- prefix, e.g. flake-inputs; the consolidation becomes nix-<group>.md and dives go under nix-<group>/' },
    group_label: { type: 'string' },
    id_family: { type: 'string', description: 'the NIX-<FAMILY> this group owns, e.g. NIX-FLK, NIX-PKG, NIX-GEN' },
    slug: { type: 'string', description: 'dive worker slug; file becomes nix-<group>/<slug>.md' },
    label: { type: 'string' },
    brief: { type: 'string', description: '10-25 lines written as a professional research commission: exactly what to investigate, which sources (URLs from the scouts) to fetch, which attributes/builtins/lints/flags/versions to pin down, what exemplar evidence (repo@sha:path:line) to test against, what to RUN with the local toolchain against planted fixture flakes, and what the deliverable must DECIDE' },
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
        ocx_handoff: { type: 'string', description: 'how the ocx-index to flake generation result is delivered (research artifact, ocx ADR draft, prototype, rule depth file) and what it must decide' },
        rationale: { type: 'string' },
      },
      required: ['rules', 'skills', 'id_families', 'ocx_handoff', 'rationale'],
    },
    wave2: { type: 'array', items: SELECTION_ITEM },
    wave3_staged: { type: 'array', items: SELECTION_ITEM },
    wave4_staged: { type: 'array', items: SELECTION_ITEM },
    deferred_count: { type: 'number' },
    owner_questions: { type: 'array', items: { type: 'string' } },
    frame_corrections: { type: 'array', items: { type: 'string' }, description: 'every frame premise the audits or scouts overturned, one line each with the evidence key' },
  },
  required: ['path', 'candidates_deduplicated', 'conflicts_resolved', 'artifact_set', 'wave2', 'wave3_staged', 'wave4_staged', 'deferred_count', 'owner_questions', 'frame_corrections'],
}

phase('Map')
const map = await agent(`Model rationale: opus — topic prioritisation, conflict resolution, the artifact-set decision and the commissioning of three waves across nine corpus artifacts; these are decisions with a blast radius, and a wrong priority wastes a wave of workers.

PROJECT CONTEXT (context for you, not content to reproduce):
- You are phase 3 (Map) of the research-lang program for Nix, run from ${ROOT} (a git worktree — treat it as the repository root; never cd to /home/mherwig/dev/grimoire-lore). The output becomes AI-agent configuration (a glob-scoped rule with a support directory, one to three skills, a bundle) published through the lore catalog and used by coding agents without a human in the loop, plus a design handoff for ocx.
- The brief: "best practices and how to author, maintain, version and publish flakes, incl. great UX, common pitfalls; release nix flakes with a high quality standard and maintain them; in the context of ocx, generate flakes from indexes." The brief is a SEED: the scouts and audits are the topic source, and topics the brief never named but the corpus shows are load-bearing belong in the map. The frame's hypotheses H1-H9 are to be confirmed or overturned.
- Read the method first: ${ROOT}/.claude/skills/research-lang/references/wave-plan.md (Phase 3-5, Convergence, Budget) and ${ROOT}/.claude/skills/research-lang/references/rule-distillation.md (Selection, Placement, "Narrow the Glob Only When It Cannot Miss", the index + support directory shape). Then the frame IN FULL: ${RESEARCH}/nix-frame.md.
- Then read EVERY wave-1 artifact in full (list the directories first): ${RESEARCH}/nix-audit/*.md (3 audits: ocx-index-and-fleet, exemplar-flake-shape, exemplar-tool-runs) and ${RESEARCH}/nix-topic-map/*.md (6 scouts: canonical, codified, practitioner, failure, shifts, generated-flakes). Do not skim; the "Candidate topics" tables are the raw material, and "Contested", "Recent shifts" and "Contradictions of the frame" are where conflicts live. If a file is missing (a worker dropped), say so and proceed.
- For the house shape of a finished map, read the first ~250 lines of ${RESEARCH}/go-topic-map.md ("How to read this", "Conflicts resolved", "Artifact set decision") and skim ${ROOT}/rules/go-quality.md plus one of its depth files to see what a shipped index + depth file looks like.
- The fleet has zero Nix code. Priority is judged against: (a) the fleet's future flakes (Rust CLIs ocx and grimoire, the Python SDK, GitHub Actions) that must be publishable at a high bar; (b) an ocx-index generated flake (the ocx audit measured the index and probed ghcr.io); (c) the general Nix adopter who installs these artifacts.
- A real rootless Nix 2.35.2 toolchain with nixfmt, statix, deadnix, nixd, nil, flake-checker, nix-update, nurl, treefmt and skopeo runs as '${RUN} <cmd>'; dives CAN and MUST run verifications against planted fixture flakes under ${FIX}/<slug>/ (never /tmp) and watch each check go red on the bad twin and green on the good one. Write briefs that demand it.
- Budget and shape: the session caps a workflow at under 10 agents. Each dive wave therefore has AT MOST 6 dives in AT MOST 3 groups (one opus consolidator per group runs in the same workflow). Wave 2 is commissioned now; waves 3 and 4 are staged with the same limits. Cross-cutting decisions come first (wave 2), because later waves and the drafters depend on them.

WRITE ${RESEARCH}/nix-topic-map.md with YAML frontmatter (title, phase: 3, model: opus, date: ${DATE}, wave: "1 consolidated → 2 commissioned, 3-4 staged", sources_surveyed: 9, candidates_deduplicated: N) and these sections, in order:

1. "## How to read this" — the row-is-a-question rule; coverage measured against the sibling lore sets (there is no Nix config in the catalog — say so); priority against consumers (a)-(c); the SURFACE legend (lang / module-system / packaging / fetchers / flake-schema / inputs-lock / systems / devshell / formatter-lint / checks-ci / cache / release-versioning / publishing / consumer-ux / security / impls / generated-flakes / prebuilt-binaries / ocx); a flake-shape legend named from the audits (e.g. A = app flake packaging its own source, B = library/framework flake, C = module flake, D = generated/index-driven flake, E = template, F = nixpkgs itself); the source-key link legend to every wave-1 file.
2. "## Conflicts resolved" — every place two wave-1 artifacts disagree, or an artifact disagrees with the frame or H1-H9. Resolve each with the evidence that decided it (normative > measured > codified > argued > asserted). You must at least cover: flake-utils vs flake-parts vs nix-systems/hand-rolled as what the rules teach; one nixpkgs instance (legacyPackages) vs 'import nixpkgs' with config; whether library/module flakes should pin or even take a nixpkgs input, and follows etiquette for consumers; overlays vs packages as the primary export; nixfmt as the formatter of record vs alejandra; whether statix/deadnix are gates or advice (use the tool-run audit's measured noise); nixConfig in flake.nix (allowed, discouraged, forbidden); version strings for flake-built packages (from the source manifest vs self.shortRev vs lastModifiedDate); semver/tags vs FlakeHub vs 'just the lock'; how to support non-flake users (flake-compat, default.nix); which Nix implementations a published flake must be tested against (CppNix / Lix / Determinate); the CI installer and cache of record after magic-nix-cache; nixpkgs upstreaming vs own-flake-only as the distribution path for a fleet CLI; IFD policy; the era rows the recent-shifts scout overturned; and for the ocx goal: the fetch mechanism given what the ghcr.io probe actually found, one flake generated in CI vs an ocx subcommand that emits Nix vs a Nix library that reads the index JSON at eval time, and the attribute shape for multiple versions.
3. "## The map" — EVERY deduplicated candidate as a table row grouped under lettered sections (one section per future depth file or skill): ID (M-<letter>-nn) | question | surface | shapes it binds | coverage (covered / partial / uncovered, with the source key) | priority P0-P3 with a one-clause justification | proposed ID family. Deduplicate aggressively: raw rows should become roughly 120-200. Merge synonyms, split subject areas into questions. Keep the numbering stable — later waves cite M-IDs.
4. "## Artifact set decision" — decide (as decisions, with the assumption named): the rules and their glob lists (which file names does Nix REQUIRE? flake.nix and flake.lock are structural; *.nix is the language extension; say which globs are safe and why), the depth-file list per rule with one line each (route by task, never by topic name), the ID-family allocation (one family per depth file, NIX-<FAMILY>), the skills (one to three; procedures only — candidates: nix-flake-release, nix-diagnose, nix-flake-adopt / nix-flake-generate; drop any that is really a rule), the bundle name, the ocx handoff (a research artifact plus an ADR draft for the ocx repo, a prototype generator, a depth file on generated flakes — decide which and what it must settle), and what is explicitly NOT in scope (for example NixOS system configuration management, home-manager dotfiles, deploy tools, Hydra operation) and why.
5. "## Selected for wave 2" — at most 3 groups and at most 6 dives, 1-3 dives per group, chosen by: cross-cutting decisions first, then uncovered, then leverage for consumers (a)-(c), then "an area where agents demonstrably get it wrong" (the recent-shifts scout and the tool-run warnings measure this), then "a rule could actually check this". For EACH dive: group slug (without the nix- prefix), dive slug, label, the ID family, and a research BRIEF of 10-25 lines written as a professional commission — exactly what to investigate, which sources (URLs from the scouts) to fetch, which attributes/builtins/lints/flags/versions to pin down, what exemplar evidence (repo@sha:path:line from the audits) to test against, what planted fixture flakes to RUN the candidate verification against, and what the deliverable must DECIDE. The brief is handed to a sonnet worker verbatim; a vague brief is a wasted worker. Name the "chase the surprise" items: anything the scouts or audits found that the frame did not name and that is load-bearing.
6. "## Staged for wave 3" and "## Staged for wave 4" — the next groups (each at most 3 groups / 6 dives) with the SAME brief quality, so each launches mechanically after the previous wave lands. Mark which staged briefs must be revised in light of earlier results. The ocx generated-flake work must be commissioned in wave 2 or 3, not later, and must include a working prototype fixture (a generated flake for 2-3 real index packages that actually evaluates and builds with the local toolchain) if the ghcr.io probe shows it is feasible.
7. "## Deferred" — everything else with its M-ID, one line on why, and what would promote it.
8. "## Questions for the owner" — only decisions no research can settle. Max 8. For each, propose the default the program will assume if unanswered (the owner wants autonomy; the defaults WILL be applied).
9. "## Explicitly not a defect" — frame suspicions the audits cleared, so nobody re-investigates them.
10. "## Frame corrections" — every frame premise (era, hypotheses, artifact set) the wave-1 evidence overturned, one line each with the source key; the orchestrator appends these to the frame verbatim.

Rules: no claim without a source key or a repo@sha:path:line; a topic is a QUESTION not a subject; every P0 must be checkable by a command, a lint, a grep, a nix eval expression or a named reading heuristic — say which; date every version-specific row with the Nix / nixpkgs / tool version and the implementation. Use read-only tools except for your one output file. Return the structured receipt (wave2, wave3_staged and wave4_staged carry the full briefs verbatim, not summaries).`,
  { label: 'map:nix-topic-map', phase: 'Map', model: 'opus', schema: MAP_SCHEMA })

if (!map) { log('MAP RETURNED NULL — read journal.jsonl'); return { map: null } }
log('Map: ' + map.candidates_deduplicated + ' rows · wave2 ' + map.wave2.length + ' dives in ' + new Set(map.wave2.map(d => d.group)).size + ' groups · wave3 ' + map.wave3_staged.length + ' · wave4 ' + map.wave4_staged.length + ' · deferred ' + map.deferred_count + ' · owner questions ' + map.owner_questions.length)
return { map }
