---
title: Console.dev submission rules and the pre-1.0 claim
program: product
topic: channel-launch
worker: followup-q0
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 5
---

# Console.dev submission rules and the pre-1.0 claim

## Answer

The fleet's claim is half right. Console.dev's own page, https://console.dev/selection-criteria (the page https://console.dev/submit/ redirects to it; fetched 2026-11-27; the page prints no publication date, only "Copyright Console 2026"), splits into two lanes:

1. **"Interesting tools"** (the weekly review lane): no version gate is stated. The page says "Each week we feature and review 2-3 interesting developer tools in the Console newsletter and on our website." and gives twelve questions (12 `<li>` items under the "Interesting tools" `<h2>`, counted in `sc.html`), with "The more of these questions we can answer positively, the more likely a tool is to be featured."
2. **"Betas"**: "We only list early access, alpha, or beta releases of tools where developers are the primary user." Operative definition: "the release must be pre 1.0 and/or have an appropriate label in the version number e.g. 1.0.0-beta. Alternatively, the word "beta", "preview" or similar should appear somewhere easily discoverable on the website, release notes, and/or documentation. Any GA or stable releases are not eligible."

So "pre-1.0 only" is true for the Betas lane only. It is not a rule for the whole venue. The grim 1.0 plan row says "selection criteria admit pre-1.0 tools only. Ineligible forever after the tag" (`/home/mherwig/dev/grimoire-rs/grimoire/.agents/research/research_promotion_positioning.md:366`, no URL). That overstates it: after the tag, the Betas lane closes but the Tools lane stays open. Two further points:

