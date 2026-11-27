---
title: Recent shifts the docs-quality pair does not mention (delta 2026-09-05 to 2026-11-27)
pair: docs-quality
date_researched: 2026-11-27
window_start: 2026-09-05
model: sonnet
sources_fetched: 19
---

# Recent shifts the docs-quality pair does not mention

Scope: a delta on top of `.agents/research/docs-topic-map/recent-shifts-and-tooling.md` (September 2024 to September 2026). Only upstream changes dated 2026-09-05 or later are ranked. Anything older that I met on the way is listed under "Seen but excluded". The Deep-Dive contract's minimum of 12 sources does not apply to a delta; 19 pages were fetched, 11 of them primary.

## Contents

- [Summary](#summary)
- [Findings: ranked shifts](#findings-ranked-shifts)
- [Claims at risk](#claims-at-risk)
- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Seen but excluded](#seen-but-excluded)
- [Sources](#sources)

## Summary

- Five shifts in the window touch the pair. None needs a new MUST rule. One changes the pinned text of DOC-PLAIN-22, four need only a Not studied line.
- The only contradiction of an existing rule is DOC-PLAIN-22's commit-trailer ban on `assisted-by`. The kernel, which created the `Assisted-by:` convention in January 2026, decided on 2026-10-08 to deprecate it. The ban now sits closer to the kernel's end state than to Fedora's recommendation.
- No generator reached a stable major in the window. VitePress is still at 2.0.0-alpha.21, Docusaurus has no 4.0 (3.10.2 is newest), Starlight was last seen at 0.41.6 (July). The pair's generator statements need no change.
- WCAG 3 published a new Working Draft on 2026-09-10 and is still a draft. WCAG 2.2 stays the normative target, so the pair's accessibility gap stays a gap, not a rule.
- I found no prose-lint or AI-tell tool with a measured false-positive rate in the window. Nothing to add there.

## Findings: ranked shifts

### 1. Linux kernel deprecates the `Assisted-by:` trailer (changed rule, pinned text only)

Date: 2026-10-08 (Maintainers Summit consensus), reported 2026-10-14.
Source: [The Register, 2026-10-14](https://www.theregister.com/ai-and-ml/2026/10/14/linux-kernel-devs-drop_obligatory_confession_of_ai_tool_usage/5303140), [Slashdot 2026-10-17](https://linux.slashdot.org/story/26/10/17/0723207/linux-maintainers-can-now-submit-ai-generated-code-without-declaring-it), background in [LWN 2026-07-21](https://lwn.net/Articles/1083275/).
Pair location: `skills/docs-quality-reference/plain-english.md`, DOC-PLAIN-22 row and its entry under "Pinned decisions".

What happened. The kernel's `Documentation/process/coding-assistants.rst` required an `Assisted-by: AGENT_NAME:MODEL_VERSION` trailer from January 2026 (The Register). In July 2026 Christian Brauner proposed shortening it to `Assisted-by: LLM`, and Jeff Layton posted a removal patch (LWN). At the October summit Sasha Levin reported "consensus to deprecate the Assisted-by Tag" and asked to "Remove the documentation requiring it". Layton's reasons: not everyone follows it, it is "free advertising for proprietary LLM companies", and it is unclear why the data is wanted. Laurent Pinchart objected to removal without another disclosure mechanism. Torvalds argued that understanding the code matters, not the tool. The Register names no replacement mechanism. The rule that agents must not add `Signed-off-by` is unchanged (verified in the live [kernel doc](https://docs.kernel.org/process/coding-assistants.html), build 7.4.0-rc4). That live page still showed the pre-decision text in the copies I could read, so whether the removal patch is merged I could not determine. One secondary source says it was applied on 2026-10-14; I did not verify that.

Why the pair is affected. DOC-PLAIN-22 rejects any commit trailer matching `assisted-by`, `Co-Authored-By:` naming a model, or `co-developed`. The pinned note says "Two other real policies exist" (a banner and an outright ban) and omits the trailer convention that Fedora already recommends (council policy v1.0, approved 2025-10-22, per search result; the Fedora page itself returned an Anubis block, so unverified from the primary). The decision to disclose on the PR body and never in a trailer is better supported after October than before, because the project that invented the trailer abandoned it. The ban is house style, though, and an adopter that contributes upstream to Fedora or to a kernel tree still on the old text would hit the contradiction.

Recommended change: reword the pinned entry only. State that the ban is house style, that Fedora recommends `Assisted-by:` and the kernel deprecated it in October 2026, and that an adopter submitting upstream follows the upstream policy for that repository. The grep stays as written.

Context from the same period: [CPython](https://discuss.python.org/t/updated-triage-guidelines-and-process-for-our-ai-policy/109717/1.md) (2026-10-28) added `AI-needs-explanation` and `AI-guidelines-not-met` labels and kept PR-description disclosure "appreciated, while not required"; [devguide](https://devguide.python.org/getting-started/ai-tools/) names no trailer. This confirms that Python uses neither trailer style.

### 2. IETF individual draft for LLM context-file discovery (Not studied line)

Date: 2026-10-05 (draft-arsentev-llm-context-discovery-01).
Source: [IETF draft](https://www.ietf.org/archive/id/draft-arsentev-llm-context-discovery-01.html).
Pair location: `skills/docs-quality-reference/machine-readers.md`, "Not studied", bullet "Discovery files beyond `llms.txt`".

It is an Independent Submission, informational, not IETF consensus, expiring 2027-04-08. It proposes three discovery routes: `/.well-known/llm-context`, an HTTP `Link: </llms.txt>; rel="llm-context"` header, and an `LLM-Context:` record in `robots.txt`, with precedence Link header, then well-known URI, then robots.txt. Files should be UTF-8 Markdown served as `text/markdown` or `text/plain`, index under 100,000 octets. The author's own logs (28 August to 11 September 2026) show 46,155 crawler requests and zero fetches of `llms.txt` or `llms-full.txt`, a single-publisher observation by an author who admits the User-Agent data is self-asserted. It supports DOC-AGENT-04's existing stance (llms.txt is an index, not the mechanism) and adds a header-based discovery proposal the pair does not name. Not enough to be a rule: one author, no implementations cited.

Recommended change: extend the Not studied bullet with one sentence naming the draft and the three routes.

### 3. WCAG 3.0 Working Draft of 2026-09-10 (Not studied line)

Date: 2026-09-10; WAI commentary 2026-09-25.
Source: [W3C TR](https://www.w3.org/TR/wcag-3.0/), [WAI news, 2026-09-10](https://www.w3.org/WAI/news/2026-09-10/wcag3/), WAI news index listing "Crafting WCAG 3 for more accessible user experiences" (2026-09-25; the page URL I guessed returned 404, so I read only its title).
Pair location: `rules/docs-quality.md` "Not studied" (accessibility bullet), `plain-english.md`, `navigation.md`, `page-types.md` Not studied bullets.

The draft is "an update" that "includes all requirements that have reached the developing status", still has "several years of work", and "details will change". WCAG 2.2 remains the testable standard. The pair's DOC-EX-16 cites WCAG 2.2.2 and stays correct. I found no docs generator that ships an accessibility checker usable as a gate in the window (could not determine; not searched beyond Docusaurus, whose changelog lists only a skip link).

Recommended change: one clause in the rules-file accessibility bullet saying WCAG 3 is a Working Draft as of 2026-09-10 and no rule should cite it. No new rule.

### 4. Material for MkDocs maintenance extended; MkDocs 1.x closed to contributors (Not studied line)

Dates: 2026-09-16 (extension), 2026-10-02 (1.x repo closed), 2026-08-30 (MkDocs 2.0 pre-release on PyPI, before the window).
Source: [Material for MkDocs blog post, update notes](https://squidfunk.github.io/mkdocs-material/blog/2026/02/18/mkdocs-2.0) and the [site banner](https://squidfunk.github.io/mkdocs-material/): critical maintenance now runs through 2027-05-05.
Pair location: `machine-readers.md` generator table and its "Twin generation mechanics" Not studied bullet; `rules/docs-quality.md` keywords list `mkdocs`.

The post says MkDocs 2.0 is a pre-release with no release date, is not a drop-in replacement for 1.x, and Zensical is the compatible successor that the authors call "not fully there yet". The pair names no succession state at all. A search snippet claimed support ended on 2026-11-05; the primary page says 2027-05-05, so the snippet was stale or wrong. I found no Zensical 1.0 and no native `llms.txt` or Markdown-twin output from Zensical (a February 2026 third-party PR built a standalone generator because of that gap).

Recommended change: one Not studied line stating the succession state with dates, so no agent recommends "migrate to MkDocs 2.0" or assumes Zensical emits twins.

### 5. Disclosure policies of other projects in the window (Not studied line, merge with shift 1)

Rust adopted an LLM policy for `rust-lang/rust` on 2026-08-05, before the window, so it is excluded. The Python items above are in-window. Neither Rust nor Python gave me a trailer convention; I could not read the Rust policy text itself (only a blog title in search). Gentoo's 2024 ban is unchanged. GitHub: its own Copilot agent commits carry `Co-authored-by` and, since 2026-03-20, an `Agent-Logs-Url` trailer ([changelog](https://github.blog/changelog/2026-03-20-trace-any-copilot-coding-agent-commit-to-its-session-logs), search result only, before the window). Result: no standard `Assisted-by:` across Python, Rust, Gentoo or GitHub. Recommended change: fold into shift 1's pinned-note rewrite.

## Claims at risk

| Claim in the pair or baseline | Status | Detail |
|---|---|---|
| VitePress stable is 1.x, 2.0 is alpha-only (baseline: alpha.19) | unchanged | Releases page shows 2.0.0-alpha.20 (04 Sep, one day before the window) and alpha.21 (25 Oct, [releases](https://github.com/vuejs/vitepress/releases)). No 2.0 beta or stable. The year is not shown on the page; I inferred it from the sequence. |
| Docusaurus 3.9 is current (baseline) | changed, outside window | 3.10.0 (2026-04-07), 3.10.1 (2026-04-30), 3.10.2 (2026-07-10), all before 2026-09-05. No 4.0 and no native llms.txt or Markdown output ([changelog](https://docusaurus.io/changelog)). Community plugins only. |
| Starlight has no first-party versioning (baseline) | could not determine | Search showed 0.41.6 on 2026-07-31 and no 1.0; the official release page was not fetched. |
| Material for MkDocs in maintenance mode, Zensical successor | changed | Old text: maintenance mode since late 2025. New fact: critical maintenance extended to 2027-05-05 on 2026-09-16; MkDocs 1.x closed to outside contributions 2026-10-02. [Source](https://squidfunk.github.io/mkdocs-material/blog/2026/02/18/mkdocs-2.0). |
| llms.txt v2 landed 2026-08-10 (baseline) | changed in date | [llmstxt.org changes](https://llmstxt.org/changes.html) lists v2 as "August 2026" (adds `rel="alternate" type="text/markdown"`, subpath llms.txt, drops `llms_txt2ctx`). No entry after 2026-09-05. |
| DOC-PLAIN-22 bans `assisted-by` trailers | changed context | See shift 1. |
| `Accept: text/markdown` is vendor practice | unchanged | No IETF, W3C or other standard found. Cloudflare Markdown for Agents is dated 2026-02-12 and Vercel's practice is older, both before the window. |
| No measured false-positive rate for prose/AI-tell lint | could not determine | Only detector literature found; the Epoch AI result is July 2026 and covers whole-document classifiers, not lint rules. |
| Versioned docs and i18n tooling not studied | could not determine | No in-window change found for Docusaurus, Starlight or Zensical. |
| Write the Docs newsletter | could not determine | Only the March 2026 issue turned up. |

## Normative guidance candidates

1. Rule: keep DOC-PLAIN-22's trailer grep, but reword its pinned entry to say the ban is house style and an upstream repository's own trailer policy wins when contributing there.
   Rationale: Fedora recommends `Assisted-by:`; the kernel deprecated it on 2026-10-08; the pair currently states neither.
   Verification: `grep -n "Fedora\|kernel" skills/docs-quality-reference/plain-english.md` finds the pinned entry; a reviewer confirms it still says disclosure lives on the pull request body.
2. Rule: no new MUST or SHOULD rule for discovery headers, WCAG 3, or generator succession.
   Rationale: each source is a draft, an individual submission or vendor news; the pair pins decisions on measured results and none of these has any.
   Verification: reading heuristic, any proposed rule must cite a measured result or a stable specification, not a Working Draft.
3. Rule: add Not studied lines for shifts 2, 3 and 4 as worded above.
   Rationale: the pair promises to name what it did not measure; these three are known and absent.
   Verification: `grep -n "llm-context\|WCAG 3\|2027-05-05" skills/docs-quality-reference/machine-readers.md rules/docs-quality.md` returns one hit per line added.

## AI-agent angle

- An agent trained before October 2026 will recommend `Assisted-by:` trailers on the strength of the kernel doc. DOC-PLAIN-22's grep catches it in the commit-message check.
- An agent may recommend migrating to MkDocs 2.0 or assert Zensical emits `llms.txt`. Both are unsupported by the sources above; the Not studied line is the guard.
- An agent may cite WCAG 3 criteria as testable. They are not (Working Draft, details "will change").

## Contested / evolving

- AI disclosure: Fedora (2025-10) recommends a trailer, the kernel (2026-10) is dropping it, Python makes PR disclosure optional, Gentoo bans AI content. No convergence. Trend: away from mandatory per-commit tool naming, toward accountability of the human submitter. As of 2026-10-17.
- Discovery of agent context files: llms.txt v2 (August), an IETF individual draft (October) and vendor `Link` headers all propose different routes, and the one measurement (single publisher) shows zero crawler retrievals. Trend: header-based discovery, unproven.
- MkDocs ecosystem: three-way split between MkDocs 1.x (closed to contributors), MkDocs 2.0 (pre-release, incompatible), Zensical (compatible, not at parity). As of 2026-10-02.

## Seen but excluded

Dated before 2026-09-05, so not ranked: Fedora AI policy (2025-10-22), kernel trailer introduction (2026-01), Mintlify `skill.md` and `/.well-known/skills/index.json` (2026-01-21 and 2026-01-28), Cloudflare Markdown for Agents (2026-02-12), MkDocs 2.0 PyPI pre-release (2026-08-30), Rust LLM policy (2026-08-05), llms.txt v2 (2026-08), Docusaurus 3.10 (2026-04 to 2026-07), Material blog 2026-02-18 post body, Epoch AI detector results (2026-07). The Mintlify well-known skills path is not named in `machine-readers.md` (which mentions only a `skill.md` file) and could deserve a Not studied line, but it predates the window, so a later pass or the baseline owner should decide.

## Sources

| URL | What it is | Date | Why worth reading |
|---|---|---|---|
| https://www.theregister.com/ai-and-ml/2026/10/14/linux-kernel-devs-drop_obligatory_confession_of_ai_tool_usage/5303140 | News report quoting the kernel mailing list | 2026-10-14 | Decision, quotes, objections |
| https://linux.slashdot.org/story/26/10/17/0723207/linux-maintainers-can-now-submit-ai-generated-code-without-declaring-it | Slashdot summary of XDA | 2026-10-17 | Summit date 2026-10-08 |
| https://lwn.net/Articles/1083275/ | LWN debate article | 2026-07-21 | Background of the tag debate |
| https://docs.kernel.org/process/coding-assistants.html | Primary: kernel doc | build 7.4.0-rc4 | Signed-off-by rule; format text not extractable by my fetcher |
| https://www.ietf.org/archive/id/draft-arsentev-llm-context-discovery-01.html | Primary: IETF individual draft | 2026-10-05 | Header and well-known discovery proposal |
| https://www.w3.org/TR/wcag-3.0/ | Primary: W3C Working Draft | 2026-09-10 | Draft status |
| https://www.w3.org/WAI/news/2026-09-10/wcag3/ | Primary: WAI news | 2026-09-10 | Review call |
| https://www.w3.org/WAI/news/ | Primary: WAI news index | read 2026-11-27 | Lists Sep 25 and Nov 10 items |
| https://squidfunk.github.io/mkdocs-material/blog/2026/02/18/mkdocs-2.0 | Primary: Material team post with dated updates | updates 2026-08-30, 09-16, 10-02 | Succession state |
| https://squidfunk.github.io/mkdocs-material/ | Primary: site banner | read 2026-11-27 | End-of-life date 2027-05-05 |
| https://github.com/vuejs/vitepress/releases | Primary: release list | alpha.21 25 Oct | Still alpha |
| https://docusaurus.io/changelog | Primary: changelog | newest 2026-07-10 | No 4.0, no native llms.txt |
| https://llmstxt.org/changes.html | Primary: spec changelog | v2 August 2026 | No post-window entry |
| https://discuss.python.org/t/updated-triage-guidelines-and-process-for-our-ai-policy/109717/1.md | Primary: CPython policy post | 2026-10-28 | Disclosure optional |
| https://devguide.python.org/getting-started/ai-tools/ | Primary: CPython devguide | live | No trailer |
| https://www.mintlify.com/blog/skill-md | Vendor blog | 2026-01-21 | Excluded context |
| https://www.mintlify.com/blog/skills-discovery-from-any-url | Vendor blog | 2026-01-28 | Excluded context |
| https://www.kernel.org/doc/Documentation/process/coding-assistants.rst | Primary: kernel doc source | live | Signed-off-by text |
| https://docs.fedoraproject.org/en-US/council/policy/ai-contribution-policy/ | Primary, blocked by Anubis | n/a | Fedora claim rests on search results only |

Failed fetches: Phoronix (403), kernel git log (403), Fedora docs and forge (Anubis block), a guessed WAI page URL (404). The kernel removal patch's merge status stays undetermined.
