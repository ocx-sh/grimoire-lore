---
title: "Agent action boundary per public channel: what an agent may do, which labels it must set, which venues get a fact sheet only"
program: product
sub_program: channels
topic: channel-agent-boundary
worker: core-agent-action-boundary
date_researched: 2026-11-27
model: sonnet
sources_fetched: 36
scope: "One matrix, 14 platforms x 7 actions (draft, schedule, post, reply, submit a listing, upload through an API, pay), with credential custody, the platform-native AI/automation labels, the venue bans on generated text, and a measured secret scan of the 17 fleet repositories. Out of scope: legal disclosure standards (marketing sub-program). Fetch tooling summarised some pages, so every quote below is marked [verbatim from raw HTML/markdown] when it came from my own curl extraction, and [fetch-tool quote] when it came through the WebFetch summariser and was not re-checked against raw bytes."
---

# Agent action boundary per public channel

## Contents

1. [Summary](#summary)
2. [Method and measurements](#method-and-measurements)
3. [Findings](#findings)
   - 3.1 The matrix
   - 3.2 Per-platform clauses with dates
   - 3.3 Platform-native labels: where and how
   - 3.4 Venue bans on generated or AI-edited text
   - 3.5 Credential custody
   - 3.6 Staleness: facts that moved in the last 12 months
   - 3.7 Scout claims that did not reproduce
   - 3.8 Secret scan of the fleet
4. [Normative guidance candidates](#normative-guidance-candidates)
5. [Dated facts](#dated-facts)
6. [What an agent must not decide alone](#what-an-agent-must-not-decide-alone)
7. [AI-agent angle](#ai-agent-angle)
8. [Contested / evolving](#contested--evolving)
9. [Sources](#sources)

## Summary

- Default shape for every public channel: the agent drafts and prepares, a named human posts, replies and submits. Only two platforms publish an official, documented, supported automation path for ordinary brand posts: X (automated accounts with a label, under rules) and Bluesky/Threads/Mastodon (bot-friendly APIs with a self-label or flag). Everywhere else the safe default is draft-only.
- Hacker News bans generated and AI-edited text and bans automated posting. The agent must give a fact sheet and outline, never paste-ready prose. Clause: "Don't post generated text or AI-edited text. HN is for conversation between humans." and "please don't automate posting." ([HN guidelines](https://news.ycombinator.com/newsguidelines.html), fetched 2026-11-27, page states no date) [fetch-tool quote].
- Stack Overflow bans generative AI content outright: "Generative artificial intelligence (a.k.a. GPT, LLM, generative AI, genAI) tools may not be used to generate content for Stack Overflow." It extends to drafting: "Please do not draft content for Stack Overflow using large language model (LLM) services" ([SO gen-ai-policy](https://stackoverflow.com/help/gen-ai-policy), fetched 2026-11-27) [verbatim from raw HTML].
- mastodon.social and mastodon.online (same operator, same rule text) require disclosure of generative AI and bar AI-only accounts: "use of generative AI must be disclosed ... Accounts may not solely post AI-generated content." ([mastodon.social rules API](https://mastodon.social/api/v1/instance/rules), fetched 2026-11-27; ToS effective 2026-08-31) [verbatim from JSON].
- dev.to allows AI-assisted articles only with disclosure and bars promotion by them: "Promote any business, program, or course (including your own)" is on the do-not list. Guideline post dated Dec 19, 2022, last edited Jan 9, 2023 ([dev.to guidelines](https://dev.to/devteam/guidelines-for-ai-assisted-articles-on-dev-17n6)) [fetch-tool quote]. A promotional launch article by an agent is therefore off-limits on dev.to.
- Product Hunt: "No LLMs or Chrome extensions please!" for comments ([PH commenting guidelines](https://help.producthunt.com/en/articles/10030102-commenting-guidelines), dated July 28, 2025) [fetch-tool quote]. The Product Hunt Terms of Service could not be fetched (HTTP 403 and 404), so the submission clause is unsourced.
- LinkedIn: User Agreement 8.2 forbids "bots or other unauthorized automated methods"; the User Agreement is "Effective on November 3, 2025" ([LinkedIn User Agreement](https://www.linkedin.com/legal/user-agreement)) [fetch-tool quote]. LinkedIn does ship an official Posts API with `w_member_social` and `w_organization_social` ([Microsoft Learn, ms.date 2026-05-07](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api)), but the API Terms say not to "Use the Content or the APIs to automate posting on the LinkedIn Services" (revised December 13th, 2022; [LinkedIn API Terms](https://www.linkedin.com/legal/l/api-terms-of-use)) [fetch-tool quote]. Net: scheduled posting by an approved tool at human request is the supported route; unattended agent-initiated posting is not clearly permitted. Decision: human posts.
- YouTube: API Developer Policies say "you must not automate or trigger views, uploads, comments, likes, dislikes, or other actions without the user's prior specific and express consent" (page last updated 2026-11-06) [verbatim from raw HTML]. Upload through the API is therefore allowed only with a recorded human consent per upload batch.
- X: since Feb 23, 2026 "Programmatic replies via POST /2/tweets are now only permitted when the original Post's author has 'summoned' the replier" ([X API changelog](https://docs.x.com/changelog)) [verbatim]. Automated accounts must enable the "Automated" profile label ([X developer guidelines](https://docs.x.com/developer-guidelines.md), page last-modified header 2026-11-27) [verbatim].
- Labels are settable by API on three platforms: Threads `is_made_with_ai=true` ([Threads posts docs, Updated Oct 30, 2026](https://developers.facebook.com/docs/threads/posts)), X "Automated" profile label, Bluesky `bot` self-label on the profile ([atproto bot tutorial](https://atproto.com/guides/bot-tutorial)). YouTube's "AI use" field is a YouTube Studio upload setting ([YouTube Help](https://support.google.com/youtube/answer/14328491)); this research found no API field for it in the pages fetched.
- Credential custody: no platform page fetched permits a plain-text publishing token in a repository. X: "You must keep all API keys or other access credentials private." LinkedIn: "Keep your Access Credentials secret." Measured on the 17 fleet repositories: 0 publishing-token hits from gitleaks v8.30.1 with five added rules; 2 files hold Discord-webhook-shaped placeholders in test fixtures.
- Pay: no platform page fetched lets an agent make a payment decision. X posting is metered ($0.015 per post, $0.20 per post with a URL; [X API changelog](https://docs.x.com/changelog) entry dated Apr 16, 2026, effective April 20, 2026, platform data, fetched 2026-11-27). Paid reach (LinkedIn ads, boosts) is a spend decision for a human.
- Four primary sources could not be fetched at all (Reddit Responsible Builder Policy, Product Hunt Terms, Discord Developer Policy and Terms, X Automation Rules help page); each is flagged where it matters. The central question could still be sourced, so `blocked` is false.

## Method and measurements

Every command is recorded. Today is 2026-11-27 and every "fetched" date below is that date unless stated.

| What | Command or tool | Result |
|---|---|---|
| Page fetch with summariser | WebFetch (small-model summary, quotes may be paraphrased) | used for HN, LinkedIn, YouTube policy, X policy, Bluesky guidelines, Threads, dev.to, PH, Discord guidelines |
| Raw fetch and text extraction | `curl -sL -A "Mozilla/5.0" <url> -o f.html; python3 -I t.py f.html 0 N` (t.py strips script/style/tags with `re` and `html.unescape`) | used for SO, Reddit Rules and User Agreement, Lobsters, dev.to code of conduct, YouTube ToS, YouTube developer policies, X docs, Threads posts page, YouTube GenAI help page |
| Mastodon rules and terms | `curl -s https://mastodon.social/api/v1/instance/rules` and `.../api/v1/instance/terms_of_service`, same for mastodon.online | rules text verbatim; `effective_date` 2026-08-31 for both |
| X changelog and guidelines | `curl -sL https://docs.x.com/changelog`, `curl -sL https://docs.x.com/developer-guidelines.md` | verbatim lines in this file |
| Last-modified headers | `curl -sI <url> \| grep -i last-modified` | X developer policy 2026-11-27 02:33:59 GMT; YouTube developer policies 2026-11-06 18:00:28 GMT; lobste.rs/about header equals fetch time (dynamic, not a revision date) |
| Secret scan | `docker run --rm -v "$B:/w" zricethezav/gitleaks:latest detect --no-git --source /w/src -c /w/gl.toml --redact -f json -r /w/out/gl.json --exit-code 0` (gitleaks v8.30.1 via `docker run --rm zricethezav/gitleaks:latest version`; no host binary was installed) | see 3.8 |
| Fleet copy | `rsync -a --exclude=.git --exclude=node_modules --exclude=target --exclude=.venv --exclude=.agents/worktrees --exclude=dist <repo>/ $B/src/<name>/` for each of the 12 directories under `/home/mherwig/dev/ocx-sh/` and 5 under `/home/mherwig/dev/grimoire-rs/`, `B=~/.cache/research-lang/exemplars/product/cab-gl` | 17 repositories, 2.4 GB copy, 1.23 GB scanned in 4m49s |
| Placeholder check | `grep -rIl --exclude-dir=node_modules -E "discord(app)?\.com/api/webhooks/[0-9]+" src` | 2 files, both test fixtures |

Fetch failures (reported, not worked around): Reddit Responsible Builder Policy (support.reddithelp.com, HTTP 403 Cloudflare challenge), Product Hunt Terms of Service (`/legal/terms-of-service` 404 through WebFetch, 403 through curl), Discord Developer Policy and Developer Terms of Service (support-dev.discord.com 403, docs.discord.com `.md` 403), X Automation Rules (help.x.com 403; the X developer guidelines page restates them and was used), `meta.stackoverflow.com` (403), `reddit.com` (blocked by the fetch tool), HN official API repo page (states no write policy either way).

## Findings

### 3.1 The matrix

Legend. A = allowed, C = conditional, F = forbidden, ? = no primary clause fetched. "Agent alone" means with no human step. Every cell restates a clause in 3.2; the date is the date the source states, or "no date on page" when none.

| Platform | Draft | Schedule | Post | Reply | Submit listing | Upload via API | Pay |
|---|---|---|---|---|---|---|---|
| LinkedIn | A (drafting is not covered by any clause) | C: by approved partner tools only (Posts API, `lifecycleState` DRAFT / PUBLISHED); API Terms bar automating posting | F alone; C if human-initiated through an approved integration | F alone (User Agreement 8.2 bans automated actions such as sending messages, likes) | n/a (no listing) | C: Images, Videos, Documents APIs exist, partner-gated | F alone: ads spend is a human decision |
| YouTube | A | C: human consent per batch | C: API write needs "prior specific and express consent" | C: comment automation needs the same consent | n/a | C: allowed with consent; unverified projects are not restricted to private | F alone: quota extension requires an audit; ads are a human decision |
| X | A | A: scheduled informational posts are allowed for labeled automated accounts | C: automated account with "Automated" label allowed; AI-generated posts need no written approval | C: only when the original author summoned (@mention or quote) since 2026-02-23; no identical replies | n/a | C: official API only | C: pay-per-use credits; agent needs a human-set spend cap |
| Bluesky | A | C: no native scheduler; external cron is fine for a labeled bot | C: bots welcome if self-labeled `bot` | C: only "if the user has tagged the bot account" | n/a | A (app password or OAuth) | n/a |
| Mastodon (mastodon.social, mastodon.online) | A | ? (docs fetched do not describe) | C: generative AI must be disclosed; account may not solely post AI content; bot flag is visual only | C: same disclosure | n/a | A (API exists) | n/a |
| Threads | A | C: 250 posts per rolling 24 h per profile | C: allowed through API; set `is_made_with_ai=true` for AI content | ? (reply management API exists; no policy clause fetched) | n/a | A (Threads API, permissions `threads_basic`, `threads_content_publish`) | n/a |
| Hacker News | C: fact sheet only | F | F: "please don't automate posting" | F: no generated or AI-edited text | C: human only (Show HN rules) | F (no write API found; none documented) | n/a |
| Reddit | C: fact sheet only (default; subreddit rules not fetched) | ? | F alone: Rules require authentic participation; Responsible Builder Policy unfetched | F alone | C: human only | C: new OAuth tokens reportedly need pre-approval (secondary source only) | n/a |
| Lobsters | C: fact sheet only | F | F: new accounts (first 70 days) cannot self-promote; self-promo under a quarter of activity | F alone | C: human only; tags required | ? | n/a |
| Stack Overflow | F: "Please do not draft content for Stack Overflow using large language model (LLM) services" | F | F | F | n/a | ? | n/a |
| dev.to | C: AI-assisted allowed with disclosure; not for promotion | ? | C: disclose; must not promote a business, program or course | ? | n/a | ? (API exists; no clause fetched) | n/a |
| Product Hunt | C: fact sheet only for comments | ? | C: human launch via personal verified account (scout, unrefetched) | F: "No LLMs or Chrome extensions please!" | C: human only | ? | n/a |
| BetaList | A | ? | ? | ? | C: human submits; Terms fetched hold no automation clause | ? | ? |
| Discord | A | C: webhooks exist; policy unfetched | C: Community Guidelines "Do not use self-bots or user-bots" so only a bot application or webhook | C: bot application only | n/a | A (bot API) | n/a |

### 3.2 Per-platform clauses with dates

Clauses are marked [raw] when I extracted them from raw fetched bytes and [tool] when only the WebFetch summariser returned them.

**LinkedIn**

- User Agreement 8.2 "Don'ts", item 13: "Use bots or other unauthorized automated methods to access the Services." It also covers automating actions such as adding contacts, sending messages, liking and sharing posts. Item 2 bars "Develop, support or use software, devices, scripts, robots or any other means or processes" to collect data. Page: "Effective on November 3, 2025." [tool] ([source](https://www.linkedin.com/legal/user-agreement), fetched 2026-11-27). The section number 8.2 and the item numbers 2 and 13 were stated by the summariser, not re-checked in raw text.
- Help a1341387 (prohibited software): states "Last updated: 2 years ago"; bans third-party software that scrapes or automates activity, including browser extensions; consequences include account restriction. This is a paraphrase [tool], because the tool refused to quote it ([source](https://www.linkedin.com/help/linkedin/answer/a1341387)). No calendar date exists on the page; treat the date as unknown, older than 2024-11.
- API Terms of Use: "Keep your Access Credentials secret." Section 3.1 item 26: "Use the Content or the APIs to automate posting on the LinkedIn Services." Item 3: "Request or publish information impersonating a Member." "Last revised on December 13th, 2022." [tool] ([source](https://www.linkedin.com/legal/l/api-terms-of-use)).
- Posts API: permission `w_member_social` "Post, comment, and like posts on behalf of an authenticated member"; `w_organization_social` limited to roles ADMINISTRATOR, DIRECT_SPONSORED_CONTENT_POSTER, CONTENT_ADMIN; `lifecycleState` values include DRAFT and PUBLISHED; `r_member_social` is "restricted" and "available to approved users only"; Marketing version 202601 sunset on January 15, 2027; `ms.date: 2026-05-07`, `updated_at: 2026-05-13` [raw] ([source](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api)).
- Content Credentials (C2PA): icon shown on image and video content that carries credentials; no member setting is described; rolling out gradually; page "Last updated: 1 month ago" [tool] ([source](https://www.linkedin.com/help/linkedin/answer/a6282984)).

**YouTube**

- API Services Developer Policies: "you must not automate or trigger views, uploads, comments, likes, dislikes, or other actions without the user's prior specific and express consent" [raw]; "Last updated 2026-11-06 UTC" [raw]; page header last-modified Fri, 06 Nov 2026 ([source](https://developers.google.com/youtube/terms/developer-policies)). Token handling (III.E.4.a): "may store authorization tokens for as long as is necessary provided that those tokens are used only for purposes ..." [tool]. User consent for actions (III.E.3.4): "the user must expressly consent to those actions prior to their actual execution." [tool].
- Terms of Service (US English): "access the Service using any automated means (such as robots, botnets or scrapers) except (a) in the case of public search engines, in accordance with YouTube's robots.txt file; or (b) with YouTube's prior written permission" and "Effective as of December 15, 2023" [raw] ([source](https://www.youtube.com/static?template=terms&gl=US&hl=en)). The Finnish-language page returned "Voimassa 5. tammikuuta 2022 lähtien" (effective 5 January 2022), a different regional version; the US English one is the one used.
- `videos.insert`: "A call to this method has a quota cost of 1 unit in the Video Uploads quota bucket." and "Videos uploaded from unverified API projects are not restricted to private viewing mode." [tool] ([source](https://developers.google.com/youtube/v3/docs/videos/insert)). Compliance audit page: "10,000 units per day combined for all other endpoints" and "You don't need an API Compliance Audit to upload public or unlisted videos." [tool] ([quota page](https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits), [upload guide](https://developers.google.com/youtube/v3/guides/uploading_a_video)). Neither page carries a calendar date.
- Altered or synthetic content: "We require creators to disclose AI-generated or altered content that seems realistic." Disclose when content "Makes a real person appear to say or do something they didn't do", "Alters footage of a real event or place", "Generates a realistic scene that didn't actually occur", or "Creates music that's the main focus of the video." No disclosure needed for "using generative AI tools to create or improve a video outline, script, thumbnail, title, or infographic", "Caption creation", or "Cloning one's own voice to create voice overs or dubs". The setting: YouTube Studio, Attributes, "AI use" [raw] ([source](https://support.google.com/youtube/answer/14328491), no date on page).

**X**

- Developer Policy (served at [docs.x.com/developer-terms/policy](https://docs.x.com/developer-terms/policy), last-modified 2026-11-27): "Services that perform write actions, including posting Posts, following accounts, or sending Direct Messages, must follow the Automation Rules." and "Always get explicit consent before sending people automated replies or Direct Messages", "Never perform bulk, aggressive, or spammy actions, including bulk following", "Never post identical or substantially similar content across multiple accounts." Also "You must keep all API keys or other access credentials private." and "You may not store X passwords" [raw].
- Developer guidelines ([source](https://docs.x.com/developer-guidelines.md), last-modified 2026-11-27): automated accounts must (1) "Enable the 'Automated' profile label", (2) "Disclose in bio ... State clearly that it's a bot and who operates it", (3) link to a human-managed account, (4) "Honor opt-out requests immediately", (5) "Use only the official X API". On AI replies: "No written approval from X is needed as long as you follow X's automation rules", "Cannot impersonate humans", and "Deploying AI-generated replies that break these rules is a violation, even if the content itself is helpful." Scheduled informational posts from an automated account are listed as allowed; "App auto-replies to anyone mentioning a keyword" is listed as not allowed [raw].
- Changelog ([source](https://docs.x.com/changelog)): "Feb 23, 2026 ... Programmatic replies via POST /2/tweets are now only permitted when the original Post's author has 'summoned' the replier (by @mentioning that account or quoting one of its Posts). ... These changes affect self-serve tiers only"; "POST /2/tweets is now $0.015 per post, and Posts containing a URL are $0.20 per Post (summoned replies remain $0.01). Following, Likes, and Quote-Posts via the API have been removed from all self-serve tiers." The pricing entry sits beside a link that names effective April 20, 2026 [raw].

**Bluesky**

- Community Guidelines, "Last Updated: September 19, 2025": "Do not send spam or repeatedly post content in ways that disrupt normal conversations or service use."; "Do not artificially manipulate features or social signals to gain unearned reach"; undisclosed commercial content is prohibited; the word "bot" does not appear [tool] ([source](https://bsky.social/about/support/community-guidelines)).
- atproto bot tutorial [raw, from the source MDX](https://raw.githubusercontent.com/bluesky-social/atproto-website/main/src/app/%5Blocale%5D/guides/bot-tutorial/en.mdx), rendered at [atproto.com/guides/bot-tutorial](https://atproto.com/guides/bot-tutorial) (no date on page): "As a best practice, bot accounts should identify themselves by adding a self-label to their profile."; "If you aren't using an existing account to post from, you should create a new account for your bot. You should also generate an app password for that account."; "Automated bots that post to an account on an regular interval are welcome on the network. If your bot interacts with other users, please only interact (like, repost, reply, etc.) if the user has tagged the bot account. It should be an opt-in interaction, or your bot may be flagged for spam." Note the verbatim typo "an regular".
- Terms of Service: "Last Updated: 14 August, 2025" [raw] ([source](https://bsky.social/about/support/tos)); no automation clause beyond proactive moderation was found.

**Mastodon (mastodon.social and mastodon.online, operated by Mastodon gGmbH, rules fetched 2026-11-27)**

- Rule 6 text on both instances: "Content created by others must be attributed, and use of generative AI must be disclosed | Content created by others must clearly provide a reference to the author, creator, or source. For adult content, this should include performers. Accounts may not solely post AI-generated content." [raw JSON from `/api/v1/instance/rules`]. Terms of service `effective_date` is 2026-08-31 on both; the terms carry no bot or automation clause (only automatic transformation of uploaded content by the service) [raw].
- Bot flag: "Mastodon currently treats the bot flag as a visual indication only." and "Enabling the bot flag will add a bot icon to your profile." [tool] ([source](https://docs.joinmastodon.org/user/profile/)).
- I did not verify that these two are the two largest instances by active users; the commission asked for "the two largest" and the fedidb lookup returned only the software total (8,911 instances, 8,733,790 users at fetch). mastodon.social is widely known as the largest and is the project operator's flagship; the pairing is an assumption.

**Threads**

- Publishing: "Profiles are limited to 250 published posts within a rolling 24-hour period. Publishing a carousel counts as a single post." Permissions `threads_basic` and `threads_content_publish`. Page "Updated : Oct 30, 2026" [raw] ([source](https://developers.facebook.com/docs/threads/posts)). The `developers.facebook.com/docs/threads/terms` URL returned HTTP 404; no Threads-specific API terms page was found, so Meta platform terms for it are unsourced.
- Label: "To disclose that a post contains AI-generated content, set is_made_with_ai=true when creating the media container with POST /{threads-user-id}/threads. The published post displays the AI info label ... It defaults to false. Omitting it or setting it to false does not add an AI self-disclosure and does not prevent automatic AI labeling. ... Set is_made_with_ai on the creation request, not on POST /{threads-user-id}/threads_publish." [raw]

**Hacker News** (no revision date on any of the three pages)

- Guidelines: "Please don't put generated text in HN posts." "Write your text yourself - HN is for sharing between humans." "Don't post generated text or AI-edited text. HN is for conversation between humans." "For the same reason, please don't automate posting." "Don't solicit upvotes, comments, or submissions." "Please don't use HN primarily for promotion." [tool] ([source](https://news.ycombinator.com/newsguidelines.html)). The quotation marks and the em dash character were normalised by the summariser.
- Show HN: "Don't post quickly-generated one-offs; anybody can do that now."; "The project must be something you've worked on personally and which you're around to discuss."; "Please make it easy for users to try your thing out, ideally without barriers such as signups or emails." The page does not mention AI text directly; the ban comes from the guidelines [tool] ([source](https://news.ycombinator.com/showhn.html)).
- FAQ: no bot, AI or multiple-account clause; "Please don't delete and repost the same story." [tool] ([source](https://news.ycombinator.com/newsfaq.html)). The scout row LC#17 ("do not automate posting and not to put generated text in posts") reproduces for the guidelines page, not for the FAQ.

**Reddit**

- Reddit Rules (redditinc.com, no date shown on the extracted text): "Rule 2 Abide by community rules. Participate authentically in communities where you have a personal interest, and do not spam or engage in disruptive behaviors (including content manipulation) that interfere with Reddit communities." "Rule 5 Be authentic. You don't have to use your real name, but do not intentionally mislead others or impersonate an individual or entity in a deceptive manner." [raw] ([source](https://redditinc.com/policies/reddit-rules)).
- User Agreement, "Effective July 1, 2026. Last Revised May 26, 2026": you may not "Use the Services in any manner (automated, including via bots, or otherwise) that could interfere with, disable, disrupt, overburden, or otherwise impair the Services" and "scraping the Services without Reddit's prior written consent is prohibited" [raw] ([source](https://redditinc.com/policies/user-agreement)).
- Responsible Builder Policy: not fetched (403). Secondary evidence only: a search returned Reddit's help-center fragment "This section applies to all users and developers who use or develop apps -including bots, AI agents, or non-human operated accounts- with Reddit data" and third-party reports that new OAuth tokens need pre-approval (r/redditdev thread, Nov 11, 2025). Treated as unverified.
- Subreddit rules (r/programming, r/selfhosted, r/opensource): not fetched; `reddit.com` is blocked in the fetch tool and r/selfhosted returned 403 in the scout. A skill must therefore read the target subreddit's rules at run time.

**Lobsters** ([source](https://lobste.rs/about), fetched 2026-11-27, page has no revision date) [raw]: "Self-promotion: It's great to have authors participate in the community, but not to exploit it as a write-only tool for product announcements or driving traffic to their work. As a rule of thumb, self-promo should be less than a quarter of one's stories and comments in the last year. New users (first 70 days) are not allowed to submit self-promo." New users also cannot "submit links to domains we haven't seen submitted before", and the tags `meta rant show announce satire job interview merkle-trees ask culture vibecoding` are restricted for them. The page has no clause on LLM text. `lobste.rs/rules` is 404.

**Stack Overflow** ([source](https://stackoverflow.com/help/gen-ai-policy), fetched 2026-11-27 via curl, no revision date extracted) [raw]: "Generative artificial intelligence (a.k.a. GPT, LLM, generative AI, genAI) tools may not be used to generate content for Stack Overflow. The content you provide must either be your own original work, or your summary of the properly referenced work of others. If your content is determined to have been written by generative artificial intelligence tools, it will likely be deleted, along with any reputation earned from it." "'Content generated by generative artificial intelligence tools' is any content crafted, in part or in whole, using a tool that writes a response automatically based on a prompt it is provided." "Please do not draft content for Stack Overflow using large language model (LLM) services as described above." Consequences: "a warning from moderators, or possibly a suspension for repeated infractions." The page's navigation mentions "Stack Overflow for Agents"; its content was not read and no clause on it is claimed.

**dev.to** ([source](https://dev.to/devteam/guidelines-for-ai-assisted-articles-on-dev-17n6), "Posted Dec 19, 2022, and last edited Jan 9, 2023") [tool]: AI-assisted articles should "Disclose the fact that they were generated or assisted by AI in the post"; the tag `#ABotWroteThis` is one accepted method; they should not "Promote any business, program, or course (including your own)"; suspension or ban for "Publishing any article with the main purpose of soliciting money." A search result referred to a newer 2026 revision with tiers, found only on a third-party mirror and not read at the primary; the current text may be stricter. DEV Code of Conduct: "Last updated July 31, 2023" [raw]. DEV Terms of Service: no bot or AI clause found in the extracted text [raw].

**Product Hunt**: commenting guidelines dated "July 28, 2025", "Product Hunt is about person-to-person interactions." "Our community wants to talk to and hear from real people. No LLMs or Chrome extensions please!" [tool] ([source](https://help.producthunt.com/en/articles/10030102-commenting-guidelines)). Terms of Service not fetched. Scout claims about who may launch (personal verified accounts only; PH#2) were not re-fetched here.

**BetaList**: Terms fetched ([source](https://betalist.com/terms)); extracted text contains no automation clause and no date. Submission page `/submit` extracted 1,170 characters with no policy content. Scout claim that criteria require a visible signup or access path was not re-fetched.

**Discord**: Community Guidelines "Effective: September 29, 2025": "Do not send unsolicited bulk messages (or spam) to others.", "Do not use self-bots or user-bots." "Each account must be associated with a human, not a bot." No generative-AI clause beyond child-safety synthetic media [tool] ([source](https://discord.com/guidelines)). Discord's own support article on self-bots exists at `support.discord.com/hc/articles/115002192352`; fetch returned 403 and only the search snippet is available. The webhook object documents `token` as "the secure token of the webhook (returned for Incoming Webhooks)" [raw] ([source](https://discord.com/developers/docs/resources/webhook)). Developer Policy and Developer Terms: not fetched.

### 3.3 Platform-native labels: where and how

| Platform | Label | Who sets it, where | Via API? | Date and source |
|---|---|---|---|---|
| X | "Automated" profile label plus bio disclosure ("Bot by @yourcompany" is the page's own example) plus link to a human-managed account | account owner, app settings | App settings (not a post field) | docs.x.com developer guidelines, 2026-11-27 last-modified |
| Bluesky | `bot` self-label on the profile record | account owner, once, at setup (`labelAsBot(session)`) | Yes, profile record write | atproto bot tutorial, undated |
| Mastodon | bot flag ("This is a bot account"), visual only; plus textual AI disclosure per instance rule 6 | account owner in profile; AI disclosure in the post text or content warning (the rule gives no mechanism) | Bot flag in profile settings; no AI field in rules text | mastodon.social rules 2026-11-27; docs.joinmastodon.org |
| Threads | AI info label | post creator, per post, on the container-creation call | Yes, `is_made_with_ai=true` on `POST /{threads-user-id}/threads` | Threads posts docs, Updated Oct 30, 2026 |
| YouTube | "AI use" = Yes, label in player or expanded description | uploader, YouTube Studio upload flow, Attributes section | Not found in the pages fetched | YouTube Help 14328491, undated |
| LinkedIn | C2PA Content Credentials icon on image and video | carried by the file's metadata; no member setting described | Not applicable (a file property) | LinkedIn Help a6282984, "Last updated: 1 month ago" |
| dev.to | disclosure in post or tag `#ABotWroteThis` | author, in the article | Not found | dev.to guidelines, last edited 2023-01-09 |
| HN, SO | none: generated text is banned, not labelled | n/a | n/a | 3.4 |

A label never converts a banned action into an allowed one: X says AI replies that break rules are a violation "even if the content itself is helpful"; Threads says omitting `is_made_with_ai` "does not prevent automatic AI labeling", so the platform may label anyway.

### 3.4 Venue bans on generated or AI-edited text (this dive is the sole owner)

| Venue | Ban | Scope | Quote and date |
|---|---|---|---|
| Hacker News | Yes, including AI-edited text | posts and comments; also bans automated posting | "Don't post generated text or AI-edited text. HN is for conversation between humans." (no page date) |
| Stack Overflow | Yes, including drafting with an LLM | questions, answers, comments (content "crafted, in part or in whole") | "Please do not draft content for Stack Overflow using large language model (LLM) services as described above." (no page date extracted) |
| Product Hunt | Yes, comments | comments | "No LLMs or Chrome extensions please!" (2025-07-28) |
| mastodon.social, mastodon.online | Partial: disclosure required, AI-only accounts barred | all posts | "use of generative AI must be disclosed" and "Accounts may not solely post AI-generated content." (ToS effective 2026-08-31) |
| dev.to | Partial: disclosure required; no promotion by AI-assisted articles | articles | "Promote any business, program, or course (including your own)" is forbidden for AI-assisted posts (edited 2023-01-09) |
| X | No ban; labelled automation allowed | replies only if summoned | 2026-02-23 changelog |
| Lobsters | No LLM clause on the about page; self-promo limits apply to new accounts | submissions | 70-day rule on /about (undated) |
| Reddit, Discord, LinkedIn, YouTube, Bluesky, Threads, BetaList | No site-wide text ban found | but automation limits apply | see 3.2 |
| Other venues found | Reddit subreddit-level bans exist per the scout (r/selfhosted not fetched); a venue skill must read each subreddit's rules at run time | | not sourced here |

### 3.5 Credential custody

| Platform | Credential | Clause or doc on custody | Where it may live |
|---|---|---|---|
| X | OAuth keys and tokens | "You must keep all API keys or other access credentials private." [raw] and "You may not store X passwords" [raw]; at most 3 apps (dev, staging, production) of one service | Secret store of the publishing system (CI secret, vault); never in the repository |
| LinkedIn | access token and client secret | "Keep your Access Credentials secret." and "All activities that occur using your Access Credentials are your responsibility." [tool] | CI secret or vault; member tokens are personal and expire |
| YouTube | OAuth refresh token | tokens may be stored "as long as is necessary provided that those tokens are used only for purposes ..."; "use only industry-standard transport encryption" [tool] | secret store; scope-limited |
| Bluesky | app password (per tutorial) | "generate an app password for that account" [raw] | secret store; use an app password, never the main password |
| Discord | bot token, webhook URL (token embedded) | webhook object returns "the secure token of the webhook" [raw]; developer policy unfetched | secret store; a webhook URL is a bearer credential |
| Threads | access token with `threads_content_publish` | tokens obtained through the Threads access-token flow [raw, docs list "Get access tokens", "Long-lived tokens"] | secret store |
| Mastodon | access token | no clause fetched | secret store |

No fetched page states a policy sentence about repositories specifically. The rule "not in the repository" is a rule choice derived from "keep ... private" and "secret", not a quoted platform clause. It is a MUST by this dive's judgement.

### 3.6 Staleness: facts that moved in the last 12 months

Dated changes seen in this pass: X programmatic replies restricted (2026-02-23) and per-post pricing (changelog entry with April 20, 2026 effective link); Reddit User Agreement revised 2026-05-26 and effective 2026-07-01; Mastodon instance terms effective 2026-08-31; LinkedIn User Agreement effective 2025-11-03; Threads posts page updated 2026-10-30; YouTube developer policies updated 2026-11-06; LinkedIn Marketing version 202601 sunset 2027-01-15. A channel skill that quotes any of these without a date and a re-check window will be wrong within months. Vendor claim from a search result, not confirmed at a primary: Bluesky shipped an "automation label" in March 2026 (Leaflet blog post), while a SocialBee roundup updated 2026-10-26 lists it as in development; neither is a Bluesky page. Treat as contested (section Contested).

### 3.7 Scout claims that did not reproduce, or reproduced only in part

| Scout claim | Row | Result |
|---|---|---|
| "does an unverified project upload privately?" (YouTube, the question implies a private lock) | YS#17 | Not reproduced. The `videos.insert` page says "Videos uploaded from unverified API projects are not restricted to private viewing mode." and the upload guide says "You don't need an API Compliance Audit to upload public or unlisted videos." No calendar date on either page. The older Google rule (unverified projects created after 28 July 2020 locked private) is absent from the pages fetched; the pages disagree with it, so the skill must not assume the lock and must not assume its absence without reading the page at run time. |
| "do not automate posting and not to put generated text in posts" | LP#17 | Reproduces for the HN guidelines page. The HN FAQ page has no such clause. |
| X: auto-replies only when summoned since 2026-02-23 | MB#2 | Reproduced against the changelog. |
| X: post $0.015, with URL $0.20 | MB#1 | Reproduced as "$0.015 per post, and Posts containing a URL are $0.20 per Post"; the scout's "since 2026-04-16" date is not on the changelog line; the page links an update titled "effective April 20, 2026". Report the discrepancy: 2026-04-16 vs 2026-04-20. |
| Bluesky bots must self-label `bot` and interact only with users who tagged the bot | MB#3 | Reproduced from the atproto bot tutorial source. |
| Mastodon: "bot flag is visual only" | MB#3 | Reproduced: "Mastodon currently treats the bot flag as a visual indication only." |
| Threads 250 posts per rolling 24 h | MB#27 | Reproduced. |
| Bluesky app password for bots | MB#38 | Reproduced. |
| Lobsters 70-day limit and vibecoding tag | CM#13 | Reproduced: "New users (first 70 days) are not allowed to submit self-promo", `vibecoding` among restricted tags. |
| LinkedIn "Help LinkedIn a1341387" prohibits automation and extensions | LO#13/14 | Reproduced only as a paraphrase (the tool declined to quote); no calendar date, "Last updated: 2 years ago". |
| Reddit r/selfhosted rules | CM#14 | Not reproduced: still unfetchable (403). |

### 3.8 Secret scan of the fleet

- Fleet definition used: the 17 directories under `/home/mherwig/dev/ocx-sh/` (12) and `/home/mherwig/dev/grimoire-rs/` (5). `ls /home/mherwig/dev/ocx-sh | wc -l` gave 12, `ls /home/mherwig/dev/grimoire-rs | wc -l` gave 5; the loop printed `repos=17`. `.git`, `node_modules`, `target`, `.venv`, `dist` and `.agents/worktrees` were excluded from the copy, so history was not scanned.
- Tool and version: gitleaks v8.30.1 (`docker run --rm zricethezav/gitleaks:latest version`), `detect --no-git`, default rules via `[extend] useDefault = true` plus custom rules `discord-webhook-url`, `discord-bot-token-shape`, `google-oauth-refresh-token`. The default ruleset covers `linkedin-client-id`, `linkedin-client-secret`, `twitter-*` and `discord-*` keys.
- Result: 317 total findings (all rules) in 1.23 GB scanned: generic-api-key 251, stripe-access-token 35, private-key 14, sourcegraph-access-token 7, jwt 4, curl-auth-header 2, curl-auth-user 1, github-app-token 1, github-pat 1, gitlab-pat 1. **Publishing-token findings: 0** (zero from the LinkedIn, X/Twitter, Discord webhook, Discord bot, Google OAuth refresh and generic Discord rules). The 317 are other secret classes and were not triaged (outside the commission; many `generic-api-key` hits are likely lockfile hashes or fixtures).
- Placeholder check: `grep -rIl -E "discord(app)?\.com/api/webhooks/[0-9]+"` found 2 files, both in `ocx-mirror` test material (`tests/fixtures/mirror-r3-discord-url.yml`, `crates/ocx_mirror_spec/src/tests/notify.rs`); the matched strings are `.../webhooks/1234/token` and `.../webhooks/1234567890/secrettoken`, fake values that the length-bound rule correctly ignores. This means the fleet legitimately holds Discord-webhook-shaped strings in tests, so the check must allow named fixture paths.
- A first run with the same copy (322 findings) failed to write its report because the scratch directory was cleaned by another process; the numbers above come from the second run. The first run's copy also lacked the `--exclude=dist` flag and its `www-setup` directory vanished mid-scan, which probably explains the difference of 5 findings (322 vs 317); this is a guess, not verified.
- Limits: `--no-git` skips history, so a token deleted in a past commit is not detected; a `.git` history scan (`gitleaks detect` without `--no-git`) is the extension.

## Normative guidance candidates

Severity key: MUST, SHOULD, CONSIDER. Each rule has a rationale and a verification an agent or reviewer can run.

1. **MUST: the agent never posts, replies, submits or pays on a public channel by itself. It produces a draft package and a human performs the action.** Rationale: the shape that all fetched platforms either require (YouTube "prior specific and express consent"), prefer (LinkedIn 8.2), or restrict (X, HN). Verification: grep the repository's publishing workflows and skills for calls to a write endpoint without a preceding human-approval step: `rg -n "POST /2/tweets|api.linkedin.com/rest/posts|threads_publish|com.atproto.repo.createRecord|videos.insert|webhooks/" --glob '!**/tests/**' .` must return only files that also contain a named approval gate (an `environment:` with required reviewers in the workflow, or a `human_approved:` input). Platform exceptions are named in rule 2.
2. **MUST: name the exceptions to rule 1, and nothing else.** Rationale: an unlisted exception is an unreviewed permission; each listed one rests on a platform clause that allows labelled automation (X [developer guidelines](https://docs.x.com/developer-guidelines.md), last-modified 2026-11-27; [atproto bot tutorial](https://atproto.com/guides/bot-tutorial), no date; [Threads docs](https://developers.facebook.com/docs/threads/posts), Oct 30, 2026; [mastodon.social rules](https://mastodon.social/api/v1/instance/rules), ToS 2026-08-31; [Discord guidelines](https://discord.com/guidelines), 2025-09-29). A human-approved, labelled, scheduled bot is permitted only on X (Automated label, bio disclosure, link to a human-managed account, summoned replies only), Bluesky (profile `bot` self-label, replies only to accounts that tagged the bot), Threads (`is_made_with_ai=true` where AI-generated), Mastodon (disclosure per instance rule 6), and Discord (bot application or webhook, never a self-bot). Verification: a table in the channel skill with one row per platform, each cell quoting the clause and its date; a lint rejects a platform not in the table.
3. **MUST: for HN, Stack Overflow, Product Hunt comments and Lobsters, the agent output is a fact sheet and an outline marked "human rewrites", never paste-ready prose.** Rationale: HN bans "generated text or AI-edited text", Stack Overflow bans drafting with an LLM, Product Hunt bans LLM comments, Lobsters restricts self-promotion and bars new users (first 70 days) from self-promo ([Lobsters about](https://lobste.rs/about), no date on page, fetched 2026-11-27). Verification: reading heuristic. Pass: a bulleted list of verifiable facts (version, install command, repository URL, benchmark with its command, known limits, the maker's own stated motive left blank for the human), under a heading "Fact sheet, human writes the post". Fail: any paragraph written in first-person marketing voice, any title ready to paste, any "comment you can post". A test greps the HN deliverable for `^## ` lines other than the fact-sheet headings and for sentences starting with "I " or "We ".
4. **MUST: a Stack Overflow deliverable is not produced at all.** Rationale: the policy bars drafting with an LLM, not only posting. Verification: the channel skill refuses the venue with the quoted clause; `rg -il "stackoverflow" <outputs>` shows no draft answer files.
5. **MUST: every X publishing path declares its account as automated and carries the "Automated" label, a bio disclosure naming the operator, and a link to a human-managed account.** Rationale: X developer guidelines list them as requirements for automated accounts. Verification: `curl` profile read or a manual screenshot recorded in the launch plan; the plan lists three checked boxes with the date checked.
6. **MUST: every X reply path is gated on a summon.** Rationale: since 2026-02-23 programmatic replies are allowed only when the original author mentioned or quoted the account. Verification: workflow lint: any `POST /2/tweets` call with `reply` set must be triggered by a mention event (`dm`/`mentions` webhook) and not by a keyword search or schedule.
7. **MUST: every Bluesky bot account has the `bot` self-label and replies only to accounts that tagged it.** Rationale: the atproto bot tutorial states opt-in or spam flag. Verification: `GET app.bsky.actor.getProfile` and check the `labels` array contains `bot`; workflow lint for replies keyed to mentions only.
8. **MUST: for Threads, AI-generated text or media carries `is_made_with_ai=true` on the container-creation call, not on the publish call.** Rationale: only the creation call sets the label. Verification: `rg -n "is_made_with_ai" .` in the publisher, and a test that the field appears in the `/threads` request and not in `/threads_publish`.
9. **MUST: for YouTube uploads of realistic AI-generated or meaningfully altered content, set "AI use = Yes" in YouTube Studio.** Rationale: YouTube requires disclosure for realistic synthetic content and for music as the main focus; script, title, thumbnail, caption and own-voice cloning assistance does not need it. Verification: reading heuristic with the four-item list; a checkbox in the upload checklist.
10. **MUST: no publishing credential is stored in a repository, a skill or an issue.** Rationale: X "keep all API keys or other access credentials private" and LinkedIn "Keep your Access Credentials secret". Verification: the secret-scan command below must exit 0 with zero hits for the five named rule IDs.
11. **MUST: a LinkedIn agent never automates activity on the site (connection requests, messages, likes, reposts, scraping) and never uses browser automation.** Rationale: User Agreement 8.2 and Help a1341387 ban bots and third-party automation; consequence is account restriction. Verification: `rg -n -i "playwright|puppeteer|selenium|linkedin.*(scrape|autolike|auto-connect)" .` returns nothing in channel workflows.
12. **SHOULD: LinkedIn posts are published only through an approved integration (Posts API `w_member_social` or `w_organization_social`) initiated by the human who owns the account.** Rationale: the API exists and is documented, but the API Terms bar automating posting. Verification: the skill records which integration, which scope, and who clicked publish.
13. **MUST: the agent never decides spend.** Rationale: ads, boosts and metered API calls are spend decisions. Verification: any publishing workflow that can call a paid endpoint declares a spend cap in config; an X publish step declares URL count and cap (a post with a URL costs $0.20 vs $0.015 per the [X API changelog](https://docs.x.com/changelog) entry dated Apr 16, 2026, effective April 20, 2026; re-check within 30 days per rule 14).
14. **MUST: every platform fact in the channel skill carries a source URL, the date the source states (or "no date on page"), and a re-check-by date; the skill refuses a fact past its re-check date.** Rationale: 3.6 shows seven dated changes in under 12 months. Verification: lint over the skill's facts table: each row has `url`, `source_date`, `fetched`, `recheck_by`; fail if `recheck_by < today`. Default windows: policy and API terms 90 days; limits and prices 30 days.
15. **MUST: a venue skill reads the venue's current rules in the same session before drafting for Reddit subreddits, and stamps the fetch date on the output.** Rationale: Reddit and subreddit rules were unfetchable in this pass and differ per community. Verification: output file starts with `rules_fetched: <date> <url>`.
16. **SHOULD: keep a single `channels.yml` registry listing every organisation channel (platform, handle, owner, automated: yes/no, label set: yes/no, credential location, last-reviewed date) and fail the lint when a handle in `README`, website or workflows is not in it.** Rationale: the commission asks how the channel list stays current; a registry with a review date makes drift visible. Verification: `rg -o "(linkedin.com/(company|in)/[^ )\"]+|x.com/[A-Za-z0-9_]+|bsky.app/profile/[^ )\"]+|youtube.com/@[^ )\"]+|discord.gg/[A-Za-z0-9]+)"` over the repository, diffed against the registry.
17. **MUST: stop and ask a human where a rule above says "human decides" (section "What an agent must not decide alone").** Rationale: those items are binding agreements, spend, brand voice and legal disclosure, which no platform page lets an agent settle (the [LinkedIn API Terms](https://www.linkedin.com/legal/l/api-terms-of-use), revised December 13th, 2022, make the developer responsible for all activity under its access credentials). Verification: the skill's Asks list exists and each item is traceable to this file.
18. **SHOULD: schedule only through a tool the human operates, with the draft file as the single source.** Rationale: Bluesky has no native scheduler (scout lead, not re-fetched); Threads allows 250 posts per rolling 24 h ([Threads posts docs](https://developers.facebook.com/docs/threads/posts), Updated Oct 30, 2026). Verification: a draft file per post with `status: approved`, `approved_by`, `approved_at`.
19. **CONSIDER: treat a Discord webhook URL as a bearer credential and keep it out of repositories, with a named allow-list for test fixtures.** Rationale: the webhook object carries "the secure token". Verification: secret-scan custom rule `discord-webhook-url` with `[allowlist] paths = ['''tests/fixtures/''']`.
20. **MUST: never use an AI label to excuse a banned action.** Rationale: X states violations are violations "even if the content itself is helpful". Verification: reviewer checks that rule 3 and rule 4 outputs contain no paste-ready text regardless of labels.

### The exact MUST list for the channel-publishing rule

1. Agent drafts; a named human posts, replies, submits and pays (rule 1).
2. Exceptions only for X, Bluesky, Threads, Mastodon and Discord, each with its labels and gates (rules 2, 5, 6, 7, 8).
3. YouTube AI-use disclosure set for realistic synthetic content (rule 9).
4. No credentials in the repository (rule 10), checked by the scan below.
5. No automation of LinkedIn activity, no browser automation of any channel (rule 11).
6. Fact sheet only on the venues in the list below (rules 3, 4).
7. Every platform fact dated with a re-check date (rule 14).
8. No spend decision by the agent (rule 13).

### Venues where the agent produces a fact sheet only, never paste-ready text

Hacker News (posts and comments, both), Stack Overflow (the agent produces nothing, not even a fact sheet for a question; at most a list of cited sources for the human), Product Hunt comments, Lobsters (self-promotion, as a precaution because the venue weights author-written submissions and restricts new accounts), Reddit (default until the subreddit's rules are read in the same session), dev.to promotional articles (AI-assisted articles must not promote a business, program or course). Mastodon, Threads, Bluesky and X may receive agent-drafted text subject to the label rules.

### The secret-scan check that a repository holds no publishing credentials, including Discord webhook URLs

```toml
# gitleaks-publish.toml
title = "publishing tokens"
[extend]
useDefault = true            # includes linkedin-client-*, twitter-*, discord-*, gcp-api-key
[[rules]]
id = "discord-webhook-url"
regex = '''https://(?:ptb\.|canary\.)?discord(?:app)?\.com/api/(?:v\d+/)?webhooks/\d{17,20}/[A-Za-z0-9_\-]{60,80}'''
keywords = ["webhooks"]
[[rules]]
id = "discord-bot-token-shape"
regex = '''[MNO][A-Za-z\d_-]{23,25}\.[A-Za-z\d_-]{6}\.[A-Za-z\d_-]{27,38}'''
[[rules]]
id = "google-oauth-refresh-token"
regex = '''\b1//[0-9A-Za-z_\-]{40,}'''
[allowlist]
paths = ['''tests/fixtures/''']   # fake placeholders only; reviewed per repository
```

Command (CI and local): `gitleaks detect --source . -c gitleaks-publish.toml --redact --exit-code 1` for history, plus `gitleaks detect --no-git --source . -c gitleaks-publish.toml --redact --exit-code 1` for the working tree. Pass: exit 0. Fail: any finding with `RuleID` in `discord-webhook-url`, `discord-bot-token-shape`, `google-oauth-refresh-token`, `linkedin-client-id`, `linkedin-client-secret`, or starting `twitter-`. Measured on the fleet (3.8): 0 such findings. The Bluesky app-password shape (`xxxx-xxxx-xxxx-xxxx`) and LinkedIn access-token shape were not added to the measured rule set; a pattern for them would produce false positives on arbitrary four-group strings and was left out on purpose, so those two credential types rely on the generic-api-key rule and on the environment-variable naming rule: workflows reference secrets only as `${{ secrets.X }}` or `$ENV`.

## Dated facts

Source type: P = platform or authority itself, I = independent study, V = vendor data.

| Fact | URL | Date the source states | Type |
|---|---|---|---|
| HN: "Don't post generated text or AI-edited text." and "please don't automate posting." | https://news.ycombinator.com/newsguidelines.html | no date on page; fetched 2026-11-27 | P |
| Show HN: "Don't post quickly-generated one-offs; anybody can do that now." | https://news.ycombinator.com/showhn.html | no date on page | P |
| Stack Overflow bans generative AI content and LLM drafting | https://stackoverflow.com/help/gen-ai-policy | no date extracted | P |
| LinkedIn User Agreement: bots banned | https://www.linkedin.com/legal/user-agreement | Effective November 3, 2025 | P |
| LinkedIn API Terms: no automating posting; keep credentials secret | https://www.linkedin.com/legal/l/api-terms-of-use | Last revised December 13th, 2022 | P |
| LinkedIn Posts API permissions and DRAFT state; version 202601 sunset | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api | ms.date 2026-05-07; sunset January 15, 2027 | P |
| LinkedIn Content Credentials icon | https://www.linkedin.com/help/linkedin/answer/a6282984 | "Last updated: 1 month ago" at 2026-11-27 | P |
| YouTube API policy: no automated uploads without consent | https://developers.google.com/youtube/terms/developer-policies | Last updated 2026-11-06 UTC | P |
| YouTube ToS automated access | https://www.youtube.com/static?template=terms&gl=US&hl=en | Effective December 15, 2023 | P |
| YouTube unverified-project uploads not private; 1 unit per `videos.insert` in the Video Uploads bucket | https://developers.google.com/youtube/v3/docs/videos/insert | no date | P |
| YouTube AI-use disclosure | https://support.google.com/youtube/answer/14328491 | no date | P |
| X programmatic replies only when summoned | https://docs.x.com/changelog | Feb 23, 2026 | P |
| X posting prices | https://docs.x.com/changelog | changelog entry between Mar 20 and Feb 6, 2026 items; linked update says effective April 20, 2026 | P |
| X automated-account requirements | https://docs.x.com/developer-guidelines.md | last-modified header 2026-11-27 | P |
| Bluesky community guidelines | https://bsky.social/about/support/community-guidelines | Last Updated: September 19, 2025 | P |
| Bluesky bot tutorial: self-label, app password, opt-in interaction | https://atproto.com/guides/bot-tutorial | no date | P |
| Mastodon.social rule 6 on generative AI | https://mastodon.social/api/v1/instance/rules | ToS effective 2026-08-31 | P |
| Mastodon bot flag visual only | https://docs.joinmastodon.org/user/profile/ | no date | P |
| Threads 250 posts per 24 h; `is_made_with_ai` | https://developers.facebook.com/docs/threads/posts | Updated Oct 30, 2026 | P |
| Reddit User Agreement | https://redditinc.com/policies/user-agreement | Effective July 1, 2026; Last Revised May 26, 2026 | P |
| Lobsters 70-day self-promo ban | https://lobste.rs/about | no date | P |
| dev.to AI-assisted articles | https://dev.to/devteam/guidelines-for-ai-assisted-articles-on-dev-17n6 | Posted Dec 19, 2022; edited Jan 9, 2023 | P |
| Product Hunt "No LLMs" | https://help.producthunt.com/en/articles/10030102-commenting-guidelines | July 28, 2025 | P |
| Discord Community Guidelines: no self-bots | https://discord.com/guidelines | Effective September 29, 2025 | P |
| Discord webhook token is secure | https://discord.com/developers/docs/resources/webhook | no date | P |

## What an agent must not decide alone

- Which channels the organisation uses at all, and whether to open a new account (business and brand decision).
- Whether a product qualifies for a launch (Show HN, Product Hunt, BetaList) and on which day; what the maker's own motive and story are.
- Whether to disclose a commercial relationship or a material connection in a post (legal; marketing sub-program owns standards).
- Any spend: API credits, ads, boosts, sponsorships, paid listings.
- Whether to respond to a critical public comment, a security report posted in public, a journalist, or a legal or takedown notice.
- Which account speaks: the company page, a founder's profile, a maintainer's profile. An agent never writes in a named person's voice for publication without that person's review.
- Whether an agent-run account is labeled as automated and what its bio says (brand and platform-compliance decision).
- Accepting platform terms, creating developer apps, or applying for API access (these are binding agreements).
- Responding to a platform enforcement action, an account restriction or a suspension.
- Whether to post to a venue that bans AI text at all, given the ban is a community norm the maker must honour in their own words.

## AI-agent angle

| Typical agent mistake | Mechanical check |
|---|---|
| Drafts a paste-ready Show HN title and first comment | Rule 3 grep and reading heuristic on HN deliverables |
| Assumes unverified YouTube projects can only upload private videos, or the reverse, from memory | Skill reads the live `videos.insert` page and the audit page; fact table has `recheck_by` |
| Schedules an X reply bot that answers anyone discussing a keyword | Workflow lint on rule 6 (summon-only) |
| Sets the AI label on the Threads publish call instead of the container call | Test for `is_made_with_ai` placement (rule 8) |
| Writes a plain Bluesky password into a workflow | gitleaks plus env-name rule; use an app password |
| Treats a LinkedIn browser-automation or scraping tool as acceptable because it "works" | Rule 11 grep |
| Treats the label as a licence ("it is labelled AI, so it is allowed") | Rule 20 |
| Quotes an old fact (the pre-2026 X free tier, the old YouTube lock) with no date | Rule 14 date lint |
| Invents the clause text for a platform page it could not fetch (Reddit RBP, PH ToS, Discord policy) | Facts table marks `fetched: false`; skill refuses to draft against unfetched rules |
| Posts the same text to X, Bluesky and Mastodon | X policy: "Never post identical or substantially similar content across multiple accounts"; lint for identical text across accounts per run |

## Contested / evolving

- **LinkedIn API posting vs. the API Terms.** The Posts API publishes organic posts on behalf of a member or an organization ([Microsoft Learn, 2026-05-07](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api)), while the API Terms list "Use the Content or the APIs to automate posting on the LinkedIn Services" among prohibited acts (revised 2022-12-13; [terms](https://www.linkedin.com/legal/l/api-terms-of-use)) [tool]. The two coexist; the reconciliation (human-initiated, approved-partner tools) is my reading, not a LinkedIn statement. This dive decides: human posts.
- **YouTube private lock for unverified API projects.** The scout implies it; the current Google pages say it does not apply (3.7). Trend: Google rules change by audit status, re-read at run time.
- **Bluesky automation label.** Third-party claim of a March 2026 launch ([Leaflet post](https://astral100.leaflet.pub/3mijhh4wyze2u)) vs. a roundup listing it as in development ([SocialBee, updated 2026-10-26](https://socialbee.com/blog/bluesky-news/)); the official atproto tutorial still says only the `bot` self-label. Neither claim was read at a Bluesky page. Trend: expect a native automated-account flag.
- **dev.to AI policy.** The primary page read is from 2023; a third-party mirror describes a newer tiered revision. Trend: stricter with disclosure tiers. A skill must re-fetch dev.to's guideline before any dev.to draft.
- **X AI replies.** The guidelines say AI-generated replies need no written approval; the changelog says programmatic replies are limited to summoned ones to "reduce automated, low-quality replies". Consistent only if both are applied: AI replies allowed, within the summon gate. Enterprise access is unaffected per the changelog.
- **Reddit pre-approval of API access.** Only secondary sources say new OAuth tokens need pre-approval; the policy page was not fetchable. Unresolved.
- **HN AI-edited text.** HN bans "AI-edited text" without defining a threshold (spell-check vs. rewrite). Position here: any LLM rewrite counts; the skill does not try the line.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://news.ycombinator.com/newsguidelines.html | HN guidelines (primary) | no date | the AI and automation bans |
| https://news.ycombinator.com/newsfaq.html | HN FAQ (primary) | no date | no bot clause; promotion penalties |
| https://news.ycombinator.com/showhn.html | Show HN rules (primary) | no date | launch eligibility |
| https://stackoverflow.com/help/gen-ai-policy | Stack Overflow generative AI policy (primary) | no date | drafting ban |
| https://www.linkedin.com/legal/user-agreement | LinkedIn User Agreement (primary) | effective 2025-11-03 | bot clause |
| https://www.linkedin.com/help/linkedin/answer/a1341387 | LinkedIn prohibited-software help (primary) | "2 years ago" | automation and extensions |
| https://www.linkedin.com/legal/l/api-terms-of-use | LinkedIn API Terms (primary) | 2022-12-13 | credentials and posting automation |
| https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api | LinkedIn Posts API docs (primary) | 2026-05-07 | permissions, DRAFT state |
| https://www.linkedin.com/help/linkedin/answer/a6282984 | LinkedIn Content Credentials (primary) | 2026 | AI label mechanism |
| https://developers.google.com/youtube/terms/developer-policies | YouTube API Developer Policies (primary) | 2026-11-06 | consent clause |
| https://www.youtube.com/static?template=terms&gl=US&hl=en | YouTube ToS (primary) | 2023-12-15 | automated access |
| https://developers.google.com/youtube/v3/docs/videos/insert | YouTube `videos.insert` (primary) | no date | quota and visibility |
| https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits | YouTube quota and audits (primary) | no date | audit scope |
| https://support.google.com/youtube/answer/14328491 | YouTube GenAI disclosure (primary) | no date | label rule |
| https://docs.x.com/developer-terms/policy | X Developer Policy (primary) | 2026-11-27 | credentials, automation |
| https://docs.x.com/developer-guidelines.md | X developer guidelines (primary) | 2026-11-27 | automated-account requirements |
| https://docs.x.com/changelog | X API changelog (primary) | 2026 | reply restriction, pricing |
| https://bsky.social/about/support/community-guidelines | Bluesky community guidelines (primary) | 2025-09-19 | spam and manipulation |
| https://bsky.social/about/support/tos | Bluesky ToS (primary) | 2025-08-14 | no automation clause |
| https://atproto.com/guides/bot-tutorial | atproto bot tutorial (primary) | no date | self-label, app password |
| https://mastodon.social/api/v1/instance/rules | mastodon.social rules (primary) | 2026-11-27 | generative AI disclosure |
| https://mastodon.online/api/v1/instance/rules | mastodon.online rules (primary) | 2026-11-27 | same text |
| https://docs.joinmastodon.org/user/profile/ | Mastodon profile docs (primary) | no date | bot flag semantics |
| https://developers.facebook.com/docs/threads/posts | Threads posts docs (primary) | 2026-10-30 | label and rate limit |
| https://redditinc.com/policies/reddit-rules | Reddit Rules (primary) | no date | authenticity and spam |
| https://redditinc.com/policies/user-agreement | Reddit User Agreement (primary) | 2026-05-26 | bots and scraping |
| https://lobste.rs/about | Lobsters about (primary) | no date | 70-day rule |
| https://dev.to/devteam/guidelines-for-ai-assisted-articles-on-dev-17n6 | dev.to AI guidelines (primary) | 2023-01-09 | disclosure, no promotion |
| https://dev.to/code-of-conduct | DEV Code of Conduct (primary) | 2023-07-31 | context |
| https://help.producthunt.com/en/articles/10030102-commenting-guidelines | Product Hunt commenting (primary) | 2025-07-28 | LLM comments ban |
| https://betalist.com/terms | BetaList Terms (primary) | no date | no automation clause |
| https://discord.com/guidelines | Discord Community Guidelines (primary) | 2025-09-29 | self-bots |
| https://discord.com/developers/docs/resources/webhook | Discord webhook resource (primary) | no date | webhook token |
| https://astral100.leaflet.pub/3mijhh4wyze2u | Leaflet post on a Bluesky automation label (secondary, unverified) | 2026 | contested label |
| https://socialbee.com/blog/bluesky-news/ | SocialBee roundup (vendor data) | updated 2026-10-26 | contested label |
| https://simonwillison.net/2026/Sep/27/bluesky-bot-check/ | Independent tool post on Bluesky bot detection | 2026-09-27 | reply-bot patterns exist, no label statement |
