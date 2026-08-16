---
title: Does a wrong path in a rule degrade the agent, or does it adapt?
topic: artifact-parameterization
agent: subagent (ad hoc)
model: sonnet
date_researched: 2026-08
scope: >
  Answers one question: when a rule/config file's verification cell (a shell
  command, most often a grep/rg invocation) names a path that is wrong or
  foreign to the repo it's loaded into, does that measurably degrade agent
  behavior, or does the agent silently route around it and the defect is
  cosmetic? Draws first on the existing grimoire-lore research corpus
  (ai-agentic-coding/*, ocx-codebase-audit/*), then on fresh primary-source
  fetches. WebSearch was exhausted for this session (200/200, shared budget
  across concurrent subagents) partway through this pass; findings beyond the
  internal corpus rest on three successful WebFetch calls to already-known
  URLs, not a fresh literature search — flagged inline where it matters.
---

# Does a wrong path in a rule degrade the agent, or does it adapt?

## Verdict

**(a) Dangerous — but the mechanism forks on one fact: does the wrong path
still resolve to something on disk.** If it does (a moved/renamed subsystem,
a stale glob after a refactor), the check runs clean with zero output and
zero error — this is a **structural vacuous pass**, indistinguishable from
"the guarded property doesn't exist," and the corpus's own prior work
(VERIFY-07, OCX's own "Unchecked Green" rule) already names this exact
pattern — unmatched globs and stale `paths:` — as the reference case for "a
check that never ran and a check that passed are indistinguishable from the
outside." If the path doesn't resolve at all, most tools (`rg`, `grep -r`)
fail loud (stderr + nonzero exit) — but that's only a real defense if the
executing agent inspects the exit code/stderr rather than reading "the
command completed, nothing printed" as done, which is precisely the failure
mode VERIFY-01 bans self-report to prevent. Neither branch is cosmetic; there
is no branch in which the agent reliably notices and corrects a wrong path
on its own — every source found treats "give the agent an exact, literal,
runnable command" as valuable *because* agents execute it verbatim rather
than re-deriving a correct one, which is the same property that makes a
wrong literal command dangerous rather than self-healing.

**Highest-severity failure mode: the vacuous pass on an existing-but-wrong
path** — the check produces a genuinely empty, error-free result that is
bit-for-bit identical to "verified clean," with no forcing function anywhere
in the pipeline (self-report, single-pass review, or fresh-context re-review)
that would prompt anyone — human or agent — to go look closer.

## Failure modes

Ranked most dangerous/likely first, matching the corpus's own convention
(ai-agentic-coding.md "AI-agent failure modes").

1. **Vacuous pass — the check structurally cannot go red.** A path that
   still exists on disk but no longer covers the guarded code (a subsystem
   renamed `src/`→`lib/`, a crate extracted out from under a workspace-root
   glob) makes the command exit clean with zero output. This is
   bit-identical to "the forbidden pattern is genuinely absent." No
   downstream signal distinguishes the two. *Evidence: VERIFY-07, OCX's own
   "Unchecked Green" rule, RUST-13's structural-guards failure mode #3.*

2. **Loud-but-ignorable error — the path doesn't exist at all.** `rg`/`grep
   -r` on a genuinely absent directory prints to stderr and exits nonzero —
   this is *not* silent at the tool level. It only fails to protect the
   pipeline if the executing agent (or a downstream harness) treats "tool
   call completed, nothing interesting in stdout" as sufficient evidence
   without reading the exit code/stderr — which is exactly the self-report
   failure mode the corpus's entire VERIFY tier exists to close. In a long
   transcript or a task-completion summary, this is easy to lose. *Evidence:
   VERIFY-01, Proof-or-Stop's "a green pipeline can coexist with a real
   defect... if downstream automation treats that green status as sufficient
   evidence, it may advance."*

3. **Literal execution beats adaptation — the agent runs what's written, not
   what's meant.** Every cross-repo convention surveyed (oxc, toasty,
   rust-analyzer, crates.io, Azure SDK, Anthropic's own CLAUDE.md guidance)
   converges on giving agents exact, fenced, copy-pasteable, narrowest-scope
   commands *specifically because* prose/goal phrasing gets paraphrased into
   something broader and slower, while a literal command gets run as
   written. That is the entire justification for writing exact commands
   instead of describing intent. A wrong path inherits the same
   verbatim-execution property in the wrong direction: nothing in the
   surveyed convention set, nor in anything fetched this pass, documents an
   agent silently reconciling a stale literal command against the real repo
   layout before running it. *Evidence: agent-config-in-rust-repos.md §2/§10
   ("prose descriptions of commands get paraphrased... into something that
   runs, slowly, against the whole workspace"), Anthropic's CLAUDE.md
   inclusion criterion "Bash commands Claude can't guess," CFG-05.*

4. **Broken enforcement semantics erodes trust in the rule, not just that
   line.** A verification cell that provably can't fire fails CFG-04's own
   bar ("specific enough to act on") the moment it's checked, and is a
   concrete instance of the more general undocumented-enforcement-semantics
   hazard: the model can't tell whether the rule is binding, and per prior
   local research it doesn't error on this — it silently doesn't act on the
   field. *Evidence: CFG-04, CFG-08, arcana-digest.md Finding 13.*

5. **Instruction dilution — unpruned stale content degrades adherence to
   the whole file, not just the broken cell.** Anthropic states directly
   that a bloated/decaying CLAUDE.md causes Claude to *ignore* real
   instructions, not merely waste tokens; the corpus's own AI-agent-failure-mode
   list names "rule-file bloat... monotonic growth with no deletions is the
   tell" as a distinct, observed compliance failure. A stale path nobody
   fixed is exactly that kind of unpruned content. *Evidence:
   anthropic-guidance-and-context-engineering.md §4 ("Bloated CLAUDE.md files
   cause Claude to ignore your actual instructions!"), ai-agentic-coding.md
   AI-agent failure mode #8.*

6. **Fresh-context review compounds the risk.** This org's own review
   pipelines (`swarm-review`, `codex-adversary`, and Anthropic's own
   documented pattern) deliberately run review in a fresh subagent context
   specifically so the reviewer isn't biased by having written the code
   (REVIEW-05). The same freshness removes any chance of "I remember this
   check is broken" — every review instance independently re-discovers, or
   fails to discover, the same vacuous pass from zero. This is an amplifier
   on failure mode 1, not an independent mechanism. *Evidence: REVIEW-05,
   skills-agents-inventory.md §"codex-adversary"/"swarm-review."*

7. **(Lower severity — the genuine "adapts" case) Wasted turns when a
   forcing function exists.** In the minority of cases where the agent *is*
   actively working the exact area a stale check covers — e.g. it just
   edited the guarded file and is explicitly asked "does this check still
   pass" — an empty result next to code it knows should trigger the check
   can read as suspicious, prompting investigation. This is real but
   narrow: it requires a forcing function (an adjacent, active task) that a
   standalone verification cell sitting in a rule file, read once and
   applied mechanically, typically does not have. This is the only branch in
   the whole survey that resembles "cosmetic" — and even here the cost is
   wasted debugging time, not correctness.

## Evidence

**Internal corpus (already established before this pass):**

- **VERIFY-07** (ai-agentic-coding.md): *"Prove a check can go red before
  trusting it green: demonstrate both outcomes on inputs you control... A
  check that never ran and a check that passed are indistinguishable from
  the outside; unmatched globs and `paths:` frontmatter fail exactly this
  way. A mutation that fails to red means the mutation missed, not that the
  check is fine."* This is the single most direct hit — it names path
  mismatches in rule/config files as the canonical example of the vacuous-
  pass class, independent of anything this pass added.
- **OCX's own "Unchecked Green" rule** (`quality-core.md`, digested in
  rules-inventory.md §2.4 and skills-agents-inventory.md §2): *"a green
  check result is only evidence if a red one was reachable... Applies to
  config whose failure mode is 'quietly does less' (unmatched globs,
  `paths:` on rule files — an explicit self-referential callout)... Cheapest
  tells named: a tolerated range of exit codes, a text assertion where a
  parser exists, a skip message naming a cause it never observed."* This is
  not a research team's hypothesis — it's a rule OCX's own authors wrote
  into their live rule file, using their own `paths:` frontmatter mechanism
  as the worked example of exactly this hazard. That it exists at all is
  indirect but strong evidence the team was bitten by this class of bug
  badly enough to codify a countermeasure.
- **RUST-13 / quality-rust.md's "Structural guards" section** (rules-inventory.md
  §2.1, ~75 lines in OCX's own live rule): five previously-*observed*
  failure modes for source-text-asserting tests, most directly #3: *"A
  literal string tied to one exact source layout... stops matching the
  moment `cargo fmt` or any refactor rewraps it, and a guard matching
  nothing still reports green."* This is production incident history, not a
  hypothetical, converging independently with VERIFY-07's benchmark-sourced
  conclusion.
- **VERIFY-01**: self-report is inadmissible as evidence precisely because a
  completed tool call with nothing alarming in it is not distinguishable
  from a genuinely clean result unless the exit code/stderr is actually
  read — this is the general principle failure mode 2 is a specific
  instance of.
- **CFG-05 / agent-config-in-rust-repos.md §2 & §10**: the cross-repo
  convention of exact, fenced, narrowest-scope commands exists *because*
  "agents left to choose default to the broadest, slowest correct command;
  prose descriptions of commands get paraphrased into something that runs."
  This establishes the verbatim-execution property that makes a wrong path
  dangerous rather than self-correcting (failure mode 3).
- **CFG-04, CFG-08, arcana-digest.md Finding 13**: undocumented/broken
  enforcement semantics is "the worst config failure mode for an LLM
  consumer... the model doesn't error — it silently doesn't act on the
  field, and two separate reads of the same file can reach different
  conclusions about whether a value is binding."
- **anthropic-guidance-and-context-engineering.md §4**: *"Bloated CLAUDE.md
  files cause Claude to ignore your actual instructions!"* — a direct,
  first-party statement that decaying/unpruned content degrades compliance
  with the rest of the file, not just the broken line.
- **REVIEW-05**: review must run in a fresh context specifically so the
  reviewer isn't biased by prior work — the same property removes any
  "institutional memory" that a given check is known-broken.

**Fresh primary-source fetches (this pass — WebSearch was exhausted at
200/200 session-wide before these could be preceded by a search, so these
are direct fetches of already-known/cited URLs, not the product of a new
literature search):**

- [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
  (re-fetched to check for anything on literal-vs-adapted execution beyond
  what the corpus already digested): confirms the existing digest verbatim
  — *"Give Claude something that produces a pass or fail, and the loop
  closes on its own"* and *"Have Claude show evidence rather than asserting
  success... it works for sessions you weren't watching"* — both reinforce
  that the design assumption throughout is a check the agent runs and reads
  literally, with no separate mechanism described anywhere for the agent
  reconciling a written command against the actual repo before running it.
  Nothing new on the specific empty-output case was found on this page.
- [Proof-or-Stop, arXiv:2607.14890](https://arxiv.org/html/2607.14890)
  (re-fetched with a narrower prompt targeting the vacuous-pass question
  specifically): the paper does not taxonomize empty-output false negatives
  by name, but its core framing generalizes directly — *"a green pipeline
  can coexist with a real defect. If downstream automation treats that
  green status as sufficient evidence, it may advance, merge, and mark the
  work done."* The paper's receipt-identity mechanism (`⟨cmd, args, cwd,
  exit, outputDigest⟩`) is itself an implicit admission that exit code and
  output digest, not just "ran without visible error," are what must be
  checked — consistent with failure mode 2's fix.
- [DeepMind, "Specification gaming: the flip side of AI ingenuity"](https://deepmind.google/discover/blog/specification-gaming-the-flip-side-of-ai-ingenuity/):
  no example matches the scenario exactly, but the post's framing sharpens
  the verdict: a stale-but-existing verification path is a **specification
  gap** (a passive false negative baked into the check's construction), not
  active gaming by the agent — the agent isn't exploiting anything, the
  check was simply built so it can never observe the failure it claims to
  guard against. This is the correct theoretical label for failure mode 1
  and rules out "the agent is doing something clever/adaptive" as a
  charitable reading — there's no cleverness involved on either side; the
  check is just structurally unable to distinguish clean from broken.

**Explicitly not found:** no source in the internal corpus or in this pass's
fetches documents an agent — the executing model itself, unprompted —
noticing that a literal path in an instruction doesn't match the real repo
and silently substituting the correct one before running the command. The
one adjacent finding (CFG-05, agents paraphrasing *prose* into a broader
command) moves in the opposite direction: away from precision, not toward
it. Given the search-budget constraint noted above, treat this absence as
suggestive, not conclusive — a fully separate, targeted search pass focused
on this exact question (rather than one that ran out of budget partway
through it) is the natural follow-up if a firmer negative is needed.

## Implications for rule authoring

- **Prove every verification cell can go red, and prove it against the repo
  it will actually ship in — not the repo it was copied from.** This is
  VERIFY-07 applied literally to the porting scenario this whole research
  effort exists for (ai-agentic-coding.md's "Applied to OCX" section is
  built around porting rules between grimoire/ocx/ocx-mirror). A rule
  copied cross-repo with its verification cells unchanged is presumptively
  broken until each cell is re-proven red-then-green against the new repo's
  real layout — this needs to be a required step in the porting/publishing
  workflow, not an "if it looks plausible" spot-check.
- **Prefer commands that fail loud on a missing path over ones that degrade
  silently, and don't rely on the tool's default behavior to do this for
  you.** `rg`/`grep -r` already fail loud on a *nonexistent* path (failure
  mode 2) but not on an *existing-but-wrong* one (failure mode 1, the
  higher-severity case) — the fix for mode 1 has to come from the rule
  design, e.g. deriving the scanned path set from the repo itself (`find .
  -name Cargo.toml -exec dirname {} \;`, or `cargo metadata`'s workspace
  member list) rather than hardcoding `src/ crates/`. A derived path can't
  go stale the way a hardcoded one can.
- **Don't trust bare-command phrasing alone to survive a port; pair it with
  a one-sentence goal.** CFG-05 is right that a literal fenced command beats
  prose *for getting the intended command run*, but that same literalness
  is what makes a stale command dangerous rather than self-correcting
  (failure mode 3). The fix isn't to abandon literal commands — it's CFG-07's
  existing "route content by kind" discipline: state the goal in one
  sentence *and* give the exact command, so the goal survives even if the
  literal command bit-rots, and a human or reviewing agent has something to
  reconcile against when the two disagree.
- **A hardcoded foreign path is the same class of defect as CFG-01's banned
  independently-edited copy.** CFG-01 blocks two copies of an instruction
  file that can silently diverge; a rule with a path baked in from a
  different repo is a one-line fork of the same kind, and it diverges the
  moment the target repo's layout differs even slightly — treat it with the
  same severity, not as a lesser cosmetic nit.
- **Because review runs in a fresh context by design (REVIEW-05), don't
  assume a known-broken check gets caught by the next reviewer.** If a
  verification cell is discovered broken, fixing it in the rule file is the
  only mechanism that reliably closes the gap — flagging it once in a review
  comment does not, since the next fresh-context review has no memory of
  that comment.

## Sources

Internal (grimoire-lore research corpus, read in full for this pass):

- `.agents/research/ai-agentic-coding.md`
- `.agents/research/ai-agentic-coding/llm-rust-failure-modes.md`
- `.agents/research/ai-agentic-coding/autonomous-verification-loops.md`
- `.agents/research/ai-agentic-coding/anthropic-guidance-and-context-engineering.md`
- `.agents/research/ai-agentic-coding/agent-config-in-rust-repos.md`
- `.agents/research/ai-agentic-coding/arcana-digest.md`
- `.agents/research/ocx-codebase-audit/crate-architecture.md`
- `.agents/research/ocx-codebase-audit/errors-async-security.md`
- `.agents/research/ocx-codebase-audit/exit-codes-and-cli.md`
- `.agents/research/ocx-codebase-audit/rules-inventory.md`
- `.agents/research/ocx-codebase-audit/skills-agents-inventory.md`

External (fetched this pass):

- [code.claude.com/docs/en/best-practices](https://code.claude.com/docs/en/best-practices) — Claude Code product docs, re-fetched for verbatim-execution evidence.
- [arxiv.org/html/2607.14890](https://arxiv.org/html/2607.14890) — Proof-or-Stop, re-fetched with a question narrowed to the vacuous-pass/empty-output case specifically.
- [deepmind.google/discover/blog/specification-gaming-the-flip-side-of-ai-ingenuity](https://deepmind.google/discover/blog/specification-gaming-the-flip-side-of-ai-ingenuity/) — used to correctly label the failure class (specification gap, not agent exploitation).

**Constraint on this pass:** WebSearch hit its session-wide cap (200/200,
shared across concurrently running subagents in this session) after four
queries returned nothing, before a query targeted specifically at "does an
LLM agent adapt a stale instruction path to the real repo" could be run.
Everything past that point came from WebFetch against URLs already known
from the internal corpus or guessed from domain knowledge, not from a fresh
search. The verdict above is well-triangulated internally (an academic
source, a cross-repo convention survey, and OCX's own incident-driven rule
converge independently on the same conclusion) but a follow-up pass with a
working search budget, aimed specifically at empirical agent-eval writeups
(SWE-bench-style tool-use-reliability studies) rather than general agentic-
coding guidance, would be the way to firm up the "explicitly not found"
claim above into a stronger negative.
