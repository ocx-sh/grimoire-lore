---
title: "Awesome lists for a Rust CLI and AI-agent tooling: maintainer activity and item requirements"
program: product
topic: channel-launch
worker: followup-q3
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 36
---

# Awesome lists: maintainer activity and item requirements

Question (q3): which topic awesome lists (Rust CLI, package managers, AI-agent tooling, awesome-claude-code) have active maintainers, and what do their own contributing files require for an item?

Repair pass 2026-11-27. Every measurement below was re-run unauthenticated (curl against the public GitHub REST API, no token) on 2026-11-27 and its output is pasted inline. Raw files: `~/.cache/research-lang/exemplars/product/wave2/launch-q3r/` (`activity.out`, `activity2.out`, `raw/`).

## Answer

Four lists are alive and fit the fleet's products: awesome-rust, awesome-claude-code, awesome-mcp-servers and VoltAgent/awesome-agent-skills. Five lists have zero merged PRs in the 90 days to 2026-11-27 or are archived and should not be targeted: awesome-cli-apps (archived), awesome-shell, awesome-ai-agents, awesome-ai-devtools, awesome-cli-coding-agents. awesome-cli-apps-in-a-csv is a sixth, thin case (2 merges, 165 PRs open over 60 days) and stays admissible but low-yield. No active package-manager list exists; the placement is the Package Managers section of awesome-rust. The fleet's repositories fail awesome-rust's entry gate today (20 and 17 stars, no matching crate). awesome-claude-code requires a human to submit through a web form and to tick "This resource is specific to Claude Code". The contributing files carry no date; "fetched 2026-11-27" is the only anchor.

## Method and raw output

Method, all read-only, 2026-11-27, no token. `since` is 90 days before 2026-11-27; `old` is 60 days before.

```
since=2026-08-29; old=2026-09-28
api(){ curl -s -H 'Accept: application/vnd.github+json' "$1"; }
api "https://api.github.com/repos/$r" | jq -r '[.full_name,.stargazers_count,"archived="+(.archived|tostring),"pushed="+.pushed_at[:10],"created="+.created_at[:10],"open_issues_and_prs="+(.open_issues_count|tostring)]|@tsv'
api "https://api.github.com/search/issues?q=repo:$r+is:pr+is:merged+merged:%3E=$since&per_page=1" | jq -r .total_count
api "https://api.github.com/search/issues?q=repo:$r+is:pr+is:open&per_page=1" | jq -r .total_count
api "https://api.github.com/search/issues?q=repo:$r+is:pr+is:open+created:%3C$old&per_page=1" | jq -r .total_count
api "https://api.github.com/repos/$r/pulls?state=closed&sort=updated&direction=desc&per_page=30" | jq -r '[.[]|select(.merged_at)][0]|[.merged_at[:10],.number]|@tsv'
```

