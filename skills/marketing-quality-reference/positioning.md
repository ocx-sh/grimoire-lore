---
title: Positioning record and drift
summary: The MKT-POS family, owning the one positioning record per product, its schema, the surfaces that must match it, the drift check and the owner gate on changing it
---

# Positioning record and drift

Owns the one file that says what the product is, who it is for and which words
name it, and the rules that keep every copy surface equal to it. The first
screen of a pitch page or README is `MKT-PAGE`. Voice, AI authorship and word
bans are `MKT-VOICE`. Claims and comparison facts are `MKT-CLAIM`. Head
metadata and crawler policy are `MKT-SEO`. The `positioning-brief` skill drafts
the record.

Set `CHECKS=.claude/skills/marketing-quality-reference/checks`
(`$CLAUDE_CONFIG_DIR/skills/marketing-quality-reference/checks` when installed
globally). Every command runs from the repository root.

Contents: [Dates and Versions](#dates-and-versions) · [The Record](#the-record) ·
[Surface Match Table](#the-surface-match-table) · [Rules](#rules) · [Check Blocks](#check-blocks) ·
[Evidence for MKT-POS-14](#evidence-for-mkt-pos-14) · [Ask the Owner](#ask-the-owner) · [Not Studied](#not-studied)

## Dates and Versions

Fetched 2026-11-27 unless dated. No client was run: loading rows are documented vendor behaviour.

| Fact | Source and date | Re-check |
|---|---|---|
| Review cadence "every 6 months and after major events" (secondary notes on a positioning method) | [Commoncog, updated 2025-01-07](https://commoncog.com/obviously-awesome/) | Yearly. The `review_by` default of 6 months is **pinned** |
| Claude Code loads a path-scoped rule when Read, Write or Edit touches a matching file, and logs it through the `InstructionsLoaded` hook | [Claude Code memory docs](https://code.claude.com/docs/en/memory), undated | 6 months, or on a release that changes rule loading |
| Of 18 coding-agent clients, 7 load path-scoped rules (Claude Code, Copilot, Cursor, Kiro, Antigravity, Qoder, Cline) and 11 have no glob-scoped rule file. 16 of 18 read a root `AGENTS.md` by default. Claude Code reads it directly only from v2.1.277 and only when no `CLAUDE.md` skips it. `AGENTS.md` is the location no single client owns ([agents.md](https://agents.md/)). Zed reads only the first match from nine file names. Gemini CLI needs `context.fileName` to name it. OpenClaw reads its own workspace | 18 vendor pages, all undated | 6 months, and when a client is added |
| A pull request author cannot approve their own pull request. A pull request uses the base branch's CODEOWNERS. Branch protection does not bind admins by default. The REST `rules/branches` endpoint is readable without a token for a public repository and carries `require_last_push_approval` | [Approving with required reviews](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/approving-a-pull-request-with-required-reviews), [About code owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners), [About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches), [REST rules](https://docs.github.com/en/rest/repos/rules), all undated | 6 months |
| The GitHub About field has no stated length limit. A 350-character figure comes only from a third-party blog ([2026-08-03](https://slategit.com/blog/github-repo-description-character-limit-what-fits)), **unverified**. Never write 350 into a rule or a check | [GitHub REST, update a repository](https://docs.github.com/en/rest/repos/repos#update-a-repository), undated | 12 months |
| Comparative advertising law: the texts in [Evidence for MKT-POS-14](#evidence-for-mkt-pos-14) | Fetched 2026-11-27, each dated there | `refresh_by` 2027-05-27 |

## The Record

One file per product repository: `.agents/positioning.toml` (**pinned**
location, at most 80 lines, **pinned**). It holds the output of positioning,
never the work. TOML, because `tomllib` is in the Python standard library. An
agent may copy audience, category, alternatives and style from existing text into
a draft marked `unreviewed`. It never invents them. Field names are a contract:
rules cite them. A key outside the MKT-POS-02 list is optional.

```toml
status = "reviewed"      # reviewed | unreviewed; only the owner writes "reviewed"
reviewed = 2026-11-27    # a draft holds the draft date here and in review_by
review_by = 2027-05-27   # default reviewed + 6 months
owner = "<name or role>"
style = "big-fish-small-pond"   # head-to-head | big-fish-small-pond | new-game
parent = ""              # optional: "owner/repo" of the family record; empty = family root
noun_reason = ""         # optional: why a component repo uses its own noun (MKT-POS-16)
sentence = "Package manager for AI-agent config, installed into each coding agent in the format it reads."
category = "package manager"
object = "AI-agent config"
forbidden = ["AI artifacts", "AI-config packages"]
forbidden_allow = []     # optional path globs exempt from the scan; the owner adds them
trend_words = { hero = "banned", list = ["agentic", "AI-native"] }   # optional
audience = "Platform engineers who pin CLI tools across CI and laptops"
non_target = ["You need a portable POSIX tool: use grep"]
maturity = "Pre-1.0: commands may change between minor releases."
[sources]                # required while unreviewed: field = "path:line" it was copied from
audience = "README.md:6"
[[alternatives]]         # first entry = what the audience does today
name = "hand-copied files per client"
kind = "behaviour"       # behaviour | tool | nothing
[[attributes]]           # optional: text, claim (an MKT-CLAIM record id, or "unproven")
[lists.kinds]
source = "src/kinds.rs"
extract = "awk '/pub enum Kind/,/^}/' src/kinds.rs"
[[do_not_say]]
pattern = "(?i)drift (detection|check)"
reason = "the status command is a report, not a gate"
instead = "the status command reports differences"
lift_when = "the status command exits non-zero on drift"
```

Design decisions an agent must not re-open:

- **No Moore seven-slot sentence is stored.** The separate fields already are the
  slots. A missing slot is a missing field. The public `sentence` names the
  category noun and the object noun, with no list and no unrecorded claim word.
- **A missing or stale record freezes the product identity, not all work.** Draft
  the record, write `ASK-OWNER` in every field you cannot source, and make every
  other edit. Never change the sentence, the category noun or the object noun
  until the owner sets `status = "reviewed"`.
- **`alternatives` is a MUST field in the record and a SHOULD on the README.**
  Comparisons move to docs pages. MKT-POS-14 adds `competitor_version` and
  `competitor_strength` to the MKT-CLAIM comparison class.

## The Surface Match Table

A **governed surface** is any row of this table, plus the README first screen.

| Surface | Must match | How `drift` reads it |
|---|---|---|
| Manifest `description` | `sentence` after whitespace, case, leading-article and trailing-period normalisation | Root `Cargo.toml`, `package.json`, `pyproject.toml` |
| README tagline line | `sentence`, same normalisation | First prose line of 5 or more words in the first 15 non-blank lines, after wrapper, badge and heading lines |
| Home `<meta name="description">`, `og:description` | `sentence`, plus at most one more sentence | `dist/index.html`, the built page, never the live site |
| GitHub About | Starts with `sentence` | `--about "$ABOUT"` |
| Home `<title>` | Contains the product name, `category` or `object` | The built page |
| Hero `<h1>` | Contains the product name, `category` or `object`. A slogan with none is allowed only when the `<title>` carries `category` | The built page, every `<h1>` |
| Docs-home lead | Contains the product name, `category` or `object` | `--docs-home FILE` |

## Rules

Verification is `positioning_check.py`: exit 0 clean, 1 a finding, 2 no record
(a stop, never a pass). `python3 -I "$CHECKS"/positioning_check.py --self-test`
runs every command over the bundled fixtures.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MKT-POS-01 | Keep exactly one positioning record per product repository, at `.agents/positioning.toml`, at most 80 lines. Remove positioning fields (tagline, target users, competitive matrix) from other brief and rule files and leave a one-line pointer. | Positioning sat in 7 separate brief files across 7 of 17 measured repositories; none was the single source. | `python3 -I "$CHECKS"/positioning_check.py fields` exits 0. Pointer arm: block MKT-POS-01 prints only pointer lines. | MUST |
| MKT-POS-02 | Fill every required field: `status`, `reviewed`, `review_by`, `owner`, `style`, `sentence`, `category`, `object`, `forbidden`, `audience`, `non_target`, `alternatives` (at least 1), `maturity`. The `lists` and `do_not_say` keys must exist, even when empty. | 0 of 7 measured briefs had a `review_by`, a category noun or a do-not-say list. | `python3 -I "$CHECKS"/positioning_check.py fields` exits 0. | MUST |
| MKT-POS-03 | Read the record before writing or editing any governed surface. When none exists, draft one from existing repository text with `status = "unreviewed"`, and set `reviewed` and `review_by` to the draft date. Cite each other required field as `sources.<field> = "path:line"`, or write `ASK-OWNER`. Report the `ASK-OWNER` fields to the owner. Never invent an audience, a category, an alternative or a differentiator. | 12 of 17 measured repositories had no audience text to copy. Without the record, an agent writes "developers and teams". | Dry run in a repository with no record: the first write is `.agents/positioning.toml` with `status = "unreviewed"`, not a copy edit. Then `python3 -I "$CHECKS"/positioning_check.py sourced` exits 0. | MUST |
| MKT-POS-04 | Never change the product sentence, the category noun or the object noun on any surface while `status` is not `reviewed` or `review_by` is earlier than today. Never set `status = "reviewed"` and never move `review_by` yourself. | The owner flip is the only human gate this design keeps. Commit authorship and signing do not enforce it against an agent that commits as the owner; a second-account review (MKT-POS-20) does. | `python3 -I "$CHECKS"/positioning_check.py drift --base origin/main` exits 0. Owner arm: block MKT-POS-04. **Limit:** an agent that commits under an owner address passes the owner arm. | MUST |
| MKT-POS-05 | Write `audience` as one segment: a role or a behaviour, plus its context. Write `non_target` as conditions a reader can check. When the owner wants a broader audience, record the reason in the file. | 1 of 17 measured headline surfaces named an audience. | `python3 -I "$CHECKS"/positioning_check.py audience` exits 0. It is a floor: it rejects "developers and teams". Segment quality is `unverified: reading heuristic`. | MUST |
| MKT-POS-06 | Make the first `alternatives` entry what the audience does today without the product: a behaviour, a tool, or doing nothing. Never write "other tools". Name a competitor on a public surface only when it is in this list. | An agent names famous competitors and skips the incumbent habit. | `python3 -I "$CHECKS"/positioning_check.py alternatives` exits 0. Competitor names on a surface appear in `alternatives[*].name`: `unverified: reading heuristic`. | MUST |
| MKT-POS-07 | Write `sentence` as one sentence that contains `category` and `object`, no enumerated list of three or more items, no word from `trend_words.list` when `hero = "banned"`, and no objective-claim word (MKT-CLAIM-02 patterns) unless an `attributes` entry carries its claim id. | One measured sentence embedded 4 of 8 kinds on 3 source surfaces. | `python3 -I "$CHECKS"/positioning_check.py sentence` exits 0, then run `python3 -I "$CHECKS"/claims_lint.py` patterns over the sentence. **Known false fail:** an appositive of two short clauses. Rewrite it. | MUST |
| MKT-POS-08 | Apply the surface match table. Manifest `description`, the README tagline line, the home meta description and `og:description` equal `sentence` after normalisation. The meta description may add one more sentence. The GitHub About starts with `sentence`. Home `<title>`, hero `<h1>` and the docs-home lead each contain the product name, `category` or `object`. When the `<h1>` is a slogan with none of them, the `<title>` carries `category`. | 61 distinct one-liners for 17 measured repositories. Google may rewrite a title that disagrees with the page's headings. | `python3 -I "$CHECKS"/positioning_check.py drift --dist dist` exits 0, with `--about "$ABOUT"` and `--docs-home "$HOME_MD"` when they exist. It reads the built `dist/index.html`, never the live site. | MUST |
| MKT-POS-09 | Never use a `forbidden` variant of the category or object noun on a governed surface or in docs prose. Add a rejected term to `forbidden` when you find it. Never add a `forbidden_allow` entry yourself: propose it to the owner. | One measured product family used four object nouns for one thing. | `python3 -I "$CHECKS"/positioning_check.py forbidden` exits 0. It scans READMEs, `CHANGELOG.md`, manifests, `docs/`, `site/`, `website/` and `dist/index.html`, and skips `forbidden_allow` matches. | MUST |
| MKT-POS-10 | Never type an enumerated list of the product's kinds, clients, platforms or modules into a surface. Render it from its `[lists.*]` source, or write "N things" with N generated, plus a link. Use the count form in About and meta. | Of 8 measured surfaces that listed kinds, 6 were wrong. | `python3 -I "$CHECKS"/positioning_check.py drift --run-extract` exits 0. It fails a surface that names 2 or more members but not all. `--run-extract` runs the owner-written shell command: run it only on a record the owner reviewed. | MUST |
| MKT-POS-11 | Run the drift check in CI on every change to a governed surface, the record or a `[lists.*]` source, after the site build. It fails on a missing field, an unreviewed or stale record with a changed identity (MKT-POS-04), a sentence or noun mismatch, a forbidden variant, a list mismatch, or a `do_not_say` hit. | The measured checks pinned card hrefs and an h1 literal. None linked the tagline to the head, the README or the manifest. | The CI job exists and lists the record among its path triggers: `unverified: reading heuristic`. A seeded fault in each of the six classes makes `positioning_check.py drift` exit 1. | MUST |
| MKT-POS-12 | For Claude Code, path-scope the rule that carries this set to every governed surface, each glob as its own `paths:` item: `README.md`, `**/README.md`, `CHANGELOG.md`, `Cargo.toml`, `package.json`, `pyproject.toml`, `.agents/positioning.toml`, plus the docs-home file and the site head and landing source. For the other clients, add this line to `AGENTS.md`: "Before editing README.md, CHANGELOG.md, a manifest description or the site head, read `.agents/positioning.toml`." | 0 of 7 measured briefs reached the agent on a README edit. 11 of 18 clients have no path-scoped rules, so the `AGENTS.md` line is their only route. | `python3 -I "$CHECKS"/positioning_check.py globs "$RULE" "$DOCS_HOME" "$SITE_HEAD"` exits 0: it fails each glob that is not its own `paths:` item. `git grep -c -F -e '.agents/positioning.toml' -- AGENTS.md` prints at least 1. Load check: the `InstructionsLoaded` hook logs the rule on a README edit. | MUST |
| MKT-POS-13 | Write each product-specific ban as a `do_not_say` entry with `pattern`, `reason`, `instead` and `lift_when`. Never remove an entry or meet its `lift_when` yourself: report that it looks met. | The one measured do-not-say list had the right shape and sat in a spec no session loaded. | `python3 -I "$CHECKS"/positioning_check.py fields` exits 0, and `python3 -I "$CHECKS"/positioning_check.py drift` exits 0: any `pattern` hit on a governed surface or docs prose fails. | MUST |
| MKT-POS-14 | Put each factual statement about a named alternative (a version, a feature present or absent, a number, availability) in an MKT-CLAIM record of class `comparison`. It carries `competitor_version` (exact; never `latest`, `current`, `stable` or empty), `subject_version`, `observed`, `refresh_by` and `competitor_strength`. Render `observed`, both versions and the `competitor_strength` text on the same built page as the statement. Never put a word from the denigration list (`bloated`, `slow`, `clunky`, `ancient`, `outdated`, `legacy`, `dead`, `broken`, `painful`, `terrible`, `worse`) in a sentence that names a competitor. When `refresh_by` passes, re-run the comparison or delete the sentence: never add an "as of" hedge. The window is the MKT-CLAIM-05 default. | Comparative advertising law asks for material, relevant, verifiable and representative features and forbids denigration. No text sets a staleness window, so 90 days is project judgement. [Evidence](#evidence-for-mkt-pos-14). | Block MKT-POS-14: a version-field grep, a rendered-string check on the built page, `positioning_check.py denigration`, and an "as of" grep. MKT-CLAIM-05's lint fails when `refresh_by` is past. | MUST |
| MKT-POS-15 | Generate the home meta description, `og:description` and any rendered tagline from `sentence` at build time. Static manifests that cannot read the record (`Cargo.toml`) stay hand-written and are guarded by MKT-POS-11. | Generation prevents drift; a check only detects it. | `git grep -n -F -e 'positioning.toml' -- "$SITE_CONFIG"` shows the read. After a change to `sentence` alone, the build plus `positioning_check.py drift` passes with no other edit. | SHOULD |
| MKT-POS-16 | In a component repository (extension, GUI, plugin, index site), set `parent` and use the parent's `category` and `object` nouns and a superset of its `forbidden` list. Use a noun of your own only after the owner records why in `noun_reason`. | One measured component called itself "application", "front end" and "shell". | Block MKT-POS-16. An empty `parent` marks a family root and skips the check. Whether a repository is a component is an owner decision. | SHOULD |
| MKT-POS-17 | Name the audience in the README's first 10 lines. Name `alternatives[0].name` in the README as a bare name or link, on the first screen or in a section titled "Alternatives", with no factual claim attached. | In 17 measured READMEs the audience appeared in 1 and an alternative in 0. | Block MKT-POS-17. A README sentence that holds `ALT` and a comparison verb needs a claim id (MKT-POS-14). | SHOULD |
| MKT-POS-18 | Keep one docs page that says when not to use the product. Put each `non_target` entry on it as a bullet, 3 to 7 bullets in total, each naming a better fit or "no tool here does this". Link it from the README in one line. | Omitting material information is a misleading-omission risk. No study shows a conversion effect. | Block MKT-POS-18. Whether each bullet can be falsified is `unverified: reading heuristic`. Pass "You need a portable POSIX tool: use grep". Fail "Not for everyone". | SHOULD |
| MKT-POS-20 | Gate changes to `.agents/positioning.toml` behind a review from a second account. In `.github/CODEOWNERS`, give the file its own line and list at least one owner other than the account that opens agent pull requests. On the default branch keep an active ruleset with a `pull_request` rule that requires 1 approval or more, code-owner review and approval of the most recent reviewable push. Keep the bypass list empty or limited to the owner's own role. | Agents commit and sign as the owner, so neither author nor signature shows who flipped `status`. GitHub refuses self-approval per account. SHOULD: a single-owner repository cannot pass it. | Block MKT-POS-20. **Limits:** the endpoint returns rulesets only, not classic branch protection. The bypass list is not checked mechanically. Not tested on a private repository. | SHOULD |
| MKT-POS-21 | Make sure the `AGENTS.md` line of MKT-POS-12 reaches the clients that can hide `AGENTS.md`. When a `CLAUDE.md` exists, give it the import line `@AGENTS.md`. Keep none of these files in the repository: `.rules`, `.cursorrules`, `.windsurfrules`, `.clinerules`, `.github/copilot-instructions.md`, `AGENT.md`. When the repository ships `.gemini/settings.json`, its `context.fileName` must include `AGENTS.md`. | Claude Code reads `AGENTS.md` only when no `CLAUDE.md` exists. Zed uses the first of nine names. Gemini CLI loads `GEMINI.md` unless `context.fileName` says otherwise. SHOULD: documented loading only. | Block MKT-POS-21: the import test, the hiding-file test and the Gemini setting test each exit 0. | SHOULD |

MKT-POS-19 is retired and its number is not reused: no primary source.

## Check Blocks

Variables the reader supplies: `RULE`, `DOCS_HOME`, `SITE_HEAD`, `SITE_CONFIG`,
`ABOUT` (`gh repo view "$SLUG" --json description -q .description`), `SLUG` (`owner/repo`), `BRANCH`, `PARENT` (the record's `parent`),
`AGENT_LOGIN` (supplied by the owner), `PAGE` (the built page).

```sh
# MKT-POS-01: every hit must be a one-line pointer to the record
git grep -n -i -E -e '^#+ .*positioning' -e '^#+ .*tagline' -e '^#+ .*target users' -e '^#+ .*competitive' -- ':(glob).claude/rules/*.md' AGENTS.md CLAUDE.md
# MKT-POS-04: each address must be in the CI variable POSITIONING_OWNERS, set outside the repository
git log --format=%ae -G '^(status|review_by)[[:space:]]*=' -- .agents/positioning.toml | sort -u
# MKT-POS-14: the version field is never empty or a moving name (any hit fails)
git grep -n -E -e '^[[:space:]]*competitor_version[[:space:]]*=[[:space:]]*"(latest|current|stable|)"' -- claims.toml
# MKT-POS-14: each count prints 1 or more; the four strings are the record's, per comparison record
grep -c -F -e "$OBSERVED" "$PAGE"; grep -c -F -e "$SUBJECT_VER" "$PAGE"
grep -c -F -e "$COMP_VER" "$PAGE"; grep -c -F -e "$STRENGTH" "$PAGE"
# MKT-POS-14: denigration scan (exit 0 is the pass), then no "as of" hedge (any hit fails)
python3 -I "$CHECKS"/positioning_check.py denigration "$PAGE"
grep -n -i -E -e 'as of (writing|now|today)' "$PAGE"
# MKT-POS-16: object equal and forbidden a superset, unless the child carries noun_reason
gh api "repos/$PARENT/contents/.agents/positioning.toml" -H 'Accept: application/vnd.github.raw' > parent-positioning.toml
python3 -I -c "import tomllib,sys;p=tomllib.load(open('parent-positioning.toml','rb'));c=tomllib.load(open('.agents/positioning.toml','rb'));sys.exit(0 if c.get('noun_reason') or (c['object']==p['object'] and set(p['forbidden'])<=set(c['forbidden'])) else 1)"
# MKT-POS-17: AUD is the audience up to its first " who ", " that " or comma; ALT is alternatives[0].name. Each prints 1 or more
head -10 README.md | grep -i -c -F -e "$AUD"; grep -i -c -F -e "$ALT" README.md
# MKT-POS-18: exactly one page; each non_target string is on it, 3 to 7 bullets, README links it
git grep -l -i -E -e '^#+.*when not' -e '^#+.*not (to )?use' -e '^#+.*limitations' -e "^#+.*shouldn.t use" -- docs
# MKT-POS-20: a CODEOWNERS owner other than the agent account is on the record's line
awk -v a="@$AGENT_LOGIN" '$1 ~ /(^|\/)\.agents\/positioning\.toml$/ {for (i = 2; i <= NF; i++) if ($i != a) f = 1} END {exit !f}' .github/CODEOWNERS
# MKT-POS-20: ruleset settings, no token for a public repository (exit 0 is the pass)
Q='any(.[]; .type=="pull_request" and .parameters.required_approving_review_count>=1 and .parameters.require_code_owner_review==true and .parameters.require_last_push_approval==true)'
curl -s "https://api.github.com/repos/$SLUG/rules/branches/$BRANCH" | jq -e "$Q"
# MKT-POS-21: each prints nothing and exits 0
[ ! -f CLAUDE.md ] || grep -q -E -e '^@AGENTS\.md' CLAUDE.md
ls .rules .cursorrules .windsurfrules .clinerules .github/copilot-instructions.md AGENT.md 2>/dev/null | awk 'END { exit NR > 0 }'
[ ! -f .gemini/settings.json ] || python3 -I -c "import json;v=json.load(open('.gemini/settings.json')).get('context',{}).get('fileName',[]);v=[v] if isinstance(v,str) else v;assert 'AGENTS.md' in v"
```

## Evidence for MKT-POS-14

Statute readings, fetched 2026-11-27, not legal advice. None sets a staleness window.

- EU Directive 2006/114/EC Art. 4(c) requires "material, relevant, verifiable and
  representative" features and Art. 4(d) forbids denigration ([OJ L 376, in force 2007-12-12](http://publications.europa.eu/resource/celex/32006L0114)). UCPD Art. 7(1) covers misleading omission ([OJ L 149, 2005](http://publications.europa.eu/resource/celex/32005L0029)).
- Germany: UWG s.6(2)(2) and (5), and s.5a for omission ([English translation reflecting the Act of 2026-02-12](https://www.gesetze-im-internet.de/englisch_uwg/englisch_uwg.html)).
- UK: reg. 4(d) and 4(f) of SI 2008/1276 ([legislation.gov.uk](https://www.legislation.gov.uk/uksi/2008/1276/regulation/4); reg. 4(b) substituted 2025-04-06; no outstanding effects as of 2026-11-27).
- US: Lanham Act 43(a)(1)(B) bars misrepresenting "another person's goods" in "commercial advertising or promotion" ([15 USC 1125](https://www.law.cornell.edu/uscode/text/15/1125), last amendment noted 2012-10-05). 16 CFR 14.15 requires "bases of comparison" be "clearly identified" ([eCFR, statement of 1979-08-13](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-A/part-14/section-14.15)). The FTC needs a reasonable basis before dissemination ([1984 statement](https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation)).
- The fairness policy behind `competitor_strength`: [PostHog handbook](https://posthog.com/handbook/marketing), undated.

One rule covers all four regimes: add no per-country variant. **Gaps:** only the
English UWG translation was read, and no case law. Not read: UK DMCC Act 2024
ss.225-227, other Member States, and whether a README is "commercial advertising
or promotion" under the Lanham Act. The Directive URL needs the headers
`Accept: application/xhtml+xml` and `Accept-Language: eng`, or it answers HTTP 400.

## Ask the Owner

- The audience, `non_target`, `category`, `object`, `style`, any override that broadens the audience, renaming a noun across a family, and whether a repository is a component (`parent`).
- Flipping `status`, setting `review_by`, lifting a `do_not_say` item, adding a `forbidden_allow` entry, and the addresses in `POSITIONING_OWNERS`.
- For MKT-POS-20: the second approver account, `AGENT_LOGIN`, and confirmation that agents hold no admin token or bypass role. Propose any change to CODEOWNERS or the ruleset; never apply it.
- Whether a Gemini CLI config adds `AGENTS.md` to `context.fileName`, which competitors to name, whether trend words may lead the hero, and the wording of any when-not-to-use reason that affects adoption.
- Writing the GitHub About field on a live repository. It publishes immediately: report the proposed text as an owner action.

## Not Studied

- Whether the About field can be generated in CI (`drift` only checks it), and whether verbatim reuse across surfaces changes search snippets or answer-engine citations.
- Whether a second approver account exists for each repository. Until the owner confirms it, MKT-POS-20 stays SHOULD and MKT-POS-04 is a MUST that nothing mechanical enforces.
- Case law, trademark law (a competitor logo ban was dropped for want of a fetched text), and the laws of other Member States.
