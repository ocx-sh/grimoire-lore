# Registry format

Read this when you add, edit or refresh a platform-facts row (`references/facts.md`
in a platform skill), when `facts_check.py` fails, or when you set up the weekly
re-fetch job. It carries CH-CORE-11 to CH-CORE-15.

Contents: [Dates and versions](#dates-and-versions) · [The row](#the-row) ·
[Columns](#columns) · [Provenance](#provenance) · [Intervals](#intervals) ·
[Writing expect](#writing-expect) · [When a row is overdue](#when-a-row-is-overdue) ·
[The weekly job](#the-weekly-job) · [Allowlist](#the-provenance-allowlist)

## Dates and versions

| Item | Value | Source and date | Re-check |
|---|---|---|---|
| Interval basis | One numeric-limit edit per about 25 page-months, 40.5-day median between page edits | GitHub Docs edit history, measured 2026-11-27 | After two registry refresh cycles |
| Ads-page cadence | LinkedIn ads help pages edited at a 105-day median, organic pages at 547 days | LinkedIn help pages, measured 2026-11-27 | After two refresh cycles |
| Price change | X per-post API pricing took effect 2026-04-20 | X changelog | Every 30 days (a price row) |
| Scripts | Python 3.11 standard library | `checks/facts_check.py` | When the floor moves |

The intervals below are starting values from one repository's edit history. Revise
them after two refresh cycles, using the classes of fact that failed `expect`.

## The row

A registry is a Markdown table in `references/facts.md`. Each platform skill ships
its own file. A fact lives in one file. Cite its id from any other skill and never
copy the row. Row ids are `<PLATFORM>-F<number>`, such as `LI-F01`.

```markdown
| id | platform | fact | value | url | source_date | verified | refresh_days | provenance | expect |
|---|---|---|---|---|---|---|---|---|---|
| LI-F01 | linkedin | post text limit | 3,000 characters | https://www.linkedin.com/help/linkedin/answer/a528176 | relative:2 months ago@2026-11-27 | 2026-11-27 | 180 | platform | 3,?000 characters |
```

Keep archive captures and fetch notes in a `history` paragraph under the table, not
in a cell. A row whose url is an archive capture fails the check.

## Columns

| Column | Content | Failure it prevents |
|---|---|---|
| `id` | `[A-Z]+-F[0-9]+` | A citation that resolves to nothing |
| `platform` | The platform name | One fact with two owners |
| `fact` | What the row states. A label trigger starts `trigger:`, an exemption starts `exemption:` (CH-CORE-07 reads these) | An AI-use answer with no case behind it |
| `value` | The limit, field name or clause | A number written from memory |
| `url` | The `https` page the row was read from. Never an archive capture | A fact nobody can re-read |
| `source_date` | The page's absolute date, `relative:<text>@<fetch date>`, or `none` | A relative age copied as a date |
| `verified` | The date your own fetch read the page | A stale row that looks fresh |
| `refresh_days` | `30`, `90`, `180` or `expires:<date>` | A fact that decays with no clock |
| `provenance` | `platform`, `authority`, `independent` or `vendor` | A vendor figure used as a limit |
| `expect` | A non-empty regex that the page text must match | A page that changed while its date was valid |

Rules for cells. No cell holds a literal pipe, so `expect` uses no alternation. Write
`relative:<text>@<date>` when the page shows only an age such as "3 years ago": 28 of
28 sampled LinkedIn help pages show only a relative age and 9 of 9 YouTube Help
pages show no date. `verified` is always your own fetch date, never the page's.

## Provenance

| Class | Meaning | May back a rule threshold |
|---|---|---|
| `platform` | The platform's own policy, API or help page | Yes, if its host is on the allowlist |
| `authority` | A regulator or standards body, such as the FTC | Yes, if its host is on the allowlist |
| `independent` | A third-party study or post, with its sample size | No |
| `vendor` | A tool vendor's statistic, such as a reach or engagement figure | No |

In prose, a `vendor` or `independent` figure carries its tag, date and sample size.
The host decides the class, not the tag: an agent that writes the row can mislabel it
(CH-CORE-15).

## Intervals

| Kind of fact | `refresh_days` |
|---|---|
| Hard limits (character counts, file sizes, durations) | 180 |
| Policy clauses, API fields, label triggers, behaviour claims, third-party statistics, LinkedIn ads specifications | 90 |
| Prices, metered costs, and any fact within 60 days of a stated effective date | 30 |
| An event deadline | `expires:<date>` |

A platform skill states its own floor in its SKILL.md. `facts_check.py` fails on the
first overdue row. The fix is a re-fetch, never a later date.

## Writing expect

`expect` must match the page text after tags are removed. Pages change their numeral
format: LinkedIn now writes `3000` and `100MB` where older notes wrote `3,000` and
`100 MB`. Write `3,?000 characters` and `100 ?MB`. Escape a dot you mean literally,
and use `.` for an apostrophe that may be curly. Test it against the live page text
before you commit the row.

```sh
# Replace PAGE_URL and the pattern, then read the output: empty means the page lost the text.
curl -sL --compressed -m 40 "$PAGE_URL" | sed 's/<[^>]*>/ /g' | grep -E -e '3,?000 characters'
```

## When a row is overdue

1. Run `python3 -I "$CHECKS"/facts_check.py <facts file>`. Read each overdue id.
2. Fetch the row's `url`. On a host the weekly job lists as `MANUAL`, a human reads it.
3. If the value changed, edit `value`, `source_date` and `expect`, then set `verified`
   to today. If it did not change, set `verified` to today.
4. Re-run the check. Exit 0 is done.

Never raise `refresh_days` to clear a failure, and never copy a page's relative age
into `verified`.

## The weekly job

CH-CORE-14. A scheduled job re-fetches every row's `url`, checks the page text
against `expect`, and opens an issue for each `CHANGED` or `UNREACHABLE` line. It
never blocks a merge: `--refetch` always exits 0.

```sh
git ls-files -z -- ':(glob)**/references/facts.md' | xargs -0 -r python3 -I "$CHECKS"/facts_check.py --refetch
```

| Output | Meaning | Action |
|---|---|---|
| `MANUAL id url due DATE` | The host bans automated access or blocks scripts | A human re-reads the page by `DATE` and updates `verified` |
| `UNREACHABLE id CODE url` | The fetch returned 403, 429, 999 or no reply | Report it. Never treat it as a change |
| `CHANGED id url` | The page no longer matches `expect` | Re-read the page, then follow "When a row is overdue" |

The manual hosts are `linkedin.com`, `producthunt.com`, `help.x.com`, `reddit.com`,
`reddithelp.com`, `ftc.gov` and `support-dev.discord.com`. Never fetch them in a job.
LinkedIn User Agreement 8.2 bans automated access, and the others answer scripts
with 403. Never use Wayback capture counts or capture dates as change evidence: a
digest count overstated real edits 20 to 40 times on one documentation host, and later
LinkedIn captures were empty script shells.

## The provenance allowlist

CH-CORE-15. `checks/hosts.txt` lists one `<host> <provenance>` per line. Run
`facts_check.py --hosts checks/hosts.txt <facts file>` to fail any `platform` or
`authority` row whose host is not listed. The match is a whole host, so adding
`github.com` admits every repository on it. A human adds hosts. An agent never does.
