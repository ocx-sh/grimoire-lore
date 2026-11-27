---
title: The GitHub repository card and the organisation profile
program: product
sub_program: channels
topic: channel-github
worker: gh-repo-card
date_researched: 2026-11-27
model: sonnet
sources_fetched: 15
---

# The GitHub repository card and the organisation profile

Scope: the About description, topics, homepage URL, social preview image, and the organisation profile README, with measurements of the 17 fleet repositories and the 40 upstream exemplars. Not covered: README prose and og tags on product sites (marketing), which channels exist (core-facts-and-channel-inventory). All GitHub Docs pages cited carry no date on the page; the only date they support is the fetch date 2026-11-27. Web search was used once, only to look for a description limit (see Contested).

## Contents

1. Summary
2. Findings (2.1 documented limits, 2.2 fleet measurements, 2.3 upstream measurements, 2.4 audit figures re-checked, 2.5 organisation profile)
3. Dated facts
4. Normative guidance candidates
5. What an agent must not decide alone
6. AI-agent angle
7. Contested / evolving
8. Sources

## 1. Summary

- Topics: at most 20 per repository, each 50 characters or fewer, lowercase letters, numbers and hyphens ([GitHub Docs, fetched 2026-11-27](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics)).
- Social preview: PNG, JPG or GIF, under 1 MB, at least 640 by 320 pixels, 1280 by 640 for best display ([GitHub Docs, fetched 2026-11-27](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview)).
- The REST reference states no length limit for the description, no topic pattern and no topic maximum; the numbers come only from the topics prose page ([REST repos, fetched 2026-11-27](https://docs.github.com/en/rest/repos/repos)).
- The 350-character description limit is repeated by third parties and is not stated by GitHub in any page fetched here; do not cite it as a platform fact.
- Repository search by default searches only name, description and topics ([GitHub Docs, fetched 2026-11-27](https://docs.github.com/en/search-github/searching-on-github/searching-for-repositories)), so a blank description and zero topics remove a repository from the default search surface.
- Fleet, measured 2026-11-27: 3 of 17 repositories have topics (ocx 13, grimoire 20, grimoire-vscode 20); 3 of 17 have no description; 9 of 17 have a homepage; 0 of 17 have a custom social image.
- Upstream, measured 2026-11-27: 40 of 40 have a description, 36 of 40 have 3 or more topics (median 8.5), 35 of 40 have a homepage, 17 of 40 have a custom social image.
- Of the 17 upstream custom images, 17 meet the 640 by 320 minimum, 12 are at least 1280 by 640, 5 are exactly 1280 by 640, and all are under 1,000,000 bytes (largest 976,808).
- Neither organisation has a `.github` repository (HTTP 404 on both), so neither has a public profile README; neither has an organisation description.
- Organisation description is capped at 160 characters in the REST reference ([REST orgs, fetched 2026-11-27](https://docs.github.com/en/rest/orgs/orgs)).
- Org profile README lives at `.github/profile/README.md` in a public `.github` repository; member-only at `.github-private`; six pinned repositories per view, owners only ([GitHub Docs, fetched 2026-11-27](https://docs.github.com/en/organizations/collaborating-with-groups-in-organizations/customizing-your-organizations-profile)).
- Recommendation: description, 3 to 20 valid topics and homepage are MUST for a public fleet repository that is meant to be found; a custom social preview is SHOULD for repositories that are shared as links, not MUST, because 23 of 40 upstream exemplars ship without one.
- One audit sentence is wrong against the platform docs: `usesCustomOpenGraphImage` false does not mean "GitHub's generated card" per the GraphQL reference, which says "the owner's avatar"; observed `openGraphImageUrl` for non-custom repos is an `opengraph.githubassets.com` URL (section 2.4).
- Every fleet figure from the audits that is comparable reproduces; the audit's "of 18" denominators include `michael-herwig/arcana`, which is outside the 17 measured here.

## 2. Findings

### 2.1 Documented limits and mechanics

| Field | Platform statement | Source (fetched 2026-11-27; page undated) |
|---|---|---|
| Topics, count | "Add no more than 20 topics." | [topics page](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics) |
| Topics, length and characters | "Use 50 characters or less"; lowercase letters, numbers, hyphens | same |
| Topics, who | Repository admins, public and private; topic names are always public, even from a private repository | same |
| Topics, suggestions | GitHub generates suggested topics from public repository content; private repositories get none | same |
| Topics, API | `GET /repos/{owner}/{repo}/topics` returns `{names: [...]}`, `per_page` max 100; `PUT` replaces all; empty array clears; "Topic names will be saved as lowercase"; 422 on validation failure; no pattern or maximum stated | [REST repos](https://docs.github.com/en/rest/repos/repos) |
| Description and homepage, API | PATCH `description` "A short description of the repository."; `homepage` "A URL with more information about the repository."; no length stated; topics are not a PATCH parameter | same |
| Social preview | PNG, JPG or GIF; "under 1 MB"; "at least 640 by 320 pixels"; "1280 by 640 pixels for best display"; shareable only from a public repository; PNG transparency supported but check on dark and light backgrounds, solid background if unsure; removal under Settings, Social preview, Remove image | [social preview page](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview) |
| GraphQL | `usesCustomOpenGraphImage` (Boolean!) "Whether this repository has a custom image to use with Open Graph as opposed to being represented by the owner's avatar"; `openGraphImageUrl` (URI!) "The image used to represent this repository in Open Graph data"; `homepageUrl` (URI); `description` (String); `repositoryTopics` connection | [GraphQL repos reference](https://docs.github.com/en/graphql/reference/repos) |
| Search | `topic:X` matches classified repositories; with no `in:` qualifier "only the repository name, description, and topics are searched"; `in:readme` widens it | [searching for repositories](https://docs.github.com/en/search-github/searching-on-github/searching-for-repositories) |
| Topic pages | Users browse `github.com/topics/<topic>`; contributors can suggest or curate topic pages in `github/explore` (CC-BY-4.0) | [finding ways to contribute](https://docs.github.com/en/get-started/exploring-projects-on-github/finding-ways-to-contribute-to-open-source-on-github); [github/explore](https://github.com/github/explore) |
| Repository limits page | States no limit for description, topics or homepage | [repository limits](https://docs.github.com/en/repositories/creating-and-managing-repositories/repository-limits) |

### 2.2 Fleet measurements (17 repositories)

List: the 17 clones in `product-audit/distribution-posture.md` appendix `repos.txt`, with `grimoire-rs/vscode` written as the real GitHub name `grimoire-rs/grimoire-vscode`. Working files: `~/.cache/research-lang/exemplars/product/gh-repo-card/` (`fleet17.txt`, `fleet_core.tsv`, `fleet_og.tsv`).

Commands, run 2026-11-27:

```
while read r; do gh api repos/$r --jq '[.full_name,((.description//"")|length),(.topics|length),((.homepage//"")|length>0),.archived,.fork,.has_discussions,.visibility]|@tsv'; done < fleet17.txt
while read r; do o=${r%%/*}; n=${r##*/}; gh api graphql -f query="{repository(owner:\"$o\",name:\"$n\"){usesCustomOpenGraphImage openGraphImageUrl}}" --jq '.data.repository|[.usesCustomOpenGraphImage,.openGraphImageUrl]|@tsv'; done < fleet17.txt
gh api repos/ocx-sh/ocx/topics --jq '.names[]' | grep -vcE '^[a-z0-9][a-z0-9-]{0,49}$'     # run for the three repos with topics
```

| repo | description chars | topics | homepage set | custom social image |
|---|---|---|---|---|
| ocx-sh/ocx | 187 | 13 | yes | no |
| ocx-sh/ocx-mirror | 65 | 0 | no | no |
| ocx-sh/indexbot | 75 | 0 | yes | no |
| ocx-sh/rules_ocx | 0 | 0 | yes | no |
| ocx-sh/www-setup | 0 | 0 | no | no |
| ocx-sh/catalog | 84 | 0 | no | no |
| ocx-sh/devcontainer-features | 0 | 0 | no | no |
| ocx-sh/index | 73 | 0 | yes | no |
| ocx-sh/e2e-index | 104 | 0 | no | no |
| ocx-sh/conventions | 124 | 0 | no | no |
| ocx-sh/grimoire-lore | 125 | 0 | no | no |
| ocx-sh/website | 96 | 0 | yes | no |
| grimoire-rs/grimoire | 299 | 20 | yes | no |
| grimoire-rs/grim-gui | 71 | 0 | yes | no |
| grimoire-rs/grim-mirror | 118 | 0 | yes | no |
| grimoire-rs/indexer | 111 | 0 | no | no |
| grimoire-rs/grimoire-vscode | 121 | 20 | yes | no |

Totals: description present 14 of 17 (missing: rules_ocx, www-setup, devcontainer-features); topics present 3 of 17, median 0; homepage 9 of 17; custom social image 0 of 17. All 17 are public, none archived. The three topic lists contain 0 names failing `^[a-z0-9][a-z0-9-]{0,49}$` (grep count 0 for each). Two repositories sit at the 20-topic ceiling (grimoire, grimoire-vscode), so a new topic needs a removal. `ocx-sh/ocx` description is 187 characters and `grimoire-rs/grimoire` 299, both far above the upstream maximum of 139 (section 2.3); whether any surface truncates them is not documented, so no truncation claim is made.

### 2.3 Upstream measurements (40 repositories)

List: `~/.cache/research-lang/exemplars/product/exemplar-readmes/repos.txt` (the audit's list, 40 lines).

```
gh api repos/$r --jq '[.full_name,((.description//"")|length),(.topics|length),((.homepage//"")|length>0)]|@tsv'     # up_core.tsv
gh api graphql -f query='{repository(owner:"o",name:"n"){usesCustomOpenGraphImage openGraphImageUrl}}'              # up_og.tsv
curl -sL <openGraphImageUrl> -o og/<repo>; python3 -I dim.py og/*        # header parse for pixel size; bytes = file length; og_dims.tsv
```

| Measure | Result |
|---|---|
| Description present | 40 of 40; length min 19, median 47, max 139 |
| Topics at 3 or more | 36 of 40; at 0: bazelisk, just, mise; jq at 1; median 8.5; none above 20 |
| Homepage set | 35 of 40 |
| Custom social image | 17 of 40 (`usesCustomOpenGraphImage` true) |

Custom images, downloaded 2026-11-27 (format, width x height, bytes):

| repo | fmt | size | bytes |
|---|---|---|---|
| ajeetdsouza/zoxide | gif | 2002x1002 | 62,359 |
| biomejs/biome | png | 1920x1080 | 117,544 |
| caddyserver/caddy | png | 2000x1195 | 725,719 |
| cli/cli | png | 1200x630 | 712,955 |
| derailed/k9s | png | 1280x640 | 161,707 |
| earthly/earthly | png | 2880x1618 | 976,808 |
| eza-community/eza | png | 1181x640 | 377,987 |
| gohugoio/hugo | png | 900x450 | 73,881 |
| junegunn/fzf | png | 4000x2200 | 93,402 |
| NixOS/nix | png | 1280x640 | 39,353 |
| pnpm/pnpm | png | 1200x1200 | 581,527 |
| prefix-dev/pixi | png | 2164x1082 | 447,816 |
| sharkdp/bat | png | 1280x640 | 59,899 |
| starship/starship | png | 1280x640 | 660,539 |
| tauri-apps/tauri | jpg | 1280x640 | 51,852 |
| traefik/traefik | png | 3840x1281 | 406,113 |
| vercel/turborepo | jpg | 1200x628 | 149,996 |

Aggregates (awk over `og_dims.tsv`): 17 of 17 at or above 640x320; 12 of 17 at or above 1280x640; 5 of 17 exactly 1280x640 (k9s, nix, bat, starship, tauri); 8 of 17 within 2.5 percent of a 2:1 ratio; 17 of 17 under 1,000,000 bytes, largest 976,808. Practice therefore ranges from 900x450 to 4000x2200 and from 1:1 to 3:1 aspect; platform docs fix only the minimum and the recommended 1280x640. The `opengraph.githubassets.com` default card for a fleet repository could not be downloaded for measurement (the service returned "Too many requests"); its pixel size is unmeasured here.

### 2.4 Audit and scout figures re-checked

| Figure | Source | Re-measured 2026-11-27 | Verdict |
|---|---|---|---|
| Topics on 3 of 17 clones (ocx 13, grimoire 20, vscode 20) | distribution-posture section 4 | 3 of 17; 13, 20, 20 | reproduces |
| No description: rules_ocx, www-setup, devcontainer-features | distribution-posture | same three | reproduces |
| Upstream topics median 8.5; 36 of 40 at 3 or more | exemplar-readmes | 8.5; 36 | reproduces |
| Upstream custom social image 17 of 40 | exemplar-readmes | 17 of 40 | reproduces |
| Upstream homepage 35 of 40 | exemplar-readmes | 35 of 40 | reproduces |
| Fleet homepage 9 of 18; custom image 0 of 18; topics median 0 | exemplar-readmes | 9 of 17; 0 of 17; median 0 | denominator differs: the audit's 18 includes `michael-herwig/arcana`, not in the 17; numerators match for the 17 |
| `usesCustomOpenGraphImage` false means "GitHub's generated card is used" | exemplar-readmes definitions | GraphQL docs say false means "represented by the owner's avatar"; observed `openGraphImageUrl` is `opengraph.githubassets.com/<hash>/<owner>/<repo>` | contradicted by the platform doc wording; behaviour on unfurl not verified. Do not carry the audit's wording forward |
| No org profile README in either org | distribution-posture | `gh api repos/ocx-sh/.github` and `repos/grimoire-rs/.github` both 404 | reproduces |
| Scout GH#2 limits 20 / 50 / lowercase-hyphen | channel-github-as-channel | same text on the page | reproduces |
| Scout GH#3 social preview 1 MB, 640x320 minimum, 1280x640 | channel-github-as-channel | same | reproduces |
| Scout GH#20 six pins per view, owners only | channel-github-as-channel | same | reproduces |
| Scout GH#21 profile README repo named as user, `README.md` with content | channel-github-as-channel | same, plus: must be public; removed if emptied or made private | reproduces; scout omitted "public" |
| Scout GH#21 six pins mix repos and gists | channel-github-as-channel | "Select up to six repositories and gists, combined" ([pinning page](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/customizing-your-profile/pinning-items-to-your-profile)) | reproduces; that page does not say whether organisations can be pinned |
| Scout GH#1 "Docker Hub caps at 100 characters" | channel-github-as-channel | "maximum of 100 characters" ([Docker Docs](https://docs.docker.com/docker-hub/repos/manage/information/)) | reproduces |
| Scout GH#1 "PyPI wants one line" | channel-github-as-channel | "short, one-line description"; no length stated ([PyPI docs](https://docs.pypi.org/project_metadata/)) | reproduces |
| Scout GH#1 "GitHub documents no length limit" | channel-github-as-channel | none on REST repos, repository-limits or topics pages | reproduces |

### 2.5 Organisation profile

Commands: `gh api orgs/$o --jq '[.login,.description,.blog,.email,.location,.twitter_username,.public_repos]|@tsv'`; `gh api repos/$o/.github`; `gh api orgs/$o/public_members --jq length`, run for `ocx-sh` and `grimoire-rs`.

- ocx-sh: description empty; blog `https://ocx.sh`; email set; location "Germany"; 25 public repositories; no `.github` repository; 0 public members.
- grimoire-rs: description, blog, email, location all empty; 10 public repositories; no `.github` repository; 0 public members.
- Mechanism: public README at `.github/profile/README.md` in a public `.github` repository; member-only README only from a private `.github-private` repository (not for enterprise internal-visibility repositories); up to six pins for the public view and six for the member view; pinning needs organisation owner ([GitHub Docs](https://docs.github.com/en/organizations/collaborating-with-groups-in-organizations/customizing-your-organizations-profile)). The page does not document the org description, website, email or location fields; the REST reference documents `description` as "The maximum size is 160 characters" ([REST orgs](https://docs.github.com/en/rest/orgs/orgs)).
- What the docs do not say: any minimum or maximum for the README content. The "minimum content" below is therefore a judgement derived from the audits, not a platform rule.

## 3. Dated facts

All GitHub Docs pages are undated; the date is the fetch date. "Platform" means GitHub, Docker or PyPI itself.

| Fact | URL | Source date | Source type |
|---|---|---|---|
| 20 topics maximum; 50 characters; lowercase letters, numbers, hyphens | https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics | undated, fetched 2026-11-27 | platform |
| Social preview: PNG/JPG/GIF, under 1 MB, min 640x320, 1280x640 best | https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview | undated, fetched 2026-11-27 | platform |
| REST: PUT topics replaces all, lowercases, 422 on failure; PATCH description and homepage have no stated limits | https://docs.github.com/en/rest/repos/repos | undated, fetched 2026-11-27 | platform |
| GraphQL `usesCustomOpenGraphImage`, `openGraphImageUrl`, `homepageUrl`, `description`, `repositoryTopics` | https://docs.github.com/en/graphql/reference/repos | undated, fetched 2026-11-27 | platform |
| Default repository search covers name, description, topics | https://docs.github.com/en/search-github/searching-on-github/searching-for-repositories | undated, fetched 2026-11-27 | platform |
| Org description max 160 characters | https://docs.github.com/en/rest/orgs/orgs | undated, fetched 2026-11-27 | platform |
| Org profile README at `.github/profile/README.md`; six pins per view; owners pin | https://docs.github.com/en/organizations/collaborating-with-groups-in-organizations/customizing-your-organizations-profile | undated, fetched 2026-11-27 | platform |
| Profile README: public repo named as username, root `README.md`, any content; pre-July-2020 repos need Share to profile | https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/customizing-your-profile/managing-your-profile-readme | undated, fetched 2026-11-27 | platform |
| Personal pins: six, repositories and gists combined | https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/customizing-your-profile/pinning-items-to-your-profile | undated, fetched 2026-11-27 | platform |
| Docker Hub short description 100 characters; 3 categories | https://docs.docker.com/docker-hub/repos/manage/information/ | undated, fetched 2026-11-27 | platform |
| PyPI summary is one line, no length stated | https://docs.pypi.org/project_metadata/ | undated, fetched 2026-11-27 | platform |
| Repository limits page lists no description, topic or homepage limit | https://docs.github.com/en/repositories/creating-and-managing-repositories/repository-limits | undated, fetched 2026-11-27 | platform |
| Fleet and upstream card measurements in section 2 | commands in section 2 | measured 2026-11-27 | own measurement |
| Description max 350 characters | https://slategit.com/blog/github-repo-description-character-limit-what-fits | claims "as of 2026", fetched only as a search snippet | third party, not verified, not a platform source |

## 4. Normative guidance candidates

Placeholders: `R` is `owner/repo`; `O` is the organisation login. All commands are read-only.

1. MUST: every public repository has a non-empty description. Rationale: default repository search reads name, description and topics, and 40 of 40 upstream exemplars have one. Verify: `gh api repos/R --jq '(.description//"")|length'` prints 1 or more. Pass: at least 1. Fail example: `0` (rules_ocx, www-setup, devcontainer-features).
2. SHOULD: keep the description to 140 characters or fewer. Rationale: the upstream maximum is 139 and median 47 (own measurement 2026-11-27); GitHub states no limit, so this is an observed norm, not a platform limit. Verify: same command; pass at 140 or fewer. Fail example: grimoire at 299.
3. MUST NOT: assert a 350-character limit or any description limit as platform fact in a rule or skill output without re-fetching a GitHub page that states it. Rationale: no GitHub page fetched states it. Verify: grep the rule text for `350`; any hit needs a citation to a GitHub URL.
4. MUST: every public repository has at least 3 topics and at most 20. Rationale: topics are searched by default and drive `github.com/topics` pages; 36 of 40 upstream have 3 or more (the 3 threshold is an observed norm, the 20 ceiling is the platform limit). Verify: `gh api repos/R/topics --jq '.names|length'` prints 3 to 20. Fail: 0 (14 of 17 fleet repositories).
5. MUST: every topic matches the documented shape. Rationale: topics are lowercase letters, numbers and hyphens, 50 characters or fewer; the leading-character rule is not documented, so the regex is stricter than the docs. Verify: `gh api repos/R/topics --jq '.names[]' | grep -vcE '^[a-z0-9][a-z0-9-]{0,49}$'` prints 0.
6. SHOULD: include the category topics a visitor would browse (for example `cli`, the implementation language, the registry or protocol). Rationale: topic pages are browsed by topic name. Verify: reading heuristic, pass when at least one topic names the product category and one names the language or protocol; fail example: only the product's own name.
7. MUST: set the homepage URL to the product site or docs when one exists. Rationale: 35 of 40 upstream set it; it is the only link field on the card. Verify: `gh api repos/R --jq '(.homepage//"")|length>0'` prints `true`. Fail: ocx-mirror, www-setup, catalog, devcontainer-features, e2e-index, conventions, grimoire-lore, indexer (no site stated; ask, section 5).
8. SHOULD: set a custom social preview on every public repository that is linked from a post, a README badge, a package registry page or an announcement. Rationale: 17 of 40 upstream have one, and a custom image is the only control over the unfurl; severity is SHOULD because the platform falls back to a generated image and 23 of 40 exemplars ship without one. Verify: `gh api graphql -f query='{repository(owner:"o",name:"n"){usesCustomOpenGraphImage}}' --jq .data.repository.usesCustomOpenGraphImage` prints `true`. It is a boolean and does not check image quality.
9. SHOULD: raise item 8 to MUST for the flagship repository of each organisation (ocx, grimoire) once any channel post links to it. Rationale: that is where the card is seen first. Verify: as item 8. This promotion is a project policy choice (section 5).
10. MUST: the social image is PNG, JPG or GIF, under 1 MB (stay under 1,000,000 bytes to avoid the MB/MiB ambiguity), at least 640x320; SHOULD be 1280x640. Rationale: platform spec; 12 of 17 upstream images are at or above 1280x640. Verify: `curl -sL "$(gh api graphql -f query='{repository(owner:"o",name:"n"){openGraphImageUrl}}' --jq .data.repository.openGraphImageUrl)" -o og.img; wc -c < og.img` prints under 1000000, and read the width and height from the header (`python3 -I -c` struct parse, or `file og.img` where available) and compare to 640x320 and 1280x640.
11. SHOULD: keep the subject inside the central area and use a solid background or check both themes. Rationale: the platform says check transparency on dark and light backgrounds and use a solid background if unsure; a safe-area margin is not documented, so this part is a reading heuristic. Verify: view the image on a light and a dark background; pass when the product name stays legible on both.
12. MUST: do not use the social image to carry text that is not also in the README or description. Rationale: unfurls may not render the image and image text is not searchable. Verify: reading heuristic; pass when every claim in the image appears in the description or README title.
13. MUST: each organisation has a public `.github` repository with `profile/README.md`. Rationale: it is the org's front door; both fleet orgs return 404 today. Verify: `gh api repos/O/.github/contents/profile/README.md --jq .size` prints a number above 0 (a 404 fails).
14. MUST: organisation description is set and 160 characters or fewer. Rationale: REST states the 160 maximum; both orgs are empty. Verify: `gh api orgs/O --jq '(.description//"")|length'` prints 1 to 160.
15. SHOULD: organisation website is set. Rationale: the card has a single link field; ocx-sh has it, grimoire-rs does not. Verify: `gh api orgs/O --jq '(.blog//"")|length>0'` prints `true`.
16. SHOULD: pin six repositories on the public org view, ordered flagship first. Rationale: six is the platform maximum and pinning needs an owner. Verify: pins are GraphQL-visible only: `gh api graphql -f query='{organization(login:"O"){pinnedItems(first:7){totalCount}}}' --jq .data.organization.pinnedItems.totalCount` prints 1 to 6; the `pinnedItems` field was not fetched in this dive, so confirm it against the GraphQL reference before shipping this step.
17. MUST: the org profile README, at minimum, (a) says in one sentence what the organisation builds, (b) lists the repositories by role with one link each, starting with the install path, (c) links the docs site, and (d) names where to ask for help (Discussions, Discord or issues). Rationale: judgement from the audits (14 of 17 repositories unlabelled, no org README); no platform rule. It places the channels; which channels exist is owned elsewhere. Verify: reading heuristic. Pass: a first-time visitor can name the flagship product and the install link from the README alone; fail: a heading with no text, or a repository list without roles.
18. MUST: write every card field through read-then-write, never blind PUT, because `PUT topics` replaces the whole set. Rationale: documented replace semantics ("Pass one or more topics to replace the set of existing topics"). Verify: a skill step prints `gh api repos/R/topics` before and after; pass when every pre-existing name is in the after set or the owner approved its removal.
19. SHOULD: in the audit step, report description, topics, homepage and social-image status as four columns per repository, with the command next to each number and the measurement date. Rationale: audits rot quickly (stars and topics change). Verify: each reported figure has a command line and a date.

Skill step, exact assertions and pass conditions (one repository `R`, one org `O`):

```
gh api repos/R --jq '{d:((.description//"")|length),t:(.topics|length),h:((.homepage//"")|length>0),v:.visibility}'
# pass: d>=1, 3<=t<=20, h==true, and v=="public" (private repositories: skip the social image)
gh api repos/R/topics --jq '.names[]' | grep -vcE '^[a-z0-9][a-z0-9-]{0,49}$'     # pass: 0
gh api graphql -f query='{repository(owner:"o",name:"n"){usesCustomOpenGraphImage}}' --jq .data.repository.usesCustomOpenGraphImage   # pass: true (SHOULD)
gh api orgs/O --jq '{d:((.description//"")|length),w:((.blog//"")|length>0)}'   # pass: 1<=d<=160, w==true
gh api repos/O/.github/contents/profile/README.md --jq .size                      # pass: a number >0; HTTP 404 fails
```

## 5. What an agent must not decide alone

- The description wording, the product category topics and the homepage target: they are positioning decisions (marketing territory) and, for repositories with no site (ocx-mirror, indexer, grim-mirror, conventions, e2e-index, catalog), whether a docs page counts as "the product site". Ask.
- The social image artwork, brand colours and logo use. The agent may check size and format; it must not generate or upload brand imagery without approval.
- Whether to make a repository public-facing at all (internal tooling such as e2e-index and grimoire-lore may not want a card). Ask before applying MUST rules to it.
- The organisation description, the pinned set, and what the org README claims about the products. These are public statements by the owner.
- Any write that changes live repository settings (`gh repo edit`, `PUT topics`, PATCH org). Present the planned diff and wait.
- Adding topics that name third-party products or trademarks (for example `claude`, `cursor`, `copilot` on grimoire today) is a brand and legal-adjacent call; keep existing ones, ask before adding new ones.
- Whether a one-off flagship promotion (item 9) applies.

## 6. AI-agent angle

| Typical mistake | Smallest mechanical check |
|---|---|
| States "GitHub allows 350 characters in the description" as fact | grep rule or output for `350`; require a GitHub URL beside it |
| Writes topics with capitals, spaces or underscores (`Package Manager`, `developer_tools`) and expects them accepted | the item 5 grep, plus read-back from `gh api repos/R/topics` after any write |
| Calls `PUT topics` with only the new names, wiping the existing ones | item 18 before and after listing |
| Tries to set topics through `PATCH /repos/{owner}/{repo}` | the REST page says topics are not a PATCH parameter; grep for `topics` in a PATCH payload |
| Reports "social preview set" from the existence of `og:image` in a site or README | require the GraphQL boolean; a website tag is a different surface |
| Trusts `usesCustomOpenGraphImage` as an image-quality check | require the size and byte check of item 10 as a separate step |
| Assumes the profile README repository for an organisation is `<org>/<org>` | the org README is `.github/profile/README.md`; the user profile README is `<user>/<user>`; check path before writing |
| Applies the 1280x640 figure as a hard requirement | the platform minimum is 640x320; 1280x640 is "best display" |
| Counts a clone's 20 topics as sufficient with no category topic | item 6 heuristic |
| Reuses the audit's denominator 18 for the 17-repository fleet | rerun the count from `fleet17.txt` and state the list |

## 7. Contested / evolving

- Description limit. Third parties give 350 characters ([SlateGit, "as of 2026"](https://slategit.com/blog/github-repo-description-character-limit-what-fits), seen in a search snippet only, not fetched) while GitHub's REST and repository-limits pages state none. Treat as unverified; a live write test would settle it but was out of scope (no state changes).
- Non-custom social image. The GraphQL reference says the fallback is "the owner's avatar"; the audit says GitHub's generated card; observed `openGraphImageUrl` points at `opengraph.githubassets.com`. The reference text may be stale or the unfurl may differ by consumer. Unresolved here.
- Image size practice. Platform recommends 1280x640; upstream practice spans 900x450 to 4000x2200 and includes a 1200x1200 square (pnpm) and 1200x628 (cli/cli, turborepo). No source says which crop each unfurl consumer applies; the recommendation to follow the documented 1280x640 stays, with the caveat that 5 of 17 do exactly that.
- Value of topics. The docs say topics classify and are searchable; no study fetched here measures their effect on stars or discovery. The 3-topic threshold is therefore an observed norm among exemplars; exemplar selection is not a random sample (the 81-repository `topic:cli` search in the audit shows 80 of 81 at 3 or more, which supports popular repositories being tagged but not that tagging causes popularity).
- Topic validation details (leading hyphen, reserved words) are undocumented; the API returns 422 for validation failure and "the endpoint has been spammed", with no detail on thresholds.

## 8. Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics | GitHub Docs, topics (primary) | undated, fetched 2026-11-27 | the 20 / 50 / charset limits |
| https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview | GitHub Docs, social preview (primary) | undated, fetched 2026-11-27 | format, size, dimensions |
| https://docs.github.com/en/rest/repos/repos | GitHub REST reference, repos (primary) | undated, fetched 2026-11-27 | PATCH fields and topics endpoints; states no limits |
| https://docs.github.com/en/graphql/reference/repos | GitHub GraphQL reference (primary) | undated, fetched 2026-11-27 | `usesCustomOpenGraphImage`, `openGraphImageUrl` definitions |
| https://docs.github.com/en/rest/orgs/orgs | GitHub REST reference, orgs (primary) | undated, fetched 2026-11-27 | 160-character org description |
| https://docs.github.com/en/organizations/collaborating-with-groups-in-organizations/customizing-your-organizations-profile | GitHub Docs, org profile (primary) | undated, fetched 2026-11-27 | `.github/profile/README.md`, pins |
| https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/customizing-your-profile/managing-your-profile-readme | GitHub Docs, personal profile README (primary) | undated, fetched 2026-11-27 | requirements and removal conditions |
| https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/customizing-your-profile/pinning-items-to-your-profile | GitHub Docs, pins (primary) | undated, fetched 2026-11-27 | six combined repositories and gists |
| https://docs.github.com/en/search-github/searching-on-github/searching-for-repositories | GitHub Docs, repository search (primary) | undated, fetched 2026-11-27 | default fields searched |
| https://docs.github.com/en/repositories/creating-and-managing-repositories/repository-limits | GitHub Docs, repository limits (primary) | undated, fetched 2026-11-27 | confirms no card-field limits are listed |
| https://docs.github.com/en/get-started/exploring-projects-on-github/finding-ways-to-contribute-to-open-source-on-github | GitHub Docs, exploring (primary) | undated, fetched 2026-11-27 | `github.com/topics/<topic>` browsing |
| https://github.com/github/explore | GitHub's topic-page repository (primary) | fetched 2026-11-27 | how topic pages are curated (contributing guide not read) |
| https://docs.docker.com/docker-hub/repos/manage/information/ | Docker Docs (primary for Docker Hub) | undated, fetched 2026-11-27 | 100-character short description |
| https://docs.pypi.org/project_metadata/ | PyPI docs (primary for PyPI) | undated, fetched 2026-11-27 | one-line summary |
| https://slategit.com/blog/github-repo-description-character-limit-what-fits | third-party blog, snippet only | claims 2026 | the unverified 350-character claim |
| `~/.cache/research-lang/exemplars/product/gh-repo-card/` | own measurements: `fleet_core.tsv`, `fleet_og.tsv`, `up_core.tsv`, `up_og.tsv`, `og_dims.tsv`, `og/` | 2026-11-27 | raw results behind section 2 |
