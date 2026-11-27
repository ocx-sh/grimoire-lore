# Community venue rules

Every CH-COM rule of the `community-post` skill, with its severity and its verification. SKILL.md routes here when a step names a rule ID. Venue clauses are never quoted in this file: a rationale cites the registry row in `facts.md` by id, in square brackets.

Contents: [Dates and versions](#dates-and-versions) · [Terms and files](#terms-and-files) ·
[Accounts and the boundary](#accounts-and-the-boundary) · [Show HN](#show-hn) ·
[Other venues](#other-venues) · [Chat](#chat) · [The HN base-rate measurement](#the-hn-base-rate-measurement)

## Dates and versions

- Written 2026-11-27 from venue pages read the same day. The facts behind each row sit in `facts.md` with their dates and refresh cadence. This file holds no clause text and no limit that can drift.
- Pinned defaults (decisions of this skill, not venue rules; an adopter overrides each once): the file names in the next section, the 183-day floor in CH-COM-05 (a margin below the HN tips' "once or twice a year" [CPHN-F16]), the 20-word paragraph floor of CH-COM-13, and the one-launch-post cap in CH-COM-15.
- Re-check events: any change to the Hacker News tips (`facts.md` explains the header diff), a new Lobsters about page, a new dev.to AI-assisted guideline, and the Discord indexing start after 2027-01-15.
- Severity is the severity each row carried when this file was written.

## Terms and files

The skill writes two kinds of file, both in the working directory. It never creates or edits the maker's files.

| Term | Meaning |
|---|---|
| Plan | `community-plan.md`: one `## <venue>` section per venue, each a list of `key: value` lines. A pinned default name; the `launch-plan` skill may take these sections into its own plan file |
| Fact sheet | `<venue>-facts.md`: the `channel-publishing` fact-sheet format only (one heading, then `- key: value` bullets, keys `version`, `install`, `repository`, `measured`, `limit`, `motive`). Licence, pricing and prior threads go in as `limit:` bullets. `motive` stays blank |
| Maker draft | `<venue>-draft.md`: the title and text the maker wrote. The agent reads it to run checks and never writes or edits it |
| Maker list | `makers.txt`: one name per line, written by the owner. The agent never creates or edits it |
| Acronym list | `acronyms.txt`: allowed words of five or more capitals in a Show HN title, written by the maker |
| Human attestation | A value a human supplies. The agent checks that it is present and that the name is in `makers.txt`. It cannot check that the statement is true |

Variables in the blocks below: `PLAN` is the plan path, `FACTS` a fact sheet path, `TOOLLOG` the session's tool-call log, `WRITELOG` the log of its write and edit calls, `CHECKS` is `.claude/skills/community-post/checks`.

## Accounts and the boundary

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CH-COM-01 | Never submit, post, comment, reply, vote or flag on any venue. For HN, Lobsters, Reddit, Stack Overflow, dev.to comments and any dev.to post that promotes the team's tool, deliver only a fact sheet. The named maker writes the title, the text and every reply by hand. On HN the agent also never rewrites, polishes or shortens the maker's title, text or replies, and never proposes replacement wording (CH-COM-25 sets how a failed check is reported) | HN bans generated and AI-edited text [CPHN-F01, CPHN-F03, CPHN-F04] and automated posting [CPHN-F02]. Stack Overflow bans generative AI content [CPSO-F01]. The Lobsters spam flag covers content without human authorship [CPLB-F05] | Block CH-COM-01: (a) no write call in the tool log, (b) no post-prose heading in a fact sheet, (c) no `Show HN:` line, (d) the HN draft hash is unchanged and no write call names it | MUST |
| CH-COM-02 | Before drafting a plan section for a venue, read its contract in this session and record the URL, the fetch date and one verbatim self-promotion or AI clause. If the page is blocked, make one request per URL, record the status, stop and ask the human to paste the rules. Never route around a block (no other user agent, mirror, proxy or login that is not the owner's), and never fill in a rule from memory | Reddit's subreddit rules were unreadable by script, and models recall self-promotion ratios that no fetched page states | Block CH-COM-02. The fetch log holds one request per blocked URL (unverified: reading heuristic) | MUST |
| CH-COM-03 | Plan every submission from the personal account of the named human who built the project. Never use an account named after the company or project, never a second account, and allow one team voice per thread. Ask the owner for team members' booster comments to be dropped, not drafted | The account and booster rules for HN [CPHN-F13, CPHN-F14]. Reddit bans manipulation and deception [CPRD-F01, CPRD-F02]. Lobsters uses its invitation tree against voting rings [CPLB-F06]. Hashnode allows one account per person [CPHS-F04] | Block CH-COM-03: one `account:` line and one `maker:` line per section, and no org or product name in the account | MUST |
| CH-COM-04 | Check each venue's account gate before you date a launch. On Lobsters, the account is at least as old as the gate in [CPLB-F01], and the tool's domain has a prior submission, or the account is older than that gate. It uses none of the tags `show`, `announce`, `vibecoding` before the gate age [CPLB-F04]. (SHOULD) The own-work share of its stories and comments in the last year stays under the rule of thumb in [CPLB-F02]; a breach is reported to the maker, not treated as a gate. On Reddit, record the gate as unknown until CH-COM-02 is met. When a MUST gate fails, move the date or drop the venue. Never open a fresh account for the launch | New accounts cannot self-promote [CPLB-F01] and cannot submit links to unseen domains [CPLB-F03] | Block CH-COM-04. The share is `(own+1)/(stories+comments+1)`; a value of 0.25 or more is flagged to the maker | MUST, except the (SHOULD) clause |

```sh
# CH-COM-01 (a): a count above 0 is a venue write call. Expect 0.
grep -c -i -E 'news\.ycombinator\.com/(submit|comment|vote|r)([^a-z]|$)|reddit\.com/api/(submit|comment|vote)|lobste\.rs/(stories|comments)|api\.stackexchange\.com/.*/(add|answers)' "$TOOLLOG"
# CH-COM-01 (b): a fact sheet heading that names post prose. Expect 0.
grep -c -i -E '^#+ *(post|text|title|comment|reply|first comment)' "$FACTS"
# CH-COM-01 (c): a fact sheet line that opens a Show HN title. Expect 0.
grep -c -E '^Show HN:' "$FACTS"
# CH-COM-01 (d): take the hash at session start, verify it at the end. Expect "hn-draft.md: OK".
sha256sum hn-draft.md > hn-draft.sha256
sha256sum -c hn-draft.sha256
# CH-COM-01 (d): no write or edit call names the draft. Expect 0.
grep -c -E 'hn-draft\.md' "$WRITELOG"

# CH-COM-02: the three counts are equal, one per venue section.
grep -c -E '^rules_read: https://[^ ]+ 20[0-9][0-9]-[01][0-9]-[0-3][0-9]$' "$PLAN"
grep -c -E '^rules_quote: "([^ ]+ +){7,}[^ ]+"$' "$PLAN"
grep -c -E '^## ' "$PLAN"
# CH-COM-02: ratios that no fetched page states. Any hit is the finding.
grep -n -E '9:1|10 ?%|90/10' "$PLAN" reddit-facts.md

# CH-COM-03: both counts equal the number of venue sections.
grep -c -E '^account: [a-z]+/[A-Za-z0-9_.-]+$' "$PLAN"
grep -c -E '^maker: ' "$PLAN"
# CH-COM-03: ORGNAMES is an extended regex of the org and product names, such as 'myorg|mytool'. Any hit is the finding.
grep -n -i -E "^account: .*($ORGNAMES)" "$PLAN"

# CH-COM-04: age_days is recorded and is at least the gate in CPLB-F01. A tags line that
# names show, announce or vibecoding with a younger account is the finding.
grep -n -E '^age_days: [0-9]+$' "$PLAN"
grep -n -i -E '^tags: .*(show|announce|vibecoding)' "$PLAN"
# CH-COM-04: the domain gate. DOMAIN is the tool's host. 200 means the site has seen it, 404 means it has not.
curl -s -o /dev/null -w '%{http_code}\n' "https://lobste.rs/domains/$DOMAIN"
```

## Show HN

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CH-COM-05 | Draft a Show HN fact sheet only when all four hold. (a) A stranger can install or run the project now, without an account or email. (b) If the project already had a Show HN, the release is a major overhaul, not new features or an upgrade; the maker attests this (human attestation), and a first Show HN needs no such claim. (c) The project has no Show HN in the last 183 days; if it has an older one, the fact sheet links it and says what changed. (d) The URL is the runnable thing: the repository root or the install page, never a landing page, docs page, release page, blog post or waitlist | Show HN is for something others can try [CPHN-F08], not a landing page [CPHN-F12], and upgrades are not substantive [CPHN-F11]. A release may be reposted once or twice a year [CPHN-F16]. No version-number test applies, because a 0.x project would fail it | Block CH-COM-05. (a) is a clean-container install run (unverified: reading heuristic) | MUST |
| CH-COM-06 | Check the maker's Show HN title before submission. It begins `Show HN: `. It contains no `!`, none of the superlatives HN names (best, fastest, biggest, and "first" used as a claim, such as "the first"), no site name of the submitted URL and no bare version number. A word of five or more capitals is allowed only from the acronym list. Never seed the title from a manifest or repository description | Titles carry no site name [CPHN-F05], no emphasis [CPHN-F06] and no superlatives [CPHN-F21] | `venue_check.py title` (block CH-COM-06). "First-class" passes; "the first" fails | MUST |
| CH-COM-07 | Prefer a Show HN as a URL submission, with the maker's backstory in the text field or, if the text does not show at the top, as the maker's first comment: what it is, why it was built, what differs, known gaps. Do not plan a text-only Show HN. Do not write that a first comment or a timed reply raises rank | Moderators said text posts are penalized [CPHN-F23, CPHN-F24], and the tips allow either placement [CPHN-F15]. Whether the ranking code still applies the penalty is unknown, so the rule stays SHOULD. The measured lift of a maker comment is none (see the base-rate section) | Block CH-COM-07 | SHOULD |
| CH-COM-08 | Never ask for votes, comments, submissions or a "boost" on any team-controlled surface, for any venue. Never post a live thread link with a call to action. Share a thread only after the fact, as information. Run the solicitation check on announcement surfaces before every launch and every release-template change, and hand each hit to a human. Never auto-delete a hit: product vocabulary such as a rating feature's "upvote" is a known false positive | Soliciting votes is banned [CPHN-F07], and a ring detector demotes posts [CPHN-F27]. Lobsters and Reddit ban the same act (CH-COM-03 sources) | `venue_check.py solicit` over the surfaces (block CH-COM-08). Every hit gets a human verdict recorded in the plan | MUST |
| CH-COM-09 | Plan one submission per URL per venue. Never delete and resubmit. An HN retry after a miss is a moderator repost invite used after about a week [CPHN-F26], or a human email to the second-chance address [CPHN-F25] that the plan treats as possibly unanswered [CPHN-F17]. No later step depends on a reply. A plain repost of the same URL is allowed only after about a year without significant attention [CPHN-F18] | Never delete and repost [CPHN-F19]. The tips edit says moderators cannot answer emails about their topic [CPHN-F17], and whether the pool address still replies is untested | Block CH-COM-09 | MUST |
| CH-COM-10 | Never state or plan around a ranking formula, a points target, a front-page goal or a "best day or hour". Recommend no posting time. If the owner asks for one, report that no day effect was found and that the hour gap is a confounded correlation in non-stationary data, with its n and window, and leave the time to the owner | Rank cannot be derived from votes and time alone [CPHN-F20]. The numbers are in the base-rate section | Block CH-COM-10 | MUST |
| CH-COM-11 | Never write "Launch HN" in a title or plan unless the owner confirms the company is a YC startup that has not used its one Launch HN | Launch HN is for YC startups, once each [CPHN-F22] | `grep -n -i 'Launch HN' community-plan.md` prints nothing, or the plan has a `yc_confirmed_by:` line | SHOULD |
| CH-COM-25 | Report a failed HN title or text check as the failing clause and the matched span from the maker draft, quoted, for example `CH-COM-06 superlative: "FASTEST"`. Do not offer a corrected title, a rewritten sentence or a list of alternatives | The tips and the guidelines ban AI-edited text [CPHN-F03, CPHN-F04], so a fix the maker pastes is AI-edited. The pass and fail titles in CH-COM-06 and in the fixtures are test data, not output to the maker | Block CH-COM-25. Limit: an unquoted prose suggestion passes both commands, so this format rule is SHOULD; the ban itself is MUST in CH-COM-01 | SHOULD |

```sh
# CH-COM-05 (b): only when (c) finds a prior Show HN. ATTESTER is the attesting name, QUOTE a one-line
# changelog quote, CHANGELOG its file. Both commands must print a line.
grep -x -F -e "$ATTESTER" makers.txt
grep -n -F -e "$QUOTE" "$CHANGELOG"
# CH-COM-05 (c): REPO is the repository URL. The count is the Show HN posts for it in the last 183 days. Expect 0.
curl -s "https://hn.algolia.com/api/v1/search?query=$REPO&restrictSearchableAttributes=url&tags=show_hn" > algolia.json
python3 -I -c 'import json,datetime as d; h=json.load(open("algolia.json"))["hits"]; c=d.datetime.now(d.timezone.utc)-d.timedelta(days=183); print(sum(1 for x in h if d.datetime.fromisoformat(x["created_at"].replace("Z","+00:00"))>=c))'
# CH-COM-05 (d): TARGET is the submitted URL. Any hit is the finding. For a github.com repository
# root, grep the README text instead (RAW_README is its raw.githubusercontent.com URL), because
# GitHub's own page markup always matches `sign.?up`.
curl -sL "${RAW_README:-$TARGET}" | grep -n -i -E 'pricing|waitlist|sign.?up|early access'
printf '%s\n' "$TARGET" | grep -E '/(releases|blog|docs)(/|$)'

# CH-COM-06: URL is the submitted URL, PRODUCT the product's own name. Exit 1 prints clause and span only.
python3 -I "$CHECKS"/venue_check.py title hn-draft.md --url "$URL" --product "$PRODUCT" --acronyms acronyms.txt

# CH-COM-07: the first two counts equal the number of HN sections. The last command prints nothing.
grep -c -E '^url: https?://' "$PLAN"
grep -c -E '^text_placement: (text field|first comment)$' "$PLAN"
grep -n -i -E 'first comment.*(boost|rank|algorithm)|comment within' "$PLAN"

# CH-COM-08: the surfaces are announcement surfaces; add every path on the plan's solicitation_paths line.
# --others lists the untracked plan and fact-sheet files this skill writes, which --cached alone would skip.
git ls-files -z --cached --others --exclude-standard -- 'README*' '*/README*' 'CHANGELOG*' '*/CHANGELOG*' '.github' 'cliff.toml' 'launch' 'announce' 'community-plan.md' '*-facts.md' | xargs -0 -r python3 -I "$CHECKS"/venue_check.py solicit

# CH-COM-09: the first and third commands print nothing, the second prints at least 1 where an HN retry is planned.
grep -n -i -E 'delete|resubmit|repost (tomorrow|next day)' "$PLAN"
grep -c 'hn@ycombinator.com' "$PLAN"
grep -n -i -E 'wait for (a )?(reply|response)|after (they|hn|moderators) (reply|respond)' "$PLAN"
# CH-COM-09: before a plain repost, the count of stories for the URL with 10 or more points in the last 365 days. Expect 0.
curl -s "https://hn.algolia.com/api/v1/search?query=$REPO&restrictSearchableAttributes=url&tags=story" > algolia.json
python3 -I -c 'import json,datetime as d; h=json.load(open("algolia.json"))["hits"]; c=d.datetime.now(d.timezone.utc)-d.timedelta(days=365); print(sum(1 for x in h if (x.get("points") or 0)>=10 and d.datetime.fromisoformat(x["created_at"].replace("Z","+00:00"))>=c))'

# CH-COM-10: both commands print nothing. A line that cites the measurement and says correlational is allowed.
grep -n -i -E 'front page|top (10|30)|[0-9]+ points|gravity|best (time|day|hour)|(mon|tues|wednes|thurs)day [0-9]' "$PLAN" | grep -v -E 'n=74,897.*correlational'
grep -n -i -E 'avoid [0-9]{2}:[0-9]{2}|post (at|between) [0-9]' "$PLAN"

# CH-COM-25: every quoted string in the report is in the maker draft. A FAIL line is the finding.
grep -o -E '"[^"]+"' report.txt | tr -d '"' | while IFS= read -r s; do grep -q -F -e "$s" hn-draft.md || echo "FAIL: $s"; done
# CH-COM-25: no report line carries a Show HN title other than the draft's own first line. Prints nothing.
head -n 1 hn-draft.md > draft-title.txt
grep -E 'Show HN: ' report.txt | grep -v -x -F -f draft-title.txt
```

## Other venues

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CH-COM-12 | Treat Stack Overflow as support, never as an announcement venue. Plan only human answers to existing questions that the tool solves. Each answer states the affiliation in its body and solves the problem without the link. (SHOULD) Put the same body-level affiliation line into any Reddit or Lobsters text that names the team's tool | Affiliation must be disclosed [CPSO-F03], links only support the answer [CPSO-F04], and the site cannot be the only support [CPSO-F05]. The Reddit and Lobsters clause is an inference, not a quoted rule: Reddit Rule 5 bans only intentional misleading and impersonation [CPRD-F02] | Block CH-COM-12 | MUST, except the (SHOULD) clause |
| CH-COM-13 | Never cross-post a teaser to dev.to or Hashnode that links out for the content: the post carries substantial content of its own. (SHOULD) Carry the full body of the source post | dev.to bans link-only posts [CPDT-F01]. Hashnode bans unsolicited promotional content [CPHS-F02]. No source sets a length; the paragraph floor is a pinned heuristic. Canonical-URL handling belongs to `marketing-quality` | Block CH-COM-13 | MUST, except the (SHOULD) clause |
| CH-COM-14 | On dev.to, publish a post that promotes the team's own tool only when a human wrote it without AI assistance. If AI touched any other dev.to post, it carries `#ABotWroteThis` or a disclosure line | AI-assisted posts must not promote any business, including your own [CPDT-F02], and must disclose [CPDT-F03] | Block CH-COM-14. The `provenance:` and `provenance_by:` values are human attestation; the agent never fills them | MUST |
| CH-COM-15 | On Hashnode, an agent may draft. Record a named human who edits and approves before publishing. Never bulk-generate posts or schedule an automated series. (SHOULD) Plan at most one launch post per venue; no source sets this number, it is a margin below the bulk and engagement-farming bans | The author is responsible for AI-generated content [CPHS-F01], and automated or bulk posting is banned [CPHS-F03] | Block CH-COM-15. The `approver:` value is human attestation; the agent never fills it | MUST, except the (SHOULD) clause |

```sh
# CH-COM-12: the Stack Overflow section lists question URLs, not a new question. Prints a line per URL.
grep -n -E '^question_urls: https://stackoverflow\.com/questions/' "$PLAN"
# CH-COM-12: a human checklist on the answer text ANSWER. The first command prints a line, and the second
# prints a working answer after the link is deleted (read it).
head -c 200 "$ANSWER" | grep -E "I (maintain|work on|built|wrote)|I'm (the author|affiliated)"
sed 's|https\{0,1\}://[^ )]*||g' "$ANSWER"

# CH-COM-13: the first command prints 0. The second counts paragraphs of 20 or more words and prints at least 3.
grep -c -i -E 'read (the )?(full|more|rest)|continue reading|full (post|article) (at|on|here)' post.md
awk 'BEGIN{RS=""} NF>=20{n++} END{print n+0}' post.md
# CH-COM-13 (SHOULD): the two counts are equal. SOURCE is the source post.
awk 'BEGIN{RS=""} NF>=20{n++} END{print n+0}' "$SOURCE"

# CH-COM-14: each section names a provenance and an attester; the attester is in makers.txt.
grep -n -E '^provenance: (human|ai-assisted)$' "$PLAN"
grep -n -E '^provenance_by: ' "$PLAN"
# CH-COM-14: a section that is ai-assisted and promotes the tool prints a line. Expect nothing.
awk '/^## /{p="";o=""} /^provenance: ai-assisted/{p=1} /^promotes_own_tool: true/{o=1} p&&o{print FILENAME": "FNR": ai-assisted post that promotes the tool"}' "$PLAN"
# CH-COM-14: an ai-assisted post carries the disclosure. Prints a line.
grep -n -i -E '#ABotWroteThis|with the help of AI' devto-post.md
# CH-COM-14: for a promotes_own_tool section the tool log shows no write to any file but the plan and the fact sheet.
grep -c -v -E 'community-plan\.md|devto-facts\.md' "$WRITELOG"

# CH-COM-15: APPROVER is the plan's approver value. The first command prints it, the second prints nothing.
grep -x -F -e "$APPROVER" makers.txt
grep -n -E '^(schedule|series):' "$PLAN"
# CH-COM-15 (SHOULD): launch sections for Hashnode. Expect 1 or fewer.
grep -c -E '^venue: hashnode$' "$PLAN"
```

## Chat

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CH-COM-21 | Keep chat secondary. Link a Discord or Matrix invite only beside the Discussions link, and only after the invite API shows it resolves and never expires. Never make Slack's free plan the community home | A chat-only route hides answers from search at small server sizes (CH-COM-24). A dead invite is worse than none. Slack's free plan keeps 90 days of history and deletes older data [CPSL-F01, CPSL-F02] | Block CH-COM-21 | MUST |
| CH-COM-22 | Post only user-facing release news to a public chat channel: title, tag, one sentence and the release-page link. Send pull-request, CI-failure and deploy events to a private channel, or stop sending them | Public visitors see CI noise. The changelog is the record, and chat is not. A bot's messages also stay inside the Developer Policy [CPDC-F07, CPDC-F08] | Block CH-COM-22 | SHOULD |
| CH-COM-23 | Before the first venue post, check that the linked Discord server's verification level is Low or higher and that AutoMod is available. The settings an agent cannot see (AutoMod rules with alerts, mention-everyone off for non-moderator roles, Raid Protection alerts, a moderator list, a second Discussions triager) go to the owner as questions; the agent never reports them as done | Low is level 1 [CPDC-F05]. This is a recommendation, not a posting requirement | `venue_check.py invite` (block CH-COM-21) | SHOULD |
| CH-COM-24 | Never write that a chat server's messages are findable by web search unless its invite API lists `DISCOVERABLE` | Indexing needs a Discoverable server [CPDC-F01, CPDC-F02], starts after mid-December 2026 [CPDC-F03], and is off by default in several regions [CPDC-F04]. A small server stays invisible | `venue_check.py claims` (block CH-COM-24). A sentence that denies indexing also matches; a human clears it | MUST |

```sh
# CH-COM-21: CODE is the invite code. The README that links chat also links Discussions (the second count is at least 1).
git ls-files -z -- 'README*' '*/README*' | xargs -0 -r grep -l -E -e 'discord\.gg' -e 'discord\.com/invite' -e 'matrix\.to' --
grep -c '/discussions' README.md
# CH-COM-21, CH-COM-23, CH-COM-24: one invite read serves all three. Exit 1 prints the failing gate.
curl -s "https://discord.com/api/v9/invites/$CODE?with_counts=true" > invite.json
python3 -I "$CHECKS"/venue_check.py invite invite.json
# CH-COM-21: Slack as the home. Prints nothing.
grep -n -i -E 'join\.slack|slack\.com/(join|invite)' README.md

# CH-COM-22: NOTIFY is the chat notify workflow. The first command lists two or more distinct secret names,
# and the second prints a line in the release step.
grep -n -E 'webhook:' "$NOTIFY"
grep -n -E 'html_url' "$NOTIFY"

# CH-COM-24: DOCS is the file list of sentences about the server. Add --invite invite.json to clear a Discoverable server.
python3 -I "$CHECKS"/venue_check.py claims "$DOCS"
```

## The HN base-rate measurement

This is a count made on 2026-11-27 over the Algolia API (`https://hn.algolia.com/api/v1/search_by_date?tags=show_hn`) for posts from 2024-11-27 to 2026-11-27 (74,897 mature Show HN posts). It is correlational. It carries no registry row because it is not a venue clause. Re-run it every 12 months and update this section. Nothing here is promoted to advice unless a source shows the effect is causal.

- 2.1% of posts reach 100 points, so 97.9% never do.
- Weekday against weekend: 2.0% against 2.2%. No day effect.
- 14:00 to 18:59 UTC against 06:00 to 10:59 UTC: 2.5% against 1.2%. The gap is confounded by audience and competing volume, the 100-point rate fell between the window's halves, and so no hour is recommended.
- A maker comment within 60 minutes: 1.5% against 2.0% (n=3,909). No lift.
- URL posts with body text: 2.7%. Text-only posts: 1.2%.
- Titles with any of six superlatives: 1.3% against 2.1% (n=1,954, one mixed bucket). All-caps words: 2.8% against 2.1% (n=4,300), no penalty found, so the capitals clause of CH-COM-06 is a compliance rule, not a ranking claim.
