---
name: linkedin-post
description: "LinkedIn posts for a software product, written for a named person rather than a company Page: the goal and metric header, the first three lines, the length limit, link placement and link cards with their Open Graph tags, document posts, image alt text, polls, engagement-bait patterns, sponsorship and AI-use disclosure, and dated LinkedIn facts. Use when someone asks for a LinkedIn post, a LinkedIn announcement of a release or launch, a carousel or document post, a company Page update, or a review of a LinkedIn draft. Not for posting, scheduling or automation, which LinkedIn bans and channel-publishing forbids, and not for X, Bluesky or Mastodon posts, which is microblog-post."
license: Apache-2.0
metadata:
  summary: Drafts and reviews a person-led LinkedIn post about a software tool, ending in a draft file for a human to post
  keywords: linkedin,post,carousel,document-post,release,launch,open-graph,alt-text,disclosure,engagement-bait,fold,channel
  grim.requires.skills.channel-publishing: "./channel-publishing:0"
---

# linkedin-post

An agent drafts. A named human posts. This skill turns a brief into a draft file, checks it, and hands it over with the questions only the human can answer. Every LinkedIn limit, policy clause and reach figure comes from [references/facts.md](references/facts.md).

Contents: [Stop condition](#stop-condition) · [Boundary](#boundary) · [Procedure](#procedure) ·
[The draft file](#the-draft-file) · [Rules](#rules) · [Facts and the manual re-read](#facts-and-the-manual-re-read) ·
[What to ask a human](#what-to-ask-a-human) · [Siblings](#siblings)

## Stop condition

Stop when a draft file exists, `li_draft_check.py` printed nothing (or each finding is listed in `open_asks` with its rule ID), and the hand-off names what the human still does. Never post, schedule, comment, repost or upload. Never open linkedin.com in a browser.

## Boundary

The five `channel-publishing` rules that bind this skill, repeated here because the skill may load without it:

- CH-CORE-01: the work ends at a publish package. Call no write endpoint and drive no web UI. The package header carries `platform`, `account`, `action`, `labels`, `ai_role`, `sponsored`, `spend`, `open_asks`, `approved_by` and `approved_at`. Leave the last two empty.
- CH-CORE-06: LinkedIn has no AI field. State `ai_line` and `brand_partnership` as explicit true or false in `labels:`, and list the Brand partnership toggle as a manual step.
- CH-CORE-08: a sponsor, material-connection or required AI disclosure goes in the first line or two, before the "see more" cut. A hashtag, the profile or a last line never counts alone.
- CH-CORE-11: take every limit, clause and figure from a row of `references/facts.md`, cited as `[LI-Fnn]`. With no row, state no number.
- CH-CORE-13: a facts row past `verified + refresh_days` fails. Re-fetch it; never extend the date.

CH-LI-01 below is the LinkedIn case of CH-CORE-01.

## Procedure

`LI=.claude/skills/linkedin-post`, `CHECKS=$LI/checks`, `CP=.claude/skills/channel-publishing/checks`. Use `$CLAUDE_CONFIG_DIR/skills/...` for a global install. When the skills are not installed under `.claude/skills`, set `LI`, `CHECKS` and `CP` to the directories they were loaded from (`CP` is the `checks` directory of `channel-publishing`).

1. **Read the facts.** Input: `$LI/references/facts.md`. Run `python3 -I "$CP"/facts_check.py "$LI"/references/facts.md`. Done: exit 0. A row that fails is a manual re-read (see below), not a step you skip.
2. **Collect the brief.** Ask the human for: the author (a person), the goal, the metric that exists for that goal, the author's tie to the tool, a first-hand element with its command or file, a `source:` line for every number and quote, the `consented:` names for every mention, and whether value was exchanged. Done: each of these is a header key or an entry in `open_asks`. With no first-hand element, stop and ask. Do not invent one.
3. **Pick the format from the goal.** Use the table under CH-LI-22. Done: `format` and `visual` are set, or `format_reason:` says why not.
4. **Write the draft file** to `post-draft.md` or the path the human names, in the layout of [The draft file](#the-draft-file). Write a new opening sentence; never paste release-note lines. Keep lines 1 to 3 under the fold budget in [LI-F27] while they carry the CH-LI-04 disclosure, the subject and a first-hand number. Done: header and body both exist.
5. **Place the link and the visuals.** One typed URL after line 3, no URL in lines 1 to 3. Write alt text yourself. Done: CH-LI-09 and CH-LI-11 hold.
6. **Run the checker.** `python3 -I "$CHECKS"/li_draft_check.py post-draft.md --source NOTES --plan PLAN`. Add `--source` when the post comes from release notes or a README, and `--plan` for any plan or hand-off note you wrote. Fix each finding. A SHOULD finding may stay with a reason in `open_asks`. Done: exit 0.
7. **Run the manual checks** CH-LI-10 (link card tags) and CH-LI-12 (accessible URL) from their blocks below when the draft needs them. Done: the output matches the rule's pass condition.
8. **Hand over.** Give the human the file, the manual steps (post it, set the Brand partnership toggle if `value_exchanged` is true, run Post Inspector, confirm no preview card), and `open_asks`. After the human edits, `reviewed_by` and `human_rewrite` are theirs to set. Done: re-run with `--final` once they have.

A draft for a company Page is not a different job: the author stays a person (CH-LI-20) and the Page decision goes to the owner.

## The draft file

Header lines `key: value`, a line `---`, the post body exactly as it will be posted, and an optional line `<!-- hand-off -->` that starts notes for the human. Only the body is measured as post text. Repeat `image:`, `slide:`, `poll_option:`, `code_text:` and `source:` as needed. An `alt:` belongs to the `image:` above it.

```text
platform: linkedin
account: <profile URL of the posting person>
action: draft
labels: ai_line=<true|false> brand_partnership=<true|false>
ai_role: <none|light|heavy>
sponsored: <true|false>
spend: none
open_asks: <questions for the human, or none>
approved_by:
approved_at:
author: <a person's name>
goal: <awareness|repo-traffic|install|credibility>
metric: <impressions|members-reached|github-referrers|registry-downloads|utm-clicks>
format: <text|text-image|document|video>
visual: <none|image|document|video>
human_rewrite: unset
value_exchanged: <true|false>
reviewed_by:
connection: <none, or the plain statement of the tie>
first_hand: <a line that appears verbatim in the body>
source: <each number or quote: the command, path or URL that produced it>
consented: <names of every person the body mentions>
---
<body>
```

`connection:` is an addition to the contract: CH-LI-04 needs to know whether a tie exists. Further keys the checks read: `image:`, `alt:`, `alt_long_reason:`, `code_text:`, `doc_title:`, `pages:`, `mb:`, `slide:`, `accessible_url:`, `poll_question:`, `poll_option:`, `poll_approved_by:`, `visibility:`, `ai_disclosure_policy:`, `format_reason:`, `analytics_on_target:`.

## Rules

Severity: MUST blocks hand-over. SHOULD needs a stated reason to skip. IDs are stable. CH-LI-05 is retired, merged into CH-LI-03; do not reuse the number. The checker `li_draft_check.py` prints each finding as `file: ID SEVERITY: message`. Run it as `python3 -I "$CHECKS"/li_draft_check.py DRAFT`.

### Boundary and draft file

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CH-LI-01 | Never call a LinkedIn posting API, a scheduler or RSS auto-import. Never drive linkedin.com in a browser, and never fetch posts, profiles or the feed. Fetch only `linkedin.com/help/` and `linkedin.com/legal/` pages. | User Agreement 8.2 bars scraping, bots and overlays [LI-F17]; accounts risk restriction [LI-F18]. | See block CH-LI-01. Run time: `unverified: reading heuristic` plus the tool-log block. | MUST |
| CH-LI-21 | Write the post to a draft file whose header holds `author`, `goal`, `metric`, `format`, `visual`, `ai_role`, `human_rewrite`, `value_exchanged` and `reviewed_by`, plus the CH-CORE-01 package keys. | The header carries the fields the other checks read. | Checker, `CH-LI-21` and `CH-CORE-01` findings. | MUST |
| CH-LI-02 | Declare one `goal` and one `metric` that exists for the target before drafting. `utm-clicks` only when the landing page records UTM parameters (`analytics_on_target: true`). | A metric that records nothing makes the goal unjudgeable. GitHub referrers cover a short window [LI-F26]. | Checker, `CH-LI-02`. Pass: goal repo-traffic, metric github-referrers. Fail: goal engagement. | MUST |
| CH-LI-22 | Pick `format` from the goal's row of the table below, unless `format_reason:` says why not. | LinkedIn publishes no format ranking; each cell is a convention, so this is a default. | Checker, `CH-LI-22`. | SHOULD |
| CH-LI-20 | Name a person as author of every post. A company Page is an owner decision: never create one, and when you raise one, say that no dataset compares a Page with a person on clicks for a developer tool. | No such dataset exists; the rule routes a decision and does not claim a person beats a Page. | Checker, `CH-LI-20`, with `--plan` for the plan. | SHOULD |

Format by goal (convention, not a LinkedIn requirement):

| Goal | Default format | Metric available |
|---|---|---|
| awareness | `text-image`: text plus one image of terminal output or a diagram, with alt text, and no URL | impressions, members-reached |
| repo-traffic | `text`, `document` or `video` with the URL typed in the body after line 3 and no preview card. `text-image` only after case 11 passes (CH-LI-09) | github-referrers |
| install | `text` with the exact install command and one URL, or `video` that is captioned and short | github-referrers, registry-downloads |
| credibility | `document` about one decision or benchmark, with its substance repeated in the post text | impressions |

### Content and sources

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CH-LI-07 | Put at least one checkable first-hand element in the post: a number with the command or file that produced it, or a quoted block of real output. When the brief has none, ask for it. | Generic content is less widely distributed; AI-assisted content is welcome when it reflects a real person's view [LI-F21]. | Checker, `CH-LI-07`: `first_hand:` is verbatim in the body, has a digit or backtick span, and a `source:` line exists. Reading heuristic, not the gate: delete the product name, and the post must not read as true of a competitor. | MUST |
| CH-LI-08 | Every number and quote has a `source:` line. Every @-mention is on `consented:`. `reviewed_by` names a human, not the agent. | Specificity pressure (CH-LI-07) pushes agents to invent figures; mentions notify people and may be limited [LI-F23]. | Checker, `CH-LI-08`. | MUST |
| CH-LI-15 | When the post comes from release notes or a README, write a new opening sentence and keep the share of 6-word sequences that also appear in the source below 0.20. Add the CH-LI-07 element from a human. | Release notes written as commit subjects give generic, repetitive posts. The 0.20 threshold is a program choice with no source. | Checker with `--source NOTES`, `CH-LI-15`. | MUST |
| CH-LI-23 | When a draft, plan or hand-off note says what a link or URL does to reach, give a range with its baselines, tagged 3P, never one number. Use the rows [LI-F32] and [LI-F35] together. | One vendor reports three values for one placement and no independent study exists. | Checker with `--plan`, `CH-LI-23`: each such line carries `3P` or `vendor` and two distinct figures. | SHOULD |

### Fold, length and link

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CH-LI-03 | Keep lines 1 to 3 within the fold budget [LI-F27], with no blank line and no URL in them. Make line 1 a complete sentence that names the tool or subject. | LinkedIn states no fold; the budget is a third-party estimate, so this is a SHOULD. A blank line costs a line. | Checker, `CH-LI-03`. Cover test (reviewer): hide everything after line 1; the subject is still named. Pass: "mytool 0.9 pins every skill by digest in one lockfile." Fail: "Big news in CI land." | SHOULD |
| CH-LI-06 | Keep the body at or below the post limit [LI-F01] minus 100, counted as the largest of code points, UTF-16 units and graphemes. Never use Unicode mathematical bold or italic letters (U+1D400 to U+1D7FF). | The unit LinkedIn counts is unmeasured. Screen readers handle styled letters badly [LI-F30]. | Checker, `CH-LI-06`. Count with the script, never with `len()` or `.length`. | MUST |
| CH-LI-09 | Type the URL in the body as plain text, once, after line 3, in a text, document or video post, with no preview card. Combine a typed URL with an image only when `case11: pass <date>` is in the facts file. Never move the link to the first comment for reach. | Placement effects are vendor figures that conflict [LI-F31 to LI-F36]; comment clicks are not counted. An image post carries a URL or an image, not both [LI-F07]. | Checker, `CH-LI-09`. The human confirms in the composer that no card appears. Link in a comment anyway: record why in the header (`unverified: reading heuristic`). | SHOULD |
| CH-LI-10 | When a post shows a link card, the target page carries `og:title`, `og:image`, `og:description` and `og:url`. `og:image` is an absolute URL to a PNG or JPEG that meets [LI-F08]. After any change to the tags, run Post Inspector before posting [LI-F09]. | A card with no image looks broken, and an old preview stays on posts already made. | See block CH-LI-10. The header records the Post Inspector run time before the post time. | MUST |

### Visuals, documents and polls

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CH-LI-11 | Write the alt text for every image yourself; LinkedIn's automatic alt text does not count [LI-F12]. When the image shows code or terminal text, put the same text in the body or the alt text. Keep alt text under the recommended length [LI-F14] unless `alt_long_reason:` is set. | The automatic text is LinkedIn's guess. An image of text needs real text beside it (WCAG 2.2 SC 1.1.1 and 1.4.5). | Checker, `CH-LI-11`: non-empty `alt:`, not a filename or "screenshot". Pass: "Terminal: mytool install pins 3 skills, exit 0". Fail: "screenshot.png". | MUST |
| CH-LI-12 | For a document post, set `doc_title`. Stay within the document limits [LI-F03], flatten layers, keep one page size. Repeat each slide's heading and key sentence in the post text, or link an accessible HTML version on an owned page. A tagged PDF is an addition, never the only path. | The feed shows pages as images and the document has no alt field [LI-F15]. | Checker, `CH-LI-12`; for `accessible_url`, see block CH-LI-12. | MUST |
| CH-LI-19 | Hand poll wording to the human for approval before the poll is created, because a poll cannot be edited [LI-F13]. Never plan to delete and repost a video to reset reach [LI-F25]. | A poll error cannot be fixed afterwards. | Checker, `CH-LI-19`: poll limits [LI-F06], and `poll_approved_by:` with `--final`. | SHOULD |

### Engagement

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CH-LI-13 | Do not ask readers to comment a keyword, type YES, react with an emoji or tag a friend. Do not gate a link or asset behind a comment, a reaction or a DM request. | A reach rule, not a policy violation; no LinkedIn page bans the bait by name. The DM automation it invites is barred [LI-F17]. | Checker, `CH-LI-13`. | SHOULD |
| CH-LI-14 | Never write, recommend or template: a request to like, comment or share at a set time or in a launch window, a repost schedule across accounts, an engagement group, or comment or repost automation. Send any idea of asking colleagues to share to the owner. | Pods and automated comments are not allowed [LI-F19]; agreeing ahead of time to like or re-share is barred [LI-F20]; reposting may be limited [LI-F24]. | Checker, `CH-LI-14`, over the body, the hand-off and every `--plan` file. | MUST |

### Disclosure

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CH-LI-04 | When the author maintains, founded, works for, sells, is paid by, or is sponsored for the tool, state that tie in a plain sentence in line 1 or 2, within the fold budget [LI-F27]. A hashtag, the last line or the profile headline never carries it alone. | A disclosure behind "see more" or only on a profile fails the FTC's placement guidance [LI-F37]. The legal standard belongs to `marketing-quality`; this rule fixes the placement. | Checker, `CH-LI-04`, reads `connection:`. The check is a floor: the reviewer confirms that the sentence states the real tie. | MUST |
| CH-LI-16 | Record `ai_role` (none, light or heavy) and `human_rewrite` (yes, no or unset) in the header. Always write `human_rewrite: unset`; only the human changes it. When `ai_role` is heavy and `human_rewrite` is not yes, add a plain line such as "Drafted with an AI assistant, reviewed by me." Omit it only under a written owner policy (`ai_disclosure_policy:`). A disclosure that a law or the platform's terms require stays MUST under CH-CORE-08. | LinkedIn recommends saying so after heavy AI use [LI-F21] and has no AI field. Adding the line by default is a program default, not a LinkedIn requirement. | Checker, `CH-LI-16`; a finding is reported and does not block hand-over. | SHOULD |
| CH-LI-17 | When `value_exchanged` is true (payment, a free product, a sponsored trip or licence), end the hand-off with "set the Brand partnership toggle; the post must be Public", and keep the CH-LI-04 line. | The label is required for value exchanged, is available for public posts only, and resets to Off for each post [LI-F22]. No API field was found, so a human sets it. | Checker, `CH-LI-17`: the text `Brand partnership`, `visibility: public`, and the CH-LI-04 check. | MUST |

### Facts

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CH-LI-18 | In this skill and its facts file, take every LinkedIn limit, fold figure and reach effect from the facts file. Each row carries provenance, `verified`, `refresh_days` and an `expect` pattern. Every reach, format or link effect in skill prose carries its tag, date and sample. | Agents repeat folklore: old character limits, "links kill reach", "the hour after posting decides". Help pages carry only relative dates. | See block CH-LI-18. | MUST |

### Verification blocks

```sh
# CH-LI-01 committed code: any hit is the finding
git ls-files -z -- '.github/workflows' 'scripts' ':(exclude,glob)**/linkedin-post/**' \
  | xargs -0 -r grep -l -E -e 'linkedin\.com/(rest|v2|feed|in/|posts)' -e 'ugcPosts' -e 'play[w]right' -e 'pupp[e]teer' -e 'sele[n]ium' --
# CH-LI-01 run time: $TOOL_LOG is a file holding the session's tool log; any line printed is the finding.
# With no such file (check: test -f "$TOOL_LOG"), skip this block and write 'unverified: no tool log' in open_asks.
grep -o -E '//(www\.)?linkedin\.com/[A-Za-z0-9_-]+' "$TOOL_LOG" | grep -v -E 'com/(help|legal)$'
# CH-LI-01, human, every 90 days: the bot clause is still in the User Agreement
curl -sL --compressed -m 40 -A 'Mozilla/5.0 research' https://www.linkedin.com/legal/user-agreement \
  | sed 's/<[^>]*>/ /g' | grep -c -F -e 'bots or other unauthorized automated methods'
```

```sh
# CH-LI-10: $TARGET is the page the post links to; must print 4
curl -s "$TARGET" | grep -o -E 'property="og:(title|image|description|url)"' | sort -u | wc -l
# CH-LI-10: $OG_IMAGE is the absolute og:image URL; want 200, and width, height and size inside [LI-F08]
curl -sL -o og.img -w '%{http_code}\n' "$OG_IMAGE"; file og.img; wc -c < og.img
```

```sh
# CH-LI-12: $ACCESSIBLE_URL is the header's accessible_url; must print 200
curl -s -o /dev/null -w '%{http_code}\n' "$ACCESSIBLE_URL"
```

```sh
# CH-LI-18: facts file grammar and staleness; exit 0
python3 -I "$CP"/facts_check.py "$LI"/references/facts.md
# CH-LI-18 prose half: a reach, format or link figure with no source tag; any hit is the finding
grep -n -E '[0-9]+ ?(%|x|times)|more rea[c]h|first hou[r]' "$LI"/SKILL.md | grep -v -E '\((LI|LI-API|GOV|STD|3P)'
# CH-LI-18 date half: a percentage with no date; any hit is the finding
grep -n -E -e '-[0-9]+ ?%' "$LI"/SKILL.md "$LI"/references/facts.md \
  | grep -v -E -e '20[0-9]{2}-[0-9]{2}' -e '[0-9]{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) 20[0-9]{2}'
```

## Facts and the manual re-read

Cadence: every row carries `refresh_days`, 180 for hard limits and 90 for policy, behaviour, label triggers and third-party figures. `facts_check.py` fails on the first overdue row. Re-fetch it; never extend the date. LinkedIn bars automated access, so every row on `linkedin.com` is a manual row. Do the re-read this way:

1. Run the CH-LI-18 facts command. Input: `references/facts.md`. Done: it lists each overdue row.
2. For each overdue `linkedin.com` row, ask the human to open its `url` in a browser and find the `expect` text. You may read a `linkedin.com/help/` or `linkedin.com/legal/` page with a plain HTTP client to prepare the edit, once, in a session the human started. Never load member content.
3. Edit `value`, `source_date` (write the page's relative age as `relative:<text>@<today>`) and `verified`. Done: the human confirms the row matches the page.
4. A vendor row (`vendor` provenance) stays a claim. Re-read its page; if the figure moved, change the row and say so in the hand-off. Never promote it to a threshold in the checker (CH-CORE-15).
5. Run case 11 when a human can: post an image with a typed URL in the composer, without extensions or scripts, and confirm the image, a clickable URL and no card. Write `case11: pass <YYYY-MM-DD>` in the facts file, or leave `not run`. Done: the line matches what the human saw.

Re-check events beyond the cadence: a LinkedIn client redesign (fold rows), the December 2026 re-check that MagicPost states for its July changes (reach rows), and the sunset in [LI-F16].

## What to ask a human

- Who posts, from which profile, and when. Posting is a human act.
- The author's exact tie to the tool, and the disclosure wording for the markets the post reaches.
- The first-hand element: the real number, its command and output, the failure or the trade-off. Also the source of every quote and the consent of every person mentioned.
- Whether value was exchanged, so the Brand partnership toggle is needed.
- Whether the human rewrote the draft, and the owner's AI-disclosure policy if the default line should be off.
- Approval of any poll wording before the poll is created.
- Whether colleagues may be asked to share. Never write a schedule or a list.
- Whether to create a company Page. The evidence does not decide it.
- Whether to use a third-party scheduler, preview tool or extension. The default is no; LinkedIn's own composer is the safe scheduler.
- Whether to add an owned redirect or analytics so clicks can be counted. Without one, only impressions and GitHub referrers exist as metrics.
- Whether the author's profile is verified and its headline names the post's topic. New accounts are shown narrowly.

## Siblings

- `channel-publishing` (required): the boundary every public channel shares, the facts-file format and `facts_check.py`.
- `microblog-post`: X, Bluesky, Mastodon and Threads posts.
- `launch-plan`: a launch cites this skill for its LinkedIn post. `release-notes`: the source a release post must differ from (CH-LI-15).
- `marketing-quality`: claims, numbers and the legal standard for disclosure. When it is not installed, the `source:` line per number (CH-LI-08) is the floor.
- Owned-site metadata for link cards (`og:` tags on the target page) belongs to `marketing-quality`; CH-LI-10 only consumes it.
