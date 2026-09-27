export const meta = {
  name: 'code-docs-wave1-ground-and-scout',
  description: 'code-docs program wave 1: five grounding audits over the fleet and six landscape scouts over the comment, decision-record and agent-era corpora',
  phases: [
    { title: 'Ground', detail: 'numbers-first audits of fleet comments, eval sites, decision records and config' },
    { title: 'Scout', detail: 'six corpus surveys that discover candidate topics' },
  ],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/code-docs'
const RESEARCH = ROOT + '/.agents/research'
const FRAME = RESEARCH + '/code-docs-frame.md'
const CENSUS = ROOT + '/rules/code-docs/checks/comment_census.py'
const PRIOR = '/home/mherwig/dev/ocx/.claude/artifacts/research_code_comment_density.md'
const DATE = '2026-09-27'

const PREAMBLE = (rationale) => `Model rationale: sonnet — ${rationale}

PROJECT CONTEXT (context for you, not content to reproduce):
- This is the research program 'code-docs': shorter, better code comments for codebases that AI agents mostly write and read. Its output becomes AI-agent configuration used without a human in the loop: a rule globbed on every source file (short index plus depth files), runnable checks, a cleanup skill, and a reason-recovery eval. It is published through the lore catalog at ${ROOT} (a git worktree; treat it as the repository root, never cd to /home/mherwig/dev/grimoire-lore itself).
- Read the frame first, in full: ${FRAME}. It holds the measured fleet table, the hypotheses H1-H7, the intended artifact set and the eval sketch.
- The owner's premise: ocx (Rust, /home/mherwig/dev/ocx) carries about one comment line per code line, much of it essays, plan IDs and history narration; the owner suspects 1:4 to 1:6 is right. That is a HYPOTHESIS. The guardrail: cutting must not leave a cold agent unable to recover why a non-obvious line looks the way it does, or whether it may change it.
- Prior evidence: ${PRIOR}. Its adversarial critique at the end overrides its synthesis. Re-verify what you use; never inherit a number.
- The fleet lives under /home/mherwig/dev. Real, deduplicated repos: ocx, grimoire, grimoire-vscode, grimoire-indexer, grimoire-index, index, ocx-indexbot, ocx-mirror, ocx-mirror-sdk, ocx-sdk-python, rules_ocx, find_ocx, vscode-ocx, setup-ocx, setup-grimoire, ocx-catalog, arcana, creeptd-ng, bob, kate-middlechild, grimoire-lore. NEVER count or read ocx-save, ocx-sion, ocx-soraka, ocx-evelynn, grimoire-duo, grimoire-wt-*, index-claims, index-fix67, mirror-*, uv, or any .worktrees/, .agents/worktrees/, .tmp-*, .probe-*, node_modules/, target/ directory — they are clones, forks or scratch and inflate counts.
- A shared comment classifier exists: python3 ${CENSUS} --root <repo> [--group package|lang|top|none] [--scope prod|test|other|all] [--format json] ; --sample N --seed S --min-block K [--kind doc|line|any] prints random comment blocks with the next code line; --list-blocks --min-block K lists long blocks. Ratio = (doc + plain comment lines) / code lines, with clap/schemars interface docs, licence headers and tool directives in separate buckets. Use it so every number is comparable; if you find it misclassifies, say where (file:line) — that is a finding.
- Overlapping lore rules already shipped: ${ROOT}/rules/rust-quality/docs-and-tracing.md (DOC-01..DOC-20, comments section DOC-18..20), ${ROOT}/rules/docs-quality.md and its depth files (user-facing prose; this program reuses it by reference), and the doc-comment parts of the python, typescript, go, java and kotlin quality sets under ${ROOT}/rules/.
- The frame's hypotheses are HYPOTHESES, never premises. Contradicting one with evidence is the most valuable result you can produce.
- The only file you may create or modify is your own OUTPUT FILE. Read-only everywhere else: no git checkout, no commits, no builds that write into a repo.
- Date everything as researched ${DATE}.

ALREADY COVERED (by the prior ocx research; re-verify, extend, do not merely re-find): Arafat and Riehle ICSE 2009 (about 19 percent comment density over 5,000 projects); arXiv 2605.13280 (redundant comments the second most common readability defect in LLM code); arXiv 2607.01867 (LLM comments skew to Meta and Explanation types); arXiv 2408.14007 (AI Javadoc rated equal or better by experts); CodeCrash NeurIPS 2025 (misleading NL cues cut reasoning accuracy 23.2 percent); arXiv 2609.09242 (correct solution comments +17.2 percent, wrong ones -20.8 percent, frequency predicts nothing); Wen et al. ICPC 2019 (code-comment inconsistent commits about 1.5x bug-prone); DocChecker (about 72 percent staleness detection); Lore arXiv 2603.15566 (commit messages as the why store); the Embedded ADR convention on adr.github.io; Anthropic Claude Code best-practices guidance on comments and context.
`

const GROUND_CONTRACT = (subject, path) => `You are producing a numbers-first audit of ${subject} so a later authoring pass is grounded in what is actually there.

OUTPUT FILE: ${path}

Write it with YAML frontmatter (title, agent, model, scope, method, date_researched: ${DATE}). 'method' must describe the exact commands used so every number is re-runnable; inline each command next to its result.

The requester's diagnosis and the frame's hypotheses are HYPOTHESES, not premises. If the measurements contradict one, say so plainly and show the counts.

Every claim needs a repo:path:line citation. A grep count is a hypothesis: spot-read at least 3 hits per pattern and report the false-positive rate you saw.

Structure: frontmatter, a table of contents, "## Headline numbers", one "## <axis>" section per numbered demand below (commands inline, tables over prose), "## Smells (ranked)", "## Patterns worth encoding", "## Contradictions of the frame", "## Gaps". Density over prose.

Use read-only tools. Do not modify anything outside your output file. Return the structured receipt.`

const SCOUT_CONTRACT = (corpusName, path) => `You are a LANDSCAPE SCOUT. Your job is NOT to answer questions — it is to DISCOVER which questions exist. Survey a corpus and come back with the topics an expert in code documentation for agent-written code must master, ranked by how much each changes real outcomes.

YOUR CORPUS: ${corpusName}

OUTPUT FILE: ${path}

Structure, in this order:
1. YAML frontmatter: title, corpus, agent, model, date_researched: ${DATE}, sources_count, scope (2-3 lines on what is and is not covered).
2. A table of contents.
3. "## Summary" — 10-20 bullet lines, each a standalone claim about what this corpus says matters.
4. "## Survey" — numbered subsections, one per source or source cluster actually read: what it argues, lists or measures, with an inline markdown link to the exact URL read. Quote exact rule names, lint names, check IDs, thresholds, numbers, sample sizes and dates.
5. "## Candidate topics" — a table: topic (a QUESTION, not a subject area) | why it matters | source (URL) | already-covered? (yes/partial/no, against the overlapping lore rules named in the context and the prior research) | surface it binds (inline comment / doc comment / test / decision record / rendered surface / git / agent config / check) | priority for THIS fleet (P0-P3, one clause of justification). Aim for 25-45 candidates. A candidate is a question a rule could later answer with a verification: "how long may a why-comment be before its content belongs in a decision record, and what measured distribution in human-written code supports the cap" is a topic; "comment length" is not.
6. "## Recent shifts seen in this corpus" — what changed in the last 18-24 months (agents writing and reading code) and what older advice it invalidates, with dates.
7. "## Contested" — where sources disagree, and which way it is trending.
8. "## Sources" — table: URL | what it is | date/era | why worth reading. Minimum 15 distinct sources, at least 8 primary (the book, spec, standard, paper, official docs or tool repository itself, not a summary of it).

Hard requirements:
- Load the web tools first: call ToolSearch with query "select:WebSearch,WebFetch" before anything else. For GitHub-hosted files prefer fetching the raw file with curl -sL https://raw.githubusercontent.com/<org>/<repo>/<branch>/<path> through Bash, because WebFetch returns a summary and a catalogue sweep needs the full list. For arXiv papers fetch the abstract page and, where the claim depends on it, the HTML full text (arxiv.org/html/<id>).
- Actually FETCH the primary sources; never write from search snippets. If a source cannot be fetched, say so and do not cite its content.
- Reflect current practice as of ${DATE}; flag historical-only guidance.
- Do not modify any file other than your output file. Return the structured receipt with the candidate list as structured data.`

const GROUND_SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    headline_numbers: { type: 'array', items: { type: 'string' } },
    top_smells: { type: 'array', items: { type: 'string' } },
    patterns_worth_encoding: { type: 'array', items: { type: 'string' } },
    contradictions_of_frame: { type: 'array', items: { type: 'string' } },
  },
  required: ['path', 'headline_numbers', 'top_smells', 'patterns_worth_encoding', 'contradictions_of_frame'],
}

