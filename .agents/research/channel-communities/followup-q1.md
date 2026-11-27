---
title: "Follow-up q1: does the 2026-03-28 HN tips edit supersede the 2019 text-only penalty comment?"
program: product
topic: channel-communities
worker: followup-q1
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 16
---

# Follow-up q1: HN text-only penalty after the 2026-03-28 tips edit

Question: does the HN moderator guidance still penalize text-only posts in 2026, or did the 2026-03-28 tips edit supersede the 2019 comment cited in CH-COM-07?

## Answer

1. **No, the edit did not supersede the 2019 comment, and it does not mention the penalty.** The 2026-03-28 edit is a note prepended to the Show HN tips comment ([item 22336638](https://news.ycombinator.com/item?id=22336638), moderator dang, created 2020-02-15, edit line dated 2026-03-28, read from the HN API 2026-11-27). Its added content is about LLM-generated text, not ranking. The stem "penali" appears nowhere in the tips comment, measured below (M1).
2. **The 2019 comment is a different statement on a different case.** [Item 21874086](https://news.ycombinator.com/item?id=21874086) (dang, 2019-12-24): "Posts without URLs get penalized, so you'd be better off posting this with a link, then adding your text as a first comment in the new thread." It answers a text-only submission, not a Show HN with a URL. The same sentence appears in 17 moderator comments in 2015, 5 of them in June and July 2015 (Algolia comment search, measured below as M2), and a close variant ("Stories without URLs get penalized", [item 9980612](https://news.ycombinator.com/item?id=9980612), 2015-07-31) follows. So it is a standing moderator line, not a one-off. (An earlier draft of this file said "8 replies in June and July 2015"; the measured count is 5 for the exact sentence, 6 with the 2015-07-31 variant.)
3. **A later primary statement confirms the penalty.** [Item 35175708](https://news.ycombinator.com/item?id=35175708) (dang, 2023-03-15): "text posts are actually penalized to prevent that scenario—they're downweighted by default, and don't have live links by default." I found no moderator statement after 2023-03-15 that withdraws it. My Algolia search for moderator comments (dang, tomhow) since 2023-01-01 (M3) returned one on-topic hit, item 35175708 itself, and two unrelated penalty mentions: a domain penalty ([item 34850588](https://news.ycombinator.com/item?id=34850588), dang, 2023-02-18: "this domain is a good example of the kind that we'd penalize but not ban") and a Launch HN ranking remark ([item 46908740](https://news.ycombinator.com/item?id=46908740), tomhow, 2026-02-06: "We don't penalize people for mentioning their employer in the comments unless it's blatantly promotional"). The search keys on the words "penalized" and "downweighted" for two authors only, so it is not exhaustive; "no withdrawal found" is the strongest claim.
4. **The FAQ still routes link-plus-comment through a comment.** The FAQ (`Last-Modified: Sat, 20 Jun 2026 18:50:49 GMT`, fetched 2026-11-27, [newsfaq.html](https://news.ycombinator.com/newsfaq.html)) says: "You can't. This is to prevent people from submitting a link with their comments in a privileged position at the top of the page. If you want to submit a link with comments, just submit the link, then add a regular comment."
5. **The 2026 tips are compatible with that, and contradict nothing.** They say: "Your text should show up at the top of the Show HN submission, but if for some reason it doesn't, add it as a first comment to the thread. Either way is fine." So for a URL submission, the maker's backstory goes in the text field or the first comment, and both are accepted. The penalty claim only concerns submissions with no URL.

Net: the penalty on text-only posts is still the best-supported reading (2015, 2019, 2023 statements, none withdrawn), and CH-COM-07's advice (URL plus backstory) stands. What was wrong in CH-COM-07 is its framing: it called the 2019 comment "possibly out of date" and implied the 2026 tips replaced it. The tips neither replace nor repeat it. The conflict C1 row has the same framing issue.

## The edit's real content, which the ruleset does not yet use

The 2026-03-28 edit text, verbatim from the HN API, 2026-11-27:

> "Edit (2026-03-28): we can't respond to emails about this any more because there are far too many of them. But the tips below are still valid. I can add another important one too: Write your text by hand. Don't use an LLM to generate any of it (not even a tiny bit, including to edit or spruce it up). Reason: the community is super fussy about this right now, and LLM language leaves imprints on your text which are generating quite some backlash when it appears on HN itself. This is a big dividing line at present! (This is not, of course, to say that you shouldn't use LLMs - we use them heavily ourselves and are all in favor of doing so. Just don't use them to generate or edit text that you post to HN.)"

Three consequences for CH-COM:

- **Editing is banned too, not only generating.** The current [guidelines](https://news.ycombinator.com/newsguidelines.html) (`Last-Modified: Thu, 01 Oct 2026`, fetched 2026-11-27) say in the comments section: "Don't post generated text or AI-edited text. HN is for conversation between humans." And in the submission section: "Please don't put generated text in HN posts. Write your text yourself". CH-COM-01 bans agent-written text. It does not yet ban an agent polishing, rewording or suggesting replacement wording for the maker's own draft, which the edit names ("to edit or spruce it up").
- **The email route in CH-COM-09 is dead.** The edit says moderators "can't respond to emails about this any more because there are far too many of them." CH-COM-09 tells the maker to email hn@ycombinator.com about a missed post, and its source ([item 26998308](https://news.ycombinator.com/item?id=26998308), 2021) predates the edit. "This" refers to the tips thread topic; the edit does not say all email stopped, so the claim is narrow: do not plan on a reply. I did not test whether the address still works, and cannot without sending mail.
- **The hn@ycombinator.com username-change line is also unreliable for the same reason**, but CH-COM-03 does not depend on it.

[showhn.html](https://news.ycombinator.com/showhn.html) (`Last-Modified: Thu, 10 Sep 2026`, fetched 2026-11-27) adds: "The project should be non-trivial. Don't post quickly-generated one-offs; anybody can do that now." That is consistent with CH-COM-05 and gives it a sourced basis for an eligibility question the maker must answer; it is not a mechanically checkable gate.

## Measurement context (not re-run)

CH-COM-07 cites text-only 1.2% against URL-plus-body 2.7% reaching 100 points (com-hn-contract §7, n as stated there). Those numbers are consistent with a downweight on text-only posts, but they are correlational and I did not re-run them. The mixed buckets also include non-Show-HN projects, so they do not prove the penalty exists; the moderator statements do.

## Measurements

All run 2026-11-27 in `~/.cache/research-lang/exemplars/product/wave2/channel-communities-q1/` (read-only HTTP GETs; no account, no post).

**M1. Tips comment text and the stem "penali".**

```
curl -s https://hacker-news.firebaseio.com/v0/item/22336638.json > tips.json
python3 -I -c "import json,re;d=json.load(open('tips.json'));t=d['text'];print(d['by'],d['time'],len(t));print('penali hits:',len(re.findall('penali[sz]',t,re.I)))"
grep -ciE 'penali' tips.json; echo "grep exit: $?"
```

Output: `dang 1581788447 3757`, `penali hits: 0`, `0`, `grep exit: 1` (no match). Time 1581788447 is 2020-02-15 (creation); the 2026-03-28 edit is a line inside the text, which begins `Edit (2026-03-28): we can't respond to emails about this any more...`. The same grep over the saved HTML pages gives `newsguidelines.html` 0 and `showhn.html` 0; `newsfaq.html` has 1 line, `penalize or ban submissions, accounts, and sites that`, which is about guideline-breaking sites, not text posts.

**M2. Exact 2019 sentence in 2015 moderator comments.**

```
curl -s 'https://hn.algolia.com/api/v1/search_by_date?tags=comment,author_dang&query=%22Posts%20without%20URLs%20get%20penalized%22&hitsPerPage=100&numericFilters=created_at_i%3E1420070400,created_at_i%3C1451606400' > a1.json
```

Output: `nbHits 17`. A Python check that each `comment_text` contains the regex `without URLs get penali` returned True for all 17: 10808985 (2015-12-29), 10569052 and 10569046 (2015-11-15), 10469739 (10-29), 10388711 and 10388213 (10-14), 10348157 (10-07), 10250153 (09-21), 10177153 (09-06), 9946721, 9946716 and 9946715 (07-25), 9940564 (07-24), 9796793 (06-29), 9379511 (04-15), 9275049 (03-27), 8831648 (01-03); `exact-phrase count 17`. June and July: 9796793, 9940564, 9946715, 9946716, 9946721 = 5. Item 9980612 is not in this list because its wording differs; `curl -s https://hacker-news.firebaseio.com/v0/item/9980612.json` returned `dang 1438331981 Stories without URLs get penalized, so you'd be better off posting this as a link to your project, then adding the text as a first comment in the thread.` (1438331981 = 2015-07-31).

**M3. Moderator comments since 2023-01-01 that mention a penalty or downweight.** Query pattern, run for each author in {dang, tomhow} and word in {penalized, downweighted}; 1672531200 = 2023-01-01:

```
curl -s "https://hn.algolia.com/api/v1/search_by_date?tags=comment,author_$A&query=$W&hitsPerPage=100&numericFilters=created_at_i%3E1672531200"
```

Output `nbHits`: dang/penalized 23, dang/downweighted 161, tomhow/penalized 18, tomhow/downweighted 20. I filtered the returned hits for the pattern `text[ -](only )?post|text post|no url|without (a )?url|self.?post|Show HN` and printed the sentence around the match. Hits: 35175708 (dang, 2023-03-15, the text-post statement), 46329337 (dang, 2025-12-19, follow-up posts downweighted, off topic), 39340744 (dang, 2024-02-12, follow-up submissions, off topic), 39236061 (dang, 2024-02-02, a Show HN downweighted for a "Star repo for free trial" sales tactic, off topic), 46908740 (tomhow, 2026-02-06, off topic), plus 34850588 (2023-02-18, domain penalty, off topic; matched by date in the penalized result). No hit withdraws or restates the text-post penalty. Sample: 4 queries, up to 100 hits each, so the 161-hit set (dang/downweighted) was truncated at 100; the text-post filter could miss a statement beyond that page.

**M4. Last-Modified headers.**

```
for p in newsfaq newsguidelines showhn; do curl -s -D - -o $p.html https://news.ycombinator.com/$p.html | grep -iE '^(HTTP|last-modified|date)'; done
```

Output (HEAD requests return `405 Not Allowed`, so GET was used):

```
newsfaq:        HTTP/1.1 200 OK  Date: Fri, 27 Nov 2026 13:10:12 GMT  Last-Modified: Sat, 20 Jun 2026 18:50:49 GMT
newsguidelines: HTTP/1.1 200 OK  Date: Fri, 27 Nov 2026 13:10:12 GMT  Last-Modified: Thu, 01 Oct 2026 01:33:57 GMT
showhn:         HTTP/1.1 200 OK  Date: Fri, 27 Nov 2026 13:10:13 GMT  Last-Modified: Thu, 10 Sep 2026 18:09:09 GMT
```

## Effect on the ruleset

| Rule | Effect | Exact new text or change |
|---|---|---|
| CH-COM-07 | change (text and rationale only; severity stays SHOULD) | Rule: "Prefer a Show HN as a URL submission with the maker's backstory in the text field or, if the text does not appear, as the maker's first comment: what it is, why it was built, what differs, known gaps. Do not plan a text-only Show HN. Do not write that a first comment or a timed reply raises rank." Rationale: replace the "may be out of date" clause with: "Moderators have said text-only posts are penalized: [item 21874086](https://news.ycombinator.com/item?id=21874086), 2019-12-24, and [item 35175708](https://news.ycombinator.com/item?id=35175708), 2023-03-15 ('downweighted by default'). No later statement withdraws it. The 2026-03-28 tips edit does not address ranking; the tips say text should 'show up at the top ... Either way is fine' (text field or first comment)." Verification: add `url:` non-empty, plus `grep -iE 'text.only'` over the plan finds no row that selects a text-only Show HN. |
| C1 (conflict row) | change | In the Resolution rationale, replace "The text field is the current moderator instruction." with "The text field is a moderator-sanctioned placement (tips: 'Either way is fine' between text field and first comment); the separate text-only penalty ([item 21874086](https://news.ycombinator.com/item?id=21874086) 2019-12-24; [item 35175708](https://news.ycombinator.com/item?id=35175708) 2023-03-15) still applies." Verification: `grep '^| C1' channel-communities.md \| grep -c 'current moderator instruction'` prints 0, and `grep '^| C1' channel-communities.md \| grep -oE 'item\?id=(21874086\|35175708)' \| sort -u \| wc -l` prints 2. |
| CH-COM-01 | change | Append: "This includes editing: the agent never rewrites, polishes, shortens or proposes replacement wording for a maker's HN title, text or reply, and reports checks only as pass or fail." Add to rationale: the 2026-03-28 edit quoted above and the guideline "Don't post generated text or AI-edited text." Verification: add (d) `git diff --stat` (or file hash) on the maker's draft file is unchanged across the agent's session, and (e) a failing CH-COM-06 report contains no string beginning `Show HN:` other than the maker's own submitted title. |
| NEW CH-COM-25 | new (SHOULD) | Rule: "When a title or text check fails, report the failing clause and the line that failed. Do not offer a corrected title or sentence." Rationale: HN's 2026-03-28 tips edit bans LLM use "to edit or spruce it up"; a suggested fix pasted by the maker is AI-edited text. Verification: in the agent's output for a failed CH-COM-06 check, `grep -cE '^Show HN: '` counts only the maker-submitted title (count equals 1 when the title was submitted, 0 otherwise). Severity: SHOULD, because the "pass" example in CH-COM-06 is test data in the rule, not output to the maker. |
| CH-COM-09 | change | Replace "a human email to hn@ycombinator.com with the item URL" with "a moderator repost invite, or a human email to hn@ycombinator.com that the plan treats as possibly unanswered (the 2026-03-28 edit says email about Show HN tips can no longer be answered)." Verification unchanged, plus the plan must not depend on a reply: `grep -iE 'wait for (a )?(reply|response)'` over the plan is empty. |
| CH-COM-05 | confirm (rule, rationale and verification unchanged) | The `showhn.html` clause is recorded here as context only and is not added to the rule. The rule's existing clause "non-trivial" is a maker judgment (see the Applied section), and this follow-up adds no checkable test for it. |
| CH-CORE (cross-territory) | flag | The 2026-03-28 edit ("not even a tiny bit") is stronger than "do not paste generated text" and belongs in the CH-CORE ban clause; hand it to that topic. |

## Dated facts

| Fact | Source | Date |
|---|---|---|
| Tips comment created, with edit line "Edit (2026-03-28)" | [item 22336638](https://news.ycombinator.com/item?id=22336638) via HN API | created 2020-02-15, edit 2026-03-28, read 2026-11-27 |
| "Posts without URLs get penalized" | [item 21874086](https://news.ycombinator.com/item?id=21874086) | 2019-12-24 |
| Same sentence in moderator comments: 17 hits in 2015, 5 in Jun-Jul (M2); variant in [item 9980612](https://news.ycombinator.com/item?id=9980612) | Algolia comment search | 2015-01-03 to 2015-12-29; variant 2015-07-31 |
| Domain-penalty remark, unrelated | [item 34850588](https://news.ycombinator.com/item?id=34850588) | 2023-02-18 |
| Launch HN ranking remark, unrelated | [item 46908740](https://news.ycombinator.com/item?id=46908740) | 2026-02-06 |
| "text posts are actually penalized ... downweighted by default" | [item 35175708](https://news.ycombinator.com/item?id=35175708) | 2023-03-15 |
| FAQ: link plus comments goes through a regular comment | [newsfaq.html](https://news.ycombinator.com/newsfaq.html), Last-Modified header | 2026-06-20, fetched 2026-11-27 |
| "Don't post generated text or AI-edited text"; "Please don't put generated text in HN posts" | [newsguidelines.html](https://news.ycombinator.com/newsguidelines.html), Last-Modified header | 2026-10-01, fetched 2026-11-27 |
| "non-trivial ... quickly-generated one-offs" | [showhn.html](https://news.ycombinator.com/showhn.html), Last-Modified header | 2026-09-10, fetched 2026-11-27 |

The Last-Modified headers (M4) are server metadata; the pages carry no printed date. They show the page changed on or after that date, not what changed.

## What could not be determined

- **Whether the penalty is still applied in the ranking code in 2026.** HN publishes no ranking source. The latest primary statement is 2023-03-15. Missing: a moderator statement dated after 2023 on text-only ranking, or access to HN's ranking code.
- **Whether the submit form with both URL and text places the text at the top of the thread or as an ordinary first comment.** The tips say "should show up at the top"; the FAQ says link plus text is not allowed as a privileged top position. Settling this needs a logged-in submit page or a live submission, neither of which this research may do.
- **Whether hn@ycombinator.com still replies at all.** The edit states a limit for "this" topic only. Testing needs sending mail, which is out of bounds.
- **A re-run of the §7 base rates.** Not part of this question, and the numbers were not re-derived.
