# Rule Distillation

You loaded this file because the research is done and you are turning
consolidated rulesets into artifacts an agent loads while it codes.

Contents: [The Funnel](#the-funnel) · [Selection](#selection) ·
[Placement](#placement) · [The Index + Support Directory Shape](#the-index--support-directory-shape) ·
[Rule Anatomy](#rule-anatomy) · [Severity](#severity) ·
[Writing for an Agent Reader](#writing-for-an-agent-reader) ·
[Portability](#portability) · [Review Skills](#review-skills)

## The Funnel

Research produces hundreds of candidate rules. Ship dozens.

```
candidates (worker artifacts)  ~200-400
   └─ merged ruleset (consolidations)  ~120-200
        └─ shipped rules (artifacts)  ~60-100
             └─ always-loaded lines  < 200 per file
```

Each narrowing is a decision you must be able to defend. The research
corpus keeps the discarded material — nothing is lost, it is deferred to
a file nobody pays context for.

## Selection

Keep a rule when **all four** hold:

1. **An agent gets it wrong without being told.** Not "true", not "good
   practice" — *wrong by default*. The consolidations' "AI-agent failure
   modes" sections are the ranked source for this.
2. **It is checkable.** A command, a lint, a grep, or a named reading
   heuristic that a reviewer can apply without re-deriving the rule.
3. **It changes a diff.** If following it and ignoring it produce the
   same code, it is commentary.
4. **It does not contradict a sibling rule.** Two contradicting rules mean
   the model picks one arbitrarily — worse than shipping neither.

Drop, without regret: language-tutorial restatements, rules that only
repeat what the linter already denies (state the lint config instead —
one line beats a paragraph), aspirational architecture with no
verification, and anything whose only support is a single blog post.

Special case worth keeping despite failing (2): a rule that **pins a
project decision** — the exit-code table, the error taxonomy, the crate
layout. Its value is that it is *agreed*, not that it is derivable. Mark
these clearly; they are the ones a future reader must not re-litigate.

## Placement

| The content is… | Ships as |
|---|---|
| A standard that applies while editing files of one kind | Glob-scoped rule |
| Depth behind that standard — tables, worked examples, decision trees | A file in the rule's **support directory**, loaded on demand |
| A procedure with steps, run occasionally (a review, a refactor, a migration) | Skill |
| A mechanical check that must happen every time | Script, hook, or CI job — never prose |
| A pinned project decision (codes, taxonomies, layouts) | The scoped rule's index, so it is never missed |
| Language knowledge the model already has | Nothing. Delete it |

The split that matters: **rules carry standards, skills carry
procedures.** "Never hold a lock across an await" is a rule. "Review this
diff for concurrency defects" is a skill. Writing the second as a rule
means paying for it in every session; writing the first as a skill means
it fires probabilistically when it should be a constant.

### Narrow the Glob Only When It Cannot Miss

A second rule with a tight glob looks like precision and is usually a
guess about filenames. `**/main.rs`, `**/exit_code.rs`, `**/cli/**/*.rs`
scopes an exit-code contract to three names that a project is free not to
use — `error_codes.rs`, `src/app/`, a classifier that lives beside the
error type. When the guess is wrong the rule does not warn, does not
error, and does not load: the agent edits the exact file the rule governs
with the rule absent, and nothing in the transcript says so.

Measure it before you split. Count the files that *contain the concept*
against the files the glob matches — in one real case a 20-file concept
matched 3 — and note that the ratio degrades on every rename, silently
and in one direction only.

So: a glob narrower than the language's own file extension has to be
underwritten by something structural, not by convention. `**/Cargo.toml`
is safe because the build system requires the name. `**/*.test.ts` is
safe where the test runner requires the suffix. A module *name* almost
never is.

The alternative costs one line. Widen the rule to the language extension,
keep the depth in the support directory, and put a subject-worded pointer
in the index — *"ending a process, choosing a status, or writing to
stdout? read this"*. The index always loads, the pointer describes what
the reader is doing rather than what the file is called, and the depth is
still paid for only when followed. Trade a guaranteed load plus one
indirection for a conditional load with none.

Fewer artifacts also means fewer things to install and version, and the
opt-out granularity you give up matters only if a real adopter wants half
the set. Do not carry that cost for a hypothetical one.

## The Index + Support Directory Shape

A language's quality surface does not fit in 200 lines, and splitting it
into eight sibling rules that all glob `**/*.<ext>` just rebuilds the
monolith with extra steps — every one of them loads together.

Use one index plus a support directory:

```
rules/
  <lang>-quality.md        # the index: non-negotiables + routing table
  <lang>-quality/          # depth, read on demand
    architecture.md
    errors.md
    async.md
    testing.md
    security.md
  <lang>-manifests.md      # separate rule: genuinely different glob
```

- The **index** holds only what must be true in every edit: the shortest
  possible non-negotiable list, the verification command, and a routing
  table saying which depth file to read for which task. Under 200 lines.
- **Depth files** hold the rule tables, worked examples, and decision
  trees. One topic per file, a table of contents in any file over 100
  lines, and no chains — depth files never point at other depth files.
- A **second rule file** is justified only by a genuinely different glob
  (manifests, CI config, generated code). Same glob ⇒ same rule.

Route by *task*, not by *topic name*: "writing a new module or moving
code between them → `architecture.md`" beats "architecture →
`architecture.md`". The agent knows what it is doing; it does not
reliably know what you filed it under.

## Rule Anatomy

Every shipped rule is one row:

| Field | Rule |
|---|---|
| ID | Stable, topic-prefixed (`ASYNC-07`). Review output cites it; never renumber |
| Rule | One imperative sentence. Says what to do, not what to consider |
| Rationale | One line. The failure it prevents, not the principle it honours |
| Verification | The exact command, lint name, or grep. No verification, no rule |
| Severity | MUST / SHOULD / CONSIDER |

Group rows by the check that catches them — every rule a single
`clippy` invocation enforces belongs in one block with that invocation
stated once, not restated per row.

Where the mistake is easier shown than described, add a **minimal**
wrong/right pair. Two three-line snippets, not a tutorial. Snippets are
the most expensive content per byte in the file; earn each one.

## Severity

| Tier | Meaning | Obligation |
|---|---|---|
| MUST (Block) | Merge-blocking. Correctness, security, or a pinned contract | Fix before the change lands |
| SHOULD (Warn) | Fix unless there is a stated reason | Reviewer may accept a justification in the diff |
| CONSIDER (Suggest) | An improvement worth naming | Never blocks; never re-raised after a decline |

Tiering is what makes a review's output actionable: a finding inherits
its rule's tier, so "12 findings" becomes "2 blockers, 4 warnings, 6
suggestions" without further judgment. Keep the MUST list short enough
that a blocked change is genuinely unusual — a rule set where everything
blocks trains the agent to negotiate with all of it.

## Writing for an Agent Reader

- **Imperative and specific.** "Bound every fan-out whose length is
  wire-controlled" beats "be careful with concurrency".
- **Tables over prose** for anything enumerable. Prose for the one
  paragraph explaining a non-obvious tradeoff.
- **One term throughout.** Pick "work package" or "task" or "unit" and
  never mix them; synonym drift makes rules read as separate concepts.
- **No hedging.** "Generally", "usually", "consider possibly" all license
  the agent to skip. If the rule has exceptions, name them.
- **Name the failure, not the virtue.** Rules justified by a concrete
  bad outcome survive contact with a deadline; rules justified by
  "clean code" do not.
- **Date the volatile parts.** Version-specific guidance carries the
  version and the era it applies to.
- **Front-load.** The most critical content goes first: partial reads and
  post-compaction re-attachment both favour the top of the file.

## Portability

If the artifact will be published for other repositories:

- Strip project paths, internal type names, ADR references, and helper
  catalogs — or parameterise them explicitly ("your workspace's single
  env-composition helper").
- Keep the *mechanism*, drop the *instance*: "own one exit-code enum per
  workspace, aligned with sysexits" is portable; the exact numeric slot
  your project assigned to a policy refusal is not — present it as an
  example the adopter names for themselves.
- Globs are the first thing to break in someone else's tree. Prefer
  extension globs over directory globs, and say in the file which glob it
  expects to be installed with.
- A pinned project decision that survives export becomes a *default the
  adopter may override*. Say which it is.

## Review Skills

The rules make an agent write better code; a review skill makes it find
what the rules missed. Build it from the same rulesets:

- **Dimensions, not a flat checklist.** One pass per concern
  (correctness, contract, concurrency, security, tests, docs) with its
  own rules loaded. A single mega-pass finds style nits and misses bugs.
- **Evidence or it did not happen.** Every finding cites file:line, names
  the rule ID it violates, and states a concrete failure scenario —
  inputs and the wrong outcome. A finding that cannot state one is a
  style opinion.
- **Adversarial verification.** Before reporting, try to *refute* each
  finding. This is where false positives die, and false positives are
  what make a reviewer ignorable.
- **Severity from the rule, not from the reviewer's mood.**
- **Keep the reviewable unit small.** Large diffs get a fraction of the
  real scrutiny per line, no matter who reviews them. A review skill
  should say so and refuse to pretend otherwise on a 2,000-line diff.
- **Bounded duplication is allowed here.** Repeating the handful of
  merge-blocking rules inside the review skill — a few lines, not the
  rule file — is a deliberate hedge against the scoped rule not having
  fired. Duplicate the MUST list; never duplicate the depth.