const SCOUT_SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    sources_count: { type: 'number' },
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        properties: { slug: { type: 'string' }, topic: { type: 'string' }, why: { type: 'string' }, priority: { type: 'string' } },
        required: ['slug', 'topic', 'why', 'priority'],
      },
    },
  },
  required: ['path', 'sources_count', 'candidates'],
}

const AUD = RESEARCH + '/code-docs-audit/'
const GROUNDERS = [
  {
    key: 'census',
    prompt: PREAMBLE('measurement and grep work over two Rust repos; counting, not judgment') + '\n' + GROUND_CONTRACT('the ocx and grimoire Rust comment corpora (/home/mherwig/dev/ocx, /home/mherwig/dev/grimoire)', AUD + 'census.md') + `

Demands:
1. Re-verify the prior file's numbers per package with the census script (--group package --scope all): prod ratio 0.98 with interface docs counted, 7.1k interface lines (3,177 clap plus 3,973 schemars), 774 doc blocks over 20 lines holding about 25k lines, 185 of them with an invented markdown header, 201 with bold lead-ins, 4,237 comment lines matching plan-ID prefixes. Reproduce each with a command; say which hold, which do not, and why they differ.
2. Block-length distribution for ocx and grimoire prod: doc and plain blocks separately, p50/p90/p99/max, count and total lines of blocks over 3, 5, 10, 20, 40 lines. Which 25 files hold the most comment lines in blocks over 10 lines (the sweep list).
3. Plan and process IDs in comments: count comment lines per ID family (C-NNN, WP-N, DEC-, DX-, RUL-, A-NN, S-N, short two-character IDs like C7 or D2, 'round N', 'Codex-flagged', 'review', dates). For the top 15 distinct IDs, find every definition in tracked files and classify: resolves to exactly one tracked definition / resolves to several unrelated definitions / resolves to none / defined only in an untracked file.
4. Pointers in comments to files (paths ending .md, .toml, .json, or naming adr_, plan_, rulings_, subsystem-): count, and for each distinct target whether it is tracked (git ls-files), untracked-but-present, or missing; whether a named section or anchor exists in the target.
5. User-rendered surfaces: run the installed binaries' help (ocx --help, every ocx subcommand --help recursively, and grim the same way if on PATH; bound each with timeout 10) and read the golden JSON schemas (ocx crates/ocx_schema/tests/golden/*.json or wherever they live). Count internal IDs, ADR or plan file names, section references, implementation jargon and dates that reach users. Cite each surface and its source doc comment file:line.
6. History and provenance phrases in comments ('used to', 'previously', 'no longer', 'was changed', 'we now', 'regression', 'fixed in', 'before this'): count, then read 30 hits and split into pure provenance vs a present-tense constraint phrased as history. Report the split.`,
  },
  {
    key: 'sample',
    prompt: PREAMBLE('careful per-block judgment over a random sample; volume reading, the decisions come later') + '\n' + GROUND_CONTRACT('an UNBIASED random sample of fleet comment blocks, classified by what they carry', AUD + 'sample.md') + `

The prior census over-weighted the largest files. Fix that with a seeded random sample.

Demands:
1. Draw samples with the census script, prod scope, every block size: ocx --sample 150 --seed 11; grimoire --sample 70 --seed 11; ocx-sdk-python --sample 40 --seed 11; ocx-catalog --sample 30 --seed 11; grimoire-vscode --sample 30 --seed 11 (use --format json). Record the exact commands.
2. Classify every sampled block (read the surrounding code, not only the next line) into exactly one primary category: contract (what a caller must know: behaviour, errors, panics, invariants) / why-constraint (a non-obvious local reason) / guard (a why-constraint whose absence would let a plausible edit introduce a bug — name the edit) / pointer (1-3 lines pointing at a tracked doc, spec, RFC or issue) / essay (multi-paragraph design argument) / record-paraphrase (restates an ADR, rule or spec) / narration (restates the code) / tautology (restates the name) / process-ID (plan, contract, review-round, work-package IDs) / provenance (history of how the code came to be) / TODO or debt / example or doctest / section marker / commented-out code / other.
3. For every block also record: its line count; RECOVERABLE-FROM-CODE (yes/partly/no — could a competent reader derive this from code, types, names and tests in the same file); MINIMAL LINES (the fewest comment lines that would keep every piece of information that is NOT recoverable elsewhere; 0 if none); and for guard blocks the edit it prevents.
4. Report per repo: blocks and lines per category (line-weighted shares), the sum of MINIMAL LINES versus actual lines (the compression factor), and the implied post-cleanup ratio if every block were cut to MINIMAL LINES (show the arithmetic from the census totals). Give a rough 90 percent interval for the shares from the sample size.
5. List every guard block verbatim with file:line and the edit it prevents — these seed the reason-recovery eval.
6. Test H6 from the frame directly: what share of guard information sits in narration, process-ID, provenance and tautology blocks?`,
  },
  {
    key: 'sites',
    prompt: PREAMBLE('careful code reading to build ground truth for an eval; precision matters more than volume') + '\n' + GROUND_CONTRACT('eval sites: non-obvious lines whose reason a cold agent must be able to recover', AUD + 'eval-sites.md') + `

The program will build an eval: a cold agent lands on a non-obvious line under several comment variants (original, rules applied, aggressive cut, stripped) and is asked first to simplify the enclosing function, then why the line looks as it does and whether it may change. You harvest the sites and their ground truth.

Demands:
1. Harvest 40 candidate sites: 24 in ocx, 8 in grimoire, 4 in ocx-sdk-python or ocx-indexbot (Python), 4 in grimoire-vscode or grimoire-indexer (TypeScript). Spread across mechanisms: a lock or guard held by a named binding, crash or write ordering, fsync and atomic rename, fail-open versus fail-closed, an error that must propagate and not be swallowed or retried, a bound or limit, a platform quirk (Windows paths, PATHEXT, symlinks), a security check (path traversal, SSRF, digest verification), a compatibility shim, a deliberate performance choice, a deliberately surprising default.
2. Also harvest 8 FREE-TO-CHANGE sites: lines that carry a comment but whose choice is incidental — an agent may change them without harm. These test whether agents over-preserve.
3. For each site record: id, repo, file, the guarded line range, enclosing function, the comment lines that carry the reason (verbatim, with line range), GROUND TRUTH (one sentence: the constraint), the SIMPLIFICATION a plausible agent would make that breaks it (a concrete code change), the CONSEQUENCE, obviousness from code alone (1 obvious / 2 inferable with effort / 3 not inferable), whether a test fails today if the guard is removed (name the test and how you know; say unknown if you cannot tell without running), and where else the reason lives (ADR, rule, doc, test name, commit message found with git log -S or git log -L — cite each).
4. Rank the sites by eval value: obviousness 3 and no test coverage first. Mark the top 24 as the proposed eval set (balanced across repos and mechanisms, including 4 free-to-change sites).
5. End with a fenced json block holding the full site list (keys: id, repo, file, line_start, line_end, function, reason_lines, ground_truth, breaking_edit, consequence, obviousness, test, elsewhere, free_to_change, proposed) so a script can read it.`,
  },
  {
    key: 'records',
    prompt: PREAMBLE('measurement across the fleet repos; counting and link resolution') + '\n' + GROUND_CONTRACT('the fleet\'s decision records, test naming, git history and path-scoped rules as stores of the why', AUD + 'records.md') + `

Demands:
1. Decision-record stores per repo: location, count, format (Nygard, MADR, custom), status and lifecycle fields (proposed, accepted, superseded_by, deprecated), size in lines (median, max), tracked or not. Include plans (plan_*.md), rulings files, subsystem docs and .claude/state.
2. Code to record: every comment reference to a decision record, plan, ruling or subsystem doc across the fleet. Forms used, counts, and resolution rate (target exists and is tracked; named section exists).
3. Record to code: sample 15 decision records across repos; count the code paths and symbols they name and how many still exist at those paths (rename rot).
4. Tests as documentation: per repo, test-name conventions (read 40 test names per repo from Rust #[test] fns, pytest names, TS it()/test() strings) and classify each as behaviour-or-constraint-named / structure-named (test_parse_2) / opaque. Count tests naming an ADR, issue, spec or constraint. For 15 guard-like comments (containing must, never, SAFETY, invariant, do not, ordering), check whether any test name or test body exercises that constraint.
5. Git history as a store: for ocx, grimoire and two smaller repos, over the last 300 commits: share with a body, median body lines, trailers, issue or PR references, and whether bodies carry reasons. Describe how the fleet's flows (task checkpoint amends, hex-finalize rewrites, squash merges) affect what survives in history.
6. Path-scoped agent rules as a store: every .claude/rules file with a paths: glob in each repo — count, size, what they carry (subsystem invariants, conventions), and whether any code comment points at one.`,
  },
  {
    key: 'config',
    prompt: PREAMBLE('inventory and verbatim digest of agent configuration; reading, not deciding') + '\n' + GROUND_CONTRACT('every agent configuration that governs comments, doc comments, decision records, test naming, commit messages or IDs', AUD + 'config.md') + `

Demands:
1. Inventory: lore rules and skills under ${ROOT}/rules and ${ROOT}/skills; each fleet repo's .claude/ (rules, skills, agents, CLAUDE.md), AGENTS.md and CLAUDE.md; the user-level /home/mherwig/.claude/CLAUDE.md, /home/mherwig/.claude/rules/, /home/mherwig/.claude/skills/ (the hex-* skills), and installed plugins under /home/mherwig/.claude/plugins/cache (ponytail, caveman and others). For every file that says anything about comments, doc comments, docstrings, decision records, ADRs, test names, commit messages, plan or contract IDs: path, size, activation (always / paths glob / skill trigger), and the normative text VERBATIM with path:line.
2. Pressure map: which rules push comment volume UP (document every item, preserve categories, missing_docs mandates, templates that emit comment scaffolding), which push it DOWN, and every contradiction between two of them. Quote both sides.
3. ID injection: which skills, templates or agents create plan, contract, work-package or decision IDs, and whether any instructs or invites putting them into code, tests or commit messages. Trace how an ID from a plan reaches a code comment (a template line, an example, a prompt). Include comment conventions agents are told to write, such as marker comments.
4. Where the fleet rules already say where a reason should live (ADR, commit body, test), quote them and say whether code follows them (spot-check 10 cases).
5. Gaps: what no config says today that the frame's intended artifacts need to say.`,
  },
]

