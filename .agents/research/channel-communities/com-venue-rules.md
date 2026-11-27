---
title: Developer community venue rules for announcing a tool (Reddit, Lobsters, Stack Overflow, dev.to, Hashnode)
program: product
sub_program: channels
topic: channel-communities
worker: com-venue-rules
date_researched: 2026-11-27
model: sonnet
sources_fetched: 13
scope: Per-venue contract for announcing a software tool on Reddit (sitewide only; subreddit rules unreadable), Lobsters, Stack Overflow, dev.to and Hashnode - post type, account prerequisite, disclosure, AI rule. Not covered - Hacker News (sibling worker), canonical-URL handling (marketing SEO), the Stack Overflow generated-text ban beyond a citation (owned by core-agent-action-boundary).
---

# Developer community venue rules for announcing a tool

## Contents
1. [Summary](#summary)
2. [Findings](#findings)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Dated facts](#dated-facts)
5. [What an agent must not decide alone](#what-an-agent-must-not-decide-alone)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary
URLs: Reddit [rules](https://www.redditinc.com/policies/reddit-rules), Lobsters [about](https://lobste.rs/about), [hats](https://lobste.rs/hats) and [tags](https://lobste.rs/tags.json), Stack Overflow [promotion](https://stackoverflow.com/help/promotion), [product support](https://stackoverflow.com/help/product-support), [gen-AI policy](https://stackoverflow.com/help/gen-ai-policy) and [privileges](https://stackoverflow.com/help/privileges), dev.to [terms](https://dev.to/terms) and [AI guidelines](https://dev.to/guidelines-for-ai-assisted-articles-on-dev), Hashnode [terms](https://hashnode.com/terms) and [Code of Conduct](https://hashnode.com/code-of-conduct). All platform sources, fetched 2026-11-27.
- Central gap: no subreddit's rules could be read. Every `about/rules.json` fetch returned HTTP 403 (measured below). The skill must refuse to draft for a subreddit until a human pastes the rules in-session.
- Reddit sitewide ([rules](https://www.redditinc.com/policies/reddit-rules); no revision date, HTTP `last-modified` 2026-11-20): Rule 2 bans spam and "content manipulation"; Rule 5 bans deliberately misleading others. The spam definition page is also 403.
- Lobsters ([about](https://lobste.rs/about); page undated): self-promo "less than a quarter of one's stories and comments in the last year"; "New users (first 70 days) are not allowed to submit self-promo" and cannot use `show`, `announce` or `vibecoding` tags.
- A launch-day new account cannot post to Lobsters as a maker at all. It also cannot submit a link whose domain was never submitted before, which a brand-new tool's domain usually is ([about](https://lobste.rs/about)).
- Lobsters has no AI-text rule on the about page; the Spam flag covers content "created without meaningful human authorship" ([about](https://lobste.rs/about)). Hats are now verified: "a formal, verified, way of posting a comment while speaking for a project, organization, or company" ([hats](https://lobste.rs/hats)).
- Stack Overflow ([promotion](https://stackoverflow.com/help/promotion)): affiliation disclosure is mandatory ("you must disclose your affiliation"); links only to support the answer; official-support route is answering questions plus monitoring tags ([product support](https://stackoverflow.com/help/product-support)). Generative-AI content is banned ([policy](https://stackoverflow.com/help/gen-ai-policy); owned by core-agent-action-boundary).
- Stack Overflow's product-support page says it "can't be the only support" ([source](https://stackoverflow.com/help/product-support)).
- dev.to ([terms](https://dev.to/terms)): posts "may not merely reference an external link that contains the full post", must not be "designed primarily for the purposes of promotion or creating backlinks", affiliate links must be disclosed.
- dev.to AI guidelines ([page](https://dev.to/guidelines-for-ai-assisted-articles-on-dev); last updated 2024-04-08): AI-assisted posts must disclose AI use and "should not ... Promote any business, program, or course (including your own)". An AI-assisted launch post for your own tool is non-compliant on dev.to.
- dev.to bans AI-generated comments except translation, grammar and assistive tools ([same page](https://dev.to/guidelines-for-ai-assisted-articles-on-dev)).
- Hashnode: [terms](https://hashnode.com/terms) effective 2026-02-15: author "solely responsible for reviewing, editing, and approving any AI-generated content"; spam includes "unsolicited promotional content, bulk messages, or automated content generation for the purpose of manipulating search results or engagement metrics". [Code of Conduct](https://hashnode.com/code-of-conduct) (effective 2026-03-07, last updated 2026-06-04) names "using the platform primarily for self-promotion" and says "You are responsible for your content, including AI-assisted writing."
- Recommended venues for a CLI tool: Lobsters (only for an account aged 70+ days with under 25% self-promo), a subreddit only after a human reads its current rules, dev.to and Hashnode for human-written full-text posts, Stack Overflow only as ongoing human support, not as announcement.
- Human-only: Stack Overflow content, dev.to comments, Reddit and Lobsters submission and thread replies (account-bound; also manipulation risk), any multi-account activity.

## Findings

### 1. Measurements and commands
Scratch dir: `~/.cache/research-lang/exemplars/product/com-venue/`. UA used: `Mozilla/5.0 (X11; Linux x86_64) research-fetch`. Fetch date 2026-11-27.

| Command | Result |
|---|---|
| `curl -s -A "$UA" -o r.json -w "%{http_code}" https://www.reddit.com/r/programming/about/rules.json` | 403 (body about 664 bytes) |
| same for `r/rust` | 403 |
| same for `r/selfhosted` | 403 |
| same for `r/opensource` | 403 |
| same for `r/commandline` | 403 |
| `curl -s -A "$UA" -L https://old.reddit.com/r/programming/about/rules.json` (one extra try on an alternate host of the same authorised route) | 403 |
| WebFetch `https://www.reddit.com/r/selfhosted/about/rules` | refused by tool ("unable to fetch from www.reddit.com") |
| `curl ... https://support.reddithelp.com/hc/en-us/articles/360043504051` (Reddit Help spam page; also `-Spam` slug) | 403 |
| `curl ... https://www.redditinc.com/policies/reddit-rules` | 200, 524600 bytes |
| `curl ... https://stackoverflow.com/help/promotion`, `/help/product-support`, `/help/gen-ai-policy` | 200 each |
| `curl ... https://dev.to/terms`, `https://dev.to/code-of-conduct`, `https://dev.to/guidelines-for-ai-assisted-articles-on-dev` | 200 each |
| `curl ... https://dev.to/guidelines` | 404 (no such page) |
| `curl ... https://hashnode.com/terms`, `https://hashnode.com/code-of-conduct` | 200 each |
| `curl ... https://hashnode.com/community-guidelines` | 200 but renders "User not found" (no such page; it is a profile route) |
| `curl ... https://lobste.rs/about`, `https://lobste.rs/tags.json` | 200 each |

Per subreddit, rule count and verbatim self-promotion rules: NOT MEASURABLE. All five rules endpoints are 403 for a generic client. No bypass was attempted (no login, no proxy, no API credentials). Rule count: unknown for r/programming, r/rust, r/selfhosted, r/opensource, r/commandline. This is a documented gap, not a finding about the rules.

### 2. Reddit sitewide
[Reddit Rules](https://www.redditinc.com/policies/reddit-rules) (no revision date on page; footer "Copyright 2026 Reddit, Inc."; platform source). Verbatim:
- "Rule 2 Abide by community rules. Participate authentically in communities where you have a personal interest, and do not spam or engage in disruptive behaviors (including content manipulation) that interfere with Reddit communities."
- "Rule 5 Be authentic. You don't have to use your real name, but do not intentionally mislead others or impersonate an individual or entity in a deceptive manner."
- "Below the rules governing each community are the platform-wide rules that apply to everyone on Reddit. These rules are enforced by us, the admins."
The "spam" link target is `https://support.reddithelp.com/hc/articles/360043504051`; it returned 403, so the self-promotion help text (including any 9:1 style ratio) was not read. The scout's figure list contains no ratio, so nothing failed to reproduce. Do not state a Reddit ratio.

Account prerequisites on Reddit (karma, age) are set per subreddit and were not readable. Treat as unknown, not as zero.

### 3. Lobsters
[About](https://lobste.rs/about) (no date on page; site itself). Re-fetched, verbatim:
- "It's great to have authors participate in the community, but not to exploit it as a write-only tool for product announcements or driving traffic to their work. As a rule of thumb, self-promo should be less than a quarter of one's stories and comments in the last year. New users (first 70 days) are not allowed to submit self-promo."
- New users "can't send invites, submit links to domains we haven't seen submitted before, flag stories and comments, suggest edits to story titles and tags, resubmit links that have been seen before, or use tags for meta discussions or that are prone to off-topic stories (meta rant show announce satire job interview merkle-trees ask culture vibecoding)."
- Spam flag: "content that either is designed to promote a commercial service or for content that is created without meaningful human authorship."
- Invitation-only registration; the invite tree is public and "helps identify voting rings."
- [tags.json](https://lobste.rs/tags.json) (measured 2026-11-27): `vibecoding` = "Using AI/LLM, coding tools. Don't also tag with `ai`."; `show` = "Show Lobsters / Projects"; `release` = "Software releases and announcements". `release` is not on the new-user restricted list, but the self-promo ban applies to a new account anyway.
All three scout figures (quarter, 70 days, vibecoding) reproduce. Repair pass: [hats page](https://lobste.rs/hats) (fetched 2026-11-27, HTTP 200) states: "A hat is a formal, verified, way of posting a comment while speaking for a project, organization, or company." The scout hats claim now reproduces for comments; whether a hat applies to a story submission was not shown.

### 4. Stack Overflow
- [Promotion help](https://stackoverflow.com/help/promotion) (no date; platform source): "if you mention your product, website, etc. in your question or answer (or any other contribution to the site), you must disclose your affiliation in your post." Avoid: "Don't talk about your product / website / book / job too much", "Don't include links except to support what you've written." "We also offer free community promotion ads for open-source projects and non-profit organizations."
- [Product support](https://stackoverflow.com/help/product-support) (no date): "Stack Overflow can help support your product (if it's on-topic for the site), but it can't be the only support." "How do I [...]?" and "I got this error; why?" go to Stack Overflow with the product and language tags; suspected bugs and requests go to your own site; "Why do you" and "When will you" go to your own community. "monitor the tags related to your product".
- [Generative AI policy](https://stackoverflow.com/help/gen-ai-policy) (no date): generative AI "may not be used to generate content for Stack Overflow"; content judged AI-written is deleted "along with any reputation earned from it"; repeat infractions risk suspension. The ban is owned by core-agent-action-boundary; this file only cites it.
- Account prerequisite: the product-support page says answering builds "the reputation you'll need to gain important privileges like commenting, editing". A launch-day account has none. Repair pass: [privileges](https://stackoverflow.com/help/privileges) (page footer rev 2026.11.26.48011, fetched 2026-11-27) lists "edit posts" at 2,000 reputation, "access review queues" at 500, "create posts" at 1; its "comment everywhere" row parsed as 1, so commenting on others' posts is not the barrier claimed earlier.

### 5. dev.to
- [Terms](https://dev.to/terms) (page footer "2016 - 2026", no revision date; platform source): "Users must make a good-faith effort to share content that is on-topic, of high-quality, and is not designed primarily for the purposes of promotion or creating backlinks." "Posts must contain substantial content - they may not merely reference an external link that contains the full post." Affiliate links "must be clearly disclosed".
- [AI-assisted guidelines](https://dev.to/guidelines-for-ai-assisted-articles-on-dev) (last updated 2024-04-08 per page): AI-assisted posts "Disclose the fact ... either upfront using the tag #ABotWroteThis or at any point in the article's copy"; "should not ... Promote any business, program, or course (including your own)"; no AI-generated comments except "basic translation and grammar/syntax improvement tools". Suspension or ban for articles whose main purpose is "building backlinks ... The two exceptions ... (1) a backlink to a personal blog, or (2) a backlink to a company blog IF the article has been shared under that company's organization on DEV." Moderators can lower visibility of all posts of a repeat offender and add the tag themselves.
- [Code of Conduct](https://dev.to/code-of-conduct) cites the AI Guidelines: "disclosing AI assistance if used to create content". 
- No account-age gate was found on these pages. A search result referenced a newer "AI Disclosure" tier feature, but only via a third-party mirror, so it is not used.

### 6. Hashnode
- [Terms of Use](https://hashnode.com/terms) (effective and last updated 2026-02-15; platform source): prohibits "Post or distribute spam, including unsolicited promotional content, bulk messages, or automated content generation for the purpose of manipulating search results or engagement metrics." AI section: "You are solely responsible for reviewing, editing, and approving any AI-generated content before publishing."
- [Code of Conduct](https://hashnode.com/code-of-conduct) (effective 2026-03-07, last updated 2026-06-04 per page header; platform source): "AI-generated content is permitted, but you must review and take responsibility for everything you publish." Prohibits "using the platform primarily for self-promotion without contributing to the community."
- No separate "community guidelines" page exists at hashnode.com/community-guidelines (renders a profile-not-found page); the brief's source is the Code of Conduct. No AI-content pre-approval queue was found; "approval" is the author's own.

### 7. Venue table

| Venue | Allowed post type for a tool | Account prerequisite (launch-day new account) | Disclosure | AI rule | Source date |
|---|---|---|---|---|---|
| [Reddit sitewide](https://www.redditinc.com/policies/reddit-rules) | Any allowed by the subreddit; no spam or content manipulation | Unknown, per subreddit | Rule 5: no deceptive misleading | Not found sitewide | no revision date; `last-modified` header 2026-11-20 |
| r/programming, r/rust, r/selfhosted, r/opensource, r/commandline ([rules.json](https://www.reddit.com/r/programming/about/rules.json), 403) | UNKNOWN - rules unreadable | UNKNOWN | UNKNOWN | UNKNOWN | not fetched |
| [Lobsters](https://lobste.rs/about) | Link submissions; own work under a quarter of activity; tag `show` for projects | Fails: 70-day wall for self-promo, `show`, `announce`, `vibecoding`; invite needed; no never-seen domains | Hats verify speaking for a project ([hats](https://lobste.rs/hats)) | Spam flag for no "meaningful human authorship" | page states no date; HTTP response carried no `last-modified`; live at fetch 2026-11-27 |
| [Stack Overflow](https://stackoverflow.com/help/promotion) ([support](https://stackoverflow.com/help/product-support)) | Answers and questions; product support via tagged Q and A; not announcements | Reputation-gated; see [privileges](https://stackoverflow.com/help/privileges) (edit posts at 2,000; page rev 2026.11.26.48011) | Mandatory affiliation line | [Generative AI banned](https://stackoverflow.com/help/gen-ai-policy) | pages state no date; live at fetch 2026-11-27 |
| [dev.to](https://dev.to/terms) | Full-text articles; company posts under an organization | No gate found | Affiliate disclosure; AI disclosure | [Allowed with disclosure](https://dev.to/guidelines-for-ai-assisted-articles-on-dev) but "should not promote any business ... (including your own)"; no AI comments | terms: no date; AI page 2024-04-08 |
| [Hashnode](https://hashnode.com/terms) ([CoC](https://hashnode.com/code-of-conduct)) | Full-text articles; self-promotion only alongside community contribution | No gate found | Not stated beyond spam rules | Allowed; author approves; no bulk generation | terms effective 2026-02-15; CoC effective 2026-03-07, updated 2026-06-04 |

### 8. Recommendation for a CLI tool (decision)
- Recommend: Lobsters (when account age and share conditions hold, tags `release`, `show`); r/commandline or a relevant subreddit after rules are read by a human; dev.to and Hashnode as human-written, full-text, non-AI posts (dev.to AI-assisted posts may not promote your own business, so use human-authored text); Stack Overflow only as monitored support.
- Mark human-only: Stack Overflow content (ban on generated content); any dev.to comment; every submission and reply on Reddit and Lobsters (account-bound, manipulation risk, and the agent cannot hold an aged account).
- Fit to this fleet: no social presence exists, so every account is new; Lobsters and subreddit karma gates likely block a same-week launch. Plan lead time, not workarounds.

## Normative guidance candidates

Format per rule: keyword (MUST / MUST NOT / SHOULD / CONSIDER) is the severity; each rule also states Severity explicitly, Rationale with source URL, and Verify.

1. MUST. Severity: MUST. Refuse to draft a Reddit post until the target subreddit's rules, fetched in this session by a human or an authorised route, are in the plan with the fetch date. Rationale: five of five subreddit rule endpoints returned 403 to a generic client ([example](https://www.reddit.com/r/programming/about/rules.json), 2026-11-27) and Reddit enforces per-community rules via [Rule 2](https://www.redditinc.com/policies/reddit-rules). Verify: plan contains a "rules read on <date>" line with at least one quoted self-promotion rule; absent line fails.
2. MUST NOT. Severity: MUST. Probe, scrape around or evade a 403 on Reddit (no alternate UAs, proxies, logins that are not the owner's). Rationale: the block is a venue control, and [Rule 2](https://www.redditinc.com/policies/reddit-rules) bans disruptive behaviours; the brief says record it. Verify: a log of attempts shows one request per URL and no header spoofing beyond a generic UA.
3. MUST. Severity: MUST. Before planning a Lobsters submission, record the posting account's age in days and the share of its stories and comments in the last year that link to its own work; fail if age is under 70 or share would exceed 25 percent. Rationale: [Lobsters about](https://lobste.rs/about) (page undated, fetched 2026-11-27). Verify: arithmetic `own_links / (stories + comments)` under 0.25 and age at least 70.
4. MUST NOT. Severity: MUST. Plan a Lobsters launch for a brand-new tool domain from a new account. Rationale: new users cannot submit domains never seen before ([about](https://lobste.rs/about)). Verify: check `https://lobste.rs/domains/<domain>` has prior submissions or the account is older than 70 days.
5. MUST NOT. Severity: MUST. Use tags `show`, `announce` or `vibecoding` from an account under 70 days. Rationale: the about page lists them among tags new users cannot use ([about](https://lobste.rs/about)); a post tagged so is rejected or flagged. Verify: grep the plan for those tags against account age.
6. SHOULD. Severity: SHOULD. Tag a Lobsters post for an agent-built project `vibecoding` (not also `ai`) once the account is eligible. Rationale: [tags.json](https://lobste.rs/tags.json) description "Don't also tag with `ai`." Verify: tag list in the draft.
7. MUST. Severity: MUST. Put an affiliation sentence in any Stack Overflow, Reddit or Lobsters text that names your own tool, in the body, not only the profile. Rationale: Stack Overflow "must disclose your affiliation" ([promotion](https://stackoverflow.com/help/promotion)); Reddit [Rule 5](https://www.redditinc.com/policies/reddit-rules); Lobsters ties speaking for a project to verified hats ([hats](https://lobste.rs/hats)). Verify: grep first 200 characters of the draft for "I (maintain|work on|built)" or "I'm affiliated"; fail if absent.
8. MUST NOT. Severity: MUST. Produce a Stack Overflow answer, question or comment by an LLM for a human to post. Rationale: [gen-AI policy](https://stackoverflow.com/help/gen-ai-policy), owned by core-agent-action-boundary. Verify: no deliverable labelled Stack Overflow whose author is a model.
9. MUST. Severity: MUST. A Stack Overflow answer that cites your tool solves the problem in its own text, and the link only supports it. Rationale: [promotion](https://stackoverflow.com/help/promotion) says "Don't include links except to support what you've written"; link-only answers read as promotion and get removed. Verify reading heuristic: delete the link; pass if the answer still solves the problem, fail if it becomes empty (link-only).
10. SHOULD. Severity: SHOULD. Route "how do I" and error questions in README or SUPPORT.md to Stack Overflow with product and language tags, bugs and requests to the tracker. Rationale: [product-support page](https://stackoverflow.com/help/product-support). Verify: `grep -i "stackoverflow" SUPPORT.md README.md` plus a tracker link.
11. MUST. Severity: MUST. Any dev.to or Hashnode cross-post carries the full body. Rationale: [dev.to terms](https://dev.to/terms) ban link-only posts. Verify: body word count at least the original's and no "read more at" as the only content.
12. MUST NOT. Severity: MUST. Draft with AI an article on dev.to that promotes the author's own business or tool. Rationale: [AI guidelines](https://dev.to/guidelines-for-ai-assisted-articles-on-dev) "should not ... Promote any business, program, or course (including your own)". Verify: the plan states either human authorship or no promotion; AI-assisted launch posts fail.
13. MUST. Severity: MUST. If any AI assistance touched a dev.to post, include the disclosure (`#ABotWroteThis` or a disclosure line). Rationale: the [AI guidelines](https://dev.to/guidelines-for-ai-assisted-articles-on-dev) require disclosure "either upfront using the tag #ABotWroteThis or at any point in the article's copy", and the [Code of Conduct](https://dev.to/code-of-conduct) repeats it; omission risks moderation. Verify: grep for the tag or "created with the help of AI".
14. MUST NOT. Severity: MUST. Use AI to write dev.to comments, other than translation, grammar or assistive tools. Rationale: the [AI guidelines](https://dev.to/guidelines-for-ai-assisted-articles-on-dev) bar AI-generated comments except basic translation and grammar tools, and a comment is account-bound speech. Verify: no comment deliverables from a model.
15. MUST. Severity: MUST. Record a named human approver for every Hashnode post. Rationale: [Hashnode terms](https://hashnode.com/terms) (effective 2026-02-15) "solely responsible for reviewing, editing, and approving"; [Code of Conduct](https://hashnode.com/code-of-conduct) (updated 2026-06-04) repeats it. Verify: the plan row has an approver field filled.
16. MUST NOT. Severity: MUST. Bulk-generate or schedule many posts across Hashnode or dev.to. Rationale: [Hashnode terms](https://hashnode.com/terms) ban "automated content generation for the purpose of manipulating search results or engagement metrics"; the [Code of Conduct](https://hashnode.com/code-of-conduct) bans "Automated or bulk posting, engagement farming". Verify: no more than one launch post per venue per plan, count.
17. MUST NOT. Severity: MUST. Plan posting from several accounts about one item, or ask team members to upvote. Rationale: Reddit [Rule 2](https://www.redditinc.com/policies/reddit-rules) "content manipulation"; Lobsters invite tree "helps identify voting rings" ([about](https://lobste.rs/about)); Hashnode forbids multiple accounts to manipulate votes ([CoC](https://hashnode.com/code-of-conduct)). Verify: one-voice-per-thread check; grep "upvote", "vote for".
18. CONSIDER. Severity: CONSIDER. Ask the owner to use a Lobsters hat when commenting as the maker, and confirm first that the hat applies. Rationale: [hats](https://lobste.rs/hats) (fetched 2026-11-27) describe hats as verified speaking for a project, organization or company; applicability to story submissions was not shown. Verify: human check; the owner confirms a hat exists on the account before the plan lists one.

## What an agent must not decide alone
- Whether a founder or employee account (and its history) is the voice for a launch; account ownership and disclosure wording are brand decisions.
- Whether to buy into a venue with a 70-day lead time (delay the launch or skip the venue).
- Whether to use a company organization on dev.to to take the backlink exception.
- Posting, upvoting, commenting or replying on any venue, and any use of alt accounts: ask, never do.
- Whether a subreddit's rule permits a tool announcement: ask a human to read it.

## AI-agent angle
- Failure: agent recalls Reddit self-promo "9:1" or "10 percent" ratios from training data. Check: grep drafts and rules for "9:1|10%|ratio" tied to Reddit; the page was unreadable, so the claim is unsourced.
- Failure: agent writes a dev.to launch post with AI help and promotes the tool, believing disclosure is enough. Check: AI-assisted plus own-product promotion in one row fails (dev.to rule).
- Failure: agent treats Hashnode "approval" as a platform review queue. It is the author's own duty; check a named approver field.
- Failure: agent drafts a Stack Overflow answer "with disclosure". The generated-content ban makes disclosure irrelevant; check no SO deliverable by a model.
- Failure: agent proposes a new throwaway Lobsters account. Check account-age and invite-tree note in plan.
- Failure: agent drafts a Reddit post from memory of subreddit rules. Check the dated "rules read" line.

## Contested / evolving
- Whether self-promotion ratios matter: Lobsters states one in writing (quarter); Reddit and Stack Overflow say only "too much" or defer to subreddits. No credible source here disagrees; the open question is only the unreadable Reddit data.
- dev.to AI rules: the page states 2024-04-08; one third-party mirror claims a newer AI-disclosure tier feature dated August 2026. Not confirmed on dev.to; trend is toward more disclosure. Treat the 2024 page as current until re-checked.
- Hashnode's AI policy moved to author-responsibility in its 2026-02-15 terms; earlier terms were not compared.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://www.redditinc.com/policies/reddit-rules | Reddit sitewide rules (read) | undated, 2026 | Rules 2 and 5 |
| https://support.reddithelp.com/hc/articles/360043504051 | Reddit spam definition (403, unread) | n/a | Gap |
| https://www.reddit.com/r/programming/about/rules.json (and rust, selfhosted, opensource, commandline) | Subreddit rules (403 each, unread) | 2026-11-27 attempt | Gap |
| https://old.reddit.com/r/programming/about/rules.json | Alternate host, 403 | 2026-11-27 attempt | Gap |
| https://lobste.rs/about | Lobsters rules (read) | undated | Self-promo, 70 days, tags |
| https://lobste.rs/tags.json | Lobsters tag descriptions (read) | live | vibecoding |
| https://stackoverflow.com/help/promotion | SO promotion (read) | undated | Disclosure |
| https://stackoverflow.com/help/product-support | SO product support (read) | undated | Support split |
| https://stackoverflow.com/help/gen-ai-policy | SO AI ban (read) | undated | Cross-ref |
| https://dev.to/terms | dev.to terms (read) | undated | Cross-post, promotion |
| https://dev.to/guidelines-for-ai-assisted-articles-on-dev | dev.to AI guidelines (read) | 2024-04-08 | AI disclosure, no self-promotion |
| https://dev.to/code-of-conduct | dev.to CoC (read) | undated | AI disclosure expectation |
| https://hashnode.com/terms | Hashnode terms (read) | 2026-02-15 | Spam, AI approval |
| https://hashnode.com/code-of-conduct | Hashnode CoC (read) | effective 2026-03-07, updated 2026-06-04 | Self-promotion, AI |
| https://lobste.rs/hats | Lobsters hats (read, repair pass) | undated | Affiliation |
| https://stackoverflow.com/help/privileges | SO privileges (read, repair pass) | rev 2026.11.26 | Reputation gates |

Thirteen pages were read (eleven plus lobste.rs/hats and stackoverflow.com/help/privileges in the repair pass) (all except the three blocked rows). Fewer than the usual 12 primary-read floor: the shortfall is the Reddit block.
