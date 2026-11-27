---
name: community-post
description: "Hacker News, Lobsters, Reddit, Stack Overflow, dev.to, Hashnode and Discord or Matrix chat for a software project, as fact sheets and checklists for the human who posts, never paste-ready text where a venue bans generated content: venue contracts read on the day, account gates, Show HN eligibility and title checks, one submission per URL, no vote requests, Stack Overflow as support only, cross-posting, and chat as a secondary channel. Use when someone wants to post a Show HN, submit to Lobsters, share on a subreddit, answer on Stack Overflow, cross-post to dev.to or Hashnode, or announce in a Discord or Matrix server. Not for planning a multi-venue launch, which is launch-plan, and not for GitHub Discussions or SUPPORT.md, which is github-presence."
license: Apache-2.0
metadata:
  summary: Fact sheets and checks for developer-community posts, with venue contracts, account gates and chat rules kept in a dated registry
  keywords: hacker-news,show-hn,lobsters,reddit,stack-overflow,dev-to,hashnode,discord,matrix,community,self-promotion,fact-sheet,cross-post
  grim.requires.skills.channel-publishing: "./channel-publishing:0"
---

# community-post

An agent prepares a venue plan, a fact sheet and the checks. A named human writes every word that a venue bans generated text for, and a named human posts. This skill never posts, submits, comments, replies, votes or flags, and it never schedules any of those.

