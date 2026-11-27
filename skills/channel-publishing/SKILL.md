---
name: channel-publishing
description: "The boundary every public channel shares: an agent drafts and a named human posts, which venues get only a fact sheet, why Stack Overflow gets nothing, owner-commissioned automation on X, Bluesky, Threads, Mastodon and Discord, platform label fields for AI use and sponsorship, disclosure before the fold, publishing-credential scans, the dated platform-facts registry, and the channels.yml inventory of the accounts a project may link. Use when drafting or reviewing any public post, upload, listing or announcement for a social, video or community platform, adding a social link or badge to a README or site, wiring a webhook or bot that posts, or editing channels.yml. Not for GitHub releases, About fields or package-registry listings, which are release-notes and github-presence. The platform skills require this skill."
license: Apache-2.0
metadata:
  summary: The agent-versus-human boundary, label fields, dated platform facts and channel inventory that every public-channel skill shares
  keywords: social,publishing,boundary,linkedin,youtube,x,bluesky,mastodon,threads,discord,reddit,hacker-news,product-hunt,labels,disclosure,c2pa,gitleaks,channels,inventory,facts-registry,fact-sheet
  claude.user-invocable: "false"
---

# channel-publishing

An agent ends public-channel work at a publish package. A named human posts. This skill
holds the rules that every platform skill shares: what the agent may produce for each
venue, which label fields to fill, where a disclosure goes, how platform facts are kept
fresh, and which accounts a project may link. Platform skills repeat the boundary rules
that apply to them and require this skill for the rest.

**Pinned** defaults an adopter overrides once: the package header keys, the fact-sheet
keys and its 20-word cap, the refresh intervals, the `channels.yml` name and location,
and the staleness limits. Everything else follows a platform's own published terms.

