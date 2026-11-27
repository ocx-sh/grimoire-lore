---
title: "Hacker News contract for a tool announcement: Show HN, solicitation, reposts, ranking, timing, Launch HN"
program: product
sub_program: channels
topic: channel-communities
worker: com-hn-contract
date_researched: 2026-11-27
model: sonnet
sources_fetched: 15
scope: "Hacker News only. Covers Show HN eligibility and title, URL versus text, vote solicitation, reposts and the second-chance pool, the published ranking text, a re-run and extension of the Show HN measurement (75,929 posts), timing, and Launch HN. The HN ban on generated or AI-edited text is owned by core-agent-action-boundary and is only cited. Reddit, Lobsters, Discord and other venues belong to sibling dives."
---

# Hacker News contract for a tool announcement

## Contents
1. Summary
2. Findings (1 Show HN gate, 2 title, 3 URL vs text, 4 solicitation, 5 reposts and second-chance pool, 6 ranking, 7 measurement, 8 timing, 9 Launch HN, 10 account and maker)
3. Normative guidance candidates
4. Dated facts
5. What an agent must not decide alone
6. AI-agent angle
7. Contested / evolving
8. Sources

## Summary
- HN's own pages carry no date. Every HN page rule below is "as fetched 2026-11-27"; the only dated statements are moderator comments (cited by item and date).
- A Show HN must be something a stranger can run or hold now. Blog posts, sign-up pages, newsletters, lists, landing pages, fundraisers are off topic. Gate every draft on "can a stranger run it today without an account".
- Routine releases ("Foo 1.3.1 is out") are generally not Show HN material; a major overhaul is "probably ok". A moderator adds: a new release only if significantly different, and a repost-as-Show-HN "should probably only happen once or twice a year".
- The maker must be the person who worked on it and be around to discuss. An agent cannot satisfy this; a named human with coverage hours must.
- Title must begin "Show HN". HN's title rules: no uppercase or exclamation points to stand out, no "how great", drop the site name, drop gratuitous numbers, no editorializing.
- A link in a text submission is not possible (FAQ). Moderator advice (2019-12-24): "Posts without URLs get penalized"; submit the link, put the story text in. Measured: text posts do slightly worse (1.2% reach 100 points vs 2.1% overall).
- "Don't solicit upvotes, comments, or submissions" applies to any channel. The FAQ says HN penalizes or bans submissions, accounts and sites that do it. Plans must contain no vote-asking step in team chat, newsletter, release notes, README or social posts.
- Reposting: "a small number of reposts is ok" only if no significant attention in the last year or so; never delete and repost. The sanctioned retry is the second-chance pool via hn@ycombinator.com or a moderator's repost invite.
- HN publishes only "points divided by a power of the time since submission" plus flags, anti-abuse software, overheated-discussion demotion, account/site weighting and moderator action. No formula; rank cannot be derived from votes and time.
- Measured over 2024-11-27 to 2026-11-27: 75,929 Show HN posts; median 2 points, median 0 comments; 62.2% have zero comments; 2.1% reach 100 points. The scout's 75,943 reproduces within 14 posts.
- Title patterns, URL types and weekday barely move outcomes. Project-type words move them more (Rust/Go/Zig 3.1%, open source 3.4% vs 2.1% base; AI/LLM/agent 1.2%).
- A maker top-level comment shows no benefit in a 3,909-post random sample (1.5% vs 2.0% reaching 100 points within 60 minutes). Do not claim that a first comment lifts rank; claim only that HN moderators ask for the backstory text.
- Timing: weekday vs weekend does not matter (2.0% vs 2.2%). Hour of day does: 14:00-18:59 UTC 2.5% (n=26,137) vs 06:00-10:59 UTC 1.2% (n=11,273), z=8.0, same sign in both halves of the window. It is correlational (audience and competing-volume confounded), so the surviving advice is only "avoid 06-10 UTC", not "post at 16:00".
- Launch HN is for YC startups only, one per startup, curated by the HN team. A non-YC team has no slot; it gets only the writing advice.
- Username must be a person, not the company or project (moderator tips, item 22336638). Source of the account contract for the maker.
- Generated or AI-edited text in posts and comments is banned. Owned by core-agent-action-boundary; this dive cites the clause only (newsguidelines, no date).

