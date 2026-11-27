---
title: Software marketing failure corpus - landscape scout
program: product (sub-program marketing)
worker: mkt-failure-corpus (landscape scout, repair pass)
date_researched: 2026-11-27
model: sonnet
sources_fetched: 44
---

# Software marketing failure corpus

## Method and limits

This is a repair of the first pass. The first pass never touched Hacker News (HN) or Reddit threads. This pass queried the HN Algolia API (the public search API behind hn.algolia.com, <https://hn.algolia.com/api>) and counted objections. It also fetched the primary pages that the first pass only named. 44 pages in total are cited (27 from the first pass, 17 new).

What is still not surveyed, and why:

- Reddit. Every reddit.com, old.reddit.com, redditinc.com and support.reddithelp.com fetch failed (HTTP 403 or "unable to fetch"). No Reddit rule text and no Reddit thread count is claimed. The Reddit candidate row is a question with the blocked URL, marked as unverified.
- CB Insights (HTTP 403 in pass one), Wynter and Fletch teardowns, and the Product Hunt vote-ring rules. The Product Hunt article states no rule on vote rings or bots; only the rules quoted below.
- The web-search tool budget ran out, so no new incident lists (tone-deaf posting, astroturfing scandals) were searched. The one automated-posting case is Microsoft Tay, fetched from Wikipedia (a secondary source).

Measurement method (all numbers in "HN objection counts" below come from these):

1. Phrase counts by year: `curl -s -G "https://hn.algolia.com/api/v1/search" --data-urlencode 'query="no pricing"' --data-urlencode "tags=comment" --data-urlencode "numericFilters=created_at_i>=<start>,created_at_i<<end>" --data-urlencode "hitsPerPage=0"`, reading `nbHits`, for each phrase and each year 2023 to 2026 (2026 is year-to-date, 2026-11-27). Counts are exact-phrase matches on all comments, not only launch threads.
2. Thread sample: the 100 highest-ranked Show HN stories from 2026-01-01 with at least 40 comments (`tags=show_hn`, `numericFilters=created_at_i>1767225600,num_comments>=40`, `hitsPerPage=100`), then the full comment tree of each via `https://hn.algolia.com/api/v1/items/<objectID>` (18,721 comments), matched with case-insensitive regexes. The script ran from a scratch directory outside the repository and is not published; the regexes are described in each row below so the run can be repeated. The sample is relevance-ranked (popular threads), so it over-represents launches that did well. It is a lower bound for each objection because the regexes are narrow phrases.
3. Show HN share per phrase: the first 200 2026 comment hits per phrase (`hitsPerPage=200`), counting those whose `story_title` starts with "Show HN".

## HN objection counts (measured)

Comments in 100 popular 2026 Show HN threads (18,721 comments). "Threads" is how many of the 100 threads contain at least one match.

| Objection class | Regex idea (case-insensitive) | Matching comments | Threads of 100 |
|---|---|---|---|
| AI-written copy or "slop" | "AI/LLM generated/written", "written by AI/LLM/ChatGPT/Claude", "reads like AI", "slop" | 246 | 66 |
| Pricing missing, hidden or unclear | "no pricing", "pricing page/info/link", "can't find pricing", "how much does it cost", "free tier" | 21 | 14 |
| Buzzword or marketing speak | "buzzword", "marketing speak/fluff/copy/jargon", "word salad" | 11 | 9 |
| Sign-up, login or waitlist wall | "sign up to/required", "requires login/account", "behind a login/paywall", "waitlist" | 7 | 7 |
| Unclear what the product does | "unclear what", "doesn't say what", "what does this actually do" | 5 | 5 |
| No screenshot, demo or example | "no screenshots/demo/examples", "would love to see a demo" | 2 | 2 |
| Benchmark doubts | "benchmark ... misleading/unfair/cherry/methodology" | 1 | 1 |

Reading the table: the AI-authorship accusation is the most frequent by a wide margin, but the regex also catches general talk about AI, so treat 66 as an upper bound for "accuses the post of being AI-written". Pricing and marketing-speak objections are real but a minority of threads. The others are rare in popular threads; unpopular launches are not in this sample and may have more.

Phrase counts across all HN comments, by year (2026 is year-to-date):

| Phrase | 2023 | 2024 | 2025 | 2026 |
|---|---|---|---|---|
| "AI slop" | 0 | 385 | 3,215 | 7,262 |
| "written by AI" | 206 | 223 | 604 | 1,331 |
| "marketing speak" | 122 | 118 | 124 | 147 |
| "no pricing" | 69 | 71 | 49 | 43 |
| "sign up to" | 523 | 347 | 306 | 355 |

So the "AI slop" objection grew about 19-fold from 2024 to 2026 YTD, while pricing, sign-up and marketing-speak complaints stayed flat or fell. Of the 2026 comment hits (first 200 per phrase, so truncated for broad phrases): "no pricing" 6 of 43 were under a Show HN, "marketing speak" 13 of 147 (capped at 200), "no screenshots" 13 of 55, "buzzwords" 9 of 200 (capped).

Verbatim examples from 2026 Show HN threads (fetched through the API; objectIDs open at `https://news.ycombinator.com/item?id=<id>`):

- Pricing: "No pricing page, you've lost my interest. Doesn't matter that there is an obscured quote on the front page. Be up front about the costs." ([47809438](https://news.ycombinator.com/item?id=47809438))
- Pricing, general: "Absolutely every paid product should have a pricing link in the top nav, spelled out in large, friendly letters." ([46716619](https://news.ycombinator.com/item?id=46716619), 2026-01-22, also "this information should replace the fluffy marketing speak")
- Sign-up wall: "The benchmarks are hidden behind a sign up form. Why not just keep it open? This looks as if you are just advertising." ([49098510](https://news.ycombinator.com/item?id=49098510))
- Marketing register: "I'm reading your marketing copy, it's your job to market it." ([48821848](https://news.ycombinator.com/item?id=48821848)); "drop the marketing speak and never use an eyebrow" ([50014616](https://news.ycombinator.com/item?id=50014616))
- No demo: "Nice work but would love to see a demo in readme" ([48215979](https://news.ycombinator.com/item?id=48215979))
- Unclear category: "what does this actually do?" under an ERP launch ([46966591](https://news.ycombinator.com/item?id=46966591))

Hostile-to-buzzwords signal: "how is this on the front page at the 2 spot? People upvoting based on seeing buzzwords I assume?" ([49661214](https://news.ycombinator.com/item?id=49661214)).

## Failure classes by mechanism (ranked by measured or judged frequency)

| # | Class | Mechanism | Evidence | Check that would have caught it |
|---|---|---|---|---|
| 1 | Copy that reads as AI-written | Readers call out machine-generated launch text; HN bans generated text in posts and comments | Counts above (66 of 100 threads, annual growth); [HN guidelines](https://news.ycombinator.com/newsguidelines.html) | Every claim in launch copy has one fact only the author has (a measurement, a command output, a screenshot); remove stock phrases and eyebrow headings |
| 2 | Cost not visible | Visitor cannot learn price or free-ness; trust is lost before the product is seen | Pricing objection in 14 of 100 threads; quotes above | Pricing or "free, open source, licence" link in the top nav; text match on the landing page |
| 3 | Marketing register on a sceptical channel | Promotional tone makes readers filter claims | 9 of 100 threads; [HN guidelines](https://news.ycombinator.com/newsguidelines.html) say do not use HN primarily for promotion; [NN/g 1997](https://www.nngroup.com/articles/how-users-read-on-the-web/) (objective copy 27% better; 29 years old) | Lint copy for superlatives, eyebrow taglines, exclamation points; claim needs a number or link |
| 4 | Gated or not a product | Sign-up or waitlist before the first look; landing page posted as Show HN | 7 of 100 threads; [Show HN rules](https://news.ycombinator.com/showhn.html) | A stranger runs it in one command without an account |
| 5 | Category unclear | Page never says what the thing is | 5 of 100 threads (narrow regex) | The first sentence names the category noun and the audience |
| 6 | Unreproducible vendor benchmark | No hardware, config or versions; mislabelled workload | [ClickHouse on Databricks, 2026-06-30](https://clickhouse.com/blog/databricks-reyden-benchmark-transparency-clickhouse); [MariaDB on Percona, 2026-01-27](https://mariadb.org/why-sysbench%E2%80%91tpcc-results-on-outdated-hardware-should-not-be-presented-as-a-valid-oltp-vendor-comparison/); only 1 of 100 threads in the HN sample | Every "Nx faster" links hardware, versions, command, dataset size, defaults vs tuned |
| 7 | Fake or purchased social proof | Bought stars, fake reviews, undisclosed insider reviews | [arXiv 2412.13459](https://arxiv.org/abs/2412.13459); [FTC rule](https://www.ftc.gov/news-events/news/press-releases/2024/08/federal-trade-commission-announces-final-rule-banning-fake-reviews-testimonials) | Stars pulled by API; every testimonial has a source and consent |
| 8 | Licence or terms change announced without reasoning | Outcome stated, definitions omitted, community forks | [HashiCorp, 2023-08-10](https://www.hashicorp.com/en/blog/hashicorp-adopts-business-source-license); [The Register, 2023-08-28](https://www.theregister.com/2023/08/28/opentf_forks_terraform_code/) | Announcement template: who is affected, who is not, definitions, migration path |
| 9 | Email deliverability collapse | Complaint rate above threshold, missing authentication or unsubscribe | [Google](https://support.google.com/a/answer/81126), [Yahoo](https://senders.yahooinc.com/best-practices/) | Pre-send check of SPF, DKIM, DMARC, unsubscribe headers |
| 10 | Launch-day vote or promo manipulation | Upvote asks, mass DMs, fake accounts | [Product Hunt article, "Never ask for upvotes"](http://help.producthunt.com/en/articles/17734384-5-how-to-promote-your-launch-and-what-to-avoid); [HN guidelines](https://news.ycombinator.com/newsguidelines.html) | Launch plan forbids upvote asks and mass outreach |
| 11 | No market need or no distribution | Founders cite demand and marketing as causes | [Failory cemetery](https://failory.com/cemetery) (self-reported) | Positioning brief names audience, alternative, evidence of demand |
| 12 | Automated posting without guardrails | Bot posts unsupervised and is manipulated; no kill switch | [Tay, Wikipedia](https://en.wikipedia.org/wiki/Tay_(chatbot)): suspended after about 16 hours and 96,000 posts; one case only, secondary source | Scheduled or automated posting needs a pause control and a review step |

## Candidate topics

Priority is for an open-source developer-tool fleet (Astro and MkDocs sites, READMEs, release notes, CLI, GUI), then any software team. "Check" says how a rule or skill could verify the item without a human. A source marked "(blocked)" could not be fetched; the row is a question, not a verified fact.

| topic | why it matters | source (URL) | already-covered? | priority | could a rule or skill check it, and how |
|---|---|---|---|---|---|
| Does the Show HN or launch post meet the try-it-yourself bar (no sign-up, runnable, non-trivial)? | Landing and sign-up pages are off-topic; sign-up walls drew objections in 7 of 100 popular 2026 threads | https://news.ycombinator.com/showhn.html | no | high | Checklist: repo URL runs from one documented command; no auth wall on first run |
| Which phrases make a launch post read as AI-written, and what evidence of human authorship does a reader accept? | "AI slop" comments grew from 385 (2024) to 7,262 (2026 YTD); 66 of 100 threads had a match | https://hn.algolia.com/api/v1/search?query=%22AI%20slop%22&tags=comment | no | high | Skill: reject stock phrases and eyebrow headings; require one author-only fact per section |
| Does HN allow AI-edited or generated text in a launch post or reply? | Guidelines: no generated text in posts, no generated or AI-edited comments | https://news.ycombinator.com/newsguidelines.html | no | high | Rule: launch drafts for HN are written by the human; agent drafts only for other channels |
| Which words in a launch title trigger the marketing-tone objection, and which title edits does HN make? | HN crops gratuitous numbers and forbids uppercase and exclamation points | https://news.ycombinator.com/newsguidelines.html | no | high | Lint title: no uppercase words, exclamation points, number plus adjective, superlatives |
| Is pricing or free-tier status visible without sign-up? | Pricing objection in 14 of 100 popular threads; "No pricing page, you've lost my interest" | https://news.ycombinator.com/item?id=47809438 | no | high | Lint on rendered nav: link text matching pricing, free or licence present; open-source tools state licence in the first screen |
| Does the home page state category, audience and an artifact above the fold? | "What does this actually do?" and "would love to see a demo" appear; counts are small but the cost is a lost visitor | https://news.ycombinator.com/item?id=46966591 | partial (docs-quality covers docs pages, not home pages) | high | Checklist on rendered page: category noun in first sentence, install command, screenshot or output, pricing link |
| Does promotional wording measurably cost reader performance, and how old is the evidence? | NN/g 27% for objective copy, study from 1997-09-30; no replication fetched | https://www.nngroup.com/articles/how-users-read-on-the-web/ | partial (docs-quality plain English) | medium | Word-list lint (marketese); flag evidence age in the reference |
| When is a release worth its own Show HN versus a changelog entry? | "Foo 1.3.1 is out" is explicitly insufficient; repeat posting wastes the channel | https://news.ycombinator.com/showhn.html | no | high | Rule: release-post gate requires a named user-visible change |
| What must a benchmark claim disclose to survive a rival's rebuttal? | Two 2026 rebuttals hinge on missing hardware, config, dataset size, tuning | https://clickhouse.com/blog/databricks-reyden-benchmark-transparency-clickhouse | no | high | Rule: any "Nx faster" sentence links a methodology file; grep "faster" without link |
| Is the benchmark workload what it is labelled (TPC-like vs TPC-C, closed-loop vs open-loop)? | Mislabelled workload is the stated flaw in the MariaDB critique | https://mariadb.org/why-sysbench%E2%80%91tpcc-results-on-outdated-hardware-should-not-be-presented-as-a-valid-oltp-vendor-comparison/ | no | medium | Reading heuristic in a review skill |
| How should a licence or terms change be announced? | HashiCorp left "competitive offering" undefined; fork followed within about two weeks | https://www.hashicorp.com/en/blog/hashicorp-adopts-business-source-license | no | high | Announcement template with required sections; defined-terms check |
| What do contributors do after a licence change, and what does it cost? | Percona: 9 of 24 pre-fork Redis contributors stopped; Valkey 18 to 49 | https://www.percona.com/blog/community-erosion-post-license-change-quantifying-the-power-of-open-source/ | no | medium | Decision-gate skill with git-history commands for contributor exposure |
| Does a registry or ToS change need the same notice as a licence change? | Terraform Registry ToS change read as fork-blocker (context only) | https://www.theregister.com/2023/08/28/opentf_forks_terraform_code/ | no | low | Rule: terms changes ship with changelog and notice period |
| Can a relicence be walked back, and what does the reversal wording need? | Redis moved to AGPL in 2025; critics unconvinced | https://www.theregister.com/2025/05/01/redis_returns_to_open_source/ | no | low | Template for reversal posts; no automatic check |
| Is each testimonial, review count or star badge real and sourced? | FTC rule bans fake and undisclosed-insider reviews and fake social indicators; effective 2024-10-21 | https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers | no | high | Lint: every quote has name, link or consent record; star counts pulled by API, not typed |
| Does a purchased-engagement metric, such as GitHub stars, create reputational and legal risk? | 6.0 million fake stars across 18,617 repositories; at the July 2024 peak 16.66% of popular repositories had campaigns; most such stars promote phishing malware | https://arxiv.org/abs/2412.13459 | no | medium | Rule: no purchased engagement; policy statement only, not lintable |
| Which fake social-media indicators does the FTC rule cover, and who is liable? | Section 465.8 covers indicators the business knew or should have known were fake; hiring an influencer with fake followers is not liable under it | https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers | no | medium | Dated fact in a reference file |
| What is the civil-penalty amount today? | Needed to state exposure; neither FTC page fetched gives a dollar figure | https://www.federalregister.gov/api/v1/documents/2024-18519.json | no | low | Dated fact; fetch the inflation-adjusted figure before citing |
| How must employees, maintainers and partners disclose when promoting the product? | FTC guide: employment is a material connection; platform tools alone may not suffice | https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers | no | high | Post-template lint for an explicit affiliation line |
| Where does AI-assisted copy become "scaled content abuse" for site pages? | Google: generating many pages without added value is spam "no matter how it's created" | https://developers.google.com/search/docs/essentials/spam-policies | no | high | Rule: programmatic pages need per-page unique data; script counts near-duplicate pages |
| What does Google say about using generative AI for content that is not spam? | Allowed to research and structure; "manually factcheck and review all AI-generated content" | https://developers.google.com/search/docs/fundamentals/using-gen-ai-content | no | medium | Checklist: human fact-check recorded per page |
| Which YouTube videos are ineligible for monetisation as inauthentic content? | Renamed 2025-07-15; template-built and generic AI content ineligible; applies channel-wide | https://support.google.com/youtube/answer/1311392 | no | medium | Checklist in the video skill: per-video distinct concept, original commentary |
| Does a LinkedIn post using pods, automation or reciprocal engagement violate policy? | Policy: do not "agree with others ahead of time to like or re-share each other's content"; no explicit bot rule | https://www.linkedin.com/legal/professional-community-policies | no | high | Rule banning pod tactics; not lintable |
| Must synthetic media in marketing be disclosed? | LinkedIn requires clear disclosure for manipulated media of a person; EU transparency rules from August 2026 | https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai | no | high | Checklist: AI avatar or voice-clone assets labelled; chatbot says it is AI |
| What are the exact current thresholds for email senders? | Google: below 0.30%, aim 0.10%, 5,000 per day; Yahoo: below 0.3%, unsubscribes honoured within 2 days | https://support.google.com/a/answer/81126 | no | medium | Dated fact; script checks DNS and headers (dig, header parse) |
| Does each marketing email carry a working one-click unsubscribe that satisfies RFC 8058? | POST must not redirect; headers must be DKIM-signed | https://www.rfc-editor.org/rfc/rfc8058 | no | medium | Test: send to a mailbox, parse headers, POST the URI, assert 2xx and no redirect |
| Which pre-launch evidence of demand separates "no market need" from poor marketing? | Failory labels 17 failure causes; "Bad Marketing" and "No Market Need" are distinct | https://failory.com/cemetery | no | medium | positioning-brief skill requires named alternatives and user evidence |
| Do founder postmortems explain failure reliably? | Founder-reported causes are self-reported | https://failory.com/cemetery | no | low | Reference-file caveat only |
| What do Product Hunt launch rules forbid? | "Never ask for upvotes"; no paid engagement; no mass DMs; one account per person; breaches can remove the launch and ban the account | http://help.producthunt.com/en/articles/17734384-5-how-to-promote-your-launch-and-what-to-avoid | no | medium | Checklist in a launch-plan skill |
| How are Reddit self-promotion limits and per-subreddit rules enforced? | Account-level bans end a channel; no Reddit page could be fetched, so the rule text is unverified | https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam (blocked, HTTP 403) | no | medium | Checklist: read the subreddit rules and disclose affiliation; fetch from a session that can reach Reddit before writing any rule |
| Which automated or scheduled brand posts failed, and what control would have stopped them? | Tay was suspended after about 16 hours and more than 96,000 posts, then re-released by accident on 2016-03-30; one secondary-source case, no marketing-scheduler case found | https://en.wikipedia.org/wiki/Tay_(chatbot) | no | medium | Rule: automated posting needs a pause control, rate cap and a human review of replies |
| Is the marketing artifact itself accessible (target size, focus visibility, captions, contrast)? | WCAG 2.2 (2023-10-05) added 24 by 24 CSS pixel target minimum and focus-not-obscured at AA; the European Accessibility Act covers e-commerce | https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/ | partial (css-theming and docs-quality touch contrast) | medium | Axe or Lighthouse on rendered pages; caption file present for videos |
| Are measurement claims in a launch retrospective valid (stars, upvotes, referrals)? | Stars can be bought: up to 16.66% of popular repositories had fake-star campaigns at the 2024 peak, so a star delta is not a clean signal | https://arxiv.org/abs/2412.13459 | no | medium | Template requires denominator, window and source for every number; compare stars with downloads |
| Decay rate of platform advice: which claims in a skill have a date and a re-fetch trigger? | Several authoritative pages show no date (HN, Yahoo, LinkedIn, Google spam policy) | https://www.linkedin.com/legal/professional-community-policies | no | high | Lint: each platform fact has a URL and a retrieval date; CI flags those older than 12 months |

## Dated facts

"Retrieved 2026-11-27" means the page states no date; the retrieval date is the freshness anchor. Undated pages must be re-fetched on a schedule, not trusted by age.

| Fact | Source | Date the source states |
|---|---|---|
| Show HN excludes landing pages, sign-up pages, newsletters; asks for no sign-up barrier; no vote solicitation | https://news.ycombinator.com/showhn.html | Undated; retrieved 2026-11-27 (first pass) |
| HN: "Please don't use HN primarily for promotion"; posts should not contain generated text; comments no generated or AI-edited text; crop gratuitous numbers; no uppercase or exclamation points in titles | https://news.ycombinator.com/newsguidelines.html | Undated; retrieved 2026-11-27 |
| Product Hunt: "Never ask for upvotes"; no paid upvotes or comments; no mass DMs or scraped lists; one account per person; breach can remove the launch and ban the account | http://help.producthunt.com/en/articles/17734384-5-how-to-promote-your-launch-and-what-to-avoid | "Updated over 3 weeks ago" (relative; retrieved 2026-11-27) |
| Product Hunt: only personal accounts can post products; no hunter required | https://help.producthunt.com/en/articles/479557-how-to-post-a-product | "Updated over 3 weeks ago" (relative; retrieved 2026-11-27) |
| FTC fake-review rule: effective 2024-10-21; published 2024-08-22 | https://www.federalregister.gov/api/v1/documents/2024-18519.json and https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers | 2024-08-22 published; 2024-10-21 effective |
| FTC rule bans buying or selling fake reviews, undisclosed insider reviews, company-controlled "independent" review sites, review suppression, and buying or selling fake social-media indicators | https://www.federalregister.gov/api/v1/documents/2024-18519.json (abstract) | 2024-08-22 |
| FTC fake social indicators (section 465.8) apply to indicators the business knew or should have known were fake | https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers | Undated; retrieved 2026-11-27 |
| FTC fake-review rule announced; civil penalties against knowing violators (no dollar figure on the fetched pages) | https://www.ftc.gov/news-events/news/press-releases/2024/08/federal-trade-commission-announces-final-rule-banning-fake-reviews-testimonials | 2024-08-14 |
| FTC endorsement disclosure guide: disclose material connections; platform tools alone are not enough | https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers | November 2019 |
| 6.0 million suspected fake GitHub stars, 18,617 repositories with campaigns, 301k participating accounts; fake stars at most about 1% of all stars per month; 16.66% of popular repositories had campaigns at the July 2024 peak; 90.42% of repositories with campaigns were later deleted vs 5.03% baseline | https://arxiv.org/html/2412.13459 | v1 2024-12-18; v2 2025-09-06 |
| Google: "scaled content abuse" covers many pages generated to manipulate rankings, "no matter how it's created", including generative AI used without adding value | https://developers.google.com/search/docs/essentials/spam-policies | Undated; retrieved 2026-11-27 |
| Google: generative AI allowed for research and structure; "manually factcheck and review all AI-generated content" | https://developers.google.com/search/docs/fundamentals/using-gen-ai-content | Undated; retrieved 2026-11-27 |
| Google March 2024 update: three new spam policies; site reputation abuse effective 2024-05-05 | https://developers.google.com/search/blog/2024/03/core-update-spam-policies | 2024-03-05 |
| Google bulk senders: more than 5,000 messages a day; spam rate below 0.30%, recommended below 0.10%; one-click unsubscribe; SPF, DKIM, DMARC | https://support.google.com/a/answer/81126 | Effective 2024-02-01; footer 2026 |
| Yahoo: spam rate below 0.3%; honour unsubscribes within 2 days; enforcement from February 2024 | https://senders.yahooinc.com/best-practices/ | No page date; footer "2026"; enforcement February 2024 |
| RFC 8058: List-Unsubscribe and List-Unsubscribe-Post; DKIM must cover them; POST must not redirect | https://www.rfc-editor.org/rfc/rfc8058 | January 2017 |
| LinkedIn: no pre-agreed likes or re-shares; synthetic media of a person only if clearly disclosed; no explicit automation or AI-text rule on the page | https://www.linkedin.com/legal/professional-community-policies | No page date; footer "2026" |
| YouTube "inauthentic content" (renamed from repetitious); channel-wide; generic-template AI content ineligible | https://support.google.com/youtube/answer/1311392 | 2025-07-15 |
| WCAG 2.2 became a W3C Recommendation; adds 2.5.8 Target Size (Minimum) 24 by 24 CSS pixels (AA) and 2.4.11 Focus Not Obscured (Minimum) (AA); removed 4.1.1 Parsing | https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/ | 2023-10-05 |
| European Accessibility Act: e-commerce and e-books in scope; Member States transposed by June 2022 (application date 2025-06-28 is not stated on the fetched page and is not claimed here) | https://commission.europa.eu/strategy-and-policy/policies/justice-and-fundamental-rights/disability/union-equality-strategy-rights-persons-disabilities-2021-2030/european-accessibility-act_en | Undated; retrieved 2026-11-27 |
| EU AI Act transparency rules in effect August 2026; AI Omnibus in force 2026-07-27 | https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai | August 2026 / 2026-07-27 |
| Microsoft Tay: launched 2016-03-23; suspended within about 16 hours after more than 96,000 posts; re-released by accident 2016-03-30 | https://en.wikipedia.org/wiki/Tay_(chatbot) | 2016-03 (secondary source) |
| HashiCorp moved Terraform from MPL 2.0 to BSL | https://www.hashicorp.com/en/blog/hashicorp-adopts-business-source-license | 2023-08-10 |
| OpenTF fork announced, later OpenTofu | https://opentofu.org/blog/opentofu-announces-fork-of-terraform/ | 2023-08-25 |
| Fork repo stars rose from about 300 to about 4,600 within days | https://www.theregister.com/2023/08/28/opentf_forks_terraform_code/ | 2023-08-28 |
| Redis moved to RSALv2 and SSPLv1 in March 2024; Valkey forked; Redis 8 added AGPLv3 | https://www.theregister.com/2025/05/01/redis_returns_to_open_source/ | 2025-05-01 |
| Redis contributors: 9 of 24 stopped; Valkey 18 to 49 contributors | https://www.percona.com/blog/community-erosion-post-license-change-quantifying-the-power-of-open-source/ | 2025-12-05 |
| Elastic says the licence change "worked" | https://www.elastic.co/blog/elasticsearch-is-open-source-again | 2024-08-29 |
| ClickHouse rebuttal of Databricks benchmark; about 420 QPS sustained on a 30 vCPU node | https://clickhouse.com/blog/databricks-reyden-benchmark-transparency-clickhouse | 2026-06-30 |
| MariaDB critique of Percona sysbench-tpcc comparison | https://mariadb.org/why-sysbench%E2%80%91tpcc-results-on-outdated-hardware-should-not-be-presented-as-a-valid-oltp-vendor-comparison/ | 2026-01-27 |
| NN/g: objective copy scored 27% better than promotional | https://www.nngroup.com/articles/how-users-read-on-the-web/ | 1997-09-30 |
| Failory cemetery: about 135 entries, 17 failure-cause labels | https://failory.com/cemetery | No date on page; retrieved 2026-11-27 (first pass) |
| HN comment counts of "AI slop", "written by AI", "marketing speak", "no pricing", "sign up to" by year | https://hn.algolia.com/api/v1/search (queries in Method and limits) | Counts as of 2026-11-27 |

## Contested

| Position A | Position B |
|---|---|
| Redis licence change damaged the community: [Percona](https://www.percona.com/blog/community-erosion-post-license-change-quantifying-the-power-of-open-source/) (9 of 24 contributors gone, Valkey faster growth) | Redis's CEO said the company had "record growth since we switched the license" and that 98% of Redis contributors work for Redis, per [The Register](https://www.theregister.com/2025/05/01/redis_returns_to_open_source/) |
| Licence change as business success: [Elastic](https://www.elastic.co/blog/elasticsearch-is-open-source-again) says it "worked" | Licence change as betrayal and fork trigger: [The Register](https://www.theregister.com/2023/08/28/opentf_forks_terraform_code/) quotes OpenTF calling BSL a "poison pill" |
| AI-written content is penalised: [YouTube](https://support.google.com/youtube/answer/1311392) makes generic template AI content ineligible; HN readers increasingly call posts "AI slop" (7,262 comments in 2026 YTD) | Google targets purpose, not method: [spam policy](https://developers.google.com/search/docs/essentials/spam-policies) says "no matter how it's created", and the [generative AI page](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content) allows it for research and structure; third-party traffic-loss claims were not verified |
| Fake stars are a large problem: [arXiv](https://arxiv.org/abs/2412.13459) found 16.66% of popular repositories with campaigns at the July 2024 peak | The same paper finds fake stars at most about 1% of all stars per month, so star counts overall are mostly sound |
| Mailto-only unsubscribe is acceptable: [Yahoo](https://senders.yahooinc.com/best-practices/) | Google's page requires the header pair; vendor claim that mailto is not enough was not confirmed in a primary source |
| Old evidence still holds: [NN/g 1997](https://www.nngroup.com/articles/how-users-read-on-the-web/) | Age of data is 29 years; no current replication fetched |
| Pricing and sign-up objections are the core launch complaints (the brief's premise) | In 100 popular 2026 Show HN threads they appear in 14 and 7 threads; the AI-authorship objection appears in up to 66 |
