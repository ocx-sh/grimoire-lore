# Launch rules

Eighteen rules, CH-LAUNCH-01 to CH-LAUNCH-18. A finding cites the ID and keeps the severity of its row. Contents: [Dates and versions](#dates-and-versions) · [The two objects](#the-two-objects) · [Rules](#rules) · [Verification blocks](#verification-blocks) · [Dropped](#dropped)

## Dates and versions

- Venue pages were read 2026-11-27. Venue pages print no absolute date, so every row that rests on one re-checks it on plan day (CH-LAUNCH-13). The dated figures sit in the facts file, cited as `[LP-Fnn]`.
- The launch plan uses the counter list and the front-matter keys of `github-presence` (CH-GH-23, CH-GH-24, CH-GH-25, CH-GH-32). A change to that list changes CH-LAUNCH-11.
- No source shows that any launch shape, venue order or venue outperforms another for a small developer tool. A row that rests only on practitioner or vendor practice is a SHOULD. Re-run the search for venue outcomes in 12 months.
- Re-check events: a venue changes its entry gate, a list is archived, a Product Hunt help page changes its go-live or relaunch text.
- The check scripts read the plan format of the plan template. They use the Python standard library only.

## The two objects

- The **launch plan** is the file this skill writes. It holds front matter, a `## Venue admission` table, a `## Schedule` table with an `actor` column (`agent` or `human`), a `## Shifts` table and a `## Venue facts` section.
- The **link target** is the URL a venue's URL field will hold.

## Rules

Placeholders: `$PLAN` is the plan file, `$CHECKS` is the `checks/` directory of this skill. Commands that need a pipe are in the blocks below the table. A cell that says "see block ID" points to one.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CH-LAUNCH-01 | Plan a launch only for an artifact that has a published, non-prerelease release and whose link target passes CH-LAUNCH-02. Never plan one for a doc, blog post, waitlist or a repository with no release. | Venues want a product people can try [LP-F01, LP-F02, LP-F12]. A rejected launch can cost the relaunch window [LP-F08]. The check proves a release exists, not that a stranger's install works. | see block CH-LAUNCH-01, then CH-LAUNCH-02 passes | MUST |
| CH-LAUNCH-02 | Run the link-target check on every URL a venue will link to, through a public resolver, before the plan is final. Pass needs all of these: HTTP 200 at the intended final URL; no form that gates the product; no wall words in the page body; a working install command for the launched product on the page or on the page it links as "install". | Venues ask for no signup barrier [LP-F13] and a working main flow [LP-F01]. A local resolver can serve a stale host and report a false failure. | `python3 -I "$CHECKS"/link_target_check.py "$URL"` exits 0 and prints `ok` for the URL | MUST |
| CH-LAUNCH-03 | On the install page the link target reaches, put a command that installs the launched product itself first. List a prerequisite tool's installer after it. | Inference, no venue source: a stranger tries the first command. A command that installs another product adds the step the venues' no-barrier gate warns against. | `python3 -I "$CHECKS"/link_target_check.py --install-host "$HOST" --package "$PKG" "$URL"` exits 0. The first install command matches the host or the whole-word package name | SHOULD |
| CH-LAUNCH-04 | Admit a venue to the plan only after reading its scope sentence on plan day and recording a match or a mismatch (MUST). Where a venue has separate lanes, record the lane and quote that lane's own sentence, never the venue's headline gist (MUST). For a free OSS CLI, start from these default exclusions; the owner may override any of them (SHOULD): BetaList, which is paid [LP-F26]; Uneed, whose free tier is vote-gated with no confirmed threshold [LP-F28]; awesome-selfhosted and OpenSourceAlternative.to, which are out of scope [LP-F29, LP-F30]; Launch HN, which is for YC startups [LP-F18]; an awesome list that fails CH-LAUNCH-17. Do not exclude selfh.st [LP-F31], AlternativeTo [LP-F32] or Console.dev by default. Read their scope on plan day. | Each venue states its scope on its own page. Console.dev has two lanes: Tools states no version gate [LP-F19] and Betas bars GA releases [LP-F21]. Quoting the headline gist sets a false deadline or a false exclusion. | `python3 -I "$CHECKS"/plan_check.py "$PLAN"` prints no CH-LAUNCH-04 line. Checks 2 and 4 are in block CH-LAUNCH-04 | MUST (admission record, lane quote); SHOULD (default exclusions) |
| CH-LAUNCH-05 | Never ask for votes in any launch artifact: venue drafts, README, release notes, chat announcement, social post or team message. Ask for a trial and for feedback. | Venues bar vote requests [LP-F03, LP-F17]. When the agent drafts the ask, the team becomes the violator. A plain star request is CH-GH-27, not this rule. For community venues, CH-COM-08 owns the ban and this plan cites it. | `python3 -I "$CHECKS"/plan_check.py "$PLAN" --artifacts FILE...` prints no CH-LAUNCH-05 line. The pattern targets an ask, not the word, so a product feature named "upvote" passes | MUST |
| CH-LAUNCH-06 | Classify every channel in the plan with `venue_class:` set to exactly one of: `community` (strangers reply in public to the team's post: Show HN, Product Hunt, a forum announcements category), `editorial` (a human editor decides whether and when it publishes), `owned` (a page or copy the team publishes: the canonical record, a mirror). Put at most one `community` channel on launch day on any calendar day. Name a human owner for each block of that venue's comment window: Product Hunt from 12:01 AM to midnight Pacific including the overnight hours in the team's zone [LP-F04, LP-F09]; Show HN from submission for `hn_duty_hours` hours, a whole number the owner sets [LP-F14]; any other community venue one named owner for the post. | The classes are by observation. A forum category takes replies but states no duty to answer, so `community` is an inference in the safe direction: it costs one day of spacing. An editorial item has no schedulable day [LP-F23]. One venue per day is a staffing inference from the duties, not a venue rule. | `python3 -I "$CHECKS"/plan_check.py "$PLAN"` prints no CH-LAUNCH-06 line. It checks the class, one community venue per day, `publish_date: not-scheduled` on editorial rows, the shift blocks with no gap, `hn_duty_hours` and the Product Hunt date window [LP-F05] | MUST |
| CH-LAUNCH-07 | Never plan a Show HN or a Product Hunt launch for a routine release. Record `launch_reason:` as exactly one of `first-launch`, `major-version`, `owner-major:REF` (REF points to the owner's written decision). For a second Product Hunt launch, check that more than 60 days have passed or that a relaunch request exists, and never change the product URL to get around the window. | A point release is not a Show HN [LP-F15]. Product Hunt asks for a request inside two months and removes a launch that changes URL to dodge the window [LP-F08]. Release automation that adds a launch step hits this on every release. | `python3 -I "$CHECKS"/plan_check.py "$PLAN"` prints no CH-LAUNCH-07 line. `major-version` needs a tag matching `^v?[1-9][0-9]*\.0\.0$`. A Show HN or Product Hunt title with a version needs a major one. `first-launch` fills `first_launch_evidence` with the venue search that shows no earlier launch | MUST |
| CH-LAUNCH-08 | Sequence every launch in this order: release tag published; canonical record live; the launch-day community venue; social posts that link the canonical record; directory listings and awesome-list entries on later days; a recap only after a multi-day launch. | Practitioner and vendor anecdote, not effect data: ship before announce, owned record first and social after. No source shows that the order changes an outcome. | `python3 -I "$CHECKS"/plan_check.py "$PLAN"` prints no CH-LAUNCH-08 line. The release date is strictly earlier than the venue date. Record, venue and first social dates are in non-decreasing order, in UTC calendar days. Each social draft contains the record URL (block CH-LAUNCH-08) | SHOULD |
| CH-LAUNCH-09 | Give every launch headline one canonical record: a dated page at a stable URL the team controls. Use an owned-domain post, or the GitHub Release page whose body's first non-blank line is a prose summary sentence and whose body links the docs page. The record links the release. Never hand-edit a generated `CHANGELOG.md` to link back. | Vendor practice only: one company dates every headline post and pairs none with a changelog entry. One company's practice does not support a MUST. | see block CH-LAUNCH-09 | SHOULD |
| CH-LAUNCH-10 | Default to a rolling cadence with single launch days. Plan a launch week only when at least N separately announceable items are merged and released, and each has its canonical record drafted. N is 5 unless the owner sets another number in the plan. | A launch week's post volume shows its cost at one large vendor's scale. The test that compares it with other weeks is circular. N = 5 is a heuristic with no source. The rule asks for released items to keep ship before announce (CH-LAUNCH-08). | `python3 -I "$CHECKS"/plan_check.py "$PLAN"` prints no CH-LAUNCH-10 line. A plan with `launch_shape: launch-week` and fewer than N items marked released in `## Items` fails | SHOULD |
| CH-LAUNCH-11 | Set exactly one numeric launch goal. Take one counter from the CH-GH-23 signal list (C1 to C11) in the CH-GH-32 order (C5, then C6, then C3 or C4; C1 only with owner approval). Read a 28-day baseline ending the day before launch, then reads at T+24 h, T+48 h and T+7 d. Never set stars, Product Hunt points, Hacker News score or a rank as the goal (CH-GH-24). If the counter is GitHub traffic (C3, C4), the CH-GH-25 traffic archive runs before the baseline window starts. | The venue asks for one or two measurable goals [LP-F06]. Counter validity and the report form belong to `github-presence`. The HN star effect is short, so the read dates are fixed. The 28-day window is a catalog choice. | `python3 -I "$CHECKS"/plan_check.py "$PLAN"` prints no CH-LAUNCH-11 line. The front matter holds `goal`, `counter`, `read_command`, `baseline_window`, `target`, `read_on`. A goal that names stars, points or a rank fails. A C3 or C4 counter with no `traffic_archive` fails | SHOULD |
| CH-LAUNCH-12 | Stop at every human step a venue defines. The agent drafts entries and may create an unclaimed draft only where the venue's agent contract allows it. The agent never submits, claims or pays; opens a PR or issue on a third-party list or directory; ticks a human-attestation box; prepares a batch of PRs across lists. Before it runs any command, the agent checks it against these four and stops on a match, writing the step to the plan as a `human` row. A human reads each target list's own contributing file and opens at most one PR per list. | Lists and directories state the boundary: no AI-generated pull requests [LP-F35, LP-F42], a ban for LLM contributions [LP-F30], human-only form intake [LP-F37], an agent that never pays [LP-F27]. One list invites agents [LP-F41]. The MUST is this skill's own boundary, so it holds there too unless a human overrides it for that list. The list-submission gates of the parent list govern lists, not items [LP-F36]. | see block CH-LAUNCH-12 | MUST |
| CH-LAUNCH-13 | Re-fetch each venue's rules page on plan day. Record the URL and fetch date per venue. Put every venue figure (limit, price, threshold, time, character count) in the plan's `## Venue facts` section, one figure per line, with its fetched URL on the same line. Never carry a figure from memory or from a facts row. | Help pages show only relative ages. Two figures from an early scouting pass failed to reproduce, and submit forms sit behind a login, so field limits cannot be measured from public markup. | `python3 -I "$CHECKS"/plan_check.py "$PLAN"` prints no CH-LAUNCH-13 line. Each admission row has `fetched` equal to the plan date. Every line of `## Venue facts` with a digit has an `https://` URL. A venue figure written outside that section is caught only by review | MUST |
| CH-LAUNCH-14 | Launch on Product Hunt from a real maker's personal account with a verified email. Never use the org or brand account, a second account, or a colleague's account without that person's consent. | Company and brand accounts cannot submit or comment [LP-F10]. The Hacker News username must be a person too (CH-COM-03). | `python3 -I "$CHECKS"/plan_check.py "$PLAN"` prints no CH-LAUNCH-14 line. `ph_account` names a person, and a handle equal to `org` or `product` fails | MUST |
| CH-LAUNCH-15 | Put the CH-LAUNCH-02 link target (landing page or repository) in the launch-day community venue's URL field. Never put the announcement post or the canonical record there. | Show HN wants something to play with and treats blog posts as off topic [LP-F12, LP-F16]. Product Hunt encourages linking the product [LP-F11]. Social posts link the record; the two rules govern different URL fields. | `python3 -I "$CHECKS"/link_target_check.py --plan "$PLAN"` exits 0. Every community `url_field` passes CH-LAUNCH-02 and none equals `canonical_record` | MUST |
| CH-LAUNCH-16 | Give any mirror of the canonical record on another publishing platform the record URL in the platform's canonical field (`canonical_url` on DEV). Publish it on or after the record's date, and give it a body of its own prose, not a link-only stub. | DEV's terms bar link-only posts [LP-F24] and document the canonical field [LP-F25]. No source measures whether a mirror helps. | see block CH-LAUNCH-16. The 150-word floor has no source and the owner may change it. A front-matter grep for `canonical_url:` is not a valid check: the canonical is set outside the body | SHOULD |
| CH-LAUNCH-17 | Before admitting an awesome list, check that it is alive: not archived, and at least one merged PR in the 90 days before the plan date. A list that takes submissions as issues also counts closed issues. Mark a list that fails `excluded-by-default`. | A list can rank high by stars and still be archived or hold hundreds of unread PRs [LP-F43 to LP-F47]. Unauthenticated API rate limits can stop a run: record the gap and re-run, never fill it in by hand. | see block CH-LAUNCH-17 | SHOULD |
| CH-LAUNCH-18 | Before marking a list row `fit`, record the list's own numeric gate (stars, downloads, age or usage) as a quote, next to the product's measured value. Mark the row `deferred` when the product fails the gate. Never rely on a "popularity equivalent" argument without the owner's written decision. | A rejected or auto-closed entry wastes a human step [LP-F38, LP-F39, LP-F40]. | see block CH-LAUNCH-18 | SHOULD |

## Verification blocks

```sh
# CH-LAUNCH-01: prints 1 or more
gh release list -R "$REPO" --limit 5 --json tagName,isPrerelease,publishedAt --jq '[.[]|select(.isPrerelease==false)]|length'
```

```sh
# CH-LAUNCH-04 check 2: the quoted scope sentence is on the live page; prints 1 or more.
# Where curl is refused, name the fetch tool in the row and read the page by hand.
curl -sL -A 'Mozilla/5.0' "$URL" | sed 's/<[^>]*>/ /g' | tr -s ' \n' ' ' | grep -c -F -e "$QUOTE"
# CH-LAUNCH-04 check 4: prints nothing. The names are the dated example [LP-F43 to LP-F47]; extend them from each CH-LAUNCH-17 run.
grep -n -E -e 'agarrharr/awesome-cli-apps|alebcay/awesome-shell|e2b-dev/awesome-ai-agents|jamesmurdza/awesome-ai-devtools|bradAGI/awesome-cli-coding-agents' "$PLAN" | grep -v -E -e 'excluded-by-default|owner-override'
```

```sh
# CH-LAUNCH-08 check 2: social drafts that do not contain the record URL (RECORD is canonical_record). Prints nothing.
grep -L -F -e "$RECORD" -- social-draft-*.md
```

```sh
# CH-LAUNCH-09 check 1: prints 200
curl -sIL -o /dev/null -w '%{http_code}' "$RECORD"
# CH-LAUNCH-09 check 3, for a Release record: prints 1.
# The first non-blank line starts with a capital, has at least six words, ends in . ! or ?, and holds no URL, code span or bold label.
gh release view "$TAG" -R "$REPO" --json body --jq .body | awk 'NF{print;exit}' | grep -v -E -e 'https?://|\*\*' | grep -c -E -e '^[A-Z][a-z]+( [^ ]+){5,}[.!?]$'
# CH-LAUNCH-09 check 4: the body holds the docs host URL (DOCS_URL is https:// plus docs_host). Prints 1 or more.
gh release view "$TAG" -R "$REPO" --json body --jq .body | grep -c -F -e "$DOCS_URL"
```

```sh
# CH-LAUNCH-12 check 1: agent rows that open a PR or issue, or write through the API.
# Every hit must be a repository in the team's own organisations. Otherwise it is a finding.
grep -n -E -e '\| *agent *\|.*(gh (pr|issue) create|gh api (-X|--method) (POST|PUT|PATCH))' "$PLAN"
# CH-LAUNCH-12 check 3: directory rows that are not human steps. Prints nothing.
awk '/^## /{f=($0 ~ /^## Schedule/)} f && /\| *directory *\|/' "$PLAN" | grep -v -E -e 'human submits|human pays'
# CH-LAUNCH-12 check 5: list rows of the Schedule section that are not human submits. Prints nothing.
awk '/^## /{f=($0 ~ /^## Schedule/)} f && /^[|].*awesome/' "$PLAN" | grep -v -e 'human submits'
```

Checks 2 and 4 of CH-LAUNCH-12 are reading heuristics, `unverified: reading heuristic`. Check 2: no row with `actor: agent` is a payment, claim or submit step. Check 4: every third-party list row quotes the target list's own contributing file, with its URL and fetch date. For awesome-claude-code, the quote includes the clause that sends a recommendation to the web form. The parent list's gates for new lists are not applied to an item entry [LP-F36].

```sh
# CH-LAUNCH-16 check 2: prints a canonical href equal to the record URL.
curl -s "$MIRROR" | grep -o -E -e '<link rel="canonical"[^>]*>'
# CH-LAUNCH-16 check 4: prints 150 or more. ID is the DEV article id.
curl -s "https://dev.to/api/articles/$ID" | jq -r .body_markdown | sed 's/\[[^]]*\]([^)]*)//g' | wc -w
```

For CH-LAUNCH-16, the mirror row holds `canonical_url: RECORD` before a human publishes it, and the mirror's date is not earlier than the record's date.

```sh
# CH-LAUNCH-17 check 1: prints false. LIST is owner/repo.
curl -s "https://api.github.com/repos/$LIST" | jq .archived
# CH-LAUNCH-17 check 2: prints 1 or more. SINCE is the plan date minus 90 days, as YYYY-MM-DD.
curl -s "https://api.github.com/search/issues?q=repo:$LIST+is:pr+is:merged+merged:%3E=$SINCE&per_page=1" | jq .total_count
# CH-LAUNCH-17 check 3, for a list that takes issues. Record the number.
curl -s "https://api.github.com/search/issues?q=repo:$LIST+is:issue+is:closed+closed:%3E=$SINCE&per_page=1" | jq .total_count
```

```sh
# CH-LAUNCH-18 check 2: the list's own stars next to the product's. OWNER and NAME are the product repository.
curl -s "https://api.github.com/repos/$OWNER/$NAME" | jq .stargazers_count
# CH-LAUNCH-18 check 3: downloads. CRATE must belong to the product; check .crate.repository first.
curl -s -A "$CLIENT" "https://crates.io/api/v1/crates/$CRATE" | jq .crate.downloads
```

For CH-LAUNCH-18, each list row holds `gate_quote`, `measured` and `verdict`. Age comes from `created_at` of the same repository call. A row marked `fit` whose `measured` value is below the quoted gate fails. An `owner-override` needs a reference to the owner's decision.

## Dropped

| Candidate | Why it is not a rule here |
|---|---|
| Release cadence targets | Release cadence belongs to `github-presence` and `release-notes` |
| A changelog entry per headline | One vendor's practice, and a generated changelog is never hand-edited. CH-LAUNCH-09 replaces it |
| Show HN title rules, repost rules, the maker comment | `community-post` owns them (CH-COM-05 to CH-COM-10) |
| A best day or hour to post | No timing advice survives. CH-COM-10 owns the position: recommend no posting time |
| A rule against venue-effect claims | A claims rule, owned by `marketing-quality` (MKT-CLAIM). No source measures a venue effect beyond stars |
| BetaList pitch format | BetaList is excluded by default. The owner may override |
| "Never add site analytics for a launch" | One team's decision, not a rule for adopters. Analytics belong to `marketing-measurement` |
