---
title: Community health files and the support home
summary: The CH-COM rows for GitHub Discussions, issue-chooser routes, the organisation .github repository with SUPPORT.md, and code-of-conduct contacts
---

# Community health files and the support home

Owns where a user with a question, a bug or a conduct report is sent, and that every route resolves. Rows CH-COM-16 to CH-COM-20. The default support home is GitHub Discussions on the product's primary repository. Venue rules for announcing a product (Hacker News, Lobsters, Reddit, dev.to) and the chat servers are the `community-post` skill's. CH-GH-06 owns the organisation `.github` repository and its profile README. CH-COM-18 owns only SUPPORT.md and the code-of-conduct default inside it.

Contents: [Dates and versions](#dates-and-versions) · [Order of work](#order-of-work) ·
[Rows](#rows) · [Check commands](#check-commands) · [Ask the owner](#ask-the-owner) ·
[What agents get wrong](#what-agents-get-wrong)

## Dates and versions

Facts live in `facts.md`, fetched 2026-11-27: Discussions answers and announcement categories [GH-F14], [GH-F15], the chooser config [GH-F16], organisation defaults and the template-folder exclusion [GH-F17], the SUPPORT file [GH-F18], and the two Contributor Covenant placeholders [CC-F01], [CC-F02].

- Contributor Covenant 2.1 and 3.0 use different placeholders. A check for one misses the other. Re-read both pages when a new version appears at contributor-covenant.org.
- **Unverified:** the claim that GitHub's community-profile percentage does not count SUPPORT has no recorded source page. Never use the percentage as proof of support routing.
- **Pinned defaults, each overridable once by an adopter:** Discussions as the home, with a Q&A category that can mark answers and an Announcements category. One organisation-level `.github` repository holds SUPPORT.md and CODE_OF_CONDUCT.md.
- Re-check at every refresh, and re-read the default-health-file page for the template-folder exclusion whenever chooser behaviour looks wrong.

Placeholders in commands: `R` is `OWNER/REPO`, `O` is the organisation login, `CHECKS` is the skill's `checks/` directory.

## Order of work

Fix the home before sending any launch traffic to it. Each step is a configuration change that needs the owner's go-ahead.

1. CH-COM-17: make every chooser route resolve.
2. CH-COM-16: turn Discussions on, with the two categories, on the primary repository.
3. CH-COM-18: create the organisation `.github` repository with SUPPORT.md and the code of conduct.
4. CH-COM-19 and CH-COM-20: fill the reporting contacts.

## Rows

When a Verification cell names several checks, the row passes only when every one passes.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CH-COM-16 | Before announcing a product anywhere, give its primary repository a public home that can mark answers. The default is GitHub Discussions with an answerable Q&A category and an Announcements category. Link the home from the README. | Discussions sits next to the code and lets maintainers mark answers [GH-F14]. Announcement-format categories restrict new posts to maintainers [GH-F15]. 12 of 15 measured upstream CLI projects run Discussions. | See block CH-COM-16: `has_discussions` is `true`, one category has `isAnswerable` true and one is named `Announcements`, and the README links `/discussions` at least once. | MUST |
| CH-COM-17 | Make every issue-chooser route resolve. A `contact_links` URL ending in `/discussions` requires Discussions on in that repository. `blank_issues_enabled: false` requires a contact link for questions. When the config file is copied from a template repository, fix the template, not the copy. | GitHub applies `contact_links` and `blank_issues_enabled` from the issue template `config.yml` [GH-F16]. A link to a disabled Discussions page is a dead route. | `python3 -I "$CHECKS"/community_check.py --has-discussions true` (the answer of `gh api repos/"$R" -q .has_discussions`) reports no CH-COM-17 finding. Add `--repo "$R"` so links to other repositories are not judged. | MUST |
| CH-COM-18 | In the organisation `.github` repository that CH-GH-06 requires, put SUPPORT.md as a routing table: question to Discussions Q&A, bug to the issue template, vulnerability to SECURITY.md, chat to the invite if one is offered. Add a Stack Overflow row only when the product's tag exists there. Put CODE_OF_CONDUCT.md in it too. A repository's own file still wins, and its own `ISSUE_TEMPLATE` folder blocks the organisation default, so check each such repository separately. | Organisation defaults fill gaps. A repository with its own template folder uses none of the default folder [GH-F17]. SUPPORT appears when someone opens an issue [GH-F18]. A tag count alone passes on an unrelated tag: one measured project name matched a tag of 380 questions about a different product. | `python3 -I "$CHECKS"/community_check.py --root ORGREPO --org-repo --check-links` reports no CH-COM-18 finding: SUPPORT.md exists and every link in it returns 200. A Stack Overflow row needs the two tag checks of block CH-COM-18. | MUST |
| CH-COM-19 | Fill the code-of-conduct reporting contact. Check for the placeholders of both Contributor Covenant versions. | 2.1 uses `[INSERT CONTACT METHOD]` [CC-F01] and 3.0 uses `[NOTE: describe your means of reporting here.]` [CC-F02]. A grep for one placeholder alone misses the other version. | `community_check.py` reports no CH-COM-19 finding: neither placeholder is present and the file holds an email address or URL. | MUST |
| CH-COM-20 | Name two enforcement contacts in the code of conduct. If only one person runs the project, write that limit down and name an escalation route for reports about that person. | One address that is the reporting target, the moderator and the maintainer leaves a report about the maintainer with no recipient. | `community_check.py` reports no CH-COM-20 finding: two or more distinct email addresses, or the word `escalat` at least once. The agent never writes the wording. It reports the failure and asks the owner. | SHOULD |

## Check commands

```sh
# CH-COM-16: true; then one answerable category and one Announcements; then 1 or more
gh api repos/"$R" -q .has_discussions
gh api graphql -f query='{repository(owner:"OWNER",name:"NAME"){discussionCategories(first:25){nodes{name isAnswerable}}}}'
grep -c '/discussions' README.md
# CH-COM-18, tag checks, only when SUPPORT.md has a Stack Overflow row: the count is 1 or more and the wiki excerpt names the product
curl -s --compressed 'https://api.stackexchange.com/2.3/tags/TAG/info?site=stackoverflow' | jq '.items[0].count'
curl -s --compressed 'https://api.stackexchange.com/2.3/tags/TAG/wikis?site=stackoverflow' | jq -r '.items[0].excerpt'
```

## Ask the owner

- Whether to enable Discussions, edit issue-chooser config (through the template repository when the file is template-owned), create the organisation `.github` repository, or add a second code-of-conduct contact or a shared mailbox. These are repository changes, made only with the owner's go-ahead, and any write goes through the CH-GH-04 approval step.
- The wording of a second contact or an escalation route when CH-COM-20 fails.
- Who moderates, who holds triage rights, and whether chat is shared with another product, separate, or absent. The chat venue itself is the `community-post` skill's.

## What agents get wrong

1. Trusts a green community-profile percentage as proof of support routing (CH-COM-18).
2. Adds a `/discussions` contact link without enabling Discussions (CH-COM-17).
3. Greps for the 2.1 placeholder only, on a file that uses 3.0 (CH-COM-19).
4. Expects an organisation default to override a repository's own `ISSUE_TEMPLATE` folder (CH-COM-18).
5. Routes how-to questions to Stack Overflow for a project that has no tag there (CH-COM-18).