Contents: [Stop condition](#stop-condition) · [Venues](#venues) ·
[Procedure](#procedure) · [The publish package](#the-publish-package) ·
[Rules](#rules) · [Run the checks](#run-the-checks) ·
[Claims in a draft](#claims-in-a-draft) · [What an agent asks a human](#what-an-agent-asks-a-human) ·
[Files](#files)

## Stop condition

Stop when all four hold. Do not keep going.

1. A package file exists with all ten header keys, and `approved_by` and `approved_at` are empty.
2. Every platform number cites a registry id or carries `(command: ...)`.
3. Every check in [Run the checks](#run-the-checks) for the venue exits 0, or each finding is an `open_asks` line.
4. Nothing was posted, uploaded, submitted, scheduled or paid for.

## Venues

Find the venue first. An unknown venue gets the strictest output, a fact sheet, and the
gap is named in `open_asks` (CH-CORE-11).

| Venue | The agent produces | Rules |
|---|---|---|
| LinkedIn, YouTube, TikTok, X, Bluesky, Threads, Mastodon, Discord, Product Hunt listings, BetaList | A publish package. Never a post, upload, submission or payment | CH-CORE-01, 06 to 08 |
| X, Bluesky, Threads, Mastodon, Discord with a `channels.yml` bot row | Nothing by hand. The owner's bot posts, inside its row's gates | CH-CORE-02 |
| Hacker News, Product Hunt comments, Lobsters, dev.to promotional articles | A fact sheet and nothing else | CH-CORE-03 |
| Reddit | A fact sheet, until the subreddit's rules are fetched and quoted | CH-CORE-03, 05 |
| A community-run venue: a subreddit, a Mastodon instance other than mastodon.social and mastodon.online, a Discord server, a forum | Fetch its rules in the same session first | CH-CORE-05 |
| Stack Overflow | Nothing. At most a list of cited sources the human may read | CH-CORE-04 |
| GitHub, npm, PyPI, crates.io, VS Code Marketplace, GHCR | Out of scope. Use `github-presence` and `release-notes` | CH-CORE-01 |

## Procedure

`CHECKS` is `.claude/skills/channel-publishing/checks` (`$CLAUDE_CONFIG_DIR/skills/channel-publishing/checks`
when installed globally). `PKG` is your package file. `REPO` is `org/repo` of the repository you work in. `FACTS` is the platform skill's
`references/facts.md`. Every script runs as `python3 -I` and exits 0 clean, 1 on findings, 2 on bad usage.

1. **Classify the venue.** Input: the task. Look the venue up in the table above. Done: one output mode is named.
2. **Check the registry is fresh.** Input: `FACTS`. Run `python3 -I "$CHECKS"/facts_check.py "$FACTS"`. A finding is an overdue or malformed row: re-fetch it (`references/registry-format.md`), never extend its date. Done: exit 0, or each overdue id is an `open_asks` line and you use no number from it.
3. **Read the community's rules**, for a community-run venue only. Fetch the rules page now. Put `rules_fetched: <YYYY-MM-DD> <url>` on line 1 and `rules_quote: "<one rule, verbatim, 8 words or more>"` on line 2 of `PKG`. Fetch failed: apply the fact-sheet output (CH-CORE-03). Done: `draft_check.py rules-fetch "$PKG"` exits 0.
4. **Write the package.** Use the format in [The publish package](#the-publish-package). For a fact-sheet venue, write only the fact sheet (CH-CORE-03). For Stack Overflow, write no content (CH-CORE-04). Done: the ten header keys exist.
5. **Fill labels and decide AI use.** Set every label field of the platform to an explicit `true` or `false` (CH-CORE-06). Choose `ai_use` from the registry rows that start `trigger:` or `exemption:`, or write the exact line `ai_use: borderline` with an `open_asks` entry naming `ai_use`, or `ai_use: no-ai` when no AI touched the media (CH-CORE-07). A platform with no AI label (LinkedIn, Bluesky, Mastodon) needs no `ai_use` line. Done: `draft_check.py labels` and `draft_check.py ai-use --facts "$FACTS"` exit 0.
6. **Place disclosures.** Put every sponsor, material-connection or required AI disclosure before the fold (CH-CORE-08). Done: `draft_check.py disclosure "$PKG"` exits 0.
7. **Cite every platform fact.** Append `[ID]` from the registry to each limit, field, price or clause, or `(command: ...)` for a figure you measured. With no row, state no number and name the gap (CH-CORE-11). Done: `draft_check.py refs --facts "$FACTS" "$PKG"` and `draft_check.py claims "$PKG"` exit 0.
8. **Handle credentials and automation.** If the task wires a webhook, bot or scheduler: it needs a `channels.yml` bot row (CH-CORE-02), a listed `runs_from` file, and the gitleaks rules (CH-CORE-10). You may propose such a system and never create one. Done: the `scan` command in block CH-CORE-01 below lists nothing.
9. **Check channel links.** If the task adds or edits a social link or badge, find its row in `channels.yml` and run `channels_check.py` (CH-CORE-17 to 19; `references/channels-inventory.md`). Never link a handle that has no row. Done: exit 0.
10. **Hand over.** List every `open_asks` line as a question for the human, name the package file, and stop. Never say a post is live.

## The publish package

A draft file. The header is plain `key: value` lines, nested keys are indented, and a blank
line ends it. The body is the draft.

```text
platform: youtube
account: example-channel
action: upload
labels:
  status.containsSyntheticMedia: true
  paidProductPlacementDetails.hasPaidProductPlacement: false
ai_use: yes, case: YT-F03
ai_role: drafted the script, no generated footage
sponsored: false
spend: none
open_asks: confirm ai_use is yes for the reenactment scene
approved_by:
approved_at:

Title, description and the rest of the draft.
```

The ten required keys are `platform`, `account`, `action`, `labels`, `ai_role`,
`sponsored`, `spend`, `open_asks`, `approved_by` and `approved_at`. A human fills the
last two. The `ai_use` line is required wherever the platform has an AI label (not on LinkedIn, Bluesky or Mastodon, where `draft_check.py ai-use` passes without it). For a
community-run venue, `rules_fetched` and `rules_quote` come first (step 3).

## Rules

Severity is the tier of the rule: MUST blocks, SHOULD needs a stated reason.
CH-CORE-16 is retired, merged into CH-CORE-11, and its number is not reused.
Clause text, source URLs and dates are in `references/boundary-clauses.md`.

### Boundary

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CH-CORE-01 | Scope: LinkedIn, YouTube, X, Bluesky, Threads, Mastodon, Discord, TikTok, Reddit, Hacker News, Lobsters, Product Hunt, dev.to, Stack Overflow and BetaList. On these, end every task at a publish package. Never call a write endpoint (post, reply, comment, like, follow, upload, visibility or metadata change, listing submission or payment), and never drive the web UI. The only exception is a CH-CORE-02 bot. Out of scope: GitHub (releases, About, topics, social preview, Discussions) and package registries (npm, PyPI, crates.io, VS Code Marketplace, GHCR), which follow CH-GH-04, CH-GH-07 to CH-GH-22 and CH-GH-27 | YouTube requires consent for each automated action, LinkedIn bans bots, Hacker News bans automated posting, Reddit and Product Hunt gate API access. GitHub bars only bulk and inauthentic automation | `python3 -I "$CHECKS"/boundary_check.py scan --repo "$REPO" --channels channels.yml` lists nothing (it reads tracked and untracked, non-ignored files). The `browser` command in block CH-CORE-01 below prints nothing for the channel-skill files it is given. `boundary_check.py package "$PKG"` prints nothing | MUST |
| CH-CORE-02 | Run unattended posting only as owner-commissioned automation on X, Bluesky, Threads, Mastodon or Discord, never elsewhere. Each instance needs a `channels.yml` row with `automation: bot`, `approved_by`, `credential` (a secret name), `labels_required`, `runs_from` (the repository-qualified file that posts), `gates_attested`, `attested_by`, `attested_at`, and on X a `spend_cap`. The gate ids per platform are in `references/channels-inventory.md`. An agent may propose such a system and never creates one | Each platform documents a labelled bot path, and its gates are the platform's own conditions. A total ban would forbid what the platforms permit | `python3 -I "$CHECKS"/channels_check.py channels.yml` prints nothing. Every file the scan in CH-CORE-01 lists is a row's `runs_from`. Block CH-CORE-02 below covers `bs-label` and `ma-flag`. The other gates are `unverified: attested by a human` | MUST |
| CH-CORE-03 | For Hacker News (posts and comments), Product Hunt comments, Lobsters, Reddit (until CH-CORE-05 clears the subreddit) and dev.to promotional articles, output only a fact sheet. It has one heading, `## Fact sheet, the human writes the post`, then only bullets `- <key>: <value>`. The keys are `version`, `install`, `repository`, `measured` (a figure with `(command: ...)`), `limit` and `motive`. `motive` stays blank. A value has at most 20 words outside backticks and no first-person or second-person pronoun. Produce no title, no first comment and no other prose. A label never makes paste-ready text acceptable | These venues ban generated or AI-edited text, or weight author-written posts. Any LLM rewrite counts as AI-edited, so the skill does not look for the line | `python3 -I "$CHECKS"/factsheet_check.py "$PKG"` prints nothing | MUST |
| CH-CORE-04 | Produce no Stack Overflow content of any kind: no answer draft, no outline, no question text. At most, list the cited sources the human may read | Its policy bans LLM drafting, not only posting | The skill refuses the venue and quotes the clause. `boundary_check.py package` fails `platform: stackoverflow`. Block CH-CORE-04 below lists no draft files | MUST |
| CH-CORE-05 | Before drafting for a venue whose rules are set per community, fetch that community's rules in the same session. Start the output with `rules_fetched: <YYYY-MM-DD> <url>` and a second line `rules_quote: "<one rule, verbatim, at least 8 words>"`. If the fetch fails, apply CH-CORE-03 | Rules differ per community. A date stamp can be written without a fetch. A verbatim quote that a check finds on the live page cannot be | `python3 -I "$CHECKS"/draft_check.py rules-fetch "$PKG"` prints nothing. On a host that blocks scripts it prints a FAIL line that a human clears by reading the page | MUST |

### Labels and placement

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CH-CORE-06 | Fill every label field the target platform has, as an explicit `true` or `false`, in the package's `labels:` block. YouTube: `status.containsSyntheticMedia` and `paidProductPlacementDetails.hasPaidProductPlacement`. X: `made_with_ai` and `paid_partnership`. Threads: `is_made_with_ai`, on the container-creation call only. TikTok: `is_aigc`, plus `brand_content_toggle` or `brand_organic_toggle`. LinkedIn: no AI field exists, so add the text line CH-LI-16 defines, and list "Brand partnership toggle" as a manual step for each post. Bluesky and Mastodon: no AI label exists, so the disclosure goes in the text | An omitted field now means "undeclared" on YouTube. Threads ignores the flag on the publish call. LinkedIn's toggle resets to Off for every post | `python3 -I "$CHECKS"/draft_check.py labels "$PKG"` prints nothing. It fails a missing field and an invented LinkedIn, Bluesky or Mastodon AI field. That Threads sets the flag on container creation and not on publish: unverified: reading heuristic, or a test of the request | MUST |
| CH-CORE-07 | Decide each AI-label value from that platform's registry trigger rows, and record `ai_use: yes, case: <id>` or `ai_use: no, case: <id>`. The id is a registry row whose `fact` starts `trigger:` (then `yes`) or `exemption:` (then `no`). Two other lines are allowed, written exactly: `ai_use: no-ai` when no AI touched the media, and `ai_use: borderline`, which needs an `open_asks` entry naming `ai_use`. A platform with no AI label needs no `ai_use` line The agent pre-fills the value and the human confirms it in the upload step | The platform lists both its cases and its exemptions. A blanket Yes is as wrong as a blanket No | `python3 -I "$CHECKS"/draft_check.py ai-use --facts "$FACTS" "$PKG"` prints nothing. It proves the case exists and agrees with the value. That the agent matched the right case is `unverified: confirmed by the human` | MUST |
| CH-CORE-08 | Place every sponsor, material-connection or required AI disclosure before the fold. In a post, use the first line, before any "see more" cut, with a plain word such as `Ad:` or `Paid partnership:`. In a long video, disclose spoken and on screen, before or at the first sponsored mention. In a Short or Reel, use burned-in text in the first seconds. In a thread, put it in the first post and again in any later post that makes the claim. In a LinkedIn document, put it in the post text and on slide 1. A platform toggle, a description line or a hashtag alone does not count | The FTC says a disclosure belongs in the video itself and must be visible without clicking "more". Whether the law requires one is decided by the marketing rules | `python3 -I "$CHECKS"/draft_check.py disclosure "$PKG"` prints nothing: with `sponsored: true` the first body line starts with `Ad`, `Sponsored`, `Paid partnership` or `In partnership with`. Video timing, thread and slide placement: unverified: reading heuristic | MUST |
| CH-CORE-09 | Generate images and video with a tool that writes C2PA Content Credentials, and also write IPTC `DigitalSourceType` into XMP. Never rely on metadata as the only disclosure | LinkedIn reads C2PA. One study found Instagram reads IPTC and not C2PA. A manifest's `digitalSourceType` does not set the XMP tag, so the two are written separately. Metadata can be stripped | Block CH-CORE-09 below exits 0 | SHOULD |

### Credentials

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CH-CORE-10 | In every repository that holds or may hold a publishing credential, extend the gitleaks configuration with a `discord-webhook-url` rule and a `google-oauth-refresh-token` rule, because the gitleaks defaults have neither. Allowlist fixture placeholders by path, never by value. `checks/gitleaks-channels.toml` holds both rules to merge | A Discord webhook URL embeds its secret token, so it is a bearer credential | `python3 -I "$CHECKS"/boundary_check.py gitleaks .gitleaks.toml` prints nothing. The gitleaks commands in block CH-CORE-10 below exit 0 | MUST |

### Facts registry

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CH-CORE-11 | Take every platform limit, field name, label trigger, price and policy clause from a registry row, and cite its id in square brackets (`[LI-F01]`) in the same line. Never take one from memory or from a search snippet. When the platform has no registry file, or no row for the fact, state no number and quote no clause for it. When its page cannot be fetched, write no row. In both cases apply that platform's strictest default (CH-CORE-01 plus CH-CORE-03) and name the gap in the output. A figure the product team measured itself carries its command instead of an id | Platform facts moved in the last 24 months, and training data predates some changes. An agent otherwise invents the limit or the clause | `python3 -I "$CHECKS"/draft_check.py refs --facts "$FACTS" "$PKG"` prints nothing. It fails a line with a platform unit or a price and no id and no `(command: ...)`, and an id that is not in the registry | MUST |
| CH-CORE-12 | Give each registry row the columns `id, platform, fact, value, url, source_date, verified, refresh_days, provenance, expect`. `id` matches `[A-Z]+-F[0-9]+`. `source_date` is the page's absolute date, `relative:<text>@<fetch date>`, or `none`. `verified` is the agent's own fetch date. `refresh_days` is `30`, `90`, `180` or `expires:<date>`. `provenance` is `platform`, `authority`, `independent` or `vendor`. `expect` is a non-empty regex that tolerates numeral formats. No cell holds a literal pipe, so `expect` uses no alternation. One registry per platform, never a copy per skill. Format and examples: `references/registry-format.md` | Relative page ages and missing dates are common, and a limit used by four skills would otherwise carry four verified dates | `python3 -I "$CHECKS"/facts_check.py "$FACTS"` prints nothing | MUST |
| CH-CORE-13 | Set `refresh_days` to 180 for hard limits. Set it to 90 for policy, API fields, label triggers, behaviour claims, third-party statistics and LinkedIn ads specifications. Set it to 30 for prices, metered costs and any fact within 60 days of a stated effective date. Give event deadlines `expires:<date>`. Fail CI when `verified + refresh_days` is before today, or an `expires` date has passed | Prices were the facts that moved. The intervals are starting values from one repository's edit history | `python3 -I "$CHECKS"/facts_check.py "$FACTS"` exits 1 and prints each overdue id with its days overdue. Its fixtures prove an old row fails and a fresh row passes | MUST |
| CH-CORE-14 | Re-fetch every row's `url` weekly in a job that does not block merges, and open an issue when `expect` no longer matches. Never fetch a host that bans automated access or blocks scripts: `linkedin.com`, `producthunt.com`, `help.x.com`, `reddit.com`, `reddithelp.com`, `ftc.gov` and `support-dev.discord.com`. List those rows as `MANUAL` with their due date, and a human re-reads the page and updates `verified`. Report a 403, 429 or 999 as `UNREACHABLE`, never as a change. Never use Wayback capture counts or capture dates as change evidence | A page that changes while its date is valid is the real failure. LinkedIn bans automated access, so a scheduled fetch of it is not allowed | `python3 -I "$CHECKS"/facts_check.py --refetch "$FACTS"` prints `MANUAL`, `UNREACHABLE` and `CHANGED` lines and exits 0. `facts_check.py` also fails a row whose url is an archive capture | SHOULD |
| CH-CORE-15 | Never turn a `vendor` or `independent` figure into a MUST rule or a lint threshold. Every threshold cites a row whose provenance is `platform` or `authority`, and that row's url host must be on a human-kept allowlist (`checks/hosts.txt`, one `<host> <provenance>` per line). In prose, a vendor figure carries its tag, date and sample size | Reach and engagement figures are claims, not platform limits. An agent that writes both the row and its provenance can mislabel it, so the host decides, not the tag | `python3 -I "$CHECKS"/facts_check.py --hosts "$CHECKS"/hosts.txt "$FACTS"` prints nothing once every host on a row is listed. Until the owner decides, it prints one line per unlisted host and exits 1: each such host is an `open_asks` line, and no threshold cites its rows. Each lint threshold in a channel skill names a row id: unverified: reading heuristic | SHOULD |
| CH-CORE-20 | Never write these claims, which are wrong or have been misattributed: that Discord's Developer Policy bans self-bots (the ban is Community Guidelines item 14, `[DC-F07]`); that the Product Hunt terms ban AI or LLM text (the terms have no AI clause, and the LLM rule is in the commenting guidelines, `[PH-F05]`); that Bluesky lets readers filter or hide bot accounts; that Bluesky requires the `bot` label (`[BS-F01]` says "best practice"). A line that names a self-bot ban, Product Hunt with AI or LLMs, or a Bluesky bot filter, hide or requirement carries its registry id | Neither misattribution was observed in agent output, and a third-party post repeats the Bluesky filter claim. The check proves a line carries an id, not that the id supports the claim | `python3 -I "$CHECKS"/draft_check.py claims "$PKG"` prints nothing | SHOULD |

### Channel inventory

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CH-CORE-17 | Keep one `channels.yml` per organisation, at the root of the repository that owns its main website, with the path declared in that repository's agent instructions. Each row has `id, platform, handle, url, status (active, planned, retired, squatted or none), ownership (proven or inferred), verified_by, owner_role, automation (none, drafts or bot), approved_by, labels_required, credential, last_checked, linked_from`. A bot row adds `runs_from`, `gates_attested`, `attested_by`, `attested_at` and, on X, `spend_cap` (CH-CORE-02). A platform the organisation decided against gets a `status: none` row, with `verified_by` naming the human decision, such as `owner decision, 2026-11-01` | Without the file, an agent invents handles or omits them, and cannot tell "no channel" from "not listed" | `python3 -I "$CHECKS"/channels_check.py --no-links channels.yml` prints nothing. `owner_role` names a role, not a person: unverified: reading heuristic | MUST |
| CH-CORE-18 | Link only channels listed in `channels.yml`. Run the inbound-link check before merging any README, navigation, footer, team page or release note that names a channel. Forward: every `active` row's `url` appears in each file in its `linked_from`. Reverse: every channel-host URL in owned sources matches a row. Staleness: a `last_checked` older than 90 days warns, older than 180 days fails. Zero links: `retired` and `planned` rows have none, and no owned file links a url whose row is not `active` (an existing link to an unproven handle is an `open_asks` line, see `references/channels-inventory.md`). Resolve reference-style Markdown definitions | A channel linked from nowhere, or a link nobody listed, is how a stale or wrong handle ships | `python3 -I "$CHECKS"/channels_check.py --root . channels.yml` prints nothing and warns on stale rows. The candidate-link listing is in `references/channels-inventory.md` | MUST |
| CH-CORE-19 | Never set `status: active` or a non-empty `linked_from` while `ownership: inferred`. A human checks while logged in and records `verified_by`. Record a 403, a 999, a login wall or a missing API key as `verified_by: not provable (<code>, <date>)` on a `planned` row, or as label state `unobservable`. Never record any of these as absent, `none` or `retired` | A handle resolver returned the wrong channel for 9 of 29 handles, and squatted handles exist. LinkedIn refuses unauthenticated profile probes | `python3 -I "$CHECKS"/channels_check.py --no-links channels.yml` prints nothing: no `inferred` row is active or linked, and no `retired` or `none` row rests on an HTTP code | MUST |

## Run the checks

Each block below was watched red on a planted file and green on a clean twin. Block
names are rule ids. Set `HANDLE`, `INSTANCE`, `ACCT`, `OUT` and `F` first: a Bluesky
handle, a Mastodon host, a Mastodon account, the directory of drafts and a media file.

```sh
# CH-CORE-01: browser takes file paths, never a directory. Pass only files of channel skills
# (those that require channel-publishing). A hit in another skill is an open_asks line.
# Prints nothing, exit 0 passes.
python3 -I "$CHECKS"/boundary_check.py browser $(git ls-files 'skills/*/SKILL.md' 'skills/*/references/*.md')
# Scan the workflow and skill files, tracked or not, for write-endpoint calls. Prints nothing, exit 0 passes.
python3 -I "$CHECKS"/boundary_check.py scan --repo "$REPO" --channels channels.yml
```

```sh
# CH-CORE-02: exit 0 passes. Bluesky row (bs-label), then Mastodon row (ma-flag).
curl -s "https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=$HANDLE" \
  | python3 -I -c "import json,sys; d=json.load(sys.stdin); sys.exit(0 if any(l.get('val')=='bot' and l.get('src')==d['did'] for l in d.get('labels',[])) else 1)"
curl -s "https://$INSTANCE/api/v1/accounts/lookup?acct=$ACCT" \
  | python3 -I -c "import json,sys; sys.exit(0 if json.load(sys.stdin).get('bot') is True else 1)"
```

```sh
# CH-CORE-04: any listed file is a draft that names Stack Overflow.
git ls-files -z -- "$OUT" | xargs -0 -r grep -l -i -e 'stackoverflow' --
```

```sh
# CH-CORE-09: exit 0 passes. exiftool exits 0 on a missing tag, so test for output.
# Write the XMP tag first and sign last: an edit after signing breaks the manifest.
c2patool "$F" > /dev/null && exiftool -s3 -DigitalSourceType "$F" | grep -q .
```

```sh
# CH-CORE-10: history, then the working tree. Both exit 0.
gitleaks git --redact --exit-code 1 -c .gitleaks.toml
gitleaks dir --redact --exit-code 1 -c .gitleaks.toml .
```

| Script | Covers |
|---|---|
| `facts_check.py` | CH-CORE-12, 13, 14, 15 |
| `channels_check.py` | CH-CORE-02, 17, 18, 19 |
| `factsheet_check.py` | CH-CORE-03 |
| `boundary_check.py` | CH-CORE-01, 04, 10 |
| `draft_check.py` | CH-CORE-05, 06, 07, 08, 11, 20 |

Every script has `--help` and a `--self-test` over `checks/fixtures/`. Run each
self-test once after install. A check that has not been seen red is not coverage.

## Claims in a draft

When the `marketing-quality` rule is installed, every number, comparison and quality
claim in a draft follows its MKT-CLAIM rows (`marketing-quality-reference/claims.md`).
Without it, give each number a `source:` line that names its command or URL, and write
no superlative. The platform facts above (limits, prices, field names) always come from
the registry, never from the claims rules.

## What an agent asks a human

Put each in `open_asks`. Never decide it.

- Which channels the organisation runs, opens or closes, and the `status` of each row.
- Whether to run any owner-commissioned automation, what its bio says, who holds the credential and who attests its gates.
- Whether an `inferred` handle belongs to the organisation. A logged-in human records `verified_by`.
- Which account speaks: the company page, a founder or a maintainer. Never publish in a named person's voice without that person's review.
- Whether borderline media is "realistic" (CH-CORE-07), and whether to override a label the platform applied.
- Whether content is sponsored, gifted or a material connection, and whether the law requires a label (a marketing question).
- Any spend: API credits, ads, boosts, paid listings, sponsorships.
- Whether a product qualifies for a launch venue, and on which day.
- Replies to critical public comments, public security reports, journalists, takedown notices and enforcement actions.
- Accepting platform terms, creating developer apps, applying for API access.
- Claiming a squatted handle, or changing a published invite or handle.
- Promoting a vendor figure to a rule, changing a refresh interval, or adding a host to `checks/hosts.txt`. Eight hosts waiting for a decision are named in that file. Every other host that `facts_check.py --hosts` prints is also waiting: list them for the owner.
- Re-reading each `MANUAL` registry row on its due date. First, read Reddit's Responsible Builder Policy and Discord's Developer Policy in a browser, because their rows came from archive copies.
- After 2026-12-15, whether Discord's new Terms of Service change any bot rule.

## Files

| Read | When |
|---|---|
| [references/registry-format.md](references/registry-format.md) | Adding, editing or refreshing a registry row, a failing `facts_check.py`, or the weekly job |
| [references/channels-inventory.md](references/channels-inventory.md) | Creating or editing `channels.yml`, registering a bot, or adding a channel link |
| [references/boundary-clauses.md](references/boundary-clauses.md) | Justifying a rule to a person, or refreshing the clauses and their dates |

`checks/` holds the five scripts, `gitleaks-channels.toml`, `hosts.txt` and
`fixtures/`. Siblings: `linkedin-post`, `youtube-video`, `microblog-post`,
`terminal-demo`, `community-post` and `launch-plan` each require this skill and keep
their own `references/facts.md`; `github-presence` and `release-notes` own GitHub and
registry writes.