Contents: [The boundary](#the-boundary) · [What it writes](#what-it-writes) ·
[Venues at a glance](#venues-at-a-glance) · [Pinned defaults](#pinned-defaults) ·
[Dated facts](#dated-facts) · [Procedure](#procedure) ·
[What an agent must ask a human](#what-an-agent-must-ask-a-human) ·
[What agents get wrong here](#what-agents-get-wrong-here) · [Siblings](#siblings)

## The boundary

The `channel-publishing` skill owns these rules, and this skill requires it. Read `channel-publishing` at `../channel-publishing/SKILL.md`. If that file is missing, install it with `grim add ghcr.io/ocx-sh/lore/channel-publishing:0`. The five that bind this skill:

- CH-CORE-01: end every task at a publish package. Never call a write endpoint on a venue and never drive its web page.
- CH-CORE-02: automation exists only as an owner-commissioned bot on X, Bluesky, Threads, Mastodon or Discord, recorded in `channels.yml`. An agent never creates one.
- CH-CORE-03: for HN, Lobsters, Reddit and a dev.to promotional article, output only a fact sheet. A label never makes paste-ready text acceptable.
- CH-CORE-04: produce no Stack Overflow content of any kind. List the sources the human may read.
- CH-CORE-05: before drafting for a venue whose rules are set per community (a subreddit, a Discord server, a forum), fetch that community's rules in the same session. A draft starts with `rules_fetched: <YYYY-MM-DD> <url>` and a second line `rules_quote: "<one verbatim rule>"`. If the fetch fails, apply CH-CORE-03.

## What it writes

| File | Holds | Who else writes it |
|---|---|---|
| `community-plan.md` | One `## <venue>` section per venue, `key: value` lines | Nobody |
| `<venue>-facts.md` | The fact sheet, in the `channel-publishing` format | Nobody |
| `hashnode-draft.md` or `chat-post.md` | A draft, only for Hashnode and the team's own chat release post, starting with the CH-CORE-05 lines | A named human approves it |
| `<venue>-draft.md` for HN and the other fact-sheet venues | The maker's own title and text | The maker only. The agent reads it and never writes it |
| `makers.txt`, `acronyms.txt` | The owner's list of maker names, the maker's list of allowed capitals | The owner and the maker only |

Stop when every venue section has a verdict per rule ID (pass, fail with the matched span, or `asked: <question>`) and every question for a human is written down. Never post.

## Venues at a glance

| Venue | The agent produces | The agent never |
|---|---|---|
| Hacker News | A fact sheet. Check results on the maker's draft, as a clause and a quoted span | Submits, comments, votes, edits, polishes or proposes wording for the title, text or replies |
| Lobsters | A fact sheet and the account-gate arithmetic | Writes the story text, picks tags to describe how the code was made, or opens an account for the launch |
| Reddit | Nothing until the human pastes the subreddit's rules. Then a fact sheet | Fetches around a 403, or quotes a self-promotion ratio |
| Stack Overflow | A list of existing question URLs the tool solves | Drafts, outlines or checks an answer or question |
| dev.to | A fact sheet for any post or comment that promotes the team's tool. A draft of another post, with a disclosure | Writes a launch post, comments, or a teaser that links out for its content |
| Hashnode | A draft that a named human edits and approves | Bulk-generates, schedules or builds a series |
| Discord or Matrix | A release-news post for the team's own server, user-facing news only. Invite and server checks | Posts, messages a user, or claims messages are searchable without the check |

Reddit is not in the default venue set. A subreddit enters a plan only after the human pastes its current rules.

## Pinned defaults

Each row is a decision of this skill, marked **pinned**. An adopter overrides it once, in their own repository.

| Decision | Default | Override looks like |
|---|---|---|
| Venue set for a free open-source CLI | One Show HN, then Lobsters if the account passes its gate, then full-text posts a human wrote on dev.to or Hashnode. Stack Overflow is support, never an announcement. Reddit is off | A different set, written in the plan with the reason |
| Community home | GitHub Discussions with an answerable Q&A category and an Announcements category. Chat is secondary and linked beside it | A forum such as Discourse, when a named need exists |
| Account lead time | Start gated accounts early. The agent proposes opening them as a question to the owner and never creates one | An account that already passes its gate |
| File names | The ones in "What it writes" | Any names, as long as the checks are given the paths |
| Success measure | A named metric with a source and a window. Never a points number or a front-page goal | The launch metric from `launch-plan` |

## Dated facts

Every venue clause, account gate and chat threshold sits in [references/facts.md](references/facts.md), with its source URL, source date and refresh cadence. This file repeats none of them. Cite a row by its id in square brackets. A clause that is not in a row is not known: read the venue's page in the same session, and when the page is blocked, say so and ask the human to paste it.

Every row carries `refresh_days`: 180 for hard limits, 90 for policy, API fields and label triggers, 30 for prices. `facts_check.py` fails on the first overdue row; re-fetch it, never extend the date. The cadence floor of this skill is 90 days, and venue rules are re-read on the day of a plan (CH-COM-02). Run the check with `python3 -I "$BOUNDARY"/facts_check.py references/facts.md`.

The rules, with their severity and verification, are in [references/rules.md](references/rules.md). The steps below name the rule each one applies.

## Procedure

Set two variables once. `CHECKS=.claude/skills/community-post/checks` and `BOUNDARY=.claude/skills/channel-publishing/checks` (`$CLAUDE_CONFIG_DIR/skills/...` when installed globally). Use the commands under each rule's block in `references/rules.md`.

### 1. Name the venues and the maker

- Input: the request.
- Do: list each venue asked for. A multi-venue launch or a venue order goes to `launch-plan`. GitHub Discussions, issue-chooser routes, SUPPORT.md and code-of-conduct contacts go to `github-presence`. For each venue, ask who the maker is and which personal account posts (CH-COM-03).
- Done: a list of venues, each with a maker name and an account name from the human. Never invent either.

### 2. Open the plan

- Input: the venue list.
- Do: create `community-plan.md` with one section per venue, and the keys below. Leave human attestation keys empty.
- Done: every section has `venue:`, `maker:` and `account:`.

```
## hn
venue: hn
maker: <name from makers.txt>
account: hn/<username>
url: <repository root or install page>
text_placement: <text field or first comment>
rules_read: <url> <YYYY-MM-DD>
rules_quote: "<one verbatim clause>"
retry: <repost invite, or a human email that may go unanswered>
solicitation_paths: <paths of chat, newsletter and social templates, or none>
```

| Key | Venue | Rule |
|---|---|---|
| `age_days`, `tags` | Lobsters | CH-COM-04 |
| `overhaul_attested_by`, `overhaul_basis` | HN, repeat Show HN only | CH-COM-05 |
| `yc_confirmed_by` | HN, only when "Launch HN" appears | CH-COM-11 |
| `question_urls` | Stack Overflow | CH-COM-12 |
| `provenance`, `provenance_by`, `promotes_own_tool` | dev.to | CH-COM-14 |
| `approver` | Hashnode | CH-COM-15 |

### 3. Read each venue's contract today

- Input: the plan, and the `url` column of `references/facts.md` for each venue.
- Do: fetch each page in this session. Record `rules_read:` with the date and `rules_quote:` with one verbatim self-promotion or AI clause (CH-COM-02). Compare the page with the registry row: when a row's `expect` text is absent, report the row id as stale and stop that venue. For a subreddit, a Discord server or a forum, the rules are that community's own page (CH-CORE-05).
- Blocked page: make one request per URL, record the status, stop, and ask the human to paste the rules. Never try another user agent, a mirror, a proxy or a login that is not the owner's. Never fill a rule in from memory.
- Done: every section has both lines, or the section says `asked: paste the rules`.

### 4. Check the account gates

- Input: the accounts and, for Lobsters, the account age the human reports.
- Do: record `age_days:` and apply the gate rows in `facts.md` (CH-COM-04). Look up the tool's domain on Lobsters with the curl command in the CH-COM-04 block. Report the own-work share as `(own+1)/(stories+comments+1)`. Give the date the account would pass its gate.
- A failed gate: move the date or drop the venue. Never propose a fresh account for the launch, a second account, or a company-named account (CH-COM-03).
- Done: each section says `gate: pass`, or `gate: fail, earliest <date>`.

### 5. Check Show HN eligibility

- Input: the HN section and the repository URL.
- Do: run the CH-COM-05 block. (a) Run the documented install in a clean container with no login. (b) For a repeat Show HN, the maker attests a major overhaul and gives a changelog line. (c) Query for a Show HN in the window the rule sets. (d) The URL is the runnable thing. No version-number test applies. Check CH-COM-11 and CH-COM-10 on the plan text.
- Done: `eligible: yes` with the four answers, or `eligible: no` with the failing letter.

### 6. Write the fact sheet

- Input: the repository, its README and its latest release.
- Do: write `<venue>-facts.md` in the `channel-publishing` format: one heading, then bullets with the keys `version`, `install`, `repository`, `measured`, `limit`, `motive`. Put the licence, the pricing and prior threads in as `limit:` bullets. Give each number a `(command: ...)` or the `source:` line your claims policy needs. Leave `motive:` blank. Never write a title, a first comment or any prose.
- Check: `python3 -I "$BOUNDARY"/factsheet_check.py hn-facts.md`, then the CH-COM-01 (b) and (c) commands.
- Done: both print nothing. Ask the human whether the pricing and licence statements are accurate.

### 7. Hand over, then check the maker's draft

- Do: give the maker the fact sheet and the plan. Stop. The maker writes `hn-draft.md` (title on line 1, then the text) and any other venue draft.
- When a maker draft exists: take its hash first (`sha256sum hn-draft.md > hn-draft.sha256`), then run `python3 -I "$CHECKS"/venue_check.py title hn-draft.md --url "$URL" --product "$PRODUCT" --acronyms acronyms.txt` (CH-COM-06).
- Report each finding as the clause and the matched span, quoted, exactly as the script prints it (CH-COM-25). Never offer a corrected title, a rewritten sentence, a shortened line or a list of alternatives. Never edit the draft, even for a typo. Tell the maker the placement choices in CH-COM-07 as information.
- End of session: `sha256sum -c hn-draft.sha256` prints `hn-draft.md: OK`.
- Done: exit 0, or the quoted findings handed to the maker.

### 8. Check the announcement surfaces for vote requests

- Input: the repository.
- Do: run the CH-COM-08 block. It lists every hit in the README, changelog, `.github`, release-template and plan files, and in every path on `solicitation_paths:`.
- Hand every hit to a human for a verdict and record it in the plan. A rating feature's "upvote" is a known false positive. Never delete or edit a hit.
- Done: every hit has a recorded verdict, or the command printed nothing.

### 9. Plan the retry and the measure

- Do: for HN, plan one submission per URL and no deletion or resubmission (CH-COM-09). The retry is a moderator repost invite or a human email, and no step may wait on a reply. State no points target, no front-page goal and no posting time (CH-COM-10). If the owner asks for a time, report the measurement in `references/rules.md` as a labelled correlation and recommend no hour.
- Done: the CH-COM-09 and CH-COM-10 blocks print what they expect.

### 10. Handle the other venues

| Venue | Do | Rules |
|---|---|---|
| Lobsters | Fact sheet only. The human picks tags from the story's subject using the live `https://lobste.rs/tags.json`. Never tag a story to describe how the code was made | CH-COM-01, 04 |
| Reddit | Ask the human to paste the subreddit's rules. Record them with CH-COM-02. Fact sheet only. Ask whether to post on Reddit at all | CH-COM-01, 02 |
| Stack Overflow | List existing question URLs the tool answers. Hand the human the checklist in the CH-COM-12 block. Write nothing else | CH-CORE-04, CH-COM-12 |
| dev.to | A post that promotes the tool: fact sheet only, and only a human who wrote it without AI help may publish it. Any other post carries `#ABotWroteThis` or a disclosure line when AI touched it. The post has substantial content of its own | CH-COM-13, 14 |
| Hashnode | Draft, starting with the CH-CORE-05 lines. A named human edits and approves. No schedule, no series | CH-COM-13, 15 |

- Done: every non-HN section has its keys filled by a human where the rule says human attestation, and the rule's block prints what it expects.

### 11. Check the chat channel

- Input: the README, the notify workflow and the invite code the owner gives.
- Do: keep chat secondary. Link a Discord or Matrix invite only beside the Discussions link, and only after `curl -s "https://discord.com/api/v9/invites/$CODE?with_counts=true" > invite.json` and `python3 -I "$CHECKS"/venue_check.py invite invite.json` pass (CH-COM-21, 23). Post only user-facing release news to a public channel, and send pull-request, CI and deploy events elsewhere (CH-COM-22). Run `python3 -I "$CHECKS"/venue_check.py claims <files that describe the server>` before any sentence says the server's messages are searchable (CH-COM-24).
- Ask the owner what the agent cannot see: AutoMod rules with alerts, mention-everyone limits, Raid Protection alerts, a moderator list, a second triager. Never report them as done.
- A release-news post for the team's own server is a draft with the CH-CORE-05 lines first. A named human posts it.
- Done: `venue_check.py invite` exits 0, and every unreadable setting is a question.

### 12. Report

- Do: write one line per venue and rule ID: `pass`, `fail` with the quoted span, or `asked: <question>`. End with the questions for the human from the next section. Say that nothing was posted.
- Done: the owner can act on the report without reading the plan.

## What an agent must ask a human

- Who the maker voice is for each product, and which personal account posts on each venue. Whether to open the Lobsters and HN accounts now so their clock starts.
- Whether the project is non-trivial in the venue's sense, and for a repeat Show HN whether this release is a major overhaul and which changelog line shows it (CH-COM-05).
- The `provenance:` of a dev.to post and the Hashnode `approver:` (CH-COM-14, 15).
- The subreddit's current rules, pasted into the session, and whether to post on Reddit at all.
- The launch date, and the venue order together with `launch-plan`.
- Whether to email the HN second-chance address after a miss. The human writes the email and is told that no reply may come (CH-COM-09).
- Whether a team member may mention the live thread elsewhere, and in what words.
- Whether the pricing and licence statements in a fact sheet are accurate.
- The Discord settings an agent cannot read, who moderates, and whether the project shares a chat server or has none (CH-COM-23).
- The title and every word of post, comment and reply text on HN, Lobsters, Reddit, Stack Overflow and dev.to: the maker writes them.

## What agents get wrong here

Ranked by how often each bites.

1. **Writes the words for the human to paste.** A ready-to-submit Show HN body and first comment, a Stack Overflow answer "with disclosure", or a dev.to launch post that AI wrote and discloses. Drafting is the default helpful act. CH-COM-01 and CH-COM-14.
2. **Polishes instead of reporting.** A check fails, and the agent offers a corrected title or fixes the typo. That is AI-edited text. CH-COM-01 and CH-COM-25.
3. **Marketing register in a community venue.** Superlatives and taglines copied from the README or the repository description. CH-COM-06 and CH-COM-07.
4. **Platform facts from memory.** A Reddit self-promotion ratio, the HN gravity formula, "post Tuesday 8 a.m.", Launch HN open to anyone, "Discord is not indexed" or "is indexed" with no threshold. CH-COM-02, 10, 11 and 24.
5. **Solicitation inside a growth checklist.** "Ask the team to upvote", "drop the HN link in the chat with 'show some love'", booster comments from friends. CH-COM-08 and CH-COM-03.
6. **Account and lead-time blindness.** A fresh Lobsters or Reddit account the week of launch, a company-named HN account, tags a new account cannot use, a new tool domain that blocks a new account. CH-COM-03 and CH-COM-04.
7. **Points as the goal.** "Hit the front page" or a points figure as success. CH-COM-10.
8. **Retry by repost.** "If it flops, delete it and resubmit tomorrow." CH-COM-09.
9. **Working around a block.** After a 403, another user agent, `old.` subdomain or mirror. CH-COM-02.
10. **Grep over-match taken as a violation.** Stripping a rating feature's "upvote" from the docs as if it were solicitation. CH-COM-08.

## Siblings

- `channel-publishing`: the boundary, the fact-sheet format, the facts registry format and the channel inventory. Required by this skill.
- `github-presence`: the community home on GitHub (Discussions, issue-chooser routes, SUPPORT.md, code-of-conduct contacts), the other half of the community rules.
- `launch-plan`: venue order, dates, one launch goal and Product Hunt. It cites CH-COM-08 for vote requests on community venues.
- `linkedin-post`, `microblog-post` and `youtube-video`: the other venues.
- `marketing-quality`: the claims policy for every number in a fact sheet, when installed.
