---
title: "Cross-platform publishing boundary, labels and dated registries"
topic: channel-agent-boundary
program: product
sub_program: channels
date: 2026-11-27
revised: 2026-11-27
model: opus
id_family: CH-CORE
rule_file: channel-publishing
consolidates:
  - channel-agent-boundary/core-agent-action-boundary.md
  - channel-agent-boundary/core-platform-labels.md
  - channel-agent-boundary/core-facts-and-channel-inventory.md
revision_inputs:
  - skeptic review of 2026-11-27 (18 findings), answered from the three dives above and from primary pages re-fetched 2026-11-27
grounding:
  - product-audit/distribution-posture.md
  - product-audit/config-inventory.md
  - product-audit/exemplar-youtube-channels.md
  - product-audit/messaging-inventory.md
---

# Cross-platform publishing boundary, labels and dated registries

## Contents

1. [Verdict](#verdict)
2. [Conflicts resolved](#conflicts-resolved)
3. [The ruleset](#the-ruleset)
4. [Check commands](#check-commands)
5. [Seed registry rows](#seed-registry-rows)
6. [Applied to the fleet](#applied-to-the-fleet)
7. [AI-agent failure modes](#ai-agent-failure-modes)
8. [What an agent must ask a human](#what-an-agent-must-ask-a-human)
9. [Decay](#decay)
10. [Open questions](#open-questions)
11. [Sub-artifacts](#sub-artifacts)
12. [Key sources](#key-sources)
13. [Revision log](#revision-log)

## Verdict

1. **An agent never performs a public action on a social or community venue.** On the 15 venues of the dive's matrix (LinkedIn, YouTube, X, Bluesky, Threads, Mastodon, Discord, TikTok, Reddit, Hacker News, Lobsters, Product Hunt, dev.to, Stack Overflow, BetaList), an agent's channel work ends at a publish package: the draft, the filled label fields, the disclosure line, and the open questions. A named human posts, replies, uploads, submits listings and pays. No dive found one of these platforms that lets an agent decide this alone. YouTube requires "prior specific and express consent" for each automated upload or comment ([developer policies](https://developers.google.com/youtube/terms/developer-policies), last updated 2026-11-06). LinkedIn bans "bots or other unauthorized automated methods" ([User Agreement 8.2](https://www.linkedin.com/legal/user-agreement), effective 2025-11-03). Hacker News says "please don't automate posting" ([guidelines](https://news.ycombinator.com/newsguidelines.html), no page date). **GitHub and the package registries are outside this boundary.** Releases, About fields, topics and registry publishing are release engineering, governed by the `channel-github` rules. GitHub's Acceptable Use Policies bar "automated excessive bulk activity" and "automated starring or following", not automation as such ([AUP section 4](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies), source last changed 2026-07-09).
2. **Automation is owner-commissioned, never agent-commissioned, and it exists on five platforms only:** X, Bluesky, Threads, Mastodon and Discord. Each needs a row in the organisation's channel inventory that records who approved it, which file runs it, and which platform gates a named human attested. Each of these platforms documents a labelled bot path. On every other platform an automated path is forbidden. Two gates can be checked by a command (the Bluesky `bot` self-label and the Mastodon bot flag). The X gates cannot be read without an API key, so the human attestation in the row is their only evidence.
3. **Six venues get a fact sheet, never paste-ready prose:** Hacker News, Product Hunt comments, Lobsters, Reddit (until the subreddit's rules have been read and allow it), and dev.to promotional articles. Stack Overflow gets nothing, because its policy bans LLM *drafting*, not only posting ([gen-ai-policy](https://stackoverflow.com/help/gen-ai-policy), fetched 2026-11-27). A fact sheet has a fixed set of keys, and a lint rejects anything else. A label never turns a banned action into an allowed one.
4. **Every label field is written explicitly, never left out.** YouTube's `paidProductPlacementDetails.hasPaidProductPlacement` stopped defaulting to false on 2026-11-16 ([revision history](https://developers.google.com/youtube/v3/revision_history)), so an omitted field now means "undeclared". The YouTube AI label *is* settable through the API (`status.containsSyntheticMedia`, added 2024-10-30). LinkedIn has no AI field, so its only author-set AI disclosure is a text line.
5. **Disclosures go before the fold:** in the first line of a post, and inside a video before the sponsored mention. A platform toggle, a description line or a hashtag alone never counts. Whether the law requires a disclosure is decided by the marketing sub-program (`marketing-voice-ai-authorship`). Where it sits, and which field carries it, is decided here.
6. **Platform facts live in one dated registry per platform, inside the catalog, and never in skill prose.** This artifact ships 25 seed rows for six platforms. On 2026-11-27, 19 of them were re-fetched live and matched their `expect` pattern, and the other 6 are LinkedIn rows. Each row carries the agent's own fetch date, because 28 of 28 sampled LinkedIn help pages show only a relative age and 9 of 9 YouTube Help pages show no date at all. The refresh interval depends on the kind of fact. CI fails when a row is overdue. A weekly job re-fetches each page and checks it against the row's `expect` pattern. It never fetches LinkedIn or other hosts that block scripts or ban automated access. A human refreshes those rows by hand.
7. **Each organisation keeps one `channels.yml` and links only what it lists.** A handle whose ownership has not been proven is never linked. A 403 or a login wall means "not provable", never "absent".
8. **The fleet violates the inventory and automation rules today.** There is no `channels.yml` in either org. A Discord webhook posts automatically with no recorded approval. A grep for literal endpoint URLs misses it, because the URL is held in a secret, so the boundary check also greps for publishing secret names. A YouTube channel of inferred ownership exists, linked from nowhere. The ocx gitleaks configuration cannot catch a leaked Discord webhook URL.

## Conflicts resolved

| # | Conflict | Decision | Why |
|---|---|---|---|
| 1 | Is YouTube's AI label settable by API? action-boundary 3.3: "no API field found", Studio only. platform-labels: `status.containsSyntheticMedia`, writable on `videos.insert` and `videos.update`. | **It is settable by API.** CH-CORE-06 requires the field in the package. | platform-labels read the [revision history](https://developers.google.com/youtube/v3/revision_history) entry dated 2024-10-30. The sibling `channel-youtube/yt-upload-metadata-contract.md:95` confirms it from the videos resource page. action-boundary only searched the Help page, and that page does not name API fields. |
| 2 | X automated-account label. action-boundary quotes "Enable the 'Automated' profile label" as a requirement ([developer guidelines](https://docs.x.com/developer-guidelines.md)). platform-labels says the label help page returned 403 and the label is "in testing", based on a search result only. | **The requirement stands without a hedge (revised 2026-11-27).** Registry row X-F01. | Re-fetched 2026-11-27 with `curl -sL https://docs.x.com/developer-guidelines.md` (last-modified 2026-11-27): "All automated accounts using the X API must meet these requirements: **1. Enable the 'Automated' profile label** ... Enable it in your app settings." The 403 page was a help page, not this one, and the "in testing" claim is an unopened snippet. Whether the toggle is live on a given account is still unobservable from outside, so CH-CORE-02 makes it an attested gate, not a command. |
| 3 | Refresh intervals. action-boundary: 90 days for policy, 30 for limits and prices. facts-inventory: 180 for hard limits, 90 for policy. platform-labels: 90 for fields, 30 within two months of an effective date. | **180 days for hard limits. 90 for policy, API fields, label triggers, behaviour claims and third-party statistics. 30 for prices and metered costs, and for any fact within 60 days of a stated effective date. LinkedIn ads specifications: 90.** Event dates expire on the date. | The 180-day value rests on a measurement: one numeric-limit edit per about 25 page-months on GitHub Docs. action-boundary's 30 days for limits had no measured basis. Prices are the exception that moved: X per-post pricing took effect 2026-04-20. LinkedIn ads help pages were edited at a 105-day median against 547 days for organic pages (facts-inventory, cadence per platform). |
| 4 | Registry schema. action-boundary and platform-labels store a `recheck_by` date. facts-inventory stores `verified`, `refresh_days` and an `expect` regex. | **facts-inventory's schema, plus a `platform` column.** | A stored `recheck_by` duplicates `verified + refresh_days` and can drift from it. Only `expect` detects a page that changed while its date was still valid. The dive measured that this is the real failure: LinkedIn now writes `3000` and `100MB` where the scouts wrote `3,000` and `100 MB`. |
| 5 | LinkedIn posting. action-boundary rule 12 (SHOULD): post through the Posts API when the account owner starts it. The consolidated sibling CH-LI-01: never call a LinkedIn posting API or a scheduler. | **The agent never calls it (CH-CORE-01), in line with CH-LI-01.** | The [API Terms](https://www.linkedin.com/legal/l/api-terms-of-use) (revised 2022-12-13) list "automate posting" as prohibited. action-boundary itself calls its reconciliation "my reading, not a LinkedIn statement". The stricter consolidated rule wins, and one boundary must not contradict another. |
| 6 | Who decides the YouTube AI-use answer. platform-labels rule 2: the agent decides from the four cases. `yt-upload-metadata-contract` rule 17: as the human decided, never inferred. | **The agent pre-fills `ai_use` with the registry row it matched, and the human confirms it in the upload step they perform anyway. A borderline case goes to `open_asks`.** | The agent can judge the clear cases from the published list, and leaving the field empty makes the human guess. Realism in a stylised case is a judgement call, so the agent asks. |
| 7 | action-boundary's failure-mode table applies X's "Never post identical or substantially similar content across multiple accounts" to cross-posting on X, Bluesky and Mastodon. | **The clause covers multiple X accounts run by one developer. It says nothing about cross-platform posts.** Cross-platform variants belong to `channel-microblog/mb-variant-validator.md`. | The quoted text is in X's [Developer Policy](https://docs.x.com/developer-terms/policy) and is scoped to accounts on X. |
| 8 | EU timing. platform-labels CONSIDER rule 15 relies on a 2026-12-02 grace period under Article 50(2). | **Dropped.** | The marketing dive `marketing-voice-ai-authorship/voice-ai-disclosure.md` (Summary) reads the Commission guidelines (para 153): the grace covers providers' machine marking only, and the deployer labelling duty has applied since 2026-08-02. Law belongs to the marketing sub-program. |
| 9 | Exceptions. action-boundary allows human-approved labelled bots on five platforms. platform-labels rule 9: never publish through an API without consent for each action. | **Both hold at different levels.** A bot exists only when the owner commissions it and records it (CH-CORE-02). An agent never commissions a bot, and never posts outside one. | X, Bluesky, Threads, Mastodon and Discord document labelled automation, so a total ban would forbid what the platforms permit. The consent requirement then binds whoever runs the bot. |
| 10 | Inventory fields and location: three proposals. | **One `channels.yml` per organisation, at the root of the repository that owns its main website, with the path declared in that repository's agent instructions.** Fields merged as in CH-CORE-17. | Neither org has a `.github` repository (both return 404, distribution-posture.md:221), which would be the platform-native home. |
| 11 | "Unobservable" (platform-labels rule 14) and "403 is not absence" (facts-inventory rule 14) were separate rules. | **Merged into CH-CORE-19.** | Same mechanism: a failed probe is recorded as a failed probe. |
| 12 | Scope. CH-CORE-01 said "any platform", but the territory includes GitHub and package registries, where releases and `npm publish` are normal coding-agent acts, and no dive source covers them. | **CH-CORE-01 covers the 15 matrix venues only. GitHub and the registries are out of scope and governed by `channel-github`** (added 2026-11-27). | The dives' clauses are all from social and community venues. GitHub's AUP bars only bulk and inauthentic automation, and `channel-github` already gates live card fields (CH-GH-04), releases (CH-GH-07 to CH-GH-12) and scripted stars (CH-GH-27). |

## The ruleset

Rule file `channel-publishing`. Depth files go in `skills/channel-publishing-reference/`, following the catalog convention in commit afd517e ("rules require a <set>-reference skill for their depth files"). The facts registry is `skills/channel-publishing-reference/facts/<platform>.md`. The checks go in `skills/channel-publishing-reference/checks/`, with planted fixtures under `checks/fixtures/<block>/fail` and `checks/fixtures/<block>/pass`. A verification cell that names a block (`cab-01`) means the fenced block of that name in [Check commands](#check-commands). Every block there was run on 2026-11-27 and watched red on a plant and green on a twin. Scripts named below that are not in that section (`facts-stale.py`, `channels-lint.py`) are authored together with the rule, and each must include a planted failing fixture.

### Boundary

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CH-CORE-01 | **Scope:** LinkedIn, YouTube, X, Bluesky, Threads, Mastodon, Discord, TikTok, Reddit, Hacker News, Lobsters, Product Hunt, dev.to, Stack Overflow and BetaList. On these, end every task at a publish package. Never call a write endpoint (post, reply, comment, like, follow, upload, visibility or metadata change, listing submission or payment), and never drive the web UI. The only exception is a CH-CORE-02 bot. The package is a draft file whose header holds `platform`, `account`, `action`, `labels`, `ai_role`, `sponsored`, `spend`, `open_asks`, `approved_by` and `approved_at`. The agent leaves the last two empty. **Out of scope:** GitHub (releases, About, topics, social preview, Discussions) and package registries (npm, PyPI, crates.io, VS Code Marketplace, GHCR). They follow `channel-github` CH-GH-04, CH-GH-07 to CH-GH-22 and CH-GH-27. | YouTube requires consent for each action ([policies](https://developers.google.com/youtube/terms/developer-policies), 2026-11-06). LinkedIn UA 8.2 bans bots (effective 2025-11-03). HN bans automated posting. The Product Hunt API has a write scope, and its docs say it "must not be used for commercial purposes" ([API docs](https://api.producthunt.com/v2/docs), undated, fetched 2026-11-27). GitHub's [AUP section 4](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies) (source last changed 2026-07-09) bars "automated excessive bulk activity" and "automated starring or following", not release automation. Re-check every 90 days through the registry rows. | Block `cab-01`. Every file it lists is the `runs_from` of a CH-CORE-02 row. It lists the planted `fail` workflow and nothing for the `pass` twin. It searches literal endpoints and publishing secret names, because the fleet's one automation holds its webhook URL in a secret (measured below). `rg -n -i 'playwright\|puppeteer\|selenium' <channel skills>` finds nothing. Every package header has all ten keys. | MUST |
| CH-CORE-02 | Run unattended posting only as owner-commissioned automation on X, Bluesky, Threads, Mastodon or Discord, never elsewhere. Each instance needs a `channels.yml` row with `automation: bot`, `approved_by`, `credential` (a secret name), `labels_required`, `runs_from` (the repository-qualified file that posts), `gates_attested` (the gate ids below for its platform), `attested_by` and `attested_at`, and on X a `spend_cap`. **Gates.** `x-label`: the Automated profile label (X-F01). `x-bio`: a bio that names the operator. `x-human`: a link to a human-managed account. `x-summoned`: programmatic replies only when the post's author summoned the account (X-F02). `bs-label`: the `bot` self-label on the profile (BS-F01). `bs-optin`: interaction only with accounts that tagged the bot (BS-F02). `th-ai`: `is_made_with_ai=true` on AI content (TH-F01). `ma-flag`: the bot flag (MA-F01). `ma-rule6`: the instance's AI disclosure, in the post text (MA-F02). `dc-nobot`: a bot application or webhook, never a self-bot. An agent may propose such a system but never creates one. | The gates are the platforms' own conditions. The X list is a requirement for "all automated accounts using the X API" ([guidelines](https://docs.x.com/developer-guidelines.md), re-fetched 2026-11-27), and the summon rule is from the [changelog](https://docs.x.com/changelog) (2026-02-23; pricing effective 2026-04-20). Bluesky calls the self-label "a best practice" ([bot tutorial](https://atproto.com/guides/bot-tutorial), undated page, text added to its source repository 2026-03-19). Making it required is this rule's choice. Mastodon treats the bot flag as "a visual indication only" ([profile docs](https://docs.joinmastodon.org/user/profile/), updated 2026-04-15), so the flag never replaces the rule-6 text disclosure ([mastodon.social rules](https://mastodon.social/api/v1/instance/rules), ToS effective 2026-08-31). Threads: [posts](https://developers.facebook.com/docs/threads/posts) (2026-10-30). Discord: [guidelines](https://discord.com/guidelines) (2025-09-29). Re-check every 90 days, and every 30 days for X prices. | (1) Every file block `cab-01` lists is a row's `runs_from`. (2) `channels-lint.py` checks that each bot row has all keys, lists every gate id of its platform in `gates_attested`, has an absolute `attested_at` no older than 90 days, and on X has a non-empty `spend_cap`. (3) Block `cab-02` exits 0 for every Bluesky row (`bs-label`) and every Mastodon row (`ma-flag`). (4) `x-label`, `x-bio`, `x-human`, `x-summoned`, `bs-optin`, `ma-rule6` and `dc-nobot` have no command. X profile fields need an API key, and reply triggers sit in code. They are `unverified: attested by a human`, and the row is the evidence. | MUST |
| CH-CORE-03 | For Hacker News (posts and comments), Product Hunt comments, Lobsters, Reddit (until CH-CORE-05 clears the subreddit) and dev.to promotional articles, output only a fact sheet. It has one heading, `## Fact sheet, the human writes the post`, followed only by bullets of the form `- <key>: <value>`. The keys are `version`, `install`, `repository`, `measured` (a figure with `(command: ...)`), `limit` and `motive`. `motive` stays blank for the human. Values have at most 20 words outside backticks and no first-person or second-person pronoun. Produce no title, no first comment and no other prose. A label never makes paste-ready text acceptable. | HN: "Don't post generated text or AI-edited text." PH: "No LLMs or Chrome extensions please!" ([2025-07-28](https://help.producthunt.com/en/articles/10030102-commenting-guidelines)). dev.to bars AI-assisted articles from promoting "any business, program, or course (including your own)" ([edited 2023-01-09](https://dev.to/devteam/guidelines-for-ai-assisted-articles-on-dev-17n6)). Lobsters bars self-promotion in an account's first 70 days ([about](https://lobste.rs/about), undated). Any LLM rewrite counts as AI-edited, so the skill does not try to find the line. The 20-word cap is a starting value, chosen so that a value holds a fact and not a pitch. | Block `cab-03` prints nothing. It fails a title line, any other heading, a line that is not a key, a filled `motive`, a pronoun, and a value over 20 words. | MUST |
| CH-CORE-04 | Produce no Stack Overflow content of any kind: no answer draft, no outline, no question text. At most, list the cited sources the human may read. | "Please do not draft content for Stack Overflow using large language model (LLM) services" ([gen-ai-policy](https://stackoverflow.com/help/gen-ai-policy), no page date, fetched 2026-11-27). | The skill refuses the venue and quotes the clause with its registry id. `rg -il 'stackoverflow' <outputs>` lists no draft files. | MUST |
| CH-CORE-05 | Before drafting for a venue whose rules are set per community (a subreddit, a Mastodon instance other than mastodon.social and mastodon.online, a Discord server, a forum), fetch that community's rules in the same session. Start the output with `rules_fetched: <YYYY-MM-DD> <url>` and a second line `rules_quote: "<one rule, verbatim, at least 8 words>"`. If the fetch fails, apply CH-CORE-03. | Subreddit rules were unfetchable in this pass (reddit.com returned 403 and the fetch tool blocked it). Rules differ per community. Reddit's own User Agreement was revised 2026-05-26. A date stamp alone can be written without a fetch. A verbatim quote that a check finds on the live page cannot be. | Block `cab-05` prints nothing. It re-fetches the URL and fails when the quote is absent or shorter than 8 words. On a host that blocks scripts it prints a FAIL line that a human clears by reading the page. Without the two lines, the deliverable must pass `cab-03`. | MUST |

### Labels and placement

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CH-CORE-06 | Fill every label field the target platform has, as an explicit `true` or `false`, in the package's `labels:` block. **YouTube:** `status.containsSyntheticMedia` (Studio "AI use"), and `paidProductPlacementDetails.hasPaidProductPlacement`. **X:** `made_with_ai` and `paid_partnership`. **Threads:** `is_made_with_ai`, on the container-creation call only. **TikTok:** `is_aigc`, plus `brand_content_toggle` or `brand_organic_toggle`. **LinkedIn:** no AI field exists, so add the text line defined in CH-LI-16, and list "Brand partnership toggle" as a manual step for each post. **Bluesky and Mastodon:** no AI label exists, so the disclosure goes in the text. | Omission now means "undeclared" on YouTube (2026-11-16, [revision history](https://developers.google.com/youtube/v3/revision_history)). Threads ignores the flag on the publish call ([docs](https://developers.facebook.com/docs/threads/posts), 2026-10-30). LinkedIn's toggle resets to Off for every post ([a1627083](https://www.linkedin.com/help/linkedin/answer/a1627083), "3 years ago" at 2026-11-27). X `paid_partnership` was added 2026-06-03. TikTok fields are from the [Direct Post reference](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post) (2026-11-25). Re-check every 90 days. | A lint reads the target platform's field list from the registry and fails on any missing key. A Threads test asserts that `is_made_with_ai` appears in the `/threads` request and not in `/threads_publish`. An agent that names a LinkedIn AI field, or a Bluesky or Mastodon AI label, fails the registry lookup. | MUST |
| CH-CORE-07 | Decide each AI-label value from that platform's registry trigger rows, and record `ai_use: yes\|no, case: <id>`. The id is a registry row whose `fact` starts `trigger:` (then `yes`) or `exemption:` (then `no`). Two other values are allowed: `no-ai` (with `no`) when no AI touched the media, and `borderline`, which needs an `open_asks` entry naming `ai_use`. On YouTube the triggers are YT-F03 to YT-F06 (a real person shown saying or doing something they did not, altered footage of a real event or place, a generated realistic scene, music as the main focus) and the exemptions are YT-F07 to YT-F09 (AI help with a script, title, thumbnail or infographic, captions, the creator's own cloned voice). | YouTube lists both the cases and the exemptions ([14328491](https://support.google.com/youtube/answer/14328491), undated, re-fetched 2026-11-27). TikTok requires a label on realistic or significantly edited content from 2026-09-24 ([guidelines](https://www.tiktok.com/community-guidelines/en/integrity-authenticity)). A blanket Yes is as wrong as a blanket No. | Block `cab-07` prints nothing. It fails an id that is not in the registry, `yes` on an exemption row, `no` on a trigger row, a free-text case, and `borderline` without an ask. The check proves that the case exists and agrees with the value. Whether the agent matched the right case is confirmed by the human in the upload step (conflict 6). | MUST |
| CH-CORE-08 | Place every sponsor, material-connection or required AI disclosure before the fold. In a post, use the first line, before any "see more" cut, with a plain word such as `Ad:` or `Paid partnership:`. In a long video, disclose spoken and on screen, before or at the first sponsored mention. In a Short or Reel, use burned-in text in the first seconds. In a thread, put it in the first post and again in any later post that makes the claim. In a LinkedIn document, put it in the post text and on slide 1. A platform toggle, a description line or a hashtag alone does not count. | The FTC says a disclosure is clearest "in the video itself" and must be visible without clicking "more" ([FTC Q&A](https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking), undated capture). The EU Code of Practice puts video labels at the start and at intervals (per `marketing-voice-ai-authorship`). The legal standard belongs to the marketing sub-program. | The offset lint passes when the disclosure's character offset or timestamp is below the first product-name offset. With `sponsored: true`, the first line matches `(?i)^(ad\|sponsored\|paid partnership\|in partnership with)`. Fail: a sponsor line that appears only in the description or after the cut. | MUST |
| CH-CORE-09 | Generate images and video with a tool that writes C2PA Content Credentials, and also write IPTC `DigitalSourceType` into XMP. Never rely on metadata as the only disclosure. | LinkedIn reads C2PA ([a6282984](https://www.linkedin.com/help/linkedin/answer/a6282984)). Instagram read IPTC but not C2PA in one March 2026 study ([IPTC, 2026-03-18](https://iptc.org/news/ai-disclosure-on-social-media-a-work-in-progress/), independent, one study). YouTube "will carry forward disclosures from tools and creators available with secure Content Credentials (C2PA) 2.1 or higher that indicate the entire video was made with AI" ([15447836](https://support.google.com/youtube/answer/15447836?hl=en), undated, re-fetched 2026-11-27). Measured 2026-11-27: a C2PA test image that carries `digitalSourceType` inside its manifest had no XMP `DigitalSourceType`, so the two must be written separately. Metadata can be stripped. | Block `cab-09`. `c2patool <file>` exits 0 and prints a manifest, and exits 1 with `Error: No claim found` on an unsigned file. `exiftool -s3 -DigitalSourceType <file>` exits 0 even when the tag is absent, so the check tests for non-empty output. | SHOULD |

### Credentials

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CH-CORE-10 | In every repository that holds or may hold a publishing credential, extend the gitleaks configuration with a `discord-webhook-url` rule and a `google-oauth-refresh-token` rule, because the gitleaks defaults have neither. Allowlist fixture placeholders by path, never by value. | A Discord webhook URL embeds "the secure token" ([webhook resource](https://discord.com/developers/docs/resources/webhook)), so it is a bearer credential. Measured 2026-11-27: `curl -sL https://raw.githubusercontent.com/gitleaks/gitleaks/v8.30.1/config/gitleaks.toml \| grep -n 'id = "discord'` prints only `discord-api-token`, `discord-client-id` and `discord-client-secret`, with no webhook rule and no Google refresh-token rule. The fleet holds webhook-shaped placeholders in 2 test files (core-agent-action-boundary 3.8). | The config contains `id = "discord-webhook-url"` and `id = "google-oauth-refresh-token"`, using the regexes in core-agent-action-boundary, "The secret-scan check". `gitleaks git --redact --exit-code 1 -c .gitleaks.toml` (history) and `gitleaks dir --redact --exit-code 1 -c .gitleaks.toml .` (working tree) both exit 0. | MUST |

### Facts registry

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CH-CORE-11 | Take every platform limit, field name, label trigger, price and policy clause from a registry row, and cite its id in square brackets (`[LI-F01]`) in the same line. Never take one from memory or from a search snippet. When the platform has no registry file, or no row for the fact, state no number and quote no clause for it. When its page cannot be fetched, write no row. In both cases apply that platform's strictest default (CH-CORE-01 plus CH-CORE-03) and name the gap in the output. A figure the product team measured itself carries its command instead of an id. | Platform facts moved within the last 24 months: X reply gating (2026-02-23), X pricing (2026-04-20), YouTube's paid-placement default (2026-11-16), TikTok AI labels (2026-09-24). Training data predates some of these changes. These primary pages returned 403 or 404 in this pass: Reddit Responsible Builder Policy, Product Hunt Terms, Discord Developer Policy. An agent otherwise invents the clause. This rule can pass from day one because [Seed registry rows](#seed-registry-rows) ships 25 rows. | Block `cab-11` prints nothing. It fails a line with a platform unit or a price that carries no registry id and no `(command: ...)`, and an id that is not in the registry. Watched red on a planted "1,300 characters" fold figure with no id. | MUST |
| CH-CORE-12 | Give each registry row the columns `id, platform, fact, value, url, source_date, verified, refresh_days, provenance, expect`. `id` matches `[A-Z]+-F[0-9]+`. `source_date` takes one of three forms: the page's absolute date, `relative:<text>@<fetch date>`, or `none`. `verified` is the agent's own fetch date. `refresh_days` is `30`, `90`, `180` or `expires:<date>`. `provenance` is one of `platform`, `authority`, `independent` or `vendor`. `expect` is a non-empty regex that tolerates numeral formats (`3,?000 characters`, `100 ?MB`). No cell holds a literal `\|`, so `expect` uses no alternation. Keep one registry per platform, shared by every skill. Never use per-skill copies. | 28 of 28 LinkedIn help pages show only a relative age, and 9 of 9 YouTube Help pages show no date (facts-inventory, finding 3). One LinkedIn limit is used by four scouts' skills, so per-skill copies would give one fact four verified dates. | Block `cab-12` prints nothing. It checks the column count, the url form, the three `source_date` forms, the `verified` date, the `refresh_days` values, the provenance enum and a non-empty `expect`. Watched red on a planted row with `2 years ago` as `verified`, `official` as provenance and a 5-column row. Green on the 25 seed rows under gawk 5.2.1 and busybox awk. | MUST |
| CH-CORE-13 | Set `refresh_days` to 180 for hard limits. Set it to 90 for policy, API fields, label triggers, behaviour claims, third-party statistics and LinkedIn ads specifications. Set it to 30 for prices, metered costs and any fact within 60 days of a stated effective date. Give event deadlines `expires:<date>` instead. Fail CI when `verified + refresh_days < today`, or when an `expires` date has passed. | Measured: one numeric-limit edit per about 25 page-months on GitHub Docs, and a 40.5-day median between page edits. LinkedIn ads pages are edited about five times as often as organic pages. Prices were the facts that moved. The intervals are starting values (see Decay). | `python3 -I skills/channel-publishing-reference/checks/facts-stale.py skills/channel-publishing-reference/facts/*.md` exits 1 and prints each overdue id with its days overdue. Its fixture with `verified: 2025-01-01` must exit 1, and a fresh row must exit 0. | MUST |
| CH-CORE-14 | Re-fetch every row's `url` weekly in a job that does not block merges, and open an issue when `expect` no longer matches. Never fetch a host that bans automated access or blocks scripts: `linkedin.com`, `producthunt.com`, `help.x.com`, `reddit.com`, `reddithelp.com` and `ftc.gov`. The job lists those rows as `MANUAL` with their due date, and a human re-reads the page and updates `verified`. A 403, 429 or 999 is reported as `UNREACHABLE`, never as a change. Never use Wayback capture counts or capture dates as change evidence. | A page that changes while its date is still valid is the real failure. LinkedIn UA 8.2 bans "bots or other unauthorized automated methods to access the Services". The catalog's own link checker already stops checking LinkedIn and X (`skills/docs-quality-reference/checks/lychee.toml:27-32`). Product Hunt help and FTC pages returned 403 to curl in this pass. CDX digest counts overcounted real edits 20 to 40 times on docs.github.com, and later LinkedIn captures were empty JS shells (facts-inventory, finding 2). The dive itself curl-fetched 28 LinkedIn help pages once, and all returned 200. That one-time research fetch is no precedent for a scheduled job. | Block `cab-14`. On the seed rows it printed 6 `MANUAL` lines (the LinkedIn rows) and nothing else, so 19 of 19 fetched rows matched. A planted row with an `expect` that is not on its page printed `CHANGED`. `rg -n 'web\.archive\.org' skills/channel-publishing-reference/facts/` finds hits only in `history` notes. | SHOULD |
| CH-CORE-15 | Never turn a `vendor` or `independent` figure into a MUST rule or a lint threshold. Every threshold cites a row whose provenance is `platform` or `authority`, and that row's url host must be on a human-kept allowlist (`facts/hosts.txt`, one `<host> <provenance>` per line). In prose, a vendor figure carries its tag, date and sample size. | Reach and engagement figures (Buffer, Socialinsider, Zoom) are claims, not platform limits, and the scouts' tables held them beside platform limits (facts-inventory, Dated facts). No dive observed an agent turning one into a threshold, so this is a SHOULD. An agent that writes both the row and its provenance can mislabel it, so the host decides, not the tag. | Each lint threshold in a channel skill names a row id. Block `cab-15` prints nothing. Watched red on a planted `buffer.com` row tagged `platform`, and green on the 25 seed rows against an 8-host allowlist. | SHOULD |
| CH-CORE-16 | **Retired 2026-11-27, merged into CH-CORE-11.** It said: when a platform page cannot be fetched, write no row, quote no clause, apply the strictest default and name the gap. | Its only check was a human review of quoted strings, and its text restated CH-CORE-11. | See CH-CORE-11. | retired |

### Channel inventory

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CH-CORE-17 | Keep one `channels.yml` per organisation, at the root of the repository that owns its main website, with the path declared in that repository's agent instructions. Each row has `id, platform, handle, url, status (active\|planned\|retired\|squatted\|none), ownership (proven\|inferred), verified_by, owner_role, automation (none\|drafts\|bot), approved_by, labels_required, credential, last_checked, linked_from`. A row with `automation: bot` adds `runs_from`, `gates_attested`, `attested_by`, `attested_at` and, on X, `spend_cap` (CH-CORE-02). A platform the organisation decided against gets a `status: none` row, so an agent can tell a deliberate absence from a gap. | Without the file, an agent invents handles or omits them (distribution-posture pattern 8). An agent cannot tell "no channel" from "not listed". | `python3 -I skills/channel-publishing-reference/checks/channels-lint.py channels.yml` validates required keys, the enums and an absolute `last_checked`. `owner_role` names a role, not a person. | MUST |
| CH-CORE-18 | Link only channels listed in `channels.yml`. Run the inbound-link check before merging any README, nav, footer, team page or release note that names a channel. **Forward:** every `active` row's `url` appears in each file listed in its `linked_from`. **Reverse:** every channel-host URL in owned sources matches a row. **Staleness:** a `last_checked` older than 90 days warns, and older than 180 days fails. **Zero links:** `retired` and `planned` rows have no links. Resolve reference-style Markdown definitions. Exclude `.agents`, `.claude/artifacts`, `**/test/**`, `**/fixtures/**`, lock files and `node_modules`. | The YouTube channel is linked from 0 of 17 repositories. The Discord invite appears on 4 OCX surfaces and 0 Grimoire surfaces. 26 of 33 raw Discord hits in `ocx-sh/website` are test fixtures. `ocx-sh/ocx/README.md:86` holds the invite as `[discord]: https://...`, which a grep for `](https://discord` misses. | `git grep -nIiE 'discord\.(gg\|com/invite)/\|youtube\.com/@\|youtu\.be/\|linkedin\.com/(in\|company\|showcase)/\|(x\|twitter)\.com/[A-Za-z0-9_]+\|bsky\.app/profile/' -- . ':!.agents' ':!.claude/artifacts' ':!**/test/**' ':!**/fixtures/**' ':!*.lock'`, then `grep -En '^\[[^]]+\]: *https?://'`. Each hit maps to a row, and each `linked_from` file contains its row's URL. | MUST |
| CH-CORE-19 | Never set `status: active` or a non-empty `linked_from` while `ownership: inferred`. A human checks while logged in and records `verified_by`. Record a 403, a 999, a login wall or a missing API key as `verified_by: not provable (<code>, <date>)`, or as label state `unobservable`. Never record any of these as absent, `none` or `retired`. | A handle resolver returned the wrong channel for 9 of 29 handles, and squatted handles exist (exemplar-youtube-channels, smell 1). LinkedIn refuses unauthenticated profile probes ([a1341387](https://www.linkedin.com/help/linkedin/answer/a1341387)). `videos.list` returned 403 without a key. | No row combines `ownership: inferred` with a non-empty `linked_from`. No row has `status: retired` or `none` whose only evidence is an HTTP code. | MUST |

Dropped as generic or as covered elsewhere: AI-label-as-licence (folded into CH-CORE-03), scheduling through a human-operated tool (folded into CH-CORE-01), stamping measured claims and naming refresh commits (already the research convention: "inline each command next to its result", `.claude/skills/research-lang/references/prompt-contracts.md:45-46`; rule files carry dated measurement notes, for example `rules/shell-quality.md:199`), "never put a credential in a repository" (generic, and `channels.yml` already records secret names only; CH-CORE-10 keeps the non-obvious gitleaks additions), TikTok audit status (covered by CH-CORE-01, since TikTok is not a fleet channel), the EU grace date (conflict 8).

## Check commands

Run from the catalog root, except `cab-01`, which runs in each repository that may publish. Empty output is a pass unless a block says otherwise. Each block was run on 2026-11-27 under GNU Awk 5.2.1, busybox awk, POSIX `sh`, git 2.43.0 and curl. The plant and the twin named after each block are the fixtures that ship with it. Invoke `grep` and `git` as system binaries in scripts, because an interactive shell function of the same name broke the first fleet run of `cab-01`.

**`cab-01`, the boundary grep (CH-CORE-01, CH-CORE-02).** `REPO` is the repository's qualified name, for example `ocx-sh/ocx`.

```sh
P='api\.linkedin\.com/(rest|v2)/(posts|ugcPosts)|/2/tweets|threads_publish|com\.atproto\.repo\.createRecord|youtube/v3/videos|/api/v1/statuses|discord(app)?\.com/api/webhooks|open\.tiktokapis\.com|(oauth|www)\.reddit\.com/api/(submit|comment)|news\.ycombinator\.com/(submit|comment)|api\.producthunt\.com/v2/api/graphql'
Q='secrets\.[A-Z0-9_]*(DISCORD|WEBHOOK|LINKEDIN|TWITTER|X_API|BLUESKY|BSKY|MASTODON|THREADS|YOUTUBE|REDDIT|PRODUCTHUNT|TIKTOK)[A-Z0-9_]*'
git ls-files -z -- skills .claude/skills .github/workflows \
  ':!skills/channel-publishing-reference/facts' ':!skills/channel-publishing-reference/checks' \
  | xargs -0 -r grep -lE -e "$P" -e "$Q" -- \
  | while read -r f; do grep -qF "runs_from: $REPO/$f" "$CHANNELS_YML" || echo "UNLISTED $REPO/$f"; done
```

The registry and the checks are excluded because they name these endpoints on purpose. Endpoint names in other skill prose go into a registry row instead (CH-CORE-11). Sources for the patterns that are new in this revision: the Reddit `/api/:action` route and its `POST_submit` and `POST_comment` handlers are in Reddit's archived source (`r2/r2/config/routing.py:414`, `r2/r2/controllers/api.py:449,2043`, [reddit-archive/reddit](https://github.com/reddit-archive/reddit), archived, last push 2017-10-17), and `https://oauth.reddit.com/api/submit` answered 403, not 404, on 2026-11-27. `news.ycombinator.com/submit` and `/comment` serve `<form method="post">` (curl, 2026-11-27). The Product Hunt endpoint is `https://api.producthunt.com/v2/api/graphql` ([API docs](https://api.producthunt.com/v2/docs)). Watched: the plant `fail/.github/workflows/post.yml` (`curl -X POST https://api.linkedin.com/rest/posts`) is listed, and the twin `pass/.github/workflows/post.yml` (`echo draft only > post.md`) is not. Fleet run, 16 product repositories plus grimoire-lore, the `ls-files` and `grep` lines only: the endpoint pattern alone listed 0 files, and with the secret-name pattern it listed 1 file, `ocx-sh/ocx/.github/workflows/notify-discord.yml` (`webhook: ${{ secrets.DISCORD_WEBHOOK }}` at lines 53-125).

**`cab-02`, the profile reads (CH-CORE-02).** Exit 0 passes.

```sh
curl -s "https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=$HANDLE" \
  | python3 -I -c "import json,sys; d=json.load(sys.stdin); sys.exit(0 if any(l.get('val')=='bot' and l.get('src')==d['did'] for l in d.get('labels',[])) else 1)"
curl -s "https://$INSTANCE/api/v1/accounts/lookup?acct=$ACCT" \
  | python3 -I -c "import json,sys; sys.exit(0 if json.load(sys.stdin).get('bot') is True else 1)"
```

Watched: `orfnewsbot.bsky.social` exited 0 and `bsky.app` exited 1. On mastodon.social, `Roadworks_Report` (a bot found through `/api/v1/directory`) exited 0 and `Gargron` exited 1.

**`cab-03`, the fact-sheet lint (CH-CORE-03).** `awk -f factsheet.awk <deliverable>`.

```awk
BEGIN { H = "## Fact sheet, the human writes the post" }
/^[[:space:]]*$/ { next }
/^#/ { if ($0 != H) print FILENAME ":" FNR ": heading not allowed"; else seen = 1; next }
{
  if (!seen) { print FILENAME ":" FNR ": text before the fact-sheet heading"; next }
  if ($0 !~ /^- (version|install|repository|measured|limit|motive):/) { print FILENAME ":" FNR ": not a fact-sheet key"; next }
  v = $0; sub(/^- [a-z]+:[[:space:]]*/, "", v); gsub(/`[^`]*`/, "", v)
  if ($0 ~ /^- motive:/ && v != "") print FILENAME ":" FNR ": motive must stay blank"
  if (tolower(" " v " ") ~ /[^a-z](i|we|our|us|my|you|your)[^a-z]/) print FILENAME ":" FNR ": first or second person"
  if (split(v, w, /[[:space:]]+/) > 20) print FILENAME ":" FNR ": value over 20 words"
}
END { if (!seen) print FILENAME ": no fact-sheet heading" }
```

Watched: the plant (a `Title:` line, "We built this because our team...", a filled `motive`, a call to action, a `## First comment` heading) printed 5 lines. The twin (six keys, a command in backticks, a blank `motive`) printed nothing.

**`cab-05`, the rules-fetch proof (CH-CORE-05).** `sh rulesq.sh <package>`.

```sh
P=$1
u=$(sed -n '1s/^rules_fetched: 20[0-9][0-9]-[01][0-9]-[0-3][0-9] \(https:[^ ]*\)$/\1/p' "$P")
q=$(sed -n 's/^rules_quote: "\(.*\)"$/\1/p' "$P")
[ -n "$u" ] || { echo "FAIL $P: line 1 is not rules_fetched: <date> <url>"; exit 1; }
[ "$(printf '%s' "$q" | wc -w)" -ge 8 ] || { echo "FAIL $P: rules_quote missing or under 8 words"; exit 1; }
curl -sL --compressed -m 40 "$u" | sed 's/<[^>]*>/ /g' | tr -s ' \n' '  ' | grep -qF -- "$q" \
  || echo "FAIL $P: quote not found on $u (re-read by hand if the host blocks scripts)"
```

Watched against `https://mastodon.social/api/v1/instance/rules`: the rule-6 sentence passed, an invented "Self-promotion is limited to one post per week" sentence failed, and a package without a quote failed.

**`cab-07`, the AI-use lookup (CH-CORE-07).** `awk -f aiuse.awk facts/<platform>.md <package>`.

```awk
BEGIN { FS = "|" }
NR == FNR { if ($0 ~ /^\| [A-Z]+-F[0-9]+ /) { id = $2; f = $4; gsub(/[[:space:]]/, "", id); sub(/^[[:space:]]+/, "", f); kind[id] = f }; next }
/^ai_use:/ {
  seen = 1; line = $0
  if (line !~ /^ai_use: (yes|no), case: [A-Za-z0-9-]+$/) { print FILENAME ":" FNR ": malformed ai_use"; next }
  split(line, a, /, case: /); v = substr(a[1], 9); c = a[2]
  if (c == "borderline") { border = 1; next }
  if (c == "no-ai") { if (v != "no") print FILENAME ":" FNR ": no-ai needs no"; next }
  if (!(c in kind)) { print FILENAME ":" FNR ": case " c " not in registry"; next }
  if (v == "yes" && kind[c] !~ /^trigger:/) print FILENAME ":" FNR ": yes needs a trigger row"
  if (v == "no" && kind[c] !~ /^exemption:/) print FILENAME ":" FNR ": no needs an exemption row"
}
/^open_asks:.*ai_use/ { asked = 1 }
END { if (!seen) print FILENAME ": no ai_use line"; if (border && !asked) print FILENAME ": borderline without an open_asks entry" }
```

Watched: `yes, case: YT-F03` passed. `yes, case: YT-F07` (an exemption), `yes, case: YT-F99`, `no, case: borderline` without an ask, and "yes because the script was drafted" each printed one line. `borderline` with an `open_asks` line naming `ai_use` passed.

**`cab-09`, media metadata (CH-CORE-09).** Exit 0 passes.

```sh
c2patool "$F" > /dev/null && test -n "$(exiftool -s3 -DigitalSourceType "$F")"
```

Watched with c2patool 0.27.23 (the [c2pa-rs release](https://github.com/contentauth/c2pa-rs/releases/tag/c2patool-v0.27.23) binary) and exiftool 13.64. The fixture `sdk/tests/fixtures/C.jpg` from c2pa-rs printed a manifest whose `digitalSourceType` is `algorithmicMedia`, but exiftool printed nothing for it. `IMG_0003.jpg` printed `Error: No claim found` with exit 1. A copy tagged with `exiftool '-XMP-iptcExt:DigitalSourceType=http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia'` printed the value. On an untagged file exiftool printed nothing and still exited 0. The block exited 1 on `C.jpg` (no XMP tag), on `IMG_0003.jpg` and on the tagged but unsigned copy. It exited 0 on the tagged copy after `c2patool tagged.jpg -m m.json -o both.jpg -f` signed it with the tool's development certificate (a `c2pa.created` action whose `digitalSourceType` is `trainedAlgorithmicMedia`). Write the XMP tag first and sign last, because an edit after signing breaks the manifest's hard binding.

**`cab-11`, registry ids in drafts (CH-CORE-11).** `awk -v DRAFT=<draft> -f factref.awk facts/*.md <draft>`.

```awk
/^\| [A-Z]+-F[0-9]+ / && !draft { split($0, c, "|"); id = c[2]; gsub(/[[:space:]]/, "", id); known[id] = 1; next }
FILENAME == DRAFT { draft = 1 }
draft && /[0-9][0-9,.]* ?(characters|MB|GB|minutes|seconds|pixels|px|hashtags|topics|posts)([^a-z]|$)|\$[0-9]/ {
  line = $0; n = 0
  while (match(line, /\[[A-Z]+-F[0-9]+\]/)) { id = substr(line, RSTART + 1, RLENGTH - 2); n++; if (!(id in known)) print FILENAME ":" FNR ": unknown id " id; line = substr(line, RSTART + RLENGTH) }
  if (!n && $0 !~ /\(command: `/) print FILENAME ":" FNR ": platform number without a registry id"
}
```

Watched: "under 3,000 characters [LI-F01]" passed, "The fold sits at 1,300 characters." failed, "[LI-F77]" failed as unknown, and a measured figure with `(command: ...)` passed.

**`cab-12`, the registry lint (CH-CORE-12).** `awk -f registry.awk facts/*.md`.

```awk
BEGIN { FS = "|" }
function t(s) { gsub(/^[[:space:]]+|[[:space:]]+$/, "", s); return s }
/^\| [A-Z]+-F[0-9]+ / {
  if (NF != 12) { print FILENAME ":" FNR ": " NF-2 " columns, want 10"; next }
  d = "20[0-9][0-9]-[01][0-9]-[0-3][0-9]"
  if (t($6) !~ /^https:\/\/[^ ]+$/) print FILENAME ":" FNR ": url"
  if (t($7) !~ ("^(" d "|relative:.+@" d "|none)$")) print FILENAME ":" FNR ": source_date"
  if (t($8) !~ ("^" d "$")) print FILENAME ":" FNR ": verified"
  if (t($9) !~ ("^(30|90|180|expires:" d ")$")) print FILENAME ":" FNR ": refresh_days"
  if (t($10) !~ /^(platform|authority|independent|vendor)$/) print FILENAME ":" FNR ": provenance"
  if (t($11) == "") print FILENAME ":" FNR ": expect empty"
}
```

Watched: a planted row (`http://` url, `2 years ago` in both date columns, `45` days, `official` provenance, empty `expect`) printed 6 lines, and a 5-column row printed 1. The 25 seed rows printed nothing under both awks.

**`cab-14`, the weekly re-fetch (CH-CORE-14).** `sh refetch.sh facts/*.md`. Its output opens issues and never fails a merge.

```sh
MANUAL='(^|\.)(linkedin\.com|producthunt\.com|help\.x\.com|reddit\.com|reddithelp\.com|ftc\.gov)$'
awk -F'|' '/^\| [A-Z]+-F[0-9]+ /{for(i=2;i<=11;i++)gsub(/^[[:space:]]+|[[:space:]]+$/,"",$i); print $2 "\t" $6 "\t" $11}' "$@" |
while IFS="$(printf '\t')" read -r id url expect; do
  host=$(printf '%s' "$url" | sed 's|^https://||; s|/.*||')
  if printf '%s' "$host" | grep -Eq "$MANUAL"; then echo "MANUAL $id $url"; continue; fi
  body=$(curl -sL --compressed -m 40 -A 'Mozilla/5.0 research' -w '\n%{http_code}' "$url")
  code=$(printf '%s' "$body" | tail -n 1)
  case $code in 2??) ;; *) echo "UNREACHABLE $id $code $url"; continue ;; esac
  printf '%s' "$body" | sed 's/<[^>]*>/ /g' | grep -Eq -- "$expect" || echo "CHANGED $id $url"
done
```

Watched: on the 25 seed rows it printed 6 `MANUAL` lines (LI-F01 to LI-F06) and nothing else. A planted row whose `expect` is not on its page printed `CHANGED`.

**`cab-15`, the provenance host allowlist (CH-CORE-15).** `awk -f hosts.awk facts/hosts.txt facts/*.md`.

```awk
BEGIN { FS = "|" }
NR == FNR { ok[$0] = 1; next }
/^\| [A-Z]+-F[0-9]+ / {
  p = $10; u = $6; gsub(/[[:space:]]/, "", p); gsub(/[[:space:]]/, "", u)
  if (p != "platform" && p != "authority") next
  split(u, a, "/"); if (!((a[3] " " p) in ok)) print FILENAME ":" FNR ": " a[3] " not allowlisted as " p
}
```

Watched: a planted `https://buffer.com/...` row tagged `platform` printed one line. The seed rows passed against the 8 hosts `www.linkedin.com`, `developers.google.com`, `support.google.com`, `docs.x.com`, `developers.facebook.com`, `atproto.com`, `docs.joinmastodon.org` and `mastodon.social`, each as `platform`.

## Seed registry rows

These rows go into `skills/channel-publishing-reference/facts/<platform>.md`, one file per platform. The LinkedIn rows carry the live strings that core-facts-and-channel-inventory (finding 4) re-fetched on 2026-11-27, with the relative ages from its Dated facts table. They were not re-fetched in this revision, because CH-CORE-14 makes LinkedIn a manual host. The other 19 rows were re-fetched on 2026-11-27 and matched their `expect` (block `cab-14`). The X-F03 source date is the changelog entry date. X states the price took effect 2026-04-20.

| id | platform | fact | value | url | source_date | verified | refresh_days | provenance | expect |
|---|---|---|---|---|---|---|---|---|---|
| LI-F01 | linkedin | post text limit | 3,000 characters | https://www.linkedin.com/help/linkedin/answer/a528176 | relative:2 months ago@2026-11-27 | 2026-11-27 | 180 | platform | 3,?000 characters |
| LI-F02 | linkedin | link preview image | 1200 x 627 px at 1.91:1 | https://www.linkedin.com/help/linkedin/answer/a525301 | relative:2 years ago@2026-11-27 | 2026-11-27 | 180 | platform | 1200 \(w\) x 627 \(h\) |
| LI-F03 | linkedin | document post | 100 MB and 300 pages | https://www.linkedin.com/help/linkedin/answer/a518909 | relative:3 years ago@2026-11-27 | 2026-11-27 | 180 | platform | 100 ?MB and 300 pages |
| LI-F04 | linkedin | image post | 20 images, 5 MB each | https://www.linkedin.com/help/linkedin/answer/a527229 | relative:1 day ago@2026-11-27 | 2026-11-27 | 180 | platform | 20 images |
| LI-F05 | linkedin | video post | up to 15 minutes, 5 GB | https://www.linkedin.com/help/linkedin/answer/a7174587 | relative:2 years ago@2026-11-27 | 2026-11-27 | 180 | platform | 15 minutes |
| LI-F06 | linkedin | poll | question 140, option 30 characters | https://www.linkedin.com/help/linkedin/answer/a527270 | relative:1 year ago@2026-11-27 | 2026-11-27 | 180 | platform | 140 characters |
| YT-F01 | youtube | AI-use field is settable by API | status.containsSyntheticMedia | https://developers.google.com/youtube/v3/revision_history | 2024-10-30 | 2026-11-27 | 90 | platform | containsSyntheticMedia |
| YT-F02 | youtube | paid placement has no default; omission is undeclared | paidProductPlacementDetails.hasPaidProductPlacement | https://developers.google.com/youtube/v3/revision_history | 2026-11-16 | 2026-11-27 | 30 | platform | hasPaidProductPlacement |
| YT-F03 | youtube | trigger: a real person shown saying or doing something they did not | ai_use yes | https://support.google.com/youtube/answer/14328491 | none | 2026-11-27 | 90 | platform | Makes a real person appear to say or do something they didn.t do |
| YT-F04 | youtube | trigger: altered footage of a real event or place | ai_use yes | https://support.google.com/youtube/answer/14328491 | none | 2026-11-27 | 90 | platform | Alters footage of a real event or place |
| YT-F05 | youtube | trigger: a generated realistic scene that did not occur | ai_use yes | https://support.google.com/youtube/answer/14328491 | none | 2026-11-27 | 90 | platform | Generates a realistic scene that didn.t actually occur |
| YT-F06 | youtube | trigger: generated music that is the main focus | ai_use yes | https://support.google.com/youtube/answer/14328491 | none | 2026-11-27 | 90 | platform | Creates music that.s the main focus |
| YT-F07 | youtube | exemption: AI help with an outline, script, thumbnail, title or infographic | ai_use no | https://support.google.com/youtube/answer/14328491 | none | 2026-11-27 | 90 | platform | video outline, script, thumbnail, title, or infographic |
| YT-F08 | youtube | exemption: caption creation | ai_use no | https://support.google.com/youtube/answer/14328491 | none | 2026-11-27 | 90 | platform | Caption creation |
| YT-F09 | youtube | exemption: the creator's own cloned voice for voice-over or dubs | ai_use no | https://support.google.com/youtube/answer/14328491 | none | 2026-11-27 | 90 | platform | Cloning one.s own voice |
| YT-F10 | youtube | C2PA disclosures carried forward when the whole video is AI-made | C2PA 2.1 or higher | https://support.google.com/youtube/answer/15447836?hl=en | none | 2026-11-27 | 90 | platform | \(C2PA\) 2\.1 or higher |
| X-F01 | x | automated accounts must enable the Automated profile label | required | https://docs.x.com/developer-guidelines.md | none | 2026-11-27 | 90 | platform | Enable the 'Automated' profile label |
| X-F02 | x | programmatic replies only when the author summoned the account | since 2026-02-23 | https://docs.x.com/changelog | 2026-02-23 | 2026-11-27 | 90 | platform | summoned |
| X-F03 | x | per-post API price | $0.015 per post, $0.20 with a URL | https://docs.x.com/changelog | 2026-04-16 | 2026-11-27 | 30 | platform | 0\.015[^0-9]{0,6}per post |
| TH-F01 | threads | AI label set on the container-creation call only | is_made_with_ai=true | https://developers.facebook.com/docs/threads/posts | 2026-10-30 | 2026-11-27 | 90 | platform | is_made_with_ai |
| TH-F02 | threads | publishing limit | 250 posts per rolling 24 hours | https://developers.facebook.com/docs/threads/posts | 2026-10-30 | 2026-11-27 | 180 | platform | 250 published posts |
| BS-F01 | bluesky | bot accounts should self-label on the profile | best practice | https://atproto.com/guides/bot-tutorial | none | 2026-11-27 | 90 | platform | self-label to their profile |
| BS-F02 | bluesky | bots interact only with users who tagged them | opt-in | https://atproto.com/guides/bot-tutorial | none | 2026-11-27 | 90 | platform | tagged the bot account |
| MA-F01 | mastodon | the bot flag is a visual indication only | visual only | https://docs.joinmastodon.org/user/profile/ | 2026-04-15 | 2026-11-27 | 90 | platform | visual indication only |
| MA-F02 | mastodon | mastodon.social and mastodon.online rule 6 | generative AI use must be disclosed | https://mastodon.social/api/v1/instance/rules | none | 2026-11-27 | 90 | platform | generative AI must be disclosed |

The X developer-guidelines page sends a `last-modified` header (2026-11-27 02:34:44 GMT on this fetch). That header tracks deploys, not edits, so X-F01 records `none`. The Bluesky tutorial page shows no date. Its source file gained the self-label text in a commit dated 2026-03-19 ("add bot self labeling to tutorial (#593)") and last changed 2026-04-13 (`curl -s 'https://api.github.com/repos/bluesky-social/atproto-website/commits?path=src/app/%5Blocale%5D/guides/bot-tutorial/en.mdx'`).

## Applied to the fleet

"The fleet" is the 16 product repositories under `/home/mherwig/dev/ocx-sh` and `/home/mherwig/dev/grimoire-rs`. Where a command also scanned grimoire-lore, the row says so (17 checkouts). All commands ran 2026-11-27 from `/home/mherwig/dev`, and every `find` and `grep` skipped `.git`, `node_modules`, `target`, `.agents`, `.venv`, `dist` and worktrees.

| Rule | State | Evidence |
|---|---|---|
| CH-CORE-01 | Already satisfied | Block `cab-01` over the workflows and skills of 17 checkouts: the endpoint pattern lists 0 files, and the secret-name pattern lists 1, `ocx-sh/ocx/.github/workflows/notify-discord.yml`, which is owner automation (CH-CORE-02). Zero fleet configuration files mention LinkedIn, YouTube, HN, Product Hunt, Reddit, Mastodon, Bluesky or Twitter (`product-audit/config-inventory.md:467`). The release and registry workflows are out of scope (`channel-github`). |
| CH-CORE-02 | **Violated** | `ocx-sh/ocx/.github/workflows/notify-discord.yml:6-14` posts on pull-request, release and `workflow_run` events, and `:105` posts failed runs. This is owner automation with no inventory row, no `approved_by`, no `runs_from` and no `labels_required`, because no `channels.yml` exists. The audit also flags that it posts CI failures, which are not user news, to a 5-member community server (`distribution-posture.md:270`, smell 4). What the webhook should post belongs to the communities sibling. |
| CH-CORE-03, -04, -05 | New commitment | 0 HN submissions of any fleet domain (`distribution-posture.md:235`). No Reddit, Lobsters, Product Hunt or Stack Overflow presence (`:238`). |
| CH-CORE-06, -07 | **Unmeasured**, ask the owner | Two Shorts were uploaded 2026-11-17 to `@ocx-sh` (`distribution-posture.md:228`). Their label state was not measured: `curl -s "https://www.googleapis.com/youtube/v3/videos?part=status&id=5qbGkPhxNpQ"` returned HTTP 403 `PERMISSION_DENIED` with no key set (core-platform-labels, section 2). No upload package exists: `grep -rIlE '^ai_use:'` over 17 checkouts printed 0 files. The private `ocx-sh/marketing` repository was not read. Whether "Dino Edition" is realistic under YT-F03 to YT-F06 is a judgement for the owner, and nothing about it was measured. |
| CH-CORE-08, -09 | New commitment | `grep -rIniE '(^\|[^a-z])(sponsored by\|paid partnership\|in partnership with\|#ad([^a-z]\|$))'` over the 16 product repositories printed nothing. `find` listed 442 image and video files (`*.png`, `*.jpg`, `*.jpeg`, `*.webp`, `*.gif`, `*.mp4`), 359 of them in `grimoire-rs/vscode`. `c2patool` found a manifest in 0 of 442, and `exiftool -if '$DigitalSourceType'` printed 0. Metadata can be stripped, so this shows only that no file carries credentials, not that none is generated. |
| CH-CORE-10 | Satisfied in part, **violated in part** | Satisfied: 0 publishing-token findings across 17 clones (gitleaks v8.30.1, core-agent-action-boundary 3.8). Violated: `ocx-sh/ocx/.gitleaks.toml:1-2` extends the gitleaks defaults only, and those defaults have no Discord webhook URL rule (command in CH-CORE-10). The one repository that holds a webhook secret therefore cannot catch a leaked webhook URL. `grimoire-rs/grimoire/.github/workflows/` has no gitleaks step (`grep -rli gitleaks` over the fleet's `.github` trees hits 7 `ocx-sh` repos and `grimoire-rs/indexer` only). Its `notify` fixtures need a path allowlist (`ocx-sh/ocx-mirror/tests/fixtures/mirror-r3-discord-url.yml`). |
| CH-CORE-11 to -15 | New commitment | No registry exists. `find ocx-sh grimoire-rs -type d -name facts` printed nothing, and `ls skills \| grep -i channel` in the catalog printed nothing. The only catalog file that names these platforms is `skills/docs-quality-reference/checks/lychee.toml` (`grep -rlniE 'linkedin\|youtube\|hacker news\|bluesky\|mastodon' rules skills`). The 25 seed rows above pass `cab-12` and `cab-15`, and 19 of them pass `cab-14` live. X's 2:1 card figure stays out, because it rests on a search snippet (`distribution-posture.md:172`), which CH-CORE-11 forbids. |
| CH-CORE-17 | **Violated** | Neither org has a channel inventory. Channels exist: GitHub orgs, Discord, YouTube `@ocx-sh`, two personal LinkedIn profiles, npm, PyPI (`distribution-posture.md:217-238`). Pattern 8 asks for the file (`:289`). |
| CH-CORE-18 | **Violated** | With no rows, the reverse check fails on every channel link: Discord at `ocx-sh/ocx/README.md:12,71,86`, `ocx-sh/ocx/website/astro.config.mjs:47`, `ocx-sh/website/packages/theme/src/nav.json:227` and `ocx-sh/website/site/src/content/docs/team/index.mdx:40`, and LinkedIn at `team/index.mdx:27,33` (`distribution-posture.md:227-229`, core-facts-and-channel-inventory section 6). |
| CH-CORE-19 | Already satisfied, by accident | YouTube `@ocx-sh` ownership is "inferred, not proven" (`distribution-posture.md:228`), and the channel is linked from 0 of 17 repositories, so no inferred handle is published. The LinkedIn company-page 403 is recorded as "no page found, not provable" (`:229`). That is the correct form. |

## AI-agent failure modes

The ranking is a judgement of how often each failure bites an agent working unattended. It draws on the dives' AI-agent tables, and no frequency was measured. Grouped by mechanism, with the highest-frequency group first.

**A. Helpfulness overreach: acting instead of handing over.**
1. Posts or uploads "to save a step" when credentials are in reach. Caught by `cab-01`, which also catches a webhook held in a secret.
2. Writes a paste-ready Show HN title and first comment, or a Product Hunt reply. Caught by `cab-03`.
3. Builds a reply bot that answers anyone who mentions a keyword. Forbidden on X since 2026-02-23 and on Bluesky. No command catches it. The `x-summoned` and `bs-optin` gates rest on a human's attestation (CH-CORE-02).
4. Uses browser automation or a scraper on LinkedIn because it works. Caught by the CH-CORE-01 browser-automation grep.

**B. Stale or invented facts.**
5. Writes limits, prices or behaviours from training data (the old X free tier, a YouTube private-upload lock for unverified projects, a 1,300-character LinkedIn fold). Caught by `cab-11`.
6. Invents fields: a LinkedIn AI toggle, a Bluesky or Mastodon AI label. Caught by the CH-CORE-06 registry lookup.
7. Invents the clause text of a page it could not fetch, or a community rule it never read. Caught by CH-CORE-11 (no row, no quote) and `cab-05` (the quote must be on the live page).
8. Copies "Last updated: 2 years ago" into `verified`, or tags a vendor figure as `platform`. Caught by `cab-12` and `cab-15`.
9. Schedules a job that scrapes LinkedIn help pages to keep the registry fresh. Prevented by the `cab-14` manual-host list.

**C. Label mechanics.**
10. Omits `hasPaidProductPlacement` on the assumption that omission means false. Caught by CH-CORE-06.
11. Answers YouTube AI-use Yes because the script was AI-drafted, or No for everything. Caught by `cab-07` (an exemption row cannot carry `yes`). Matching the wrong trigger is caught only by the human's confirmation.
12. Sets the Threads label on the publish call, or relies on LinkedIn's Brand partnership toggle staying on. Caught by CH-CORE-06.
13. Puts the disclosure only in the description or a hashtag. Caught by CH-CORE-08.
14. Writes C2PA and assumes it covers IPTC. Caught by `cab-09`, and only if the check tests for non-empty output, because exiftool exits 0 on a missing tag.

**D. Identity and inventory.**
15. Invents a handle by pattern (`@ocx` on X, `ocx.sh` on Bluesky). Caught by CH-CORE-18's reverse check.
16. Reads an unauthenticated 403 as "no account" and removes a link or declares absence. Caught by CH-CORE-19.
17. Links the channel in one org and misses the sibling org. Caught by the CH-CORE-18 forward check.

**E. Credentials.**
18. Pastes a Discord webhook URL or a Bluesky main password into a workflow. A webhook URL is caught by the CH-CORE-10 gitleaks rule. A plain password has no rule, by design (four-group strings give false positives), so it falls to gitleaks' generic rules.

## What an agent must ask a human

- Which channels the organisation runs, opens or closes. The answer is recorded as `active`, `planned`, `retired` or `none` rows.
- Whether to run any owner-commissioned automation (CH-CORE-02), what its bio says, who holds the credential, and who attests its gates.
- Whether an `inferred` handle belongs to the organisation. A logged-in human records `verified_by`.
- Which account speaks: the company page, a founder or a maintainer. An agent never publishes in a named person's voice without that person's review.
- Whether a borderline piece of media is "realistic" (CH-CORE-07), and whether to override a label the platform applied itself.
- Whether content is sponsored, gifted or a material connection, and whether the law requires a label. The legal question goes to the marketing sub-program.
- Any spend: API credits, ads, boosts, paid listings, sponsorships.
- Whether a product qualifies for a launch venue, and on which day.
- Responses to critical public comments, security reports posted in public, journalists, takedown notices or enforcement actions.
- Accepting platform terms, creating developer apps, applying for API access or for X automated-label testing.
- Claiming a squatted handle, or changing a published invite or handle.
- Promoting a vendor figure to a rule, changing a refresh class, or adding a host to `facts/hosts.txt`.
- Re-reading each `MANUAL` registry row on its due date.

## Decay

| Rule | Moving facts it rests on | Last stated change | Refresh interval |
|---|---|---|---|
| CH-CORE-01 | LinkedIn UA 8.2; YouTube developer policies; HN guidelines; Reddit User Agreement; GitHub AUP section 4; Product Hunt API terms of use | 2025-11-03; 2026-11-06; undated; 2026-05-26; source 2026-07-09; undated | 90 days |
| CH-CORE-02 | X automated-account rules; X reply gating; X pricing; atproto bot guidance; Mastodon bot flag; mastodon.social rule 6; Threads posting limit (250 per rolling 24 h); Discord guidelines | header 2026-11-27; 2026-02-23; effective 2026-04-20; source 2026-03-19 and 2026-04-13; 2026-04-15; 2026-08-31; 2026-10-30; 2025-09-29 | 90 days; 30 days for X prices |
| CH-CORE-03, -04 | HN, Stack Overflow, Product Hunt, Lobsters and dev.to AI and self-promotion clauses | undated; undated; 2025-07-28; undated; 2023-01-09 (a newer revision is reported, not read) | 90 days; re-fetch dev.to before every dev.to draft |
| CH-CORE-05 | Per-community rules | per fetch | every session (no row) |
| CH-CORE-06, -07 | YouTube API fields and trigger list; X fields; Threads field; TikTok fields; LinkedIn toggle | 2026-11-16; 2026-06-03; 2026-10-30; 2026-11-25; "3 years ago" | 90 days; 30 days until 2027-01-15 for the YouTube paid-placement default (inside 60 days of its 2026-11-16 change) |
| CH-CORE-08 | FTC placement guidance; EU Code of Practice | undated; 2026-06-10 | 90 days, owned by marketing |
| CH-CORE-09 | Which platforms read C2PA or IPTC; YouTube C2PA version floor; c2patool and exiftool behaviour | 2026-03-18 (one study); undated; c2patool 0.27.23 and exiftool 13.64 | 90 days; re-run `cab-09` at each tool version bump |
| CH-CORE-10 | gitleaks default ruleset | v8.30.1 | at each gitleaks version bump |
| CH-CORE-13 | The intervals themselves | 2026-11-27 (derived from one repository's edit history) | revise after two registry refresh cycles |
| CH-CORE-14 | Which hosts block scripts or ban automated access | 2026-11-27 | when a `cab-14` run reports `UNREACHABLE` |
| CH-CORE-17 to -19 | The organisation's own accounts | `last_checked` per row | 90 days warn, 180 days fail |

LinkedIn Marketing API version 202601 sunsets on 2027-01-15 ([Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api), ms.date 2026-05-07). That affects no rule, since the agent never calls it.

## Open questions

**Owner decisions**
- Keep the Discord CI notifier posting to the community server, and record it as an `automation: bot` row? Or point it at a separate developer channel?
- Is YouTube `@ocx-sh` the project's channel? A logged-in check is needed before any link.
- What are the AI-use and paid-placement answers for the two Shorts, especially "Dino Edition"?
- Should `channels.yml` sit in `ocx-sh/website` and `grimoire-rs/grimoire`, or should `.github` org repositories be created to hold it and the missing org profile READMEs?
- Does Grimoire use the OCX Discord server? Today it links it on 0 surfaces.
- What spend caps apply before any metered API is used?
- Who keeps `facts/hosts.txt` and re-reads the `MANUAL` LinkedIn rows? And does an agent fetch that a human starts in an interactive session count as a manual re-read under LinkedIn UA 8.2?

**Subareas that deserve another round (as questions)**
- What do Reddit's Responsible Builder Policy, the Product Hunt Terms of Service and the Discord Developer Policy say, read from the primary pages (all three returned 403 or 404 in this pass)?
- Does `videos.list` return `status.containsSyntheticMedia` and `paidProductPlacementDetails` for public videos under a plain API key, and what state do the fleet's two Shorts carry?
- Did Bluesky ship a native automated-account label in 2026? The only evidence is a third-party post and a vendor roundup that disagree. The atproto tutorial still names only the `bot` self-label (source last changed 2026-04-13).
- What does dev.to's current AI-assisted-article guideline say? A 2026 tiered revision is reported only on a mirror.
- After two refresh cycles of the registry, which fact classes actually failed `expect`, and should the 30/90/180 intervals move?
- Can the X gates (`x-label`, `x-bio`, `x-human`) be read with the owner's own API key, so that they move from attestation to a command?

## Sub-artifacts

- [core-agent-action-boundary](channel-agent-boundary/core-agent-action-boundary.md): the 14-platform by 7-action matrix with verbatim, dated clauses; the venue bans on generated text; credential custody; the fleet gitleaks scan and the publishing-token config.
- [core-platform-labels](channel-agent-boundary/core-platform-labels.md): the label table (field, trigger, default, verification) for YouTube, LinkedIn, TikTok, X, Bluesky, Mastodon and Instagram; placement per format; C2PA and IPTC; the unobservable Shorts measurement.
- [core-facts-and-channel-inventory](channel-agent-boundary/core-facts-and-channel-inventory.md): the measured decay of 81 platform pages, the registry schema and cadence, the inventory schema, and the four-part inbound-link check run against the fleet.

## Key sources

| URL | Why |
|---|---|
| https://developers.google.com/youtube/terms/developer-policies | Consent for each automated action (last updated 2026-11-06) |
| https://developers.google.com/youtube/v3/revision_history | `containsSyntheticMedia` (2024-10-30); paid-placement default removed (2026-11-16) |
| https://support.google.com/youtube/answer/14328491 | YouTube AI-use triggers and exemptions |
| https://support.google.com/youtube/answer/15447836?hl=en | YouTube carries forward C2PA 2.1 or higher disclosures (undated) |
| https://www.linkedin.com/legal/user-agreement | UA 8.2 bot ban (effective 2025-11-03) |
| https://www.linkedin.com/legal/l/api-terms-of-use | "automate posting" prohibited; credentials secret (2022-12-13) |
| https://www.linkedin.com/help/linkedin/answer/a1627083 | Brand partnership toggle, which resets for every post |
| https://docs.x.com/developer-guidelines.md | X automated-account requirements, re-fetched 2026-11-27 |
| https://docs.x.com/changelog | Summoned-only replies (2026-02-23); per-post pricing (effective 2026-04-20); `paid_partnership` (2026-06-03) |
| https://atproto.com/guides/bot-tutorial | Bluesky `bot` self-label as a best practice, opt-in interaction, app password |
| https://docs.joinmastodon.org/user/profile/ | Mastodon bot flag is visual only (updated 2026-04-15) |
| https://developers.facebook.com/docs/threads/posts | `is_made_with_ai` on container creation; 250 posts per 24 h (2026-10-30) |
| https://mastodon.social/api/v1/instance/rules | Generative-AI disclosure; AI-only accounts barred (ToS 2026-08-31) |
| https://news.ycombinator.com/newsguidelines.html | Generated and AI-edited text banned; no automated posting |
| https://stackoverflow.com/help/gen-ai-policy | LLM drafting banned |
| https://api.producthunt.com/v2/docs | GraphQL endpoint, write scope, no commercial use |
| https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies | Section 4: bulk and inauthentic automation barred (source 2026-07-09) |
| https://github.com/reddit-archive/reddit | Archived Reddit source: `/api/:action` route, `POST_submit`, `POST_comment` |
| https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking | Placement in the video itself, not behind "more" |
| https://github.com/internetarchive/wayback/tree/master/wayback-cdx-server | Why capture counts are not edit counts |

Cross-territory, one line each: whether the law requires an AI or sponsor label is the marketing sub-program's (`marketing-voice-ai-authorship`); what the Discord webhook should post is the communities sibling's; cross-platform post variants are `channel-microblog`'s; LinkedIn-specific limits and the AI line are CH-LI-16 and CH-LI-18; GitHub release, About and registry writes are `channel-github`'s (CH-GH-04, CH-GH-07 to CH-GH-22, CH-GH-27).

## Revision log

2026-11-27, answering the skeptic review. No rule was renumbered.

- CH-CORE-01: scope narrowed from "any platform" to the 15 matrix venues. GitHub and the package registries are named out of scope, citing GitHub AUP section 4 and deferring to CH-GH-04, CH-GH-07 to CH-GH-22 and CH-GH-27. Added conflict 12.
- CH-CORE-01: added Reddit, HN and Product Hunt write endpoints, each sourced and probed. Added a publishing secret-name pattern, because the endpoint pattern alone listed 0 of the fleet's 1 automation path.
- CH-CORE-01: the grep moved to block `cab-01`. It excludes the registry and checks directories and ships a planted fail fixture and a pass twin.
- CH-CORE-02 and conflict 2: the X Automated-label requirement re-fetched at its primary page, so the "where X offers it" hedge was removed. Bluesky dated (source 2026-03-19 and 2026-04-13) and marked as "best practice", made required by choice. Mastodon's "visual only" flag noted, with rule-6 text as the binding disclosure.
- CH-CORE-02: each gate got an id. The Bluesky and Mastodon gates got tested commands (`cab-02`). The X gates and the summon, opt-in and self-bot gates are marked `unverified: attested by a human`, with `gates_attested`, `attested_by`, `attested_at` and an X `spend_cap` checked by lint. The unrunnable "reply step is triggered by a mention" check was dropped.
- CH-CORE-03: the reading heuristic was replaced by a fixed key schema and lint `cab-03` (no pronouns, values of at most 20 words, blank motive), watched red and green.
- CH-CORE-05: added a verbatim `rules_quote` line that `cab-05` finds on the live page, so a date stamp alone no longer passes.
- CH-CORE-07: `case:` must be a registry trigger or exemption id, checked by lookup in `cab-07`. YouTube trigger and exemption rows YT-F03 to YT-F09 seeded. The reading heuristic was removed from verification.
- CH-CORE-09: c2patool 0.27.23 and exiftool 13.64 run on samples and on 442 fleet media files. The YouTube C2PA 2.1 claim is cited to 15447836. The check now tests for non-empty exiftool output, because exiftool exits 0 on a missing tag. Kept SHOULD, since the Instagram evidence is one independent study.
- CH-CORE-10: reduced to the non-obvious gitleaks rule additions. The generic "never put a credential in a repository" text was dropped.
- CH-CORE-11: absorbed CH-CORE-16's unfetchable-page default and the no-registry case (no number, no clause, name the gap). Verification moved to `cab-11`. It can now pass, because 25 seed rows ship.
- CH-CORE-12: lint `cab-12` now checks the provenance enum, the three `source_date` forms, the `verified` date, the `refresh_days` values, the url and a non-empty `expect`, not only the column count. No literal `|` in cells.
- CH-CORE-13: event deadlines use `refresh_days: expires:<date>`, so the 10-column schema holds them.
- CH-CORE-14: LinkedIn and five other hosts that ban or block scripts are exempt from the weekly fetch and get a manual refresh path. 403, 429 and 999 report as `UNREACHABLE`. Cites UA 8.2 and `lychee.toml:27-32`.
- CH-CORE-15: demoted MUST to SHOULD (no observed instance). Provenance `platform` or `authority` now requires a host on a human-kept allowlist, checked by `cab-15`.
- CH-CORE-16: retired and merged into CH-CORE-11. The number is not reused.
- CH-CORE-17: bot rows add `runs_from`, `gates_attested`, `attested_by`, `attested_at` and, on X, `spend_cap`.
- Dropped list: the wrong `rules/swift-quality.md:38` citation was replaced by `prompt-contracts.md:45-46` and the example `rules/shell-quality.md:199`.
- Applied to the fleet: CH-CORE-01, -06/-07, -08/-09 and -11 to -15 re-measured with the commands shown. CH-CORE-06/-07 changed from "Open" to "Unmeasured", and "Dino Edition" is marked as an owner judgement.
- Open questions: removed the X label help page (answered by the developer guidelines). Added the attestation question, the manual-host owner question and the hosts-allowlist owner question.
