---
name: positioning-brief
description: "The single positioning record of a software product or service, written as one machine-readable file: audience and non-target, the category and object nouns, the one product sentence, the alternatives a buyer uses today, forbidden noun variants, do-not-say entries and the owner's review state. Use when someone asks for positioning, a value proposition, a tagline, a one-liner, an elevator pitch, messaging, a target audience or ideal customer, or a category or competitor framing, or when the marketing-quality rule finds no positioning record before an edit to a README, manifest description or site head. Not for writing page copy from an existing record, which the marketing-quality rule governs, and not for sequencing a launch, which is launch-plan."
license: Apache-2.0
metadata:
  summary: Drafts the one positioning record of a product from the repository's own text, marks every unsourced field for the owner, and checks the draft with the positioning script
  keywords: positioning,positioning-brief,value-proposition,tagline,one-liner,messaging,audience,category,alternatives,competitors,non-target,do-not-say,brief,marketing
  grim.requires.skills.marketing-quality-reference: "./marketing-quality-reference:0"
---

# positioning-brief

Contents: [Stop condition](#stop-condition) · [Never](#never) ·
[1. Check the record](#1-check-the-record-that-exists) · [2. Collect evidence](#2-collect-the-evidence) ·
[3. Fill the fields](#3-fill-the-fields) · [4. Assemble the sentence](#4-assemble-the-sentence) ·
[5. Voice file](#5-optional-voice-file) · [6. Wire in](#6-wire-the-record-in) ·
[7. Check](#7-check-the-draft) · [8. Report](#8-report) · [Siblings](#siblings)

Write the one file that says what the product is, who it is for and which words
name it. The `marketing-quality` rule then governs every copy surface against it.

The paths `.agents/positioning.toml` and `.agents/voice.toml` are pinned house
conventions: defaults that an adopter overrides once, by naming another path in the
repository's agent instructions. Use the default when no override exists.

The schema and rule rows (MKT-POS-01 to 21) are in `positioning.md` of the
`marketing-quality-reference` skill. Set
`CHECKS=.claude/skills/marketing-quality-reference/checks`
(`$CLAUDE_CONFIG_DIR/skills/marketing-quality-reference/checks` when installed
globally). If that directory is missing, install `marketing-quality-reference` first
(`grim install`) or set `CHECKS` to wherever the skill is unpacked. Run every command
from the repository root.

## Stop condition

Stop when all of these hold. Then change no product sentence, category noun or object noun on any surface; other copy edits stay allowed (MKT-POS-04).

- `.agents/positioning.toml` exists, has at most 80 lines and `status = "unreviewed"`.
- Every required field holds a value copied from repository text, with a
  `[sources]` line `field = "path:line"`, or the literal `ASK-OWNER`.
- `positioning_check.py fields`, `sourced`, `audience` and `alternatives` exit 0.
  `sentence` exits 0 once `sentence`, `category` and `object` are all filled.
- The claim-word check of step 7 prints nothing. `positioning_check.py` does not
  test claim words, so a green script run alone never proves the sentence is claim-free.
- Your report lists every `ASK-OWNER` field as a question for the owner.

## Never

- Never invent an audience, a category noun, an alternative or a differentiator.
  An empty field is better than a plausible one (MKT-POS-03).
- Never write `status = "reviewed"`, and never move `review_by` (MKT-POS-04).
- Never put a claim word in the sentence ("fast", "simple", "secure"). Claim
  words are MKT-CLAIM-02. `positioning_check.py` does not catch them: run the
  claim-word check of step 7.
- Never write the GitHub About field. The write publishes at once. Propose the
  text in your report.

## 1. Check the record that exists

Input: `.agents/positioning.toml`, if any.

```sh
test -f .agents/positioning.toml && grep -n -E '^(status|reviewed|review_by|owner)[[:space:]]*=' .agents/positioning.toml
date +%F
```

| State | Action |
|---|---|
| No file | Continue at step 2 and draft one. |
| `status = "unreviewed"` | Continue. Fill what evidence now supports. Keep every owner answer already there. |
| `reviewed` and `review_by` is today or later | Stop. The record is current. Answer from it. |
| `reviewed` and `review_by` is earlier than today | The record is stale. Change no sentence, category noun or object noun on any surface (MKT-POS-04). Report which fields the evidence now contradicts, ask the owner to review, and stop. |

Done: you know whether to draft, continue or stop.

## 2. Collect the evidence

Input: the repository. Output: a scratch list of `path:line: text`, one line per
existing description of the product.

```sh
git ls-files -- README.md '*/README.md' CHANGELOG.md Cargo.toml package.json pyproject.toml CODEOWNERS .github/CODEOWNERS
gh repo view --json description,homepageUrl,repositoryTopics
grep -n -E '<title>|name="description"|property="og:description"|<h1' dist/index.html
git grep -n -i -E 'who (it is|this is) for|target (user|audience)|alternative|compared to|instead of|unlike' -- README.md 'docs/**/*.md'
gh issue list --limit 30 --json title,body
```

Skip a command whose input does not exist. Without a `gh` token, put the About
text on the owner list. Count the distinct one-liners found: the count measures
how far the copy has drifted. A linked quote of what users replaced is audience
evidence. A guess is not.

Done: a list of every product description found, each with its path and line.

## 3. Fill the fields

Copy a value from the list and cite it as `[sources] field = "path:line"`. When
the evidence has no value, or two that disagree, write `ASK-OWNER` and list the
candidates in a trailing comment. The comment is the owner's input.

| Field | Source | Keep it only when |
|---|---|---|
| `owner` | CODEOWNERS, manifest `authors` | The repository names a person or role. |
| `style` | Never copied | Always `ASK-OWNER`: `head-to-head`, `big-fish-small-pond` or `new-game` is a strategy choice. |
| `category`, `object` | Manifest description, README opening | One noun phrase each. Two or more nouns in use: `ASK-OWNER`, with each candidate and its `path:line`. |
| `forbidden` | The other nouns the surfaces use for the same thing | Never empty: add each variant found, or `ASK-OWNER`. |
| `audience` | README, docs home, issues | One segment: a role or behaviour plus its context (MKT-POS-05). "Developers and teams" fails. |
| `non_target` | README limits, docs limitations, issues closed as out of scope | A condition a reader can check, such as "needs Windows 7 support". |
| `alternatives` | Issues, docs, README | The first entry is what the audience does today without the product: a behaviour, a tool or nothing (MKT-POS-06). Never "other tools". |
| `maturity` | Manifest version, release list, status line | One plain sentence: write only the stage word the version supports (`Pre-1.0` for 0.x), then `ASK-OWNER` for what may change. |
| `lists` | A fact that a surface enumerates (kinds, clients, platforms) | A `[lists.<name>]` table with `source` (code file) and `extract` (a command that prints the members). Empty when nothing is enumerated. |
| `do_not_say` | A spec or note that bans a word | Entries have `pattern`, `reason`, `instead`, `lift_when` (MKT-POS-13). Write none when the repository holds no ban. |

```toml
status = "unreviewed"
reviewed = 2026-11-27           # today, unquoted
review_by = 2026-11-27          # the same day in a draft
owner = "ASK-OWNER"
style = "ASK-OWNER"
sentence = "Package manager for widgets"
category = "package manager"    # candidates go in a comment
object = "widgets"
forbidden = ["ASK-OWNER"]
audience = "ASK-OWNER"
non_target = ["ASK-OWNER"]
maturity = "Pre-1.0: ASK-OWNER"  # example: only the stage word the version supports, then what may change
do_not_say = []                 # a key, so it sits above every table
[[alternatives]]
name = "ASK-OWNER"
kind = "behaviour"              # behaviour | tool | nothing
[lists]                         # empty when no surface enumerates members
[sources]                       # one path:line per field not marked ASK-OWNER
sentence = "Cargo.toml:3"
category = "README.md:3"
```

A factual statement about a named alternative (a version, a feature, a number)
never goes in the record. It needs a comparison record under MKT-POS-14. Record
the name and kind only.

A component repository (extension, GUI, plugin, index site): ask the owner for the
family repository, set `parent = "owner/repo"`, and copy the parent's `category`,
`object` and `forbidden` entries (MKT-POS-16). A noun of its own needs a
`noun_reason` the owner writes.

Done: every required field holds a sourced value or `ASK-OWNER`.

## 4. Assemble the sentence

`sentence` is one sentence that contains both `category` and `object` (MKT-POS-07).

1. Take the existing one-liner closest to that shape: the manifest `description`
   first, then the README tagline line. Cite it in `[sources] sentence`.
2. Remove any enumerated list of three or more items. Write a count and a link,
   or drop the list. A list copied into one surface spreads to every copy.
3. Remove any claim word and any trend word the record bans.
4. When the result no longer names the category and the object, and one of them is
   `ASK-OWNER`, write `sentence = "ASK-OWNER"` and put the best candidate in a
   comment.

Never write a new tagline. A fresh sentence per file is the failure this record
exists to stop. Done: `sentence` is a reused, trimmed sentence or `ASK-OWNER`.

## 5. Optional voice file

Skip unless the owner asked for a voice. Draft `.agents/voice.toml` the same way
(MKT-VOICE-08): `status = "unreviewed"`, `ASK-OWNER` where no repository text
supports a field, one `pass` and one `fail` sentence per principle copied from
existing copy, and one `[surface.<name>]` row each for `pitch`, `readme` and
`notice` with `person`, `contractions` and `humour`. The schema is in `voice.md`.

## 6. Wire the record in

- Add this line to `AGENTS.md`, creating the file when absent (MKT-POS-12): "Before
  editing README.md, CHANGELOG.md, a manifest description or the site head, read
  `.agents/positioning.toml`."
- A `CLAUDE.md` without `@AGENTS.md` goes in the report (MKT-POS-21). Do not add
  the import yourself.
- Positioning fields in another brief or rule file (tagline, target users,
  competitive matrix) go in the report. Replace them with a one-line pointer only
  when the owner agrees (MKT-POS-01).

## 7. Check the draft

```sh
for c in fields sourced audience alternatives sentence; do python3 -I "$CHECKS"/positioning_check.py "$c"; done
```

For `positioning_check.py`, exit 0 is clean. Exit 1 prints findings: fix each by editing the draft, never by
weakening the check. Exit 2 means there is no record file. `sentence` fails by
design while `category` or `object` is `ASK-OWNER`: report it as the owner's
question. `sourced` checks only that each cited line exists, not that it holds the value, so
compare each citation by eye. Do not run `drift`: an unreviewed draft is not a standard to compare
surfaces against.

`positioning_check.py` does not test claim words. Check the sentence against the MKT-CLAIM-02
pattern set, which needs no `claims.toml`. Any line it prints is a hit: rewrite the
sentence and rerun. No output is clean.

```sh
sed -n 's/^sentence[[:space:]]*=//p' .agents/positioning.toml > "${TMPDIR:-/tmp}"/sentence.txt
awk '/^```pattern-set/{f=1;next} /^```/{f=0} f&&!/^#/' "$CHECKS"/../claims.md | grep -n -i -E -f - "${TMPDIR:-/tmp}"/sentence.txt
```

Done: the stop condition holds.

## 8. Report

Give the owner, in this order:

1. The path of the draft and its status (`unreviewed`).
2. The count of distinct one-liners from step 2, and the three most different.
3. Each `ASK-OWNER` field as a question, with its candidates and `path:line`.
4. The owner-only decisions: audience, `non_target`, `category`, `object`, `style`;
   renaming a noun across a product family; the `status` flip and `review_by`;
   removing a `do_not_say` entry or adding a `forbidden_allow` exemption; which
   competitors may be named in public; whether "AI" may lead the hero; and whether
   a second account must review changes to the record (MKT-POS-20).
5. That sentence, category and object stay frozen on every surface until the owner
   sets `status = "reviewed"`.

## Siblings

- `marketing-quality` (rule) and `marketing-quality-reference` (depth): govern copy
  against the record and own the schema and the drift check.
- `marketing-review`: grades existing surfaces against the record.
- `launch-plan`: sequences a launch after the owner reviews the record.