Output (data from https://api.github.com/repos/<repo> and https://api.github.com/search/issues, GitHub vendor data about the maintainers' repositories, 2026-11-27). The first run hit the 60-requests-per-hour unauthenticated core limit for the last two repositories; the same script was re-run for those two after the reset (`activity2.out`), shown last.

```
== rust-unofficial/awesome-rust
rust-unofficial/awesome-rust	60863	archived=false	pushed=2026-11-26	created=2014-07-17	open_issues_and_prs=8
merged_prs_since_2026-08-29: 295
open_prs: 1
open_prs_created_before_2026-09-28: 0
last_merged_pr: 2026-11-26	3106
== hesreallyhim/awesome-claude-code
hesreallyhim/awesome-claude-code	58911	archived=false	pushed=2026-11-27	created=2025-04-19	open_issues_and_prs=1307
merged_prs_since_2026-08-29: 69
open_prs: 0
open_prs_created_before_2026-09-28: 0
last_merged_pr: 2026-10-22	3202
== punkpeye/awesome-mcp-servers
punkpeye/awesome-mcp-servers	98565	archived=false	pushed=2026-11-26	created=2024-11-30	open_issues_and_prs=5483
merged_prs_since_2026-08-29: 1912
open_prs: 5474
open_prs_created_before_2026-09-28: 1287
last_merged_pr: 2026-11-26	14315
== VoltAgent/awesome-agent-skills
VoltAgent/awesome-agent-skills	37588	archived=false	pushed=2026-11-15	created=2025-10-28	open_issues_and_prs=85
merged_prs_since_2026-08-29: 188
open_prs: 83
open_prs_created_before_2026-09-28: 0
last_merged_pr: 2026-11-15	1393
== toolleeo/awesome-cli-apps-in-a-csv
toolleeo/awesome-cli-apps-in-a-csv	2690	archived=false	pushed=2026-11-10	created=2017-06-21	open_issues_and_prs=446
merged_prs_since_2026-08-29: 2
open_prs: 375
open_prs_created_before_2026-09-28: 165
last_merged_pr: 2026-11-10	632
== agarrharr/awesome-cli-apps
agarrharr/awesome-cli-apps	20661	archived=true	pushed=2026-10-12	created=2015-07-09	open_issues_and_prs=5
merged_prs_since_2026-08-29: 11
open_prs: 4
open_prs_created_before_2026-09-28: 2
last_merged_pr: 2026-10-04	1367
== alebcay/awesome-shell
alebcay/awesome-shell	38033	archived=false	pushed=2025-08-28	created=2014-07-07	open_issues_and_prs=197
merged_prs_since_2026-08-29: 0
open_prs: 154
open_prs_created_before_2026-09-28: 137
last_merged_pr:
== bradAGI/awesome-cli-coding-agents
bradAGI/awesome-cli-coding-agents	1502	archived=false	pushed=2026-11-23	created=2026-02-07	open_issues_and_prs=208
merged_prs_since_2026-08-29: 0
open_prs: 204
open_prs_created_before_2026-09-28: 14
last_merged_pr:
== e2b-dev/awesome-ai-agents   (second run, activity2.out)
merged_prs_since_2026-08-29: 0
open_prs: 1198
open_prs_created_before_2026-09-28: 876
last_merged_pr(core):
== jamesmurdza/awesome-ai-devtools   (second run, activity2.out)
merged_prs_since_2026-08-29: 0
open_prs: 546
open_prs_created_before_2026-09-28: 257
last_merged_pr(core):
```

The two header lines for e2b-dev/awesome-ai-agents and jamesmurdza/awesome-ai-devtools in the first run printed `e2b-dev/awesome-ai-agents 31091 archived=false pushed=2026-08-21 created=2023-06-19 open_issues_and_prs=1361` and `jamesmurdza/awesome-ai-devtools 4002 archived=false pushed=2026-08-27 created=2023-08-03 open_issues_and_prs=596` (https://api.github.com/repos/e2b-dev/awesome-ai-agents and https://api.github.com/repos/jamesmurdza/awesome-ai-devtools, 2026-11-27). An empty `last_merged_pr` means none of the 30 most recently updated closed PRs was merged.

## Findings: activity

All values from the output above, measured 2026-11-27.

| List | Stars | Archived | Merged PRs, 90 d | Last merged PR | Open PRs / open > 60 d | Verdict |
|---|---|---|---|---|---|---|
| [rust-unofficial/awesome-rust](https://github.com/rust-unofficial/awesome-rust) | 60863 | no | 295 | 2026-11-26 (#3106) | 1 / 0 | active |
| [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) | 58911 | no | 69 | 2026-10-22 (#3202) | 0 / 0 (intake is issues, see below) | active; human maintainer commits on 2026-10-18 |
| [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) | 98565 | no | 1912 | 2026-11-26 (#14315) | 5474 / 1287 | active, large backlog |
| [VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills) | 37588 | no | 188 | 2026-11-15 (#1393) | 83 / 0 | active |
| [toolleeo/awesome-cli-apps-in-a-csv](https://github.com/toolleeo/awesome-cli-apps-in-a-csv) | 2690 | no | 2 | 2026-11-10 (#632) | 375 / 165 | thin; backlog |
| [agarrharr/awesome-cli-apps](https://github.com/agarrharr/awesome-cli-apps) | 20661 | yes | 11 | 2026-10-04 (#1367) | 4 / 2 | archived; exclude |
| [alebcay/awesome-shell](https://github.com/alebcay/awesome-shell) | 38033 | no | 0 | none (last push 2025-08-28) | 154 / 137 | inactive; exclude |
| [e2b-dev/awesome-ai-agents](https://github.com/e2b-dev/awesome-ai-agents) | 31091 | no | 0 | none (last push 2026-08-21) | 1198 / 876 | inactive; exclude |
| [jamesmurdza/awesome-ai-devtools](https://github.com/jamesmurdza/awesome-ai-devtools) | 4002 | no | 0 | none (last push 2026-08-27) | 546 / 257 | inactive; exclude |
| [bradAGI/awesome-cli-coding-agents](https://github.com/bradAGI/awesome-cli-coding-agents) | 1502 | no | 0 | none (last push 2026-11-23) | 204 / 14 | no merges; exclude |

Exclusions are exactly five: the rows marked archived or with 0 merged PRs in 90 days. awesome-cli-coding-agents and awesome-ai-agents also have no contributing file: `curl -s -o /dev/null -w "%{http_code}"` on `https://raw.githubusercontent.com/bradAGI/awesome-cli-coding-agents/main/{CONTRIBUTING.md,contributing.md,.github/CONTRIBUTING.md}` printed `404 404 404`, and on `https://raw.githubusercontent.com/e2b-dev/awesome-ai-agents/main/{CONTRIBUTING.md,contributing.md}` printed `404 404` (2026-11-27).

### awesome-claude-code: the human signal is the issue stream

The 69 merged PRs are mostly bot PRs; maintainer activity shows in a few hand-made PRs and in issue handling. Commands and output (core API, https://api.github.com/repos/hesreallyhim/awesome-claude-code/{commits,issues,pulls}, 2026-11-27):

```
$ curl -s ".../commits?per_page=8" | jq -r '.[]|[.commit.author.date[:10],(.author.login//.commit.author.name),(.commit.message|split("\n")[0][:70])]|@tsv'
2026-11-27	github-actions[bot]	chore: update repo ticker data and SVGs [skip ci]     (x5)
2026-11-26	github-actions[bot]	chore: update repo ticker data and SVGs [skip ci]     (x3)

$ curl -s ".../issues?state=closed&sort=updated&direction=desc&per_page=8" | jq -r '.[]|select(.pull_request|not)|[.closed_at[:10],.number,(.labels|map(.name)|join(",")),.title[:50]]|@tsv'
2026-11-20	3681	resource-submission,validation-pending,auto-closed	Skills Hub
2026-11-20	3273	validation-passed,resource-submission	[Resource]: dario
2026-11-20	3668	resource-submission,validation-pending,auto-closed	[Resource]: shipgate
2026-11-12	3221	validation-passed,validation-failed,resource-submission	[Resource]: Quick Actions
2026-11-12	3635	resource-submission,validation-pending,auto-closed	[Resource]: Nexity
2026-11-12	3628	validation-failed,resource-submission	Tisty

$ curl -s ".../pulls?state=closed&sort=updated&direction=desc&per_page=10" | jq -r '.[]|select(.merged_at)|[.merged_at[:10],.number,.user.login,.title[:50]]|@tsv'
2026-10-22	3202	github-actions[bot]	Add resource: Review Inbox
2026-10-15	3178	github-actions[bot]	Add resource: pstack-claude
2026-10-22	3200	github-actions[bot]	Add resource: Molecular Animation
2026-10-19	3189	github-actions[bot]	Add resource: Cubicle Crew
2026-10-18	3187	hesreallyhim	rename Open Source Software to Open Source Contrib
2026-10-18	3186	github-actions[bot]	Add resource: prismantis
2026-10-18	3184	hesreallyhim	add new category - Mods
2026-10-16	3183	github-actions[bot]	Add resource: geoai-skills
2026-10-16	3182	github-actions[bot]	Add resource: i18next-localization
2026-10-15	3180	github-actions[bot]	Add resource: Mycelium
```

Reading: the repository owner `hesreallyhim` merges structural PRs himself on 2026-10-18 (#3184, #3187), and the bot opens and merges "Add resource" PRs from approved issues; submissions that fail validation are closed with the `auto-closed` label (e.g. #3681, #3668, #3635 on 2026-11-12 and 2026-11-20). Issue counts, https://api.github.com/search/issues with `repo:hesreallyhim/awesome-claude-code+is:issue+is:closed+closed:>=2026-08-29` and `+is:issue+is:open`, 2026-11-27:

```
closed_issues_since_2026-08-29: 532
open_issues: 1307
```

### Package-manager lists

Command (https://api.github.com/search/repositories, GitHub vendor data, 2026-11-27):

```
$ curl -s "https://api.github.com/search/repositories?q=awesome+package+managers+in:name,description&sort=stars&per_page=10" | jq -r '.items[]|[.full_name,.stargazers_count,"archived="+(.archived|tostring),"pushed="+.pushed_at[:10]]|@tsv'
tapannallan/awesome-scoop	289	archived=false	pushed=2023-01-31
starikcetin/awesome-upm	207	archived=true	pushed=2024-03-04
damon-kwok/awesome-package-manager	205	archived=false	pushed=2025-05-20
shinokada/awesome	91	archived=false	pushed=2026-01-16
BabyJ723/blast-ON	55	archived=false	pushed=2021-09-04
nilsding/awesome-package-management	24	archived=false	pushed=2023-11-21
berkanuslu/choco-development-enviroment-setup	19	archived=false	pushed=2023-01-15
SwedbankAB/Swedbank	19	archived=false	pushed=2022-07-09
tiandee/awesome-skills-hub	18	archived=false	pushed=2026-08-28
emmanuelgautier/awesome-dockerfiles	16	archived=false	pushed=2026-11-27
```

[awesome-scoop](https://github.com/tapannallan/awesome-scoop) (Scoop apps only, last push 2023-01-31), [awesome-upm](https://github.com/starikcetin/awesome-upm) (Unity packages, archived), [damon-kwok/awesome-package-manager](https://github.com/damon-kwok/awesome-package-manager) (last push 2025-05-20) and [shinokada/awesome](https://github.com/shinokada/awesome) (a general list, 91 stars) are not maintained general package-manager lists for a registry CLI. Nothing else is above 30 stars and recently pushed that matches. The useful placement is the "Package Managers" section inside awesome-rust. Command and output (raw README, https://raw.githubusercontent.com/rust-unofficial/awesome-rust/main/README.md, fetched 2026-11-27):

```
$ sed -n 566,571p README.md | cut -c1-110
### Package Managers

* [helsing-ai/buffrs](https://github.com/helsing-ai/buffrs) [[buffrs](https://crates.io/crates/buffrs)] - A modern package manager for protocol buffers and
* [pkgforge/soar](https://github.com/pkgforge/soar) [[soar-cli](https://crates.io/crates/soar-cli)] - A distro-independent package manager for portable pa
* [pkgx](https://github.com/pkgxdev/pkgx) - Run anything. A composable package manager that makes the entire open source ecosystem available to your scripts.
* [rebos](https://crates.io/crates/rebos) - A declarative way to automate package management on any linux distro [![crate](https://img.shields.io/crates/v/rebos...
```

Correction to the first pass: the section holds four entries (buffrs, soar, pkgx, rebos), not three. Entries without a GitHub star count (pkgx has none in the template, rebos links crates.io only) show the template accepts an entry by crate link alone.

## Findings: what each contributing file requires

Files fetched 2026-11-27 with `curl -s https://raw.githubusercontent.com/<repo>/<branch>/<path>`; all carry no date. Quotes below are copied from the saved files in `raw/`.

| List (source URL) | Entry gate (quoted) | Process (quoted) | AI rule: `grep -n -i -E '\b(AI\|LLM\|agents?\|machine\|generated\|human)\b' <file>` result |
|---|---|---|---|
| awesome-rust ([CONTRIBUTING.md](https://raw.githubusercontent.com/rust-unofficial/awesome-rust/main/CONTRIBUTING.md), [PR template](https://raw.githubusercontent.com/rust-unofficial/awesome-rust/main/.github/pull_request_template.md)) | "Accepted: `(stars > 50 \| downloads > 2000)`"; "at least 50 stars on GitHub, 2000 downloads on crates.io, or an equivalent level of other popularity metrics (which should be specified in the PR)" | "go to .../README.md and click on the 'pen' icon ... create a pull request"; template `[ACCOUNT/REPO](https://github.com/ACCOUNT/REPO) [[CRATE](https://crates.io/crates/CRATE)] - DESCRIPTION`; "pay attention to the alphabetical ordering"; PR template: "- [ ] - I have read the CONTRIBUTING.md and my pull request fulfills the criteria therein" | 0 hits in both files: no AI rule |
| awesome-claude-code ([CONTRIBUTING.md](https://raw.githubusercontent.com/hesreallyhim/awesome-claude-code/main/CONTRIBUTING.md), [issue form](https://raw.githubusercontent.com/hesreallyhim/awesome-claude-code/main/.github/ISSUE_TEMPLATE/recommend-resource.yml)) | "(i) Be at least 14 days old (14 days since first commit on default branch) AND show signs of active development ...; OR (ii) Have at least 100 stars."; "You may not recommend more than one resource at a time."; "Resources that fail these criteria will be closed automatically."; form checkbox, `required: true`: "This resource is specific to Claude Code" (the CONTRIBUTING text calls Claude-Code focus "not a hard requirement but it is a guideline") | "Do not open a PR. Just fill out the form."; "It is **not** possible to submit a resource recommendation using the `gh` CLI."; "ALL RECOMMENDATIONS MUST BE MADE USING THE WEB UI ISSUE FORM TEMPLATE, OR YOU RISK BEING RESTRICTED FROM INTERACTING WITH THIS REPOSITORY TEMPORARILY."; "Recommendations are reviewed in a best-effort way, and no guarantee is made as to whether you will receive a response."; "STYLE: ... not a sales pitch. Don't address the reader ... Keep it formatted to one line. Don't use any emojis." | line 51: "Although resources themselves may be partially or entirely written by a coding agent, resource recommendations must be created by human beings." |
| awesome-mcp-servers ([CONTRIBUTING.md](https://raw.githubusercontent.com/punkpeye/awesome-mcp-servers/main/CONTRIBUTING.md)) | "servers with a public GitHub repository — something you install and run yourself"; remote-only goes to awesome-remote-mcp-servers; "PRs must include a backlink to your https://glama.ai/mcp/servers MCP server listing ... Backlinks are checked before merging the PR." | fork, branch, edit `README.md`, PR; "Maintain alphabetical order"; "One server per line" | line 6: "If you are an agent, start by contributing the backlink to the original project repository." Agents are accommodated |
| VoltAgent/awesome-agent-skills ([CONTRIBUTING.md](https://raw.githubusercontent.com/VoltAgent/awesome-agent-skills/main/CONTRIBUTING.md)) | "Public repository with a working skill"; "Author/org prefix included in the name"; "Description must be short, 10 words or fewer."; "Skill must have real community usage ... Brand new skills that were just created are not accepted." | PR title `Add skill: author/skill-name`; entry `- **[author/skill-name](https://github.com/author/repo/path)** - Short description of what it does` | 3 hits, all describing the list's subject (lines 1, 3, 18); no AI-contribution rule |
| awesome-cli-apps-in-a-csv ([CONTRIBUTING.md](https://raw.githubusercontent.com/toolleeo/awesome-cli-apps-in-a-csv/master/CONTRIBUTING.md)) | name, `homepage` or `git`; "At least one of the two items `homepage` and `git` must be present." | open an issue, or PR on `data/apps.csv`: "Please make changes to the CSV file only, not to the README file." | 1 hit (line 30, README generation); no AI rule |
| awesome-cli-apps, archived ([contributing.md](https://raw.githubusercontent.com/agarrharr/awesome-cli-apps/master/contributing.md)) | "Be more than 3 months old."; "Have more than 20 stars (if it is hosted on GitHub.)" | "Open one pull request per app suggestion and title it simply `Add APP_NAME`." | line 34: "AI-generated PRs are not welcome." Moot: archived |
| awesome-shell, inactive ([CONTRIBUTING.md](https://raw.githubusercontent.com/alebcay/awesome-shell/master/CONTRIBUTING.md)) | "GitHub projects must have _at least_ 50 stars"; "Self-promotion is okay!" | PR, see sindresorhus guide | 0 hits: no AI rule; but 0 merges in 90 d |
| awesome-ai-devtools, inactive ([PR template](https://raw.githubusercontent.com/jamesmurdza/awesome-ai-devtools/main/.github/PULL_REQUEST_TEMPLATE.md)) | checklist: "The entry is a tool that uses AI"; "The entry is a developer-focused tool"; "NOT valid: General purpose AI agents/assistants" | PR | 3 hits, all scope text; no AI-contribution rule; 0 merges in 90 d |

The "AI rule" column is a negative-claim record: the grep above was run on each saved file on 2026-11-27 and its hits were read; where it says "no AI rule" the only hits are scope words about the list's subject.

## Applied to the fleet

Commands and output (https://api.github.com/repos/ocx-sh/ocx, https://api.github.com/repos/grimoire-rs/grimoire, https://crates.io/api/v1/crates/{ocx,grim,grimoire}, all 2026-11-27):

```
$ curl -s https://api.github.com/repos/$r | jq -r '[.full_name,.created_at[:10],.stargazers_count]|@tsv'
ocx-sh/ocx	2026-03-03	20
grimoire-rs/grimoire	2026-05-15	17
$ curl -s -A research-followup https://crates.io/api/v1/crates/$c | jq -c '{name:.crate.name,downloads:.crate.downloads,repo:.crate.repository,created:.crate.created_at[:10],detail:.errors}'
ocx      {"name":null,"downloads":null,"repo":null,"created":null,"detail":[{"detail":"crate `ocx` does not exist"}]}
grim     {"name":"grim","downloads":136,"repo":"https://github.com/Vaishnav-Sabari-Girish/grimoire","created":"2026-06-29","detail":null}
grimoire {"name":"grimoire","downloads":5225,"repo":"https://github.com/jshrake/grimoire","created":"2018-06-18","detail":null}
```

`grim` and `grimoire` on crates.io belong to other authors, so neither fleet product has a crate of its own under those names.

| List | ocx | grim | Reason |
|---|---|---|---|
| awesome-rust | fails (20 < 50 stars, no crate) | fails (17 < 50, no crate of its own) | the "equivalent popularity metrics specified in the PR" path is a maintainer judgement, not a pass |
| awesome-claude-code | passes the age gate (created 2026-03-03, over 14 days) | passes the age gate (2026-05-15) | the required "specific to Claude Code" checkbox is a human attestation; grim is multi-client, so whether it is true is a human decision |
| awesome-mcp-servers | n/a unless a product ships an MCP server | same | needs a glama.ai listing and backlink first |
| awesome-agent-skills | n/a for ocx | 17 stars, "brand new skills ... are not accepted"; defer | needs real community usage |

## Effect on the ruleset

**CH-LAUNCH-12 (confirm, tighten).** Confirm. Two more primary files support the agent-never-submits MUST: awesome-claude-code ("not possible ... using the `gh` CLI"; recommendations "must be created by human beings") and the archived awesome-cli-apps ("AI-generated PRs are not welcome"). Counter-evidence: awesome-mcp-servers invites agent PRs. The MUST stands because it is a fleet boundary; a human may override per list. Tightened text, appended to the rule's third bullet: "Every awesome-list or directory row in the plan carries the marker `human submits`; the agent writes no `gh pr create`, `gh issue create` or `gh api` write against a third-party list repository." Verification, run on the plan (fixtures `fx/good.md` and `fx/bad.md` in the cache directory; output of the run on 2026-11-27 shown):
1. `grep -n 'awesome' <plan> | grep -v 'human submits'` prints nothing. On `fx/good.md` it printed nothing; on `fx/bad.md` it printed line 1 (the row with `agent` as actor).
2. `grep -nE 'awesome' <plan> | grep -E 'gh (pr|issue) create'` prints nothing. On `fx/good.md` nothing; on `fx/bad.md` it printed line 1.
3. `grep -n 'hesreallyhim/awesome-claude-code' <plan> | grep -v 'Do not open a PR'` prints nothing (the row must quote the form-only instruction). On `fx/good.md` nothing; on `fx/bad.md` it printed line 1.
Any printed line fails the rule. This adds to, and does not replace, the existing checks 1 to 4; check 4's quote requirement is met by check 3 above for awesome-claude-code. Staleness: `curl -s https://raw.githubusercontent.com/hesreallyhim/awesome-claude-code/main/CONTRIBUTING.md | grep -c 'must be created by human beings'` prints 1 as of 2026-11-27 and is re-run on plan day (CH-LAUNCH-13).

**CH-LAUNCH-04 (change, add default exclusion and verification).** New text appended to the default-exclusions list (SHOULD):

> - Awesome lists archived, or with no merged PR in the 90 days before the plan date: excluded by default. As of 2026-11-27 that is agarrharr/awesome-cli-apps (archived), alebcay/awesome-shell, e2b-dev/awesome-ai-agents, jamesmurdza/awesome-ai-devtools and bradAGI/awesome-cli-coding-agents. Lists that passed the liveness check on 2026-11-27 and are worth reading on plan day: rust-unofficial/awesome-rust, hesreallyhim/awesome-claude-code, punkpeye/awesome-mcp-servers, VoltAgent/awesome-agent-skills.

Verification, run on the plan:
1. `grep -nE 'agarrharr/awesome-cli-apps|alebcay/awesome-shell|e2b-dev/awesome-ai-agents|jamesmurdza/awesome-ai-devtools|bradAGI/awesome-cli-coding-agents' <plan> | grep -v 'excluded-by-default'` prints nothing. On `fx/good.md` it printed nothing; on `fx/bad.md` it printed line 2 (awesome-shell marked `fit`).
2. For every other list row, the CH-LAUNCH-17 liveness command prints `false` and a count of at least 1 (an override by the owner is recorded on the row as `owner-override`).
Row quote requirement is unchanged: a row with no quoted scope sentence fails.

**CH-LAUNCH-16 (NEW). Awesome-list entry readiness.**
- Rule: before a list row is marked `fit`, the plan records the list's own numeric gate (stars, downloads, age, usage) with the product's measured value, and marks the row `deferred` when the product fails it. Never rely on a "popularity equivalent" argument without the owner's decision.
- Rationale: awesome-rust requires "stars > 50 | downloads > 2000"; ocx and grimoire measure 20 and 17 stars (https://api.github.com/repos/ocx-sh/ocx, https://api.github.com/repos/grimoire-rs/grimoire, 2026-11-27) and have no crate of their own. awesome-claude-code requires 14 days or 100 stars and a Claude-Code-specific attestation. A rejected or auto-closed submission is a wasted human step.
- Severity: SHOULD.
- Verification: for each list row the plan holds `gate_quote`, `measured` and `verdict`. Stars: `gh api repos/<o>/<r> --jq .stargazers_count` (unauthenticated equivalent: `curl -s https://api.github.com/repos/<o>/<r> | jq .stargazers_count`, printed `20` and `17` for the fleet on 2026-11-27). Downloads: `curl -s -A <name> https://crates.io/api/v1/crates/<crate> | jq .crate.downloads`. Age: `curl -s https://api.github.com/repos/<o>/<r> | jq -r .created_at` against plan date minus 14 days. A row marked `fit` with `measured` below the quoted gate fails.

**CH-LAUNCH-17 (NEW). List liveness check.**
- Rule: before admitting a list, run the 90-day merge count; zero merges, or `archived: true`, means exclude.
- Rationale: 5 of the 10 lists measured on 2026-11-27 are archived or have 0 merged PRs in 90 days while holding 154 to 1198 open PRs (alebcay/awesome-shell 154, bradAGI/awesome-cli-coding-agents 204, jamesmurdza/awesome-ai-devtools 546, e2b-dev/awesome-ai-agents 1198; the archived list has 4); an entry there is never read.
- Severity: SHOULD.
- Verification: `curl -s https://api.github.com/repos/<o>/<r> | jq .archived` prints `false`, and `curl -s "https://api.github.com/search/issues?q=repo:<o>/<r>+is:pr+is:merged+merged:%3E=<plan date minus 90 days>&per_page=1" | jq .total_count` prints at least 1 (on 2026-11-27: awesome-rust printed `false` and `295`; awesome-cli-apps printed `true`). For lists that take issues (awesome-claude-code) also count closed issues: `...q=repo:<o>/<r>+is:issue+is:closed+closed:%3E=<date>` (printed `532`).

**CH-LAUNCH-13 (confirm).** Every list figure here must be re-fetched on plan day; the thresholds (50 stars, 100 stars, 20 stars, 14 days) are repository file text with no date.

## AI-agent angle

- Agent opens a PR on awesome-claude-code or runs `gh issue create` there. Check: CH-LAUNCH-12 checks 2 and 3 above.
- Agent recites "awesome-rust needs 50 stars" and marks the row `fit` anyway, or applies sindresorhus/awesome list gates to an item. Check: CH-LAUNCH-16 `measured` field.
- Agent targets archived awesome-cli-apps because it ranks first by stars among CLI lists. Check: CH-LAUNCH-04 check 1 and CH-LAUNCH-17.
- Agent pastes a marketing description. awesome-claude-code requires one line, not a sales pitch, no emojis, no reader address; VoltAgent caps at 10 words. Check: `wc -w` on the drafted VoltAgent description prints 10 or less, and `grep -nP '[\x{1F300}-\x{1FAFF}]'` on the drafted entry prints nothing.

## Dated facts

| Fact | Value | Source URL | Date |
|---|---|---|---|
| awesome-rust gate | stars > 50, or downloads > 2000, or equivalent specified in PR | https://raw.githubusercontent.com/rust-unofficial/awesome-rust/main/CONTRIBUTING.md | fetched 2026-11-27 (undated file) |
| awesome-claude-code gate | 14 days or 100 stars; web form only; human submitter | https://raw.githubusercontent.com/hesreallyhim/awesome-claude-code/main/CONTRIBUTING.md | fetched 2026-11-27 (undated file) |
| awesome-mcp-servers backlink | glama.ai listing required | https://raw.githubusercontent.com/punkpeye/awesome-mcp-servers/main/CONTRIBUTING.md | fetched 2026-11-27 (undated file) |
| awesome-claude-code closed issues, 90 d | 532 closed, 1307 open | https://api.github.com/search/issues (vendor data) | 2026-11-27 |
| awesome-cli-apps | archived, last push 2026-10-12 | https://api.github.com/repos/agarrharr/awesome-cli-apps | 2026-11-27 |
| awesome-shell | last push 2025-08-28, 0 merges 90 d | https://api.github.com/repos/alebcay/awesome-shell | 2026-11-27 |
| Fleet stars | ocx 20, grimoire 17 | https://api.github.com/repos/ocx-sh/ocx, .../grimoire-rs/grimoire | 2026-11-27 |
| crates.io | ocx absent; grim 136 downloads (other author); grimoire 5225 (other author, 2018) | https://crates.io/api/v1/crates/{ocx,grim,grimoire} | 2026-11-27 |
| Package Managers section | 4 entries, README lines 566-571 | https://raw.githubusercontent.com/rust-unofficial/awesome-rust/main/README.md | fetched 2026-11-27 |
| Merge counts, 90 d | activity table | https://api.github.com/search/issues (vendor data) | 2026-11-27 |

## What could not be determined

- Whether awesome-claude-code's maintainer acts on issues within a stated time: the file promises "best-effort" and no guarantee. Not measurable without submitting.
- Whether grim or ocx would be accepted by awesome-rust under "equivalent popularity metrics": a maintainer judgement; no precedent was found because closed PRs were not read.
- Whether grim is "specific to Claude Code" for the awesome-claude-code attestation: an owner decision.
- A maintained package-manager awesome list outside GitHub search: not excluded.
- GitHub unauthenticated rate limits (60 core and 10 search requests per hour) prevented re-reading more than the table above; no credential was used.
- Console.dev and Terminal Trove (q2) and Reddit (q4) are out of scope here.

## Sources

- https://raw.githubusercontent.com/rust-unofficial/awesome-rust/main/CONTRIBUTING.md and `.github/pull_request_template.md` (fetched 2026-11-27)
- https://raw.githubusercontent.com/rust-unofficial/awesome-rust/main/README.md (2026-11-27)
- https://raw.githubusercontent.com/hesreallyhim/awesome-claude-code/main/CONTRIBUTING.md and `.github/ISSUE_TEMPLATE/recommend-resource.yml` (2026-11-27)
- https://raw.githubusercontent.com/punkpeye/awesome-mcp-servers/main/CONTRIBUTING.md (2026-11-27)
- https://raw.githubusercontent.com/VoltAgent/awesome-agent-skills/main/CONTRIBUTING.md (2026-11-27)
- https://raw.githubusercontent.com/toolleeo/awesome-cli-apps-in-a-csv/master/CONTRIBUTING.md (2026-11-27)
- https://raw.githubusercontent.com/agarrharr/awesome-cli-apps/master/contributing.md (2026-11-27)
- https://raw.githubusercontent.com/alebcay/awesome-shell/master/CONTRIBUTING.md (2026-11-27)
- https://raw.githubusercontent.com/jamesmurdza/awesome-ai-devtools/main/.github/PULL_REQUEST_TEMPLATE.md (2026-11-27)
- https://api.github.com/repos/<r>, /search/issues, /search/repositories, /repos/hesreallyhim/awesome-claude-code/{commits,issues,pulls} for the ten repositories (vendor data, 2026-11-27)
- https://crates.io/api/v1/crates/ocx, /grim, /grimoire (2026-11-27)
