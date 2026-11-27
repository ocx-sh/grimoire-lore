---
title: Repository card and organisation profile
summary: The CH-GH rows for the About line, homepage, topics, social preview, write approval and the organisation profile
---

# Repository card and organisation profile

Owns what a visitor reads before the README: the About description, the homepage, the topics, the social preview image and the organisation profile. Rows CH-GH-01 to CH-GH-06 and CH-GH-30. The wording of the description and the choice of topics are the owner's positioning decisions. The agent checks limits and proposes values.

Contents: [Dates and versions](#dates-and-versions) · [Rows](#rows) ·
[Check commands](#check-commands) · [Writing a card change](#writing-a-card-change) ·
[Ask the owner](#ask-the-owner) · [What agents get wrong](#what-agents-get-wrong)

## Dates and versions

Platform limits live in `facts.md`: topics [GH-F02], social preview [GH-F03], organisation description and profile [GH-F04], [GH-F05], search scope [GH-F01], the topics endpoint [GH-F06], Docker Hub [DH-F01]. All were fetched 2026-11-27. Re-read a row's page before relying on it past its `refresh_days`.

- `gh` 2.105.0 (2026-11-17) prints the `repositoryTopics`, `usesCustomOpenGraphImage` and `openGraphImageUrl` fields that `repo_card_check.py` reads. Re-run `gh repo view --json` with no field list after a `gh` upgrade and confirm those names.
- **Catalog norms, not platform facts:** the 140-character description budget (the upstream maximum seen was 139), the minimum of 3 topics, the leading-character clause on topics, and the 58-pixel margin. No copy may present them as GitHub limits.
- **Pinned defaults, each overridable once by an adopter:** the flagship list (the owner names the repositories that get CH-GH-05 as a MUST) and the internal list (the owner names the public repositories that are exempt).
- The GraphQL `usesCustomOpenGraphImage` flag is a boolean. It says nothing about image quality, and the GraphQL reference says a false value means the owner's avatar shows. No rule encodes the default card.
- Re-check this file when GitHub Docs edit the topics, social-preview or organisation pages, and at every 180-day refresh.

Placeholders in commands: `R` is `OWNER/REPO`, `O` is the organisation login, `CHECKS` is the skill's `checks/` directory.

## Rows

When a Verification cell names several checks, the row passes only when every one passes.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CH-GH-01 | Give every public, non-internal repository a non-empty one-line About description. Set the homepage to the product site or docs page when one exists. | Default repository search reads name, description and topics only [GH-F01]. 40 of 40 measured upstream repositories have a description and 35 of 40 a homepage. | `python3 -I "$CHECKS"/repo_card_check.py --repo "$R"` reports no CH-GH-01 finding. A repository with no site prints `homepage: ask`, which is a report and not a failure. See block CH-GH-01 for the raw read. | MUST |
| CH-GH-02 | Keep the About description and every registry `description` field to one plain-text line of 140 characters or fewer, and a Docker Hub short description to 100 or fewer. Never state a GitHub description limit as a platform fact. | 140 is this catalog's budget, set from the upstream maximum of 139, so one sentence serves every surface. Docker Hub caps at 100 [DH-F01]. No GitHub page states a description limit, and the 350 figure on third-party sites is unverified. | `repo_card_check.py` reports no CH-GH-02 finding. See block CH-GH-02 for registry fields. A reviewer reading output for the figure 350 finds none without a GitHub URL beside it. | SHOULD |
| CH-GH-03 | Give every public, non-internal repository 1 to 20 topics, each of 50 characters or fewer in lowercase letters, numbers and hyphens. The minimum of 3, the leading character and the category topic are CH-GH-30. | GitHub allows at most 20 topics [GH-F02]. A repository with no topic is on no topic page and loses the topic term in default search [GH-F01]. | `repo_card_check.py` reports no CH-GH-03 finding. See block CH-GH-03. | MUST |
| CH-GH-04 | Change a live card field (description, homepage, topics, social image, organisation profile) only after printing the before and after values and getting the owner's approval. Write topics read-then-write, because the topics endpoint replaces the whole set and topics are not a `PATCH` parameter on the repository. | A blind write wipes the existing topics [GH-F06]. Card text is a public statement by the owner. | `python3 -I "$CHECKS"/repo_card_check.py --lint-writes FILE...` over every skill file that writes exits 0: each write line sits under an `APPROVAL-GATE` marker in its Markdown section, and every `gh api` call with `-f` names its method with `-X` or `--method`. At run time, print `gh api repos/"$R"/topics` before and after: every name in the before set is in the after set unless the owner approved its removal. | MUST |
| CH-GH-05 | Set a custom social preview on each flagship repository and on any other repository that a post, badge, registry page or announcement links to. Use PNG, JPG or GIF under 1,000,000 bytes, at least 640 x 320, ideally 1280 x 640. Keep the subject at least 58 pixels from the left and right edges. Use a solid background or check the image on light and dark. Put no claim in the image that is missing from the description or README. | Spec from [GH-F03]. The bytes limit avoids the MB and MiB ambiguity. The margin is derived, not sourced: 1280 - 640 x 1.91 = 57.6, rounded up, so the subject survives a 1.91:1 crop whether the platform centres it or anchors it to one side. The real crop of a 2:1 card on social link previews is unmeasured, because the inspectors need a logged-in account. 17 of 40 measured upstream repositories have a custom preview. | `python3 -I "$CHECKS"/repo_card_check.py --repo "$R" --flagship` reports no CH-GH-05 finding. It needs all three: the boolean is true, the image is under 1,000,000 bytes, and both sides are at least 640 and 320. The margin and light-and-dark clauses are review guidance, outside pass and fail: hand the card to the owner. | MUST (flagships), SHOULD (others) |
| CH-GH-06 | Give each organisation (a) a public `.github` repository with `profile/README.md`, (b) a description of 1 to 160 characters, and (c) a website. The README says in one sentence what the organisation builds, lists the repositories by role with one link each (the install path first), links the docs site, and names where to ask for help. | The path and visibility come from [GH-F05], the 160 maximum from [GH-F04]. The minimum content is a judgement, not a platform rule. | See block CH-GH-06: the README size is above 0 (a 404 fails), `d` is 1 to 160 and `w` is true. Content check, `unverified: reading heuristic`: from the README alone a first-time visitor can name the flagship and its install link. | MUST |
| CH-GH-30 | Beyond CH-GH-03, give every public, non-internal repository at least 3 topics. Start each with a letter or digit. Make at least one topic name the product category and one the language or protocol. | Catalog norm. 36 of 40 measured upstream repositories have 3 or more topics, median 8.5. GitHub documents no leading-character rule, so that clause is stricter than the platform [GH-F02]. | `repo_card_check.py` reports no CH-GH-30 finding. The category clause is `unverified: reading heuristic`: a list that holds only the product's own name fails, and the script flags that case. | SHOULD |

## Check commands

```sh
# CH-GH-01: d is 1 or more, h is true when a site exists
gh api repos/"$R" --jq '{d:((.description//"")|length),h:((.homepage//"")|length>0)}'
# CH-GH-02: prints 140 or fewer
gh api repos/"$R" --jq '(.description//"")|length'
# CH-GH-03: first prints 1 to 20, second prints 0
gh api repos/"$R"/topics --jq '.names|length'
gh api repos/"$R"/topics --jq '.names[]' | grep -vcE '^[a-z0-9-]{1,50}$'
# CH-GH-30: first prints 3 or more, second prints 0
gh api repos/"$R"/topics --jq '.names|length'
gh api repos/"$R"/topics --jq '.names[]' | grep -vcE '^[a-z0-9][a-z0-9-]{0,49}$'
# CH-GH-05: the flag, then the image the script downloads and measures
gh repo view "$R" --json usesCustomOpenGraphImage,openGraphImageUrl
# CH-GH-06: README size above 0; d from 1 to 160 and w true
gh api repos/"$O"/.github/contents/profile/README.md --jq .size
gh api orgs/"$O" --jq '{d:((.description//"")|length),w:((.blog//"")|length>0)}'
```

Record a repository's classification before any run: the owner names which public repositories are internal and exempt from CH-GH-01, CH-GH-03 and CH-GH-05. A script run on an exempt repository takes `--internal`.

## Writing a card change

Print the current values, propose the new ones, and wait for the owner's yes. Then write. Every write in this skill sits in a section carrying the marker below, and CH-GH-04 lints for it.

<!-- APPROVAL-GATE: print the before values, print the after values, wait for the owner's approval -->

```sh
# before
gh api repos/"$R"/topics
# description and homepage
gh repo edit "$R" --description "One plain line." --homepage "https://example.com"
# topics: pass the whole set, existing names included
gh api -X PUT repos/"$R"/topics -f 'names[]=cli' -f 'names[]=package-manager' -f 'names[]=rust'
# organisation description and website
gh api -X PATCH orgs/"$O" -f description="One plain line." -f blog="https://example.com"
# after
gh api repos/"$R"/topics
```

The agent never generates or uploads brand imagery. The owner supplies the social preview artwork, and the agent checks size and format.

## Ask the owner

- Which public repositories are internal and exempt, and which are flagships.
- The wording of every description, the category topics, and the homepage target for repositories with no site. The agent proposes and the owner approves.
- Any topic that names a third-party product or trademark.
- The social preview artwork, colours and logo use. Hand over any card on which the margin review fails.
- The organisation description, the profile README claims and the pinned repositories (pinning is owner-only).
- To close the crop gap: paste a flagship URL with a custom card into the link inspectors of the social platforms, which publish nothing, and report whether the card is cropped, padded or shown in full. Both need a logged-in account, which an agent may not use.

## What agents get wrong

1. States "GitHub allows 350 characters" as fact (CH-GH-02).
2. Sends `PUT topics` with only the new names, which wipes the old ones, or tries to set topics through `PATCH` on the repository (CH-GH-04).
3. Edits a repository card, or sends a `PATCH` to an organisation, with no approval (CH-GH-04).
4. Treats 1280 x 640 as the minimum, or treats `usesCustomOpenGraphImage` as an image-quality check (CH-GH-05).
5. Reads a 404 on the organisation profile README as "not applicable" instead of a failure (CH-GH-06).
