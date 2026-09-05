---
title: Machine readers and prior art, consolidated ruleset
topic: docs-machine-readers-and-prior-art
family: DOC-AGENT
model: claude-opus-5
consolidates:
  - docs-machine-readers-and-prior-art/agent-readable-surface.md
  - docs-machine-readers-and-prior-art/prior-art-adoption-and-self-validation.md
  - docs-topic-map/wave2-declaration-key.md
  - docs-topic-map/wave2-severity-ledger.md
  - docs-topic-map/wave2-calibration-a.md
  - docs-topic-map/wave2-calibration-b.md
grounded_in:
  - docs-audit/config-inventory.md
  - docs-audit/docs-shape.md
  - docs-audit/tested-examples-mechanism.md
  - docs-audit/ux-observability-posture.md
  - docs-frame.md
  - docs-topic-map/wave1-critique.md
date: 2026-09-05
revised: 2026-09-05
wave: 2
---

# Machine readers and prior art

This group owns two questions the program cannot dodge. What does a docs site
owe an agent that reads it. And what do the existing AI docs-writing artifacts
already encode, so this program adopts rather than reinvents.

## Verdict

1. **The Markdown twin is the requirement. `llms.txt` is a courtesy.** Every
   vendor with real usage data converges on per-page Markdown, and two live
   production fetches confirm it resolves ([Stripe](https://docs.stripe.com/payments.md),
   [Laravel](https://laravel.com/docs/12.x/installation.md)). Meanwhile 97% of
   published `llms.txt` files logged zero requests in May 2026
   ([mecanik.dev](https://mecanik.dev/en/posts/does-llms-txt-do-anything-yet/)).
   This resolves the conflict the map assigned to this group.
2. **The twin is nearly free here and must not become a project.** 9 of 9 real
   fleet sites build from Markdown source, so the twin is the pre-render file
   copied into the build output. Cloudflare and Mintlify built HTML-to-Markdown
   converters because their content was not Markdown. This fleet's is.
3. **The twin has no known implementation, and that is a documented gap.** No
   fleet generator emits a per-page `.md` twin into build output without a
   custom plugin. Wave 2 demoted DOC-AGENT-01 to SHOULD for exactly that reason.
   The requirement returns to MUST when one working configuration exists on
   MkDocs Material, VitePress and mdBook.
4. **Progressive disclosure was never in conflict with agent byte cost.** It is
   one collapse mechanism scored against two audiences. Collapse for the human
   render, flatten for the twin, from one source. The build step, not the
   author, carries the obligation.
5. **The "31x bytes" number is retired.** A live re-fetch of Cloudflare's own
   page on 2026-09-05 no longer carries the language the grounding audit quoted.
   The companion blog measures 80% instead. Ship mechanisms, never a vendor's
   byte ratio. That figure would have been stale on the day it shipped.
6. **A label is inert. An instruction is a lever.** Verified live against the
   primary source. An explicit stated preference moved compliance from 5/15 to
   15/15, while labelling an identical block "For agents" moved 34.5% to 34.5%
   ([passo.uno](https://passo.uno/if-you-are-an-agent-read-this/)). So the rule
   permits agent-directed prose only when it issues a directive.
7. **A pattern that matches a bare product noun is a broken pattern.** This
   family's own callout grep produced 22 fleet hits and 22 false positives,
   because "agent" is this catalog's product noun. Requiring the literal
   `for ` or `note for ` prefix removes all 22 and loses nothing.
8. **Static-file mechanisms only, fleet-wide.** `Accept`-header negotiation and
   custom response headers need an edge layer no fleet site runs. Measured:
   0 of 9 sites carry a `_headers` file or an edge-function config. A rule that
   requires them requires infrastructure that does not exist.
9. **Do not absorb AGENTS.md, `skill.md`, or an MCP server.** Three unconverged
   formats, a different audience, and no single check validates them end to end.
   Point at them. This was DOC-AGENT-09 and it is prose now, because an adopter
   cannot violate a scope note.
10. **Prior art is a dependency, not a template.** Four humanizer skills
    re-derive one Wikipedia essay. Vale already ships that taxonomy as
    enforceable YAML. Cite and import. Do not write a fifth wordlist.
11. **Adopt GitBook's split, and it resolves the sameness conflict the map
    assigned here.** Numbered rules with an inline command are enforced.
    Voice and tone stay unnumbered and advisory. A project can sound like itself
    without dropping the checkable half.
12. **Reject the fabricated-completion pattern outright.** VoltAgent's two
    subagents template a sign-off stating "92% satisfaction, 73% reduction in
    support tickets" with nothing measuring it. That is worse than an
    unfalsifiable threshold. It manufactures evidence of meeting one.
13. **Adopt obra/superpowers' RED-GREEN-REFACTOR as this program's own
    verification story.** 0 of 14 surveyed artifacts test whether their rule
    changes agent behaviour. One does. Its method transfers directly.
14. **Anthropic's reader simulation is a second layer, never the story.**
    `doc-coauthoring` ships zero lints. On its own it would not have caught the
    555 inline-style links or the 343 untagged fences this fleet already
    measured ([docs-shape.md §5, §6](docs-audit/docs-shape.md)).
15. **Every unverifiable rule says so in words.** The fleet ships ~92 docs-prose
    rules with 2 runnable checks and labels the gap nowhere. Silence about a
    missing check is the exact failure this group exists to stop.
16. **Three meta-rules, three separate objects.** DOC-AGENT-16 owns the marker
    string. DOC-PLAIN-17 owns the severity cap. DOC-OBS-15 owns the check that
    is written down and never wired up. After the wave-2 split they do not
    overlap at all.
17. **A number needs a shape, not just a source.** DOC-AGENT-12 asked for a
    named source and got a reading task. It now demands the literal form
    `N (<formula, tool or citation>)`, which a grep can read. 21 of 132 rows
    fail it today.
18. **A check that has never failed is not a check.** Measured against this
    program's own set, one check compares a count to itself, one passes on a
    beacon with no listener, and one reports "cannot verify" on 8 of 9 sites.
    Every check now ships with a fixture it must reject.
19. **The declaration key does not reach this family.** No DOC-AGENT rule reads
    or writes `doc_type` or `doc_tier`. The fleet carrier is a comment line in
    the first 12 lines of the file, never YAML frontmatter, and rules that scope
    by type call `checks/doc-declaration.sh`.

## The ruleset

`applies to` names page types where the rule is page-scoped. Rules governing the
shipped configuration itself are marked as such. A measured row carries its hit
count and false-positive rate from the wave-2 calibration.

### Agent-readable surface

**DOC-AGENT-01.** Publish a Markdown twin of every documentation page at a
predictable URL, and build it by copying the Markdown source into the build
output.
*Rationale:* Without a twin an agent parses HTML chrome to reach content it
could have read directly. A conversion pipeline buys nothing when the source is
already Markdown.
*Verification:* A build-time script lists every URL in the generated
`sitemap.xml` or nav, asserts a `.md` sibling exists in the build output for
each, and fails the build on any gap. The count of `docs/**/*.md` source files
equals the count of `.md` files in the build output directory.
*Measured:* twin present on 0 of 9 real sites. Markdown-source precondition
holds on 9 of 9.
*Severity:* SHOULD · *Evidence:* measured demand, no implementation
· *Applies to:* all
*Note:* demoted from MUST by the wave-2 severity ledger gate G5. No fleet
generator has a known twin implementation. MUST returns when one ships.

**DOC-AGENT-02.** RETIRED, merged into DOC-AGENT-01.
*Reason:* Copying the source rather than converting the HTML is DOC-AGENT-01's
implementation, not a second obligation.
*Severity:* RETIRED · *Evidence:* measured · *Applies to:* n/a

**DOC-AGENT-03.** Ensure content collapsed behind a `<details>` block, a tab,
or an accordion appears unfolded in that page's Markdown twin.
*Rationale:* A twin generated from the rendered page silently deletes content an
agent has no other route to.
*Verification:* A build-time test strips markup from each collapsed block's
inner text and asserts a normalized substring of it is present in the page's
twin.
*Severity:* CONSIDER · *Evidence:* argued · *Applies to:* all

**DOC-AGENT-04.** Publish `llms.txt` in the spec's shape as a recommended
index, never as the required agent-readability mechanism.
*Rationale:* The file costs almost nothing and satisfies one real consumer.
Treating it as the answer leaves the content itself unserved.
*Verification:* If the file exists, assert line 1 matches `^# `, a line matching
`^> ` appears before the first `^## `, and at least one `^## ` section contains
a Markdown link.
*Measured:* 0 of 9 sites publish the file at repo root, `website/public/` or
`docs/`. No false positives possible, the check is an existence test.
*Severity:* SHOULD · *Evidence:* normative and measured · *Applies to:* all

**DOC-AGENT-05.** Name the specific consumer when justifying an agent-facing
mechanism, never aggregate AI-traffic or search-visibility language.
*Rationale:* Generic AI-crawler traffic is 1.1 percent (mecanik.dev retrieval-bot
share, May 2026) of the requests that reach these files. A rule justified by it
will be believed and still be wrong.
*Verification:* `grep -nE 'AI traffic|AI crawlers|search visibility' <file>`
lists candidates. Then `unverified: reading heuristic`. A reviewer confirms each
hit names who reads the file in the same sentence.
*Severity:* SHOULD · *Evidence:* measured · *Applies to:* all
*Note:* demoted from MUST. The per-hit half is a reviewer judgement, so
DOC-PLAIN-17's cap applies.

**DOC-AGENT-06.** Give every agent-directed callout an imperative instruction,
or delete the callout.
*Rationale:* A bare "For agents" label changed model behaviour by nothing. An
explicit stated preference changed it completely.
*Verification:* `grep -nE '\b(for |note (for|to) )agents?\b' <file>` over
headings and callouts. The `for ` or `note for ` prefix is mandatory. For each
hit, assert the following paragraph contains a verb from the allowlist: use,
run, prefer, install, follow, call, fetch.
*Measured:* the earlier optional-prefix pattern returned 22 hits across 249
pages and 22 of 22 were false positives (100 percent). The required-prefix
pattern returns 0 fleet hits and still matches a "For agents:" fixture.
*Severity:* SHOULD · *Evidence:* measured, n=15 on one model
· *Applies to:* all
*Note:* demoted from MUST. The behaviour result rests on 15 runs of one model.

**DOC-AGENT-07.** Place any agent-directed instruction before the page's second
`##` heading (Mintlify: reading agents truncate long pages).
*Rationale:* A reading agent truncates a long page. An instruction it never
reaches is an instruction that does not exist.
*Verification:* For each hit found by DOC-AGENT-06's required-prefix pattern,
assert its line number falls before the second `^## ` heading in the source file.
*Measured:* 0 real hits fleet-wide, so the rule has no current target.
*Severity:* SHOULD · *Evidence:* measured · *Applies to:* all

**DOC-AGENT-08.** Require only static-file mechanisms unless the site's own
host config proves it can serve more.
*Rationale:* Content negotiation and custom response headers need an edge layer.
Requiring them on a bare static host requires infrastructure nobody built.
*Verification:* `curl -s -o /dev/null -w '%{http_code}' <page>.md` gates the
static requirement everywhere. The negotiation check runs only behind a per-site
flag set when a `_headers` file or an edge-function config exists in the repo.
*Measured:* 0 of 9 sites carry a `_headers` file or an edge-function directory,
so the flag stays off and the rule holds with no false positives.
*Severity:* MUST · *Evidence:* measured · *Applies to:* all

**DOC-AGENT-09.** RETIRED. It was a scope note about this artifact's own
contents, not a rule an adopter can violate.
*Reason:* The obligation now reads as Verdict item 9. Keep `AGENTS.md`,
`skill.md` and an MCP server out of the required-mechanism list and
cross-reference them.
*Severity:* RETIRED · *Evidence:* asserted · *Applies to:* n/a

### Prior art and self-validation

**DOC-AGENT-10.** Cite or import an existing published tell taxonomy instead of
authoring a new banned-word list.
*Rationale:* Four skills re-derived one Wikipedia essay. A fifth copy cannot be
updated when the source moves.
*Verification:* Grep the shipped wordlist for a citation URL to its source
taxonomy. A list with no cited ancestor fails rule review.
*Measured:* DOC-PLAIN-12's marketing wordlist fails this rule today. It cites no
ancestor.
*Severity:* MUST · *Evidence:* codified · *Applies to:* all, and this rule set

**DOC-AGENT-11.** Date every banned term and re-check its hit rate before a
refresh ships.
*Rationale:* "Delve" usage dropped sharply in 2025. A rule banning it in 2026
catches nothing and costs a reader's trust.
*Verification:* Each term carries an `(added: <date>, last-checked: <date>)`
comment. A script re-runs the grep over recent real pages and flags near-zero
hit rates for review.
*Measured:* the calibration found 17 of 18 DOC-PLAIN-10 wordlist hits were
ordinary technical vocabulary, which is the failure this rule predicts.
*Severity:* SHOULD · *Evidence:* measured · *Applies to:* all, and this rule set

**DOC-AGENT-12.** Write every numeric threshold as `N (<formula, tool or
citation>)` on the same line.
*Rationale:* A number with no named source cannot be reproduced, argued with, or
failed against. Requiring a fixed shape turns a reading task into a grep.
*Verification:* Extract each number from a Rule or Verification cell and assert
a parenthesised source follows it on the same line. Fail rule review otherwise.
*Measured:* 21 of 132 rows fail today (wave-2 severity ledger, finding 15). The
wave-1 critique found 18 of the same rows.
*Severity:* MUST · *Evidence:* measured · *Applies to:* all, and this rule set

**DOC-AGENT-13.** Never gate a merge on a score produced by the same model call
that wrote the text.
*Rationale:* A model grading its own output in one session inflates the result.
The tool's own author says so.
*Verification:* `unverified: reading heuristic`. A reviewer traces whether the
score's inputs come from an independent tool call. If they do not, it may hint
locally and must not gate.
*Severity:* SHOULD · *Evidence:* codified · *Applies to:* this rule set

**DOC-AGENT-14.** Never state a metric in a completion message unless a named
command measured it.
*Rationale:* A templated success narrative manufactures evidence that a
threshold was met. That is worse than having no threshold.
*Verification:* Grep the agent or skill file for a first-person completion
message carrying a percentage or a count. The match window must open with a
first-person self-reference such as `I have`, `I've`, `Successfully completed`
or `This session`, never a bare verb. Each hit must sit adjacent to the tool
invocation or file reference that produced it.
*Measured:* 1 hit across 1,089 fleet agent and skill files, and that 1 of 1 was
a false positive under the older bare-verb pattern. It was a cited third-party
statistic.
*Severity:* MUST · *Evidence:* codified · *Applies to:* this rule set

**DOC-AGENT-15.** Split the shipped rule into a numbered enforced tier and an
unnumbered advisory tier, and put voice and tone in the advisory tier.
*Rationale:* One shared voice across many projects makes their docs sound
identical. Dropping the checkable rules to avoid that would cost more.
*Verification:* The rule file carries two labelled sections. Grep confirms every
row under Enforced has an ID and an inline command, and that no voice or tone
guidance appears there.
*Severity:* SHOULD · *Evidence:* codified · *Applies to:* this rule set

**DOC-AGENT-16.** Mark every rule that cannot be checked mechanically with the
literal string `unverified: reading heuristic`.
*Rationale:* An unlabelled missing check reads as a check. The fleet already
ships 90 of those.
*Verification:* Grep every rule row. A row with no runnable command must carry
the literal marker. A row carrying both is allowed only when the marker names
the clause it covers.
*Measured:* 0 of 132 rows carry the marker today. `grep -c 'Unverified\. Reading
heuristic:'` over the shipped files must return 0, because that competing
literal belonged to DOC-PLAIN-17 and is deleted.
*Severity:* MUST · *Evidence:* normative and measured · *Applies to:* this rule set
*Note:* this rule owns the marker string. DOC-PLAIN-17 keeps the severity cap
only. DOC-OBS-15 owns the written-but-unwired check.

**DOC-AGENT-17.** Record a pressure-test log for every rule an agent has an
incentive to break.
*Rationale:* A rule written and never tested against the temptation it opposes
is a hope, not a control.
*Verification:* `standards/verification-log.md` records, per tested rule, the
pressure scenario, the baseline rationalization verbatim, the rule line added,
and the retest pass rate across at least 5 samples (obra/superpowers
RED-GREEN-REFACTOR, 5 or more samples per variant) with a no-guidance control.
*Severity:* SHOULD · *Evidence:* codified · *Applies to:* this rule set

**DOC-AGENT-18.** Layer a fresh-context reader simulation on top of the
mechanical checks, never in place of them.
*Rationale:* A fresh reader catches ambiguity a grep cannot. A grep catches
defects a fresh reader reads straight past.
*Verification:* A fresh-context agent session answers a fixed list of 5 to 10
questions (Anthropic `doc-coauthoring`, predicted reader questions) about the
page. A failed answer blocks merge alongside the lint result, not instead of it.
*Severity:* CONSIDER · *Evidence:* argued · *Applies to:* all

**DOC-AGENT-19.** Ship every check with a fixture it must reject.
*Rationale:* Three checks in this program's own set can never fail. One compares
a count to itself. One passes on a beacon with no listener. One reports "cannot
verify" on 8 of 9 sites.
*Verification:* Each `checks/<name>` has a matching `fixtures/<name>-bad.*` file.
CI asserts the check exits non-zero on that fixture. A check with no failing
fixture does not ship.
*Measured:* 3 inert checks found across 132 rows (DOC-TYPE-08, DOC-NAV-10,
DOC-TYPE-11). The fleet already uses this pattern for its Lighthouse thresholds.
*Severity:* MUST · *Evidence:* measured · *Applies to:* this rule set

**DOC-AGENT-20.** Measure a new check's hit count and false-positive rate on the
fleet corpus, and put both on the rule row, before the rule ships above SHOULD.
*Rationale:* Three of this family's own patterns measured a 100 percent false
positive rate on their first real run. A severity assigned before measurement is
a guess.
*Verification:* Every row above SHOULD carries `hits N of M, FP X percent
(<corpus>)`. A row above SHOULD with no measurement fails rule review.
*Measured:* DOC-AGENT-06 and 07 at 22 of 22 false positives, DOC-AGENT-14 at 1
of 1, DOC-TYPE-17 at 649 hits of 658 entries (98.6 percent), DOC-PLAIN-13 at 8
of 8 (wave-2 calibration A and B, 248 to 249 page corpus).
*Severity:* MUST · *Evidence:* measured · *Applies to:* this rule set

## Prior art, adopt or adapt or reject

The full read of all 14 artifacts lives in the sub-artifact. This is the
disposition an author needs without opening it.

| Artifact | Verdict | What this program takes |
|---|---|---|
| [anthropics/doc-coauthoring](https://github.com/anthropics/skills/blob/main/skills/doc-coauthoring/SKILL.md) | adapt | The fresh-reader simulation, as a second layer only. Ships as DOC-AGENT-18 |
| [obra/superpowers writing-skills](https://github.com/obra/superpowers/blob/main/skills/writing-skills/SKILL.md) | adopt as method | RED-GREEN-REFACTOR with 5 or more samples. Ships as DOC-AGENT-17 |
| [VoltAgent technical-writer](https://github.com/VoltAgent/awesome-claude-code-subagents/blob/main/categories/08-business-product/technical-writer.md) | reject | Only the audit, implement, verify phase names. Its sign-off template is why DOC-AGENT-14 exists |
| [VoltAgent documentation-engineer](https://github.com/VoltAgent/awesome-claude-code-subagents/blob/main/categories/06-developer-experience/documentation-engineer.md) | reject | Nothing. Same unnamed-formula failure at greater length |
| [blader/humanizer](https://github.com/blader/humanizer/blob/main/SKILL.md) | adopt as dependency | Cite the Wikipedia essay rather than re-derive it. Ships as DOC-AGENT-10 |
| [jalaalrd/anti-ai-slop-writing](https://github.com/jalaalrd/anti-ai-slop-writing/blob/main/skills/anti-ai-slop-writing/SKILL.md) | adapt | Per-word-count budgets are the only numeric shape in the family. Its numbers are unsourced, so DOC-AGENT-12 applies |
| [Aboudjem/humanizer-skill](https://github.com/Aboudjem/humanizer-skill/blob/main/skills/humanizer/SKILL.md) | adopt the CLI, adapt the score | The exit-1 fact-check gate is the one runnable check in the survey. Its self-grading warning ships as DOC-AGENT-13 |
| [hardikpandya/stop-slop](https://github.com/hardikpandya/stop-slop/blob/main/SKILL.md) | reject as a gate, adapt as a hint | A self-graded 1-10 score across 5 dimensions may hint locally and must never gate |
| [Mintlify skill.md](https://mintlify.com/blog/skill-md) | adapt | The decision table, boundaries and gotchas shape. Not the auto-regeneration mechanism |
| [Mintlify AGENTS.md starter](https://github.com/mintlify/starter/blob/main/AGENTS.md) | adapt | The minimal starter shape only. The body is placeholders |
| [GitBook style guide and Agent](https://gitbook.com/docs/create-content/styleguide) | adopt | Numbered enforced rules against unnumbered advisory voice. Ships as DOC-AGENT-15 |
| [awesome-copilot documentation-writer](https://github.com/github/awesome-copilot/blob/main/skills/documentation-writer/SKILL.md) | adapt | The four-question discovery gate, folded into `docs-plan`. It has no mixing check, so add one |
| [ComposioHQ changelog-generator](https://github.com/ComposioHQ/awesome-claude-skills/blob/master/changelog-generator/SKILL.md) | adapt the taxonomy, reject the headers | Keep a Changelog categories yes. Emoji section headers no |
| [Vale packages](https://vale.sh/hub/) | adopt as dependency | Import the published styles. Joblint is out of scope and Harper is a complementary local layer |

## Applied to the fleet

### Violated today

| Rule | Where | Evidence |
|---|---|---|
| DOC-AGENT-01 | All 9 real docs sites | No site publishes a per-page Markdown twin by any mechanism. Twin present 0 of 9, Markdown-source precondition 9 of 9 ([ux-observability-posture.md §4](docs-audit/ux-observability-posture.md), [wave2-calibration-b.md §5](docs-topic-map/wave2-calibration-b.md)) |
| DOC-AGENT-04 | All 9 real docs sites | `llms.txt` 0 of 9 at repo root, `website/public/` and `docs/` ([wave2-calibration-b.md §5](docs-topic-map/wave2-calibration-b.md)) |
| DOC-AGENT-05 | `ocx-marketing/.claude/skills/ai-seo/SKILL.md:3` | The fleet's only `llms.txt` mention frames the file as SEO, which is exactly the justification this rule forbids ([config-inventory.md:43-46](docs-audit/config-inventory.md)) |
| DOC-AGENT-10 | `ocx/.claude/agents/worker-doc-writer.md`, and DOC-PLAIN-12 | The banned marketing words cite no source taxonomy and are wired to no grep ([config-inventory.md:132](docs-audit/config-inventory.md)) |
| DOC-AGENT-12 | This rule set | 21 of 132 rows carry a number with no formula, tool or citation on the same line ([wave2-severity-ledger.md §15](docs-topic-map/wave2-severity-ledger.md)) |
| DOC-AGENT-15 | `ocx/.claude/rules/docs-style.md` (163 lines), `grimoire/.claude/rules/docs-style.md` (124 lines) | Neither file separates enforced rules from voice guidance ([config-inventory.md axis 2](docs-audit/config-inventory.md)) |
| DOC-AGENT-16 | This rule set, and the whole docs-prose rule family | 0 of 132 rows carry the marker. The fleet ships 2 runnable checks across ~92 rules ([wave2-severity-ledger.md §14](docs-topic-map/wave2-severity-ledger.md), [config-inventory.md axis 5](docs-audit/config-inventory.md)) |
| DOC-AGENT-17 | Every docs rule in the fleet | No verification log exists anywhere. 0 of 14 surveyed public artifacts has one either ([prior-art-adoption-and-self-validation.md §10](docs-machine-readers-and-prior-art/prior-art-adoption-and-self-validation.md)) |
| DOC-AGENT-19 | This rule set | 0 of 7 named `checks/` scripts exist on disk, so no fixture exists either. 3 shipped checks can never go red ([wave2-severity-ledger.md §3, §5](docs-topic-map/wave2-severity-ledger.md)) |
| DOC-AGENT-20 | This rule set before wave 2 | 3 of this family's own patterns shipped above SHOULD with no measured false-positive rate ([wave2-calibration-b.md §5](docs-topic-map/wave2-calibration-b.md)) |

### Already satisfied

| Rule | Where | Evidence |
|---|---|---|
| DOC-AGENT-01 (precondition) | 9 of 9 sites | Every real site builds from Markdown source under `docs/**` or `website/src/**`, so the twin is a file copy ([wave2-calibration-b.md §5](docs-topic-map/wave2-calibration-b.md)) |
| DOC-AGENT-06, DOC-AGENT-07 | 9 of 9 sites | 0 real agent-directed callouts fleet-wide. The 22 grep hits were the product noun "agent" and all 22 were false positives ([wave2-calibration-b.md §5](docs-topic-map/wave2-calibration-b.md)) |
| DOC-AGENT-08 | 9 of 9 sites | 0 of 9 carry a `_headers` file or an edge-function config, so the static-only requirement is met and stays met ([wave2-calibration-b.md §5](docs-topic-map/wave2-calibration-b.md)) |
| DOC-AGENT-13 | Fleet-wide | No fleet rule computes a self-graded prose score at all |
| DOC-AGENT-14 | 1,089 agent and skill files across 13 repos | 1 grep hit, and it was a cited third-party statistic. 0 true positives ([wave2-calibration-b.md §5](docs-topic-map/wave2-calibration-b.md)) |
| DOC-AGENT-16 (shape) | `bob/.claude/rules/rust-quality/docs-and-tracing.md:29-40` | 11 of 12 rules carry an inline `rg` or `grep` command in the same table row. This is the template, and it governs code docs, not docs-site prose ([config-inventory.md axis 5](docs-audit/config-inventory.md)) |

### New commitments, with nothing in the fleet to compare against

DOC-AGENT-03, 11, 18, 19 and 20 govern surfaces the fleet does not yet have.
No site generates a twin whose completeness could drift. No rule file carries a
dated wordlist. No check ships with a red-state fixture. These are greenfield,
confirmed by `config-inventory.md` axis 4.

Two fleet facts bound how these ship. The tested-docs mechanism proves this
fleet can build a real gate when it decides to: 66 acceptance-tested scripts,
each bound to exactly one page by a `# doc:` slug, with a canonicalization step
proving the displayed command equals the executed one
([tested-examples-mechanism.md §3, §6](docs-audit/tested-examples-mechanism.md)).
And it cost roughly 7,900 lines of Python for 66 commands
([tested-examples-mechanism.md, Portability](docs-audit/tested-examples-mechanism.md)),
which is the reason DOC-AGENT-01's check is a sibling-file assertion and not a
new pipeline.

## AI-agent failure modes

Ranked by how often it bites when an agent writes docs or docs config
unprompted.

1. **Ships `llms.txt` and calls the site agent-readable.** It is the artifact
   named most often in training data as "the AI file", so the agent reaches for
   it and stops. Caught by DOC-AGENT-01, which `llms.txt` cannot satisfy.
2. **Writes a check that cannot fail.** A count compared to itself, a grep on a
   beacon with no listener, a probe that reports "cannot verify" and passes.
   This is the dominant defect in this program's own set. Caught by DOC-AGENT-19.
3. **Assigns a severity before running the check once.** The rule feels
   important, so it ships at MUST, and its first real run returns 100 percent
   false positives. Caught by DOC-AGENT-20.
4. **Writes a pattern that matches its own product noun.** An optional prefix
   group turns a targeted callout grep into a bare-word scan. Caught by
   DOC-AGENT-06's required prefix.
5. **States a metric in its sign-off that nothing measured.** Closing a task
   with a confident number is the default move, and VoltAgent's public subagents
   template exactly that. Caught by DOC-AGENT-14.
6. **Names a script in a verification cell and never writes the file.** 7
   phantom files across 17 rules. Caught by DOC-OBS-15's path-resolves clause,
   which this family relies on.
7. **Writes a decorative "For AI agents:" callout that restates the page.**
   The controlled test measured this shape as inert. Caught by DOC-AGENT-06.
8. **Re-derives a banned-word taxonomy instead of citing one.** Four public
   skills already did it, all descending from one essay. Caught by DOC-AGENT-10.
9. **Grades its own output and calls it verification.** Caught by DOC-AGENT-13.
10. **Writes a rule with no check and stays silent about it.** This is the
    fleet's dominant existing state, so it is also the state an agent imitates.
    Caught by DOC-AGENT-16.
11. **Writes a bare number and moves on.** The agent knows the number is
    invented as it types it. Caught by DOC-AGENT-12's `N (<source>)` shape.
12. **Justifies a mechanism with "AI traffic is growing".** That is the framing
    of most secondary coverage. Caught by DOC-AGENT-05.
13. **Buries the one useful instruction under a trailing "Notes" heading**,
    following the human convention for asides. Caught by DOC-AGENT-07.
14. **Claims a mechanism the deploy target cannot run**, because it copied a
    vendor's platform docs. Caught by DOC-AGENT-08.
15. **Builds an HTML-to-Markdown converter for content already in Markdown**,
    because that is what the vendor blog posts describe. Caught by DOC-AGENT-01.
16. **Drops collapsed content when generating a flat agent view**, because the
    generator reads the rendered page. Caught by DOC-AGENT-03.
17. **Merges `AGENTS.md`, `skill.md`, `llms.txt` and an MCP server into one
    "agent readiness" item**, because all four are agent-related. Caught by
    Verdict item 9, which replaced DOC-AGENT-09.
18. **Bans a 2023-era tell as if it were current.** Caught by DOC-AGENT-11.

## Conflicts resolved

**llms.txt versus the Markdown twin** (assigned to this group by the map).
Resolved for the twin. Adoption data measures publishers. Consumption data
measures readers, and 97% of files get zero requests. The twin is what Stripe
and Laravel actually serve, confirmed by live fetch. `llms.txt` ships as
DOC-AGENT-04 at SHOULD, never as the answer.

**Progressive disclosure helps a human and costs an agent ~31x in bytes**
(assigned to this group by the map). Dissolved, not arbitrated. It is one
mechanism scored against two audiences. Collapse for the human render, flatten
for the twin, from one source. The obligation lands on the build step as
DOC-AGENT-03. The 31x figure itself is discarded. A live re-fetch of its source
page on 2026-09-05 no longer carries the claim, and the companion blog measures
80%.

**One shipped house voice as upside versus as a sameness cost** (assigned to
this group by the map). Resolved by GitBook's own split, not by an invented
compromise. Numbered rules with commands are enforced. Voice and tone are
advisory and overridable. Shipped as DOC-AGENT-15.

**Two marker strings for one obligation** (wave-1 critique, contradiction 5's
neighbour). DOC-PLAIN-17 mandated `Unverified. Reading heuristic:` and
DOC-AGENT-16 mandated `unverified: reading heuristic`. A row obeying one failed
the other. Resolved by splitting the object. DOC-AGENT-16 owns the marker.
DOC-PLAIN-17 keeps the severity cap and loses its competing literal.

**Semicolons as an AI tell.** The two sub-artifacts surface a direct
contradiction between prior-art skills. jalaalrd instructs writers to add
semicolons because AI underuses them, while this fleet's frame bans them as a
tell. Resolved as unresolvable on evidence. The shared ancestor essay does not
mention semicolons at all. Both positions are house style. The frame's
Decision 1 already ships the ban as labelled house style, and this group adds
only that the list must cite its ancestor (DOC-AGENT-10) and carry dates
(DOC-AGENT-11). Content ownership stays with `docs-plain-english`.

**Flat em-dash ban versus baseline calibration.** blader/humanizer calibrates
against the writer's own sample rate and states plainly that one em-dash proves
nothing. The frame bans outright. Resolved by scope. This group does not own the
threshold. It requires only that whatever threshold ships names its formula
(DOC-AGENT-12) and does not gate on a self-graded number (DOC-AGENT-13).
`docs-plain-english` owns the density figure.

**Anthropic's reader simulation versus "every rule carries a verification".**
`doc-coauthoring` ships 375 lines and zero lints, and this program's frame
requires a check per rule. Resolved by layering rather than choosing. The
simulation catches ambiguity a grep cannot, and on its own it would have missed
this fleet's 555 inline-style links and 343 untagged fences. Shipped as
DOC-AGENT-18 at CONSIDER.

## Open questions

### Needs a human decision

1. **Does this fleet actually want agent readers?** DOC-AGENT-01 is cheap here
   and 0 of 9 sites do it. That is a product question, not a rules question.
2. **The two `docs-style.md` forks.** `grimoire`'s 124-line copy is a strict
   subset-plus-one of ocx's 163-line original, hand-copied rather than installed
   through the package manager this research feeds. Superseding them is the
   owner's call, per frame Decision 2.
3. **Whether DOC-AGENT-17 runs in phase 5, and on which rules.** The method
   costs 3 or more scenarios and 5 or more samples per rule. Against a real
   weekly token budget that is a scoping decision, not a technical one.
4. **Whether Vale becomes a fleet dependency.** Frame Decision 6 already pins
   the tiering. Twelve repos adding a Go binary is still a cost the owner
   accepts or declines.

### Deserves another research round

- **twin-generation-mechanics**. Can MkDocs Material, VitePress and mdBook each
  emit a per-page `.md` twin into the build output without a custom plugin, and
  what is the smallest working configuration for each? Nobody has measured this.
  This gap is the reason DOC-AGENT-01 now ships at SHOULD.
- **twin-drift**. What check proves a twin still matches its page when the twin
  is generated rather than copied? DOC-AGENT-03 covers collapsed content only.
  Nothing covers a twin that silently goes stale.
- **agent-instruction-durability**. DOC-AGENT-06 is at SHOULD now because the
  33% to 100% result came from one model and 15 runs per condition, and the same
  author's Pinecone test scored 12/12 in all three conditions. What evidence
  would earn MUST back, and does the effect survive on pages that do not
  contradict themselves?
- **self-validation-cost**. What does one RED-GREEN-REFACTOR round actually
  cost per rule in tokens and wall time? Question 3 above cannot be decided
  until someone measures one round.

## Revision log

- **Wave 2, 2026-09-05.** Applied the severity ledger, both calibration reports,
  and the declaration-key decision. Rule count moves from 18 to 20, with 2 rows
  retired in place.
- **DOC-AGENT-01 demoted MUST to SHOULD**, and it absorbs DOC-AGENT-02's
  copy-not-convert clause. Reason: the severity ledger's G5 gate. No twin
  implementation exists on any of the 3 fleet generators.
- **DOC-AGENT-02 retired, merged into DOC-AGENT-01.** It was an implementation
  detail of the same obligation, not a second one.
- **DOC-AGENT-05 demoted MUST to SHOULD** and given the literal marker. Its
  per-hit half is a reviewer judgement, so DOC-PLAIN-17's cap applies.
- **DOC-AGENT-06 demoted MUST to SHOULD, and its pattern fixed.** The `for ` or
  `note for ` prefix is now mandatory. Measured 22 hits and 22 false positives
  fleet-wide with the optional prefix, 0 hits with the required one.
- **DOC-AGENT-07 pattern aligned to DOC-AGENT-06**, and its threshold now names
  Mintlify's truncation finding on the same line, per DOC-AGENT-12.
- **DOC-AGENT-09 retired.** It was a scope note about this artifact, not a rule
  an adopter can violate. Its content is Verdict item 9.
- **DOC-AGENT-12 given a mechanical shape.** It now requires the literal form
  `N (<source>)`. Reason: it previously required a source and not a shape, so
  its own check was a reading task. 21 of 132 rows fail it.
- **DOC-AGENT-13 given the literal marker.** Severity unchanged at SHOULD.
- **DOC-AGENT-14 verification narrowed** to require first-person self-reference.
  Reason: the one fleet hit in 1,089 files was a cited third-party statistic.
  Severity stays MUST because the obligation did not change.
- **DOC-AGENT-16 now allows a mixed row** when the marker names the clause it
  covers, and it owns the marker string outright. DOC-PLAIN-17 loses its
  competing literal and keeps the cap.
- **DOC-AGENT-17 and DOC-AGENT-18 now name their number sources** on the same
  line, per DOC-AGENT-12.
- **DOC-AGENT-19 added at MUST.** Every check ships with a fixture it must
  reject. Reason: 3 checks in this program's own set can never go red.
- **DOC-AGENT-20 added at MUST.** A rule above SHOULD carries a measured hit
  count and false-positive rate on its row. Reason: 3 of this family's own
  patterns measured 100 percent false positives on their first real run.
- **Declaration key applied and found not to reach this family.** No DOC-AGENT
  rule reads or writes `doc_type` or `doc_tier`. Recorded as Verdict item 19 so
  a later author does not re-derive the check.
- **Prior-art adopt, adapt and reject table surfaced** from the sub-artifact into
  this file, per the wave-1 critic. All 14 artifacts, one row each.
- **Verdict extended** with the twin gap, the bare-noun pattern finding, the
  three-meta-rule split, the number shape, and the red-state fixture rule.
  Fleet tables now carry the calibration hit counts.
- **No ledger disagreement.** Every severity change the ledger proposed for this
  family is applied as written.

## Sub-artifacts

- [agent-readable-surface.md](docs-machine-readers-and-prior-art/agent-readable-surface.md)
  what a docs site owes an agent reader, the twin against `llms.txt` evidence,
  and which mechanisms survive a plain static host. Wave 1.
- [prior-art-adoption-and-self-validation.md](docs-machine-readers-and-prior-art/prior-art-adoption-and-self-validation.md)
  14 existing AI docs artifacts read in full, classified adopt, adapt or
  reject, plus the self-validation loop this program should run on its own
  rules. Wave 1.
- [wave2-declaration-key.md](docs-topic-map/wave2-declaration-key.md)
  the single carrier and key set for a page's type and tier, measured on three
  generators. No DOC-AGENT rule consumes it, and Verdict item 19 records why.
  Wave 2.
- [wave2-severity-ledger.md](docs-topic-map/wave2-severity-ledger.md)
  all 132 rules passed through the program's own gates. Source of every
  severity change and both retirements in this file. Wave 2.
- [wave2-calibration-a.md](docs-topic-map/wave2-calibration-a.md)
  false-positive calibration for DOC-TYPE, DOC-DISC and DOC-OBS. Supplies the
  cross-family hit counts DOC-AGENT-20 cites. Wave 2.
- [wave2-calibration-b.md](docs-topic-map/wave2-calibration-b.md)
  false-positive calibration for DOC-PLAIN, DOC-NAV, DOC-EX and DOC-AGENT.
  Source of every measured row in this file. Wave 2.

## Key sources

| URL | Why |
|---|---|
| [llmstxt.org](https://llmstxt.org/) | The spec, re-verified 2026-09-05. Only the H1 is required, and the spec itself recommends the `.md` twin. |
| [mecanik.dev — does llms.txt do anything yet](https://mecanik.dev/en/posts/does-llms-txt-do-anything-yet/) | The only consumption-side data found: 97% zero requests, retrieval bots at 1.1%. |
| [blog.cloudflare.com/markdown-for-agents](https://blog.cloudflare.com/markdown-for-agents/) | Dated, primary, with the 80% reduction figure that replaced the retired 31x claim. |
| [developers.cloudflare.com/docs-for-agents](https://developers.cloudflare.com/docs-for-agents/) | The mechanism list, and the rhetoric-drift case study. |
| [vercel.com/docs/agent-resources](https://vercel.com/docs/agent-resources) | The richest discovery-file set found: five files layered on top of per-page twins. |
| [mintlify.com/blog/context-for-agents](https://www.mintlify.com/blog/context-for-agents) | Why an instruction must sit at the top: reading agents truncate long pages. |
| [docs.stripe.com/payments.md](https://docs.stripe.com/payments.md) | Live proof the twin convention resolves site-wide in production. |
| [laravel.com/docs/12.x/installation.md](https://laravel.com/docs/12.x/installation.md) | Second live proof, and shows the twin is simply the pre-render source. |
| [passo.uno — if you are an agent read this](https://passo.uno/if-you-are-an-agent-read-this/) | The controlled test, re-verified 2026-09-05: 5/15 to 15/15 with an instruction, 34.5% to 34.5% with a label. |
| [gitbook.com/docs/create-content/styleguide](https://gitbook.com/docs/create-content/styleguide) | The numbered-enforced against unnumbered-advisory split, arrived at independently. |
| [gitbook.com/blog/ai-docs-data-april-2026](https://www.gitbook.com/blog/ai-docs-data-april-2026) | Agent reads passed human reads in April 2026, and GitBook still concludes voice should not change. |
| [github.com/obra/superpowers — writing-skills](https://github.com/obra/superpowers/blob/main/skills/writing-skills/SKILL.md) | The only reusable method for proving a rule changes agent behaviour. |
| [github.com/anthropics/skills — doc-coauthoring](https://github.com/anthropics/skills/blob/main/skills/doc-coauthoring/SKILL.md) | The reference implementation, and the reader-simulation idea worth keeping. |
| [github.com/Aboudjem/humanizer-skill](https://github.com/Aboudjem/humanizer-skill/blob/main/skills/humanizer/SKILL.md) | The one runnable exit-code gate in the whole survey, plus its own warning against self-grading. |
| [en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) | The taxonomy all four humanizer skills descend from, and the source of the "delve" decline. |
| [vale.sh/hub](https://vale.sh/hub/) | Exact rule counts per package, which is what makes importing cheaper than re-deriving. |
