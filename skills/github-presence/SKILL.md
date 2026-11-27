---
name: github-presence
description: GitHub and package-registry presence for a software project, covering the repository About line, homepage, topics and social preview, the organisation profile README, community files (Discussions, issue-chooser routes, SUPPORT.md, code-of-conduct contacts), registry listings on crates.io, npm, PyPI, the VS Code Marketplace, Homebrew taps and GHCR image labels, the README images and links registries reuse, and how to report stars, downloads, clones and traffic without inflating them. Use when setting a repository description or topics, adding a social preview image, editing package keywords, description or repository fields, setting up Discussions or SUPPORT.md, submitting to homebrew-core, or quoting a GitHub or download number. Not for release notes or the GitHub Release object, which is release-notes, and not for posts on social or community venues, which are the channel skills.
license: Apache-2.0
metadata:
  summary: Checked procedure for the GitHub repository card, organisation profile, community health files, registry listings and reportable numbers, with every platform limit in one dated facts file
  keywords: github,repository,about,topics,social-preview,organisation-profile,discussions,support,code-of-conduct,crates.io,npm,pypi,vscode-marketplace,homebrew,ghcr,readme,stars,downloads,traffic,metrics
  grim.requires.skills.channel-publishing: "./channel-publishing:0"
---

# github-presence

A project's GitHub card, its organisation profile and its registry pages are where a visitor first meets it, and the GitHub and registry counters are the only usage numbers most projects have. This skill reads each surface against its rows, proposes changes, and writes only what the owner approves.

## Stop condition

Stop when every target has a verdict: each finding as `target: ID SEVERITY: message`, or `clean`. Every proposed write is printed with its before and after values and marked approved or pending. Mark any finding no script produced `unverified: reading heuristic`. Report first. Never write to GitHub, a registry or a repository file without the owner's approval for that change.