## Findings

### 1. Show HN eligibility
Fetched 2026-11-27 from [showhn.html](https://news.ycombinator.com/showhn.html) (page states no date; platform itself):
- "Show HN is for something you've made that other people can play with."
- On topic: things people can run on their computers or hold in their hands; hardware by video or detailed article; books by sample chapter.
- Off topic: blog posts, sign-up pages, newsletters, lists, other reading material ("Those can't be tried out").
- Project must be non-trivial; "Don't post quickly-generated one-offs; anybody can do that now."
- "The project must be something you've worked on personally and which you're around to discuss."
- "Please make it easy for users to try your thing out, ideally without barriers such as signups or emails." "If your work isn't ready for users to try out, please don't do a Show HN... Don't post landing pages or fundraisers."
- "New features and upgrades ('Foo 1.3.1 is out') generally aren't substantive enough to be Show HNs. A major overhaul is probably ok."
- "Please don't ask friends to upvote or comment."
- Every Show HN appears on shownew; after a "small points threshold" it appears on the show page.

Moderator tips linked from that page ([item 22336638](https://news.ycombinator.com/item?id=22336638), posted 2020-02-15 by dang, edited 2026-03-28), platform itself:
- Put "Show HN" in the title only if "there's a way to try it out"; "It can't just be a landing page or market test or fundraiser or a blog post or a curated list or other reading material."
- Text should give the backstory and what is different; "Drop any language that sounds like marketing or sales."
- "Don't have your username be that of your company or project."
- "Make sure your friends and users do not add booster comments."
- "You can post a new release as a Show HN only if the new version is significantly different... If you do repost, add a comment linking to the previous Show HN and explaining what is different from last time. This should probably only happen once or twice a year."
- Edit 2026-03-28: write the text by hand, no LLM (not even editing). Owned by core-agent-action-boundary; do not re-derive.

An email signup is not a Show HN: moderator, [item 10521976](https://news.ycombinator.com/item?id=10521976), 2015-11-06.

Applied to a tool such as a CLI or VS Code extension: eligible if installable without an account today and not a patch release; a docs site, README-only repo, waitlist or release-notes page is not.

### 2. Title rules
From [newsguidelines.html](https://news.ycombinator.com/newsguidelines.html), fetched 2026-11-27 (no page date): do not make titles stand out with uppercase or exclamation points or by saying how great something is; remove the site name; remove gratuitous numbers; otherwise use the original title unless misleading or linkbait; do not editorialize; append [video] or [pdf]. showhn.html: title begins "Show HN". Neither page states a length limit; no length check is justified from HN pages. (The 80-character limit in yli.html is for Launch HN only, see 9.)

Measured (command in 7): 74,826 of 74,897 mature posts begin "Show HN" (the other 71 do worse: 0% reach 50 points, median 1 comment). 74,733 use the colon form "Show HN:"; 9 use a dash form. Titles with "!" (n=62): 0 reach 100 points vs 2.1% base. Titles over 80 characters (n=56): 0 reach 50 points. Titles with all-caps word of 4+ letters (n=4,300): 2.8% reach 100, no penalty visible (the all-caps rule is a guideline, not a ranking fact; this regex also catches acronyms).

### 3. URL versus text
- [FAQ](https://news.ycombinator.com/newsfaq.html): to submit text, leave the URL blank; "You can't" make a link in a text submission, "just submit the link, then add a regular comment."
- Moderator, [item 21874086](https://news.ycombinator.com/item?id=21874086), 2019-12-24: "Posts without URLs get penalized, so you'd be better off posting this with a link, then adding your text as a first comment." Moderator tips (2020, edited 2026) say the submission text should show up at the top; "if for some reason it doesn't, add it as a first comment."
- Measured: text posts 1.2% reach 100 points (n=3,792) vs GitHub repo root 2.6% (n=23,718), other sites 1.9% (n=44,381), video 0.7% (n=408).
- The Show HN "link must be runnable" corollary: the URL should be the thing (repo with install, demo, download), not a marketing page.

### 4. Vote solicitation
- Guidelines: "Don't solicit upvotes, comments, or submissions. Users should vote and comment when they run across something they personally find interesting--not for promotion."
- FAQ ("Can I ask people to upvote my submission?"): "No... We penalize or ban submissions, accounts, and sites that break this rule." Comments likewise: HN readers "will detect it, flag it, and use unkind words like 'spam'."
- Moderator [item 10521976](https://news.ycombinator.com/item?id=10521976) (2015-11-06): "voting rings (e.g. asking friends to upvote a post) are not allowed here. We ban accounts and sites that do this."
- Moderator [item 7543910](https://news.ycombinator.com/item?id=7543910) (2014-04-07): a ring detector "got" a post; "It's sadly common for a great Show HN post to get demoted because its creators... tried to game it." Historical, but consistent with the current FAQ.
- The pages name no channels (team chat, newsletter, README badge). Extending the rule to those is a derived decision: the rule is on the act of asking, regardless of channel. Treat as MUST for team-controlled channels.

### 5. Reposts and the second-chance pool
- [FAQ](https://news.ycombinator.com/newsfaq.html): "If a story has not had significant attention in the last year or so, a small number of reposts is ok. Otherwise we bury reposts as duplicates. Please don't delete and repost the same story."
- Moderator [item 7543910](https://news.ycombinator.com/item?id=7543910) (2014-04-07): "a couple of reposts is ok... we penalize accounts for reposting too much."
- Pool: [item 26998308](https://news.ycombinator.com/item?id=26998308) (dang, 2021-04-30): moderators and a small number of reviewers pick old submissions; software randomly lobs one onto the lower front page. Anyone can email hn@ycombinator.com about an overlooked submission; "It's fine if it's your own article, but we like it better when it's just something you've run across." Moderators also email "repost invites"; invited reposts all enter the pool. Put an email in the profile for invites. The live list is at [news.ycombinator.com/pool](https://news.ycombinator.com/pool) (fetched 2026-11-27).
- Example, [item 45294776](https://news.ycombinator.com/item?id=45294776) (2025-09-18): a moderator put a Show HN in the pool.
- Repost invite wait, [item 43710636](https://news.ycombinator.com/item?id=43710636) (2025-04-16): wait "a week or so" before using the invite, "to give the hivemind cache time to clear"; the repost then goes in the pool.
- Show HN repost: link the previous Show HN and say what changed; once or twice a year at most (item 22336638).

### 6. Published ranking description
[FAQ](https://news.ycombinator.com/newsfaq.html), fetched 2026-11-27, no date on page: "The basic algorithm divides points by a power of the time since a story was submitted. Comments in threads are ranked the same way. Other factors affecting rank include user flags, anti-abuse software, demotion of overheated discussions, account or site weighting, and moderator action." The FAQ also says "You can't derive rank from votes and time alone." No exponent, no thresholds, no time-of-day factor are published. Any "formula" in blogs is a claim about an older public source dump, not the current system.

### 7. Measurement (re-run and extension)
All figures reproduced from the Algolia HN API on 2026-11-27; the API data is a platform dataset. Algolia docs at [hn.algolia.com/api](https://hn.algolia.com/api) could not be fetched (JavaScript-rendered; the fetch returned only the page title). Behavior was verified by request: one query returns at most 1,000 hits and says so ("you can only fetch the 1000 hits for this query"), so the script splits by created_at_i windows.

Commands (scripts in session scratchpad; logic described fully):
```
# fetch: one request per UTC day, split recursively when nbHits>1000
GET https://hn.algolia.com/api/v1/search_by_date?tags=show_hn&hitsPerPage=1000
    &numericFilters=created_at_i>=LO,created_at_i<HI
# window 1732709882 (2024-11-27T12:18Z) to 1795781882 (2026-11-27T..)  -> 75,929 posts
# analysis excludes posts under 7 days old (points not matured) -> n=74,897
# maker comment: 4,000-post random sample (seed 20261127) of the mature set
GET .../search_by_date?tags=comment,story_<ID>,author_<AUTHOR>&hitsPerPage=50   # parent_id==story id = top-level
```
Reproduction of the scout (75,943; 2.0% at 100+; median 2; weekday 1.8-2.3%; hours 0.7-2.8%): total 75,929 (14 fewer: window edge or deleted posts), 2.1% at 100+ after the 7-day maturity cut, median 2, weekdays 1.8-2.3%, hours 0.7% (07 UTC) to 2.8% (16, 17 UTC). All figures reproduce.

Outcome split (n, median points, median comments, share with 100+ points):

| Cut | n | med pts | med cmts | 100+ pts |
|---|---|---|---|---|
| All mature Show HN | 74,897 | 2 | 0 | 2.1% (50+: 3.6%, 10+: 9.2%, 0 comments: 62.2%) |
| text, no URL | 3,792 | 2 | 0 | 1.2% |
| github.com/owner/repo root | 23,718 | 2 | 0 | 2.6% |
| other forge/path | 1,043 | 2 | 0 | 2.1% |
| video URL | 408 | 2 | 0 | 0.7% |
| blog-like host | 1,555 | 2 | 0 | 2.7% |
| other product site | 44,381 | 2 | 0 | 1.9% |
| title has "!" | 62 | 2 | 0 | 0.0% |
| title over 80 chars | 56 | 2 | 0 | 0.0% (50+: 0.0%) |
| title without "Show HN" prefix | 71 | 2 | 1 | 0.0% |
| title with superlative (best/fastest/first/ultimate/revolutionary/blazing) | 1,954 | 2 | 0 | 1.3% (vs 2.1%) |
| title with " - " tagline | 34,981 | 2 | 0 | 1.9% (vs 2.2% without) |
| title 60 chars or fewer | 27,501 | 2 | 0 | 2.5% (vs 1.8%) |
| title AI/LLM/GPT/agent/Claude/MCP | 21,589 | 2 | 0 | 1.2% (vs 2.4%) |
| title Rust/Go/Zig | 2,280 | 2 | 0 | 3.1% |
| title open source/OSS/MIT | 4,228 | 2 | 0 | 3.4% |
| URL post with body text | 40,958 | 2 | 0 | 2.7% (vs 1.3% without) |
| author's first Show HN in window | 30,424 | 2 | 0 | 1.9% (vs 2.2% repeat authors) |

Maker comment (random sample n=3,909 of 4,000 attempted; 91 requests failed):

| Cut | n | 100+ pts | 50+ pts |
|---|---|---|---|
| all | 3,909 | 1.9% | 3.5% |
| maker top-level comment, any time | 599 | 3.2% | 5.5% |
| maker top-level comment within 60 minutes | 474 | 1.5% | 2.7% |
| no maker comment within 60 minutes | 3,435 | 2.0% | 3.6% |
| github URL, maker comment within 60 minutes | 170 | 3.5% | 5.9% |
| github URL, none | 1,122 | 1.9% | 4.2% |
| non-github URL, maker comment within 60 minutes | 283 | 0.4% | 1.1% |
| non-github URL, none | 2,131 | 2.2% | 3.6% |
| maker wrote any comment (incl. replies) | 1,086 | 6.6% | 11.4% |
| maker wrote none | 2,823 | 0.1% | 0.5% |

Reading: "maker any comment" is reverse causation (makers reply to threads that exist). A first comment within 60 minutes shows no lift; the measurement cannot prove a causal effect either way and cannot see the submission body text separately. The only supported maker-presence claim is the HN requirement.

Medians are 2 points in nearly every cut, so a median comparison cannot discriminate; the 100+ share is the useful outcome. The base rate is the main finding: 97.9% of Show HNs do not reach 100 points and 62% receive no comment.

### 8. Posting time
Same dataset, UTC hours of created_at_i:

| Window | n | 100+ pts |
|---|---|---|
| Weekdays (Mon-Fri) | 59,242 | 2.0% |
| Weekend | 15,655 | 2.2% |
| 14:00-18:59 UTC | 26,137 | 2.5% |
| 06:00-10:59 UTC | 11,273 | 1.2% |
| other hours | 37,487 | 2.0% |

Two-proportion z for 14-18 vs 06-10: 8.0. The gap holds in both halves of the window (first half 3.6% vs 1.5%; second half 2.0% vs 1.1%), but the overall 100+ rate fell from first to second half, so the dataset is not stationary. Confounders: audience geography, volume of competing posts, who posts at those hours. Surviving advice: do not choose 06:00-10:59 UTC; no evidence for a best day, no evidence for a best minute. Blog claims about specific "best" hours are not supported by an independent peer-reviewed source here; none was cited by the scout either.

### 9. Launch HN
[yli.html](https://news.ycombinator.com/yli.html) (fetched 2026-11-27, no date): "Launch HN is a way for YC startups to launch on Hacker News." Curated, form-based, editorial decision, reply within two weeks; "Each YC startup only gets one Launch HN"; "If you're not a YC startup, the above doesn't apply, but you should still follow the advice below." Writing advice: no marketing/PR style; "Don't use superlatives (fastest, biggest, first, best)"; "Don't make lists of features"; "Don't use single-sentence paragraphs"; transparent pricing; no bait-and-switch; remove signup barriers at least for launch day; email-only signups are "probably too early"; if the username is the company name, email to change; "Don't coordinate your HN launch with other events, e.g. press articles"; "Make sure your friends don't post booster comments." Title format and the 80-character limit appear in the same page (scout row LP#18; not re-verified line by line here, treat as the scout's reading).
A non-YC tool uses Show HN, never "Launch HN".

### 10. Account and maker
- Account: a personal username, not the company or project (item 22336638); promotion must not be the primary use: "It's ok to post your own stuff part of the time, but the primary use of the site should be for curiosity." (guidelines).
- Maker: must have worked on it personally and be around to discuss (showhn.html); yli.html: "don't leave the thread for long without answering."
- Text: handwritten, per the cited clause owned by core-agent-action-boundary. Generated or AI-edited text in posts and comments is not allowed (guidelines, no date).

## Normative guidance candidates

| # | Rule | Rationale | Severity | Verification |
|---|---|---|---|---|
| 1 | Do not draft a Show HN unless a stranger can install or run the project now with no account or email. | Off-topic Show HNs are moved or ignored (showhn.html). | MUST | Clean-environment run of the documented install path with no login; fail if any step needs signup. Also fail if the submission URL is a docs, pricing or landing page (`grep -iE 'pricing|waitlist|sign.?up|early access'` on the target page). |
| 2 | Do not draft a Show HN for a patch or minor release; require a major overhaul and a link to the prior Show HN. | "Foo 1.3.1 is out" generally not ok; once or twice a year (item 22336638). | MUST | Release version diff: reject when only PATCH/MINOR changes and no migration guide; reject if the project posted a Show HN under 6 months ago. |
| 3 | Require a named human maker with coverage hours for the launch thread; the agent never posts or replies. | Show HN requires the maker "around to discuss"; HN bans generated text. | MUST | Launch plan names person + hours; grep plan for an agent-posting step. |
| 4 | Title regex: begins `Show HN: `, contains no `!`, no all-caps word of 5+ letters other than known acronyms, no superlative (best, fastest, first, ultimate, revolutionary), no site name, no number+adjective filler. | Guidelines titles section; superlatives are named in yli.html. | MUST | `^Show HN: [^!]+$` and `grep -iEw 'best|fastest|first|ultimate|revolutionary|blazing'`. Pass: `Show HN: A package manager for AI skills (CLI, Rust)`. Fail: `Show HN: OCX - THE FASTEST package manager EVER!` |
| 5 | Submit the URL of the runnable thing (repo root or live demo), not the homepage; put the backstory in the text field (or first comment). | "Posts without URLs get penalized" (2019-12-24); text can't carry a link. | SHOULD | URL resolves to repo/download/demo; text field present and non-empty; no link-only text post. |
| 6 | Write the post text as plain factual first person: what it is in one sentence, why it was built, what is different, known gaps; no feature list, no single-sentence paragraphs. | yli.html "most common mistake" is text that reads like an ad. | SHOULD | Reading heuristic: remove the title; reader still learns what it does in sentence 1. Fail: bullet list of features, "revolutionary", marketing taglines. Mechanical: no line starting with `-` or `*` more than 2 times; no paragraph of one sentence. |
| 7 | Run a vote-solicitation grep over every team-controlled surface and fail on a hit: README (and badges), release notes, newsletter drafts, chat/Discord/Slack announcement templates, social posts, the launch plan. | HN penalizes or bans submissions, accounts and sites that solicit votes (FAQ). | MUST | `grep -rniE "upvote|up-vote|vote (for|on|us|it)|support us on (hn|hacker news)|(hn|hacker news)[^.]{0,40}(vote|upvote|comment)|(help|please)[^.]{0,30}(boost|push|front page)|front page of (hn|hacker news)|(hn|hacker news)\.com/item|ycombinator\.com/item" README* CHANGELOG* docs/ .github/ launch/ announce/`. Run it on README, release-note templates, chat templates. Any link to an HN thread in README badges or release notes is a flag for a human review (a plain "discussed on HN" backlink after the fact is not solicitation; "vote on HN" is). |
| 8 | Do not post a link to the live HN thread in the team's chat, newsletter or social with any call to action; share only after the fact, and as information. | Guidelines/FAQ: don't solicit; ring detector demotes (item 7543910). | MUST | Same grep as 7 plus a human check of intent; verification is the template text. |
| 9 | Never delete and resubmit; to retry after a miss, email hn@ycombinator.com with the item URL, or accept a moderator repost invite and wait about a week. | FAQ and items 26998308, 43710636. | MUST | Plan has one submission per URL; retry step names hn@ycombinator.com; no `delete` step. |
| 10 | A direct repost of the same URL is allowed only when the last Show HN has had no significant attention in about a year or more; if posting a new significant release, add a comment linking the previous Show HN and the diff. | FAQ repost window; item 22336638. | SHOULD | Algolia check: `https://hn.algolia.com/api/v1/search?query=<url>&restrictSearchableAttributes=url&tags=story`; pass if no hit with points >= 10 within 365 days. |
| 11 | Use an account whose username is a person, with email in the profile; do not use the company or project name. | Item 22336638; item 26998308 (email for repost invites). | SHOULD | Compare username to org/product names (case-insensitive equality or substring fails). |
| 12 | Do not plan on timing: do not cite a "best day or hour" claim without n, window, and confounder; if a time is chosen, avoid 06:00-10:59 UTC. | Measured weekday null; hour effect 2.5% vs 1.2% is correlational; non-stationary. | SHOULD | Any timing sentence must cite this measurement (n=74,897, 2024-11-27 to 2026-11-27) or be removed. |
| 13 | Do not state or plan around a ranking formula, a points target or a "front-page guarantee". Success metrics name source and window (referrals, installs, retained users), not points. | FAQ: rank cannot be derived; only 2.1% reach 100 points. | MUST | Grep plan for `top 10`, `front page` as a target, `100 points`; require a metric with source and window. |
| 14 | For non-YC teams never use "Launch HN" in a title or plan. | Launch HN is for YC startups, one per startup (yli.html). | MUST | `grep -i 'Launch HN'`; pass only if the account is a YC founder account (a human fact). |
| 15 | Cite core-agent-action-boundary for generated text: the agent produces notes and a fact sheet; the human writes the post and replies by hand. | Guidelines + item 22336638 edit (2026-03-28). | MUST | Handoff file contains facts/links/limits only, not paste-ready post or comment text. |
| 16 | Prepare a maker fact sheet (benchmarks with method, known limits, license, pricing, comparison to alternatives, prior HN threads); keep it factual. | Moderator tips: link relevant previous HN threads; readers expect technical detail; pricing transparency (yli.html). | SHOULD | Fact sheet has sections: what, why, how, differs, limits, install command, license, prior threads; each number carries its method/command. |

Show HN checklist a draft fact sheet must pass (decided, from rows 1-6, 11, 16): (a) install/run path works in a clean environment with no account; (b) not a patch or minor release; major change documented; (c) non-trivial and personally built by the poster; (d) URL is the runnable thing, not marketing; (e) title passes regex row 4; (f) named human with coverage; (g) personal username; (h) no vote-solicitation grep hit; (i) text is human-written (cited clause); (j) one submission, retry route named.

Vote-solicitation grep list and where it runs: row 7 pattern; run on README and badge lines, `CHANGELOG`/release-notes templates, GitHub release templates, newsletter and Discord/Slack announcement templates, social drafts, and the launch plan. It runs in the agent's pre-launch review; it cannot see private messages (a human decision).

Timing: only "avoid 06:00-10:59 UTC" survives; nothing about day of week survives.

Repost rule: never delete and repost; retry only via email/pool/repost invite; a plain repost only after about a year without significant attention; a significant new release may be a new Show HN with a link to the old one, at most once or twice a year.

## Dated facts

| Fact | Source | Date stated | Source type |
|---|---|---|---|
| Show HN runnable, no signup ideal, maker around, no landing pages or fundraisers, 1.3.1 not enough | [showhn.html](https://news.ycombinator.com/showhn.html) | none (fetched 2026-11-27) | platform |
| Titles, no solicitation, no AI-generated text, do not delete and repost | [newsguidelines.html](https://news.ycombinator.com/newsguidelines.html) | none (fetched 2026-11-27) | platform |
| Ranking text, repost window "last year or so", penalties for vote asking | [newsfaq.html](https://news.ycombinator.com/newsfaq.html) | none (fetched 2026-11-27) | platform |
| Launch HN is YC-only, one per startup, decision within two weeks | [yli.html](https://news.ycombinator.com/yli.html) | none (fetched 2026-11-27) | platform |
| Show HN tips: username, repost once or twice a year, booster comments, write text by hand | [item 22336638](https://news.ycombinator.com/item?id=22336638) | posted 2020-02-15, edited 2026-03-28 | platform (moderator) |
| Email signup is not Show HN; voting rings banned | [item 10521976](https://news.ycombinator.com/item?id=10521976) | 2015-11-06 | platform (moderator) |
| Ring detector demotes Show HN; couple of reposts ok | [item 7543910](https://news.ycombinator.com/item?id=7543910) | 2014-04-07 | platform (moderator) |
| Posts without URLs get penalized | [item 21874086](https://news.ycombinator.com/item?id=21874086) | 2019-12-24 | platform (moderator) |
| Second-chance pool explanation | [item 26998308](https://news.ycombinator.com/item?id=26998308) | 2021-04-30 | platform (moderator) |
| Moderator puts a Show HN in the pool | [item 45294776](https://news.ycombinator.com/item?id=45294776) | 2025-09-18 | platform (moderator) |
| Repost invite: wait about a week | [item 43710636](https://news.ycombinator.com/item?id=43710636) | 2025-04-16 | platform (moderator) |
| 75,929 Show HNs, 2.1% reach 100+ points, 62.2% have 0 comments, median 2 points | [Algolia search_by_date](https://hn.algolia.com/api/v1/search_by_date?tags=show_hn), own measurement | window 2024-11-27 to 2026-11-27 | platform dataset, own analysis |
| Algolia returns at most 1,000 hits per query | same endpoint, observed error message | 2026-11-27 | platform |

## What an agent must not decide alone
- Whether the project is "non-trivial" and personally built by the poster, and whether the release is a "major overhaul": maker/owner judgment.
- Whether to ask hn@ycombinator.com for a second-chance placement, and what to write (a human email; HN prefers outside suggestions over self-suggestions per item 26998308).
- Whether the account's username, karma and posting history are fit for a launch (an owner decision; the agent can only flag a company-named account).
- Whether team members may mention the post elsewhere; any message that references the live thread is a human call.
- Whether to use Launch HN (requires being YC) or accept a YC-adjacent claim in text.
- Whether pricing/licensing statements in the post are accurate and approved (business/legal).
- Posting time and day: ask the owner; the measurement gives only a weak "avoid 06-10 UTC".

## AI-agent angle
| Characteristic mistake | Smallest mechanical check |
|---|---|
| Writes paste-ready post and first-comment text for the human to submit. | Handoff dir contains only fact sheet files; grep for `Show HN:` followed by long prose. |
| Drafts marketing copy (superlatives, feature bullets, taglines) because it reads like a README. | Row 4/6 greps. |
| Adds "please upvote / support us" lines to launch checklists, README, Discord template, "ask friends to upvote". | Row 7 grep. |
| Proposes a "best hour" or "Tuesday 8 am Pacific" without a dataset; repeats formula myths (gravity 1.8). | Row 12 rule; no timing sentence without n and window. |
| Treats Launch HN as available to anyone; writes `Launch HN:` titles. | Row 14 grep. |
| Plans delete-and-repost or a "resubmit the next day" retry. | Row 9 grep for `delete`, `resubmit`, `repost`. |
| Submits a landing page, docs page or release page as the Show HN URL. | Row 1 URL/page check. |
| Proposes a Show HN for a patch release, or reposts every release. | Row 2 version check. |
| Names the account after the company. | Row 11. |
| Reports points as the success metric. | Row 13. |

## Contested / evolving
- Does a maker first comment help? HN moderators advise one ([item 22336638](https://news.ycombinator.com/item?id=22336638)); a random sample of 3,909 Show HNs shows no lift for a maker comment within 60 minutes (1.5% vs 2.0% at 100+ points), but the sample cannot separate it from submission text or post quality (see 7). Unresolved; the rule only requires the backstory text, not a lift claim.
- Is posting time causal? Measured hour gap (2.5% vs 1.2%) is real in this dataset but confounded; this dive has no independent study to cite. Trend: overall 100+ rate fell between the window's halves, consistent with rising volume (the scout read the same pattern).
- AI-edited text ban: the guideline text says no generated or AI-edited text; the moderator edit (2026-03-28) says LLMs are fine for other work. Owned by core-agent-action-boundary.
- Show HN scope: the page says "Don't post quickly-generated one-offs; anybody can do that now"; how strictly this is enforced is not published. Moderators decide.
- Repost window: FAQ says "last year or so"; a 2014 moderator comment says "a couple of reposts" for a post with no attention yet, and the pool route exists beside it. Both are platform statements of different ages; the FAQ is current.

## Sources
| URL | What | Date | Why |
|---|---|---|---|
| https://news.ycombinator.com/showhn.html | Show HN rules (primary) | none; fetched 2026-11-27 | eligibility |
| https://news.ycombinator.com/newsguidelines.html | HN guidelines (primary) | none; fetched 2026-11-27 | titles, solicitation, AI ban |
| https://news.ycombinator.com/newsfaq.html | HN FAQ (primary) | none; fetched 2026-11-27 | ranking, reposts, penalties, text links |
| https://news.ycombinator.com/yli.html | Launch HN instructions (primary) | none; fetched 2026-11-27 | YC-only, writing advice |
| https://news.ycombinator.com/item?id=22336638 | Moderator Show HN tips (primary) | 2020-02-15, edited 2026-03-28 | username, repost, booster comments |
| https://news.ycombinator.com/item?id=10521976 | Moderator on voting rings, email signups (primary) | 2015-11-06 | ban language |
| https://news.ycombinator.com/item?id=7543910 | Moderator on ring detector, reposts (primary) | 2014-04-07 | demotion risk |
| https://news.ycombinator.com/item?id=21874086 | Moderator on URL vs text (primary) | 2019-12-24 | URL penalty |
| https://news.ycombinator.com/item?id=26998308 | Second-chance pool post (primary) | 2021-04-30 | retry route |
| https://news.ycombinator.com/item?id=45294776 | Moderator pool placement (primary) | 2025-09-18 | current practice |
| https://news.ycombinator.com/item?id=43710636 | Moderator repost invite (primary) | 2025-04-16 | wait about a week |
| https://news.ycombinator.com/pool | Live second-chance pool page (primary) | fetched 2026-11-27 | pool exists now |
| https://hn.algolia.com/api/v1/search_by_date?tags=show_hn | Algolia API used for measurement (platform dataset) | queried 2026-11-27 | measurement; also items endpoint https://hn.algolia.com/api/v1/items/<id> used for moderator comments |
| https://hn.algolia.com/api | Algolia API docs page | not fetchable (JS only) | limits taken from observed error message instead |
| /home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/.agents/research/marketing-topic-map/channel-communities.md | Scout rows CM#1,2,4-7,36 and the 75,943 measurement | 2026-11-27 | start point; figures re-run |
| /home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/.agents/research/marketing-topic-map/channel-launch-platforms.md | Scout rows LP#11-16, 18 | 2026-11-27 | start point |
