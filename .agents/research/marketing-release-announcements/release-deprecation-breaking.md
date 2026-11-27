---
title: Deprecation windows, breaking-change notices and licence-change announcements
program: product
sub_program: marketing
topic: marketing-release-announcements
worker: release-deprecation-breaking
date_researched: 2026-11-27
model: sonnet
sources_fetched: 23
scope: >
  Covers how long a deprecation window lasts, where it is announced, and what a
  breaking-change or licence-change notice must contain, using HTTP header RFCs,
  Kubernetes, SemVer, GitHub, Python, Cargo and Node.js policies, five licence/pricing
  change case studies, and a measurement of the ocx and grimoire CHANGELOGs. Does not
  cover security-advisory format (lifecycle-email.md #31-32), pricing-page design, or
  the git-cliff commit-subject contract beyond what the breaking marker needs.
---

# Deprecation windows, breaking-change notices and licence-change announcements

## Contents

1. Summary
2. Findings (1 measurement, 2 header standards, 3 window exemplars, 4 where notices go, 5 notice contents, 6 licence changes, 7 pricing change)
3. Normative guidance candidates
4. What an agent must not decide alone
5. Dated facts
6. AI-agent angle
7. Contested / evolving
8. Sources

## Summary

- The fleet has never deprecated before removing. Measured: 0 of 26 removal-worded BREAKING entries in ocx and grimoire had an earlier deprecation entry (finding 1). The hypothesis "fleet follows a deprecate-then-remove cycle" is false today.
- ocx marks 98 changelog lines BREAKING across 18 of 38 releases and writes 0 migration lines. grimoire marks 17 across 9 of 34 releases and writes 16 migration lines. The difference is one template block (finding 1.3).
- SemVer itself asks only for "at least one minor release" carrying a deprecation before the major that removes it ([semver.org](https://semver.org/spec/v2.0.0.html)). That is the floor, not a window.
- Kubernetes sets numeric floors: user-facing CLI at GA stays working 12 months or 2 releases (longer wins); admin-facing 6 months or 1 release; deprecated CLI elements must warn on use ([kubernetes.io](https://kubernetes.io/docs/reference/using-api/deprecation-policy/)).
- Python PEP 387 asks for at least two years and a warning in at least two minor versions, with the warning naming the removal release and an issue link ([peps.python.org](https://peps.python.org/pep-0387/), page modified 2026-01-15).
- GitHub REST supports each API version 24 months after the next one ships and answers `410 Gone` afterwards ([docs.github.com](https://docs.github.com/en/rest/about-the-rest-api/api-versions)).
- For HTTP surfaces, RFC 9745 `Deprecation: @<unix-ts>` plus RFC 8594 `Sunset: <HTTP-date>` plus `Link` relations carry the machine-readable notice; Sunset must not precede Deprecation ([RFC 9745](https://www.rfc-editor.org/rfc/rfc9745.html), March 2025).
- Keep a Changelog says list deprecations, removals and breaking changes "if you do nothing else" ([keepachangelog.com](https://keepachangelog.com/en/1.1.0/)). Common Changelog adds: breaking first, bold prefix, upgrade guide separate from the changelog ([common-changelog.org](https://common-changelog.org/)).
- Recommended default (project decision, to confirm with owner): pre-1.0 = one release carrying a runtime warning plus at least 90 days before removal; post-1.0 = at least 2 minor releases and 12 months (user-facing) or 6 months (machine or admin surfaces), longer wins. Exceptions: security, legal, experimental.
- Required notice fields: what, why, replacement, deprecated-in version and date, removal version and date, migration link. Where: release body, upgrade guide page, the CLI itself on use, and the changelog entry.
- Licence-change notices that worked least well left the operative term undefined (HashiCorp "competitive offering", 2023-08-10) and forked within about 15 days (OpenTF fork announced 2023-08-25). Redis defined the term in an FAQ on day one and was still forked (Valkey).
- Percona vendor data, 2025-12-05: 9 of 24 pre-fork Redis contributors stopped contributing; Valkey grew 18 to 49 contributors in 18 months.
- A licence change that is later reversed (Redis AGPL, 2025-05-01; Elastic AGPL, 2024-08-29) costs the owner credibility: the reversal posts have to admit the first change hurt.
- A pricing or limit change needs the same shape as a breaking change: effective date, who is affected, what stays free, and what a headline word ("unlimited") excludes (Cursor, 2025-07-04 apology).

## Findings

### 1. Measurement: what the fleet does today

All commands run 2026-11-27 from `/home/mherwig/dev`. Scope: `ocx-sh/ocx/CHANGELOG.md` (latest 0.6.8, 2026-11-15) and `grimoire-rs/grimoire/CHANGELOG.md` (latest 0.17.0, 2026-11-24). Both are pre-1.0. Other repos (ocx-mirror, indexbot, catalog, website) were not measured.

| Measure | ocx | grimoire | Command |
|---|---|---|---|
| Releases in file | 38 | 34 | `grep -cE '^## \[[0-9]' <file>` |
| Lines marked `**BREAKING**` | 98 | 17 | `grep -c 'BREAKING' <file>` |
| Releases containing a BREAKING line | 18 | 9 | `awk '/^## \[/{r=$2} /BREAKING/{a[r]=1} END{n=0;for(k in a)n++;print n}' <file>` |
| BREAKING lines with removal wording (remov, drop, no longer, refus, renam) | 22 | 4 | `grep 'BREAKING' <file> \| grep -ciE 'remov\|drop\|no longer\|refus\|renam'` |
| `**Migration:**` lines | 0 | 16 | `grep -c '\*\*Migration' <file>` |
| Lines containing "deprecat" | 1 | 5 | `grep -ci deprecat <file>` |

1.1 The one ocx "deprecat" hit is a clippy lint allow (line 1398), not a user-facing deprecation. The five grimoire hits (lines 347, 676, 705, 758, 955) are the package-deprecation feature that grim offers publishers, not deprecations of grim's own flags or formats.

1.2 Removals with a prior deprecation entry: 0 of 26 (22 + 4 removal-worded BREAKING lines). The median number of releases between deprecation and removal is therefore undefined, not zero. Example of a direct removal: grimoire `grim publish --tag <x>` is removed in a single BREAKING entry with a Migration line (CHANGELOG line 772-773) and `GRIM_RATING_HOST` is removed with no earlier warning (line 398-399).

1.3 The cause is one template block. `grimoire-rs/grimoire/cliff.toml` lines 28-30 emit `**BREAKING**` and then `**Migration:**` from `commit.breaking_description` when it differs from the subject. `ocx-sh/ocx/cliff.toml` line 29 emits only `**BREAKING**`. A `grep -nE 'protect|Migration'` over both files finds `Migration` only in grimoire's. Neither sets `protect_breaking_commits`; ocx sets `filter_unconventional = true` (line 57), so a non-conventional commit never reaches the changelog.

1.4 grimoire has a separate upgrade guide, `docs/src/content/docs/upgrading.md` (about 1677 lines, anchored sections such as `#rule-support-dir`), and the changelog Migration line links to it (`See upgrading.md#rule-support-dir`, line 100). ocx has no equivalent upgrade guide in its tree (`find ocx-sh/ocx -iname '*upgrad*'` returns only code and tests). This matches Common Changelog's rule that a changelog is not an upgrade guide ([common-changelog.org](https://common-changelog.org/)).

1.5 The ocx release body is `git-cliff --unreleased --tag "$GIT_TAG" --strip header` piped to `gh release create --notes-file` (`ocx-sh/ocx/.github/workflows/release.yml` lines 439-449). cargo-dist is configured only in grimoire (`hosting = "github"`, no `changelog` key; `grep -nE 'changelog|github-release' dist-workspace.toml`). Per the cargo-dist reference, when `create-release` is on, dist builds the title and body from the changelog; the page does not document how version headers are matched ([cargo-dist config](https://axodotdev.github.io/cargo-dist/book/reference/config.html)).

### 2. Header standards for HTTP surfaces

2.1 RFC 9745 (Standards Track, March 2025): `Deprecation` is a Structured Field Date, e.g. `Deprecation: @1688169599`. The date may be in the future (scheduled) or the past (done). Deprecation changes no behaviour. `Link: <url>; rel="deprecation"` points to human-readable documentation. A `Sunset` timestamp "MUST NOT be earlier than" the Deprecation date. The header is "a hint" ([RFC 9745](https://www.rfc-editor.org/rfc/rfc9745.html)).

2.2 RFC 8594 (Informational, May 2019): `Sunset: Sat, 31 Dec 2018 23:59:59 GMT` is an HTTP-date, "SHOULD be a timestamp in the future", and means the URI is likely to become unresponsive then. `Link: rel="sunset"` points to retirement policy. It does not say what error follows ([RFC 8594](https://www.rfc-editor.org/rfc/rfc8594.html)).

2.3 Both RFCs say the linked page should be verified; neither fixes a window length. The window is a policy a project publishes and links.

2.4 GitHub applies both: responses carry `Deprecation` and `Sunset`, breaking changes ship only in a new dated version (`X-GitHub-Api-Version: 2026-03-10` format), the previous version lives "at least 24 more months", and requests for a retired version get `410 Gone` ([docs.github.com](https://docs.github.com/en/rest/about-the-rest-api/api-versions)).

2.5 Stripe pins versions per request or SDK, so a removal is a user-chosen upgrade, and the upgrade steps live on a page plus a changelog filterable by api usage ([docs.stripe.com/upgrades](https://docs.stripe.com/upgrades)). It states no fixed support window on that page.

### 3. Window exemplars for CLIs and toolchains

| Source | Window | Warning rule | Date of source |
|---|---|---|---|
| [Kubernetes deprecation policy](https://kubernetes.io/docs/reference/using-api/deprecation-policy/) rule 5a | User-facing CLI, GA: no less than 12 months or 2 releases, longer wins. Beta: 3 months or 1 release. Alpha: 0 | Rule 6: deprecated CLI elements "must emit warnings (optionally disable) when used" | page read 2026-11-27, no date stated |
| same, rule 5b | Admin-facing CLI, GA: 6 months or 1 release | same | same |
| same, rule 7 | Deprecated behaviours (neither API nor CLI): at least 1 year | same | same |
| same, rule 4a | Beta API: deprecated within 9 months or 3 releases of introduction, unserved 9 months or 3 releases after deprecation; alpha: any release without notice | `Warning` header from v1.19 | same |
| [PEP 387](https://peps.python.org/pep-0387/) | At least 2 years; warning in at least two minor versions; "prefer" 5 years | `DeprecationWarning`; message names the release it becomes default and links an issue for feedback | page modified 2026-01-15 |
| [SemVer 2.0.0](https://semver.org/spec/v2.0.0.html) item 7 and FAQ | At least one minor release carrying the deprecation before the major that removes it; deprecation bumps MINOR | docs update plus a minor release | spec 2.0.0 |
| [Cargo SemVer guide](https://doc.rust-lang.org/cargo/reference/semver.html) | Adding `#[deprecated]` is a minor change; removal needs a major. Pre-1.0: a bump in `y` may be treated as major | Warning from compiler; guide warns it can fail builds with `-D warnings` | read 2026-11-27 |
| [Rust RFC 1105](https://rust-lang.github.io/rfcs/1105-api-evolution.html) | Deprecation plus `pub use` stands in for rename/move; "breaking changes are assumed to be major" | none stated | RFC start 2015-05-04 |
| [Node.js deprecations](https://nodejs.org/api/deprecations.html) | Four kinds: documentation-only, application, runtime, end-of-life; no fixed duration in the part read | Runtime kinds print a process warning once; `--throw-deprecation` turns it into an error; each gets a `DEP00XX` code | read 2026-11-27 (first 100000 of 169353 characters) |

3.1 Cargo gives no CLI-compatibility policy; its own guide says an application must decide its contract ([Cargo SemVer guide](https://doc.rust-lang.org/cargo/reference/semver.html)). Only the Kubernetes and Node.js rows cover a CLI or runtime warning on use. Node.js and Cargo give no numeric window in the text read.

3.2 The pre-1.0 case is under-specified everywhere. SemVer says in 0.y.z "Anything MAY change at any time" ([semver.org](https://semver.org/spec/v2.0.0.html)). Kubernetes alpha allows 0 releases. No source sets a pre-1.0 floor; the recommendation below is therefore a project decision borrowed from the Kubernetes beta row (3 months or 1 release).

### 4. Where a notice must appear

4.1 Kubernetes names three places: release notes (exceptions "will always be announced in all relevant release notes"; feature-gate deprecations in "release notes and the corresponding CLI help"), the announce mailing list in sync with the following release, and in-product warnings (`Warning` header, CLI emit) ([kubernetes.io](https://kubernetes.io/docs/reference/using-api/deprecation-policy/)).

4.2 GitHub: advance notice, a changelog, and response headers ([docs.github.com](https://docs.github.com/en/rest/about-the-rest-api/api-versions)). PEP 387: the warning message itself carries release and feedback link ([peps.python.org](https://peps.python.org/pep-0387/)).

4.3 Keep a Changelog: a changelog entry for "every single version", `Deprecated` and `Removed` types, and "commit log diffs" are "a bad idea" ([keepachangelog.com](https://keepachangelog.com/en/1.1.0/)). Common Changelog: `**Breaking:**` prefix, breaking first in each category, deprecations under `Changed`, essential reading as a one-sentence notice, upgrade guide separate for majors ([common-changelog.org](https://common-changelog.org/)). The fleet uses the Keep a Changelog layout (`CHANGELOG.md` header, lines 3-7 of ocx), so the `Deprecated` type is available but unused.

4.4 Conventional Commits: `!` before the colon or a `BREAKING CHANGE:` footer marks a breaking commit, and either maps to MAJOR ([conventionalcommits.org](https://www.conventionalcommits.org/en/v1.0.0/)). git-cliff `protect_breaking_commits = true` keeps a breaking commit from being dropped by a parser; `filter_unconventional = true` drops non-conventional commits ([git-cliff git options](https://git-cliff.org/docs/configuration/git)). Both fleet configs set `breaking_always_bump_major = false`, so in the fleet a breaking marker does not change the version number; the notice is the only signal.

### 5. What a breaking or deprecation notice contains

Synthesis of 4.1-4.3 and PEP 387's message rule; the field list is a project recommendation, each field traced:

| Field | Traced to |
|---|---|
| What is deprecated or removed (exact flag, key, format, endpoint) | KaC "list deprecations, removals"; Common Changelog bold prefix |
| Why | PEP 387: soft deprecation docs "should explain why the API should be avoided" |
| Replacement | SemVer FAQ "transition to the new API"; Rust RFC 1105 `pub use` |
| Deprecated-in version and date | RFC 9745 `Deprecation` date |
| Removal version and date | RFC 8594 `Sunset`; PEP 387 "release the incompatibility is expected" |
| Migration link or steps | RFC 9745 `Link rel=deprecation`; Common Changelog upgrade guide |
| Feedback channel | PEP 387 "a link to an issue" |

### 6. Licence-change announcements

| Case | Date (source) | Timing and scope | FAQ and definitions | Reaction |
|---|---|---|---|---|
| HashiCorp to BSL 1.1 | 2023-08-10 ([hashicorp.com](https://www.hashicorp.com/en/blog/hashicorp-adopts-business-source-license)) | "All future releases"; no effective date and no change-date stated in the post | FAQ linked (hashi.co/license-faq); "competitive offering" used but not defined in the post | OpenTF manifesto days later; fork announced Fri 2023-08-25 ([The Register, 2023-08-28](https://www.theregister.com/2023/08/28/opentf_forks_terraform_code/)); "poison pill" quote |
| Elastic to SSPL/ELv2 | 2021-01-14 ([elastic.co](https://www.elastic.co/blog/licensing-change)) | From 7.11, all maintained branches; "no impact" on cloud or self-managed customers | FAQ linked; prose only description of SSPL | Fork under another name (AWS), per Elastic's own 2024 admission |
| Redis to RSALv2 + SSPLv1 | 2024-03-20 ([redis.io](https://redis.io/blog/redis-adopts-dual-source-available-licensing/), updated 2026-11-13) | Redis 7.4 onward; "not retroactive"; backports of security fixes to BSD releases until Community Edition 9.0 | 24-question FAQ: who is impacted, "competitive offering" defined, naming rules ("Redis Community Edition"), contributions need a CLA, plain statement "no longer open source under the OSI definition" | Valkey fork under the Linux Foundation, AWS, Google, Oracle backers ([The Register, 2025-05-01](https://www.theregister.com/2025/05/01/redis_returns_to_open_source/)) |
| Elastic adds AGPL | 2024-08-29 ([elastic.co](https://www.elastic.co/blog/elasticsearch-is-open-source-again)) | AGPL added "in the coming weeks"; existing licences kept | inline list of expected questions, no dedicated FAQ link | Self-assessment "while it was painful, it worked"; admits confusion only "mostly" resolved |
| Redis adds AGPL | 2025-05-01 ([The Register](https://www.theregister.com/2025/05/01/redis_returns_to_open_source/)) | Redis 8; about 13 months after the 2024 change | n/a | Percona co-founder: AGPL "is like halfway" |

6.1 Community cost, vendor data. Percona (a vendor with a stake in Valkey support), 2025-12-05: "37.5% of contributors (9 of 24) stopped contributing to Redis after the fork"; Valkey 18 to 49 contributors in 18 months; Valkey about 80 PRs per month in 2025 against 42 for Redis. The counts are contributors, not quality; the post favours Valkey ([percona.com](https://www.percona.com/blog/community-erosion-post-license-change-quantifying-the-power-of-open-source/)).

6.2 What the stronger announcement did. Redis's FAQ answered the questions the HashiCorp post deferred: who is impacted, what the contested term means, whether old versions stay under the old licence, whether security patches continue, what the project may still be called, and whether contributions need a CLA. It still forked, so a complete FAQ does not prevent a fork; it removes the "undefined term" objection. This is an inference from two cases, not a measured effect.

6.3 Notice shape recommended (project decision): headline states the licence from and to, the first affected version, and the date; then "who is affected", "who is not", defined terms, status of already-released versions, security-patch policy for the old line, naming and trademark effects, contribution terms, a contact address, and an FAQ link. See rule REL-DEP-12.

### 7. Pricing and limit changes as breaking changes

Cursor, 2025-07-04: the 2025-06-16 change from a 500-request limit to a $20 usage pool "were not communicated clearly"; "unlimited" applied only to Auto; refund of unexpected charges for the three weeks ([cursor.com](https://cursor.com/blog/june-2025-pricing)). Lesson for the notice: effective date, who is affected, what stays included, and what a headline word excludes, stated before the change takes effect.

## Normative guidance candidates

Severity: MUST / SHOULD / CONSIDER. Window numbers are project decisions marked (D) and need owner confirmation; see the next section.

**REL-DEP-01 (MUST)** Mark every commit that removes or renames a flag, key, file format, exit code, JSON field or default as breaking with `!` or a `BREAKING CHANGE:` footer. Rationale: the changelog marker and the notice both derive from it (Conventional Commits). Verify: `git log --format='%s%n%b' <last-tag>..HEAD | grep -nE '^(feat|fix|refactor)[^:]*!:|^BREAKING CHANGE:'` is non-empty whenever the diff removes a public CLI flag (`git diff <last-tag> -- 'crates/*/src/**/command/*.rs'`).

**REL-DEP-02 (MUST)** Every `**BREAKING**` changelog line is followed by a `**Migration:**` line. Rationale: ocx has 98 BREAKING lines and 0 Migration lines, grimoire 17 and 16. Verify: `awk '/BREAKING/{b=NR} /Migration/{if(b==NR-1)ok++} END{print ok}' CHANGELOG.md` equals `grep -c BREAKING CHANGELOG.md`; fix by copying the grimoire `breaking_description` block (cliff.toml lines 28-30) into the ocx template.

**REL-DEP-03 (MUST)** Set `protect_breaking_commits = true` in `cliff.toml`. Rationale: a commit parser that skips a type must not drop a breaking change from the notes (git-cliff docs). Verify: `grep -n protect_breaking_commits cliff.toml`.

**REL-DEP-04 (MUST)** Deprecate before removing: the removal release is preceded by at least one released version whose changelog has a `Deprecated` entry and whose CLI prints a warning on use. Rationale: SemVer FAQ, Kubernetes rule 6. Verify: for each removal-worded BREAKING line, `grep -n '<name>' CHANGELOG.md` shows an earlier `### Deprecated` entry for the same name; the measurement in finding 1 is the baseline (0 of 26). Exceptions: REL-DEP-10.

**REL-DEP-05 (MUST)** Pre-1.0 default window (D): the deprecating release plus at least 90 days and at least one further release before removal. Rationale: no source sets a pre-1.0 floor; Kubernetes beta is 3 months or 1 release; a pre-1.0 project that releases weekly needs a calendar floor, not only a release count. Verify: `git log -S'<name>' --format=%cs` gives the deprecation date and removal date; difference at least 90 days.

**REL-DEP-06 (MUST)** Post-1.0 default window (D): user-facing CLI, config or file-format surfaces keep working at least 12 months or 2 minor releases, longer wins; machine or admin surfaces (hooks, CI flags, env vars) at least 6 months or 1 minor release, longer wins. Removal only in a major release. Rationale: Kubernetes rules 5a and 5b; SemVer item 8. Verify: same date check as REL-DEP-05, and the removal version's major number exceeds the deprecation version's.

**REL-DEP-07 (MUST)** A deprecation notice has seven fields: what, why, replacement, deprecated-in version and date, removal version and date, migration link, feedback link. Rationale: finding 5. Verify: reading heuristic, pass: "`--tag` is deprecated in 0.18 (2026-12-01) because it conflicted with `--version`; use `grim publish --version <x>`; removed in 0.20 or after 2027-03-01; see upgrading.md#publish-tag; discuss in issue #N". Fail: "`--tag` is deprecated".

**REL-DEP-08 (MUST)** Print the notice at the point of use: a deprecated CLI flag, config key or env var emits a one-line warning to stderr naming the replacement and the removal version, once per invocation, with a documented way to silence it. Rationale: Kubernetes rule 6, PEP 387, Node.js runtime deprecation. Verify: an acceptance test runs the deprecated form and asserts stderr contains the replacement and the removal version and that stdout and the exit code are unchanged.

**REL-DEP-09 (SHOULD)** Publish the notice in four places: the changelog `Deprecated` entry, the release body, a per-release section in an upgrade guide with a stable anchor, and the CLI warning. The changelog line links the anchor. Rationale: 4.1-4.3; grimoire already links `upgrading.md#...`. Verify: `grep -c '#[a-z-]*)' CHANGELOG.md` of Migration lines resolves; every `upgrading.md#anchor` named in the changelog exists as a heading id in the guide.

**REL-DEP-10 (SHOULD)** Shorten or skip the window only for: a security fix, a legal requirement, or a surface labelled experimental or alpha before release. The notice then states the reason and "no window". Rationale: Kubernetes exceptions "will always be announced"; alpha has 0 releases. Verify: a BREAKING line without an earlier deprecation carries the words "security", "legal" or "experimental" in its Migration text.

**REL-DEP-11 (SHOULD)** For an HTTP or registry surface the project serves, send `Deprecation: @<unix>` and `Sunset: <HTTP-date>` with `Sunset >= Deprecation`, plus `Link` with `rel="deprecation"` and `rel="sunset"`, and answer `410 Gone` after sunset. Rationale: RFC 9745, RFC 8594, GitHub. Verify: `curl -sI <url> | grep -iE '^(deprecation|sunset|link):'` returns all three on the deprecated route; compare the two dates.

**REL-DEP-12 (MUST)** A licence or terms change notice contains: from-licence and to-licence with SPDX ids; first affected version and effective date; who is affected; who is not; every operative term defined in the same document; status of already-released versions; security-patch policy for the old line and until when; naming and trademark effects; contribution terms (CLA yes or no); a contact address; a FAQ link. Rationale: HashiCorp left "competitive offering" undefined and was forked in 15 days; Redis defined it and answered 24 questions. Verify: reading heuristic; each term in quotes in the post has a definition within one section of its first use. Pass: Redis FAQ item 7. Fail: HashiCorp post.

**REL-DEP-13 (MUST)** The agent drafts a licence-change notice but never publishes, merges or tags it. Rationale: legal, brand and community consequence (finding 6.1). Verify: the pull request touching `LICENSE`, `Cargo.toml` `license =` or `package.json` `license` is labelled for human sign-off; CI fails if those lines change without an approving review.

**REL-DEP-14 (SHOULD)** Announce a pricing, limit or quota change with: effective date, who is affected, what stays free, what any headline word excludes, and a link to the previous terms; announce before the effective date. Rationale: Cursor 2025-07-04. Verify: reading heuristic; the post contains the word "unlimited" or "free" only with its exclusion in the same sentence.

**REL-DEP-15 (SHOULD)** Use the `Deprecated` and `Removed` changelog types (Keep a Changelog) or `**Breaking:**` plus `Changed` (Common Changelog), not both; the fleet has the former layout, so add a `Deprecated` group to `commit_parsers`. Rationale: the fleet's cliff.toml has no Deprecated group (ocx lines 59-63 list Added, Fixed, Changed, Documentation). Verify: `grep -n 'Deprecated' cliff.toml`.

**REL-DEP-16 (CONSIDER)** Keep `breaking_always_bump_major = false` pre-1.0 but state in the README that in 0.y.z the minor number is the breaking number (Cargo guide: "changes in y as a major release"). Verify: `grep -n '0\.y\|pre-1.0\|breaking' README.md`.

## What an agent must not decide alone

- The numeric window (days, releases) for a project. Ask; propose REL-DEP-05 and REL-DEP-06 as defaults.
- Whether a surface is public contract (a flag, an env var, a JSON field) or internal. Ask when no document or test names it.
- Any licence, terms-of-service, pricing or limit change, its timing, its wording and who is "affected". The agent drafts; the owner decides and publishes.
- Whether to skip the window for a security or legal reason, and what to disclose about it.
- Whether to announce on an external channel (mailing list, social) a notice written for the release body.
- Whether a removal is a breaking change for downstream agents or CI; if unclear, treat as breaking and ask.

## Dated facts

| Fact | Source | Date stated | Source type |
|---|---|---|---|
| `Deprecation` header value is a Date; Sunset must not precede it | [RFC 9745](https://www.rfc-editor.org/rfc/rfc9745.html) | March 2025 | Authority (IETF Standards Track) |
| `Sunset` is an HTTP-date, should be in the future | [RFC 8594](https://www.rfc-editor.org/rfc/rfc8594.html) | May 2019 | Authority (IETF Informational) |
| User-facing GA CLI: 12 months or 2 releases; admin GA 6 months or 1 release; behaviours 1 year; CLI must warn | [Kubernetes](https://kubernetes.io/docs/reference/using-api/deprecation-policy/) | none on page; read 2026-11-27 | Project itself |
| At least 2 years, warning in two minor versions | [PEP 387](https://peps.python.org/pep-0387/) | page modified 2026-01-15; PEP created 2009-06-18 | Project itself |
| API version supported 24 months after the next; `410 Gone` | [GitHub docs](https://docs.github.com/en/rest/about-the-rest-api/api-versions) | none on page; example version 2026-03-10 | Platform itself |
| One minor release with the deprecation before the major | [SemVer 2.0.0](https://semver.org/spec/v2.0.0.html) | 2.0.0 | Authority |
| HashiCorp BSL announcement; "competitive offering" undefined in post | [HashiCorp](https://www.hashicorp.com/en/blog/hashicorp-adopts-business-source-license) | 2023-08-10 | Vendor itself |
| OpenTF fork announced Friday | [The Register](https://www.theregister.com/2023/08/28/opentf_forks_terraform_code/) | 2023-08-28 (fork 2023-08-25) | Independent press |
| Elastic to SSPL/ELv2 at 7.11 | [Elastic](https://www.elastic.co/blog/licensing-change) | 2021-01-14 | Vendor itself |
| Redis to RSALv2+SSPLv1 from 7.4; "not retroactive" | [Redis](https://redis.io/blog/redis-adopts-dual-source-available-licensing/) | 2024-03-20 (updated 2026-11-13) | Vendor itself |
| Elastic adds AGPL; "while it was painful, it worked" | [Elastic](https://www.elastic.co/blog/elasticsearch-is-open-source-again) | 2024-08-29 | Vendor itself |
| Redis 8 adds AGPL | [The Register](https://www.theregister.com/2025/05/01/redis_returns_to_open_source/) | 2025-05-01 | Independent press |
| 9 of 24 contributors stopped; Valkey 18 to 49 | [Percona](https://www.percona.com/blog/community-erosion-post-license-change-quantifying-the-power-of-open-source/) | 2025-12-05 | Vendor data (interested party) |
| Pricing change 2025-06-16; apology and refund | [Cursor](https://cursor.com/blog/june-2025-pricing) | 2025-07-04 | Vendor itself |
| Fleet: 0 of 26 removals deprecated first; 98 vs 17 BREAKING lines; 0 vs 16 Migration lines | CHANGELOG files, finding 1 | measured 2026-11-27 | Own measurement |

## AI-agent angle

| Mistake | Smallest mechanical check |
|---|---|
| Removes a flag and writes "Removed X" in one commit with no deprecation, as the fleet does today | REL-DEP-04 grep for an earlier `Deprecated` entry |
| Writes `feat:` for a change that removes behaviour, so no breaking marker | REL-DEP-01 diff-based check on removed public flags |
| Marks BREAKING but leaves Migration empty (ocx template) | REL-DEP-02 awk count |
| Invents a window ("12 months") as if it were policy | The window field must trace to a published policy file; otherwise ask |
| Writes "deprecated" without a removal version or date | REL-DEP-07 field check on the warning string |
| Sets `Sunset` before `Deprecation`, or uses an HTTP-date in `Deprecation` | REL-DEP-11 curl compare; `Deprecation` must start with `@` |
| Treats SemVer as requiring a major bump for a deprecation (it is a minor) | SemVer item 7 check in release prep |
| Drafts a licence post that names a restricted party without defining it | REL-DEP-12 defined-terms heuristic |
| Edits `license =` in a manifest as part of an unrelated change | REL-DEP-13 CI guard |
| Writes "unlimited" in a pricing post without the exclusion | REL-DEP-14 sentence check |

## Contested / evolving

- Deprecation length. Python asks 2 years and prefers 5 ([PEP 387](https://peps.python.org/pep-0387/)); Kubernetes 12 months or 2 releases for user-facing GA CLI ([kubernetes.io](https://kubernetes.io/docs/reference/using-api/deprecation-policy/)); SemVer asks one minor release ([semver.org](https://semver.org/spec/v2.0.0.html)). No source ties the number to project size or release cadence; the fleet default is a judgement.
- Whether deprecations get a changelog category. Keep a Changelog has `Deprecated` ([keepachangelog.com](https://keepachangelog.com/en/1.1.0/)); Common Changelog drops it and files deprecations under `Changed` ([common-changelog.org](https://common-changelog.org/)).
- Deprecation can break builds. Cargo calls `#[deprecated]` a minor change but warns it can fail projects that deny warnings ([Cargo guide](https://doc.rust-lang.org/cargo/reference/semver.html)); a CLI warning on stderr can do the same in CI that treats stderr output as failure.
- Did a licence change work. Elastic says "it worked" ([elastic.co, 2024-08-29](https://www.elastic.co/blog/elasticsearch-is-open-source-again)); Percona's data (vendor with a stake) shows contributor loss for Redis ([percona.com, 2025-12-05](https://www.percona.com/blog/community-erosion-post-license-change-quantifying-the-power-of-open-source/)); The Register quotes Percona's co-founder calling AGPL "halfway" ([2025-05-01](https://www.theregister.com/2025/05/01/redis_returns_to_open_source/)). Outcomes are about commercial and community goals, not notice quality, so neither side isolates the effect of the announcement.
- Trend: HTTP deprecation moved from a draft practice to a Standards Track RFC in March 2025 ([RFC 9745](https://www.rfc-editor.org/rfc/rfc9745.html)); GitHub moved to dated API versions with a 24-month window.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://www.rfc-editor.org/rfc/rfc9745.html | Deprecation header RFC (primary) | March 2025 | Syntax and Sunset ordering |
| https://www.rfc-editor.org/rfc/rfc8594.html | Sunset header RFC (primary) | May 2019 | Syntax, link relation |
| https://kubernetes.io/docs/reference/using-api/deprecation-policy/ | Kubernetes deprecation policy (primary) | read 2026-11-27 | Only numeric CLI windows and warn-on-use rule |
| https://semver.org/spec/v2.0.0.html | SemVer 2.0.0 (primary) | 2.0.0 | Deprecation FAQ, 0.y.z |
| https://docs.github.com/en/rest/about-the-rest-api/api-versions | GitHub REST versioning (primary) | read 2026-11-27 | 24-month window, 410 Gone |
| https://peps.python.org/pep-0387/ | PEP 387 backwards compatibility (primary) | modified 2026-01-15 | Two-year floor, warning content |
| https://doc.rust-lang.org/cargo/reference/semver.html | Cargo SemVer guide (primary) | read 2026-11-27 | Deprecation is minor; pre-1.0 y bump |
| https://rust-lang.github.io/rfcs/1105-api-evolution.html | Rust RFC 1105 (primary) | 2015-05-04 | Deprecate plus re-export pattern |
| https://nodejs.org/api/deprecations.html | Node.js deprecation kinds (primary) | read 2026-11-27 | Four kinds, codes, throw flag |
| https://docs.stripe.com/upgrades | Stripe upgrade guide (primary) | read 2026-11-27 | Version pinning, changelog filter |
| https://www.conventionalcommits.org/en/v1.0.0/ | Commit spec (primary) | 1.0.0 | Breaking markers |
| https://git-cliff.org/docs/configuration/git | git-cliff git options (primary) | read 2026-11-27 | `protect_breaking_commits` |
| https://axodotdev.github.io/cargo-dist/book/reference/config.html | cargo-dist config (primary) | read 2026-11-27 | Release body from changelog |
| https://keepachangelog.com/en/1.1.0/ | Keep a Changelog 1.1.0 | 1.1.0 | "If you do nothing else" |
| https://common-changelog.org/ | Common Changelog | read 2026-11-27 | Breaking prefix, upgrade guide |
| https://www.hashicorp.com/en/blog/hashicorp-adopts-business-source-license | HashiCorp BSL post (vendor, primary for the case) | 2023-08-10 | Undefined term |
| https://www.theregister.com/2023/08/28/opentf_forks_terraform_code/ | Press on the fork | 2023-08-28 | Reaction timeline |
| https://www.elastic.co/blog/licensing-change | Elastic 2021 post (vendor) | 2021-01-14 | Scope and "no impact" wording |
| https://www.elastic.co/blog/elasticsearch-is-open-source-again | Elastic 2024 post (vendor) | 2024-08-29 | Admission and reversal |
| https://redis.io/blog/redis-adopts-dual-source-available-licensing/ | Redis post with 24-question FAQ (vendor) | 2024-03-20, updated 2026-11-13 | Best FAQ shape |
| https://www.theregister.com/2025/05/01/redis_returns_to_open_source/ | Press on Redis AGPL | 2025-05-01 | Reversal and fork context |
| https://www.percona.com/blog/community-erosion-post-license-change-quantifying-the-power-of-open-source/ | Percona contributor data (vendor data) | 2025-12-05 | The only quantified cost; interested party |
| https://cursor.com/blog/june-2025-pricing | Cursor pricing apology (vendor) | 2025-07-04 | Pricing change notice failure |
| `ocx-sh/ocx/CHANGELOG.md`, `ocx-sh/ocx/cliff.toml`, `grimoire-rs/grimoire/CHANGELOG.md`, `grimoire-rs/grimoire/cliff.toml` | Fleet measurements | 2026-11-27 | Baseline for rules |

Not fetched: the last 69353 characters of the Node.js deprecations page and 12052 of the Kubernetes page were beyond the fetch window; the Kubernetes numbers above come from the rules read in full. The Node.js project policy on duration was not found in the part read.