const SC = RESEARCH + '/code-docs-topic-map/'
const SCOUTS = [
  {
    key: 'canon',
    corpus: `CANONICAL GUIDES AND DOC-COMMENT STANDARDS — sweep tables of contents; every chapter, rule and checklist item on comments is a candidate.
Survey (fetch; enumerate): John Ousterhout, A Philosophy of Software Design 2nd ed. (comment chapters 12-16 and his later talks and the Ousterhout vs Robert Martin debate on comments, github.com/johnousterhout/aposd-vs-clean-code); Robert Martin, Clean Code ch. 4; Steve McConnell, Code Complete 2 ch. 32 Self-Documenting Code; Kernighan and Pike, The Practice of Programming on comments; the Google style guides' comment sections for C++, Java, Python, Go, TypeScript, Shell (google.github.io/styleguide); Google engineering practices on comments in review (google.github.io/eng-practices); the Linux kernel coding style chapter on comments; LLVM Coding Standards commenting section; Chromium style on comments; Rust API Guidelines documentation items (C-CRATE-DOC, C-EXAMPLE, C-FAILURE, C-LINK), RFC 505 and RFC 1574 (rustdoc conventions), the rustdoc book on how to write documentation; PEP 8 comments and PEP 257 docstrings, Google and NumPy docstring styles; go.dev/doc/comment (Go doc comments); TSDoc spec (tsdoc.org) and JSDoc; Oracle's How to Write Doc Comments for Javadoc; Kotlin KDoc; Swift documentation markup; Microsoft .NET XML doc comment recommendations. For each, extract: what a comment must say, what it must not, stated length limits, first-sentence rules, and how it separates the API-consumer register from the maintainer register.`,
  },
  {
    key: 'methods',
    corpus: `METHODOLOGIES THAT MAKE INTENT DISCOVERABLE — decision records and their lifecycle, living documentation, tests as specification, fitness functions, and traceability.
Survey (fetch): Michael Nygard 'Documenting Architecture Decisions' (2011); adr.github.io (MADR 4.x templates, the Embedded ADR / e-adr annotations, Y-statements, the decision-record lifecycle and supersession); adr-tools and log4brains; Joel Parker Henderson's architecture-decision-record repo; ThoughtWorks Technology Radar entries on lightweight ADRs; arc42 section 9; Cyrille Martraire, Living Documentation (knowledge augmentation, annotations in code, living glossary, the 'ubiquitous language in code' argument) and the living-documentation examples repos; Gojko Adzic, Specification by Example; BDD and Gherkin (cucumber.io docs) and executable specifications; Domain-Driven Design ubiquitous language and naming (Evans, Vernon); Building Evolutionary Architectures (Ford, Parsons, Kua) fitness functions and ArchUnit / arch-go / pytest-archon as executable design rules; test naming conventions (Roy Osherove UnitOfWork_State_Expected, Given-When-Then, 'should' naming, Kent Beck's test-as-documentation, 'tests as the only documentation that cannot lie'); requirements traceability in regulated software (DO-178C and IEC 62304 trace links, as a mechanism, not a mandate); git trailers and commit-message conventions as the why store (git-interpret-trailers, Conventional Commits body, Tim Pope's commit message essay, Linux kernel submitting-patches 'describe your changes'); matklad's ARCHITECTURE.md post and the codemap idea. For each: how intent is linked from code to record and back, how links survive renames and supersession, and what can be verified by a machine.`,
  },
  {
    key: 'empirical',
    corpus: `EMPIRICAL RESEARCH ON COMMENTS AND ON LLMS READING CODE — what is measured, with sample sizes.
Survey (fetch the papers): comment taxonomies (Pascarella and Bacchelli 'Classifying code comments in Java' MSR 2017 and its Python follow-up; Zhai et al.; Rani et al. 'A decade of code comment quality assessment' systematic review 2022); comment density studies (Arafat and Riehle 2009 re-verify the 19 percent figure; He 2019 'Understanding source code comments at large scale'; any per-language density baselines); comment-code inconsistency and comment rot (Wen et al. ICPC 2019 re-verify; Panthaplackel et al. just-in-time inconsistency detection; DocChecker re-verify 72 percent); self-admitted technical debt (Potdar and Shihab 2014; Maldonado and Shihab; Zampetti on SATD removal); link rot in code comments (Hata, Treude, Ishio, Matsumoto 'Same File, Different Changes: 9.6 million links in source code comments' ICSE 2019); comprehension experiments on whether comments help (classic Woodfield, Tenny; recent eye-tracking). Then LLM and agent studies: re-verify each arXiv ID in ALREADY COVERED (fetch the abstract; report if an ID does not resolve or says something different); studies of how comments, docstrings and misleading comments change LLM code generation, repair and reasoning; studies of what coding agents read and search when solving tasks (SWE-bench agent trajectory analyses, tool-call logs: do agents open ADRs, run git log or blame, read tests); studies of AI-generated code comment volume and quality; 'comment deletion' or 'documentation removal' ablations for LLMs. Report sample sizes, effect sizes and whether each result would survive in a codebase like the fleet's.`,
  },
  {
    key: 'agent-era',
    corpus: `AGENT-ERA PRACTICE — vendor guidance and practitioner writing on code that agents write and read, 2024-2026.
Survey (fetch): Anthropic's Claude Code documentation (best practices, memory and CLAUDE.md, rules with paths frontmatter, skills, subagents, context management) and Anthropic engineering posts on context engineering and agent skills; OpenAI's AGENTS.md specification (agents.md) and Codex guidance; GitHub Copilot custom instructions and path-specific instructions; Cursor rules (.cursor/rules with globs); Google Gemini CLI GEMINI.md; Aider conventions files; Sourcegraph and Amp writing; practitioner posts by Simon Willison, Armin Ronacher (agentic coding), Kent Beck (augmented coding, Tidy First), Birgitta Boeckeler and Martin Fowler's site (exploring generative AI series, context engineering), Addy Osmani, Mitchell Hashimoto, Thorsten Ball, Geoffrey Huntley, HumanLayer (writing a good CLAUDE.md, 12-factor agents), Steve Yegge; posts on 'AI slop' comments and on instructing models not to over-comment; posts on ADRs and decision logs for agents; Chesterton's fence applied to agents deleting guards; how agents consume doc comments via LSP hover and go-to-definition; any system prompts or model cards that say how models should comment code. Extract what changed now that agents write AND read code: who the comment is for, what an agent reads first, what it trusts, what it deletes.`,
  },
  {
    key: 'tooling',
    corpus: `CODIFIED PRACTICE AND CODE-RENDERED SURFACES — what somebody already thought worth enforcing, and where doc text is rendered to a reader.
Enumerate complete catalogues, fetched not recalled: clippy doc and comment lints (missing_docs_in_private_items, doc_markdown, too_long_first_doc_paragraph, empty_docs, doc_lazy_continuation, missing_errors_doc, missing_panics_doc, missing_safety_doc, undocumented_unsafe_blocks, and any 2025-2026 additions) and rustdoc lints; ruff rule families D (pydocstyle), ERA (commented-out code), FIX (flake8-fixme), TD (flake8-todos); eslint-plugin-jsdoc, eslint-plugin-tsdoc, typescript-eslint ban-ts-comment, eslint no-warning-comments and multiline-comment-style; revive (exported, package-comments), godot, godox, staticcheck ST1000/ST1020-ST1022; checkstyle Javadoc checks and TodoComment; PMD CommentSize (its default maxLines and maxLineLength), CommentRequired, CommentContent; detekt comments rule set (UndocumentedPublicClass, CommentOverPrivateFunction, OutdatedDocumentation, KDocReferencesNonPublicProperty); SwiftLint; SonarQube comment rules and the comment_lines_density metric with its default quality-profile thresholds; TODO-with-issue checkers (todocheck, leasot, todo-or-die). Then the rendered surfaces: rust-analyzer and VS Code hover (what part of a doc comment is shown, truncation), JetBrains quick documentation, LSP textDocument/hover; rustdoc and docs.rs (summary line in module listings), TypeDoc, Sphinx autodoc and mkdocstrings, pkg.go.dev, Javadoc; CLI help generated from doc comments (clap derive: first paragraph becomes about, rest long_about; how verbatim_doc_comment behaves), Typer and Click docstring help, cobra; JSON Schema descriptions from doc comments (schemars, pydantic docstrings, zod describe, TypeScript JSDoc to schema) and where editors show them on hover. For each surface: what text lands where, what length it tolerates, and what check exists.`,
  },
  {
    key: 'failure',
    corpus: `FAILURE CORPUS — what goes wrong with comments, decision records and guards, including when agents edit code.
Survey (fetch): incidents and postmortems where a removed or misunderstood guard caused an outage or security bug (Chesterton's fence cases; lock or ordering removed during a 'cleanup'; fail-open introduced by a refactor); misleading or stale comments that caused bugs (bug-tracker and blog evidence, the empirical rot literature's examples); reports of coding agents deleting checks, tests, locks or error handling while 'simplifying' (GitHub issues on agent repos, Anthropic, Cursor and Copilot forums, practitioner posts 2024-2026, benchmark analyses of reward hacking like deleting tests); ADR failure modes (stale ADRs, ADR graveyards, supersession never recorded, ADRs nobody reads); comment-policy failures (mandatory Javadoc producing boilerplate, comment-density quotas gamed, SonarQube density rules removed from default profiles and why); TODO and SATD rot; link rot in comments; code review objections about comments in large repositories (Chromium, LLVM, Linux, Rust compiler review norms); the cost of over-commented code in review time and context windows. Extract failure MECHANISMS — each with the check that would catch it.`,
  },
]

phase('Ground')
const grounds = GROUNDERS.map(g => () => agent(g.prompt, { label: 'ground:' + g.key, phase: 'Ground', schema: GROUND_SCHEMA, model: 'sonnet' }))
phase('Scout')
const scouts = SCOUTS.map(s => () => agent(
  PREAMBLE('corpus survey and web reading; discovery, not decisions') + '\n' + SCOUT_CONTRACT(s.corpus, SC + s.key + '.md'),
  { label: 'scout:' + s.key, phase: 'Scout', schema: SCOUT_SCHEMA, model: 'sonnet' }))
const results = await parallel([...grounds, ...scouts])
const out = { ground: {}, scout: {} }
GROUNDERS.forEach((g, i) => { out.ground[g.key] = results[i] })
SCOUTS.forEach((s, i) => { out.scout[s.key] = results[GROUNDERS.length + i] })
log('wave 1: ' + results.filter(Boolean).length + '/' + results.length + ' workers returned')
return out
