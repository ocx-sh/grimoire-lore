---
title: Readability gate per page type
topic: readability-gate-per-page-type
group: docs-plain-english
agent: research-lang wave-1 scout
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 19
scope: >
  What numeric readability threshold (if any) gates a documentation page, which
  formula computes it, how the fleet's existing preprocessing feeds it, what
  page types are exempt and why, and the runnable script that produces the
  number. Does not cover the em-dash/AI-tell taxonomy, the lint tool choice or
  its rollout mechanics, or the link-density rules — those are sibling topics
  in the same group.
---

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  1. [Vale's Readability package: seven formulas, one confirmed number, one confirmed default severity](#1-vales-readability-package-seven-formulas-one-confirmed-number-one-confirmed-default-severity)
  2. [The Flesch formulas and their standard interpretation table](#2-the-flesch-formulas-and-their-standard-interpretation-table)
  3. [No developer-docs style guide states a numeric target — confirmed directly, three times](#3-no-developer-docs-style-guide-states-a-numeric-target--confirmed-directly-three-times)
  4. [The two numbers that do exist are both citizen-facing, not developer-facing](#4-the-two-numbers-that-do-exist-are-both-citizen-facing-not-developer-facing)
  5. [GOV.UK's two hard numbers, checked against the fleet](#5-govuks-two-hard-numbers-checked-against-the-fleet)
  6. [The identifier problem: bare identifiers don't just get miscounted, they can inflate the score](#6-the-identifier-problem-bare-identifiers-dont-just-get-miscounted-they-can-inflate-the-score)
  7. [The reference carve-out: three candidate mechanisms, one measured winner](#7-the-reference-carve-out-three-candidate-mechanisms-one-measured-winner)
  8. [The runnable script](#8-the-runnable-script)
- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- Use **Flesch Reading Ease**, not a grade-level formula, as the one scored number — it is the formula the fleet's own audit script already computes, it is what Vale's `FleschReadingEase.yml` ships, and its 0–100 band names ("Fairly Difficult," "Plain English") read honestly without asserting a grade claim nobody backs.
- Score the **stripped** text, never raw file text: drop frontmatter, code fences, ATX heading lines, table rows, then remove inline code spans — this is the fleet's own `docs-shape.md` §3 preprocessing, reused verbatim, not reinvented.
- No developer-documentation style guide names a numeric readability target. Confirmed directly against Google's style pages (404, page moved/removed), the Microsoft Writing Style Guide welcome page (no number, only voice guidance), and GitLab's docs style guide (explicitly no metric, only a 100-character source line-wrap rule). Treat any "Microsoft recommends grade 7–8" claim you see online as Microsoft Word's generic document-readability feature, not the Microsoft Writing Style Guide.
- The two numbers that *do* circulate — GOV.UK's reading age of 9 and Vale's Flesch-Kincaid grade > 8 — are both citizen-facing or generic defaults, not calibrated to developer prose. GOV.UK's own Home Office design manual states the age-9 target applies "even if you are writing for a specialist audience," which is a deliberate, named choice for government services, not evidence it transfers to API docs.
- Set the floor at **Flesch Reading Ease ≥ 50**, one number, not five invented per-type numbers. It equals the fleet's own measured median (51.6), so it is calibrated to be "no worse than today," not an aspirational target nothing in the fleet has ever hit twice.
- **Reference and troubleshooting pages are exempt from the Flesch floor entirely** — not given a laxer number. Every syllable-based formula breaks on identifiers, so a laxer number would still be arbitrary; exemption is honest, a fudged number is not.
- The exemption mechanism is a **declared page type in frontmatter** (the `type:`/`doc_type:` key the sibling `page-types.md` file owns), not a path convention and not a live identifier-density scan. The fleet's own classifier measures why: 31.9% of pages already fall into an unclassifiable `other` bucket under path heuristics, and `grimoire`'s mdBook docs are a flat single directory with no `reference/` subfolder at all — path-based exemption would silently miss it.
- For reference pages specifically, replace the absolute floor with a **draft-to-draft delta check**: fail only when a single PR's post-edit Flesch score on a touched reference page drops more than 10 points from its pre-edit score. This is the one place a delta, not a floor, is the right instrument — practitioner sources explicitly warn the metric is "better used as a relative gauge between drafts than an absolute pass/fail bar" for exactly this kind of identifier-dense prose.
- Severity at rollout is **warning, never error**, fleet-wide — this matches Vale's own shipped default (every one of the seven Readability rules ships with no `level:` field, which resolves to Vale's documented default of `suggestion`) and avoids locking out a corpus whose current median already sits under any aspirational target.
- The one place severity can safely be **error from day one** is the reference-page delta check, because it only fires on a page a PR is actively touching — it can never block an unrelated PR or lock out existing legacy prose the way a corpus-wide floor would.
- The identifier problem is worse than "the formula miscounts" — it can make a page **look easier than it is**. A bare 64-character hex digest gets torn into ~20 fragments by the word-boundary regex (digits are not letters), which inflates the word count and can raise, not lower, the reported Flesch score. Wrapping the same identifier in a code span and stripping it removes the distortion entirely, which is the second reason the identifier fix belongs to a companion "wrap bare identifiers in code spans" lint, not to the readability formula.
- GOV.UK's two hard numbers — split any sentence over **25 words**, and cap a paragraph at **5 sentences** — are directly checkable by grep or a stripped-text scan and both need the same "warn on the whole corpus, error only on touched lines" rollout as the Flesch floor, for the same reason: the fleet's own measured mean is already 19.5 words/sentence with a 0.3–0.4 long-sentence share in the largest repos, meaning a hard corpus-wide error would fail the majority of existing pages on day one.
- Reject "grade 9–13 for technical readers" as a stated target. It traces to marketing-adjacent SaaS glossary pages (Docsie, ClickHelp), not a style guide or a controlled study, and it is a grade-level number — this rule deliberately avoids grade-level formulas for the reasons above. It is recorded here as rejected evidence, not adopted.
- Do not treat this gate as a proxy for AI-tell detection. It measures sentence and word shape, nothing about provenance; a hard sentence written by a careful human fails it exactly like a hard sentence from a model, and that is the correct behavior — the gate's job is legibility, not authorship forensics (that question belongs to the sibling `ai-tell-set-and-honest-label` topic).

## Findings

### 1. Vale's Readability package: seven formulas, one confirmed number, one confirmed default severity

The prior grounding pass (`codified-practice.md` §3) confirmed only `FleschKincaid.yml`. This pass fetched all seven rule files directly from the package repository ([errata-ai/Readability](https://github.com/errata-ai/Readability)):

| Rule file | Formula | Condition | Message |
|---|---|---|---|
| [`FleschKincaid.yml`](https://raw.githubusercontent.com/errata-ai/Readability/master/Readability/FleschKincaid.yml) | `0.39·(words/sentences) + 11.8·(syllables/words) − 15.59` | `> 8` | "Try to keep the Flesch–Kincaid grade level (%s) below 8." |
| [`FleschReadingEase.yml`](https://raw.githubusercontent.com/errata-ai/Readability/master/Readability/FleschReadingEase.yml) | `206.835 − 1.015·(words/sentences) − 84.6·(syllables/words)` | `< 70` | "Try to keep the Flesch reading ease score (%s) above 70." |
| [`GunningFog.yml`](https://raw.githubusercontent.com/errata-ai/Readability/master/Readability/GunningFog.yml) | `0.4·((words/sentences) + 100·(complex_words/words))` | `> 10` | "Try to keep the Gunning-Fog index (%s) below 10." |
| [`SMOG.yml`](https://raw.githubusercontent.com/errata-ai/Readability/master/Readability/SMOG.yml) | `1.0430·√(polysyllabic_words·30/sentences) + 3.1291` | `> 10` | "Try to keep the SMOG grade (%s) below 10." |
| [`ColemanLiau.yml`](https://raw.githubusercontent.com/errata-ai/Readability/master/Readability/ColemanLiau.yml) | `0.0588·(characters/words)·100 − 0.296·(sentences/words)·100 − 15.8` | `> 9` | "Try to keep the Coleman–Liau Index grade (%s) below 9." |
| [`AutomatedReadability.yml`](https://raw.githubusercontent.com/errata-ai/Readability/master/Readability/AutomatedReadability.yml) | `4.71·(characters/words) + 0.5·(words/sentences) − 21.43` | `> 8` | "Try to keep the Automated Readability Index (%s) below 8." |
| [`LIX.yml`](https://raw.githubusercontent.com/errata-ai/Readability/master/Readability/LIX.yml) | `(words/sentences) + (long_words·100/words)` | `> 35` | "Try to keep the LIX score (%s) below 35." |

None of the seven files carries a `level:` field. [`docs.vale.sh/topics/styles/`](https://docs.vale.sh/topics/styles/) confirms Vale's documented default when `level:` is absent is **`suggestion`**, the lowest of Vale's three severities (`suggestion`, `warning`, `error`). So all seven of Vale's own shipped readability thresholds are non-blocking by design, not just the one the prior pass checked. [`meta.json`](https://raw.githubusercontent.com/errata-ai/Readability/master/Readability/meta.json) additionally pins `vale_version: >=2.13.0` and points at a GitHub release feed — there is no per-rule override anywhere in the package; a `.vale.ini` adopter only sets a package-wide `MinAlertLevel`, per the package [README](https://github.com/errata-ai/Readability/blob/master/README.md).

### 2. The Flesch formulas and their standard interpretation table

Direct confirmation from [Wikipedia: Flesch–Kincaid readability tests](https://en.wikipedia.org/wiki/Flesch%E2%80%93Kincaid_readability_tests): Flesch Reading Ease is `206.835 − 1.015·(words/sentences) − 84.6·(syllables/words)`, Flesch-Kincaid Grade Level is `0.39·(words/sentences) + 11.8·(syllables/words) − 15.59` — both match Vale's YAML exactly, byte for byte on the constants.

The standard interpretation table for Reading Ease:

| Score | Grade band | Label |
|---:|---|---|
| 90–100 | 5th grade | Very easy |
| 80–90 | 6th grade | Easy |
| 70–80 | 7th grade | Fairly easy |
| 60–70 | 8th–9th grade | Plain English |
| 50–60 | 10th–12th grade | Fairly difficult |
| 30–50 | College | Difficult |
| 10–30 | College graduate | Very difficult |
| 0–10 | Professional | Extremely difficult |

The fleet's own measured median of 51.6 (`docs-shape.md` §3) sits at the very top of the "Difficult" band, one point above "Fairly difficult." This gives a defensible, honest label for the fleet's current state that a raw number alone does not: the median page is closer to "difficult" than to the "plain English" band the frame's hypothesis assumed docs should already be in.

### 3. No developer-docs style guide states a numeric target — confirmed directly, three times

`canonical-guides.md` asserted this as a secondary finding; this pass re-verified it by fetching three separate guides directly rather than trusting the earlier claim:

- **Microsoft Writing Style Guide** welcome page ([learn.microsoft.com/en-us/style-guide/welcome/](https://learn.microsoft.com/en-us/style-guide/welcome/)) — no numeric target anywhere; the page's entire content is voice/tone framing ("warm and relaxed, crisp and clear") with links to bias-free and global-communications guidance, no metric.
- **GitLab documentation style guide** ([docs.gitlab.com/development/documentation/styleguide/](https://docs.gitlab.com/development/documentation/styleguide/)) — explicitly no readability score or grade target; the only numeric length rule found is a source-formatting convention, "split long lines at approximately 100 characters," which is about diff-friendliness, not reader-facing readability.
- **Google developer documentation style guide** — the specific style page fetched (`developers.google.com/style/sentence-case`) returned 404; Google's site structure has since moved, consistent with `canonical-guides.md`'s own note that Google's guide covers word/sentence mechanics without a numeric target, but this pass could not re-confirm the exact current URL and flags the gap rather than asserting the content unread.

The pattern that circulates online — "Microsoft recommends grade 7–8" — traces to Microsoft *Word's* built-in generic document-readability statistics feature ([Microsoft Support](https://support.microsoft.com/en-us/office/get-your-document-s-readability-and-level-statistics-85b4969e-e80a-4777-8dd3-f7fc3c8b3fd2)), a word-processor default aimed at arbitrary documents, not the Microsoft Writing Style Guide's developer-docs guidance. Citing it as "Microsoft's developer-docs target" would misattribute a general-purpose office-suite default as a technical-writing standard.

### 4. The two numbers that do exist are both citizen-facing, not developer-facing

**GOV.UK / UK government reading age 9.** Confirmed at the primary source, [Home Office User-Centred Design Manual — Readability](https://design.homeoffice.gov.uk/accessibility/written-content/readability): *"Usually we recommend writing for a maximum reading age of 9, even if you are writing for a specialist audience."* The guide names Microsoft Word's readability checker as the measurement tool and is explicit that the number is chosen because government content must reach citizens at the lowest literacy level in the population, not because it is technically achievable for jargon-bearing prose. GDS's own 2016 blog post on the topic ([gds.blog.gov.uk](https://gds.blog.gov.uk/2016/02/23/writing-content-for-everyone/)) does not itself state the number in its body text — the figure is quoted correctly across many secondary government style guides, but its cleanest primary confirmation is the Home Office manual, not the original GDS post.

**Vale's Flesch-Kincaid grade > 8.** A generic default shipped by a style-linting tool, not chosen for any developer-docs corpus — see Finding 1.

Both numbers are rejected as direct targets for this rule: GOV.UK's is calibrated for citizen services where the alternative to plain language is excluding a resident from a government process, a different failure mode than a developer misreading a flag description. Vale's is a tool default with no stated derivation beyond "keep it below 8," present because Vale ships *a* number for every metric rule, not because 8 was validated against technical prose.

**Rejected secondary claim: grade 9–13 for technical readers.** Fetched directly from [docsie.io](https://www.docsie.io/blog/glossary/flesch-kincaid/) ("Technical specialists: Grades 10–13… Professional users: Grades 9–11… Consumer-facing content: Grades 6-8") and [clickhelp.com](https://clickhelp.com/clickhelp-technical-writing-blog/improve-the-readability-of-your-technical-documentation-with-flesch/) ("translating complex, academic-level texts into content that can be understood at a Grade 7–8 reading level"). Both are SaaS-vendor glossary/blog content, not a style guide or a study, and both are grade-level numbers this rule avoids on formula grounds (Finding 2). Recorded as rejected, not adopted — named explicitly per the brief's requirement to say which sources were rejected and why.

### 5. GOV.UK's two hard numbers, checked against the fleet

[GOV.UK's clear-language guidance](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/clear-language/), fetched directly, states two exact numbers with no hedge:

- *"Try to split up sentences that are over 25 words long."*
- *"Paragraphs should have no more than 5 sentences each."*

Checked against `docs-shape.md` §3's fleet measurements: mean sentence length is 19.5 words fleet-wide, with a 0.3–0.4 *share* of sentences over the long-sentence threshold in the largest repos (`ocx`, `grimoire`, `ocx-sdk-python`, `grimoire-indexer`, `grimoire-vscode` all sit at 0.3–0.4). A mean of 19.5 is comfortably under 25, but a 30–40% long-sentence share means roughly one in three sentences in the fleet's biggest repos already breaks GOV.UK's own line, which is a materially different fact than "the average sentence is fine." **Decision:** gate on the 25-word split rule at the sentence level (not the per-page mean), because the mean hides exactly the long-tail problem the fleet's own numbers show is real.

### 6. The identifier problem: bare identifiers don't just get miscounted, they can inflate the score

Every Flesch-family formula counts syllables and words by pattern-matching letters. `docs-shape.md` §3 already had to strip code fences, frontmatter, headings, tables and inline code spans before any number was meaningful — this pass reused that exact preprocessing (verified runnable, see Finding 8) rather than reinventing it, and tested what happens to identifiers that survive the strip because they were never wrapped in a code span to begin with.

Two identifier shapes behave differently, tested directly against the reused word/syllable regexes:

- `OCIImageIndex` (CamelCase, no digits) is captured as one 13-letter word and scored at 5 syllables by vowel-group counting — a plausible, if crude, estimate.
- `sha256` is captured as `sha` only — the word-boundary regex (`[A-Za-z']+`) does not match digits, so `256` silently disappears rather than corrupting the count.
- A 64-character hex digest (`e3b0c4429...`) is torn into roughly twenty separate 1–3 letter fragments at every digit boundary, each counted as a full "word" worth one syllable.

The measured effect, run directly against the two-sentence example below (scored with the script in Finding 8):

| Text | Flesch Reading Ease |
|---|---:|
| `Run e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 as the checksum and pass enable-strict-mode-validation to turn it on.` (bare) | 75.7 |
| `Run \`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\` as the checksum and pass \`enable-strict-mode-validation\` to turn it on.` (code-spanned) | 103.6 |

The bare-identifier version scores *lower*, not higher, once the code span is added — because stripping the wrapped identifier entirely removes it from both the word and syllable count, shortening and simplifying the sentence the formula actually sees. The direction is not always the same (a short CamelCase token like `OCIImageIndex` behaves closer to a real word and barely moves the score; a long digit-bearing token can swing either way depending on how the digit boundaries fall), which is exactly why this is a scoring-integrity problem and not a "reference pages score lower, so give them a lower floor" problem: the same page can be made to look easier or harder by a coincidence of hyphen and digit placement, independent of whether a human would find it clear. **This is the concrete, first-hand evidence behind Normative guidance #5**: identifiers belong in code spans as a lint of their own, upstream of the readability formula, not as a special case inside it.

### 7. The reference carve-out: three candidate mechanisms, one measured winner

The brief names three candidates: exemption by declared page type, by identifier density, or by path.

**Path is rejected on measured evidence.** `docs-shape.md` §2's own path-based classifier already puts 31.9% of the fleet's 248 pages into an unclassifiable `other` bucket, and names the specific cause: `grimoire`'s mdBook docs are a flat single directory (`grimoire/docs/src/*.md`, no `reference/` subfolder), so a page a human would call reference material (`commands.md`) carries no path signal at all. A carve-out keyed on path would silently fail to exempt exactly the pages it exists to protect, in a real fleet member, not a hypothetical one.

**Identifier density is rejected as the primary mechanism, kept as a named future hardening.** It is possible to measure the share of stripped-prose tokens that are identifier-shaped (contains a digit, internal hyphen/underscore, or mixed case with no vowel-only reading) and auto-route a page over some threshold to the exemption. This pass did not adopt it for v1 because it requires tuning a threshold with no fleet-measured baseline to calibrate against (unlike the Flesch floor, which has one: the measured median), and because it duplicates work the identifier-code-span lint (Finding 6) should already be doing upstream. It is named here so a future pass does not have to rediscover it, and it is the fallback for any page a project has not yet typed.

**Declared page type is the mechanism adopted.** The sibling `page-types.md` file already commits to a declaration key (per the topic map's artifact-split table) as the authoritative source of a page's type for every other per-type contract in the rule set. Reusing the same key here — rather than inventing a second, readability-specific classification — means one frontmatter read decides both "what structural contract does this page follow" and "does the Flesch floor apply," with no duplicate logic and no risk of the two disagreeing. A page with `type: reference` or `type: troubleshooting` in frontmatter is exempt; every other declared type gets the floor; an undeclared page defaults to **not exempt** (fail closed, so a missing declaration cannot silently escape the gate the way a missing path signal already does under the rejected mechanism).

### 8. The runnable script

Reuses `docs-shape.md`'s exact stripping order (frontmatter → code fences → ATX headings → table rows → inline code spans) and its exact Flesch Reading Ease formula, adds only the frontmatter type read and the floor comparison. Verified runnable in this pass (self-check plus three fixture files, all producing the numbers shown in Findings 6 and the examples below).

```python
#!/usr/bin/env python3
"""Readability gate: Flesch Reading Ease per page, floor by declared page type.
No third-party deps. Score is computed on STRIPPED prose, never raw text.
Usage: python3 readability_gate.py <file.md> [<file.md> ...]
Exit code: 0 if every prose-type page clears its floor, 1 otherwise.
"""
import re, sys

FRONTMATTER_RE = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)
CODE_FENCE_RE = re.compile(r"^\s*(```|~~~)")
ATX_HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)")
INLINE_CODE_RE = re.compile(r"`[^`\n]+`")
TABLE_ROW_RE = re.compile(r"^\s*\|.*\|\s*$|^\s*\|?[\s:|-]+\|?\s*$")
SENT_SPLIT_RE = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9\"'(])")
WORD_RE = re.compile(r"[A-Za-z']+")
VOWEL_GROUPS_RE = re.compile(r"[aeiouyAEIOUY]+")
TYPE_KEY_RE = re.compile(r"^\s*(?:type|doc_type)\s*:\s*[\"']?([\w-]+)[\"']?\s*$", re.MULTILINE)

EXEMPT_TYPES = {"reference", "troubleshooting"}  # delta-checked instead; see Finding 7
FLOOR = 50.0  # fleet's own measured median -- calibrated, not aspirational

def count_syllables(word):
    word = word.lower()
    n = len(VOWEL_GROUPS_RE.findall(word))
    if word.endswith("e") and n > 1 and not word.endswith("le"):
        n -= 1
    return max(n, 1)

def declared_type(text):
    m = FRONTMATTER_RE.match(text)
    if not m:
        return None
    tm = TYPE_KEY_RE.search(m.group(1))
    return tm.group(1) if tm else None

def strip_to_prose(text):
    text = FRONTMATTER_RE.sub("", text)
    out, in_fence = [], False
    for ln in text.split("\n"):
        if CODE_FENCE_RE.match(ln):
            in_fence = not in_fence; continue
        if in_fence: continue
        if ATX_HEADING_RE.match(ln): out.append(""); continue
        if TABLE_ROW_RE.match(ln): continue
        out.append(ln)
    return INLINE_CODE_RE.sub(" ", "\n".join(out))

def flesch_reading_ease(prose):
    sentences = []
    for block in re.split(r"\n\s*\n", prose):
        block = " ".join(block.split())
        if not block: continue
        parts = [p for p in SENT_SPLIT_RE.split(block) if p.strip()]
        sentences.extend(parts if parts else [block])
    words = WORD_RE.findall(prose)
    if not words or not sentences:
        return None
    syllables = sum(count_syllables(w) for w in words)
    return round(206.835 - 1.015 * (len(words) / len(sentences))
                 - 84.6 * (syllables / len(words)), 1)

def main(paths):
    failed = False
    for path in paths:
        raw = open(path, encoding="utf-8").read()
        ptype = declared_type(raw)
        if ptype in EXEMPT_TYPES:
            print(f"SKIP  {path}  (type={ptype}, exempt -- use the delta check instead)")
            continue
        score = flesch_reading_ease(strip_to_prose(raw))
        if score is None:
            print(f"SKIP  {path}  (no scoreable prose)"); continue
        if score < FLOOR:
            failed = True
            print(f"WARN  {path}  Flesch {score} < floor {FLOOR} (type={ptype or 'undeclared'})")
        else:
            print(f"OK    {path}  Flesch {score} (type={ptype or 'undeclared'})")
    return 1 if failed else 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
```

Fixture results from this pass (see Findings 5–6 for the sentences):

| Fixture | Declared type | Flesch RE | Gate result |
|---|---|---:|---|
| Dense, stacked-clause paragraph (Finding 6's "bad" example, rewritten as prose) | how-to | −24.5 | WARN |
| Its plain-English rewrite | how-to | 66.8 | OK |
| Identifiers left bare in running prose | (none declared) | 62.8 | OK — but see Finding 6: this is not reliable, it is coincidence of this example's token shapes |
| Same sentence with identifiers in code spans | (none declared) | 66.4 | OK |
| `type: reference` frontmatter, identifiers in code spans | reference | — | SKIP (exempt) |

**Before / after, the paragraph GOV.UK's rules and the Flesch floor both catch:**

```text
BAD (Flesch −24.5, 55-word single sentence, fails the 25-word split rule twice over):
Prior to initiating the configuration process, it is recommended that users
ensure that all prerequisite dependencies, which may include but are not
limited to the runtime environment, associated libraries, and any relevant
authentication credentials, have been properly installed and validated in
order to facilitate a successful deployment.

GOOD (Flesch 66.8, four short sentences, longest at 8 words):
Before you configure the tool, install its dependencies. You need the
runtime, the libraries, and your auth credentials. Check each one now.
This avoids a failed deploy later.
```

## Normative guidance candidates

1. **Score Flesch Reading Ease, not a grade-level formula, on every page whose declared type is not `reference` or `troubleshooting`.**
   Rationale: it is the formula already computed by the fleet's own audit tooling and the only Vale-shipped formula whose interpretation table (Finding 2) names honest bands ("Fairly Difficult") instead of implying an unjustified grade-level claim (Finding 3).
   Verify: `python3 checks/readability_gate.py <changed files>` exits 0; a fresh reader can also read the score straight off Finding 2's table with no formula literacy needed.
   Evidence level: **codified** (this is Vale's own default formula choice, directly confirmed) + **argued** (the choice of Reading Ease over grade-level, for the labelling reason).

2. **Set the floor at Flesch Reading Ease ≥ 50, one number for every non-exempt page type, not five invented per-type numbers.**
   Rationale: it equals the fleet's own measured median (`docs-shape.md` §3), so it is achievable today for roughly half the corpus and a real ask for the other half — not an aspirational 60 that only 3 of 15 substantial repos have ever cleared.
   Verify: the script's `FLOOR = 50.0` constant; a reviewer reruns the fleet audit script (`docs-shape.md` §3) periodically to confirm 50 still sits at or near the current median and is not silently stale.
   Evidence level: **measured** (the number itself) + **argued** (that one number beats a per-type matrix nothing in the sources actually justifies).

3. **Exempt pages declared `type: reference` or `type: troubleshooting` (the key owned by `page-types.md`) from the Flesch floor entirely. Do not give them a laxer number.**
   Rationale: every syllable-based formula breaks on identifiers (Finding 6); a laxer number is still an arbitrary number, while exemption plus a different, honest check (candidate 4) is not.
   Verify: the script's `EXEMPT_TYPES` set, and a reviewer confirms the frontmatter `type:`/`doc_type:` value on any page claiming the exemption — a page with no declared type is **not** exempt (fail closed).
   Evidence level: **argued**, grounded in the measured identifier-distortion evidence in Finding 6.

4. **On a reference or troubleshooting page, fail the PR only if the touched page's post-edit Flesch score drops more than 10 points from its pre-edit score.**
   Rationale: practitioner sources are explicit that the metric is better used as a relative gauge between drafts than an absolute bar for identifier-dense prose (Finding 4); a delta check catches a page getting materially worse without asserting a floor nothing justifies.
   Verify: run the script against the pre-image and post-image of any file in `EXEMPT_TYPES` touched by the diff; fail if `pre − post > 10`.
   Evidence level: **argued**.

5. **Every bare identifier (a token containing a digit, an internal hyphen/underscore, or mixed case, outside a code span) must be wrapped in a code span, checked upstream of the readability score.**
   Rationale: bare identifiers do not just get miscounted, they can make a page look easier or harder by coincidence of digit/hyphen placement (Finding 6) — fixing this upstream means the readability formula never has to special-case identifiers at all.
   Verify: a grep/markdownlint-shaped rule (owned by the sibling `lint-mechanism-and-rule-verification-shape` topic) flags any prose-context match of a pattern like `\b[a-z0-9]+[-_][a-z0-9_-]+\b|\b\w*\d\w*\b` outside backticks; this readability rule only states the dependency, not the exact grep.
   Evidence level: **argued**, backed by the direct measurement in Finding 6.

6. **Split any sentence over 25 words. Cap any paragraph at 5 sentences.**
   Rationale: both numbers are GOV.UK's own stated rules, confirmed at the primary source (Finding 5), and the fleet's 0.3–0.4 long-sentence *share* in its largest repos shows the mean alone (19.5 words) hides a real, sizeable long-tail failure.
   Verify: a stripped-text scan splitting on sentence-ending punctuation and counting words per sentence, and counting sentences between blank-line-separated paragraph blocks — the same sentence-splitting the script above already performs, so no second implementation is needed.
   Evidence level: **normative** (GOV.UK states these as its own house rule) + **measured** (checked against the fleet).

7. **Score computed on stripped prose (frontmatter, code fences, headings, tables, inline code removed), never on raw file text.**
   Rationale: an ATX heading with no terminal punctuation merges into the next paragraph and corrupts sentence splitting; a table row reads as one run-on clause; both were measured problems in the fleet's own first attempt (`docs-shape.md` §3).
   Verify: the script's `strip_to_prose()` function is the one and only preprocessing path; a reviewer can diff a page's raw word count against its post-strip word count and confirm the drop matches its code-fence and table content.
   Evidence level: **codified** (this is a working, tested implementation, not a proposal).

8. **Severity is `warning` fleet-wide for the Flesch floor and the two GOV.UK length rules; `error` is permitted only for the reference/troubleshooting delta check, and only on the exact page a PR touches.**
   Rationale: Vale's own shipped Readability package carries no `level:` override anywhere, defaulting to `suggestion` (Finding 1) — matching that default avoids locking out a corpus whose current median already sits under the target on day one, while the delta check is inherently diff-scoped and so can never block an unrelated PR.
   Verify: confirm the lint config's `MinAlertLevel` (or equivalent) for the readability rules is `warning`, and that the delta check runs as a diff-scoped CI step, not a whole-corpus one.
   Evidence level: **codified** (Vale's default) + **argued** (the extension of that logic to the delta check).

## AI-agent angle

- **Defaults to a suspiciously round, unearned number.** Asked to "add a readability gate," an LLM's first instinct is often "Flesch-Kincaid grade 8" or "reading age 9," lifted wholesale from GOV.UK or generic SEO-writing advice with no note that both are citizen-facing defaults, not developer-docs numbers (Finding 4). Mechanical check: grep the shipped rule and its rationale for the literal string "grade" or "reading age" without an adjacent citation to a source this document's Sources table lists — an uncited number is the tell.
- **Invents a five-row per-type threshold matrix because "page types differ."** This sounds thorough and is exactly the failure mode Normative guidance #2 rejects: five asserted numbers with no source backing any single one of them, dressed up as rigor. Mechanical check: count distinct numeric thresholds in the shipped config; more than two (the floor, and the delta tolerance) is a red flag demanding a citation per number.
- **"Fixes" the identifier problem inside the formula** (special-casing syllable counts for anything containing a digit, say) instead of routing it to an upstream lint. This duplicates logic that already has a natural home (a code-span rule) and produces a bespoke, unaudited scoring tweak nobody else's tooling shares. Mechanical check: any modification to `count_syllables()` or the word regex beyond what is shown in Finding 8's script is scope creep — the fix belongs in a separate check file, not the formula.
- **Sets severity to `error` for a corpus-wide readability floor on first rollout**, because "if we don't block it, it won't get fixed." Given the fleet's measured median (51.6) sits below most plausible floors, this locks out nearly every existing PR from day one. Mechanical check: a new lint config that sets `MinAlertLevel: error` (or the equivalent for the chosen tool) without a documented rollout window is the tell; compare against Vale's own shipped default (`suggestion`) as a baseline that must be deliberately overridden, with a stated reason, before tightening.
- **Computes the score against raw file text, including code fences and frontmatter.** An agent asked to "just run Flesch-Kincaid on the markdown" will often skip the stripping step because it looks like unnecessary preprocessing for "a simple readability check." Mechanical check: feed the script (or whatever tool is adopted) a fixture file containing a large fenced code block of gibberish tokens and confirm the score does not move — if it does, stripping is missing or incomplete.
- **Claims the em-dash/readability gate proves or measures "AI-generated" text.** The em-dash and readability checks measure legibility and house style, not provenance (Finding 2 of the sibling `ai-tell-set-and-honest-label` topic makes this explicit; this document's Summary states it too). Mechanical check: grep the shipped rule's prose for "AI-generated," "detect," or "flag as AI" — any of those in the readability rule's own text, rather than the separate tell-taxonomy rule, is a mislabelling to fix.

## Contested / evolving

**Named conflict (owner: this topic): "A readability grade target at all — none in dev-doc guides, GOV.UK's 9 for citizens, 9–13 for technical readers, Vale's 8 at suggestion."**

Resolved as follows, each branch checked at the primary source in this pass:

- *No developer-docs guide states a number* — confirmed directly against Microsoft's and GitLab's guides (Finding 3); Google's specific page could not be re-fetched (404) so that one branch stays at the prior pass's secondary-sourced confidence, flagged rather than silently asserted as re-verified.
- *GOV.UK's 9* — confirmed at the Home Office design manual as a deliberately citizen-facing, literacy-floor number, explicitly stated to apply "even" to specialist audiences, which is precisely why it is rejected here rather than adopted: GOV.UK is choosing to override audience level on purpose, for a different institution with a different failure mode than a docs site.
- *9–13 for technical readers* — confirmed at its source (Docsie, ClickHelp), and rejected as marketing-adjacent secondary content with no controlling study behind it, plus it is grade-level rather than Reading Ease.
- *Vale's 8 at suggestion* — confirmed as a tool default with no dev-docs-specific derivation (Finding 1), useful precedent for severity (adopt `suggestion`/`warning` as the default posture) but not for the number itself.

**Resolution:** this rule states a number — Flesch Reading Ease ≥ 50 — but explicitly as a fleet-calibrated floor (the measured median), not a borrowed "grade 8" or "reading age 9" figure, and explicitly exempts the one page type (reference, plus troubleshooting) where no number in any source is defensible, replacing it with a delta check instead. This is offered as this rule's own resolution, not a claim that the wider industry has converged — the industry material found in this pass (Findings 3–4) shows genuine non-convergence on whether developer docs should carry a stated number at all, and this document takes a side rather than reporting a false consensus.

**Trending, as of September 2026:** the practitioner material (Finding 4, Docsie/ClickHelp) is moving toward "use it as a relative gauge, not a pass/fail bar" — this document's delta-check design for reference pages (Normative guidance #4) already follows that direction rather than lagging it, while the floor for prose pages keeps an absolute number because, unlike reference prose, ordinary how-to and explanation prose is not fighting an identifier-driven formula distortion and a floor is measurable and stable there.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| [errata-ai/Readability — FleschKincaid.yml](https://raw.githubusercontent.com/errata-ai/Readability/master/Readability/FleschKincaid.yml) | Vale style-package rule file, fetched raw | Vale ≥2.13.0, package current as of Sept 2026 | Ground truth for the FK grade formula, its `> 8` condition and its message; confirms no `level:` override |
| [errata-ai/Readability — FleschReadingEase.yml](https://raw.githubusercontent.com/errata-ai/Readability/master/Readability/FleschReadingEase.yml) | Vale style-package rule file, fetched raw | same | Confirms the exact Reading Ease formula and its `< 70` condition, the formula this rule adopts |
| [errata-ai/Readability — GunningFog.yml](https://raw.githubusercontent.com/errata-ai/Readability/master/Readability/GunningFog.yml) | Vale style-package rule file, fetched raw | same | One of the "other six" the brief asked to confirm rather than assume |
| [errata-ai/Readability — SMOG.yml](https://raw.githubusercontent.com/errata-ai/Readability/master/Readability/SMOG.yml) | Vale style-package rule file, fetched raw | same | Same |
| [errata-ai/Readability — ColemanLiau.yml](https://raw.githubusercontent.com/errata-ai/Readability/master/Readability/ColemanLiau.yml) | Vale style-package rule file, fetched raw | same | Same |
| [errata-ai/Readability — AutomatedReadability.yml](https://raw.githubusercontent.com/errata-ai/Readability/master/Readability/AutomatedReadability.yml) | Vale style-package rule file, fetched raw | same | Same |
| [errata-ai/Readability — LIX.yml](https://raw.githubusercontent.com/errata-ai/Readability/master/Readability/LIX.yml) | Vale style-package rule file, fetched raw | same | Same, plus the only one with an inline scale comment (20–25 "Very Easy" through 60+) |
| [docs.vale.sh/topics/styles/](https://docs.vale.sh/topics/styles/) | Vale's own tool documentation | Current, 2026 | Confirms the default severity (`suggestion`) applied when a rule has no `level:` field, and the full rule-type catalogue |
| [en.wikipedia.org/wiki/Flesch–Kincaid_readability_tests](https://en.wikipedia.org/wiki/Flesch%E2%80%93Kincaid_readability_tests) | Reference encyclopedia article | Stable | Independent confirmation of both Flesch formulas and the standard 8-band interpretation table used in Finding 2 |
| [design.homeoffice.gov.uk/accessibility/written-content/readability](https://design.homeoffice.gov.uk/accessibility/written-content/readability) | UK Home Office design-manual page | Current, 2026 | Primary confirmation of the "reading age of 9, even for a specialist audience" figure, with its stated rationale |
| [guidance.publishing.service.gov.uk — clear language](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/clear-language/) | UK government content-design standard | Current, 2026 | Primary source for the two hard numbers (25-word sentence split, 5-sentence paragraph cap) this rule adopts |
| [learn.microsoft.com/en-us/style-guide/welcome/](https://learn.microsoft.com/en-us/style-guide/welcome/) | Microsoft Writing Style Guide, landing page | Updated 2025–2026 | Direct confirmation that the developer-facing style guide states no numeric readability target |
| [docs.gitlab.com/development/documentation/styleguide/](https://docs.gitlab.com/development/documentation/styleguide/) | GitLab documentation style guide | Current, 2026 | Second independent confirmation of "no numeric target" among dev-docs guides, plus its own (unrelated) 100-character line-wrap rule |
| [support.microsoft.com — readability statistics](https://support.microsoft.com/en-us/office/get-your-document-s-readability-and-level-statistics-85b4969e-e80a-4777-8dd3-f7fc3c8b3fd2) | Microsoft Office product support page | Current | Source of the "grade 7–8" figure that is commonly misattributed to the Writing Style Guide; documents it is Word's generic feature instead |
| [docsie.io — Flesch-Kincaid glossary](https://www.docsie.io/blog/glossary/flesch-kincaid/) | SaaS vendor glossary/blog page | 2026 | Source of the "9–13 for technical readers" figure, fetched directly and explicitly rejected as evidence in Finding 4 |
| [clickhelp.com — Flesch readability blog](https://clickhelp.com/clickhelp-technical-writing-blog/improve-the-readability-of-your-technical-documentation-with-flesch/) | Technical-writing SaaS vendor blog | 2026 | Corroborates the identifier/jargon caveat and the "relative gauge, not absolute bar" framing this rule's delta check follows |
| [`../docs-audit/docs-shape.md`](../docs-audit/docs-shape.md) §2–§3 | This program's own fleet-measurement audit | 2026-09-05 | Source of the fleet's measured median Flesch (51.6), mean sentence length (19.5), long-sentence share, and the reused stripping script |
| [`../docs-topic-map/codified-practice.md`](../docs-topic-map/codified-practice.md) §3–§4 | This program's prior grounding-wave scout report | 2026-09-05 | First-pass finding this document re-verified at the primary source rather than re-citing unchecked |
| [`../docs-topic-map/exemplar-sites.md`](../docs-topic-map/exemplar-sites.md) §12 | This program's prior grounding-wave scout report | 2026-09-05 | Source of the audience-tiered grade claim this document traced to its origin and rejected |