- The Betas rule has an alternative: a word such as "beta" or "preview" on the website, release notes or docs also qualifies. A tag does not by itself end eligibility if the product is honestly labelled that way. A project that labels GA while using the word "beta" for show would be a different question; this page does not address it.
- Evidence that the Tools lane takes GA tools, labelled as such: the Tools feed dated Thu, 26 Nov 2026 features "npkill" (https://console.dev/tools/rss.xml, fetched 2026-11-27). The npm registry shows npkill `1.0.0` as `latest`, published 2026-11-12T12:25:19Z, 14 days before the review item (Measurement 2). So a tool whose current release was 1.0.0 was reviewed in the Tools lane. The page text, which states no version gate for the Tools lane, is the other half of the evidence.

Other rules, all from the same page unless noted:

| Item | Text | Date |
|---|---|---|
| How to submit | "Email hello@console.dev with the details and we'll happily take a look." | page undated, fetched 2026-11-27 |
| Fee | None stated. Advertising is separate: "These are run as a sponsored text ad clearly marked in the newsletter. We do not do sponsored reviews." | same |
| Guarantee or deadline | None stated. Selection is stated to be partly subjective: "there is always a subjective element". | same |
| Fit signals for a CLI | "Is the primary user a developer?", "Is there a self-service signup?" (read as "an individual developer should be able to try it themselves without speaking to anyone"), "Would this be used by advanced power-users? ... is there an API and/or CLI", "Is it easy to install/deploy?", "Does it have good documentation?", "Is it being actively maintained with regular bug fixes and updates?" | same |
| Cadence | 2-3 tools per week, reviews and newsletter on Thursdays (feed `pubDate` Thu, 26 Nov 2026 08:00:00 GMT) | feed fetched 2026-11-27 |

Other facts: the About page lists the same address (https://console.dev/about, fetched 2026-11-27: "To suggest a tool or flag an error, email hello@console.dev"). A WebSearch result summarising a Product Hunt thread said the site's "Submit tool" button is an email link and once did not work for a user. No URL for that thread was retained, I did not open it, and I do not rely on it.

## Measurements

All run 2026-11-27 in `~/.cache/research-lang/exemplars/product/wave2/`. Nothing was sent to any platform.

**1. Redirect and selection-criteria text**

```
$ curl -sL -o /dev/null -w '%{http_code} %{url_effective}\n' -A 'Mozilla/5.0' https://console.dev/submit/
200 https://console.dev/selection-criteria

$ curl -sL -D hdr.txt -A 'Mozilla/5.0' https://console.dev/selection-criteria -o sc.html; grep -i '^date:' hdr.txt; wc -c sc.html
date: Fri, 27 Nov 2026 13:10:47 GMT
23954 sc.html

$ sed 's/<[^>]*>/ /g' sc.html | tr -s ' \n' ' ' > sc.txt
$ for p in '<sentence>' ...; do printf '%s => ' "$p"; grep -oF "$p" sc.txt | head -1 | wc -l; done
Any GA or stable releases are not eligible => 1
We only list early access, alpha, or beta releases => 1
the release must be pre 1.0 => 1
Each week we feature and review 2-3 => 1
Email hello@console.dev => 1
We do not do sponsored reviews => 1
The more of these questions => 1
Copyright Console 2026 => 1

$ grep -oE '.{0,10}(Betas|Interesting tools).{0,60}' sc.txt | head
e choose. Interesting tools Each week we feature and review 2-3 interesting developer t
nk to it? Betas We only list early access, alpha, or beta releases of tools
```

The output shows "Interesting tools" and "Betas" as separate headings, and each quoted sentence found verbatim in the extracted text. The "Any GA or stable releases are not eligible." sentence follows the Betas heading in the page.

**2. npkill version and publish date (the Tools-lane evidence)**

```
$ curl -s https://registry.npmjs.org/npkill/latest | python3 -I -c 'import json,sys;d=json.load(sys.stdin);print(d["name"],d["version"])'
npkill 1.0.0

$ curl -s https://registry.npmjs.org/npkill | python3 -I -c 'import json,sys;d=json.load(sys.stdin);print("1.0.0 published",d["time"]["1.0.0"]); print(d["dist-tags"])'
1.0.0 published 2026-11-12T12:25:19.051Z
{'latest': '1.0.0', 'next': '1.0.0-rc.3'}
```

npkill 1.0.0 was published 14 days before the Tools feed item of 26 Nov 2026. So a GA 1.0.0 tool was in the registry as `latest` when Console.dev reviewed it. This replaces the earlier caveat about "today's latest". Remaining caveat: it does not show which version the reviewer saw, and the npkill site may carry a "beta" word; the 1.0 tag alone is the fact shown.

**3. Feed dates and HTTP date header**

```
$ for f in tools betas; do curl -sL -D h_$f.txt -A 'Mozilla/5.0' https://console.dev/$f/rss.xml -o $f.xml; grep -i '^date:' h_$f.txt; grep -oE '<(title|pubDate)>[^<]*' $f.xml | head -8; done
== tools
date: Fri, 27 Nov 2026 13:10:53 GMT
<title>Console.dev Devtools Newsletter - Tools Feed
<pubDate>Thu, 26 Nov 2026 08:00:00 GMT
<title>Sponsor: AnyPost
<pubDate>Thu, 26 Nov 2026 08:00:00 GMT
<title>npkill
<pubDate>Thu, 26 Nov 2026 08:00:00 GMT
<title>Voiden
<pubDate>Thu, 26 Nov 2026 08:00:00 GMT
== betas
date: Fri, 27 Nov 2026 13:11:04 GMT
<title>Console.dev Devtools Newsletter - Betas Feed
<pubDate>Thu, 26 Nov 2026 08:00:00 GMT
<title>Sponsor: AnyPost
<pubDate>Thu, 26 Nov 2026 08:00:00 GMT
<title>Exact
<pubDate>Thu, 26 Nov 2026 08:00:00 GMT
<title>Ladybird
<pubDate>Thu, 26 Nov 2026 08:00:00 GMT
```

Both feeds carry items on Thu 26 Nov 2026, 08:00 GMT: Tools has npkill and Voiden, Betas has Exact and Ladybird. This supports the Thursday cadence and the two-lane structure.

**4. CH-LAUNCH-16 verification run (the command the rule prescribes)**

```
$ Q='Any GA or stable releases are not eligible.'
$ curl -sL -A 'Mozilla/5.0' https://console.dev/selection-criteria | sed 's/<[^>]*>/ /g' | grep -cF "$Q"
1
$ curl -sL -A 'Mozilla/5.0' https://console.dev/selection-criteria | sed 's/<[^>]*>/ /g' | tr -s ' \n' ' ' | grep -cF 'Email hello@console.dev'
1
$ curl -sL -A 'Mozilla/5.0' https://console.dev/selection-criteria | sed 's/<[^>]*>/ /g' | tr -s ' \n' ' ' | grep -cF 'pre-1.0 tools only'
0
```

The first two prints are 1 (check passes; the first works even without whitespace normalisation, the second needs `tr` because the sentence spans a line break). The third is 0: the page does not contain the grim plan's paraphrase "pre-1.0 tools only", which confirms the plan's wording is the fleet's, not the venue's.

## Effect on the ruleset

Plan file below means the venue plan the agent writes under CH-LAUNCH-04 (one row per venue). `RES` is `.agents/research/channel-launch.md`.

- **CH-LAUNCH-04, change (Rationale scope list).** Append to the Rationale list: "Console.dev has two lanes: Tools (no version gate stated) and Betas (pre-1.0, a pre-release label, or a visible 'beta' or 'preview' word; GA excluded), https://console.dev/selection-criteria, fetched 2026-11-27. Submission is an email to hello@console.dev; no fee is stated." The default-exclusion list is unchanged (Console.dev is not on it). Plan verdict for a free OSS CLI: `fit`, with the lane recorded in the row.
  - Verification: in the plan file, the Console.dev row names a lane and quotes that lane's sentence. Both must print at least 1: `grep -E 'Console\.dev' <plan> | grep -cE 'lane: *(Tools|Betas)'` and `grep -E 'Console\.dev' <plan> | grep -cF 'Any GA or stable releases are not eligible.'` (Betas row) or `grep -E 'Console\.dev' <plan> | grep -cF 'Each week we feature and review 2-3'` (Tools row). The quote must also exist on the live page: `curl -sL https://console.dev/selection-criteria | sed 's/<[^>]*>/ /g' | grep -cF '<quoted sentence>'` prints at least 1 (run for the Betas sentence above: prints 1, Measurement 4).
- **Applied row of CH-LAUNCH-04 in `RES` (line 104), change.** Replace "names Console.dev, whose rules this dive could not read, as 'pre-1.0 tools only'" with "names Console.dev as 'pre-1.0 tools only'; the venue's own page limits that to its Betas lane, so the 1.0 tag is not a hard deadline for the Tools lane (followup-q0)". The "before tagging 1.0" deadline in the grim plan is a preference for the Betas lane, not a venue rule.
  - Verification: `grep -c 'whose rules this dive could not read' RES` prints 0, and `grep -c 'limits that to its Betas lane' RES` prints 1. Before the edit the first prints 1 (checked: `grep -n` shows the phrase at line 104 of RES). The claim itself is checked by `curl -sL https://console.dev/selection-criteria | sed 's/<[^>]*>/ /g' | tr -s ' \n' ' ' | grep -cF 'pre-1.0 tools only'`, which prints 0 (the paraphrase is not the venue's text; Measurement 4).
- **CH-LAUNCH-12, confirm (no wording change).** Console.dev's channel is a human email to hello@console.dev. The agent may draft the email, a human sends it. Under CH-LAUNCH-12's existing check 3 the Console.dev row is marked `human submits`.
  - Verification: `grep -E 'Console\.dev' <plan> | grep -cE 'human submits'` prints at least 1. The rule's check 1 (`gh pr create` grep) does not apply to an email venue, so check 3 is the one that binds. Source of the email-only channel: Measurement 1, `grep -cF 'Email hello@console.dev'` prints 1.
- **NEW rule, CH-LAUNCH-16.** Imperative: "For a venue that has separate lanes, record the lane and quote its eligibility sentence in the plan row, never the venue's headline gist." Rationale: the fleet's own plan misread a two-lane venue as one gate, and a plan built on that would set a false deadline or a false exclusion. Severity: SHOULD. Verification: for each plan venue row, the quoted sentence appears verbatim on the page fetched on plan day: `curl -sL <url> | sed 's/<[^>]*>/ /g' | tr -s ' \n' ' ' | grep -cF '<quoted sentence>'` prints at least 1. Run on 2026-11-27 for the Betas sentence it printed `1`; for 'Email hello@console.dev' it printed `1`; for a paraphrase not on the page ('pre-1.0 tools only') it printed `0`, so the check fails as intended on a paraphrase (Measurement 4). The `tr` step is needed when the sentence spans a line break. This overlaps CH-LAUNCH-04's quote requirement; to keep fewer rules, fold it into CH-LAUNCH-04 as "quote the sentence of the lane you intend to use".
- **Open question, close.** Remove Console.dev's rules from the Open questions list of `RES` (Terminal Trove remains open). Verification: `grep -n 'Console.dev' RES` in the Open questions section returns no row asking for Console.dev's rules.

## Dated facts

- https://console.dev/selection-criteria: the Betas definition and the Tools criteria quoted above; page carries "Copyright Console 2026"; HTTP response `date: Fri, 27 Nov 2026 13:10:47 GMT` (Measurement 1); no page edit date.
- https://console.dev/tools/rss.xml and https://console.dev/betas/rss.xml: items dated Thu, 26 Nov 2026 08:00:00 GMT (vendor's own feed; HTTP dates 13:10:53 and 13:11:04 GMT, Measurement 3).
- https://registry.npmjs.org/npkill: `latest` is `1.0.0`, published 2026-11-12T12:25:19Z; `next` is `1.0.0-rc.3` (read 2026-11-27, Measurement 2).
- Founder statement in the page's structured data: "David Mytton co-founded Console in 2021" (undated page, 2026-11-27).

## What could not be determined

- Whether Console.dev reviews a tool that is already 1.0 on first submission: the page states no gate for the Tools lane, but I found no statement saying GA tools are accepted either. A direct check needs an email to hello@console.dev, which only a human may send. Without that, the npkill review is the only supporting data point. npkill 1.0.0 was published 14 days before its review, but I did not read the review text or the npkill site, so I cannot say whether it carries a "beta" label.
- Response rate, time to reply, and whether a submission guarantees a review: not stated anywhere I could read.
- Whether the "Submit tool" email link works (a search snippet's Product Hunt claim, with no retained URL, is unread and unused).
- Terminal Trove's rules were not in this commission and were not fetched.
