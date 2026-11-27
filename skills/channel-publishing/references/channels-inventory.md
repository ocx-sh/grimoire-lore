# The channels.yml inventory

Read this when you create or edit `channels.yml`, add a social link or badge to a
README, site or release note, register a bot, or when `channels_check.py` fails.
It carries CH-CORE-02 (the bot row) and CH-CORE-17 to CH-CORE-19.

Contents: [Dates and versions](#dates-and-versions) · [Where it lives](#where-it-lives) ·
[The row](#the-row) · [The bot row](#the-bot-row) · [Worked example](#worked-example) ·
[The file format](#the-file-format) · [Link checks](#link-checks) ·
[Recording a failed probe](#recording-a-failed-probe) ·
[A link that already exists](#a-link-that-already-exists)

## Dates and versions

| Item | Value | Source and date | Re-check |
|---|---|---|---|
| Staleness | `last_checked` warns after 90 days and fails after 180 | Pinned default, 2026-11-27 | When an adopter overrides it |
| Bot attestation | `attested_at` fails after 90 days | Same as the platform-policy interval (CH-CORE-13) | With the registry intervals |
| Gate sources | Each gate id below cites a registry row in the platform skill's `references/facts.md` | See `boundary-clauses.md` for the clause text and its dates | Every 90 days; X prices every 30 |
| Script | `checks/channels_check.py`, Python 3.11 standard library | | When the floor moves |

## Where it lives

One `channels.yml` per organisation, at the root of the repository that owns its main
website. The path is declared in that repository's agent instructions (the file an agent
reads first). **Pinned** default: an adopter overrides the location once and records
it there. Without the file, an agent invents handles or omits them, and cannot tell
"no channel" from "not listed".

A platform the organisation decided against gets a `status: none` row, so an agent can
tell a deliberate absence from a gap. Only a human decides it: `verified_by` names the
decision, such as `owner decision, 2026-11-01`. An agent that merely believes the
organisation has not joined a platform asks in `open_asks` and writes no `none` row.

## The row

| Key | Values |
|---|---|
| `id` | A short unique name |
| `platform` | Lowercase platform name (`x`, `bluesky`, `youtube`, `linkedin`, `discord`, `github`) |
| `handle`, `url` | The account. Empty for a `none` row |
| `status` | `active`, `planned`, `retired`, `squatted` or `none` |
| `ownership` | `proven` (a logged-in human checked) or `inferred` |
| `verified_by` | Who checked, and when. Or `not provable (<code>, <date>)` on a `planned` row. For `none`, the human decision, such as `owner decision, 2026-11-01` |
| `owner_role` | A role, such as `community lead`. Never a person's name |
| `automation` | `none`, `drafts` or `bot` |
| `approved_by` | Who approved the automation |
| `labels_required` | The label fields the platform needs on every post |
| `credential` | The secret's name, never its value |
| `last_checked` | An absolute date, `YYYY-MM-DD` |
| `linked_from` | The files in the repository that carry the row's url |

`owner_role` names a role: `channels_check.py` cannot tell a role from a name, so a
reviewer reads it (unverified: reading heuristic).

## The bot row

An agent proposes a bot and never creates one. A row with `automation: bot` adds
`runs_from` (the repository-qualified file that posts, such as
`org/repo/.github/workflows/notify.yml`), `gates_attested`, `attested_by`,
`attested_at` and, on X, `spend_cap`. Bots exist on five platforms only. Reddit has no
bot row, because it offers no self-service API access.

| Platform | Gate ids the row lists | Gate means |
|---|---|---|
| X | `x-label` | The Automated profile label is on (X-F01) |
| | `x-bio` | The bio names the operator |
| | `x-human` | The bio links a human-managed account |
| | `x-summoned` | Programmatic replies only when the post's author summoned the account (X-F02) |
| Bluesky | `bs-label` | The `bot` self-label is on the profile (BS-F01) |
| | `bs-optin` | The bot interacts only with accounts that tagged it (BS-F02) |
| Threads | `th-ai` | `is_made_with_ai=true` on AI content (TH-F01) |
| Mastodon | `ma-flag` | The bot flag is set (MA-F01) |
| | `ma-rule6` | The instance's AI disclosure is in the post text (MA-F02) |
| Discord | `dc-nobot` | A bot application or webhook, never a self-bot or user-bot (DC-F07) |
| | `dc-offtopic` | No advertisements or marketing in bot messages, and no automated messages to keep a server active (DC-F02, DC-F03) |

`channels_check.py` fails a bot row that lacks a key, lacks a gate of its platform,
has an `attested_at` older than 90 days, or (on X) has no `spend_cap`. Only two gates
can be read by a command: `bs-label` and `ma-flag` (block CH-CORE-02 in SKILL.md). The
others are `unverified: attested by a human`, and the row is the evidence. On Bluesky,
the official app sets the `bot` self-label under Settings, Account, Automation label
since app release 1.119.0 (2026-03-17), so an owner can set it without code. Tell the
owner where the toggle is. The Mastodon bot flag is a visual indication only, so it
never replaces the `ma-rule6` text disclosure.

## Worked example

```yaml
channels:
  - id: github-org
    platform: github
    handle: example
    url: https://github.com/example
    status: active
    ownership: proven
    verified_by: maintainer, logged in, 2026-11-01
    owner_role: maintainer
    automation: none
    approved_by: ""
    labels_required: []
    credential: ""
    last_checked: 2026-11-01
    linked_from: [README.md]
  - id: discord-server
    platform: discord
    handle: example
    url: https://discord.gg/abc123
    status: active
    ownership: proven
    verified_by: maintainer, logged in, 2026-11-01
    owner_role: community lead
    automation: bot
    approved_by: project owner, 2026-10-20
    labels_required: [bot-application]
    credential: DISCORD_WEBHOOK
    last_checked: 2026-11-01
    linked_from: [README.md, site/nav.json]
    runs_from: example/mytool/.github/workflows/notify.yml
    gates_attested: [dc-nobot, dc-offtopic]
    attested_by: community lead
    attested_at: 2026-11-01
  - id: youtube
    platform: youtube
    handle: "@example"
    url: https://www.youtube.com/@example
    status: planned
    ownership: inferred
    verified_by: not provable (403, 2026-11-01)
    owner_role: maintainer
    automation: none
    approved_by: ""
    labels_required: []
    credential: ""
    last_checked: 2026-11-01
    linked_from: []
  - id: bluesky
    platform: bluesky
    handle: ""
    url: ""
    status: none
    ownership: proven
    verified_by: owner decision, 2026-10-15
    owner_role: maintainer
    automation: none
    approved_by: ""
    labels_required: []
    credential: ""
    last_checked: 2026-10-15
    linked_from: []
```

## The file format

`channels_check.py` reads a small YAML subset so that it needs no library: a top-level
`channels:` key, a list of flat mappings with `- key: value` as the first line of each
row, scalars (quote a value that holds `:` or starts with `@`), inline `[a, b]` lists
and `- item` block lists, and `#` comments. Anchors, multi-line scalars and nested
mappings are not supported. Run the script on the file before you commit it.

## Link checks

CH-CORE-18. Run the check before merging any README, navigation, footer, team page or
release note that names a channel.

| Check | Fails when |
|---|---|
| Forward | An `active` row's `url` is missing from a file in its `linked_from` |
| Reverse | A channel URL in an owned file matches no row |
| Zero links | A `retired` or `planned` row has `linked_from` entries, or an owned file links a url whose row is not `active` |
| Staleness | `last_checked` is older than 180 days (a warning after 90) |

The reverse check scans git-tracked and untracked, non-ignored files, and skips
`.agents`, `.claude/artifacts`, `node_modules`, any `test` or `fixtures` directory and
lock files. It reads reference-style Markdown definitions (`[discord]: https://...`),
which a search for `](https://discord` misses. A channel URL is a Discord invite, a
YouTube `@handle` or `youtu.be` link, a LinkedIn `in`, `company` or `showcase` page,
any `x.com` or `twitter.com` path, or a `bsky.app/profile` link. An `x.com` share link
therefore needs a row.

```sh
# CH-CORE-18: list candidate channel links, then map each hit to a row.
git grep -n -I -i -E -e 'discord\.(gg|com/invite)/|youtube\.com/@|youtu\.be/|linkedin\.com/(in|company|showcase)/|(x|twitter)\.com/[A-Za-z0-9_]+|bsky\.app/profile/' -- . ':!.agents' ':!.claude/artifacts' ':!**/test/**' ':!**/fixtures/**' ':!*.lock'
```

## Recording a failed probe

CH-CORE-19. A 403, a 999, a login wall or a missing API key means "not provable". Write
`verified_by: not provable (403, 2026-11-01)` and leave the row `planned`. A `none` row
is a human decision, never a failed probe: `channels_check.py` fails a `none` row whose
`verified_by` starts with `not provable`.
LinkedIn refuses unauthenticated profile probes, and `videos.list` answers 403 without
a key. Never write `retired` or `none` on an HTTP code alone. Never set `active` or a
`linked_from` entry while `ownership` is `inferred`: a handle resolver returned the
wrong channel for 9 of 29 handles in one measurement, and squatted handles exist. A
logged-in human checks the account and records `verified_by`.

## A link that already exists

CH-CORE-18 and CH-CORE-19. A file may already link a url whose ownership you cannot prove,
such as a LinkedIn profile on a team page. Personal profile links count as channels: the
check matches `linkedin.com/in/`, so each needs a row. Add the row as `planned`,
`ownership: inferred`, with `not provable (<code>, <date>)`. `channels_check.py` then fails
with `linked but its row is not active`, which is correct, because the link is live and
unproven. Put an `open_asks` line for the human: prove ownership while logged in, or remove
the link. Only after the human records `verified_by` set `ownership: proven`, `status:
active` and the real `linked_from`. Never leave a `planned` row with the url still linked.