Contents: [Boundary](#boundary) · [Before you start](#before-you-start) ·
[Where the depth is](#where-the-depth-is) · [The procedure](#the-procedure) ·
[The MUST rows this procedure enforces](#the-must-rows-this-procedure-enforces) ·
[Dated facts](#dated-facts) · [What agents get wrong here](#what-agents-get-wrong-here) ·
[What to ask a human](#what-to-ask-a-human) · [Siblings](#siblings)

## Boundary

This skill requires `channel-publishing`. These five rules from it bind every step below.

- **CH-CORE-01 (scope).** GitHub and the package registries are outside that rule's venue list. Their writes follow the approval step here (CH-GH-04). On every venue on that list (a post about the project on LinkedIn, X, Hacker News, Discord and the rest), stop at a draft file. This skill never posts, comments, votes, follows or stars.
- **CH-CORE-10 (credentials).** Never create, paste or print a token. The traffic-archive token, registry tokens and extension-publishing credentials are created and tested by the owner. A workflow names a secret and never holds its value. A repository that holds a publishing credential extends its gitleaks configuration as `channel-publishing` says.
- **CH-CORE-11 (facts from the registry).** Take every platform limit, policy clause and API behaviour from a row of `references/facts.md` and cite its id in square brackets in the same line. With no row, state no number and quote no clause, and name the gap.
- **CH-CORE-13 (dates).** A row past its `refresh_days` is stale. Re-fetch the page. Never extend a date.
- **CH-CORE-18 and CH-CORE-19 (links).** Link only channels listed in the organisation's `channels.yml`: in a README, the organisation profile README and SUPPORT.md. A handle with `ownership: inferred` is never linked. A 403 or a login wall means "not provable", never "absent".

## Before you start

- **Tools.** `gh` authenticated with read access (optional: steps 2 and 4 name the fallback when it is unavailable or not authorised), `python3` 3.11 or newer, `jq`, `curl`. The scripts use the standard library only.
- **Variables.** `R` is `OWNER/REPO`, `O` is the organisation login, `ORGREPO` is a checkout of the organisation `.github` repository, and `CHECKS` is the directory that holds `repo_card_check.py`: `.claude/skills/github-presence/checks` in an installed project copy, `$CLAUDE_CONFIG_DIR/skills/github-presence/checks` when installed globally, `skills/github-presence/checks` in the catalog tree. Every script has `--help` and `--self-test`, exits 0 clean, 1 on findings, 2 on a usage error.
- **Two lists the owner supplies.** The flagship repositories (CH-GH-05 is a MUST for them) and the internal repositories (exempt from CH-GH-01, CH-GH-03 and CH-GH-05). Ask for both before step 1. If the owner has not answered, treat no repository as internal and name none a flagship, and say so in the report.
- **Pinned defaults.** The description budget, the minimum topic count, the social-preview margin, the launch baseline length, Discussions as the support home and one organisation `.github` repository are catalog norms. They are defaults an adopter overrides once, not GitHub facts.

## Where the depth is

Read the one file that fits the task. Rule rows, their verification and the check commands live there.

| You are doing this | Read |
|---|---|
| Setting or reviewing a repository description, homepage, topics, social preview or organisation profile | [references/repo-card.md](references/repo-card.md) (CH-GH-01 to 06, 30) |
| Editing a manifest, a README a registry reuses, a Homebrew formula or an image label | [references/registry-listings.md](references/registry-listings.md) (CH-GH-13 to 22) |
| Quoting a count, choosing a launch counter, writing the traffic archive or asking for stars | [references/numbers.md](references/numbers.md) (CH-GH-23 to 28, 31, 32) |
| Setting up Discussions, the issue chooser, SUPPORT.md or a code of conduct | [references/community-health.md](references/community-health.md) (CH-COM-16 to 20) |
| Quoting any limit, policy or date | [references/facts.md](references/facts.md) |

## The procedure

Run the steps in order for the surfaces in scope. Steps 2 to 5 are read-only.

### 1. Scope the work

Input: the request and the two owner lists. Output: a list of targets (repositories, organisations, packages) and the surfaces each one has. Ask which repositories are flagships and which are internal. Skip nothing silently: a skipped target is named with its reason.

Done when every target has a surface list and a classification.

### 2. Read each repository card

Input: `R`. Run `export CHECKS=<the directory that holds repo_card_check.py>` before any block in this procedure, then:

```sh
python3 -I "$CHECKS"/repo_card_check.py --repo "$R" --flagship
```

Drop `--flagship` for other repositories and add `--internal` for an exempt one. The script reads `gh repo view --json` and downloads the social image to measure it. A `homepage: ask` line is a question for the owner, not a failure. When `gh` is unavailable or the owner has not authorised it, feed the output of `gh repo view --json` (or the unauthenticated REST fields in the same shape) through `--json FILE`, and the downloaded social image through `--image FILE`, in place of `--repo`.

Done when you hold the findings for CH-GH-01 to 05 and 30 for every repository, or the note that explains why none ran.

### 3. Read each organisation profile

Input: `O`. Run the two commands of block CH-GH-06 in `references/repo-card.md`.

Done when the profile README size, the description length and the website flag are recorded, and a 404 is recorded as a failure.

### 4. Read community health

Input: a checkout of each repository, and of the organisation `.github` repository. Read `has_discussions` first, then run:

```sh
gh api repos/"$R" -q .has_discussions
python3 -I "$CHECKS"/community_check.py --repo "$R" --has-discussions true
python3 -I "$CHECKS"/community_check.py --root ORGREPO --org-repo --check-links --has-discussions true
```

Use `false` when the first command printed `false`. Without `gh`, the first command becomes a question for the owner, and the answer goes in `--has-discussions`. If the organisation `.github` repository does not exist, record CH-COM-18 and CH-GH-06 as failed and skip the third command. Exit 2 means a usage error, not a pass. Run the CH-COM-16 commands in `references/community-health.md` for the categories and the README link.

Done when CH-COM-16 to 20 each have a pass, a finding or a named owner question.

### 5. Read registry manifests

Input: a checkout of each package repository. Run:

```sh
python3 -I "$CHECKS"/registry_manifest_check.py --root . --live-categories
```

A PyPI project marked `Private :: Do Not Upload` is skipped as unpublished. For a tree with other unpublished PyPI projects, ask the owner which projects are published and run the script with each of their directories as `--root`. Then run the per-row commands of `references/registry-listings.md` that the script does not cover (CH-GH-20 to 22). A README edit reaches no registry until the next release (CH-GH-22): say which registry still shows the old text.

Done when CH-GH-13 to 22 each have a pass, a finding or "not applicable" with the reason (no formula, no extension, no image).

### 6. Lint any write step you or the owner wrote

Input: every Markdown file that holds a procedure with a write command. Run:

```sh
python3 -I "$CHECKS"/repo_card_check.py --lint-writes FILE...
```

Done when it exits 0. A write command is a `gh repo` edit, a `gh api` call whose method is `PUT`, `PATCH`, `POST` or `DELETE`, or a GraphQL mutation. Every `gh api` call with a field flag names its method.

### 7. Propose changes

Input: the findings. Output: one table with a row per change: target, field, before, after, rule ID. Propose values for description, topics, homepage and profile text, because they are positioning decisions the owner approves. For a topics change the after value is the whole new set, existing names included.

Done when the table is printed and the owner has answered. Without an answer, stop here and report the table as pending.

### 8. Apply approved changes

<!-- APPROVAL-GATE: every write below needs the owner's yes for that exact change -->

Input: the approved rows. Run the matching commands from "Writing a card change" in `references/repo-card.md`, one change at a time. Print the field before and after each write, and read it back.

Done when each approved row shows its new value on read-back and every topic in the before set is still in the after set unless the owner approved its removal. The agent never uploads or generates brand imagery and never creates a secret.

### 9. Report numbers in the one allowed form

Input: any report, launch plan or copy that quotes a GitHub or registry number. Apply the form and the greps of CH-GH-23 and CH-GH-24 in `references/numbers.md`. Read each number from its signal's command today. Never reuse a cached figure.

Done when every number has the form `NUMBER (ID, WINDOW, read DATE)`, none is called users, and no launch goal is a star count, a Trending place or a vote score.

### 10. Hand off

Output: one list of owner actions: each approval pending, each secret to create, each unverified item, and the date of the next stale row. Cut everything that does not change a decision.

## The MUST rows this procedure enforces

Merge-blocking rows, restated as findings so a review that runs this procedure without the depth files loaded still reports them with the right ID. SHOULD rows (CH-GH-02, 13, 15, 21, 22, 30, 31, 32 and CH-COM-20) are reported and never block.

| # | Finding | Rule |
|---|---|---|
| 1 | A public repository has an empty About description | CH-GH-01 |
| 2 | A public repository has no topic, more than the platform allows, or a name outside the allowed pattern | CH-GH-03 |
| 3 | A card field, topic set or organisation field was written without printing before and after and getting approval, or a topics write dropped existing names | CH-GH-04 |
| 4 | A flagship repository has no custom social preview, or its image is too large or too small | CH-GH-05 |
| 5 | An organisation has no profile README, no description or no website | CH-GH-06 |
| 6 | A crate has too many keywords, a bad keyword, or a category that is not a live slug | CH-GH-14 |
| 7 | An npm `repository` is not an object, or lacks `directory` in a monorepo | CH-GH-16 |
| 8 | A PyPI project lacks a content type, a recognised Project-URL label, or a `twine check` step | CH-GH-17 |
| 9 | A README a registry reuses has a relative image, or a relative link on PyPI | CH-GH-18 |
| 10 | A VS Code extension breaks the icon, keyword, SVG, credential or link-field checks | CH-GH-19 |
| 11 | A homebrew-core submission was made, or eligibility claimed, before the thresholds hold | CH-GH-20 |
| 12 | A number is reported without its signal id, window and read date, or is called users | CH-GH-23 |
| 13 | A launch goal is a star count, a Trending place, a point total or a vote score, or the plan lacks `counter`, `read_command` or `baseline_window` | CH-GH-24 |
| 14 | A flagship has no traffic-archive workflow that passes the lint, or the agent created the secret | CH-GH-25 |
| 15 | The stargazers list was read on a repository the actor does not administer, or a 404 was read as zero | CH-GH-26 |
| 16 | A star ask carries a reward, or stars, upvotes or support were bought, traded, scripted or coordinated | CH-GH-27 |
| 17 | A link to the OSS Insight service remains (until its row expires) | CH-GH-28 |
| 18 | The primary repository has no answerable Discussions category and no Announcements category, or the README does not link it | CH-COM-16 |
| 19 | An issue-chooser route is dead: a `/discussions` link with Discussions off, or no question route when blank issues are off | CH-COM-17 |
| 20 | The organisation `.github` repository has no SUPPORT.md, or a link in it does not return 200 | CH-COM-18 |
| 21 | A code of conduct keeps a template placeholder or names no reporting contact | CH-COM-19 |

## Dated facts

Every limit, policy clause and API behaviour sits in `references/facts.md` with its source URL, source date, fetch date and refresh interval. Rules cite a row by id. This file repeats no limit.

Every row carries `refresh_days`: 180 for hard limits, 90 for policy, API fields and label triggers, 30 for prices. `facts_check.py` fails on the first overdue row; re-fetch it, never extend the date. `facts_check.py` is in the `channel-publishing` skill, and the catalog's `task artifacts` runs it. Two rows are event-driven and expire on a date: the OSS Insight shutdown (retire CH-GH-28 that day) and the Azure DevOps token retirement (replace the Marketplace credential row that day).

## What agents get wrong here

Ranked by how often it bites.

1. **Treats a number as a result.** Calls downloads "users", reports 14-day traffic as monthly, sets stars as the launch goal. CH-GH-23, CH-GH-24.
2. **Invents or misremembers a limit.** Writes a GitHub description cap, invents crates.io category slugs, cites one Homebrew threshold only. CH-GH-02, CH-GH-14, CH-GH-20. The fix is the facts file.
3. **Writes without approval or destructively.** Sends a topics `PUT` with only the new names, which wipes the old ones, or edits an organisation with no approval. CH-GH-04.
4. **Wrong source of truth.** Reads a version from a checked-in manifest, assumes a README edit reaches a registry, leaves `./docs/x.md` in a README PyPI reuses. CH-GH-18, CH-GH-22.
5. **Trusts a proxy signal.** A green community-profile percentage as proof of support routing, a `/discussions` link added without enabling Discussions, a grep for one code-of-conduct placeholder version. CH-COM-17 to 19.
6. **Does an owner's job.** Creates the traffic token, uploads brand imagery, cuts a release to refresh a README. CH-GH-25, CH-GH-22.

## What to ask a human

- Which public repositories are internal, and which are flagships.
- The wording of every description, the category topics, the homepage for a repository with no site, and any topic that names a third-party product.
- The social-preview artwork. The agent checks size and format only.
- The organisation description, the profile README claims and the pinned repositories (pinning is owner-only).
- Whether to enable Discussions, edit chooser config, create the organisation `.github` repository, add a second code-of-conduct contact, or name an escalation route.
- The traffic-archive token: which account owns it, its permission, and where the archive lives.
- Whether any GitHub or registry number appears in public copy, and the launch counter and target.
- Turning on immutable releases, a crates.io name change, a tap or homebrew-core, a Docker Hub namespace, and cutting a patch release only to refresh a registry README.

## Siblings

- `channel-publishing`: required. The boundary, the facts registry format and `facts_check.py`.
- `release-notes`: the GitHub Release object, the Latest flag, immutable releases, download URLs and version agreement across tag, title, changelog and registry. This skill ends where a Release begins.
- `launch-plan`: reads the signal table in `references/numbers.md` for its counter field. `community-post` owns announcement venues and chat servers. `marketing-quality` owns the wording of a description, a keyword list and a count on a copy surface.
- `docs-quality`: its docs-site pages and `llms.txt`. Its traffic-reading row can meet a 30-day clause only from the archive in CH-GH-25.
