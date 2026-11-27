---
title: Does a typed URL cost about 21% of LinkedIn impressions since mid-May 2026? Tracing the MagicPost primary
program: product
topic: channel-linkedin
worker: followup-q0
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 8
---

# Does a typed URL cost about 21% since mid-May 2026?

## Answer

Partly. The -21% figure is real and MagicPost's own, but it is not in the "1.2M-post" article that Composeur cites. It is in a different MagicPost study of 687,000 posts, published 6 Oct 2026, as one FAQ sentence with no link-post count, no interval and no pitch control. The 1.2M article itself, in the live version (dated 5 Jun 2026) and in the Wayback snapshot of 15 Jul 2026, contains neither "-21" nor any mid-May link figure, and says a link written into the post body "carries no penalty" (858 median impressions against 795 without a link; 566,957 posts). The pitch-controlled study of 865,980 posts (29 Oct 2026) measures a typed URL in a text post at -2% with no mid-May split. So MagicPost publishes three different pictures of a typed URL (about 0%, -2%, -21%) on three baselines, and does not reconcile them. The reach basis of CH-LI-09 stays unsettled; the rule keeps its measurability basis. All figures are vendor data (3P), described by MagicPost as correlations, not controlled experiments.

## What each source says

All fetches on 2026-11-27, read-only, no account, no login. Raw HTML and tag-stripped text saved in `~/.cache/research-lang/exemplars/product/wave2/li-q0/`.

