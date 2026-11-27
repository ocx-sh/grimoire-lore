---
title: Launch venue gates and link-target check
program: product
sub_program: channels
topic: channel-launch
worker: launch-venue-gates
date_researched: 2026-11-27
model: sonnet
sources_fetched: 35
scope: Per-venue entry gates for Product Hunt, BetaList, Uneed, DevHunt, selfh.st, awesome lists, Show HN and Lobsters; the link-target check and its measurement on the fleet's two landing pages; venue fit for a free OSS CLI; human-only actions. Out of scope - install path itself (installer-script), Reddit per-subreddit rules (not fetched), lifetime-deal and newsletter sponsorship rows (LP#23-26), press kits.
---

# Launch venue gates and link-target check

## Contents
1. Summary
2. Findings (2.1 Product Hunt, 2.2 BetaList, 2.3 Uneed and DevHunt, 2.4 selfh.st, 2.5 awesome lists, 2.6 HN and Lobsters, 2.7 link-target measurement, 2.8 launch shape and order, 2.9 scout figures that failed to reproduce)
3. Normative guidance candidates
4. Dated facts
5. What an agent must not decide alone
6. AI-agent angle
7. Contested / evolving
8. Sources

## Summary
- Product Hunt help pages carry no absolute date; every fetch on 2026-11-27 showed only "Updated over 3 weeks ago". Treat all PH facts as "as fetched 2026-11-27", and re-fetch before each launch.
- PH eligibility is "a product, not content about one", and a closed beta nobody can join "usually isn't a good fit". A free OSS CLI qualifies only if a stranger can install and run it today.
- PH launches need a personal account (company and brand accounts cannot submit or comment) and a verified email. Go-live is 12:01 AM Pacific; scheduling window is tomorrow to 30 days ahead.
- PH support wording: "Never ask for upvotes." Ask for trials and feedback. Contests that require or reward an upvote are banned; fake accounts and bought engagement can remove the launch and ban the account.
- PH relaunch inside two months needs a request. Minor fixes, small UI changes and pricing changes do not count. Changing the URL to dodge the window gets the launch removed.
- BetaList is paid only ("All submissions are paid"), requires its own domain, rejects free subdomains and app-store links, and bars blogs, courses, newsletters, agencies. A free OSS CLI with a GitHub-signed access path fits only if the team will pay.
- Uneed: free launch needs an upvote score of 10 to stay published and 20 to keep the dofollow link (DevHunt's own guide, vendor data about a competitor). Upvote-gated free tiers make vote solicitation tempting; keep that out of agent output.
- DevHunt takes developer tools (OSS, CLIs, APIs, SDKs, MCP servers). Free listing is a permanent page with a nofollow link; a launch is $49; super boosts are $99/$149/$199. Vendor-stated.
- sindresorhus/awesome accepts lists, not tools. A tool goes into topic lists by pull request under each list's own contributing file. Fully AI-generated PRs are barred.
- Show HN gate: a stranger can try it now, "ideally without barriers such as signups or emails". Sign-up pages and routine release announcements are off-topic.
- HN bans solicited upvotes, automated posting and generated text in posts. Lobsters is invite-only and caps self-promotion near a quarter of activity.
- Link-target measurement: ocx.sh landing returns 200, no form, install command visible. grimoire.rs landing returns 200, no form, but no install command on the landing; it is one click away at /installation.html.
- Two scout figures failed to reproduce: BetaList pitch 75 / description 700 character limits, and PH "dedicated page with one call to action". Neither appears on the fetched pages.
- Venue order the record supports for a small OSS CLI team: own landing and README pass first, then one Show HN, then free directory listings, with PH optional. The measurable record is thin (one preprint, one blog scrape, vendor guides); see Contested.

## Findings

### 2.1 Product Hunt (help center, Launch Guide collection)
Every article fetched 2026-11-27 shows author Juan Francisco Secchi and the relative stamp "Updated over 3 weeks ago". No absolute date exists. `curl` against the same URLs returns HTTP 403, so the pages were read through WebFetch only.

| Gate | Rule as fetched | Source |
|---|---|---|
| Eligibility | "It's a product, not content about one." Blog posts, lists, plain documents do not belong. Must be live or soon live with a set date. "A closed beta that nobody can join usually isn't a good fit." Explainable in one sentence. Test as a first-time user in a clean browser; "make sure the main flow works in production." | [17734341](https://help.producthunt.com/en/articles/17734341-2-what-kind-of-products-get-featured) |
| Account | Personal account only; company and brand accounts cannot submit launches or comment; verified email required; fill profile (name, headline, website, social links). Anyone can hunt their own product. | [17734306](https://help.producthunt.com/en/articles/17734306-1-how-product-hunt-works), [17734646](https://help.producthunt.com/en/articles/17734646-8-launch-faq-and-myths) |
| Makers | "A maker is anyone who helped build the product." The pages do not say co-makers need separate accounts; scout row 2 claimed it. Not reproduced. | 17734306 |
| Go-live | 12:01 AM Pacific Time on the scheduled day, runs to midnight Pacific. Schedule from tomorrow up to 30 days ahead. | [17734355](https://help.producthunt.com/en/articles/17734355-3-set-your-goals-and-pick-your-launch-date) |
| Weekday vs weekend | "Weekdays usually bring more traffic and more competition." "Weekends are quieter on both fronts, which can suit smaller teams and side projects." No guarantee either way. | 17734355 |
| Goal | Pick one or two measurable goals; the example is "200 signups from Product Hunt." | 17734355 |
| Support wording | "Never ask for upvotes." Ask for feedback and sharing. Giveaways are fine; any contest that requires or rewards an upvote is prohibited. One real person per account. Buying upvotes or comments is prohibited; violations can remove the launch and buying can ban the account. | [17734384](https://help.producthunt.com/en/articles/17734384-5-how-to-promote-your-launch-and-what-to-avoid) |
| Where links go | "Communities you've never posted in before are not the place to drop a link." Share where you are already active. Linking straight to the product is encouraged. | 17734384, 17734646 |
| Comment duty | Answer "every comment" you can, near real time; split coverage so someone is online overnight; keep replying after launch day. | [17734397](https://help.producthunt.com/en/articles/17734397-6-what-to-do-during-and-after-your-launch) |
| Relaunch | Over two months since last launch: normal submit, added to the same Product Page. Under two months: relaunch request. Major = major feature set, new platform, significant redesign or new version, pivot. Minor fixes, small UI changes, pricing do not qualify. "Don't change your URL to get around the two-month window." | [17734411](https://help.producthunt.com/en/articles/17734411-7-relaunch-your-product) |
| Ranking | Upvotes from established active members count more; a famous hunter does not help; ranking uses upvotes, comments and time since launch. | 17734646 |

Link-target gate on PH: no article states a requirement for the linked page beyond "main flow works in production" for a first-time user. Scout row 32 said PH suggests "a dedicated page with one call to action"; that sentence is not on 17734355 or 17734341.

### 2.2 BetaList
- [Submission criteria](https://betalist.com/criteria), fetched 2026-11-27, no date. Eligible: technology products (software, dev tools, AI tools, hardware); most readers should not have seen it. Not eligible: blogs, courses, books, newsletters, subscription e-commerce, consultancies, agencies. Up to two features per product (pre-launch and launch), "at least a few weeks" apart.
- Landing page gate: distinct, explains what/who/look. Pitfalls named: untouched templates, default Bootstrap, video-only page, hosted builders (LaunchRock, Unbounce, KickoffLabs, Carrd), free subdomains (`vercel.app`, `netlify.app`, `herokuapp.com`), direct App Store, Google Play, Kickstarter, Indiegogo or Facebook links.
- Access gate: "Visitors must be able to sign up or get access" and the path easy to find. Accepted: email form, embedded Mailchimp/ConvertKit form, download button or app-store link, sign-in with Google, Apple or GitHub. Not accepted alone: "follow us on X".
- [FAQ](https://betalist.com/faq): "All submissions are paid. There is no free submission option." Prices appear only at the end of the form. "Your startup must have its own domain." Not selected means automatic full refund (5-10 business days to show). No individual feedback on rejections. Featured once, except a pre-launch feature allows a second at launch.
- [Agent API page](https://betalist.com/agent): an agent may create and edit an unclaimed submission, but "The agent never pays and cannot publish." Claim expires 7 days after creation; a website featured in the last 12 months is refused as a duplicate (`duplicate_website`, 409); plan timelines Lite ~14 days, Standard ~3 days, Premium ~1 day; limits POST 10/hour per IP, PATCH 60/hour, GET 120/hour. The sample `expires_at` of 2026-10-28 is illustrative.
- [Writing guide](https://betalist.com/help/submitting) (also served as `.md`): pitch is "a single, plain sentence", name only, no emoji or unusual unicode; description is "one or two short paragraphs of plain prose", no Markdown or HTML, no emoji; topics up to five; gallery about 4:3 (800x600); website URL is the home page on the own domain. The page gives no numeric character limit. A raw-markup grep returned one `maxlength="100"` unrelated to the form (search box markup).
- Form-limit measurement: `curl -sL -A 'Mozilla/5.0' https://betalist.com/submit -o f.html` returns HTTP 200 (31,444 bytes) but the form is behind account creation ("We email you a code to log in"). `grep -oiE 'maxlength="?[0-9]+'` on that file found none. Limits therefore cannot be measured from public markup. Same result for `https://uneed.best/submit-a-tool` (HTTP 200, 156,288 bytes, no `maxlength`), `https://devhunt.org/submit` (HTTP 200, 80,174 bytes; submit link goes to `/login?next=submit`), `https://selfh.st/submit/` (HTTP 200, 53,738 bytes, only a newsletter form).

### 2.3 Uneed and DevHunt
- [Uneed submit page](https://uneed.best/submit-a-tool), 2026-11-27: needs product name and URL; "No account needed to start"; a free waiting line plus paid "Fast-track" and "Skip the waiting line"; votes are weighted by a voter multiplier; a "77 DR backlink" is advertised. Thresholds are not on the page. `https://uneed.best/faq` returns 404.
- DevHunt's [launch-platforms guide](https://devhunt.org/launch-platforms) (vendor data; it lists DevHunt itself first; says every entry was checked on 2026-11-24) states: Uneed free launches need a score of 10 to stay published and 20 to keep the dofollow link; DevHunt free launches "wait in a very long queue"; Lobsters is invite-only; free wait times range from about 48 hours to about 180 days; 97 venues listed, 71 with a free option, 27 gave a dofollow link when checked.
- DevHunt [FAQ](https://devhunt.org/faq) (vendor, undated): developer tools only (OSS, APIs, SDKs, frameworks, IDEs, CLIs, testing, DevOps, databases, auth, AI agents and MCP servers); non-developer, NSFW and fake-engagement services refused. Free listing: permanent page, nofollow link. Launch $49 once (dofollow link, newsletter spot, boost). Super boost spots before launch week: $199 (#1), $149 (#2), $99 (#3), three per week. Launches run a whole week; sign-in with GitHub or Google to vote or comment; winners announced at week end; newsletter every Tuesday. No rule on asking for votes is stated.

### 2.4 selfh.st
`https://selfh.st/submit/` (HTTP 200, 2026-11-27) states no criteria: heading "Submit Content", tagline "Self-hosted news, content, updates, launches, events, and more", and a newsletter subscribe box. [The apps directory](https://selfh.st/apps/) offers filters for Open Source Only, Licenses, Languages, Stars and "Alternative To", and links to the submit page. How apps are admitted is undocumented. Decision: no automated gate checklist is possible beyond "self-hostable, open source licence, README"; mark as UNVERIFIED and human-decided. A CLI that is not a self-hosted service is a weak fit.

### 2.4b Other self-hosted and OSS directories (repair pass, 2026-11-27)
Commands: `curl -sL -A 'Mozilla/5.0' -o /dev/null -w '%{http_code}\n' <url>` for each URL, then a read of the saved file under `~/.cache/research-lang/exemplars/product/dirs/`.
- [awesome-selfhosted CONTRIBUTING.md](https://raw.githubusercontent.com/awesome-selfhosted/awesome-selfhosted-data/master/CONTRIBUTING.md) (HTTP 200, 12,096 bytes; file states no date; authority itself). Gates: first release more than four months old, actively maintained, working installation instructions, not already listed. "Machine/LLM-generated contributions are not allowed and will result in a ban." A hidden comment addressed to AI agents forbids opening a PR or issue, writing entry text a person submits as their own, or ticking the "done by a human, not a machine/LLM" box; agents may explain the rules, answer schema questions and check the objective requirements. Description style: short form, no "open-source", "free" or "self-hosted", add the language for a single static binary, and `(alternative to X)` at the end. Does not qualify: libraries and SDKs, PaaS, and "a desktop, mobile, or command-line application, which relies on a separate file synchronisation/server program". A standalone CLI is not a self-hosted service, so this list is a weak fit for ocx and grim; the hard rule for agents is no PR and no entry text.
- [opensourcealternative.to/submit](https://opensourcealternative.to/submit) (HTTP 200, 25,961 bytes, 2026-11-27; vendor page). Form fields: email, website, name, repository, proprietary tool being replaced. Free path is a "waitlist (6+ months)"; "48 hour review" costs +$29. Criteria: open source, an alternative to proprietary software, actively maintained, self-hosted. `grep -oiE 'maxlength="?[0-9]+'` on the page returns nothing, so no field limit is measurable. A CLI that replaces no proprietary product does not fit.
- Not fetched: [Terminal Trove](https://terminaltrove.com/submit/) returned HTTP 403 to curl and to WebFetch, so its CLI-tool listing rules are unverified (it is the only CLI-specific directory the scouts named; an owner check is needed). [Console.dev](https://console.dev/) returned HTTP 200 but no submission rules were found in its text; its `/tools-submit/` path is 404. Treat both as UNVERIFIED, human-decided.
- Ruled out for the checklist: alternative-to catalogues (AlternativeTo, OSS Alternative) need a named proprietary product; a CLI with none fails their scope.

### 2.5 Awesome lists
- [sindresorhus/awesome pull_request_template.md](https://raw.githubusercontent.com/sindresorhus/awesome/main/pull_request_template.md) is for adding a list. Gates: list at least 30 days old (from first real commit or open-sourcing, whichever is more recent); not AI-generated; "Fully AI-generated pull requests are not accepted"; review at least 4 other open PRs; run `awesome-lint`; default branch `main`; `contributing.md`; CC0 or other Creative Commons licence ("A code license like MIT ... is not acceptable"); Awesome badge; no CI badge; repo name `awesome-<name>`; PR title `Add Name of List`; entry description starts uppercase, ends with a dot, objective, no marketing blurb.
- [create-list.md](https://raw.githubusercontent.com/sindresorhus/awesome/main/create-list.md): covers lists, not tools; gives no item-level instructions.
- [contributing.md](https://raw.githubusercontent.com/sindresorhus/awesome/main/contributing.md): adding something to a list means a PR against that list under its own guidelines.
- [awesome-lint](https://github.com/sindresorhus/awesome-lint) rules directory (GitHub API, 2026-11-27): `badge`, `balanced-punctuation`, `code-of-conduct`, `contributing`, `double-link`, `git-repo-age`, `github`, `heading`, `license`, `list-item`, `no-ci-badge`, `no-repeat-item-in-description`, `spell-check`, `toc`. [git-repo-age.js](https://raw.githubusercontent.com/sindresorhus/awesome-lint/main/rules/git-repo-age.js) sets `minimumRepositoryAgeDays = 30`. Run: `npx awesome-lint <repo-url>`.
- Consequence for a CLI team: the item-level entry is a one-line PR into a topic list (a Rust CLI list, a package-manager list). Fetch that list's `contributing.md` and README first; the sindresorhus rules above do not apply to items.

### 2.6 Hacker News and Lobsters
Show HN rules come from com-hn-contract; re-fetched here.
- [Show HN guidelines](https://news.ycombinator.com/showhn.html) (no date on page): "something you've made that other people can play with"; "ideally without barriers such as signups or emails"; sign-up pages, blog posts, newsletters off-topic; "Foo 1.3.1 is out" is not substantive, a major overhaul is probably acceptable; title begins "Show HN"; builder must be around to discuss; "Please don't ask friends to upvote or comment."
- [Launch HN advice](https://news.ycombinator.com/yli.html): "Remove signup barriers, at least for launch day"; email waitlist usually too early; show pricing; no marketing-style text; no booster comments; Launch HN is for YC startups, title `Launch HN: <company> (YC S24) - <tagline>` at 80 characters or fewer.
- [Guidelines](https://news.ycombinator.com/newsguidelines.html): "Don't solicit upvotes, comments, or submissions." "Please don't automate posting." "Please don't put generated text in HN posts." Submit the original source.
- [Lobsters about](https://lobste.rs/about): invite-only; self-promotion under about a quarter of stories and comments over the past year ("rule of thumb"); new users (first 70 days) cannot submit self-promo or links to unseen domains; new users cannot use the `show` tag.

### 2.7 Link-target measurement (fleet landing pages)
Commands run 2026-11-27 from `~/.cache/research-lang/exemplars/product/`:
```
curl -sL -A 'Mozilla/5.0' -o lp_grimoire.html -w '%{http_code}' https://grimoire.rs/
curl -sL -A 'Mozilla/5.0' --resolve ocx.sh:443:37.27.135.61 -o lp_ocx.html -w '%{http_code}' https://ocx.sh/
python3 -I lpcheck.py   # counts <form, type=email|password, wall words, install-command regex
```
Caveat: this machine's `/etc/hosts` pins `ocx.sh` to 65.108.2.88, which serves a `bazel-cache.ocx.sh` certificate and HTTP 401. A plain `curl https://ocx.sh/` here fails (`curl: (60)` certificate mismatch). Public resolvers 1.1.1.1 and 8.8.8.8 return 37.27.135.61 and 195.181.166.158; both gave HTTP 200 with 68,924 bytes using `--resolve`. The pass below is for the public site, not for this host's resolver.

| Check | ocx.sh | grimoire.rs |
|---|---|---|
| HTTP status, final URL | 200, https://ocx.sh/ | 200, https://grimoire.rs/ |
| `<form` elements | 0 | 0 |
| `type=email` or `type=password` inputs | 0 | 0 |
| Wall words (sign up, subscribe, waitlist, request access, early access) | none (only the word `login`, no form) | none |
| Install command on the page | yes: `curl -fsSL https://setup.ocx.sh/sh \| sh`, `irm https://setup.ocx.sh/pwsh \| iex` | no command on the landing page; links `/installation.html`, `/quickstart.html`, `/start.html` |
| Install command one click away | n/a | yes: `/installation.html` (HTTP 200, 0 forms) shows `curl --proto '=https' --tlsv1.2 -LsSf https://setup.grimoire.rs/s...`, `cargo install --git ...`, `irm https://setup.grimoire.rs/ps1 \| iex` |
| `https://setup.ocx.sh/sh` | HTTP 200 | not measured |

Reading: both targets pass the no-signup test. grimoire.rs fails the strict "install command visible on the landing page" form of the check by one click. The Show HN and Launch HN sources ask for no barriers; none of the fetched venue pages names "install command visible" as a rule, so that part is this report's decision, not a venue rule.

### 2.8 Launch shape and venue order: what the record supports
- One independent preprint: [Launch-Day Diffusion](https://arxiv.org/html/2511.04453v1) (submitted 2025-11-06): 138 HN to GitHub pairs, all AI/LLM tools 2024-2025; mean gains about 121 stars at 24 h, 189 at 48 h, 289 at one week (medians "much lower"); Show HN versus non-Show difference not significant (p = 0.39); observational, no causal claim.
- One blog scrape: [Show HN by the Numbers](https://danfking.github.io/blog/2026/04/23/show-hn-by-the-numbers/) (2026-04-23): 188,085 Show HN posts; median score 2, 90th percentile 24, 99th percentile 263; HN score vs 48 h stars r = 0.29 over the top 500 GitHub-linked posts; median about 1.4 stars per point; star impact has a half-life of about 24 hours; no analysis of titles, landing pages or signup walls. Single author, not peer reviewed.
- One 2020 postmortem on PH ([Versoly](https://versoly.com/blog/lessons-learned-3-successful-product-hunt-launches), 2020-02-20): about 3,000 visitors, 60 email demo sign-ups, 0 paying customers for a paid product; a free tool got 10,000 visitors in launch week. One team, n=1.
- Implication: no source measures the launch shape (single day versus launch week versus sequential venues) for a small developer tool. What can be said is gate-driven: do the cheap gates once, launch once on the venue that matches the audience, stay in the thread, and do not stack launch-day links into communities where the team has no history (PH 17734384, Lobsters).

### 2.9 Scout figures that failed to reproduce
| Scout claim | Result |
|---|---|
| BetaList counts pitch at 75 and description at 700 characters (LP#39) | Not on /criteria, /faq, /help/submitting or /help/submitting.md; submit form is login-gated. Does not reproduce. Not a rule in the checklist below. |
| BetaList "features about 20 a day" (LP#19) | /faq says features-per-day is not covered. Does not reproduce. |
| PH suggests a dedicated page with one call to action (LP#32) | Not on 17734355 or 17734341. Does not reproduce; the PH advice is "test as a first-time user". |
| PH co-makers need their own accounts (LP#2) | Not in 17734306. Only "personal account" and "anyone who helped build" reproduce. |
| selfh.st "criteria" (LP#22) | Page states none, as the scout said. Reproduces as "no criteria". |
| Uneed multiplier weighting (LP#20) | Reproduces (submit page); thresholds 10 and 20 reproduce only through DevHunt's vendor guide. |
| Awesome-list gates (LP#21) | Reproduces for list submissions; the "4 reviews", "30 days", "CC0", "no AI-generated content" gates all confirmed in the PR template. |

## Normative guidance candidates

Per-venue gate checklist and the link-target check. Each rule: imperative, rationale, severity, verification.

1. MUST: Before any launch, run the link-target check on the URL the venue will link to: `curl -sL -o page.html -w '%{http_code} %{url_effective}\n' <url>` must print 200 and the intended final URL; `grep -ciE '<form|type="(email|password)"' page.html` must print 0 for forms that gate the product; no wall words (`sign up`, `waitlist`, `request access`, `early access`) in the body. Rationale: Show HN and Launch HN ask for no signup barrier; PH wants the main flow to work for a first-time user. Verification: the three commands, pass condition stated here.
2. MUST: The link target shows a runnable install or try command within one click, and on the landing itself for HN and PH. Verification: `grep -oE 'curl[^<]*\| *(ba)?sh|brew install|cargo (binstall|install)|npm i' page.html` returns at least one match on the landing, or on the page linked as "install"; otherwise fail. Rationale: this report's measured finding (grimoire.rs misses on the landing). Source of the rule: decision, not a venue rule.
3. MUST: Submit to Product Hunt only a product that exists now, not a doc or blog post. Verification: reading heuristic. Pass: "a CLI with a tagged release and an install command". Fail: "our announcement blog post", "a waitlist for the CLI". Rationale: PH defines eligibility as a product, not content about one, and a closed beta nobody can join as a poor fit; a rejected or removed launch burns the two-month relaunch window. Source: PH 17734341.
4. MUST: Launch from a personal account of a real maker; never a brand account, never a second account. Verification: checklist item names the account owner; fail if the account is the org page. Rationale: PH allows only personal accounts to submit and comment, and one real person per account; fake or second accounts can remove the launch. Source: 17734306, 17734384.
5. MUST: Never write "upvote", "vote for us" or "support us on Product Hunt" in any draft for any venue. Verification: `grep -niE 'upvote|vote for|support us on (product hunt|hn)'` over every draft returns nothing. Ask for trials and feedback instead. Rationale: PH says "Never ask for upvotes" and HN says "Don't solicit upvotes"; an agent that drafts the ask makes the team the violator. Source: PH 17734384; HN guidelines, showhn.
6. MUST: Schedule PH launches for a day whose 12:01 AM Pacific start leaves a named human awake for the comment duty. Verification: the plan lists the start time converted to the team's zone and a shift table with named owners; the date is within 30 days ahead of scheduling. Rationale: PH expects replies to every comment in near real time and coverage overnight; a launch with nobody online wastes the single slot. Source: 17734355, 17734397.
7. MUST: Check the relaunch gate before a second PH launch: last launch date and the major-change test. Verification: `date` arithmetic gives over 60 days since last launch, or a relaunch request exists. Never change the URL to bypass. Rationale: PH requires a request under two months and removes launches that dodge the window by changing the URL. Source: 17734411.
8. MUST: Do not draft a Show HN for a point release. Verification: heuristic. Fail: title matches `Show HN: <name> 1.3.1`, `v[0-9]+\.[0-9]+\.[0-9]+`; pass: a new capability or major version with a try-it path. Rationale: Show HN calls "Foo 1.3.1 is out" not substantive; a major overhaul is probably acceptable. Source: showhn.html.
9. MUST: Show HN title begins with `Show HN:` and carries no site name, capitals-only words or exclamation points. Verification: regex `^Show HN: ` and `grep -E '[A-Z]{5,}|!'` empty. Rationale: Show HN titles must begin "Show HN"; the HN guidelines ask for the original title without gimmicks (the capitals and exclamation checks are this report's conservative reading of that, not a quoted rule). Source: showhn.html, newsguidelines.html.
10. MUST: Agents prepare HN drafts for human review and never post, comment or vote on HN. Verification: `grep -ciE 'news.ycombinator.com/(submit|item|vote|reply)' <tool-log>` prints 0 for write calls. Rationale: HN says "Please don't automate posting" and "Please don't put generated text in HN posts"; the agent boundary dive also lists HN posting as Never for agents. Source: HN guidelines.
11. MUST: For BetaList, confirm own domain and a visible signup or access path first. Verification: the URL host is not in `vercel.app`, `netlify.app`, `herokuapp.com`, `github.io` (github.io is a judgement extension of the named free subdomains; mark as such), and rule 1 passes. Source: BetaList criteria, FAQ.
12. MUST: Write BetaList pitch as one plain sentence without the product name, and description as plain prose without Markdown, HTML or emoji. Verification: `grep -P '[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]'` and `grep -E '[*_#`\[]|<[a-z]'` return nothing; pitch has one sentence-final period and no em dash or semicolon. Rationale: the BetaList writing guide asks for a single plain sentence (name only in the title) and plain prose with no Markdown, HTML or emoji; rejection gives no feedback, so a format miss costs a paid slot's review. Source: betalist.com/help/submitting.
13. MUST: Treat BetaList as a paid venue. The agent drafts and may create the unclaimed submission through the agent API, then stops; the founder claims within 7 days and pays. Rationale: the FAQ says "All submissions are paid. There is no free submission option" and the agent page says "The agent never pays and cannot publish"; spending is a business decision. Verification: the plan marks BetaList as "human pays"; `curl -s https://betalist.com/faq | grep -c 'All submissions are paid'` prints at least 1 at plan time (re-checks the premise); the tool log shows no payment call and the submission status stays unclaimed until the owner acts. Source: betalist.com/agent, FAQ.
14. SHOULD: List on DevHunt and Uneed free queues only for tools matching their scope (DevHunt: developer tool). Verification: DevHunt category check against the FAQ list; decline for non-developer products. Treat any "vote to keep your listing" mechanic (Uneed 10 and 20) as a reason not to rely on the free tier; vendor-stated.
15. SHOULD: Enter awesome lists at item level: for each target list, fetch its `contributing.md` and README, then draft one line `- [Name](url) - Objective description.` (uppercase start, ends with a period, no marketing words). Verification: `npx awesome-lint <list-fork-url>` clean after the edit; description regex `^- \[[^\]]+\]\([^)]+\) - [A-Z].*\.$`. Source: PR template (format), awesome-lint rules `list-item`, `balanced-punctuation`.
16. MUST NOT: Open a pull request that is fully AI-generated or an unreviewed batch to many lists. Verification: PR is opened by a human after reading the target list's rules; the plan lists at most one PR per list and the agent's tool log has no `gh pr create` against a third-party list repo. Rationale: the PR template says fully AI-generated pull requests are not accepted, and awesome-selfhosted bans machine/LLM contributions with a ban (see 2.4b). Source: PR template ("Fully AI-generated pull requests are not accepted"; "Don't waste my time").
17. SHOULD: Run one launch venue at a time for a small team, in this order: Show HN (if the link target passes), then free directory listings and awesome-list PRs over the following weeks, then PH if the product has a non-developer audience. Verification: plan has dated rows with one named comment-duty owner per day and at most one launch-day venue. Evidence: thin (see 2.8 and Contested); the rule is a staffing constraint, not a measured effect.
18. SHOULD: Define one measured goal and its measurement point before launch. Verification: plan contains a number and a source (for example GitHub stars via `gh api repos/<o>/<r> --jq .stargazers_count` at T+0, T+24h, T+48h, T+7d, or referrer counts). Source: PH 17734355 (goal), danfking (half-life about 24 h).
19. SHOULD: On a Lobsters submission, check that the account is an invited member with self-promo below a quarter of activity; otherwise do not draft one. Rationale: Lobsters is invite-only, asks that self-promo stay "less than a quarter of one's stories and comments in the last year", and bars new users (first 70 days) from self-promo and the `show` tag. Verification: the plan records, from the human's own profile page `https://lobste.rs/~<user>`, the account age in days (pass: over 70) and a count of own-domain stories over total stories and comments in the last year (pass: below 0.25); a missing profile means fail. Source: lobste.rs/about (re-fetched 2026-11-27).
21. MUST NOT: Open a PR or issue on awesome-selfhosted, write entry YAML a person will submit as their own, or tick its human-submission box. Rationale: its CONTRIBUTING.md forbids all three for AI agents and bans machine/LLM contributions. Verification: `curl -s https://raw.githubusercontent.com/awesome-selfhosted/awesome-selfhosted-data/master/CONTRIBUTING.md | grep -c 'Machine/LLM-generated contributions are not allowed'` prints 1 at plan time; the agent's tool log has no write call to that repo. The agent may run the objective check (first release older than four months: `gh release list -R <o>/<r> --limit 100`, take the oldest date, pass if over 120 days; active maintenance; install docs).
22. SHOULD: Before adding any directory to a plan, confirm the venue is a fit by reading its scope line and checking the product against it. Rationale: alternative-to and self-hosted directories exclude a standalone CLI (2.4b). Verification: plan row quotes the directory's scope sentence and names the match or mismatch.
20. CONSIDER: Re-fetch each venue's rules page at plan time and record the fetch date. Verification: plan lists the fetch date per venue. Reason: PH pages carry only relative dates; rules change without notice.

## Dated facts
Source-date note: PH help pages, BetaList, DevHunt, Uneed and HN pages print no date; the "Date" column then says "none" and the fetch date (2026-11-27) is the only anchor. Re-fetch before use.

| Fact | Source | Date the source states | Type |
|---|---|---|---|
| PH go-live 12:01 AM Pacific; schedule tomorrow to 30 days ahead | [17734355](https://help.producthunt.com/en/articles/17734355-3-set-your-goals-and-pick-your-launch-date) | none; "Updated over 3 weeks ago" (fetched 2026-11-27) | platform |
| PH "Never ask for upvotes"; fake accounts and paid engagement prohibited | [17734384](https://help.producthunt.com/en/articles/17734384-5-how-to-promote-your-launch-and-what-to-avoid) | none; same relative stamp | platform |
| PH relaunch needed under two months; URL bypass prohibited | [17734411](https://help.producthunt.com/en/articles/17734411-7-relaunch-your-product) | none; same | platform |
| PH personal account only; verified email; launching free | [17734306](https://help.producthunt.com/en/articles/17734306-1-how-product-hunt-works) | none; same | platform |
| PH established-account upvotes count more; hunter does not matter | [17734646](https://help.producthunt.com/en/articles/17734646-8-launch-faq-and-myths) | none; same | platform |
| BetaList: all submissions paid; own domain required; refund on rejection | [FAQ](https://betalist.com/faq) | none on page | platform |
| BetaList agent API: agent cannot pay or publish; 7-day claim; 12-month duplicate; rate limits 10/60/120 per hour | [agent](https://betalist.com/agent) | none; sample expiry 2026-10-28 illustrative | platform |
| DevHunt: launch $49; super boosts $199/$149/$99; free page nofollow | [FAQ](https://devhunt.org/faq) | none | vendor (platform's own page) |
| Uneed free launch: score 10 to stay published, 20 for dofollow | [DevHunt guide](https://devhunt.org/launch-platforms) | checked 2026-11-24 | vendor data about a competitor |
| awesome list: 30 days, 4 PR reviews, CC0, no AI-generated PRs | [PR template](https://raw.githubusercontent.com/sindresorhus/awesome/main/pull_request_template.md) | none on file (fetched 2026-11-27) | authority itself |
| awesome-lint `minimumRepositoryAgeDays = 30` | [git-repo-age.js](https://raw.githubusercontent.com/sindresorhus/awesome-lint/main/rules/git-repo-age.js) | none | authority itself |
| Show HN: try-it-now, no signup pages, no routine releases | [showhn.html](https://news.ycombinator.com/showhn.html) | none | platform |
| HN: no soliciting upvotes, no automated posting, no generated text | [newsguidelines](https://news.ycombinator.com/newsguidelines.html) | none | platform |
| Lobsters: invite-only, self-promo about a quarter, 70-day new-user limit | [about](https://lobste.rs/about) | none | platform |
| awesome-selfhosted: first release over 4 months old; machine/LLM contributions banned; agents may not open PRs | [CONTRIBUTING.md](https://raw.githubusercontent.com/awesome-selfhosted/awesome-selfhosted-data/master/CONTRIBUTING.md) | none (fetched 2026-11-27) | authority itself |
| OpenSourceAlternative.to: free waitlist 6+ months; fast review +$29 | [submit](https://opensourcealternative.to/submit) | none (fetched 2026-11-27) | vendor |
| Show HN: 188,085 posts, median score 2, p99 263, r = 0.29 | [danfking](https://danfking.github.io/blog/2026/04/23/show-hn-by-the-numbers/) | 2026-04-23 | independent, single-author |
| HN to GitHub: 138 AI/LLM repos, mean 121 stars at 24 h, 189 at 48 h | [arXiv 2511.04453v1](https://arxiv.org/html/2511.04453v1) | submitted 2025-11-06 | independent, preprint |
| PH launch: 3,000 visitors, 60 sign-ups, 0 paying | [Versoly](https://versoly.com/blog/lessons-learned-3-successful-product-hunt-launches) | 2020-02-20 | one team's report |

## What an agent must not decide alone
- Whether to launch at all, on which venue and which day; the team's time zone and who staffs the comment duty. (Human owner.)
- Submitting on any venue (PH, HN, Lobsters, BetaList claim, Uneed, DevHunt, awesome PRs) and posting any maker comment. Posting to HN or writing the maker's HN comment is "Never" for agents in [core-platform-labels](/home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/.agents/research/channel-agent-boundary/core-platform-labels.md) (line 130); the section on publishing ends at "a reviewable package". File-name check: the commission names `core-agent-action-boundary`, which is the brief id (`product-resume/briefs/channel-agent-boundary/core-agent-action-boundary.md`); the dive that answered it was saved as `channel-agent-boundary/core-platform-labels.md`, so the name differs but it is the same dive. That row cites the HN guidelines without re-fetching; this report re-fetched them (2026-11-27) and the clauses hold. BetaList states "The agent never pays and cannot publish."
- Paying: BetaList plans, DevHunt $49 launch and super boosts, Uneed fast-track, PH ads. Spending money is a business decision.
- Whether a release counts as a "major overhaul" for Show HN or a PH relaunch request.
- Accepting a freshness, brand, or licensing trade-off such as adding a CC0 file or an Awesome badge to a list the team maintains.
- Using a co-founder's or employee's personal account to launch.

## AI-agent angle
| Likely mistake | Smallest check |
|---|---|
| Drafts "please upvote us on Product Hunt" or asks friends to upvote | `grep -niE 'upvote|vote for'` over drafts |
| Treats awesome-list rules (30 days, CC0, 4 reviews) as item rules | Check the target list's own `contributing.md`; the sindresorhus template governs lists |
| Invents character limits (BetaList 75/700) from memory or scout rows | Require a fetched source URL for every limit; none stated publicly |
| Fills launch copy with superlatives, feature lists, single-sentence paragraphs | Reading heuristic from yli.html; pass: one clear sentence on what it does |
| Posts or schedules without consent, or submits a point release as Show HN | Rules 8 and 10; log shows no post call |
| Reads a landing page through a local override (this host's `/etc/hosts` for ocx.sh) and reports a failure or a pass | Run `getent hosts <host>` and `curl --resolve` against the public resolver |
| Marks a link target as passing from the landing text alone | Run the three-command check; install command may be one click away |

## Contested / evolving
- Weekday versus weekend on PH: PH says weekends "can suit smaller teams"; weekdays carry more traffic (17734355). No fetched study measures it for PH. For HN, [danfking](https://danfking.github.io/blog/2026/04/23/show-hn-by-the-numbers/) reports the best single slot Monday 00:00 UTC (10.8% reach 50+ points) and Fridays 12-15 UTC with the highest mean score; the [arXiv preprint](https://arxiv.org/html/2511.04453v1) says 12-17 UTC posts gained about 200 more stars (unadjusted). The two disagree on which window and neither is causal.
- Launching for a free OSS CLI on PH: PH welcomes any live product, yet DevHunt's guide (vendor) says developer tools suit DevHunt, Show HN, Peerlist and Lobsters, and consumer or broad B2B suits PH, BetaList, Uneed. Both sides are vendor or platform self-description; no outcome data.
- Leaderboard finish versus real goal: PH says many launches meet goals without topping the leaderboard (17734646); directories such as Uneed and DevHunt tie link or winner benefits to vote scores. Conflicting incentives; the agent should not optimise votes.
- Launch week versus single day: Supabase and Lago practise launch weeks (scout rows LP#28, not re-fetched here); PH frames a launch as one slot with relaunch after two months. No measured comparison.
- Rules drift: PH help pages carry no absolute dates, so any gate may change silently; re-fetch at plan time.

## Sources
| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://help.producthunt.com/en/articles/17734306-1-how-product-hunt-works | PH how it works (primary) | undated, "over 3 weeks" | Account, free, ranking basics |
| https://help.producthunt.com/en/articles/17734341-2-what-kind-of-products-get-featured | PH eligibility (primary) | undated | Product not content, usable now |
| https://help.producthunt.com/en/articles/17734355-3-set-your-goals-and-pick-your-launch-date | PH goals and date (primary) | undated | 12:01 AM PT, 30 days, weekend |
| https://help.producthunt.com/en/articles/17734384-5-how-to-promote-your-launch-and-what-to-avoid | PH promotion rules (primary) | undated | Never ask for upvotes |
| https://help.producthunt.com/en/articles/17734397-6-what-to-do-during-and-after-your-launch | PH comment duty (primary) | undated | Staffing |
| https://help.producthunt.com/en/articles/17734411-7-relaunch-your-product | PH relaunch (primary) | undated | Two-month gate |
| https://help.producthunt.com/en/articles/17734646-8-launch-faq-and-myths | PH FAQ (primary) | undated | Hunters, link rule |
| https://betalist.com/criteria | BetaList criteria (primary) | undated | Domain, access path |
| https://betalist.com/faq | BetaList FAQ (primary) | undated | Paid only |
| https://betalist.com/agent | BetaList agent contract (primary) | 2026 | Agent boundary |
| https://betalist.com/help/submitting | BetaList writing guide (primary) | undated | Pitch and description rules |
| https://uneed.best/submit-a-tool | Uneed submit page (primary) | undated | Free queue, multiplier |
| https://devhunt.org/faq | DevHunt FAQ (primary, vendor) | undated | Prices, scope |
| https://devhunt.org/launch-platforms | DevHunt venue guide (vendor) | checked 2026-11-24 | Competitor thresholds |
| https://selfh.st/submit/ and https://selfh.st/apps/ | selfh.st (primary) | 2026 | No stated criteria |
| https://raw.githubusercontent.com/awesome-selfhosted/awesome-selfhosted-data/master/CONTRIBUTING.md and https://opensourcealternative.to/submit | OSS directories (primary, vendor) | undated | Agent ban, scope |
| https://raw.githubusercontent.com/sindresorhus/awesome/main/pull_request_template.md | awesome list gates (primary) | undated | List submission rules |
| https://raw.githubusercontent.com/sindresorhus/awesome/main/contributing.md and create-list.md | awesome contributing (primary) | undated | Lists vs items |
| https://github.com/sindresorhus/awesome-lint and rules/git-repo-age.js | awesome-lint (primary) | undated | `npx awesome-lint`, 30 days |
| https://news.ycombinator.com/showhn.html | Show HN rules (primary) | undated | Try-it-now gate |
| https://news.ycombinator.com/yli.html | Launch HN advice (primary) | undated | Signup barriers |
| https://news.ycombinator.com/newsguidelines.html | HN guidelines (primary) | undated | Automation, solicitation |
| https://lobste.rs/about | Lobsters rules (primary) | undated | Self-promo cap |
| https://arxiv.org/html/2511.04453v1 | HN to GitHub stars preprint (independent) | 2025-11-06 | Only method-stated study |
| https://danfking.github.io/blog/2026/04/23/show-hn-by-the-numbers/ | Show HN dataset (independent blog) | 2026-04-23 | Distribution, timing |
| https://versoly.com/blog/lessons-learned-3-successful-product-hunt-launches | PH postmortem (one team) | 2020-02-20 | Conversion caution |
| https://grimoire.rs/ , https://grimoire.rs/installation.html , https://ocx.sh/ | Fleet measurement targets | 2026-11-27 | Link-target check |
| /home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/.agents/research/channel-agent-boundary/core-platform-labels.md | Agent action boundary (internal) | 2026-11 | Human-only actions |
