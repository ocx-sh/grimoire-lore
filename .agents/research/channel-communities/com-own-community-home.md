---
title: Where a small project hosts its own community
program: product
sub_program: channels
topic: channel-communities
worker: com-own-community-home
date_researched: 2026-11-27
model: sonnet
sources_fetched: 23
scope: >
  Decides the default community home for a small fleet (GitHub Discussions vs Discord vs Discourse vs Slack), the minimum
  setup before launch traffic (SUPPORT routing, community-health files, code of conduct, moderation), and what the Discord
  webhook should post. Per-release Discussions announcements belong to gh-release-announcement. Not covered: Reddit, Hacker News,
  Lobsters venues (sibling dives). Docs.github.com pages state no date; they are cited as "read 2026-11-27".
---

# Where a small project hosts its own community

## Contents

1. Summary
2. Findings (1 fleet measurement, 2 exemplars, 3 venue facts, 4 SUPPORT and health files, 5 code of conduct, 6 moderation, 7 webhook, 8 scout figures re-checked)
3. Normative guidance candidates
4. What an agent must not decide alone
5. AI-agent angle
6. Contested / evolving
7. Dated facts
8. Sources

## Summary

- Default home for a small fleet: GitHub Discussions on each product's primary repository (Q&A category with answers, Announcements category), because it sits next to the code, is public by default, and has answer-marking built in ([GitHub Docs](https://docs.github.com/en/discussions/collaborating-with-your-community-using-discussions/about-discussions), read 2026-11-27).
- Discussions is on for 1 of 17 fleet repos and holds 1 discussion in total; the other 16 route nobody anywhere (measured, section 1).
- Two repos (`grim-gui`, `grim-mirror`) have an issue-template contact link pointing at `/discussions` while Discussions is off there: a live dead link. Fix before any launch.
- 0 of 17 repos have a SUPPORT file, and neither org has a `.github` repository (404), so one org-level `.github` repo fixes SUPPORT and the code of conduct for all repos that lack their own.
- 6 of 17 repos have a CODE_OF_CONDUCT; all 6 name a reporting email. 11 have none. The fleet uses Contributor Covenant 3.0, not 2.1 as the brief states.
- Discord stays a secondary chat, not the home. The server (5 members, 0 online, measured 2026-11-27) is far below Discord's 1,000-member Discoverable threshold, so its messages will not reach web search under Discord's new indexing ([Discord blog](https://discord.com/blog/making-content-from-discoverable-servers-easier-to-discover), 2026-10-27).
- Discord indexing of Discoverable servers: server web pages from 2026-11-16, message indexing from mid-December 2026, messages before that date excluded, opt-in by default in EU/UK/Canada/Brazil/Australia/South Korea. This is new in the last month; older advice that "Discord is invisible to search" is now partly stale for large servers only.
- Slack free plan shows only the last 90 days and deletes data older than one year (deletion began 2024-08-26): never a community home ([Slack Help](https://slack.com/help/articles/27204752526611-Feature-limits-on-the-free-version-of-Slack)).
- Discourse hosted has a Free plan (2 staff seats, 500k monthly page views, 5GB, 10 categories) and a $100/month Pro plan; no open-source discount is listed ([Discourse pricing](https://www.discourse.org/pricing), read 2026-11-27). It is the upgrade path once Discussions strains, not the start.
- Moderation before launch: Discord's own raid guide recommends (not requires) verification level Low on public servers, plus AutoMod, Raid Protection alerts, disabled @everyone for ordinary roles and recruited moderators ([Discord Raids 101](https://support.discord.com/hc/en-us/articles/10989121220631-How-to-Protect-Your-Server-from-Raids-101), last edited 2023-07-28; Low = verified email per [Verification Levels](https://support.discord.com/hc/en-us/articles/216679607-Verification-Levels), last edited 2025-09-19); keep a named moderator roster; the code-of-conduct reporting contact must be a real address with more than one reader where possible.
- The Discord webhook currently posts PR opened, PR merged, release published, workflow failures and website deploys to one server. Only release posts are user news; split the rest into a private channel or stop them.
- Chat-to-docs loop: no source prescribes one; the rule here is a checkable procedure (answered question seen twice becomes a docs page or FAQ entry), marked as this dive's recommendation, not sourced practice.

## Findings

### 1. Fleet measurement (17 repos, 2026-11-27)

Repo list: the 17 git clones under `/home/mherwig/dev/ocx-sh` and `/home/mherwig/dev/grimoire-rs`, remotes resolved with `git -C <dir> remote get-url origin`.

Commands per repo `<r>`: `gh api repos/<r> -q .has_discussions`; `gh api repos/<r>/community/profile | jq .health_percentage,.files.code_of_conduct_file.url,.files.contributing.url`; SUPPORT presence by `gh api repos/<r>/contents/{SUPPORT.md,.github/SUPPORT.md,docs/SUPPORT.md}`; issue templates by `gh api repos/<r>/contents/.github/ISSUE_TEMPLATE`; contact links and `blank_issues_enabled` by `gh api repos/<r>/contents/.github/ISSUE_TEMPLATE/config.yml -q .content | base64 -d`; reporting contact by `gh api repos/<r>/contents/CODE_OF_CONDUCT.md -q .content | base64 -d | grep -iE '@|INSERT CONTACT|report'`.

| Repo | Discussions | Health % | CoC file | CoC contact | SUPPORT | Issue templates | contact_links | blank issues |
|---|---|---|---|---|---|---|---|---|
| grimoire-rs/grimoire | on | 75 | yes | email | none | 2 | 1 (Discussions, valid) | allowed |
| grimoire-rs/grim-gui | off | 87 | yes | email | none | 2 | 1 (Discussions, DEAD: Discussions off) | allowed |
| grimoire-rs/grim-mirror | off | 87 | yes | email | none | 2 | 1 (Discussions, DEAD) | allowed |
| grimoire-rs/grimoire-vscode | off | 62 | no | none | none | 0 | no config | n/a |
| grimoire-rs/indexer | off | 50 | no | none | none | 0 | no config | n/a |
| ocx-sh/ocx | off | 75 | yes | email | none | 4 | 0 | disabled |
| ocx-sh/rules_ocx | off | 75 | yes | email | none | 1 | 0 | disabled |
| ocx-sh/www-setup | off | 62 | yes | email | none | 0 | no config | n/a |
| ocx-sh/ocx-mirror | off | 62 | no | none | none | 1 | 0 | disabled |
| ocx-sh/conventions | off | 50 | no | none | none | 1 | 0 | disabled |
| ocx-sh/devcontainer-features | off | 37 | no | none | none | 1 | 0 | disabled |
| ocx-sh/catalog, index, indexbot, website | off | 50 | no | none | none | 0 | no config | n/a |
| ocx-sh/e2e-index, grimoire-lore | off | 37 | no | none | none | 0 | no config | n/a |

Totals: Discussions on 1 of 17; SUPPORT 0 of 17; CoC with reporting contact 6 of 17; contact links 3 of 17, of which 2 are dead. Org `.github` repositories: `gh api repos/ocx-sh/.github -q .name` and `gh api repos/grimoire-rs/.github -q .name` both return 404, so no org defaults exist.

Discussions on `grimoire-rs/grimoire`: `gh api graphql -f query='{repository(owner:"grimoire-rs",name:"grimoire"){discussionCategories(first:20){nodes{name isAnswerable}} discussions{totalCount}}}'` returns the six default categories (Announcements, General, Ideas, Polls, Q&A answerable, Show and tell) and `totalCount` 1.

CoC text: the 6 files are Contributor Covenant 3.0 (grim-gui file begins "Contributor Covenant 3.0 Code of Conduct"), reporting email `contact@michael-herwig.de`, identical in all, the same address that is the org's only public contact (product-audit/distribution-posture.md section 4). One person is therefore reporter target, moderator and maintainer.

Discord server (command `curl -s 'https://discord.com/api/v9/invites/mT2UCF8CVe?with_counts=true' | python3 -I -c ...`): name `ocx`, 5 members, 0 online, invite never expires, guild features `COMMUNITY, GUILD_ONBOARDING, AUTO_MODERATION, NEWS`. So Community mode and AutoMod are available; whether they are configured is not visible without login. Linked from ocx README lines 12, 71, 86; from no Grimoire repo (product-audit).

### 2. Exemplars (community home and SUPPORT routing)

The brief asks for five projects of similar size. Two samples follow: A, seven large projects (24k to 93k stars), and B, eight mid-size developer CLIs (633 to 3,342 stars; drawn from `gh search repos --language=rust --topic=cli --stars=500..4000 --sort=updated --limit 40` and the same for `--language=go`, then eight picked by being established developer tools rather than apps, games or AI-agent novelties; selection is the worker's judgment, not random). Commands: `gh api repos/<r> -q '[.stargazers_count,.has_discussions]'`, SUPPORT paths as in section 1, `config.yml` contact links, and `gh api repos/<r>/readme -q .content | base64 -d | grep -oiE 'discord\.(gg|com)...'`.

| Project | Stars | Discussions | SUPPORT file | Issue chooser routes to | README chat |
|---|---|---|---|---|---|
| astral-sh/uv | 92,753 | off | none | docs, Discord invite | Discord |
| BurntSushi/ripgrep | 70,408 | on | none | Discussions (ask a question) | none |
| sharkdp/bat | 61,544 | on | none | no config | none |
| starship/starship | 60,961 | on | none | Discussions Q&A | Discord |
| casey/just | 36,874 | on | none | no config | Discord |
| jdx/mise | 36,569 | on | none | Discussions | Discord plus Discussions |
| charmbracelet/gum | 24,704 | on | none | no config | none |

Sample B, mid-size (measured 2026-11-27; same commands, plus `gh api repos/<o>/.github/contents` for org defaults):

| Project | Stars | Discussions | SUPPORT file (repo or org `.github`) | Issue chooser routes to | README chat |
|---|---|---|---|---|---|
| pamburus/hl | 3,342 | on | none | Discussions Q&A and Discussions; blank issues off | none |
| hairyhenderson/gomplate | 3,221 | on | none (org `.github` has FUNDING, SECURITY only) | no config | Gophers Slack channel plus Discussions |
| altsem/gitu | 2,964 | on | none | no config | none |
| aquaproj/aqua | 1,902 | on | none (org `.github` has profile only) | registry issues, a NotebookLM notebook, Discord; blank issues off | Discussions |
| remotemobprogramming/mob | 1,800 | on | none | no config | Slack invite badge |
| orhun/gpg-tui | 1,779 | on | none | no config | Discussions, Matrix |
| suzuki-shunsuke/pinact | 1,266 | off | none | blank issues allowed, no links | none |
| avencera/rustywind | 633 | off | none | no config | none |

Sample B pattern: 6 of 8 run Discussions; 0 of 8 have a SUPPORT file; 3 of 8 use a chat as well (Slack 2, Discord 1, Matrix 1; aqua and gomplate also on Discussions); 2 of 8 route through contact links. Mid-size projects lean on Discussions plus an optional chat exactly as the large ones do, and the two without Discussions have no community route at all, the gap this fleet has on 16 of 17 repos. Two use Slack (Gophers Slack is a shared workspace; the `mobsh` invite is a project workspace), which rule 8 treats as the wrong home for history; no outcome data on either was found.

Sample A pattern: 6 of 7 run Discussions; 4 of 7 also keep a Discord; 0 of 7 have a SUPPORT file; routing happens through issue-template contact links (4 of 7) instead. The one project without Discussions (uv) routes the chooser to docs plus Discord. Measured 2026-11-27.

### 3. Venue facts

**GitHub Discussions.** Open-ended forum on a repo or org; user-defined categories; Q&A categories allow "Mark comments as answers"; pin, lock, close, convert issues ([About discussions](https://docs.github.com/en/discussions/collaborating-with-your-community-using-discussions/about-discussions)). Up to 25 categories; announcement categories restrict posting to maintain/admin; discussions cannot move out of announcement categories ([Managing categories](https://docs.github.com/en/discussions/managing-discussions-for-your-community/managing-categories-for-discussions)). Triage permission can mark answers, lock, and convert issues; org owners and moderators can block users and hide comments ([Moderating](https://docs.github.com/en/discussions/managing-discussions-for-your-community/moderating-discussions)). Enable under Settings, Features; owners and write access ([Quickstart](https://docs.github.com/en/discussions/quickstart)). Search-engine indexing of Discussions is not stated in any GitHub page fetched; not measured here.

**Discord.** Community Guidelines last updated 2025-08-29 (effective 2025-09-29): Rule 13 bans spam and facilitating spam including "raid" tools; Rule 14 each account associated with a human; Rule 15 bans artificially inflating server membership; no explicit self-promotion rule ([Guidelines](https://discord.com/guidelines)). Discoverable servers need 1,000 members, 8 weeks age, and activity and safety requirements; web pages from 2026-11-16, channel messages from mid-December 2026; opt-out per channel in Server Settings, Web Presence; members can opt out; teens excluded; EU, UK, Canada, Brazil, Australia, South Korea default off ([Discord blog](https://discord.com/blog/making-content-from-discoverable-servers-easier-to-discover), 2026-10-27; independent reading in [BleepingComputer](https://www.bleepingcomputer.com/news/security/discord-to-let-search-engines-index-public-server-messages/), 2026-10-28, which counts about 63,000 Discoverable servers and notes already-public content cannot be retracted). Discord's Discovery eligibility help article still returns HTTP 403 and was not read; the 1,000 and 8-week figures come from the Discord blog itself. The Verification Levels and Raids 101 help pages return 403 to browsers but their text was read through the public Zendesk Help Center API (`curl -s https://support.discord.com/api/v2/help_center/en-us/articles/<id>.json`, ids 216679607 and 10989121220631), which returns the page body and `edited_at`. AutoMod needs Community enabled; up to 3 custom keyword filters of 1,000 keywords each plus a commonly-flagged-words filter; Manage Server and Administrator users, bots and webhooks bypass filters ([Discord AutoMod, 2022-06-03](https://discord.com/safety/auto-moderation-in-discord), old; limits may have changed). Verification levels, from the Verification Levels article (edited 2025-09-19): None, Low (verified email), Medium (verified email and Discord account older than 5 minutes), High (also member of the server over 10 minutes), Highest (verified phone number); a verified phone supersedes the other requirements. The developer docs list the same five levels ([Discord API Guild resource](https://docs.discord.com/developers/resources/guild), read 2026-11-27, platform). Raids 101 (edited 2023-07-28) says: "We recommend setting the Verification Level to 'Low' for basic security on public servers"; it also lists AutoMod custom rules and Block Mention Spam, disabling mention-everyone for non-moderator roles, Raid Protection alerts (gradual rollout to community servers, availability may be limited), the Explicit Media filter at Medium or High, recruiting moderators, and Pause Invites and Slowmode during a raid. Level Low is a Discord recommendation, not a platform requirement for posting a launch link. Rules-screening is not covered by either page; it is not cited.

**Slack.** Free workspaces see only the most recent 90 days of message and file history; data older than one year is deleted, deletion began 2024-08-26; upgrading reveals hidden history ([Slack Help](https://slack.com/help/articles/27204752526611-Feature-limits-on-the-free-version-of-Slack), read 2026-11-27).

**Discourse.** Hosted Free plan: 2 staff seats, 500k monthly page views (bots and crawlers not counted), 20k monthly emails, 10 categories, 5GB, support only via public forum; Pro $100 per month with 5 seats and 20GB; Business $500; self-hosting free and open source; education 85% and non-profit 50% discounts apply to Pro and Business only; no open-source program listed ([Pricing](https://www.discourse.org/pricing)). The compare page is vendor marketing: it says Discord web visibility is "Discoverable Servers only, starting November 2026" and Discord opens Discovery to "more than 1,000 members" ([vendor](https://www.discourse.org/compare/discord)); both figures reproduce against the Discord blog above. Its claim that Discord is weak for finding past conversations is vendor opinion with no cited study.

### 4. SUPPORT routing and community-health files

- Supported default health files include SUPPORT.md, CODE_OF_CONDUCT.md, CONTRIBUTING.md, SECURITY.md, ACCESSIBILITY.md, FUNDING.yml, issue and PR templates with config.yml. Lookup order: `.github` folder, repository root, `docs`. A public `.github` repository supplies defaults to every repo of the account lacking its own file. If a repo has its own `.github/ISSUE_TEMPLATE` folder, none of the default ISSUE_TEMPLATE contents are used ([Default community health file](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file)). This is why defaulting config.yml org-wide cannot fix the fleet repos that already have templates.
- A SUPPORT file surfaces as a "Support" link in "Helpful resources" when someone opens a new issue; it may live in root, `docs` or `.github` ([Adding support resources](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/adding-support-resources-to-your-project)).
- Issue chooser: `contact_links` entries (name, url, about) in `.github/ISSUE_TEMPLATE/config.yml`; takes effect on the default branch; `blank_issues_enabled: false` forces templates, maintainers still see a blank option ([Configuring issue templates](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository)).
- The community-profile checklist covers README, CODE_OF_CONDUCT, LICENSE, CONTRIBUTING and issue templates only; SUPPORT is not part of the health percentage ([About community profiles](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/about-community-profiles-for-public-repositories)). The 87 percent ceiling seen on `grim-gui` is therefore not a SUPPORT signal. The page mentions no API; `gh api repos/<o>/<r>/community/profile` works anyway (measured above) but is undocumented on that page.
- Consequence for fleet: ocx has `blank_issues_enabled: false` and no contact links, so a user with a question has no non-issue route. That is a measured routing gap.

### 5. Code of conduct

Contributor Covenant 2.1 ladder: Correction, Warning, Temporary Ban, Permanent Ban; reports go to leaders "at [INSERT CONTACT METHOD]" ([2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/)). Version 3.0 ladder: Warning, Temporarily Limited Activities, Temporary Suspension, Permanent Ban; placeholder "[NOTE: describe your means of reporting here.]"; remedies are "a guideline", permanent ban "should be rarely used" ([3.0](https://www.contributor-covenant.org/version/3/0/code_of_conduct/)). Published pages carry no dates. The unfilled-placeholder grep for 2.1 (`INSERT CONTACT METHOD`) does not catch 3.0; use both patterns. Measured: 0 of the 6 fleet CoC files contain either placeholder.

### 6. Moderation before launch

Launch traffic (a Hacker News or Reddit post) brings spam and raids. Required minimum, Discord: the server must have Community on (it does), AutoMod filters on, an alert channel, a rules message, a recorded moderator list. Discord's guideline Rule 13 bans raid tooling; defence is settings, not tools. GitHub Discussions: enable Q&A and Announcements only at first, at least one person with triage rights besides the owner, and org-level block/hide capability (org owners and moderators only). A single-person project cannot meet "more than one moderator"; that is stated as a gap, not a rule violation.

### 7. Discord webhook (`ocx-sh/ocx/.github/workflows/notify-discord.yml`)

`grep -n 'name:\|title:' .github/workflows/notify-discord.yml` shows five posts: "New PR", "PR merged", "Release published" (line 89), "Workflow failed" (line 104, ten workflows incl. Canary, Prune, Backfill), "Website deployed" (line 117). One webhook, one server with 5 members, invite linked publicly from the README. Public visitors see CI failure noise; only the release post is user-facing news.

### 8. Scout figures re-checked

| Scout claim | Result |
|---|---|
| Discord discovery limited to servers over 1,000 members (CM#22, via Discourse page) | Reproduces; now confirmed by Discord's own blog (2026-10-27). Discovery threshold is now also the web-index threshold. |
| "Only some public-channel messages will appear in search" | Reproduces on the vendor page; Discord blog says public channels default on, per-channel opt-out, mid-December start. Wording on vendor page is looser than the primary. |
| Free-tier Slack messages disappear (CM#23, vendor) | Reproduces against Slack Help: 90-day visibility, year-old data deleted. Slack says "hidden", not gone, within the first year. |
| Discord help article 360035969312 (403 in scout) | Still 403. Not read. |
| CM#26 grep for `[INSERT CONTACT METHOD]` | Valid for 2.1 only; fleet uses 3.0 with a different placeholder. |
| GH#19 "repo-level ISSUE_TEMPLATE folder disables all org defaults" | Reproduces ("none of the contents of the default folder will be used"). |
| GH#38 `ACCESSIBILITY.md` supported health file | Reproduces in the supported file list. |
| Fleet "Discussions on 1 of 17" and "5 members" | Reproduce (section 1). |

## Normative guidance candidates

1. MUST enable GitHub Discussions on the primary repository of each product before announcing it anywhere, with a Q&A (answerable) and an Announcements category. Rationale: gives a public, linkable, answer-marked home next to the code. Verify: `gh api repos/<o>/<r> -q .has_discussions` prints `true`; GraphQL `discussionCategories{nodes{name isAnswerable}}` shows one answerable category.
2. MUST NOT link a `contact_links` URL to `/discussions` while Discussions is off. Rationale: dead support route found on 2 of 3 fleet repos using it. Verify: for each `url` in `config.yml` matching `/discussions`, `has_discussions` is true.
3. MUST create an org-level `.github` repository for each org with SUPPORT.md and CODE_OF_CONDUCT.md. Rationale: both orgs lack one (404), so 11 repos have no CoC and 17 no SUPPORT. Verify: `gh api repos/<org>/.github -q .name` returns the name; `gh api repos/<org>/.github/contents/SUPPORT.md` returns 200.
4. MUST write SUPPORT.md as a routing table: question goes to Discussions Q&A, bug goes to issue template, vulnerability goes to SECURITY.md, chat goes to Discord if offered. Rationale: GitHub shows it at issue-creation time. Verify: file contains links to each target and each link returns 200 (`curl -sI -o /dev/null -w '%{http_code}' <url>`).
5. MUST NOT set `blank_issues_enabled: false` without a `contact_links` entry for questions. Rationale: ocx currently blocks free-form issues and offers no question route. Verify: `config.yml` has `contact_links` whenever `blank_issues_enabled: false`.
6. MUST fill the code-of-conduct reporting contact. Rationale: an unfilled template is a defect. Verify: `grep -E 'INSERT CONTACT METHOD|NOTE: describe your means of reporting' CODE_OF_CONDUCT.md` returns nothing and `grep -E '@|https?://'` returns a contact.
7. SHOULD name two enforcement contacts or state the single-maintainer limitation and an escalation route. Rationale: reports about the maintainer have no valid recipient (fleet: one email for everything). Verify: CoC names at least two addresses or a sentence naming the escalation path; human decision (see below).
8. MUST NOT make Slack the community home. Rationale: Slack's free plan shows only the last 90 days and deletes data older than one year ([Slack Help](https://slack.com/help/articles/27204752526611-Feature-limits-on-the-free-version-of-Slack), deletion began 2024-08-26, read 2026-11-27). Verify: no Slack invite as the primary link in README; `grep -i 'slack.com\|join.slack' README.md`.
9. SHOULD keep Discord as secondary chat only, linked from the README beside Discussions, never as the only route. Rationale: at 5 members it falls below the 1,000-member Discoverable threshold and its answers are not indexed. Verify: README contains a Discussions link whenever it contains a Discord link.
10. MUST NOT claim a Discord server's messages are searchable by web search unless the server is Discoverable. Rationale: Discord indexes messages only from Discoverable servers (1,000 members, 8 weeks old), from mid-December 2026 ([Discord blog](https://discord.com/blog/making-content-from-discoverable-servers-easier-to-discover), 2026-10-27). Verify: invite API `features` lacks `DISCOVERABLE` (`curl -s 'https://discord.com/api/v9/invites/<code>?with_counts=true' | jq .guild.features`) means no indexing claim.
11. SHOULD, before announcing on a launch venue, set the Discord verification level to Low or higher, turn on AutoMod rules with Send alert, turn off mention-everyone for non-moderator roles, enable Raid Protection alerts where offered, and record a moderator list. Rationale: Discord's own raid guide recommends exactly these ([Raids 101](https://support.discord.com/hc/en-us/articles/10989121220631-How-to-Protect-Your-Server-from-Raids-101), last edited 2023-07-28, platform; Low = verified email per [Verification Levels](https://support.discord.com/hc/en-us/articles/216679607-Verification-Levels), edited 2025-09-19); Low is a recommendation, not a platform requirement. Verify: human checklist item with screenshot or settings text recorded in the channel inventory file (admin UI, not machine-checkable); features `COMMUNITY`, `AUTO_MODERATION` in the invite API are necessary signals.
12. MUST split the Discord webhook: user-facing release notes only on the public channel; PR open/merge, workflow failure and deploy events to a separate private channel or removed. Rationale: CI failures are not user news and show on a public server. Verify: `grep -c 'webhook:' notify-discord.yml` shows two different secrets, and the public secret's steps are only `release`.
13. SHOULD keep release posts to a title, tag, one-line summary and link to the changelog entry. Rationale: chat is not the record; the changelog is. Verify: step `description` contains a URL to the release page.
14. SHOULD, when a question is answered in chat or Discussions twice, add a docs page or FAQ entry and link it in the reply. Rationale: keeps answers in searchable docs; this loop is the dive's recommendation, no primary source prescribes it. Verify: a `docs/` FAQ or troubleshooting page exists and the Q&A category has a pinned "common questions" discussion linking to it.
15. SHOULD run `gh api repos/<o>/<r>/community/profile` per repo before launch and treat health under 75 as a gap list, not a target. Rationale: the profile omits SUPPORT, so a high percent hides a routing gap. Verify: script output saved with date; SUPPORT checked separately.
16. CONSIDER Discourse hosted Free only when Discussions cannot meet a need (categories above 25, private categories, SSO). Rationale: Free caps at 2 staff seats, 10 categories, 500k monthly page views and offers forum-only support ([Discourse pricing](https://www.discourse.org/pricing), undated, read 2026-11-27, vendor). Verify: need is named in the decision record before adoption.
17. MUST NOT list the Discord invite in a repo until the invite is confirmed to resolve and be non-expiring. Rationale: dead invite is a worse signal than none. Verify: invite API returns 200 and `expires_at` null.

## What an agent must not decide alone

- Whether the single maintainer's personal email stays the CoC reporting channel, or a shared mailbox or second moderator is added (privacy, conflict of interest, staffing).
- Whether to create a new Discord server, open Grimoire's own Discord, or close the existing one.
- Whether to opt the Discord server into Discovery or Web Presence when it reaches 1,000 members (public exposure of member messages; regional privacy defaults).
- Who may moderate, ban, or hold triage and org-moderator rights.
- Whether to switch to hosted Discourse (a paid commitment) or self-host.
- Which CoC version and enforcement wording to adopt; legal and community policy.
- Disabling blank issues in a repo that currently accepts them (changes user behaviour).

## AI-agent angle

| Mistake | Cheapest check |
|---|---|
| Treats a green community-profile percentage as proof of support routing | Check SUPPORT.md and `contact_links` explicitly; the profile ignores SUPPORT |
| Adds a `/discussions` contact link without enabling Discussions | `has_discussions` assertion per rule 2 |
| Greps only for `[INSERT CONTACT METHOD]` and misses the 3.0 placeholder | Run both patterns |
| Says Discord content is "not indexed at all" (pre-2026 knowledge) or "indexed" (post-announcement) | Rule 10; read `features` and member count |
| Puts SUPPORT.md only in the org `.github` repo and expects it to override a repo's own file | Precedence: a repo's own file wins; defaults only fill gaps |
| Assumes a default issue-template config applies to repos that have their own templates | The folder-level exclusion; check each repo's `.github/ISSUE_TEMPLATE` |
| Invents a Discord invite or handle in a README | Channel inventory file; invite API check (rule 17) |
| Posts full CI events to a public Discord | Rule 12 grep |
| Recommends Slack from habit | Rule 8 |

## Contested / evolving

- Discord as a knowledge store: vendor Discourse says chat is unsearchable and Discord web visibility is limited ([Discourse compare](https://www.discourse.org/compare/discord), vendor); Discord says Discoverable servers get web pages and message indexing from mid-December 2026 ([Discord blog](https://discord.com/blog/making-content-from-discoverable-servers-easier-to-discover)); BleepingComputer's independent reading warns default-on exposure and no retraction of public content ([BleepingComputer](https://www.bleepingcomputer.com/news/security/discord-to-let-search-engines-index-public-server-messages/)). Direction: indexing arrives for servers above 1,000 members; small servers stay invisible. Real effect unknown until after mid-December 2026; re-check then.
- Discussions versus Discord as home: the exemplars split (6 of 7 on Discussions, 4 of 7 on Discord too, uv on Discord only). No independent study found comparing support outcomes; the recommendation rests on search visibility, answer marking and co-location, not on measured outcomes.
- Discussions is mostly empty in practice: 1 discussion in the one fleet repo with it on. A low-traffic forum may look dead; an empty Discord looks equally dead (0 online). No source decides which signals better; unresolved.
- Whether a SUPPORT file is worth it when the chooser already routes: 0 of 7 exemplars have one, GitHub documents it. The rule keeps it cheap (org-level default).

## Dated facts

| Fact | Source | Source date | Type |
|---|---|---|---|
| Discord Community Guidelines: Rule 13 spam and raid tools, Rule 14 human account, Rule 15 inauthentic engagement | [discord.com/guidelines](https://discord.com/guidelines) | updated 2025-08-29, effective 2025-09-29 | platform |
| Discoverable servers: 1,000 members, 8 weeks old, activity and safety requirements | [Discord blog](https://discord.com/blog/making-content-from-discoverable-servers-easier-to-discover) | 2026-10-27 | platform |
| Server Web Page from 2026-11-16; message indexing mid-December 2026; messages before excluded | same | 2026-10-27 | platform |
| Message sharing off by default in EU, UK, Canada, Brazil, Australia, South Korea; teens excluded | same | 2026-10-27 | platform |
| About 63,000 Discoverable servers | [BleepingComputer](https://www.bleepingcomputer.com/news/security/discord-to-let-search-engines-index-public-server-messages/) | 2026-10-28 | independent press |
| AutoMod: 3 custom filters of 1,000 keywords; needs Community; bots and webhooks bypass | [Discord safety](https://discord.com/safety/auto-moderation-in-discord) | 2022-06-03 | platform (old) |
| Slack free: 90 days visible; older than one year deleted; deletion began 2024-08-26 | [Slack Help](https://slack.com/help/articles/27204752526611-Feature-limits-on-the-free-version-of-Slack) | article states 2024-08-26 | platform |
| Verification levels None, Low (verified email), Medium (+5 min account age), High (+10 min in server), Highest (verified phone) | [Discord Verification Levels](https://support.discord.com/hc/en-us/articles/216679607-Verification-Levels) via Help Center API | edited 2025-09-19 | platform |
| Discord recommends verification level Low, AutoMod, Raid Protection alerts, disabled mention-everyone for public servers | [Discord Raids 101](https://support.discord.com/hc/en-us/articles/10989121220631-How-to-Protect-Your-Server-from-Raids-101) via Help Center API | edited 2023-07-28 | platform |
| Verification level enum NONE to VERY_HIGH | [Discord API Guild](https://docs.discord.com/developers/resources/guild) | undated, read 2026-11-27 | platform |
| Discourse Free: 2 seats, 500k page views, 5GB, 10 categories; Pro $100 | [Discourse pricing](https://www.discourse.org/pricing) | undated, read 2026-11-27 | vendor |
| Discussions: 25 categories maximum; announcement categories maintain/admin only | [GitHub Docs](https://docs.github.com/en/discussions/managing-discussions-for-your-community/managing-categories-for-discussions) | undated, read 2026-11-27 | platform |
| Health file precedence `.github`, root, `docs`; ISSUE_TEMPLATE folder not merged | [GitHub Docs](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file) | undated, read 2026-11-27 | platform |
| Community profile checks README, CoC, LICENSE, CONTRIBUTING, issue templates | [GitHub Docs](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/about-community-profiles-for-public-repositories) | undated, read 2026-11-27 | platform |
| Contributor Covenant 2.1 and 3.0 ladders and placeholders | [2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/), [3.0](https://www.contributor-covenant.org/version/3/0/code_of_conduct/) | undated | authority |

## Sources

Fetched and read (23): rows marked P are primary (platform or authority).

| URL | What | Date | Why |
|---|---|---|---|
| https://discord.com/guidelines (P) | Discord Community Guidelines | 2025-08-29 | Rules 13 to 15 |
| https://discord.com/blog/making-content-from-discoverable-servers-easier-to-discover (P) | Discord announcement | 2026-10-27 | Indexing, thresholds, dates |
| https://discord.com/safety/auto-moderation-in-discord (P) | AutoMod explainer | 2022-06-03 | Limits, old |
| https://www.bleepingcomputer.com/news/security/discord-to-let-search-engines-index-public-server-messages/ | Independent press | 2026-10-28 | Second reading |
| https://www.discourse.org/compare/discord | Vendor comparison | undated | Claims to test |
| https://www.discourse.org/pricing (P for prices, vendor) | Discourse plans | undated | Costs, limits |
| https://slack.com/help/articles/27204752526611-Feature-limits-on-the-free-version-of-Slack (P) | Slack free limits | 2024-08-26 change | History loss |
| https://docs.github.com/en/discussions/collaborating-with-your-community-using-discussions/about-discussions (P) | About Discussions | undated | Capabilities |
| https://docs.github.com/en/discussions/managing-discussions-for-your-community/managing-categories-for-discussions (P) | Categories | undated | Limits |
| https://docs.github.com/en/discussions/managing-discussions-for-your-community/moderating-discussions (P) | Moderation | undated | Roles |
| https://docs.github.com/en/discussions/quickstart (P) | Enable Discussions | undated | Permissions |
| https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/enabling-or-disabling-github-discussions-for-a-repository (P) | Enable or disable | undated | Disable path |
| https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file (P) | Default health files | undated | Precedence |
| https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/adding-support-resources-to-your-project (P) | SUPPORT | undated | Surfacing |
| https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository (P) | Chooser config | undated | contact_links |
| https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/about-community-profiles-for-public-repositories (P) | Community profile | undated | Checklist scope |
| https://www.contributor-covenant.org/version/2/1/code_of_conduct/ (P) | CoC 2.1 | undated | Ladder |
| https://www.contributor-covenant.org/version/3/0/code_of_conduct/ (P) | CoC 3.0 | undated | Ladder, placeholder |
| https://support.discord.com/hc/en-us/articles/216679607-Verification-Levels (P) | Verification Levels, read via `/api/v2/help_center/en-us/articles/216679607.json` | edited 2025-09-19 | Level definitions |
| https://support.discord.com/hc/en-us/articles/10989121220631-How-to-Protect-Your-Server-from-Raids-101 (P) | Raids 101, read via Help Center API | edited 2023-07-28 | Raid guidance, Low recommendation |
| https://docs.discord.com/developers/resources/guild (P) | Guild resource | undated | Level enum |
| https://support.discord.com/hc/en-us/articles/360030843331-Discovery-Eligibility-Requirements | Discord help | n/a | Returned 403; not read |

Local measurements (commands in section 1, 2 and 7): `gh api`, `curl` against the Discord invite API, `.github/workflows/notify-discord.yml`, product-audit/distribution-posture.md.

## Unreached

- Discord rules-screening and Discovery-eligibility help pages: Discovery article returns 403 and the Help Center API was not tried for it; rules-screening not covered by the two pages read.
- Whether GitHub Discussions content is indexed by search engines: no GitHub statement found, not measured.
- Size match: sample B gives eight mid-size projects (633 to 3,342 stars) but the fleet repos' own star counts were not measured, and picks are judgment, not random.