| Source | Date | What it says on a typed URL |
|---|---|---|
| [Composeur, "Link in comments on LinkedIn: what the data really says"](https://composeur.fr/en/blog/link-in-comments-linkedin) (secondary) | 16 Oct 2026 (as recorded in the first pass) | Lists "MagicPost, 'How the LinkedIn Algorithm Works in 2026 (1.2M Posts)', updated June 5, 2026". Quote: "Since mid-May 2026, every placement does worse: -19% for a card, -21% for a URL in the text, -16% for a "link in the comments" mention. Before mid-May, the gaps were -39%, -12% and -8%." It does not name which of the three pieces holds that sentence. It says the three "are not independent studies" and that "the first two rely on the same set of 566,957 posts". |
| [MagicPost, "How the LinkedIn Algorithm Works in 2026 (1.2M Posts)"](https://magicpost.in/blog/linkedin-algorithm-2026) (the page the question named) | `datePublished` and `dateModified` both 2026-06-05; body mentions data to July 2026 | No "-21", no "every placement". Mid-May appears only for polls ("polls went from 9% more impressions earlier in 2026 to 22% fewer since mid-May 2026"). Its link section says the figures come from "a separate study: 865,980 LinkedIn posts from 15,719 creators, July 2024 to July 2026, each post compared with the same person's posts without a link, at equal pitch", and that mid-May and later dated figures "come from our separate same-creator study of 687,000 posts". |
| Same article, [Wayback snapshot of 2026-07-15](https://web.archive.org/web/20260715155314id_/https://magicpost.in/blog/linkedin-algorithm-2026) | 15 Jul 2026 | "a link written into the post body carries no penalty (858 median impressions). The cost is the preview card, not the URL itself." Card: "414 median impressions versus 795 without". Basis: 566,957 posts with synced analytics. No "-21", no mid-May link figure. |
| [MagicPost, "LinkedIn Algorithm Changes in 2026: What the Data Shows"](https://magicpost.in/studies/linkedin-algorithm-changes) (primary of the -21%) | `datePublished` and `dateModified` both 2026-10-06 | FAQ, verbatim: "Yes, though link cards to outside sites cost less reach than before. Since mid-May 2026, a link card sits 19% below the author's average post without links, against 39% below before. A URL typed in the text went from 12% to 21% below, and a "link in the comments" line from 8% to 16% below." Data: 687,000 posts from 16,000 creators, June 2025 to September 2026. Baseline: "the same creator's average post: the mean, on a log scale, of their ordinary posts within 30 days before or after it". Limits: "We measure impressions, not saves or reading time. The spring dip has no seasonal check: our data starts in June 2025." |
| [MagicPost, "Do Links Really Hurt LinkedIn Reach? What 865,980 Posts Say"](https://magicpost.in/blog/linkedin-external-links-reach) | 29 Oct 2026 (date from Composeur's list; page date fields not re-extracted) | "A URL in a text, image, carousel or video post costs about 3%: 1,000 impressions become 970. That's next to nothing." Compared "at equal pitch (equally salesy posts)", same person, July 2024 to July 2026. No mid-May split. |
| [LinkedIn Help, "Share photos on LinkedIn"](https://www.linkedin.com/help/linkedin/answer/a527229) (first party) | page shows "Last updated: 1 day ago", no absolute date | "You can share either a URL link or an image in a post, but not both at the same time." |

Commands run in this pass, with output. Fetch:

```
curl -sL -A "Mozilla/5.0" -o .../link-in-comments-linkedin.html -w "%{http_code} %{size_download}" https://composeur.fr/en/blog/link-in-comments-linkedin
200 91025
curl -sL -A "Mozilla/5.0" -o .../linkedin-algorithm-changes.html -w "%{http_code} %{size_download}" https://magicpost.in/studies/linkedin-algorithm-changes
200 268185
curl -sL -A "Mozilla/5.0" -o .../linkedin-algorithm-2026.html -w "%{http_code} %{size_download}" https://magicpost.in/blog/linkedin-algorithm-2026
200 235404
curl -sL -A "Mozilla/5.0" -o .../linkedin-external-links-reach.html -w "%{http_code} %{size_download}" https://magicpost.in/blog/linkedin-external-links-reach
200 284887
```

Strip and search (each file first run through `sed -e 's/<[^>]*>/\n/g' F.html | grep -v '^\s*$' > F.txt`), then `grep -n -i -E "mid-may|21 ?%|-21|every placement" F.txt | cut -c1-400`. Output, trimmed to the relevant lines:

```
=== link-in-comments-linkedin
171:MagicPost adds a view over time, comparing each creator with their own posts without links. Since mid-May 2026, every placement does worse: -19% for a card, -21% for a URL in the text, -16% for a "link in the comments" mention. Before mid-May, the gaps were -39%, -12% and -8%. ...
=== linkedin-algorithm-changes
2300:Yes, though link cards to outside sites cost less reach than before. Since mid-May 2026, a link card sits 19% below the author's average post without links, against 39% below before. A URL typed in the text went from 12% to 21% below, and a "link in the comments" line from 8% to 16% below.
2302:Less than before. Since mid-May 2026, a poll gets 22% fewer impressions than the same creator's average photo post, ...
=== linkedin-algorithm-2026
2229:That reach did not hold. ... polls went from 9% more impressions earlier in 2026 to 22% fewer since mid-May 2026.
2340:Figures dated after a 2026 shift (mid-March, mid-May, July 27) ... come from our separate same-creator study of 687,000 posts ...
=== linkedin-external-links-reach
(no output)
```

(Other matched lines were polls, carousels and the posting hour, 21% in a different sense.) Line numbers are those of the stripped `.txt` files. The first pass named Composeur "line 479"; in the stripped file the sentence is line 171. `grep -c -F "every placement" linkedin-algorithm-2026.txt` prints `0`. The live 1.2M page's JSON-LD: `grep -o -E '"datePublished":"[^"]*","dateModified":"[^"]*"'` prints `"datePublished":"2026-06-05T00:00:00.000Z","dateModified":"2026-06-05T00:00:00.000Z"`.

Wayback Machine. The first pass wrongly reported it as blocked. It is reachable:

```
curl -sL -m 30 -A "Mozilla/5.0" "https://archive.org/wayback/available?url=magicpost.in/blog/linkedin-algorithm-2026&timestamp=20260605"
200 283  {"url": "magicpost.in/blog/linkedin-algorithm-2026", "archived_snapshots": {"closest": {"status": "200", "available": true, "url": "http://web.archive.org/web/20260715155314/https://magicpost.in/blog/linkedin-algorithm-2026", "timestamp": "20260715155314"}}, "timestamp": "20260605"}
curl -sL -m 60 -A Mozilla/5.0 -o wb-0715.html -w '%{http_code} %{size_download}' https://web.archive.org/web/20260715155314id_/https://magicpost.in/blog/linkedin-algorithm-2026
200 768027
grep -n -i -E "mid-may|21 ?%|every placement|566,957|link card|typed" wb-0715.txt   # lines that matter:
1615:An attached link preview card does: those posts earn 414 median impressions versus 795 without, about half the reach, on 566,957 posts with synced analytics. But a link written into the post body carries no penalty (858 median impressions). The cost is the preview card, not the URL itself.
```

The nearest snapshot to 5 Jun is 15 Jul, so the 5 Jun text itself is not retrieved. The 15 Jul text contains no "mid-May" and no "-21".

## Reading

1. The -21% is a vendor figure whose primary is the 687,000-post study (6 Oct 2026, FAQ line 2300). Composeur's citation list points at the 1.2M article, "updated June 5, 2026". A text dated 5 Jun cannot hold a "since mid-May" link comparison with a before/after split on data to September; the 15 Jul snapshot and the live page both lack it. Composeur's attribution is therefore most likely a mix-up of the MagicPost pieces. "Most likely" because the 5 Jun text itself was not retrieved.
2. The 1.2M article's own typed-URL figure is about zero (858 against 786 to 795 median impressions, pooled, not same-creator). The three MagicPost typed-URL readings are: pooled medians about 0%, same-creator at equal pitch -2%, same-creator against average post -12% then -21%.
3. The -21% is probably not pitch-adjusted: its baseline is "the creator's average post" and no equal-pitch control is stated for links. The 865,980-post article states that pitch is the main confound (18% less in total, 10% at equal pitch for January to July 2026, from the first pass reading of the 1.2M page link section). That the 687,000 link rows are unadjusted is an inference from the missing control, not a MagicPost statement.
4. The 687,000 study gives no link-post count, interval or period length for the link rows. "Ranges come from resampling creators" is general. An agent cannot judge whether 12% to 21% is a real change.
5. No placement escapes in the 687,000 data: URL in text -21%, link in comments -16%, card -19%. The comparison CH-LI-09 depends on (body against comment) still favours the body or is neutral. The 865,980 study measures the first comment against the post URL at -2% (first-pass reading).
6. MagicPost states a re-check: "We will check the July 27 changes again in December 2026" (687,000 study, line 2284, page dated 2026-10-06). That is a July 27 re-check, and it is not stated to cover the link rows.
7. LinkedIn has published no link-reach figure. Composeur reports a late-October 2026 summary by a LinkedIn community lead of a Q&A with Sam Corrao Clanon, who leads Creator Product (Q&A dated 27 Oct 2026 per Composeur): neither links nor the scheduler will "kill" reach. Composeur itself calls these "reported remarks from a closed session, not a written rule". Secondary, no number, primary not located.

## Effect on the ruleset

**CH-LI-09: change (text of the rule unchanged; the rationale conflict sentence changes).** Replace the conflict sentence in the rationale with:

"Conflict, same vendor, three baselines: MagicPost's 1.2M-post article (5 Jun 2026, 3P, pooled medians) finds an in-body URL has no penalty (858 against 795 median impressions); its pitch-controlled 865,980-post study ([29 Oct 2026](https://magicpost.in/blog/linkedin-external-links-reach), 3P) puts a typed URL in a text post at -2%; its 687,000-post same-creator study ([6 Oct 2026](https://magicpost.in/studies/linkedin-algorithm-changes), 3P, no pitch control stated, no link-post count) puts it at -12% before and -21% since mid-May 2026, a card at -39% then -19%, a 'link in the comments' line at -8% then -16%. No placement avoids a cost in the 687,000 data and no study counts clicks. The rule rests on measurability, not on reach."

Verification, runnable by an agent in the research directory: `grep -c "magicpost.in/studies/linkedin-algorithm-changes" channel-linkedin.md` prints at least 1; `grep -n "687,000" channel-linkedin.md | grep -c "3P"` prints at least 1; and `grep -n -i "composeur" channel-linkedin.md | grep -c -E '(-|−)21'` prints 0 (Composeur is no longer the cited primary of the -21%). Keep severity SHOULD. Do not promote.

**Conflict-table row "Typed-URL reach since mid-May 2026": change.** New text: "Resolved as to source, unresolved as to size. The -21% is from MagicPost's 687,000-post study (6 Oct 2026), not the 1.2M-post article; the live 1.2M article and its 15 Jul 2026 archive snapshot do not contain it and report an in-body URL as no penalty. The figure has no pitch control, link-post count or interval. The pitch-controlled 865,980-post study shows -2% with no mid-May split. The rule rests on measurability. Re-check at the 90-day refresh and after MagicPost's stated December 2026 re-check of its July 27 changes."

Verification for the row, runnable: `awk '/Typed-URL reach/' channel-linkedin.md | grep -c -E "687,000.*6 Oct 2026|6 Oct 2026.*687,000"` prints at least 1; `awk '/Typed-URL reach/' channel-linkedin.md | grep -c -i "composeur"` prints 0 as the stated source of the figure (a mention of Composeur as the secondary that misattributed it is allowed only with the word "misattribut" on the same line: `awk '/Typed-URL reach/' channel-linkedin.md | grep -i composeur | grep -vc -i "misattribut"` prints 0).

**Open question 5: retire.** Replace it with: "Does a post-July 2026 split of MagicPost's link data, or its December 2026 re-check of the July 27 changes, show the typed-URL placement moving, and are the 687,000-post link rows pitch-adjusted?" Verification, runnable: `awk '/^## Open questions/{f=1;next} /^## /{f=0} f' channel-linkedin.md | grep -c -i "composeur"` prints 0 (no open question still asks to trace the Composeur quote), and `awk '/^## Open questions/{f=1;next} /^## /{f=0} f' channel-linkedin.md | grep -c -E "687,000|pitch-adjusted"` prints at least 1.

**CH-LI-18: confirm.** It already requires every reach effect in skill text to carry its tag, date and sample. The facts row for this effect must read "3P, 687,000 posts, 2026-10-06, same-creator average baseline, pitch control not stated". Runnable check on a skill or rule file F that quotes a reach percentage: `grep -nE '(-|−)[0-9]+ ?%' F | grep -vE '3P' ` prints nothing, and `grep -nE '(-|−)[0-9]+ ?%' F | grep -vE '20[0-9]{2}-[0-9]{2}|[0-9]{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) 20[0-9]{2}'` prints nothing. A percentage line without the 3P tag or a date fails. This stops an agent from quoting "-21%" as LinkedIn policy.

**NEW rule CH-LI-23 (SHOULD).** Never state a link-reach penalty to the author as a single number. When a draft or hand-off note mentions link reach, give the range and its baselines: "about 0% to -2% (pooled and pitch-controlled, 3P) up to -21% (unadjusted same-creator, 687,000 posts, 3P); vendor data, not confirmed by LinkedIn". Rationale: the same vendor reports three values for one placement, and the likeliest cause is an uncontrolled sales-pitch baseline. An agent that picks one figure invents certainty or drops the link. Verification: `grep -nE '(-|−)21 ?%' draft-notes.md | grep -vE '(-|−)2 ?%'` prints nothing, and `grep -nE '(-|−)21 ?%' draft-notes.md | grep -vE '3P|vendor'` prints nothing. A -21% line that lacks the -2% figure, or lacks the 3P or vendor label, fails. Sources: the three MagicPost pages above.

No change to CH-LI-02, -04 or -22.

## Dated facts

- Composeur summary: dated 16 Oct 2026 in the first pass (the date was not re-extracted in this pass); its list cites the MagicPost 1.2M article as "updated June 5, 2026" (fetched 2026-11-27).
- MagicPost 1.2M article: `datePublished` and `dateModified` 2026-06-05; Wayback snapshot 2026-07-15 (https://web.archive.org/web/20260715155314id_/https://magicpost.in/blog/linkedin-algorithm-2026).
- MagicPost 687,000-post study: published and modified 2026-10-06; data June 2025 to September 2026; re-check announced for December 2026 in the same page (line 2284).
- MagicPost 865,980-post study: 2026-10-29 per Composeur's list; data July 2024 to July 2026; 124,893 link posts from 9,931 creators (first-pass reading, not re-confirmed in this pass).
- LinkedIn Help [a527229](https://www.linkedin.com/help/linkedin/answer/a527229): re-fetched 2026-11-27; passage "You can share either a URL link or an image in a post, but not both at the same time."; the page gives only "Last updated: 1 day ago".
- LinkedIn Creator Product Q&A (27 Oct 2026 per [Composeur](https://composeur.fr/en/blog/link-in-comments-linkedin)): secondary summary through a community lead, no number, primary not located.

## What could not be determined

- Whether the 687,000-post link rows are pitch-adjusted. Missing: the study's full method for link rows or an answer from MagicPost. The page states only the creator-average baseline.
- Link-post counts and intervals behind -12% to -21%. Missing: the data, not published on the page.
- The 1.2M article text exactly as of 5 Jun 2026. The Wayback nearest snapshot is 15 Jul 2026 and the live page is dated 5 Jun, so only a later or identical text was seen. Missing: a snapshot at or before 5 Jun.
- The LinkedIn community lead's summary of the 27 Oct 2026 Q&A. Missing: its URL and a LinkedIn first-party record; the quote rests on Composeur.
- Whether the effect is real for LinkedIn rather than a vendor artefact. No independent dataset or LinkedIn statement found. Needs a controlled experiment on posts the fleet owns: a human, a logged-in account and posting, all outside this task.
